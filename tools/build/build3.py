"""Part 3: Teams, Workforce, BedDemand."""
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
exec(open("styles.py").read())
A = json.load(open("assump_rows.json"))
def a(k): return f"Assumptions!$C${A[k]}"

TEAMS = [
 ("T01","Marrowbridge Infrastructure Ltd","Project management team","Management",18,1,3,36,38,0.55,"Days Mon–Fri","Main contractor"),
 ("T02","Marrowbridge Infrastructure Ltd","Site supervision","Supervision",20,3,6,34,36,0.60,"Days + back shift","Main contractor"),
 ("T03","Marrowbridge Infrastructure Ltd","HSEQ & quality","HSEQ",8,2,4,35,37,0.50,"Days Mon–Fri","Main contractor"),
 ("T04","Redmoor Groundworks Ltd","Earthworks gang A","Earthworks",34,3,5,14,16,0.35,"Days 6/7","Subcontractor"),
 ("T05","Redmoor Groundworks Ltd","Earthworks gang B","Earthworks",26,5,7,13,15,0.35,"Days 6/7","Subcontractor"),
 ("T06","Calderbrook Civils Ltd","Compound & hardstanding","Civils",30,2,4,9,11,0.40,"Days 6/7","Subcontractor"),
 ("T07","Calderbrook Civils Ltd","Foundations & structures","Civils",33,8,11,22,25,0.45,"Days 6/7","Subcontractor"),
 ("T08","Calderbrook Civils Ltd","Drainage & ducting","Civils",16,6,8,20,22,0.40,"Days 6/7","Subcontractor"),
 ("T09","Northgate Steel Ltd","Steel erection","Steelwork",33,14,17,26,29,0.80,"Two shift","Subcontractor"),
 ("T10","Northgate Steel Ltd","Cladding & envelope","Envelope",21,20,22,30,32,0.75,"Two shift","Subcontractor"),
 ("T11","Ledwyn Scaffolding Ltd","Scaffold gangs","Scaffold",14,12,14,30,33,0.70,"Days 6/7","Subcontractor"),
 ("T12","Penmark Cable Services Ltd","Cable pulling","Cable",26,16,19,30,33,0.85,"Two shift","Specialist"),
 ("T13","Penmark Cable Services Ltd","Jointing & terminations","Cable",19,22,25,33,35,0.90,"Two shift","Specialist"),
 ("T14","Ashfell M&E Ltd","Mechanical installation","M&E",24,20,23,32,34,0.70,"Days 6/7","Subcontractor"),
 ("T15","Ashfell M&E Ltd","Electrical installation","M&E",28,21,24,33,35,0.70,"Days 6/7","Subcontractor"),
 ("T16","Ironvale Welding Ltd","Pipe & vessel welding","Welding",14,22,24,31,33,0.90,"Two shift","Specialist"),
 ("T17","Vellamo Power Systems Ltd","HV plant installation","HV plant",20,26,28,34,36,0.85,"Days 6/7","Specialist"),
 ("T18","Southgate Testing & Commissioning Ltd","Testing & commissioning","Commissioning",18,30,32,37,38,0.95,"Days + call out","Specialist"),
 ("T19","Tarnhow Logistics Ltd","Plant, cranes & logistics","Logistics",14,2,4,34,37,0.45,"Days 6/7","Subcontractor"),
 ("T20","Brightbay Facilities Management Ltd","Village operations","Village ops",22,1,3,37,38,0.30,"24/7 rota","Village operator"),
 ("T21","Kestrel Security Ltd","Site & village security","Security",12,1,2,38,38,0.25,"24/7 rota","Village operator"),
 ("T22","Hollins Catering Ltd","Catering & housekeeping","Catering",14,2,4,37,38,0.40,"Split shift","Village operator"),
]
COMPANIES = sorted({t[1] for t in TEAMS})
TROW0, TROW1 = 5, 5 + len(TEAMS) - 1          # Teams data rows
WROW0, WROW1 = 7, 7 + len(TEAMS) - 1          # Workforce data rows
WTOT = WROW1 + 1

wb = load_workbook("/home/user/etablix/tools/village-plan.xlsx")

# ─────────────────────────────────────────────── Teams
ws = wb.create_sheet("Teams")
ws.sheet_view.showGridLines = False
widths = [7, 34, 27, 15, 9, 8, 8, 9, 8, 10, 17, 16, 34]
for i, w in enumerate(widths): ws.column_dimensions[get_column_letter(i + 1)].width = w
ws["A2"] = "COMPANIES AND TEAMS"; ws["A2"].font = H1
ws["A3"] = ("Every blue cell is yours. Add or remove rows inside the block and the whole model follows — "
            "but if you add rows below the last team, extend the ranges on Workforce and BedDemand to match."); ws["A3"].font = SMALL
head = ["Ref","Company","Team / package","Trade","Peak","Start\nmonth","At full\nmonth","Last full\nmonth","End\nmonth",
        "Travelling\n%","Shift pattern","Role","Notes"]
for i, h in enumerate(head):
    c = ws.cell(row=4, column=i + 1, value=h); c.font = H3; c.fill = SECFILL
    c.alignment = Alignment(wrap_text=True, vertical="bottom", horizontal="center" if i >= 4 else "left")
    c.border = Border(bottom=Side(style="medium", color="14181D"))
