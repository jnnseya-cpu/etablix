#!/usr/bin/env python3
"""Audit of the NORTHREACH diagnostic test pack.

    python3 verify-pack.py

The pack is the test. If the pack is wrong the grade is meaningless, so it
gets the same treatment as the tender documents.

Checks
  0  The zip exists and is not older than the folder it was built from. It is
     generated, not tracked, so a stale zip is the easiest regression there is.
  1  The zip and the unpacked folder hold the same client files.
  2  THE ANSWER KEY IS NOT IN THE ZIP. It shipped inside the pack the tester
     is told to unzip and upload, which would have handed the agent all 33
     answers and made the whole exercise worthless.
  3  Every client document in the pack has a home on the TEST-SCRIPT
     checklist. An orphaned document is one the tester never uploads, and
     the findings that depend on it become unfindable.
  4  Every file the TEST-SCRIPT names actually exists.
  5  The headless e2e uploads the same set the TEST-SCRIPT does — the
     automated test and the human test must not diverge.
  6  Every extension in the pack is accepted by the upload gate.
  7  The counts the pack asserts about itself are the counts in the pack.
"""
import re, sys, zipfile, os, io, json

PACK, ZIP = "northreach", "NORTHREACH-diagnostic-pack.zip"
KEY  = "SCORING-KEY.md"   # deliberately OUTSIDE the pack — see check 2
E2E  = "../backend/test/circle.e2e.mjs"
UPL  = "../backend/lib/uploads.js"
fails = []
rd = lambda p: io.open(p, encoding="utf-8").read()

# the pack's own files, split into what a client would send and what it would not
walk = [os.path.join(r, f) for r, _, fs in os.walk(PACK) for f in fs]
rel  = sorted(p[len(PACK) + 1:].replace(os.sep, "/") for p in walk)
NOT_CLIENT = {"README.md", "_grading/SCORING-KEY.md", "00-client-covering-brief.md"}
client = [r for r in rel if r not in NOT_CLIENT]

# 0  the zip exists and is not stale
if not os.path.exists(ZIP):
    print(f"{ZIP} does not exist. Run ./build-pack.sh")
    sys.exit(1)
newest = max(os.path.getmtime(p) for p in walk)
if os.path.getmtime(ZIP) < newest - 1:
    fails.append(("0  the zip is older than the folder it is built from — rebuild it",
                  "./build-pack.sh"))

# 1  zip vs folder
z = zipfile.ZipFile(ZIP)
zrel = sorted(n[len(PACK) + 1:] for n in z.namelist() if n.startswith(PACK + "/") and not n.endswith("/"))
if zrel != rel:
    fails.append(("1  the zip and the folder differ",
                  {"only in folder": sorted(set(rel) - set(zrel)), "only in zip": sorted(set(zrel) - set(rel))}))

# 2  the answer key must not be in the zip
leaked = [n for n in z.namelist() if "_grading" in n or "SCORING-KEY" in n.upper()]
if leaked:
    fails.append(("2  THE ANSWER KEY IS INSIDE THE ZIP THE TESTER UPLOADS", leaked))

# 3 & 4  the TEST-SCRIPT mapping
script = rd("TEST-SCRIPT.md")
table = [l for l in script.split("\n") if l.startswith("|") and "|" in l[1:]]
named, globs = set(), []
for line in table:
    cells = [c.strip() for c in line.strip("|").split("|")]
    if len(cells) < 2 or cells[0].startswith("-") or cells[0] == "Checklist line":
        continue
    for tok in re.findall(r'`([^`]+)`', cells[1]):
        tok = tok.rstrip("…").strip()
        if "*" in tok:
            globs.append(tok)
        else:
            named.add(tok)

