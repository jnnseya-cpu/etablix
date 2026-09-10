/**
 * The deterministic engines — compliance, bid decision, estimating,
 * assurance and the submission manifest.
 *
 *   node backend/test/l7-engines.test.mjs
 *
 * Every one of these replaces a judgement somebody currently types into a
 * cell. What is tested is not that they compute — it is that they refuse in
 * the specific cases where a spreadsheet, a review meeting and a language
 * model would all agree that everything is fine.
 *
 * The four that matter most:
 *
 *   · A requirement answered perfectly against a superseded revision.
 *   · A hard stop outvoted by two high scores.
 *   · Overhead and profit added at two layers, each calculation correct.
 *   · A gate that passes because there was nothing in it to check.
 */
import {
  STATUSES, CONTRADICTION_CLASSES, requirement, contradiction, complete,
  matrix, blockedBy, words, WAIVER_AUTHORITY,
} from "../lib/l7/compliance.js";
import {
  FACTORS, DECISIONS, factor, economics, score, sensitivity,
  gateFacts as bidGateFacts,
} from "../lib/l7/bidscore.js";
import {
  RATE_COMPONENTS, VALUE_CONTROLS, dimensionOf, applyMarkups,
  detectDoubleMarkup, checkRiskRelease, checkOverride, checkValueControls,
  assure, checkBuildUp, normaliseQuote,
} from "../lib/l7/estimating.js";
import {
  LENSES, SEVERITIES, finding, checkIndependence, checkDisposition, review,
} from "../lib/l7/assurance.js";
import {
  MANIFEST_FIELDS, document, hardGates, build, recordReceipt,
} from "../lib/l7/manifest.js";
import { num, count } from "../lib/l7/num.js";

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== the deterministic engines ===\n");

/* ------------------------------------------------------------------ */
console.log("--- the strict numeric reader, which exists because of a real defect\n");

ok(num(null) === null, "null is not zero");
ok(num("") === null, "an empty string is not zero");
ok(num([]) === null, "an empty array is not zero");
ok(num(false) === null, "false is not zero");
ok(num(undefined) === null, "undefined is not zero");
ok(num("0x10") === null, "a hex literal is not a price");
ok(num(NaN) === null && num(Infinity) === null, "NaN and Infinity are refused");
ok(num(0) === 0 && num("0") === 0, "but a real zero is a real zero");
ok(num("-1234.50") === -1234.5 && num(42) === 42, "and ordinary numbers read");
ok(count(3) === 3 && count(-1) === null && count(1.5) === null, "a count is a whole number, not negative");
ok(Number(null) === 0, "THE TRAP ITSELF: JavaScript says an absent price is nought, which is why the reader above exists");

/* ------------------------------------------------------------------ */
console.log("\n--- compliance: complete is a function of eight conjuncts\n");

const world = {
  currentVersions: { "ITT-01": "D" },
  responses: { S1: { status: "APPROVED", text: "a response", files: ["S1.pdf"], pages: 2 } },
  evidence: [],
  contradictions: [],
  exportManifest: ["S1"],
  deadline: "2026-10-15",
  bidId: "B1",
};
const goodReq = {
  requirementId: "R1", mandatory: true, sourceRef: "ITT-01", sourceVersion: "D",
  responseSectionId: "S1",
};

ok(complete(goodReq, world).complete, "a requirement with all eight conjuncts true is complete");
ok(complete(goodReq, world).checks.length === 8, "eight conjuncts, always evaluated", complete(goodReq, world).checks.length);

{
  // The one that costs bids. The answer is excellent; the source has moved.
  const r = complete({ ...goodReq, sourceVersion: "B" }, world);
  ok(!r.complete, "AN EXCELLENT ANSWER TO A SUPERSEDED REVISION IS NOT COMPLETE");
  ok(/ITT-01 is now D/.test(r.say), "and it says which revision, so there is one place to go", r.say);
  ok(r.checks.filter((c) => !c.ok).length === 1, "the other seven still pass — the failure is addressable, not a verdict on the whole thing");
}
{
  const r = complete({ ...goodReq, staleSince: "2026-09-01" }, world);
  ok(!r.complete, "marked stale and not revalidated is not complete");
  ok(complete({ ...goodReq, staleSince: "2026-09-01", revalidated: true }, world).complete, "revalidated, it is");
}
ok(!complete({ ...goodReq, sourceVersion: null }, world).complete, "a requirement that does not say which version it read is not complete");
ok(!complete({ ...goodReq, sourceRef: "UNKNOWN" }, world).complete, "nor one whose source has no recorded current version");
ok(!complete({ ...goodReq, responseSectionId: null }, world).complete, "nor one with no response section");
ok(!complete(goodReq, { ...world, responses: { S1: { status: "DRAFT" } } }).complete, "nor one whose response is a draft");
ok(!complete(goodReq, { ...world, exportManifest: [] }).complete, "nor one whose answer is not in the export");

