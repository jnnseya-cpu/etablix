/**
 * THE ESTIMATING AGENT — quantities and rates, with lineage on every number.
 *
 * The register's condition for building this was explicit, and it is the
 * whole design: "Without lineage a price cannot be defended and must not be
 * automated." The rate build-up, the nine assurance tests, the double-markup
 * detector and the quotation normaliser were built earlier and are used here
 * rather than rebuilt. What was missing is the thing the condition actually
 * asks for — lineage attached to each priced line, and a refusal when it is
 * not there.
 *
 * TEN THINGS EVERY PRICED LINE CARRIES, from the register's own sentence:
 * source, date, currency, quantity basis, productivity assumption, quotation
 * validity, exclusions, escalation, confidence and who approved it.
 *
 * A LINE MISSING ANY OF THEM IS NOT PRICED LOW OR PRICED HIGH. It is
 * unpriced, because nobody can say later what it was priced from — and the
 * question is always asked later, by somebody holding a different number.
 *
 * TWO REFUSALS THAT ARE NOT ABOUT COMPLETENESS:
 *
 *   · A PRODUCTIVITY ASSUMPTION THAT DOES NOT PRODUCE THE QUANTITY IN THE
 *     TIME. "40 m² per gang per day" against 2,000 m² in 10 days needs five
 *     gangs, and if the line prices two, the rate is wrong rather than
 *     optimistic. Arithmetic, not judgement.
 *   · A CONFIDENCE THAT RISES ABOVE ITS OWN SOURCE. A line built from a
 *     budget allowance cannot be "firm"; a line built from a received
 *     quotation can. Confidence claimed above the source is how an estimate
 *     hardens on the way to a board paper without anybody deciding to.
 */

import { assure, checkBuildUp, normaliseQuote, RATE_COMPONENTS, dimensionOf } from "../l7/estimating.js";
import { instant } from "../l7/evidence.js";
import { num } from "../l7/num.js";
import { asAtOr } from "./moment.js";

/** The ten. Each one is a question somebody asks about a price later. */
export const LINEAGE = [
  { key: "source", name: "Source", asks: "where the number came from" },
  { key: "sourceDate", name: "Date", asks: "how old it is" },
  { key: "currency", name: "Currency", asks: "what it is denominated in" },
  { key: "quantityBasis", name: "Quantity basis", asks: "measured from what — a drawing, a model, a schedule" },
  { key: "productivity", name: "Productivity assumption", asks: "the output the duration rests on" },
  { key: "validUntil", name: "Quotation validity", asks: "whether anybody is still bound by it" },
  { key: "exclusions", name: "Exclusions", asks: "what the number does not include" },
  { key: "escalation", name: "Escalation", asks: "how it moves between now and the work" },
  { key: "confidence", name: "Confidence", asks: "how firm it is" },
  { key: "approvedBy", name: "Approved by", asks: "who stands behind it" },
];
const LINEAGE_KEYS = LINEAGE.map((l) => l.key);

/**
 * How firm a number is, and what it has to rest on to claim that.
 *
 * The ORDER is the rule: a line's confidence may not exceed the firmness of
 * its own source.
 */
export const CONFIDENCE = ["allowance", "estimate", "budget_quote", "firm_quote"];
export const SOURCES = [
  { id: "allowance", name: "A budget allowance", maxConfidence: "allowance" },
  { id: "historic", name: "A historic rate from a previous project", maxConfidence: "estimate" },
  { id: "published", name: "A published price book", maxConfidence: "estimate" },
  { id: "buildup", name: "A first-principles build-up", maxConfidence: "budget_quote" },
  { id: "budget_quote", name: "A budget quotation from a supplier", maxConfidence: "budget_quote" },
  { id: "firm_quote", name: "A firm quotation against this scope", maxConfidence: "firm_quote" },
];
const SOURCE_BY_ID = new Map(SOURCES.map((s) => [s.id, s]));
const rank = (c) => CONFIDENCE.indexOf(String(c));

