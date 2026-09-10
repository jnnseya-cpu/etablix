/**
 * The valuation check — Agent 5's issue gate, and the one with money in it.
 *
 *   node backend/test/controlcheck.test.mjs
 *
 * WHY THIS IS ARITHMETIC AND NOT AN INSTRUCTION. Under Model 02 the client
 * contracts directly with every supplier and pays them directly; ETABLIX
 * never holds their money. So the monthly output is a RECOMMENDATION that
 * somebody else acts on, and a recommendation is trusted exactly as far as it
 * can be checked.
 *
 * Four failures, all silent:
 *
 *   · money recommended against a control account nobody measured
 *   · money recommended in excess of what that account earned, which is the
 *     one nobody notices because the number looks reasonable and the total
 *     adds up
 *   · a figure that cannot be added, so the line was never valued
 *   · a payment with no statutory dates, or dates in the wrong order — and
 *     under Part II of the Housing Grants, Construction and Regeneration Act
 *     1996 a missed payment notice makes the sum APPLIED FOR payable in full
 */
import { money, isDate, refsIn, reconcilePaymentsToEarned, controlNotes, controlStatement, EARNED_COLUMNS, PAYMENT_COLUMNS } from "../lib/controlcheck.js";
import { TERMS } from "../lib/paymentdates.js";

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== the valuation check ===\n");

console.log("--- reading a figure\n");
{
  const cases = [
    ["£410,000", 410000], ["410000", 410000], ["410000.00", 410000], ["£1,200.50", 1200.5],
    ["(1,200.50)", -1200.5], ["-", 0], ["nil", 0], ["NONE", 0], ["0", 0],
    ["1.2m", null], ["as previously", null], ["see application", null], ["TBC", null], ["", null],
    ["£", null], ["12.345", null],
    // Thousands separators are validated rather than stripped. "12,3" is a
    // typo, and reading it as 123 would be a silent misread of money in a
    // table whose whole purpose is to be added up.
    ["12,3", null], ["1,2345", null], ["1,234,567", 1234567], ["£1,234,567.89", 1234567.89], [",123", null], ["1,", null],
  ];
  for (const [v, want] of cases) ok(money(v) === want, `"${v || "(blank)"}" → ${want}`, money(v));
  ok(money("(1,200.50)") < 0, "a bracketed figure is negative, as an accountant writes it");
  ok(money("nil") === 0, "and nil is an explicit zero, which is a valid recommendation — not a missing one");
}

console.log("\n--- references\n");
ok(refsIn("CA-1 and CA-07 and CA-7").join(",") === "CA-1,CA-7", "CA-07 and CA-7 are one account, not two");
ok(refsIn("CANADA-1 CA1 xCA-1").length === 0, "and nothing that merely looks like one is picked up", refsIn("CANADA-1 CA1 xCA-1"));

const earnedTable = (rows) => `| ${EARNED_COLUMNS.join(" | ")} |\n|${EARNED_COLUMNS.map(() => "---").join("|")}|\n${rows.join("\n")}`;
const payTable = (rows) => `| ${PAYMENT_COLUMNS.join(" | ")} |\n|${PAYMENT_COLUMNS.map(() => "---").join("|")}|\n${rows.join("\n")}`;
const DATES = "2026-10-15 | 2026-10-29 | 2026-10-22";

console.log("\n--- a valuation that reconciles\n");
{
  const e = earnedTable([
    "| CA-1 | Compound civils | £900,000 | £120,000 | £477,000 | 0.98 | 1.02 |",
    "| CA-2 | Welfare hire | £600,000 | £45,000 | £168,000 | 1.00 | 0.98 |",
  ]);
  const p = payTable([
    `| 1 | Supplier A | CA-1 | £120,000 | ${DATES} |`,
    `| 2 | Supplier B | CA-2 | £45,000 | ${DATES} |`,
  ]);
  const r = reconcilePaymentsToEarned(e, p);
  ok(r.ok === true, "it passes", r);
  ok(r.accounts === 2 && r.payments === 2, "two accounts, two payments");
  ok(r.totalEarned === 165000 && r.totalRecommended === 165000, "and the totals agree", [r.totalEarned, r.totalRecommended]);
  ok(controlNotes(r).length === 0, "producing no notes — run notes are an exception report", controlNotes(r));
  const st = controlStatement(r);
  ok(/This valuation reconciles/.test(st), "the certificate says so");
  ok(/says nothing about whether the measurement itself is right/.test(st),
     "and says what it does NOT check, so a green table is not read as a surveyor's opinion");
  ok(/Housing Grants, Construction and Regeneration Act 1996/.test(st), "naming the Act the dates come from");
}

