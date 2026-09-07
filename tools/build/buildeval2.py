"""Scores, Prices, Result, Sensitivity."""
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
exec(open("styles.py").read())
E = json.load(open("eval.json")); Q0, Q1, QT, PW, NC = E["Q0"], E["Q1"], E["QT"], E["PW"], E["NCRIT"]
GBP = '£#,##0;(£#,##0);-'
wb = load_workbook("/home/user/etablix/tools/tender-evaluation.xlsx")
N = 5
TC = [get_column_letter(4 + i) for i in range(N)]   # D..H

def tenderhdr(ws, row, label="Tenderer"):
    ws.cell(row=row, column=3, value=label).font = H3
    for i, c in enumerate(TC):
        cell = ws.cell(row=row, column=4 + i, value=f"=Prices!{c}5" if ws.title != "Prices" else f"Tenderer {i+1}")
        cell.font = LINK if ws.title != "Prices" else INPUT
        cell.alignment = Alignment(horizontal="center"); cell.fill = SECFILL
        if ws.title == "Prices": cell.fill = KEYFILL

# ── Prices
ws = wb.create_sheet("Prices"); ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 4; ws.column_dimensions["B"].width = 6; ws.column_dimensions["C"].width = 42
for c in TC: ws.column_dimensions[c].width = 16
ws.column_dimensions[get_column_letter(4 + N + 1)].width = 60
ws["B2"] = "TENDERED PRICES AND PRICE SCORE"; ws["B2"].font = H1
ws["B3"] = "Prices exactly as returned, before any negotiation or arithmetic correction. Correct arithmetic separately and record it."; ws["B3"].font = SMALL
tenderhdr(ws, 5)
LINES = [("Fixed price element", "input"), ("Provisional sums", "input"), ("Dayworks / remeasure allowance", "input"),
         ("Design fee", "input"), ("Qualifications priced separately", "input")]
r = 6
for lab, _ in LINES:
    ws.cell(row=r, column=3, value=lab).font = BODY
    for i, c in enumerate(TC):
        cell = ws.cell(row=r, column=4 + i); cell.font = INPUT; cell.number_format = GBP; cell.fill = KEYFILL
        cell.border = BOX
    r += 1
TOTROW = r
ws.cell(row=r, column=3, value="TENDER TOTAL").font = H3
for i, c in enumerate(TC):
    cell = ws.cell(row=r, column=4 + i, value=f"=SUM({c}6:{c}{r-1})")
    cell.font = H3; cell.number_format = GBP; cell.fill = TOTFILL
r += 2
ws.cell(row=r, column=3, value="Lowest compliant tender").font = BODY
ws.cell(row=r, column=4, value=f"=MIN({TC[0]}{TOTROW}:{TC[-1]}{TOTROW})").font = FORMULA
ws.cell(row=r, column=4).number_format = GBP
LOW = r; r += 1
ws.cell(row=r, column=3, value="Mean of all tenders").font = BODY
ws.cell(row=r, column=4, value=f"=AVERAGE({TC[0]}{TOTROW}:{TC[-1]}{TOTROW})").font = FORMULA
ws.cell(row=r, column=4).number_format = GBP
MEAN = r; r += 2
ws.cell(row=r, column=3, value="PRICE SCORE (of 5)").font = H3
for i, c in enumerate(TC):
    cell = ws.cell(row=r, column=4 + i, value=f"=IF({c}{TOTROW}=0,0,5*$D${LOW}/{c}{TOTROW})")
    cell.font = H3; cell.number_format = "0.00"; cell.fill = TOTFILL
    cell.alignment = Alignment(horizontal="center")
PSCORE = r
ws.cell(row=r, column=4 + N + 1, value="Lowest price scores 5; the others in proportion. Stated in the ITT so no tenderer is surprised.").font = SMALL
r += 2
ws.cell(row=r, column=3, value="Abnormally low check").font = H3
for i, c in enumerate(TC):
    cell = ws.cell(row=r, column=4 + i, value=f'=IF({c}{TOTROW}=0,"",IF({c}{TOTROW}<$D${MEAN}*0.75,"ASK","ok"))')
    cell.font = Font(name="Arial", size=10, bold=True, color="C0392B"); cell.alignment = Alignment(horizontal="center")
