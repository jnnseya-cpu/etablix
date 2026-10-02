/**
 * ETABLIX — Director's Relevant Experience. Word and PDF.
 *
 *   node business/bids/build-director-experience.cjs ["DPS or category name"]
 *
 * WRITTEN AGAINST A SPECIFIC PERMISSION. A DPS assessment team confirmed in
 * writing: "you can use relevant director's experience if the company is newly
 * established. This experience must be relevant to the categories applied
 * for." That sentence is the reason this document exists and it is quoted in
 * section 1, because an assessor reading it should be able to see immediately
 * that the substitution was authorised rather than assumed.
 *
 * AND THE PERMISSION IS SCHEME-SPECIFIC. CHECK BEFORE SENDING IT. On 1 October
 * 2026 the GCA assessment team confirmed the opposite position for RM6242
 * Construction Professional Services: the contract example must be delivered by
 * the BIDDING ENTITY itself — prime, subcontractor, or a member of a Group of
 * Economic Operators — and the director's personal experience, however
 * extensive, does not satisfy DPSQ Question 53. Selection Questionnaire
 * Questions 133 to 137 are Not Applicable there and are not evaluated. Two
 * public buyers gave opposite answers and both were right about their own
 * scheme. So this document is evidence where the substitution has been accepted
 * in writing and inadmissible where it has not, and which it is has to be
 * established before it is submitted rather than after.
 *
 * REV 3 MAKES IT AN ISSUABLE DOCUMENT RATHER THAN A FORM. Rev 2 was right on
 * substance and wrong as an artefact: it printed "[  ]", "[location]" and a
 * page of drafting instructions into the document itself, so what came out of
 * the builder could not be sent to anybody. Two changes fix that.
 *
 *   1. EVERY DIRECTOR-ONLY FACT MOVED TO director-experience.data.cjs, and a
 *      field left empty is OMITTED rather than rendered as a bracket. An
 *      unfilled data file therefore still yields a complete document that
 *      simply makes fewer claims. Nothing is invented to fill a gap: a figure
 *      in a procurement document that nobody can source is the one mistake
 *      that cannot be recovered from.
 *
 *   2. ALL DRAFTING GUIDANCE LEFT THE DOCUMENT. It now prints to the console
 *      and to DIRECTOR-EXPERIENCE-NOTES.md. Rev 2's section 4.4 explained to
 *      an assessor how to choose between two wordings, which is a note to the
 *      author appearing in the evidence.
 *
 * REV 4 PUTS SKYE AT 4.1, and it should have been there from the start. The
 * Skye Reinforcement Project is the scheme on which the director built a worker
 * accommodation village from nothing: he defined all five packages, ran the
 * enquiries, assessed the returns, recommended the awards, and then
 * consolidated the running of the village under a single facilities management
 * contract. That last step is ETABLIX Model 02 — the Management Integrator,
 * described on the company's own site as its core offer — performed at the
 * scale of a GBP 690 million reinforcement scheme before ETABLIX existed. Sofia
 * is a strong entry and moves to 4.2; it evidences subcontract governance and
 * commissioning, which is a different and narrower claim than having specified
 * and procured an entire village.
 *
 * SECTIONS 4.2 AND 4.3 ARE WRITTEN FROM THE CURRICULUM VITAE, not invented.
 * Every bullet traces to a line in it. Where the CV records an activity but
 * not an outcome, the bullet records the activity — an outcome nobody stated
 * is not available to be written.
 *
 * WHAT IS AND IS NOT CLAIMED, because the distinction decides whether this
 * survives a reference call:
 *
 *   - Every role, employer, date and scheme here is the DIRECTOR'S, performed
 *     as an employee of the organisation named. None of it is presented as a
 *     contract performed by ETABLIX. ETABLIX has performed none.
 *   - CDM 2015 Principal Designer TRAINING is held. That is training. It is
 *     not an appointment and it is not a claim to have acted in the role.
 *   - At GE Vernova he SELECTED and RECOMMENDED the award; the order was
 *     placed by the sourcing function. He confirmed that position directly.
 *     The document says "recommended" everywhere and never "let" or "awarded".
 *   - The four quantity fields are empty. They are the director's to state,
 *     and the rows disappear until he does.
 */
