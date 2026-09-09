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
import { hashPasswordSync } from "./auth.js";
import { ROLES } from "../../shared/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Overridable so the kill test and the backup verifier can run against a
// scratch directory instead of the live store.
const DATA_DIR = process.env.ETABLIX_DATA_DIR
  ? path.resolve(process.env.ETABLIX_DATA_DIR)
  : path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

/** Where the big, per-run payloads live. See lib/runstore.js. */
export const dataDir = () => DATA_DIR;

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
        password: hashPasswordSync(process.env.ETABLIX_ADMIN_PASSWORD),
      },
    ];
  }
  return [
    {
      id: id(),
      name: "Alex Morgan",
      email: "admin@etablix.com",
      role: ROLES.ADMIN,
      password: hashPasswordSync("etablix-admin-2026"),
    },
    {
      id: id(),
      name: "Dana Okafor",
      email: "pm@etablix.com",
      role: ROLES.PROJECT_MANAGER,
      password: hashPasswordSync("etablix-pm-2026"),
    },
    {
      id: id(),
      name: "Sam Reyes",
      email: "qa@etablix.com",
      role: ROLES.QA_INSPECTOR,
      password: hashPasswordSync("etablix-qa-2026"),
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

// ============================================================ persistence
//
// One file, rewritten in full on every change, was the shape of this store
// for its whole life. It was made atomic and recoverable — a kill mid-write
// could no longer destroy it — but atomicity is not integrity. Nothing
// prevented a lost update between two handlers that both read an array and
// both wrote it back, nothing enforced a shape, nothing could prove what the
// store held on a given date, and every write rewrote every record.
//
// It is SQLite now: one file still, but a transactional one. Every write is
// a transaction that either happens or does not. Every row is written on its
// own rather than by rewriting the world. Schema changes are numbered
// migrations rather than hopeful "if (!data.x) data.x = []". And an
// append-only ledger records the money events and the deletions, so "what
// did it say on the fourteenth" has an answer that is not "whatever the file
// says now".
//
// SQLite rather than PostgreSQL, deliberately. Everything the finding
// actually asked for — transactions, constraints, migrations, no
// half-written record, no lost update, a provable history — SQLite gives on
// one box with nothing to host, nothing to pay for and no new dependency:
// node:sqlite is in the standard library. PostgreSQL earns its keep when
// more than one process writes at once, and that day is a hosting decision
// rather than a correctness one. The API below does not change either way,
// which is what makes that day cheap.
//
// The in-memory mirror stays, because every route reads through
// collection(name) and expects a plain array it can filter and map. Reads
// are served from it; writes go to SQLite first and the mirror second.

import { DatabaseSync } from "node:sqlite";

const SQLITE_FILE = path.join(DATA_DIR, "db.sqlite");
const LEGACY_JSON = DB_FILE;

let sql = null;          // the database handle
let db = null;           // the in-memory mirror: { users: [...], settings: {...} }
let seqCounter = 0;      // insertion order, so a collection keeps the order it had

/** Every schema change, in order. The version lives in the database. */
const MIGRATIONS = [
  // 1 — the document store, the settings and the append-only ledger.
  (d) => {
    d.exec(`
      CREATE TABLE IF NOT EXISTS rows (
        collection TEXT    NOT NULL,
        id         TEXT    NOT NULL,
        seq        INTEGER NOT NULL,
        doc        TEXT    NOT NULL,
        updatedAt  INTEGER NOT NULL,
        PRIMARY KEY (collection, id)
      );
      CREATE INDEX IF NOT EXISTS rows_order ON rows (collection, seq);
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ledger (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        at     INTEGER NOT NULL,
        kind   TEXT    NOT NULL,
        ref    TEXT,
        actor  TEXT,
        detail TEXT    NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ledger_at ON ledger (at);
    `);
  },
];

function migrate(d) {
  d.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const row = d.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get();
  const version = row ? Number(row.value) : 0;
  for (let i = version; i < MIGRATIONS.length; i += 1) {
    d.exec("BEGIN");
    try {
      MIGRATIONS[i](d);
      d.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .run(String(i + 1));
      d.exec("COMMIT");
      console.log(`[store] applied migration ${i + 1}`);
    } catch (err) {
      d.exec("ROLLBACK");
      throw new Error(`migration ${i + 1} failed: ${err.message}`);
    }
  }
}

function open() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  sql = new DatabaseSync(SQLITE_FILE);
  // WAL so a reader never blocks a writer; FULL because this store holds
  // invoices, and losing the last transaction to a power cut is not a trade
  // worth making for a business of this size.
  sql.exec("PRAGMA journal_mode = WAL");
  sql.exec("PRAGMA synchronous = FULL");
  sql.exec("PRAGMA foreign_keys = ON");
  sql.exec("PRAGMA busy_timeout = 5000");
  migrate(sql);
}

/** Run a function inside a transaction. A nested call joins the outer one. */
let depth = 0;
function tx(fn) {
  if (depth > 0) return fn();
  sql.exec("BEGIN IMMEDIATE");
  depth += 1;
  try {
    const out = fn();
    sql.exec("COMMIT");
    return out;
  } catch (err) {
    try { sql.exec("ROLLBACK"); } catch {}
    throw err;
  } finally {
    depth -= 1;
  }
}

// ------------------------------------------------------------- the mirror

function readMirror() {
  const out = { settings: {} };
  for (const r of sql.prepare("SELECT collection, doc FROM rows ORDER BY collection, seq").all()) {
    (out[r.collection] ||= []).push(JSON.parse(r.doc));
  }
  for (const r of sql.prepare("SELECT key, value FROM settings").all()) {
    try { out.settings[r.key] = JSON.parse(r.value); } catch { out.settings[r.key] = r.value; }
  }
  const max = sql.prepare("SELECT MAX(seq) AS m FROM rows").get();
  seqCounter = Number(max?.m || 0);
  return out;
}

const writeRow = (name, row, seq) =>
  sql.prepare(`INSERT INTO rows (collection, id, seq, doc, updatedAt) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(collection, id) DO UPDATE SET doc = excluded.doc, updatedAt = excluded.updatedAt`)
     .run(name, String(row.id), seq, JSON.stringify(row), Date.now());

const deleteRow = (name, rowId) =>
  sql.prepare("DELETE FROM rows WHERE collection = ? AND id = ?").run(name, String(rowId));

const readRow = (name, rowId) => {
  const r = sql.prepare("SELECT doc FROM rows WHERE collection = ? AND id = ?").get(name, String(rowId));
  return r ? JSON.parse(r.doc) : null;
};

const rowSeq = (name, rowId) => {
  const r = sql.prepare("SELECT seq FROM rows WHERE collection = ? AND id = ?").get(name, String(rowId));
  return r ? Number(r.seq) : (seqCounter += 1);
};

// ------------------------------------------------------ import and rescue

/**
 * The one-way move from the JSON file.
 *
 * The JSON is read, written into the database in ONE transaction, and then
 * kept — renamed, never deleted, because a migration that throws away the
 * only copy of the thing it is migrating is not a migration, it is a bet.
 */
function importFromJson() {
  const found = readStore();
  if (!found) return false;
  const collections = Object.entries(found).filter(([, v]) => Array.isArray(v));
  const settings = found.settings && typeof found.settings === "object" ? found.settings : {};
  tx(() => {
    let seq = 0;
    for (const [name, rows] of collections) {
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        if (!row.id) row.id = id();
        writeRow(name, row, (seq += 1));
      }
    }
    for (const [k, v] of Object.entries(settings)) {
      sql.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
         .run(k, JSON.stringify(v));
    }
    seqCounter = seq;
    recordLedger("store.migrated", null, "system",
      `${collections.length} collections, ${collections.reduce((a, [, v]) => a + v.length, 0)} rows imported from db.json`);
  });
  const kept = `${LEGACY_JSON}.migrated-${new Date().toISOString().slice(0, 10)}`;
  try { fs.renameSync(LEGACY_JSON, kept); } catch {}
  console.log(`[store] migrated ${collections.length} collections from db.json into SQLite. The JSON is kept as ${path.basename(kept)}.`);
  return true;
}

