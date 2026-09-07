"""Rebuild Accommodation + Facilities with tracked row keys (no hand-written refs)."""
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
exec(open("styles.py").read())
A = json.load(open("assump_rows.json"))
def a(k): return f"Assumptions!$C${A[k]}"
PEAK = "BedDemand!$C$20"; PEAKRES = "BedDemand!$C$22"
wb = load_workbook("/home/user/etablix/tools/village-plan.xlsx")
for s in ("Accommodation", "Facilities"):
    if s in wb.sheetnames: del wb[s]

class Sheet:
    def __init__(self, name, title, strap):
        self.ws = wb.create_sheet(name); self.ws.sheet_view.showGridLines = False
        for c, w in zip("ABCDEF", (4, 46, 13, 12, 66, 2)): self.ws.column_dimensions[c].width = w
        self.ws["B2"] = title; self.ws["B2"].font = H1
        self.ws["B3"] = strap; self.ws["B3"].font = SMALL
        for i, t in enumerate(["", "Item", "Quantity", "Unit", "How it is derived — and what to verify"]):
            c = self.ws.cell(row=5, column=i + 1, value=t); c.font = H3
            c.border = Border(bottom=Side(style="medium", color="14181D"))
        self.r = 6; self.k = {}
    def sec(self, t):
        section(self.ws, self.r, t, 5); self.r += 1
    def gap(self): self.r += 1
    def ref(self, key): return f"C{self.k[key]}"
    def line(self, key, label, formula, unit, basis, fmt="0", bold=False):
        r = self.r
        c = self.ws.cell(row=r, column=2, value=label); c.font = H3 if bold else BODY
        v = self.ws.cell(row=r, column=3, value=formula.format(**{k: f"C{vv}" for k, vv in self.k.items()}))
        v.font = H3 if bold else FORMULA; v.number_format = fmt
        if bold: v.fill = TOTFILL
        self.ws.cell(row=r, column=4, value=unit).font = SMALL
        b = self.ws.cell(row=r, column=5, value=basis); b.font = SMALL
        b.alignment = Alignment(wrap_text=True, vertical="top")
        if len(basis) > 84: self.ws.row_dimensions[r].height = 24
        for cc in range(2, 6): self.ws.cell(row=r, column=cc).border = BOX
        if key: self.k[key] = r
        self.r += 1
    def note(self, label, value, basis):
        r = self.r
        self.ws.cell(row=r, column=2, value=label).font = BODY
        self.ws.cell(row=r, column=3, value=value).font = Font(name="Arial", size=10, italic=True, color="C0392B")
        b = self.ws.cell(row=r, column=5, value=basis); b.font = SMALL
        b.alignment = Alignment(wrap_text=True, vertical="top"); self.ws.row_dimensions[r].height = 34
        self.r += 1

# ── Accommodation
s = Sheet("Accommodation", "ACCOMMODATION SCHEDULE — WHAT GETS BUILT",
          "Sized to the peak from BedDemand. Room mix, block count, floor area and land take.")
