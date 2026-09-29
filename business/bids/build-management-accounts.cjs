/**
 * ETABLIX — Management Accounts. Word and PDF.
 *
 *   node business/bids/build-management-accounts.cjs
 *
 * WHAT THIS IS FOR. Four dynamic purchasing systems have now asked for
 * financial evidence, and none of them asked for the same thing:
 *
 *   RM6242 Construction Professional Services — two years of accounts, because
 *     the automated Dun & Bradstreet check returned a null score. Explicitly
 *     allows "trading accounts including Profit & Loss, Balance Sheet and
 *     Turnover statement" in place of audited accounts, with a manual
 *     assessment by their finance team.
 *   RM6264 Facilities Management — the Financial Viability Risk Assessment
 *     tool and FVRA accounts.
 *   Housing Maintenance and Repair — Attachment 3a and published accounts.
 *   CHIC — a balance sheet.
 *
 * All four are answered by the same set of statements. This document is that
 * set. It exists as a document rather than only as the workbook because an
 * assessor wants a signed PDF, not a spreadsheet they have to interpret.
 *
 * THE LINE ITEMS MIRROR ETABLIX-financial-statements.xlsx EXACTLY, so the
 * workbook stays the place the arithmetic happens and this stays the place it
 * is presented. Fill the workbook, check its three cross-checks read OK, then
 * transcribe the totals here. Two documents with the same numbers derived
 * twice is how a transcription error survives to an assessor.
 *
 * WHY IT SAYS UNAUDITED ON EVERY PAGE. JNN GLOBAL LTD has not completed two
 * full trading years and these are not statutory accounts. An assessor who
 * discovers that after reading them treats everything else in the submission
 * differently; one who is told it in the first paragraph reads the rest as
 * candid. Section 1 says it, the running header says it, and section 7 says it
 * again over a signature.
 *
 * NO FIGURE IS PRE-FILLED. Every number in a set of accounts is a statement a
 * director signs. Section 8 names the record each line comes from.
 */
const B = require("../policies/brand.cjs");

