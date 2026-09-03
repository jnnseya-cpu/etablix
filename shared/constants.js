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
 * Specialist supply-chain capability categories, ordered by site
 * lifecycle (design → establish → utilities → operate → closeout).
 * The first eight original labels are preserved verbatim — existing
 * supplier registrations keep their category without migration.
 */
export const CAPABILITIES = [
  // Design & planning
  "Design, survey & temporary works engineering",
  // Establish the site
  "Temporary & enabling civil works",
  "Ground protection, trackway & wheel-wash",
  "Fencing, hoarding & signage",
  "Traffic management",
  // Utilities & connectivity
  "Temporary power, generators & fuel",
  "Temporary MEP & building services",
  "Water, wastewater & sanitation",
  "IT, telecoms & connectivity",
  // Buildings & equipment
  "Modular & accommodation",
  "Plant, equipment & furniture hire",
  // Operate the site
  "Security & access",
  "Catering & living services",
  "Cleaning & soft FM",
  "Waste management & recycling",
  "Medical & first-aid services",
  "Logistics & transport",
  "Maintenance & fault response",
  // Closeout
  "Environmental & closeout",
];

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
