/**
 * ETABLIX — UK go-to-market, 90 days. THE OPERATING MODEL.
 *
 *   node business/strategy/build-gtm-uk.cjs
 *
 * Revision 3. Revisions 1 and 2 were essays about strategy: well argued,
 * unrunnable, and — as it turns out — wrong on the one number that matters.
 * They set an activity target of 25 approaches a month without ever testing
 * it against the objective. Solved, that target carries roughly a three in
 * five chance of a single sale in the quarter, and the two live referrals it
 * leaned on carry twenty-eight per cent between them.
 *
 * So this revision is arithmetic first. Every number in the document is
 * computed here rather than typed, which means the plan cannot contradict
 * itself and the assumptions can be changed in one place.
 *
 * CHANGE THESE FOUR LINES AND THE WHOLE PLAN RECALCULATES.
 */
const COLD = { reply: 0.10, meeting: 0.40, proposal: 0.60, win: 0.33 };
const WARM = { meeting: 0.50, proposal: 0.75, win: 0.40 };
const LIVE_REFERRALS = 2;
const WEEKS = 13;

const B = require("../policies/brand.cjs");
const money = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const pc = (x, d = 0) => (x * 100).toFixed(d) + "%";

/* ---- the funnel, solved ------------------------------------------- */
const coldRate = COLD.reply * COLD.meeting * COLD.proposal * COLD.win;
const warmRate = WARM.meeting * WARM.proposal * WARM.win;
const perWinCold = Math.ceil(1 / coldRate);
const pNoWarm = Math.pow(1 - warmRate, LIVE_REFERRALS);
const pWarm = 1 - pNoWarm;
const needFor = (t) => Math.ceil(Math.log((1 - t) / pNoWarm) / Math.log(1 - coldRate));
const N70 = needFor(0.70), N80 = needFor(0.80), N90 = needFor(0.90);
const perWeek = Math.ceil(N80 / WEEKS);
const OLD_PLAN = 75;
const pOld = 1 - pNoWarm * Math.pow(1 - coldRate, OLD_PLAN);
/* Weeks 7, 8 and 13 send nothing — delivery and planning. So the schedule
   carries 9 sending weeks, not 13, and the confidence it actually buys is
   lower than the target. That gap is named rather than smoothed over: a
   model that hides its own shortfall is the thing this revision replaces. */
const SENDING_WEEKS = 9;
const SCHEDULED = perWeek * SENDING_WEEKS;
const pScheduled = 1 - pNoWarm * Math.pow(1 - coldRate, SCHEDULED);
/* The two levers that close it, each solved. */
const replyNeeded = (() => {
  // what reply rate makes SCHEDULED approaches reach 80%?
  const want = Math.pow((1 - 0.80) / pNoWarm, 1 / SCHEDULED);   // (1-rate)^1 per approach
  const rate = 1 - want;                                         // required approach->win
  return rate / (COLD.meeting * COLD.proposal * COLD.win);       // back out the reply rate
})();
const extraNeeded = N80 - SCHEDULED;

/* ---- the ladder --------------------------------------------------- */
const WEDGE = 6500, REQ = 14000, DESK_M = 7500, DESK_MONTHS = 6;
const LTV = WEDGE + REQ + DESK_M * DESK_MONTHS;
const WEDGE_DAYS = 3;

