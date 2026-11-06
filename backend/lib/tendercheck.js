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

import { money } from "./controlcheck.js";

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

/* ===================================================================
 * THE CROSS-CHECK: THE REGISTERS AGAINST THE PRICE
 *
 * Everything above compares the registers to each other. That catches a
 * record that changed stage without arriving anywhere, and it is worth
 * having, but it has one weakness and the weakness is the important one:
 * every fact it reads was typed by the same person into the same document.
 *
 * A risk register that says "allowance sits: central contingency, £18,000"
 * reconciles perfectly against itself. It reconciles whether or not the
 * contingency line in the estimate carries eighteen thousand pounds, whether
 * or not it carries anything, and whether or not there is a contingency line
 * at all. The register is a claim about the price. Until something reads the
 * price, it is an unexamined claim, and the honest ones and the hopeful ones
 * look exactly alike.
 *
 * SO THIS READS THE PRICE. Six comparisons, and each is a defect somebody
 * has shipped:
 *
 *   1 · THE ALLOWANCE THAT IS CLAIMED AND IS NOT THERE. The register says the
 *       money sits in a package quote or the base estimate. No priced line
 *       references the risk. Somebody decided where the money would go and
 *       the decision never reached the estimator — the commonest version of
 *       this failure, because the register is written by the person running
 *       the bid and the estimate by somebody else.
 *
 *   2 · THE ALLOWANCE THAT IS THERE AND IS NOT REGISTERED. A priced line
 *       carries money against RK-7 and there is no RK-7. Either the register
 *       was pruned after the estimate was built, or the reference is a typo,
 *       and a typo here means the risk the money was for is not the risk the
 *       bid thinks it has covered.
 *
 *   3 · THE DOUBLE COUNT, PROVED RATHER THAN ASSERTED. Two words in a cell
 *       are a reading of a sentence. The same reference on a priced package
 *       line AND on the contingency is the money, twice, in the file that
 *       gets added up. This is the one that loses a bid by an amount nobody
 *       can find afterwards, and it is the one worth being certain about.
 *
 *   4 · THE REGISTER AND THE ESTIMATE DISAGREEING ABOUT A FIGURE. RK-3 is
 *       £12,000 in the register and £4,000 in the line that carries it. One
 *       of them is wrong and no reader can tell which, because both documents
 *       are internally consistent. Settlement is then held on two numbers.
 *
 *   5 · THE CONTINGENCY THAT IS SPENT BEFORE THE BID IS SUBMITTED. The risks
 *       pointing at central contingency come to more than the contingency.
 *       Every row is defensible and the total is not funded. This is
 *       arithmetic, which is why it belongs to a machine and not to a review
 *       meeting.
 *
 *   6 · THE ANSWER THAT SAYS IT CHANGED THE ESTIMATE, WHERE THE ESTIMATE DOES
 *       NOT SAY SO. "CL-4: priced in, estimate updated" is the sentence the
 *       rule above accepts, because the rule above can only read sentences.
 *       Here it is accepted only if a priced line carries CL-4.
 *
 * WHAT IT WILL NOT DO. It will not guess that an unreferenced line is the
 * allowance for an unmatched risk because the figures happen to agree. That
 * inference is attractive and it is how two unrelated numbers become a
 * reconciliation; the whole value of this module is that a link exists
 * because somebody wrote it down, not because a machine found a coincidence.
 *
 * AND IT STILL REPORTS. The issue gate is where a bid stops.
 * =================================================================== */


/**
 * The fields on a priced line that may carry a register reference. An
 * estimate is somebody's spreadsheet and the reference lands wherever there
 * was a column for it, so all of them are read and none is required.
 *
 * `id` is included deliberately: a line keyed RK-7-allowance is how a great
 * many estimators record this, and refusing to read it would mean refusing
 * the commonest honest case.
 */
const ITEM_REF_FIELDS = [
  "id", "ref", "refs", "against", "description", "desc", "item", "name",
  "note", "notes", "narrative", "basis", "reason", "scopeItemId", "tags",
  // The estimating engine's own row names, so a schedule read from an
  // estimating run is read as readily as a table somebody typed. `what` is
  // that engine's description field and `quantityBasis` is where a basis
  // reference sits; omitting either would mean the estimate of record read
  // as an estimate carrying no references at all, which is the one failure
  // mode worse than not reading it — every claimed allowance would be
  // reported absent, on a schedule that carries all of them.
  "what", "quantityBasis",
];

