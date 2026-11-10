/**
 * Detection and scoring. Arithmetic, not judgement.
 *
 * The specification gives one worked example and then asserts its answer in a
 * conformance scenario: component inputs of 80 demand, 95 fit, 85 intent, 90
 * timing and 80 readiness must produce 86.25, and confidence inputs of 90,
 * 80, 70 and 90 must produce 83.5, and the result must be a reviewable brief
 * rather than an automatic action (TI-03). That is the whole reason this file
 * is deterministic: a number that decides whether a thing is published has to
 * be reproducible from its inputs by somebody who disagrees with it.
 *
 * FOUR THINGS HERE ARE EASY TO GET WRONG AND EXPENSIVE WHEN WRONG.
 *
 * ONE · THE BAND TEST IS NOT SYMMETRIC. Archive is "score below 60 OR
 * confidence below 55"; brief is "score at least 75 AND confidence at least
 * 75". An OR for the floor and an AND for the ceiling is deliberate: one weak
 * leg is enough to stop something, and is not enough to release it.
 *
 * TWO · ROUNDING IS FOR DISPLAY ONLY. 86.25 rounded to 86 still briefs, but a
 * 74.6 rounded to 75 would release something the inputs did not. So the band
 * is decided on the unrounded value and `displayed` is a separate field.
 *
 * THREE · A SINGLE SOURCE FAMILY CAPS CONFIDENCE AT 69, which is below the
 * brief threshold by construction. Four syndications of one story are one
 * family (TI-04), so the cap is what stops a well-covered non-event.
 *
 * FOUR · MISSING READINESS IS A VETO, NOT A LOW SCORE. Stock, claims or
 * target availability failing sets readiness to 0 AND vetoes live activation,
 * because a high-demand topic the business cannot serve is the most tempting
 * thing in the list.
 */

/** The opportunity weights, §5.4. They sum to 1 and the test asserts that. */
export const OPPORTUNITY_WEIGHTS = Object.freeze({
  demand: 0.25, fit: 0.25, intent: 0.20, timing: 0.15, readiness: 0.15,
});

/** The confidence weights, §5.5. Model certainty is deliberately absent. */
export const CONFIDENCE_WEIGHTS = Object.freeze({
  sourceQuality: 0.35, corroboration: 0.25, coverage: 0.20, freshness: 0.20,
});

/** The vetoes, §5.4. Each one is a reason a scored topic is not actionable. */
export const VETOES = Object.freeze([
  { id: "out-of-market", why: "the market is outside the installation's active profile" },
  { id: "unsupported-claim", why: "the proposition needs a claim that is not in the approved set" },
  { id: "restricted-topic", why: "the topic is on the installation's forbidden list" },
  { id: "inventory-unavailable", why: "the offer, stock or service area cannot serve the demand" },
  { id: "illegal-targeting", why: "the audience definition is not lawful in this market" },
  { id: "readiness-absent", why: "readiness could not be evidenced, so live activation is blocked" },
]);

/** Single source family cannot exceed this, §5.5. Below the brief floor. */
export const SINGLE_FAMILY_CONFIDENCE_CAP = 69;

/** The count-feed gates, §5.3. Both adjustable by source and geography. */
export const COUNT_GATE = Object.freeze({ minCount: 20, minZ: 2 });

