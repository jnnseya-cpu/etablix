/* Evaluate the workbook's formula graph against a coherent test dataset,
   so the three cross-checks are proved rather than assumed. */
const E = require("exceljs");
const FILE = require("path").join(__dirname, "ETABLIX-financial-statements.xlsx");

const IE = "Income and expenditure", BS = "Statement of financial position",
      CF = "Cash flow statement", BA = "Bank analysis", LS = "Lists";

/* the test data: label -> figure, applied to column C of the named sheet */
const FIG = {
  [IE]: { "Turnover — services invoiced in the period": 15000,
    "Subcontractors": 3700, "Materials, plant and hire": 0,
    "Director's remuneration and employer's NIC": 0, "Insurance": 800,
    "Professional and accountancy fees": 1400, "Software, subscriptions and hosting": 600,
    "Equipment written off below the capitalisation threshold": 0,
    "Marketing, website and print": 500, "Travel and subsistence": 400,
    "Telephone and internet": 0, "Training and accreditation": 0, "Bank charges": 60,
    "Depreciation": 200, "Other administrative expenses": 0,
    "Interest and finance costs": 0, "Taxation": 0 },
  [BS]: { "Tangible assets — equipment at cost": 1400, "Less accumulated depreciation": 200,
    "Trade receivables — invoices raised and not yet paid": 3000,
    "Other receivables and prepayments": 400, "Cash at bank": 9040,
    "Trade creditors — supplier invoices unpaid": 700, "Accruals": 500,
    "Taxation and social security": 0, "Director's loan account": 5000,
    "Other creditors": 0, "Amounts falling due after more than one year": 0,
    "Called up share capital": 100 },
  [CF]: { "Cash at bank at the start of the period": 0 },
};
const BANKLINES = [
  ["Share capital introduced", 100, 0], ["Director's loan introduced", 5000, 0],
  ["Customer receipts", 12000, 0], ["Subcontractors", 0, 3000],
  ["Insurance", 0, 1200], ["Professional fees", 0, 900],
  ["Software and subscriptions", 0, 600], ["Equipment purchased", 0, 1400],
  ["Marketing and website", 0, 500], ["Travel and subsistence", 0, 400],
  ["Bank charges", 0, 60],
];

/* ---------- a tiny formula evaluator ---------- */
const cells = new Map();  // "Sheet!C12" -> {f} | {v}
const key = (s, a) => s + "!" + a.replace(/\$/g, "");
const A1 = (col, row) => col + row;

function colToN(c) { let n = 0; for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
function nToCol(n) { let s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; } return s; }

const memo = new Map();
function cell(sheet, addr) {
  const k = key(sheet, addr);
  if (memo.has(k)) return memo.get(k);
  const c = cells.get(k);
  let out = 0;
  if (!c) out = 0;
  else if (c.f !== undefined) { memo.set(k, 0); out = ev(c.f, sheet); }
  else out = c.v;
  memo.set(k, out);
  return out;
}

function expandRange(sheet, ref) {
  ref = ref.replace(/\$/g, "");
  const m = ref.match(/^([A-Z]+)(\d*):([A-Z]+)(\d*)$/);
  if (!m) return [];
  const [, c1, r1, c2, r2] = m;
  const lo = r1 ? +r1 : 1, hi = r2 ? +r2 : 500;
  const out = [];
  for (let c = colToN(c1); c <= colToN(c2); c += 1)
    for (let r = lo; r <= hi; r += 1) out.push(cell(sheet, A1(nToCol(c), r)));
  return out;
}

