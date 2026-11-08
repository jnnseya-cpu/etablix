/**
 * ET-ENV · Land, environmental and jurisdictional requirements.
 *
 * Built on `agentos/jurisdiction.js`, because the substance was already
 * there: the question is never "is there a consent" but "is it the consent
 * this jurisdiction requires, and is it still in date". An English
 * dewatering position statement filed against a Scottish prerequisite leaves
 * a register showing closed and a site discharging without authorisation.
 *
 * AND A CONDITION IS NOT A CONSENT. A permit with four monitored conditions
 * is four ongoing obligations, and a register that records the permit and
 * not its conditions has recorded the easy half. A condition with no
 * monitoring frequency and no owner is not being monitored.
 */

import { checkEvidenceJurisdiction, requirementProfile, consentVocabulary } from "../agentos/jurisdiction.js";
import { instant } from "../l7/evidence.js";

const has = (v) => v !== undefined && v !== null && String(v).trim() !== "";

export function check({ jurisdiction: where = null, requirements = [], asAt = null } = {}) {
  const rows = (Array.isArray(requirements) ? requirements : []).filter(Boolean);
  const vocab = consentVocabulary(where);

  const wrongJurisdiction = [];
  const unresolved = [];
  const expired = [];
  const unmonitoredConditions = [];
  const now = asAt ? instant(asAt) : null;

  for (const r of rows) {
    const id = String(r.id ?? r.activity ?? "(unidentified requirement)");
    const v = checkEvidenceJurisdiction({
      requirementJurisdiction: r.jurisdiction ?? where,
      evidenceJurisdiction: r.evidenceJurisdiction,
      activityId: r.activity,
    });
    if (v.reason === "WRONG_JURISDICTION") {
      wrongJurisdiction.push({ id, required: v.required, supplied: v.supplied, correctRoute: v.correctRoute });
      continue;
    }
    if (!v.ok) { unresolved.push({ id, why: v.say }); continue; }

    const until = r.validUntil ? instant(r.validUntil) : null;
    if (r.validUntil && until === null) unresolved.push({ id, why: `the expiry "${r.validUntil}" is not a date` });
    else if (now !== null && until !== null && until < now) expired.push({ id, validUntil: String(r.validUntil) });

    for (const c of (Array.isArray(r.conditions) ? r.conditions : []).filter(Boolean)) {
      const cid = `${id}/${String(c.id ?? "(unnamed condition)")}`;
      if (!has(c.frequency) || !has(c.owner)) {
        unmonitoredConditions.push({ id: cid, why: `${!has(c.frequency) ? "no monitoring frequency" : ""}${!has(c.frequency) && !has(c.owner) ? " and " : ""}${!has(c.owner) ? "no owner" : ""}` });
      }
    }
  }

  const faults = wrongJurisdiction.length + unresolved.length + expired.length + unmonitoredConditions.length;
  return {
    ok: faults === 0 && Boolean(vocab),
    jurisdiction: vocab ? vocab.jurisdiction : null,
    vocabulary: vocab,
    requirements: rows.length,
    wrongJurisdiction, unresolved, expired, unmonitoredConditions,
    faults,
    say: !vocab
      ? `"${String(where ?? "")}" does not resolve to a pilot jurisdiction, and an unknown jurisdiction fails closed rather than defaulting to England`
      : faults === 0
        ? `${rows.length} requirement(s) resolved under ${vocab.jurisdiction}, every condition monitored and owned`
        : `${faults} fault(s) — ${wrongJurisdiction.length} on the wrong jurisdiction, which is the failure that is invisible on a register`,
  };
}
export { requirementProfile };