def covered(f):
    if f in named:
        return True
    for g in globs:                       # programme/*-gantt.pdf, registers/*.xlsx
        pat = "^" + re.escape(g).replace(r"\*", "[^/]*") + "$"
        if re.match(pat, f):
            return True
    for n in named:                       # inputs/05-… written as a prefix
        if n.endswith("-") and f.startswith(n):
            return True
        if f.startswith(n) and n.count("/") == f.count("/"):
            return True
    # "the remaining annexes/ files" and "both files in drawings/"
    if f.startswith("annexes/") and re.search(r'remaining\s+`?annexes', script):
        return True
    if f.startswith("drawings/") and re.search(r'both files in\s+`?drawings', script):
        return True
    return False

orphans = [f for f in client if not covered(f)]
if orphans:
    hits = []
    if os.path.exists(KEY):
        key = rd(KEY)
        rows = [l for l in key.split("\n") if re.match(r'^\|\s*\d+\s*\|', l)]
        for f in orphans:
            m = re.search(r'inputs/(\d\d)', f)
            if not m:
                continue
            n = m.group(1)
            deps = [l.strip("|").split("|")[0].strip() for l in rows
                    if re.search(r'\b' + n + r'\b', l.strip("|").split("|")[-1])]
            if deps:
                hits.append(f"{f} — {len(deps)} planted findings depend on it: {','.join(deps)}")
    fails.append(("3  a client document the TEST-SCRIPT never tells the tester to upload",
                  orphans + hits))

missing = sorted(n for n in named if "/" in n and not n.endswith("-")
                 and not os.path.exists(os.path.join(PACK, n)) and "…" not in n)
if missing:
    fails.append(("4  the TEST-SCRIPT names a file that is not in the pack", missing))

# 5  the headless e2e must upload the same set
e2e = rd(E2E)
e2e_files = set(re.findall(r'"((?:inputs|annexes|drawings|programme|registers)/[^"]+)"', e2e))
if e2e_files:
    only_e2e = sorted(e2e_files - set(client))
    only_pack = sorted(set(client) - e2e_files)
    if only_e2e:
        fails.append(("5  the e2e uploads a file that is not in the pack", only_e2e))
    if only_pack:
        fails.append(("5  the e2e does not upload a client document the pack contains", only_pack))

# 6  the upload gate accepts every extension in the pack
gate = rd(UPL)
allowed = set(re.findall(r'"(\.[a-z0-9]+)"', gate[gate.index("ALLOWED_EXT"):]))
exts = sorted({os.path.splitext(f)[1].lower() for f in client})
blocked = [e for e in exts if e not in allowed]
if blocked:
    fails.append(("6  the upload gate rejects a file type the pack contains", blocked))

# 7  the counts the pack asserts about itself
if os.path.exists(KEY):
    key = rd(KEY)
    planted = len([l for l in key.split("\n") if re.match(r'^\|\s*\d+\s*\|', l)])
    for name, text in (("the scoring key", key), ("the pack README", rd(os.path.join(PACK, "README.md"))),
                       ("TEST-SCRIPT", script)):
        m = re.search(r'(\d+|[Tt]hirty-three)\s+planted findings', text)
        if m:
            said = 33 if m.group(1).lower() == "thirty-three" else int(m.group(1))
            if said != planted:
                fails.append((f"7  {name} says {said} planted findings; the key holds {planted}", planted))
    WORDS = {"seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
             "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20}
    rm = re.search(r'([A-Za-z]+|\d+) documents instead of eight', rd(os.path.join(PACK, "README.md")))
    if rm:
        tok = rm.group(1).lower()
        said = WORDS.get(tok, int(tok) if tok.isdigit() else None)
        if said != len(client):
            fails.append((f"7  the pack README says {rm.group(1)} documents; the pack holds {len(client)}", len(client)))

print(f"{ZIP} and {PACK}/")
print(f"  client documents {len(client)}   in the zip {len(zrel)}   file types {' '.join(exts)}")
print(f"  planted findings {planted if os.path.exists(KEY) else '?'}   e2e uploads {len(e2e_files)}")
print()
if not fails:
    print("  PASS — all eight checks clear.")
else:
    for n, x in fails:
        print(f"  FAIL  {n}\n        {x}")
sys.exit(1 if fails else 0)
