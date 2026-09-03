/**
 * Supplier prequalification — the assessment engine.
 *
 * Twelve weighted criteria scored 0–5 by a named assessor. Four are
 * critical: a zero on financial standing, HSE, insurance or ethical
 * standards fails the assessment outright, whatever the total. The
 * weighted result maps to an outcome and a recommended registration
 * status. Every assessment is stored on the application with scores,
 * notes, assessor and timestamp — the auditable trail a client can ask
 * for. Outcomes surface to the portfolio view over the live platform
 * connection.
 */

export const PREQUAL_CRITERIA = [
  { id: "financial", label: "Financial strength, credit and insolvency indicators", weight: 15, critical: true,
    evidence: "Filed accounts, credit score/report, CCJ and insolvency checks, payment behaviour" },
  { id: "references", label: "Relevant project references and resource capacity", weight: 10, critical: false,
    evidence: "Two comparable project references, org chart, key personnel CVs, current workload vs capacity" },
  { id: "hse", label: "HSE record, competence and CDM arrangements", weight: 15, critical: true,
    evidence: "RIDDOR/AFR history, SSIP or equivalent, competence records, CDM role understanding, RAMS quality" },
  { id: "insurance", label: "Insurance and required limits", weight: 10, critical: true,
    evidence: "EL, PL, PI and (where relevant) CAR certificates at required limits, in date" },
  { id: "quality", label: "Quality and environmental systems", weight: 8, critical: false,
    evidence: "ISO 9001/14001 or documented equivalent, inspection and calibration records, NCR process" },
  { id: "ethics", label: "Modern slavery, labour, accommodation and ethical standards", weight: 10, critical: true,
    evidence: "Modern slavery statement, right-to-work process, labour sourcing, worker accommodation standards where used" },
  { id: "continuity", label: "Business continuity and emergency response", weight: 5, critical: false,
    evidence: "Continuity plan, emergency response arrangements, cover for key personnel and equipment" },
  { id: "cyber", label: "Cybersecurity and data handling (where connected systems are used)", weight: 4, critical: false,
    evidence: "Cyber Essentials or equivalent, data handling practice; score 3 as neutral where no connected systems" },
  { id: "controls", label: "Acceptance of reporting, EVM, evidence and change processes", weight: 8, critical: false,
    evidence: "Written acceptance of ETABLIX reporting cadence, Earned Value measurement, evidence and change control" },
  { id: "demob", label: "Complete demobilisation and reinstatement method", weight: 5, critical: false,
    evidence: "Method statement for removal, off-hire, waste, reinstatement and evidence at end of engagement" },
  { id: "legal", label: "Legal, tax and licensing standing", weight: 6, critical: false,
    evidence: "CIS/VAT registration, statutory licences (waste carrier, operator licence), anti-bribery policy, ownership and sanctions transparency" },
  { id: "subtier", label: "Sub-tier supply chain resilience", weight: 4, critical: false,
    evidence: "Key dependencies and lead times, dual-sourcing on critical items, payment discipline to their own chain" },
];

export const PREQUAL_TOTAL_WEIGHT = PREQUAL_CRITERIA.reduce((a, c) => a + c.weight, 0); // 100

/**
 * Compute the weighted percentage and outcome from {criterionId: 0..5}.
 * Rules: any critical criterion at 0 → fail. Any critical below 2 caps
 * the outcome at "conditional". ≥70% prequalify · 50–69% conditional ·
 * below 50% decline.
 */
export function assessScores(scores = {}) {
  const rows = PREQUAL_CRITERIA.map((c) => {
    const raw = Number(scores[c.id]);
    const score = Number.isInteger(raw) && raw >= 0 && raw <= 5 ? raw : null;
    return { ...c, score };
  });
  const missing = rows.filter((r) => r.score === null).map((r) => r.id);
  if (missing.length) return { ok: false, missing };

  const weightedPct = Math.round(rows.reduce((a, r) => a + (r.score / 5) * r.weight, 0));
  const criticalZero = rows.filter((r) => r.critical && r.score === 0);
  const criticalLow = rows.filter((r) => r.critical && r.score < 2);

  let outcome;
  let reason;
  if (criticalZero.length) {
    outcome = "fail";
    reason = `Critical criterion scored zero: ${criticalZero.map((r) => r.label).join("; ")}.`;
  } else if (weightedPct >= 70 && !criticalLow.length) {
    outcome = "prequalify";
    reason = `Weighted ${weightedPct}% with all critical criteria at 2 or above.`;
  } else if (weightedPct >= 50) {
    outcome = "conditional";
    reason = criticalLow.length
      ? `Weighted ${weightedPct}% but critical criterion below 2: ${criticalLow.map((r) => r.label).join("; ")}. Actions required before award.`
      : `Weighted ${weightedPct}% — actions required before award.`;
  } else {
    outcome = "decline";
    reason = `Weighted ${weightedPct}% — below the 50% threshold.`;
  }

  const recommendedStatus = outcome === "prequalify" ? "prequalified" : outcome === "conditional" ? "under_review" : "declined";
  return { ok: true, weightedPct, outcome, reason, recommendedStatus };
}
