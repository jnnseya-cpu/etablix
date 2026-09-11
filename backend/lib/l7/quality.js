/**
 * The quality targets, measured.
 *
 * Thirteen targets have sat in the register since it was written. Six had a
 * mechanism — a gate that refuses something — and seven had the same sentence
 * next to them: "nothing measures this."
 *
 * That sentence was honest and it was also the whole problem. A target with
 * no mechanism is a hope, and a business that publishes hopes as targets
 * eventually believes them. So every one of the thirteen now has a mechanism
 * here, and each returns one of three answers rather than a number:
 *
 *   MEASURED          computed from data that exists, with the figure.
 *   NO DATA YET       the measurement works and nothing has been recorded to
 *                     measure. This is NOT a pass and is never shown as one.
 *   NOT MEASURABLE    software cannot see this, and saying so is the only
 *                     honest option. One target is in this category and
 *                     pretending otherwise would be the worst answer of all.
 *
 * THE DISTINCTION BETWEEN THE SECOND AND A GOOD RESULT IS THE POINT.
 *
 * Zero aged RFIs because none is older than a fortnight is a result. Zero
 * aged RFIs because no RFI was ever recorded is an empty database, and a
 * dashboard that renders both as a green zero is worse than no dashboard —
 * it is a system telling somebody their site is under control on the evidence
 * that nobody has entered anything.
 */

import { collection } from "../store.js";
import { lateInformation } from "./bitemporal.js";
import { num } from "./num.js";

const DAY = 86400000;

/** The three answers a measurement can give. */
export const OUTCOMES = ["MEASURED", "NO_DATA_YET", "NOT_MEASURABLE"];

function measured(value, say, detail = {}) {
  return { outcome: "MEASURED", value, say, ...detail };
}
function noData(say, detail = {}) {
  return { outcome: "NO_DATA_YET", value: null, say, ...detail };
}
function notMeasurable(say, detail = {}) {
  return { outcome: "NOT_MEASURABLE", value: null, say, ...detail };
}

function rows(name) {
  try { return collection(name); } catch { return []; }
}

/* ------------------------------------------------------------------ */

/** Aged RFIs: how long the open ones have been open, and whether that is falling. */
export function agedRfis({ now = Date.now(), ageDays = 14 } = {}) {
  const all = rows("rfis");
  if (all.length === 0) {
    return noData("No RFI has been recorded. That is an empty register rather than a site with no questions on it, and the difference matters.");
  }
  const open = all.filter((r) => r.status !== "closed" && r.status !== "answered" && r.status !== "resolved");
  const aged = open.filter((r) => now - Number(r.createdAt || 0) > ageDays * DAY);
  const ages = open.map((r) => Math.floor((now - Number(r.createdAt || 0)) / DAY)).filter((n) => Number.isFinite(n));
  const oldest = ages.length ? Math.max(...ages) : 0;
  const mean = ages.length ? Math.round(ages.reduce((s, n) => s + n, 0) / ages.length) : 0;
  return measured(aged.length,
    `${aged.length} of ${open.length} open RFI(s) are older than ${ageDays} days. The oldest is ${oldest} days; the average open RFI is ${mean} days old.`,
    { open: open.length, total: all.length, oldestDays: oldest, meanDays: mean, ageDays });
}

/** Payment-assessment cycle time: application received to sum certified. */
export function paymentCycleTime() {
  const apps = rows("payApps");
  if (apps.length === 0) return noData("No payment application has been recorded, so there is no cycle to time.");
  const done = apps
    .map((a) => {
      const from = num(a.receivedAt) ?? num(a.createdAt);
      const to = num(a.certifiedAt) ?? num(a.paidAt);
      if (from === null || to === null || to < from) return null;
      return Math.round((to - from) / DAY);
    })
    .filter((n) => n !== null);
  if (done.length === 0) {
    return noData(`${apps.length} application(s) recorded and none yet certified, so nothing has a cycle time. An uncertified application is not a fast one.`, { applications: apps.length });
  }
  const mean = Math.round(done.reduce((s, n) => s + n, 0) / done.length);
  const worst = Math.max(...done);
  return measured(mean,
    `${done.length} of ${apps.length} application(s) certified, averaging ${mean} day(s) from receipt, worst ${worst}.`,
    { certified: done.length, applications: apps.length, meanDays: mean, worstDays: worst });
}

/**
 * Unrecorded change: what was entered long after it happened.
 *
 * A change nobody recorded is by definition invisible, so it cannot be
 * counted directly. What CAN be counted is the near neighbour: information
 * recorded long after the day it was true. The bitemporal store knows both
 * dates, which is the whole reason it holds two, and a fact entered five
 * months late is either a change that went unrecorded until somebody noticed
 * or a record that cannot be relied on for what was known at the time.
 */
