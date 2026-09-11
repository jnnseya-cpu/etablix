/**
 * The Level 7 surface — internal only, and nothing here is ever public.
 *
 * Two different things live behind these routes and it is worth being clear
 * which is which.
 *
 * THE FIRST IS A MIRROR. GET / runs every deterministic control in the system
 * against a case it was built to refuse, and reports what actually happened.
 * It is not a status page reading a database; it is the controls being
 * exercised on every request. If one of them stops refusing, this page says
 * so without anybody remembering to update a register — which is the failure
 * mode of every architecture document ever written.
 *
 * THE SECOND IS A SET OF CALCULATORS. The gates, the evidence check, the
 * submission check and the estimate assurance are pure functions, so they can
 * be run against posted facts before there is anything in a database to run
 * them against. That matters more than it sounds: it means a bid manager can
 * test a submission against the eight hard gates while the bid is still in a
 * folder on somebody's desktop, and it means these controls are usable before
 * the workflow that would feed them exists.
 *
 * WHY NONE OF IT IS PUBLIC. Every number here is either a control that could
 * be studied for its edge cases, or an honest statement of what this system
 * cannot yet do. The first should not be handed to somebody probing it and
 * the second is a conversation to have in a room, not a page to be indexed.
 * requireAuth is on the router, not on the handlers, so a route added later
 * cannot be published by forgetting a line.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { measured, registerHealth } from "../lib/l7/state.js";
import { GATES, GOVERNANCE, STATES, TRANSITIONS, evaluate, transition, remainingGates, route as gateRoute } from "../lib/l7/gates.js";
import { ACTIONS, AUTONOMY_LEVELS, decide, coverage as policyCoverage, riskClass, authorityFor } from "../lib/l7/policy.js";
import { BID_ROLES, CONTENT_CLASSES, GRANTS, ROLE_MAPPING, accessTo, priceExposure } from "../lib/l7/permissions.js";
import { TASK_CLASSES, ROUTES, route as modelRoute } from "../lib/l7/routing.js";
import { checkClaims, lapsingBy, validate as validateEvidence, KINDS } from "../lib/l7/evidence.js";
import { logRegistry, validOn, validityHistory, positionAt } from "../lib/l7/evidencelog.js";
import { hardGates, build as buildManifest, MANIFEST_FIELDS } from "../lib/l7/manifest.js";
import { assure, detectDoubleMarkup, checkRiskRelease, RATE_COMPONENTS } from "../lib/l7/estimating.js";
import { matrix, CONTRADICTION_CLASSES, blockedBy } from "../lib/l7/compliance.js";
import { score, sensitivity, economics, FACTORS } from "../lib/l7/bidscore.js";
import { LENSES, SEVERITIES, review, checkIndependence } from "../lib/l7/assurance.js";
import { graph, explain, invalidate, propagateConfidence, validate as validateLineage } from "../lib/l7/lineage.js";
import { DEFAULT_RATES, estimate as estimateAcu, budgetState, budgetFor, priceCall, downgradeFrom } from "../lib/l7/acu.js";
import { summary as spendSummary, forRun as spendForRun } from "../lib/l7/spend.js";
import { STOP_RULES, create as createRun, shouldStop } from "../lib/l7/agentrun.js";
import { FORMS, EVENTS, graph as clauseGraph, resolve as clauseResolve, compare as clauseCompare, validate as validateClauses } from "../lib/l7/clauses.js";
import { setContract, recordEvent, live as contractLive, eventsFor, contractFor, awarenessOn, state as watchState } from "../lib/l7/watch.js";
import { record as recordFact, correct as correctFact, asOf, history, reconstruct, snapshot, lateInformation, integrity as factIntegrity } from "../lib/l7/bitemporal.js";
import { PARTITIONS, remember, propose, promote, recall, pending, prior, retire, state as memoryStateOf } from "../lib/l7/memory.js";
import { PORTS, UNPORTED, bound as portsBound, compareSync as portCompareSync, noBusinessLogic, state as portStateOf } from "../lib/l7/ports.js";
import { measurements as qualityMeasurements } from "../lib/l7/quality.js";
import { systemClock, fixedClock } from "../lib/l7/adapters/clock.js";
import { memoryStore } from "../lib/l7/adapters/store.js";
import { memoryFiles } from "../lib/l7/adapters/files.js";
import { PIPELINE_AGENTS } from "../lib/ai.js";

/** The agents a budget can be set against, from the registry rather than a list. */
const PIPELINE_AGENT_IDS = [...PIPELINE_AGENTS].sort();

