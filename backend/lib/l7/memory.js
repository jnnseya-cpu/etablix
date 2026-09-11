/**
 * Memory, and the gate that stops it becoming a liability.
 *
 * The register has carried the same line about memory since it was written:
 * "There is none, and the absence is safer than a careless version."
 *
 * That is still the right instinct and it is why this module is built the way
 * it is. A memory that learns automatically is not a feature, it is a
 * compounding error: one agent concludes that a client pays in 45 days, that
 * conclusion becomes institutional truth, the next bid prices cash on it, and
 * nobody can find where the number came from because it was never a decision
 * anybody took. A wrong lesson teaches itself to every future bid, and the
 * more the system is used the more confident the error becomes.
 *
 * So the gate comes first and the memory second.
 *
 *     NO AGENT OUTPUT BECOMES INSTITUTIONAL TRUTH AUTOMATICALLY.
 *
 * An agent may write to its own working context and it may PROPOSE a lesson.
 * It cannot write policy, it cannot write a lesson, and it cannot approve its
 * own proposal. A lesson becomes institutional when a named person with the
 * knowledge-steward role promotes it, against stated evidence, with a reason.
 * That is a decision, it is attributable, and it can be reversed — which is
 * three things an automatic update is not.
 *
 * FIVE PARTITIONS, KEPT APART ON PURPOSE.
 *
 * Mixing them is the other way this goes wrong. A user's preference for
 * shorter summaries is not a fact about a project; a project fact is not
 * organisational policy; an agent's scratch notes are not a lesson. Systems
 * that keep one undifferentiated "memory" end up citing somebody's formatting
 * preference as a reason for a commercial position.
 *
 * PRIORS ARE COUNTED, NOT ASSERTED.
 *
 * A calibrated prior here reports the number of approved observations behind
 * it and refuses to present a single observation as a pattern. One project
 * that ran 12% over is an anecdote; the system says so rather than returning
 * 12% with the same confidence it would return a hundred.
 */

import { collection, insert, update, id as newId, recordLedger } from "../store.js";
import { instant } from "./evidence.js";
import { num } from "./num.js";

const COLLECTION = "memory";

/** The five partitions, and what may write to each. */
export const PARTITIONS = [
  {
    id: "working", name: "Agent working context",
    agentMayWrite: true, requiresPromotion: false, institutional: false,
    retention: "the run it belongs to",
    say: "An agent's scratch space for one run. Discarded with the run, never cited.",
  },
  {
    id: "project", name: "Project facts",
    agentMayWrite: true, requiresPromotion: false, institutional: false,
    retention: "the life of the project",
    say: "What is true of one project. Written freely because it is scoped to that project and traceable to its source; it never generalises to another.",
  },
  {
    id: "preference", name: "User preference",
    agentMayWrite: true, requiresPromotion: false, institutional: false,
    retention: "until the person changes it",
    say: "How one person likes their output. Never a reason for a commercial position.",
  },
  {
    id: "policy", name: "Organisational policy",
    agentMayWrite: false, requiresPromotion: true, institutional: true,
    retention: "until superseded, with the history kept",
    say: "What this business does and does not do. Written by people, never by an agent, at any autonomy level.",
  },
  {
    id: "lessons", name: "Approved lessons",
    agentMayWrite: false, requiresPromotion: true, institutional: true,
    retention: "until superseded, with the history kept",
    say: "What the business has learned and now applies. An agent may propose one; only a knowledge steward makes it true.",
  },
];

const BY_ID = new Map(PARTITIONS.map((p) => [p.id, p]));

/** The lesson lifecycle. Nothing skips a state. */
export const STATES = ["PROPOSED", "APPROVED", "REJECTED", "SUPERSEDED", "RETIRED"];

/** Who may promote a proposal into institutional memory. Nobody else. */
export const PROMOTION_ROLES = ["KNOWLEDGE_STEWARD", "EXECUTIVE_SPONSOR"];

