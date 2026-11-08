/**
 * THE AGENT OS SPECIFICATION'S OWN ACCEPTANCE TESTS, RUN AS TESTS.
 *
 *   node backend/test/agentos.test.mjs
 *
 * The specification states expected values rather than describing behaviour —
 * 130 concurrent, 5.2 m³/day, 46.15 hours, £114,000, CPI 0.8727 — which makes
 * AT-07, AT-08, AT-17 and AT-18 executable exactly as written. Where a test
 * here is labelled with an AT number, the number in the assertion is the
 * number in the specification and not one this code produced.
 *
 * The negative paths are the point. A spec fixture proves the arithmetic on
 * the happy case; what decides whether an engine is usable is what it does
 * with a missing reserve policy, a zero denominator, a cohort with no count
 * and a contract that says nothing about retention.
 */
import { peakConcurrency, storedAutonomy, capacityNotes } from "../lib/agentos/capacity.js";
import { pricingEnvelope, earnedValue, commercialNotes } from "../lib/agentos/commercial.js";
import { SERVICE_CODES, SERVICE_CATEGORIES, serviceCode, categoryOf, fromLegacyFamily, taxonomyIntegrity, LEGACY_FAMILIES } from "../../shared/servicecodes.js";

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 300)}` : ""}`); }
};

console.log("\n=== the twenty-one service codes ===\n");
{
  const t = taxonomyIntegrity();
  ok(t.codes === 21 && t.categories === 6, `21 codes in 6 categories (${t.codes}/${t.categories})`, t);
  ok(t.ok, "every code belongs to exactly one category, and every category claims only real codes", t);
}
ok(serviceCode("9").name === "Potable and process water", "a code is read unpadded as well as padded", serviceCode("9"));
ok(serviceCode("09").code === "09" && serviceCode("9").code === "09", "and normalises to the padded form, so 9 and 09 are one service");
ok(serviceCode("99") === null && serviceCode("") === null, "and an unknown code is null rather than a guess");
{
  const c = categoryOf("10");
  ok(c.id === "utilities" && c.interfaces.includes("discharge and isolation"),
     "a code carries its category's critical interfaces — an interface with no service on each end is a note, not an interface", c);
}
{
  // Existing package IDs must survive migration, and an ambiguous mapping
  // must stay ambiguous: picking one of five codes produces a register that
  // reads correctly and allocates the wrong supplier.
  const clean = fromLegacyFamily("F5");
  ok(clean.ok && !clean.ambiguous && clean.codes[0] === "20", "a legacy family covering one code maps cleanly", clean);
  const amb = fromLegacyFamily("F2");
  ok(amb.ok && amb.ambiguous && amb.codes.length === 5, // AT-25
     "AND ONE COVERING FIVE STAYS AMBIGUOUS — it is not resolved by guess", amb);
  ok(/cannot be assigned a code without a person/.test(amb.say), "saying a person has to read the package", amb.say);
  ok(!fromLegacyFamily("F9").ok, "an unknown family maps to nothing rather than to something plausible");
  ok(LEGACY_FAMILIES.length === 7, "the seven legacy families are kept as reporting tags", LEGACY_FAMILIES.length);
}

console.log("\n=== AT-07 · 72 + 50 + 8 distinct concurrent at Skye ===\n");
{
  const r = peakConcurrency({
    cohorts: [{ id: "shift A", count: 72 }, { id: "shift B overlap", count: 50 }, { id: "visitors", count: 8 }],
    nominal: 100,
    zone: "the defined service zone",
  });
  ok(r.peak === 130, "AT-07 · PEAK IS 130 — the specification's figure", r.peak);
  ok(r.nominal === 100, "and the brief's nominal 100 is preserved, not overwritten", r.nominal);
  ok(r.discrepancy && r.discrepancy.delta === 30,
     "WITH THE DISCREPANCY REPORTED — both figures belong to the client and one of them is wrong", r.discrepancy);
  ok(/Both figures belong to the client/.test(capacityNotes(r, null).join(" ")),
     "and the note says so rather than sizing against either", capacityNotes(r, null));
  ok(!r.exact && /assuming/.test(r.say),
     "and the answer is marked as resting on an assumption, because headcounts without identities cannot be unioned", r.say);
}
{
  // The same three cohorts with identities, where shift B shares 20 people
  // with shift A. Adding counts gives 130 against a true 110, and the welfare
  // is oversized by a fifth.
  const A = Array.from({ length: 72 }, (_, i) => `p${i}`);
  const B = Array.from({ length: 50 }, (_, i) => `p${i + 52}`);   // 20 shared with A
  const V = Array.from({ length: 8 }, (_, i) => `v${i}`);
  const r = peakConcurrency({ cohorts: [
    { id: "shift A", members: A }, { id: "shift B overlap", members: B }, { id: "visitors", members: V },
  ], nominal: 100 });
  ok(r.peak === 110, "WITH IDENTITIES THE UNION IS 110, NOT 130 — the double count is removed rather than assumed away", r);
  ok(r.exact && r.overlapRemoved === 20, "and the twenty duplicate memberships are reported", r.overlapRemoved);
}
{
  const r = peakConcurrency({ cohorts: [{ id: "shift A", count: "seventy" }, { id: "visitors", count: 8 }] });
  ok(r.peak === 8 && r.unreadable.length === 1,
     "an unreadable count is reported and excluded, never read as zero inside a total", r);
}
ok(peakConcurrency({}).ok === false, "and no cohorts gives no concurrency rather than nought");

