/**
 * Off-hire: six rules in order, and the one fact everybody gets wrong.
 *
 * THE FACT. A sent email does not stop billing. Nor does a booking
 * reference, nor a collection date in somebody's diary, nor a note in the
 * minutes saying the cabin is going. Hire stops when the CONTRACT says it
 * stops — on a verified notice after its notice period, or on physical
 * return, or on whatever condition the hire agreement names — and until one
 * of those is evidenced the charge is still running. A platform that marks
 * hire as ended because a message was dispatched has produced a cost report
 * that is wrong in the company's favour, which is the direction nobody
 * checks.
 *
 * So request, notice dispatch, supplier confirmation, contract-effective
 * stop, isolation, collection, return, damage, accrued hire and invoice
 * closure are TEN DISTINCT FACTS. Each is recorded separately, none implies
 * another, and `billingStop` will not name a stop date without the evidence
 * the contract requires for one.
 *
 * THE SECOND THING, AND IT IS THE CABIN 17 CASE. An empty cabin costing hire
 * is a commercial problem with an obvious answer, and the obvious answer is
 * sometimes the dangerous one: cabin 17 is empty, and its panel still serves
 * Phase B's live fire loop. The withdrawal is blocked. What must not happen
 * next is that the commercial clock is forgotten because the work is held —
 * the notice deadline arrives, nobody sends anything, and the company pays
 * another month of hire on an asset it decided three weeks ago to return.
 *
 * So the notice deadline is computed and RETAINED THROUGH A HOLD. The two
 * answers are separate: the physical withdrawal is refused, and the
 * commercial deadline keeps counting and keeps being reported. A rule engine
 * that returned one verdict would lose whichever of the two the caller did
 * not ask about.
 *
 * AND THE RULES RUN IN ORDER AND STOP. The specification is explicit that
 * OFF-01 to OFF-06 are implemented in sequence. Checking authority after
 * reading the dependency graph wastes the read; checking the dependency graph
 * after pinning the contract clause pins a clause for an action that is not
 * permitted. The first failure is the answer, and the remaining rules are
 * reported as not reached rather than as passed.
 */

import { instant } from "../l7/evidence.js";

/** The ten facts, each recorded on its own, none implying another. */
export const OFF_HIRE_FACTS = [
  "requested", "noticeDispatched", "supplierConfirmed", "contractEffectiveStop",
  "isolated", "collected", "returned", "damageAssessed", "hireAccrued", "invoiceClosed",
];

/** What stops the charge, per the hire agreement. There is no default. */
export const STOP_RULES = ["NOTICE", "RETURN", "COLLECTION", "CONDITION"];

/** Dispatch states, from the specification's own state machine. */
export const DISPATCH_STATES = ["PENDING", "SENT_UNCONFIRMED", "RECEIPT_VERIFIED", "UNKNOWN_OUTCOME", "REJECTED", "CANCELLED"];

/** The six rules, in the order they are implemented. */
export const OFF_RULES = [
  { id: "OFF-01", asks: "Does agent capability, model, entity, hire agreement and serial scope match?",
    fails: ["SCOPE_MISMATCH", "AUTHORITY_MISSING"] },
  { id: "OFF-02", asks: "Does the current dependency graph and actual demand clear the proposed withdrawal?",
    fails: ["LIVE_DEPENDENCY", "EVIDENCE_MISSING"] },
  { id: "OFF-03", asks: "Is replacement coverage or an approved release verified?",
    fails: ["SAFETY_HOLD", "REPLACEMENT_NOT_ACCEPTED"] },
  { id: "OFF-04", asks: "Are the off-hire clause, dates, authorised recipient and charge-stop rule pinned?",
    fails: ["CLOCK_UNVERIFIED", "CONTRACT_TERM_UNKNOWN"] },
  { id: "OFF-05", asks: "Is the exact reserved authority and the commercial consequence accepted?",
    fails: ["READY_FOR_DECISION"] },
  { id: "OFF-06", asks: "On revalidation before dispatch, does everything still hold, and was receipt verified after?",
    fails: ["REVALIDATION_REQUIRED", "RECEIPT_UNCONFIRMED"] },
];

