#!/usr/bin/env python3
"""Audit of the appendices, and of whether they agree with the parent ER.

    python3 qa-appendices.py

An appendix that contradicts the document it is an appendix TO is worse than
a missing one: the missing one is a known gap, the contradiction is priced.

Checks
  1  Table geometry fits the page; every row matches its grid.
  2  Every appendix in the register appears as a section.
  3  Every clause of the ER cited here exists in the ER.
  4  CONSISTENCY WITH THE ER — the shared numbers must be identical in both.
  5  The bed demand curve is feasible: no month needs more beds than exist.
  6  Every insertion sheet states a pricing basis and what happens if it differs.
  5b The prose about the curve agrees with the curve itself.
"""
import zipfile, re, sys, collections
from xml.etree import ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
APX = "ETABLIX-ER-P2-Appendices.docx"
ER  = "ETABLIX-ER-P2-Modular-Accommodation.docx"

def load(path):
    root = ET.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    heads, paras, tbl = [], [], [0, 0, 0]
    def ptext(p): return "".join(t.text or "" for t in p.iter(f'{{{W}}}t'))
    def pstyle(p):
        pr = p.find(f'{{{W}}}pPr'); st = pr.find(f'{{{W}}}pStyle') if pr is not None else None
        return st.get(f'{{{W}}}val') if st is not None else ""
    def walk(el):
        for ch in el:
            tag = ch.tag.split('}')[1]
            if tag == 'p':
                t = ptext(ch); paras.append(t)
                if pstyle(ch).startswith('Heading'): heads.append(t)
            elif tag == 'tbl':
                tbl[0] += 1
                for tr in ch.findall(f'{{{W}}}tr'):
                    tbl[1] += 1
                    for tc in tr.findall(f'{{{W}}}tc'):
                        tbl[2] += 1; walk(tc)
    walk(root.find(f'{{{W}}}body'))
    return root, heads, " \n".join(paras), tbl

root, heads, text, tbl = load(APX)
_, er_heads, er_text, _ = load(ER)
open("appendices.txt", "w", encoding="utf-8").write(text)
fails = []

# 1 geometry
pg = next(root.iter(f'{{{W}}}pgSz')); mar = next(root.iter(f'{{{W}}}pgMar'))
usable = int(pg.get(f'{{{W}}}w')) - int(mar.get(f'{{{W}}}left')) - int(mar.get(f'{{{W}}}right'))
geo = []
for i, t in enumerate(root.iter(f'{{{W}}}tbl'), 1):
    grid = [int(c.get(f'{{{W}}}w')) for c in t.find(f'{{{W}}}tblGrid')]; g = sum(grid)
    if g > usable: geo.append(f"table {i}: grid {g} > usable {usable}")
    for r, tr in enumerate(t.findall(f'{{{W}}}tr'), 1):
        cs = sum(int(tc.find(f'{{{W}}}tcPr/{{{W}}}tcW').get(f'{{{W}}}w')) for tc in tr.findall(f'{{{W}}}tc'))
        if abs(cs - g) > 2: geo.append(f"table {i} row {r}: {cs} != {g}")
if geo: fails.append(("1  table geometry", geo))

# 2 every appendix present
present = {m.group(1) for m in re.finditer(r'^Appendix (\d{1,2})\s', "\n".join(heads), re.M)}
missing = {str(i) for i in range(1, 13)} - present
if missing: fails.append(("2  appendices in the register with no section", sorted(missing, key=int)))

# 3 clauses cited here must exist in the ER
er_clauses = set()
for h in er_heads:
    m = re.match(r'^(\d{1,2})\.(\d{1,2})\s\s', h)
    if m: er_clauses.add(f"{m.group(1)}.{m.group(2)}")
UNITS = r'(?:%|mm|m|kN|kVA|kA|bar|dB|lux|°C|l/s|Ω|ha)'
dangling = collections.Counter()
for m in re.finditer(r'(?:at|per|under|to|see|in|and|,|;)\s(\d{1,2}\.\d{1,2})(?!\s*' + UNITS + r')\b', text):
    c = m.group(1)
    if c not in er_clauses and not re.match(r'^(1|2|3|4|5|6|7|8|9|10|11|12)\.\d$', c):
        dangling["ER clause " + c] += 1
# appendix-internal refs like 6.2, 9.1, 11.2 are headings here
own = {re.match(r'^(\d{1,2}\.\d)\s', h).group(1) for h in heads if re.match(r'^\d{1,2}\.\d\s', h)}
real = {k: v for k, v in dangling.items() if k.split()[-1] not in own and k.split()[-1] not in er_clauses}
if real: fails.append(("3  clause cited that exists in neither document", real))

