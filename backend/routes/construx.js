/**
 * CONSTRUX API — project delivery: portfolio, schedules, cost control, RFIs.
 * All endpoints require an authenticated employee session.
 */

import { Router } from "express";
import { collection } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";
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

export default router;
