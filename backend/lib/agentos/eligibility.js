/**
 * Supplier eligibility and package eligibility are two different questions.
 *
 * A supplier approved for office furniture is approved for office furniture.
 * It is not approved for electrical installation, for waste carriage or for
 * moving people in a minibus, and the single most expensive mistake a
 * supplier register makes is holding one flag called "approved". The
 * specification says it plainly: a supplier being eligible for office
 * furniture does not establish competence for electrics or transport.
 *
 * So eligibility is held per supplier AND per service code, and a competence
 * claimed for one code is never read across to another.
 *
 * AND EVIDENCE EXPIRES BETWEEN APPROVAL AND DISPATCH. Insurance lapses, a
 * licence runs out, a certificate reaches its date — after the award and
 * before the lorry moves. The award was valid when it was made and the
 * dispatch is not valid now, and a register that only checks at award will
 * never notice. So `checkAtDispatch` re-reads the dates against the dispatch
 * date, and a lapse blocks the superseded release while every unaffected
 * package carries on.
 */

import { instant } from "../l7/evidence.js";

/** The thirteen states, in order. A rejected quote is retained as evidence. */
export const SUPPLIER_STATES = [
  "CANDIDATE", "EVIDENCE_PENDING", "ELIGIBLE", "INVITED", "OFFER_RECEIVED", "EVALUATED",
  "RECOMMENDED", "AWARD_PENDING", "AWARDED", "MOBILISATION_HOLD", "READY", "LIVE", "SUSPENDED", "CLOSED",
];

/** Checks that apply only to some scopes. Applying all of them to all is as wrong as applying none. */
export const SCOPE_CHECKS = {
  rightToWork: { applies: ["13", "15", "16", "17", "19", "20"], name: "right to work" },
  wasteCarrier: { applies: ["10", "18", "21"], name: "waste carrier registration" },
  foodHygiene: { applies: ["16"], name: "food hygiene" },
  sia: { applies: ["15"], name: "SIA licensing" },
  transport: { applies: ["20"], name: "road transport operator licensing" },
  electrical: { applies: ["08", "11"], name: "electrical competence" },
};

const has = (v) => v !== undefined && v !== null && v !== "" && v !== false;

/**
 * Is this supplier eligible for THIS service code?
 *
 * `competences` is the codes the supplier has evidenced. `evidence` carries
 * dated items. Nothing is read across codes.
 */
export function supplierEligibility({ supplier = null, code = null, competences = [], evidence = {}, asAt = null } = {}) {
  const c = String(code ?? "").padStart(2, "0");
  const held = (Array.isArray(competences) ? competences : []).map((x) => String(x).padStart(2, "0"));

  if (!supplier || !c || c === "00") {
    return { ok: false, state: "CANDIDATE", code: c || null, say: "a supplier or a service code is missing, so there is nothing to assess" };
  }
  if (!held.includes(c)) {
    return {
      ok: false, state: "EVIDENCE_PENDING", code: c, competences: held,
      reason: "NO_COMPETENCE_FOR_CODE",
      say: `${supplier} has evidenced competence for ${held.join(", ") || "nothing"} and this is code ${c}. `
         + "Eligibility for one code is not eligibility for another, and a register with a single approved flag is how a furniture supplier ends up wiring a compound",
    };
  }

  // Only the checks this scope actually attracts.
  const required = Object.entries(SCOPE_CHECKS).filter(([, v]) => v.applies.includes(c));
  const now = asAt ? instant(asAt) : null;
  const missing = [];
  const expired = [];
  for (const [key, meta] of required) {
    const item = evidence[key];
    if (!has(item)) { missing.push(meta.name); continue; }
    const until = instant(item.validUntil ?? item);
    if (until === null) { missing.push(`${meta.name} with a readable expiry`); continue; }
    if (now !== null && until < now) expired.push({ check: meta.name, validUntil: item.validUntil ?? String(item) });
  }

  if (missing.length || expired.length) {
    return {
      ok: false, state: "EVIDENCE_PENDING", code: c,
      reason: expired.length ? "EVIDENCE_EXPIRED" : "EVIDENCE_MISSING",
      missing, expired,
      say: expired.length
        ? `${expired.map((e) => `${e.check} expired ${e.validUntil}`).join("; ")}`
        : `code ${c} requires ${missing.join(", ")}, which is not held`,
    };
  }

  return {
    ok: true, state: "ELIGIBLE", code: c,
    checksApplied: required.map(([, v]) => v.name),
    say: required.length
      ? `${supplier} is eligible for code ${c}, with ${required.map(([, v]) => v.name).join(", ")} in date`
      : `${supplier} is eligible for code ${c}, which attracts none of the scoped checks`,
  };
}

/**
 * The re-check immediately before dispatch.
 *
 * The award was valid when it was made. This asks whether it is valid NOW,
 * and blocks only the package whose evidence lapsed.
 */
export function checkAtDispatch({ packages = [], asAt = null } = {}) {
  const rows = (Array.isArray(packages) ? packages : []).filter(Boolean);
  const blocked = [];
  const proceeding = [];
  for (const p of rows) {
    const r = supplierEligibility({
      supplier: p.supplier, code: p.code, competences: p.competences, evidence: p.evidence, asAt,
    });
    if (r.ok) proceeding.push({ package: p.id, supplier: p.supplier, code: r.code });
    else blocked.push({ package: p.id, supplier: p.supplier, code: r.code, reason: r.reason, why: r.say });
  }
  return {
    ok: blocked.length === 0,
    blocked, proceeding,
    say: blocked.length
      ? `${blocked.length} of ${rows.length} package(s) blocked at dispatch: ${blocked.map((b) => `${b.package} (${b.reason})`).join(", ")}. `
        + `${proceeding.length} unaffected package(s) continue — a lapse on one supplier is not a stop on the mobilisation`
      : `all ${rows.length} package(s) still eligible at ${asAt || "the dispatch date"}`,
  };
}

/** The notes an approver reads. */
export function eligibilityNotes(result) {
  if (!result || result.ok) return [];
  const out = [];
  for (const b of result.blocked || []) {
    out.push(`SUPERSEDED RELEASE BLOCKED — ${b.package} with ${b.supplier} on code ${b.code}: ${b.why}. `
      + "The award was valid when it was made. It is not valid now, and a register that checks only at award would not have noticed.");
  }
  if (result.proceeding?.length) {
    out.push(`UNAFFECTED PACKAGES CONTINUE — ${result.proceeding.map((p) => p.package).join(", ")}. `
      + "One supplier's lapsed evidence does not stop a mobilisation.");
  }
  return out;
}