export function load() {
  if (db) return db;
  if (!sql) open();
  const any = sql.prepare("SELECT COUNT(*) AS n FROM rows").get();
  if (!Number(any?.n)) {
    if (fs.existsSync(LEGACY_JSON)) {
      importFromJson();
    } else {
      const seeded = seed();
      tx(() => {
        let seq = 0;
        for (const [name, rows] of Object.entries(seeded)) {
          if (!Array.isArray(rows)) continue;
          for (const row of rows) writeRow(name, row, (seq += 1));
        }
        seqCounter = seq;
        recordLedger("store.seeded", null, "system", "a new store was seeded");
      });
      console.log("[store] seeded a new database");
    }
  }
  db = readMirror();
  return db;
}

// --------------------------------------------------------------- the API
//
// Everything below keeps the signature it had when this was a JSON file, so
// no route had to change. What changed is underneath: a write is a
// transaction, and it writes one row rather than the world.

/**
 * Reconcile the whole mirror into the database, in one transaction.
 *
 * Kept because handlers exist that mutate a row or splice an array in place
 * and then call persist(), which is exactly what this used to mean. It is
 * O(rows) and rare; the ordinary write paths below touch one row.
 */
export function persist() {
  if (!db) return;
  tx(() => {
    const present = new Set();
    let seq = 0;
    for (const [name, rows] of Object.entries(db)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        if (!row.id) row.id = id();
        present.add(`${name} ${row.id}`);
        writeRow(name, row, (seq += 1));
      }
    }
    seqCounter = seq;
    for (const r of sql.prepare("SELECT collection, id FROM rows").all()) {
      if (!present.has(`${r.collection} ${r.id}`)) deleteRow(r.collection, r.id);
    }
    for (const [k, v] of Object.entries(db.settings || {})) {
      sql.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
         .run(k, JSON.stringify(v));
    }
  });
}

