/**
 * The Agent OS API, and the three things an idempotent write has to get right.
 *
 * Every engine in `lib/agentos/` is a pure function over inputs, which is how
 * twenty-eight acceptance tests became twenty-eight exact assertions. This is
 * where those functions meet stored state, and the specification is specific
 * about what that costs.
 *
 * ONE · THE SAME KEY AND THE SAME PAYLOAD RETURNS THE ORIGINAL OUTCOME. Not
 * a fresh success — the ORIGINAL one, replayed. A retry after a timeout must
 * not create a second command, and it must not report a different result from
 * the first attempt either, because the caller cannot tell which attempt it
 * is reading.
 *
 * TWO · THE SAME KEY AND A CHANGED PAYLOAD IS A CONFLICT, NOT AN UPDATE. A
 * client that reuses a key for different content has a bug, and accepting the
 * second quietly writes the wrong thing under a reference the first caller
 * holds. 409.
 *
 * THREE · A WRITE TO AN EXISTING AGGREGATE CARRIES THE VERSION IT EXPECTS.
 * Without it two concurrent edits both succeed and the second silently
 * discards the first. 409 again, and the current version is returned so the
 * caller can re-read rather than guess.
 *
 * AND TENANT, ACTOR AND AUTHORITY ARE NEVER TAKEN FROM THE PAYLOAD. The
 * specification says so and it is the one rule here that is a security
 * boundary rather than a correctness one: a body that can name its own actor
 * can name any actor.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { collection, insert, update } from "../lib/store.js";

import { peakConcurrency, storedAutonomy, bedRequirement, welfareSplit } from "../lib/agentos/capacity.js";
import { pricingEnvelope, earnedValue } from "../lib/agentos/commercial.js";
import { checkOffHire, offHireStatement } from "../lib/agentos/offhire.js";
import { mayExecute } from "../lib/agentos/autonomy.js";
import { checkEvidenceJurisdiction, requirementProfile } from "../lib/agentos/jurisdiction.js";
import { assetReceipt, checkGate, openService } from "../lib/agentos/mobilisation.js";
import { supplierEligibility, checkAtDispatch } from "../lib/agentos/eligibility.js";
import { checkCutover } from "../lib/agentos/cutover.js";
import { reserve, reserveMany, treasury } from "../lib/agentos/treasury.js";
import { classifyObservation, slaPosition, emergencyCallout } from "../lib/agentos/sla.js";
import { determineTax } from "../lib/agentos/tax.js";
import { queueIntent, reconcileQueue, applyInbound, recordDispatch } from "../lib/agentos/outbox.js";
import { orchestrationState, WORKFLOWS, TASK_STATES } from "../lib/agentos/orchestration.js";
import { SERVICE_CODES, SERVICE_CATEGORIES, serviceCode, categoryOf, fromLegacyFamily } from "../../shared/servicecodes.js";

const router = Router();
router.use(requireAuth);

const body = (req) => (req.body && typeof req.body === "object" ? req.body : {});
const stable = (v) => JSON.stringify(v ?? null);

/** The typed commands this API accepts. An unlisted type is 422, never guessed. */
const COMMANDS = {
  PEAK_CONCURRENCY: (p) => peakConcurrency(p),
  STORED_AUTONOMY: (p) => storedAutonomy(p),
  BED_REQUIREMENT: (p) => bedRequirement(p),
  WELFARE_SPLIT: (p) => welfareSplit(p),
  PRICING_ENVELOPE: (p) => pricingEnvelope(p),
  EARNED_VALUE: (p) => earnedValue(p),
  CHECK_OFF_HIRE: (p) => checkOffHire(p),
  MAY_EXECUTE: (p) => mayExecute(p),
  CHECK_JURISDICTION: (p) => checkEvidenceJurisdiction(p),
  JURISDICTION_PROFILE: (p) => requirementProfile(p.jurisdiction, p.activity),
  ASSET_RECEIPT: (p) => assetReceipt(p),
  CHECK_GATE: (p) => checkGate(p.gate, p.evidence || {}),
  OPEN_SERVICE: (p) => openService(p),
  SUPPLIER_ELIGIBILITY: (p) => supplierEligibility(p),
  CHECK_AT_DISPATCH: (p) => checkAtDispatch(p),
  CHECK_CUTOVER: (p) => checkCutover(p),
  DETERMINE_TAX: (p) => determineTax(p),
  CLASSIFY_OBSERVATION: (p) => classifyObservation(p),
  SLA_POSITION: (p) => slaPosition(p),
  EMERGENCY_CALLOUT: (p) => emergencyCallout(p),
  RECORD_DISPATCH: (p) => recordDispatch(p),
  ORCHESTRATION_STATE: (p) => orchestrationState(p),
};