/**
 * The two adapters each port is compared across on the Controls page.
 *
 * Deliberately built fresh per request rather than held: a comparison run
 * against a pair that accumulated state from the last run would pass for the
 * wrong reason, and this page exists to be believed.
 */
function adaptersFor(id) {
  if (id === "clock") return [systemClock, fixedClock("2026-09-11")];
  if (id === "store") return [memoryStore(), memoryStore()];
  return [memoryFiles(), memoryFiles()];
}

const router = Router();

// On the router. A handler added below inherits it and cannot be published by
// somebody forgetting to add it to their own route.
router.use(requireAuth);

/** Everything a calculator route needs from a posted body, or a 400. */
function body(req) {
  return req.body && typeof req.body === "object" ? req.body : {};
}

/**
 * GET /api/l7 — the measured position.
 *
 * Every control run, on this request. Slower than reading a status column and
 * that is the entire point.
 */
router.get("/", (req, res) => {
  try {
    res.json({ measured: measured(), health: registerHealth() });
  } catch (err) {
    // A probe layer that takes the page down would be worse than no probe
    // layer: the honest answer to "does this work" when it will not load is
    // no, and it has to be displayed rather than thrown.
    res.status(500).json({ error: `The controls could not be run: ${err.message}` });
  }
});

/** GET /api/l7/model — the definitions, for the reference screens. */
router.get("/model", (req, res) => {
  res.json({
    autonomyLevels: AUTONOMY_LEVELS,
    actions: ACTIONS.map((a) => {
      const found = authorityFor(a.id);
      return {
        id: a.id, verb: a.verb, minLevel: a.minLevel,
        registerAction: a.registerAction,
        riskClass: found && found.risk ? found.risk.class : null,
        handling: found && found.risk ? found.risk.handling : null,
        authority: found ? found.register.authority : null,
      };
    }),
    riskClasses: [...new Set(ACTIONS.map((a) => {
      const f = authorityFor(a.id);
      return f && f.risk ? f.risk.class : null;
    }))].filter(Boolean).sort(),
    lifecycle: { states: STATES, transitions: TRANSITIONS },
    gates: GATES.map((g) => ({ id: g.id, name: g.name, from: g.from, to: g.to, exitArtefact: g.exitArtefact, requires: g.requires })),
    governance: GOVERNANCE,
    lenses: LENSES,
    severities: SEVERITIES,
    contradictionClasses: CONTRADICTION_CLASSES,
    bidFactors: FACTORS,
    rateComponents: RATE_COMPONENTS,
    evidenceKinds: KINDS,
    manifestFields: MANIFEST_FIELDS,
    stopRules: STOP_RULES,
    taskClasses: TASK_CLASSES,
    routes: ROUTES,
    acuRates: DEFAULT_RATES,
    coverage: policyCoverage(),
  });
});

/** GET /api/l7/permissions — the role and content-class matrix. */
router.get("/permissions", (req, res) => {
  res.json({
    roles: BID_ROLES,
    contentClasses: CONTENT_CLASSES,
    grants: GRANTS,
    employeeMapping: ROLE_MAPPING,
    priceExposure: priceExposure(),
    matrix: BID_ROLES.map((r) => ({
      role: r.id,
      name: r.name,
      access: Object.fromEntries(CONTENT_CLASSES.map((c) => [c.id, accessTo([r.id], c.id).level])),
    })),
  });
});

