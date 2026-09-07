"""Part 7: BuildProgramme, Capex, Opex, CostSummary."""
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
exec(open("styles.py").read())
A = json.load(open("assump_rows.json")); S = json.load(open("sched.json")); BD = json.load(open("bd.json"))
def a(k): return f"Assumptions!$C${A[k]}"
def acc(k): return f"Accommodation!$C${S['ACC'][k]}"
def fac(k): return f"Facilities!$C${S['FAC'][k]}"
wb = load_workbook("/home/user/etablix/tools/village-plan.xlsx")
GBP = '£#,##0;(£#,##0);-'

# ─────────────────────────────────────────────── BuildProgramme
ws = wb.create_sheet("BuildProgramme"); ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 4; ws.column_dimensions["B"].width = 40
ws.column_dimensions["C"].width = 9; ws.column_dimensions["D"].width = 9; ws.column_dimensions["E"].width = 9
for i in range(6, 6 + MONTHS): ws.column_dimensions[col(i)].width = 3.4
ws["B2"] = "CREATING THE VILLAGE — WORKED BACKWARDS FROM THE FIRST ARRIVAL"; ws["B2"].font = H1
ws["B3"] = ("The only date that matters is the month the first travelling worker arrives. Everything else is worked backwards from it. "
            "If the bar runs off the left of the chart, the village is already late."); ws["B3"].font = SMALL
for i, h in enumerate(["", "Stage", "Months", "Start", "Finish"]):
    c = ws.cell(row=5, column=i + 1, value=h); c.font = H3; c.fill = SECFILL
for m in range(1, MONTHS + 1):
    c = ws.cell(row=5, column=5 + m, value=m); c.font = SMALL; c.fill = SECFILL
    c.alignment = Alignment(horizontal="center")
stages = [("Design, planning and consents", "prgdesign"), ("Procurement and module lead time", "prgproc"),
          ("Groundworks and infrastructure", "prgground"), ("Module delivery and installation", "prginstall"),
          ("Commissioning and handover", "prgcomm")]
r0 = 6
ws.cell(row=r0 - 1, column=2)  # header already
for i, (lab, key) in enumerate(stages):
    r = r0 + i
    ws.cell(row=r, column=2, value=lab).font = BODY
    ws.cell(row=r, column=3, value=f"={a(key)}").font = LINK
    if i == 0:
        ws.cell(row=r, column=5, value=f"={a('prglive')}-1").font = FORMULA          # finish
        ws.cell(row=r, column=4, value=f"=E{r}-C{r}+1").font = FORMULA
    else:
        ws.cell(row=r, column=5, value=f"=D{r-1}-1").font = FORMULA
        ws.cell(row=r, column=4, value=f"=E{r}-C{r}+1").font = FORMULA
    for m in range(1, MONTHS + 1):
        c = ws.cell(row=r, column=5 + m, value=f'=IF(AND({5+m}-5>=$D{r},{5+m}-5<=$E{r}),"█","")')
        c.font = Font(name="Arial", size=9, color="9C7A3C"); c.alignment = Alignment(horizontal="center")
rr = r0 + len(stages)
ws.cell(row=rr + 1, column=2, value="Village must be live by month").font = H3
ws.cell(row=rr + 1, column=3, value=f"={a('prglive')}").font = LINK
ws.cell(row=rr + 2, column=2, value="First month with bed demand").font = H3
ws.cell(row=rr + 2, column=3, value="=BedDemand!$C$23").font = LINK
ws.cell(row=rr + 3, column=2, value="Earliest the village work must start").font = H3
ws.cell(row=rr + 3, column=3, value=f"=D{r0+len(stages)-1}").font = FORMULA
ws.cell(row=rr + 4, column=2, value="VERDICT").font = H3
ws.cell(row=rr + 4, column=3, value=f'=IF(C{rr+3}<1,"ALREADY LATE by "&(1-C{rr+3})&" months",IF(C{rr+1}<=C{rr+2},"Deliverable — "&(C{rr+3}-1)&" months of slack before month 1","LATE — the village is live after the first arrival"))')
ws.cell(row=rr + 4, column=3).font = Font(name="Arial", size=10, bold=True, color="C0392B")
ws.merge_cells(start_row=rr + 4, start_column=3, end_row=rr + 4, end_column=12)
ws.cell(row=rr + 6, column=2, value=("A negative start month is the finding, not a formatting problem. It means the consent and lead-time chain "
    "does not fit before the first worker arrives, and the choices are: start now, phase the village, or house the early trades commercially "
    "at a cost nobody has budgeted.")).font = Font(name="Arial", size=9, italic=True, color="C0392B")
