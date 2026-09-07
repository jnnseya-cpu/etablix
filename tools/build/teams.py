# ref, company, team, trade, peak, start, full, lastfull, end, travelling%, shift
T = [
 ("T01","Marrowbridge Infrastructure Ltd","Project management team","Management",18,1,3,36,38,0.55,"Days Mon-Fri"),
 ("T02","Marrowbridge Infrastructure Ltd","Site supervision","Supervision",20,3,6,34,36,0.60,"Days + back shift"),
 ("T03","Marrowbridge Infrastructure Ltd","HSEQ & quality","HSEQ",8,2,4,35,37,0.50,"Days Mon-Fri"),
 ("T04","Redmoor Groundworks Ltd","Earthworks gang A","Earthworks",34,3,5,14,16,0.35,"Days 6/7"),
 ("T05","Redmoor Groundworks Ltd","Earthworks gang B","Earthworks",26,5,7,13,15,0.35,"Days 6/7"),
 ("T06","Calderbrook Civils Ltd","Compound & hardstanding","Civils",30,2,4,9,11,0.40,"Days 6/7"),
 ("T07","Calderbrook Civils Ltd","Foundations & structures","Civils",33,8,11,22,25,0.45,"Days 6/7"),
 ("T08","Calderbrook Civils Ltd","Drainage & ducting","Civils",16,6,8,20,22,0.40,"Days 6/7"),
 ("T09","Northgate Steel Ltd","Steel erection","Steelwork",33,14,17,26,29,0.80,"Two shift"),
 ("T10","Northgate Steel Ltd","Cladding & envelope","Envelope",21,20,22,30,32,0.75,"Two shift"),
 ("T11","Ledwyn Scaffolding Ltd","Scaffold gangs","Scaffold",14,12,14,30,33,0.70,"Days 6/7"),
 ("T12","Penmark Cable Services Ltd","Cable pulling","Cable",26,16,19,30,33,0.85,"Two shift"),
 ("T13","Penmark Cable Services Ltd","Jointing & terminations","Cable",19,22,25,33,35,0.90,"Two shift"),
 ("T14","Ashfell M&E Ltd","Mechanical installation","M&E",24,20,23,32,34,0.70,"Days 6/7"),
 ("T15","Ashfell M&E Ltd","Electrical installation","M&E",28,21,24,33,35,0.70,"Days 6/7"),
 ("T16","Ironvale Welding Ltd","Pipe & vessel welding","Welding",14,22,24,31,33,0.90,"Two shift"),
 ("T17","Vellamo Power Systems Ltd","HV plant installation","HV plant",20,26,28,34,36,0.85,"Days 6/7"),
 ("T18","Southgate Testing & Commissioning Ltd","Testing & commissioning","Commissioning",18,30,32,37,38,0.95,"Days + call out"),
 ("T19","Tarnhow Logistics Ltd","Plant, cranes & logistics","Logistics",14,2,4,34,37,0.45,"Days 6/7"),
 ("T20","Brightbay Facilities Management Ltd","Village operations","Village ops",22,1,3,37,38,0.30,"24/7 rota"),
 ("T21","Kestrel Security Ltd","Site & village security","Security",12,1,2,38,38,0.25,"24/7 rota"),
 ("T22","Hollins Catering Ltd","Catering & housekeeping","Catering",14,2,4,37,38,0.40,"Split shift"),
]
def hc(t, m):
    _,_,_,_,peak,s,f,lf,e,_,_ = t
    if m < s or m > e: return 0
    if m < f:  return round(peak * (m - s + 1) / (f - s + 1))
    if m <= lf: return peak
    return round(peak * (e - m + 1) / (e - lf))
tot = [sum(hc(t,m) for t in T) for m in range(1,39)]
trav = [sum(round(hc(t,m)*t[9]) for t in T) for m in range(1,39)]
print("months:", len(tot))
print("peak total     :", max(tot), "at month", tot.index(max(tot))+1)
print("peak travelling:", max(trav), "at month", trav.index(max(trav))+1)
print("avg total      :", round(sum(tot)/len(tot)))
print("person-months  :", sum(tot))
print()
for i in range(0,38,6):
    print("M%-3d"%(i+1), " ".join("%4d"%x for x in tot[i:i+6]))
