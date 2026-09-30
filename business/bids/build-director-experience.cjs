/**
 * ETABLIX — Director's Relevant Experience. Word and PDF.
 *
 *   node business/bids/build-director-experience.cjs
 *
 * WRITTEN AGAINST A SPECIFIC PERMISSION. A DPS assessment team confirmed in
 * writing: "you can use relevant director's experience if the company is newly
 * established. This experience must be relevant to the categories applied
 * for." That sentence is the reason this document exists and it is quoted in
 * section 1, because an assessor reading it should be able to see immediately
 * that the substitution was authorised rather than assumed.
 *
 * THE SECOND SENTENCE IS THE HARDER ONE. Relevance is the test, not volume. So
 * section 3 maps the record to what is actually being applied for rather than
 * reproducing a curriculum vitae, and section 6 states plainly what the record
 * does NOT cover. A document that claims everything is relevant is read as a
 * document by somebody who did not check.
 *
 * WHAT IS AND IS NOT CLAIMED, because the distinction decides whether this
 * survives a reference call:
 *
 *   - Every role, employer, date and scheme here is the DIRECTOR'S, performed
 *     as an employee of the organisation named. None of it is presented as a
 *     contract performed by ETABLIX. ETABLIX has performed none.
 *   - CDM 2015 Principal Designer TRAINING is held. That is training. It is
 *     not an appointment and it is not a claim to have acted in the role.
 *
 * REV 2 ADDS THE SCOPE STATEMENT, and it is the reason the document works. Rev
 * 1 mapped the director's record to construction management in general, which
 * any competent construction CV does. It missed the one fact that answers the
 * assessor's actual test: at GE Vernova the director was the single person
 * accountable for planning, procuring, integrating and controlling temporary
 * infrastructure and workforce-living systems across multiple sites, from
 * tender stage to handover, in Northern and Southern Europe including the UK
 * and the Republic of Ireland. That is not adjacent to what ETABLIX sells. It
 * IS what ETABLIX sells, performed at scale, before the company existed. So it
 * leads section 3 and frames section 4.1, rather than sitting as one capability
 * row among eight.
 *   - The quantities an assessor actually weighs — scheme value, the value of
 *     the scope personally held, peak workforce, duration — are left as fields.
 *     They are the director's to state and nobody else can state them.
 */
const B = require("../policies/brand.cjs");

