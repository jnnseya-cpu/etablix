/**
 * What was true, and what we knew — two different questions, two axes.
 *
 * Every database this system had until now answered one question: what is the
 * value NOW. That is the wrong question for a construction business, and the
 * register has said so for weeks: "a claim is defended on what was known on a
 * date, and a system that always reads the latest file destroys exactly that."
 *
 * THE CASE, CONCRETELY.
 *
 * On 14 March the survey says the water table is at 2.1 metres. The temporary
 * works are designed on it, an excavation method is priced on it, and a
 * programme is built on it. On 2 September a re-survey says it was 1.4 metres
 * all along — the first survey was wrong, and it was wrong on 14 March too.
 *
 * A single-axis store now says 1.4. Ask it what the March decision was based
 * on and it says 1.4, so the decision looks negligent. The only record that
 * the decision was reasonable when it was taken has been overwritten by the
 * correction, and the correction was the right thing to do.
 *
 * Two axes keep both facts:
 *
 *   VALID TIME       when the fact was true in the world.
 *   TRANSACTION TIME when this system was told.
 *
 * The re-survey has a valid time reaching back to March and a transaction
 * time of September. So "what was the water table in March" answers 1.4, and
 * "what did we know in March" answers 2.1 — and both are true, which is the
 * whole point.
 *
 * NOTHING IS EVER EDITED OR DELETED.
 *
 * A correction records a new version and closes the old one in TRANSACTION
 * time only. The old row keeps its value forever, because it is the evidence
 * that the decision resting on it was reasonable. An UPDATE statement against
 * a fact is how that evidence is destroyed, so there is no function here that
 * performs one, and `correct()` is an insert wearing a helpful name.
 */

import { collection, insert, update, id as newId, recordLedger } from "../store.js";
import { instant } from "./evidence.js";
import { num } from "./num.js";

const COLLECTION = "facts";

/** The far future, for a fact with no end. */
export const FOREVER = 8640000000000000;

/**
 * A moment, or null.
 *
 * THE FALLBACK APPLIES TO AN ABSENT VALUE AND NOTHING ELSE. The first version
 * of this ended `return n === null ? fallback : n`, so a validFrom of
 * "whenever" fell through to the recording time and was accepted — in the one
 * module whose entire purpose is knowing when something was true. The fact
 * recorded fine, read back fine, and was silently valid from the wrong day.
 *
 * An unreadable date is now null, and null is a refusal at every call site.
 */
function stampOf(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const t = instant(value);
  if (t !== null) return t;
  // A bare number is an epoch millisecond from the machine, not a typed date.
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return null;
}

/**
 * Record a fact. Always an insert; nothing is overwritten, ever.
 *
 * `validFrom` is when it became true in the world, which is frequently NOT
 * when we were told. A survey dated March, delivered in September, is valid
 * from March and recorded in September, and getting that the wrong way round
 * is the commonest way a bitemporal store quietly becomes a single-axis one.
 */
export function record({ entity, field, value, validFrom = null, validTo = null, at = null, by = null, source = null, note = null } = {}) {
  const faults = [];
  if (!entity) faults.push("no entity");
  if (!field) faults.push("no field");
  if (value === undefined) faults.push("no value — an absent value is recorded as null deliberately, not by omission");
  const recordedAt = stampOf(at, Date.now());
  const from = stampOf(validFrom, recordedAt);
  const to = stampOf(validTo, FOREVER);
  if (recordedAt === null) faults.push(`the recording time "${at}" is not a date`);
  if (from === null) faults.push(`the valid-from "${validFrom}" is not a date`);
  if (to === null) faults.push(`the valid-to "${validTo}" is not a date`);
  if (from !== null && to !== null && to <= from) faults.push("valid-to is not after valid-from");
  if (!source) faults.push("no source — a fact nobody can trace is not evidence of anything");
  if (faults.length) return { ok: false, faults, fact: null };

  const fact = insert(COLLECTION, {
    id: newId(),
    entity: String(entity),
    field: String(field),
    value,
    validFrom: from,
    validTo: to,
    recordedAt,
    // Transaction-time close. Set only when a later version supersedes this
    // one, and never accompanied by a change to the value.
    supersededAt: null,
    supersededBy: null,
    by: by ? String(by) : null,
    source: String(source),
    note: note ? String(note) : null,
  });
  return { ok: true, faults: [], fact };
}

