/**
 * The scope-to-price reconciliation — the one check that makes a tender
 * pack safe to issue.
 *
 * A tender pack fails in exactly one way that nobody notices until the
 * returns are in: the scope sheet says one thing and the pricing schedule
 * asks for another. A scope item with no priced line is work the tenderer
 * has been told to do and given nowhere to price, so it arrives in month two
 * as a variation. A priced line with no scope item is a price for something
 * that was never specified, so every tenderer guesses at it and none of them
 * guesses the same — which is the whole reason their returns then cannot be
 * compared.
 *
 * Telling the model to keep them aligned is not a mechanism. THIS is the
 * mechanism: every scope item carries a reference, every priced line names
 * the scope reference it prices, and the two sets are compared here, by a
 * function, on every run. A pack that does not reconcile says so on its own
 * face and in the run notes, before anybody approves it.
 *
 * The reference form is fixed and the agent is told it verbatim:
 *
 *     SS-<package>.<item>      e.g. SS-P01.4, SS-TW02.11
 *
 * and the pricing schedule's table carries the exact columns named in
 * PRICING_COLUMNS, so the unit check below has somewhere to look.
 */

/** A scope-item reference wherever it appears. */
const REF = /\bSS-([A-Z0-9]{2,10})\.(\d{1,3})\b/g;

/** The pricing schedule's columns, mandated in the brief and checked here. */
export const PRICING_COLUMNS = ["Ref", "Scope ref", "Description", "Unit", "Quantity", "Rate", "Amount"];

/**
 * The units a line may be priced in. A tenderer cannot price "as required",
 * and two tenderers pricing the same line in different units produce two
 * numbers that look comparable and are not.
 */
export const UNITS = [
  "item", "sum", "nr", "no", "each", "set",
  "m", "lin m", "m2", "m²", "sq m", "m3", "m³", "cu m", "ha",
  "kg", "t", "tonne", "litre", "l",
  "hour", "hr", "shift", "day", "week", "month", "year",
  "visit", "person-week", "bed-night", "%", "kva", "kw", "kwh",
];

const UNIT_SET = new Set(UNITS.map((u) => u.toLowerCase()));

/** Every scope reference in a block of text, in the order it first appears. */
export function refsIn(text) {
  const out = [];
  const seen = new Set();
  const src = String(text || "");
  REF.lastIndex = 0;
  let m;
  while ((m = REF.exec(src))) {
    // Item numbers are compared as numbers, so SS-P01.04 and SS-P01.4 are
    // one reference rather than two — a difference nobody would ever
    // intend and everybody would eventually type.
    const ref = `SS-${m[1].toUpperCase()}.${Number(m[2])}`;
    if (!seen.has(ref)) { seen.add(ref); out.push(ref); }
  }
  return out;
}

/** Sort references the way a person reads them: by package, then by item. */
const byRef = (a, b) => {
  const [ap, ai] = a.slice(3).split(".");
  const [bp, bi] = b.slice(3).split(".");
  return ap === bp ? Number(ai) - Number(bi) : ap.localeCompare(bp);
};

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
 * Priced lines that name no unit.
 *
 * The pricing table's header is found by its columns rather than by its
 * position, because a schedule with several package tables has several
 * headers and all of them must be checked.
 */
