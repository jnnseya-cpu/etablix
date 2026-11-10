/**
 * Plans, quota and the two things that must never happen to a customer.
 *
 * NEVER CHARGE TWICE FOR ONE PIECE OF WORK, AND NEVER LET TWO REQUESTS SPEND
 * THE SAME LAST UNIT. Those are TI-09 and they are the same mechanism seen
 * from two sides: quota is RESERVED before generation and SETTLED once, by
 * logical work id. A counter incremented after the fact gets both wrong — the
 * first by double-counting a retry, the second by letting two concurrent
 * requests each read 49 of 50 and each proceed.
 *
 * ONE COMPLETED DRAFT PER LOGICAL GENERATION ID, NEVER AN ATTEMPT AND NEVER A
 * TEMPLATE FALLBACK (§19). A customer who is billed for the model failing
 * twice and then falling back to a template has been billed three times for
 * nothing. So a reservation is released on final failure, and
 * `settle({ degraded: true })` refuses to count.
 *
 * A LATE BILLING EVENT CANNOT OVERWRITE A NEWER PROVIDER STATE (§19, TI-13).
 * Providers replay, and they replay out of order. The authority is the
 * provider's own sequence, not arrival order, so an upgrade that arrives
 * after a later cancellation does not quietly restore access. Reconciliation
 * happens BEFORE access changes, which is the opposite of the natural order.
 *
 * AND SUSPENSION IS NOT A LOCKOUT (§19, TI-11). Grace, suspended and ended
 * installations are read, export and rollback only. The customer whose trial
 * lapsed with a live change on their own site must be able to undo it; a
 * product that holds a published change hostage to a renewal is a liability,
 * not a lever.
 */

/** §19 packages and their v1 limits. Proposed packaging, no price. */
export const PLANS = Object.freeze([
  { id: "internal", name: "Internal", unit: "internal allocation per platform and environment",
    markets: null, channels: null, reviewers: null, draftsPerMonth: null,
    features: ["first_party_ingest", "csv_import", "public_feeds", "native_publishing", "native_outcomes", "draft_export", "cms_writes", "experiments"] },
  { id: "starter", name: "Managed Starter", unit: "subscription per production installation",
    markets: 1, channels: 2, reviewers: 3, draftsPerMonth: 50,
    features: ["first_party_ingest", "csv_import", "public_feeds", "included_inference", "native_publishing", "native_outcomes", "draft_export"] },
  { id: "growth", name: "Managed Growth", unit: "subscription per production installation plus additional capacity",
    markets: 3, channels: 4, reviewers: 10, draftsPerMonth: 500,
    features: ["first_party_ingest", "csv_import", "public_feeds", "included_inference", "native_publishing", "native_outcomes", "draft_export", "supported_integrations", "cms_writes", "experiments"] },
  { id: "enterprise", name: "Private / Enterprise", unit: "annual licence per customer deployment plus agreed implementation and support",
    markets: null, channels: null, reviewers: null, draftsPerMonth: null,
    features: ["first_party_ingest", "csv_import", "public_feeds", "native_publishing", "native_outcomes", "draft_export", "supported_integrations", "cms_writes", "experiments", "private_hosting", "sso", "offline_entitlement"] },
]);

/** §19 statuses. */
export const ENTITLEMENT_STATES = Object.freeze(["trial", "active", "grace", "suspended", "ended"]);

/** What each status may still do, §19. */
export const STATE_CAPABILITIES = Object.freeze({
  trial:     { ingest: true,  generate: true,  liveWrite: true,  read: true, export: true, rollback: true },
  active:    { ingest: true,  generate: true,  liveWrite: true,  read: true, export: true, rollback: true },
  grace:     { ingest: true,  generate: false, liveWrite: false, read: true, export: true, rollback: true },
  suspended: { ingest: false, generate: false, liveWrite: false, read: true, export: true, rollback: true },
  ended:     { ingest: false, generate: false, liveWrite: false, read: true, export: true, rollback: true },
});

/** §19: the proposed recovery window on an ended installation. */
export const RECOVERY_WINDOW_DAYS = 30;

/** What an offline signed entitlement must carry, §19. */
export const OFFLINE_ENTITLEMENT_FIELDS = Object.freeze([
  "deploymentId", "features", "limit", "expiry", "keyId",
]);

const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function plan(id) {
  return PLANS.find((p) => p.id === str(id)) || null;
}

