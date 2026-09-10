/**
 * Bid or no-bid — and the one rule that makes it worth having.
 *
 * Every contractor has a bid/no-bid matrix. Almost all of them are weighted
 * scores, and a weighted score has a structural flaw that costs companies
 * their existence: IT AVERAGES. A tender with a ninety per cent chance of
 * winning, a superb strategic fit and an uncapped liability scores well,
 * because two nines outvote a one.
 *
 * The specification says it plainly and this module enforces it:
 *
 *     "A high probability of winning shall not override unacceptable
 *      liability, insufficient capacity, negative cash exposure or a
 *      prohibited client condition."
 *
 * So five of the eight factors are HARD-STOP CAPABLE. When one of them is
 * raised, the weighted score is still computed — it is useful to know how
 * close the rest of it was — but the decision is NO BID and the score cannot
 * reach it. A hard stop is not a heavy weighting. It is a different kind of
 * thing, and building it as a weighting is how it gets outvoted.
 *
 * THE ECONOMIC VIEW IS SEPARATE AND BOTH ARE SHOWN. A score answers "should
 * we like this?"; the economics answer "what does pursuing it cost, what does
 * winning it pay, and what does it do to cash?". A bid can score well and
 * still be a poor use of the only estimator, and the expected value is what
 * says so.
 *
 * EVERY FACTOR CARRIES ITS EVIDENCE AND ITS UNCERTAINTY. A score typed into a
 * cell with nothing behind it is an opinion with a number stuck to it. A
 * factor with no evidence is reported as unevidenced, and the decision says
 * how much of itself rests on unevidenced opinion.
 */

import { num } from "./num.js";

/** The eight factors, their default weights, and which can stop a bid dead. */
export const FACTORS = [
  { id: "strategic_fit", name: "Strategic fit", weight: 10, hardStopCapable: false,
    measures: "Sector, geography, client, capability, reference value" },
  { id: "client_quality", name: "Client quality", weight: 15, hardStopCapable: true,
    measures: "Payment history, behaviour, procurement credibility",
    stopExample: "A client that does not pay, or a prohibited condition of contract" },
  { id: "win_probability", name: "Win probability", weight: 20, hardStopCapable: false,
    measures: "Competition, incumbent, relationship, differentiation" },
  { id: "commercial_quality", name: "Commercial quality", weight: 20, hardStopCapable: true,
    measures: "Margin range, cash conversion, securities, inflation",
    stopExample: "Negative cash exposure that the business cannot fund" },
  { id: "delivery_capacity", name: "Delivery capacity", weight: 15, hardStopCapable: true,
    measures: "People, plant, design, supplier and programme capacity",
    stopExample: "The work cannot be resourced without failing an existing contract" },
  { id: "contract_exposure", name: "Contract exposure", weight: 10, hardStopCapable: true,
    measures: "Liability, damages, indemnity, termination and insurance",
    stopExample: "Uncapped liability, or damages beyond the insurance" },
  { id: "bid_investment", name: "Bid investment", weight: 5, hardStopCapable: false,
    measures: "Cost, duration, opportunity cost and partner dependency" },
  { id: "information_quality", name: "Information quality", weight: 5, hardStopCapable: true,
    measures: "Scope maturity, surveys, quantities and access",
    stopExample: "A lump sum asked for on information nobody could price" },
];

const BY_ID = new Map(FACTORS.map((f) => [f.id, f]));

/** Decisions the engine can reach. */
export const DECISIONS = ["BID", "BID_WITH_CONDITIONS", "REVIEW", "NO_BID"];

/** Score bands, so a number becomes a sentence. */
export const BANDS = [
  { at: 75, band: "strong", say: "a strong fit on the weighted view" },
  { at: 60, band: "acceptable", say: "acceptable on the weighted view" },
  { at: 45, band: "marginal", say: "marginal — worth a conversation, not a commitment" },
  { at: 0, band: "poor", say: "poor on the weighted view" },
];

function bandFor(score) {
  for (const b of BANDS) if (score >= b.at) return b;
  return BANDS[BANDS.length - 1];
}

