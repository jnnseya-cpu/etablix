/**
 * The ten-day promise is arithmetic a client can check, so it is
 * arithmetic that gets checked here.
 *
 * The bank-holiday table these lean on was verified independently: Easter
 * by the anonymous Gregorian computus, the May and August dates by the
 * first/last-Monday rules, and the Christmas and New Year substitutes by
 * the weekday each falls on. Run: node backend/test/workingdays.test.mjs
 */
import {
  addWorkingDays, workingDaysBetween, isWorkingDay, diagnosticDates,
  releaseStatus, human, holidaysKnown,
} from "../lib/workingdays.js";

let bad = 0;
const eq = (name, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) bad += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name.padEnd(48)}${got}${ok ? "" : `   expected ${want}`}`);
};

// Ten working days from a Monday is the Monday a fortnight later.
eq("Mon 2026-09-07 + 10", addWorkingDays("2026-09-07", 10), "2026-09-21");
// Handover on a Friday: day one is the Monday, not that afternoon.
eq("Fri 2026-09-04 + 10", addWorkingDays("2026-09-04", 10), "2026-09-18");
// August bank holiday pushes the date out by one.
eq("Mon 2026-08-17 + 10 (Aug BH)", addWorkingDays("2026-08-17", 10), "2026-09-01");
// Christmas Day (Fri) and the Boxing Day substitute (Mon 28th).
eq("Mon 2026-12-14 + 10 (Christmas)", addWorkingDays("2026-12-14", 10), "2026-12-30");
// Christmas plus New Year's Day on the Friday: three holidays in the span.
eq("Mon 2026-12-21 + 10 (New Year)", addWorkingDays("2026-12-21", 10), "2027-01-07");
// Good Friday 26 Mar and Easter Monday 29 Mar 2027.
eq("Mon 2027-03-15 + 10 (Easter)", addWorkingDays("2027-03-15", 10), "2027-03-31");
// 1 Jan 2028 is a Saturday, so the holiday moves to Monday the 3rd.
eq("Mon 2027-12-20 + 10 (2028 sub)", addWorkingDays("2027-12-20", 10), "2028-01-06");

eq("Saturday is not a working day", isWorkingDay("2026-09-05"), "false");
eq("Christmas Day 2026 is not", isWorkingDay("2026-12-25"), "false");
eq("Boxing substitute 28 Dec 2026 is not", isWorkingDay("2026-12-28"), "false");
eq("an ordinary Tuesday is", isWorkingDay("2026-09-08"), "true");

eq("Mon..Fri is four days", workingDaysBetween("2026-09-07", "2026-09-11"), "4");
eq("the count is signed", workingDaysBetween("2026-09-11", "2026-09-07"), "-4");
eq("Fri..Mon is one day", workingDaysBetween("2026-09-04", "2026-09-07"), "1");

eq("engagement due date", diagnosticDates("2026-09-07").due, "2026-09-21");
eq("dates are assured in covered years", diagnosticDates("2026-09-07").assured, "true");
eq("beyond the table, not assured", diagnosticDates("2029-01-08").assured, "false");
eq("holidaysKnown spanning a year end", holidaysKnown("2026-12-21", "2027-01-07"), "true");

eq("before the date: held", releaseStatus("2026-09-21", "2026-09-15").state, "held");
eq("held, four days to go", releaseStatus("2026-09-21", "2026-09-15").days, "4");
eq("on the date: due", releaseStatus("2026-09-21", "2026-09-21").state, "due");
eq("after the date: overdue", releaseStatus("2026-09-21", "2026-09-23").state, "overdue");
eq("overdue by two", releaseStatus("2026-09-21", "2026-09-23").days, "2");
eq("a weekend does not make it overdue", releaseStatus("2026-09-21", "2026-09-19").state, "held");
eq("no handover date", releaseStatus("").state, "unset");
eq("date shown as a client reads it", human("2026-09-21"), "21 September 2026");

// The reason working days are counted at all.
eq("ten working days spans fourteen calendar days",
  (Date.parse("2026-09-21") - Date.parse("2026-09-07")) / 86400000, "14");

console.log(bad ? `\n${bad} FAILURE(S)` : "\nall working-day checks passed");
process.exit(bad ? 1 : 0);