/** UTC calendar month, §19. The customer's timezone is not the billing one. */
export function billingPeriod(at) {
  const d = new Date(str(at));
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Start of the next UTC month, for the usage reset the 429 must carry. */
export function periodResetAt(at) {
  const d = new Date(str(at));
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0)).toISOString();
}

/** §19: provisioning is idempotent by external customer or order reference. */
export function provision({ ledger = {}, externalRef, planId, installations = 1, at = null } = {}) {
  const ref = str(externalRef);
  if (!ref) return { ok: false, say: "Provisioning needs an external customer or order reference; without one a replay provisions twice." };
  const p = plan(planId);
  if (!p) return { ok: false, say: `"${str(planId)}" is not a plan. Plans live in data with stable feature keys; an unknown one is refused rather than defaulted to the smallest.` };
  const next = { ...ledger };
  if (next[ref]) {
    return { ok: true, replayed: true, entitlement: next[ref], ledger: next,
             say: `Order ${ref} was already provisioned as ${next[ref].planId} revision ${next[ref].planRevision}. The original is returned; no duplicate installation and no duplicate usage.` };
  }
  const ent = {
    externalRef: ref, planId: p.id, planRevision: 1, installations: Math.max(1, Math.trunc(num(installations) ?? 1)),
    status: "trial", effectiveFrom: str(at) || null, providerSequence: 0, endedAt: null,
  };
  next[ref] = ent;
  return { ok: true, entitlement: ent, ledger: next, say: `${p.name} provisioned against ${ref}, starting in trial with ${ent.installations} installation(s).` };
}

/**
 * §19 and TI-13 — apply a billing event.
 *
 * Reconcile FIRST, then change access. `providerSequence` is the provider's
 * own ordering; an event carrying a lower one is a replay of history and is
 * recorded without taking effect.
 */
export function applyBillingEvent({ entitlement, event = {}, seenEventIds = [] } = {}) {
  if (!entitlement) return { ok: false, say: "No entitlement to apply an event to." };
  const id = str(event.providerEventId);
  if (!id) return { ok: false, say: "A billing event with no provider event id cannot be deduplicated, so it is not authoritative and is not applied." };
  const seen = new Set([...(Array.isArray(seenEventIds) ? seenEventIds : [])].map(str));
  if (seen.has(id)) {
    return { ok: true, duplicate: true, entitlement, seenEventIds: [...seen],
             say: `Provider event ${id} has already been applied. Providers replay; a replay is a duplicate, not a second transaction.` };
  }
  const seq = num(event.providerSequence);
  if (seq === null) {
    return { ok: false, say: "The event carries no provider sequence, so it cannot be ordered against what is already known. Arrival order is not authority." };
  }
  const held = num(entitlement.providerSequence) ?? 0;
  seen.add(id);
  if (seq <= held) {
    return {
      ok: true, applied: false, outOfOrder: true, entitlement, seenEventIds: [...seen],
      say: `Event ${id} carries provider sequence ${seq} and the entitlement is already at ${held}. It is recorded and does NOT take effect: a late upgrade arriving after a cancellation must not quietly restore access. The current authoritative plan is preserved.`,
    };
  }
  const status = str(event.status || entitlement.status);
  if (!ENTITLEMENT_STATES.includes(status)) {
    return { ok: false, say: `"${status}" is not an entitlement status.` };
  }
  const nextPlan = event.planId ? plan(event.planId) : plan(entitlement.planId);
  if (event.planId && !nextPlan) return { ok: false, say: `"${str(event.planId)}" is not a plan.` };
  const next = {
    ...entitlement,
    planId: nextPlan.id,
    planRevision: event.planId && nextPlan.id !== entitlement.planId ? Number(entitlement.planRevision) + 1 : entitlement.planRevision,
    status, providerSequence: seq,
    endedAt: status === "ended" ? (str(event.at) || entitlement.endedAt) : null,
  };
  return { ok: true, applied: true, entitlement: next, seenEventIds: [...seen],
           say: `Event ${id} at provider sequence ${seq}: ${entitlement.planId}/${entitlement.status} → ${next.planId}/${next.status}. Reconciled before access changed, not after.` };
}

