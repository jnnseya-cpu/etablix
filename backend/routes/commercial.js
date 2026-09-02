/**
 * Commercial OS — the Commercial Playbook as working tools, not a
 * document. Everything here persists in the store and fires real
 * communication events:
 *
 *   /model        pricing bands and the Model C stack (source of truth)
 *   /opportunities  bid / no-bid screening with the ten triggers
 *   /gates        the six prime-bid gates
 *   /setup        the company set-up checklist by workstream
 *   /risks        the enterprise risk register
 *   /accounts     the GTM named-account tracker (30-account discipline)
 *   /valuations   the monthly valuation cycle + exposure rule
 *   /evm          the EVM payment gate (SPI/CPI ≥ 0.95)
 *   /retentions   the modernised retention ledger
 *
 * Access levels come from shared ACCESS: COMMERCIAL for pricing, bids,
 * GTM, gates and set-up; DELIVERY_FINANCE (adds project managers) for
 * valuations, EVM, retention and the risk register.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES, ACCESS } from "../../shared/constants.js";
import { collection, insert, update, remove, getSettings, saveSettings } from "../lib/store.js";
import { emit } from "../lib/comms.js";

const router = Router();
router.use(requireAuth);

const commercial = requireRole(...ACCESS.COMMERCIAL);
const deliveryFinance = requireRole(...ACCESS.DELIVERY_FINANCE);
const admin = requireRole(ROLES.ADMIN);

const clampStr = (v, max = 400) => String(v ?? "").trim().slice(0, max);
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ---------------------------------------------------------------- model

const MODEL = {
  namingRule:
    'In client documents Model C is the "Prime Service Contractor", never "Principal Service Contractor" — under CDM 2015 "Principal Contractor" is a defined legal role with specific health-and-safety duties. Acting as CDM Principal Contractor must be an explicit, priced, insured decision — never an accident of branding.',
  modelA: {
    name: "Model A — Advisory",
    items: [
      { deliverable: "Site-services feasibility review / Site Systems Diagnostic", low: 2500, high: 7500 },
      { deliverable: "Site Management Requirements Package", low: 7500, high: 25000 },
      { deliverable: "Workforce Village Requirements Package", low: 10000, high: 35000 },
      { deliverable: "Procurement management and tender evaluation", low: 7500, high: 30000 },
      { deliverable: "Mobilisation-readiness / village-readiness review", low: 5000, high: 15000 },
    ],
  },
  modelB: {
    name: "Model B — Management Integrator",
    note: "The engine of the first 18–24 months: recurring fee income, no supplier financing, and every project feeds the supplier database, rate benchmarks and the CONSTRUX product.",
    components: [
      { component: "Mobilisation and planning fee", basis: "£15,000 – £50,000 fixed", lowFee: 15000, highFee: 50000, kind: "fixed" },
      { component: "Procurement fee", basis: "3% – 5% of procured supplier value", lowPct: 3, highPct: 5, kind: "pct" },
      { component: "Monthly integration and management fee", basis: "£7,500 – £30,000 per month (scaled to package count and workforce)", lowFee: 7500, highFee: 30000, kind: "monthly" },
      { component: "Embedded site personnel", basis: "Cost + agreed margin, or day rates", kind: "cost-plus" },
      { component: "CONSTRUX platform and reporting", basis: "£1,000 – £5,000 per month per project", lowFee: 1000, highFee: 5000, kind: "monthly" },
      { component: "Demobilisation and closeout fee", basis: "Fixed, scoped at appointment", kind: "fixed" },
    ],
  },
  modelC: {
    name: "Model C — Prime Service Contractor",
    presentation: 'Present the 25% addition as a transparent stack — never as "20% overhead".',
    stack: [
      { id: "pm", component: "Project management & integration", pct: 8, pays: "Site-services managers, planners, QS, HSE support, coordination" },
      { id: "overhead", component: "Corporate overhead recovery", pct: 5, pays: "Insurance, accreditation, systems, back office" },
      { id: "profit", component: "Profit and prime-contractor risk", pct: 7, pays: "Margin and the price of single-point accountability" },
      { id: "contingency", component: "Controlled contingency", pct: 5, pays: "Held against a joint risk register with a defined drawdown process" },
    ],
    contingencyRule:
      "Contingency is not hidden profit: drawn only against risk-register events through a change process; unused contingency is returned, shared 50/50 as a performance incentive, or retained only under a genuine fixed-price risk-transfer contract. Offering the client this choice at tender is itself a differentiator.",
    pricingBands:
      "On low-risk, long-duration operate-phase work expect competitive pressure toward 15–18% total addition; on fast-mobilisation or remote work 25–30% is defensible. Publish nothing; price each job from the stack.",
  },
  cashflow: {
    advanceComponents: [
      "Forecast Month-1 supplier expenditure",
      "Mobilisation fee",
      "Month-1 management fee",
      "Early procurement commitments",
      "Applicable VAT",
      "Agreed early-risk contingency",
    ],
    preconditions:
      "No supplier POs until the contract is executed, the advance has cleared, the baseline is approved and credit protections are in place.",
    cycle: [
      { id: "d20", label: "Day 20 — supplier submissions (in CONSTRUX)" },
      { id: "d21_23", label: "Day 21–23 — site verification and EVM assessment" },
      { id: "d24", label: "Day 24 — forecast, accrual and contingency review" },
      { id: "d25", label: "Day 25 — draft valuation" },
      { id: "d26_28", label: "Day 26–28 — joint review with client" },
      { id: "application", label: "Month-end — payment application (due-date trigger)" },
      { id: "notices", label: "Payment / pay-less notices per contract" },
      { id: "payment", label: "Final date for payment — 14 days after due date" },
      { id: "replenished", label: "Reserve replenished · supplier payments released" },
    ],
    legal:
      "Distinct valuation, due, notice and final dates satisfying HGCRA 1996 ss.110–113. Pay-when-paid is prohibited — supplier terms are \"30 days from the contractual supplier due date, subject to completed work, evidence, acceptance and any valid notice\", never \"after the client pays us\".",
    exposureRule:
      "Never let committed supplier exposure exceed cash reserve + confirmed receivables from investment-grade clients. Concede the final-payment period if a tier-one pushes 14-day terms to 30–45 days; never concede the advance or the rolling reserve.",
    tax:
      "CIS registration, verification, deductions and monthly returns; obtain gross payment status early. VAT domestic reverse charge applies to CIS-registered contractor clients (they don't pay ETABLIX the VAT — model the float per client); normal VAT for certified end users. DRC operations run on a separate fiscal stack through ETABLIX RDC SARL — never commingled.",
  },
  retention: {
    rule: "5% of interim certified work, capped at 5% of the supplier contract; 2.5% released at practical completion / accepted demobilisation, 2.5% at end of the 12-month defects period. No retention on pure supply, low-risk services or professional consultants.",
    alternatives: ["Retention bond", "Performance bond", "PCG", "Defects escrow", "Warranties", "Service credits", "Zero retention (framework supplier)", "Cash retention"],
    check: "Check the UK retention-prohibition implementation position at the date of every new supplier contract.",
  },
  evmRule:
    "Suppliers are paid on Earned Value, evidenced by measurable quantities, completed deliverables, inspections, weighted milestones, photographic records and approved variations — never on bare invoices or self-declared percent-complete. SPI or CPI below 0.95 triggers recovery / commercial review.",
  applicationContents: [
    "Progress measurement", "Labour and plant records", "Delivery evidence", "Inspection / acceptance records",
    "Updated programme", "Forecast-to-complete", "Change documentation", "Defect status", "EVM coding", "CIS / VAT information",
  ],
  noBidTriggers: [
    { id: "t1", text: "Customer refuses mobilisation funding for supplier commitments" },
    { id: "t2", text: "Payment depends on an undefined certification process or unreasonably long cycle" },
    { id: "t3", text: "Unlimited liability, uncapped delay damages or broad consequential-loss exposure" },
    { id: "t4", text: "Fitness-for-purpose obligation beyond controllable scope or competence" },
    { id: "t5", text: "ETABLIX expected to assume CDM or principal-contractor duties without authority, resources and price" },
    { id: "t6", text: "Supplier contracts must be placed before upstream contract execution" },
    { id: "t7", text: "Scope, performance standards or demobilisation responsibilities cannot be defined" },
    { id: "t8", text: "Weak client credit with no security, escrow, bond or alternative protection" },
    { id: "t9", text: "Project requires founder-funded mobilisation or exposes household finances" },
    { id: "t10", text: "Ethical, labour, worker-accommodation, environmental or community standards cannot be maintained" },
  ],
  primeGates: [
    { id: "g1", text: "Funded mobilisation advance and rolling-reserve mechanism agreed in principle with the client" },
    { id: "g2", text: "PI, PL, EL and contractors' all-risks insurance placed at appropriate limits" },
    { id: "g3", text: "Construction-counsel-reviewed contract suite (client-side and supplier-side, NEC4 TSC/FMC or bespoke)" },
    { id: "g4", text: "CIS registration and VAT reverse-charge procedures live; gross payment status applied for" },
    { id: "g5", text: "At least six months' overhead in cash plus a working-capital facility" },
    { id: "g6", text: "A proven supplier framework from at least two completed Integrator projects" },
  ],
  gtm: {
    thesis:
      "Account-based selling to people who already know us, with software as the proof. The first market is a named list of 20–30 accounts: GE Vernova alumni, the EPCs and transmission-owner supply-chain teams the founder dealt with, and the Project Directors who lived the supplier-coordination pain we solve. We do not advertise to this market; we write to it.",
    assets: [
      { asset: "Network + GE Vernova experience", role: "The door. The wedge product is the paid Requirements Package — low-risk for the buyer (£10–35k, fixed fee), and it deliberately creates the integrator procurement ETABLIX then wins. Every advisory sale is a rigged pipeline for Model B." },
      { asset: "MarketWar OS", role: "The outbound engine: competitive teardowns, tender-portal and Achilles UVDB / Constructionline monitoring, 30-account enrichment (planning applications and DCO consents predict site-services demand 12–18 months out), and the founder-voice LinkedIn authority campaign." },
      { asset: "CONSTRUX", role: "The demo and the Trojan horse. Shown live in every pitch; every advisory deliverable is delivered inside CONSTRUX so the client's baseline already lives on our OS at mobilisation. Standalone Site Services licences convert self-managers later." },
      { asset: "VERYX", role: "The enterprise wrapper and the second door into every account: CONSTRUX sells at project altitude, VERYX at portfolio altitude; land at either, expand to the other." },
    ],
    cadence: "30 named accounts · one authority post weekly · two Requirements Package proposals a month · first integrator conversion by month 9 · Prime only through existing clients.",
    stages: ["identified", "researched", "contacted", "meeting", "proposal", "advisory_client", "integrator_client", "prime_client", "dormant"],
    phases: [
      { phase: "Phase 1 · months 0–6 — establish and sell Advisory", target: "4–6 advisory assignments, £60k–£120k revenue, two written case studies. Accreditations: Constructionline Gold, an SSIP scheme, begin Achilles UVDB; start ISO 9001/45001/14001 gap-work." },
      { phase: "Phase 2 · months 6–18 — first Integrator appointments", target: "Convert at least one advisory client to Management Integrator on a live project. Stand up CONSTRUX Site Services; recruit a site-services manager and a QS; 40+ vetted suppliers across 15 categories. £400k–£800k fee revenue run-rate. Open the DRC file with one paid village study." },
      { phase: "Phase 3 · months 18–24 — Prime, selectively", target: "Bid Prime only through the gates, ideally with an existing client, bounded scope first (e.g. the worker village only). Exit rate at month 24: £2m–£4m annualised across the three models, CONSTRUX licensed on every live project, one DRC village mandate in mobilisation." },
    ],
  },
  setupChecklist: [
    { id: "legal", workstream: "Legal", items: [
      { id: "legal1", text: "Companies House registration — ETABLIX, trading name of JNN GLOBAL LTD (Company No. 15405437)" },
      { id: "legal2", text: "Name and trade-mark clearance (UKIPO classes 35/37/43); domains" },
      { id: "legal3", text: "Shareholders' agreement placing ETABLIX within the Groupe Nseya structure" },
      { id: "legal4", text: "Construction counsel engaged for the contract suite" },
    ]},
    { id: "tax", workstream: "Tax & finance", items: [
      { id: "tax1", text: "CIS contractor registration" },
      { id: "tax2", text: "VAT registration with domestic-reverse-charge procedures" },
      { id: "tax3", text: "Gross payment status application" },
      { id: "tax4", text: "Business banking with a segregated client-float account" },
      { id: "tax5", text: "Management-accounting pack mirroring the CONSTRUX dashboard" },
      { id: "tax6", text: "Invoice-finance facility scoped" },
    ]},
    { id: "insurance", workstream: "Insurance", items: [
      { id: "ins1", text: "Professional indemnity (advisory / management scope)" },
      { id: "ins2", text: "Public liability" },
      { id: "ins3", text: "Employers' liability" },
      { id: "ins4", text: "Contractors' all-risks (Prime mode)" },
      { id: "ins5", text: "Trade-credit cover considered" },
    ]},
    { id: "hse", workstream: "Compliance & HSE", items: [
      { id: "hse1", text: "CDM 2015 competence file" },
      { id: "hse2", text: "H&S policy and arrangements" },
      { id: "hse3", text: "SSIP accreditation (e.g. SafeContractor / Acclaim)" },
      { id: "hse4", text: "Constructionline (target Gold)" },
      { id: "hse5", text: "Achilles UVDB (utilities buying route)" },
      { id: "hse6", text: "ISO 9001 / 45001 / 14001 roadmap" },
    ]},
    { id: "product", workstream: "Product", items: [
      { id: "prod1", text: "CONSTRUX Site Services & Village module specification into the dev backlog: control accounts, EVM engine, valuation workflow, supplier portal, occupancy management, executive dashboard" },
    ]},
    { id: "people", workstream: "People", items: [
      { id: "ppl1", text: "Founder as MD" },
      { id: "ppl2", text: "Hire 1 — Operations Director" },
      { id: "ppl3", text: "Hire 2 — Commercial Director / Senior Commercial Manager" },
      { id: "ppl4", text: "Hire 3 — Technical and Preconstruction Manager" },
      { id: "ppl5", text: "Hire 4 — Business Development and Bid Manager" },
      { id: "ppl6", text: "Hire 5 — Procurement and Supply Chain Manager" },
      { id: "ppl7", text: "Hire 6 — HSEQ and Assurance Manager" },
      { id: "ppl8", text: "Hire 7 — Finance and Administration Manager (full-time or fractional)" },
    ]},
    { id: "drc", workstream: "DRC", items: [
      { id: "drc1", text: "ETABLIX RDC SARL (RCCM / OHADA) when the first paid study lands" },
      { id: "drc2", text: "Local accounting, tax and labour advice" },
      { id: "drc3", text: "BitriPay rails for local supplier and payroll payments" },
    ]},
  ],
  enterpriseRiskSeed: [
    { risk: "Client payment default or delay", mitigation: "Credit-check every client; investment-grade or secured only in Prime mode; rolling reserve as condition precedent; suspension rights; trade-credit insurance.", owner: "Commercial", status: "open" },
    { risk: "Supplier insolvency or default", mitigation: "Framework of pre-vetted suppliers with dual-sourcing on critical packages; performance bonds on major packages; step-in rights.", owner: "Procurement", status: "open" },
    { risk: "Interface / scope-gap liability", mitigation: "Single responsibility matrix in every contract; CONSTRUX interface register; PI insurance sized to advisory and management scope.", owner: "Technical", status: "open" },
    { risk: "HSE incident on managed sites", mitigation: "Explicit CDM role allocation in every appointment; competent-person support; never accept safety duties by drafting accident.", owner: "HSEQ", status: "open" },
    { risk: "Cash-flow crunch in Prime mode", mitigation: "The cash-flow architecture; committed-exposure rule; invoice-finance facility as backstop.", owner: "Finance", status: "open" },
    { risk: "Key-person concentration (founder)", mitigation: "Early hire of an operations director and a commercial manager; documented playbooks in CONSTRUX.", owner: "MD", status: "open" },
    { risk: "Regulatory change (retention ban, payment reform)", mitigation: "Contract templates reviewed by construction counsel annually; security model not retention-dependent.", owner: "Commercial", status: "open" },
  ],
  closingDiscipline:
    "Cash-flow structure — not headline contract value — determines survival. Every commercial decision is tested against one question: does this keep ETABLIX funded one month ahead of its committed supplier exposure?",
};

router.get("/model", commercial, (req, res) => res.json({ model: MODEL }));

// ---------------------------------------------------- opportunities (bid screen)

function verdict(opp) {
  const tripped = MODEL.noBidTriggers.filter((t) => opp.triggers?.[t.id]).map((t) => t.id);
  if (tripped.length) return { verdict: "NO-BID", tripped };
  if (opp.model === "C") {
    const gates = getSettings().prime_gates || {};
    const missing = MODEL.primeGates.filter((g) => !gates[g.id]?.done).map((g) => g.id);
    if (missing.length) return { verdict: "BLOCKED-BY-GATES", tripped, missingGates: missing };
  }
  return { verdict: "BID", tripped };
}

const withVerdict = (opp) => ({ ...opp, ...verdict(opp) });

router.get("/opportunities", commercial, (req, res) =>
  res.json({ opportunities: [...collection("opportunities")].reverse().map(withVerdict), triggers: MODEL.noBidTriggers })
);

router.post("/opportunities", commercial, (req, res) => {
  const { name, client, model, value, notes } = req.body || {};
  if (!clampStr(name)) return res.status(400).json({ error: "Give the opportunity a name." });
  const opp = insert("opportunities", {
    name: clampStr(name, 140),
    client: clampStr(client, 140),
    model: ["A", "B", "C"].includes(model) ? model : "B",
    value: toNum(value),
    notes: clampStr(notes, 2000),
    triggers: {},
    screenedBy: req.user.name,
  });
  res.status(201).json({ opportunity: withVerdict(opp) });
});

router.patch("/opportunities/:id", commercial, async (req, res) => {
  const patch = {};
  if (req.body.triggers && typeof req.body.triggers === "object") {
    patch.triggers = Object.fromEntries(MODEL.noBidTriggers.map((t) => [t.id, Boolean(req.body.triggers[t.id])]));
  }
  for (const k of ["name", "client", "notes"]) if (k in req.body) patch[k] = clampStr(req.body[k], k === "notes" ? 2000 : 140);
  if ("model" in req.body && ["A", "B", "C"].includes(req.body.model)) patch.model = req.body.model;
  if ("value" in req.body) patch.value = toNum(req.body.value);
  patch.screenedBy = req.user.name;
  const row = update("opportunities", req.params.id, patch);
  if (!row) return res.status(404).json({ error: "Opportunity not found." });
  const v = withVerdict(row);
  if (patch.triggers) {
    await emit("bid.screened", {
      vars: { actor: req.user.name, item: row.name, company: row.client || "—", outcome: v.verdict },
    }).catch(() => {});
  }
  res.json({ opportunity: v });
});

router.delete("/opportunities/:id", admin, (req, res) => {
  const row = remove("opportunities", req.params.id);
  if (!row) return res.status(404).json({ error: "Opportunity not found." });
  res.json({ deleted: true });
});

// ---------------------------------------------------------------- gates & set-up

router.get("/gates", commercial, (req, res) => {
  const state = getSettings().prime_gates || {};
  res.json({ gates: MODEL.primeGates.map((g) => ({ ...g, ...state[g.id] })) });
});

router.patch("/gates/:id", commercial, async (req, res) => {
  const gate = MODEL.primeGates.find((g) => g.id === req.params.id);
  if (!gate) return res.status(404).json({ error: "Unknown gate." });
  const state = { ...(getSettings().prime_gates || {}) };
  const done = Boolean(req.body?.done);
  state[gate.id] = { done, by: req.user.name, at: Date.now() };
  saveSettings({ prime_gates: state });
  if (done) await emit("gate.passed", { vars: { actor: req.user.name, item: gate.text } }).catch(() => {});
  res.json({ gates: MODEL.primeGates.map((g) => ({ ...g, ...state[g.id] })) });
});

router.get("/setup", commercial, (req, res) => {
  const state = getSettings().setup_checklist || {};
  res.json({
    workstreams: MODEL.setupChecklist.map((w) => ({
      ...w,
      items: w.items.map((i) => ({ ...i, ...state[i.id] })),
    })),
  });
});

router.patch("/setup/:id", commercial, (req, res) => {
  const item = MODEL.setupChecklist.flatMap((w) => w.items).find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Unknown checklist item." });
  const state = { ...(getSettings().setup_checklist || {}) };
  state[item.id] = { done: Boolean(req.body?.done), by: req.user.name, at: Date.now() };
  saveSettings({ setup_checklist: state });
  res.json({ ok: true });
});

// ------------------------------------------------------- enterprise risk register

router.get("/risks", deliveryFinance, (req, res) => {
  const rows = collection("enterpriseRisks");
  if (!rows.length) for (const r of MODEL.enterpriseRiskSeed) insert("enterpriseRisks", r);
  res.json({ risks: collection("enterpriseRisks") });
});

router.post("/risks", deliveryFinance, (req, res) => {
  const { risk, mitigation, owner } = req.body || {};
  if (!clampStr(risk)) return res.status(400).json({ error: "Describe the risk." });
  const row = insert("enterpriseRisks", {
    risk: clampStr(risk, 240),
    mitigation: clampStr(mitigation, 600),
    owner: clampStr(owner, 60) || "—",
    status: "open",
  });
  res.status(201).json({ risk: row });
});

router.patch("/risks/:id", deliveryFinance, (req, res) => {
  const patch = {};
  for (const k of ["risk", "mitigation", "owner"]) if (k in req.body) patch[k] = clampStr(req.body[k], k === "mitigation" ? 600 : 240);
  if ("status" in req.body && ["open", "mitigated", "closed"].includes(req.body.status)) patch.status = req.body.status;
  const row = update("enterpriseRisks", req.params.id, patch);
  if (!row) return res.status(404).json({ error: "Risk not found." });
  res.json({ risk: row });
});

router.delete("/risks/:id", admin, (req, res) => {
  const row = remove("enterpriseRisks", req.params.id);
  if (!row) return res.status(404).json({ error: "Risk not found." });
  res.json({ deleted: true });
});

// ------------------------------------------------------------ GTM named accounts

router.get("/accounts", commercial, (req, res) => {
  const accounts = [...collection("accounts")].reverse();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  res.json({
    accounts,
    stages: MODEL.gtm.stages,
    kpis: {
      total: accounts.length,
      target: 30,
      inConversation: accounts.filter((a) => ["contacted", "meeting", "proposal"].includes(a.stage)).length,
      clients: accounts.filter((a) => a.stage.endsWith("_client")).length,
      proposalsThisMonth: accounts.filter((a) => a.stage === "proposal" && (a.stageChangedAt || a.createdAt) >= monthStart).length,
      overdueActions: accounts.filter((a) => a.nextActionDate && a.nextActionDate < new Date().toISOString().slice(0, 10) && !a.stage.endsWith("_client")).length,
    },
  });
});

router.post("/accounts", commercial, (req, res) => {
  const { company, contact, contactRole, sector, relationship, stage, nextAction, nextActionDate, owner, notes } = req.body || {};
  if (!clampStr(company)) return res.status(400).json({ error: "Name the account." });
  const row = insert("accounts", {
    company: clampStr(company, 140),
    contact: clampStr(contact, 100),
    contactRole: clampStr(contactRole, 100),
    sector: clampStr(sector, 60),
    relationship: clampStr(relationship, 100),
    stage: MODEL.gtm.stages.includes(stage) ? stage : "identified",
    nextAction: clampStr(nextAction, 200),
    nextActionDate: clampStr(nextActionDate, 10),
    owner: clampStr(owner, 60) || req.user.name,
    notes: clampStr(notes, 2000),
    stageChangedAt: Date.now(),
  });
  res.status(201).json({ account: row });
});

router.patch("/accounts/:id", commercial, (req, res) => {
  const patch = {};
  for (const k of ["company", "contact", "contactRole", "sector", "relationship", "nextAction", "owner"]) {
    if (k in req.body) patch[k] = clampStr(req.body[k], 200);
  }
  if ("notes" in req.body) patch.notes = clampStr(req.body.notes, 2000);
  if ("nextActionDate" in req.body) patch.nextActionDate = clampStr(req.body.nextActionDate, 10);
  if ("stage" in req.body && MODEL.gtm.stages.includes(req.body.stage)) {
    patch.stage = req.body.stage;
    patch.stageChangedAt = Date.now();
  }
  patch.lastTouch = Date.now();
  const row = update("accounts", req.params.id, patch);
  if (!row) return res.status(404).json({ error: "Account not found." });
  res.json({ account: row });
});

router.delete("/accounts/:id", admin, (req, res) => {
  const row = remove("accounts", req.params.id);
  if (!row) return res.status(404).json({ error: "Account not found." });
  res.json({ deleted: true });
});

// -------------------------------------------------- valuations & the exposure rule

const valuationDerived = (v) => {
  const cover = (v.reserveHeld || 0) + (v.receivables || 0);
  return {
    ...v,
    exposureOk: (v.committedExposure || 0) <= cover,
    reserveOk: (v.reserveHeld || 0) >= (v.forecastNext || 0),
    cover,
  };
};

router.get("/valuations", deliveryFinance, (req, res) => {
  res.json({
    valuations: [...collection("valuations")].sort((a, b) => (b.month > a.month ? 1 : -1)).map(valuationDerived),
    cycle: MODEL.cashflow.cycle,
  });
});

router.post("/valuations", deliveryFinance, (req, res) => {
  const { project, month } = req.body || {};
  if (!clampStr(project) || !/^\d{4}-\d{2}$/.test(month || "")) {
    return res.status(400).json({ error: "Give a project name and a month (YYYY-MM)." });
  }
  if (collection("valuations").some((v) => v.project === project.trim() && v.month === month)) {
    return res.status(409).json({ error: "A valuation for that project and month already exists." });
  }
  const row = insert("valuations", {
    project: clampStr(project, 140),
    month,
    steps: {},
    reserveHeld: toNum(req.body.reserveHeld),
    forecastNext: toNum(req.body.forecastNext),
    committedExposure: toNum(req.body.committedExposure),
    receivables: toNum(req.body.receivables),
    notes: clampStr(req.body.notes, 1000),
  });
  res.status(201).json({ valuation: valuationDerived(row) });
});

router.patch("/valuations/:id", deliveryFinance, async (req, res) => {
  const row = collection("valuations").find((v) => v.id === req.params.id);
  if (!row) return res.status(404).json({ error: "Valuation not found." });
  const patch = {};
  if (req.body.step && MODEL.cashflow.cycle.some((s) => s.id === req.body.step)) {
    patch.steps = { ...row.steps, [req.body.step]: req.body.done ? { done: true, by: req.user.name, at: Date.now() } : undefined };
    if (!req.body.done) delete patch.steps[req.body.step];
  }
  for (const k of ["reserveHeld", "forecastNext", "committedExposure", "receivables"]) {
    if (k in req.body) patch[k] = toNum(req.body[k]);
  }
  if ("notes" in req.body) patch.notes = clampStr(req.body.notes, 1000);
  const before = valuationDerived(row);
  const updated = valuationDerived(update("valuations", req.params.id, patch));
  // The exposure rule fires the moment a number takes a project past cover.
  if (before.exposureOk && !updated.exposureOk) {
    const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB");
    await emit("exposure.breach", {
      vars: { project: updated.project, amount: money(updated.committedExposure) },
      detailsText: `Committed supplier exposure: ${money(updated.committedExposure)}\nCash reserve held: ${money(updated.reserveHeld)}\nConfirmed receivables: ${money(updated.receivables)}\nCover shortfall: ${money(updated.committedExposure - updated.cover)}`,
    }).catch(() => {});
  }
  if (before.reserveOk && !updated.reserveOk) {
    await emit("reserve.low", { vars: { project: updated.project } }).catch(() => {});
  }
  res.json({ valuation: updated });
});

router.delete("/valuations/:id", admin, (req, res) => {
  const row = remove("valuations", req.params.id);
  if (!row) return res.status(404).json({ error: "Valuation not found." });
  res.json({ deleted: true });
});

// -------------------------------------------------------------- EVM payment gate

const evmDerived = (r) => {
  const spi = r.pv > 0 ? r.ev / r.pv : null;
  const cpi = r.ac > 0 ? r.ev / r.ac : null;
  return {
    ...r,
    spi: spi === null ? null : Number(spi.toFixed(3)),
    cpi: cpi === null ? null : Number(cpi.toFixed(3)),
    gate: (spi !== null && spi < 0.95) || (cpi !== null && cpi < 0.95) ? "review" : "pass",
  };
};

router.get("/evm", deliveryFinance, (req, res) =>
  res.json({ records: [...collection("evmRecords")].reverse().map(evmDerived), rule: MODEL.evmRule, applicationContents: MODEL.applicationContents })
);

router.post("/evm", deliveryFinance, async (req, res) => {
  const { project, supplier, period, pv, ev, ac, evidence } = req.body || {};
  if (!clampStr(project) || !clampStr(supplier) || !/^\d{4}-\d{2}$/.test(period || "")) {
    return res.status(400).json({ error: "Give project, supplier and period (YYYY-MM)." });
  }
  const row = insert("evmRecords", {
    project: clampStr(project, 140),
    supplier: clampStr(supplier, 140),
    period,
    pv: toNum(pv),
    ev: toNum(ev),
    ac: toNum(ac),
    evidence: clampStr(evidence, 600),
    enteredBy: req.user.name,
  });
  const derived = evmDerived(row);
  if (derived.gate === "review") {
    const which = [derived.spi !== null && derived.spi < 0.95 ? `SPI ${derived.spi}` : null, derived.cpi !== null && derived.cpi < 0.95 ? `CPI ${derived.cpi}` : null]
      .filter(Boolean)
      .join(", ");
    await emit("evm.breach", { vars: { item: `${derived.supplier} (${which})`, project: derived.project } }).catch(() => {});
  }
  res.status(201).json({ record: derived });
});

router.delete("/evm/:id", admin, (req, res) => {
  const row = remove("evmRecords", req.params.id);
  if (!row) return res.status(404).json({ error: "Record not found." });
  res.json({ deleted: true });
});

// ------------------------------------------------------------- retention ledger

const retentionDerived = (r) => {
  const held = Math.min(0.05 * (r.certifiedToDate || 0), 0.05 * (r.contractValue || 0));
  const pcTranche = held / 2;
  return {
    ...r,
    retentionHeld: Number((held - (r.pcReleased ? pcTranche : 0) - (r.finalReleased ? pcTranche : 0)).toFixed(2)),
    trancheValue: Number(pcTranche.toFixed(2)),
  };
};

router.get("/retentions", deliveryFinance, (req, res) =>
  res.json({ retentions: [...collection("retentions")].reverse().map(retentionDerived), rule: MODEL.retention })
);

router.post("/retentions", deliveryFinance, (req, res) => {
  const { project, supplier, contractValue, certifiedToDate, instrument, defectsEndDate, notes } = req.body || {};
  if (!clampStr(project) || !clampStr(supplier)) return res.status(400).json({ error: "Give project and supplier." });
  const row = insert("retentions", {
    project: clampStr(project, 140),
    supplier: clampStr(supplier, 140),
    contractValue: toNum(contractValue),
    certifiedToDate: toNum(certifiedToDate),
    instrument: MODEL.retention.alternatives.includes(instrument) ? instrument : "Cash retention",
    defectsEndDate: clampStr(defectsEndDate, 10),
    pcReleased: false,
    finalReleased: false,
    notes: clampStr(notes, 600),
  });
  res.status(201).json({ retention: retentionDerived(row) });
});

router.patch("/retentions/:id", deliveryFinance, (req, res) => {
  const patch = {};
  for (const k of ["contractValue", "certifiedToDate"]) if (k in req.body) patch[k] = toNum(req.body[k]);
  for (const k of ["pcReleased", "finalReleased"]) if (k in req.body) patch[k] = Boolean(req.body[k]);
  if ("instrument" in req.body && MODEL.retention.alternatives.includes(req.body.instrument)) patch.instrument = req.body.instrument;
  if ("defectsEndDate" in req.body) patch.defectsEndDate = clampStr(req.body.defectsEndDate, 10);
  if ("notes" in req.body) patch.notes = clampStr(req.body.notes, 600);
  const row = update("retentions", req.params.id, patch);
  if (!row) return res.status(404).json({ error: "Record not found." });
  res.json({ retention: retentionDerived(row) });
});

router.delete("/retentions/:id", admin, (req, res) => {
  const row = remove("retentions", req.params.id);
  if (!row) return res.status(404).json({ error: "Record not found." });
  res.json({ deleted: true });
});

export default router;
