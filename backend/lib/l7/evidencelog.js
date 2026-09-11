/**
 * When each piece of evidence was valid, recorded on both axes.
 *
 * THE CASE THIS CLOSES. A tender is submitted on 15 October against an ISO
 * 9001 certificate that expires on 30 November. In January the certificate is
 * renewed, and the registry now holds one row saying it expires the following
 * November. Somebody then asks the question that matters — "was the
 * accreditation valid on the day you submitted?" — and the honest answer is
 * yes, and the system can no longer prove it, because the renewal replaced
 * the only record of the old expiry.
 *
 * That is the same defect the water-table survey had, in the place it is most
 * likely to be asked about: an accreditation claim in a public procurement is
 * a statement whose truth is fixed at the submission deadline, and evidence
 * gets renewed as a matter of routine.
 *
 * So every expiry is a bitemporal fact. A renewal is a CORRECTION with a
 * valid time of its own, the previous expiry keeps its value, and "valid on
 * the day we submitted" stays answerable for as long as the record exists.
 *
 * THE CHECK STILL REFUSES ON THE CURRENT POSITION. This module is a record,
 * not a loophole: gate GE-EV-01 continues to compare the live expiry against
 * the submission deadline and refuse a lapsed certificate. What this adds is
 * the ability to answer for a submission that has already gone out.
 */

import { record, correct, supersede, asOf, history } from "./bitemporal.js";
import { normalise, statusAt, instant } from "./evidence.js";

/** The entity key for one evidence item. One shape, used everywhere. */
const keyFor = (id) => `evidence:${String(id)}`;

/**
 * Log an evidence item's validity. The first time an item is seen this is a
 * record; a later expiry for the same item is a correction, so the earlier
 * value survives.
 */
export function logValidity(item, { by = null, at = null, renewal = false, reason = null } = {}) {
  const e = normalise(item);
  const faults = [];
  if (!e.id) faults.push("the evidence item has no id");
  if (!e.source.expiresAt && !renewal) {
    // Not every kind expires, and an item with no expiry is a fact too —
    // recorded as "no expiry" rather than skipped, because skipping it means
    // the record cannot later distinguish "never expired" from "never logged".
  }
  if (!by) faults.push("nobody is named as logging this");
  if (faults.length) return { ok: false, faults, fact: null };

  const value = e.source.expiresAt || null;
  const validFrom = e.source.issuedAt || at || null;

  if (renewal) {
    // A RENEWAL IS A SUCCESSION, NOT A CORRECTION. The old certificate was
    // genuinely in force until the new one was issued; saying it was wrong
    // all along retires the only record that answers what applied before the
    // renewal, and leaves a hole where a submission was made.
    //
    // A correction is the other case and it is real too: a certificate logged
    // with the wrong expiry was never valid to that date, and correct() is
    // what says so. The caller chooses, because only the caller knows which
    // happened.
    const succeeds = reason && /correct|mistak|wrong|error/i.test(String(reason));
    const fn = succeeds ? correct : supersede;
    return fn({
      entity: keyFor(e.id), field: "expiresAt", value,
      validFrom, at, by, source: e.source.uri || `evidence ${e.id}`,
      reason: reason || "renewed",
    });
  }
  return record({
    entity: keyFor(e.id), field: "expiresAt", value,
    validFrom, at, by, source: e.source.uri || `evidence ${e.id}`,
    note: e.claim || null,
  });
}

/**
 * Was this evidence valid on a given day, as the record stood on that day?
 *
 * TWO READINGS, AND THE SECOND IS THE ONE A CLIENT ASKS FOR. "What we believe
 * now about its expiry then" and "what the record said on the day" differ
 * exactly when the item has been renewed or corrected, and the submission was
 * made against the second.
 */
