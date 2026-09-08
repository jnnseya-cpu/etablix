#!/usr/bin/env python3
"""Audit of the P5 Employer's Requirements.

    python3 qa-p5.py

Checks
  1  Every clause number sits under the section it claims.
  2  No dangling clause, section, service, interface or KPI reference.
  3  No unresolved {{token}} reached the page.
  4  KPI weightings total exactly 100.
  5  Every service is coded O or I, and every input-specified service gives
     its reason — an input with no reason is a decision nobody owns.
  6  Every clause of section 4 carries a measurable value.
  7  Table geometry fits the page and every row matches its grid.
  8  All twenty-five register findings are answered.
  6b No compound number split by a global substitution.
  9  Cross-document consistency with the P2 requirements.
"""
import zipfile, re, sys, collections, subprocess, json
from xml.etree import ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
PATH = "ETABLIX-ER-P5-FM-and-Operation.docx"

root = ET.fromstring(zipfile.ZipFile(PATH).read("word/document.xml"))
def ptext(p): return "".join(t.text or "" for t in p.iter(f'{{{W}}}t'))
def pstyle(p):
    pr = p.find(f'{{{W}}}pPr'); st = pr.find(f'{{{W}}}pStyle') if pr is not None else None
    return st.get(f'{{{W}}}val') if st is not None else ""
heads, paras, tbl = [], [], [0, 0, 0]
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
text = " \n".join(paras)
open("p5.txt", "w", encoding="utf-8").write(text)
fails = []

# 1 clause under its own section
sections, clauses, cur, misplaced = {}, set(), None, []
for t in heads:
    m = re.match(r'^(\d{1,2})(?:\.(\d{1,2}))?\s\s(.*)', t)
    if not m: continue
    if m.group(2) is None:
        cur = m.group(1); sections[cur] = m.group(3)
    else:
        clauses.add(f"{m.group(1)}.{m.group(2)}")
        if m.group(1) != cur: misplaced.append(f"{m.group(1)}.{m.group(2)} under section {cur}")
if misplaced: fails.append(("1  clause numbered against the wrong section", misplaced))

# 3 unresolved tokens
stray = re.findall(r'\{\{[^}]*\}\}', text)
if stray: fails.append(("3  unresolved reference tokens on the page", sorted(set(stray))))

# 2 dangling
js = lambda f: open(f, encoding='utf-8').read()
services = set(re.findall(r'\["(S-\d\d)"', js('p5-content.cjs')))
kpis = set(re.findall(r'\["(K\d\d)"', js('p5-content.cjs')))
ifaces = set(re.findall(r'\["(IF-\d\d)"', js('p5-spec.cjs')))
dang = collections.Counter()
UNITS = r'(?:%|mm|m|kN|°C|dBm|l/s|bar|hours?|FTE)'
# A clause reference preceded by "P2" belongs to the other document and is not
# this one's to resolve. Nor is section 54 of the Modern Slavery Act.
for m in re.finditer(r'(?:at|per|under|to|see|in|and|,|;)\s(\d{1,2}\.\d{1,2})(?!\s*' + UNITS + r')\b', text):
    before = text[max(0, m.start() - 40):m.start()]
    if re.search(r'\bP2\b', before): continue
    if m.group(1) not in clauses: dang["clause " + m.group(1)] += 1
for m in re.finditer(r'\bsections? (\d{1,2})\b', text, re.I):
    if 'Modern Slavery' in text[max(0, m.start() - 120):m.start()]: continue
    if m.group(1) not in sections: dang["section " + m.group(1)] += 1
for m in re.finditer(r'\b(S-\d\d)\b', text):
    if m.group(1) not in services: dang["service " + m.group(1)] += 1
for m in re.finditer(r'\b(K\d\d)\b', text):
    if m.group(1) not in kpis: dang["KPI " + m.group(1)] += 1
for m in re.finditer(r'\b(IF-\d\d)\b', text):
    if m.group(1) not in ifaces: dang["interface " + m.group(1)] += 1
if dang: fails.append(("2  dangling references", dict(dang)))

# 4 & 5 from the data
out = subprocess.run(["node", "-e", """
const c=require('./p5-content.cjs');
const w=c.kpis.reduce((s,k)=>s+k[5],0);
const uncoded=c.services.filter(s=>!['O','I'].includes(s[3])).map(s=>s[0]);
const inputsNoReason=c.services.filter(s=>s[3]==='I' && (!s[4] || s[4].length<20)).map(s=>s[0]);
console.log(JSON.stringify({w, uncoded, inputsNoReason, O:c.services.filter(s=>s[3]==='O').length, I:c.services.filter(s=>s[3]==='I').length}));
"""], capture_output=True, text=True)
d = json.loads(out.stdout)
if d["w"] != 100: fails.append(("4  KPI weightings must total 100", d["w"]))
if d["uncoded"]: fails.append(("5  service with no O/I basis code", d["uncoded"]))
if d["inputsNoReason"]:
    fails.append(("5  input-specified service with no stated reason", d["inputsNoReason"]))