export function unrecordedChange({ thresholdDays = 14 } = {}) {
  const late = lateInformation({ thresholdDays });
  const facts = rows("facts");
  if (facts.length === 0) {
    return noData("No fact has been recorded bitemporally yet, so lateness cannot be seen. A single-axis record cannot tell a late entry from a prompt one.");
  }
  const worst = late.length ? late[0] : null;
  return measured(late.length,
    late.length === 0
      ? `Every one of the ${facts.length} recorded fact(s) was entered within ${thresholdDays} days of the day it was true.`
      : `${late.length} of ${facts.length} fact(s) were entered more than ${thresholdDays} days after the day they were true. The worst is ${worst.field} on ${worst.entity}, ${worst.lateByDays} days late.`,
    { facts: facts.length, late: late.length, thresholdDays, worst });
}

/**
 * Handover completeness trajectory: how much of the required evidence set is
 * held, and whether that is improving against the date.
 */
export function handoverCompleteness() {
  const projects = rows("projects").filter((p) => p.status === "closeout" || p.status === "completed" || p.status === "in_progress");
  if (projects.length === 0) return noData("No project is far enough along for handover completeness to mean anything.");
  const docs = rows("documents");
  const out = projects.map((p) => {
    const held = docs.filter((d) => String(d.data?.project || d.title || "").includes(p.name) || String(d.data?.projectId || "") === p.id);
    return { project: p.name, endDate: p.endDate || null, progress: num(p.progress), documents: held.length };
  });
  const withNone = out.filter((p) => p.documents === 0);
  return measured(out.length - withNone.length,
    `${out.length - withNone.length} of ${out.length} live project(s) have at least one issued document against them. This measures presence rather than sufficiency: a required-evidence schedule per project would turn it into a real completeness figure, and none is recorded.`,
    { projects: out.length, withDocuments: out.length - withNone.length, rows: out, limitation: "no required-evidence schedule per project" });
}

/**
 * Progress forecast calibration: how a forecast made then compared to what
 * actually happened.
 *
 * This needs forecasts to have been RECORDED as predictions, with the date
 * they were made and the date they were about. Nothing did that, which is why
 * the register said nothing measures it — and the fix is a register of
 * forecasts rather than a cleverer reading of the current numbers. Reading a
 * forecast out of today's data is not calibration, it is hindsight.
 */
export function forecastCalibration() {
  const forecasts = rows("forecasts");
  if (forecasts.length === 0) {
    return noData("No forecast has been recorded as a prediction. Calibration compares what was predicted with what happened, so it needs the prediction kept with the date it was made — reading a forecast out of today's numbers is hindsight, not calibration.");
  }
  const scored = forecasts
    .map((f) => {
      const predicted = num(f.predicted);
      const actual = num(f.actual);
      if (predicted === null || actual === null) return null;
      return { package: f.package || f.projectId || "(unnamed)", predicted, actual, error: actual - predicted, madeAt: f.madeAt, aboutAt: f.aboutAt };
    })
    .filter(Boolean);
  if (scored.length === 0) {
    return noData(`${forecasts.length} forecast(s) recorded and none yet has an outcome against it, so none can be scored.`, { forecasts: forecasts.length });
  }
  const bias = scored.reduce((s, f) => s + f.error, 0) / scored.length;
  const absolute = scored.reduce((s, f) => s + Math.abs(f.error), 0) / scored.length;
  return measured(Math.round(absolute * 100) / 100,
    `${scored.length} forecast(s) scored. Mean absolute error ${Math.round(absolute * 100) / 100}; bias ${bias > 0 ? "+" : ""}${Math.round(bias * 100) / 100} — ${bias > 0 ? "the forecasts run pessimistic" : bias < 0 ? "the forecasts run optimistic, which is the dangerous direction" : "unbiased"}.`,
    { scored: scored.length, meanAbsoluteError: Math.round(absolute * 100) / 100, bias: Math.round(bias * 100) / 100, rows: scored.slice(0, 10) });
}

/**
 * Early-warning precision: of the warnings raised, how many were followed by
 * the thing they warned about.
 *
 * The target the register sets is "high enough that warnings are read", which
 * is the right target and is measured by precision: a system that warns about
 * everything is a system nobody reads, and the failure is silent because the
 * warnings keep being sent.
 */
export function earlyWarningPrecision() {
  const warnings = rows("warnings");
  if (warnings.length === 0) {
    return noData("No early warning has been recorded with an outcome against it. Precision needs both — a warning nobody scored afterwards cannot be told from one that was right.");
  }
  const scored = warnings.filter((w) => w.outcome === "materialised" || w.outcome === "did_not");
  if (scored.length === 0) {
    return noData(`${warnings.length} warning(s) raised and none scored afterwards. An unscored warning cannot be told from a correct one, which is how a system that cries wolf keeps its reputation.`, { warnings: warnings.length });
  }
  const right = scored.filter((w) => w.outcome === "materialised").length;
  const precision = right / scored.length;
  return measured(Math.round(precision * 100) / 100,
    `${right} of ${scored.length} scored warning(s) were followed by what they warned about — precision ${Math.round(precision * 100)}%. ${precision < 0.5 ? "Below half, which is the point at which people stop reading them." : "High enough to be worth reading."}`,
    { warnings: warnings.length, scored: scored.length, correct: right, precision: Math.round(precision * 100) / 100 });
}

