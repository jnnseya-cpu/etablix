/**
 * The cash-flow forecast skeleton, as a working spreadsheet.
 *
 *   node business/bids/build-forecast.cjs
 *   → business/bids/ETABLIX-cash-flow-forecast.xlsx
 *
 * IT CONTAINS NO NUMBERS. Every assumption cell is empty and every other
 * cell is a formula that reads from it. That is deliberate: a forecast an
 * assessor can see was generated with invented figures is worse than no
 * forecast, and a forecast whose author cannot explain a number in it is
 * worse still. Fill the yellow cells on the Assumptions sheet and the rest
 * computes.
 *
 * The point of the Assumptions sheet is not the numbers. It is the Basis
 * column. An assessor reads a three-year forecast from a company with no
 * trading history knowing it cannot be right; what they are testing is
 * whether it is reasoned. A number with a stated basis is evidence of
 * thinking. The same number with an empty basis is evidence of nothing.
 */
const path = require("path");
const ExcelJS = require("exceljs");

const OUT = path.join(__dirname, "ETABLIX-cash-flow-forecast.xlsx");
const MONTHS = 36;

const INK = "FF14181D", GOLD = "FF9C7A3C", SLATE = "FF5B6672";
const FILL_INPUT = "FFFFF6D8";   // the cells you fill
const FILL_HEAD = "FFF0EDE6";
const FILL_TOTAL = "FFEDEFF1";

const wb = new ExcelJS.Workbook();
wb.creator = "ETABLIX — Integrated Site Services";
wb.created = new Date();

/* ------------------------------------------------------------------ */
/* Read me                                                             */
/* ------------------------------------------------------------------ */
const readme = wb.addWorksheet("Read me");
readme.columns = [{ width: 100 }];
const say = (text, o = {}) => {
  const r = readme.addRow([text]);
  r.getCell(1).font = { name: "Arial", size: o.size || 10, bold: o.bold, color: { argb: o.color || INK } };
  r.getCell(1).alignment = { wrapText: true, vertical: "top" };
  r.height = o.height || undefined;
  return r;
};
say("CASH-FLOW FORECAST — how to use this file", { size: 14, bold: true, color: GOLD });
say("");
say("JNN GLOBAL LTD, trading as ETABLIX. Company number 15405437.", { bold: true });
say("");
say("1. Fill every shaded cell on the Assumptions sheet. They are the only cells you type into.");
say("2. Fill the Basis column for every assumption. This is the column that matters. An assessor knows a forecast from a company with no trading history cannot be accurate — what they are testing is whether it is reasoned. A figure with a stated basis is evidence of thinking; the same figure with an empty basis is evidence of nothing.");
say("3. Everything on the Monthly cash flow and Annual summary sheets is a formula. Do not type over a formula — change the assumption behind it.");
say("4. Set the start month on the Assumptions sheet. Every month column is derived from it.");
say("");
say("What to be careful about", { bold: true, color: GOLD });
say("");
say("• A forecast that shows the company never running short of cash is the one an assessor disbelieves first. If the model shows a trough, leave the trough in and say how it is funded. A stated, funded trough reads as competence; a flat line reads as a model that was adjusted until it looked comfortable.");
say("• Payment terms are the whole exercise. Revenue recognised in month 3 and collected in month 5 is a two-month hole that the profit figure does not show. That is what the debtor-days assumption is for, and it is the assumption to be pessimistic about.");
say("• Do not forecast more work than one person can deliver. Multiply the engagement count by the days each takes and check it against the working days available. The model does this for you on row 'Capacity check' — if it turns red, the forecast is claiming capacity the company does not have, and an assessor who spots that discounts everything else.");
say("• Do not put a figure in that you cannot defend in a meeting. You will be asked about exactly one number, and it will be the largest one.");
say("");
say("VAT and tax are modelled simply and are not tax advice. Have the accountant check the file before it is submitted.", { color: SLATE });

