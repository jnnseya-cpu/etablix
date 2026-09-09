/**
 * Agent 10 — Mobilisation-readiness review.
 *
 * £5,500 to £15,000, and deliberately narrower than the diagnostic. It sells
 * weeks before mobilising rather than at bid stage, to a client who will not
 * buy a full diagnostic, and it answers one question: can you mobilise on the
 * date, and what will stop you.
 *
 * Eight deliverables, not twelve. Padding a narrower product out to the
 * diagnostic's shape would be dishonest twice over — the client pays less and
 * should get less, and a review that repeats a diagnostic is a diagnostic
 * sold at a discount.
 *
 * THE METHOD IS DIFFERENT BECAUSE THERE IS A SITE VISIT. The intake asks for
 * site access, so this is the one deliverable where ETABLIX sees the thing
 * rather than reading about it. That makes the central distinction of the
 * whole report the difference between what was OBSERVED, what was EVIDENCED
 * by a document, and what was merely ASSERTED by somebody. A readiness review
 * that records an assertion as a fact is worse than none: it gives a client
 * confidence in a date that will not hold.
 */

export const RECONCILE_TASK = `Do not write any part of the review yet.

Build the working paper the eight deliverables are written from. It is not for
the client. It exists so that every readiness statement in the review can be
attributed, and so that nothing anybody merely told us is reported as a fact.

## A · READINESS EVIDENCE REGISTER
Every service, package, consent, appointment and physical item that must be in
place to mobilise. Columns: reference (RE-xx), the item, its stated position,
and the EVIDENCE CLASS — one of:

  OBSERVED   — seen on the site visit. Say what was seen.
  EVIDENCED  — supported by a document. Name the document and section.
  ASSERTED   — stated by somebody with nothing behind it. Name who said it.
  UNKNOWN    — no position given at all.

This column is the review. A client who is told which of their beliefs are
merely asserted has learned something no internal report gives them, because
internally an assertion and a fact are recorded the same way.

## B · POSITION AGAINST THE MOBILISATION DATE
Every item in table A that has a lead time. Columns: reference, the item, the
lead time with its source, whether it has been started, the latest responsible
start date worked backwards from the mobilisation date, and whether that date
is in the future or the past.

An item whose latest responsible start has passed is the most valuable row in
this report. Do not soften it and do not bury it in a list.

## C · WHAT THE SITE SHOWS THAT THE DOCUMENTS DO NOT
Everything from the visit that is not in the paperwork. Columns: reference,
what was observed, which document it contradicts or is absent from, and what
it means for the date. Standing water, an access that is narrower than drawn,
a compound area still in use, a service that has been installed somewhere
other than where it is shown, plant on ground nobody has surveyed.

## D · WHAT COULD NOT BE ESTABLISHED
Every item where the position could not be determined, with what prevented it
— access refused, an area not reachable, a document not provided, a person not
available. Say what each one prevents concluding.

Rules. Never upgrade an assertion to a fact because it is probably true. Where
the visit and a document disagree, record both and say which was observed.
Quote the source for every lead time. Where an item is absent from both the
visit and the pack, that is UNKNOWN and it is a finding.`;

const P = (key, label, range, task) => ({ key, label, range, task });

