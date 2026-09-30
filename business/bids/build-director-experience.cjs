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
const REV = "3";

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
     "Midland Main Line Upgrade " + DASH + " civil and MEP coordination in a live operational rail environment, with programme controls and earned value monitoring. Ministry of Justice " + DASH + " infrastructure upgrades within secure operational estates, balancing technical delivery against operational continuity."],
    ["Project controls and assurance",
     "Turner & Townsend, Project Manager, Aug 2015 – Aug 2017",
     "Schedule, risk, reporting, governance and delivery assurance across major national infrastructure programmes; procurement, contractor coordination and contract administration support."],
    ["Site-level construction management",
     "William Davis, Midland Heart and Willmott Dixon, Assistant Construction Manager, 2012 – 2015",
     "Site operations, subcontractor coordination, construction sequencing, HSE compliance, quality inspections and programme monitoring on residential and public sector projects."],
    ["Current appointment",
     "Agence des Zones Économiques Spéciales (AZES RDC), Technical Director of Operations (contract), Jan 2026 to date",
     "Executive technical and delivery leadership on large-scale industrial and economic-zone infrastructure: power, roads, water, logistics, utilities and industrial facilities, directing EPC contractors, consultants and delivery partners. Recorded here because it is current and because a record checked against a curriculum vitae should not have a hole in it."],
  ], { size: 16 });

/* ------------------------------------------------------------------ */
pageBreak();
h1("4. Three schemes in detail");

p("Strongest first. Each records what the director was personally accountable for, in the order the work happened.");

const SCOPE = {
  "4.1": [
    "Established the site requirement from the construction programme " + DASH + " headcount, shift pattern, duration, location, and the ground and consent constraints " + DASH + " and converted it into an enquiry scope and a tender-stage budget allowance, before any price existed.",
    "Identified and approached the contractor and supplier market for each package and built the bidder list. Where no suitable contractor was already established in the territory, found and qualified new ones rather than accepting a thin field.",
    "Issued the enquiry documents: scope, specification, programme dates, site constraints and the pricing schedule against which returns would be compared on the same basis.",
    "Assessed the returned quotations alongside the sourcing and civil engineering teams " + DASH + " technical compliance against the specification, price against the budget allowance, programme against the construction sequence, and the qualifications and exclusions each bidder had written into its own return.",
    "Selected the contractor for each package and recommended the award; the order was placed by the sourcing function. Held the resulting terms thereafter and was accountable for performance against them.",
    "Integrated the appointed works into the construction programme and the site logistics, and held the interfaces with engineering, planning, HSE and commissioning through mobilisation, installation and connection.",
    "Monitored the appointed contractors for the life of the establishment against scope, programme, quality, HSE and commercial position; raised non-conformance and closed it out.",
    "Closed out demobilisation: removal, off-hire, reinstatement of the land to the condition the agreement required, and the final account.",
  ],
  "4.2": [
    "Coordinated civil and mechanical, electrical and plumbing works in a live operational rail environment, sequencing construction around operational running rather than around the design.",
    "Implemented programme controls and earned value monitoring on the scope, and reported performance against the baseline rather than against the last report.",
    "Controlled the technical interfaces between designers, contractors, consultants and the client's operational teams, and ran the requests for information and contractor queries through to resolution.",
    "Chaired progress and health and safety coordination meetings.",
    "Administered the CDM 2015 obligations that sat within the appointment, including confirming the construction phase plan was in place and suitable before work started on site.",
    "Managed cost performance and the risk register against the scope, and escalated where intervention above project level was required.",
    "Took the scope through testing, commissioning and operational handover.",
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
  "4.1": "Held under the scope set out at 3.1. On this scheme the director carried the site establishment and workforce-living scope as the single accountable interface " + DASH + " requirements and tender-stage specification, procurement, integration into the construction programme, mobilisation, daily operation, and demobilisation and reinstatement " + DASH + " alongside subcontract management of the construction works.",
  "4.2": "Offered because it evidences delivery in a live operational environment, where the establishment and the works have to be sequenced around an asset that cannot be stopped. That constraint is the one most often underestimated in site establishment pricing.",
  "4.3": "Offered because it is client-side. The director sat in the seat a public buyer occupies, holding contractors and consultants to account on the authority's behalf and reporting to its boards, which is the perspective this application is being assessed from.",
};

for (const s of DATA.schemes) {
  h2(`${s.ref}  ${s.title}`);
  if (INTRO[s.ref]) p(INTRO[s.ref]);

  const rows = [["Employer", s.employer], ["Role held", s.role], ["Dates", s.dates]];
  if (has(s.location)) rows.push(["Location", s.location]);
  if (has(s.endClient)) rows.push(["Client / end client", s.endClient]);
  if (has(s.schemeValue)) rows.push(["Scheme value", s.schemeValue]);
  if (has(s.scopeValue)) rows.push(["Value of the scope personally held", s.scopeValue]);
  if (has(s.peakWorkforce)) rows.push(["Peak workforce on site", s.peakWorkforce]);
  if (has(s.establishmentMonths)) rows.push(["Duration of site establishment", s.establishmentMonths]);
  if (has(s.referee)) rows.push(["Referee", s.referee]);
  table([2400, 5900], ["", ""], rows, { size: 16 });

  rich([{ t: "Scope personally accountable for", b: true }]);
  for (const b of (SCOPE[s.ref] || [])) bullet(b);

  if (has(s.outcome)) {
    rich([{ t: "What was different because the director did it", b: true }]);
    p(s.outcome);
  }

  for (const [label, field, why] of [
    ["scheme value", s.schemeValue, "the size of what he worked on"],
    ["value of the scope personally held", s.scopeValue, "the size of what he held, which is the number an assessor actually weighs"],
    ["peak workforce", s.peakWorkforce, "the scale of the establishment"],
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
    "## Section 3.2 carries the current AZES RDC appointment",
    "",
    "It is there because the record will be read against the curriculum vitae and a",
    "gap at the top of the chronology reads as concealment. It does raise capacity,",
    "which section 10 of the CHIC method statement answers directly: work that cannot",
    "be staffed is declined at enquiry. Keep those two documents consistent.",
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