/* ------------------------------------------------------------------ */
/* Assumptions                                                         */
/* ------------------------------------------------------------------ */
const a = wb.addWorksheet("Assumptions");
a.columns = [
  { header: "#", width: 5 },
  { header: "Assumption", width: 46 },
  { header: "Value", width: 14 },
  { header: "Unit", width: 14 },
  { header: "Basis — where this number comes from", width: 62 },
];
a.getRow(1).eachCell((c) => {
  c.font = { name: "Arial", size: 10, bold: true, color: { argb: INK } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEAD } };
  c.border = { bottom: { style: "thin", color: { argb: SLATE } } };
});

const REFS = {};
let n = 0;
const section = (title) => {
  const r = a.addRow(["", title, "", "", ""]);
  r.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: GOLD } };
  r.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEAD } };
};
const ass = (key, label, unit, fmt) => {
  n += 1;
  const r = a.addRow([n, label, null, unit, null]);
  const cell = r.getCell(3);
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_INPUT } };
  cell.border = { top: { style: "hair" }, left: { style: "hair" }, bottom: { style: "hair" }, right: { style: "hair" } };
  if (fmt) cell.numFmt = fmt;
  r.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_INPUT } };
  r.getCell(5).alignment = { wrapText: true, vertical: "top" };
  r.eachCell((c) => { if (!c.font) c.font = { name: "Arial", size: 10 }; });
  REFS[key] = `Assumptions!$C$${r.number}`;
  return r;
};

section("Period");
ass("start", "First month of the forecast", "date", "mmm yyyy");

section("Revenue — Model 01 Advisory");
ass("m1_count", "Engagements won per month, steady state", "number", "0.0");
ass("m1_value", "Average engagement value", "£", "#,##0");
ass("m1_days", "Delivery days per engagement", "days", "0.0");
ass("m1_ramp", "Months before steady state is reached", "months", "0");

section("Revenue — Model 02 Management Integrator");
ass("m2_count", "Engagements running concurrently, steady state", "number", "0.0");
ass("m2_fee", "Monthly fee per engagement", "£", "#,##0");
ass("m2_days", "Delivery days per engagement per month", "days", "0.0");
ass("m2_ramp", "Months before steady state is reached", "months", "0");

section("Conversion — be pessimistic here");
ass("enquiries", "Qualified enquiries per month", "number", "0.0");
ass("winrate", "Proportion of enquiries that convert", "%", "0.0%");

section("Collection");
ass("debtordays", "Debtor days — invoice to cash", "days", "0");
ass("baddebt", "Proportion written off", "%", "0.0%");

section("Cost base — monthly");
ass("drawings", "Director's salary and drawings", "£/month", "#,##0");
ass("staff", "Other employment cost", "£/month", "#,##0");
ass("insurance", "Insurance — PI, PL, EL, spread monthly", "£/month", "#,##0");
ass("accountancy", "Accountancy and payroll", "£/month", "#,##0");
ass("software", "Software, hosting and telephony", "£/month", "#,##0");
ass("travel", "Travel and site attendance", "£/month", "#,##0");
ass("marketing", "Marketing and business development", "£/month", "#,##0");
ass("accred", "Accreditation and membership, spread monthly", "£/month", "#,##0");
ass("other", "Everything else", "£/month", "#,##0");
ass("contingency", "Contingency on the cost base", "%", "0.0%");

section("Capacity — this is the honesty check");
ass("workingdays", "Working days available per month, all people", "days", "0.0");

section("Tax and funding");
ass("vatrate", "VAT rate on sales", "%", "0.0%");
ass("vatscheme", "Proportion of input VAT recoverable", "%", "0.0%");
ass("ctrate", "Corporation tax rate on profit", "%", "0.0%");
ass("opening", "Opening cash balance at month 1", "£", "#,##0");
ass("injection", "Director's loan or equity injected at month 1", "£", "#,##0");

