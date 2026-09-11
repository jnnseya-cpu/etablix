/**
 * The challenge check — Agent 14's issue gate, and the fifth reconciliation.
 *
 * WHY A RED TEAM NEEDS A GATE OF ITS OWN. An adversarial review has one
 * failure mode and it is not missing things. It is producing a review that
 * looks thorough and is not: nine headings, forty paragraphs of considered
 * prose, and no finding anybody can act on. A reviewer who writes "the
 * programme assumptions could be more clearly evidenced" has said nothing,
 * cost a run, and produced a document that will be filed as assurance.
 *
 * Worse, the absence of findings under a lens is indistinguishable from the
 * lens never having been applied. "Nothing found under Contract" and "Contract
 * was not looked at" produce the same page, and only one of them is a review.
 *
 * So four things are checked by machine before a challenge report may be
 * issued, and each of them refuses rather than warns:
 *
 *   · EVERY ONE OF THE NINE LENSES HAS A SECTION. A missing lens is an unrun
 *     lens, and an unrun lens is not a clean one. The report cannot be issued
 *     naming eight.
 *
 *   · EVERY FINDING CARRIES A LENS, A SEVERITY, A LOCATION AND A REMEDY.
 *     A finding without a location is an opinion; a finding without a remedy
 *     is a complaint. Both are refused. The severity must be one of the four,
 *     because "significant" and "worth noting" are not severities and cannot
 *     be gated on.
 *
 *   · A CRITICAL FINDING CANNOT BE DISPOSED OF. Critical means likely
 *     disqualification, unlawful content, an unapproved price or material
 *     binding exposure. It is a hard block by definition, and a report that
 *     records one as accepted has quietly downgraded it. The gate refuses.
 *
 *   · A LENS THAT FOUND NOTHING MUST SAY WHAT IT LOOKED AT. One line naming
 *     what was examined turns "no findings" from an absence into a statement
 *     somebody can disagree with. This is the check that stops a challenge
 *     report being written in ten minutes.
 *
 * The reference form is fixed and the agent is told it verbatim:
 *
 *     CH-<n>      e.g. CH-1, CH-14
 */

import { LENSES, SEVERITIES } from "./l7/assurance.js";
import { isDate } from "./bidcheck.js";

/** A challenge-finding reference wherever it appears. */
const REF = /\bCH-0*(\d{1,3})\b/gi;

/** The columns the findings table must carry, in this order. */
export const FINDING_COLUMNS = ["Ref", "Lens", "Severity", "Where", "The finding", "What must happen", "Disposition"];

/** The nine lens ids, from the one place they are defined. */
export const LENS_IDS = LENSES.map((l) => l.id);

/** The four severities, from the one place they are defined. */
export const SEVERITY_IDS = SEVERITIES.map((s) => s.id);

const SEV_BY_ID = new Map(SEVERITIES.map((s) => [s.id, s]));

/** Cells that carry no information, whatever they look like. */
const EMPTY = new Set(["", "-", "—", "–", "n/a", "na", "tbc", "tbd", "none", "nil", "…", "..."]);

