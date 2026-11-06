/**
 * The programme for producing the bid — which is not the programme for
 * building the job, and is the one nobody writes down.
 *
 * Every bid has a delivery programme. It is drawn carefully, it is reviewed,
 * and it is submitted. Almost no bid has a programme for its own production:
 * when the enquiries go out, when the returns are due, when the estimate
 * freezes, when settlement sits, when the thing is actually uploaded. Those
 * dates live in somebody's head and in a calendar invite.
 *
 * THE FAILURE IS ORDINARY AND IT IS ALWAYS THE SAME SHAPE. Every individual
 * deadline is met except the ones nobody wrote down. Settlement convenes with
 * three packages unpriced, because the enquiry went out late and the return
 * date was never agreed with the supplier; the estimate "freezes" during the
 * settlement meeting; the technical answers are written the night before by
 * the person who was going to review them. Nobody missed a deadline. There
 * were no deadlines.
 *
 * So this is a deterministic engine over dates, for the same reason the
 * estimating engine is: arithmetic is not the model's to assert, and the
 * interval between two dates is arithmetic.
 *
 * THREE CONTROLS, AND EACH IS A FAILURE SOMEBODY HAS LIVED THROUGH.
 *
 *   · THE INTERNAL DEADLINE IS NOT THE BUYER'S. A bid planned to land at the
 *     buyer's minute has no room for a portal that will not accept a 40 MB
 *     file at ten to five. The internal submission date must come first, and
 *     the gap between them is the only contingency a bid really has.
 *   · ORDER IS A CONSTRAINT, NOT A PREFERENCE. An estimate cannot freeze
 *     after the settlement that approves it. A signature cannot precede the
 *     settlement it authorises. Upload cannot precede the signature. Stated
 *     as logic, these are checkable; stated as a Gantt chart, they are
 *     decoration.
 *   · AN ACTIVITY WITH NO OWNER HAPPENS TO NOBODY. The commonest entry on a
 *     bid plan is a date with a department against it.
 *
 * It reports. It does not block, because a bid plan that fails on the first
 * day of a six-week bid is normal and the point is that somebody sees it.
 */

import { instant } from "./evidence.js";

/**
 * The activities a bid production programme is expected to carry, in the
 * order they must occur. A programme may carry more; it may not reorder
 * these, and anything it omits is reported rather than assumed absent on
 * purpose.
 */
export const ACTIVITIES = [
  { id: "enquiries", name: "Supplier enquiries issued" },
  { id: "returns", name: "Supplier returns due" },
  { id: "surveys", name: "Surveys and site visit complete" },
  { id: "clarifications", name: "Buyer clarification cut-off" },
  { id: "design", name: "Design freeze" },
  { id: "estimate", name: "Estimate freeze" },
  { id: "review", name: "Technical review" },
  { id: "settlement", name: "Settlement" },
  { id: "signature", name: "Authorised signature" },
  { id: "internal", name: "Internal submission deadline" },
];

/** The order the activities must occur in, as pairs that cannot invert. */
export const ORDER = [
  ["enquiries", "returns", "an enquiry cannot be returned before it is issued"],
  ["returns", "estimate", "the estimate cannot freeze before the supplier prices it depends on are in"],
  ["surveys", "estimate", "an estimate frozen before the survey prices what nobody has seen"],
  ["clarifications", "estimate", "the estimate cannot freeze before the last answer can arrive"],
  ["design", "estimate", "the estimate cannot freeze before the design it prices"],
  ["estimate", "settlement", "an estimate that freezes after settlement was not what settlement approved"],
  ["review", "settlement", "a technical review after settlement reviews a submitted bid"],
  ["settlement", "signature", "a signature before settlement authorises a price nobody set"],
  ["signature", "internal", "the bid is uploaded after it is signed, not before"],
];

const day = 24 * 60 * 60 * 1000;

/** Whole days from a to b, or null if either cannot be read. */
export function daysBetween(a, b) {
  const x = instant(a);
  const y = instant(b);
  if (x === null || y === null) return null;
  return Math.round((y - x) / day);
}

/**
 * Check a bid production programme.
 *
 * `activities` is a map of activity id to { date, owner }. `buyerDeadline` is
 * the date the buyer closes. `minContingencyDays` is how much room the
 * internal deadline must leave in front of it — one working day by default,
 * because the portal failure happens on the last day and never on the others.
 */
