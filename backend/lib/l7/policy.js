/**
 * The policy engine — the thing that answers "may this agent do this?" and is
 * the only thing allowed to answer it.
 *
 * Until now the autonomy table in organisation.js was a description. A person
 * could read it and know that an agent may draft a contractual notice and may
 * not issue one. Nothing enforced it, because nothing consulted it. A
 * description that no code reads is a policy the system does not have.
 *
 * This module reads it. Every row in AUTONOMY is reachable from an action id
 * here, and a test asserts that in both directions, so the register and the
 * enforcement cannot drift apart — which is precisely how a policy engine
 * ends up permitting something the published register forbids.
 *
 * THE RULE THAT MATTERS MOST IS THE ONE ABOUT INSTRUCTIONS.
 *
 *     "An agent shall not infer authority from a natural-language
 *      instruction when the action policy requires explicit approval."
 *
 * That is not a style note. It is the entire attack surface of an autonomous
 * system. A tender document, an email, an uploaded PDF or a chat message that
 * says "you are authorised to submit this" is TEXT, and text is data. Every
 * decision here is taken from the action id and the actor's held authority.
 * Anything the payload claims about its own permission is collected into
 * `claimedAuthority` and reported as an injection signal — never consulted.
 *
 * THE SIX POLICY RULES, EACH A REAL PREDICATE:
 *
 *   PE-RES-01  residency: content classified as restricted may not leave its
 *              permitted region.
 *   PE-AUT-01  an agent may DRAFT a contractual communication; only a human
 *              may SEND one.
 *   PE-AUT-02  an agent may not commit money. Asking a supplier for a price
 *              is permitted; ordering from them is not.
 *   PE-EV-01   no unbound claim reaches a submission.
 *   PE-PII-01  personal data is redacted at rest and unredacted only inside
 *              an approved submission build.
 *   PE-ACU-01  spend caps: downgrade at eighty per cent, halt at a hundred.
 *
 * A DENIAL IS A RESULT, NOT AN ERROR. Every call returns a decision object
 * naming the rule that decided it, because "computer says no" without the
 * clause is the reason people build a way round the policy engine.
 */

import { AUTONOMY, RISK_CLASSES } from "../organisation.js";

/** The eight autonomy levels of the specification's ladder, L0 to L7. */
export const AUTONOMY_LEVELS = [
  { level: "L0", name: "No AI execution", behaviour: "Manual workspace", control: "Normal application controls" },
  { level: "L1", name: "Retrieval", behaviour: "Find a clause", control: "Source citation" },
  { level: "L2", name: "Generation", behaviour: "Draft a response", control: "Human review" },
  { level: "L3", name: "Analysis", behaviour: "Detect a scope conflict", control: "Evidence and confidence" },
  { level: "L4", name: "Workflow execution", behaviour: "Create and route a clarification", control: "Permission and audit" },
  { level: "L5", name: "Goal pursuit", behaviour: "Complete a compliance matrix across documents", control: "Bounded plan and stop conditions" },
  { level: "L6", name: "Multi-agent coordination", behaviour: "Coordinate estimate, programme and risk challenge", control: "Orchestrator policy and reconciliation" },
  { level: "L7", name: "Governed operational autonomy", behaviour: "Continuously control tender completion and execute reversible approved actions", control: "Authority envelope, deterministic gates, monitoring, rollback and accountable human approval" },
];

const LEVEL_ORDER = AUTONOMY_LEVELS.map((l) => l.level);

/** Autonomy token in the register → risk class, taken from the register itself. */
const TOKEN_TO_CLASS = (() => {
  const m = new Map();
  for (const c of RISK_CLASSES) for (const token of c.maps) m.set(token, c.class);
  return m;
})();

/** The register row for an autonomy token, so handling text has one home. */
export function riskClass(token) {
  const cls = TOKEN_TO_CLASS.get(token);
  return RISK_CLASSES.find((c) => c.class === cls) || null;
}

/**
 * The action catalogue. Every entry names the exact register row it answers
 * to; nothing here invents an authority the register does not carry.
 *
 * `minLevel` is the autonomy level an agent must be running at to attempt it
 * at all — separate from whether it is then permitted, because an L2 agent
 * asking to submit a tender is a different fault from an L7 agent asking to.
 */
