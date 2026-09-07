"""Part 2: Assumptions + Teams."""
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
exec(open("styles.py").read())

wb = load_workbook("/home/user/etablix/tools/village-plan.xlsx")

# ─────────────────────────────────────────────── Assumptions
ws = wb.create_sheet("Assumptions")
ws.sheet_view.showGridLines = False
for c, w in zip("ABCDEF", (4, 52, 13, 12, 62, 2)): ws.column_dimensions[c].width = w
ws["B2"] = "ASSUMPTIONS AND DRIVERS"; ws["B2"].font = H1
ws["B3"] = "Blue = type here. Yellow = changes the answer materially. Every figure carries its basis; a basis of “to verify” means exactly that."; ws["B3"].font = SMALL
band(ws, 5, "   ONE PLACE FOR EVERY NUMBER THIS PLAN RESTS ON", 5)

hdr = 6
for i, t in enumerate(["", "Driver", "Value", "Unit", "Basis — and whether it is verified"]):
    c = ws.cell(row=hdr, column=i + 1, value=t); c.font = H3
    c.border = Border(bottom=Side(style="medium", color="14181D"))

A = {}     # name -> row
r = 7
def put(label, value, unit, basis, key=None, fmt=None, kind="input"):
    global r
    ws.cell(row=r, column=2, value=label).font = BODY
    c = ws.cell(row=r, column=3, value=value)
    c.font = {"input": INPUT, "formula": FORMULA, "link": LINK, "key": INPUT}[kind]
    if fmt: c.number_format = fmt
    if kind == "key":
        c.font = INPUT; c.fill = KEYFILL
    ws.cell(row=r, column=4, value=unit).font = SMALL
    b = ws.cell(row=r, column=5, value=basis); b.font = SMALL; b.alignment = Alignment(wrap_text=True, vertical="top")
    if len(basis) > 78: ws.row_dimensions[r].height = 24
    if key: A[key] = r
    r += 1

def sec(title):
    global r
    r += 1
    section(ws, r, title, 5); r += 1

sec("PROJECT")
put("Project / site", "Project NORTHREACH — worked example", "", "Replace with the real project. Nothing else keys off this.", "proj")
put("Programme start (month 1)", "2027-01-01", "date", "Drives every month label. Enter as a real date.", "start")
put("Programme duration", 38, "months", "The plan is built for 38 columns. Changing this does not add columns.", "dur")
put("Peak site population", "=MAX(Workforce!C28:AN28)", "people", "Calculated from Teams. The headline 300 is the planning figure; the model says what the curve actually peaks at.", "peakpop", kind="formula")
put("Peak travelling population", "=MAX(BedDemand!C7:AN7)", "people", "The number that decides the village. Everyone else goes home at night.", "peaktrav", kind="formula")

sec("WHO NEEDS A BED")
put("Rooms allocated per traveller", 1.0, "rooms", "One room per person. Sharing on rotation cuts rooms but needs strict rota discipline and personal storage; drop to 0.7 only if the rotation is contractual.", "roomsper", fmt="0.00", kind="key")
put("Rotation presence factor", 1.00, "×", "1.00 = everyone on site at once. A 3-on/1-off rotation is about 0.75. Verify against the actual rota before sizing.", "rotation", fmt="0.00", kind="key")
put("Void and turnover allowance", 0.05, "%", "Rooms out of service for cleaning, changeover, damage and maintenance. Industry practice 4–6%; to verify against your operator.", "void", fmt="0.0%")
put("Contingency rooms", 0.05, "%", "Headroom for a package running late over one running early. Not a substitute for a proper curve.", "contin", fmt="0.0%")
put("Female provision", 0.08, "%", "Of the travelling population. Drives a separate lockable block or floor, not just a room count. Set from your own diversity data — 8% is a placeholder.", "female", fmt="0.0%")
put("Accessible rooms", 0.05, "%", "Wheelchair-accessible rooms with level access and accessible WC/shower. Confirm the required proportion with Building Control — this is a placeholder, not a standard.", "access", fmt="0.0%")
put("Senior / manager rooms", 0.06, "%", "Larger room with a desk. A commercial decision, not a requirement.", "senior", fmt="0.0%")
put("Visitor and spare rooms", 6, "rooms", "Auditors, inspectors, client visits, isolation. Not optional in practice.", "visitor")

