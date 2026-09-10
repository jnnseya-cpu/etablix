/**
 * The gate engine and the bid lifecycle — the difference between a process
 * and a sequence of hopes.
 *
 * Every bid organisation has a stage-gate diagram. Almost none of them have a
 * gate: the diagram is on a slide, the stages are a status field somebody
 * updates, and a bid moves from "priced" to "submitted" because the deadline
 * arrived, not because anything checked. The gate that exists only as a
 * meeting is a gate that is skipped whenever the meeting cannot be convened,
 * which is always the week of the deadline.
 *
 * A gate here is a guard on a transition. It is declarative, it is versioned,
 * and it BLOCKS. If the conditions are not met the state does not change, and
 * the reason is a list of specific unmet requirements rather than a refusal.
 *
 * THE ONE THAT CATCHES PEOPLE IS SEGREGATION.
 *
 * `approver != author` is one line and it is the control that stops the
 * estimator approving their own estimate at eleven at night because the
 * commercial director is on a plane. Systems that record an approval without
 * checking who gave it produce a perfect audit trail of a control that was
 * never applied — worse than no trail, because it is evidence of compliance
 * with something that did not happen.
 *
 * A DECISION IS AN EVENT AND IT IS KEPT. Who, when, on what version of the
 * facts, and what the gate said. A gate that passes and leaves no record is
 * indistinguishable afterwards from a gate that was never run.
 *
 * TWO LADDERS, ONE MACHINE. The lifecycle below is the specification's
 * fourteen states. The governance gates G0 to G8 are the same document's
 * management view of the same journey. They are different granularities, not
 * different processes, and `GOVERNANCE` maps each to the lifecycle transition
 * it guards so the two cannot describe different bids.
 */

/** The bid lifecycle, in order. */
export const STATES = [
  "DISCOVERED",
  "QUALIFIED",
  "DECIDED_PURSUE",
  "PACK_INGESTED",
  "REQUIREMENTS_MAPPED",
  "SCOPE_DECOMPOSED",
  "CONTRACT_POSITIONED",
  "PROGRAMMED",
  "PRICED",
  "PRICE_RELEASED",
  "COMPOSED",
  "CONSISTENT",
  "SUBMITTED",
  "CLARIFYING",
  "BAFO",
  "OUTCOME_RECORDED",
  "BASELINE_HANDED_OVER",
  "CLOSED",
];

/** A bid that stops here is not a failure of the machine. */
export const TERMINAL = new Set(["CLOSED"]);

/** Every permitted move, and the gate that guards it where there is one. */
export const TRANSITIONS = [
  { from: "DISCOVERED", to: "QUALIFIED", gate: null },
  { from: "QUALIFIED", to: "DECIDED_PURSUE", gate: "G0_PURSUE" },
  { from: "QUALIFIED", to: "CLOSED", gate: null, note: "a no-bid is a decision, not a dead end" },
  { from: "DECIDED_PURSUE", to: "PACK_INGESTED", gate: null },
  { from: "PACK_INGESTED", to: "REQUIREMENTS_MAPPED", gate: null },
  { from: "REQUIREMENTS_MAPPED", to: "SCOPE_DECOMPOSED", gate: "G1_COMPLIANCE_BASELINE" },
  { from: "SCOPE_DECOMPOSED", to: "CONTRACT_POSITIONED", gate: "G2_SCOPE_FREEZE" },
  { from: "CONTRACT_POSITIONED", to: "PROGRAMMED", gate: "G3_CONTRACT_POSITION" },
  { from: "PROGRAMMED", to: "PRICED", gate: null },
  { from: "PRICED", to: "PRICE_RELEASED", gate: "G4_PRICE_RELEASE" },
  { from: "PRICE_RELEASED", to: "COMPOSED", gate: null },
  { from: "COMPOSED", to: "CONSISTENT", gate: null },
  { from: "CONSISTENT", to: "SUBMITTED", gate: "G5_SUBMISSION_RELEASE" },
  { from: "SUBMITTED", to: "CLARIFYING", gate: null },
  { from: "SUBMITTED", to: "OUTCOME_RECORDED", gate: null },
  { from: "CLARIFYING", to: "BAFO", gate: null },
  { from: "CLARIFYING", to: "OUTCOME_RECORDED", gate: null },
  { from: "BAFO", to: "OUTCOME_RECORDED", gate: null },
  { from: "OUTCOME_RECORDED", to: "BASELINE_HANDED_OVER", gate: "G6_AWARD" },
  { from: "OUTCOME_RECORDED", to: "CLOSED", gate: null, note: "a loss closes without a handover" },
  { from: "BASELINE_HANDED_OVER", to: "CLOSED", gate: "G7_LESSONS" },
];

