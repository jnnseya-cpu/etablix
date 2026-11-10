/**
 * ETABLIX — capability statement for the NGED Secondary Network partnership.
 *
 *   node business/bids/build-nged-capability.cjs
 *   → business/bids/ETABLIX-NGED-Secondary-Network-Capability.docx and .pdf
 *
 * WHY A SECOND CAPABILITY STATEMENT AND NOT THE GENERAL ONE.
 *
 * The general statement describes a company that specifies and procures the
 * temporary site environment around permanent works, and it is written with a
 * single large compound in mind — a substation or a converter station, one
 * site, three years. Secondary network work is the opposite shape. Underground
 * cabling and overhead wood pole replacement across a licence area is dozens
 * of small work fronts moving week by week, in the public highway and across
 * third-party land, and almost every sentence that is true of a compound is
 * false of it.
 *
 * Sending the general statement to a Senior Category Buyer for underground
 * construction would therefore have been worse than sending nothing. It would
 * have said, accurately, that this company has not thought about her work.
 *
 * SO THE FOUR SECTIONS IN THE MIDDLE ARE THE DOCUMENT. Each is a fact about
 * NGED's own footprint or the statutory regime over it, each has a consequence
 * in weeks or in an unopenable route, and none of them would appear in a
 * statement written for anybody else. They are the test of whether the rest is
 * worth reading.
 *
 * AND WHAT IS NOT HELD IS STATED ON PAGE ONE. No ISO certification, no SSIP
 * registration, no employers' liability. A buyer who finds that out at
 * prequalification has been wasted; a buyer who reads it here can decide in a
 * minute whether there is a slot for an advisory firm in this process at all,
 * which is the only question that matters today.
 */
const B = require("../policies/brand.cjs");

const d = B.doc({
  slug: "NGED-Secondary-Network-Capability",
  running: "Capability statement — NGED secondary network",
  kicker: "CAPABILITY STATEMENT",
  title: "ENABLING CIVILS AND SITE SERVICES",
  sub: "Secondary Network Underground Cabling and Overhead Wood Pole Contractor Partnership",
  rev: null,
  kind: "statement",
  draftNote: false,
  outDir: __dirname,
  control: [
    ["Issued to", "National Grid Electricity Distribution — Procurement, UG Construction"],
    ["In response to", "Market engagement, Secondary Network UG Cabling and OH Wood Pole Contractor Partnership"],
    ["Legal entity", "JNN GLOBAL LTD, company number 15405437, registered in England and Wales"],
    ["Trading as", "ETABLIX — Integrated Site Services"],
    ["Registered office", "Groupe Nseya House, Kingstanding, Birmingham B44 8DJ"],
    ["Prepared by", "Justin Nseya MCIOB, Managing Director"],
    ["Position sought", "Specialist adviser to NGED or to an appointed delivery partner. Not a works contractor."],
  ],
});

const W = [3000, 6000];
const W3 = [2400, 3300, 3300];

/* ─────────────────────────────────────────────────────────────────────── */
d.h1("What this company is, and what it is not");

d.p("ETABLIX plans, specifies and coordinates the temporary site environment around permanent works. On a secondary network programme that means temporary access and compounds, enabling civils, traffic and logistics coordination, welfare, waste, and reinstatement — defined as packages with boundaries, priced on a stated basis, and handed over against written criteria.");

d.p("It is a consultancy. ETABLIX holds no plant, no direct labour and no works contracts. It does not excavate, lay cable, erect poles or reinstate highway, and it does not seek to. Those are the delivery partner's work and this company has no interest in competing for them.");

d.note("ETABLIX does not take, and will not accept, appointment as CDM 2015 Principal Contractor or Principal Designer. On NGED's networks those are NGED's or the delivery partner's roles, held by one organisation at a time, and a supplier whose document implies otherwise either misunderstands the regime or intends to compete with its customer.");

d.p("What is offered is the paper and the coordination: the output specification, the package boundaries, the interface register between the parties who hold each side of an obligation, and the mobilisation and demobilisation sequence. Under every arrangement ETABLIX works under, the client holds every supplier contract and pays every supplier directly. This company never holds a works contract and never holds the client's money.");

/* ─────────────────────────────────────────────────────────────────────── */
d.h1("Four things about this partnership's footprint");

d.p("Each of the following is specific to the scope in the market engagement notice. They are set out first because they are the test of whether the rest of this document is worth reading.");

d.h2("1 · NGED's four licence areas span two statutory reinstatement specifications");

