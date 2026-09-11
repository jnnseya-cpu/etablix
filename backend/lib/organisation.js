/**
 * ETABLIX organisation — the operating structure as data.
 *
 * ETABLIX launches as a lean management integrator: a small permanent
 * leadership core, fractional professional assurance, a project-funded
 * management team, a subcontracted physical workforce, AI-driven
 * administrative production, and human-controlled decisions and
 * approvals. The mature directorate structure is kept as the growth
 * map, not the payroll.
 *
 * Every position carries a suggested Control Desk access role so that
 * creating a team member against a position sets the right permissions
 * by default.
 */

import { ROLES } from "../../shared/constants.js";

export const PRINCIPLE =
  "ETABLIX retains direct control of client management, integration, commercial decisions, HSEQ, quality and service assurance. Labour-intensive delivery can be subcontracted, but accountability must never be subcontracted. AI agents make the lean structure possible, but the client must always see named humans who own commercial, technical, safety and site-delivery decisions.";

/** The launch organisation — four core people plus fractional support. */
export const LEAN_CORE = [
  {
    id: "md",
    title: "Managing Director & Business Development Lead",
    holder: "Justin Nseya",
    employment: "Founder — full-time",
    accessRole: ROLES.ADMIN,
    purpose: "Sales, leadership, approvals and client ownership. One person, not four director salaries, until contracts fund them.",
    responsibilities: [
      "Select sectors and target clients; build relationships with project directors, construction directors and procurement leaders",
      "Qualify opportunities before ETABLIX spends money bidding; choose the delivery model",
      "Lead major presentations and negotiations; approve pricing, margin and contractual exposure",
      "Chair project governance; maintain senior client relationships",
      "Decide which liabilities ETABLIX will and will not accept",
      "Secure funding, insurance, working-capital facilities and strategic partners",
    ],
    aiSupported: [
      "Research upcoming projects and likely mobilisation dates; identify decision-makers",
      "Prepare company-specific outreach and draft follow-up emails",
      "Maintain and score the opportunity pipeline; prepare meeting briefs",
      "Produce first-draft proposals and presentations; extract actions from meetings",
      "Monitor outstanding client decisions; generate weekly pipeline reports",
    ],
    humanRetained: [
      "Relationship-building, commercial judgment and negotiation",
      "Final bid / no-bid decisions and contractual acceptance",
      "Ethical and reputational decisions; promises made to clients",
      "Final authority over major expenditure",
    ],
  },
  {
    id: "delivery_lead",
    title: "Delivery & Technical Lead",
    employment: "Retained consultant / part-time until workload stabilises; project-funded hours on award",
    accessRole: ROLES.OPERATIONS_DIRECTOR,
    purpose: "Creates and integrates the physical solution. Ensures individual packages form one functioning site system — specialists design; this role integrates.",
    responsibilities: [
      "Review client project information; develop the site-services strategy",
      "Determine workforce, occupancy, compound, welfare and accommodation requirements",
      "Coordinate temporary civils, utilities and MEP; produce package boundaries",
      "Maintain the design and operational interface matrix",
      "Create mobilisation and demobilisation strategies; prepare the project execution plan",
      "Review supplier technical proposals; challenge capacity, redundancy and resilience assumptions",
      "Verify the proposed solution can be built, operated, maintained and removed",
    ],
    aiSupported: [
      "Extract requirements from employer's requirements, specifications and drawings",
      "Build accommodation and welfare demand schedules; calculate cabin, toilet, shower, dining and parking requirements",
      "Generate package-scope and interface-register drafts; flag omissions between scopes",
      "Review supplier submissions against requirements; create mobilisation checklists",
      "Track design submissions; identify conflicting dimensions, dates or responsibilities",
      "Generate inspection and commissioning plans; prepare technical clarification questions",
    ],
    humanRetained: [
      "Site-specific engineering judgment and acceptance of technical solutions",
      "Constructability and safety-critical decisions; design responsibility allocation",
      "Supplier technical interviews and approval of deviations",
      "Confirmation that the complete site system is operationally viable",
    ],
  },
  {
    id: "commercial_lead",
    title: "Commercial & Supply Chain Lead",
    employment: "Retained consultant / part-time until workload stabilises",
    accessRole: ROLES.COMMERCIAL_MANAGER,
    purpose: "Pricing, procurement, cost and contract protection — one experienced person combining QS, procurement and contract administration until volume justifies separation.",
    responsibilities: [
      "Build ETABLIX's pricing structure; prepare client pricing schedules",
      "Obtain and normalise supplier quotations; identify exclusions, assumptions and gaps",
      "Maintain the project cost plan; track commitments, expenditure and forecast cost",
      "Manage client applications and supplier valuations; control variations",
      "Monitor cash flow and payment dates; maintain supplier commercial performance",
      "Protect ETABLIX's overhead, contingency and margin; align supplier obligations with client obligations",
    ],
    aiSupported: [
      "Extract commercial obligations from contracts; compare and normalise supplier quotations",
      "Produce tender comparison tables; draft purchase orders and subcontract scope schedules",
      "Match invoices to orders, delivery evidence and approved valuations; detect duplicates",
      "Forecast cash requirements; draft payment notices and variation notifications; monitor notice deadlines",
      "Produce cost reports and CVR drafts; compare forecast margin against tender margin",
      "Flag uncontrolled commitments; produce supplier performance reports",
    ],
    humanRetained: [
      "Final quotation evaluation, negotiation and valuation judgment",
      "Approval of payments — AI may prepare a payment recommendation; it never releases money",
      "Contract interpretation where liability is material; settlement of variations and claims",
      "Supplier selection recommendations; confirmation that pricing is commercially sustainable",
    ],
  },
  {
    id: "coordinator",
    title: "Project Coordinator & AI Operations Controller",
    employment: "Permanent or initially part-time",
    accessRole: ROLES.PROJECT_MANAGER,
    purpose: "Operates ETABLIX's AI-assisted management system and ensures outputs are accurate, approved and issued. A project-information and automation-control role — not a personal assistant.",
    responsibilities: [
      "Control the central document register; maintain project records and correspondence",
      "Coordinate bids and supplier returns; maintain actions, decisions and interface registers",
      "Prepare meeting packs; assemble weekly and monthly reports",
      "Check AI-generated outputs; route documents for human approval; maintain revisions",
      "Monitor expiring supplier documents; administer the CRM and project-control system",
      "Ensure no AI-generated document is issued without the correct approval",
    ],
    aiSupported: [
      "File classification, metadata extraction, naming and revision checks",
      "Meeting transcription, minutes and action logs; daily report compilation",
      "Reminder generation and report drafting; supplier-document expiry tracking",
      "Correspondence drafting, dashboard updates, evidence-pack compilation, handover-index preparation",
    ],
    humanRetained: ["Verification of accuracy, permissions, confidentiality and issue status on everything AI produces"],
  },
];

export const FRACTIONAL = [
  { title: "HSEQ Adviser", arrangement: "Retained consultant; site HSEQ resource is contract-funded once a site mobilises", accessRole: ROLES.QA_INSPECTOR, note: "AI can check documentation; it cannot legally or operationally replace competent HSEQ supervision. Stop-work authority stays human." },
  { title: "Accountant / fractional Finance Controller", arrangement: "Outsourced; part-time controller when transaction volume increases", accessRole: ROLES.COMMERCIAL_MANAGER, note: "AI automates invoice capture, categorisation and cash-flow forecasts. A human approves payments and filings." },
  { title: "Construction solicitor / contract consultant", arrangement: "On demand — high-risk contracts, frameworks, warranties, PCGs, bonds, PI exposure, disputes", accessRole: null, note: "AI identifies clauses and compares changes; it is never the final authority on significant legal exposure." },
  { title: "Insurance broker", arrangement: "Retained — cover changes with the delivery model (Advisory → Integrator → Prime)", accessRole: null, note: "" },
  { title: "Specialist engineering designers", arrangement: "Purchased when required: temporary works, civils/drainage, electrical, mechanical/public health, fire, security, environmental, transport", accessRole: null, note: "ETABLIX controls the design interfaces; it does not employ every discipline." },
];

export const CONTRACT_FUNDED = [
  { title: "Project Manager", trigger: "Live Management Integrator or Prime Service Contractor project", accessRole: ROLES.PROJECT_MANAGER, summary: "Contract delivery, client coordination, programme, risk and change, supplier coordination, reporting, mobilisation and demobilisation. On a small Advisory assignment the Delivery & Technical Lead covers this." },
  { title: "Site Integration Manager", trigger: "Every active site — ETABLIX's most important site appointment", accessRole: ROLES.SITE_ENGINEER, summary: "The single operational owner connecting buildings, civils, power, water, sewage, welfare, accommodation, cleaning, security, access, transport, logistics, waste and maintenance. Ensures the services operate together, failures are assigned correctly and the client has one accountable ETABLIX contact." },
  { title: "Site Commercial Manager / Project QS", trigger: "Multiple supplier packages, significant valuations, frequent change, ETABLIX-held supplier contracts or material cash exposure", accessRole: ROLES.COMMERCIAL_MANAGER, summary: "Costs, revenue, variations, forecasting, supplier payments and project margin. Smaller projects: covered centrally with periodic visits." },
  { title: "Site HSEQ Adviser", trigger: "Per client requirements, construction risk, workforce size, shift pattern and accommodation exposure", accessRole: ROLES.QA_INSPECTOR, summary: "Site HSEQ planning, inductions, inspections, permits, incidents, environmental controls and contractor compliance." },
  { title: "Facilities / Village Manager", trigger: "Only when ETABLIX operates a compound or workforce village", accessRole: ROLES.SITE_ENGINEER, summary: "Occupancy, cleaning, defects, maintenance, complaints, utilities, housekeeping, waste, resident welfare and emergency escalation." },
  { title: "Package Managers", trigger: "Only packages that justify dedicated control (civils, MEP, logistics, accommodation on larger projects)", accessRole: ROLES.SITE_ENGINEER, summary: "On a small project one Site Integration Manager coordinates several specialist suppliers." },
];