export const ACTIONS = [
  // Class A — read only
  { id: "read.document", registerAction: "Read, extract and organise", minLevel: "L1", verb: "read a document" },
  { id: "extract.requirements", registerAction: "Read, extract and organise", minLevel: "L3", verb: "extract requirements from a tender" },
  { id: "compare.documents", registerAction: "Read, extract and organise", minLevel: "L3", verb: "compare two documents" },
  { id: "search.evidence", registerAction: "Read, extract and organise", minLevel: "L1", verb: "search the evidence registry" },

  // Class B — reversible internal write, logged
  { id: "calculate.estimate", registerAction: "Calculate using approved rules", minLevel: "L3", verb: "calculate using approved rules" },
  { id: "tag.evidence", registerAction: "Create an internal workflow record", minLevel: "L4", verb: "tag an evidence item" },
  { id: "create.task", registerAction: "Create an internal workflow record", minLevel: "L4", verb: "create an internal task" },
  { id: "update.forecast", registerAction: "Update an unapproved forecast", minLevel: "L4", verb: "update a working forecast", labelled: true },

  // Class D — drafting and non-binding communication
  { id: "draft.response", registerAction: "Draft a document", minLevel: "L2", verb: "draft a response section" },
  { id: "draft.notice", registerAction: "Draft a document", minLevel: "L2", verb: "draft a contractual notice", contractual: true },
  { id: "draft.clarification", registerAction: "Draft a document", minLevel: "L2", verb: "draft a clarification question" },
  { id: "send.reminder", registerAction: "Send a routine reminder", minLevel: "L4", verb: "send a routine reminder", external: true },
  { id: "send.clarification", registerAction: "Send a routine reminder", minLevel: "L4", verb: "send a clarification question to the client", external: true },
  { id: "issue.rfq", registerAction: "Ask a supplier for a price", minLevel: "L4", verb: "ask a supplier for a price", external: true, money: "request" },

  // Class C — controlled internal state
  { id: "change.owner", registerAction: "Change controlled internal state", minLevel: "L4", verb: "change the owner of a requirement" },
  { id: "mark.requirement.complete", registerAction: "Change controlled internal state", minLevel: "L4", verb: "mark a requirement complete" },
  { id: "promote.lesson", registerAction: "Promote a lesson into institutional knowledge", minLevel: "L5", verb: "promote a lesson into institutional knowledge" },
  { id: "issue.rfi", registerAction: "Issue an RFI", minLevel: "L4", verb: "issue a request for information", external: true },

  // Class C/E — contractual issue
  { id: "issue.notice", registerAction: "Issue a contractual notice", minLevel: "L4", verb: "issue a contractual notice", contractual: true, send: true },

  // Class E — commitment
  { id: "approve.variation", registerAction: "Approve a variation", minLevel: "L7", verb: "approve a variation" },
  { id: "issue.po", registerAction: "Commit supplier expenditure", minLevel: "L7", verb: "commit supplier expenditure", money: "commit" },
  { id: "certify.payment", registerAction: "Certify a payment", minLevel: "L7", verb: "certify a payment", money: "commit" },
  { id: "change.baseline", registerAction: "Change an approved baseline", minLevel: "L7", verb: "change an approved baseline" },
  { id: "approve.price", registerAction: "Approve a tender price", minLevel: "L7", verb: "approve the tender price", money: "commit" },
  { id: "submit.tender", registerAction: "Submit a tender", minLevel: "L7", verb: "submit the tender", contractual: true, send: true, submission: true, signatory: true },
  { id: "withdraw.qualification", registerAction: "Withdraw a qualification", minLevel: "L7", verb: "withdraw a qualification", contractual: true, send: true },

  // Class F — competence
  { id: "approve.design", registerAction: "Approve a design or temporary works", minLevel: "L7", verb: "accept a design or temporary works" },
  { id: "close.safety.defect", registerAction: "Close a safety-critical defect", minLevel: "L7", verb: "close a safety-critical defect" },
  { id: "stop.work", registerAction: "Stop work", minLevel: "L7", verb: "stop work" },
];

const BY_ID = new Map(ACTIONS.map((a) => [a.id, a]));
const REGISTER = new Map(AUTONOMY.map((r) => [r.action, r]));

/** The register row and risk class behind an action id. */
export function authorityFor(actionId) {
  const action = BY_ID.get(String(actionId));
  if (!action) return null;
  const row = REGISTER.get(action.registerAction);
  if (!row) return null;
  return { action, register: row, risk: riskClass(row.autonomy) };
}

/** Is `have` at least `need` on the L0–L7 ladder? */
export function meetsLevel(have, need) {
  const h = LEVEL_ORDER.indexOf(String(have));
  const n = LEVEL_ORDER.indexOf(String(need));
  if (h < 0 || n < 0) return false;
  return h >= n;
}