function cell(value) {
  return String(value == null ? "" : value).replace(/[*_`]/g, "").trim();
}

function isEmpty(value) {
  return EMPTY.has(cell(value).toLowerCase());
}

/** Every challenge reference in a block of text, in first-appearance order. */
export function refsIn(text) {
  const out = [];
  const seen = new Set();
  const src = String(text || "");
  REF.lastIndex = 0;
  let m;
  while ((m = REF.exec(src))) {
    const ref = `CH-${Number(m[1])}`;
    if (!seen.has(ref)) { seen.add(ref); out.push(ref); }
  }
  return out;
}

/** The lens named in a cell, or null. Matched on the id or the display name. */
export function lensOf(value) {
  const s = cell(value).toLowerCase();
  if (!s) return null;
  for (const l of LENSES) {
    if (s === l.id || s === l.name.toLowerCase()) return l.id;
  }
  // A cell that merely CONTAINS a lens name is not a lens: "compliance and
  // commercial" names two, and a finding under two lenses is two findings.
  const contained = LENSES.filter((l) => new RegExp(`\\b${l.id}\\b`, "i").test(s));
  return contained.length === 1 ? contained[0].id : null;
}

/** The severity named in a cell, or null. */
export function severityOf(value) {
  const s = cell(value).toUpperCase();
  return SEVERITY_IDS.includes(s) ? s : null;
}

/**
 * The findings register section on its own.
 *
 * THE FINDINGS TABLE IS PARSED FROM HERE AND NOWHERE ELSE. The first version
 * scanned every table in the report, so the working paper's commitment table
 * and each lens's own tables were read as malformed findings — eleven perfectly
 * good findings and thirty rows of "no CH- reference in the first column".
 * A check that fires on correct work is worse than no check: it is switched
 * off within a week.
 */
export function registerBlock(text) {
  const src = String(text || "");
  const lines = src.split(/\r?\n/);
  const HEADING = /^\s*(?:#{1,4}\s*)?(?:\*\*|__)?\s*(\d{1,2})\s*[.)·:—-]\s*([^\n]*?)\s*(?:\*\*|__)?\s*$/;
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i += 1) {
    const m = HEADING.exec(lines[i]);
    if (!m) continue;
    const title = m[2].trim().toLowerCase();
    if (start === -1 && /findings register/.test(title)) { start = i + 1; continue; }
    if (start !== -1) { end = i; break; }
  }
  if (start === -1) return { found: false, text: "" };
  return { found: true, text: lines.slice(start, end).join("\n").trim() };
}

/**
 * Parse the findings table out of a markdown block. Rows that are not rows
 * are reported rather than skipped: a malformed row is a finding nobody will
 * ever action, and silently dropping it is how a red team loses its own work.
 */
export function findingsIn(text) {
  const rows = [];
  const malformed = [];
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    if (/^-{2,}|^:?-+:?$/.test(cells[0])) continue;        // separator row
    if (/^ref$/i.test(cells[0].replace(/[*_`]/g, ""))) continue; // header row
    const ref = refsIn(cells[0])[0] || null;
    if (!ref) {
      if (cells.some((c) => !isEmpty(c))) malformed.push({ line: line.trim().slice(0, 160), why: "no CH- reference in the first column" });
      continue;
    }
    if (cells.length < FINDING_COLUMNS.length) {
      malformed.push({ ref, line: line.trim().slice(0, 160), why: `${cells.length} columns against the ${FINDING_COLUMNS.length} required` });
      continue;
    }
    rows.push({
      ref,
      lens: cells[1],
      severity: cells[2],
      where: cells[3],
      finding: cells[4],
      remedy: cells[5],
      disposition: cells[6],
    });
  }
  return { rows, malformed };
}

/**
 * Which lenses were actually applied, taken from the section headings rather
 * than from a claim. A lens is applied when its own heading exists AND that
 * heading is followed by something.
 */
