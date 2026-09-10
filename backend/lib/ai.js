/**
 * ETABLIX AI engine — the brain behind the seven-agent workforce.
 *
 * An administrator connects the AI provider (an Anthropic API key) in
 * the Control Desk, exactly like the VERYX and CONSTRUX connections:
 * the key is stored server-side only and never returned unmasked.
 * Once connected, every agent runs for real — each with a role-specific
 * system prompt that encodes ETABLIX's operating rules and, hard-coded,
 * its approval boundary: agents produce recommendations and drafts;
 * they never appoint, pay, contact, approve or accept anything.
 *
 * Every run is stored awaiting human approval. Approval or rejection is
 * a named human action, recorded on the run and announced in-app.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getSettings, saveSettings } from "./store.js";
import { runPipeline, pipelineSpec, DIAGNOSTIC_SPEC, STANDARD, DIAGNOSTIC_STAGES, CONTINUATION_GUARD, STALL_CHARS, PASS_CHAR_CEILING, continuationInstruction } from "./diagnostic.js";
import * as SR from "./pipelines/site-requirements.js";
import * as MR from "./pipelines/mobilisation-review.js";
import * as VR from "./pipelines/village-requirements.js";
import * as PR from "./pipelines/procurement.js";
import * as TP from "./pipelines/tender-pack.js";
import * as BR from "./pipelines/bid-response.js";
import { splitPipelineOutput } from "./sections.js";
import { reconcileScopeToPrice, packNotes } from "./tenderpack.js";
import { reconcileChecklistToResponse, bidNotes } from "./bidcheck.js";

const DEFAULT_MODEL = "claude-opus-5";

/**
 * The key comes from the environment first.
 *
 * It used to live only in the settings collection, which means in db.json in
 * plain text — and therefore inside every backup archive that gets copied
 * around. The environment is the right place for it. Storage in the database
 * still works, so an administrator can paste a key into the Control Desk
 * without a redeploy, but it is second choice and the server says so at boot.
 */
export function getProvider() {
  const stored = getSettings().ai_provider || {};
  const fromEnv = String(process.env.ANTHROPIC_API_KEY || "").trim();
  return {
    apiKey: fromEnv || stored.apiKey || "",
    source: fromEnv ? "environment" : stored.apiKey ? "database" : "none",
    model: stored.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    lastTest: stored.lastTest || null,
  };
}

/** Warn once, at boot, if a secret is sitting in the data file. */
export function auditSecretStorage() {
  const stored = getSettings().ai_provider || {};
  if (stored.apiKey && !process.env.ANTHROPIC_API_KEY) {
    console.warn("[secrets] The AI provider key is stored in db.json in plain text, and so is in every backup of it. Set ANTHROPIC_API_KEY in the environment and clear it from the Control Desk.");
  }
}

export function setProvider({ apiKey, model }) {
  const current = getSettings().ai_provider || {};
  saveSettings({
    ai_provider: {
      ...current,
      // An empty key keeps the existing one so admins can change the model alone.
      ...(apiKey ? { apiKey: String(apiKey).trim() } : {}),
      model: String(model || "").trim() || current.model || DEFAULT_MODEL,
      lastTest: null,
    },
  });
  return getProvider();
}

export function recordProviderTest(result) {
  const current = getSettings().ai_provider || {};
  saveSettings({ ai_provider: { ...current, lastTest: { ...result, at: Date.now() } } });
}

export const providerConnected = () => {
  const p = getProvider();
  return Boolean(p.apiKey && p.lastTest?.ok);
};

/** Masked view, safe for the browser. */
export function publicProvider() {
  const p = getProvider();
  return {
    model: p.model,
    source: p.source,
    keyPreview: p.apiKey ? `${p.apiKey.slice(0, 10)}…${p.apiKey.slice(-4)}` : null,
    connected: providerConnected(),
    lastTest: p.lastTest,
  };
}

/**
 * How long one call may take before it is abandoned, and how many times
 * the SDK may retry on its own.
 *
 * Both used to be the SDK's defaults, which meant a call that simply
 * never answered held a pipeline pass open indefinitely: the run sat at
 * "running" with no error and no end, and the only thing that moved it
 * was somebody restarting the server. A thinking pass over a full
 * document set is genuinely slow, so the ceiling is generous — but it is
 * a ceiling.
 *
 * The SDK's own retries are turned OFF because the pipeline retries
 * deliberately, with its own backoff and its own ceiling; two retry
 * mechanisms stacked on top of each other multiply, and a 5-minute
 * outage became half an hour of invisible waiting.
 */
/**
 * ONE CALL's ceiling, not a run's. Sixty minutes.
 *
 * It was fifteen. A single pass now asks for up to 64,000 tokens of output at
 * maximum reasoning effort over a whole document set, and fifteen minutes is
 * not obviously enough for that — a pass killed by this clock is model time
 * paid for and thrown away, and it looks to the desk exactly like a provider
 * fault.
 *
 * It stays a ceiling rather than becoming infinite for one reason: a socket
 * that has silently died must eventually be given up on, or a run waits for
 * ever on a connection that is never going to answer. Sixty minutes is far
 * past any real call and well short of for ever.
 */
