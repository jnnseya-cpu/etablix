/**
 * THE PROGRAMME GENERATION AGENT — which mostly does not generate.
 *
 * The register is blunt about why: "Generating a programme is the easy part.
 * What earns its place is interrogation." Anything can produce a bar chart.
 * What decides whether a date is deliverable is whether the logic behind it
 * holds, and the failures are all invisible on the bar chart itself.
 *
 * TEN INTERROGATIONS. Each one is a way a programme can look finished and
 * be undeliverable:
 *
 *   1. AN OPEN-ENDED ACTIVITY. No predecessor, or no successor, and not the
 *      first or last thing on the job. It floats, its float is meaningless,
 *      and it moves nothing when it slips — which is how a slipping activity
 *      shows as harmless right up to the week it is not.
 *   2. A MISSING PREDECESSOR. An activity starting after the data date with
 *      nothing driving it is a date somebody typed, not a date the logic
 *      produced.
 *   3. PROCUREMENT DISCONNECTED FROM INSTALLATION. The classic. Lead times
 *      sit in their own chain, the installation sits in the critical path,
 *      and the two never touch — so a late order does not move the date on
 *      the programme and moves it on site.
 *   4. HIDDEN NEGATIVE FLOAT. Negative float means the programme has already
 *      failed and is showing a completion date anyway.
 *   5. UNSUPPORTED PRODUCTIVITY. A duration with no quantity and no output
 *      behind it is a duration somebody agreed to. Where the figures are
 *      given, the arithmetic is checked.
 *   6. EXCESSIVE CRITICAL-PATH SENSITIVITY. A programme where most of the
 *      work is critical has no resilience; one where everything is critical
 *      has broken logic rather than a tight plan.
 *   7. A HARD DATE CONSTRAINT masking the logic. A constraint holds a date
 *      steady while the work behind it slips, and the constraint is what the
 *      report reads.
 *   8. A LOOP in the logic. A cycle cannot be scheduled and most tools will
 *      quietly break it somewhere of their own choosing.
 *   9. A ZERO-DURATION ACTIVITY that is not a milestone.
 *
 * It does not rewrite the programme. It says what is wrong with it.
 */

import { instant } from "../l7/evidence.js";
import { num } from "../l7/num.js";
import { moment, day } from "./moment.js";

const DAY = 86400000;

/** What an activity is for, which decides what it must connect to. */
export const KINDS = ["procurement", "design", "construction", "installation", "commissioning", "milestone", "management"];

/** Above this share of the work being critical, the programme has no slack. */
export const CRITICAL_SHARE_LIMIT = 0.4;

function readActivity(raw = {}, faults) {
  const id = String(raw.id || "").trim();
  if (!id) faults.push("an activity with no id");
  const name = String(raw.name || "").trim();
  if (!name) faults.push(`${id || "(unnamed)"} has no description`);
  const kind = String(raw.kind || "").trim();
  if (kind && !KINDS.includes(kind)) faults.push(`${id}: "${kind}" is not one of ${KINDS.join(", ")}`);
  const start = raw.start ? instant(raw.start) : null;
  const end = raw.end ? instant(raw.end) : null;
  if (raw.start && start === null) faults.push(`${id}: start "${raw.start}" is not a date`);
  if (raw.end && end === null) faults.push(`${id}: end "${raw.end}" is not a date`);
  if (start !== null && end !== null && end < start) faults.push(`${id} ends before it starts`);
  return {
    id, name, kind: kind || null,
    start, end,
    duration: num(raw.duration),
    predecessors: Array.isArray(raw.predecessors) ? raw.predecessors.map(String) : [],
    successors: Array.isArray(raw.successors) ? raw.successors.map(String) : [],
    float: num(raw.float),
    critical: raw.critical === true,
    milestone: raw.milestone === true || kind === "milestone",
    constraint: raw.constraint ? String(raw.constraint) : null,
    quantity: num(raw.quantity),
    unit: raw.unit ? String(raw.unit) : null,
    outputPerCrewPerDay: num(raw.outputPerCrewPerDay),
    crews: num(raw.crews),
    leadTimeSource: raw.leadTimeSource ? String(raw.leadTimeSource) : null,
  };
}

