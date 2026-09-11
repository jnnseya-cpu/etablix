/**
 * Webhooks, both directions.
 *
 * Both platforms were polled. Polling is fine for a dashboard and wrong for
 * anything with a deadline in it: a statutory payment notice, a time bar, a
 * safety-critical non-conformance. A sweep on an hourly timer finds out about
 * an alarm up to an hour late, and the interval is invisible to whoever is
 * relying on the alert.
 *
 * OUTBOUND: the events this system produces, pushed to subscribers.
 * INBOUND:  events from a platform, accepted only against a signature.
 *
 * THE SIGNATURE IS THE WHOLE DESIGN.
 *
 * An inbound webhook endpoint is a hole in the side of an application: it is
 * unauthenticated by construction, because the sender has no session. Every
 * delivery is therefore signed with a shared secret over the raw body and a
 * timestamp, and an unsigned or stale delivery is rejected before anything
 * reads the payload. Comparison is constant-time, because a fast rejection
 * leaks the prefix of the expected signature one byte at a time.
 *
 * A REPLAY IS NOT A DUPLICATE. A signature proves who sent it and not when;
 * without the timestamp inside the signed material, a delivery captured once
 * can be replayed forever. Five minutes is the window, and a delivery outside
 * it is refused even though its signature is perfectly valid.
 */

import crypto from "node:crypto";
import { collection, insert, update, id as newId, recordLedger, getSettings, saveSettings } from "./store.js";
import { num } from "./l7/num.js";

const COLLECTION = "webhooks";
const DELIVERIES = "webhookDeliveries";
const SECRET_KEY = "webhook_inbound_secret";

/** The events a subscriber may ask for. Anything else is refused. */
export const EVENTS = [
  "construx.activity.created",
  "construx.activity.updated",
  "construx.inspection.created",
  "construx.inspection.updated",
  "construx.ncr.created",
  "construx.ncr.updated",
  "construx.rfi.created",
  "construx.rfi.updated",
  "construx.reading.recorded",
  "veryx.risk.created",
  "veryx.risk.updated",
  "veryx.run.finished",
  "etablix.document.issued",
  "etablix.timebar.approaching",
  "etablix.timebar.passed",
];

/** How long a signed delivery stays acceptable. */
export const REPLAY_WINDOW_MS = 5 * 60 * 1000;

/** The signature over a delivery: the timestamp and the raw body together. */
export function sign(secret, timestamp, rawBody) {
  return crypto
    .createHmac("sha256", String(secret))
    .update(`${timestamp}.${String(rawBody)}`)
    .digest("hex");
}

/**
 * Verify an inbound delivery. Returns why it failed, never just false — a
 * webhook that rejects silently is a webhook nobody can debug, and the sender
 * is usually somebody else's system.
 */
export function verify({ secret, timestamp, signature, rawBody, now = Date.now() } = {}) {
  if (!secret) return { ok: false, reason: "no inbound secret is configured, so nothing can be verified and nothing is accepted" };
  const ts = num(timestamp);
  if (ts === null) return { ok: false, reason: "no timestamp" };
  if (!signature) return { ok: false, reason: "no signature" };
  // The window first: a stale delivery is refused before any comparison, so
  // a replayed capture cannot even exercise the comparison path.
  const age = Math.abs(now - ts);
  if (age > REPLAY_WINDOW_MS) {
    return { ok: false, reason: `the delivery is ${Math.round(age / 1000)}s old, outside the ${REPLAY_WINDOW_MS / 1000}s window. A valid signature does not make a replay acceptable.` };
  }
  const expected = sign(secret, ts, rawBody);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  // Length is checked separately because timingSafeEqual throws on a mismatch,
  // and the throw itself would be the timing leak.
  if (a.length !== b.length) return { ok: false, reason: "signature does not match" };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: "signature does not match" };
  return { ok: true, reason: null };
}

