"""Recompute the evaluation independently, with two worked cases."""
import json
E = json.load(open("eval.json"))
W = [0.15,0.15,0.12,0.08,0.10,0.08,0.07,0.05]   # quality weightings from Criteria
QW, PWt = sum(W), 0.40
def run(name, scores, prices):
    q = [sum(s*w for s,w in zip(col,W))/QW for col in scores]
    low = min(prices)
    p = [5*low/x for x in prices]
    comb = [a*QW + b*PWt for a,b in zip(q,p)]
    rank = sorted(range(len(comb)), key=lambda i:-comb[i])
    print(f"\n── {name}")
    print("   tenderer      price      quality  price-sc  combined")
    for i in range(len(comb)):
        print(f"   T{i+1:<12} £{prices[i]:>9,.0f}   {q[i]:5.2f}     {p[i]:5.2f}     {comb[i]:6.3f}")
    m = comb[rank[0]] - comb[rank[1]]
    print(f"   winner T{rank[0]+1}, margin {m:.3f} = {m/comb[rank[0]]:.1%} of the winning score")
    winners = []
    for pw in (0.20,0.30,0.40,0.50,0.60,0.70):
        cb = [a*(1-pw)+b*pw for a,b in zip(q,p)]
        winners.append(cb.index(max(cb))+1)
    stable = len(set(winners))==1
    print(f"   sensitivity 20%→70%: winners {winners}  →  {'STABLE' if stable else 'FRAGILE'}")
    return stable

# Case A — a clear winner
run("CASE A — clear result",
    [[4,4,4,3,4,4,3,3],[3,3,3,3,3,3,3,3],[5,4,4,4,4,3,4,4],[2,3,2,3,3,2,3,2],[3,4,3,3,4,3,3,3]],
    [4_150_000, 3_920_000, 4_480_000, 3_640_000, 4_050_000])

# Case B — engineered so the cheap-but-weaker tender overtakes as price weighting rises
run("CASE B — engineered to be fragile",
    [[5,5,4,4,5,4,4,4],[3,3,3,3,3,3,3,3],[3,3,3,3,3,3,3,3],[3,3,3,3,3,3,3,3],[3,3,3,3,3,3,3,3]],
    [4_600_000, 3_650_000, 4_400_000, 4_500_000, 4_450_000])