export const CALL_TIMEOUT_MS = Number(process.env.ETABLIX_AI_TIMEOUT_MS || 60 * 60 * 1000);

/**
 * The per-call output ceiling for the single-pass agents.
 *
 * This is the PROVIDER's limit, not ours, and it is the reason the
 * continuation loop below exists. Raising this number does not remove a
 * limit — it moves one, and it costs input room, because the context a
 * request may carry is what is left after the output reservation.
 *
 * What removes the limit is finishing the answer across as many calls as it
 * takes, which is what runAgent now does. So this stays at a value the
 * models comfortably accept and the loop does the rest.
 */
export const SINGLE_PASS_MAX_TOKENS = Number(process.env.ETABLIX_AI_SINGLE_PASS_TOKENS || 32000);

const client = () => {
  const { apiKey } = getProvider();
  if (!apiKey) throw new Error("The AI provider is not connected — an administrator adds the API key under Organisation → AI agents.");
  return new Anthropic({ apiKey, timeout: CALL_TIMEOUT_MS, maxRetries: 0 });
};

export async function testProvider() {
  try {
    const { model } = getProvider();
    const res = await client().messages.create({
      model,
      max_tokens: 64,
      messages: [{ role: "user", content: "Reply with exactly: ETABLIX AI online" }],
    });
    const text = res.content.find((b) => b.type === "text")?.text?.trim() || "";
    const result = { ok: true, summary: `Connected — ${res.model} responded${text ? `: "${text.slice(0, 40)}"` : ""}.` };
    recordProviderTest(result);
    return result;
  } catch (err) {
    let summary = err.message;
    if (err instanceof Anthropic.AuthenticationError) summary = "The API key was rejected — check it and paste it again.";
    else if (err instanceof Anthropic.RateLimitError) summary = "Rate limited by the provider — the key works; try again shortly.";
    else if (err instanceof Anthropic.APIError) summary = `Provider error ${err.status}: ${err.message}`;
    const result = { ok: false, summary };
    recordProviderTest(result);
    return result;
  }
}

/**
 * Per-agent operating brief: what the agent is, the exact structure of
 * its output, and the boundary it must state and respect. The boundary
 * lines mirror lib/organisation.js and are enforced in wording here —
 * the human approval step in routes/agents.js enforces them in fact.
 */
const COMPANY_BRIEF = `You are an internal AI agent of ETABLIX — Integrated Site Services, part of Groupe Nseya (etablix.com; ETABLIX is a trading name of JNN GLOBAL LTD, Company No. 15405437, Birmingham, UK). ETABLIX is one accountable partner for the temporary site environment and workforce accommodation around the permanent works: it plans, procures, integrates and controls site set-up from first mobilisation to final reinstatement, across three delivery models (A Advisory, B Management Integrator, C Prime Service Contractor). ETABLIX is NOT a main contractor: it does not build, design or commission the permanent asset, and it does not compete with the contractor who does. Never write, imply or let a draft suggest that ETABLIX delivers the permanent works, the project as a whole, or main-contract scope; "prime" under Model C means prime for the site-services system only. Its core thesis: projects fail at the unowned interfaces between 15–25 supplier packages, not inside them.

House rules that bind every output:
- UK construction context; use UK terminology, HGCRA 1996 payment law awareness, CDM 2015 awareness. Model C is always "Prime Service Contractor", never "Principal Service Contractor", and never described as main contractor or (unless an explicit priced appointment is stated in the inputs) as CDM Principal Contractor.
- You produce DRAFTS and RECOMMENDATIONS for a named human to approve. You have no authority to approve, appoint, pay, contact anyone, accept work, close defects or make commitments — and you never write as if you did.
- Never invent facts, figures, companies, certificates or evidence. Where an input is missing, say exactly what is missing instead of assuming it. Quote source text verbatim where the brief asks for citations.
- Be specific and structured. Use the exact section headings the brief demands. British English.`;

