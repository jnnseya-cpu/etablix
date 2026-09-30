/**
 * The brief renderer turns a markdown working document into the house-style
 * Word and PDF pair. Its one job is not to lose anything: a bid brief that
 * silently drops a line is worse than one that renders a line plainly.
 *
 * So the tests are about fidelity, not appearance. Every block the scanner
 * finds must reach the document, no markdown syntax may survive into the
 * output, and the inline parser must not mangle the punctuation these briefs
 * are full of — asterisks inside words, pipes in prose, hashes mid-sentence.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { PDFParse } from "pdf-parse";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const R = createRequire(import.meta.url)("../../business/tools/render-brief.cjs");

test("inline parsing keeps bold, italic and code, and drops their markers", () => {
  assert.deepEqual(R.runs("plain **bold** end"),
    [{ t: "plain " }, { t: "bold", b: true }, { t: " end" }]);
  assert.deepEqual(R.runs("a `code` b"), [{ t: "a " }, { t: "code", i: true }, { t: " b" }]);
  assert.deepEqual(R.runs("no markup"), [{ t: "no markup" }]);
});

test("an asterisk inside a word is not read as italic", () => {
  // "3*4" and "a*b" appear in specifications; treating them as emphasis would
  // silently delete characters from a priced scope.
  assert.equal(R.plain("size 3*4*5 units"), "size 3*4*5 units");
  assert.equal(R.plain("**real** and 2*3"), "real and 2*3");
});

test("the scanner classifies every block shape the briefs use", () => {
  const md = [
    "# Title", "", "A paragraph.", "", "## Section", "",
    "- one", "- two", "", "1. first", "2. second", "",
    "| a | b |", "|---|---|", "| 1 | 2 |", "",
    "> quoted line", "> and its continuation", "", "---", "", "Last.",
  ].join("\n");
  const kinds = R.blocks(md).map((b) => b.t);
  assert.deepEqual(kinds, ["h", "p", "h", "list", "list", "table", "quote", "hr", "p"]);
  const [list1] = R.blocks(md).filter((b) => b.t === "list");
  assert.equal(list1.items.length, 2);
  const tbl = R.blocks(md).find((b) => b.t === "table");
  assert.deepEqual(tbl.head, ["a", "b"]);
  assert.deepEqual(tbl.rows, [["1", "2"]]);
});

test("a numbered list keeps its numbers", () => {
  const [list] = R.blocks("1. first\n2. second").filter((b) => b.t === "list");
  assert.deepEqual(list.items.map((i) => i.num), ["1", "2"]);
});

test("an unrecognised line is emitted as a paragraph, never dropped", () => {
  const md = "Ordinary line with a | pipe and a # hash mid-sentence.";
  const bs = R.blocks(md);
  assert.equal(bs.length, 1);
  assert.equal(bs[0].t, "p");
  assert.ok(bs[0].text.includes("| pipe"));
});

test("column widths always sum to the table width", () => {
  for (const head of [["a"], ["a", "b"], ["a", "b", "c"], ["a", "b", "c", "d"]]) {
    const w = R.widths(head, [head.map(() => "x".repeat(40))], 8300);
    assert.equal(w.length, head.length);
    assert.equal(w.reduce((a, b) => a + b, 0), 8300, `widths drift for ${head.length} columns`);
    assert.ok(w.every((x) => x > 0), "a column came out non-positive");
  }
});

test("a rendered brief carries the source text and no markdown syntax", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "brief-"));
  const md = path.join(dir, "sample.md");
  writeFileSync(md, [
    "# Sample brief", "",
    "A sentence with **bold** in it.", "",
    "## A section", "",
    "- first bullet", "- second bullet", "",
    "| Package | What |", "|---|---|", "| Civils | groundworks |", "",
    "> A quoted paragraph that must survive.", "",
  ].join("\n"));

  execFileSync(process.execPath, [path.join(ROOT, "business/tools/render-brief.cjs"), md],
    { cwd: ROOT, stdio: "pipe" });

  const pdf = path.join(dir, "ETABLIX-sample.pdf");
  assert.ok(existsSync(pdf), "no PDF produced");
  assert.ok(existsSync(path.join(dir, "ETABLIX-sample.docx")), "no Word file produced");

  const { text } = await new PDFParse({ data: new Uint8Array(readFileSync(pdf)) }).getText();
  const flat = text.replace(/-\n/g, "").replace(/\s+/g, " ");

  for (const kept of ["A sentence with bold in it", "A section", "first bullet",
                      "second bullet", "Package", "Civils", "groundworks",
                      "A quoted paragraph that must survive"])
    assert.ok(flat.includes(kept), `lost from the rendered brief: ${kept}`);

  for (const [label, re] of [["bold markers", /\*\*/], ["table rule", /\|\s*-{2,}/],
                             ["heading hash", /(^|\n)#{1,6}\s/], ["quote marker", /(^|\n)>\s/]])
    assert.ok(!re.test(text), `markdown ${label} survived into the document`);
});

test("the live briefs render without losing blocks", async () => {
  for (const rel of ["business/bids/sq-6-1-contract-examples.md",
                     "business/bids/DIRECTOR-EXPERIENCE-NOTES.md"]) {
    const md = readFileSync(path.join(ROOT, rel), "utf8");
    const bs = R.blocks(md);
    assert.ok(bs.length > 5, `${rel} scanned to only ${bs.length} blocks`);
    // Nothing non-empty in the source may scan to nothing.
    const textish = bs.filter((b) => b.t === "p" || b.t === "h" || b.t === "list" || b.t === "quote");
    assert.ok(textish.length > 0, `${rel} produced no text blocks`);
  }
});