s.sec("ROOM SCHEDULE")
s.line("peak", "Peak rooms required (from BedDemand)", f"={PEAK}", "rooms", "The village is built to this number, not to the average.", bold=True)
s.line("acc", "Accessible rooms", f"=ROUNDUP({{peak}}*{a('access')},0)", "rooms", "Level access, accessible shower room, turning circle. Confirm the required proportion with Building Control — the percentage on Assumptions is a placeholder, not a standard.")
s.line("sen", "Senior / manager rooms", f"=ROUNDUP({{peak}}*{a('senior')},0)", "rooms", "A commercial choice, not a requirement.")
s.line("std", "Standard single ensuite rooms", "={peak}-{acc}-{sen}", "rooms", "The balance.")
s.line("fem", "  of which allocated to women", f"=ROUNDUP({{std}}*{a('female')},0)", "rooms", "Drives a separate lockable block or floor with its own entrance, not simply a count of rooms. Set the percentage from your own workforce data.")
s.line("tot", "TOTAL ROOMS", "={acc}+{sen}+{std}", "rooms", "", bold=True)
s.gap(); s.sec("BLOCKS AND FLOOR AREA")
s.line("blocks", "Accommodation blocks", f"=ROUNDUP({{tot}}/{a('roomsblock')},0)", "blocks", "At the module size on Assumptions. Round up — a part block is a whole block.")
s.line("net", "Net room area", f"={{std}}*{a('roomarea')}+{{acc}}*{a('accarea')}+{{sen}}*{a('senarea')}", "m²", "Rooms only, before corridors and plant.", fmt="#,##0")
s.line("gross", "Gross accommodation area", f"={{net}}*{a('grossup')}", "m²", "Corridors, stairs, risers and plant included. The gross-up factor should come from the supplier's actual block layout.", fmt="#,##0")
s.gap(); s.sec("LAND TAKE")
s.line("foot", "Accommodation footprint (two storey)", "={gross}/2", "m²", "Assumes two-storey blocks. Single storey doubles this.", fmt="#,##0")
s.line("ext", "External works, roads, parking, standoff", f"={{tot}}*{a('extspace')}", "m²", "Roads, footpaths, parking, drainage, landscaping, and separation between blocks for fire and privacy.", fmt="#,##0")
s.line("amen", "Amenity and facilities footprint", "=Facilities!$C$AMEN", "m²", "From the facilities schedule.", fmt="#,##0")
s.line("site", "TOTAL SITE AREA REQUIRED", "={foot}+{ext}+{amen}", "m²", "", fmt="#,##0", bold=True)
s.line("ha", "  in hectares", "={site}/10000", "ha", "Test this against the land you actually have before anything else on this sheet matters.", fmt="0.00", bold=True)
s.gap(); s.sec("SANITY CHECKS")
s.line("rpr", "Rooms per resident at peak", f"=IFERROR({{tot}}/{PEAKRES},0)", "×", "A little above 1.0 is right. Well above means the void and contingency allowances are generous.", fmt="0.00")
s.line("apb", "Gross area per bed", "=IFERROR({gross}/{tot},0)", "m²/bed", "Typically 14–18 m² gross for a modular village. Outside that, check the gross-up factor.", fmt="0.0")
ACC = dict(s.k)

# ── Facilities
f = Sheet("Facilities", "FACILITIES SCHEDULE — WHAT THE VILLAGE NEEDS TO WORK",
          "Sized to peak occupancy. Every ratio sits on Assumptions, and every one is a first-pass planning figure.")
