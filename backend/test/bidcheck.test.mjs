/**
 * The submission-completeness check — Agent 2's issue gate.
 *
 *   node backend/test/bidcheck.test.mjs
 *
 * WHY THIS IS A UNIT TEST AND NOT A PROMPT INSTRUCTION. A bid is scored
 * against a checklist somebody else wrote, and the most expensive way to lose
 * is to be disqualified for an omission rather than beaten on merit. On most
 * public and framework procurements a required deliverable with no response
 * is not a lost mark, it is a non-compliant tender — the whole submission
 * rejected whatever is in the rest of it.
 *
 * Telling a model to be thorough does not stop that. Comparing the two
 * reference sets by machine, on every run, before anybody can approve the
 * bid, does.
 *
 * The date column is checked here too, and the first version of that check
 * had a real bug this suite exists to keep out: it looked for placeholder
 * text anywhere in the cell, and one of the placeholders was a bare hyphen —
 * so "2026-09-15", the most standard way of writing a date there is, was
 * rejected as not a date.
 */
import { isDate, refsIn, reconcileChecklistToResponse, bidNotes, bidStatement, CHECKLIST_COLUMNS } from "../lib/bidcheck.js";

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== the submission check ===\n");

// ------------------------------------------------------------- references
console.log("--- references\n");
ok(refsIn("SUB-1 then SUB-2").join(",") === "SUB-1,SUB-2", "found in order");
ok(refsIn("SUB-04 and SUB-4").join(",") === "SUB-4", "SUB-04 and SUB-4 are one reference, not two");
ok(refsIn("SUB-1, SUB-1, SUB-1").length === 1, "each is counted once");
ok(refsIn("SUBMARINE-1 SUB1 SUB- 1 xSUB-1").length === 0, "and nothing that merely looks like one is picked up", refsIn("SUBMARINE-1 SUB1 SUB- 1 xSUB-1"));
ok(refsIn("").length === 0 && refsIn(null).length === 0, "empty and null are handled");

// ------------------------------------------------------------------ dates
console.log("\n--- what counts as a deadline\n");
{
  // The bug this suite was written around.
  ok(isDate("2026-09-15"), "an ISO date is a date — the hyphens are not a placeholder");
  for (const good of ["15/09/2026", "15.09.2026", "15 September 2026", "15 Sept 2026", "September 15, 2026", "**2026-09-15**", "12:00 on 15 September 2026"]) {
    ok(isDate(good), `"${good}"`);
  }
  for (const bad of ["TBC", "tba", "-", "—", "n/a", "none", "", "   ", "as stated in the ITT", "see ITT section 4", "w/c 15 September 2026", "approx 15 September 2026", "Q4 2026", "to be confirmed", "subject to confirmation, 15 September 2026", "?"]) {
    ok(!isDate(bad), `"${bad || "(blank)"}" is not a deadline`);
  }
}

// --------------------------------------------------------- reconciliation
const checklist = (rows) =>
  `| ${CHECKLIST_COLUMNS.join(" | ")} |\n|${CHECKLIST_COLUMNS.map(() => "---").join("|")}|\n${rows.join("\n")}`;

