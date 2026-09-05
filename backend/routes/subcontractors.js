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
import { requireHuman } from "../lib/humancheck.js";
import { ONBOARDING_SECTIONS, SUPPLIER_TERMS, NDA_TEXT, maskAccount } from "../lib/supplierflow.js";
import { getSettings, saveSettings } from "../lib/store.js";
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

/** GET /api/subcontractors/pqq — no token: point at the emailed link, not "Unknown endpoint". */
router.get(["/pqq", "/pqq/"], (req, res) => {
  res.status(404).json({ error: "This questionnaire opens from the personal link in your invitation email (etablix.com/pqq?t=…). Contact contact@etablix.com if you need a new one." });
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

// ------------------------------------------------- supplier portal (post-PQQ)

const findByPortalToken = (token) => {
  if (!/^[a-f0-9]{32}$/.test(String(token || ""))) return null;
  const app_ = collection("subcontractors").find((a) => a.portalToken === token);
  if (!app_ || app_.status === "restricted" || app_.status === "declined") return null;
  return app_;
};

const nextAppNumber = () => {
  const counters = { ...(getSettings().pay_counters || {}) };
  const key = `PAY-${new Date().getFullYear()}`;
  counters[key] = (counters[key] || 0) + 1;
  saveSettings({ pay_counters: counters });
  return `${key}-${String(counters[key]).padStart(3, "0")}`;
};

/** What a supplier may see of their own payment application. */
const publicPayApp = (p) => ({
  id: p.id, number: p.number, period: p.period, poRef: p.poRef, description: p.description,
  claimed: p.claimed, grossToDate: p.grossToDate, status: p.status,
  certified: p.certified, retention: p.retention, cisDeduction: p.cisDeduction,
  netPayable: p.netPayable, certReasons: p.certReasons, paymentDueDate: p.paymentDueDate,
  receivedAt: p.receivedAt, paidAt: p.paidAt, documents: (p.documents || []).map((d) => d.name),
});

/**
 * POST /api/subcontractors/:id/onboarding/send — issue (or re-issue)
 * the supplier portal: onboarding first, applications for payment once
 * bank details are verified. Re-sending rotates the token.
 */
router.post("/:id/onboarding/send", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), async (req, res) => {
  const application = collection("subcontractors").find((a) => a.id === req.params.id);
  if (!application) return res.status(404).json({ error: "Application not found." });
  if (!["prequalified", "approved"].includes(application.status)) {
    return res.status(400).json({ error: "Onboarding is for prequalified or approved suppliers — assess the registration first." });
  }
  if (!application.email) return res.status(400).json({ error: "This registration has no email address." });
  const token = crypto.randomBytes(16).toString("hex");
  update("subcontractors", application.id, { portalToken: token, portalSentAt: Date.now(), portalSentBy: req.user.name });
  const link = `${SITE_URL}/supplier-portal?t=${token}`;
  await emit("supplier.onboarding.sent", {
    email: application.email,
    greeting: application.contact,
    vars: { company: application.legalName },
    detailsText: `Your supplier portal (keep this link private to your commercial team):\n${link}\n\nFramework terms in brief:\n${SUPPLIER_TERMS.map((t) => `• ${t}`).join("\n")}`,
  });
  res.json({ sent: true, link });
});

/** What a supplier may see of one of their engagements. The scope and
 * documents stay sealed until the NDA is accepted (when required). */
const publicEngagement = (e) => {
  const ndaOpen = !e.ndaRequired || Boolean(e.nda);
  return {
    id: e.id, title: e.title, returnBy: e.returnBy, status: e.status,
    ndaRequired: e.ndaRequired, ndaAccepted: Boolean(e.nda),
    // Project identity and requirement open only once confidentiality holds.
    project: ndaOpen ? e.project : null,
    scope: ndaOpen ? e.scope : null,
    documents: ndaOpen ? (e.documents || []).map((d) => ({ name: d.name, stored: d.stored })) : (e.documents || []).length,
    quote: e.quote ? { sum: e.quote.sum, programme: e.quote.programme, notes: e.quote.notes, at: e.quote.at } : null,
    poNumber: e.poNumber, agreedSum: e.agreedSum,
    decisionNote: e.status === "declined" ? e.decisionNote : undefined,
  };
};

/** GET /api/subcontractors/portal/:token — public: portal state for this supplier. */
router.get("/portal/:token", (req, res) => {
  const application = findByPortalToken(req.params.token);
  if (!application) return res.status(404).json({ error: "This portal link is invalid, or the account is not active. Contact contact@etablix.com." });
  const mine = collection("payApps").filter((p) => p.supplierId === application.id).sort((a, b) => b.receivedAt - a.receivedAt);
  const engagements = collection("engagements").filter((e) => e.supplierId === application.id).sort((a, b) => b.createdAt - a.createdAt);
  res.json({
    company: application.legalName,
    contact: application.contact,
    status: application.status,
    onboarded: Boolean(application.onboarding),
    bankVerified: Boolean(application.bankVerified),
    bankOnFile: application.onboarding ? maskAccount(application.onboarding.answers.bank_account) : null,
    sections: application.onboarding ? undefined : ONBOARDING_SECTIONS,
    terms: SUPPLIER_TERMS,
    ndaText: NDA_TEXT,
    engagements: engagements.map(publicEngagement),
    applications: mine.map(publicPayApp),
  });
});

/** POST .../engagements/:eid/nda — public: electronically accept the confidentiality undertaking. */
router.post("/portal/:token/engagements/:eid/nda", (req, res) => {
  const application = findByPortalToken(req.params.token);
  if (!application) return res.status(404).json({ error: "This portal link is invalid." });
  const engagement = collection("engagements").find((e) => e.id === req.params.eid && e.supplierId === application.id);
  if (!engagement) return res.status(404).json({ error: "Enquiry not found." });
  if (engagement.nda) return res.json({ ok: true, engagement: publicEngagement(engagement) });
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const position = String(req.body?.position || "").trim().slice(0, 120);
  if (name.length < 3 || position.length < 2 || req.body?.accepted !== true) {
    return res.status(400).json({ error: "Give the signatory's full name and position, and tick the acceptance." });
  }
  const updated = update("engagements", engagement.id, {
    nda: { name, position, at: Date.now() },
    status: engagement.status === "sent" ? "nda_accepted" : engagement.status,
  });
  emit("supplier.nda_accepted", {
    vars: { company: application.legalName, item: engagement.title, actor: `${name} (${position})` },
  }).catch(() => {});
  res.json({ ok: true, engagement: publicEngagement(updated) });
});

/** GET .../engagements/:eid/files/:stored — public: download an enquiry document, NDA-gated. */
router.get("/portal/:token/engagements/:eid/files/:stored", (req, res) => {
  const application = findByPortalToken(req.params.token);
  if (!application) return res.status(404).send("Invalid link.");
  const engagement = collection("engagements").find((e) => e.id === req.params.eid && e.supplierId === application.id);
  if (!engagement) return res.status(404).send("Not found.");
  if (engagement.ndaRequired && !engagement.nda) return res.status(403).send("Accept the confidentiality undertaking first.");
  const doc = (engagement.documents || []).find((d) => d.stored === req.params.stored);
  if (!doc) return res.status(404).send("Not found.");
  res.download(path.join(UPLOAD_DIR, doc.stored), doc.name);
});

/** POST .../engagements/:eid/quote — public: submit the priced return (multipart). */
router.post("/portal/:token/engagements/:eid/quote", acceptDocuments, async (req, res) => {
  const application = findByPortalToken(req.params.token);
  if (!application) return res.status(404).json({ error: "This portal link is invalid." });
  const engagement = collection("engagements").find((e) => e.id === req.params.eid && e.supplierId === application.id);
  if (!engagement) return res.status(404).json({ error: "Enquiry not found." });
  if (engagement.ndaRequired && !engagement.nda) return res.status(400).json({ error: "Accept the confidentiality undertaking before pricing." });
  if (["po_issued", "declined"].includes(engagement.status)) return res.status(400).json({ error: "This enquiry has already been decided." });
  const sum = Number(req.body.sum);
  const programme = String(req.body.programme || "").trim().slice(0, 300);
  const notes = String(req.body.notes || "").trim().slice(0, 4000);
  if (!Number.isFinite(sum) || sum <= 0) return res.status(400).json({ error: "Enter your price (£, excl. VAT)." });
  if (!programme) return res.status(400).json({ error: "Give your programme / lead time (e.g. mobilise in 4 weeks, 12-week duration)." });

  const updated = update("engagements", engagement.id, {
    quote: { sum: Number(sum.toFixed(2)), programme, notes, documents: describeFiles(req.files), at: Date.now() },
    status: "quoted",
  });
  emit("supplier.bid_received", {
    vars: { company: application.legalName, item: engagement.title, value: `£${updated.quote.sum.toLocaleString("en-GB")}` },
    detailsText: `Programme: ${programme}${notes ? `\nClarifications / exclusions:\n${notes}` : ""}${updated.quote.documents.length ? `\nAttachments: ${updated.quote.documents.map((d) => d.name).join(", ")}` : ""}`,
  }).catch(() => {});
  res.json({ ok: true, engagement: publicEngagement(updated), message: "Quotation received. We will confirm the outcome — a purchase order if agreed." });
});

/** POST /api/subcontractors/portal/:token/onboarding — public: payment structure + declarations. */
router.post("/portal/:token/onboarding", async (req, res) => {
  const application = findByPortalToken(req.params.token);
  if (!application) return res.status(404).json({ error: "This portal link is invalid." });
  const answers = req.body?.answers || {};
  const clean = {};
  const missing = [];
  for (const section of ONBOARDING_SECTIONS) {
    for (const f of section.fields) {
      const raw = answers[f.id];
      if (f.type === "declaration") {
        clean[f.id] = raw === true || raw === "true";
        if (f.required && !clean[f.id]) missing.push(f.label);
      } else {
        clean[f.id] = String(raw ?? "").trim().slice(0, 300);
        if (f.required && !clean[f.id]) missing.push(f.label);
        else if (f.pattern && clean[f.id] && !new RegExp(f.pattern).test(clean[f.id].replace(/\s/g, ""))) {
          missing.push(`${f.label} (check the format)`);
        }
      }
    }
  }
  if (missing.length) return res.status(400).json({ error: `Please complete: ${missing[0]}${missing.length > 1 ? ` (and ${missing.length - 1} more)` : ""}` });

  // New or changed bank details always re-lock payment until a human re-verifies.
  update("subcontractors", application.id, {
    onboarding: { answers: clean, submittedAt: Date.now() },
    bankVerified: false,
  });
  emit("supplier.onboarding.received", {
    vars: { company: application.legalName },
    detailsText: `Director call-back contact given: ${clean.director_contact}\nCIS status declared: ${clean.cis_status}\nAccount: ${maskAccount(clean.bank_account)} — full details visible to Delivery & Finance in the Control Desk.`,
  }).catch(() => {});
  res.json({ ok: true, message: "Onboarding received. We verify bank details by call-back before any payment — you can raise applications for payment as soon as that's done." });
});

/** POST /api/subcontractors/portal/:token/applications — public: raise an application for payment (multipart, evidence). */
router.post("/portal/:token/applications", acceptDocuments, async (req, res) => {
  const application = findByPortalToken(req.params.token);
  if (!application) return res.status(404).json({ error: "This portal link is invalid." });
  if (!application.onboarding) return res.status(400).json({ error: "Complete onboarding before raising an application for payment." });

  const period = String(req.body.period || "").trim().slice(0, 20);
  const poRef = String(req.body.poRef || "").trim().slice(0, 60);
  const description = String(req.body.description || "").trim().slice(0, 2000);
  const claimed = Number(req.body.claimed);
  const grossToDate = Number(req.body.grossToDate) || 0;
  if (!period) return res.status(400).json({ error: "Give the valuation period (e.g. 2026-09)." });
  if (!poRef) return res.status(400).json({ error: "Give the ETABLIX order / package reference from your PO." });
  if (!Number.isFinite(claimed) || claimed <= 0) return res.status(400).json({ error: "Enter the sum applied for this period (£)." });
  if (description.length < 10) return res.status(400).json({ error: "Describe the work this application covers — this is assessed against evidence." });

  const payApp = insert("payApps", {
    number: nextAppNumber(),
    supplierId: application.id,
    supplier: application.legalName,
    period, poRef, description,
    claimed: Number(claimed.toFixed(2)),
    grossToDate: Number(grossToDate.toFixed(2)),
    documents: describeFiles(req.files),
    status: "received",
    receivedAt: Date.now(),
    // HGCRA-compliant terms accepted at onboarding: 30 days from a compliant application.
    paymentDueDate: Date.now() + 30 * 86400000,
  });
  emit("payment.application.received", {
    vars: { reference: payApp.number, company: application.legalName, value: `£${payApp.claimed.toLocaleString("en-GB")}` },
    detailsText: `Period: ${period}\nOrder ref: ${poRef}\nGross to date claimed: £${grossToDate.toLocaleString("en-GB")}\nEvidence files: ${payApp.documents.length}\n\n${description}`,
  }).catch(() => {});
  res.status(201).json({ ok: true, application: publicPayApp(payApp), message: `Application ${payApp.number} received. You will get our payment notice once it is assessed.` });
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
  // A decline or conditional outcome from a recorded assessment carries
  // its evidence: every criterion at 2 or below becomes a named area to
  // develop (labels only) in the supplier's email.
  const shortfalls =
    result.outcome === "decline" || result.outcome === "fail" || result.outcome === "conditional"
      ? PREQUAL_CRITERIA.filter((c) => assessment.scores[c.id] <= 2).map((c) => c.label)
      : undefined;
  if (statusChanged) notifyApplicationStatus(application, { shortfalls }); // supplier hears the outcome through the normal flow

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

/** POST /api/subcontractors — public: supplier registration (multipart, optional documents). Human-verified. */
router.post("/", acceptDocuments, requireHuman, (req, res) => {
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
