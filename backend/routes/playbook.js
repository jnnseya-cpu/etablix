/**
 * The Commercial Playbook index.
 *
 * This endpoint used to return the playbook itself: several thousand
 * words of pricing stacks, cash-flow rules, payment law and go-to-market
 * doctrine that someone was expected to read and then remember to
 * apply. Every rule in it is now enforced by a tool in the Control
 * Desk, which made the document the least reliable copy of its own
 * contents — the kind that goes stale silently while the code moves on.
 *
 * What it returns instead is an index: one row per rule, naming where
 * that rule is enforced and linking straight to it. Nothing here
 * restates a rate, threshold or period, because the tool owns those and
 * a second copy would eventually disagree with the first.
 *
 * Adding a rule to the business means building the tool and adding a
 * row. If a row has no tool to point at, that is the finding.
 *
 * Returns { title, classification, html } — a fragment the shell at
 * frontend/internal/playbook.html injects, not a whole page.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * Where each rule lives. `to` is a Control Desk deep link: the hash is
 * "panel" or "panel/section", resolved by openPanel() in app.js.
 */
const INDEX = [
  {
    group: "Pricing & the commercial model",
    rules: [
      { rule: "Three-rung ladder — Advisory, Management Integrator, Prime Service Contractor", tool: "Pricing studio", to: "commercial/pricing", note: "The three models, their fee bases, and why each engagement is scoped so the next rung is the natural continuation." },
      { rule: "Model 01 Advisory fee bands", tool: "Pricing studio", to: "commercial/pricing", note: "Each deliverable's band, with “Quote this” opening a pre-filled fee quotation in Documents." },
      { rule: "Model 02 Integrator fee build", tool: "Pricing studio", to: "commercial/pricing", note: "Live calculator: procured value, duration, procurement percentage, monthly fee, platform charge." },
      { rule: "Model 03 Prime price stack — never presented as “20% overhead”", tool: "Pricing studio", to: "commercial/pricing", note: "Builds the transparent stack from direct cost, component by component, including governed contingency." },
      { rule: "Naming rule — Prime, never “Principal Service Contractor”; never main contractor", tool: "Documents", to: "commercial/docs", note: "Enforced at generation. A document breaching it is refused with the reason, including text hidden in a line item." },
    ],
  },
  {
    group: "Cash flow — the real product",
    rules: [
      { rule: "Mobilisation advance cleared before any supplier order", tool: "Cash-flow desk", to: "commercial/cashflow", note: "Calculator for the advance and everything it must cover before a PO is placed." },
      { rule: "Rolling one-month cash reserve", tool: "Cash-flow desk", to: "commercial/cashflow", note: "Checked at each valuation; the automation alerts when the reserve falls below next month's forecast." },
      { rule: "Monthly valuation cycle, Day 20 to month-end", tool: "Cash-flow desk", to: "commercial/cashflow", note: "Open a cycle per project per month and tick each step as it completes." },
      { rule: "Exposure rule — committed exposure never exceeds reserve plus confirmed receivables", tool: "Cash-flow desk", to: "commercial/cashflow", note: "Computed live on every valuation and alerted on breach." },
      { rule: "HGCRA timetable — valuation, due, notice and final dates", tool: "Applications for payment", to: "suppliers", note: "Derived on receipt and carried on each application; deadlines are flagged before they bite, not after." },
      { rule: "Payment and pay-less notices (ss.110A, 111)", tool: "Documents", to: "commercial/docs", note: "Notice templates. The deadlines themselves are watched by the automation." },
      { rule: "Pay-when-paid prohibited in supplier terms", tool: "Supplier onboarding", to: "suppliers", note: "The terms every supplier accepts before their first order." },
    ],
  },
  {
    group: "Paying the supply chain",
    rules: [
      { rule: "Earned Value payment gate — SPI or CPI below 0.95 triggers review", tool: "EVM gate", to: "commercial/evm", note: "The same thresholds drive project health in the VERYX portfolio, so “at risk” means one thing everywhere." },
      { rule: "Certification against evidence, with reasons when certifying less than claimed", tool: "Applications for payment", to: "suppliers", note: "Reasons are required, recorded, and sent to the supplier with the certificate." },
      { rule: "Bank details verified by call-back before any payment", tool: "Applications for payment", to: "suppliers", note: "Payment is blocked in software until a named person confirms the call-back." },
      { rule: "Retention — 5% capped, staged release, alternatives preferred", tool: "Retention ledger", to: "commercial/retention", note: "What is held and released per supplier, with the release stages." },
      { rule: "CIS deduction and VAT domestic reverse charge", tool: "Applications for payment", to: "suppliers", note: "Applied at certification; reverse-charge wording is an option on invoices." },
    ],
  },
  {
    group: "Winning work",
    rules: [
      { rule: "No-bid triggers — ten reasons to walk away", tool: "Bid / No-bid screen", to: "commercial/bids", note: "Screen every opportunity against them; the verdict is computed, not argued." },
      { rule: "Gates before the first Prime bid", tool: "Gates & set-up", to: "commercial/gates", note: "Six gates that block a Prime verdict on the bid screen until they are passed." },
      { rule: "Public-sector routes to market", tool: "DPS pipeline", to: "commercial/dps", note: "Each route with what its selection stage demands and what is still missing, resolved against the set-up checklist." },
      { rule: "Named-account discipline — 30 accounts, weekly cadence", tool: "GTM accounts", to: "commercial/gtm", note: "Account tracker with stage, next action, owner and overdue actions." },
      { rule: "Company set-up checklist by workstream", tool: "Gates & set-up", to: "commercial/gates", note: "Ticking an item here clears it across every DPS route that needs it." },
    ],
  },
  {
    group: "Running the work",
    rules: [
      { rule: "Enterprise risk register", tool: "Risk register", to: "commercial/risks", note: "The top risks and their mitigations, maintained rather than recited." },
      { rule: "Project health across the portfolio", tool: "VERYX · Portfolio", to: "veryx", note: "Measured from schedule and cost performance; overridable by a manager, but only with a reason and never hiding what was measured." },
      { rule: "Interface register and project control", tool: "CONSTRUX · Projects", to: "construx", note: "Schedule, budget, RFIs, NCRs, inspections and site telemetry per project." },
      { rule: "NDA before sharing project information with a supplier", tool: "Enquiries & orders", to: "suppliers", note: "Enquiry packs stay sealed until the supplier accepts the NDA; accepting a quote mints the PO." },
      { rule: "Prequalification before a supplier is used", tool: "Supplier applications", to: "applications", note: "Twelve weighted criteria, four of them critical, assessed and recorded with feedback." },
      { rule: "Everything catalogued fires on every channel", tool: "Communications", to: "comms", note: "The event catalogue, with preview and test send per event." },
      { rule: "Standing checks run without being asked", tool: "Automation", to: "automation", note: "Exposure, reserve, HGCRA notice deadlines, platform health and the monthly portfolio snapshot." },
    ],
  },
];

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const HTML = `
<style>
  .pb-index table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .pb-index td { padding: 11px 12px 11px 0; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 0.9rem; }
  .pb-index td.pb-tool { text-align: right; padding-right: 0; width: 190px; }
  .pb-index td.pb-tool a { color: var(--orange-dark); font-weight: 600; text-decoration: none; font-size: 0.84rem; }
  .pb-index td.pb-tool a:hover { text-decoration: underline; }
  .pb-index .pb-note { color: var(--slate); font-weight: 400; font-size: 0.82rem; margin-top: 3px; max-width: 60ch; }
  .pb-index h2 { font-family: var(--font-head); font-size: 1rem; margin: 30px 0 8px; padding-bottom: 6px; border-bottom: 1.5px solid var(--ink); }
  .pb-index .pb-lede { color: var(--slate); font-size: 0.93rem; line-height: 1.6; max-width: 68ch; margin-bottom: 4px; }
  .pb-index .pb-foot { margin-top: 30px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--slate); font-size: 0.86rem; line-height: 1.6; max-width: 68ch; }
</style>
<div class="pb-index">
  <p class="pb-lede">Every rule below is enforced by a tool, not by memory. This page is the index to those tools — it deliberately holds no rates, thresholds or periods of its own, because the tool owns them and a second copy would eventually disagree with the first.</p>
  ${INDEX.map(
    (g) => `<h2>${esc(g.group)}</h2><table><tbody>${g.rules
      .map(
        (r) => `<tr>
        <td><b>${esc(r.rule)}</b><div class="pb-note">${esc(r.note)}</div></td>
        <td class="pb-tool"><a href="/internal/index.html#${esc(r.to)}">${esc(r.tool)} →</a></td>
      </tr>`
      )
      .join("")}</tbody></table>`
  ).join("")}
  <p class="pb-foot"><b>The closing discipline:</b> cash-flow structure, not headline contract value, determines survival. Every commercial decision is tested against one question — does this keep ETABLIX funded one month ahead of its committed supplier exposure? The cash-flow desk answers it; this page only points at the desk.</p>
  <p class="pb-foot">If a rule ever has no tool to link to, that is the finding: build the tool, then add the row.</p>
</div>`;

router.get("/", requireAuth, (req, res) => {
  res.json({
    title: "Commercial Playbook",
    classification: "Commercial-in-Confidence",
    html: HTML,
    rules: INDEX.reduce((n, g) => n + g.rules.length, 0),
  });
});

export default router;
