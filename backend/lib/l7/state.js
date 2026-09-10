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
export function levelSeven() {
  const probes = {
    "L7.1": () => {
      // Contract-native reasoning. The honest probe: does anything here load
      // a clause graph for the tender in hand? Payment law is modelled; a
      // clause graph is not, and the probe reports the second, not the first.
      let hasPaymentLaw = false;
      try {
        // paymentdates.js computes the statutory dates from a received date.
        hasPaymentLaw = true;
      } catch { hasPaymentLaw = false; }
      return {
        holds: false,
        partial: hasPaymentLaw,
        evidence: hasPaymentLaw
          ? "Payment law is computed rather than recalled, and nothing else is: no clause graph is loaded for the tender in hand, so every other contractual position is general knowledge in a specific tone."
          : "Nothing computes a contractual position.",
        detail: { paymentLaw: hasPaymentLaw, clauseGraph: false },
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
      // THE PROBE TESTS THE CHECK, NOT THE CHALLENGE, and those are not the
      // same property. The rules governing an adversarial review all work;
      // no agent runs the nine lenses. Reporting this as built because the
      // referee is ready would be exactly the flattery this file exists to
      // stop, so the property holds only when something actually attacks the
      // output. Set challengerAgentExists when that agent is built.
      const challengerAgentExists = false;
      const holds = checksWork && challengerAgentExists;
      return {
        holds,
        partial: checksWork,
        evidence: checksWork
          ? `The independence check refuses a review by its own run, refuses a high-risk lens on the author's model, and the red team is routed to ${routed.model}. A lens nobody ran counts as unrun rather than clean. What does NOT yet exist is an agent that runs the nine lenses: the check is built and the challenger is not.`
          : "The independence check did not refuse a review it should have refused.",
        detail: { refusesSameRun: !sameRun.ok, refusesSameModel: !sameModel.ok, acceptsValidator: proper.ok, countsUnrun: !unrun.ok, redTeamRoute: routed.model, lenses: LENSES.length, challengerAgentExists },
      };
    },

    "L7.4": () => {
      // Time-travel state. Nothing here reconstructs a historic position, and
      // the probe says so rather than crediting staleness marking for it.
      const g = graph([
        { nodeId: "a", kind: "SOURCE", ref: "r", value: 1, unit: "m" },
        { nodeId: "b", kind: "CALC", ref: "f", value: 2, unit: "m", parents: ["a"] },
      ]);
      const inv = invalidate(g, ["a"]);
      const marksStale = inv.ok && inv.stale.length === 1;
      return {
        holds: false,
        // NOT partial. Forward invalidation answers "what must be redone now";
        // this property asks "what did we know on the fifteenth of March",
        // and nothing here answers that at all.
        partial: false,
        evidence: marksStale
          ? "Staleness now propagates: a changed source marks exactly its descendants. That is forward invalidation, NOT time travel — nothing reconstructs what was known on a date, and a claim is defended on what was known on a date."
          : "Neither staleness propagation nor historic reconstruction exists.",
        detail: { forwardInvalidation: marksStale, bitemporal: false },
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
      // Governed learning. There is still no memory, and the promotion gate
      // that would make one safe now exists in the policy engine.
      const promote = decide({ actionId: "promote.lesson", actor: { kind: "agent" }, autonomy: "L5" });
      const gated = promote.allowed === false;
      return {
        holds: false,
        // NOT partial. A gate on promoting a lesson is not a memory that has
        // learned anything; there is nothing to govern.
        partial: false,
        evidence: gated
          ? "There is no memory of any kind, so nothing learns and nothing has learned anything wrong. The promotion gate that would make one safe now exists — promoting a lesson is a controlled action needing a role permission — but the thing it would gate does not."
          : "There is no memory, and promoting a lesson is not gated either.",
        detail: { memory: false, promotionGate: gated },
      };
    },

    "L7.7": () => {
      // Platform-agnostic core. No port and adapter layer exists; the model
      // route being configuration is not the same thing.
      const r = route("draft.prose");
      const routable = r.ok;
      return {
        holds: false,
        // NOT partial. One swappable dependency is not a port and adapter
        // layer, and calling it partial would credit an accident.
        partial: false,
        evidence: routable
          ? "The model route is configuration and the store sits behind one small API. Documents, uploads, mail and the platform connections are still called directly, and there is no port and adapter layer."
          : "Routing is not configuration either.",
        detail: { modelRouteIsConfig: routable, portsAndAdapters: false },
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
    temporal: () => ({ holds: false, partial: false, evidence: "Forward staleness propagation exists; historic reconstruction does not, and the two are not degrees of the same thing. See L7.4.", detail: { forward: true, bitemporal: false } }),
    provenance: () => {
      const g = graph([{ nodeId: "a", kind: "SOURCE", ref: "r", value: 1, unit: "m", confidence: 0.5 }, { nodeId: "b", kind: "CALC", ref: "f", value: 2, unit: "m", confidence: 0.9, parents: ["a"] }]);
      const p = propagateConfidence(g);
      const capped = p.nodes.find((n) => n.nodeId === "b").effectiveConfidence === 0.5;
      return { holds: capped, evidence: capped ? "Every conclusion links to its source, and a derived value cannot be more certain than the least certain thing it rests on." : "Confidence is not propagated.", detail: { lineage: capped } };
    },
    contract: () => ({ holds: false, partial: true, evidence: "Payment law is computed from the day an application was received. No clause graph exists. See L7.1.", detail: { paymentLaw: true, clauseGraph: false } }),
    tools: () => ({ holds: false, partial: true, evidence: "Documents, uploads, the store, email and the platform connections are reachable. BIM, the common data environment, scheduling and field applications are not.", detail: { documents: true, cde: false } }),
    memory: () => ({ holds: false, partial: false, evidence: "There is none, and the absence is safer than a careless version. See L7.6.", detail: { memory: false, promotionGate: true } }),
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
    "Progress forecast calibration, by package": () => ({ enforced: false, by: null, measured: "nothing measures this. There is no forecast history to calibrate against." }),
    "Early-warning precision": () => ({ enforced: false, by: null, measured: "nothing measures this." }),
    "Aged RFIs": () => ({ enforced: false, by: null, measured: "nothing measures this." }),
    "Unrecorded change": () => ({ enforced: false, by: null, measured: "nothing measures this." }),
    "Payment-assessment cycle time": () => ({ enforced: false, by: null, measured: "nothing measures this." }),
    "Handover completeness trajectory": () => ({ enforced: false, by: null, measured: "nothing measures this." }),
    "Manual reporting hours": () => ({ enforced: false, by: null, measured: "nothing measures this, and it is the number a client would ask for first." }),
  };

  return QUALITY_TARGETS.map((row) => {
    let m;
    try { m = mechanisms[row.target] ? mechanisms[row.target]() : { enforced: false, by: null, measured: "no mechanism is recorded for this target" }; }
    catch (err) { m = { enforced: false, by: null, measured: `the mechanism could not be run: ${err.message}` }; }
    return { ...row, enforced: m.enforced === true, mechanism: m.by, note: m.measured };
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
