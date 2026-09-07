# Employer's Requirements — P2 Modular Accommodation

`ETABLIX-ER-P2-Modular-Accommodation.docx` is generated:

    node build-er.cjs      # content is in er-content.cjs and er-spec.cjs

Content is separated from layout so the specification can be edited without
touching the document code, and reused for the other four packages.

## What is in it

68-line room data sheet across three room types, 20 element-by-element
specification clauses, 23 performance criteria each with how it is verified,
a 12-row interface schedule naming who certifies what and when, handover
deliverables, a drawings register, and a priced activity schedule structure.
5,065 words, 9 tables, 545 cells.

## What it is not

**One package of five.** A full tender pack is five of these, plus the ITT,
the nine appendices listed at section 13, the pricing schedules and the
drawings. This is a fraction of a complete pack and should not be described
as one.

**The appendices are listed, not written.** The activity schedule, colour
range, design loadings and overheating criterion are named as appendices and
do not exist yet.

**Not visually verified in Word.** LibreOffice cannot convert in this
environment. The file is verified structurally — XML parsed, 158 rows and 545
cells present, zero conversion warnings from mammoth — and rendered through
mammoth to HTML and Chromium to look at. Open it in Word and check the table
pagination before it goes to a supplier.

**The specification values are a competent starting position, not a design.**
Acoustic, thermal and air permeability figures are the Employer's
requirements. Compliance with statute is the contractor's duty and is not
discharged by meeting them.

## Gap register — Rev A reviewed against itself

`ETABLIX-ER-P2-gap-register.docx` — 25 findings, generated from
`gap-register.cjs` by `build-gaps.cjs`.

Three are fatal, meaning a tenderer cannot price Rev A safely:

- **G01** No design responsibility matrix and no Contractor's Proposals
  mechanism. The document never says whether this is a contractor-designed
  package. Every competent tenderer will qualify its return, and qualified
  returns cannot be compared — which defeats the evaluation model.
- **G02** Ten room data sheet lines name a product where the requirement is a
  performance. Specifying a 1.0 kW heater rather than "maintain 21 °C at −4 °C
  external" hands the design liability back to the Employer. That is the
  opposite of what the package was for.
- **G03** Electronic locks on bedroom doors in sleeping accommodation, with no
  statement anywhere of what they do when the fire alarm sounds.

Rev B implements them. The register stays in the repository because the
findings are the reusable part: the same twenty-five questions apply to the
other four packages, and to anybody else's Employer's Requirements.
