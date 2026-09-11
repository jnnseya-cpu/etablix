/**
 * A machine-supplied instant: epoch milliseconds or an ISO string.
 *
 * THIS EXISTS BECAUSE THE SAME BUG APPEARED FOR THE FOURTH TIME.
 *
 * `instant()` in the evidence layer is deliberately strict: it refuses
 * "annual", refuses 31 February and refuses a bare number, because a mistyped
 * quantity read as a date is a deadline computed from nothing. That is the
 * right reader for a date a PERSON typed.
 *
 * It is the wrong reader for a date the machine already holds. The contract
 * watch hit this three times and named the helper there. The audit programme
 * hit it a fourth: `programme()` resolved its own `asAt` to epoch milliseconds
 * and then passed that number down to `findingRecord()`, which put it back
 * through the strict reader, got null, and silently reported that no finding
 * was overdue. A finding open for 189 days against a 60-day limit came back
 * clean, with no error anywhere.
 *
 * Four occurrences is a boundary in the wrong place rather than four careless
 * call sites. So it is named once, here, and every engine that passes a
 * moment to another engine uses it.
 */

import { instant } from "../l7/evidence.js";

export function moment(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  return instant(value);
}

/** The same, defaulting to now — what an `asAt` almost always wants. */
export const asAtOr = (value) => moment(value, Date.now()) ?? Date.now();

/** A day string from any of the above. */
export const day = (value) => {
  const t = moment(value);
  return t === null ? null : new Date(t).toISOString().slice(0, 10);
};
