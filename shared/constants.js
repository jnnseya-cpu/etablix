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
];

export const CAPABILITIES_MAX = 5;

export const LEAD_STATUS = ["new", "contacted", "qualified", "won", "lost"];

export const APPLICATION_STATUS = [
  "submitted",
  "under_review",
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
