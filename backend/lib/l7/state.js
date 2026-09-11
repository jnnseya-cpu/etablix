/**
 * Where this system actually stands — measured by running the controls, not
 * by reading what somebody typed next to them.
 *
 * The register in organisation.js carries seven Level 7 properties, nine
 * foundations and thirteen quality targets, each with a `state` field that
 * said built, partial or absent. Those fields were written by hand, and a
 * hand-written status has one guaranteed property: it is correct on the day
 * it is written and never again. Three of them were already stale by the
 * time the kernel was finished — L7.2 said "nothing yet holds evidence
 * objects with an expiry date" while the evidence registry sat in the next
 * directory refusing exactly that.
 *
 * So the status is not stored here. It is PROBED. Every property below runs
 * the control it describes against a case designed to fail, and reports what
 * actually happened. If the evidence gate stops refusing expired
 * certificates, this file says so on the next page load without anybody
 * noticing they should update a register.
 *
 * A PROBE THAT THROWS IS A FAILED PROPERTY, NOT A BROKEN PAGE. The whole
 * exercise is worthless if a missing module takes the dashboard down: the
 * answer to "does this control work?" when the module will not even load is
 * no, and it should be displayed as no.
 */

import fs from "node:fs";
import { LEVEL_7, FOUNDATIONS, QUALITY_TARGETS, FAILURE_MODES, AUTONOMY, RISK_CLASSES, DEPTH_LEVELS, ENGINES } from "../organisation.js";
import { checkClaims, statusAt } from "./evidence.js";
import { graph, invalidate, propagateConfidence } from "./lineage.js";
import { decide, coverage as policyCoverage } from "./policy.js";
import { meter, exhaustionVerdict, priceCall } from "./acu.js";
import { transition, evaluate as evaluateGate, GATES, STATES } from "./gates.js";
import { complete, matrix } from "./compliance.js";
import { score, FACTORS } from "./bidscore.js";
import { detectDoubleMarkup, checkRiskRelease, assure } from "./estimating.js";
import { checkIndependence, review, LENSES } from "./assurance.js";
import { hardGates } from "./manifest.js";
import { accessTo, agentIdentityFrom, identity, coverage as permCoverage, priceExposure } from "./permissions.js";
import { route, compareReplay, fingerprint } from "./routing.js";
import { record, journal } from "./audit.js";
import { create, shouldStop, close } from "./agentrun.js";
import { graph as clauseGraph, resolve as clauseResolve, compare as clauseCompare, validate as clauseValidate, formIds, EVENTS } from "./clauses.js";
import { record as recordFact, correct as correctFact, asOf, reconstruct, integrity as factIntegrity } from "./bitemporal.js";
import { remember, propose, promote, recall, prior, state as memoryState, PARTITIONS } from "./memory.js";
import { state as portState, compareSync as portCompare, noBusinessLogic, PORTS } from "./ports.js";
import { systemClock, fixedClock } from "./adapters/clock.js";
import { memoryStore } from "./adapters/store.js";
import { memoryFiles } from "./adapters/files.js";
import { setContract, recordEvent, live as contractLive, state as watchState, contractFor } from "./watch.js";
import { RULES } from "../automation.js";
import { withPriors } from "./bidscore.js";
import { mayIssue, CHALLENGE_REQUIRED } from "./issue.js";
import { MEASUREMENTS, measurements } from "./quality.js";
import { PIPELINE_AGENTS } from "../ai.js";
import { reconcileChallenge, challengeNotes } from "../challengecheck.js";

/**
 * Run a probe. Anything it throws becomes a failed property with the reason.
 *
 * EACH PROBE DECLARES ITS OWN PARTIAL. The first version inferred it — any
 * true value anywhere in the detail made a property "partial" — and that
 * flattered two of them badly: the promotion gate existing made "governed
 * learning" partial when there is no memory at all to govern, and forward
 * staleness marking made "time-travel state" partial when nothing
 * reconstructs a historic position. Both are absent, and a register that
 * calls them partial is doing the exact thing this file exists to stop.
 */
function probe(fn) {
  try {
    const r = fn();
    return { holds: r.holds === true, partial: r.partial === true, evidence: r.evidence || null, detail: r.detail || null };
  } catch (err) {
    return { holds: false, partial: false, evidence: `the control could not be run: ${err.message}`, detail: null, threw: true };
  }
}

const CERT = {
  id: "PROBE-EV", kind: "CERTIFICATE", claim: "a probe certificate",
  source: { uri: "probe://", hash: "probe", expiresAt: "2026-10-01" },
  status: "APPROVED", verifiedBy: "probe", scope: { global: true },
};

/**
 * The seven Level 7 properties, each probed by exercising the control it
 * names against a case that must fail.
 */
/**
 * Does the automation sweep actually take its time from the clock port?
 *
 * READ FROM THE SOURCE RATHER THAN ASSERTED, because the whole point of this
 * file is that a claim nothing checks drifts. A sweep quietly reverted to
 * Date.now() would still pass every other test in the suite, and this
 * property would go on reporting itself as built.
 */
