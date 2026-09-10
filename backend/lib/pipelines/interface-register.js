/**
 * Agent 3 — Site-System Design Coordinator: the living interface register.
 *
 * THE PROMISE THIS AGENT EXISTS FOR. Model 02 sells "one management team owns
 * every supplier interface, mobilisation gate, readiness check and daily
 * operating rhythm across all packages", and the business's whole thesis is
 * that projects fail at the unowned interfaces between fifteen and twenty-five
 * supplier packages rather than inside them.
 *
 * Three agents already produce an interface matrix. The diagnostic produces a
 * supplier-interface matrix, Agent 9 produces an interface and responsibility
 * matrix, and Agent 3 drafted one as a single pass. ALL THREE PRODUCE IT ONCE.
 * "One management team owns every supplier interface" across a sixty-week
 * appointment is a register that changes every month, and nothing maintained
 * one — which meant the promise with the most machinery behind it in the
 * marketing had the least behind it in the system.
 *
 * WHAT MAKES A LIVING REGISTER DIFFERENT FROM A ONE-OFF MATRIX. It can lose a
 * row. An interface open in March and absent in April has either been closed,
 * which is a fact somebody must be told, or been lost — and nothing on
 * April's register distinguishes the two. The lost one is discovered six
 * months later by the person standing at the boundary with two contractors
 * who each believe it is the other's.
 *
 * So the register is issued with a MOVEMENT LOG, written in its own pass
 * after it, and lib/interfacecheck.js reconciles the two by machine on every
 * run: every row in the register is logged as opened or carried forward, and
 * every logged row that is not closed is in the register. Neither can lose a
 * row without the other contradicting it.
 *
 * AND AN INTERFACE WITH NO OWNER CANNOT BE ISSUED. "Both", "shared", "the
 * team" and a blank are the same answer, and it is the answer the appointment
 * exists to refuse. It is refused by a function rather than by a house style.
 */

import { REGISTER_COLUMNS, MOVEMENT_COLUMNS, MOVEMENTS } from "../interfacecheck.js";

const REG = REGISTER_COLUMNS.map((c) => `| ${c} `).join("") + "|";
const MOV = MOVEMENT_COLUMNS.map((c) => `| ${c} `).join("") + "|";

export const RECONCILE_TASK = `Do not write any part of the register yet.

Build the INTERFACE WORKING PAPER: every package, every boundary between two
of them, and everything the information supplied says about who owns each,
set down once so the register written afterwards is complete rather than
representative.

## A · PACKAGE REGISTER
Every package in the site-services system. Columns: the package code exactly
as the information supplied gives it, the package title, what it delivers in
one line, and the supplier if one is appointed.

If no codes are in use, allocate P01, P02 and so on in the order the packages
appear and say in a note that you did. If a previous register is supplied,
KEEP ITS CODES — renumbering somebody's packages destroys the comparison with
every earlier issue.

## B · THE PREVIOUS REGISTER, AS IT STOOD
If a previous interface register is supplied, reproduce it: every reference,
what it was between, its owner, its state and its date. Verbatim, not
summarised.

This table is the reason a row cannot be lost. Every interface in it must
appear in this month's register or be logged as closed, and the system checks
that. If no previous register is supplied, say so plainly here — this will be
the first issue and there is nothing to carry forward.

## C · EVERY BOUNDARY IN THE SYSTEM
Now work out the interfaces, whether or not anybody has recorded them. For
every pair of packages that touch — physically, in sequence, or through a
service — one row: the two packages, what passes between them, and in which
direction.

Be exhaustive rather than tidy. An interface nobody has written down is
exactly the one this register exists to find, so a boundary you suspect and
cannot evidence goes in and is marked as suspected.

Cover at least: physical handovers of ground, slab, structure or enclosure;
service connections in and out, for power, water, foul, data and gas;
sequence dependencies where one package cannot start until another finishes;
shared access, laydown, crane and lifting zones; attendances one package
provides to another; and the acceptance and testing points between them.

## D · WHAT THE RECORD SAYS ABOUT OWNERSHIP
For every boundary in table C: who the information supplied says owns it, the
source for that, and whether the source is a contract, an instruction, a
meeting note or an assumption. Mark the class.

An ownership resting on a meeting note is not owned, and saying which class it
rests on here is what stops that becoming a register row that looks settled.

## E · WHAT CANNOT BE ESTABLISHED
Every boundary where ownership cannot be established, the physical point is
not defined anywhere, or two sources disagree. Columns: the boundary, what is
missing, what it prevents, and who must settle it.

Never settle one by choosing an owner. An interface assigned by this agent
rather than by a person is an interface nobody has actually accepted, and the
first time it matters is the first time anybody finds out.`;

