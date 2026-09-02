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
 * Adaptive extraction — real platform responses vary in envelope and
 * field naming, so find the payload wherever it lives and normalise the
 * fields the Control Desk renders. A payload we truly cannot read falls
 * back to workspace data; it must never break the Control Desk.
 */
function firstArray(obj, names = [], depth = 0) {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== "object" || depth > 2) return null;
  for (const k of [...names, "data", "items", "results", "rows", "list"]) {
    if (Array.isArray(obj[k])) return obj[k];
  }
  for (const k of [...names, "data", "items", "results"]) {
    if (obj[k] && typeof obj[k] === "object") {
      const inner = firstArray(obj[k], names, depth + 1);
      if (inner) return inner;
    }
  }
  return null;
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

const normRisk = (r, i) => {
  const probability = num(r.probability ?? r.likelihood ?? r.prob);
  const impact = num(r.impact ?? r.consequence ?? r.severity_score);
  return {
    ref: r.ref || r.reference || r.code || (r.id ? `RSK-${String(r.id).slice(0, 6).toUpperCase()}` : `RSK-${i + 1}`),
    title: r.title || r.name || r.summary || r.description || "Untitled risk",
    category: r.category || r.type || "—",
    probability: probability ?? "—",
    impact: impact ?? "—",
    score: num(r.score ?? r.riskScore ?? r.risk_score) ?? (probability && impact ? probability * impact : 0),
    status: r.status || r.state || "open",
    mitigation: r.mitigation || r.mitigationPlan || r.mitigation_plan || r.response || "",
    owner: r.owner || r.ownerName || r.owner_name || r.assignee || "—",
  };
};

const normAgent = (a, i) => ({
  type: a.type || a.agentType || a.agent_type || a.slug || a.code || a.key || String(a.id ?? `agent-${i + 1}`),
  name: a.name || a.title || a.type || `Agent ${i + 1}`,
  description: a.description || a.summary || a.about || "",
  acuCost: num(a.acuCost ?? a.acu_cost ?? a.cost ?? a.acu) ?? "—",
});

const normUsage = (u) => ({
  workspace: u.workspace || u.workspaceName || u.workspace_name || "VERYX workspace",
  env: u.env || u.environment || "live",
  scopes: Array.isArray(u.scopes) ? u.scopes : [],
  monthlyQuota: num(u.monthlyQuota ?? u.monthly_quota ?? u.quota) ?? 0,
  used: num(u.used ?? u.callsUsed ?? u.calls_used ?? u.usage) ?? 0,
  acuBalance: num(u.acuBalance ?? u.acu_balance ?? u.acu) ?? 0,
});

async function fromPlatform(path, fallback, extract) {
  if (!isConnected("veryx")) return { source: WORKSPACE, value: fallback() };
  try {
    const body = await platformFetch("veryx", path);
    const value = extract(body);
    if (value == null) {
      const keys = body && typeof body === "object" ? Object.keys(body).slice(0, 6).join(", ") : typeof body;
      throw new Error(`unexpected response shape (top-level: ${keys})`);
    }
    return { source: LIVE, value };
  } catch (err) {
    return { source: { ...WORKSPACE, note: `Live fetch failed: ${err.message}` }, value: fallback() };
  }
}

const extractRisks = (p) => {
  const arr = firstArray(p, ["risks"]);
  return arr ? arr.map(normRisk) : null;
};
const extractAgents = (p) => {
  const arr = firstArray(p, ["agents"]);
  return arr ? arr.map(normAgent) : null;
};

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
  const { source, value } = await fromPlatform(
    "/risks",
    () => [...collection("risks")].sort((a, b) => b.score - a.score),
    extractRisks
  );
  res.json({ source, risks: [...value].sort((a, b) => (b.score || 0) - (a.score || 0)) });
}));

/** GET /api/veryx/agents — AI agent catalogue with ACU cost. */
router.get("/agents", safe(async (req, res) => {
  const { source, value } = await fromPlatform("/agents", () => collection("agents"), extractAgents);
  // Run history is always the local audit trail, whichever source ran the agent.
  res.json({ source, agents: value, runs: collection("agentRuns") });
}));

/** POST /api/veryx/agents/:type/run — run an agent from the console. */
router.post("/agents/:type/run", safe(async (req, res) => {
  if (isConnected("veryx")) {
    try {
      // The platform may read the agent type from the path or from the
      // body (under different key spellings) — send it every way, and
      // fall back to the collection-style run endpoint if the per-agent
      // path is not how this deployment routes runs.
      const type = req.params.type;
      const runPayload = { type, agent_type: type, agentType: type, agent: type };
      // Deployments route runs differently — try each known shape until
      // one answers. Only "wrong path/agent" errors move to the next
      // candidate; real failures (quota, ACU, auth) surface immediately.
      const candidates = [`/agents/${encodeURIComponent(type)}/run`, "/agents/run", "/runs"];
      const routeMiss = /http 404|unknown agent|not found|no route|cannot post|method not allowed|http 405/i;
      let body;
      let lastErr;
      for (const path of candidates) {
        try {
          body = await platformFetch("veryx", path, { method: "POST", timeoutMs: 20000, body: runPayload });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (!routeMiss.test(err.message)) throw err;
        }
      }
      if (lastErr) throw lastErr;
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
      const raw = body?.data && typeof body.data === "object" ? body.data : body || {};
      const u = normUsage(raw.usage && typeof raw.usage === "object" ? raw.usage : raw);
      const { keyPreview } = publicIntegration("veryx");
      return res.json({
        source: LIVE,
        keys: [{ id: "live", keyPreview: keyPreview || "vx_…", ...u }],
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
  const { source, value: risks } = await fromPlatform("/risks", () => collection("risks"), extractRisks);
  let acuBalance;
  let apiCallsUsed;
  if (source.mode === "live") {
    try {
      const body = await platformFetch("veryx", "/usage");
      const raw = body?.data && typeof body.data === "object" ? body.data : body || {};
      const usage = normUsage(raw.usage && typeof raw.usage === "object" ? raw.usage : raw);
      acuBalance = usage.acuBalance;
      apiCallsUsed = usage.used;
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
