/**
 * What a recurring appointment costs, and the working that defends it.
 *
 * Models B and C are priced as a percentage of somebody else's spend, which
 * means the number changes with every project and cannot live in a catalogue.
 * Before this file the desk had a paragraph of guidance and a blank field —
 * so the first appointment would have been priced in a meeting, by mental
 * arithmetic, in front of a procurement person who does this every week.
 *
 * Two principles run through all of it.
 *
 * A MANAGEMENT FEE IS REGRESSIVE. The percentage falls as the spend rises,
 * because the cost of running the appointment does not scale with the value
 * of what is bought — a £20m estate does not need four times the team of a
 * £5m one. A flat percentage prices you out of the large jobs and starves you
 * on the small ones.
 *
 * THE FEE MUST SURVIVE TWO QUESTIONS. A client asks "what is this as a
 * percentage" and a finance director asks "what does the team cost". A number
 * that answers one and not the other loses the meeting. So every figure here
 * is computed both ways and the higher is taken: the percentage keeps it
 * defensible to the client, the staff build-up keeps it solvent.
 *
 * Every rate is a planning assumption, stated here so it can be argued with
 * rather than buried. See business/pricing/PRICING-REVIEW-2026.md.
 */

const p2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const p0 = (n) => Math.round(Number(n) || 0);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ------------------------------------------------------------------ scale */

/**
 * The scale of an appointment, from the thing that actually drives cost.
 *
 * Not the value of the spend — the number of places somebody has to stand.
 * One integration manager covers one compound properly and two badly.
 */
export function scaleOf({ compounds = 1, sites = 1 } = {}) {
  const c = Math.max(num(compounds), num(sites), 1);
  if (c <= 1) return { id: "single", label: "Single site", compounds: c };
  if (c <= 3) return { id: "multi", label: "Multi-compound", compounds: c };
  return { id: "programme", label: "Programme", compounds: c };
}

/* ---------------------------------------------------------------- Model B */

/** Mobilisation, by scale. One-off, payable with month one. */
export const B_MOBILISATION = { single: 18000, multi: 32000, programme: 55000 };

/**
 * The percentage of annualised managed spend, by size of that spend.
 *
 * Regressive, as above. The bands are stated rather than interpolated so that
 * a client can be told which band they are in and why.
 */
export const B_PCT_BANDS = [
  { upTo: 3_000_000, pct: 0.07 },
  { upTo: 8_000_000, pct: 0.06 },
  { upTo: 15_000_000, pct: 0.05 },
  { upTo: Infinity, pct: 0.04 },
];

/**
 * What the team costs, per month, fully loaded.
 *
 * "Fully loaded" means salary plus employer's NI, pension, holiday cover,
 * insurance, equipment and travel — roughly 1.3× salary before any overhead.
 * These are the figures the fee has to cover before ETABLIX earns anything.
 */
export const B_TEAM = {
  single: { siteIntegrationManager: 1, projectManager: 0.4, commercial: 0.25 },
  multi: { siteIntegrationManager: 1, projectManager: 0.7, commercial: 0.5 },
  programme: { siteIntegrationManager: 2, projectManager: 1, commercial: 0.75 },
};

/**
 * A thin compound does not need somebody standing on it all day.
 *
 * The first version of this put a full-time Site Integration Manager on every
 * compound regardless of what was happening there, and produced a fee of 17.5%
 * of spend on a £1.5m site — a number no client would pay and no honest
 * proposal would contain. Below this much spend per compound the role is
 * genuinely part-time and the project manager carries the rest.
 */
export const B_FULL_TIME_SIM_SPEND_PER_COMPOUND = 2_500_000;
export const B_MIN_SIM = 0.5;

function teamFor(scale, annualisedSpend) {
  const base = B_TEAM[scale.id];
  const perCompound = scale.compounds > 0 ? annualisedSpend / scale.compounds : 0;
  if (perCompound >= B_FULL_TIME_SIM_SPEND_PER_COMPOUND) return base;
  const sim = Math.max(base.siteIntegrationManager * 0.5, B_MIN_SIM);
  return { ...base, siteIntegrationManager: Math.round(sim * 100) / 100 };
}
export const B_ROLE_COST = { siteIntegrationManager: 9000, projectManager: 11000, commercial: 10000 };
/** Central cost and margin on top of the site team. */
export const B_OVERHEAD = 0.38;

