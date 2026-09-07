"""Part 4: BedDemand + Accommodation."""
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
exec(open("styles.py").read())
A = json.load(open("assump_rows.json")); L = json.load(open("layout.json"))
def a(k): return f"Assumptions!$C${A[k]}"
T0, T1, W0, W1, WT = L["TROW0"], L["TROW1"], L["WROW0"], L["WROW1"], L["WTOT"]
COMPANIES = L["COMPANIES"]
wb = load_workbook("/home/user/etablix/tools/village-plan.xlsx")

def monthgrid(ws, labelrow=5, numrow=6):
    ws.column_dimensions["A"].width = 5; ws.column_dimensions["B"].width = 46
    for i in range(C0, CN + 1): ws.column_dimensions[col(i)].width = 6.8
    ws.cell(row=labelrow, column=2, value="Month").font = H3
    for m in range(1, MONTHS + 1):
        c = ws.cell(row=labelrow, column=C0 + m - 1, value=f"=Workforce!{col(C0+m-1)}5")
        c.font = LINK; c.alignment = Alignment(horizontal="center"); c.fill = SECFILL
        n = ws.cell(row=numrow, column=C0 + m - 1, value=m)
        n.font = H3; n.alignment = Alignment(horizontal="center"); n.fill = SECFILL
    ws.cell(row=numrow, column=2, value="Month number").font = H3

def row(ws, r, label, formula, fmt="0", bold=False, note=None, indent=0):
    c = ws.cell(row=r, column=2, value=("    " * indent) + label)
    c.font = H3 if bold else BODY
    for m in range(1, MONTHS + 1):
        cl = col(C0 + m - 1)
        cell = ws.cell(row=r, column=C0 + m - 1, value=formula.replace("{c}", cl))
        cell.font = H3 if bold else FORMULA
        cell.number_format = fmt; cell.alignment = Alignment(horizontal="center")
        if bold: cell.fill = TOTFILL
    if note:
        n = ws.cell(row=r, column=CN + 2, value=note); n.font = SMALL

# ─────────────────────────────────────────────── BedDemand
ws = wb.create_sheet("BedDemand"); ws.sheet_view.showGridLines = False
ws["A2"] = "BED DEMAND — WHO NEEDS A ROOM, MONTH BY MONTH"; ws["A2"].font = H1
ws["A3"] = "The whole village follows from this sheet. Headcount from Workforce, travelling percentage from Teams, everything else from Assumptions."; ws["A3"].font = SMALL
monthgrid(ws)
ws.column_dimensions[col(CN + 2)].width = 60
row(ws, 7, "Travelling workers (need accommodation)",
    f"=ROUND(SUMPRODUCT(Workforce!{{c}}${W0}:{{c}}${W1},Teams!$J${T0}:$J${T1}),0)", bold=True,
    note="Headcount × each team's travelling percentage. A local team of 30 needs no beds; a commissioning team of 18 needs 17.")
row(ws, 8, "Local / commuting workers",
    f"=Workforce!{{c}}${WT}-{{c}}7", note="Go home at night. They still eat, park and use welfare on site.")
row(ws, 9, "Present at any one time (rotation applied)",
    f"={{c}}7*{a('rotation')}", note="A rotation means not everyone is on site at once. At 1.00 this line equals the one above.")
row(ws, 10, "Rooms required for residents",
    f"=ROUNDUP({{c}}9*{a('roomsper')},0)")
row(ws, 11, "Void and turnover allowance",
    f"=ROUNDUP({{c}}10*{a('void')},0)", note="Rooms unavailable for cleaning, changeover, damage or maintenance.")
row(ws, 12, "Contingency",
    f"=ROUNDUP({{c}}10*{a('contin')},0)")
row(ws, 13, "Visitor and spare rooms",
    f"=IF({{c}}10>0,{a('visitor')},0)")
row(ws, 14, "TOTAL ROOMS REQUIRED", "=SUM({c}10:{c}13)", bold=True,
    note="This curve is what the village must satisfy. The peak sizes it; the shape decides whether you phase it.")
row(ws, 16, "Occupancy rate against the built village",
    f"=IF($C$22=0,0,{{c}}10/$C$22)", fmt="0%",
    note="Against the peak-sized village. The low months are the cost of building for the peak.")

