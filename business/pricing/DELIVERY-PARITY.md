# Delivery parity — every deliverable at the level of the diagnostic

**Prepared 9 September 2026. CLOSED — all five deliverables now have a
production engine, and the requirements package now has the second stage that
makes "ready to issue" literally true (section 8).**

The Site Systems Diagnostic works. A client answers nine questions in their
portal, uploads their pack once, and an engine reads eighteen documents against
each other over six passes and produces twelve deliverables with sixty-five
sourced contradictions in the appendix. It is branded, numbered, held to its
promised date, and issuable without a retype.

Nothing else did any of that. **Four of the five Model A deliverables were an
intake checklist, a price, and somebody writing forty pages by hand.**

---

## 1 · Why this is a pricing problem before it is a delivery problem

The margins certified in PRICING-REVIEW-2026 assume the effort of an engine.
The Site Management Requirements Package is priced at £14,000 to £45,000 on an
assumption of ten to thirty-four chargeable days. Written from a blank page
that is forty days or more — so **the margin on that band was not thin, it was
wrong.** The same is true of the village package and the mobilisation review.

Which makes parity a commercial requirement rather than a refinement. Either
the engine exists and the price is right, or it does not and the price has to
come down to something that pays for the hours.

---

## 2 · Where each deliverable stands

| Deliverable | Fee | Intake | Production engine | Document |
|---|---|---|---|---|
| Site Systems Diagnostic | £6,500 – £18,500 | 8 questions | **Agent 8** — 6 passes, 12 sections | SSD |
| Site Management Requirements | £14,000 – £45,000 | 9 questions | **Agent 9** — 6 passes, 12 sections | SMR |
| Mobilisation-readiness review | £5,500 – £15,000 | 7 questions | **Agent 10** — 5 passes, 8 sections | MRR |
| Workforce Village Requirements | £18,000 – £55,000 | 10 questions | **Agent 11** — 6 passes, 12 sections | WVR |
| Managed Procurement Desk | £5,000 – £13,500 | 9 questions | **Agent 12** — 5 passes, 8 sections | TEV |

**All five, and each with its own shape rather than the diagnostic's.** Every
one takes the client's portal answers with nothing re-entered, reports its own
stage names, mints into its own numbered series, and renders as a branded
document with the print-to-PDF button. `parity.e2e.mjs` walks all five, 79
checks.

---

## 3 · What was built, and what makes it reusable

**The engine now takes a spec.** Everything it does — reading a client's
documents against each other, continuing a pass that runs out of room,
resuming an interrupted run, caching the pack across six calls, keeping the
money and the notes straight — is product-neutral, and it was welded to one
product. A deliverable is now a description of what it must contain:
`pipelineSpec({ reconcileTask, sectionPasses, finalTask })`. The next three are
each a spec file rather than a second copy of the machinery.

**Agent 9 is a genuinely different product, not a reskin.** The diagnostic
reads documents against each other and reports what does not hold — it
produces findings. Agent 9 produces **instruments**: text a tenderer prices and
a contract later enforces. Three rules follow, and they are in the brief rather
than in a comment:

- **Every requirement is objectively verifiable.** "Adequate welfare" is not a
  requirement. A requirement a supplier can satisfy two ways is a variation
  already priced against the client.
- **Every requirement is traced to its source** — a client document and
  section, a statutory duty, a planning condition, or an ETABLIX proposal
  marked `[PROPOSED — client approval required]`. A requirement with no source
  is one the client never asked for and will not pay for.
- **Nothing is invented.** Where the client has stated no standard, the package
  says so, proposes one, names the basis, and marks it for approval. A
  specification with a silently assumed standard is how a supplier prices the
  wrong thing and is entitled to be paid for it.

Its working paper is different too. The diagnostic's is a contradictions
ledger; Agent 9's is a **requirement source register** — what the client has
mandated, where each mandate comes from, where their own documents mandate two
different things, and every point at which a standard must exist and does not.

**And it carries the CDM boundary on the face of the document.** Nothing in a
requirements package appoints ETABLIX as Principal Contractor. Under CDM 2015
that is a defined legal role with specific duties, and holding it must be an
explicit, priced, insured decision rather than an inference from a word in a
specification.

---

## 4 · A defect worth recording, because it was nearly invisible