/**
 * The AI-agent workforce — seven agents, each inside an approval
 * boundary. "backing" says what actually powers the agent today:
 *   engine  — the ETABLIX delivery-automation engine (live now)
 *   veryx   — runs on the connected VERYX platform agent console
 *   construx— activates when the CONSTRUX token is connected
 *   llm     — document-intelligence work; runs through the platform
 *             AI services as engagements adopt them
 */
export const AI_AGENTS = [
  {
    id: "opportunity",
    name: "Agent 1 — Opportunity Intelligence",
    inputs: ["Target sectors and regions", "Project types and client lists", "Minimum project size", "Expected mobilisation dates"],
    outputs: ["Qualified opportunity list", "Project intelligence brief", "Client organisation map and likely decision-makers", "Recommended approach and follow-up dates", "Bid / no-bid recommendation"],
    boundary: "Cannot contact anyone automatically — every campaign and recipient list is approved by the Managing Director first.",
    backing: ["llm"],
    desk: "Feeds the GTM account tracker and the bid screen in the Commercial OS.",
  },
  {
    id: "bid",
    name: "Agent 2 — Bid & Requirements",
    inputs: [
      "The invitation itself — ITT, PQQ, framework further competition or employer's requirements, uploaded in full",
      "The submission deadline, the return route and the client's own forms and templates",
      "What we can actually evidence: accreditations held and in progress, insurance limits, comparable references, key people",
      "What we will not accept — liability, indemnity, payment terms, scope we do not deliver — and any clarification already answered",
    ],
    outputs: [
      "Requirements register — one row per requirement with a VERBATIM quote of its source line and the section it came from",
      "Compliance matrix — comply, comply with comment, partial or gap, with the evidence named",
      "Submission checklist and timetable worked backwards from the deadline, every deliverable referenced SUB-n",
      "The drafted responses, one per required deliverable, against the criterion and the limit each is scored under",
      "Clarification schedule, bid position and risk with a bid / no-bid recommendation, responsibility matrix and bid programme",
      "Submission register and completeness certificate — the machine check printed in the bid file",
    ],
    boundary: "Drafts only. It does not submit, does not price and does not decide whether to bid — it recommends, with the facts the recommendation rests on. It claims no accreditation, certification or project reference that is not evidenced in the inputs: anything an answer needs and does not have is marked EVIDENCE REQUIRED and carried as an open item. Where an invitation would place a CDM 2015 duty holder role on ETABLIX it names the role rather than accepting it.",
    backing: ["llm"],
    desk: "A seven-pass pipeline with the submission-completeness check built in. The checklist of what must be returned is written BEFORE the responses, so the answers are written against it — and the system then reconciles the two by reference on every run. A required deliverable with no drafted response, or a deadline that is not a date, stops the bid file being approved: on most public and framework procurements a missing deliverable is not a lost mark, it is a rejected tender. An approved run becomes a numbered BID bid file, each part printing on its own.",
  },
  {
    id: "design",
    name: "Agent 3 — Site-System Design Coordinator",
    inputs: [
      "The packages in the site-services system, with their codes and what each delivers",
      "THE PREVIOUS INTERFACE REGISTER in full — every reference in it is carried forward or logged as closed, and none is renumbered",
      "Workforce curve and peak numbers, site constraints and the drawings by number and revision, programme and required-on-site dates per package",
      "What establishes ownership — contracts, instructions, meeting notes, said apart — and any interface two parties disagree about",
    ],
    outputs: [
      "Package boundary matrix, every scope boundary stated as a physical point",
      "The interface register: every interface, the two packages, the witnessable point, ONE named owner, its state and its date",
      "The movement log — opened, carried forward, closed, owner changed, date changed, point changed — which is what makes it a living register",
      "Interfaces at risk, ordered by the date the consequence bites, with the ones that have no float named first",
      "The demand and utilities model behind the interfaces, with the factors stated, and which boundaries move if demand changes",
      "Handover sequence, the change that created or moved an interface, and the certificate with the ownership decisions required",
    ],
    boundary: "It RECORDS ownership as the project has agreed it and does not assign it — an owner written in by this agent and accepted by nobody is not an owner, and a row that looks settled is more dangerous than one that looks open. Decision support only: every load, ratio, diversity factor and duration is a first-pass planning figure for validation by a competent person, and anything touching life safety is flagged for a competent person and, where relevant, the fire and rescue authority. It appoints nobody, instructs no change, accepts no work and closes no interface.",
    backing: ["llm"],
    desk: "The register behind Model 02's central promise, reissued every month for the life of the appointment. It is the only document in the system that is carried forward, which gives it a failure the one-off matrices do not have: a row can quietly disappear, and an interface open last month and absent this month has either been closed or been lost with nothing on the page telling them apart. So the register is written in one pass and its movement log in the next, and the system reconciles the two — a carried-forward interface missing from the register, or an interface with no single named owner, stops the register being issued. \"Both\", \"shared\" and \"the team\" are refused by a function rather than by a house style. An approved run becomes a numbered IFR register.",
  },
  {
    id: "commercial",
    name: "Agent 4 — Commercial & Procurement",
    inputs: ["Scope packages and supplier bids", "Rate cards and client pricing", "Contract conditions and project budget"],
    outputs: ["Bid normalisation and exclusions comparison", "Commercial risk schedule and procurement recommendation draft", "Cost plan, commitment register and cash-flow forecast", "Margin forecast and potential variation alerts"],
    boundary: "No supplier appointment or payment is ever made without human approval.",
    backing: ["engine", "llm"],
    desk: "The EVM gate, exposure rule and valuation cycle in the Commercial OS enforce its guardrails automatically.",
  },
  {
    id: "controls",
    name: "Agent 5 — Project Controls",
    inputs: [
      "The baseline programme and the budget at award, by package or control account",
      "Progress this period — daily reports, delivery records, inspection records, supplier updates, with what is measured separated from what is somebody's word",
      "Applications for payment received, each with the DATE it was received, and last month's report so the control account numbers do not change",
      "Change instructed, notified and claimed; the commercial terms that govern the money; and the reserve, receivables and committed orders for the exposure test",
    ],
    outputs: [
      "The position at period end, and whether the completion date still holds",
      "Earned value by control account with SPI and CPI, every figure carrying the class of evidence it rests on",
      "Change control register, and what the unvalued change will cost to leave another month",
      "The valuation: gross and net assessed sums, every deduction named and reasoned in the words that go in the payment notice",
      "Payment recommendations by supplier, each measured against a control account and each carrying its due date, final date and pay-less deadline",
      "Cost forecast and outturn, the cash and exposure position against the reserve, and the decisions required with their dates",
    ],
    boundary: "Decision support and a recommendation, not a certificate. Under Model 02 the client contracts and pays every supplier directly — ETABLIX never holds supply-chain money — so it recommends and the client pays, by a named person with delegated authority. It values what the evidence supports rather than what was claimed, and says on the row which. It does not instruct change, settle a claim, agree an extension of time or overwrite the baseline.",
    backing: ["llm"],
    desk: "The monthly deliverable a Management Integrator fee buys, produced on the twenty-fifth for the life of the appointment — fourteen times on a sixty-week job. Value earned is written BEFORE the payment recommendations, and the system then reconciles the two: a payment against a control account nobody measured, or a payment exceeding the value earned on it, stops the report being issued. Every application's due date, payment-notice deadline, final date and pay-less deadline are computed rather than described, because a missed notice makes the sum applied for payable in full. An approved run becomes a numbered MCR report.",
  },
  {
    id: "siteops",
    name: "Agent 6 — Site Operations",
    inputs: ["Fault reports and helpdesk tickets", "Inspection results and utility data", "Cleaning, security, occupancy and maintenance records"],
    outputs: ["Priority-ranked work orders and SLA countdowns", "Repeat-failure detection and responsible supplier assignment", "Escalation notices and planned-maintenance reminders", "Daily operational dashboard"],
    boundary: "The Site Integration Manager controls emergency prioritisation and physical response.",
    backing: ["engine", "construx"],
    desk: "The automation engine's sweeps, platform watch and daily digest run this desk today.",
  },
  {
    id: "assurance",
    name: "Agent 7 — Assurance & Evidence",
    inputs: ["Inspection records, certificates and photographs", "Commissioning results and supplier documents", "Training records and asset information"],
    outputs: ["Evidence completeness report and nonconformance alerts", "Certificate expiry warnings", "Handover index and missing-document requests", "Acceptance-readiness status"],
    boundary: "Cannot close defects or approve work — authorised human acceptance only.",
    backing: ["engine", "llm"],
    desk: "Supplier document-expiry sweeps and the communications engine carry its alerts.",
  },
  {
    id: "diagnostic",
    name: "Agent 8 — Site Systems Diagnostic",
    inputs: ["Project programme, workforce forecast and proposed site layout", "Existing logistics plan and stated temporary-services requirements", "Current procurement packages, known mobilisation constraints and available site and utility information"],
    outputs: ["Site-service package map, scope-gap assessment and supplier-interface matrix", "Workforce, utility, welfare and accommodation demand — calculated, with assumptions stated", "The consent chain worked backwards from the access date", "Procurement strategy, preliminary risk register and indicative cost structure", "Recommended delivery model and the 30/60/90-day action list"],
    boundary: "Decision support only. Every load, ratio and duration is a first-pass planning figure for validation by a competent person; anything safety-critical is flagged rather than resolved.",
    backing: ["llm"],
    desk: "The paid entry engagement: eight client inputs in, twelve deliverables out, ten working days. This agent drafts them; a director validates and issues.",
  },
  {
    id: "site-requirements",
    name: "Agent 9 — Site Management Requirements Package",
    inputs: ["The scope package by package, the programme and required-on-site dates, the site layout", "The client's own standards and specifications, planning consents and conditions", "Utility positions and capacities, workforce and shift pattern, HSE and CDM arrangements, intended route to market"],
    outputs: ["Package structure with every scope boundary stated as a witnessed physical point", "Employer's Requirements package by package — every obligation verifiable and traced to its source", "Interface and responsibility matrix, technical, welfare and service-level requirements", "Statutory and CDM duties with the role holder named, programme requirements worked backwards", "Commercial requirements, evaluation model, contract strategy and the tender issue plan"],
    boundary: "A drafting service and decision support, not a design, a price or legal advice. Nothing in it appoints ETABLIX as CDM Principal Contractor. Requirements marked [PROPOSED] need the client's approval before issue.",
    backing: ["llm"],
    desk: "The document set that goes to market. Where the diagnostic reports what does not hold, this writes the instruments a tenderer prices and a contract enforces — so every requirement is objectively verifiable and traced to the document, duty or condition that mandates it.",
  },
  {
    id: "mobilisation-review",
    name: "Agent 10 — Mobilisation-readiness review",
    inputs: ["What was seen on the review visit, and what could not be reached", "The current programme and the mobilisation date being tested; the status of every service and package today", "Consents and connections, the layout as it will be at mobilisation, supplier appointments and lead times, the client's own risk register"],
    outputs: ["Readiness by service, rated READY / AT RISK / NOT READY with the evidence class of each", "What will stop mobilisation, ranked by the date it bites rather than by how large it feels", "The consent and connection position worked backwards from the date", "Recovery actions ordered by the date each must START", "A verdict on the date: deliverable, deliverable with named actions, or not deliverable with the earliest date that is"],
    boundary: "Decision support only. Every readiness statement carries its evidence class — observed, evidenced, asserted or unknown — and a verdict resting substantially on assertion says so. Anything safety-critical is flagged rather than resolved.",
    backing: ["llm"],
    desk: "Eight deliverables, not twelve — narrower than the diagnostic and sold weeks before mobilising. It is the only engagement with a site visit, which is why its central distinction is between what was observed, what a document evidences, and what somebody merely asserted.",
  },
  {
    id: "village-requirements",
    name: "Agent 11 — Workforce Village Requirements Package",
    inputs: ["Bed demand over the whole programme, the village site, and the planning position", "Utility positions, the intended accommodation standard and how the village is to be operated", "Deployment duration and the exit, transport strategy, committed packages, and the fire strategy if one exists"],
    outputs: ["Bed demand and occupancy model, with the sensitivity to the travelling proportion shown", "Site capacity appraisal, accommodation standard and unit schedule", "Layout, utility, catering, amenity and operating requirements — each measurable", "Consents and licensing worked backwards from first occupancy", "Deployment, exit and procurement strategy for the village"],
    boundary: "NOT A FIRE STRATEGY. Fire, means of escape, compartmentation, alarm and detection, evacuation and fire-service access are life-safety matters for a competent fire engineer and the fire and rescue authority; this package states the requirement and refers them. A drafting service and decision support, not a design, a price or legal advice.",
    backing: ["llm"],
    desk: "The most specialist deliverable ETABLIX sells. Two things make it different: people sleep here, so life safety is referred rather than resolved; and a village is a consented development, so the consent route decides whether it is available at all — and clients ask for one long after the application had to be made.",
  },
  {
    id: "procurement",
    name: "Agent 12 — Managed Procurement Desk: tender evaluation",
    inputs: ["The package and its scope boundary, and the technical requirements the enquiry put to the market", "The tender returns — each tenderer's price, qualifications and exclusions", "The evaluation model as issued, the contract terms, the budget held in confidence, and the client's approval route"],
    outputs: ["The process record, written so the award can be defended if it is questioned", "Requirement-by-requirement compliance, with the treatment of each non-compliance applied consistently", "The commercial comparison NORMALISED — every adjustment shown as its own line with its source", "Every qualification found and valued: what accepting each return as written costs beyond its price", "Scores against the model as issued, and a recommendation with its conditions and its named alternative"],
    boundary: "A recommendation for a named human with delegated authority. ETABLIX does not award, does not place orders and does not commit the client to any supplier. No adjustment is ever invented: where one cannot be derived it is carried as an open item and the ranking is provisional.",
    backing: ["llm"],
    desk: "A recurring service, so it runs again every time returns land. Its value is normalisation rather than scoring: three tenderers price one enquiry on three different bases, and added up as returned the cheapest is whoever excluded most.",
  },
  {
    id: "tender-pack",
    name: "Agent 13 — Tender pack assembler",
    inputs: ["The APPROVED Site Management Requirements Package, in full", "The tender timetable the client has set, the tenderers, and the confirmed contract form", "How clarifications are handled and where returns go, the client's own forms and procurement rules, and which [PROPOSED] requirements have since been approved"],
    outputs: ["Instructions to tenderers and conditions of tendering, written as the documents a tenderer receives", "A scope sheet for every package — boundary, items, attendances, acceptance and exclusions", "The pricing schedule BLANK AND PRICEABLE: every line referenced to a scope item, with a unit and a quantity", "Technical and commercial return forms mapped to the criteria they are evidence for, and the form of tender", "The issue register and an issue certificate carrying the scope-to-price reconciliation"],
    boundary: "An assembly of an approved document, not a second opinion: nothing is added to the requirements package and no silence in it is filled — a gap is an open item. The CLIENT issues and the CLIENT awards; ETABLIX does not award, place orders or commit the client to any tenderer.",
    backing: ["llm", "engine"],
    desk: "The part of Advisory that makes \"ready to issue\" literally true. Its scope sheets and pricing schedule share one reference set, and the engine reconciles them by machine on every run: a scope item with no priced line, or a priced line with no scope item, stops the pack being issued — because that is the failure nobody sees until the returns are in and the cheapest tender is whoever guessed lowest.",
  },
  {
    id: "challenge",
    name: "Agent 14 — Adversarial Challenger",
    inputs: [
      "THE DOCUMENT UNDER REVIEW in full — another agent's finished output, exactly as it would be issued",
      "The invitation, brief, specification or contract it answers, and the evaluation methodology if it was published",
      "The price, the qualifications and the exclusions that go with it, and the evidence held with its expiry dates",
      "The authority position — who may sign, to what value, for what risk class — and the run that produced the document, so independence can be shown rather than claimed",
    ],
    outputs: [
      "Nine review lenses, each written on its own pass: compliance, evaluator, commercial, technical, programme, contract, evidence, adversarial and executive",
      "A findings register — one row per finding, naming one lens, one severity, the sentence or number it is in, and the change somebody could make this afternoon",
      "The challenge certificate: the independence position, the most consequential finding, whether the submission is BLOCKED, CONDITIONAL or CLEAR, and what must happen before it goes",
      "What the challenge could not test — the lenses limited by what was supplied",
    ],
    boundary: "It attacks; it does not approve. An absence of findings under a lens means only that this review did not find one. It is deliberately NOT given the author's working paper or reasoning — a challenger who reads why something was done is persuaded by it, and the evaluator will not have that document either. It never approves a price, accepts a design, closes a safety matter or authorises a submission.",
    backing: ["llm"],
    desk: "A seven-pass pipeline with the challenge check built in. The report is refused unless every one of the nine lenses carries a section with something under it and every finding names a lens, a severity, a location and a remedy — and a report with nine lenses and no findings at all is refused outright, because a submission with nothing wrong with it has not been challenged, it has been read. A critical finding cannot be disposed of. An approved run becomes a numbered CHR challenge report, each part printing on its own.",
  },
];

