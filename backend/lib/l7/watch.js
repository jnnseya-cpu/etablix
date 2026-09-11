/**
 * The contract watch — the clause graph doing something every day.
 *
 * A clause graph that nobody consults is a data structure. The specification
 * is explicit that the property is agents LOADING the tender's actual clause
 * graph rather than a graph existing, and the same trap caught the adversarial
 * review: the rules were built and nothing performed the challenge.
 *
 * This is what performs it. A project records its contract once and its site
 * events as they happen; the watch resolves every event against that project's
 * own contract on every automation sweep and produces the deadlines running
 * against the business today. A time bar five days out becomes an alert, and
 * a time bar that has passed becomes a different alert, because the second is
 * a lost entitlement rather than a task.
 *
 * AND EVERY EVENT IS RECORDED BITEMPORALLY, which is not tidiness.
 *
 * The question asked eighteen months later is never "when did it happen". It
 * is "when did you know". A compensation event notified late is defensible if
 * the contractor became aware on the fourteenth and indefensible if they knew
 * in March, and the difference between those two sentences is worth the whole
 * claim. So awareness is a fact with a valid time, the recording of it has its
 * own transaction time, and a correction to either leaves both readable.
 *
 * THE WATCH NEVER NOTIFIES ANYTHING. It says a deadline is running. Issuing a
 * contractual notice is class E under the authority register and stays with a
 * person, whatever the agent's autonomy level.
 */

import { collection, insert, update, id as newId } from "../store.js";
import { graph, resolve, deadlines, validate, FORMS, EVENTS, triggerFor } from "./clauses.js";
import { record as recordFact, asOf, reconstruct } from "./bitemporal.js";
import { instant } from "./evidence.js";
import { num } from "./num.js";

const CONTRACTS = "contractGraphs";
const EVENTS_C = "contractEvents";

/**
 * A machine-supplied instant: epoch milliseconds or an ISO string.
 *
 * TWO KINDS OF DATE ENTER THIS SYSTEM AND THEY NEED DIFFERENT READERS. A date
 * a person typed goes through instant(), which is deliberately strict: it
 * refuses "annual", refuses 31 February, and refuses a bare number, because a
 * mistyped quantity read as a date is a deadline computed from nothing.
 *
 * A date the machine supplied — the clock port's now(), a stored epoch — is
 * not that. It is already a number and it was never ambiguous. Passing it
 * through the strict reader returned null three separate times in this module
 * and each time the symptom was the same: a deadline silently not computed,
 * a watch reporting nothing, and no error anywhere. Three occurrences is the
 * boundary being wrong rather than three careless call sites, so it is named
 * once, here, and used everywhere a machine hands this module a moment.
 */
function moment(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return instant(value);
}

/** Record the contract a project is actually under. */
export function setContract({ project, form, amendments = [], by = null, note = null } = {}) {
  const faults = [];
  if (!project) faults.push("no project");
  if (!FORMS[String(form)]) faults.push(`"${form}" is not a form this system holds a skeleton for (${Object.keys(FORMS).join(", ")})`);
  if (!by) faults.push("nobody is named as recording this");
  if (faults.length) return { ok: false, faults, contract: null };

  const g = graph({ form, amendments });
  const check = validate(g);
  if (!check.ok) return { ok: false, faults: check.faults, contract: null };

  const existing = collection(CONTRACTS).find((c) => c.project === String(project));
  const row = {
    project: String(project),
    form: String(form),
    amendments: amendments.map((a) => ({ ...a })),
    by: String(by),
    note: note ? String(note) : null,
    at: Date.now(),
  };
  const saved = existing
    ? update(CONTRACTS, existing.id, row)
    : insert(CONTRACTS, { id: newId(), ...row });
  return { ok: true, faults: [], contract: { ...saved }, clauses: g.live.length, unconfirmed: g.live.filter((c) => !c.confirmed).length };
}

/** The graph for a project, or null. */
export function contractFor(project) {
  const row = collection(CONTRACTS).find((c) => c.project === String(project));
  if (!row) return null;
  return { row, graph: graph({ form: row.form, amendments: row.amendments || [] }) };
}

/**
 * Record a site event, and the day the party became aware of it.
 *
 * `awareAt` is the day that starts every clock in every form, and it is NOT
 * the day it is typed in. A system that conflates them starts every time bar
 * late and reports entitlements as live after they have gone.
 */
export function recordEvent({ project, event, awareAt, by = null, detail = null, notifiedAt = null, at = null } = {}) {
  const faults = [];
  if (!project) faults.push("no project");
  if (!EVENTS.some((e) => e.id === String(event))) {
    faults.push(`"${event}" is not one of the recorded site events (${EVENTS.map((e) => e.id).join(", ")})`);
  }
  const aware = instant(awareAt);
  if (aware === null) faults.push(`"${awareAt}" is not a date, and every period in every form runs from a day`);
  if (!by) faults.push("nobody is named as recording this");
  if (faults.length) return { ok: false, faults, event: null };

  const recordedAt = moment(at, Date.now());
  const row = insert(EVENTS_C, {
    id: newId(),
    project: String(project),
    event: String(event),
    awareAt: aware,
    notifiedAt: moment(notifiedAt),
    detail: detail ? String(detail) : null,
    by: String(by),
    at: recordedAt,
  });

  // The bitemporal half. Valid from the day awareness arose; recorded now.
  // Those two are frequently months apart and the gap is the claim.
  const fact = recordFact({
    entity: `${project}:${row.id}`,
    field: "awareAt",
    value: new Date(aware).toISOString().slice(0, 10),
    validFrom: aware,
    at: recordedAt,
    by: String(by),
    source: `contract event ${event}`,
    note: detail ? String(detail).slice(0, 200) : null,
  });

  return { ok: true, faults: [], event: { ...row }, fact: fact.fact ? fact.fact.id : null,
    lateByDays: Math.max(0, Math.round((recordedAt - aware) / 86400000)) };
}

