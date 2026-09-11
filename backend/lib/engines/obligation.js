/**
 * THE OBLIGATION MONITOR — every obligation as a controlled object.
 *
 * The register's own reason for building this: "a right lost to a deadline is
 * lost completely, and nothing in the current system watches one." The
 * contract watch closed half of that — it resolves recorded events against a
 * project's own clause graph and reports the deadlines running today. What it
 * does not do is the other half, and the other half is the harder one:
 *
 *   THE DEADLINES IT REPORTS ARE ONLY THE ONES SOMEBODY ALREADY RECORDED AN
 *   EVENT FOR. An obligation nobody has raised an event against is invisible,
 *   and a programme submission due at contract start is exactly that kind of
 *   obligation. So a project can be fully watched and fully in breach.
 *
 * This engine turns the clause graph into a REGISTER — one controlled row per
 * obligation, whether or not anything has happened — and then measures each
 * row against the eight attributes the architecture requires: responsible
 * party, trigger event, required action, notice period, whether it is a time
 * bar, communication method, evidence, and the consequence of not complying.
 *
 * WHAT IT REFUSES. A row is not admitted to the register when it would be
 * unwatchable, because an unwatchable obligation on a register is worse than
 * an absent one — it reads as covered:
 *
 *   · A TIME BAR WITH NO PERIOD. The bar is the whole point and the period is
 *     what makes it a date. Without one the row says a right can be lost and
 *     cannot say when.
 *   · A PERIOD WITH NO BASIS, or a basis this system does not count in. Five
 *     "fortnights" read as five days is a deadline seventy days early, and
 *     the clause layer already learned that lesson the hard way.
 *   · NO SINGLE RESPONSIBLE PARTY. "Both", "shared", "the team" and a blank
 *     are the same answer, and on a notice obligation it means nobody serves
 *     it. The same refusal as the interface register, for the same reason.
 *   · A TIME BAR WITH NO STATED CONSEQUENCE. "Notify within eight weeks" is
 *     an instruction; "or the entitlement is lost" is why anybody does it.
 *   · NO COMMUNICATION METHOD ON A NOTICE. A notice served the wrong way is
 *     not served, and the commonest way to lose a valid claim is to have sent
 *     it to the wrong person by the wrong route inside the period.
 *
 * IT NOTIFIES NOTHING AND SERVES NOTHING. Issuing a contractual notice is
 * class E under the authority register and stays with an authorised person,
 * whatever the register says about autonomy.
 */

import { graph, FORMS, EVENTS, PERIOD_BASES, triggerFor } from "../l7/clauses.js";
import { contractFor, eventsFor, live } from "../l7/watch.js";
import { isOwner } from "../interfacecheck.js";
import { num } from "../l7/num.js";

/** The eight attributes an obligation has to carry to be watchable. */
export const ATTRIBUTES = [
  { key: "party", name: "Responsible party", why: "an obligation with no single owner is one nobody performs" },
  { key: "trigger", name: "Trigger event", why: "without it nothing can say the clock has started" },
  { key: "action", name: "Required action", why: "a duty nobody can describe is a duty nobody can discharge" },
  { key: "period", name: "Notice period", why: "the period is what turns a duty into a date" },
  { key: "timebar", name: "Time bar", why: "whether failing it loses the right outright, or merely delays it" },
  { key: "method", name: "Communication method", why: "a notice served the wrong way is not served" },
  { key: "evidence", name: "Evidence required", why: "an obligation discharged with nothing recording it will be disputed" },
  { key: "consequence", name: "Consequence of non-compliance", why: "the reason anybody acts inside the period" },
];

/** The kinds of clause that become obligations on this register. */
const WATCHABLE = new Set(["notice", "timebar", "obligation", "procedure", "payment"]);

/**
 * How a communication is made. Not free text: the point of recording it is
 * that a notice sent by a route the contract does not recognise has not been
 * given, so the route has to be one of a known set to be checkable.
 */
export const METHODS = [
  { id: "contract_system", name: "The contract's own communication system", note: "NEC4 requires communications in a form the contract states; a project system is the usual answer" },
  { id: "written_notice", name: "Written notice to the address in the contract particulars", note: "JCT and FIDIC name the recipient and the address" },
  { id: "email_agreed", name: "Email, where the contract particulars permit it", note: "permitted email is a route; unpermitted email is not" },
  { id: "portal", name: "The client's own portal, where the contract requires it", note: "a portal submission is only a notice if the contract says so" },
];
const METHOD_IDS = new Set(METHODS.map((m) => m.id));

/** The default route for each standard form, so a register starts somewhere real. */
const FORM_METHOD = {
  "NEC4-A": "contract_system",
  "NEC4-C": "contract_system",
  "JCT-DB-2016": "written_notice",
  "JCT-SBC-2016": "written_notice",
  "FIDIC-RED-2017": "written_notice",
  "FIDIC-YELLOW-2017": "written_notice",
};

/**
 * One obligation row, checked.
 *
 * Returns the row and its faults rather than throwing, so a register can be
 * produced with the bad rows named — a register that refuses to build at all
 * because one row is wrong tells nobody which row.
 */