ws.row_dimensions[4].height = 30
for i, t in enumerate(TEAMS):
    rr = TROW0 + i
    vals = [t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9], t[10], t[11], ""]
    for j, v in enumerate(vals):
        c = ws.cell(row=rr, column=j + 1, value=v)
        c.font = INPUT if j >= 4 else BODY
        c.border = BOX
        if j == 9: c.number_format = "0%"
        if j >= 4: c.alignment = Alignment(horizontal="center")
ws.cell(row=TROW1 + 2, column=2, value="Companies represented").font = H3
ws.cell(row=TROW1 + 2, column=5, value=f"=SUMPRODUCT(1/COUNTIF(B{TROW0}:B{TROW1},B{TROW0}:B{TROW1}))").font = FORMULA
ws.cell(row=TROW1 + 3, column=2, value="Teams").font = H3
ws.cell(row=TROW1 + 3, column=5, value=f"=COUNTA(A{TROW0}:A{TROW1})").font = FORMULA
ws.cell(row=TROW1 + 4, column=2, value="Sum of team peaks (not the site peak — teams peak at different times)").font = BODY
ws.cell(row=TROW1 + 4, column=5, value=f"=SUM(E{TROW0}:E{TROW1})").font = FORMULA
ws.freeze_panes = "E5"

# ─────────────────────────────────────────────── Workforce
ws = wb.create_sheet("Workforce")
ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 7; ws.column_dimensions["B"].width = 34
for i in range(C0, CN + 1): ws.column_dimensions[col(i)].width = 6.6
ws["A2"] = "WORKFORCE CURVE — HEADCOUNT BY TEAM, BY MONTH"; ws["A2"].font = H1
ws["A3"] = "Calculated from Teams. Nothing here is typed. A team ramps from its start month to full, holds, then ramps down to its end month."; ws["A3"].font = SMALL
ws.cell(row=5, column=2, value="Month label").font = H3
ws.cell(row=6, column=2, value="Month number").font = H3
for m in range(1, MONTHS + 1):
    c = ws.cell(row=5, column=C0 + m - 1, value=f'=TEXT(EDATE({a("start")},{m-1}),"mmm-yy")')
    c.font = FORMULA; c.alignment = Alignment(horizontal="center"); c.fill = SECFILL
    n = ws.cell(row=6, column=C0 + m - 1, value=m)
    n.font = H3; n.alignment = Alignment(horizontal="center"); n.fill = SECFILL
for i, t in enumerate(TEAMS):
    rr, tr = WROW0 + i, TROW0 + i
    ws.cell(row=rr, column=1, value=f"=Teams!A{tr}").font = LINK
    ws.cell(row=rr, column=2, value=f"=Teams!C{tr}&\" — \"&Teams!B{tr}").font = LINK
    for m in range(1, MONTHS + 1):
        cl = col(C0 + m - 1)
        f = (f'=IF(OR({cl}$6<Teams!$F{tr},{cl}$6>Teams!$I{tr}),0,'
             f'IF({cl}$6<Teams!$G{tr},ROUND(Teams!$E{tr}*({cl}$6-Teams!$F{tr}+1)/(Teams!$G{tr}-Teams!$F{tr}+1),0),'
             f'IF({cl}$6<=Teams!$H{tr},Teams!$E{tr},'
             f'ROUND(Teams!$E{tr}*(Teams!$I{tr}-{cl}$6+1)/(Teams!$I{tr}-Teams!$H{tr}),0))))')
        c = ws.cell(row=rr, column=C0 + m - 1, value=f); c.font = FORMULA
        c.number_format = "0;;-"; c.alignment = Alignment(horizontal="center")
ws.cell(row=WTOT, column=2, value="TOTAL SITE POPULATION").font = H3
for m in range(1, MONTHS + 1):
    cl = col(C0 + m - 1)
    c = ws.cell(row=WTOT, column=C0 + m - 1, value=f"=SUM({cl}{WROW0}:{cl}{WROW1})")
    c.font = H3; c.fill = TOTFILL; c.number_format = "0"; c.alignment = Alignment(horizontal="center")
ws.cell(row=WTOT + 2, column=2, value="Peak site population").font = H3
ws.cell(row=WTOT + 2, column=3, value=f"=MAX({col(C0)}{WTOT}:{col(CN)}{WTOT})").font = FORMULA
ws.cell(row=WTOT + 3, column=2, value="Month of peak").font = BODY
ws.cell(row=WTOT + 3, column=3, value=f"=MATCH({col(C0)}{WTOT+2},{col(C0)}{WTOT}:{col(CN)}{WTOT},0)").font = FORMULA
ws.cell(row=WTOT + 4, column=2, value="Average over the programme").font = BODY
ws.cell(row=WTOT + 4, column=3, value=f"=ROUND(AVERAGE({col(C0)}{WTOT}:{col(CN)}{WTOT}),0)").font = FORMULA
ws.cell(row=WTOT + 5, column=2, value="Person-months of exposure").font = BODY
ws.cell(row=WTOT + 5, column=3, value=f"=SUM({col(C0)}{WTOT}:{col(CN)}{WTOT})").font = FORMULA
ws.freeze_panes = "C7"
json.dump({"TROW0":TROW0,"TROW1":TROW1,"WROW0":WROW0,"WROW1":WROW1,"WTOT":WTOT,
           "COMPANIES":COMPANIES,"NTEAMS":len(TEAMS)}, open("layout.json","w"))
wb.save("/home/user/etablix/tools/village-plan.xlsx")
print("Teams + Workforce written:", len(TEAMS), "teams,", len(COMPANIES), "companies")