ws.cell(row=18, column=2, value="THE NUMBERS THAT SIZE THE VILLAGE").font = H2
ws.cell(row=18, column=2).fill = BANDFILL
for cc in range(3, 9): ws.cell(row=18, column=cc).fill = BANDFILL
facts = [
 ("Peak rooms required", f"=MAX({col(C0)}14:{col(CN)}14)", "0", "The village is built to this."),
 ("Month of peak", f"=MATCH(C20,{col(C0)}14:{col(CN)}14,0)", "0", "Everything upstream must be finished before it."),
 ("Peak resident rooms (excluding void, contingency, visitors)", f"=MAX({col(C0)}10:{col(CN)}10)", "0", ""),
 ("First month with any bed demand", f"=MATCH(TRUE,INDEX({col(C0)}14:{col(CN)}14>0,0),0)", "0", "The village must be live before this month, not in it."),
 ("Last month with bed demand", f"=MATCH(2,INDEX(1/({col(C0)}14:{col(CN)}14>0),0))", "0", ""),
 ("Bed-nights over the programme", f"=ROUND(SUM({col(C0)}10:{col(CN)}10)*30.4,0)", "#,##0", "Drives catering, utilities and the unit cost of the whole thing."),
 ("Average occupancy across the live period", f"=IFERROR(AVERAGEIF({col(C0)}10:{col(CN)}10,\">0\")/C20,0)", "0%", "Below about 70% the case for phasing the village gets strong."),
]
r = 20
for lab, f, fmt, note in facts:
    ws.cell(row=r, column=2, value=lab).font = BODY
    c = ws.cell(row=r, column=3, value=f); c.font = FORMULA; c.number_format = fmt
    ws.cell(row=r, column=5, value=note).font = SMALL
    r += 1

ws.cell(row=r + 1, column=2, value="BEDS BY COMPANY — WHO IS RECHARGED FOR WHAT").font = H2
ws.cell(row=r + 1, column=2).fill = BANDFILL
for cc in range(3, 9): ws.cell(row=r + 1, column=cc).fill = BANDFILL
hr = r + 2
for i, h in enumerate(["", "Company", "Peak beds", "Bed-months", "Share of bed-months"]):
    c = ws.cell(row=hr, column=i + 1, value=h); c.font = H3; c.fill = SECFILL
cr = hr + 1
for i, comp in enumerate(COMPANIES):
    rr = cr + i
    ws.cell(row=rr, column=2, value=comp).font = BODY
    peak = (f"=MAX(SUMPRODUCT((Teams!$B${T0}:$B${T1}=$B{rr})*Workforce!{col(C0)}${W0}:{col(C0)}${W1}*Teams!$J${T0}:$J${T1}))")
    # peak across months needs a per-month SUMPRODUCT; use a helper block instead
    ws.cell(row=rr, column=3, value=f"=MAX({col(CN+2)}{rr}:{col(CN+2+MONTHS-1)}{rr})").font = FORMULA
    ws.cell(row=rr, column=4, value=f"=ROUND(SUM({col(CN+2)}{rr}:{col(CN+2+MONTHS-1)}{rr}),0)").font = FORMULA
    ws.cell(row=rr, column=4).number_format = "#,##0"
    ws.cell(row=rr, column=5, value=f"=IFERROR(D{rr}/SUM($D${cr}:$D${cr+len(COMPANIES)-1}),0)").font = FORMULA
    ws.cell(row=rr, column=5).number_format = "0.0%"
    # hidden per-month helper columns
    for m in range(1, MONTHS + 1):
        hc = CN + 2 + m - 1
        f = (f"=SUMPRODUCT((Teams!$B${T0}:$B${T1}=$B{rr})*Workforce!{col(C0+m-1)}${W0}:{col(C0+m-1)}${W1}"
             f"*Teams!$J${T0}:$J${T1})*{a('rotation')}*{a('roomsper')}")
        cc = ws.cell(row=rr, column=hc, value=f); cc.font = FORMULA; cc.number_format = "0.0"
tot = cr + len(COMPANIES)
ws.cell(row=tot, column=2, value="TOTAL").font = H3
ws.cell(row=tot, column=4, value=f"=SUM(D{cr}:D{tot-1})").font = H3
ws.cell(row=tot, column=4).number_format = "#,##0"
ws.cell(row=hr, column=CN + 2, value="Helper — resident rooms by company by month (hide these columns)").font = SMALL
ws.freeze_panes = "C7"
json.dump({"BD_TOTAL":14,"BD_RES":10,"BD_TRAV":7,"BD_PEAKROOMS":20,"BD_PEAKRES":22,
           "BD_BEDNIGHTS":25,"CR":cr,"NCOMP":len(COMPANIES),"COMPTOT":tot,"HELP0":CN+2},
          open("bd.json","w"))
wb.save("/home/user/etablix/tools/village-plan.xlsx")
print("BedDemand written; companies:", len(COMPANIES))