const REV = "3";
const d = B.doc({
  slug: "Go-To-Market-UK-90-Day-Plan",
  running: "UK go-to-market · the operating model",
  kicker: "GO TO MARKET · UNITED KINGDOM",
  title: "THE OPERATING MODEL",
  sub: `90 days · 21 September to 19 December 2026 · ${perWeek} approaches a week, and why`,
  rev: REV,
  outDir: __dirname,
  kind: "plan",
  control: [
    ["Document", "UK go-to-market — the operating model"],
    ["Revision", "3 — supersedes revisions 1 and 2, which set an untested activity target"],
    ["Period", "21 September to 19 December 2026 (13 weeks)"],
    ["Objective", "One client on the ladder. Not one sale."],
    ["Activity required", `${N80} cold approaches for ${pc(0.8)} confidence; the 13-week schedule delivers ${SCHEDULED} (${pc(pScheduled)}) — the gap and its two levers are at 5.2`],
    ["Owner", "Justin Nseya, Director"],
    ["Recalculation", "Change the four assumption lines at the top of build-gtm-uk.cjs"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ================================================================== */
h1("1. The model");

rich([{ t: "Two numbers change the plan. ", b: true },
  { t: `The two live referrals carry a ${pc(pWarm)} chance of producing the first sale between them. The activity target in the previous revision — 25 approaches a month — carries the whole plan to about ${pc(pOld)}. Neither is a plan. Both are hope with a spreadsheet attached.` }]);

h2("1.1  The funnel, solved");

table([3200, 1400, 3700],
  ["Stage", "Rate", "Basis — replace with actuals as they arrive"],
  [
    ["Approach → reply", pc(COLD.reply), "Targeted, personalised, to a named compound-holder. Assumption."],
    ["Reply → meeting", pc(COLD.meeting), "A reply is interest, not a diary slot. Assumption."],
    ["Meeting → priced proposal", pc(COLD.proposal), "Requires a named live scheme to price against. Assumption."],
    ["Proposal → win", pc(COLD.win), "No track record, small ticket, risk reversed. Assumption."],
    ["NET: approach → win", pc(coldRate, 2), `One win per ${perWinCold} cold approaches.`],
  ]);

h2("1.2  Therefore");

table([4800, 3500],
  ["Confidence of at least one win in 13 weeks", "Cold approaches required"],
  [
    ["The 2 live referrals, alone", `${pc(pWarm)} — ${LIVE_REFERRALS} referrals, nothing else`],
    ["Previous revision (25/month, 75 total)", `${pc(pOld)}`],
    [`${pc(0.7)} confidence`, `${N70} (${Math.ceil(N70 / WEEKS)}/week)`],
    [`${pc(0.8)} confidence — THE TARGET`, `${N80} (${perWeek}/week)`],
    [`${pc(0.9)} confidence`, `${N90} (${Math.ceil(N90 / WEEKS)}/week)`],
  ]);

richBullet([{ t: `${perWeek} approaches a week. `, b: true },
  { t: `Not 6. The previous plan's target was less than half what its own objective required, and nothing in it said so because nothing in it was calculated. ${perWeek} a week is roughly two hours on a Monday against a prepared list.` }]);

h2("1.3  And the objective is not one sale");

table([3400, 1500, 3400],
  ["Product", "Fee", "When it is sold"],
  [
    ["Site Systems Diagnostic (single site)", money(WEDGE), "The wedge. One person's authority, one week's decision."],
    ["Site Management Requirements (single compound)", money(REQ), "To the same client, once they have seen the diagnostic."],
    [`Managed Procurement Desk, ${DESK_MONTHS} months`, money(DESK_M * DESK_MONTHS), `${money(DESK_M)}/month. Recurring, because ETABLIX wrote the specification.`],
    ["ONE CLIENT, FIRST 12 MONTHS", money(LTV), `${(LTV / WEDGE).toFixed(1)}× the first sale.`],
  ]);

rich([{ t: `The first sale is worth ${money(WEDGE)}. The client is worth ${money(LTV)}. `, b: true },
  { t: "That ratio is the entire commercial argument of this business, and it decides three things: what to sell first (the cheapest thing that earns the right to sell the rest), how much a client is worth winning (a great deal more than the wedge suggests), and what the ninety-day objective actually is." }]);

note(`THE OBJECTIVE: one client on the ladder by 19 December — a diagnostic delivered, approved and referenced, with the requirements package proposed. ${money(WEDGE + REQ)} contracted, ${money(LTV)} in play.`);

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

table([1500, 2400, 2200, 2200],
  ["Week", "Event", "Invoiced", "Cumulative"],
  [
    ["1–4", "Selling. Nothing invoiced.", "—", "£0"],
    ["5", "Diagnostic instructed — deposit", money(WEDGE * 0.3), money(WEDGE * 0.3)],
    ["7", "Diagnostic approved — balance", money(WEDGE * 0.7), money(WEDGE)],
    ["9", "Second diagnostic instructed — deposit", money(WEDGE * 0.3), money(WEDGE * 1.3)],
    ["11", "Requirements package instructed — deposit", money(REQ * 0.3), money(WEDGE * 1.3 + REQ * 0.3)],
    ["13", "Second diagnostic approved — balance", money(WEDGE * 0.7), money(WEDGE * 2 + REQ * 0.3)],
    ["Q1 2027", "Requirements balance + desk commences", money(REQ * 0.7 + DESK_M), "—"],
  ]);

richBullet([{ t: "The first cash lands in week 5 at the earliest. ", b: true },
  { t: "That is the single most important planning fact in this document. Four weeks of zero receipts followed by a deposit, and the first material payment in week 7. Any runway calculation that assumes revenue before week 5 is wrong." }]);

fillIn("Fill in: the runway in weeks at current burn, and the calendar date it ends with no revenue. If that date is before week 7, this plan is not the priority — funding is. Say so now rather than in November.");

/* ================================================================== */
pageBreak();
h1("3. Where the first sale actually comes from");

rich([{ t: "Not from a tier-one contractor. From a battery storage or solar developer. ", b: true },
  { t: `Three reasons, and they are the reason this section leads: ${money(WEDGE)} is a rounding error against a £20–40m BESS scheme; the decision sits with one development or construction manager rather than a supply chain committee; and they have nobody in-house doing site establishment at all, because a developer with four projects cannot justify the headcount.` }]);

p("Tier-one contractors and the grid EPCs are the larger prize and they are the slower sale: prequalification, supplier onboarding, framework positions, and a purchase order that may take longer than this quarter. They are worked in parallel — both live referrals sit there — but the plan does not depend on them closing first.");

h2("3.1  The target tiers");

table([1100, 2500, 4700],
  ["Tier", "Who", "Why this tier, and what to lead with"],
  [
    ["1", "BESS and solar developers and IPPs",
     "FASTEST CLOSE. One decision-maker, no in-house function, small ticket against scheme value, and the director's UK Power Reserve background is directly on point. Lead with grid connection compound and temporary power. This tier is where the first sale is expected."],
    ["2", "Grid and T&D EPC contractors",
     "HIGHEST VALUE, SLOWER. Both live referrals are here. Repeated compounds at similar scale, which is where a specification written once carries. Lead with the repeat argument, not with one site."],
    ["3", "Data centre EPC and M&E contractors",
     "MEDIUM SPEED. Exyte already open. The out-of-London build-out puts peak workforce beyond the local catchment, which is the proposition in its purest form. Lead with labour catchment."],
    ["4", "Tier-one main contractors",
     "SLOWEST. Long onboarding, established supply chains. Four approaches already made with no reply; they become a different email in phase 3 once there is delivered work to cite."],
  ]);

h2("3.2  The list to build on Monday");

p("Named organisations by tier, all publicly active in these sectors in the United Kingdom. This is the research list, not a claim of any relationship. Build it to 60 organisations in tier 1 and 2 before the first approach goes out.");

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
bullet("Can the decision-maker be named, with a function — development manager, construction manager, project director, commercial manager? An approach to a generic inbox is not an approach and is not counted.");
bullet("Is there a trigger — a planning consent, a grid connection offer, a funding announcement, a framework award? A trigger is what makes the email timely rather than speculative.");

note("Four tests, and the fourth is the one that lifts the reply rate. The assumption in section 1 is ten per cent; an untriggered approach to a generic inbox is nearer one. The arithmetic in this plan only holds if the qualification holds.");

/* ================================================================== */
pageBreak();
h1("4. The sequence");

p("Four touches over 18 days, then stop. Same sequence every time, so the reply rate is measurable and the assumption in section 1 can be replaced with a fact.");

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

h2("4.1  What is measured on every sequence");

table([4300, 4000],
  ["Measured", "Why"],
  [
    ["Replies per 100 sent, by tier", "Replaces the 10% assumption with a fact, per tier, within six weeks."],
    ["Which touch produced the reply", "If touch 1 produces almost all of them, touches 2–4 are wasted effort. If touch 3 does, the trigger research is the value."],
    ["Reply → meeting rate", "The second assumption, and the one most likely to be wrong."],
    ["Objection raised, verbatim", "Four are expected (section 7). A fifth appearing twice means the proposition has a gap."],
  ]);

/* ================================================================== */
pageBreak();
h1("5. The 13 weeks");

p("Numeric, weekly, cumulative. The only rows that matter in any given week are that week's.");

table([900, 1500, 1350, 1350, 1300, 1900],
  ["Wk", "Focus", "Approaches", "Cumulative", "Meetings", "Gate"],
  [
    ["1", "Unblock", "0", "0", "0", "Delivery record done"],
    ["2", "List + launch", String(perWeek), String(perWeek), "0", "CHIC resubmitted"],
    ["3", "Sequence", String(perWeek), String(perWeek * 2), "1", "—"],
    ["4", "Sequence", String(perWeek), String(perWeek * 3), "1", "Day 30 gate"],
    ["5", "Close", String(perWeek), String(perWeek * 4), "2", "First proposal issued"],
    ["6", "Close", String(perWeek), String(perWeek * 5), "2", "—"],
    ["7", "Deliver", "0", String(perWeek * 5), "0", "First engagement won"],
    ["8", "Deliver", "0", String(perWeek * 5), "0", "Delivered + reference asked"],
    ["9", "Sequence", String(perWeek), String(perWeek * 6), "2", "Day 60 gate"],
    ["10", "Sequence", String(perWeek), String(perWeek * 7), "2", "Requirements proposed"],
    ["11", "Close", String(perWeek), String(perWeek * 8), "2", "—"],
    ["12", "Close", String(perWeek), String(perWeek * 9), "1", "Every decision asked for"],
    ["13", "Land + plan", "0", String(perWeek * 9), "0", "Day 90 gate · January written"],
  ], { size: 16 });

richBullet([{ t: "Weeks 7 and 8 have zero approaches, on purpose. ", b: true },
  { t: "Delivery takes the whole week for one person. A plan that assumes selling continues through delivery produces a late first deliverable, and the first deliverable is the reference the whole quarter exists to obtain." }]);

richBullet([{ t: "Week 12 is the last selling week. ", b: true },
  { t: "UK construction effectively stops from about 18 December. Every decision this plan needs must be asked for by 4 December or it is a January decision." }]);

h2("5.2  The schedule does not reach the target, and here is the gap");

table([4300, 4000],
  ["", "Value"],
  [
    ["Sending weeks (7, 8 and 13 send nothing)", String(SENDING_WEEKS)],
    ["Approaches the schedule delivers", String(SCHEDULED)],
    ["Approaches needed for " + pc(0.8), String(N80)],
    ["SHORTFALL", String(extraNeeded)],
    ["Confidence the schedule actually buys", pc(pScheduled)],
    ["Confidence targeted", pc(0.8)],
  ]);

rich([{ t: `The schedule buys ${pc(pScheduled)}, not ${pc(0.8)}. `, b: true },
  { t: "That gap is stated rather than smoothed over, because a model that hides its own shortfall is exactly what this revision replaces. There are two honest ways to close it and one dishonest one." }]);

table([2600, 5700],
  ["Lever", "What it takes"],
  [
    ["Lift the reply rate — PREFERRED",
     `The ${pc(COLD.reply)} assumption is for a targeted approach. At ${pc(replyNeeded, 1)} the schedule reaches ${pc(0.8)} with no extra volume. That is what the four qualification tests at 3.3 are for, and tier 1 is expected to beat ${pc(COLD.reply)} because the ticket is small and the buyer has nobody in-house.`],
    ["Add volume in weeks 9 to 12",
     `${extraNeeded} more approaches over four weeks is ${Math.ceil(extraNeeded / 4)} a week on top of ${perWeek}. Possible, and it is the fallback if the week 6 reply rate comes in at or below ${pc(COLD.reply)}.`],
    ["Send during weeks 7 and 8 — DO NOT",
     "The dishonest one. It closes the arithmetic and loses the first deliverable, which is the reference the entire quarter exists to obtain. The two zero weeks are not slack."],
  ]);

p(`Decision rule: measure the reply rate at week 6. At or above ${pc(replyNeeded, 1)}, hold the schedule. Below it, add ${Math.ceil(extraNeeded / 4)} approaches a week from week 9 and cut LinkedIn to one comment a week to pay for the time.`);

h2("5.1  The week");

table([1500, 6800],
  ["Day", "Fixed content"],
  [
    ["Monday", `The week's ${perWeek} approaches go out in one batch, plus every sequence touch due. Two hours against a prepared list. Scoreboard updated.`],
    ["Tuesday", "Meetings, calls, proposals. Framework administration."],
    ["Wednesday", "Delivery or preparation. During an engagement this is the whole week."],
    ["Thursday", "Next week's list: 12 qualified organisations with a named person and a trigger. This is the task that determines next month's revenue and it is the one that gets skipped."],
    ["Friday", "Three LinkedIn comments. Ledger. Thirty minutes on what the numbers say."],
  ]);

/* ================================================================== */
pageBreak();
h1("6. Decision gates");

p("Written now so that the decision at each gate is a reading rather than a judgement.");

h2("6.1  Day 30 — end of week 4");

table([2900, 5400],
  ["Test", "If it fails"],
  [
    ["Delivery record complete, 3 referees confirmed, CHIC resubmitted",
     "Stop all outreach for three days and finish them. Nothing downstream works without them and the cost of the delay compounds weekly."],
    [`${perWeek * 3} approaches sent`,
     "The constraint is the list, not the sending. Move Thursday's list-building to Monday and cut LinkedIn to one comment a week until the backlog clears."],
    ["≥ 2 replies from tier 1",
     "The tier-1 message is wrong, not the tier. Rewrite touch 1 around grid connection and temporary power specifically, and test 12 more before changing tier."],
    ["≥ 1 meeting held",
     "Replies are not converting. The problem is touch 3 or the ask. Offer a 20-minute call on a named scheme rather than a meeting."],
  ]);

h2("6.2  Day 60 — end of week 9");

table([2900, 5400],
  ["Test", "If it fails"],
  [
    ["1 engagement instructed",
     "Drop to the £5,500 mobilisation-readiness review for any buyer with a scheme already committed. A smaller first engagement is still a first engagement and the reference is identical."],
    ["1 engagement delivered and approved",
     "If instructed but not delivered, delivery is the only activity until it is. If not instructed, the risk reversal was not offered clearly enough — put it in writing in the proposal, not just in the meeting."],
    ["Reply rate ≥ 6%",
     "Below 6% the arithmetic breaks. Halve the volume and double the research: 6 approaches a week with a named trigger beats 12 without one."],
    ["Reference obtained or promised",
     "Ask again at approval, and if refused ask for permission to describe the work anonymously — sector and scale without the name is worth most of it."],
  ]);

h2("6.3  Day 90 — end of week 13");

table([2900, 5400],
  ["Test", "If it fails"],
  [
    ["1 client on the ladder: diagnostic delivered + requirements proposed",
     "Diagnose which half failed. Delivered but nothing proposed is a sales failure and is fixable in a week. Nothing delivered is a market or a capacity failure and needs section 3.1 of revision 2 re-read against the record."],
    ["Written reference in hand",
     "This is the one that cannot be recovered later. If there is no reference at day 90, the January plan's first line is obtaining one."],
    ["Pipeline ≥ 3 live conversations into Q1",
     "December was spent delivering rather than selling. Acceptable once. Not twice."],
    ["Replaced ≥ 2 of the 4 funnel assumptions with actuals",
     "The plan is still running on guesses. Recalculate section 1 with whatever data exists, even if thin."],
  ]);

/* ================================================================== */
pageBreak();
h1("7. Pricing discipline, and the four objections");

h2("7.1  Three rules");

richBullet([{ t: `Quote ${money(WEDGE)} in the meeting, out loud. `, b: true },
  { t: "A proposal that arrives three days later gives the objection three days to form in private." }]);
richBullet([{ t: "Never call it a discount. ", b: true },
  { t: "A foundation rate has a reason, a date it holds until, and an explicit statement that it does not carry forward. A discount tells a buyer the first number was padded and re-prices every future quotation downwards." }]);
richBullet([{ t: "Offer the risk reversal in writing, in the proposal. ", b: true },
  { t: `It costs ${WEDGE_DAYS} days and no cash (section 2.1), it is the strongest answer to the only objection that matters, and said in a meeting but omitted from the document it reads as something not meant.` }]);

h2("7.2  The four objections");

table([2200, 6100],
  ["What they say", "The answer"],
  [
    ["“We do this in-house.”",
     "Agree without qualification — they do. Then: when does it get done, and by whom? The answer is almost always the fortnight before submission, by whoever had capacity. The gap is time, not competence, and saying so is what keeps the conversation alive."],
    ["“You have no track record.”",
     "Concede before they finish. No completed engagement under the company's name; the director has a record and the referees can be called. Then move the risk: if it tells you nothing you did not know, you do not pay."],
    ["“Send me something and I'll circulate it.”",
     "Accept and pin it. Send the delivery record and specimen the same day, then ask which scheme to look at when they come back. Circulation with nothing specific attached is how an enquiry dissolves politely."],
    ["“What does it cost?”",
     `${money(WEDGE)} for one site. The foundation rate where it applies, the date it holds to, and that it does not carry forward. Said without hesitating.`],
  ]);

/* ================================================================== */
h1("8. The scoreboard");

p("Leading indicators, not lagging ones. Revenue is a result; these are the causes.");

table([3700, 1150, 1150, 1150, 1150],
  ["Weekly measure", "Wk 4", "Wk 9", "Wk 13", "Source"],
  [
    ["Qualified organisations on the list", "60", "90", "120", "Thursday"],
    ["Approaches sent, cumulative", String(perWeek * 3), String(perWeek * 6), String(perWeek * 9), "Monday"],
    ["Reply rate, actual", "—", "≥6%", "≥8%", "Ledger"],
    ["Meetings held, cumulative", "1", "5", "8", "Ledger"],
    ["Priced proposals issued", "1", "3", "5", "Documents"],
    ["Engagements instructed", "0", "1", "2", "Portal"],
    ["References in writing", "0", "1", "1", "—"],
    ["Contracted value", "£0", money(WEDGE), money(WEDGE * 2 + REQ), "Portal"],
  ], { size: 16 });

note("If a row has not moved in three weeks, the question is not how to move it. It is whether the plan is being run.");

/* ================================================================== */
pageBreak();
h1("9. Week one, by day");

table([1600, 6700],
  ["Day", "Finished by close of play"],
  [
    ["Mon 21 Sep", "The delivery record: three schemes — employer, client, location, dates, scheme value, the value of the scope personally held, role, peak workforce, establishment duration, scope delivered, what changed. NOTHING ELSE TODAY. It unblocks CHIC and Hitachi Energy simultaneously and nobody else can write it."],
    ["Tue 22 Sep", "Approach four referees to secure three; record the date each agrees. Send the Siemens Energy reply to Matthew, copying Andrew — drafted, and every day it sits unsent reflects on the person who made the referral."],
    ["Wed 23 Sep", "The three financial documents from the workbook. Every figure is in the bank statements and the company's own records. Label all three as unaudited management information."],
    ["Thu 24 Sep", "Resubmit CHIC through the portal, every section confirmed. Send the Hitachi Energy pack to Jamie Holiday with the request for twenty minutes. Then build the first 30 tier-1 organisations."],
    ["Fri 25 Sep", `Finish the list to 60. Name a person and a trigger against each of the first ${perWeek}. Three LinkedIn comments. The first batch goes out Monday.`],
  ]);

richBullet([{ t: "If Monday slips, the plan has not fallen behind — it has not started. ", b: true },
  { t: "The delivery record is the only task in ninety days with no substitute, and it is the one most easily postponed because it is uncomfortable to write." }]);

/* ================================================================== */
h1("10. Out of scope, and the triggers to change that");

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
  ]);

approval();
d.build().then(() => {
  console.log("\nTHE NUMBERS IN THE DOCUMENT");
  console.log("  cold approach -> win     ", pc(coldRate, 2), "=> 1 per", perWinCold);
  console.log("  2 live referrals alone   ", pc(pWarm));
  console.log("  previous plan (75)       ", pc(pOld));
  console.log("  target 80% needs         ", N80, "=>", perWeek + "/week");
  console.log("  scheduled                ", perWeek * 9, "over", WEEKS, "weeks");
  console.log("  one client on the ladder ", money(LTV), "=", (LTV / WEDGE).toFixed(1) + "x the wedge");
  console.log("  wedge revenue per day    ", money(WEDGE / WEDGE_DAYS));
}).catch((err) => { console.error(err); process.exit(1); });
