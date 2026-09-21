/**
 * ETABLIX — UK go-to-market. THE OPERATING MODEL.
 *
 *   node business/strategy/build-gtm-uk.cjs
 *
 * Revision 4. Starts Monday 28 September 2026 and ends Friday 18 December.
 *
 * WHAT CHANGED FROM REVISION 3, AND WHY IT IS NOT A DATE CHANGE.
 *
 * Rev 3 ran 21 September to 19 December — thirteen weeks. Moving the start
 * to 28 September does not slide the end date, because the end date is not
 * a choice. UK construction stops around 18 December and does not restart
 * until January. So the quarter is twelve weeks, not thirteen. A week is
 * gone and the plan says so rather than compressing thirteen weeks of
 * activity into twelve and calling it the same plan.
 *
 * The shorter window also exposed a defect rev 3 carried without noticing.
 * It counted every approach sent in weeks 1 to 12 towards the probability
 * of a win inside the quarter. A cold approach cannot do that. The sequence
 * alone is eighteen days; then a meeting, then a priced proposal, then a
 * decision. Six weeks from send to signature, centrally. An approach sent
 * in week 10 is Q1 pipeline, and counting it towards this quarter's
 * confidence inflates the number.
 *
 * So this revision splits the two. Approaches that can decide inside the
 * quarter are the ones sent in weeks 1 to 6. Everything after week 6 is
 * next quarter's pipeline, counted separately and honestly.
 *
 * That single correction is what reshapes the plan. It means the quarter is
 * decided by 6 November, it means the volume has to be front-loaded rather
 * than spread, and it means the week before the start — 21 to 25 September —
 * is not slack. It is the week that lets week 1 sell from Monday morning
 * instead of spending itself on unblocking.
 *
 * CHANGE THESE LINES AND THE WHOLE PLAN RECALCULATES.
 */
const COLD = { reply: 0.10, meeting: 0.40, proposal: 0.60, win: 0.33 };
const WARM = { meeting: 0.50, proposal: 0.75, win: 0.40 };
const LIVE_REFERRALS = 2;
const WEEKS = 12;          // 28 September to 18 December
const LEAD_WEEKS = 6;      // cold send -> decision, centrally
const SPRINT = 20;         // approaches a week, weeks 1-6. The whole plan.
const DELIVERY_RATE = 6;   // weeks 7-8, from the list already built
const BASE = 10;           // weeks 9-11, Q1 pipeline

const B = require("../policies/brand.cjs");
const money = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const pc = (x, d = 0) => (x * 100).toFixed(d) + "%";

