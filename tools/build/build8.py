"""Part 8: CostSummary, Compliance, Risks, Mobilisation. Plus fixes."""
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import json
exec(open("styles.py").read())
A = json.load(open("assump_rows.json")); S = json.load(open("sched.json"))
BD = json.load(open("bd.json")); CO = json.load(open("cost.json")); L = json.load(open("layout.json"))
def a(k): return f"Assumptions!$C${A[k]}"
def acc(k): return f"Accommodation!$C${S['ACC'][k]}"
wb = load_workbook("/home/user/etablix/tools/village-plan.xlsx")
GBP = '£#,##0;(£#,##0);-'
CAP = f"Capex!$E${CO['TOTCAP']}"; OPX = f"Opex!${col(CN+2)}${CO['OTOT']}"

# ─────────────────────────────────────────────── CostSummary
ws = wb.create_sheet("CostSummary"); ws.sheet_view.showGridLines = False
for c, w in zip("ABCDEF", (4, 46, 16, 12, 62, 2)): ws.column_dimensions[c].width = w
ws["B2"] = "WHOLE-LIFE COST AND WHO PAYS IT"; ws["B2"].font = H1
ws["B3"] = "Indicative throughout. This sizes a decision — buy or hire, build or book hotels, phase or not. It is not a budget and not a price."; ws["B3"].font = Font(name="Arial", size=9, bold=True, color="C0392B")
band(ws, 5, "   THE WHOLE-LIFE NUMBER", 5)
rows = [
 ("Capex — creating the village", f"={CAP}", GBP, "From Capex. Includes demobilisation and reinstatement."),
 ("Opex — running it for the programme", f"={OPX}", GBP, "From Opex, summed across every month."),
 ("TOTAL WHOLE-LIFE COST", "=C6+C7", GBP, "The number to compare against the alternatives below."),
 ("", "", "", ""),
 ("Bed-nights delivered", "=BedDemand!$C$25", "#,##0", "From BedDemand."),
 ("Whole-life cost per bed-night", "=IFERROR(C8/C10,0)", '£#,##0.00', "The single most useful number here. Compare it directly against a hotel room rate — including the travel time a hotel adds at both ends of every shift."),
 ("Cost per person-month of site presence", "=IFERROR(C8/Workforce!$C$34,0)", GBP, "Whole-life cost against every person-month worked, travelling or local. What the village really costs the project."),
]
r = 6
for lab, f, fmt, note in rows:
    if not lab: r += 1; continue
    c = ws.cell(row=r, column=2, value=lab); c.font = H3 if "TOTAL" in lab or "per bed-night" in lab else BODY
    v = ws.cell(row=r, column=3, value=f); v.font = H1 if "TOTAL" in lab else FORMULA
    v.number_format = fmt
    if "TOTAL" in lab or "per bed-night" in lab: v.fill = KEYFILL
    n = ws.cell(row=r, column=5, value=note); n.font = SMALL; n.alignment = Alignment(wrap_text=True, vertical="top")
    if len(note) > 84: ws.row_dimensions[r].height = 26
    r += 1
r += 1
band(ws, r, "   THE COMPARISON THAT DECIDES IT", 5); r += 1
ws.cell(row=r, column=2, value="Commercial accommodation — nightly rate").font = BODY
ws.cell(row=r, column=3, value=125).font = INPUT
ws.cell(row=r, column=3).number_format = GBP; ws.cell(row=r, column=3).fill = KEYFILL
ws.cell(row=r, column=5, value="INDICATIVE. Put your own market rate here — and remember a village of this size takes the local market with it, so the rate you are quoted today is not the rate you pay in month twenty.").font = SMALL
ws.row_dimensions[r].height = 26
hotel = r; r += 1
ws.cell(row=r, column=2, value="Commercial equivalent over the programme").font = BODY
ws.cell(row=r, column=3, value=f"=C10*C{hotel}").font = FORMULA; ws.cell(row=r, column=3).number_format = GBP
ws.cell(row=r, column=5, value="Bed-nights × nightly rate. Excludes the extra travel time, the fatigue, and the loss of control over where your workforce sleeps.").font = SMALL
comm = r; r += 1
ws.cell(row=r, column=2, value="Difference").font = H3
ws.cell(row=r, column=3, value=f"=C{comm}-C8").font = H3; ws.cell(row=r, column=3).number_format = GBP
ws.cell(row=r, column=5, value="Positive means the village is cheaper on these assumptions. Test it by changing the nightly rate above — the point at which it flips is the answer worth knowing.").font = SMALL
ws.row_dimensions[r].height = 26; r += 1
ws.cell(row=r, column=2, value="Break-even nightly rate").font = BODY
ws.cell(row=r, column=3, value="=IFERROR(C8/C10,0)").font = FORMULA; ws.cell(row=r, column=3).number_format = '£#,##0.00'
ws.cell(row=r, column=5, value="Below this rate, book rooms. Above it, build the village — subject to whether the rooms exist at all, which on most of these projects they do not.").font = SMALL
ws.row_dimensions[r].height = 26; r += 2
band(ws, r, "   RECHARGE BY COMPANY", 5); r += 1
for i, h in enumerate(["", "Company", "Bed-months", "Share", "Indicative opex recharge"]):
    c = ws.cell(row=r, column=i + 1, value=h); c.font = H3; c.fill = SECFILL
