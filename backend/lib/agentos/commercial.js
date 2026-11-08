/**
 * The pricing envelope and earned value — arithmetic as a deterministic
 * service, and two specific misreadings it exists to prevent.
 *
 * ONE · MARKUP ON COST IS NOT MARGIN ON REVENUE, AND THE DIFFERENCE IS THE
 * NUMBER PEOPLE QUOTE. Twenty per cent added to £100,000 of direct cost is
 * £20,000, and £20,000 on a £120,000 revenue is 16.67 per cent. Both are
 * true. Only one of them is a margin, and reporting the markup as a margin
 * overstates the business's return by a fifth in every board pack that
 * repeats it — before overhead, risk and tax take their share of what is
 * left. The specification says it plainly: never report it as 20% margin. So
 * both figures are returned, each labelled, and neither can be read as the
 * other.
 *
 * TWO · THE CONTINGENCY IS NOT IN THE VALUATION. A 5 per cent risk allowance
 * on direct cost sits inside the budget ENVELOPE and outside the contract
 * baseline until a release is authorised. Rolling it into the invoice basis
 * bills the client for a risk that has not occurred; leaving it out of the
 * envelope understates what the job needs. It is held as a separately
 * controlled figure with its own release, which is the only arrangement that
 * is true on both sides.
 *
 * MONEY IS HELD IN PENCE. A 5 per cent retention on £120,000 is £6,000 and
 * floating-point arithmetic will produce 5999.999999999999 often enough to
 * matter on a certificate. Every money input is converted to integer pence,
 * every operation is integer, and the conversion back happens once at the
 * edge.
 *
 * AND EARNED VALUE IS NOT A VALUATION. EV is what the baseline says has been
 * achieved. A client-certified valuation is what somebody with authority has
 * agreed. A payable invoice is what the contract makes due. The three differ
 * routinely and the specification keeps them separate; so does this. Nothing
 * here earns value on unaccepted work.
 */

/** Pence, from whatever arrived. Null rather than a guess. */
function pence(v) {
  if (v === null || v === undefined || v === "") return null;
  const raw = String(v).replace(/[£$€\s]/g, "").replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) return null;
  return Math.round(Number(raw) * 100);
}
const pounds = (p) => (p === null ? null : Math.round(p) / 100);
const pct = (basis, rate) => (basis === null || rate === null ? null : Math.round((basis * rate) / 100));

/**
 * The pricing envelope.
 *
 * `directCost` is eligible direct cost for the period. `markupPct` applies to
 * it. `contingencyPct` also applies to direct cost and is held OUTSIDE the
 * contract baseline. `retentionPct` applies to the valuation where the
 * contract provides for it, and only then.
 */
export function pricingEnvelope({
  directCost = null,
  markupPct = 20,
  contingencyPct = 5,
  retentionPct = null,
  retentionApplies = null,
} = {}) {
  const direct = pence(directCost);
  if (direct === null) {
    return { ok: false, say: `"${String(directCost ?? "(blank)")}" is not a readable money figure, so nothing can be priced from it` };
  }

  const markup = pct(direct, Number(markupPct));
  const contingency = pct(direct, Number(contingencyPct));
  const baseline = direct + markup;              // the contract baseline
  const envelope = baseline + contingency;        // what the job needs in total

  // Retention is applied only where the contract provides for it. A default
  // would deduct money nobody agreed to deduct.
  const applies = retentionApplies === null ? retentionPct !== null : Boolean(retentionApplies);
  const retention = applies ? pct(baseline, Number(retentionPct ?? 0)) : null;
  const beforeVat = retention === null ? baseline : baseline - retention;

  // The two percentages, both labelled, so neither can be read as the other.
  const markupOnCost = direct > 0 ? Math.round((markup / direct) * 10000) / 100 : null;
  const marginOnRevenue = baseline > 0 ? Math.round((markup / baseline) * 10000) / 100 : null;

  return {
    ok: true,
    directCost: pounds(direct),
    markup: pounds(markup),
    contingency: pounds(contingency),
    contractBaseline: pounds(baseline),
    budgetEnvelope: pounds(envelope),
    retentionApplied: applies,
    retention: pounds(retention),
    payableBeforeVat: pounds(beforeVat),
    markupOnCostPct: markupOnCost,
    marginOnRevenuePct: marginOnRevenue,
    // Stated rather than implied, because this is the sentence that gets
    // repeated in a board pack with the wrong label on it.
    rateStatement: `${markupOnCost}% markup on direct cost is ${marginOnRevenue}% margin on revenue — the second is the margin, and the first must never be reported as one`,
    contingencyStatement: `the ${contingencyPct}% allowance of ${pounds(contingency)} is inside the ${pounds(envelope)} envelope and outside the ${pounds(baseline)} contract baseline until a release is authorised`,
    say: `envelope ${pounds(envelope)}, contract baseline ${pounds(baseline)}`
      + (retention === null
          ? ", no retention applied because the contract was not stated to provide for one"
          : `, ${pounds(beforeVat)} payable before VAT after ${pounds(retention)} retention`),
  };
}