/* ---- the calendar, computed ---------------------------------------- */
const MON = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const START = new Date(Date.UTC(2026, 8, 28));          // Monday 28 September 2026
const PREP = new Date(Date.UTC(2026, 8, 21));           // Monday 21 September 2026
const addDays = (dt, n) => new Date(dt.getTime() + n * 86400000);
const dm = (dt) => `${dt.getUTCDate()} ${MON[dt.getUTCMonth()].slice(0, 3)}`;
const dmy = (dt) => `${dt.getUTCDate()} ${MON[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
const wkStart = (w) => addDays(START, (w - 1) * 7);
const wkEnd = (w) => addDays(wkStart(w), 4);
const wk = (w) => `${dm(wkStart(w))}–${dm(wkEnd(w))}`;
const LAST_DAY = wkEnd(WEEKS);
const WALL = wkEnd(LEAD_WEEKS);                          // after this, nothing closes in-quarter
const ASK_BY = wkEnd(WEEKS - 1);                         // last day to ask for a decision

/* ---- the funnel, solved -------------------------------------------- */
const coldRate = COLD.reply * COLD.meeting * COLD.proposal * COLD.win;
const warmRate = WARM.meeting * WARM.proposal * WARM.win;
const perWinCold = Math.ceil(1 / coldRate);
const pNoWarm = Math.pow(1 - warmRate, LIVE_REFERRALS);
const pWarm = 1 - pNoWarm;
const needFor = (t) => Math.ceil(Math.log((1 - t) / pNoWarm) / Math.log(1 - coldRate));
const confOf = (n) => 1 - pNoWarm * Math.pow(1 - coldRate, n);
const N70 = needFor(0.70), N80 = needFor(0.80), N90 = needFor(0.90);

/* The split that rev 3 did not make. */
const CONVERTIBLE = SPRINT * LEAD_WEEKS;                 // can decide before 18 December
const PIPELINE = DELIVERY_RATE * 2 + BASE * 3;           // weeks 7-11: Q1, not this quarter
const TOTAL_SENT = CONVERTIBLE + PIPELINE;
const pSprint = confOf(CONVERTIBLE);
const shortfall = N80 - CONVERTIBLE;
const replyNeeded = (() => {
  const want = Math.pow((1 - 0.80) / pNoWarm, 1 / CONVERTIBLE);
  return (1 - want) / (COLD.meeting * COLD.proposal * COLD.win);
})();
/* What rev 3 believed it was buying, on its own numbers, for comparison. */
const REV3_SCHEDULED = 117;
const pRev3 = confOf(REV3_SCHEDULED);

/* ---- the ladder ----------------------------------------------------- */
const WEDGE = 6500, REQ = 14000, DESK_M = 7500, DESK_MONTHS = 6;
const LTV = WEDGE + REQ + DESK_M * DESK_MONTHS;
const WEDGE_DAYS = 3;

const REV = "4";
const d = B.doc({
  slug: "Go-To-Market-UK-12-Week-Plan",
  running: "UK go-to-market · the operating model",
  kicker: "GO TO MARKET · UNITED KINGDOM",
  title: "THE OPERATING MODEL",
  sub: `12 weeks · ${dmy(START)} to ${dmy(LAST_DAY)} · ${SPRINT} approaches a week for six weeks, and why`,
  rev: REV,
  outDir: __dirname,
  kind: "plan",
  control: [
    ["Document", "UK go-to-market — the operating model"],
    ["Revision", "4 — supersedes revision 3 (ETABLIX-Go-To-Market-UK-90-Day-Plan), which ran thirteen weeks and counted approaches that could not decide inside them"],
    ["Period", `${dmy(START)} to ${dmy(LAST_DAY)} — twelve weeks, not thirteen. Christmas takes the thirteenth.`],
    ["Preparation week", `${dmy(PREP)} to ${dm(addDays(PREP, 4))} — before the plan starts. Section 9.`],
    ["Objective", "One client on the ladder. Not one sale."],
    ["The wall", `${dmy(WALL)} — after this date no new cold approach can decide inside the quarter. Section 1.4.`],
    ["Activity required", `${CONVERTIBLE} approaches in weeks 1–6 (${SPRINT}/week) for ${pc(pSprint)} confidence. ${N80} would be needed for ${pc(0.8)}; the gap and its two levers are at 5.2`],
    ["Owner", "Justin Nseya, Director"],
    ["Recalculation", "Change the assumption lines at the top of build-gtm-uk.cjs"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ================================================================== */
h1("1. The model");

rich([{ t: "This quarter is twelve weeks and it is decided in the first six. ", b: true },
  { t: `Both halves of that sentence are arithmetic, not emphasis. Twelve because UK construction stops around 18 December and the thirteenth week would be Christmas. Six because a cold approach takes about ${LEAD_WEEKS} weeks to reach a decision, so anything sent after ${dmy(WALL)} is next quarter's pipeline however good it is.` }]);

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

h2("1.2  The lead time, and why it reshapes everything");

table([2600, 1300, 4400],
  ["Step", "Elapsed", "Why it takes that long"],
  [
    ["Send → last touch", "18 days", "The four-touch sequence at section 4. Fixed, deliberate, not compressible without lowering the reply rate."],
    ["Last touch → meeting held", "~1 week", "A diary slot with a construction or development manager is rarely the same week."],
    ["Meeting → priced proposal", "~1 week", "Requires a named scheme, a scope and a fee. Same week is possible; assume it is not."],
    ["Proposal → decision", "1–2 weeks", `${money(WEDGE)} sits inside one person's authority. That is why it is the wedge. It still is not instant.`],
    ["TOTAL, cold send to signature", `~${LEAD_WEEKS} weeks`, `Therefore the last cold approach that can decide in this quarter goes out in week ${LEAD_WEEKS}, ending ${dmy(WALL)}.`],
  ]);