d.p("East Midlands, West Midlands and South West are in England. South Wales is in Wales. England works to the Specification for the Reinstatement of Openings in Highways, fourth edition, statutory from 10 May 2021, together with the addendum of 30 May 2025 covering electric vehicle charging cable reinstatement. Wales works to its own Specification, second edition, dated 2006.");

d.p("The consequence is practical rather than academic. Reinstatement design, permitted materials, guarantee periods and the inspection regime differ between the two codes, so one reinstatement method statement cannot cover the footprint and a reinstatement rate built in Birmingham is not the rate in Swansea. A partnership awarded across all four areas carries that difference whether or not anybody has priced it.");

d.table(W, ["Licence area", "Reinstatement specification applying"], [
  ["East Midlands", "England — SROH 4th edition (statutory 10 May 2021), plus the EV cable addendum of 30 May 2025"],
  ["West Midlands", "England — as above"],
  ["South West", "England — as above"],
  ["South Wales", "Wales — SROH 2nd edition (2006)"],
]);

d.h2("2 · Section 58 restrictions decide cable routes before the design does");

d.p("Under the New Roads and Street Works Act 1991 a street authority may restrict further openings after it has carried out substantial road works. The periods now in force, set out in the Code of Practice for the co-ordination of street and road works of March 2026, are three years following reconstruction, two years following resurfacing or an alteration of level, one year for other works in a traffic-sensitive street and six months for other works elsewhere. Substantial works are those extending at least thirty metres continuously, and the authority gives a minimum of three months' notice before a restriction takes effect.");

d.p("So a cable route selected without first reading the street authority's restriction register may be a route that cannot lawfully be opened. That is not discovered at design freeze. It is discovered at permit application, which is typically the last few weeks before mobilisation, and the redesign that follows is unpaid and unprogrammed.");

d.p("Checking the register against the proposed route is a desk exercise measured in hours. It belongs at route selection, and on a dispersed programme it is the single cheapest piece of enabling work there is.");

d.h2("3 · On the overhead pole work, land rights are the critical path, not the civils");

d.p("Access tracks, temporary matting, pole storage and laydown for wood pole replacement sit on third-party land. The right to be there comes first. Under Schedule 4 to the Electricity Act 1989 a licence holder serves notice calling for a voluntary wayleave and, where one is not granted within twenty-one days, may apply for a necessary wayleave; where an existing wayleave comes to an end there is a three-month window in which to apply. Voluntary consents on the standard forms are terminable on six or twelve months' notice depending on the form used.");

d.p("The consequence for an enabling programme is that the land-rights path, not the groundworks, sets the earliest possible start on a pole front — and a civils package mobilised against a wayleave that is still in application is a crew standing on land it has no right to occupy.");

d.h2("4 · Secondary network work has no compound. It has a sequence of them");

d.p("A substation has one compound for three years. Underground cabling and pole replacement across a licence area has many small fronts that move weekly, and three things follow from that which do not follow on a single site.");

d.table(W3, ["", "On a single compound", "On a dispersed programme"], [
  ["Welfare", "Fixed, sized to a peak headcount", "Has to stay within reach of a working face that keeps moving"],
  ["Storage and laydown", "Built once, on the site", "Licensed or rented, repeatedly, often off the highway and on third-party land"],
  ["Demobilisation", "Once, at the end", "Continuous — reinstatement and off-hire run alongside the next front opening"],
]);

d.p("The commercial consequence is that the preliminaries are not a lump sum. They are a rate per front per week, and what goes wrong is almost never inside a front — it is the interface between one front closing and the next opening, which is where welfare, plant, traffic management and reinstatement all change hands at once and where nobody's package says who moves them.");

/* ─────────────────────────────────────────────────────────────────────── */
d.pageBreak();
d.h1("Scope ETABLIX specifies and coordinates");

d.p("Named as the industry names them, so that a package boundary can be drawn against this list rather than around it.");

d.table(W, ["Area", "What is specified and coordinated"], [
  ["Temporary access and compounds", "Satellite compound siting and sizing, laydown and storage, access tracks, temporary matting, wheel washing, security and fencing"],
  ["Enabling civils", "Clearance, hardstanding, temporary drainage and runoff control, trial holes and service location as an enabling activity, access crossings"],
  ["Traffic and logistics", "Traffic management design interface, permit and notice sequencing, delivery and collection windows, gate and front access coordination"],
  ["Welfare", "Welfare provision against CDM 2015 Schedule 2 for a transient workforce, including the reach constraint on a moving face"],
  ["Waste and arisings", "Excavated material classification, duty of care documentation, carrier and destination verification, segregation and removal routes"],
  ["Reinstatement", "Reinstatement obligations by licence area under the applicable Specification, interim and permanent sequencing, guarantee and inspection exposure"],
  ["Demobilisation", "Off-hire, removal, condition evidence and landowner or highway authority acceptance, front by front"],
]);

