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
 * The PQQ — the evidence-collection stage. Sent to a supplier from the
 * Control Desk; completed on a tokenised public form with document
 * uploads. Each section maps to one scorecard criterion, so what the
 * supplier returns is exactly what the assessor (and Agent 7) scores.
 * Field types: text · textarea · number · select · declaration (tick).
 */
export const PQQ_SECTIONS = [
  { criterion: "financial", title: "Financial standing", fields: [
    { id: "fin_year1", label: "Most recent full accounting year (e.g. 2024/25)", type: "text", required: true },
    { id: "fin_turnover1", label: "Turnover that year (£)", type: "number", required: true },
    { id: "fin_year2", label: "Previous year", type: "text" },
    { id: "fin_turnover2", label: "Turnover that year (£)", type: "number" },
    { id: "fin_insolvency", label: "Any CCJs, insolvency events, or winding-up proceedings in the last 5 years?", type: "select", options: ["No", "Yes — details below"], required: true },
    { id: "fin_insolvency_details", label: "If yes, give details", type: "textarea" },
  ]},
  { criterion: "references", title: "Project references & capacity", fields: [
    { id: "ref1", label: "Reference 1 — project, client, value, and a contact we may approach", type: "textarea", required: true },
    { id: "ref2", label: "Reference 2 — project, client, value, and a contact we may approach", type: "textarea" },
    { id: "capacity", label: "Current workload vs capacity — what could you mobilise for us, and when?", type: "textarea", required: true },
  ]},
  { criterion: "hse", title: "Health, safety & CDM", fields: [
    { id: "hse_riddor", label: "RIDDOR-reportable incidents in the last 3 years (number)", type: "number", required: true },
    { id: "hse_ssip", label: "SSIP accreditation held (scheme and expiry), e.g. CHAS, SafeContractor, Acclaim", type: "text", required: true },
    { id: "hse_cdm", label: "How you discharge your CDM 2015 duties as a contractor", type: "textarea", required: true },
  ]},
  { criterion: "insurance", title: "Insurance", fields: [
    { id: "ins_el", label: "Employers' liability — insurer, sum insured, expiry", type: "text", required: true },
    { id: "ins_pl", label: "Public liability — insurer, sum insured, expiry", type: "text", required: true },
    { id: "ins_pi", label: "Professional indemnity — insurer, sum insured, expiry (if held)", type: "text" },
    { id: "ins_car", label: "Contractors' all-risks — insurer, sum insured, expiry (if held)", type: "text" },
  ]},
  { criterion: "quality", title: "Quality & environment", fields: [
    { id: "q_iso", label: "ISO 9001 / 14001 or documented equivalent (certificate numbers and expiry)", type: "text", required: true },
    { id: "q_ncr", label: "How defects and non-conformances are recorded and closed", type: "textarea" },
  ]},
  { criterion: "ethics", title: "Modern slavery, labour & ethics", fields: [
    { id: "eth_ms", label: "Do you have a modern slavery statement or policy?", type: "select", options: ["Yes — uploaded/available", "No"], required: true },
    { id: "eth_rtw", label: "How right-to-work is verified for everyone you deploy (including agency labour)", type: "textarea", required: true },
    { id: "eth_accom", label: "If you house workers: accommodation standards applied", type: "textarea" },
  ]},
  { criterion: "continuity", title: "Business continuity", fields: [
    { id: "bc_plan", label: "Continuity and emergency response arrangements — key-person, equipment and supply failure", type: "textarea", required: true },
  ]},
  { criterion: "cyber", title: "Cyber & data handling", fields: [
    { id: "cy_ce", label: "Cyber Essentials or equivalent held?", type: "select", options: ["Yes — certified", "In progress", "No", "Not applicable — no connected systems"], required: true },
    { id: "cy_data", label: "How client data and site information are handled and protected", type: "textarea" },
  ]},
  { criterion: "controls", title: "ETABLIX working requirements — declarations", fields: [
    { id: "dec_reporting", label: "We accept ETABLIX's reporting cadence (daily/weekly/monthly as applicable to the package)", type: "declaration", required: true },
    { id: "dec_evm", label: "We accept payment against certified Earned Value with evidence — never bare invoices", type: "declaration", required: true },
    { id: "dec_change", label: "We accept the documented change process — no work beyond instructed scope", type: "declaration", required: true },
    { id: "dec_evidence", label: "We will provide inspection, delivery and completion evidence in the format requested", type: "declaration", required: true },
  ]},
  { criterion: "demob", title: "Demobilisation & reinstatement", fields: [
    { id: "demob_method", label: "Your method for complete removal, off-hire, waste and reinstatement at the end of an engagement", type: "textarea", required: true },
  ]},
  { criterion: "legal", title: "Legal, tax & licensing", fields: [
    { id: "leg_cis", label: "CIS registration status (and gross payment status if held)", type: "text", required: true },
    { id: "leg_vat", label: "VAT registration number", type: "text", required: true },
    { id: "leg_licences", label: "Statutory licences held (waste carrier, operator licence, etc.)", type: "text" },
    { id: "leg_ownership", label: "Ultimate ownership of the company (individuals or parent company)", type: "text", required: true },
  ]},
  { criterion: "subtier", title: "Your own supply chain", fields: [
    { id: "st_deps", label: "Key sub-tier dependencies for this capability (suppliers, materials, lead times)", type: "textarea", required: true },
    { id: "st_dual", label: "Dual-sourcing or fallback for critical items?", type: "select", options: ["Yes", "Partially", "No"], required: true },
  ]},
];

export const PQQ_DOCUMENTS_CHECKLIST = [
  "Insurance certificates (EL, PL, and PI/CAR where held)",
  "SSIP / accreditation certificates",
  "Most recent filed accounts (or accountant's confirmation of turnover)",
  "Health & safety policy",
  "Modern slavery statement (where held)",
  "Example RAMS for comparable work",
];

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
