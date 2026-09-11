/**
 * THE LIFECYCLE AND ASSET INFORMATION AGENT.
 *
 * The last engine in the sequence, and the one whose output outlives the
 * project by twenty-five years. A lifecycle plan is a schedule of when each
 * asset is replaced and what that costs, and it is used to set a sinking fund
 * or a service charge. Get it wrong and the error compounds annually for the
 * life of the building.
 *
 * IT FAILS IN THREE WAYS, ALL OF WHICH LOOK LIKE A FINISHED SPREADSHEET:
 *
 *   · REPLACEMENT COSTS WITH NO BASIS AND NO DATE. A replacement cost is a
 *     price at a price base date, in a currency, from a source. Without those
 *     it cannot be escalated, and a lifecycle model that does not escalate is
 *     a model of a building in a world with no inflation. The same rule as
 *     the estimating engine, applied over twenty-five years instead of one
 *     tender, which is where it matters most.
 *   · AN EXPECTED LIFE THAT DOES NOT REACH THE FIRST REPLACEMENT. A pump with
 *     a fifteen-year life and a first replacement at year twenty is a plan to
 *     run it five years past its life, and nobody decided that — it is an
 *     arithmetic slip in a column nobody rereads.
 *   · A REPLACEMENT CYCLE THAT DOES NOT DIVIDE THE PERIOD. Assets replaced
 *     every seven years over a twenty-five year model are replaced three
 *     times, not four, and the fourth is the one somebody budgets for.
 *
 * AND THE ONE THAT IS NOT ARITHMETIC: an asset with a warranty running past
 * its first replacement, or spares held for an asset being replaced inside
 * the spares' own shelf life. Both are money spent on an asset that will not
 * be there.
 */

import { num } from "../l7/num.js";
import { day, asAtOr, moment } from "./moment.js";

/** What a lifecycle line has to carry to be escalated later. */
export const COST_CONTROLS = ["basis", "priceBaseDate", "currency", "source"];

/** The model period a lifecycle plan is usually built over. */
export const DEFAULT_PERIOD_YEARS = 25;

export function lifecycleLine(raw = {}, { periodYears = DEFAULT_PERIOD_YEARS, asAt = null } = {}) {
  const faults = [];
  const at = asAtOr(asAt);
  const tag = String(raw.tag || "").trim();
  if (!tag) faults.push("no asset tag");

  const life = num(raw.expectedLifeYears);
  if (life === null || life <= 0) faults.push("no expected life in years");
  const cycle = num(raw.replacementCycleYears);
  if (cycle === null || cycle <= 0) faults.push("no replacement cycle in years");

  const cost = num(raw.replacementCost);
  if (cost === null) faults.push("no replacement cost");
  else if (cost < 0) faults.push(`a replacement cost of ${cost}`);

  const missingControls = COST_CONTROLS.filter((k) => {
    const v = raw[k];
    return v === undefined || v === null || String(v).trim() === "";
  });
  if (missingControls.length) {
    faults.push(`the replacement cost is missing ${missingControls.join(", ")}. Without a price base date, a currency, a basis and a source it cannot be escalated, and a lifecycle model that does not escalate is a model of a building in a world with no inflation.`);
  }
  if (raw.priceBaseDate && moment(raw.priceBaseDate) === null) {
    faults.push(`the price base date "${raw.priceBaseDate}" is not a date`);
  }

  const firstAt = num(raw.firstReplacementYear);
  if (firstAt === null || firstAt <= 0) faults.push("no year of first replacement");
  if (life !== null && firstAt !== null && firstAt > life) {
    faults.push(`an expected life of ${life} years and a first replacement in year ${firstAt}. That is a plan to run it ${firstAt - life} year(s) past its life, and nobody decided it — it is an arithmetic slip in a column nobody rereads.`);
  }

  // How many times in the period, counted rather than divided.
  let occurrences = [];
  if (firstAt !== null && cycle !== null && cycle > 0) {
    for (let y = firstAt; y <= periodYears; y += cycle) occurrences.push(y);
  }
  const naive = cycle !== null && cycle > 0 ? Math.floor(periodYears / cycle) : null;
  if (naive !== null && occurrences.length && naive !== occurrences.length) {
    // Not a fault — a note. Dividing the period by the cycle is the shortcut
    // everybody takes and it is off by one about half the time.
  }

  const warranty = raw.warrantyTo ? moment(raw.warrantyTo) : null;
  const notes = [];
  if (warranty !== null && firstAt !== null) {
    const replaceAt = at + firstAt * 365.25 * 86400000;
    if (warranty > replaceAt) {
      notes.push(`the warranty runs to ${day(warranty)}, past the first replacement in year ${firstAt}. Money on an asset that will not be there.`);
    }
  }
  const sparesShelf = num(raw.sparesShelfLifeYears);
  if (sparesShelf !== null && firstAt !== null && sparesShelf > firstAt) {
    notes.push(`spares are held with a ${sparesShelf}-year shelf life against a first replacement in year ${firstAt}`);
  }

  const total = cost !== null ? Math.round(cost * occurrences.length * 100) / 100 : null;
  return {
    ok: faults.length === 0,
    faults,
    notes,
    row: {
      tag: tag || null,
      expectedLifeYears: life,
      replacementCycleYears: cycle,
      firstReplacementYear: firstAt,
      replacementCost: cost,
      currency: raw.currency ? String(raw.currency).toUpperCase() : null,
      priceBaseDate: raw.priceBaseDate ? day(moment(raw.priceBaseDate)) : null,
      basis: raw.basis ? String(raw.basis) : null,
      source: raw.source ? String(raw.source) : null,
      occurrences,
      replacements: occurrences.length,
      // The shortcut, alongside the count, so the difference is visible.
      naiveReplacements: naive,
      undiscountedTotal: total,
    },
  };
}

