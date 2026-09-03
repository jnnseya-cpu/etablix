import { Router } from "express";
import fs from "node:fs";
import { collection, insert, update, remove } from "../lib/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../../shared/constants.js";
import { acceptDocuments, describeFiles } from "../lib/uploads.js";
import { notifyApplication, acknowledgeApplication, notifyApplicationStatus } from "../lib/notify.js";
import { emit } from "../lib/comms.js";
import path from "node:path";
import { UPLOAD_DIR } from "../lib/uploads.js";
import { validateSubcontractorApplication } from "../../shared/validation.js";
import { APPLICATION_STATUS, ACCESS } from "../../shared/constants.js";
import { PREQUAL_CRITERIA, PQQ_SECTIONS, PQQ_DOCUMENTS_CHECKLIST, assessScores } from "../lib/prequal.js";
import { draftPrequal } from "../lib/ai.js";
import crypto from "node:crypto";

const router = Router();

const SITE_URL = (process.env.SITE_URL || "https://etablix.com").replace(/\/+$/, "");
const PQQ_VALID_DAYS = 30;

const findByPqqToken = (token) => {
  if (!/^[a-f0-9]{32}$/.test(String(token || ""))) return null;
  const app_ = collection("subcontractors").find((a) => a.pqqToken === token);
  if (!app_) return null;
  if (Date.now() - (app_.pqqSentAt || 0) > PQQ_VALID_DAYS * 86400000) return null;
  return app_;
};

/**
 * POST /api/subcontractors/:id/pqq/send — issue the prequalification
 * questionnaire to a supplier: a tokenised link, valid 30 days,
 * delivered through the branded email engine.
 */
router.post("/:id/pqq/send", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), async (req, res) => {
  const application = collection("subcontractors").find((a) => a.id === req.params.id);
  if (!application) return res.status(404).json({ error: "Application not found." });
  if (!application.email) return res.status(400).json({ error: "This registration has no email address." });
  const token = crypto.randomBytes(16).toString("hex");
  update("subcontractors", application.id, { pqqToken: token, pqqSentAt: Date.now(), pqqSentBy: req.user.name });
  const link = `${SITE_URL}/pqq?t=${token}`;
  await emit("supplier.pqq.sent", {
    email: application.email,
    greeting: application.contact,
    vars: { company: application.legalName, link, value: PQQ_VALID_DAYS },
    detailsText: `Your questionnaire link (valid ${PQQ_VALID_DAYS} days):\n${link}\n\nPlease have ready: ${PQQ_DOCUMENTS_CHECKLIST.join("; ")}.`,
  });
  res.json({ sent: true, link });
});

/** GET /api/subcontractors/pqq/:token — public: the questionnaire for a valid token. */
router.get("/pqq/:token", (req, res) => {
  const application = findByPqqToken(req.params.token);
  if (!application) return res.status(404).json({ error: "This questionnaire link is invalid or has expired. Contact contact@etablix.com for a new one." });
  res.json({
    company: application.legalName,
    contact: application.contact,
    capability: application.capability,
    sections: PQQ_SECTIONS,
    documentsChecklist: PQQ_DOCUMENTS_CHECKLIST,
    submitted: Boolean(application.pqq),
  });
});