/** Function → how much AI genuinely replaces → the human control that remains. */
export const AI_MATRIX = [
  ["Opportunity and project research", "80–90%", "Final qualification"],
  ["Contact and account research", "75–85%", "Relationship verification"],
  ["First-draft outreach", "85–95%", "Approval before sending"],
  ["CRM updates and reminders", "90–95%", "Exception management"],
  ["Bid document indexing", "90–95%", "Completeness check"],
  ["Requirement extraction", "75–90%", "Technical validation"],
  ["First-draft scope writing", "75–85%", "Package-owner approval"],
  ["Tender compliance matrix", "85–95%", "Bid Manager validation"],
  ["Supplier quotation comparison", "70–85%", "Commercial judgment"],
  ["Meeting minutes and actions", "85–95%", "Chair's approval"],
  ["Document control administration", "70–90%", "Issue authorisation"],
  ["Programme progress collection", "60–80%", "Planner validation"],
  ["Cost-report preparation", "65–80%", "QS approval"],
  ["Invoice matching", "80–95%", "Payment approval"],
  ["Variation detection", "60–80%", "Entitlement and pricing decision"],
  ["Supplier compliance monitoring", "85–95%", "Competence decision"],
  ["Daily-report production", "75–90%", "Site verification"],
  ["KPI and service-level monitoring", "80–90%", "Operational intervention"],
  ["Handover-file compilation", "80–95%", "Quality acceptance"],
  ["Risk-register suggestions", "60–80%", "Risk-owner decision"],
  ["Design review assistance", "40–70%", "Competent designer approval"],
  ["Safety documentation review", "40–65%", "Competent HSEQ approval"],
  ["Site supervision", "10–25%", "Physical human presence"],
  ["Contract negotiation", "20–40%", "Human authority"],
  ["Client leadership", "10–25%", "Human relationship"],
  ["Engineering approval", "0–20%", "Qualified competent person"],
  ["Incident command", "0–15%", "Human leadership"],
  ["Final payment approval", "0%", "Authorised signatories"],
];

