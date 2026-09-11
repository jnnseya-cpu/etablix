/**
 * The clause graph — the tender's own contract as objects, so an agent
 * reasons inside THIS contract rather than about construction contracts.
 *
 * THE TEST THE SPECIFICATION SETS is that the same site event produces
 * different rights under NEC4 Option A, JCT Design and Build and FIDIC
 * Yellow — and different again once a bespoke amendment is loaded. That is
 * not a stylistic difference. Under NEC4 a compensation event not notified
 * within eight weeks of the contractor becoming aware of it is lost
 * altogether; under JCT the equivalent notice has no such long-stop and the
 * consequence of lateness is different in kind. A system that answers "notify
 * promptly and keep records" to both has said something true and useless.
 *
 * WHAT THIS MODULE HOLDS AND WHAT IT REFUSES TO HOLD.
 *
 * It holds the STRUCTURE and the PERIODS: which clause a trigger engages, who
 * must act, how long they have, what is lost if they do not, and which clause
 * wins when two conflict. Those are the things a machine can compute and a
 * person forgets under pressure.
 *
 * It does NOT hold clause text. Standard forms are published by their own
 * bodies and a project's executed contract is amended in ways no template
 * predicts, so a graph carrying remembered wording would be confidently
 * wrong at exactly the moment it mattered. Every clause here carries
 * `textLoaded: false` until somebody loads the executed contract into it, and
 * a resolution against an unloaded clause says so in its answer rather than
 * pretending. The skeletons below are a STARTING POINT to be confirmed
 * against the contract in hand, and the module says that in every answer.
 *
 * THE AMENDMENT IS THE POINT.
 *
 * A bespoke amendment supersedes the standard clause, and that is the whole
 * reason generic knowledge fails: the standard form says twenty-eight days,
 * the Z-clause says fourteen, and every model trained on the standard form
 * will confidently answer twenty-eight. Here the amendment is an object that
 * supersedes, the resolution follows the supersession chain, and the answer
 * names which clause actually governed and what it displaced.
 */

import { addWorkingDays, iso, isWorkingDay } from "../workingdays.js";
import { instant } from "./evidence.js";
import { num } from "./num.js";

const DAY = 86400000;

/** What a clause does, which is what decides how it is reasoned about. */
export const CLAUSE_KINDS = [
  { id: "notice", name: "Notice obligation", say: "one party must tell the other something within a period" },
  { id: "timebar", name: "Time bar", say: "a right is LOST if a step is not taken in time" },
  { id: "entitlement", name: "Entitlement", say: "a right to time, money or both, if its conditions are met" },
  { id: "obligation", name: "Obligation", say: "something a party must do, with a consequence if they do not" },
  { id: "payment", name: "Payment mechanism", say: "when a sum becomes due and by when it must be paid" },
  { id: "liability", name: "Liability", say: "a cap, an exclusion, an indemnity or a deduction" },
  { id: "procedure", name: "Procedure", say: "a process the contract requires, such as early warning or a risk register" },
  { id: "definition", name: "Definition", say: "a defined term that changes the meaning of every clause using it" },
];

const KIND_IDS = new Set(CLAUSE_KINDS.map((k) => k.id));

/** How a period is counted, which changes the answer by days. */
export const PERIOD_BASES = ["calendar", "working", "week"];

/**
 * The standard-form skeletons.
 *
 * EACH ENTRY IS A CLAUSE REFERENCE AND A RULE, NOT A QUOTATION. The
 * references and periods below are the widely published provisions of each
 * form; they are here so a project starts from the right shape rather than a
 * blank page, and every one is marked unconfirmed until somebody checks it
 * against the executed contract. A skeleton that is treated as the contract
 * is the failure this module exists to prevent, so `confirmed` is false on
 * every row and the resolver reports it.
 */
