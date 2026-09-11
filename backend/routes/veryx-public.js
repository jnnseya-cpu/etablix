/**
 * VERYX Platform API — the public, key-authenticated surface documented at
 * /veryx#api. Local implementation of the same contract served at
 * https://www.veryxjnn.com/api/public/v1.
 *
 *   Auth      Authorization: Bearer vx_…   (or)   X-API-Key: vx_…
 *   Metering  every call counts against the key's monthly quota (429 over),
 *             agent runs draw down prepaid ACU (402 when empty)
 */

import { Router } from "express";
import { collection, insert, update, persist, recordLedger, id as newId } from "../lib/store.js";
import { validateRisk, API_SCOPES, RISK_CATEGORIES, RISK_STATUS } from "../lib/veryx.js";
import { validateActivity, nextRef } from "../lib/construx.js";
import { emitWebhook, subscribe, unsubscribe, subscriptions, EVENTS } from "../lib/webhooks.js";

const router = Router();

/** Resolve and meter the API key; attach it to the request. */
function requireApiKey(requiredScope) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const raw = header.startsWith("Bearer ")
      ? header.slice(7)
      : req.headers["x-api-key"];
    // A revoked key is excluded here rather than relying on its scopes being
    // emptied: /ping and /scopes require no scope, so an emptied key would
    // still have answered them and reported itself live.
    const apiKey = collection("apiKeys").find((k) => k.key === raw && k.revoked !== true);
    if (!apiKey) {
      return res.status(401).json({ error: "Invalid or missing API key." });
    }
    if (apiKey.used >= apiKey.monthlyQuota) {
      return res.status(429).json({ error: "Monthly API quota exceeded." });
    }
    if (requiredScope && !apiKey.scopes.includes(requiredScope)) {
      return res
        .status(403)
        .json({ error: `Key is missing required scope: ${requiredScope}` });
    }
    apiKey.used += 1;
    persist();
    req.apiKey = apiKey;
    next();
  };
}

/**
 * The writes.
 *
 * The API was read-mostly: six reads and one agent run. A platform API that
 * cannot write is a platform API somebody integrates once and then works
 * around, and the way they work around it is a person retyping into two
 * systems — which is the failure this product exists to remove.
 *
 * Three things make the write side safe to open:
 *
 *   · THE SAME VALIDATORS AS THE INTERNAL ROUTES. Not a second set. Two
 *     surfaces writing to one collection under different rules is how a
 *     register becomes a thing nobody trusts, and the API is the surface
 *     nobody is watching while it writes.
 *   · A SEPARATE SCOPE PER WRITE. write:risks does not carry write:tasks,
 *     and neither carries write:webhooks — which is the scope that can send
 *     project data off this system entirely.
 *   · AN ATTRIBUTED AUTHOR. Every row records the key's workspace, so a
 *     record written by a machine is never indistinguishable from one a
 *     person entered. "API · <workspace>" is not a decoration: it is the
 *     answer to who to ask about the row.
 */
const author = (key) => `API · ${key.workspace}`;

/** POST /risks — raise a risk. Scored by probability × impact. */
router.post("/risks", requireApiKey("write:risks"), async (req, res) => {
  const check = validateRisk(req.body || {}, { projects: collection("projects") });
  if (!check.ok) return res.status(422).json({ error: check.faults[0], faults: check.faults });
  const record = { ...check.record };
  if (!record.ref) record.ref = nextRef(collection("risks"), "ref", "RSK");
  const row = insert("risks", { id: newId(), ...record, createdAt: Date.now(), createdBy: author(req.apiKey) });
  recordLedger("veryx.risk.created", row.ref, author(req.apiKey), `${row.title} (score ${row.score})`);
  await emitWebhook("veryx.risk.created", { id: row.id, ...record });
  res.status(201).json({ data: row });
});

/** PATCH /risks/:id — revise one. Validated on the merged result. */
router.patch("/risks/:id", requireApiKey("write:risks"), async (req, res) => {
  const existing = collection("risks").find((r) => r.id === req.params.id || r.ref === req.params.id);
  if (!existing) return res.status(404).json({ error: "Risk not found." });
  const patch = { ...(req.body || {}) };
  const merged = { ...existing, ...patch };
  // The stored score is the OLD product. Comparing a re-assessment against it
  // would refuse every legitimate change of probability or impact, so the
  // stored score is dropped unless the caller sent one to be checked.
  if (patch.score === undefined) delete merged.score;
  const check = validateRisk(merged, { projects: collection("projects") });
  if (!check.ok) return res.status(422).json({ error: check.faults[0], faults: check.faults });
  const row = update("risks", existing.id, {
    ...check.record, ref: existing.ref, updatedAt: Date.now(), updatedBy: author(req.apiKey),
  });
  recordLedger("veryx.risk.updated", row.ref, author(req.apiKey), Object.keys(patch).join(", ") || "no fields");
  await emitWebhook("veryx.risk.updated", { id: row.id, ...check.record });
  res.json({ data: row });
});

