/**
 * Agent 13 — Tender pack assembler.
 *
 * ETABLIX sells "procurement documents ... ready to issue" as one of the four
 * Advisory lines. Agent 9 wrote everything that should go to market and bound
 * it into one report, which is not the same thing: a real invitation to tender
 * leaves as SEPARATE FILES, because that is how a tenderer receives it and how
 * a document register records it. The instruction to tenderers, each package's
 * scope sheet, the blank pricing schedule, the return forms and the form of
 * tender are five different documents with five different audiences inside the
 * tendering organisation, and stapling them together makes all five harder to
 * use.
 *
 * SO THIS IS AN ASSEMBLY, NOT A SECOND OPINION. Every requirement in the pack
 * comes from the approved requirements package. The agent does not re-decide
 * anything Agent 9 settled, does not improve on it, and does not fill a
 * silence in it — where the requirements package is silent the pack carries an
 * open item, because a gap closed quietly here is a requirement nobody
 * approved arriving in a contract.
 *
 * THE PRICING SCHEDULE IS THE POINT. It is the one document in the pack that
 * a tenderer fills in, and the one that fails silently: a scope item with no
 * priced line is work the tenderer has been told to do and given nowhere to
 * price, and a priced line with no scope item is a price every tenderer
 * guesses at differently. Both are discovered after the returns are in, when
 * the cheapest tender is whoever guessed lowest. So scope and price share one
 * reference set, and lib/tenderpack.js reconciles them by machine on every
 * run — the brief below states the convention and the reconciler enforces it.
 */

import { PRICING_COLUMNS, UNITS } from "../tenderpack.js";

const COLS = PRICING_COLUMNS.map((c) => `| ${c} `).join("") + "|";

export const RECONCILE_TASK = `Do not write any part of the tender pack yet.

Build the PACK REGISTER. This is the working paper: everything the pack is
assembled from, read out of the approved requirements package and set down
once, so that the parts written afterwards agree with each other.

You are assembling from a document that has already been written and approved.
Your job is to find what is in it, not to improve on it.

## A · PACKAGE REGISTER
Every package the requirements package defines. Columns: package code exactly
as the requirements package gives it, package title, the scope boundary in the
requirements package's own words, and the section of the requirements package
it came from.

If the requirements package uses no package codes, allocate them P01, P02 and
so on in the order it presents the packages, and say in a note that you did.

## B · SCOPE ITEM REGISTER
The heart of the pack. Every discrete item of work, service or supply the
requirements package obliges a contractor to provide, one row each, allocated
to a package.

Columns: the reference SS-<package>.<item> (SS-P01.1, SS-P01.2, SS-P02.1 …
numbered from 1 within each package), the item in one line, the requirements
package section it comes from, the unit it would be priced in, and whether the
quantity is stated in the requirements package, derivable from it, or unknown.

Rules that decide whether this pack is safe to issue:
- ONE ITEM PER ROW. "Provide, maintain and remove welfare" is three items with
  three different prices and three different risks.
- Every row traced to a section of the requirements package. A row you cannot
  trace does not belong in the pack — put it in table E instead.
- Where the requirements package states an obligation but no quantity, the row
  stands and the quantity is marked unknown. Do NOT invent a quantity.

## C · DATES AND THE TENDER TIMETABLE
Every date the pack needs: issue, the clarification window's opening and
closing, return, evaluation, award and required-on-site, and the dates the
requirements package worked backwards to. Columns: the event, the date, and
its source — the client's instruction, the requirements package, or NOT YET
SET.

Say plainly where a date in the timetable does not leave enough time before
the required-on-site date. A tender programme that cannot deliver the date it
is procuring for is the most expensive thing in a pack and the easiest to miss.

## D · EVALUATION MODEL AND CONTRACT AS ALREADY SETTLED
The evaluation criteria, weightings and scoring descriptors exactly as the
requirements package sets them, and the contract form and amendments exactly
as it recommends. Quote rather than paraphrase.

If the client has confirmed a different position in the inputs, record BOTH
and mark which one the pack will carry. A pack that quietly departs from the
approved requirements package is how a client discovers at award that they
bought something they did not specify.

## E · WHAT THE PACK CANNOT CLOSE
Every point where the requirements package is silent, ambiguous, or marked
[PROPOSED — client approval required] and the approval is not evidenced in the
inputs. Columns: the reference, what is missing, which part of the pack it
affects, and what must happen before issue.

Never close one of these by choosing an answer. This pack is an assembly of an
approved document; a gap filled here is a requirement nobody approved.`;

