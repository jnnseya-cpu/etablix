/**
 * Working days, and the ten-day promise.
 *
 * The diagnostic is sold as ten working days from information handover.
 * That number is the product as much as the twelve deliverables are: a
 * client who is told ten days and gets it on day fourteen has been told
 * something untrue, and a client who gets it on day six learns that the
 * ten days were padding. So the date is computed once from the handover
 * and then held — the report waits for its date rather than going the
 * moment it happens to be finished.
 *
 * Ten working days means ten, not fourteen calendar days: weekends and
 * England & Wales bank holidays are excluded, because those are the days
 * the client's own team is not reading it either.
 *
 * Bank holidays are a table rather than a calculation. Easter moves, the
 * substitute days depend on which weekday Christmas lands on, and the
 * government occasionally adds one for a coronation — none of which is
 * derivable. When a date falls in a year the table does not cover, the
 * arithmetic falls back to weekends only and SAYS SO, so a promise is
 * never made on a silently wrong count.
 *
 * To extend: add the year from https://www.gov.uk/bank-holidays
 * (England and Wales), and add the year to COVERED_YEARS.
 */

/** England & Wales bank holidays, as published by gov.uk. */
const BANK_HOLIDAYS = {
  2026: [
    "2026-01-01", // New Year's Day
    "2026-04-03", // Good Friday
    "2026-04-06", // Easter Monday
    "2026-05-04", // Early May bank holiday
    "2026-05-25", // Spring bank holiday
    "2026-08-31", // Summer bank holiday
    "2026-12-25", // Christmas Day
    "2026-12-28", // Boxing Day (substitute — 26 Dec is a Saturday)
  ],
  2027: [
    "2027-01-01", // New Year's Day
    "2027-03-26", // Good Friday
    "2027-03-29", // Easter Monday
    "2027-05-03", // Early May bank holiday
    "2027-05-31", // Spring bank holiday
    "2027-08-30", // Summer bank holiday
    "2027-12-27", // Christmas Day (substitute — 25 Dec is a Saturday)
    "2027-12-28", // Boxing Day (substitute)
  ],
  2028: [
    "2028-01-03", // New Year's Day (substitute — 1 Jan is a Saturday)
    "2028-04-14", // Good Friday
    "2028-04-17", // Easter Monday
    "2028-05-01", // Early May bank holiday
    "2028-05-29", // Spring bank holiday
    "2028-08-28", // Summer bank holiday
    "2028-12-25", // Christmas Day
    "2028-12-26", // Boxing Day
  ],
};

export const COVERED_YEARS = Object.keys(BANK_HOLIDAYS).map(Number);
const HOLIDAYS = new Set(Object.values(BANK_HOLIDAYS).flat());

/** YYYY-MM-DD, in UTC, with no timezone drift on the way through. */
export const iso = (d) => new Date(d).toISOString().slice(0, 10);

const parse = (v) => {
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isHoliday = (d) => HOLIDAYS.has(iso(d));
const isWeekend = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/** A day the client's team is at work. */
export const isWorkingDay = (v) => {
  const d = parse(v);
  return d ? !isWeekend(d) && !isHoliday(d) : false;
};

/** True when the whole span sits inside years the holiday table covers. */
export const holidaysKnown = (from, to) => {
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return false;
  for (let y = a.getUTCFullYear(); y <= b.getUTCFullYear(); y += 1) {
    if (!BANK_HOLIDAYS[y]) return false;
  }
  return true;
};

/**
 * The date n working days after `from`, counting the day after handover
 * as day one. Handover on a Friday means day one is the Monday: nobody
 * starts work on the afternoon they receive the documents.
 */
export function addWorkingDays(from, n) {
  const d = parse(from);
  if (!d || !Number.isFinite(n)) return null;
  let left = Math.max(0, Math.trunc(n));
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekend(d) && !isHoliday(d)) left -= 1;
  }
  return iso(d);
}

/**
 * Working days from `a` to `b`, signed. Negative when b is before a, so
 * "three days early" and "three days late" are the same arithmetic.
 */
export function workingDaysBetween(a, b) {
  const from = parse(a);
  const to = parse(b);
  if (!from || !to) return null;
  const back = to < from;
  const [s, e] = back ? [to, from] : [from, to];
  let n = 0;
  const cur = new Date(s);
  while (cur < e) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (!isWeekend(cur) && !isHoliday(cur)) n += 1;
  }
  return back ? -n : n;
}

/** The promise, in one place. */
export const DIAGNOSTIC_WORKING_DAYS = 10;

/**
 * Where a diagnostic stands against its promised date.
 *
 * Three states, because there are three different mistakes: sending it
 * before the date agreed, sending it after, and the ordinary case of
 * holding a finished report until the day it was promised.
 */
export function releaseStatus(dueDate, today = iso(new Date())) {
  if (!dueDate) {
    return { state: "unset", label: "No handover date recorded", detail: "Record the information handover date and the issue date follows from it.", severity: "warning" };
  }
  const days = workingDaysBetween(today, dueDate);
  if (days === null) return { state: "unset", label: "Issue date not understood", detail: "", severity: "warning" };
  if (days > 0) {
    return {
      state: "held",
      days,
      label: `Hold until ${human(dueDate)}`,
      detail: `${days} working day${days === 1 ? "" : "s"} to go. The engagement was sold as ${DIAGNOSTIC_WORKING_DAYS} working days; issuing early tells the client the ${DIAGNOSTIC_WORKING_DAYS} days were padding.`,
      severity: "warning",
    };
  }
  if (days === 0) {
    return { state: "due", days: 0, label: `Issue today — ${human(dueDate)}`, detail: "This is the date the client was promised. Send it.", severity: "ok" };
  }
  const late = -days;
  return {
    state: "overdue",
    days: late,
    label: `Overdue by ${late} working day${late === 1 ? "" : "s"}`,
    detail: `Promised ${human(dueDate)}. Send it today and tell the client why it slipped — a late report that explains itself costs less than a late report that arrives quietly.`,
    severity: "alert",
  };
}

/** "21 September 2026" — the form a client reads, not an ISO string. */
export function human(v) {
  const d = parse(v);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
}

/**
 * The dates for one diagnostic engagement, derived from the handover.
 * `assured` is false when the span leaves the years the holiday table
 * covers — the count is then weekends-only and must be checked by hand.
 */
export function diagnosticDates(handover, days = DIAGNOSTIC_WORKING_DAYS) {
  if (!parse(handover)) return null;
  const due = addWorkingDays(handover, days);
  return {
    handover: iso(parse(handover)),
    due,
    days,
    assured: holidaysKnown(handover, due),
  };
}
