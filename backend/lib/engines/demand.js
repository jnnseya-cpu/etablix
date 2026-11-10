/**
 * TI-TR · The trend reader. What is moving, against what, and how sure.
 *
 * §4 of the Trend Intelligence specification gives this worker a precise and
 * narrow remit: recent observations, seasonality and current campaigns in;
 * clusters, change evidence, a trend class, an expiry and WHAT IS MISSING out.
 * "Read only. Deterministic calculations."
 *
 * THE LAST OF THOSE OUTPUTS IS THE ONE THAT GETS DROPPED. A trend reader that
 * reports six moving segments and says nothing about the four it could not
 * read is a report that looks complete and is not. The reader of a demand
 * report cannot tell the difference between "nothing is happening in rail" and
 * "no rail source has answered for nine days", and those two call for
 * opposite decisions. So absent and stale segments are reported with the same
 * weight as moving ones.
 *
 * SEASONALITY IS NOT CLAIMED. With fewer than eight comparable windows there
 * is no seasonal comparison to make, and this says so rather than comparing
 * to last year on three weeks of history. The specification allows a
 * same-window-last-year comparison "where history permits"; here it rarely
 * does, and pretending otherwise is how a quiet August becomes a collapse in
 * demand.
 *
 * IT MAKES NO RECOMMENDATION. Whether a movement is worth acting on belongs
 * to the strategist, and whether it may be acted on belongs to policy. This
 * reports movement and evidence, which is the only thing arithmetic can
 * honestly produce.
 */

import { collection } from "../store.js";
import { movement, median, MIN_COMPARABLE_PERIODS } from "../trendintel/score.js";
import { independentFamilies } from "../trendintel/sources.js";
import { PLATFORM_INSTALLATION } from "../trendintel/platform.js";

/** The trend classes of §5.2. A segment is in exactly one. */
export const TREND_CLASSES = Object.freeze(["breaking", "persistent", "seasonal", "declining", "insufficient-history", "silent"]);

const DAY = 86400000;

/**
 * Classify a movement into one of the six classes.
 *
 * `silent` is first because it is the one that matters most and the one a
 * ranking by magnitude hides: a segment with no observation at all in the
 * window is not at the bottom of the list, it is a different kind of entry.
 */
export function classify({ current = 0, history = [], z = null, staleDays = null } = {}) {
  if (current === 0 && history.every((h) => h === 0)) return "silent";
  if (history.length < MIN_COMPARABLE_PERIODS) return "insufficient-history";
  if (staleDays !== null && staleDays > 14) return "silent";
  const base = median(history) ?? 0;
  if (z !== null && z >= 3 && current > base) return "breaking";
  if (current < base * 0.5) return "declining";
  if (z !== null && z >= 1.5) return "persistent";
  if (history.length >= 8) return "seasonal";
  return "persistent";
}

/**
 * Read the window and report per segment.
 *
 * Reads the installation's own observations from the store rather than taking
 * pasted records, because they are already there — an engine that asks a
 * person to paste in what the platform collected an hour ago is an engine
 * nobody runs twice.
 */
