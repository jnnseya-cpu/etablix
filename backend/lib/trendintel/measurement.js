/**
 * Measurement, and the word that keeps a result honest: OBSERVATIONAL.
 *
 * The specification is unusually firm about this and it is the right place to
 * be firm: "distinguish observed correlation from estimated incremental lift"
 * (§10.1), and where assignment is unavailable, "compare reporting windows
 * and label the result observational" (§18). A number that moved after a
 * change is not evidence the change moved it, and a report that does not say
 * so will be read as though it were.
 *
 * SO EVERY RESULT HERE CARRIES ITS METHOD, and `inconclusive` is a first-class
 * outcome rather than a failure. Inadequate data or a site-wide confound
 * returns inconclusive with the reason (§10.2). A shorter honest answer beats
 * a longer invented one, which is the same rule this platform applies to
 * every other deliverable.
 *
 * THE HYPOTHESIS IS FROZEN AT APPROVAL (§10.1). Primary outcome, baseline,
 * segment, control method, minimum detectable effect or observation target,
 * window, guardrails and a named owner — before the change goes live, because
 * every one of those is choosable after the fact in the direction of the
 * answer somebody wanted.
 *
 * "DO NOT REPEATEDLY PEEK AND PROMOTE ON NOISE" (§10.3) is enforced, not
 * advised: a read before the window matures or before the observation target
 * is reached returns `immature` and refuses to recommend scaling.
 *
 * A CTA OUTCOME IS A CTA OUTCOME (§18). Downstream orders or leads count only
 * where that data is actually received through first-party ingestion. Calling
 * a button press a sale is the commonest way an attribution report becomes
 * fiction.
 *
 * AND ERASURE SURVIVES A RESTORE (§15, TI-15). The erasure log is replayed
 * after a backup restore and external execution stays quarantined until
 * reconciliation finishes — a restore that silently resurrects deleted
 * evidence is a data-protection incident wearing the clothes of a recovery.
 */

/** Frozen at brief approval, §10.1. */
export const HYPOTHESIS_FIELDS = Object.freeze([
  "hypothesis", "baseline", "primaryOutcome", "segment", "controlMethod",
  "minimumDetectableEffect", "observationTarget", "windowStart", "windowEnd",
  "guardrails", "owner",
]);

/** §10.2 and §18. `holdout` and `matched_control` are the only causal ones. */
export const CONTROL_METHODS = Object.freeze(["holdout", "matched_control", "window_comparison", "none"]);
export const CAUSAL_METHODS = Object.freeze(["holdout", "matched_control"]);

/** §18: cohorts smaller than this are suppressed in a report. */
export const MIN_COHORT = 20;

/** §10.3 guardrails. A breach stops a scale decision whatever the headline says. */
export const GUARDRAIL_KINDS = Object.freeze([
  "cost_per_qualified_outcome", "conversion_rate", "unsubscribe_rate",
  "cancellation_rate", "refund_rate", "policy_incident", "stock_unavailable",
]);

/** §12 and TI-12: v1 has no direct-marketing execution path at all. */
export const DIRECT_MARKETING_AVAILABLE = false;

