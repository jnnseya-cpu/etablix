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

const DEFAULT_MODEL = "claude-opus-5";

export function getProvider() {
  const stored = getSettings().ai_provider || {};
  return {
    apiKey: stored.apiKey || "",
    model: stored.model || DEFAULT_MODEL,
    lastTest: stored.lastTest || null,
  };
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
    keyPreview: p.apiKey ? `${p.apiKey.slice(0, 10)}…${p.apiKey.slice(-4)}` : null,
    connected: providerConnected(),
    lastTest: p.lastTest,
  };
}

const client = () => {
  const { apiKey } = getProvider();
  if (!apiKey) throw new Error("The AI provider is not connected — an administrator adds the API key under Organisation → AI agents.");
  return new Anthropic({ apiKey });
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
const COMPANY_BRIEF = `You are an internal AI agent of ETABLIX — Integrated Site Services, part of Groupe Nseya (etablix.com; ETABLIX is a trading name of JNN GLOBAL LTD, Company No. 15405437, Birmingham, UK). ETABLIX is one accountable contractor for every temporary-site and workforce-accommodation service: it plans, procures, integrates and controls site set-up from first mobilisation to final reinstatement, across three delivery models (A Advisory, B Management Integrator, C Prime Service Contractor). Its core thesis: projects fail at the unowned interfaces between 15–25 supplier packages, not inside them.

House rules that bind every output:
- UK construction context; use UK terminology, HGCRA 1996 payment law awareness, CDM 2015 awareness. Model C is always "Prime Service Contractor", never "Principal Service Contractor".
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
  bid: {
    system: `${COMPANY_BRIEF}

You are Agent 2 — Bid & Requirements. From the pasted tender / PQQ / employer's-requirements material, produce, under these exact headings:
1. REQUIREMENTS REGISTER — numbered; each requirement with a VERBATIM quote of its source line and the document/section it came from. Mark anything ambiguous.
2. COMPLIANCE MATRIX — requirement → how ETABLIX complies / partial / gap.
3. SUBMISSION CHECKLIST — every deliverable, format and deadline stated in the documents.
4. RESPONSIBILITY MATRIX (draft) — who must own each requirement (MD / Delivery Lead / Commercial Lead / supplier).
5. CLARIFICATION SCHEDULE — numbered questions to put to the client, each tied to the requirement it clarifies.
6. MISSING-INFORMATION ALERTS — what the documents do not say that pricing or delivery needs.
Boundary: the bid owner validates everything before anything is submitted; you draft, you never submit.`,
    fields: [
      { name: "documents", label: "Paste the tender / PQQ / employer's requirements text (or the relevant extracts)", type: "textarea", required: true },
      { name: "context", label: "Engagement context — client, project, which delivery model we intend to bid", type: "textarea" },
    ],
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

/** Run one agent for real. Returns { output, model, usage }. */
export async function runAgent(agentId, inputs, runBy) {
  const brief = AGENT_BRIEFS[agentId];
  if (!brief) throw new Error("Unknown agent.");
  const { model } = getProvider();

  const parts = brief.fields
    .map((f) => {
      const v = String(inputs?.[f.name] || "").trim();
      return v ? `## ${f.label}\n${v}` : null;
    })
    .filter(Boolean);
  for (const f of brief.fields) {
    if (f.required && !String(inputs?.[f.name] || "").trim()) {
      throw new Error(`"${f.label}" is required for this agent.`);
    }
  }

  const response = await client().messages.create({
    model,
    max_tokens: 16000,
    system: brief.system,
    messages: [
      {
        role: "user",
        content: `Run your task on the following inputs. Prepared by ${runBy} — address the output to them for review.\n\n${parts.join("\n\n")}`,
      },
    ],
  });

  const output = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  if (response.stop_reason === "refusal") {
    throw new Error("The provider declined this request" + (response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : "."));
  }
  if (!output.trim()) throw new Error("The agent returned no output — try again with more specific inputs.");
  return {
    output,
    model: response.model,
    truncated: response.stop_reason === "max_tokens",
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
  };
}
