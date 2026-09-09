/**
 * What the work costs, so that what it is sold for can be checked.
 *
 * Every price in this business was set against what a client would pay and
 * nothing was set against what delivery costs. That is how a consultancy
 * discovers, two years in, that its busiest year was its worst one.
 *
 * The stack, in the order the money leaves:
 *
 *   1. DIRECT COST — the chargeable people, fully loaded. Salary plus
 *      employer's NI, pension, holiday cover, employer's liability,
 *      equipment and a phone. Roughly 1.3x salary before anything else.
 *   2. PROJECT EXPENSES — travel, accommodation, vehicles, PPE, site IT,
 *      printing. Small for desk work and very large for somebody resident
 *      on a remote site, which is exactly what Models B and C sell.
 *   3. CONTINGENCY — unbilled time. Scope creep, client delay, rework,
 *      the meeting that was not in the fee. It is always there, and a cost
 *      model that omits it is a wish.
 *   4. OVERHEAD RECOVERY — the central cost that exists whether or not a
 *      project does: insurance, accreditations, software, accountancy,
 *      legal, marketing, the Managing Director's unchargeable time.
 *   5. MARGIN — what is left, and the only reason to do any of it.
 *
 * The old uplift was a single 38% covering "central cost and margin". It
 * carried no expenses at all, so a site-based appointment was priced as
 * though nobody travelled to it, and it could not answer the one question
 * that matters: after everything, what is the margin.
 */

const p2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (n) => Math.round((Number(n) || 0) * 1000) / 10;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ------------------------------------------------------- what people cost */

/**
 * Fully loaded day rates — cost, not price.
 *
 * The Managing Director's day is costed even though he owns the company. A
 * business that treats the founder's time as free cannot tell a profitable
 * engagement from one that is quietly eating him.
 */
export const DAY_COST = {
  director: 620,
  seniorConsultant: 430,
  consultant: 330,
  coordinator: 220,
};

/** Monthly loaded cost of the site-based roles Models B and C field. */
export const MONTH_COST = {
  siteIntegrationManager: 9000,
  projectManager: 11000,
  commercial: 10000,
  procurement: 9500,
};

/* ------------------------------------------------------------- the stack */

/**
 * Project expenses, as a share of direct cost, by how the work is done.
 *
 * `resident` is the one that matters. A site integration manager on a rural
 * converter station is travelling, sleeping away from home and running a
 * vehicle every week of the appointment — and the previous model charged
 * nothing for any of it.
 */
export const EXPENSES = { desk: 0.04, visiting: 0.12, resident: 0.22 };

export const CONTINGENCY = 0.08;

/**
 * Central overhead for a year, as line items rather than a percentage,
 * because a percentage nobody can decompose is a percentage nobody argues
 * with. Every figure here is a planning assumption to be replaced with the
 * actual as soon as there is one.
 */
export const ANNUAL_OVERHEAD = {
  mdUnchargeableTime: 62000,      // ~60% of the MD's year on sales, leadership, approvals
  professionalIndemnity: 11000,   // PI at the level a report of this kind needs
  otherInsurance: 4500,           // public and employer's liability, cyber
  accreditations: 5000,           // ISO route, Constructionline, CHAS/SafeContractor
  accountancyAndPayroll: 4500,
  legalAndContract: 5000,         // on-demand construction solicitor
  softwareAndPlatform: 9500,      // CONSTRUX and VERYX hosting, AI, Microsoft, CRM
  marketingAndWebsite: 4000,
  bankAndFinance: 2000,
  officeAndAdmin: 3000,
  trainingAndCpd: 2000,
};
export const ANNUAL_OVERHEAD_TOTAL = Object.values(ANNUAL_OVERHEAD).reduce((s, n) => s + n, 0);

/**
 * Overhead recovery, derived rather than guessed.
 *
 * It is the annual central cost divided by the direct chargeable cost the
 * business expects to incur in a year. Change the forecast and the recovery
 * rate changes with it, which is the point: a fixed 32% would be wrong the
 * moment the business grows.
 */
export const FORECAST_ANNUAL_DIRECT_COST = 320000;
export const OVERHEAD_RECOVERY = p2(ANNUAL_OVERHEAD_TOTAL / FORECAST_ANNUAL_DIRECT_COST);

/**
 * Margin targets.
 *
 * 25% net is a good professional-services business. 15% is the line below
 * which an engagement is not worth the risk it carries — not a disaster,
 * but a decision that should be taken deliberately rather than discovered
 * afterwards.
 */
export const TARGET_NET_MARGIN = 0.25;
export const MINIMUM_NET_MARGIN = 0.15;

