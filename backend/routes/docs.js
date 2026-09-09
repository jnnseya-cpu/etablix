/**
 * Document studio — plug-and-play commercial and management documents.
 *
 * Pick a template, fill the structured form, and the studio assembles a
 * branded, numbered, print-ready document (browser print → PDF). Every
 * generated document is registered with its number, so the record of
 * what was issued is the system, not a folder of files.
 *
 * Templates: invoice, payment application, fee quotation, purchase
 * order / subcontract order, payment / pay-less notice, variation
 * instruction, weekly client report. The wording blocks (payment
 * terms, HGCRA notices, reverse-charge statements) are pre-drafted so
 * documents leave the desk compliant by default.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES, ACCESS } from "../../shared/constants.js";
import { collection, insert, update, remove, recordLedger, getSettings, saveSettings } from "../lib/store.js";
import { sessionFromQuery } from "../middleware/auth.js";
import { AGENT_BRIEFS } from "../lib/ai.js";
import { diagnosticDates, releaseStatus, human as humanDate, DIAGNOSTIC_WORKING_DAYS } from "../lib/workingdays.js";
import { SECTIONS as SR_SECTIONS } from "../lib/pipelines/site-requirements.js";

const router = Router();

const deliveryFinance = requireRole(...ACCESS.DELIVERY_FINANCE);
const admin = requireRole(ROLES.ADMIN);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clampStr = (v, max = 400) => String(v ?? "").trim().slice(0, max);
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const today = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------ billing settings

const DEFAULT_BILLING = {
  bankName: "", accountName: "JNN GLOBAL LTD t/a ETABLIX", sortCode: "", accountNumber: "",
  vatNumber: "", cisUtr: "", paymentTermsDays: 14,
};

const billing = () => ({ ...DEFAULT_BILLING, ...(getSettings().billing_settings || {}) });

router.get("/billing", requireAuth, deliveryFinance, (req, res) => res.json({ billing: billing() }));

router.put("/billing", requireAuth, admin, (req, res) => {
  const patch = {};
  for (const k of ["bankName", "accountName", "sortCode", "accountNumber", "vatNumber", "cisUtr"]) {
    if (k in req.body) patch[k] = clampStr(req.body[k], 80);
  }
  if ("paymentTermsDays" in req.body) patch.paymentTermsDays = Math.max(1, Math.min(90, toNum(req.body.paymentTermsDays) || 14));
  saveSettings({ billing_settings: { ...billing(), ...patch } });
  res.json({ billing: billing() });
});

// ------------------------------------------------------------------ templates

const VAT_MODES = [
  { id: "standard", label: "Standard VAT 20%" },
  { id: "reverse", label: "Domestic reverse charge (CIS contractor client)" },
  { id: "none", label: "No VAT / outside scope" },
];

const F = (name, label, type = "text", opts = {}) => ({ name, label, type, ...opts });
const LINES = (label = "Line items") => F("lines", label, "lines");


/**
 * The twelve deliverables of a Site Systems Diagnostic, in the order the
 * website promises them and the order Agent 8 is required to produce
 * them. One list drives the document fields, the specimen's contents
 * page, and the splitter that turns an approved agent run into a draft —
 * so the promise, the agent and the document can never drift apart.
 */
export const DIAGNOSTIC_SECTIONS = [
  ["s1", "Site-service package map"],
  ["s2", "Scope-gap assessment"],
  ["s3", "Supplier-interface matrix"],
  ["s4", "Workforce-demand profile"],
  ["s5", "Temporary-utility demand assessment"],
  ["s6", "Welfare and accommodation requirements"],
  ["s7", "Mobilisation constraints"],
  ["s8", "Procurement strategy"],
  ["s9", "Preliminary risk register"],
  ["s10", "Indicative cost structure"],
  ["s11", "Recommended delivery model"],
  ["s12", "30/60/90-day mobilisation actions"],
];

/** The two sections the client-facing specimen shows in full. */
export const SPECIMEN_SECTIONS = ["s3", "s7"];

/** Agent 9's twelve, in the order the package is read. */
export const SITEREQ_SECTIONS = SR_SECTIONS;

