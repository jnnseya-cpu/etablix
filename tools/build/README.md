# Village plan — how the workbook is built

`village-plan.xlsx` is generated, not hand-edited. Run the scripts in order from a
directory containing `styles.py`; each one loads the workbook, adds sheets, and saves.

    python3 build1.py    # ReadMe
    python3 build2.py    # Assumptions — 79 drivers, writes assump_rows.json
    python3 build3.py    # Teams + Workforce curve, writes layout.json
    python3 build4.py    # BedDemand, writes bd.json
    python3 fix4.py      # replaces two array formulas with a helper row
    python3 build5b.py   # Accommodation + Facilities, writes sched.json
    python3 build6.py    # Utilities, Transport, VillageStaff
    python3 build7.py    # BuildProgramme, Capex, Opex, writes cost.json
    python3 build8.py    # CostSummary, Compliance, Risks, Mobilisation
    python3 <skill>/scripts/recalc.py village-plan.xlsx 900

`teams.py` is the design check: it reproduces the workforce curve in Python so the
peak can be tuned before a single cell is written. The workbook's formulas must
agree with it — if they diverge, the formulas are wrong, not the design.

**Why the row keys.** build5b replaced an earlier version that used hand-written cell
references. Two of them were off by one, which recalculates perfectly and produces the
wrong dining room. Every schedule row now registers a key and formulas reference the
key, so a row inserted anywhere cannot silently break the sheet below it.

## Verifying it

**LibreOffice cannot recalculate in this environment.** `recalc.py` times out even on a
101-formula test workbook and reports `failed to launch javaldx`. That is the runtime,
not this file. So the workbook ships verified two other ways, both committed here:

    python3 audit.py       # resolves every cross-sheet reference to the LABEL it lands on
    python3 recompute.py   # re-implements the model in Python from the workbook's own inputs

`audit.py` is the more valuable of the two and would be worth running even if recalc
worked: a formula can evaluate perfectly and point at the wrong row. It reports zero
unknown sheets, zero unsupported functions, and every anchored reference resolving to the
label it should.

`recompute.py` reads the Assumptions and Teams values out of the workbook and recomputes
the whole chain independently. It caught three real errors that a clean recalculation
would have reported as perfectly valid numbers:

- external space per bed at 22 m² gave a total site of 0.75 ha for 225 rooms, which
  cannot physically hold the roads, parking and standoff. Now 45 m², giving 1.27 ha.
- demobilisation was 18% applied to everything including design fees. Now 10% of the
  physical packages P1–P4 only — you do not demobilise a design fee.
- the residents-per-FTE sanity band said 8–12 and the model produces 5.7. The band was
  wrong, not the staffing: a village with 24/7 security and its own buses runs richer
  than a hotel. The guidance now says 5–8 and names the two inputs that dominate it.

**Excel recalculates the whole book on open.** Do that first, and check the peak on
Workforce still reads 304 at month 24 — that is the number teams.py was designed to.
