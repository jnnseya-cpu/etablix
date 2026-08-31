import { Router } from "express";
import { collection } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/stats — headline numbers for the internal dashboard. */
router.get("/", requireAuth, (req, res) => {
  const projects = collection("projects");
  const leads = collection("leads");
  const applications = collection("subcontractors");

  res.json({
    activeProjects: projects.filter((p) =>
      ["mobilization", "in_progress", "closeout"].includes(p.status)
    ).length,
    portfolioValue: projects.reduce((sum, p) => sum + p.value, 0),
    newLeads: leads.filter((l) => l.status === "new").length,
    pendingApplications: applications.filter((a) =>
      ["submitted", "under_review"].includes(a.status)
    ).length,
    openRfis: collection("rfis").filter((r) => r.status === "open").length,
  });
});

export default router;
