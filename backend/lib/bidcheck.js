/**
 * The submission-completeness check — the one thing that makes a bid safe to
 * submit.
 *
 * THE MIRROR IMAGE OF THE TENDER PACK'S RECONCILIATION. Agent 13 issues a
 * pack to the market and checks that every scope item has a priced line.
 * Agent 2 answers a pack that has arrived, and the same failure runs the
 * other way: the invitation lists what must be returned, and the response
 * either covers every item or it does not. A bid is scored against a
 * checklist somebody else wrote, and the most expensive way to lose is to be
 * disqualified for an omission rather than beaten on merit.
 *
 * Two failures, both silent, both discovered after the deadline:
 *
 *   · A REQUIRED DELIVERABLE WITH NO RESPONSE. The invitation asks for it,
 *     the bid does not contain it. On a public procurement that is frequently
 *     not a lost mark, it is a non-compliant tender — the whole submission
 *     rejected unopened, whatever is in the rest of it.
 *   · A RESPONSE TO SOMETHING NOBODY ASKED FOR. Effort spent on an answer
 *     that scores nothing, usually at the expense of one that does, and often
 *     because a question was misread rather than invented.
 *
 * And one that is worse than either because it looks like diligence:
 *
 *   · A DEADLINE THAT IS NOT A DATE. "TBC", "as stated in the ITT", "week
 *     commencing" — a submission timetable that does not resolve to a day
 *     and a time is a timetable nobody can work backwards from, and the bid
 *     is late for a reason that was written down and never read.
 *
 * Telling the model to be thorough is not a mechanism. THIS is the mechanism:
 * every required deliverable carries a reference, every response section
 * names the reference it answers, and the two sets are compared here, by a
 * function, on every run.
 *
 * The reference form is fixed and the agent is told it verbatim:
 *
 *     SUB-<n>      e.g. SUB-1, SUB-14
 */

/** A submission-deliverable reference wherever it appears. */
const REF = /\bSUB-(\d{1,3})\b/g;

/** The submission checklist's columns, mandated in the brief and checked here. */
export const CHECKLIST_COLUMNS = ["Ref", "Deliverable", "Where required", "Format", "Limit", "Deadline"];

/**
 * What counts as a date in the deadline column.
 *
 * Deliberately generous about FORM and strict about SUBSTANCE: a bid team
 * writes dates a dozen ways and none of them is wrong, but "to be confirmed"
 * is not a date however politely it is phrased.
 */
const DATE_FORMS = [
  /\b\d{4}-\d{2}-\d{2}\b/,                                  // 2026-09-15
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,                          // 15/09/2026
  /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/,                          // 15.09.2026
  /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i, // 15 September 2026
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i, // September 15, 2026
];

/**
 * Cells that are a placeholder and nothing else, matched WHOLE.
 *
 * Whole-cell matching is the point, and it took one test to find out why: the
 * first version looked for these anywhere in the cell, and one of them is a
 * bare hyphen. "2026-09-15" contains two, so the check rejected the single
 * most standard way of writing a date in the world.
 */
const EMPTY_MARKERS = new Set(["", "-", "—", "–", "n/a", "na", "none", "nil", "tbc", "tba", "t.b.c.", "t.b.a.", "?", "…", "..."]);

/**
 * Phrases that mean "we have not found out". Matched anywhere in the cell,
 * because "by 15 September if confirmed" is not a deadline either — but with
 * no bare punctuation in the list, for the reason above.
 */
const NOT_A_DATE = /\b(tbc|tba|to be confirmed|to be advised|to be agreed|to be determined|unknown|not stated|not specified|not given|as stated|as per|as above|see itt|see the itt|see invitation|refer to|awaiting|if confirmed|subject to|approx|approximately|around|circa|week commencing|various|multiple)\b/i;

