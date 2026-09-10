/**
 * The assurance and red-team engine — the rule that the thing which wrote the
 * answer does not get to mark it.
 *
 *     "The same agent run that authored content shall not provide the final
 *      automated assurance result."
 *
 * This is not bureaucracy. A model asked to check its own output agrees with
 * itself, because the same context, the same prompt lineage and the same
 * reasoning produced both. It will find typography and miss the assumption
 * that runs through the whole section, for the same reason a person cannot
 * proofread their own writing: they read what they meant.
 *
 * So independence here is CHECKED, not requested. A review whose run is the
 * author's run, or whose prompt lineage is the author's lineage, is refused
 * as an assurance result — it may still be useful, it is simply not
 * assurance, and calling it assurance is how a bid goes out having been
 * "independently reviewed" by itself.
 *
 * For a high-risk lens the bar is higher again: a different model route, or a
 * deterministic validator. The four reconciliations already in this codebase
 * are deterministic validators, and they are the strongest form of this — a
 * function has no prompt lineage to share.
 *
 * SEVERITY DECIDES WHAT HAPPENS, NOT WHO SHOUTS LOUDEST. Critical is a hard
 * block. High blocks unless somebody with authority records a disposition —
 * a decision, with a name on it, not a shrug. Medium requires review. Low may
 * proceed WITH A RECORDED DISPOSITION, which is the part usually skipped: an
 * unrecorded low finding is a finding nobody can show was considered.
 */

/** The nine review lenses. */
export const LENSES = [
  { id: "compliance", name: "Compliance", question: "Did the response answer every requested element and attach the required evidence?", highRisk: true },
  { id: "evaluator", name: "Evaluator", question: "Can a scorer find the answer and award marks without inference?", highRisk: false },
  { id: "commercial", name: "Commercial", question: "Do commitments create unpriced scope or conflict with qualifications?", highRisk: true },
  { id: "technical", name: "Technical", question: "Is the method feasible, coordinated and consistent with design maturity?", highRisk: true },
  { id: "programme", name: "Programme", question: "Can the sequence achieve milestones using the stated resources and access?", highRisk: false },
  { id: "contract", name: "Contract", question: "Does the wording concede a departure, create a warranty or waive a right?", highRisk: true },
  { id: "evidence", name: "Evidence", question: "Are claims current, valid, permitted and traceable?", highRisk: true },
  { id: "adversarial", name: "Adversarial", question: "What would a competitor, client reviewer or claims specialist attack?", highRisk: true },
  { id: "executive", name: "Executive", question: "Is the risk-adjusted return within authority and appetite?", highRisk: false },
];

const LENS_BY_ID = new Map(LENSES.map((l) => [l.id, l]));

/** The four severities and what each does to a submission. */
export const SEVERITIES = [
  { id: "CRITICAL", rank: 4, definition: "Likely disqualification, unlawful content, unapproved price or material binding exposure", effect: "hard block", dispositionAllowed: false },
  { id: "HIGH", rank: 3, definition: "Material score, margin, delivery or contractual risk", effect: "block unless authorised disposition", dispositionAllowed: true, dispositionRoles: ["BID_DIRECTOR", "COMMERCIAL_AUTHORITY", "EXECUTIVE_SPONSOR"] },
  { id: "MEDIUM", rank: 2, definition: "Material quality weakness or manageable inconsistency", effect: "review required", dispositionAllowed: true, dispositionRoles: ["BID_DIRECTOR", "TECHNICAL_AUTHORITY", "COMMERCIAL_AUTHORITY", "EXECUTIVE_SPONSOR"] },
  { id: "LOW", rank: 1, definition: "Clarity, presentation or minor completeness improvement", effect: "may proceed with a recorded disposition", dispositionAllowed: true, dispositionRoles: null },
];

const SEV_BY_ID = new Map(SEVERITIES.map((s) => [s.id, s]));

/** A finding, with every field the gates and the manifest need. */
export function finding(raw = {}) {
  const sev = SEV_BY_ID.get(String(raw.severity || "").toUpperCase());
  const lens = LENS_BY_ID.get(String(raw.lens || "").toLowerCase());
  return {
    id: String(raw.id || ""),
    lens: lens ? lens.id : null,
    severity: sev ? sev.id : null,
    rank: sev ? sev.rank : 0,
    title: String(raw.title || "").trim(),
    detail: raw.detail ? String(raw.detail) : null,
    where: raw.where ? String(raw.where) : null,
    status: ["OPEN", "CLOSED", "DISPOSED"].includes(raw.status) ? raw.status : "OPEN",
    disposition: raw.disposition
      ? {
          by: raw.disposition.by ? String(raw.disposition.by) : null,
          role: raw.disposition.role ? String(raw.disposition.role) : null,
          reason: raw.disposition.reason ? String(raw.disposition.reason) : null,
          at: raw.disposition.at ? String(raw.disposition.at) : null,
        }
      : null,
    raisedBy: raw.raisedBy ? String(raw.raisedBy) : null,
    runId: raw.runId ? String(raw.runId) : null,
  };
}

/**
 * Is this review independent of the thing it is reviewing? Refuses rather
 * than scores, because a partially independent review is not one.
 */
