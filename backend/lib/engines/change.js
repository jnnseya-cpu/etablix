/**
 * THE CHANGE AND ENTITLEMENT ENGINE.
 *
 * Between an instruction arriving and money changing hands there are six
 * states, and the loss happens in the gaps between them rather than in any
 * one of them. The monthly control report already says what unvalued change
 * will cost to leave another month; what nothing did was hold the change
 * itself as a controlled object and reconcile it against the contract that
 * governs it.
 *
 * THE THREE THINGS THIS REFUSES, AND WHY EACH ONE IS A LOSS.
 *
 *   · A CLAIM WITH NO NOTICE BEHIND IT, ON A CONTRACT WITH A TIME BAR. This
 *     is the expensive one. The claim is prepared, priced, submitted and
 *     defeated on a single sentence: it was never notified. The engine will
 *     not accept a claimed change on a barring contract unless the notice is
 *     referenced, and it checks the notice date against the bar rather than
 *     taking the reference as proof.
 *   · A VALUE WITH NO BASIS. "£48,000" is a number; "measured against the
 *     activity schedule at the contract rates, plus 14 days of standing plant
 *     at the quoted day rate" is a valuation. The first cannot be defended
 *     and therefore cannot be relied on, which is the same rule the rate
 *     build-up applies to a tender price.
 *   · A TIME CLAIM WITH NO PROGRAMME IMPACT. An extension of time is measured
 *     as the delay to planned Completion. A claim for days with nothing
 *     saying which activities moved is an assertion, and it invites the
 *     answer that the delay was concurrent.
 *
 * AND ONE IT REFUSES BECAUSE IT IS ARITHMETIC: a total that is not the sum of
 * its own elements. A change whose headline figure and whose priced elements
 * disagree is cited by whichever of the two suits the reader.
 */

import { contractFor, eventsFor } from "../l7/watch.js";
import { resolve, triggerFor } from "../l7/clauses.js";
import { instant } from "../l7/evidence.js";
import { num } from "../l7/num.js";

/** Where a change is in its life. The order is the order. */
export const STATES = ["instructed", "notified", "quoted", "agreed", "rejected", "claimed", "settled"];
const STATE_ORDER = new Map(STATES.map((s, i) => [s, i]));

/** What the change is asking for. */
export const RELIEFS = ["time", "money", "both", "none"];

import { moment, day } from "./moment.js";

const DAY = 86400000;

/** A priced element of a change. Every one carries its own basis. */
function element(raw = {}, faults, i) {
  const value = num(raw.value);
  const basis = String(raw.basis || "").trim();
  const what = String(raw.what || "").trim();
  if (!what) faults.push(`element ${i + 1} says what it costs and not what it is`);
  if (value === null) faults.push(`element ${i + 1} ("${what}") has no value`);
  if (basis.length < 8) {
    faults.push(`element ${i + 1} ("${what}") has a value with no basis. "£${value ?? "?"}" is a number; how it was arrived at is what makes it a valuation, and a valuation with no basis cannot be defended and therefore cannot be relied on.`);
  }
  return { what, value, basis: basis || null };
}

/**
 * One change, checked against its own contents and its own contract.
 *
 * `contract` is optional: without it the internal checks still run, and the
 * time-bar check reports that it could not be made rather than passing.
 */
