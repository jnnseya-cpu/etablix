/**
 * ETABLIX — UK go-to-market. THE OPERATING MODEL.
 *
 *   node business/strategy/build-gtm-uk.cjs
 *
 * Revision 5. Thirteen working weeks in two blocks:
 *
 *   Block A   Mon 28 September 2026  ->  Fri 18 December 2026   (12 weeks)
 *   SHUTDOWN  Sat 19 December        ->  Sun  3 January 2027    (16 days, zero)
 *   Block B   Mon  4 January 2027    ->  Fri  8 January 2027    (1 week)
 *
 * WHAT THE JANUARY WEEK ACTUALLY BUYS, STATED BEFORE THE PLAN USES IT.
 *
 * Not much probability. A cold approach takes about six working weeks from
 * send to signature, so the only sends that can use week 13 are the ones
 * made in week 7. Everything sent in weeks 1 to 6 already decided in
 * December. The first-sale confidence moves from 72.2% to 74.0% — under two
 * points, and a third of week 7's decisions are assumed lost to the
 * shutdown anyway.
 *
 * What it buys instead is worth far more, and it is the reason to do it:
 *
 *   1. Week 12 becomes a full closing week. Revision 4 spent 14 to 18
 *      December on landing and planning and sent nothing. With a January
 *      week to plan in, the last working week before Christmas chases every
 *      open decision to the wire instead.
 *
 *   2. The ladder gets a decision inside the ninety days. The requirements
 *      package is proposed in weeks 10 and 11 and, in revision 4, decided
 *      in Q1 — outside the plan. With week 13 it is decided on 8 January.
 *      That is the difference between £6,500 contracted and £27,000.
 *
 *   3. The reference survives the break. A diagnostic approved in week 8
 *      has a written reference requested in December and, if it slips,
 *      one working week in January to recover it.
 *
 * AND WHAT IT COSTS. Sixteen days in which nothing moves. Deals parked over
 * a shutdown do not all come back: this plan assumes 30% of them do not,
 * says so, and measures it. Section 6 is the handling.
 *
 * CHANGE THESE LINES AND THE WHOLE PLAN RECALCULATES.
 */
const COLD = { reply: 0.10, meeting: 0.40, proposal: 0.60, win: 0.33 };
const WARM = { meeting: 0.50, proposal: 0.75, win: 0.40 };
const LIVE_REFERRALS = 2;
const WEEKS_A = 12;             // 28 September to 18 December
const WEEKS_B = 1;              // the January week
const LEAD_WEEKS = 6;           // cold send -> decision, in WORKING weeks
const SPRINT = 20;              // approaches a week, weeks 1-6
const W7_RATE = 12;             // week 7: still convertible, but delivery starts
const DELIVERY_RATE = 6;        // week 8
const BASE = 10;                // weeks 9-11, Q1 pipeline
const W13_RATE = 20;            // week 13 opens the Q1 sprint
const SHUTDOWN_LOSS = 0.30;     // decisions parked over Christmas that never return

const B = require("../policies/brand.cjs");
const money = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const pc = (x, d = 0) => (x * 100).toFixed(d) + "%";

