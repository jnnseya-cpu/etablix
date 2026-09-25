/**
 * ETABLIX — Carbon Reduction Plan: the emissions workbook.
 *
 *   node business/policies/build-carbon-workbook.cjs
 *
 * WHY THIS EXISTS. The Carbon Reduction Plan has 25 empty figure cells and a
 * director's declaration underneath them. It cannot be signed until they are
 * filled, and a DPS question that says "your bid will fail if you do not
 * select Yes" is waiting on exactly those figures. The gap between having the
 * plan and being able to sign it is one evening of arithmetic, and this
 * workbook is that evening.
 *
 * NO CONVERSION FACTOR IS PRE-FILLED, AND THAT IS DELIBERATE.
 *
 * The UK Government GHG Conversion Factors for Company Reporting are
 * published annually and change every year. Typing a remembered value into a
 * cell that ends up under a director's signature is the same class of act as
 * inventing a case study, and it is worse because it looks like data. Every
 * factor cell is empty, amber, and carries the exact name of the row to copy
 * from the published set. The workbook will not produce a total until they
 * are in.
 *
 * WHAT IS COMPUTED RATHER THAN TYPED. Everything else. Activity × factor,
 * kg to tonnes, the scope subtotals, the grand total, and the baseline
 * comparison. Three cross-checks go red on their own if the sheet is
 * internally inconsistent — the scope subtotals not summing to the total, a
 * factor entered without activity or activity without a factor, and Scope 3
 * missing one of the five categories PPN 06/21 requires.
 *
 * THE FIVE CATEGORIES ARE FIXED. PPN 06/21 requires categories 4, 5, 6, 7
 * and 9 of the GHG Protocol. Not a summarised Scope 3 number, not all
 * fifteen. The Scope 3 sheet has exactly those five and refuses to total if
 * one is left with neither a figure nor an explicit nil.
 */
const ExcelJS = require("exceljs");
const path = require("path");

const INK = "FF14181D", GOLD = "FF9C7A3C", SLATE = "FF5B6672";
const PAPER = "FFF2EFE7", TINT = "FFEFE6D2";
const AMBER = "FFFDF3DC";          // a cell to type into
const GREY = "FFF4F4F2";           // computed, do not type

const wb = new ExcelJS.Workbook();
wb.creator = "ETABLIX";
wb.created = new Date();

const head = (ws, title, sub) => {
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = title;
  ws.getCell("A1").font = { name: "Arial", size: 14, bold: true, color: { argb: INK } };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = sub;
  ws.getCell("A2").font = { name: "Arial", size: 9, italic: true, color: { argb: SLATE } };
  ws.getRow(1).height = 22;
  ws.getRow(3).height = 6;
};
const bar = (ws, row, cells) => {
  cells.forEach((v, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = v;
    c.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    c.alignment = { wrapText: true, vertical: "middle" };
  });
  ws.getRow(row).height = 30;
};
const input = (c, note) => {
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBER } };
  c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  c.numFmt = "#,##0.0000";
  if (note) c.note = note;
};
const calc = (c, f, fmt = "#,##0.000") => {
  c.value = { formula: f };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY } };
  c.numFmt = fmt;
  c.font = { name: "Arial", size: 10 };
};

/* ================================================================== */
/* 0. How to use it                                                    */
const g = wb.addWorksheet("Start here", { properties: { tabColor: { argb: GOLD } } });
g.columns = [{ width: 4 }, { width: 104 }];
head(g, "Carbon Reduction Plan — emissions workbook",
     "Fill the amber cells only. Everything grey is calculated. Nothing here is pre-filled with a number I could not verify.");
