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
    inputs: ["Workforce curve, site constraints, layouts", "Shift patterns and project programme", "Environmental constraints and supplier solutions"],
    outputs: ["Demand and preliminary space schedules", "Utilities-demand model", "Package boundary matrix and interface register", "Redundancy requirements and mobilisation sequence", "Design-risk prompts"],
    boundary: "Decision support only — a competent human validates every design position.",
    backing: ["llm"],
    desk: "Interface registers flow into the diagnostic deliverable and CONSTRUX.",
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
  };
}