/** Flush anything held and report whether the store is readable. */
export function flush() {
  if (!db) return { ok: true, wrote: false };
  try {
    persist();
    sql.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    sql.prepare("SELECT COUNT(*) AS n FROM rows").get();
    return { ok: true, wrote: true };
  } catch (err) {
    return { ok: false, wrote: true, error: err.message };
  }
}

/** Close the database cleanly. Called by the shutdown sequence. */
export function close() {
  try { sql?.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } catch {}
  try { sql?.close(); } catch {}
  sql = null;
  db = null;
}

/** Row counts, for the backup verifier and the health endpoint. */
export function counts() {
  const data = load();
  return Object.fromEntries(Object.entries(data)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => [k, v.length]));
}

export function getSettings() {
  const data = load();
  if (!data.settings || typeof data.settings !== "object") data.settings = {};
  return data.settings;
}

export function saveSettings(patch) {
  const settings = getSettings();
  Object.assign(settings, patch);
  tx(() => {
    for (const [k, v] of Object.entries(patch)) {
      sql.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
         .run(k, JSON.stringify(v));
    }
  });
  return settings;
}

export function collection(name) {
  const data = load();
  if (!Array.isArray(data[name])) data[name] = [];
  return data[name];
}

/** Append-only collections that must not grow for ever. */
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
  tx(() => {
    writeRow(name, row, (seqCounter += 1));
    rows.push(row);
    const cap = CAPS[name];
    if (cap && rows.length > cap) {
      for (const gone of rows.splice(0, rows.length - cap)) deleteRow(name, gone.id);
    }
  });
  return row;
}

/** Trim every capped collection — run at boot, so an old oversized store is
 *  brought back inside its limits without waiting for the next insert. */
export function trimCapped() {
  let removed = 0;
  tx(() => {
    for (const [name, cap] of Object.entries(CAPS)) {
      const rows = collection(name);
      if (rows.length <= cap) continue;
      const gone = rows.splice(0, rows.length - cap);
      for (const row of gone) deleteRow(name, row.id);
      removed += gone.length;
    }
  });
  return removed;
}