console.log("\n--- a complete bid\n");
{
  const c = checklist([
    "| SUB-1 | Method statement | RQ-4, ITT 4.2 | PDF | 6 pages | 2026-09-15 |",
    "| SUB-2 | Priced schedule | RQ-9, ITT 5.1 | Client template | none stated | 12:00 on 15 September 2026 |",
    "| SUB-3 | Insurance certificates | RQ-14, ITT 6 | PDF | none stated | 15/09/2026 |",
  ]);
  const r = "### SUB-1 · Method statement\ntext\n### SUB-2 · Priced schedule\ntext\n### SUB-3 · Insurance certificates\ntext";
  const out = reconcileChecklistToResponse(c, r);
  ok(out.ok === true, "reconciles", out);
  ok(out.required === 3 && out.matched === 3, "three required, three answered");
  ok(out.unanswered.length === 0 && out.unasked.length === 0 && out.undated.length === 0, "nothing outstanding");
  ok(bidNotes(out).length === 0, "and produces NO notes — run notes are an exception report", bidNotes(out));
  const st = bidStatement(out);
  ok(/complete against the invitation's own checklist/.test(st), "the certificate says it is complete");
  ok(/says nothing about whether the answers are any good/.test(st),
     "and says what it does NOT check, so a green table is not read as a quality opinion");
}

console.log("\n--- a required deliverable with no response\n");
{
  const c = checklist([
    "| SUB-1 | Method statement | RQ-4 | PDF | 6 pages | 2026-09-15 |",
    "| SUB-2 | Priced schedule | RQ-9 | Excel | none | 2026-09-15 |",
  ]);
  const out = reconcileChecklistToResponse(c, "### SUB-1 · Method statement\ntext");
  ok(out.ok === false, "does not reconcile");
  ok(out.unanswered.join(",") === "SUB-2", "the missing one is named", out.unanswered);
  const n = bidNotes(out);
  ok(n.some((x) => /NO RESPONSE/.test(x)), "the note says what is missing");
  ok(n.some((x) => /non-compliant tender/.test(x)),
     "and what it costs — rejection, not a lost mark, which is the fact that makes somebody act", n);
  ok(/must not be sent as it stands/.test(bidStatement(out)), "the certificate refuses it");
}

console.log("\n--- a response to something nobody asked for\n");
{
  const c = checklist(["| SUB-1 | Method statement | RQ-4 | PDF | 6 pages | 2026-09-15 |"]);
  const out = reconcileChecklistToResponse(c, "### SUB-1\ntext\n### SUB-7 · Social value\ntext");
  ok(out.unasked.join(",") === "SUB-7", "the extra one is named", out.unasked);
  const n = bidNotes(out);
  ok(n.some((x) => /DOES NOT ASK FOR/.test(x)), "and reported");
  ok(n.some((x) => /the two have opposite fixes/.test(x)),
     "with both readings given, because a missed requirement and wasted effort are not the same problem", n);
}

console.log("\n--- a deadline that is not a date\n");
{
  const c = checklist([
    "| SUB-1 | Method statement | RQ-4 | PDF | 6 pages | TBC |",
    "| SUB-2 | Priced schedule | RQ-9 | Excel | none | 2026-09-15 |",
    "| SUB-3 | Parent company guarantee | RQ-20 | PDF | none | - |",
  ]);
  const out = reconcileChecklistToResponse(c, "### SUB-1\nx\n### SUB-2\nx\n### SUB-3\nx");
  ok(out.ok === false, "a fully answered bid with an undated deadline still does not pass");
  ok(out.undated.length === 2, "both undated rows found", out.undated);
  ok(out.undated.map((u) => u.ref).sort().join(",") === "SUB-1,SUB-3", "and named", out.undated.map((u) => u.ref));
  ok(out.undated[0].deliverable === "Method statement", "with the deliverable, so it can be looked up in the invitation");
  const n = bidNotes(out);
  ok(n.some((x) => /not scored at all/.test(x)), "the note says a late bid is not scored", n);
}

console.log("\n--- several tables, and a bid written to no convention at all\n");
{
  // A checklist split by lot or stage has more than one header row, and the
  // first version of the tender pack's equivalent check only found the first.
  const c =
    checklist(["| SUB-1 | Lot 1 method | RQ-4 | PDF | 6 pages | 2026-09-15 |"]) +
    "\n\n#### Lot 2\n\n" +
    checklist(["| SUB-2 | Lot 2 method | RQ-5 | PDF | 6 pages | TBC |"]);
  const out = reconcileChecklistToResponse(c, "### SUB-1\nx\n### SUB-2\nx");
  ok(out.required === 2, "both tables are read", out.required);
  ok(out.undated.map((u) => u.ref).join(",") === "SUB-2", "including the second table's undated row", out.undated);
}
{
  const out = reconcileChecklistToResponse("A checklist with no references at all.", "Responses with none either.");
  ok(out.referenced === false, "an unreferenced bid is not a clean result");
  ok(out.ok === false, "and does not pass");
  const n = bidNotes(out);
  ok(n.length === 1 && /COULD NOT BE CHECKED/.test(n[0]), "one note, saying the check could not run", n);
  ok(/Do not submit on this/.test(n[0]), "and not to submit on it");
  ok(/has not passed the completeness check/.test(bidStatement(out)), "the certificate says so too");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