a.addRow([]);
const note = a.addRow(["", "Every shaded cell is yours to fill. Leave none of them, and leave no Basis empty — an assumption with no stated basis is the first thing an assessor discounts.", "", "", ""]);
note.getCell(2).font = { name: "Arial", size: 9, italic: true, color: { argb: SLATE } };

/* ------------------------------------------------------------------ */
/* Monthly cash flow                                                   */
/* ------------------------------------------------------------------ */
const cf = wb.addWorksheet("Monthly cash flow");
const col = (i) => cf.getColumn(i + 2).letter;  // month 1 starts at column B

cf.getColumn(1).width = 42;
for (let i = 0; i < MONTHS; i += 1) cf.getColumn(i + 2).width = 12;

const head = cf.addRow(["", ...Array.from({ length: MONTHS }, (_, i) => ({ formula: `EDATE(${REFS.start},${i})` }))]);
head.eachCell((c, i) => {
  c.font = { name: "Arial", size: 9, bold: true, color: { argb: INK } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEAD } };
  if (i > 1) c.numFmt = "mmm yy";
  c.alignment = { horizontal: i > 1 ? "center" : "left" };
});
cf.getCell("A1").value = "Month";
cf.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

const ROW = {};
const line = (key, label, formula, o = {}) => {
  const cells = [label];
  for (let i = 0; i < MONTHS; i += 1) cells.push(formula ? { formula: formula(i, col(i)) } : null);
  const r = cf.addRow(cells);
  r.eachCell((c, i) => {
    c.font = { name: "Arial", size: 9, bold: o.bold, color: { argb: o.color || INK } };
    if (i > 1) c.numFmt = o.numFmt || "#,##0;[Red](#,##0)";
    if (o.fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: o.fill } };
  });
  if (key) ROW[key] = r.number;
  return r;
};
const band = (label) => {
  const r = cf.addRow([label]);
  r.getCell(1).font = { name: "Arial", size: 9, bold: true, color: { argb: GOLD } };
  r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEAD } };
  return r;
};
const blank = () => cf.addRow([]);

band("REVENUE EARNED (accruals — not cash)");
// A linear ramp to steady state, capped at the steady-state figure.
line("m1rev", "Model 01 — advisory",
  (i) => `${REFS.m1_count}*${REFS.m1_value}*MIN(1,(${i}+1)/MAX(1,${REFS.m1_ramp}))`);
line("m2rev", "Model 02 — management integrator",
  (i) => `${REFS.m2_count}*${REFS.m2_fee}*MIN(1,(${i}+1)/MAX(1,${REFS.m2_ramp}))`);
line("rev", "Revenue earned", (i, c) => `SUM(${c}${ROW.m1rev}:${c}${ROW.m2rev})`,
  { bold: true, fill: FILL_TOTAL });
blank();

band("CAPACITY CHECK — does the company have the days to deliver this?");
line("daysneeded", "Delivery days the forecast requires",
  (i) => `${REFS.m1_count}*${REFS.m1_days}*MIN(1,(${i}+1)/MAX(1,${REFS.m1_ramp}))`
       + `+${REFS.m2_count}*${REFS.m2_days}*MIN(1,(${i}+1)/MAX(1,${REFS.m2_ramp}))`,
  { numFmt: "0.0" });
line("daysavail", "Delivery days available", () => `${REFS.workingdays}`, { numFmt: "0.0" });
line("capacity", "Capacity check",
  (i, c) => `IF(${c}${ROW.daysneeded}>${c}${ROW.daysavail},"OVER","ok")`,
  { bold: true, numFmt: "General" });
blank();

band("CASH IN");
// Revenue earned in an earlier month, shifted by the debtor-days assumption.
// Before that lag has elapsed there is nothing to collect, so INDEX runs off
// the front of the row and IFERROR reads it as nil rather than as an error.
line("collect", "Revenue collected",
  (i) => `IFERROR(INDEX($B${ROW.rev}:$${col(MONTHS - 1)}${ROW.rev},1,${i + 1}-ROUND(${REFS.debtordays}/30,0))*(1-${REFS.baddebt}),0)`);