export function update(name, rowId, patch) {
  const row = collection(name).find((r) => r.id === rowId);
  if (!row) return null;
  Object.assign(row, patch);
  tx(() => writeRow(name, row, rowSeq(name, rowId)));
  return row;
}

export function remove(name, rowId) {
  const rows = collection(name);
  const idx = rows.findIndex((r) => r.id === rowId);
  if (idx === -1) return null;
  const [row] = rows.splice(idx, 1);
  tx(() => deleteRow(name, rowId));
  return row;
}

/**
 * Change one row from its CURRENT state, inside a transaction.
 *
 * This is the fix for the fault route code kept walking into: read a row,
 * await something, then write back a whole array built from the copy read
 * before the await. Anything that changed in between is silently discarded —
 * six concurrent uploads survived only because those handlers happened to be
 * synchronous, and one added await anywhere would have lost them.
 *
 *   mutate("clientEngagements", id, (current) => ({ checklist: [...] }))
 *
 * The function receives the row AS IT IS NOW, at write time, and returns a
 * patch. It runs inside the transaction and cannot be interleaved with
 * anything, because there is no await inside it to interleave at.
 */
export function mutate(name, rowId, fn) {
  const rows = collection(name);
  const live = rows.find((r) => r.id === rowId);
  if (!live) return null;
  return tx(() => {
    const current = readRow(name, rowId) || live;
    const patch = fn(current) || {};
    const next = { ...current, ...patch };
    writeRow(name, next, rowSeq(name, rowId));
    // Keep the mirror object's identity, so anything already holding a
    // reference to it sees the new state.
    for (const k of Object.keys(live)) if (!(k in next)) delete live[k];
    Object.assign(live, next);
    return live;
  });
}

/**
 * Append to an array field on one row without reading it first.
 *
 * The safe form of update(id, { events: [...e.events, entry] }), which is
 * the exact shape that loses the other handler's entry.
 */
export function append(name, rowId, field, item, { cap = 0 } = {}) {
  return mutate(name, rowId, (current) => {
    const list = Array.isArray(current[field]) ? [...current[field], item] : [item];
    return { [field]: cap && list.length > cap ? list.slice(list.length - cap) : list };
  });
}

// ------------------------------------------------------------- the ledger
//
// Append-only, never updated, never deleted by the application. It exists so
// that "what did this say on the fourteenth" has an answer: the money events
// and the deletions are written here as they happen, and nothing in the
// routes can rewrite them.

export function recordLedger(kind, ref, actor, detail) {
  try {
    sql.prepare("INSERT INTO ledger (at, kind, ref, actor, detail) VALUES (?, ?, ?, ?, ?)")
       .run(Date.now(), String(kind), ref ? String(ref) : null, actor ? String(actor) : null, String(detail).slice(0, 2000));
  } catch {}
}

export function ledger({ kind = null, since = 0, limit = 500 } = {}) {
  load();
  const rows = kind
    ? sql.prepare("SELECT * FROM ledger WHERE kind = ? AND at >= ? ORDER BY at DESC, id DESC LIMIT ?")
         .all(String(kind), Number(since), Number(limit))
    : sql.prepare("SELECT * FROM ledger WHERE at >= ? ORDER BY at DESC, id DESC LIMIT ?")
         .all(Number(since), Number(limit));
  return rows.map((r) => ({ ...r }));
}

/**
 * A consistent copy of the whole database, taken while it is running.
 *
 * Copying the file underneath a live SQLite database gives a torn copy;
 * VACUUM INTO gives a whole one, checkpointed and compacted, with nothing
 * stopped.
 */
export function backupTo(file) {
  load();
  const target = path.resolve(file);
  try { fs.unlinkSync(target); } catch {}
  sql.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  return target;
}

/** The whole store as plain JSON — for the backup verifier and portability. */
export function exportJson() {
  return JSON.parse(JSON.stringify(load()));
}
