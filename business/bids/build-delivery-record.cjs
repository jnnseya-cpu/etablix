/**
 * ETABLIX — Delivery record and capability. Word and PDF.
 *
 *   node business/bids/build-delivery-record.cjs
 *   → business/bids/ETABLIX-Delivery-Record.docx and .pdf
 *
 * This document exists because two people asked for the same thing in the
 * same week, and neither of them can be given what they literally asked for.
 *
 *   CHIC returned the DPS application saying the technical and professional
 *   ability detail was insufficient, and invited client testimonials and
 *   referees.
 *
 *   Jamie Holiday at Hitachi Energy asked for case studies demonstrating the
 *   services available through ETABLIX.
 *
 * ETABLIX has no client case studies, because it has not yet delivered a
 * client engagement under its own name. Inventing them is not on the table at
 * any price. What exists instead is the director's delivery record from
 * employment, which is real, dated, and verifiable against the employer named
 * beside it — and for the consultant appointments this company is bidding for,
 * the organisation's capability IS the named individual's competence.
 *
 * So the document says that in its first section, in plain words, before it
 * says anything else. A buyer who is told the gap believes the rest. A buyer
 * who finds the gap believes nothing.
 *
 * EVERY ITALIC LINE IS A FIELD TO FILL. Nothing in this file invents a
 * project, a date, a value, a headcount or a name, and nothing added to it
 * ever should. If a figure cannot be defended in a meeting, leave it out and
 * say it is not recorded.
 */
const path = require("path");
const B = require("../policies/brand.cjs");

const REV = "1";
const PROJECTS = 3;   // CHIC SQ 6.1 asks for up to three. Three is the target.