/** Everything on a line that could be text, joined, for reference scanning. */
function itemText(item) {
  const it = item || {};
  const parts = [];
  for (const f of ITEM_REF_FIELDS) {
    const v = it[f];
    if (v === undefined || v === null) continue;
    parts.push(Array.isArray(v) ? v.join(" ") : String(v));
  }
  return parts.join(" \n ");
}

/** The value of a priced line, from whichever of the usual fields carries it. */
function itemValue(item) {
  const it = item || {};
  for (const f of ["total", "value", "amount", "allowance", "sum", "price"]) {
    if (it[f] === undefined || it[f] === null || it[f] === "") continue;
    const v = money(it[f]);
    if (v !== null) return v;
  }
  // A quantity and a rate are a total nobody wrote down. The arithmetic is
  // the estimating engine's; here it is only read, never corrected.
  const q = money(it.quantity);
  const r = money(it.rate);
  if (q !== null && r !== null) return Math.round(q * r * 100) / 100;
  return null;
}

/** Is this line the central contingency rather than a priced package line? */
function isContingencyLine(item) {
  const it = item || {};
  if (it.contingency === true) return true;
  const kind = String(it.kind ?? it.type ?? it.category ?? "").toLowerCase();
  if (/contingenc/.test(kind)) return true;
  // A line called "Central contingency" with no kind field is the same thing,
  // and is how it appears in most estimates. `what` is the estimating
  // engine's description field and is read here for the same reason.
  return /\bcontingenc/i.test(String(it.description ?? it.what ?? it.name ?? it.item ?? it.id ?? ""));
}

const round2 = (n) => Math.round(n * 100) / 100;

const ESTIMATE_WANTED = {
  id: ["ref", "line", "item", "code", "no", "number"],
  description: ["description", "desc", "item", "narrative", "what", "scope"],
  value: ["value", "total", "amount", "cost", "price", "sum"],
  // Optional, because most estimates carry the reference in the description
  // and some carry it in a column of its own. Both are read.
  against: ["covers", "against", "risk", "registerref", "refs", "?"],
};

/**
 * Priced estimate lines out of a markdown table, so the cross-check can be
 * fed from the same place as everything else here.
 *
 * It is deliberately not an estimate parser. It reads a reference, some text
 * and a figure; the arithmetic, the units and the mark-ups belong to
 * `l7/estimating.js` and are not second-guessed from a table.
 *
 * A row whose figure will not parse is kept, with a null value, rather than
 * dropped. A dropped line is a line the cross-check believes does not exist,
 * which turns an unreadable number into a missing allowance — a different and
 * more alarming finding than the true one.
 */
export function estimateLines(text) {
  const rows = tableRows(text);
  const out = [];
  let idx = null;
  for (const cells of rows) {
    const found = headerIndex(cells, ESTIMATE_WANTED);
    if (found) { idx = found; continue; }
    if (!idx) continue;
    const id = clean(cells[idx.id] ?? "");
    const description = clean(cells[idx.description] ?? "");
    const value = clean(cells[idx.value] ?? "");
    if (!id && !description) continue;
    const against = idx.against === undefined ? "" : clean(cells[idx.against] ?? "");
    out.push({ id: id || description.slice(0, 40), description, value, against });
  }
  return out;
}

/**
 * Reconcile the registers against the priced estimate.
 *
 * `estimateItems` is the priced lines, in whatever shape the estimate keeps
 * them; contingency lines may be marked on the items themselves or passed
 * separately as `contingency` — a number, or an object carrying a value and
 * the references it covers.
 */
