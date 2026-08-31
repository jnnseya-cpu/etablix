/**
 * VERYX internal API — the OS view for employees: risk register, AI agent
 * catalogue and runs, and platform usage.
 *
 * Two data sources, chosen automatically per request:
 *   LIVE       — when an administrator has connected the real VERYX
 *                Platform API (veryxjnn.com) in Team → Platform
 *                connections, data is fetched from the platform.
 *   WORKSPACE  — otherwise (or if the platform call fails), the local
 *                workspace data is served, and the response says so.
 *
 * The public, key-authenticated implementation of the same contract
 * lives in veryx-public.js (/api/public/v1).
 */

import { Router } from "express";
import { collection, insert } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";
import { isConnected, platformFetch, publicIntegration } from "../lib/platforms.js";

const router = Router();
router.use(requireAuth);

const LIVE = { mode: "live", platform: "veryxjnn.com" };
const WORKSPACE = { mode: "workspace" };

/**
 * Fetch from the platform when connected; otherwise (or on failure, or if
 * the response shape is not what we expect) fall back to workspace data —
 * a surprising live payload must never break the Control Desk.
 */
async function fromPlatform(path, fallback, validate = Array.isArray) {
  if (!isConnected("veryx")) return { source: WORKSPACE, value: fallback() };
  try {
    const body = await platformFetch("veryx", path);
    const value = body?.data ?? body;
    if (!validate(value)) throw new Error("unexpected response shape");
    return { source: LIVE, value };
  } catch (err) {
    return { source: { ...WORKSPACE, note: `Live fetch failed: ${err.message}` }, value: fallback() };
  }
}

/** Route async handlers through a catch so a failure returns JSON, never a crash. */
const safe = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error("veryx route error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  });

/** GET /api/veryx/link — connection badge for every employee. */
router.get("/link", (req, res) => {
  const { label, connected, lastTest } = publicIntegration("veryx");
  res.json({ label, connected, summary: lastTest?.summary || null });
});

/** GET /api/veryx/risks — risk register, highest score first. */
router.get("/risks", safe(async (req, res) => {
  const { source, value } = await fromPlatform("/risks", () =>
    [...collection("risks")].sort((a, b) => b.score - a.score)
  );
  res.json({ source, risks: value });
}));

/** GET /api/veryx/agents — AI agent catalogue with ACU cost. */
router.get("/agents", safe(async (req, res) => {
  const { source, value } = await fromPlatform("/agents", () => collection("agents"));
  // Run history is always the local audit trail, whichever source ran the agent.
  res.json({ source, agents: value, runs: collection("agentRuns") });
}));

/** POST /api/veryx/agents/:type/run — run an agent from the console. */
router.post("/agents/:type/run", safe(async (req, res) => {
  if (isConnected("veryx")) {
    try {
      const body = await platformFetch("veryx", `/agents/${encodeURIComponent(req.params.type)}/run`, {
        method: "POST",
        timeoutMs: 20000,
      });
      const platformRun = body.data || {};
      const run = insert("agentRuns", {
        agentType: req.params.type,
        agentName: platformRun.agentName || req.params.type,
        acuCost: platformRun.acuCost ?? null,
        triggeredBy: req.user.name,
        status: platformRun.status || "completed",
        summary: platformRun.summary || "Run executed on the VERYX platform.",
        source: "veryxjnn.com",
      });
      return res.status(201).json({ run, source: LIVE });
    } catch (err) {
      // 402 (out of ACU) and 429 (quota) from the platform surface as errors.
      return res.status(502).json({ error: err.message });
    }
  }
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
  res.status(201).json({ run, source: WORKSPACE });
}));

/** GET /api/veryx/usage — API key usage and ACU balances. */
router.get("/usage", safe(async (req, res) => {
  if (isConnected("veryx")) {
    try {
      const body = await platformFetch("veryx", "/usage");
      const u = body.data || {};
      const { keyPreview } = publicIntegration("veryx");
      return res.json({
        source: LIVE,
        keys: [
          {
            id: "live",
            keyPreview: keyPreview || "vx_…",
            workspace: u.workspace || "VERYX workspace",
            env: u.env || "live",
            scopes: u.scopes || [],
            monthlyQuota: u.monthlyQuota ?? 0,
            used: u.used ?? 0,
            acuBalance: u.acuBalance ?? 0,
          },
        ],
      });
    } catch (err) {
      // fall through to workspace keys below
    }
  }
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
  res.json({ source: WORKSPACE, keys });
}));

/** GET /api/veryx/summary — OS KPIs for the dashboard. */
router.get("/summary", safe(async (req, res) => {
  const { source, value: risks } = await fromPlatform("/risks", () => collection("risks"));
  let acuBalance;
  let apiCallsUsed;
  if (source.mode === "live") {
    try {
      const usage = (await platformFetch("veryx", "/usage")).data || {};
      acuBalance = usage.acuBalance ?? 0;
      apiCallsUsed = usage.used ?? 0;
    } catch {
      acuBalance = 0;
      apiCallsUsed = 0;
    }
  } else {
    const keys = collection("apiKeys");
    acuBalance = keys.reduce((s, k) => s + k.acuBalance, 0);
    apiCallsUsed = keys.reduce((s, k) => s + k.used, 0);
  }
  res.json({
    source,
    openRisks: risks.filter((r) => r.status === "open").length,
    topRiskScore: Math.max(0, ...risks.map((r) => r.score || 0)),
    agentRuns: collection("agentRuns").length,
    acuBalance,
    apiCallsUsed,
  });
}));

export default router;