/* tokenise-and-parse: enough of Excel for this workbook */
function ev(src, ctx) {
  let i = 0;
  const s = src;
  const ws = () => { while (i < s.length && s[i] === " ") i += 1; };
  function parseExpr() { // handles = <> and &
    let l = parseAdd();
    for (;;) {
      ws();
      if (s.startsWith("<>", i)) { i += 2; const r = parseAdd(); l = (l === r); }
      else if (s[i] === "=") { i += 1; const r = parseAdd(); l = (l === r); }
      else if (s[i] === "&") { i += 1; const r = parseAdd(); l = String(l) + String(r); }
      else return l;
    }
  }
  function parseAdd() {
    let l = parseMul();
    for (;;) {
      ws();
      if (s[i] === "+") { i += 1; l = num(l) + num(parseMul()); }
      else if (s[i] === "-") { i += 1; l = num(l) - num(parseMul()); }
      else return l;
    }
  }
  function parseMul() {
    let l = parseUnary();
    for (;;) {
      ws();
      if (s[i] === "*") { i += 1; l = num(l) * num(parseUnary()); }
      else if (s[i] === "/") { i += 1; l = num(l) / num(parseUnary()); }
      else return l;
    }
  }
  function parseUnary() { ws(); if (s[i] === "-") { i += 1; return -num(parseUnary()); } return parseAtom(); }
  function num(x) { return typeof x === "number" ? x : (x === "" || x === undefined ? 0 : (isNaN(+x) ? 0 : +x)); }

  function parseArgs() {
    const args = []; let depth = 0, start = i;
    for (; i < s.length; i += 1) {
      const ch = s[i];
      if (ch === "'" ) { i += 1; while (i < s.length && s[i] !== "'") i += 1; continue; }
      if (ch === '"') { i += 1; while (i < s.length && s[i] !== '"') i += 1; continue; }
      if (ch === "(") depth += 1;
      else if (ch === ")") { if (depth === 0) { args.push(s.slice(start, i)); i += 1; return args; } depth -= 1; }
      else if (ch === "," && depth === 0) { args.push(s.slice(start, i)); start = i + 1; }
    }
    throw new Error("unbalanced parens in " + s);
  }

  function parseAtom() {
    ws();
    if (s[i] === "(") { i += 1; const v = parseExpr(); ws(); i += 1; return v; }
    if (s[i] === '"') { let j = i + 1, out = ""; while (s[j] !== '"') { out += s[j]; j += 1; } i = j + 1; return out; }
    if (/[0-9.]/.test(s[i])) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j += 1; const v = +s.slice(i, j); i = j; return v; }

    // sheet-qualified reference: 'Sheet Name'!REF  or SheetName!REF
    let sheet = ctx, m;
    if (s[i] === "'") {
      const close = s.indexOf("'", i + 1);
      sheet = s.slice(i + 1, close); i = close + 1;
      if (s[i] !== "!") throw new Error("expected ! after sheet name: " + s);
      i += 1;
    } else if ((m = /^([A-Za-z][A-Za-z0-9 ]*)!/.exec(s.slice(i)))) {
      sheet = m[1]; i += m[1].length + 1;
    }

    // function call
    if ((m = /^([A-Z]+)\(/.exec(s.slice(i)))) {
      const name = m[1]; i += name.length + 1;
      const raw = parseArgs();
      const fn = {
        SUM: () => raw.flatMap((a) => /:/.test(a) ? expandRange(sheet, a.trim()) : [ev(a, sheet)]).reduce((x, y) => x + num(y), 0),
        ROUND: () => { const v = num(ev(raw[0], sheet)), d = num(ev(raw[1], sheet)); const p = 10 ** d; return Math.round(v * p) / p; },
        IF: () => (ev(raw[0], sheet) ? ev(raw[1], sheet) : ev(raw[2], sheet)),
        TEXT: () => { const v = num(ev(raw[0], sheet)); return v.toLocaleString("en-GB"); },
        SUMIF: () => {
          // SUMIF(range, criterion, sumRange) — resolve sheets per argument
          const rngSheet = (a) => { const q = a.trim(); const mm = /^'([^']+)'!/.exec(q); if (mm) return [mm[1], q.slice(mm[0].length)]; const m2 = /^([A-Za-z][A-Za-z0-9 ]*)!/.exec(q); if (m2) return [m2[1], q.slice(m2[0].length)]; return [sheet, q]; };
          const [rs, rr] = rngSheet(raw[0]);
          const [ss, sr] = rngSheet(raw[2]);
          const crit = ev(raw[1], sheet);
          const keys = expandRange(rs, rr), vals = expandRange(ss, sr);
          let t = 0;
          for (let k = 0; k < keys.length; k += 1) if (keys[k] === crit) t += num(vals[k]);
          return t;
        },
      }[name];
      if (!fn) throw new Error("unsupported function " + name);
      return fn();
    }

    // plain cell reference
    if ((m = /^\$?([A-Z]+)\$?(\d+)/.exec(s.slice(i)))) {
      i += m[0].length;
      return cell(sheet, A1(m[1], m[2]));
    }
    throw new Error("cannot parse at " + i + " of: " + s);
  }
  const v = parseExpr();
  return v;
}

