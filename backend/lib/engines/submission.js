/**
 * THE SUBMISSION CONTROLLER — the last check before upload.
 *
 * The register's reason: "This is where AI prevents an administrative
 * disqualification, which is the cheapest loss there is." It is also the most
 * galling: eight weeks of work, a competitive price, and a rejection because
 * one file was named wrongly or one form was two pages over.
 *
 * Agent 2 already reconciles its own checklist against its own responses —
 * whether every required deliverable was drafted. That is a check on the
 * CONTENT. This is a check on the ARTEFACTS: the files as they will be
 * uploaded, against the portal's own rules.
 *
 * NINE CHECKS, AND EVERY ONE OF THEM IS A REJECTION THAT HAS HAPPENED TO
 * SOMEBODY:
 *
 *   1. A mandatory field left blank on the portal form.
 *   2. A filename that does not match the convention the ITT specifies.
 *      Portals reject on this without reading the file.
 *   3. A page or word limit exceeded. Evaluators are instructed to stop
 *      reading at the limit, so the last pages are not marked down — they
 *      are not read.
 *   4. A format the portal does not accept.
 *   5. A document requiring a signature, unsigned.
 *   6. The tendered price in the submission against the price in the pricing
 *      schedule. Two different numbers in one bid is either a rejection or a
 *      contract at the lower one.
 *   7. Contradictory answers — the same fact stated differently in two
 *      documents. An evaluator who finds one stops believing the rest.
 *   8. A certificate or accreditation expiring before the DEADLINE, not
 *      before today. A policy that lapses two days before the return date is
 *      evidence of nothing on the day it is assessed.
 *   9. Portal completeness — a required upload slot with no file in it.
 *
 * IT DOES NOT UPLOAD ANYTHING. The last act before a submission is a person
 * deciding to submit.
 */

import { instant } from "../l7/evidence.js";
import { num } from "../l7/num.js";
import { moment, day } from "./moment.js";

export const FORMATS = ["pdf", "docx", "xlsx", "dwg", "zip", "jpg", "png"];

/**
 * Does this filename match the convention?
 *
 * The convention is given as a template using tokens the ITT uses, not as a
 * regex, because whoever fills this in is reading an ITT rather than writing
 * code. `{ref}` `{supplier}` `{doc}` `{rev}` become groups; everything else
 * must match literally.
 */
export function matchesConvention(name, template) {
  if (!template) return { ok: true, why: null };
  const escaped = String(template)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\{(ref|supplier|doc|rev|date|lot)\\\}/g, "[A-Za-z0-9][A-Za-z0-9 _.-]*");
  const re = new RegExp(`^${escaped}$`);
  return re.test(String(name))
    ? { ok: true, why: null }
    : { ok: false, why: `"${name}" does not match the required form "${template}". Portals reject on the filename without reading the file.` };
}

/** One artefact as it will be uploaded. */
export function artefact(raw = {}, { deadline = null, convention = null, formats = FORMATS } = {}) {
  const faults = [];
  const name = String(raw.name || "").trim();
  if (!name) faults.push("a file with no name");
  const slot = String(raw.slot || "").trim();
  if (!slot) faults.push(`"${name}" is not assigned to an upload slot, so nothing can say where it goes`);

  const ext = (name.split(".").pop() || "").toLowerCase();
  if (name && !formats.includes(ext)) {
    faults.push(`"${name}" is a .${ext}; this portal accepts ${formats.join(", ")}. A format the portal will not take is a deliverable that does not arrive.`);
  }
  if (name) {
    const m = matchesConvention(name, convention);
    if (!m.ok) faults.push(m.why);
  }

  const pages = num(raw.pages);
  const pageLimit = num(raw.pageLimit);
  if (pageLimit !== null && pages === null) faults.push(`"${name}" has a page limit of ${pageLimit} and nothing recording how many pages it is`);
  if (pages !== null && pageLimit !== null && pages > pageLimit) {
    faults.push(`"${name}" is ${pages} pages against a limit of ${pageLimit}. Evaluators are instructed to stop at the limit, so the last ${pages - pageLimit} page(s) are not marked down — they are not read.`);
  }
  const words = num(raw.words);
  const wordLimit = num(raw.wordLimit);
  if (words !== null && wordLimit !== null && words > wordLimit) {
    faults.push(`"${name}" is ${words} words against a limit of ${wordLimit}.`);
  }

  if (raw.needsSignature === true && raw.signedBy !== undefined && !String(raw.signedBy || "").trim()) {
    faults.push(`"${name}" requires a signature and carries none. An unsigned form of tender is commonly treated as no tender at all.`);
  } else if (raw.needsSignature === true && raw.signedBy === undefined) {
    faults.push(`"${name}" requires a signature and nothing records whether it has one`);
  }

  // A certificate against the DEADLINE, not against today.
  const expires = raw.expires ? instant(raw.expires) : null;
  if (raw.expires && expires === null) {
    faults.push(`"${name}" has an expiry of "${raw.expires}", which is not a date. An expiry nobody can read is treated as lapsed.`);
  }
  const by = moment(deadline);
  if (expires !== null && by !== null && expires < by) {
    faults.push(`"${name}" expires on ${day(expires)}, before the submission deadline of ${day(by)}. A policy that lapses before the return date is evidence of nothing on the day it is assessed.`);
  }

  return {
    ok: faults.length === 0,
    faults,
    row: { name: name || null, slot: slot || null, format: ext || null, pages, pageLimit, words, wordLimit,
           needsSignature: raw.needsSignature === true, signedBy: raw.signedBy ? String(raw.signedBy) : null,
           expires: expires === null ? null : day(expires) },
  };
}

