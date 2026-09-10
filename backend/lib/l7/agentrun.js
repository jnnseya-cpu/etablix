/**
 * The agent run contract — what an autonomous run is allowed to be, and the
 * eight conditions under which it must stop rather than finish.
 *
 * The specification's sentence is the one that matters:
 *
 *     "An agent shall not infer authority from a natural-language
 *      instruction when the action policy requires explicit approval."
 *
 * Which means a run is not a conversation. It is a TYPED OBJECT created
 * before anything happens, naming its goal, the sources it may read, the
 * tools it may call, the budget it may spend, the deadline it works to, the
 * shape of the output it must produce, the confidence below which it must
 * abstain, and the actions that need a person. Anything not in that object is
 * not permitted, and nothing said to the agent afterwards adds to it.
 *
 * THE ENVELOPE IS WHY THIS IS DIFFERENT FROM CALLING A MODEL.
 *
 * A model call returns text. An agent run returns a status, the result, the
 * evidence behind it, the assumptions it had to make, the uncertainties it
 * could not close, the contradictions it found, a calibrated confidence, what
 * it did, what it proposes to do, what it needs approved, and what should
 * happen next. Eleven fields, and nine of them are the ones a person actually
 * needs in order to decide whether to trust the first two.
 *
 * ABSTENTION IS A SUCCESSFUL OUTCOME.
 *
 * This is the hardest thing to build and the whole point. A system that
 * always produces an answer is a system whose answers carry no information:
 * if it cannot say "I could not establish this", then "here is the answer"
 * means nothing. So `abstained` is a first-class status, it is not a failure,
 * and the eight stop rules below are the conditions that produce it.
 *
 * The second of them is the interesting one:
 *
 *     "Two authoritative sources conflict and no precedence rule resolves
 *      them."
 *
 * A specification and a drawing that disagree is the single commonest
 * condition in construction, and picking one is what a model does by default.
 * Under this contract it stops, raises the contradiction, and drafts the
 * clarification. That single behaviour is worth more than any drafting
 * quality, because choosing wrongly is a priced item somebody has to build.
 */

import { claimedAuthority } from "./policy.js";
import { budgetState } from "./acu.js";
import { instant } from "./evidence.js";
import { num } from "./num.js";

/** The five statuses an envelope may carry. */
export const STATUSES = ["completed", "partial", "blocked", "abstained", "failed"];

/** Statuses that mean the run produced something a person may act on. */
export const ACTIONABLE = new Set(["completed", "partial"]);

/** The eight stop-and-abstain conditions, in the order they are checked. */
export const STOP_RULES = [
  { id: "source_unavailable", say: "the required source is missing, corrupt, unreadable or outside the access boundary" },
  { id: "injection_detected", say: "a prompt injection, malicious attachment or unexpected instruction was detected" },
  { id: "conflict_of_interest", say: "a material conflict of interest or a prohibited client condition" },
  { id: "authority_exceeded", say: "the action exceeds financial, contractual, technical or safety authority" },
  { id: "sources_conflict", say: "two authoritative sources conflict and no precedence rule resolves them" },
  { id: "validator_rejected", say: "a deterministic validator rejected the proposed output" },
  { id: "confidence_below_threshold", say: "confidence is below the threshold for this task class" },
  { id: "budget_exhausted", say: "the remaining budget, time or tool allowance cannot complete the run safely" },
];

const RULE_BY_ID = new Map(STOP_RULES.map((r) => [r.id, r]));

/**
 * A typed agent run. Refuses to be created without the fields that make it
 * bounded — a run with no budget, no deadline, no output schema and no
 * confidence threshold is not an agent run, it is a prompt.
 */