/** The inbound secret, generated once on first use rather than defaulted. */
export function inboundSecret({ create = true } = {}) {
  const held = getSettings()[SECRET_KEY];
  if (held) return held;
  if (!create) return null;
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
  saveSettings({ [SECRET_KEY]: secret });
  return secret;
}

/** Rotate it. The old one stops working immediately, which is the point. */
export function rotateInboundSecret(by = null) {
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
  saveSettings({ [SECRET_KEY]: secret });
  recordLedger("webhook.secret.rotated", "inbound", by || "unattributed", "the previous secret stopped working immediately");
  return secret;
}

/** Register a subscriber. */
export function subscribe({ url, events = [], by = null, description = null } = {}) {
  const faults = [];
  const target = String(url || "").trim();
  if (!target) faults.push("no url");
  else if (!/^https:\/\//i.test(target)) {
    // Not pedantry. An outbound webhook carries project data to a third
    // party, and over http it carries it in the clear to anybody on the path.
    faults.push("the url must be https — an outbound webhook carries project data and over http it carries it in the clear");
  }
  const wanted = (Array.isArray(events) ? events : []).map(String);
  if (wanted.length === 0) faults.push("no events — a subscription to nothing is a row nobody will ever remove");
  const unknown = wanted.filter((e) => !EVENTS.includes(e));
  if (unknown.length) faults.push(`unknown event(s): ${unknown.join(", ")}`);
  if (!by) faults.push("nobody is named as subscribing");
  if (faults.length) return { ok: false, faults, subscription: null };

  const secret = `whsig_${crypto.randomBytes(24).toString("hex")}`;
  const row = insert(COLLECTION, {
    id: newId(),
    url: target,
    events: wanted,
    description: description ? String(description) : null,
    // The subscriber's own signing secret, returned ONCE at creation and
    // never again. A secret a system can re-read is a secret in a log.
    secret,
    active: true,
    createdAt: Date.now(),
    createdBy: String(by),
    failures: 0,
    lastDeliveryAt: null,
    lastStatus: null,
  });
  recordLedger("webhook.subscribed", row.id, String(by), `${target} for ${wanted.join(", ")}`);
  return { ok: true, faults: [], subscription: { ...row }, secret };
}

/** Stop sending to one. Kept rather than deleted, so the history reads. */
export function unsubscribe(id, by = null) {
  const row = collection(COLLECTION).find((r) => r.id === String(id));
  if (!row) return { ok: false, faults: ["no such subscription"] };
  update(COLLECTION, row.id, { active: false, deactivatedAt: Date.now(), deactivatedBy: by || null });
  recordLedger("webhook.unsubscribed", row.id, by || "unattributed", row.url);
  return { ok: true, faults: [] };
}

/** Every subscription, without the secrets. */
export function subscriptions() {
  return collection(COLLECTION).map((r) => ({
    id: r.id, url: r.url, events: r.events, description: r.description,
    active: r.active !== false, createdAt: r.createdAt, createdBy: r.createdBy,
    failures: r.failures || 0, lastDeliveryAt: r.lastDeliveryAt || null, lastStatus: r.lastStatus || null,
    // Never the secret. It was shown once at creation.
    secretShown: false,
  }));
}

/** How many consecutive failures before a subscription is paused. */
export const FAILURE_LIMIT = 10;

/**
 * Push one event to everybody who asked for it.
 *
 * FIRE AND FORGET, DELIBERATELY. A webhook is a courtesy to somebody else's
 * system and it must never be able to fail the operation that produced it: a
 * non-conformance is recorded whether or not a subscriber's endpoint is up.
 * So every delivery is attempted, every outcome is recorded, and nothing
 * throws back into the caller.
 *
 * A subscription that fails ten times running is paused rather than retried
 * forever. An endpoint that has been down for a week is not coming back
 * inside this request, and a queue that grows without limit is the failure
 * mode of every webhook system that does not do this.
 */
