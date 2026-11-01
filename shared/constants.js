/**
 * ETABLIX shared constants — used by both the backend (Node) and the
 * frontend (browser ESM). Keep this file dependency-free.
 */

export const COMPANY = {
  name: "ETABLIX",
  group: "A Groupe Nseya company",
  strapline: "Integrated Site Services",
  tagline: "One site. One accountable operating system.",
  email: "contact@etablix.com",
  phone: "+44 7493 216101",
  address: "Groupe Nseya House, Kingstanding, Birmingham, B44 8DJ",
  location: "Birmingham, United Kingdom",
  territories: "Serving UK, Ireland, Europe and selected international programmes",
};

export const ROLES = {
  ADMIN: "admin",
  COMMERCIAL_MANAGER: "commercial_manager",
  OPERATIONS_DIRECTOR: "operations_director",
  PROJECT_MANAGER: "project_manager",
  SITE_ENGINEER: "site_engineer",
  QA_INSPECTOR: "qa_inspector",
};

/**
 * Access levels for the internal Commercial OS.
 *   COMMERCIAL — pricing studio, bid/no-bid screen, GTM accounts,
 *                prime-bid gates and the company set-up checklist.
 *   DELIVERY_FINANCE — cash-flow desk, valuations, EVM gate, retention
 *                      ledger and the enterprise risk register.
 * Admin always has both; roles listed here are in addition to admin.
 */
export const ACCESS = {
  COMMERCIAL: [ROLES.ADMIN, ROLES.COMMERCIAL_MANAGER, ROLES.OPERATIONS_DIRECTOR],
  DELIVERY_FINANCE: [
    ROLES.ADMIN,
    ROLES.COMMERCIAL_MANAGER,
    ROLES.OPERATIONS_DIRECTOR,
    ROLES.PROJECT_MANAGER,
  ],
};

export const SECTORS = [
  "Grid / power",
  "Renewable energy",
  "Data centre",
  "Rail / major civils",
  "Industrial / mining",
  "Developer / EPC",
];

/** Services a client can request in the business enquiry form. */
export const SERVICES = [
  "Site Systems Diagnostic",
  "Site infrastructure strategy",
  "Managed Procurement Desk",
  "Workforce village delivery",
  "Management Integrator",
  "Prime Service Contractor",
  "CONSTRUX demonstration",
  "VERYX demonstration",
];

/**
 * THE THREE DELIVERY MODELS, AS DATA RATHER THAN AS PROSE.
 *
 * SERVICES above lists their names. Who actually does what under each has
 * lived only in documents, which means an agent writing a requirements
 * package has had no way to know whether the client or ETABLIX will hold the
 * supplier contracts — and "ETABLIX contracts the suppliers" written under an
 * Advisory appointment is not a style error, it is a material misstatement of
 * the commercial arrangement in a document a client issues to the market.
 *
 * Three rows carry the whole commercial argument and are meant to be read
 * together: who holds the contracts, who pays the suppliers, and who makes the
 * release decision.
 */
export const DELIVERY_MODELS = [
  {
    id: "advisory",
    code: "A",
    name: "Advisory",
    holdsSupplierContracts: "client",
    paysSuppliers: "client",
    runsEnquiryAndEvaluation: "client",
    directsMobilisation: "client",
    managesPackageInterfaces: "client",
    offerable: true,
    summary:
      "We write the output specification, package boundaries and tender documents. " +
      "You contract every supplier, run the enquiry and direct delivery.",
  },
  {
    id: "integrator",
    code: "B",
    name: "Management Integrator",
    holdsSupplierContracts: "client",
    paysSuppliers: "client",
    runsEnquiryAndEvaluation: "etablix",
    directsMobilisation: "etablix",
    managesPackageInterfaces: "etablix",
    offerable: true,
    summary:
      "You still hold every supplier contract and pay every supplier. We run the " +
      "enquiry, the evaluation, mobilisation and the interfaces between packages, " +
      "and we never hold your supply-chain money.",
  },
  {
    id: "prime",
    code: "C",
    name: "Prime Service Contractor",
    holdsSupplierContracts: "etablix",
    paysSuppliers: "etablix",
    runsEnquiryAndEvaluation: "etablix",
    directsMobilisation: "etablix",
    managesPackageInterfaces: "etablix",
    /**
     * NOT OFFERABLE TODAY, and this flag is the control rather than a note
     * somebody has to remember. The professional indemnity policy in force
     * insures a consultant — "Consultant — building", "Consultant —
     * procurement" — and does not respond to holding works contracts. The
     * model may be described and planned for internally; it must not be
     * offered, quoted or implied to a prospect or client until cover exists
     * that answers it.
     */
    offerable: false,
    notOfferableBecause:
      "The professional indemnity policy in force insures a consultant and does not " +
      "respond to holding works contracts.",
    summary:
      "We contract with every supplier and deliver the complete site-services scope " +
      "on one contract. Prime for the site-services system only.",
  },
];

export const OFFERABLE_MODELS = DELIVERY_MODELS.filter((m) => m.offerable);
export const deliveryModel = (id) => DELIVERY_MODELS.find((m) => m.id === id) || null;

/**
 * By code, because the commercial side of the platform has always called them
 * A, B and C. `clientflow.js` holds the payment shape of each — deposits,
 * monthly fees, VAT treatment — and this holds the responsibility map. They
 * are the same three models and must not become two sets of facts, so
 * clientflow resolves through here rather than restating any of it.
 */
export const deliveryModelByCode = (code) =>
  DELIVERY_MODELS.find((m) => m.code === String(code || "").trim().toUpperCase()) || null;