The mock model matched Agent 9's passes with the diagnostic's answers. Both
agents' passes say "Write deliverables 1, 2 and 3", the diagnostic's pattern
was tested first, and **the output splitter takes sections by number rather
than by title — so the wrong content landed in the right fields and looked
entirely correct.** Twelve populated sections, a valid document, a real
number, the right headings, and every word underneath belonging to a different
product.

The first version of the test asserted that the section fields were populated,
and passed. It now asserts what the words say: that section 2 reads as
Employer's Requirements and section 9 as the commercial requirements. That is
the difference between a test and a formality.

---

## 5 · What each of the three needed that the others did not

**Agent 10 — Mobilisation-readiness review. Eight sections, not twelve.**
Padding a £5,500 product out to the diagnostic's shape would be a diagnostic
sold at a discount, twice dishonest: the client pays less and should get less,
and a review that repeats a diagnostic is not a second product.

Its method is different because **it is the only engagement with a site
visit.** So the central distinction of the whole report is between what was
OBSERVED on the visit, what a named document EVIDENCES, what somebody merely
ASSERTED, and what is UNKNOWN. Internally a client records an assertion and a
fact the same way; telling them which of their beliefs is which is the thing
they cannot do for themselves. And it must reach a verdict — deliverable,
deliverable with named actions, or not deliverable with the earliest date that
is — because a review that lists concerns and declines to answer has not been
delivered.

**Agent 11 — Workforce Village. People sleep there, and it changes what may be
written.** A compound is a place of work; a village is where several hundred
people are unconscious at three in the morning. Fire strategy, means of
escape, compartmentation, alarm and detection, evacuation and fire-service
access are life-safety matters, and this package states the requirement that a
strategy must exist and names who must produce it — a competent fire engineer
and the fire and rescue authority. It proposes no travel distance, no
compartment size, no alarm category, no escape width. **A package that appears
to settle a fire strategy is more dangerous than one that is silent**, and the
document says on its face that it is not one.

It is also a consented development rather than a temporary works arrangement.
The consent route and its determination period decide whether the village is
available at all, and clients ask for one long after the application had to be
made — so every consent is worked backwards from first occupancy and any date
already passed goes in the first paragraph.

**Agent 12 — Procurement desk. A different shape, and the working paper
carries the value.** It is a recurring service, so its unit of production is
one evaluation per package, produced again every time returns land. Eight
sections, three passes.

Its value is **normalisation, not scoring.** Three tenderers price one enquiry
on three different bases: one includes fuel and two do not, one priced a
superseded revision, one excluded standby, one assumed a different term. Added
up as returned, the cheapest is whoever excluded most. Section 4 brings them
onto one basis as a build-up the client can follow line by line and disagree
with — and no adjustment is ever invented. Where one cannot be derived it is
carried as an open item and the ranking is stated as provisional, because an
invented adjustment is an award decision taken by whoever guessed.

A level playing field is treated as a duty rather than a courtesy: every
non-compliance is recorded with its treatment, and the treatment is applied
consistently, because quietly correcting one return and not another is how an
award becomes challengeable.

---

## 6 · Two defects the build found

**The procurement intake had no item for the tender returns.** Nine questions
about the enquiry, the budget, the evaluation model and the approval route,
and nothing about the thing being evaluated — so the run was refused for a
missing required field. The returns arrive in a second act, weeks after the
rest, which is why the new checklist item says so on its face: the others set
the enquiry up, this is what comes back, and a return supplied in part is
evaluated in part.

**Section prefixes collided with pack prefixes.** The mobilisation review's
sections were `v1..v8` while its client questions were `m-*`, and the village
package's sections were `w1..w12` while its questions were `v-*`. Nothing
broke loudly — the test simply reported that a client had been given a
nought-question pack. Each agent's sections now carry its own letter.

---

## 7 · The order these were built in, and why

**Mobilisation-readiness review** first, despite being the cheapest. It is the
closest sibling of the diagnostic — same intake shape, same "worked backwards
from a fixed date" method — so it is the cheapest spec to get right, and it is
the entry product for a client who will not buy a full diagnostic.

**Workforce Village Requirements** second. £18,000 to £55,000, the most
specialist thing ETABLIX sells, and the one with the fewest competitors. On
NORTHREACH the accommodation decision alone moved between £3.15m and £11.7m
against a client basis that was a graduate's desk research with no rates in it.