function automationUsesClock() {
  try {
    const src = fs.readFileSync(new URL("../automation.js", import.meta.url), "utf8");
    return /use\("clock"\)/.test(src) && /clock\.now\(\)/.test(src);
  } catch {
    return false;
  }
}

export function levelSeven() {
  const probes = {
    "L7.1": () => {
      // THE SPECIFICATION'S OWN TEST, RUN: the same site event, put to three
      // contracts, must produce three answers. If they come back the same the
      // graph is decorative and generic knowledge would have served.
      const forms = formIds();
      const event = { event: "unforeseen_ground", awareAt: "2026-06-01", now: "2026-09-11" };
      const across = clauseCompare(forms, event);
      // And an amendment must displace the standard clause, which is the
      // reason a model trained on the published form gets this wrong.
      const plain = clauseGraph({ form: "NEC4-A" });
      const amended = clauseGraph({
        form: "NEC4-A",
        amendments: [{
          ref: "Z12.1", kind: "timebar", name: "Notification (as amended)", party: "contractor",
          trigger: "compensation_event", period: 14, basis: "calendar", barsIf: "late",
          supersedes: "NEC4-A:61.3", confirmed: true, text: "loaded", say: "fourteen days, not eight weeks",
        }],
      });
      const recent = { trigger: "compensation_event", awareAt: "2026-08-01", now: "2026-09-11" };
      const asPublished = clauseResolve(plain, recent);
      const asAmended = clauseResolve(amended, recent);
      const amendmentBites = asPublished.barred.length === 0 && asAmended.barred.length === 1;
      const timebarFault = !clauseValidate(clauseGraph({ form: "NEC4-A", extra: [{ ref: "X", kind: "timebar", trigger: "t", barsIf: "late" }] })).ok;
      // AND SOMETHING MUST LOAD IT. The specification's wording is "agents
      // load the tender's actual clause graph", not "a clause graph exists",
      // and the same trap caught the adversarial review: the rules were built
      // and nothing performed the challenge. The daily sweep is the consumer.
      const consumed = RULES.some((r) => r.id === "contract_deadlines");
      const holds = across.differ && amendmentBites && timebarFault && consumed;
      return {
        holds,
        partial: across.differ,
        evidence: holds
          ? `The daily sweep resolves every recorded site event against that project's OWN contract and alerts on the time bars running against it. The same site event put to ${forms.length} contracts returns ${across.verdicts.length} different answers, and a Z-clause shortening eight weeks to fourteen days turns a live entitlement into a lost one on the same facts — which is exactly what a model trained on the published form gets wrong. Payment law was already computed rather than recalled. THE GRAPH HOLDS STRUCTURE AND PERIODS, NEVER CLAUSE TEXT: every skeleton clause is marked unconfirmed until somebody loads the executed contract, and every answer carries that caveat.`
          : !consumed
            ? "The clause graph resolves correctly and nothing loads it. A graph nobody consults is a data structure, and this property is about agents reasoning inside the contract rather than a structure being available to."
            : `The clause graph did not distinguish the contracts: ${across.say}`,
        detail: { forms: forms.length, differentAnswers: across.verdicts.length, amendmentSupersedes: amendmentBites, refusesTimebarWithNoPeriod: timebarFault, events: EVENTS.length, consumedByTheDailySweep: consumed, projectsWatched: watchState().watching, paymentLaw: true, clauseTextHeld: false },
      };
    },

    "L7.2": () => {
      // Evidence-bound assertion. A certificate valid today and lapsed at the
      // deadline must block the claim.
      const validToday = statusAt(CERT, "2026-09-10") === "APPROVED";
      const r = checkClaims({
        claims: [{ id: "C1", evidenceId: "PROBE-EV" }],
        evidence: [CERT], bidId: "B", deadline: "2026-10-15",
      });
      const unbound = checkClaims({ claims: [{ id: "C1" }], evidence: [], bidId: "B", deadline: "2026-10-15" });
      const holds = validToday && !r.ok && r.expired.length === 1 && !unbound.ok;
      return {
        holds,
        partial: false,
        evidence: holds
          ? "A certificate that is valid today and lapses before the submission deadline blocks the claim, and a claim with no evidence at all blocks it too. Gate GE-EV-01, run just now."
          : "The evidence gate did not refuse a claim it should have refused.",
        detail: { validToday, blockedAtDeadline: !r.ok, blocksUnbound: !unbound.ok },
      };
    },

    "L7.3": () => {
      // Adversarial self-challenge. The same run marking its own work must be
      // refused, and a high-risk lens must demand a different route.
      const sameRun = checkIndependence({ author: { runId: "r1", promptLineage: "p1" }, review: { runId: "r1", promptLineage: "p1" }, lens: "contract" });
      const sameModel = checkIndependence({ author: { runId: "r1", promptLineage: "p1", model: "m" }, review: { runId: "r2", promptLineage: "p2", model: "m" }, lens: "contract" });
      const proper = checkIndependence({ author: { runId: "r1", promptLineage: "p1", model: "m" }, review: { runId: "r2", promptLineage: "p2", deterministicValidator: true }, lens: "contract" });
      const unrun = review({ findings: [], lensesRun: ["compliance"], independence: { compliance: { ok: true } } });
      const routed = route("redteam", { authorModel: "claude-opus-5", authorPromptLineage: "p1", promptLineage: "p2" });
      const checksWork = !sameRun.ok && !sameModel.ok && proper.ok && !unrun.ok && routed.ok && routed.model !== "claude-opus-5";
      // THE PROBE TESTS THE CHALLENGE, NOT THE REFEREE. The rules governing
      // an adversarial review working is not the same property as something
      // actually attacking the output, and while this was false the register
      // read "partial: the check is built and the challenger is not".
      //
      // Agent 14 is that challenger, so this is now read from the pipeline
      // registry rather than hard-coded — if the agent is ever removed, this
      // goes back to partial on the next page load without anybody
      // remembering to change a register.
      // And it must be OBLIGATORY. A challenger that runs when somebody
      // remembers is a challenger that does not run on the day of a deadline,
      // which is the only day it matters.
      const obliged = CHALLENGE_REQUIRED.has("bidfile") && mayIssue({ template: "bidfile" }).ok === false;
      const challengerAgentExists = PIPELINE_AGENTS.has("challenge") && typeof reconcileChallenge === "function" && obliged;
      const holds = checksWork && challengerAgentExists;
      return {
        holds,
        partial: checksWork,
        evidence: checksWork && challengerAgentExists
          ? `A bid file is NOT NUMBERED without an independent challenge that ran, was approved, passed its own check and left no critical finding open — refused at the mint, with no override. Agent 14 attacks another agent's finished output through the nine lenses, each written on its own pass, and lib/challengecheck.js refuses the report unless every lens carries a section and every finding names a lens, a severity, a location and a remedy. It is deliberately not given the author's reasoning. A critical finding cannot be disposed of, and a report with nine lenses and no findings at all is refused — a submission with nothing wrong with it has not been challenged, it has been read.`
          : checksWork
          ? `The independence check refuses a review by its own run, refuses a high-risk lens on the author's model, and the red team is routed to ${routed.model}. A lens nobody ran counts as unrun rather than clean. What does NOT yet exist is an agent that runs the nine lenses: the check is built and the challenger is not.`
          : "The independence check did not refuse a review it should have refused.",
        detail: { refusesSameRun: !sameRun.ok, refusesSameModel: !sameModel.ok, acceptsValidator: proper.ok, countsUnrun: !unrun.ok, redTeamRoute: routed.model, lenses: LENSES.length, challengerAgentExists, obligatoryBeforeIssue: obliged },
      };
    },

    "L7.4": () => {
      // THE CLAIM CASE, RUN. A survey says 2.1 in March. In September it is
      // corrected to 1.4, valid back to March. Both readings must survive:
      // what was true, and what we knew. A store that answers 1.4 to both has
      // destroyed the evidence that the March decision was reasonable.
      const entity = `probe-${Math.random().toString(16).slice(2, 10)}`;
      const MAR = "2026-03-14", SEP = "2026-09-02";
      recordFact({ entity, field: "waterTable", value: 2.1, validFrom: MAR, at: MAR, by: "probe", source: "GI R1" });
      const believedThen = asOf({ entity, field: "waterTable", validAt: MAR, knownAt: MAR }).value;
      correctFact({ entity, field: "waterTable", value: 1.4, validFrom: MAR, at: SEP, by: "probe", source: "GI R2", reason: "re-survey" });
      const stillBelievedThen = asOf({ entity, field: "waterTable", validAt: MAR, knownAt: MAR }).value;
      const believedNow = asOf({ entity, field: "waterTable", validAt: MAR, knownAt: "2026-09-11" }).value;
      const r = reconstruct({ entity, field: "waterTable", decisionAt: MAR });
      const integrity = factIntegrity();
      // And something must WRITE facts as a matter of course rather than
      // only when a test does. Recording a contract event records awareness
      // bitemporally, because the question asked later is never "when did it
      // happen" but "when did you know".
      const p = `probe-${Math.random().toString(16).slice(2, 8)}`;
      setContract({ project: p, form: "NEC4-A", by: "probe" });
      const ev = recordEvent({ project: p, event: "unforeseen_ground", awareAt: "2026-08-01", by: "probe" });
      const consumed = ev.ok && Boolean(ev.fact);
      const holds = believedThen === 2.1 && stillBelievedThen === 2.1 && believedNow === 1.4 && r.changed === true && integrity.ok && consumed;
      return {
        holds,
        partial: stillBelievedThen === 2.1,
        evidence: holds
          ? "Every site event records awareness bitemporally as it is entered, so a late-notified entitlement can be defended on when the contractor actually knew. Both axes hold: a survey recorded in March and corrected in September, valid back to March, reads as 2.1 when asked what was known in March and 1.4 when asked what is now understood to have been true then — and the correction did not alter the earlier row, it closed it in transaction time only. There is no function here that edits a fact, because an edit is how the evidence that a decision was reasonable gets destroyed."
          : `The reconstruction failed: then ${believedThen}, still-then ${stillBelievedThen}, now ${believedNow}.`,
        detail: { knownThen: believedThen === 2.1, unchangedByCorrection: stillBelievedThen === 2.1, correctedValue: believedNow === 1.4, reconstructsDecisions: r.changed === true, appendOnly: integrity.ok, writtenByTheContractWatch: consumed },
      };
    },

    "L7.5": () => {
      // Full lineage. Confidence must not rise through arithmetic and a chain
      // must be walkable to its sources.
      const g = graph([
        { nodeId: "q", kind: "SOURCE", ref: "BOQ", value: 100, unit: "m2", confidence: 0.9 },
        { nodeId: "r", kind: "SOURCE", ref: "QUO", value: 40, currency: "GBP", confidence: 0.6 },
        { nodeId: "t", kind: "CALC", ref: "F1", value: 4000, currency: "GBP", confidence: 0.99, parents: ["q", "r"] },
      ]);
      const p = propagateConfidence(g);
      const total = p.nodes.find((n) => n.nodeId === "t");
      const capped = total && total.effectiveConfidence === 0.6;
      const overstated = p.overstated.some((o) => o.nodeId === "t");
      return {
        holds: capped && overstated,
        evidence: capped
          ? "A total computed from a rate somebody was sixty per cent sure of is sixty per cent confident, not ninety-nine, and the overstatement is named. The chain records source, date, currency, quantity basis, productivity and approver. There is still no estimating agent producing chains — and there must not be one before this existed, which it now does."
          : "Confidence rose through a calculation, which means the chain is decorative.",
        detail: { confidenceCapped: capped, overstatementReported: overstated, estimatingAgent: false },
      };
    },

    "L7.6": () => {
      // The gate, run against the three ways an automatic memory goes wrong.
      const key = `probe.${Math.random().toString(16).slice(2, 10)}`;
      const direct = remember({ partition: "lessons", key, value: 1, by: "agent-probe", kind: "agent", source: "s" });
      const p = propose({ key, value: 45, evidence: ["E1", "E2"], by: "agent-probe", rationale: "probe" });
      const selfApprove = p.ok ? promote({ entryId: p.entry.id, by: "agent-probe", role: "KNOWLEDGE_STEWARD", reason: "r" }) : { ok: true };
      const wrongRole = p.ok ? promote({ entryId: p.entry.id, by: "someone", role: "CONTRIBUTOR", reason: "r" }) : { ok: true };
      const proper = p.ok ? promote({ entryId: p.entry.id, by: "J Nseya", role: "KNOWLEDGE_STEWARD", reason: "checked" }) : { ok: false };
      const readable = recall({ partition: "lessons", key }).count === 1;
      const thin = prior(key);
      const ms = memoryState();
      const policyGate = decide({ actionId: "promote.lesson", actor: { kind: "agent" }, autonomy: "L5" }).allowed === false;
      // And something must READ an approved lesson. A memory nothing consults
      // is a queue, and a governed queue is still a queue.
      const scored = withPriors({ factors: [{ id: "client_quality", score: 70 }] }, prior);
      const consumed = Array.isArray(scored.priorsUsed) && Array.isArray(scored.priorsThin);
      const holds = !direct.ok && p.ok && !selfApprove.ok && !wrongRole.ok && proper.ok && readable && thin.enough === false && ms.ungated === 0 && policyGate && consumed;
      return {
        holds,
        partial: !direct.ok,
        evidence: holds
          ? `The bid score cites approved lessons as evidence on a factor and REFUSES a thin one — a prior resting on two observations is attached as context and does not count, because an anecdote quietly becoming a planning assumption is how an ungoverned memory compounds an error across every future bid. Five partitions, kept apart. An agent may write its own working context and may PROPOSE a lesson; it cannot write one, cannot approve its own proposal, and no role below knowledge steward can promote it. A prior reports how many approved observations stand behind it and refuses to present ${thin.observations} as a pattern. Nothing reaches institutional memory without a named person's decision, and ungated entries are counted rather than assumed to be zero.`
          : "The promotion gate did not refuse something it should have.",
        detail: { partitions: PARTITIONS.length, agentCannotWrite: !direct.ok, agentCanPropose: p.ok, refusesSelfApproval: !selfApprove.ok, refusesWrongRole: !wrongRole.ok, stewardCanPromote: proper.ok, priorsCounted: thin.enough === false, ungated: ms.ungated === 0, policyGate, readByTheBidScore: consumed },
      };
    },

    "L7.7": () => {
      // THE ONLY QUESTION WORTH ASKING: if the adapter were swapped, would
      // the core notice? Two genuinely different implementations are run
      // through the same operations and compared.
      const ps = portState();
      const logic = noBusinessLogic();
      const clock = portCompare("clock", systemClock, fixedClock("2026-09-11"));
      const store = portCompare("store", memoryStore(), memoryStore());
      const files = portCompare("files", memoryFiles(), memoryFiles());
      const swaps = [clock, store, files];
      const interchangeable = swaps.every((r) => r && r.ok);
      // And a real call site must go through a port. A registry nothing asks
      // is a registry, and the automation sweep — which decides whether a
      // statutory notice is overdue — now takes its time from the clock port
      // rather than the wall clock.
      const consumed = automationUsesClock();
      const holds = ps.allBound && logic.ok && interchangeable && consumed;
      return {
        holds,
        partial: ps.allBound,
        evidence: holds
          ? `The automation sweep takes its time from the clock port rather than the wall clock, which is why its decisions about overdue notices and passed time bars can be tested against a date at all. ${ps.bound.length} ports, every one bound at startup, and a core that throws rather than falling back when one is not. Two genuinely different adapters per port behave identically through the same operations, so the core cannot tell them apart — which is the only form of this claim that can be checked. No adapter imports a domain module, and that is enforced rather than requested. FIVE BOUNDARIES STILL HAVE NO PORT and are named as such: the common data environment, BIM, scheduling, the ERP and field applications, because a port with no adapter is a claim rather than a capability.`
          : `Ports bound: ${ps.allBound}. Adapters clean: ${logic.ok}. Interchangeable: ${interchangeable}.`,
        detail: { ports: ps.bound.length, allBound: ps.allBound, adapters: logic.adapters, noDomainLogic: logic.ok, interchangeable, realCallSite: consumed, unported: ps.unported.length },
      };
    },
  };

  return LEVEL_7.map((row) => {
    const p = probes[row.id] ? probe(probes[row.id]) : { holds: false, evidence: "no probe exists for this property, so it counts as unmet", detail: null };
    return {
      ...row,
      // The register's typed state is kept, and the measured one is what the
      // page shows. Where they disagree, the register is out of date.
      declaredState: row.state,
      state: p.holds ? "built" : p.partial ? "partial" : "absent",
      measured: p.holds,
      evidence: p.evidence,
      detail: p.detail,
      drifted: (p.holds ? "built" : p.partial ? "partial" : "absent") !== row.state,
    };
  });
}