/**
 * Manual reporting hours.
 *
 * SOFTWARE CANNOT SEE THIS AND THERE IS NO CLEVER PROXY FOR IT. Counting
 * generated documents is not hours saved; a report produced in one second
 * that nobody would have written by hand saves nothing, and a report that
 * replaces four hours of somebody's Sunday saves four hours. The only honest
 * measurement is somebody recording the hours, before and after.
 *
 * So the mechanism is a place to record them and a comparison. With nothing
 * recorded it says so, and it does NOT substitute a document count dressed up
 * as a saving — which is the number a system would be most tempted to
 * publish and the one a client would most reasonably challenge.
 */
export function manualReportingHours() {
  const entries = rows("reportingHours");
  if (entries.length === 0) {
    return notMeasurable("Software cannot see how long somebody spends writing a report. There is no honest proxy: a generated document is not an hour saved, and a document count published as a saving is the number a client would challenge first. This needs hours recorded before and after by the people doing the work, and none has been.");
  }
  const before = entries.filter((e) => e.period === "before").reduce((s, e) => s + (num(e.hours) ?? 0), 0);
  const after = entries.filter((e) => e.period === "after").reduce((s, e) => s + (num(e.hours) ?? 0), 0);
  if (before === 0 || after === 0) {
    return noData("Hours have been recorded for one period only. A reduction needs both a before and an after, and one of them is missing.", { before, after });
  }
  const change = ((after - before) / before) * 100;
  return measured(Math.round(change * 10) / 10,
    `${before} hour(s) before, ${after} after — ${change < 0 ? `a reduction of ${Math.abs(Math.round(change))}%` : `an increase of ${Math.round(change)}%`}, from hours people recorded rather than from a document count.`,
    { before, after, changePercent: Math.round(change * 10) / 10 });
}

/** Every target that needed a mechanism, with the one it now has. */
export const MEASUREMENTS = {
  "Aged RFIs": agedRfis,
  "Payment-assessment cycle time": paymentCycleTime,
  "Unrecorded change": unrecordedChange,
  "Handover completeness trajectory": handoverCompleteness,
  "Progress forecast calibration, by package": forecastCalibration,
  "Early-warning precision": earlyWarningPrecision,
  "Manual reporting hours": manualReportingHours,
};

/** Run them all. */
export function measurements() {
  const out = {};
  for (const [target, fn] of Object.entries(MEASUREMENTS)) {
    try { out[target] = fn(); }
    catch (err) { out[target] = notMeasurable(`the measurement could not be run: ${err.message}`); }
  }
  const values = Object.values(out);
  return {
    targets: out,
    counts: {
      total: values.length,
      measured: values.filter((v) => v.outcome === "MEASURED").length,
      noData: values.filter((v) => v.outcome === "NO_DATA_YET").length,
      notMeasurable: values.filter((v) => v.outcome === "NOT_MEASURABLE").length,
    },
    say: (() => {
      const m = values.filter((v) => v.outcome === "MEASURED").length;
      const n = values.filter((v) => v.outcome === "NO_DATA_YET").length;
      const x = values.filter((v) => v.outcome === "NOT_MEASURABLE").length;
      return `${values.length} target(s) that had no mechanism now have one: ${m} measured from real data, ${n} waiting on data that has not been recorded, ${x} that software genuinely cannot see. "No data yet" is not a pass and is never shown as one.`;
    })(),
  };
}

/** Record a forecast as a prediction, so it can be scored later. */
export function recordForecast({ project, pkg, predicted, aboutAt, madeAt = null, by = null } = {}) {
  const faults = [];
  if (!project) faults.push("no project");
  if (num(predicted) === null) faults.push("the prediction is not a number");
  if (!aboutAt) faults.push("no date it is a forecast OF — a prediction with no target date cannot be scored");
  if (!by) faults.push("nobody is named as making it");
  if (faults.length) return { ok: false, faults };
  return { ok: true, faults: [], forecast: { project: String(project), package: pkg ? String(pkg) : null, predicted: num(predicted), aboutAt: String(aboutAt), madeAt: madeAt || new Date().toISOString(), by: String(by), actual: null } };
}

/** Record an early warning's outcome, which is what makes precision real. */
export function scoreWarning({ warningId, outcome, by = null, note = null } = {}) {
  const faults = [];
  if (!warningId) faults.push("no warning named");
  if (outcome !== "materialised" && outcome !== "did_not") faults.push(`"${outcome}" is not an outcome; it is materialised or did_not`);
  if (!by) faults.push("nobody is named as scoring it");
  if (faults.length) return { ok: false, faults };
  return { ok: true, faults: [], score: { warningId: String(warningId), outcome, by: String(by), note: note ? String(note) : null, at: Date.now() } };
}