console.log("\n--- money in excess of the value earned\n");
{
  const e = earnedTable(["| CA-1 | Welfare hire | £600,000 | £45,000 | £168,000 | 1.00 | 0.98 |"]);
  const p = payTable([`| 1 | Supplier B | CA-1 | £52,000 | ${DATES} |`]);
  const r = reconcilePaymentsToEarned(e, p);
  ok(r.ok === false, "does not pass");
  ok(r.overpaid.length === 1 && r.overpaid[0].excess === 7000, "the excess is quantified to the penny", r.overpaid);
  const n = controlNotes(r);
  ok(n.some((x) => /EXCEED the value earned/.test(x)), "and named");
  ok(n.some((x) => /recovered by set-off if the supplier is solvent and not at all if they are not/.test(x)),
     "with the consequence stated in the terms that make somebody act", n);
  ok(/must not be issued as it stands/.test(controlStatement(r)), "the certificate refuses it");
}
{
  // Several payments against one account are summed. One at a time each looks
  // fine; together they over-certify, and that is how it actually happens.
  const e = earnedTable(["| CA-1 | Compound civils | £900,000 | £100,000 | £400,000 | 1.00 | 1.00 |"]);
  const p = payTable([
    `| 1 | Supplier A | CA-1 | £60,000 | ${DATES} |`,
    `| 2 | Supplier A retention release | CA-1 | £55,000 | ${DATES} |`,
  ]);
  const r = reconcilePaymentsToEarned(e, p);
  ok(r.overpaid.length === 1, "two payments against one account are added before the test", r.overpaid);
  ok(r.overpaid[0].excess === 15000, "and the total excess found", r.overpaid);
}

console.log("\n--- money against nothing\n");
{
  const e = earnedTable(["| CA-1 | Compound civils | £900,000 | £120,000 | £477,000 | 0.98 | 1.02 |"]);
  const p = payTable([
    `| 1 | Supplier A | CA-1 | £120,000 | ${DATES} |`,
    `| 2 | Supplier C | CA-9 | £8,000 | ${DATES} |`,
  ]);
  const r = reconcilePaymentsToEarned(e, p);
  ok(r.unbacked.length === 1 && r.unbacked[0].ref === "CA-9", "the unmeasured account is named", r.unbacked);
  ok(r.totalRecommended === 120000, "and an unbacked payment is not counted as recommended against measured work");
  const n = controlNotes(r);
  ok(n.some((x) => /money recommended against work nobody measured/.test(x)), "the note says what it is");
  ok(n.some((x) => /The two have opposite fixes/.test(x)),
     "and gives both readings, because a missing table row and a baseless payment are different problems", n);
}

console.log("\n--- the statutory dates\n");
{
  const e = earnedTable(["| CA-1 | Compound civils | £900,000 | £120,000 | £477,000 | 1.00 | 1.00 |"]);
  const bad = [
    ["TBC | 2026-10-29 | 2026-10-22", /due date "TBC"/, "a due date that is not a date"],
    ["2026-10-15 | as per contract | 2026-10-22", /final date "as per contract"/, "a final date that is a description"],
    ["2026-10-29 | 2026-10-15 | 2026-10-08", /final date for payment is not after the due date/, "a final date before the due date"],
    ["2026-10-15 | 2026-10-29 | 2026-11-05", /pay-less deadline is not before the final date/, "a pay-less deadline after the final date"],
    ["2026-10-15 | 2026-10-29 | 2026-10-25", new RegExp(`not the ${TERMS.payLessBeforeFinal} the contract requires`), "a pay-less deadline too close to the final date"],
  ];
  for (const [dates, re, what] of bad) {
    const r = reconcilePaymentsToEarned(e, payTable([`| 1 | Supplier A | CA-1 | £120,000 | ${dates} |`]));
    ok(r.undated.length === 1 && r.undated[0].problems.some((x) => re.test(x)), what, r.undated);
    ok(r.ok === false, `and it stops the report (${what})`);
  }
  const n = controlNotes(reconcilePaymentsToEarned(e, payTable([`| 1 | Supplier A | CA-1 | £120,000 | TBC | 2026-10-29 | 2026-10-22 |`])));
  ok(n.some((x) => /sum APPLIED FOR payable/.test(x)), "the note says what a missed notice costs", n);
}

