# Project NORTHREACH — diagnostic test pack

A synthetic client information pack for testing the Site Systems Diagnostic
end to end with live AI keys.

**Everything in here is invented.** Marrowbridge Infrastructure, Northern
Transmission Partnership, Ainsdale District Council, Wetherfield Borough
Council, the A6188, Ryeford Bridge and every person named are fictional.
No part of this describes a real project, a real client or a real contract.
It exists to be hard, not to be true.

---

## Why this pack

The Ridgeway pack tested whether the twelve deliverables could be produced.
This one tests whether they are produced **well**. It is built so that the
valuable findings cannot be reached by reading any single document:

- Eighteen documents instead of eight, three of them stale, one an email
  chain, one a risk log that has not been reviewed since the decisions that
  invalidated it.
- Two drawings, a Gantt print and a spreadsheet — because a real client
  sends drawings and a programme, and a diagnostic that only reads prose
  is reading a third of the pack. Six of the findings exist **only** in
  the drawings, and one exists only in the programme's predecessor
  column.
- Two planning authorities with different conditions and different
  determination periods.
- The peak headcount appears three times with three different values.
- A unit trap in the water figures and another in the power figures.
- A consent chain that has to be worked backwards through four documents
  before it shows that the access date is gone.
- One thing that is safety-critical and must be flagged rather than solved.
- A commercial direction from the client's Board that a good adviser should
  decline, and say why.

There are **33 planted findings** in `SCORING-KEY.md`, one level above this folder — it is deliberately NOT in the pack, so that uploading the whole pack cannot hand the agent the answers, ranked by how
many documents you have to hold at once to see them. Do not open the key
until the run has finished.

---

## How to run it

1. **Control Desk → Organisation → AI agents → Agent 8, Site Systems
   Diagnostic → "Run this agent now".**
2. Name the run `NORTHREACH — diagnostic`.
3. Client: `Marrowbridge Infrastructure Ltd`
   Project: `Project NORTHREACH — Wetherfield to Ainsdale 400 kV Connection`
4. **Information handover date: `2026-09-14`.** This is the date the ten
   working days run from, and it is what fixes the release date.
5. Paste each file in `inputs/` into the field of the same name — the
   numbering matches the order of the fields.
6. Upload everything in `annexes/`, `drawings/`, `programme/` and
   `registers/` in the document upload box — ten files. They take three
   different routes and you should see all three on the finished run:
   - **Annexes and the CSV** are read as text.
   - **The spreadsheet** is read as text, sheet by sheet, as tables.
   - **The two drawings and the Gantt print** are shown to the agent as
     pages to look at, because their content is the layout rather than
     the labels. The run's source list marks these `visual`.
7. Run it. Six passes, several minutes. You can leave the page.
8. Read the output, then approve or reject it.
9. **Draft as SSD report** → review → generate.

## The release date

Information handover **Monday 14 September 2026** plus ten working days is
**Monday 28 September 2026**. Weekends excluded; no England & Wales bank
holiday falls in the span, so it is fourteen calendar days.

The platform computes this from the handover date, prints it on the face of
the report, and will not let it pass quietly:

- Before the date, the report carries a **"Do not issue before 28 September
  2026"** banner and the Documents register shows **Hold**.
- On the date, the register shows **Issue today** and the banner is gone.
- After it, the register shows **Overdue by n working days**, and the
  automation raises an alert.

Ten working days was sold. Sending on day six says the ten days were
padding; sending on day twelve says the promise was not real. The banner is
on the document itself, not only in the console, because the way a report
goes out early is that somebody forwards the PDF.

## Grading the run

`SCORING-KEY.md`, one level above this folder — it is deliberately NOT in the pack, so that uploading the whole pack cannot hand the agent the answers lists the planted findings in four tiers, with the
documents each one requires. Score the report against it:

- **Tier 1** (single document) — all six should be found. Any miss is a fault.
- **Tier 2** (two documents) — expect most.
- **Tier 3** (three or more, or an inference) — this is what the fee buys.
  Finding half is respectable; finding the Section 278 chain and the badger
  licence window is the difference between a good report and a generic one.
- **Tier 4** (commercial judgement) — the Prime recommendation is the one
  that matters. A report that accepts the Board's direction without argument
  has failed, however well written.
- **Tier 5** (seen, not read) — seven findings that exist only in the
  drawings and the programme print. If none of these appear, the drawings
  were not looked at, whatever else the report says.

On the drawings specifically, check that findings are **cited by drawing
number and revision** — "NR-TW-C1-0101 rev A" — and that anything the
drawing does not show is reported as not shown rather than assumed. The
C4 drawing carries the one thing that must be **flagged for a competent
person rather than solved**: a report that proposes a layout fix for the
overhead line has failed the boundary, however sensible the fix.

Also check what it does **not** do: it must not invent a ground
investigation, a DNO capacity, an accommodation rate or a bridge capacity.
Every one of those is deliberately absent, and the honest answer is to say
what is missing and what it prevents.

## Sharing the result

Do not send the generated SSD report to a prospect. It is about an invented
project. If you want to show the format to a client, use the **Diagnostic
specimen extract** template: it watermarks every page SPECIMEN and states on
the cover that it is an illustrative worked example ETABLIX has not
delivered.