/**
 * Earned value. PV, EV, AC in, CPI and SPI out, with the denominators handled
 * rather than divided by.
 *
 * A zero or missing denominator is reported as undefined, not as zero and not
 * as one. CPI of 1.0 against no actual cost reads as a job performing exactly
 * to budget, which is the opposite of what no data means.
 */
export function earnedValue({ pv = null, ev = null, ac = null, label = null } = {}) {
  const PV = pence(pv);
  const EV = pence(ev);
  const AC = pence(ac);
  const missing = [];
  if (PV === null) missing.push("PV");
  if (EV === null) missing.push("EV");
  if (AC === null) missing.push("AC");

  const cpi = EV !== null && AC !== null && AC !== 0 ? Math.round((EV / AC) * 10000) / 10000 : null;
  const spi = EV !== null && PV !== null && PV !== 0 ? Math.round((EV / PV) * 10000) / 10000 : null;

  const undefinedBecause = [];
  if (cpi === null) undefinedBecause.push(AC === 0 ? "CPI is undefined: actual cost is zero, which is not the same as performing to budget" : "CPI needs EV and AC");
  if (spi === null) undefinedBecause.push(PV === 0 ? "SPI is undefined: planned value is zero, so there is no baseline to be ahead or behind of" : "SPI needs EV and PV");

  return {
    ok: missing.length === 0,
    label: label ? String(label) : null,
    pv: pounds(PV), ev: pounds(EV), ac: pounds(AC),
    cpi, spi,
    costVariance: EV !== null && AC !== null ? pounds(EV - AC) : null,
    scheduleVariance: EV !== null && PV !== null ? pounds(EV - PV) : null,
    missing,
    undefinedBecause,
    // The separation the specification insists on, carried on the result so a
    // reader cannot take EV for something somebody has agreed to pay.
    note: "EV is baseline achievement. It is not a client-certified valuation and not a payable invoice; those are separate authorisations.",
    say: missing.length
      ? `earned value cannot be computed without ${missing.join(", ")}`
      : `CPI ${cpi === null ? "undefined" : cpi}, SPI ${spi === null ? "undefined" : spi}`
          + (cpi !== null && cpi < 1 ? ` — ${pounds(AC - EV)} spent beyond what has been earned` : "")
          + (spi !== null && spi < 1 ? `, and ${pounds(PV - EV)} of planned value not achieved` : ""),
  };
}

/** The notes an approver reads. */
export function commercialNotes(envelope, ev) {
  const out = [];
  if (envelope && envelope.ok) {
    out.push(`RATE BASIS — ${envelope.rateStatement}.`);
    out.push(`ALLOWANCE — ${envelope.contingencyStatement}.`);
    if (!envelope.retentionApplied) {
      out.push("RETENTION NOT APPLIED — no contractual retention was stated, so none is deducted. "
        + "A default deduction would withhold money nobody agreed to withhold.");
    }
  }
  if (ev && ev.undefinedBecause?.length) {
    for (const why of ev.undefinedBecause) out.push(`EARNED VALUE — ${why}.`);
  }
  if (ev && ev.ok && (ev.cpi < 1 || ev.spi < 1)) {
    out.push(`PERFORMANCE — ${ev.say}. ${ev.note}`);
  }
  return out;
}