/** One priced line, with its lineage checked. */
export function priced(raw = {}, { asAt = null } = {}) {
  const faults = [];
  const id = String(raw.id || "").trim();
  if (!id) faults.push("no reference");
  const what = String(raw.what || "").trim();
  if (what.length < 6) faults.push("no description of what is being priced");

  const quantity = num(raw.quantity);
  const rate = num(raw.rate);
  const unit = String(raw.unit || "").trim();
  if (quantity === null) faults.push("the quantity is not a number");
  if (rate === null) faults.push("the rate is not a number");
  if (!unit) faults.push("no unit. A quantity with no unit is not a quantity.");
  else if (dimensionOf(unit) === null) faults.push(`"${unit}" is not a unit this system can dimension, so nothing can check the rate is per the right thing`);

  const total = quantity !== null && rate !== null ? Math.round(quantity * rate * 100) / 100 : null;
  const stated = num(raw.total);
  if (stated !== null && total !== null && Math.abs(stated - total) > 0.01) {
    faults.push(`${quantity} × ${rate} = ${total}, stated as ${stated}`);
  }

  // The lineage. Missing any one of them is the refusal.
  const missing = LINEAGE_KEYS.filter((k) => {
    const v = raw[k];
    if (k === "exclusions") return !Array.isArray(v);
    return v === undefined || v === null || String(v).trim() === "";
  });
  if (missing.length) {
    faults.push(`lineage missing: ${missing.map((k) => LINEAGE.find((l) => l.key === k).name.toLowerCase()).join(", ")}. A line missing any of the ten is not priced low or priced high — it is unpriced, because nobody can say later what it was priced from, and the question is always asked later by somebody holding a different number.`);
  }

  const source = raw.source ? String(raw.source) : null;
  const def = source ? SOURCE_BY_ID.get(source) : null;
  if (source && !def) faults.push(`"${source}" is not one of ${[...SOURCE_BY_ID.keys()].join(", ")}`);

  const confidence = raw.confidence ? String(raw.confidence) : null;
  if (confidence && rank(confidence) < 0) faults.push(`"${confidence}" is not one of ${CONFIDENCE.join(", ")}`);
  if (def && confidence && rank(confidence) > rank(def.maxConfidence)) {
    faults.push(`claimed as "${confidence}" from ${def.name.toLowerCase()}, which supports at most "${def.maxConfidence}". Confidence claimed above its own source is how an estimate hardens on the way to a board paper without anybody deciding to.`);
  }

  const sourceDate = raw.sourceDate ? instant(raw.sourceDate) : null;
  if (raw.sourceDate && sourceDate === null) faults.push(`the source date "${raw.sourceDate}" is not a date`);
  const validUntil = raw.validUntil && String(raw.validUntil) !== "n/a" ? instant(raw.validUntil) : null;
  const at = asAtOr(asAt);
  if (validUntil !== null && at !== null && validUntil <= at) {
    faults.push(`the quotation behind this line expired on ${String(raw.validUntil)}. The price rests on an offer nobody is bound by.`);
  }

  // THE PRODUCTIVITY ARITHMETIC.
  const p = raw.productivityCheck;
  if (p && typeof p === "object") {
    const output = num(p.outputPerCrewPerDay);
    const crews = num(p.crews);
    const days = num(p.days);
    if (output === null || crews === null || days === null) {
      faults.push("a productivity check was supplied with a figure missing, so it proves nothing");
    } else if (output > 0 && crews > 0 && days > 0 && quantity !== null) {
      const achievable = output * crews * days;
      if (achievable + 0.0001 < quantity) {
        const need = Math.ceil(quantity / (output * days));
        faults.push(`the productivity assumption does not produce the quantity in the time: ${output} per crew per day × ${crews} crew(s) × ${days} day(s) is ${achievable} against ${quantity} ${unit}. ${need} crew(s) would be needed. The rate is wrong rather than optimistic.`);
      }
    }
  }

  return {
    ok: faults.length === 0,
    faults,
    row: {
      id: id || null, what: what || null, quantity, unit: unit || null, rate,
      total, source, sourceDate: sourceDate === null ? null : new Date(sourceDate).toISOString().slice(0, 10),
      currency: raw.currency ? String(raw.currency).toUpperCase() : null,
      quantityBasis: raw.quantityBasis ? String(raw.quantityBasis) : null,
      productivity: raw.productivity ? String(raw.productivity) : null,
      validUntil: raw.validUntil ? String(raw.validUntil) : null,
      exclusions: Array.isArray(raw.exclusions) ? raw.exclusions.map(String) : null,
      escalation: raw.escalation ? String(raw.escalation) : null,
      confidence, approvedBy: raw.approvedBy ? String(raw.approvedBy) : null,
      scopeItemId: raw.scopeItemId ? String(raw.scopeItemId) : null,
    },
    missing,
  };
}