note(`REVISION 3 DID NOT MAKE THIS SPLIT. It counted all ${REV3_SCHEDULED} approaches across thirteen weeks towards this quarter's confidence and reported ${pc(pRev3)}. Approaches sent in weeks 10, 11 and 12 cannot decide before Christmas. The number was not wrong arithmetic; it was the wrong population.`);

h2("1.3  Therefore");

table([4800, 3500],
  ["Confidence of at least one win before " + dmy(LAST_DAY), "Approaches needed in weeks 1–6"],
  [
    ["The 2 live referrals, alone", `${pc(pWarm)} — ${LIVE_REFERRALS} referrals, nothing else`],
    [`${pc(0.7)} confidence`, `${N70} (${Math.ceil(N70 / LEAD_WEEKS)}/week)`],
    [`${pc(0.8)} confidence`, `${N80} (${Math.ceil(N80 / LEAD_WEEKS)}/week)`],
    [`${pc(0.9)} confidence`, `${N90} (${Math.ceil(N90 / LEAD_WEEKS)}/week)`],
    [`THE PLAN: ${SPRINT}/week × ${LEAD_WEEKS} weeks = ${CONVERTIBLE}`, `${pc(pSprint)} — chosen, and the gap is named at 5.2`],
  ]);

richBullet([{ t: `${SPRINT} a week for six weeks, then the rate drops. `, b: true },
  { t: `This is a sprint, not a cadence. ${Math.ceil(N80 / LEAD_WEEKS)} a week would buy ${pc(0.8)} and is not sustainable alongside delivery by one person; ${SPRINT} is. The honest position is ${pc(pSprint)} with the levers to close it, not ${pc(0.8)} on paper and ten unsent emails a week in practice.` }]);

h2("1.4  The three dates that govern the quarter");

table([2300, 6000],
  ["Date", "What it is"],
  [
    [dmy(WALL), `THE WALL. End of week ${LEAD_WEEKS}. The last day a cold approach sent can still decide inside the quarter. Volume after this date builds January, not December.`],
    [dmy(ASK_BY), `THE ASK. End of week ${WEEKS - 1}. Every decision this plan needs must have been asked for, explicitly, by close of play. After this it is a January decision whatever anyone says.`],
    [dmy(LAST_DAY), `THE END. End of week ${WEEKS}. Site teams disperse. Nothing is decided in the week that follows.`],
  ]);

h2("1.5  And the objective is not one sale");

table([3400, 1500, 3400],
  ["Product", "Fee", "When it is sold"],
  [
    ["Site Systems Diagnostic (single site)", money(WEDGE), "The wedge. One person's authority, one week's decision."],
    ["Site Management Requirements (single compound)", money(REQ), "To the same client, once they have seen the diagnostic."],
    [`Managed Procurement Desk, ${DESK_MONTHS} months`, money(DESK_M * DESK_MONTHS), `${money(DESK_M)}/month. Recurring, because ETABLIX wrote the specification.`],
    ["ONE CLIENT, FIRST 12 MONTHS", money(LTV), `${(LTV / WEDGE).toFixed(1)}× the first sale.`],
  ]);

rich([{ t: `The first sale is worth ${money(WEDGE)}. The client is worth ${money(LTV)}. `, b: true },
  { t: "That ratio is the entire commercial argument of this business, and it decides three things: what to sell first (the cheapest thing that earns the right to sell the rest), how much a client is worth winning (a great deal more than the wedge suggests), and what the objective of these twelve weeks actually is." }]);

note(`THE OBJECTIVE: one client on the ladder by ${dmy(LAST_DAY)} — a diagnostic delivered, approved and referenced, with the requirements package proposed. ${money(WEDGE + REQ)} contracted, ${money(LTV)} in play.`);

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