/**
 * Correct a fact. An insert, and a transaction-time close on what it replaces.
 *
 * The corrected row keeps its value. It has to: it is the evidence that the
 * decision taken on it was reasonable at the time, and that evidence is
 * exactly what an overwrite destroys.
 */
export function correct({ entity, field, value, validFrom = null, validTo = null, at = null, by = null, source = null, reason = null } = {}) {
  if (!reason) return { ok: false, faults: ["a correction with no reason is an overwrite with better manners"], fact: null, closed: [] };
  const recordedAt = stampOf(at, Date.now());
  const written = record({ entity, field, value, validFrom, validTo, at: recordedAt, by, source, note: reason });
  if (!written.ok) return { ...written, closed: [] };

  const from = written.fact.validFrom;
  const to = written.fact.validTo;
  const closed = [];
  for (const row of collection(COLLECTION)) {
    if (row.id === written.fact.id) continue;
    if (row.entity !== String(entity) || row.field !== String(field)) continue;
    if (row.supersededAt !== null) continue;
    // Only versions whose valid period the correction actually covers.
    if (row.validTo <= from || row.validFrom >= to) continue;
    update(COLLECTION, row.id, { supersededAt: recordedAt, supersededBy: written.fact.id });
    closed.push(row.id);
  }
  recordLedger("fact.corrected", `${entity}.${field}`, by || "unattributed",
    `${closed.length} version(s) superseded, none altered — ${reason}`);
  return { ok: true, faults: [], fact: written.fact, closed };
}

/**
 * Succeed a fact: the old value was RIGHT, and a new one takes over from a
 * date.
 *
 * THIS IS NOT A CORRECTION AND CONFLATING THE TWO LOSES REAL HISTORY.
 *
 * A correction says the old value was wrong for the period it claimed. A
 * succession says it was right and then stopped: a certificate expiring on 31
 * August, renewed by a new one issued on 20 August, is not a correction of the
 * first certificate. The first was genuinely in force for three years and the
 * second takes over.
 *
 * The first version of this module only had correct(), so a renewal closed the
 * old row in transaction time for ALL time — and the question "what was the
 * expiry that applied on 15 August" then had no answer at all, because the row
 * that answered it had been retired and the new one did not reach back. A hole
 * in the middle of a history is worse than a wrong value in it: a wrong value
 * can be argued with.
 *
 * So a succession TRIMS the previous version's valid period to the day the
 * new one starts, and leaves it otherwise untouched. Both remain readable and
 * each covers exactly the period it was true for.
 */
export function supersede({ entity, field, value, validFrom, validTo = null, at = null, by = null, source = null, reason = null } = {}) {
  const from = stampOf(validFrom, null);
  if (from === null) return { ok: false, faults: [`the valid-from "${validFrom}" is not a date, and a succession has to start on a day`], fact: null, trimmed: [] };
  if (!reason) return { ok: false, faults: ["a succession with no reason cannot be told from an overwrite"], fact: null, trimmed: [] };

  const recordedAt = stampOf(at, Date.now());
  const written = record({ entity, field, value, validFrom: from, validTo, at: recordedAt, by, source, note: reason });
  if (!written.ok) return { ...written, trimmed: [] };

  const trimmed = [];
  for (const row of collection(COLLECTION)) {
    if (row.id === written.fact.id) continue;
    if (row.entity !== String(entity) || row.field !== String(field)) continue;
    if (row.supersededAt !== null) continue;
    // Only a version still running when the new one starts.
    if (row.validTo <= from || row.validFrom >= from) continue;
    // Trimmed, not retired. It stays the answer for its own period.
    update(COLLECTION, row.id, { validTo: from, trimmedAt: recordedAt, trimmedBy: written.fact.id });
    trimmed.push(row.id);
  }
  recordLedger("fact.superseded", `${entity}.${field}`, by || "unattributed",
    `${trimmed.length} version(s) trimmed to ${new Date(from).toISOString().slice(0, 10)}, none retired — ${reason}`);
  return { ok: true, faults: [], fact: written.fact, trimmed };
}