export const FORMS = {
  "NEC4-A": {
    id: "NEC4-A",
    name: "NEC4 Engineering and Construction Contract, Option A",
    note: "Priced contract with activity schedule. Compensation events, early warning, and a long-stop on notification.",
    clauses: [
      { ref: "15.1", kind: "procedure", name: "Early warning", party: "both", trigger: "aware_of_matter", period: null,
        say: "Both parties give early warning as soon as either becomes aware of a matter affecting time, cost or quality." },
      { ref: "61.3", kind: "timebar", name: "Notification of a compensation event", party: "contractor",
        trigger: "compensation_event", period: 8, basis: "week", barsIf: "late",
        say: "A compensation event the Contractor should have notified is NOT notified within eight weeks of becoming aware: the Contractor is not entitled to a change in the Prices, the Completion Date or a Key Date." },
      { ref: "62.3", kind: "obligation", name: "Quotation for a compensation event", party: "contractor",
        trigger: "instruction_to_quote", period: 3, basis: "week",
        say: "The Contractor submits a quotation within three weeks of being instructed to." },
      { ref: "62.3", kind: "obligation", name: "Reply to a quotation", party: "employer",
        trigger: "quotation_received", period: 2, basis: "week",
        say: "The Project Manager replies within two weeks of the quotation." },
      { ref: "63.5", kind: "entitlement", name: "Delay to the Completion Date", party: "contractor",
        trigger: "compensation_event", period: null,
        say: "A delay to the Completion Date is assessed as the length of time planned Completion is later than shown on the Accepted Programme." },
      { ref: "31.2", kind: "obligation", name: "Programme submission", party: "contractor", trigger: "contract_start", period: null,
        say: "The Contractor submits a programme showing the information the contract requires." },
    ],
  },
  "JCT-DB-2016": {
    id: "JCT-DB-2016",
    name: "JCT Design and Build Contract 2016",
    note: "Relevant Events and Relevant Matters, notified forthwith rather than against a long-stop.",
    clauses: [
      { ref: "2.24.1", kind: "notice", name: "Notice of delay", party: "contractor", trigger: "delay_becomes_apparent",
        period: 0, basis: "calendar", barsIf: null,
        say: "The Contractor notifies FORTHWITH when it becomes reasonably apparent that progress is being delayed, giving the cause. There is no long-stop after which the entitlement is lost outright." },
      { ref: "2.25", kind: "entitlement", name: "Extension of time for a Relevant Event", party: "contractor",
        trigger: "relevant_event", period: 12, basis: "week",
        say: "The Employer gives an extension as is fair and reasonable, so far as practicable within twelve weeks of receiving the required particulars." },
      { ref: "4.20", kind: "entitlement", name: "Loss and expense for a Relevant Matter", party: "contractor",
        trigger: "relevant_matter", period: null,
        say: "The Contractor is entitled to loss and expense for a Relevant Matter, notified as soon as the likely effect becomes apparent." },
      { ref: "4.7", kind: "payment", name: "Interim payment", party: "employer", trigger: "interim_application", period: null,
        say: "Interim payments are made against the payment provisions, which must satisfy the Construction Act." },
    ],
  },
  "NEC4-C": {
    id: "NEC4-C",
    name: "NEC4 Engineering and Construction Contract, Option C",
    note: "Target contract with activity schedule. The same compensation-event machinery as Option A, and a pain/gain share on top — so the SAME notice failure costs a share of the difference as well as the entitlement.",
    clauses: [
      { ref: "15.1", kind: "procedure", name: "Early warning", party: "both", trigger: "aware_of_matter", period: null,
        say: "Both parties give early warning as soon as either becomes aware of a matter affecting time, cost or quality." },
      { ref: "61.3", kind: "timebar", name: "Notification of a compensation event", party: "contractor",
        trigger: "compensation_event", period: 8, basis: "week", barsIf: "late",
        say: "A compensation event the Contractor should have notified is NOT notified within eight weeks of becoming aware: the Contractor is not entitled to a change in the Prices, the Completion Date or a Key Date. Under a target contract the unnotified cost also lands in the Defined Cost without a matching move in the target, so it is shared against us." },
      { ref: "62.3", kind: "obligation", name: "Quotation for a compensation event", party: "contractor",
        trigger: "instruction_to_quote", period: 3, basis: "week",
        say: "The Contractor submits a quotation within three weeks of being instructed to." },
      { ref: "63.5", kind: "entitlement", name: "Delay to the Completion Date", party: "contractor",
        trigger: "compensation_event", period: null,
        say: "A delay to the Completion Date is assessed as the length of time planned Completion is later than shown on the Accepted Programme." },
      { ref: "20.4", kind: "obligation", name: "Forecast of Defined Cost", party: "contractor", trigger: "assessment_interval", period: null,
        say: "The Contractor forecasts the total Defined Cost for the whole of the works at the intervals stated in the Contract Data." },
      { ref: "53", kind: "entitlement", name: "The Contractor's share", party: "both", trigger: "completion", period: null,
        say: "The difference between the total of the Prices and the Price for Work Done to Date is shared between the parties in the share ranges stated in the Contract Data." },
    ],
  },
  "JCT-SBC-2016": {
    id: "JCT-SBC-2016",
    name: "JCT Standard Building Contract 2016",
    note: "THE CLAUSE NUMBERS ARE NOT THE SAME AS DESIGN AND BUILD, and that is the trap this entry exists for: the machinery is near-identical, the references are not, and a notice citing the wrong clause is an argument the other side gets for free.",
    clauses: [
      { ref: "2.27.1", kind: "notice", name: "Notice of delay", party: "contractor", trigger: "delay_becomes_apparent",
        period: 0, basis: "calendar", barsIf: null,
        say: "The Contractor notifies FORTHWITH when it becomes reasonably apparent that progress is being delayed, giving the cause. Note the reference: Design and Build puts the same obligation at 2.24.1." },
      { ref: "2.28", kind: "entitlement", name: "Extension of time for a Relevant Event", party: "contractor",
        trigger: "relevant_event", period: 12, basis: "week",
        say: "The Architect or Contract Administrator gives an extension as is fair and reasonable, so far as practicable within twelve weeks of receiving the required particulars." },
      { ref: "4.20", kind: "entitlement", name: "Loss and expense for a Relevant Matter", party: "contractor",
        trigger: "relevant_matter", period: null,
        say: "The Contractor is entitled to loss and expense for a Relevant Matter, notified as soon as the likely effect becomes apparent." },
      { ref: "4.9", kind: "payment", name: "Interim payment", party: "employer", trigger: "interim_application", period: null,
        say: "Interim payments are made against the payment provisions, which must satisfy the Construction Act." },
    ],
  },
  "FIDIC-RED-2017": {
    id: "FIDIC-RED-2017",
    name: "FIDIC Red Book 2017 (Construction, employer-designed)",
    note: "The same clause 20 claims machinery as the Yellow Book, over employer-designed works — so the notice periods match and the design-risk position does not.",
    clauses: [
      { ref: "20.2.1", kind: "timebar", name: "Notice of claim", party: "both", trigger: "claim_event",
        period: 28, basis: "calendar", barsIf: "late",
        say: "A party giving no Notice of Claim within twenty-eight days of becoming aware of the event has no entitlement, and the other party is discharged from all liability in connection with it." },
      { ref: "20.2.4", kind: "obligation", name: "Fully detailed Claim", party: "claimant", trigger: "notice_of_claim",
        period: 84, basis: "calendar",
        say: "A fully detailed Claim follows within eighty-four days of the claiming party becoming aware of the event." },
      { ref: "8.5", kind: "entitlement", name: "Extension of Time for Completion", party: "contractor", trigger: "claim_event", period: null,
        say: "The Contractor is entitled to an extension if completion is or will be delayed by a listed cause." },
      { ref: "14.7", kind: "payment", name: "Payment", party: "employer", trigger: "payment_certificate", period: 56, basis: "calendar",
        say: "The Employer pays within the period stated in the Contract Data, in default fifty-six days after the Statement and supporting documents." },
    ],
  },
  "FIDIC-YELLOW-2017": {
    id: "FIDIC-YELLOW-2017",
    name: "FIDIC Yellow Book 2017 (Plant and Design-Build)",
    note: "Claims under clause 20 with a twenty-eight day notice and a condition precedent.",
    clauses: [
      { ref: "20.2.1", kind: "timebar", name: "Notice of claim", party: "both", trigger: "claim_event",
        period: 28, basis: "calendar", barsIf: "late",
        say: "A party giving no Notice of Claim within twenty-eight days of becoming aware of the event has no entitlement, and the other party is discharged from all liability in connection with it." },
      { ref: "20.2.4", kind: "obligation", name: "Fully detailed Claim", party: "claimant", trigger: "notice_of_claim",
        period: 84, basis: "calendar",
        say: "A fully detailed Claim follows within eighty-four days of the claiming party becoming aware of the event." },
      { ref: "8.5", kind: "entitlement", name: "Extension of Time for Completion", party: "contractor", trigger: "claim_event", period: null,
        say: "The Contractor is entitled to an extension if completion is or will be delayed by a listed cause." },
      { ref: "14.7", kind: "payment", name: "Payment", party: "employer", trigger: "payment_certificate", period: 56, basis: "calendar",
        say: "The Employer pays within the period stated in the Contract Data, in default fifty-six days after the Statement and supporting documents." },
    ],
  },
};

