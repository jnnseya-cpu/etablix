/**
 * THE PRODUCTIVITY AGENT — output measured against what was priced.
 *
 * The register's line: "the only honest early warning on a cost overrun."
 * That is not rhetoric about measurement culture. It is about WHEN the news
 * arrives. A cost overrun shows in the cost report when the invoices land,
 * which on a labour-heavy package is four to eight weeks after the work went
 * slowly — and by then the remaining work is priced on the same assumption
 * that has already failed.
 *
 * Output per hour is measurable the week it happens.
 *
 * THE ARITHMETIC IS THE POINT AND IT IS SHORT. Priced output was so many
 * units per hour. Achieved output is units done over hours booked. The ratio
 * is the productivity factor, and applying it to the work remaining gives
 * the forecast. What earns this engine its place is not the sum but the
 * refusals around it, because every one of them is a way the sum quietly
 * produces a comforting answer:
 *
 *   · UNITS WITH NO HOURS, OR HOURS WITH NO UNITS. Either alone makes a
 *     factor of infinity or zero. A week where the timesheets came in and
 *     the measure did not is not a good week.
 *   · A CONTROL ACCOUNT THAT IS NOT IN THE BUDGET. Output measured against
 *     nothing priced cannot be compared with anything, and the row will
 *     still appear in a table headed "productivity against budget".
 *   · PROGRESS CLAIMED WITH NO HOURS BOOKED. Free work has not happened.
 *   · MORE UNITS COMPLETE THAN THE ACCOUNT CONTAINS. The commonest cause is
 *     double-counting between two accounts, and it inflates the factor on
 *     one and deflates it on the other.
 *   · A UNIT THAT CHANGED between the budget and the measure. Square metres
 *     priced and linear metres measured is a factor of roughly nothing,
 *     reported to two decimal places.
 */

import { num } from "../l7/num.js";
import { instant } from "../l7/evidence.js";
import { asAtOr, day } from "./moment.js";

/** Below this the account is losing money on labour; above it, gaining. */
export const FACTOR_ALERT = 0.9;

/**
 * One measured period against one control account.
 *
 * `account` comes from the budget: { id, unit, quantity, hours, rate }.
 * A missing account is a refusal, not a zero.
 */
export function measured(raw = {}, { accounts = [] } = {}) {
  const faults = [];
  const accountId = String(raw.controlAccount || "").trim();
  if (!accountId) faults.push("no control account");
  const account = accounts.find((a) => String(a.id) === accountId) || null;
  if (accountId && !account) {
    faults.push(`control account "${accountId}" is not in the budget. Output measured against nothing priced cannot be compared with anything, and the row would still appear in a table headed "productivity against budget".`);
  }

  const from = raw.from ? instant(raw.from) : null;
  const to = raw.to ? instant(raw.to) : null;
  if (!raw.from || from === null) faults.push(`the period start "${raw.from}" is not a date`);
  if (!raw.to || to === null) faults.push(`the period end "${raw.to}" is not a date`);
  if (from !== null && to !== null && to < from) faults.push("the period ends before it starts");

  const units = num(raw.units);
  const hours = num(raw.hours);
  if (units === null) faults.push("no units measured. Hours with no measure is not a good week; it is a week nobody measured.");
  if (hours === null) faults.push("no hours booked. Units with no hours makes a factor of infinity.");
  if (units !== null && units < 0) faults.push(`${units} units`);
  if (hours !== null && hours < 0) faults.push(`${hours} hours`);
  if (units !== null && units > 0 && hours === 0) {
    faults.push(`${units} unit(s) complete with no hours booked. Free work has not happened.`);
  }

  const unit = String(raw.unit || "").trim();
  if (!unit) faults.push("no unit");
  else if (account && account.unit && String(account.unit) !== unit) {
    faults.push(`measured in ${unit} against an account priced in ${account.unit}. Square metres priced and linear metres measured is a factor of roughly nothing, reported to two decimal places.`);
  }

  const cumulative = num(raw.cumulativeUnits);
  if (account && cumulative !== null) {
    const budgeted = num(account.quantity);
    if (budgeted !== null && cumulative > budgeted + 0.0001) {
      faults.push(`${cumulative} ${unit} complete against ${budgeted} in the account. The commonest cause is double-counting between two accounts, which inflates the factor on one and deflates it on the other.`);
    }
  }

  return {
    ok: faults.length === 0,
    faults,
    row: {
      controlAccount: accountId || null,
      from: from === null ? null : day(from),
      to: to === null ? null : day(to),
      units, hours, unit: unit || null,
      cumulativeUnits: cumulative,
      crew: raw.crew ? String(raw.crew) : null,
      source: raw.source ? String(raw.source) : null,
    },
    account,
  };
}

/**
 * The factor per account, and what it forecasts.
 *
 * The forecast applies the ACHIEVED factor to the work remaining rather than
 * the priced factor, which is the only assumption in this module and it is
 * stated as one: if the last four weeks are representative, this is what the
 * rest costs. Where they are not representative — a learning curve, a change
 * of face, winter — the person reading it knows and this engine does not.
 */