{
  const cert = { id: "EV-1", kind: "CERTIFICATE", claim: "ISO 9001", source: { uri: "u", hash: "h", expiresAt: "2026-10-01" }, status: "APPROVED", verifiedBy: "x", scope: { global: true } };
  const r = complete({ ...goodReq, evidenceRefs: ["EV-1"], requiredEvidenceTypes: ["CERTIFICATE"] }, { ...world, evidence: [cert] });
  ok(!r.complete && /EXPIRED at the deadline/.test(r.say), "evidence that lapses before the deadline blocks the requirement", r.say);
  const inDate = complete({ ...goodReq, evidenceRefs: ["EV-1"], requiredEvidenceTypes: ["CERTIFICATE"] }, { ...world, evidence: [cert], deadline: "2026-09-20" });
  ok(inDate.complete, "and in date it does not");
}
{
  const r = complete({ ...goodReq, requiredEvidenceTypes: ["INSURANCE"] }, world);
  ok(!r.complete && /no valid INSURANCE/.test(r.say), "a required evidence type with nothing attached", r.say);
}
{
  const r = complete({ ...goodReq, format: { maxWords: 3 } }, { ...world, responses: { S1: { status: "APPROVED", text: "one two three four five" } } });
  ok(!r.complete && /5 words against a limit of 3/.test(r.say), "a word limit is counted, not trusted", r.say);
}
{
  const r = complete({ ...goodReq, format: { fileTypes: ["pdf"] } }, { ...world, responses: { S1: { status: "APPROVED", text: "x", files: ["S1.docx"] } } });
  ok(!r.complete && /not one of pdf/.test(r.say), "a file in the wrong format", r.say);
}
{
  const r = complete({ ...goodReq, dependencies: ["R2"] }, { ...world, requirements: [{ requirementId: "R2", status: "DRAFTED" }] });
  ok(!r.complete && /R2 is DRAFTED/.test(r.say), "an unresolved dependency", r.say);
  const done = complete({ ...goodReq, dependencies: ["R2"] }, { ...world, requirements: [{ requirementId: "R2", status: "APPROVED" }] });
  ok(done.complete, "and a resolved one is fine");
}
ok(!complete({ ...goodReq, dependencies: ["GHOST"] }, world).complete, "a dependency that does not exist is a fault, not an absence");
{
  const c = [{ id: "X1", class: "response", requirementIds: ["R1"], status: "OPEN" }];
  const r = complete(goodReq, { ...world, contradictions: c });
  ok(!r.complete && /material contradiction/.test(r.say), "an open material contradiction blocks it", r.say);
  const closed = complete(goodReq, { ...world, contradictions: [{ ...c[0], status: "CLOSED" }] });
  ok(closed.complete, "a closed one does not");
}
{
  const r = complete({ ...goodReq, waiver: { by: "J", role: "BID_DIRECTOR", reason: "client confirmed" } }, world);
  ok(!r.complete && /only be waived by the executive sponsor/.test(r.say),
     "A MANDATORY REQUIREMENT CANNOT BE WAIVED BY A BID DIRECTOR — the person under deadline pressure is not the person who may waive", r.say);
  const proper = complete({ ...goodReq, waiver: { by: "J", role: "EXECUTIVE_SPONSOR", reason: "client confirmed" } }, world);
  ok(proper.complete, "the executive sponsor may");
  const noReason = complete({ ...goodReq, waiver: { by: "J", role: "EXECUTIVE_SPONSOR" } }, world);
  ok(!noReason.complete, "and not without a reason recorded");
}
ok(WAIVER_AUTHORITY.length === 3, "three roles may waive anything at all");
ok(words("one two  three") === 3 && words("") === 0, "words counts as a tender counts");
ok(STATUSES.length === 8, "eight requirement statuses");

{
  const m = matrix([
    { ...goodReq, requirementId: "R1" },
    { ...goodReq, requirementId: "R2", sourceVersion: "B" },
    { ...goodReq, requirementId: "R3", mandatory: false },
  ], world);
  ok(m.mandatory === 2 && m.mandatoryComplete === 1, "the matrix counts mandatory separately", `${m.mandatoryComplete}/${m.mandatory}`);
  ok(m.mandatoryRecall === 0.5, "and reports recall as a rate");
  ok(m.mandatoryMissing.length === 1 && m.mandatoryMissing[0].requirementId === "R2",
     "AND AS A LIST — because 99% of six hundred is five omissions, and a rate hides them", m.mandatoryMissing);
  ok(!m.ok, "and the matrix is not ok while one is missing");
  ok(m.failureCounts[0].id === "current_source_version", "the commonest failure is named first", m.failureCounts);
}
ok(matrix([], world).ok === false, "an empty matrix is not a complete one");

