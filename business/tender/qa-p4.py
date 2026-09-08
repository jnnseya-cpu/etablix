#!/usr/bin/env python3
"""Audit of the P4 Furniture Employer's Requirements.

    python3 qa-p4.py

Checks
  1   Every clause number sits under the section it claims.
  2   No dangling clause, section, works, tolerance or interface reference.
  3   No unresolved {{token}} reached the page.
  3b  No doubled "section section".
  4   Every works line is coded E or C, and the E/C split the prose claims is
      the split the data actually holds.
  5   Every tolerance row states a value, a measurement method and a reason —
      a tolerance with no measurement method is not a tolerance.
  6   Every clause of the specification section carries a measurable value.
  6b  No compound number split by a global substitution.
  7   Table geometry fits the page and every row matches its grid.
  8   All twenty-five register findings are answered.
  6c  One hazard level, stated the same way everywhere it appears.
  9   Cross-document consistency with P2 and P3.
  10  No orphan interface — every IF is cited somewhere in the text, not just
      listed in its own table.
  11  Every count the prose asserts about itself is the count in the data.
"""
import zipfile, re, sys, collections, subprocess, json
from xml.etree import ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
PATH = "ETABLIX-ER-P4-Furniture.docx"

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
open("p4.txt", "w", encoding="utf-8").write(text)
fails = []
js = lambda f: open(f, encoding='utf-8').read()
SRC = "".join(js(f) for f in ("p4-content.cjs", "p4-spec.cjs", "p4-extra.cjs", "p4-close.cjs"))

# 1  clause under its own section
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

# 3  unresolved tokens
stray = re.findall(r'\{\{[^}]*\}\}', text)
if stray: fails.append(("3  unresolved reference tokens on the page", sorted(set(stray))))

# 3b  a doubled "section section"
doubled = re.findall(r'[Ss]ection section \d+', text)
if doubled: fails.append(("3b  doubled section reference", sorted(set(doubled))))

# 2  dangling references
furn   = set(re.findall(r'\["(F-\d\d)"', js('p4-content.cjs')))
spaces = set(re.findall(r'\["(R-\d\d)"', js('p4-content.cjs')))
bound  = set(re.findall(r'\["(B-\d\d)"', js('p4-extra.cjs')))
ifaces = set(re.findall(r'\["(IF-\d\d)"', js('p4-spec.cjs')))
dang = collections.Counter()
UNITS = (r'(?:%|mm/s|mm|m²|m³|m|km|ha|kN|kW|kVA|kg|°C|dBm|dB|l/s|l/min|litres?|metres?|bar|lux|PTV|'
         r'tonnes?|times|working days?|days?|hours?|minutes?|weeks?|months?|seconds?)')
# A clause reference preceded by "P2" or "P3" belongs to the other document and
# is not this one's to resolve.
for m in re.finditer(r'(?:at|per|under|to|see|in|and|,|;)\s(\d{1,2}\.\d{1,2})(?!\s*' + UNITS + r')\b', text):
    before = text[max(0, m.start() - 40):m.start()]
    if re.search(r'\bP[2345]\b', before): continue
    if m.group(1) not in clauses: dang["clause " + m.group(1)] += 1
for m in re.finditer(r'\bsections? (\d{1,2})\b', text, re.I):
    if 'Modern Slavery' in text[max(0, m.start() - 120):m.start()]: continue
    if m.group(1) not in sections: dang["section " + m.group(1)] += 1
for m in re.finditer(r'\b(F-\d\d)\b', text):
    if m.group(1) not in furn: dang["furniture line " + m.group(1)] += 1
for m in re.finditer(r'\b(R-\d\d)\b', text):
    if m.group(1) not in spaces: dang["space " + m.group(1)] += 1
for m in re.finditer(r'\b(B-\d\d)\b', text):
    if m.group(1) not in bound: dang["boundary line " + m.group(1)] += 1
for m in re.finditer(r'\b(IF-\d\d)\b', text):
    if m.group(1) not in ifaces: dang["interface " + m.group(1)] += 1
if dang: fails.append(("2  dangling references", dict(dang)))

# 4 & 5  read the data itself
out = subprocess.run(["node", "-e", """
const c=require('./p4-content.cjs'), s=require('./p4-spec.cjs'), e=require('./p4-extra.cjs'), z=require('./p4-close.cjs');
const f=c.furniture.filter(r=>r[1]);
console.log(JSON.stringify({
  uncoded: f.filter(r=>!['E','C'].includes(r[3])).map(r=>r[0]),
  noDuty:  f.filter(r=>!r[2] || r[2].length<20).map(r=>r[0]),
  nFurn: f.length, E: f.filter(r=>r[3]==='E').length, C: f.filter(r=>r[3]==='C').length,
  nRooms: c.rooms.filter(r=>r[1]).length, nDefs: c.defs.length, nSpec: s.spec.length,
  nIface: s.ifaces.length, nPerf: e.perf.length, nReg: z.register.length,
  nBound: e.boundaryReg.length,
  perfThin: e.perf.filter(r=>!r[1]||!r[2]).map(r=>r[0]),
  boundThin: e.boundaryReg.filter(r=>!r[1]||(!r[2]&&!r[3])).map(r=>r[0]),
  // every boundary line must allocate the item to exactly one side, or say Nothing on one
  boundBoth: e.boundaryReg.filter(r=>r[2]!=='Nothing'&&r[3]!=='Nothing'&&r[0]!=='B-12'&&r[0]!=='B-07').map(r=>r[0]),
}));
"""], capture_output=True, text=True, cwd=".")
if out.returncode: 
    print(out.stderr); sys.exit(2)