/**
 * The gates. `requires` entries are evaluated by the predicates below; each
 * one names the fact it reads, so a failure says what to go and fix.
 */
export const GATES = [
  {
    id: "G0_PURSUE",
    name: "Pursue decision",
    appliesTo: "Bid",
    from: "QUALIFIED",
    to: "DECIDED_PURSUE",
    exitArtefact: "Qualification decision",
    requires: [
      { kind: "fact", fact: "bidScore.decided", is: true, say: "the bid or no-bid score has not been run" },
      { kind: "fact", fact: "bidScore.hardStops", is: 0, say: "a hard-stop factor is unresolved" },
      { kind: "approval", roles: ["BID_DIRECTOR"], quorum: 1, segregation: true },
    ],
  },
  {
    id: "G1_COMPLIANCE_BASELINE",
    name: "Compliance baseline",
    appliesTo: "Bid",
    from: "REQUIREMENTS_MAPPED",
    to: "SCOPE_DECOMPOSED",
    exitArtefact: "Compliance matrix baseline",
    requires: [
      { kind: "all", collection: "requirements", field: "status", is: "MAPPED", say: "a requirement is still unmapped" },
      { kind: "fact", fact: "requirements.unownedMandatory", is: 0, say: "a mandatory requirement has no owner" },
      { kind: "approval", roles: ["BID_DIRECTOR"], quorum: 1, segregation: true },
    ],
  },
  {
    id: "G2_SCOPE_FREEZE",
    name: "Scope freeze",
    appliesTo: "Bid",
    from: "SCOPE_DECOMPOSED",
    to: "CONTRACT_POSITIONED",
    exitArtefact: "Frozen scope graph",
    requires: [
      { kind: "fact", fact: "scope.unallocatedItems", is: 0, say: "a scope item belongs to nobody" },
      { kind: "fact", fact: "scope.openInterfaceGaps", is: 0, say: "an interface is excluded by both sides" },
      { kind: "approval", roles: ["TECHNICAL_AUTHORITY"], quorum: 1, segregation: true },
    ],
  },
  {
    id: "G3_CONTRACT_POSITION",
    name: "Contract position",
    appliesTo: "Bid",
    from: "CONTRACT_POSITIONED",
    to: "PROGRAMMED",
    exitArtefact: "Agreed departures schedule",
    requires: [
      { kind: "fact", fact: "contract.unreviewedClauses", is: 0, say: "a clause has not been reviewed" },
      { kind: "redteam", lens: "contract", severity: "HIGH", say: "an open high-severity contract finding" },
      { kind: "approval", roles: ["LEGAL_REVIEWER", "COMMERCIAL_AUTHORITY"], quorum: 1, segregation: true },
    ],
  },
  {
    id: "G4_PRICE_RELEASE",
    name: "Price release",
    appliesTo: "Bid",
    from: "PRICED",
    to: "PRICE_RELEASED",
    exitArtefact: "Approved price",
    requires: [
      { kind: "all", collection: "costItems", field: "status", is: "APPROVED", say: "a cost item is not approved" },
      { kind: "redteam", lens: "commercial", severity: "HIGH", say: "an open high-severity commercial finding" },
      { kind: "scenario", metric: "P80.margin", atLeast: "policy.minMarginP80", say: "the P80 margin is below policy" },
      { kind: "fact", fact: "estimate.arithmeticFaults", is: 0, say: "a stored total does not match its calculation" },
      { kind: "approval", roles: ["COMMERCIAL_AUTHORITY"], quorum: 1, segregation: true },
    ],
  },
  {
    id: "G5_SUBMISSION_RELEASE",
    name: "Submission release",
    appliesTo: "Bid",
    from: "CONSISTENT",
    to: "SUBMITTED",
    exitArtefact: "Submission manifest and snapshot",
    requires: [
      { kind: "fact", fact: "manifest.hardGateFailures", is: 0, say: "a pre-submission hard gate is failing" },
      { kind: "redteam", lens: "any", severity: "CRITICAL", say: "an open critical finding" },
      { kind: "fact", fact: "evidence.unbackedClaims", is: 0, say: "a claim in the submission has no approved evidence" },
      { kind: "fact", fact: "price.reconciles", is: true, say: "the submitted price does not reconcile to the approved price" },
      { kind: "approval", roles: ["SUBMISSION_SIGNATORY"], quorum: 1, segregation: true, authorityForValue: true },
    ],
  },
  {
    id: "G6_AWARD",
    name: "Award conversion",
    appliesTo: "Bid",
    from: "OUTCOME_RECORDED",
    to: "BASELINE_HANDED_OVER",
    exitArtefact: "Reconciled delivery baseline",
    requires: [
      { kind: "fact", fact: "award.reconciledToSubmission", is: true, say: "the contract does not reconcile to what was submitted" },
      { kind: "fact", fact: "award.unresolvedDepartures", is: 0, say: "a departure is unresolved at award" },
      { kind: "approval", roles: ["EXECUTIVE_SPONSOR", "COMMERCIAL_AUTHORITY"], quorum: 2, segregation: true },
    ],
  },
  {
    id: "G7_LESSONS",
    name: "Lessons promoted",
    appliesTo: "Bid",
    from: "BASELINE_HANDED_OVER",
    to: "CLOSED",
    exitArtefact: "Approved lessons",
    requires: [
      { kind: "fact", fact: "lessons.captured", is: true, say: "no outcome review was captured" },
      { kind: "approval", roles: ["KNOWLEDGE_STEWARD"], quorum: 1, segregation: true },
    ],
  },
];