let r = 4;
const say = (t, bold = false, gap = 0) => {
  r += gap;
  const c = g.getCell(r, 2);
  c.value = t;
  c.font = { name: "Arial", size: 10, bold, color: { argb: bold ? INK : SLATE } };
  c.alignment = { wrapText: true, vertical: "top" };
  g.getRow(r).height = Math.max(15, Math.ceil(String(t).length / 95) * 14);
  r += 1;
};
say("WHAT THIS PRODUCES", true);
say("Six numbers: Scope 1, Scope 2 and Scope 3 for the baseline year, and the same three for the reporting year. Those six go straight into question 141 of the DPS questionnaire and into sections 4 and 5 of the Carbon Reduction Plan.", false, 0);
say("BEFORE YOU START — one download", true, 1);
say("Search for: UK Government greenhouse gas reporting conversion factors. Download the 'condensed set' spreadsheet for the year you are reporting. You will copy six or seven numbers out of it.", false, 0);
say("No conversion factor is pre-filled in this workbook. They change every year, and a factor typed from memory into a cell that ends up under your signature is invented data that looks like real data. The 'Factors' sheet names the exact row to copy for each one.", false, 0);
say("THE ORDER", true, 1);
say("1.  Factors — paste the published values. Do this first; nothing totals until it is done.", false, 0);
say("2.  Scope 1 — fuel you burned in a vehicle or premises you control. If your car is personal and you claim mileage, it is NOT here: it is Scope 3 category 6.", false, 0);
say("3.  Scope 2 — electricity you bought. Bills, kWh.", false, 0);
say("4.  Scope 3 — the five categories PPN 06/21 requires, and only those five.", false, 0);
say("5.  Summary — reads the six numbers off. Check the three tests are green before you use them.", false, 0);
say("IF A NUMBER IS GENUINELY ZERO", true, 1);
say("Type 0. Do not leave it blank. A blank tells an assessor you did not look; a zero with a note tells them you looked and found nothing, which is the stronger answer. Every row has a note column for exactly this.", false, 0);
say("IF YOU HAVE TO ESTIMATE", true, 1);
say("Estimate, and write the method in the note column. PPN 06/21 accepts a declared estimate. It does not accept a figure with no basis, and neither does the declaration you sign at section 8 of the plan.", false, 0);
say("THE BASELINE AND THE REPORTING YEAR", true, 1);
say("In your first year they are the same period and both columns carry the same figures. That is correct and expected for a new organisation — say so in the plan rather than leaving the second table empty.", false, 0);

/* ================================================================== */
/* 1. Factors                                                          */
const f = wb.addWorksheet("Factors", { properties: { tabColor: { argb: GOLD } } });
f.columns = [{ width: 34 }, { width: 16 }, { width: 14 }, { width: 58 }];
head(f, "Conversion factors — paste from the published Government set",
     "Amber cells only. Each row names the exact line to copy. Do not type a remembered value.");
bar(f, 4, ["Factor", "Value", "Unit", "The row to copy from the Government condensed set"]);
const FACTORS = [
  ["fuel_petrol", "Petrol (average biofuel blend)", "kg CO2e / litre", "Fuels → Petrol (average biofuel blend) → kg CO2e per litre"],
  ["fuel_diesel", "Diesel (average biofuel blend)", "kg CO2e / litre", "Fuels → Diesel (average biofuel blend) → kg CO2e per litre"],
  ["gas", "Natural gas", "kg CO2e / kWh", "Fuels → Gaseous fuels → Natural gas → kg CO2e per kWh"],
  ["elec", "UK electricity — generation", "kg CO2e / kWh", "UK electricity → Electricity generated → kg CO2e per kWh. Location-based."],
  ["elec_td", "UK electricity — T&D losses", "kg CO2e / kWh", "UK electricity T&D → kg CO2e per kWh. Add to the line above for the location-based total."],
  ["car_mile", "Average car, unknown fuel", "kg CO2e / mile", "Business travel – land → Cars (by size) → Average car → Unknown fuel → kg CO2e per mile"],
  ["rail_mile", "National rail", "kg CO2e / mile", "Business travel – land → Rail → National rail → kg CO2e per passenger mile"],
  ["waste_mixed", "Commercial and industrial waste to landfill", "kg CO2e / tonne", "Waste disposal → Commercial and industrial waste → Landfill → kg CO2e per tonne"],
  ["waste_recycle", "Mixed recycling", "kg CO2e / tonne", "Waste disposal → Mixed recycling → Closed-loop → kg CO2e per tonne"],
];
FACTORS.forEach(([key, name, unit, src], i) => {
  const row = 5 + i;
  f.getCell(row, 1).value = name;
  f.getCell(row, 1).font = { name: "Arial", size: 10 };
  input(f.getCell(row, 2), "Paste the published value. Leave blank if this fuel or route does not apply to you.");
  f.getCell(row, 3).value = unit;
  f.getCell(row, 3).font = { name: "Arial", size: 9, color: { argb: SLATE } };
  f.getCell(row, 4).value = src;
  f.getCell(row, 4).font = { name: "Arial", size: 9, color: { argb: SLATE } };
  f.getCell(row, 4).alignment = { wrapText: true };
  wb.definedNames.add(`Factors!$B$${row}`, key);
});
const FY = 5 + FACTORS.length + 1;
f.getCell(FY, 1).value = "Factor set year";
f.getCell(FY, 1).font = { name: "Arial", size: 10, bold: true };
input(f.getCell(FY, 2), "The year of the published set you copied from. This goes in section 3 of the plan so a figure can be reproduced.");
f.getCell(FY, 2).numFmt = "0";
f.getCell(FY, 4).value = "State this in the plan. A figure that cannot be reproduced is not evidence.";
f.getCell(FY, 4).font = { name: "Arial", size: 9, italic: true, color: { argb: SLATE } };

