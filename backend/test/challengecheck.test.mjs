/**
 * The challenge check — Agent 14's issue gate, and the fifth reconciliation.
 *
 *   node backend/test/challengecheck.test.mjs
 *
 * The other four reconciliations compare two things that must agree. This one
 * compares a review against what a review has to be, because an adversarial
 * review has a failure mode the other agents do not:
 *
 *   · Nine headings, forty paragraphs, and not one finding anybody can act
 *     on. It reads as thorough and it is filed as assurance.
 *   · A lens with nothing under it, which is indistinguishable on the page
 *     from a lens that found nothing.
 *   · A critical finding recorded as accepted, which quietly downgrades a
 *     hard block into a judgement call.
 *   · A report produced by the run that wrote the work, agreeing with itself.
 *
 * All four produce a document that looks like a review and is not one.
 */
import {
  reconcileChallenge, challengeNotes, challengeStatement, findingsIn,
  lensesApplied, registerBlock, lensOf, severityOf, refsIn,
  LENS_IDS, SEVERITY_IDS, FINDING_COLUMNS,
} from "../lib/challengecheck.js";
import { LENSES, SEVERITIES } from "../lib/l7/assurance.js";

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

const BODY = "Examined every relevant part of the document against the source supplied, and against nothing else.";
const NAMES = ["Compliance", "Evaluator", "Commercial", "Technical", "Programme", "Contract", "Evidence", "Adversarial", "Executive"];
const lensBlock = (bodies = {}) =>
  NAMES.map((n, i) => `## ${i + 1} · ${n} lens\n${bodies[n.toLowerCase()] === undefined ? BODY : bodies[n.toLowerCase()]}\n`).join("\n");

const HEAD = `| ${FINDING_COLUMNS.join(" | ")} |\n|${FINDING_COLUMNS.map(() => "---").join("|")}|`;
const row = (r) => `| ${r.ref} | ${r.lens} | ${r.severity} | ${r.where} | ${r.finding} | ${r.remedy} | ${r.disposition || ""} |`;
const report = (rows, bodies) =>
  `${lensBlock(bodies)}\n## 10 · The findings register\n${HEAD}\n${rows.map(row).join("\n")}\n\n## 11 · The challenge certificate\nIndependence stated.`;

const GOOD = [
  { ref: "CH-1", lens: "compliance", severity: "CRITICAL", where: "SUB-4, absent from the whole document", finding: "The social value plan is not answered", remedy: "Write the SUB-4 response before submission" },
  { ref: "CH-2", lens: "contract", severity: "HIGH", where: "Section 4, sentence 3", finding: "Concedes a fitness-for-purpose obligation", remedy: "Replace with reasonable skill and care", disposition: "Accepted by J Nseya on 2026-09-09" },
];

console.log("\n=== the challenge check ===\n");

console.log("--- the definitions come from one place\n");
ok(LENS_IDS.length === 9 && LENS_IDS.join(",") === LENSES.map((l) => l.id).join(","),
   "the nine lenses come from assurance.js, so the report and the gate cannot describe different ones");
ok(SEVERITY_IDS.length === 4 && SEVERITY_IDS.join(",") === SEVERITIES.map((s) => s.id).join(","), "and the four severities too");
ok(FINDING_COLUMNS.length === 7, "seven columns in the findings register");

console.log("\n--- reading a cell\n");
ok(lensOf("compliance") === "compliance" && lensOf("Compliance") === "compliance", "a lens reads by id, either case");
ok(lensOf("Adversarial") === "adversarial", "and by display name");
ok(lensOf("compliance and commercial") === null,
   "A FINDING UNDER TWO LENSES IS TWO FINDINGS — a cell naming both is refused rather than assigned to the first");
ok(lensOf("thoroughness") === null && lensOf("") === null, "an invented lens is null");
ok(severityOf("CRITICAL") === "CRITICAL" && severityOf("high") === "HIGH", "a severity reads in either case");
ok(severityOf("significant") === null && severityOf("moderate") === null,
   "\"significant\" and \"moderate\" are not severities and nothing can be gated on them");