const GATE_BY_ID = new Map(GATES.map((g) => [g.id, g]));

/**
 * The management gates G0 to G8 as the specification names them, each bound
 * to the machine gate that actually guards it. G8 has no machine gate of its
 * own: it is the exit artefact of G7_LESSONS, and saying so here is better
 * than inventing a ninth guard nobody would trigger.
 */
export const GOVERNANCE = [
  { gate: "G0 Register", entry: "Opportunity identified", approval: "Pursuit owner", exit: "Opportunity record", machine: null, note: "registration is a record, not a guarded transition" },
  { gate: "G1 Qualify", entry: "Minimum client and scope data", approval: "Bid director", exit: "Qualification decision", machine: "G0_PURSUE" },
  { gate: "G2 Commit", entry: "Initial risk, capacity and economics complete", approval: "Executive authority", exit: "Bid budget and team", machine: "G0_PURSUE" },
  { gate: "G3 Strategy", entry: "Win themes, solution and evidence mapped", approval: "Bid director", exit: "Approved bid plan", machine: "G1_COMPLIANCE_BASELINE" },
  { gate: "G4 Price", entry: "Estimate reconciled and risks priced", approval: "Commercial authority", exit: "Approved price", machine: "G4_PRICE_RELEASE" },
  { gate: "G5 Solution", entry: "Technical and programme reviews complete", approval: "Technical authority", exit: "Approved solution", machine: "G2_SCOPE_FREEZE" },
  { gate: "G6 Submit", entry: "Compliance and packaging checks passed", approval: "Delegated signatory", exit: "Submission snapshot", machine: "G5_SUBMISSION_RELEASE" },
  { gate: "G7 Award", entry: "Contract reconciliation complete", approval: "Executive and commercial authority", exit: "Accept, negotiate or decline", machine: "G6_AWARD" },
  { gate: "G8 Learn", entry: "Outcome and review captured", approval: "Knowledge steward", exit: "Approved lessons", machine: "G7_LESSONS" },
];

/** A dotted path out of the facts object, or undefined. */
function read(facts, path) {
  let cur = facts;
  for (const part of String(path).split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[part];
  }
  return cur;
}

const SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** One requirement, evaluated. Returns null when met, a failure when not. */
function evaluateRequirement(req, facts) {
  switch (req.kind) {
    case "fact": {
      const value = read(facts, req.fact);
      if (value === undefined) {
        return { requirement: req.fact, reason: `${req.fact} is not known; a gate does not pass on a missing fact`, unknown: true };
      }
      if (value !== req.is) {
        return { requirement: req.fact, reason: req.say, expected: req.is, actual: value };
      }
      return null;
    }
    case "all": {
      const rows = read(facts, req.collection);
      if (!Array.isArray(rows)) {
        return { requirement: req.collection, reason: `${req.collection} is not a list; a gate does not pass on a missing collection`, unknown: true };
      }
      const bad = rows.filter((r) => (r || {})[req.field] !== req.is);
      if (bad.length) {
        return {
          requirement: `${req.collection}.${req.field}`,
          reason: req.say,
          count: bad.length,
          examples: bad.slice(0, 5).map((r) => (r && (r.id || r.ref)) || "(unidentified)"),
        };
      }
      return null;
    }
    case "redteam": {
      const findings = read(facts, "findings");
      if (!Array.isArray(findings)) {
        return { requirement: "findings", reason: "no assurance findings are recorded; a gate does not pass on an unread red team", unknown: true };
      }
      const floor = SEVERITY_ORDER.indexOf(req.severity);
      const open = findings.filter((f) => {
        if (!f || f.status === "CLOSED" || f.status === "DISPOSED") return false;
        if (req.lens !== "any" && String(f.lens || "").toLowerCase() !== req.lens) return false;
        return SEVERITY_ORDER.indexOf(String(f.severity || "LOW").toUpperCase()) >= floor;
      });
      if (open.length) {
        return { requirement: `findings(${req.lens}, >=${req.severity})`, reason: req.say, count: open.length, examples: open.slice(0, 5).map((f) => f.id || f.title || "(untitled)") };
      }
      return null;
    }
    case "scenario": {
      const value = read(facts, `scenarios.${req.metric}`);
      const threshold = read(facts, req.atLeast);
      if (value === undefined) return { requirement: req.metric, reason: `${req.metric} has not been modelled`, unknown: true };
      if (threshold === undefined) return { requirement: req.atLeast, reason: `${req.atLeast} is not set; a threshold nobody set cannot be met`, unknown: true };
      if (!(Number(value) >= Number(threshold))) {
        return { requirement: req.metric, reason: req.say, expected: `>= ${threshold}`, actual: value };
      }
      return null;
    }
    case "approval":
      return null; // handled separately: it needs the approval list and the author
    default:
      return { requirement: String(req.kind), reason: "unknown requirement kind; refused rather than skipped", unknown: true };
  }
}

/**
 * The approval requirement. Separated because it is the one that needs to
 * know WHO, and because its failure modes are the ones people argue about.
 */
export function checkApproval(req, { approvals = [], author = null, value = null, signatoryLimits = {} } = {}) {
  const roles = req.roles || [];
  const quorum = Number(req.quorum || 1);
  const faults = [];
  const valid = [];
  const seen = new Set();

  for (const raw of approvals) {
    const a = raw || {};
    const who = a.by ? String(a.by) : "";
    const role = a.role ? String(a.role) : "";
    if (!who) { faults.push({ reason: "an approval with nobody named" }); continue; }
    if (!roles.includes(role)) continue; // an approval from an unrelated role is not a fault, it just does not count
    if (a.decision && a.decision !== "APPROVED") { faults.push({ who, role, reason: `recorded as ${a.decision}` }); continue; }
    if (req.segregation && author && who === String(author)) {
      faults.push({ who, role, reason: "the approver is the author; segregation of duties refuses this" });
      continue;
    }
    if (seen.has(who)) { faults.push({ who, role, reason: "the same person cannot make up two of a quorum" }); continue; }
    seen.add(who);
    valid.push({ who, role, at: a.at || null });
  }

  if (req.authorityForValue && value !== null) {
    for (const a of valid) {
      const limit = signatoryLimits[a.who];
      if (limit === undefined) {
        faults.push({ who: a.who, reason: "no signing limit is recorded for this approver; authority cannot be assumed" });
      } else if (Number(value) > Number(limit)) {
        faults.push({ who: a.who, reason: `the value ${value} exceeds this approver's limit of ${limit}` });
      }
    }
  }

  const ok = valid.length >= quorum && faults.length === 0;
  return {
    ok,
    quorum,
    have: valid.length,
    roles,
    valid,
    faults,
    // The specific fault comes FIRST. The first version of this preferred the
    // quorum count, so an estimator approving their own estimate was told
    // "0 of 1 required approvals" — which reads as nobody having got round to
    // it, and sends them to find a second approver rather than telling them
    // the control they just tripped. A segregation refusal has to say so.
    reason: ok
      ? "approved"
      : faults.length
        ? faults.map((f) => (f.who ? `${f.who}: ${f.reason}` : f.reason)).join("; ")
        : `${valid.length} of ${quorum} required approval(s) from ${roles.join(" or ")}`,
  };
}

