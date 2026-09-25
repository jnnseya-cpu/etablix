/**
 * ETABLIX — Modern Slavery and Human Trafficking Statement. Word and PDF.
 *
 *   node business/policies/build-modern-slavery.cjs
 *
 * PUBLISHED VOLUNTARILY. Section 54 of the Modern Slavery Act 2015 applies to
 * commercial organisations carrying on business in the UK with a total annual
 * turnover of £36 million or more. ETABLIX is far below that, so no statement
 * is required and none is overdue.
 *
 * It is written anyway for one reason that is commercial and one that is not.
 * The commercial one: buyers now ask regardless of threshold, and "not
 * applicable to us" scores nothing where a statement scores something. The
 * other one: the risk is real in this company's actual supply chain, and the
 * threshold has no bearing on that.
 *
 * SECTION 4 IS THE PART THAT IS OURS, and it is the reason this is not a
 * template. The categories ETABLIX specifies and procures — welfare,
 * accommodation, security, cleaning, waste, catering, cabin hire, plant and
 * labour supply — are among those in UK construction where labour
 * exploitation is most often found. And ETABLIX writes the specification and
 * recommends the award, which means it has more influence over who ends up on
 * a site, and on what terms, than its size suggests. A company with no
 * employees beyond its director has almost no internal exposure and an
 * unusual amount of external leverage. Saying that plainly is the statement.
 *
 * SECTION 9 STATES WHAT IS NOT IN PLACE, including the one a reader would
 * otherwise discover: there have been no engagements yet, so there is nothing
 * to measure and no audit has been performed. A statement claiming
 * effectiveness data it cannot have is worth less than one that says so.
 *
 * The six headings at sections 3 to 8 are the ones section 54(5) suggests, in
 * the order it suggests them, so that a reader checking this against the Act
 * can find each one.
 */
const B = require("./brand.cjs");

const REV = "1";
const THRESHOLD = "£36 million";
const HELPLINE = "08000 121 700";

