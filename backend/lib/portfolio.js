/**
 * VERYX portfolio intelligence — the aggregation behind the portfolio
 * lens. CONSTRUX answers "how is this project?"; this answers "how is
 * the business?" across every project at once.
 *
 * Everything here is computed from data the workspace already holds —
 * projects, budget lines, schedule activities, risks, NCRs and RFIs.
 * Nothing is hand-entered and nothing is invented: if a number cannot
 * be derived, the panel says so rather than showing a plausible one.
 *
 * On health: projects carry a lifecycle (mobilisation, in progress,
 * closeout) but no RAG status, so RAG is derived rather than typed —
 * schedule and cost performance indices against the same 0.95
 * threshold the EVM payment gate already enforces in the Commercial
 * OS. One definition of "at risk" across the business.
 *
 *   SPI = progress achieved ÷ programme time elapsed
 *   CPI = progress achieved ÷ budget consumed
 *
 * The monthly trend reads the portfolioSnapshots collection, written
 * once per calendar month by the delivery automation. It starts empty
 * on a new workspace and fills from the first run — a chart with one
 * point says so plainly instead of drawing a line through nothing.
 */

import { collection, insert, update } from "./store.js";

/** Health bands, shared with the EVM gate: below 0.95 is a warning, below 0.90 is late. */
export const SPI_WARN = 0.95;
export const SPI_LATE = 0.9;
export const CPI_WARN = 0.95;

export const HEALTH = {
  complete: { label: "Complete", tone: "complete" },
  on_track: { label: "On track", tone: "good" },
  at_risk: { label: "At risk", tone: "warning" },
  delayed: { label: "Delayed", tone: "critical" },
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Fraction of a project's programme elapsed today, 0–1. */
export function elapsedFraction(startDate, endDate, now = Date.now()) {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return clamp01((now - start) / (end - start));
}

/** Budget totals for one project, summed across its category lines. */
export function projectBudget(projectId, budgetRows = collection("budget")) {
  const rows = budgetRows.filter((b) => b.projectId === projectId);
  return rows.reduce(
    (acc, b) => ({
      budgeted: acc.budgeted + num(b.budgeted),
      committed: acc.committed + num(b.committed),
      spent: acc.spent + num(b.spent),
      lines: acc.lines + 1,
    }),
    { budgeted: 0, committed: 0, spent: 0, lines: 0 }
  );
}

/**
 * Derive one project's health. Returns the indices alongside the verdict
 * and the reason, so the dashboard can show why rather than just what.
 */
export function projectHealth(project, budget, now = Date.now()) {
  const progress = num(project.progress);
  if (progress >= 100) return { health: "complete", spi: null, cpi: null, reason: "Progress complete." };

  const elapsed = elapsedFraction(project.startDate, project.endDate, now);
  const spi = elapsed && elapsed > 0 ? progress / 100 / elapsed : null;
  const spentFraction = budget.budgeted > 0 ? budget.spent / budget.budgeted : null;
  const cpi = spentFraction && spentFraction > 0 ? progress / 100 / spentFraction : null;

  const reasons = [];
  let health = "on_track";
  if (spi !== null && spi < SPI_LATE) {
    health = "delayed";
    reasons.push(`SPI ${spi.toFixed(2)} — behind programme`);
  } else if (spi !== null && spi < SPI_WARN) {
    health = "at_risk";
    reasons.push(`SPI ${spi.toFixed(2)} — slipping`);
  }
  if (cpi !== null && cpi < CPI_WARN) {
    if (health === "on_track") health = "at_risk";
    reasons.push(`CPI ${cpi.toFixed(2)} — spend ahead of progress`);
  }
  if (!reasons.length) reasons.push("Schedule and cost within threshold.");
  return { health, spi, cpi, reason: reasons.join(" · ") };
}

/** Every project with its budget, indices and derived health attached. */
export function enrichedProjects(now = Date.now()) {
  const budgetRows = collection("budget");
  return collection("projects").map((p) => {
    const budget = projectBudget(p.id, budgetRows);
    const h = projectHealth(p, budget, now);
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      client: p.client,
      sector: p.sector,
      manager: p.manager,
      lifecycle: p.status,
      value: num(p.value),
      progress: num(p.progress),
      startDate: p.startDate,
      endDate: p.endDate,
      budget,
      spentPct: pct(budget.spent, budget.budgeted),
      committedPct: pct(budget.committed, budget.budgeted),
      elapsedPct: (elapsedFraction(p.startDate, p.endDate, now) ?? 0) * 100,
      ...h,
    };
  });
}

/** Counts by derived health, in a fixed order so colours never move. */
export function healthBreakdown(projects) {
  const order = ["on_track", "at_risk", "delayed", "complete"];
  return order.map((key) => ({
    key,
    label: HEALTH[key].label,
    tone: HEALTH[key].tone,
    count: projects.filter((p) => p.health === key).length,
  }));
}

/** Projects per sector, largest first — a magnitude comparison, not an identity one. */
export function sectorBreakdown(projects) {
  const map = new Map();
  for (const p of projects) {
    const key = p.sector || "Unassigned";
    const row = map.get(key) || { sector: key, count: 0, value: 0 };
    row.count += 1;
    row.value += p.value;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.value - a.value);
}

