/**
 * Ingestion, and the three answers a repeated batch can get.
 *
 * Delivery is at-least-once, so the same batch WILL arrive twice. The
 * specification separates three cases that a naive upsert collapses into one,
 * and TI-01 asserts all three (§15, §16):
 *
 *   ACCEPTED   · a key not seen before.
 *   DUPLICATE  · the same key AND the same content hash. Not an error. The
 *                original persists once and the count says duplicate.
 *   CONFLICT   · the same key and DIFFERENT content. 409. A source record
 *                whose value changed under the same version is either a
 *                corrected feed that must bump its revision, or a bug — and
 *                silently taking the second would overwrite evidence a brief
 *                has already been approved against.
 *
 * THE KEY IS FOUR PARTS, NOT ONE: installation, source, source record,
 * revision (§15). Dropping installation from it is the defect that lets one
 * customer's replay suppress another customer's first delivery, and it is
 * invisible in every single-tenant test.
 *
 * AN INVALID BATCH FAILS ATOMICALLY WITH INDEXED ERRORS (§16). Partially
 * accepting one is worse than rejecting it: the producer cannot tell which
 * rows landed, so its retry is now the conflict case above.
 *
 * LATE IS NOT ABSENT. An observation arriving after its window closed is
 * marked for rescoring inside the correction horizon, and one arriving after
 * that horizon is recorded and excluded from the frozen score rather than
 * quietly reopening a settled experiment (§17).
 */

/** §16 request limits. */
export const BATCH_LIMITS = Object.freeze({ maxItems: 500, maxBytes: 1024 * 1024 });

/** §17: corrections are reprocessed for seven days. */
export const CORRECTION_HORIZON_DAYS = 7;

/** Required on every observation, §5. */
export const OBSERVATION_FIELDS = Object.freeze([
  "sourceId", "sourceFamily", "sourceRecordId", "revision", "observedAt",
  "windowStart", "windowEnd", "metric", "value", "unit",
]);

/**
 * Text that must never be ingested, §16 ("reject personally identifiable
 * text"). Deliberately crude and deliberately refusing rather than redacting:
 * a redactor that is wrong once has published the thing it was redacting.
 */
const PII = [
  { id: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { id: "phone", re: /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?){2,4}\d{3,4}/ },
  { id: "postcode-uk", re: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i },
  { id: "card", re: /\b(?:\d[ -]?){13,19}\b/ },
];

