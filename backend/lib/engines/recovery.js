/**
 * THE RECOVERY AGENT — options with their cost, and a baseline nobody moved.
 *
 * The register's condition: "Recovery options with their cost and programme
 * trade-offs, and time-impact analysis against a baseline that has not been
 * quietly rewritten."
 *
 * THE SECOND HALF IS THE WHOLE THING. A time-impact analysis is an
 * arithmetic comparison against a fixed baseline. Re-baseline the programme
 * and every delay disappears — not by being recovered, by being absorbed
 * into the new plan. It is the commonest way a slipping job reports itself as
 * on programme, it is rarely dishonest, and it is almost always fatal to the
 * entitlement: a contractor who cannot produce the baseline the delay is
 * measured from has no claim to measure.
 *
 * So this engine will not perform an analysis against a baseline whose
 * fingerprint differs from the one recorded at award. It does not correct the
 * baseline and it does not choose between them. It refuses, and it names both.
 *
 * WHAT IT REFUSES ON THE OPTIONS:
 *
 *   · AN OPTION WITH NO COST. "Work weekends" is not an option, it is a
 *     suggestion. Acceleration costs money and the trade-off is the answer.
 *   · MORE DAYS RECOVERED THAN THERE ARE DAYS OF DELAY. Recovering 30 days
 *     of a 14-day delay means the delay has been mis-measured, the option
 *     has been over-claimed, or both.
 *   · MORE DAYS RECOVERED THAN REMAIN. You cannot save six weeks in the four
 *     that are left.
 *   · ACCELERATION WITH NO RESOURCE CHANGE. Doing the same work with the same
 *     people faster is not a plan; it is the assumption every failed recovery
 *     rests on.
 *   · AN OPTION THAT RECOVERS TIME BY DESCOPING, not flagged as such. Time
 *     bought by leaving work out is real and it is a different conversation,
 *     because somebody still has to do the work.
 */

import { instant } from "../l7/evidence.js";
import { num } from "../l7/num.js";
import { contractFor, eventsFor } from "../l7/watch.js";
import { day } from "./moment.js";

const DAY = 86400000;

/** How time is bought. Each one costs something different. */
export const LEVERS = [
  { id: "resequence", name: "Resequence", costs: "risk and float, usually not money" },
  { id: "overtime", name: "Overtime", costs: "premium hours, and output per hour falls after week three" },
  { id: "additional_resource", name: "Additional crews or plant", costs: "money, and space on site" },
  { id: "shift_working", name: "Shift working", costs: "premium, supervision and welfare" },
  { id: "off_site", name: "Move work off site", costs: "money, and lead time to set up" },
  { id: "descope", name: "Remove work from this phase", costs: "nothing now, and the whole of it later" },
];
const LEVER_BY_ID = new Map(LEVERS.map((l) => [l.id, l]));

/**
 * THE BASELINE CHECK.
 *
 * `fingerprint` is whatever identifies the programme uniquely — a revision,
 * a file hash, a data date plus an activity count. This engine does not care
 * which, only that the one being analysed is the one recorded at award.
 */
export function baselineIntact({ atAward = null, analysed = null } = {}) {
  const a = String(atAward || "").trim();
  const b = String(analysed || "").trim();
  if (!a) {
    return { ok: false, reason: "no baseline fingerprint was recorded at award, so nothing can say whether this programme is the one the delay should be measured from. A time-impact analysis against an unidentified baseline is arithmetic with no fixed point." };
  }
  if (!b) return { ok: false, reason: "the programme being analysed carries no fingerprint, so it cannot be compared with the baseline at award." };
  if (a !== b) {
    return {
      ok: false,
      reason: `the baseline at award is "${a}" and the programme being analysed is "${b}". These are not the same programme. Re-baselining makes a delay disappear by absorbing it rather than recovering it, and a contractor who cannot produce the baseline the delay is measured from has no claim to measure. This engine will not choose between the two.`,
    };
  }
  return { ok: true, reason: null, fingerprint: a };
}

/** One recovery option, checked against the delay it claims to recover. */
export function option(raw = {}, { delayDays = null, remainingDays = null } = {}) {
  const faults = [];
  const id = String(raw.id || "").trim();
  if (!id) faults.push("no reference");
  const lever = String(raw.lever || "").trim();
  if (!LEVER_BY_ID.has(lever)) faults.push(`"${lever}" is not one of ${[...LEVER_BY_ID.keys()].join(", ")}`);

  const recovers = num(raw.recovers);
  if (recovers === null || recovers <= 0) faults.push("no number of days recovered");
  const cost = num(raw.cost);
  if (cost === null) {
    faults.push("no cost. \"Work weekends\" is not an option, it is a suggestion — acceleration costs money and the trade-off is the answer.");
  } else if (cost < 0) faults.push(`a cost of ${cost}`);

  if (recovers !== null && delayDays !== null && recovers > delayDays) {
    faults.push(`recovers ${recovers} day(s) against a delay of ${delayDays}. Either the delay is mis-measured or the option is over-claimed, and both get found out at the next report.`);
  }
  if (recovers !== null && remainingDays !== null && recovers > remainingDays) {
    faults.push(`recovers ${recovers} day(s) with only ${remainingDays} day(s) of work left to do it in. You cannot save six weeks in the four that remain.`);
  }

  const accelerating = ["overtime", "additional_resource", "shift_working"].includes(lever);
  if (accelerating && !String(raw.resourceChange || "").trim()) {
    faults.push("acceleration with no resource change stated. Doing the same work with the same people faster is not a plan; it is the assumption every failed recovery rests on.");
  }
  if (lever === "descope" && raw.descoped !== true) {
    faults.push("buys time by removing work and is not marked as descoping. Time bought by leaving work out is real and it is a different conversation, because somebody still has to do the work.");
  }
  if (raw.descoped === true && !String(raw.whoDoesItLater || "").trim()) {
    faults.push("descopes work with nothing recording who does it later, and when");
  }
  if (!String(raw.risk || "").trim()) faults.push("no risk stated. Every recovery option trades one risk for another.");

  const perDay = recovers && cost !== null && recovers > 0 ? Math.round((cost / recovers) * 100) / 100 : null;
  return {
    ok: faults.length === 0,
    faults,
    row: {
      id: id || null, lever: lever || null,
      leverCosts: LEVER_BY_ID.get(lever)?.costs || null,
      recovers, cost, costPerDay: perDay,
      resourceChange: String(raw.resourceChange || "").trim() || null,
      descoped: raw.descoped === true,
      whoDoesItLater: String(raw.whoDoesItLater || "").trim() || null,
      risk: String(raw.risk || "").trim() || null,
      note: raw.note ? String(raw.note) : null,
    },
  };
}

