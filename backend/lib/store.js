/**
 * Lightweight JSON-file data store. On first boot the store is created
 * from seed data (demo employees, Construx projects, Veryx inspections).
 * Swap this module for a real database (Postgres, etc.) without touching
 * the route layer — routes only use the exported helpers.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { hashPassword } from "./auth.js";
import { ROLES } from "../../shared/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export function id() {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * Production mode: set ETABLIX_ADMIN_EMAIL and ETABLIX_ADMIN_PASSWORD and
 * the store seeds ONLY that administrator — no demo accounts. Without
 * them (local development), the three demo accounts are seeded.
 */
export const isDemoMode = !(
  process.env.ETABLIX_ADMIN_EMAIL && process.env.ETABLIX_ADMIN_PASSWORD
);

function seedUsers() {
  if (!isDemoMode) {
    return [
      {
        id: id(),
        name: process.env.ETABLIX_ADMIN_NAME || "ETABLIX Administrator",
        email: process.env.ETABLIX_ADMIN_EMAIL.toLowerCase(),
        role: ROLES.ADMIN,
        password: hashPassword(process.env.ETABLIX_ADMIN_PASSWORD),
      },
    ];
  }
  return [
    {
      id: id(),
      name: "Alex Morgan",
      email: "admin@etablix.com",
      role: ROLES.ADMIN,
      password: hashPassword("etablix-admin-2026"),
    },
    {
      id: id(),
      name: "Dana Okafor",
      email: "pm@etablix.com",
      role: ROLES.PROJECT_MANAGER,
      password: hashPassword("etablix-pm-2026"),
    },
    {
      id: id(),
      name: "Sam Reyes",
      email: "qa@etablix.com",
      role: ROLES.QA_INSPECTOR,
      password: hashPassword("etablix-qa-2026"),
    },
  ];
}