export const SEPARATION = [
  ["Deliver the work", "Operations and project team"],
  ["Confirm technical compliance", "Technical and Quality"],
  ["Confirm safety compliance", "HSEQ"],
  ["Measure and value the work", "Commercial"],
  ["Approve supplier appointment", "Procurement plus delegated authority"],
  ["Release payment", "Commercial certification plus Finance approval"],
  ["Accept major company risk", "Managing Director / Board"],
];

export const DELIVERY_MODEL_LIMITS = [
  {
    model: "Model 01 — Advisory",
    line: '"We define it; the client buys it." The best launch model — little working capital required.',
    team: "MD · Delivery & Technical Lead · Commercial & Supply Chain Lead · Project Coordinator · fractional specialists. The client signs and pays suppliers directly.",
    ai: "AI performs roughly 60–75% of document-production and administrative workload; human professionals remain responsible for final recommendations.",
  },
  {
    model: "Model 02 — Management Integrator",
    line: '"We manage the system; the client retains supplier contracts." The preferred second-stage model.',
    team: "Adds project-funded: Project Manager, Site Integration Manager, site HSEQ support, project controls / QS support as required — operational control without carrying the supply chain on the balance sheet.",
    ai: "Agents 4–7 carry the reporting, monitoring and evidence burden the monthly management fee prices in.",
  },
  {
    model: "Model 03 — Prime Service Contractor",
    line: '"We contract the supply chain and deliver the complete site-services scope — never the permanent works." Never accepted early merely because it produces higher revenue.',
    team: "Requires: working capital, insurance, contractual protections, creditworthy client, mobilisation advance, back-to-back supplier terms, dedicated commercial control, reliable PM, site HSEQ and quality resources, contingency headroom, board-level liability approval — the six prime gates in the Commercial OS.",
    ai: "AI reduces overhead; it does not finance suppliers or absorb contractual risk.",
  },
];

export const HIRING_SEQUENCE = [
  { stage: "Before the first contract", actions: ["Justin Nseya — MD, sales and client leadership", "Project Coordinator / AI Operations Controller — permanent or part-time", "Delivery & Technical Lead — retained / part-time", "Commercial & Supply Chain Lead — retained / part-time", "External HSEQ, accounting and legal support when needed", "Independent commercial review maintained on material bids even where the MD covers delivery functions"] },
  { stage: "First Advisory contract awarded", actions: ["Delivery & Technical Lead moves to project-funded hours", "Specialist designers added only where the commission requires them", "Supplier contracts stay with the client"] },
  { stage: "First Management Integrator contract awarded", actions: ["Appoint one Project Manager and one Site Integration Manager", "Appropriate site HSEQ support", "Project Coordinator / Document Controller where the reporting burden requires it", "All included explicitly in the monthly management fee"] },
  { stage: "First Prime Service Contractor contract awarded", actions: ["Only project-specific personnel justified by the execution plan: project commercial resource, full-time HSEQ, quality and commissioning support, Facilities / Village Manager, relevant Package Managers, shift supervision", "Costs recovered through the contract, never absorbed as unallocated central overhead"] },
];

export const APPOINTMENT_TESTS = [
  "It directly wins profitable work",
  "It protects more margin than it costs",
  "It fulfils a legal or contractual requirement",
  "It is needed continuously across more than one contract",
  "Outsourcing it would create unacceptable delivery risk",
  "The position can be funded from secured recurring revenue",
];

export const OPERATING_PRINCIPLE = [
  "Small permanent leadership core",
  "Fractional professional assurance",
  "Project-funded management team",
  "Subcontracted physical workforce",
  "AI-driven administrative production",
  "Human-controlled decisions and approvals",
];

/** The mature directorate structure — the growth map, not the payroll. */
export const MATURE_ORG = [
  { directorate: "Executive", positions: ["Managing Director / CEO", "Operations Director", "Commercial Director", "Technical & Preconstruction Director", "HSEQ & Assurance Director (independent of Operations, stop-work authority)", "Finance & Corporate Services Director"] },
  { directorate: "Business development & bids", positions: ["Business Development Director", "Sector Development Managers (energy & grid · data centres · civils & transport · renewables & remote · government & defence)", "Bid Manager", "Estimator / Cost Planner", "Proposal & Marketing Coordinator"] },
  { directorate: "Commercial, contracts & procurement", positions: ["Senior Commercial Manager / Project Commercial Lead", "Quantity Surveyor", "Contracts Manager", "Procurement & Supply Chain Manager", "Package Buyers (cabins · civils · MEP · accommodation · cleaning · security · transport · waste)", "Supplier Assurance Coordinator"] },
  { directorate: "Technical & preconstruction", positions: ["Site-Services Design Manager", "Temporary Works Coordinator", "Temporary MEP Manager", "Civils & Infrastructure Manager", "Logistics & Site-Layout Manager", "Accommodation & Welfare Specialist", "Planner / Project Controls Manager"] },
  { directorate: "Project leadership (per project)", positions: ["Project Director", "Project Manager", "Site Integration Manager — the critical ETABLIX field role", "Project Commercial Manager", "Project Controls Manager", "HSEQ Manager"] },
  { directorate: "Field delivery", positions: ["Construction / Enabling Works Manager", "MEP & Utilities Manager", "Facilities & Village Manager", "Logistics & Transport Manager", "Security & Access Manager", "Cleaning & Soft Services Manager", "Maintenance Manager (+ technicians via specialist subcontractors)", "Field Engineers / Package Managers", "Site Supervisors", "Document Controller", "Site Administrator / Mobilisation Coordinator", "Store & Materials Controller"] },
  { directorate: "Quality, commissioning & handover", positions: ["Quality Manager / Quality Engineer", "Commissioning Manager", "Handover & Reinstatement Manager"] },
  { directorate: "Central support (shared or outsourced at launch)", positions: ["HR & Recruitment Manager", "Finance Manager · Management Accountant · AP/AR · Payroll", "Legal & Insurance Adviser", "IT & Systems Administrator", "Information & Document Management Lead", "Data Protection & Cybersecurity support", "Training & Competence Coordinator", "Communications & Stakeholder Manager", "Community & Local-Content Coordinator"] },
];

/** Flattened position catalogue for the Team panel's position picker. */
export const POSITIONS = [
  ...LEAN_CORE.map((r) => ({ title: r.title, group: "Launch core", accessRole: r.accessRole })),
  ...CONTRACT_FUNDED.map((r) => ({ title: r.title, group: "Contract-funded", accessRole: r.accessRole })),
  ...FRACTIONAL.filter((r) => r.accessRole).map((r) => ({ title: r.title, group: "Fractional", accessRole: r.accessRole })),
  ...MATURE_ORG.flatMap((d) => d.positions.map((p) => ({ title: p.split(" (")[0].split(" — ")[0], group: d.directorate, accessRole: null }))),
].filter((p, i, arr) => arr.findIndex((q) => q.title === p.title) === i);