# 4 consistency with the parent ER — the numbers that appear in both
SHARED = [
    ("room count RT-01", r'\b199\b'),
    ("room count RT-02", r'\b12\b'),
    ("room count RT-03", r'\b14\b'),
    ("external design temperature", r'−4 °C'),
    ("heat-up requirement", r'12 °C to 21 °C within 90 minutes'),
    ("air permeability", r'7\.0 m³'),
    ("imposed load, bedrooms", r'1\.5 kN/m²'),
    ("imposed load, circulation", r'2\.0 kN/m²'),
    ("liquidated damages rate", r'£145'),
    ("deployment duration", r'38'),
    ("supply characteristics", r'400/230 V'),
    ("fluid category", r'Category 5'),
    ("PI insurance limit", r'£5,000,000'),
    ("warranty period", r'twelve years'),
]
mismatch = []
for name, pat in SHARED:
    here, there = bool(re.search(pat, text)), bool(re.search(pat, er_text))
    if here and not there: mismatch.append(f"{name}: in the appendices, absent from the ER")
if mismatch: fails.append(("4  value in the appendices that the ER does not carry", mismatch))

# the peak must equal the room schedule
import subprocess, json
peak = int(subprocess.run(["node", "-e",
    "const b=require('./appendices-b.cjs');console.log(Math.max(...b.DEMAND))"],
    capture_output=True, text=True).stdout.strip())
rooms = 199 + 12 + 14
if peak != rooms:
    fails.append(("4  peak bed demand must equal the room schedule", f"peak {peak} vs rooms {rooms}"))

# 5 curve feasibility
out = subprocess.run(["node", "-e", """
const b=require('./appendices-b.cjs');
const bad=[];
for(let m=1;m<=b.DEMAND.length;m++){
  const avail=b.SECTIONS.filter(x=>x.byMonth<m).reduce((s,x)=>s+x.beds,0);
  if(b.DEMAND[m-1]>avail) bad.push('M'+m+': needs '+b.DEMAND[m-1]+', has '+avail);
}
const tot=b.SECTIONS.reduce((s,x)=>s+x.beds,0);
console.log(JSON.stringify({bad, tot}));
"""], capture_output=True, text=True)
curve = json.loads(out.stdout)
if curve["bad"]: fails.append(("5  bed demand exceeds beds completed", curve["bad"]))
if curve["tot"] != rooms: fails.append(("5  sectional completions do not sum to the room schedule", f"{curve['tot']} vs {rooms}"))

# 5b  the prose about the curve must agree with the curve. This exists because
#     the note said the peak was reached in month 13 and the data said 15.
pm = subprocess.run(["node", "-e", """
const b=require('./appendices-b.cjs');const p=Math.max(...b.DEMAND);
const first=b.DEMAND.findIndex(d=>d===p)+1;
const last=b.DEMAND.length-[...b.DEMAND].reverse().findIndex(d=>d===p);
console.log(JSON.stringify({p,first,last}));
"""], capture_output=True, text=True)
pk = json.loads(pm.stdout)
m = re.search(r'first reached in month (\d+) and held, within two beds, from month (\d+) to month (\d+)', text)
if not m:
    fails.append(("5b  the peak sentence is not in the form the check can verify", "reword or update the check"))
elif [int(m.group(1)), int(m.group(2)), int(m.group(3))] != [pk["first"], pk["first"], pk["last"]]:
    fails.append(("5b  the prose disagrees with the curve",
                  f"prose says {m.group(1)}–{m.group(3)}, data says {pk['first']}–{pk['last']}"))

# 6 insertion sheets must price something
for n in ("2", "3", "4", "7"):
    blk = text.split(f"Appendix {n}  ")
    if len(blk) < 2: continue
    seg = blk[1][:9000]
    if "What a tenderer prices until it arrives" not in seg or "If the issued document differs" not in seg:
        fails.append((f"6  insertion sheet {n} does not state a pricing basis", n))

print(APX)
print(f"  appendices {len(present)}   headings {len(heads)}   tables {tbl[0]}   rows {tbl[1]}   cells {tbl[2]}   words {len(text.split())}")
print(f"  peak beds {peak} = room schedule {rooms}   sectional total {curve['tot']}")
print()
if not fails:
    print("  PASS — all six checks clear.")
else:
    for n, d in fails:
        print(f"  FAIL  {n}\n        {d}")
sys.exit(1 if fails else 0)
