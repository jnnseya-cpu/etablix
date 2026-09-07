"""Part 6: Utilities, Transport, VillageStaff (all monthly)."""
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
exec(open("styles.py").read())
A = json.load(open("assump_rows.json"))
def a(k): return f"Assumptions!$C${A[k]}"
RES = "BedDemand!{c}10"        # resident rooms that month
ROOMS = "BedDemand!{c}14"      # total rooms that month
wb = load_workbook("/home/user/etablix/tools/village-plan.xlsx")

def monthly(name, title, strap):
    ws = wb.create_sheet(name); ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 4; ws.column_dimensions["B"].width = 44
    for i in range(C0, CN + 1): ws.column_dimensions[col(i)].width = 7.2
    ws.column_dimensions[col(CN + 2)].width = 62
    ws["B2"] = title; ws["B2"].font = H1
    ws["B3"] = strap; ws["B3"].font = SMALL
    ws.cell(row=5, column=2, value="Month").font = H3
    ws.cell(row=6, column=2, value="Month number").font = H3
    ws.cell(row=5, column=CN + 2, value="Basis, and what to verify").font = H3
    for m in range(1, MONTHS + 1):
        c = ws.cell(row=5, column=C0 + m - 1, value=f"=Workforce!{col(C0+m-1)}5")
        c.font = LINK; c.alignment = Alignment(horizontal="center"); c.fill = SECFILL
        n = ws.cell(row=6, column=C0 + m - 1, value=m); n.font = H3
        n.alignment = Alignment(horizontal="center"); n.fill = SECFILL
    ws.freeze_panes = "C7"
    return ws

def mrow(ws, r, label, formula, basis="", fmt="#,##0", bold=False, peak=True):
    c = ws.cell(row=r, column=2, value=label); c.font = H3 if bold else BODY
    for m in range(1, MONTHS + 1):
        cl = col(C0 + m - 1)
        cell = ws.cell(row=r, column=C0 + m - 1, value=formula.replace("{c}", cl))
        cell.font = H3 if bold else FORMULA; cell.number_format = fmt
        cell.alignment = Alignment(horizontal="center")
        if bold: cell.fill = TOTFILL
    if basis:
        b = ws.cell(row=r, column=CN + 2, value=basis); b.font = SMALL
        b.alignment = Alignment(wrap_text=True, vertical="top")
        if len(basis) > 90: ws.row_dimensions[r].height = 24

def peakblock(ws, r, items):
    ws.cell(row=r, column=2, value="PEAK — WHAT YOU DESIGN AND PROCURE AGAINST").font = H2
    ws.cell(row=r, column=2).fill = BANDFILL
    for cc in range(3, 10): ws.cell(row=r, column=cc).fill = BANDFILL
    rr = r + 1
    for lab, src, fmt, note in items:
        ws.cell(row=rr, column=2, value=lab).font = BODY
        c = ws.cell(row=rr, column=3, value=f"=MAX({col(C0)}{src}:{col(CN)}{src})")
        c.font = H3; c.number_format = fmt; c.fill = TOTFILL
        ws.cell(row=rr, column=5, value=note).font = SMALL
        rr += 1
    return rr

# ─────────────────────────────────────────────── Utilities
ws = monthly("Utilities", "UTILITIES, ENERGY AND WASTE — MONTH BY MONTH",
             "Driven by occupancy from BedDemand. Design against the peak; budget against the curve.")