/** Below this many comparable periods the result is draft-only, §5.3. */
export const MIN_COMPARABLE_PERIODS = 4;

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function median(values) {
  const xs = values.filter((v) => num(v) !== null).slice().sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = xs.length >> 1;
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

/** Median absolute deviation. Robust because one viral week should not move it. */
export function mad(values) {
  const m = median(values);
  if (m === null) return null;
  return median(values.filter((v) => num(v) !== null).map((v) => Math.abs(v - m)));
}

/**
 * Per-source movement, §5.3 verbatim.
 *
 *   lift = ln((c+1)/(b+1))
 *   z    = (log1p(c) − median(log1p(x))) / max(1.4826 × MAD(log1p(x)), 0.2)
 *
 * The 0.2 floor on the denominator is what stops a flat history from turning
 * a one-unit move into an infinite z, which is how an anomaly detector built
 * on a quiet feed produces its first false positive.
 */
export function movement({ count, baseline, history = [], indexed = false, gate = {} } = {}) {
  const c = num(count);
  const b = num(baseline);
  const xs = (Array.isArray(history) ? history : []).filter((v) => num(v) !== null);

  if (indexed) {
    // "Never apply raw-count thresholds to indexed trends." An index has no
    // count, so a count gate on it is a category error, not a strict setting.
    return {
      ok: false, indexed: true, lift: null, z: null,
      reason: "indexed-feed",
      say: "This is an index or rank feed. Relative values are not absolute demand, so the count gate does not apply and a source-specific gate is required before this can open a topic.",
    };
  }
  if (c === null || b === null) {
    return { ok: false, lift: null, z: null, reason: "no-count", say: "A count feed needs a comparable current count and a baseline median. A feed gap is unknown data, never zero interest." };
  }

  const lift = Math.log((c + 1) / (b + 1));
  const logs = xs.map((v) => Math.log1p(v));
  const spread = mad(logs);
  const denom = Math.max(1.4826 * (spread === null ? 0 : spread), 0.2);
  const med = median(logs);
  const z = med === null ? null : (Math.log1p(c) - med) / denom;

  const minCount = num(gate.minCount) ?? COUNT_GATE.minCount;
  const minZ = num(gate.minZ) ?? COUNT_GATE.minZ;

  if (xs.length < MIN_COMPARABLE_PERIODS) {
    return {
      ok: false, lift, z, periods: xs.length, insufficientHistory: true, reason: "insufficient-history",
      say: `${xs.length} comparable period(s) against a minimum of ${MIN_COMPARABLE_PERIODS}. Labelled insufficient history and held draft-only; it is not a negative finding.`,
    };
  }
  if (c < minCount || z === null || z < minZ) {
    return {
      ok: false, lift, z, periods: xs.length, reason: "below-gate",
      say: `Count ${c} against a gate of ${minCount}, z ${z === null ? "unavailable" : z.toFixed(2)} against ${minZ}. Below gate. A verified industry event or a comparable authoritative observation can still open a monitored topic in low-volume B2B.`,
    };
  }
  return { ok: true, lift, z, periods: xs.length, say: `z ${z.toFixed(2)} on ${c} against a baseline median of ${b}, over ${xs.length} comparable periods.` };
}

/**
 * The reference demand mapping for count feeds, §17: clamp(50 + 10z, 0, 100)
 * AFTER the volume and history gates. Before the gates there is no demand
 * score at all, which is the difference between "we did not look" and "zero".
 */
export function demandFromZ(z) {
  const v = num(z);
  if (v === null) return null;
  return clamp(50 + 10 * v, 0, 100);
}

/**
 * The demand component, §17: the median of the highest-weight valid
 * observation per INDEPENDENT SOURCE FAMILY, most recent complete window,
 * deterministic tie-break by source ID.
 *
 * Per family, not per observation — otherwise a feed that publishes the same
 * story four times outvotes one that published it once.
 */
export function demandComponent(observations = []) {
  const byFamily = new Map();
  for (const o of observations) {
    if (!o || o.valid === false) continue;
    const fam = String(o.sourceFamily ?? "");
    if (!fam) continue;
    const weight = num(o.weight) ?? 0;
    const demand = num(o.demand);
    if (demand === null) continue;
    const held = byFamily.get(fam);
    if (!held
        || weight > held.weight
        || (weight === held.weight && String(o.sourceId ?? "") < String(held.sourceId ?? ""))) {
      byFamily.set(fam, { weight, demand, sourceId: String(o.sourceId ?? "") });
    }
  }
  if (!byFamily.size) return { demand: null, families: [], say: "No valid observation carries a demand score, so there is no demand component to report." };
  const families = [...byFamily.keys()].sort();
  return {
    demand: median([...byFamily.values()].map((v) => v.demand)),
    families,
    perFamily: Object.fromEntries([...byFamily.entries()].map(([k, v]) => [k, v.demand])),
    say: `Demand is the median of one observation per independent family across ${families.length}: ${families.join(", ")}.`,
  };
}

/** Corroboration, §17: 0 for one independent family, 80 for two, 100 for 3+. */
export function corroborationScore(independentFamilies) {
  const n = Math.max(0, Math.trunc(num(independentFamilies) ?? 0));
  if (n >= 3) return 100;
  if (n === 2) return 80;
  return 0;
}

/**
 * Freshness, §17: 100 at window close, tapering linearly to 0 at the
 * configured stale-after limit. Past the limit it is 0 and the source can
 * provide dated context but cannot support a fresh automated action.
 */
export function freshnessScore({ ageHours, staleAfterHours } = {}) {
  const age = num(ageHours);
  const limit = num(staleAfterHours);
  if (age === null || limit === null || limit <= 0) return null;
  if (age <= 0) return 100;
  if (age >= limit) return 0;
  return clamp(100 * (1 - age / limit), 0, 100);
}

/**
 * The opportunity score. Weighted sum, full precision, with the vetoes
 * reported separately from the number rather than folded into it — a vetoed
 * 90 and a clean 55 are different problems and must not read the same.
 */
export function opportunityScore(components = {}) {
  const got = {};
  const missing = [];
  for (const k of Object.keys(OPPORTUNITY_WEIGHTS)) {
    const v = num(components[k]);
    if (v === null) missing.push(k);
    else got[k] = clamp(v, 0, 100);
  }
  if (missing.length) {
    return { ok: false, score: null, missing, say: `No opportunity score: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} absent. A component that was not measured is not a zero.` };
  }
  const score = Object.entries(OPPORTUNITY_WEIGHTS).reduce((sum, [k, w]) => sum + w * got[k], 0);
  return { ok: true, score, displayed: Math.round(score * 100) / 100, components: got };
}

/**
 * Confidence. Independent of the opportunity score by design — a thing can be
 * obviously valuable and badly evidenced, and the two numbers exist so that
 * case cannot hide.
 */
export function confidenceScore(components = {}, { independentFamilies = null, contextOnlyFamilies = 0 } = {}) {
  const got = {};
  const missing = [];
  for (const k of Object.keys(CONFIDENCE_WEIGHTS)) {
    const v = num(components[k]);
    if (v === null) missing.push(k);
    else got[k] = clamp(v, 0, 100);
  }
  if (missing.length) {
    return { ok: false, confidence: null, missing, say: `No confidence score: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} absent. Missing coverage keeps the result in watch or draft mode; it does not default to full.` };
  }
  let confidence = Object.entries(CONFIDENCE_WEIGHTS).reduce((sum, [k, w]) => sum + w * got[k], 0);
  const notes = [];
  const fams = num(independentFamilies);
  if (fams !== null && fams - Math.max(0, Math.trunc(num(contextOnlyFamilies) ?? 0)) <= 1 && confidence > SINGLE_FAMILY_CONFIDENCE_CAP) {
    notes.push(`Capped at ${SINGLE_FAMILY_CONFIDENCE_CAP} from ${confidence.toFixed(2)}: one independent source family. Syndications, mirrors and amendments of one story contribute one family at most.`);
    confidence = SINGLE_FAMILY_CONFIDENCE_CAP;
  }
  return { ok: true, confidence, displayed: Math.round(confidence * 100) / 100, components: got, capped: notes.length > 0, notes };
}

/**
 * The band, §5 table. Decided on unrounded values.
 *
 * ARCHIVE · score < 60 OR confidence < 55.
 * WATCH   · score 60–74 OR confidence 55–74, both above the archive cutoffs.
 * BRIEF   · score ≥ 75 AND confidence ≥ 75, no veto.
 * AUTO    · score ≥ 85 AND confidence ≥ 85, with explicit tenant opt-in, and
 *           only in approved low-risk classes.
 */
export function decide({ score, confidence, vetoes = [], automationOptIn = false, lowRiskClass = false } = {}) {
  const s = num(score);
  const c = num(confidence);
  if (s === null || c === null) {
    return { band: "ARCHIVE", reason: "not-scored", say: "Without both a score and a confidence there is nothing to decide on. Archived with the reason, reopenable on new evidence." };
  }
  const active = (Array.isArray(vetoes) ? vetoes : []).filter(Boolean).map(String);
  if (s < 60 || c < 55) {
    return { band: "ARCHIVE", reason: s < 60 ? "score-below-60" : "confidence-below-55", vetoes: active,
             say: `Archived: score ${s.toFixed(2)}, confidence ${c.toFixed(2)}. Reopen on new evidence.` };
  }
  if (active.length) {
    return { band: "WATCH", reason: "veto", vetoes: active, liveActivation: false,
             say: `Score ${s.toFixed(2)} and confidence ${c.toFixed(2)} would support a brief, but ${active.join(", ")} ${active.length === 1 ? "is" : "are"} vetoed. Watch or draft internally; no live change.` };
  }
  if (s >= 85 && c >= 85) {
    if (automationOptIn && lowRiskClass) {
      return { band: "AUTOMATIC", vetoes: [], liveActivation: true,
               say: `Score ${s.toFixed(2)} and confidence ${c.toFixed(2)} with explicit opt-in: eligible for bounded automatic action in this approved low-risk class. Channel policy and approval still apply to anything outside it.` };
    }
    return { band: "BRIEF", vetoes: [], liveActivation: false,
             reason: automationOptIn ? "not-a-low-risk-class" : "no-automation-opt-in",
             say: `Score ${s.toFixed(2)} and confidence ${c.toFixed(2)} clear the automatic band on the numbers, but ${automationOptIn ? "this action class is not on the approved low-risk list" : "the installation has not opted in to automatic action"}. Reviewable brief only.` };
  }
  if (s >= 75 && c >= 75) {
    return { band: "BRIEF", vetoes: [], liveActivation: false,
             say: `Score ${s.toFixed(2)} and confidence ${c.toFixed(2)}: create a reviewable brief. External action still requires policy and channel approval.` };
  }
  return { band: "WATCH", reason: s < 75 ? "score-below-75" : "confidence-below-75", vetoes: [], liveActivation: false,
           say: `Score ${s.toFixed(2)}, confidence ${c.toFixed(2)}: watch or draft internally. No live change.` };
}

/**
 * The whole scoring pass, which is what the conformance scenario calls.
 * Returns the two numbers and the decision, and nothing is rounded before the
 * decision is taken.
 */
export function scoreTopic({ opportunity = {}, confidence = {}, independentFamilies = null,
                             contextOnlyFamilies = 0, vetoes = [], automationOptIn = false,
                             lowRiskClass = false, readinessEvidenced = true } = {}) {
  const v = [...(Array.isArray(vetoes) ? vetoes : [])];
  const comps = { ...opportunity };
  if (readinessEvidenced === false) {
    // Readiness absent is both a zero and a veto, §5.4 and §17.
    comps.readiness = 0;
    if (!v.includes("readiness-absent")) v.push("readiness-absent");
  }
  const opp = opportunityScore(comps);
  const conf = confidenceScore(confidence, { independentFamilies, contextOnlyFamilies });
  const decision = decide({
    score: opp.ok ? opp.score : null,
    confidence: conf.ok ? conf.confidence : null,
    vetoes: v, automationOptIn, lowRiskClass,
  });
  return { opportunity: opp, confidence: conf, decision, vetoes: v };
}

export function scoreNotes(result) {
  if (!result) return [];
  const out = [];
  const { opportunity: o, confidence: c, decision: d } = result;
  if (o?.ok) out.push(`Opportunity ${o.score.toFixed(2)} from ${Object.entries(o.components).map(([k, v]) => `${k} ${v}`).join(", ")} at weights ${Object.entries(OPPORTUNITY_WEIGHTS).map(([k, w]) => `${k} ${Math.round(w * 100)}%`).join(", ")}.`);
  else if (o) out.push(o.say);
  if (c?.ok) out.push(`Confidence ${c.confidence.toFixed(2)}${c.capped ? ` (${c.notes.join(" ")})` : ""}.`);
  else if (c) out.push(c.say);
  if (d) out.push(`${d.band}: ${d.say}`);
  return out;
}