/** POST /api/l7/decide — what the policy engine says about one action. */
router.post("/decide", (req, res) => {
  const b = body(req);
  if (!b.actionId) return res.status(400).json({ error: "actionId is required." });
  res.json(decide({
    actionId: String(b.actionId),
    actor: b.actor || { kind: "agent" },
    autonomy: b.autonomy || "L1",
    context: b.context || {},
  }));
});

/** POST /api/l7/gate — evaluate one gate, or attempt a transition. */
router.post("/gate", (req, res) => {
  const b = body(req);
  if (b.from && b.to) {
    return res.json(transition({
      state: String(b.from), to: String(b.to), facts: b.facts || {},
      approvals: b.approvals || [], author: b.author || null,
      value: b.value === undefined ? null : b.value,
      signatoryLimits: b.signatoryLimits || {},
      by: b.by || null,
    }));
  }
  if (!b.gate) return res.status(400).json({ error: "Either a gate, or a from and a to, is required." });
  res.json(evaluate(String(b.gate), b.facts || {}, {
    approvals: b.approvals || [], author: b.author || null,
    value: b.value === undefined ? null : b.value,
    signatoryLimits: b.signatoryLimits || {},
  }));
});

/** GET /api/l7/gate/remaining — what a bid in a given state must still pass. */
router.get("/gate/remaining", (req, res) => {
  const from = String(req.query.from || "DISCOVERED");
  const to = String(req.query.to || "CLOSED");
  const pursuing = req.query.pursuing !== "false";
  const gates = remainingGates(from, to, { pursuing });
  if (!gates) return res.status(400).json({ error: `There is no route from ${from} to ${to}.` });
  res.json({ from, to, pursuing, path: gateRoute(from, to, { pursuing }), gates: gates.map((g) => ({ id: g.id, name: g.name, exitArtefact: g.exitArtefact })) });
});

/** POST /api/l7/claims — gate GE-EV-01 against posted claims and evidence. */
router.post("/claims", (req, res) => {
  const b = body(req);
  // THE VALIDITY LOG IS WRITTEN AS A BY-PRODUCT OF THE CHECK, not as a
  // separate discipline somebody has to remember. An accreditation claim in a
  // public procurement is a statement whose truth is fixed at the deadline,
  // and evidence is renewed as a matter of routine — so the expiry that was
  // on record on the day has to survive the renewal that replaced it.
  const logged = b.log === false
    ? null
    : logRegistry(b.evidence || [], { by: req.user?.name || "unattributed" });
  res.json({
    gate: checkClaims({
      claims: b.claims || [], evidence: b.evidence || [],
      bidId: b.bidId || null, deadline: b.deadline,
    }),
    lapsing: b.horizon ? lapsingBy(b.evidence || [], b.horizon) : null,
    invalid: (b.evidence || []).map(validateEvidence).filter((v) => !v.ok).map((v) => ({ id: v.record.id, faults: v.faults })),
    logged,
  });
});

/**
 * GET /api/l7/evidence/:id/valid-on — was it valid on the day we submitted?
 *
 * Two readings, and the second is the one a client asks for: what the record
 * said on the day, and what is believed now. They differ exactly when the
 * item has been renewed, and the submission was made against the first.
 */
router.get("/evidence/:id/valid-on", (req, res) => {
  if (!req.query.deadline) return res.status(400).json({ error: "A deadline is required — validity is a question about a specific day." });
  const r = validOn(req.params.id, { deadline: String(req.query.deadline), knownAt: req.query.knownAt || null });
  if (!r.ok) return res.status(400).json(r);
  res.json({ ...r, history: validityHistory(req.params.id) });
});

/** POST /api/l7/evidence/log — record or renew an item's validity. */
router.post("/evidence/log", (req, res) => {
  const b = body(req);
  const r = logRegistry(b.evidence || [], { by: b.by || req.user?.name || null, at: b.at || null });
  res.status(r.ok ? 201 : 400).json(r);
});

