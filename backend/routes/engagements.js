/**
 * Supplier engagements — the procurement middle of the lifecycle:
 *
 *   enquiry pack (NDA-gated) → supplier prices in the portal →
 *   review → accept (PO issued, forming the contract) or decline.
 *
 * The enquiry is created here and delivered through the supplier
 * portal; the confidentiality undertaking must be accepted before the
 * pack opens when NDA is required. Accepting a quote mints a real,
 * numbered purchase order in the document studio (the same PO-YYYY-NNN
 * series), emails the supplier their appointment with the framework
 * terms, and gives payment applications their order reference.
 */

import { Router } from "express";
import crypto from "node:crypto";
import { collection, insert, update, remove } from "../lib/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES, ACCESS } from "../../shared/constants.js";
import { acceptDocuments, describeFiles } from "../lib/uploads.js";
import { emit } from "../lib/comms.js";
import { nextNumber } from "./docs.js";
import { draftScope } from "../lib/ai.js";

const router = Router();
const finance = [requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE)];
const SITE_URL = (process.env.SITE_URL || "https://etablix.com").replace(/\/+$/, "");

const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clampStr = (v, max = 300) => String(v ?? "").trim().slice(0, max);

/** GET /api/engagements — all engagements, newest first, with supplier state. */
router.get("/", ...finance, (req, res) => {
  const suppliers = collection("subcontractors");
  const engagements = [...collection("engagements")].sort((a, b) => b.createdAt - a.createdAt).map((e) => ({
    ...e,
    supplierOnboarded: Boolean(suppliers.find((s) => s.id === e.supplierId)?.onboarding),
  }));
  res.json({ engagements });
});

/**
 * POST /api/engagements/draft-scope — the AI engine expands a short
 * brief into a deep, priceable scope of works. Draft only: the buyer
 * edits before sending; nothing reaches a supplier unreviewed.
 */
router.post("/draft-scope", ...finance, async (req, res) => {
  const title = clampStr(req.body?.title, 160);
  const project = clampStr(req.body?.project, 160);
  const brief = String(req.body?.brief || "").trim().slice(0, 4000);
  if (title.length < 3 || brief.length < 10) {
    return res.status(400).json({ error: "Give the package title and a few lines of brief for the agent to expand." });
  }
  try {
    const draft = await draftScope({ title, project: project || "confidential", brief });
    res.json({ draft });
  } catch (err) {
    const msg = /authentication|invalid.*key/i.test(err.message)
      ? "The AI engine key was rejected — check it under Organisation → AI engine."
      : err.message;
    res.status(502).json({ error: msg });
  }
});

/**
 * POST /api/engagements — issue an enquiry pack to a supplier
 * (multipart: requirement documents). Requires a prequalified or
 * approved supplier; issues their portal token if they don't have one
 * yet, so the invitation link always works.
 */
router.post("/", ...finance, acceptDocuments, async (req, res) => {
  const supplier = collection("subcontractors").find((s) => s.id === req.body.supplierId);
  if (!supplier) return res.status(404).json({ error: "Supplier not found." });
  if (!["prequalified", "approved"].includes(supplier.status)) {
    return res.status(400).json({ error: "Enquiries go to prequalified or approved suppliers — assess the registration first." });
  }
  const title = clampStr(req.body.title, 160);
  const project = clampStr(req.body.project, 160);
  const scope = String(req.body.scope || "").trim().slice(0, 6000);
  const returnBy = clampStr(req.body.returnBy, 10);
  if (title.length < 3) return res.status(400).json({ error: "Give the package title." });
  if (project.length < 2) return res.status(400).json({ error: "Give the project (use a codename if the client is confidential)." });
  if (scope.length < 10) return res.status(400).json({ error: "Describe the requirement — this is what the supplier prices." });
  if (!returnBy) return res.status(400).json({ error: "Set the return date." });

  let portalToken = supplier.portalToken;
  if (!portalToken) {
    portalToken = crypto.randomBytes(16).toString("hex");
    update("subcontractors", supplier.id, { portalToken, portalSentAt: Date.now(), portalSentBy: req.user.name });
  }

  const engagement = insert("engagements", {
    supplierId: supplier.id,
    supplier: supplier.legalName,
    title, project, scope, returnBy,
    ndaRequired: req.body.ndaRequired !== "false",
    documents: describeFiles(req.files),
    status: "sent",
    createdAt: Date.now(),
    createdBy: req.user.name,
  });

  await emit("supplier.tender_invited", {
    email: supplier.email,
    greeting: supplier.contact,
    vars: { company: supplier.legalName, item: title },
    detailsText: `Package: ${title}\nReturn by: ${returnBy}\n\nOpen the enquiry in your supplier portal:\n${SITE_URL}/supplier-portal?t=${portalToken}\n\n${engagement.ndaRequired ? "A confidentiality undertaking must be accepted in the portal before the enquiry pack opens." : ""}`,
  });

  res.status(201).json({ engagement });
});

