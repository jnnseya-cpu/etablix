/**
 * ETABLIX — 30/60/90 day go-to-market, UNITED KINGDOM ONLY.
 *
 *   node business/strategy/build-gtm-uk.cjs
 *
 * This supersedes the 60/20/20 plan for operational purposes. That document
 * is not deleted: the Gulf and Europe analysis in it stands, and section 15
 * says where it lives and what would bring it back. A market that has been
 * ruled out with reasons written down is a decision; one that has simply
 * stopped being mentioned is a drift.
 *
 * Everything here is drawn from the outreach ledger, the bid files and the
 * platform's own fee bands as at 20 September 2026. No market sizes, no win
 * rates, no contacts that do not exist.
 */
const B = require("../policies/brand.cjs");

const REV = "2";
const d = B.doc({
  slug: "Go-To-Market-UK-90-Day-Plan",
  running: "30/60/90 go-to-market · United Kingdom",
  kicker: "GO TO MARKET · UNITED KINGDOM",
  title: "THE FIRST 90 DAYS",
  sub: "21 September to 19 December 2026 — one market, one proposition, one reference",
  rev: REV,
  outDir: __dirname,
  kind: "plan",
  control: [
    ["Document", "30/60/90 day go-to-market plan — United Kingdom"],
    ["Revision", "2 — supersedes the 60/20/20 plan for operational purposes"],
    ["Period", "21 September 2026 to 19 December 2026"],
    ["Scope", "United Kingdom only. Europe and the Gulf are out of scope — section 15."],
    ["Owner", "Justin Nseya, Director"],
    ["Baseline", "The outreach ledger, the bid files and the platform fee bands, 20 September 2026"],
    ["Review", "Weekly on the scoreboard at section 14; full review at day 30, 60 and 90"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ================================================================== */
h1("1. The decision, in one page");

rich([
  { t: "One market, one proposition, one reference. ", b: true },
  { t: "For the next ninety days ETABLIX sells site establishment in the United Kingdom and nowhere else, and the measure of the quarter is not revenue, enquiries or meetings. It is whether one client has been delivered for and has agreed to be named." },
]);

p("Everything the company cannot currently do is downstream of that one missing thing. No case study, no framework admission, no confident pricing, no second market — all of it resolves the week a client says yes to being a reference, and none of it resolves before.");

table([2400, 5900],
  ["The ninety days", "What it is for"],
  [
    ["Days 1 to 30",
     "Unblock what is already in flight. Fill the delivery record, secure three referees, resubmit CHIC, answer the Siemens Energy referral, and put one priced proposal in front of a buyer who has already expressed interest."],
    ["Days 31 to 60",
     "Close it and deliver it. One engagement, instructed and completed to the standard the specimen sets, and the reference asked for at the point of delivery rather than a month later."],
    ["Days 61 to 90",
     "Turn one into two, and set January up. The second sale to the same client is the cheapest revenue available. The four UK approaches that never replied become a different email once there is delivered work to cite."],
  ]);

richBullet([{ t: "The one number that matters: one. ", b: true },
  { t: "One delivered engagement, one written reference. A plan that targets five and achieves none is worse than a plan that targets one and gets it, because the company only needs the first one to stop being the company that has never done this." }]);

/* ================================================================== */
pageBreak();
h1("2. Where the company stands on day zero");

p("Stated without inflation, because a plan built on a flattering baseline plans for a company that does not exist.");

h2("2.1  What exists and works");

bullet("A delivery method that produces a defensible output, evidenced by a full worked specimen on a synthetic project — sixteen pages generated from the eight inputs a client is asked to supply.");
bullet("A platform that runs it: sixteen agents, deterministic engines that run before the model, and a document studio issuing numbered, watermarked, controlled documents.");
bullet("Priced products with worked fee bands, from a £6,500 single-site diagnostic to a £45,000 programme requirements package — section 6.");
bullet("A public site at a 99/100 average audit score, with the pages, policies and discovery surfaces in place.");
bullet("Six issued policies, each stating on its own face that it is not certified.");
bullet("A director with a verifiable delivery record on UK transmission and generation schemes, and the professional vocabulary that record produces. This is what opens doors; the platform is what keeps them open.");

h2("2.2  What does not exist");

richBullet([{ t: "No completed client engagement under the company's own name. ", b: true },
  { t: "Therefore no case study, no reference, no revenue. Every other gap is downstream of this one." }]);
bullet("No statutory accounts. Director-prepared, unaudited management information exists; the first accounting reference date has not been reached.");
bullet("No certifications — no ISO 9001, 14001, 45001 or 37001.");
bullet("One working director. No second competent person, no segregation of duties, and a hard ceiling on concurrent engagements.");
bullet("No referees confirmed. The delivery record is written and its fields are empty.");

h2("2.3  The live pipeline, as recorded");

table([2000, 2300, 4000],
  ["Contact", "Organisation", "State on 20 September"],
  [
    ["Jamie Holiday", "Hitachi Energy", "LIVE. Referred internally by Gary Coleman. Supplier register completed. Asked for case studies and offered to circulate them to supply chain colleagues."],
    ["Matthew Knight / Andrew", "Siemens Energy", "LIVE. Referral made internally. Reply drafted, not confirmed sent."],
    ["Aaron Hall", "Morgan Sindall Infrastructure", "Open. Replied. No current ask on the table."],
    ["Alasdair Mackintosh", "Exyte", "Open. Asked about geographic coverage. Reply drafted — the answer is the United Kingdom."],
    ["CHIC", "Development DPS", "Returned for detail on technical ability and one financial document. Not a rejection: 'upon receipt we can progress the application.'"],
    ["Balfour Beatty, Laing O'Rourke, HS2, Turner & Townsend", "Four named approaches", "No reply recorded. Not closed — they become a different email in phase 3."],
    ["GE Vernova", "Construction and sourcing", "Stood down until 2027 by decision. One no-ask email drafted."],
  ]);

p("Four replies from nine named approaches, two of them internal referrals inside global equipment manufacturers. For cold business-to-business outreach that is a strong rate rather than a failed campaign.");

/* ================================================================== */
pageBreak();
h1("3. The premise, and what failure would actually look like");

rich([{ t: "The campaign is approximately three weeks old. ", b: true },
  { t: "A construction sales cycle from first contact to first purchase order is measured in months, and a first engagement with a supplier who has no track record is measured against the buyer's appetite for risk rather than the quality of the approach. Three weeks is inside the noise, and acting on noise is how a company arrives in its fourth market having never finished the first." }]);

h2("3.1  What would constitute UK failure");

p("Written now, while it can be defined honestly rather than in a low week:");

bullet("Thirty or more qualified approaches to compound-holding organisations, with a reply rate below one in twenty.");
bullet("Three or more buyers who reach a priced proposal and decline on the proposition rather than on price or track record.");
bullet("The same objection, from unrelated buyers, that the offer cannot answer.");
bullet("CHIC and one other framework both declining after resubmission with the detail supplied.");

p("None of those conditions is met, and two of them cannot yet be tested, because the company has not put a priced proposal in front of anybody. That is the gap this plan closes first.");

note("This section exists so that persisting is a decision rather than a default, and so that stopping — if it ever comes — is measured against a line drawn in advance rather than after a bad fortnight.");

/* ================================================================== */
h1("4. Why the United Kingdom, and only the United Kingdom, for ninety days");

bullet("It is the only market where the company can trade today with no licence, no local entity, no sponsor and no agent.");
bullet("It is where the director's record is verifiable and where a buyer can telephone a referee in the same time zone and language.");
bullet("Every live relationship is in it. Both referrals originate in UK offices of global businesses.");
bullet("It is where a first reference can be earned in weeks rather than quarters — and the first reference is the constraint on everything else.");
bullet("Public frameworks are open to a company with no trading history provided the evidence is produced. Very few markets offer that to a new entrant.");
richBullet([{ t: "Payment is enforceable. ", b: true },
  { t: "The Housing Grants, Construction and Regeneration Act 1996 gives a statutory payment regime that a one-person company can actually rely on. For a business funded by a director's loan with no trading income, that is not a convenience — it is the difference between a late payment and an insolvency." }]);

richBullet([{ t: "And the decisive one: focus is the only competitive advantage available. ", b: true },
  { t: "One person cannot out-resource anybody. What one person can do is be the most prepared party in the room on one subject, in one market, and that advantage disappears the moment the week is split three ways." }]);

/* ================================================================== */
pageBreak();
h1("5. Which sectors, in which order");

p("“Compound-holding organisations” is a filter, not a strategy. It removes the wrong targets and says nothing about which of the right ones to approach first, and with one deliverer the order matters more than the list.");

rich([{ t: "Lead with electricity transmission and grid. ", b: true },
  { t: "It is where the director's record is, where both live referrals already sit, and where the work repeats — a portfolio of similar compounds is a market where a specification written once has value on the next one." }]);

table([2000, 1300, 5000],
  ["Sector", "Priority", "The reasoning, including against"],
  [
    ["Electricity transmission and grid",
     "FIRST",
     "The director's verifiable record. Both live referrals — Hitachi Energy and Siemens Energy — are here. Substations, converter stations and power quality compounds repeat at similar scale, which is where the proposition is strongest. Overhead line work adds the linear compound problem, which almost nobody prices properly. Against: the buyers are large and slow, and a first purchase order may take longer than ninety days."],
    ["Data centres",
     "SECOND",
     "High compound intensity, and the build-out is moving out of London into places where peak workforce exceeds the local travel-to-work population — the establishment problem in its purest form. Exyte is already a live conversation. Against: programme-driven and fast, so an unreferenced supplier is a risk the programme will not carry."],
    ["Generation and storage",
     "THIRD",
     "Battery storage and solar sites are numerous, smaller, and let by developers and EPCs with no specialist team of their own. Smaller fees and faster decisions make this the most likely source of a FIRST engagement even though it is not the largest prize. The director's UK Power Reserve background is directly relevant."],
    ["Water — AMP8",
     "FOURTH",
     "Large framework spend across many small sites, which suits the proposition. Against: slow procurement, frameworks already let, and mid-cycle entry as an unreferenced supplier is unlikely inside ninety days. Worth a registration, not a campaign."],
    ["Rail and highways",
     "FIFTH",
     "Compound-heavy and framework-driven, with established supply chains and prequalification that assumes a trading history. Approach when there is a reference to put in the form."],
    ["Nuclear new build",
     "LAST",
     "The largest compounds in the country and the hardest to enter: security vetting, multi-stage prequalification, and a supply chain years in the making. A 2027 conversation; effort there now buys nothing."],
  ], { size: 16 });

note("The temptation is to lead with nuclear because the compounds are biggest. Their being biggest is precisely why the barrier is highest, and a ninety-day plan that leads there produces a great deal of activity and no revenue.");

/* ================================================================== */
pageBreak();
h1("6. What is actually being sold, and for how much");

p("A go-to-market plan without prices in it is a plan to have the pricing conversation under pressure, in front of somebody who has it weekly. These bands are already built into the platform and they are what the proposals in phase 1 should quote.");

h2("6.1  The ladder");

table([2900, 1200, 4200],
  ["Product", "From", "What it is, and where it sits"],
  [
    ["Site Systems Diagnostic", "£6,500",
     "THE WEDGE. One site, one compound, up to ten documents, peak workforce under 200, one revision round. Multi-compound £11,500; programme or linear scheme £18,500. This is the first sale and the reference generator — small enough to be decided by one person, large enough to be taken seriously."],
    ["Mobilisation-readiness review", "£5,500",
     "The alternative entry point when a scheme is already committed and the question is whether it is ready. Lower value, faster decision, same reference outcome."],
    ["Site Management Requirements Package", "£14,000",
     "THE FOLLOW-ON. One compound, up to six packages specified to tender-ready requirements. Multi-compound £26,000; programme £45,000. This is what a satisfied diagnostic client buys next, and it is where the margin is."],
    ["Managed Procurement Desk", "£7,500 / month",
     "THE ANNUITY. Up to four live packages, minimum three months; £13,500 a month for five to ten. Recurring revenue from a client who already trusts the specification because ETABLIX wrote it."],
    ["Workforce Village Requirements", "£18,000",
     "Specialist, for schemes with accommodation at scale. Not a first sale — it requires a track record the company does not have."],
  ], { size: 16 });

richBullet([{ t: "Sell the diagnostic. Do not lead with anything else. ", b: true },
  { t: "£6,500 is inside the authority of a single project or commercial manager at every organisation on the target list, which means it needs one person to say yes rather than a committee. The requirements package at £14,000 upwards is the prize, and it is a second conversation with a client who has already seen the work." }]);

h2("6.2  The foundation rate, and how to say it");

p("The first engagement is priced below the band, once, for a stated reason, to a stated date, and with an explicit statement that it does not carry forward. The reason is true and should be said out loud: the company is new, it needs a reference, and it is willing to carry the risk of that rather than ask the client to.");

fillIn("Set the foundation figure and the date it holds until, and use the same two numbers in every proposal issued in phase 1. A rate that differs between two buyers who later speak to each other is a problem that cannot be explained away.");

richBullet([{ t: "Never present it as a discount. ", b: true },
  { t: "A discount offered to a buyer tells them the first number was padded, and it re-prices every future quotation downwards in their mind. A foundation rate with a reason, a date and a non-carry-forward statement is a commercial decision that happens once." }]);

h2("6.3  The risk reversal, and its cost");

p("The strongest thing the company can offer a sceptical first buyer is that the risk is not theirs: if the diagnostic tells them nothing they did not already know, they do not pay. A company with a track record cannot afford that offer. A company without one can, and making it says three true things at once — that the company is new, that it knows it, and that it is confident enough to take the risk itself.");

richBullet([{ t: "If it is offered, it must be honoured without argument. ", b: true },
  { t: "A disputed refusal to refund would cost more than every engagement this plan is trying to win." }]);

/* ================================================================== */
pageBreak();
h1("7. PHASE 1 · days 1 to 30 · 21 September to 20 October");

rich([{ t: "Objective: put one priced proposal in front of a buyer who has already expressed interest. ", b: true },
  { t: "Everything in this phase exists to make that possible." }]);

h2("7.1  The opening week, day by day");

table([1600, 6700],
  ["Day", "What is done, and finished"],
  [
    ["Monday 21st",
     "The delivery record. Three schemes: employer, client, location, dates, scheme value, the value of the scope personally held, role, peak workforce, establishment duration, scope delivered, and what changed because of it. Nothing else happens on Monday. This one document unblocks CHIC and Hitachi Energy simultaneously and nobody else can write it."],
    ["Tuesday 22nd",
     "Referees. Approach four to secure three — the client-side counterparts first. Ask permission explicitly and record the date they gave it. Then send the Siemens Energy reply to Matthew, copying Andrew; it is drafted and every day it sits unsent reflects on the person who made the referral."],
    ["Wednesday 23rd",
     "The three financial documents from the workbook: statement of financial position, cash flow to date, and the forecast. The figures are all in the bank statements and the company's own records. Label everything as unaudited management information."],
    ["Thursday 24th",
     "Resubmit CHIC through the eSourcing portal — every section confirmed, not only the two flagged. Then send the Hitachi Energy pack to Jamie Holiday: the completed delivery record and the corrected specimen, with the request for twenty minutes."],
    ["Friday 25th",
     "The first twelve qualified approaches, built against the sector order at section 5 and the targeting filter. Then the ledger, and thirty minutes deciding next week's twelve."],
  ]);

note("If Monday slips, everything in this plan slips with it. The delivery record is the only task in the ninety days with no substitute and no workaround, and it is the one most easily postponed because it is uncomfortable to write.");

h2("7.2  Weeks two to four");

bullet("Convert the referrals. When a call happens, the objective is not to win the work in the meeting — it is to leave with one named live scheme to price against. A diagnostic priced against a named compound converts; a capability conversation produces goodwill and no purchase order.");
bullet("Hitachi Energy: lead the positioning with GPQS rather than HVDC — a portfolio of repeated compounds at similar scale is where a specification written once carries to the next one.");
bullet("Siemens Energy: having sent the reply, leave it. The referral is Matthew's to push and chasing it damages him.");
bullet("Twenty-five qualified approaches in total across the phase, applying the filter before anything is sent: does this organisation ever hold a site compound in its own name?");
bullet("Three to four substantive LinkedIn comments a week on posts by people inside target organisations. It is the one channel that has demonstrably produced engagement, and the register that works — specific, unglamorous, understated — is already established.");
bullet("Publish the two-sentence pitch as a standalone post once in the phase. The post is the prompt; the comments are the conversation.");

h2("7.3  Phase 1 is finished when");

table([5300, 3000],
  ["Measure", "Target by 20 October"],
  [
    ["Delivery record complete, three schemes", "Yes"],
    ["Referees confirmed in writing", "3"],
    ["CHIC resubmitted, every section confirmed", "Yes"],
    ["Siemens Energy reply sent", "Yes"],
    ["Hitachi Energy pack sent and meeting requested", "Yes"],
    ["Qualified approaches made", "25"],
    ["Meetings with compound-holding buyers", "2"],
    ["Priced proposals issued", "1"],
  ]);

/* ================================================================== */
pageBreak();
h1("8. PHASE 2 · days 31 to 60 · 21 October to 19 November");

rich([{ t: "Objective: close the first engagement and deliver it. ", b: true }]);

bullet("Convert one priced proposal into an instruction, on the foundation rate, to one scheme, with the expiry stated.");
richBullet([{ t: "Then deliver it, and deliver nothing else that fortnight. ", b: true },
  { t: "A one-person company delivering its first engagement is not also running a campaign. This plan assumes selling stops during delivery, because a plan that assumes otherwise produces a late first deliverable — and the first deliverable is the reference." }]);
bullet("Ask for the reference at the point of delivery, while the client is looking at the output. Two sentences and permission to name them is enough. A month later the moment has gone and the answer becomes 'let me check with marketing'.");
bullet("Frameworks continue in parallel: the CHIC assessment response, and the Crown Commercial Service dynamic purchasing routes where value bands rather than guarantors are the lever.");
bullet("A further 25 qualified approaches, now able to reference a live engagement rather than a specimen. The sentence changes from 'here is a worked example' to 'we are doing this now', and that is a different email.");

h2("8.1  Phase 2 is finished when");
table([5300, 3000],
  ["Measure", "Target by 19 November"],
  [
    ["Engagements instructed", "1"],
    ["Engagements delivered to approval", "1"],
    ["Client reference obtained in writing", "1"],
    ["Priced proposals issued, cumulative", "3"],
    ["Qualified approaches, cumulative", "50"],
    ["Revenue invoiced", "The first engagement in full"],
  ]);

/* ================================================================== */
h1("9. PHASE 3 · days 61 to 90 · 20 November to 19 December");

rich([{ t: "Objective: turn one engagement into a second, and build the pipeline that survives January. ", b: true }]);

richBullet([{ t: "Plan around the December shutdown, because it is real. ", b: true },
  { t: "UK construction effectively stops from roughly 18 December to the first week of January. The last two weeks of this window are not selling days — they are days for proposals to sit unread. Every decision this plan needs must be asked for by the first week of December." }]);

bullet("Convert the first client into a second scheme, or into the requirements package at section 6. The second sale to an existing client is the cheapest revenue available and the one most companies forget to ask for.");
bullet("Use the reference deliberately: on the site, in the delivery record, in the outreach, and in every framework application where 'no completed engagement' was the gap.");
bullet("Reopen the four approaches with no reply recorded — Balfour Beatty, Laing O'Rourke, HS2, Turner & Townsend. A second approach carrying new information is a different email, not a chaser.");
bullet("Write the January campaign in December so it launches in the first week rather than being drafted in it.");

h2("9.1  The position at day 90");
table([5300, 3000],
  ["Measure", "Target by 19 December"],
  [
    ["Engagements delivered", "1"],
    ["Client references in writing", "1"],
    ["Second engagement instructed or scheduled", "1"],
    ["Frameworks admitted or progressed", "1"],
    ["Qualified approaches, cumulative", "75"],
    ["Meetings, cumulative", "6"],
    ["January campaign written and scheduled", "Yes"],
  ]);

/* ================================================================== */
pageBreak();
h1("10. The first meeting, and the four objections");

p("Six meetings are planned across ninety days. With one deliverer and no reference, each is expensive to obtain and cannot be treated as practice.");

h2("10.1  What the first meeting is for");

rich([{ t: "One outcome: leave with a named live scheme to price against. ", b: true },
  { t: "Not a follow-up, not a request for a capability pack, not an introduction to somebody else." }]);

bullet("Ask early which schemes are at bid or pre-construction stage now. The work only has value before the establishment number is committed, so a scheme already on site is the wrong scheme however enthusiastic the room.");
bullet("Bring the specimen; do not present it. Hand it over and answer what is asked. A document walked through is a pitch; a document being read is evidence.");
bullet("Name the price in the meeting. A proposal arriving three days later gives the objection three days to form in private.");
bullet("Agree the next date before leaving, with a name against it.");

h2("10.2  The four objections");

table([2300, 6000],
  ["What they say", "The answer"],
  [
    ["“We already do this in-house.”",
     "Agree immediately and without qualification — they do. Then ask when it gets done and by whom. The answer is almost always the fortnight before submission, by whoever had capacity. The gap is not competence, and saying so early is what keeps the conversation alive."],
    ["“You have no track record.”",
     "Concede it before they finish the sentence. The company has no completed engagement under its own name; the director has a delivery record and the referees can be called. Then move the risk: if the diagnostic tells them nothing they did not already know, they do not pay. A new company can afford that offer and an established one cannot, which is the single advantage of being new."],
    ["“Send me something and I will circulate it.”",
     "Accept it and pin it. Send the delivery record and the specimen the same day, then ask which scheme to look at when they come back. Circulation with nothing specific attached is how an enquiry dissolves politely."],
    ["“What does it cost?”",
     "£6,500 for a single site, the foundation rate where it applies, the date it holds until, and the statement that it does not carry forward. Said plainly and without apology. Hesitating on price reads as a rate invented in the room."],
  ]);

h2("10.3  What disqualifies a meeting");
bullet("Nobody in the room owns a budget. Pleasant, and it is a networking call — book it as such and do not count it on the scoreboard.");
bullet("Every scheme discussed is already on site. The value is gone; say so honestly and ask what is coming next.");
bullet("The organisation holds no compound in its own name. That is the targeting filter failing upstream, and the correction belongs in the list rather than in the meeting.");

/* ================================================================== */
h1("11. The weekly rhythm");

p("Written as a rhythm rather than a list, so it survives contact with a busy fortnight.");

table([1600, 6700],
  ["Day", "What it is for"],
  [
    ["Monday", "Pipeline. The week's approaches all go out on the same day so follow-up is a batch rather than a scatter. Replies answered. Scoreboard updated."],
    ["Tuesday", "Live conversations, meetings, proposals. Referral work. CHIC and framework administration."],
    ["Wednesday", "Delivery, or preparation for it. During an engagement this becomes the whole week and the rest suspends."],
    ["Thursday", "Product and evidence: the specimen, the delivery record, the case study once it exists, and the platform work that supports a sale rather than the platform work that is interesting."],
    ["Friday", "LinkedIn and the written record. Three to four substantive comments. The ledger. Thirty minutes deciding next week's approaches."],
  ]);

/* ================================================================== */
pageBreak();
h1("12. Risks, and what is actually done about each");

table([2500, 2000, 3800],
  ["Risk", "If it happens", "The response, decided now"],
  [
    ["The delivery record is not written",
     "Everything stops",
     "There is no mitigation and no substitute. It is the first task on the first morning for that reason. If it is not done by the end of week one, the plan is not behind — it has not started."],
    ["Referees decline or do not respond",
     "CHIC stalls",
     "Approach four to secure three. If fewer than three agree, widen to former managers and to subcontractors managed, and tell CHIC what is coming and when rather than submitting short."],
    ["Both referrals go quiet",
     "The likeliest single failure",
     "They are warm introductions, not orders. The 25 approaches a month exist precisely so that the plan does not depend on them. Do not chase either referral — chasing damages the person who made it and they are the more valuable asset."],
    ["No proposal is issued by day 30",
     "Phase 2 cannot start",
     "Lower the bar rather than the standard: offer the mobilisation-readiness review at £5,500 to a buyer with a scheme already committed. A smaller first engagement is still a first engagement."],
    ["The first engagement is delivered late",
     "The reference is at risk",
     "Selling stops during delivery. This is written into phase 2 as a rule rather than an intention, because it is the rule most likely to be broken by a good week in the pipeline."],
    ["The client will not be a reference",
     "The quarter's objective fails",
     "Ask at the point of delivery, not later. If refused, ask instead for permission to describe the work anonymously — the sector and the scale without the name is worth most of it."],
    ["Runway runs out",
     "Existential",
     "Know the number now. Section 13. If ninety days of no revenue is not covered, that changes this plan and it must be said in September rather than discovered in November."],
  ], { size: 16 });

/* ================================================================== */
h1("13. Capacity, money, and what has to be true");

h2("13.1  The binding constraint is one person");

p("Undivided across one market, that is five days rather than three — which is the practical dividend of this revision and the reason it is likely to work better than the plan it supersedes. During the first engagement it drops to zero selling days, and that is accounted for.");

h2("13.2  The money");

fillIn("Fill from the management information: the runway in weeks at the current burn, and the date it ends with no revenue. Then the committed costs — insurance, software and hosting, travel to meetings, accreditation applications, the accountant. There is no marketing spend in this plan that is not already committed, and none is recommended before the first reference exists.");

h2("13.3  What has to be true");

bullet("The director writes the delivery record content in week one.");
bullet("Three referees say yes.");
bullet("At least one live conversation reaches somebody who owns a compound budget.");
bullet("The first engagement is delivered to the standard the specimen sets. One disappointed first client is worse than no first client.");
bullet("The runway covers ninety days with no revenue.");

/* ================================================================== */
h1("14. The scoreboard");

p("Reviewed weekly, in fifteen minutes. Eight rows, and the first two are the only ones that matter before day 30.");

table([4300, 1300, 1300, 1400],
  ["Measure", "Day 30", "Day 60", "Day 90"],
  [
    ["Referees confirmed in writing", "3", "3", "3"],
    ["Priced proposals issued", "1", "3", "5"],
    ["Meetings with compound-holding buyers", "2", "4", "6"],
    ["Engagements instructed", "0", "1", "2"],
    ["Engagements delivered", "0", "1", "1"],
    ["Client references obtained", "0", "1", "1"],
    ["Qualified approaches, cumulative", "25", "50", "75"],
    ["Frameworks progressed or admitted", "1", "1", "2"],
  ], { size: 17 });

note("A scoreboard of eight rows is read weekly. One of thirty rows is read once. If a row has not moved in three weeks, the question is not how to move it — it is whether it belongs on the board.");

/* ================================================================== */
pageBreak();
h1("15. What is deliberately not in this plan");

richBullet([{ t: "Europe and the Gulf. ", b: true },
  { t: "Out of scope for ninety days, by decision. The analysis is not discarded — it is in the 60/20/20 revision of this plan, which records why the Gulf is a second market rather than a first: licensing and local establishment, a track record that Gulf procurement treats as disqualifying rather than inconvenient, payment cycles a company funded by a director's loan cannot absorb with no statutory payment regime behind it, and workforce accommodation exposure a one-person company cannot govern or insure." }]);

p("The route recorded there still holds and still costs nothing: the UK offices of the contractors already working in those markets. It is reached by adding one question to a UK conversation once there is delivered work to point at — which is what this plan is for.");

richBullet([{ t: "The trigger to reopen either market, stated in advance: ", b: true },
  { t: "two delivered UK engagements, one of them for a multinational with overseas operations, and a named internal introduction to that multinational's regional team. Until all three exist, neither market is worked." }]);

bullet("No paid advertising. With no reference and one deliverer, paid acquisition buys enquiries that cannot be converted or serviced.");
bullet("No second product. CONSTRUX and VERYX are real and they are not the wedge. One proposition, told the same way every time, until it has been sold once.");
bullet("No certification programme. ISO 9001 is worth pursuing when a buyer says it is the blocker. None has.");
bullet("No hiring. The first engagement tells the company what the second person should be; guessing before then is expensive.");
bullet("No approach to GE Vernova beyond the single no-ask email already drafted. That stands until 2027 and it is a discipline, not a message.");

h1("16. Review and revision");

bullet("Weekly: the scoreboard, and nothing else. Fifteen minutes.");
bullet("Day 30, 60 and 90: the full plan against the phase measures. Write down what was wrong about the last thirty days before planning the next thirty.");
richBullet([{ t: "Reopen the question of market scope only on the trigger at section 15, never on a bad week. ", b: true },
  { t: "The conditions that would justify moving effort out of the United Kingdom are at section 3.1, written in advance and in cold blood, precisely so the decision is not made in the wrong mood." }]);

approval();
d.build().catch((err) => { console.error(err); process.exit(1); });