export function checkIndependence({ author = {}, review = {}, lens = null } = {}) {
  const faults = [];
  const l = LENS_BY_ID.get(String(lens || "").toLowerCase());

  if (!review.runId) faults.push("the review names no run");
  if (!author.runId) faults.push("the authoring run is not identified, so independence cannot be shown");
  if (review.runId && author.runId && review.runId === author.runId) {
    faults.push("SAME RUN — the thing that wrote it is marking it");
  }
  if (review.promptLineage && author.promptLineage && review.promptLineage === author.promptLineage) {
    faults.push("same prompt lineage — the review inherits the assumptions it should be attacking");
  }
  if (!review.promptLineage) faults.push("the review does not state its prompt lineage");
  if (review.contextSelection && author.contextSelection && review.contextSelection === author.contextSelection) {
    faults.push("the same context was selected, so the review cannot see what the author did not");
  }
  if (l && l.highRisk) {
    const differentRoute = review.model && author.model && review.model !== author.model;
    const deterministic = review.deterministicValidator === true;
    if (!differentRoute && !deterministic) {
      faults.push(`${l.name} is a high-risk lens: it needs a different model route or a deterministic validator, and has neither`);
    }
  }
  return {
    ok: faults.length === 0,
    lens: l ? l.id : null,
    highRisk: l ? l.highRisk : null,
    faults,
    say: faults.length === 0
      ? "independent"
      : `this is not an assurance result: ${faults[0]}`,
  };
}

/** A disposition is only a disposition when somebody who could give it did. */
export function checkDisposition(f) {
  const item = finding(f);
  const sev = SEV_BY_ID.get(item.severity);
  if (!sev) return { ok: false, say: "a finding with no severity cannot be disposed of; classify it first" };
  if (item.status !== "DISPOSED") return { ok: true, say: `${item.severity} finding, ${item.status.toLowerCase()}` };
  if (!sev.dispositionAllowed) return { ok: false, say: `a ${item.severity} finding cannot be disposed of at all — it is a hard block` };
  const d = item.disposition;
  if (!d || !d.by) return { ok: false, say: "disposed of by nobody" };
  if (!d.reason) return { ok: false, say: "disposed of with no reason recorded" };
  if (sev.dispositionRoles && !sev.dispositionRoles.includes(String(d.role))) {
    return { ok: false, say: `${d.role || "an unstated role"} may not dispose of a ${item.severity} finding` };
  }
  return { ok: true, say: `disposed of by ${d.by} (${d.role || "no role"}): ${d.reason}` };
}

/**
 * The state of a review across every lens. `unrun` is the important field:
 * a lens nobody ran is not a lens that passed, and a summary that counts only
 * findings makes an unrun review look like a clean one.
 */
export function review({ findings = [], lensesRun = [], independence = {} } = {}) {
  const items = findings.map(finding);
  const unclassified = items.filter((f) => !f.severity || !f.lens);
  const open = items.filter((f) => f.status === "OPEN");
  const disposed = items.filter((f) => f.status === "DISPOSED");
  const badDispositions = disposed.map((f) => ({ id: f.id, ...checkDisposition(f) })).filter((d) => !d.ok);

  const ran = new Set(lensesRun.map((x) => String(x).toLowerCase()));
  const unrun = LENSES.filter((l) => !ran.has(l.id)).map((l) => l.id);
  const notIndependent = [];
  for (const l of lensesRun) {
    const id = String(l).toLowerCase();
    const check = independence[id];
    if (!check) { notIndependent.push({ lens: id, say: "independence was never checked for this lens" }); continue; }
    if (!check.ok) notIndependent.push({ lens: id, say: check.say });
  }

  const bySeverity = {};
  for (const s of SEVERITIES) bySeverity[s.id] = open.filter((f) => f.severity === s.id).length;

  const criticalOpen = open.filter((f) => f.severity === "CRITICAL");
  const highOpen = open.filter((f) => f.severity === "HIGH");

  return {
    total: items.length,
    open: open.length,
    bySeverity,
    unclassified: unclassified.map((f) => f.id),
    badDispositions,
    unrun,
    notIndependent,
    criticalOpen: criticalOpen.map((f) => f.id),
    highOpen: highOpen.map((f) => f.id),
    // A submission may proceed only when all four are true.
    ok:
      criticalOpen.length === 0 &&
      highOpen.length === 0 &&
      unclassified.length === 0 &&
      badDispositions.length === 0 &&
      unrun.length === 0 &&
      notIndependent.length === 0,
    say: criticalOpen.length
      ? `${criticalOpen.length} critical finding(s) open — hard block`
      : highOpen.length
        ? `${highOpen.length} high finding(s) open without an authorised disposition`
        : unrun.length
          ? `${unrun.length} review lens(es) were never run: ${unrun.join(", ")}`
          : notIndependent.length
            ? `${notIndependent.length} lens(es) were not independently reviewed`
            : unclassified.length
              ? `${unclassified.length} finding(s) carry no severity or no lens`
              : badDispositions.length
                ? badDispositions[0].say
                : "the review is complete, independent and clear",
  };
}

/** The facts the G3 and G5 gates read. */
export function gateFacts(findings = []) {
  return { findings: findings.map(finding) };
}