const P = (key, label, range, task) => ({ key, label, range, task });

export const SECTION_PASSES = [
  P("d1_2", "Packages and the register", [1, 2], `Write parts 1 and 2 of the interface register report.

## 1 · Package boundary matrix
Every package, and where its scope stops. Columns: the package code, the
title, what it delivers, the supplier if appointed, and the boundary of its
scope stated as a physical point rather than a description.

Then, under the table, the packages that touch each other, as a list of pairs.
This is what the register in part 2 is built from, so a pair missing here is
an interface missing there.

## 2 · The interface register
The register itself, and the document the appointment is judged on. One row
per interface, with EXACTLY these columns and these headings:

${REG}

- **Ref** — IF-<n>. IF A PREVIOUS REGISTER IS SUPPLIED, EVERY REFERENCE IN IT
  KEEPS ITS NUMBER. New interfaces continue the series from the highest number
  ever used, never from the highest still open. A reused reference makes two
  different interfaces look like one across two issues.
- **Between** — the two packages by their codes, in the direction the handover
  goes: "P01 → P02".
- **The physical point** — where one package stops and the next starts, as a
  point a person could stand at and witness. A slab edge and a level; a valve,
  terminal or isolator by its tag; a line on a drawing by its number and
  revision. NOT "up to the building", not "at the boundary", not "as shown".
  A boundary nobody can stand at cannot be handed over or accepted, and this
  column is checked by the system.
- **Owner** — ONE named accountable party. A role and, where the information
  supplies it, a person. "Both", "shared", "joint", "the team", "TBC" and a
  blank are the same answer and the system refuses all of them: an interface
  owned by two parties is owned by neither, which is the exact condition this
  appointment exists to eliminate. Where ownership genuinely has not been
  decided, the row still names the party who must decide it and the state says
  OWNER NOT AGREED.
- **State** — Open, At risk, Ready, Accepted or Closed.
- **Date required** — a real date, worked back from the receiving package's
  need. Not "TBC", not a month, not "as programme".
- **Accepted by** — who signs it off, and against what evidence.

Under the table, three counts: interfaces open, interfaces at risk, and
interfaces whose date falls inside the next thirty days.

Every interface in table B of the working paper appears here or is logged as
CLOSED in part 3. The system compares the two.`),

  P("d3", "What moved this period", [3, 3], `Write part 3 of the interface register report: THE MOVEMENT LOG.

This is what makes the register a living document rather than a monthly
re-issue of the same table, and it is the part the system checks the register
against.

One row per interface that CHANGED, plus one row per interface CARRIED
FORWARD unchanged, with EXACTLY these columns:

${MOV}

- **Ref** — the IF-<n> reference from part 2, or from the previous register
  where the interface has been closed and is no longer in part 2.
- **Movement** — exactly one of: ${MOVEMENTS.join(", ")}. One word from that
  list, not a sentence. A movement column with free text in it cannot be
  compared with next month's, which is the only thing a movement log is for.
- **What changed** — the old value and the new one. "Owner: Delivery Lead →
  Temporary Works Coordinator". Not "updated".
- **Why** — the reason, and the document or instruction it came from.
- **Authorised by** — who agreed it. An owner changed by nobody has not
  changed; it has been reassigned by a report.

THE RULE THE SYSTEM ENFORCES, IN BOTH DIRECTIONS. Every interface in the
register in part 2 appears here as OPENED or CARRIED FORWARD. Every interface
here that is not CLOSED appears in the register. An interface that was open at
the last issue and is absent from this one, without a CLOSED entry, has been
LOST — and a register that has quietly lost a row is worse than no register,
because the handover nobody owns is now believed to be owned.

Under the log:

**Closed this period.** Each one, with what was accepted, by whom, on what
date, and against what evidence. A closure with no evidence is an interface
that will be reopened by the first person to look for the record.

**Opened this period.** Each one, and what created it — a package let, a
design change, a programme change, or an interface that existed all along and
was found this month. That last category is the honest one and it should not
be quietly filed as new.`),

  P("d4_5", "Risk and demand", [4, 5], `Write parts 4 and 5 of the interface register report.

## 4 · Interfaces at risk, and what they will cost
Not every interface matters equally. This part says which ones decide the
month.

For each interface at risk: the reference, what happens if it is not resolved
by its date, which package stands still, how many days of float there are, and
what must happen this week. Ordered by the date the consequence bites, not by
how large the consequence feels.

Say plainly which interfaces have no float left. An interface with no float
and no owner is the single most expensive line in this report and it goes
first.

Then the ones where ownership is disputed: who each party says owns it, what
each is relying on, and what it will take to settle. A disputed interface is
worse than an unowned one, because both parties believe it is resolved.

## 5 · Demand and capacity behind the interfaces
Why the interfaces are where they are. The workforce-driven demand — beds,
welfare, office, parking, catering covers — with the calculation basis shown,
and the utilities demand for power in kVA, water and foul, with every
assumption stated.

State the diversity and simultaneity factors used and where they came from.
A demand model whose factors are not stated cannot be challenged, and a
demand model nobody can challenge is an assumption presented as a
calculation.

Then say which interfaces MOVE if the demand changes: if peak headcount rises
twenty per cent, which boundaries have to be renegotiated. That is the
question a client actually asks and it is almost never answered.

Anything touching a life-safety question — a fire strategy, means of escape,
a structural load, an electrical protection scheme — is flagged for a
competent person and, where relevant, the fire and rescue authority, rather
than resolved here.`),

  P("d6_7", "Sequence and change", [6, 7], `Write parts 6 and 7 of the interface register report.

## 6 · Mobilisation and handover sequence
The interfaces in the order they occur, as a sequence somebody can work to.
For each: the reference, the date, the package handing over, the package
receiving, what evidence closes it, and what cannot start until it does.

Mark the long-lead items and the ones that depend on somebody outside the
site-services system — a utility company, a highway authority, a landlord.
Those are the interfaces where our own diligence changes nothing and the only
useful action is starting earlier.

## 7 · Design and programme change, and what it did to the register
Every change this period that created, moved or closed an interface. Columns:
the change, its source, the interfaces affected by reference, and what
happened to each.

A design change that moves a physical point is an interface change even when
nobody records it as one, and this is the table where that is caught. Say
which changes were notified to the packages either side, and which were not —
an interface moved without telling both parties is two parties working to
different boundaries, and both of them are right.`),

  P("d8", "Certificate, decisions and the audit trail", [8, 8], `Write part 8 of the interface register report.

## 8 · Register certificate, decisions required and the audit trail

**Decisions required this month.** Every decision a named person must make,
each with the date it must be made by and which interface it unblocks.
Ordered by that date. Ownership decisions come first: an interface cannot be
managed until somebody owns it.

**What is being carried at risk.** Every interface being carried without an
owner, without a witnessable point or without a date, with the reason and who
has accepted carrying it. Nothing in this state should be invisible.

**The audit trail.** What this register was built from: the documents read,
the previous register's issue and date, and which ownerships rest on a
contract, an instruction, a meeting note or an assumption — with the count in
each class. A register where most ownership rests on meeting notes is a
register that will not survive its first dispute, and the count is the honest
way to say so.

**Register certificate.** State plainly: the issue number and date; the count
of interfaces open, at risk and closed; that every interface carried forward
from the previous issue is either in this register or logged as closed; that
every open interface names one accountable party and a boundary a person could
witness; and that this register records ownership as the project has agreed it
rather than assigning it — an interface assigned by this report and accepted
by nobody is not owned.`),
];

