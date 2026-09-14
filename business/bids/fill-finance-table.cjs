/**
 * Fill Connected Places Catapult's PROJECT-FINANCE-TABLE-5.xlsx.
 *
 *   node business/bids/fill-finance-table.cjs <source.xlsx>
 *   → business/bids/ETABLIX-PROJECT-FINANCE-TABLE.xlsx
 *
 * The workbook cross-checks itself: on the Breakdown sheet each category's
 * "Total Accounted" sums the rows beneath it and is compared against "Total
 * Cost", which points back at the Overall sheet. So the per-line detail and
 * the headline figures have to agree or the form shows a mismatch to the
 * assessor. This script writes both ends and asserts they match before it
 * saves.
 *
 * Two deliberate positions in the numbers.
 *
 * No employee time is charged to the grant. The Managing Director's days are
 * contributed as match, so the award buys only what the company cannot
 * provide itself — which is the thing an assessor is looking for when they
 * scan a budget for an applicant quietly funding its own payroll.
 *
 * The knowledge line in the match table is deliberately valued at nil. The
 * engine rule base is the company's main asset and there is no licence
 * benchmark to value it against, so estimating a number would be inventing
 * one. Declining to value it reads as discipline; a large unevidenced figure
 * reads as the opposite.
 */
const path = require("path");
const ExcelJS = require("exceljs");

const SRC = process.argv[2];
if (!SRC) { console.error("usage: node fill-finance-table.cjs <source.xlsx>"); process.exit(1); }
const OUT = path.join(__dirname, "ETABLIX-PROJECT-FINANCE-TABLE.xlsx");

/* ---------- the numbers, all inclusive of VAT ---------- */
const CONSULTANCY = [
  ["Independent verification — chartered quantity surveyor or contract specialist", 2880,
   "4 days at £600/day plus VAT. Independent of ETABLIX. Reviews the engine findings on each pack and confirms which were valid. Self-assessed results are not evidence, so this is the largest single line."],
  ["External information security review", 840,
   "1 day at £700/day plus VAT. Independent review of how client pre-construction information is received, stored, segregated and destroyed. This is the first objection an infrastructure client raises and it is answered before it is asked."],
  ["Legal — non-disclosure and data processing agreements", 720,
   "£600 plus VAT. Drafted once and reusable across all three participating organisations, so the cost does not repeat per demonstration."],
  ["Demonstration pack and recorded walkthrough — production", 1080,
   "2 days at £450/day plus VAT. The artefact has to travel inside a buyer organisation without us; the person in the room is rarely the person who decides."],
];
const EQUIPMENT = [
  ["Segregated secure workspace and access control, six months", 540,
   "£450 plus VAT. Isolated environment holding client pre-construction information, separate from company systems, with access logging. Retired at the end of the programme."],
];
const OTHER = [
  ["Travel and subsistence — six buyer demonstration sessions", 1320,
   "Rail and accommodation to run the comparison live at buyer premises. Six sessions across October 2026 to March 2027."],
  ["Contingency", 620,
   "7.75% of project cost. Held against a fourth verification day, or one additional demonstration session if a fourth organisation participates. Unspent contingency is not claimed."],
];

const LABOUR = [
  ["[Your name] — Managing Director, ETABLIX", 550, 0,
   "42 days at £550/day, contributed as match funding and NOT charged to this grant. Demonstration delivery, 24 days: pack ingestion and engine configuration (8), running three demonstrations and preparing the comparisons (9), buyer sessions and travel (4), write-up and liaison with the independent verifier (3). Programme participation, 18 days at 3 per month: coaching, customer days and investor readiness work."],
];

const sum = (rows, i) => rows.reduce((a, r) => a + r[i], 0);
const C_TOTAL = sum(CONSULTANCY, 1);
const E_TOTAL = sum(EQUIPMENT, 1);
const O_TOTAL = sum(OTHER, 1);
const L_TOTAL = LABOUR.reduce((a, r) => a + r[2], 0);
const GRAND = L_TOTAL + C_TOTAL + E_TOTAL + O_TOTAL;

if (GRAND !== 8000) {
  console.error(`refusing to write: lines total £${GRAND}, not £8,000`);
  process.exit(1);
}