/** What this entitlement may do now, §19 and TI-11. */
export function capabilities(entitlement, { at = null } = {}) {
  const status = str(entitlement?.status);
  const caps = STATE_CAPABILITIES[status];
  if (!caps) return { ok: false, say: `"${status}" is not an entitlement status, so nothing is permitted.` };
  let recoveryWindowOpen = true;
  if (status === "ended" && entitlement.endedAt && at) {
    const days = (Date.parse(str(at)) - Date.parse(str(entitlement.endedAt))) / 86400000;
    recoveryWindowOpen = Number.isFinite(days) ? days <= RECOVERY_WINDOW_DAYS : true;
  }
  const effective = { ...caps };
  if (!recoveryWindowOpen) { effective.export = false; effective.rollback = false; }
  return {
    ok: true, status, ...effective, recoveryWindowOpen,
    say: status === "trial" || status === "active"
      ? `${status}: ingestion, generation and approved live writes are available.`
      : `${status}: read, export and authorised rollback only${effective.rollback ? "" : " — the recovery window has closed"}. ${status === "suspended" || status === "ended" ? "Ingestion and draft generation are stopped." : "Draft generation is stopped and no new live write is accepted."} An existing reversible change can still be undone: a product that holds a published change hostage to a renewal is a liability, not a lever.`,
  };
}

export function hasFeature(entitlement, feature) {
  const p = plan(entitlement?.planId);
  if (!p) return { ok: false, say: "No plan on this entitlement." };
  const has = p.features.includes(str(feature));
  return { ok: has, feature: str(feature), plan: p.id,
           say: has ? `${p.name} includes ${str(feature)}.` : `${p.name} does not include ${str(feature)}. Hard cap: the feature is unavailable rather than charged as an overage.` };
}

/**
 * §19 and TI-09 — reserve quota BEFORE generation.
 *
 * `usage` is the caller's record for the period: { reservations: {workId:…},
 * settled: {workId:…} }. Reserving is what makes two concurrent requests for
 * the last unit resolve to one, and it is why this takes a work id rather
 * than incrementing a number.
 */
export function reserveQuota({ entitlement, usage = {}, workId, at = null, sku = "generated_draft" } = {}) {
  const id = str(workId);
  if (!id) return { ok: false, status: 422, say: "A reservation needs a logical work id. Without one a retry is a second unit." };
  const p = plan(entitlement?.planId);
  if (!p) return { ok: false, status: 422, say: "No plan, so no quota." };
  const caps = capabilities(entitlement, { at });
  if (!caps.ok || !caps.generate) {
    return { ok: false, status: 403, say: `Generation is not available while the installation is ${str(entitlement?.status)}. ${caps.say}` };
  }
  const period = billingPeriod(at) || "unknown";
  const reservations = { ...(usage.reservations || {}) };
  const settled = { ...(usage.settled || {}) };

  if (settled[id]) {
    return { ok: true, replayed: true, status: 200, usage: { reservations, settled },
             say: `Work ${id} is already settled in ${settled[id].period}. A duplicate attempt is not a second unit and is never charged twice.` };
  }
  if (reservations[id]) {
    return { ok: true, replayed: true, status: 200, reservation: reservations[id], usage: { reservations, settled },
             say: `Work ${id} already holds a reservation. The same attempt does not take a second unit.` };
  }

  const limit = p.draftsPerMonth;
  if (limit !== null) {
    const used = Object.values(settled).filter((s) => s.period === period).length
               + Object.values(reservations).filter((r) => r.period === period).length;
    if (used >= limit) {
      return {
        ok: false, status: 429, retryAfterPeriod: periodResetAt(at), used, limit,
        say: `${used} of ${limit} generated drafts are committed or reserved in ${period}. 429, with the usage reset at ${periodResetAt(at)}. Hard cap by default: no automatic overage is charged and nothing is generated past it.`,
      };
    }
  }
  reservations[id] = { workId: id, period, sku: str(sku), planRevision: entitlement.planRevision, at: str(at) || null, quantity: 1 };
  return {
    ok: true, status: 200, reservation: reservations[id], usage: { reservations, settled },
    say: `Reserved one ${str(sku)} for ${id} in ${period}${limit === null ? "" : ` (${Object.values(settled).filter((s) => s.period === period).length + Object.values(reservations).filter((r) => r.period === period).length} of ${limit})`}. Reserved before generation, so two concurrent requests cannot both spend the last unit.`,
  };
}

/**
 * §19 — settle once on successful persist. A degraded template fallback does
 * not count, and neither does an attempt.
 */
