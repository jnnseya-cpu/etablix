/**
 * THE COMMISSIONING AGENT — the order of the stages, and who watched.
 *
 * Commissioning is a sequence, and the sequence is the safety. You cannot
 * balance a system that has not been set to work, and you cannot set to work
 * a system whose static checks are not complete — not because a procedure
 * says so, but because doing it fills a chilled-water system with air or runs
 * a pump dry.
 *
 * On a register, though, the stages are eight columns of ticks, and ticking
 * them out of order looks exactly like ticking them in order. A handover pack
 * assembled from that register reads as complete.
 *
 * WHAT THIS REFUSES:
 *
 *   · A STAGE COMPLETE WHILE A STAGE BEFORE IT IS NOT. The register is a row
 *     of ticks and the order is invisible in it.
 *   · A STAGE DATED BEFORE THE ONE BEFORE IT. Same failure, written in dates
 *     rather than in ticks, and harder to see.
 *   · A WITNESSED STAGE WITNESSED BY THE INSTALLER. A witness who did the
 *     work is not a witness. This is the same independence rule as the audit
 *     programme and the adversarial review.
 *   · A PERFORMANCE TEST WITH NO CRITERION AND NO RESULT. "Tested: yes" is
 *     not a test result; it is somebody's recollection of one.
 *   · A RESULT OUTSIDE ITS OWN CRITERION, RECORDED AS A PASS. The same
 *     failure as a sensor reading above its threshold marked OK, and it
 *     arrives at handover as a system that does not perform.
 */

import { num } from "../l7/num.js";
import { day, asAtOr, moment } from "./moment.js";

const DAY = 86400000;

/** In order. Each one needs the one before it. */
export const STAGES = [
  { id: "installed", name: "Installed", witnessed: false },
  { id: "static", name: "Static completion and pre-commission checks", witnessed: false },
  { id: "set_to_work", name: "Set to work", witnessed: false },
  { id: "regulated", name: "Regulated and balanced", witnessed: false },
  { id: "performance", name: "Performance tested", witnessed: true },
  { id: "witnessed", name: "Witnessed by the client", witnessed: true },
  { id: "documented", name: "Records issued", witnessed: false },
];
const ORDER = new Map(STAGES.map((s, i) => [s.id, i]));

/** One system's commissioning record. */
export function systemRecord(raw = {}, { asAt = null } = {}) {
  const faults = [];
  const at = asAtOr(asAt);
  const id = String(raw.system || raw.id || "").trim();
  if (!id) faults.push("no system reference");
  const installer = String(raw.installer || "").trim();
  if (!installer) faults.push("nobody recorded as the installing contractor, so no witness can be checked for independence");

  const given = raw.stages && typeof raw.stages === "object" ? raw.stages : {};
  const done = [];
  for (const s of STAGES) {
    const row = given[s.id];
    if (!row || row.complete !== true) continue;
    const when = row.at ? moment(row.at) : null;
    if (row.at && when === null) faults.push(`${s.id}: "${row.at}" is not a date`);
    done.push({ stage: s.id, at: when, by: String(row.by || "").trim() || null, witness: String(row.witness || "").trim() || null, row });
  }

  // Order, by tick.
  for (const d of done) {
    const i = ORDER.get(d.stage);
    for (const s of STAGES.slice(0, i)) {
      if (!done.some((x) => x.stage === s.id)) {
        faults.push(`"${STAGES[i].name}" is complete and "${s.name}" is not. The register is a row of ticks and the order is invisible in it — and the order is the safety: a system balanced before it was set to work was balanced on air.`);
      }
    }
  }
  // Order, by date.
  const dated = done.filter((d) => d.at !== null).sort((a, b) => ORDER.get(a.stage) - ORDER.get(b.stage));
  for (let i = 1; i < dated.length; i++) {
    if (dated[i].at < dated[i - 1].at) {
      faults.push(`"${STAGES[ORDER.get(dated[i].stage)].name}" is dated ${day(dated[i].at)}, before "${STAGES[ORDER.get(dated[i - 1].stage)].name}" on ${day(dated[i - 1].at)}. The same failure as an out-of-order tick, written in dates and harder to see.`);
    }
  }

  // Witnessing.
  for (const d of done) {
    const spec = STAGES[ORDER.get(d.stage)];
    if (!spec.witnessed) continue;
    if (!d.witness) {
      faults.push(`"${spec.name}" is complete with nobody named as witnessing it`);
    } else if (installer && d.witness.toLowerCase() === installer.toLowerCase()) {
      faults.push(`"${spec.name}" was witnessed by ${d.witness}, who installed it. A witness who did the work is not a witness.`);
    }
  }

  // Performance results.
  const tests = Array.isArray(raw.tests) ? raw.tests : [];
  for (const t of tests) {
    const name = String(t.name || "(unnamed test)");
    const criterion = String(t.criterion || "").trim();
    const result = num(t.result);
    const target = num(t.target);
    const tol = num(t.tolerance);
    if (!criterion) faults.push(`${name}: no criterion. "Tested: yes" is not a test result; it is somebody's recollection of one.`);
    if (t.result !== undefined && result === null) faults.push(`${name}: the result "${t.result}" is not a number`);
    if (result !== null && target !== null && tol !== null) {
      const off = Math.abs(result - target);
      const passed = off <= tol;
      if (!passed && t.passed === true) {
        faults.push(`${name}: ${result} against ${target} ± ${tol} is outside its own criterion and is recorded as a PASS. The same failure as a sensor reading above its threshold marked OK, and it arrives at handover as a system that does not perform.`);
      }
      if (passed && t.passed === false) {
        faults.push(`${name}: ${result} is within ${target} ± ${tol} and is recorded as a failure. One of the two is wrong.`);
      }
    }
  }

  const reached = done.length ? STAGES[Math.max(...done.map((d) => ORDER.get(d.stage)))] : null;
  const contiguous = STAGES.findIndex((s) => !done.some((d) => d.stage === s.id));
  return {
    ok: faults.length === 0,
    faults,
    row: {
      system: id || null,
      installer: installer || null,
      reached: reached ? reached.id : null,
      // How far it has got WITHOUT a gap. The furthest tick flatters a row
      // with holes in it, and a handover pack is assembled from the furthest
      // tick.
      complete: contiguous === -1 ? STAGES.length : contiguous,
      of: STAGES.length,
      percent: Math.round(((contiguous === -1 ? STAGES.length : contiguous) / STAGES.length) * 100),
      lastAt: dated.length ? day(dated[dated.length - 1].at) : null,
      tests: tests.length,
    },
    asAt: day(at),
  };
}