ok(CONTRADICTION_CLASSES.length === 7, "seven contradiction classes");
{
  const b = blockedBy([
    { id: "X1", class: "commercial", requirementIds: [], status: "OPEN" },
    { id: "X2", class: "unit", requirementIds: [], status: "OPEN" },
  ]);
  ok(b.blocksPrice && b.blocksCalculation, "each class blocks what the specification says it blocks");
  ok(!b.blocksApproval, "and does not block what it does not");
}
{
  const b = blockedBy([{ id: "X3", class: "invented", requirementIds: [], status: "OPEN" }]);
  ok(b.blocksApproval && b.blocksPrice,
     "AN UNCLASSIFIED CONTRADICTION BLOCKS EVERYTHING IT MIGHT — the alternative is deciding it is harmless without knowing what it is");
}
ok(contradiction({ id: "x", class: "unit" }).blocks === "calculation", "a class carries its own consequence");

/* ------------------------------------------------------------------ */
console.log("\n--- the bid decision: a hard stop is not a heavy weighting\n");

const strong = FACTORS.map((f) => ({ id: f.id, score: 90, evidence: ["e"] }));
ok(score({ factors: strong }).decision === "BID", "a strong tender is a bid");
{
  const stopped = strong.map((f) => f.id === "contract_exposure" ? { ...f, hardStop: true, hardStopReason: "uncapped liability" } : f);
  const r = score({ factors: stopped });
  ok(r.decision === "NO_BID", "ONE HARD STOP ENDS IT");
  ok(r.weighted === 90, "and the weighted score is still ninety — which is the point: two nines cannot outvote a one", r.weighted);
  ok(/uncapped liability/.test(r.why), "the reason travels with the decision", r.why);
}
{
  const bad = strong.map((f) => f.id === "win_probability" ? { ...f, hardStop: true, hardStopReason: "we probably will not win" } : f);
  const r = score({ factors: bad });
  ok(r.decision === "BID", "a hard stop on a factor that cannot carry one does not stop the bid");
  ok(r.invalidStops.length === 1 && /not hard-stop capable/.test(r.invalidStops[0].say),
     "but it is reported — usually the concern belongs on a different factor", r.invalidStops);
}
ok(FACTORS.filter((f) => f.hardStopCapable).length === 5, "five of the eight factors are hard-stop capable");
{
  const partial = strong.slice(0, 3);
  const r = score({ factors: partial });
  ok(r.decision === "REVIEW", "a score built on a quarter of the weight is not a decision", r.why);
  ok(r.weightPresent < r.weightTotal, "and it says how much is missing", `${r.weightPresent}/${r.weightTotal}`);
}
{
  const unscored = FACTORS.map((f) => ({ id: f.id, evidence: ["e"] }));
  ok(score({ factors: unscored }).decision === "REVIEW", "nothing scored is nothing decided");
  ok(score({ factors: unscored }).unscored.length === 8, "and every unscored factor is named");
}
{
  const r = score({ factors: FACTORS.map((f) => ({ id: f.id, score: 90 })) });
  ok(r.evidenceCoverage === 0, "A DECISION RESTING ENTIRELY ON UNEVIDENCED OPINION SAYS SO", r.evidenceCoverage);
}
ok(score({ factors: strong, economics: economics({ peakCashExposure: 900000, fundingLimit: 500000 }) }).decision === "NO_BID",
   "cash exposure beyond the funding limit stops it whatever the score says");