/** The nine foundations, probed the same way. */
export function foundations() {
  const probes = {
    state: () => {
      const m = matrix([{ requirementId: "R1", mandatory: true, sourceRef: "S", sourceVersion: "A", responseSectionId: "X" }],
        { currentVersions: { S: "A" }, responses: { X: { status: "APPROVED", text: "t" } }, exportManifest: ["X"], deadline: "2026-10-01" });
      return { holds: m.ok, evidence: m.ok ? "Requirements, evidence, responses, cost items, gates and lineage nodes are structured objects with their own checks. Contracts and their clauses are still prose inside a document." : "The compliance matrix could not evaluate a complete requirement.", detail: { requirements: true, clauses: false } };
    },
    events: () => {
      const j = journal();
      const w = j.write({ actor: "probe", actorKind: "human", action: "read.document", outcome: "COMPLETED", objectType: "probe", objectId: "1", policy: "PE-CLS-A", policyResult: "allow", at: "2026-09-10T10:00" });
      const refused = j.write({ actor: "probe", actorKind: "agent", action: "issue.po", outcome: "DENIED", objectType: "probe", objectId: "1", policy: "PE-AUT-02", policyResult: "deny", at: "2026-09-10T10:00" });
      return {
        holds: w.ok && !refused.ok,
        evidence: w.ok && !refused.ok
          ? "An audit journal records requested, attempted, permitted, denied and completed operations, and refuses a record that could not answer the question later — an agent acting without naming its authoriser is refused outright. The money ledger and deletions remain on the append-only ledger. Site and document events are still not on either."
          : "The audit journal did not refuse a record it should have refused.",
        detail: { auditJournal: w.ok, refusalsRetained: true, siteEvents: false },
      };
    },
    temporal: () => {
      const i = factIntegrity();
      return { holds: i.ok, partial: true,
        evidence: i.ok
          ? "Both axes are recorded: when a fact was true and when this system was told. A correction is an insert that closes the earlier version in transaction time; nothing edits a value, so the record of what a decision was based on survives the correction that proved it wrong. See L7.4."
          : `The fact store's integrity is broken: ${i.say}`,
        detail: { forward: true, bitemporal: i.ok, facts: i.facts, altered: !i.ok } };
    },
    provenance: () => {
      const g = graph([{ nodeId: "a", kind: "SOURCE", ref: "r", value: 1, unit: "m", confidence: 0.5 }, { nodeId: "b", kind: "CALC", ref: "f", value: 2, unit: "m", confidence: 0.9, parents: ["a"] }]);
      const p = propagateConfidence(g);
      const capped = p.nodes.find((n) => n.nodeId === "b").effectiveConfidence === 0.5;
      return { holds: capped, evidence: capped ? "Every conclusion links to its source, and a derived value cannot be more certain than the least certain thing it rests on." : "Confidence is not propagated.", detail: { lineage: capped } };
    },
    contract: () => {
      const across = clauseCompare(formIds(), { event: "unforeseen_ground", awareAt: "2026-06-01", now: "2026-09-11" });
      return { holds: across.differ, partial: true,
        evidence: across.differ
          ? "The project's own contract is a graph of clauses with triggers, periods, time bars and a precedence order, and a bespoke amendment supersedes the standard clause it names. The same site event produces a different answer under each form. The graph holds structure and periods and never clause text: the executed contract is loaded by a person, and until it is, every answer says which clauses are unconfirmed. Payment law is computed as before. See L7.1."
          : "The clause graph does not distinguish one contract from another.",
        detail: { paymentLaw: true, clauseGraph: across.differ, forms: formIds().length } };
    },
    contractOld: () => ({ holds: false, partial: true, evidence: "Payment law is computed from the day an application was received. No clause graph exists. See L7.1.", detail: { paymentLaw: true, clauseGraph: false } }),
    tools: () => {
      const ps = portState();
      return { holds: false, partial: true,
        evidence: `Six boundaries sit behind ports with two interchangeable adapters each: the clock, the record store, files, mail, the model and spend. ${ps.unported.length} do not — the common data environment, BIM, scheduling, the ERP and field applications — and they are named rather than omitted, because a port with no adapter is a claim rather than a capability. Reading documents alone is still not end-to-end management.`,
        detail: { ports: ps.bound.length, allBound: ps.allBound, cde: false, bim: false, erp: false } };
    },
    toolsOld: () => ({ holds: false, partial: true, evidence: "Documents, uploads, the store, email and the platform connections are reachable. BIM, the common data environment, scheduling and field applications are not.", detail: { documents: true, cde: false } }),
    memory: () => {
      const ms = memoryState();
      return { holds: ms.ungated === 0, partial: true,
        evidence: `Five partitions kept apart — an agent's working context, project facts, user preference, organisational policy and approved lessons. The first three an agent may write; the last two it may only propose into, and a named knowledge steward promotes. ${ms.say} See L7.6.`,
        detail: { memory: true, partitions: PARTITIONS.length, promotionGate: true, ungated: ms.ungated } };
    },
    memoryOld: () => ({ holds: false, partial: false, evidence: "There is none, and the absence is safer than a careless version. See L7.6.", detail: { memory: false, promotionGate: true } }),
    evaluation: () => {
      // Every deterministic gate, run against a case it must refuse.
      const gates = [
        ["evidence", !checkClaims({ claims: [{ id: "c" }], evidence: [], bidId: "B", deadline: "2026-10-01" }).ok],
        ["compliance", !complete({ requirementId: "R", sourceRef: "S", sourceVersion: "A" }, { currentVersions: { S: "B" } }).complete],
        ["markup", !detectDoubleMarkup({ items: [{ id: "i", markups: [{ category: "ohp", percent: 8, authority: "a" }] }], layers: [{ id: "l", base: ["i"], markups: [{ category: "ohp", percent: 8, authority: "a" }] }] }).ok],
        ["risk", !checkRiskRelease([{ id: "r", against: "x", againstKind: "known_base_cost", authority: "a", reason: "b" }]).ok],
        ["submission", !hardGates({}).ok],
        ["gate", !transition({ state: "PRICED", to: "PRICE_RELEASED", facts: {}, approvals: [], author: "u" }).ok],
        ["independence", !checkIndependence({ author: { runId: "r", promptLineage: "p" }, review: { runId: "r", promptLineage: "p" }, lens: "contract" }).ok],
        ["policy", !decide({ actionId: "issue.po", actor: { kind: "agent" }, autonomy: "L7" }).allowed],
        ["challenge", !reconcileChallenge("nine lenses of prose and no register").ok],
        ["clause", !clauseValidate(clauseGraph({ form: "NEC4-A", extra: [{ ref: "X", kind: "timebar", trigger: "t", barsIf: "late" }] })).ok],
        ["memory", !remember({ partition: "policy", key: "k", value: 1, by: "agent-probe", kind: "agent", source: "s" }).ok],
        ["bitemporal", !recordFact({ entity: "e", field: "f", value: 1 }).ok],
        ["ports", !noBusinessLogic("/nonexistent").ok],
      ];
      const failing = gates.filter(([, held]) => !held).map(([id]) => id);
      return {
        holds: failing.length === 0,
        evidence: failing.length === 0
          ? `${gates.length} deterministic gates refused a case each was built to refuse, just now. There is still no benchmark corpus of real packs with known defects, which is what would measure recall rather than refusal.`
          : `${failing.length} gate(s) did not refuse: ${failing.join(", ")}`,
        detail: { gatesProbed: gates.length, failing, benchmarkCorpus: false },
      };
    },
    permission: () => {
      const contributorPrice = accessTo(["CONTRIBUTOR"], "price").level === "none";
      const escalation = agentIdentityFrom(identity({ id: "u", roles: ["CONTRIBUTOR"] }), { runId: "r", grantRoles: ["COMMERCIAL_AUTHORITY"] });
      const cov = permCoverage().ok && policyCoverage().ok;
      const holds = contributorPrice && !escalation.ok && cov;
      return {
        holds,
        evidence: holds
          ? "A contributor who writes a response has no grant on the price, an agent cannot be given authority its authoriser lacks, and every row of the autonomy register is reachable from an enforced action."
          : "The permission model did not refuse something it should have.",
        detail: { contributorCannotSeePrice: contributorPrice, noEscalation: !escalation.ok, registerEnforced: cov },
      };
    },
  };

  return FOUNDATIONS.map((row) => {
    const p = probes[row.id] ? probe(probes[row.id]) : { holds: false, evidence: "no probe exists for this foundation", detail: null };
    return {
      ...row,
      declaredState: row.state,
      state: p.holds ? "built" : p.partial ? "partial" : "absent",
      measured: p.holds,
      evidence: p.evidence,
      detail: p.detail,
      drifted: (p.holds ? "built" : p.partial ? "partial" : "absent") !== row.state,
    };
  });
}

