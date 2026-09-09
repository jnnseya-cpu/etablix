/**
 * The scope-to-price reconciliation.
 *
 *   node backend/test/tenderpack.test.mjs
 *
 * This is the check that decides whether a tender pack may be issued, so it
 * is tested against the failures it exists to catch rather than against a
 * happy path. Each of the three has a real cost attached and the test names
 * it, because a check whose failure nobody understands gets overridden.
 */
import { reconcileScopeToPrice, refsIn, packNotes, packStatement, UNITS } from "../lib/tenderpack.js";
import { splitPipelineOutput } from "../lib/sections.js";
import { SECTIONS as TP_SECTIONS } from "../lib/pipelines/tender-pack.js";
import { SECTIONS as MR_SECTIONS } from "../lib/pipelines/mobilisation-review.js";

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + JSON.stringify(x).slice(0, 240) : ""))); };

console.log("\n=== the scope-to-price reconciliation ===\n");

const SCOPE = `### Scope sheet — P01 · Compound civils

| Ref | Item | Requirement source | Quantity | Basis |
|---|---|---|---|---|
| SS-P01.1 | Strip and level | SMR §4 | 4,200 | Measured |
| SS-P01.2 | Type 1 sub-base | SMR §4 | 630 | Derived |

### Scope sheet — P02 · Welfare

| Ref | Item | Requirement source | Quantity | Basis |
|---|---|---|---|---|
| SS-P02.1 | Provide welfare units | SMR §5 | 14 | Peak headcount |`;

const PRICE = `### P01 · Compound civils

| Ref | Scope ref | Description | Unit | Quantity | Rate | Amount |
|---|---|---|---|---|---|---|
| 1 | SS-P01.1 | Strip and level | m2 | 4,200 | | |
| 2 | SS-P01.2 | Type 1 sub-base | m3 | 630 | | |

### P02 · Welfare

| Ref | Scope ref | Description | Unit | Quantity | Rate | Amount |
|---|---|---|---|---|---|---|
| 1 | SS-P02.1 | Provide welfare units | nr | 14 | | |`;

// --- references
console.log("--- reading the references\n");
ok(refsIn(SCOPE).join(",") === "SS-P01.1,SS-P01.2,SS-P02.1", "every scope reference is found, in order", refsIn(SCOPE));
ok(refsIn("SS-P01.04 and SS-P01.4").length === 1,
   "SS-P01.04 and SS-P01.4 are ONE reference — a leading zero is a typo, not a second item");
ok(refsIn("no references here at all").length === 0, "prose with no references yields none");

// --- the clean case
console.log("\n--- a pack that reconciles\n");
{
  const r = reconcileScopeToPrice(SCOPE, PRICE);
  ok(r.ok, "three items, three lines, every reference matched", r);
  ok(r.scopeItems === 3 && r.pricedLines === 3 && r.matched === 3, "the counts agree", r);
  ok(packNotes(r).length === 0,
     "and produces no note — run notes are an exception report, and good news among them reads as one more thing wrong",
     packNotes(r));
  ok(/This pack reconciles/.test(packStatement(r)), "the issue certificate says the pack reconciles");
}

// --- a scope item nobody can price
console.log("\n--- a scope item with no priced line\n");
{
  const r = reconcileScopeToPrice(SCOPE + "\n| SS-P02.2 | Maintain the units | SMR §6 | 96 | Programme |", PRICE);
  ok(!r.ok, "the pack does not reconcile");
  ok(r.unpriced.join(",") === "SS-P02.2", "and names the item nobody can price", r.unpriced);
  const n = packNotes(r).join(" ");
  ok(/SS-P02\.2/.test(n), "the note names the reference");
  ok(/variation/.test(n), "and says what it costs: it returns after award as a variation at their rate");
  ok(/must not be issued|before this pack is issued/.test(packStatement(r) + n), "and that the pack must not go out like this");
}

// --- a price for something nobody specified
console.log("\n--- a priced line with no scope item\n");
{
  const r = reconcileScopeToPrice(SCOPE, PRICE + "\n| 2 | SS-P02.9 | Security gatehouse | nr | 1 | | |");
  ok(!r.ok, "the pack does not reconcile");
  ok(r.unspecified.join(",") === "SS-P02.9", "and names the line nobody specified", r.unspecified);
  ok(/no two assumptions will match|incomparable/.test(packNotes(r).join(" ")),
     "and says what it costs: every tenderer prices its own assumption and the returns cannot be compared");
}

// --- a line nobody can price consistently
console.log("\n--- a priced line with no unit\n");
{
  const bad = PRICE.replace("| 1 | SS-P02.1 | Provide welfare units | nr | 14 | | |",
                            "| 1 | SS-P02.1 | Provide welfare units | as required | 14 | | |");
  const r = reconcileScopeToPrice(SCOPE, bad);
  ok(!r.ok, "the pack does not reconcile");
  ok(r.unitless.length === 1 && r.unitless[0].ref === "SS-P02.1", "and names the unpriceable line", r.unitless);
  ok(/whatever each tenderer chose/.test(packNotes(r).join(" ")), "and says why that matters");
  ok(UNITS.includes("m2") && UNITS.includes("week") && !UNITS.includes("as required"),
     "the unit vocabulary is a list, so the check is fair and the brief can print it");
}

// --- the case that used to pass silently
console.log("\n--- a pack written to no convention at all\n");
{
  const r = reconcileScopeToPrice("Strip and level the compound. Lay sub-base.", "| Description | Unit |\n|---|---|\n| Strip and level | m2 |");
  ok(!r.ok && !r.referenced, "a pack with no references does not quietly pass as reconciled", r);
  ok(/Do not issue this pack/.test(packNotes(r)[0]), "and it is refused rather than reported as clean");
  ok(/must not be issued/.test(packStatement(r)), "the certificate refuses it too");
}

// --- the splitter defect this work found
console.log("\n--- the splitter no longer truncates a short deliverable\n");
{
  // Eight sections, and section 8 contains a numbered list. The bound used to
  // be a hard 12 for every deliverable, so "10." inside section 8 was taken
  // for the start of a section 10 and everything after it was cut and lost.
  const eight = MR_SECTIONS.map(([, label], i) =>
    `## ${i + 1} · ${label}\nBody of ${i + 1}.` + (i === 7 ? "\n\n9. First recovery action\n10. Second recovery action\nThe verdict rests on the S278 chain." : "")
  ).join("\n\n");
  const { data, matched, missing } = splitPipelineOutput(`## 0 · Verdict\nOne paragraph.\n\n${eight}`, MR_SECTIONS);
  ok(/Second recovery action/.test(data.m8 || ""), "section 8 keeps everything after its numbered list", (data.m8 || "").slice(0, 120));
  ok(/The verdict rests on the S278 chain/.test(data.m8 || ""), "including the sentence after it");
  ok(matched === 9 && missing.length === 0, "and nine matched means nine, not thirteen", { matched, missing });
}

// --- and it still splits the pack itself
console.log("\n--- the pack splits into its eight parts\n");
{
  const out = ["## 0 · Issue summary\nTwo packages.",
    ...TP_SECTIONS.map(([, label], i) => `## ${i + 1} · ${label}\nPart ${i + 1}.`)].join("\n\n");
  const { data, matched } = splitPipelineOutput(out, TP_SECTIONS);
  ok(matched === 9, "the summary and eight parts", matched);
  ok(data.t4 === "Part 4.", "part 4 is the pricing schedule and holds its own content", data.t4);
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
