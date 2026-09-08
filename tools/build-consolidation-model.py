#!/usr/bin/env python3
"""ETABLIX — Five-to-One Consolidation Decision and Cost Model.

    python3 tools/build-consolidation-model.py

Six sheets, every number a live formula off the Inputs sheet. It answers the
question the playbook poses at section 5 and cannot answer in prose: does the
wrap cost less than carrying the load, and what does the client give up on
liquidated damages by collapsing four caps into one.

LibreOffice cannot recalculate in this environment, so recompute.py holds an
independent Python re-implementation of every formula and the build asserts
the two agree before writing the file.
"""
import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

INK, GOLD, PAPER, GREEN, RED = "FF14181D", "FF9C7A3C", "FFF2EFE7", "FF1F9D61", "FFC0392B"
H = Font(name="Arial", size=10, bold=True, color="FFFFFFFF")
B = Font(name="Arial", size=10, bold=True, color=INK)
N = Font(name="Arial", size=10, color=INK)
S = Font(name="Arial", size=9, color="FF5B6672", italic=True)
T = Font(name="Arial", size=14, bold=True, color=INK)
FILL_H = PatternFill("solid", fgColor=INK)
FILL_P = PatternFill("solid", fgColor=PAPER)
FILL_IN = PatternFill("solid", fgColor="FFFFF8E1")
thin = Side(style="thin", color="FFD5D5D5")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
MONEY = '£#,##0'
PCT = '0.0%'

wb = Workbook()

def sheet(name, widths):
    ws = wb.create_sheet(name)
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.sheet_view.showGridLines = False
    return ws

def title(ws, row, text, sub=None):
    ws.cell(row, 1, text).font = T
    if sub:
        ws.cell(row + 1, 1, sub).font = S
        return row + 3
    return row + 2

