#!/usr/bin/env python3
"""Independent check of consolidation-model.xlsx.

LibreOffice cannot recalculate a workbook in this environment, so a formula
that is wrong would ship looking right. This does two things instead:

  1  Evaluates every formula in the workbook with a small evaluator that
     resolves cell references itself — so the wiring is exercised.
  2  Compares the results against arithmetic derived here, by hand, from the
     inputs — so the intent is exercised too.

A disagreement between the two fails, and the build is not to be trusted
until it passes.
"""
import re, sys
from openpyxl import load_workbook
from openpyxl.utils import column_index_from_string

wb = load_workbook("consolidation-model.xlsx")
CELLS = {}                      # (sheet, coord) -> literal or formula
for ws in wb.worksheets:
    for row in ws.iter_rows():
        for c in row:
            if c.value is not None:
                CELLS[(ws.title, c.coordinate)] = c.value

REF = re.compile(r"(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))!\$?([A-Z]{1,3})\$?(\d+)|\$?([A-Z]{1,3})\$?(\d+)")

def value(sheet, coord, seen=()):
    key = (sheet, coord)
    if key in seen: raise ValueError(f"circular reference at {sheet}!{coord}")
    v = CELLS.get(key)
    if v is None: return 0
    if isinstance(v, str) and v.startswith("="): return evaluate(v[1:], sheet, seen + (key,))
    if isinstance(v, str): return v
    return v

def evaluate(expr, sheet, seen=()):
    # SUM(range)
    def do_sum(m):
        s = m.group(1) or sheet
        c1, r1, c2, r2 = m.group(2), int(m.group(3)), m.group(4), int(m.group(5))
        tot = 0
        for ci in range(column_index_from_string(c1), column_index_from_string(c2) + 1):
            for ri in range(r1, r2 + 1):
                from openpyxl.utils import get_column_letter
                x = value(s, f"{get_column_letter(ci)}{ri}", seen)
                tot += x if isinstance(x, (int, float)) else 0
        return repr(tot)
    expr = re.sub(r"SUM\((?:([A-Za-z]+)!)?\$?([A-Z]{1,3})\$?(\d+):\$?([A-Z]{1,3})\$?(\d+)\)", do_sum, expr)

    def repl(m):
        s = m.group(1) or m.group(2) or sheet
        col = m.group(3) or m.group(5); row = m.group(4) or m.group(6)
        x = value(s, f"{col}{row}", seen)
        return repr(x)
    # protect function names from being read as references
    expr = re.sub(r"\b(IF|AND|OR|MIN|MAX)\b", lambda m: "@" + m.group(1) + "@", expr)
    expr = REF.sub(repl, expr)
    expr = expr.replace("@IF@", "IF").replace("@AND@", "AND").replace("@OR@", "OR").replace("@MIN@", "MIN").replace("@MAX@", "MAX")
    expr = re.sub(r"(?<![<>!])=", "==", expr).replace("<==", "<=").replace(">==", ">=").replace("!==", "!=")
    def IF(c, a, b): return a if c else b
    def AND(*a): return all(a)
    def OR(*a): return any(a)
    return eval(expr, {"IF": IF, "AND": AND, "OR": OR, "MIN": min, "MAX": max})

# ---- 1. every formula evaluates
errors = []
n = 0
for (s, coord), v in CELLS.items():
    if isinstance(v, str) and v.startswith("="):
        n += 1
        try: evaluate(v[1:], s)
        except Exception as e: errors.append(f"{s}!{coord}  {v}  -> {e}")
if errors:
    print("FORMULAS THAT DO NOT EVALUATE:")
    for e in errors[:10]: print("  " + e)
    sys.exit(1)

# ---- 2. hand-derived arithmetic
P1, P2, P3, P4, P5 = 3_400_000, 11_800_000, 1_150_000, 820_000, 6_900_000
mgmt, oh, prof, cont, cont_back = .07, .04, .06, .04, .50
months, h_ca, h_if, h_mp, rate = 24, 14, 9, 5, 78
miss_cost, miss_p = 180_000, .004
beds, per_bed_day, delay_months, p5_delay, p1_delay = 225, 145, 1.5, .35, .15
ld_cap, ld_exp, txn, abs_cap = .05, .60, 95_000, 500_000