/**
 * The canonical site events, and what each form calls them.
 *
 * WITHOUT THIS THE COMPARISON CANNOT BE MADE. Each form names the same
 * occurrence differently: ground conditions worse than foreseen is a
 * "compensation event" to NEC4, a "Relevant Event" and a "Relevant Matter"
 * to JCT, and simply an event giving rise to a Claim under FIDIC. A system
 * holding three clause graphs and no vocabulary between them can answer each
 * contract separately and cannot answer the question somebody actually asks,
 * which is "this happened on site — where do we stand on all three?"
 *
 * So an event is recorded once, in the words a site manager would use, and
 * the mapping below is what turns it into each contract's own trigger.
 */
export const EVENTS = [
  {
    id: "unforeseen_ground",
    name: "Ground conditions worse than an experienced contractor would have allowed for",
    triggers: { "NEC4-A": "compensation_event", "NEC4-C": "compensation_event", "JCT-DB-2016": "relevant_event", "JCT-SBC-2016": "relevant_event", "FIDIC-YELLOW-2017": "claim_event", "FIDIC-RED-2017": "claim_event" },
  },
  {
    id: "late_access",
    name: "Access to part of the site given later than the contract requires",
    triggers: { "NEC4-A": "compensation_event", "NEC4-C": "compensation_event", "JCT-DB-2016": "relevant_event", "JCT-SBC-2016": "relevant_event", "FIDIC-YELLOW-2017": "claim_event", "FIDIC-RED-2017": "claim_event" },
  },
  {
    id: "employer_instruction",
    name: "An instruction changing the works",
    triggers: { "NEC4-A": "compensation_event", "NEC4-C": "compensation_event", "JCT-DB-2016": "relevant_event", "JCT-SBC-2016": "relevant_event", "FIDIC-YELLOW-2017": "claim_event", "FIDIC-RED-2017": "claim_event" },
  },
  {
    id: "delay_apparent",
    name: "Progress is being delayed and the cause is now apparent",
    triggers: { "NEC4-A": "aware_of_matter", "NEC4-C": "aware_of_matter", "JCT-DB-2016": "delay_becomes_apparent", "JCT-SBC-2016": "delay_becomes_apparent", "FIDIC-YELLOW-2017": "claim_event", "FIDIC-RED-2017": "claim_event" },
  },
  {
    id: "loss_and_expense",
    name: "Regular progress is materially affected and cost is being incurred",
    triggers: { "NEC4-A": "compensation_event", "NEC4-C": "compensation_event", "JCT-DB-2016": "relevant_matter", "JCT-SBC-2016": "relevant_matter", "FIDIC-YELLOW-2017": "claim_event", "FIDIC-RED-2017": "claim_event" },
  },
];

