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
import { collection, insert, persist } from "../lib/store.js";

const router = Router();

/** Resolve and meter the API key; attach it to the request. */
function requireApiKey(requiredScope) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const raw = header.startsWith("Bearer ")
      ? header.slice(7)
      : req.headers["x-api-key"];
    const apiKey = collection("apiKeys").find((k) => k.key === raw);
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
      "/tasks": { get: { summary: "List schedule tasks (optionally by ?project_id=)." } },
      "/risks": { get: { summary: "Read the risk register, highest score first." } },
      "/agents": { get: { summary: "List the AI agents you can run and their ACU cost." } },
      "/agents/{type}/run": { post: { summary: "Run an AI agent. Consumes prepaid ACU." } },
      "/usage": { get: { summary: "Your monthly quota, usage and ACU balance." } },
    },
  });
});

export default router;