/**
 * The monthly floor, and why it is not £14,000.
 *
 * £14,000 was the figure in the written guidance, and testing showed it could
 * never bind: the cheapest team this model can field — a half-time site
 * integration manager, 0.4 of a project manager and a quarter of a commercial
 * manager — costs £11,400 before overhead and £15,732 after it. A floor
 * beneath the team it is supposed to protect is decoration.
 *
 * £16,000 is the true minimum: the cheapest defensible team, plus enough to
 * mean something. Below it ETABLIX is paying to hold the appointment.
 */
export const B_MONTHLY_FLOOR = 16000;
export const B_MINIMUM_TERM_MONTHS = 6;
export const B_PLATFORM = { base: 1800, perExtraSite: 450, perUserOver25: 18, cap: 4500 };

/**
 * Price a Management Integrator appointment.
 *
 * `annualisedSpend` is the supply-chain spend under management for twelve
 * months — not the whole-life value. Using the whole-life figure is the
 * commonest way this arithmetic goes wrong, and it inflates the fee by the
 * length of the programme.
 */
export function integratorFee({
  annualisedSpend = 0, compounds = 1, sites = 1, termMonths = 12,
  construx = false, users = 25,
} = {}) {
  const scale = scaleOf({ compounds, sites });
  const spend = Math.max(num(annualisedSpend), 0);
  const term = Math.max(num(termMonths), 1);

  const band = B_PCT_BANDS.find((b) => spend <= b.upTo);
  const byPercent = p2((spend * band.pct) / 12);

  const team = teamFor(scale, spend);
  const teamCost = Object.entries(team).reduce((s, [role, n]) => s + n * B_ROLE_COST[role], 0);
  const byTeam = p2(teamCost * (1 + B_OVERHEAD));

  // The higher of the two, then the floor. Below the floor the appointment
  // does not fund a Site Integration Manager and ETABLIX subsidises it.
  const beforeFloor = Math.max(byPercent, byTeam);
  const monthly = p2(Math.max(beforeFloor, B_MONTHLY_FLOOR));

  const platform = construx
    ? p2(Math.min(
        B_PLATFORM.base
          + Math.max(scale.compounds - 1, 0) * B_PLATFORM.perExtraSite
          + Math.max(num(users) - 25, 0) * B_PLATFORM.perUserOver25,
        B_PLATFORM.cap
      ))
    : 0;

  const mobilisation = B_MOBILISATION[scale.id];

  const effectivePct = spend > 0 ? p2(((monthly * 12) / spend) * 100) : null;
  const driver = beforeFloor < B_MONTHLY_FLOOR ? "floor"
    : byTeam >= byPercent ? "team cost" : "percentage of spend";

  return {
    model: "B",
    scale,
    mobilisation,
    monthly,
    platform,
    firstInvoice: p2(mobilisation + monthly + platform),
    termValue: p2(mobilisation + (monthly + platform) * term),
    termMonths: term,
    belowMinimumTerm: term < B_MINIMUM_TERM_MONTHS,
    working: {
      percentBand: `${(band.pct * 100).toFixed(0)}% of annualised managed spend`,
      byPercent, byTeam,
      teamCost: p2(teamCost), teamComposition: team, overheadPct: B_OVERHEAD,
      floorApplied: beforeFloor < B_MONTHLY_FLOOR,
      driver,
      effectivePct,
    },
    // Building this calculator is what surfaced the case the written guidance
    // hid: five compounds against £5m of annualised spend needs two site
    // integration managers, and that team costs more than 7% of the spend.
    // The percentage then becomes 12%, which is outside anything defensible —
    // so it is named rather than quietly produced. The appointment is not
    // wrong; the way it is ARGUED has to change, or the scope does.
    warnings: [
      driver === "team cost" && effectivePct !== null && effectivePct > 7
        ? `The team this scope needs costs more than the percentage will fund. At ${effectivePct}% of managed spend this cannot be argued as a percentage fee — argue it as ${scale.compounds} compounds requiring ${team.siteIntegrationManager} site integration manager(s), or reduce the scope. Do not present ${effectivePct}% to a procurement function; they will price it against a 5% benchmark and you will lose on a number that was never the point.`
        : null,
      driver === "floor"
        ? `The percentage and the team cost both come out below the £${B_MONTHLY_FLOOR.toLocaleString()} floor, so the floor is setting the fee. Below it the appointment does not fund a Site Integration Manager on site. If the client will not pay the floor, this is an advisory engagement with a different name on it.`
        : null,
      term < B_MINIMUM_TERM_MONTHS
        ? `${term} months is below the ${B_MINIMUM_TERM_MONTHS}-month minimum. The mobilisation fee does not repay itself over a shorter term.`
        : null,
    ].filter(Boolean),
  };
}