// ===================================================================
// THE AGENTIC PROJECT OPERATING SYSTEM
// ===================================================================
//
// What follows merges the CONSTRUX agent architecture into the register that
// already exists, rather than sitting beside it as a strategy document.
//
// THE ARGUMENT IT ENCODES. Specialist agents on a shared, auditable project
// state are worth more than one general assistant, because the value is not
// in answering questions — it is in the CONTINUITY between what was promised
// at tender, what is happening on site, and what the asset does for thirty
// years afterwards. Every tender requirement becomes a controlled obligation;
// every bid assumption becomes a monitored delivery condition; every price
// becomes a live cost-control basis; every site event connects to time, cost,
// risk and contract.
//
// THE LINE THAT DOES NOT MOVE. AI may perform most of the information work.
// Accountable people retain control of irreversible decisions. Under CDM 2015
// a principal contractor must have the skills, knowledge, experience and
// organisational capability to plan, manage, monitor and coordinate the
// construction phase; a system can support those duties and cannot inherit
// the appointment or the accountability.
// https://www.hse.gov.uk/construction/cdm/2015/principal-contractors.htm
//
// AND THE RULE THIS FILE ENFORCES ON ITSELF. An architecture document can
// describe agents that do not exist. A register cannot, because the portal
// reads it and a client may be shown it. So every agent below carries a
// `state`, backend/test/architecture.test.mjs cross-checks the built ones
// against the engines that actually run them, and a planned agent has no
// brief and therefore cannot be started.

/**
 * The six depths of construction AI, and where each agent actually operates.
 *
 * Most construction software sits at levels 1 and 2 and is sold as though it
 * were at 5. The honest position for this system is stated per agent below:
 * routinely 3 and 4, nothing at 5 or 6 yet.
 */
export const DEPTH_LEVELS = [
  { level: 1, name: "Retrieval", behaviour: "Finds and explains information", example: "Show every clause governing delay notices" },
  { level: 2, name: "Production", behaviour: "Creates a requested output", example: "Draft a method statement or a tender response" },
  { level: 3, name: "Analysis", behaviour: "Compares evidence and identifies issues", example: "Detect a discrepancy between the bill, the drawings and the specification" },
  { level: 4, name: "Workflow execution", behaviour: "Performs several controlled actions", example: "Raise an RFI, assign an owner, set a deadline, monitor the response" },
  { level: 5, name: "Autonomous coordination", behaviour: "Pursues an objective across systems", example: "Investigate programme slippage, gather the evidence, propose recovery" },
  { level: 6, name: "Governed operational autonomy", behaviour: "Executes approved low-risk decisions", example: "Issue reminders, update a forecast, release approved information" },
  // Level 7 is not "more autonomous" than 6. It is a different axis: an
  // organisation of agents that reasons inside THIS tender's actual contract,
  // can assert nothing that is not bound to approved evidence, attacks its
  // own output before a person sees it, and learns from the outcome through a
  // gate. Autonomy at level 6 without those properties is worse than level 4,
  // not better — it is a system acting confidently on unverified ground.
  { level: 7, name: "Contract-native, evidence-bound bid organisation", behaviour: "Reasons inside the actual contract, asserts only what evidence supports, challenges itself, and learns through a governed loop", example: "The same site event produces different rights under NEC4 Option A and JCT Design and Build, because the tender's own clause graph is loaded rather than general knowledge" },
];

/**
 * THE TWO LADDERS DO NOT AGREE, AND THAT IS RECORDED RATHER THAN RESOLVED.
 *
 * Two of the three governing documents define the autonomy levels, and they
 * define them differently:
 *
 *   AGENT-ARCHITECTURE.md         six levels, 1 to 6.
 *                                 Level 6 IS governed operational autonomy.
 *
 *   L7-PRODUCT-SPECIFICATION.md   eight levels, L0 to L7.
 *                                 Level 6 is multi-agent COORDINATION and
 *                                 level 7 is governed operational autonomy.
 *
 * So "level 6" means two different things depending on which document is
 * open, and the difference is not cosmetic: under the first, level 6 is the
 * top and executing approved low-risk actions is the ceiling. Under the
 * second, level 6 is a middle rung and the ceiling is a different property
 * entirely.
 *
 * Merging them by picking one would make the other document wrong without
 * saying so. That is exactly the failure every reconciliation in this system
 * refuses: a contradiction resolved quietly is a position nobody can defend.
 * So both are held, DEPTH_LEVELS carries the first because the agents are
 * already described against it, and the mapping below says what each level
 * means under the other. Somebody has to choose one before either is used
 * outside this repository.
 */
export const LADDER_MAPPING = {
  conflict: "The two documents number the autonomy levels differently. Level 6 means governed operational autonomy in one and multi-agent coordination in the other.",
  decisionNeeded: "Adopt one ladder for both documents and the register before either is used with a client. Until then, any statement about a level must name which ladder it is using.",
  rows: [
    { architecture: "1 Retrieval", specification: "L1 Retrieval", agree: true },
    { architecture: "2 Production", specification: "L2 Generation", agree: true },
    { architecture: "3 Analysis", specification: "L3 Analysis", agree: true },
    { architecture: "4 Workflow execution", specification: "L4 Workflow execution", agree: true },
    { architecture: "5 Autonomous coordination", specification: "L5 Goal pursuit + L6 Multi-agent coordination", agree: false,
      note: "The specification splits what the architecture calls one level into two." },
    { architecture: "6 Governed operational autonomy", specification: "L7 Governed operational autonomy", agree: false,
      note: "THE SAME BEHAVIOUR CARRIES A DIFFERENT NUMBER. This is the one that will be misread." },
    { architecture: "(none)", specification: "L0 No AI execution", agree: false,
      note: "The specification adds a zero level for a manual workspace. Harmless, and worth adopting." },
  ],
};

/**
 * The specification's action risk classes, mapped onto the autonomy table.
 *
 * These do NOT replace AUTONOMY — they are a coarser view of the same rule,
 * and both are kept because they are read by different people: a developer
 * building a policy engine wants six classes, and somebody deciding whether
 * an agent may send an email wants the fifteen specific actions.
 *
 * The mapping is stated so the two cannot drift into meaning different
 * things, which is how a policy engine ends up permitting something the
 * register forbids.
 */
export const RISK_CLASSES = [
  { class: "A", description: "Read only", examples: "Search, extract, compare, calculate a draft", handling: "Autonomous", maps: ["autonomous"] },
  { class: "B", description: "Reversible internal write", examples: "Create a task, tag evidence, update a working forecast", handling: "Autonomous with a full event log", maps: ["logged", "labelled"] },
  { class: "C", description: "Controlled internal state", examples: "Change an owner, mark a requirement complete, promote knowledge", handling: "Rule validation plus role permission", maps: ["approval"] },
  { class: "D", description: "External non-binding communication", examples: "A reminder, an information request, a meeting proposal", handling: "Template and recipient policy; approval configurable", maps: ["policy", "drafting"] },
  { class: "E", description: "Commercial or contractual commitment", examples: "Final price, tender submission, withdrawing a qualification", handling: "Named human approval required", maps: ["human"] },
  { class: "F", description: "Technical, regulatory or safety acceptance", examples: "Design acceptance, safety closure, a statutory statement", handling: "Competent authorised person only", maps: ["competent"] },
];

/**
 * THE SEVEN HARD PROPERTIES OF LEVEL 7 — and where this system stands.
 *
 * A build that fails any one of them is not level 7, and saying so in the
 * register is the only thing that stops the phrase becoming marketing. The
 * `state` column is the build order and it is deliberately unflattering.
 *
 * The specification these come from targets a different platform from the one
 * running today: an event-sourced, bitemporal, multi-tenant service estate
 * with an adapter behind every external dependency. What exists is a single
 * Node process with an embedded database, and the honest reading is that
 * level 7 is a BUILD rather than an evolution of it. The properties are still
 * the right target, and three of them can be advanced inside what exists.
 */