ok(score({ factors: strong, economics: economics({ value: 1000000, marginPercent: 2, bidCost: 80000, winProbability: 0.2 }) }).decision === "REVIEW",
   "a negative expected value sends an otherwise strong bid to review");
{
  const weak = FACTORS.map((f) => ({ id: f.id, score: 30, evidence: ["e"] }));
  ok(score({ factors: weak }).decision === "NO_BID", "a poor score is a no-bid on its own");
  const middling = FACTORS.map((f) => ({ id: f.id, score: 50, evidence: ["e"] }));
  ok(score({ factors: middling }).decision === "BID_WITH_CONDITIONS", "and a marginal one proceeds only on conditions");
}
{
  const e = economics({ value: 4000000, marginPercent: 6, bidCost: 40000, winProbability: 0.3 });
  ok(e.margin === 240000 && e.expectedValue === 32000, "the economics compute", `${e.margin} ${e.expectedValue}`);
  ok(Math.abs(e.bidCostRatio - 1 / 6) < 1e-9, "and the bid cost as a share of the margin it chases", e.bidCostRatio);
}
ok(economics({}).expectedValue === null, "and refuse to compute from nothing rather than returning zero");
{
  const borderline = FACTORS.map((f) => ({ id: f.id, score: f.id === "win_probability" ? 55 : 62 }));
  const s = sensitivity({ factors: borderline });
  ok(s.flips.length > 0, "sensitivity finds the factors that flip the decision", s.say);
  ok(s.fragile.length > 0, "AND WHICH OF THOSE NOBODY EVIDENCED — the dangerous case", s.fragile.length);
}
ok(sensitivity({ factors: strong }).robust, "a strong decision holds against a fifteen-point move on anything");
ok(DECISIONS.length === 4, "four possible decisions");
ok(bidGateFacts(score({ factors: strong })).bidScore.hardStops === 0, "the G0 gate reads its facts from here");

/* ------------------------------------------------------------------ */
console.log("\n--- estimating: arithmetic is a service, not an opinion\n");

ok(RATE_COMPONENTS.length === 7, "seven rate components");
ok(VALUE_CONTROLS.length === 4, "and four controls on every value");
ok(checkValueControls({ currency: "GBP", unit: "m2", priceBaseDate: "2026-09-01", taxTreatment: "exclusive" }).ok, "a controlled value passes");
ok(!checkValueControls({ currency: "GBP" }).ok, "and a bare number does not");
ok(checkBuildUp("labour", { trade: "t", grade: "g", baseRate: 1, burden: 1, overtime: 0, shift: 0, travel: 0, lodging: 0, productivity: 1 }).ok, "a complete labour build-up");
ok(!checkBuildUp("labour", { trade: "t" }).ok, "an incomplete one names what is missing");
ok(!checkBuildUp("magic", {}).ok, "and an invented component is refused");
ok(dimensionOf("m2") === "area" && dimensionOf("lm") === "length", "units carry dimensions");
ok(dimensionOf("furlong") === null, "and an unknown unit is null, not guessed");

{
  const a = applyMarkups(100000, [{ category: "ohp", percent: 8, authority: "CD" }]);
  ok(a.ok && a.total === 108000, "one mark-up applies", a.total);
  ok(a.steps[0].amount === 8000, "and the step is recorded for the lineage");
}
{
  const a = applyMarkups(100000, [
    { category: "ohp", percent: 8, on: "cost", authority: "CD" },
    { category: "risk", percent: 5, on: "cost", authority: "CD" },
  ]);
  ok(a.total === 113000, "on cost, mark-ups are additive", a.total);
  const b = applyMarkups(100000, [
    { category: "ohp", percent: 8, on: "running", authority: "CD" },
    { category: "risk", percent: 5, on: "running", authority: "CD" },
  ]);
  ok(b.total === 113400, "on the running total they compound — and the difference is real money", b.total);
}
ok(!applyMarkups(100000, [{ category: "ohp", percent: 8, authority: "CD" }, { category: "ohp", percent: 2, authority: "CD" }]).ok,
   "the same category twice in one sequence is refused");
ok(!applyMarkups(100000, [{ category: "ohp", percent: 8 }]).ok, "a mark-up nobody authorised is refused");
ok(!applyMarkups(null, []).ok, "and a base that is not a number is refused, not treated as zero");