export const SECTION_PASSES = [
  P("m1_3", "Readiness, blockers and consents", [1, 3], `Write deliverables 1, 2 and 3 of the Mobilisation-readiness review.

## 1 · Readiness by service, at today's date
Every service and package, rated against the mobilisation date. Columns:
reference, the service, its position, the EVIDENCE CLASS from the working
paper, the rating, and what would change the rating. Use three ratings only —
READY, AT RISK, NOT READY — and define each in one line before the table so
the client cannot read them loosely.

Follow the table with a count: how many of each, and how many of the NOT READY
items are NOT READY because of something nobody has started rather than
something in progress. Those two are different problems and only one of them
is recoverable by working harder.

## 2 · What will stop mobilisation
The blockers, ranked by the date each one bites rather than by how large it
feels. Columns: reference, the blocker, the date it stops work, what it stops,
its evidence class, and whether it is recoverable in the time remaining.

For every blocker say plainly whether it is recoverable, and if it is not, say
what the earliest achievable date becomes. A review that lists blockers and
declines to say whether the date holds has not answered the question it was
bought to answer.

## 3 · Consents, conditions and connections
The consent and connection position, worked BACKWARDS from the mobilisation
date. Columns: the consent or connection, its current status, whether it has
been applied for, the lead time with its source, the latest responsible start
date, and whether that has passed.

Separate the pre-commencement conditions from the rest and say so: a condition
that prohibits development is not a risk to the programme, it is a prohibition
on starting, and mobilising against an undischarged pre-commencement condition
is a breach rather than a delay.`),

  P("m4_6", "Site, suppliers and workforce", [4, 6], `Write deliverables 4, 5 and 6.

## 4 · Site and layout readiness
Whether the physical site is ready for what will arrive. Columns: the area or
route, what it must accommodate at mobilisation, what was OBSERVED there, the
gap, and what closing it requires. Cover the access and its geometry, the
compound areas and their ground condition, haul routes, gates, laydown,
parking, and the segregation between people and vehicles.

Report what was seen, in the words of what was seen. Where the site differs
from the layout drawing, name the drawing and revision and say which is
current. A layout dated before a decision that changed it is a finding.

## 5 · Supplier and appointment readiness
Every appointment mobilisation depends on. Columns: the package, the supplier
if appointed, the status of the appointment, the lead time from instruction to
being on site, the latest responsible instruction date, and whether it has
passed.

Say which packages have no supplier and no enquiry in the market, because
those are not late appointments, they are absent ones. Where a supplier is
appointed but against a superseded document, say so — an order placed on the
wrong revision is a variation that arrives on the first day.

## 6 · Welfare and workforce readiness at day one
Whether the people arriving on the mobilisation date have somewhere to wash,
change, eat and be inducted. Sized against the day-one headcount, not the
peak, and stated against Schedule 2 of the Construction (Design and
Management) Regulations 2015 — say that Schedule 2 sets no numeric ratios and
state the ratios applied.

Cover sanitary and washing provision, drying and changing, rest and meals,
drinking water, first aid and emergency arrangements, induction and access
control, and accommodation if the day-one workforce cannot travel to it.
Drinking water is a duty and no potable supply proven at any compound is a
finding, not a detail.`),

  P("m7_8", "Recovery actions and the verdict", [7, 8], `Write deliverables 7 and 8. These two are what the client bought.

## 7 · Recovery actions in the time remaining
Numbered actions, each with a named role, ordered by the date each one must
START rather than by importance. Columns: the action, who owns it, the date it
must start, the date it must complete, and which blocker or readiness item it
closes.

Separate the actions that recover the date from the actions that are necessary
anyway, and label them. A client working through an undifferentiated list
spends the remaining weeks on the wrong things.

Where an action cannot recover its item in the time available, say so in the
row rather than listing it as though it could.

## 8 · The date verdict
One of three, stated in the first line and then argued:

  DELIVERABLE — the mobilisation date holds on the current position.
  DELIVERABLE WITH ACTIONS — it holds only if the actions at section 7 with a
    start date inside the next fortnight are started. Name them.
  NOT DELIVERABLE — it does not hold. Give the earliest date that does, show
    how it was derived, and name the single item that sets it.

Then state what the verdict rests on: how much of the position is OBSERVED,
how much EVIDENCED, how much merely ASSERTED, and how the verdict would change
if the asserted items turned out to be wrong. A verdict built substantially on
assertion must say so — that sentence is the difference between a review and
reassurance.`),
];

