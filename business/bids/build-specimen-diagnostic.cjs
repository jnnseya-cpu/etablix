/**
 * ETABLIX — Site Systems Diagnostic, specimen report. Word and PDF.
 *
 *   node business/bids/build-specimen-diagnostic.cjs
 *   → business/bids/ETABLIX-Specimen-Diagnostic.docx and .pdf
 *
 * The specimen already existed. It was produced on 7 September 2026 by running
 * the diagnostic against the eight inputs a client is asked to supply, to test
 * whether the twelve advertised deliverables can actually be generated from
 * them. The report and its verdict are in diagnostic-test/output/, and nothing
 * there is touched by this file.
 *
 * What did not exist was a version that could be attached to an email. There
 * was a .docx buried in a test directory and no PDF at all, which meant the
 * thing most likely to win a first engagement could not be sent to anybody.
 *
 * So this renders the same markdown through the house style used by the
 * policies and the delivery record, into the same directory as the rest of the
 * sendable pack. One source, one report — if the markdown changes, rerun this
 * and both outputs change with it.
 *
 * THE LABEL IS NOT OPTIONAL AND IT IS NOT A FOOTER. Ridgeway Grid Connection
 * is not a real project, client or contract. That sentence appears in the
 * control table, in a boxed notice on the cover, and in the first line of the
 * body — because a document that is forwarded twice loses its covering email
 * but keeps its first page. A specimen that could be mistaken for a client's
 * pack would tell a buyer exactly the wrong thing about how this company
 * handles other people's information.
 */
const fs = require("fs");
const path = require("path");
const B = require("../policies/brand.cjs");

const SRC = path.join(__dirname, "..", "..", "diagnostic-test", "output", "DIAGNOSTIC-REPORT.md");
const TOTAL = 9000;          // table width in DXA, matching the policies
const MINCOL = 620;

const d = B.doc({
  slug: "Specimen-Diagnostic",
  running: "Site Systems Diagnostic — specimen",
  kicker: "SITE SYSTEMS DIAGNOSTIC",
  title: "SPECIMEN REPORT",
  sub: "Ridgeway Grid Connection — a synthetic project",
  rev: null,                 // undated on purpose — see the note below
  kind: "report",
  draftNote: false,          // nothing here is bracketed; it is a finished report
  watermark: "Sample",       // on every page, in both the Word file and the PDF
  outDir: __dirname,
  control: [
    ["Report reference", "SSD-SPECIMEN-01"],
    ["Scheme", "Ridgeway Grid Connection — 400 kV substation and converter station"],
    ["Status", "SAMPLE. Synthetic project — not a real client, contract or scheme."],
    ["Purpose", "To show what a client receives, without showing another client's pack"],
    ["Prepared by", "Justin Nseya MCIOB, Director"],
    ["Basis", "First-pass planning figures requiring validation by a competent person"],
  ],
});

/*
 * NO DATE, NO REVISION NUMBER, AND THAT IS DELIBERATE.
 *
 * This document is sent to prospective clients, and it will go on being sent
 * for months. A production date on it does one thing only: it tells a reader
 * in February how long ago the company last produced anything. The reference
 * is SSD-SPECIMEN-01 rather than SSD-2026-001 for the same reason.
 *
 * The dates INSIDE the report stay exactly as they are. 1 March 2027 access,
 * the twenty-week Section 278, the January 2028 shift pattern — those are the
 * synthetic project's own programme and they are the substance of the
 * findings. Strip them and there is no report. They also cannot be mistaken
 * for a claim about when the work was done.
 *
 * What does NOT come off, at any point, for any reason: the statement that
 * Ridgeway Grid Connection is not a real project. The watermark reinforces it
 * on every page; it does not replace it. A document that reads as a real
 * client engagement, sent to a prospect, is a fabricated case study — and
 * that is the one thing this company will not put its name to.
 */
const { p, rich, h1, h2, bullet, note, table } = d;

note("SAMPLE DOCUMENT. Ridgeway Grid Connection is not a real project, client or contract. No figure, name or date "
   + "in this report describes anything that exists. It was produced by running the diagnostic "
   + "against the eight inputs a client is asked to supply, to establish whether the twelve "
   + "advertised deliverables can in fact be generated from them. It is provided so that a reader "
   + "can see the form and depth of the deliverable. A real client's report is never shown to a "
   + "third party, anonymised or otherwise.");

/* ------------------------------------------------------------------ */
/* inline markdown → brand.cjs rich runs                               */
/* ------------------------------------------------------------------ */
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