{
  // THE DEFECT. Both calculations are correct. The bid is 16.64% over cost
  // and reads as 8%. Nothing in reviewing either number reveals it.
  const d = detectDoubleMarkup({
    items: [{ id: "i1", markups: [{ category: "ohp", percent: 8, authority: "CD" }] }],
    layers: [{ id: "pkg", base: ["i1"], markups: [{ category: "ohp", percent: 8, authority: "CD" }] }],
  });
  ok(!d.ok, "OVERHEAD AND PROFIT AT TWO LAYERS IS CAUGHT");
  ok(/already carries ohp/.test(d.findings[0].say), "and named at the layer that added it twice", d.findings[0].say);
  const nested = detectDoubleMarkup({
    items: [{ id: "i1", markups: [{ category: "ohp", percent: 8, authority: "CD" }] }],
    layers: [
      { id: "pkg", base: ["i1"], markups: [] },
      { id: "section", base: ["pkg"], markups: [{ category: "ohp", percent: 8, authority: "CD" }] },
    ],
  });
  ok(!nested.ok, "and through a layer of nesting, which is where it actually happens");
  const clean = detectDoubleMarkup({
    items: [{ id: "i1", markups: [] }],
    layers: [{ id: "pkg", base: ["i1"], markups: [{ category: "ohp", percent: 8, authority: "CD" }] }],
  });
  ok(clean.ok, "applied once, at one layer, it passes");
}
{
  // A layer structure that contains itself. The naive resolve recurses until
  // the stack goes; this returns, and still finds the real double mark-up
  // sitting inside the cycle rather than giving up on the whole estimate.
  const cyclic = detectDoubleMarkup({
    items: [{ id: "i1", markups: [{ category: "ohp", percent: 8, authority: "CD" }] }],
    layers: [
      { id: "a", base: ["b", "i1"], markups: [{ category: "ohp", percent: 8, authority: "CD" }] },
      { id: "b", base: ["a"], markups: [] },
    ],
  });
  ok(!cyclic.ok, "a cycle in the layer structure returns rather than hanging, and still reports the double mark-up", cyclic.say);
  ok(cyclic.findings.some((f) => f.where === "a" && f.category === "ohp"), "naming the layer that added it twice", cyclic.findings);
}

{
  const r = checkRiskRelease([{ id: "R1", against: "identified rock excavation", againstKind: "known_base_cost", authority: "x", reason: "y" }]);
  ok(!r.ok && /KNOWN BASE COST/.test(r.say), "RISK RELEASED AGAINST A KNOWN COST IS CONCEALMENT, and it is refused", r.say);
  ok(checkRiskRelease([{ id: "R2", against: "ground conditions", againstKind: "risk_event", authority: "CD", reason: "survey returned clear" }]).ok,
     "released against a risk event that did not happen, it is judgement");
}
ok(!checkOverride({ reason: "r", role: "CD", oldValue: 1 }).ok, "an override missing the new value is an edit, not an override");
ok(checkOverride({ reason: "r", role: "CD", oldValue: 1, newValue: 2, at: "2026-09-10" }).ok, "a complete one is permitted");
ok(!checkOverride({ reason: "r", role: "CD", oldValue: 1, newValue: 2, at: "whenever" }).ok, "and a timestamp that is not a date is refused");

{
  const q = normaliseQuote({ id: "Q1", supplier: "S", value: "12,500.00", exclusions: ["scaffold"], qualifications: ["subject to survey"] });
  ok(q.value === 12500, "a quote value reads through the money reader");
  ok(q.exclusions.length === 1 && q.qualifications.length === 1, "EXCLUSIONS AND QUALIFICATIONS SURVIVE NORMALISATION");
  ok(!q.comparable && /not directly comparable/.test(q.say),
     "and the quote is marked not comparable — three prices for three scopes is not three prices for one", q.say);
}