/* ---- the calendar, computed ---------------------------------------- */
const MON = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const WEEKS = WEEKS_A + WEEKS_B;
const PREP = new Date(Date.UTC(2026, 8, 21));            // Monday 21 September 2026
const START = new Date(Date.UTC(2026, 8, 28));           // Monday 28 September 2026
const addDays = (dt, n) => new Date(dt.getTime() + n * 86400000);
const dm = (dt) => `${dt.getUTCDate()} ${MON[dt.getUTCMonth()].slice(0, 3)}`;
const dmy = (dt) => `${dt.getUTCDate()} ${MON[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
/* Block B begins on the first Monday of January 2027 — found, not typed. */
const JAN_START = (() => {
  let dt = new Date(Date.UTC(2027, 0, 1));
  while (dt.getUTCDay() !== 1) dt = addDays(dt, 1);
  return dt;
})();
const wkStart = (w) => (w <= WEEKS_A ? addDays(START, (w - 1) * 7)
                                     : addDays(JAN_START, (w - WEEKS_A - 1) * 7));
const wkEnd = (w) => addDays(wkStart(w), 4);
const wk = (w) => `${dm(wkStart(w))}–${dm(wkEnd(w))}`;
const BLOCK_A_END = wkEnd(WEEKS_A);                      // Friday 18 December
const SHUT_FROM = addDays(BLOCK_A_END, 1);               // Saturday 19 December
const SHUT_TO = addDays(JAN_START, -1);                  // Sunday 3 January
const SHUT_DAYS = Math.round((SHUT_TO - SHUT_FROM) / 86400000) + 1;
const LAST_DAY = wkEnd(WEEKS);                           // Friday 8 January
const SPAN_DAYS = Math.round((LAST_DAY - START) / 86400000) + 1;
const WALL = wkEnd(LEAD_WEEKS + 1);                      // last convertible send: week 7
const ASK_BY = BLOCK_A_END;                              // last December ask

/* ---- the funnel, solved -------------------------------------------- */
const coldRate = COLD.reply * COLD.meeting * COLD.proposal * COLD.win;
const warmRate = WARM.meeting * WARM.proposal * WARM.win;
const perWinCold = Math.ceil(1 / coldRate);
const pNoWarm = Math.pow(1 - warmRate, LIVE_REFERRALS);
const pWarm = 1 - pNoWarm;
const needFor = (t) => Math.ceil(Math.log((1 - t) / pNoWarm) / Math.log(1 - coldRate));
const confOf = (n) => 1 - pNoWarm * Math.pow(1 - coldRate, n);
const N70 = needFor(0.70), N80 = needFor(0.80), N90 = needFor(0.90);

/* The convertible population: sends whose decision falls inside week 13.
   Weeks 1-6 decide in December at full weight. Week 7 decides in the
   January week, on the far side of the shutdown, so it is discounted. */
const CONV_DEC = SPRINT * LEAD_WEEKS;
const CONV_JAN_RAW = W7_RATE;
const CONV_JAN_EFF = W7_RATE * (1 - SHUTDOWN_LOSS);
const CONVERTIBLE_RAW = CONV_DEC + CONV_JAN_RAW;
const CONVERTIBLE = CONV_DEC + CONV_JAN_EFF;
const PIPELINE = DELIVERY_RATE + BASE * 3 + W13_RATE;
const TOTAL_SENT = CONVERTIBLE_RAW + PIPELINE;
const pPlan = confOf(CONVERTIBLE);
const pRev4 = confOf(SPRINT * LEAD_WEEKS);
const shortfall = Math.ceil(N80 - CONVERTIBLE);
const replyNeeded = (() => {
  const want = Math.pow((1 - 0.80) / pNoWarm, 1 / CONVERTIBLE);
  return (1 - want) / (COLD.meeting * COLD.proposal * COLD.win);
})();

/* ---- the ladder ----------------------------------------------------- */
const WEDGE = 6500, REQ = 14000, DESK_M = 7500, DESK_MONTHS = 6;
const LTV = WEDGE + REQ + DESK_M * DESK_MONTHS;
const WEDGE_DAYS = 3;
const CONTRACTED = WEDGE * 2 + REQ;
const INVOICED = WEDGE * 2 + REQ * 0.3;

const REV = "5";
const d = B.doc({
  slug: "Go-To-Market-UK-13-Week-Plan",
  running: "UK go-to-market · the operating model",
  kicker: "GO TO MARKET · UNITED KINGDOM",
  title: "THE OPERATING MODEL",
  sub: `13 working weeks in two blocks · ${dmy(START)} to ${dmy(LAST_DAY)} · ${money(CONTRACTED)} contracted`,
  rev: REV,
  outDir: __dirname,
  kind: "plan",
  control: [
    ["Document", "UK go-to-market — the operating model"],
    ["Revision", "5 — supersedes revisions 3 and 4. Revision 4 ended at 18 December; this one completes the ninety days in January."],
    ["Block A", `${dmy(START)} to ${dmy(BLOCK_A_END)} — weeks 1 to ${WEEKS_A}`],
    ["Shutdown", `${dmy(SHUT_FROM)} to ${dmy(SHUT_TO)} — ${SHUT_DAYS} days, zero activity assumed and zero planned`],
    ["Block B", `${dmy(JAN_START)} to ${dmy(LAST_DAY)} — week ${WEEKS}`],
    ["Working time", `${WEEKS} weeks across ${SPAN_DAYS} calendar days`],
    ["Preparation week", `${dmy(PREP)} to ${dm(addDays(PREP, 4))} — before the clock starts. Section 10.`],
    ["Objective", `One client on the ladder, DECIDED: ${money(CONTRACTED)} contracted by ${dmy(LAST_DAY)}.`],
    ["The wall", `${dmy(WALL)} — end of week ${LEAD_WEEKS + 1}. The last cold approach that can decide inside the plan. Section 1.4.`],
    ["Activity required", `${CONVERTIBLE_RAW} approaches in weeks 1–${LEAD_WEEKS + 1} (${CONVERTIBLE.toFixed(0)} effective after the shutdown discount) for ${pc(pPlan)} confidence. ${N80} would be needed for ${pc(0.8)}; the gap and its two levers are at 5.1`],
    ["Owner", "Justin Nseya, Director"],
    ["Recalculation", "Change the assumption lines at the top of build-gtm-uk.cjs"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ================================================================== */
h1("1. The model");

rich([{ t: `Thirteen working weeks, in two blocks, with ${SHUT_DAYS} days in the middle where nothing happens. `, b: true },
  { t: `Twelve weeks to ${dmy(BLOCK_A_END)}, because UK construction stops there and does not restart until January. Then one week from ${dmy(JAN_START)} to finish. That is ${WEEKS} weeks of working time across ${SPAN_DAYS} calendar days, and the gap is not slack — it is a hard stop that this plan is built around rather than through.` }]);

h2("1.1  What the January week is for");

p("It is worth being exact about this, because the obvious answer is wrong. The January week does not buy much more chance of a first sale.");

table([4000, 4300],
  ["", "Value"],
  [
    ["First-sale confidence, Block A alone (revision 4)", pc(pRev4, 1)],
    ["First-sale confidence with the January week", pc(pPlan, 1)],
    ["Gain", "+" + ((pPlan - pRev4) * 100).toFixed(1) + " points"],
  ]);

rich([{ t: "Under two points, and here is why. ", b: true },
  { t: `A cold approach takes about ${LEAD_WEEKS} working weeks from send to signature (section 1.2). Everything sent in weeks 1 to ${LEAD_WEEKS} already decided in December. The only sends that can use week ${WEEKS} are week ${LEAD_WEEKS + 1}'s — ${W7_RATE} of them — and ${pc(SHUTDOWN_LOSS)} of those are assumed lost to the shutdown. Adding a week at the end of a quarter does almost nothing for the top of the funnel.` }]);

p("What it does instead is worth a great deal more, and these three things are the actual reason to run it:");

table([2600, 5700],
  ["What the January week buys", "Why it matters"],
  [
    ["Week 12 becomes a full closing week",
     `Revision 4 spent ${wk(12)} on landing and planning and sent nothing. With somewhere to do the planning, the last working week before Christmas chases every open decision to the wire instead. That is a whole extra closing week inside the December window, which is where the first sale actually comes from.`],
    [`The ladder gets DECIDED, not proposed — ${money(CONTRACTED)} instead of ${money(WEDGE)}`,
     `The requirements package is proposed in weeks 10 and 11. In revision 4 it was decided in Q1, outside the plan, and the plan's declared result was one diagnostic. With week ${WEEKS} it is decided on ${dm(LAST_DAY)}. The objective changes from “a sale” to “a client”, and the number changes by ${money(CONTRACTED - WEDGE)}.`],
    ["The reference survives the break",
     "A diagnostic approved in week 8 has its written reference requested in November. If it slips — and references slip — there is one working week in January to recover it before the quarter is declared. Without that week, a missing reference is simply missing."],
  ]);

h2("1.2  The funnel, and the lead time that governs the shape");

table([3200, 1400, 3700],
  ["Stage", "Rate", "Basis — replace with actuals as they arrive"],
  [
    ["Approach → reply", pc(COLD.reply), "Targeted, personalised, to a named compound-holder. Assumption."],
    ["Reply → meeting", pc(COLD.meeting), "A reply is interest, not a diary slot. Assumption."],
    ["Meeting → priced proposal", pc(COLD.proposal), "Requires a named live scheme to price against. Assumption."],
    ["Proposal → win", pc(COLD.win), "No track record, small ticket, risk reversed. Assumption."],
    ["NET: approach → win", pc(coldRate, 2), `One win per ${perWinCold} cold approaches.`],
  ]);

table([2600, 1300, 4400],
  ["Step", "Elapsed", "Why it takes that long"],
  [
    ["Send → last touch", "18 days", "The four-touch sequence at section 4. Fixed, deliberate, not compressible without lowering the reply rate."],
    ["Last touch → meeting held", "~1 week", "A diary slot with a construction or development manager is rarely the same week."],
    ["Meeting → priced proposal", "~1 week", "Requires a named scheme, a scope and a fee. Same week is possible; assume it is not."],
    ["Proposal → decision", "1–2 weeks", `${money(WEDGE)} sits inside one person's authority. That is why it is the wedge. It still is not instant.`],
    ["TOTAL, cold send to signature", `~${LEAD_WEEKS} working weeks`, `In WORKING weeks. The shutdown does not count towards it and does not shorten it — a proposal issued on ${dm(BLOCK_A_END)} is not four days from a decision, it is one working week.`],
  ]);