export function reconcileRegistersToEstimate({
  risks = "",
  assumptions = "",
  clarifications = "",
  estimateItems = [],
  refusedLines = [],
  contingency = null,
  source = null,
  tolerance = 0.01,
} = {}) {
  const rk = rowsOf(risks, "risk", RK_WANTED);
  const as = rowsOf(assumptions, "assumption", AS_WANTED);
  const cl = rowsOf(clarifications, "clarification", CL_WANTED);

  const items = Array.isArray(estimateItems) ? estimateItems.filter(Boolean) : [];
  const priced = items.filter((it) => !isContingencyLine(it));
  const contingencyLines = items.filter(isContingencyLine);

  // The contingency, from wherever it was given. A bare number is a value
  // with no references, which is the usual case and is not a fault by itself.
  let contingencyValue = null;
  let contingencyText = contingencyLines.map(itemText).join(" \n ");
  if (contingency !== null && contingency !== undefined) {
    if (typeof contingency === "object") {
      contingencyValue = itemValue(contingency);
      contingencyText += ` \n ${itemText(contingency)}`;
    } else {
      contingencyValue = money(contingency);
    }
  }
  if (contingencyValue === null && contingencyLines.length) {
    const vals = contingencyLines.map(itemValue).filter((v) => v !== null);
    if (vals.length) contingencyValue = round2(vals.reduce((a, b) => a + b, 0));
  }

  // Which references each side of the estimate carries, and what against each.
  const pricedRefs = new Map();           // "RK-3" -> [ { id, value } ]
  for (const it of priced) {
    const text = itemText(it);
    for (const kind of ["risk", "assumption", "clarification"]) {
      for (const ref of refsIn(text, kind)) {
        if (!pricedRefs.has(ref)) pricedRefs.set(ref, []);
        pricedRefs.get(ref).push({ id: String(it.id ?? it.ref ?? "(unidentified line)"), value: itemValue(it) });
      }
    }
  }
  const contingencyRefs = new Set([
    ...refsIn(contingencyText, "risk"),
    ...refsIn(contingencyText, "assumption"),
  ]);

  const registeredRisks = new Set(rk.map((r) => r.ref));
  const registeredAssumptions = new Set(as.map((r) => r.ref));

  // THE REFUSED LINES, SCANNED FIRST, SO THEY CAN SUPPRESS A WORSE FINDING.
  //
  // The estimating engine does not drop an inadmissible line silently: it
  // refuses it, keeps it, and says its own total is understated by however
  // much the line was worth. A risk allowance sitting on such a line is in
  // the schedule and is not in the price, and it is a different finding from
  // an allowance that was never written down — the money was identified, the
  // line exists, and one lineage field is missing. The fix is different too:
  // fix the line, do not price the risk again.
  //
  // It is computed before the risk loop because it must REPLACE the
  // claimed-and-not-priced finding for the same reference rather than sit
  // beside it. Reporting both would say the decision about where the money
  // would sit "was made and never arrived", which is untrue and points at
  // the wrong remedy: it arrived, on a line the engine would not admit.
  const allowanceOnRefusedLine = [];
  const refused = Array.isArray(refusedLines) ? refusedLines.filter(Boolean) : [];
  for (const row of refused) {
    const text = itemText(row);
    for (const kind of ["risk", "assumption", "clarification"]) {
      for (const ref of refsIn(text, kind)) {
        allowanceOnRefusedLine.push({
          ref,
          line: String(row.id ?? "(unidentified line)"),
          faults: Array.isArray(row.faults) ? row.faults.slice(0, 2) : [],
        });
      }
    }
  }
  const refusedRefs = new Set(allowanceOnRefusedLine.map((x) => x.ref));

  const allowanceClaimedNotPriced = [];
  const valueDisagrees = [];
  const fundedTwice = [];
  let contingencyClaimed = 0;
  const contingencyRows = [];

  for (const row of rk) {
    const places = allowancePlaces(row.where);
    const inEstimate = places.includes("PACKAGE QUOTE") || places.includes("BASE ESTIMATE");
    const inContingency = places.includes("CENTRAL CONTINGENCY");
    const registerValue = money(row.value);

    const lines = pricedRefs.get(row.ref) || [];
    const onContingency = contingencyRefs.has(row.ref);

    if (inEstimate && !lines.length && !refusedRefs.has(row.ref)) {
      allowanceClaimedNotPriced.push({
        ref: row.ref,
        claimed: places.filter((p) => p !== "CENTRAL CONTINGENCY").join(" and "),
        why: "no priced line in the estimate references it",
      });
    }
    if (inContingency && contingencyLines.length + (contingency ? 1 : 0) === 0) {
      allowanceClaimedNotPriced.push({
        ref: row.ref,
        claimed: "CENTRAL CONTINGENCY",
        why: "there is no contingency line in the estimate to sit in",
      });
    }

    if (inContingency && registerValue !== null) {
      contingencyClaimed = round2(contingencyClaimed + registerValue);
      contingencyRows.push({ ref: row.ref, value: registerValue });
    }

    // The double count, proved: on a priced line and on the contingency.
    if (lines.length && onContingency) {
      fundedTwice.push({
        ref: row.ref,
        lines: lines.map((l) => l.id),
        why: "carried by a priced line and by the contingency",
      });
    }

    // The two documents' own figures, compared.
    if (registerValue !== null && lines.length) {
      const vals = lines.map((l) => l.value).filter((v) => v !== null);
      if (vals.length === lines.length) {
        const total = round2(vals.reduce((a, b) => a + b, 0));
        if (Math.abs(total - registerValue) > tolerance) {
          valueDisagrees.push({
            ref: row.ref,
            register: registerValue,
            estimate: total,
            lines: lines.map((l) => l.id),
          });
        }
      }
    }
  }

  // Money in the estimate against a record that does not exist.
  const pricedNotRegistered = [];
  for (const [ref, lines] of pricedRefs) {
    const isRisk = ref.startsWith("RK-");
    const isAssumption = ref.startsWith("AS-");
    if (isRisk && !registeredRisks.has(ref)) {
      pricedNotRegistered.push({ ref, lines: lines.map((l) => l.id), kind: "risk" });
    } else if (isAssumption && registeredAssumptions.has(ref) === false && as.length) {
      // Only reported when there IS an assumption register to be absent from.
      // With no register at all the finding is "there is no register", which
      // is the other check's to make and not this one's to say six times.
      pricedNotRegistered.push({ ref, lines: lines.map((l) => l.id), kind: "assumption" });
    }
  }
  for (const ref of contingencyRefs) {
    if (!ref.startsWith("RK-") || registeredRisks.has(ref)) continue;
    pricedNotRegistered.push({ ref, lines: ["(contingency)"], kind: "risk" });
  }

  // The arithmetic nobody does: is the contingency big enough for the risks
  // that point at it?
  let contingencyCover = null;
  if (!contingencyRows.length) {
    contingencyCover = { ok: true, claimed: 0, available: contingencyValue, say: "no risk is funded from central contingency" };
  } else if (contingencyValue === null) {
    contingencyCover = {
      ok: false, claimed: contingencyClaimed, available: null,
      say: `${contingencyRows.length} risk(s) totalling ${contingencyClaimed} are funded from a central contingency the estimate does not state`,
    };
  } else if (contingencyClaimed > contingencyValue + tolerance) {
    contingencyCover = {
      ok: false, claimed: contingencyClaimed, available: contingencyValue,
      say: `${contingencyClaimed} of risk is funded from a contingency of ${contingencyValue} — `
        + `${round2(contingencyClaimed - contingencyValue)} of the register has no money behind it`,
    };
  } else {
    contingencyCover = {
      ok: true, claimed: contingencyClaimed, available: contingencyValue,
      say: `${contingencyClaimed} of risk against a contingency of ${contingencyValue}`,
    };
  }

  // An answer that says it moved the estimate, where the estimate does not
  // carry it. Only for answers that claim the estimate: one that says it
  // changed a drawing is the register check's business, not this one's.
  const answerNotInEstimate = [];
  for (const row of cl) {
    const status = clean(row.status).toUpperCase().replace(/[^A-Z]/g, "");
    if (status !== "ANSWERED") continue;
    const said = clean(row.changed);
    if (blank(said) || /^no change\b/i.test(said)) continue;
    if (!/estimate|price|rate|cost|allowance|priced/i.test(said)) continue;
    if (!pricedRefs.has(row.ref)) {
      answerNotInEstimate.push({ ref: row.ref, said: said.slice(0, 120) });
    }
  }

  const faults =
    allowanceClaimedNotPriced.length + pricedNotRegistered.length + fundedTwice.length +
    valueDisagrees.length + (contingencyCover.ok ? 0 : 1) + answerNotInEstimate.length +
    allowanceOnRefusedLine.length;

  return {
    allowanceClaimedNotPriced,
    pricedNotRegistered,
    fundedTwice,
    valueDisagrees,
    contingencyCover,
    answerNotInEstimate,
    allowanceOnRefusedLine,
    // WHERE THE PRICED LINES CAME FROM, CARRIED ON THE RESULT.
    //
    // A reader of this result must be able to tell whether it tested the
    // estimate of record or a table somebody retyped, because the two
    // deserve different amounts of trust and they otherwise look identical.
    source: source || { kind: "supplied", say: "priced lines supplied with the run" },
    compared: {
      risks: rk.length,
      assumptions: as.length,
      clarifications: cl.length,
      pricedLines: priced.length,
      contingencyLines: contingencyLines.length,
      refusedLines: refused.length,
      referencedRefs: pricedRefs.size,
    },
    faults,
    ok: faults === 0,
  };
}

