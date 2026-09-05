/**
 * Document studio — plug-and-play commercial and management documents.
 *
 * Pick a template, fill the structured form, and the studio assembles a
 * branded, numbered, print-ready document (browser print → PDF). Every
 * generated document is registered with its number, so the record of
 * what was issued is the system, not a folder of files.
 *
 * Templates: invoice, payment application, fee quotation, purchase
 * order / subcontract order, payment / pay-less notice, variation
 * instruction, weekly client report. The wording blocks (payment
 * terms, HGCRA notices, reverse-charge statements) are pre-drafted so
 * documents leave the desk compliant by default.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES, ACCESS } from "../../shared/constants.js";
import { collection, insert, remove, getSettings, saveSettings } from "../lib/store.js";
import { verifyToken } from "../lib/auth.js";

const router = Router();

const deliveryFinance = requireRole(...ACCESS.DELIVERY_FINANCE);
const admin = requireRole(ROLES.ADMIN);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clampStr = (v, max = 400) => String(v ?? "").trim().slice(0, max);
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const today = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------ billing settings

const DEFAULT_BILLING = {
  bankName: "", accountName: "JNN GLOBAL LTD t/a ETABLIX", sortCode: "", accountNumber: "",
  vatNumber: "", cisUtr: "", paymentTermsDays: 14,
};

const billing = () => ({ ...DEFAULT_BILLING, ...(getSettings().billing_settings || {}) });

router.get("/billing", requireAuth, deliveryFinance, (req, res) => res.json({ billing: billing() }));

router.put("/billing", requireAuth, admin, (req, res) => {
  const patch = {};
  for (const k of ["bankName", "accountName", "sortCode", "accountNumber", "vatNumber", "cisUtr"]) {
    if (k in req.body) patch[k] = clampStr(req.body[k], 80);
  }
  if ("paymentTermsDays" in req.body) patch.paymentTermsDays = Math.max(1, Math.min(90, toNum(req.body.paymentTermsDays) || 14));
  saveSettings({ billing_settings: { ...billing(), ...patch } });
  res.json({ billing: billing() });
});

// ------------------------------------------------------------------ templates

const VAT_MODES = [
  { id: "standard", label: "Standard VAT 20%" },
  { id: "reverse", label: "Domestic reverse charge (CIS contractor client)" },
  { id: "none", label: "No VAT / outside scope" },
];

const F = (name, label, type = "text", opts = {}) => ({ name, label, type, ...opts });
const LINES = (label = "Line items") => F("lines", label, "lines");

export const TEMPLATES = [
  {
    id: "invoice", prefix: "INV", name: "Invoice",
    description: "VAT-aware sales invoice with automatic numbering, reverse-charge wording and your bank details.",
    fields: [
      F("client", "Client / company", "text", { required: true }),
      F("clientAddress", "Client address", "textarea"),
      F("clientRef", "Client reference / PO", "text"),
      F("project", "Project / engagement", "text", { required: true }),
      F("vatMode", "VAT treatment", "select", { options: VAT_MODES.map((v) => v.id), labels: VAT_MODES.map((v) => v.label) }),
      LINES("Invoice lines (description · qty · rate)"),
      F("notes", "Notes (optional)", "textarea"),
    ],
  },
  {
    id: "application", prefix: "APP", name: "Payment application",
    description: "Interim application for payment: gross valuation to date, less previously certified, giving the sum applied for.",
    fields: [
      F("client", "Client / company", "text", { required: true }),
      F("project", "Project / contract", "text", { required: true }),
      F("period", "Valuation period (e.g. 2026-09)", "text", { required: true }),
      F("applicationNo", "Application number (e.g. 04)", "text"),
      LINES("Valuation build-up (item · qty/% · value)"),
      F("previouslyCertified", "Less previously certified (£)", "number"),
      F("vatMode", "VAT treatment", "select", { options: VAT_MODES.map((v) => v.id), labels: VAT_MODES.map((v) => v.label) }),
      F("notes", "Basis of valuation / notes", "textarea"),
    ],
  },
  {
    id: "quotation", prefix: "QUO", name: "Fee quotation / proposal",
    description: "Advisory or integrator fee proposal with scope, fees, assumptions and 30-day validity.",
    fields: [
      F("client", "Client / company", "text", { required: true }),
      F("contact", "Addressee", "text"),
      F("project", "Engagement / project", "text", { required: true }),
      F("model", "Delivery model", "select", { options: ["Model A — Advisory", "Model B — Management Integrator", "Model C — Prime Service Contractor"] }),
      LINES("Scope & fees (deliverable · qty · fee)"),
      F("assumptions", "Assumptions & exclusions", "textarea"),
      F("validityDays", "Validity (days)", "number", { placeholder: "30" }),
    ],
  },
  {
    id: "po", prefix: "PO", name: "Purchase order / subcontract order",
    description: "Supplier order with compliant 30-day payment terms — never pay-when-paid — and CIS wording.",
    fields: [
      F("supplier", "Supplier", "text", { required: true }),
      F("supplierAddress", "Supplier address", "textarea"),
      F("project", "Project / site", "text", { required: true }),
      F("package", "Package / scope title", "text", { required: true }),
      LINES("Order lines (description · qty · rate)"),
      F("startDate", "Commencement", "date"),
      F("cis", "CIS applies to labour elements", "select", { options: ["yes", "no"], labels: ["Yes — CIS deduction per verification", "No — materials / plant / exempt"] }),
      F("notes", "Special conditions (optional)", "textarea"),
    ],
  },
  {
    id: "notice", prefix: "PN", name: "Payment / pay-less notice",
    description: "HGCRA 1996-compliant notice: the notified sum, its basis, and the amount proposed to be paid.",
    fields: [
      F("supplier", "To (supplier / payee)", "text", { required: true }),
      F("project", "Project / contract", "text", { required: true }),
      F("applicationRef", "Against application ref", "text", { required: true }),
      F("noticeType", "Notice type", "select", { options: ["payment", "payless"], labels: ["Payment notice (s.110A)", "Pay-less notice (s.111)"] }),
      F("appliedSum", "Sum applied for (£)", "number", { required: true }),
      F("notifiedSum", "Sum considered due — the notified sum (£)", "number", { required: true }),
      F("basis", "Basis of calculation", "textarea", { required: true }),
      F("dueDate", "Payment due date", "date"),
      F("finalDate", "Final date for payment", "date"),
    ],
  },
  {
    id: "variation", prefix: "VAR", name: "Variation instruction",
    description: "Instructed change with cost and programme effect, priced through the change process — contingency drawdown documented, never silent.",
    fields: [
      F("party", "To (client or supplier)", "text", { required: true }),
      F("project", "Project / contract", "text", { required: true }),
      F("title", "Variation title", "text", { required: true }),
      F("description", "Description of change", "textarea", { required: true }),
      LINES("Cost build-up (item · qty · value)"),
      F("programmeEffect", "Programme effect", "textarea"),
      F("contingency", "Drawn against contingency risk item (ref, if applicable)", "text"),
    ],
  },
  {
    id: "report", prefix: "RPT", name: "Weekly client report",
    description: "One-page client report: progress, services status, interfaces, risks and decisions needed.",
    fields: [
      F("client", "Client", "text", { required: true }),
      F("project", "Project / site", "text", { required: true }),
      F("weekEnding", "Week ending", "date", { required: true }),
      F("progress", "Progress this week", "textarea", { required: true }),
      F("services", "Service status (welfare, power, water, security, accommodation…)", "textarea"),
      F("interfaces", "Interface & constraint items", "textarea"),
      F("risks", "Risks & lookahead", "textarea"),
      F("decisions", "Decisions needed from the client", "textarea"),
    ],
  },
];

router.get("/templates", requireAuth, deliveryFinance, (req, res) =>
  res.json({ templates: TEMPLATES.map(({ id, prefix, name, description, fields }) => ({ id, prefix, name, description, fields })) })
);

// ---------------------------------------------------------------- generation

export function nextNumber(prefix) {
  const counters = { ...(getSettings().doc_counters || {}) };
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  counters[key] = (counters[key] || 0) + 1;
  saveSettings({ doc_counters: counters });
  return `${prefix}-${year}-${String(counters[key]).padStart(3, "0")}`;
}

function cleanLines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 40)
    .map((l) => ({ description: clampStr(l.description, 240), qty: toNum(l.qty) || 1, rate: toNum(l.rate) }))
    .filter((l) => l.description);
}

router.get("/", requireAuth, deliveryFinance, (req, res) =>
  res.json({ documents: [...collection("documents")].reverse().map(({ data, ...meta }) => meta) })
);

router.post("/generate", requireAuth, deliveryFinance, (req, res) => {
  const tpl = TEMPLATES.find((t) => t.id === req.body?.template);
  if (!tpl) return res.status(400).json({ error: "Unknown template." });
  const input = req.body.data || {};
  for (const f of tpl.fields) {
    if (f.required && f.type !== "lines" && !clampStr(input[f.name])) {
      return res.status(400).json({ error: `"${f.label}" is required.` });
    }
  }
  const data = {};
  for (const f of tpl.fields) {
    if (f.type === "lines") data.lines = cleanLines(input.lines);
    else if (f.type === "number") data[f.name] = toNum(input[f.name]);
    else data[f.name] = clampStr(input[f.name], f.type === "textarea" ? 4000 : 300);
  }
  const number = nextNumber(tpl.prefix);
  const doc = insert("documents", {
    template: tpl.id,
    templateName: tpl.name,
    number,
    title: data.project || data.client || data.supplier || tpl.name,
    party: data.client || data.supplier || data.party || "—",
    total: (data.lines || []).reduce((s, l) => s + l.qty * l.rate, 0),
    issuedBy: req.user.name,
    data,
  });
  res.status(201).json({ document: { id: doc.id, number: doc.number, template: doc.template } });
});

router.delete("/:id", requireAuth, admin, (req, res) => {
  const row = remove("documents", req.params.id);
  if (!row) return res.status(404).json({ error: "Document not found." });
  res.json({ deleted: true });
});

// ------------------------------------------------------------------ rendering

/** Rendered documents open in a new tab, so auth arrives as ?token=. */
function tokenAuth(req, res, next) {
  const payload = verifyToken(req.query.token || "");
  if (!payload) return res.status(401).send("Authentication required.");
  if (!ACCESS.DELIVERY_FINANCE.includes(payload.role)) return res.status(403).send("Insufficient permissions.");
  req.user = payload;
  next();
}

