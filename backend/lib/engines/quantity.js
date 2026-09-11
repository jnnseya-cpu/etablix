/**
 * THE QUANTITY AGENT — and the register's own sentence about what it is for:
 * "The valuable output is the disagreement between the three, not the number."
 *
 * Three sources give a quantity for the same item: the model, the bill of
 * quantities and the drawings. Any two of them will differ. The useful
 * product is not an agreed figure — producing one is the failure — it is the
 * list of items where they disagree by enough to matter, ranked by what the
 * disagreement is worth.
 *
 * THE BILL GOVERNS, AND THAT IS NOT A PREFERENCE. On a measured contract the
 * bill is a contract document. A take-off that disagrees with it is a reason
 * to remeasure or to raise a query, not a reason to change the price. So this
 * engine never overwrites the bill and never presents a blended figure.
 *
 * WHAT IT REFUSES:
 *
 *   · A COMPARISON ACROSS DIFFERENT UNITS. Square metres against linear
 *     metres is not a variance, it is two different questions, and a
 *     percentage computed across them is a number with no meaning presented
 *     to two decimal places.
 *   · A SINGLE RECONCILED FIGURE where the sources disagree beyond tolerance.
 *     That is the one output this engine will not produce.
 *   · AN ITEM IN ONE SOURCE AND NOT THE OTHERS. The expensive one: work in
 *     the model and not in the bill is work being built and not paid for;
 *     work in the bill and not in the model is usually a duplicate.
 */

import { num } from "../l7/num.js";
import { dimensionOf } from "../l7/estimating.js";
import { day, asAtOr } from "./moment.js";

export const SOURCES = ["model", "bill", "drawing"];

/** Anything beyond this is worth somebody's afternoon. */
export const TOLERANCE = 0.02;

function readRow(raw = {}, faults) {
  const item = String(raw.item || "").trim();
  if (!item) faults.push("a row with no item reference");
  const unit = String(raw.unit || "").trim();
  if (!unit) faults.push(`${item}: no unit`);
  else if (dimensionOf(unit) === null) faults.push(`${item}: "${unit}" is not a unit this system can dimension`);
  const q = num(raw.quantity);
  if (q === null) faults.push(`${item}: the quantity is not a number`);
  return { item, unit, quantity: q, rate: num(raw.rate), source: String(raw.source || "").trim(), note: raw.note ? String(raw.note) : null };
}

/**
 * Compare. `rows` are flat: { item, source, unit, quantity, rate }.
 */
export function compare({ rows = [], tolerance = TOLERANCE, asAt = null } = {}) {
  const faults = [];
  const read = rows.map((r) => readRow(r, faults));
  const bad = read.filter((r) => !SOURCES.includes(r.source));
  for (const r of bad) faults.push(`${r.item || "(unreferenced)"}: "${r.source}" is not one of ${SOURCES.join(", ")}`);

  const byItem = new Map();
  for (const r of read) {
    if (!r.item || !SOURCES.includes(r.source)) continue;
    if (!byItem.has(r.item)) byItem.set(r.item, {});
    byItem.get(r.item)[r.source] = r;
  }

  const comparisons = [];
  const unitClashes = [];
  const missing = [];

  for (const [item, sources] of byItem) {
    const present = SOURCES.filter((s) => sources[s]);
    const units = [...new Set(present.map((s) => sources[s].unit))];
    if (units.length > 1) {
      unitClashes.push({
        item, units,
        why: `measured in ${units.join(" and ")}. Square metres against linear metres is not a variance, it is two different questions, and a percentage across them is a number with no meaning reported to two decimal places.`,
      });
      continue;
    }
    if (present.length < SOURCES.length) {
      const absent = SOURCES.filter((s) => !sources[s]);
      missing.push({
        item,
        present, absent,
        why: absent.includes("bill")
          ? "in the model or on the drawings and NOT in the bill. Work that is built and not paid for."
          : absent.includes("model")
            ? "in the bill and not in the model. Usually a duplicate measure, occasionally a whole element nobody has drawn."
            : "not on the drawings. The drawings are what the work is built from.",
      });
    }
    if (present.length < 2) continue;

    const bill = sources.bill ? sources.bill.quantity : null;
    const governing = bill !== null ? bill : sources[present[0]].quantity;
    const rate = sources.bill?.rate ?? sources[present[0]].rate ?? null;
    const values = {};
    let worst = 0;
    for (const s of present) {
      const q = sources[s].quantity;
      values[s] = q;
      if (q === null || governing === null || governing === 0) continue;
      const v = Math.abs(q - governing) / Math.abs(governing);
      if (v > worst) worst = v;
    }
    const spread = present.map((s) => sources[s].quantity).filter((q) => q !== null);
    const range = spread.length ? Math.max(...spread) - Math.min(...spread) : null;
    comparisons.push({
      item,
      unit: units[0] || null,
      values,
      governing,
      governedBy: bill !== null ? "bill" : present[0],
      variance: Math.round(worst * 10000) / 100,
      range,
      // What the disagreement is worth, which is what decides whether it gets
      // looked at. A 40% variance on twelve bolts is not the finding.
      worth: range !== null && rate !== null ? Math.round(range * rate * 100) / 100 : null,
      beyondTolerance: worst > tolerance,
    });
  }

  const disagreements = comparisons.filter((c) => c.beyondTolerance)
    .sort((a, b) => (b.worth ?? 0) - (a.worth ?? 0));
  const exposure = disagreements.reduce((t, c) => t + (c.worth || 0), 0);

  return {
    ok: faults.length === 0 && disagreements.length === 0 && unitClashes.length === 0 && missing.length === 0,
    asAt: day(asAtOr(asAt)),
    faults,
    comparisons,
    disagreements,
    unitClashes,
    missing,
    exposure: Math.round(exposure * 100) / 100,
    // THE ONE OUTPUT THIS ENGINE WILL NOT PRODUCE is a single blended figure
    // across disagreeing sources, so the field that would carry it says why
    // instead of holding a number. Where everything agrees there is nothing
    // to blend and the governing total is just the bill's own total, which
    // the caller already has.
    governingTotal: disagreements.length || unitClashes.length
      ? null
      : Math.round(comparisons.reduce((t, c) => t + (c.governing || 0), 0) * 100) / 100,
    governingTotalWithheld: disagreements.length || unitClashes.length
      ? "No single total is produced while the sources disagree. A blended figure would hide exactly the thing this engine is for."
      : null,
    say: [
      faults.length ? `${faults.length} row(s) could not be read.` : null,
      unitClashes.length ? `${unitClashes.length} item(s) are measured in different units in different sources and are NOT compared.` : null,
      missing.length ? `${missing.length} item(s) appear in some sources and not others — the expensive disagreement, because neither side sees it as a variance.` : null,
      disagreements.length
        ? `${disagreements.length} item(s) disagree beyond ${Math.round(tolerance * 100)}%, worth ${Math.round(exposure * 100) / 100} between the extremes. The bill governs; a take-off that disagrees with it is a reason to remeasure or to raise a query, not a reason to change the price. No blended figure is produced, because a blended figure would hide exactly the thing this is for.`
        : comparisons.length ? `All ${comparisons.length} compared item(s) agree within ${Math.round(tolerance * 100)}%.` : "Nothing was comparable.",
    ].filter(Boolean).join(" "),
  };
}

export function state() { return { sources: SOURCES.length, tolerance: TOLERANCE, producesBlendedFigure: false }; }
