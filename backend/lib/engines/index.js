/**
 * THE TWENTY DETERMINISTIC ENGINES, AND HOW THEY ARE RUN.
 *
 * Ten agents in this system are model-driven: they read documents and write a
 * deliverable, and five of them reconcile their own output by machine
 * afterwards. These twenty are the other shape. The arithmetic IS the
 * deliverable — whether a time bar has expired, whether a claim was notified
 * inside it, whether a programme's logic holds, whether a system was balanced
 * before it was set to work — and the model's job is the report.
 *
 * So each one here runs its engine FIRST and hands the findings to the model
 * as facts to write from. Two consequences, both deliberate:
 *
 *   · THE MODEL NEVER RECOMPUTES. It is told so in the brief and it is given
 *     the answer. A model asked to work out whether 8 weeks from 22 August
 *     has passed will write a better sentence than this code and will
 *     eventually write a different date.
 *   · A RUN CAN BE STOPPED BEFORE IT STARTS. Where the input cannot be read
 *     at all, the run fails with the reason rather than producing a
 *     confident document resting on nothing.
 *
 * THE INPUT IS JSON, AND THAT IS NOT LAZINESS. A model validation reads
 * thousands of elements and a lifecycle plan reads hundreds of assets;
 * neither fits in a form. The records come from the systems that hold them —
 * CONSTRUX, a scheduling tool, a model checker — and the shape each engine
 * expects is published in its own `shape` below so the export can be written
 * against something rather than guessed at.
 */

import * as obligation from "./obligation.js";
import * as notice from "./notice.js";
import * as change from "./change.js";
import * as estimating from "./estimating.js";
import * as submission from "./submission.js";
import * as programme from "./programme.js";
import * as recovery from "./recovery.js";
import * as productivity from "./productivity.js";
import * as safety from "./safety.js";
import * as audit from "./audit.js";
import * as model from "./model.js";
import * as temporaryworks from "./temporaryworks.js";
import * as land from "./land.js";
import * as logistics from "./logistics.js";
import * as portfolioCapacity from "./portfolio-capacity.js";
import * as quantity from "./quantity.js";
import * as asset from "./asset.js";
import * as commissioning from "./commissioning.js";
import * as handover from "./handover.js";
import * as lifecycle from "./lifecycle.js";
import * as demand from "./demand.js";
import * as priority from "./priority.js";
import * as briefing from "./briefing.js";
import * as uptake from "./uptake.js";

/** Parse the records field, and refuse the run rather than guess. */
export function readRecords(raw, { required = true } = {}) {
  const s = String(raw ?? "").trim();
  if (!s) {
    if (!required) return { ok: true, value: {} };
    return { ok: false, why: "no records were supplied. This engine computes from records; with none there is nothing to compute and a report written anyway would be a confident document resting on nothing." };
  }
  try {
    const v = JSON.parse(s);
    if (!v || typeof v !== "object") return { ok: false, why: "the records parsed but are not an object" };
    return { ok: true, value: v };
  } catch (err) {
    return { ok: false, why: `the records are not readable as JSON: ${err.message}. Nothing is computed from a half-read input.` };
  }
}

/** Render any engine result as the block the model writes from. */
function block(title, result) {
  const lines = [`### ${title}`, ""];
  const say = result.say || result.verdict || result.reason || null;
  if (say) lines.push(say, "");
  const push = (label, rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    lines.push(`**${label}** (${rows.length})`);
    for (const r of rows.slice(0, 200)) {
      lines.push(`- ${typeof r === "string" ? r : JSON.stringify(r)}`);
    }
    lines.push("");
  };
  for (const [k, v] of Object.entries(result)) {
    if (["say", "verdict", "reason", "ok"].includes(k)) continue;
    if (Array.isArray(v)) push(k, v);
    else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const inner = Object.entries(v).filter(([, x]) => Array.isArray(x) && x.length);
      if (inner.length) for (const [ik, iv] of inner) push(`${k}.${ik}`, iv);
      else lines.push(`**${k}**: ${JSON.stringify(v)}`, "");
    } else if (v !== null && v !== undefined) {
      lines.push(`**${k}**: ${v}`, "");
    }
  }
  return lines.join("\n").trim();
}