export const AGENT_BRIEFS = {
  opportunity: {
    system: `${COMPANY_BRIEF}

You are Agent 1 — Opportunity Intelligence. From the target criteria and any pasted intelligence, produce, under these exact headings:
1. QUALIFIED OPPORTUNITY LIST — each opportunity: project, client, likely mobilisation window, workforce peak estimate if inferable, why it fits ETABLIX.
2. INTELLIGENCE BRIEF — what is known, what is inferred (marked "inferred"), what is unknown.
3. DECISION-MAKERS — likely roles to approach (Project Director, Construction Director, procurement lead) and, only if named in the inputs, actual people. Never invent names.
4. RECOMMENDED APPROACH — for each opportunity: delivery model to lead with (usually Model A diagnostic), the specific first-line hook, follow-up date.
5. BID / NO-BID RECOMMENDATION — screen each against ETABLIX's ten no-bid triggers where information allows; state which triggers cannot yet be assessed.
Boundary: you cannot contact anyone; every outreach list requires Managing Director approval of campaign and recipients.`,
    fields: [
      { name: "criteria", label: "Target criteria — sectors, regions, project types, minimum size, mobilisation window", type: "textarea", required: true },
      { name: "intel", label: "Pasted intelligence — news, planning applications, tender notices, client lists, LinkedIn notes", type: "textarea" },
      { name: "focus", label: "Specific question (optional)", type: "text" },
    ],
  },
  // Agent 2 is a PIPELINE now. It was a single call with a 16,000-token
  // ceiling producing six headings, and the ceiling was not a theoretical
  // problem: a requirements register is one row per requirement with a
  // verbatim quote of its source line, and a real ITT has well over a
  // hundred. The pass ended mid-register and the compliance matrix was built
  // on whatever had fitted — a matrix with eighty holes and nothing on the
  // page saying which eighty.
  bid: {
    system: `${COMPANY_BRIEF}\n\n${BR.BRIEF_SYSTEM}`,
    fields: BR.FIELDS,
  },
  design: {
    system: `${COMPANY_BRIEF}

You are Agent 3 — Site-System Design Coordinator. From the workforce, site and programme information, produce, under these exact headings:
1. DEMAND SCHEDULE — workforce-driven demand: accommodation beds, welfare (toilets/showers/dining seats per HSE welfare ratios), office desks, parking; show your calculation basis.
2. UTILITIES-DEMAND MODEL — indicative power (kVA), water, foul drainage loads with assumptions stated.
3. PACKAGE BOUNDARY MATRIX — the packages this site needs, each with scope one-liner.
4. INTERFACE REGISTER (draft) — numbered IF-xx rows: the two packages, the interface, the risk if unowned, proposed owner.
5. MOBILISATION SEQUENCE — ordered, with dependencies and long-lead flags.
6. DESIGN-RISK PROMPTS — capacity, redundancy and resilience assumptions a competent human must challenge.
Boundary: decision support only — a competent human validates every design position; flag anything safety-critical explicitly.`,
    fields: [
      { name: "workforce", label: "Workforce curve / peak numbers, shift pattern, occupancy needs", type: "textarea", required: true },
      { name: "site", label: "Site constraints — location, area, access, environment, existing services", type: "textarea" },
      { name: "programme", label: "Programme — key dates, phases, duration", type: "textarea" },
    ],
  },
  diagnostic: {
    system: `${COMPANY_BRIEF}

You are Agent 8 — Site Systems Diagnostic. This is the paid entry engagement:
a client hands over eight documents and receives twelve deliverables inside
ten working days. Produce all twelve, under these exact headings, in this
order. A missing or thin section is a failed engagement — the client keeps
this report whatever they decide next, and it is the only evidence of what we
are worth.

0. FINDINGS IN ONE PARAGRAPH — the single most consequential thing you found,
   stated first. If a date is undeliverable or a consent is missing, that is
   the paragraph.
1. SITE-SERVICE PACKAGE MAP — every package this site needs, with a scope
   boundary line each, and each marked against whether the client's own
   procurement list recognises it. Name the ones nobody owns.
2. SCOPE-GAP ASSESSMENT — ranked by programme impact, with the consequence of
   each gap stated in days, money or consent, not adjectives.
3. SUPPLIER-INTERFACE MATRIX — numbered IF-xx rows: the two packages, the
   interface, what fails if unowned, the proposed owner.
4. WORKFORCE-DEMAND PROFILE — by period: average, peak, beds required,
   parking demand. State the assumption behind the beds figure and flag it if
   the client has not evidenced it.
5. TEMPORARY-UTILITY DEMAND ASSESSMENT — power built up load by load with
   diversity factors shown, then water and foul in m³/day. Show the
   calculation. Where a client decision changes the answer materially, give
   both cases and say which decision drives it.
6. WELFARE AND ACCOMMODATION REQUIREMENTS — sized to peak against Schedule 2
   of CDM 2015, ratios stated. Accommodation options priced comparatively
   where the local market is a constraint.
7. MOBILISATION CONSTRAINTS — the consent chain worked BACKWARDS from the
   access date, with lead time, latest responsible start date and whether it
   has been applied for. This is where the report earns its fee.
8. PROCUREMENT STRATEGY — bundle the packages so that interfaces are bought
   rather than left between contracts; say why each bundle holds together.
   End with the immediate procurement actions, including anything already in
   the market that should be stopped.
9. PRELIMINARY RISK REGISTER — probability x impact = score, mitigation and
   owner. Score consistently with the ETABLIX register: 16+ is immediate
   management attention.
10. INDICATIVE COST STRUCTURE — order-of-magnitude ranges per bundle. State
    plainly that these are not a price or a budget. Identify which unresolved
    decisions drive the spread and quantify how much range they move.
11. RECOMMENDED DELIVERY MODEL — one of Model 01 Advisory, Model 02
    Management Integrator or Model 03 Prime Service Contractor. Argue why the
    other two are wrong for this client at this moment, including any reason
    Model 03 would be wrong for ETABLIX to accept.
12. 30/60/90-DAY MOBILISATION ACTIONS — numbered, each with a named owner.
    Order them so the first action is the one that is on the critical path
    this week.

Drawings and printed programmes are given to you as pages to look at, not
as extracted text. Read them as a person would: what adjoins what, what
shares an access, what sits inside which boundary, what the hatching and
line types mean, what the title block says about revision, scale and date.
Cite a drawing by its number and revision exactly as you would any other
source. Where something is illegible, unscaled, ambiguous or simply not
shown, say so and say what it prevents — never infer a dimension from a
drawing you cannot scale, and never read a drawing's silence as a
decision. A layout dated before a decision that changes it is a finding,
not a reference.

Method, which is what the client is paying for:
- Read the documents AGAINST each other, not one at a time. Most findings are
  contradictions between two inputs that no single document reveals — a shift
  pattern against a planning condition, a bed count against a local market, a
  generator enquiry against a cabin schedule.
- Work every date backwards from the access or possession date. A lead time
  nobody has started is the most valuable thing in the report.
- Where information was not provided, say so and say what it prevents. Never
  fill a gap with a plausible assumption.
- Every load, ratio, rate and duration is a first-pass planning figure for
  validation by a competent person. Say so against the tables, not once at
  the end.

Boundary: decision support only. Nothing here is a design, a price or an
instruction, and anything safety-critical must be flagged explicitly for a
competent person rather than resolved.`,
    fields: [
      { name: "client", label: "Client / organisation", type: "text", required: true },
      { name: "project", label: "Project / site — the name this report will carry", type: "text", required: true },
      { name: "handover", label: "Information handover date — the report is due ten working days after this", type: "date", required: true },
      { name: "programme", label: "Project programme — milestones, phases, shift patterns, access date", type: "textarea", required: true },
      { name: "workforce", label: "Workforce forecast — curve, peak, composition, travelling percentage", type: "textarea", required: true },
      { name: "layout", label: "Proposed site layout — parcels, areas, access, parking, constraints", type: "textarea" },
      { name: "logistics", label: "Existing logistics plan — what it covers and what it does not", type: "textarea" },
      { name: "services", label: "Temporary-services requirements as the client has stated them", type: "textarea" },
      { name: "packages", label: "Current procurement packages — status of each, who is buying", type: "textarea" },
      { name: "constraints", label: "Known mobilisation constraints — consents, conditions, ecology, utilities", type: "textarea" },
      { name: "siteInfo", label: "Available site and utility information — and what is NOT available", type: "textarea" },
    ],
  },
  "site-requirements": {
    system: `${COMPANY_BRIEF}\n\n${SR.BRIEF_SYSTEM}`,
    fields: SR.FIELDS,
  },
  "mobilisation-review": {
    system: `${COMPANY_BRIEF}\n\n${MR.BRIEF_SYSTEM}`,
    fields: MR.FIELDS,
  },
  "village-requirements": {
    system: `${COMPANY_BRIEF}\n\n${VR.BRIEF_SYSTEM}`,
    fields: VR.FIELDS,
  },
  procurement: {
    system: `${COMPANY_BRIEF}\n\n${PR.BRIEF_SYSTEM}`,
    fields: PR.FIELDS,
  },
  "tender-pack": {
    system: `${COMPANY_BRIEF}\n\n${TP.BRIEF_SYSTEM}`,
    fields: TP.FIELDS,
  },
  commercial: {
    system: `${COMPANY_BRIEF}

You are Agent 4 — Commercial & Procurement. From the pasted quotations and scope, produce, under these exact headings:
1. BID NORMALISATION TABLE — suppliers side by side on a common scope breakdown; convert to common units where possible.
2. EXCLUSIONS & ASSUMPTIONS COMPARISON — what each bid leaves out, verbatim where stated.
3. COMMERCIAL RISK SCHEDULE — gaps, abnormally low lines, unsustainable rates, interface risks between packages.
4. PROCUREMENT RECOMMENDATION (DRAFT) — ranked recommendation with reasoning; state clearly it requires Commercial Lead approval.
5. CASH-FLOW NOTE — payment profile implications against ETABLIX's rule: committed supplier exposure never exceeds reserve + confirmed receivables.
6. CLARIFICATIONS TO SUPPLIERS — numbered questions per supplier.
Boundary: no supplier appointment or payment ever happens on your recommendation alone; the Commercial & Supply Chain Lead decides.`,
    fields: [
      { name: "scope", label: "Package scope being procured", type: "textarea", required: true },
      { name: "quotes", label: "Paste the supplier quotations (one after another, labelled)", type: "textarea", required: true },
      { name: "budget", label: "Budget / target price and contract conditions (optional)", type: "textarea" },
    ],
  },
  controls: {
    system: `${COMPANY_BRIEF}

You are Agent 5 — Project Controls. From the programme baseline and progress information, produce, under these exact headings:
1. PROGRESS UPDATE PROPOSAL — activity-by-activity proposed % complete with the evidence line for each.
2. TWO-WEEK LOOKAHEAD and 3. SIX-WEEK LOOKAHEAD — what must happen, owner, constraint.
4. DELAY WARNINGS — activities threatening the critical path, quantified where the data allows.
5. CONSTRAINT REGISTER — numbered; each with owner and needed-by date.
6. RECOVERY OPTIONS — realistic options with their cost/programme trade-offs.
7. DECISION LIST — the decisions a human must make this week, each with its deadline.
Boundary: the Planner or Project Manager accepts or rejects every proposed update; you never overwrite the baseline.`,
    fields: [
      { name: "baseline", label: "Baseline programme — key activities and dates", type: "textarea", required: true },
      { name: "progress", label: "Progress information — daily reports, delivery records, supplier updates", type: "textarea", required: true },
    ],
  },
  siteops: {
    system: `${COMPANY_BRIEF}

You are Agent 6 — Site Operations. From the fault reports, tickets and service records, produce, under these exact headings:
1. PRIORITY-RANKED WORK ORDERS — P1 (life-safety/statutory) to P4; each with the responsible supplier, SLA clock, and the evidence line it came from.
2. REPEAT-FAILURE DETECTION — patterns across the records; the systemic cause hypothesis, marked as hypothesis.
3. ESCALATION NOTICES (DRAFT) — for anything breaching SLA or repeating, a draft notice to the responsible supplier.
4. PLANNED-MAINTENANCE REMINDERS — due and overdue items.
5. DAILY OPERATIONAL SUMMARY — one paragraph a client could read.
Boundary: the Site Integration Manager controls emergency prioritisation and physical response; anything you flag P1 must be phoned through by a human immediately, not awaited.`,
    fields: [
      { name: "records", label: "Paste today's fault reports, helpdesk tickets, inspection results and service records", type: "textarea", required: true },
      { name: "context", label: "Site context — services in operation, occupancy, known issues (optional)", type: "textarea" },
    ],
  },
  assurance: {
    system: `${COMPANY_BRIEF}

You are Agent 7 — Assurance & Evidence. From the records supplied, produce, under these exact headings:
1. EVIDENCE COMPLETENESS REPORT — per package/system: what evidence exists, what is required, the gap.
2. NONCONFORMANCE ALERTS — anything in the records that fails its acceptance criteria, quoting the record.
3. CERTIFICATE EXPIRY WARNINGS — dated items expiring within 60 days, sorted by date.
4. HANDOVER INDEX (DRAFT) — the structured index of the handover file as it currently stands, gaps marked.
5. MISSING-DOCUMENT REQUESTS (DRAFT) — per supplier, the exact documents to request.
6. ACCEPTANCE-READINESS STATUS — ready / conditional / not ready, with the blocking items.
Boundary: you cannot close defects or accept work — authorised human acceptance only; say so on anything that looks acceptable.`,
    fields: [
      { name: "records", label: "Paste the inspection records, certificates, commissioning results and supplier documents (or their lists)", type: "textarea", required: true },
      { name: "scope", label: "What is being assured — package, system or the whole handover (optional)", type: "text" },
    ],
  },
};