r += 1
cr, n = BD["CR"], BD["NCOMP"]
for i in range(n):
    ws.cell(row=r + i, column=2, value=f"=BedDemand!B{cr+i}").font = LINK
    ws.cell(row=r + i, column=3, value=f"=BedDemand!D{cr+i}").font = LINK
    ws.cell(row=r + i, column=3).number_format = "#,##0"
    ws.cell(row=r + i, column=4, value=f"=BedDemand!E{cr+i}").font = LINK
    ws.cell(row=r + i, column=4).number_format = "0.0%"
    ws.cell(row=r + i, column=5, value=f"=D{r+i}*{OPX}").font = FORMULA
    ws.cell(row=r + i, column=5).number_format = GBP
ws.cell(row=r + n, column=2, value="TOTAL").font = H3
ws.cell(row=r + n, column=5, value=f"=SUM(E{r}:E{r+n-1})").font = H3
ws.cell(row=r + n, column=5).number_format = GBP; ws.cell(row=r + n, column=5).fill = TOTFILL
ws.cell(row=r + n + 2, column=2, value=("Recharge on share of bed-months is the defensible basis: a company that occupies a fifth of the village for a fifth of the "
  "time pays a fifth. Agree the basis in the subcontract before anyone occupies a room, or it becomes a dispute in month nine.")).font = Font(name="Arial", size=9, italic=True)
ws.merge_cells(start_row=r + n + 2, start_column=2, end_row=r + n + 2, end_column=5)
ws.row_dimensions[r + n + 2].height = 26

def register(name, title, strap, headers, widths, data, fills=None):
    ws = wb.create_sheet(name); ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 4
    for i, w in enumerate(widths): ws.column_dimensions[get_column_letter(i + 2)].width = w
    ws["B2"] = title; ws["B2"].font = H1
    ws["B3"] = strap; ws["B3"].font = SMALL
    for i, h in enumerate(headers):
        c = ws.cell(row=5, column=i + 2, value=h); c.font = H3; c.fill = SECFILL
        c.alignment = Alignment(wrap_text=True, vertical="bottom")
        c.border = Border(bottom=Side(style="medium", color="14181D"))
    ws.row_dimensions[5].height = 28
    for j, row in enumerate(data):
        for i, v in enumerate(row):
            c = ws.cell(row=6 + j, column=i + 2, value=v)
            c.font = BODY; c.alignment = Alignment(wrap_text=True, vertical="top"); c.border = BOX
        ws.row_dimensions[6 + j].height = 30
    ws.freeze_panes = "B6"
    return ws