/** Evaluate a gate against the facts. Blocks; never warns. */
export function evaluate(gateId, facts = {}, approvalContext = {}) {
  const gate = GATE_BY_ID.get(String(gateId));
  if (!gate) return { ok: false, gate: String(gateId), reason: "no such gate", failures: [{ requirement: "gate", reason: "no such gate" }] };

  const failures = [];
  let approval = null;
  for (const req of gate.requires) {
    if (req.kind === "approval") {
      approval = checkApproval(req, approvalContext);
      if (!approval.ok) failures.push({ requirement: "approval", reason: approval.reason, detail: approval });
      continue;
    }
    const fail = evaluateRequirement(req, facts);
    if (fail) failures.push(fail);
  }
  return {
    ok: failures.length === 0,
    gate: gate.id,
    name: gate.name,
    from: gate.from,
    to: gate.to,
    exitArtefact: gate.exitArtefact,
    failures,
    approval,
    // A gate blocked on something nobody has measured reads differently from
    // one blocked on a measured failure, and the fix is different too.
    blockedOnUnknowns: failures.some((f) => f.unknown === true),
  };
}

/** The permitted move, if there is one. */
export function transitionFor(from, to) {
  return TRANSITIONS.find((t) => t.from === from && t.to === to) || null;
}

/**
 * Attempt a state change. Returns the decision event on success and the
 * unmet requirements on failure — both are recorded, because a refused gate
 * is the more useful half of the audit trail.
 */
export function transition({ state, to, facts = {}, approvals = [], author = null, value = null, signatoryLimits = {}, by = null, at = null } = {}) {
  const from = String(state);
  const target = String(to);
  if (!STATES.includes(from)) return { ok: false, reason: `"${from}" is not a bid state` };
  if (!STATES.includes(target)) return { ok: false, reason: `"${target}" is not a bid state` };
  if (TERMINAL.has(from)) return { ok: false, reason: `${from} is terminal; a closed bid does not move` };
  const move = transitionFor(from, target);
  if (!move) return { ok: false, reason: `${from} → ${target} is not a permitted transition`, permitted: TRANSITIONS.filter((t) => t.from === from).map((t) => t.to) };

  const stamp = at || new Date().toISOString();
  if (!move.gate) {
    return {
      ok: true,
      state: target,
      gate: null,
      decision: { type: "bid.transitioned", from, to: target, gate: null, by: by || null, at: stamp },
    };
  }
  const verdict = evaluate(move.gate, facts, { approvals, author, value, signatoryLimits });
  const decision = {
    type: verdict.ok ? "gate.passed" : "gate.blocked",
    gate: move.gate,
    from,
    to: target,
    by: by || null,
    at: stamp,
    failures: verdict.failures,
    approvals: verdict.approval ? verdict.approval.valid : [],
  };
  if (!verdict.ok) {
    return { ok: false, state: from, gate: move.gate, reason: `${move.gate} blocks this transition`, verdict, decision };
  }
  return { ok: true, state: target, gate: move.gate, verdict, decision };
}

/**
 * The shortest permitted route from one state to another.
 *
 * SHORTEST IS NOT ALWAYS THE ONE MEANT. A no-bid is a permitted transition
 * from QUALIFIED straight to CLOSED, so the shortest route from DISCOVERED to
 * CLOSED is "decide not to bid" — correct, and useless on a screen showing
 * somebody the journey of a live pursuit. Pass `{ pursuing: true }` and the
 * early-exit edges are excluded, which is what a bid being worked on wants.
 */
const EARLY_EXITS = new Set(["QUALIFIED>CLOSED", "OUTCOME_RECORDED>CLOSED"]);

export function route(from, to, { pursuing = false } = {}) {
  const start = String(from), end = String(to);
  if (!STATES.includes(start) || !STATES.includes(end)) return null;
  const queue = [[start]];
  const seen = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const head = path[path.length - 1];
    if (head === end) return path;
    for (const t of TRANSITIONS) {
      if (t.from !== head || seen.has(t.to)) continue;
      if (pursuing && EARLY_EXITS.has(`${t.from}>${t.to}`)) continue;
      seen.add(t.to);
      queue.push([...path, t.to]);
    }
  }
  return null;
}

/** Every gate a bid must still pass to reach a target state. */
export function remainingGates(from, to = "CLOSED", opts = {}) {
  const path = route(from, to, opts);
  if (!path) return null;
  const out = [];
  for (let i = 0; i < path.length - 1; i++) {
    const t = transitionFor(path[i], path[i + 1]);
    if (t && t.gate) out.push(GATE_BY_ID.get(t.gate));
  }
  return out;
}
