/**
 * THE AUDIT AGENT — the audit programme, and the independence inside it.
 *
 * An audit programme fails in a way that looks like success: every audit is
 * scheduled, every audit is carried out, every finding is closed, and the
 * closures are done by the people who were audited. The register then shows
 * a green year, and what it measured was the willingness of a team to mark
 * its own homework.
 *
 * The adversarial challenger already has an independence rule for a review of
 * a bid. This is the same rule applied to a management system, and it is the
 * one an ISO 9001 surveillance visit tests first.
 *
 *   · AN AUDITOR AUDITING THEIR OWN AREA. Not a judgement about anybody's
 *     honesty. It is the reason independence is a requirement rather than a
 *     preference: nobody finds what they built.
 *   · A FINDING CLOSED BY ITS OWN OWNER, with nothing verifying it.
 *   · A FINDING CLOSED WITH NO EVIDENCE. The same dropdown again.
 *   · A MAJOR FINDING CLOSED WITH NO ROOT CAUSE. A major closed on a
 *     corrective action and no cause is a major that recurs, and the second
 *     occurrence is what a certification body escalates on.
 *   · AN AUDIT SCHEDULED AND NEVER CARRIED OUT, which the programme reports
 *     as "planned" for ever.
 *   · A CLAUSE OF THE STANDARD NOT AUDITED IN THE CYCLE. A programme has to
 *     cover the whole standard within the cycle; the usual gap is the clause
 *     that is hardest to audit, and that is the clause a surveillance visit
 *     chooses.
 */

import { instant } from "../l7/evidence.js";
import { asAtOr, day } from "./moment.js";

const DAY = 86400000;

export const GRADES = ["observation", "minor", "major"];
export const AUDIT_STATES = ["planned", "in_progress", "reported", "closed"];

/** How long an audit may sit reported with findings open before it is late. */
export const CLOSURE_DAYS = { observation: 90, minor: 60, major: 30 };

/** One audit, checked. */
export function auditRecord(raw = {}, { asAt = null } = {}) {
  const faults = [];
  const at = asAtOr(asAt);
  const id = String(raw.id || "").trim();
  if (!id) faults.push("no reference");
  const area = String(raw.area || "").trim();
  if (!area) faults.push("no area audited");
  const state = String(raw.state || "").trim();
  if (!AUDIT_STATES.includes(state)) faults.push(`"${state}" is not one of ${AUDIT_STATES.join(", ")}`);

  const auditor = String(raw.auditor || "").trim();
  if (!auditor) faults.push("nobody named as the auditor");
  const auditorArea = String(raw.auditorArea || "").trim();
  if (auditor && !auditorArea) faults.push("nothing recording which area the auditor belongs to, so independence cannot be checked at all");
  if (auditorArea && area && auditorArea.toLowerCase() === area.toLowerCase()) {
    faults.push(`the auditor belongs to the area being audited (${area}). Not a judgement about anybody's honesty — it is the reason independence is a requirement rather than a preference: nobody finds what they built.`);
  }

  const planned = raw.plannedFor ? instant(raw.plannedFor) : null;
  if (raw.plannedFor && planned === null) faults.push(`"${raw.plannedFor}" is not a date`);
  const carried = raw.carriedOut ? instant(raw.carriedOut) : null;
  if (state !== "planned" && carried === null) faults.push(`recorded as ${state} with no date it was carried out`);
  // AN AUDIT PAST ITS PLANNED DATE IS NOT AN INADMISSIBLE RECORD. The record
  // is perfectly good; the programme is late. Treating it as a fault removed
  // the audit from the admissible set and therefore from the list of audits
  // past their date — the one report it should have appeared in. It is
  // reported once, at programme level, where it belongs.

  const clauses = Array.isArray(raw.clauses) ? raw.clauses.map(String) : [];
  if (state !== "planned" && clauses.length === 0) faults.push("no clauses of the standard recorded as audited, so nothing can say what the cycle has covered");

  return { ok: faults.length === 0, faults, row: { id: id || null, area: area || null, state, auditor: auditor || null, auditorArea: auditorArea || null, plannedFor: planned === null ? null : day(planned), carriedOut: carried === null ? null : day(carried), clauses } };
}