const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

/** What this form calls this event, or null when it has no name for it. */
export function triggerFor(eventId, formId) {
  const e = EVENT_BY_ID.get(String(eventId));
  if (!e) return null;
  return e.triggers[String(formId)] || null;
}

/** A clause, with every field present and nothing assumed. */
export function clause(raw = {}) {
  const period = num(raw.period);
  return {
    id: String(raw.id || `${raw.form || "?"}:${raw.ref || "?"}`),
    form: raw.form ? String(raw.form) : null,
    ref: String(raw.ref || "").trim(),
    name: String(raw.name || "").trim(),
    kind: KIND_IDS.has(raw.kind) ? raw.kind : null,
    party: raw.party ? String(raw.party) : null,
    trigger: raw.trigger ? String(raw.trigger) : null,
    period,
    // AN UNRECOGNISED BASIS IS KEPT, NOT CORRECTED. This defaulted to
    // "calendar" when it did not recognise the basis, so a period of five
    // "fortnights" became five days — a deadline seventy days early, from a
    // typo, with nothing anywhere reporting a problem. Keeping the given
    // value is what lets validate() refuse it.
    basis: PERIOD_BASES.includes(raw.basis)
      ? raw.basis
      : raw.basis
        ? String(raw.basis)
        : period === null ? null : "calendar",
    barsIf: raw.barsIf ? String(raw.barsIf) : null,
    say: String(raw.say || "").trim(),
    // The executed contract's own words, loaded by a person. Never invented.
    text: raw.text ? String(raw.text) : null,
    textLoaded: Boolean(raw.text),
    confirmed: raw.confirmed === true,
    // Supersession: a bespoke amendment names the clause it replaces.
    supersedes: raw.supersedes ? String(raw.supersedes) : null,
    amendment: raw.amendment === true,
    source: raw.source ? String(raw.source) : null,
  };
}

