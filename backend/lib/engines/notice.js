/**
 * THE NOTICE AGENT — drafts the communication, and never gives it.
 *
 * The register's line on this one does not move: "It drafts only: a binding
 * contractual communication passes an authorised commercial gate, always."
 * So this module produces text and a record of what the text rests on, and
 * the act of giving a notice is a separate call that requires a named person
 * with authority. There is no path through this file that serves anything.
 *
 * WHY IT IS DETERMINISTIC RATHER THAN A MODEL PASS.
 *
 * A contractual notice is not prose. It is a fixed set of facts — the clause
 * relied on, the event, the date of awareness, the effect, the period, the
 * date the period expires — assembled in a form the recipient cannot
 * misread. A model asked to write one will write a better sentence and will
 * also, eventually, write a date that was not in its inputs. Every figure in
 * the draft below comes from the clause graph and the event record, and the
 * places where a person has to write something are marked as gaps rather
 * than filled in plausibly.
 *
 * WHAT IT REFUSES TO DRAFT:
 *
 *   · A notice with no date of awareness. Every period in the contract runs
 *     from that date. A notice that does not state it invites the reply that
 *     the contractor knew earlier, which is the reply that wins.
 *   · A notice against a clause the project's contract does not contain. A
 *     notice citing a clause that is not in the executed contract is worse
 *     than no notice: it is evidence of not having read it.
 *   · A notice relying on a clause nobody has checked against the executed
 *     contract — this one is drafted, and is headed with the fact, because a
 *     period from a standard-form skeleton may not be this contract's period.
 *
 * AND WHAT IT REFUSES TO HIDE. When the period has already expired the draft
 * is still produced, headed with the expiry. A late notice is sometimes still
 * worth giving and the decision belongs to a person — but it is never given
 * without that person being told what it is.
 */

import { resolve, triggerFor } from "../l7/clauses.js";
import { contractFor, eventsFor } from "../l7/watch.js";
import { instant } from "../l7/evidence.js";
import { recordLedger, collection } from "../store.js";

import { moment, day } from "./moment.js";

/**
 * How the project is named ON THE NOTICE.
 *
 * The first draft printed the internal row id. A contractual notice
 * identifying the project by a hex string is not a notice anybody can act
 * on, and the recipient is not inside this system.
 */
function projectLabel(project) {
  const row = collection("projects").find((p) => p.id === String(project) || p.code === String(project));
  if (!row) return String(project);
  return [row.code, row.name].filter(Boolean).join(" — ") || String(project);
}

/** The notice kinds this engine will assemble. */
export const KINDS = [
  { id: "event", name: "Notification of an event", needs: ["clause", "event", "awareAt", "effect"] },
  { id: "delay", name: "Notice of delay to progress", needs: ["clause", "event", "awareAt", "effect", "cause"] },
  { id: "claim", name: "Notice of a claim for time or money", needs: ["clause", "event", "awareAt", "effect", "relief"] },
  { id: "earlywarning", name: "Early warning of a matter", needs: ["clause", "event", "awareAt", "effect"] },
];
const KIND_BY_ID = new Map(KINDS.map((k) => [k.id, k]));

/**
 * Assemble a draft.
 *
 * Returns { ok, faults, draft, gaps, warnings }. `gaps` are the places a
 * person must write something; they do not stop the draft, they are printed
 * in it as [TO BE COMPLETED: …] so an incomplete notice cannot be mistaken
 * for a finished one.
 */