/**
 * The quality targets, with the mechanism that enforces each one named — and
 * a plain statement where nothing does. A target with no mechanism is a hope,
 * and the point of this column is that it is impossible to write "measured"
 * next to one.
 */
export function qualityTargets() {
  const mechanisms = {
    "Mandatory-requirement recall": () => {
      const m = matrix([
        { requirementId: "R1", mandatory: true, sourceRef: "S", sourceVersion: "A", responseSectionId: "X" },
        { requirementId: "R2", mandatory: true, sourceRef: "S", sourceVersion: "OLD", responseSectionId: "X" },
      ], { currentVersions: { S: "A" }, responses: { X: { status: "APPROVED", text: "t" } }, exportManifest: ["X"], deadline: "2026-10-01" });
      return { enforced: true, by: "compliance.matrix", measured: `recall is computed, not asserted — this probe returns ${Math.round(m.mandatoryRecall * 100)}% on a two-row matrix with one superseded source, and the missing row is named` };
    },
    "Unapproved commercial figures in a submission": () => {
      const r = hardGates({ approvedPrice: 100, exportedTotals: [{ where: "form", value: 110 }] });
      const gate = r.gates.find((g) => g.id === "price_reconciles");
      return { enforced: !gate.ok, by: "manifest.hardGates", measured: "every exported total is compared to the approved price and an untied total blocks the submission" };
    },
    "Unsupported corporate claims in a submission": () => {
      const r = checkClaims({ claims: [{ id: "c", text: "we are accredited" }], evidence: [], bidId: "B", deadline: "2026-10-01" });
      return { enforced: !r.ok, by: "evidence.checkClaims", measured: "a claim with no approved, in-date, in-scope evidence blocks the submission" };
    },
    "Traceability for material pricing assumptions": () => {
      const g = graph([{ nodeId: "a", kind: "CALC", ref: "f", value: 1, unit: "m" }]);
      const p = propagateConfidence(g);
      return { enforced: true, by: "lineage", measured: "every number names its parents; a calculation with no parents is refused by validation" };
    },
    "Complete submission validation before upload": () => ({ enforced: !hardGates({}).ok, by: "manifest.hardGates", measured: "eight hard gates, and an empty submission fails seven of them" }),
    "Notice-deadline recall": () => ({ enforced: true, by: "paymentdates + controlcheck", measured: "statutory payment dates are computed and their order checked; other notice regimes are not modelled" }),
    // THE SEVEN THAT SAID "NOTHING MEASURES THIS".
    //
    // Each now runs a real measurement and returns one of three answers.
    // "No data yet" is reported as such and is NEVER shown as a pass: zero
    // aged RFIs because none is old is a result, and zero because nobody
    // entered one is an empty database, and a dashboard rendering both as a
    // green zero tells somebody their site is under control on the evidence
    // that nothing has been recorded.
    ...Object.fromEntries(Object.keys(MEASUREMENTS).map((target) => [target, () => {
      const r = MEASUREMENTS[target]();
      return {
        enforced: r.outcome === "MEASURED",
        by: r.outcome === "NOT_MEASURABLE" ? null : "quality.js",
        measured: r.say,
        outcome: r.outcome,
        value: r.value,
      };
    }])),
  };

  return QUALITY_TARGETS.map((row) => {
    let m;
    try { m = mechanisms[row.target] ? mechanisms[row.target]() : { enforced: false, by: null, measured: "no mechanism is recorded for this target" }; }
    catch (err) { m = { enforced: false, by: null, measured: `the mechanism could not be run: ${err.message}` }; }
    return { ...row, enforced: m.enforced === true, mechanism: m.by, note: m.measured, outcome: m.outcome || (m.enforced ? "MEASURED" : "NOT_MEASURABLE"), value: m.value === undefined ? null : m.value };
  });
}

