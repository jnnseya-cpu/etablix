/**
 * Webhook administration and the one inbound endpoint.
 *
 * Two surfaces with opposite security postures in one file, which is
 * deliberate — they have to be read together.
 *
 *   /api/webhooks/*         employee session, admin only. Subscriptions carry
 *                           project data to third parties, so who may create
 *                           one is the same question as who may export.
 *   /api/webhooks/inbound   NO SESSION AT ALL. The sender is somebody else's
 *                           system; it holds a shared secret and nothing more.
 *                           Every delivery is verified against a signature
 *                           over the raw bytes and a timestamp before the
 *                           payload is read, and a verified delivery is
 *                           recorded rather than acted on.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  EVENTS, INBOUND_ALLOWED, REPLAY_WINDOW_MS, FAILURE_LIMIT,
  subscribe, unsubscribe, subscriptions, deliveries,
  inboundSecret, rotateInboundSecret, verify, acceptInbound, emitWebhook,
} from "../lib/webhooks.js";

const router = Router();

/* ----------------------------------------------------------- inbound */
//
// Mounted FIRST, before requireAuth, because it must work without a session.
// server.js parses this path with express.raw so the body arrives as the
// bytes that were signed: a signature recomputed over a re-serialised object
// is a signature over different bytes, and JSON.stringify is not required to
// reproduce key order or spacing.

router.post("/inbound", (req, res) => {
  const timestamp = req.get("x-etablix-timestamp") || req.get("x-webhook-timestamp");
  const signature = req.get("x-etablix-signature") || req.get("x-webhook-signature");
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";

  if (!Buffer.isBuffer(req.body)) {
    // A parsed body here means the raw parser is not mounted, and verifying
    // a re-serialised body would pass while proving nothing. Refuse instead.
    return res.status(500).json({
      error: "The inbound endpoint did not receive the raw request body, so no signature can be verified. Nothing was accepted.",
    });
  }

  const check = verify({ secret: inboundSecret({ create: false }), timestamp, signature, rawBody });
  if (!check.ok) {
    // 401, and the reason. The sender is a machine somebody has to debug.
    return res.status(401).json({ error: `Rejected: ${check.reason}.` });
  }

  let parsed = null;
  try {
    parsed = JSON.parse(rawBody || "{}");
  } catch {
    return res.status(400).json({ error: "Signature verified, but the body is not JSON." });
  }

  const result = acceptInbound({ event: parsed.event, payload: parsed.data ?? null, at: Number(timestamp) });
  if (!result.ok) return res.status(403).json({ error: result.reason, allowed: result.allowed });
  res.status(202).json({ accepted: result.accepted });
});

/** GET /inbound/spec — what a sender has to do, without a session. */
router.get("/inbound/spec", (req, res) => {
  res.json({
    endpoint: "/api/webhooks/inbound",
    method: "POST",
    headers: {
      "x-etablix-timestamp": "unix milliseconds, included in the signed material",
      "x-etablix-signature": "hex HMAC-SHA256 of `${timestamp}.${rawBody}` under the shared secret",
    },
    replayWindowSeconds: REPLAY_WINDOW_MS / 1000,
    accepts: INBOUND_ALLOWED,
    note: "A verified delivery is recorded and may raise an internal notification. None of them writes a delivery record, closes a defect, certifies a payment or runs an agent.",
  });
});

/* ------------------------------------------------------- administration */

router.use(requireAuth);
const admin = requireRole("admin");

/** GET / — the catalogue and the current subscriptions. */
router.get("/", admin, (req, res) => {
  res.json({
    events: EVENTS,
    inbound: INBOUND_ALLOWED,
    failureLimit: FAILURE_LIMIT,
    replayWindowSeconds: REPLAY_WINDOW_MS / 1000,
    inboundSecretConfigured: Boolean(inboundSecret({ create: false })),
    subscriptions: subscriptions(),
  });
});

/** POST /subscriptions — register a subscriber. The secret is shown once. */
router.post("/subscriptions", admin, (req, res) => {
  const result = subscribe({
    url: req.body?.url,
    events: req.body?.events,
    description: req.body?.description,
    by: req.user.name,
  });
  if (!result.ok) return res.status(400).json({ error: result.faults[0], faults: result.faults });
  res.status(201).json({
    subscription: { ...result.subscription, secret: undefined },
    secret: result.secret,
    secretWarning: "This signing secret is shown once and is never readable again. Store it now.",
  });
});

/** DELETE /subscriptions/:id — stop sending. The row stays. */
router.delete("/subscriptions/:id", admin, (req, res) => {
  const result = unsubscribe(req.params.id, req.user.name);
  if (!result.ok) return res.status(404).json({ error: result.faults[0] });
  res.json({ deactivated: true });
});

/** GET /deliveries — the delivery log, newest first, both directions. */
router.get("/deliveries", admin, (req, res) => {
  res.json({ deliveries: deliveries({ limit: req.query.limit }) });
});

/** POST /inbound/secret — mint or rotate the inbound secret. */
router.post("/inbound/secret", admin, (req, res) => {
  const existing = inboundSecret({ create: false });
  const secret = existing ? rotateInboundSecret(req.user.name) : inboundSecret();
  res.status(201).json({
    secret,
    rotated: Boolean(existing),
    secretWarning: existing
      ? "The previous secret stopped working immediately. Any sender still using it will now be rejected."
      : "Shown once. Give it to the sender and store it nowhere else.",
  });
});

/**
 * POST /test — send one real delivery to the subscribers of one event.
 *
 * A test that fabricates a success proves nothing, so this makes the actual
 * outbound call and reports the status codes that came back. The payload is
 * marked as a test so a subscriber can tell, rather than recording a
 * non-conformance that does not exist.
 */
router.post("/test", admin, async (req, res) => {
  const event = String(req.body?.event || "");
  if (!EVENTS.includes(event)) {
    return res.status(400).json({ error: `Unknown event. One of: ${EVENTS.join(", ")}` });
  }
  const result = await emitWebhook(event, { test: true, sentBy: req.user.name });
  res.json({ result });
});

export default router;