table([1100, 1500, 2400, 1650, 1650],
  ["Wk", "Dates", "Event", "Invoiced", "Cumulative"],
  [
    ["1–4", `${dm(wkStart(1))}–${dm(wkEnd(4))}`, "Selling. Nothing invoiced.", "—", "£0"],
    ["5", wk(5), "First diagnostic instructed — deposit", money(WEDGE * 0.3), money(WEDGE * 0.3)],
    ["7–8", `${dm(wkStart(7))}–${dm(wkEnd(8))}`, "Delivered and approved — balance", money(WEDGE * 0.7), money(WEDGE)],
    ["9", wk(9), "Second diagnostic instructed — deposit", money(WEDGE * 0.3), money(WEDGE * 1.3)],
    ["11", wk(11), "Requirements package instructed — deposit", money(REQ * 0.3), money(WEDGE * 1.3 + REQ * 0.3)],
    ["12", wk(12), "Second diagnostic approved — balance", money(WEDGE * 0.7), money(WEDGE * 2 + REQ * 0.3)],
    ["Q1 2027", "January", "Requirements balance + desk commences", money(REQ * 0.7 + DESK_M), "—"],
  ], { size: 16 });

richBullet([{ t: `The first cash lands in week 5 — ${wk(5)} — at the earliest. `, b: true },
  { t: `That is the single most important planning fact in this document. Five weeks of zero receipts from ${dmy(START)}, followed by a deposit, and the first material payment in weeks 7 to 8. Any runway calculation that assumes revenue before ${dm(wkStart(5))} is wrong.` }]);

fillIn(`Fill in: the runway in weeks at current burn, and the calendar date it ends with no revenue. If that date falls before ${dm(wkStart(7))}, this plan is not the priority — funding is. Say so now rather than in November.`);

/* ================================================================== */
pageBreak();
h1("3. Where the first sale actually comes from");

rich([{ t: "Not from a tier-one contractor. From a battery storage or solar developer. ", b: true },
  { t: `Three reasons, and with a six-week decision window they matter more than they did: ${money(WEDGE)} is a rounding error against a £20–40m BESS scheme; the decision sits with one development or construction manager rather than a supply chain committee; and they have nobody in-house doing site establishment at all, because a developer with four projects cannot justify the headcount.` }]);

p(`Tier-one contractors and the grid EPCs are the larger prize and they are the slower sale: prequalification, supplier onboarding, framework positions, and a purchase order that may take longer than this quarter. They are worked in parallel — both live referrals sit there — but nothing in this plan depends on them closing before ${dm(LAST_DAY)}.`);

h2("3.1  The target tiers");

table([1100, 2500, 4700],
  ["Tier", "Who", "Why this tier, and what to lead with"],
  [
    ["1", "BESS and solar developers and IPPs",
     `FASTEST CLOSE — and speed is now the selection criterion. One decision-maker, no in-house function, small ticket against scheme value, and the director's UK Power Reserve background is directly on point. Lead with grid connection compound and temporary power. This tier should be the majority of the ${CONVERTIBLE} sprint approaches.`],
    ["2", "Grid and T&D EPC contractors",
     "HIGHEST VALUE, SLOWER. Both live referrals are here. Repeated compounds at similar scale, which is where a specification written once carries. Lead with the repeat argument, not with one site."],
    ["3", "Data centre EPC and M&E contractors",
     "MEDIUM SPEED. Exyte already open. The out-of-London build-out puts peak workforce beyond the local catchment, which is the proposition in its purest form. Lead with labour catchment."],
    ["4", "Tier-one main contractors",
     "TOO SLOW FOR THIS QUARTER. Long onboarding, established supply chains. Four approaches already made with no reply. They are a January conversation with delivered work to cite, and they belong in the weeks 9–11 pipeline batch, not the sprint."],
  ]);

h2("3.2  The list, built this week");

p(`Named organisations by tier, all publicly active in these sectors in the United Kingdom. This is the research list, not a claim of any relationship. The sprint needs ${SPRINT} qualified organisations a week for six weeks, so the list has to reach ${SPRINT * 3} before ${dmy(START)} and keep growing after it. Building it is the whole job of the preparation week at section 9.`);

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
bullet("Can the decision-maker be named, with a function — development manager, construction manager, project director, commercial manager? An approach to a generic inbox is not an approach and is not counted towards the " + CONVERTIBLE + ".");
bullet("Is there a trigger — a planning consent, a grid connection offer, a funding announcement, a framework award? A trigger is what makes the email timely rather than speculative.");

