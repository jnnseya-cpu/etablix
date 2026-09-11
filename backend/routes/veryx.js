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
import { collection, insert, update, remove, recordLedger, id as newId } from "../lib/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isConnected, platformFetch, publicIntegration } from "../lib/platforms.js";
import { portfolio } from "../lib/portfolio.js";
import { workload, allocationRows, people, DEPARTMENTS } from "../lib/resources.js";
import { ACCESS } from "../../shared/constants.js";
import { validateRisk, RISK_CATEGORIES, RISK_STATUS, API_SCOPES, SCOPE_NAMES, writeScopes } from "../lib/veryx.js";
import { nextRef } from "../lib/construx.js";
import { emitWebhook } from "../lib/webhooks.js";
import crypto from "node:crypto";

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
  acuCost: num(a.acuCost ?? a.acu_per_run ?? a.acu_cost ?? a.cost ?? a.acu) ?? "—",
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
      // Platform contract (from the VERYX codebase): the agent type
      // lives in the URL path, the body is { input: {...} }, and the
      // result comes back as { execution_id, status, acu_consumed,
      // duration_ms, output, error } under the data envelope.
      const type = req.params.type;
      // A page rendered before the current build can send a run with no
      // agent type — stop it here rather than bothering the platform.
      if (!type || type === "undefined" || type === "null") {
        return res.status(400).json({ error: "No agent type reached the server — refresh the Control Desk (Ctrl+Shift+R) and run agents from the VERYX tab's Run now buttons." });
      }
      const body = await platformFetch("veryx", `/agents/${encodeURIComponent(type)}/run`, {
        method: "POST",
        timeoutMs: 65000, // the platform allows a run up to 60s
        body: { input: { invoked_from: "etablix-control-desk" } },
      });
      const r = body.data || body || {};
      const outputNote =
        r.error ||
        (typeof r.output === "string" ? r.output : r.output ? JSON.stringify(r.output).slice(0, 300) : "") ||
        "Run executed on the VERYX platform.";
      const run = insert("agentRuns", {
        agentType: type,
        agentName: r.agent || type,
        acuCost: r.acu_consumed ?? null,
        triggeredBy: req.user.name,
        status: r.status || "completed",
        summary: `${outputNote}${r.duration_ms ? ` (${r.duration_ms} ms · ${r.acu_consumed ?? "?"} ACU)` : ""}`,
        source: "veryxjnn.com",
      });
      return res.status(201).json({ run, source: LIVE });
    } catch (err) {
      // A bare 404 means the live platform build predates the public
      // run endpoint — the route exists in the VERYX codebase, so the
      // fix is a VERYX redeploy, not anything on this side.
      if (/http 404/i.test(err.message)) {
        return res.status(502).json({
          error:
            "The live VERYX platform doesn't serve the agent-run endpoint yet — its latest build (which has it) hasn't been deployed to veryxjnn.com. Deploy VERYX and this button works; until then, run agents inside veryxjnn.com itself.",
        });
      }
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
    // A revoked key stays in the list with its usage: the calls it made are
    // the only record it existed, and a key that vanishes takes its own
    // audit trail with it.
    revoked: k.revoked === true,
    revokedAt: k.revokedAt || null,
    revokedBy: k.revokedBy || null,
    createdBy: k.createdBy || null,
    reason: k.reason || null,
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

/**
 * GET /portfolio — the portfolio lens across every project at once.
 * Always workspace-derived: these are ETABLIX's own delivery records,
 * not something the VERYX platform holds on our behalf.
 */
router.get("/portfolio", (req, res) => res.json(portfolio()));

/**
 * GET /resources — the workload rollup, the allocation list, and the
 * people and projects an allocation can be made against.
 */
router.get("/resources", (req, res) => {
  res.json({
    workload: workload(),
    allocations: allocationRows(),
    people: people(),
    departments: DEPARTMENTS,
    projects: collection("projects").map((p) => ({ id: p.id, code: p.code, name: p.name })),
  });
});

/** POST /resources/allocations — commit a person's hours to a project. */
router.post("/resources/allocations", requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  const userId = String(req.body?.userId || "").trim();
  const projectId = String(req.body?.projectId || "").trim();
  const hours = Number(req.body?.hours);
  const note = String(req.body?.note || "").trim().slice(0, 200);

  if (!people().some((p) => p.id === userId)) return res.status(400).json({ error: "Choose an active employee." });
  if (!collection("projects").some((p) => p.id === projectId)) return res.status(400).json({ error: "Choose a project." });
  if (!Number.isFinite(hours) || hours <= 0 || hours > 400) {
    return res.status(400).json({ error: "Allocated hours must be between 1 and 400 a month." });
  }

  const existing = collection("allocations").find((a) => a.userId === userId && a.projectId === projectId);
  const row = existing
    ? update("allocations", existing.id, { hours: Math.round(hours), note, by: req.user.name, at: Date.now() })
    : insert("allocations", { userId, projectId, hours: Math.round(hours), note, by: req.user.name, at: Date.now() });
  res.status(existing ? 200 : 201).json({ allocation: row, replaced: Boolean(existing) });
});