/** One finding, checked. */
export function findingRecord(raw = {}, { audits = [], asAt = null } = {}) {
  const faults = [];
  const at = asAtOr(asAt);
  const id = String(raw.id || "").trim();
  if (!id) faults.push("no reference");
  const grade = String(raw.grade || "").trim();
  if (!GRADES.includes(grade)) faults.push(`"${grade}" is not one of ${GRADES.join(", ")}`);
  const auditId = String(raw.audit || "").trim();
  const audit = audits.find((a) => String(a.id) === auditId) || null;
  if (!auditId) faults.push("not linked to an audit");
  else if (!audit) faults.push(`links to audit "${auditId}", which is not in the programme`);

  const owner = String(raw.owner || "").trim();
  if (!owner) faults.push("nobody owns it");
  const raised = raw.raisedAt ? instant(raw.raisedAt) : null;
  if (!raw.raisedAt || raised === null) faults.push(`raised on "${raw.raisedAt}", which is not a date`);

  const closed = String(raw.status || "") === "closed";
  if (closed) {
    if (!String(raw.evidence || "").trim()) faults.push("closed with no evidence");
    const closedBy = String(raw.closedBy || "").trim();
    if (!closedBy) faults.push("closed by nobody");
    if (closedBy && owner && closedBy.toLowerCase() === owner.toLowerCase() && !String(raw.verifiedBy || "").trim()) {
      faults.push(`closed by its own owner (${owner}) with nobody verifying it. This is the finding a surveillance visit reopens.`);
    }
    if (grade === "major" && !String(raw.rootCause || "").trim()) {
      faults.push("a MAJOR closed with no root cause. A major closed on a corrective action alone is a major that recurs, and the second occurrence is what a certification body escalates on.");
    }
    if (!raw.closedAt || instant(raw.closedAt) === null) faults.push("closed with no date");
  }

  const limit = CLOSURE_DAYS[grade] || null;
  const overdue = !closed && raised !== null && limit !== null && at !== null && (at - raised) / DAY > limit;

  return {
    ok: faults.length === 0,
    faults,
    overdue,
    row: {
      id: id || null, audit: auditId || null, grade, owner: owner || null,
      raisedAt: raised === null ? null : day(raised),
      status: closed ? "closed" : String(raw.status || "open"),
      evidence: String(raw.evidence || "").trim() || null,
      closedBy: String(raw.closedBy || "").trim() || null,
      verifiedBy: String(raw.verifiedBy || "").trim() || null,
      rootCause: String(raw.rootCause || "").trim() || null,
      closedAt: raw.closedAt && instant(raw.closedAt) !== null ? day(instant(raw.closedAt)) : null,
      daysOpen: raised === null || at === null ? null : Math.round((at - raised) / DAY),
      allowedDays: limit,
    },
  };
}

/**
 * The programme over a cycle.
 *
 * `standardClauses` is what has to be covered. Coverage is the check that
 * makes an audit programme a programme rather than a list of audits.
 */
export function programme({ audits = [], findings = [], standardClauses = [], asAt = null, cycleFrom = null, cycleTo = null } = {}) {
  const at = asAtOr(asAt);
  const checkedAudits = audits.map((a) => ({ ...auditRecord(a, { asAt: at }), given: a }));
  const goodAudits = checkedAudits.filter((c) => c.ok).map((c) => c.row);
  const badAudits = checkedAudits.filter((c) => !c.ok).map((c) => ({ id: c.given?.id || null, faults: c.faults }));

  const checkedFindings = findings.map((f) => ({ ...findingRecord(f, { audits, asAt: at }), given: f }));
  const goodFindings = checkedFindings.filter((c) => c.ok).map((c) => c.row);
  const badFindings = checkedFindings.filter((c) => !c.ok).map((c) => ({ id: c.given?.id || null, faults: c.faults }));
  const overdue = checkedFindings.filter((c) => c.overdue).map((c) => c.row || { id: c.given?.id });

  const from = cycleFrom ? instant(cycleFrom) : null;
  const to = cycleTo ? instant(cycleTo) : null;
  const inCycle = goodAudits.filter((a) => {
    if (a.carriedOut === null) return false;
    const t = Date.parse(a.carriedOut);
    if (from !== null && t < from) return false;
    if (to !== null && t > to) return false;
    return true;
  });
  const coveredClauses = new Set(inCycle.flatMap((a) => a.clauses));
  const uncovered = standardClauses.map(String).filter((c) => !coveredClauses.has(c));

  const notCarriedOut = goodAudits.filter((a) => a.state === "planned" && a.plannedFor !== null && Date.parse(a.plannedFor) < at);

  return {
    ok: badAudits.length === 0 && badFindings.length === 0 && uncovered.length === 0 && overdue.length === 0,
    audits: goodAudits,
    findings: goodFindings,
    rejectedAudits: badAudits,
    rejectedFindings: badFindings,
    overdue,
    uncovered,
    notCarriedOut,
    coverage: standardClauses.length ? Math.round((coveredClauses.size / standardClauses.length) * 100) : null,
    say: [
      badAudits.length ? `${badAudits.length} audit record(s) are not admissible as written.` : null,
      badFindings.length ? `${badFindings.length} finding(s) are not admissible as written.` : null,
      notCarriedOut.length ? `${notCarriedOut.length} audit(s) are past their planned date and still "planned".` : null,
      overdue.length ? `${overdue.length} finding(s) are open past the closure period for their grade.` : null,
      uncovered.length
        ? `${uncovered.length} clause(s) of the standard have not been audited in this cycle: ${uncovered.join(", ")}. The usual gap is the clause that is hardest to audit, and that is the clause a surveillance visit chooses.`
        : standardClauses.length ? "Every clause of the standard has been audited in this cycle." : null,
    ].filter(Boolean).join(" ") || "The audit programme is complete and every finding is properly closed.",
  };
}

export function state() {
  return { grades: GRADES.length, states: AUDIT_STATES.length, closureDays: CLOSURE_DAYS };
}
