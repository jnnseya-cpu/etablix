/**
 * THE SAFETY ASSURANCE AGENT — and the sentence it is built around.
 *
 * The register's boundary on this one is longer than its purpose, which is
 * deliberate: "It administers; it never supervises. It must never be sold as
 * replacing a competent safety professional or a person on site."
 *
 * So this engine reads records. It checks whether a risk assessment and
 * method statement exists for the work that is planned, whether the permits
 * are in date, whether the people booked on a task hold the training the task
 * requires, and whether the same observation keeps being raised. Every one of
 * those is administration, and administration is where the gaps are: the
 * accident report that says the RAMS was for a different sequence, or that
 * the permit had expired on Friday, is describing a filing failure.
 *
 * IT MAKES NO SAFETY JUDGEMENT. It never says work is safe, never approves a
 * method, never closes an observation, and never assesses competence — it
 * compares a required ticket against a held ticket, which is a database
 * question, not a competence one. Nothing in it decides whether a person
 * should do a job.
 *
 * WHAT IT REFUSES TO TREAT AS COVER:
 *
 *   · A RAMS THAT DOES NOT COVER THE PLANNED ACTIVITY. A method statement
 *     for a different sequence is not cover; it is a document with the right
 *     project name on it, and it reads as cover on every register.
 *   · AN EXPIRED PERMIT, and a permit expiring during the shift it covers.
 *     The second is the one nobody catches: issued Friday, valid to Friday,
 *     work running to Saturday.
 *   · A TRAINING RECORD WITH NO EXPIRY. Most safety-critical tickets expire.
 *     One recorded without an expiry is recorded as permanent, and it is
 *     usually the record that is wrong rather than the ticket.
 *   · AN OBSERVATION CLOSED WITH NO ACTION. The same failure as a
 *     non-conformance closed by changing a dropdown.
 *   · A RECURRING OBSERVATION. Three of the same thing in three months is
 *     not three observations; it is one uncontrolled condition, and closing
 *     each one individually is how it stays uncontrolled.
 */

import { instant } from "../l7/evidence.js";
import { asAtOr, day } from "./moment.js";

const DAY = 86400000;

/** Three of the same thing is a condition, not three observations. */
export const RECURRENCE_LIMIT = 3;
export const RECURRENCE_WINDOW_DAYS = 90;

/** What a permit covers. Each has a shift-length assumption behind it. */
export const PERMIT_KINDS = ["hot_works", "confined_space", "excavation", "live_electrical", "lifting", "work_at_height", "isolation"];

/**
 * Does the RAMS cover the planned activity?
 *
 * Matching is on the declared activity codes, not on the text. A method
 * statement whose scope is judged by reading it is a method statement judged
 * by whoever is reading, and that is the person this engine must not replace.
 */
export function coverage({ planned = [], rams = [], asAt = null } = {}) {
  const at = asAtOr(asAt);
  const findings = [];
  const covered = [];
  for (const a of planned) {
    const code = String(a.activity || a.id || "").trim();
    const when = a.date ? instant(a.date) : null;
    const match = rams.filter((r) => (Array.isArray(r.covers) ? r.covers.map(String) : []).includes(code));
    if (match.length === 0) {
      findings.push({ activity: code, why: `no risk assessment and method statement covers "${code}". A RAMS for a different sequence is not cover; it is a document with the right project name on it, and it reads as cover on every register.` });
      continue;
    }
    const live = match.filter((r) => {
      const rev = r.reviewedTo ? instant(r.reviewedTo) : null;
      return rev === null || when === null || rev >= when;
    });
    if (live.length === 0) {
      findings.push({ activity: code, why: `the RAMS covering "${code}" is reviewed only to ${match.map((r) => r.reviewedTo).join(", ")}, and the work is planned for ${when === null ? "an unrecorded date" : day(when)}.` });
      continue;
    }
    const unapproved = live.filter((r) => !String(r.approvedBy || "").trim());
    if (unapproved.length === live.length) {
      findings.push({ activity: code, why: `the RAMS covering "${code}" has nobody recorded as approving it` });
      continue;
    }
    covered.push({ activity: code, rams: live.map((r) => String(r.id)) });
  }
  return { ok: findings.length === 0, covered, findings, asAt: day(at) };
}

/** Permits: expired, and expiring inside the work they cover. */
export function permits({ permits: rows = [], asAt = null } = {}) {
  const at = asAtOr(asAt);
  const findings = [];
  for (const p of rows) {
    const id = String(p.id || "(unreferenced permit)");
    const kind = String(p.kind || "").trim();
    if (kind && !PERMIT_KINDS.includes(kind)) findings.push({ id, why: `"${kind}" is not one of ${PERMIT_KINDS.join(", ")}` });
    const from = p.from ? instant(p.from) : null;
    const to = p.to ? instant(p.to) : null;
    if (!p.to || to === null) { findings.push({ id, why: `no expiry, or an expiry that is not a date ("${p.to}"). A permit with no end is not a permit.` }); continue; }
    if (to < at) { findings.push({ id, why: `expired ${day(to)} and is still open on the register` }); continue; }
    // The one nobody catches.
    const workTo = p.workTo ? instant(p.workTo) : null;
    if (workTo !== null && workTo > to) {
      findings.push({ id, why: `valid to ${day(to)} and covering work planned to ${day(workTo)}. Issued Friday, valid to Friday, work running to Saturday is the shape of this one.` });
    }
    if (from !== null && from > at && p.open === true) {
      findings.push({ id, why: `open on the register and not valid until ${day(from)}` });
    }
    if (!String(p.issuedBy || "").trim()) findings.push({ id, why: "nobody recorded as issuing it" });
  }
  return { ok: findings.length === 0, findings, asAt: day(at) };
}