line("vatin", "VAT collected on those receipts", (i, c) => `${c}${ROW.collect}*${REFS.vatrate}`);
line("funding", "Director's loan / equity injected", (i) => (i === 0 ? `${REFS.injection}` : `0`));
line("cashin", "Total cash in",
  (i, c) => `${c}${ROW.collect}+${c}${ROW.vatin}+${c}${ROW.funding}`,
  { bold: true, fill: FILL_TOTAL });
blank();

band("CASH OUT");
line("cdraw", "Director's salary and drawings", () => `${REFS.drawings}`);
line("cstaff", "Other employment cost", () => `${REFS.staff}`);
line("cins", "Insurance", () => `${REFS.insurance}`);
line("cacc", "Accountancy and payroll", () => `${REFS.accountancy}`);
line("csoft", "Software, hosting and telephony", () => `${REFS.software}`);
line("ctrav", "Travel and site attendance", () => `${REFS.travel}`);
line("cmkt", "Marketing and business development", () => `${REFS.marketing}`);
line("caccr", "Accreditation and membership", () => `${REFS.accred}`);
line("coth", "Everything else", () => `${REFS.other}`);
line("ccont", "Contingency",
  (i, c) => `SUM(${c}${ROW.cdraw}:${c}${ROW.coth})*${REFS.contingency}`);
line("costs", "Operating cost",
  (i, c) => `SUM(${c}${ROW.cdraw}:${c}${ROW.ccont})`, { bold: true });
line("vatout", "VAT paid on costs",
  (i, c) => `${c}${ROW.costs}*${REFS.vatrate}*${REFS.vatscheme}`);
// A quarter is settled in the month it ends. The month index is fixed when
// the sheet is written, so the decision is made here rather than left to a
// MOD() that would evaluate to the same constant in every recalculation.
line("vatpay", "VAT paid over to HMRC (quarterly)",
  (i) => {
    if ((i + 1) % 3 !== 0) return `0`;
    const q = [col(i - 2), col(i - 1), col(i)];
    return `SUM(${q.map((x) => `${x}${ROW.vatin}`).join(",")})-SUM(${q.map((x) => `${x}${ROW.vatout}`).join(",")})`;
  });
// Corporation tax on a 12-month period falls due nine months and a day after
// the period ends: the year to month 12 is paid in month 22, the year to
// month 24 in month 34. Loss-making years pay nothing and do not carry the
// loss forward here — if the model shows a loss, take the number from the
// accountant rather than from this sheet.
line("ct", "Corporation tax paid",
  (i) => {
    const m = i + 1;
    if (m < 22 || (m - 22) % 12 !== 0) return `0`;
    const y = (m - 22) / 12;
    const from = col(y * 12), to = col(y * 12 + 11);
    return `MAX(0,SUM(${from}${ROW.rev}:${to}${ROW.rev})-SUM(${from}${ROW.costs}:${to}${ROW.costs}))*${REFS.ctrate}`;
  });
line("cashout", "Total cash out",
  (i, c) => `${c}${ROW.costs}+${c}${ROW.vatout}+${c}${ROW.vatpay}+${c}${ROW.ct}`,
  { bold: true, fill: FILL_TOTAL });
blank();

band("CASH POSITION");
line("open", "Opening balance",
  (i, c) => (i === 0 ? `${REFS.opening}` : `${col(i - 1)}${ROW.close === undefined ? 0 : ROW.close}`));
line("move", "Net movement", (i, c) => `${c}${ROW.cashin}-${c}${ROW.cashout}`);
const closeRow = line("close", "Closing balance",
  (i, c) => `${c}${ROW.open}+${c}${ROW.move}`,
  { bold: true, fill: FILL_TOTAL });