ok(refsIn("CH-1 and CH-04 and CH-4").join(",") === "CH-1,CH-4", "CH-04 and CH-4 are one reference, compared as numbers");

console.log("\n--- the register section is the only place findings are read from\n");
{
  const withWorkingPaper = `## A · WHAT THE DOCUMENT COMMITS TO\n| Commitment | Where |\n|---|---|\n| Two shifts | Method para 4 |\n\n${report(GOOD)}`;
  const r = reconcileChallenge(withWorkingPaper);
  ok(r.malformed.length === 0,
     "A TABLE IN THE WORKING PAPER IS NOT A MALFORMED FINDING — the first version read every table in the report and refused eleven good findings", r.malformed.slice(0, 2));
  ok(r.findings === 2, "and only the register's rows are findings", r.findings);
}
ok(registerBlock(report(GOOD)).found, "the register section is located by its heading");
ok(!registerBlock(lensBlock()).found, "and a report without one says so");
{
  const r = reconcileChallenge(lensBlock() + "\n\nSome prose about the findings.");
  ok(!r.ok && !r.registerFound, "nine lenses of prose with no table is refused");
  ok(/no findings register in it/.test(challengeNotes(r)[0]), "because nobody can sort, filter, assign or close prose", challengeNotes(r)[0]);
}

console.log("\n--- a report that is actually a review\n");
{
  const r = reconcileChallenge(report(GOOD));
  ok(r.ok, "passes", challengeNotes(r)[0]);
  ok(r.lensesApplied.length === 9, "all nine lenses applied");
  ok(r.bySeverity.CRITICAL === 1 && r.bySeverity.HIGH === 1, "counted by severity", r.bySeverity);
  ok(/hard-blocked/.test(challengeStatement(r)), "and the statement says the submission is hard-blocked", challengeStatement(r));
}

console.log("\n--- the four ways a review is not one\n");
{
  const r = reconcileChallenge(report([]));
  ok(!r.ok && r.findings === 0, "nine lenses and NOT ONE FINDING is refused");
  ok(/has not been challenged, it has been read/.test(challengeNotes(r)[0]),
     "AND THIS IS THE CHECK PEOPLE ARGUE WITH — a clean report filed as assurance is evidence of a control that was never applied", challengeNotes(r)[0]);
}
{
  const missing = NAMES.slice(0, 8).map((n, i) => `## ${i + 1} · ${n} lens\n${BODY}\n`).join("\n");
  const r = reconcileChallenge(`${missing}\n## 10 · The findings register\n${HEAD}\n${row(GOOD[0])}`);
  ok(!r.ok && r.lensesMissing.join(",") === "executive", "a lens with no section at all is missing", r.lensesMissing);
  ok(/A LENS NOBODY RAN IS NOT A LENS THAT PASSED/.test(challengeNotes(r).join(" ")),
     "and a report naming eight of nine reads as a clean review of all nine");
}
{
  const r = reconcileChallenge(report(GOOD, { contract: "None." }));
  ok(!r.ok && r.lensesEmpty.join(",") === "contract",
     "A LENS WITH A HEADING AND NOTHING UNDER IT is an unrun lens wearing a title", r.lensesEmpty);
}
{
  const disposed = [{ ...GOOD[0], disposition: "Accepted by the bid director on 2026-09-09" }, GOOD[1]];
  const r = reconcileChallenge(report(disposed));
  ok(!r.ok && r.criticalDisposed.length === 1,
     "A CRITICAL FINDING CANNOT BE DISPOSED OF — recording one as accepted quietly downgrades a hard block", r.criticalDisposed);
  ok(/hard block by definition/.test(challengeNotes(r).join(" ")), "and it is refused in those words");
}
{
  const r = reconcileChallenge(report(GOOD), { author: { runId: "r1", promptLineage: "p1" }, review: { runId: "r1", promptLineage: "p1" } });
  ok(!r.ok && !r.independence.ok, "a challenge that ran inside the run it is challenging is refused");
  ok(/THIS IS NOT AN INDEPENDENT REVIEW/.test(challengeNotes(r)[0]), "and named as not an assurance result at all", challengeNotes(r)[0]);
  const sameLineage = reconcileChallenge(report(GOOD), { author: { runId: "r1", promptLineage: "p1" }, review: { runId: "r2", promptLineage: "p1" } });
  ok(!sameLineage.ok, "and so is a different run on the author's prompt lineage");
  const proper = reconcileChallenge(report(GOOD), { author: { runId: "r1", promptLineage: "p1" }, review: { runId: "r2", promptLineage: "p2" } });
  ok(proper.ok, "two runs on two lineages is independent");
}