{
  const a = assure({
    scopeItems: [{ id: "SC1" }, { id: "SC2" }],
    estimateItems: [{ id: "E1", scopeItemId: "SC1", quantity: 100, rate: 10, total: 1000, unit: "m2", rateUnit: "m2" }],
    quotes: [], approvedExclusions: [],
    programme: { weeks: 20 }, submissionPrice: 1000, approvedPrice: 1000,
    cashProfile: [-500, 200, 400], fundingLimit: 1000, asAt: "2026-09-10",
  });
  const byId = Object.fromEntries(a.tests.map((t) => [t.id, t]));
  ok(!byId.quantity_coverage.ok, "SC2 is in the works and not in the price");
  ok(byId.arithmetic.ok, "the arithmetic ties");
  ok(byId.unit_consistency.ok, "the units agree");
  ok(byId.price_reconciliation.ok, "the price reconciles");
  ok(byId.cash_exposure.ok, "and the cash is within the limit");
  ok(a.tests.length === 9, "nine assurance tests, always all nine", a.tests.length);
}
{
  const a = assure({ estimateItems: [{ id: "E1", quantity: 100, rate: 10, total: 1200, unit: "m2", rateUnit: "m2" }] });
  const t = a.tests.find((x) => x.id === "arithmetic");
  ok(!t.ok && /100 × 10 = 1000, stored as 1200/.test(t.failures[0].why), "a stored total that is not its own calculation", t.failures[0]);
}
{
  const a = assure({ estimateItems: [{ id: "E1", quantity: 100, rate: 10, total: 1000, unit: "m2", rateUnit: "lm" }] });
  const t = a.tests.find((x) => x.id === "unit_consistency");
  ok(!t.ok && /area.*length|m2 \(area\) priced per lm \(length\)/.test(t.failures[0].why),
     "A SQUARE-METRE QUANTITY PRICED PER LINEAR METRE — a factor error that reads perfectly", t.failures[0].why);
}
{
  const a = assure({ quotes: [{ id: "Q1", validUntil: "2026-08-01" }], asAt: "2026-09-10" });
  const t = a.tests.find((x) => x.id === "rate_freshness");
  ok(!t.ok, "a quote past its validity is caught");
  const b = assure({ quotes: [{ id: "Q1", validUntil: "when convenient" }], asAt: "2026-09-10" });
  ok(!b.tests.find((x) => x.id === "rate_freshness").ok, "and one whose validity is not a date");
}
{
  const a = assure({ submissionPrice: 1000000, approvedPrice: 999000 });
  const t = a.tests.find((x) => x.id === "price_reconciliation");
  ok(!t.ok && /difference of 1000/.test(t.failures[0].why), "a submitted price that does not tie to the approved one", t.failures[0].why);
  const rounded = assure({ submissionPrice: 1000000, approvedPrice: 999000, roundingRule: { to: 1000 } });
  ok(rounded.tests.find((x) => x.id === "price_reconciliation").ok, "unless a rounding rule was recorded in advance");
}
{
  const a = assure({ cashProfile: [-900000, 100000], fundingLimit: 500000 });
  const t = a.tests.find((x) => x.id === "cash_exposure");
  ok(!t.ok && /900000 exceeds the limit/.test(t.failures[0].why), "peak funding beyond the limit", t.failures[0].why);
}
ok(!assure({}).tests.find((t) => t.id === "cash_exposure").ok, "no cash profile at all is a failure, not a pass");
ok(!assure({}).tests.find((t) => t.id === "programme_consistency").ok, "and no approved programme is a failure too");
{
  const a = assure({
    quotes: [{ id: "Q1", exclusions: ["SC9"] }],
    estimateItems: [], approvedExclusions: [],
  });
  const t = a.tests.find((x) => x.id === "quote_coverage");
  ok(!t.ok && /excludes SC9/.test(t.failures[0].why), "a supplier exclusion that nobody prices", t.failures[0].why);
}

/* ------------------------------------------------------------------ */
console.log("\n--- assurance: the thing that wrote it does not mark it\n");

ok(LENSES.length === 9, "nine review lenses");
ok(SEVERITIES.length === 4, "four severities");
ok(LENSES.filter((l) => l.highRisk).length === 6, "six of the lenses are high risk", LENSES.filter((l) => l.highRisk).length);

{
  const r = checkIndependence({ author: { runId: "r1", promptLineage: "p1" }, review: { runId: "r1", promptLineage: "p1" }, lens: "evaluator" });
  ok(!r.ok && /SAME RUN/.test(r.faults[0]), "THE SAME RUN MARKING ITSELF IS NOT ASSURANCE", r.faults[0]);
}
{
  const r = checkIndependence({ author: { runId: "r1", promptLineage: "p1" }, review: { runId: "r2", promptLineage: "p1" }, lens: "evaluator" });
  ok(!r.ok && /same prompt lineage/.test(r.faults[0]), "nor a different run on the same prompt lineage", r.faults[0]);
}
{
  const r = checkIndependence({ author: { runId: "r1", promptLineage: "p1", model: "m1" }, review: { runId: "r2", promptLineage: "p2", model: "m1" }, lens: "contract" });
  ok(!r.ok, "a high-risk lens needs a different route or a deterministic validator");
  const withValidator = checkIndependence({ author: { runId: "r1", promptLineage: "p1", model: "m1" }, review: { runId: "r2", promptLineage: "p2", deterministicValidator: true }, lens: "contract" });
  ok(withValidator.ok, "and a deterministic validator is the strongest form of it — a function has no lineage to share");
  const withRoute = checkIndependence({ author: { runId: "r1", promptLineage: "p1", model: "m1" }, review: { runId: "r2", promptLineage: "p2", model: "m2" }, lens: "contract" });
  ok(withRoute.ok, "a different model route also satisfies it");
}
ok(!checkIndependence({ author: { runId: "r1" }, review: { runId: "r2" }, lens: "evaluator" }).ok, "a review that does not state its lineage cannot be shown independent");

