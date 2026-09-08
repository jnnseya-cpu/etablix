import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { collection, insert, update, remove } from "../lib/store.js";
import { UPLOAD_DIR } from "../lib/uploads.js";
import { ROLES } from "../../shared/constants.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { acceptDocuments, describeFiles } from "../lib/uploads.js";
import { notifyLead, acknowledgeLead } from "../lib/notify.js";
import { engagementFromLead } from "../lib/clientflow.js";
import { validateLead } from "../../shared/validation.js";
import { LEAD_STATUS } from "../../shared/constants.js";
import { requireHuman } from "../lib/humancheck.js";

const router = Router();


/**
 * Every enquiry that names a real service opens its engagement immediately,
 * so nobody retypes a customer's details into the Control Desk to start
 * working on them.
 *
 * It commits to nothing. The engagement sits at the "enquiry" stage with no
 * fee and no agreed model, and the portal cannot be issued from it until a
 * person has set the terms — so an automatic record can never turn into an
 * automatic invoice.
 *
 * A CONSTRUX or VERYX demonstration is a sales conversation rather than an
 * engagement, so it stays an enquiry and no commercial record is opened.
 */
function openEngagementFor(lead) {
  try {
    const draft = engagementFromLead(lead);
    if (!draft.deliverable) return null;               // a demo request
    const year = new Date().getFullYear();
    const seq = collection("clientEngagements").filter((e) => new Date(e.createdAt).getFullYear() === year).length + 1;
    const row = insert("clientEngagements", {
      ...draft,
      reference: `ENG-${year}-${String(seq).padStart(3, "0")}`,
      seq,
      documents: (lead.documents || []).map((d) => ({ ...d, source: "website enquiry" })),
      deliverables: [],
      events: [{ at: Date.now(), by: "Website", what: "Opened from a website enquiry",
        detail: `${lead.service || "Enquiry"} — ${lead.company || lead.name || "unnamed"}. No terms agreed yet.` }],
      openedBy: "Website enquiry",
    });
    update("leads", lead.id, { engagementId: row.id, engagementRef: row.reference });
    return row;
  } catch (err) {
    // An enquiry must never be lost because the engagement could not be
    // opened. The lead is already saved and the alert already sent.
    console.error("Could not open an engagement from enquiry:", err.message);
    return null;
  }
}

/** POST /api/leads — public: business project enquiry (multipart, optional documents). Human-verified. */
router.post("/", acceptDocuments, requireHuman, (req, res) => {
  const { ok, errors, data } = validateLead(req.body);
  if (!ok) return res.status(400).json({ error: errors[0], errors });
  const lead = insert("leads", {
    ...data,
    documents: describeFiles(req.files),
    status: "new",
  });
  notifyLead(lead);
  acknowledgeLead(lead);
  openEngagementFor(lead);
  res.status(201).json({ id: lead.id, message: "Enquiry received." });
});

/** GET /api/leads — internal: list enquiries, newest first. */
router.get("/", requireAuth, (req, res) => {
  const leads = [...collection("leads")].sort((a, b) => b.createdAt - a.createdAt);
  res.json({ leads });
});

/** PATCH /api/leads/:id — internal: move a lead through the pipeline. */
router.patch("/:id", requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!LEAD_STATUS.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${LEAD_STATUS.join(", ")}` });
  }
  const lead = update("leads", req.params.id, { status });
  if (!lead) return res.status(404).json({ error: "Lead not found." });
  res.json({ lead });
});

/** DELETE /api/leads/:id — admin: permanently remove an enquiry + documents. */
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const lead = remove("leads", req.params.id);
  if (!lead) return res.status(404).json({ error: "Enquiry not found." });
  for (const doc of lead.documents || []) {
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, doc.stored));
    } catch {}
  }
  res.json({ deleted: true, id: lead.id });
});

export default router;
