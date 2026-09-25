/**
 * ETABLIX — Carbon Reduction Plan. Word and PDF.
 *
 *   node business/policies/build-carbon-reduction-plan.cjs
 *
 * Built to the reporting standard at Procurement Policy Note 06/21, which is
 * a hard gate on central government contracts above £5 million a year. The
 * section order and the headings are the template's, not an improvement on
 * it: an evaluator checks this document against a structure they already
 * know, and a better-organised plan that does not match reads as a
 * non-compliant one.
 *
 * WHAT PPN 06/21 ACTUALLY REQUIRES, so it can be checked off:
 *   - a commitment to achieving Net Zero by 2050
 *   - a baseline emissions footprint: baseline year, Scope 1, Scope 2, and
 *     five named Scope 3 categories, with a total
 *   - current emissions for the reporting year, on the same basis
 *   - emissions reduction targets
 *   - carbon reduction projects, completed and planned
 *   - a declaration signed by a director, published on the supplier's UK
 *     website, and updated annually
 *
 * THE FIVE SCOPE 3 CATEGORIES ARE NAMED, NOT SUMMARISED. PPN 06/21 requires
 * categories 4, 5, 6, 7 and 9 of the GHG Protocol and no others. A plan that
 * reports "Scope 3" as one number has not met the standard, and a plan that
 * reports all fifteen categories has done more work than required and will
 * still be marked against the five.
 *
 * WHY THE NUMBERS ARE FIELDS RATHER THAN FIGURES. Every figure in a carbon
 * reduction plan is an assertion the supplier signs. Inventing them would be
 * the same offence as inventing a case study, with a director's signature
 * under it. Section 9 names the specific record each number comes from — a
 * fuel receipt, an energy bill, a mileage log, a waste transfer note — so the
 * plan is an evening's work with the paperwork to hand rather than a research
 * project.
 *
 * THE PLAN CANNOT BE PUBLISHED UNTIL THOSE FIELDS ARE FILLED. That is said in
 * the build output as well as in the document.
 */
const B = require("./brand.cjs");

const REV = "1";
const PPN = "PPN 06/21";
const NET_ZERO_YEAR = "2050";

