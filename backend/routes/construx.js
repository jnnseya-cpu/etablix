/**
 * CONSTRUX API — project delivery: portfolio, schedules, cost control,
 * RFIs, and the manual RAG override a delivery manager can set on a
 * project when the performance indices do not know the whole story.
 * All endpoints require an authenticated employee session.
 */

import { Router } from "express";
import { collection, update } from "../lib/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ACCESS } from "../../shared/constants.js";
import { RAG_OPTIONS } from "../lib/portfolio.js";
import { publicIntegration } from "../lib/platforms.js";

const router = Router();
router.use(requireAuth);

function findProject(id) {
  return collection("projects").find((p) => p.id === id || p.code === id);
}

/** GET /api/construx/projects — the live portfolio. */
/** GET /api/construx/link — connection badge for every employee. */
router.get("/link", (req, res) => {
  const { label, connected, lastTest } = publicIntegration("construx");
  res.json({ label, connected, summary: lastTest?.summary || null });
});

router.get("/projects", (req, res) => {
  res.json({ projects: collection("projects") });
});

/** GET /api/construx/projects/:id — one project with roll-ups. */
router.get("/projects/:id", (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found." });

  const schedule = collection("schedule").filter((s) => s.projectId === project.id);
  const budget = collection("budget").filter((b) => b.projectId === project.id);
  const rfis = collection("rfis").filter((r) => r.projectId === project.id);
  const totals = budget.reduce(
    (acc, line) => ({
      budgeted: acc.budgeted + line.budgeted,
      committed: acc.committed + line.committed,
      spent: acc.spent + line.spent,
    }),
    { budgeted: 0, committed: 0, spent: 0 }
  );

  res.json({ project, schedule, budget, budgetTotals: totals, rfis });
});

/** GET /api/construx/schedule — critical-path view across the portfolio. */
router.get("/schedule", (req, res) => {
  const onlyCritical = req.query.critical === "true";
  let schedule = collection("schedule");
  if (onlyCritical) schedule = schedule.filter((s) => s.critical);
  res.json({ schedule });
});

/** GET /api/construx/inspections — quality module: ITP inspections. */
router.get("/inspections", (req, res) => {
  let inspections = collection("inspections");
  if (req.query.status) {
    inspections = inspections.filter((i) => i.status === req.query.status);
  }
  res.json({ inspections });
});

/** GET /api/construx/ncrs — quality module: non-conformances, open first. */
router.get("/ncrs", (req, res) => {
  const ncrs = [...collection("ncrs")].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
  res.json({ ncrs });
});

/** GET /api/construx/sensors — field ops: latest site sensor readings. */
router.get("/sensors", (req, res) => {
  res.json({ sensors: collection("sensors") });
});

/** GET /api/construx/rfis — open items first, then newest. */
router.get("/rfis", (req, res) => {
  const rfis = [...collection("rfis")].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
  res.json({ rfis });
});

/**
 * PATCH /projects/:id/rag — set or clear the manual RAG override.
 *
 * The override sits on top of the derived SPI/CPI verdict rather than
 * replacing it: VERYX keeps showing what the indices computed
 * alongside what a person decided. A reason is required when setting
 * one, for the same purpose reasons are required when certifying less
 * than a supplier claimed — a judgement that overrides a measurement
 * has to be answerable later.
 */
router.patch("/projects/:id/rag", requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found." });

  const raw = String(req.body?.rag ?? "").trim();
  const reason = String(req.body?.reason ?? "").trim().slice(0, 400);

  if (!raw) {
    const row = update("projects", project.id, {
      ragOverride: null,
      ragReason: "",
      ragSetBy: req.user.name,
      ragSetAt: Date.now(),
    });
    return res.json({ project: row, cleared: true });
  }
  if (!RAG_OPTIONS.includes(raw)) {
    return res.status(400).json({ error: `RAG must be one of: ${RAG_OPTIONS.join(", ")}.` });
  }
  if (reason.length < 5) {
    return res.status(400).json({ error: "Give a reason for overriding the measured status." });
  }
  const row = update("projects", project.id, {
    ragOverride: raw,
    ragReason: reason,
    ragSetBy: req.user.name,
    ragSetAt: Date.now(),
  });
  res.json({ project: row });
});

export default router;
