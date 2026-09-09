/**
 * What a recurring appointment costs, and whether the arithmetic survives
 * the cases that break a fee.
 *
 *   node backend/test/pricing.test.mjs
 *
 * Models B and C are priced as a share of somebody else's spend, so before
 * this the desk had a paragraph of guidance and an empty field — the first
 * appointment would have been priced by mental arithmetic in a meeting.
 *
 * Two of these tests exist because writing the calculator disproved the
 * written guidance. "4–7% of managed spend" is only true above roughly £8m
 * a year; below it the team costs more than the percentage funds, and the
 * fee has to be argued as a team cost or not taken. A tool that quietly
 * produced 17% would have been worse than no tool at all.
 */
import assert from "node:assert/strict";
import {
  integratorFee, primeFee, scaleOf,
  B_MONTHLY_FLOOR, B_MINIMUM_TERM_MONTHS, C_PCT_FLOOR,
} from "../lib/pricing.js";

let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ✓ " + name); } catch (e) { console.log("  ✗ " + name + "\n      " + e.message); process.exitCode = 1; } };

console.log("\npricing — scale\n");
t("scale is driven by compounds, because that is what needs people standing on it", () => {
  assert.equal(scaleOf({ compounds: 1 }).id, "single");
  assert.equal(scaleOf({ compounds: 3 }).id, "multi");
  assert.equal(scaleOf({ compounds: 5 }).id, "programme");
});

console.log("\npricing — Model B\n");
t("a mid-sized appointment is set by the percentage, and lands inside 4–7%", () => {
  const r = integratorFee({ annualisedSpend: 9_000_000, compounds: 3, termMonths: 24 });
  assert.equal(r.working.driver, "percentage of spend");
  assert.ok(r.working.effectivePct >= 4 && r.working.effectivePct <= 7, `${r.working.effectivePct}%`);
  assert.equal(r.warnings.length, 0);
});
t("a large appointment falls to the bottom of the band — the fee is regressive", () => {
  const small = integratorFee({ annualisedSpend: 9_000_000, compounds: 3, termMonths: 24 });
  const big = integratorFee({ annualisedSpend: 20_000_000, compounds: 4, termMonths: 24 });
  assert.ok(big.working.effectivePct < small.working.effectivePct);
  assert.ok(big.monthly > small.monthly, "and still pays more in absolute terms");
});
t("a thin site gets a part-time integration manager, not a full-time one", () => {
  const r = integratorFee({ annualisedSpend: 1_500_000, compounds: 1, termMonths: 12 });
  assert.equal(r.working.teamComposition.siteIntegrationManager, 0.5);
});
t("a team-heavy scope SAYS the percentage will not fund it, rather than quietly charging 17%", () => {
  const r = integratorFee({ annualisedSpend: 5_000_000, compounds: 5, termMonths: 34 });
  assert.equal(r.working.driver, "team cost");
  assert.ok(r.warnings.some((w) => /cannot be argued as a percentage fee/.test(w)), r.warnings.join(" | "));
});
t("nothing prices below the monthly floor", () => {
  const r = integratorFee({ annualisedSpend: 200_000, compounds: 1, termMonths: 12 });
  assert.equal(r.monthly, B_MONTHLY_FLOOR);
  assert.ok(r.warnings.some((w) => /floor/.test(w)));
});
t("and the floor is ABOVE the cheapest possible team — a floor beneath the team it protects is decoration", () => {
  // £14,000 was the written guidance and could never bind: the minimum team
  // costs £15,732 loaded, so the floor was never reachable.
  const r = integratorFee({ annualisedSpend: 200_000, compounds: 1, termMonths: 12 });
  assert.ok(B_MONTHLY_FLOOR > r.working.byTeam, `floor £${B_MONTHLY_FLOOR} vs cheapest team £${r.working.byTeam}`);
});
t("a term under the minimum is called out — mobilisation does not repay itself", () => {
  const r = integratorFee({ annualisedSpend: 9_000_000, compounds: 3, termMonths: 3 });
  assert.equal(r.belowMinimumTerm, true);
  assert.ok(r.warnings.some((w) => new RegExp(`${B_MINIMUM_TERM_MONTHS}-month minimum`).test(w)));
});
t("the platform fee is charged only when CONSTRUX is in scope, and is capped", () => {
  assert.equal(integratorFee({ annualisedSpend: 9_000_000, compounds: 3 }).platform, 0);
  const r = integratorFee({ annualisedSpend: 9_000_000, compounds: 8, construx: true, users: 500 });
  assert.equal(r.platform, 4500);
});

console.log("\npricing — Model C\n");
t("a first engagement is priced above one at scale, on the same spend", () => {
  const first = primeFee({ supplierSpend: 18_000_000, termMonths: 34, compounds: 3, firstEngagement: true });
  const later = primeFee({ supplierSpend: 18_000_000, termMonths: 34, compounds: 3, firstEngagement: false });
  assert.ok(first.pct > later.pct);
  assert.ok(later.pct >= C_PCT_FLOOR, "and never below the floor");
});
t("the fee funds the team even when the percentage does not — a prime that cannot pay its own team is insolvent by design", () => {
  const r = primeFee({ supplierSpend: 18_000_000, termMonths: 34, compounds: 5 });
  assert.equal(r.working.driver, "team cost");
  assert.ok(r.monthlyFee >= r.working.byTeamMonthly);
  assert.ok(r.warnings.some((w) => /does not fund the team/.test(w)));
});
t("a small prime is refused rather than priced — the commercial apparatus does not shrink", () => {
  const r = primeFee({ supplierSpend: 2_500_000, termMonths: 12, compounds: 1 });
  assert.ok(r.warnings.some((w) => /not a prime opportunity/.test(w)), r.warnings.join(" | "));
});
t("the advance carries all five components, and month one is flagged when assumed", () => {
  const r = primeFee({ supplierSpend: 12_000_000, termMonths: 24, compounds: 3, earlyProcurementCommitments: 100_000 });
  const a = r.advanceParts;
  assert.equal(a.monthOneAssumed, true);
  assert.equal(r.advance,
    Math.round((a.monthOneSupplierSpend + a.mobilisation + a.monthOneManagementFee + a.earlyProcurementCommitments + a.earlyRiskContingency) * 100) / 100);
});
t("a stated month one is used rather than an even share", () => {
  const r = primeFee({ supplierSpend: 12_000_000, termMonths: 24, compounds: 3, monthOneSupplierSpend: 950_000 });
  assert.equal(r.advanceParts.monthOneAssumed, false);
  assert.equal(r.advanceParts.monthOneSupplierSpend, 950_000);
});
t("the working-capital answer is 'what if the client is late', not a payment-days subtraction", () => {
  // Invoicing monthly in advance makes the steady state cash positive, so the
  // steady-state figure is true and useless. One late cycle is the real risk.
  const r = primeFee({ supplierSpend: 12_000_000, termMonths: 24, compounds: 3 });
  assert.ok(r.workingCapital.exposureIfClientRunsOneCycleLate > 0);
  assert.ok(/one late cycle|one cycle/i.test(r.workingCapital.note) || /late/.test(r.workingCapital.note));
});
t("the three non-negotiables travel with every quotation", () => {
  const r = primeFee({ supplierSpend: 12_000_000, termMonths: 24, compounds: 3 });
  assert.equal(r.nonNegotiable.length, 3);
  assert.ok(r.nonNegotiable.some((n) => /advance has cleared/.test(n)));
});

console.log(`\n${pass} checks passed${process.exitCode ? " — with failures above" : ""}\n`);