ws.merge_cells(start_row=rr + 6, start_column=2, end_row=rr + 6, end_column=20)

# ─────────────────────────────────────────────── Capex
ws = wb.create_sheet("Capex"); ws.sheet_view.showGridLines = False
for c, w in zip("ABCDEFG", (4, 44, 11, 9, 15, 60, 2)): ws.column_dimensions[c].width = w
ws["B2"] = "CAPEX — WHAT IT COSTS TO CREATE THE VILLAGE"; ws["B2"].font = H1
ws["B3"] = "Every rate is INDICATIVE and sits on Assumptions in blue. Replace all of them with your own quotations before this number leaves the building."; ws["B3"].font = Font(name="Arial", size=9, bold=True, color="C0392B")
for i, h in enumerate(["", "Item", "Quantity", "Unit", "Cost", "Basis"]):
    c = ws.cell(row=5, column=i + 1, value=h); c.font = H3
    c.border = Border(bottom=Side(style="medium", color="14181D"))
cap = [
 ("Room modules — supply, deliver, install", acc('tot'), "rooms", a('capmod'), "Rooms × rate. The single biggest line, and the most specification-sensitive."),
 ("Groundworks, hardstanding and drainage", acc('site'), "m²", a('capground'), "Total site area × rate. Wholly dependent on ground conditions, which are not known here."),
 ("Utility connections and infrastructure", "1", "lump", a('caputil'), "Water, foul, power and comms. Depends on distance to the mains and available DNO capacity — get this priced first, not last."),
 ("Furniture, fittings and equipment", acc('tot'), "rooms", a('capffe'), "Bed, desk, chair, wardrobe, window dressing, white goods."),
 ("Catering fit-out", fac('covers'), "covers", a('capcater'), "Kitchen, servery, cold stores, wash-up, dining furniture."),
 ("Amenity fit-out — gym, social, laundry", fac('gym')+"+"+fac('social')+"+"+fac('launarea'), "m²", "650", "At an indicative £650/m². Replace with a real rate."),
 ("Design, consents, surveys and fees", "1", "lump", a('capdesign'), "Planning, building control, fire engineering, ground investigation, ecology, transport assessment."),
]
r = 6
for lab, qty, unit, rate, basis in cap:
    ws.cell(row=r, column=2, value=lab).font = BODY
    ws.cell(row=r, column=3, value=f"={qty}" if not qty.isdigit() else int(qty)).font = LINK if not qty.isdigit() else FORMULA
    ws.cell(row=r, column=3).number_format = "#,##0"
    ws.cell(row=r, column=4, value=unit).font = SMALL
    ws.cell(row=r, column=5, value=f"=C{r}*{rate}").font = FORMULA
    ws.cell(row=r, column=5).number_format = GBP
    b = ws.cell(row=r, column=6, value=basis); b.font = SMALL; b.alignment = Alignment(wrap_text=True, vertical="top")
    if len(basis) > 76: ws.row_dimensions[r].height = 24
    for cc in range(2, 7): ws.cell(row=r, column=cc).border = BOX
    r += 1
sub = r
ws.cell(row=r, column=2, value="SUBTOTAL — BUILD").font = H3
ws.cell(row=r, column=5, value=f"=SUM(E6:E{r-1})").font = H3; ws.cell(row=r, column=5).number_format = GBP
ws.cell(row=r, column=5).fill = TOTFILL
r += 1
ws.cell(row=r, column=2, value="Demobilisation and reinstatement").font = BODY
ws.cell(row=r, column=5, value=f"=E{sub}*{a('capdemob')}").font = FORMULA
ws.cell(row=r, column=5).number_format = GBP
ws.cell(row=r, column=6, value="Removal, making good and reinstatement at the end. Always incurred, frequently forgotten, and usually not in anyone's budget.").font = SMALL
demob = r; r += 2
ws.cell(row=r, column=2, value="TOTAL CAPEX").font = H1
ws.cell(row=r, column=5, value=f"=E{sub}+E{demob}").font = H1
ws.cell(row=r, column=5).number_format = GBP; ws.cell(row=r, column=5).fill = KEYFILL
TOTCAP = r; r += 1
ws.cell(row=r, column=2, value="Capex per room").font = BODY
ws.cell(row=r, column=5, value=f"=IFERROR(E{TOTCAP}/{acc('tot')},0)").font = FORMULA
ws.cell(row=r, column=5).number_format = GBP