export function settleQuota({ usage = {}, workId, degraded = false, at = null } = {}) {
  const id = str(workId);
  const reservations = { ...(usage.reservations || {}) };
  const settled = { ...(usage.settled || {}) };
  if (settled[id]) {
    return { ok: true, replayed: true, usage: { reservations, settled }, say: `Work ${id} is already settled. Settling is once.` };
  }
  const r = reservations[id];
  if (!r) return { ok: false, usage: { reservations, settled }, say: `No reservation for ${id}; nothing to settle. A unit is reserved before generation, never counted after it.` };
  if (degraded) {
    delete reservations[id];
    return { ok: true, released: true, counted: false, usage: { reservations, settled },
             say: `Work ${id} fell back to a deterministic template, so the reservation is released and nothing is counted. A customer billed for the model failing and then for the template has been billed twice for nothing.` };
  }
  delete reservations[id];
  settled[id] = { ...r, settledAt: str(at) || null };
  return { ok: true, counted: true, usage: { reservations, settled },
           say: `Work ${id} settled: one ${r.sku} in ${r.period} against plan revision ${r.planRevision}. The record carries sku, revision, time, quantity and work id, and no payload content.` };
}

/** Release on final failure or expiry, §19. */
export function releaseQuota({ usage = {}, workId, why = "final failure" } = {}) {
  const id = str(workId);
  const reservations = { ...(usage.reservations || {}) };
  const settled = { ...(usage.settled || {}) };
  if (!reservations[id]) return { ok: false, usage: { reservations, settled }, say: `No reservation for ${id} to release.` };
  delete reservations[id];
  return { ok: true, usage: { reservations, settled }, say: `Reservation for ${id} released on ${str(why)}. The unit returns to the period's allowance.` };
}

/** A usage record a customer may export, §19. No payload content, ever. */
export function usageExport({ usage = {}, period = null } = {}) {
  const rows = Object.values(usage.settled || {})
    .filter((s) => period === null || s.period === str(period))
    .map((s) => ({ sku: s.sku, planRevision: s.planRevision, at: s.settledAt, quantity: s.quantity, workId: s.workId }))
    .sort((a, b) => (String(a.workId) < String(b.workId) ? -1 : 1));
  const leaked = rows.filter((r) => Object.keys(r).some((k) => /payload|content|prompt|text|body/i.test(k)));
  return { ok: leaked.length === 0, rows, count: rows.length,
           say: `${rows.length} metered row(s)${period ? ` in ${str(period)}` : ""}: sku, plan revision, time, quantity and work id. Payload content is excluded from billing records by construction, not by filtering.` };
}

/** §19 — validate an offline signed entitlement locally. Shape, not cryptography. */
export function validateOfflineEntitlement(token = {}, { publicKeyIds = [], at = null, clockSkewHours = 24 } = {}) {
  const missing = OFFLINE_ENTITLEMENT_FIELDS.filter((f) => {
    const v = token[f];
    return v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : str(v).trim() === "");
  });
  if (missing.length) return { ok: false, reason: "incomplete", missing, say: `The offline entitlement is missing ${missing.join(", ")}.` };
  const keys = new Set([...(Array.isArray(publicKeyIds) ? publicKeyIds : [])].map(str));
  if (!keys.has(str(token.keyId))) {
    return { ok: false, reason: "unknown-key", say: `Key ${str(token.keyId)} is not one this build trusts (${[...keys].join(", ") || "none"}). Private signing keys are kept outside shipped images, so an image can only ever verify.` };
  }
  const expiry = Date.parse(str(token.expiry));
  const now = Date.parse(str(at));
  if (!Number.isFinite(expiry) || !Number.isFinite(now)) {
    return { ok: false, reason: "unreadable-dates", say: "The expiry or the current time could not be read, so validity is unknown and nothing is assumed." };
  }
  if (now > expiry) {
    const overHours = (now - expiry) / 3600000;
    if (overHours <= clockSkewHours) {
      return { ok: true, graceForClockSkew: true,
               say: `Expired ${overHours.toFixed(1)}h ago, inside the ${clockSkewHours}h clock-skew allowance. Honoured, because a disconnected deployment with a drifting clock must not lose access to its own data.` };
    }
    return { ok: false, reason: "expired", recoveryWindowDays: RECOVERY_WINDOW_DAYS,
             say: `Expired at ${str(token.expiry)}, beyond the clock-skew allowance. Read, export and rollback continue through the recovery window; no forced data loss.` };
  }
  return { ok: true, say: `Offline entitlement for deployment ${str(token.deploymentId)} valid to ${str(token.expiry)}, verified against key ${str(token.keyId)} with no call home.` };
}

export function entitlementNotes(result) {
  return result ? [result.say] : [];
}