/**
 * The priced schedule, and the nine assurance tests over it.
 *
 * The refused lines are NOT dropped from the total silently. A schedule that
 * quietly totals only the admissible lines reports a lower price with no sign
 * that anything is missing, which is the worst of the three possible answers.
 */
export function price({ lines = [], scopeItems = [], quotes = [], approvedExclusions = [], asAt = null, submissionPrice = null, approvedPrice = null } = {}) {
  // Mapped before filtering. Filtering first makes the index count the
  // filtered array, and a refusal reported against another line's reference
  // sends somebody to look at a line that is fine.
  const checked = lines.map((l) => ({ ...priced(l, { asAt }), given: l }));
  const good = checked.filter((c) => c.ok);
  const refused = checked.filter((c) => !c.ok).map((c) => ({ id: c.given?.id || null, faults: c.faults }));

  const estimateItems = good.map((c) => ({
    id: c.row.id, scopeItemId: c.row.scopeItemId, quantity: c.row.quantity, rate: c.row.rate, total: c.row.total,
  }));
  const assurance = assure({
    scopeItems, estimateItems, quotes: quotes.map(normaliseQuote),
    approvedExclusions, asAt, submissionPrice, approvedPrice,
  });

  const total = good.reduce((t, c) => t + (c.row.total || 0), 0);
  const byConfidence = {};
  for (const c of good) {
    const k = c.row.confidence || "(none)";
    byConfidence[k] = Math.round(((byConfidence[k] || 0) + (c.row.total || 0)) * 100) / 100;
  }
  const firmShare = total > 0 ? Math.round(((byConfidence.firm_quote || 0) / total) * 100) : 0;

  return {
    ok: refused.length === 0 && assurance.ok,
    lines: good.map((c) => c.row),
    refused,
    total: Math.round(total * 100) / 100,
    byConfidence,
    firmShare,
    assurance,
    // The shape of the price matters as much as the number. A total that is
    // 12% firm quotations is a different document from one that is 80%, and
    // presenting them identically is how a budget becomes a tender.
    say: [
      refused.length ? `${refused.length} line(s) are not admissible and are NOT in the total, which is therefore understated by however much they were worth.` : null,
      assurance.ok ? "All nine assurance tests pass." : assurance.say + ".",
      `${good.length} priced line(s) totalling ${Math.round(total * 100) / 100}, ${firmShare}% of it against firm quotations.`,
    ].filter(Boolean).join(" "),
  };
}

/** Rate build-up completeness across the seven components. */
export function buildUp(values = {}) {
  const rows = RATE_COMPONENTS.map((c) => checkBuildUp(c.id, values[c.id] || {}));
  const incomplete = rows.filter((r) => !r.ok);
  return {
    ok: incomplete.length === 0,
    components: rows,
    incomplete,
    say: incomplete.length === 0
      ? `All ${rows.length} rate components carry every control.`
      : `${incomplete.length} of ${rows.length} rate components are incomplete: ${incomplete.map((r) => r.say).join("; ")}.`,
  };
}

export function state() {
  return { lineage: LINEAGE.length, sources: SOURCES.length, confidences: CONFIDENCE.length, components: RATE_COMPONENTS.length };
}
