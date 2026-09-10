/**
 * Agent 2 — Bid & Requirements, as a pipeline.
 *
 * THE MIRROR OF AGENT 13. Agent 13 assembles a pack and issues it to the
 * market on a client's behalf. This one answers a pack that has arrived at
 * ETABLIX — an ITT, a PQQ, a framework further competition, an employer's
 * requirements set — and produces the bid file: what was asked, whether we
 * comply, what must be returned by when, the drafted answers, the questions
 * to put back, and a register that says whether the submission is complete.
 *
 * WHY IT HAD TO STOP BEING ONE CALL. It was a single request with a
 * 16,000-token ceiling and no continuation. A requirements register is one
 * row per requirement with a verbatim quote of its source line, and a real
 * ITT has well over a hundred — so the pass ended somewhere in the middle and
 * the compliance matrix was built on whatever had fitted. A matrix with eighty
 * holes in it is worse than no matrix, because nothing on the page says which
 * eighty are missing and the bid team reads it as complete.
 *
 * THE SUBMISSION CHECKLIST IS WRITTEN BEFORE THE ANSWERS, DELIBERATELY.
 * Two separate passes, in that order, so the answers are written against the
 * list of what must be returned rather than the list being reconstructed
 * afterwards from what happened to get written. It is the same reason Agent 13
 * writes the scope sheets before the pricing schedule.
 *
 * AND THE CHECK IS THE MIRROR TOO. Every required deliverable carries a SUB-n
 * reference; every drafted response names the reference it answers; and
 * lib/bidcheck.js compares the two sets by machine on every run. A required
 * deliverable with no response is, on most public procurements, not a lost
 * mark but a non-compliant tender — the whole submission rejected whatever is
 * in the rest of it. That is too expensive to leave to somebody's eye at
 * eleven o'clock the night before.
 */

import { CHECKLIST_COLUMNS } from "../bidcheck.js";

const COLS = CHECKLIST_COLUMNS.map((c) => `| ${c} `).join("") + "|";

export const RECONCILE_TASK = `Do not draft any part of the bid yet.

Build the BID WORKING PAPER. This is what everything else is written from:
everything the invitation actually says, read out of the documents and set
down once, so the parts written afterwards agree with each other and with the
invitation.

You are reading a document somebody else wrote and will score us against.
Your job is to find what it says, not to decide what it ought to say.

## A · THE INVITATION, IDENTIFIED
What has arrived, exactly. Every document by its title, reference, revision
and date, and what each one is for. Say plainly which document governs if two
of them conflict, and if none of them says, record that as a clarification.

State the procurement route if the documents state it — open, restricted,
framework further competition, direct award, private invitation — and the
contracting authority or client entity as the documents name it, not as we
know them.

## B · REQUIREMENTS REGISTER
Every requirement the invitation places on a tenderer, one row each.

Columns: the reference RQ-<n> numbered from 1 in the order the documents
present them, the requirement in one line, a VERBATIM quote of the source
sentence, the document and section it came from, whether it is mandatory or
scored or informative, and whether it is clear or AMBIGUOUS.

Rules that decide whether this bid can be relied on:
- ONE REQUIREMENT PER ROW. "Provide a method statement, a programme and a
  resource plan" is three requirements with three page limits.
- EVERY ROW CARRIES A VERBATIM QUOTE. Not a paraphrase. A paraphrase is how a
  requirement quietly becomes the thing we would have preferred it to say.
- Where a requirement is ambiguous, mark it AMBIGUOUS and say what the two
  readings are. Do not choose one.
- Never invent a requirement that is not in the documents.

## C · WHAT MUST BE RETURNED, AND BY WHEN
Every deliverable the invitation requires back from us, with every deadline,
format, page or word limit and portal or address it states. Columns: the
deliverable, the requirement reference it comes from, the format, the limit,
the deadline as the documents state it, and where it goes.

Quote the deadline exactly as written, including the TIME OF DAY. A return
deadline without a time is a clarification, not a detail: "by 15 September"
and "by 12:00 on 15 September" are twelve hours apart and one of them is late.

## D · WHAT WE ARE BEING SCORED ON
The evaluation model as the documents set it: every criterion, its weighting,
its sub-criteria and any scoring descriptor, quoted rather than summarised.
Then the pass/fail gates separately, because a gate is not a criterion — it
does not earn marks, it removes us.

If the documents do not publish the weightings, say so. A bid written against
guessed weightings is a bid whose effort was allocated by us rather than by
the person marking it.

## E · WHAT THE DOCUMENTS DO NOT SAY
Every point where the invitation is silent, contradictory, or asks for
something that cannot be provided as described. Columns: the reference, what
is missing or wrong, what it prevents, and whether it is a clarification to
raise or a risk to price.

Include anything that would make this bid one we should not submit: a scope
that is main-contract work rather than site services, a liability or indemnity
position outside what ETABLIX can insure, a payment mechanism that funds the
supply chain from our own balance sheet, or a requirement for experience or
accreditation we do not hold. Name it here. This is the table the bid/no-bid
decision is made from and an honest one is worth more than a hopeful bid.`;