console.log("\n=== AT-08 · 130 people × 40 L/day, 10 m³ usable with 2 m³ reserve ===\n");
{
  const r = storedAutonomy({ people: 130, litresPerPersonDay: 40, usable: 10, reserve: 2 });
  ok(r.demandPerDay === 5.2, "AT-08 · DEMAND IS 5.2 m³/day — the specification's figure", r.demandPerDay);
  ok(r.grossHours === 46.15, "GROSS AUTONOMY IS 46.15 HOURS", r.grossHours);
  ok(r.operationalHours === 36.92, "AND 36.92 HOURS BEFORE THE 2 m³ RESERVE", r.operationalHours);
}
{
  const r = storedAutonomy({ people: 130, litresPerPersonDay: 40, usable: 10 });
  ok(r.grossHours === 46.15 && r.operationalHours === null,
     "WITH NO RESERVE POLICY NO OPERATIONAL FIGURE IS GIVEN — inventing one would be inventing a safety margin", r);
  ok(/run to empty/.test(capacityNotes(null, r).join(" ")),
     "and the note says 46.15 hours is the whole store run to empty", capacityNotes(null, r));
}
{
  const r = storedAutonomy({ people: 130, litresPerPersonDay: 40, usable: 1.5, reserve: 2 });
  ok(r.negativeReserve === true && /no operational autonomy/.test(r.say),
     "A RESERVE LARGER THAN THE STORE IS REPORTED, not clamped to zero hours", r.say);
  ok(/below its own reserve/.test(capacityNotes(null, r).join(" ")), "with the consequence named", capacityNotes(null, r));
}
ok(storedAutonomy({ people: 130, usable: 10 }).missing.includes("litres per person per day"),
   "a missing input is named rather than defaulted");
ok(storedAutonomy({ people: 0, litresPerPersonDay: 40, usable: 10 }).ok === false,
   "and a zero population gives no demand to divide into, which is not infinite autonomy");

console.log("\n=== AT-17 · £100k direct, 20% markup, 5% contingency, 5% retention ===\n");
{
  const r = pricingEnvelope({ directCost: 100000, markupPct: 20, contingencyPct: 5, retentionPct: 5, retentionApplies: true });
  ok(r.budgetEnvelope === 125000, "AT-17 · BUDGET ENVELOPE £125,000", r.budgetEnvelope);
  ok(r.contractBaseline === 120000, "CONTRACT BASELINE £120,000", r.contractBaseline);
  ok(r.contingency === 5000, "with the £5,000 allowance separately controlled", r.contingency);
  ok(r.retention === 6000 && r.payableBeforeVat === 114000, "AND £114,000 BEFORE VAT AFTER 5% RETENTION", r);
  ok(r.markupOnCostPct === 20 && r.marginOnRevenuePct === 16.67,
     "20% MARKUP ON COST IS 16.67% MARGIN ON REVENUE — both returned, each labelled", r);
  ok(/must never be reported as one/.test(r.rateStatement),
     "and the result says in terms that the markup is not a margin", r.rateStatement);
  ok(/outside the 120000 contract baseline/.test(r.contingencyStatement),
     "and that the allowance is outside the baseline until released", r.contingencyStatement);
}
{
  const r = pricingEnvelope({ directCost: 100000 });
  ok(r.retentionApplied === false && r.retention === null && r.payableBeforeVat === 120000,
     "NO RETENTION IS DEDUCTED WHERE THE CONTRACT DOES NOT PROVIDE FOR ONE — a default would withhold money nobody agreed to withhold", r);
  ok(/would withhold money nobody agreed/.test(commercialNotes(r, null).join(" ")), "and the note says why", commercialNotes(r, null));
}
{
  // Money in pence, because 5% of £120,000 in floating point is not £6,000.
  const r = pricingEnvelope({ directCost: "1,234,567.89", markupPct: 20, contingencyPct: 5, retentionPct: 5, retentionApplies: true });
  ok(Number.isInteger(Math.round(r.retention * 100)) && r.payableBeforeVat === Math.round((r.contractBaseline - r.retention) * 100) / 100,
     "an awkward figure with separators still reconciles exactly", r);
}
ok(pricingEnvelope({ directCost: "about a hundred grand" }).ok === false,
   "and an unreadable money figure prices nothing rather than something");

console.log("\n=== AT-18 · PV £60k, EV £48k, AC £55k ===\n");
{
  const r = earnedValue({ pv: 60000, ev: 48000, ac: 55000, label: "Compound A" });
  ok(r.cpi === 0.8727, "AT-18 · CPI 0.8727 — the specification's figure", r.cpi);
  ok(r.spi === 0.8, "SPI 0.8", r.spi);
  ok(r.costVariance === -7000 && r.scheduleVariance === -12000, "with both variances in money", r);
  ok(/not a client-certified valuation and not a payable invoice/.test(r.note),
     "AND EV IS CARRIED AS SEPARATE FROM A VALUATION AND AN INVOICE — the three differ routinely", r.note);
}
{
  const r = earnedValue({ pv: 60000, ev: 0, ac: 0 });
  ok(r.cpi === null && /not the same as performing to budget/.test(r.undefinedBecause.join(" ")),
     "ZERO ACTUAL COST MAKES CPI UNDEFINED, NOT 1.0 — which would read as performing exactly to budget", r);
}
{
  const r = earnedValue({ pv: 0, ev: 1000, ac: 1000 });
  ok(r.spi === null && /no baseline to be ahead or behind/.test(r.undefinedBecause.join(" ")),
     "and a zero planned value makes SPI undefined rather than infinite", r);
}
ok(earnedValue({ ev: 48000 }).missing.join(",") === "PV,AC", "a missing input is named", earnedValue({ ev: 48000 }).missing);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