export const TEMPLATES = [
  {
    id: "diagnostic", prefix: "SSD", name: "Site Systems Diagnostic report",
    description: "The paid entry engagement as an issued document: the one-paragraph findings and all twelve deliverables, branded and numbered in the SSD series. Draft it from an approved Agent 8 run rather than typing it.",
    fields: [
      F("client", "Client / organisation", "text", { required: true }),
      F("project", "Project / site", "text", { required: true }),
      F("siteRef", "Site reference or location", "text"),
      F("handover", `Information handover date — the issue date is ${DIAGNOSTIC_WORKING_DAYS} working days after this`, "date", { required: true }),
      F("basis", "Basis of preparation", "textarea", { placeholder: "Information relied on, and what was not provided" }),
      F("findings", "Findings in one paragraph", "textarea", { required: true }),
      ...DIAGNOSTIC_SECTIONS.map(([id, label], i) => F(id, `${i + 1}. ${label}`, "textarea")),
      F("appendix", "Appendix A — document reconciliation ledger", "textarea", {
        placeholder: "Which of the client's own documents disagree with which",
      }),
    ],
  },
  {
    id: "sitereq", prefix: "SMR", name: "Site Management Requirements Package",
    documentTitle: "Site Management Requirements Package",
    description: "Agent 9's twelve deliverables as an issued document: the requirements summary, the twelve sections, and the traceability appendix. Draft it from an approved Agent 9 run rather than typing it.",
    fields: [
      F("client", "Client / organisation", "text", { required: true }),
      F("project", "Project / site", "text", { required: true }),
      F("handover", `Information handover date — the issue date is ${DIAGNOSTIC_WORKING_DAYS} working days after this`, "date", { required: true }),
      F("basis", "Basis of preparation", "textarea", { placeholder: "Information relied on, and what was not provided" }),
      F("findings", "Requirements summary in one paragraph", "textarea", { required: true }),
      ...SITEREQ_SECTIONS.map(([id, label], i) => F(id, `${i + 1}. ${label}`, "textarea")),
      F("appendix", "Appendix A — requirement traceability and open items", "textarea", {
        placeholder: "Every requirement traced to its source, and everything that must close before issue",
      }),
    ],
  },
  {
    id: "requirements", prefix: "ERQ", name: "Employer's Requirements",
    documentTitle: "Employer's Requirements",
    description: "What the client requires, in a form a supplier can price and be held to. The output of the paid requirements engagement, and the document every tender return is measured against.",
    fields: [
      F("client", "Client", "text", { required: true }),
      F("project", "Project / scope", "text", { required: true }),
      F("package", "Package reference and title", "text", { placeholder: "e.g. P2 — Modular accommodation" }),
      F("purpose", "Purpose of this package", "textarea", { required: true, placeholder: "What the client is buying and why. One paragraph a supplier's estimator reads first." }),
      F("scope", "Scope of works — what is included", "textarea", { required: true }),
      F("excluded", "Expressly excluded — and which package holds it", "textarea", { required: true, placeholder: "The half that prevents disputes. Every exclusion names the package or party that does hold it, or it is a gap rather than an exclusion." }),
      F("interfaces", "Interfaces with other packages", "textarea", { required: true, placeholder: "Each interface, the other party, what is handed over, in what state, and who certifies it." }),
      F("performance", "Performance requirements", "textarea", { placeholder: "What the thing must do, stated so it can be measured on completion rather than argued about." }),
      F("standards", "Standards, statutory and regulatory requirements", "textarea"),
      F("programme", "Programme requirements and key dates", "textarea"),
      F("siteinfo", "Site information provided, and its status", "textarea", { placeholder: "What is given, its revision, and expressly what is not provided — an assumption the supplier is permitted to make is cheaper than a risk they price." }),
      F("clientprov", "Client-provided items and free issue", "textarea"),
      F("quality", "Quality, inspection and handover requirements", "textarea"),
      F("hse", "Health, safety and environmental requirements", "textarea"),
      F("commercial", "Commercial requirements", "textarea", { placeholder: "Contract form, payment terms, retention, bonds, insurances, liquidated damages, price basis and what is fixed against what is remeasured." }),
    ],
  },
  {
    id: "itt", prefix: "ITT", name: "Invitation to Tender — instructions to tenderers",
    documentTitle: "Invitation to Tender",
    description: "The instructions half of the tender pack: what to return, by when, in what form, and exactly how it will be evaluated. Published weightings are what make an award defensible.",
    fields: [
      F("client", "Client", "text", { required: true }),
      F("project", "Project / scope", "text", { required: true }),
      F("package", "Package reference and title", "text"),
      F("returnBy", "Tender return date", "date", { required: true }),
      F("clarifyBy", "Clarification deadline", "date"),
      F("validity", "Tender validity period", "text", { placeholder: "e.g. 90 days from the return date" }),
      F("contract", "Contract to be entered into", "textarea", { required: true, placeholder: "The form, the amendments, and where the conditions can be read. A supplier pricing an unknown contract prices a risk premium." }),
      F("returns", "What must be returned", "textarea", { required: true, placeholder: "Every schedule, numbered, with the format required. A return that is hard to compare is a return that gets marked down." }),
      F("evaluation", "How tenders will be evaluated", "textarea", { required: true, placeholder: "Criteria and weightings, published. Say how price is scored against quality — the method, not just the split." }),
      F("clarifications", "Clarification procedure", "textarea", { placeholder: "How questions are asked, and that answers go to every tenderer. Anything else is not a competition." }),
      F("conduct", "Conduct of the tender", "textarea", { placeholder: "Confidentiality, canvassing, collusion, tender costs, and the client's right not to award." }),
      F("note", "Anything specific to this tender", "textarea"),
    ],
  },
  {
    id: "capability", prefix: "CAP", name: "Capability statement (selection stage)",
    documentTitle: "Statement of capability",
    description: "The answer to a PQQ, DPS selection questionnaire or ITT capability section, structured so the company's position and the individual's experience can never be confused. Refuses to generate with an unfilled placeholder in it, or with delivery experience claimed for the company.",
    fields: [
      F("client", "Buyer / framework being answered", "text", { required: true, placeholder: "e.g. CHIC Development DPS — Right to Participate" }),
      F("project", "Reference or lot", "text", { placeholder: "The buyer's reference for this submission" }),
      F("companyPosition", "The company — what it is, plainly", "textarea", {
        required: true,
        placeholder: "Incorporation, what ETABLIX does, and what it does not yet hold. Say it straight; a buyer respects a new company that is honest far more than one that is vague.",
      }),
      F("insurance", "Insurance position", "textarea", { placeholder: "What is held, what is being placed, and by when. Never state cover that is not in force." }),
      F("accreditations", "Accreditations and memberships", "textarea", { placeholder: "Only what is genuinely held. \u201CPending\u201D or \u201Cin progress with a target date\u201D is an acceptable answer. A claimed accreditation that is checked is not." }),
      F("person1Name", "Key person 1 — name and role in ETABLIX", "text", { required: true }),
      F("person1Exp", "Key person 1 — relevant experience", "textarea", {
        required: true,
        placeholder: "Written as the individual's experience: role held, employer, what they were responsible for, scale. This is the substance of the submission.",
      }),
      F("person2Name", "Key person 2 — name and role", "text"),
      F("person2Exp", "Key person 2 — relevant experience", "textarea"),
      F("method", "How ETABLIX would deliver this scope", "textarea", {
        required: true,
        placeholder: "The method, drawing on the experience above. This is where a new company competes on equal terms — the approach is assessed, not the trading history.",
      }),
      F("capacity", "Capacity and resourcing for this contract", "textarea", { placeholder: "Who does the work, what is retained or subcontracted, and how it scales. Honest capacity beats overstated capacity at the first contract review." }),
      F("declare", "What is declared rather than claimed", "textarea", {
        placeholder: "The gaps you are telling them about before they find them: trading history, accounts, references. Declaring a weakness costs a few marks; concealing one that is then discovered costs the framework.",
      }),
    ],
  },
  {
    id: "inforequest", prefix: "IRQ", name: "Diagnostic information request",
    documentTitle: "Site Systems Diagnostic — information request",
    description: "What the client sends before the ten working days start, and in what format. Issue this the moment a diagnostic is agreed: the clock starts when the last item lands, and a drawing sent in the wrong format is the difference between reading it and guessing at it.",
    fields: [
      F("client", "Client / organisation", "text", { required: true }),
      F("project", "Project / site", "text", { required: true }),
      F("contact", "Their contact — name and role", "text"),
      F("returnBy", "Requested by", "date"),
      F("note", "Anything specific to this engagement (optional)", "textarea"),
    ],
  },
  {
    id: "specimen", prefix: "SPEC", name: "Diagnostic specimen extract (client-safe)",
    // What the picker calls it is internal shorthand; what the reader sees is not.
    documentTitle: "Site Systems Diagnostic — illustrative extract",
    description: "An illustrative extract for a prospective client: the findings paragraph, two sections in full, and a contents list of the rest. Watermarked SPECIMEN on every page and labelled as a worked example ETABLIX has not delivered — so it can never be mistaken for real client work.",
    fields: [
      F("project", "Illustrative project name", "text", { required: true, placeholder: "Worked example — keep it obviously illustrative" }),
      F("findings", "Findings in one paragraph", "textarea", { required: true }),
      F("s3", "Shown in full — Supplier-interface matrix", "textarea", { required: true }),
      F("s7", "Shown in full — Mobilisation constraints (the consent chain)", "textarea", { required: true }),
      F("note", "Closing note to the reader (optional)", "textarea"),
    ],
  },
  {
    id: "invoice", prefix: "INV", name: "Invoice",
    description: "VAT-aware sales invoice with automatic numbering, reverse-charge wording and your bank details.",
    fields: [
      F("client", "Client / company", "text", { required: true }),
      F("clientAddress", "Client address", "textarea"),
      F("clientRef", "Client reference / PO", "text"),
      F("project", "Project / engagement", "text", { required: true }),
      F("vatMode", "VAT treatment", "select", { options: VAT_MODES.map((v) => v.id), labels: VAT_MODES.map((v) => v.label) }),
      LINES("Invoice lines (description · qty · rate)"),
      F("notes", "Notes (optional)", "textarea"),
    ],
  },
  {
    id: "application", prefix: "APP", name: "Payment application",
    description: "Interim application for payment: gross valuation to date, less previously certified, giving the sum applied for.",
    fields: [
      F("client", "Client / company", "text", { required: true }),
      F("project", "Project / contract", "text", { required: true }),
      F("period", "Valuation period (e.g. 2026-09)", "text", { required: true }),
      F("applicationNo", "Application number (e.g. 04)", "text"),
      LINES("Valuation build-up (item · qty/% · value)"),
      F("previouslyCertified", "Less previously certified (£)", "number"),
      F("vatMode", "VAT treatment", "select", { options: VAT_MODES.map((v) => v.id), labels: VAT_MODES.map((v) => v.label) }),
      F("notes", "Basis of valuation / notes", "textarea"),
    ],
  },
  {
    id: "quotation", prefix: "QUO", name: "Fee quotation / proposal",
    description: "Advisory or integrator fee proposal with scope, fees, assumptions and 30-day validity.",
    fields: [
      F("client", "Client / company", "text", { required: true }),
      F("contact", "Addressee", "text"),
      F("project", "Engagement / project", "text", { required: true }),
      F("model", "Delivery model", "select", { options: ["Model A — Advisory", "Model B — Management Integrator", "Model C — Prime Service Contractor"] }),
      LINES("Scope & fees (deliverable · qty · fee)"),
      F("assumptions", "Assumptions & exclusions", "textarea"),
      F("validityDays", "Validity (days)", "number", { placeholder: "30" }),
    ],
  },
  {
    id: "po", prefix: "PO", name: "Purchase order / subcontract order",
    description: "Supplier order with compliant 30-day payment terms — never pay-when-paid — and CIS wording.",
    fields: [
      F("supplier", "Supplier", "text", { required: true }),
      F("supplierAddress", "Supplier address", "textarea"),
      F("project", "Project / site", "text", { required: true }),
      F("package", "Package / scope title", "text", { required: true }),
      LINES("Order lines (description · qty · rate)"),
      F("startDate", "Commencement", "date"),
      F("cis", "CIS applies to labour elements", "select", { options: ["yes", "no"], labels: ["Yes — CIS deduction per verification", "No — materials / plant / exempt"] }),
      F("notes", "Special conditions (optional)", "textarea"),
    ],
  },
  {
    id: "notice", prefix: "PN", name: "Payment / pay-less notice",
    description: "HGCRA 1996-compliant notice: the notified sum, its basis, and the amount proposed to be paid.",
    fields: [
      F("supplier", "To (supplier / payee)", "text", { required: true }),
      F("project", "Project / contract", "text", { required: true }),
      F("applicationRef", "Against application ref", "text", { required: true }),
      F("noticeType", "Notice type", "select", { options: ["payment", "payless"], labels: ["Payment notice (s.110A)", "Pay-less notice (s.111)"] }),
      F("appliedSum", "Sum applied for (£)", "number", { required: true }),
      F("notifiedSum", "Sum considered due — the notified sum (£)", "number", { required: true }),
      F("basis", "Basis of calculation", "textarea", { required: true }),
      F("dueDate", "Payment due date", "date"),
      F("finalDate", "Final date for payment", "date"),
    ],
  },
  {
    id: "variation", prefix: "VAR", name: "Variation instruction",
    description: "Instructed change with cost and programme effect, priced through the change process — contingency drawdown documented, never silent.",
    fields: [
      F("party", "To (client or supplier)", "text", { required: true }),
      F("project", "Project / contract", "text", { required: true }),
      F("title", "Variation title", "text", { required: true }),
      F("description", "Description of change", "textarea", { required: true }),
      LINES("Cost build-up (item · qty · value)"),
      F("programmeEffect", "Programme effect", "textarea"),
      F("contingency", "Drawn against contingency risk item (ref, if applicable)", "text"),
    ],
  },
  {
    id: "report", prefix: "RPT", name: "Weekly client report",
    description: "One-page client report: progress, services status, interfaces, risks and decisions needed.",
    fields: [
      F("client", "Client", "text", { required: true }),
      F("project", "Project / site", "text", { required: true }),
      F("weekEnding", "Week ending", "date", { required: true }),
      F("progress", "Progress this week", "textarea", { required: true }),
      F("services", "Service status (welfare, power, water, security, accommodation…)", "textarea"),
      F("interfaces", "Interface & constraint items", "textarea"),
      F("risks", "Risks & lookahead", "textarea"),
      F("decisions", "Decisions needed from the client", "textarea"),
    ],
  },
];