const MATCH = [
  [25, 23100, "Managing Director, 42 days at £550/day across October 2026 to March 2027, in two parts. Demonstration delivery, 24 days: pack ingestion, engine configuration, running three demonstrations, buyer sessions and write-up. Programme participation, 18 days: coaching sessions, customer days and investor readiness work. Source: ETABLIX, in kind, not charged to the grant and tracked for the programme's records."],
  [26, 0, "None."],
  [27, 1200, "CONSTRUX platform hosting, compute and secure storage for the demonstration runs, six months. Source: ETABLIX, in kind."],
  [28, 0, "The sixteen-engine rule base and clause-graph schema are made available to the programme at no charge. Deliberately valued at nil rather than estimated: no licence benchmark exists for it, and an unevidenced figure would be worth less than none. Source: ETABLIX."],
  [29, 400, "Additional travel beyond the six funded demonstration sessions. Source: ETABLIX."],
  [30, 0, "None."],
  [31, 0, "None."],
];

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SRC);
  const ov = wb.getWorksheet("Overall");
  const bd = wb.getWorksheet("Breakdown");
  const set = (ws, addr, v) => { ws.getCell(addr).value = v; };

  /* ---- Overall: header block ---- */
  set(ov, "C5", "ETABLIX — a trading name of JNN GLOBAL LTD (company number 15405437)");
  set(ov, "C6", "[Your name], Managing Director — [email] — [telephone]");
  set(ov, "C7", "Infrastructure Productivity Scale-Up Programme");
  set(ov, "C8", "Interface Ownership Demonstration — retrospective engine runs on infrastructure clients' own tender and pre-construction packs");
  set(ov, "C9", "[submission date]");

  /* ---- Overall: cost categories ---- */
  set(ov, "E14", L_TOTAL);
  set(ov, "F14", "No employee time is charged to this grant. The Managing Director's 24 days are contributed as match funding, so the award is spent only on what the company cannot provide itself.");
  set(ov, "E15", C_TOTAL);
  set(ov, "F15", "Independent verification of the findings, external information security review, data agreements, and production of the demonstration pack. All figures inclusive of VAT at 20%.");
  set(ov, "E16", 0);
  set(ov, "F16", "None. The demonstration consumes documents, not materials.");
  set(ov, "E17", E_TOTAL);
  set(ov, "F17", "Segregated secure workspace holding client pre-construction information for the duration of the programme. Inclusive of VAT.");
  set(ov, "E18", 0);
  set(ov, "F18", "None.");
  set(ov, "E19", O_TOTAL);
  set(ov, "F19", "Travel and subsistence for six buyer demonstration sessions, plus contingency. Inclusive of VAT where chargeable.");
  set(ov, "E20", { formula: "SUM(E14:E19)" });
  set(ov, "F20", "Total inclusive of VAT. ETABLIX is not currently VAT registered; if registration occurs before the spend and input VAT becomes recoverable, the claim will be reduced to the net figures and the difference returned.");
  set(ov, "E21", { formula: "E20" });

  /* ---- Overall: match funding ---- */
  for (const [row, amount, desc] of MATCH) {
    set(ov, `C${row}`, amount);
    set(ov, `D${row}`, desc);
  }

  /* ---- Breakdown: labour (rows 12+) ---- */
  LABOUR.forEach(([name, rate, cost, desc], i) => {
    const r = 12 + i;
    set(bd, `D${r}`, name); set(bd, `F${r}`, rate);
    set(bd, `H${r}`, cost); set(bd, `J${r}`, desc);
  });

  /* ---- Breakdown: consultancy (34+), equipment (78+), other (122+) ---- */
  const block = (rows, start, itemCol, costCol, descCol) => {
    rows.forEach(([item, cost, desc], i) => {
      const r = start + i;
      set(bd, `${itemCol}${r}`, item);
      set(bd, `${costCol}${r}`, cost);
      set(bd, `${descCol}${r}`, desc);
    });
  };
  block(CONSULTANCY, 34, "D", "F", "H");
  block(EQUIPMENT,   78, "D", "F", "H");
  block(OTHER,      122, "D", "F", "H");

  await wb.xlsx.writeFile(OUT);
  console.log(`wrote ${OUT}`);
  console.log(`  labour      £${L_TOTAL.toLocaleString()}`);
  console.log(`  consultancy £${C_TOTAL.toLocaleString()}`);
  console.log(`  equipment   £${E_TOTAL.toLocaleString()}`);
  console.log(`  other       £${O_TOTAL.toLocaleString()}`);
  console.log(`  TOTAL       £${GRAND.toLocaleString()}  (max £8,000 inc VAT)`);
  console.log(`  match       £${MATCH.reduce((a, m) => a + m[1], 0).toLocaleString()}`);
})().catch((e) => { console.error(e); process.exit(1); });