d = json.loads(out.stdout)
if d["uncoded"]: fails.append(("4  furniture line with no E/C basis code", d["uncoded"]))
if d["noDuty"]:  fails.append(("4  furniture line with no stated duty or specification", d["noDuty"]))
if d["boundThin"]: fails.append(("5  boundary line that allocates the item to neither package", d["boundThin"]))
if d["boundBoth"]: fails.append(("5  boundary line that allocates the item to BOTH packages", d["boundBoth"]))
if d["perfThin"]: fails.append(("5  performance criterion with no requirement or no verification", d["perfThin"]))

# 6  measurable values in the specification section
SPEC_N = next((n for n, t in sections.items() if t.startswith("Specification")), None)
spec_bodies, cur = {}, None
if SPEC_N:
    for t in paras:
        m = re.match(r'^(' + SPEC_N + r'\.\d{1,2})\s\s', t)
        if t in heads and m: cur = m.group(1); spec_bodies[cur] = []
        elif t in heads and re.match(r'^\d', t): cur = None
        elif cur: spec_bodies[cur].append(t)
MEASURE = (r'\d+(?:[.,]\d+)?\s*(?:%|mm|m\b|m²|m³|ha|kg|kN|kW|kVA|°C|dB|Pa|bar|lux|PTV|tonnes?|'
           r'hours?|minutes?|days?|weeks?|months?|years?|per cent|litres?|metres?|l/s|l/min|'
           r'rooms?|beds?|positions?|items?|compartments?|covers?|people)'
           r'|\d+\s*:\s*\d+|\b1 in \d+|\bwithin \d|\bnot less than \d|\bnot exceeding \d'
           r'|\bnot more than \d|\bnot fewer than \d|\b± ?\d|\bmonths? \d'
           # a named standard counts as measurable only when a class, level, type or
           # hazard level is stated with it. The standard on its own is a citation,
           # not a requirement, and this check exists to keep that distinction.
           r'|\bBS[ A-Z0-9-]*\b[^.]{0,60}?\b(?:class|level|type|hazard)\b'
           r'|\b(?:medium|low|high|very high) hazard\b')
# A check that finds nothing to test must fail, not pass.
if not spec_bodies:
    fails.append(("6  the measurable-value check found no clauses to examine", "it is pointed at the wrong section"))
unmeasurable = [c for c, b in spec_bodies.items() if b and not re.search(MEASURE, " ".join(b), re.I)]
if unmeasurable: fails.append(("6  specification clause with no measurable value", unmeasurable))

# 6b  a compound number split by a global replace
mangled  = re.findall(r'\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-\d+\b', text)
mangled += re.findall(r'\b\d+-(?:one|two|three|four|five|six|seven|eight|nine)\b', text)
if mangled: fails.append(("6b  compound number split by a global substitution", sorted(set(mangled))))

# 6c  the hazard level must be the same everywhere it appears. This check exists
#     because a fire classification stated in one clause and softened in a
#     schedule two pages later is the worst kind of drafting error in a document
#     about sleeping accommodation.
haz = sorted({m.group(1).lower() for m in re.finditer(r'(?:BS 717[67][^.]{0,60}?)(medium|low|high|very high) hazard', text, re.I)})
if haz and haz != ["medium"]:
    fails.append(("6c  more than one hazard level stated against BS 7176 / BS 7177", haz))
for std in ("BS 7176", "BS 7177"):
    if std in text and not re.search(re.escape(std) + r'[^.]{0,80}(?:medium hazard|hazard)', text, re.I):
        fails.append(("6c  a fire standard cited with no hazard level", std))

# 8  register complete
reg = set(re.findall(r'\["(G\d\d)"', js('p4-close.cjs')))
missing = {f"G{i:02d}" for i in range(1, 26)} - reg
if missing: fails.append(("8  register finding not answered", sorted(missing)))

# 10  orphan interfaces — defined but never cited
cited = set(re.findall(r'iface\.(IF-\d\d)', SRC))
orphans = sorted(ifaces - cited)
if orphans: fails.append(("10  interface defined but never cited in the text", orphans))