export function lensesApplied(text) {
  const src = String(text || "");
  const applied = [];
  const empty = [];
  for (const l of LENSES) {
    // The heading form the agent is told to write is "## 6 · Contract lens",
    // so the number and its separator are part of the line. The first version
    // of this matched "^#{2,4}\\s*<name>\\s+lens" and found NOTHING on a
    // correctly written report — every lens read as missing, and the gate
    // refused a report that was right. An optional numbered prefix fixes it.
    const re = new RegExp(`^#{2,4}\\s*(?:\\d{1,2}\\s*[.)·:—-]\\s*)?${l.name}\\s+lens\\b(.*)$`, "im");
    const m = re.exec(src);
    if (!m) continue;
    const after = src.slice(m.index + m[0].length);
    const next = after.search(/^#{2,4}\s/m);
    const body = (next === -1 ? after : after.slice(0, next)).trim();
    if (body.length < 40) { empty.push(l.id); continue; }
    applied.push({ id: l.id, name: l.name, body });
  }
  return { applied, empty, missing: LENSES.filter((l) => !applied.some((a) => a.id === l.id) && !empty.includes(l.id)).map((l) => l.id) };
}

/**
 * The gate. Returns every way the report fails to be an assurance result, and
 * refuses issue if there is one.
 */
export function reconcileChallenge(reportText, { author = null, review = null } = {}) {
  const block = registerBlock(reportText);
  const { rows, malformed } = findingsIn(block.text);
  const { applied, empty, missing } = lensesApplied(reportText);

  const unlensed = [];       // a finding whose lens is not one of the nine
  const unrated = [];        // a finding whose severity is not one of the four
  const unlocated = [];      // a finding with no location
  const unremedied = [];     // a finding with no remedy
  const criticalDisposed = []; // a critical finding recorded as accepted
  const undatedDisposition = []; // a disposition with no date
  const duplicates = [];
  const seen = new Set();

  for (const row of rows) {
    if (seen.has(row.ref)) duplicates.push(row.ref);
    seen.add(row.ref);

    const lens = lensOf(row.lens);
    if (!lens) unlensed.push({ ref: row.ref, given: cell(row.lens) });

    const severity = severityOf(row.severity);
    if (!severity) unrated.push({ ref: row.ref, given: cell(row.severity) });

    if (isEmpty(row.where)) unlocated.push({ ref: row.ref });
    if (isEmpty(row.remedy)) unremedied.push({ ref: row.ref });

    const disposed = !isEmpty(row.disposition);
    if (severity === "CRITICAL" && disposed) {
      criticalDisposed.push({ ref: row.ref, disposition: cell(row.disposition) });
    }
    if (disposed && severity && SEV_BY_ID.get(severity) && SEV_BY_ID.get(severity).dispositionAllowed) {
      // A disposition is a decision, and a decision with no date is not one.
      const hasDate = String(row.disposition).split(/[,;]/).some((part) => isDate(part));
      if (!hasDate) undatedDisposition.push({ ref: row.ref, disposition: cell(row.disposition) });
    }
  }

  // Independence, where the run identities were supplied.
  let independence = null;
  if (author || review) {
    const faults = [];
    if (!review || !review.runId) faults.push("the review names no run");
    if (!author || !author.runId) faults.push("the authoring run is not identified");
    if (author && review && author.runId && author.runId === review.runId) faults.push("the challenge ran inside the run it is challenging");
    if (author && review && author.promptLineage && author.promptLineage === review.promptLineage) faults.push("the challenge shares the author's prompt lineage");
    if (review && !review.promptLineage) faults.push("the challenge does not state its prompt lineage");
    independence = { ok: faults.length === 0, faults };
  }

  const ok =
    block.found &&
    rows.length > 0 &&
    malformed.length === 0 &&
    missing.length === 0 &&
    empty.length === 0 &&
    unlensed.length === 0 &&
    unrated.length === 0 &&
    unlocated.length === 0 &&
    unremedied.length === 0 &&
    criticalDisposed.length === 0 &&
    undatedDisposition.length === 0 &&
    duplicates.length === 0 &&
    (independence === null || independence.ok);

  const bySeverity = {};
  for (const s of SEVERITIES) bySeverity[s.id] = rows.filter((r) => severityOf(r.severity) === s.id).length;

  return {
    ok,
    registerFound: block.found,
    findings: rows.length,
    bySeverity,
    lensesApplied: applied.map((a) => a.id),
    lensesMissing: missing,
    lensesEmpty: empty,
    malformed,
    unlensed,
    unrated,
    unlocated,
    unremedied,
    criticalDisposed,
    undatedDisposition,
    duplicates,
    independence,
    // The one that decides whether this is assurance at all.
    critical: rows.filter((r) => severityOf(r.severity) === "CRITICAL").map((r) => r.ref),
    high: rows.filter((r) => severityOf(r.severity) === "HIGH").map((r) => r.ref),
  };
}

/** The notes shown on the run, in the order somebody should act on them. */
export function challengeNotes(r) {
  const notes = [];
  const cannot = "Do not issue this challenge report:";

  if (r.independence && !r.independence.ok) {
    notes.push(`${cannot} THIS IS NOT AN INDEPENDENT REVIEW — ${r.independence.faults.join("; ")}. A review by the run that wrote the work agrees with itself, and filing it as assurance is worse than not reviewing at all.`);
  }
  if (!r.registerFound) {
    notes.push(`${cannot} there is no findings register in it. Nine lenses of prose with no table is a review nobody can sort, filter, assign or close.`);
  }
  if (r.registerFound && r.findings === 0 && r.lensesMissing.length === 0) {
    notes.push(`${cannot} nine lenses were applied and NOT ONE FINDING was recorded. A submission with nothing wrong with it has not been challenged, it has been read.`);
  }
  if (r.lensesMissing.length) {
    notes.push(`${cannot} ${r.lensesMissing.length} lens(es) were never applied — ${r.lensesMissing.join(", ")}. A LENS NOBODY RAN IS NOT A LENS THAT PASSED, and a report naming eight of nine reads as a clean review of all nine.`);
  }
  if (r.lensesEmpty.length) {
    notes.push(`${cannot} ${r.lensesEmpty.join(", ")} carry a heading and nothing under it. An empty lens is an unrun lens wearing a title.`);
  }
  if (r.malformed.length) {
    notes.push(`${cannot} ${r.malformed.length} row(s) are not findings — ${r.malformed.slice(0, 3).map((m) => m.why).join("; ")}. A malformed row is a finding nobody will ever action.`);
  }
  if (r.unlensed.length) {
    notes.push(`${cannot} ${r.unlensed.map((u) => u.ref).join(", ")} name a lens that is not one of the nine (${r.unlensed.slice(0, 3).map((u) => `"${u.given}"`).join(", ")}). A finding under two lenses is two findings.`);
  }
  if (r.unrated.length) {
    notes.push(`${cannot} ${r.unrated.map((u) => u.ref).join(", ")} carry no severity from the four (${r.unrated.slice(0, 3).map((u) => `"${u.given}"`).join(", ")}). "Significant" is not a severity and nothing can be gated on it.`);
  }
  if (r.unlocated.length) {
    notes.push(`${cannot} ${r.unlocated.map((u) => u.ref).join(", ")} say where nothing. A FINDING WITHOUT A LOCATION IS AN OPINION.`);
  }
  if (r.unremedied.length) {
    notes.push(`${cannot} ${r.unremedied.map((u) => u.ref).join(", ")} say what must happen nowhere. A FINDING WITHOUT A REMEDY IS A COMPLAINT.`);
  }
  if (r.criticalDisposed.length) {
    notes.push(`${cannot} ${r.criticalDisposed.map((u) => u.ref).join(", ")} are CRITICAL and carry a disposition. Critical means likely disqualification, unlawful content, an unapproved price or material binding exposure — it is a hard block by definition, and recording one as accepted has quietly downgraded it.`);
  }
  if (r.undatedDisposition.length) {
    notes.push(`${cannot} ${r.undatedDisposition.map((u) => u.ref).join(", ")} are disposed of with no date. A decision with no date is not a decision.`);
  }
  if (r.duplicates.length) {
    notes.push(`${cannot} ${[...new Set(r.duplicates)].join(", ")} appear twice. Two different findings sharing a reference become one the moment anybody sorts the table.`);
  }
  return notes;
}

/** The line printed on the report itself. */
export function challengeStatement(r) {
  if (!r.ok) {
    return `THIS REPORT HAS NOT PASSED THE CHALLENGE CHECK and must not be issued as assurance. ${challengeNotes(r)[0] || ""}`;
  }
  const parts = [`${r.findings} finding(s) across all nine lenses`];
  if (r.critical.length) parts.push(`${r.critical.length} CRITICAL — the submission is hard-blocked`);
  if (r.high.length) parts.push(`${r.high.length} high, each blocking unless an authorised disposition is recorded`);
  return `Challenge check passed: ${parts.join("; ")}. Every finding names a lens, a severity, a location and what must happen.`;
}
