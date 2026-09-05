/**
 * Supplier payments — the internal side of the money flow.
 *
 * Applications for payment arrive from the supplier portal. Here a
 * named assessor CERTIFIES each one against evidence (certified may
 * differ from claimed; the reasons become the payment-notice wording),
 * retention and CIS are computed, the retention ledger in the
 * Commercial OS is kept current, and payment is marked made — which is
 * blocked until the supplier's bank details have been verified by
 * call-back, and re-blocked whenever those details change.
 */

import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { collection, insert, update, remove } from "../lib/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ACCESS, ROLES } from "../../shared/constants.js";
import { UPLOAD_DIR } from "../lib/uploads.js";
import { emit } from "../lib/comms.js";
import { certificationMaths, maskAccount } from "../lib/supplierflow.js";

const router = Router();
const finance = [requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE)];

const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** GET /api/payments — the applications queue, newest first, with supplier verification state. */
router.get("/", ...finance, (req, res) => {
  const suppliers = collection("subcontractors");
  const apps = [...collection("payApps")].sort((a, b) => b.receivedAt - a.receivedAt).map((p) => {
    const s = suppliers.find((x) => x.id === p.supplierId);
    return { ...p, bankVerified: Boolean(s?.bankVerified), onboarded: Boolean(s?.onboarding) };
  });
  const openValue = apps.filter((p) => p.status === "received").reduce((a, p) => a + p.claimed, 0);
  const certifiedUnpaid = apps.filter((p) => p.status === "certified").reduce((a, p) => a + (p.netPayable || 0), 0);
  res.json({ applications: apps, kpis: { open: apps.filter((p) => p.status === "received").length, openValue, certifiedUnpaid } });
});

/**
 * GET /api/payments/suppliers/:id/account — the payment structure a
 * supplier submitted at onboarding. Finance-only; this is the ONE place
 * full bank details are readable, for the call-back verification.
 */
router.get("/suppliers/:id/account", ...finance, (req, res) => {
  const s = collection("subcontractors").find((a) => a.id === req.params.id);
  if (!s?.onboarding) return res.status(404).json({ error: "No onboarding on file for this supplier." });
  res.json({
    company: s.legalName,
    answers: s.onboarding.answers,
    submittedAt: s.onboarding.submittedAt,
    bankVerified: Boolean(s.bankVerified),
    bankVerifiedBy: s.bankVerifiedBy,
    bankVerifiedAt: s.bankVerifiedAt,
  });
});

/** POST /api/payments/suppliers/:id/verify-bank — a named human confirms the call-back was done. */
router.post("/suppliers/:id/verify-bank", ...finance, (req, res) => {
  const s = collection("subcontractors").find((a) => a.id === req.params.id);
  if (!s?.onboarding) return res.status(404).json({ error: "No onboarding on file for this supplier." });
  const confirmed = req.body?.calledBack === true;
  if (!confirmed) return res.status(400).json({ error: "Confirm the call-back to the director contact was completed before verifying." });
  update("subcontractors", s.id, { bankVerified: true, bankVerifiedBy: req.user.name, bankVerifiedAt: Date.now() });
  res.json({ verified: true, account: maskAccount(s.onboarding.answers.bank_account) });
});

/**
 * POST /api/payments/:id/certify — record the certified sum. Computes
 * retention (5% capped against the ledger) and CIS, sets the net
 * payable, emits the payment notice to the supplier, and keeps the
 * Commercial OS retention ledger current for this supplier/package.
 */