const P = (key, label, range, task) => ({ key, label, range, task });

export const SECTION_PASSES = [
  P("t1_2", "Instructions and conditions", [1, 2], `Write parts 1 and 2 of the tender pack.

Each part is a SEPARATE DOCUMENT a tenderer receives. Write it as the document
itself — addressed to the tenderer, in the second person, in the form it will
be issued in — not as a report describing what the document should say.

## 1 · Instructions to tenderers
What the tenderer must do, in the order they must do it. The invitation and
what is being procured in one paragraph; the documents issued with this
invitation, each by title and revision, and whether it is issued FOR PRICING
or FOR INFORMATION; the timetable with every date from the working paper; how
to raise a clarification and by when; what must be returned, in what format,
by what time on what date, and to where; and what happens to a return that is
late, incomplete or in the wrong form.

State the evaluation criteria and weightings as they will be applied, and
state that they are fixed and will not change after returns are opened.

Where a date in the working paper is NOT YET SET, print it as
[DATE TO BE INSERTED BY THE CLIENT BEFORE ISSUE] rather than choosing one.

## 2 · Conditions of tendering
The terms on which the tenderer takes part. Cover: that the invitation is not
an offer and the client is not bound to accept any tender; tender validity
period; who owns the tender documents and what may be done with them;
confidentiality both ways; the tenderer's own costs; canvassing and collusion;
conflicts of interest and how one must be declared; the treatment of a
qualified tender; and the client's right to seek clarification without that
constituting acceptance.

Two things must appear and must be accurate. First, that ETABLIX prepares and
administers this pack for the client and does not award, does not place orders
and does not commit the client to any tenderer — the award is the client's,
made by a named person with delegated authority. Second, where the resulting
contract will contain construction operations, that the payment provisions
comply with Part II of the Housing Grants, Construction and Regeneration Act
1996, and that a package mixing construction operations with pure services is
flagged to the client's own legal advisers rather than settled here.`),

  P("t3", "Scope sheets by package", [3, 3], `Write part 3 of the tender pack: the SCOPE SHEETS BY PACKAGE.

One sheet per package in the working paper's package register, each a separate
issuable document, each under its own heading in the form:

### Scope sheet — <package code> · <package title>

This is what the tenderer prices. Every sheet contains, in this order:

**Boundary.** Where this package starts and stops, as a physical point a
person could stand at and witness — a slab edge and level, a valve, a terminal,
an isolator, a line on a drawing by its number and revision. Not "up to the
building".

**Scope items.** A table, every row an item from the working paper's scope
item register for this package:

| Ref | Item | Requirement source | Quantity | Basis of quantity |

The Ref column carries the SS-<package>.<item> reference from the working
paper, unchanged. It is the join to the pricing schedule and nothing else in
this pack matters as much: change a reference here and the tenderer prices a
different item from the one specified.

Where the quantity is unknown, write UNKNOWN in the quantity column and say in
the basis column what it depends on and who will confirm it. Never invent a
quantity to make a line look complete.

**Attendances and interfaces.** What the client or another package provides to
this one, and what this package provides to others, each naming the other
package by its code. An attendance nobody names is priced by nobody.

**Acceptance.** What evidence the contractor must produce for the work to be
accepted, and who accepts it.

**Exclusions.** What is deliberately not in this package, and which package
carries it instead. An exclusion that names no other package is a gap.

Every line of every sheet traces to the approved requirements package. Where
the requirements package is silent, the sheet says
[NOT SPECIFIED — client to confirm before issue] and the item goes to the
open-items table in part 8. Nothing in this pack is invented here.`),

  P("t4", "Pricing schedule", [4, 4], `Write part 4 of the tender pack: the PRICING SCHEDULE, BLANK AND PRICEABLE.

This is the document the tenderer fills in and returns. It is issued blank:
you write the lines, the units and the quantities, and you leave every rate
and every amount empty for the tenderer.

One table per package, under a heading naming the package, with EXACTLY these
columns and these headings:

${COLS}

- **Ref** — the pricing line's own number within the package: 1, 2, 3 …
- **Scope ref** — the SS-<package>.<item> reference of the scope item this
  line prices, copied exactly from the scope sheet in part 3. Every line
  carries one. This is checked by the system before the pack can be issued.
- **Description** — the item as the scope sheet words it.
- **Unit** — one of: ${UNITS.slice(0, 16).join(", ")}, or another stated unit
  of measurement. Never "as required", never blank, never a dash. A line with
  no unit comes back priced in whatever unit each tenderer chose, and their
  returns are then not comparable at all.
- **Quantity** — the quantity from the scope sheet, or PROVISIONAL where the
  scope sheet marks it unknown, with a stated provisional quantity the
  tenderer prices against so that the returns stay comparable.
- **Rate** and **Amount** — left blank. The tenderer prices them.

THE RULE THAT DECIDES WHETHER THIS PACK CAN BE ISSUED: every scope item in
part 3 has at least one line here, and every line here names a scope item that
exists in part 3. A scope item with no line is work the tenderer is instructed
to do and given nowhere to price, so it returns after award as a variation at
their rate. A line naming a scope item that does not exist is a price every
tenderer guesses at and no two guess alike. Both are checked by the system on
every run and both stop the pack being issued.

After the package tables, three things:

**Summary of tender.** A table listing each package with a blank total, then a
blank grand total, so the tenderer's own arithmetic is visible.

**Rates for change.** The rates that will value variations and additional
work: labour by trade per hour, plant per unit per period, and any recurring
service per period. Blank for the tenderer to complete. A pack without these
prices change at whatever rate is quoted on the day.

**Pricing rules.** How the schedule is to be completed: that every line is
priced or marked INCLUDED IN LINE <ref>; that a blank line will be treated as
included at no cost; that provisional quantities will be remeasured against
the stated rate; that the currency is pounds sterling; whether rates are fixed
or indexed and against what; and that a qualification written on the schedule
must also appear on the form of tender in part 7 or it will not be considered.`),

  P("t5_6", "Return forms", [5, 6], `Write parts 5 and 6 of the tender pack. Each is a separate issuable document
and each is a FORM THE TENDERER COMPLETES — headed questions with the space,
the word limit and the evidence named against each, not a description of what
should be asked.

## 5 · Technical submission requirements and return form
The questions that produce the evidence the evaluation model in the working
paper actually scores. Every question maps to a criterion and says so.

For each question: its number, the criterion it is evidence for, the question
itself, what must be provided with the answer, and the limit — pages, words or
a stated format. Where the evaluation model gives a scoring descriptor, print
it under the question so the tenderer knows what a good answer looks like;
a criterion whose descriptor is withheld is scored on a standard the tenderer
was never told.

Cover at least: method and how the scope will be delivered; programme and
mobilisation against the required-on-site date; resource and key personnel;
health, safety and CDM competence with the duty holder's arrangements;
quality, inspection and the acceptance evidence the scope sheets require;
environmental and waste; and the interfaces named in the scope sheets and how
the tenderer proposes to hold them.

## 6 · Commercial submission requirements and return form
What the tenderer returns alongside the priced schedule. Cover: the completed
pricing schedule from part 4; confirmation of the contract form and any
departure from it, item by item, which is the only place a departure may be
raised; the tenderer's assumptions and exclusions, each cross-referenced to
the scope reference it affects and valued where it can be; insurance evidence
at the limits the contract requires; financial standing evidence as the
requirements package sets it; the payment mechanism and any indexation
proposed; and sub-contracting and supply chain.

State that an exclusion or assumption not declared on this form and not
declared on the form of tender in part 7 will be treated as not made — and
that this is how the client keeps every return on one basis, so that the
lowest number is the lowest price rather than the largest omission.`),

  P("t7_8", "Form of tender and issue register", [7, 8], `Write parts 7 and 8 of the tender pack.

## 7 · Form of tender, certificates and declarations
The document the tenderer signs and returns. Write it as the form itself, with
the blanks shown as fields to complete, not as a description of a form.

It must contain: the tenderer's legal name, registered number and address; the
project and package tendered for; the tender sum in figures and in words; the
tender validity period; a statement of the documents and revisions the tender
is based on, listed from the issue register in part 8; a declaration that any
qualification is stated on this form or is not made; the certificate of
non-collusion; a declaration of any conflict of interest; a modern slavery and
labour standards declaration where the requirements package requires one; and
the signature, name, position and date of a person authorised to bind the
tenderer.

Include one line the client's own procurement rules almost always need and
which packs routinely omit: an acknowledgement that the client is not bound to
accept the lowest or any tender.

## 8 · Issue register and issue certificate
The document control record, and the check that says whether the pack may
leave.

**Issue register.** Every document in this pack and every document referenced
by it. Columns: document, part number, revision, author, status, and whether
it is issued FOR PRICING or FOR INFORMATION. That last column decides who
carries the risk in the document, so no row may be blank.

**Timetable as issued.** Every date from the working paper, with anything not
yet set shown as [DATE TO BE INSERTED BY THE CLIENT BEFORE ISSUE].

**Open items that must close before issue.** Everything from table E of the
working paper, plus anything a scope sheet marked
[NOT SPECIFIED — client to confirm before issue] and every requirement marked
[PROPOSED — client approval required] whose approval is not evidenced.
Columns: the item, the part it affects, why it prevents issue, who closes it,
and by when, worked back from the issue date.

**Issue certificate.** State plainly: that this pack is assembled from the
approved Site Management Requirements Package and adds no requirement to it;
that the scope sheets and the pricing schedule are reconciled by reference and
the result is recorded; that the client issues the pack, not ETABLIX; and that
a pack issued with open items outstanding returns priced assumptions instead
of prices.`),
];

