# Employer's Requirements — P2 Modular Accommodation

    node build-er.cjs          # builds the ER from er-content.cjs, er-spec.cjs, er-revb.cjs
    node build-gaps.cjs        # builds the gap register from gap-register.cjs
    python3 qa.py              # audits the built .docx and writes er.txt

Content is separated from layout so the specification can be edited without
touching the document code, and reused for the other four packages.

| File | What it is |
|---|---|
| `ETABLIX-ER-P2-Modular-Accommodation.docx` | The Employer's Requirements, Rev B |
| `ETABLIX-ER-P2-preview.pdf` | Same document as a PDF, for reading without Word |
| `ETABLIX-ER-P2-gap-register.docx` | The 25 findings against Rev A |
| `qa.py` | The audit that found them. Run it on the other four packages before issuing |

## Rev B

Rev A was reviewed against the twenty-five questions this business applies to
anybody's Employer's Requirements, and failed three of them fatally. Rev B
implements all twenty-five. Annex A of the document maps each finding to the
clause that answers it.

The three fatal findings, and what Rev B does about them:

- **G01 — no design responsibility matrix, no Contractor's Proposals mechanism.**
  Rev A said what to build and never said who designs it. Every competent
  tenderer would have returned a qualified offer, and qualified offers cannot be
  compared — which defeats the evaluation model issued alongside it. Rev B adds
  section 13: a thirty-one row matrix coding every element ED, CD or CF, the
  Contractor's Proposals and Schedule of Departures, the submission and review
  procedure with status codes and the rule that review transfers nothing, and
  the design liability, PI insurance and collateral warranty requirements.
- **G02 — prescriptive and performance specification mixed line by line.**
  Rev A specified a 1.0 kW panel heater. If the room is cold, the Employer
  specified the heater and the Employer owns the problem. Rev B gives every room
  data sheet line a basis code — E for Employer-prescribed, C for
  Contractor-designed — and converts twenty-two lines from an article to a duty.
  The heater became "21 °C dry resultant at −4 °C external, and 12 °C to 21 °C
  within 90 minutes".
- **G03 — electric locks on bedroom doors in sleeping accommodation, with no
  stated failure mode on fire alarm.** Rev B states two failure modes, because
  they are different doors: bedroom doors **fail-secure**, egress being
  mechanical, single-action and independent of power, with fire service access
  by override key agreed in writing with the fire and rescue service; escape
  route doors **fail-safe** to BS 7273-4 Type A. Both appear in the room data
  sheet, in 4.18, and as a witnessed line in the sample room checklist.

Sections 14 to 19 are also new — site constraints and security, information
requirements and asset data, sustainability and social value, change control,
delay and liquidated damages, and defects and obsolescence. Section 4 gains
clauses 4.21 to 4.27 and rewrites 4.14, 4.17, 4.18, 4.19 and 4.20.

Rev A's clause numbers are unchanged, so correspondence citing one still lands
on the same clause. Only the appendices moved, from section 13 to section 20.

5,065 words at Rev A. 20,507 at Rev B, in 15 tables and 1,157 cells.

## The audit is the reusable part

`qa.py` reads the OOXML of the built document and runs five checks:

1. **Dangling references** — every clause, section, appendix and interface cited
   must exist.
2. **Orphan targets** — every interface and appendix defined must be cited.
3. **Unmeasurable clauses** — a specification clause with no number-and-unit in
   it is an intention, not a requirement. This is finding G24.
4. **Prescription** — words naming an article rather than a duty, in the room
   data sheets. This is finding G02. Plus a guard against a reference being
   substituted inside a product designation, added after a blind replace of
   "at 6" turned "Cat 6A" into "Cat section 6A" during the Rev B edit.
5. **Failure modes** — a document mentioning electric locking must state what
   happens on fire alarm activation. This is finding G03, and it fails FATAL.

It found three real faults in Rev B after Rev B was written: three interfaces
defined and never cited, two clauses with no measurable value in them (4.17
lightning protection and 4.19 CCTV), and a riser rail named where a duty
belonged. All three are fixed. It now passes.

Run it on P1, P3, P4 and P5 before they are issued rather than after.

## What this still is not

**One package of five.** A full tender pack is five of these plus the ITT, the
pricing schedules and the drawings. This is a fifth of a pack.

**The appendices are named, not written.** Twelve are listed at section 20 and
none exists. Appendices 10, 11 and 12 are new at Rev B and the document says
explicitly what a tenderer should price on until they are issued.

**Not opened in Word.** LibreOffice cannot load a .docx in this environment, so
the file is verified structurally instead: the OOXML is parsed, every table's
column grid checked against the usable page width and every row's cell widths
checked against its grid (15 tables, zero faults), and the document rendered to
HTML and to a 48-page PDF and read. Open it in Word and check the table
pagination before it goes to a supplier.

**The values are a competent employer's starting position, not a design.** The
acoustic, thermal, air permeability and lighting figures are requirements.
Compliance with statute is the contractor's duty and is not discharged by
meeting them.

## Procurement strategy and the five-to-one consolidation playbook

    node build-playbook.cjs                              # the document
    python3 qa-playbook.py                               # audits it
    python3 ../../tools/build-consolidation-model.py     # the companion model
    python3 ../../tools/recompute-consolidation.py       # checks every formula in it

`ETABLIX-Procurement-and-Consolidation-Playbook.docx` — 10,300 words, 14 tables,
554 cells, 24 pages. `tools/consolidation-model.xlsx` — 7 sheets, 59 live
formulas.

**The claim.** Letting five packages and then consolidating them under one prime
is a strategy, not a rescue — if four clauses were written into the original five
contracts. It buys five competitively tendered prices *and* single-point
management of the interfaces between them. Tendering one prime from the start
buys the second and gives away the first; running five to the end buys the first
and pays for the second in the client's own time, which is the dearest way there
is to buy it.

**The mechanism it is built around** is consolidation onto an incumbent: one of
the five becomes prime and the other four are novated down to it. That is
cheaper and faster than appointing a new prime — one fewer transfer, no learning
curve, and it is what a sane named-party limitation permits. Which of the five
should hold it depends on where you are in the programme: mid-build the modular
contractor, at convergence the FM and operation contractor, because it is the
only one of the five that cannot walk away from a bad job.

**What the model found.** On a worked village — four packages at £17.17m, 24
months of client management avoided, delay risk halved — the break-even wrap
rate is **2.5%**. The market rate is 17–21%. The gap is over £3m. That is stated
in the playbook at 8.4 rather than buried, because a document recommending a 21%
wrap without showing that its measurable return is 2.5% would be selling rather
than advising. What the gap buys is certainty, capacity you cannot hire, and
single-point accountability — none of which a model can price, all of which are
real. The point is to pay it knowingly.

### How both were verified

`qa-playbook.py` reads the OOXML and runs six checks. The first one exists
because Rev A of the build failed it: the clause numbers were written in the
content files and the section numbers in the build script, and they disagreed —
clauses printed as 5.x sat under a heading numbered 6, so "see 5.3" landed in
the wrong section. The build now owns every number, cross-references are
symbolic tokens, and an unresolved token fails the build. It also enforces the
document's own arithmetic: every interface must belong to exactly two packages,
and every one of the eighteen traps must be closed by a step of the twelve-week
programme.

`recompute-consolidation.py` evaluates all 59 workbook formulas with its own
evaluator and compares them against arithmetic derived independently by hand.
LibreOffice cannot recalculate in this environment, so a wrong formula would
otherwise ship looking right.