export async function emitWebhook(event, payload, { fetchImpl = null, now = Date.now() } = {}) {
  if (!EVENTS.includes(String(event))) {
    return { ok: false, reason: `"${event}" is not a webhook event this system emits`, delivered: 0 };
  }
  const targets = collection(COLLECTION).filter((r) => r.active !== false && (r.events || []).includes(String(event)));
  if (targets.length === 0) return { ok: true, delivered: 0, reason: "nobody is subscribed to that event" };

  const send = fetchImpl || globalThis.fetch;
  const results = [];
  for (const sub of targets) {
    const body = JSON.stringify({ event: String(event), at: now, data: payload });
    const signature = sign(sub.secret, now, body);
    let status = null, error = null;
    try {
      const res = await send(sub.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-etablix-event": String(event),
          "x-etablix-timestamp": String(now),
          "x-etablix-signature": signature,
        },
        body,
      });
      status = res.status;
    } catch (err) {
      error = String(err.message).slice(0, 200);
    }
    const ok = status !== null && status >= 200 && status < 300;
    const failures = ok ? 0 : (sub.failures || 0) + 1;
    update(COLLECTION, sub.id, {
      failures,
      lastDeliveryAt: now,
      lastStatus: ok ? status : (error || status),
      ...(failures >= FAILURE_LIMIT ? { active: false, pausedReason: `${failures} consecutive failures` } : {}),
    });
    insert(DELIVERIES, {
      id: newId(), subscriptionId: sub.id, event: String(event), at: now,
      status, error, ok, url: sub.url,
    });
    if (failures >= FAILURE_LIMIT) {
      recordLedger("webhook.paused", sub.id, "system", `${failures} consecutive failures against ${sub.url}`);
    }
    results.push({ subscriptionId: sub.id, ok, status, error });
  }
  return {
    ok: results.every((r) => r.ok),
    delivered: results.filter((r) => r.ok).length,
    attempted: results.length,
    results,
  };
}

/** The delivery log, newest first. */
export function deliveries({ limit = 100 } = {}) {
  return collection(DELIVERIES)
    .slice()
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, Math.max(1, Math.min(1000, Number(limit) || 100)))
    .map((r) => ({ ...r }));
}

/**
 * What an inbound delivery is allowed to do.
 *
 * VERY LITTLE, AND THAT IS THE POINT. An inbound webhook is an unauthenticated
 * hole; a valid signature proves the sender holds the secret and nothing more.
 * So a verified delivery is RECORDED and, at most, raises a notification. It
 * does not write a delivery record, close a non-conformance, certify a payment
 * or run an agent, because a leaked secret would then be able to do all four.
 */
export const INBOUND_ALLOWED = [
  { event: "platform.risk.raised", does: "records the event and raises an internal notification", writes: false },
  { event: "platform.reading.alarm", does: "records the event and raises an internal notification", writes: false },
  { event: "platform.ping", does: "records the event, so a sender can confirm the secret works", writes: false },
];

const INBOUND_BY_EVENT = new Map(INBOUND_ALLOWED.map((r) => [r.event, r]));

/** Accept a verified inbound delivery. */
export function acceptInbound({ event, payload, at = null } = {}) {
  const spec = INBOUND_BY_EVENT.get(String(event));
  if (!spec) {
    return {
      ok: false,
      reason: `"${event}" is not an inbound event this system accepts. A valid signature proves who sent it and not what it may do: inbound deliveries are recorded and may raise a notification, and none of them writes a delivery record, closes a defect, certifies a payment or runs an agent.`,
      allowed: INBOUND_ALLOWED.map((r) => r.event),
    };
  }
  const row = insert(DELIVERIES, {
    id: newId(), direction: "inbound", event: String(event), at: at || Date.now(),
    ok: true, status: 200, payload: payload === undefined ? null : payload,
  });
  recordLedger("webhook.inbound", String(event), "platform", spec.does);
  return { ok: true, accepted: { id: row.id, event: String(event), does: spec.does } };
}
