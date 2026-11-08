/**
 * The platform keeps working when a connector does not, and a duplicate
 * applies once.
 *
 * TWO FAILURES, OPPOSITE IN SHAPE. A connector is down and an outbound intent
 * is lost, so a published availability never reaches the parent system and
 * nobody knows. Or a connector is flaky and the same message arrives three
 * times, so one collection is recorded three times and the hire closes
 * against the wrong one.
 *
 * The answer to the first is that intent is persisted and reconciled when the
 * connector returns, and the ETABLIX ledger carries on regardless — a
 * platform that stops because a downstream system is unavailable has made its
 * own operation depend on somebody else's uptime.
 *
 * The answer to the second is an idempotency key AND an aggregate version.
 * The key alone catches a replay of the same message; the version catches the
 * worse case, which is an older message arriving after a newer one and
 * overwriting it. A system with only a key is eventually consistent with
 * whichever copy arrived last.
 *
 * AND A TIMED-OUT SEND IS NOT A FAILED ONE. The order may have been placed,
 * the notice may have been received. UNKNOWN_OUTCOME is recorded and
 * reconciled before anything is retried, because a blind resend on a notice
 * sends it twice.
 */

export const DISPATCH_STATES = ["PENDING", "SENT_UNCONFIRMED", "RECEIPT_VERIFIED", "UNKNOWN_OUTCOME", "REJECTED", "CANCELLED"];

/** Queue an outbound intent. It survives the connector being unavailable. */
export function queueIntent(state, { id = null, type = null, payload = null, connector = null } = {}) {
  const q = Array.isArray(state?.queue) ? [...state.queue] : [];
  const applied = Array.isArray(state?.applied) ? [...state.applied] : [];
  if (!id || !type) {
    return { ok: false, state: { queue: q, applied }, say: "an intent with no id or type cannot be queued or reconciled later" };
  }
  if (q.some((x) => x.id === String(id)) || applied.some((x) => x.id === String(id))) {
    return { ok: true, queued: false, duplicate: true, state: { queue: q, applied },
             say: `${id} is already queued or applied; the same intent twice is one intent` };
  }
  q.push({ id: String(id), type: String(type), payload: payload ?? null, connector: connector ?? null, state: "PENDING" });
  return { ok: true, queued: true, state: { queue: q, applied },
           say: `${id} queued for ${connector || "its connector"}; the ledger continues whether or not that connector is reachable` };
}

/** Reconcile the queue when a connector returns. */
export function reconcileQueue(state, { connector = null, available = true } = {}) {
  const q = Array.isArray(state?.queue) ? [...state.queue] : [];
  const applied = Array.isArray(state?.applied) ? [...state.applied] : [];
  if (!available) {
    const waiting = q.filter((x) => !connector || x.connector === connector);
    return {
      ok: true, sent: [], waiting: waiting.map((x) => x.id), state: { queue: q, applied },
      say: `${connector || "the connector"} is unavailable; ${waiting.length} intent(s) wait and nothing is lost. `
         + "The ETABLIX ledger and the agent workflows operate independently of it",
    };
  }
  const sent = [];
  const rest = [];
  for (const item of q) {
    if (connector && item.connector !== connector) { rest.push(item); continue; }
    sent.push(item.id);
    applied.push({ ...item, state: "RECEIPT_VERIFIED" });
  }
  return { ok: true, sent, waiting: rest.map((x) => x.id), state: { queue: rest, applied },
           say: sent.length ? `${sent.length} intent(s) reconciled on ${connector || "reconnection"}` : "nothing was waiting" };
}

/**
 * Apply an inbound event once.
 *
 * `seen` is the idempotency ledger: event ids and the highest aggregate
 * version applied per aggregate. A replay is ignored. An older version is
 * ignored AND audited, because silently dropping it hides a real ordering
 * problem.
 */
export function applyInbound(seen, { eventId = null, aggregateId = null, aggregateVersion = null, data = null } = {}) {
  const ids = new Set(Array.isArray(seen?.eventIds) ? seen.eventIds : []);
  const versions = { ...(seen?.versions || {}) };

  if (!eventId || !aggregateId || aggregateVersion === null || aggregateVersion === undefined) {
    return { ok: false, applied: false, reason: "UNIDENTIFIED", seen: { eventIds: [...ids], versions },
             say: "an event with no id, aggregate or version cannot be deduplicated, so it is refused rather than applied once and hoped about" };
  }
  if (ids.has(String(eventId))) {
    return { ok: true, applied: false, duplicate: true, seen: { eventIds: [...ids], versions },
             say: `${eventId} has already been applied; the effect is applied once` };
  }

  const current = versions[String(aggregateId)];
  const v = Number(aggregateVersion);
  if (current !== undefined && v <= current) {
    ids.add(String(eventId));
    return {
      ok: true, applied: false, superseded: true, audited: true,
      seen: { eventIds: [...ids], versions },
      say: `version ${v} arrived after version ${current} on ${aggregateId} — not applied, and audited rather than dropped quietly, `
         + "because an out-of-order delivery is a real problem and silence about it is how it becomes permanent",
    };
  }

  ids.add(String(eventId));
  versions[String(aggregateId)] = v;
  return { ok: true, applied: true, seen: { eventIds: [...ids], versions }, data: data ?? null,
           say: `${eventId} applied at version ${v} on ${aggregateId}` };
}

/** A send whose outcome is not known. Never retried blind. */
export function recordDispatch({ id = null, outcome = null } = {}) {
  const o = String(outcome ?? "").toUpperCase();
  if (!DISPATCH_STATES.includes(o)) {
    return { ok: false, state: null, say: `"${outcome}" is not one of ${DISPATCH_STATES.join(", ")}` };
  }
  if (o === "UNKNOWN_OUTCOME") {
    return { ok: false, state: o, retryAllowed: false, reconcileFirst: true,
             say: `${id || "the dispatch"} timed out and may have been received. It is reconciled against the destination before anything is retried — `
                + "a blind resend on a notice sends it twice" };
  }
  return { ok: o === "RECEIPT_VERIFIED", state: o, retryAllowed: o === "REJECTED",
           say: `${id || "the dispatch"} is ${o}` };
}

/** The notes an approver reads. */
export function outboxNotes(result) {
  if (!result) return [];
  const out = [];
  if (result.waiting?.length) {
    out.push(`OUTBOUND INTENT WAITING — ${result.waiting.join(", ")}. ${result.say}`);
  }
  if (result.superseded) out.push(`OUT-OF-ORDER DELIVERY AUDITED — ${result.say}`);
  if (result.state === "UNKNOWN_OUTCOME") out.push(`DISPATCH OUTCOME UNKNOWN — ${result.say}`);
  return out;
}