export function create(raw = {}) {
  const faults = [];
  const run = {
    id: String(raw.id || ""),
    tenantId: raw.tenantId ? String(raw.tenantId) : null,
    tenderId: raw.tenderId ? String(raw.tenderId) : null,
    agentDefinitionVersion: raw.agentDefinitionVersion ? String(raw.agentDefinitionVersion) : null,
    goal: String(raw.goal || "").trim(),
    inputObjectRefs: Array.isArray(raw.inputObjectRefs) ? raw.inputObjectRefs.map(String) : [],
    allowedToolIds: Array.isArray(raw.allowedToolIds) ? raw.allowedToolIds.map(String) : [],
    authorityPolicyId: raw.authorityPolicyId ? String(raw.authorityPolicyId) : null,
    autonomy: raw.autonomy ? String(raw.autonomy) : null,
    maxCostAcu: num(raw.maxCostAcu),
    deadlineAt: raw.deadlineAt ? String(raw.deadlineAt) : null,
    outputSchemaId: raw.outputSchemaId ? String(raw.outputSchemaId) : null,
    minimumConfidence: num(raw.minimumConfidence),
    requiredOutputs: Array.isArray(raw.requiredOutputs) ? raw.requiredOutputs.map(String) : [],
    approvalRequiredFor: Array.isArray(raw.approvalRequiredFor) ? raw.approvalRequiredFor.map(String) : [],
    status: "created",
    checkpoints: [],
    approvals: [],
    evidenceRefs: [],
    startedAt: null,
    completedAt: null,
    modelRoute: raw.modelRoute ? String(raw.modelRoute) : null,
    traceId: raw.traceId ? String(raw.traceId) : null,
    authorisedBy: raw.authorisedBy ? String(raw.authorisedBy) : null,
  };

  if (!run.id) faults.push("no run id");
  if (!run.goal) faults.push("no goal — a run without one cannot be said to have finished");
  if (!run.agentDefinitionVersion) faults.push("no agent definition version; the run could not be reproduced");
  if (!run.authorityPolicyId) faults.push("no authority policy — the run would decide its own permissions");
  if (!run.autonomy) faults.push("no autonomy level");
  if (run.maxCostAcu === null || run.maxCostAcu <= 0) faults.push("no budget; an unbounded run is not a bounded plan");
  if (!run.deadlineAt) faults.push("no deadline");
  else if (instant(run.deadlineAt) === null) faults.push(`the deadline "${run.deadlineAt}" is not a date`);
  if (!run.outputSchemaId) faults.push("no output schema — nothing could validate what it produced");
  if (run.minimumConfidence === null) faults.push("no minimum confidence, so the run can never be required to abstain");
  if (run.requiredOutputs.length === 0) faults.push("no required outputs, so a partial run would look complete");
  if (run.allowedToolIds.length === 0 && run.inputObjectRefs.length === 0) {
    faults.push("neither tools nor inputs; there is nothing for the run to work on");
  }
  if (!run.authorisedBy) faults.push("nobody authorised this run");

  return { ok: faults.length === 0, faults, run, say: faults.length ? `this is not an agent run: ${faults[0]}` : `run ${run.id}: ${run.goal}` };
}

/** An output envelope with all ten fields, whatever the agent returned. */
export function envelope(raw = {}) {
  return {
    status: STATUSES.includes(raw.status) ? raw.status : "failed",
    result: raw.result === undefined ? null : raw.result,
    evidence: Array.isArray(raw.evidence) ? raw.evidence.map(String) : [],
    assumptions: Array.isArray(raw.assumptions)
      ? raw.assumptions.map((a) => ({ text: String((a && a.text) || a || ""), basis: (a && a.basis) ? String(a.basis) : null }))
      : [],
    uncertainties: Array.isArray(raw.uncertainties)
      ? raw.uncertainties.map((u) => ({ text: String((u && u.text) || u || ""), impact: (u && u.impact) ? String(u.impact) : null }))
      : [],
    contradictions: Array.isArray(raw.contradictions) ? raw.contradictions : [],
    confidence: {
      score: num(raw.confidence && raw.confidence.score),
      method: raw.confidence && raw.confidence.method ? String(raw.confidence.method) : null,
      calibrationBand: raw.confidence && raw.confidence.calibrationBand ? String(raw.confidence.calibrationBand) : null,
    },
    actionsTaken: Array.isArray(raw.actionsTaken) ? raw.actionsTaken : [],
    actionsProposed: Array.isArray(raw.actionsProposed) ? raw.actionsProposed : [],
    approvalsRequired: Array.isArray(raw.approvalsRequired) ? raw.approvalsRequired : [],
    nextTasks: Array.isArray(raw.nextTasks) ? raw.nextTasks : [],
    stoppedBy: raw.stoppedBy ? String(raw.stoppedBy) : null,
    stopReason: raw.stopReason ? String(raw.stopReason) : null,
  };
}