/** POST /api/l7/submission — the eight pre-submission hard gates. */
router.post("/submission", (req, res) => {
  const b = body(req);
  const gates = hardGates(b);
  const manifest = b.buildManifest ? buildManifest(b) : null;
  res.json({ gates, manifest });
});

/** POST /api/l7/estimate — the nine assurance tests and the mark-up walk. */
router.post("/estimate", (req, res) => {
  const b = body(req);
  res.json({
    assurance: assure(b),
    markup: detectDoubleMarkup({ items: b.items || [], layers: b.layers || [] }),
    riskRelease: checkRiskRelease(b.riskReleases || []),
  });
});

/** POST /api/l7/compliance — the matrix, and what contradictions block. */
router.post("/compliance", (req, res) => {
  const b = body(req);
  res.json({
    matrix: matrix(b.requirements || [], b.world || {}),
    blocked: blockedBy(b.contradictions || []),
  });
});

/** POST /api/l7/bid — the bid or no-bid decision and its sensitivity. */
router.post("/bid", (req, res) => {
  const b = body(req);
  const econ = b.economics ? economics(b.economics) : null;
  const input = { factors: b.factors || [], economics: econ, thresholds: b.thresholds || {} };
  res.json({ score: score(input), sensitivity: sensitivity(input, b.step || 15) });
});

/** POST /api/l7/assurance — the review state and one independence check. */
router.post("/assurance", (req, res) => {
  const b = body(req);
  res.json({
    review: review({ findings: b.findings || [], lensesRun: b.lensesRun || [], independence: b.independence || {} }),
    independence: b.author && b.review ? checkIndependence({ author: b.author, review: b.review, lens: b.lens }) : null,
  });
});

/** POST /api/l7/lineage — why is this number, and what an addendum invalidates. */
router.post("/lineage", (req, res) => {
  const b = body(req);
  const nodes = b.nodes || [];
  const g = graph(nodes);
  res.json({
    validation: validateLineage(nodes),
    explain: b.nodeId ? explain(g, b.nodeId) : null,
    invalidated: b.changed ? invalidate(g, b.changed, b.at || null) : null,
    confidence: propagateConfidence(g),
  });
});

/**
 * GET /api/l7/acu — what the agents have actually cost.
 *
 * Read from the runs rather than estimated, and it will not convert an ACU
 * into a pound: an internal unit nobody can misread beats a confident figure
 * derived from a price list that changed last month.
 */
router.get("/acu", (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 90, 1), 400);
  const agentId = req.query.agent ? String(req.query.agent) : null;
  try {
    const spend = spendSummary({ days, agentId });
    res.json({
      ...spend,
      // The caps in force right now, so a run that stops is explainable and
      // so the far commoner case — no cap at all — is visible rather than
      // assumed. Metering is not capping and the page says which is which.
      budgets: PIPELINE_AGENT_IDS.map((id) => ({ agent: id, cap: budgetFor(id) })),
      anyCap: PIPELINE_AGENT_IDS.some((id) => budgetFor(id) !== null),
    });
  } catch (err) {
    res.status(500).json({ error: `The spend could not be read: ${err.message}` });
  }
});

/** GET /api/l7/acu/:runId — one run's cost, per pass and per model. */
router.get("/acu/run/:id", (req, res) => {
  const r = spendForRun(req.params.id);
  if (!r) return res.status(404).json({ error: "Run not found." });
  res.json(r);
});

/** POST /api/l7/acu/price — what a call would cost, before making it. */
router.post("/acu/price", (req, res) => {
  const b = body(req);
  const acu = priceCall(b.call || {}, DEFAULT_RATES);
  if (acu === null) {
    return res.status(400).json({
      error: "That call cannot be priced. An unpriced model is a refusal rather than a zero — a call costing nothing because nobody knew the rate is the one that never gets questioned.",
      rates: Object.keys(DEFAULT_RATES.models),
    });
  }
  const cap = b.cap === undefined ? null : Number(b.cap);
  res.json({
    acu,
    cheaperRoute: b.call && b.call.model ? downgradeFrom(b.call.model) : null,
    budget: cap === null ? { state: "uncapped", say: "no cap was supplied" } : budgetState(Number(b.spent || 0) + acu, cap),
  });
});