/** Critical-path and imminent schedule activities across every project. */
export function milestones(projects, limit = 12) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  return collection("schedule")
    .map((s) => {
      const project = byId.get(s.projectId);
      const end = Date.parse(s.end);
      const daysToEnd = Number.isFinite(end) ? Math.round((end - Date.now()) / 86400000) : null;
      const progress = num(s.progress);
      let state = "on_track";
      if (progress >= 100) state = "complete";
      else if (daysToEnd !== null && daysToEnd < 0) state = "delayed";
      else if (daysToEnd !== null && daysToEnd <= 14 && progress < 60) state = "at_risk";
      return {
        id: s.id,
        activity: s.activity,
        phase: s.phase,
        critical: Boolean(s.critical),
        start: s.start,
        end: s.end,
        progress,
        daysToEnd,
        state,
        projectCode: project?.code || "—",
        projectName: project?.name || "Unassigned",
      };
    })
    .sort((a, b) => Number(b.critical) - Number(a.critical) || (a.daysToEnd ?? 1e9) - (b.daysToEnd ?? 1e9))
    .slice(0, limit);
}

/** Open risks, NCRs and RFIs across the portfolio, banded by severity. */
export function issuesSummary(projects) {
  const ids = new Set(projects.map((p) => p.id));
  const risks = collection("risks").filter((r) => r.status === "open");
  const inScope = (r) => !r.projectId || ids.has(r.projectId);
  return {
    highRisks: risks.filter((r) => inScope(r) && num(r.score) >= 16).length,
    mediumRisks: risks.filter((r) => inScope(r) && num(r.score) >= 8 && num(r.score) < 16).length,
    lowRisks: risks.filter((r) => inScope(r) && num(r.score) < 8).length,
    openNcrs: collection("ncrs").filter((n) => n.status === "open").length,
    majorNcrs: collection("ncrs").filter((n) => n.status === "open" && n.severity === "major").length,
    openRfis: collection("rfis").filter((r) => r.status === "open").length,
  };
}

/** The window every project fits inside, for the portfolio timeline. */
export function timelineWindow(projects) {
  const starts = projects.map((p) => Date.parse(p.startDate)).filter(Number.isFinite);
  const ends = projects.map((p) => Date.parse(p.endDate)).filter(Number.isFinite);
  if (!starts.length || !ends.length) return null;
  return { from: Math.min(...starts), to: Math.max(...ends), today: Date.now() };
}

// ------------------------------------------------------------------ trend

const monthKey = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 7);

/**
 * Record this month's portfolio position, once per calendar month.
 * Re-running within the same month refreshes that month's figures
 * rather than adding a second point, so the series stays one-per-month
 * however often the automation runs.
 */
export function takeSnapshot(now = Date.now()) {
  const projects = enrichedProjects(now);
  if (!projects.length) return { skipped: true, reason: "No projects to snapshot." };

  const totals = projects.reduce(
    (acc, p) => ({
      value: acc.value + p.value,
      budgeted: acc.budgeted + p.budget.budgeted,
      spent: acc.spent + p.budget.spent,
      committed: acc.committed + p.budget.committed,
      progress: acc.progress + p.progress,
    }),
    { value: 0, budgeted: 0, spent: 0, committed: 0, progress: 0 }
  );
  const breakdown = healthBreakdown(projects);
  const find = (k) => breakdown.find((b) => b.key === k)?.count ?? 0;

  const row = {
    month: monthKey(now),
    projects: projects.length,
    avgProgress: Math.round(totals.progress / projects.length),
    totalValue: totals.value,
    totalBudgeted: totals.budgeted,
    totalSpent: totals.spent,
    totalCommitted: totals.committed,
    onTrack: find("on_track"),
    atRisk: find("at_risk"),
    delayed: find("delayed"),
    complete: find("complete"),
    takenAt: now,
  };

  const existing = collection("portfolioSnapshots").find((s) => s.month === row.month);
  if (existing) return { updated: true, snapshot: update("portfolioSnapshots", existing.id, row) };
  return { created: true, snapshot: insert("portfolioSnapshots", row) };
}

/** The monthly series, oldest first, capped to the last two years. */
export function trend(limit = 24) {
  return [...collection("portfolioSnapshots")]
    .sort((a, b) => String(a.month).localeCompare(String(b.month)))
    .slice(-limit);
}

// ------------------------------------------------------------- the payload

/** Everything the portfolio dashboard renders, in one read. */
export function portfolio(now = Date.now()) {
  const projects = enrichedProjects(now);
  const totals = projects.reduce(
    (acc, p) => ({
      value: acc.value + p.value,
      budgeted: acc.budgeted + p.budget.budgeted,
      committed: acc.committed + p.budget.committed,
      spent: acc.spent + p.budget.spent,
    }),
    { value: 0, budgeted: 0, committed: 0, spent: 0 }
  );
  const breakdown = healthBreakdown(projects);
  const series = trend();

  return {
    generatedAt: now,
    projects: projects.sort((a, b) => String(a.code).localeCompare(String(b.code))),
    health: breakdown,
    sectors: sectorBreakdown(projects),
    milestones: milestones(projects),
    issues: issuesSummary(projects),
    window: timelineWindow(projects),
    trend: series,
    trendNote:
      series.length === 0
        ? "No monthly snapshots recorded yet. The delivery automation writes one per calendar month — the series starts at its next run."
        : series.length === 1
          ? "One month recorded. A trend needs a second point; the next snapshot lands next month."
          : null,
    kpis: {
      total: projects.length,
      onTrack: breakdown.find((b) => b.key === "on_track")?.count ?? 0,
      atRisk: breakdown.find((b) => b.key === "at_risk")?.count ?? 0,
      delayed: breakdown.find((b) => b.key === "delayed")?.count ?? 0,
      complete: breakdown.find((b) => b.key === "complete")?.count ?? 0,
      portfolioValue: totals.value,
      budgeted: totals.budgeted,
      committed: totals.committed,
      spent: totals.spent,
      spentPct: Math.round(pct(totals.spent, totals.budgeted)),
      avgProgress: projects.length
        ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
        : 0,
    },
    thresholds: { spiWarn: SPI_WARN, spiLate: SPI_LATE, cpiWarn: CPI_WARN },
  };
}