/** Successors, resolved both ways: a link recorded on either end counts. */
function linkMaps(rows) {
  const succ = new Map(rows.map((r) => [r.id, new Set(r.successors)]));
  const pred = new Map(rows.map((r) => [r.id, new Set(r.predecessors)]));
  for (const r of rows) {
    for (const p of r.predecessors) if (succ.has(p)) succ.get(p).add(r.id);
    for (const s of r.successors) if (pred.has(s)) pred.get(s).add(r.id);
  }
  return { succ, pred };
}

/** Depth-first cycle detection. A loop cannot be scheduled. */
function cycles(rows, succ) {
  const state = new Map();
  const found = [];
  const walk = (id, trail) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "open") {
      const at = trail.indexOf(id);
      found.push(trail.slice(at >= 0 ? at : 0).concat(id));
      return;
    }
    state.set(id, "open");
    for (const s of succ.get(id) || []) walk(s, trail.concat(id));
    state.set(id, "done");
  };
  for (const r of rows) walk(r.id, []);
  return found;
}

export function interrogate({ activities = [], dataDate = null, completion = null, criticalShareLimit = CRITICAL_SHARE_LIMIT } = {}) {
  const readFaults = [];
  const rows = activities.map((a) => readActivity(a, readFaults));
  if (rows.length === 0) {
    return { ok: false, findings: [{ id: "empty", what: "no activities were given, so there is nothing to interrogate", rows: [] }], readFaults, verdict: "Nothing to interrogate." };
  }
  const at = moment(dataDate);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const { succ, pred } = linkMaps(rows);

  const findings = [];
  const add = (id, what, list) => { if (list.length) findings.push({ id, what, rows: list }); };

  if (readFaults.length) add("unreadable", "an activity could not be read as written", readFaults);

  // A dangling link is worse than a missing one: it looks like logic.
  const dangling = [];
  for (const r of rows) {
    for (const p of r.predecessors) if (!byId.has(p)) dangling.push(`${r.id} is driven by "${p}", which is not in the programme`);
    for (const s of r.successors) if (!byId.has(s)) dangling.push(`${r.id} drives "${s}", which is not in the programme`);
  }
  add("dangling_links", "a link points at an activity that is not in the programme", dangling);

  // 1. Open-ended.
  const first = rows.filter((r) => (pred.get(r.id) || new Set()).size === 0);
  const last = rows.filter((r) => (succ.get(r.id) || new Set()).size === 0);
  add("open_ended_start", "an activity has nothing driving it and is not the start of the job",
    first.length > 1 ? first.map((r) => `${r.id} — ${r.name}`) : []);
  add("open_ended_finish", "an activity drives nothing and is not the end of the job",
    last.length > 1 ? last.map((r) => `${r.id} — ${r.name}`) : []);

  // 2. Missing predecessor after the data date.
  if (at !== null) {
    add("date_typed_not_driven", "an activity starts after the data date with nothing driving it, so its date was typed rather than produced by the logic",
      rows.filter((r) => r.start !== null && r.start > at && (pred.get(r.id) || new Set()).size === 0)
        .map((r) => `${r.id} — ${r.name}, starting ${day(r.start)}`));
  }

  // 3. Procurement disconnected from installation.
  const installKinds = new Set(["installation", "construction", "commissioning"]);
  const reaches = (from, target) => {
    const seen = new Set();
    const stack = [...(succ.get(from) || [])];
    while (stack.length) {
      const n = stack.pop();
      if (seen.has(n)) continue;
      seen.add(n);
      const row = byId.get(n);
      if (row && target(row)) return true;
      for (const s of succ.get(n) || []) stack.push(s);
    }
    return false;
  };
  add("procurement_disconnected", "a procurement activity has no path to anything being installed, so a late order does not move the date on the programme and does move it on site",
    rows.filter((r) => r.kind === "procurement" && !reaches(r.id, (x) => installKinds.has(x.kind)))
      .map((r) => `${r.id} — ${r.name}`));

  // 4. Negative float.
  add("negative_float", "negative float — the programme has already failed and is showing a completion date anyway",
    rows.filter((r) => r.float !== null && r.float < 0).map((r) => `${r.id} — ${r.name}, float ${r.float}`));

  // 5. Productivity.
  const unsupported = [];
  const unsourced = [];
  for (const r of rows) {
    if (r.milestone || r.kind === "management") continue;
    if (r.duration === null || r.duration === 0) continue;
    // A PROCUREMENT DURATION IS A LEAD TIME, NOT A PRODUCTIVITY CALCULATION.
    // Asking "how many m² per gang per day" of a 90-day module order is the
    // wrong question, and reporting it as an unsupported duration buries the
    // right one: who said 90 days, and are they bound by it.
    if (r.kind === "procurement") {
      if (!r.leadTimeSource) {
        unsourced.push(`${r.id} — ${r.name}: a ${r.duration}-day lead time with nothing recording who said so. A lead time nobody is bound by is a date that moves when the order is placed.`);
      }
      continue;
    }
    if (r.quantity === null || r.outputPerCrewPerDay === null) {
      unsupported.push(`${r.id} — ${r.name}: ${r.duration} day(s) with ${r.quantity === null ? "no quantity" : "no output rate"} behind it`);
      continue;
    }
    const crews = r.crews === null ? 1 : r.crews;
    const achievable = r.outputPerCrewPerDay * crews * r.duration;
    if (achievable + 0.0001 < r.quantity) {
      const need = Math.ceil(r.quantity / (r.outputPerCrewPerDay * r.duration));
      unsupported.push(`${r.id} — ${r.name}: ${r.outputPerCrewPerDay} per crew per day × ${crews} crew(s) × ${r.duration} day(s) is ${achievable} against ${r.quantity} ${r.unit || ""}. ${need} crew(s) would be needed.`);
    }
  }
  add("unsupported_duration", "a duration with nothing supporting it, or arithmetic that does not reach the quantity", unsupported);
  add("unsourced_lead_time", "a procurement lead time with nothing recording who quoted it", unsourced);

  // 6. Critical sensitivity.
  const critical = rows.filter((r) => r.critical);
  const share = critical.length / rows.length;
  if (share >= 0.95 && rows.length > 3) {
    add("logic_broken", "almost everything is critical, which is broken logic rather than a tight plan",
      [`${critical.length} of ${rows.length} activities are on the critical path`]);
  } else if (share > criticalShareLimit) {
    add("no_resilience", "too much of the work is critical for the programme to absorb anything",
      [`${critical.length} of ${rows.length} activities (${Math.round(share * 100)}%) are critical, against a working limit of ${Math.round(criticalShareLimit * 100)}%`]);
  }

  // 7. Hard constraints.
  add("constraint_masking", "a hard date constraint holds a date steady while the work behind it slips, and the constraint is what the report reads",
    rows.filter((r) => r.constraint && /must (start|finish)|mandatory|start no later|finish no later/i.test(r.constraint))
      .map((r) => `${r.id} — ${r.name}: ${r.constraint}`));

  // 8. Loops.
  add("logic_loop", "a loop in the logic — it cannot be scheduled, and most tools break it somewhere of their own choosing",
    cycles(rows, succ).map((c) => c.join(" → ")));

  // 9. Zero duration.
  add("zero_duration", "a zero-duration activity that is not a milestone",
    rows.filter((r) => r.duration === 0 && !r.milestone).map((r) => `${r.id} — ${r.name}`));

  // The completion date, against the logic rather than against the bar.
  let completionFinding = null;
  const declared = completion ? instant(completion) : null;
  const latest = rows.reduce((m, r) => (r.end !== null && (m === null || r.end > m) ? r.end : m), null);
  if (declared !== null && latest !== null && latest > declared) {
    completionFinding = `the last activity finishes ${day(latest)}, after the declared completion of ${day(declared)}, by ${Math.round((latest - declared) / DAY)} day(s)`;
    add("completion_unsupported", "the declared completion date is earlier than the programme's own last activity", [completionFinding]);
  }

  const serious = findings.filter((f) => ["negative_float", "logic_loop", "logic_broken", "procurement_disconnected", "completion_unsupported"].includes(f.id));
  return {
    ok: findings.length === 0,
    activities: rows.length,
    criticalShare: Math.round(share * 100),
    findings,
    readFaults,
    verdict: findings.length === 0
      ? `${rows.length} activities interrogated; none of the ten interrogations found anything. That is a programme whose logic holds, which is not the same as a programme whose durations are achievable on this site.`
      : `${findings.length} interrogation(s) found something` + (serious.length ? `, ${serious.length} of them going to whether the completion date is deliverable at all: ${serious.map((f) => f.id).join(", ")}.` : "."),
  };
}

export function state() {
  return { interrogations: 10, kinds: KINDS.length, generates: false };
}