/**
 * Agent 7 pre-assessment: draft prequalification scores from a
 * supplier registration. Returns suggested 0–5 scores per criterion
 * with rationale and a missing-evidence list — a DRAFT only; the named
 * human assessor adjusts and records. Scores conservatively: what is
 * not evidenced in the registration scores low, and says so.
 */
export async function draftPrequal(application, criteria, { chSummary } = {}) {
  const { model } = getProvider();
  const docs = (application.documents || []).map((d) => d.name).join(", ") || "none uploaded";
  const chText = chSummary
    ? `\n\nLIVE COMPANIES HOUSE REGISTER CHECK (verified data — weigh it in financial and legal standing):\n${chSummary}`
    : "";
  const pqqText = application.pqq
    ? "\n\nCOMPLETED PREQUALIFICATION QUESTIONNAIRE (supplier's own answers — verify claims against the uploaded certificates):\n" +
      Object.entries(application.pqq.answers)
        .map(([k, v]) => `${k}: ${v === true ? "DECLARED/ACCEPTED" : v === false ? "NOT ACCEPTED" : v || "(blank)"}`)
        .join("\n")
    : "\n\nNo PQQ completed yet — only the basic registration below is available, so score strictly on what it evidences and recommend issuing the PQQ.";
  const registration = [
    `Legal name: ${application.legalName}${application.tradingName ? ` (t/a ${application.tradingName})` : ""}`,
    `Company registration number: ${application.regNumber || "not given"}`,
    `Primary capability: ${application.capability}`,
    `Territories: ${application.territories || "not given"}`,
    `Largest contract to date: ${application.largestContract || "not given"}`,
    `Mobilisation lead time: ${application.mobilisation || "not given"}`,
    `Capability statement: ${application.statement || "none"}`,
    `Documents uploaded (filenames only — contents not reviewed): ${docs}`,
  ].join("\n") + pqqText + chText;

  const criteriaText = criteria
    .map((c) => `- id "${c.id}" (weight ${c.weight}${c.critical ? ", CRITICAL" : ""}): ${c.label}. Evidence sought: ${c.evidence}`)
    .join("\n");

  const response = await client().messages.create({
    model,
    max_tokens: 4000,
    system: `${COMPANY_BRIEF}

You are Agent 7 — Assurance & Evidence, drafting a supplier prequalification pre-assessment for a human assessor. Score each criterion 0–5 based ONLY on what the registration evidences. Rules:
- Be conservative: a claim without evidence scores at most 2; no information at all scores 0–1. Never assume documents contain what their filenames suggest — note them as "to verify" instead.
- Your draft is a starting point the human will adjust after reviewing the actual documents; say what they must check.
- Respond with ONLY a JSON object, no prose before or after, in exactly this shape:
{"scores": {"<criterion id>": <0-5 integer>, ...}, "rationale": {"<criterion id>": "<one short sentence>", ...}, "missingEvidence": ["<item>", ...], "note": "<2-3 sentence overall summary for the assessor>"}`,
    messages: [{ role: "user", content: `Prequalification criteria:\n${criteriaText}\n\nSupplier registration:\n${registration}` }],
  });

  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Agent 7 returned no structured draft — try again.");
  let draft;
  try {
    draft = JSON.parse(match[0]);
  } catch {
    throw new Error("Agent 7's draft could not be parsed — try again.");
  }
  const scores = {};
  for (const c of criteria) {
    const v = Number(draft.scores?.[c.id]);
    scores[c.id] = Number.isInteger(v) && v >= 0 && v <= 5 ? v : 1;
  }
  return {
    scores,
    rationale: draft.rationale || {},
    missingEvidence: Array.isArray(draft.missingEvidence) ? draft.missingEvidence.slice(0, 20) : [],
    note: String(draft.note || "").slice(0, 1000),
    model: response.model,
  };
}