export function draft({ project, eventId, kind = "event", clauseRef = null, effect = null, cause = null, relief = null, from = null, to = null, now = null } = {}) {
  const faults = [];
  const spec = KIND_BY_ID.get(String(kind));
  if (!spec) faults.push(`"${kind}" is not a notice kind this engine assembles (${[...KIND_BY_ID.keys()].join(", ")})`);

  const held = contractFor(project);
  if (!held) faults.push(`no contract is recorded for ${project}, so there is no clause to rely on`);

  const event = held ? eventsFor(project).find((e) => e.id === String(eventId)) : null;
  if (held && !event) faults.push(`no event ${eventId} is recorded on ${project}. A notice is given about something that happened; the event record is what fixes when it was known.`);

  if (faults.length) return { ok: false, faults, draft: null, gaps: [], warnings: [] };

  const trigger = triggerFor(event.event, held.row.form);
  if (!trigger) {
    return {
      ok: false,
      faults: [`${held.row.form} has no recorded name for "${event.event}", so this engine cannot say which clause the notice is given under. A notice citing a clause the contract does not contain is worse than no notice: it is evidence of not having read it.`],
      draft: null, gaps: [], warnings: [],
    };
  }

  const at = moment(now, Date.now());
  if (at === null) return { ok: false, faults: [`"${now}" is not a date`], draft: null, gaps: [], warnings: [] };

  const r = resolve(held.graph, { trigger, awareAt: new Date(event.awareAt).toISOString(), now: new Date(at).toISOString() });
  if (!r.ok) return { ok: false, faults: [r.reason], draft: null, gaps: [], warnings: [] };

  // The clause relied on: the one the caller named, or the barring clause if
  // there is one, or the first notice obligation. Never a guess across forms.
  const candidates = r.clauses.filter((c) => ["notice", "timebar", "procedure", "obligation"].includes(c.kind));
  const relied = clauseRef
    ? candidates.find((c) => c.ref === String(clauseRef))
    : candidates.find((c) => c.barring) || candidates[0] || null;
  if (!relied) {
    return {
      ok: false,
      faults: [clauseRef
        ? `clause ${clauseRef} is not one this project's contract applies to "${event.event}". A notice citing a clause the contract does not contain is worse than no notice: it is evidence of not having read it.`
        : `this contract has no notice or time-bar clause for "${event.event}". There is nothing to give a notice under, which is itself worth knowing.`],
      draft: null, gaps: [], warnings: [],
    };
  }

  const warnings = [];
  if (!relied.confirmed) {
    warnings.push(`Clause ${relied.ref} has not been checked against the executed contract. Its period is the standard form's, and this contract's may differ — the date below is a starting point, not the contract.`);
  }
  if (relied.late) {
    warnings.push(`THE PERIOD UNDER CLAUSE ${relied.ref} EXPIRED ON ${day(relied.deadline)}. ${relied.barring ? "Under this clause a right is lost by failing to notify in time, so giving this notice now does not restore it." : "The period has passed; the entitlement is not necessarily lost, and the delay will be raised against it."} Whether to give it anyway is a decision for the person with authority, not for this engine.`);
  }

  const gaps = [];
  const need = (label, value) => {
    const v = String(value || "").trim();
    if (v) return v;
    gaps.push(label);
    return `[TO BE COMPLETED: ${label}]`;
  };

  const effectText = need("the effect on the works, in facts rather than adjectives", effect);
  const causeText = spec.needs.includes("cause") ? need("the cause of the delay", cause) : null;
  const reliefText = spec.needs.includes("relief") ? need("the relief sought — time, money or both", relief) : null;
  const fromText = need("the person giving the notice, and their authority to give it", from);
  const toText = need("the recipient named in the contract particulars", to);

  const lines = [
    `NOTICE UNDER CLAUSE ${relied.ref} — ${relied.form}`,
    "",
    `Project: ${projectLabel(project)}`,
    `To: ${toText}`,
    `From: ${fromText}`,
    `Date of this notice: ${day(at)}`,
    "",
    `1. This notice is given under clause ${relied.ref} (${relied.name}).`,
    `2. The event: ${event.name || event.event}${event.detail ? ` — ${event.detail}` : ""}.`,
    `3. Date on which ${relied.party === "contractor" ? "the Contractor" : relied.party === "employer" ? "the Employer" : "the party giving this notice"} became aware of it: ${day(event.awareAt)}.`,
    `4. The effect: ${effectText}.`,
    ...(causeText ? [`5. The cause: ${causeText}.`] : []),
    ...(reliefText ? [`${causeText ? 6 : 5}. The relief sought: ${reliefText}.`] : []),
    "",
    relied.period === null
      ? `No period is stated in clause ${relied.ref} as recorded. The notice is given as soon as practicable after awareness.`
      // THE DEADLINE IS A DAY, NOT A TIMESTAMP. The resolver returns a full
      // ISO instant because it is comparing against a clock; printing that in
      // a notice put a time of day on a contractual date — a precision the
      // contract does not have, arrived at from whenever the calculation
      // happened to run.
      : `Clause ${relied.ref} requires this within ${relied.periodWords || `${relied.period} ${relied.basis}`} of that date, which is ${day(relied.deadline)}.`,
    // And the consequence here is the CLAUSE, not the live status. The
    // resolver's `consequence` is a running commentary — "not yet barred, 36
    // days remain" — which is the right sentence for a dashboard and nonsense
    // in a notice addressed to the other party.
    ...(relied.barring ? [`Clause ${relied.ref} provides that if it is not given in time: ${relied.say}`] : []),
    "",
    `Method of communication: as required by the contract. ${relied.form.startsWith("NEC") ? "Communications are in the form the contract states." : "Written notice to the address in the contract particulars."}`,
    "",
    "DRAFT — NOT GIVEN. A contractual notice is given by a person with authority to give it. This text has been assembled from the project's recorded contract and event; it has not been sent, and no part of this system can send it.",
  ];

  return {
    ok: true,
    faults: [],
    warnings,
    gaps,
    draft: {
      project: String(project),
      event: event.id,
      kind: spec.id,
      clause: `${relied.form} ${relied.ref}`,
      party: relied.party,
      awareAt: day(event.awareAt),
      deadline: relied.deadline === null ? null : day(relied.deadline),
      daysRemaining: relied.daysRemaining,
      late: Boolean(relied.late),
      barring: Boolean(relied.barring),
      confirmed: relied.confirmed === true,
      // Incomplete on purpose when something is missing, so nothing downstream
      // can treat a draft with holes in it as ready.
      complete: gaps.length === 0,
      text: lines.join("\n"),
    },
  };
}

