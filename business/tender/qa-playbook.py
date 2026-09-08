#!/usr/bin/env python3
"""Reference audit of the consolidation playbook, read from the OOXML.

    python3 qa-playbook.py

Checks
  1  Every clause number sits under the section it claims.   <- the Rev A fault
  2  No dangling clause, section, E-, T- or I- reference.
  3  No unresolved {{token}} reached the page.
  4  Every defined anchor (E1-E4, T01-T18, I-01-I-10) is cited somewhere.
  5  Table geometry fits the page and every row matches its grid.
  6  The document's own arithmetic: each interface owned by exactly two packages,
     each trap closed by a step of the programme.
"""
import zipfile, re, sys, collections
from xml.etree import ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
PATH = sys.argv[1] if len(sys.argv) > 1 else "ETABLIX-Procurement-and-Consolidation-Playbook.docx"

z = zipfile.ZipFile(PATH)
root = ET.fromstring(z.read("word/document.xml"))
body = root.find(f'{{{W}}}body')

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
            if pstyle(ch).startswith('Heading'): heads.append((pstyle(ch), t))
        elif tag == 'tbl':
            tbl[0] += 1
            for tr in ch.findall(f'{{{W}}}tr'):
                tbl[1] += 1
                for tc in tr.findall(f'{{{W}}}tc'):
                    tbl[2] += 1; walk(tc)
walk(body)
text = " \n".join(paras)
open("playbook.txt", "w", encoding="utf-8").write(text)

fails = []

# 1  clause numbers must sit under their own section
sections, clauses, current, misplaced = {}, set(), None, []
for style, t in heads:
    m = re.match(r'^(\d{1,2})(?:\.(\d{1,2}))?\s\s(.*)', t)
    if not m: continue
    if m.group(2) is None:
        current = m.group(1); sections[current] = m.group(3)
    else:
        clauses.add(f"{m.group(1)}.{m.group(2)}")
        if m.group(1) != current:
            misplaced.append(f"{m.group(1)}.{m.group(2)} sits under section {current}")
if misplaced:
    fails.append(("1  clause numbered against the wrong section", misplaced))

# 3  unresolved tokens
stray = re.findall(r'\{\{[^}]*\}\}', text)
if stray: fails.append(("3  unresolved reference tokens on the page", sorted(set(stray))))

# 2  dangling references
E = set(re.findall(r'\b(E[1-4])\b', text))
Tt = set(re.findall(r'\b(T\d\d)\b', text))
It = set(re.findall(r'\b(I-\d\d)\b', text))
defined_E = {f"E{i}" for i in range(1, 5)}
defined_T = set(re.findall(r'\["(T\d\d)"', open('playbook-consolidation.cjs', encoding='utf-8').read()))
defined_I = set(re.findall(r'\["(I-\d\d)"', open('playbook-content.cjs', encoding='utf-8').read()))
dangling = collections.Counter()
UNITS = r'(?:%|per cent|mm|kN)'
for m in re.finditer(r'(?:at|per|under|to|see|in|and|,|;)\s(\d{1,2}\.\d{1,2})(?!\s*' + UNITS + r')\b', text):
    if m.group(1) not in clauses: dangling["clause " + m.group(1)] += 1
for m in re.finditer(r'\bsections? (\d{1,2})\b', text, re.I):
    if m.group(1) not in sections: dangling["section " + m.group(1)] += 1
for x in E - defined_E: dangling["enabling clause " + x] += 1
for x in Tt - defined_T: dangling["trap " + x] += 1
for x in It - defined_I: dangling["interface " + x] += 1
if dangling: fails.append(("2  dangling references", dict(dangling)))

# 4  anchors defined but never cited (a trap nothing points at is not part of the argument)
orphan = ([x for x in defined_T if len(re.findall(r'\b' + x + r'\b', text)) < 2]
          + [x for x in defined_I if len(re.findall(r'\b' + x + r'\b', text)) < 2]
          + [x for x in defined_E if len(re.findall(r'\b' + x + r'\b', text)) < 2])
if orphan: fails.append(("4  anchors defined but never cited", sorted(orphan)))

# 6  the document's own arithmetic: an interface belongs to exactly two packages,
#    and every trap is closed by exactly one step of the programme. Both are
#    claims the document makes in print, so both are checked rather than trusted.
pkg_src = open('playbook-content.cjs', encoding='utf-8').read()
owners = collections.Counter()
for row in re.findall(r'"(I-\d\d(?:, I-\d\d)*)"\],', pkg_src):
    for ref in row.split(", "): owners[ref] += 1
wrong = {k: v for k, v in owners.items() if v != 2}
missing = defined_I - set(owners)
if wrong or missing:
    fails.append(("6  an interface must belong to exactly two packages",
                  {"wrong count": wrong, "owned by nobody": sorted(missing)}))
prog_src = open('playbook-consolidation.cjs', encoding='utf-8').read()
closed = set()
for row in re.findall(r'"(T\d\d(?:, T\d\d)*)"\],', prog_src):
    closed.update(row.split(", "))
if defined_T - closed:
    fails.append(("6  every trap must be closed by a step of the programme", sorted(defined_T - closed)))

# 5  geometry
pg = next(root.iter(f'{{{W}}}pgSz')); mar = next(root.iter(f'{{{W}}}pgMar'))
usable = int(pg.get(f'{{{W}}}w')) - int(mar.get(f'{{{W}}}left')) - int(mar.get(f'{{{W}}}right'))
geo = []
for i, t in enumerate(root.iter(f'{{{W}}}tbl'), 1):
    grid = [int(c.get(f'{{{W}}}w')) for c in t.find(f'{{{W}}}tblGrid')]; g = sum(grid)
    if g > usable: geo.append(f"table {i}: grid {g} exceeds usable {usable}")
    for r, tr in enumerate(t.findall(f'{{{W}}}tr'), 1):
        cs = sum(int(tc.find(f'{{{W}}}tcPr/{{{W}}}tcW').get(f'{{{W}}}w')) for tc in tr.findall(f'{{{W}}}tc'))
        if abs(cs - g) > 2: geo.append(f"table {i} row {r}: cells {cs} != grid {g}")
if geo: fails.append(("5  table geometry", geo))

print(f"{PATH}")
print(f"  sections {len(sections)}   clauses {len(clauses)}   enabling {len(defined_E)}   traps {len(defined_T)}   interfaces {len(defined_I)}")
print(f"  tables {tbl[0]}   rows {tbl[1]}   cells {tbl[2]}   words {len(text.split())}")
print()
if not fails:
    print("  PASS — all five checks clear.")
else:
    for name, detail in fails:
        print(f"  FAIL  {name}")
        print(f"        {detail}")
sys.exit(1 if fails else 0)