/**
 * Build a graph for one project: a standard form, plus the bespoke
 * amendments that actually govern it.
 */
export function graph({ form = null, amendments = [], extra = [] } = {}) {
  const base = FORMS[String(form)] || null;
  const rows = [];
  if (base) for (const c of base.clauses) rows.push(clause({ ...c, form: base.id, id: `${base.id}:${c.ref}`, source: "standard form skeleton" }));
  for (const c of extra) rows.push(clause({ ...c, form: base ? base.id : c.form }));
  for (const a of amendments) rows.push(clause({ ...a, amendment: true, form: base ? base.id : a.form }));

  const byId = new Map(rows.map((c) => [c.id, c]));
  const byRef = new Map();
  for (const c of rows) {
    if (!byRef.has(c.ref)) byRef.set(c.ref, []);
    byRef.get(c.ref).push(c);
  }

  // Supersession, resolved once. An amendment naming a clause that does not
  // exist is a fault rather than a silent no-op: it usually means the ref was
  // mistyped, and a mistyped Z-clause is an amendment that does not apply.
  const superseded = new Set();
  const dangling = [];
  for (const c of rows) {
    if (!c.supersedes) continue;
    const target = byId.get(c.supersedes) || (byRef.get(c.supersedes) || []).find((x) => !x.amendment);
    if (!target) { dangling.push({ amendment: c.id, names: c.supersedes }); continue; }
    superseded.add(target.id);
  }

  return {
    form: base,
    clauses: rows,
    byId,
    byRef,
    superseded,
    dangling,
    live: rows.filter((c) => !superseded.has(c.id)),
  };
}

/** How many milliseconds a period is, on its own basis. */
function periodEnd(from, period, basis) {
  if (period === null) return null;
  // A basis nothing recognises produces no deadline at all. Computing one
  // from a guess is how a typo becomes a date somebody works back from.
  if (!PERIOD_BASES.includes(basis)) return null;
  if (basis === "working") {
    const end = addWorkingDays(iso(new Date(from)), period);
    return Date.parse(`${end}T23:59:59.999Z`);
  }
  const days = basis === "week" ? period * 7 : period;
  return from + days * DAY;
}