const allLenses = LENSES.map((l) => l.id);
const allIndependent = Object.fromEntries(allLenses.map((id) => [id, { ok: true }]));
ok(review({ findings: [], lensesRun: allLenses, independence: allIndependent }).ok, "a complete, independent, clear review passes");
{
  const r = review({ findings: [], lensesRun: ["compliance"], independence: { compliance: { ok: true } } });
  ok(!r.ok && r.unrun.length === 8, "A LENS NOBODY RAN IS NOT A LENS THAT PASSED", r.unrun);
}
{
  const r = review({ findings: [{ id: "F1", lens: "contract", severity: "CRITICAL" }], lensesRun: allLenses, independence: allIndependent });
  ok(!r.ok && /hard block/.test(r.say), "one open critical finding is a hard block", r.say);
}
{
  const r = review({ findings: [{ id: "F1", lens: "contract", severity: "HIGH" }], lensesRun: allLenses, independence: allIndependent });
  ok(!r.ok, "an open high finding blocks");
  const disposed = review({
    findings: [{ id: "F1", lens: "contract", severity: "HIGH", status: "DISPOSED", disposition: { by: "J", role: "EXECUTIVE_SPONSOR", reason: "accepted, priced in" } }],
    lensesRun: allLenses, independence: allIndependent,
  });
  ok(disposed.ok, "and an authorised disposition releases it");
}
{
  const r = review({
    findings: [{ id: "F1", lens: "contract", severity: "HIGH", status: "DISPOSED", disposition: { by: "J", role: "CONTRIBUTOR", reason: "seems fine" } }],
    lensesRun: allLenses, independence: allIndependent,
  });
  ok(!r.ok && /may not dispose/.test(r.say), "a contributor may not dispose of a high finding", r.say);
}
ok(!checkDisposition({ id: "F", severity: "CRITICAL", status: "DISPOSED", disposition: { by: "J", role: "EXECUTIVE_SPONSOR", reason: "r" } }).ok,
   "and a CRITICAL finding cannot be disposed of by anybody — it is a hard block, not a judgement");
{
  const r = review({ findings: [{ id: "F1", title: "something" }], lensesRun: allLenses, independence: allIndependent });
  ok(!r.ok && r.unclassified.length === 1, "a finding with no severity blocks until somebody classifies it");
}
{
  const r = review({ findings: [], lensesRun: allLenses, independence: { ...allIndependent, contract: { ok: false, say: "same run" } } });
  ok(!r.ok && r.notIndependent.length === 1, "a lens reviewed by its own author blocks the submission", r.notIndependent);
}
ok(finding({ id: "x", severity: "high", lens: "CONTRACT" }).severity === "HIGH", "severity and lens read case-insensitively");

/* ------------------------------------------------------------------ */
console.log("\n--- the submission manifest and the eight hard gates\n");

ok(MANIFEST_FIELDS.length === 8, "eight manifest field groups");
{
  const r = hardGates({});
  ok(!r.ok && r.count === 7, "AN EMPTY SUBMISSION FAILS SEVEN OF EIGHT GATES", `${r.count}: ${r.failing.map((f) => f.id).join(", ")}`);
  ok(!r.gates.find((g) => g.id === "price_reconciles").ok,
     "including the price gate — an absent price is not a price of zero that everything happens to match");
  ok(!r.gates.find((g) => g.id === "mandatory_requirements").ok,
     "and the requirement gate — no mandatory requirements means the matrix was never built, not that the bid is compliant");
  ok(!r.gates.find((g) => g.id === "no_critical_finding").ok,
     "and the finding gate — an empty finding list from a review nobody ran is not a clean one");
}

const goodSubmission = {
  documents: [{ filename: "TenderResponse.pdf", hash: "h1", revision: "P01", destination: "portal", bytes: 1000, pages: 10, satisfies: ["R1"] }],
  requirements: [{ requirementId: "R1", mandatory: true, satisfiedBy: "TenderResponse.pdf" }],
  findings: [], reviewComplete: true,
  approvedPrice: 4000000, exportedTotals: [{ where: "Form of Tender", value: 4000000 }],
  formatRules: { allowedFormats: ["pdf"], maxBytes: 10000 },
  signatures: [], declarations: [{ id: "D1", required: true, present: true, by: "J Nseya" }],
  latestIssue: { id: "ADD-3", acknowledgedAt: "2026-09-05", impactReviewComplete: true },
  evidence: [], claims: [], deadline: "2026-10-15",
  signatory: { by: "J Nseya", role: "SUBMISSION_SIGNATORY", limit: 5000000, riskClasses: ["E"] },
  tenderValue: 4000000, riskClass: "E",
};
ok(hardGates(goodSubmission).ok, "a complete submission passes all eight", hardGates(goodSubmission).say);
ok(!hardGates({ ...goodSubmission, tenderValue: 6000000 }).ok, "a tender above the signatory's limit does not");
ok(!hardGates({ ...goodSubmission, signatory: { ...goodSubmission.signatory, limit: undefined } }).ok,
   "NOR ONE WHOSE SIGNATORY HAS NO RECORDED LIMIT — an unrecorded limit is not an unlimited one");