/** POST /api/subcontractors/pqq/:token — public: submit answers + documents (multipart). */
router.post("/pqq/:token", acceptDocuments, async (req, res) => {
  const application = findByPqqToken(req.params.token);
  if (!application) return res.status(404).json({ error: "This questionnaire link is invalid or has expired." });

  let answers = {};
  try {
    answers = JSON.parse(req.body.answers || "{}");
  } catch {
    return res.status(400).json({ error: "Invalid submission." });
  }
  const clean = {};
  const missing = [];
  for (const section of PQQ_SECTIONS) {
    for (const f of section.fields) {
      const raw = answers[f.id];
      if (f.type === "declaration") {
        clean[f.id] = raw === true || raw === "true";
        if (f.required && !clean[f.id]) missing.push(f.label);
      } else {
        clean[f.id] = String(raw ?? "").trim().slice(0, f.type === "textarea" ? 2000 : 300);
        if (f.required && !clean[f.id]) missing.push(f.label);
      }
    }
  }
  if (missing.length) return res.status(400).json({ error: `Please complete: ${missing[0]}${missing.length > 1 ? ` (and ${missing.length - 1} more)` : ""}` });

  const pqqDocuments = describeFiles(req.files);
  update("subcontractors", application.id, {
    pqq: { answers: clean, documents: pqqDocuments, submittedAt: Date.now() },
    // PQQ documents join the registration's evidence pack.
    documents: [...(application.documents || []), ...pqqDocuments],
    status: application.status === "submitted" ? "under_review" : application.status,
  });
  emit("supplier.pqq.received", {
    vars: { company: application.legalName, value: pqqDocuments.length },
  }).catch(() => {});
  res.json({ ok: true, message: "Questionnaire received. Our team will assess it and confirm the outcome by email." });
});

/** GET /api/subcontractors/prequal-criteria — the scorecard definition. */
router.get("/prequal-criteria", requireAuth, (req, res) => {
  res.json({ criteria: PREQUAL_CRITERIA, pqqSections: PQQ_SECTIONS });
});

/**
 * POST /api/subcontractors/:id/assessment/draft — Agent 7 drafts the
 * scorecard from the registration data. Nothing is saved: the draft
 * returns to the browser for a named human to adjust and record.
 */
router.post("/:id/assessment/draft", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), async (req, res) => {
  const application = collection("subcontractors").find((a) => a.id === req.params.id);
  if (!application) return res.status(404).json({ error: "Application not found." });
  try {
    const draft = await draftPrequal(application, PREQUAL_CRITERIA);
    res.json({ draft });
  } catch (err) {
    const msg = /authentication|invalid.*key/i.test(err.message)
      ? "The AI engine key was rejected — check it under Organisation → AI engine."
      : err.message;
    res.status(502).json({ error: msg });
  }
});

/**
 * POST /api/subcontractors/:id/assessment — record a prequalification
 * assessment. Twelve scores (0–5), optional notes; the engine computes
 * the weighted outcome and, when applyStatus is true, moves the
 * registration to the recommended status (which emails the supplier
 * through the normal status flow).
 */
router.post("/:id/assessment", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  const existing = collection("subcontractors").find((a) => a.id === req.params.id);
  if (!existing) return res.status(404).json({ error: "Application not found." });

  const result = assessScores(req.body?.scores || {});
  if (!result.ok) {
    return res.status(400).json({ error: `Score every criterion 0–5. Missing: ${result.missing.join(", ")}` });
  }

  const assessment = {
    scores: Object.fromEntries(PREQUAL_CRITERIA.map((c) => [c.id, Number(req.body.scores[c.id])])),
    notes: String(req.body?.notes || "").trim().slice(0, 2000),
    weightedPct: result.weightedPct,
    outcome: result.outcome,
    reason: result.reason,
    assessor: req.user.name,
    at: Date.now(),
  };

  const patch = { assessment };
  const applyStatus = req.body?.applyStatus !== false;
  const statusChanged = applyStatus && existing.status !== result.recommendedStatus;
  if (applyStatus) patch.status = result.recommendedStatus;
  const application = update("subcontractors", req.params.id, patch);
  if (statusChanged) notifyApplicationStatus(application); // supplier hears the outcome through the normal flow

  emit("supplier.assessed", {
    vars: {
      company: existing.legalName,
      actor: req.user.name,
      value: `${result.weightedPct}%`,
      outcome: result.outcome,
    },
  }).catch(() => {});

  res.json({ application, recommendedStatus: result.recommendedStatus, applied: applyStatus });
});

