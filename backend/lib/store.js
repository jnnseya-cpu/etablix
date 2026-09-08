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
// Overridable so the kill test and the backup verifier can run against a
// scratch directory instead of the live store.
const DATA_DIR = process.env.ETABLIX_DATA_DIR
  ? path.resolve(process.env.ETABLIX_DATA_DIR)
  : path.join(__dirname, "..", "data");
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

  const data = {
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
        capabilities: ["Modular-building suppliers", "Camp and accommodation suppliers"],
        capability: "Modular-building suppliers; Camp and accommodation suppliers",
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
  if (!isDemoMode) {
    // Production: real employees only, no demo business records. The agent
    // catalogue is reference data and stays; everything else starts empty.
    for (const k of [
      "leads", "subcontractors", "projects", "schedule", "budget", "rfis",
      "inspections", "ncrs", "risks", "agentRuns", "apiKeys", "sensors",
    ]) {
      data[k] = [];
    }
  }
  return data;
}

let db = null;

const TMP_FILE = DB_FILE + ".tmp";
const PREV_FILE = DB_FILE + ".prev";

/**
 * Read the store, recovering rather than refusing to start.
 *
 * The old version did `JSON.parse(readFileSync(...))` and nothing else. A
 * write interrupted halfway — which is what a container being stopped does —
 * left a truncated file, and the server then died on boot with
 * "SyntaxError: Unterminated string in JSON". The site was down and every
 * record unreadable, with no way back.
 *
 * Now: the current file, then the previous good copy, then a dated rescue of
 * whatever was unreadable so nothing is thrown away silently. Only if all of
 * that fails does it seed a new store, and it says so loudly.
 */
function readStore() {
  const attempts = [
    [DB_FILE, "the store"],
    [PREV_FILE, "the previous good copy"],
  ];
  for (const [file, label] of attempts) {
    if (!fs.existsSync(file)) continue;
    try {
      const raw = fs.readFileSync(file, "utf8");
      if (!raw.trim()) throw new Error("file is empty");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") throw new Error("not an object");
      if (file !== DB_FILE) {
        console.warn(`[store] RECOVERED FROM ${label}. The main store was unreadable and has been kept for inspection.`);
        fs.copyFileSync(file, DB_FILE);
      }
      return parsed;
    } catch (err) {
      const rescue = `${DB_FILE}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      try { fs.copyFileSync(file, rescue); } catch {}
      console.error(`[store] ${label} is unreadable (${err.message}). Kept as ${path.basename(rescue)}.`);
    }
  }
  return null;
}

export function load() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const found = readStore();
  if (found) {
    db = found;
  } else {
    if (fs.existsSync(DB_FILE)) {
      console.error("[store] NO READABLE STORE. Seeding a new one. The unreadable files are kept beside it — do not overwrite them, and restore from backup.");
    }
    db = seed();
    persist();
  }
  return db;
}

/**
 * Write the store so that an interrupted write cannot destroy it.
 *
 *   1. serialise first — a serialisation error must not touch the file
 *   2. write the whole thing to a temporary file and fsync it, so the bytes
 *      are on the disk and not sitting in a buffer
 *   3. keep the current file as the previous good copy
 *   4. rename the temporary file over the real one — rename is atomic on the
 *      same filesystem, so a reader sees the old file or the new one, never
 *      half of either
 *
 * A kill at any point in that sequence leaves a complete file behind.
 */
let writing = false;
let pendingWrite = false;

export function persist() {
  // Re-entrancy guard. persist() is called from inside collection(), which is
  // called from everywhere; without this a nested call could interleave with
  // the rename and write a stale snapshot over a newer one.
  if (writing) { pendingWrite = true; return; }
  writing = true;
  try {
    do {
      pendingWrite = false;
      const json = JSON.stringify(db, null, 2);        // 1
      const fd = fs.openSync(TMP_FILE, "w");           // 2
      try {
        fs.writeFileSync(fd, json);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      if (fs.existsSync(DB_FILE)) {                    // 3
        try { fs.copyFileSync(DB_FILE, PREV_FILE); } catch {}
      }
      fs.renameSync(TMP_FILE, DB_FILE);                // 4
    } while (pendingWrite);
  } finally {
    writing = false;
  }
}

/** Flush anything held and report whether the store is readable. Used by the
 *  shutdown sequence and by the backup verifier. */
export function flush() {
  if (!db) return { ok: true, wrote: false };
  try {
    persist();
    JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return { ok: true, wrote: true };
  } catch (err) {
    return { ok: false, wrote: true, error: err.message };
  }
}

/** Row counts, for the backup verifier and the health endpoint. */
export function counts() {
  const data = load();
  return Object.fromEntries(Object.entries(data)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => [k, v.length]));
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

/**
 * Append-only collections that must not grow for ever.
 *
 * The whole store is rewritten on every change, so an unbounded collection
 * makes every future write slower and every future interruption more
 * dangerous. Caps are applied here, in one place, rather than in the routes
 * where they were being forgotten — notifications had no cap at all.
 */
const CAPS = {
  notifications: 500,
  deliveries: 500,
  agentTasks: 300,
  automationRuns: 200,
  traffic: 2000,
  portfolioSnapshots: 400,
};

export function insert(name, record) {
  const row = { id: id(), createdAt: Date.now(), ...record };
  const rows = collection(name);
  rows.push(row);
  const cap = CAPS[name];
  if (cap && rows.length > cap) rows.splice(0, rows.length - cap);
  persist();
  return row;
}

/** Trim every capped collection — run at boot, so an old oversized store
 *  is brought back inside its limits without waiting for the next insert. */
export function trimCapped() {
  let removed = 0;
  for (const [name, cap] of Object.entries(CAPS)) {
    const rows = collection(name);
    if (rows.length > cap) { removed += rows.length - cap; rows.splice(0, rows.length - cap); }
  }
  if (removed) persist();
  return removed;
}

export function update(name, rowId, patch) {
  const row = collection(name).find((r) => r.id === rowId);
  if (!row) return null;
  Object.assign(row, patch);
  persist();
  return row;
}

export function remove(name, rowId) {
  const rows = collection(name);
  const idx = rows.findIndex((r) => r.id === rowId);
  if (idx === -1) return null;
  const [row] = rows.splice(idx, 1);
  persist();
  return row;
}