const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** §10.1 — freeze the hypothesis, or refuse and name what is missing. */
export function freezeHypothesis(input = {}) {
  const missing = HYPOTHESIS_FIELDS.filter((f) => {
    const v = input[f];
    if (f === "minimumDetectableEffect" || f === "observationTarget") return false; // one or the other
    if (Array.isArray(v)) return v.length === 0;
    return v === undefined || v === null || str(v).trim() === "";
  });
  if (num(input.minimumDetectableEffect) === null && num(input.observationTarget) === null) {
    missing.push("minimumDetectableEffect or observationTarget");
  }
  if (!CONTROL_METHODS.includes(str(input.controlMethod))) {
    missing.push(`controlMethod (one of ${CONTROL_METHODS.join(", ")})`);
  }
  if (missing.length) {
    return { ok: false, missing,
             say: `The hypothesis cannot be frozen: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} absent. Each one is choosable after the fact in the direction of the answer somebody wanted, which is why all of them are fixed before the change goes live.` };
  }
  return {
    ok: true,
    frozen: Object.freeze({
      hypothesis: str(input.hypothesis), baseline: str(input.baseline),
      primaryOutcome: str(input.primaryOutcome), segment: str(input.segment),
      controlMethod: str(input.controlMethod),
      minimumDetectableEffect: num(input.minimumDetectableEffect),
      observationTarget: num(input.observationTarget),
      windowStart: str(input.windowStart), windowEnd: str(input.windowEnd),
      guardrails: [...input.guardrails].map(str), owner: str(input.owner),
      causal: CAUSAL_METHODS.includes(str(input.controlMethod)),
    }),
    say: `Frozen: ${str(input.primaryOutcome)} against ${str(input.baseline)} by ${str(input.controlMethod)}, ${str(input.windowStart)} to ${str(input.windowEnd)}, owned by ${str(input.owner)}. ${CAUSAL_METHODS.includes(str(input.controlMethod)) ? "A control method that supports an incremental estimate." : "No assignment, so any result is observational and will be labelled as such."}`,
  };
}

/**
 * §18 — classify an outcome event. A CTA completion is a CTA completion, and
 * a downstream conversion counts only if its data actually arrives.
 */
export function classifyOutcome({ kind, firstPartyIngested = false, pseudonymousOutcomeId = null } = {}) {
  const k = str(kind);
  if (!k) return { ok: false, say: "An outcome needs a kind." };
  if (!str(pseudonymousOutcomeId)) {
    return { ok: false, reason: "no-dedup-id",
             say: "An outcome with no pseudonymous outcome id cannot be deduplicated per installation, so counting it risks counting it twice. Identifiers are minimised, not removed." };
  }
  if (["eligible_visit", "cta_completion"].includes(k)) {
    return { ok: true, counts: true, native: true, kind: k,
             say: `${k} is captured on the native surface by first-party aggregate collection, with no external analytics tag.` };
  }
  if (!firstPartyIngested) {
    return { ok: false, counts: false, kind: k, reason: "not-ingested",
             say: `${k} is a downstream conversion and this installation does not receive that data through first-party ingestion. It is shown as unavailable rather than estimated: calling a button press a sale is how an attribution report becomes fiction.` };
  }
  return { ok: true, counts: true, native: false, kind: k,
           say: `${k} counts: its data is actually received through first-party ingestion.` };
}

/** §18 — suppress a small cohort rather than publishing it. */
export function suppressSmallCohorts(rows = [], { minCohort = MIN_COHORT } = {}) {
  const out = (Array.isArray(rows) ? rows : []).map((r) => {
    const n = num(r?.denominator);
    if (n === null || n < minCohort) {
      return { ...r, numerator: null, denominator: n, rate: null, suppressed: true,
               say: `Suppressed: ${n === null ? "no denominator" : `${n} below the ${minCohort} minimum`}.` };
    }
    const k = num(r.numerator);
    return { ...r, suppressed: false, rate: k === null ? null : k / n };
  });
  const suppressed = out.filter((r) => r.suppressed).length;
  return { rows: out, suppressed,
           say: suppressed ? `${suppressed} of ${out.length} row(s) suppressed for small cohort size.` : `All ${out.length} row(s) meet the ${minCohort} minimum cohort.` };
}

/**
 * The result, and what it is allowed to claim.
 *
 * Three decisions out: continue, revise, roll back (§18) — and `inconclusive`
 * whenever the data does not support one.
 */