/* ---------- load, inject, evaluate ---------- */
const wb = new E.Workbook();
wb.xlsx.readFile(FILE).then(() => {
  const labelRow = {};
  for (const ws of wb.worksheets) {
    labelRow[ws.name] = {};
    ws.eachRow((r) => {
      r.eachCell({ includeEmpty: false }, (c, n) => {
        const addr = A1(nToCol(n), r.number);
        if (c.formula) cells.set(key(ws.name, addr), { f: c.formula });
        else if (typeof c.value === "number" || typeof c.value === "string") cells.set(key(ws.name, addr), { v: c.value });
      });
      const lab = r.getCell(2).value;
      if (typeof lab === "string") labelRow[ws.name][lab] = r.number;
    });
  }

  // inject the statement figures by their printed label
  let missing = [];
  for (const [sheet, rows] of Object.entries(FIG))
    for (const [label, v] of Object.entries(rows)) {
      const rn = labelRow[sheet][label];
      if (!rn) { missing.push(sheet + " / " + label); continue; }
      cells.set(key(sheet, A1("C", rn)), { v });
    }
  if (missing.length) { console.error("LABEL NOT FOUND:\n  " + missing.join("\n  ")); process.exit(1); }

  // inject the bank lines
  BANKLINES.forEach(([cat, inn, out], k) => {
    const r = k + 2;
    cells.set(key(BA, A1("C", r)), { v: inn });
    cells.set(key(BA, A1("D", r)), { v: out });
    cells.set(key(BA, A1("E", r)), { v: cat });
  });

  const show = (sheet, label) => {
    const rn = labelRow[sheet][label];
    if (!rn) throw new Error("no row for " + label);
    return cell(sheet, A1("C", rn));
  };

  const report = [
    [IE, "Total cost of sales"], [IE, "Gross profit / (loss)"],
    [IE, "Total administrative expenses"], [IE, "Operating profit / (loss)"],
    [IE, "Profit / (loss) for the period"],
    [BS, "Net book value"], [BS, "Total current assets"],
    [BS, "Total creditors due within one year"], [BS, "Net current assets / (liabilities)"],
    [BS, "Total assets less current liabilities"], [BS, "Net assets / (liabilities)"],
    [BS, "Retained earnings / (accumulated losses)"], [BS, "Total equity"],
    [CF, "Total receipts"], [CF, "Total payments"],
    [CF, "Net increase / (decrease) in cash"], [CF, "Cash at bank at the end of the period"],
  ];
  console.log("COMPUTED FROM THE TEST DATASET\n");
  for (const [s, l] of report) console.log("  " + (s.slice(0, 3) + " · " + l).padEnd(58) + String(show(s, l)).padStart(9));

  console.log("\nCROSS-CHECKS\n");
  const checks = [
    [BS, "Check 1 — net assets equal capital and reserves"],
    [CF, "Check 2 — closing cash agrees with the statement of financial position"],
    [CF, "Check 3 — retained earnings agree with the result for the period"],
  ];
  let pass = true;
  for (const [s, l] of checks) {
    const v = show(s, l);
    console.log("  " + l.padEnd(72) + " → " + v);
    if (!String(v).startsWith("OK")) pass = false;
  }

  // the uncategorised control total on Lists
  const lr = labelRow[LS]["Uncategorised — must be nil"];
  const uIn = cell(LS, A1("B", lr)), uOut = cell(LS, A1("C", lr));
  console.log("\n  Uncategorised control (must be 0 / 0)".padEnd(75) + " → " + uIn + " / " + uOut);
  if (uIn !== 0 || uOut !== 0) pass = false;

  // negative control: break one figure and confirm the checks go red
  memo.clear();
  const cashRow = labelRow[BS]["Cash at bank"];
  cells.set(key(BS, A1("C", cashRow)), { v: 9041 });
  const neg = show(CF, "Check 2 — closing cash agrees with the statement of financial position");
  const neg1 = show(BS, "Check 1 — net assets equal capital and reserves");
  console.log("\nNEGATIVE CONTROL — cash at bank moved by £1\n");
  console.log("  Check 2 → " + neg);
  console.log("  Check 1 → " + neg1);
  if (String(neg).startsWith("OK") || String(neg1).startsWith("OK")) pass = false;

  console.log("\n" + (pass ? "PASS — the workbook reconciles on consistent data and flags inconsistent data."
                           : "FAIL"));
  process.exit(pass ? 0 : 1);
});