const d = B.doc({
  slug: "Delivery-Record",
  running: "Delivery record and capability",
  kicker: "DELIVERY RECORD",
  title: "AND CAPABILITY",
  sub: "the schemes, the scope, and who can confirm it",
  rev: REV,
  outDir: __dirname,
  kind: "document",
  control: [
    ["Document", "Delivery record and capability"],
    ["Revision", REV],
    ["Date of issue", "[date]"],
    ["Prepared by", "Justin Nseya, Director"],
    ["Company", "JNN GLOBAL LTD, trading as ETABLIX · company number 15405437"],
    ["Basis", "Director's record from employment. Verifiable against the employer named."],
    ["Issued to", "[recipient organisation]"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ------------------------------------------------------------------ */
h1("1. What this document is, and what it is not");

rich([
  { t: "ETABLIX is a new company. It does not yet hold client case studies of its own, and this document does not pretend otherwise. ", b: true },
  { t: "JNN GLOBAL LTD was incorporated in 2024 and trades as ETABLIX. It has not yet completed a client engagement under its own name, so there is no client to quote, no completed contract to cite and no testimonial to reproduce." },
]);

p("What exists instead is the delivery record of the person who will do the work. Every scheme in section 3 was delivered by the director as an employee of the organisation named against it, in the role stated, on the dates stated. None of it is claimed as an ETABLIX contract, and every item can be confirmed by the referee listed beside it.");

p("That distinction matters and it is made deliberately. The appointments this company is bidding for — project manager, employer's agent, clerk of works, CDM co-ordinator, and site establishment specification — are personal-competence appointments. The capability of the organisation is the competence of the named individual, and a buyer assessing them is assessing a person. A record of what that person has actually run is the relevant evidence. A case study invented for a company that has not yet traded is not evidence of anything.");

note("Stating the gap in the first paragraph is not modesty and it is not a tactic. It is that everything else in this document becomes checkable, and therefore worth something. A buyer who is told the gap believes the rest of the pack. A buyer who discovers the gap believes none of it.");

/* ------------------------------------------------------------------ */
h1("2. What ETABLIX does");

fillIn("Three short paragraphs. What the company does, who for, and what the client receives. No adjectives that cannot be tested — remove 'leading', 'innovative', 'world-class' and anything like them. Write it so a supply chain manager who reads nothing else knows whether to forward it.");

fillIn("Paragraph one: the problem. What goes wrong with site establishment when it is priced from a benchmark rather than worked out from the programme and the location.");

fillIn("Paragraph two: what the company does about it. The diagnostic, what it examines, and what the client gets at the end — a specification, a quantified requirement, and a number that can be defended.");

fillIn("Paragraph three: where it sits commercially. Single point of responsibility for site establishment rather than a set of separate subcontracts, and the point in the programme at which the work has to happen for it to be worth anything — which is bid stage, before the fence goes up.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("3. The delivery record");

p("Each entry below records a scheme the director delivered as an employee, the scope he was personally accountable for, and a referee who can confirm it. The employer is named in every case. No entry is presented as a contract held by ETABLIX.");

fillIn("Fill one block per scheme, strongest first. Three is the target — CHIC asks for up to three contract examples and three is what a procurement assessor expects. Two well-evidenced entries beat three where the last is thin.");

for (let i = 1; i <= PROJECTS; i += 1) {
  h2(`3.${i}  [Scheme name, or a description where the contract is confidential]`);

  fillIn("Where an NDA or a contract confidentiality clause prevents naming the scheme, describe it precisely instead — for example 'a 400 kV substation extension for a UK transmission owner'. That is honest and still specific. Never name a client you are not free to name, and never imply permission you do not have.");

  table([2900, 6100],
    ["Field", "Entry"],
    [
      ["Scheme", "[name, or the description above]"],
      ["Employer at the time", "[the organisation that employed you — named]"],
      ["Ultimate client", "[transmission owner, developer or utility, where you may say]"],
      ["Location", "[county or region — the labour catchment matters more than the postcode]"],
      ["Dates", "[month and year, from and to]"],
      ["Construction value of the scheme", "[£, or 'not disclosed' if you may not say]"],
      ["Value of the scope you were accountable for", "[£ — this is the number that sizes your record]"],
      ["Your role", "[the title you actually held]"],
      ["Reporting to", "[role, not necessarily a name]"],
      ["Peak workforce on site", "[number — the establishment driver]"],
      ["Duration of the establishment phase", "[weeks from possession to first productive shift]"],
    ]);

  p("Scope delivered");
  fillIn("Four to eight bullets. Only what you were personally accountable for. Write the verb you actually did — specified, procured, negotiated, managed, closed out — not 'was involved in'. If a buyer could not tell from the bullet whether you led it or watched it, rewrite the bullet.");
  bullet("[e.g. Specified and procured the welfare, accommodation and catering provision for a peak of NN operatives across a NN-week programme]");
  bullet("[e.g. Negotiated and let NN subcontracts covering fencing, security, temporary power, water and waste, and held single-point responsibility for their interfaces]");
  bullet("[e.g. Produced the site establishment element of the preliminaries for the tender, and owned the number through to final account]");
  bullet("[e.g. Managed the logistics plan, including access, laydown, deliveries and the traffic management approval with the highway authority]");
  bullet("[e.g. Closed the compound out, including reinstatement and the landowner's sign-off]");

  p("What changed because of it");
  fillIn("One short paragraph, and the hardest one to write. What was different because you were the person doing it? A quantity, a duration, a cost avoided, a problem that did not happen. If you have a number, use it and be ready to explain how you know it. If you do not, describe the change without a number rather than inventing one — 'the compound was complete before first steel arrived' is worth more than an invented percentage.");
  fillIn("[Fill]");

  p("Referee");
  table([2900, 6100],
    ["Field", "Entry"],
    [
      ["Name", "[name]"],
      ["Role at the time", "[their role, and their relationship to the work]"],
      ["Organisation", "[employer or client organisation]"],
      ["Relationship", "[e.g. client-side project manager on this scheme]"],
      ["Contact", "[email and telephone — only once they have agreed]"],
      ["Permission obtained", "[date you asked and they said yes]"],
    ]);

  note("Ask before you list anyone. A referee who is called cold is a referee who gives a lukewarm answer, and a lukewarm reference is worse than a missing one. Client-side counterparts are the strongest route: they watched the work from the other side of the table, they carry no conflict, and they are not your former employer's staff.");

  if (i < PROJECTS) pageBreak();
}

/* ------------------------------------------------------------------ */
pageBreak();
h1("4. A worked specimen of the deliverable");

p("Because there is no client engagement to show, a specimen is provided instead. It is a full worked example of the diagnostic output on an illustrative scheme, so a reader can see exactly what is delivered rather than being told about it.");

rich([
  { t: "It is labelled a specimen because it is one. ", b: true },
  { t: "The scheme in it is not real and no part of it is drawn from a client's tender pack, anonymised or otherwise. Another client's pack will never be shown to a third party, and a document that hides which of those two things it is would tell a buyer exactly the wrong thing about how this company handles information." },
]);

fillIn("Attach or link the specimen diagnostic. Keep the word ILLUSTRATIVE on every page of it, in the body text and in the metadata — not only in a footer that survives no screenshot.");

/* ------------------------------------------------------------------ */
h1("5. Standing position");

p("Stated plainly, including what is not yet held. Every line here is checkable, which is the point of putting them in one table.");

table([3400, 5600],
  ["Item", "Position"],
  [
    ["Company", "JNN GLOBAL LTD, trading as ETABLIX. Company number 15405437."],
    ["Incorporated", "[date]"],
    ["First accounting reference date", "[date] — not yet reached, so no statutory accounts are yet due or filed"],
    ["Financial information available", "Director-prepared management information: income and expenditure, statement of financial position, cash flow statement and a 36-month forecast. Unaudited."],
    ["Public liability insurance", "[insurer, limit, expiry — or 'to be placed on appointment', which is normal and says so]"],
    ["Professional indemnity insurance", "[insurer, limit, expiry — or the same]"],
    ["Employers' liability insurance", "[position — state it even if the answer is that there are no employees yet]"],
    ["Employees", "[number. One working director is a legitimate answer and pretending otherwise is not]"],
    ["Accreditations held", "[list only what is actually held]"],
    ["Accreditations in progress", "[list with the stage each has reached — 'application submitted [date]' is credible; 'pending' alone is not]"],
    ["CDM 2015 position", "ETABLIX does not hold, and does not accept by implication, appointment as Principal Contractor or Principal Designer. Any such appointment is made in writing or not at all."],
    ["Data handling", "[one line on how client tender information is held and who can see it]"],
  ]);

note("The CDM line is not boilerplate. A consultant who drifts into a duty holder role by conduct rather than appointment carries the duty anyway, and a buyer who sees that risk managed on paper reads the rest of the document differently.");

/* ------------------------------------------------------------------ */
h1("6. What is not yet in place");

p("Listed here rather than left to be discovered.");

bullet("No completed client engagement under the company's own name, and therefore no client reference that belongs to ETABLIX rather than to its director. This is the first thing the company is working to change and section 7 says how.");
bullet("No certified management system. The quality, environmental, health and safety, equality and occupational health arrangements are documented and issued, and they state on their own faces that they are not certified.");
bullet("No second competent person. The company is one working director. Where an appointment requires independent review, that is procured and is stated in the fee.");
fillIn("Add anything else that is true. Resist the urge to stop the list early — a buyer who finds a fourth item you did not list stops trusting the three you did.");

/* ------------------------------------------------------------------ */
h1("7. The proposal that closes the gap");

p("The absence of a client case study is a fact about the calendar rather than about the capability, and it is solved by one engagement rather than by argument.");

fillIn("One paragraph offering a single-site diagnostic on one live scheme, at the rate you have already used, on the explicit basis that the client becomes the reference at the end of it. Say the rate, say the date it holds until, and say plainly that it does not carry forward to subsequent sites. A price with a reason and an expiry reads as a commercial decision. The same price without either reads as a discount, and a discount tells a buyer the first number was padded.");

fillIn("[Fill — and keep the rate out of anything that gets published. Pricing stays in documents issued to a named recipient.]");

note("This section is why the document opens the way it does. A buyer who has been told there are no case studies, and then offered a structured way to create the first one, is being asked to make a small decision with a clear return. A buyer who has been shown invented case studies is being asked to trust somebody who has just demonstrated they will invent things.");

approval();
d.build().catch((err) => { console.error(err); process.exit(1); });
