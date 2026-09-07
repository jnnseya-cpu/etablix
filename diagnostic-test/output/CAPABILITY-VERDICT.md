# Can we deliver the Site Systems Diagnostic as promised?

**Yes — but before this test, the platform produced about half of it.**

The test: eight inputs in `../inputs/`, written to be realistic rather than
convenient. Some information missing, some contradictory. Twelve deliverables
promised on the website. `DIAGNOSTIC-REPORT.md` is what came out.

## The work itself is deliverable

Every one of the twelve was produced from the eight inputs alone. Nothing
needed information the client was not asked for, and the ten-working-day
window is realistic for this depth — most of the effort is reconciling
documents against each other, not generating text.

More importantly, the test found the things a diagnostic exists to find:

- A **consent chain that makes the access date undeliverable** — the Section
  278 has a 20-week lead time and roughly six weeks remain before 1 March
  2027 is lost. Nothing in the eight inputs says this; it only appears when
  the programme is read against the constraints.
- **Two-shift working prohibited by planning condition 14.** Input 01 and
  input 07 contradict each other and no document reconciles them.
- **Seven packages nobody owns**, including the grid connection and
  reinstatement.
- **A generator being sized against a superseded cabin schedule**, because
  two enquiries went out three weeks apart from different buyers.
- **90 parking spaces against roughly 280 people at shift overlap.**

That is the product working. A client who received this would have had value
for the fee on the first finding alone.

## What the platform produced, and what it did not

The Site-System Design Coordinator agent covers the technical core well. It
does not cover the commercial and decision half.

| # | Deliverable | Producer before this test | Verdict |
|---|---|---|---|
| 1 | Site-service package map | Design agent §3 | **Covered** |
| 2 | Scope-gap assessment | Falls out of §4, not produced directly | Partial |
| 3 | Supplier-interface matrix | Design agent §4 | **Covered** |
| 4 | Workforce-demand profile | Design agent §1 | **Covered** |
| 5 | Temporary-utility demand assessment | Design agent §2 | **Covered** |
| 6 | Welfare and accommodation requirements | Design agent §1 | **Covered** |
| 7 | Mobilisation constraints | §5 gives sequence, not the consent chain | Partial |
| 8 | Procurement strategy | Commercial agent — **but it requires pasted supplier quotations**, which do not exist at diagnostic stage | **No producer** |
| 9 | Preliminary risk register | §6 gives risk prompts, not a scored register | Partial |
| 10 | Indicative cost structure | Nothing produces this | **No producer** |
| 11 | Recommended delivery model | Nothing produces this | **No producer** |
| 12 | 30/60/90-day mobilisation actions | Nothing produces this | **No producer** |

**Five covered, three partial, four with no producer at all.**

The four missing are not incidental. They are the half the client actually
buys: what it costs, how to buy it, which model to use, and what to do on
Monday. The agent roster was built around technical design and around
commercial work that assumes bids already exist — neither of which is the
diagnostic.

The input mismatch on deliverable 8 is the clearest symptom. The Commercial
& Procurement agent is the obvious candidate for "procurement strategy", but
it asks for supplier quotations to normalise. At diagnostic stage there are no
quotations. Anyone reaching for it would find the wrong tool.

## What was done about it

A dedicated agent — **Site Systems Diagnostic** — has been added, taking
exactly the eight inputs the website asks for and producing exactly the twelve
deliverables it promises, in that order. It carries the same boundary as every
other agent: it drafts, a competent human validates, and anything
safety-critical is flagged rather than assumed.

The claim on the website is now backed by a tool that answers it end to end,
rather than by five-twelfths of one plus whatever the person remembers.

## The honest limits

- **The numbers in the report are first-pass planning figures.** The 530 kVA,
  the 32 m³/day, the welfare ratios — all defensible as a starting position,
  none safe to procure against without an engineer. The report says so on
  every table, and the agent brief requires it.
- **The cost ranges are order-of-magnitude.** They exist to size the
  delivery-model decision, not to be a budget. The £6.6m–£11.9m spread is
  deliberately wide because three unresolved decisions drive it.
- **Ten working days assumes the client actually provides the eight inputs.**
  In this test they were complete. Where a real client provides four of eight,
  the honest answer is a shorter report with the gaps named, not the same
  report with assumptions filling the holes.
- **This was produced without running the live agent**, because the API key
  sits on the production host rather than in the development environment. The
  agent brief is written and loads correctly; its first live run should be
  against these same eight inputs, and the output compared against this report
  as the benchmark.

## The loop, after this test

The four missing deliverables were only half the problem. Even with the
agent written, issuing a diagnostic meant reading its output in one panel and
retyping thirteen sections into another — which is how a ten-working-day
promise quietly becomes fifteen.

The loop is now one path through the Control Desk:

1. **Organisation → AI agent console → Site Systems Diagnostic.** Eight input
   fields, plus the client and project name the report will carry. Client
   documents are uploaded and read in full rather than pasted.
2. **Approve the run.** Nothing becomes a document until a named person
   approves it, and the approval is recorded against them.
3. **Draft as SSD report.** The twelve deliverables and the findings paragraph
   are split out of the agent's output and land in the Site Systems Diagnostic
   document with every field filled. Anything the splitter could not find is
   named on screen rather than left silently blank.
4. **Review, edit, generate.** The document is numbered in the SSD series and
   renders branded, with the validation notice on it.

The basis of preparation writes itself from the run: which of the eight inputs
were supplied, which documents were read in full, and — the part that matters —
which were **not provided and therefore not relied on**. A gap in the inputs
appears in the issued report automatically instead of depending on someone
remembering to mention it.

A second template, **Diagnostic specimen extract**, produces the client-safe
version: the findings paragraph, sections 3 and 7 in full, a contents list of
the remaining ten, a diagonal SPECIMEN watermark that repeats on every printed
page, and a notice on the cover stating that it is an invented worked example
ETABLIX has not delivered. That is what goes to a prospect; the SSD report
itself does not.