/**
 * RECORD that a notice was given. Not send it — record it.
 *
 * The gate is here rather than in a route, because the same rule has to hold
 * however the call arrives. A notice recorded as given by an agent is a
 * notice nobody gave, and the record would then be the evidence relied on.
 */
export function recordGiven({ project, eventId, clause, by = null, role = null, method = null, at = null, reference = null } = {}) {
  const faults = [];
  const who = String(by || "").trim();
  if (!who) faults.push("nobody is named as giving it. A notice recorded as given by nobody is a notice nobody gave.");
  if (/agent|system|automation|bot/i.test(who)) {
    faults.push(`"${who}" is not a person. Giving a contractual communication is reserved to a person with authority, and recording an agent as the giver would make this record the evidence relied on.`);
  }
  if (!String(role || "").trim()) faults.push("no authority stated. The question asked later is not who sent it but who was entitled to.");
  if (!String(method || "").trim()) faults.push("no method recorded. A notice served by a route the contract does not recognise has not been given.");
  if (!String(reference || "").trim()) faults.push("no reference — a transmission reference, receipt or system id. Without one there is nothing to prove it arrived.");
  const when = moment(at, Date.now());
  if (when === null) faults.push(`"${at}" is not a date`);
  if (faults.length) return { ok: false, faults };

  recordLedger("notice.given", `${project}:${eventId}`, who,
    `${clause} given by ${who} (${role}) via ${method}, ref ${reference}`);
  return { ok: true, faults: [], recorded: { project: String(project), eventId: String(eventId), clause: String(clause), by: who, role: String(role), method: String(method), reference: String(reference), at: when } };
}

export function state() {
  return { kinds: KINDS.length, canSend: false, note: "There is no code path in this engine that transmits anything." };
}