note(`Four tests, and the fourth is the one that lifts the reply rate. The assumption in section 1 is ${pc(COLD.reply)}; an untriggered approach to a generic inbox is nearer one. At ${SPRINT} a week the temptation to skip the fourth test is the single largest risk to this plan, because volume without triggers is indistinguishable from volume with them right up until the reply rate is measured in week 4.`);

/* ================================================================== */
pageBreak();
h1("4. The sequence");

p(`Four touches over 18 days, then stop. Same sequence every time, so the reply rate is measurable and the assumption in section 1 can be replaced with a fact. At ${SPRINT} sends a week the sequence carries roughly ${SPRINT * 3} live touches at any moment, which is the real reason it is fixed: a variable sequence at this volume cannot be run by one person or measured by anyone.`);

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
    ["Replies per 100 sent, by tier", `Replaces the ${pc(COLD.reply)} assumption with a fact, per tier, by the end of week 4 — which is before the wall, and that timing is the point.`],
    ["Which touch produced the reply", "If touch 1 produces almost all of them, touches 2–4 are wasted effort at this volume. If touch 3 does, the trigger research is the value and the qualification test pays for itself."],
    ["Reply → meeting rate", "The second assumption, and the one most likely to be wrong."],
    ["Objection raised, verbatim", "Four are expected (section 7). A fifth appearing twice means the proposition has a gap."],
  ]);

/* ================================================================== */
pageBreak();
h1("5. The twelve weeks");

p("Numeric, weekly, cumulative, dated. The only rows that matter in any given week are that week's. The column that matters most is the last one: whether that week's approaches can still decide inside the quarter.");

const rows = [];
let cum = 0, conv = 0;
const plan = [
  [1, "Sprint", SPRINT, "0", "First batch out Monday 09:00"],
  [2, "Sprint", SPRINT, "1", "—"],
  [3, "Sprint", SPRINT, "2", "—"],
  [4, "Sprint", SPRINT, "3", "WEEK 4 GATE · reply rate known"],
  [5, "Sprint + close", SPRINT, "4", "First proposal issued"],
  [6, "Sprint + close", SPRINT, "4", "WEEK 6 GATE · THE WALL"],
  [7, "Deliver", DELIVERY_RATE, "1", "First engagement in delivery"],
  [8, "Deliver", DELIVERY_RATE, "1", "Delivered, approved, reference asked"],
  [9, "Pipeline + close", BASE, "3", "WEEK 9 GATE"],
  [10, "Pipeline + close", BASE, "3", "Requirements proposed"],
  [11, "Close", BASE, "2", `Every decision asked for by ${dm(ASK_BY)}`],
  [12, "Land + plan", 0, "1", "WEEK 12 GATE · January written"],
];
for (const [w, focus, sent, meets, gate] of plan) {
  cum += sent;
  if (w <= LEAD_WEEKS) conv += sent;
  rows.push([String(w), wk(w), focus, String(sent), String(cum),
    w <= LEAD_WEEKS ? "THIS QUARTER" : "Q1 2027", meets, gate]);
}
table([600, 1200, 1300, 800, 800, 1300, 700, 1600],
  ["Wk", "Dates", "Focus", "Sent", "Cum", "Decides in", "Mtgs", "Gate"],
  rows, { size: 15 });

richBullet([{ t: `${CONVERTIBLE} of the ${TOTAL_SENT} approaches this quarter sends can actually decide inside it. `, b: true },
  { t: `The other ${PIPELINE} are January's pipeline and they are worth sending — but they are not this quarter's confidence and they are not counted as such anywhere in this document. That distinction is the whole difference between revision 3 and revision 4.` }]);

richBullet([{ t: "Weeks 7 and 8 drop to " + DELIVERY_RATE + " a week, not to zero. ", b: true },
  { t: `Revision 3 sent nothing in delivery weeks, on the argument that delivery takes the whole week. It does. But the Monday batch is two hours against a list already built, and those sends are Q1 pipeline where nothing is lost by being slow. What stops in weeks 7 and 8 is Thursday's list-building and any new meeting — not the send.` }]);