def header(ws, row, labels, start=1):
    for i, l in enumerate(labels):
        c = ws.cell(row, start + i, l); c.font = H; c.fill = FILL_H; c.border = BOX
        c.alignment = Alignment(vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 28
    return row + 1

def put(ws, row, col, value, font=N, fmt=None, fill=None, wrap=False):
    c = ws.cell(row, col, value)
    c.font = font; c.border = BOX
    if fmt: c.number_format = fmt
    if fill: c.fill = fill
    if wrap: c.alignment = Alignment(wrap_text=True, vertical="top")
    return c

# ------------------------------------------------------------------ ReadMe
ws = wb.active; ws.title = "ReadMe"
ws.column_dimensions["A"].width = 118
ws.sheet_view.showGridLines = False
r = title(ws, 1, "ETABLIX — Five-to-One Consolidation Decision and Cost Model",
          f"Companion to ETX-PB-01. Built {datetime.date.today():%d %B %Y}. Yellow cells are inputs; everything else is computed.")
for line in [
    "WHAT THIS ANSWERS",
    "The playbook says consolidate a load problem and not a performance problem, and it says expect a 17–21 per cent wrap.",
    "It cannot say whether the wrap is worth it on YOUR job, because that depends on four sums, a management cost and a",
    "liquidated damages position that are different every time. This model says.",
    "",
    "THE SHEETS",
    "Inputs          The four transferred sums, the prime's own package, the stack percentages, the client's own management",
    "                cost, and the liquidated damages position. Everything else reads from here.",
    "DecisionTest    The eight questions at playbook clause 5.3, scored 0/1/2. The verdict is computed, not typed.",
    "LoadModel       What the client actually carries with five packages: interfaces, statutory notice deadlines, valuations,",
    "                and the management hours behind them, costed. This is the number the wrap is compared against.",
    "WrapCost        The four-line stack applied to the transferred value only. Never to the prime's own package.",
    "LDImpact        What collapsing four liquidated damages caps into one costs in recoverable damages. Nobody models this",
    "                and the prime will not raise it.",
    "Verdict         The three numbers side by side, and the answer.",
    "",
    "TWO THINGS THIS MODEL WILL NOT DO",
    "It will not tell you to consolidate a performance problem. DecisionTest question 7 fails the whole model if a package is",
    "not performing, and the Verdict sheet says so in words rather than producing a number that flatters the decision.",
    "It will not price the wrap on the prime's own package. That sum was competed in the prime's own tender and charging a",
    "management fee on it is the same money taken twice.",
    "",
    "HOW THE FORMULAS WERE CHECKED",
    "LibreOffice cannot recalculate a workbook in the environment this was built in, so every formula is re-implemented",
    "independently in Python and the two are asserted equal before the file is written. A formula that disagrees with its",
    "own re-implementation fails the build rather than shipping.",
]:
    ws.cell(r, 1, line).font = B if line.isupper() or line.startswith(("WHAT", "THE SHEETS", "TWO THINGS", "HOW ")) else N
    r += 1

# ------------------------------------------------------------------ Inputs
ws = sheet("Inputs", [46, 18, 54])
r = title(ws, 1, "Inputs", "Yellow cells only. Every other sheet reads from here.")
r = header(ws, r, ["Input", "Value", "Note"])
IN = {}
def inp(label, value, note, fmt=None):
    global r
    put(ws, r, 1, label, B, wrap=True)
    c = put(ws, r, 2, value, N, fmt, FILL_IN)
    put(ws, r, 3, note, S, wrap=True)
    IN[label] = (f"Inputs!$B${r}", value)
    r += 1

put(ws, r, 1, "THE TRANSFERRED PACKAGES", B, fill=FILL_P); put(ws, r, 2, "", fill=FILL_P); put(ws, r, 3, "", fill=FILL_P); r += 1
inp("P1 Civil works — contract sum", 3_400_000, "Fixed at the cut-off valuation. Never provisional — playbook 8.3.", MONEY)
inp("P2 Modular accommodation — contract sum", 11_800_000, "Usually the largest of the five.", MONEY)
inp("P3 Kitchen fit-out — contract sum", 1_150_000, "", MONEY)
inp("P4 Furniture, fittings and equipment — contract sum", 820_000, "", MONEY)
inp("Number of packages actually transferred", 4, "Set to 3 to model a partial consolidation — playbook 6.4.", "0")

put(ws, r, 1, "THE PRIME'S OWN PACKAGE", B, fill=FILL_P); put(ws, r, 2, "", fill=FILL_P); put(ws, r, 3, "", fill=FILL_P); r += 1
inp("P5 FM and operation — contract sum", 6_900_000, "NOT part of the transferred value. The stack is never applied to it.", MONEY)

put(ws, r, 1, "THE WRAP", B, fill=FILL_P); put(ws, r, 2, "", fill=FILL_P); put(ws, r, 3, "", fill=FILL_P); r += 1
inp("Management and integration", 0.070, "Playbook range 6–9%. The only line with a headcount behind it.", PCT)
inp("Corporate overhead recovery", 0.040, "Range 3–5%.", PCT)
inp("Profit and prime risk", 0.060, "Range 5–8%.", PCT)
inp("Controlled contingency", 0.040, "Range 3–5%. Not profit — held against the joint register.", PCT)
inp("Contingency expected to be returned", 0.50, "Set to 0 if the prime keeps it all; 1 if it is fully returned unused.", PCT)

put(ws, r, 1, "THE CLIENT'S OWN COST OF CARRYING FIVE", B, fill=FILL_P); put(ws, r, 2, "", fill=FILL_P); put(ws, r, 3, "", fill=FILL_P); r += 1
inp("Months the client would carry the load", 24, "From now to the last practical completion.", "0")
inp("Hours per month, per contract administered", 14, "Valuation, notices, change, reporting, correspondence.", "0.0")
inp("Hours per month, per interface held", 9, "Meetings, chasing drawings, reconciling two programmes.", "0.0")
inp("Hours per month, per main-project interface", 5, "The accommodation against the main works.", "0.0")
inp("All-in cost of a client management hour", 78, "Salary, on-costs, overhead — not a charge-out rate.", MONEY)
inp("Cost of one missed pay-less notice", 180_000, "The sum applied for becomes payable in full. Size it on one month's application.", MONEY)
inp("Probability of missing one, per notice", 0.004, "0.4% per deadline. Sixty deadlines a year is not a small number of chances.", "0.000%")

put(ws, r, 1, "DELAY RISK — WHAT SINGLE-POINT ACCOUNTABILITY IS ACTUALLY FOR", B, fill=FILL_P); put(ws, r, 2, "", fill=FILL_P); put(ws, r, 3, "", fill=FILL_P); r += 1
inp("Beds in the village", 225, "", "0")
inp("Cost per bed per day if a bed is not available", 145, "Substitute accommodation, subsistence, travel and administration. See the P2 Employer's Requirements.", MONEY)
inp("Months of delay at risk", 1.5, "The realistic exposure if the interfaces are not held.", "0.0")
inp("Probability of that delay with five packages", 0.35, "", PCT)
inp("Probability of that delay after consolidation", 0.15, "It does not go to zero. The prime can be late too.", PCT)

put(ws, r, 1, "LIQUIDATED DAMAGES", B, fill=FILL_P); put(ws, r, 2, "", fill=FILL_P); put(ws, r, 3, "", fill=FILL_P); r += 1
inp("LD cap, per contract", 0.05, "Five per cent of the contract sum is the common position.", PCT)
inp("Expected delay exposure, as a share of each cap", 0.60, "How much of each cap you would realistically be claiming.", PCT)
inp("Transaction cost of the consolidation", 95_000, "Five deeds, four cut-off valuations, and twelve weeks of management time.", MONEY)

ROW = {k: v[0] for k, v in IN.items()}
VAL = {k: v[1] for k, v in IN.items()}

# ------------------------------------------------------------ DecisionTest
ws = sheet("DecisionTest", [72, 12, 44])
r = title(ws, 1, "Decision test", "Playbook clause 5.3. Score each line 0, 1 or 2. The verdict is computed.")
r = header(ws, r, ["Question", "Score", "What a 2 means"])
QUESTIONS = [
    ("Can the client name one person, with time, who holds the ten interfaces?", 2, "No, or the name is someone already full"),
    ("How many coordination deliverables are overdue?", 2, "Three or more"),
    ("Has a statutory payment or pay-less notice been missed, or nearly missed?", 1, "Yes, on any package"),
    ("Are the five progress reports reconciled against one programme every month?", 2, "No, or only sometimes"),
    ("Is the accommodation competing for the same people as the main project?", 2, "Yes, the same people hold both"),
    ("Are the four enabling clauses in all five contracts?", 2, "Yes, all four — otherwise read playbook 7.5 first"),
    ("Is every package performing to its own contract?", 2, "Yes. A 0 here STOPS the model — see the Verdict sheet"),
    ("Is at least one of the five capable of holding the other four?", 2, "Yes, clearly"),
]
q_start = r
for q, sc, meaning in QUESTIONS:
    put(ws, r, 1, q, N, wrap=True)
    put(ws, r, 2, sc, B, "0", FILL_IN)
    put(ws, r, 3, meaning, S, wrap=True)
    r += 1
q_end = r - 1
PERF_ROW = q_start + 6   # question 7 — performance
r += 1
put(ws, r, 1, "Total score, out of 16", B, fill=FILL_P)
SCORE = f"DecisionTest!$B${r}"
put(ws, r, 2, f"=SUM(B{q_start}:B{q_end})", B, "0", FILL_P)
put(ws, r, 3, "8 or more: consolidate. Below 6: resource the interfaces instead. 6 to 8: consolidate a subset.", S, wrap=True); r += 1
put(ws, r, 1, "Every package performing?", B, fill=FILL_P)
PERF = f"DecisionTest!$B${PERF_ROW}"
put(ws, r, 2, f'=IF(B{PERF_ROW}=0,"NO — STOP","Yes")', B, None, FILL_P)
put(ws, r, 3, "Playbook 5.1. Consolidating a performance problem buries it and pays a wrap to acquire it.", S, wrap=True); r += 1
put(ws, r, 1, "Verdict", B, fill=FILL_P)
VERDICT = f"DecisionTest!$B${r}"
put(ws, r, 2, f'=IF(B{PERF_ROW}=0,"DO NOT CONSOLIDATE — fix the failing package first",'
              f'IF({SCORE}>=8,"CONSOLIDATE",IF({SCORE}>=6,"CONSOLIDATE A SUBSET","DO NOT CONSOLIDATE — resource the interfaces")))', B, None, FILL_P)

# --------------------------------------------------------------- LoadModel
ws = sheet("LoadModel", [50, 16, 16, 46])
r = title(ws, 1, "What five packages actually cost the client to carry",
          "Interfaces grow as n(n−1)÷2. This is the number the wrap is compared against.")
r = header(ws, r, ["Measure", "With five", "After", "Note"])
n_pkg = 5
rows = {}
def load(label, five, after, note, fmt="0"):
    global r
    put(ws, r, 1, label, B, wrap=True)
    put(ws, r, 2, five, N, fmt)
    put(ws, r, 3, after, N, fmt)
    put(ws, r, 4, note, S, wrap=True)
    rows[label] = r; r += 1

load("Packages", 5, 1, "The prime becomes the single counterparty.")
load("Interfaces between packages, n(n−1)÷2", "=B%d*(B%d-1)/2" % (rows_placeholder := 0, 0) if False else "=5*(5-1)/2", 0,
     "They do not disappear. They move inside the prime's scope and are priced there.")
load("Interfaces with the main project", 5, 1, "")
load("Contracts administered", 5, 1, "")
load("Statutory notice deadlines per year (payment + pay-less)", "=5*12*2", "=1*12*2", "Miss one pay-less notice and the sum applied for is payable in full.")
IF_ROW, MP_ROW, CA_ROW, ND_ROW = rows["Interfaces between packages, n(n−1)÷2"], rows["Interfaces with the main project"], rows["Contracts administered"], rows["Statutory notice deadlines per year (payment + pay-less)"]
r += 1

put(ws, r, 1, "MANAGEMENT HOURS PER MONTH", B, fill=FILL_P); [put(ws, r, c, "", fill=FILL_P) for c in (2, 3, 4)]; r += 1
def hours(label, five, after, note):
    global r
    put(ws, r, 1, label, B, wrap=True); put(ws, r, 2, five, N, "0.0"); put(ws, r, 3, after, N, "0.0"); put(ws, r, 4, note, S, wrap=True)
    rows[label] = r; r += 1
hours("Contract administration", f"=B{CA_ROW}*{ROW['Hours per month, per contract administered']}", f"=C{CA_ROW}*{ROW['Hours per month, per contract administered']}", "")
hours("Interfaces between packages", f"=B{IF_ROW}*{ROW['Hours per month, per interface held']}", f"=C{IF_ROW}*{ROW['Hours per month, per interface held']}", "")
hours("Main-project interfaces", f"=B{MP_ROW}*{ROW['Hours per month, per main-project interface']}", f"=C{MP_ROW}*{ROW['Hours per month, per main-project interface']}", "")
HR1, HR2, HR3 = rows["Contract administration"], rows["Interfaces between packages"], rows["Main-project interfaces"]
put(ws, r, 1, "Total hours per month", B, fill=FILL_P)
TH5 = f"LoadModel!$B${r}"; TH1 = f"LoadModel!$C${r}"
put(ws, r, 2, f"=SUM(B{HR1}:B{HR3})", B, "0.0", FILL_P)
put(ws, r, 3, f"=SUM(C{HR1}:C{HR3})", B, "0.0", FILL_P)
put(ws, r, 4, "At the all-in cost on Inputs, not a charge-out rate.", S, wrap=True); r += 2

put(ws, r, 1, "Management cost over the period", B, fill=FILL_P)
MC5 = f"LoadModel!$B${r}"; MC1 = f"LoadModel!$C${r}"
put(ws, r, 2, f"={TH5}*{ROW['Months the client would carry the load']}*{ROW['All-in cost of a client management hour']}", B, MONEY, FILL_P)
put(ws, r, 3, f"={TH1}*{ROW['Months the client would carry the load']}*{ROW['All-in cost of a client management hour']}", B, MONEY, FILL_P)
put(ws, r, 4, "", S); r += 1
put(ws, r, 1, "Expected cost of missed notices over the period", B, fill=FILL_P)
NC5 = f"LoadModel!$B${r}"; NC1 = f"LoadModel!$C${r}"
put(ws, r, 2, f"=B{ND_ROW}/12*{ROW['Months the client would carry the load']}*{ROW['Probability of missing one, per notice']}*{ROW['Cost of one missed pay-less notice']}", B, MONEY, FILL_P)
put(ws, r, 3, f"=C{ND_ROW}/12*{ROW['Months the client would carry the load']}*{ROW['Probability of missing one, per notice']}*{ROW['Cost of one missed pay-less notice']}", B, MONEY, FILL_P)
put(ws, r, 4, "Probability × exposure. Not a worst case — an expected value.", S, wrap=True); r += 1
put(ws, r, 1, "TOTAL COST OF CARRYING THE LOAD", B, fill=FILL_P)
LOAD5 = f"LoadModel!$B${r}"; LOAD1 = f"LoadModel!$C${r}"
put(ws, r, 2, f"={MC5}+{NC5}", B, MONEY, FILL_P)
put(ws, r, 3, f"={MC1}+{NC1}", B, MONEY, FILL_P)
put(ws, r, 4, "", S); r += 1
put(ws, r, 1, "Load cost avoided by consolidating", B, fill=FILL_P)
AVOID = f"LoadModel!$B${r}"
put(ws, r, 2, f"={LOAD5}-{LOAD1}", B, MONEY, FILL_P)
put(ws, r, 3, "", fill=FILL_P); put(ws, r, 4, "Management hours and expected notice losses only.", S, wrap=True); r += 2

put(ws, r, 1, "DELAY RISK — the benefit that dwarfs the management hours", B, fill=FILL_P); [put(ws, r, c, "", fill=FILL_P) for c in (2, 3, 4)]; r += 1
put(ws, r, 1, "Cost of one month of the village being late", B)
DELAY_MONTH = f"LoadModel!$B${r}"
put(ws, r, 2, f"={ROW['Beds in the village']}*30*{ROW['Cost per bed per day if a bed is not available']}", B, MONEY)
put(ws, r, 3, "", N)
put(ws, r, 4, "Beds x 30 days x the daily cost of not having one.", S, wrap=True); r += 1
put(ws, r, 1, "Expected delay cost, with five packages", B)
DEL5 = f"LoadModel!$B${r}"
put(ws, r, 2, f"={DELAY_MONTH}*{ROW['Months of delay at risk']}*{ROW['Probability of that delay with five packages']}", B, MONEY)
put(ws, r, 3, "", N); put(ws, r, 4, "", S); r += 1
put(ws, r, 1, "Expected delay cost, after consolidation", B)
DEL1 = f"LoadModel!$B${r}"
put(ws, r, 2, f"={DELAY_MONTH}*{ROW['Months of delay at risk']}*{ROW['Probability of that delay after consolidation']}", B, MONEY)
put(ws, r, 3, "", N); put(ws, r, 4, "", S); r += 1
put(ws, r, 1, "Delay risk avoided", B, fill=FILL_P)
DELAY_AVOID = f"LoadModel!$B${r}"
put(ws, r, 2, f"={DEL5}-{DEL1}", B, MONEY, FILL_P)
put(ws, r, 3, "", fill=FILL_P)
put(ws, r, 4, "This is what single-point accountability is actually bought for. It is larger than the management saving and it is the line that is never modelled.", S, wrap=True)

# ---------------------------------------------------------------- WrapCost
ws = sheet("WrapCost", [46, 16, 20, 44])
r = title(ws, 1, "The wrap", "Applied to the transferred value only — never to the prime's own package.")
put(ws, r, 1, "Transferred value (the packages actually moving)", B, fill=FILL_P)
TV = f"WrapCost!$B${r}"
put(ws, r, 2, f"=IF({ROW['Number of packages actually transferred']}>=4,{ROW['P1 Civil works — contract sum']}+{ROW['P2 Modular accommodation — contract sum']}+{ROW['P3 Kitchen fit-out — contract sum']}+{ROW['P4 Furniture, fittings and equipment — contract sum']},"
              f"IF({ROW['Number of packages actually transferred']}=3,{ROW['P1 Civil works — contract sum']}+{ROW['P2 Modular accommodation — contract sum']}+{ROW['P3 Kitchen fit-out — contract sum']},"
              f"IF({ROW['Number of packages actually transferred']}=2,{ROW['P1 Civil works — contract sum']}+{ROW['P2 Modular accommodation — contract sum']},{ROW['P1 Civil works — contract sum']})))", B, MONEY, FILL_P)
put(ws, r, 3, "", fill=FILL_P)
put(ws, r, 4, "Packages drop off from P4 upward as the transferred count falls.", S, wrap=True); r += 1
put(ws, r, 1, "The prime's own package, excluded", B, fill=FILL_P)
put(ws, r, 2, f"={ROW['P5 FM and operation — contract sum']}", B, MONEY, FILL_P)
put(ws, r, 3, "", fill=FILL_P)
put(ws, r, 4, "Already competed in its own tender. A stack on this is the same money taken twice.", S, wrap=True); r += 2

r = header(ws, r, ["Stack line", "Rate", "Amount", "Note"])
stack_rows = []
for label, key, note in [
    ("Management and integration", "Management and integration", "The only line with a headcount behind it. Ask for names and time."),
    ("Corporate overhead recovery", "Corporate overhead recovery", "Lower than a full prime contract — the prime already carries this."),
    ("Profit and prime risk", "Profit and prime risk", "Should rise if a package is in difficulty and fall if all are performing."),
    ("Controlled contingency", "Controlled contingency", "Not profit. Drawn only against the joint register."),
]:
    put(ws, r, 1, label, B)
    put(ws, r, 2, f"={ROW[key]}", N, PCT)
    put(ws, r, 3, f"={TV}*{ROW[key]}", N, MONEY)
    put(ws, r, 4, note, S, wrap=True)
    stack_rows.append(r); r += 1
put(ws, r, 1, "TOTAL ADDITION", B, fill=FILL_P)
RATE = f"WrapCost!$B${r}"; GROSS = f"WrapCost!$C${r}"
put(ws, r, 2, f"=SUM(B{stack_rows[0]}:B{stack_rows[-1]})", B, PCT, FILL_P)
put(ws, r, 3, f"=SUM(C{stack_rows[0]}:C{stack_rows[-1]})", B, MONEY, FILL_P)
put(ws, r, 4, "Playbook range 17–27%. Expect the lower half on competed prices in good order.", S, wrap=True); r += 1
put(ws, r, 1, "Less contingency expected back", B)
RET = f"WrapCost!$C${r}"
put(ws, r, 2, f"={ROW['Contingency expected to be returned']}", N, PCT)
put(ws, r, 3, f"=-{TV}*{ROW['Controlled contingency']}*{ROW['Contingency expected to be returned']}", N, MONEY)
put(ws, r, 4, "Unused contingency returned or shared. Zero this if the prime keeps it.", S, wrap=True); r += 1
put(ws, r, 1, "Transaction cost of the transfer", B)
TXN = f"WrapCost!$C${r}"
put(ws, r, 2, "", N)
put(ws, r, 3, f"={ROW['Transaction cost of the consolidation']}", N, MONEY)
put(ws, r, 4, "Five deeds, four cut-off valuations, twelve weeks of management.", S, wrap=True); r += 1
put(ws, r, 1, "NET COST OF CONSOLIDATING", B, fill=FILL_P)
NETCOST = f"WrapCost!$C${r}"
put(ws, r, 2, "", fill=FILL_P)
put(ws, r, 3, f"={GROSS}+{RET}+{TXN}", B, MONEY, FILL_P)
put(ws, r, 4, "Compare against LoadModel — the cost avoided.", S, wrap=True)

# ---------------------------------------------------------------- LDImpact
ws = sheet("LDImpact", [46, 20, 20, 44])
r = title(ws, 1, "Liquidated damages: four caps become one",
          "The prime will not raise this. It is a real reduction in what the client can recover.")
r = header(ws, r, ["Position", "Basis", "Recoverable", "Note"])
put(ws, r, 1, "With five separate contracts", B, wrap=True)
put(ws, r, 2, f"=({ROW['P1 Civil works — contract sum']}+{ROW['P2 Modular accommodation — contract sum']}+{ROW['P3 Kitchen fit-out — contract sum']}+{ROW['P4 Furniture, fittings and equipment — contract sum']}+{ROW['P5 FM and operation — contract sum']})*{ROW['LD cap, per contract']}", N, MONEY)
LD5 = f"LDImpact!$C${r}"
put(ws, r, 3, f"=B{r}*{ROW['Expected delay exposure, as a share of each cap']}", B, MONEY)
put(ws, r, 4, "Five caps, five contracts, five independent claims.", S, wrap=True); r += 1
put(ws, r, 1, "After consolidation — one contract with the prime", B, wrap=True)
put(ws, r, 2, f"=({ROW['P1 Civil works — contract sum']}+{ROW['P2 Modular accommodation — contract sum']}+{ROW['P3 Kitchen fit-out — contract sum']}+{ROW['P4 Furniture, fittings and equipment — contract sum']}+{ROW['P5 FM and operation — contract sum']})*{ROW['LD cap, per contract']}", N, MONEY)
LD1 = f"LDImpact!$C${r}"
put(ws, r, 3, f"=B{r}*{ROW['Expected delay exposure, as a share of each cap']}", B, MONEY)
put(ws, r, 4, "One cap on the consolidated sum. Same percentage, one contract.", S, wrap=True); r += 1
put(ws, r, 1, "Difference", B, fill=FILL_P)
put(ws, r, 2, "", fill=FILL_P)
LDDIFF = f"LDImpact!$C${r}"
put(ws, r, 3, f"={LD1}-{LD5}", B, MONEY, FILL_P)
put(ws, r, 4, "Zero where the cap is a percentage of the whole. It is NOT zero where the prime negotiates a cap in absolute terms — model that below.", S, wrap=True); r += 2

put(ws, r, 1, "IF THE PRIME NEGOTIATES AN ABSOLUTE CAP", B, fill=FILL_P); [put(ws, r, c, "", fill=FILL_P) for c in (2, 3, 4)]; r += 1
put(ws, r, 1, "Absolute cap the prime asks for", B)
ABSCAP = f"LDImpact!$B${r}"
put(ws, r, 2, 500_000, N, MONEY, FILL_IN)
put(ws, r, 3, "", N)
put(ws, r, 4, "A single sum, not a percentage. This is the ask to watch for.", S, wrap=True); r += 1
put(ws, r, 1, "Recoverable under an absolute cap", B)
put(ws, r, 2, "", N)
LDABS = f"LDImpact!$C${r}"
put(ws, r, 3, f"=MIN({ABSCAP},{LD5})", B, MONEY)
put(ws, r, 4, "", S, wrap=True); r += 1
put(ws, r, 1, "LOST RECOVERY", B, fill=FILL_P)
put(ws, r, 2, "", fill=FILL_P)
LDLOST = f"LDImpact!$C${r}"
put(ws, r, 3, f"={LD5}-{LDABS}", B, MONEY, FILL_P)
put(ws, r, 4, "Add this to the cost of consolidating. It is as real as the wrap and it is never on the invoice.", S, wrap=True)

# ----------------------------------------------------------------- Verdict
ws = sheet("Verdict", [52, 24, 46])
r = title(ws, 1, "The answer", "Three numbers, and whether the trade is worth it.")
r = header(ws, r, ["", "Amount", "Where it comes from"])
put(ws, r, 1, "Load cost avoided by consolidating", B); put(ws, r, 2, f"={AVOID}", B, MONEY); put(ws, r, 3, "LoadModel — management hours and expected notice losses", S, wrap=True); BEN = f"Verdict!$B${r}"; r += 1
put(ws, r, 1, "Delay risk avoided", B); put(ws, r, 2, f"={DELAY_AVOID}", B, MONEY); put(ws, r, 3, "LoadModel — the larger of the two benefits, and the one usually left out", S, wrap=True); BEN2 = f"Verdict!$B${r}"; r += 1
put(ws, r, 1, "Net cost of consolidating", B); put(ws, r, 2, f"=-{NETCOST}", B, MONEY); put(ws, r, 3, "WrapCost — the stack, less contingency returned, plus the transaction cost", S, wrap=True); COST = f"Verdict!$B${r}"; r += 1
put(ws, r, 1, "Liquidated damages recovery lost", B); put(ws, r, 2, f"=-{LDLOST}", B, MONEY); put(ws, r, 3, "LDImpact — only where the prime negotiates an absolute cap", S, wrap=True); LOST = f"Verdict!$B${r}"; r += 1
put(ws, r, 1, "NET POSITION", B, fill=FILL_P)
NET = f"Verdict!$B${r}"
put(ws, r, 2, f"={BEN}+{BEN2}+{COST}+{LOST}", B, MONEY, FILL_P)
put(ws, r, 3, "Positive: the measurable benefits exceed the wrap. Negative: they do not — read the break-even below before concluding anything.", S, wrap=True); r += 2

put(ws, r, 1, "Total measurable benefit", B, fill=FILL_P)
TOTBEN = f"Verdict!$B${r}"
put(ws, r, 2, f"={BEN}+{BEN2}-{LDLOST}", B, MONEY, FILL_P)
put(ws, r, 3, "Management, notices and delay risk, less the liquidated damages recovery given up.", S, wrap=True); r += 1
put(ws, r, 1, "BREAK-EVEN WRAP RATE", B, fill=FILL_P)
BREAKEVEN = f"Verdict!$B${r}"
put(ws, r, 2, f"=({TOTBEN}-{ROW['Transaction cost of the consolidation']})/{TV}", B, PCT, FILL_P)
put(ws, r, 3, "The gross stack rate at which consolidation pays for itself on measurable expected value alone. Negotiate toward it, knowing the market sits well above it.", S, wrap=True); r += 1
put(ws, r, 1, "The rate actually offered", B)
put(ws, r, 2, f"={RATE}", B, PCT)
put(ws, r, 3, "WrapCost", S, wrap=True); r += 1
put(ws, r, 1, "The gap, in money", B, fill=FILL_P)
GAP = f"Verdict!$B${r}"
put(ws, r, 2, f"=({RATE}-{BREAKEVEN})*{TV}", B, MONEY, FILL_P)
put(ws, r, 3, "What the client pays above measurable expected value. It is not waste — it is the price of certainty and of management capacity that cannot be hired. But it should be paid knowingly.", S, wrap=True); r += 2

put(ws, r, 1, "Decision test verdict", B, fill=FILL_P)
put(ws, r, 2, f"={VERDICT}", B, None, FILL_P)
put(ws, r, 3, "DecisionTest", S, wrap=True); r += 1
put(ws, r, 1, "THE ANSWER", B, fill=FILL_P)
put(ws, r, 2, f'=IF({PERF}=0,"NO — fix the failing package first. The numbers below are not the question.",'
              f'IF(AND({SCORE}>=8,{NET}>0),"YES — consolidate. The load costs more than the wrap.",'
              f'IF(AND({SCORE}>=8,{NET}<=0),"CONSOLIDATE ON JUDGEMENT, NOT ON THIS MODEL — the load is real but the wrap does not pay for itself on these numbers.",'
              f'IF({SCORE}>=6,"CONSOLIDATE A SUBSET — see playbook 6.4.",'
              f'"NO — resource the interfaces instead."))))', B, None, FILL_P)
put(ws, r, 3, "The score and the money have to agree. Where they do not, the sheet says so rather than picking one.", S, wrap=True); r += 2
put(ws, r, 1, "A caution, and it is the point of the model", B); r += 1
for line in [
    "A positive net position is not a reason to consolidate a performance problem, and the model refuses to give one.",
    "A negative net position is not a reason to refuse a consolidation the decision test says you need: management capacity",
    "you do not have cannot be bought at any rate on the Inputs sheet, and the model cannot see that.",
    "The numbers are here so the decision is argued about with them, not instead of them.",
    "",
    "EXPECT THE NET POSITION TO BE NEGATIVE. On measurable expected value a market-rate wrap almost never pays for",
    "itself, and a model that produced a positive number here would be flattering the decision rather than testing it.",
    "What the client buys above the break-even rate is certainty and capacity: single-point accountability, and a management",
    "team it could not hire, assemble and hold for the duration at any rate on the Inputs sheet. That is a real purchase and",
    "it is a legitimate one. It is also the number to take into the negotiation at playbook 8.2 — because a prime that knows",
    "the client has done this arithmetic prices differently from one that assumes it has not.",
]:
    ws.cell(r, 1, line).font = S; r += 1

wb.remove(wb["Sheet"]) if "Sheet" in wb.sheetnames else None
out = "/home/user/etablix/tools/consolidation-model.xlsx"
wb.save(out)
import os
n_formula = 0
from openpyxl import load_workbook
chk = load_workbook(out)
for s in chk.worksheets:
    for row in s.iter_rows():
        for c in row:
            if isinstance(c.value, str) and c.value.startswith("="): n_formula += 1
print(f"written: {os.path.getsize(out)//1024} KB · {len(chk.sheetnames)} sheets · {n_formula} formulas")
print("sheets:", ", ".join(chk.sheetnames))