/* ---------------------------------------------------------------- L7.1 */

/** GET /api/l7/contract — the forms, the events, and what is being watched. */
router.get("/contract", (req, res) => {
  res.json({
    forms: Object.values(FORMS).map((f) => ({ id: f.id, name: f.name, note: f.note, clauses: f.clauses.length })),
    events: EVENTS,
    watch: watchState(),
  });
});

/** GET /api/l7/contract/:project — one project's contract and its deadlines. */
router.get("/contract/:project", (req, res) => {
  const held = contractFor(req.params.project);
  if (!held) return res.status(404).json({ error: "No contract is recorded for that project. That is a gap in the record, not an absence of obligation." });
  res.json({
    contract: held.row,
    clauses: held.graph.live,
    validation: validateClauses(held.graph),
    events: eventsFor(req.params.project),
    live: contractLive(req.params.project),
  });
});

/** POST /api/l7/contract — record the contract a project is under. */
router.post("/contract", (req, res) => {
  const b = body(req);
  const r = setContract({ project: b.project, form: b.form, amendments: b.amendments || [], by: b.by, note: b.note });
  res.status(r.ok ? 201 : 400).json(r);
});

/** POST /api/l7/contract/event — record a site event and when awareness arose. */
router.post("/contract/event", (req, res) => {
  const b = body(req);
  const r = recordEvent({ project: b.project, event: b.event, awareAt: b.awareAt, by: b.by, detail: b.detail, notifiedAt: b.notifiedAt });
  res.status(r.ok ? 201 : 400).json(r);
});

/** POST /api/l7/contract/compare — the same event, put to several contracts. */
router.post("/contract/compare", (req, res) => {
  const b = body(req);
  const forms = Array.isArray(b.forms) && b.forms.length ? b.forms : Object.keys(FORMS);
  res.json(clauseCompare(forms, { event: b.event, trigger: b.trigger, awareAt: b.awareAt, now: b.now || null }));
});

/* ---------------------------------------------------------------- L7.4 */

/** GET /api/l7/facts — the bitemporal store's own integrity and late list. */
router.get("/facts", (req, res) => {
  res.json({
    integrity: factIntegrity(),
    late: lateInformation({ entity: req.query.entity || null, thresholdDays: Number(req.query.thresholdDays) || 14 }),
  });
});

/** GET /api/l7/facts/:entity — every version, both axes. */
router.get("/facts/:entity", (req, res) => {
  res.json({
    entity: req.params.entity,
    history: history(req.params.entity, req.query.field || null),
    snapshot: snapshot({ entity: req.params.entity, validAt: req.query.validAt || null, knownAt: req.query.knownAt || null }),
  });
});

/** POST /api/l7/facts — record one. Always an insert. */
router.post("/facts", (req, res) => {
  const b = body(req);
  const r = b.correction
    ? correctFact({ entity: b.entity, field: b.field, value: b.value, validFrom: b.validFrom, validTo: b.validTo, at: b.at, by: b.by, source: b.source, reason: b.reason })
    : recordFact({ entity: b.entity, field: b.field, value: b.value, validFrom: b.validFrom, validTo: b.validTo, at: b.at, by: b.by, source: b.source, note: b.note });
  res.status(r.ok ? 201 : 400).json(r);
});

/** POST /api/l7/facts/reconstruct — what was known when the decision was taken. */
router.post("/facts/reconstruct", (req, res) => {
  const b = body(req);
  if (b.project && b.eventId) return res.json(awarenessOn({ project: b.project, eventId: b.eventId, decisionAt: b.decisionAt }));
  res.json(reconstruct({ entity: b.entity, field: b.field, decisionAt: b.decisionAt }));
});

