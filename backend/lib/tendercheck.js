/**
 * The tender uncertainty registers — five record types, and the rule that
 * nothing may vanish between them.
 *
 * A bid carries five kinds of record about the things nobody yet knows:
 *
 *   CL  CLARIFICATION   a question put to the buyer for an authoritative answer
 *   AS  ASSUMPTION      the working basis the estimate or programme was built on
 *   RK  RISK            an uncertain event and what it would do
 *   QU  QUALIFICATION   a limit or departure stated in the offer itself
 *   OP  OPPORTUNITY     an improvement that is achievable if something happens
 *
 * THEY ARE NOT FIVE LISTS. They are one uncertainty at five stages of
 * resolution, and every real failure here is a record that changed stage
 * without arriving anywhere.
 *
 * A clarification is answered and the answer is read by six people and
 * nobody changes the estimate line it was about. A clarification is still
 * open at the cut-off and the bid is submitted having priced a question. An
 * assumption limits what is being offered and is never carried into the
 * qualifications, so the offer departs from the invitation and only the buyer
 * finds out. A risk is given an allowance in a package quote and again in
 * central contingency, and the bid loses by the difference. A risk sits in a
 * register with a severity and a colour and no money, no contractual
 * treatment and nobody's signature, which is a record of a worry rather than
 * a funded response.
 *
 * Each of those is invisible to review, because every individual document is
 * correct. They are only wrong in combination, and a machine comparing the
 * registers to each other is the only reader that sees the combination.
 *
 * WHY THIS IS A CHECK AND NOT AN INSTRUCTION. The bid brief already tells the
 * agent to carry entries across. An instruction is complied with on a good
 * day and skipped on the day of the deadline, which is the only day that
 * matters. This runs after the model has written, on every run, and its
 * findings go into the notes the approver has to read.
 *
 * It reports; it does not block. The issue gate in l7/issue.js is where a bid
 * is refused, and it refuses on the independent challenge. This gives that
 * challenge something specific to be about.
 */

/** The five reference forms, fixed, and given to the agent verbatim. */
export const REF_FORMS = {
  clarification: "CL-<n>",
  assumption: "AS-<n>",
  risk: "RK-<n>",
  qualification: "QU-<n>",
  opportunity: "OP-<n>",
};

const PREFIX = { clarification: "CL", assumption: "AS", risk: "RK", qualification: "QU", opportunity: "OP" };

/** The columns each register is asked for. The check reads by name, not position. */
export const CLARIFICATION_COLUMNS = ["Ref", "Question", "Status", "What changed", "Carried to"];
export const ASSUMPTION_COLUMNS = ["Ref", "Assumption", "Basis", "Limits the offer", "Qualification"];
export const RISK_COLUMNS = ["Ref", "Cause, event, impact", "Allowance sits", "Value", "Treatment", "Accepted by"];

/** A clarification is one of these. Anything else is unreadable, not assumed. */
export const CLARIFICATION_STATUS = ["RAISED", "ANSWERED", "UNANSWERED", "WITHDRAWN"];

/** Where a risk allowance can sit. More than one is the double count. */
export const ALLOWANCE_PLACES = ["PACKAGE QUOTE", "CENTRAL CONTINGENCY", "BASE ESTIMATE", "NONE"];

/** What a site observation is, and the distinction the whole record exists for. */
export const OBSERVATION_KINDS = ["OBSERVED", "STATED", "UNCONFIRMED"];

const EMPTY = new Set(["", "-", "—", "–", "n/a", "na", "tbc", "tba", "none", "nil", "null", "undefined", "?", "to be confirmed"]);