export function evaluate({ frozen = null, treatment = {}, control = null, now = null,
                            guardrailBreaches = [], siteWideConfound = false } = {}) {
  if (!frozen) return { ok: false, say: "Nothing was frozen at approval, so there is no hypothesis to evaluate against." };

  const breaches = (Array.isArray(guardrailBreaches) ? guardrailBreaches : []).map(str).filter(Boolean);
  const tN = num(treatment.denominator), tK = num(treatment.numerator);

  // Maturity first. A read before the window closes, or before the
  // observation target is reached, cannot recommend scaling.
  const closes = Date.parse(str(frozen.windowEnd));
  const t = Date.parse(str(now));
  const windowClosed = Number.isFinite(closes) && Number.isFinite(t) && t >= closes;
  const target = num(frozen.observationTarget);
  const targetReached = target === null || (tN !== null && tN >= target);
  const mature = windowClosed && targetReached;

  if (breaches.length) {
    return {
      ok: true, decision: "ROLL_BACK", mature, method: frozen.controlMethod, breaches,
      say: `Guardrail breach: ${breaches.join(", ")}. The decision is rollback regardless of the headline number, and a live experiment stops immediately on a policy incident or stock unavailability.`,
    };
  }
  if (tN === null || tK === null) {
    return { ok: true, decision: "INCONCLUSIVE", mature: false, method: frozen.controlMethod,
             say: "No numerator or denominator at the same grain, so nothing can be concluded. Spend, impressions and outcomes are kept at one grain for this reason." };
  }
  if (tN < MIN_COHORT) {
    return { ok: true, decision: "INCONCLUSIVE", mature: false, method: frozen.controlMethod, sample: tN,
             say: `A denominator of ${tN} is below the ${MIN_COHORT} minimum cohort. Recorded as inconclusive and suppressed in the report rather than published as a rate.` };
  }
  if (siteWideConfound) {
    return { ok: true, decision: "INCONCLUSIVE", mature, method: frozen.controlMethod, confound: true,
             say: "A site-wide change overlapped this window, so the treated and untreated series are not comparable. Recorded as inconclusive with the confound named, which is the honest answer and the only useful one." };
  }

  const tRate = tK / tN;
  const causal = CAUSAL_METHODS.includes(str(frozen.controlMethod));
  let cRate = null, lift = null;
  if (control) {
    const cN = num(control.denominator), cK = num(control.numerator);
    if (cN !== null && cK !== null && cN >= MIN_COHORT) { cRate = cK / cN; lift = cRate > 0 ? (tRate - cRate) / cRate : null; }
  }
  if (causal && cRate === null) {
    return { ok: true, decision: "INCONCLUSIVE", mature, method: frozen.controlMethod,
             say: `The control method is ${frozen.controlMethod} but no comparable control of at least ${MIN_COHORT} was available, so the incremental estimate it promised cannot be made. Inconclusive rather than quietly reported as observational under a causal heading.` };
  }

  const label = causal ? "incremental_estimate" : "observational";
  const base = {
    ok: true, mature, method: frozen.controlMethod, label,
    treatmentRate: tRate, controlRate: cRate, lift, sample: tN,
    primaryOutcome: frozen.primaryOutcome, owner: frozen.owner,
  };

  if (!mature) {
    return { ...base, decision: "IMMATURE",
             say: `${(tRate * 100).toFixed(2)}% on ${tN} ${windowClosed ? "" : `before the window closes at ${frozen.windowEnd}`}${!targetReached ? `${windowClosed ? "" : " and "}short of the ${target} observation target` : ""}. No scale decision: repeated peeking and promoting on noise is how a null result becomes a playbook.` };
  }

  const positive = lift === null ? tRate > 0 : lift > 0;
  const decision = positive ? "CONTINUE" : "REVISE";
  return {
    ...base, decision,
    say: `${(tRate * 100).toFixed(2)}% on ${tN}${cRate === null ? "" : ` against a control of ${(cRate * 100).toFixed(2)}%, a relative difference of ${(lift * 100).toFixed(1)}%`}. Labelled ${label}${label === "observational" ? " — a number that moved after a change is not evidence the change moved it" : ""}. ${decision === "CONTINUE" ? "Enough data, a credible positive result and no breached guardrail: continue." : "Mature and not positive: revise rather than scale."} Owner ${frozen.owner}.`,
  };
}