/** One factor as assessed. Anything unreadable becomes null, not zero. */
export function factor(raw = {}) {
  const def = BY_ID.get(String(raw.id || ""));
  const score = Number.isFinite(raw.score) ? Math.min(100, Math.max(0, raw.score)) : null;
  return {
    id: def ? def.id : null,
    name: def ? def.name : String(raw.id || "(unknown factor)"),
    weight: Number.isFinite(raw.weight) ? raw.weight : def ? def.weight : null,
    hardStopCapable: def ? def.hardStopCapable : false,
    score,
    confidence: Number.isFinite(raw.confidence) ? Math.min(1, Math.max(0, raw.confidence)) : null,
    evidence: Array.isArray(raw.evidence) ? raw.evidence.map(String) : [],
    hardStop: raw.hardStop === true,
    hardStopReason: raw.hardStopReason ? String(raw.hardStopReason) : null,
    note: raw.note ? String(raw.note) : null,
  };
}

/**
 * The economic view. Kept apart from the score deliberately: a good score on
 * a job that loses money is still a job that loses money.
 */
export function economics({ value = null, marginPercent = null, bidCost = null, winProbability = null, peakCashExposure = null, fundingLimit = null, durationWeeks = null } = {}) {
  const v = num(value), m = num(marginPercent), c = num(bidCost), p = num(winProbability);
  const margin = v !== null && m !== null ? v * (m / 100) : null;
  const expected = margin !== null && p !== null && c !== null ? margin * p - c : null;
  const cash = num(peakCashExposure), limit = num(fundingLimit);
  const unfundable = cash !== null && limit !== null && cash > limit;
  return {
    value: v,
    marginPercent: m,
    margin,
    bidCost: c,
    winProbability: p,
    // The number people mean when they say "is it worth bidding".
    expectedValue: expected,
    // Bid cost as a share of the margin it is chasing. Above about a fifth is
    // a pursuit that has to be won to have been worth entering.
    bidCostRatio: margin !== null && c !== null && margin !== 0 ? c / margin : null,
    peakCashExposure: cash,
    fundingLimit: limit,
    unfundable,
    durationWeeks: num(durationWeeks),
    say:
      expected === null
        ? "the economics cannot be computed from what has been entered"
        : expected < 0
          ? `the expected value is negative: ${round(expected)} — on these odds the pursuit costs more than it returns`
          : `expected value ${round(expected)} against a bid cost of ${c}`,
  };
}

function round(n) { return Math.round(n * 100) / 100; }

/**
 * The decision. Hard stops are checked first and cannot be outvoted; the
 * weighted score is still computed and reported, because "we stopped on
 * liability and everything else was excellent" is a different conversation
 * from "we stopped on liability and it was marginal anyway".
 */