const day = 24 * 60 * 60 * 1000;
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const yes = (v) => v === true || /^(y|yes|true|verified|confirmed)$/i.test(String(v ?? ""));

/**
 * The contract notice deadline, computed and reported WHATEVER the verdict.
 *
 * `noticeDays` is the agreement's notice period. `nextChargeDate` is the date
 * the next hire period begins. To avoid it, a verified notice has to land
 * `noticeDays` before that — so the deadline is the last day a notice can be
 * dispatched and still bite.
 */
export function noticeDeadline({ noticeDays = null, nextChargeDate = null, today = null } = {}) {
  const n = num(noticeDays);
  const charge = instant(nextChargeDate);
  if (n === null || charge === null) {
    return { ok: false, deadline: null, daysLeft: null,
             say: `the notice deadline cannot be computed without ${n === null ? "a notice period" : "the next charge date"}` };
  }
  const deadlineMs = charge - n * day;
  const deadline = new Date(deadlineMs).toISOString().slice(0, 10);
  const now = today ? instant(today) : null;
  const daysLeft = now === null ? null : Math.floor((deadlineMs - now) / day);
  return {
    ok: true,
    deadline,
    daysLeft,
    passed: daysLeft !== null && daysLeft < 0,
    say: daysLeft === null
      ? `notice must be dispatched by ${deadline} to avoid the next charge period`
      : daysLeft < 0
        ? `THE NOTICE DEADLINE OF ${deadline} HAS PASSED — ${-daysLeft} day(s) ago, so the next charge period is already committed`
        : `notice must be dispatched by ${deadline}, which is ${daysLeft} day(s) away`,
  };
}

/**
 * When the charge actually stops, and only when the contract's own evidence
 * for it exists.
 *
 * This is the function that refuses to be helpful. Given a dispatched notice
 * and nothing else it returns no stop date, because a dispatched notice is
 * not a received one and a received one is not an elapsed notice period.
 */
export function billingStop({ stopRule = null, facts = {}, noticeDays = null, dispatchState = "PENDING" } = {}) {
  const rule = String(stopRule ?? "").toUpperCase();
  if (!STOP_RULES.includes(rule)) {
    return { ok: false, stopDate: null, accruing: true, reason: "CONTRACT_TERM_UNKNOWN",
             say: `the hire agreement's charge-stop rule is "${String(stopRule ?? "(blank)")}", which is not one of ${STOP_RULES.join(", ")} — `
                + "so no stop date can be asserted and the charge is still running" };
  }

  if (rule === "NOTICE") {
    // A dispatched notice is not a received one. The specification is
    // explicit: a sent email or booking date alone does not stop billing.
    if (dispatchState !== "RECEIPT_VERIFIED" && !facts.contractEffectiveStop) {
      return {
        ok: false, stopDate: null, accruing: true,
        reason: dispatchState === "UNKNOWN_OUTCOME" ? "RECEIPT_UNCONFIRMED" : "RECEIPT_UNCONFIRMED",
        say: `the notice is ${dispatchState} and the charge stops on a verified notice — a sent message is not a received one, `
           + "so the accrual continues and the position is disputed rather than closed",
      };
    }
    const from = instant(facts.supplierConfirmed || facts.noticeDispatched);
    const n = num(noticeDays);
    if (from === null || n === null) {
      return { ok: false, stopDate: null, accruing: true, reason: "CLOCK_UNVERIFIED",
               say: "the notice is verified but either its date or the notice period is not, so the stop date is not a date" };
    }
    const stop = new Date(from + n * day).toISOString().slice(0, 10);
    return { ok: true, stopDate: stop, accruing: false, reason: null,
             say: `charges stop on ${stop}, ${n} day(s) after the verified notice` };
  }

  // RETURN, COLLECTION and CONDITION each need their own physical fact, and
  // the one that stops the charge is the one the agreement names — not
  // whichever happened first.
  const needed = rule === "RETURN" ? "returned" : rule === "COLLECTION" ? "collected" : "contractEffectiveStop";
  const at = instant(facts[needed]);
  if (at === null) {
    return { ok: false, stopDate: null, accruing: true, reason: "EVIDENCE_MISSING",
             say: `the agreement stops charges on ${rule.toLowerCase()}, and there is no dated ${needed} fact — the charge is still running` };
  }
  return { ok: true, stopDate: String(facts[needed]).slice(0, 10), accruing: false, reason: null,
           say: `charges stop on ${String(facts[needed]).slice(0, 10)}, the date of the recorded ${needed} fact` };
}