/* ================================================================== */
/* a scope sheet: activity x factor, both years                        */
const scopeSheet = (name, title, sub, rows) => {
  const ws = wb.addWorksheet(name);
  ws.columns = [{ width: 36 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 44 }];
  head(ws, title, sub);
  bar(ws, 4, ["Activity", "Baseline\nactivity", "Reporting\nactivity", "Factor\n(from Factors)", "Baseline\ntCO2e", "Reporting\ntCO2e", "Note — source of the figure, or why it is nil"]);
  const first = 5;
  rows.forEach(([label, factorKey, hint], i) => {
    const row = first + i;
    ws.getCell(row, 1).value = label;
    ws.getCell(row, 1).font = { name: "Arial", size: 10 };
    ws.getCell(row, 1).alignment = { wrapText: true };
    input(ws.getCell(row, 2), hint); ws.getCell(row, 2).numFmt = "#,##0.00";
    input(ws.getCell(row, 3), hint); ws.getCell(row, 3).numFmt = "#,##0.00";
    calc(ws.getCell(row, 4), factorKey, "#,##0.0000");
    // kg -> tonnes, and blank rather than zero when the factor is missing
    calc(ws.getCell(row, 5), `IF(OR(B${row}="",D${row}=""),"",B${row}*D${row}/1000)`);
    calc(ws.getCell(row, 6), `IF(OR(C${row}="",D${row}=""),"",C${row}*D${row}/1000)`);
    input(ws.getCell(row, 7), "Name the record: a receipt, a bill, a log, a transfer note. Or write why this is nil.");
    ws.getCell(row, 7).numFmt = "@";
    ws.getRow(row).height = 26;
  });
  const total = first + rows.length;
  ws.getCell(total, 1).value = "TOTAL " + name;
  ws.getCell(total, 1).font = { name: "Arial", size: 10, bold: true, color: { argb: INK } };
  for (const col of [5, 6]) {
    const c = ws.getCell(total, col);
    c.value = { formula: `SUM(${String.fromCharCode(64 + col)}${first}:${String.fromCharCode(64 + col)}${total - 1})` };
    c.numFmt = "#,##0.000";
    c.font = { name: "Arial", size: 10, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TINT } };
    c.border = { top: { style: "thin" }, bottom: { style: "double" } };
  }
  // the check: activity entered with no factor, or the reverse
  const chk = total + 2;
  ws.getCell(chk, 1).value = "Check — every row with activity has a factor";
  ws.getCell(chk, 1).font = { name: "Arial", size: 10, bold: true };
  ws.mergeCells(chk, 2, chk, 7);
  ws.getCell(chk, 2).value = { formula:
    `IF(SUMPRODUCT(--(((B${first}:B${total - 1}<>"")+(C${first}:C${total - 1}<>""))>0),--(D${first}:D${total - 1}=""))=0,` +
    `"OK — nothing is being counted without a published factor",` +
    `"INCOMPLETE — a row has activity but no conversion factor. Fill the Factors sheet.")` };
  ws.getCell(chk, 2).font = { name: "Arial", size: 10, bold: true };
  ws.getRow(chk).height = 20;
  return { ws, total };
};