export const LEVEL_7 = [
  { id: "L7.1", name: "Contract-native reasoning", state: "built",
    test: "The same site event produces different outputs under NEC4 Option A, JCT Design and Build 2016, FIDIC Yellow and a bespoke amendment. Agents load the tender's actual clause graph, never generic knowledge.",
    where: "A project records its own contract — a standard form plus its bespoke amendments — and the daily sweep resolves every recorded site event against THAT contract. The same ground condition returns three different answers under NEC4 Option A, JCT Design and Build and FIDIC Yellow, and a Z-clause shortening eight weeks to fourteen days turns a live entitlement into a lost one on identical facts, which is exactly what a model trained on the published form gets wrong. THE GRAPH HOLDS STRUCTURE AND PERIODS AND NEVER CLAUSE TEXT: standard-form skeletons are marked unconfirmed until somebody loads the executed contract, and every answer carries that caveat. Payment law is computed as before. Six forms have skeletons — NEC4 Options A and C, JCT Design and Build and Standard Building Contract, FIDIC Red and Yellow — including the trap that JCT numbers the same obligation differently between its own forms, so a notice citing the wrong clause is an argument the other side gets for free. The executed contract is still loaded by a person, which is the point rather than a gap.",
    was: "Payment law is modelled properly — the due date, notice deadline, final date and pay-less deadline are computed from the day an application was received, under Part II of the Housing Grants, Construction and Regeneration Act 1996. Nothing else is. There is no clause graph, so every other contractual position is general knowledge wearing a specific tone." },
  { id: "L7.2", name: "Evidence-bound assertion", state: "built",
    test: "No sentence enters a submission unless it resolves to an evidence object approved and unexpired at the submission deadline. Enforced by a gate, not a prompt.",
    where: "The evidence registry holds objects with an expiry, and gate GE-EV-01 compares that expiry to the SUBMISSION DEADLINE rather than to today — a certificate valid this morning and lapsed the day before the deadline is refused. An unreadable expiry counts as lapsed; an insurance or accreditation with no expiry at all is refused at the door. The registry does not fill itself: somebody still has to put the certificates in it.",
    was: "Agent 2 refuses to claim an accreditation, certificate or reference that is not in its inputs, and marks what it needs as EVIDENCE REQUIRED with who holds it. That is a brief and a habit, not a registry: nothing yet holds evidence objects with an expiry date, so nothing can check that a certificate is still valid on the day the bid is submitted." },
  { id: "L7.3", name: "Adversarial self-challenge", state: "built",
    test: "Every material output — a price, a programme, a response, an assumption — is attacked by an independent agent with a different model and prompt lineage before human review.",
    where: "Agent 14 is the challenger. It is given another agent's finished output and the invitation it answers, and NOT the author's working paper or reasoning — a challenger who reads why something was done is persuaded by it, and the evaluator scoring the bid will not have that document either. Nine lenses, each written on its own pass, then a findings register. The fifth reconciliation refuses the report unless every lens carries a section with something under it, every finding names one of the nine lenses, one of the four severities, a location and a remedy, and no critical finding carries a disposition. A report with nine lenses and no findings at all is refused: a submission with nothing wrong with it has not been challenged, it has been read. AND IT IS NOW OBLIGATORY: a bid file is not numbered without an independent challenge that ran, was approved, passed its own check and left no critical finding open. Refused at the mint rather than warned about on a screen, because a control that can be walked past at four o'clock on the day of the deadline is not a control, and there is no override parameter that gets past it.",
    was: "THE CHECK IS BUILT AND THE CHALLENGER IS NOT. A review by its own run, or on the author's prompt lineage, is refused as an assurance result; a high-risk lens demands a different model route or a deterministic validator; the red team is routed off the author's model automatically; and a lens nobody ran counts as unrun rather than clean. What does not exist is an agent that actually runs the nine lenses — so the rules that would govern the challenge are in place and nothing yet performs it.",
    wasBefore: "Nothing does this. It is the cheapest of the seven to add inside the current system and probably the most valuable per hour spent, because the four reconciliations already prove that a mechanical second opinion catches what a first pass will not." },
  { id: "L7.4", name: "Time-travel state", state: "built",
    test: "Any artefact can be reconstructed as it was known at a moment in time, on both axes: when the fact was true, and when the system learned it.",
    where: "Two axes: when a fact was true, and when this system was told. A survey recorded in March and corrected in September, valid back to March, reads as 2.1 when asked what was known in March and 1.4 when asked what is now understood to have been true then. A correction is an INSERT that closes the earlier version in transaction time; there is no function here that edits a fact, because an edit is how the evidence that a decision was reasonable gets destroyed. Every contract event records awareness this way as it is entered, so a late-notified entitlement is defended on when the contractor actually knew rather than on when somebody typed it in.",
    was: "Not addressed anywhere. This is the same gap the temporal foundation names, and it is the one most likely to cost real money: a claim is defended on what was known on a date, and a system that always reads the latest file destroys exactly that." },
  { id: "L7.5", name: "Full lineage", state: "built",
    test: "Every number in a price traces back to source, date, currency, quantity basis, productivity assumption, quote validity and approver.",
    where: "A number is a node that names its parents, and the chain walks back to its sources. Confidence cannot rise through arithmetic: a total computed from a rate somebody was sixty per cent sure of is sixty per cent, and the overstatement is named rather than silently accepted. A cycle is refused. A changed source marks stale exactly its descendants. THE CONDITION IS NOW MET FOR AN ESTIMATING AGENT and that agent still does not exist.",
    was: "A document now records the run that produced it, and Agent 5 classes every figure as measured, evidenced, asserted or unknown. Neither is a lineage chain: there is no estimating agent, and there must not be one until lineage exists — an automated price nobody can defend is worse than a slow one." },
  { id: "L7.6", name: "Governed learning", state: "built",
    test: "Wins, losses, feedback and post-award variance update calibrated priors through a promotion pipeline with human approval. No agent output becomes institutional truth automatically.",
    where: "Five partitions kept apart: an agent's working context, project facts, user preference, organisational policy and approved lessons. An agent may write the first three and may only PROPOSE into the last two; it cannot write a lesson, cannot approve its own proposal, and no role below knowledge steward can promote one. The bid score cites approved lessons as evidence and REFUSES a thin prior — two observations is attached as context and does not count, because an anecdote quietly becoming a planning assumption is how an ungoverned memory compounds an error across every future bid. Institutional entries carrying no approver are counted rather than assumed to be zero.",
    was: "There is no memory of any kind, so nothing learns and nothing has learned anything wrong. That is the safe half of absent, and it stays the right answer until the promotion gate exists to make the other half safe." },
  { id: "L7.7", name: "Platform-agnostic core", state: "built",
    test: "No business logic in an adapter. Swapping the common data environment, the ERP, the estimating tool, the model provider or the database is a configuration change plus an adapter, never a core change.",
    where: "Six ports — the clock, the record store, files, mail, the model and spend — each bound at startup, each with two genuinely different adapters, and a conformance suite that runs the SAME operations through both and asserts the core cannot tell them apart. That is the only form of this claim that can be checked; the usual form is a description nothing tests. No adapter imports a domain module and that is enforced by reading them rather than requested in a comment. The automation sweep takes its time from the clock port, which is why its decisions about overdue notices can be tested against a date at all. Seven ports now: the clock, the record store, files, mail, the model, spend and the accounting ledger. FOUR BOUNDARIES STILL HAVE NO PORT and are named — the common data environment, BIM, scheduling and field applications — because a port with no adapter is a claim rather than a capability. The accounting port was added when it earned one: this system's own money ledger is a real implementation that every call site reached into directly, and its conformance run immediately found that a failure to append to that ledger was being discarded in silence.",
    was: "The model provider is swappable and the store's read and write paths are behind one small API, which is why moving off the embedded database was described as a hosting decision rather than a correctness one. Everything else — documents, uploads, mail, the platform connections — is called directly. There is no port and adapter layer and adding one to a single process is work with no user-visible result, which is exactly the kind of work that only gets done deliberately." },
];

/**
 * The seven domain engines, and the agents inside each.
 *
 * NOT DOZENS OF INDEPENDENT AGENTS COMPETING WITH ONE ANOTHER. Domain engines
 * with controlled sub-agents, above them one orchestrator that consolidates
 * the project position and presents the decisions requiring human authority —
 * and does not replace the project director.
 *
 * `state` is the honest part and it is checked by a test:
 *   built   — a pipeline or single-pass engine exists and can be run today
 *   planned — described here, not implemented, and deliberately unrunnable
 */
