/**
 * ETABLIX shared constants — used by both the backend (Node) and the
 * frontend (browser ESM). Keep this file dependency-free.
 */

export const COMPANY = {
  name: "ETABLIX",
  group: "A Groupe Nseya company",
  strapline: "Integrated Site Services",
  tagline: "One site. One accountable operating system.",
  email: "contact@etabiix.com",
  phone: "+44 7493 216101",
  address: "Groupe Nseya House, Kingstanding, Birmingham, B44 8DJ",
  location: "Birmingham, United Kingdom",
  territories: "Serving UK, Ireland, Europe and selected international programmes",
};

export const ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  SITE_ENGINEER: "site_engineer",
  QA_INSPECTOR: "qa_inspector",
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
  "Integrated Site Services Contractor",
  "CONSTRUX demonstration",
  "VERYX demonstration",
];

/** Specialist supply-chain capability categories. */
export const CAPABILITIES = [
  "Temporary & enabling civil works",
  "Temporary MEP & building services",
  "Cleaning & soft FM",
  "Modular & accommodation",
  "Security & access",
  "Logistics & transport",
  "Catering & living services",
  "Environmental & closeout",
];

export const LEAD_STATUS = ["new", "contacted", "qualified", "won", "lost"];

export const APPLICATION_STATUS = [
  "submitted",
  "under_review",
  "prequalified",
  "approved",
  "declined",
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