const vatBlock = (mode, net) => {
  if (mode === "reverse") {
    return {
      rows: `<tr><td colspan="3" class="tr">VAT — domestic reverse charge</td><td class="tr">£0.00</td></tr>`,
      total: net,
      note: "Domestic reverse charge: customer to pay the VAT to HMRC. VAT Act 1994 s.55A applies.",
    };
  }
  if (mode === "standard") {
    const vat = net * 0.2;
    return { rows: `<tr><td colspan="3" class="tr">VAT @ 20%</td><td class="tr">${money(vat)}</td></tr>`, total: net + vat, note: "" };
  }
  return { rows: "", total: net, note: "" };
};

const linesTable = (lines, cols = ["Description", "Qty", "Rate", "Amount"]) => {
  const rows = lines
    .map((l) => `<tr><td>${esc(l.description)}</td><td class="tr">${l.qty}</td><td class="tr">${money(l.rate)}</td><td class="tr">${money(l.qty * l.rate)}</td></tr>`)
    .join("");
  return { html: `<table class="lines"><thead><tr>${cols.map((c, i) => `<th${i ? ' class="tr"' : ""}>${c}</th>`).join("")}</tr></thead><tbody>${rows}</tbody>`, net: lines.reduce((s, l) => s + l.qty * l.rate, 0) };
};