ws.cell(row=r, column=4 + N + 1, value="Flagged at more than 25% below the mean. The duty is to ask the tenderer to explain, in writing, before "
        "excluding or accepting. A tender that is low because the tenderer is efficient is a good tender; one that is low because they have "
        "missed a scope is a claim waiting to happen.").font = SMALL
ws.cell(row=r, column=4 + N + 1).alignment = Alignment(wrap_text=True, vertical="top")
ws.row_dimensions[r].height = 40

# ── Scores
ws = wb.create_sheet("Scores"); ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 4; ws.column_dimensions["B"].width = 6; ws.column_dimensions["C"].width = 42
for c in TC: ws.column_dimensions[c].width = 16
ws.column_dimensions[get_column_letter(4 + N + 1)].width = 46
ws["B2"] = "QUALITY SCORES"; ws["B2"].font = H1
ws["B3"] = "0–5 against each criterion. Every score needs a written reason — if you cannot explain it to the tenderer who lost, it is not a score."; ws["B3"].font = SMALL
tenderhdr(ws, 5)
ws.cell(row=5, column=4 + N + 1, value="Reason for the scores on this criterion").font = H3
ws.cell(row=5, column=4 + N + 1).fill = SECFILL
r = 6
for i in range(NC):
    cr = Q0 + i
    ws.cell(row=r, column=2, value=f"=Criteria!B{cr}").font = LINK
    ws.cell(row=r, column=3, value=f"=Criteria!C{cr}").font = LINK
    for j, c in enumerate(TC):
        cell = ws.cell(row=r, column=4 + j); cell.font = INPUT; cell.number_format = "0"
        cell.fill = KEYFILL; cell.alignment = Alignment(horizontal="center"); cell.border = BOX
    ws.cell(row=r, column=4 + N + 1).font = INPUT
    ws.cell(row=r, column=4 + N + 1).alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[r].height = 22
    r += 1
S0, S1 = 6, r - 1
r += 1
ws.cell(row=r, column=3, value="WEIGHTED QUALITY SCORE (of 5)").font = H3
for j, c in enumerate(TC):
    cell = ws.cell(row=r, column=4 + j, value=f"=SUMPRODUCT({c}{S0}:{c}{S1},Criteria!$D${Q0}:$D${Q1})/Criteria!$D${QT}")
    cell.font = H3; cell.number_format = "0.00"; cell.fill = TOTFILL
    cell.alignment = Alignment(horizontal="center")
QSCORE = r
ws.cell(row=r, column=4 + N + 1, value="Weighted across the quality criteria, then rebased so it is out of 5 like the price score.").font = SMALL
r += 1
ws.cell(row=r, column=3, value="Any criterion scoring 0 or 1?").font = BODY
for j, c in enumerate(TC):
    cell = ws.cell(row=r, column=4 + j, value=f'=IF(COUNTIF({c}{S0}:{c}{S1},"<=1")>0,"REVIEW","ok")')
    cell.font = Font(name="Arial", size=10, bold=True, color="C0392B"); cell.alignment = Alignment(horizontal="center")
ws.cell(row=r, column=4 + N + 1, value="A 0 or 1 on any criterion usually means non-compliance rather than a weak answer. Decide whether the tender is compliant at all before letting the weighted average carry it.").font = SMALL
ws.cell(row=r, column=4 + N + 1).alignment = Alignment(wrap_text=True, vertical="top"); ws.row_dimensions[r].height = 34
json.dump({"TOTROW":TOTROW,"PSCORE":PSCORE,"QSCORE":QSCORE,"S0":S0,"S1":S1,"LOW":LOW,"MEAN":MEAN},
          open("eval2.json","w"))
wb.save("/home/user/etablix/tools/tender-evaluation.xlsx")
print("Prices + Scores written. price score row", PSCORE, "quality score row", QSCORE)
