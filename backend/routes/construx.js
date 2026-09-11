/**
 * CONSTRUX API — project delivery: portfolio, schedules, cost control,
 * RFIs, and the manual RAG override a delivery manager can set on a
 * project when the performance indices do not know the whole story.
 * All endpoints require an authenticated employee session.
 */

import { Router } from "express";
import { collection, update, insert, remove, recordLedger, id as newId } from "../lib/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ACCESS } from "../../shared/constants.js";
import { RAG_OPTIONS } from "../lib/portfolio.js";
import { publicIntegration, isConnected, platformFetch, platformRoutes, advertises } from "../lib/platforms.js";
import { VALIDATORS, REF_FIELDS, nextRef } from "../lib/construx.js";
import { emitWebhook } from "../lib/webhooks.js";

const router = Router();
router.use(requireAuth);

function findProject(id) {
  return collection("projects").find((p) => p.id === id || p.code === id);
}

/**
 * LIVE OR WORKSPACE, the same way VERYX does it.
 *
 * CONSTRUX served workspace data unconditionally, so a connected token would
 * have been accepted, stored, tested — and then ignored by every read. That
 * is worse than not supporting it: the connection badge says connected and
 * the numbers on screen come from somewhere else, and nobody would find that
 * by looking at either.
 *
 * A failed live call falls back and SAYS SO in the response, rather than
 * silently serving local data. A source a caller cannot see is a source a
 * caller will assume.
 */
const LIVE = { kind: "live", label: "CONSTRUX platform" };
const WORKSPACE = { kind: "workspace", label: "ETABLIX workspace" };

async function fromPlatform(path, fallback, extract) {
  if (!isConnected("construx")) return { source: WORKSPACE, value: fallback() };
  // Ask the platform what it serves before calling a path it may not have.
  // Without this a route that does not exist and a platform that is down
  // produce the same fallback with the same note, and the note blames the
  // wrong one. `null` means it would not say, which is not "serves nothing" —
  // so the call goes ahead and the platform answers for itself.
  if (advertises(await platformRoutes("construx"), path) === false) {
    return {
      source: { ...WORKSPACE, note: `CONSTRUX advertises no GET ${path}. Served from the workspace rather than from a guessed endpoint.` },
      value: fallback(),
    };
  }
  try {
    const body = await platformFetch("construx", path);
    const value = extract(body);
    if (value == null) {
      const keys = body && typeof body === "object" ? Object.keys(body).slice(0, 6).join(", ") : typeof body;
      throw new Error(`unexpected response shape (top-level: ${keys})`);
    }
    return { source: LIVE, value };
  } catch (err) {
    return { source: { ...WORKSPACE, note: `Live fetch failed: ${err.message}` }, value: fallback() };
  }
}

const firstArray = (body, keys) => {
  if (Array.isArray(body)) return body;
  for (const k of keys) if (Array.isArray(body?.[k])) return body[k];
  if (Array.isArray(body?.data)) return body.data;
  return null;
};

/** Open items first, then newest — the same order for either source. */
const openFirst = (rows) =>
  [...rows].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