export function analyse({ records = [], accounts = [], asAt = null } = {}) {
  const checked = records.map((r) => ({ ...measured(r, { accounts }), given: r }));
  const good = checked.filter((c) => c.ok);
  const rejected = checked.filter((c) => !c.ok).map((c) => ({
    controlAccount: c.given?.controlAccount || null, from: c.given?.from || null, faults: c.faults,
  }));

  const byAccount = new Map();
  for (const c of good) {
    const k = c.row.controlAccount;
    if (!byAccount.has(k)) byAccount.set(k, { account: c.account, rows: [] });
    byAccount.get(k).rows.push(c.row);
  }

  const rows = [];
  for (const [id, { account, rows: recs }] of byAccount) {
    const units = recs.reduce((t, r) => t + r.units, 0);
    const hours = recs.reduce((t, r) => t + r.hours, 0);
    const budgetQty = num(account?.quantity);
    const budgetHours = num(account?.hours);
    const pricedPerHour = budgetQty !== null && budgetHours !== null && budgetHours > 0 ? budgetQty / budgetHours : null;
    const achievedPerHour = hours > 0 ? units / hours : null;
    const factor = pricedPerHour !== null && achievedPerHour !== null && pricedPerHour > 0
      ? Math.round((achievedPerHour / pricedPerHour) * 1000) / 1000
      : null;

    const cumulative = recs.reduce((m, r) => (r.cumulativeUnits !== null && (m === null || r.cumulativeUnits > m) ? r.cumulativeUnits : m), null);
    const done = cumulative !== null ? cumulative : units;
    const remainingUnits = budgetQty !== null ? Math.max(0, budgetQty - done) : null;
    const forecastHours = remainingUnits !== null && achievedPerHour !== null && achievedPerHour > 0
      ? Math.round(hours + remainingUnits / achievedPerHour)
      : null;
    const varianceHours = forecastHours !== null && budgetHours !== null ? forecastHours - budgetHours : null;
    const rate = num(account?.rate);
    const varianceCost = varianceHours !== null && rate !== null ? Math.round(varianceHours * rate * 100) / 100 : null;

    rows.push({
      controlAccount: id,
      unit: account?.unit || recs[0]?.unit || null,
      unitsMeasured: units, hoursBooked: hours,
      budgetQuantity: budgetQty, budgetHours, rate,
      pricedPerHour: pricedPerHour === null ? null : Math.round(pricedPerHour * 1000) / 1000,
      achievedPerHour: achievedPerHour === null ? null : Math.round(achievedPerHour * 1000) / 1000,
      factor,
      percentComplete: budgetQty ? Math.round((done / budgetQty) * 100) : null,
      remainingUnits, forecastHours, varianceHours, varianceCost,
      // Not a verdict. A factor under one on a week of enabling works is
      // normal; the same factor in week twelve is the job.
      reading: factor === null
        ? "no factor — the account is priced without hours, so there is nothing to measure against"
        : factor >= 1
          ? `${factor} — ahead of the priced output`
          : factor >= FACTOR_ALERT
            ? `${factor} — behind the priced output, inside the working tolerance`
            : `${factor} — behind the priced output beyond tolerance`,
      alert: factor !== null && factor < FACTOR_ALERT,
    });
  }

  const measurable = rows.filter((r) => r.factor !== null);
  const behind = measurable.filter((r) => r.alert);
  const overrun = rows.reduce((t, r) => t + (r.varianceCost !== null && r.varianceCost > 0 ? r.varianceCost : 0), 0);

  // Accounts with budgeted hours and no measurement at all. These are the
  // ones a productivity report never mentions, because a report built from
  // the records it has cannot see the records it does not.
  const unmeasured = accounts
    .filter((a) => num(a.hours) !== null && !byAccount.has(String(a.id)))
    .map((a) => String(a.id));

  return {
    ok: rejected.length === 0,
    asAt: day(asAtOr(asAt)),
    rows: rows.sort((a, b) => (a.factor ?? 9) - (b.factor ?? 9)),
    rejected,
    unmeasured,
    forecastOverrun: Math.round(overrun * 100) / 100,
    say: [
      rejected.length ? `${rejected.length} record(s) are not measurable as written and are excluded — the factors below are computed without them.` : null,
      unmeasured.length ? `${unmeasured.length} account(s) with budgeted hours have no measurement at all: ${unmeasured.join(", ")}. A productivity report cannot see the records it does not have, so they are named.` : null,
      behind.length
        ? `${behind.length} of ${measurable.length} measured account(s) are behind the priced output beyond tolerance: ${behind.map((r) => `${r.controlAccount} at ${r.factor}`).join(", ")}.`
        : measurable.length ? `All ${measurable.length} measured account(s) are at or near the priced output.` : "Nothing is measurable yet.",
      overrun > 0 ? `If the measured output is representative of the work remaining, the forecast overrun on labour is ${Math.round(overrun * 100) / 100}. That is an assumption, stated as one: a learning curve, a change of working face or winter all make it wrong, and this engine cannot tell which applies.` : null,
    ].filter(Boolean).join(" "),
  };
}

export function state() {
  return { factorAlert: FACTOR_ALERT, refusals: 6 };
}