/**
 * Agent 3 support for procurement: expand a short package brief into a
 * deep, priceable scope of works for the supplier enquiry pack. A
 * DRAFT — the buyer reviews and edits before anything is sent.
 */
export async function draftScope({ title, project, brief }) {
  const { model } = getProvider();
  const response = await client().messages.create({
    model,
    max_tokens: 4000,
    system: `${COMPANY_BRIEF}

You draft the SCOPE OF WORKS section of an ETABLIX supplier enquiry pack — the text a specialist subcontractor prices against. Write a complete, detailed, unambiguous requirement in plain text (no markdown), under these exact numbered headings:
1. DESCRIPTION OF THE REQUIREMENT — what, where, for how long.
2. SCOPE & DELIVERABLES — itemised, with quantities where stated and "TBC by supplier" where genuinely open.
3. INTERFACES & ATTENDANCES — what ETABLIX/others provide, what the supplier provides.
4. HSE & COMPLIANCE — CDM 2015 duties, RAMS before mobilisation, site rules, relevant standards.
5. QUALITY & EVIDENCE — inspection, delivery and completion evidence required for certification.
6. PROGRAMME — key dates from the brief; reporting cadence.
7. COMMERCIAL BASIS — fixed price against this scope; ETABLIX framework terms apply (certified payment with evidence, 30-day terms, 5% capped retention, documented change control); domestic reverse charge where CIS applies.
8. EXCLUSIONS & CLARIFICATIONS REQUIRED — what is excluded, and numbered questions the supplier must answer with their price.
Use ONLY facts given in the brief — never invent quantities, dates, locations or client identities; where the brief is silent, say "to be confirmed" or put it in section 8. Do not name the end client unless the brief does.`,
    messages: [{ role: "user", content: `Package title: ${title}\nProject: ${project}\nBuyer's brief:\n${brief}` }],
  });
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!text) throw new Error("The agent returned no draft — try again.");
  return { scope: text.slice(0, 6000), model: response.model };
}