/**
 * Utilisation is already inside the overhead recovery rate, and saying so
 * matters because the first version of this file double-counted it.
 *
 * Nobody is chargeable every working day — between engagements, in bids, on
 * holiday and keeping a company legal, a consultancy sells around 65% of its
 * people's time. That is why FORECAST_ANNUAL_DIRECT_COST is the cost of the
 * days actually SOLD, not the cost of everyone employed: the unsold time is
 * already sitting in the overhead this rate recovers. Multiplying the project
 * margin by 0.65 on top of that, which is what the first version did, charges
 * for the same idle time twice and understates every price.
 */
export const TARGET_UTILISATION = 0.65;

/* --------------------------------------------------------------- the sums */

/**
 * What a piece of work costs to deliver, and what is left of the fee.
 *
 * `effort` is days by role: { director: 1, seniorConsultant: 2 }.
 */
export function costOf({ effort = {}, expenseProfile = "desk", extraDirectCost = 0 } = {}) {
  const direct = p2(
    Object.entries(effort).reduce((s, [role, days]) => s + num(days) * (DAY_COST[role] || 0), 0)
    + num(extraDirectCost)
  );
  const expenses = p2(direct * (EXPENSES[expenseProfile] ?? EXPENSES.desk));
  const contingency = p2(direct * CONTINGENCY);
  const overhead = p2(direct * OVERHEAD_RECOVERY);
  const total = p2(direct + expenses + contingency + overhead);
  return { direct, expenses, contingency, overhead, total, expenseProfile };
}

/**
 * The price a fee has to reach to hit a margin, working backwards.
 *
 * This is the function that should have existed before any band was chosen.
 */
export const priceFor = (cost, margin = TARGET_NET_MARGIN) => p2(cost / (1 - margin));

/** Check a fee against its cost, and say plainly whether it is good business. */
export function marginOf(fee, cost) {
  const f = p2(fee);
  const profit = p2(f - cost.total);
  const net = f > 0 ? profit / f : 0;
  return {
    fee: f,
    cost,
    profit,
    netMarginPct: pct(net),
    // Contribution is the fee less the costs that exist only because this
    // engagement does. It is what is available to pay for the company, and it
    // is the number that decides how many of these have to be sold in a year.
    contribution: p2(f - cost.direct - cost.expenses - cost.contingency),
    grossMarginPct: f > 0 ? pct((f - cost.direct - cost.expenses) / f) : 0,
    meetsTarget: net >= TARGET_NET_MARGIN,
    meetsMinimum: net >= MINIMUM_NET_MARGIN,
    priceForTarget: priceFor(cost.total, TARGET_NET_MARGIN),
    priceForMinimum: priceFor(cost.total, MINIMUM_NET_MARGIN),
    verdict: net >= TARGET_NET_MARGIN
      ? "Good business."
      : net >= MINIMUM_NET_MARGIN
        ? `Thin. ${pct(net)}% net is above the ${pct(MINIMUM_NET_MARGIN)}% minimum but below the ${pct(TARGET_NET_MARGIN)}% target — take it deliberately, not by accident.`
        : `Do not take this at this price. ${pct(net)}% net is below the ${pct(MINIMUM_NET_MARGIN)}% minimum. It needs £${Math.round(priceFor(cost.total, TARGET_NET_MARGIN)).toLocaleString()} to hit target.`,
  };
}

/**
 * The monthly cost of a site team, with expenses and overhead where the old
 * model had a single 38% that covered neither.
 */
export function teamMonthlyCost(composition, { expenseProfile = "resident", roleCost = MONTH_COST } = {}) {
  const direct = p2(Object.entries(composition).reduce((s, [role, n]) => s + num(n) * (roleCost[role] || 0), 0));
  const expenses = p2(direct * (EXPENSES[expenseProfile] ?? EXPENSES.resident));
  const contingency = p2(direct * CONTINGENCY);
  const overhead = p2(direct * OVERHEAD_RECOVERY);
  return { direct, expenses, contingency, overhead, total: p2(direct + expenses + contingency + overhead), expenseProfile };
}

/**
 * How much fee income a year has to carry before the lights stay on.
 *
 * Overhead does not care how many engagements there were. This is the number
 * of each thing that has to be sold in a year just to reach zero.
 */
export function breakEven(feePerEngagement, cost) {
  // Contribution: the fee less the costs that would not exist without the
  // engagement. Overhead is deliberately NOT subtracted here — it is the thing
  // being paid for.
  const contribution = p2(num(feePerEngagement) - cost.direct - cost.expenses - cost.contingency);
  return {
    annualOverhead: ANNUAL_OVERHEAD_TOTAL,
    contributionPerEngagement: contribution,
    engagementsToBreakEven: contribution > 0 ? Math.ceil(ANNUAL_OVERHEAD_TOTAL / contribution) : null,
    note: contribution > 0
      ? `£${Math.round(contribution).toLocaleString()} of each one is available to pay for the company. ${Math.ceil(ANNUAL_OVERHEAD_TOTAL / contribution)} a year covers the central cost; everything beyond that is profit.`
      : "This fee does not cover the cost of doing the work, so no volume of it reaches break-even.",
  };
}