const REV = "1";
const d = B.doc({
  slug: "Management-Accounts",
  running: "Management accounts — unaudited",
  kicker: "UNAUDITED MANAGEMENT ACCOUNTS",
  title: "FINANCIAL STATEMENTS",
  sub: "prepared for financial standing assessment · not statutory accounts",
  rev: REV,
  outDir: __dirname,
  kind: "accounts",
  control: [
    ["Document", "Unaudited management accounts"],
    ["Company", "JNN GLOBAL LTD, trading as ETABLIX"],
    ["Registered", "England and Wales · Company No. 15405437"],
    ["Period covered", "[from] to [to]"],
    ["Prepared by", "[name], Managing Director"],
    ["Prepared from", "The company's own accounting records and bank statements"],
    ["Status", "UNAUDITED MANAGEMENT INFORMATION. Not statutory accounts. Not filed at Companies House. Not reviewed or reported on by an accountant."],
    ["Prepared for", "Financial standing assessment on a supplier registration or dynamic purchasing system"],
    ["Currency", "Pounds sterling, rounded to the nearest pound"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* the same shape as the workbook: label, the note, and an empty figure */
const LINE = (label, note) => [label, "[        ]", note];
const stmt = (rows) => table([3700, 1500, 3100], ["", "£", "Basis"], rows, { size: 16 });

/* ------------------------------------------------------------------ */
h1("1. Basis of preparation");

rich([
  { t: "These are unaudited management accounts. They are not statutory accounts, they have not been filed at Companies House, and no accountant has audited, reviewed or reported on them. ", b: true },
  { t: "They are prepared by the director from the company's own accounting records and bank statements, for the purpose of a financial standing assessment, and they are presented in that form deliberately rather than dressed as something they are not." },
]);

table([2700, 5600],
  ["", ""],
  [
    ["Why not statutory accounts", "JNN GLOBAL LTD has not completed two full trading years. Where accounts have been filed for a completed period they are available at Companies House and are supplied alongside this document."],
    ["Why a null credit score", "An automated financial risk check returns no score for a company with no filed trading history. That is a consequence of the company's age rather than of its financial position, and it is the reason a manual assessment has been requested."],
    ["Accounting convention", "Historical cost. Prepared on an accruals basis: income is recognised when invoiced and costs when incurred, whether or not cash has moved."],
    ["Period", "[state the period, from and to. If it is shorter than twelve months, say so here rather than leaving a reader to infer it from the dates.]"],
    ["Comparatives", "[state whether a prior period is shown. For a first period there is none, and saying so is better than an empty column.]"],
  ]);

note("Every figure in this document can be traced to a bank statement, an invoice or a receipt. Section 8 names the record behind each line so an assessor can test any of it rather than take it on trust.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("2. Profit and loss account");

p("For the period stated in the control table.");

stmt([
  ["TURNOVER", "[        ]", "Services invoiced in the period"],
  ["", "", ""],
  ["Cost of sales", "", ""],
  LINE("  Subcontractors", "Subcontract invoices for work in the period"),
  LINE("  Materials, plant and hire", "Attributable to delivered work"),
  ["  Total cost of sales", "[        ]", "Sum of the above"],
  ["GROSS PROFIT / (LOSS)", "[        ]", "Turnover less cost of sales"],
  ["", "", ""],
  ["Administrative expenses", "", ""],
  LINE("  Director's remuneration and employer's NIC", "Payroll records"),
  LINE("  Insurance", "Policy schedules and premiums paid"),
  LINE("  Professional and accountancy fees", "Accountant, formation, legal, bid support"),
  LINE("  Software, subscriptions and hosting", "Invoices and card statements"),
  LINE("  Equipment below the capitalisation threshold", "Written off as incurred"),
  LINE("  Marketing, website and print", "Invoices"),
  LINE("  Travel and subsistence", "Mileage log and receipts"),
  LINE("  Other administrative costs", "Itemise anything material in a note"),
  ["  Total administrative expenses", "[        ]", "Sum of the above"],
  ["", "", ""],
  ["OPERATING PROFIT / (LOSS)", "[        ]", "Gross profit less administrative expenses"],
  LINE("  Interest receivable", "Bank statements"),
  LINE("  Interest payable", "Bank statements and loan agreements"),
  ["PROFIT / (LOSS) BEFORE TAXATION", "[        ]", ""],
  LINE("  Taxation", "Corporation tax charge for the period"),
  ["PROFIT / (LOSS) FOR THE PERIOD", "[        ]", "Carries to retained earnings at section 3"],
]);

note("A loss in an early period is not a finding against a company and an assessor does not read it as one. What an assessor reads badly is a loss presented as a profit by leaving something out. Include every cost incurred in the period, including the ones settled personally and reclaimed.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("3. Statement of financial position");

p("As at the period end date stated in the control table.");

stmt([
  ["FIXED ASSETS", "", ""],
  LINE("  Tangible assets, net of depreciation", "Asset register"),
  ["  Total fixed assets", "[        ]", ""],
  ["", "", ""],
  ["CURRENT ASSETS", "", ""],
  LINE("  Trade debtors", "Invoices issued and unpaid at the period end"),
  LINE("  Other debtors and prepayments", "Prepaid insurance, subscriptions"),
  LINE("  Cash at bank and in hand", "Bank statement balance at the period end date"),
  ["  Total current assets", "[        ]", ""],
  ["", "", ""],
  ["CREDITORS: amounts falling due within one year", "", ""],
  LINE("  Trade creditors", "Supplier invoices received and unpaid"),
  LINE("  Taxation and social security", "PAYE, NIC, VAT and corporation tax due"),
  LINE("  Accruals and other creditors", "Costs incurred and not yet invoiced to us"),
  LINE("  Director's loan account", "Amounts owed to the director"),
  ["  Total current liabilities", "[        ]", ""],
  ["", "", ""],
  ["NET CURRENT ASSETS / (LIABILITIES)", "[        ]", "Current assets less current liabilities"],
  ["TOTAL ASSETS LESS CURRENT LIABILITIES", "[        ]", ""],
  LINE("CREDITORS: falling due after more than one year", "Loans and finance beyond twelve months"),
  ["NET ASSETS / (LIABILITIES)", "[        ]", "THIS IS THE FIGURE AN ASSESSOR LOOKS FOR FIRST"],
  ["", "", ""],
  ["CAPITAL AND RESERVES", "", ""],
  LINE("  Called up share capital", "Register of members"),
  LINE("  Profit and loss account (retained earnings)", "Brought forward plus the result at section 2"),
  ["  TOTAL EQUITY", "[        ]", "MUST EQUAL NET ASSETS ABOVE"],
]);

note("Total equity must equal net assets. If it does not, the statements do not balance and an assessor will see it in seconds. The workbook at ETABLIX-financial-statements.xlsx tests this automatically — its first cross-check goes red when the two differ. Transcribe from a workbook whose checks read OK.");

/* ------------------------------------------------------------------ */
h1("4. Turnover statement");

p("Requested separately by some assessments, and stated here so it does not have to be extracted from the profit and loss account.");

table([3700, 2200, 2400],
  ["Period", "Turnover (£)", "Basis"],
  [
    ["[current period, from and to]", "[        ]", "Services invoiced in the period"],
    ["[prior period, or: no prior trading period]", "[        ]", ""],
    ["[period before that, or: none]", "[        ]", ""],
  ]);

fillIn("Where there is no prior period, write 'No prior trading period — company incorporated [date]' rather than leaving the row blank or entering nil. A nil figure and an absent period are different facts and an assessor treats them differently.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("5. Cash flow statement");

stmt([
  ["Cash at bank at the start of the period", "[        ]", "Opening bank statement balance"],
  ["", "", ""],
  ["Operating activities", "", ""],
  LINE("  Receipts from customers", "Bank statements"),
  LINE("  Payments to suppliers and subcontractors", "Bank statements"),
  LINE("  Payments to and on behalf of the director", "Payroll and bank statements"),
  LINE("  Other operating payments", "Bank statements"),
  ["  Net cash from operating activities", "[        ]", ""],
  ["", "", ""],
  ["Investing activities", "", ""],
  LINE("  Purchase of equipment", "Invoices and bank statements"),
  ["", "", ""],
  ["Financing activities", "", ""],
  LINE("  Share capital introduced", "Bank statements"),
  LINE("  Director's loan advanced / (repaid)", "Director's loan account"),
  ["", "", ""],
  ["NET MOVEMENT IN CASH", "[        ]", "Sum of the three activities above"],
  ["Cash at bank at the end of the period", "[        ]", "MUST EQUAL the closing bank statement balance"],
]);

note("The closing figure must equal the bank statement on the period end date, to the penny. It is the easiest line in the document to verify and the one an assessor is most likely to check, because a bank statement is the only document here that nobody in the company wrote.");

/* ------------------------------------------------------------------ */
h1("6. Notes");

h2("6.1  Going concern");

fillIn("[State the position honestly, in three or four sentences. What the company's cash position is, what its committed outgoings are, and what the director's intention and ability to support it are. If there is a director's loan facility or an undertaking not to demand repayment, say so and say for how long — that is the single most useful sentence in this section for an assessor, and an undertaking with no term stated is worth much less than one with a date.]");

h2("6.2  Related party transactions");

fillIn("[Transactions with the director and with any company under common control: loans, remuneration, expenses reclaimed, use of personal assets. State the amounts and the terms. An assessor expects related party transactions in a company of this size and reads their absence as an omission rather than as a virtue.]");

h2("6.3  Events after the period end");

fillIn("[Anything material between the period end and the date of signing: insurance bound, contracts won, funding introduced, a change in circumstances. If there is nothing material, write that there is nothing material.]");

h2("6.4  Employees");

p("The company has one employee, the director. Employers' liability insurance is not compulsory under the Employers' Liability (Compulsory Insurance) Act 1969 for a company whose only employee is a director holding fifty per cent or more of the issued share capital. Where a buyer requires that cover as a contract condition, it is a commercial requirement rather than a statutory one and is addressed separately.");

/* ------------------------------------------------------------------ */
h1("7. Director's statement and approval");

p("I confirm that these management accounts have been prepared from the accounting records of JNN GLOBAL LTD and that, to the best of my knowledge and belief, they give a true reflection of the company's income, expenditure, assets and liabilities for the period stated.");

p("I confirm that they are UNAUDITED, that they are not statutory accounts, that they have not been filed at Companies House, and that no accountant has audited, reviewed or reported on them. They are supplied for the purpose of a financial standing assessment and should not be relied upon for any other purpose.");

table([2700, 5600],
  ["", ""],
  [
    ["Signed", "[signature]"],
    ["Name", "[name]"],
    ["Title", "Director, JNN GLOBAL LTD"],
    ["Date", "[date]"],
  ]);

/* ------------------------------------------------------------------ */
pageBreak();
h1("8. Where each figure comes from");

p("Not part of the statements. Kept with them so any line can be traced to a source document if an assessor asks, and so the next period takes an evening rather than a week.");

table([2600, 2600, 3100],
  ["Line", "The record", "The test"],
  [
    ["Turnover", "Sales invoices raised in the period.", "The total of invoices dated within the period, whether paid or not. Not the total of receipts — those belong in the cash flow statement."],
    ["Trade debtors", "Sales invoices issued and unpaid at the period end.", "Age them. A debtor older than ninety days is a question an assessor may ask, and a prepared answer is better than a surprised one."],
    ["Cash at bank", "Bank statement on the period end date.", "To the penny. This is the anchor for the whole document."],
    ["Trade creditors", "Supplier invoices received and unpaid at the period end.", "Include anything received after the period end that relates to work done inside it."],
    ["Accruals", "Costs incurred but not yet invoiced to the company.", "The line most often missed, and its absence overstates profit."],
    ["Director's loan account", "A running record of money in and out between the director and the company.", "Reconcile it. An unreconciled director's loan account is the most common weakness in accounts at this scale."],
    ["Taxation and social security", "HMRC account: PAYE, NIC, VAT, corporation tax.", "Take it from the HMRC portal rather than from an estimate."],
  ]);

fillIn("Complete ETABLIX-financial-statements.xlsx first and confirm its three cross-checks read OK. Then transcribe the totals into this document. Deriving the same figures twice by two routes is how a transcription error reaches an assessor without anyone noticing.");

approval();
d.build().then(() => {
  console.log("\nBEFORE SENDING");
  console.log("  1. Fill ETABLIX-financial-statements.xlsx and check its three cross-checks read OK.");
  console.log("  2. Transcribe the totals into this document. Do not recalculate them here.");
  console.log("  3. Net assets MUST equal total equity, and closing cash MUST equal the bank statement.");
  console.log("  4. Notes 6.1 to 6.3 — going concern, related parties, post period end.");
  console.log("  5. Sign section 7 and date it.");
  console.log("\n  Send alongside anything already filed at Companies House. Both, not one.");
}).catch((err) => { console.error(err); process.exit(1); });