export function validateChange(raw = {}, { project = null, now = null } = {}) {
  const faults = [];
  const warnings = [];

  const ref = String(raw.ref || "").trim();
  if (!ref) faults.push("no reference — a change nobody can cite is a change nobody will settle");

  const state = String(raw.state || "").trim();
  if (!STATE_ORDER.has(state)) faults.push(`"${state}" is not one of ${STATES.join(", ")}`);

  const title = String(raw.title || "").trim();
  if (title.length < 12) faults.push("the title is too short to identify the change at a settlement meeting");

  const relief = String(raw.relief || "").trim();
  if (!RELIEFS.includes(relief)) faults.push(`"${relief}" is not one of ${RELIEFS.join(", ")}`);

  const instructed = raw.instructedAt ? instant(raw.instructedAt) : null;
  if (raw.instructedAt && instructed === null) faults.push(`"${raw.instructedAt}" is not a date`);
  if (STATE_ORDER.get(state) >= STATE_ORDER.get("instructed") && !String(raw.instruction || "").trim()) {
    faults.push("no instruction reference. An instructed change with nothing identifying the instruction is a change the other side can say never happened.");
  }

  // The elements, and the arithmetic.
  const rawElements = Array.isArray(raw.elements) ? raw.elements : [];
  const elements = rawElements.map((e, i) => element(e, faults, i));
  const sum = elements.reduce((t, e) => t + (e.value === null ? 0 : e.value), 0);
  const claimedValue = num(raw.value);

  if (["quoted", "agreed", "claimed", "settled"].includes(state)) {
    if (relief !== "time" && relief !== "none") {
      if (elements.length === 0) faults.push(`a change at "${state}" seeking money with no priced elements`);
      if (claimedValue === null) faults.push(`a change at "${state}" seeking money with no total`);
    }
  }
  if (claimedValue !== null && elements.length && Math.abs(claimedValue - sum) > 0.005) {
    faults.push(`a total of ${claimedValue} against elements summing to ${sum}. A change whose headline figure and whose priced elements disagree gets cited by whichever of the two suits the reader.`);
  }

  // Time.
  const days = num(raw.days);
  if (relief === "time" || relief === "both") {
    if (days === null || days <= 0) faults.push("a claim for time with no number of days");
    if (!String(raw.programmeImpact || "").trim()) {
      faults.push("a claim for time with no programme impact stated. An extension is measured as the delay to planned Completion; days claimed with nothing saying which activities moved is an assertion, and it invites the answer that the delay was concurrent.");
    }
  }
  if ((relief === "money" || relief === "none") && days !== null && days > 0) {
    faults.push(`${days} day(s) claimed on a change that is not seeking time. One of the two fields is wrong.`);
  }

  if (state === "settled") {
    if (!raw.settledAt || instant(raw.settledAt) === null) faults.push("settled with no date");
    if (relief !== "none" && claimedValue === null && (days === null || days === 0)) {
      faults.push("settled with neither a sum nor a period. What was settled?");
    }
  }
  if (state === "rejected" && !String(raw.rejectedReason || "").trim()) {
    faults.push("rejected with no reason recorded. A rejection with no reason cannot be answered, and it will be answered.");
  }

  // THE TIME BAR. The expensive one.
  const notice = String(raw.notice || "").trim();
  let bar = null;
  if (state === "claimed" || state === "settled") {
    if (!project) {
      warnings.push("no project given, so this change could not be checked against a contract. On a barring contract that check is the difference between a claim and a lost right.");
    } else {
      bar = barCheck({ project, change: raw, now });
      if (bar.barred) {
        faults.push(bar.say);
      } else if (bar.needsNotice && !notice) {
        faults.push(`a CLAIMED change on ${bar.form} with no notice referenced. ${bar.say} The claim can be prepared, priced, submitted and defeated on one sentence: it was never notified.`);
      } else if (bar.say) {
        warnings.push(bar.say);
      }
    }
  }

  const row = {
    ref: ref || null,
    title: title || null,
    state,
    relief,
    instruction: String(raw.instruction || "").trim() || null,
    instructedAt: instructed === null ? null : day(instructed),
    notice: notice || null,
    noticeAt: raw.noticeAt && instant(raw.noticeAt) !== null ? day(instant(raw.noticeAt)) : null,
    eventId: raw.eventId ? String(raw.eventId) : null,
    value: claimedValue,
    elements,
    days,
    programmeImpact: String(raw.programmeImpact || "").trim() || null,
    controlAccount: String(raw.controlAccount || "").trim() || null,
    settledAt: raw.settledAt && instant(raw.settledAt) !== null ? day(instant(raw.settledAt)) : null,
    rejectedReason: String(raw.rejectedReason || "").trim() || null,
  };

  return { ok: faults.length === 0, faults, warnings, row, bar };
}

/**
 * Is this change's claim inside the contract's bar?
 *
 * The reference is not taken as proof. A notice reference with a date after
 * the bar expired is a record of having been late, and it is the commonest
 * thing a claim file contains.
 */