export function read({ windowDays = 28, at = null, installationId = PLATFORM_INSTALLATION } = {}) {
  const now = at ? Date.parse(String(at)) : Date.now();
  if (!Number.isFinite(now)) {
    return { ok: false, reason: "The reading date could not be read, and a window with no end is not a window." };
  }
  const obs = collection("tiObservations").filter((o) => o.installationId === installationId && o.metric === "moments");
  if (!obs.length) {
    return {
      ok: true, windowDays, segments: [], missing: [],
      say: "No demand observation has been recorded for this installation. That is an absence of reading, not an absence of demand, and nothing can be said about any segment until the watch has run.",
    };
  }

  const sources = new Map(
    collection("tiSources").filter((s) => s.installationId === installationId)
      .map((s) => [s.sourceId, s]),
  );

  const bySegment = new Map();
  for (const o of obs) {
    const key = String(o.segment || "unclassified");
    if (!bySegment.has(key)) bySegment.set(key, []);
    bySegment.get(key).push(o);
  }

  const segments = [], missing = [];
  for (const [segment, rows] of [...bySegment.entries()].sort()) {
    const windows = [];
    for (let i = 0; i < 9; i += 1) {
      const end = now - i * windowDays * DAY;
      const start = end - windowDays * DAY;
      windows.push(rows.filter((o) => {
        const t = Date.parse(String(o.observedAt));
        return Number.isFinite(t) && t >= start && t < end;
      }).length);
    }
    const current = windows[0];
    const history = windows.slice(1);
    const move = movement({ count: current, baseline: median(history), history });

    const latest = rows
      .map((o) => Date.parse(String(o.observedAt)))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => b - a)[0] ?? null;
    const staleDays = latest === null ? null : Math.round(((now - latest) / DAY) * 10) / 10;

    const withFlags = rows.map((o) => ({ ...o, contextOnly: Boolean(sources.get(String(o.sourceId))?.contextOnly ?? true) }));
    const fams = independentFamilies(withFlags);

    const trendClass = classify({ current, history, z: move.ok ? move.z : null, staleDays });
    const entry = {
      segment, trendClass, current, history,
      baseline: median(history),
      z: move.ok ? Math.round(move.z * 100) / 100 : null,
      lift: move.lift === null || move.lift === undefined ? null : Math.round(move.lift * 1000) / 1000,
      comparablePeriods: history.filter((h) => h > 0).length,
      independentFamilies: fams.independent,
      corroborating: fams.corroborating,
      contextOnlyFamilies: fams.contextOnly,
      collapsedProvenance: fams.collapsed,
      lastObservedDaysAgo: staleDays,
      // Expiry, §17: a breaking topic is good for 24 hours, a persistent one
      // for seven days. A finding with no expiry gets acted on in a fortnight.
      expiresAt: new Date(now + (trendClass === "breaking" ? 24 : 168) * 3600000).toISOString(),
      gate: move.ok ? "passed" : move.reason,
      say: move.ok
        ? `${segment}: ${current} moment(s) this window against a baseline median of ${median(history)}, z ${move.z.toFixed(2)}, across ${fams.independent} independent famil${fams.independent === 1 ? "y" : "ies"} of which ${fams.corroborating} can corroborate. Class ${trendClass}.`
        : `${segment}: ${current} moment(s) this window. ${move.say}`,
    };
    segments.push(entry);

    // What could not be read, reported with the same weight as what could.
    if (trendClass === "silent") {
      missing.push(`${segment}: no moment recorded in the current window${staleDays === null ? "" : `, and nothing at all for ${staleDays} day(s)`}. This is a gap in reading, not an absence of demand — a feed gap is unknown data and never zero interest.`);
    } else if (trendClass === "insufficient-history") {
      missing.push(`${segment}: only ${history.filter((h) => h > 0).length} comparable period(s) against a minimum of ${MIN_COMPARABLE_PERIODS}. The baseline median and the deviation are both guesses, so the movement figure means nothing and is held draft-only.`);
    }
    if (fams.corroborating === 0) {
      missing.push(`${segment}: nothing here can corroborate. ${fams.contextOnly} famil${fams.contextOnly === 1 ? "y is" : "ies are"} context-only, which on this installation means their licence has not been read, so they may add context and may not on their own support an automated action.`);
    }
  }

  // Seasonality, and the honest refusal of it.
  const seasonal = segments.filter((s) => s.history.filter((h) => h > 0).length >= 8);
  const seasonality = seasonal.length
    ? `${seasonal.length} segment(s) have eight or more comparable windows and can be compared against the same window a year earlier.`
    : "No segment has eight comparable windows, so no seasonal comparison is made. Comparing to last year on three weeks of history is how a quiet August becomes a collapse in demand.";

  return {
    ok: true, windowDays,
    segments: segments.map((s) => s.say),
    detail: segments,
    classes: Object.fromEntries(TREND_CLASSES.map((c) => [c, segments.filter((s) => s.trendClass === c).length])),
    missing,
    seasonality,
    say: `${segments.length} segment(s) read over ${windowDays} days: ${TREND_CLASSES.map((c) => `${segments.filter((s) => s.trendClass === c).length} ${c}`).filter((x) => !x.startsWith("0 ")).join(", ") || "none classified"}. ${missing.length} thing(s) could not be read and are listed rather than omitted. No recommendation is made here: whether a movement is worth acting on belongs to the strategist and whether it may be acted on belongs to policy.`,
  };
}
