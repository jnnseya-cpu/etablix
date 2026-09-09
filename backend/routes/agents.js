/**
 * AI-agent workforce — the live console. Any employee can run an agent
 * on real inputs; every run lands "awaiting approval" and a named human
 * approves or rejects it (the approval boundary, enforced in fact, not
 * just described). Provider connection is administrator-only, stored
 * server-side and masked, exactly like the platform keys.
 */

import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../../shared/constants.js";
import { collection, insert, update, remove, persist } from "../lib/store.js";
import { emit } from "../lib/comms.js";
import { AI_AGENTS } from "../lib/organisation.js";
import { AGENT_BRIEFS, publicProvider, setProvider, testProvider, runAgent, assertInputs, PIPELINE_AGENTS, stagesFor } from "../lib/ai.js";
import { acceptDocuments, UPLOAD_DIR } from "../lib/uploads.js";
import { extractAll } from "../lib/extract.js";
import { readPack, savePack, savePass, deletePack, sweepPacks } from "../lib/runstore.js";
import { documentForAgent } from "./docs.js";
import { visualBlocks, visualPreamble } from "../lib/visual.js";

const router = Router();
router.use(requireAuth);

const admin = requireRole(ROLES.ADMIN);

/**
 * `document` says which document an approved run becomes, so the run view can
 * offer to draft it. It used to be hardcoded to the diagnostic in the browser,
 * which meant an approved requirements package, village package, review or
 * evaluation had no way out of the run box except being retyped by hand.
 */
const publicRun = ({ inputs, output, ...meta }, full = false) => {
  const document = documentForAgent(meta.agent);
  return full
    ? { ...meta, document, inputs, output }
    : { ...meta, document, preview: String(output || "").slice(0, 180) };
};

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

/**
 * Keep the run log bounded — and the packs with it.
 *
 * A row that falls off the end takes its document text and its passes
 * with it, otherwise the disk keeps them for ever for a run nobody can
 * open any more.
 */
function trimLog() {
  const log = collection("agentTasks");
  if (log.length > 300) {
    const dropped = log.splice(0, log.length - 300);
    persist();
    for (const r of dropped) deletePack(r.id);
  }
}

/**
 * Work a pipeline run to completion in the background.
 *
 * Progress is written to the run row rather than held in memory, so the
 * console shows which pass is in flight, and a run that fails at pass
 * four says which four passes were done rather than reporting nothing.
 */
async function workPipeline(runId, agent, inputs, runBy, visualFiles = [], resume = {}) {
  const stage = ({ key, state, index, text }) => {
    const run = collection("agentTasks").find((r) => r.id === runId);
    if (!run) return;
    const stages = (run.stages || []).map((st, i) =>
      st.key === key ? { ...st, state, at: Date.now() } : i < index ? { ...st, state: st.state === "pending" ? "done" : st.state } : st
    );
    // THE PASS ITSELF IS WRITTEN DOWN, not just the fact that it happened.
    // Six passes of reasoning over the whole document set is several minutes
    // and real money; losing five of them because the container was recreated
    // mid-run — which a deploy does — is not something to shrug at.
    const patch = { stages, stageKey: key, stageState: state };
    if (state === "done" && text) {
      // The text goes to the run's pack file; the row records only THAT
      // it landed. Six passes of reasoning inside a row of db.json meant
      // every unrelated write in the system re-serialised megabytes.
      savePass(runId, key, text);
      patch.passesHeld = Object.keys(readPack(runId).passes || {});
    }
    update("agentTasks", runId, patch);
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
      resume,
      documents: readPack(runId).documents || [],
    });
    update("agentTasks", runId, {
      output: r.output,
      model: r.model,
      usage: r.usage,
      truncated: Boolean(r.truncated),
      notes: r.notes || [],
      // The tender pack's scope-to-price reconciliation, kept on the run so
      // the issue certificate prints the same result the desk approved
      // against rather than a second one worked out later.
      ...(r.packCheck ? { packCheck: r.packCheck } : {}),
      status: "awaiting_approval",
      finishedAt: Date.now(),
      passesHeld: [],
    });
    // The finished report supersedes the passes it was assembled from.
    savePack(runId, { passes: {} });
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
    const held = Object.keys(readPack(r.id).passes || {}).length;
    update("agentTasks", r.id, {
      status: "failed",
      interrupted: true,
      error: held
        ? `The server restarted while this run was in progress. ${held} completed pass${held === 1 ? "" : "es"} ${held === 1 ? "was" : "were"} saved — resume it and only the unfinished passes are run again.`
        : "The server restarted before the first pass finished. Start it again.",
      finishedAt: Date.now(),
    });
    n += 1;
  }
  return n;
}