export const FINAL_TASK = `Every part is written. Two things remain.

## 0 · THE REGISTER IN ONE PARAGRAPH
Write it first though it is read first. One paragraph, no bullets. It must
say: how many interfaces are open and how many moved this period; how many
have no owner and which one of those matters most; whether anything carried
forward has been lost; the interface most likely to stop work in the next
thirty days and what would prevent it; and the one ownership decision that
must be made before the next issue, with its date. Somebody who reads only
this paragraph must know where the project is exposed.

## A · TRACEABILITY AND OPEN ITEMS
Two tables.

First, traceability: every interface to the source that establishes it.
Columns: the reference, the two packages, the document or instruction the
boundary comes from, the source that establishes its ownership, and the class
of that source — contract, instruction, meeting note or assumption. A row
resting on an assumption says ASSUMPTION rather than being rounded up.

Second, open items: every unowned interface, every undefined physical point,
every disputed ownership and every undated interface, with who closes it and
by when.

Then say what the information supplied did not allow you to establish, and
what was done instead. Name the packages. An interface this agent could not
resolve is listed as unresolved and never quietly assigned.`;

export const BRIEF_SYSTEM = `You are Agent 3 — Site-System Design Coordinator.

You produce and MAINTAIN the interface register for a site-services system:
the package boundary matrix, the register itself, the movement log, the
interfaces at risk, the demand and capacity model behind them, the
mobilisation and handover sequence, the change that moved them, and the
certificate. Eight parts, under these exact headings, in this order.

This register is reissued every month for the life of the appointment. It is
compared against the previous issue, so the interface references, the package
codes and the table shapes must be STABLE. A renumbered reference makes two
different interfaces look like one, and that is worse than a gap.

Four rules bind this agent and none of them bends.

EVERY INTERFACE HAS ONE NAMED OWNER. One accountable party. "Both",
"shared", "joint", "the team", "TBC" and a blank are the same answer, and the
system refuses all of them — an interface owned by two parties is owned by
neither, which is the exact condition this appointment exists to eliminate.
Where ownership has genuinely not been decided, the row names the party who
must decide it and the state says OWNER NOT AGREED. It is never left empty and
it is never filled in by you.

EVERY BOUNDARY IS A POINT A PERSON COULD STAND AT. A slab edge and a level, a
valve or isolator by its tag, a line on a drawing by its number and revision.
Not "up to the building", not "at the boundary", not "as shown". A boundary
nobody can stand at cannot be handed over or accepted, so the interface is
unresolved however many other columns are filled in. This column is checked.

THE REGISTER AND THE MOVEMENT LOG MUST AGREE. Every interface in the register
is logged as OPENED or CARRIED FORWARD; every logged interface that is not
CLOSED is in the register. The system reconciles the two on every run. An
interface that was open at the last issue and is absent from this one, with no
CLOSED entry, has been LOST — and a register that has quietly lost a row is
worse than no register, because a handover nobody owns is now believed to be
owned.

YOU RECORD OWNERSHIP, YOU DO NOT ASSIGN IT. Where the information supplied
does not establish who owns an interface, that is what the register says. An
owner written in by this agent and accepted by nobody is not an owner; it is a
row that looks settled, which is more dangerous than a row that looks open.

Boundary: decision support. Every design position, load, ratio, diversity
factor and duration is a first-pass planning figure for validation by a
competent person. Anything touching life safety — a fire strategy, means of
escape, a structural load, an electrical protection scheme — is flagged for a
competent person and, where relevant, the fire and rescue authority, and never
resolved here. You do not appoint anybody, do not instruct change, do not
accept work and do not close an interface: you record that somebody else has.`;

