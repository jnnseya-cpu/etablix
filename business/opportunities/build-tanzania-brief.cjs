/**
 * ETABLIX — company profile. Two pages. Word and PDF.
 *
 *   node business/opportunities/build-tanzania-brief.cjs
 *
 * Revision 2. Revision 1 was five pages, most of it about what the company
 * does not yet have, and it included an unprompted section on the Bribery Act.
 * A capability profile is not a due diligence pack. What belongs in a
 * prequalification questionnaire does not belong in the document somebody
 * forwards to a colleague to say "look at this".
 *
 * This is written to be read in three minutes and forwarded. It leads with the
 * problem in the reader's own language, states the scope, states how the
 * commercial arrangement works, and asks for a call.
 */
const B = require("../policies/brand.cjs");

const REV = "2";
const d = B.doc({
  slug: "Company-Profile",
  running: "ETABLIX — company profile",
  kicker: "ETABLIX · INTEGRATED SITE SERVICES",
  title: "COMPANY PROFILE",
  sub: "one contract, one programme, one budget for the whole temporary site",
  rev: REV,
  outDir: __dirname,
  kind: "profile",
  control: [
    ["Company", "JNN GLOBAL LTD, trading as ETABLIX"],
    ["Registered", "England and Wales · Company No. 15405437"],
    ["Registered office", "Groupe Nseya House, Kingstanding, Birmingham B44 8DJ, United Kingdom"],
    ["Contact", "[name], Managing Director · [email] · [telephone]"],
    ["Web", "etablix.com"],
    ["Date", "[date]"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak } = d;

/* ------------------------------------------------------------------ */
h1("The problem");

rich([{ t: "On a major project the permanent works have an owner, a designer, a programme and a budget somebody defends. The temporary site does not. ", b: true },
  { t: "The compound, welfare, temporary power and water, access, laydown, logistics, waste, security and workforce accommodation end up as twenty or more separate subcontracts — none of them the work the contractor was appointed to do, all of them consuming the attention of the people who should be building." }]);

p("The cost is set at bid stage from the last project's rates, by somebody who will not run this one, and tested for the first time in the week the site opens. On a large programme that is a very large number to leave to inheritance.");

/* ------------------------------------------------------------------ */
h1("What ETABLIX does");

rich([{ t: "One contract, one programme, one budget and one accountable organisation for the entire temporary site. ", b: true },
  { t: "The contractor gets its senior people back onto the permanent works. The client gets a site cost that was worked out rather than assumed." }]);

table([2200, 6100],
  ["", ""],
  [
    ["SPECIFY", "The site establishment requirement, built from the programme, the location and the real workforce — not from a benchmark rate. Compound layout, welfare, temporary power and water, access and haul routes, laydown, logistics, waste, security, accommodation and catering."],
    ["QUANTIFY", "The demand model underneath it: people by month, power by phase, water, waste, vehicle movements. A number that can be defended line by line to a client, a lender or an auditor."],
    ["PROCURE", "Package scopes, enquiries to a qualified supply chain, like-for-like bid comparison, and an award recommendation with the comparison shown."],
    ["CONTROL", "Supplier performance managed against the specification for the life of the programme, reported monthly against the demand model rather than against last month."],
  ]);

/* ------------------------------------------------------------------ */
h1("Scope of services");

table([2700, 5600],
  ["Category", "Covered"],
  [
    ["Site establishment", "Compound layout and phasing, offices, stores, laydown, hardstanding, fencing, gates, signage — and demobilisation and reinstatement, priced at the start rather than found at the end."],
    ["Welfare and accommodation", "Canteens, drying rooms, sanitary and medical provision sized to the peak workforce; construction camps and managed accommodation, catering, housekeeping and transport to site."],
    ["Temporary utilities", "Power generation or grid connection, distribution, lighting, potable and process water, sewage, telecoms and site-wide connectivity."],
    ["Access and logistics", "Haul roads, wheel wash, traffic management, delivery scheduling, offload and materials handling."],
    ["Security, waste and environment", "Manned guarding, CCTV, perimeter and access control; waste streams and routes, recycling, spill, dust and noise control."],
  ], { size: 16 });

/* ------------------------------------------------------------------ */
h1("Where this is worth the most");

p("On remote, large and multi-contractor programmes — LNG, power generation, transmission, industrial and data centre construction — three things are true at once, and together they make the temporary site a major project in its own right.");

table([2600, 5700],
  ["", ""],
  [
    ["A thin local supply chain", "Almost nothing can be procured reactively. What is not planned twelve to eighteen months out arrives late or at cost. Planning it early is the single largest saving available on this kind of site."],
    ["A workforce beyond the local catchment", "The camp becomes a small town: accommodation, catering, water, sewage, medical, transport, security. It is a programme in its own right and it is usually appended to somebody else's scope."],
    ["Several contractors on one site", "Shared roads, power, welfare, security and waste. Procured separately by each party they compete for the same regional capacity, and the last to ask pays the most for the least. Procured once, across the site, they do not."],
  ]);

richBullet([{ t: "One camp, one power strategy, one logistics plan, one security arrangement — specified once for the whole site. ", b: true },
  { t: "That is the saving that cannot be recovered by negotiation later, because by then five contractors have each procured their own." }]);

/* ------------------------------------------------------------------ */
h1("How we work");

table([1200, 2800, 4300],
  ["Model", "", "Commercial arrangement"],
  [
    ["A", "Advisory", "ETABLIX specifies, quantifies and tenders. The client procures and manages. Fixed fee."],
    ["B", "Management Integrator", "ETABLIX specifies, tenders, recommends and manages performance. The client contracts directly with each supplier and pays them directly — ETABLIX holds no supply chain money and takes no supplier margin. Management fee."],
    ["C", "Prime Service Contractor", "ETABLIX contracts for the whole temporary site as a single package and carries the supply chain. One contract, one point of accountability."],
  ]);

p("Model B is the usual starting point on a large programme: a single accountable organisation for the site, without moving supply chain risk, and a bid comparison that is genuinely independent because nothing in it is marked up.");

/* ------------------------------------------------------------------ */
h1("Leadership");

fillIn("[Director name], Managing Director. Chartered — MCIOB. Two or three sentences: years in the industry, the sectors, the scale of site and workforce personally managed, and the kind of scheme. Written in the third person and kept to facts a referee would confirm.]");

fillIn("[Optional second paragraph: the specific experience most relevant to this reader — remote sites, energy construction, large temporary works, multi-contractor environments.]");

/* ------------------------------------------------------------------ */
h1("Working internationally");

p("ETABLIX is a United Kingdom company and works through established local partners outside the UK. The partner brings entity, licences, people, plant and local supply chain; ETABLIX brings the specification, the demand model, the procurement discipline and the reporting. Local delivery stays in local hands; the site cost stays under one method.");

/* ------------------------------------------------------------------ */
h1("Next step");

p("A thirty-minute call, and if it is useful, a single site taken as a first piece of work: a fixed scope, a fixed duration and a written report on what the site establishment should cost and why. It is deliberately small, because it is the quickest way for both sides to judge the method on something real.");

fillIn("[Director name] · [email] · [telephone] · etablix.com");

d.build().then(() => {
  console.log("\nBEFORE SENDING");
  console.log("  - the leadership section: the director's record, third person, facts only");
  console.log("  - the contact details and the date");
}).catch((err) => { console.error(err); process.exit(1); });