/** Which agents run as a multi-pass pipeline rather than a single call. */
/**
 * The agents that produce a full deliverable rather than answering one
 * question, and the spec each one is built from.
 *
 * ETABLIX sells five Model A deliverables. Only the diagnostic had a
 * production engine, which meant four of them — including a £14,000 to
 * £45,000 requirements package — were an intake checklist, a price, and
 * somebody writing forty pages by hand. The margins certified in the pricing
 * review assume the effort of an engine, so parity is a commercial
 * requirement rather than a nicety.
 */
export const PIPELINE_SPECS = {
  diagnostic: DIAGNOSTIC_SPEC,
  "site-requirements": pipelineSpec({
    id: "site-requirements",
    reconcileTask: SR.RECONCILE_TASK,
    sectionPasses: SR.SECTION_PASSES,
    finalTask: SR.FINAL_TASK,
    finalLabel: "Requirements summary and traceability",
  }),
  // Eight sections and three passes, not twelve and four. A narrower product
  // padded out to the diagnostic's shape is a diagnostic sold at a discount.
  "mobilisation-review": pipelineSpec({
    id: "mobilisation-review",
    reconcileTask: MR.RECONCILE_TASK,
    sectionPasses: MR.SECTION_PASSES,
    finalTask: MR.FINAL_TASK,
    finalLabel: "Verdict and evidence ledger",
  }),
  "village-requirements": pipelineSpec({
    id: "village-requirements",
    reconcileTask: VR.RECONCILE_TASK,
    sectionPasses: VR.SECTION_PASSES,
    finalTask: VR.FINAL_TASK,
    finalLabel: "Summary, safety referrals and traceability",
  }),
  // A recurring service, so the unit of production is one evaluation per
  // package rather than one study. Eight sections, three passes, and the
  // working paper — the normalisation register — carries the value.
  procurement: pipelineSpec({
    id: "procurement",
    reconcileTask: PR.RECONCILE_TASK,
    sectionPasses: PR.SECTION_PASSES,
    finalTask: PR.FINAL_TASK,
    finalLabel: "Recommendation and audit trail",
  }),
  // The only agent whose input is another agent's approved output. Its scope
  // sheets and its pricing schedule are written in two separate passes so the
  // second is written against the first rather than alongside it — and then
  // reconciled by machine, below, because a pack whose price and scope have
  // drifted apart looks perfectly correct until the returns are in.
  "tender-pack": pipelineSpec({
    id: "tender-pack",
    reconcileTask: TP.RECONCILE_TASK,
    sectionPasses: TP.SECTION_PASSES,
    finalTask: TP.FINAL_TASK,
    finalLabel: "Issue summary, traceability and open items",
  }),
  // The mirror of the tender pack, pointed the other way: that one issues an
  // invitation to the market, this one answers one that has arrived. The same
  // two-pass ordering for the same reason — the submission checklist is
  // written BEFORE the responses, so the responses are written against the
  // list of what must be returned rather than the list being reconstructed
  // afterwards from whatever happened to get written — and the same machine
  // reconciliation, because a required deliverable with no response is, on
  // most public procurements, a rejected tender rather than a lost mark.
  bid: pipelineSpec({
    id: "bid",
    reconcileTask: BR.RECONCILE_TASK,
    sectionPasses: BR.SECTION_PASSES,
    finalTask: BR.FINAL_TASK,
    finalLabel: "Bid summary, traceability and open items",
  }),
};
export const PIPELINE_AGENTS = new Set(Object.keys(PIPELINE_SPECS));
/**
 * The stages a run reports as it works.
 *
 * A single-pass agent gets ONE stage, not the diagnostic's six. It used to
 * fall through to DIAGNOSTIC_SPEC, so asking for the stages of Agent 2 came
 * back with "Reading the documents against each other", "The demand model"
 * and four other things it never does. That was harmless while single-pass
 * agents ran in the foreground and nothing read their stages. It stops being
 * harmless the moment they are worked in the background and the desk watches
 * a progress list, because the list would describe another agent's work.
 */
