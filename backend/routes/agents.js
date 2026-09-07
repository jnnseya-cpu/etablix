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
import { AGENT_BRIEFS, publicProvider, setProvider, testProvider, runAgent, assertInputs, PIPELINE_AGENTS, DIAGNOSTIC_STAGES } from "../lib/ai.js";
import { acceptDocuments } from "../lib/uploads.js";
import { extractAll } from "../lib/extract.js";
import { visualBlocks, visualPreamble } from "../lib/visual.js";

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

/** Keep the run log bounded. */
function trimLog() {
  const log = collection("agentTasks");
  if (log.length > 300) {
    log.splice(0, log.length - 300);
    persist();
  }
}

/**
 * Work a pipeline run to completion in the background.
 *
 * Progress is written to the run row rather than held in memory, so the
 * console shows which pass is in flight, and a run that fails at pass
 * four says which four passes were done rather than reporting nothing.
 */
async function workPipeline(runId, agent, inputs, runBy, visualFiles = []) {
  const stage = ({ key, state, index }) => {
    const run = collection("agentTasks").find((r) => r.id === runId);
    if (!run) return;
    const stages = (run.stages || []).map((st, i) =>
      st.key === key ? { ...st, state, at: Date.now() } : i < index ? { ...st, state: st.state === "pending" ? "done" : st.state } : st
    );
    update("agentTasks", runId, { stages, stageKey: key, stageState: state });
  };

  try {
    // Build the pages here rather than in the request, so a large
    // drawing set is read on the pipeline's time and not the browser's.
    const named = (f) => f.originalname || f.filename;
    const { blocks, seen } = await visualBlocks(
      visualFiles,
      new Map(visualFiles.map((f) => [named(f), "visual"])),
      new Map((collection("agentTasks").find((r) => r.id === runId)?.sources || []).map((sc) => [sc.name, sc.pages || 0]))
    );
    if (seen.length) {
      const run = collection("agentTasks").find((r) => r.id === runId);
      update("agentTasks", runId, {
        sources: (run?.sources || []).map((src) => {
          const v = seen.find((x) => x.name === src.name);
          return v ? { ...src, sent: v.sent, kind: v.kind || null, error: v.reason || src.error } : src;
        }),
      });
    }
    const r = await runAgent(agent.id, inputs, runBy, {
      onStage: stage,
      visuals: { blocks, preamble: visualPreamble(seen) },
    });
    update("agentTasks", runId, {
      output: r.output,
      model: r.model,
      usage: r.usage,
      truncated: Boolean(r.truncated),
      notes: r.notes || [],
      status: "awaiting_approval",
      finishedAt: Date.now(),
    });
    await emit("agent.run_completed", {
      vars: { item: agent.name, outcome: `finished and is awaiting approval — "${collection("agentTasks").find((x) => x.id === runId)?.title || ""}"` },
    }).catch(() => {});
  } catch (err) {
    update("agentTasks", runId, {
      status: "failed",
      error: String(err?.message || err).slice(0, 400),
      finishedAt: Date.now(),
    });
  }
}

/**
 * A run left "running" by a restart can never finish — the work was in
 * the dead process. Fail them on boot rather than leaving a spinner that
 * turns forever.
 */
export function failOrphanedRuns() {
  let n = 0;
  for (const r of collection("agentTasks")) {
    if (r.status !== "running") continue;
    update("agentTasks", r.id, {
      status: "failed",
      error: "The server restarted while this run was in progress. Nothing was lost except the run itself — start it again.",
      finishedAt: Date.now(),
    });
    n += 1;
  }
  return n;
}

router.post("/:id/run", acceptDocuments, async (req, res) => {
  const agent = AI_AGENTS.find((a) => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: "Unknown agent." });
  try {
    // Multipart form: inputs arrive as a JSON field alongside any files.
    let inputs = req.body?.inputs || {};
    if (typeof inputs === "string") {
      try {
        inputs = JSON.parse(inputs);
      } catch {
        return res.status(400).json({ error: "Invalid run inputs." });
      }
    }

    // Uploaded tender packs, PQQs and drawings register text are read in
    // full and appended to the agent's main document field, so the source
    // reaches the agent whole rather than as a partial paste.
    let sources = [];
    let visualFiles = [];
    if (req.files?.length) {
      const brief = AGENT_BRIEFS[agent.id];
      const target = brief?.fields.find((f) => f.type === "textarea" && f.required)?.name
        || brief?.fields.find((f) => f.type === "textarea")?.name;
      const { text, files } = await extractAll(req.files);
      sources = files;
      if (text && target) {
        inputs[target] = [String(inputs[target] || "").trim(), text].filter(Boolean).join("\n\n");
      }
      // Drawings, printed programmes and scans do not become text — they
      // are shown to the model as pages. Keep them aside for the pipeline.
      const byName = new Map(files.map((f) => [f.name, f.route]));
      visualFiles = req.files.filter((f) => byName.get(f.originalname || f.filename) === "visual");
      const unreadable = files.filter((f) => f.error);
      if (!text && !visualFiles.length && unreadable.length) {
        return res.status(400).json({ error: `Could not read ${unreadable[0].name}: ${unreadable[0].error}` });
      }
    }

    const common = {
      agent: agent.id,
      agentName: agent.name,
      title: String(req.body?.title || "").trim().slice(0, 140) || `${agent.name} — ${new Date().toLocaleDateString("en-GB")}`,
      inputs,
      sources: sources.map((f) => ({
        name: f.name,
        chars: f.chars || 0,
        pages: f.pages || null,
        route: f.route || null,
        error: f.error || null,
      })),
      runBy: req.user.name,
    };

    // A pipeline agent makes six calls and takes several minutes. Holding
    // the request open for that is a timeout waiting to happen, so the run
    // is recorded first, answered immediately, and worked in the
    // background with each pass saved as it lands.
    if (PIPELINE_AGENTS.has(agent.id)) {
      assertInputs(agent.id, inputs);
      const run = insert("agentTasks", {
        ...common,
        output: "",
        status: "running",
        startedAt: Date.now(),
        stages: DIAGNOSTIC_STAGES.map((st) => ({ ...st, state: "pending" })),
      });
      trimLog();
      res.status(202).json({ run: publicRun(run, true) });
      workPipeline(run.id, agent, inputs, req.user.name, visualFiles);
      return;
    }

    const { output, model, usage, truncated } = await runAgent(agent.id, inputs, req.user.name);
    const run = insert("agentTasks", {
      ...common,
      output,
      model,
      usage,
      truncated: Boolean(truncated),
      status: "awaiting_approval",
    });
    trimLog();
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
