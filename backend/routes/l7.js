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
import { hardGates, build as buildManifest, MANIFEST_FIELDS } from "../lib/l7/manifest.js";
import { assure, detectDoubleMarkup, checkRiskRelease, RATE_COMPONENTS } from "../lib/l7/estimating.js";
import { matrix, CONTRADICTION_CLASSES, blockedBy } from "../lib/l7/compliance.js";
import { score, sensitivity, economics, FACTORS } from "../lib/l7/bidscore.js";
import { LENSES, SEVERITIES, review, checkIndependence } from "../lib/l7/assurance.js";
import { graph, explain, invalidate, propagateConfidence, validate as validateLineage } from "../lib/l7/lineage.js";
import { DEFAULT_RATES, estimate as estimateAcu, budgetState, budgetFor, priceCall, downgradeFrom } from "../lib/l7/acu.js";
import { summary as spendSummary, forRun as spendForRun } from "../lib/l7/spend.js";
import { STOP_RULES, create as createRun, shouldStop } from "../lib/l7/agentrun.js";
import { PIPELINE_AGENTS } from "../lib/ai.js";

/** The agents a budget can be set against, from the registry rather than a list. */
const PIPELINE_AGENT_IDS = [...PIPELINE_AGENTS].sort();

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
  res.json({
    gate: checkClaims({
      claims: b.claims || [], evidence: b.evidence || [],
      bidId: b.bidId || null, deadline: b.deadline,
    }),
    lapsing: b.horizon ? lapsingBy(b.evidence || [], b.horizon) : null,
    invalid: (b.evidence || []).map(validateEvidence).filter((v) => !v.ok).map((v) => ({ id: v.record.id, faults: v.faults })),
  });
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