/** The project record, or null. Tenant scoping is by the authenticated user. */
function projectOf(id) {
  return collection("agentosProjects").find((p) => p.id === String(id)) || null;
}

/* ── POST /v1/projects ─────────────────────────────────────────────────── */
router.post("/v1/projects", (req, res) => {
  const b = body(req);
  const name = String(b.name ?? "").trim();
  if (!name) return res.status(422).json({ error: "A project needs a name." });
  const model = String(b.appointmentModel ?? "").toUpperCase();
  if (!["A", "B", "C"].includes(model)) {
    return res.status(422).json({ error: "appointmentModel must be A, B or C. An unknown model fails closed rather than defaulting." });
  }
  const row = insert("agentosProjects", {
    name,
    appointmentModel: model,
    jurisdiction: b.jurisdiction ? String(b.jurisdiction) : null,
    // NEVER from the payload.
    createdBy: req.user.name,
    version: 1,
    workflow: "W01",
  });
  res.status(201).json({ project: { id: row.id, name: row.name, appointmentModel: row.appointmentModel, version: row.version, workflow: row.workflow } });
});

/* ── POST /v1/projects/:id/evidence ────────────────────────────────────── */
router.post("/v1/projects/:id/evidence", (req, res) => {
  const p = projectOf(req.params.id);
  if (!p) return res.status(403).json({ error: "No such project, or no access to it." });
  const b = body(req);
  if (!b.locator) return res.status(422).json({ error: "Evidence needs a locator." });
  const row = insert("agentosEvidence", {
    projectId: p.id,
    locator: String(b.locator),
    scope: b.scope ? String(b.scope) : null,
    jurisdiction: b.jurisdiction ? String(b.jurisdiction) : null,
    sourceTimestamp: b.sourceTimestamp ? String(b.sourceTimestamp) : null,
    // Unverified until something verifies it. An unknown signer, an invalid
    // date or an unavailable attachment stays visibly unverified.
    verification: "UNVERIFIED",
    registeredBy: req.user.name,
  });
  res.status(201).json({ evidence: { id: row.id, locator: row.locator, verification: row.verification } });
});

/* ── POST /v1/projects/:id/commands ───────────────────────────────────── */
router.post("/v1/projects/:id/commands", (req, res) => {
  const p = projectOf(req.params.id);
  if (!p) return res.status(403).json({ error: "No such project, or no access to it." });

  const b = body(req);
  const type = String(b.type ?? "");
  const run = COMMANDS[type];
  if (!run) {
    return res.status(422).json({ error: `"${type || "(none)"}" is not a command this API accepts.`, accepts: Object.keys(COMMANDS).sort() });
  }

  const key = String(req.get("Idempotency-Key") ?? b.idempotencyKey ?? "").trim();
  if (!key) return res.status(422).json({ error: "A write needs an Idempotency-Key." });

  const payload = b.payload ?? {};
  const prior = collection("agentosCommands").find((c) => c.projectId === p.id && c.key === key);
  if (prior) {
    // Same key, same payload: the ORIGINAL outcome, replayed.
    if (prior.payloadHash === stable(payload) && prior.type === type) {
      return res.status(200).json({ replayed: true, command: { id: prior.id, type: prior.type }, result: prior.result });
    }
    // Same key, different payload: a client bug, and accepting it writes the
    // wrong thing under a reference the first caller holds.
    return res.status(409).json({
      error: "That Idempotency-Key was used for a different payload. A key is not a transaction id; reusing one for different content would write the wrong thing under a reference the first caller holds.",
      original: { type: prior.type, at: prior.createdAt },
    });
  }

  // expectedVersion on an existing aggregate, so two concurrent edits cannot
  // both succeed with the second discarding the first.
  if (b.target && b.target.expectedVersion !== undefined) {
    const want = Number(b.target.expectedVersion);
    if (want !== Number(p.version)) {
      return res.status(409).json({
        error: `The project is at version ${p.version} and the command expected ${want}. Re-read and resend rather than guessing.`,
        currentVersion: p.version,
      });
    }
  }

  let result;
  try { result = run(payload); }
  catch (err) { return res.status(422).json({ error: `The command could not be computed: ${String(err.message).slice(0, 200)}` }); }

  const row = insert("agentosCommands", {
    projectId: p.id, key, type, payloadHash: stable(payload),
    // The actor is the authenticated user and nothing else.
    actor: req.user.name,
    result,
  });

  // A policy hold is a recorded outcome with a reason, not an error.
  if (result && result.ok === false) {
    return res.status(200).json({
      command: { id: row.id, type },
      held: true,
      reason: result.reason ?? result.failure?.code ?? null,
      remediation: result.say ?? null,
      result,
    });
  }
  res.status(201).json({ command: { id: row.id, type }, result });
});