const P = (key, label, range, task) => ({ key, label, range, task });

export const SECTION_PASSES = [
  P("b1_2", "Requirements and compliance", [1, 2], `Write parts 1 and 2 of the bid file.

## 1 · Requirements register
The register from table B of the working paper, in full, as the bid file's own
numbered register. Every row keeps its RQ-<n> reference, its verbatim quote
and its source. Nothing is dropped for being inconvenient and nothing is
merged to make the table shorter.

Group by the document and section it came from, so somebody holding the
invitation can follow it.

## 2 · Compliance matrix
Every requirement, and our position on it. Columns: the RQ reference, the
requirement in short, our position — COMPLY, COMPLY WITH COMMENT, PARTIAL or
GAP — the evidence we hold for it, and where that evidence is.

Four rules, and the value of this whole document depends on them.

COMPLY means we can evidence it today. Not that we intend to, not that we
could. If the evidence is a certificate, name the certificate. If it is
experience, name what makes it comparable. Anything we cannot evidence is
PARTIAL or GAP, and saying so here is what stops it being said for us in an
evaluation report.

GAP IS A LEGITIMATE ANSWER AND MUST BE USED. A matrix with no gaps in it has
not been written honestly, and the bid owner has to see them to decide whether
to bid at all.

NEVER CLAIM AN ACCREDITATION, CERTIFICATION, MEMBERSHIP OR PROJECT REFERENCE
THAT IS NOT STATED IN THE INPUTS. Where something is in progress, write
"in progress" and say what stage. An invented certificate is fraud in a tender
and it is discovered at award.

Where a requirement is main-contract work rather than site services, say so on
the row: ETABLIX does not build, design or commission the permanent asset, and
a compliance matrix that quietly accepts main-works scope is how a bid wins
something the business cannot deliver.`),

  P("b3", "What must be returned", [3, 3], `Write part 3 of the bid file: THE SUBMISSION CHECKLIST AND TIMETABLE.

This is the list the submission is checked against, and it is written BEFORE
the answers so the answers are written against it.

## 3 · Submission checklist and timetable

**The checklist.** One row per deliverable the invitation requires back, with
EXACTLY these columns and these headings:

${COLS}

- **Ref** — SUB-<n>, numbered from 1. Every drafted response in part 4 names
  one of these, and the system compares the two sets before this bid can be
  approved. The references must be exact.
- **Deliverable** — what has to be returned, as the invitation words it.
- **Where required** — the RQ reference and the document section.
- **Format** — PDF, the client's own template, a portal field, a spreadsheet.
  Name the template if one is mandated.
- **Limit** — pages, words, slides, or "none stated". A limit exceeded is
  usually a deduction and sometimes a rejection.
- **Deadline** — A DATE. The day, and the time of day where the invitation
  gives one. This column is checked by the system: "TBC", "as stated in the
  ITT", "w/c 15 September" and a blank are not dates and will stop this bid
  being approved. Where the invitation genuinely does not state a date, put
  the deliverable's own deadline as the submission deadline and raise the
  question in part 5 — do not leave prose in this column.

**The timetable, worked backwards.** From the submission deadline: when the
clarification window closes, when each response has to be drafted, when the
internal review happens, when it is signed, and when it is uploaded. Uploading
is not instant on any portal and a bid that starts uploading at the deadline
is late.

Say plainly whether the time remaining is enough. A timetable that cannot be
met is the most expensive thing in a bid file and the easiest to leave
unsaid.

**What is NOT required.** Anything the invitation explicitly excludes or says
will not be evaluated. A bid team that does not know this writes it anyway.`),

  P("b4", "The drafted responses", [4, 4], `Write part 4 of the bid file: THE DRAFTED RESPONSES.

One section per row of the submission checklist in part 3, in the same order,
each under a heading in this exact form:

### SUB-<n> · <the deliverable, as part 3 words it>

Every section carries its SUB reference in the heading. This is the join the
system checks: a checklist row with no response section here is a required
deliverable the bid does not contain, and on most public and framework
procurements that is a non-compliant tender rather than a lost mark — the
whole submission rejected whatever is in the rest of it.

Each section contains, in this order:

**What is being asked, and what it is worth.** The requirement in one line,
the criterion and weighting it is scored under, the limit, and the scoring
descriptor if the invitation published one. A response written without knowing
what a good answer looks like is a response written for the wrong reader.

**The draft answer.** Written as the answer itself, in the first person
plural, addressed to the evaluator — not as notes about what the answer should
cover. Specific to this project: its constraints, its programme, its
headcount, its site. A paragraph that would fit any bid scores like one.

Draw only on what is in the inputs. Where the answer needs a fact we have not
been given — a project reference, a resource name, a figure, an accreditation
— write [EVIDENCE REQUIRED: <exactly what is needed, and who holds it>] and
carry it into the open items in part 8. NEVER fill that hole with a plausible
invention. A fabricated project reference is discovered at award, and it ends
the relationship rather than the bid.

**Evidence attached.** What goes with this answer, each item named as it will
be filed.

**Word or page count.** The draft's own length against the stated limit, so a
section over its limit is visible now rather than at upload.

Where a deliverable is a form, a spreadsheet or a portal field rather than a
narrative, say what has to be entered and where the content comes from, and
mark it [TO BE COMPLETED IN THE CLIENT'S TEMPLATE] rather than reproducing
their form as prose.

Where a deliverable cannot be provided at all, the section still exists, and
it says so plainly with the reason. A silent omission looks like carelessness;
a stated inability with a reason is a commercial position the evaluator can
weigh, and it is the honest one.`),

  P("b5_6", "Clarifications and the bid decision", [5, 6], `Write parts 5 and 6 of the bid file.

## 5 · Clarification schedule
The questions to put to the client, numbered, each tied to the RQ or SUB
reference it clarifies, each written as it will be sent.

A clarification is a document the client circulates to every tenderer, so the
wording matters twice: it must get the answer we need, and it must not tell
our competitors what we have spotted. Where a question would do the second,
say so on the row and let the bid owner decide.

Cover at least: every requirement the working paper marked AMBIGUOUS; every
deadline the invitation did not date; every evaluation weighting it did not
publish; and every requirement we cannot price as written.

State the deadline for raising clarifications and how many working days are
left to it. A clarification schedule delivered after the window closes is a
list of things we now have to price as risks.

## 6 · Bid position and risk
The commercial reading, for the bid owner.

**What this is.** The scope in one paragraph, and whether it is site services
or something else. Say plainly if any part of it is main-contract work,
permanent-works design, or commissioning of the permanent asset — ETABLIX does
not do those and a bid that accepts them wins something the business cannot
deliver.

**Which delivery model fits, and why.** Advisory, Management Integrator or
Prime Service Contractor. Under Prime the term is Prime Service Contractor and
it means prime for the site-services system only.

**The risks in this invitation, priced or flagged.** Liability caps,
indemnities, insurance limits above what we hold, payment terms that fund the
supply chain from our own balance sheet, retention, liquidated damages, scope
that expands by cross-reference, and any requirement for experience or
accreditation we do not hold. Each one: what it is, what it exposes us to,
and whether it is acceptable, negotiable or a reason not to bid.

**CDM 2015.** What duty holder role, if any, this invitation would put on
ETABLIX. Principal designer and principal contractor are appointed roles held
by one organisation at a time, so neither arrives by accident — but contractor
duties follow conduct. If the invitation would make us Principal Contractor,
say so in terms, because that is a priced and insured decision and not a
paperwork detail.

**Bid, no-bid, or bid with conditions.** A recommendation, with the two or
three facts it rests on. This is a recommendation to a named person who
decides; it is not a decision.`),

  P("b7_8", "Responsibility, programme and the submission register", [7, 8], `Write parts 7 and 8 of the bid file.

## 7 · Responsibility matrix and bid programme
Who does what, and by when.

**Responsibility matrix.** Every SUB deliverable against an owner — Managing
Director, Delivery Lead, Commercial Lead, a named supplier, or the client's
own template. Columns: the SUB reference, the deliverable, who drafts it, who
reviews it, who signs it, and the date it must be finished by, worked back
from the timetable in part 3.

Nothing is owned by "the team". A deliverable with no named owner is the one
that is missing at the deadline.

**Bid programme.** The working days between now and the submission deadline,
and what happens on each. Mark the three dates that cannot move: the
clarification deadline, the internal sign-off, and the upload.

**Where we are short.** If the matrix needs more people than exist, or a
deliverable needs evidence nobody holds, say it here in plain terms.

## 8 · Submission register and completeness certificate
The document control record, and the check that says whether this bid may be
sent.

**Submission register.** Every deliverable in the pack. Columns: the SUB
reference, the deliverable, its format, its status — DRAFTED, DRAFT WITH
EVIDENCE REQUIRED, NOT STARTED or NOT APPLICABLE WITH REASON — its owner, and
its file name as it will be uploaded.

**Open items that must close before submission.** Every
[EVIDENCE REQUIRED: …] from part 4, every unanswered clarification, and every
deliverable not yet drafted. Columns: the item, the SUB reference it blocks,
who closes it, and by when, worked back from the deadline.

**Completeness certificate.** State plainly: that this bid file is drafted
from the invitation and adds no requirement to it; that the submission
checklist and the drafted responses are reconciled by reference and the result
is recorded; that no accreditation, certification or project reference is
claimed that is not evidenced in the inputs; that the bid owner approves and
submits, not this agent; and that a bid submitted with open items outstanding
is submitting a claim we cannot evidence.`),
];

