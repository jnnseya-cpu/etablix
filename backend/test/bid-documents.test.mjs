/**
 * A bid document that prints "[  ]" tells an assessor it was sent unfinished.
 *
 * The director's experience document was rebuilt so that an unsupplied field is
 * OMITTED rather than bracketed, and so that drafting guidance goes to a notes
 * file instead of into the evidence. Both are easy to undo by accident: the next
 * person to add a row will reach for the placeholder habit. This test makes that
 * regression fail here rather than in front of a procurement assessor.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BUILDER = path.join(ROOT, "business/bids/build-director-experience.cjs");
const PDF = path.join(ROOT, "business/bids/ETABLIX-Director-Relevant-Experience.pdf");
const NOTES = path.join(ROOT, "business/bids/DIRECTOR-EXPERIENCE-NOTES.md");

execFileSync(process.execPath, [BUILDER], { cwd: ROOT, stdio: "pipe" });
const { text } = await new PDFParse({ data: new Uint8Array(readFileSync(PDF)) }).getText();
const flat = text.replace(/\s+/g, " ");

test("the issued document carries no placeholder of any shape", () => {
  const hits = [...text.matchAll(/\[[^\]]{0,120}\]/g)].map((m) => m[0].replace(/\s+/g, " "));
  assert.deepEqual(hits, [], `placeholders leaked into the PDF: ${hits.join(" | ")}`);
});

test("drafting instructions stay out of the evidence", () => {
  for (const phrase of [
    "the hardest to write", "rewrite the line", "Model it on",
    "Delete any row", "Resist stopping", "choose the true wording",
    "before this goes out", "an assessor may test it",
  ]) assert.ok(!flat.includes(phrase), `drafting guidance in the document: ${phrase}`);
});

/* Data-driven rather than hard-coded, so filling a figure in the data file does
   not break the test that guards against empty rows. The property under test is
   the invariant itself: a row appears if and only if something supplies it. */
const { createRequire } = await import("node:module");
const DATA = createRequire(import.meta.url)("../../business/bids/director-experience.data.cjs");
const ROW = {
  endClient: "Client / end client",
  schemeValue: "Scheme value",
  scopeValue: "Value of the scope personally held",
  beds: "Village capacity",
  peakWorkforce: "Peak workforce on site",
  establishmentMonths: "Duration of site establishment",
};
const live = DATA.schemes.filter((s) => s.include !== false);

test("a row appears if and only if the data file supplies its value", () => {
  for (const [field, label] of Object.entries(ROW)) {
    const supplied = live.some((s) => typeof s[field] === "string" && s[field].trim());
    assert.equal(flat.includes(label), supplied,
      supplied ? `"${label}" is supplied but missing from the document`
               : `"${label}" is rendered with nothing behind it`);
  }
});

test("the claims that carry the submission survive", () => {
  for (const claim of [
    "single person accountable for planning, procuring, integrating and controlling",
    "Northern and Southern Europe including the United Kingdom and the Republic of Ireland",
    "initial requirements, mobilisation, daily operation, demobilisation and reinstatement",
    "It is not presented as a contract performed by ETABLIX",
    "Principal Designer training is training",
  ]) assert.ok(flat.includes(claim), `missing: ${claim}`);
});

test("the award is described as recommended, never as let or awarded by him", () => {
  assert.ok(flat.includes("recommended the award; the order was placed by the sourcing function"));
  assert.ok(flat.includes("not presenting himself as having held delegated financial authority"));
  for (const overclaim of ["and letting the accommodation", "I awarded", "personally awarded every"])
    assert.ok(!flat.includes(overclaim), `award overclaim: ${overclaim}`);
});

test("every scheme offered carries scope bullets, not a prompt to write them", () => {
  for (const s of live)
    assert.ok(flat.includes(s.title.replace(/\s+/g, " ")), `scheme missing: ${s.title}`);
  for (const opener of [
    "Defined the entire worker accommodation village from the construction programme", // 4.1 Skye
    "Led construction delivery and subcontractor governance across the grid",          // 4.2 Sofia
    "Directed multidisciplinary delivery from design coordination",                    // 4.3 WMCA
  ]) assert.ok(flat.includes(opener), `scheme has no scope bullets: ${opener}`);
});

test("a scheme held in reserve gets no section-4 entry of its own", () => {
  // The title may legitimately appear in the section 3.2 capability table --
  // Midland Main Line is cited there as evidence of live-operational work. What
  // must not appear is its own scheme block: a heading immediately followed by
  // the fact table's first row.
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const s of DATA.schemes.filter((x) => x.include === false))
    assert.ok(!new RegExp(`${esc(s.title)}\\s+Employer\\s+${esc(s.employer)}`).test(flat),
      `reserve scheme rendered a scheme block: ${s.title}`);
});

test("the Skye entry carries the five packages and the consolidation", () => {
  for (const claim of [
    "The five packages, each specified by the director",
    "Civil works", "Accommodation", "Kitchen and dining", "Facilities management",
    "menu cycle designed to avoid food fatigue",
    "transport between the village and the working faces",
    "selected one of them", "under a single contract",
    "Management Integrator model",
  ]) assert.ok(flat.includes(claim), `Skye entry missing: ${claim}`);
});

test("the scheme value is attributed to the promoter, never to the director's scope", () => {
  if (!flat.includes("\u00a3690 million")) return;
  assert.ok(flat.includes("the promoter's value for the whole reinforcement scheme, not for the accommodation scope"),
    "the GBP 690m figure appears without saying whose value it is");
});

test("the builder reports what the document does not claim, in a notes file", () => {
  assert.ok(existsSync(NOTES), "notes file not written");
  const notes = readFileSync(NOTES, "utf8");
  assert.ok(notes.includes("complete and issuable"));
  assert.ok(/\| What \| Why it is worth adding \|/.test(notes), "gap table missing");
});