/* ─────────────────────────────────────────────────────────────────────── */
d.h1("How ETABLIX would work alongside a delivery partner");

d.p("Two arrangements, and only two. Both leave the works contracts with the party that holds them today.");

d.table(W, ["Arrangement", "What it means in practice"], [
  ["Advisory", "A fixed professional scope: output specification, package boundaries, interface register, procurement-ready documents and a handover pack. The client or the delivery partner procures and manages. ETABLIX holds nothing."],
  ["Management Integrator", "The above, plus coordination of the appointed suppliers against those boundaries during mobilisation and operation. The client still holds every supplier contract and pays every supplier directly."],
]);

d.p("Engagements are on a fixed scope for a fixed fee. ETABLIX does not take a margin on supplier spend, does not pass supplier invoices through its own books, and has no commercial interest in which supplier is appointed — which is the reason a specification it writes can be relied on in a comparison.");

/* ─────────────────────────────────────────────────────────────────────── */
d.h1("Standing, insurance and accreditation — including what is not held");

d.p("Stated in full here because a buyer who learns it at prequalification has been wasted.");

d.table(W, ["Item", "Position"], [
  ["Legal entity", "JNN GLOBAL LTD, company number 15405437, registered in England and Wales"],
  ["Trading names", "ETABLIX — Integrated Site Services, and JNseya Construction Consultant. One legal entity, one set of insurances, one supplier record."],
  ["Professional indemnity", "£5,000,000, in force from 26 October 2026. Certificate available on request."],
  ["Public liability", "£5,000,000, in force from 26 October 2026. Certificate available on request."],
  ["Employers' liability", "Not held. The company is exempt as a single-director company whose director holds a majority of the shares. No ETABLIX personnel undertake construction operations. Cover would be put in place before any engagement requiring personnel on site."],
  ["ISO certification", "None held. Not ISO 9001, 14001 or 45001 certified."],
  ["SSIP registration", "None held."],
  ["What the insurance answers", "The policy in force insures a consultant. It does not respond to holding works contracts, which is why ETABLIX does not hold them."],
]);

d.note("A works contractor on this partnership will be expected to hold accreditations this company does not have. That is the correct reading. ETABLIX is not applying to be a delivery partner and could not qualify as one; it is asking whether there is a slot for a specialist adviser working to NGED or to the partners NGED appoints.");

/* ─────────────────────────────────────────────────────────────────────── */
d.h1("What is being asked of NGED");

d.p("Two questions, both answerable in a line, and both of which decide whether this company takes up any more of the category team's time.");

d.table(W, ["", "Question"], [
  ["1", "NGED sources through the Achilles UVDB, and higher-risk categories additionally require UVDB Verify. Which UVDB product codes will the Secondary Network partnership use, and is there a code under which specialist advisory and site-establishment scope would be registered?"],
  ["2", "Does specialist advisory scope of this kind sit inside the partnership, or is it expected to be procured by the appointed regional delivery partners? If the latter, ETABLIX would ask only to be visible to those partners once they are known, and would approach none of them about this procurement before NGED says that is the route."],
]);

d.p("ETABLIX also asked to be considered for the supplier day on 30 November. If attendance is reserved to prospective delivery partners, that is understood and a written note of the route for specialist firms would be more use than a place in the room.");

/* ─────────────────────────────────────────────────────────────────────── */
d.h1("Contact");

d.table(W, ["", ""], [
  ["Justin Nseya MCIOB", "Managing Director"],
  ["Company", "ETABLIX, part of JNN GLOBAL LTD, company 15405437"],
  ["Email", "contact@etablix.com"],
  ["Mobile", "+44 7493 216101"],
  ["Registered office", "Groupe Nseya House, Kingstanding, Birmingham B44 8DJ, United Kingdom"],
  ["Web", "etablix.com"],
]);

d.p("Every figure, period and reference in this document is a statutory or published source cited by name and date, so that each can be checked rather than taken on trust. Nothing in it is a priced offer.");

d.build().then(() => {
  console.log("capability statement written");
}).catch((err) => { console.error(err); process.exit(1); });