/**
 * The eight stop rules, evaluated against the run's actual state. Returns the
 * FIRST condition that fires, in the order above, because the order is a
 * severity order: an injection is a different emergency from a thin budget,
 * and reporting the thin budget first would bury it.
 */
export function shouldStop({ run = {}, state = {} } = {}) {
  const {
    sources = [],              // { ref, available, readable, withinBoundary }
    instructionText = "",
    attachments = [],          // { name, kind, scanned, safe }
    conflictOfInterest = null,
    prohibitedClientCondition = null,
    requestedActions = [],     // action ids the run wants to take
    authorityDecisions = {},   // actionId → policy decision
    conflicts = [],            // { a, b, precedenceRule }
    validators = [],           // { id, ok, say }
    confidence = null,
    spent = null,
    toolCallsRemaining = null,
    now = null,
  } = state;

  // 1. Sources.
  {
    const bad = sources.filter((s) => s.available === false || s.readable === false || s.withinBoundary === false);
    const missing = (run.inputObjectRefs || []).filter((ref) => !sources.some((s) => String(s.ref) === String(ref)));
    if (bad.length || missing.length) {
      const first = bad[0] ? `${bad[0].ref} is ${bad[0].withinBoundary === false ? "outside the access boundary" : bad[0].readable === false ? "unreadable" : "unavailable"}` : `${missing[0]} was never loaded`;
      return stop("source_unavailable", first, { bad: bad.map((s) => s.ref), missing });
    }
  }

  // 2. Injection. Checked before anything that might act on the content.
  {
    const claims = claimedAuthority(instructionText);
    const unsafe = attachments.filter((a) => a.safe === false || a.scanned === false);
    if (claims.length || unsafe.length) {
      const first = claims.length
        ? `content asserts its own authority: "${claims[0].phrase}"`
        : `attachment ${unsafe[0].name} is ${unsafe[0].scanned === false ? "unscanned" : "unsafe"}`;
      return stop("injection_detected", first, { claims, unsafe: unsafe.map((a) => a.name) });
    }
  }

  // 3. Conflict of interest or a prohibited client condition.
  if (conflictOfInterest) return stop("conflict_of_interest", String(conflictOfInterest));
  if (prohibitedClientCondition) return stop("conflict_of_interest", `prohibited client condition: ${prohibitedClientCondition}`);

  // 4. Authority.
  {
    for (const actionId of requestedActions) {
      const decision = authorityDecisions[actionId];
      if (!decision) return stop("authority_exceeded", `no policy decision was taken for "${actionId}"`, { actionId });
      if (decision.allowed === false) {
        // NOT `rule:` — the policy rule and the stop rule are different
        // things with the same field name, and spreading this over the stop
        // result replaced "authority_exceeded" with "PE-AUT-02". The run
        // still stopped; the reason it gave was the wrong kind of reason.
        return stop("authority_exceeded", `${actionId}: ${decision.reason || "refused"}`, { actionId, policyRule: decision.rule, requiresApproval: decision.requiresApproval === true, approverRoles: decision.approverRoles || [] });
      }
    }
  }

  // 5. Conflicting authoritative sources with no precedence rule. THE ONE.
  {
    const unresolved = conflicts.filter((c) => !c.precedenceRule);
    if (unresolved.length) {
      const c = unresolved[0];
      return stop("sources_conflict", `${c.a} and ${c.b} disagree and no precedence rule resolves them`, {
        conflicts: unresolved,
        // What the run does instead of choosing.
        raise: "contradiction",
        draft: "clarification",
      });
    }
  }

  // 6. A deterministic validator said no.
  {
    const rejected = validators.filter((v) => v.ok === false);
    if (rejected.length) {
      return stop("validator_rejected", `${rejected[0].id}: ${rejected[0].say || "rejected"}`, { validators: rejected.map((v) => v.id) });
    }
  }

  // 7. Confidence.
  {
    const c = num(confidence);
    const floor = num(run.minimumConfidence);
    if (floor !== null) {
      if (c === null) return stop("confidence_below_threshold", "the run produced no confidence figure, which is not the same as a high one");
      if (c < floor) return stop("confidence_below_threshold", `confidence ${c} is below the threshold of ${floor} for this task class`, { confidence: c, floor });
    }
  }

  // 8. Budget, time and tools.
  {
    const b = budgetState(num(spent) === null ? 0 : num(spent), run.maxCostAcu);
    if (b.act === "halt" || b.act === "refuse") return stop("budget_exhausted", b.say, { used: b.used });
    if (toolCallsRemaining !== null && num(toolCallsRemaining) !== null && num(toolCallsRemaining) <= 0) {
      return stop("budget_exhausted", "the tool allowance is spent");
    }
    const deadline = instant(run.deadlineAt);
    const at = now ? instant(now) : Date.now();
    if (deadline !== null && at !== null && at >= deadline) {
      return stop("budget_exhausted", `the run deadline ${run.deadlineAt} has passed`);
    }
  }

  return { stop: false, rule: null, say: "no stop condition applies" };
}