// The opening row referenced the closing row before it existed; rewrite it now.
for (let i = 1; i < MONTHS; i += 1) {
  cf.getCell(`${col(i)}${ROW.open}`).value = { formula: `${col(i - 1)}${closeRow.number}` };
}
line("low", "Lowest point reached to date",
  (i, c) => `MIN($B${closeRow.number}:${c}${closeRow.number})`, { color: GOLD });

/* ------------------------------------------------------------------ */
/* Annual summary                                                      */
/* ------------------------------------------------------------------ */
const yr = wb.addWorksheet("Annual summary");
yr.columns = [
  { header: "", width: 42 },
  { header: "Year 1", width: 16 },
  { header: "Year 2", width: 16 },
  { header: "Year 3", width: 16 },
];
yr.getRow(1).eachCell((c) => {
  c.font = { name: "Arial", size: 10, bold: true };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEAD } };
});
const span = (y) => `'Monthly cash flow'!${col(y * 12)}%R%:'Monthly cash flow'!${col(y * 12 + 11)}%R%`;
const yline = (label, row, o = {}) => {
  const r = yr.addRow([label,
    { formula: `SUM(${span(0).replace(/%R%/g, row)})` },
    { formula: `SUM(${span(1).replace(/%R%/g, row)})` },
    { formula: `SUM(${span(2).replace(/%R%/g, row)})` }]);
  r.eachCell((c, i) => {
    c.font = { name: "Arial", size: 10, bold: o.bold };
    if (i > 1) c.numFmt = "#,##0;[Red](#,##0)";
    if (o.fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: o.fill } };
  });
  return r;
};
const rev = yline("Revenue earned", ROW.rev, { bold: true });
const cost = yline("Operating cost", ROW.costs);
const profit = yr.addRow(["Profit before tax",
  { formula: `B${rev.number}-B${cost.number}` },
  { formula: `C${rev.number}-C${cost.number}` },
  { formula: `D${rev.number}-D${cost.number}` }]);
profit.eachCell((c, i) => {
  c.font = { name: "Arial", size: 10, bold: true };
  if (i > 1) c.numFmt = "#,##0;[Red](#,##0)";
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_TOTAL } };
});
yr.addRow([]);
yline("Cash collected", ROW.collect);
const end = yr.addRow(["Closing cash at year end",
  { formula: `'Monthly cash flow'!${col(11)}${closeRow.number}` },
  { formula: `'Monthly cash flow'!${col(23)}${closeRow.number}` },
  { formula: `'Monthly cash flow'!${col(35)}${closeRow.number}` }]);
end.eachCell((c, i) => {
  c.font = { name: "Arial", size: 10, bold: true };
  if (i > 1) c.numFmt = "#,##0;[Red](#,##0)";
});
const trough = yr.addRow(["Lowest cash position in the year",
  { formula: `MIN('Monthly cash flow'!B${closeRow.number}:'Monthly cash flow'!${col(11)}${closeRow.number})` },
  { formula: `MIN('Monthly cash flow'!${col(12)}${closeRow.number}:'Monthly cash flow'!${col(23)}${closeRow.number})` },
  { formula: `MIN('Monthly cash flow'!${col(24)}${closeRow.number}:'Monthly cash flow'!${col(35)}${closeRow.number})` }]);
trough.eachCell((c, i) => {
  c.font = { name: "Arial", size: 10, bold: true, color: { argb: GOLD } };
  if (i > 1) c.numFmt = "#,##0;[Red](#,##0)";
});
yr.addRow([]);
const warn = yr.addRow(["The lowest cash position is the number an assessor looks for. If it is negative, say in the narrative how it is funded — a stated, funded trough reads as competence. A model with no trough at all reads as a model that was adjusted until it looked comfortable."]);
warn.getCell(1).font = { name: "Arial", size: 9, italic: true, color: { argb: SLATE } };
warn.getCell(1).alignment = { wrapText: true, vertical: "top" };
yr.mergeCells(`A${warn.number}:D${warn.number}`);
yr.getRow(warn.number).height = 42;

wb.xlsx.writeFile(OUT).then(() => console.log(`wrote ${OUT}`));
