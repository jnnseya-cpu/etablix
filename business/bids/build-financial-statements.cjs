/**
 * The financial documents for the CHIC resubmission, as a working workbook.
 *
 *   node business/bids/build-financial-statements.cjs
 *   → business/bids/ETABLIX-financial-statements.xlsx
 *
 * CHIC asked for "one or more of" a statement of turnover, a profit and loss
 * account, a balance sheet, a cash flow statement, or a guarantor statement.
 * This file carries the first four. Providing four retires the guarantor
 * option entirely, which is the only one that needs a third party's consent.
 *
 * IT CONTAINS NO NUMBERS. Every figure is either a cell the director fills
 * from the company's own bank statements and records, or a formula that reads
 * from those cells. That is deliberate. A set of accounts an assessor can see
 * was assembled from invented figures is worse than no accounts at all.
 *
 * The structure follows the order the work actually happens in:
 *
 *   Bank analysis      every line off the bank statement, categorised once
 *   Income and expenditure   accruals basis, starting from those categories
 *   Statement of financial position   what is owned and owed at a date
 *   Cash flow statement      the same bank data, reorganised
 *
 * Three cross-checks tie it together, and they are the reason the pack is
 * credible rather than merely tidy:
 *
 *   1. net assets must equal capital and reserves
 *   2. closing bank on the cash flow must equal cash at bank on the
 *      statement of financial position
 *   3. retained earnings must equal the result for the period
 *
 * If all three read OK, the figures are internally consistent and an
 * assessor can see that without recomputing anything.
 */
const path = require("path");
const ExcelJS = require("exceljs");

const OUT = path.join(__dirname, "ETABLIX-financial-statements.xlsx");

const INK = "FF14181D", GOLD = "FF9C7A3C", SLATE = "FF5B6672";
const FILL_IN = "FFFDF7EA";   // cells the director fills
const FILL_HEAD = "FFF0EDE6";
const FILL_TOT = "FFEDEFF1";
const MONEY = "#,##0;(#,##0);\"—\"";

const font = (o = {}) => ({
  name: "Arial", size: o.size || 10, bold: !!o.bold, italic: !!o.italic,
  color: { argb: o.color || INK },
});
const solid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

const wb = new ExcelJS.Workbook();
wb.creator = "ETABLIX — Integrated Site Services";
wb.company = "JNN GLOBAL LTD";
wb.created = new Date();

/* =================================================================== */
/* The bank analysis categories. Everything downstream reads these, so  */
/* they are declared once and never retyped.                            */
/* =================================================================== */
const IN = [
  "Customer receipts",
  "Share capital introduced",
  "Director's loan introduced",
  "Grants received",
  "VAT refunded",
  "Other receipts",
];
const OUT_ = [
  "Subcontractors",
  "Materials and plant",
  "Salary and PAYE",
  "Insurance",
  "Professional fees",
  "Software and subscriptions",
  "Equipment purchased",
  "Marketing and website",
  "Travel and subsistence",
  "Telephone and internet",
  "Bank charges",
  "Training and accreditation",
  "HMRC payments",
  "Director's loan repaid",
  "Other payments",
];
const BANK = "'Bank analysis'";
const cashIn = (cat) => `SUMIF(${BANK}!$E:$E,"${cat}",${BANK}!$C:$C)`;
const cashOut = (cat) => `SUMIF(${BANK}!$E:$E,"${cat}",${BANK}!$D:$D)`;
const cashOutSum = (cats) => cats.map(cashOut).join("+");

