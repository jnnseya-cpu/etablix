/**
 * ETABLIX shared constants — used by both the backend (Node) and the
 * frontend (browser ESM). Keep this file dependency-free.
 */

export const COMPANY = {
  name: "ETABLIX",
  tagline: "Build with certainty.",
  email: "hello@etablix.com",
  phone: "+1 (555) 010-4820",
  address: "4820 Ironworks Avenue, Suite 300",
};

export const ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  SITE_ENGINEER: "site_engineer",
  QA_INSPECTOR: "qa_inspector",
};

export const SECTORS = [
  "Commercial & Office",
  "Industrial & Logistics",
  "Healthcare & Life Sciences",
  "Education & Institutional",
  "Multi-Unit Residential",
  "Retail & Hospitality",
  "Public Sector & Infrastructure",
  "Energy & Utilities",
];

export const TRADES = [
  "Concrete & Formwork",
  "Structural Steel & Metalwork",
  "Earthworks & Excavation",
  "Electrical",
  "Mechanical & HVAC",
  "Plumbing & Fire Protection",
  "Roofing & Waterproofing",
  "Facades, Glazing & Cladding",
  "Drywall & Interior Finishes",
  "Flooring & Tiling",
  "Painting & Coatings",
  "Landscaping & Sitework",
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