const RECORDS_FIELD = {
  name: "records", type: "textarea", required: true,
  label: "The records, as JSON. The shape is published at /api/engines — export it from the system that holds it rather than retyping it.",
};

/**
 * One entry per agent. `machine` is the hook runAgent calls: it returns
 * `{ stop, say }` to refuse the run, or `{ text, result }` to hand the model
 * its facts.
 */
export const ENGINES = [
  {
    id: "obligation", agent: "Obligation Monitor", engine: "contracts", depth: 4,
    purpose: "Every obligation in the executed contract as a controlled object, and the ones nothing is watching.",
    shape: { project: "project id or code", extra: "[{ref,clause,name,party,trigger,action,period,basis,timebar,method,evidence,consequence}]" },
    fields: [
      { name: "project", label: "Project id or code (its contract must already be recorded)", type: "text", required: true },
      { ...RECORDS_FIELD, required: false, label: "Project-specific obligations as JSON, if any. The standard form's are read from the contract graph." },
    ],
    run(inputs) {
      const r = readRecords(inputs.records, { required: false });
      if (!r.ok) return { stop: true, say: r.why };
      const m = obligation.monitor(String(inputs.project || "").trim());
      if (!m.ok) return { stop: true, say: m.reason };
      return { text: block("The obligation register", m), result: m };
    },
  },
  {
    id: "notice", agent: "Notice Monitor", engine: "contracts", depth: 4,
    purpose: "Assembles a contractual notice from the project's own clause graph and event record. It drafts; it never gives.",
    shape: { project: "project id", eventId: "recorded contract event id", kind: "event|delay|claim|earlywarning", effect: "text", cause: "text", relief: "text", from: "text", to: "text" },
    fields: [
      { name: "project", label: "Project id or code", type: "text", required: true },
      { name: "eventId", label: "The recorded contract event this notice is about", type: "text", required: true },
      { ...RECORDS_FIELD, required: false, label: "The rest as JSON: kind, effect, cause, relief, from, to." },
    ],
    run(inputs) {
      const r = readRecords(inputs.records, { required: false });
      if (!r.ok) return { stop: true, say: r.why };
      const d = notice.draft({ project: inputs.project, eventId: inputs.eventId, ...r.value });
      if (!d.ok) return { stop: true, say: d.faults[0] };
      return {
        text: [block("The assembled draft", { say: d.draft.complete ? "The draft is complete." : `The draft has ${d.gaps.length} gap(s) a person must fill.`, warnings: d.warnings, gaps: d.gaps, clause: d.draft.clause, deadline: d.draft.deadline, late: d.draft.late, barring: d.draft.barring }),
               "", "### The draft text, verbatim — reproduce it exactly and do not improve it", "", "```", d.draft.text, "```"].join("\n"),
        result: d,
      };
    },
  },
  {
    id: "change", agent: "Change and Entitlement Assessor", engine: "contracts", depth: 4,
    purpose: "The change register, reconciled against the contract that governs it — including whether a claim was notified inside its bar.",
    shape: { project: "project id", changes: "[{ref,title,state,relief,instruction,instructedAt,notice,noticeAt,eventId,value,elements,days,programmeImpact,controlAccount}]" },
    fields: [
      { name: "project", label: "Project id or code", type: "text", required: true },
      RECORDS_FIELD,
    ],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = change.reconcile(r.value.changes || [], { project: String(inputs.project || "").trim() });
      return { text: block("The change register, reconciled", res), result: res };
    },
  },
  {
    id: "estimating", agent: "Estimator", engine: "tender", depth: 3,
    purpose: "Quantities and rates with lineage on every number, and the nine assurance tests over the priced schedule.",
    shape: { lines: "[{id,what,quantity,unit,rate,total,source,sourceDate,currency,quantityBasis,productivity,validUntil,exclusions,escalation,confidence,approvedBy,scopeItemId}]", scopeItems: "[{id}]", quotes: "[]", asAt: "date" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = estimating.price(r.value);
      return { text: block("The priced schedule", res), result: res };
    },
  },
  {
    id: "temporaryworks", agent: "Temporary Works Coordinator", engine: "risk", depth: 3,
    purpose: "The temporary works register: checker independence, check category against risk category, a permit to load issued before the load, and a named coordinator.",
    shape: { designs: "[{id,designer,checker,riskCategory,checkCategory,loaded,loadedAt}]", permits: "[{designId,issuedAt}]", coordinator: "name" },
    fields: [RECORDS_FIELD],
    boundary: "ETABLIX does not design or check temporary works. This reads a register maintained by the appointed designers and checkers and reports what it does not evidence.",
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = temporaryworks.check(r.value);
      return { text: block("The temporary works register", res), result: res };
    },
  },
  {
    id: "land", agent: "Land and Environmental Coordinator", engine: "contracts", depth: 3,
    purpose: "Consents and conditions against the jurisdiction that governs them, and every monitored condition owned and dated.",
    shape: { jurisdiction: "england|scotland|a place name", requirements: "[{id,activity,jurisdiction,evidenceJurisdiction,validUntil,conditions:[{id,frequency,owner}]}]", asAt: "date" },
    fields: [RECORDS_FIELD],
    boundary: "This routes a question to the right regulator and refuses a mismatch. It does not decide applicability, which the appointed team verifies against the effective version.",
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = land.check(r.value);
      return { text: block("Consents and conditions, by jurisdiction", res), result: res };
    },
  },
  {
    id: "logistics", agent: "Logistics and Transport Coordinator", engine: "planning", depth: 3,
    purpose: "Gate throughput against bookings, seats by stop against the shift that needs them, and a protected fallback for a cancelled vehicle.",
    shape: { gates: "[{id,window,windowMinutes,minutesPerVehicle}]", bookings: "[{gate,window}]", transport: "[{stop,shift,seats}]", shifts: "[{stop,shift,people}]", fallback: "text" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = logistics.check(r.value);
      return { text: block("Gate, seat and route capacity", res), result: res };
    },
  },
  {
    id: "portfolio-capacity", agent: "Portfolio Capacity Analyst", engine: "resource", depth: 4,
    purpose: "One supplier across several projects: the delivery slot two of them cannot both have, and the concentration no single project can see.",
    shape: { orders: "[{project,supplier,window,value}]", concentrationLimitPct: 40 },
    fields: [RECORDS_FIELD],
    boundary: "Supplier, window and project only. No price, rate or contract term crosses a project boundary, because protecting customer-specific rates across projects is the condition on this analysis existing at all.",
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = portfolioCapacity.check(r.value);
      return { text: block("Portfolio capacity and supplier exposure", res), result: res };
    },
  },
  {
    id: "demand", agent: "Demand Reader", engine: "tender", depth: 3,
    purpose: "What the market is asking for, by segment, against its own comparable windows — and, with the same weight, what could not be read at all.",
    shape: { windowDays: "comparable window length in days, default 28" },
    fields: [
      { name: "windowDays", label: "Comparable window in days (28 unless there is a reason)", type: "text", required: false },
    ],
    boundary: "This reports movement and evidence. It makes no recommendation and no decision: whether a movement is worth acting on belongs to the strategist, and whether it may be acted on belongs to policy.",
    run(inputs) {
      const days = Number(String(inputs.windowDays || "").trim()) || 28;
      if (days < 7 || days > 180) return { stop: true, say: `a ${days}-day window is outside 7 to 180 days. Shorter than a week has no baseline and longer than six months is not a trend, it is a history.` };
      const r = demand.read({ windowDays: days });
      if (!r.ok) return { stop: true, say: r.reason };
      return { text: block("What the market is asking for", r), result: r };
    },
  },
  {
    id: "priority", agent: "Demand Priority Analyst", engine: "tender", depth: 3,
    purpose: "The segments ranked, each with its score breakdown, its vetoes on the same line as its number, and the channels that actually exist.",
    shape: { readiness: "{ segment: 0-100 } — supplied by somebody who knows the supplier coverage and the commitments" },
    fields: [
      { name: "windowDays", label: "Comparable window in days (28 unless there is a reason)", type: "text", required: false },
      { ...RECORDS_FIELD, required: false, label: 'Readiness by segment as JSON, e.g. {"readiness":{"welfare":80}}. Anything absent is unevidenced, which is a veto on activation and not a low score.' },
    ],
    boundary: "This recommends and cannot authorise anything. Readiness is never inferred from a feed: whether this business can serve a movement depends on supplier coverage, lead times and existing commitments, and no public source knows any of those.",
    run(inputs) {
      const r0 = readRecords(inputs.records, { required: false });
      if (!r0.ok) return { stop: true, say: r0.why };
      const days = Number(String(inputs.windowDays || "").trim()) || 28;
      const r = priority.rank({ windowDays: days, readiness: r0.value?.readiness || {} });
      if (!r.ok) return { stop: true, say: r.reason };
      return { text: block("Demand, ranked", r), result: r };
    },
  },
  {
    id: "briefing", agent: "Priority Brief Coordinator", engine: "tender", depth: 3,
    purpose: "One draft brief for the highest-ranked eligible segment, carrying every standing prohibition, or a refusal naming the gate that stopped it.",
    shape: { segment: "optional: the one segment to draft for", readiness: "{ segment: 0-100 }" },
    fields: [
      { name: "segment", label: "One segment to draft for, or leave empty for the highest ranked", type: "text", required: false },
      { ...RECORDS_FIELD, required: false, label: 'Readiness by segment as JSON, e.g. {"readiness":{"welfare":80}}.' },
    ],
    boundary: "This drafts. It never approves, and a draft steers nothing until a second named person approves that exact revision. Where no claim is approved for a topic it writes an empty claim list rather than inventing one.",
    run(inputs) {
      const r0 = readRecords(inputs.records, { required: false });
      if (!r0.ok) return { stop: true, say: r0.why };
      const r = briefing.draft({
        segment: String(inputs.segment || "").trim() || null,
        readiness: r0.value?.readiness || {},
      });
      if (!r.ok) return { stop: true, say: r.reason };
      return { text: block("The draft priority brief", r), result: r };
    },
  },
  {
    id: "uptake", agent: "Demand Uptake Analyst", engine: "tender", depth: 3,
    purpose: "Enquiries against eligible readership, this window versus the one before, labelled for the method that produced it.",
    shape: { windowDays: "window length in days, default 28" },
    fields: [
      { name: "windowDays", label: "Window in days (28 unless there is a reason)", type: "text", required: false },
    ],
    boundary: "This can recommend a pause and cannot amend policy, approve anything or change a threshold. Every result is observational because this site has no assignment, and a result read before its window closes recommends nothing.",
    run(inputs) {
      const days = Number(String(inputs.windowDays || "").trim()) || 28;
      const r = uptake.measure({ windowDays: days });
      if (!r.ok) return { stop: true, say: r.reason };
      return { text: block("Demand uptake", r), result: r };
    },
  },
  {
    id: "submission", agent: "Submission Controller", engine: "tender", depth: 4,
    purpose: "The last check before upload: the artefacts against the portal's own rules, not the content against the question.",
    shape: { deadline: "date", convention: "ETX-{ref}-{doc}-{rev}.pdf", slots: "[{id,name,required}]", artefacts: "[{name,slot,pages,pageLimit,words,wordLimit,needsSignature,signedBy,expires}]", fields: "[{name,required,value}]", facts: "[{fact,value,where}]", tenderedPrice: 0, pricingSchedulePrice: 0 },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = submission.check(r.value);
      return { text: block("The administrative check", res), result: res };
    },
  },
  {
    id: "programme", agent: "Programme Generator", engine: "planning", depth: 3,
    purpose: "Interrogates a programme rather than drawing one: open ends, missing logic, disconnected procurement, hidden negative float.",
    shape: { activities: "[{id,name,kind,start,end,duration,predecessors,successors,float,critical,constraint,quantity,unit,outputPerCrewPerDay,crews,leadTimeSource}]", dataDate: "date", completion: "date" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = programme.interrogate(r.value);
      return { text: block("The interrogation", res), result: res };
    },
  },
  {
    id: "recovery", agent: "Recovery Planner", engine: "planning", depth: 4,
    purpose: "Recovery options with their cost per day, against a baseline that has not been quietly rewritten.",
    shape: { baselineAtAward: "fingerprint", baselineAnalysed: "fingerprint", plannedCompletion: "date", forecastCompletion: "date", remainingDays: 0, project: "id", eventId: "id", options: "[{id,lever,recovers,cost,resourceChange,descoped,whoDoesItLater,risk}]" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = recovery.analyse(r.value);
      if (res.refused) return { stop: true, say: res.reason };
      return { text: block("The recovery analysis", res), result: res };
    },
  },
  {
    id: "productivity", agent: "Productivity Analyser", engine: "resource", depth: 3,
    purpose: "Output measured against what was priced, per control account — the earliest honest warning on a labour overrun.",
    shape: { accounts: "[{id,unit,quantity,hours,rate}]", records: "[{controlAccount,from,to,units,hours,unit,cumulativeUnits,crew,source}]", asAt: "date" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = productivity.analyse(r.value);
      return { text: block("Output against the priced rate", res), result: res };
    },
  },
  {
    id: "safety", agent: "Safety Assurance Review", engine: "risk", depth: 3,
    purpose: "RAMS cover, permits in date, tickets recorded, observations recurring. It administers; it never supervises.",
    shape: { asAt: "date", planned: "[{activity,date}]", rams: "[{id,covers,reviewedTo,approvedBy}]", permits: "[{id,kind,from,to,workTo,issuedBy,open}]", assignments: "[{person,activity,date,requires}]", held: "[{person,ticket,expires}]", observations: "[{id,kind,location,raisedAt,status,action}]" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = safety.assure(r.value);
      return { text: block("The administrative safety check", res), result: res };
    },
  },
  {
    id: "audit", agent: "Audit Review", engine: "risk", depth: 3,
    purpose: "The audit programme, its coverage of the standard, and the independence inside it.",
    shape: { audits: "[{id,area,state,auditor,auditorArea,plannedFor,carriedOut,clauses}]", findings: "[{id,audit,grade,owner,raisedAt,status,evidence,closedBy,verifiedBy,rootCause,closedAt}]", standardClauses: "[]", cycleFrom: "date", cycleTo: "date", asAt: "date" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = audit.programme(r.value);
      return { text: block("The audit programme", res), result: res };
    },
  },
  {
    id: "model", agent: "Model Validator", engine: "bim", depth: 3,
    purpose: "Whether the federated model is usable for coordination, quantities and asset information — units and shared coordinates first.",
    shape: { models: "[{id,unit,basePoint}]", elements: "[{id,name,classification,level,hostLevel,system,type,x,y,z}]", stage: "2..6", naming: "template", projectBasePoint: "string", requiredUnit: "mm|m" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = model.validate(r.value);
      return { text: block("The model validation", res), result: res };
    },
  },
  {
    id: "quantity", agent: "Quantity Reconciler", engine: "bim", depth: 3,
    purpose: "Model against bill against drawings. The output is the disagreement, ranked by what it is worth.",
    shape: { rows: "[{item,source,unit,quantity,rate}]", tolerance: 0.02 },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = quantity.compare(r.value);
      return { text: block("The three-way comparison", res), result: res };
    },
  },
  {
    id: "asset", agent: "Asset Register", engine: "bim", depth: 3,
    purpose: "The asset register as the facilities team will receive it: tags that join up, no duplicates, attributes populated.",
    shape: { assets: "[{tag,type,system,location,parent,manufacturer,model,serial,installedAt,warrantyTo,expectedLifeYears}]", convention: "{system}-{type}-{number}", requiredByType: "{pump:[duty]}" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = asset.register(r.value);
      return { text: block("The asset register", res), result: res };
    },
  },
  {
    id: "commissioning", agent: "Commissioning Controller", engine: "handover", depth: 4,
    purpose: "The commissioning sequence, in order, witnessed by somebody who did not install it.",
    shape: { systems: "[{system,installer,stages:{installed:{complete,at,by,witness}},tests:[{name,criterion,result,target,tolerance,passed}]}]", handoverDate: "date", daysPerStage: 5 },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = commissioning.programme(r.value);
      return { text: block("The commissioning programme", res), result: res };
    },
  },
  {
    id: "handover-file", agent: "Handover Controller", engine: "handover", depth: 4,
    purpose: "Completeness per asset across twelve evidence types, forecast from lead times before the date rather than after it.",
    shape: { assets: "[{tag,evidence:{submittal:{complete,ref,expires}}}]", handoverDate: "date", defectsByAsset: "{tag:count}" },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = handover.forecast(r.value);
      return { text: block("The handover forecast", res), result: res };
    },
  },
  {
    id: "lifecycle", agent: "Lifecycle and Asset Information Controller", engine: "handover", depth: 3,
    purpose: "Replacement cycles and costs over the model period, with the price base date that lets them be escalated.",
    shape: { lines: "[{tag,expectedLifeYears,replacementCycleYears,firstReplacementYear,replacementCost,basis,priceBaseDate,currency,source,warrantyTo,sparesShelfLifeYears}]", periodYears: 25 },
    fields: [RECORDS_FIELD],
    run(inputs) {
      const r = readRecords(inputs.records);
      if (!r.ok) return { stop: true, say: r.why };
      const res = lifecycle.plan(r.value);
      return { text: block("The lifecycle plan", res), result: res };
    },
  },
];