/** Every system, and whether the handover date is reachable. */
export function programme({ systems = [], handoverDate = null, asAt = null, daysPerStage = 5 } = {}) {
  const at = asAtOr(asAt);
  const checked = systems.map((s) => ({ ...systemRecord(s, { asAt: at }), given: s }));
  const good = checked.filter((c) => c.ok).map((c) => c.row);
  const rejected = checked.filter((c) => !c.ok).map((c) => ({ system: c.given?.system || c.given?.id || null, faults: c.faults }));

  const by = handoverDate ? moment(handoverDate) : null;
  const daysLeft = by === null ? null : Math.round((by - at) / DAY);
  const atRisk = by === null ? [] : good.filter((r) => (STAGES.length - r.complete) * daysPerStage > daysLeft)
    .map((r) => ({ system: r.system, remaining: STAGES.length - r.complete, needs: (STAGES.length - r.complete) * daysPerStage, daysLeft }));

  const all = checked.length;
  const finished = good.filter((r) => r.complete === STAGES.length).length;
  return {
    ok: rejected.length === 0 && atRisk.length === 0,
    asAt: day(at),
    handoverDate: by === null ? null : day(by),
    systems: good,
    rejected,
    atRisk,
    say: [
      rejected.length ? `${rejected.length} of ${all} system(s) have a commissioning record that is not admissible as written.` : null,
      `${finished} of ${all} system(s) are complete through every stage without a gap.`,
      atRisk.length
        ? `${atRisk.length} system(s) cannot reach witnessed and documented by ${day(by)} at ${daysPerStage} days a stage: ${atRisk.map((r) => `${r.system} needs ${r.needs} days and has ${r.daysLeft}`).join("; ")}. That is a forecast from the stages remaining, not a prediction about anybody's effort.`
        // A SYSTEM WHOSE RECORD IS INADMISSIBLE IS NOT FORECAST, and saying
        // "every system can still make it" while only some were assessed is
        // exactly the reassurance a handover report must not give. The first
        // draft of this sentence did that.
        : by !== null
          ? rejected.length
            ? `Of the ${good.length} system(s) whose record could be read, all can still reach documented by ${day(by)}. The other ${rejected.length} were not forecast at all, because a record that is not admissible cannot be counted from.`
            : `Every system can still reach documented by ${day(by)}.`
          : null,
    ].filter(Boolean).join(" "),
  };
}

export function state() { return { stages: STAGES.length, witnessedStages: STAGES.filter((s) => s.witnessed).length }; }