export function barCheck({ project, change = {}, now = null } = {}) {
  const held = contractFor(project);
  if (!held) {
    return { ok: false, needsNotice: false, barred: false, form: null, say: `no contract is recorded for ${project}, so nothing can say whether this claim is inside a bar. That is a gap in the record, not an absence of a bar.` };
  }
  const form = held.row.form;
  const eventId = change.eventId ? String(change.eventId) : null;
  const event = eventId ? eventsFor(project).find((e) => e.id === eventId) : null;
  if (!event) {
    return { ok: false, needsNotice: true, barred: false, form, say: `no site event is linked to this change, so the clock cannot be started. Under ${form} a claim is measured from the day the party became aware, and a change with no event has no such day.` };
  }
  const trigger = triggerFor(event.event, form);
  if (!trigger) {
    return { ok: false, needsNotice: false, barred: false, form, say: `${form} has no recorded name for "${event.event}", so this engine cannot say which clause bars it.` };
  }
  const at = moment(now, Date.now());
  const r = resolve(held.graph, { trigger, awareAt: new Date(event.awareAt).toISOString(), now: new Date(at).toISOString() });
  if (!r.ok) return { ok: false, needsNotice: false, barred: false, form, say: r.reason };

  const bars = r.clauses.filter((c) => c.barring);
  if (bars.length === 0) {
    return { ok: true, needsNotice: false, barred: false, form, say: `${form} has no clause barring this event outright, so a late claim is weakened rather than lost. It is still late.` };
  }
  const worst = bars[0];
  const noticeAt = change.noticeAt ? instant(change.noticeAt) : null;
  const deadline = worst.deadline ? Date.parse(worst.deadline) : null;

  if (noticeAt !== null && deadline !== null && noticeAt > deadline) {
    return {
      ok: false, needsNotice: true, barred: true, form, clause: `${worst.form} ${worst.ref}`,
      say: `the notice is dated ${day(noticeAt)} and clause ${worst.ref} expired on ${day(deadline)}. A notice reference is not proof the notice was in time, and a claim file containing a late one is a record of having been late.`,
    };
  }
  if (noticeAt === null && worst.late) {
    return {
      ok: false, needsNotice: true, barred: true, form, clause: `${worst.form} ${worst.ref}`,
      say: `clause ${worst.ref} expired on ${day(deadline)} and no notice is recorded. ${worst.say}`,
    };
  }
  return {
    ok: true, needsNotice: true, barred: false, form, clause: `${worst.form} ${worst.ref}`,
    say: `clause ${worst.ref} bars this event if it is not notified by ${deadline === null ? "a date this engine cannot compute" : day(deadline)}${worst.daysRemaining === null ? "" : ` (${worst.daysRemaining} day(s))`}.`,
  };
}

/**
 * The register, reconciled.
 *
 * The valuable output is the disagreement, not the total: change instructed
 * and never valued, change agreed and never settled, and money claimed under
 * a bar that had already expired.
 */
export function reconcile(rows = [], { project = null, now = null, staleDays = 56 } = {}) {
  const at = moment(now, Date.now());
  // Mapped before filtering, so a finding cannot end up attached to another
  // row's reference: filtering first makes the index count the filtered array.
  const checked = rows.map((r) => ({ ...validateChange(r, { project, now: at }), given: r }));
  const good = checked.filter((c) => c.ok).map((c) => c.row);
  const rejected = checked.filter((c) => !c.ok).map((c) => ({ ref: c.given?.ref || null, faults: c.faults }));

  const at_ = at === null ? Date.now() : at;
  const unvalued = good.filter((r) => ["instructed", "notified"].includes(r.state));
  const stale = unvalued.filter((r) => r.instructedAt && (at_ - Date.parse(r.instructedAt)) / DAY > staleDays);
  const agreedUnsettled = good.filter((r) => r.state === "agreed");

  const total = (list) => list.reduce((t, r) => t + (r.value || 0), 0);
  const totals = {
    instructed: good.length,
    agreedValue: total(good.filter((r) => ["agreed", "settled"].includes(r.state))),
    claimedValue: total(good.filter((r) => r.state === "claimed")),
    settledValue: total(good.filter((r) => r.state === "settled")),
    daysAgreed: good.filter((r) => ["agreed", "settled"].includes(r.state)).reduce((t, r) => t + (r.days || 0), 0),
    daysClaimed: good.filter((r) => r.state === "claimed").reduce((t, r) => t + (r.days || 0), 0),
  };

  // A change with no control account cannot be measured against anything,
  // which is the same failure the monthly report already refuses on payments.
  const unaccounted = good.filter((r) => ["quoted", "agreed", "claimed", "settled"].includes(r.state) && !r.controlAccount);

  return {
    ok: rejected.length === 0,
    rows: good,
    rejected,
    unvalued,
    stale,
    agreedUnsettled,
    unaccounted,
    totals,
    say: [
      rejected.length ? `${rejected.length} change(s) are not admissible as written and are listed rather than counted.` : null,
      stale.length ? `${stale.length} instructed change(s) have been unvalued for more than ${staleDays} days.` : null,
      agreedUnsettled.length ? `${agreedUnsettled.length} agreed change(s) are not settled.` : null,
      unaccounted.length ? `${unaccounted.length} priced change(s) sit against no control account, so nothing can measure them.` : null,
      `${good.length} controlled change(s): ${totals.agreedValue} agreed, ${totals.claimedValue} claimed, ${totals.daysAgreed} day(s) agreed.`,
    ].filter(Boolean).join(" "),
  };
}

export function state() {
  return { states: STATES.length, reliefs: RELIEFS.length };
}