const d = B.doc({
  slug: "Carbon-Reduction-Plan",
  running: "Carbon Reduction Plan",
  kicker: "CARBON REDUCTION PLAN",
  title: "NET ZERO BY 2050",
  sub: `prepared to the reporting standard at ${PPN}`,
  rev: REV,
  control: [
    ["Document", "Carbon Reduction Plan"],
    ["Revision", REV],
    ["Reporting standard", `${PPN} — Taking account of carbon reduction plans in the procurement of major government contracts`],
    ["Publication date", "[date — must be within the last 12 months at the point any bid relies on it]"],
    ["Baseline year", "[baseline year]"],
    ["Reporting year", "[current reporting year]"],
    ["Supplier", "JNN GLOBAL LTD, trading as ETABLIX · Company No. 15405437"],
    ["Approved by", "[name], Managing Director, on behalf of the board"],
    ["Published at", "[URL] — a UK website, as the standard requires"],
    ["Review", "Annually. A plan more than 12 months old does not meet the standard."],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ------------------------------------------------------------------ */
h1("1. Commitment to achieving Net Zero");

rich([
  { t: `JNN GLOBAL LTD, trading as ETABLIX, is committed to achieving Net Zero emissions by ${NET_ZERO_YEAR}. `, b: true },
  { t: "This commitment is published, approved by the board, signed by a director, and reviewed annually. It covers the emissions this company controls and the emissions it influences, and the second of those is much the larger of the two." },
]);

note(`This is the commitment ${PPN} requires in these words and in this position. Everything after it is the evidence that the commitment means something.`);

/* ------------------------------------------------------------------ */
h1("2. The shape of this company, and why it matters to the numbers");

p("ETABLIX is a company with one working director and no other employees. It owns no premises, operates no plant, holds no stock and manufactures nothing. Its own emissions are therefore very small, and a plan that stopped there would be arithmetically correct and commercially useless.");

rich([{ t: "What this company specifies is bought by somebody else, and that is where the carbon is. ", b: true },
  { t: "ETABLIX scopes, specifies, tenders and recommends temporary site establishment: compounds, welfare, temporary power and water, access, logistics and security. The emissions from a site compound over an eighteen-month programme — generator fuel, cabin heating, water haulage, waste movements, workforce travel — are several orders of magnitude larger than this company's own footprint, and they are substantially decided at the point the specification is written." }]);

table([3600, 4700],
  ["", ""],
  [
    ["Reported below (sections 4 and 5)", "ETABLIX's own Scope 1, Scope 2 and the five Scope 3 categories the standard requires. Small numbers, honestly measured."],
    ["Addressed at section 7", "The emissions ETABLIX influences through the specifications it writes. Not reportable as this company's emissions, not claimed as reductions, and the only reason a client should care what is in this plan."],
  ]);

note("Both halves are stated deliberately. A micro-business reporting a tiny footprint and claiming a large environmental contribution has overclaimed. One reporting a tiny footprint and saying nothing about its influence has understated the only thing that makes it useful to a buyer.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("3. Basis of reporting");

table([2600, 5700],
  ["", ""],
  [
    ["Standard", `${PPN}, and the GHG Protocol Corporate Accounting and Reporting Standard for Scopes 1 and 2, and the Corporate Value Chain (Scope 3) Standard for the categories below.`],
    ["Conversion factors", "UK Government GHG Conversion Factors for Company Reporting, for the year being reported. The set used is stated against each reporting year so a figure can be reproduced."],
    ["Unit", "Tonnes of carbon dioxide equivalent (tCO2e), to two decimal places, because at this scale a figure rounded to whole tonnes is mostly zero."],
    ["Scope 2 method", "[location-based or market-based — state which, and use the same one every year. Changing method between years is a change in the number that is not a change in the emissions.]"],
    ["Organisational boundary", "Operational control. ETABLIX has one operating entity and no subsidiaries, so there is no consolidation to explain."],
    ["Verification", "None. These figures are not independently verified and this plan does not claim they are."],
  ]);

h2(`3.1  The five Scope 3 categories ${PPN} requires`);

p("The standard names five categories of the GHG Protocol's fifteen. Those five are reported and the other ten are not, which is the standard's intent rather than an omission.");

table([1200, 3100, 4000],
  ["Category", "GHG Protocol name", "What it is for this company"],
  [
    ["4", "Upstream transportation and distribution", "Delivery of goods purchased by ETABLIX. At present: occasional office and IT equipment deliveries."],
    ["5", "Waste generated in operations", "Office and electrical waste. Small, and still counted."],
    ["6", "Business travel", "Travel to client sites, meetings and site visits. Expected to be the largest single line."],
    ["7", "Employee commuting", "One director. Where the director works from home, this category and the homeworking energy treatment are stated rather than assumed."],
    ["9", "Downstream transportation and distribution", "Distribution of goods sold by ETABLIX. ETABLIX sells services and no physical goods, so this is expected to be nil — and nil is reported as nil rather than left blank."],
  ]);

note("A blank cell and a zero mean different things to an assessor. A blank means the supplier did not look. A zero with a sentence explaining why means the supplier looked and found nothing, which is a stronger answer than a small number.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("4. Baseline emissions footprint");

p(`Baseline emissions are a record of the emissions that occurred before any strategy in this plan was introduced. They are the reference point against which every later reduction is measured, and they are not restated unless the basis changes — in which case the change is declared.`);

table([2600, 5700],
  ["", ""],
  [
    ["Baseline year", "[state the year. For a company in its first years of trading, the first full period for which records exist is the correct baseline, and saying so is not a weakness.]"],
    ["Period covered", "[from — to. If the period is shorter than twelve months, say so and say why. A part-year baseline that is declared is acceptable; one that is presented as a full year is not.]"],
    ["Basis", "Records held by the company: fuel receipts, energy bills, mileage records, waste transfer notes. See section 9."],
  ]);

h2("4.1  Baseline year emissions");

table([3600, 2400, 2300],
  ["Emissions", "Total (tCO2e)", "Source of the figure"],
  [
    ["Scope 1", "[ ]", "Fuel combusted in assets the company owns or controls"],
    ["Scope 2", "[ ]", "Purchased electricity"],
    ["Scope 3 — Cat 4 Upstream transport", "[ ]", "Supplier delivery records"],
    ["Scope 3 — Cat 5 Waste", "[ ]", "Waste transfer notes"],
    ["Scope 3 — Cat 6 Business travel", "[ ]", "Mileage log, rail and air tickets"],
    ["Scope 3 — Cat 7 Employee commuting", "[ ]", "Commuting pattern and distance"],
    ["Scope 3 — Cat 9 Downstream transport", "[ ]", "Nil expected — services only"],
    ["TOTAL EMISSIONS", "[ ]", "Sum of the above"],
  ]);

fillIn("Every cell above is a figure a director signs. Fill them from the records named at section 9 and from no other source. An estimate is acceptable where it is declared as one and its method is stated; an invented figure is not, and it sits under a signature.");

/* ------------------------------------------------------------------ */
h1("5. Current emissions reporting");

table([2600, 5700],
  ["", ""],
  [
    ["Reporting year", "[year]"],
    ["Period covered", "[from — to]"],
    ["Conversion factor set", "[year of the UK Government conversion factors used]"],
  ]);

table([3600, 2400, 2300],
  ["Emissions", "Total (tCO2e)", "Change against baseline"],
  [
    ["Scope 1", "[ ]", "[ ]"],
    ["Scope 2", "[ ]", "[ ]"],
    ["Scope 3 — Cat 4 Upstream transport", "[ ]", "[ ]"],
    ["Scope 3 — Cat 5 Waste", "[ ]", "[ ]"],
    ["Scope 3 — Cat 6 Business travel", "[ ]", "[ ]"],
    ["Scope 3 — Cat 7 Employee commuting", "[ ]", "[ ]"],
    ["Scope 3 — Cat 9 Downstream transport", "[ ]", "[ ]"],
    ["TOTAL EMISSIONS", "[ ]", "[ ]"],
  ]);

note("In the first year the baseline and the reporting year are the same period, and both tables carry the same figures. That is correct and expected for a new organisation. State it rather than leaving the second table empty.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("6. Emissions reduction targets");

p("Targets are stated against the baseline, with a date, in the unit reported above. A target without a date and a number is a sentiment.");

table([2400, 2000, 3900],
  ["Target", "By", "How it is achieved"],
  [
    ["Net Zero", NET_ZERO_YEAR, "The commitment at section 1. Everything below is the path to it."],
    ["[ ]% reduction against baseline", "[year]", "Principally business travel — the largest line for a company of this shape. Achieved by the measures at section 7."],
    ["Scope 2 at or near zero", "[year]", "A renewable electricity tariff is the single cheapest reduction available to a business with no premises of its own and should be the first one taken."],
    ["Scope 3 Cat 6 measured, not estimated", "[year]", "A mileage and travel log kept contemporaneously rather than reconstructed at year end. Better data usually moves a figure; it is recorded either way."],
  ]);

fillIn("Set one numeric interim target with a date, and make it one you expect to meet. An assessor reading an unmet target next year forms a view of the whole plan, and a modest target met is worth more than an ambitious one missed.");

/* ------------------------------------------------------------------ */
h1("7. Carbon reduction projects");

h2("7.1  Within this company");

p("Measures available to an organisation of this size, each either done or dated. Small in absolute terms and reported honestly as such.");

table([3200, 1500, 3600],
  ["Measure", "Status", "Effect"],
  [
    ["Renewable electricity tariff", "[done / by date]", "Reduces Scope 2 towards zero on a market-based method."],
    ["Contemporaneous mileage and travel log", "[done / by date]", "Makes Cat 6 measured rather than estimated, which is the precondition for reducing it."],
    ["Video meetings as the default for anything that is not a site visit", "[done / by date]", "The largest practical lever on Cat 6 for a consultancy."],
    ["Rail in preference to car or domestic air where the journey allows", "[done / by date]", "Applied to site visits where a site is reachable by rail."],
    ["Electric or hybrid for the next vehicle change", "[by date]", "Scope 1. Stated as a decision at the point of change rather than an early replacement, because scrapping a serviceable vehicle has a carbon cost of its own."],
    ["Equipment kept to end of life and disposed of through WEEE routes", "[done / by date]", "Cat 5, and the embodied carbon not counted here."],
  ]);

h2("7.2  In the specifications this company writes");

rich([{ t: "This is the part of this plan that is worth a client's attention, and it is not reported as ETABLIX's emissions. ", b: true },
  { t: "It is influence over somebody else's, exercised at the only moment it is cheap to exercise: before the compound is procured. None of the following is claimed as a reduction against this company's baseline, because it is not one." }]);

table([3200, 5100],
  ["What the specification does", "Why it reduces emissions on the client's project"],
  [
    ["Sizes generation to the measured demand profile rather than to a benchmark",
     "An oversized generator runs at low load for the whole programme, burning fuel at poor efficiency. Sizing is decided once, at specification, and cannot be undone later without replacing the set."],
    ["Specifies grid connection or hybrid battery where the programme and the connection date allow",
     "The largest single reduction available on most compounds, and it depends entirely on being considered early enough for the connection lead time to be met."],
    ["Specifies cabin fabric and heating standards rather than accepting stock",
     "Cabin heating runs for the whole winter on every site. The specification decides it; the hire rate rarely reflects it."],
    ["Locates welfare and access to reduce on-site vehicle movement",
     "A compound laid out around the programme rather than around the site entrance reduces plant and vehicle movement daily for the life of the job."],
    ["Specifies water and waste routes rather than leaving them to be arranged",
     "Water haulage and waste movements are vehicle movements. They are usually arranged reactively and are visible in advance."],
    ["Requires suppliers to state fuel type, plant age and emissions standard at enquiry",
     "A requirement at enquiry is a selection criterion. The same requirement after award is a request."],
  ]);

note("ETABLIX recommends and the client decides. This plan does not claim reductions on projects ETABLIX does not control, and it does not report client-side savings in its own figures. What it commits to is that these points are put in writing in every specification, whether or not the client adopts them.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("8. Declaration and sign off");

p(`This Carbon Reduction Plan has been completed in accordance with ${PPN} and the associated guidance and reporting standard for Carbon Reduction Plans.`);

p("Emissions have been reported and recorded in accordance with the published reporting standard for Carbon Reduction Plans and the GHG Reporting Protocol corporate standard, and use the appropriate Government emission conversion factors for greenhouse gas company reporting.");

p("Scope 1 and Scope 2 emissions have been reported in accordance with SECR requirements, and the required subset of Scope 3 emissions have been reported in accordance with the published reporting standard for Carbon Reduction Plans and the Corporate Value Chain (Scope 3) Standard.");

p("This Carbon Reduction Plan has been reviewed and signed off by the board of directors (or equivalent management body).");

table([2600, 5700],
  ["", ""],
  [
    ["Signed", "[signature]"],
    ["Name", "[name]"],
    ["Title", "Managing Director, for and on behalf of JNN GLOBAL LTD trading as ETABLIX"],
    ["Date", "[date]"],
  ]);

note("The four paragraphs above are the declaration wording the standard expects. They are reproduced rather than paraphrased. Do not sign them until sections 4 and 5 carry real figures — the declaration is a statement that they do.");

/* ------------------------------------------------------------------ */
h1("9. Where each number comes from");

p("Not part of the published plan. Kept with it so that the next annual revision takes an evening rather than a week, and so that any figure can be traced back to a document if an authority asks.");

table([2200, 2600, 3500],
  ["Figure", "The record", "The calculation"],
  [
    ["Scope 1", "Fuel receipts for any vehicle owned or leased by the company; any gas bill for premises under the company's control.",
     "Litres of fuel by type × the conversion factor for that fuel and year. Where a vehicle is personal and reimbursed by mileage, it belongs in Scope 3 Cat 6, not here."],
    ["Scope 2", "Electricity bills for any premises under the company's control.",
     "kWh × the grid factor for the year, location-based. If a renewable tariff is held, the market-based figure may also be stated — both, labelled, never one presented as the other."],
    ["Cat 4", "Delivery notes and invoices for goods bought in.",
     "Where the carrier's data is not available, estimate by distance and mode and declare the estimate."],
    ["Cat 5", "Waste transfer notes; WEEE disposal records.",
     "Tonnes by waste stream and treatment route × the factor for that route."],
    ["Cat 6", "Mileage log, rail tickets, hotel nights, any flights.",
     "Miles by vehicle type, rail miles, and nights × the relevant factors. This is expected to be the largest line, so it is the one worth logging properly rather than reconstructing."],
    ["Cat 7", "The director's commuting pattern.",
     "Days travelled × distance × mode. Where the director works from home, state the homeworking treatment used and keep it the same each year."],
    ["Cat 9", "Sales records.",
     "Services only, no physical goods distributed. Report nil and say why."],
  ]);

fillIn("Collect these before setting a publication date. With the paperwork to hand the calculation is an evening; without it, the plan waits and so does every bid that depends on it.");

approval();
d.build().then(() => {
  console.log("\nTHIS PLAN CANNOT BE PUBLISHED YET");
  console.log("  Sections 4 and 5 carry no figures, and the declaration at section 8 is a");
  console.log("  statement that they do. Signing it as it stands would be a false declaration.");
  console.log("\nTO PUBLISH");
  console.log("  1. Collect the six records at section 9 — fuel, electricity, mileage,");
  console.log("     deliveries, waste, commuting.");
  console.log("  2. Fill the baseline table at 4.1. In year one the table at section 5 repeats it.");
  console.log("  3. Set ONE numeric interim target with a date at section 6.");
  console.log("  4. Mark each measure at 7.1 done or dated.");
  console.log("  5. Sign section 8, publish on the UK website, and diarise the annual review.");
  console.log("\n  Until then the honest answer to a Carbon Reduction Plan question is 'No,");
  console.log("  and here is the date it will be published'.");
}).catch((err) => { console.error(err); process.exit(1); });
