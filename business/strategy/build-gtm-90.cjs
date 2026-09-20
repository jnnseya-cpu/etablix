/**
 * ETABLIX — 30/60/90 day go-to-market. Word and PDF.
 *
 *   node business/strategy/build-gtm-90.cjs
 *
 * Weighted 60 per cent United Kingdom, 20 per cent Europe, 20 per cent Gulf,
 * as asked. The weighting is not a courtesy to the core market — it is the
 * conclusion. Sections 3 to 6 set out why, and section 7 answers the question
 * behind the request: whether the Gulf is a way round a UK market that has
 * not yet converted.
 *
 * Every date, name and status in here is taken from the outreach ledger and
 * the bid files as they stood on 20 September 2026. Nothing is invented: no
 * market sizes, no win rates, no contacts who do not exist. Where a figure
 * would help and is not known, the document says it is not known.
 */
const B = require("../policies/brand.cjs");

const REV = "1";
const d = B.doc({
  slug: "Go-To-Market-90-Day-Plan",
  running: "30/60/90 go-to-market",
  kicker: "GO TO MARKET",
  title: "THE FIRST 90 DAYS",
  sub: "21 September to 19 December 2026 · United Kingdom 60% · Europe 20% · Gulf 20%",
  rev: REV,
  outDir: __dirname,
  kind: "plan",
  control: [
    ["Document", "30/60/90 day go-to-market plan"],
    ["Revision", REV],
    ["Period", "21 September 2026 to 19 December 2026"],
    ["Weighting", "United Kingdom 60% · Europe 20% · Gulf 20%"],
    ["Owner", "Justin Nseya, Director"],
    ["Baseline", "The outreach ledger and bid files as at 20 September 2026"],
    ["Review", "Weekly on the scoreboard at section 11; full review at day 30, 60 and 90"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ================================================================== */
h1("1. The decision, in one page");

rich([
  { t: "The United Kingdom gets sixty per cent of the effort because it is the only market where this company can win work in the next ninety days. ", b: true },
  { t: "That is a statement about the company's position, not about the size of the opportunity elsewhere. Europe and the Gulf are both larger and both further away, and the thing that shortens the distance to either of them is a delivered UK engagement." },
]);

p("The request that prompted this plan contained a premise worth examining before anything else: that the UK and Europe have not come through. Section 3 sets out what the record actually shows — nine named approaches, four replies, two live referrals inside major equipment manufacturers, and an application under assessment. That is not a market that has failed to respond. It is a pipeline at week three of a first campaign, and abandoning it now would reset the clock to zero in a market where the clock has already started running.");

p("The single most valuable thing in the company's possession today is not a document or a platform. It is two warm introductions made by people who did not have to make them, inside Hitachi Energy and Siemens Energy, both of which are large enough to keep a company of this size busy for years and both of which also operate in the Gulf. Those introductions decay. They are the whole of the next thirty days.");

table([2600, 5700],
  ["Market", "What the next ninety days is actually for"],
  [
    ["United Kingdom · 60%",
     "Convert the two live referrals into one paid engagement, unblock the CHIC application, and produce the first client reference. Everything else in this plan depends on that reference existing."],
    ["Europe · 20%",
     "One route only: UK and Ireland headquartered contractors delivering on the continent, reached through their UK offices. No entity, no travel, no translation."],
    ["Gulf · 20%",
     "Positioning and knowledge, not pursuit. Reached through the UK offices of contractors already working there. No licence, no local partner, no flights — and section 7 explains why that is a constraint rather than a preference."],
  ]);

note("Read section 7 before section 8 if the Gulf is the reason this document was commissioned. The answer there is not no. It is not yet, for reasons that are structural and that a delivered UK engagement removes.");

/* ================================================================== */
pageBreak();
h1("2. Where the company stands on day zero");

p("Stated without inflation, because a plan built on a flattering baseline plans for a company that does not exist.");

h2("2.1  What exists and works");

bullet("A delivery method that produces a defensible output, evidenced by a full worked specimen on a synthetic project — sixteen pages from the eight inputs a client is asked to supply.");
bullet("A platform that runs the method: sixteen agents, deterministic engines that run before the model, and a document studio that issues numbered, watermarked, controlled documents.");
bullet("A public site at a 99/100 average audit score, with the pages, the policies and the discovery surfaces in place.");
bullet("Six issued policies — health and safety, environmental, quality, EDI, occupational health, and anti-bribery and corruption — each stating on its own face that it is not certified.");
bullet("A director with a delivery record on UK transmission and generation schemes, and the professional vocabulary that record produces. This is the asset that opens doors; the platform is the asset that keeps them open.");

h2("2.2  What does not exist");

richBullet([{ t: "No completed client engagement under the company's own name. ", b: true },
  { t: "Therefore no case study, no client reference, and no revenue. Every other gap is downstream of this one." }]);
bullet("No statutory accounts. Director-prepared management information exists and is unaudited; the company has not reached its first accounting reference date.");
bullet("No certifications. No ISO 9001, 14001, 45001 or 37001.");
bullet("One working director. No second competent person, no segregation of duties, and a hard ceiling on how many engagements can run at once.");
bullet("No referees confirmed. The delivery record document is written and its fields are empty.");

h2("2.3  The live pipeline, as recorded");

table([2100, 2400, 3800],
  ["Contact", "Organisation", "State on 20 September"],
  [
    ["Jamie Holiday", "Hitachi Energy", "LIVE. Referred internally by Gary Coleman. Supplier register completed. Asked for case studies and offered to circulate them to supply chain colleagues."],
    ["Matthew Knight / Andrew", "Siemens Energy", "LIVE. Referral made internally. Reply drafted, not confirmed sent."],
    ["Aaron Hall", "Morgan Sindall Infrastructure", "Open. Replied. No current ask on the table."],
    ["Alasdair Mackintosh", "Exyte", "Open. Asked whether the company works UK only or across Europe. Reply drafted."],
    ["CHIC", "Development DPS", "Returned for more detail on technical ability and one financial document. Not a rejection — 'upon receipt we can progress the application.'"],
    ["Four named approaches", "Balfour Beatty, Laing O'Rourke, HS2, Turner & Townsend", "No reply recorded. Not closed."],
    ["GE Vernova", "Construction and sourcing", "Stood down until 2027 by decision. One no-ask email drafted."],
  ]);

p("Four replies from nine named approaches. For cold business-to-business outreach that is a strong rate rather than a failed campaign, and it is the fact that most directly contradicts the premise that the UK has not come through.");

/* ================================================================== */
pageBreak();
h1("3. The premise, examined");

rich([
  { t: "“We didn't get it through in the UK or Europe.” ", i: true },
  { t: "The campaign is approximately three weeks old. In that time it has produced two internal referrals inside global equipment manufacturers, a supplier registration completed at one of them with an open invitation to circulate material, a returned-for-detail application that explicitly says it will progress on receipt, and a direct question from a European EPC about geographic coverage." },
]);

p("A construction sales cycle from first contact to first purchase order is measured in months, and a first engagement with a supplier who has no track record is measured against the buyer's appetite for risk rather than the quality of the approach. Three weeks is inside the noise. There is no signal here yet to act on, and acting on noise is how a company arrives in its fourth market having never finished the first.");

h2("3.1  What would actually constitute UK failure");

p("Worth writing down now, while it can be defined honestly rather than in a low week:");

bullet("Thirty or more qualified approaches to compound-holding organisations, with a reply rate below one in twenty.");
bullet("Three or more buyers who reach the point of a priced proposal and decline on the proposition rather than on price or track record.");
bullet("A pattern of the same objection from unrelated buyers that the offer cannot answer.");
bullet("CHIC and one other framework both declining after resubmission with the detail supplied.");

p("None of those conditions is met. Two of them cannot yet be tested, because the company has not put a priced proposal in front of anybody.");

note("This section exists so that the decision to persist is a decision rather than a default, and so that the decision to stop — if it ever comes — is made against a line drawn in advance rather than after a bad fortnight.");

/* ================================================================== */
h1("4. Why the United Kingdom carries sixty per cent");

bullet("It is the only market where the company can trade today with no licence, no local entity, no sponsor and no agent.");
bullet("It is the market where the director's record is verifiable and where referees can be called by a buyer in the same time zone and language.");
bullet("Every live relationship is in it. Both referrals originate from UK offices of global businesses.");
bullet("It is the market where a first reference can be earned in weeks rather than quarters — and the first reference is the constraint on everything else.");
bullet("Public frameworks — CHIC, and the Crown Commercial Service routes — are open to a company with no trading history, provided the financial and technical evidence is produced. Very few markets offer that to a new entrant.");
bullet("Payment terms are enforceable. The Housing Grants, Construction and Regeneration Act 1996 gives a statutory payment regime a one-person company can actually rely on. This matters more than it sounds and section 7 returns to it.");

/* ================================================================== */
pageBreak();
h1("5. UNITED KINGDOM — Phase 1 · days 1 to 30 · 21 September to 20 October");

rich([{ t: "The objective of this phase is one sentence: put a priced proposal in front of a buyer who has already expressed interest. ", b: true },
  { t: "Nothing else in the first thirty days matters as much, and most of what follows exists to make that possible." }]);

h2("5.1  The week one blockers — all four sit with the director");

table([800, 3600, 3900],
  ["#", "Action", "Why it is first"],
  [
    ["1", "Fill the delivery record: three schemes, employer, client, dates, values, the scope personally held, peak workforce, and what changed because of it.",
     "It unblocks CHIC and the Hitachi request simultaneously. Two buyers have asked for the same document. It is the single highest-value hour available and nothing can substitute for it."],
    ["2", "Secure three referees and obtain their permission in writing.",
     "CHIC invited references. The strongest route is the client-side counterparts on the turnkey schemes — they were not the former employer's staff, carry no conflict, and sit outside the 2027 stand-down."],
    ["3", "Produce the three financial documents from the workbook already built.",
     "Statement of financial position, cash flow to date, and the forecast. Providing three where CHIC asked for one retires the guarantor question entirely."],
    ["4", "Send the Siemens Energy reply to Matthew, copying Andrew.",
     "Drafted and unsent. A referral that is not answered within a week reads as a referral that was not wanted, and it reflects on the person who made it."],
  ]);

h2("5.2  Convert the two referrals");

bullet("Hitachi Energy — send the delivery record and the corrected specimen to Jamie Holiday within seven days of the record being complete. Ask for twenty minutes with him and whoever owns preliminaries or site services. The GPQS positioning is the differentiator; do not lead with HVDC.");
bullet("Siemens Energy — send the drafted reply this week. Then leave it: the referral is Matthew's to push, and chasing it damages him.");
bullet("Both — when a call happens, the objective is not to win the work in the meeting. It is to leave with one named live scheme to price against. A diagnostic priced against a named compound converts; a capability conversation does not.");

h2("5.3  Resubmit CHIC");

bullet("Assemble: three financial documents, three referees with contact details and permission dates, and the project detail CHIC called insufficient — named schemes, dates, values, scope, and what the director personally did.");
bullet("Resubmit through the eSourcing portal, not by email. Confirm every section, not only the two flagged; a returned application is re-read from the top.");
bullet("Target: resubmitted by day 14. It is an administrative task with no external dependency once the referees have said yes.");

h2("5.4  Outreach, restarted with the targeting filter");

bullet("Apply the filter before anything is sent: does this organisation ever have a site compound in its own name? If no, it does not receive the contractor email, whatever its turnover.");
bullet("Twenty-five qualified approaches in phase 1 — main contractors, EPC contractors in energy and grid, principal contractors on infrastructure frameworks, and compound-holding specialists. Quality over volume; the Sweco decline was a list error and it cost an address.");
bullet("Maintain the LinkedIn comment cadence. It is the one channel that has demonstrably produced engagement, and the register — specific, unglamorous, understated — is working. Three to four substantive comments a week on posts by people inside target organisations.");
bullet("Publish the two-sentence pitch as a standalone post once in phase 1. Comments are the conversation; the post is the prompt.");

h2("5.5  Phase 1 is finished when");

table([5000, 3300],
  ["Measure", "Target by 20 October"],
  [
    ["Delivery record complete with three schemes", "Yes"],
    ["Referees confirmed in writing", "3"],
    ["CHIC resubmitted with every section confirmed", "Yes"],
    ["Siemens Energy reply sent", "Yes"],
    ["Hitachi Energy pack sent and a meeting requested", "Yes"],
    ["Qualified new approaches made", "25"],
    ["Meetings held with a compound-holding buyer", "2"],
    ["Priced proposals issued", "1"],
  ]);

/* ================================================================== */
pageBreak();
h1("6. UNITED KINGDOM — Phases 2 and 3");

h2("6.1  Phase 2 · days 31 to 60 · 21 October to 19 November");

rich([{ t: "Objective: close the first engagement and start it. ", b: true },
  { t: "Everything in this phase is subordinate to that." }]);

bullet("Convert one priced proposal to an instruction. The foundation rate applies to one scheme, holds to a stated date, and does not carry forward — a price with a reason and an expiry is a commercial decision; the same price without them is a discount, and a discount tells a buyer the first number was padded.");
bullet("Deliver it. A one-person company delivering its first engagement should be delivering nothing else that fortnight, and the plan assumes that.");
richBullet([{ t: "Convert the engagement into the reference. ", b: true },
  { t: "Ask for it at the point of delivery, while the client is looking at the output — not a month later. Two sentences and permission to name them is enough, and it is the asset that changes every conversation after it." }]);
bullet("Framework work continues in parallel: CHIC assessment response, and the Crown Commercial Service dynamic purchasing routes where value bands rather than guarantors are the lever.");
bullet("A further 25 qualified approaches, now able to reference a live engagement rather than a specimen.");

h2("6.2  Phase 3 · days 61 to 90 · 20 November to 19 December");

rich([{ t: "Objective: turn one engagement into a second, and build the pipeline that survives January. ", b: true }]);

richBullet([{ t: "Plan around the December shutdown, because it is real. ", b: true },
  { t: "UK construction effectively stops from roughly 18 December to the first week of January. The last two weeks of this ninety-day window are not selling days — they are days for proposals to sit unread. Every decision this plan needs must be asked for by the first week of December." }]);
bullet("Convert the first client into a second scheme with the same client. The second sale to an existing client is the cheapest revenue available and it is the one most companies forget to ask for.");
bullet("Use the reference deliberately: on the site, in the delivery record, in the outreach, and in the framework applications where 'no completed engagement' was the gap.");
bullet("Reopen the four UK approaches with no reply recorded — Balfour Beatty, Laing O'Rourke, HS2 and Turner & Townsend — with a delivered engagement to cite. A second approach with new information is a different email, not a chaser.");
bullet("Set the January campaign up in December so it launches in the first week rather than being written in it.");

h2("6.3  The UK scoreboard at day 90");

table([5000, 3300],
  ["Measure", "Target by 19 December"],
  [
    ["Engagements delivered", "1"],
    ["Client references obtained in writing", "1"],
    ["Second engagement instructed or scheduled", "1"],
    ["Frameworks admitted to or progressed", "1"],
    ["Qualified approaches, cumulative", "75"],
    ["Meetings held, cumulative", "6"],
    ["Revenue invoiced", "The first engagement in full"],
  ]);

fillIn("Put the foundation rate and the expiry date in here once decided, so the proposals in phase 2 are consistent with each other. A rate that varies between two buyers who later speak to each other is a problem that cannot be explained away.");

/* ================================================================== */
pageBreak();
h1("5A. UNITED KINGDOM — which sectors, in which order");

p("\u201cCompound-holding organisations\u201d is a filter, not a strategy. It removes the wrong targets and says nothing about which of the right ones to approach first, and with one deliverer the order matters more than the list.");

rich([{ t: "Lead with electricity transmission and grid. ", b: true },
  { t: "It is where the director's record is, where both live referrals already sit, and where the work repeats — a portfolio of similar compounds is a market where a specification written once has value on the next one. Everything else follows it." }]);

table([2100, 1500, 4700],
  ["Sector", "Priority", "The reasoning, including against"],
  [
    ["Electricity transmission and grid",
     "FIRST",
     "The director's verifiable record. Both live referrals — Hitachi Energy and Siemens Energy — are here. Substations, converter stations and power quality compounds repeat at similar scale, which is exactly where the proposition is strongest. Overhead line work adds the linear compound problem, which almost nobody prices properly. Against: the buyers are large and slow, and a first purchase order may take longer than ninety days."],
    ["Data centres",
     "SECOND",
     "High compound intensity, and the build-out is moving out of London into places where the peak workforce exceeds the local travel-to-work population — which is the establishment problem in its purest form. Exyte is already a live conversation. Against: programme-driven and fast, so a supplier without a reference is a risk the programme will not carry."],
    ["Generation and storage",
     "THIRD",
     "Battery storage and solar sites are numerous, smaller, and let by developers and EPCs who cannot absorb a specialist team of their own. Fee sizes are smaller and decisions are faster, which makes this the most likely source of a first engagement even though it is not the largest prize. The director's UK Power Reserve background is relevant here."],
    ["Water — AMP8",
     "FOURTH",
     "Large framework spend across many small sites, which suits the proposition. Against: procurement is slow, frameworks are already let, and entry mid-cycle as an unreferenced supplier is unlikely inside ninety days. Worth a registration, not a campaign."],
    ["Rail and highways",
     "FIFTH",
     "Compound-heavy and framework-driven, with established supply chains and prequalification regimes that assume a trading history. Approach when there is a reference to put in the form."],
    ["Nuclear new build",
     "LAST",
     "The largest compounds in the country and the hardest to enter: security vetting, multi-stage prequalification, and a supply chain years in the making. It is a 2027 conversation and putting effort there now buys nothing."],
  ], { size: 16 });

note("The temptation is to lead with nuclear because the compounds are the biggest. The compounds being biggest is precisely why the barrier is highest, and a ninety-day plan that leads there produces a great deal of activity and no revenue.");

h2("5A.1  What a week actually looks like");

p("Sixty, twenty and twenty per cent of a five-day week is three days, one day and one day. Written as a rhythm rather than a ratio, so it survives contact with a busy fortnight:");

table([1700, 6600],
  ["Day", "What it is for"],
  [
    ["Monday", "Pipeline. Approaches sent, replies answered, the scoreboard updated. The week's approaches all go out on the same day so that follow-up is a batch rather than a scatter."],
    ["Tuesday", "Live conversations and meetings. Referral work, proposals, the CHIC and framework administration."],
    ["Wednesday", "Delivery, or preparation for it. During an engagement this becomes the whole week and the rest of the plan suspends."],
    ["Thursday", "Europe (morning) and Gulf (afternoon). Low intensity by design — a list built, a registration completed, a question answered in writing."],
    ["Friday", "LinkedIn and the written record. Three to four substantive comments, the ledger updated, and thirty minutes deciding what the next week's twenty-five approaches are."],
  ]);

/* ================================================================== */
pageBreak();
h1("6A. UNITED KINGDOM — the first meeting, and the four objections");

p("Six meetings are planned across ninety days. With one deliverer and no reference, each one is expensive to obtain and cannot be treated as practice. What follows is what they are for and what will be said in them.");

h2("6A.1  What the first meeting is for");

rich([{ t: "One outcome: leave with a named live scheme to price against. ", b: true },
  { t: "Not a follow-up, not a capability pack request, not an introduction to somebody else. A diagnostic priced against a named compound converts because it is a decision about one thing; a capability conversation produces goodwill and no purchase order." }]);

bullet("Ask early which schemes are at bid or pre-construction stage now. The work only has value before the establishment number is committed, so a scheme already on site is the wrong scheme however enthusiastic the room.");
bullet("Bring the specimen, do not present it. Hand it over, let them open it, and answer what they ask. A document being walked through is a pitch; a document being read is evidence.");
bullet("Name the price in the meeting. A proposal that arrives three days later gives the objection three days to form in private.");
bullet("Agree the next date before leaving, with a name against it.");

h2("6A.2  The four objections, and the answers");

table([2300, 6000],
  ["What they say", "The answer"],
  [
    ["\u201cWe already do this in-house.\u201d",
     "Agree, immediately and without qualification — they do. Then ask when it gets done and by whom. The answer is almost always the fortnight before submission, by whoever had capacity. The gap is not competence and saying so early is what keeps the conversation alive."],
    ["\u201cYou have no track record.\u201d",
     "Concede it before they finish the sentence. The company has no completed engagement under its own name; the director has a delivery record and the referees can be called. Then move the risk: if the diagnostic tells them nothing they did not already know, they do not pay. A new company can afford that offer and an established one cannot, which is the one advantage of being new."],
    ["\u201cSend me something and I will circulate it.\u201d",
     "Accept it and pin it. Send the delivery record and the specimen the same day, then ask which scheme to look at when they come back. Circulation with nothing specific attached is how an enquiry dissolves politely."],
    ["\u201cWhat does it cost?\u201d",
     "The foundation rate, the date it holds until, and the statement that it does not carry forward to subsequent sites. Said plainly and without apology. Hesitating on price is read as a rate that was invented in the room."],
  ]);

note("The second objection is the one that decides the first sale, and the answer to it is the same honesty that has produced every reply so far. A buyer who has been told the gap before finding it believes the rest of the pack. A buyer who finds it themselves believes none of it.");

h2("6A.3  What disqualifies a meeting");

bullet("Nobody in the room owns a budget. Pleasant, and it is a networking call rather than a sales call — book it as such and do not count it on the scoreboard.");
bullet("Every scheme discussed is already on site. The value is gone; say so honestly and ask what is coming next.");
bullet("The organisation holds no compound in its own name. That is the targeting filter failing upstream, and the correction belongs in the list rather than in the meeting.");

/* ================================================================== */
pageBreak();
h1("7. THE GULF — the honest answer");

rich([{ t: "The opportunity is real and the barriers are structural. ", b: true },
  { t: "The Gulf is the right second market and the wrong first one, and the sequencing is a constraint rather than a preference." }]);

h2("7.1  Why it is attractive");

bullet("Saudi and UAE programme volume at a scale the UK does not have, with compound and workforce accommodation requirements to match. Site establishment at that scale is a larger line item than it is anywhere in Europe.");
bullet("Data centre and energy infrastructure build-out across the Gulf, with the same EPC contractors this company is already approaching in the UK.");
bullet("A market that pays for specification and planning work, and that uses international consultants extensively.");

h2("7.2  Why not yet — and each of these is a gate, not a friction");

table([2400, 5900],
  ["Barrier", "What it means for a company at this stage"],
  [
    ["Local presence",
     "Trading in Saudi Arabia or the UAE generally requires a licensed local entity or free zone establishment, with capital requirements and, in Saudi, an investment licence that ordinarily expects audited financials and a demonstrable track record. The company has neither. Verify the current position with an adviser before acting — this is a regulatory question with a moving answer, not a fixed fact."],
    ["Track record",
     "Gulf procurement for consultancy is relationship-led and prequalification-heavy. A company with no delivered engagement is not shortlisted; it is not considered. The UK gap is fatal there in a way it is merely inconvenient here."],
    ["Payment risk",
     "Long payment cycles and contested retention are widely reported features of the regional market, and there is no equivalent of the UK's statutory payment regime to fall back on. A company funded by a director's loan with no trading income cannot absorb a payment cycle measured in quarters. This alone is disqualifying at present."],
    ["Cost of pursuit",
     "Travel, visas, licensing, a local partner's participation and months of relationship-building all precede any revenue. That expenditure comes out of the same runway the UK route is being funded from, and the UK route is closer to revenue."],
    ["Workforce accommodation exposure",
     "Labour accommodation at regional scale carries human rights and labour standards scrutiny that a one-person company cannot govern, evidence or insure. Specifying it without that capacity is a reputational risk with no upside."],
  ]);

h2("7.3  The route that does work, and it starts in the UK");

rich([{ t: "Do not go to the Gulf. Go to the UK offices of the companies that are already in the Gulf. ", b: true },
  { t: "Hitachi Energy, Siemens Energy, Balfour Beatty, Laing O'Rourke, Mace, Jacobs, Bechtel and the major EPCs all run Gulf programmes from teams that include people sitting in Britain. A supplier who has delivered for the UK arm is a known quantity to the regional arm, introduced internally, with no licence required of them to be recommended." }]);

p("That route costs nothing extra. It is the same conversation with the same people, with a second question added once the first engagement is delivered: where else does this team operate, and who runs site services there. It converts the Gulf from a market entry problem into an account development problem, which is a problem this company can actually solve.");

note("This is why the Gulf sits at twenty per cent and why that twenty per cent is spent on positioning rather than pursuit. The unlock for the Gulf is not a Gulf strategy. It is a delivered UK engagement — which is what the sixty per cent is for.");

/* ================================================================== */
pageBreak();
h1("8. THE GULF — what the twenty per cent actually buys");

h2("8.1  Phase 1 · days 1 to 30");

bullet("Add one question to every UK conversation with a multinational: which regions does this team's work cover, and who owns site services there. Ask it once, late, and never as the purpose of the call.");
bullet("Register on supplier portals that do not require a local entity. Several manufacturer and EPC portals accept international suppliers at registration stage; registration is free and costs an hour. Never pay to be listed.");
bullet("Build the knowledge base rather than the pipeline: read the published procurement rules for the major programmes, and record what a supplier of this size would actually have to satisfy. Write it down once so the decision in month six is made on facts rather than impressions.");

h2("8.2  Phase 2 · days 31 to 60");

bullet("Identify the three UK-based individuals in the existing pipeline whose organisations run Gulf work, and record them as the bridge. Do not approach them about the Gulf yet.");
bullet("Establish, with an adviser and in writing, what a UK company would need to invoice a Gulf entity for consultancy delivered remotely from Britain. Remote delivery may not require local establishment; that is the question worth answering properly, because it changes the whole picture if the answer is favourable.");
bullet("No travel. No licence application. No local partner discussions.");

h2("8.3  Phase 3 · days 61 to 90");

bullet("With a delivered UK engagement in hand, ask one bridge contact whether the regional team would find the same work useful. One conversation, not a campaign.");
bullet("Decide, on the facts gathered, whether remote delivery for a Gulf entity is viable. Write the decision down with its reasons, whichever way it falls.");
richBullet([{ t: "The trigger for a real Gulf push, stated in advance: ", b: true },
  { t: "two delivered UK engagements, one of them for a multinational with regional operations, and a named internal introduction to that multinational's regional team. Until all three exist, the Gulf remains a twenty per cent positioning activity." }]);

/* ================================================================== */
h1("9. EUROPE — the twenty per cent, and the one route");

rich([{ t: "One route only: UK and Ireland headquartered contractors delivering on the continent, approached through their UK and Irish offices. ", b: true },
  { t: "No European entity, no translation, no travel, and no direct approach to a continental contractor in its own market." }]);

p("The data centre and pharmaceutical build-out across Frankfurt, Amsterdam, Dublin, Copenhagen and the Nordics is substantially delivered by contractors headquartered in Britain and Ireland. Their commercial teams sit in English-speaking offices, work to contract forms this company understands, and buy site services centrally. Alasdair Mackintosh at Exyte asked directly whether the company works UK only or across Europe — that question is the European strategy in miniature, and the answer is the one this plan supports: the United Kingdom today, and the continent alongside a contractor who is already there.");

h2("9.1  Why Europe is twenty per cent and not forty");

bullet("Every additional market costs the same scarce thing: the director's week. Twenty per cent is one day, and one day is enough to build a list, make ten approaches and answer a question that has already been asked. It is not enough to learn a procurement culture, and this plan does not pretend otherwise.");
bullet("The continental route that does not work at this stage is the direct one. A French or German contractor buying site services in its own market has no reason to select a British company with no local presence, no local references and no local language — and the cost of finding that out is months.");
bullet("The route that does work costs almost nothing, because it is the same conversation already being had in the United Kingdom with an additional question at the end of it.");
bullet("Ireland is the exception and is treated as an extension of the core market rather than as export: English-speaking, common law, a comparable safety regime, and a data centre cluster served by contractors who also build in Britain.");

h2("9.2  The ten, and how they are grouped");

table([2500, 5800],
  ["Group", "Why this group, and what to say to it"],
  [
    ["Irish EPC and M&E contractors building data centres across Europe",
     "The closest analogue to the core market. They hold compounds in Dublin, Frankfurt, Amsterdam and the Nordics, run UK and Irish commercial teams, and buy site services centrally. Approach on UK and Irish delivery; mention continental capability only if asked."],
    ["UK headquartered contractors with continental programmes",
     "Already on the UK target list. The European conversation is an extension of an existing relationship rather than a new approach, and it belongs after a UK engagement rather than before one."],
    ["International EPCs with UK offices, building in Europe",
     "Exyte is the live example and the question has already been asked. The answer is the United Kingdom today, with continental work alongside a contractor who is already there."],
    ["Developers and operators with pan-European portfolios",
     "Approached last and only with a reference in hand. They buy through their contractors, so the contractor relationship comes first."],
  ]);

h2("9.3  Phase 1 · days 1 to 30");
bullet("Reply to Alasdair Mackintosh: United Kingdom, stated plainly, with the door open to continental work delivered alongside a contractor. Do not overclaim European coverage to keep a conversation alive — it is the claim that ends it later.");
bullet("Build the target list: the UK and Ireland headquartered contractors and EPCs with live continental programmes. Ten organisations, named, with the right function identified in each.");

h2("9.4  Phase 2 · days 31 to 60");
bullet("Ten qualified approaches into that list, through UK and Irish offices, positioned on UK delivery with continental capability alongside them.");
bullet("Ireland specifically: English-speaking, common law, a comparable safety regime, and the Dublin data centre cluster. It is the least-cost first step outside Britain and it should be treated as an extension of the core market rather than as export.");

h2("9.5  Phase 3 · days 61 to 90");
bullet("With a UK reference in hand, ask one existing contact whether their continental team has the same problem.");
bullet("Establish the VAT and place-of-supply position for services delivered to an EU client before quoting one, not after. For business-to-business consultancy the general rule places supply where the customer belongs, which usually means no UK VAT and the customer accounting for it — but that is a question for the accountant with the specific facts, and a quote issued on an assumption about it is a quote that has to be withdrawn.");
bullet("Check whether the client requires a local establishment for invoicing or insurance purposes. Some do as a matter of policy rather than law, and finding out after a proposal has been accepted is the expensive way.");
bullet("Confirm the professional indemnity position for work delivered into another jurisdiction. UK policies frequently exclude it, and an exclusion discovered at claim stage is not a technicality.");
richBullet([{ t: "The trigger for increasing the European allocation: ", b: true },
  { t: "one delivered engagement for a contractor with continental operations, and that contractor asking whether the same work is available to their European team. Not a market study, not a conference — a client asking." }]);

/* ================================================================== */
pageBreak();
h1("10. Capacity, money and what has to be true");

h2("10.1  The binding constraint is one person");

p("This plan commits one working director to sixty per cent United Kingdom, twenty per cent Europe and twenty per cent Gulf. In a week that is roughly three days, one day and one day, and it only works because the Europe and Gulf allocations are deliberately low-intensity: a question added to a call, a list built, a registration completed, a position established in writing.");

richBullet([{ t: "During the first engagement, that allocation suspends. ", b: true },
  { t: "Delivery takes the whole week. A plan that assumes selling continues at full rate through delivery is a plan that produces a late first deliverable, and the first deliverable is the reference." }]);

h2("10.2  What this costs");

fillIn("Fill from the management information. The material lines are insurance, software and hosting, travel to meetings, accreditation applications, and the accountant's time. There is no marketing spend in this plan that is not already committed, and none is recommended before the first reference exists.");

h2("10.3  What has to be true for this plan to work");

bullet("The director produces the delivery record content. No part of this plan survives that not happening, and it is the only task nobody else can do.");
bullet("Three referees say yes.");
bullet("At least one of the two live referrals reaches a conversation with somebody who owns a compound budget.");
bullet("The first engagement is delivered to the standard the specimen sets. One disappointed first client is worse than no first client.");
bullet("The runway covers ninety days with no revenue. If it does not, that changes the plan and it should be said now rather than discovered in November.");

/* ================================================================== */
h1("11. The scoreboard");

p("Reviewed weekly. Seven numbers, and the first two are the only ones that matter before day 30.");

table([3900, 1450, 1450, 1500],
  ["Measure", "Day 30", "Day 60", "Day 90"],
  [
    ["Referees confirmed in writing", "3", "3", "3"],
    ["Priced proposals issued", "1", "3", "5"],
    ["Meetings with compound-holding buyers", "2", "4", "6"],
    ["Engagements instructed", "0", "1", "2"],
    ["Client references obtained", "0", "1", "1"],
    ["Qualified approaches, cumulative (UK)", "25", "50", "75"],
    ["Qualified approaches, cumulative (Europe)", "0", "10", "20"],
    ["Frameworks progressed or admitted", "1", "1", "2"],
    ["Gulf: bridge contacts identified", "0", "3", "3"],
  ], { size: 17 });

note("A scoreboard with nine rows is read weekly. A scoreboard with thirty rows is read once. If a row has not moved for three weeks, the question is not how to move it — it is whether it should be on the board.");

/* ================================================================== */
h1("12. What is deliberately not in this plan");

bullet("No paid advertising. With no reference and one deliverer, paid acquisition buys enquiries that cannot be converted or serviced.");
bullet("No second product. CONSTRUX and VERYX are real and they are not the wedge. One proposition, told the same way every time, until it has been sold once.");
bullet("No certification programme. ISO 9001 is worth pursuing when a buyer has said it is the blocker. None has.");
bullet("No hiring. The first engagement tells the company what the second person should be, and guessing before then is expensive.");
bullet("No Gulf entity, licence, local partner or travel. Section 7.");
bullet("No approach to GE Vernova beyond the single no-ask email already drafted. That decision stands until 2027 and it is a discipline, not a message.");

h1("13. Review and revision");

bullet("Weekly: the scoreboard, and nothing else. Fifteen minutes.");
bullet("Day 30, 60 and 90: the full plan, against the phase measures. Write down what was wrong about the last thirty days before planning the next thirty.");
richBullet([{ t: "Revise the weighting only on evidence, never on a bad week. ", b: true },
  { t: "The conditions that would justify moving effort out of the United Kingdom are written at section 3.1, in advance and in cold blood, precisely so that the decision is not made in the wrong mood." }]);

approval();
d.build().catch((err) => { console.error(err); process.exit(1); });