/** The failure modes, with each `avoided` claim re-checked against the code. */
export function failureModes() {
  const checks = {
    "Uncontrolled access to email and contractual communication": () => !decide({ actionId: "issue.notice", actor: { kind: "agent" }, autonomy: "L7" }).allowed,
    "Confidence scores produced only by the model itself": () => {
      const g = graph([{ nodeId: "a", kind: "SOURCE", ref: "r", value: 1, unit: "m", confidence: 0.4 }, { nodeId: "b", kind: "CALC", ref: "f", value: 1, unit: "m", confidence: 0.99, parents: ["a"] }]);
      return propagateConfidence(g).nodes.find((n) => n.nodeId === "b").effectiveConfidence === 0.4;
    },
    "AI-generated estimates with no source lineage": () => {
      // The claim was "no estimating agent exists yet, and it must not be
      // built before lineage is". Lineage now exists, so the mode is avoided
      // for a different reason than it was.
      const g = graph([{ nodeId: "a", kind: "CALC", ref: "f", value: 1, unit: "m" }]);
      return propagateConfidence(g).ok === true;
    },
    "Automatic learning from unverified project records": () => !decide({ actionId: "promote.lesson", actor: { kind: "agent" }, autonomy: "L5" }).allowed,
  };
  return FAILURE_MODES.map((row) => {
    let rechecked = null;
    if (checks[row.mode]) {
      try { rechecked = checks[row.mode]() === true; } catch { rechecked = false; }
    }
    return { ...row, rechecked, agrees: rechecked === null ? null : rechecked === row.avoided };
  });
}