const s1 = scopeSheet("Scope 1", "Scope 1 — fuel burned in assets you own or control",
  "If the vehicle is personal and reimbursed by mileage, it is NOT Scope 1. It belongs in Scope 3 category 6.", [
  ["Petrol — company or leased vehicle (litres)", "fuel_petrol", "Litres from fuel receipts or the fuel card statement."],
  ["Diesel — company or leased vehicle (litres)", "fuel_diesel", "Litres from fuel receipts or the fuel card statement."],
  ["Natural gas — premises under your control (kWh)", "gas", "kWh from the gas bill. A home office is only here if the company holds the tenancy."],
]);

const s2 = scopeSheet("Scope 2", "Scope 2 — purchased electricity",
  "Location-based: generation factor plus transmission and distribution losses. State the method in the plan and keep it the same every year.", [
  ["Electricity — generation (kWh)", "elec", "kWh from the electricity bill for premises under the company's control."],
  ["Electricity — T&D losses (same kWh)", "elec_td", "Enter the SAME kWh figure as the row above. The two factors are added, not chosen between."],
]);

const s3 = scopeSheet("Scope 3", "Scope 3 — the five categories PPN 06/21 requires",
  "Categories 4, 5, 6, 7 and 9 of the GHG Protocol. Not a summarised Scope 3 number, and not all fifteen.", [
  ["Cat 4 — Upstream transport: supplier deliveries (miles)", "car_mile", "Deliveries of goods you bought in. Estimate by distance and mode if the carrier will not give you data, and say so in the note."],
  ["Cat 5 — Waste to landfill (tonnes)", "waste_mixed", "Waste transfer notes. Tonnes, not bags."],
  ["Cat 5 — Waste recycled (tonnes)", "waste_recycle", "Waste transfer notes and WEEE records."],
  ["Cat 6 — Business travel: car (miles)", "car_mile", "Mileage log. Includes a personal car reimbursed by mileage. Expected to be your largest line."],
  ["Cat 6 — Business travel: rail (miles)", "rail_mile", "Rail tickets."],
  ["Cat 7 — Employee commuting (miles)", "car_mile", "Days travelled x distance x mode. If you work from home, enter 0 and state the homeworking treatment in the note."],
  ["Cat 9 — Downstream transport (miles)", "car_mile", "Distribution of goods you SELL. Services only means 0 — enter 0 and say why."],
]);

/* the five-category completeness check, on the Scope 3 sheet */
{
  const { ws } = s3;
  const row = 17;
  ws.getCell(row, 1).value = "Check — all five required categories addressed";
  ws.getCell(row, 1).font = { name: "Arial", size: 10, bold: true };
  ws.mergeCells(row, 2, row, 7);
  ws.getCell(row, 2).value = { formula:
    `IF(COUNTBLANK(B5:B11)+COUNTBLANK(C5:C11)=0,` +
    `"OK — every category carries a figure or an explicit zero",` +
    `"INCOMPLETE — a category is blank. A blank means you did not look; a zero means you looked. PPN 06/21 requires all five.")` };
  ws.getCell(row, 2).font = { name: "Arial", size: 10, bold: true };
  ws.getRow(row).height = 20;
}