/**
 * Start a run from a plain file list rather than from a multipart request.
 *
 * Exported because the client portal collects the information pack against
 * its requirement checklist, and the diagnostic then has to run on THOSE
 * files. Asking a client to upload a pack and then asking ourselves to
 * upload it again is not one process, it is two with a person in between —
 * and the person is where the version drift comes from.
 *
 * `files` are {originalname, path, mimetype} — the shape multer produces and
 * the shape extractFile reads, so a stored file and an uploaded one travel
 * the same path and get the same treatment.
 */
export async function startPipelineRun({ agentId, inputs = {}, title, files = [], runBy, engagementId = null }) {
  const agent = AI_AGENTS.find((a) => a.id === agentId);
  if (!agent) throw new Error("Unknown agent.");
  const merged = { ...inputs };
  let sources = [], visualFiles = [], documents = [];
  if (files.length) {
    // The document text is NOT folded into one input field any more. It
    // used to be appended to `programme` — every document, whatever it
    // was — while the other seven fields said "Supplied — see the
    // attached documents". The model was then asked about the layout and
    // handed a field that said nothing, with the layout drawing buried
    // in the middle of a programme. Each document now travels as itself,
    // under the requirement it was supplied against.
    const out = await extractAll(files);
    sources = out.files;
    documents = out.documents;
    const byName = new Map(out.files.map((f) => [f.name, f.route]));
    visualFiles = files.filter((f) => byName.get(f.originalname || f.filename) === "visual");
  }
  assertInputs(agent.id, merged, documents);
  const run = insert("agentTasks", {
    agent: agent.id,
    agentName: agent.name,
    title: String(title || `${agent.name} — ${new Date().toLocaleDateString("en-GB")}`).slice(0, 140),
    inputs: merged,
    sources: sources.map(sourceRow),
    runBy,
    engagementId,
    output: "",
    status: "running",
    startedAt: Date.now(),
    // Was DIAGNOSTIC_STAGES for every pipeline agent, so a second one would
    // have reported the diagnostic's six stage names while running its own.
    stages: stagesFor(agent.id).map((st) => ({ ...st, state: "pending" })),
  });
  savePack(run.id, { documents, passes: {} });
  trimLog();
  workPipeline(run.id, agent, merged, runBy, visualFiles);
  return run;
}

/**
 * What the run row records about one source document.
 *
 * `stored` and `type` are on it because a resumed run rebuilds the
 * drawing pages from the files on disk, and without the stored name it
 * cannot find them: a resumed run then wrote its report having looked at
 * no drawings at all, and said nothing about it.
 */