sec("ROOM AND BLOCK SIZING")
put("Standard room — floor area", 11.0, "m²", "Single ensuite. Typical modular workforce room 10–12 m² including shower room. To verify against the module you actually procure.", "roomarea", fmt="0.0")
put("Accessible room — floor area", 16.0, "m²", "Turning circle and accessible shower room. To verify with Building Control.", "accarea", fmt="0.0")
put("Senior room — floor area", 14.0, "m²", "", "senarea", fmt="0.0")
put("Rooms per accommodation block", 24, "rooms", "Two storeys of twelve is a common modular block. Set from the supplier's standard module.", "roomsblock")
put("Circulation, plant and stair gross-up", 1.35, "×", "Corridors, stairs, risers, plant. Applied to net room area to get gross block area.", "grossup", fmt="0.00")
put("External space per bed", 22.0, "m²", "Roads, parking, footpaths, drainage, landscaping and standoff between blocks. Sizes the land take, not the buildings.", "extspace", fmt="0.0")

sec("CATERING")
put("Take breakfast on site", 0.85, "%", "Of residents. Drives covers and food cost.", "brek", fmt="0.0%")
put("Take evening meal on site", 0.92, "%", "Of residents.", "dinner", fmt="0.0%")
put("Packed lunches taken", 0.90, "%", "Of residents. Made in the same kitchen, no covers needed.", "lunch", fmt="0.0%")
put("Sittings per meal service", 2, "no.", "Two sittings halves the dining room. Three is possible and unpopular.", "sittings", kind="key")
put("Dining area per cover", 1.6, "m²", "Table, chair and circulation. 1.5–1.8 m² typical; to verify.", "coverarea", fmt="0.0")
put("Kitchen and servery per cover", 0.55, "m²", "Preparation, cooking, servery, wash-up, dry and cold store. To verify with the caterer.", "kitcharea", fmt="0.00")

sec("LAUNDRY, HOUSEKEEPING AND SOCIAL")
put("Residents per washing machine", 14, "people", "Self-service laundry. To verify — depends whether linen is contracted out.", "perwash")
put("Residents per tumble dryer", 16, "people", "", "perdry")
put("Drying room capacity per 100 residents", 1, "rooms", "Wet PPE and boots. Separate from the laundry and non-negotiable in a wet climate.", "dryroom")
put("Rooms cleaned per housekeeper per shift", 18, "rooms", "Full clean and linen change. To verify with the operator.", "roomsclean")
put("Linen change frequency", 1, "per week", "", "linen")
put("Gym area per 100 residents", 45, "m²", "A gym is not a luxury on a 38-month village; it is retention.", "gym")
put("Social / TV space per 100 residents", 60, "m²", "Quiet room, TV room, games. Splitting it into several small rooms works better than one large one.", "social")

sec("UTILITIES AND WASTE")
put("Water demand", 140, "l/person/day", "Residential occupancy including showers, laundry and catering. Far above the site-welfare figure. To verify with the water undertaker.", "water", kind="key")
put("Hot water proportion", 0.40, "%", "Of total water. Drives the heating load and the calorifier sizing.", "hotprop", fmt="0.0%")
put("Foul return", 0.95, "%", "Of water in. Drives treatment plant or tanker frequency.", "foul", fmt="0.0%")
put("Electrical load per bed", 1.6, "kW", "Lighting, small power, ventilation, hot water. Excludes catering and electric heating. To verify with an engineer.", "kwbed", fmt="0.0", kind="key")
put("Diversity factor", 0.65, "×", "Not every load runs at once. Applied to connected load to get demand. To verify.", "divers", fmt="0.00")
put("Catering electrical load", 90, "kW", "Kitchen, servery, cold stores, wash-up. Add if the kitchen is electric rather than gas.", "kwkitchen")
put("Heating load per bed", 1.2, "kW", "Space heating at design outside temperature. To verify with the module supplier's U-values.", "kwheat", fmt="0.0")
put("Power factor", 0.90, "×", "Converts kW to kVA for generation or a DNO connection. Sets are rated in kVA.", "pf", fmt="0.00")
put("Waste arisings", 1.1, "kg/person/day", "Residential plus catering. To verify with the waste contractor.", "waste", fmt="0.0")
put("Recycling and diversion target", 0.55, "%", "", "recyc", fmt="0.0%")

sec("TRANSPORT")
put("Residents transported to site", 0.95, "%", "The rest drive or walk. A village next to the site changes this.", "transres", fmt="0.0%")
put("Bus seats", 53, "seats", "Standard coach. A 16-seat minibus changes the arithmetic entirely.", "busseats")
put("Bus load factor", 0.85, "%", "Nobody fills every seat every run.", "busload", fmt="0.0%")
put("Runs per shift change", 2, "no.", "Two runs staggers the arrival peak at the gate.", "busruns")
put("Shift changes per day", 2, "no.", "One for a single shift, two for two-shift working.", "shifts")
put("Resident parking per 10 residents", 1.5, "spaces", "Most residents are bussed; some keep a car for days off.", "respark", fmt="0.0")
put("Village staff and visitor parking", 25, "spaces", "", "staffpark")