/**
 * The notes an approver reads. Separate from `tenderNotes` on purpose: these
 * are findings about the price, and an approver who sees them mixed into
 * register housekeeping reads them as housekeeping.
 */
export function estimateCrossNotes(result) {
  const out = [];
  if (!result) return out;
  const r = result;

  if (r.allowanceClaimedNotPriced?.length) {
    out.push(`AN ALLOWANCE CLAIMED AND NOT IN THE PRICE — ${r.allowanceClaimedNotPriced
      .map((x) => `${x.ref} (says ${x.claimed}; ${x.why})`).join("; ")}. `
      + "The register records a decision about where the money would sit. The estimate does not carry it, so the decision was made and never arrived.");
  }
  if (r.pricedNotRegistered?.length) {
    out.push(`MONEY AGAINST A RECORD THAT DOES NOT EXIST — ${r.pricedNotRegistered
      .map((x) => `${x.ref} on ${x.lines.join(", ")}`).join("; ")}. `
      + "Either the register was pruned after the estimate was built, or the reference is wrong; if it is wrong, the exposure the money was for is uncovered.");
  }
  if (r.fundedTwice?.length) {
    out.push(`FUNDED TWICE, IN THE FILE THAT GETS ADDED UP — ${r.fundedTwice
      .map((x) => `${x.ref} (${x.lines.join(", ")} and the contingency)`).join("; ")}. `
      + "This is the double count proved rather than read off a cell, and it is the one that loses a bid by an amount nobody can find afterwards.");
  }
  if (r.valueDisagrees?.length) {
    out.push(`THE REGISTER AND THE ESTIMATE DISAGREE — ${r.valueDisagrees
      .map((x) => `${x.ref}: ${x.register} in the register, ${x.estimate} on ${x.lines.join(", ")}`).join("; ")}. `
      + "Both documents are internally consistent, so no reader can tell which figure is the bid's. Settlement cannot be held on two numbers.");
  }
  if (r.contingencyCover && !r.contingencyCover.ok) {
    out.push(`THE CONTINGENCY IS SPENT BEFORE SUBMISSION — ${r.contingencyCover.say}. `
      + "Every row is defensible on its own and the total is not funded.");
  }
  if (r.allowanceOnRefusedLine?.length) {
    out.push(`AN ALLOWANCE ON A LINE THE ENGINE REFUSED — ${r.allowanceOnRefusedLine
      .map((x) => `${x.ref} on ${x.line}${x.faults.length ? ` (${x.faults[0]})` : ""}`).join("; ")}. `
      + "The line exists and is not in the total, so the money was identified and is not in the price. "
      + "The fix is the line, not another allowance: pricing the risk again would fund it twice the moment the line is admitted.");
  }
  if (r.answerNotInEstimate?.length) {
    out.push(`AN ANSWER THAT SAYS IT CHANGED THE PRICE, WHERE THE PRICE DOES NOT CARRY IT — ${r.answerNotInEstimate
      .map((x) => `${x.ref} ("${x.said}")`).join("; ")}. `
      + "A reply is implemented when the line has moved. This one has been written down as implemented and no priced line references it.");
  }
  return out;
}