export const FINAL_TASK = `Everything is written. Two things remain.

## 0 · VERDICT IN ONE PARAGRAPH
Write it first though it is read first. One paragraph, no bullets. It must
say: whether the mobilisation date holds; the single item that most threatens
it, dated; how many readiness items rest on assertion rather than evidence;
and the one action that must start this week. Somebody who reads only this
paragraph must know whether to hold the date.

## A · EVIDENCE AND ASSERTION LEDGER
Two tables.

First, the evidence ledger: every readiness statement in the review with its
evidence class and its source — what was observed, in which document, or who
said it. Total the four classes and give the count, because the proportion of
the review that rests on assertion is itself a finding about how this project
is being managed.

Second, the items whose latest responsible start date has already passed, with
the date it passed and what it now costs. If the table is empty, say so
explicitly rather than omitting it.

Then list what could not be established and what it prevented — access
refused, an area not reachable, a document not provided, a person not
available. Never present an unvisited area as ready.`;

export const BRIEF_SYSTEM = `You are Agent 10 — Mobilisation-readiness review.

This is a paid engagement of £5,500 to £15,000. A client is weeks from
mobilising and wants to know whether the date holds. Produce all eight
deliverables, under these exact headings, in this order. Eight, not twelve —
this is a narrower product than the Site Systems Diagnostic and padding it out
to match would be a diagnostic sold at a discount.

THE CENTRAL DISTINCTION OF THIS REPORT IS EVIDENCE CLASS. There is a site
visit, so for every readiness statement you must say whether it was OBSERVED
on the visit, EVIDENCED by a named document, ASSERTED by somebody with nothing
behind it, or UNKNOWN. Never upgrade an assertion to a fact because it is
probably true. Internally a client records an assertion and a fact the same
way, and telling them which of their beliefs is which is the thing they cannot
do for themselves.

ANSWER THE QUESTION. The client bought a verdict on a date. Section 8 gives
one of exactly three: deliverable, deliverable with named actions, or not
deliverable with the earliest date that is. A review that lists concerns and
declines to reach a verdict has not been delivered.

WORK EVERY DATE BACKWARDS from the mobilisation date. A lead time nobody has
started is the most valuable thing in the report, and an item whose latest
responsible start has already passed goes in the first paragraph.

Drawings and printed programmes are given to you as pages to look at, not as
extracted text. Where the site as observed differs from the layout as drawn,
name the drawing and revision and say which is current. Never infer a
dimension from a drawing you cannot scale, and never read a drawing's silence
as a decision.

Boundary: decision support only. Every load, ratio, rate and duration is a
first-pass planning figure for validation by a competent person, and anything
safety-critical is flagged for one rather than resolved. Nothing here is a
design, a price or an instruction.`;

export const FIELDS = [
  { name: "client", label: "Client / organisation", type: "text", required: true },
  { name: "project", label: "Project / site — the name this review will carry", type: "text", required: true },
  { name: "handover", label: "Information handover date — the review is due ten working days after this", type: "date", required: true },
  { name: "access", label: "Site access for the review visit — what was seen, and what could not be reached", type: "textarea", required: true },
  { name: "programme", label: "Current programme and the mobilisation date being tested", type: "textarea", required: true },
  { name: "status", label: "Status of every service and package at today's date", type: "textarea", required: true },
  { name: "consents", label: "Consents, conditions and utility connections — the current position", type: "textarea" },
  { name: "layout", label: "The layout as it will be at mobilisation", type: "textarea" },
  { name: "suppliers", label: "Supplier appointments and their lead times", type: "textarea" },
  { name: "risks", label: "The client's own mobilisation risk register", type: "textarea" },
];

export const SECTIONS = [
  ["m1", "Readiness by service, at today's date"],
  ["m2", "What will stop mobilisation"],
  ["m3", "Consents, conditions and connections"],
  ["m4", "Site and layout readiness"],
  ["m5", "Supplier and appointment readiness"],
  ["m6", "Welfare and workforce readiness at day one"],
  ["m7", "Recovery actions in the time remaining"],
  ["m8", "The date verdict"],
];