function row(raw) {
  return { ...raw };
}

/**
 * Write to memory. The partition decides whether this is allowed at all, and
 * an agent writing to an institutional partition is refused rather than
 * queued — a refusal a caller can see beats a silent proposal nobody reads.
 */
export function remember({ partition, key, value, scope = null, by = null, kind = "human", source = null, at = null } = {}) {
  const p = BY_ID.get(String(partition));
  const faults = [];
  if (!p) faults.push(`"${partition}" is not one of the five partitions`);
  if (!key) faults.push("no key");
  if (value === undefined) faults.push("no value");
  if (!by) faults.push("nobody is named as writing this");
  if (p && p.id !== "working" && !source) faults.push("no source — anything outside an agent's scratch space must say where it came from");
  if (p && !p.agentMayWrite && kind === "agent") {
    faults.push(`an agent may not write to ${p.name}. It may propose a lesson; it may never make one true. This is the rule that stops one agent's conclusion becoming a figure the next bid prices on.`);
  }
  if (p && p.institutional && kind !== "agent") {
    faults.push(`${p.name} is institutional memory and is written by promotion, not by writing. Use propose() and have a knowledge steward promote it, so the change is a decision somebody took rather than a row somebody added.`);
  }
  if (faults.length) return { ok: false, faults, entry: null };

  const entry = insert(COLLECTION, {
    id: newId(),
    partition: p.id,
    key: String(key),
    value,
    scope: scope ? String(scope) : null,
    state: "APPROVED", // a non-institutional partition has no lifecycle
    by: String(by),
    kind: kind === "agent" ? "agent" : "human",
    source: source ? String(source) : null,
    at: instant(at) ?? Date.now(),
    evidence: [],
    approvedBy: null,
    approvedAt: null,
    reason: null,
    supersedes: null,
    observations: 1,
  });
  return { ok: true, faults: [], entry: row(entry) };
}

/**
 * Propose a lesson. This is the ONLY route an agent has into institutional
 * memory, and it ends in a queue rather than in the memory itself.
 */
export function propose({ key, value, evidence = [], by = null, kind = "agent", source = null, scope = null, rationale = null, at = null } = {}) {
  const faults = [];
  if (!key) faults.push("no key");
  if (value === undefined) faults.push("no value");
  if (!by) faults.push("nobody is named as proposing this");
  if (!rationale) faults.push("no rationale — a lesson nobody can argue with is a lesson nobody can reject");
  if (!Array.isArray(evidence) || evidence.length === 0) {
    faults.push("no evidence. A lesson is a generalisation, and a generalisation with nothing behind it is the thing this gate exists to stop.");
  }
  if (faults.length) return { ok: false, faults, entry: null };

  const entry = insert(COLLECTION, {
    id: newId(),
    partition: "lessons",
    key: String(key),
    value,
    scope: scope ? String(scope) : null,
    state: "PROPOSED",
    by: String(by),
    kind: kind === "human" ? "human" : "agent",
    source: source ? String(source) : null,
    at: instant(at) ?? Date.now(),
    evidence: evidence.map(String),
    rationale: String(rationale),
    approvedBy: null,
    approvedAt: null,
    reason: null,
    supersedes: null,
    observations: evidence.length,
  });
  recordLedger("lesson.proposed", String(key), String(by), `${evidence.length} piece(s) of evidence — ${rationale}`);
  return { ok: true, faults: [], entry: row(entry) };
}

/**
 * Promote a proposal into institutional memory — or refuse it.
 *
 * The three refusals below are the gate. Each of them is a real way an
 * automatic memory goes wrong, dressed up as a process.
 */