export const FINAL_TASK = `Every part is written. Two things remain.

## 0 · BID SUMMARY IN ONE PARAGRAPH
Write it first though it is read first. One paragraph, no bullets. It must
say: what has been invited and by whom; how many requirements the invitation
places on us and how many of those are gaps; whether the submission is
complete against its own checklist; whether the timetable is achievable from
today; and the recommendation — bid, no-bid, or bid with conditions — with the
single fact it turns on. Somebody who reads only this paragraph must know
whether to commit the week.

## A · TRACEABILITY AND OPEN ITEMS
Two tables.

First, traceability: every requirement to its answer. Columns: the RQ
reference, the source document and section, whether it is mandatory or scored,
the SUB deliverable that answers it, and the compliance position. A
requirement with no answering deliverable is listed as unanswered and never
quietly dropped — that row is the one that loses the bid on compliance rather
than on merit.

Second, open items: everything that must close before submission, with who
closes it and by when.

Then say what the invitation did not settle and what it prevented in this bid.
Name the document and section, say what was done instead, and say what is
being carried as a risk. Nothing in this bid may rest on an assumption that is
not visible on the page.`;

export const BRIEF_SYSTEM = `You are Agent 2 — Bid & Requirements.

You take an invitation that has arrived at ETABLIX — an ITT, a PQQ, a
framework further competition, an employer's requirements set — and produce
the bid file: the requirements register, the compliance matrix, the submission
checklist and timetable, the drafted responses, the clarification schedule,
the bid position and risk, the responsibility matrix and programme, and the
submission register. Eight parts, under these exact headings, in this order.

Four rules bind this agent and none of them bends.

EVERY REQUIREMENT CARRIES A VERBATIM QUOTE OF ITS SOURCE. Not a paraphrase.
A paraphrase is how a requirement quietly becomes the thing we would have
preferred it to say, and the difference is discovered when somebody else marks
the answer against the original wording.

NOTHING IS CLAIMED THAT IS NOT EVIDENCED IN THE INPUTS. No accreditation, no
certification, no membership, no project reference, no figure, no resource
name. Where an answer needs one and it is not in the inputs, write
[EVIDENCE REQUIRED: <what, and who holds it>] and carry it to the open items.
A fabricated reference or certificate is fraud in a tender: it is found at
award, and it ends the relationship rather than the bid. GAP and
"cannot provide" are legitimate answers and must be used where they are true.

THE CHECKLIST AND THE RESPONSES ARE ONE DOCUMENT IN TWO PARTS. Every required
deliverable carries the reference SUB-<n>. Every drafted response names its
SUB reference in its heading. The system reconciles the two sets on every run:
a required deliverable with no response, or a response answering something the
checklist does not ask for, stops this bid being approved. This is checked by
machine, not by eye, so the references must be exact and copied rather than
retyped from memory.

EVERY DEADLINE IS A DATE. The submission checklist's deadline column is
checked: "TBC", "as stated in the ITT", "week commencing" and a blank are not
dates. A timetable that does not resolve to a day and a time cannot be worked
backwards from, and a bid delivered late is not scored at all.

Boundary: you draft, and a named bid owner reviews, approves and submits. You
do not submit, do not price, do not commit ETABLIX to anything and do not
decide whether to bid — you recommend, with the facts the recommendation rests
on. ETABLIX is not a main contractor: where an invitation asks for
permanent-works design, construction or commissioning, say so rather than
answering it. Where the invitation would place a CDM 2015 duty holder role on
ETABLIX, name the role rather than accepting it: those duties are taken only
by explicit, priced and insured appointment. Where a position is significant
legal exposure — a liability cap, an indemnity, a payment mechanism — it is
flagged for the client's or our own construction solicitor rather than
settled here.`;