h2("1.3  Therefore");

table([4800, 3500],
  [`Confidence of at least one win by ${dmy(LAST_DAY)}`, `Effective approaches needed in weeks 1–${LEAD_WEEKS + 1}`],
  [
    ["The 2 live referrals, alone", `${pc(pWarm)} — ${LIVE_REFERRALS} referrals, nothing else`],
    [`${pc(0.7)} confidence`, String(N70)],
    [`${pc(0.8)} confidence`, String(N80)],
    [`${pc(0.9)} confidence`, String(N90)],
    [`THE PLAN: ${CONVERTIBLE_RAW} sent, ${CONVERTIBLE.toFixed(0)} effective`, `${pc(pPlan, 1)} — chosen, and the gap is named at 5.1`],
  ]);

richBullet([{ t: `${SPRINT} a week for six weeks, then ${W7_RATE} in week ${LEAD_WEEKS + 1}, then the rate drops. `, b: true },
  { t: `This is a sprint, not a cadence. ${Math.ceil(N80 / (LEAD_WEEKS + 1))} a week for seven weeks would buy ${pc(0.8)} and is not sustainable alongside delivery by one person; this is. The honest position is ${pc(pPlan, 1)} with the levers to close it, not ${pc(0.8)} on paper and ten unsent emails a week in practice.` }]);

h2("1.4  The four dates that govern the plan");

table([2300, 6000],
  ["Date", "What it is"],
  [
    [dmy(WALL), `THE WALL. End of week ${LEAD_WEEKS + 1}. The last day a cold approach sent can still decide inside the plan. Volume after this date builds Q1, not this quarter's result.`],
    [dmy(ASK_BY), `THE LAST DECEMBER ASK. End of week ${WEEKS_A}. Every open decision must have been asked for explicitly, in writing, with a dated resumption for January. Section 6.`],
    [dmy(SHUT_TO), `THE SHUTDOWN ENDS. ${SHUT_DAYS} days in which nothing is sent, chased, measured or counted as lost.`],
    [dmy(LAST_DAY), `THE END. End of week ${WEEKS}. The plan is declared against section 7.4 on this day, not in February.`],
  ]);

h2("1.5  And the objective is a client, not a sale");

table([3400, 1500, 3400],
  ["Product", "Fee", "When it is sold"],
  [
    ["Site Systems Diagnostic (single site)", money(WEDGE), "The wedge. One person's authority, one week's decision. Sold twice in this plan."],
    ["Site Management Requirements (single compound)", money(REQ), `To the same client, once they have seen the diagnostic. Proposed week 10, DECIDED week ${WEEKS}.`],
    [`Managed Procurement Desk, ${DESK_MONTHS} months`, money(DESK_M * DESK_MONTHS), `${money(DESK_M)}/month. Recurring, because ETABLIX wrote the specification. Q1.`],
    ["ONE CLIENT, FIRST 12 MONTHS", money(LTV), `${(LTV / WEDGE).toFixed(1)}× the first sale.`],
  ]);

rich([{ t: `The first sale is worth ${money(WEDGE)}. The client is worth ${money(LTV)}. `, b: true },
  { t: "That ratio is the entire commercial argument of this business, and it decides three things: what to sell first (the cheapest thing that earns the right to sell the rest), how much a client is worth winning (a great deal more than the wedge suggests), and what the objective of these thirteen weeks actually is." }]);

note(`THE OBJECTIVE: by ${dmy(LAST_DAY)} — two diagnostics delivered and approved, one written reference in hand, and the requirements package INSTRUCTED. ${money(CONTRACTED)} contracted, ${money(INVOICED)} invoiced, ${money(LTV)} in play. Revision 4's objective stopped at "proposed", which is a sales activity rather than a result.`);

/* ================================================================== */
pageBreak();
h1("2. The money");

h2("2.1  Unit economics of the wedge");

table([4400, 3900],
  ["Metric", "Value"],
  [
    ["Fee", money(WEDGE)],
    ["Effort at the platform's own band", `${WEDGE_DAYS} days (1 director, 2 senior consultant)`],
    ["Revenue per day delivered by the director alone", money(WEDGE / WEDGE_DAYS)],
    ["Marginal cost of delivery", "Effectively nil. No subcontract, no materials, no travel beyond one visit."],
    ["Payment terms (Model A)", `${money(WEDGE * 0.3)} on start, ${money(WEDGE * 0.7)} on approval`],
    ["Cash at risk if the client refuses to pay", `${money(WEDGE * 0.7)} — the balance only`],
  ]);

richBullet([{ t: `${money(WEDGE / WEDGE_DAYS)} a day is the number that makes the risk reversal affordable. `, b: true },
  { t: `Offering “if it tells you nothing you did not know, do not pay” costs ${WEDGE_DAYS} days of time and no cash. An established competitor cannot make that offer because their delivery carries salaries. This is the one structural advantage of being small, and it should be used on every first sale until there is a reference.` }]);

h2("2.2  Cash, by week, on the plan working");

table([900, 1350, 2600, 1650, 1800],
  ["Wk", "Dates", "Event", "Invoiced", "Cumulative"],
  [
    ["1–4", `${dm(wkStart(1))}–${dm(wkEnd(4))}`, "Selling. Nothing invoiced.", "—", "£0"],
    ["5", wk(5), "First diagnostic instructed — deposit", money(WEDGE * 0.3), money(WEDGE * 0.3)],
    ["7–8", `${dm(wkStart(7))}–${dm(wkEnd(8))}`, "Delivered and approved — balance", money(WEDGE * 0.7), money(WEDGE)],
    ["9", wk(9), "Second diagnostic instructed — deposit", money(WEDGE * 0.3), money(WEDGE * 1.3)],
    ["11", wk(11), "Second diagnostic approved — balance", money(WEDGE * 0.7), money(WEDGE * 2)],
    ["12", wk(12), "Requirements proposal issued and priced", "—", money(WEDGE * 2)],
    ["—", `${dm(SHUT_FROM)}–${dm(SHUT_TO)}`, `SHUTDOWN — ${SHUT_DAYS} days. No invoices, no receipts, no chasing.`, "—", money(WEDGE * 2)],
    [String(WEEKS), wk(WEEKS), "Requirements package INSTRUCTED — deposit", money(REQ * 0.3), money(INVOICED)],
    ["Q1", "Jan–Mar", "Requirements balance + desk commences", money(REQ * 0.7 + DESK_M), "—"],
  ], { size: 15 });

richBullet([{ t: `The first cash lands in week 5 — ${wk(5)} — at the earliest. `, b: true },
  { t: `That is the single most important planning fact in this document. Five weeks of zero receipts from ${dmy(START)}, followed by a deposit, and the first material payment in weeks 7 to 8. Any runway calculation that assumes revenue before ${dm(wkStart(5))} is wrong.` }]);

