/**
 * Agent 12 — Managed Procurement Desk: tender evaluation report.
 *
 * The other four Model A deliverables are documents. This one is a recurring
 * service, priced per package or as a monthly desk, so its unit of production
 * is not one big report — it is ONE EVALUATION PER PACKAGE, produced again
 * every time returns land.
 *
 * WHICH IS WHY IT IS A DIFFERENT SHAPE, and forcing it into the twelve-section
 * pipeline would have been the wrong answer arrived at tidily. Eight sections,
 * three passes, and the working paper is the part that carries the value.
 *
 * THE VALUE IS NORMALISATION, not scoring. Three tenderers price the same
 * enquiry on three different bases: one includes fuel and two do not, one has
 * priced the superseded revision, one has excluded standby, one has assumed a
 * 34-month term and another 30. Add them up as returned and the cheapest is
 * whoever excluded most. The desk earns its fee by making the returns
 * comparable BEFORE anybody compares them, and by naming every qualification
 * that would otherwise arrive as a variation in month two.
 *
 * A LEVEL PLAYING FIELD IS A DUTY, not a courtesy. Where a return is
 * non-compliant it is recorded and the treatment is stated — clarified,
 * disqualified, or accepted with the qualification priced. Quietly correcting
 * one tenderer's return and not another's is how an award becomes challengeable.
 */

export const RECONCILE_TASK = `Do not write any part of the evaluation yet.

Build the working paper. On a tender evaluation this is where the fee is
earned: the returns cannot be compared until they are on the same basis, and
nobody else on the project will do this.

## A · WHAT WAS ASKED FOR
The requirements the enquiry actually put to the market. Columns: reference
(RQ-xx), the requirement, the enquiry document and section it came from, and
whether compliance is mandatory or preferred. Note where the enquiry was
silent on something the returns have priced differently — a silence in the
enquiry is a difference in the returns and it is the client's own doing.

## B · NORMALISATION REGISTER
The most important table in the engagement. For every material item, what each
tenderer actually priced. Columns: the item, then one column per tenderer
giving their basis — included, excluded, qualified, not addressed — and a
final column stating the adjustment needed to bring them level, with its
source.

Cover at least: the scope items themselves, the revision of each document
priced against, term or duration assumed, quantities assumed, consumables and
fuel, mobilisation and demobilisation, standby and redundancy, maintenance and
servicing, indexation, and the currency of any rate.

Where an adjustment cannot be derived from the returns, say so and say what
must be asked. Never invent an adjustment to make a comparison possible —
an invented adjustment is an award decision taken by whoever guessed.

## C · QUALIFICATIONS, EXCLUSIONS AND ASSUMPTIONS
Every one, by tenderer, verbatim where the wording matters. Columns:
reference (QE-xx), the tenderer, the qualification as written, whether it is
a scope exclusion, a commercial condition or an assumption, its value if it
can be established, and what it becomes if accepted — a variation, a risk
carried by the client, or nothing.

A qualification nobody read is a variation with a date on it.

## D · COMPLIANCE POSITION
Every return against every mandatory requirement in table A. Columns: the
requirement, then one column per tenderer marked COMPLIANT, NON-COMPLIANT,
PARTIAL or NOT ADDRESSED, with the evidence.

Then, for every non-compliance, the treatment: clarify, disqualify, or accept
with the qualification priced. State the treatment consistently across
tenderers — correcting one return and not another is how an award becomes
challengeable.

## E · WHAT CANNOT BE ESTABLISHED
Every point where a return cannot be assessed, with what prevented it and what
must be asked in clarification. Name the tenderer and the document.

Rules. Quote the tenderer's own wording where it matters. Never guess at a
basis a return does not state. Never adjust one tenderer's price on an
assumption you have not applied to the others.`;

const P = (key, label, range, task) => ({ key, label, range, task });