/** DELETE /resources/allocations/:id — release the hours. */
router.delete("/resources/allocations/:id", requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  const row = remove("allocations", req.params.id);
  if (!row) return res.status(404).json({ error: "Allocation not found." });
  res.json({ deleted: true });
});

/* ------------------------------------------------- the risk write path */
//
// The register was read-only, so every risk on it came from the seed. Writing
// to it goes through validateRisk, which computes the score from probability
// and impact rather than accepting one: the register is sorted on score and
// every review works down that order, so a hand-typed score that drifts from
// its own assessment puts the row in the wrong place in the only ordering
// anybody uses.

/** GET /risks/vocabulary — the categories and statuses a risk may carry. */
router.get("/risks/vocabulary", (req, res) => {
  res.json({
    categories: RISK_CATEGORIES,
    statuses: RISK_STATUS,
    scale: { min: 1, max: 5, note: "score is probability × impact, computed rather than entered" },
  });
});

/** POST /risks — raise one. */
router.post("/risks", requireRole(...ACCESS.DELIVERY_FINANCE), safe(async (req, res) => {
  const check = validateRisk(req.body || {}, { projects: collection("projects") });
  if (!check.ok) return res.status(400).json({ error: check.faults[0], faults: check.faults });
  const record = { ...check.record };
  if (!record.ref) record.ref = nextRef(collection("risks"), "ref", "RSK");
  const row = insert("risks", { id: newId(), ...record, createdAt: Date.now(), createdBy: req.user.name });
  recordLedger("veryx.risk.created", row.ref, req.user.name, `${row.title} (score ${row.score})`);
  await emitWebhook("veryx.risk.created", { id: row.id, ...record });
  res.status(201).json({ risk: row });
}));

/** PATCH /risks/:id — revise one. Validated on the merged result. */
router.patch("/risks/:id", requireRole(...ACCESS.DELIVERY_FINANCE), safe(async (req, res) => {
  const existing = collection("risks").find((r) => r.id === req.params.id || r.ref === req.params.id);
  if (!existing) return res.status(404).json({ error: "Risk not found." });
  // The submitted score is dropped before merging rather than compared: on a
  // patch that changes probability or impact, the stored score is the OLD
  // product, and comparing against it would refuse every legitimate
  // re-assessment. What is refused is a score sent IN the patch that
  // disagrees with the numbers sent with it.
  const patch = { ...(req.body || {}) };
  const merged = { ...existing, ...patch };
  if (patch.score === undefined) delete merged.score;
  const check = validateRisk(merged, { projects: collection("projects") });
  if (!check.ok) return res.status(400).json({ error: check.faults[0], faults: check.faults });
  const row = update("risks", existing.id, {
    ...check.record,
    ref: existing.ref,
    updatedAt: Date.now(),
    updatedBy: req.user.name,
  });
  recordLedger("veryx.risk.updated", row.ref, req.user.name, Object.keys(patch).join(", ") || "no fields");
  await emitWebhook("veryx.risk.updated", { id: row.id, ...check.record });
  res.json({ risk: row });
}));