router.get("/templates", requireAuth, deliveryFinance, (req, res) =>
  res.json({ templates: TEMPLATES.map(({ id, prefix, name, description, fields }) => ({ id, prefix, name, description, fields })) })
);

// ---------------------------------------------------------------- generation

/**
 * The next document number in a series.
 *
 * The counter lives in settings, and settings and documents are two rows
 * in the same file: restore one from a backup taken a moment before the
 * other and the counter can sit behind the documents already issued. A
 * repeated invoice number is not a cosmetic fault — it is two different
 * invoices with one identity in the client's ledger and ours.
 *
 * So the counter is never trusted on its own. It is raised to the
 * highest number already issued in the series before it is incremented,
 * which makes the documents themselves the record and the counter merely
 * the fast path.
 */
export function nextNumber(prefix) {
  const counters = { ...(getSettings().doc_counters || {}) };
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const highest = collection("documents").reduce((mx, d) => {
    const m = re.exec(String(d.number || ""));
    return m ? Math.max(mx, Number(m[1])) : mx;
  }, 0);
  counters[key] = Math.max(counters[key] || 0, highest) + 1;
  saveSettings({ doc_counters: counters });
  return `${prefix}-${year}-${String(counters[key]).padStart(3, "0")}`;
}

function cleanLines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 40)
    .map((l) => ({ description: clampStr(l.description, 240), qty: toNum(l.qty) || 1, rate: toNum(l.rate) }))
    .filter((l) => l.description);
}

router.get("/", requireAuth, deliveryFinance, (req, res) =>
  res.json({
    documents: [...collection("documents")].reverse().map(({ data, ...meta }) => ({
      ...meta,
      // A diagnostic waiting for its date is the one thing about a
      // document you need to know without opening it.
      release: data?.dueDate ? { ...releaseStatus(data.dueDate), dueDate: data.dueDate, assured: data.datesAssured !== false } : null,
    })),
  })
);


/**
 * The naming rule, enforced rather than remembered.
 *
 * The Commercial Playbook flags two phrases that must never reach a
 * client document. "Principal Service Contractor" collides with
 * "Principal Contractor", a defined CDM 2015 role carrying specific
 * health-and-safety duties — taking those duties must be an explicit,
 * priced, insured decision, never an accident of branding. And ETABLIX
 * describing itself as a main contractor is simply untrue: we own the
 * temporary site environment around the permanent works, not the works.
 *
 * Both are blocked at generation, because a document is the point at
 * which a drafting slip becomes a representation to a client.
 *
 * Only self-description is caught. "Your main contractor", "the
 * appointed principal contractor" and duty-allocation wording all
 * describe other parties correctly and pass through untouched.
 */
const NAMING_RULES = [
  {
    test: /principal\s+service\s+contractor/i,
    message:
      'Use "Prime Service Contractor", never "Principal Service Contractor" — it collides with the CDM 2015 Principal Contractor role, which carries health-and-safety duties ETABLIX takes only by explicit, priced and insured appointment.',
  },
  {
    test: /\b(?:we|etablix|jnn\s+global(?:\s+ltd)?)\s+(?:are|is|acts?\s+as|will\s+act\s+as|shall\s+act\s+as|operates?\s+as)\s+(?:the\s+|a\s+)?(?:main|principal)\s+contractor\b/i,
    message:
      "This describes ETABLIX as the main or principal contractor. ETABLIX delivers the site-services scope around the permanent works and is neither by default — say what we actually are, or name the party that holds the role.",
  },
];

/** Returns the first naming-rule breach across every text field, or null. */
/**
 * The two ways a capability statement destroys a company.
 *
 * The first is a placeholder that goes out unfilled. "[TO SUPPLY]" in a
 * PQQ is worse than a gap you declared, because it says nobody read the
 * document before sending it.
 *
 * The second is worse and quieter: claiming as the company's what is
 * actually an individual's. A new company saying "our Director led the
 * procurement of X" is normal, verifiable and expected at selection
 * stage. The same company saying "we delivered X" is not true, and one
 * checked reference ends both the bid and the relationship. The template
 * keeps the two apart by structure; this keeps them apart by refusal.
 */
const COMPANY_CLAIM =
  /\b(?:etablix|jnn\s+global(?:\s+ltd)?|we|our\s+company|the\s+company)\s+(?:has\s+|have\s+|had\s+)?(?:successfully\s+)?(?:delivered|completed|constructed|built|managed|operated|ran|executed)\b/i;

function capabilityBreach(data, templateId) {
  if (templateId !== "capability") return null;
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" || !value) continue;
    if (/\[TO SUPPLY\]|\[TBC\]|\bXXX\b/i.test(value)) {
      return `"${key}" still contains a placeholder. Fill it or delete the sentence — an unfilled bracket in a submission says nobody read it before sending.`;
    }
    // The personnel-experience fields are meant to describe an individual.
    if (COMPANY_CLAIM.test(value) && !/^(company|insurance|accred)/i.test(key)) {
      return (
        "This claims delivery experience for ETABLIX rather than for a named individual. " +
        "The company was incorporated recently and has no project record of its own; the experience belongs to the person who holds it. " +
        'Write it as "Our Director, [name], led …" — that is a normal, verifiable answer at selection stage. "We delivered …" is not, and a single checked reference ends the bid.'
      );
    }
  }
  return null;
}

function namingBreach(data) {
  for (const value of Object.values(data)) {
    if (typeof value !== "string" || !value) continue;
    for (const rule of NAMING_RULES) {
      if (rule.test.test(value)) return rule.message;
    }
  }
  // Line descriptions are text a person types too.
  for (const line of data.lines || []) {
    for (const rule of NAMING_RULES) {
      if (rule.test.test(String(line.description || ""))) return rule.message;
    }
  }
  return null;
}

/**
 * The draft behind "Draft from an approved agent run".
 *
 * Only an approved run is offered: the agent drafts, a competent person
 * approves, and only then does it become a document ETABLIX would put
 * its name on. The reply is a draft, not a document — the person still
 * reviews every section and presses Generate.
 */