console.log("\n--- an unreadable figure does not hide a date fault\n");
{
  // Both are faults on the same row, and the date check used to run after a
  // `continue` — so fixing the amount revealed the date problem only on the
  // NEXT run, a month later.
  const e = earnedTable(["| CA-1 | Compound civils | £900,000 | £120,000 | £477,000 | 1.00 | 1.00 |"]);
  const r = reconcilePaymentsToEarned(e, payTable([`| 1 | Supplier A | CA-1 | as previously | TBC | 2026-10-29 | 2026-10-22 |`]));
  ok(r.unquantified.length === 1, "the unreadable figure is reported", r.unquantified);
  ok(r.undated.length === 1, "AND the date fault on the same row is reported", r.undated);
  ok(controlNotes(r).length >= 2, "as two notes, not one", controlNotes(r).length);
}

console.log("\n--- earned and not paid is a decision, not a failure\n");
{
  const e = earnedTable([
    "| CA-1 | Compound civils | £900,000 | £120,000 | £477,000 | 1.00 | 1.00 |",
    "| CA-2 | Security | £120,000 | £15,000 | £40,000 | 1.00 | 1.00 |",
    "| CA-3 | Temporary power | £300,000 | £0 | £90,000 | 1.00 | 1.00 |",
  ]);
  const r = reconcilePaymentsToEarned(e, payTable([`| 1 | Supplier A | CA-1 | £120,000 | ${DATES} |`]));
  ok(r.ok === true, "it still passes — an account can be measured this period and paid the next");
  ok(r.unpaid.length === 1 && r.unpaid[0].ref === "CA-2", "the account earned and not recommended is named", r.unpaid);
  ok(!r.unpaid.some((u) => u.ref === "CA-3"), "an account that earned nothing is not listed — there is nothing to explain");
  const n = controlNotes(r);
  ok(n.length === 1 && /NOT in the payment recommendations/.test(n[0]), "one note, and it is informational", n);
  ok(/That may be right/.test(n[0]), "phrased as a decision to confirm rather than a defect");
  ok(/becomes payable in full/.test(n[0]), "with the cost of leaving it unexplained");
}

console.log("\n--- several tables, and a report written to no convention\n");
{
  const e =
    earnedTable(["| CA-1 | Compound civils | £900,000 | £120,000 | £477,000 | 1.00 | 1.00 |"]) +
    "\n\n#### Package 2\n\n" +
    earnedTable(["| CA-2 | Welfare | £600,000 | £45,000 | £168,000 | 1.00 | 1.00 |"]);
  const r = reconcilePaymentsToEarned(e, payTable([`| 1 | B | CA-2 | £45,000 | ${DATES} |`]));
  ok(r.accounts === 2, "both earned-value tables are read", r.accounts);
  ok(r.ok === true, "and a payment against the second table's account is backed");
}
{
  const r = reconcilePaymentsToEarned("No references here.", "None here either.");
  ok(r.referenced === false && r.ok === false, "an unreferenced report is not a clean result");
  const n = controlNotes(r);
  ok(n.length === 1 && /COULD NOT BE CHECKED/.test(n[0]), "one note saying the check could not run", n);
  ok(/Do not issue this valuation/.test(n[0]), "and not to issue it");
  ok(/has not passed the payment check/.test(controlStatement(r)), "the certificate says so too");
}

console.log("\n--- the date test is the one the bid check uses\n");
ok(isDate("2026-10-15") && !isDate("TBC"),
   "shared rather than copied, so the hyphen bug found there stays fixed here");

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
