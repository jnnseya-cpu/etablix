/**
 * DPS pipeline — the public-sector routes to market ETABLIX can join.
 *
 * A Dynamic Purchasing System is not a framework: it stays open for its
 * whole life and admits new suppliers throughout. That changes the
 * question from "can we make the deadline" to "can we pass the
 * selection stage yet" — so this register tracks each route alongside
 * the readiness it demands, and computes what is still missing rather
 * than asking anyone to keep a spreadsheet honest.
 *
 * Readiness resolves against real company state: most requirements map
 * to an item in the Commercial OS set-up checklist, so ticking SSIP off
 * once updates every DPS row that needs it. The rest are evidence items
 * tracked here (contract references, filed accounts, ISO certificates).
 *
 * The requirement lists are ETABLIX's assessment of each buyer's
 * selection stage, read from the contract notice. They are a working
 * estimate, not the questionnaire itself: confirm against the real
 * selection document and correct the row.
 */

export const DPS_STAGES = [
  "watching",
  "preparing",
  "submitted",
  "accepted",
  "rejected",
  "excluded",
  "lapsed",
];

/**
 * What selection stages ask for.
 *   setup — resolved from the Commercial OS set-up checklist item id.
 *   evidence — tracked here; ticked when the artefact genuinely exists.
 */
export const DPS_REQUIREMENTS = {
  pi: { label: "Professional indemnity insurance", setup: "ins1" },
  pl: { label: "Public liability insurance", setup: "ins2" },
  el: { label: "Employers' liability insurance", setup: "ins3" },
  car: { label: "Contractors' all-risks insurance", setup: "ins4" },
  cdm: { label: "CDM 2015 competence file", setup: "hse1" },
  hspolicy: { label: "H&S policy and arrangements", setup: "hse2" },
  ssip: { label: "SSIP accreditation", setup: "hse3" },
  constructionline: { label: "Constructionline", setup: "hse4" },
  uvdb: { label: "Achilles UVDB", setup: "hse5" },
  cis: { label: "CIS registration", setup: "tax1" },
  vat: { label: "VAT registration", setup: "tax2" },
  accounts: { label: "Filed accounts / financial standing", evidence: true },
  refs2: { label: "Two comparable contract references", evidence: true },
  refs3: { label: "Three comparable contract references", evidence: true },
  cvs: { label: "Named key-personnel CVs", evidence: true },
  iso9001: { label: "ISO 9001", evidence: true },
  iso14001: { label: "ISO 14001", evidence: true },
  iso45001: { label: "ISO 45001", evidence: true },
  modernSlavery: { label: "Modern slavery statement", evidence: true, heldByDefault: true },
  equality: { label: "Equality and diversity policy", evidence: true },
  environmental: { label: "Environmental policy", evidence: true },
  nuclearVetting: { label: "Nuclear site security clearance route", evidence: true },
};

/** Evidence items only — the ones a person ticks rather than the checklist. */
export const DPS_EVIDENCE = Object.entries(DPS_REQUIREMENTS)
  .filter(([, r]) => r.evidence)
  .map(([id, r]) => ({ id, label: r.label, heldByDefault: Boolean(r.heldByDefault) }));

/**
 * The pipeline as assessed from Contracts Finder, September 2026.
 * Priority 1–4 are the applications worth making; the watch and
 * excluded rows record decisions already taken so they are not
 * re-evaluated from scratch each time they resurface in a search.
 */