const safe = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error("construx route error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  });

/**
 * One write path for all five record types.
 *
 * Every one of them refuses on an internal contradiction rather than warning
 * about it — a pass with failures listed, an activity ending before it
 * starts, a closure with no evidence, a reading past its own threshold marked
 * ok. The validators live in lib/construx.js so the public API can share
 * them: two surfaces writing to the same collection under different rules is
 * how a delivery record becomes a thing nobody trusts.
 */
function writeRoute(name, { event }) {
  return safe(async (req, res) => {
    const validate = VALIDATORS[name];
    const projects = collection("projects");
    const check = validate(req.body || {}, { projects });
    if (!check.ok) {
      return res.status(400).json({ error: check.faults[0], faults: check.faults });
    }
    const refSpec = REF_FIELDS[name];
    const record = { ...check.record };
    if (refSpec && !record[refSpec.field]) {
      record[refSpec.field] = nextRef(collection(name), refSpec.field, refSpec.prefix);
    }
    const row = insert(name, { id: newId(), ...record, createdAt: Date.now(), createdBy: req.user.name });
    recordLedger(`construx.${name}.created`, String(row[refSpec?.field] || row.id), req.user.name,
      `${name}: ${row.activity || row.type || row.title || row.subject || row.sensor || row.id}`);
    await emitWebhook(event, { id: row.id, ...record });
    res.status(201).json({ [name]: row });
  });
}

/** And one update path, with the same validation on the merged result. */
function patchRoute(name, { event }) {
  return safe(async (req, res) => {
    const existing = collection(name).find((r) => r.id === req.params.id);
    if (!existing) return res.status(404).json({ error: "Record not found." });
    const merged = { ...existing, ...(req.body || {}) };
    // VALIDATED ON THE MERGED RESULT, not on the patch. A patch that is
    // individually harmless can make the row contradictory — setting an
    // inspection to passed while its failure count stays at three is two
    // valid fields and one impossible record.
    const check = VALIDATORS[name](merged, { projects: collection("projects") });
    if (!check.ok) {
      return res.status(400).json({ error: check.faults[0], faults: check.faults });
    }
    const refSpec = REF_FIELDS[name];
    const row = update(name, req.params.id, {
      ...check.record,
      ...(refSpec ? { [refSpec.field]: existing[refSpec.field] } : {}),
      updatedAt: Date.now(),
      updatedBy: req.user.name,
    });
    recordLedger(`construx.${name}.updated`, String(row[refSpec?.field] || row.id), req.user.name,
      Object.keys(req.body || {}).join(", ") || "no fields");
    await emitWebhook(event, { id: row.id, ...check.record });
    res.json({ [name]: row });
  });
}

/** GET /api/construx/link — connection badge for every employee. */
router.get("/link", (req, res) => {
  const { label, connected, lastTest } = publicIntegration("construx");
  res.json({ label, connected, summary: lastTest?.summary || null });
});

/** GET /api/construx/projects — the live portfolio. */
router.get("/projects", safe(async (req, res) => {
  const { source, value } = await fromPlatform(
    "/v1/projects",
    () => collection("projects"),
    (p) => firstArray(p, ["projects"]),
  );
  res.json({ source, projects: value });
}));

/** GET /api/construx/projects/:id — one project with roll-ups. */
router.get("/projects/:id", safe(async (req, res) => {
  const local = findProject(req.params.id);
  const { source, value } = await fromPlatform(
    `/v1/projects/${encodeURIComponent(req.params.id)}`,
    () => local || null,
    (p) => (p && typeof p === "object" ? p.project || p.data || (p.id || p.code ? p : null) : null),
  );
  if (!value) return res.status(404).json({ error: "Project not found." });

  // The roll-ups are keyed on the WORKSPACE project id. A live project with
  // no workspace twin therefore has no schedule, budget or RFIs to roll up,
  // and returning the nearest other project's would be worse than returning
  // none — so they come back empty and rollUpsFrom says null.
  const pid = local?.id || null;
  const schedule = pid ? collection("schedule").filter((s) => s.projectId === pid) : [];
  const budget = pid ? collection("budget").filter((b) => b.projectId === pid) : [];
  const rfis = pid ? collection("rfis").filter((r) => r.projectId === pid) : [];
  const totals = budget.reduce(
    (acc, line) => ({
      budgeted: acc.budgeted + line.budgeted,
      committed: acc.committed + line.committed,
      spent: acc.spent + line.spent,
    }),
    { budgeted: 0, committed: 0, spent: 0 }
  );

  res.json({
    source,
    project: value,
    schedule,
    budget,
    budgetTotals: totals,
    rfis,
    rollUpsFrom: pid ? WORKSPACE.label : null,
  });
}));

/** GET /api/construx/schedule — critical-path view across the portfolio. */
router.get("/schedule", safe(async (req, res) => {
  const { source, value } = await fromPlatform(
    "/v1/schedule",
    () => collection("schedule"),
    (p) => firstArray(p, ["schedule", "activities", "tasks"]),
  );
  // Filtering runs on whatever came back, so ?critical=true means the same
  // thing whichever source answered.
  const schedule = req.query.critical === "true" ? value.filter((s) => s.critical) : value;
  res.json({ source, schedule });
}));

/** GET /api/construx/inspections — quality module: ITP inspections. */
router.get("/inspections", safe(async (req, res) => {
  const { source, value } = await fromPlatform(
    "/v1/inspections",
    () => collection("inspections"),
    (p) => firstArray(p, ["inspections"]),
  );
  const inspections = req.query.status
    ? value.filter((i) => i.status === req.query.status)
    : value;
  res.json({ source, inspections });
}));

/** GET /api/construx/ncrs — quality module: non-conformances, open first. */
router.get("/ncrs", safe(async (req, res) => {
  const { source, value } = await fromPlatform(
    "/v1/ncrs",
    () => collection("ncrs"),
    (p) => firstArray(p, ["ncrs", "nonConformances"]),
  );
  const ncrs = openFirst(value);
  res.json({ source, ncrs });
}));

/** GET /api/construx/sensors — field ops: latest site sensor readings. */
router.get("/sensors", safe(async (req, res) => {
  const { source, value } = await fromPlatform(
    "/v1/sensors",
    () => collection("sensors"),
    (p) => firstArray(p, ["sensors", "readings"]),
  );
  res.json({ source, sensors: value });
}));

/** GET /api/construx/rfis — open items first, then newest. */
router.get("/rfis", safe(async (req, res) => {
  const { source, value } = await fromPlatform(
    "/v1/rfis",
    () => collection("rfis"),
    (p) => firstArray(p, ["rfis"]),
  );
  res.json({ source, rfis: openFirst(value) });
}));

/**
 * PATCH /projects/:id/rag — set or clear the manual RAG override.
 *
 * The override sits on top of the derived SPI/CPI verdict rather than
 * replacing it: VERYX keeps showing what the indices computed
 * alongside what a person decided. A reason is required when setting
 * one, for the same purpose reasons are required when certifying less
 * than a supplier claimed — a judgement that overrides a measurement
 * has to be answerable later.
 */
router.patch("/projects/:id/rag", requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found." });

  const raw = String(req.body?.rag ?? "").trim();
  const reason = String(req.body?.reason ?? "").trim().slice(0, 400);

  if (!raw) {
    const row = update("projects", project.id, {
      ragOverride: null,
      ragReason: "",
      ragSetBy: req.user.name,
      ragSetAt: Date.now(),
    });
    return res.json({ project: row, cleared: true });
  }
  if (!RAG_OPTIONS.includes(raw)) {
    return res.status(400).json({ error: `RAG must be one of: ${RAG_OPTIONS.join(", ")}.` });
  }
  if (reason.length < 5) {
    return res.status(400).json({ error: "Give a reason for overriding the measured status." });
  }
  const row = update("projects", project.id, {
    ragOverride: raw,
    ragReason: reason,
    ragSetBy: req.user.name,
    ragSetAt: Date.now(),
  });
  res.json({ project: row });
});