const d = B.doc({
  slug: "Modern-Slavery-Statement",
  running: "Modern Slavery and Human Trafficking Statement",
  kicker: "MODERN SLAVERY AND HUMAN TRAFFICKING",
  title: "STATEMENT",
  sub: "published voluntarily — the duty does not apply, the risk does",
  rev: REV,
  control: [
    ["Document", "Modern Slavery and Human Trafficking Statement"],
    ["Revision", REV],
    ["Financial year", "[financial year this statement covers]"],
    ["Date of issue", "[date]"],
    ["Next review", "[date of issue + 12 months, or on any material change]"],
    ["Owner", "[name], Managing Director"],
    ["Approved by", "[name], Managing Director, on behalf of the board"],
    ["Basis", `Voluntary. Section 54 Modern Slavery Act 2015 applies at ${THRESHOLD} turnover; ETABLIX is below it.`],
    ["Applies to", "Every person acting for or on behalf of ETABLIX, and every supplier ETABLIX specifies, recommends or engages"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ------------------------------------------------------------------ */
h1("1. Position");

rich([
  { t: "ETABLIX does not tolerate slavery, servitude, forced or compulsory labour, or human trafficking in any part of its business or in any supply chain it specifies, recommends or manages. ", b: true },
  { t: "There is no commercial outcome that justifies it, no price that makes it acceptable, and no client instruction that authorises it. Where it is found, the work stops and it is reported — to the client, and to the authorities where the threshold for that is met." },
]);

p("JNN GLOBAL LTD, trading as ETABLIX, is a company with one working director and no other employees. That makes this statement shorter than a main contractor's. It does not make it weaker, and it does not make the risk smaller, because almost none of the risk sits inside this company.");

h2("1.1  Why this statement exists when the law does not require it");

table([2400, 5900],
  ["", ""],
  [
    ["The duty", `Section 54 of the Modern Slavery Act 2015 requires a slavery and human trafficking statement from a commercial organisation carrying on business in the United Kingdom with a total annual turnover of ${THRESHOLD} or more.`],
    ["ETABLIX", "Is below that threshold, by a wide margin. No statement is required, none is overdue, and the company is not in breach of section 54."],
    ["So why publish", "Because the threshold measures turnover, not exposure. ETABLIX buys nothing at scale and specifies a great deal — and what it specifies is bought by somebody. A statement that waits for £36 million of turnover waits past the point at which it could have made a difference."],
    ["And when the threshold is met", "This statement is brought within section 54 in the financial year the threshold is reached: approved by the board, signed by a director, and published with a prominent link on the homepage, as section 54(6) and (7) require."],
  ]);

note("Nothing in this statement should be read as a claim that ETABLIX is subject to section 54. It is not. It is published because the company would rather be asked about this document than about its absence.");

/* ------------------------------------------------------------------ */
h1("2. What the law prohibits");

p("So that the rest of this statement is read against the offences rather than against a general sense of disapproval.");

table([2100, 6200],
  ["Modern Slavery Act 2015", "The offence"],
  [
    ["Section 1", "Holding another person in slavery or servitude, or requiring another person to perform forced or compulsory labour."],
    ["Section 2", "Arranging or facilitating the travel of another person with a view to their exploitation — human trafficking. Consent is irrelevant where the person is a child, and does not by itself prevent the offence in any case."],
    ["Section 3", "The meaning of exploitation: slavery and forced labour, sexual exploitation, removal of organs, securing services by force, threats or deception, and securing services from children and vulnerable persons."],
    ["Section 4", "Committing an offence with intent to commit an offence under section 2."],
  ]);

p("Debt bondage, the withholding of identity documents, the charging of recruitment fees to the worker, accommodation tied to employment in a way the worker cannot leave, and wages paid to somebody other than the worker are the forms these offences most often take on a construction site. They are the forms this statement is written against.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("3. Structure, business and supply chains");

h2("3.1  The organisation");

table([2400, 5900],
  ["", ""],
  [
    ["Legal entity", "JNN GLOBAL LTD, trading as ETABLIX. [Company number]. Registered in England and Wales."],
    ["Countries of operation", "United Kingdom."],
    ["People", "One working director. No other employees, no agency workers, no overseas operations, no manufacturing, no direct labour."],
    ["What it sells", "Specification, procurement management and control of temporary site establishment and site services: site compounds, welfare, temporary power and water, access, logistics, security and the associated supply chain."],
  ]);

fillIn("Replace the bracketed entries above with the registered company number and confirm the trading arrangement is stated as it appears at Companies House. A statement that gets its own legal entity wrong is read differently from one that does not.");

h2("3.2  The supply chain this statement is actually about");

rich([{ t: "ETABLIX has almost no supply chain of its own. It has substantial influence over other people's. ", b: true },
  { t: "That distinction is the whole of this document. The company buys a laptop, some software and professional services. What it specifies, runs enquiries for, compares and recommends is bought by the client — and it is bought in categories where labour exploitation in UK construction is most often found." }]);

table([2600, 5700],
  ["Category ETABLIX specifies", "Why it carries risk"],
  [
    ["Labour supply and general operatives", "Agency and sub-agency layers, short engagements, cash-in-hand pressure, and a workforce that frequently does not have English as a first language. The highest-risk category in this list."],
    ["Security", "Long shifts, lone working, low margins, and a licensing regime that covers the individual rather than the terms they work under."],
    ["Cleaning and welfare servicing", "Low-margin, high-turnover, frequently subcontracted twice before anyone arrives on site, and largely invisible to the main contractor's own systems."],
    ["Accommodation for a non-local workforce", "Where accommodation is arranged by the employer, deductions and tied tenancy can create a debt the worker cannot leave. The mechanism of debt bondage does not require anyone to intend it."],
    ["Waste and recycling", "Known enforcement history in the sector, and a chain that often ends somewhere nobody on site can name."],
    ["Catering", "Short hours, informal engagement, and the same double-subcontracting pattern as cleaning."],
    ["Cabin hire, plant and haulage", "Lower risk in the supply, higher in the delivery, installation and driver arrangements underneath it."],
  ]);

note("This table is not a general list of high-risk sectors copied from guidance. It is the list of things ETABLIX actually specifies, which is why it is short and why every row is one the company will have to look at.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("4. Risk assessment — where the exposure genuinely is");

rich([{ t: "Internal risk: close to nil. External influence: greater than the company's size suggests. ", b: true },
  { t: "One working director, engaged directly, paid through PAYE, with no recruitment intermediary anywhere in the arrangement. There is no plausible route to exploitation inside this company, and saying otherwise to appear diligent would be the tell." }]);

p("The exposure is in the second sentence of that paragraph, and it is not a small one. ETABLIX writes the specification, scopes the packages, runs the enquiries, normalises the comparison and recommends the award. A company doing that decides, in practice, who gets on site and on what commercial terms — and the commercial terms are where exploitation becomes possible.");

h2("4.1  The mechanism that matters most, stated plainly");

rich([{ t: "The specification sets the price, and the price sets the terms. ", b: true },
  { t: "A cleaning or security package specified at a rate that cannot be delivered lawfully will still attract bidders, and the ones who bid it are the ones who intend to recover the difference somewhere. That somewhere is wages, hours, deductions or accommodation. Nobody has to intend any harm for this to happen — a benchmark rate carried forward from a job three years ago will do it on its own." }]);

p("So the first control in this statement is not a clause in a contract. It is that ETABLIX builds rates from the programme, the location and the actual labour requirement rather than from a benchmark, and declines to specify a package at a rate it cannot see being delivered lawfully. That is the same discipline the company sells, applied to this risk.");

h2("4.2  The second mechanism: the tier nobody sees");

p("A main contractor knows its subcontractor. It frequently does not know its subcontractor's subcontractor, and the cleaning operative on a night shift is usually two tiers below the party that holds the contract. Risk concentrates exactly where visibility stops. Every requirement in section 6 is written to apply down the chain rather than at the first tier, because a first-tier-only requirement is a requirement aimed at the tier that was never the problem.");

/* ------------------------------------------------------------------ */
h1("5. Policies");

p("This statement sits alongside the following, each published and each available on request:");

table([2900, 5400],
  ["Policy", "What it contributes here"],
  [
    ["Anti-Bribery and Corruption Policy", "The specification-written-for-one-supplier risk is named there and it is the same mechanism as the rate-set-too-low risk named here: an award decided by something other than the merits."],
    ["Health and Safety Policy", "Conditions on site, and the reporting route for anything seen there."],
    ["Quality Management Arrangements", "How a specification is produced, checked and issued — which is where the rate discipline at 4.1 is actually enforced."],
    ["Equality, Diversity and Inclusion Policy", "Treatment of workers, and the recognition that the workers most exposed here are frequently the ones least able to complain."],
    ["Occupational Health Policy", "Hours, fatigue and welfare provision."],
    ["Environmental Policy", "Waste chains, which are a shared risk surface with this statement."],
  ]);

fillIn("Confirm each policy in this table exists and is current before issuing this statement. A cross-reference to a document that cannot be produced is worse than no cross-reference.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("6. Due diligence — the standing conditions");

rich([{ t: "These are conditions on any supplier ETABLIX specifies, recommends or engages, and they apply at every tier rather than only the first. ", b: true },
  { t: "They are written as short, checkable facts on purpose. A requirement that cannot be verified in a single question is a requirement nobody verifies." }]);

table([600, 3400, 4300],
  ["", "The condition", "How it is checked"],
  [
    ["1", "Right to work is checked and held by the employer of record for every person on site under the package.",
     "Confirmed in writing at enquiry stage and named in the award recommendation. Spot-checked on site against the actual workforce, not against a list supplied in advance."],
    ["2", "Wages are paid into a bank account held in the worker's own name.",
     "A single account receiving several workers' pay is the clearest indicator available and the easiest to ask about. Confirmed in writing; asked about again on site."],
    ["3", "No fee of any kind is charged to a worker for finding, obtaining or keeping work.",
     "Prohibited by the Conduct of Employment Agencies and Employment Businesses Regulations 2003 in any event. Asked of the supplier in writing and asked of workers directly where the opportunity arises."],
    ["4", "Where accommodation is arranged or provided, it is not tied to employment in a way that creates a debt, and deductions are lawful, itemised and agreed in advance.",
     "The arrangement is obtained in writing before award, not after. This is the condition most often absent and the one that most often matters."],
    ["5", "Identity documents remain with the worker at all times.",
     "Stated as an award condition. Retention of documents by an employer is asked about directly on every site visit."],
    ["6", "The supplier flows these five conditions down to any party it subcontracts the work to, in writing.",
     "Required as a term of the award recommendation. Section 4.2 is the reason this row exists."],
  ], { size: 16 });

h2("6.1  At each stage of an engagement");

table([2200, 6100],
  ["Stage", "What happens"],
  [
    ["Specification", "The rate is built from the programme, the location and the labour requirement. A package is not specified at a rate the director cannot see being delivered lawfully. Where the client insists on such a rate, the disagreement is recorded in writing in the deliverable."],
    ["Enquiry", "The six conditions are issued with the enquiry documents, not raised after selection. A supplier that cannot accept them at enquiry stage is not compared."],
    ["Comparison and recommendation", "Acceptance of the six conditions is recorded against each bidder in the comparison issued to the client. A bid that is cheaper because it has not accepted them is identified as such rather than simply ranked first."],
    ["Award", "The client makes the award and the client contracts directly with the supplier. ETABLIX records what it recommended and on what conditions."],
    ["On site", "Conditions 1, 2 and 5 are asked about in person during any site attendance, of workers where the opportunity arises rather than only of managers."],
    ["Anything found", "Section 8. The work stops and it is reported. There is no stage at which a finding is managed quietly to protect a programme."],
  ]);

note("ETABLIX recommends and the client pays. That is a limit on this company's control and it is stated rather than obscured: ETABLIX cannot terminate a supplier it did not contract with. What it can do is refuse to recommend, record why, and tell the client — and under this statement it does all three.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("7. Training");

p("In a company of one working director, training is the director's own and there is nobody to delegate it to. Stating that is more useful than describing a programme that does not exist.");

table([3000, 5300],
  ["", ""],
  [
    ["Completed", "[Name and date each course, briefing or module actually completed. If none has been completed, write 'none to date' and complete the row below. Do not list a course that was started.]"],
    ["Planned, with a date", "[Name the training and the date by which it will be done. A commitment without a date is not a commitment.]"],
    ["On every engagement", "The six conditions at section 6 are re-read before an enquiry is issued. This is the practical substitute for a training programme and it is deliberately a step in the work rather than an annual event."],
    ["For suppliers", "The six conditions are issued with the enquiry, which for a small supplier is frequently the first time anyone has put them in writing. That is the training this company is actually in a position to deliver."],
  ]);

fillIn("Fill both bracketed rows honestly before issue. 'None to date, and the following is booked for [date]' is a credible answer from a company at this stage. A list of courses nobody attended is not, and it is the kind of thing that gets checked.");

/* ------------------------------------------------------------------ */
h1("8. Reporting a concern");

rich([{ t: "Anyone — a worker, a supplier, a client's staff, a member of the public — may raise a concern, and may do so anonymously. ", b: true },
  { t: "No person raising a concern in good faith will suffer any detriment from ETABLIX, and that protection applies whether or not the concern turns out to be well founded." }]);

table([2600, 5700],
  ["Route", "Detail"],
  [
    ["ETABLIX", "[email address] · [telephone]. Direct to the Managing Director, because there is no one else and pretending otherwise would be false."],
    ["Modern Slavery and Exploitation Helpline", `${HELPLINE}. Independent, confidential, 24 hours. Run by the charity Unseen, not by government or by any employer.`],
    ["Police", "999 where a person is in immediate danger. 101 otherwise."],
    ["Gangmasters and Labour Abuse Authority", "For labour exploitation and labour abuse. Its enforcement remit extends across sectors, and a concern does not have to fall within its licensing scheme to be reported to it."],
    ["The client", "Where the concern touches a package on a client's site, the client is told. That is not negotiable and it is not delayed to allow a supplier to correct the position first."],
  ]);

note("Suspicion is enough to report. A person raising a concern is not required to have evidence, to be certain, or to have identified an offence — establishing that is the authorities' job, and waiting for certainty is how these things continue.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("9. Effectiveness, and what is not in place");

rich([{ t: "ETABLIX has not yet performed a client engagement, so there is nothing to measure and no audit has been carried out. ", b: true },
  { t: "A first statement that reports effectiveness data is reporting something it cannot have. What follows is what will be measured, from the first engagement, and it is stated now so that the second revision of this statement can be checked against it." }]);

h2("9.1  What will be measured, from engagement one");

table([4300, 4000],
  ["Indicator", "Why this one"],
  [
    ["Packages specified, and the number where the six conditions were issued with the enquiry", "Should be identical. Any gap is a process failure and is visible immediately."],
    ["Suppliers that declined or qualified any of the six conditions", "The most informative number in this table. A rate that produces several qualifications is a rate set too low — section 4.1, caught by data rather than by judgement."],
    ["Site attendances at which conditions 1, 2 and 5 were asked about in person", "Distinguishes a document from a practice."],
    ["Concerns raised, and what happened to each", "Reported whether or not any were substantiated. Zero concerns in a year is not automatically a good result; it may mean nobody knew how to raise one."],
    ["Awards where ETABLIX recommended against the cheapest bid on these grounds", "The test of whether this statement costs the company anything. If it never does, it is not being applied."],
  ]);

h2("9.2  What is not in place");

p("Listed because a reader who finds a sixth item after being shown five stops believing the five.");

bullet("No engagement has been delivered, so every process in section 6 is designed and none is proven. The first engagement is where that changes.");
bullet("No supplier audit has been carried out, and no audit programme exists. Audits are described here as checks at enquiry, award and site attendance, which is what a company of this size can actually do — not as a programme of independent supplier audits it cannot.");
bullet("There is no segregation of duties. The person who writes the specification, runs the enquiry and recommends the award is the same person. The control is that the comparison and the conditions accepted by each bidder are documented and issued to the client, and the client makes the award.");
bullet("ETABLIX holds no certification relevant to this statement, and makes no claim to any.");
bullet("Visibility below the second tier of a supply chain the company does not contract with is limited, and condition 6 at section 6 is a flow-down requirement rather than a guarantee of sight.");

fillIn("Add anything else that is true at the date of issue. Resist stopping the list early.");

/* ------------------------------------------------------------------ */
h1("10. Approval and publication");

p("This statement is made for the financial year stated in the control table. It is approved by the board of JNN GLOBAL LTD and signed by a director — the form section 54(6) requires, followed here although the section does not yet apply, so that nothing has to change when it does.");

table([2900, 5400],
  ["", ""],
  [
    ["Published at", "[URL], with a link in a prominent place on the homepage — the requirement at section 54(7), met voluntarily."],
    ["Registry", "Submitted to the UK government's modern slavery statement registry. The registry accepts voluntary submissions from organisations below the threshold, and a statement that is published but not findable does less than it could."],
    ["Review", "Annually, and on any material change to the business or its supply chains — whichever comes first."],
    ["Superseded", "Each revision states the year it covers. Earlier revisions are retained rather than replaced, so the direction of travel can be read."],
  ]);

fillIn("Insert the published URL once the page exists, and register the statement. Both are ten-minute tasks and both are what turn this from a document into an answer.");

approval();
d.build().then(() => {
  console.log("\nBEFORE ISSUE");
  console.log("  - company number, trading name and financial year into the control table");
  console.log("  - section 7: training completed, or 'none to date' plus a booked date");
  console.log("  - section 8: the email address and telephone number");
  console.log("  - section 5: confirm all six cross-referenced policies exist and are current");
  console.log("  - section 10: publish, link from the homepage, submit to the registry");
  console.log("  - board approval and a director's signature, then the date of issue");
}).catch((err) => { console.error(err); process.exit(1); });
