/**
 * ETABLIX — company brief for an East African LNG programme. Word and PDF.
 *
 *   node business/opportunities/build-tanzania-brief.cjs
 *
 * WRITTEN FOR ONE READER. MZ Zaki asked for a brief profile to put in front of
 * his Country Manager in Tanzania. That Country Manager will spend four
 * minutes on it and will be looking for one thing: is this a real company with
 * something we do not already have, or is it a UK consultant who has read
 * about a large project.
 *
 * SO SECTION 4 IS THE MOST IMPORTANT SECTION AND IT IS THE ONE MOST BRIEFS
 * LEAVE OUT. ETABLIX has one working director, is newly trading, and has
 * delivered no engagement under its own name. On a 42 billion dollar
 * programme that is a very small company indeed, and a brief that hides it is
 * one phone call from being found out — on a continent where the introduction
 * came through a personal relationship that would not survive it.
 *
 * Stated plainly, the same facts become the reason the commercial proposal at
 * section 5 makes sense: ETABLIX brings a method and a specification
 * discipline, a local partner brings entity, people, plant and standing. That
 * is a partnership a Country Manager can evaluate. "We can do it all" from a
 * company of one is not.
 *
 * WHAT IS DELIBERATELY NOT IN THIS DOCUMENT:
 *   - any claim to a current client, contract or relationship with GE Vernova
 *     or any other named organisation. There is none.
 *   - any assertion about the status, partners or programme of the Tanzanian
 *     project. The brief speaks about LNG megaprojects generally, because that
 *     is what can be said accurately from here.
 *   - any figure for fees. Pricing is quoted to a named recipient in a
 *     meeting, never in a document that will be forwarded.
 *
 * SECTION 6 IS THERE ON PURPOSE. A UK company pursuing work on a government-
 * linked megaproject through an intermediary carries Bribery Act 2010 section
 * 7 exposure wherever in the world the conduct happens. Raising it first,
 * unprompted, is both the correct thing to do and a genuine differentiator
 * with international oil company partners who run their own compliance
 * regimes and will ask.
 */
const B = require("../policies/brand.cjs");