export const DPS_SEED = [
  {
    name: "Operations, Site Work and Facilities Management DPS (NNLC484D)",
    buyer: "United Kingdom National Nuclear Laboratory",
    portal: "Confirm on the notice — UKNNL eSourcing",
    closingDate: "2029-01-08",
    lot: "8 lots — targeting Lot 1 Site Preparation and Lot 2 Building and Facility Construction and Maintenance Services (also: Industrial Production and Manufacturing; HVAC; Mechanical, Electrical, Control and Instrumentation; Hazardous Waste; Asbestos, Waste Removal, Surveys and Remediation; Access, Lifting and Maintenance)",
    reference: "20250117153958-124934",
    value: "Not stated in notice (£0 published)",
    location: "Any region",
    priority: 1,
    stage: "watching",
    fit: "The closest match on the market. Lot structure names Site Preparation and facility maintenance directly. Nuclear sites hold the highest welfare, security and accommodation standards — our scope, at a buyer that takes it seriously.",
    requires: ["el", "pl", "pi", "ssip", "hspolicy", "cdm", "accounts", "refs2", "iso9001", "iso45001", "nuclearVetting"],
    notes: "Open procedure, contract type Works, explicitly suitable for SMEs and VCSEs. Apply once insurance and SSIP are in place — nuclear selection stages are heavier than most, so expect security and quality-management questions beyond the standard SQ.",
  },
  {
    name: "Facilities Management & Workplace Services DPS",
    buyer: "Crown Commercial Service",
    portal: "CCS eSourcing — enquiries rm6264@crowncommercial.gov.uk (general: supplier@crowncommercial.gov.uk)",
    reference: "RM6264",
    closingDate: "2029-02-23",
    lot: "Four categories: Services, Building Type, Location, Annual Contract Value — selecting soft-services and workplace elements only, not building fabric",
    value: "£2,000,000,000 (uplifted)",
    location: "United Kingdom",
    priority: 2,
    stage: "watching",
    fit: "The notice states the DPS exists for lower-value, less complex contracts and to attract SME suppliers — written for a company at our stage. Genuine but partial fit: the operate-phase services overlap (cleaning, waste, security, welfare, help-desk, CAFM), the building fabric maintenance and response repairs do not.",
    requires: ["el", "pl", "pi", "ssip", "hspolicy", "accounts", "refs2", "equality", "modernSlavery"],
    notes: "Restricted procedure above threshold, SME and VCSE suitable. Full bid pack (Parts 1-4) is attached to the Contracts Finder notice — download and read before applying. Select only the service elements we can actually deliver: admission to elements we decline damages the record. Published dates on the notice are placeholders CCS manipulated for system compatibility; take real dates from the Find a Tender contract notice.",
  },
  {
    name: "Construction Professional Services DPS (RM6242)",
    buyer: "Crown Commercial Service",
    portal: "Cabinet Office Supplier Registration Service — enquiries supplier@crowncommercial.gov.uk, +44 345 410 2222",
    portalUrl: "https://supplierregistration.cabinetoffice.gov.uk/dashboard?login=1",
    reference: "RM6242",
    closingDate: "2029-02-23",
    lot: "Four categories: Technical & Professional Services, Industry Sector, Geographical Regions, Additional Capability — element selection per the published Filter Matrix (Attachment 1)",
    value: "£800,000,000 (raised from £150m)",
    location: "United Kingdom",
    priority: 3,
    stage: "preparing",
    fit: "The most winnable route on the market. Professional-services selection weighs named individual competence and CVs rather than built assets — which is exactly what Model 01 and Model 02 sell, and what the founder's record evidences.",
    requires: ["pi", "el", "pl", "cvs", "accounts", "equality", "modernSlavery"],
    notes: "Self-service: no introduction email, apply through the Supplier Registration Service. Read first: READ FIRST RM6242 DPS Needs v4.0; Attachment 6 is the DPSQ (the selection questionnaire) itself, so our requirement list here can be replaced with fact; Attachment 1 Filter Matrix sets the elements to select; Attachment 3 Financial Assessment Template is the likely pinch point for a young company — complete it early. Restricted procedure above threshold: any clarification goes through the portal message board, never direct email, so the answer is published to all applicants. Term extended to 23/02/2029.",
  },
  {
    name: "Development DPS — Category 1 Consultants",
    buyer: "Communities and Housing Investment Consortium (CHIC)",
    portal: "Confirm on the notice",
    closingDate: "2027-06-15",
    lot: "Category 1 — Consultants: Project Managers, Employers' Agents, CDM Co-ordinator, Clerk of Works",
    value: "£300,000,000",
    location: "B18 6DS — Birmingham",
    priority: 4,
    stage: "preparing",
    fit: "Consultancy category matching Model 01, at a Birmingham buyer. Local supplier status and local social value are a genuine advantage here rather than a tie-breaker.",
    requires: ["pi", "el", "pl", "cdm", "cvs", "accounts", "equality"],
    notes: "Submit now alongside RM6242. Emphasise Birmingham base and Groupe Nseya structure.",
  },
  {
    name: "Construction Management Services DPS",
    buyer: "Westworks Procurement Limited",
    portal: "in-Tend",
    closingDate: "2028-12-01",
    lot: "Contractor management services",
    value: "£1 – £100,000,000",
    location: "Any region",
    priority: 5,
    stage: "watching",
    fit: "Same professional-services logic as RM6242, smaller audience. Management rather than works scope.",
    requires: ["pi", "el", "pl", "cvs", "accounts"],
    notes: "Notice states submissions are received through the Westworks in-Tend system.",
  },
  {
    name: "Consultants DPS",
    buyer: "Places for People Group (Procurement Hub)",
    portal: "Confirm on the notice",
    closingDate: "2029-08-10",
    lot: "Consultancy services — range offered to the whole UK public sector",
    value: "Not stated in notice",
    location: "Any region",
    priority: 6,
    stage: "watching",
    fit: "Broad consultancy DPS open to the whole public sector. Low cost to join once the professional-services pack exists for RM6242.",
    requires: ["pi", "el", "pl", "cvs", "accounts"],
    notes: "Reuse the RM6242 submission pack.",
  },
  {
    name: "Civils Support DPS — South, South West, South East, Welsh and Scottish regions",
    buyer: "Nuclear Restoration Services / Magnox Limited",
    portal: "Confirm on the notice",
    closingDate: "2028-02-10",
    lot: "Civils support to facilitate nuclear decommissioning (five regional DPSs)",
    value: "£4.7m – £9.9m per region",
    location: "South, South West, South East, Wales, Scotland",
    priority: 7,
    stage: "watching",
    fit: "Reads closer than it is — civils support means civil works, not site services. Worth watching in case the scope is drawn more widely at call-off, not worth applying for now.",
    requires: ["el", "pl", "ssip", "hspolicy", "cdm", "refs3", "iso9001", "iso45001", "nuclearVetting"],
    notes: "Earliest regional closing date recorded here (Magnox South East, 10 Feb 2028); the other four run to 2028. Revisit if a call-off scope shows site establishment or welfare.",
  },
  {
    name: "Social Enterprise DPS (SEDPS)",
    buyer: "National Highways",
    portal: "n/a",
    closingDate: "2028-08-14",
    lot: "Goods and services to National Highways and its supply chain",
    value: "£65,000,000",
    location: "England-wide",
    priority: 90,
    stage: "excluded",
    fit: "Not eligible. Restricted to organisations with primarily social objectives whose surpluses are principally reinvested. JNN GLOBAL LTD is an ordinary commercial company.",
    requires: [],
    notes: "Recorded so it is not re-evaluated when it resurfaces in a search. Eligibility would only change with a different legal structure.",
  },
  {
    name: "DPS for Supply or Supply and Installation of Modular and Portable Buildings",
    buyer: "EN:PROCURE LIMITED",
    portal: "n/a",
    closingDate: "2030-10-16",
    lot: "Off-site manufacture and construction of housing",
    value: "Not stated in notice",
    location: "Yorkshire and the Humber",
    priority: 91,
    stage: "excluded",
    fit: "The title reads like a perfect match and the notice body is not: appointed contractors are required to design and manufacture houses. That is permanent modular housing, not site accommodation.",
    requires: [],
    notes: "Recorded as a deliberate exclusion — the title will keep matching our CPV codes.",
  },
];

/**
 * Resolve one row's readiness against real company state.
 * Returns the requirement labels met and still missing, so the register
 * shows the gap rather than an opinion about it.
 */
export function readiness(row, setupState = {}, evidenceState = {}) {
  const met = [];
  const missing = [];
  for (const key of row.requires || []) {
    const req = DPS_REQUIREMENTS[key];
    if (!req) continue;
    const held = req.setup
      ? Boolean(setupState[req.setup]?.done)
      : Boolean(evidenceState[key]?.held ?? req.heldByDefault);
    (held ? met : missing).push({ key, label: req.label });
  }
  return {
    met,
    missing,
    ready: missing.length === 0,
    readyCount: met.length,
    totalCount: met.length + missing.length,
  };
}