sec("RUNNING THE VILLAGE — STAFFING RATIOS")
put("FTE contracted hours", 42, "h/week", "", "ftehours")
put("24/7 post cover factor", 4.6, "FTE/post", "168 hours a week divided by contracted hours, plus leave, sickness and training cover. To verify with your HR model.", "cover247", fmt="0.0")
put("Reception posts (24/7)", 1, "posts", "", "recposts")
put("Security posts (24/7)", 2, "posts", "Gatehouse plus patrol. Confirm against the security risk assessment.", "secposts")
put("Beds per housekeeping FTE", 32, "beds", "Derived from rooms per shift; shown here so it can be overridden directly.", "bedhk")
put("Covers per catering FTE", 45, "covers", "Chefs, servery, wash-up and stores across the meal cycle. To verify with the caterer.", "covfte")
put("Maintenance FTE per 100 beds", 0.9, "FTE", "Reactive and planned, including grounds and waste.", "maintfte", fmt="0.0")
put("Village management FTE", 2, "FTE", "Village manager and deputy. Below about 150 beds, one.", "mgmtfte")
put("Administration and welfare FTE", 1.5, "FTE", "Bookings, inductions, pastoral and complaints. The last one is why villages succeed or fail.", "adminfte", fmt="0.0")

sec("INDICATIVE RATES — REPLACE EVERY ONE BEFORE QUOTING")
put("Room module — supply, deliver, install", 24000, "£/room", "INDICATIVE ORDER OF MAGNITUDE. Not a quotation. Varies enormously with specification and distance.", "capmod", fmt="£#,##0")
put("Groundworks and hardstanding", 95, "£/m²", "INDICATIVE. Depends entirely on ground conditions, which are not known here.", "capground", fmt="£#,##0")
put("Utility connections and infrastructure", 850000, "£ lump", "INDICATIVE. Wholly dependent on distance to the mains and DNO capacity.", "caputil", fmt="£#,##0")
put("Furniture, fittings and equipment", 3200, "£/room", "INDICATIVE.", "capffe", fmt="£#,##0")
put("Catering fit-out", 4200, "£/cover", "INDICATIVE.", "capcater", fmt="£#,##0")
put("Design, consents and surveys", 380000, "£ lump", "INDICATIVE. Planning for a temporary village is not a formality.", "capdesign", fmt="£#,##0")
put("Demobilisation and reinstatement", 0.18, "% of capex", "INDICATIVE. Frequently forgotten and always incurred.", "capdemob", fmt="0.0%")
put("Room hire", 620, "£/room/month", "INDICATIVE, where modules are hired rather than bought. Set to zero if purchased above.", "opexroom", fmt="£#,##0")
put("Utilities", 145, "£/bed/month", "INDICATIVE.", "opexutil", fmt="£#,##0")
put("Catering", 24, "£/resident/day", "INDICATIVE. Three meals including packed lunch.", "opexcater", fmt="£#,##0")
put("Housekeeping and laundry", 118, "£/room/month", "INDICATIVE.", "opexhk", fmt="£#,##0")
put("Transport", 9500, "£/bus/month", "INDICATIVE. Driver, fuel, maintenance, insurance.", "opexbus", fmt="£#,##0")
put("Village staff — average cost", 4100, "£/FTE/month", "INDICATIVE fully loaded cost.", "opexfte", fmt="£#,##0")
put("Insurance, licences and rates", 18500, "£/month", "INDICATIVE.", "opexins", fmt="£#,##0")
put("Maintenance and consumables", 42, "£/room/month", "INDICATIVE.", "opexmaint", fmt="£#,##0")

sec("VILLAGE DELIVERY PROGRAMME")
put("Design, planning and consents", 7, "months", "A temporary workers village usually needs full planning permission. To verify with the local authority.", "prgdesign")
put("Procurement and module lead time", 5, "months", "Runs partly in parallel with consents at your own risk.", "prgproc")
put("Groundworks and infrastructure", 4, "months", "", "prgground")
put("Module delivery and installation", 3, "months", "", "prginstall")
put("Commissioning and handover", 1, "months", "", "prgcomm")
put("Village must be live by month", 4, "month no.", "The first travelling worker arrives in month 3 on this curve. Work backwards from that, not forwards from today.", "prglive", kind="key")

for row in range(7, r):
    for cc in range(2, 6):
        ws.cell(row=row, column=cc).border = BOX
ws.freeze_panes = "A7"
import json; json.dump(A, open("assump_rows.json", "w"))
wb.save("/home/user/etablix/tools/village-plan.xlsx")
print("Assumptions written,", len(A), "drivers, last row", r - 1)