const fs = require("node:fs");
const path = require("node:path");
const B = require("../policies/brand.cjs");
const DATA = require("./director-experience.data.cjs");

const DASH = "—";
const REV = "4";

/* ---- inputs, and what is missing ---------------------------------- */
const submittedFor = (process.argv[2] || DATA.submittedFor || "").trim();
const issueDate = (DATA.date || "").trim() || new Date().toLocaleDateString("en-GB",
  { day: "numeric", month: "long", year: "numeric" });

const has = (v) => typeof v === "string" && v.trim().length > 0;
const gaps = [];
const gap = (what, why) => gaps.push([what, why]);

if (!submittedFor) gap("The DPS or category this is submitted for",
  "It changes per submission, so pass it as the first argument: node business/bids/build-director-experience.cjs \"CHIC Development DPS, Category 1\". Until then the cover simply omits the row.");

/* ---- document ----------------------------------------------------- */
const control = [
  ["Document", "Director's relevant experience"],
  ["Company", "JNN GLOBAL LTD, trading as ETABLIX · Company No. 15405437"],
  ["Director", "Justin Ngolu Nseya MCIOB"],
];
if (submittedFor) control.push(["Submitted for", submittedFor]);
control.push(
  ["Basis", "Confirmed in writing by the assessment team: relevant director's experience may be used where the company is newly established"],
  ["Date", issueDate],
  ["Status", "The experience below was performed by the director as an employee of the organisations named. It is not presented as work performed by ETABLIX."],
);

const d = B.doc({
  slug: "Director-Relevant-Experience",
  running: "Director's relevant experience",
  kicker: "TECHNICAL AND PROFESSIONAL ABILITY",
  title: "DIRECTOR'S EXPERIENCE",
  sub: "submitted in place of company contract examples, as the assessment team confirmed is permitted",
  rev: REV,
  outDir: __dirname,
  kind: "statement",
  draftNote: false,
  control,
});
const { p, rich, h1, h2, bullet, richBullet, note, table, pageBreak } = d;

/* ------------------------------------------------------------------ */
h1("1. Basis on which this is submitted");

rich([{ t: "ETABLIX has not yet completed a contract in its own name, and does not present work performed by other organisations as its own. ", b: true },
  { t: "This document is submitted following the assessment team's written confirmation that relevant director's experience may be used where the company is newly established, and that the experience must be relevant to the categories applied for." }]);

p("Everything below was performed by Justin Ngolu Nseya as an employee of the organisation named against it. The organisations are named and the dates are stated. Section 5 sets out what a referee can and cannot confirm.");

note("Section 6 states what this record does not cover. It is there because relevance is the test the assessment team set, and a document claiming everything is relevant is read as one nobody checked.");

/* ------------------------------------------------------------------ */
h1("2. The director");