/** POST /tasks — create a schedule activity. */
router.post("/tasks", requireApiKey("write:tasks"), async (req, res) => {
  const check = validateActivity(req.body || {}, { projects: collection("projects") });
  if (!check.ok) return res.status(422).json({ error: check.faults[0], faults: check.faults });
  const row = insert("schedule", { id: newId(), ...check.record, createdAt: Date.now(), createdBy: author(req.apiKey) });
  recordLedger("construx.schedule.created", row.id, author(req.apiKey), row.activity);
  await emitWebhook("construx.activity.created", { id: row.id, ...check.record });
  res.status(201).json({ data: row });
});

/** PATCH /tasks/:id — update one. */
router.patch("/tasks/:id", requireApiKey("write:tasks"), async (req, res) => {
  const existing = collection("schedule").find((r) => r.id === req.params.id);
  if (!existing) return res.status(404).json({ error: "Task not found." });
  const check = validateActivity({ ...existing, ...(req.body || {}) }, { projects: collection("projects") });
  if (!check.ok) return res.status(422).json({ error: check.faults[0], faults: check.faults });
  const row = update("schedule", existing.id, { ...check.record, updatedAt: Date.now(), updatedBy: author(req.apiKey) });
  recordLedger("construx.schedule.updated", row.id, author(req.apiKey), Object.keys(req.body || {}).join(", ") || "no fields");
  await emitWebhook("construx.activity.updated", { id: row.id, ...check.record });
  res.json({ data: row });
});

/** GET /webhooks — the events on offer and this workspace's subscriptions. */
router.get("/webhooks", requireApiKey("write:webhooks"), (req, res) => {
  const mine = subscriptions().filter((s) => s.createdBy === author(req.apiKey));
  res.json({ data: mine, events: EVENTS });
});

/** POST /webhooks — register an endpoint to be pushed events. */
router.post("/webhooks", requireApiKey("write:webhooks"), (req, res) => {
  const result = subscribe({
    url: req.body?.url,
    events: req.body?.events,
    description: req.body?.description,
    by: author(req.apiKey),
  });
  if (!result.ok) return res.status(422).json({ error: result.faults[0], faults: result.faults });
  res.status(201).json({
    data: { ...result.subscription, secret: undefined },
    secret: result.secret,
    signing: "HMAC-SHA256 over `${timestamp}.${rawBody}`, sent as x-etablix-signature with x-etablix-timestamp. Verify both: the signature proves who sent it, the timestamp is what stops a replay.",
    secretWarning: "Shown once and never readable again.",
  });
});

/** DELETE /webhooks/:id — stop sending. Only your own subscriptions. */
router.delete("/webhooks/:id", requireApiKey("write:webhooks"), (req, res) => {
  const mine = subscriptions().find((s) => s.id === req.params.id && s.createdBy === author(req.apiKey));
  // A key must not be able to deactivate a subscription another workspace or
  // an administrator created, so one it does not own reads as absent.
  if (!mine) return res.status(404).json({ error: "Subscription not found." });
  unsubscribe(req.params.id, author(req.apiKey));
  res.json({ data: { id: req.params.id, active: false } });
});

/** GET /scopes — what every scope grants, and which ones write. */
router.get("/scopes", requireApiKey(null), (req, res) => {
  res.json({
    data: API_SCOPES,
    held: req.apiKey.scopes,
    vocabulary: { riskCategories: RISK_CATEGORIES, riskStatuses: RISK_STATUS },
  });
});

/** GET /ping — verify a key and see the workspace it unlocks. */
router.get("/ping", requireApiKey(null), (req, res) => {
  res.json({
    ok: true,
    workspace: req.apiKey.workspace,
    env: req.apiKey.env,
    scopes: req.apiKey.scopes,
  });
});