/** GET /api/l7/facts/as-of/:entity — one field, at a moment, as known at a moment. */
router.get("/facts/as-of/:entity", (req, res) => {
  res.json(asOf({ entity: req.params.entity, field: req.query.field, validAt: req.query.validAt || null, knownAt: req.query.knownAt || null }));
});

/* ---------------------------------------------------------------- L7.6 */

/** GET /api/l7/memory — the partitions, what is in them, what is waiting. */
router.get("/memory", (req, res) => {
  res.json({
    ...memoryStateOf(),
    pending: pending(),
    lessons: recall({ partition: "lessons" }).entries,
    policy: recall({ partition: "policy" }).entries,
  });
});

/** GET /api/l7/memory/prior/:key — a calibrated prior and what stands behind it. */
router.get("/memory/prior/:key", (req, res) => {
  res.json(prior(req.params.key, { minObservations: Number(req.query.min) || 5 }));
});

/** POST /api/l7/memory/propose — the only route into institutional memory. */
router.post("/memory/propose", (req, res) => {
  const b = body(req);
  const r = propose({ key: b.key, value: b.value, evidence: b.evidence || [], by: b.by, kind: b.kind || "human", source: b.source, scope: b.scope, rationale: b.rationale });
  res.status(r.ok ? 201 : 400).json(r);
});

/** POST /api/l7/memory/promote — a decision, by a named person with the role. */
router.post("/memory/promote", (req, res) => {
  const b = body(req);
  const r = promote({ entryId: b.entryId, decision: b.decision || "APPROVED", by: b.by, role: b.role, reason: b.reason });
  res.status(r.ok ? 200 : 400).json(r);
});

/** POST /api/l7/memory/remember — write to a non-institutional partition. */
router.post("/memory/remember", (req, res) => {
  const b = body(req);
  const r = remember({ partition: b.partition, key: b.key, value: b.value, scope: b.scope, by: b.by, kind: b.kind || "human", source: b.source });
  res.status(r.ok ? 201 : 400).json(r);
});

/** POST /api/l7/memory/retire — withdraw a lesson that has stopped being true. */
router.post("/memory/retire", (req, res) => {
  const b = body(req);
  const r = retire({ entryId: b.entryId, by: b.by, role: b.role, reason: b.reason });
  res.status(r.ok ? 200 : 400).json(r);
});

/* ---------------------------------------------------------------- L7.7 */

/** GET /api/l7/quality — every target, and the mechanism it now has. */
router.get("/quality", (req, res) => {
  res.json(qualityMeasurements());
});

/** GET /api/l7/ports — what is bound, what is not ported, and what conforms. */
router.get("/ports", (req, res) => {
  res.json({
    ...portStateOf(),
    // The conformance run, executed on this request rather than remembered.
    conformance: ["clock", "store", "files"].map((id) => {
      const r = portCompareSync(id, ...adaptersFor(id));
      return { port: id, ok: r.ok, steps: r.steps, say: r.say, faults: r.faults };
    }),
  });
});

/** POST /api/l7/route — which model route, and the refusal for arithmetic. */
router.post("/route", (req, res) => {
  const b = body(req);
  if (!b.taskClass) return res.status(400).json({ error: "taskClass is required." });
  res.json(modelRoute(String(b.taskClass), b.options || {}));
});

/** POST /api/l7/run — is this a bounded run, and should it stop? */
router.post("/run", (req, res) => {
  const b = body(req);
  const created = createRun(b.run || {});
  res.json({
    created,
    stop: created.ok ? shouldStop({ run: created.run, state: b.state || {} }) : null,
    estimate: b.estimate ? estimateAcu(b.estimate) : null,
    budget: created.ok ? budgetState(Number(b.spent || 0), created.run.maxCostAcu) : null,
  });
});

export default router;
