/**
 * An unverified alarm cannot certify a supplier failure.
 *
 * A wastewater high-level alarm fires. Two things must happen and they are
 * different things: somebody attends, and the question of whether the
 * supplier failed is decided. The first is urgent and the second is
 * contractual, and a platform that collapses them issues a credit note off a
 * sensor reading.
 *
 * SO FOUR CLOCKS, NOT ONE. Acknowledgement, attendance, restoration and
 * verified closure are tracked separately, because a supplier who answers the
 * phone in four minutes and arrives in nine hours has met one target and
 * missed another, and one number cannot say so.
 *
 * A STALE SENSOR IS A DATA-QUALITY INCIDENT, NOT A SERVICE ONE. The reading
 * is old; the tank may be fine or may be overflowing. What is certain is that
 * nobody knows, so the response is an alternate observation request rather
 * than a callout — and the SLA state is UNKNOWN rather than breached or met.
 * Marking it met is a lie and marking it breached pays a credit on a sensor
 * fault.
 *
 * AND A DUAL EVIDENCE CONFLICT STAYS DISPUTED. Where a sensor says one thing
 * and an inspection says another, the continuity workflow runs on the worse
 * of the two and the commercial question stays open. Resolving it
 * automatically in either direction is the platform deciding a contractual
 * matter on a coin toss.
 */

import { instant } from "../l7/evidence.js";

/** The four clocks, tracked separately. */
export const SLA_CLOCKS = ["acknowledged", "attended", "restored", "closureVerified"];

/** Incident priorities. Target times are customer configuration, never ours. */
export const PRIORITIES = ["P1", "P2", "P3"];

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

/**
 * Classify an observation into an SLA position.
 *
 * `freshnessHours` is how old a reading may be and still be relied on. A
 * reading older than that is stale whatever it says.
 */
export function classifyObservation({
  source = null, reading = null, observedAt = null, now = null,
  freshnessHours = null, corroboration = null, credible = null,
} = {}) {
  const at = instant(observedAt);
  const ref = instant(now);
  const fresh = num(freshnessHours);

  if (at === null) {
    return { ok: false, state: "UNKNOWN", kind: "DATA_QUALITY", certifies: false,
             say: "the observation carries no readable timestamp, so its age cannot be judged and it certifies nothing" };
  }
  if (ref !== null && fresh !== null) {
    const ageHours = Math.round(((ref - at) / 3600000) * 10) / 10;
    if (ageHours > fresh) {
      return {
        ok: false, state: "UNKNOWN", kind: "DATA_QUALITY", certifies: false, ageHours, stale: true,
        action: "ALTERNATE_OBSERVATION",
        say: `the ${source || "reading"} is ${ageHours} hour(s) old against a ${fresh}-hour freshness limit. `
           + "It is a data-quality incident and an alternate observation request — the tank may be fine or may be overflowing, "
           + "and what is certain is that nobody knows. The SLA state is UNKNOWN: marking it met is a lie and marking it breached pays a credit on a sensor fault",
      };
    }
  }

  // A conflict between two sources is not resolved here.
  if (corroboration && String(corroboration.reading ?? "") !== String(reading ?? "")) {
    return {
      ok: false, state: "DISPUTED", kind: "EVIDENCE_CONFLICT", certifies: false,
      action: "CONTINUITY_ON_WORSE_CASE",
      say: `the ${source || "reading"} says "${reading}" and ${corroboration.source || "a second source"} says "${corroboration.reading}". `
         + "The continuity workflow runs on the worse of the two and the commercial question stays disputed — "
         + "resolving it automatically in either direction decides a contractual matter on a coin toss",
    };
  }

  if (credible === false) {
    return { ok: false, state: "UNKNOWN", kind: "UNCREDIBLE", certifies: false, action: "VERIFY",
             say: "the observation is recorded as not credible, so it raises a verification action and certifies nothing" };
  }

  return {
    ok: true, state: "VERIFIED", kind: "SERVICE", certifies: true,
    say: `${source || "the reading"} is fresh and uncontradicted`,
  };
}

/**
 * The four clocks against their targets. Targets are supplied, not assumed.
 */
export function slaPosition({ raisedAt = null, facts = {}, targetsHours = {} } = {}) {
  const from = instant(raisedAt);
  if (from === null) return { ok: false, clocks: {}, say: "the incident has no readable raised time, so no clock can run" };
  const clocks = {};
  const breached = [];
  for (const k of SLA_CLOCKS) {
    const at = instant(facts[k]);
    const target = num(targetsHours[k]);
    if (at === null) { clocks[k] = { met: null, hours: null, target, say: `${k} not recorded` }; continue; }
    const hours = Math.round(((at - from) / 3600000) * 10) / 10;
    const met = target === null ? null : hours <= target;
    clocks[k] = { met, hours, target, say: target === null ? `${k} at ${hours}h, no target supplied` : `${k} at ${hours}h against ${target}h` };
    if (met === false) breached.push(k);
  }
  return {
    ok: breached.length === 0,
    clocks, breached,
    say: breached.length
      ? `${breached.join(", ")} missed; the other clocks are reported separately because one number cannot say that a supplier answered in four minutes and arrived in nine hours`
      : "every recorded clock within its target, where one was supplied",
  };
}

/**
 * A bounded emergency callout. Issued once, and only on a credible
 * observation the contract covers.
 */
export function emergencyCallout({ observation = null, contractAllows = null, alreadyIssued = false, bound = null } = {}) {
  if (alreadyIssued) {
    return { ok: false, issued: false, reason: "ALREADY_ISSUED",
             say: "a callout is already out for this incident; a second one is a second invoice for one attendance" };
  }
  if (!observation || observation.certifies !== true) {
    return { ok: false, issued: false, reason: "NOT_CREDIBLE",
             say: `no callout on an observation that certifies nothing — ${observation ? observation.say : "there is no observation"}` };
  }
  if (contractAllows !== true) {
    return { ok: false, issued: false, reason: "NOT_CONTRACTED",
             say: "the contract does not provide for an emergency callout on this service, so one is routed for authority rather than issued" };
  }
  if (!bound || !bound.cap || !bound.scope) {
    return { ok: false, issued: false, reason: "UNBOUNDED",
             say: "a callout with no cap and no scope is not bounded, and an unbounded emergency instruction is an open cheque" };
  }
  return {
    ok: true, issued: true, bound,
    say: `bounded callout issued once, capped at ${bound.cap} for ${bound.scope}; the restoration workflow and the authority record continue separately`,
  };
}

/** The notes an approver reads. */
export function slaNotes(observation, position) {
  const out = [];
  if (observation && observation.stale) {
    out.push(`DATA QUALITY, NOT SERVICE FAILURE — ${observation.say}.`);
  }
  if (observation && observation.state === "DISPUTED") {
    out.push(`EVIDENCE CONFLICT, STILL DISPUTED — ${observation.say}.`);
  }
  if (position && position.breached?.length) {
    out.push(`SLA CLOCKS — ${position.say}. An unverified alarm cannot certify a supplier failure, and a credit follows the contract and an approval, not a sensor.`);
  }
  return out;
}