export const FIELDS = [
  { name: "client", label: "Client / organisation", type: "text", required: true },
  { name: "project", label: "Project / site", type: "text", required: true },
  { name: "period", label: "The issue — issue number and date, and the period since the last one", type: "text", required: true },
  { name: "packages", label: "The packages in the site-services system, with their codes and what each delivers", type: "textarea", required: true },
  { name: "previous", label: "THE PREVIOUS INTERFACE REGISTER, in full. Every reference in it must be carried forward or logged as closed — the references must not be renumbered", type: "textarea" },
  { name: "workforce", label: "Workforce curve and peak numbers, shift pattern, occupancy needs", type: "textarea" },
  { name: "site", label: "Site constraints — location, area, access, environment, existing services, and the drawings by number and revision", type: "textarea" },
  { name: "programme", label: "Programme — key dates, phases, required-on-site dates per package", type: "textarea" },
  { name: "ownership", label: "What establishes ownership: contracts, instructions, meeting notes. Say which is which — an ownership resting on a meeting note is not owned", type: "textarea" },
  { name: "change", label: "Design and programme change this period, and anything a package has raised about a boundary", type: "textarea" },
  { name: "disputes", label: "Any interface where two parties disagree about who owns it, and what each is relying on", type: "textarea" },
];

export const SECTIONS = [
  ["d1", "Package boundary matrix"],
  ["d2", "The interface register"],
  ["d3", "Movement log"],
  ["d4", "Interfaces at risk"],
  ["d5", "Demand and capacity behind the interfaces"],
  ["d6", "Mobilisation and handover sequence"],
  ["d7", "Design and programme change"],
  ["d8", "Register certificate, decisions required and the audit trail"],
];

/** The two parts the reconciler compares, by section id. */
export const REGISTER_SECTION = "d2";
export const MOVEMENT_SECTION = "d3";
