/**
 * The audit record — eight field groups, and the reason it is not a log.
 *
 * A log answers "what happened". An audit record answers a harder question,
 * asked much later, usually by somebody who is unhappy:
 *
 *     Who did this, under whose authority, to which version of what, on what
 *     evidence, against which policy, using which model and validator, at
 *     what cost, and can you prove when?
 *
 * Every one of those is a field group here, and a record missing any of them
 * is refused rather than written. A partial audit record is worse than none:
 * it looks like evidence and falls apart the moment it is examined, and the
 * gaps are always in exactly the entry somebody is asking about.
 *
 * THE FIELD MOST SYSTEMS OMIT IS "ATTEMPTED".
 *
 * The specification asks for requested, attempted, permitted, DENIED and
 * completed. A record that only holds completed actions cannot show that a
 * control worked. The refusals are the evidence that the policy engine is
 * real: an agent that tried to issue a purchase order and was stopped is the
 * single most useful line in the record, and it is the line a log designed
 * around successful operations never contains.
 *
 * THIS DOES NOT REPLACE THE LEDGER. The append-only ledger in store.js
 * records money events and deletions and is the system of record for those.
 * This is the record for agent and gate activity, and it is built as a
 * separate shape because the questions asked of it are different ones.
 */

import { instant } from "./evidence.js";
import { num } from "./num.js";

/** The eight field groups the specification requires. */
export const FIELD_GROUPS = [
  { id: "identity", name: "Identity", requires: ["actor", "actorKind"], optional: ["onBehalfOf", "delegation"],
    say: "User, agent, service and delegated authority" },
  { id: "action", name: "Action", requires: ["action", "outcome"], optional: ["reason"],
    say: "Requested, attempted, permitted, denied and completed operations" },
  { id: "object", name: "Object", requires: ["objectType", "objectId"], optional: ["tenantId", "objectVersion"],
    say: "Tenant, tender, object ID and object version" },
  { id: "evidence", name: "Evidence", requires: [], optional: ["inputRefs", "outputHash"],
    say: "Input references and output hash" },
  { id: "decision", name: "Decision", requires: ["policy", "policyResult"], optional: ["approver", "conditions"],
    say: "Policy evaluated, result, approver and conditions" },
  { id: "technology", name: "Technology", requires: [], optional: ["agentDefinition", "modelRoute", "toolVersion", "validatorVersion"],
    say: "Agent definition, model route, tool version and validator version" },
  { id: "economics", name: "Economics", requires: [], optional: ["inputTokens", "outputTokens", "acu", "durationMs", "externalCost"],
    say: "Tokens, ACUs, processing time and external service cost" },
  { id: "time", name: "Time", requires: ["at"], optional: ["sequence"],
    say: "Trusted timestamps and sequence" },
];

/** The five outcomes. A record that only ever holds the last is not audit. */
export const OUTCOMES = ["REQUESTED", "ATTEMPTED", "PERMITTED", "DENIED", "COMPLETED", "FAILED"];

/** Outcomes that prove a control worked rather than that work was done. */
export const CONTROL_OUTCOMES = new Set(["DENIED"]);

/**
 * Build a record. Refuses rather than writes when a required field is absent,
 * because a record that cannot answer the question is not worth the row.
 */
