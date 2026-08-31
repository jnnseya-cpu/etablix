/**
 * Internal Commercial Playbook — Commercial-in-Confidence.
 * Served ONLY through an authenticated employee session; this content is
 * deliberately absent from the public frontend files.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const PLAYBOOK_HTML = `
<h2>Commercial model — the three-rung ladder</h2>
<p>Advisory → Management Integrator → Prime Service Contractor. The ladder is also the sales funnel: an Advisory requirements package deliberately creates a procurement an integrator can win; a successful integration builds the supplier framework and cash position that make the Prime model safe. Every engagement is scoped so the next rung is the natural continuation.</p>
<p class="pb-warn">Naming rule: in client documents Model C is the <b>Prime Service Contractor</b>, never "Principal Service Contractor" — under CDM 2015 "Principal Contractor" is a defined legal role with specific health-and-safety duties. ETABLIX may separately agree to act as CDM Principal Contractor on some sites, but that must be an explicit, priced, insured decision — never an accident of branding.</p>

<h3>Model A — Advisory pricing</h3>
<table>
<tr><th>Deliverable</th><th>Indicative fee</th></tr>
<tr><td>Site-services feasibility review / Site Systems Diagnostic</td><td>£2,500 – £7,500</td></tr>
<tr><td>Site Management Requirements Package</td><td>£7,500 – £25,000</td></tr>
<tr><td>Workforce Village Requirements Package</td><td>£10,000 – £35,000</td></tr>
<tr><td>Procurement management and tender evaluation</td><td>£7,500 – £30,000</td></tr>
<tr><td>Mobilisation-readiness / village-readiness review</td><td>£5,000 – £15,000</td></tr>
</table>

<h3>Model B — Management Integrator pricing</h3>
<table>
<tr><th>Component</th><th>Basis</th></tr>
<tr><td>Mobilisation and planning fee</td><td>£15,000 – £50,000 fixed</td></tr>
<tr><td>Procurement fee</td><td>3% – 5% of procured supplier value</td></tr>
<tr><td>Monthly integration and management fee</td><td>£7,500 – £30,000 per month (scaled to package count and workforce)</td></tr>
<tr><td>Embedded site personnel</td><td>Cost + agreed margin, or day rates</td></tr>
<tr><td>CONSTRUX platform and reporting</td><td>£1,000 – £5,000 per month per project</td></tr>
<tr><td>Demobilisation and closeout fee</td><td>Fixed, scoped at appointment</td></tr>
</table>
<p>Model B is the engine of the first 18–24 months: recurring fee income, no supplier financing, and every project feeds the supplier database, rate benchmarks and the CONSTRUX product.</p>

<h3>Model C — Prime Service Contractor price build-up</h3>
<p>Present the 25% addition as a transparent stack — never as "20% overhead":</p>
<table>
<tr><th>Component</th><th>Rate on direct cost</th><th>What it pays for</th></tr>
<tr><td>Direct supplier and labour costs</td><td>100%</td><td>The audited base</td></tr>
<tr><td>Project management &amp; integration</td><td>8%</td><td>Site-services managers, planners, QS, HSE support, coordination</td></tr>
<tr><td>Corporate overhead recovery</td><td>5%</td><td>Insurance, accreditation, systems, back office</td></tr>
<tr><td>Profit and prime-contractor risk</td><td>7%</td><td>Margin and the price of single-point accountability</td></tr>
<tr><td>Controlled contingency</td><td>5%</td><td>Held against a joint risk register with a defined drawdown process</td></tr>
<tr><td><b>Total addition</b></td><td><b>25%</b></td><td>—</td></tr>
</table>
<p><b>Worked example on £1,000,000 forecast supplier cost:</b> direct £1,000,000 + PM/integration £80,000 + overhead £50,000 + profit/risk £70,000 + contingency £50,000 = <b>contract value £1,250,000</b>.</p>
<ul>
<li>Contingency is not hidden profit: drawn only against risk-register events through a change process; unused contingency is returned, shared 50/50 as a performance incentive, or retained only under a genuine fixed-price risk-transfer contract. Offering the client this choice at tender is itself a differentiator.</li>
<li>On low-risk, long-duration operate-phase work expect competitive pressure toward 15–18% total addition; on fast-mobilisation or remote work 25–30% is defensible. <b>Publish nothing; price each job from the stack.</b></li>
</ul>

<h2>Cash-flow architecture — the real product</h2>
<ul>
<li><b>Mobilisation advance:</b> before any material supplier order the client pays forecast Month-1 supplier expenditure + mobilisation fee + Month-1 management fee + early procurement commitments + applicable VAT + agreed early-risk contingency. No supplier POs until the contract is executed, the advance has cleared, the baseline is approved and credit protections are in place.</li>
<li><b>Rolling one-month cash reserve:</b> at each monthly valuation the client replenishes the fund so ETABLIX always holds at least the next month's forecast committed expenditure — a condition precedent with defined suspension mechanics if not replenished.</li>
<li><b>Monthly cycle:</b> Day 20 supplier submissions (in CONSTRUX) → 21–23 site verification and EVM assessment → 24 forecast/accrual/contingency review → 25 draft valuation → 26–28 joint review → month-end payment application (due-date trigger) → payment/pay-less notices per contract → final date for payment 14 days after due date → reserve replenished, supplier payments released.</li>
<li><b>Legal guardrails (UK):</b> distinct valuation, due, notice and final dates satisfying HGCRA 1996 ss.110–113; pay-when-paid is prohibited — supplier terms are "30 days from the contractual supplier due date, subject to completed work, evidence, acceptance and any valid notice", never "after the client pays us".</li>
<li><b>Exposure rule:</b> never let committed supplier exposure exceed cash reserve + confirmed receivables from investment-grade clients. Tier-ones will push 14-day terms to 30–45 days — concede the final-payment period if necessary; never concede the advance or the rolling reserve.</li>
<li><b>Tax mechanics:</b> CIS registration, verification, deductions and monthly returns; obtain gross payment status early. VAT domestic reverse charge applies to CIS-registered contractor clients (they don't pay ETABLIX the VAT — model the float per client); normal VAT for certified end users. DRC operations run on a separate fiscal stack through ETABLIX RDC SARL — never commingled.</li>
</ul>

<h2>Retention — modernised</h2>
<p>5% of interim certified work, capped at 5% of the supplier contract; 2.5% released at practical completion / accepted demobilisation, 2.5% at end of the 12-month defects period. No retention on pure supply, low-risk services or professional consultants. Alternatives to prefer: retention bonds, performance bonds, PCGs, defects escrow, warranties, service credits; reduced or zero retention for proven framework suppliers. Check the UK retention-prohibition implementation position at the date of every new supplier contract.</p>

<h2>Supplier payment discipline — application contents</h2>
<p>Monthly supplier applications must contain: progress measurement, labour and plant records, delivery evidence, inspection/acceptance records, updated programme, forecast-to-complete, change documentation, defect status, EVM coding and CIS/VAT information. Payment only against certified, verified work — 30-day terms from the contractual due date, electronic payment, early notification of disputes, no retrospective deductions, approved variations into the next valuation.</p>

<h2>EVM — the payment gate</h2>
<p>Suppliers are paid on Earned Value, evidenced by measurable quantities, completed deliverables, inspections, weighted milestones, photographic records and approved variations — never on bare invoices or self-declared percent-complete. SPI or CPI below 0.95 triggers recovery / commercial review.</p>

<h2>Risk register — top enterprise risks</h2>
<table>
<tr><th>Top risk</th><th>Mitigation</th></tr>
<tr><td>Client payment default or delay</td><td>Credit-check every client; investment-grade or secured only in Prime mode; rolling reserve as condition precedent; suspension rights; trade-credit insurance.</td></tr>
<tr><td>Supplier insolvency or default</td><td>Framework of pre-vetted suppliers with dual-sourcing on critical packages; performance bonds on major packages; step-in rights.</td></tr>
<tr><td>Interface / scope-gap liability</td><td>Single responsibility matrix in every contract; CONSTRUX interface register; PI insurance sized to advisory and management scope.</td></tr>
<tr><td>HSE incident on managed sites</td><td>Explicit CDM role allocation in every appointment; competent-person support; never accept safety duties by drafting accident.</td></tr>
<tr><td>Cash-flow crunch in Prime mode</td><td>The cash-flow architecture above; committed-exposure rule; invoice-finance facility as backstop.</td></tr>
<tr><td>Key-person concentration (founder)</td><td>Early hire of an operations director and a commercial manager; documented playbooks in CONSTRUX.</td></tr>
<tr><td>Regulatory change (retention ban, payment reform)</td><td>Contract templates reviewed by construction counsel annually; security model not retention-dependent.</td></tr>
</table>

<h2>Gates to be passed before the first Prime bid</h2>
<ol>
<li>Funded mobilisation advance and rolling-reserve mechanism agreed in principle with the client</li>
<li>PI, PL, EL and contractors' all-risks insurance placed at appropriate limits</li>
<li>Construction-counsel-reviewed contract suite (client-side and supplier-side, NEC4 TSC/FMC or bespoke)</li>
<li>CIS registration and VAT reverse-charge procedures live; gross payment status applied for</li>
<li>At least six months' overhead in cash plus a working-capital facility</li>
<li>A proven supplier framework from at least two completed Integrator projects</li>
</ol>

<h2>No-bid triggers</h2>
<ul>
<li>Customer refuses mobilisation funding for supplier commitments</li>
<li>Payment depends on an undefined certification process or unreasonably long cycle</li>
<li>Unlimited liability, uncapped delay damages or broad consequential-loss exposure</li>
<li>Fitness-for-purpose obligation beyond controllable scope or competence</li>
<li>ETABLIX expected to assume CDM or principal-contractor duties without authority, resources and price</li>
<li>Supplier contracts must be placed before upstream contract execution</li>
<li>Scope, performance standards or demobilisation responsibilities cannot be defined</li>
<li>Weak client credit with no security, escrow, bond or alternative protection</li>
<li>Project requires founder-funded mobilisation or exposes household finances</li>
<li>Ethical, labour, worker-accommodation, environmental or community standards cannot be maintained</li>
</ul>
<p class="pb-warn">The closing discipline: cash-flow structure — not headline contract value — determines survival. Every commercial decision is tested against one question: does this keep ETABLIX funded one month ahead of its committed supplier exposure?</p>
`;

/** GET /api/playbook — the commercial playbook (employees only). */
router.get("/", requireAuth, (req, res) => {
  res.json({ title: "ETABLIX Commercial Playbook", classification: "Commercial-in-Confidence", html: PLAYBOOK_HTML });
});

export default router;
