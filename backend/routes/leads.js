import { Router } from "express";
import { collection, insert, update } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";
import { acceptDocuments, describeFiles } from "../lib/uploads.js";
import { notifyLead } from "../lib/notify.js";
import { validateLead } from "../../shared/validation.js";
import { LEAD_STATUS } from "../../shared/constants.js";

const router = Router();

/** POST /api/leads — public: business project enquiry (multipart, optional documents). */
router.post("/", acceptDocuments, (req, res) => {
  const { ok, errors, data } = validateLead(req.body);
  if (!ok) return res.status(400).json({ error: errors[0], errors });
  const lead = insert("leads", {
    ...data,
    documents: describeFiles(req.files),
    status: "new",
  });
  notifyLead(lead);
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

export default router;