/** One sentence for the run log and the approval screen. */
export function estimateCrossStatement(result) {
  if (!result) return "the registers were not compared to the estimate";
  const c = result.compared || {};
  if (!c.pricedLines) {
    // A schedule read from a run whose every line the engine refused is NOT
    // "no lines supplied". The estimate exists, it was read, and the engine
    // would not admit any of it — which is a far louder fact than an absent
    // field, and reporting the two in the same words buries it.
    if (c.refusedLines) {
      return `the estimate was read and the engine admitted none of it — all ${c.refusedLines} line(s) were refused, `
        + `so its own total is understated by the whole of the schedule and the registers' claims cannot be tested against it`
        + (result.source?.say ? ` (${result.source.say})` : "");
    }
    return "no priced estimate lines were supplied, so the registers' claims about the price could not be tested";
  }
  if (!c.risks && !c.clarifications) {
    return `${c.pricedLines} priced line(s) and no readable register to compare them to`;
  }
  const from = result.source?.say ? `, ${result.source.say}` : "";
  if (result.ok) {
    return `${c.risks} risk(s) and ${c.clarifications} clarification(s) reconcile to ${c.pricedLines} priced line(s)${from}: `
      + "every claimed allowance is in the price, every allowance in the price is registered, nothing is funded twice, "
      + `and ${result.contingencyCover?.say || "the contingency holds"}`;
  }
  return `${result.faults} fault(s) between the registers and the price${from}`;
}