/* ---------------------------------------------------------------- Model C */

/**
 * Prime is where a wrong number is not a lost margin but a lost company:
 * ETABLIX holds the supplier contracts, so it carries the working capital,
 * the credit risk and the performance risk.
 *
 * The first engagements are dearer, and that is said out loud rather than
 * hidden. A new prime has no framework rates, no volume leverage and no
 * record, so the same scope genuinely costs more to deliver. Clients
 * understand a learning curve; they do not forgive an unsignalled rise.
 */
export const C_PCT_BANDS_FIRST = [
  { upTo: 3_000_000, pct: 0.14 },
  { upTo: 8_000_000, pct: 0.12 },
  { upTo: 15_000_000, pct: 0.10 },
  { upTo: Infinity, pct: 0.09 },
];
export const C_PCT_BANDS_AT_SCALE = [
  { upTo: 3_000_000, pct: 0.10 },
  { upTo: 8_000_000, pct: 0.09 },
  { upTo: 15_000_000, pct: 0.08 },
  { upTo: Infinity, pct: 0.07 },
];
export const C_PCT_FLOOR = 0.08;
export const C_MOBILISATION = { single: 35000, multi: 60000, programme: 90000 };
/** The early-risk contingency inside the advance, as a share of month one. */
export const C_CONTINGENCY_PCT = 0.10;

/**
 * A prime team is the integrator team plus the people who buy and value the
 * supply chain, because under Model C ETABLIX holds those contracts.
 *
 * This exists because the calculator immediately showed something the written
 * guidance did not: 9% of £18m spread over 34 months is £47,600 a month, and
 * a five-compound prime team costs more than that. A percentage that does not
 * fund the team is not a fee, it is a loss with a schedule attached.
 */
export const C_TEAM = {
  single: { siteIntegrationManager: 1, projectManager: 0.6, commercial: 0.75, procurement: 0.5 },
  multi: { siteIntegrationManager: 1.5, projectManager: 1, commercial: 1, procurement: 0.75 },
  programme: { siteIntegrationManager: 2, projectManager: 1, commercial: 1.5, procurement: 1 },
};
export const C_ROLE_COST = { ...{ siteIntegrationManager: 9000, projectManager: 11000, commercial: 10000 }, procurement: 9500 };
export const C_OVERHEAD = 0.38;

/**
 * Price a Prime Service Contractor appointment, and say what it costs to fund.
 *
 * The working-capital line is the reason this function exists. A prime
 * appointment can be profitable and still insolvent: the fee is earned
 * monthly and the suppliers are paid monthly, and the gap between paying them
 * and being paid is money ETABLIX has to have. It is stated here so the
 * decision to take the work is made with the number in front of it.
 */