export function record(raw = {}) {
  const faults = [];
  const at = raw.at ? String(raw.at) : null;
  const outcome = OUTCOMES.includes(String(raw.outcome || "").toUpperCase()) ? String(raw.outcome).toUpperCase() : null;

  if (!raw.actor) faults.push("no actor");
  if (raw.actorKind !== "human" && raw.actorKind !== "agent" && raw.actorKind !== "service") faults.push("actorKind must be human, agent or service");
  if (!raw.action) faults.push("no action");
  if (!outcome) faults.push(`outcome "${raw.outcome}" is not one of ${OUTCOMES.join(", ")}`);
  if (!raw.objectType) faults.push("no object type");
  if (!raw.objectId) faults.push("no object id");
  if (!raw.policy) faults.push("no policy was evaluated — an action taken against no policy cannot be shown to have been permitted");
  if (!raw.policyResult) faults.push("no policy result");
  if (!at) faults.push("no timestamp");
  else if (instant(at) === null) faults.push(`the timestamp "${at}" is not a date`);

  // An agent acting must name who authorised the run. The whole distinction
  // between agent identity and user identity lives or dies on this field.
  if (raw.actorKind === "agent" && !raw.onBehalfOf) {
    faults.push("an agent acted and the record does not say who authorised the run");
  }
  // A denial must say what was refused and why, or it is not evidence.
  if (outcome === "DENIED" && !raw.reason) {
    faults.push("a denial with no reason recorded proves nothing about the control that produced it");
  }

  const entry = {
    identity: {
      actor: raw.actor ? String(raw.actor) : null,
      actorKind: raw.actorKind || null,
      onBehalfOf: raw.onBehalfOf ? String(raw.onBehalfOf) : null,
      delegation: raw.delegation || null,
    },
    action: {
      action: raw.action ? String(raw.action) : null,
      outcome,
      reason: raw.reason ? String(raw.reason) : null,
    },
    object: {
      tenantId: raw.tenantId ? String(raw.tenantId) : null,
      objectType: raw.objectType ? String(raw.objectType) : null,
      objectId: raw.objectId ? String(raw.objectId) : null,
      objectVersion: raw.objectVersion === undefined || raw.objectVersion === null ? null : String(raw.objectVersion),
    },
    evidence: {
      inputRefs: Array.isArray(raw.inputRefs) ? raw.inputRefs.map(String) : [],
      outputHash: raw.outputHash ? String(raw.outputHash) : null,
    },
    decision: {
      policy: raw.policy ? String(raw.policy) : null,
      policyResult: raw.policyResult ? String(raw.policyResult) : null,
      approver: raw.approver ? String(raw.approver) : null,
      conditions: raw.conditions ? String(raw.conditions) : null,
    },
    technology: {
      agentDefinition: raw.agentDefinition ? String(raw.agentDefinition) : null,
      modelRoute: raw.modelRoute ? String(raw.modelRoute) : null,
      toolVersion: raw.toolVersion ? String(raw.toolVersion) : null,
      validatorVersion: raw.validatorVersion ? String(raw.validatorVersion) : null,
    },
    economics: {
      inputTokens: num(raw.inputTokens),
      outputTokens: num(raw.outputTokens),
      acu: num(raw.acu),
      durationMs: num(raw.durationMs),
      externalCost: num(raw.externalCost),
    },
    time: {
      at,
      sequence: num(raw.sequence),
    },
  };

  return { ok: faults.length === 0, faults, entry, say: faults.length ? `refused: ${faults[0]}` : "recorded" };
}

/** Which field groups a record actually populated, and which it left empty. */
export function completeness(entry) {
  const out = [];
  for (const group of FIELD_GROUPS) {
    const bucket = entry[group.id] || {};
    const populated = Object.entries(bucket).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0));
    out.push({
      group: group.id,
      name: group.name,
      populated: populated.length,
      fields: Object.keys(bucket).length,
      empty: Object.keys(bucket).filter((k) => !populated.some(([p]) => p === k)),
    });
  }
  return out;
}

/**
 * A journal of records, with the property that matters most: the ability to
 * answer, for one object, everything that was attempted on it and not only
 * what succeeded.
 */
export function journal() {
  const entries = [];
  let sequence = 0;
  return {
    get length() { return entries.length; },
    get entries() { return entries.slice(); },

    write(raw) {
      const built = record({ ...raw, sequence: raw.sequence === undefined ? ++sequence : raw.sequence });
      if (!built.ok) { sequence--; return built; }
      entries.push(built.entry);
      return built;
    },

    /** Everything touching one object, in sequence, refusals included. */
    forObject(objectType, objectId) {
      return entries.filter((e) => e.object.objectType === String(objectType) && e.object.objectId === String(objectId));
    },

    /** Everything one actor did, so an agent's whole run can be read at once. */
    forActor(actor) {
      return entries.filter((e) => e.identity.actor === String(actor));
    },

    /**
     * The refusals. This is the evidence that the controls are real, and it
     * is the view a regulator, an insurer or a client's auditor asks for.
     */
    refusals() {
      return entries.filter((e) => CONTROL_OUTCOMES.has(e.action.outcome));
    },

    /** What an agent run cost, from the record rather than from a guess. */
    costOf(actor) {
      const rows = entries.filter((e) => e.identity.actor === String(actor));
      const acu = rows.reduce((s, e) => s + (e.economics.acu || 0), 0);
      const ms = rows.reduce((s, e) => s + (e.economics.durationMs || 0), 0);
      return { calls: rows.length, acu: Math.round(acu * 1e6) / 1e6, durationMs: ms };
    },

    /**
     * Whether the journal can answer for a period. A gap in the sequence
     * means a record was lost, and a journal with a gap cannot be relied on
     * for the entries around it either.
     */
    integrity() {
      const seqs = entries.map((e) => e.time.sequence).filter((s) => s !== null).sort((a, b) => a - b);
      const gaps = [];
      for (let i = 1; i < seqs.length; i++) {
        if (seqs[i] !== seqs[i - 1] + 1) gaps.push({ after: seqs[i - 1], before: seqs[i] });
      }
      const unsequenced = entries.filter((e) => e.time.sequence === null).length;
      return {
        ok: gaps.length === 0 && unsequenced === 0,
        entries: entries.length,
        gaps,
        unsequenced,
        say: gaps.length
          ? `${gaps.length} gap(s) in the sequence — a record was lost, and the entries around it cannot be relied on either`
          : unsequenced
            ? `${unsequenced} entry(ies) carry no sequence number`
            : "unbroken",
      };
    },
  };
}