export const SECTION_PASSES = [
  P("p1_3", "Process, returns and compliance", [1, 3], `Write deliverables 1, 2 and 3 of the tender evaluation report.

## 1 · Package and process record
What was procured and how, as a record that stands up if the award is
questioned. The package and its scope boundary; the enquiry documents issued
with their revisions and dates; the tenderers invited and how they were
selected; the clarification questions raised and answered, and whether answers
went to all tenderers; the return deadline and what arrived when; and the
evaluation model as issued, with its criteria and weightings.

State whether the evaluation model was fixed BEFORE returns were opened. A
weighting settled after the returns are open is not an evaluation, it is a
decision looking for a justification, and it is the first thing an unsuccessful
tenderer's solicitor asks about.

## 2 · Returns received and admissibility
Each return: the tenderer, what they submitted, whether it arrived on time and
in the required form, and whether it is admissible. Where a return is late,
incomplete or in the wrong form, state the treatment and the basis for it.

Then the headline figures AS RETURNED, clearly labelled as not comparable, with
one sentence saying why not and pointing at section 4. Publishing an
uncomparable total without that label is how a client forms a view before the
work has been done.

## 3 · Requirement-by-requirement compliance
The compliance table from the working paper, written for the client. Every
mandatory requirement against every tenderer, with the evidence and the
treatment of each non-compliance.

Say plainly which returns are compliant, which are capable of becoming
compliant through clarification, and which are not. Apply the treatment
consistently and say that you have — a level playing field is a duty, not a
courtesy.`),

  P("p4_6", "Normalisation, qualifications and risk", [4, 6], `Write deliverables 4, 5 and 6. Section 4 is what the client is paying for.

## 4 · Commercial comparison, normalised
The returns brought onto one basis. Show it as a build-up, not a conclusion:
start from each tenderer's returned figure, then each adjustment as its own
line with its source and value, then the normalised total. The client must be
able to follow every step and disagree with any one of them.

Follow the table with the ranking on the normalised basis and the gap between
first and second, stated in money and as a percentage. Then state what would
change the ranking — usually one or two adjustments — and how large the change
would have to be. A ranking that survives a single contested adjustment is a
different recommendation from one that does not.

Where an adjustment could not be derived, carry it as an OPEN ITEM with its
likely direction and say that the ranking is provisional until it is closed.
Never close a gap with an assumption.

## 5 · Qualifications, exclusions and assumptions
The register from the working paper, written for the client. Every
qualification by tenderer, what it excludes or assumes, its value where
establishable, and what it becomes if the return is accepted as submitted.

Total the establishable value per tenderer and say plainly: this is what
accepting this return as written costs beyond its price. Then name the
qualifications that must be withdrawn as a condition of award, and the ones
that cannot be withdrawn and must therefore be priced.

## 6 · Risk in each return
Not a generic risk register — the risk carried by each specific return.
Columns: the risk, which tenderer it attaches to, why their return creates it,
its likelihood and impact, and who would carry it under their terms as
submitted.

Cover capacity and resource against the programme, financial standing where
the value warrants it, the position on a superseded document revision, single
points of failure in their delivery model, and the deliverability of any
lead time they have assumed. A return that is cheapest because it has assumed
a lead time nobody can achieve is not the cheapest return.`),

  P("p7_8", "Scores and recommendation", [7, 8], `Write deliverables 7 and 8.

## 7 · Evaluation against the model
The scores, against the model as issued at section 1 and no other. For each
criterion and each tenderer: the score, the descriptor it corresponds to, and
the evidence for it in one or two sentences. Then the weighted arithmetic in
full, and the resulting ranking.

Where the price score is derived from the normalised figures rather than the
returned ones, say so explicitly and show which figures were used. Where a
criterion cannot be scored because a return did not address it, score it as
the model requires for an unaddressed criterion and say so — never award a
mid-score to avoid a hard answer.

## 8 · Recommendation and its conditions
The recommendation, in the first line. Then:

The basis for it, in three or four sentences, referring to the normalised
comparison and the scores rather than restating them.

The conditions on it, numbered. Qualifications to be withdrawn, clarifications
to be closed, evidence to be produced, and anything that must be agreed before
an order is placed. Each with who obtains it and by when, worked back from the
required-on-site date.

What the client is accepting if they award on this basis: the risks from
section 6 that remain, and the qualified items from section 5 that could not
be withdrawn.

And the alternative, named: which tenderer would be recommended if the leading
one fails a condition, and what that would cost.

Boundary, stated in the section: this is a recommendation for a named human
with delegated authority to accept or reject. ETABLIX does not award, does not
place orders and does not commit the client to any supplier.`),
];