/**
 * POST /api/engagements/:id/decision — accept or decline the
 * supplier's quotation. Accepting mints the purchase order (document
 * studio PO series), which — with the framework terms accepted at
 * onboarding — forms the supplier's contract.
 */
router.post("/:id/decision", ...finance, async (req, res) => {
  const engagement = collection("engagements").find((e) => e.id === req.params.id);
  if (!engagement) return res.status(404).json({ error: "Engagement not found." });
  if (engagement.status !== "quoted") return res.status(400).json({ error: "There is no quotation awaiting a decision on this engagement." });
  const supplier = collection("subcontractors").find((s) => s.id === engagement.supplierId);
  const action = req.body?.action;

  if (action === "decline") {
    const note = clampStr(req.body?.note, 1000);
    const updated = update("engagements", engagement.id, { status: "declined", decidedBy: req.user.name, decidedAt: Date.now(), decisionNote: note });
    if (supplier?.email) {
      emit("supplier.bid_outcome", {
        email: supplier.email,
        greeting: supplier.contact,
        vars: { item: engagement.title, outcome: "not successful on this occasion" },
        detailsText: note ? `Feedback: ${note}` : undefined,
      }).catch(() => {});
    }
    return res.json({ engagement: updated });
  }

  if (action !== "accept") return res.status(400).json({ error: "Action must be accept or decline." });
  const agreedSum = Number(req.body?.agreedSum ?? engagement.quote?.sum);
  if (!Number.isFinite(agreedSum) || agreedSum <= 0) return res.status(400).json({ error: "Confirm the agreed sum (£)." });
  if (!supplier?.onboarding) return res.status(400).json({ error: "The supplier has not completed onboarding — the PO incorporates the framework terms they accept there." });

  // Mint the PO in the document studio's own series, so it is a real,
  // numbered, renderable document with the rest of the commercial record.
  const poNumber = nextNumber("PO");
  const poDoc = insert("documents", {
    template: "po",
    templateName: "Purchase order / subcontract order",
    number: poNumber,
    title: engagement.project,
    party: engagement.supplier,
    total: agreedSum,
    issuedBy: req.user.name,
    data: {
      supplier: engagement.supplier,
      supplierAddress: "",
      project: engagement.project,
      package: engagement.title,
      lines: [{ description: `${engagement.title} — as quoted and agreed`, qty: 1, rate: agreedSum }],
      startDate: "",
      cis: "yes",
      notes: `Awarded under ETABLIX enquiry dated ${new Date(engagement.createdAt).toLocaleDateString("en-GB")}. This order incorporates the ETABLIX framework terms accepted by the supplier at onboarding and the confidentiality undertaking accepted ${engagement.nda ? `by ${engagement.nda.name} on ${new Date(engagement.nda.at).toLocaleDateString("en-GB")}` : "for this enquiry"}.`,
    },
  });

  const updated = update("engagements", engagement.id, {
    status: "po_issued",
    agreedSum,
    poNumber,
    poDocId: poDoc.id,
    decidedBy: req.user.name,
    decidedAt: Date.now(),
  });

  if (supplier.email) {
    emit("supplier.po_issued", {
      email: supplier.email,
      greeting: supplier.contact,
      vars: { reference: poNumber, item: engagement.title },
      detailsText: [
        `Purchase order: ${poNumber}`,
        `Project: ${engagement.project}`,
        `Package: ${engagement.title}`,
        `Agreed sum: ${money(agreedSum)} (excl. VAT — domestic reverse charge where CIS applies)`,
        ``,
        `Quote ${poNumber} on all applications for payment in your supplier portal.`,
      ].join("\n"),
    }).catch(() => {});
  }

  res.json({ engagement: updated, poNumber });
});

/** DELETE /api/engagements/:id — admin: remove an engagement (e.g. a test). */
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const row = remove("engagements", req.params.id);
  if (!row) return res.status(404).json({ error: "Engagement not found." });
  res.json({ deleted: true });
});

export default router;