richBullet([{ t: `The second most important is that ${SHUT_DAYS} days of it carry no receipts at all. `, b: true },
  { t: `Nothing is invoiced between ${dm(BLOCK_A_END)} and ${dm(LAST_DAY)}, and anything invoiced in December on 30-day terms is a January receipt regardless. The runway has to cross the shutdown on money already banked.` }]);

fillIn(`Fill in: the runway in weeks at current burn, and the calendar date it ends with no revenue. Two tests, not one. If that date falls before ${dm(wkStart(7))}, this plan is not the priority — funding is. If it falls between ${dm(BLOCK_A_END)} and ${dm(LAST_DAY)}, the plan survives Block A and dies in the shutdown, which is the worst possible place to find out. Say so now rather than in November.`);

/* ================================================================== */
pageBreak();
h1("3. Where the first sale actually comes from");

rich([{ t: "Not from a tier-one contractor. From a battery storage or solar developer. ", b: true },
  { t: `Three reasons, and with a seven-week sending window they matter more than they did: ${money(WEDGE)} is a rounding error against a £20–40m BESS scheme; the decision sits with one development or construction manager rather than a supply chain committee; and they have nobody in-house doing site establishment at all, because a developer with four projects cannot justify the headcount.` }]);

p(`Tier-one contractors and the grid EPCs are the larger prize and they are the slower sale: prequalification, supplier onboarding, framework positions, and a purchase order that may take longer than this quarter. They are worked in parallel — both live referrals sit there — but nothing in this plan depends on them closing before ${dm(LAST_DAY)}.`);

h2("3.1  The target tiers");

table([1100, 2500, 4700],
  ["Tier", "Who", "Why this tier, and what to lead with"],
  [
    ["1", "BESS and solar developers and IPPs",
     `FASTEST CLOSE — and speed is the selection criterion. One decision-maker, no in-house function, small ticket against scheme value, and the director's UK Power Reserve background is directly on point. Lead with grid connection compound and temporary power. This tier should be the majority of the ${CONVERTIBLE_RAW} convertible approaches.`],
    ["2", "Grid and T&D EPC contractors",
     "HIGHEST VALUE, SLOWER. Both live referrals are here. Repeated compounds at similar scale, which is where a specification written once carries. Lead with the repeat argument, not with one site."],
    ["3", "Data centre EPC and M&E contractors",
     "MEDIUM SPEED. Exyte already open. The out-of-London build-out puts peak workforce beyond the local catchment, which is the proposition in its purest form. Lead with labour catchment."],
    ["4", "Tier-one main contractors",
     `TOO SLOW FOR THE CONVERTIBLE WINDOW. Long onboarding, established supply chains. Four approaches already made with no reply. They belong in the weeks 8–${WEEKS} pipeline batch with delivered work to cite, not in the sprint.`],
  ]);

h2("3.2  The list, built this week");

p(`Named organisations by tier, all publicly active in these sectors in the United Kingdom. This is the research list, not a claim of any relationship. The sprint needs ${SPRINT} qualified organisations a week for six weeks, so the list has to reach ${SPRINT * 3} before ${dmy(START)} and keep growing after it. Building it is the whole job of the preparation week at section 10.`);

table([1100, 7200],
  ["Tier", "Organisations to research and qualify"],
  [
    ["1", "Zenobe · Harmony Energy · Field · Statera Energy · Pacific Green · Gresham House Energy Storage · Penso Power · Eelpower · Root-Power · Enso Energy · RES · Elgin Energy · Anesco · Balance Power · Clearstone Energy"],
    ["2", "Hitachi Energy (LIVE) · Siemens Energy (LIVE) · Linxon · Omexom · Balfour Beatty · J Murphy & Sons · Taylor Woodrow · Freedom / NG Bailey · Telent · Jones Bros · Morrison Energy Services · Amey"],
    ["3", "Exyte (OPEN) · Mercury · Winthrop · Kirby · Dornan · Designer Group · PM Group · Ethos Engineering"],
    ["4", "Balfour Beatty · Laing O'Rourke · Skanska · Kier · Morgan Sindall (OPEN) · Sir Robert McAlpine · VolkerWessels · Mace · BAM"],
  ], { size: 16 });

h2("3.3  The qualification test, before an approach is spent");

bullet("Does this organisation hold a site compound in its own name? If no, it is not approached.");
bullet("Is there a scheme at bid, pre-construction or pre-mobilisation stage now? The work has no value once the number is committed.");
bullet(`Can the decision-maker be named, with a function — development manager, construction manager, project director, commercial manager? An approach to a generic inbox is not an approach and is not counted towards the ${CONVERTIBLE_RAW}.`);
bullet("Is there a trigger — a planning consent, a grid connection offer, a funding announcement, a framework award? A trigger is what makes the email timely rather than speculative.");

note(`Four tests, and the fourth is the one that lifts the reply rate. The assumption in section 1.2 is ${pc(COLD.reply)}; an untriggered approach to a generic inbox is nearer one. At ${SPRINT} a week the temptation to skip the fourth test is the single largest risk to this plan, because volume without triggers is indistinguishable from volume with them right up until the reply rate is measured in week 4.`);

/* ================================================================== */
pageBreak();
h1("4. The sequence");

p(`Four touches over 18 days, then stop. Same sequence every time, so the reply rate is measurable and the assumption in section 1.2 can be replaced with a fact. At ${SPRINT} sends a week the sequence carries roughly ${SPRINT * 3} live touches at any moment, which is the real reason it is fixed: a variable sequence at this volume cannot be run by one person or measured by anyone.`);

table([1100, 2300, 4900],
  ["Day", "Touch", "What it says"],
  [
    ["0", "The opener",
     "Three sentences. The no-owner line: site establishment is the only major cost line with no owner — priced from the last project by someone who will not run this one, inherited by someone who was not asked, tested for the first time in week one. No attachment, no ask beyond a reply."],
    ["4", "The proof",
     "One sentence and the specimen attached. “This is what the deliverable looks like — sixteen pages on an invented scheme, so no client is shown.” Nothing else. The document argues."],
    ["11", "The specific",
     "Name one of their schemes from public record and ask one question about it: who owns the establishment number on it, and has it been set yet. A question about their project, not about our service."],
    ["18", "The offer, and the stand-down",
     `${money(WEDGE)} for one site, and if it tells them nothing they did not already know they do not pay. Then: “that is the last from me on this — if the timing is wrong, it is wrong.” No further contact.`],
  ]);

richBullet([{ t: "Four touches, then stop, and mean it. ", b: true },
  { t: "The stand-down at touch four is what makes the sequence work: it raises the reply rate on the last email and it protects the address for a re-approach in six months with new information. A fifth touch converts almost nothing and costs the relationship." }]);