const REV = "2";
const d = B.doc({
  slug: "Director-Relevant-Experience",
  running: "Director's relevant experience",
  kicker: "TECHNICAL AND PROFESSIONAL ABILITY",
  title: "DIRECTOR'S EXPERIENCE",
  sub: "submitted in place of company contract examples, as the assessment team confirmed is permitted",
  rev: REV,
  outDir: __dirname,
  kind: "statement",
  control: [
    ["Document", "Director's relevant experience"],
    ["Company", "JNN GLOBAL LTD, trading as ETABLIX · Company No. 15405437"],
    ["Director", "Justin Ngolu Nseya MCIOB"],
    ["Submitted for", "[name the DPS, framework or category applied for]"],
    ["Basis", "Confirmed in writing by the assessment team: relevant director's experience may be used where the company is newly established"],
    ["Date", "[date]"],
    ["Status", "The experience below was performed by the director as an employee of the organisations named. It is not presented as work performed by ETABLIX."],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ------------------------------------------------------------------ */
h1("1. Basis on which this is submitted");

rich([{ t: "ETABLIX has not yet completed a contract in its own name, and does not present work performed by other organisations as its own. ", b: true },
  { t: "This document is submitted following the assessment team's written confirmation that relevant director's experience may be used where the company is newly established, and that the experience must be relevant to the categories applied for." }]);

p("Everything below was performed by Justin Ngolu Nseya as an employee of the organisation named against it. The organisations are named, the dates are stated, and referees are offered at section 5 who can confirm the role and the scope from the other side of it.");

note("Section 6 states what this record does not cover. It is there because relevance is the test the assessment team set, and a document claiming everything is relevant is read as one nobody checked.");

/* ------------------------------------------------------------------ */
h1("2. The director");

table([2700, 5600],
  ["", ""],
  [
    ["Name", "Justin Ngolu Nseya"],
    ["Position", "Managing Director, JNN GLOBAL LTD trading as ETABLIX"],
    ["Chartered status", "MCIOB — Chartered Construction Manager, Chartered Institute of Building"],
    ["Degrees", "MSc BIM Management (Middlesex University) · BSc (Hons) Construction Management (Birmingham City University)"],
    ["Project management", "APMP Project Management Qualification · PRINCE2 Foundation"],
    ["Construction", "CDM 2015 Principal Designer training · CSCS card"],
    ["Systems", "Primavera P6 · Microsoft Project · CEMAR · Revit · Navisworks · common data environments"],
    ["Languages", "English (fluent) · French (native)"],
  ]);

note("CDM 2015 Principal Designer training is training. It is not an appointment, and no claim is made to have held the duty holder role. Where a client wishes ETABLIX to hold a duty holder role it is appointed expressly and in writing.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("3. Experience mapped to the categories applied for");

p("Ordered by relevance to what is being applied for rather than by date. The full chronology is at section 4.");

h2("3.1  The scope that matches the service being applied for");

rich([{ t: "At GE Vernova – Grid Solutions the director was the single person accountable for planning, procuring, integrating and controlling the temporary infrastructure and workforce-living systems that keep major projects operational. ", b: true },
  { t: "The role was held across multiple concurrent sites, from tender stage through to handover, across Northern and Southern Europe including the United Kingdom and the Republic of Ireland. Clients dealt with one accountable interface covering the whole cycle: initial requirements, mobilisation, daily operation, demobilisation and reinstatement." }]);

p("That cycle is set out below because it is the same cycle being applied for here, and because an assessor should be able to see the match without being asked to infer it.");

table([1900, 6400],
  ["Stage", "What the director was accountable for"],
  [
    ["Requirements", "Establishing what a site actually needed — headcount, shift pattern, duration, location, ground and consent constraints — and converting that into a specification and a budget at tender stage, before a price existed."],
    ["Procurement", "Specifying, sourcing, negotiating and letting the accommodation, welfare, utilities and associated services against that specification, and holding the resulting terms."],
    ["Integration", "Fitting the temporary works and living systems into the construction programme, the site logistics and the wider engineering, HSE and commissioning interfaces, so that establishment did not sit outside the main sequence."],
    ["Mobilisation", "Delivery, installation, connection and commissioning of the establishment to the point where the site could occupy it and work from it."],
    ["Daily operation", "Servicing, maintenance, compliance, occupancy changes and problem resolution for the life of the establishment, as the single point of contact."],
    ["Demobilisation and reinstatement", "Removal, off-hire, final account, and returning the land to the condition the agreement required — the stage most often left unpriced and therefore most often disputed."],
  ], { size: 16 });

note("This is the direct relevance link the assessment team asked for. It is the director's own record as an employee of GE Vernova. It is not presented as a contract performed by ETABLIX, and ETABLIX has performed none.");

h2("3.2  Supporting construction and programme management record");

table([2400, 2400, 3500],
  ["Capability", "Where it was performed", "What was actually done"],
  [
    ["Temporary infrastructure and workforce-living systems",
     "GE Vernova – Grid Solutions, UK, Ireland, Northern and Southern Europe, Dec 2022 – Dec 2025",
     "Sole accountability for planning, procuring, integrating and controlling site establishment and workforce-living systems across multiple concurrent sites, tender stage to handover. Set out in full at 3.1 above."],
    ["Subcontractor and supply chain management",
     "GE Vernova – Grid Solutions, Construction Subcontract Manager, UK, Ireland, Northern and Southern Europe, Dec 2022 – Dec 2025",
     "Construction delivery and subcontractor governance across major high-voltage power, grid and offshore wind infrastructure. Contractor performance, construction sequencing, logistics, programme milestones and delivery risk, with mitigation and recovery where progress or interfaces threatened delivery."],
    ["Multi-discipline site coordination",
     "GE Vernova – Grid Solutions",
     "Coordination across civil, electrical, mechanical, high-voltage and commissioning disciplines, acting as the interface between client, engineering and design teams, construction management, planners, HSE teams and subcontractors."],
    ["Commissioning and operational handover",
     "GE Vernova – Grid Solutions",
     "Commissioning, energisation readiness and operational handover on complex grid infrastructure, including the 1,400 MW Sofia Offshore Wind Farm grid connection programme."],
    ["Client-side programme delivery",
     "West Midlands Combined Authority, Programme Delivery Manager, Nov 2021 – Dec 2022",
     "Regional transport, construction, regeneration and public infrastructure. Design coordination through construction, commissioning and handover; contractors, consultants, delivery partners and stakeholder interfaces; milestones, commercial performance, risk and governance reported to senior leadership and authority boards."],
    ["Full lifecycle project management",
     "Mott MacDonald, Senior Project Manager, Oct 2018 – Nov 2021",
     "Education, rail, justice and public infrastructure. Design development and procurement support through construction, testing, commissioning and operational handover. Chaired progress and health and safety coordination meetings. New-build schools delivered across RIBA stages 0 to 7."],
    ["Live operational environments",
     "Mott MacDonald",
     "Midland Main Line Upgrade — civil and MEP coordination in a live operational rail environment, with programme controls and earned value monitoring. Ministry of Justice — infrastructure upgrades within secure operational estates, balancing technical delivery against operational continuity."],
    ["Project controls and assurance",
     "Turner & Townsend, Project Manager, Aug 2015 – Aug 2017",
     "Schedule, risk, reporting, governance and delivery assurance across major national infrastructure programmes; procurement, contractor coordination and contract administration support."],
    ["Site-level construction management",
     "William Davis, Midland Heart and Willmott Dixon, Assistant Construction Manager, 2012 – 2015",
     "Site operations, subcontractor coordination, construction sequencing, HSE compliance, quality inspections and programme monitoring on residential and public sector projects."],
  ], { size: 16 });

fillIn("Delete any row above that is not relevant to the specific categories applied for. The assessment team's test is relevance, not length, and a row that does not answer the category weakens the rows that do.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("4. Three schemes in detail");

p("Strongest first. Each is offered with a referee who can confirm it.");

const SCHEMES = [
  ["4.1  Sofia Offshore Wind Farm — grid connection, 1,400 MW",
   "GE Vernova – Grid Solutions", "Construction Subcontract Manager", "Dec 2022 – Dec 2025",
   "Held under the scope set out at 3.1. On this scheme the director carried the site establishment and workforce-living scope as the single accountable interface — requirements and tender-stage specification, procurement, integration into the construction programme, mobilisation, daily operation, and demobilisation and reinstatement — alongside subcontract management of the construction works."],
  ["4.2  Midland Main Line Upgrade", "Mott MacDonald", "Senior Project Manager", "Oct 2018 – Nov 2021", null],
  ["4.3  [Third scheme — choose the one closest to the categories applied for]",
   "[employer]", "[role]", "[dates]", null],
];
for (const [title, employer, role, dates, intro] of SCHEMES) {
  h2(title);
  if (intro) p(intro);
  table([2400, 5900],
    ["", ""],
    [
      ["Employer", employer],
      ["Role held", role],
      ["Dates", dates],
      ["Location", "[location]"],
      ["Client / end client", "[name, or describe precisely where a confidentiality obligation prevents naming]"],
      ["Scheme value", "£[  ]"],
      ["Value of the scope personally held", "£[  ]"],
      ["Peak workforce on site", "[  ]"],
      ["Duration of site establishment", "[  ] months"],
      ["Scope personally accountable for", "[Four to eight bullets. Only what you were personally accountable for. Use the verb you actually did — specified, procured, negotiated, managed, closed out — not 'was involved in'. If a reader could not tell whether you led it or watched it, rewrite it.]"],
      ["What was different because you did it", "[One short paragraph, and the hardest to write. A quantity, a duration, a cost avoided, a problem that did not happen. If you have a number, use it and be ready to explain how you know it. If you do not, describe the change without a number rather than inventing one.]"],
      ["Referee", "[name, position, organisation, telephone, email — and the date they agreed to be named]"],
    ], { size: 16 });
}

note("The four quantity rows are the ones an assessor weighs and the ones nobody else can supply. A scheme entry without them reads as a job description; with them it reads as a record.");

/* ------------------------------------------------------------------ */
h1("5. Referees");

p("Each referee has been approached in advance and has agreed to respond. Client-side counterparts are offered where available: they observed the work from the other side of the table, they carry no conflict, and they are not a former employer's staff.");

table([1000, 2400, 2400, 2500],
  ["", "Name and position", "Organisation and scheme", "Contact, and date agreed"],
  [
    ["1", "[name, position]", "[organisation · scheme]", "[telephone · email · agreed on date]"],
    ["2", "[name, position]", "[organisation · scheme]", "[telephone · email · agreed on date]"],
    ["3", "[name, position]", "[organisation · scheme]", "[telephone · email · agreed on date]"],
  ]);

rich([{ t: "What the referees can and cannot confirm, stated so that nobody has to work it out. ", b: true },
  { t: "They can verify the director's role, scope and performance on the schemes named. They cannot confirm contract performance by ETABLIX, because there has been none. Drawing that line here is deliberate: an assessor who finds it themselves reads the rest of the submission differently." }]);

fillIn("Ask every referee before naming them. A referee telephoned cold gives a lukewarm answer, and a lukewarm reference is worse than a missing one. Record the date each agreed.");

/* ------------------------------------------------------------------ */
h1("6. What this record does not cover");

p("Listed because the assessment team's test is relevance, and because an assessor who finds a fourth gap after being shown three stops believing the three.");

bullet("No contract has been performed by ETABLIX. Every entry above is the director's, performed as an employee of the organisation named.");
bullet("The director's record is in site establishment, construction and programme management — temporary infrastructure and workforce-living systems, subcontract management, project controls, multi-discipline coordination, commissioning and handover. Where a category calls for a trade or a self-delivered service, this record does not answer it and is not offered as though it does.");
bullet("The scope at 3.1 was performed as the accountable interface, not as self-delivery. The accommodation, welfare and utilities themselves were supplied and installed by specialist subcontractors, under terms the director specified, procured and held. ETABLIX works the same way and does not present itself as a supplier of the plant.");
bullet("CDM 2015 Principal Designer training is held. The duty holder role has not been held, and is accepted only where a client appoints it expressly and in writing.");
bullet("ETABLIX holds no ISO certification and makes no claim to any.");
fillIn("Add anything else that is true of the specific categories applied for. Resist stopping the list early.");

/* ------------------------------------------------------------------ */
h1("7. A worked specimen of the deliverable");

p("Attached separately: a full worked example of the report ETABLIX produces, prepared on an invented project so that no client is identified. It demonstrates the method and the standard of output rather than asking an assessor to take either on trust, and it is the one piece of evidence in this submission that is the company's own work rather than the director's history.");

approval();
d.build().then(() => {
  console.log("\nBEFORE SUBMITTING");
  console.log("  1. Name the DPS or category in the control table, and delete any row at");
  console.log("     section 3.2 that is not relevant to it. Relevance is the stated test.");
  console.log("     Do NOT delete 3.1 — it is the direct relevance link.");
  console.log("  2. Section 4: choose the third scheme, then fill the four quantity rows on");
  console.log("     all three — scheme value, scope value personally held, peak workforce,");
  console.log("     establishment duration. Those are what an assessor weighs.");
  console.log("  3. Ask the three referees BEFORE naming them, and record the date each agreed.");
  console.log("  4. Attach the specimen diagnostic.");
}).catch((err) => { console.error(err); process.exit(1); });