function stop(ruleId, detail, extra = {}) {
  const rule = RULE_BY_ID.get(ruleId);
  return {
    // Spread FIRST, so nothing a caller passes can overwrite the identity of
    // the stop. That was not academic: a `rule` key in extra replaced the
    // stop rule with a policy rule, and the run reported the wrong condition.
    ...extra,
    stop: true,
    rule: ruleId,
    // Abstention is a successful outcome, and a blocked run is a different
    // thing from a failed one: blocked means somebody can unblock it.
    status: ruleId === "source_unavailable" || ruleId === "injection_detected" || ruleId === "conflict_of_interest" ? "blocked" : "abstained",
    say: `${rule ? rule.say : ruleId}: ${detail}`,
    detail,
  };
}

/**
 * Close a run. Produces the envelope, and applies the rule that a run which
 * did not produce its required outputs cannot be called complete however
 * pleased with itself it is.
 */
export function close({ run = {}, produced = [], envelope: env = {}, stopped = null } = {}) {
  const required = (run.requiredOutputs || []).map(String);
  const have = new Set(produced.map(String));
  const missing = required.filter((r) => !have.has(r));

  let status;
  if (stopped && stopped.stop) status = stopped.status;
  else if (missing.length === 0) status = "completed";
  else status = "partial";

  const out = envelope({
    ...env,
    status,
    stoppedBy: stopped && stopped.stop ? stopped.rule : null,
    stopReason: stopped && stopped.stop ? stopped.say : null,
  });

  const faults = [];
  if (ACTIONABLE.has(out.status)) {
    if (out.confidence.score === null) faults.push("an actionable result with no confidence figure");
    if (out.confidence.method === null) faults.push("a confidence figure with no method — a number nobody can calibrate");
    if (out.result === null) faults.push("a completed run with no result");
  }
  if (out.status === "abstained" && !out.stopReason) faults.push("abstained without saying why, which teaches nobody anything");
  // An assumption is only useful with its basis. "We assumed access is
  // available" is a note; "we assumed access is available because the ITT is
  // silent and the site plan shows one gate" is a question somebody can answer.
  for (const a of out.assumptions) if (!a.basis) faults.push(`the assumption "${a.text.slice(0, 60)}" records no basis`);

  return {
    ok: faults.length === 0,
    faults,
    envelope: out,
    missing,
    run: { ...run, status: out.status, completedAt: new Date().toISOString() },
    say: faults.length
      ? `the envelope is not usable: ${faults[0]}`
      : out.status === "completed"
        ? `completed with ${required.length} required output(s)`
        : out.status === "partial"
          ? `partial: ${missing.length} required output(s) missing — ${missing.join(", ")}`
          : `${out.status}: ${out.stopReason || "no reason given"}`,
  };
}

/** A checkpoint, so a long run can be resumed rather than restarted. */
export function checkpoint(run, { at = null, produced = [], spent = null, note = null } = {}) {
  return {
    ...run,
    checkpoints: [
      ...(run.checkpoints || []),
      { at: at || new Date().toISOString(), produced: produced.map(String), spent: num(spent), note: note ? String(note) : null },
    ],
  };
}