# ─────────────────────────────────────────────── Opex
ws = wb.create_sheet("Opex"); ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 4; ws.column_dimensions["B"].width = 40
for i in range(C0, CN + 1): ws.column_dimensions[col(i)].width = 9
ws.column_dimensions[col(CN + 2)].width = 14
ws["B2"] = "OPEX — WHAT IT COSTS TO RUN, MONTH BY MONTH"; ws["B2"].font = H1
ws["B3"] = "Follows occupancy, so the empty months cost less than the full ones. Every rate is INDICATIVE and sits on Assumptions."; ws["B3"].font = Font(name="Arial", size=9, bold=True, color="C0392B")
ws.cell(row=5, column=2, value="Month").font = H3
ws.cell(row=5, column=CN + 2, value="TOTAL").font = H3
for m in range(1, MONTHS + 1):
    c = ws.cell(row=5, column=C0 + m - 1, value=f"=Workforce!{col(C0+m-1)}5")
    c.font = LINK; c.alignment = Alignment(horizontal="center"); c.fill = SECFILL
ops = [
 ("Room hire", f"=BedDemand!{{c}}14*{a('opexroom')}", "If modules are hired. Set the rate to zero if purchased in Capex."),
 ("Utilities", f"=BedDemand!{{c}}10*{a('opexutil')}", ""),
 ("Catering", f"=ROUND(BedDemand!{{c}}10*{a('opexcater')}*30.4,0)", "Residents × daily rate × days."),
 ("Housekeeping and laundry", f"=BedDemand!{{c}}14*{a('opexhk')}", ""),
 ("Village staff", f"=ROUND(VillageStaff!{{c}}19*{a('opexfte')},0)", "Total village FTE × fully loaded monthly cost."),
 ("Transport", f"=Transport!{{c}}11*{a('opexbus')}", ""),
 ("Maintenance and consumables", f"=BedDemand!{{c}}14*{a('opexmaint')}", ""),
 ("Insurance, licences and rates", f"=IF(BedDemand!{{c}}10>0,{a('opexins')},0)", ""),
]
r = 6
for lab, f, note in ops:
    ws.cell(row=r, column=2, value=lab).font = BODY
    for m in range(1, MONTHS + 1):
        cl = col(C0 + m - 1)
        c = ws.cell(row=r, column=C0 + m - 1, value=f.replace("{c}", cl))
        c.font = FORMULA; c.number_format = GBP
    t = ws.cell(row=r, column=CN + 2, value=f"=SUM({col(C0)}{r}:{col(CN)}{r})")
    t.font = H3; t.number_format = GBP; t.fill = TOTFILL
    r += 1
OTOT = r
ws.cell(row=r, column=2, value="TOTAL MONTHLY OPEX").font = H3
for m in range(1, MONTHS + 1):
    cl = col(C0 + m - 1)
    c = ws.cell(row=r, column=C0 + m - 1, value=f"=SUM({cl}6:{cl}{r-1})")
    c.font = H3; c.number_format = GBP; c.fill = TOTFILL
t = ws.cell(row=r, column=CN + 2, value=f"=SUM({col(C0)}{r}:{col(CN)}{r})")
t.font = H1; t.number_format = GBP; t.fill = KEYFILL
r += 1
ws.cell(row=r, column=2, value="Cost per occupied bed-night").font = BODY
for m in range(1, MONTHS + 1):
    cl = col(C0 + m - 1)
    c = ws.cell(row=r, column=C0 + m - 1, value=f"=IFERROR({cl}{OTOT}/(BedDemand!{cl}10*30.4),0)")
    c.font = FORMULA; c.number_format = '£#,##0.00;;-'
ws.freeze_panes = "C6"
json.dump({"TOTCAP": TOTCAP, "OTOT": OTOT}, open("cost.json", "w"))
wb.save("/home/user/etablix/tools/village-plan.xlsx")
print("BuildProgramme, Capex, Opex written")