/** A human-readable period, so an answer reads as a contract reads. */
function periodWords(period, basis) {
  if (period === null) return "no period is stated";
  if (period === 0) return "forthwith";
  if (basis === "week") return `${period} week${period === 1 ? "" : "s"}`;
  if (basis === "working") return `${period} working day${period === 1 ? "" : "s"}`;
  return `${period} day${period === 1 ? "" : "s"}`;
}

/**
 * What this contract says about this event.
 *
 * Returns the clauses the event engages, each with its deadline computed from
 * the day the party became aware, whether the deadline has passed, and — the
 * part that matters — what is LOST if it has. Two contracts given the same
 * event return different answers, which is the whole point.
 */
export function resolve(g, { trigger, awareAt, now = null, party = null } = {}) {
  const aware = instant(awareAt);
  if (aware === null) {
    return {
      ok: false,
      reason: `"${awareAt}" is not a date. Every period in a construction contract runs from a day, so nothing can be computed from a description of one.`,
      clauses: [],
    };
  }
  const at = now === null ? Date.now() : instant(now);
  if (at === null) return { ok: false, reason: `"${now}" is not a date`, clauses: [] };

  const engaged = g.live.filter((c) => {
    if (c.trigger !== String(trigger)) return false;
    if (party && c.party && c.party !== "both" && c.party !== party) return false;
    return true;
  });

  const rows = engaged.map((c) => {
    const deadline = periodEnd(aware, c.period, c.basis);
    const late = deadline !== null && at > deadline;
    const remaining = deadline === null ? null : Math.ceil((deadline - at) / DAY);
    return {
      id: c.id,
      form: c.form,
      ref: c.ref,
      name: c.name,
      kind: c.kind,
      party: c.party,
      period: c.period,
      basis: c.basis,
      periodWords: periodWords(c.period, c.basis),
      deadline: deadline === null ? null : new Date(deadline).toISOString(),
      late,
      daysRemaining: remaining,
      // The sentence that differs between forms.
      consequence: c.kind === "timebar" && c.barsIf === "late"
        ? late
          ? `TIME-BARRED. ${c.say}`
          : `Not yet barred — ${remaining} day(s) remain. If this passes, the entitlement is lost, not merely weakened.`
        : c.say,
      barring: c.kind === "timebar" && c.barsIf === "late",
      amendment: c.amendment,
      supersededSomething: Boolean(c.supersedes),
      textLoaded: c.textLoaded,
      confirmed: c.confirmed,
      say: c.say,
    };
  });

  const barred = rows.filter((r) => r.barring && r.late);
  const unconfirmed = rows.filter((r) => !r.confirmed);

  return {
    ok: true,
    form: g.form ? g.form.id : null,
    formName: g.form ? g.form.name : null,
    trigger: String(trigger),
    awareAt: new Date(aware).toISOString(),
    asAt: new Date(at).toISOString(),
    clauses: rows.sort((a, b) => (a.deadline || Infinity) - (b.deadline || Infinity)),
    barred,
    // The headline, and it is deliberately different per form.
    verdict: barred.length
      ? `ENTITLEMENT LOST under ${barred.map((r) => `${r.form} ${r.ref}`).join(", ")}.`
      : rows.some((r) => r.barring)
        ? `Live, and under a time bar: ${rows.filter((r) => r.barring).map((r) => `${r.ref} expires in ${r.daysRemaining} day(s)`).join("; ")}.`
        : rows.length
          ? `${rows.length} clause(s) engaged; none of them bars the entitlement outright.`
          : "This contract has no clause recorded against that trigger, which means either the event is not one it deals with or the graph is incomplete. It does not mean there is no entitlement.",
    // Never omitted, because a skeleton read as the contract is the failure
    // this module exists to prevent.
    caveat: unconfirmed.length
      ? `${unconfirmed.length} of ${rows.length} clause(s) come from a standard-form skeleton and have NOT been confirmed against the executed contract. Confirm the reference, the period and any Z-clause before relying on this.`
      : null,
    textMissing: rows.filter((r) => !r.textLoaded).map((r) => r.ref),
  };
}