richBullet([{ t: `Week 11 ends on ${dmy(ASK_BY)}, and that is the last day anything is asked for. `, b: true },
  { t: "Week 12 closes what is open, delivers what is instructed and writes January. It opens nothing. A proposal issued in week 12 is a January proposal that has been made to look urgent, and buyers can tell." }]);

h2("5.1  The sprint does not reach 80%, and here is the gap");

table([4300, 4000],
  ["", "Value"],
  [
    ["Approaches that can decide in-quarter (weeks 1–6)", String(CONVERTIBLE)],
    [`Approaches needed for ${pc(0.8)}`, String(N80)],
    ["SHORTFALL", String(shortfall)],
    ["Confidence the sprint buys", pc(pSprint)],
    ["Confidence targeted", pc(0.8)],
    ["What revision 3 claimed on its own schedule", pc(pRev3) + ` — on ${REV3_SCHEDULED} approaches, most of which could not have decided in time`],
  ]);

rich([{ t: `The sprint buys ${pc(pSprint)}, not ${pc(0.8)}. `, b: true },
  { t: "That gap is stated rather than smoothed over, because a model that hides its own shortfall is exactly what these revisions exist to remove. There are two honest ways to close it and one dishonest one." }]);

table([2600, 5700],
  ["Lever", "What it takes"],
  [
    ["Lift the reply rate — PREFERRED",
     `The ${pc(COLD.reply)} assumption is for a targeted approach. At ${pc(replyNeeded, 1)} the same ${CONVERTIBLE} approaches reach ${pc(0.8)} with no extra volume at all. That is what the four qualification tests at 3.3 buy, and tier 1 is expected to beat ${pc(COLD.reply)} because the ticket is small and the buyer has nobody in-house. This lever costs research time, which is available; the other costs sending time, which is not.`],
    ["Raise the sprint rate to " + Math.ceil(N80 / LEAD_WEEKS) + " a week",
     `${shortfall} more approaches across six weeks is ${Math.ceil(shortfall / LEAD_WEEKS)} a week on top of ${SPRINT}. It reaches ${pc(0.8)} arithmetically. It is the fallback if the week 4 reply rate comes in at or below ${pc(COLD.reply)}, and it has to be paid for: LinkedIn drops to one comment a week and Thursday's list-building moves to Sunday.`],
    ["Send into weeks 7 to 11 and count it — DO NOT",
     `The dishonest one, and the specific error revision 3 made. It closes the arithmetic on paper by counting approaches that cannot decide before ${dm(LAST_DAY)}. The number goes up; the probability of a December sale does not move at all.`],
  ]);

p(`Decision rule, and it is a reading rather than a judgement: measure the reply rate at the end of week 4 — ${dmy(wkEnd(4))}. At or above ${pc(replyNeeded, 1)}, hold the sprint at ${SPRINT}. Below it, go to ${Math.ceil(N80 / LEAD_WEEKS)} a week for weeks 5 and 6 only, and pay for it by cutting LinkedIn and moving list-building to the weekend. There is no third option, because week 6 is the wall.`);

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
h1("6. Decision gates");

p("Written now so that the decision at each gate is a reading rather than a judgement. Four gates, and the second one is the one that cannot be recovered.");

h2(`6.1  Week 4 — ${dmy(wkEnd(4))}`);

table([2900, 5400],
  ["Test", "If it fails"],
  [
    [`${SPRINT * 4} approaches sent`,
     "The constraint is the list, not the sending. Move Thursday's list-building to Sunday and cut LinkedIn to one comment a week until the backlog clears. Two weeks of the sprint remain and they cannot be recovered afterwards."],
    [`Reply rate ≥ ${pc(replyNeeded, 1)}`,
     `Apply the section 5.1 decision rule now, not at week 6. Raise to ${Math.ceil(N80 / LEAD_WEEKS)} a week for weeks 5 and 6, or accept ${pc(pSprint)} knowingly.`],
    ["≥ 3 replies from tier 1",
     "The tier-1 message is wrong, not the tier. Rewrite touch 1 around grid connection and temporary power specifically, and test 20 more before changing tier."],
    ["≥ 2 meetings held",
     "Replies are not converting. The problem is touch 3 or the ask. Offer a 20-minute call on a named scheme rather than a meeting."],
  ]);