router.post("/:id/certify", ...finance, async (req, res) => {
  const payApp = collection("payApps").find((p) => p.id === req.params.id);
  if (!payApp) return res.status(404).json({ error: "Application not found." });
  if (payApp.status === "paid") return res.status(400).json({ error: "Already paid — certification is closed." });

  const certified = Number(req.body?.certified);
  if (!Number.isFinite(certified) || certified < 0) return res.status(400).json({ error: "Enter the certified sum (£, 0 or more)." });
  const reasons = String(req.body?.reasons || "").trim().slice(0, 2000);
  if (certified < payApp.claimed && reasons.length < 10) {
    return res.status(400).json({ error: "Certifying less than claimed requires the basis — it becomes the pay-less wording the supplier receives." });
  }

  // Cumulative retention position for this supplier+package from the ledger.
  const ledger = collection("retentions").find((r) => r.supplier === payApp.supplier && r.project === payApp.poRef);
  const maths = certificationMaths({
    certified,
    cisDeduction: Number(req.body?.cisDeduction) || 0,
    orderValue: ledger?.contractValue || 0,
    retainedToDate: ledger ? Math.min(0.05 * (ledger.certifiedToDate || 0), 0.05 * (ledger.contractValue || 0)) : 0,
  });

  const updated = update("payApps", payApp.id, {
    ...maths,
    certReasons: reasons,
    status: "certified",
    certifiedBy: req.user.name,
    certifiedAt: Date.now(),
  });

  // Keep the retention ledger current: one row per supplier + order ref.
  if (ledger) {
    update("retentions", ledger.id, {
      certifiedToDate: Number(((ledger.certifiedToDate || 0) + maths.certified).toFixed(2)),
      contractValue: Math.max(ledger.contractValue || 0, payApp.grossToDate || 0),
    });
  } else {
    insert("retentions", {
      project: payApp.poRef,
      supplier: payApp.supplier,
      contractValue: payApp.grossToDate || maths.certified,
      certifiedToDate: maths.certified,
      instrument: "Cash retention",
      defectsEndDate: "",
      pcReleased: false,
      finalReleased: false,
      notes: `Opened automatically from payment application ${payApp.number}.`,
    });
  }

  const supplier = collection("subcontractors").find((a) => a.id === payApp.supplierId);
  if (supplier?.email) {
    emit("payment.certified", {
      email: supplier.email,
      greeting: supplier.contact,
      vars: { reference: payApp.number },
      detailsText: [
        `Application: ${payApp.number} · Period ${payApp.period} · Order ${payApp.poRef}`,
        `Applied for: ${money(payApp.claimed)}`,
        `Certified: ${money(maths.certified)}`,
        `Less retention: ${money(maths.retention)}`,
        maths.cisDeduction ? `Less CIS deduction: ${money(maths.cisDeduction)}` : null,
        `Net payable: ${money(maths.netPayable)}`,
        `Payment due date: ${new Date(payApp.paymentDueDate).toLocaleDateString("en-GB")}`,
        reasons ? `\nBasis of certification:\n${reasons}` : null,
      ].filter(Boolean).join("\n"),
    }).catch(() => {});
  }

  res.json({ application: updated });
});

/**
 * POST /api/payments/:id/paid — mark the payment made and send the
 * remittance. Hard-blocked until the supplier's bank details are
 * verified by call-back — the standing defence against invoice fraud.
 */
router.post("/:id/paid", ...finance, async (req, res) => {
  const payApp = collection("payApps").find((p) => p.id === req.params.id);
  if (!payApp) return res.status(404).json({ error: "Application not found." });
  if (payApp.status !== "certified") return res.status(400).json({ error: "Certify the application before marking it paid." });

  const supplier = collection("subcontractors").find((a) => a.id === payApp.supplierId);
  if (!supplier?.bankVerified) {
    return res.status(400).json({ error: "BLOCKED: this supplier's bank details are not verified. Complete the call-back verification first — this is the invoice-fraud control." });
  }

  const updated = update("payApps", payApp.id, {
    status: "paid",
    paidAt: Date.now(),
    paidBy: req.user.name,
    paymentRef: String(req.body?.paymentRef || "").trim().slice(0, 60),
  });

  if (supplier.email) {
    emit("payment.paid", {
      email: supplier.email,
      greeting: supplier.contact,
      vars: { reference: payApp.number },
      detailsText: [
        `Application: ${payApp.number} · Period ${payApp.period} · Order ${payApp.poRef}`,
        `Certified: ${money(payApp.certified)}`,
        `Retention held: ${money(payApp.retention)}`,
        payApp.cisDeduction ? `CIS deducted: ${money(payApp.cisDeduction)}` : null,
        `Paid: ${money(payApp.netPayable)} to account ${maskAccount(supplier.onboarding?.answers?.bank_account)}`,
        updated.paymentRef ? `Payment reference: ${updated.paymentRef}` : null,
      ].filter(Boolean).join("\n"),
    }).catch(() => {});
  }

  res.json({ application: updated });
});

/**
 * DELETE /api/payments/:id — admin: permanently remove a payment
 * application and its evidence files. For test records and genuine
 * errors only — a real paid application is the audit trail; keep it.
 */
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const payApp = remove("payApps", req.params.id);
  if (!payApp) return res.status(404).json({ error: "Application not found." });
  for (const doc of payApp.documents || []) {
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, doc.stored));
    } catch {}
  }
  res.json({ deleted: true, id: payApp.id });
});

export default router;