/** "Model A — Advisory". One written form, used wherever a model is named. */
export const deliveryModelLabel = (m) => (m ? `Model ${m.code} — ${m.name}` : "");

/**
 * The one input that tells a deliverable which appointment it is written
 * under, offered to every agent that writes contracting language.
 *
 * NOT REQUIRED, DELIBERATELY. A required field with a default silently
 * answers the question, and the default would be Advisory — so a Management
 * Integrator engagement run by somebody in a hurry would produce a package
 * that puts the enquiry back with the client. Left blank it is blank, and
 * `deliveryBrief` below then forbids the agent from stating who contracts at
 * all and makes it an open decision on the face of the document. A visible
 * gap is recoverable; a confident wrong answer is not.
 *
 * Only the offerable models are listed. A requirements package written under
 * Model C would state that ETABLIX holds the supplier contracts, and that is
 * the one thing the policy in force does not answer.
 */
export const DELIVERY_MODEL_FIELD = {
  name: "delivery_model",
  label: "The appointment — which delivery model this engagement is under",
  type: "select",
  options: ["", ...OFFERABLE_MODELS.map((m) => m.id)],
  labels: ["— not recorded —", ...OFFERABLE_MODELS.map(deliveryModelLabel)],
};

const WHO = { client: "the client", etablix: "ETABLIX" };

/**
 * The appointment, written out as facts for an agent to work from.
 *
 * Not a style note. An agent that does not know who will hold the supplier
 * contracts writes a requirements package that names the wrong contracting
 * party, and that document is issued to the market by the client. So the
 * responsibility rows are stated as facts and the invariants are stated as
 * prohibitions, and both travel with every pass.
 */
export function deliveryBrief(id) {
  const m = deliveryModel(id);
  const invariants = DELIVERY_INVARIANTS.map((x) => `- ${x}`).join("\n");
  if (!m) {
    return `THE APPOINTMENT

No delivery model has been recorded for this engagement. So write nothing that
states who holds the supplier contracts, who pays the suppliers, who runs the
enquiry or who directs mobilisation. Where the document needs one of those, name
it as a decision the client must take and leave it open. Guessing it produces a
document that misstates the commercial arrangement and is issued to the market.

TRUE UNDER EVERY MODEL, WITHOUT EXCEPTION
${invariants}`;
  }
  return `THE APPOINTMENT: ${deliveryModelLabel(m)}

${m.summary}

Under this appointment, and these are facts rather than preferences:
- The supplier contracts are held by ${WHO[m.holdsSupplierContracts]}.
- The suppliers are paid by ${WHO[m.paysSuppliers]}.
- The enquiry and the evaluation are run by ${WHO[m.runsEnquiryAndEvaluation]}.
- Mobilisation and site establishment are directed by ${WHO[m.directsMobilisation]}.
- The interfaces between supplier packages are managed by ${WHO[m.managesPackageInterfaces]}.

Write every requirement, obligation and commercial provision consistently with
those five rows. Naming the wrong contracting party is not a style error: it is
a material misstatement of the commercial arrangement, in a document the client
issues to the market.

TRUE UNDER EVERY MODEL, WITHOUT EXCEPTION
${invariants}`;
}

/**
 * True under every model, without exception. These are not preferences and
 * they are not negotiable in a proposal: they are where the duties lawfully
 * sit. A supplier offering to take any of them on is announcing that he does
 * not understand the regime.
 */
export const DELIVERY_INVARIANTS = [
  "The CDM 2015 Principal Contractor and Principal Designer appointments are the client's. ETABLIX holds neither, under any model. Under Model C, \"prime\" means prime for the site-services system only.",
  "The release decision — what may proceed on site, what stays restricted, and what evidence releases it — is the client's.",
  "Operational authority on a live site — isolations, permits, service interruptions, and who may stop work — belongs to the client or the operator.",
  "Under Advisory and Management Integrator, ETABLIX never holds the client's supply-chain money.",
];

/**
 * The supplier types ETABLIX recruits, as suppliers describe
 * themselves. Registrations select up to CAPABILITIES_MAX of these;
 * older records keep their original single-category string.
 */
export const CAPABILITIES = [
  "Temporary civil-works contractors",
  "Temporary MEP contractors",
  "Modular-building suppliers",
  "Temporary-power companies",
  "Security providers",
  "Catering companies",
  "Waste contractors",
  "Cleaning and facilities companies",
  "Logistics providers",
  "Bus and workforce-transport companies",
  "Water and sewage specialists",
  "Camp and accommodation suppliers",
  "Fencing and hoarding contractors",
  "Traffic-management providers",
  "Trackway and ground-protection specialists",
  "Plant and equipment hirers",
  "Site connectivity and telecoms providers",
  "Site medical and first-aid providers",
  "Temporary-works designers",
  "Maintenance and fault-response teams",
  "Environmental and closeout specialists",
];

export const CAPABILITIES_MAX = 5;

export const LEAD_STATUS = ["new", "contacted", "qualified", "won", "lost"];

export const APPLICATION_STATUS = [
  "submitted",
  "under_review",
  // The supplier has been told what is missing and the ball is with them.
  // Deliberately NOT a decision: it is neither prequalified nor declined, and
  // the shortlist filters admit only "prequalified" and "approved", so a
  // registration sitting here cannot reach an enquiry by accident. It leaves
  // this state when a person records an assessment, never on its own.
  "information_requested",
  "prequalified",
  "approved",
  "declined",
  "restricted",
];

export const PROJECT_STATUS = [
  "preconstruction",
  "mobilization",
  "in_progress",
  "closeout",
  "completed",
];

export const INSPECTION_STATUS = ["scheduled", "in_progress", "passed", "failed"];

export const NCR_SEVERITY = ["minor", "major", "critical"];