/** Every version of a fact, both axes, oldest recording first. */
export function history(entity, field = null) {
  return collection(COLLECTION)
    .filter((r) => r.entity === String(entity) && (field === null || r.field === String(field)))
    .sort((a, b) => a.recordedAt - b.recordedAt || a.validFrom - b.validFrom)
    .map((r) => ({ ...r }));
}

/**
 * The value of a field at a moment in the world, as the system knew it at a
 * moment in its own history.
 *
 *   asOf({ validAt: March, knownAt: March })     → what we thought in March
 *   asOf({ validAt: March, knownAt: now })       → what we now say was true in March
 *   asOf({ validAt: now, knownAt: now })         → the ordinary question
 *
 * The first two differ exactly when somebody corrected something, and the
 * difference between them is the whole value of this module.
 */
export function asOf({ entity, field, validAt = null, knownAt = null } = {}) {
  const valid = stampOf(validAt, Date.now());
  const known = stampOf(knownAt, Date.now());
  if (valid === null) return { ok: false, reason: `"${validAt}" is not a date`, value: null };
  if (known === null) return { ok: false, reason: `"${knownAt}" is not a date`, value: null };

  const candidates = collection(COLLECTION).filter((r) =>
    r.entity === String(entity) &&
    r.field === String(field) &&
    // Known by then: recorded at or before, and not yet superseded then.
    r.recordedAt <= known &&
    (r.supersededAt === null || r.supersededAt > known) &&
    // True then: the valid period covers the moment asked about.
    r.validFrom <= valid && r.validTo > valid,
  );

  if (candidates.length === 0) {
    return {
      ok: true,
      known: false,
      value: null,
      reason: "nothing was on record for that field, at that moment, as known at that time. Not knowing is a fact too, and it is recorded as not knowing rather than as null.",
      validAt: new Date(valid).toISOString(),
      knownAt: new Date(known).toISOString(),
    };
  }
  // The most recently recorded of those that qualify — a later recording about
  // the same period is a better-informed statement about it.
  const best = candidates.sort((a, b) => b.recordedAt - a.recordedAt)[0];
  return {
    ok: true,
    known: true,
    value: best.value,
    source: best.source,
    by: best.by,
    recordedAt: new Date(best.recordedAt).toISOString(),
    validFrom: new Date(best.validFrom).toISOString(),
    validTo: best.validTo >= FOREVER ? null : new Date(best.validTo).toISOString(),
    factId: best.id,
    validAt: new Date(valid).toISOString(),
    knownAt: new Date(known).toISOString(),
    // Was this later corrected? A reconstruction that does not say so invites
    // somebody to assume the old figure still stands.
    correctedLater: collection(COLLECTION).some((r) => r.supersededBy && r.id === best.id) ||
      best.supersededAt !== null,
  };
}

/**
 * The difference between the two readings — and this is the function a
 * dispute turns on.
 *
 * "We designed on 2.1 because that is what the survey said on the day. It was
 * corrected to 1.4 five months later." Both halves of that sentence come from
 * here, and neither can be produced by a store that overwrites.
 */
export function reconstruct({ entity, field, decisionAt } = {}) {
  const at = stampOf(decisionAt, null);
  if (at === null) return { ok: false, reason: `"${decisionAt}" is not a date` };
  const thenKnown = asOf({ entity, field, validAt: at, knownAt: at });
  const nowKnown = asOf({ entity, field, validAt: at, knownAt: Date.now() });
  const changed = thenKnown.known !== nowKnown.known || JSON.stringify(thenKnown.value) !== JSON.stringify(nowKnown.value);
  return {
    ok: true,
    entity: String(entity),
    field: String(field),
    decisionAt: new Date(at).toISOString(),
    knownThen: thenKnown.known ? thenKnown.value : null,
    knownThenSource: thenKnown.source || null,
    believedNow: nowKnown.known ? nowKnown.value : null,
    believedNowSource: nowKnown.source || null,
    changed,
    say: !thenKnown.known
      ? `Nothing was on record for ${field} when the decision was taken. A decision taken on no information is a different criticism from one taken on wrong information, and the record distinguishes them.`
      : changed
        ? `The decision was taken on ${JSON.stringify(thenKnown.value)} from ${thenKnown.source}. It is now understood to have been ${JSON.stringify(nowKnown.value)}. The decision was reasonable on the information that existed, and this record is the evidence of that.`
        : `${field} was ${JSON.stringify(thenKnown.value)} then and is still understood as ${JSON.stringify(nowKnown.value)}. Nothing was corrected.`,
  };
}

