/**
 * TI-MW · The measurement worker. What happened, how it was measured, and
 * whether that supports a decision.
 *
 * §4: "First-party outcomes, spend, attribution and control groups in;
 * results, rollback signal and playbook recommendations out. CAN PAUSE
 * AUTHORISED ACTIONS. CANNOT AMEND POLICY."
 *
 * THE WORD THAT KEEPS THIS HONEST IS "OBSERVATIONAL". §10 and §18 are
 * unusually firm and they are right to be: distinguish observed correlation
 * from estimated incremental lift, and where assignment is unavailable, label
 * the result observational. This business has no holdout on its own site and
 * no randomised assignment, so every result here is observational — and a
 * report that does not say so will be read as though the change caused the
 * number.
 *
 * AND IT REFUSES TO RECOMMEND SCALING EARLY. "Do not repeatedly peek and
 * promote on noise." A read before the window closes returns immature and
 * recommends nothing. That is enforced rather than advised, because the one
 * thing certain about a demand experiment on a small site is that somebody
 * will look at it on day two.
 *
 * ENQUIRIES, NOT CLICKS. The conversion this business cares about is an
 * enquiry, and it is a row that already exists. Page views are the
 * denominator and they are not the outcome: counting a reader as a result is
 * how a report becomes a reassurance.
 */

import { collection } from "../store.js";
import { evaluate, freezeHypothesis, suppressSmallCohorts, MIN_COHORT } from "../trendintel/measurement.js";
import { PLATFORM_INSTALLATION, PLATFORM_PROFILE } from "../trendintel/platform.js";
import { summary as reachSummary } from "../reach.js";

const DAY = 86400000;

/**
 * Measure the window against the comparable window before it.
 *
 * Both halves come from records the platform already holds: readership from
 * `lib/reach.js`, which excludes bots, and enquiries from the lead rows. No
 * analytics tag, no third-party credential and nothing estimated — which is
 * the keyless requirement being met by something that was already here.
 */
export function measure({ windowDays = 28, at = null, installationId = PLATFORM_INSTALLATION,
                          reach = null, leads = null } = {}) {
  const now = at ? Date.parse(String(at)) : Date.now();
  if (!Number.isFinite(now)) return { ok: false, reason: "The measurement date could not be read." };

  const current = reach ?? safeReach({ days: windowDays });
  const prior = reach ? null : safeReach({ days: windowDays * 2 });

  const visitsNow = sumViews(current);
  const visitsBoth = prior ? sumViews(prior) : null;
  const visitsPrior = visitsBoth === null ? null : Math.max(0, visitsBoth - visitsNow);

  const rows = leads ?? collection("leads");
  const inWindow = (from, to) => rows.filter((l) => {
    const t = Date.parse(String(l.createdAt || l.at || ""));
    return Number.isFinite(t) && t >= from && t < to;
  }).length;
  const enquiriesNow = inWindow(now - windowDays * DAY, now);
  const enquiriesPrior = inWindow(now - 2 * windowDays * DAY, now - windowDays * DAY);

  // The hypothesis this is measured against, frozen on the same terms every
  // time rather than chosen after the numbers are in.
  const frozen = freezeHypothesis({
    hypothesis: `Reading demand and steering what the agents lead with raises ${PLATFORM_PROFILE.outcome.conversion} per ${PLATFORM_PROFILE.outcome.denominator}`,
    baseline: `the ${windowDays} days immediately before this window`,
    primaryOutcome: PLATFORM_PROFILE.outcome.conversion,
    segment: "all eligible sessions on the site",
    // No assignment exists on this site, so this is named for what it is.
    controlMethod: "window_comparison",
    observationTarget: MIN_COHORT,
    windowStart: new Date(now - windowDays * DAY).toISOString(),
    windowEnd: new Date(now).toISOString(),
    guardrails: ["conversion_rate"],
    owner: "the director",
  });
  if (!frozen.ok) return { ok: false, reason: frozen.say };

  const result = evaluate({
    frozen: frozen.frozen,
    treatment: { numerator: enquiriesNow, denominator: visitsNow },
    control: visitsPrior === null ? null : { numerator: enquiriesPrior, denominator: visitsPrior },
    now: new Date(now).toISOString(),
    guardrailBreaches: [],
    siteWideConfound: false,
  });

  const cohorts = suppressSmallCohorts([
    { arm: "this window", numerator: enquiriesNow, denominator: visitsNow },
    ...(visitsPrior === null ? [] : [{ arm: "the window before", numerator: enquiriesPrior, denominator: visitsPrior }]),
  ]);

  // The pause signal. It can pause and it cannot amend policy, so this is a
  // recommendation to stop and never a change to what is permitted.
  const pause = result.decision === "ROLL_BACK"
    ? "PAUSE: a guardrail is breached, so any authorised action in this scope should stop now and the approved change should be rolled back."
    : null;

  return {
    ok: true,
    method: result.method,
    label: result.label ?? null,
    decision: result.decision,
    visitsThisWindow: visitsNow,
    visitsPriorWindow: visitsPrior,
    enquiriesThisWindow: enquiriesNow,
    enquiriesPriorWindow: enquiriesPrior,
    rates: cohorts.rows.map((r) => `${r.arm}: ${r.suppressed ? `suppressed — ${r.say}` : `${r.numerator} of ${r.denominator} (${(r.rate * 100).toFixed(2)}%)`}`),
    pause: pause ? [pause] : [],
    playbook: playbook(result, { enquiriesNow, visitsNow }),
    // The method is stated whatever the decision, because an inconclusive
    // result is just as capable of being read as causal as a positive one.
    say: `${result.say} Measured by window comparison, which is not an assignment, so ANY result here is observational: a number that moved after a change is not evidence the change moved it, and this site has no holdout to say otherwise. Readership and enquiries both come from records the platform already holds; nothing is instrumented and nothing is estimated.`,
    boundaryNote: "This can recommend a pause and cannot amend policy, cannot approve, and cannot change a threshold. A playbook change is proposed for review and versioned before it is used.",
  };
}

function safeReach(opts) {
  try { return reachSummary(opts); } catch { return null; }
}

function sumViews(summary) {
  const pages = Array.isArray(summary?.pages) ? summary.pages : [];
  return pages.reduce((n, p) => n + (Number(p.views) || 0), 0);
}

/**
 * §10.4 — save the finding, including the negative one, and PROPOSE a change
 * rather than making it. "Do not autonomously retrain the model on outputs or
 * edit policy."
 */
function playbook(result, { enquiriesNow, visitsNow }) {
  const out = [];
  if (result.decision === "IMMATURE") {
    out.push("Nothing is proposed: the window has not closed or the observation target is not reached, and promoting on a partial read is how a null result becomes a playbook.");
    return out;
  }
  if (result.decision === "INCONCLUSIVE") {
    out.push(`Nothing is proposed. ${visitsNow} eligible visit(s) against a minimum cohort of ${MIN_COHORT} and ${enquiriesNow} enquir${enquiriesNow === 1 ? "y" : "ies"} is not enough to tell a change from noise, and recording that is more useful than a number with a direction.`);
    return out;
  }
  if (result.decision === "CONTINUE") {
    out.push("Proposed for review: keep the current steering for another window and re-read. The result is observational, so it supports continuing and does not support scaling.");
  }
  if (result.decision === "REVISE") {
    out.push("Proposed for review: the window closed without a positive result, so revise what is being led with rather than extending it. A negative finding is recorded with the same weight as a positive one.");
  }
  out.push("Any threshold or playbook change is versioned and re-run against the historical window before it is used.");
  return out;
}
