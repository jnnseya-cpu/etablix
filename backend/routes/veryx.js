/**
 * VERYX internal API — the OS view for employees: risk register, AI agent
 * catalogue and runs, and platform usage. The public, key-authenticated
 * Veryx Platform API lives in veryx-public.js (/api/public/v1).
 * All endpoints here require an authenticated employee session.
 */

import { Router } from "express";
import { collection, insert } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

/** GET /api/veryx/risks — risk register, highest score first. */
router.get("/risks", (req, res) => {
  const risks = [...collection("risks")].sort((a, b) => b.score - a.score);
  res.json({ risks });
});

/** GET /api/veryx/agents — AI agent catalogue with ACU cost. */
router.get("/agents", (req, res) => {
  res.json({ agents: collection("agents"), runs: collection("agentRuns") });
});

/** POST /api/veryx/agents/:type/run — run an agent from the console. */
router.post("/agents/:type/run", (req, res) => {
  const agent = collection("agents").find((a) => a.type === req.params.type);
  if (!agent) return res.status(404).json({ error: "Unknown agent type." });
  const run = insert("agentRuns", {
    agentType: agent.type,
    agentName: agent.name,
    acuCost: agent.acuCost,
    triggeredBy: req.user.name,
    status: "completed",
    summary: `${agent.name} completed across the active portfolio.`,
  });
  res.status(201).json({ run });
});

/** GET /api/veryx/usage — API key usage and ACU balances. */
router.get("/usage", (req, res) => {
  const keys = collection("apiKeys").map((k) => ({
    id: k.id,
    keyPreview: `${k.key.slice(0, 11)}…`,
    workspace: k.workspace,
    env: k.env,
    scopes: k.scopes,
    monthlyQuota: k.monthlyQuota,
    used: k.used,
    acuBalance: k.acuBalance,
  }));
  res.json({ keys });
});

/** GET /api/veryx/summary — OS KPIs for the dashboard. */
router.get("/summary", (req, res) => {
  const risks = collection("risks");
  const keys = collection("apiKeys");
  res.json({
    openRisks: risks.filter((r) => r.status === "open").length,
    topRiskScore: Math.max(0, ...risks.map((r) => r.score)),
    agentRuns: collection("agentRuns").length,
    acuBalance: keys.reduce((s, k) => s + k.acuBalance, 0),
    apiCallsUsed: keys.reduce((s, k) => s + k.used, 0),
  });
});

export default router;