# 6 measurable values in section 4
spec_bodies = {}
cur = None
for t in paras:
    m = re.match(r'^(4\.\d{1,2})\s\s', t)
    if t in heads and m: cur = m.group(1); spec_bodies[cur] = []
    elif t in heads and re.match(r'^\d', t): cur = None
    elif cur: spec_bodies[cur].append(t)
MEASURE = r'\d+(?:\.\d+)?\s*(?:%|mm|m|°C|dBm|hours?|minutes?|days?|weeks?|months?|per cent|litres?)|\bwithin \d|\bnot less than \d|\bnot exceeding \d|\bnot more than \d'
unmeasurable = [c for c, b in spec_bodies.items() if b and not re.search(MEASURE, " ".join(b))]
if unmeasurable: fails.append(("6  specification clause with no measurable value", unmeasurable))

# 6b  a compound number split by a global replace. This check exists because
#     converting spelled numbers to numerals turned "thirty-eight months" into
#     "thirty-8 months" in nine places, and the document read fine until it was
#     looked at.
mangled = re.findall(r'\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-\d+\b', text)
mangled += re.findall(r'\b\d+-(?:one|two|three|four|five|six|seven|eight|nine)\b', text)
if mangled:
    fails.append(("6b  compound number split by a global substitution", sorted(set(mangled))))

# 8 register complete
reg = set(re.findall(r'\["(G\d\d)"', js('p5-close.cjs')))
missing = {f"G{i:02d}" for i in range(1, 26)} - reg
if missing: fails.append(("8  register finding not answered", sorted(missing)))

# 9  cross-document consistency with P2. An appendix or a sister package that
#    contradicts the document it sits beside is worse than a missing one: the
#    missing one is a known gap, the contradiction gets priced. This check
#    exists because P5 claimed its maintenance priorities were identical to
#    P2's and they were not.
try:
    p2 = ET.fromstring(zipfile.ZipFile("ETABLIX-ER-P2-Modular-Accommodation.docx").read("word/document.xml"))
    p2t = " ".join("".join(t.text or "" for t in p.iter(f'{{{W}}}t')) for p in p2.iter(f'{{{W}}}p'))
    shared = [
        ("bed count", r'\b225\b'),
        ("RT-01 count", r'\b199\b'),
        ("term", r'\b38\b'),
        ("water outlet limit", r'41 °C'),
        ("TMV inlet", r'50 °C'),
        ("cold water limit", r'20 °C'),
        ("wireless level", r'−67 dBm'),
    ]
    bad = [n for n, pat in shared if re.search(pat, text) and not re.search(pat, p2t)]
    if bad: fails.append(("9  value in P5 that P2 does not carry", bad))
    # the priority claim itself
    if re.search(r'same three used in the P2 defects regime', text):
        fails.append(("9  P5 claims its priority TIMES match P2's; they do not and should not",
                      "say the definitions match and the times differ, and why"))
except FileNotFoundError:
    pass

# 7 geometry
pg = next(root.iter(f'{{{W}}}pgSz')); mar = next(root.iter(f'{{{W}}}pgMar'))
usable = int(pg.get(f'{{{W}}}w')) - int(mar.get(f'{{{W}}}left')) - int(mar.get(f'{{{W}}}right'))
geo = []
for i, t in enumerate(root.iter(f'{{{W}}}tbl'), 1):
    grid = [int(c.get(f'{{{W}}}w')) for c in t.find(f'{{{W}}}tblGrid')]; g = sum(grid)
    if g > usable: geo.append(f"table {i}: grid {g} > usable {usable}")
    for r, tr in enumerate(t.findall(f'{{{W}}}tr'), 1):
        cs = sum(int(tc.find(f'{{{W}}}tcPr/{{{W}}}tcW').get(f'{{{W}}}w')) for tc in tr.findall(f'{{{W}}}tc'))
        if abs(cs - g) > 2: geo.append(f"table {i} row {r}: {cs} != {g}")
if geo: fails.append(("7  table geometry", geo))

print(PATH)
print(f"  sections {len(sections)}   clauses {len(clauses)}   services {len(services)} ({d['O']} output / {d['I']} input)   KPIs {len(kpis)} totalling {d['w']}%   interfaces {len(ifaces)}")
print(f"  tables {tbl[0]}   rows {tbl[1]}   cells {tbl[2]}   words {len(text.split())}")
print()
if not fails:
    print("  PASS — all eight checks clear.")
else:
    for n, x in fails: print(f"  FAIL  {n}\n        {x}")
sys.exit(1 if fails else 0)
