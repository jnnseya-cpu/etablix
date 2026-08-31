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

function seed() {
  const now = Date.now();
  const day = 86400000;
  const projects = [
    {
      id: id(),
      code: "ETX-2401",
      name: "Northgate Logistics Hub — Phase II",
      client: "Meridian Industrial Partners",
      sector: "Industrial & Logistics",
      status: "in_progress",
      value: 42500000,
      progress: 63,
      startDate: "2026-01-12",
      endDate: "2027-03-30",
      manager: "Dana Okafor",
    },
    {
      id: id(),
      code: "ETX-2408",
      name: "Riverside Medical Pavilion",
      client: "Caldwell Health System",
      sector: "Healthcare & Life Sciences",
      status: "in_progress",
      value: 68000000,
      progress: 38,
      startDate: "2026-03-02",
      endDate: "2027-11-15",
      manager: "Marcus Feld",
    },
    {
      id: id(),
      code: "ETX-2412",
      name: "Harborview Residences — Tower B",
      client: "Lumen Development Group",
      sector: "Multi-Unit Residential",
      status: "mobilization",
      value: 31200000,
      progress: 8,
      startDate: "2026-07-20",
      endDate: "2028-01-10",
      manager: "Dana Okafor",
    },
    {
      id: id(),
      code: "ETX-2397",
      name: "Westfield STEM Academy Expansion",
      client: "Westfield School District",
      sector: "Education & Institutional",
      status: "closeout",
      value: 18400000,
      progress: 97,
      startDate: "2025-05-01",
      endDate: "2026-09-30",
      manager: "Priya Raman",
    },
  ];

  const p = (i) => projects[i].id;

  return {
    users: [
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
    ],
    leads: [
      {
        id: id(),
        name: "Jordan Ellis",
        company: "Beacon Retail Group",
        email: "j.ellis@example.com",
        phone: "+1 555 210 8890",
        sector: "Retail & Hospitality",
        budget: "$5M – $10M",
        message:
          "Planning a 40,000 sq ft flagship store fit-out with an aggressive 7-month schedule. Looking for a design-build partner.",
        status: "new",
        createdAt: now - 2 * day,
      },
    ],
    subcontractors: [
      {
        id: id(),
        company: "Ironline Steel Erectors",
        contact: "Maria Kovac",
        email: "bids@example.com",
        phone: "+1 555 774 2310",
        trade: "Structural Steel & Metalwork",
        crewSize: "25-50",
        licensed: true,
        insured: true,
        experience:
          "18 years of structural steel erection across industrial and commercial projects up to 12 storeys. AISC-certified fabrication partner network.",
        status: "under_review",
        createdAt: now - 5 * day,
      },
    ],
    projects,
    schedule: [
      { id: id(), projectId: p(0), activity: "Tilt-up panel casting — Zone C", phase: "Structure", start: "2026-08-10", end: "2026-09-22", progress: 72, critical: true },
      { id: id(), projectId: p(0), activity: "Roof deck & membrane install", phase: "Envelope", start: "2026-09-01", end: "2026-10-18", progress: 25, critical: true },
      { id: id(), projectId: p(0), activity: "Dock leveler equipment set", phase: "Fit-out", start: "2026-10-05", end: "2026-11-12", progress: 0, critical: false },
      { id: id(), projectId: p(1), activity: "Structural frame — Levels 3-5", phase: "Structure", start: "2026-07-15", end: "2026-10-30", progress: 41, critical: true },
      { id: id(), projectId: p(1), activity: "MEP rough-in — Level 1", phase: "Services", start: "2026-08-20", end: "2026-11-05", progress: 18, critical: false },
    ],
    budget: [
      { id: id(), projectId: p(0), category: "Concrete & Formwork", budgeted: 6800000, committed: 6420000, spent: 5510000 },
      { id: id(), projectId: p(0), category: "Structural Steel", budgeted: 5200000, committed: 5050000, spent: 3980000 },
      { id: id(), projectId: p(0), category: "Envelope & Roofing", budgeted: 4100000, committed: 3890000, spent: 1240000 },
      { id: id(), projectId: p(1), category: "Foundations", budgeted: 7400000, committed: 7150000, spent: 6900000 },
      { id: id(), projectId: p(1), category: "Medical Gas & HVAC", budgeted: 9800000, committed: 8760000, spent: 2110000 },
    ],
    rfis: [
      { id: id(), projectId: p(0), number: "RFI-041", subject: "Clarify anchor bolt layout at grid F-7", status: "open", priority: "high", raisedBy: "Ironline Steel Erectors", createdAt: now - 3 * day },
      { id: id(), projectId: p(1), number: "RFI-102", subject: "Ceiling clearance conflict — imaging suite ductwork", status: "answered", priority: "high", raisedBy: "Apex Mechanical", createdAt: now - 9 * day },
      { id: id(), projectId: p(1), number: "RFI-108", subject: "Substitute spec for isolation room door hardware", status: "open", priority: "medium", raisedBy: "Site team", createdAt: now - 1 * day },
    ],
    inspections: [
      { id: id(), projectId: p(0), ref: "INS-2210", type: "Concrete pour pre-check — Zone C slab", inspector: "Sam Reyes", status: "passed", score: 96, date: "2026-08-24", items: 42, failures: 0 },
      { id: id(), projectId: p(0), ref: "INS-2216", type: "Roof membrane seam integrity", inspector: "Sam Reyes", status: "scheduled", score: null, date: "2026-09-04", items: 28, failures: 0 },
      { id: id(), projectId: p(1), ref: "INS-2201", type: "Structural weld visual — Level 3", inspector: "T. Nakamura", status: "failed", score: 71, date: "2026-08-19", items: 55, failures: 4 },
      { id: id(), projectId: p(1), ref: "INS-2219", type: "Firestopping penetrations — Level 1", inspector: "Sam Reyes", status: "in_progress", score: null, date: "2026-08-30", items: 60, failures: 1 },
    ],
    ncrs: [
      { id: id(), projectId: p(1), ref: "NCR-017", title: "Undersized fillet welds at beam-column joints (4 locations)", severity: "major", status: "open", assignedTo: "Ironline Steel Erectors", createdAt: now - 11 * day },
      { id: id(), projectId: p(0), ref: "NCR-009", title: "Panel surface honeycombing beyond tolerance — Zone B", severity: "minor", status: "closed", assignedTo: "Forma Concrete Co.", createdAt: now - 30 * day },
    ],
    risks: [
      { id: id(), projectId: p(1), ref: "RSK-004", title: "Imaging equipment delivery slip — 14-week lead time at risk", category: "procurement", probability: 4, impact: 5, score: 20, status: "open", mitigation: "Early PO placed; weekly vendor expediting calls; airfreight contingency priced.", owner: "Marcus Feld" },
      { id: id(), projectId: p(0), ref: "RSK-011", title: "Winter concrete pours for Zone D slab-on-grade", category: "schedule", probability: 3, impact: 4, score: 12, status: "open", mitigation: "Heated enclosure budget approved; maturity sensors deployed for early strip.", owner: "Dana Okafor" },
      { id: id(), projectId: p(2), ref: "RSK-002", title: "Tower crane permit approval pending municipal review", category: "permits", probability: 2, impact: 5, score: 10, status: "open", mitigation: "Pre-application meeting held; mobile crane fallback sequenced.", owner: "Dana Okafor" },
      { id: id(), projectId: p(0), ref: "RSK-007", title: "Steel price escalation beyond contingency", category: "cost", probability: 2, impact: 3, score: 6, status: "mitigated", mitigation: "Full steel package bought out at fixed price.", owner: "Priya Raman" },
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
      { id: id(), projectId: p(0), sensor: "CUR-04", kind: "concrete_maturity", location: "Zone C slab, bay 12", value: 68.4, unit: "%", threshold: 75, status: "curing", readAt: now - 3600000 },
      { id: id(), projectId: p(0), sensor: "ENV-01", kind: "dust_pm10", location: "Site boundary north", value: 38, unit: "µg/m³", threshold: 50, status: "ok", readAt: now - 900000 },
      { id: id(), projectId: p(1), sensor: "VIB-02", kind: "vibration", location: "Adjacent hospital wing", value: 2.1, unit: "mm/s", threshold: 5, status: "ok", readAt: now - 600000 },
      { id: id(), projectId: p(1), sensor: "ENV-03", kind: "noise", location: "East elevation", value: 82, unit: "dB", threshold: 80, status: "alert", readAt: now - 1200000 },
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

export function collection(name) {
  const data = load();
  if (!Array.isArray(data[name])) throw new Error(`Unknown collection: ${name}`);
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