f.sec("CATERING")
f.line("res", "Peak residents", f"={PEAKRES}", "people", "", bold=True)
f.line("brek", "Breakfast covers required", f"=ROUNDUP({{res}}*{a('brek')}/{a('sittings')},0)", "covers", "Residents taking breakfast, divided by sittings.")
f.line("dinner", "Evening meal covers required", f"=ROUNDUP({{res}}*{a('dinner')}/{a('sittings')},0)", "covers", "Usually the binding case — everyone is back at once.")
f.line("covers", "DINING ROOM COVERS (design case)", "=MAX({brek},{dinner})", "covers", "Size the room to the larger of the two.", bold=True)
f.line("dinearea", "Dining room area", f"={{covers}}*{a('coverarea')}", "m²", "", fmt="#,##0")
f.line("kitch", "Kitchen, servery, stores and wash-up", f"={{covers}}*{a('kitcharea')}", "m²", "To verify with the caterer against their menu and delivery cycle.", fmt="#,##0")
f.line("lunch", "Packed lunches per day", f"=ROUNDUP({{res}}*{a('lunch')},0)", "no.", "Made in the same kitchen overnight — no covers, but real labour and real cold storage.")
f.line("meals", "Meals served per day (all sittings)", f"=ROUNDUP({{res}}*({a('brek')}+{a('dinner')}),0)", "meals", "Drives the catering line on Opex.", fmt="#,##0")
f.gap(); f.sec("LAUNDRY, DRYING AND HOUSEKEEPING")
f.line("wash", "Washing machines", f"=ROUNDUP({{res}}/{a('perwash')},0)", "no.", "Self-service. Fewer if bed linen is contracted out — personal laundry still has to happen somewhere.")
f.line("dry", "Tumble dryers", f"=ROUNDUP({{res}}/{a('perdry')},0)", "no.", "")
f.line("dryroom", "Drying rooms for wet PPE and boots", f"=ROUNDUP({{res}}/100*{a('dryroom')},0)", "rooms", "Separate from the laundry. On a wet site this is the difference between dry boots and a dispute.")
f.line("launarea", "Laundry and drying area", "={wash}*3.5+{dry}*2.5+{dryroom}*24", "m²", "Machine footprint plus circulation, plus the drying rooms. To verify against equipment schedules.", fmt="#,##0")
f.line("clean", f"Rooms cleaned per day", f"=ROUNDUP({PEAK}/7*{a('linen')},0)", "rooms", "Full clean and linen change at the frequency on Assumptions, spread across the week.")
f.gap(); f.sec("SOCIAL, WELFARE AND SUPPORT")
f.line("gym", "Gym area", f"=ROUNDUP({{res}}/100*{a('gym')},0)", "m²", "On a 38-month village this is retention, not a perk. Under-provide it and it shows up in turnover.", fmt="#,##0")
f.line("social", "Social, TV and quiet space", f"=ROUNDUP({{res}}/100*{a('social')},0)", "m²", "Several small rooms beat one large one — shift patterns mean somebody is always asleep.", fmt="#,##0")
f.line("office", "Reception, admin and village office", "=90", "m²", "Reception, office, meeting room, first aid. Fixed provision; increase above about 400 beds.", fmt="#,##0")
f.line("stores", "Stores, plant and maintenance", "=ROUNDUP({res}*0.6,0)", "m²", "Linen store, consumables, maintenance workshop, plant room. To verify.", fmt="#,##0")
f.line("refuse", "Refuse and recycling compound", "=ROUNDUP({res}*0.35,0)", "m²", "Sized for the arisings on Utilities and the collection frequency you can actually get.", fmt="#,##0")
f.line("amen", "TOTAL FACILITIES AREA", "={dinearea}+{kitch}+{launarea}+{gym}+{social}+{office}+{stores}+{refuse}", "m²", "Feeds the land take on Accommodation.", fmt="#,##0", bold=True)
f.gap(); f.sec("FIRE, MUSTER AND SAFETY — TO BE DESIGNED, NOT ASSUMED")
f.line("muster", "Muster capacity required", "={res}+VillageStaff!$C$23", "people", "Residents plus village staff on shift. The number, location and travel distances of muster points are a fire engineer's decision, not this ratio's.")
f.line("musterarea", "Muster area (indicative only)", "={muster}*0.5", "m²", "0.5 m² per person is an indicative planning figure. It does not constitute a fire strategy.", fmt="#,##0")
f.note("Fire strategy, compartmentation, alarm and detection", "By design",
       "A residential village of this size is a designed fire-engineering case under BS 9991 and Approved Document B — compartmentation, "
       "escape distances, detection, alarm and a management plan. Nothing in this workbook sizes any of it, and nothing here should be read as doing so.")
# resolve the forward reference from Accommodation
wb["Accommodation"].cell(row=ACC["amen"], column=3, value=f"=Facilities!$C${f.k['amen']}")
json.dump({"ACC": ACC, "FAC": f.k}, open("sched.json", "w"))
wb.save("/home/user/etablix/tools/village-plan.xlsx")
print("rebuilt with tracked rows — Accommodation total row", ACC["tot"], "· Facilities covers row", f.k["covers"], "· amenity row", f.k["amen"])