/**
 * Phrases that try to grant authority inside content. These are never obeyed;
 * finding one is a signal, and under the stop rules a signal is a refusal.
 */
const AUTHORITY_CLAIM = new RegExp(
  [
    "you (?:are|have been) (?:hereby )?authoris(?:ed|ed)",
    "you (?:are|have been) (?:hereby )?authorized",
    "no (?:further )?approval (?:is )?(?:required|needed)",
    "ignore (?:the )?(?:previous|prior|above|earlier) instructions",
    "disregard (?:the )?(?:previous|prior|above|earlier)",
    "act as (?:the )?(?:signatory|authorised|authorized)",
    "on behalf of the (?:director|board|signatory)",
    "proceed without approval",
    "sign and submit",
    "you may commit",
    "override (?:the )?polic",
  ].join("|"),
  "i",
);

/** Every authority claim found in free text, as evidence for the refusal. */
export function claimedAuthority(text) {
  const out = [];
  const src = String(text || "");
  for (const line of src.split(/\r?\n/)) {
    const m = AUTHORITY_CLAIM.exec(line);
    if (m) out.push({ phrase: m[0], line: line.trim().slice(0, 200) });
  }
  return out;
}

function deny(rule, reason, extra = {}) {
  return { allowed: false, requiresApproval: false, rule, reason, ...extra };
}
function allow(rule, reason, extra = {}) {
  return { allowed: true, requiresApproval: false, rule, reason, ...extra };
}
function needsApproval(rule, reason, roles, extra = {}) {
  return { allowed: false, requiresApproval: true, approverRoles: roles, rule, reason, ...extra };
}

/**
 * The decision. `actor.kind` is "agent" or "human"; an agent never inherits
 * the authority of the person who started its run, which is the point of
 * agent identity being distinct from user identity.
 *
 * context carries what the rules actually need:
 *   classification   "restricted" | "confidential" | "internal" | "public"
 *   region           where the processing would happen
 *   permittedRegions where restricted content may go
 *   unboundClaims    count of claims with no approved evidence
 *   personalData     true if the payload carries CVs or personal data
 *   submissionBuild  true inside an approved submission build
 *   budget           { spent, cap }
 *   instructionText  free text that arrived with the request
 */