export function promote({ entryId, decision = "APPROVED", by = null, role = null, reason = null, at = null } = {}) {
  const entry = collection(COLLECTION).find((r) => r.id === String(entryId));
  if (!entry) return { ok: false, faults: ["no such proposal"], entry: null };
  if (entry.state !== "PROPOSED") return { ok: false, faults: [`this is ${entry.state}, not PROPOSED — a decision already taken is not retaken by taking it again`], entry: null };

  const faults = [];
  if (!by) faults.push("nobody is named as promoting this");
  if (!PROMOTION_ROLES.includes(String(role))) {
    faults.push(`${role || "an unstated role"} may not promote a lesson into institutional memory. Only ${PROMOTION_ROLES.join(" or ")} may.`);
  }
  if (!reason) faults.push("no reason recorded");
  // THE ONE THAT MATTERS. An agent proposing and the same agent approving is
  // an automatic update with a signature on it.
  if (by && entry.by && String(by) === String(entry.by)) {
    faults.push("the promoter is the proposer. A lesson approved by whatever proposed it has not passed a gate, it has passed itself.");
  }
  if (entry.kind === "agent" && by && String(by).startsWith("agent")) {
    faults.push("an agent cannot promote a lesson at any autonomy level. This is the rule that keeps unverified output out of institutional truth.");
  }
  if (!STATES.includes(String(decision)) || (decision !== "APPROVED" && decision !== "REJECTED")) {
    faults.push(`"${decision}" is not a promotion decision; it is APPROVED or REJECTED`);
  }
  if (faults.length) return { ok: false, faults, entry: null };

  const stamp = instant(at) ?? Date.now();
  // An approval supersedes any earlier approved lesson on the same key,
  // keeping its history rather than replacing it.
  let superseded = [];
  if (decision === "APPROVED") {
    for (const r of collection(COLLECTION)) {
      if (r.id === entry.id) continue;
      if (r.partition !== "lessons" || r.key !== entry.key || r.state !== "APPROVED") continue;
      update(COLLECTION, r.id, { state: "SUPERSEDED", supersededBy: entry.id, supersededAt: stamp });
      superseded.push(r.id);
    }
  }
  const updated = update(COLLECTION, entry.id, {
    state: decision,
    approvedBy: String(by),
    approvedRole: String(role),
    approvedAt: stamp,
    reason: String(reason),
    supersedes: superseded.length ? superseded : null,
  });
  recordLedger(decision === "APPROVED" ? "lesson.approved" : "lesson.rejected", entry.key, String(by), reason);
  return { ok: true, faults: [], entry: row(updated), superseded };
}

/** Read a partition. Only APPROVED institutional memory is ever returned. */
export function recall({ partition, key = null, scope = null } = {}) {
  const p = BY_ID.get(String(partition));
  if (!p) return { ok: false, reason: `"${partition}" is not one of the five partitions`, entries: [] };
  const entries = collection(COLLECTION)
    .filter((r) => r.partition === p.id)
    .filter((r) => (key === null || r.key === String(key)))
    .filter((r) => (scope === null || r.scope === null || r.scope === String(scope)))
    // A proposal is NOT memory. This one line is the difference between a
    // gate and a queue nobody looks at.
    .filter((r) => r.state === "APPROVED")
    .sort((a, b) => b.at - a.at)
    .map(row);
  return { ok: true, partition: p.id, institutional: p.institutional, entries, count: entries.length };
}

/** Everything waiting on a person. An empty queue is an unused gate. */
export function pending() {
  return collection(COLLECTION)
    .filter((r) => r.state === "PROPOSED")
    .sort((a, b) => a.at - b.at)
    .map((r) => ({
      id: r.id, key: r.key, value: r.value, by: r.by, kind: r.kind,
      evidence: r.evidence, rationale: r.rationale, at: new Date(r.at).toISOString(),
      waitingDays: Math.floor((Date.now() - r.at) / 86400000),
    }));
}

/**
 * A calibrated prior: the value, and how much is actually behind it.
 *
 * The `enough` flag is the honest part. One project that ran twelve per cent
 * over is an anecdote, and returning it with the same shape as a hundred
 * projects is how an anecdote becomes a planning assumption.
 */