export function score({ factors = [], economics: econ = null, thresholds = {} } = {}) {
  const assessed = factors.map(factor);
  const unknown = assessed.filter((f) => f.id === null).map((f) => f.name);
  const known = assessed.filter((f) => f.id !== null);
  const missing = FACTORS.filter((d) => !known.some((f) => f.id === d.id)).map((d) => d.id);
  const unscored = known.filter((f) => f.score === null).map((f) => f.id);
  const unevidenced = known.filter((f) => f.evidence.length === 0).map((f) => f.id);

  // The hard stops, first and separately.
  const stops = known.filter((f) => f.hardStop && f.hardStopCapable);
  const invalidStops = known.filter((f) => f.hardStop && !f.hardStopCapable);

  // The weighted score, over the factors that were actually scored. Scoring
  // an unscored factor as zero would be an invention; leaving it out and
  // saying how much of the weight is missing is not.
  const scored = known.filter((f) => f.score !== null && Number.isFinite(f.weight));
  const weightPresent = scored.reduce((s, f) => s + f.weight, 0);
  const weightTotal = FACTORS.reduce((s, f) => s + f.weight, 0);
  const weighted = weightPresent > 0
    ? scored.reduce((s, f) => s + f.score * f.weight, 0) / weightPresent
    : null;

  const band = weighted === null ? null : bandFor(weighted);
  const minScore = Number.isFinite(thresholds.minScore) ? thresholds.minScore : 60;
  const conditionScore = Number.isFinite(thresholds.conditionScore) ? thresholds.conditionScore : 45;

  let decision, why;
  if (stops.length) {
    decision = "NO_BID";
    why = `${stops.length} hard stop(s): ${stops.map((f) => `${f.name} — ${f.hardStopReason || "no reason recorded"}`).join("; ")}`;
  } else if (weighted === null) {
    decision = "REVIEW";
    why = "nothing has been scored; there is no decision to take yet";
  } else if (weightPresent < weightTotal * 0.75) {
    decision = "REVIEW";
    why = `only ${weightPresent} of ${weightTotal} weight has been assessed; the score is not yet a decision`;
  } else if (econ && econ.unfundable) {
    decision = "NO_BID";
    why = `peak cash exposure of ${econ.peakCashExposure} exceeds the funding limit of ${econ.fundingLimit}`;
  } else if (econ && econ.expectedValue !== null && econ.expectedValue < 0) {
    decision = "REVIEW";
    why = `the weighted score is ${round(weighted)} but the expected value is negative`;
  } else if (weighted >= minScore) {
    decision = "BID";
    why = `${round(weighted)} — ${band.say}`;
  } else if (weighted >= conditionScore) {
    decision = "BID_WITH_CONDITIONS";
    why = `${round(weighted)} — ${band.say}; proceed only against named conditions`;
  } else {
    decision = "NO_BID";
    why = `${round(weighted)} — ${band.say}`;
  }

  return {
    decision,
    decided: true,
    why,
    weighted: weighted === null ? null : round(weighted),
    band: band ? band.band : null,
    hardStops: stops.map((f) => ({ id: f.id, name: f.name, reason: f.hardStopReason })),
    // Somebody raising a hard stop on a factor that cannot carry one is a
    // real signal — usually that the concern belongs on a different factor.
    invalidStops: invalidStops.map((f) => ({ id: f.id, name: f.name, say: `${f.name} is not hard-stop capable; the concern belongs on a factor that is` }),),
    weightPresent,
    weightTotal,
    missing,
    unscored,
    unknown,
    unevidenced,
    // How much of the decision rests on nothing. This is the number that stops
    // a matrix becoming a ritual.
    evidenceCoverage: known.length === 0 ? null : (known.length - unevidenced.length) / known.length,
    economics: econ,
    factors: assessed,
  };
}

/**
 * Sensitivity: which single factor, moved by one band, changes the decision.
 * A decision that survives every single-factor move is robust; one that flips
 * on a five-point change to a factor nobody evidenced is not a decision.
 */
export function sensitivity(input, step = 15) {
  const base = score(input);
  const out = [];
  for (const f of input.factors || []) {
    const def = BY_ID.get(String(f.id || ""));
    if (!def || !Number.isFinite(f.score)) continue;
    for (const delta of [step, -step]) {
      const moved = (input.factors || []).map((x) =>
        x.id === f.id ? { ...x, score: Math.min(100, Math.max(0, x.score + delta)) } : x,
      );
      const alt = score({ ...input, factors: moved });
      if (alt.decision !== base.decision) {
        out.push({ factor: def.id, name: def.name, delta, from: base.decision, to: alt.decision, evidenced: (f.evidence || []).length > 0 });
      }
    }
  }
  return {
    base: base.decision,
    flips: out,
    robust: out.length === 0,
    // The dangerous case: the decision turns on a factor nobody evidenced.
    fragile: out.filter((o) => !o.evidenced),
    say: out.length === 0
      ? `the decision holds against a ${step}-point move on every factor`
      : `${out.length} single-factor move(s) change the decision`,
  };
}

/** The facts the G0 gate reads. */
export function gateFacts(result) {
  return { bidScore: { decided: result.decided === true, hardStops: result.hardStops.length } };
}