/**
 * The six rules, in order, stopping at the first failure.
 *
 * The notice deadline and the billing position are computed regardless, and
 * returned alongside the verdict, because a held withdrawal does not hold the
 * commercial clock.
 */
export function checkOffHire({
  capability = null, model = null, entity = null, hireAgreement = null, serial = null, asset = null,
  dependencies = [], demandThroughWithdrawal = null,
  replacement = null, safetyRelease = null,
  stopRule = null, noticeDays = null, noticeRecipient = null, noticeChannel = null,
  authorityAccepted = null, commercialConsequenceAccepted = null,
  revalidated = null, dispatchState = "PENDING",
  facts = {}, nextChargeDate = null, today = null,
} = {}) {
  const checked = [];
  const notReached = [];
  let failure = null;

  const fail = (rule, code, why) => { failure = { rule, code, why }; };

  // OFF-01 — authority and scope, first, because everything after it is
  // wasted work if the actor may not do this to this asset.
  {
    const missing = [];
    if (!capability) missing.push("agent capability");
    if (!model) missing.push("appointment model");
    if (!entity) missing.push("legal entity");
    if (!hireAgreement) missing.push("hire agreement");
    if (missing.length) fail("OFF-01", "AUTHORITY_MISSING", `no ${missing.join(", no ")}`);
    else if (serial && asset && String(serial) !== String(asset)) {
      fail("OFF-01", "SCOPE_MISMATCH", `the hire agreement covers ${serial} and the request names ${asset}`);
    } else checked.push("OFF-01");
  }

  // OFF-02 — the dependency graph. This is the Cabin 17 rule.
  if (!failure) {
    const live = (Array.isArray(dependencies) ? dependencies : [])
      .filter(Boolean)
      .filter((d) => d.live !== false && !yes(d.released));
    if (demandThroughWithdrawal === null) {
      fail("OFF-02", "EVIDENCE_MISSING", "no demand evidence through the proposed withdrawal, so nothing says the service is finished with");
    } else if (live.length) {
      fail("OFF-02", "LIVE_DEPENDENCY",
           `${live.length} live dependency: ${live.map((d) => `${d.id || "(unidentified)"}${d.system ? ` serves ${d.system}` : ""}`).join("; ")}`);
    } else checked.push("OFF-02");
  }

  // OFF-03 — replacement or an approved release. Safety decisions belong at
  // their own gates; this asks only whether one exists.
  if (!failure) {
    if (safetyRelease === false) fail("OFF-03", "SAFETY_HOLD", "a safety hold is recorded against this withdrawal");
    else if (!yes(replacement) && !yes(safetyRelease)) {
      fail("OFF-03", "REPLACEMENT_NOT_ACCEPTED", "no verified replacement coverage and no approved release");
    } else checked.push("OFF-03");
  }

  // OFF-04 — the contract clause, the dates, the recipient and the channel.
  if (!failure) {
    const missing = [];
    if (!STOP_RULES.includes(String(stopRule ?? "").toUpperCase())) missing.push("the charge-stop rule");
    if (num(noticeDays) === null) missing.push("the notice period");
    if (!noticeRecipient) missing.push("an authorised recipient");
    if (!noticeChannel) missing.push("an authorised channel");
    if (missing.length) {
      fail("OFF-04", missing.includes("the notice period") ? "CLOCK_UNVERIFIED" : "CONTRACT_TERM_UNKNOWN",
           `not pinned: ${missing.join(", ")}`);
    } else checked.push("OFF-04");
  }

  // OFF-05 — reserved authority. Passing this rule is not an approval; it is
  // the state of being ready for one.
  if (!failure) {
    if (!yes(authorityAccepted) || !yes(commercialConsequenceAccepted)) {
      fail("OFF-05", "READY_FOR_DECISION",
           !yes(authorityAccepted) ? "the reserved authority has not been given" : "the commercial consequence has not been accepted");
    } else checked.push("OFF-05");
  }

  // OFF-06 — revalidation immediately before dispatch, and receipt after.
  if (!failure) {
    if (revalidated !== true) fail("OFF-06", "REVALIDATION_REQUIRED", "the graph, authority, evidence and payload were not rechecked immediately before dispatch");
    else if (dispatchState === "SENT_UNCONFIRMED" || dispatchState === "UNKNOWN_OUTCOME") {
      fail("OFF-06", "RECEIPT_UNCONFIRMED", `dispatch is ${dispatchState} — the effect may have occurred, so it is neither retried blindly nor treated as done`);
    } else checked.push("OFF-06");
  }

  for (const r of OFF_RULES) {
    if (!checked.includes(r.id) && (!failure || failure.rule !== r.id)) notReached.push(r.id);
  }

  // COMPUTED WHATEVER THE VERDICT. A held withdrawal does not hold the clock.
  const deadline = noticeDeadline({ noticeDays, nextChargeDate, today });
  const billing = billingStop({ stopRule, facts, noticeDays, dispatchState });

  return {
    ok: !failure,
    passed: checked,
    failure,
    notReached,
    deadline,
    billing,
    // Two answers, kept apart on purpose.
    withdrawal: failure ? "HELD" : "PERMITTED",
    commercial: billing.accruing ? "ACCRUING" : "STOPPED",
    say: failure
      ? `${failure.rule} ${failure.code}: ${failure.why}. The withdrawal is held; ${deadline.ok ? deadline.say : billing.say}`
      : `all six rules pass; ${billing.say}`,
  };
}