**Managed Procurement Desk** last, and differently. It is a recurring service
rather than a document, so the engine it needs is not a six-pass pipeline —
it is per-package evaluation and comparison against the requirements. Building
it as a pipeline would be forcing the wrong shape.

All three are built. **The pricing certified in PRICING-REVIEW-2026 now holds
for all five bands**, because every one of them is produced by an engine on
the effort the margin model assumed. The earlier instruction to quote the
bottom of a band on the four without engines no longer applies.

What remains is the same thing that remains for the diagnostic: read the
output before it goes to a client. An engine that produces twelve sections in
six passes produces them from the client's own documents, and the sections that
matter most are the ones a client checks hardest.

---

## 8 · The gap that was left: packaging, not thinking

*Added 9 September 2026, after the five engines were in.*

Agent 9 writes everything that should go to market and binds it into one
report. That is not what "ready to issue" means. **A real invitation to tender
leaves as separate files**, because that is how a tenderer receives it: their
estimator opens the pricing schedule, their bid manager opens the instructions,
their commercial lead opens the form of tender. Three people, three documents.
Handing all three one ninety-page PDF and telling them which pages to read is
how a pack gets priced against the wrong revision.

Two consequences for the website as it was written. **"Ready to issue" was not
literally true**, and **"pricing schedules" read as a document you hand a
tenderer** where Agent 9 only specified what such a document must contain.

### Agent 13 — the assembler

| | |
|---|---|
| Input | The **approved** Site Management Requirements Package |
| Output | 8 parts, each a separate issuable document |
| Passes | 7 — pack register, then 1-2, 3, 4, 5-6, 7-8, then the issue summary |
| Document | ITT series, and `?part=4` renders the pricing schedule on its own |
| Fee | **None of its own.** It is the second stage of the requirements package |

**It has no fee of its own on purpose.** The requirements package is already
sold as "the document set that goes to market". Charging separately for the
set would be selling the same promise twice.

**It assembles; it does not re-decide.** Nothing is added to the approved
package and no silence in it is filled — a gap becomes an open item in Part 8.
A requirement invented at assembly is a requirement nobody approved arriving in
a contract, and it would arrive with ETABLIX's name on it.

**It refuses to run against a draft.** The endpoint returns 409 until a human
has approved the package it assembles from.

### The one control that makes the pack safe to issue

The scope sheets and the pricing schedule are written in **two separate
passes**, so the schedule is written against the sheets rather than alongside
them. Then they are reconciled **by machine, on every run**, before anybody can
approve it:

- every scope item carries the reference `SS-<package>.<item>`
- every priced line names the scope reference it prices, in a column headed
  exactly `Scope ref`
- every priced line names a unit from a stated vocabulary

A scope item with no priced line is work the tenderer is instructed to do and
given nowhere to price — it returns after award as a variation at their rate.
A priced line with no scope item is priced by every tenderer on a different
assumption, and no two assumptions match, which is precisely the condition
that makes returns incomparable. Both stop the pack being issued, and the
result is printed on the issue certificate so a client can see it was checked.

Telling the model to keep them aligned would not have been a control. This is:
`lib/tenderpack.js`, 27 checks in `tenderpack.test.mjs`, run on every pack.

### Three defects this build found

**The splitter truncated every eight-section deliverable.** The heading number
ceiling was a hard 12 whatever the product, so a line like "10. Provide the
RAMS" inside section 8 of a mobilisation review was taken for the start of a
section 10 — and everything after it was cut from section 8 and then thrown
away, because no field 10 existed to receive it. It never failed loudly. The
bound is now the deliverable's own section count.

**The matched count was a hard 13.** An eight-section deliverable missing three
sections still reported thirteen matched.

### One decision that is yours, not the code's

**When is the pack due?** The requirements package's ten working days run from
information handover. The pack cannot start until the package is approved, so
its own ten working days currently run **from the day the package was
approved** — that is when its information handover genuinely happened, and the
requirements package's promised date is never touched.

The alternative is that the pack is due with the package, inside the same ten
days. That is closer to what "the document set that goes to market" sounds
like when a client reads it, and it is undeliverable whenever the client takes
five days to approve. Confirm which one you are selling before the next
requirements package goes out, because it belongs in the engagement letter and
not in a settings file.