mrow(ws, 7, "Residents in village", RES, "From BedDemand. Everything on this sheet follows it.", bold=True)
mrow(ws, 9, "Water demand", f"=ROUND({RES}*{a('water')}/1000,1)", "m³/day. Residential occupancy — showers, laundry, catering, WCs. Far above a site-welfare figure. Verify with the water undertaker before relying on a connection.", fmt="0.0")
mrow(ws, 10, "  of which hot water", f"=ROUND({{c}}9*{a('hotprop')},1)", "m³/day. Sizes calorifiers and the heating load that serves them.", fmt="0.0")
mrow(ws, 11, "Foul return", f"=ROUND({{c}}9*{a('foul')},1)", "m³/day. Treatment plant capacity, or tanker frequency if there is no connection.", fmt="0.0")
mrow(ws, 12, "Tanker movements if no foul connection", f"=ROUNDUP({{c}}11/30,0)", "loads/day at 30 m³ a tanker. If this number is above one or two, a connection or a package plant stops being optional.", fmt="0.0")
mrow(ws, 14, "Electrical connected load", f"=ROUND({RES}*{a('kwbed')}+IF({RES}>0,{a('kwkitchen')},0),0)", "kW. Accommodation plus catering. Excludes electric space heating, which is on the line below.")
mrow(ws, 15, "Heating load", f"=ROUND({RES}*{a('kwheat')},0)", "kW at design outside temperature. Verify against the module supplier's U-values and the fuel you actually use.")
mrow(ws, 16, "Diversified demand", f"=ROUND({{c}}14*{a('divers')},0)", "kW. Not every load runs at once. The diversity factor is on Assumptions and needs an engineer's eye.")
mrow(ws, 17, "Diversified demand", f"=ROUND({{c}}16/{a('pf')},0)", "kVA — the unit a DNO connection or a generator is actually sized in. Getting kW and kVA confused undersizes a village by a fifth.")
mrow(ws, 19, "Waste arisings", f"=ROUND({RES}*{a('waste')}/1000*30.4,1)", "tonnes/month. Residential plus catering.", fmt="0.0")
mrow(ws, 20, "  recycled or diverted", f"=ROUND({{c}}19*{a('recyc')},1)", "tonnes/month against the target on Assumptions.", fmt="0.0")
mrow(ws, 21, "General waste collections", f"=ROUNDUP({{c}}19*1000/1100/12,0)", "collections/month at 1100 l bins, twelve per collection. Indicative — set against the contractor's actual round.", fmt="0")
last = peakblock(ws, 23, [
 ("Peak water demand", 9, "0.0", "m³/day — the figure that goes on the water undertaker's enquiry."),
 ("Peak foul return", 11, "0.0", "m³/day — treatment plant or tanker capacity."),
 ("Peak connected load", 14, "#,##0", "kW."),
 ("Peak diversified demand", 17, "#,##0", "kVA — the figure that goes on the DNO application or the generator enquiry."),
 ("Peak waste arisings", 19, "0.0", "tonnes/month."),
])
ws.cell(row=last + 1, column=2, value="Every figure on this sheet is a first-pass planning figure requiring validation by a competent person before it is procured against.").font = Font(name="Arial", size=9, italic=True, color="C0392B")

# ─────────────────────────────────────────────── Transport
ws = monthly("Transport", "TRANSPORT — MOVING THE VILLAGE TO SITE AND BACK",
             "A village that cannot get its people to the gate on time is an expensive dormitory.")
mrow(ws, 7, "Residents in village", RES, "", bold=True)
mrow(ws, 8, "Residents requiring transport", f"=ROUND({RES}*{a('transres')},0)", "The rest drive or walk. If the village adjoins the site this whole sheet shrinks.")
mrow(ws, 10, "Seats required per shift change", f"=ROUNDUP({{c}}8/{a('busruns')},0)", "Split across the runs on Assumptions. Two runs stagger the arrival peak at the gate — which is usually the real constraint, not the buses.")
mrow(ws, 11, "Buses required", f"=ROUNDUP({{c}}10/({a('busseats')}*{a('busload')}),0)", "At the seat count and load factor on Assumptions. Nobody fills every seat every run.")
mrow(ws, 12, "Bus journeys per day", f"={{c}}11*{a('busruns')}*{a('shifts')}*2", "Out and back, every run, every shift change.")
mrow(ws, 13, "Bus movements per day at the village gate", f"={{c}}12", "The village access has to take this, at 06:00, in the dark, in winter.")
mrow(ws, 15, "Resident parking spaces", f"=ROUNDUP({RES}/10*{a('respark')},0)", "Most residents are bussed; some keep a car for days off. Under-provide this and they park on the verge.")
mrow(ws, 16, "Village staff and visitor parking", f"=IF({RES}>0,{a('staffpark')},0)", "")
mrow(ws, 17, "TOTAL PARKING SPACES", "={c}15+{c}16", "", bold=True)
mrow(ws, 18, "Parking area", "={c}17*25", "m² at 25 m² a space including circulation.")
last = peakblock(ws, 20, [
 ("Peak buses required", 11, "0", "The fleet to contract. Consider one spare — a broken bus is 45 people late."),
 ("Peak seats per shift change", 10, "#,##0", ""),
 ("Peak parking spaces", 17, "#,##0", ""),
 ("Peak bus journeys per day", 12, "0", ""),
])