export function primeFee({
  supplierSpend = 0, termMonths = 12, compounds = 1, sites = 1,
  monthOneSupplierSpend = null, earlyProcurementCommitments = 0,
  firstEngagement = true, supplierPaymentDays = 30, clientPaymentDays = 30,
} = {}) {
  const scale = scaleOf({ compounds, sites });
  const spend = Math.max(num(supplierSpend), 0);
  const term = Math.max(num(termMonths), 1);

  const bands = firstEngagement ? C_PCT_BANDS_FIRST : C_PCT_BANDS_AT_SCALE;
  const band = bands.find((b) => spend <= b.upTo);
  const pct = Math.max(band.pct, C_PCT_FLOOR);

  const byPercentMonthly = p2((spend * pct) / term);
  const team = C_TEAM[scale.id];
  const teamCost = Object.entries(team).reduce((s2, [role, n]) => s2 + n * C_ROLE_COST[role], 0);
  const byTeamMonthly = p2(teamCost * (1 + C_OVERHEAD));

  // The higher of the two, always. A prime that does not fund its own team is
  // insolvent by design, and the client's percentage benchmark is not a
  // reason to accept that.
  const monthlyFee = p2(Math.max(byPercentMonthly, byTeamMonthly));
  const managementFee = p2(monthlyFee * term);
  const mobilisation = C_MOBILISATION[scale.id];

  // Month one is rarely an even share: mobilising costs more than steady
  // state. Where it is not given, an even share is used and flagged as an
  // assumption rather than presented as a figure.
  const evenMonth = p2(spend / term);
  const monthOne = monthOneSupplierSpend === null ? evenMonth : p2(num(monthOneSupplierSpend));
  const contingency = p2(monthOne * C_CONTINGENCY_PCT);
  const commitments = p2(num(earlyProcurementCommitments));

  const advance = p2(monthOne + mobilisation + monthlyFee + commitments + contingency);

  // Exposure. The first version of this subtracted supplier payment days from
  // client payment days and produced zero, which is true and useless: under
  // this model the client pays monthly IN ADVANCE, so at steady state ETABLIX
  // is cash positive and the arithmetic says there is no risk.
  //
  // The risk is not steady state. It is the client running one cycle late,
  // which is ordinary rather than exceptional, and at that moment ETABLIX owes
  // a month of supplier invoices with no month of client money behind them.
  // THAT is the number that decides whether the appointment can be taken.
  const gapDays = Math.max(num(clientPaymentDays) - num(supplierPaymentDays), 0);
  const exposure = p2(evenMonth + monthlyFee);

  return {
    model: "C",
    scale,
    pct,
    pctLabel: `${(pct * 100).toFixed(0)}% of supplier expenditure`,
    firstEngagement,
    managementFee,
    monthlyFee,
    mobilisation,
    advance,
    termMonths: term,
    advanceParts: {
      monthOneSupplierSpend: monthOne,
      monthOneAssumed: monthOneSupplierSpend === null,
      mobilisation,
      monthOneManagementFee: monthlyFee,
      earlyProcurementCommitments: commitments,
      earlyRiskContingency: contingency,
    },
    workingCapital: {
      steadyStateMonthlySupplierSpend: evenMonth,
      paymentGapDays: gapDays,
      exposureIfClientRunsOneCycleLate: exposure,
      note:
        `Invoicing monthly in advance means ETABLIX is cash positive while the client pays on time, so the steady-state figure is not the question. `
        + `The question is one late cycle: £${p0(exposure).toLocaleString()} of supplier invoices and fee falling due with no client money behind them. `
        + `That sum has to be available before the appointment is taken, not found after it.`
        + (gapDays > 0
          ? ` Supplier terms are ${gapDays} days shorter than the client's, which widens it further — negotiate them back-to-back.`
          : ` Keep the supplier terms back-to-back with the client's; the moment they are shorter, this figure grows.`),
    },
    working: {
      percentBand: `${(pct * 100).toFixed(0)}% of supplier expenditure`,
      byPercentMonthly, byTeamMonthly,
      teamCost: p2(teamCost), teamComposition: team, overheadPct: C_OVERHEAD,
      driver: byTeamMonthly > byPercentMonthly ? "team cost" : "percentage of spend",
      effectivePct: spend > 0 ? p2((managementFee / spend) * 100) : null,
    },
    warnings: [
      byTeamMonthly > byPercentMonthly
        ? `${(pct * 100).toFixed(0)}% of this spend over ${term} months is £${p0(byPercentMonthly).toLocaleString()} a month, and the team a ${scale.label.toLowerCase()} prime needs costs £${p0(byTeamMonthly).toLocaleString()}. The percentage does not fund the team. The fee has been set at team cost — do not discount back to the percentage, and do not take this appointment at ${(pct * 100).toFixed(0)}%.`
        : null,
      firstEngagement
        ? "Priced as a first engagement. Say out loud that the rate reduces at scale — clients understand a learning curve and do not forgive an unsignalled rise."
        : null,
      // A prime carries the full commercial apparatus whatever its size, so a
      // small one is expensive as a percentage and no client will accept it.
      // That is not a pricing problem to solve; it is an opportunity to decline.
      spend > 0 && (managementFee / spend) > 0.16
        ? `At ${p2((managementFee / spend) * 100)}% this is not a prime opportunity. The commercial apparatus a prime needs does not shrink with the spend, so a small prime is expensive to the client and thin for ETABLIX. Offer Model B instead, or decline.`
        : null,
    ].filter(Boolean),
    nonNegotiable: [
      "No supplier order is placed before the advance has cleared.",
      "No prime appointment is priced without a package-by-package build-up.",
      "The six prime gates are gates, not guidance: working capital, insurance, contractual protection, a creditworthy client, back-to-back terms, board approval.",
    ],
  };
}