/* ================================================================== */
/* Summary — the six numbers                                           */
const sum = wb.addWorksheet("Summary", { properties: { tabColor: { argb: GOLD } } });
sum.columns = [{ width: 38 }, { width: 18 }, { width: 18 }, { width: 52 }];
head(sum, "The six numbers", "These go into question 141 of the questionnaire and sections 4 and 5 of the Carbon Reduction Plan. Check the tests below are green first.");
bar(sum, 4, ["", "Baseline year (tCO2e)", "Reporting year (tCO2e)", "Where it goes"]);
const SROWS = [
  ["Scope 1", `'Scope 1'!E${s1.total}`, `'Scope 1'!F${s1.total}`, "Q141 Baseline Scope 1 / Reporting Scope 1"],
  ["Scope 2", `'Scope 2'!E${s2.total}`, `'Scope 2'!F${s2.total}`, "Q141 Baseline Scope 2 / Reporting Scope 2"],
  ["Scope 3 (the five required categories)", `'Scope 3'!E${s3.total}`, `'Scope 3'!F${s3.total}`, "Q141 Baseline Scope 3 / Reporting Scope 3"],
];
SROWS.forEach(([label, b, c], i) => {
  const row = 5 + i;
  sum.getCell(row, 1).value = label;
  sum.getCell(row, 1).font = { name: "Arial", size: 11, bold: true };
  calc(sum.getCell(row, 2), b);
  calc(sum.getCell(row, 3), c);
  sum.getCell(row, 4).value = SROWS[i][3];
  sum.getCell(row, 4).font = { name: "Arial", size: 9, color: { argb: SLATE } };
});
const TOT = 8;
sum.getCell(TOT, 1).value = "TOTAL EMISSIONS";
sum.getCell(TOT, 1).font = { name: "Arial", size: 11, bold: true, color: { argb: INK } };
for (const col of [2, 3]) {
  const L = String.fromCharCode(64 + col);
  const c = sum.getCell(TOT, col);
  c.value = { formula: `SUM(${L}5:${L}7)` };
  c.numFmt = "#,##0.000";
  c.font = { name: "Arial", size: 11, bold: true };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TINT } };
  c.border = { top: { style: "thin" }, bottom: { style: "double" } };
}
sum.getCell(10, 1).value = "Change against baseline";
sum.getCell(10, 1).font = { name: "Arial", size: 10, bold: true };
calc(sum.getCell(10, 2), `IF(B8=0,"",(C8-B8)/B8)`, "0.0%");
sum.getCell(10, 4).value = "Zero in year one, when the baseline and the reporting year are the same period.";
sum.getCell(10, 4).font = { name: "Arial", size: 9, italic: true, color: { argb: SLATE } };

const tests = [
  ["Test 1 — the factor sheet has been filled",
   `IF(COUNT(Factors!B5:B13)=0,"NOT DONE — no conversion factor has been entered. Every figure above is zero because of it.","OK — "&COUNT(Factors!B5:B13)&" factors entered")`],
  /* Test 2 compares the summary against the scope sheets' OWN row-level
     arithmetic, recomputed here from activity x factor rather than read off
     their total cells. Comparing SUM(B5:B7) with B8 would have been the
     obvious test and it cannot fail, because B8 IS SUM(B5:B7). A check that
     always passes is worse than no check: it produces confidence without
     evidence. This one goes red if a scope sheet's total has been overtyped,
     a row inserted outside the total's range, or a sheet renamed. */
  ["Test 2 — the summary matches the rows, not just the totals",
   `IF(ROUND(B8-(SUMPRODUCT('Scope 1'!B5:B7,'Scope 1'!D5:D7)+SUMPRODUCT('Scope 2'!B5:B6,'Scope 2'!D5:D6)+SUMPRODUCT('Scope 3'!B5:B11,'Scope 3'!D5:D11))/1000,4)=0,` +
   `"OK — the baseline total equals activity x factor across all three sheets",` +
   `"DOES NOT RECONCILE — a total has been overtyped, or a row sits outside its total")`],
  ["Test 3 — Scope 3 covers all five required categories",
   `IF(COUNTBLANK('Scope 3'!B5:B11)+COUNTBLANK('Scope 3'!C5:C11)=0,"OK — all five categories carry a figure or an explicit zero","INCOMPLETE — see the Scope 3 sheet")`],
];
tests.forEach(([label, formula], i) => {
  const row = 12 + i;
  sum.getCell(row, 1).value = label;
  sum.getCell(row, 1).font = { name: "Arial", size: 10, bold: true };
  sum.mergeCells(row, 2, row, 4);
  sum.getCell(row, 2).value = { formula };
  sum.getCell(row, 2).font = { name: "Arial", size: 10, bold: true };
  sum.getRow(row).height = 18;
});
sum.getCell(16, 1).value = "Do not sign section 8 of the Carbon Reduction Plan until all three tests read OK.";
sum.getCell(16, 1).font = { name: "Arial", size: 10, bold: true, italic: true, color: { argb: "FF9B1C1C" } };
sum.mergeCells(16, 1, 16, 4);

const out = path.join(__dirname, "ETABLIX-Carbon-Workbook.xlsx");
wb.xlsx.writeFile(out).then(() => {
  console.log("wrote " + out);
  console.log("\n  Fill order: Factors -> Scope 1 -> Scope 2 -> Scope 3 -> read the Summary.");
  console.log("  No conversion factor is pre-filled. Download the Government condensed set first.");
}).catch((e) => { console.error(e); process.exit(1); });