/** GET /projects — list the workspace projects and portfolios. */
router.get("/projects", requireApiKey("read:projects"), (req, res) => {
  res.json({ data: collection("projects") });
});

/** GET /tasks — list schedule tasks (optionally by ?project_id=). */
router.get("/tasks", requireApiKey("read:tasks"), (req, res) => {
  let tasks = collection("schedule");
  if (req.query.project_id) {
    tasks = tasks.filter((t) => t.projectId === req.query.project_id);
  }
  res.json({ data: tasks });
});

/** GET /risks — read the risk register, highest score first. */
router.get("/risks", requireApiKey("read:risks"), (req, res) => {
  const risks = [...collection("risks")].sort((a, b) => b.score - a.score);
  res.json({ data: risks });
});

/** GET /agents — list the AI agents you can run and their ACU cost. */
router.get("/agents", requireApiKey("read:agents"), (req, res) => {
  res.json({ data: collection("agents") });
});

/** POST /agents/:type/run — run an AI agent. Consumes prepaid ACU. */
router.post("/agents/:type/run", requireApiKey("run:agents"), (req, res) => {
  const agent = collection("agents").find((a) => a.type === req.params.type);
  if (!agent) return res.status(404).json({ error: "Unknown agent type." });
  if (req.apiKey.acuBalance < agent.acuCost) {
    return res.status(402).json({
      error: "Insufficient ACU balance.",
      required: agent.acuCost,
      balance: req.apiKey.acuBalance,
    });
  }
  req.apiKey.acuBalance -= agent.acuCost;
  const run = insert("agentRuns", {
    agentType: agent.type,
    agentName: agent.name,
    acuCost: agent.acuCost,
    triggeredBy: `API · ${req.apiKey.workspace}`,
    status: "completed",
    summary: `${agent.name} completed across the active portfolio.`,
  });
  res.status(201).json({ data: run, acuBalance: req.apiKey.acuBalance });
});

/** GET /usage — your monthly quota, usage and ACU balance. */
router.get("/usage", requireApiKey("read:usage"), (req, res) => {
  const { monthlyQuota, used, acuBalance, workspace, env } = req.apiKey;
  res.json({ data: { workspace, env, monthlyQuota, used, acuBalance } });
});

/** GET /openapi.json — machine-readable contract. */
router.get("/openapi.json", (req, res) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "VERYX Platform API",
      version: "1.0.0",
      description:
        "Connect your own systems to the OS. Read projects, tasks and risks, run AI agents and track usage.",
    },
    servers: [{ url: "/api/public/v1" }],
    components: {
      securitySchemes: {
        bearer: { type: "http", scheme: "bearer" },
        apiKey: { type: "apiKey", in: "header", name: "X-API-Key" },
      },
    },
    security: [{ bearer: [] }, { apiKey: [] }],
    paths: {
      "/ping": { get: { summary: "Verify a key and see the workspace it unlocks." } },
      "/projects": { get: { summary: "List the workspace projects and portfolios." } },
      "/tasks": {
        get: { summary: "List schedule tasks (optionally by ?project_id=)." },
        post: { summary: "Create a schedule activity." },
      },
      "/risks": {
        get: { summary: "Read the risk register, highest score first." },
        post: { summary: "Raise a risk. The score is probability × impact, computed rather than accepted." },
      },
      "/agents": { get: { summary: "List the AI agents you can run and their ACU cost." } },
      "/agents/{type}/run": { post: { summary: "Run an AI agent. Consumes prepaid ACU." } },
      "/usage": { get: { summary: "Your monthly quota, usage and ACU balance." } },
      "/scopes": { get: { summary: "What every scope grants, and which ones write." } },
      "/risks/{id}": { patch: { summary: "Revise a risk. Validated on the merged result." } },
      "/tasks/{id}": { patch: { summary: "Update a schedule activity." } },
      "/webhooks/{id}": { delete: { summary: "Deactivate one of your own subscriptions." } },
      "/webhooks": {
        get: { summary: "List your webhook subscriptions and the events on offer." },
        post: { summary: "Register an endpoint. The signing secret is returned once." },
      },
    },
    "x-scopes": API_SCOPES,
    "x-webhook-events": EVENTS,
    "x-webhook-signature": "HMAC-SHA256 hex over `${timestamp}.${rawBody}`, in x-etablix-signature with x-etablix-timestamp. Reject anything older than 300 seconds: the signature proves the sender, the timestamp is what stops a replay.",
  });
});

export default router;