TV = P1 + P2 + P3 + P4
interfaces = 5 * 4 / 2
notices5, notices1 = 5 * 12 * 2, 1 * 12 * 2
hrs5 = 5 * h_ca + interfaces * h_if + 5 * h_mp
hrs1 = 1 * h_ca + 0 * h_if + 1 * h_mp
mc5, mc1 = hrs5 * months * rate, hrs1 * months * rate
nc5 = notices5 / 12 * months * miss_p * miss_cost
nc1 = notices1 / 12 * months * miss_p * miss_cost
avoid = (mc5 + nc5) - (mc1 + nc1)
delay_month = beds * 30 * per_bed_day
delay_avoid = delay_month * delay_months * p5_delay - delay_month * delay_months * p1_delay
gross = TV * (mgmt + oh + prof + cont)
netcost = gross - TV * cont * cont_back + txn
ld5 = (P1 + P2 + P3 + P4 + P5) * ld_cap * ld_exp
ld_lost = ld5 - min(abs_cap, ld5)
totben = avoid + delay_avoid - ld_lost
breakeven = (totben - txn) / TV
net = avoid + delay_avoid - netcost - ld_lost

def find(sheet, label, col=2):
    for (s, coord), v in CELLS.items():
        if s == sheet and coord.startswith("A") and v == label:
            return value(sheet, f"{'ABC'[col-1]}{coord[1:]}")
    raise KeyError(f"{sheet}: {label}")

checks = [
    ("transferred value",            find("WrapCost", "Transferred value (the packages actually moving)"), TV),
    ("interfaces, n(n-1)/2",         find("LoadModel", "Interfaces between packages, n(n−1)÷2"), interfaces),
    ("notice deadlines, five",       find("LoadModel", "Statutory notice deadlines per year (payment + pay-less)"), notices5),
    ("notice deadlines, one",        find("LoadModel", "Statutory notice deadlines per year (payment + pay-less)", 3), notices1),
    ("total hours, five",            find("LoadModel", "Total hours per month"), hrs5),
    ("total hours, one",             find("LoadModel", "Total hours per month", 3), hrs1),
    ("load cost avoided",            find("LoadModel", "Load cost avoided by consolidating"), avoid),
    ("cost of one month late",       find("LoadModel", "Cost of one month of the village being late"), delay_month),
    ("delay risk avoided",           find("LoadModel", "Delay risk avoided"), delay_avoid),
    ("gross wrap",                   find("WrapCost", "TOTAL ADDITION", 3), gross),
    ("net cost of consolidating",    find("WrapCost", "NET COST OF CONSOLIDATING", 3), netcost),
    ("LD recoverable, five",         find("LDImpact", "With five separate contracts", 3), ld5),
    ("LD recovery lost",             find("LDImpact", "LOST RECOVERY", 3), ld_lost),
    ("total measurable benefit",     find("Verdict", "Total measurable benefit"), totben),
    ("break-even wrap rate",         find("Verdict", "BREAK-EVEN WRAP RATE"), breakeven),
    ("net position",                 find("Verdict", "NET POSITION"), net),
]
bad = 0
print(f"{n} formulas evaluated, none failed.\n")
for name, got, want in checks:
    ok = abs(float(got) - float(want)) < 0.51
    if not ok: bad += 1
    shown = f"{got:,.4f}" if abs(float(got)) < 10 else f"{got:,.0f}"
    print(f"  {'OK ' if ok else 'BAD'}  {name:<28} {shown:>14}" + ("" if ok else f"   expected {want:,.2f}"))

print(f"\n  Verdict text: {find('Verdict', 'THE ANSWER')}")
print(f"  Decision test: {find('DecisionTest', 'Verdict')}")
print(f"\n{'ALL AGREE' if not bad else str(bad) + ' DISAGREEMENTS'}")
sys.exit(1 if bad else 0)