const clean = (cell) => String(cell ?? "").replace(/[*_`]/g, "").trim();
const blank = (cell) => EMPTY.has(clean(cell).toLowerCase());
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

/** Pipe-table rows as arrays of trimmed cells, separator rows dropped. */
export function tableRows(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && l.trim().endsWith("|"))
    .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
    .map((l) => l.trim().slice(1, -1).split("|").map((c) => c.trim()));
}

/**
 * Every reference of one kind in a block of text, first appearance first.
 *
 * Compared as numbers, so RK-04 and RK-4 are one record rather than two — a
 * difference nobody would intend and everybody would type.
 */
export function refsIn(text, kind) {
  const p = PREFIX[kind];
  if (!p) return [];
  const re = new RegExp(`\\b${p}[-‐-― ]?(\\d{1,4})\\b`, "gi");
  const out = [];
  const seen = new Set();
  const src = String(text || "");
  let m;
  while ((m = re.exec(src))) {
    const ref = `${p}-${Number(m[1])}`;
    if (!seen.has(ref)) { seen.add(ref); out.push(ref); }
  }
  return out;
}

const numOf = (ref) => Number(String(ref).split("-")[1]);
const byRef = (a, b) => numOf(a) - numOf(b);

/** Find a header row by the columns it carries, and return the column indices. */
function headerIndex(cells, wanted) {
  const header = cells.map(norm);
  const idx = {};
  for (const [key, names] of Object.entries(wanted)) {
    // A name ending "?" is optional: the register is still readable without
    // it, and a table that splits one idea across two columns — "what
    // changed" and "carried to" — must not be rejected for having both.
    const optional = names[names.length - 1] === "?";
    const look = optional ? names.slice(0, -1) : names;
    const i = header.findIndex((h) => look.some((n) => h === n || h.startsWith(n)));
    if (i < 0) { if (optional) continue; return null; }
    idx[key] = i;
  }
  return idx;
}

/**
 * Walk a register's rows. `wanted` maps our field names to the normalised
 * column names that may carry them, so a table that calls a column "Status"
 * or "State" is read the same way and one missing the column is skipped
 * rather than silently read from the wrong cell.
 */
function rowsOf(text, kind, wanted) {
  const rows = tableRows(text);
  const out = [];
  let idx = null;
  for (const cells of rows) {
    const found = headerIndex(cells, wanted);
    if (found) { idx = found; continue; }
    if (!idx) continue;
    const ref = refsIn(cells[idx.ref] ?? "", kind)[0];
    if (!ref) continue;
    const row = { ref };
    for (const key of Object.keys(idx)) if (key !== "ref") row[key] = clean(cells[idx[key]] ?? "");
    out.push(row);
  }
  return out;
}

const CL_WANTED = {
  ref: ["ref", "no", "number"],
  status: ["status", "state"],
  changed: ["whatchanged", "changed", "effect", "whatitchanged"],
  // Where an open question goes. Optional, because a schedule may put the
  // destination in the "what changed" cell instead; both are read.
  carried: ["carriedto", "carried", "becomes", "?"],
};
const AS_WANTED = {
  ref: ["ref", "no", "number"],
  limits: ["limitstheoffer", "limits", "departure", "affectstheoffer"],
  qualification: ["qualification", "qualificationref", "carriedto", "qu"],
};
const RK_WANTED = {
  ref: ["ref", "no", "number"],
  where: ["allowancesits", "allowance", "wheretheallowancesits", "where"],
  value: ["value", "amount", "cost"],
  treatment: ["treatment", "contractualtreatment", "allocation"],
  accepted: ["acceptedby", "accepted", "authorisedby", "owner"],
};

const isYes = (s) => /^(y|yes|true)\b/i.test(clean(s));
const isNo = (s) => /^(n|no|false)\b/i.test(clean(s));

/** How many distinct places a risk allowance is recorded as sitting in. */
export function allowancePlaces(cell) {
  const s = clean(cell).toUpperCase();
  // NONE is in the shared empty-marker set, and in this one column it is not
  // empty at all: it is somebody saying out loud that the risk carries no
  // allowance. Read it before the blank test, or a decision is filed as a
  // gap.
  if (/\bNONE\b|\bNOT PRICED\b/.test(s)) return ["NONE"];
  if (!s || EMPTY.has(s.toLowerCase())) return [];
  const hit = [];
  if (/PACKAGE/.test(s)) hit.push("PACKAGE QUOTE");
  if (/CONTINGENC/.test(s)) hit.push("CENTRAL CONTINGENCY");
  if (/BASE/.test(s)) hit.push("BASE ESTIMATE");
  return [...new Set(hit)];
}

/**
 * Reconcile the five registers against each other.
 *
 * `ok` is true only when every answered clarification landed somewhere, every
 * unanswered one became something, and every risk is funded exactly once or
 * declared unfunded on purpose.
 */
export function reconcileTenderRegisters({
  clarifications = "",
  assumptions = "",
  risks = "",
  qualifications = "",
  opportunities = "",
} = {}) {
  const cl = rowsOf(clarifications, "clarification", CL_WANTED);
  const as = rowsOf(assumptions, "assumption", AS_WANTED);
  const rk = rowsOf(risks, "risk", RK_WANTED);

  // THE POOL EXCLUDES THE CLARIFICATIONS, AND THAT IS THE WHOLE POINT.
  //
  // A clarification row says where the question went: "carried to RK-99".
  // If the pool were built from every register including this one, the
  // pointer would prove the existence of the thing it points at, and a
  // reference typed into a cell would satisfy the check that the record
  // exists. It must be found where such records live — the assumption,
  // risk, qualification and opportunity registers — or it is a destination
  // nobody built.
  const pool = [assumptions, risks, qualifications, opportunities].join("\n");
  const quRefs = new Set(refsIn(pool, "qualification"));
  const asRefs = new Set(refsIn(pool, "assumption"));
  const rkRefs = new Set(refsIn(pool, "risk"));
  const allText = [clarifications, pool].join("\n");

  const unreadableStatus = [];
  const answeredNotLanded = [];
  const openNotCarried = [];

  for (const row of cl) {
    const status = clean(row.status).toUpperCase().replace(/[^A-Z]/g, "");
    const known = CLARIFICATION_STATUS.find((s) => s.replace(/[^A-Z]/g, "") === status);
    if (!known) { unreadableStatus.push({ ref: row.ref, status: row.status || "(blank)" }); continue; }
    if (known === "WITHDRAWN") continue;

    if (known === "ANSWERED") {
      // The reply must have landed on something, or said in terms that it
      // changed nothing. Blank is neither, and blank is the common case.
      const said = clean(row.changed);
      if (blank(said)) answeredNotLanded.push({ ref: row.ref, why: "no record of what the answer changed" });
      else if (/^no change\b/i.test(said)) continue;
      else if (!/estimate|programme|program|document|schedule|drawing|price|rate|activity|scope|pack/i.test(said)) {
        answeredNotLanded.push({ ref: row.ref, why: `"${said}" does not name an estimate line, a programme activity or a document` });
      }
      continue;
    }

    if (known === "UNANSWERED" || known === "RAISED") {
      // At the cut-off an open question is priced by somebody, one way or
      // another. It must become an assumption, a risk or a qualification —
      // and a bid that submits an open question as an open question has
      // priced it by accident.
      const where = `${row.changed ?? ""} ${row.carried ?? ""}`;
      const carried = [
        ...refsIn(where, "assumption"),
        ...refsIn(where, "risk"),
        ...refsIn(where, "qualification"),
      ];
      const landed = carried.some((r) => asRefs.has(r) || rkRefs.has(r) || quRefs.has(r));
      if (!landed) openNotCarried.push({ ref: row.ref, status: known });
    }
  }

  // An assumption that limits what is being offered is a departure. Unless it
  // reaches the qualifications schedule the buyer never sees it, and the
  // offer is non-compliant in a way only they can discover.
  const limitsWithoutQualification = [];
  for (const row of as) {
    if (!isYes(row.limits)) continue;
    const named = refsIn(row.qualification ?? "", "qualification");
    if (!named.length || !named.some((r) => quRefs.has(r))) {
      limitsWithoutQualification.push({ ref: row.ref, qualification: row.qualification || "(blank)" });
    }
  }

  // A risk is funded once, or declared unfunded on purpose. Two places is the
  // double count, and it is the one that loses a bid by an amount nobody can
  // find afterwards.
  const doubleCounted = [];
  const unfunded = [];
  for (const row of rk) {
    const places = allowancePlaces(row.where);
    const priced = places.filter((p) => p !== "NONE");
    if (priced.length > 1) doubleCounted.push({ ref: row.ref, places: priced });
    const hasValue = !blank(row.value);
    const hasTreatment = !blank(row.treatment);
    const hasAcceptance = !blank(row.accepted);
    if (!hasValue && !hasTreatment && !hasAcceptance) {
      unfunded.push({ ref: row.ref });
    }
  }

  const counts = {
    clarifications: cl.length,
    assumptions: as.length,
    risks: rk.length,
    qualifications: quRefs.size,
    opportunities: refsIn(allText, "opportunity").length,
  };
  const read = cl.length + as.length + rk.length;

  return {
    counts,
    read,
    unreadableStatus,
    answeredNotLanded,
    openNotCarried,
    limitsWithoutQualification,
    doubleCounted,
    unfunded,
    faults:
      unreadableStatus.length + answeredNotLanded.length + openNotCarried.length +
      limitsWithoutQualification.length + doubleCounted.length + unfunded.length,
    ok:
      unreadableStatus.length === 0 && answeredNotLanded.length === 0 && openNotCarried.length === 0 &&
      limitsWithoutQualification.length === 0 && doubleCounted.length === 0 && unfunded.length === 0,
  };
}

/**
 * The site visit, and the three-way distinction the record exists for.
 *
 * A site note that does not separate what was seen from what somebody said
 * from what still needs confirming is a note that will be relied on in a
 * dispute, where the only question is which of the three it was. The
 * procedure is explicit about it and the bid pipeline never asked.
 *
 * NOT VISITING IS A PERMITTED ANSWER. Pricing a site unseen is a normal
 * commercial decision. Pricing one unseen without saying so is not, so a bid
 * with no visit must name what was priced blind.
 */
export function checkSiteVisit({ visited = null, date = "", observations = "", pricedBlind = "" } = {}) {
  const didVisit = isYes(visited) || (visited === true);
  const saidNo = isNo(visited) || visited === false;

  if (!didVisit && !saidNo) {
    return {
      ok: false, visited: null, faults: 1,
      unclassified: [], missing: ["whether a site visit took place"],
      say: "the bid does not record whether the site was visited, which is not the same as recording that it was not",
    };
  }

  if (saidNo) {
    const named = !blank(pricedBlind);
    return {
      ok: named, visited: false, faults: named ? 0 : 1,
      unclassified: [], missing: named ? [] : ["what was priced without seeing it"],
      say: named
        ? "no site visit, and what was priced unseen is named — a stated commercial decision"
        : "no site visit and no record of what was priced unseen; the assumptions are invisible to the person approving",
    };
  }

  // A visit happened. Every observation must say which of the three it is.
  const lines = String(observations || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^[|#>\-*\s]*$/.test(l));
  const unclassified = [];
  for (const line of lines) {
    if (/^\s*\|/.test(line)) continue;              // table rows are read elsewhere
    const up = line.toUpperCase();
    if (!OBSERVATION_KINDS.some((k) => up.includes(k))) unclassified.push(line.slice(0, 90));
  }
  const missing = [];
  if (blank(date)) missing.push("the date of the visit");
  if (!lines.length) missing.push("what was observed");

  const faults = unclassified.length + missing.length;
  return {
    ok: faults === 0,
    visited: true,
    faults,
    unclassified,
    missing,
    say: faults === 0
      ? `site visited and ${lines.length} observation(s) each marked observed, stated or unconfirmed`
      : `${unclassified.length} observation(s) do not say whether they were observed, stated or are unconfirmed`
        + (missing.length ? `; missing ${missing.join(" and ")}` : ""),
  };
}

/** The notes an approver reads. Silence means the registers reconciled. */
export function tenderNotes(result) {
  const out = [];
  if (!result) return out;
  const r = result;

  if (r.unreadableStatus?.length) {
    out.push(`CLARIFICATION STATUS UNREADABLE — ${r.unreadableStatus.map((x) => `${x.ref} (${x.status})`).join(", ")}. `
      + `A status outside ${CLARIFICATION_STATUS.join(", ")} cannot be acted on, so the record is not a record.`);
  }
  if (r.answeredNotLanded?.length) {
    out.push(`ANSWERED AND NOT CARRIED — ${r.answeredNotLanded.map((x) => `${x.ref}: ${x.why}`).join("; ")}. `
      + "A reply is implemented when the estimate line, the programme activity or the document has moved; until then it has been read, not applied.");
  }
  if (r.openNotCarried?.length) {
    out.push(`OPEN AT THE CUT-OFF AND CARRIED NOWHERE — ${r.openNotCarried.map((x) => x.ref).join(", ")}. `
      + "An unanswered question is priced by somebody either way. It must become an assumption, a risk or a qualification before submission.");
  }
  if (r.limitsWithoutQualification?.length) {
    out.push(`A LIMIT THE BUYER CANNOT SEE — ${r.limitsWithoutQualification.map((x) => x.ref).join(", ")} `
      + "limit what is being offered and name no qualification. The offer departs from the invitation and only the evaluator finds out.");
  }
  if (r.doubleCounted?.length) {
    out.push(`RISK COUNTED TWICE — ${r.doubleCounted.map((x) => `${x.ref} (${x.places.join(" and ")})`).join(", ")}. `
      + "The same exposure is funded in two places, so the bid is dearer than it needs to be by an amount nobody can find afterwards.");
  }
  if (r.unfunded?.length) {
    out.push(`RISK WITH NO FUNDED RESPONSE — ${r.unfunded.map((x) => x.ref).join(", ")} carry no value, no contractual treatment and nobody's acceptance. `
      + "That is a record of a worry rather than a decision.");
  }
  return out;
}

/** One sentence for the run log and the approval screen. */
export function tenderStatement(result) {
  if (!result) return "the tender registers were not checked";
  if (!result.read) return "no tender registers were found in the expected form, so nothing could be reconciled";
  if (result.ok) {
    return `${result.read} register entries reconcile: every answer landed, every open question was carried, `
      + "and every risk is funded once or declared unfunded on purpose";
  }
  return `${result.faults} fault(s) across ${result.read} register entries`;
}
