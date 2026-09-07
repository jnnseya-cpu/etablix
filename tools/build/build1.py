"""Part 1: workbook skeleton, ReadMe, Assumptions, Teams."""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json

INPUT = Font(name="Arial", size=10, color="0000FF")           # type here
FORMULA = Font(name="Arial", size=10)                          # calculated
LINK = Font(name="Arial", size=10, color="008000")             # from another sheet
H1 = Font(name="Arial", size=14, bold=True, color="14181D")
H2 = Font(name="Arial", size=11, bold=True, color="FFFFFF")
H3 = Font(name="Arial", size=10, bold=True)
BODY = Font(name="Arial", size=10)
SMALL = Font(name="Arial", size=9, color="5B6672")
KEYFILL = PatternFill("solid", fgColor="FFF9C4")
BANDFILL = PatternFill("solid", fgColor="14181D")
SECFILL = PatternFill("solid", fgColor="EDE7DA")
WARNFILL = PatternFill("solid", fgColor="FDEDEC")
THIN = Side(style="thin", color="D5D5D5")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
MONTHS = 38
C0 = 3                       # first month column (C)
CN = C0 + MONTHS - 1         # last month column (AN)
def col(i): return get_column_letter(i)

wb = Workbook()

def band(ws, row, text, width=14):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=width)
    c = ws.cell(row=row, column=1, value=text)
    c.font = H2; c.fill = BANDFILL; c.alignment = Alignment(vertical="center")
    ws.row_dimensions[row].height = 20

def section(ws, row, text, width=6):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=width)
    c = ws.cell(row=row, column=1, value=text)
    c.font = H3; c.fill = SECFILL

# ─────────────────────────────────────────────── ReadMe
ws = wb.active; ws.title = "ReadMe"
ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 3
ws.column_dimensions["B"].width = 34
ws.column_dimensions["C"].width = 96
ws["B2"] = "WORKERS ACCOMMODATION VILLAGE — RESOURCE AND OPERATING PLAN"; ws["B2"].font = H1
ws["B3"] = "300-person peak · 38-month programme · multi-company site"; ws["B3"].font = Font(name="Arial", size=11, color="9C7A3C")
ws["B4"] = "ETABLIX — Integrated Site Services, part of Groupe Nseya"; ws["B4"].font = SMALL

rows = [
 ("", ""),
 ("WHAT THIS IS", "A working model, not a picture of one. Change a driver on Assumptions and every bed, cover, litre, "
  "kilowatt, bus seat, FTE and pound downstream moves with it. Nothing below Assumptions is typed in by hand."),
 ("", ""),
 ("HOW TO USE IT", "1. Set the drivers on Assumptions. Blue cells are yours to change; yellow are the ones that move the answer most."),
 ("", "2. Put your real companies, teams and dates on Teams. Add or delete rows — everything else follows the range."),
 ("", "3. Read Workforce, then BedDemand. Those two decide the village."),
 ("", "4. Accommodation, Facilities, Utilities, Transport and VillageStaff size what you build and who runs it."),
 ("", "5. Capex, Opex and CostSummary cost it. Replace every rate with your own quotation before anyone quotes from this."),
 ("", "6. Compliance, Risks and Mobilisation are the parts that get forgotten and then hurt."),
 ("", ""),
 ("COLOUR", "Blue text = type here.   Black = calculated, do not overtype.   Green = pulled from another sheet.   "
  "Yellow fill = a driver that changes the answer materially."),
 ("", ""),
 ("THE ONE RULE", "Every figure here is a first-pass planning figure for validation by a competent person. It is not a design, "
  "a price or an instruction. Loads, flows, ratios and durations size a decision; they do not survive procurement without "
  "an engineer, and nothing safety-critical is resolved in a spreadsheet."),
 ("", ""),
 ("ON THE COSTS", "Every rate on Capex and Opex is INDICATIVE and marked as such — an order-of-magnitude figure to size the "
  "decision, not a quotation and not a budget. They are blue because they are yours to replace. A number taken from here into "
  "a tender without a supplier behind it is your risk, not an estimate."),
 ("", ""),
 ("WHAT DRIVES WHAT", ""),
]
r = 6
for a, b in rows:
    ws.cell(row=r, column=2, value=a).font = H3 if a else BODY
    c = ws.cell(row=r, column=3, value=b); c.font = BODY; c.alignment = Alignment(wrap_text=True, vertical="top")
    if a in ("THE ONE RULE", "ON THE COSTS"):
        ws.cell(row=r, column=3).fill = WARNFILL
    ws.row_dimensions[r].height = 30 if len(b) > 110 else (42 if len(b) > 230 else 14)
    r += 1

chain = [
 ("Teams", "→ Workforce", "each team's start, peak and end become a headcount curve across 38 months"),
 ("Workforce", "→ BedDemand", "travelling percentage per team turns headcount into people needing a bed"),
 ("BedDemand", "→ Accommodation", "peak beds, plus void, contingency and accessible provision, becomes a room schedule"),
 ("BedDemand", "→ Facilities", "occupancy becomes canteen covers, laundry machines, drying, WCs and social space"),
 ("BedDemand", "→ Utilities", "occupancy becomes water, foul, power, heat and waste, month by month"),
 ("BedDemand", "→ Transport", "residents become bus seats, journeys and parking"),
 ("BedDemand", "→ VillageStaff", "occupancy becomes the FTEs who run the village, 24/7 cover included"),
 ("Accommodation", "→ Capex", "rooms and blocks become what it costs to create the village"),
 ("VillageStaff + Utilities", "→ Opex", "people, energy and consumption become what it costs to run it each month"),
 ("Capex + Opex", "→ CostSummary", "whole-life cost, cost per bed-night, and the cost recharged to each company"),
]
r += 1
for a, b, c in chain:
    ws.cell(row=r, column=2, value=f"{a}  {b}").font = Font(name="Arial", size=10, bold=True, color="9C7A3C")
    ws.cell(row=r, column=3, value=c).font = BODY
    r += 1

wb.save("/home/user/etablix/tools/village-plan.xlsx")
print("part 1 skeleton saved")
