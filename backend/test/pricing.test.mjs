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
import {
  costOf, marginOf, priceFor, breakEven, teamMonthlyCost,
  TARGET_NET_MARGIN, MINIMUM_NET_MARGIN, OVERHEAD_RECOVERY,
  ANNUAL_OVERHEAD, ANNUAL_OVERHEAD_TOTAL, EXPENSES,
} from "../lib/margin.js";
import { DELIVERABLES } from "../lib/clientflow.js";

let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ✓ " + name); } catch (e) { console.log("  ✗ " + name + "\n      " + e.message); process.exitCode = 1; } };

console.log("\npricing — scale\n");
t("scale is driven by compounds, because that is what needs people standing on it", () => {
  assert.equal(scaleOf({ compounds: 1 }).id, "single");
  assert.equal(scaleOf({ compounds: 3 }).id, "multi");
  assert.equal(scaleOf({ compounds: 5 }).id, "programme");
});

console.log("\npricing — Model B\n");
t("a mid-sized appointment lands inside 4–7% of managed spend, which is what a client can be shown", () => {
  // The earlier version of this test asserted the PERCENTAGE set the fee.
  // Once expenses, contingency, overhead and a real margin were costed, the
  // team cost sets every fee and the percentage became a cross-check. What
  // matters commercially is unchanged: the answer still lands where a
  // procurement function benchmarks it.
  const r = integratorFee({ annualisedSpend: 9_000_000, compounds: 3, termMonths: 24 });
  assert.ok(r.working.effectivePct >= 4 && r.working.effectivePct <= 7, `${r.working.effectivePct}%`);
  assert.equal(r.warnings.length, 0);
});
t("a large appointment lands lower still — the fee is regressive as a percentage", () => {
  const r = integratorFee({ annualisedSpend: 20_000_000, compounds: 4, termMonths: 24 });
  assert.ok(r.working.effectivePct < 5.5, `${r.working.effectivePct}%`);
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
t("the floor is the cheapest team priced at the minimum margin — and TEAM COST is what actually binds", () => {
  // Third time this has needed correcting, so it is written down: with a
  // proper cost stack the team always costs more than any flat floor, so the
  // floor never sets a fee. It is kept as the published commercial minimum —
  // "our minimum monthly appointment is £22,000" is a useful sentence in a
  // proposal — but nobody should re-add a hand-typed floor believing it
  // protects anything. The team cost protects the business; the floor
  // communicates it.
  const cheapest = teamMonthlyCost({ siteIntegrationManager: 0.5, projectManager: 0.4, commercial: 0.25 });
  assert.equal(B_MONTHLY_FLOOR, priceFor(cheapest.total, MINIMUM_NET_MARGIN));
  const r = integratorFee({ annualisedSpend: 200_000, compounds: 1, termMonths: 12 });
  assert.ok(r.monthly >= B_MONTHLY_FLOOR);
  assert.equal(r.working.driver, "team cost");
});
t("and the floor is ABOVE the cheapest team's full cost — a floor beneath what it protects is decoration", () => {
  // Wrong twice as a constant: £14,000 sat beneath the cheapest team's cost,
  // and £16,000 sat beneath it once expenses were counted. It is derived now.
  const cheapest = teamMonthlyCost({ siteIntegrationManager: 0.5, projectManager: 0.4, commercial: 0.25 });
  assert.ok(B_MONTHLY_FLOOR > cheapest.total,
    `floor £${Math.round(B_MONTHLY_FLOOR)} vs cheapest team's full cost £${Math.round(cheapest.total)}`);
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

console.log("\npricing — margin after everything\n");

t("every cost carries people, expenses, contingency AND overhead — the old 38% uplift carried no expenses at all", () => {
  const c = costOf({ effort: { director: 2 }, expenseProfile: "resident" });
  assert.ok(c.direct > 0 && c.expenses > 0 && c.contingency > 0 && c.overhead > 0);
  assert.equal(c.total, Math.round((c.direct + c.expenses + c.contingency + c.overhead) * 100) / 100);
});
t("a resident site month costs far more in expenses than desk work — somebody has to sleep away from home", () => {
  assert.ok(EXPENSES.resident > EXPENSES.visiting && EXPENSES.visiting > EXPENSES.desk);
  const desk = costOf({ effort: { director: 10 }, expenseProfile: "desk" });
  const site = costOf({ effort: { director: 10 }, expenseProfile: "resident" });
  assert.ok(site.total > desk.total * 1.1);
});
t("overhead recovery is derived from the annual line items, not guessed", () => {
  assert.equal(ANNUAL_OVERHEAD_TOTAL, Object.values(ANNUAL_OVERHEAD).reduce((a, b) => a + b, 0));
  assert.ok(OVERHEAD_RECOVERY > 0.2 && OVERHEAD_RECOVERY < 0.6, `${OVERHEAD_RECOVERY}`);
});
t("the MD's own time is costed — a business that treats the founder's day as free cannot see a bad engagement", () => {
  assert.ok(ANNUAL_OVERHEAD.mdUnchargeableTime > 0);
});
t("priceFor works backwards from a margin, and marginOf agrees with it", () => {
  const c = costOf({ effort: { seniorConsultant: 5 } });
  const p = priceFor(c.total, TARGET_NET_MARGIN);
  assert.equal(marginOf(p, c).netMarginPct, Math.round(TARGET_NET_MARGIN * 1000) / 10);
});
t("EVERY catalogue band clears the minimum net margin after everything", () => {
  const fails = [];
  for (const d of DELIVERABLES.filter((x) => x.bands.length)) {
    for (const b of d.bands) {
      const r = marginOf(b.fee, costOf({ effort: b.effort, expenseProfile: b.expenseProfile }));
      if (!r.meetsMinimum) fails.push(`${d.id}/${b.id} ${r.netMarginPct}%`);
    }
  }
  assert.deepEqual(fails, []);
});
t("and every band clears the TARGET — the procurement desk did not, and was raised until it did", () => {
  const thin = [];
  for (const d of DELIVERABLES.filter((x) => x.bands.length)) {
    for (const b of d.bands) {
      const r = marginOf(b.fee, costOf({ effort: b.effort, expenseProfile: b.expenseProfile }));
      if (!r.meetsTarget) thin.push(`${d.id}/${b.id} ${r.netMarginPct}% — needs £${Math.round(r.priceForTarget)}`);
    }
  }
  assert.deepEqual(thin, []);
});
t("every band states the effort it assumes — a fixed fee without one is a guess", () => {
  for (const d of DELIVERABLES.filter((x) => x.bands.length)) {
    for (const b of d.bands) {
      assert.ok(b.effort && Object.keys(b.effort).length > 0, `${d.id}/${b.id}`);
    }
  }
});
t("a recurring appointment reports its own margin after everything", () => {
  const b = integratorFee({ annualisedSpend: 9_000_000, compounds: 3, termMonths: 24 });
  assert.ok(b.margin.netMarginPct >= Math.round(MINIMUM_NET_MARGIN * 1000) / 10);
  const c = primeFee({ supplierSpend: 12_000_000, termMonths: 24, compounds: 3 });
  assert.ok(c.margin.netMarginPct >= Math.round(MINIMUM_NET_MARGIN * 1000) / 10);
});
t("break-even says how many a year the central cost needs", () => {
  const c = costOf({ effort: { director: 1, seniorConsultant: 2 } });
  const be = breakEven(6500, c);
  assert.ok(be.engagementsToBreakEven > 0 && be.engagementsToBreakEven < 60, `${be.engagementsToBreakEven}`);
  assert.equal(be.annualOverhead, ANNUAL_OVERHEAD_TOTAL);
});

console.log(`\n${pass} checks passed${process.exitCode ? " — with failures above" : ""}\n`);