export const FINAL_TASK = `Every part is written. Two things remain.

## 0 · ISSUE SUMMARY IN ONE PARAGRAPH
Write it first though it is read first. One paragraph, no bullets. It must
say: how many packages and how many scope items the pack puts to market; the
single item most likely to change what tenderers price and why; whether the
timetable delivers the required-on-site date; and whether anything is
outstanding that prevents issue, named. Somebody who reads only this paragraph
must know whether this pack can go out on Monday.

## A · TRACEABILITY AND OPEN ITEMS
Two tables.

First, traceability: every scope item traced to the requirements package.
Columns: the SS reference, the requirements package section it came from,
whether it is priced in part 4 and on which line, and whether the source was a
client mandate or an ETABLIX proposal. Every row of this table is a row a
tenderer will price, so an untraced row is listed as untraced and never
quietly dropped.

Second, open items: everything that must close before the pack is issued, with
who closes it and by when.

Then say what the requirements package did not settle and what it prevented in
this pack. Be specific: name the section, say which part of the pack it left
open, and say what was done instead. Nothing in this pack may rest on an
assumption that is not visible on the page.`;

export const BRIEF_SYSTEM = `You are Agent 13 — Tender pack assembler.

You take an APPROVED Site Management Requirements Package and produce the
files that actually go to market: the instruction to tenderers, the conditions
of tendering, a scope sheet for every package, the blank pricing schedule the
tenderer fills in, the technical and commercial return forms, the form of
tender, and the issue register. Eight parts, under these exact headings, in
this order. Each is a separate issuable document and is written as that
document, addressed to the tenderer, not as a report about it.

Four rules bind this agent and none of them bends.

THIS IS AN ASSEMBLY, NOT A SECOND OPINION. Every obligation in this pack comes
from the approved requirements package. You do not re-decide what it settled,
you do not improve on it, and you do not fill its silences. Where it is silent,
the pack prints [NOT SPECIFIED — client to confirm before issue] and the item
goes to the open-items table. A gap closed quietly here becomes a requirement
in a contract that nobody approved.

SCOPE AND PRICE ARE ONE DOCUMENT IN TWO PARTS. Every scope item carries the
reference SS-<package>.<item>. Every line of the pricing schedule names the
scope reference it prices, in a column headed exactly "Scope ref". The system
reconciles the two sets on every run: a scope item with no priced line, or a
priced line naming a scope item that does not exist, stops the pack being
issued. This is checked by machine, not by eye, so the references must be
exact and must be copied rather than retyped from memory.

EVERY LINE IS PRICEABLE. A line the tenderer cannot price is worse than no
line: it comes back priced on an assumption you did not see. Every pricing
line names a unit of measurement and a quantity or a stated provisional
quantity. "As required", "TBC", "as necessary" and a blank unit are not
priceable and must not appear in the unit or quantity columns.

NOTHING IS DATED THAT HAS NOT BEEN DECIDED. A date the client has not set is
printed as [DATE TO BE INSERTED BY THE CLIENT BEFORE ISSUE]. Inventing a
plausible date creates a tender programme the client never agreed and a
deadline a tenderer may rely on.

Boundary: ETABLIX prepares and administers this pack; the CLIENT issues it and
the CLIENT awards. ETABLIX does not award, does not place orders and does not
commit the client to any tenderer. This pack is a drafting service, not legal
advice: where a position is significant legal exposure — a payment mechanism
mixing construction operations with pure services, a liability cap, an
indemnity — it is flagged for the client's construction solicitor rather than
settled. Nothing in this pack appoints ETABLIX as Principal Contractor under
CDM 2015.`;