console.log("\n--- a finding that is not one\n");
{
  const r = reconcileChallenge(report([{ ...GOOD[0], lens: "thoroughness" }]));
  ok(!r.ok && r.unlensed.length === 1, "a lens that is not one of the nine", r.unlensed);
}
{
  const r = reconcileChallenge(report([{ ...GOOD[0], severity: "significant" }]));
  ok(!r.ok && r.unrated.length === 1, "a severity that is not one of the four", r.unrated);
}
{
  const r = reconcileChallenge(report([{ ...GOOD[0], where: "" }]));
  ok(!r.ok && r.unlocated.length === 1, "A FINDING WITHOUT A LOCATION IS AN OPINION");
  ok(/IS AN OPINION/.test(challengeNotes(r).join(" ")), "and is refused in those words");
}
{
  const r = reconcileChallenge(report([{ ...GOOD[0], where: "the programme section" }]));
  ok(r.unlocated.length === 0, "though a vague location still counts as one — the machine cannot judge specificity, only presence");
}
{
  const r = reconcileChallenge(report([{ ...GOOD[0], remedy: "—" }]));
  ok(!r.ok && r.unremedied.length === 1, "A FINDING WITHOUT A REMEDY IS A COMPLAINT");
}
{
  const r = reconcileChallenge(report([{ ...GOOD[0], where: "TBC" }]));
  ok(!r.ok && r.unlocated.length === 1, "and TBC in a cell is the same as an empty one");
}
{
  const r = reconcileChallenge(report([GOOD[0], { ...GOOD[1], ref: "CH-1" }]));
  ok(!r.ok && r.duplicates.includes("CH-1"),
     "two findings sharing a reference become one the moment anybody sorts the table", r.duplicates);
}
{
  const r = reconcileChallenge(report([{ ...GOOD[1], disposition: "Accepted by J Nseya" }]));
  ok(!r.ok && r.undatedDisposition.length === 1, "a disposition with no date is not a decision", r.undatedDisposition);
}
{
  const broken = `${lensBlock()}\n## 10 · The findings register\n${HEAD}\n| CH-9 | compliance | HIGH |\n${row(GOOD[0])}`;
  const r = reconcileChallenge(broken);
  ok(!r.ok && r.malformed.length === 1 && r.malformed[0].ref === "CH-9",
     "a row with three columns is a finding nobody will ever action, and is reported rather than dropped", r.malformed);
}
{
  const noRef = `${lensBlock()}\n## 10 · The findings register\n${HEAD}\n| | compliance | HIGH | somewhere | a thing | a fix | |\n${row(GOOD[0])}`;
  const r = reconcileChallenge(noRef);
  ok(!r.ok && r.malformed.length === 1, "and so is a row with no reference at all");
}

console.log("\n--- parsing, on its own\n");
{
  const { rows } = findingsIn(`${HEAD}\n${row(GOOD[0])}\n${row(GOOD[1])}`);
  ok(rows.length === 2, "two rows read");
  ok(rows[0].ref === "CH-1" && rows[0].lens === "compliance", "with their cells in the right columns");
}
ok(findingsIn(HEAD).rows.length === 0, "a header and a separator alone are not findings");
{
  const a = lensesApplied(lensBlock());
  ok(a.applied.length === 9 && a.missing.length === 0, "all nine headings found in the numbered form the agent is told to write");
  const unnumbered = NAMES.map((n) => `### ${n} lens\n${BODY}\n`).join("\n");
  ok(lensesApplied(unnumbered).applied.length === 9, "and in the unnumbered form too — the check must not depend on the numbering");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