ok(!hardGates({ ...goodSubmission, riskClass: "F" }).ok, "nor one at a risk class the signatory is not authorised for");
ok(!hardGates({ ...goodSubmission, latestIssue: { id: "ADD-3", acknowledgedAt: "2026-09-05", impactReviewComplete: false } }).ok,
   "nor one where the last addendum has not been impact-reviewed");
ok(!hardGates({ ...goodSubmission, latestIssue: null }).ok, "nor one where no issue is recorded at all");
ok(!hardGates({ ...goodSubmission, exportedTotals: [{ where: "Pricing Schedule", value: 4100000 }] }).ok,
   "nor one whose exported total does not tie to the approved price");
ok(!hardGates({ ...goodSubmission, documents: [{ ...goodSubmission.documents[0], filename: "Response.docx" }] }).ok,
   "nor one in a format the tender does not permit");
ok(!hardGates({ ...goodSubmission, declarations: [{ id: "D1", required: true, present: false }] }).ok,
   "nor one with a required declaration missing");
{
  const cert = { id: "EV-1", kind: "CERTIFICATE", claim: "c", source: { uri: "u", hash: "h", expiresAt: "2026-10-01" }, status: "APPROVED", verifiedBy: "x", scope: { global: true } };
  const r = hardGates({ ...goodSubmission, evidence: [cert], claims: [{ id: "C1", evidenceId: "EV-1" }] });
  ok(!r.ok && !r.gates.find((g) => g.id === "evidence_valid_at_deadline").ok,
     "and not one whose evidence expires before the deadline");
}
ok(!hardGates({ ...goodSubmission, deadline: "TBC" }).ok, "a deadline of TBC fails the evidence gate outright");
{
  const doc = { ...goodSubmission.documents[0], requiresSignature: true };
  ok(!hardGates({ ...goodSubmission, documents: [doc] }).ok, "an unsigned document that requires a signature");
  ok(hardGates({ ...goodSubmission, documents: [doc], signatures: [{ document: doc.filename, by: "J", role: "SUBMISSION_SIGNATORY" }] }).ok, "and a signed one passes");
}

{
  const b = build({
    submissionId: "SUB-1", snapshotId: "SNAP-1", bidId: "B1",
    documents: goodSubmission.documents,
    requirements: goodSubmission.requirements,
    approvals: [{ by: "J Nseya", role: "SUBMISSION_SIGNATORY", decision: "APPROVED", at: "2026-10-14T16:00" }],
    approvedPrice: 4000000, scheduleTotals: [{ where: "Form of Tender", value: 4000000 }],
    currency: "GBP", channel: "portal", operator: "J Nseya",
  });
  ok(b.ok, "a manifest that is evidence builds", b.say);
  ok(b.manifest.price.reconciles, "and its price reconciles");
  ok(b.manifest.identity.snapshotId === "SNAP-1", "carrying the immutable snapshot");
}
{
  const b = build({ submissionId: "SUB-1", snapshotId: "S", bidId: "B1", documents: [{ filename: "x.pdf", revision: "P01", destination: "portal" }], approvedPrice: 1, currency: "GBP", channel: "portal", operator: "J" });
  ok(!b.ok && /has no hash/.test(b.faults[0]),
     "A MANIFEST THAT NAMES A FILE IT CANNOT PROVE IS NOT EVIDENCE — the file on the drive today is not necessarily the file that went", b.faults[0]);
}
ok(!build({ submissionId: "S", bidId: "B", documents: [], approvedPrice: 1, currency: "GBP", channel: "p", operator: "o" }).ok,
   "and one with no snapshot has no immutable record of what was approved");
ok(!build({ submissionId: "S", snapshotId: "N", bidId: "B", requirements: [{ requirementId: "R1", mandatory: true }], approvedPrice: 1, currency: "GBP", channel: "p", operator: "o" }).ok,
   "a mandatory requirement the manifest cannot locate is a fault");
{
  const r = recordReceipt({}, { reference: "PORTAL-99", at: "2026-10-14T16:32" });
  ok(r.ok && r.manifest.receipt.reference === "PORTAL-99", "a receipt closes the loop");
  ok(!recordReceipt({}, {}).ok, "and no receipt means nothing was evidenced as submitted");
  ok(!recordReceipt({}, { reference: "X", at: "yesterday" }).ok, "with a real timestamp, not a word");
}
ok(document({ filename: "A Doc.PDF" }).format === "pdf", "a document knows its own format");

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