export const FIELDS = [
  { name: "client", label: "Client / organisation", type: "text", required: true },
  { name: "project", label: "Project / site", type: "text", required: true },
  { name: "handover", label: "Date the approved requirements package was handed over — the pack is due ten working days after this", type: "date", required: true },
  { name: "requirements", label: "The APPROVED Site Management Requirements Package, in full — this pack is assembled from it and adds nothing to it", type: "textarea", required: true },
  { name: "timetable", label: "The tender timetable the client has set — issue, clarification window, return, evaluation, award, required on site", type: "textarea" },
  { name: "tenderers", label: "Who the pack is going to, and how they were selected", type: "textarea" },
  { name: "contract", label: "The contract form the client has confirmed, and any departure from what the requirements package recommended", type: "textarea" },
  { name: "clarifications", label: "How clarifications are handled and where returns go — portal, address, deadline and time of day", type: "textarea" },
  { name: "returnform", label: "The client's own required forms, portal fields or standard declarations that must be carried in the pack", type: "textarea" },
  { name: "confidentiality", label: "Confidentiality, data protection and information-security terms the tenderer must accept", type: "textarea" },
  { name: "governance", label: "The client's procurement rules and who signs the award", type: "textarea" },
  { name: "approvals", label: "Which [PROPOSED] requirements the client has since approved — anything not listed here stays an open item", type: "textarea" },
];

export const SECTIONS = [
  ["t1", "Instructions to tenderers"],
  ["t2", "Conditions of tendering"],
  ["t3", "Scope sheets by package"],
  ["t4", "Pricing schedule"],
  ["t5", "Technical submission requirements and return form"],
  ["t6", "Commercial submission requirements and return form"],
  ["t7", "Form of tender, certificates and declarations"],
  ["t8", "Issue register and issue certificate"],
];

/** The two parts the reconciler compares, by section id. */
export const SCOPE_SECTION = "t3";
export const PRICE_SECTION = "t4";