const REV = "1";
const d = B.doc({
  slug: "Company-Brief-LNG-Programme",
  running: "Company brief — site establishment on an LNG programme",
  kicker: "COMPANY BRIEF",
  title: "SITE ESTABLISHMENT",
  sub: "the cost line with no owner, on a programme where it is very large",
  rev: REV,
  outDir: __dirname,
  kind: "brief",
  control: [
    ["Document", "Company brief — site establishment and site services"],
    ["Prepared for", "[name], Country Manager, [organisation], Tanzania"],
    ["At the request of", "[name], [organisation]"],
    ["Company", "JNN GLOBAL LTD, trading as ETABLIX · Company No. 15405437 · England and Wales"],
    ["Contact", "[name], Managing Director · [email] · [telephone]"],
    ["Date", "[date]"],
    ["Status", "Introductory. Not a proposal, not a quotation, and not a claim to any appointment."],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ------------------------------------------------------------------ */
h1("1. The problem this company exists to solve");

rich([{ t: "On a major project the permanent works have an owner, a designer, a programme and a budget that somebody defends. The temporary site does not. ", b: true },
  { t: "The compound, welfare, temporary power and water, access roads, laydown, waste, security, transport and workforce accommodation are priced from the last project by somebody who will not run this one, inherited by somebody who was not asked, and tested for the first time in the week the site opens." }]);

p("It is rarely a competence problem. It is that the number is set at bid stage, when everybody senior is working on the permanent works, and it is not revisited until it is too late to change cheaply. On a large programme the contractor then finds itself managing twenty or more site subcontractors — none of them core to the work it was appointed to do, all of them consuming the attention of the people who should be building.");

note("That is the opening of every conversation this company has, and it is the observation that started the conversation this brief was requested from. It is not a new idea. What is unusual is treating it as a discipline with a deliverable rather than as something that gets absorbed.");

/* ------------------------------------------------------------------ */
h1("2. What ETABLIX does");

table([2600, 5700],
  ["", ""],
  [
    ["Specify", "Produce the site establishment requirement from the programme, the location and the actual workforce — not from a benchmark rate. Compound, welfare, temporary power and water, access, laydown, logistics, waste, security, accommodation."],
    ["Quantify", "Build the demand model that sits under it: people by month, power by phase, water, waste, movements. A number that can be defended line by line to a client, a lender or an auditor."],
    ["Tender", "Scope the packages, run the enquiries, compare bids on a genuine like-for-like basis and recommend the award with the comparison shown."],
    ["Control", "Manage supplier performance against the specification for the life of the programme, and report it monthly against the demand model rather than against last month."],
  ]);

richBullet([{ t: "The commercial model matters more than the service list. ", b: true },
  { t: "Under the standard arrangement the client contracts directly with every supplier and pays them directly. ETABLIX holds no supply chain money and takes no margin on a supplier. That is what makes the comparison a genuine one, and it is what a lender or a joint venture partner will want to see before it will accept a recommendation from an adviser." }]);

p("The point of the exercise is simple: the contractor gets its senior people back onto the work it was appointed to do, and the client gets a site cost that was worked out rather than inherited.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("3. Why this matters more on an LNG programme than on most");

p("The following are general properties of large LNG construction, offered as the basis on which a conversation would be useful rather than as any statement about the status or arrangements of a particular project.");

table([2600, 5700],
  ["Feature of the work", "What it does to site establishment"],
  [
    ["A remote site with a small local supply chain",
     "Almost nothing can be procured reactively. What is not planned twelve to eighteen months out is either flown in at cost or not there. This is the single largest difference from a project in a developed industrial area, and it is the one most often underestimated by teams whose experience is the latter."],
    ["A peak workforce far beyond the local catchment",
     "A construction camp becomes a small town: accommodation, catering, potable water, sewage, medical, transport, recreation, security. It is a project in its own right and it is usually appended to somebody else's scope."],
    ["Long marine and road logistics",
     "Every laydown decision is a logistics decision. Getting the sequence wrong is not inefficiency, it is double handling of items that cannot be double handled."],
    ["Many contractors on one site at once",
     "Shared roads, shared power, shared welfare, shared security, shared waste. Specified separately by each party, they compete for the same regional capacity and the last to ask pays most for least."],
    ["International partners with their own assurance regimes",
     "Traceable specifications, auditable comparisons and documented award recommendations are not administrative overhead on this kind of programme. They are a condition of the money."],
  ]);

richBullet([{ t: "The one that is worth the most and is hardest to recover: whoever specifies the establishment across the whole site, rather than package by package, saves more than any individual negotiation will. ", b: true },
  { t: "One camp, one power strategy, one logistics plan, one security arrangement, procured once. Five contractors procuring five of each is the normal outcome and it is entirely avoidable — but only before the packages are let." }]);

/* ------------------------------------------------------------------ */
pageBreak();
h1("4. What ETABLIX is today, stated plainly");

rich([{ t: "This section is here because your Country Manager will find it out in one telephone call, and it is better read here. ", b: true },
  { t: "Nothing in this brief is worth anything if the first thing checked turns out to be overstated." }]);

table([2600, 5700],
  ["", ""],
  [
    ["The company", "JNN GLOBAL LTD, trading as ETABLIX. Registered in England and Wales, company number 15405437. Newly trading."],
    ["People", "One working director. No other employees. No offices outside the United Kingdom, no entity in Tanzania, no plant and no directly employed labour anywhere."],
    ["Delivered engagements under the company's name", "None to date. The company has not yet completed a client engagement in its own name, and does not present work performed by other organisations as its own."],
    ["The record behind it", "[The director's personal record: employer, role, dates, scheme type, value and the scope personally held. Referees who will confirm it in writing, and who have agreed to.]"],
    ["Insurance", "[Professional indemnity and public liability — insurer, limit, expiry. Employers' liability: exempt while the only employee is a director holding more than half the shares.]"],
    ["Certification", "None. The company holds no ISO or equivalent certification and makes no claim to any."],
  ]);

fillIn("Fill the record and insurance rows from the actual documents before this brief is sent. A brief with a blank in a row a reader was going to check is worse than one that is short.");

note("A company of this size cannot deliver site establishment on a programme of this scale alone, and does not propose to. What it can do is specify it, price it, procure it and control it — which is a different job from performing it, and the one that is usually nobody's.");

/* ------------------------------------------------------------------ */
h1("5. How this could work, in order of realism");

table([1100, 3000, 4200],
  ["", "Arrangement", "What each side brings"],
  [
    ["A", "ETABLIX as specification and procurement adviser to a local delivery partner",
     "ETABLIX: the requirement, the demand model, the packages, the comparison, the award recommendation and monthly control. The partner: entity, licences, people, plant, local supply chain, and the standing to hold contracts in country. THE MOST REALISTIC AND THE FASTEST TO TEST."],
    ["B", "A single-site diagnostic, bought on its own",
     "One site, a fixed scope, a short duration, and a written report that either tells the reader something they did not know or does not. It is deliberately small: it is the cheapest way for both sides to find out whether the method is worth anything, before anyone commits to more."],
    ["C", "A joint bid for a site services package",
     "Only once A or B has been done. A joint bid between parties who have not worked together is a bid with an untested interface inside it, which is precisely the thing this company exists to warn against."],
  ]);

richBullet([{ t: "The recommendation is B, then A. ", b: true },
  { t: "One diagnostic on one site, delivered and judged on its own merits, is worth more to both parties than any amount of discussion — and it puts the risk on ETABLIX rather than on your colleague, which is where it belongs at this stage." }]);

/* ------------------------------------------------------------------ */
h1("6. Governance, raised before anyone asks");

p("ETABLIX is a United Kingdom company. The Bribery Act 2010 applies to it wherever in the world it or anyone acting on its behalf operates, including the section 7 offence of failing to prevent bribery by an associated person. The company has a published anti-bribery and corruption policy and works to it.");

bullet("No facilitation payments, of any size, in any country, for any reason. There is no threshold below which it is acceptable and no commercial outcome that justifies it.");
bullet("Any agent, introducer or representative is engaged in writing, on a stated scope, for a stated fee, after due diligence — and is never paid a success fee structured so that nobody can see what was done for it.");
bullet("ETABLIX recommends awards; it does not make them and it holds no supply chain money. The comparison behind every recommendation is documented and issued to the client, which is the practical control on the risk that a specification is written so only one supplier can meet it.");

note("This is raised first rather than answered later because international partners on programmes of this kind run their own compliance regimes and will ask. A UK counterparty that brought it up unprompted is easier to clear than one that waited to be asked.");

/* ------------------------------------------------------------------ */
h1("7. What is proposed next");

table([1100, 7200],
  ["", ""],
  [
    ["1", "A call with the Country Manager. Thirty minutes, no material required in advance beyond this brief."],
    ["2", "If the conversation is useful: one site, one diagnostic, a fixed scope and a fixed duration, with the report judged on whether it says anything the team did not already know."],
    ["3", "If it does not: that is a complete answer and this company will not pursue it further. An introduction through a personal relationship is worth more than a contract and will not be spent chasing one."],
  ]);

fillIn("Add the director's availability for a call in the next fortnight, with time zone stated. A brief that ends in 'let me know' ends.");

approval();
d.build().then(() => {
  console.log("\nBEFORE SENDING");
  console.log("  - section 4: the director's record, the referees, and the insurance rows");
  console.log("  - control table: the reader's name, the organisation, and the date");
  console.log("  - section 7: availability for a call, with the time zone");
  console.log("\n  NOT IN THIS DOCUMENT, DELIBERATELY: any current relationship with GE");
  console.log("  Vernova or any other named organisation; any assertion about the status or");
  console.log("  partners of the Tanzanian project; and any fee. All three would be checked.");
}).catch((err) => { console.error(err); process.exit(1); });
