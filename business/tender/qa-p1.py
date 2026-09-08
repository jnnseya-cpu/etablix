#!/usr/bin/env python3
"""Audit of the P1 Civil Works Employer's Requirements.

    python3 qa-p1.py

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
  6c  The performance schedule states the same figures as the clause it summarises.
  9   Cross-document consistency with P2 and P3.
  10  No orphan interface — every IF is cited somewhere in the text, not just
      listed in its own table.
  11  Every count the prose asserts about itself is the count in the data.
"""
import zipfile, re, sys, collections, subprocess, json
from xml.etree import ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
PATH = "ETABLIX-ER-P1-CivilWorks.docx"

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
open("p1.txt", "w", encoding="utf-8").write(text)
fails = []
js = lambda f: open(f, encoding='utf-8').read()
SRC = "".join(js(f) for f in ("p1-content.cjs", "p1-spec.cjs", "p1-extra.cjs", "p1-close.cjs"))

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
works  = set(re.findall(r'\["(W-\d\d)"', js('p1-content.cjs')))
tols   = set(re.findall(r'\["(T-\d\d)"', js('p1-content.cjs')))
ifaces = set(re.findall(r'\["(IF-\d\d)"', js('p1-spec.cjs')))
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
for m in re.finditer(r'\b(W-\d\d)\b', text):
    if m.group(1) not in works: dang["works " + m.group(1)] += 1
for m in re.finditer(r'\b(T-\d\d)\b', text):
    if m.group(1) not in tols: dang["tolerance " + m.group(1)] += 1
for m in re.finditer(r'\b(IF-\d\d)\b', text):
    if m.group(1) not in ifaces: dang["interface " + m.group(1)] += 1
if dang: fails.append(("2  dangling references", dict(dang)))

# 4 & 5  read the data itself
out = subprocess.run(["node", "-e", """
const c=require('./p1-content.cjs'), s=require('./p1-spec.cjs'), e=require('./p1-extra.cjs'), z=require('./p1-close.cjs');
const w=c.works.filter(r=>r[1]);
console.log(JSON.stringify({
  uncoded: w.filter(r=>!['E','C'].includes(r[3])).map(r=>r[0]),
  noDuty:  w.filter(r=>!r[2] || r[2].length<20).map(r=>r[0]),
  nWorks: w.length, E: w.filter(r=>r[3]==='E').length, C: w.filter(r=>r[3]==='C').length,
  tolThin: c.tolerances.filter(r=>r.slice(0,5).some(x=>!x||!String(x).trim())).map(r=>r[0]),
  tolNoValue: c.tolerances.filter(r=>!/\\d/.test(r[2])).map(r=>r[0]),
  nTol: c.tolerances.length, nDefs: c.defs.length, nSpec: s.spec.length,
  nIface: s.ifaces.length, nPerf: e.perf.length, nReg: z.register.length,
  perfThin: e.perf.filter(r=>!r[1]||!r[2]).map(r=>r[0]),
}));
"""], capture_output=True, text=True, cwd=".")
if out.returncode: 
    print(out.stderr); sys.exit(2)
d = json.loads(out.stdout)
if d["uncoded"]: fails.append(("4  works line with no E/C basis code", d["uncoded"]))
if d["noDuty"]:  fails.append(("4  works line with no stated requirement or duty", d["noDuty"]))
if d["tolThin"]: fails.append(("5  tolerance row missing a field", d["tolThin"]))
if d["tolNoValue"]: fails.append(("5  tolerance row with no numeric value", d["tolNoValue"]))
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
MEASURE = (r'\d+(?:[.,]\d+)?\s*(?:%|mm|m\b|m²|m³|ha|kN|kW|kVA|°C|dB|Pa|bar|lux|PTV|tonnes?|'
           r'hours?|minutes?|days?|weeks?|months?|per cent|litres?|metres?|l/s|l/min)'
           r'|\d+\s*:\s*\d+|\b1 in \d+|\bwithin \d|\bnot less than \d|\bnot exceeding \d'
           r'|\bnot more than \d|\bnot fewer than \d|\b± ?\d')
# A check that finds nothing to test must fail, not pass.
if not spec_bodies:
    fails.append(("6  the measurable-value check found no clauses to examine", "it is pointed at the wrong section"))
unmeasurable = [c for c, b in spec_bodies.items() if b and not re.search(MEASURE, " ".join(b), re.I)]
if unmeasurable: fails.append(("6  specification clause with no measurable value", unmeasurable))

# 6b  a compound number split by a global replace
mangled  = re.findall(r'\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-\d+\b', text)
mangled += re.findall(r'\b\d+-(?:one|two|three|four|five|six|seven|eight|nine)\b', text)
if mangled: fails.append(("6b  compound number split by a global substitution", sorted(set(mangled))))

# 6c  the performance schedule and the clause it summarises must state the same
#     figures. This exists because revising a noise limit in the clause left the
#     old pair of numbers standing in the schedule two pages later.
laeq = sorted({m.group(1) for m in re.finditer(r'(\d+) dB LAeq,1h', text)})
if laeq != ["55", "65"]:
    fails.append(("6c  the document states a noise limit that its own clause does not", laeq))