/**
 * The analysis.
 *
 * Refuses outright when the baseline moved. Every other finding is reported
 * with the options that survived, because a recovery plan with two bad
 * options and three good ones is still a recovery plan.
 */
export function analyse({
  baselineAtAward = null, baselineAnalysed = null,
  delayDays = null, remainingDays = null,
  plannedCompletion = null, forecastCompletion = null,
  options = [], project = null, eventId = null,
} = {}) {
  const base = baselineIntact({ atAward: baselineAtAward, analysed: baselineAnalysed });
  if (!base.ok) {
    return { ok: false, refused: true, reason: base.reason, options: [], rejected: [], verdict: `REFUSED. ${base.reason}` };
  }

  // The delay, from the dates where they were given, rather than taken on
  // trust from a field somebody typed.
  const planned = plannedCompletion ? instant(plannedCompletion) : null;
  const forecast = forecastCompletion ? instant(forecastCompletion) : null;
  const computed = planned !== null && forecast !== null ? Math.round((forecast - planned) / DAY) : null;
  const stated = num(delayDays);
  const notes = [];
  if (computed !== null && stated !== null && computed !== stated) {
    notes.push(`the delay is stated as ${stated} day(s) and the dates give ${computed} (${day(planned)} to ${day(forecast)}). The dates are used below; a stated figure that disagrees with its own dates is the figure that gets challenged.`);
  }
  const delay = computed !== null ? computed : stated;

  // Is the delay an event anybody notified? Recovery and entitlement are
  // different questions and the second one has a deadline on it.
  let entitlement = null;
  if (project) {
    const held = contractFor(project);
    if (!held) entitlement = `no contract is recorded for ${project}, so nothing can say whether this delay carries an entitlement or has been notified.`;
    else {
      const ev = eventId ? eventsFor(project).find((e) => e.id === String(eventId)) : null;
      entitlement = ev
        ? `the delay is linked to recorded event ${ev.id} (${ev.event}), aware ${day(ev.awareAt)}${ev.notifiedAt ? `, notified ${day(ev.notifiedAt)}` : " and NOT recorded as notified"}.`
        : `no site event is linked to this delay. Recovering time at your own cost and recovering it as a compensation event are different plans, and the second one has a notice period on it.`;
    }
  }

  const checked = options.map((o) => ({ ...option(o, { delayDays: delay, remainingDays: num(remainingDays) }), given: o }));
  const good = checked.filter((c) => c.ok).map((c) => c.row);
  const rejected = checked.filter((c) => !c.ok).map((c) => ({ id: c.given?.id || null, faults: c.faults }));

  const ranked = [...good].sort((a, b) => (a.costPerDay ?? Infinity) - (b.costPerDay ?? Infinity));
  const totalRecoverable = good.reduce((t, o) => t + (o.recovers || 0), 0);
  const cheapestFull = ranked.find((o) => delay !== null && o.recovers >= delay) || null;
  const descoping = good.filter((o) => o.descoped);

  return {
    ok: rejected.length === 0,
    refused: false,
    baseline: base.fingerprint,
    delayDays: delay,
    options: ranked,
    rejected,
    notes,
    entitlement,
    totalRecoverable,
    // A combination is NOT proposed. Recovery levers interact — overtime and
    // additional crews on the same face do not add up — and an engine adding
    // them together would produce a number no planner would sign.
    verdict: [
      rejected.length ? `${rejected.length} option(s) are not usable as written.` : null,
      delay === null ? "The delay could not be established, so no option can be measured against it." : `${delay} day(s) of delay.`,
      cheapestFull
        ? `${cheapestFull.id} is the cheapest single option that covers it, at ${cheapestFull.cost} (${cheapestFull.costPerDay} per day).`
        : delay !== null && totalRecoverable < delay
          ? `No option, and no combination of them, recovers ${delay} day(s): the options total ${totalRecoverable}. The completion date moves, and the question is whose time it is.`
          : `No single option covers it. The options total ${totalRecoverable} day(s), but they are not added up here — overtime and extra crews on the same working face do not sum, and a figure no planner would sign is worse than no figure.`,
      descoping.length ? `${descoping.length} option(s) buy time by removing work from this phase.` : null,
    ].filter(Boolean).join(" "),
  };
}

export function state() {
  return { levers: LEVERS.length, refusesRebaseline: true };
}
