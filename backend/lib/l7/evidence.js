/**
 * The evidence registry — the gate that decides whether a claim may be made.
 *
 * A bid is a series of statements about what the business is and what it has
 * done. "Accredited to ISO 9001." "Delivered a comparable scope at Hinkley."
 * "Public liability of ten million." Every one of those is either backed by a
 * document with a date on it, or it is a sentence somebody wrote because it
 * sounded right. The difference is invisible in the finished bid and total in
 * an audit, and it is the single most common way an otherwise honest
 * submission becomes a false statement.
 *
 * The registry closes it by inverting the burden. A claim does not carry
 * itself. It carries an evidence reference, and the reference resolves to an
 * item that is approved, in date, and in scope — or the claim cannot be made.
 *
 * THE EXPIRY RULE IS NOT "IS IT VALID TODAY". It is "is it valid on the day
 * the tender is submitted", and further, on the day it is opened and scored.
 * An insurance certificate that lapses eleven days after the deadline is
 * valid this morning and worthless to the bid. The specification states this
 * as gate GE-EV-01 and again as a pre-submission hard gate, and both mean the
 * same test:
 *
 *     expiresAt > submissionDeadline
 *
 * Not >= today. Not "still current". The comparison is against the deadline,
 * and a certificate expiring the day before is a refusal.
 *
 * THREE REFUSALS THAT LOOK LIKE PASSES ELSEWHERE:
 *
 *   · An unreadable expiry date. A cell that says "annual" or "on renewal"
 *     does not resolve to a day, so it cannot be compared to the deadline.
 *     Treating it as "no expiry" is how expired evidence gets submitted. It
 *     is a refusal here.
 *   · Evidence approved but out of scope. An item bound to one bid does not
 *     back a claim in another. Scope is checked, not assumed.
 *   · A claim with no reference at all. The commonest case and the one the
 *     model will produce every time it is left to its own judgement.
 *
 * No status is stored as "EXPIRED" and trusted. Expiry is COMPUTED at the
 * moment of the check against the date that matters, because a status field
 * is only as fresh as the last job that ran, and the last job may not have.
 */

/** The twelve kinds of thing that can back a claim. */
export const KINDS = [
  "CERTIFICATE",
  "CASE_STUDY",
  "KPI",
  "CV",
  "POLICY",
  "ACCREDITATION",
  "INSURANCE",
  "FINANCIAL",
  "TEST_RESULT",
  "REFERENCE",
  "METHOD",
  "CALCULATION",
];

/** The recorded lifecycle. EXPIRED is derived, never typed by a human. */
export const STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "EXPIRED"];

/** Kinds that always carry an expiry. An undated one of these is a refusal. */
export const MUST_EXPIRE = new Set([
  "CERTIFICATE",
  "ACCREDITATION",
  "INSURANCE",
]);

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_STAMP = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/;

/**
 * A date that resolves to a real instant, or null. Deliberately strict:
 * "annual", "on renewal", "31/12/26" and "" all return null, and null is a
 * refusal at every call site rather than an absent constraint.
 */
export function instant(value) {
  const s = String(value == null ? "" : value).trim();
  if (!s) return null;
  const day = ISO_DAY.exec(s);
  if (day) {
    // End of that day: a certificate valid "until 2026-09-30" is valid
    // through the whole of the thirtieth, which is what a human means.
    const t = Date.UTC(+day[1], +day[2] - 1, +day[3], 23, 59, 59, 999);
    return realDate(t, +day[1], +day[2], +day[3]) ? t : null;
  }
  const stamp = ISO_STAMP.exec(s);
  if (stamp) {
    const t = Date.UTC(+stamp[1], +stamp[2] - 1, +stamp[3], +stamp[4], +stamp[5]);
    if (!realDate(t, +stamp[1], +stamp[2], +stamp[3])) return null;
    if (+stamp[4] > 23 || +stamp[5] > 59) return null;
    return t;
  }
  return null;
}

/** Rejects 2026-02-31 and 2026-13-01, which Date.UTC would happily roll over. */
function realDate(t, y, m, d) {
  if (Number.isNaN(t)) return false;
  const back = new Date(t);
  return (
    back.getUTCFullYear() === y &&
    back.getUTCMonth() + 1 === m &&
    back.getUTCDate() === d
  );
}

/** An evidence record with every field present, whatever arrived. */
export function normalise(raw = {}) {
  const source = raw.source || {};
  return {
    id: String(raw.id || ""),
    kind: KINDS.includes(raw.kind) ? raw.kind : null,
    claim: String(raw.claim || "").trim(),
    source: {
      uri: String(source.uri || "").trim(),
      hash: String(source.hash || "").trim(),
      issuedBy: source.issuedBy ? String(source.issuedBy).trim() : null,
      issuedAt: source.issuedAt ? String(source.issuedAt).trim() : null,
      expiresAt: source.expiresAt ? String(source.expiresAt).trim() : null,
    },
    verifiedBy: raw.verifiedBy ? String(raw.verifiedBy).trim() : null,
    verifiedAt: raw.verifiedAt ? String(raw.verifiedAt).trim() : null,
    status: STATUSES.includes(raw.status) ? raw.status : "DRAFT",
    scope: {
      global: raw.scope ? raw.scope.global === true : false,
      bidIds: Array.isArray(raw.scope && raw.scope.bidIds)
        ? raw.scope.bidIds.map(String)
        : [],
    },
    reuseCount: Number.isFinite(raw.reuseCount) ? raw.reuseCount : 0,
  };
}