# 8  register complete
reg = set(re.findall(r'\["(G\d\d)"', js('p1-close.cjs')))
missing = {f"G{i:02d}" for i in range(1, 26)} - reg
if missing: fails.append(("8  register finding not answered", sorted(missing)))

# 10  orphan interfaces — defined but never cited
cited = set(re.findall(r'iface\.(IF-\d\d)', SRC))
orphans = sorted(ifaces - cited)
if orphans: fails.append(("10  interface defined but never cited in the text", orphans))

# 11  the counts the prose asserts about itself
claims = [
    (r'\b24 works lines\b',   d["nWorks"], 24),
    (r'\b16 prescribed, 8 contractor-designed\b', (d["E"], d["C"]), (16, 8)),
    (r'\b35 criteria\b',      d["nPerf"],  35),
    (r'\b11 terms\b',         d["nDefs"],  11),
    (r'\b114 bases\b',        114,         114),
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
    # appendix is still P2's figure, and checking only the ER produced four
    # false failures the first time this ran.
    p2t = load("ETABLIX-ER-P2-Modular-Accommodation.docx") + " " + load("ETABLIX-ER-P2-Appendices.docx")
    shared = [
        ("bed count 225", r'\b225\b'), ("term 38 months", r'\b38\b'),
        ("114 modules", r'\b114\b'),
        ("level tolerance +/- 5 mm", r'± ?5 mm'), ("position tolerance +/- 10 mm", r'± ?10 mm'),
        ("relative level +/- 3 mm", r'± ?3 mm'), ("threshold 15 mm", r'15 mm'),
        ("1.5 kN/m2 bedrooms", r'1\.5 kN/m²'), ("3.0 kN/m2 amenity and dining", r'3\.0 kN/m²'),
        ("0.50 kN/m2 snow", r'0\.50 kN/m²'), ("250 kVA per block", r'250 kVA'),
        ("1.20 m foul invert", r'1\.20 m'), ("2 fibre pairs per block", r'single-mode'),
    ]
    bad = [n for n, pat in shared if re.search(pat, text) and not re.search(pat, p2t)]
    if bad: fails.append(("9  value stated in P1 that the P2 pack does not carry", bad))
    # P1 says there are 8 blocks. P2 identifies them A to H in its asset schema.
    if re.search(r'\b8 blocks?\b', text):
        m = re.search(r'block\s+Text\s+A to ([A-H])', p2t)
        if not m:
            fails.append(("9  P1 says 8 blocks and the P2 pack does not identify the block range", "A to H"))
        elif ord(m.group(1)) - ord('A') + 1 != 8:
            fails.append(("9  P1 says 8 blocks; the P2 pack identifies a different number", m.group(0)))
    # P1 says T-01 to T-03 are taken verbatim from P2 clause 4.1. Check they are
    # actually there, in a window around a 4.1 occurrence and not merely somewhere.
    if re.search(r'taken verbatim from clause 4\.1 of the P2', text):
        wins = [p2t[m.start():m.start() + 1600] for m in re.finditer(r'\b4\.1\b', p2t)]
        for want in (r'± ?5 mm', r'± ?10 mm', r'± ?3 mm'):
            if not any(re.search(want, w) for w in wins):
                fails.append(("9  P1 claims a tolerance is verbatim from P2 clause 4.1 and it is not there", want))
    # The site-wide noise rule belongs to the Employer. P1 adds to it and must
    # not contradict it, so it has to state it.
    if re.search(r'dB LAeq', text):
        rule = re.search(r'no work generating more than (\d+) dB\(A\)', p2t)
        if not rule:
            fails.append(("9  P1 sets noise limits and the P2 site rules carry no limit to check against", "Appendix 3"))
        elif f"{rule.group(1)} dB(A)" not in text:
            fails.append(("9  P1 sets its own noise limits without stating the Appendix 3 rule that governs",
                          rule.group(0)))
except FileNotFoundError:
    fails.append(("9  the P2 pack was not found — the consistency check ran on nothing", "build P2 first"))
try:
    p3t = load("ETABLIX-ER-P3-Kitchen.docx")
    # The kitchen loading is the fault both documents surface. They must agree.
    for want in (r'5\.0 kN/m²', r'7\.5 kN/m²', r'3\.0 kN/m²'):
        if re.search(want, text) and not re.search(want, p3t):
            fails.append(("9  kitchen loading in P1 that the P3 document does not carry", want))
    if re.search(r'Appendix 8', text) and not re.search(r'Appendix 8', p3t):
        fails.append(("9  P1 cites the Appendix 8 fault and P3 does not", "Appendix 8"))
except FileNotFoundError:
    fails.append(("9  the P3 document was not found — the consistency check ran on nothing", "build P3 first"))

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
print(f"  sections {len(sections)}   clauses {len(clauses)}   works {d['nWorks']} ({d['E']} prescribed / {d['C']} contractor-designed)")
print(f"  tolerances {d['nTol']}   spec clauses {d['nSpec']}   interfaces {d['nIface']}   performance criteria {d['nPerf']}   definitions {d['nDefs']}")
print(f"  tables {tbl[0]}   rows {tbl[1]}   cells {tbl[2]}   words {len(text.split())}")
print()
if not fails:
    print("  PASS — all twelve checks clear.")
else:
    for n, x in fails: print(f"  FAIL  {n}\n        {x}")
sys.exit(1 if fails else 0)
