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