/**
 * Training: required against held.
 *
 * A DATABASE COMPARISON, NOT A COMPETENCE ASSESSMENT. It answers "does the
 * record show this ticket, in date". Whether somebody is competent to do the
 * work is a judgement by a person who has met them.
 */
export function training({ assignments = [], held = [], asAt = null } = {}) {
  const at = asAtOr(asAt);
  const byPerson = new Map();
  for (const h of held) {
    const p = String(h.person || "").trim();
    if (!byPerson.has(p)) byPerson.set(p, []);
    byPerson.get(p).push(h);
  }
  const findings = [];
  const undated = [];
  for (const [person, tickets] of byPerson) {
    for (const t of tickets) {
      if (t.expires === undefined || t.expires === null || String(t.expires).trim() === "") {
        undated.push({ person, ticket: String(t.ticket), why: "recorded with no expiry, so it is recorded as permanent. Most safety-critical tickets expire, and it is usually the record that is wrong rather than the ticket." });
      } else if (instant(t.expires) === null) {
        undated.push({ person, ticket: String(t.ticket), why: `an expiry of "${t.expires}", which is not a date` });
      }
    }
  }
  for (const a of assignments) {
    const person = String(a.person || "").trim();
    const when = a.date ? instant(a.date) : at;
    const need = Array.isArray(a.requires) ? a.requires.map(String) : [];
    const mine = byPerson.get(person) || [];
    for (const ticket of need) {
      const t = mine.find((x) => String(x.ticket) === ticket);
      if (!t) {
        findings.push({ person, ticket, activity: a.activity || null, why: `no record of ${ticket}` });
        continue;
      }
      const exp = t.expires ? instant(t.expires) : null;
      if (exp !== null && when !== null && exp < when) {
        findings.push({ person, ticket, activity: a.activity || null, why: `${ticket} expired ${day(exp)}, before the work on ${day(when)}` });
      }
    }
  }
  return { ok: findings.length === 0 && undated.length === 0, findings, undated, asAt: day(at) };
}

/** Observations: closed with nothing, and the same thing over and over. */
export function observations({ observations: rows = [], asAt = null, window = RECURRENCE_WINDOW_DAYS, limit = RECURRENCE_LIMIT } = {}) {
  const at = asAtOr(asAt);
  const closedEmpty = [];
  const byKind = new Map();
  for (const o of rows) {
    const id = String(o.id || "(unreferenced)");
    const raised = o.raisedAt ? instant(o.raisedAt) : null;
    if (String(o.status || "") === "closed" && !String(o.action || "").trim()) {
      closedEmpty.push({ id, why: "closed with no action recorded. The same failure as a non-conformance closed by changing a dropdown." });
    }
    const kind = String(o.kind || "").trim().toLowerCase();
    const where = String(o.location || "").trim().toLowerCase();
    if (!kind) continue;
    const key = `${kind}${where ? ` @ ${where}` : ""}`;
    if (raised !== null && at !== null && at - raised > window * DAY) continue;
    if (!byKind.has(key)) byKind.set(key, []);
    byKind.get(key).push(id);
  }
  const recurring = [...byKind.entries()]
    .filter(([, ids]) => ids.length >= limit)
    .map(([key, ids]) => ({ condition: key, count: ids.length, observations: ids,
      why: `${ids.length} of the same thing in ${window} days is not ${ids.length} observations; it is one uncontrolled condition, and closing each one individually is how it stays uncontrolled.` }));

  return { ok: closedEmpty.length === 0 && recurring.length === 0, closedEmpty, recurring, asAt: day(at) };
}

/** Everything, in one answer. */
export function assure(input = {}) {
  const c = coverage(input);
  const p = permits(input);
  const t = training(input);
  const o = observations(input);
  const counts = {
    ramsGaps: c.findings.length,
    permitFaults: p.findings.length,
    trainingGaps: t.findings.length,
    undatedTickets: t.undated.length,
    closedEmpty: o.closedEmpty.length,
    recurring: o.recurring.length,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    ok: total === 0,
    coverage: c, permits: p, training: t, observations: o, counts,
    // Never "the site is safe". This engine is not entitled to that sentence
    // and no version of it should ever print one.
    say: total === 0
      ? "Every administrative check passes: the planned work is covered by an approved and in-date RAMS, the permits are in date, the tickets required are recorded and in date, and nothing is recurring. That is an administrative state, not a statement about whether the site is safe — which is a judgement by a competent person who has been there."
      : `${total} administrative gap(s): ${Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ")}. Each one is a filing failure, and a filing failure is what the accident report describes afterwards.`,
  };
}

export function state() {
  return { checks: 4, permitKinds: PERMIT_KINDS.length, recurrenceLimit: RECURRENCE_LIMIT, supervises: false, assessesCompetence: false };
}