/** POST /api/subcontractors — public: supplier registration (multipart, optional documents). */
router.post("/", acceptDocuments, (req, res) => {
  const { ok, errors, data } = validateSubcontractorApplication(req.body);
  if (!ok) return res.status(400).json({ error: errors[0], errors });
  const application = insert("subcontractors", {
    ...data,
    documents: describeFiles(req.files),
    status: "submitted",
  });
  notifyApplication(application);
  acknowledgeApplication(application);
  res.status(201).json({ id: application.id, message: "Application received." });
});

/** GET /api/subcontractors — internal: list applications, newest first. */
router.get("/", requireAuth, (req, res) => {
  const applications = [...collection("subcontractors")].sort(
    (a, b) => b.createdAt - a.createdAt
  );
  res.json({ applications });
});

/** PATCH /api/subcontractors/:id — internal: advance an application. */
router.patch("/:id", requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!APPLICATION_STATUS.includes(status)) {
    return res
      .status(400)
      .json({ error: `Status must be one of: ${APPLICATION_STATUS.join(", ")}` });
  }
  const existing = collection("subcontractors").find((a) => a.id === req.params.id);
  if (!existing) return res.status(404).json({ error: "Application not found." });
  const changed = existing.status !== status;
  const application = update("subcontractors", req.params.id, { status });
  if (changed) notifyApplicationStatus(application); // emails the supplier their outcome
  res.json({ application });
});

/**
 * DELETE /api/subcontractors/:id — admin: permanently remove a
 * registration and its uploaded documents. Use `restricted` status
 * instead when you want to keep the record but bar the supplier from
 * the working directory and broadcasts.
 */
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const application = remove("subcontractors", req.params.id);
  if (!application) return res.status(404).json({ error: "Application not found." });
  for (const doc of application.documents || []) {
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, doc.stored));
    } catch {}
  }
  res.json({ deleted: true, id: application.id });
});

/**
 * POST /api/subcontractors/broadcast — internal: one-click message to
 * selected suppliers, with optional attachments (multipart). Each
 * supplier receives an individually addressed branded email; every send
 * is recorded in the deliveries log.
 */
router.post("/broadcast", requireAuth, acceptDocuments, async (req, res) => {
  const subject = String(req.body.subject || "").trim();
  const message = String(req.body.message || "").trim();
  let ids = [];
  try {
    ids = JSON.parse(req.body.ids || "[]");
  } catch {
    return res.status(400).json({ error: "Invalid supplier selection." });
  }
  if (subject.length < 3) return res.status(400).json({ error: "Enter a subject." });
  if (message.length < 10) return res.status(400).json({ error: "Enter a message (at least 10 characters)." });
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "Select at least one supplier." });

  // Restricted suppliers never receive broadcasts, even if selected.
  const suppliers = collection("subcontractors").filter(
    (s) => ids.includes(s.id) && s.email && s.status !== "restricted"
  );
  if (!suppliers.length) return res.status(400).json({ error: "No matching suppliers with an email address." });

  const attachments = (req.files || []).map((f) => ({
    filename: f.originalname,
    path: path.join(UPLOAD_DIR, f.filename),
  }));

  let sent = 0;
  let failed = 0;
  for (const s of suppliers) {
    const results = await emit("supplier.message", {
      email: s.email,
      greeting: s.contact,
      vars: { subject, message },
      attachments: attachments.length ? attachments : undefined,
    });
    const emailResult = results.find((r) => r.channel === "email");
    if (emailResult && (emailResult.status === "sent" || emailResult.status === "logged")) sent += 1;
    else failed += 1;
  }

  emit("supplier.message.sent", {
    vars: {
      subject,
      value: suppliers.length,
      actor: req.user.name,
      outcome: `${sent} delivered${failed ? `, ${failed} failed` : ""}${attachments.length ? `, ${attachments.length} attachment(s)` : ""}`,
    },
  }).catch(() => {});

  res.json({ sent, failed, recipients: suppliers.length, attachments: attachments.length });
});

export default router;