/** The notes an approver reads. */
export function offHireNotes(result) {
  const out = [];
  if (!result) return out;

  if (result.failure) {
    out.push(`OFF-HIRE HELD AT ${result.failure.rule} — ${result.failure.code}: ${result.failure.why}. `
      + `Rules ${result.notReached.join(", ") || "none"} were not reached, and are not passed.`);
  }
  // The point of the whole module: the clock does not stop because the work did.
  if (result.deadline?.ok && result.failure) {
    out.push(`AND THE COMMERCIAL CLOCK IS STILL RUNNING — ${result.deadline.say}. `
      + "The withdrawal being held does not hold the notice deadline. An asset decided three weeks ago to be returned, "
      + "held on a dependency and forgotten commercially, costs another full charge period.");
  }
  if (result.deadline?.passed) {
    out.push(`THE NOTICE DEADLINE HAS PASSED — ${result.deadline.say}. The next charge period is committed whatever happens now.`);
  }
  if (result.billing && result.billing.accruing) {
    out.push(`HIRE IS STILL ACCRUING — ${result.billing.say}${result.billing.reason ? ` (${result.billing.reason})` : ""}.`);
  }
  return out;
}

/** One sentence for the run log. */
export function offHireStatement(result) {
  if (!result) return "the off-hire rules were not run";
  return `withdrawal ${result.withdrawal}, charge ${result.commercial} — ${result.say}`;
}