richBullet([{ t: `No sequence starts after ${dm(wkEnd(WEEKS_A - 1))}. `, b: true },
  { t: `An 18-day sequence begun in week ${WEEKS_A} has touches three and four falling inside the shutdown, which means either sending into an empty office or a three-week silence in the middle of a sequence. Both read as neglect. Week ${WEEKS_A} closes what is open and starts nothing.` }]);

h2("4.1  What is measured on every sequence");

table([4300, 4000],
  ["Measured", "Why"],
  [
    ["Replies per 100 sent, by tier", `Replaces the ${pc(COLD.reply)} assumption with a fact, per tier, by the end of week 4 — which is before the wall, and that timing is the point.`],
    ["Which touch produced the reply", "If touch 1 produces almost all of them, touches 2–4 are wasted effort at this volume. If touch 3 does, the trigger research is the value and the qualification test pays for itself."],
    ["Reply → meeting rate", "The second assumption, and the one most likely to be wrong."],
    ["Objection raised, verbatim", "Four are expected (section 8). A fifth appearing twice means the proposition has a gap."],
    ["Parked over the shutdown, and returned", `The ${pc(SHUTDOWN_LOSS)} assumption at 1.3 is a guess. It is the cheapest assumption in the plan to replace with a fact, and the answer changes how next Christmas is handled.`],
  ]);

/* ================================================================== */
pageBreak();
h1("5. The thirteen weeks");

p("Numeric, weekly, cumulative, dated. The only rows that matter in any given week are that week's. The column that matters most is the last but one: whether that week's approaches can still decide inside the plan.");

const rows = [];
let cum = 0;
const plan = [
  [1, "Sprint", SPRINT, "0", "First batch out Monday 09:00"],
  [2, "Sprint", SPRINT, "1", "—"],
  [3, "Sprint", SPRINT, "2", "—"],
  [4, "Sprint", SPRINT, "3", "WEEK 4 GATE · reply rate known"],
  [5, "Sprint + close", SPRINT, "4", "First diagnostic instructed"],
  [6, "Sprint + close", SPRINT, "4", "—"],
  [7, "Sprint + deliver", W7_RATE, "2", "WEEK 7 GATE · THE WALL"],
  [8, "Deliver", DELIVERY_RATE, "1", "Delivered, approved, reference asked"],
  [9, "Pipeline + close", BASE, "3", "WEEK 9 GATE · second instructed"],
  [10, "Pipeline + close", BASE, "3", "Requirements proposed"],
  [11, "Pipeline + close", BASE, "3", "Second diagnostic approved"],
  [12, "CLOSE — full week", 0, "2", `WEEK 12 GATE · every ask made, every resumption dated`],
];
for (const [w, focus, sent, meets, gate] of plan) {
  cum += sent;
  rows.push([String(w), wk(w), focus, String(sent), String(cum),
    w <= LEAD_WEEKS + 1 ? "IN PLAN" : "Q1 2027", meets, gate]);
}
rows.push(["—", `${dm(SHUT_FROM)}–${dm(SHUT_TO)}`, "SHUTDOWN", "0", String(cum), "—", "0", `${SHUT_DAYS} days. Section 6.`]);
cum += W13_RATE;
rows.push([String(WEEKS), wk(WEEKS), "DECIDE + restart", String(W13_RATE), String(cum),
  "Q1 2027", "3", `WEEK ${WEEKS} GATE · requirements instructed`]);

table([600, 1200, 1300, 700, 700, 1100, 650, 2050],
  ["Wk", "Dates", "Focus", "Sent", "Cum", "Decides", "Mtgs", "Gate"],
  rows, { size: 15 });

richBullet([{ t: `${CONVERTIBLE_RAW} of the ${TOTAL_SENT} approaches this plan sends can decide inside it — ${CONVERTIBLE.toFixed(0)} after the shutdown discount. `, b: true },
  { t: `The other ${PIPELINE} are Q1's pipeline. They are worth sending and they are not this plan's confidence, and they are never added to it anywhere in this document.` }]);

richBullet([{ t: `Week ${WEEKS_A} sends nothing and is the most valuable week in Block A. `, b: true },
  { t: `Revision 4 spent this week landing and planning. Here the planning has moved to week ${WEEKS}, so ${wk(WEEKS_A)} does one thing: ask for every open decision, in writing, and put a dated January resumption on each one. A week of pure closing before a shutdown is worth more than a week of sending whose sequences would break across it.` }]);

richBullet([{ t: `Week ${WEEKS} sends ${W13_RATE} and they are all Q1's. `, b: true },
  { t: "The last act of this plan is to have already started the next one. A quarter that opens with a week of planning has twelve weeks in it; one that opens with a full sending Monday has thirteen." }]);

h2("5.1  The sprint does not reach 80%, and here is the gap");

table([4300, 4000],
  ["", "Value"],
  [
    [`Approaches sent in the convertible window (weeks 1–${LEAD_WEEKS + 1})`, String(CONVERTIBLE_RAW)],
    [`Of which decide in December (weeks 1–${LEAD_WEEKS})`, String(CONV_DEC) + " — full weight"],
    [`Of which decide in week ${WEEKS} (week ${LEAD_WEEKS + 1})`, `${CONV_JAN_RAW} sent, ${CONV_JAN_EFF.toFixed(1)} effective after ${pc(SHUTDOWN_LOSS)} shutdown loss`],
    ["EFFECTIVE convertible approaches", CONVERTIBLE.toFixed(1)],
    [`Needed for ${pc(0.8)}`, String(N80)],
    ["SHORTFALL", String(shortfall)],
    ["Confidence the plan buys", pc(pPlan, 1)],
    ["Confidence targeted", pc(0.8)],
  ]);

rich([{ t: `The plan buys ${pc(pPlan, 1)}, not ${pc(0.8)}. `, b: true },
  { t: "That gap is stated rather than smoothed over, because a model that hides its own shortfall is exactly what these revisions exist to remove. There are two honest ways to close it and one dishonest one." }]);

table([2600, 5700],
  ["Lever", "What it takes"],
  [
    ["Lift the reply rate — PREFERRED",
     `The ${pc(COLD.reply)} assumption is for a targeted approach. At ${pc(replyNeeded, 1)} the same ${CONVERTIBLE_RAW} approaches reach ${pc(0.8)} with no extra volume at all. That is what the four qualification tests at 3.3 buy, and tier 1 is expected to beat ${pc(COLD.reply)} because the ticket is small and the buyer has nobody in-house. This lever costs research time, which is available; the other costs sending time, which is not.`],
    [`Raise the sprint to ${Math.ceil(N80 / (LEAD_WEEKS + 1))} a week`,
     `${shortfall} more effective approaches across seven weeks is about ${Math.ceil(shortfall / (LEAD_WEEKS + 1))} a week on top of ${SPRINT}. It reaches ${pc(0.8)} arithmetically. It is the fallback if the week 4 reply rate comes in at or below ${pc(COLD.reply)}, and it has to be paid for: LinkedIn drops to one comment a week and Thursday's list-building moves to Sunday.`],
    [`Count the weeks 8–${WEEKS} sends — DO NOT`,
     `The dishonest one, and the specific error revision 3 made. It closes the arithmetic on paper by counting approaches that cannot decide before ${dm(LAST_DAY)}. The number goes up; the probability of a result inside the plan does not move at all.`],
  ]);