export function checkBidProgramme({
  activities = {},
  buyerDeadline = "",
  minContingencyDays = 1,
  today = null,
} = {}) {
  const missing = [];
  const unreadableDates = [];
  const unowned = [];
  const dates = {};

  for (const a of ACTIVITIES) {
    const entry = activities[a.id];
    if (!entry || (!entry.date && !entry.owner)) { missing.push(a.name); continue; }
    const at = instant(entry.date);
    if (at === null) unreadableDates.push({ activity: a.name, given: String(entry.date ?? "(blank)") });
    else dates[a.id] = entry.date;
    const owner = String(entry.owner ?? "").trim();
    // A department is not a person. "Commercial" cannot be telephoned on the
    // Friday the return is late.
    if (!owner || /^(tbc|tba|team|dept|department|commercial|estimating|bid team|n\/a|-)$/i.test(owner)) {
      unowned.push({ activity: a.name, owner: owner || "(blank)" });
    }
  }

  const outOfOrder = [];
  for (const [first, second, why] of ORDER) {
    const d = daysBetween(dates[first], dates[second]);
    if (d === null) continue;             // one of them is missing; already reported
    if (d < 0) outOfOrder.push({ first, second, why, days: d });
  }

  // The gap that is the bid's only real contingency.
  const buyerAt = instant(buyerDeadline);
  const contingencyDays = daysBetween(dates.internal, buyerDeadline);
  let contingency = null;
  if (buyerAt === null) {
    contingency = { ok: false, days: null, say: "the buyer's deadline is not a date, so there is nothing to work back from" };
  } else if (contingencyDays === null) {
    contingency = { ok: false, days: null, say: "no internal submission deadline, so the bid is planned to land at the buyer's minute" };
  } else if (contingencyDays < 0) {
    contingency = { ok: false, days: contingencyDays, say: `the internal deadline is ${-contingencyDays} day(s) AFTER the buyer's — the plan submits late` };
  } else if (contingencyDays < minContingencyDays) {
    contingency = { ok: false, days: contingencyDays, say: `only ${contingencyDays} day(s) between the internal deadline and the buyer's; the portal failure happens on the last day` };
  } else {
    contingency = { ok: true, days: contingencyDays, say: `${contingencyDays} day(s) of contingency between the internal deadline and the buyer's` };
  }

  // Dates already behind us, where a reference point is given. A plan whose
  // first three activities are in the past is not a plan, it is a record.
  const overdue = [];
  if (today) {
    const now = instant(today);
    if (now !== null) {
      for (const a of ACTIVITIES) {
        const at = instant(dates[a.id]);
        if (at !== null && at < now) overdue.push({ activity: a.name, date: dates[a.id] });
      }
    }
  }

  const faults =
    missing.length + unreadableDates.length + unowned.length + outOfOrder.length + (contingency.ok ? 0 : 1);

  return {
    missing,
    unreadableDates,
    unowned,
    outOfOrder,
    contingency,
    overdue,
    planned: Object.keys(dates).length,
    faults,
    ok: faults === 0,
    say: faults === 0
      ? `all ${ACTIVITIES.length} activities dated, owned and in order, with ${contingency.days} day(s) of contingency`
      : `${faults} fault(s) in the bid production programme`,
  };
}

/** The notes an approver reads. */
export function programmeNotes(result) {
  const out = [];
  if (!result) return out;
  if (result.missing?.length) {
    out.push(`THE BID PLAN DOES NOT CARRY — ${result.missing.join(", ")}. `
      + "An activity with no line on the plan has no date, and a date nobody wrote down is the one that gets missed.");
  }
  if (result.unreadableDates?.length) {
    out.push(`A BID PLAN DATE THAT IS NOT A DATE — ${result.unreadableDates.map((x) => `${x.activity} ("${x.given}")`).join(", ")}.`);
  }
  if (result.unowned?.length) {
    out.push(`AN ACTIVITY WITH NO NAMED OWNER — ${result.unowned.map((x) => `${x.activity} (${x.owner})`).join(", ")}. `
      + "A department cannot be telephoned on the Friday the return is late.");
  }
  if (result.outOfOrder?.length) {
    for (const x of result.outOfOrder) out.push(`OUT OF ORDER — ${x.why} (${x.first} is ${-x.days} day(s) after ${x.second}).`);
  }
  if (result.contingency && !result.contingency.ok) {
    out.push(`SUBMISSION CONTINGENCY — ${result.contingency.say}.`);
  }
  if (result.overdue?.length) {
    out.push(`ALREADY PASSED — ${result.overdue.map((x) => `${x.activity} (${x.date})`).join(", ")}. `
      + "A plan whose activities are behind it is a record, not a plan.");
  }
  return out;
}