/** Every event recorded against a project. */
export function eventsFor(project) {
  return collection(EVENTS_C)
    .filter((e) => e.project === String(project))
    .sort((a, b) => a.awareAt - b.awareAt)
    .map((e) => ({ ...e }));
}

/**
 * Every contractual deadline running against a project today.
 *
 * This is the list the automation sweep reads and the list a person would ask
 * for. An event already notified stops producing a notice deadline, because a
 * reminder to do something already done is how people learn to ignore alerts.
 */
export function live(project, now = null) {
  const held = contractFor(project);
  if (!held) return { ok: false, reason: `no contract is recorded for ${project}, so nothing can be said about its deadlines. That is a gap in the record, not an absence of obligation.`, deadlines: [] };
  const at = moment(now, Date.now());
  if (at === null) return { ok: false, reason: `"${now}" is not a moment this module can read`, deadlines: [] };

  const rows = [];
  const gaps = [];
  for (const e of eventsFor(project)) {
    const trigger = triggerFor(e.event, held.row.form);
    if (!trigger) {
      gaps.push({
        event: e.id, kind: e.event, unmapped: true,
        say: `${held.row.form} has no recorded name for "${e.event}". That is a gap in the graph and it is shown rather than silently dropped, because a dropped event is an entitlement nobody is watching.`,
      });
      continue;
    }
    // The store holds epoch milliseconds and the resolver reads days, so the
    // conversion happens HERE rather than by loosening the date reader. A
    // parser that accepts numbers accepts a mistyped quantity as a date, and
    // every period in this module runs from whatever it returns.
    const r = resolve(held.graph, { trigger, awareAt: new Date(e.awareAt).toISOString(), now: new Date(at).toISOString() });
    if (!r.ok) { gaps.push({ event: e.id, kind: e.event, error: r.reason }); continue; }
    for (const c of r.clauses) {
      if (c.deadline === null) continue;
      // A step already taken is not a deadline.
      if (e.notifiedAt && (c.kind === "notice" || c.kind === "timebar")) continue;
      rows.push({
        event: e.id,
        kind: e.event,
        clause: `${c.form} ${c.ref}`,
        name: c.name,
        party: c.party,
        deadline: c.deadline,
        daysRemaining: c.daysRemaining,
        late: c.late,
        barring: c.barring,
        consequence: c.consequence,
        unconfirmed: !c.confirmed,
      });
    }
  }
  const barred = rows.filter((r) => r.barring && r.late);
  const urgent = rows.filter((r) => r.barring && !r.late && r.daysRemaining !== null && r.daysRemaining <= 14);
  return {
    ok: true,
    project: String(project),
    form: held.row.form,
    deadlines: rows.sort((a, b) => String(a.deadline || "") < String(b.deadline || "") ? -1 : 1),
    barred,
    urgent,
    // AN EVENT THE GRAPH COULD NOT RESOLVE IS NOT A DEADLINE, and counting it
    // as one made "1 deadline running" mean "1 event nobody is watching".
    // They are reported separately because the work is different: a gap needs
    // the graph extending, a deadline needs somebody to act.
    gaps,
    say: gaps.length && rows.length === 0
      ? `${gaps.length} event(s) this contract has no clause for. Nothing is being watched on this project and that is a gap in the record, not an absence of obligation.`
      : barred.length
      ? `${barred.length} entitlement(s) already lost to a time bar on this project.`
      : urgent.length
        ? `${urgent.length} time bar(s) expire within a fortnight.`
        : rows.length
          ? `${rows.length} contractual deadline(s) running, none of them inside a fortnight.`
          : "No contractual deadline is running against this project."
            + (gaps.length ? ` ${gaps.length} event(s) could not be resolved against it.` : ""),
  };
}

/** Every project with a contract recorded, for the sweep. */
export function watched() {
  return [...new Set(collection(CONTRACTS).map((c) => c.project))];
}

/**
 * What we knew, on the day. The question a claim turns on, answered from the
 * fact store rather than from the current row.
 */
export function awarenessOn({ project, eventId, decisionAt } = {}) {
  return reconstruct({ entity: `${project}:${eventId}`, field: "awareAt", decisionAt });
}

/** The whole picture, for the internal page and the probe. */
export function state() {
  const projects = watched();
  const rows = projects.map((p) => {
    const l = live(p);
    return { project: p, ok: l.ok, form: l.form || null, deadlines: l.ok ? l.deadlines.length : 0, barred: l.ok ? l.barred.length : 0, urgent: l.ok ? l.urgent.length : 0, gaps: l.ok ? l.gaps.length : 0, say: l.ok ? l.say : l.reason };
  });
  return {
    projects: rows,
    watching: projects.length,
    events: collection(EVENTS_C).length,
    barred: rows.reduce((n, r) => n + r.barred, 0),
    urgent: rows.reduce((n, r) => n + r.urgent, 0),
    say: projects.length === 0
      ? "No project has a contract recorded, so the clause graph is watching nothing. A graph nobody loads is a data structure."
      : `${projects.length} project(s) watched against their own contract, ${collection(EVENTS_C).length} event(s) recorded.`,
  };
}
