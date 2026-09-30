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

test("a field the data file does not supply is omitted, not blanked", () => {
  // Nothing supplies these today, so the row must be absent entirely.
  for (const label of [
    "Scheme value", "Value of the scope personally held",
    "Peak workforce on site", "Duration of site establishment", "Client / end client",
  ]) assert.ok(!flat.includes(label), `row rendered with no value behind it: ${label}`);
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

test("all three schemes carry scope bullets, not a prompt to write them", () => {
  for (const opener of [
    "Established the site requirement from the construction programme",       // 4.1
    "Coordinated civil and mechanical, electrical and plumbing works",        // 4.2
    "Directed multidisciplinary delivery from design coordination",           // 4.3
  ]) assert.ok(flat.includes(opener), `scheme has no scope bullets: ${opener}`);
});

test("the builder reports what the document does not claim, in a notes file", () => {
  assert.ok(existsSync(NOTES), "notes file not written");
  const notes = readFileSync(NOTES, "utf8");
  assert.ok(notes.includes("complete and issuable"));
  assert.ok(/\| What \| Why it is worth adding \|/.test(notes), "gap table missing");
});