# ─────────────────────────────────────────────── VillageStaff
ws = monthly("VillageStaff", "RUNNING THE VILLAGE — WHO IT TAKES",
             "A village is a hotel that never closes. These are the people who run it, scaled to occupancy.")
mrow(ws, 7, "Residents in village", RES, "", bold=True)
mrow(ws, 8, "Rooms in service", ROOMS, "Including void and visitor rooms — they still get cleaned.")
mrow(ws, 10, "Village management", f"=IF({RES}>0,{a('mgmtfte')},0)", "Village manager and deputy. Below about 150 beds, one.", fmt="0.0")
mrow(ws, 11, "Reception (24/7)", f"=IF({RES}>0,{a('recposts')}*{a('cover247')},0)", "Posts × the 24/7 cover factor on Assumptions, which includes leave, sickness and training cover.", fmt="0.0")
mrow(ws, 12, "Security (24/7)", f"=IF({RES}>0,{a('secposts')}*{a('cover247')},0)", "Gatehouse plus patrol. Confirm the posts against the security risk assessment, not against this workbook.", fmt="0.0")
mrow(ws, 13, "Housekeeping", f"=ROUNDUP({ROOMS}/{a('bedhk')},1)", "From beds per housekeeping FTE. Cross-check against rooms cleaned per shift on Facilities.", fmt="0.0")
mrow(ws, 14, "Catering", f"=ROUNDUP(Facilities!$C$11/{a('covfte')},1)*IF({RES}>0,1,0)", "Chefs, servery, wash-up and stores across the whole meal cycle, sized on the design covers.", fmt="0.0")
mrow(ws, 15, "Maintenance, grounds and waste", f"=ROUND({RES}/100*{a('maintfte')},1)", "Reactive and planned. A 38-month village wears out.", fmt="0.0")
mrow(ws, 16, "Administration and welfare", f"=IF({RES}>0,{a('adminfte')},0)", "Bookings, inductions, pastoral support and complaints. The last of those is why villages succeed or fail.", fmt="0.0")
mrow(ws, 17, "Transport drivers", f"=ROUNDUP(Transport!{{c}}11*2.2,1)", "Drivers per bus across the shift pattern, including cover. To verify against drivers' hours rules.", fmt="0.0")
mrow(ws, 19, "TOTAL VILLAGE FTE", "=SUM({c}10:{c}17)", "", fmt="0.0", bold=True)
mrow(ws, 20, "Residents per village FTE", "=IFERROR({c}7/{c}19,0)", "A sense check. Somewhere around 8–12 is typical for a full-service village; well outside that, look at the ratios again.", fmt="0.0")
last = peakblock(ws, 22, [
 ("Peak village FTE", 19, "0.0", "The team to recruit, induct and house — they need beds too, and they are in the Teams list."),
 ("Peak housekeeping FTE", 13, "0.0", ""),
 ("Peak catering FTE", 14, "0.0", ""),
])
wb.save("/home/user/etablix/tools/village-plan.xlsx")
print("Utilities, Transport, VillageStaff written")