p(`Decision rule, and it is a reading rather than a judgement: measure the reply rate at the end of week 4 — ${dmy(wkEnd(4))}. At or above ${pc(replyNeeded, 1)}, hold the sprint at ${SPRINT}. Below it, go to ${Math.ceil(N80 / (LEAD_WEEKS + 1))} a week for weeks 5, 6 and 7 only, and pay for it by cutting LinkedIn and moving list-building to the weekend. There is no third option, because week ${LEAD_WEEKS + 1} is the wall.`);

h2("5.2  The week");

table([1500, 6800],
  ["Day", "Fixed content"],
  [
    ["Monday", `The week's ${SPRINT} approaches go out in one batch by 09:00, plus every sequence touch due. Three hours against a list prepared on Thursday. Scoreboard updated before anything else happens.`],
    ["Tuesday", "Meetings, calls, proposals. Framework administration."],
    ["Wednesday", "Delivery or preparation. During an engagement this is the whole week."],
    ["Thursday", `Next week's list: ${SPRINT} qualified organisations with a named person and a trigger against each. This is the task that determines the following month's revenue and it is the one that gets skipped. At ${SPRINT} a week it is no longer optional — Monday has nothing to send without it.`],
    ["Friday", "Three LinkedIn comments. Ledger. Thirty minutes on what the numbers say."],
  ]);

/* ================================================================== */
pageBreak();
h1(`6. The shutdown — ${dmy(SHUT_FROM)} to ${dmy(SHUT_TO)}`);

rich([{ t: `${SHUT_DAYS} days in which nothing is sent, chased, measured or counted as lost. `, b: true },
  { t: "This section exists because the alternative is to spend the fortnight sending emails nobody reads and then treating the silence as rejection. Both halves of that are expensive: the sending burns addresses that would have replied in January, and the conclusion abandons deals that were never dead." }]);

h2("6.1  Before close of play on " + dmy(BLOCK_A_END));

bullet(`Every open proposal gets a dated resumption in writing: “I will come back to you on Monday ${dm(JAN_START)}.” Not “in the new year”. A named date is a diary entry; a vague one is an ending.`);
bullet(`Every sequence mid-flight has its remaining touches deferred to week ${WEEKS} with one line acknowledging the break — not silently paused, which reads identically to being dropped.`);
bullet("Every instructed engagement has its delivery date confirmed in writing against the January calendar, so nobody returns to a surprise.");
bullet(`The two live referrals — Hitachi Energy and Siemens Energy — get a short, no-ask December note. They are the ${pc(pWarm)} and they are the relationships most damaged by a three-week silence.`);
bullet(`The week ${WEEKS} plan is written before the break, not during it. Returning on ${dm(JAN_START)} to decide what to do that week wastes the only week Block B has.`);

h2("6.2  During");

bullet("Nothing. No sends, no touches, no chasing, no scoreboard.");
bullet("A reply that arrives is answered, because ignoring an inbound over Christmas is the one unforced error available.");
bullet("No conclusion is drawn from silence. A non-reply on 22 December is a holiday, not a no.");

h2("6.3  The " + pc(SHUTDOWN_LOSS) + " assumption, and how it is tested");

rich([{ t: `This plan assumes ${pc(SHUTDOWN_LOSS)} of the decisions parked over the shutdown never come back. `, b: true },
  { t: `Budgets reset, priorities move, the champion returns to a different set of problems. That assumption reduces week ${LEAD_WEEKS + 1}'s ${CONV_JAN_RAW} approaches to ${CONV_JAN_EFF.toFixed(1)} effective ones and costs the plan about ${((confOf(CONV_DEC + CONV_JAN_RAW) - pPlan) * 100).toFixed(1)} of a point. It is a guess, and it is the cheapest guess in the document to replace with a fact.` }]);

fillIn(`Fill in on ${dmy(LAST_DAY)}: how many conversations were parked on ${dm(BLOCK_A_END)}, and how many were live again by close of play. That fraction replaces the ${pc(SHUTDOWN_LOSS)} assumption and decides how next December is run.`);

/* ================================================================== */
pageBreak();
h1("7. Decision gates");

p("Written now so that the decision at each gate is a reading rather than a judgement. Five gates. The second is a closing door; the last is the only one that declares a result.");

h2(`7.1  Week 4 — ${dmy(wkEnd(4))}`);

table([2900, 5400],
  ["Test", "If it fails"],
  [
    [`${SPRINT * 4} approaches sent`,
     "The constraint is the list, not the sending. Move Thursday's list-building to Sunday and cut LinkedIn to one comment a week until the backlog clears. Three convertible weeks remain and they cannot be recovered afterwards."],
    [`Reply rate ≥ ${pc(replyNeeded, 1)}`,
     `Apply the section 5.1 decision rule now, not at the wall. Raise to ${Math.ceil(N80 / (LEAD_WEEKS + 1))} a week for weeks 5 to 7, or accept ${pc(pPlan, 1)} knowingly.`],
    ["≥ 3 replies from tier 1",
     "The tier-1 message is wrong, not the tier. Rewrite touch 1 around grid connection and temporary power specifically, and test 20 more before changing tier."],
    ["≥ 2 meetings held",
     "Replies are not converting. The problem is touch 3 or the ask. Offer a 20-minute call on a named scheme rather than a meeting."],
  ]);

h2(`7.2  Week ${LEAD_WEEKS + 1} — ${dmy(WALL)} — THE WALL`);

note("This gate is not a checkpoint; it is a closing door. Whatever has not been sent by this date cannot decide inside the plan, and no amount of effort in weeks 8 to 13 changes that. Read it honestly on the day.");

table([2900, 5400],
  ["Test", "If it fails"],
  [
    [`${CONVERTIBLE_RAW} approaches sent`,
     "Whatever is short is permanently short. Do not make it up in week 8 and count it — that is the revision 3 error. Record the actual number, recompute the confidence with it, and say plainly what the plan now looks like."],
    ["≥ 5 meetings held, ≥ 1 priced proposal issued",
     `If no proposal has been issued by the wall, drop to the £5,500 mobilisation-readiness review for any buyer with a scheme already committed. A smaller first engagement is still a first engagement and the reference is identical.`],
    ["1 engagement instructed and in delivery",
     `Escalate the risk reversal into writing on every open proposal the same day. It costs ${WEDGE_DAYS} days and no cash and it is the strongest answer to the only objection that matters.`],
    ["The Q1 pipeline plan exists",
     `From week 8 the sends are Q1's. If nobody has decided what Q1 is for, weeks 8 to ${WEEKS} will send tier-1 emails out of habit rather than the tier-4 and framework approaches Q1 actually needs.`],
  ]);