export function obligation(raw = {}) {
  const faults = [];
  const period = num(raw.period);
  const timebar = raw.timebar === true;

  const party = String(raw.party || "").trim();
  // "BOTH" IS SOMETIMES THE CONTRACT AND USUALLY A GAP, and the difference
  // matters enough to be declared rather than guessed.
  //
  // The first version of this refused every row whose party was not a single
  // name, on the interface register's reasoning. That rule is right for a
  // notice and wrong for NEC4 clause 15.1: early warning genuinely binds both
  // parties, so the blanket refusal dropped a real obligation from the
  // register because the rule was too broad — which is the same failure as
  // admitting an unwatchable one, pointed the other way.
  //
  // So a mutual duty is allowed and must SAY it is mutual. A notice or a time
  // bar never can: a right is lost by one party, and "both of us were meant
  // to serve it" is how it gets lost.
  const mutual = raw.mutual === true;
  if (mutual && (timebar || String(raw.kind || "") === "notice")) {
    faults.push("declared as a mutual duty on a notice or a time bar. A right is lost by one party, and \"both of us were meant to serve it\" is how it gets lost.");
  } else if (!mutual && !isOwner(party)) {
    faults.push(`no single responsible party ("${party || "blank"}"). "Both", "shared", "the team" and a blank are the same answer, and on a notice obligation it means nobody serves it. Where the contract really does bind both parties, say so: mutual duties are allowed and have to be declared.`);
  } else if (mutual && !party) {
    faults.push("declared mutual with no parties named. Which two?");
  }
  const trigger = String(raw.trigger || "").trim();
  if (!trigger) faults.push("no trigger event, so nothing can say the clock has started");
  const action = String(raw.action || "").trim();
  if (action.length < 8) faults.push("no required action written down. A duty nobody can describe is a duty nobody can discharge.");

  if (timebar && period === null) {
    faults.push("a TIME BAR with no period. The bar is the whole point and the period is what makes it a date: this row says a right can be lost and cannot say when.");
  }
  const basis = raw.basis ? String(raw.basis) : period === null ? null : "calendar";
  if (period !== null && !PERIOD_BASES.includes(basis)) {
    faults.push(`a period of ${period} counted in "${basis}", which is not one of ${PERIOD_BASES.join(", ")}. Five "fortnights" read as five days is a deadline seventy days early.`);
  }
  if (period !== null && period < 0) faults.push(`a period of ${period}`);

  const method = raw.method ? String(raw.method) : null;
  if (!method) {
    faults.push("no communication method. A notice served the wrong way is not served, and the commonest way to lose a valid claim is to send it by a route the contract does not recognise, inside the period.");
  } else if (!METHOD_IDS.has(method)) {
    faults.push(`"${method}" is not a communication method this register recognises (${[...METHOD_IDS].join(", ")})`);
  }

  const consequence = String(raw.consequence || "").trim();
  if (timebar && consequence.length < 8) {
    faults.push("a time bar with no stated consequence. \"Notify within eight weeks\" is an instruction; \"or the entitlement is lost\" is why anybody does it.");
  }
  const evidence = String(raw.evidence || "").trim();

  const row = {
    ref: String(raw.ref || "").trim() || null,
    clause: String(raw.clause || "").trim() || null,
    name: String(raw.name || "").trim() || null,
    party: party || null,
    trigger: trigger || null,
    action: action || null,
    period,
    basis,
    timebar,
    mutual,
    method,
    evidence: evidence || null,
    consequence: consequence || null,
    // Whether a person has checked this against the executed contract. A
    // skeleton treated as the contract is the failure the clause layer exists
    // to prevent, so it is carried through to every row here.
    confirmed: raw.confirmed === true,
    source: raw.source ? String(raw.source) : null,
  };
  const missing = ATTRIBUTES.filter((a) => {
    if (a.key === "timebar") return false; // false is an answer, not a gap
    if (a.key === "period") return row.period === null && row.timebar;
    return row[a.key] === null;
  }).map((a) => a.key);

  return { ok: faults.length === 0, faults, row, missing };
}

/**
 * The register for one project, built from its own contract.
 *
 * Every watchable clause becomes a row whether or not an event has been
 * recorded against it — which is the gap this engine exists to close.
 */
