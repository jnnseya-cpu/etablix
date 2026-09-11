/**
 * VERYX write validation — what a risk has to be before it is allowed in.
 *
 * The risk register was read-only: seeded rows, sorted by a score nothing
 * checked. Opening it to writes from the internal portal and from the
 * Platform API means the same two questions as everywhere else in this
 * system — what is missing, and what is impossible — and the second is the
 * one worth refusing for.
 *
 *   · A SCORE THAT IS NOT THE PRODUCT OF ITS OWN PROBABILITY AND IMPACT.
 *     Every register sorts on score and every review meeting works down the
 *     list. A score typed in by hand drifts from the assessment behind it,
 *     and the row then sits in the wrong place in the only ordering anybody
 *     uses. So the score is COMPUTED here rather than accepted, and a
 *     submitted score that disagrees is refused rather than silently
 *     overwritten — because the disagreement means one of the two numbers is
 *     wrong and neither this code nor the sorter can tell which.
 *   · A RISK CLOSED OR MITIGATED WITH NO MITIGATION WRITTEN DOWN. The same
 *     defect as a non-conformance closed by changing a dropdown: the risk
 *     leaves the register and the exposure does not.
 *   · A HIGH-SCORING RISK WITH NO OWNER. An unowned risk at 20 is a risk
 *     that was assessed and then left, and the assessment makes it worse:
 *     somebody looked at it, scored it, and walked away.
 */

import { num } from "./l7/num.js";

export const RISK_CATEGORIES = [
  "procurement", "programme", "commercial", "technical",
  "health_safety", "environmental", "resource", "contractual", "external",
];
export const RISK_STATUS = ["open", "mitigating", "mitigated", "closed", "realised"];

/** 1 to 5 on both axes, so the product is the familiar 1 to 25. */
const SCALE_MAX = 5;

export function validateRisk(raw = {}, { projects = null } = {}) {
  const faults = [];

  const projectId = String(raw.projectId || "").trim();
  if (!projectId) faults.push("no project");
  else if (projects && !projects.some((p) => p.id === projectId || p.code === projectId)) {
    faults.push(`no project matches "${projectId}" — a risk against a project that does not exist is a risk nobody will ever review`);
  }

  const title = String(raw.title || "").trim();
  if (!title) faults.push("no title");
  else if (title.length < 12) faults.push("the title is too short to identify the risk at a review six weeks from now");

  const category = String(raw.category || "").trim();
  if (!RISK_CATEGORIES.includes(category)) {
    faults.push(`"${category}" is not one of ${RISK_CATEGORIES.join(", ")}`);
  }
  const status = String(raw.status || "").trim();
  if (!RISK_STATUS.includes(status)) faults.push(`"${status}" is not one of ${RISK_STATUS.join(", ")}`);

  const probability = num(raw.probability);
  const impact = num(raw.impact);
  for (const [name, v] of [["probability", probability], ["impact", impact]]) {
    if (v === null) faults.push(`${name} is not a number`);
    else if (!Number.isInteger(v) || v < 1 || v > SCALE_MAX) {
      faults.push(`${name} of ${v} is outside 1 to ${SCALE_MAX}`);
    }
  }

  const computed = probability !== null && impact !== null ? probability * impact : null;
  const claimed = num(raw.score);
  // Refused, not corrected. If the claimed score and the assessment disagree,
  // one of them is wrong and nothing here can tell which — silently taking
  // the product would discard somebody's judgement, and silently taking the
  // claim would leave the register sorted on a number with no basis.
  if (claimed !== null && computed !== null && claimed !== computed) {
    faults.push(`a score of ${claimed} against a probability of ${probability} and an impact of ${impact}, which multiply to ${computed}. The register is sorted on score and every review works down that order, so the two have to agree.`);
  }

  const mitigation = String(raw.mitigation || "").trim();
  if ((status === "mitigated" || status === "closed") && !mitigation) {
    faults.push(`marked ${status} with no mitigation recorded. The risk leaves the register and the exposure does not.`);
  }
  if (status === "mitigating" && !mitigation) {
    faults.push("marked as being mitigated with nothing written down as the mitigation");
  }

  const owner = String(raw.owner || "").trim();
  if (!owner && computed !== null && computed >= 12) {
    faults.push(`scored ${computed} with no owner. An unowned risk at that score is one somebody assessed and then left.`);
  }
  if (status === "realised" && !String(raw.realisedImpact || "").trim()) {
    faults.push("marked as realised with nothing recording what actually happened. A realised risk is the only evidence the register ever produces about whether its scoring was any good.");
  }

  return {
    ok: faults.length === 0,
    faults,
    record: faults.length === 0 ? {
      projectId,
      ref: raw.ref ? String(raw.ref) : null,
      title,
      category,
      probability,
      impact,
      score: computed,
      status,
      mitigation: mitigation || null,
      owner: owner || null,
      realisedImpact: raw.realisedImpact ? String(raw.realisedImpact).trim() : null,
    } : null,
  };
}

export const VALIDATORS = { risks: validateRisk };
export const REF_FIELDS = { risks: { field: "ref", prefix: "RSK" } };

/* ----------------------------------------------- Platform API scopes */
//
// One catalogue, used by three things: the minting route validates against
// it, the middleware resolves a required scope from it, and /openapi.json
// publishes it. A scope string that exists in only one of those places is a
// permission nobody can audit — either a key can do something no documented
// scope covers, or a documented scope grants nothing.
//
// WRITE SCOPES ARE SEPARATE FROM READ SCOPES AND FROM EACH OTHER. The
// register was read-mostly, and the tempting shortcut when opening it was a
// single "write" scope. A key given write for one purpose would then have
// been able to raise risks, move the programme and register a webhook that
// forwards both to a third party.

export const API_SCOPES = [
  { scope: "read:projects", writes: false, does: "list the workspace projects and portfolios" },
  { scope: "read:tasks", writes: false, does: "read schedule activities" },
  { scope: "read:risks", writes: false, does: "read the risk register" },
  { scope: "read:agents", writes: false, does: "list the agents and their ACU cost" },
  { scope: "read:usage", writes: false, does: "read the key's own quota, usage and ACU balance" },
  { scope: "run:agents", writes: true, does: "run an agent — draws down prepaid ACU" },
  { scope: "write:risks", writes: true, does: "raise and revise risks, scored by probability × impact" },
  { scope: "write:tasks", writes: true, does: "create and update schedule activities" },
  { scope: "write:webhooks", writes: true, does: "register an endpoint to be pushed events — carries project data off this system" },
];

export const SCOPE_NAMES = API_SCOPES.map((s) => s.scope);

/** Which of a key's scopes can change something. Shown when minting. */
export function writeScopes(scopes = []) {
  return scopes.filter((s) => API_SCOPES.find((r) => r.scope === s)?.writes);
}
