import { Router } from "express";
import { collection, insert, update } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";
import { acceptDocuments, describeFiles } from "../lib/uploads.js";
import { notifyApplication, acknowledgeApplication, notifyApplicationStatus } from "../lib/notify.js";
import { emit } from "../lib/comms.js";
import path from "node:path";
import { UPLOAD_DIR } from "../lib/uploads.js";
import { validateSubcontractorApplication } from "../../shared/validation.js";
import { APPLICATION_STATUS } from "../../shared/constants.js";

const router = Router();

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

  const suppliers = collection("subcontractors").filter((s) => ids.includes(s.id) && s.email);
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