export function register(project, { extra = [] } = {}) {
  const held = contractFor(project);
  if (!held) {
    return {
      ok: false,
      reason: `no contract is recorded for ${project}. Until one is, this register would be a list of obligations from a form nobody has said governs this project — which is worse than an empty page.`,
      rows: [], faults: [], unconfirmed: 0,
    };
  }
  const form = held.row.form;
  const g = held.graph;
  const rows = [];
  const faults = [];

  for (const c of g.clauses) {
    if (!WATCHABLE.has(c.kind)) continue;
    const checked = obligation({
      ref: `OB-${String(rows.length + faults.length + 1).padStart(3, "0")}`,
      clause: `${c.form || form} ${c.ref}`,
      name: c.name,
      party: c.party,
      kind: c.kind,
      // A clause the standard form itself puts on both parties is mutual by
      // the contract, not by somebody failing to fill in an owner.
      mutual: c.party === "both",
      trigger: c.trigger,
      action: c.say,
      period: c.period,
      basis: c.basis,
      timebar: c.kind === "timebar" || Boolean(c.barsIf),
      method: FORM_METHOD[form] || null,
      // The evidence and consequence come from the clause's own words where
      // it has them. Neither is invented: a consequence this engine wrote
      // would be this engine's opinion of the contract.
      evidence: c.kind === "notice" || c.kind === "timebar"
        ? "The communication itself, dated, with proof it was given by the contract's route"
        : null,
      consequence: c.barsIf || c.kind === "timebar" ? c.say : null,
      confirmed: c.confirmed,
      source: c.source,
    });
    if (checked.ok) rows.push(checked.row);
    else faults.push({ clause: `${c.form || form} ${c.ref}`, name: c.name, faults: checked.faults });
  }

  for (const e of extra) {
    const checked = obligation({ ...e, ref: e.ref || `OB-X${rows.length + 1}` });
    if (checked.ok) rows.push({ ...checked.row, source: e.source || "project-specific, entered by a person" });
    else faults.push({ clause: e.clause || "(project-specific)", name: e.name || null, faults: checked.faults });
  }

  const bars = rows.filter((r) => r.timebar);
  const unconfirmed = rows.filter((r) => !r.confirmed).length;
  return {
    ok: true,
    project: String(project),
    form,
    rows,
    faults,
    bars: bars.length,
    unconfirmed,
    say: `${rows.length} controlled obligation(s) under ${form}, ${bars.length} of them time-barred.`
      + (unconfirmed ? ` ${unconfirmed} still carry the standard-form skeleton rather than the executed contract, so every period on them is a starting point and not the contract.` : "")
      + (faults.length ? ` ${faults.length} clause(s) could not be made into a watchable row and are listed rather than dropped.` : ""),
  };
}

/**
 * DORMANT OBLIGATIONS — the register's whole reason for existing.
 *
 * An obligation whose trigger has no recorded event is not being watched by
 * anything. The contract watch cannot see it, because the watch starts from
 * events. That is not a criticism of the watch: it is why a register built
 * from the CONTRACT rather than from the events is a different instrument.
 */
export function dormant(project) {
  const reg = register(project);
  if (!reg.ok) return { ok: false, reason: reg.reason, rows: [] };
  const seen = new Set();
  for (const e of eventsFor(project)) {
    const t = triggerFor(e.event, reg.form);
    if (t) seen.add(t);
  }
  const rows = reg.rows.filter((r) => r.trigger && !seen.has(r.trigger));
  const barred = rows.filter((r) => r.timebar);
  return {
    ok: true,
    project: String(project),
    rows,
    barredDormant: barred,
    say: rows.length === 0
      ? "Every obligation on this project's register has an event recorded against its trigger, so the watch can see all of them."
      : `${rows.length} obligation(s) have no event recorded against their trigger, so nothing is watching them`
        + (barred.length ? `, and ${barred.length} of those are TIME BARS. A time bar nobody has raised an event against is not a bar that has not started; it is a bar nobody is counting.` : "."),
  };
}

/** The register, the dormant rows and the live deadlines in one answer. */
export function monitor(project, now = null) {
  const reg = register(project);
  if (!reg.ok) return { ok: false, reason: reg.reason };
  const d = dormant(project);
  const l = live(project, now);
  const completeness = reg.rows.length
    ? Math.round((reg.rows.filter((r) => ATTRIBUTES.every((a) => a.key === "timebar" || a.key === "period" || r[a.key] !== null)).length / reg.rows.length) * 100)
    : 0;
  return {
    ok: true,
    project: String(project),
    form: reg.form,
    register: reg,
    dormant: d,
    live: l,
    completeness,
    // The order matters: a lost entitlement first, then a bar nobody is
    // counting, then a bar running, then the rest. Anything else buries the
    // one row that cannot be recovered.
    say: [
      l.ok && l.barred.length ? `${l.barred.length} entitlement(s) already lost to a time bar.` : null,
      d.barredDormant.length ? `${d.barredDormant.length} time bar(s) with no event recorded against them, so nothing is counting.` : null,
      l.ok && l.urgent.length ? `${l.urgent.length} time bar(s) expire within a fortnight.` : null,
      reg.faults.length ? `${reg.faults.length} clause(s) are not watchable as written.` : null,
      `${reg.rows.length} controlled obligation(s), ${completeness}% carrying all eight attributes.`,
    ].filter(Boolean).join(" "),
  };
}

/** Every project with a contract, for the internal page and the sweep. */
export function state() {
  const rows = [];
  for (const form of Object.keys(FORMS)) {
    const g = graph({ form });
    const watchable = g.clauses.filter((c) => WATCHABLE.has(c.kind));
    rows.push({
      form,
      clauses: g.clauses.length,
      watchable: watchable.length,
      bars: watchable.filter((c) => c.kind === "timebar" || c.barsIf).length,
    });
  }
  return { forms: rows, attributes: ATTRIBUTES.length, methods: METHODS.length, events: EVENTS.length };
}