h2(`7.3  Week 9 — ${dmy(wkEnd(9))}`);

table([2900, 5400],
  ["Test", "If it fails"],
  [
    ["1 engagement delivered and approved",
     "If instructed but not delivered, delivery is the only activity until it is. If not instructed, the risk reversal was not offered clearly enough — put it in writing in the proposal, not just in the meeting."],
    ["Reference obtained or promised, in writing",
     `Ask again at approval, and if refused ask for permission to describe the work anonymously — sector and scale without the name is worth most of it. There is one working week in January to recover this and no more.`],
    ["Requirements package scoped and priced",
     `It is proposed in week 10 while the diagnostic is still in front of them. Scoping it in week 11 means proposing it in week ${WEEKS_A}, and a proposal issued the week before a shutdown decides in February.`],
    ["≥ 2 of the 4 funnel assumptions replaced with actuals",
     "The plan is still running on guesses. Recalculate section 1.2 with whatever data exists, even if thin."],
  ]);

h2(`7.4  Week ${WEEKS_A} — ${dmy(BLOCK_A_END)} — the last December ask`);

table([2900, 5400],
  ["Test", "If it fails"],
  [
    ["Every open decision has been asked for, explicitly, in writing",
     "Not implied, not “let me know your thoughts”. A named decision, a named date. Anything not asked for by close of play is not a January decision — it is a re-approach, and it converts like one."],
    [`Every open item has a dated resumption of Monday ${dm(JAN_START)}`,
     "Do it now, today, on every thread. Section 6.1. This is twenty minutes of work that decides what week 13 has to work with."],
    [`${money(WEDGE * 2)} invoiced`,
     "Two diagnostics delivered and approved was the Block A target. One is recoverable in Q1; none means the wall reading was ignored and the January week cannot fix it."],
    [`Week ${WEEKS} written`,
     `Written in the week the site teams are still reachable. Returning on ${dm(JAN_START)} to decide what that week is for wastes the only week Block B has.`],
  ]);

h2(`7.5  Week ${WEEKS} — ${dmy(LAST_DAY)} — the result`);

table([2900, 5400],
  ["Test", "If it fails"],
  [
    [`Requirements package INSTRUCTED — ${money(CONTRACTED)} contracted`,
     `This is the objective. Proposed but not instructed is revision 4's result, not this one's: ask for the decision on ${dm(JAN_START)}, not on the Friday. If it is refused, ask what changed since the proposal — the answer is the most valuable sentence of the quarter.`],
    ["Written reference in hand",
     "The one thing that cannot be recovered later. Without it, Q1's first line is obtaining one and paid advertising stays out of scope for another quarter."],
    ["Pipeline ≥ 4 live conversations into Q1",
     `This is what the ${PIPELINE} weeks 8–${WEEKS} approaches were for. If it is empty, those sends were made without qualification and Q1 starts from nothing.`],
    ["Parked-and-returned fraction recorded",
     `Section 6.3. Without it the ${pc(SHUTDOWN_LOSS)} assumption stays a guess for another year.`],
    ["Q1 plan written and its first Monday already sent",
     `Week ${WEEKS} sends ${W13_RATE} approaches. If it did not, the quarter ends with a plan and no activity, which is how the previous two revisions began.`],
  ]);

/* ================================================================== */
pageBreak();
h1("8. Pricing discipline, and the four objections");

h2("8.1  Three rules");

richBullet([{ t: `Quote ${money(WEDGE)} in the meeting, out loud. `, b: true },
  { t: "A proposal that arrives three days later gives the objection three days to form in private — and in a seven-week sending window, three days is a measurable fraction of the quarter." }]);
richBullet([{ t: "Never call it a discount. ", b: true },
  { t: "A foundation rate has a reason, a date it holds until, and an explicit statement that it does not carry forward. A discount tells a buyer the first number was padded and re-prices every future quotation downwards." }]);
richBullet([{ t: "Offer the risk reversal in writing, in the proposal. ", b: true },
  { t: `It costs ${WEDGE_DAYS} days and no cash (section 2.1), it is the strongest answer to the only objection that matters, and said in a meeting but omitted from the document it reads as something not meant.` }]);

h2("8.2  The four objections");

table([2200, 6100],
  ["What they say", "The answer"],
  [
    ["“We do this in-house.”",
     "Agree without qualification — they do. Then: when does it get done, and by whom? The answer is almost always the fortnight before submission, by whoever had capacity. The gap is time, not competence, and saying so is what keeps the conversation alive."],
    ["“You have no track record.”",
     "Concede before they finish. No completed engagement under the company's name; the director has a record and the referees can be called. Then move the risk: if it tells you nothing you did not know, you do not pay."],
    ["“Send me something and I'll circulate it.”",
     "Accept and pin it. Send the delivery record and specimen the same day, then ask which scheme to look at when they come back. Circulation with nothing specific attached is how an enquiry dissolves politely."],
    ["“Let's pick this up in the new year.”",
     `The December objection, and it is usually genuine. Accept it and convert it into a diary entry: “Monday ${dm(JAN_START)}, twenty minutes — shall I send an invitation?” An agreed date is worth more than an agreed principle, and it is the difference between the ${pc(SHUTDOWN_LOSS)} that returns and the ${pc(SHUTDOWN_LOSS)} that does not.`],
  ]);

/* ================================================================== */
h1("9. The scoreboard");

p("Leading indicators, not lagging ones. Revenue is a result; these are the causes. The week 7 column is the one to look at hardest, because after it nothing on this board can change the result.");