export const ENGINES = [
  {
    id: "tender",
    name: "Tender and Commercial Engine",
    purpose: "From an opportunity arriving to a submission uploaded, with every requirement a controlled obligation before anybody writes a word.",
    agents: [
      { id: "opportunity", name: "Opportunity Agent", state: "built", depth: 3 },
      // The paid advisory entry, and the product everything else was built
      // around. It sits here because scope intelligence happens BEFORE a bid
      // exists: it is what turns an invitation or an intention into a
      // structured requirement somebody can price.
      { id: "diagnostic", name: "Site Systems Diagnostic", state: "built", depth: 4 },
      { id: "bid", name: "Compliance and Bid Agent", state: "built", depth: 4 },
      { id: "tender-pack", name: "Tender pack assembler", state: "built", depth: 4 },
      { id: "procurement", name: "Tender evaluation", state: "built", depth: 4 },
      { id: "estimating", name: "Estimating Agent", state: "planned", depth: 3,
        why: "Quantities and rates with lineage on every number: source, date, currency, quantity basis, productivity assumption, quotation validity, exclusions, escalation, confidence and who approved it. Without lineage a price cannot be defended and must not be automated." },
      { id: "submission", name: "Submission Controller", state: "planned", depth: 4,
        why: "The last check before upload: mandatory fields, filename conventions, page and word limits, formats, signatures, pricing reconciliation, contradictory answers, expired certificates, portal completeness. This is where AI prevents an administrative disqualification, which is the cheapest loss there is." },
    ],
  },
  {
    id: "planning",
    name: "Planning and Delivery Engine",
    purpose: "The programme, and the harder half — interrogating it rather than generating it.",
    agents: [
      { id: "mobilisation-review", name: "Mobilisation-readiness review", state: "built", depth: 3 },
      { id: "controls", name: "Progress and Programme Agent", state: "built", depth: 4 },
      { id: "programme", name: "Programme Generation Agent", state: "planned", depth: 3,
        why: "Generating a programme is the easy part. What earns its place is interrogation: open-ended activities, missing predecessors, procurement disconnected from installation, hidden negative float, unsupported productivity, excessive critical-path sensitivity." },
      { id: "recovery", name: "Recovery Agent", state: "planned", depth: 4,
        why: "Recovery options with their cost and programme trade-offs, and time-impact analysis against a baseline that has not been quietly rewritten." },
    ],
  },
  {
    id: "resource",
    name: "Resource and Cost Engine",
    purpose: "What it costs, what it earns and when the cash arrives.",
    // The cost and cash-flow work is delivered inside Agent 5's monthly
    // control report — the valuation, the payment recommendations, the
    // forecast and the exposure test against the reserve. It is named here
    // rather than given a slot of its own, because an agent listed twice is
    // an agent counted twice.
    delegatedTo: { engine: "planning", agent: "controls" },
    agents: [
      { id: "commercial", name: "Commercial and Procurement Agent", state: "built", depth: 3 },
      { id: "productivity", name: "Productivity Agent", state: "planned", depth: 3,
        why: "Labour and plant output measured against what was priced, per control account, which is the only honest early warning on a cost overrun." },
    ],
  },
  {
    id: "risk",
    name: "Risk, Safety and Compliance Engine",
    purpose: "What could go wrong, and the administration around what must not.",
    agents: [
      { id: "assurance", name: "Assurance and Evidence Agent", state: "built", depth: 3 },
      { id: "challenge", name: "Adversarial Challenger", state: "built", depth: 4 },
      { id: "siteops", name: "Site Operations Agent", state: "built", depth: 3 },
      { id: "safety", name: "Safety Assurance Agent", state: "planned", depth: 3,
        why: "RAMS completeness, permit expiry, training gaps, recurring observations, method statements cross-checked against planned activity. It administers; it never supervises. It must never be sold as replacing a competent safety professional or a person on site." },
      { id: "audit", name: "Audit Agent", state: "planned", depth: 3 },
    ],
  },
  {
    id: "bim",
    name: "BIM and Digital Twin Engine",
    purpose: "The model as a source of quantities and coordination rather than a picture.",
    agents: [
      { id: "design", name: "Spatial Coordination and Interface Agent", state: "built", depth: 4 },
      { id: "model", name: "Model Validation Agent", state: "planned", depth: 3 },
      { id: "quantity", name: "Quantity Agent", state: "planned", depth: 3,
        why: "Quantities taken from the model and reconciled against the bill and the drawings. The valuable output is the disagreement between the three, not the number." },
      { id: "asset", name: "Asset Agent", state: "planned", depth: 3 },
    ],
  },
  {
    id: "contracts",
    name: "Contracts and Claims Engine",
    purpose: "The contract as an executable obligation model rather than a document nobody opens until it is too late.",
    agents: [
      { id: "site-requirements", name: "Obligation and Requirements Agent", state: "built", depth: 4 },
      { id: "village-requirements", name: "Accommodation Requirements Agent", state: "built", depth: 4 },
      { id: "obligation", name: "Obligation Monitor", state: "planned", depth: 5,
        why: "Every obligation as a controlled object: responsible party, trigger event, required action, notice period, TIME BAR, communication method, evidence, and the consequence of non-compliance. The time bar is the reason this is worth building — a right lost to a deadline is lost completely, and nothing in the current system watches one." },
      { id: "notice", name: "Notice Agent", state: "planned", depth: 4,
        why: "Drafts a notice when an event occurs and the clock starts. It drafts only: a binding contractual communication passes an authorised commercial gate, always." },
      { id: "change", name: "Change and Entitlement Agent", state: "planned", depth: 4 },
    ],
  },
  {
    id: "handover",
    name: "Handover and O&M Engine",
    purpose: "Started at mobilisation, not at practical completion — which is the only way a handover date is ever met.",
    agents: [
      { id: "commissioning", name: "Commissioning Agent", state: "planned", depth: 4 },
      { id: "handover-file", name: "Handover Agent", state: "planned", depth: 4,
        why: "A live completeness score per asset — submittals, approval, installation evidence, inspection, testing, commissioning, defect closure, training, certification, warranty, spares, operating procedure — that forecasts a failed handover before the contractual date rather than reporting one after it." },
      { id: "lifecycle", name: "Lifecycle and Asset Information Agent", state: "planned", depth: 3 },
    ],
  },
];

/**
 * The orchestrator above the engines.
 *
 * It consolidates the project position and puts the decisions that need human
 * authority in front of the person who holds it. It does not replace the
 * project director, and the day it is described as doing so is the day the
 * whole architecture becomes indefensible.
 */
export const ORCHESTRATOR = {
  name: "Project Executive Orchestrator",
  state: "planned",
  does: [
    "Consolidates one project position across every engine",
    "Resolves routine cross-engine coordination",
    "Presents the decisions that require human authority, with the evidence each rests on",
  ],
  neverDoes: [
    "Replaces the project director",
    "Makes a decision reserved to a named person",
    "Reconciles two engines' contradictory findings by choosing one",
  ],
};

/**
 * WHAT AN AGENT MAY DO ON ITS OWN, BY ACTION CLASS.
 *
 * The authority attaches to the ACTION, not to the agent — because the same
 * agent reads a document (autonomous) and drafts a contractual notice (an
 * authorised human sends it), and an authority granted to an agent as a whole
 * is an authority granted to its worst action.
 *
 * `autonomy` is one of: autonomous, logged, drafting, policy, labelled,
 * approval, human, competent.
 *
 * Autonomy increases through demonstrated reliability, never because the
 * model became more verbally confident. backend/test/architecture.test.mjs
 * asserts that nothing marked human or competent is claimed by any agent.
 */
export const AUTONOMY = [
  { action: "Read, extract and organise", autonomy: "autonomous", authority: "Autonomous" },
  { action: "Calculate using approved rules", autonomy: "logged", authority: "Autonomous, with an audit log" },
  { action: "Draft a document", autonomy: "drafting", authority: "Autonomous drafting; a person issues" },
  { action: "Send a routine reminder", autonomy: "policy", authority: "Autonomous within policy" },
  { action: "Create an internal workflow record", autonomy: "autonomous", authority: "Autonomous" },
  { action: "Update an unapproved forecast", autonomy: "labelled", authority: "Permitted, and clearly labelled as unapproved" },
  { action: "Issue an RFI", autonomy: "approval", authority: "Human approval; conditional autonomy only once reliability is demonstrated" },
  { action: "Issue a contractual notice", autonomy: "approval", authority: "Authorised human approval, always" },
  { action: "Approve a variation", autonomy: "human", authority: "Human only" },
  { action: "Commit supplier expenditure", autonomy: "human", authority: "Human only" },
  { action: "Certify a payment", autonomy: "human", authority: "Human only" },
  { action: "Change an approved baseline", autonomy: "human", authority: "Human only" },
  { action: "Approve a design or temporary works", autonomy: "competent", authority: "Competent authorised person only" },
  { action: "Close a safety-critical defect", autonomy: "competent", authority: "Competent authorised person only" },
  { action: "Stop work", autonomy: "competent", authority: "An agent may urgently recommend and escalate; formal authority follows the site's own arrangements" },
  // The six rows below arrived with the Level 7 specification. They are added
  // rather than folded into the rows above because each is a DIFFERENT
  // authority, and the policy engine resolves an action to exactly one row.
  // Before they existed, submitting a tender resolved to "issue a contractual
  // notice" and drew that row's approvers — a bid director rather than the
  // delegated signatory. The submission went out under the wrong authority
  // and nothing in the system could see it. That is what a missing register
  // row costs once something actually reads the register.
  { action: "Change controlled internal state", autonomy: "approval", authority: "Rule validation plus role permission — an owner, a completion flag, a status" },
  { action: "Promote a lesson into institutional knowledge", autonomy: "approval", authority: "Knowledge steward approval; unverified output never becomes institutional truth" },
  { action: "Ask a supplier for a price", autonomy: "policy", authority: "Autonomous within policy — a request for a price commits nothing" },
  { action: "Approve a tender price", autonomy: "human", authority: "Human only — the commercial authority, named" },
  { action: "Submit a tender", autonomy: "human", authority: "Human only — the delegated signatory, with explicit authority for the value and risk class" },
  { action: "Withdraw a qualification", autonomy: "human", authority: "Human only — it changes the contractual position of the bid" },
];

/**
 * What makes an agent deep rather than superficial — and where this system
 * actually stands on each.
 *
 * `state` is built, partial or absent, and it is the most useful column in
 * this file: it is the build order. An architecture is a list of foundations;
 * a plan is that list with the truth written next to it.
 */