const para = (label, text) => (text ? `<div class="blk"><h3>${label}</h3><p>${esc(text).replace(/\n/g, "<br>")}</p></div>` : "");

function renderBody(doc) {
  const d = doc.data;
  const b = billing();
  const t = (label, value) => (value ? `<tr><th>${label}</th><td>${esc(value)}</td></tr>` : "");

  if (doc.template === "invoice" || doc.template === "application") {
    const isApp = doc.template === "application";
    const { html, net } = linesTable(d.lines || []);
    const less = isApp ? toNum(d.previouslyCertified) : 0;
    const afterLess = net - less;
    const vat = vatBlock(d.vatMode, afterLess);
    const bank = b.accountNumber
      ? `<div class="blk"><h3>Payment</h3><p>${esc(b.accountName)}${b.bankName ? " · " + esc(b.bankName) : ""}<br>Sort code ${esc(b.sortCode)} · Account ${esc(b.accountNumber)}<br>Terms: ${b.paymentTermsDays} days from the due date. Please quote ${esc(doc.number)}.</p></div>`
      : `<div class="blk"><h3>Payment</h3><p>Terms: ${b.paymentTermsDays} days from the due date. Please quote ${esc(doc.number)}.</p></div>`;
    return `
      <table class="meta">${t("To", d.client)}${t("Address", d.clientAddress)}${t("Client ref / PO", d.clientRef)}${t("Project", d.project)}${isApp ? t("Valuation period", d.period) + t("Application no.", d.applicationNo) : ""}${b.vatNumber ? t("VAT no.", b.vatNumber) : ""}</table>
      ${html}
      <tfoot>
      <tr><td colspan="3" class="tr"><b>${isApp ? "Gross valuation to date" : "Net total"}</b></td><td class="tr"><b>${money(net)}</b></td></tr>
      ${isApp ? `<tr><td colspan="3" class="tr">Less previously certified</td><td class="tr">(${money(less)})</td></tr><tr><td colspan="3" class="tr"><b>Sum applied for (net)</b></td><td class="tr"><b>${money(afterLess)}</b></td></tr>` : ""}
      ${vat.rows}
      <tr class="grand"><td colspan="3" class="tr"><b>${isApp ? "Total applied for" : "Total due"}</b></td><td class="tr"><b>${money(vat.total)}</b></td></tr>
      </tfoot></table>
      ${vat.note ? `<p class="legalnote">${vat.note}</p>` : ""}
      ${isApp ? `<p class="legalnote">This application is made under the contract's payment provisions and s.110–113 of the Housing Grants, Construction and Regeneration Act 1996. In the absence of a valid payment or pay-less notice, the sum applied for becomes the notified sum.</p>` : ""}
      ${para("Notes", d.notes)}
      ${bank}`;
  }

  if (doc.template === "quotation") {
    const { html, net } = linesTable(d.lines || [], ["Deliverable", "Qty", "Fee", "Amount"]);
    return `
      <table class="meta">${t("To", d.contact ? `${d.contact}, ${d.client}` : d.client)}${t("Engagement", d.project)}${t("Delivery model", d.model)}</table>
      ${html}<tfoot><tr class="grand"><td colspan="3" class="tr"><b>Total fee (excl. VAT)</b></td><td class="tr"><b>${money(net)}</b></td></tr></tfoot></table>
      ${para("Assumptions & exclusions", d.assumptions)}
      <div class="blk"><h3>Validity & acceptance</h3><p>This proposal remains open for acceptance for ${toNum(d.validityDays) || 30} days from the date above. Fees are fixed for the defined scope; changes are priced through a documented change process before commitment. Acceptance in writing (email suffices) instructs commencement.</p></div>`;
  }

  if (doc.template === "po") {
    const { html, net } = linesTable(d.lines || []);
    return `
      <table class="meta">${t("Supplier", d.supplier)}${t("Address", d.supplierAddress)}${t("Project / site", d.project)}${t("Package", d.package)}${t("Commencement", d.startDate)}</table>
      ${html}<tfoot><tr class="grand"><td colspan="3" class="tr"><b>Order value (excl. VAT)</b></td><td class="tr"><b>${money(net)}</b></td></tr></tfoot></table>
      <div class="blk"><h3>Payment terms</h3><p>Payment is 30 days from the contractual due date, subject to completed work, evidence, acceptance and any valid notice. Applications by day 20 of each month with progress measurement, labour and plant records, delivery evidence, inspection records, updated programme, forecast-to-complete, change documentation, defect status, EVM coding and CIS/VAT information. Payment is made against certified, verified Earned Value — never bare invoices or self-declared percent-complete.</p></div>
      ${d.cis === "yes" ? `<p class="legalnote">CIS: labour elements are subject to deduction at the rate confirmed by HMRC verification. Provide your UTR and company registration before first payment.</p>` : ""}
      ${para("Special conditions", d.notes)}`;
  }

  if (doc.template === "notice") {
    const isPayless = d.noticeType === "payless";
    return `
      <table class="meta">${t("To", d.supplier)}${t("Project / contract", d.project)}${t("Against application", d.applicationRef)}${t("Payment due date", d.dueDate)}${t("Final date for payment", d.finalDate)}</table>
      <div class="blk"><h3>${isPayless ? "Pay-less notice — s.111 HGCRA 1996" : "Payment notice — s.110A HGCRA 1996"}</h3>
      <table class="meta">
      <tr><th>Sum applied for</th><td>${money(d.appliedSum)}</td></tr>
      <tr><th>${isPayless ? "Sum considered due at the date of this notice" : "The notified sum"}</th><td><b>${money(d.notifiedSum)}</b></td></tr>
      </table></div>
      ${para("Basis of calculation", d.basis)}
      <p class="legalnote">This notice is given under the contract and the Housing Grants, Construction and Regeneration Act 1996 (as amended). The sum stated will be paid on or before the final date for payment unless a further notice is validly given.</p>`;
  }

  if (doc.template === "variation") {
    const { html, net } = linesTable(d.lines || [], ["Cost item", "Qty", "Value", "Amount"]);
    return `
      <table class="meta">${t("To", d.party)}${t("Project / contract", d.project)}${t("Variation", d.title)}${t("Contingency ref", d.contingency)}</table>
      ${para("Description of change", d.description)}
      ${d.lines?.length ? html + `<tfoot><tr class="grand"><td colspan="3" class="tr"><b>Variation value (excl. VAT)</b></td><td class="tr"><b>${money(net)}</b></td></tr></tfoot></table>` : ""}
      ${para("Programme effect", d.programmeEffect)}
      <p class="legalnote">This instruction is issued through the contract change process. ${d.contingency ? "The value is drawn against the referenced joint risk-register item under the defined drawdown process." : "No contingency drawdown is made by this instruction."} Do not proceed beyond the instructed scope.</p>`;
  }

  if (doc.template === "report") {
    return `
      <table class="meta">${t("Client", d.client)}${t("Project / site", d.project)}${t("Week ending", d.weekEnding)}</table>
      ${para("Progress this week", d.progress)}
      ${para("Service status", d.services)}
      ${para("Interfaces & constraints", d.interfaces)}
      ${para("Risks & lookahead", d.risks)}
      ${para("Decisions needed", d.decisions)}`;
  }
  return "<p>Unknown template.</p>";
}

router.get("/:id/render", tokenAuth, (req, res) => {
  const doc = collection("documents").find((x) => x.id === req.params.id);
  if (!doc) return res.status(404).send("Document not found.");
  const dateStr = new Date(doc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(doc.number)} — ${esc(doc.templateName)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #1d232a; margin: 0; background: #fff; }
  .page { max-width: 820px; margin: 0 auto; padding: 48px 52px 60px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #14181d; padding-bottom: 18px; }
  .wordmark { font-family: Arial Black, Arial, sans-serif; font-size: 30px; letter-spacing: -1px; }
  .wordmark small { display: block; font-family: Arial, sans-serif; font-size: 9px; font-weight: bold; letter-spacing: 3px; color: #9c7a3c; margin-top: 3px; }
  .docid { text-align: right; font-family: Arial, sans-serif; }
  .docid b { display: block; font-size: 17px; }
  .docid span { font-size: 12px; color: #5b6672; }
  h2.doctitle { font-family: Arial, sans-serif; font-size: 21px; margin: 26px 0 18px; }
  table.meta { border-collapse: collapse; margin: 0 0 20px; font-size: 13.5px; }
  table.meta th { text-align: left; padding: 4px 18px 4px 0; color: #5b6672; font-weight: normal; font-family: Arial, sans-serif; font-size: 12px; white-space: nowrap; vertical-align: top; }
  table.meta td { padding: 4px 0; }
  table.lines { border-collapse: collapse; width: 100%; font-size: 13.5px; margin: 8px 0 4px; }
  table.lines th { font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; text-align: left; border-bottom: 2px solid #14181d; padding: 8px 10px 6px 0; }
  table.lines td { border-bottom: 1px solid #dcd7cc; padding: 8px 10px 8px 0; vertical-align: top; }
  table.lines tfoot td { border-bottom: none; padding: 6px 10px 2px 0; }
  tr.grand td { border-top: 2px solid #14181d; padding-top: 10px; font-size: 15px; }
  .tr { text-align: right; }
  .blk { margin: 22px 0 0; }
  .blk h3 { font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #9c7a3c; margin: 0 0 6px; }
  .blk p { margin: 0; font-size: 13.5px; line-height: 1.6; }
  .legalnote { font-size: 12px; color: #5b6672; line-height: 1.55; border-left: 3px solid #9c7a3c; padding-left: 12px; margin: 18px 0 0; }
  .foot { margin-top: 46px; border-top: 1px solid #dcd7cc; padding-top: 14px; font-family: Arial, sans-serif; font-size: 10.5px; color: #5b6672; line-height: 1.6; }
  .toolbar { position: fixed; top: 14px; right: 16px; }
  .toolbar button { font-family: Arial, sans-serif; font-size: 13px; padding: 9px 20px; background: #14181d; color: #fff; border: 0; border-radius: 4px; cursor: pointer; }
  @media print { .toolbar { display: none; } .page { padding: 0; } }
</style></head><body>
<div class="toolbar"><button onclick="print()">Print / save as PDF</button></div>
<div class="page">
  <div class="head">
    <div class="wordmark">ETABLIX<small>INTEGRATED SITE SERVICES · PART OF GROUPE NSEYA</small></div>
    <div class="docid"><b>${esc(doc.number)}</b><span>${esc(doc.templateName)}<br>${dateStr}<br>Issued by ${esc(doc.issuedBy)}</span></div>
  </div>
  <h2 class="doctitle">${esc(doc.templateName)}${doc.data.project ? " — " + esc(doc.data.project) : ""}</h2>
  ${renderBody(doc)}
  <div class="foot">
    ETABLIX is a trading name of JNN GLOBAL LTD · Registered in England &amp; Wales · Company No. 15405437<br>
    Registered office: Groupe Nseya House, Kingstanding, Birmingham B44 8DJ, United Kingdom<br>
    contact@etablix.com · +44 7493 216101 · etablix.com
  </div>
</div></body></html>`);
});

export default router;
