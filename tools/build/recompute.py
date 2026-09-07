"""Independent recomputation of the model, reading the workbook's own inputs.

LibreOffice cannot recalculate here, so this re-implements the model in Python
from the same Assumptions and Teams values and reports what the workbook should
produce. It does not prove Excel syntax; it proves the model is coherent and the
numbers are sane.
"""
from openpyxl import load_workbook
import json, math
A = json.load(open("assump_rows.json"))
wb = load_workbook("/home/user/etablix/tools/village-plan.xlsx")
As = wb["Assumptions"]
def v(k): return As.cell(row=A[k], column=3).value
T = wb["Teams"]
teams = []
for r in range(5, 27):
    if not T.cell(row=r, column=1).value: break
    teams.append(dict(ref=T.cell(row=r,column=1).value, co=T.cell(row=r,column=2).value,
        peak=T.cell(row=r,column=5).value, s=T.cell(row=r,column=6).value, f=T.cell(row=r,column=7).value,
        lf=T.cell(row=r,column=8).value, e=T.cell(row=r,column=9).value, trav=T.cell(row=r,column=10).value))
M = 38
def hc(t, m):
    if m < t["s"] or m > t["e"]: return 0
    if m < t["f"]: return round(t["peak"] * (m - t["s"] + 1) / (t["f"] - t["s"] + 1))
    if m <= t["lf"]: return t["peak"]
    return round(t["peak"] * (t["e"] - m + 1) / (t["e"] - t["lf"]))

pop  = [sum(hc(t,m) for t in teams) for m in range(1,M+1)]
trav = [round(sum(hc(t,m)*t["trav"] for t in teams)) for m in range(1,M+1)]
pres = [x*v("rotation") for x in trav]
resrooms = [math.ceil(x*v("roomsper")) for x in pres]
void = [math.ceil(x*v("void")) for x in resrooms]
cont = [math.ceil(x*v("contin")) for x in resrooms]
vis  = [v("visitor") if x>0 else 0 for x in resrooms]
rooms = [a+b+c+d for a,b,c,d in zip(resrooms,void,cont,vis)]

PEAK_ROOMS = max(rooms); PEAK_RES = max(resrooms)
acc_rooms = math.ceil(PEAK_ROOMS*v("access")); sen = math.ceil(PEAK_ROOMS*v("senior"))
std = PEAK_ROOMS - acc_rooms - sen; fem = math.ceil(std*v("female"))
total_rooms = acc_rooms + sen + std
blocks = math.ceil(total_rooms/v("roomsblock"))
net = std*v("roomarea") + acc_rooms*v("accarea") + sen*v("senarea")
gross = net*v("grossup"); foot = gross/2
ext = total_rooms*v("extspace")
covers = max(math.ceil(PEAK_RES*v("brek")/v("sittings")), math.ceil(PEAK_RES*v("dinner")/v("sittings")))
dine = covers*v("coverarea"); kitch = covers*v("kitcharea")
wash = math.ceil(PEAK_RES/v("perwash")); dry = math.ceil(PEAK_RES/v("perdry"))
dryroom = math.ceil(PEAK_RES/100*v("dryroom")); laun = wash*3.5+dry*2.5+dryroom*24
gym = math.ceil(PEAK_RES/100*v("gym")); social = math.ceil(PEAK_RES/100*v("social"))
office = 90; stores = math.ceil(PEAK_RES*0.6); refuse = math.ceil(PEAK_RES*0.35)
amen = dine+kitch+laun+gym+social+office+stores+refuse
site = foot+ext+amen

water = PEAK_RES*v("water")/1000
kw = PEAK_RES*v("kwbed") + v("kwkitchen")
kva = round(kw*v("divers")/v("pf"))
buses = math.ceil(math.ceil(round(PEAK_RES*v("transres"))/v("busruns"))/(v("busseats")*v("busload")))
fte = (v("mgmtfte") + v("recposts")*v("cover247") + v("secposts")*v("cover247")
       + math.ceil(PEAK_ROOMS/v("bedhk")*10)/10 + math.ceil(covers/v("covfte")*10)/10
       + round(PEAK_RES/100*v("maintfte"),1) + v("adminfte") + math.ceil(buses*2.2*10)/10)

cap = {}
cap["P1"] = site*v("capground")*0.45 + ext*v("capground")*0.55 + foot*180 + site*38 + v("caputil")
cap["P2"] = total_rooms*v("capmod") + (gym+social+laun)*1450 + (office+stores)*1250 + (dine+kitch)*1600
cap["P3"] = covers*v("capcater") + 145000
cap["P4"] = total_rooms*v("capffe") + covers*260 + (gym+social+office)*220 + (wash+dry)*1400
cap["P5"] = 165000
design = v("capdesign")
subtotal = sum(cap.values())+design
demob = subtotal*v("capdemob"); TOTCAP = subtotal+demob

opex = 0
for i in range(M):
    if resrooms[i] == 0: continue
    f = (rooms[i]*v("opexroom") + resrooms[i]*v("opexutil") + round(resrooms[i]*v("opexcater")*30.4)
         + rooms[i]*v("opexhk") + rooms[i]*v("opexmaint") + v("opexins"))
    opex += f
bednights = round(sum(resrooms)*30.4)

P = lambda l, x, u="": print(f"  {l:<46}{x:>14}  {u}")
print("=== WORKFORCE ===")
P("Peak site population", f"{max(pop)}", f"month {pop.index(max(pop))+1}")
P("Peak travelling", f"{max(trav)}", f"month {trav.index(max(trav))+1}")
P("Average site population", f"{round(sum(pop)/M)}")
P("Person-months", f"{sum(pop):,}")
print("\n=== VILLAGE SIZE ===")
P("Peak rooms required", f"{PEAK_ROOMS}")
P("  standard / accessible / senior", f"{std} / {acc_rooms} / {sen}")
P("  of standard, for women", f"{fem}")
P("Accommodation blocks", f"{blocks}", f"at {v('roomsblock')} rooms")
P("Gross accommodation area", f"{gross:,.0f}", "m²")
P("Gross area per bed", f"{gross/total_rooms:,.1f}", "m²/bed  (sane range 14-18)")
P("Total site area", f"{site:,.0f}", f"m²  = {site/10000:.2f} ha")
print("\n=== FACILITIES AND SERVICES ===")
P("Dining room covers", f"{covers}")
P("Washing machines / dryers / drying rooms", f"{wash} / {dry} / {dryroom}")
P("Peak water demand", f"{water:,.1f}", "m³/day")
P("Peak diversified demand", f"{kva:,}", "kVA")
P("Peak buses", f"{buses}")
P("Peak village FTE", f"{fte:,.1f}", f"= 1 per {PEAK_RES/fte:.1f} residents (a full-service village runs 5-8)")
print("\n=== COST (indicative rates) ===")
for k in ("P1","P2","P3","P4","P5"): P(f"  {k}", f"£{cap[k]:,.0f}")
P("Design, consents and fees", f"£{design:,.0f}")
P("Demobilisation", f"£{demob:,.0f}")
P("TOTAL CAPEX", f"£{TOTCAP:,.0f}")
P("Capex per room", f"£{TOTCAP/total_rooms:,.0f}")
P("TOTAL OPEX over 38 months", f"£{opex:,.0f}")
P("WHOLE-LIFE", f"£{TOTCAP+opex:,.0f}")
P("Bed-nights", f"{bednights:,}")
P("Whole-life per bed-night", f"£{(TOTCAP+opex)/bednights:,.2f}")