export const FOUNDATIONS = [
  { id: "state", name: "Structured project state", state: "built",
    what: "A live model of organisations, people, contracts, clauses, projects, locations, assets, packages, activities, costs, risks, documents, communications, decisions and approvals.",
    where: "Requirements, evidence, responses, cost items, lineage nodes, agent runs, gates and audit records are all structured objects with their own validation, alongside the engagements, documents, runs, suppliers, payments and valuations that were already here. Contracts and their clauses are STILL not: an obligation remains prose inside a document rather than an object with a trigger and a time bar, and that is now the largest single gap in this row.",
    was: "Engagements, documents, runs, suppliers, payments and valuations are structured. Contracts and their clauses are not: an obligation is prose inside a document rather than an object with a trigger and a time bar. Without that, an agent is searching documents." },
  { id: "events", name: "Event spine", state: "built",
    what: "Every significant action an immutable event — drawing issued, instruction received, inspection failed, activity delayed, notice issued, change approved, asset commissioned — giving causation, chronology and auditability.",
    where: "Two records, deliberately different shapes. The append-only ledger holds money events and deletions. The audit journal holds agent and gate activity across all eight specified field groups, and records requested, attempted, permitted, DENIED and completed — the refusals being the evidence that the controls are real, and the line a log built around successful operations never contains. A record that could not answer the question later is refused rather than written. Site and document events are still on neither.",
    was: "The append-only ledger records money events and, since it was found missing, deletions. Site and document events are not on it." },
  { id: "temporal", name: "Temporal reasoning", state: "built",
    what: "What was known, when it became known, which revision was current, what decision was made on that information, and what changed afterwards.",
    where: "Both axes are recorded and a correction never edits. See L7.4. Coverage is contract events, awareness, and every piece of evidence's expiry — so the question of whether the accreditation was valid on the day we submitted survives the renewal that replaced it, which is the question a public procurement is most likely to ask and the one a single-axis record cannot answer. Most of the rest of the system still stores one current value.",
    was: "Nothing here reconstructs a historic position. An agent that always reads the latest file destroys the very position a claim depends on, and that is the gap most likely to cost real money." },
  { id: "provenance", name: "Provenance", state: "built",
    what: "Every conclusion links to its source, and verified fact, extracted fact, calculation, assumption, prediction, recommendation and human decision are distinguished from one another.",
    where: "Every pipeline agent traces its output to the input that produced it, marks evidence class, and refuses to invent what it was not given. Agent 5 values what the evidence supports and says so on the row." },
  { id: "contract", name: "Contract awareness", state: "built",
    what: "Reasoning inside the project's actual contract and its bespoke amendments, not generic construction knowledge — the same site event produces different rights, processes and time bars under different forms.",
    where: "The project's own contract is a graph of clauses with triggers, periods, time bars and a precedence order, and bespoke amendments supersede the standard clauses they name. See L7.1. Payment law is computed as before.",
    was: "Payment law is modelled: the due date, notice deadline, final date and pay-less deadline are computed from the day an application was received. Nothing else is." },
  { id: "tools", name: "Tool execution", state: "partial",
    what: "Controlled access to document management, the common data environment, BIM, estimating, scheduling, ERP, accounting, procurement, email, workflow, field applications and sensors.",
    where: "Documents, uploads, the store, email and the platform connections are reachable. BIM, the CDE, scheduling and field applications are not. Reading documents alone is not end-to-end management." },
  { id: "memory", name: "Memory", state: "built",
    what: "Separate memories for project facts, organisational policy, approved lessons learned, user preference and an agent's temporary working context.",
    where: "Five partitions with a promotion gate between an agent's conclusion and institutional truth. See L7.6. The original sentence still governs the design: unverified output must never become institutional truth automatically, and it now cannot rather than merely does not.",
    was: "There is none, and the absence is safer than a careless version: unverified output must never become institutional truth automatically." },
  { id: "evaluation", name: "Evaluation", state: "built",
    what: "Every important agent tested against a specialist benchmark — a missed tender requirement, a misread clause, a pricing error, a false progress reading, a missed notice deadline, an unsupported claim, a revision-control failure.",
    where: "Eight deterministic gates, each probed on every page load against a case it was built to refuse — evidence, compliance, double mark-up, risk release, submission, state transition, review independence and policy. The status shown in this register is produced by RUNNING them, so it cannot go stale the way a typed status does. There is still no benchmark set of real packs with known defects, which is what would measure recall rather than refusal, and that is now the whole of what is missing here.",
    was: "Four machine reconciliations gate four agents and are tested end to end. There is no benchmark set of real packs with known defects, which is what would actually measure recall." },
  { id: "permission", name: "Permission and approval control", state: "built",
    what: "Authority that depends on the action, its value, its contractual and safety consequence, its reversibility, the confidence behind it, the user's role and the project stage.",
    where: "Every agent runs inside a stated boundary, every pipeline output requires human approval before it becomes a document, and roles gate the desk. The AUTONOMY table above is the rule it answers to." },
];

/**
 * What "good" means, measured on operational results rather than on how the
 * output reads.
 *
 * A lower-confidence agent must abstain and escalate rather than invent
 * certainty. That is a target too, and the hardest one.
 */
export const QUALITY_TARGETS = [
  { stage: "Bidding", target: "Mandatory-requirement recall", value: "above 99%" },
  { stage: "Bidding", target: "Unapproved commercial figures in a submission", value: "zero" },
  { stage: "Bidding", target: "Unsupported corporate claims in a submission", value: "zero" },
  { stage: "Bidding", target: "Traceability for material pricing assumptions", value: "100%" },
  { stage: "Bidding", target: "Complete submission validation before upload", value: "every time" },
  { stage: "Delivery", target: "Notice-deadline recall", value: "above 99%" },
  { stage: "Delivery", target: "Progress forecast calibration, by package", value: "measured and published" },
  { stage: "Delivery", target: "Early-warning precision", value: "high enough that warnings are read" },
  { stage: "Delivery", target: "Aged RFIs", value: "falling" },
  { stage: "Delivery", target: "Unrecorded change", value: "falling" },
  { stage: "Delivery", target: "Payment-assessment cycle time", value: "falling" },
  { stage: "Delivery", target: "Handover completeness trajectory", value: "improving against the date" },
  { stage: "Delivery", target: "Manual reporting hours", value: "measurably reduced" },
];

/**
 * How this fails, and whether it currently does.
 *
 * The most dangerous error is not hallucinated prose. It is a plausible but
 * incorrect ACTION entering the live contractual, commercial or safety
 * process — which is why every reconciliation in this system refuses rather
 * than warns. NIST's AI Risk Management Framework makes the same point about
 * building trustworthiness into design, development, use and evaluation
 * rather than inspecting for it afterwards.
 * https://www.nist.gov/itl/ai-risk-management-framework
 */
export const FAILURE_MODES = [
  { mode: "One general-purpose agent", avoided: true, how: "Thirteen agents inside stated boundaries; nine with their own pipeline." },
  { mode: "Document chat with no structured data", avoided: true, how: "Every deliverable is split into numbered sections and reconciled by machine." },
  { mode: "Uncontrolled access to email and contractual communication", avoided: true, how: "No agent sends anything. Every communication is drafted and a person issues it." },
  { mode: "Progress percentages with no evidence", avoided: true, how: "Agent 5 classes every figure as measured, evidenced, asserted or unknown, and values what the evidence supports." },
  { mode: "Current documents with no historic revision context", avoided: true, how: "Facts carry a valid time and a transaction time, and a correction closes the earlier version rather than replacing it — so what was known on a date survives the correction that proved it wrong. Coverage is still partial: contract events are written this way and most of the system is not.",
    was: "Not addressed. See the temporal foundation above — this is the largest open gap." },
  { mode: "AI-generated estimates with no source lineage", avoided: true, how: "Lineage exists: every number names its parents, confidence cannot rise through arithmetic, and a calculation with no parents is refused. There is still no estimating agent — but the reason has changed from 'it must not be built yet' to 'it may now be built', which is a different sentence and the register should not have kept saying the first one.",
    was: "No estimating agent exists yet, and it must not be built before lineage is." },
  { mode: "Automatic learning from unverified project records", avoided: true, how: "There is no memory at all, which on this point is the safe answer." },
  { mode: "Many agents with no common project state", avoided: true, how: "Runs, documents, engagements, contracts, site events, evidence, lineage and memory are all shared structured state.",
    was: "Partly. Runs, documents and engagements are shared; contracts and site events are not." },
  { mode: "Confidence scores produced only by the model itself", avoided: true, how: "Every gate is arithmetic performed outside the model: references compared, figures added, dates ordered." },
  { mode: "A review that reads as thorough and contains nothing anybody can act on", avoided: true, how: "Agent 14's report is refused unless every finding names a lens, a severity, a location and a remedy — and a report with nine lenses and no findings at all is refused outright. An absence of findings under a lens is indistinguishable from the lens never having been applied, so the machine looks for the heading and for something underneath it." },
  { mode: "Work marked by the run that produced it", avoided: true, how: "The independence check refuses a review whose run or prompt lineage is the author's, and the challenger runs as its own agent on its own run rather than as a final pass." },
  { mode: "Promising to replace project managers", avoided: true, how: "The register, every agent boundary and the website all say the opposite, and the AUTONOMY table above is what it means in practice." },
];

export function organisation() {
  return {
    principle: PRINCIPLE,
    leanCore: LEAN_CORE,
    fractional: FRACTIONAL,
    contractFunded: CONTRACT_FUNDED,
    agents: AI_AGENTS,
    aiMatrix: AI_MATRIX,
    separation: SEPARATION,
    deliveryModelLimits: DELIVERY_MODEL_LIMITS,
    hiringSequence: HIRING_SEQUENCE,
    appointmentTests: APPOINTMENT_TESTS,
    operatingPrinciple: OPERATING_PRINCIPLE,
    matureOrg: MATURE_ORG,
    positions: POSITIONS,
    // The agent architecture, merged into the register rather than filed
    // beside it — so the portal shows one structure and a test can check that
    // nothing here claims an agent that cannot actually be run.
    depthLevels: DEPTH_LEVELS,
    levelSeven: LEVEL_7,
    ladderMapping: LADDER_MAPPING,
    riskClasses: RISK_CLASSES,
    engines: ENGINES,
    orchestrator: ORCHESTRATOR,
    autonomy: AUTONOMY,
    foundations: FOUNDATIONS,
    qualityTargets: QUALITY_TARGETS,
    failureModes: FAILURE_MODES,
  };
}