router.get("/from-run/:id", requireAuth, deliveryFinance, (req, res) => {
  const run = collection("agentTasks").find((r) => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found." });
  // Two pipeline agents now produce a twelve-section deliverable, and each
  // drafts into its own template. Hardcoding the diagnostic here would have
  // made Agent 9's £14,000–£45,000 package a retyping exercise.
  const DRAFTS = {
    diagnostic: { template: "diagnostic", split: splitDiagnostic },
    "site-requirements": { template: "sitereq", split: splitSiteRequirements },
  };
  const draft = DRAFTS[run.agent];
  if (!draft) {
    return res.status(400).json({ error: "This agent does not produce a document. Only the pipeline agents do." });
  }
  if (run.status !== "approved") {
    return res.status(409).json({
      error: "This run has not been approved yet. Approve it in Organisation first — an unreviewed run does not become an issued report.",
    });
  }

  const { data, missing, matched } = draft.split(run.output);

  // ?template=specimen — the same run, cut down to the client-safe extract
  // that goes on the website and into a pitch: the findings paragraph, the
  // supplier-interface matrix and the mobilisation constraints in full, and
  // a contents list of the other ten.
  //
  // THE CLIENT AND PROJECT NAMES ARE DELIBERATELY NOT CARRIED ACROSS. A
  // specimen is a marketing document, and the one way it can do real damage
  // is by naming a real engagement — construction is small enough that a
  // project is identifiable from its constraints alone, so the name is
  // typed by a person who has decided the extract is safe to publish, not
  // inherited from a run.
  if (req.query.template === "specimen" && run.agent === "diagnostic") {
    const shown = SPECIMEN_SECTIONS.filter((id) => data[id]);
    return res.json({
      template: "specimen",
      runTitle: run.title,
      matched: shown.length + (data.findings ? 1 : 0),
      missing: [
        ...(data.findings ? [] : ["Findings in one paragraph"]),
        ...SPECIMEN_SECTIONS.filter((id) => !data[id]).map(
          (id) => `${DIAGNOSTIC_SECTIONS.findIndex(([x]) => x === id) + 1}. ${DIAGNOSTIC_SECTIONS.find(([x]) => x === id)[1]}`
        ),
      ],
      specimenWarning:
        "The project name is blank on purpose. A specimen is published, so it must name an illustrative project, never a real engagement — " +
        "read the three sections through and remove any client name, site name, supplier name or figure that identifies a real project before you generate it.",
      data: {
        project: "",
        findings: data.findings || "",
        s3: data.s3 || "",
        s7: data.s7 || "",
      },
    });
  }

  res.json({
    template: draft.template,
    runTitle: run.title,
    matched,
    missing,
    data: {
      ...data,
      project: String(run.inputs?.project || run.title || "").slice(0, 300),
      client: String(run.inputs?.client || "").slice(0, 300),
      // The date the ten days run from, captured when the engagement
      // started rather than remembered when the report is issued.
      handover: String(run.inputs?.handover || "").slice(0, 10),
      basis: basisFromRun(run),
    },
  });
});

/**
 * What the report was prepared from — assembled from the run itself
 * rather than typed, so the basis of preparation records the documents
 * that were actually read and names the fields that were left empty.
 */
function basisFromRun(run) {
  const brief = AGENT_BRIEFS.diagnostic;
  const supplied = [];
  const notSupplied = [];
  for (const f of brief?.fields || []) {
    // The client and project names identify the report; they are not
    // information it was prepared from.
    if (f.type !== "textarea") continue;
    const v = String(run.inputs?.[f.name] || "").trim();
    const label = f.label.split(" — ")[0];
    (v ? supplied : notSupplied).push(label);
  }
  const files = (run.sources || []).filter((f) => !f.error).map((f) => f.name);
  const parts = [];
  if (supplied.length) parts.push(`Prepared from the information supplied by the client: ${supplied.join(", ")}.`);
  if (files.length) parts.push(`Documents read in full: ${files.join(", ")}.`);
  if (notSupplied.length) parts.push(`Not provided, and therefore not relied on: ${notSupplied.join(", ")}.`);
  parts.push(
    "No site visit was undertaken. Where documents contradicted one another the contradiction is reported rather than resolved. Every load, ratio, rate and duration is a first-pass planning figure requiring validation by a competent person before use."
  );
  return parts.join(" ");
}

router.post("/generate", requireAuth, deliveryFinance, (req, res) => {
  const tpl = TEMPLATES.find((t) => t.id === req.body?.template);
  if (!tpl) return res.status(400).json({ error: "Unknown template." });
  const input = req.body.data || {};
  for (const f of tpl.fields) {
    if (f.required && f.type !== "lines" && !clampStr(input[f.name])) {
      return res.status(400).json({ error: `"${f.label}" is required.` });
    }
  }
  const data = {};
  for (const f of tpl.fields) {
    if (f.type === "lines") data.lines = cleanLines(input.lines);
    else if (f.type === "number") data[f.name] = toNum(input[f.name]);
    else data[f.name] = clampStr(input[f.name], f.type === "textarea" ? 4000 : 300);
  }
  const breach = namingBreach(data) || capabilityBreach(data, tpl.id);
  if (breach) return res.status(400).json({ error: breach });

  // The ten working days are the promise, so the date is computed once
  // from the handover and carried on the document. Recomputing it later
  // would let a slipped handover quietly move a date the client was
  // already given.
  if (tpl.id === "diagnostic" && data.handover) {
    const dates = diagnosticDates(data.handover);
    if (!dates) return res.status(400).json({ error: "The information handover date is not a date." });
    data.dueDate = dates.due;
    data.promisedDays = dates.days;
    data.datesAssured = dates.assured;
  }

  const number = nextNumber(tpl.prefix);
  const doc = insert("documents", {
    template: tpl.id,
    templateName: tpl.name,
    number,
    title: data.project || data.client || data.supplier || tpl.name,
    party: data.client || data.supplier || data.party || "—",
    total: (data.lines || []).reduce((s, l) => s + l.qty * l.rate, 0),
    issuedBy: req.user.name,
    data,
  });
  res.status(201).json({ document: { id: doc.id, number: doc.number, template: doc.template } });
});

/**
 * POST /:id/release — issue a diagnostic before the date the client was promised.
 *
 * The hold banner is worked out at render time from the due date, so it
 * removes itself on the day. That is right for the normal case and wrong
 * for the case where there is a real reason to go early: the only way to
 * send early was to send a document carrying "Internal review copy" and
 * hope the client did not read the red box.
 *
 * So early release is a deliberate act with a reason attached, and three
 * things about it are not negotiable:
 *
 *   - THE PROMISED DATE DOES NOT MOVE. The engagement was sold as ten
 *     working days from handover, and rewriting the due date would erase
 *     what the client was told. The date stays; the departure from it is
 *     recorded against it.
 *   - A reason is required, and it is stored. "Released early" with no
 *     reason is the same as nobody noticing.
 *   - It goes in the append-only ledger as well as on the document, because
 *     a record that lives only in a row somebody can edit is not a record.
 */
router.post("/:id/release", requireAuth, deliveryFinance, (req, res) => {
  const doc = collection("documents").find((x) => x.id === req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found." });
  if (doc.template !== "diagnostic") {
    return res.status(400).json({ error: "Only a diagnostic report is held to a promised issue date." });
  }
  if (doc.earlyRelease) {
    return res.status(400).json({ error: `This report was already released early on ${new Date(doc.earlyRelease.at).toLocaleDateString("en-GB")} by ${doc.earlyRelease.by}.` });
  }
  const dueDate = doc.data?.dueDate || "";
  const rel = dueDate ? releaseStatus(dueDate) : null;
  if (rel?.state !== "held") {
    return res.status(400).json({ error: "This report is not being held — its issue date has arrived, so it can be sent as it stands." });
  }
  const reason = String(req.body?.reason || "").trim().slice(0, 500);
  if (reason.length < 15) {
    return res.status(400).json({ error: "Give the reason for issuing before the promised date — at least a sentence. It is recorded on the document." });
  }

  const earlyRelease = {
    at: Date.now(),
    by: req.user.name,
    reason,
    // The promised date is kept ON the release record too, so the document
    // still evidences what was sold even if the data is edited later.
    promisedDate: dueDate,
    workingDaysEarly: rel.days,
  };
  update("documents", doc.id, { earlyRelease });
  recordLedger("document.released-early", doc.id, req.user.name,
    `${doc.number} issued ${rel.days} working day(s) before the promised date of ${dueDate}. Reason: ${reason}`);
  res.json({ document: { id: doc.id, number: doc.number, earlyRelease } });
});

router.delete("/:id", requireAuth, admin, (req, res) => {
  const row = remove("documents", req.params.id);
  if (!row) return res.status(404).json({ error: "Document not found." });
  res.json({ deleted: true });
});

// ------------------------------------------------------------------ rendering

/**
 * The heading a reader sees. Template names are written for the person
 * choosing one — "(client-safe)", "/ subcontract order" — which is the
 * wrong register for the top of an issued document, so a template may
 * carry its own reader-facing title.
 */
function headingFor(doc) {
  const tpl = TEMPLATES.find((t) => t.id === doc.template);
  return tpl?.documentTitle || doc.templateName;
}

/**
 * A template that names its own heading has already said what the
 * document is; appending the project as well produces two em-dashes and
 * a sentence nobody wrote. The project stays in the meta table.
 */
function headingSuffix(doc) {
  const tpl = TEMPLATES.find((t) => t.id === doc.template);
  if (tpl?.documentTitle || !doc.data.project) return "";
  return " — " + esc(doc.data.project);
}

/**
 * Turn an approved Agent 8 run into a diagnostic draft.
 *
 * The agent is required to produce thirteen blocks under numbered
 * headings — a findings paragraph and the twelve deliverables. This
 * finds each heading in the raw output and hands back the text between
 * it and the next one, so the person issuing the report reviews and
 * edits thirteen filled fields instead of retyping them.
 *
 * It matches on the heading NUMBER rather than its wording, because a
 * model will decorate a heading (`## 7. Mobilisation constraints`,
 * `**7 · MOBILISATION CONSTRAINTS**`) far more readily than it will
 * renumber it. Anything it cannot find is reported as missing rather
 * than left silently blank — an empty section in a diagnostic is a
 * failed engagement, and the person needs to see which one.
 */
export const splitDiagnostic = (output) => splitPipelineOutput(output, DIAGNOSTIC_SECTIONS);
export const splitSiteRequirements = (output) => splitPipelineOutput(output, SITEREQ_SECTIONS);

/**
 * The same parse for any twelve-section deliverable.
 *
 * Agent 8 and Agent 9 both produce a findings paragraph, twelve numbered
 * sections and a lettered appendix. Only the field names differ, so the
 * parser takes them rather than being written twice — two copies of this
 * would drift the first time either agent's headings changed.
 */
export function splitPipelineOutput(output, sections) {
  const lines = String(output || "").replace(/\r\n/g, "\n").split("\n");

  // A heading line: optional markdown hashes or bold, a number 0-12, a
  // separator, then title text. The title must not read as a sentence,
  // which is what keeps "10. Issue the DNO enquiry" inside section 12
  // from being mistaken for the start of section 10.
  const HEADING = /^\s*(?:#{1,4}\s*)?(?:\*\*|__)?\s*(\d{1,2})\s*[.)·:—-]\s*([^\n]*?)\s*(?:\*\*|__)?\s*$/;

  const found = new Map();
  const marks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = HEADING.exec(lines[i]);
    if (!m) continue;
    const n = Number(m[1]);
    if (n < 0 || n > 12 || found.has(n)) continue;
    const title = m[2].trim();
    // Headings are short and unpunctuated; list items are neither.
    const decorated = /^\s*#/.test(lines[i]) || /^\s*(?:\*\*|__)/.test(lines[i]);
    const headingish = title.length > 2 && title.length <= 70 && !/[.;]$/.test(title);
    if (!decorated && !headingish) continue;
    found.set(n, marks.length);
    marks.push({ n, at: i });
  }

  const data = {};
  const missing = [];
  const take = (n) => {
    const idx = found.get(n);
    if (idx === undefined) return "";
    const start = marks[idx].at + 1;
    const end = idx + 1 < marks.length ? marks[idx + 1].at : lines.length;
    return lines.slice(start, end).join("\n").trim();
  };

  const findings = take(0);
  if (findings) data.findings = findings;
  else missing.push("Findings in one paragraph");

  sections.forEach(([id, label], i) => {
    const body = take(i + 1);
    if (body) data[id] = body;
    else missing.push(`${i + 1}. ${label}`);
  });

  // The appendix is lettered, not numbered, so it never collides with a
  // deliverable. It is not counted as missing: it exists only when the
  // reconciliation pass found something worth appending.
  const appendixAt = lines.findIndex((l) => /^\s*(?:#{1,4}\s*)?(?:\*\*|__)?\s*A\s*[.)·:—-]\s*\S/.test(l));
  if (appendixAt >= 0) {
    const after = marks.filter((m) => m.at > appendixAt).map((m) => m.at);
    const end = after.length ? Math.min(...after) : lines.length;
    const body = lines.slice(appendixAt + 1, end).join("\n").trim();
    if (body) data.appendix = body;
  }

  return { data, missing, matched: 13 - missing.length };
}

/** Rendered documents open in a new tab, so auth arrives as ?token=. */
function tokenAuth(req, res, next) {
  const payload = sessionFromQuery(req.query.token || "");
  if (!payload) return res.status(401).send("Authentication required.");
  if (!ACCESS.DELIVERY_FINANCE.includes(payload.role)) return res.status(403).send("Insufficient permissions.");
  req.user = payload;
  next();
}

const vatBlock = (mode, net) => {
  if (mode === "reverse") {
    // HMRC requires the invoice to state the VAT the customer must
    // account for, or the rate. Stating £0.00 alone leaves the client's
    // bookkeeper to work out the number, which is where it gets worked
    // out wrongly.
    const due = net * 0.2;
    return {
      rows: `<tr><td colspan="3" class="tr">VAT @ 20% — reverse charge, not charged by us</td><td class="tr">${money(0)}</td></tr>`,
      total: net,
      note: `Domestic reverse charge: customer to account for the VAT to HMRC. VAT of ${money(due)} at 20% is due on this supply and is not included in the total above. VAT Act 1994 s.55A applies.`,
    };
  }
  if (mode === "standard") {
    const vat = net * 0.2;
    return { rows: `<tr><td colspan="3" class="tr">VAT @ 20%</td><td class="tr">${money(vat)}</td></tr>`, total: net + vat, note: "" };
  }
  return { rows: "", total: net, note: "" };
};

const linesTable = (lines, cols = ["Description", "Qty", "Rate", "Amount"]) => {
  const rows = lines
    .map((l) => `<tr><td>${esc(l.description)}</td><td class="tr">${l.qty}</td><td class="tr">${money(l.rate)}</td><td class="tr">${money(l.qty * l.rate)}</td></tr>`)
    .join("");
  return { html: `<table class="lines"><thead><tr>${cols.map((c, i) => `<th${i ? ' class="tr"' : ""}>${c}</th>`).join("")}</tr></thead><tbody>${rows}</tbody>`, net: lines.reduce((s, l) => s + l.qty * l.rate, 0) };
};

const para = (label, text) => (text ? `<div class="blk"><h3>${label}</h3><p>${esc(text).replace(/\n/g, "<br>")}</p></div>` : "");


/**
 * Render an agent's section text as document HTML.
 *
 * Agent output is prose with markdown-ish tables and bullets. Dropping it
 * into a <p> would waste the structure the agent was told to produce, so
 * pipe tables become real tables, dashes become lists, and everything is
 * escaped first — this text originates from a model and is never trusted
 * as markup.
 */
function richText(text) {
  const src = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!src) return "";
  const out = [];
  const lines = src.split("\n");
  let i = 0;

  /**
   * Escape first, then re-introduce the two marks an agent actually
   * emits. Every piece of text in this renderer goes through here —
   * cells and list items included — so bold never survives as literal
   * asterisks in one place while working in another.
   */
  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(^|[\s(])\*(\S(?:[^*]*\S)?)\*(?=[\s.,;:)]|$)/g, "$1<i>$2</i>");

  const isRow = (l) => l.trim().startsWith("|") && l.trim().endsWith("|");
  const cells = (l) => l.trim().slice(1, -1).split("|").map((c) => inline(c.trim()));
  const isDivider = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
  const isBullet = (l) => /^\s*(?:[-*\u2022]|\d+[.)])\s+/.test(l);
  // One and two hashes were not matched, and the agent writes every
  // top-level section title with them — "## 10. INDICATIVE COST
  // STRUCTURE", "## A · DOCUMENT RECONCILIATION LEDGER". They fell
  // through to the paragraph branch and appeared in the client's
  // document as literal hashes, which is the difference between a report
  // and a text file with a letterhead on it.
  const isHeading = (l) => /^\s*#{1,6}\s+\S/.test(l);
  const headingLevel = (l) => (l.match(/^\s*(#{1,6})/) || [, "###"])[1].length;

  while (i < lines.length) {
    const line = lines[i];

    if (isHeading(line)) {
      const level = headingLevel(line);
      const cls = level <= 2 ? "rt-h1" : "rt-h";
      out.push(`<h4 class="${cls}">${inline(line.replace(/^\s*#{1,6}\s+/, "").trim())}</h4>`);
      i += 1;
      continue;
    }

    if (isRow(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && isRow(lines[i])) { body.push(cells(lines[i])); i += 1; }
      out.push(
        `<table class="lines"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
          body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") +
          "</tbody></table>"
      );
      continue;
    }

    if (isBullet(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && isBullet(lines[i])) {
        const parts = [lines[i].replace(/^\s*(?:[-*\u2022]|\d+[.)])\s+/, "").trim()];
        i += 1;
        // A wrapped continuation line is part of the item above it, not a new paragraph.
        while (i < lines.length && lines[i].trim() && !isBullet(lines[i]) && !isRow(lines[i]) && !isHeading(lines[i]) && /^\s{2,}\S/.test(lines[i])) {
          parts.push(lines[i].trim());
          i += 1;
        }
        items.push(inline(parts.join(" ")));
      }
      out.push(`<${ordered ? "ol" : "ul"} class="rt">${items.map((t) => `<li>${t}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }

    // A markdown rule carries no meaning once the text is sectioned, and
    // leaks as a literal "---" if left in.
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { i += 1; continue; }

    if (!line.trim()) { i += 1; continue; }

    const para = [];
    while (i < lines.length && lines[i].trim() && !isRow(lines[i]) && !isBullet(lines[i]) && !isHeading(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

const section = (n, label, text) =>
  text ? `<div class="blk"><h3>${n} · ${label}</h3>${richText(text)}</div>` : "";

function renderBody(doc) {
  const d = doc.data;
  const b = billing();
  const t = (label, value) => (value ? `<tr><th>${label}</th><td>${esc(value)}</td></tr>` : "");

  if (doc.template === "invoice" || doc.template === "application") {
    const isApp = doc.template === "application";
    const { html, net } = linesTable(d.lines || []);
    const less = isApp ? toNum(d.previouslyCertified) : 0;
    const afterLess = net - less;
    const vat = vatBlock(d.vatMode, afterLess);
    const bank = b.accountNumber
      ? `<div class="blk"><h3>Payment</h3><p>${esc(b.accountName)}${b.bankName ? " · " + esc(b.bankName) : ""}<br>Sort code ${esc(b.sortCode)} · Account ${esc(b.accountNumber)}<br>Terms: ${b.paymentTermsDays} days from the due date. Please quote ${esc(doc.number)}.</p></div>`
      : `<div class="blk"><h3>Payment</h3><p>Terms: ${b.paymentTermsDays} days from the due date. Please quote ${esc(doc.number)}.</p></div>`;
    return `
      <table class="meta">${t("To", d.client)}${t("Address", d.clientAddress)}${t("Client ref / PO", d.clientRef)}${t("Project", d.project)}${isApp ? t("Valuation period", d.period) + t("Application no.", d.applicationNo) : ""}${b.vatNumber ? t("VAT no.", b.vatNumber) : ""}</table>
      ${html}
      <tfoot>
      <tr><td colspan="3" class="tr"><b>${isApp ? "Gross valuation to date" : "Net total"}</b></td><td class="tr"><b>${money(net)}</b></td></tr>
      ${isApp ? `<tr><td colspan="3" class="tr">Less previously certified</td><td class="tr">(${money(less)})</td></tr><tr><td colspan="3" class="tr"><b>Sum applied for (net)</b></td><td class="tr"><b>${money(afterLess)}</b></td></tr>` : ""}
      ${vat.rows}
      <tr class="grand"><td colspan="3" class="tr"><b>${isApp ? "Total applied for" : "Total due"}</b></td><td class="tr"><b>${money(vat.total)}</b></td></tr>
      </tfoot></table>
      ${vat.note ? `<p class="legalnote">${vat.note}</p>` : ""}
      ${isApp ? `<p class="legalnote">This application is made under the contract's payment provisions and s.110–113 of the Housing Grants, Construction and Regeneration Act 1996. In the absence of a valid payment or pay-less notice, the sum applied for becomes the notified sum.</p>` : ""}
      ${para("Notes", d.notes)}
      ${bank}`;
  }

  if (doc.template === "quotation") {
    const { html, net } = linesTable(d.lines || [], ["Deliverable", "Qty", "Fee", "Amount"]);
    return `
      <table class="meta">${t("To", d.contact ? `${d.contact}, ${d.client}` : d.client)}${t("Engagement", d.project)}${t("Delivery model", d.model)}</table>
      ${html}<tfoot><tr class="grand"><td colspan="3" class="tr"><b>Total fee (excl. VAT)</b></td><td class="tr"><b>${money(net)}</b></td></tr></tfoot></table>
      ${para("Assumptions & exclusions", d.assumptions)}
      <div class="blk"><h3>Validity & acceptance</h3><p>This proposal remains open for acceptance for ${toNum(d.validityDays) || 30} days from the date above. Fees are fixed for the defined scope; changes are priced through a documented change process before commitment. Acceptance in writing (email suffices) instructs commencement.</p></div>`;
  }

  if (doc.template === "po") {
    const { html, net } = linesTable(d.lines || []);
    return `
      <table class="meta">${t("Supplier", d.supplier)}${t("Address", d.supplierAddress)}${t("Project / site", d.project)}${t("Package", d.package)}${t("Commencement", d.startDate)}</table>
      ${html}<tfoot><tr class="grand"><td colspan="3" class="tr"><b>Order value (excl. VAT)</b></td><td class="tr"><b>${money(net)}</b></td></tr></tfoot></table>
      <div class="blk"><h3>Payment terms</h3><p>Payment is 30 days from the contractual due date, subject to completed work, evidence, acceptance and any valid notice. Applications by day 20 of each month with progress measurement, labour and plant records, delivery evidence, inspection records, updated programme, forecast-to-complete, change documentation, defect status, EVM coding and CIS/VAT information. Payment is made against certified, verified Earned Value — never bare invoices or self-declared percent-complete.</p></div>
      ${d.cis === "yes" ? `<p class="legalnote">CIS: labour elements are subject to deduction at the rate confirmed by HMRC verification. Provide your UTR and company registration before first payment.</p>` : ""}
      ${para("Special conditions", d.notes)}`;
  }

  if (doc.template === "notice") {
    const isPayless = d.noticeType === "payless";
    return `
      <table class="meta">${t("To", d.supplier)}${t("Project / contract", d.project)}${t("Against application", d.applicationRef)}${t("Payment due date", d.dueDate)}${t("Final date for payment", d.finalDate)}</table>
      <div class="blk"><h3>${isPayless ? "Pay-less notice — s.111 HGCRA 1996" : "Payment notice — s.110A HGCRA 1996"}</h3>
      <table class="meta">
      <tr><th>Sum applied for</th><td>${money(d.appliedSum)}</td></tr>
      <tr><th>${isPayless ? "Sum considered due at the date of this notice" : "The notified sum"}</th><td><b>${money(d.notifiedSum)}</b></td></tr>
      </table></div>
      ${para("Basis of calculation", d.basis)}
      <p class="legalnote">This notice is given under the contract and the Housing Grants, Construction and Regeneration Act 1996 (as amended). The sum stated will be paid on or before the final date for payment unless a further notice is validly given.</p>`;
  }

  if (doc.template === "variation") {
    const { html, net } = linesTable(d.lines || [], ["Cost item", "Qty", "Value", "Amount"]);
    return `
      <table class="meta">${t("To", d.party)}${t("Project / contract", d.project)}${t("Variation", d.title)}${t("Contingency ref", d.contingency)}</table>
      ${para("Description of change", d.description)}
      ${d.lines?.length ? html + `<tfoot><tr class="grand"><td colspan="3" class="tr"><b>Variation value (excl. VAT)</b></td><td class="tr"><b>${money(net)}</b></td></tr></tfoot></table>` : ""}
      ${para("Programme effect", d.programmeEffect)}
      <p class="legalnote">This instruction is issued through the contract change process. ${d.contingency ? "The value is drawn against the referenced joint risk-register item under the defined drawdown process." : "No contingency drawdown is made by this instruction."} Do not proceed beyond the instructed scope.</p>`;
  }

  if (doc.template === "diagnostic") {
    const rel = d.dueDate ? releaseStatus(d.dueDate) : null;
    // The banner is on the document itself, not only in the console,
    // because the way a report goes out early is that someone forwards
    // the PDF without looking at the console.
    // A deliberately released report shows the client nothing about the
    // hold. The record of it lives on the document row, in the engagement's
    // audit trail and in the append-only ledger — not in a red box the
    // client reads and draws their own conclusion from.
    const hold =
      rel?.state === "held" && !doc.earlyRelease
        ? `<div class="holdnote"><b>Do not issue before ${esc(humanDate(d.dueDate))}.</b> This engagement was sold as ${d.promisedDays || DIAGNOSTIC_WORKING_DAYS} working days from information handover on ${esc(humanDate(d.handover))}. ${rel.days} working day${rel.days === 1 ? "" : "s"} remain. Internal review copy.</div>`
        : "";
    return `
      ${hold}
      <table class="meta">${t("Client", d.client)}${t("Project / site", d.project)}${t("Site reference", d.siteRef)}${
        d.handover ? t("Information handover", humanDate(d.handover)) : ""
      }${d.dueDate ? t("Issue date", `${humanDate(d.dueDate)} — ${d.promisedDays || DIAGNOSTIC_WORKING_DAYS} working days from handover`) : ""}${t("Prepared by", doc.issuedBy)}</table>
      ${d.findings ? `<div class="blk"><h3>Findings in one paragraph</h3>${richText(d.findings)}</div>` : ""}
      ${DIAGNOSTIC_SECTIONS.map(([id, label], i) => section(i + 1, label, d[id])).join("")}
      ${d.appendix ? `<div class="blk"><h3>Appendix A · Document reconciliation ledger</h3><p class="rt-lede">Which of your own documents disagree with which. Set out as the documents state it.</p>${richText(d.appendix)}</div>` : ""}
      ${d.basis ? `<div class="blk"><h3>Basis of preparation</h3>${richText(d.basis)}</div>` : ""}
      <p class="legalnote">Every load, ratio, rate and duration in this report is a first-pass planning figure requiring validation by a competent person before use. Where information was not provided it is identified as missing rather than assumed. This report is decision support: it is not a design, a price or an instruction, and nothing safety-critical is resolved within it.</p>`;
  }

  if (doc.template === "requirements") {
    const sec = (n, title, body, lede) =>
      body ? `<div class="blk"><h3>${n} · ${title}</h3>${lede ? `<p class="rt-lede">${lede}</p>` : ""}${richText(body)}</div>` : "";
    return `
      <table class="meta">${t("Client", d.client)}${t("Project / scope", d.project)}${t("Package", d.package)}${t("Prepared by", doc.issuedBy)}</table>
      ${sec(1, "Purpose of this package", d.purpose)}
      ${sec(2, "Scope of works", d.scope)}
      ${sec(3, "Expressly excluded", d.excluded, "Every exclusion names the package or party that does hold the item. An exclusion that names nobody is a gap, and it will be found at the worst possible moment.")}
      ${sec(4, "Interfaces with other packages", d.interfaces, "What is handed over, in what state, and who certifies it. This section is why a package is bought rather than a scope left between two contracts.")}
      ${sec(5, "Performance requirements", d.performance)}
      ${sec(6, "Standards and statutory requirements", d.standards)}
      ${sec(7, "Programme requirements", d.programme)}
      ${sec(8, "Site information provided", d.siteinfo, "With its revision and status. What is not provided is stated, so a tenderer prices an assumption rather than a risk.")}
      ${sec(9, "Client-provided items and free issue", d.clientprov)}
      ${sec(10, "Quality, inspection and handover", d.quality)}
      ${sec(11, "Health, safety and environment", d.hse)}
      ${sec(12, "Commercial requirements", d.commercial)}
      <p class="legalnote">These Employer's Requirements state what is required, not how it is to be achieved, except where a method is
      itself a requirement. Where a tenderer's proposal departs from this document the departure must be stated in the tender return
      and priced separately, so that what is being compared is comparable.</p>`;
  }

  if (doc.template === "itt") {
    const sec = (n, title, body, lede) =>
      body ? `<div class="blk"><h3>${n} · ${title}</h3>${lede ? `<p class="rt-lede">${lede}</p>` : ""}${richText(body)}</div>` : "";
    return `
      <table class="meta">${t("Client", d.client)}${t("Project / scope", d.project)}${t("Package", d.package)}${
        d.returnBy ? t("Tenders to be returned by", humanDate(d.returnBy)) : ""
      }${d.clarifyBy ? t("Clarification deadline", humanDate(d.clarifyBy)) : ""}${t("Tender validity", d.validity)}</table>
      <div class="specimen-notice">
        <b>Read this document before pricing.</b> It sets out what must be returned, in what form, and exactly how tenders will be
        evaluated. The evaluation criteria and their weightings are published in section 3 — a tenderer who knows how they will be
        marked can put effort where it counts, and an award made against published weightings can be explained to those who did not win.
      </div>
      ${sec(1, "Contract to be entered into", d.contract)}
      ${sec(2, "What must be returned", d.returns, "Returns that cannot be compared cannot be scored. Use the schedules as issued.")}
      ${sec(3, "How tenders will be evaluated", d.evaluation, "Published before tenders are returned, and applied without change afterwards.")}
      ${sec(4, "Clarification procedure", d.clarifications, "Answers are issued to every tenderer. Anything else is not a competition.")}
      ${sec(5, "Conduct of this tender", d.conduct)}
      ${sec(6, "Specific to this tender", d.note)}
      <p class="legalnote">The client is not bound to accept the lowest or any tender, and reserves the right not to award. Tendering
      costs lie with the tenderer. Canvassing, or any agreement with another tenderer as to price or content, will disqualify.</p>`;
  }

  if (doc.template === "capability") {
    const person = (n, e, i) =>
      n
        ? `<div class="blk"><h3>Key person ${i} · ${esc(n)}</h3>
             <p class="rt-lede">The experience below is that of the named individual, held in previous employment. It is not a project record of ETABLIX or of JNN GLOBAL LTD.</p>
             ${richText(e)}</div>`
        : "";
    return `
      <table class="meta">${t("Submission to", d.client)}${t("Reference / lot", d.project)}${t("Prepared by", doc.issuedBy)}</table>
      <div class="specimen-notice">
        <b>Two separate things, kept separate.</b> Section 1 is the position of the company. Section 2 is the experience of named
        individuals, held in previous employment. ETABLIX makes no claim to have delivered, as a company, any project described in
        section 2 — and nothing in this document should be read as making one.
      </div>
      <div class="blk"><h3>1 · The company</h3>${richText(d.companyPosition)}</div>
      ${d.insurance ? `<div class="blk"><h3>1.1 · Insurance</h3>${richText(d.insurance)}</div>` : ""}
      ${d.accreditations ? `<div class="blk"><h3>1.2 · Accreditations and memberships</h3>${richText(d.accreditations)}</div>` : ""}
      <div class="blk"><h3>2 · Key personnel and their experience</h3>
        <p class="rt-lede">Assessed at selection stage as the experience of the people who will do the work. Each entry is verifiable with the individual and, where the buyer requires it, with the former employer.</p>
      </div>
      ${person(d.person1Name, d.person1Exp, 1)}
      ${person(d.person2Name, d.person2Exp, 2)}
      <div class="blk"><h3>3 · How ETABLIX would deliver this scope</h3>${richText(d.method)}</div>
      ${d.capacity ? `<div class="blk"><h3>4 · Capacity and resourcing</h3>${richText(d.capacity)}</div>` : ""}
      ${d.declare ? `<div class="blk"><h3>5 · Declared position</h3><p class="rt-lede">Stated here rather than left to be discovered.</p>${richText(d.declare)}</div>` : ""}
      <p class="legalnote">Every statement in this document is offered as accurate and is capable of verification. Where ETABLIX does not
      hold something — trading history, an accreditation, cover not yet incepted — it is declared in section 1 or section 5 rather than
      omitted. Individual experience is stated as individual experience throughout.</p>`;
  }

  if (doc.template === "inforequest") {
    const item = (n, title, detail, format) =>
      `<tr><td class="num">${n}</td><td><b>${title}</b><div class="rq">${detail}</div></td><td class="fmt">${format}</td></tr>`;
    return `
      <table class="meta">${t("Client", d.client)}${t("Project / site", d.project)}${t("For the attention of", d.contact)}${
        d.returnBy ? t("Requested by", humanDate(d.returnBy)) : ""
      }</table>
      <div class="blk"><p>The Site Systems Diagnostic is ${DIAGNOSTIC_WORKING_DAYS} working days from information handover. <b>The clock starts on the day the last item below arrives</b>, so a partial pack does not start it — and the report is only as good as what it is given. Send what exists as it exists; do not tidy it first. Where something does not exist, say so on the covering note rather than leaving it out: an absence we know about is a finding, and an absence we do not is a hole.</p></div>
      <div class="blk"><h3>What we need</h3>
        <table class="lines contents"><thead><tr><th></th><th>Item</th><th>Format</th></tr></thead><tbody>
        ${item(1, "Project programme", "Milestones, phases, shift patterns, and the access or possession date each one depends on. The current revision, not the tender one.", "PDF print of the Gantt <b>and</b> a task list as CSV")}
        ${item(2, "Workforce forecast", "The curve over the whole programme, the peak, its composition, and the percentage unable to commute daily.", "Excel exported to CSV, or PDF")}
        ${item(3, "Proposed site layout", "Every compound, with areas, access points, parking, welfare and laydown.", "PDF drawing at its stated scale, with the title block")}
        ${item(4, "Logistics plan", "Whatever exists, approved or draft — and which compounds it actually covers.", "PDF or Word")}
        ${item(5, "Temporary-services requirements", "Power, water, foul and comms as you have stated them, with the revision they were issued at.", "PDF or Word")}
        ${item(6, "Procurement package list", "Every package, its status, and who is buying it. Including the ones marked not started.", "Excel exported to CSV, or PDF")}
        ${item(7, "Mobilisation constraints", "Planning conditions in full, consents applied for and not, ecology, utilities, land and access agreements.", "PDF of the decision notices, not a summary")}
        ${item(8, "Site and utility information", "What surveys and investigations you hold — <b>and a list of what you do not</b>.", "PDF or Word")}
        </tbody></table>
      </div>
      <div class="blk"><h3>Two format rules that change the answer</h3>
        <p><b>Drawings as PDF, at scale, with the title block.</b> A drawing is read by looking at it — what adjoins what, what shares an access, what the hatching means. A screenshot, a cropped extract or a drawing without its title block loses the revision, the scale and the date, and we would be reading labels rather than a layout. DWG and DXF cannot be read here; export to PDF.</p>
        <p><b>Programmes as a PDF print plus a CSV task list.</b> Microsoft Project, Primavera P6 and Asta files cannot be opened here, and every one of those tools exports both. The PDF gives us the bars, the links and the float; the CSV gives us the dates to work backwards from. One without the other loses half of it.</p>
      </div>
      <div class="blk"><h3>What we do with it</h3>
        <p>Every document is read against every other one. Most of what a diagnostic is worth sits between two documents written weeks apart by different people who have not compared them — a shift pattern against a planning condition, a headcount against a welfare schedule, an enquiry against the drawing it was sized from. That is why we ask for the current revision of everything and for the documents you think are superseded: the gap between them is usually the finding.</p>
        <p>Every figure we produce is a first-pass planning figure for validation by a competent person. Nothing safety-critical is resolved in the report; it is flagged.</p>
      </div>
      ${d.note ? `<div class="blk"><h3>For this engagement</h3>${richText(d.note)}</div>` : ""}
      <p class="legalnote">Information supplied for this engagement is treated as confidential and used only to produce your report. Send it however suits you — if a secure transfer is preferred, say so and we will arrange one.</p>`;
  }

  if (doc.template === "sitereq") {
    const rel = d.dueDate ? releaseStatus(d.dueDate) : null;
    const hold =
      rel?.state === "held" && !doc.earlyRelease
        ? `<div class="holdnote"><b>Do not issue before ${esc(humanDate(d.dueDate))}.</b> This engagement was sold as ${d.promisedDays || DIAGNOSTIC_WORKING_DAYS} working days from information handover on ${esc(humanDate(d.handover))}. ${rel.days} working day${rel.days === 1 ? "" : "s"} remain. Internal review copy.</div>`
        : "";
    return `
      ${hold}
      <table class="meta">${t("Client", d.client)}${t("Project / site", d.project)}${
        d.handover ? t("Information handover", humanDate(d.handover)) : ""
      }${d.dueDate ? t("Issue date", `${humanDate(d.dueDate)} — ${d.promisedDays || DIAGNOSTIC_WORKING_DAYS} working days from handover`) : ""}${t("Prepared by", doc.issuedBy)}</table>
      ${d.findings ? `<div class="blk"><h3>Requirements summary in one paragraph</h3>${richText(d.findings)}</div>` : ""}
      ${SITEREQ_SECTIONS.map(([id, label], i) => section(i + 1, label, d[id])).join("")}
      ${d.appendix ? `<div class="blk"><h3>Appendix A · Requirement traceability and open items</h3><p class="rt-lede">Every requirement traced to the document, duty or condition that mandates it — and everything that must close before this package is issued.</p>${richText(d.appendix)}</div>` : ""}
      ${d.basis ? `<div class="blk"><h3>Basis of preparation</h3>${richText(d.basis)}</div>` : ""}
      <p class="legalnote">This package is decision support and a drafting service. It is not a design, not a price and not legal advice, and nothing within it appoints ETABLIX as Principal Contractor under CDM 2015 — that is a defined legal role and holding it must be an explicit, priced and insured decision. Requirements marked [PROPOSED] require the client's approval before issue. Every load, ratio, rate and duration is a first-pass planning figure requiring validation by a competent person.</p>`;
  }

  if (doc.template === "specimen") {
    const shown = new Set(SPECIMEN_SECTIONS);
    const contents = DIAGNOSTIC_SECTIONS.map(
      ([id, label], i) =>
        `<tr><td class="num">${i + 1}</td><td>${esc(label)}</td><td class="st">${shown.has(id) ? "Shown in full" : "In the full report"}</td></tr>`
    ).join("");
    return `
      <table class="meta">${t("Illustrative project", d.project)}${t("Document type", "Specimen extract")}</table>
      <div class="specimen-notice">
        <b>Illustrative worked example.</b> This extract demonstrates the format, depth and method of a Site Systems Diagnostic.
        It is <b>not a project ETABLIX has delivered</b>, and the client, site, figures and findings within it are invented for
        illustration. No part of it describes real work, a real client or a real contract.
      </div>
      <div class="blk"><h3>Findings in one paragraph</h3>${richText(d.findings)}</div>
      <div class="blk"><h3>3 · Supplier-interface matrix <span class="tag">shown in full</span></h3>${richText(d.s3)}</div>
      <div class="blk"><h3>7 · Mobilisation constraints <span class="tag">shown in full</span></h3>${richText(d.s7)}</div>
      <div class="blk"><h3>What the full report contains</h3>
        <table class="lines contents"><tbody>${contents}</tbody></table>
        <p class="legalnote" style="margin-top:10px;">Twelve deliverables, typically 25–40 pages, issued within ten working days of information handover and presented to your leadership. Fixed fee, defined deliverable, yours to keep whatever you decide afterwards.</p>
      </div>
      ${d.note ? `<div class="blk"><h3>A note on the figures</h3>${richText(d.note)}</div>` : ""}`;
  }

  if (doc.template === "report") {
    return `
      <table class="meta">${t("Client", d.client)}${t("Project / site", d.project)}${t("Week ending", d.weekEnding)}</table>
      ${para("Progress this week", d.progress)}
      ${para("Service status", d.services)}
      ${para("Interfaces & constraints", d.interfaces)}
      ${para("Risks & lookahead", d.risks)}
      ${para("Decisions needed", d.decisions)}`;
  }
  return "<p>Unknown template.</p>";
}

/**
 * The rendered document, as one self-contained HTML page.
 *
 * Exported because the client portal renders the same invoice the desk
 * renders. Two renderers would be two documents with one number on them,
 * which is the sort of thing that is discovered in a dispute.
 */
export function renderDocument(doc) {
  const dateStr = new Date(doc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(doc.number)} — ${esc(doc.templateName)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #1d232a; margin: 0; background: #fff; }
  .page { max-width: 820px; margin: 0 auto; padding: 48px 52px 60px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #14181d; padding-bottom: 18px; }
  .wordmark { font-family: Arial Black, Arial, sans-serif; font-size: 30px; letter-spacing: -1px; }
  .wordmark small { display: block; font-family: Arial, sans-serif; font-size: 9px; font-weight: bold; letter-spacing: 3px; color: #9c7a3c; margin-top: 3px; }
  .docid { text-align: right; font-family: Arial, sans-serif; }
  .docid b { display: block; font-size: 17px; }
  .docid span { font-size: 12px; color: #5b6672; }
  h2.doctitle { font-family: Arial, sans-serif; font-size: 21px; margin: 26px 0 18px; }
  table.meta { border-collapse: collapse; margin: 0 0 20px; font-size: 13.5px; }
  table.meta th { text-align: left; padding: 4px 18px 4px 0; color: #5b6672; font-weight: normal; font-family: Arial, sans-serif; font-size: 12px; white-space: nowrap; vertical-align: top; }
  table.meta td { padding: 4px 0; }
  table.lines { border-collapse: collapse; width: 100%; font-size: 13.5px; margin: 8px 0 4px; }
  table.lines th { font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; text-align: left; border-bottom: 2px solid #14181d; padding: 8px 10px 6px 0; }
  table.lines td { border-bottom: 1px solid #dcd7cc; padding: 8px 10px 8px 0; vertical-align: top; }
  table.lines tfoot td { border-bottom: none; padding: 6px 10px 2px 0; }
  tr.grand td { border-top: 2px solid #14181d; padding-top: 10px; font-size: 15px; }
  .tr { text-align: right; }
  .blk { margin: 22px 0 0; }
  /* Agent-authored section content. */
  ul.rt, ol.rt { margin: 8px 0 0; padding-left: 20px; font-size: 13.5px; line-height: 1.65; }
  p.rt-lede { font-size: 13px; color: #5b6672; margin: 0 0 8px; }
  h4.rt-h { font-family: Arial, sans-serif; font-size: 12.5px; letter-spacing: 0.4px; margin: 16px 0 2px; color: #14181d; }
  h4.rt-h1 { font-family: Arial, sans-serif; font-size: 15px; letter-spacing: 0.2px; margin: 26px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #dcd7cc; color: #14181d; }
  h4.rt-h1:first-child { margin-top: 4px; }
  ul.rt li, ol.rt li { margin-bottom: 5px; }
  .blk table.lines { font-size: 12.5px; }
  .blk table.lines td, .blk table.lines th { padding-right: 12px; }
  .blk .rq { color: #5b6672; font-size: 12.5px; line-height: 1.5; margin-top: 3px; max-width: 62ch; }
  table.lines td.fmt { font-family: Arial, sans-serif; font-size: 11.5px; color: #14181d; white-space: normal; width: 210px; vertical-align: top; }
  table.contents td.num { width: 26px; color: #9c7a3c; font-family: Arial, sans-serif; font-weight: bold; }
  table.contents td.st { text-align: right; font-family: Arial, sans-serif; font-size: 11px; color: #5b6672; white-space: nowrap; }
  .tag { font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: #9c7a3c; border: 1px solid #9c7a3c; border-radius: 100px; padding: 2px 8px; vertical-align: middle; margin-left: 6px; }
  .holdnote { border: 2px solid #c0392b; background: #fdf6f5; color: #8e2b21; padding: 12px 16px; margin: 0 0 18px; font-size: 13px; line-height: 1.55; font-family: Arial, sans-serif; }
  .specimen-notice { border-left: 4px solid #c0392b; background: #fdf6f5; padding: 14px 18px; margin: 4px 0 22px; font-size: 13.5px; line-height: 1.6; }
  /* SPECIMEN watermark — fixed, so it repeats on every printed page and
     survives a screenshot or a single forwarded sheet. */
  .wm { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
  .wm span { position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%) rotate(-32deg);
    font-family: Arial Black, Arial, sans-serif; font-size: 118px; letter-spacing: 14px;
    color: rgba(192, 57, 43, 0.10); white-space: nowrap; }
  .page { position: relative; z-index: 1; }
  @media print { .wm span { color: rgba(192, 57, 43, 0.13); } }
  .blk h3 { font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #9c7a3c; margin: 0 0 6px; }
  .blk p { margin: 0; font-size: 13.5px; line-height: 1.6; }
  .legalnote { font-size: 12px; color: #5b6672; line-height: 1.55; border-left: 3px solid #9c7a3c; padding-left: 12px; margin: 18px 0 0; }
  .foot { margin-top: 46px; border-top: 1px solid #dcd7cc; padding-top: 14px; font-family: Arial, sans-serif; font-size: 10.5px; color: #5b6672; line-height: 1.6; }
  .toolbar { position: fixed; top: 14px; right: 16px; }
  .toolbar button { font-family: Arial, sans-serif; font-size: 13px; padding: 9px 20px; background: #14181d; color: #fff; border: 0; border-radius: 4px; cursor: pointer; }
  @media print { .toolbar { display: none; } .page { padding: 0; } }
</style></head><body>${doc.template === "specimen" ? '<div class="wm"><span>SPECIMEN</span></div>' : ""}
<div class="toolbar"><button onclick="print()">Print / save as PDF</button></div>
<div class="page">
  <div class="head">
    <div class="wordmark">ETABLIX<small>INTEGRATED SITE SERVICES · PART OF GROUPE NSEYA</small></div>
    <div class="docid"><b>${esc(doc.number)}</b><span>${esc(doc.templateName)}<br>${dateStr}<br>Issued by ${esc(doc.issuedBy)}</span></div>
  </div>
  <h2 class="doctitle">${esc(headingFor(doc))}${headingSuffix(doc)}</h2>
  ${renderBody(doc)}
  <div class="foot">
    ETABLIX is a trading name of JNN GLOBAL LTD · Registered in England &amp; Wales · Company No. 15405437<br>
    Registered office: Groupe Nseya House, Kingstanding, Birmingham B44 8DJ, United Kingdom<br>
    contact@etablix.com · +44 7493 216101 · etablix.com
  </div>
</div></body></html>`;
}

router.get("/:id/render", tokenAuth, (req, res) => {
  const doc = collection("documents").find((x) => x.id === req.params.id);
  if (!doc) return res.status(404).send("Document not found.");
  res.send(renderDocument(doc));
});

/**
 * Mint a document from inside another route — the client portal raises
 * deposit and balance invoices automatically, and they must be the same
 * numbered documents, in the same series, as the ones raised by hand.
 * An automatic invoice that lives somewhere else is a second ledger.
 */
export function createDocument({ template, data, issuedBy = "ETABLIX", title, party }) {
  const tpl = TEMPLATES.find((t) => t.id === template);
  if (!tpl) throw new Error("Unknown document template: " + template);
  const clean = { ...data, lines: cleanLines(data.lines || []) };
  return insert("documents", {
    template: tpl.id,
    templateName: tpl.name,
    number: nextNumber(tpl.prefix),
    title: title || clean.project || clean.client || tpl.name,
    party: party || clean.client || "\u2014",
    total: clean.lines.reduce((s, l) => s + l.qty * l.rate, 0),
    issuedBy,
    data: clean,
  });
}

export default router;