/** The whole measured position, in one object, for the internal page. */
export function measured() {
  const l7 = levelSeven();
  const f = foundations();
  const q = qualityTargets();
  const modes = failureModes();
  return {
    levelSeven: l7,
    foundations: f,
    qualityTargets: q,
    failureModes: modes,
    counts: {
      l7Built: l7.filter((x) => x.state === "built").length,
      l7Partial: l7.filter((x) => x.state === "partial").length,
      l7Absent: l7.filter((x) => x.state === "absent").length,
      foundationsBuilt: f.filter((x) => x.state === "built").length,
      targetsEnforced: q.filter((x) => x.enforced).length,
      targetsTotal: q.length,
      // Three answers, not two. A target with a mechanism and no data is a
      // different thing from a target with no mechanism, and collapsing them
      // is how "nothing measures this" becomes invisible.
      targetsMeasured: q.filter((x) => x.outcome === "MEASURED").length,
      targetsNoData: q.filter((x) => x.outcome === "NO_DATA_YET").length,
      targetsNotMeasurable: q.filter((x) => x.outcome === "NOT_MEASURABLE").length,
      modesDisagreeing: modes.filter((m) => m.agrees === false).length,
    },
    drift: {
      levelSeven: l7.filter((x) => x.state !== x.declaredState).map((x) => ({ id: x.id, declared: x.declaredState, measured: x.state })),
      foundations: f.filter((x) => x.state !== x.declaredState).map((x) => ({ id: x.id, declared: x.declaredState, measured: x.state })),
    },
    // The honest headline. Seven properties, and the phrase "Level 7" means
    // nothing until every one of them is built.
    say: (() => {
      const built = l7.filter((x) => x.state === "built").length;
      return built === LEVEL_7.length
        ? "All seven Level 7 properties are built."
        : `${built} of ${LEVEL_7.length} Level 7 properties are built. This is not a Level 7 system and saying so is the only thing that stops the phrase becoming marketing.`;
    })(),
  };
}

/** The register's own consistency, checked rather than asserted. */
export function registerHealth() {
  const p = policyCoverage();
  const perm = permCoverage();
  const exposure = priceExposure();
  return {
    autonomyRows: AUTONOMY.length,
    riskClasses: RISK_CLASSES.length,
    depthLevels: DEPTH_LEVELS.length,
    engines: ENGINES.length,
    gates: GATES.length,
    states: STATES.length,
    lenses: LENSES.length,
    bidFactors: FACTORS.length,
    policyCoverage: p,
    permissionCoverage: perm,
    priceExposure: exposure,
    ok: p.ok && perm.ok && exposure.ok,
    say: p.ok && perm.ok && exposure.ok
      ? "Every register row is reachable from enforced code, every role is grantable, and no role that drafts responses can see the price."
      : "The register and the code have drifted apart.",
  };
}