/**
 * TI-12 — an installation onboarded with no CRM consent and no
 * customer-level information. Aggregate first-party mode works and there is
 * no direct-marketing execution path to fall back to.
 */
export function aggregateOnlyMode({ hasConsentRecords = false, hasCustomerLevelData = false } = {}) {
  const aggregate = !hasConsentRecords || !hasCustomerLevelData;
  return {
    ok: true, mode: aggregate ? "aggregate_first_party" : "full",
    directMarketingAvailable: DIRECT_MARKETING_AVAILABLE,
    say: aggregate
      ? "Aggregate first-party mode: detection, scoring, briefs, drafts, native publishing and native outcome reporting all work without consent records or customer-level data. There is no direct-marketing execution path in v1 at all, so there is nothing for a missing consent record to be checked against — lifecycle and CRM remain draft and segment suggestions only."
      : "Consent records and customer-level data are present. Even so, v1 ships no direct-marketing execution path: consent and suppression are applied at send time by the host's own system, bound to the approved list definition and audience cap.",
  };
}

/* ── erasure, and what a restore must not resurrect ────────────────────── */

/** §15 — record an erasure. Append-only; the log is the thing that survives. */
export function recordErasure({ log = [], installationId, subjectRef, scope = ["evidence", "observations", "embeddings", "logs", "metering"], at = null } = {}) {
  if (!str(installationId) || !str(subjectRef)) {
    return { ok: false, say: "An erasure needs an installation and a subject reference." };
  }
  const entry = { installationId: str(installationId), subjectRef: str(subjectRef), scope: [...scope].map(str), at: str(at) || null };
  return { ok: true, log: [...log, entry], entry,
           say: `Erasure recorded for ${str(subjectRef)} in ${str(installationId)} across ${entry.scope.join(", ")}. The log is append-only and is what a restore is replayed against.` };
}

/**
 * TI-15 — replay the erasure log over restored data.
 *
 * Returns both the surviving rows AND the quarantine flag, because the second
 * is the part that gets forgotten: external execution stays stopped until
 * reconciliation finishes, so a restored queue cannot publish against
 * evidence that was deleted.
 */
export function replayErasures({ log = [], rows = [], at = null } = {}) {
  const erased = new Set((Array.isArray(log) ? log : []).map((e) => `${str(e.installationId)}|${str(e.subjectRef)}`));
  const kept = [], removed = [];
  for (const r of (Array.isArray(rows) ? rows : [])) {
    const key = `${str(r?.installationId)}|${str(r?.subjectRef)}`;
    if (erased.has(key)) removed.push(r); else kept.push(r);
  }
  return {
    ok: true, kept, removed, removedCount: removed.length,
    externalExecutionQuarantined: true, reconciledAt: str(at) || null,
    say: `${removed.length} restored row(s) matched the erasure log and were removed again; ${kept.length} remain. External execution stays quarantined until reconciliation completes — a restore that silently resurrects deleted evidence is a data-protection incident wearing the clothes of a recovery, and a restored queue must not publish against evidence that no longer exists.`,
  };
}

/** What an export may contain after erasure. The test asserts the negative. */
export function exportAfterErasure({ log = [], rows = [] } = {}) {
  const r = replayErasures({ log, rows });
  const erased = new Set((Array.isArray(log) ? log : []).map((e) => `${str(e.installationId)}|${str(e.subjectRef)}`));
  const leaked = r.kept.filter((row) => erased.has(`${str(row?.installationId)}|${str(row?.subjectRef)}`));
  return { ok: leaked.length === 0, rows: r.kept, leaked,
           say: leaked.length ? `${leaked.length} erased subject(s) are still exposed by this export.` : `The export exposes no erased subject: ${r.removedCount} row(s) were removed on replay and ${r.kept.length} remain.` };
}

export function measurementNotes(result) {
  return result ? [result.say] : [];
}