export function isDate(cell) {
  const s = String(cell || "").replace(/[*_`]/g, "").trim();
  if (EMPTY_MARKERS.has(s.toLowerCase())) return false;
  if (!s) return false;
  if (/\bw\/c\b/i.test(s)) return false;   // "w/c 15 September" is a week, not a day
  if (NOT_A_DATE.test(s)) return false;
  return DATE_FORMS.some((re) => re.test(s));
}

/** Every submission reference in a block of text, in the order it first appears. */
export function refsIn(text) {
  const out = [];
  const seen = new Set();
  const src = String(text || "");
  REF.lastIndex = 0;
  let m;
  while ((m = REF.exec(src))) {
    // Compared as numbers, so SUB-04 and SUB-4 are one reference rather than
    // two — a difference nobody would intend and everybody would type.
    const ref = `SUB-${Number(m[1])}`;
    if (!seen.has(ref)) { seen.add(ref); out.push(ref); }
  }
  return out;
}

const byRef = (a, b) => Number(a.slice(4)) - Number(b.slice(4));

/** The pipe-table rows of a block of text, as arrays of trimmed cells. */
function tableRows(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && l.trim().endsWith("|"))
    .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
    .map((l) => l.trim().slice(1, -1).split("|").map((c) => c.trim()));
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * Checklist rows whose deadline is not a date.
 *
 * The header is found by its columns rather than by its position, because a
 * checklist split across lots or stages has several tables and every one of
 * them has to be checked.
 */
function deadlineFailures(checklistText) {
  const rows = tableRows(checklistText);
  const bad = [];
  let refCol = -1, dueCol = -1, nameCol = -1;
  for (const cells of rows) {
    const header = cells.map(norm);
    const r = header.indexOf("ref");
    const d = header.findIndex((h) => h === "deadline" || h === "due" || h === "duedate" || h === "returnby");
    if (r >= 0 && d >= 0) {
      refCol = r; dueCol = d;
      nameCol = header.findIndex((h) => h === "deliverable" || h === "item" || h === "document");
      continue;
    }
    if (refCol < 0) continue;
    const ref = refsIn(cells[refCol] || "")[0];
    if (!ref) continue;
    if (!isDate(cells[dueCol])) {
      bad.push({ ref, deadline: cells[dueCol] || "(blank)", deliverable: nameCol >= 0 ? cells[nameCol] || "" : "" });
    }
  }
  return bad;
}

/**
 * Reconcile the submission checklist against the drafted response.
 *
 * `ok` is true only when every required deliverable has a response, every
 * response answers something that was actually asked, and every deadline
 * resolves to a day.
 */
export function reconcileChecklistToResponse(checklistText, responseText) {
  const required = refsIn(checklistText);
  const answered = refsIn(responseText);
  const answeredSet = new Set(answered);
  const requiredSet = new Set(required);

  const unanswered = required.filter((r) => !answeredSet.has(r)).sort(byRef);
  const unasked = answered.filter((r) => !requiredSet.has(r)).sort(byRef);
  const undated = deadlineFailures(checklistText);

  return {
    required: required.length,
    responses: answered.length,
    matched: required.filter((r) => answeredSet.has(r)).length,
    unanswered,
    unasked,
    undated,
    // A bid with no references at all has not been written to the convention,
    // which is a failure of its own rather than a clean result.
    referenced: required.length > 0 && answered.length > 0,
    ok:
      required.length > 0 &&
      answered.length > 0 &&
      !unanswered.length &&
      !unasked.length &&
      !undated.length,
  };
}

const list = (refs, cap = 12) =>
  refs.slice(0, cap).join(", ") + (refs.length > cap ? `, and ${refs.length - cap} more` : "");

/**
 * The reconciliation as notes on the run — what the bid owner reads before
 * they approve it.
 *
 * Every note says what is wrong, what it costs if it goes out anyway, and
 * what to do. A warning that only says "incomplete" gets approved.
 *
 * A bid that reconciles produces NO notes: run notes are an exception report,
 * and a line of good news among them reads as one more thing that went wrong.
 */
export function bidNotes(result) {
  const notes = [];
  if (!result.referenced) {
    notes.push(
      "THE SUBMISSION COULD NOT BE CHECKED: the submission checklist or the drafted response carries no SUB-n references, " +
        "so there is no way to establish that everything the invitation requires has been answered. " +
        "Do not submit on this. Re-run it, and if it comes back the same the references have to be added by hand before anything is sent."
    );
    return notes;
  }
  if (result.unanswered.length) {
    notes.push(
      `${result.unanswered.length} required deliverable(s) have NO RESPONSE: ${list(result.unanswered)}. ` +
        "On most public and framework procurements a missing required deliverable is not a lost mark, it is a non-compliant tender — " +
        "the whole submission rejected whatever is in the rest of it. Draft each one, or record in writing why it does not apply, before this goes out."
    );
  }
  if (result.unasked.length) {
    notes.push(
      `${result.unasked.length} response section(s) answer something the checklist DOES NOT ASK FOR: ${list(result.unasked)}. ` +
        "Either a requirement was missed out of the checklist, in which case the checklist is wrong and the compliance matrix is wrong with it, " +
        "or this is effort that scores nothing. Establish which before the deadline, because the two have opposite fixes."
    );
  }
  if (result.undated.length) {
    notes.push(
      `${result.undated.length} deadline(s) in the submission checklist are not dates: ` +
        `${list(result.undated.map((u) => `${u.ref} ("${u.deadline}")`))}. ` +
        "A timetable that does not resolve to a day and a time cannot be worked backwards from, and a bid delivered late is not scored at all. " +
        "Find the date in the invitation, or raise it as a clarification — do not leave it as prose."
    );
  }
  return notes;
}

/**
 * The reconciliation as a table for the submission register — the same result
 * the desk saw, printed in the bid file so it is on the record that the
 * submission was checked before it was sent.
 */
export function bidStatement(result) {
  if (!result.referenced) {
    return "**This submission has not passed the completeness check.** The checklist and the drafted response do not carry matching references, so it cannot be confirmed that everything the invitation requires has been answered. Do not submit on this basis.";
  }
  const rows = [
    "| Check | Result |",
    "|---|---|",
    `| Deliverables the invitation requires | ${result.required} |`,
    `| Deliverables with a drafted response | ${result.matched} of ${result.required} |`,
    `| Response sections answering nothing that was asked | ${result.unasked.length} |`,
    `| Deadlines that are not a date | ${result.undated.length} |`,
  ].join("\n");
  const verdict = result.ok
    ? "\n\n**This submission is complete against the invitation's own checklist.** Every required deliverable has a drafted response, nothing answers a question that was not asked, and every deadline resolves to a day. The check is performed by the system on every run, not by eye. It says nothing about whether the answers are any good — that is the bid owner's judgement and it has not been delegated."
    : "\n\n**This submission is NOT complete and must not be sent as it stands.** The exceptions are listed in the run notes and each one must be closed before the deadline.";
  return rows + verdict;
}
