import { Router } from "express";
import { collection, insert, update } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ------------------------- first-party site analytics (privacy-light)
// One row per day: total views, views per path, views per referrer
// host. No cookies, no IP addresses, no user identifiers stored —
// nothing here needs a consent banner.

const PATH_RE = /^\/[a-zA-Z0-9\-_/.]{0,80}$/;
const BOT_RE = /bot|crawl|spider|slurp|preview|headless|monitor|curl|python|wget/i;

/** POST /api/stats/hit — public page-view beacon from the site. */
router.post("/hit", (req, res) => {
  res.status(204).end(); // answer immediately; never block a page on analytics
  try {
    if (BOT_RE.test(req.get("user-agent") || "")) return;
    let path = String(req.body?.p || "").split("?")[0];
    if (!PATH_RE.test(path)) return;
    path = path.replace(/\/$/, "") || "/";
    let referrer = "";
    try {
      const host = new URL(req.body?.r || "").hostname.replace(/^www\./, "");
      if (host && !host.includes("etablix.com")) referrer = host.slice(0, 60);
    } catch {}
    const date = new Date().toISOString().slice(0, 10);
    const day = collection("traffic").find((t) => t.date === date);
    if (!day) {
      insert("traffic", { date, total: 1, paths: { [path]: 1 }, referrers: referrer ? { [referrer]: 1 } : {} });
    } else {
      const paths = { ...day.paths, [path]: (day.paths[path] || 0) + 1 };
      const referrers = referrer
        ? { ...day.referrers, [referrer]: (day.referrers[referrer] || 0) + 1 }
        : day.referrers;
      update("traffic", day.id, { total: day.total + 1, paths, referrers });
    }
  } catch {}
});

/** GET /api/stats/traffic — last 30 days for the Control Desk. */
router.get("/traffic", requireAuth, (req, res) => {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const days = collection("traffic")
    .filter((t) => t.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
  const paths = {};
  const referrers = {};
  for (const d of days) {
    for (const [p, n] of Object.entries(d.paths || {})) paths[p] = (paths[p] || 0) + n;
    for (const [r, n] of Object.entries(d.referrers || {})) referrers[r] = (referrers[r] || 0) + n;
  }
  const top = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 8);
  res.json({
    days: days.map((d) => ({ date: d.date, total: d.total })),
    total: days.reduce((s, d) => s + d.total, 0),
    topPaths: top(paths),
    topReferrers: top(referrers),
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