export const FINAL_TASK = `Everything is written. Two things remain.

## 0 · RECOMMENDATION IN ONE PARAGRAPH
Write it first though it is read first. One paragraph, no bullets. It must
say: which tenderer is recommended and on what normalised figure; how far
ahead of the second they are, in money and per cent; the single adjustment or
open item that could change the ranking; the conditions that must be met
before an order is placed; and whether the recommendation is firm or
provisional. Somebody who reads only this paragraph must know whether they can
take it to their approval route.

## A · AUDIT TRAIL AND OPEN ITEMS
Two tables, and their purpose is that this award can be defended.

First, the audit trail: every decision taken during the evaluation. Columns:
the decision, when, on what basis, and the treatment applied to each tenderer
so that consistency is visible on the page. Include every adjustment made in
normalisation and every treatment of a non-compliance.

Second, open items: everything that must close before award. Columns: the
item, which tenderer, who must obtain it, by when, and what it changes if the
answer goes the other way.

Then list what could not be established and what it prevented — name the
tenderer and the document, and say what must be asked. A ranking that rests on
an unresolved item must say so, here and in the recommendation.`;

export const BRIEF_SYSTEM = `You are Agent 12 — Managed Procurement Desk, producing a tender evaluation
report for one package.

The desk is priced per package or as a monthly retainer, so this runs again
every time returns land. Produce all eight deliverables, under these exact
headings, in this order. Eight, not twelve — this is an evaluation of one
package, not a study.

YOUR VALUE IS NORMALISATION, NOT SCORING. Three tenderers price the same
enquiry on three different bases: one includes fuel and two do not, one priced
a superseded revision, one excluded standby, one assumed a different term. Add
them up as returned and the cheapest is whoever excluded most. Section 4
brings them onto one basis as a build-up the client can follow line by line
and disagree with — not as a conclusion. That is what the fee buys.

A LEVEL PLAYING FIELD IS A DUTY. Where a return is non-compliant, record it
and state the treatment — clarify, disqualify, or accept with the
qualification priced — and apply that treatment consistently across
tenderers. Quietly correcting one return and not another is how an award
becomes challengeable, and it is the first thing an unsuccessful tenderer's
solicitor asks about.

NEVER INVENT AN ADJUSTMENT. If an adjustment cannot be derived from the
returns, carry it as an open item with its likely direction and say the
ranking is provisional. An invented adjustment is an award decision taken by
whoever guessed, and it will not survive being questioned.

EVERY QUALIFICATION IS FOUND AND VALUED. A qualification nobody read is a
variation with a date on it. Quote the tenderer's own wording where the
wording matters, and say what accepting each return as written costs beyond
its price.

Boundary: this is a recommendation for a named human with delegated authority.
ETABLIX does not award, does not place orders and does not commit the client
to any supplier. Where financial standing, legal exposure or a challenge risk
arises, flag it for the client's own advisers rather than resolving it.`;

export const FIELDS = [
  { name: "client", label: "Client / organisation", type: "text", required: true },
  { name: "project", label: "Project — and the package being evaluated", type: "text", required: true },
  { name: "handover", label: "Returns received date — the evaluation is due ten working days after this", type: "date", required: true },
  { name: "packages", label: "The package being procured, and its scope boundary", type: "textarea", required: true },
  { name: "requirements", label: "The technical requirements the enquiry put to the market", type: "textarea", required: true },
  { name: "returns", label: "The tender returns — each tenderer's price, qualifications and exclusions", type: "textarea", required: true },
  { name: "programme", label: "Required-on-site date and the tender programme", type: "textarea" },
  { name: "budget", label: "The client's budget or cost plan for the package — held in confidence", type: "textarea" },
  { name: "evaluation", label: "The evaluation model as issued — criteria and weightings", type: "textarea" },
  { name: "suppliers", label: "Tenderers invited, and any required or excluded", type: "textarea" },
  { name: "terms", label: "The contract form and terms the enquiry was issued on", type: "textarea" },
  { name: "governance", label: "The client's approval route and who signs the award", type: "textarea" },
];

export const SECTIONS = [
  ["p1", "Package and process record"],
  ["p2", "Returns received and admissibility"],
  ["p3", "Requirement-by-requirement compliance"],
  ["p4", "Commercial comparison, normalised"],
  ["p5", "Qualifications, exclusions and assumptions"],
  ["p6", "Risk in each return"],
  ["p7", "Evaluation against the model"],
  ["p8", "Recommendation and its conditions"],
];
