/**
 * ETABLIX — Environmental Policy. Word and PDF.
 *
 *   node business/policies/build-environmental.cjs
 *
 * The company does not hold ISO 14001 and does not claim it. The document
 * says so in section 1 rather than leaving a reader to infer it from a
 * careful silence.
 *
 * Section 5 is the part that is ours. This company's own footprint is an
 * office and some travel; its influence is in what it prices, procures and
 * specifies for others, and the largest environmental saving available on
 * any project is the material that is never ordered.
 */
const B = require("./brand.cjs");

const REV = "1";
const d = B.doc({
  slug: "Environmental-Policy",
  running: "Environmental Policy",
  kicker: "ENVIRONMENTAL",
  title: "POLICY",
  sub: "and arrangements",
  rev: REV,
  control: [
    ["Document", "Environmental Policy and Arrangements"],
    ["Revision", REV],
    ["Date of issue", "[date]"],
    ["Next review", "[date of issue + 12 months]"],
    ["Owner", "[name], Managing Director"],
    ["Approved by", "[name], Managing Director"],
    ["Applies to", "Every person working for or on behalf of ETABLIX, and every specification it issues"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* 1 */
h1("1. Statement");
p("JNN GLOBAL LTD, trading as ETABLIX, provides construction management, commercial and site-services consultancy. Its own direct environmental impact is small — an office, business travel, and the energy and equipment behind them. Its capacity to influence environmental outcomes is not small, because the decisions it advises on determine what is procured, how much is wasted, and how a site is run.");
p("This policy therefore covers both: what the company does, and what the company specifies. The second is worth far more than the first, and a policy that only counts its own printer paper has measured the part that does not matter.");
p("The company will comply with the environmental legislation applicable to its activities, and with the environmental requirements of each client and each site it works on, as a minimum rather than as a target.");
rich([
  { t: "This company does not hold ISO 14001 certification and does not claim it. ", b: true },
  { t: "The arrangements below are its own and are stated as such. An ISO 14001 roadmap sits in the company's compliance plan; until a certificate is issued by a UKAS-accredited body, nothing this company issues will suggest one exists." },
]);

/* 2 */
h1("2. The legal framework this policy works to");
table([3300, 5000],
  ["Instrument", "What it requires"],
  [
    ["Environmental Protection Act 1990, s.33", "No deposit, treatment or disposal of controlled waste except under a permit."],
    ["Environmental Protection Act 1990, s.34", "The duty of care for waste: transfer only to an authorised person, describe it accurately, and keep the transfer note."],
    ["Waste (England and Wales) Regulations 2011", "Apply the waste hierarchy in order — prevent, prepare for re-use, recycle, recover, and only then dispose — and declare that it has been applied."],
    ["Hazardous Waste (England and Wales) Regulations 2005", "Separation, consignment notes and the consignee return."],
    ["Environmental Permitting (E&W) Regulations 2016", "Permits and exemptions for discharges, abstraction and waste operations."],
    ["Control of Pollution (Oil Storage) (England) Regulations 2001", "Containment and bunding of stored oils."],
    ["Water Resources Act 1991, s.85", "It is an offence to cause or knowingly permit polluting matter to enter controlled waters — including silt."],
    ["Control of Pollution Act 1974, ss.60–61", "Local authority control of construction noise, and the prior consent route that protects a programme."],
    ["Wildlife and Countryside Act 1981; Habitats Regulations 2017", "Protected species and habitats, and the survey and licensing that must precede work affecting them."],
    ["Environment Act 2021", "Biodiversity net gain where it applies to the scheme, and the wider statutory environmental targets."],
    ["Climate Change Act 2008", "The statutory net zero target that increasingly reaches procurement through client requirements."],
  ]);
p("Where a client's requirements exceed these, the client's requirements govern. Where a contract requires a site waste management plan, one is produced — the statutory requirement was repealed in England in 2013, but the contractual requirement is common and the discipline is worth keeping regardless.");

/* 3 */
h1("3. Our own operations");
richBullet([{ t: "Travel. ", b: true }, { t: "Site attendance requires travel and this is the company's largest direct impact. Visits are planned so one journey serves as many purposes as possible. Remote attendance is used where it genuinely serves the purpose and refused where it does not — a clerk of works inspection is not conducted over a video call, and pretending otherwise trades a real duty for a small saving." }]);
richBullet([{ t: "Energy and the office. ", b: true }, { t: "[State the arrangement: home office or serviced office; whether the electricity supply is on a renewable tariff; heating controls. State what is true, not what sounds good.]" }]);
richBullet([{ t: "Paper and print. ", b: true }, { t: "Documents are issued electronically. Printing is by exception and double-sided." }]);
richBullet([{ t: "Equipment. ", b: true }, { t: "Devices are kept for their working life rather than replaced on a cycle, repaired where repair is viable, and disposed of through a licensed waste electrical and electronic equipment route with evidence retained." }]);
richBullet([{ t: "Procurement for our own use. ", b: true }, { t: "Suppliers are asked about their environmental arrangements as part of selection, and the answer is recorded." }]);
fillIn("[Fill the energy bracket before issue. A policy with an unfilled bracket in the section about our own operations is the one an assessor notices first.]");

pageBreak();

/* 4 */
h1("4. Measurement, stated honestly");
p("The company does not currently measure its carbon footprint, and this document does not report one. A figure produced for a policy rather than from data is worse than no figure, because it invites a question the company cannot answer.");
p("What will be measured, and from when:");
table([3000, 5300],
  ["Measure", "Position"],
  [
    ["Business mileage", "Recorded from [date] to establish a baseline. This is the company's largest impact and the only one worth measuring first."],
    ["Scope 1 and 2 emissions", "Negligible today — no company vehicles, no operational premises beyond [the office arrangement]. Reported once either exists."],
    ["Scope 3", "Not measured. For a consultancy of this size the meaningful scope 3 is business travel, which the mileage baseline captures."],
    ["Waste diverted from landfill on projects we manage", "Measured per project from the transfer notes, and reported to the client rather than asserted."],
  ]);
note("Carbon reporting is increasingly a condition of public work, and the requirement that usually applies is a carbon reduction plan rather than a full inventory. Where a specific procurement requires one, it will be produced to that requirement and to its stated standard — not assembled retrospectively to fit a bid.");

/* 5 */
h1("5. What we specify for others");
p("This is where the influence actually is, and this company expects to be held to it.");

h2("Waste, before it exists");
p("The largest environmental saving available on any project is the material that is never ordered. Where the company prices, procures or manages site works it challenges quantity allowances, over-ordering and specification that forces waste — and records the challenge whether or not it is accepted. A challenge that was made and refused is a different record from one that was never made, and only one of them is the consultant's failure.");

h2("Site waste management");
bullet("Segregation at source specified rather than hoped for, with the space and the containers designed into the compound layout — segregation that was not planned for does not happen.");
bullet("Licensed carriers verified rather than assumed, waste described accurately, and transfer notes checked to exist rather than presumed to.");
bullet("Diversion from landfill measured from the notes and reported, never asserted.");
bullet("Hazardous waste separated, consigned and the consignee return retained.");

h2("Welfare and accommodation");
p("Where this company specifies or manages welfare facilities or worker accommodation, it specifies water and energy efficiency, metering and controls. Occupied facilities consume for the whole duration of a project, which on a multi-year scheme makes them a larger environmental line than most people expect and one that is almost never metered.");
richBullet([{ t: "Metering is the point. ", b: true }, { t: "Accommodation without sub-metering cannot be managed, cannot be improved and cannot be reported on. It is the cheapest specification decision in this section and the one most often omitted." }]);

h2("Pollution prevention");
p("Where the company inspects, it reports as findings: fuel storage without containment, silt-laden discharge, uncontrolled dust, and unmanaged concrete washout. Silt entering a watercourse is an offence under section 85 of the Water Resources Act 1991, and it is the environmental breach most often treated on site as untidiness rather than as an offence.");

h2("Ecology and consents, in the programme");
p("Protected species surveys, licences and section 61 noise consents have seasonal windows and statutory lead times. Where the company interrogates a programme it tests those backwards from the dates the work needs them, because an ecology constraint discovered in month three is usually a season lost rather than a week.");

h2("Reporting what was found");
p("An environmental finding is reported to the client as it stands. The company does not soften a finding because the client would rather not have it, and does not omit one because it is inconvenient to the programme.");

/* 6 */
h1("6. Responsibility, objectives and review");
p("The Managing Director owns this policy and is accountable for it. On the appointment of an HSEQ and Assurance Manager, responsibility transfers to that post and this policy is reissued.");
p("Objectives for the current period:");
table([700, 3800, 2400, 1400],
  ["#", "Objective", "Measure", "By"],
  [
    ["1", "[e.g. record business mileage and establish a baseline]", "[the baseline figure exists]", "[date]"],
    ["2", "[e.g. environmental requirements included in every appointment]", "[100% of appointments]", "[date]"],
    ["3", "[e.g. ISO 14001 gap analysis completed]", "[report issued]", "[date]"],
  ]);
fillIn("[Set objectives that will actually be measured. An objective with no measure and no date is a sentence, and an assessor reads it as one. Three real ones beat ten aspirations, and progress against them is recorded at each review.]");
p("This policy is reviewed annually, and whenever the work or the law changes materially. Progress against the objectives is recorded at each review, including where an objective was missed and why.");

/* 7 */
h1("7. What is not yet in place");
bullet("No ISO 14001 certification, and none claimed. See section 1.");
bullet("No carbon footprint measurement or carbon reduction plan. See section 4, which states what is measured and from when.");
bullet("No environmental incidents or waste data, because there have been no projects under the company to generate them.");
bullet("No environmental management system beyond this document and the arrangements in it.");
note("Each is the correct answer for a company of this size today, and each carries what changes it. A reader who sees this section stated will trust section 5, which is the part of this policy that is actually worth something.");

approval();
d.build().catch((err) => { console.error(err); process.exit(1); });