export const stagesFor = (agentId) =>
  PIPELINE_SPECS[agentId]
    ? PIPELINE_SPECS[agentId].stages
    : [{ key: "single", label: AGENT_BRIEFS[agentId]?.stageLabel || "Working" }];
export { DIAGNOSTIC_STAGES };

/**
 * Throws on the first required field the run is missing.
 *
 * A document supplied against a field answers it. The document text is
 * no longer folded into the field it belongs to — it travels as itself —
 * so a run whose whole answer is an attached programme would otherwise
 * be refused for having an empty programme box.
 */
export function assertInputs(agentId, inputs, documents = []) {
  const brief = AGENT_BRIEFS[agentId];
  if (!brief) throw new Error("Unknown agent.");
  const covered = new Set((documents || []).map((d) => d.field).filter(Boolean));
  const anyDocument = (documents || []).length > 0;
  for (const f of brief.fields) {
    if (!f.required) continue;
    if (String(inputs?.[f.name] || "").trim()) continue;
    if (covered.has(f.name) || (f.type === "textarea" && anyDocument)) continue;
    throw new Error(`"${f.label}" is required for this agent.`);
  }
}


/**
 * The tender pack's issue check, run on the finished pack rather than asked
 * for in the prompt.
 *
 * A tender pack fails in one way that nobody sees until the returns are in:
 * the scope sheet specifies work the pricing schedule gives the tenderer
 * nowhere to price, or the schedule asks for a price against something the
 * scope sheet never specified. Both produce a pack that reads perfectly and
 * returns prices that cannot be compared.
 *
 * Instructing the model to keep them aligned is not a control. Comparing the
 * two reference sets by machine, on every run, before anybody can approve it,
 * is — and the result goes into the run notes, where the person approving it
 * has to read it.
 */
function withPackCheck(result) {
  const { data } = splitPipelineOutput(result.output, TP.SECTIONS);
  const check = reconcileScopeToPrice(data[TP.SCOPE_SECTION] || "", data[TP.PRICE_SECTION] || "");
  return {
    ...result,
    packCheck: check,
    // Ahead of the pipeline's own notes: this is the one that decides whether
    // the pack may leave, so it is not read after four notes about pass length.
    notes: [...packNotes(check), ...(result.notes || [])],
  };
}

/**
 * The submission-completeness check, on every bid run.
 *
 * The mirror of withPackCheck. A required deliverable with no drafted
 * response is not a lost mark on most public and framework procurements, it
 * is a non-compliant tender — the whole submission rejected whatever is in
 * the rest of it. A deadline that is not a date is a timetable nobody can
 * work backwards from.
 *
 * Neither is something to leave to somebody's eye at eleven o'clock the night
 * before the deadline, which is exactly when a bid file is read.
 */
function withBidCheck(result) {
  const { data } = splitPipelineOutput(result.output, BR.SECTIONS);
  const check = reconcileChecklistToResponse(data[BR.CHECKLIST_SECTION] || "", data[BR.RESPONSE_SECTION] || "");
  return {
    ...result,
    bidCheck: check,
    notes: [...bidNotes(check), ...(result.notes || [])],
  };
}

/**
 * Run one agent for real. Returns { output, model, usage }.
 *
 * A pipeline agent takes several minutes and reports progress through
 * `onStage`; the caller runs it in the background and polls. Everything
 * else is one call and returns when it returns.
 */