/* =================================================================== */
/* A statement sheet. Column C is the statement. Columns E onward are    */
/* working notes and sit outside the print area, so what prints is a     */
/* statement and not a worksheet.                                        */
/* =================================================================== */
function statement(name, meta) {
  const ws = wb.addWorksheet(name);
  ws.columns = [
    { width: 3 },    // A  indent
    { width: 52 },   // B  line description
    { width: 15 },   // C  £  — this is the statement
    { width: 3 },    // D  spacer
    { width: 17 },   // E  working: the cash-basis figure, for reference
    { width: 64 },   // F  working: where this figure comes from
  ];

  const at = {};   // label → row number, for cross-sheet references
  let last = 0;
  const row = (cells) => { const r = ws.addRow(cells); last = r.number; return r; };

  const title = (t, s) => {
    const r1 = row(["", t]);
    r1.getCell(2).font = font({ size: 15, bold: true, color: GOLD });
    r1.height = 22;
    const r2 = row(["", s]);
    r2.getCell(2).font = font({ size: 10, color: SLATE });
    row([]);
  };

  const note = (t) => {
    const r = row(["", t]);
    r.getCell(2).font = font({ size: 9, italic: true, color: SLATE });
    r.getCell(2).alignment = { wrapText: true, vertical: "top" };
    ws.mergeCells(`B${r.number}:C${r.number}`);
    r.height = 26;
    return r;
  };

  const section = (t) => {
    row([]);
    const r = row(["", t.toUpperCase()]);
    r.getCell(2).font = font({ size: 9, bold: true, color: GOLD });
    r.getCell(2).fill = solid(FILL_HEAD);
    r.getCell(3).fill = solid(FILL_HEAD);
    return r;
  };

  // a figure the director types in
  const input = (key, label, o = {}) => {
    const r = row(["", label]);
    r.getCell(2).font = font();
    const c = r.getCell(3);
    c.numFmt = MONEY;
    c.font = font();
    c.fill = solid(FILL_IN);
    c.border = { bottom: { style: "hair", color: { argb: "FFD8D3C6" } } };
    if (o.cash) { const e = r.getCell(5); e.value = { formula: o.cash }; e.numFmt = MONEY; e.font = font({ size: 9, color: SLATE }); }
    if (o.from) { const f = r.getCell(6); f.value = o.from; f.font = font({ size: 9, color: SLATE }); f.alignment = { wrapText: true, vertical: "top" }; }
    at[key] = r.number;
    return r;
  };

  // a figure that is computed
  const calc = (key, label, formula, o = {}) => {
    const r = row(["", label]);
    r.getCell(2).font = font({ bold: !!o.bold });
    const c = r.getCell(3);
    c.value = { formula };
    c.numFmt = MONEY;
    c.font = font({ bold: !!o.bold });
    if (o.rule === "single") c.border = { top: { style: "thin", color: { argb: SLATE } } };
    if (o.rule === "double") c.border = { top: { style: "thin", color: { argb: SLATE } }, bottom: { style: "double", color: { argb: INK } } };
    if (o.fill) c.fill = solid(FILL_TOT);
    if (o.from) { const f = r.getCell(6); f.value = o.from; f.font = font({ size: 9, color: SLATE }); f.alignment = { wrapText: true, vertical: "top" }; }
    at[key] = r.number;
    return r;
  };

  const check = (label, formula) => {
    row([]);
    const r = row(["", label]);
    r.getCell(2).font = font({ size: 9, bold: true, color: SLATE });
    const c = r.getCell(3);
    c.value = { formula };
    c.font = font({ size: 9, bold: true });
    c.alignment = { horizontal: "center" };
    // green when it reconciles, red when it does not
    ws.addConditionalFormatting({
      ref: `C${r.number}`,
      rules: [
        { type: "containsText", operator: "containsText", text: "OK", priority: 1,
          style: { font: { color: { argb: "FF1E6B34" }, bold: true }, fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFE6F2E8" } } } },
        { type: "containsText", operator: "containsText", text: "DOES NOT", priority: 2,
          style: { font: { color: { argb: "FF9B1C1C" }, bold: true }, fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFBE9E9" } } } },
      ],
    });
    return r;
  };

  const sign = () => {
    row([]);
    row([]);
    const a = row(["", "Approved by the director and signed on behalf of the board."]);
    a.getCell(2).font = font({ size: 9, color: SLATE });
    row([]);
    ["Signed", "Name", "Date"].forEach((l) => {
      const r = row(["", l + ":"]);
      r.getCell(2).font = font({ size: 10 });
      r.getCell(3).fill = solid(FILL_IN);
      r.getCell(3).border = { bottom: { style: "thin", color: { argb: SLATE } } };
      r.height = 20;
    });
  };

  const finish = () => {
    ws.pageSetup = {
      paperSize: 9, orientation: "portrait",
      fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      printArea: `A1:C${last}`,
      margins: { left: 0.8, right: 0.55, top: 0.85, bottom: 0.7, header: 0.3, footer: 0.3 },
    };
    ws.headerFooter = {
      oddHeader: `&R&"Arial,Regular"&8ETABLIX · ${meta.head}`,
      oddFooter: '&L&"Arial,Regular"&8JNN GLOBAL LTD · unaudited management information&R&"Arial,Regular"&8Page &P of &N',
    };
    ws.views = [{ showGridLines: false }];
  };

  return { ws, at, row, title, note, section, input, calc, check, sign, finish };
}

/* =================================================================== */
/* 0. Basis of preparation — the label that makes all of this safe       */
/* =================================================================== */
const cover = wb.addWorksheet("Basis of preparation");
cover.columns = [{ width: 4 }, { width: 96 }];
cover.views = [{ showGridLines: false }];
const cv = (t, o = {}) => {
  const r = cover.addRow(["", t]);
  r.getCell(2).font = font(o);
  r.getCell(2).alignment = { wrapText: true, vertical: "top" };
  if (o.height) r.height = o.height;
  return r;
};
cover.addRow([]);
cv("ETABLIX", { size: 20, bold: true, color: GOLD, height: 28 });
cv("Integrated Site Services", { size: 10, color: SLATE });
cover.addRow([]);
cv("FINANCIAL INFORMATION", { size: 15, bold: true, height: 22 });
cv("Prepared for CHIC in support of the Development Dynamic Purchasing System application", { size: 10, color: SLATE });
cover.addRow([]);
cv("Basis of preparation", { size: 11, bold: true, color: GOLD });
cover.addRow([]);
cv("Management information prepared by the director from the company's own records. Unaudited. JNN GLOBAL LTD has not yet reached its first accounting reference date, so no statutory accounts are yet due or filed at Companies House.", { bold: true, height: 32 });
cover.addRow([]);
cv("The figures in this pack are drawn from the company's bank statements, sales and purchase records, and asset register. They have not been audited and no accountant's report is given on them. They are provided because CHIC asked for evidence of economic and financial standing, and this is the evidence the company actually has.");
cover.addRow([]);
cv("Company", { size: 11, bold: true, color: GOLD });
cover.addRow([]);
[
  ["Registered name", "JNN GLOBAL LTD"],
  ["Trading name", "ETABLIX"],
  ["Company number", "15405437"],
  ["Registered office", "[fill in]"],
  ["Date of incorporation", "[fill in]"],
  ["Accounting reference date", "[fill in]"],
  ["Period covered by this information", "[date of incorporation] to [reporting date]"],
  ["Reporting date", "[fill in]"],
  ["Prepared by", "Justin Nseya, Director"],
  ["Date prepared", "[fill in]"],
].forEach(([k, v]) => {
  const r = cover.addRow(["", k]);
  r.getCell(2).font = font({ bold: true });
  const r2 = cover.addRow(["", v]);
  r2.getCell(2).font = font({ color: SLATE });
});
cover.addRow([]);
cv("What is in this pack", { size: 11, bold: true, color: GOLD });
cover.addRow([]);
[
  "Income and expenditure — the statement of turnover and the profit and loss account, on an accruals basis, for the period to the reporting date.",
  "Statement of financial position — the balance sheet: what the company owned and owed at the reporting date.",
  "Cash flow statement — receipts and payments for the period, reconciling the opening bank balance to the closing one.",
  "Bank analysis — the working schedule behind the cash flow statement. Every line off the bank statement, categorised once.",
  "A three-year cash flow forecast is provided as a separate file (ETABLIX-cash-flow-forecast.xlsx).",
].forEach((t) => cv("•   " + t, { height: 26 }));
cover.addRow([]);
cv("How to use the file", { size: 11, bold: true, color: GOLD });
cover.addRow([]);
[
  "Work the Bank analysis sheet first. Enter every line off the bank statement from incorporation to the reporting date, and put a category against each one. Nothing downstream works until this is complete and the categories are spelled exactly as the list offers them.",
  "Then the Cash flow statement fills itself. Every line on it is a formula reading the bank analysis.",
  "Then the Income and expenditure sheet. The grey column to the right of each line shows the cash figure for that category as a starting point. Adjust it for anything invoiced and not yet paid, or paid in advance, and enter the accruals figure in the shaded cell.",
  "Then the Statement of financial position. Most of it comes from records rather than the bank: unpaid sales invoices, unpaid purchase invoices, equipment at cost, what the director has put in.",
  "Last, read the three check lines. Each one says OK or DOES NOT RECONCILE. Do not send the pack while any of them is red — an assessor who finds a set of accounts that does not add up stops reading.",
  "The shaded cells are the only ones to type into. Once the figures are in, select them and clear the fill before printing: the shading is a working aid, not part of the statement.",
  "To produce the PDF, print each statement sheet. The print area, page size and page numbering are already set, and the columns to the right of the figures are excluded from it.",
].forEach((t, i) => cv(`${i + 1}.   ${t}`, { height: 40 }));
cover.addRow([]);
cv("This pack is not a set of statutory accounts and is not audited. Have the accountant read it before it is submitted.", { size: 9, italic: true, color: SLATE, height: 24 });
cover.pageSetup = { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printArea: `A1:B${cover.rowCount}` };

/* =================================================================== */
/* 1. Income and expenditure                                            */
/* =================================================================== */
const ie = statement("Income and expenditure", { head: "Income and expenditure" });
ie.title("Income and expenditure account", "JNN GLOBAL LTD, trading as ETABLIX · for the period from incorporation to [reporting date]");
ie.note("Accruals basis: income is shown when it was invoiced and costs when they were incurred, not when the money moved. The grey column to the right of each line is the cash figure for that category, as a starting point.");

ie.section("Turnover");
ie.input("rev", "Turnover — services invoiced in the period", { cash: cashIn("Customer receipts"), from: "Total of sales invoices raised in the period, net of VAT. Include invoices raised and not yet paid; exclude money received for work not yet invoiced." });

ie.section("Cost of sales");
ie.input("cos_sub", "Subcontractors", { cash: cashOut("Subcontractors"), from: "Subcontract invoices for work in the period, whether paid or not." });
ie.input("cos_mat", "Materials, plant and hire", { cash: cashOut("Materials and plant"), from: "Materials and hire charges attributable to delivered work." });
ie.calc("cos", "Total cost of sales", "SUM(C{cos_sub}:C{cos_mat})", { bold: true, rule: "single" });
ie.calc("gp", "Gross profit / (loss)", "C{rev}-C{cos}", { bold: true });

ie.section("Administrative expenses");
ie.input("ad_wage", "Director's remuneration and employer's NIC", { cash: cashOut("Salary and PAYE"), from: "Gross salary and employer's NIC for the period per the payroll records, whether paid or accrued." });
ie.input("ad_ins", "Insurance", { cash: cashOut("Insurance"), from: "Public liability, professional indemnity, employers' liability. Charge only the months that fall inside the period; the rest is a prepayment on the balance sheet." });
ie.input("ad_prof", "Professional and accountancy fees", { cash: cashOut("Professional fees"), from: "Accountant, company formation, legal, bid support." });
ie.input("ad_soft", "Software, subscriptions and hosting", { cash: cashOut("Software and subscriptions"), from: "Domains, hosting, licences, tooling. Again, only the months inside the period." });
ie.input("ad_equip", "Equipment written off below the capitalisation threshold", { cash: cashOut("Equipment purchased"), from: "Small items expensed rather than capitalised. Anything capitalised appears on the balance sheet instead and is charged here through depreciation." });
ie.input("ad_mkt", "Marketing, website and print", { cash: cashOut("Marketing and website"), from: "Site build, print, advertising, directory entries." });
ie.input("ad_trav", "Travel and subsistence", { cash: cashOut("Travel and subsistence"), from: "Mileage, rail, accommodation on company business." });
ie.input("ad_comm", "Telephone and internet", { cash: cashOut("Telephone and internet"), from: "Business proportion only." });
ie.input("ad_train", "Training and accreditation", { cash: cashOut("Training and accreditation"), from: "Course fees, CSCS, memberships, accreditation applications." });
ie.input("ad_bank", "Bank charges", { cash: cashOut("Bank charges"), from: "Account fees and transaction charges." });
ie.input("ad_dep", "Depreciation", { from: "Equipment at cost divided by its useful life, apportioned over the months held. Must agree with the accumulated depreciation figure on the balance sheet." });
ie.input("ad_oth", "Other administrative expenses", { cash: cashOut("Other payments"), from: "Anything not covered above. If this line is large, split it out — an assessor will ask what is in it." });
ie.calc("admin", "Total administrative expenses", "SUM(C{ad_wage}:C{ad_oth})", { bold: true, rule: "single" });

ie.section("Result");
ie.calc("op", "Operating profit / (loss)", "C{gp}-C{admin}", { bold: true });
ie.input("fin", "Interest and finance costs", { from: "Loan interest, finance charges. Enter as a positive figure; it is deducted below." });
ie.calc("pbt", "Profit / (loss) before taxation", "C{op}-C{fin}", { bold: true, rule: "single" });
ie.input("tax", "Taxation", { from: "Corporation tax on the period's result. Nil where the company is loss-making. Enter as a positive figure." });
ie.calc("result", "Profit / (loss) for the period", "C{pbt}-C{tax}", { bold: true, rule: "double", fill: true, from: "This figure carries to retained earnings on the statement of financial position. Check 3 tests that it does." });

ie.note("Turnover shown above is the statement of turnover CHIC asked for. The whole sheet is the profit and loss account.");
ie.sign();

/* =================================================================== */
/* 2. Statement of financial position                                   */
/* =================================================================== */
const bs = statement("Statement of financial position", { head: "Statement of financial position" });
bs.title("Statement of financial position", "JNN GLOBAL LTD, trading as ETABLIX · as at [reporting date]");
bs.note("A list of what the company owned and owed on one stated day. Every figure on it comes from the company's own records: the bank statement, the unpaid invoices in and out, and what the director has put in.");

bs.section("Fixed assets");
bs.input("fa_cost", "Tangible assets — equipment at cost", { from: "What was paid for the laptop, instruments, and any other kit still held, net of VAT where recoverable. From the purchase invoices." });
bs.input("fa_dep", "Less accumulated depreciation", { from: "Enter as a positive figure; it is deducted below. Must agree with the depreciation charged on the income and expenditure sheet." });
bs.calc("fa", "Net book value", "C{fa_cost}-C{fa_dep}", { bold: true, rule: "single" });

bs.section("Current assets");
bs.input("ca_debt", "Trade receivables — invoices raised and not yet paid", { from: "Add up the sales invoices outstanding at the reporting date. Nil is a perfectly respectable answer and better than a guess." });
bs.input("ca_pre", "Other receivables and prepayments", { from: "The unexpired part of anything paid in advance: insurance, hosting, domains, subscriptions. Months paid for that fall after the reporting date." });
bs.input("ca_cash", "Cash at bank", { from: "The closing balance on the bank statement at the reporting date. Check 2 tests this against the cash flow statement, so take it off the statement and not from memory." });
bs.calc("ca", "Total current assets", "SUM(C{ca_debt}:C{ca_cash})", { bold: true, rule: "single" });

bs.section("Creditors — amounts falling due within one year");
bs.input("cl_trade", "Trade creditors — supplier invoices unpaid", { from: "Purchase invoices received and not yet paid at the reporting date." });
bs.input("cl_acc", "Accruals", { from: "Costs incurred and not yet invoiced to the company: the accountant's fee for the period, anything used and not yet billed." });
bs.input("cl_hmrc", "Taxation and social security", { from: "PAYE and NIC owed, VAT owed if registered, corporation tax provided for. From the payroll and VAT records." });
bs.input("cl_dir", "Director's loan account", { from: "What the company owes the director: money put in, and expenses paid personally and not yet reimbursed, less anything drawn back out. If the director owes the company, this is a receivable above instead." });
bs.input("cl_oth", "Other creditors", { from: "Anything else due within twelve months." });
bs.calc("cl", "Total creditors due within one year", "SUM(C{cl_trade}:C{cl_oth})", { bold: true, rule: "single" });

bs.calc("nca", "Net current assets / (liabilities)", "C{ca}-C{cl}", { bold: true, from: "A negative figure here is not disqualifying for a company at this stage, but say in the covering note how it is funded. An assessor's concern is whether the company can pay what it owes, and a director's loan that is not being called is a different thing from a trade creditor that is overdue." });
bs.calc("tacl", "Total assets less current liabilities", "C{fa}+C{nca}", { bold: true, rule: "single" });

bs.section("Creditors — amounts falling due after more than one year");
bs.input("ncl", "Amounts falling due after more than one year", { from: "Loans and finance repayable beyond twelve months. Nil for most companies at this stage." });
bs.calc("na", "Net assets / (liabilities)", "C{tacl}-C{ncl}", { bold: true, rule: "double", fill: true });

bs.section("Capital and reserves");
bs.input("eq_share", "Called up share capital", { from: "The nominal value of the shares issued. From the company's statement of capital — typically £1 or £100." });
bs.calc("eq_ret", "Retained earnings / (accumulated losses)", "'Income and expenditure'!C{IE_RESULT}", { from: "Pulled from the result for the period on the income and expenditure sheet. This is the first period, so cumulative retained earnings and the period result are the same figure. Do not type over this cell." });
bs.calc("eq", "Total equity", "SUM(C{eq_share}:C{eq_ret})", { bold: true, rule: "double", fill: true });

bs.check("Check 1 — net assets equal capital and reserves", 'IF(ROUND(C{na}-C{eq},0)=0,"OK — the statement balances","DOES NOT RECONCILE by "&TEXT(ROUND(C{na}-C{eq},0),"#,##0"))');
bs.note("If check 1 is red, something is missing rather than mistyped. The usual cause is money the director put in that has not been recorded as a director's loan or as share capital.");
bs.sign();

/* =================================================================== */
/* 3. Cash flow statement                                              */
/* =================================================================== */
const cf = statement("Cash flow statement", { head: "Cash flow statement" });
cf.title("Cash flow statement", "JNN GLOBAL LTD, trading as ETABLIX · for the period from incorporation to [reporting date]");
cf.note("The bank statement, reorganised. Every figure on this sheet is a formula reading the Bank analysis sheet — there is nothing to type here except the opening balance. If a line looks wrong, the category on the bank analysis is wrong.");

cf.section("Receipts");
IN.forEach((cat, i) => cf.calc("in" + i, cat, cashIn(cat)));
cf.calc("tin", "Total receipts", `SUM(C{in0}:C{in${IN.length - 1}})`, { bold: true, rule: "single" });

cf.section("Payments");
OUT_.forEach((cat, i) => cf.calc("out" + i, cat, cashOut(cat)));
cf.calc("tout", "Total payments", `SUM(C{out0}:C{out${OUT_.length - 1}})`, { bold: true, rule: "single" });

cf.section("Movement in cash");
cf.calc("net", "Net increase / (decrease) in cash", "C{tin}-C{tout}", { bold: true });
cf.input("open", "Cash at bank at the start of the period", { from: "Nil at incorporation. If the reporting period starts later, take the opening balance off the bank statement." });
cf.calc("close", "Cash at bank at the end of the period", "C{open}+C{net}", { bold: true, rule: "double", fill: true });

cf.check("Check 2 — closing cash agrees with the statement of financial position",
  'IF(ROUND(C{close}-\'Statement of financial position\'!C{BS_CASH},0)=0,"OK — agrees with the balance sheet","DOES NOT RECONCILE by "&TEXT(ROUND(C{close}-\'Statement of financial position\'!C{BS_CASH},0),"#,##0"))');
cf.check("Check 3 — retained earnings agree with the result for the period",
  'IF(ROUND(\'Statement of financial position\'!C{BS_RET}-\'Income and expenditure\'!C{IE_RESULT},0)=0,"OK — agrees with income and expenditure","DOES NOT RECONCILE")');
cf.note("Check 2 failing almost always means a bank line has been missed off the analysis sheet, or one has been entered twice. Work the bank statement line by line rather than hunting for the difference.");
cf.sign();

/* =================================================================== */
/* 4. Bank analysis — the working schedule                             */
/* =================================================================== */
const ba = wb.addWorksheet("Bank analysis");
ba.columns = [
  { header: "Date", width: 12 },
  { header: "Description as it appears on the statement", width: 46 },
  { header: "Money in", width: 13 },
  { header: "Money out", width: 13 },
  { header: "Category", width: 30 },
  { header: "Note — what this was for", width: 46 },
];
ba.getRow(1).eachCell((c) => {
  c.font = font({ bold: true });
  c.fill = solid(FILL_HEAD);
  c.border = { bottom: { style: "thin", color: { argb: SLATE } } };
});
ba.views = [{ state: "frozen", ySplit: 1 }];

const ALL = [...IN, ...OUT_];
for (let i = 2; i <= 401; i += 1) {
  const r = ba.getRow(i);
  r.getCell(1).numFmt = "dd/mm/yyyy";
  [1, 2, 5, 6].forEach((n) => { r.getCell(n).font = font(); r.getCell(n).fill = solid(FILL_IN); });
  [3, 4].forEach((n) => { r.getCell(n).numFmt = MONEY; r.getCell(n).font = font(); r.getCell(n).fill = solid(FILL_IN); });
  r.getCell(5).dataValidation = {
    type: "list", allowBlank: true, formulae: ["=Lists!$A$2:$A$40"],
    showErrorMessage: true, errorTitle: "Not a category",
    error: "Pick from the list. A category spelled any other way is invisible to the cash flow statement.",
  };
}
ba.autoFilter = { from: "A1", to: "F1" };
ba.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
ba.headerFooter = {
  oddHeader: '&R&"Arial,Regular"&8ETABLIX · Bank analysis',
  oddFooter: '&L&"Arial,Regular"&8JNN GLOBAL LTD · unaudited management information&R&"Arial,Regular"&8Page &P of &N',
};

/* the category list, and a control total that proves nothing is uncategorised */
const lists = wb.addWorksheet("Lists");
lists.columns = [{ header: "Category", width: 34 }, { header: "Money in", width: 13 }, { header: "Money out", width: 13 }];
lists.getRow(1).eachCell((c) => { c.font = font({ bold: true }); c.fill = solid(FILL_HEAD); });
ALL.forEach((cat) => {
  const r = lists.addRow([cat]);
  r.getCell(1).font = font();
  r.getCell(2).value = { formula: cashIn(cat) };
  r.getCell(3).value = { formula: cashOut(cat) };
  [2, 3].forEach((n) => { r.getCell(n).numFmt = MONEY; r.getCell(n).font = font({ color: SLATE }); });
});
const totRow = lists.addRow(["Total categorised"]);
totRow.getCell(1).font = font({ bold: true });
totRow.getCell(2).value = { formula: `SUM(B2:B${totRow.number - 1})` };
totRow.getCell(3).value = { formula: `SUM(C2:C${totRow.number - 1})` };
[2, 3].forEach((n) => { totRow.getCell(n).numFmt = MONEY; totRow.getCell(n).font = font({ bold: true }); totRow.getCell(n).border = { top: { style: "thin", color: { argb: SLATE } } }; });
const bankRow = lists.addRow(["Total on the bank analysis sheet"]);
bankRow.getCell(1).font = font({ bold: true });
bankRow.getCell(2).value = { formula: `SUM(${BANK}!C:C)` };
bankRow.getCell(3).value = { formula: `SUM(${BANK}!D:D)` };
[2, 3].forEach((n) => { bankRow.getCell(n).numFmt = MONEY; bankRow.getCell(n).font = font({ bold: true }); });
const gapRow = lists.addRow(["Uncategorised — must be nil"]);
gapRow.getCell(1).font = font({ bold: true, color: GOLD });
gapRow.getCell(2).value = { formula: `B${bankRow.number}-B${totRow.number}` };
gapRow.getCell(3).value = { formula: `C${bankRow.number}-C${totRow.number}` };
[2, 3].forEach((n) => { gapRow.getCell(n).numFmt = MONEY; gapRow.getCell(n).font = font({ bold: true }); });
lists.addRow([]);
const warn = lists.addRow(["Any figure on the uncategorised line means a bank entry has no category against it, or the category is misspelled. The cash flow statement will be understated by exactly that amount."]);
warn.getCell(1).font = font({ size: 9, italic: true, color: SLATE });
lists.mergeCells(`A${warn.number}:C${warn.number}`);
warn.getCell(1).alignment = { wrapText: true, vertical: "top" };
warn.height = 30;

/* =================================================================== */
/* resolve the {key} row references                                     */
/* =================================================================== */
const MAP = {
  "Income and expenditure": ie.at,
  "Statement of financial position": bs.at,
  "Cash flow statement": cf.at,
};
const GLOBAL = {
  IE_RESULT: ie.at.result,
  BS_CASH: bs.at.ca_cash,
  BS_RET: bs.at.eq_ret,
};
let unresolved = 0;
[ie, bs, cf].forEach(({ ws, at }) => {
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.formula) return;
      cell.value = {
        formula: cell.formula.replace(/\{([A-Za-z0-9_Ѐ-ӿ]+)\}/g, (m, key) => {
          const n = at[key] !== undefined ? at[key] : GLOBAL[key];
          if (n === undefined) { unresolved += 1; console.error("UNRESOLVED reference:", m, "in", ws.name); return m; }
          return String(n);
        }),
      };
    });
  });
});
if (unresolved) { console.error(`\n${unresolved} unresolved reference(s). Not writing the file.`); process.exit(1); }

wb.xlsx.writeFile(OUT).then(() => {
  console.log("wrote", OUT);
  console.log("sheets:", wb.worksheets.map((w) => w.name).join(" | "));
});