table([2700, 5600],
  ["", ""],
  [
    ["Name", "Justin Ngolu Nseya"],
    ["Position", "Managing Director, JNN GLOBAL LTD trading as ETABLIX"],
    ["Chartered status", "MCIOB " + DASH + " Chartered Construction Manager, Chartered Institute of Building"],
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

p("Ordered by relevance to the service being applied for rather than by date. The full chronology is at section 3.2 and the schemes are at section 4.");

h2("3.1  The scope that matches the service being applied for");

rich([{ t: "At GE Vernova – Grid Solutions the director was the single person accountable for planning, procuring, integrating and controlling the temporary infrastructure and workforce-living systems that keep major projects operational. ", b: true },
  { t: "The role was held across multiple concurrent sites, from tender stage through to handover, across Northern and Southern Europe including the United Kingdom and the Republic of Ireland. Clients dealt with one accountable interface covering the whole cycle: initial requirements, mobilisation, daily operation, demobilisation and reinstatement." }]);

p("That cycle is set out below because it is the same cycle being applied for here, and because an assessor should be able to see the match without being asked to infer it.");

table([1900, 6400],
  ["Stage", "What the director was accountable for"],
  [
    ["Requirements", "Establishing what a site actually needed " + DASH + " headcount, shift pattern, duration, location, ground and consent constraints " + DASH + " and converting that into a specification and a budget at tender stage, before a price existed."],
    ["Procurement", "Specifying, sourcing and negotiating the accommodation, welfare, utilities and associated services against that specification; selecting the contractor and recommending the award, the order being placed by the sourcing function; and holding the resulting terms."],
    ["Integration", "Fitting the temporary works and living systems into the construction programme, the site logistics and the wider engineering, HSE and commissioning interfaces, so that establishment did not sit outside the main sequence."],
    ["Mobilisation", "Delivery, installation, connection and commissioning of the establishment to the point where the site could occupy it and work from it."],
    ["Daily operation", "Servicing, maintenance, compliance, occupancy changes and problem resolution for the life of the establishment, as the single point of contact."],
    ["Demobilisation and reinstatement", "Removal, off-hire, final account, and returning the land to the condition the agreement required " + DASH + " the stage most often left unpriced and therefore most often disputed."],
  ], { size: 16 });

note("This is the direct relevance link the assessment team asked for. It is the director's own record as an employee of GE Vernova. It is not presented as a contract performed by ETABLIX, and ETABLIX has performed none.");

h2("3.2  Supporting construction and programme management record");

table([2400, 2400, 3500],
  ["Capability", "Where it was performed", "What was actually done"],
  [
    ["Temporary infrastructure and workforce-living systems",
     "GE Vernova – Grid Solutions, UK, Ireland, Northern and Southern Europe, Dec 2022 – Dec 2025",
     "Sole accountability for planning, procuring, integrating and controlling site establishment and workforce-living systems across multiple concurrent sites, tender stage to handover. Includes the worker accommodation village on the Skye Reinforcement Project, defined across five packages and detailed at section 4.1. The cycle is set out at 3.1."],
    ["Subcontractor and supply chain management",
     "GE Vernova – Grid Solutions, Construction Subcontract Manager, UK, Ireland, Northern and Southern Europe, Dec 2022 – Dec 2025",
     "Construction delivery and subcontractor governance across major high-voltage power, grid and offshore wind infrastructure. Contractor performance, construction sequencing, logistics, programme milestones and delivery risk, with mitigation and recovery where progress or interfaces threatened delivery."],
    ["Multi-discipline site coordination",
     "GE Vernova – Grid Solutions",
     "Coordination across civil, electrical, mechanical, high-voltage and commissioning disciplines, acting as the interface between client, engineering and design teams, construction management, planners, HSE teams and subcontractors."],
    ["Commissioning and operational handover",
     "GE Vernova – Grid Solutions",
     "Commissioning, energisation readiness and operational handover on complex grid infrastructure, including the 1,400 MW Sofia Offshore Wind Farm grid connection programme and the 132 kV Skye Reinforcement Project."],
    ["Client-side programme delivery",
     "West Midlands Combined Authority, Programme Delivery Manager, Nov 2021 – Dec 2022",
     "Regional transport, construction, regeneration and public infrastructure. Design coordination through construction, commissioning and handover; contractors, consultants, delivery partners and stakeholder interfaces; milestones, commercial performance, risk and governance reported to senior leadership and authority boards."],
    ["Full lifecycle project management",
     "Mott MacDonald, Senior Project Manager, Oct 2018 – Nov 2021",
     "Education, rail, justice and public infrastructure. Design development and procurement support through construction, testing, commissioning and operational handover. Chaired progress and health and safety coordination meetings. New-build schools delivered across RIBA stages 0 to 7."],
    ["Live operational environments",
     "Mott MacDonald",
     "Midland Main Line Upgrade " + DASH + " civil and MEP coordination in a live operational rail environment, with programme controls and earned value monitoring. Ministry of Justice " + DASH + " infrastructure upgrades within secure operational estates, balancing technical delivery against operational continuity."],
    ["Project controls and assurance",
     "Turner & Townsend, Project Manager, Aug 2015 – Aug 2017",
     "Schedule, risk, reporting, governance and delivery assurance across major national infrastructure programmes; procurement, contractor coordination and contract administration support."],
    ["Site-level construction management",
     "William Davis, Midland Heart and Willmott Dixon, Assistant Construction Manager, 2012 – 2015",
     "Site operations, subcontractor coordination, construction sequencing, HSE compliance, quality inspections and programme monitoring on residential and public sector projects."],
    ["Current appointment",
     "Agence des Zones Économiques Spéciales (AZES RDC), Technical Director of Operations (contract), Jan 2026 to date",
     "Executive technical and delivery leadership on large-scale industrial and economic-zone infrastructure: power, roads, water, logistics, utilities and industrial facilities, directing EPC contractors, consultants, technical advisers and delivery partners, and managing the interfaces between utilities, transport, industrial operations and government authorities. Recorded here because it is current, and because a record read against a curriculum vitae should not have a hole at the top of it."],
  ], { size: 16 });

/* ------------------------------------------------------------------ */
pageBreak();
h1("4. Three schemes in detail");

p("Strongest first. Each records what the director was personally accountable for, in the order the work happened.");

/* The five packages the director defined at Skye. A table rather than prose
   because the structure IS the evidence: an assessor can see the whole village
   decomposed, and can see that the decomposition was somebody's work. */
const PACKAGES = {
  "4.1": [
    ["1 \u00b7 Civil works",
     "Site preparation, groundworks, foundations, drainage, roads and hardstanding, and the utility connections the village would stand on, with the full requirement schedule behind each."],
    ["2 \u00b7 Accommodation",
     "Construction of the modular village itself \u2014 bedrooms, leisure space, offices, medical facility, laundry and the remaining welfare buildings \u2014 specified building by building."],
    ["3 \u00b7 Furniture and fit-out",
     "Everything that goes inside the buildings: the full furniture, fittings and equipment schedule across bedrooms, offices, leisure and welfare space."],
    ["4 \u00b7 Kitchen and dining",
     "Catering and dining facilities: equipment, layout, capacity against occupancy, and the servicing requirements behind them."],
    ["5 \u00b7 Facilities management",
     "Every operation for the life of the village: catering, housekeeping, maintenance, deliveries, waste, and transport between the village and the substation and overhead line works."],
  ],
};

const SCOPE = {
  "4.1": [
    "Defined the entire worker accommodation village from the construction programme: what the site needed, for how many people, for how long, in a remote Highland location with its own ground, access and consent constraints \u2014 and converted that into a specification and a tender-stage budget before any price existed.",
    "Decomposed the village into the five packages set out above and wrote the requirement for each one. The decomposition was produced by the director alone: the work sat between construction, procurement and facilities management, and no other role in the organisation covered that combination.",
    "Specified the facilities management package in operational detail, including a menu cycle designed to avoid food fatigue across a multi-year occupation, and breakfast, lunch and evening provision timed against shift rotation so that a worker coming off shift could eat rather than arrive after service had closed.",
    "Included transport between the village and the working faces in the same package, because the role covered the substation works as well as the overhead line, and an accommodation village that is not connected to the job it serves creates lost hours nobody has priced.",
    "Found and qualified the delivery and subcontract partners for each package, including in a territory where the established field was thin, rather than accepting the suppliers already on the list.",
    "Produced the requests for quotation himself, against his own specification, so that returns could be compared on one basis.",
    "Assessed every returned quotation alongside the sourcing and civil engineering teams \u2014 technical compliance against the specification, price against the budget allowance, programme against the construction sequence, and the qualifications and exclusions each bidder had written into its own return.",
    "Selected the contractor for each package and recommended the award; the order was placed by the sourcing function. Held the resulting terms thereafter and was accountable for performance against them.",
    "Once the five packages were appointed, selected one of them \u2014 the facilities management contractor \u2014 to manage the running of the whole village under a single contract, so that the project held one accountable supplier for the operation rather than five separate ones.",
    "Ran the village through mobilisation, daily operation, demobilisation and reinstatement as the single point of contact.",
  ],
  /* The generic establishment sequence, kept because it is the right shape for
     any scheme that is not Skye. Give it a scheme ref to use it. */
  "GENERIC": [
    "Established the site requirement from the construction programme " + DASH + " headcount, shift pattern, duration, location, and the ground and consent constraints " + DASH + " and converted it into an enquiry scope and a tender-stage budget allowance, before any price existed.",
    "Identified and approached the contractor and supplier market for each package and built the bidder list. Where no suitable contractor was already established in the territory, found and qualified new ones rather than accepting a thin field.",
    "Issued the enquiry documents: scope, specification, programme dates, site constraints and the pricing schedule against which returns would be compared on the same basis.",
    "Assessed the returned quotations alongside the sourcing and civil engineering teams " + DASH + " technical compliance against the specification, price against the budget allowance, programme against the construction sequence, and the qualifications and exclusions each bidder had written into its own return.",
    "Selected the contractor for each package and recommended the award; the order was placed by the sourcing function. Held the resulting terms thereafter and was accountable for performance against them.",
    "Integrated the appointed works into the construction programme and the site logistics, and held the interfaces with engineering, planning, HSE and commissioning through mobilisation, installation and connection.",
    "Monitored the appointed contractors for the life of the establishment against scope, programme, quality, HSE and commercial position; raised non-conformance and closed it out.",
    "Closed out demobilisation: removal, off-hire, reinstatement of the land to the condition the agreement required, and the final account.",
  ],
  "MML": [
    "Coordinated civil and mechanical, electrical and plumbing works in a live operational rail environment, sequencing construction around operational running rather than around the design.",
    "Implemented programme controls and earned value monitoring on the scope, and reported performance against the baseline rather than against the last report.",
    "Controlled the technical interfaces between designers, contractors, consultants and the client's operational teams, and ran the requests for information and contractor queries through to resolution.",
    "Chaired progress and health and safety coordination meetings.",
    "Administered the CDM 2015 obligations that sat within the appointment, including confirming the construction phase plan was in place and suitable before work started on site.",
    "Managed cost performance and the risk register against the scope, and escalated where intervention above project level was required.",
    "Took the scope through testing, commissioning and operational handover.",
  ],
  "4.2": [
    "Led construction delivery and subcontractor governance across the grid connection workstreams, coordinating civil, electrical, mechanical, high-voltage and commissioning disciplines.",
    "Managed contractor performance, construction sequencing, logistics and programme milestones, and implemented mitigation and recovery where progress or an interface threatened delivery.",
    "Acted as the interface between the client, the engineering and design teams, construction management, planners, HSE and the subcontractors, and resolved the technical and integration issues that arose between them.",
    "Oversaw requests for information, technical submittals, shop drawings, construction documentation and constructability reviews, so that decisions were made in time and implemented under control.",
    "Held compliance with HSE legislation, CDM requirements, quality standards and statutory obligations across the appointed works.",
    "Supported commissioning, energisation readiness and operational handover on the 1,400 MW connection programme.",
  ],
  "4.3": [
    "Directed multidisciplinary delivery from design coordination through construction, commissioning and handover across regional transport, construction, regeneration and public infrastructure.",
    "Managed contractors, consultants and delivery partners on the authority's behalf, and held the third-party and stakeholder interfaces.",
    "Monitored programme milestones, commercial performance, risks and dependencies, and produced the executive reporting taken to senior leadership and to authority boards.",
    "Managed CDM 2015 compliance and the project governance requirements applying to the authority as client.",
    "Resolved issues across interconnected workstreams and escalated where programme-level intervention was required.",
    "Balanced competing stakeholder, cost, time and quality priorities, and recorded the basis on which each was decided.",
  ],
};

const INTRO = {
  "4.1": "The closest match in the record to the service being applied for, and offered first for that reason. The Skye Reinforcement Project replaces and reinforces the 132 kV network between Fort Augustus and the Isle of Skye. Within it, the director defined, procured and ran the worker accommodation village: the whole establishment, from the requirement through five separate packages to demobilisation and reinstatement, held by one person.",
  "4.2": "Offered because it evidences subcontract governance and commissioning on complex high-voltage infrastructure at scale, in a role covering the United Kingdom, Ireland and Northern and Southern Europe. It is a different claim from 4.1 and a narrower one: construction delivery and interface control rather than the definition and procurement of an establishment.",
  "MML": "Offered because it evidences delivery in a live operational environment, where the establishment and the works have to be sequenced around an asset that cannot be stopped. That constraint is the one most often underestimated in site establishment pricing.",
  "4.3": "Offered because it is client-side. The director sat in the seat a public buyer occupies, holding contractors and consultants to account on the authority's behalf and reporting to its boards, which is the perspective this application is being assessed from.",
};

/* A scheme with include:false is held in reserve in the data file. It stays
   written and stays out of the document, so nothing has to be deleted to
   change which three schemes are offered. */
for (const s of DATA.schemes.filter((x) => x.include !== false)) {
  h2(`${s.ref}  ${s.title}`);
  if (INTRO[s.ref]) p(INTRO[s.ref]);

  const rows = [["Employer", s.employer], ["Role held", s.role], ["Dates", s.dates]];
  if (has(s.location)) rows.push(["Location", s.location]);
  if (has(s.endClient)) rows.push(["Client / end client", s.endClient]);
  if (has(s.schemeValue)) rows.push(["Scheme value", s.schemeValue]);
  if (has(s.scopeValue)) rows.push(["Value of the scope personally held", s.scopeValue]);
  if (has(s.beds)) rows.push(["Village capacity", s.beds]);
  if (has(s.peakWorkforce)) rows.push(["Peak workforce on site", s.peakWorkforce]);
  if (has(s.establishmentMonths)) rows.push(["Duration of site establishment", s.establishmentMonths]);
  if (has(s.referee)) rows.push(["Referee", s.referee]);
  table([2400, 5900], ["", ""], rows, { size: 16 });

  if (PACKAGES[s.ref]) {
    rich([{ t: "The five packages, each specified by the director", b: true }]);
    table([2100, 6200], ["Package", "What was specified"], PACKAGES[s.ref], { size: 16 });
  }

  rich([{ t: "Scope personally accountable for", b: true }]);
  for (const b of (SCOPE[s.ref] || [])) bullet(b);

  if (s.ref === "4.1") {
    rich([{ t: "Why the last two bullets matter more than the rest. ", b: true },
      { t: "Five packages appointed and then consolidated under one managing contractor is the structure ETABLIX offers as its Management Integrator model: the buyer keeps its own contracts and its own cash flow, and one party is accountable for making the whole system work. On this scheme the director produced that structure himself, on a live establishment, before the company existed. It is the answer to the question a selection panel is really asking " + DASH + " not whether the method sounds right, but whether anybody has run it." }]);
  }

  if (has(s.outcome)) {
    rich([{ t: "What was different because the director did it", b: true }]);
    p(s.outcome);
  }

  for (const [label, field, why] of [
    ["scheme value", s.schemeValue, "the size of what he worked on"],
    ["peak workforce accommodated", s.peakWorkforce, "how many people the establishment actually held at its fullest"],
    ["value of the scope personally held", s.scopeValue, "the size of what he held, which is the number an assessor actually weighs"],
    ["duration of site establishment", s.establishmentMonths, "how long he ran it"],
  ]) if (!has(field)) gap(`${s.ref} ${DASH} ${label}`, why);
  if (!has(s.outcome)) gap(`${s.ref} ${DASH} what was different because he did it`,
    "the highest-value paragraph in the section and the only one no employer can write for him");
  if (!has(s.endClient)) gap(`${s.ref} ${DASH} client or end client`,
    "name it only where no confidentiality obligation prevents it; the row is omitted rather than hedged");
}

/* ------------------------------------------------------------------ */
h1("5. Referees");

if (DATA.referees.length) {
  p("Each referee below was approached in advance and agreed to respond.");
  table([900, 2300, 2500, 2600],
    ["", "Name and position", "Organisation and scheme", "Contact, and date agreed"],
    DATA.referees.map((r, i) => [String(i + 1),
      `${r.name}, ${r.position}`,
      `${r.organisation} · ${r.scheme}`,
      `${r.telephone} · ${r.email} · agreed ${r.agreedOn}`]));
} else {
  p("Referees are available on request and will be provided within two working days of being asked for. They are not named here because each has to be asked first: a referee telephoned cold gives a lukewarm answer, and a lukewarm reference is worth less than none.");
  p("Client-side counterparts are offered where available. They observed the work from the other side of the table, they carry no conflict, and they are not a former employer's own staff.");
  gap("Three named referees",
    "CHIC asked for them in writing and said they may be contacted as part of verification. This is the single highest-value hour available: it converts the record from assertion into something the buyer can check. Ask each one first and record the date they agreed.");
}

rich([{ t: "What a referee can and cannot confirm, stated so that nobody has to work it out. ", b: true },
  { t: "They can verify the director's role, scope and performance on the schemes named. They cannot confirm contract performance by ETABLIX, because there has been none. Drawing that line here is deliberate: an assessor who finds it themselves reads the rest of the submission differently." }]);

/* ------------------------------------------------------------------ */
h1("6. What this record does not cover");

p("Listed because the assessment team's test is relevance, and because an assessor who finds a fourth gap after being shown three stops believing the three.");

bullet("No contract has been performed by ETABLIX. Every entry above is the director's, performed as an employee of the organisation named.");
bullet("The director's record is in site establishment, construction and programme management " + DASH + " temporary infrastructure and workforce-living systems, subcontract management, project controls, multi-discipline coordination, commissioning and handover. Where a category calls for a trade or a self-delivered service, this record does not answer it and is not offered as though it does.");
bullet("The scope at 3.1 was performed as the accountable interface, not as self-delivery. The accommodation, welfare and utilities themselves were supplied and installed by specialist subcontractors, under terms the director specified, procured and held. ETABLIX works the same way and does not present itself as a supplier of the plant.");
bullet("On the schemes at section 4 the director selected the contractor and recommended the award. The purchase order was placed by his employer's sourcing function, as it is in most organisations of that size. He is not presenting himself as having held delegated financial authority.");
bullet("CDM 2015 Principal Designer training is held. The duty holder role has not been held, and is accepted only where a client appoints it expressly and in writing.");
bullet("ETABLIX holds no ISO certification and makes no claim to any.");

/* ------------------------------------------------------------------ */
h1("7. A worked specimen of the deliverable");

p("Attached separately: a full worked example of the report ETABLIX produces, prepared on an invented project so that no client is identified. It demonstrates the method and the standard of output rather than asking an assessor to take either on trust, and it is the one piece of evidence in this submission that is the company's own work rather than the director's history.");

/* ---- signature, written for a statement rather than a policy ------- */
h1("Declaration");
p("I confirm that the experience set out above was performed by me personally, in the roles and on the dates stated, as an employee of the organisations named. None of it is presented as a contract performed by JNN GLOBAL LTD or by ETABLIX.", { after: 380 });
p("Signed  ..............................................................", { after: 140 });
p("Name  Justin Ngolu Nseya MCIOB", { after: 60 });
p("Position  Managing Director, JNN GLOBAL LTD trading as ETABLIX", { after: 60 });
p("Date  ....................................", { after: 300 });

/* ------------------------------------------------------------------ */
const NOTES = path.join(__dirname, "DIRECTOR-EXPERIENCE-NOTES.md");

d.build().then(() => {
  const lines = [
    "# Director's relevant experience — what the document does not yet say",
    "",
    "Generated by `node business/bids/build-director-experience.cjs`. Do not edit by",
    "hand: edit `business/bids/director-experience.data.cjs` and run the builder again.",
    "",
    "**The document is complete and issuable as it stands.** Every item below is a",
    "claim it does not make, not a hole in it. A field left empty is omitted, never",
    "printed as an empty bracket, because a bid document showing `[  ]` tells an",
    "assessor it was sent unfinished.",
    "",
  ];
  if (!gaps.length) {
    lines.push("Nothing outstanding. Everything the data file provides for is filled.");
  } else {
    lines.push(`## ${gaps.length} things only the director can supply`, "");
    lines.push("| What | Why it is worth adding |", "|---|---|");
    for (const [what, why] of gaps) lines.push(`| ${what} | ${why} |`);
  }
  lines.push("",
    "## The three Skye figures, and how each is stated",
    "",
    "**309 bedrooms** and **36 months** are confirmed by the director against the",
    "project record. They carry weight in the document because an accommodation scope",
    "with no size attached is worth little, and because they are the two numbers that",
    "let an assessor picture the village. State them as facts; they are.",
    "",
    "The **GBP 690 million** is different. It is labelled in the document as the",
    "promoter's value for the whole reinforcement scheme, not for the accommodation",
    "scope, and a test fails the build if it ever appears without that. Keep the",
    "distinction: an assessor who reads it as the value of his own scope and then",
    "discovers otherwise will discount everything else on the page.",
    "",
    "## Two things to know before this goes out",
    "",
    "**The award wording is deliberate.** Section 4.1 says the director selected the",
    "contractor and recommended the award, and that the order was placed by the",
    "sourcing function. That is the position he confirmed. It is the stronger answer,",
    "not a concession: a public buyer is reading for governance, and selection held by",
    "the technical owner with the order placed by a separate function is the",
    "separation of duties they want to see. Section 6 states it again so that nobody",
    "has to infer it.",
    "",
    "**Section 4.1's assessment bullet names the sourcing and civil engineering teams**",
    "on purpose. Sole accountability for a scope and drawing on specialist colleagues",
    "to assess returns are not in tension. An assessor reading that he evaluated",
    "multi-package quotations single-handed would not believe it.",
    "",
    "## Section 3.2's AZES RDC row, and what it deliberately leaves out",
    "",
    "The appointment is live and the role is being performed: the programme has",
    "mobilised and the director is directing it. So the row describes the",
    "responsibilities held, as a current role should.",
    "",
    "**Remuneration under that appointment has not started**, because it is subject to",
    "senior government approval. That fact is deliberately NOT in the document. It is",
    "a private commercial matter between the director and AZES, it says nothing about",
    "technical and professional ability, and a buyer assessing this submission has no",
    "legitimate interest in it. A document that volunteers it invites a question about",
    "financial standing that the accounts have already answered on their own terms.",
    "",
    "An earlier version of this row went the other way and said the programme had not",
    "mobilised and nothing had been delivered. That was wrong, and it was worse than",
    "wrong - it threw away a current, relevant, senior delivery role. Corrected.",
    "",
    "What does belong in the pack is the capacity question, because a current",
    "executive appointment raises it fairly. Section 10 of the CHIC method statement",
    "answers it directly - work that cannot be staffed is declined at enquiry - and",
    "the two documents should stay consistent.",
    "");
  fs.writeFileSync(NOTES, lines.join("\n"));

  console.log(`\nwrote ${NOTES}`);
  console.log(`\nTHE DOCUMENT IS COMPLETE AND ISSUABLE. No placeholder is printed in it.`);
  if (!submittedFor) {
    console.log(`\nTo name the scheme on the cover, pass it as an argument:`);
    console.log(`  node business/bids/build-director-experience.cjs "CHIC Development DPS, Category 1"`);
  }
  if (gaps.length) {
    console.log(`\n${gaps.length} claims it does not yet make (see the notes file):`);
    for (const [what] of gaps.slice(0, 6)) console.log(`  - ${what}`);
    if (gaps.length > 6) console.log(`  ... and ${gaps.length - 6} more`);
    console.log(`\nFill business/bids/director-experience.data.cjs and run this again.`);
  }
}).catch((err) => { console.error(err); process.exit(1); });