const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A stable, order-independent hash of the content that must not change. */
export function contentHash(o = {}) {
  const canonical = JSON.stringify({
    metric: str(o.metric), value: num(o.value), unit: str(o.unit),
    windowStart: str(o.windowStart), windowEnd: str(o.windowEnd),
    geography: str(o.geography), locale: str(o.locale), segment: str(o.segment),
    scalingScope: str(o.scalingScope), coverage: num(o.coverage),
  });
  // FNV-1a, 32-bit, hex. Not a security hash — a change detector, and the
  // only property needed is that different content gives a different string.
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** The four-part key. Installation first, because it is the part that is dropped. */
export function sourceVersionKey(installationId, o = {}) {
  return [str(installationId), str(o.sourceId), str(o.sourceRecordId), str(o.revision)].join("|");
}

function validate(o, registeredSources) {
  const problems = [];
  for (const f of OBSERVATION_FIELDS) {
    const v = o?.[f];
    if (v === undefined || v === null || str(v).trim() === "") {
      if (f === "value" && num(v) !== null) continue;
      problems.push(`${f} is required`);
    }
  }
  if (num(o?.value) === null) problems.push("value must be a finite number");
  const ws = str(o?.windowStart), we = str(o?.windowEnd);
  if (ws && we && !(ws < we)) problems.push("the window is inclusive of its start and exclusive of its end, so windowStart must precede windowEnd");
  const sid = str(o?.sourceId);
  if (registeredSources && !registeredSources.has(sid)) {
    problems.push(`source "${sid}" is not registered — an unregistered source has no stated terms and therefore no permitted use`);
  }
  for (const field of ["text", "excerpt", "title", "segment"]) {
    const t = str(o?.[field]);
    if (!t) continue;
    for (const p of PII) {
      if (p.re.test(t)) { problems.push(`${field} carries what looks like a ${p.id}; personally identifiable text is rejected, not redacted`); break; }
    }
  }
  return problems;
}

/**
 * Ingest a batch against a ledger of keys already seen.
 *
 * `ledger` is a plain object of key → { hash, at }, so the caller owns
 * storage and this stays a pure function the conformance suite can replay.
 */
export function ingestBatch({ installationId, observations = [], ledger = {},
                              registeredSources = null, at = null,
                              limits = BATCH_LIMITS } = {}) {
  const inst = str(installationId);
  if (!inst) {
    return { ok: false, status: 403, reason: "no-installation",
             say: "No installation scope. A private row is never selected before installation authority is resolved, so a batch with no scope is refused rather than defaulted." };
  }
  const items = Array.isArray(observations) ? observations : [];
  if (!items.length) {
    return { ok: false, status: 422, reason: "empty-batch", say: "An empty batch is not an ingestion." };
  }
  if (items.length > limits.maxItems) {
    return { ok: false, status: 422, reason: "too-many-items", count: items.length,
             say: `${items.length} items against a limit of ${limits.maxItems}. Split the batch; a truncated accept would silently drop the tail.` };
  }
  const bytes = Buffer.byteLength(JSON.stringify(items), "utf8");
  if (bytes > limits.maxBytes) {
    return { ok: false, status: 422, reason: "too-large", bytes,
             say: `${bytes} bytes against a limit of ${limits.maxBytes}.` };
  }

  const known = registeredSources ? new Set([...registeredSources].map(str)) : null;
  const errors = [];
  items.forEach((o, index) => {
    const problems = validate(o, known);
    if (problems.length) errors.push({ index, problems });
  });
  if (errors.length) {
    // Atomic: nothing is written, and the producer is told exactly which rows.
    return { ok: false, status: 422, reason: "invalid-batch", errors, accepted: 0, duplicate: 0, rejected: items.length,
             say: `The batch is rejected whole: ${errors.length} of ${items.length} item(s) are invalid. A partial accept leaves the producer unable to tell which rows landed, which turns its retry into a conflict.` };
  }

  const next = { ...ledger };
  const accepted = [], duplicates = [], conflicts = [], late = [];
  const now = at ? Date.parse(at) : null;

  items.forEach((o, index) => {
    const key = sourceVersionKey(inst, o);
    const hash = contentHash(o);
    const seen = next[key];
    if (seen) {
      if (seen.hash === hash) { duplicates.push({ index, key }); return; }
      conflicts.push({ index, key, heldHash: seen.hash, offeredHash: hash });
      return;
    }
    next[key] = { hash, at: str(o.ingestedAt) || str(at) || null };
    const entry = { index, key, hash };
    if (now !== null) {
      const closed = Date.parse(str(o.windowEnd));
      if (Number.isFinite(closed) && closed < now) {
        const days = (now - closed) / 86400000;
        entry.lateByDays = Math.round(days * 100) / 100;
        entry.withinCorrectionHorizon = days <= CORRECTION_HORIZON_DAYS;
        late.push(entry);
      }
    }
    accepted.push(entry);
  });

  if (conflicts.length) {
    // 409 for the batch, and nothing from it is written. The same source
    // version with an altered value is a corrected feed that has to bump its
    // revision, or a bug; taking it would overwrite approved evidence.
    return { ok: false, status: 409, reason: "source-version-conflict", conflicts,
             accepted: 0, duplicate: duplicates.length, rejected: items.length, ledger,
             say: `${conflicts.length} item(s) reuse a source version key with different content. The stored observation is kept and the batch is refused: a corrected feed bumps its revision, and a brief already approved against the original evidence must not have that evidence rewritten underneath it.` };
  }

  return {
    ok: true, status: 202,
    accepted: accepted.length, duplicate: duplicates.length, rejected: 0,
    acceptedItems: accepted, duplicateItems: duplicates,
    late: late.map((l) => ({ index: l.index, lateByDays: l.lateByDays, withinCorrectionHorizon: l.withinCorrectionHorizon })),
    ledger: next,
    say: `${accepted.length} accepted, ${duplicates.length} duplicate, 0 rejected${late.length ? `; ${late.length} arrived after their window closed, ${late.filter((l) => l.withinCorrectionHorizon).length} inside the ${CORRECTION_HORIZON_DAYS}-day correction horizon and therefore marked for rescoring` : ""}.`,
  };
}

/**
 * Resolve an entity for a caller, §16.
 *
 * "Unknown or cross-installation entity IDs return 404. A known identity
 * lacking action authority returns 403." The distinction is the whole point:
 * a 403 on another installation's ID confirms the ID exists, which is a
 * cross-tenant disclosure made out of politeness. TI-02.
 */
export function resolveForCaller({ callerInstallationId, rows = [], entityId = null, grants = null, requiredScope = null } = {}) {
  const caller = str(callerInstallationId);
  if (!caller) return { ok: false, status: 403, rows: [], say: "No resolved installation scope; nothing is selected." };

  if (grants && requiredScope) {
    const held = new Set([...(grants[caller] || [])].map(str));
    if (!held.has(str(requiredScope))) {
      return { ok: false, status: 403, rows: [], reason: "scope-not-granted",
               say: `This identity is known to installation ${caller} but holds no ${str(requiredScope)} scope. 403, because the identity is real and the authority is not.` };
    }
  }

  const mine = (Array.isArray(rows) ? rows : []).filter((r) => str(r?.installationId) === caller);
  if (entityId !== null) {
    const row = mine.find((r) => str(r.id) === str(entityId)) || null;
    if (!row) {
      return { ok: false, status: 404, rows: [], reason: "not-found",
               say: `No such entity in installation ${caller}. A cross-installation id returns 404 and not 403, because a 403 confirms the id exists, which is a disclosure made out of politeness.` };
    }
    return { ok: true, status: 200, rows: [row], say: `Resolved within installation ${caller}.` };
  }
  return { ok: true, status: 200, rows: mine, count: mine.length,
           say: `${mine.length} row(s) visible to installation ${caller}; every other installation's rows are not filtered out of a result, they are never selected.` };
}

export function observationNotes(result) {
  if (!result) return [];
  const out = [result.say];
  if (result.errors) out.push(...result.errors.map((e) => `item ${e.index}: ${e.problems.join("; ")}`));
  if (result.conflicts) out.push(...result.conflicts.map((c) => `item ${c.index}: held ${c.heldHash}, offered ${c.offeredHash}`));
  return out;
}