/* ── GET /v1/projects/:id/workflows/:wf ───────────────────────────────── */
router.get("/v1/projects/:id/workflows/:wf", (req, res) => {
  const p = projectOf(req.params.id);
  if (!p) return res.status(403).json({ error: "No such project, or no access to it." });
  const wf = WORKFLOWS.find((w) => w.id === String(req.params.wf).toUpperCase());
  if (!wf) return res.status(422).json({ error: `"${req.params.wf}" is not one of W01 to W10.`, workflows: WORKFLOWS.map((w) => w.id) });
  const commands = collection("agentosCommands").filter((c) => c.projectId === p.id);
  res.json({
    workflow: wf.id, name: wf.name, owner: wf.owner,
    projectVersion: p.version,
    history: commands.slice(-20).map((c) => ({ id: c.id, type: c.type, at: c.createdAt, actor: c.actor, held: c.result?.ok === false })),
    nextAction: commands.length ? null : `no command has run in ${wf.id} yet`,
  });
});

/* ── GET /v1/projects/:id/trace/:commandId ───────────────────────────── */
router.get("/v1/projects/:id/trace/:commandId", (req, res) => {
  const p = projectOf(req.params.id);
  if (!p) return res.status(403).json({ error: "No such project, or no access to it." });
  const c = collection("agentosCommands").find((x) => x.id === String(req.params.commandId) && x.projectId === p.id);
  if (!c) return res.status(403).json({ error: "No such command on this project." });
  res.json({ command: { id: c.id, type: c.type, at: c.createdAt, actor: c.actor }, result: c.result, projectVersion: p.version });
});

/* ── GET /v1/catalogue ───────────────────────────────────────────────── */
router.get("/v1/catalogue", (_req, res) => {
  res.json({
    categories: SERVICE_CATEGORIES.map((c) => ({ id: c.id, name: c.name, codes: c.codes })),
    codes: SERVICE_CODES,
    workflows: WORKFLOWS,
    taskStates: TASK_STATES,
    commands: Object.keys(COMMANDS).sort(),
  });
});

/* ── POST /v1/projects/:id/connectors/:connector/events ──────────────── */
router.post("/v1/projects/:id/connectors/:connector/events", (req, res) => {
  const p = projectOf(req.params.id);
  if (!p) return res.status(403).json({ error: "No such project, or no access to it." });
  const b = body(req);
  const ledgerRow = collection("agentosInbound").find((x) => x.projectId === p.id);
  const seen = ledgerRow ? ledgerRow.seen : { eventIds: [], versions: {} };
  const out = applyInbound(seen, {
    eventId: b.eventId, aggregateId: b.aggregateId, aggregateVersion: b.aggregateVersion, data: b.data,
  });
  if (!out.ok) return res.status(422).json({ error: out.say });
  if (ledgerRow) update("agentosInbound", ledgerRow.id, { seen: out.seen });
  else insert("agentosInbound", { projectId: p.id, seen: out.seen });
  res.status(out.applied ? 202 : 200).json({
    applied: out.applied, duplicate: Boolean(out.duplicate), superseded: Boolean(out.superseded), say: out.say,
  });
});

export default router;
export { COMMANDS as AGENTOS_COMMANDS };