h2(`6.2  Week 6 — ${dmy(WALL)} — THE WALL`);

note("This gate is different from the others. It is not a checkpoint; it is a closing door. Whatever has not been sent by this date cannot become December revenue, and no amount of effort in weeks 7 to 12 changes that. Read it honestly on the day.");

table([2900, 5400],
  ["Test", "If it fails"],
  [
    [`${CONVERTIBLE} approaches sent`,
     `Whatever is short is permanently short for this quarter. Do not make it up in week 7 and count it — that is the revision 3 error. Record the actual number, recompute the confidence with it, and tell the truth about what December now looks like.`],
    ["≥ 4 meetings held, ≥ 1 priced proposal issued",
     "If no proposal has been issued by the wall, the quarter is already unlikely and the response is to drop to the £5,500 mobilisation-readiness review for any buyer with a scheme already committed. A smaller first engagement is still a first engagement and the reference is identical."],
    ["1 engagement instructed or in final decision",
     `Escalate the risk reversal into writing on every open proposal the same day. It costs ${WEDGE_DAYS} days and no cash and it is the strongest answer to the only objection that matters.`],
    ["The January pipeline plan exists",
     "From week 7 the sends are Q1's. If nobody has decided what January is for, weeks 7 to 11 will send tier-1 emails out of habit rather than the tier-4 and framework approaches January actually needs."],
  ]);

h2(`6.3  Week 9 — ${dmy(wkEnd(9))}`);

table([2900, 5400],
  ["Test", "If it fails"],
  [
    ["1 engagement delivered and approved",
     "If instructed but not delivered, delivery is the only activity until it is. If not instructed, the risk reversal was not offered clearly enough — put it in writing in the proposal, not just in the meeting."],
    ["Reference obtained or promised",
     "Ask again at approval, and if refused ask for permission to describe the work anonymously — sector and scale without the name is worth most of it."],
    ["Requirements package proposed to the delivered client",
     `This is the ${money(REQ)} step and it is the difference between a sale and a client. It is proposed at approval, while the diagnostic is in front of them, not in January.`],
    ["≥ 2 of the 4 funnel assumptions replaced with actuals",
     "The plan is still running on guesses. Recalculate section 1 with whatever data exists, even if thin."],
  ]);

h2(`6.4  Week 12 — ${dmy(LAST_DAY)}`);

table([2900, 5400],
  ["Test", "If it fails"],
  [
    ["1 client on the ladder: diagnostic delivered + requirements proposed",
     "Diagnose which half failed. Delivered but nothing proposed is a sales failure and is fixable in a week. Nothing delivered is a market or a capacity failure and the record from week 6 will say which."],
    ["Written reference in hand",
     "This is the one that cannot be recovered later. If there is no reference at week 12, January's first line is obtaining one."],
    ["Pipeline ≥ 3 live conversations into Q1",
     `This is what the ${PIPELINE} weeks 7–11 approaches were for. If it is empty, those sends were made without qualification and the January plan starts from nothing.`],
    ["January written before 18 December",
     "Written in the week the site teams are still reachable, not in the first week of January. A quarter that starts with a week of planning has eleven weeks in it."],
  ]);

/* ================================================================== */
pageBreak();
h1("7. Pricing discipline, and the four objections");

h2("7.1  Three rules");

richBullet([{ t: `Quote ${money(WEDGE)} in the meeting, out loud. `, b: true },
  { t: "A proposal that arrives three days later gives the objection three days to form in private — and in a six-week decision window, three days is five per cent of the quarter." }]);
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

p("Leading indicators, not lagging ones. Revenue is a result; these are the causes. The week 6 column is the one to look at hardest, because after it nothing on this board can change December.");