register("Compliance", "COMPLIANCE AND CONSENTS REGISTER",
 "A workers village is a residential development that happens to be temporary. It is consented, licensed and inspected as one. Confirm every line below with the relevant authority — none of it is settled by this workbook.",
 ["Ref", "Requirement", "Who decides", "Why it bites", "Lead time", "Status"],
 [7, 32, 24, 46, 13, 15],
 [
  ["C01","Planning permission — temporary workers accommodation","Local planning authority","A village is rarely permitted development. Expect a full application with transport, noise, ecology and landscape assessments, and a condition restricting the life of the consent.","6–12 months","Not started"],
  ["C02","Building Regulations approval","Building Control body","Structure, fire, means of escape, ventilation, insulation, accessibility. Modular does not mean exempt.","2–4 months","Not started"],
  ["C03","Fire strategy and fire risk assessment","Fire engineer; Fire & Rescue Service consulted","Sleeping accommodation is the highest-risk occupancy there is. Compartmentation, escape distances, detection, alarm, and a management plan that survives 300 shift workers.","3–6 months","Not started"],
  ["C04","HMO or equivalent licensing","Local authority housing team","Whether a workers village needs an HMO licence depends on its form and the authority. Ask early and in writing — the answer changes the design.","2–6 months","To confirm"],
  ["C05","Food business registration and hygiene rating","Local authority environmental health","At least 28 days before the kitchen opens. A poor rating on a village kitchen becomes a workforce relations problem within a week.","1–2 months","Not started"],
  ["C06","Private water supply / potable certification","Water undertaker; environmental health","No supply is proven potable until it is tested. Residential occupancy is not site welfare.","2–4 months","Not started"],
  ["C07","Foul discharge consent or package treatment permit","Environment Agency / water undertaker","Where there is no public sewer. Tanker frequency at village scale is not a plan, it is a cost.","4–9 months","Not started"],
  ["C08","Legionella risk assessment and water safety plan","Duty holder; competent person","Showers, calorifiers, low occupancy in early months and long dead legs. ACOP L8 applies from the day water enters the system, not from first occupation.","1 month","Not started"],
  ["C09","Electrical installation certification and periodic inspection","Competent person, BS 7671","Plus a DNO connection agreement, or a generation strategy that survives 38 months.","Ongoing","Not started"],
  ["C10","Gas safety — installation and annual certification","Gas Safe registered engineer","If catering or heating is gas. Certificates per appliance, per year, without exception.","Ongoing","Not started"],
  ["C11","Waste carrier registration and duty of care","Environment Agency; waste contractor","Transfer notes for every movement. Village waste is commercial waste.","1 month","Not started"],
  ["C12","Asbestos, ground contamination and land quality","Competent consultant","Before groundworks. Unknown ground is the commonest source of a village overrunning its programme.","2–3 months","Not started"],
  ["C13","Highways agreement for village access","Highway authority","A new access serving 300 residents and a bus fleet is not a field gate. Expect a Section 278 or equivalent.","5–7 months","Not started"],
  ["C14","Safeguarding, welfare and residents' conduct policy","Employer / operator","Alcohol, visitors, anti-social behaviour, mental health, lone workers and a complaints route. Villages fail on this more often than on engineering.","1 month","Not started"],
  ["C15","Insurance — property, liability, business interruption","Broker / insurer","Confirm the village is covered as residential, not as a site compound. The two are underwritten very differently.","1 month","Not started"],
  ["C16","Data protection for resident records","Employer / operator","Occupancy, next of kin, health information and CCTV. A lawful basis and a retention period for each.","1 month","Not started"],
 ])

register("Risks", "RISK REGISTER — VILLAGE DELIVERY AND OPERATION",
 "Scored probability × impact. Sixteen and above is immediate management attention. Every mitigation names an action and an owner; none of them says “monitor”.",
 ["Ref", "Risk", "P", "I", "Score", "Mitigation — what is actually done", "Owner"],
 [7, 40, 5, 5, 7, 52, 20],
 [
  ["R01","Planning consent refused or heavily conditioned","3","5","=D6*E6","Pre-application meeting before any design spend; transport, noise and landscape assessments commissioned early; a fallback of phased commercial accommodation priced before the application goes in.","Development manager"],
  ["R02","Village not live before the first travelling worker arrives","4","4","=D7*E7","Work the programme backwards from first arrival, not forwards from today. Commit long-lead modules before consent at a priced, accepted risk. Book bridging accommodation now for the first ninety days.","Project director"],
  ["R03","Ground conditions worse than assumed","3","4","=D8*E8","Ground investigation before the layout is fixed, not after. Hold a provisional sum against foundations until it reports.","Engineering"],
  ["R04","Utility connection unavailable or capacity refused","3","5","=D9*E9","Enquiries to water and DNO before land is committed. Generation and package treatment priced in parallel as the fallback, not as an afterthought.","Engineering"],
  ["R05","Fire strategy forces a design change late","2","5","=D10*E10","Fire engineer appointed at concept, not at Building Control. Compartmentation and escape agreed before modules are ordered.","Fire engineer"],
  ["R06","Occupancy materially below plan — the village runs empty","3","4","=D11*E11","Phase the blocks against the bed curve. Contract for hire with a break, or a sublet right, rather than buying the peak on day one.","Commercial"],
  ["R07","Occupancy above plan — no room for a late package","3","3","=D12*E12","Contingency rooms in the schedule and a pre-agreed call-off for additional modules with a stated lead time.","Commercial"],
  ["R08","Legionella or water quality failure","2","5","=D13*E13","Water safety plan from first fill, flushing regime through the low-occupancy months, competent person appointed, records kept.","Village operator"],
  ["R09","Fire, flood or major incident in occupied accommodation","2","5","=D14*E14","Detection and alarm to the fire strategy, drills from first occupation, 24/7 staffed reception, muster and roll-call procedure tested.","Village manager"],
  ["R10","Anti-social behaviour, alcohol or violence","4","3","=D15*E15","Written conduct policy accepted at induction, alcohol policy agreed with all employers, 24/7 security, a real complaints route and consequences that are applied.","Village manager"],
  ["R11","Catering failure — hygiene, supply or quality","3","4","=D16*E16","Registered caterer, hygiene rating monitored, contingency supplier identified, resident feedback acted on monthly. Bad food empties a village faster than bad beds.","Village operator"],
  ["R12","Transport failure — workforce late to site","3","4","=D17*E17","Spare bus in the contract, drivers' hours modelled, a walking or minibus fallback, and a gate arrival plan that does not depend on every bus being on time.","Logistics"],
  ["R13","Local community objection during operation","3","3","=D18*E18","Liaison group from before the application, a published complaints number answered by a person, lighting and noise controls, and traffic routed away from the village.","Community liaison"],
  ["R14","Cost escalation on modules or catering","4","3","=D19*E19","Fix rates at order for the full 38 months where possible; index only what must be indexed; hold the difference as a named risk allowance.","Commercial"],
  ["R15","Recharge dispute between companies","3","3","=D20*E20","Basis of recharge — share of bed-months — agreed in every subcontract before occupation, with the register visible to all parties monthly.","Commercial"],
  ["R16","Workforce refuses the accommodation standard offered","2","4","=D21*E21","Room specification agreed with the trade unions and employers before order. A room nobody will live in is worse than no village.","Project director"],
  ["R17","Demobilisation and reinstatement not budgeted","4","2","=D22*E22","Priced in Capex from day one and held in the cost plan, not left to the final account.","Commercial"],
 ])
