import { Router } from "express";
import { collection } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";
import { summary } from "../lib/reach.js";

const router = Router();

// ------------------------- first-party site analytics
//
// The counting itself moved to backend/lib/reach.js, on the server. What is
// left here is the retired beacon endpoint and the Control Desk's 30-day
// strip, both pointed at that one counter. Still no cookies, no addresses and
// no identifiers of any kind, so there is still nothing to consent to.

/**
 * POST /api/stats/hit — the retired beacon.
 *
 * It still answers, and it deliberately records NOTHING.
 *
 * Page views are counted on the server now, in backend/lib/reach.js, where a
 * request is counted whether or not the reader runs JavaScript and where a
 * crawler is counted as a crawler instead of being thrown away. Two counters
 * disagreeing is worse than one counter with a known limitation.
 *
 * The endpoint is kept rather than deleted because a page cached in somebody's
 * browser will keep calling it for weeks, and a 404 from a beacon puts a red
 * line in a visitor's console on a marketing site. It is unauthenticated and
 * writes nothing, so it needs no rate limit: there is nothing behind it to
 * exhaust.
 */
router.post("/hit", (req, res) => res.status(204).end());

/**
 * GET /api/stats/traffic — the last 30 days, for the Control Desk strip.
 *
 * Served from the server-side counter so the strip and the Reach page can
 * never show two different numbers. The response shape is unchanged, so the
 * dashboard that reads it did not have to be rewritten to follow the counter
 * that replaced its data source.
 */
router.get("/traffic", requireAuth, (req, res) => {
  const s = summary({ days: 30, top: 8 });
  res.json({
    days: s.daily.map((d) => ({ date: d.day, total: d.views })),
    total: s.views,
    bots: s.bots,
    topPaths: s.pages.map((p) => [p.page, p.views]),
    topReferrers: s.referrers.map((r) => [r.name, r.n]),
  });
});

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