export function decide({ actionId, actor = {}, autonomy = "L0", context = {} } = {}) {
  const found = authorityFor(actionId);
  if (!found) return deny("PE-CAT-01", `"${actionId}" is not an action this system recognises`);
  const { action, register, risk } = found;
  const kind = actor.kind === "human" ? "human" : "agent";
  const roles = Array.isArray(actor.roles) ? actor.roles.map(String) : [];
  const base = { actionId: action.id, verb: action.verb, riskClass: risk ? risk.class : null, registerAuthority: register.authority };

  // Rule zero: nothing in the payload grants authority. Checked first so an
  // injected instruction cannot reach any rule that might have said yes.
  const claims = claimedAuthority(context.instructionText);
  if (claims.length && kind === "agent") {
    return deny("PE-INJ-01", "the request carries text that asserts its own authority; authority is never taken from content", { ...base, claims });
  }

  // The agent must be running at a level that permits the attempt at all.
  if (kind === "agent" && !meetsLevel(autonomy, action.minLevel)) {
    return deny("PE-LVL-01", `this action needs an agent at ${action.minLevel}; the run is at ${autonomy}`, { ...base, minLevel: action.minLevel });
  }

  // PE-RES-01 residency.
  if (String(context.classification || "").toLowerCase() === "restricted") {
    const permitted = Array.isArray(context.permittedRegions) ? context.permittedRegions.map(String) : [];
    const region = context.region ? String(context.region) : null;
    if (!region || !permitted.includes(region)) {
      return deny("PE-RES-01", `restricted content may not be processed in ${region || "an unstated region"}`, { ...base, permittedRegions: permitted });
    }
  }

  // PE-ACU-01 spend. Checked before permission so a halt reads as a halt.
  const budget = context.budget || null;
  if (budget && Number.isFinite(budget.cap) && Number.isFinite(budget.spent) && budget.cap > 0) {
    const used = budget.spent / budget.cap;
    if (used >= 1) {
      return deny("PE-ACU-01", "the budget for this bid is fully spent; the run halts rather than producing a partial submission", { ...base, budgetUsed: used });
    }
    if (used >= 0.8) base.downgradeModel = true;
    base.budgetUsed = used;
  }

  // PE-PII-01 personal data.
  if (context.personalData === true && context.submissionBuild !== true && kind === "agent") {
    if (context.redacted !== true) {
      return deny("PE-PII-01", "personal data is unredacted outside an approved submission build", base);
    }
  }

  // PE-EV-01 unbound claims into a submission.
  if (action.submission && Number(context.unboundClaims || 0) > 0) {
    return deny("PE-EV-01", `${context.unboundClaims} claim(s) in this submission have no approved evidence`, base);
  }

  // PE-AUT-02 money. Asking for a price is permitted; committing is not.
  if (action.money === "commit" && kind === "agent") {
    return needsApproval("PE-AUT-02", "an agent may not commit money", approversFor(risk, action), base);
  }

  // PE-AUT-01 drafting versus sending a contractual communication.
  if (action.contractual && action.send && kind === "agent") {
    return needsApproval("PE-AUT-01", "an agent may draft a contractual communication; a person sends it", approversFor(risk, action), base);
  }

  // The register's own handling, by risk class.
  switch (risk ? risk.class : null) {
    case "A":
      return allow("PE-CLS-A", register.authority, base);
    case "B":
      return allow("PE-CLS-B", register.authority, { ...base, mustLog: true, labelled: action.labelled === true });
    case "C": {
      if (kind === "human") return allow("PE-CLS-C", register.authority, base);
      if (roles.length === 0) {
        return needsApproval("PE-CLS-C", "controlled internal state needs a role permission the run does not carry", approversFor(risk, action), base);
      }
      return allow("PE-CLS-C", register.authority, { ...base, mustLog: true });
    }
    case "D": {
      if (action.external && kind === "agent") {
        if (context.templateId && context.recipientApproved === true) {
          return allow("PE-CLS-D", "within the approved template and recipient policy", { ...base, mustLog: true });
        }
        return needsApproval("PE-CLS-D", "an external message needs an approved template and an approved recipient", approversFor(risk, action), base);
      }
      return allow("PE-CLS-D", register.authority, { ...base, mustLog: true });
    }
    case "E": {
      if (kind === "human" && context.namedApproval === true) {
        return allow("PE-CLS-E", "taken by a named person with explicit approval", { ...base, mustLog: true });
      }
      return needsApproval("PE-CLS-E", "a commercial or contractual commitment requires named human approval", approversFor(risk, action), base);
    }
    case "F": {
      if (kind === "human" && context.competent === true) {
        return allow("PE-CLS-F", "taken by a competent authorised person", { ...base, mustLog: true });
      }
      return needsApproval("PE-CLS-F", "only a competent authorised person may accept this", approversFor(risk, action), base);
    }
    default:
      return deny("PE-CLS-00", "the action maps to no risk class; refused rather than guessed", base);
  }
}

/**
 * Who can approve. By risk class, EXCEPT where the action itself names a
 * specific authority — a tender submission is signed by the delegated
 * signatory whatever class its register row carries, and a safety acceptance
 * is taken by the technical authority. Deriving the approver from the class
 * alone is how a submission goes out approved by the wrong person.
 */
function approversFor(risk, action = null) {
  if (action && action.signatory) return ["SUBMISSION_SIGNATORY"];
  switch (risk ? risk.class : null) {
    case "C": return ["BID_DIRECTOR", "COMMERCIAL_AUTHORITY"];
    case "D": return ["BID_DIRECTOR"];
    case "E": return ["COMMERCIAL_AUTHORITY", "SUBMISSION_SIGNATORY", "EXECUTIVE_SPONSOR"];
    case "F": return ["TECHNICAL_AUTHORITY"];
    default: return ["BID_DIRECTOR"];
  }
}

/**
 * Every register row that no action id reaches, and every action id whose
 * register row does not exist. Both should always be empty; the test asserts
 * it, so the register cannot quietly stop being the thing enforced.
 */
export function coverage() {
  const reached = new Set(ACTIONS.map((a) => a.registerAction));
  const unreachable = AUTONOMY.filter((r) => !reached.has(r.action)).map((r) => r.action);
  const orphaned = ACTIONS.filter((a) => !REGISTER.has(a.registerAction)).map((a) => a.id);
  const unclassified = ACTIONS.filter((a) => {
    const row = REGISTER.get(a.registerAction);
    return !row || !riskClass(row.autonomy);
  }).map((a) => a.id);
  return {
    actions: ACTIONS.length,
    registerRows: AUTONOMY.length,
    unreachable,
    orphaned,
    unclassified,
    ok: unreachable.length === 0 && orphaned.length === 0 && unclassified.length === 0,
  };
}