/**
 * The same event, put to several contracts. This is the specification's own
 * test, as a function: if the answers come back identical, the graph is not
 * doing anything and generic knowledge would have served just as well.
 */
export function compare(forms, event) {
  const answers = forms.map((f) => {
    const g = typeof f === "string" ? graph({ form: f }) : f;
    const formId = g.form ? g.form.id : null;
    // A canonical event is translated into this contract's own word for it.
    // A raw trigger still works, so a caller who knows the form can use it.
    const trigger = event.event
      ? triggerFor(event.event, formId)
      : event.trigger;
    if (!trigger) {
      return {
        ok: false,
        form: formId,
        formName: g.form ? g.form.name : null,
        reason: `${formId || "this contract"} has no recorded name for the event "${event.event}", so nothing can be said about it. That is a gap in the graph, not an absence of entitlement.`,
        clauses: [],
        verdict: `No mapping from "${event.event}" to a trigger in ${formId}.`,
      };
    }
    return { ...resolve(g, { ...event, trigger }), askedAs: trigger };
  });
  const verdicts = new Set(answers.map((a) => a.verdict));
  return {
    answers,
    // Different forms, different answers. Sameness is the finding, not the pass.
    differ: verdicts.size > 1,
    verdicts: [...verdicts],
    say: verdicts.size > 1
      ? `${verdicts.size} different answers from ${answers.length} contract(s) on the same event, which is what a clause graph is for.`
      : `Every contract gave the same answer. Either the event genuinely turns on nothing form-specific, or the graph is too thin to tell them apart — and the second is far more likely.`,
  };
}

/** Faults that make a graph unusable, refused rather than warned about. */
export function validate(g) {
  const faults = [];
  for (const d of g.dangling) {
    faults.push(`amendment ${d.amendment} supersedes "${d.names}", which is not a clause in this contract — a mistyped reference is an amendment that does not apply`);
  }
  for (const c of g.clauses) {
    if (!c.kind) faults.push(`${c.id}: kind is not one of the eight`);
    if (!c.ref) faults.push(`${c.id}: no clause reference`);
    if (!c.trigger && c.kind !== "definition" && c.kind !== "liability") {
      faults.push(`${c.id}: no trigger, so nothing will ever engage it`);
    }
    if (c.kind === "timebar" && c.period === null) {
      faults.push(`${c.id}: a TIME BAR with no period is the most dangerous row in a clause graph — it reads as a live obligation and bars nothing`);
    }
    if (c.kind === "timebar" && !c.barsIf) {
      faults.push(`${c.id}: a time bar that does not say what is lost`);
    }
    if (c.period !== null && !PERIOD_BASES.includes(c.basis)) {
      faults.push(`${c.id}: a period of ${c.period} with no basis — days, working days and weeks are three different deadlines`);
    }
  }
  return { ok: faults.length === 0, faults };
}

/** Every deadline running against a project today, soonest first. */
export function deadlines(g, events = [], now = null) {
  const out = [];
  for (const e of events) {
    const r = resolve(g, { ...e, now });
    if (!r.ok) { out.push({ event: e.id || e.trigger, error: r.reason }); continue; }
    for (const c of r.clauses) {
      if (c.deadline === null) continue;
      out.push({
        event: e.id || e.trigger,
        clause: `${c.form} ${c.ref}`,
        name: c.name,
        party: c.party,
        deadline: c.deadline,
        daysRemaining: c.daysRemaining,
        late: c.late,
        barring: c.barring,
        consequence: c.consequence,
      });
    }
  }
  return out.sort((a, b) => String(a.deadline) < String(b.deadline) ? -1 : 1);
}

/** What the L7.1 probe reads. */
export function formIds() { return Object.keys(FORMS); }