/**
 * The status of an item as at a given instant — the only status anything is
 * allowed to act on. An APPROVED item whose expiry has passed is EXPIRED
 * here regardless of what the record says.
 */
export function statusAt(item, when) {
  const e = normalise(item);
  const at = instant(when);
  if (at === null) return "REJECTED"; // an unusable date is never a pass
  if (e.status !== "APPROVED") return e.status;
  if (!e.source.expiresAt) {
    return MUST_EXPIRE.has(e.kind) ? "EXPIRED" : "APPROVED";
  }
  const until = instant(e.source.expiresAt);
  if (until === null) return "EXPIRED"; // unreadable expiry is treated as lapsed
  return until > at ? "APPROVED" : "EXPIRED";
}

/** Does this item back a claim on this bid? Global items back every bid. */
export function inScope(item, bidId) {
  const e = normalise(item);
  if (e.scope.global) return true;
  if (!bidId) return false;
  return e.scope.bidIds.includes(String(bidId));
}

/**
 * Gate GE-EV-01. Every claim in a response must resolve to evidence that is
 * approved, in scope, and still in date ON THE DEADLINE.
 *
 * Returns the four ways it fails, separately, because they need different
 * work: unbound needs an evidence hunt, missing needs the registry fixing,
 * expired needs a renewal chased, outOfScope needs a permission decision.
 */
export function checkClaims({ claims = [], evidence = [], bidId = null, deadline } = {}) {
  const at = instant(deadline);
  const index = new Map();
  for (const raw of evidence) {
    const e = normalise(raw);
    if (e.id) index.set(e.id, e);
  }

  const unbound = [];    // a claim with no evidenceId at all
  const missing = [];    // an evidenceId that resolves to nothing
  const expired = [];    // resolves, approved, but not in date at the deadline
  const unapproved = []; // resolves, in date, but not approved
  const outOfScope = []; // resolves and is valid, but not for this bid
  const backed = [];

  for (const raw of claims) {
    const claim = {
      id: String((raw && raw.id) || ""),
      text: String((raw && raw.text) || "").trim(),
      evidenceId: raw && raw.evidenceId ? String(raw.evidenceId) : "",
    };
    if (!claim.evidenceId) { unbound.push(claim); continue; }
    const item = index.get(claim.evidenceId);
    if (!item) { missing.push(claim); continue; }
    if (!inScope(item, bidId)) { outOfScope.push({ ...claim, kind: item.kind }); continue; }
    const status = at === null ? "REJECTED" : statusAt(item, deadline);
    if (status === "EXPIRED") {
      expired.push({ ...claim, kind: item.kind, expiresAt: item.source.expiresAt });
      continue;
    }
    if (status !== "APPROVED") {
      unapproved.push({ ...claim, kind: item.kind, status });
      continue;
    }
    backed.push({ ...claim, kind: item.kind });
  }

  // An unreadable deadline is itself a refusal: nothing can be shown to be in
  // date against a date nobody can read.
  const undatedDeadline = at === null;
  const ok =
    !undatedDeadline &&
    unbound.length === 0 &&
    missing.length === 0 &&
    expired.length === 0 &&
    unapproved.length === 0 &&
    outOfScope.length === 0;

  return {
    gate: "GE-EV-01",
    ok,
    undatedDeadline,
    unbound,
    missing,
    expired,
    unapproved,
    outOfScope,
    backed,
    checked: claims.length,
  };
}

/**
 * Everything that will have lapsed by a given date — the renewal list. Run
 * against a deadline it says what blocks the bid; run against "today plus
 * ninety days" it says what to chase before it ever blocks one.
 */
export function lapsingBy(evidence, when) {
  const at = instant(when);
  if (at === null) return [];
  const out = [];
  for (const raw of evidence) {
    const e = normalise(raw);
    if (e.status !== "APPROVED") continue;
    if (statusAt(e, when) === "EXPIRED") {
      out.push({
        id: e.id,
        kind: e.kind,
        claim: e.claim,
        expiresAt: e.source.expiresAt,
        unreadable: e.source.expiresAt ? instant(e.source.expiresAt) === null : false,
        undated: !e.source.expiresAt,
      });
    }
  }
  return out.sort((a, b) => String(a.expiresAt) < String(b.expiresAt) ? -1 : 1);
}

/** Refuses a record the registry cannot act on, rather than storing it. */
export function validate(raw) {
  const e = normalise(raw);
  const faults = [];
  if (!e.id) faults.push("no id");
  if (!e.kind) faults.push("kind is not one of the twelve");
  if (!e.claim) faults.push("no claim — evidence must state what it proves");
  if (!e.source.uri) faults.push("no source uri");
  if (!e.source.hash) faults.push("no source hash — the file cannot be shown unchanged");
  if (e.source.expiresAt && instant(e.source.expiresAt) === null) {
    faults.push(`expiry "${e.source.expiresAt}" is not a date`);
  }
  if (e.source.issuedAt && instant(e.source.issuedAt) === null) {
    faults.push(`issue date "${e.source.issuedAt}" is not a date`);
  }
  if (MUST_EXPIRE.has(e.kind) && !e.source.expiresAt) {
    faults.push(`${e.kind} must carry an expiry date`);
  }
  if (e.status === "APPROVED" && !e.verifiedBy) {
    faults.push("approved with nobody named as verifier");
  }
  if (!e.scope.global && e.scope.bidIds.length === 0) {
    faults.push("neither global nor bound to a bid — it backs nothing");
  }
  return { ok: faults.length === 0, faults, record: e };
}
