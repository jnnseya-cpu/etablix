/**
 * THE SIXTEEN DETERMINISTIC ENGINES, AND HOW THEY ARE RUN.
 *
 * Ten agents in this system are model-driven: they read documents and write a
 * deliverable, and five of them reconcile their own output by machine
 * afterwards. These sixteen are the other shape. The arithmetic IS the
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
import * as quantity from "./quantity.js";
import * as asset from "./asset.js";
import * as commissioning from "./commissioning.js";
import * as handover from "./handover.js";
import * as lifecycle from "./lifecycle.js";

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
    id: "notice", agent: "Notice Agent", engine: "contracts", depth: 4,
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
    id: "change", agent: "Change and Entitlement Agent", engine: "contracts", depth: 4,
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
    id: "estimating", agent: "Estimating Agent", engine: "tender", depth: 3,
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
    id: "programme", agent: "Programme Generation Agent", engine: "planning", depth: 3,
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
    id: "recovery", agent: "Recovery Agent", engine: "planning", depth: 4,
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
    id: "productivity", agent: "Productivity Agent", engine: "resource", depth: 3,
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
    id: "safety", agent: "Safety Assurance Agent", engine: "risk", depth: 3,
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
    id: "audit", agent: "Audit Agent", engine: "risk", depth: 3,
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
    id: "model", agent: "Model Validation Agent", engine: "bim", depth: 3,
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
    id: "quantity", agent: "Quantity Agent", engine: "bim", depth: 3,
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
    id: "asset", agent: "Asset Agent", engine: "bim", depth: 3,
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
    id: "commissioning", agent: "Commissioning Agent", engine: "handover", depth: 4,
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
    id: "handover-file", agent: "Handover Agent", engine: "handover", depth: 4,
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
    id: "lifecycle", agent: "Lifecycle and Asset Information Agent", engine: "handover", depth: 3,
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