table([2900, 950, 950, 950, 950, 950, 950],
  ["Weekly measure", "Wk 4", "Wk 7", "Wk 9", "Wk 12", "Wk 13", "Source"],
  [
    ["Qualified organisations on the list", String(SPRINT * 4), String(SPRINT * 6 + W7_RATE), String(SPRINT * 7), String(SPRINT * 8), String(SPRINT * 9), "Thursday"],
    ["Approaches sent, cumulative", String(SPRINT * 4), String(CONVERTIBLE_RAW), String(CONVERTIBLE_RAW + DELIVERY_RATE + BASE), String(CONVERTIBLE_RAW + DELIVERY_RATE + BASE * 3), String(TOTAL_SENT), "Monday"],
    ["Of which decide inside the plan", String(SPRINT * 4), String(CONVERTIBLE_RAW), String(CONVERTIBLE_RAW), String(CONVERTIBLE_RAW), String(CONVERTIBLE_RAW), "Monday"],
    ["Reply rate, actual", "≥" + pc(replyNeeded, 0), "≥" + pc(replyNeeded, 0), "—", "—", "—", "Ledger"],
    ["Meetings held, cumulative", "2", "9", "12", "17", "20", "Ledger"],
    ["Priced proposals issued", "1", "2", "4", "6", "6", "Documents"],
    ["Engagements instructed", "0", "1", "2", "2", "3", "Portal"],
    ["References in writing", "0", "0", "1", "1", "1", "—"],
    ["Contracted, cumulative", "£0", money(WEDGE), money(WEDGE * 2), money(WEDGE * 2), money(CONTRACTED), "Portal"],
    ["Invoiced, cumulative", "£0", money(WEDGE * 0.3), money(WEDGE * 1.3), money(WEDGE * 2), money(INVOICED), "Portal"],
  ], { size: 14 });

note("If a row has not moved in two weeks, the question is not how to move it. It is whether the plan is being run. Two weeks, not three — a thirteen-week plan with a sixteen-day hole in it cannot absorb a three-week diagnosis.");

/* ================================================================== */
pageBreak();
h1(`10. The preparation week — ${dmy(PREP)} to ${dm(addDays(PREP, 4))}`);

rich([{ t: "This week is not the plan. It is what makes week 1 a selling week instead of an unblocking one. ", b: true },
  { t: `Revision 3 spent its first week on the delivery record, the referees and CHIC, and sent nothing. That was affordable over thirteen consecutive weeks. It is not affordable over seven convertible ones — a week of unblocking inside the sprint costs ${SPRINT} approaches and about ${((confOf(CONVERTIBLE) - confOf(CONVERTIBLE - SPRINT)) * 100).toFixed(1)} of a point. So the unblocking happens now, before the clock starts.` }]);

table([1600, 6700],
  ["Day", "Finished by close of play"],
  [
    [`Mon ${dm(PREP)}`, "The delivery record: three schemes — employer, client, location, dates, scheme value, the value of the scope personally held, role, peak workforce, establishment duration, scope delivered, what changed. NOTHING ELSE TODAY. It unblocks CHIC and Hitachi Energy simultaneously and nobody else can write it."],
    [`Tue ${dm(addDays(PREP, 1))}`, "Approach four referees to secure three; record the date each agrees. Send the Siemens Energy reply to Matthew, copying Andrew — drafted, and every day it sits unsent reflects on the person who made the referral."],
    [`Wed ${dm(addDays(PREP, 2))}`, "The three financial documents from the workbook. Every figure is in the bank statements and the company's own records. Label all three as unaudited management information."],
    [`Thu ${dm(addDays(PREP, 3))}`, `Resubmit CHIC through the portal, every section confirmed. Send the Hitachi Energy pack to Jamie Holiday with the request for twenty minutes. Then build the first ${SPRINT * 2} tier-1 organisations.`],
    [`Fri ${dm(addDays(PREP, 4))}`, `Finish the list to ${SPRINT * 3}. Name a person and a trigger against each of the first ${SPRINT}. Write the week 1 batch and schedule it. Three LinkedIn comments.`],
    [`Mon ${dm(START)} 09:00`, `THE PLAN STARTS. The first ${SPRINT} go out before anything else is opened.`],
  ]);

richBullet([{ t: "If the delivery record is not finished this week, week 1 is not a selling week and the plan loses a seventh of its convertible volume. ", b: true },
  { t: "It is the only task in this document with no substitute and no alternative author, and it is the one most easily postponed because it is uncomfortable to write." }]);

fillIn(`Fill in on Friday ${dm(addDays(PREP, 4))}: the number of qualified organisations on the list with a named person and a trigger. If it is below ${SPRINT}, Monday cannot start and the honest response is to say so on Friday rather than discover it at 09:00 on Monday.`);

/* ================================================================== */
h1("11. Out of scope, and the triggers to change that");

table([2700, 5600],
  ["Excluded", "What would bring it in"],
  [
    ["Europe and the Gulf",
     "Two delivered UK engagements, one for a multinational with overseas operations, and a named internal introduction to its regional team. The analysis is in revision 2 of this plan and it stands."],
    ["Paid advertising", "A reference in hand and a second deliverer. Until then it buys enquiries that cannot be converted or serviced."],
    ["CONSTRUX and VERYX as propositions", "The diagnostic sold three times. One proposition, told the same way, until it has been sold."],
    ["ISO certification", "A buyer saying it is the blocker. None has."],
    ["Hiring", `A second engagement instructed while the first is in delivery. At ${money(WEDGE / WEDGE_DAYS)} a day the constraint is days, not money — and that is exactly when the first hire pays for itself.`],
    ["GE Vernova", "2027. The single no-ask email already drafted is the last contact."],
    ["Tier-four main contractors in the sprint", `They are in the weeks 8–${WEEKS} pipeline batch instead. Their decision cycle is longer than the ${LEAD_WEEKS} working weeks the convertible window has, so a sprint approach to them is a Q1 approach sent in October.`],
    ["Any activity in the shutdown", `${dmy(SHUT_FROM)} to ${dmy(SHUT_TO)}. Section 6. Sending into an empty office burns an address that would have replied in January.`],
  ]);

approval();
d.build().then(() => {
  console.log("\nTHE NUMBERS IN THE DOCUMENT");
  console.log("  Block A                  ", dmy(START), "->", dmy(BLOCK_A_END), `(${WEEKS_A} weeks)`);
  console.log("  shutdown                 ", dmy(SHUT_FROM), "->", dmy(SHUT_TO), `(${SHUT_DAYS} days)`);
  console.log("  Block B                  ", dmy(JAN_START), "->", dmy(LAST_DAY), `(${WEEKS_B} week)`);
  console.log("  working time             ", WEEKS, "weeks across", SPAN_DAYS, "calendar days");
  console.log("  the wall                 ", dmy(WALL), `(end of week ${LEAD_WEEKS + 1})`);
  console.log("  convertible              ", CONVERTIBLE_RAW, "sent,", CONVERTIBLE.toFixed(1), "effective");
  console.log("  confidence               ", pc(pPlan, 1), " (Block A alone:", pc(pRev4, 1) + ")");
  console.log("  needed for 80%           ", N80, "— shortfall", shortfall);
  console.log("  reply rate that closes it", pc(replyNeeded, 1));
  console.log("  total sent               ", TOTAL_SENT, `(${PIPELINE} of them Q1's)`);
  console.log("  OBJECTIVE                ", money(CONTRACTED), "contracted,", money(INVOICED), "invoiced,", money(LTV), "in play");
}).catch((err) => { console.error(err); process.exit(1); });
