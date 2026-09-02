/**
 * AI-agent workforce — the live console. Any employee can run an agent
 * on real inputs; every run lands "awaiting approval" and a named human
 * approves or rejects it (the approval boundary, enforced in fact, not
 * just described). Provider connection is administrator-only, stored
 * server-side and masked, exactly like the platform keys.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../../shared/constants.js";
import { collection, insert, update, remove, persist } from "../lib/store.js";
import { emit } from "../lib/comms.js";
import { AI_AGENTS } from "../lib/organisation.js";
import { AGENT_BRIEFS, publicProvider, setProvider, testProvider, runAgent } from "../lib/ai.js";

const router = Router();
router.use(requireAuth);

const admin = requireRole(ROLES.ADMIN);

const publicRun = ({ inputs, output, ...meta }, full = false) =>
  full ? { ...meta, inputs, output } : { ...meta, preview: String(output || "").slice(0, 180) };

router.get("/", (req, res) => {
  const runs = [...collection("agentTasks")].reverse().slice(0, 60);
  res.json({
    provider: publicProvider(),
    agents: AI_AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      desk: a.desk,
      boundary: a.boundary,
      backing: a.backing,
      fields: AGENT_BRIEFS[a.id]?.fields || [],
    })),
    runs: runs.map((r) => publicRun(r)),
  });
});

router.get("/runs/:id", (req, res) => {
  const run = collection("agentTasks").find((r) => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found." });
  res.json({ run: publicRun(run, true) });
});

router.put("/provider", admin, (req, res) => {
  setProvider({ apiKey: req.body?.apiKey, model: req.body?.model });
  res.json({ provider: publicProvider() });
});

router.post("/provider/test", admin, async (req, res) => {
  const result = await testProvider();
  res.json({ result, provider: publicProvider() });
});

router.post("/:id/run", async (req, res) => {
  const agent = AI_AGENTS.find((a) => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: "Unknown agent." });
  try {
    const { output, model, usage, truncated } = await runAgent(agent.id, req.body?.inputs || {}, req.user.name);
    const run = insert("agentTasks", {
      agent: agent.id,
      agentName: agent.name,
      title: String(req.body?.title || "").trim().slice(0, 140) || `${agent.name} — ${new Date().toLocaleDateString("en-GB")}`,
      inputs: req.body?.inputs || {},
      output,
      model,
      usage,
      truncated: Boolean(truncated),
      status: "awaiting_approval",
      runBy: req.user.name,
    });
    // Keep the run log bounded.
    const log = collection("agentTasks");
    if (log.length > 300) {
      log.splice(0, log.length - 300);
      persist();
    }
    res.status(201).json({ run: publicRun(run, true) });
  } catch (err) {
    res.status(err.message.includes("required") ? 400 : 502).json({ error: err.message });
  }
});

router.post("/runs/:id/decision", async (req, res) => {
  const run = collection("agentTasks").find((r) => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found." });
  if (run.status !== "awaiting_approval") return res.status(409).json({ error: "This run has already been decided." });
  const approve = req.body?.decision === "approve";
  if (!approve && req.body?.decision !== "reject") return res.status(400).json({ error: "Decision must be approve or reject." });
  update("agentTasks", run.id, {
    status: approve ? "approved" : "rejected",
    decidedBy: req.user.name,
    decidedAt: Date.now(),
    decisionNote: String(req.body?.note || "").trim().slice(0, 500),
  });
  await emit("agent.run_completed", {
    vars: { item: run.agentName, outcome: `${approve ? "approved" : "rejected"} by ${req.user.name} — "${run.title}"` },
  }).catch(() => {});
  res.json({ run: publicRun(collection("agentTasks").find((r) => r.id === run.id)) });
});

router.delete("/runs/:id", admin, (req, res) => {
  const row = remove("agentTasks", req.params.id);
  if (!row) return res.status(404).json({ error: "Run not found." });
  res.json({ deleted: true });
});

export default router;