function runs(text) {
  const out = [];
  for (const piece of text.split(INLINE)) {
    if (!piece) continue;
    if (piece.startsWith("**") && piece.endsWith("**")) out.push({ t: piece.slice(2, -2), b: true });
    else if (piece.startsWith("*") && piece.endsWith("*")) out.push({ t: piece.slice(1, -1), i: true });
    else if (piece.startsWith("`") && piece.endsWith("`")) out.push({ t: piece.slice(1, -1), c: B.GOLD });
    else out.push({ t: piece });
  }
  return out.length ? out : [{ t: text }];
}
const plain = (text) => text
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/\*([^*]+)\*/g, "$1")
  .replace(/`([^`]+)`/g, "$1")
  .trim();

/* proportional column widths from the widest cell in each column */
function widths(cols) {
  const wide = cols.map((c) => Math.max(3, c));
  const sum = wide.reduce((a, b) => a + b, 0);
  const raw = wide.map((w) => Math.max(MINCOL, Math.round((w / sum) * TOTAL)));
  const over = raw.reduce((a, b) => a + b, 0) - TOTAL;
  if (over > 0) {                       // claw the excess back off the widest column
    const i = raw.indexOf(Math.max(...raw));
    raw[i] = Math.max(MINCOL, raw[i] - over);
  }
  return raw;
}

/* ------------------------------------------------------------------ */
/* block-level walk                                                    */
/* ------------------------------------------------------------------ */
const lines = fs.readFileSync(SRC, "utf8").split("\n");
let para = [];
let tbl = null;
let stats = { h1: 0, h2: 0, p: 0, table: 0, row: 0, list: 0 };

const flushPara = () => {
  if (!para.length) return;
  const text = para.join(" ").replace(/\s+/g, " ").trim();
  para = [];
  if (!text) return;
  stats.p += 1;
  rich(runs(text));
};

const flushTable = () => {
  if (!tbl) return;
  const { head, rows } = tbl;
  tbl = null;
  if (!head || !rows.length) return;
  const n = head.length;
  const maxLen = head.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || "").length)));
  const size = n >= 6 ? 15 : n === 5 ? 16 : undefined;
  table(widths(maxLen), head, rows, size ? { size } : {});
  stats.table += 1;
  stats.row += rows.length;
};

for (const raw of lines) {
  const line = raw.replace(/\s+$/, "");

  if (/^\|/.test(line)) {
    flushPara();
    const cells = line.split("|").slice(1, -1).map((c) => plain(c));
    if (cells.every((c) => /^:?-{2,}:?$/.test(c.trim()))) continue;   // the separator row
    if (!tbl) tbl = { head: cells, rows: [] };
    else tbl.rows.push(cells);
    continue;
  }
  flushTable();

  if (/^#\s/.test(line)) { flushPara(); continue; }                   // the cover carries the title
  if (/^###\s/.test(line)) { flushPara(); h2(plain(line.slice(4))); stats.h2 += 1; continue; }
  if (/^##\s/.test(line)) { flushPara(); h1(plain(line.slice(3))); stats.h1 += 1; continue; }
  if (/^-{3,}$/.test(line)) { flushPara(); continue; }                // h1 already carries a rule
  if (/^\s*$/.test(line)) { flushPara(); continue; }

  const num = line.match(/^(\d+)\.\s+(.*)$/);
  if (num) {
    flushPara();
    rich([{ t: num[1] + ".  ", b: true, c: B.GOLD }, ...runs(num[2])]);
    stats.list += 1;
    continue;
  }

  para.push(line.trim());
}
flushPara();
flushTable();

/* ------------------------------------------------------------------ */
h1("About this specimen");
p("This report was generated from the eight inputs the client is asked to provide, and from nothing else. Where an input was missing, the report says so rather than assuming a value — section 5 does that twice. That is the behaviour worth looking at: a diagnostic that fills its own gaps produces a number nobody can defend, and the whole point of the exercise is a number that survives being questioned.");
p("Every load, ratio, rate and duration in it is a first-pass planning figure requiring validation by a competent person before use. It is written that way on purpose. A specification issued as fact, on figures that were estimated, is the failure mode this service exists to prevent.");

/* no approval block: a specimen is not signed, because there is nobody to sign it to */
d.build().then(() => {
  console.log("blocks rendered:", JSON.stringify(stats));
}).catch((err) => { console.error(err); process.exit(1); });