/**
 * The whole submission, checked.
 *
 * `slots` are what the portal requires; `artefacts` are what is ready to go;
 * `fields` are the portal form; `facts` are the statements that must agree
 * across documents.
 */
export function check({
  slots = [], artefacts = [], fields = [], facts = [],
  deadline = null, convention = null, formats = FORMATS,
  tenderedPrice = null, pricingSchedulePrice = null, tolerance = 0.005,
} = {}) {
  const findings = [];
  const add = (id, what, rows) => { if (rows.length) findings.push({ id, what, rows }); };

  // 1. Mandatory fields.
  add("mandatory_fields", "a mandatory portal field is blank",
    fields.filter((f) => f.required === true && !String(f.value || "").trim()).map((f) => String(f.name)));

  // 2–5, 8. Per artefact.
  // THE NAME AND THE FAULTS HAVE TO COME FROM THE SAME ROW. Filtering before
  // mapping made the index count the FILTERED array, so the first failing
  // artefact was reported under the first artefact's name — a finding
  // attached to the wrong file, which is worse than no finding: somebody
  // opens the named file, finds nothing wrong, and stops trusting the check.
  const checked = artefacts.map((a) => ({ ...artefact(a, { deadline, convention, formats }), name: String(a?.name || "") || null }));
  add("artefacts", "a file will be rejected as it stands",
    checked.filter((c) => !c.ok).map((c) => ({ name: c.name, faults: c.faults })));

  // 6. The price, in two places.
  const a = num(tenderedPrice);
  const b = num(pricingSchedulePrice);
  if (a !== null && b !== null && Math.abs(a - b) > tolerance) {
    add("price_agreement", "the tendered price and the pricing schedule disagree",
      [`the form of tender says ${a} and the pricing schedule totals ${b}. Two different numbers in one bid is either a rejection or a contract at the lower one.`]);
  } else if (a === null || b === null) {
    add("price_agreement", "the price could not be compared in two places",
      [`${a === null ? "no tendered price" : "no pricing schedule total"} was given, so the commonest arithmetic rejection in a bid file cannot be checked`]);
  }

  // 7. Contradictory answers.
  const byFact = new Map();
  for (const f of facts) {
    const key = String(f.fact || "").trim().toLowerCase();
    if (!key) continue;
    if (!byFact.has(key)) byFact.set(key, []);
    byFact.get(key).push({ where: String(f.where || "(unnamed document)"), value: String(f.value ?? "").trim() });
  }
  const contradictions = [];
  for (const [key, rows] of byFact) {
    const values = [...new Set(rows.map((r) => r.value))];
    if (values.length > 1) {
      contradictions.push(`"${key}" is stated as ${rows.map((r) => `${r.value || "(blank)"} in ${r.where}`).join(" and ")}. An evaluator who finds one contradiction stops believing the rest of the submission.`);
    }
  }
  add("contradictions", "the same fact is stated differently in two documents", contradictions);

  // 9. Portal completeness.
  const filled = new Set(checked.map((c) => c.row.slot).filter(Boolean));
  add("portal_completeness", "a required upload slot is empty",
    slots.filter((s) => s.required !== false && !filled.has(String(s.id))).map((s) => `${s.id}${s.name ? ` — ${s.name}` : ""}`));

  const extraSlots = [...filled].filter((s) => !slots.some((sl) => String(sl.id) === s));
  add("unknown_slots", "a file is assigned to a slot the portal does not have", extraSlots);

  const deadlineAt = deadline === null ? null : instant(deadline);
  if (deadline && deadlineAt === null) {
    add("deadline", "the deadline is not a date", [`"${deadline}" cannot be read as a date, so no expiry can be tested against it and no timetable can be worked back from it`]);
  }

  return {
    ok: findings.length === 0,
    findings,
    artefacts: checked.map((c) => c.row),
    deadline: deadlineAt === null ? null : day(deadlineAt),
    // The verdict is deliberately blunt. This check runs at the point where
    // somebody is about to press upload, and a nuanced summary at that moment
    // is a summary nobody reads.
    verdict: findings.length === 0
      ? "READY TO UPLOAD on every administrative check. The content is Agent 2's question, not this one's."
      : `DO NOT UPLOAD. ${findings.length} administrative check(s) fail: ${findings.map((f) => f.id).join(", ")}. Every one of these is a rejection that has happened to somebody, and none of them is about the quality of the bid.`,
  };
}

export function state() {
  return { checks: 9, formats: FORMATS.length, uploads: false };
}