export const BY_ID = new Map(ENGINES.map((e) => [e.id, e]));

/** The catalogue, without the functions. */
/**
 * EVERY PRODUCER'S DISPLAY NAME, HANDED TO THE NOTICE GATE.
 *
 * `notice.js` refuses to record a contractual notice as given by a producer,
 * because that record would be the evidence relied on. It used to decide what
 * a producer was from a list of job-title nouns, and that list was defeated
 * twice — once by a rename and once by four additions whose titles used words
 * nobody had thought of.
 *
 * This is the fix. The registry owns the names, so the registry tells the
 * gate, and an engine added below is refused as a notice-giver the moment it
 * is registered rather than when somebody remembers to update a regex. The
 * data flows one way — this module already imports notice.js — so there is no
 * cycle.
 */
notice.registerProducers(ENGINES.map((e) => e.agent).filter(Boolean));

export function catalogue() {
  return ENGINES.map(({ id, agent, engine, depth, purpose, shape, fields }) => ({
    id, agent, engine, depth, purpose, shape,
    fields: fields.map((f) => ({ name: f.name, label: f.label, type: f.type, required: Boolean(f.required) })),
  }));
}

/** Run one engine directly, without the model writing anything. */
export function run(id, inputs = {}) {
  const spec = BY_ID.get(String(id));
  if (!spec) return { ok: false, reason: `"${id}" is not one of the sixteen engines` };
  const out = spec.run(inputs);
  if (out.stop) return { ok: false, reason: out.say, refused: true };
  return { ok: true, id: spec.id, agent: spec.agent, result: out.result, text: out.text };
}

export const state = () => ({
  engines: ENGINES.length,
  byDomain: ENGINES.reduce((a, e) => ({ ...a, [e.engine]: (a[e.engine] || 0) + 1 }), {}),
  maxDepth: Math.max(...ENGINES.map((e) => e.depth)),
});