/** Everything known about an entity at a moment, as one object. */
export function snapshot({ entity, validAt = null, knownAt = null } = {}) {
  const fields = [...new Set(collection(COLLECTION).filter((r) => r.entity === String(entity)).map((r) => r.field))];
  const out = {};
  const notes = [];
  for (const f of fields) {
    const v = asOf({ entity, field: f, validAt, knownAt });
    if (!v.ok) { notes.push(`${f}: ${v.reason}`); continue; }
    if (!v.known) continue;
    out[f] = v.value;
    if (v.correctedLater) notes.push(`${f} was corrected after this moment`);
  }
  return {
    entity: String(entity),
    validAt: validAt === null ? new Date().toISOString() : new Date(stampOf(validAt, Date.now())).toISOString(),
    knownAt: knownAt === null ? new Date().toISOString() : new Date(stampOf(knownAt, Date.now())).toISOString(),
    fields: out,
    fieldCount: Object.keys(out).length,
    notes,
  };
}

/**
 * Facts recorded about a period long after it — the late-information list.
 *
 * A survey delivered five months after its own date is not a scandal; it is
 * normal, and it is also the single most common source of a decision that
 * looks wrong in hindsight. Knowing which facts arrived late, and how late,
 * is what lets somebody check whether a decision was taken on information
 * that had not arrived yet.
 */
export function lateInformation({ entity = null, thresholdDays = 14 } = {}) {
  const threshold = Math.max(0, Number(thresholdDays)) * 86400000;
  return collection(COLLECTION)
    .filter((r) => entity === null || r.entity === String(entity))
    .filter((r) => r.recordedAt - r.validFrom > threshold)
    .map((r) => ({
      entity: r.entity,
      field: r.field,
      validFrom: new Date(r.validFrom).toISOString(),
      recordedAt: new Date(r.recordedAt).toISOString(),
      lateByDays: Math.round((r.recordedAt - r.validFrom) / 86400000),
      source: r.source,
      value: r.value,
    }))
    .sort((a, b) => b.lateByDays - a.lateByDays);
}

/**
 * The integrity check. A bitemporal store has one failure mode that matters:
 * somebody edits a value in place, and the history stops being evidence.
 */
export function integrity() {
  const rows = collection(COLLECTION);
  const faults = [];
  for (const r of rows) {
    if (r.supersededAt !== null && r.supersededBy === null) {
      faults.push(`${r.id} is closed with nothing named as superseding it — that is an edit, not a correction`);
    }
    if (r.supersededBy && !rows.some((x) => x.id === r.supersededBy)) {
      faults.push(`${r.id} names ${r.supersededBy} as its successor and that fact does not exist`);
    }
    if (r.supersededAt !== null && r.supersededAt < r.recordedAt) {
      faults.push(`${r.id} was superseded before it was recorded`);
    }
    if (r.validTo <= r.validFrom) faults.push(`${r.id} has a valid period that ends before it starts`);
    if (r.trimmedBy && !rows.some((x) => x.id === r.trimmedBy)) {
      faults.push(`${r.id} was trimmed by ${r.trimmedBy} and that fact does not exist`);
    }
    if (!r.source) faults.push(`${r.id} has no source`);
  }
  return {
    ok: faults.length === 0,
    facts: rows.length,
    open: rows.filter((r) => r.supersededAt === null).length,
    superseded: rows.filter((r) => r.supersededAt !== null).length,
    // Trimmed is not superseded. A trimmed row is still the answer for its
    // own period, and counting it as retired would hide that.
    trimmed: rows.filter((r) => r.trimmedBy).length,
    faults,
    say: faults.length === 0
      ? `${rows.length} fact(s), ${rows.filter((r) => r.supersededAt !== null).length} superseded and none altered.`
      : `${faults.length} integrity fault(s) — the history is no longer evidence.`,
  };
}