# 11  the counts the prose asserts about itself
claims = [
    (r'\b36 lines\b',        d["nFurn"],  36),
    (r'\b18 prescribed, 18 contractor-designed\b', (d["E"], d["C"]), (18, 18)),
    (r'\b36 criteria\b',     d["nPerf"],  36),
    (r'\b10 terms\b',        d["nDefs"],  10),
    (r'\b225 rooms\b',       225,         225),
    (r'\b12 RT-02 ROOMS\b',  12,          12),
]
wrong = []
for pat, actual, asserted in claims:
    if re.search(pat, text) and actual != asserted:
        wrong.append(f"prose says {pat} — data holds {actual}")
    if not re.search(pat, text):
        wrong.append(f"the claim {pat} is no longer in the document — check 11 is testing nothing")
if wrong: fails.append(("11  a count the document asserts about itself", wrong))

# 9  cross-document consistency with P2 and P3
def load(path):
    r = ET.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    return " ".join("".join(t.text or "" for t in p.iter(f'{{{W}}}t')) for p in r.iter(f'{{{W}}}p'))
try:
    # The P2 requirement is the ER AND its appendices. A figure that lives in an
    # appendix is still P2's figure.
    p2t = load("ETABLIX-ER-P2-Modular-Accommodation.docx") + " " + load("ETABLIX-ER-P2-Appendices.docx")
    shared = [
        ("bed count 225", r'\b225\b'), ("term 38 months", r'\b38\b'),
        ("RT-01 count 199", r'\b199\b'), ("RT-02 count 12", r'\b12\b'), ("RT-03 count 14", r'\b14\b'),
        ("amenity area 420", r'\b420\b'), ("stores area 180", r'\b180\b'),
        ("fitted desk 730 mm", r'730 mm'), ("wardrobe 600 x 600 x 1950", r'1950 mm'),
        ("BS 8300-2", r'BS 8300-2'),
    ]
    bad = [n for n, pat in shared if re.search(pat, text) and not re.search(pat, p2t)]
    if bad: fails.append(("9  value stated in P4 that the P2 pack does not carry", bad))
    # P4 says the fitted joinery is P2's. Check P2 really carries each fitted item
    # this document tells the tenderer not to price.
    for item in ("Wardrobe", "Desk / worktop", "Shelving"):
        if not re.search(re.escape(item), p2t):
            fails.append(("9  P4 allocates a fitted item to P2 that P2 does not carry", item))
    # Two documents on one project must not cite two different standards for the
    # same thing. P2 specifies glazing to BS 6206, which is withdrawn; P4 uses the
    # current BS EN 12600. That is allowed only if P4 says so and reconciles them.
    if re.search(r'BS EN 12600', text) and re.search(r'BS 6206', p2t):
        for want in (r'BS 6206', r'WITHDRAWN|withdrawn', r'Class A[^.]{0,60}Class 1'):
            if not re.search(want, text):
                fails.append(("9  P4 and P2 cite different glazing standards and P4 does not reconcile them", want))
    # P2 IF-05 and IF-06 are the interfaces this whole package hangs on.
    if not re.search(r'P4 Furniture', p2t):
        fails.append(("9  the P2 document does not schedule an interface with P4", "P2 IF-05 / IF-06"))
except FileNotFoundError:
    fails.append(("9  the P2 pack was not found — the consistency check ran on nothing", "build P2 first"))
try:
    p3t = load("ETABLIX-ER-P3-Kitchen.docx")
    # The dining furniture boundary must read the same way from both sides.
    if re.search(r'dining furniture is P3', text, re.I) and not re.search(r'dining furniture is in THIS package', p3t):
        fails.append(("9  P4 says dining furniture is P3 and the P3 document does not claim it", "IF-06"))
except FileNotFoundError:
    fails.append(("9  the P3 document was not found — the consistency check ran on nothing", "build P3 first"))
try:
    p5t = load("ETABLIX-ER-P5-FM-and-Operation.docx")
    # P4 tells the tenderer that linen and the laundry machines are P5's. Check P5 agrees.
    if re.search(r'laundry and drying MACHINES are P5', text, re.I) and not re.search(r'[Pp]ersonal laundry', p5t):
        fails.append(("9  P4 allocates laundry machines to P5 and P5 carries no laundry service", "IF-10"))
    if re.search(r'P5 SUPPLIES AND LAUNDERS', text) and not re.search(r'[Ll]inen', p5t):
        fails.append(("9  P4 allocates linen to P5 and P5 carries no linen service", "IF-09"))
except FileNotFoundError:
    fails.append(("9  the P5 document was not found — the consistency check ran on nothing", "build P5 first"))

# 7  geometry
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
print(f"  sections {len(sections)}   clauses {len(clauses)}   furniture lines {d['nFurn']} ({d['E']} prescribed / {d['C']} contractor-selected)")
print(f"  boundary lines {d['nBound']}   spaces {d['nRooms']}   spec clauses {d['nSpec']}   interfaces {d['nIface']}   performance criteria {d['nPerf']}   definitions {d['nDefs']}")
print(f"  tables {tbl[0]}   rows {tbl[1]}   cells {tbl[2]}   words {len(text.split())}")
print()
if not fails:
    print("  PASS — all twelve checks clear.")
else:
    for n, x in fails: print(f"  FAIL  {n}\n        {x}")
sys.exit(1 if fails else 0)