export function prior(key, { minObservations = 5 } = {}) {
  const approved = collection(COLLECTION)
    .filter((r) => r.partition === "lessons" && r.key === String(key) && r.state === "APPROVED");
  if (approved.length === 0) {
    return { ok: true, known: false, key: String(key), value: null, observations: 0, enough: false,
      say: `Nothing has been learned about ${key}. Not knowing is the correct answer and it is given rather than guessed at.` };
  }
  const current = approved.sort((a, b) => b.approvedAt - a.approvedAt)[0];
  const observations = approved.reduce((n, r) => n + (num(r.observations) ?? 1), 0);
  const numeric = num(current.value);
  const values = approved.map((r) => num(r.value)).filter((v) => v !== null);
  const spread = values.length > 1
    ? { min: Math.min(...values), max: Math.max(...values) }
    : null;
  return {
    ok: true,
    known: true,
    key: String(key),
    value: current.value,
    numeric,
    observations,
    versions: approved.length,
    spread,
    approvedBy: current.approvedBy,
    approvedAt: new Date(current.approvedAt).toISOString(),
    evidence: current.evidence,
    enough: observations >= minObservations,
    say: observations >= minObservations
      ? `${JSON.stringify(current.value)}, from ${observations} approved observation(s).`
      : `${JSON.stringify(current.value)}, from only ${observations} observation(s) — that is an anecdote, not a pattern, and it is reported as one. It needs ${minObservations} before anything should be planned on it.`,
  };
}

/** Retire a lesson that has stopped being true. A decision, like promoting. */
export function retire({ entryId, by = null, role = null, reason = null, at = null } = {}) {
  const entry = collection(COLLECTION).find((r) => r.id === String(entryId));
  if (!entry) return { ok: false, faults: ["no such lesson"] };
  if (entry.state !== "APPROVED") return { ok: false, faults: [`this is ${entry.state}, not an approved lesson`] };
  const faults = [];
  if (!by) faults.push("nobody is named");
  if (!PROMOTION_ROLES.includes(String(role))) faults.push(`${role || "an unstated role"} may not retire a lesson`);
  if (!reason) faults.push("no reason — a lesson withdrawn without one looks like an accident later");
  if (faults.length) return { ok: false, faults };
  update(COLLECTION, entry.id, { state: "RETIRED", retiredBy: String(by), retiredAt: instant(at) ?? Date.now(), retiredReason: String(reason) });
  recordLedger("lesson.retired", entry.key, String(by), reason);
  return { ok: true, faults: [] };
}

/** The state of the whole memory, for the internal page. */
export function state() {
  const rows = collection(COLLECTION);
  const byPartition = PARTITIONS.map((p) => ({
    ...p,
    entries: rows.filter((r) => r.partition === p.id && r.state === "APPROVED").length,
    proposed: rows.filter((r) => r.partition === p.id && r.state === "PROPOSED").length,
  }));
  const waiting = pending();
  const institutional = rows.filter((r) => r.state === "APPROVED" && BY_ID.get(r.partition)?.institutional);
  const agentWritten = institutional.filter((r) => r.kind === "agent" && !r.approvedBy);
  return {
    partitions: byPartition,
    total: rows.length,
    institutional: institutional.length,
    pending: waiting.length,
    oldestPendingDays: waiting.length ? waiting[waiting.length - 1].waitingDays : null,
    // Always zero, and asserted rather than assumed: an institutional entry
    // with no approver is agent output that reached truth without a gate.
    ungated: agentWritten.length,
    say: agentWritten.length
      ? `${agentWritten.length} institutional entry(ies) carry no approver. That is agent output that became truth without a decision, and it is the failure this partition exists to prevent.`
      : institutional.length === 0
        ? "Nothing has been promoted into institutional memory. Nothing has learned anything, and nothing has learned anything wrong."
        : `${institutional.length} institutional entry(ies), every one promoted by a named person.`,
  };
}