export function validOn(evidenceId, { deadline, knownAt = null } = {}) {
  const at = instant(deadline);
  if (at === null) return { ok: false, reason: `"${deadline}" is not a date` };
  const known = knownAt === null ? deadline : knownAt;

  const asThen = asOf({ entity: keyFor(evidenceId), field: "expiresAt", validAt: deadline, knownAt: known });
  const asNow = asOf({ entity: keyFor(evidenceId), field: "expiresAt", validAt: deadline, knownAt: new Date().toISOString() });

  const judge = (expiry) => {
    if (expiry === null || expiry === undefined) return { valid: null, say: "no expiry was on record" };
    const until = instant(expiry);
    if (until === null) return { valid: false, say: `the recorded expiry "${expiry}" is not a date, and an unreadable expiry is treated as lapsed` };
    return { valid: until > at, say: until > at ? `in date: expired ${expiry}, deadline ${deadline}` : `LAPSED before the deadline: expired ${expiry}, deadline ${deadline}` };
  };

  const then = asThen.known ? judge(asThen.value) : { valid: null, say: "nothing was on record on that day" };
  const now = asNow.known ? judge(asNow.value) : { valid: null, say: "nothing is on record for that day even now" };

  // TWO DIFFERENT AFTERWARDS, AND THEY MEAN DIFFERENT THINGS.
  //
  // CORRECTED means the record about that day changed: it said one thing then
  // and says another now, and the submission was made against the first.
  //
  // SUCCEEDED means a later certificate took over. The record about that day
  // has NOT changed — the old certificate really was the one in force — and
  // the only reason to mention it is so nobody reads the current expiry and
  // assumes it covered the submission.
  //
  // Reporting both as "renewed" made the first invisible, which is the one
  // that matters in a dispute.
  const versions = validityHistory(evidenceId);
  const succeeded = versions.filter((v) => v.trimmedBy).length > 0;
  const corrected = asThen.known && asNow.known && asThen.value !== asNow.value;

  return {
    ok: true,
    evidenceId: String(evidenceId),
    deadline,
    onTheDay: { ...then, expiresAt: asThen.known ? asThen.value : null, source: asThen.source || null },
    asUnderstoodNow: { ...now, expiresAt: asNow.known ? asNow.value : null, source: asNow.source || null },
    corrected,
    succeeded,
    versions: versions.length,
    say: !asThen.known
      ? `Nothing was on record for ${evidenceId} on ${deadline}. A submission made against an unlogged certificate cannot be defended from this record.`
      : corrected
        ? `On ${deadline} the record said it expired ${asThen.value}, which was ${then.valid ? "in date" : "LAPSED"}. The record about that day has since been CORRECTED to ${asNow.value}. THE SUBMISSION WAS MADE AGAINST THE FIRST OF THOSE, and that is the one that answers the question.`
        : succeeded
          ? `${then.say}. A later certificate has since taken over, so today's expiry is a different one — but it was not the certificate in force on ${deadline}, and this reading is the one that answers for the submission.`
          : `${then.say}. Nothing has been renewed or corrected since.`,
  };
}

/** Every version of one item's expiry, both axes. */
export function validityHistory(evidenceId) {
  return history(keyFor(evidenceId), "expiresAt");
}

/**
 * Log a whole registry at once, and say which items could not be logged.
 * Used when the evidence check runs, so the record is built as a by-product
 * of the work rather than as a separate discipline somebody has to remember.
 */
export function logRegistry(evidence = [], { by = null, at = null } = {}) {
  const logged = [];
  const refused = [];
  const alreadyKnown = [];
  for (const raw of evidence) {
    const e = normalise(raw);
    if (!e.id) { refused.push({ id: null, faults: ["no id"] }); continue; }
    const seen = validityHistory(e.id);
    const current = seen.length ? seen[seen.length - 1].value : undefined;
    const value = e.source.expiresAt || null;
    if (seen.length && current === value) { alreadyKnown.push(e.id); continue; }
    const r = logValidity(raw, { by, at, renewal: seen.length > 0, reason: seen.length ? "expiry changed since it was last logged" : null });
    if (r.ok) logged.push(e.id);
    else refused.push({ id: e.id, faults: r.faults });
  }
  return {
    ok: refused.length === 0,
    logged,
    alreadyKnown,
    refused,
    say: `${logged.length} logged, ${alreadyKnown.length} unchanged since last time, ${refused.length} refused.`,
  };
}

/** The live position too, so a caller has both in one answer. */
export function positionAt(item, deadline) {
  const e = normalise(item);
  return {
    evidenceId: e.id,
    kind: e.kind,
    liveStatus: statusAt(e, deadline),
    onTheDay: validOn(e.id, { deadline }),
  };
}