function seed() {
  const now = Date.now();
  const day = 86400000;
  const projects = [
    {
      id: id(),
      code: "ETX-2401",
      name: "400kV Substation — Site Establishment & Welfare",
      client: "Confidential grid client",
      sector: "Grid / power",
      status: "in_progress",
      value: 4250000,
      progress: 63,
      startDate: "2026-01-12",
      endDate: "2027-03-30",
      manager: "Dana Okafor",
    },
    {
      id: id(),
      code: "ETX-2408",
      name: "Offshore Wind Marshalling Port — Workforce Village",
      client: "Confidential energy client",
      sector: "Renewable energy",
      status: "in_progress",
      value: 6800000,
      progress: 38,
      startDate: "2026-03-02",
      endDate: "2027-11-15",
      manager: "Marcus Feld",
    },
    {
      id: id(),
      code: "ETX-2412",
      name: "Data Centre Campus — Integrated Site Services",
      client: "Confidential developer",
      sector: "Data centre",
      status: "mobilization",
      value: 3120000,
      progress: 8,
      startDate: "2026-07-20",
      endDate: "2028-01-10",
      manager: "Dana Okafor",
    },
    {
      id: id(),
      code: "ETX-2397",
      name: "Rail Depot Enabling Works — Demobilisation",
      client: "Confidential rail client",
      sector: "Rail / major civils",
      status: "closeout",
      value: 1840000,
      progress: 97,
      startDate: "2025-05-01",
      endDate: "2026-09-30",
      manager: "Priya Raman",
    },
  ];

  const p = (i) => projects[i].id;

  return {
    users: seedUsers(),
    leads: [
      {
        id: id(),
        name: "Jordan Ellis",
        company: "Northshore EPC Ltd",
        email: "j.ellis@example.com",
        phone: "+44 7700 900123",
        service: "Management Integrator",
        sector: "Grid / power",
        location: "North East England",
        startDate: "2027-01-11",
        brief:
          "Two-year substation programme with a 300-person peak workforce. We need one accountable partner for welfare, temporary utilities, security and village operations.",
        status: "new",
        createdAt: now - 2 * day,
      },
    ],
    subcontractors: [
      {
        id: id(),
        legalName: "Fenline Modular Solutions Ltd",
        tradingName: "Fenline Modular",
        contact: "Maria Kovac",
        email: "bids@example.com",
        phone: "+44 7700 900456",
        regNumber: "09876543",
        capability: "Modular & accommodation",
        territories: "UK & Ireland",
        largestContract: "£2.4M",
        mobilisation: "4-6 weeks",
        statement:
          "15 years supplying and operating modular offices, welfare blocks and worker accommodation for infrastructure programmes. In-house transport and installation crews; CHAS and ISO 9001 accredited.",
        confirmed: true,
        status: "under_review",
        createdAt: now - 5 * day,
      },
    ],
    projects,
    schedule: [
      { id: id(), projectId: p(0), activity: "Compound hardstanding & cabin bases", phase: "Set-up", start: "2026-08-10", end: "2026-09-22", progress: 72, critical: true },
      { id: id(), projectId: p(0), activity: "Temporary power & site lighting energisation", phase: "Utilities", start: "2026-09-01", end: "2026-10-18", progress: 25, critical: true },
      { id: id(), projectId: p(0), activity: "Welfare village fit-out & handover", phase: "Operate", start: "2026-10-05", end: "2026-11-12", progress: 0, critical: false },
      { id: id(), projectId: p(1), activity: "Accommodation blocks — phases 1-3 install", phase: "Mobilise", start: "2026-07-15", end: "2026-10-30", progress: 41, critical: true },
      { id: id(), projectId: p(1), activity: "Catering & laundry facility commissioning", phase: "Operate", start: "2026-08-20", end: "2026-11-05", progress: 18, critical: false },
    ],
    budget: [
      { id: id(), projectId: p(0), category: "Enabling civils & hardstanding", budgeted: 680000, committed: 642000, spent: 551000 },
      { id: id(), projectId: p(0), category: "Temporary power & utilities", budgeted: 520000, committed: 505000, spent: 398000 },
      { id: id(), projectId: p(0), category: "Welfare & modular hire", budgeted: 410000, committed: 389000, spent: 124000 },
      { id: id(), projectId: p(1), category: "Accommodation village", budgeted: 740000, committed: 715000, spent: 690000 },
      { id: id(), projectId: p(1), category: "Catering & living services", budgeted: 980000, committed: 876000, spent: 211000 },
    ],
    rfis: [
      { id: id(), projectId: p(0), number: "RFI-041", subject: "Confirm temporary drainage tie-in point for compound B", status: "open", priority: "high", raisedBy: "Fenline Modular", createdAt: now - 3 * day },
      { id: id(), projectId: p(1), number: "RFI-102", subject: "Generator capacity vs. peak village load — winter profile", status: "answered", priority: "high", raisedBy: "Temporary MEP supplier", createdAt: now - 9 * day },
      { id: id(), projectId: p(1), number: "RFI-108", subject: "Access control interface with client turnstile system", status: "open", priority: "medium", raisedBy: "Site team", createdAt: now - 1 * day },
    ],
    inspections: [
      { id: id(), projectId: p(0), ref: "INS-2210", type: "Welfare compound readiness — pre-occupation check", inspector: "Sam Reyes", status: "passed", score: 96, date: "2026-08-24", items: 42, failures: 0 },
      { id: id(), projectId: p(0), ref: "INS-2216", type: "Temporary electrical installation — NICEIC verification", inspector: "Sam Reyes", status: "scheduled", score: null, date: "2026-09-04", items: 28, failures: 0 },
      { id: id(), projectId: p(1), ref: "INS-2201", type: "Accommodation block fire systems — commissioning", inspector: "T. Nakamura", status: "failed", score: 71, date: "2026-08-19", items: 55, failures: 4 },
      { id: id(), projectId: p(1), ref: "INS-2219", type: "Kitchen hygiene & food safety — pre-opening audit", inspector: "Sam Reyes", status: "in_progress", score: null, date: "2026-08-30", items: 60, failures: 1 },
    ],
    ncrs: [
      { id: id(), projectId: p(1), ref: "NCR-017", title: "Fire door closers missing on accommodation block C (4 locations)", severity: "major", status: "open", assignedTo: "Fenline Modular", createdAt: now - 11 * day },
      { id: id(), projectId: p(0), ref: "NCR-009", title: "Compound drainage falls outside tolerance — bay 2", severity: "minor", status: "closed", assignedTo: "Enabling civils supplier", createdAt: now - 30 * day },
    ],
    risks: [
      { id: id(), projectId: p(1), ref: "RSK-004", title: "Accommodation module delivery slip — 14-week lead time at risk", category: "procurement", probability: 4, impact: 5, score: 20, status: "open", mitigation: "Early order placed; weekly supplier expediting calls; phased occupation fallback sequenced.", owner: "Marcus Feld" },
      { id: id(), projectId: p(0), ref: "RSK-011", title: "Winter working — compound civils and temporary drainage", category: "schedule", probability: 3, impact: 4, score: 12, status: "open", mitigation: "Weather contingency in programme; ground protection and pumping plan approved.", owner: "Dana Okafor" },
      { id: id(), projectId: p(2), ref: "RSK-002", title: "Grid connection for temporary power pending DNO approval", category: "utilities", probability: 2, impact: 5, score: 10, status: "open", mitigation: "Pre-application meeting held; generator hire fallback priced and reserved.", owner: "Dana Okafor" },
      { id: id(), projectId: p(0), ref: "RSK-007", title: "Modular hire rate escalation beyond contingency", category: "cost", probability: 2, impact: 3, score: 6, status: "mitigated", mitigation: "Full hire package secured at fixed rates for the programme duration.", owner: "Priya Raman" },
    ],
    agents: [
      { type: "schedule-health", name: "Schedule Health Scan", description: "Analyzes CPM float burn, lookahead reliability and critical-path drift; returns a ranked list of activities that threaten the end date.", acuCost: 12 },
      { type: "risk-triage", name: "Risk Triage", description: "Re-scores the risk register from live project signals (RFIs, schedule variance, weather) and drafts mitigations for new exposures.", acuCost: 8 },
      { type: "daily-digest", name: "Daily Site Digest", description: "Compiles daily logs, manpower, inspections and sensor alerts across the portfolio into one executive briefing.", acuCost: 4 },
      { type: "bid-leveler", name: "Bid Leveler", description: "Normalizes subcontractor bids against scope checklists and flags gaps, exclusions and outlier pricing.", acuCost: 15 },
    ],
    agentRuns: [],
    apiKeys: [
      {
        id: id(),
        key: "vx_test_demo_2f8a1c9e77b34d5f",
        workspace: "ETABLIX Demo Workspace",
        env: "test",
        scopes: ["read:projects", "read:tasks", "read:risks", "read:agents", "run:agents", "read:usage"],
        monthlyQuota: 5000,
        used: 0,
        acuBalance: 250,
        createdAt: now - 20 * day,
      },
    ],
    sensors: [
      { id: id(), projectId: p(0), sensor: "PWR-04", kind: "generator_load", location: "Compound A generator", value: 68.4, unit: "%", threshold: 85, status: "ok", readAt: now - 3600000 },
      { id: id(), projectId: p(0), sensor: "ENV-01", kind: "dust_pm10", location: "Site boundary north", value: 38, unit: "µg/m³", threshold: 50, status: "ok", readAt: now - 900000 },
      { id: id(), projectId: p(1), sensor: "WTR-02", kind: "water_storage", location: "Village potable tank", value: 61, unit: "%", threshold: 30, status: "ok", readAt: now - 600000 },
      { id: id(), projectId: p(1), sensor: "ENV-03", kind: "noise", location: "Village east boundary", value: 82, unit: "dB", threshold: 80, status: "alert", readAt: now - 1200000 },
    ],
  };
}

let db = null;

export function load() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } else {
    db = seed();
    persist();
  }
  return db;
}

export function persist() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/**
 * Key-value settings (e.g. platform integration credentials). Created
 * lazily so existing databases pick it up without migration.
 */
export function getSettings() {
  const data = load();
  if (!data.settings || typeof data.settings !== "object") {
    data.settings = {};
    persist();
  }
  return data.settings;
}

export function saveSettings(patch) {
  const settings = getSettings();
  Object.assign(settings, patch);
  persist();
  return settings;
}

export function collection(name) {
  const data = load();
  if (!Array.isArray(data[name])) {
    // Collections added after a database was first seeded (e.g.
    // notifications, deliveries) are created lazily — no migration needed.
    data[name] = [];
    persist();
  }
  return data[name];
}

export function insert(name, record) {
  const row = { id: id(), createdAt: Date.now(), ...record };
  collection(name).push(row);
  persist();
  return row;
}

export function update(name, rowId, patch) {
  const row = collection(name).find((r) => r.id === rowId);
  if (!row) return null;
  Object.assign(row, patch);
  persist();
  return row;
}