/** The plan. */
export function plan({ lines = [], periodYears = DEFAULT_PERIOD_YEARS, asAt = null } = {}) {
  const at = asAtOr(asAt);
  const checked = lines.map((l) => ({ ...lifecycleLine(l, { periodYears, asAt: at }), given: l }));
  const good = checked.filter((c) => c.ok).map((c) => c.row);
  const rejected = checked.filter((c) => !c.ok).map((c) => ({ tag: c.given?.tag || null, faults: c.faults }));
  const notes = checked.flatMap((c) => c.notes.map((n) => ({ tag: c.given?.tag || null, note: n })));

  const byYear = new Map();
  for (const r of good) {
    for (const y of r.occurrences) {
      byYear.set(y, Math.round(((byYear.get(y) || 0) + (r.replacementCost || 0)) * 100) / 100);
    }
  }
  const profile = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, cost]) => ({ year, cost }));
  const total = profile.reduce((t, p) => t + p.cost, 0);
  const peak = profile.reduce((m, p) => (m === null || p.cost > m.cost ? p : m), null);
  const offByOne = good.filter((r) => r.naiveReplacements !== null && r.naiveReplacements !== r.replacements);

  const currencies = [...new Set(good.map((r) => r.currency).filter(Boolean))];
  const baseDates = [...new Set(good.map((r) => r.priceBaseDate).filter(Boolean))];

  return {
    ok: rejected.length === 0,
    asAt: day(at),
    periodYears,
    lines: good,
    rejected,
    notes,
    profile,
    undiscountedTotal: Math.round(total * 100) / 100,
    peakYear: peak,
    // A total across two currencies or two price base dates is a number with
    // no meaning, and it is the number that goes into a sinking fund.
    comparable: currencies.length <= 1 && baseDates.length <= 1,
    currencies, baseDates,
    say: [
      rejected.length ? `${rejected.length} line(s) are not admissible and are not in the profile.` : null,
      currencies.length > 1 ? `The lines are priced in ${currencies.join(" and ")}. A total across two currencies is a number with no meaning, and it is the number that goes into a sinking fund.` : null,
      baseDates.length > 1 ? `The lines carry ${baseDates.length} different price base dates (${baseDates.join(", ")}), so they cannot be added until they are brought to one.` : null,
      offByOne.length ? `${offByOne.length} line(s) are replaced a different number of times from what dividing the period by the cycle suggests. That shortcut is off by one about half the time, and the extra replacement is the one somebody budgets for.` : null,
      `${good.length} asset(s) over ${periodYears} years: ${Math.round(total * 100) / 100} undiscounted${peak ? `, peaking in year ${peak.year} at ${peak.cost}` : ""}.`,
      notes.length ? `${notes.length} note(s) about money spent on assets that will not be there.` : null,
    ].filter(Boolean).join(" "),
  };
}

export function state() { return { costControls: COST_CONTROLS.length, defaultPeriod: DEFAULT_PERIOD_YEARS }; }