const sourceRow = (f) => ({
  name: f.name,
  chars: f.chars || 0,
  charsRead: f.charsRead ?? f.chars ?? 0,
  cut: Boolean(f.cut),
  pages: f.pages || null,
  route: f.route || null,
  field: f.field || null,
  label: f.label || null,
  stored: f.stored || null,
  type: f.type || null,
  error: f.error || null,
});

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
    let documents = [];
    if (req.files?.length) {
      const out = await extractAll(req.files);
      sources = out.files;
      documents = out.documents;
      // Drawings, printed programmes and scans do not become text — they
      // are shown to the model as pages. Keep them aside for the pipeline.
      const byName = new Map(out.files.map((f) => [f.name, f.route]));
      visualFiles = req.files.filter((f) => byName.get(f.originalname || f.filename) === "visual");
      const unreadable = out.files.filter((f) => f.error);
      if (!documents.length && !visualFiles.length && unreadable.length) {
        return res.status(400).json({ error: `Could not read ${unreadable[0].name}: ${unreadable[0].error}` });
      }
    }

    const common = {
      agent: agent.id,
      agentName: agent.name,
      title: String(req.body?.title || "").trim().slice(0, 140) || `${agent.name} — ${new Date().toLocaleDateString("en-GB")}`,
      inputs,
      sources: sources.map(sourceRow),
      runBy: req.user.name,
    };

    // A pipeline agent makes six calls and takes several minutes. Holding
    // the request open for that is a timeout waiting to happen, so the run
    // is recorded first, answered immediately, and worked in the
    // background with each pass saved as it lands.
    if (PIPELINE_AGENTS.has(agent.id)) {
      assertInputs(agent.id, inputs, documents);
      const run = insert("agentTasks", {
        ...common,
        output: "",
        status: "running",
        startedAt: Date.now(),
        stages: stagesFor(agent.id).map((st) => ({ ...st, state: "pending" })),
      });
      savePack(run.id, { documents, passes: {} });
      trimLog();
      res.status(202).json({ run: publicRun(run, true) });
      workPipeline(run.id, agent, inputs, req.user.name, visualFiles);
      return;
    }

    const { output, model, usage, truncated } = await runAgent(agent.id, inputs, req.user.name, { documents });
    const run = insert("agentTasks", {
      ...common,
      output,
      model,
      usage,
      truncated: Boolean(truncated),
      status: "awaiting_approval",
    });
    savePack(run.id, { documents, passes: {} });
    trimLog();
    res.status(201).json({ run: publicRun(run, true) });
  } catch (err) {
    res.status(err.message.includes("required") ? 400 : 502).json({ error: err.message });
  }
});

/**
 * POST /api/agents/runs/:id/resume — finish an interrupted run.
 *
 * A deploy recreates the container, and a run in flight dies with it. Every
 * pass that had completed is on the run row, so resuming runs only what is
 * missing: the same report, at the cost of the passes that were actually
 * lost rather than all six.
 *
 * The visual pages are rebuilt from the client's files, which are still on
 * disk — they were never the part that was lost.
 */
router.post("/runs/:id/resume", async (req, res) => {
  const run = collection("agentTasks").find((r) => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found." });
  if (run.status === "running") return res.status(409).json({ error: "That run is already going." });
  if (run.status === "awaiting_approval") return res.status(409).json({ error: "That run already finished." });
  const agent = AI_AGENTS.find((a) => a.id === run.agent);
  if (!agent || !PIPELINE_AGENTS.has(agent.id)) {
    return res.status(400).json({ error: "Only a pipeline run can be resumed." });
  }
  const passes = readPack(run.id).passes || {};
  if (!Object.keys(passes).length) {
    return res.status(400).json({ error: "No completed pass was saved from that run — start it again rather than resuming it." });
  }

  // The files the run read are still where the portal put them.
  const visualFiles = [];
  const missingDrawings = [];
  for (const src of run.sources || []) {
    if (src.route !== "visual" && src.kind !== "visual") continue;
    const full = src.stored ? path.join(UPLOAD_DIR, path.basename(src.stored)) : null;
    if (full && fs.existsSync(full)) visualFiles.push({ originalname: src.name, path: full, mimetype: src.type });
    else missingDrawings.push(src.name);
  }
  // A resumed run that quietly looked at no drawings is worse than one
  // that refuses: the report reads exactly the same and is built on less.
  if (missingDrawings.length) {
    return res.status(409).json({
      error: `The drawings this run read are no longer on disk (${missingDrawings.join(", ")}). Resuming would produce the same report having looked at none of them. Start the run again with the pack.`,
    });
  }

  update("agentTasks", run.id, {
    status: "running",
    error: null,
    interrupted: false,
    resumedAt: Date.now(),
    resumedFrom: Object.keys(passes).length,
    passesHeld: Object.keys(passes),
    stages: (run.stages || []).map((st) => (passes[st.key] ? { ...st, state: "done" } : { ...st, state: "pending" })),
  });
  res.status(202).json({ run: publicRun(collection("agentTasks").find((r) => r.id === run.id), true), resumingFrom: Object.keys(passes).length });
  workPipeline(run.id, agent, run.inputs || {}, run.runBy || "resumed", visualFiles, passes);
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
  deletePack(row.id);
  res.json({ deleted: true });
});

/** At boot: drop packs whose run is gone, so the disk follows the log. */
export function sweepRunPacks() {
  return sweepPacks(collection("agentTasks").map((r) => r.id));
}

export default router;