/* ------------------------------------------------------ the write paths */
//
// Delivery records are created and updated by the people who run delivery,
// so they are gated on DELIVERY_FINANCE rather than on any authenticated
// employee. A site engineer reads the schedule; changing it is a different
// act.

router.post("/schedule", requireRole(...ACCESS.DELIVERY_FINANCE), writeRoute("schedule", { event: "construx.activity.created" }));
router.patch("/schedule/:id", requireRole(...ACCESS.DELIVERY_FINANCE), patchRoute("schedule", { event: "construx.activity.updated" }));

router.post("/inspections", requireRole(...ACCESS.DELIVERY_FINANCE), writeRoute("inspections", { event: "construx.inspection.created" }));
router.patch("/inspections/:id", requireRole(...ACCESS.DELIVERY_FINANCE), patchRoute("inspections", { event: "construx.inspection.updated" }));

router.post("/ncrs", requireRole(...ACCESS.DELIVERY_FINANCE), writeRoute("ncrs", { event: "construx.ncr.created" }));
router.patch("/ncrs/:id", requireRole(...ACCESS.DELIVERY_FINANCE), patchRoute("ncrs", { event: "construx.ncr.updated" }));

router.post("/rfis", requireRole(...ACCESS.DELIVERY_FINANCE), writeRoute("rfis", { event: "construx.rfi.created" }));
router.patch("/rfis/:id", requireRole(...ACCESS.DELIVERY_FINANCE), patchRoute("rfis", { event: "construx.rfi.updated" }));

router.post("/sensors", requireRole(...ACCESS.DELIVERY_FINANCE), writeRoute("sensors", { event: "construx.reading.recorded" }));

/**
 * DELETE is deliberately absent for four of the five.
 *
 * A schedule activity, an inspection, a non-conformance and an RFI are the
 * delivery record. Deleting one removes the evidence that it existed, and the
 * reason somebody wants to delete one is almost always that it is
 * inconvenient. A record entered in error is superseded or closed with a
 * reason, and the store's own deletion ledger exists because that lesson had
 * already been learned once here.
 *
 * A sensor reading is the exception: it is a measurement, there are thousands
 * of them, and a duplicate from a double-posting adapter is noise rather than
 * history. Even so it is recorded as a deletion rather than vanishing.
 */
router.delete("/sensors/:id", requireRole(...ACCESS.DELIVERY_FINANCE), safe(async (req, res) => {
  const existing = collection("sensors").find((r) => r.id === req.params.id);
  if (!existing) return res.status(404).json({ error: "Reading not found." });
  const why = String(req.body?.reason || "").trim();
  if (why.length < 5) return res.status(400).json({ error: "Give a reason. A reading removed without one is indistinguishable from a reading that never arrived." });
  remove("sensors", req.params.id, { by: req.user.name, why });
  res.json({ deleted: true });
}));

export default router;