function unitFailures(priceText) {
  const rows = tableRows(priceText);
  const bad = [];
  let scopeCol = -1, unitCol = -1;
  for (const cells of rows) {
    const header = cells.map(norm);
    const s = header.indexOf("scoperef");
    const u = header.indexOf("unit");
    if (s >= 0 && u >= 0) { scopeCol = s; unitCol = u; continue; }
    if (scopeCol < 0) continue;
    const ref = refsIn(cells[scopeCol] || "")[0];
    if (!ref) continue;
    const unit = String(cells[unitCol] || "").toLowerCase().replace(/[.*_`]/g, "").trim();
    if (!UNIT_SET.has(unit)) bad.push({ ref, unit: cells[unitCol] || "(blank)" });
  }
  return bad;
}

/**
 * Reconcile the scope sheets against the pricing schedule.
 *
 * `ok` is true only when every scope item is priced, every priced line is
 * specified, and every priced line names a unit a tenderer can price in.
 */
export function reconcileScopeToPrice(scopeText, priceText) {
  const scope = refsIn(scopeText);
  const price = refsIn(priceText);
  const priceSet = new Set(price);
  const scopeSet = new Set(scope);

  const unpriced = scope.filter((r) => !priceSet.has(r)).sort(byRef);
  const unspecified = price.filter((r) => !scopeSet.has(r)).sort(byRef);
  const unitless = unitFailures(priceText);

  return {
    scopeItems: scope.length,
    pricedLines: price.length,
    matched: scope.filter((r) => priceSet.has(r)).length,
    unpriced,
    unspecified,
    unitless,
    // A pack with no references at all has not been written to the
    // convention, which is a failure of its own and not a clean result.
    referenced: scope.length > 0 && price.length > 0,
    ok: scope.length > 0 && price.length > 0 && !unpriced.length && !unspecified.length && !unitless.length,
  };
}

const list = (refs, cap = 12) =>
  refs.slice(0, cap).join(", ") + (refs.length > cap ? `, and ${refs.length - cap} more` : "");

/**
 * The reconciliation as notes on the run — what the person approving it
 * reads before they approve it.
 *
 * Every note says what is wrong, what it costs if it is issued anyway, and
 * what to do. A warning that only says "mismatch" gets approved.
 *
 * A pack that reconciles produces NO notes: these are exceptions, and the
 * clean result is carried on the run itself.
 */
export function packNotes(result) {
  const notes = [];
  if (!result.referenced) {
    notes.push(
      "SCOPE AND PRICE COULD NOT BE RECONCILED: the scope sheets or the pricing schedule carry no SS-package.item references, " +
        "so there is no way to check that what the tenderer is told to do matches what they are asked to price. " +
        "Do not issue this pack — re-run it, and if it comes back the same the references have to be added by hand before issue."
    );
    return notes;
  }
  if (result.unpriced.length) {
    notes.push(
      `${result.unpriced.length} scope item(s) have NO PRICED LINE: ${list(result.unpriced)}. ` +
        "The tenderer is instructed to do this work and given nowhere to price it, so it arrives after award as a variation at their rate rather than a tendered one. " +
        "Add a line to the pricing schedule for each, or delete the scope item, before this pack is issued."
    );
  }
  if (result.unspecified.length) {
    notes.push(
      `${result.unspecified.length} priced line(s) reference a scope item that DOES NOT EXIST: ${list(result.unspecified)}. ` +
        "Every tenderer will price these on their own assumption and no two assumptions will match, which is exactly the condition that makes returns incomparable. " +
        "Write the scope item or remove the line before this pack is issued."
    );
  }
  if (result.unitless.length) {
    notes.push(
      `${result.unitless.length} priced line(s) name no unit a tenderer can price in: ` +
        `${list(result.unitless.map((u) => `${u.ref} (unit "${u.unit}")`))}. ` +
        `A line with no unit comes back priced in whatever each tenderer chose. Use one of: ${UNITS.slice(0, 12).join(", ")} — or another stated unit of measurement.`
    );
  }
  // Nothing on success. Run notes are an exception report — "depth reduced",
  // "this pass is INCOMPLETE", "carried over from the interrupted run" — and a
  // line of good news among them is read as one more thing that went wrong.
  // The clean result is on the run as `packCheck` and printed as its own
  // statement on the issue certificate.
  return notes;
}

/**
 * The reconciliation as a table for the issue certificate — the same result
 * the desk saw, printed on the pack so the client can see it was checked.
 */
export function packStatement(result) {
  if (!result.referenced) {
    return "**Scope and price could not be reconciled.** The scope sheets and the pricing schedule do not carry matching references, so this pack has not passed the issue check and must not be issued as it stands.";
  }
  const rows = [
    "| Check | Result |",
    "|---|---|",
    `| Scope items specified | ${result.scopeItems} |`,
    `| Priced lines in the schedule | ${result.pricedLines} |`,
    `| Scope items with a priced line | ${result.matched} of ${result.scopeItems} |`,
    `| Priced lines with no scope item | ${result.unspecified.length} |`,
    `| Priced lines with no unit of measurement | ${result.unitless.length} |`,
  ].join("\n");
  const verdict = result.ok
    ? "\n\n**This pack reconciles.** Every scope item has a priced line, every priced line has a scope item, and every line names a unit. The check is performed by the system on every issue, not by eye."
    : "\n\n**This pack does not reconcile and must not be issued as it stands.** The exceptions are listed in the run notes and each one must be closed before issue.";
  return rows + verdict;
}
