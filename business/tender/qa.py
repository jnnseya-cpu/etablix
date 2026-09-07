#!/usr/bin/env python3
"""Quality audit of an Employer's Requirements document, read from the OOXML.

Run:  python3 qa.py ETABLIX-ER-P2-Modular-Accommodation.docx

This is the instrument that found the Rev A faults. It is in the repository so the
same checks run against P1, P3, P4 and P5 before they are issued, rather than after.

Checks
  1  Dangling references   every clause, section, appendix and interface cited must exist.
  2  Orphan targets        every interface and appendix defined must be cited somewhere.
  3  Unmeasurable clauses  a specification clause with no number-and-unit in it is an
                           intention, not a requirement.  This is finding G24.
  4  Prescription          words that name an article rather than a duty, listed against
                           the room data sheet line that uses them.  This is finding G02.
  5  Failure modes         a document that mentions electric locking must say what happens
                           on fire alarm activation.  This is finding G03.
"""
import zipfile, re, sys, collections
from xml.etree import ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
PATH = sys.argv[1] if len(sys.argv) > 1 else "ETABLIX-ER-P2-Modular-Accommodation.docx"

UNITS = r'(?:mm|cm|m|m²|m³|km|kg|kN|kW|W|V|A|bar|Pa|dB|lux|lx|°C|K|l|litre|s|min|h|%|:|×|per)'
ARTICLE_WORDS = ["panel heater", "LED ceiling luminaire", "cushioned vinyl", "vinyl faced plasterboard",
                 "close-coupled", "roller blind", "riser rail", "uPVC", "PVC-U", "Cat 6", "USB-A", "USB-C"]

def load(path):
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(f'{{{W}}}body')
    heads, paras, tbl = [], [], [0, 0, 0]

    def ptext(p):
        return "".join(t.text or "" for t in p.iter(f'{{{W}}}t'))

    def pstyle(p):
        pr = p.find(f'{{{W}}}pPr')
        s = pr.find(f'{{{W}}}pStyle') if pr is not None else None
        return s.get(f'{{{W}}}val') if s is not None else ""

    def walk(el):
        for ch in el:
            tag = ch.tag.split('}')[1]
            if tag == 'p':
                t = ptext(ch)
                paras.append(t)
                if pstyle(ch).startswith('Heading'):
                    heads.append(t)
            elif tag == 'tbl':
                tbl[0] += 1
                for tr in ch.findall(f'{{{W}}}tr'):
                    tbl[1] += 1
                    for tc in tr.findall(f'{{{W}}}tc'):
                        tbl[2] += 1
                        walk(tc)
    walk(body)
    return heads, paras, tbl

heads, paras, tbl = load(PATH)
text = " \n".join(paras)
open("er.txt", "w", encoding="utf-8").write(text)   # plain-text extract, for grepping and diffing revisions

sections, clauses, clause_body = set(), set(), {}
cur = None
for i, t in enumerate(paras):
    m = re.match(r'^(\d{1,2})(?:\.(\d{1,2}))?\s\s', t)
    if t in heads and m:
        if m.group(2):
            cur = m.group(1) + "." + m.group(2)
            clauses.add(cur)
            clause_body[cur] = [t]
        else:
            sections.add(m.group(1))
            cur = None
    elif cur:
        clause_body[cur].append(t)

appx = set(re.findall(r'Appendix (\d{1,2})\s+—', text))
ifs = set(re.findall(r'^\s*\["(IF-\d\d)"', open("er-spec.cjs").read(), re.M))

fails = []

# 1 dangling references
dangling = collections.Counter()
for m in re.finditer(r'(?:at|per|under|to|see|in|and|,|;)\s(\d{1,2}\.\d{1,2})(?!\s*' + UNITS + r')\b', text):
    if m.group(1) not in clauses:
        dangling["clause " + m.group(1)] += 1
for m in re.finditer(r'\bAppendix (\d{1,2})\b', text):
    if m.group(1) not in appx:
        dangling["appendix " + m.group(1)] += 1
for m in re.finditer(r'\b(IF-\d\d)\b', text):
    if m.group(1) not in ifs:
        dangling["interface " + m.group(1)] += 1
for m in re.finditer(r'\bsections? (\d{1,2})\b', text, re.I):
    if m.group(1) not in sections and "Modern Slavery" not in text[max(0, m.start() - 120):m.start()]:
        dangling["section " + m.group(1)] += 1
if dangling:
    fails.append(("1  dangling references", dict(dangling)))

# 2 orphan targets
orphan_if = [i for i in ifs if len(re.findall(r'\b' + i + r'\b', text)) < 2]
orphan_ap = [a for a in appx if len(re.findall(r'\bAppendix ' + a + r'\b', text)) < 2]
if orphan_if or orphan_ap:
    fails.append(("2  targets defined but never cited", {"interfaces": orphan_if, "appendices": orphan_ap}))

# 3 unmeasurable specification clauses
unmeasurable = []
for c, body in clause_body.items():
    if not c.startswith("4."):
        continue
    joined = " ".join(body[1:])
    if not re.search(r'\d+(?:\.\d+)?\s*' + UNITS, joined) and "at 4." not in joined and "at 6" not in joined:
        unmeasurable.append(c + "  " + body[0][:60])
if unmeasurable:
    fails.append(("3  specification clauses with no measurable value", unmeasurable))

# 4 prescription in the room data sheets — scoped to the data sheets themselves, because the
#   body of the document legitimately discusses the fault (13.2) and may legitimately permit an
#   article conditionally (4.3).
rds_text = open("er-content.cjs", encoding="utf-8").read()
found = [w for w in ARTICLE_WORDS if w.lower() in rds_text.lower()]
prescriptive = []
for w in found:
    for m in re.finditer(re.escape(w), rds_text, re.I):
        seg = rds_text[max(0, m.start() - 400):m.start() + 400]
        if "Contractor's design" not in seg and "to the Contractor" not in seg and "permitted only where" not in seg:
            prescriptive.append(w)
            break
if prescriptive:
    fails.append(("4  articles named without a duty alongside", sorted(set(prescriptive))))

# 4b  text mangled by a global substitution — a clause or section reference must not sit
#     inside a product designation.  This check exists because a blind replace of "at 6"
#     turned "Cat 6A" into "Cat section 6A" during the Rev B edit.
mangled = re.findall(r'\b(?:Cat|Class|Grade|Type|Category|BS|EN|ISO)\s+(?:section|Appendix)\s+\d', text)
if mangled:
    fails.append(("4b  reference substituted inside a product designation", sorted(set(mangled))))

# 5 failure modes
if re.search(r'electronic (access control|lock)|magnetic lock|access control', text, re.I):
    if not re.search(r'fail[- ]safe', text, re.I) or not re.search(r'fail[- ]secure', text, re.I):
        fails.append(("5  electric locking with no stated failure mode", "FATAL"))
    elif not re.search(r'fire alarm activation', text, re.I):
        fails.append(("5  failure mode stated but not against fire alarm activation", "FATAL"))

print(f"{PATH}")
print(f"  sections {len(sections)}   clauses {len(clauses)}   appendices {len(appx)}   interfaces {len(ifs)}")
print(f"  tables {tbl[0]}   rows {tbl[1]}   cells {tbl[2]}   words {len(text.split())}")
print()
if not fails:
    print("  PASS — all five checks clear.")
else:
    for name, detail in fails:
        print(f"  FAIL  {name}")
        print(f"        {detail}")
sys.exit(1 if fails else 0)