export async function runAgent(agentId, inputs, runBy, { onStage, visuals, resume, documents = [] } = {}) {
  const brief = AGENT_BRIEFS[agentId];
  if (!brief) throw new Error("Unknown agent.");
  const { model } = getProvider();
  assertInputs(agentId, inputs, documents);

  if (PIPELINE_AGENTS.has(agentId)) {
    const result = await runPipeline({
      spec: PIPELINE_SPECS[agentId],
      anthropic: client(),
      model,
      // The standard travels with every pass; the brief alone is what the
      // report must contain, not how good it has to be.
      system: `${brief.system}\n\n${STANDARD}`,
      brief,
      inputs,
      documents,
      visuals,
      onStage,
      resume,
    });
    if (agentId === "tender-pack") return withPackCheck(result);
    if (agentId === "bid") return withBidCheck(result);
    return result;
  }

  const parts = brief.fields
    .map((f) => {
      const v = String(inputs?.[f.name] || "").trim();
      return v ? `## ${f.label}\n${v}` : null;
    })
    .filter(Boolean);

  const documentBlock = (documents || [])
    .map((d) => `===== DOCUMENT: ${d.name}${d.pages ? ` (${d.pages} pages)` : ""} =====\n${d.text}`)
    .join("\n\n");

  const prompt =
    `Run your task on the following inputs. Prepared by ${runBy} — address the output to them for review.\n\n${parts.join("\n\n")}` +
    (documentBlock ? `\n\n## The documents supplied with this run\n\n${documentBlock}` : "");

  /**
   * THE SINGLE-PASS AGENTS ARE WRITTEN TO THE END TOO.
   *
   * They were not. One call, 16,000 tokens, and a `truncated: true` flag on
   * the way out. The pipeline agents have been continuing their passes for
   * weeks; agents 1 to 7 — including Agent 2, which reads a received tender
   * and is the one most likely to meet the ceiling, because an ITT's
   * requirements register is one row per requirement — simply stopped.
   *
   * A requirements register that stops at requirement 60 of 140 is not a
   * shorter register. It is a compliance matrix with eighty holes in it, and
   * nothing on the page says which eighty.
   *
   * So the same continuation the pipeline uses runs here: continue from the
   * exact character it stopped at, append with nothing in between, and keep
   * going until the model stops truncating or stops adding text. The output
   * ceiling per call is the provider's; the ceiling on the ANSWER is now gone.
   */
  const one = async (task) => {
    const response = await client().messages.create({
      model,
      max_tokens: SINGLE_PASS_MAX_TOKENS,
      system: brief.system,
      messages: [{ role: "user", content: task }],
    });
    if (response.stop_reason === "refusal") {
      throw new Error("The provider declined this request" + (response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : "."));
    }
    return {
      text: response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n"),
      model: response.model,
      truncated: response.stop_reason === "max_tokens",
      usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    };
  };

  // The single stage is reported, so a background run shows as working and
  // then as done rather than sitting at "pending" for ever once it has
  // finished. Same contract the pipeline passes use.
  onStage?.({ key: "single", state: "running", index: 0 });

  let r = await one(prompt);
  let output = r.text;
  const usage = { input: r.usage.input, output: r.usage.output };
  let rounds = 0;
  let stalled = false;

  let overflowed = false;
  while (r.truncated) {
    // Same two controls as a pipeline pass: stop when it stops making
    // progress, and stop when the volume says this is a loop rather than a
    // long answer. Neither is a budget — an honest answer never meets them.
    if (output.length >= PASS_CHAR_CEILING) { overflowed = true; break; }
    if (rounds >= CONTINUATION_GUARD) break;
    rounds += 1;
    // Only the tail is resent. The inputs and the documents are already in
    // the request above; the model needs to see where its own pen stopped.
    r = await one(`${prompt}\n\n---\n\n${continuationInstruction(output.slice(-4000))}`);
    usage.input += r.usage.input;
    usage.output += r.usage.output;
    if (r.text.trim().length < STALL_CHARS) { stalled = true; output += r.text; break; }
    output += r.text;
  }

  if (!output.trim()) throw new Error("The agent returned no output — try again with more specific inputs.");

  // Written down as it lands, like a pipeline pass. A single-pass run that
  // took twenty minutes and many continuations is as expensive to lose to a
  // container being recreated as a six-pass one.
  onStage?.({ key: "single", state: "done", index: 0, text: output });

  const notes = [];
  if (r.truncated) {
    notes.push(
      `This output is INCOMPLETE. It was continued ${rounds} time${rounds === 1 ? "" : "s"}, wrote ` +
      `${output.length.toLocaleString("en-GB")} characters, and is still cut off` +
      (stalled
        ? " — the last continuation added almost nothing, so the model stalled rather than ran out of room."
        : overflowed
          ? `, passing the ${PASS_CHAR_CEILING.toLocaleString("en-GB")}-character ceiling for one answer. An answer that long is looping rather than writing.`
          : `, having reached the continuation backstop of ${CONTINUATION_GUARD} calls.`) +
      " Do not rely on it as a complete answer: what is missing is whatever came after the last line."
    );
  } else if (rounds) {
    notes.push(`The output reached the per-call length limit and was continued in ${rounds} further call${rounds === 1 ? "" : "s"} — it is complete.`);
  }

  return { output, model: r.model, truncated: r.truncated, usage, notes };
}