/* ------------------------------------------------------- key minting */
//
// The Platform API grew write scopes, and until now a key could only arrive
// in the seed — so the write scopes would have been documented, validated,
// tested and unreachable. Minting is admin-only, the key is shown once, and
// the scopes are the catalogue rather than free text: a key carrying a scope
// string no endpoint checks is a permission nobody can audit.

/** GET /keys/scopes — the catalogue, so a person minting can see the writes. */
router.get("/keys/scopes", requireRole("admin"), (req, res) => {
  res.json({ scopes: API_SCOPES });
});

/** POST /keys — mint a Platform API key. Shown once. */
router.post("/keys", requireRole("admin"), (req, res) => {
  const workspace = String(req.body?.workspace || "").trim();
  const env = String(req.body?.env || "").trim() || "production";
  const wanted = Array.isArray(req.body?.scopes) ? req.body.scopes.map(String) : [];
  const quota = Number(req.body?.monthlyQuota);
  const acu = Number(req.body?.acuBalance ?? 0);

  const faults = [];
  if (workspace.length < 3) faults.push("Name the workspace this key belongs to.");
  if (!["production", "sandbox"].includes(env)) faults.push("env must be production or sandbox.");
  if (wanted.length === 0) faults.push("A key with no scopes can do nothing. Choose at least one.");
  const unknown = wanted.filter((sc) => !SCOPE_NAMES.includes(sc));
  if (unknown.length) faults.push(`Unknown scope(s): ${unknown.join(", ")}.`);
  if (!Number.isFinite(quota) || quota < 1 || quota > 1000000) faults.push("Set a monthly call quota between 1 and 1,000,000.");
  if (!Number.isFinite(acu) || acu < 0) faults.push("ACU balance cannot be negative.");
  // A production key that can write and has never been reviewed is the one
  // that ends up in somebody's script, so the reason is required rather than
  // optional, exactly as it is for a RAG override.
  const reason = String(req.body?.reason || "").trim().slice(0, 400);
  const writes = writeScopes(wanted);
  if (writes.length && reason.length < 5) {
    faults.push(`This key can write (${writes.join(", ")}). Say what it is for.`);
  }
  if (faults.length) return res.status(400).json({ error: faults[0], faults });

  const key = `vx_${env === "sandbox" ? "test" : "live"}_${crypto.randomBytes(20).toString("hex")}`;
  const row = insert("apiKeys", {
    id: newId(), key, workspace, env, scopes: wanted,
    monthlyQuota: Math.round(quota), used: 0, acuBalance: Math.round(acu),
    createdAt: Date.now(), createdBy: req.user.name, reason: reason || null, revoked: false,
  });
  recordLedger("veryx.key.minted", row.id, req.user.name,
    `${workspace} (${env}) · ${wanted.join(", ")}${writes.length ? ` · WRITES: ${writes.join(", ")}` : ""}`);
  res.status(201).json({
    key,
    keyWarning: "Shown once. It is stored for matching and never returned again.",
    apiKey: { ...row, key: `${key.slice(0, 11)}…` },
    writeScopes: writes,
  });
});

/**
 * DELETE /keys/:id — revoke.
 *
 * The row is emptied of its scopes and marked revoked rather than removed:
 * the usage it accrued and the reason it was minted are the only record that
 * it existed, and a key that vanishes takes its own audit trail with it. The
 * key string is overwritten so it can never match again.
 */
router.delete("/keys/:id", requireRole("admin"), (req, res) => {
  const row = collection("apiKeys").find((k) => k.id === req.params.id);
  if (!row) return res.status(404).json({ error: "Key not found." });
  if (row.revoked) return res.json({ revoked: true, alreadyRevoked: true });
  update("apiKeys", row.id, {
    key: `revoked_${row.id}`,
    scopes: [],
    revoked: true,
    revokedAt: Date.now(),
    revokedBy: req.user.name,
  });
  recordLedger("veryx.key.revoked", row.id, req.user.name, `${row.workspace} (${row.env})`);
  res.json({ revoked: true });
});

export default router;