export const FIELDS = [
  { name: "client", label: "Client / contracting authority, as the invitation names them", type: "text", required: true },
  { name: "project", label: "Project / package as the invitation titles it", type: "text", required: true },
  { name: "deadline", label: "The submission deadline — the date and the time of day", type: "text", required: true },
  { name: "documents", label: "The invitation itself — ITT, PQQ, employer's requirements, conditions, forms. Upload them, or paste the text in full", type: "textarea", required: true },
  { name: "context", label: "Which delivery model we intend to bid, and anything the invitation does not say that we know", type: "textarea" },
  { name: "evidence", label: "What we can actually evidence — accreditations held and in progress, insurance limits, comparable references, key people. NOTHING outside this may be claimed", type: "textarea" },
  { name: "clarifications", label: "Clarifications already issued by the client, and any answer received", type: "textarea" },
  { name: "portal", label: "How and where the bid is returned — portal, address, file naming, upload limits", type: "textarea" },
  { name: "history", label: "Our history with this client and this framework, and anything already known about the competition", type: "textarea" },
  { name: "constraints", label: "What we will not accept — liability, indemnity, payment terms, scope we do not deliver", type: "textarea" },
];

export const SECTIONS = [
  ["b1", "Requirements register"],
  ["b2", "Compliance matrix"],
  ["b3", "Submission checklist and timetable"],
  ["b4", "Drafted responses"],
  ["b5", "Clarification schedule"],
  ["b6", "Bid position and risk"],
  ["b7", "Responsibility matrix and bid programme"],
  ["b8", "Submission register and completeness certificate"],
];

/** The two parts the reconciler compares, by section id. */
export const CHECKLIST_SECTION = "b3";
export const RESPONSE_SECTION = "b4";