table([3300, 1050, 1050, 1050, 1050, 1050],
  ["Weekly measure", "Wk 4", "Wk 6", "Wk 9", "Wk 12", "Source"],
  [
    ["Qualified organisations on the list", String(SPRINT * 4), String(SPRINT * 6), String(SPRINT * 6 + 30), String(SPRINT * 6 + 60), "Thursday"],
    ["Approaches sent, cumulative", String(SPRINT * 4), String(CONVERTIBLE), String(CONVERTIBLE + DELIVERY_RATE * 2 + BASE), String(TOTAL_SENT), "Monday"],
    ["Of which can decide in-quarter", String(SPRINT * 4), String(CONVERTIBLE), String(CONVERTIBLE), String(CONVERTIBLE), "Monday"],
    ["Reply rate, actual", "≥" + pc(replyNeeded, 0), "≥" + pc(replyNeeded, 0), "—", "—", "Ledger"],
    ["Meetings held, cumulative", "2", "6", "9", "11", "Ledger"],
    ["Priced proposals issued", "1", "2", "4", "5", "Documents"],
    ["Engagements instructed", "0", "1", "1", "2", "Portal"],
    ["References in writing", "0", "0", "1", "1", "—"],
    ["Contracted value", "£0", money(WEDGE), money(WEDGE), money(WEDGE * 2 + REQ), "Portal"],
  ], { size: 15 });

note("If a row has not moved in two weeks, the question is not how to move it. It is whether the plan is being run. Two weeks, not three — a twelve-week quarter cannot absorb a three-week diagnosis.");

/* ================================================================== */
pageBreak();
h1(`9. The preparation week — ${dmy(PREP)} to ${dm(addDays(PREP, 4))}`);

rich([{ t: "This week is not the plan. It is what makes week 1 a selling week instead of an unblocking one. ", b: true },
  { t: `Revision 3 spent its first week on the delivery record, the referees and CHIC, and sent nothing. That was affordable over thirteen weeks. Over twelve, with six convertible weeks, it is not — a week of unblocking inside the sprint costs ${SPRINT} approaches and roughly ${pc(confOf(CONVERTIBLE) - confOf(CONVERTIBLE - SPRINT), 1)} of the quarter's confidence. So the unblocking happens now, before the clock starts.` }]);

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

richBullet([{ t: "If the delivery record is not finished this week, week 1 is not a selling week and the quarter loses a sixth of its convertible volume. ", b: true },
  { t: "It is the only task in this document with no substitute and no alternative author, and it is the one most easily postponed because it is uncomfortable to write." }]);

fillIn(`Fill in on Friday ${dm(addDays(PREP, 4))}: the number of qualified organisations on the list with a named person and a trigger. If it is below ${SPRINT}, Monday cannot start and the honest response is to say so on Friday rather than discover it at 09:00 on Monday.`);

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
    ["Tier-four main contractors in the sprint", `They are in the weeks 9–11 pipeline batch instead. Their decision cycle is longer than the ${LEAD_WEEKS} weeks this quarter has, so a sprint approach to them is a January approach sent in October.`],
  ]);

approval();
d.build().then(() => {
  console.log("\nTHE NUMBERS IN THE DOCUMENT");
  console.log("  period                   ", dmy(START), "->", dmy(LAST_DAY), `(${WEEKS} weeks)`);
  console.log("  the wall                 ", dmy(WALL), `(end of week ${LEAD_WEEKS})`);
  console.log("  last day to ask          ", dmy(ASK_BY));
  console.log("  cold approach -> win     ", pc(coldRate, 2), "=> 1 per", perWinCold);
  console.log("  2 live referrals alone   ", pc(pWarm));
  console.log("  sprint                   ", SPRINT + "/week x", LEAD_WEEKS, "=", CONVERTIBLE, "convertible");
  console.log("  confidence bought        ", pc(pSprint, 1));
  console.log("  needed for 80%           ", N80, `(${Math.ceil(N80 / LEAD_WEEKS)}/week) — shortfall`, shortfall);
  console.log("  reply rate that closes it", pc(replyNeeded, 1));
  console.log("  total sent / convertible ", TOTAL_SENT, "/", CONVERTIBLE);
  console.log("  rev 3 claimed            ", pc(pRev3, 1), "on", REV3_SCHEDULED, "approaches");
  console.log("  one client on the ladder ", money(LTV), "=", (LTV / WEDGE).toFixed(1) + "x the wedge");
}).catch((err) => { console.error(err); process.exit(1); });