ws = wb["Risks"]
for rr in range(6, 23):
    ws.cell(row=rr, column=6).font = H3
    ws.cell(row=rr, column=6).alignment = Alignment(horizontal="center")
    for cc in (4, 5): ws.cell(row=rr, column=cc).alignment = Alignment(horizontal="center")

register("Mobilisation", "MOBILISATION CHECKLIST — THE ORDER THINGS HAVE TO HAPPEN IN",
 "Ordered by what blocks what. The first block is the one that is already late on most projects.",
 ["Ref", "Action", "When", "Owner", "Blocks what, if it slips"],
 [7, 46, 20, 22, 48],
 [
  ["M01","Fix the first-arrival month from the bed curve","Now","Project director","Everything. This is the only date the village programme is worked back from."],
  ["M02","Pre-application meeting with the planning authority","Now","Development manager","The consent, and therefore the whole programme."],
  ["M03","Commission ground investigation on the village site","Now","Engineering","Foundations, hardstanding, drainage and the capex number."],
  ["M04","Water and DNO capacity enquiries","Now","Engineering","Whether the village can be where you want it at all."],
  ["M05","Appoint the fire engineer","Now","Project director","Block layout, compartmentation, escape and module specification."],
  ["M06","Agree the room specification with employers and unions","Month 1","Project director","Module order. A room nobody will accept is worse than no village."],
  ["M07","Price bridging accommodation for the first ninety days","Month 1","Commercial","The gap between first arrival and village live, which almost always exists."],
  ["M08","Market test modules and fix the lead time","Month 1","Procurement","The critical path from month two onwards."],
  ["M09","Agree the recharge basis in every subcontract","Month 2","Commercial","A dispute in month nine that nobody can settle retrospectively."],
  ["M10","Submit the planning application","Month 2","Development manager","Consent, and every date after it."],
  ["M11","Appoint the village operator","Month 3","Project director","Staffing, mobilisation, policies and the operational readiness plan."],
  ["M12","Order long-lead modules","Month 3","Procurement","Delivery and installation. Placed before consent only on a priced, accepted risk."],
  ["M13","Food business registration","28 days before opening","Village operator","The kitchen. Statutory minimum notice, no discretion."],
  ["M14","Water safety plan and first-fill flushing regime","Before first fill","Village operator","Legionella duty. Applies from the day water enters the system."],
  ["M15","Conduct, alcohol and safeguarding policy issued","Before occupation","Village manager","Every discipline case that follows. Unwritten policies are unenforceable."],
  ["M16","Fire drill and roll-call procedure tested","First week of occupation","Village manager","The one thing that must work the first time it is needed."],
  ["M17","Resident feedback route open and answered","First week of occupation","Village manager","Retention. Villages fail on food, wifi and being ignored — in that order."],
  ["M18","Demobilisation plan and reinstatement scope agreed","Month 6","Commercial","The end of the job, priced while there is still time to price it."],
 ])

# fixes
bd = wb["BedDemand"]
bd["C26"] = f'=IFERROR(AVERAGEIF({col(C0)}10:{col(CN)}10,">0")/$C$22,0)'
bd["C26"].font = FORMULA; bd["C26"].number_format = "0%"
wb.save("/home/user/etablix/tools/village-plan.xlsx")
print("CostSummary, Compliance, Risks, Mobilisation written; sheets:", len(wb.sheetnames))
