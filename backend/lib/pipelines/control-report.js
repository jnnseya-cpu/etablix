/**
 * Agent 5 — Project Controls: the monthly control report.
 *
 * WHAT MODEL 02 ACTUALLY SELLS. "Monthly valuations and payment
 * recommendations against evidenced Earned Value, change control, cost coding
 * and forecast reporting" is not a document produced once at the start of an
 * engagement. It is produced on the twenty-fifth of every month for as long as
 * the appointment lasts, which on a sixty-week job is fourteen times, and it
 * is what the monthly management fee buys.
 *
 * Everything it needs already existed and none of it was assembled. The
 * payment timetable is computed in lib/paymentdates.js, the notice deadlines
 * are watched by the automation, the exposure rule guards the reserve and the
 * earned-value gate triggers commercial review below 0.95. What did not exist
 * was the report itself: a person read the records and wrote it.
 *
 * WHY PROGRAMME AND MONEY ARE ONE AGENT AND NOT TWO. Earned value IS the
 * bridge — it is progress expressed in money — so an agent that values work
 * without measuring it is guessing, and an agent that measures progress
 * without valuing it produces something nobody pays against. The old Agent 5
 * did the second half only: lookaheads, delay warnings and a decision list,
 * with no valuation anywhere in it.
 *
 * THE MEASUREMENT COMES BEFORE THE MONEY, IN ITS OWN PASS. Value earned is
 * written first and the payment recommendations are written against it. It is
 * the same ordering as the tender pack's scope before price and the bid file's
 * checklist before responses, and for the same reason: the second document
 * must be constrained by the first rather than reconciled with it afterwards.
 *
 * AND THE CHECK IS THE ONE WITH MONEY IN IT. Every sum recommended for
 * payment names a control account that appears in the earned-value section,
 * and no recommendation exceeds what that account earned. Over-certification
 * is recovered by set-off if the supplier is solvent and not at all if they
 * are not — see lib/controlcheck.js, which refuses the report rather than
 * warning about it.
 */

import { EARNED_COLUMNS, PAYMENT_COLUMNS } from "../controlcheck.js";
import { TERMS } from "../paymentdates.js";

const EARNED = EARNED_COLUMNS.map((c) => `| ${c} `).join("") + "|";
const PAYMENT = PAYMENT_COLUMNS.map((c) => `| ${c} `).join("") + "|";

export const RECONCILE_TASK = `Do not write any part of the report yet.

Build the CONTROL LEDGER. This is the working paper: every number this month's
report will rest on, taken out of the information supplied and set down once,
so the sections written afterwards agree with each other and with the record.

You are reading progress information, applications for payment and supplier
records. Your job is to establish what they say and where they disagree, not
to resolve the disagreement.

## A · CONTROL ACCOUNT REGISTER
Every control account the appointment is measured in, one row each.

Columns: the reference CA-<n> numbered from 1 and kept the same every month,
the account, the package or supplier it belongs to, the budget at award, and
the cost code.

If the information supplied uses its own account codes, keep them in a second
column and map them — never renumber somebody else's cost structure. If it
uses none, allocate CA-1, CA-2 and so on in the order the packages appear and
say in a note that you did, because next month's report must use the same
numbers.

## B · WHAT THE EVIDENCE ACTUALLY SUPPORTS
For every control account: the progress claimed, the progress the evidence
supports, and the gap between them. Columns: the CA reference, what was
claimed and by whom, the evidence relied on, its class — MEASURED, EVIDENCED,
ASSERTED or UNKNOWN — and the position you can defend.

The evidence class is the whole value of this table. A percentage complete
that rests on a supplier's own email is ASSERTED, and a valuation built on
assertion is a valuation that gets reduced when somebody checks it. Say so
here rather than letting it pass into the money.

## C · APPLICATIONS AND THE PAYMENT TIMETABLE
Every application for payment received this period. Columns: the supplier, the
sum applied for, the date the application was received, and the four dates
that follow from it — due date, payment notice by, final date for payment,
pay-less by.

The contract's periods are: due ${TERMS.dueFromApplication} days from a
compliant application, payment notice not later than
${TERMS.paymentNoticeAfterDue} days after the due date, final date
${TERMS.finalDateAfterDue} days after the due date, pay-less notice not later
than ${TERMS.payLessBeforeFinal} days before the final date. Compute every
date. Never leave one as "as per contract".

Flag any application where a notice deadline has already passed. Under Part II
of the Housing Grants, Construction and Regeneration Act 1996 a missed payment
notice makes the sum APPLIED FOR the notified sum, whatever the work is worth.
That is the single most expensive silent failure in this whole report.

## D · CHANGE, AND WHAT IT HAS DONE TO THE NUMBERS
Every change in the period: instructed, notified but not instructed, and
claimed. Columns: the reference, what it is, its status, the value if it has
one, the control account it lands on, and whether it is in the budget, in the
forecast, or in neither.

A change that is in the forecast and not the budget is the beginning of an
overspend. A change that is in neither is a liability nobody has seen.

## E · WHERE THE RECORD CONTRADICTS ITSELF
Every point where two sources disagree, or where a number cannot be
established. Columns: the CA reference, the two positions and their sources,
what it affects, and what must happen to settle it.

Never settle one by choosing. A contradiction reported is a decision somebody
can make; a contradiction resolved silently is a number nobody can defend.`;

const P = (key, label, range, task) => ({ key, label, range, task });

export const SECTION_PASSES = [
  P("c1_2", "Position and earned value", [1, 2], `Write parts 1 and 2 of the monthly control report.

## 1 · Position at the end of this period
Where the appointment stands, for somebody who reads one page. Cover: the
period this report covers and the data date; progress against the baseline by
package; what completed this period; what was due and did not; the critical
path today and whether it has moved; and the services status across the site
establishment.

Say plainly whether the completion date still holds. A control report that
does not answer that has not been written.

## 2 · Earned value by control account
The measurement. One table, every control account from the working paper, with
EXACTLY these columns and these headings:

${EARNED}

- **Ref** — the CA-<n> reference from the working paper, unchanged from last
  month. Every payment recommendation in part 5 names one of these and the
  system compares the two sets, so the references must be exact.
- **Control account** — the account as the register names it.
- **Budget** — the budget at award, as a figure.
- **Value earned this period** — a FIGURE, in pounds. This is the number every
  payment recommendation is measured against. Never "as previously", never
  "see application", never a percentage on its own: a line that cannot be
  added has not been valued.
- **Value earned to date** — cumulative, as a figure.
- **SPI** and **CPI** — to two decimal places, with the basis stated under the
  table.

Where the evidence class in the working paper is ASSERTED or UNKNOWN, value it
at what the evidence supports and say on the row that you have. Valuing what
was claimed rather than what was evidenced is how over-certification happens,
and it happens by being polite rather than by being wrong.

Under the table: every account whose SPI or CPI is below 0.95, named, with
what it means for the outturn. The commercial guardrail triggers a review at
that figure, so an account below it that is not named here is a review nobody
called.`),

  P("c3_4", "Change control and the valuation", [3, 4], `Write parts 3 and 4 of the monthly control report.

## 3 · Change control register
Every change from the working paper, as the register the client's own change
control runs on. Columns: the reference, what it is, who instructed or
notified it, the date, its status — INSTRUCTED, NOTIFIED, CLAIMED or REJECTED
— its value or the reason it has none, the control account it lands on, and
its effect on the completion date.

Then three totals: instructed and valued, notified and not yet valued, and
claimed and disputed. Somebody has to be able to see the size of what is
coming without reading the table.

State plainly for each unvalued change what it will cost to leave unvalued for
another month. A notified change that is not valued becomes a claim, and a
claim is valued by whoever is angriest.

## 4 · Valuation this period
The assessed sum, and how it was arrived at.

For each control account: the value earned this period from part 2, plus
instructed change, less anything not supported by evidence, giving the assessed
value. Then the totals: gross assessed value this period, cumulative to date,
less previously certified, less retention at the contract percentage, giving
the net sum for this period.

Every deduction is named and reasoned on its own line. A valuation with an
unexplained deduction comes back as a dispute, and the dispute costs more than
the deduction.

Where the assessed value is below what a supplier applied for, say by how much
and why, in the words that will go in the payment notice. That notice has a
statutory deadline and drafting it here is the only way it is not drafted at
midnight.

State the retention percentage and its basis. Under Model 02 the client holds
retention, not ETABLIX — say so.`),

  P("c5", "Payment recommendations", [5, 5], `Write part 5 of the monthly control report: THE PAYMENT RECOMMENDATIONS.

This is the part the client acts on. Under Model 02 the client contracts
directly with every supplier and pays them directly — ETABLIX never holds
supply-chain money — so this is a RECOMMENDATION to the client, not an
instruction and not an invoice.

One table, one row per payment, with EXACTLY these columns and these headings:

${PAYMENT}

- **Ref** — the recommendation's own number: 1, 2, 3 …
- **Supplier** — the payee, by their legal name.
- **Control account** — the CA-<n> reference from part 2 that this payment is
  measured against. Every row carries one. THE SYSTEM CHECKS THIS: a payment
  naming an account that does not appear in part 2 is money recommended
  against work nobody measured, and it stops this report being issued.
- **Amount recommended** — a FIGURE in pounds. IT MUST NOT EXCEED THE VALUE
  EARNED ON THAT ACCOUNT IN PART 2. This is also checked by the system. Where
  there is a reason to recommend more — a released retention, an agreed
  advance, a settled claim — put it on its own row against its own account
  and name the authority for it.
- **Due date**, **Final date for payment**, **Pay-less by** — real dates,
  computed from the date each application was received using the contract's
  periods in the working paper. Not "as per contract", not "30 days", not TBC.

Under the table:

**Notices due before the next report.** Every payment notice and pay-less
notice falling due in the next thirty days, with its deadline and who serves
it. A missed payment notice makes the sum applied for payable in full.

**Anything earned and not recommended.** Every control account with value in
part 2 that has no payment row here, with the reason — retention, a withheld
sum, an account measured this period and paid next, or an application not yet
received. The system reports these, so an unexplained omission is visible: it
is how a supplier's application goes unanswered and the sum they applied for
becomes payable in full.

**Set-off and withholding.** Anything being withheld, its value, its
contractual basis, and whether a notice is required to withhold it.

ETABLIX recommends. The client pays, by a named person with delegated
authority. Nothing in this part is a certificate under any contract unless the
appointment says it is, and it does not say so by default.`),

  P("c6_7", "Forecast and cash", [6, 7], `Write parts 6 and 7 of the monthly control report.

## 6 · Cost forecast and outturn
Where this ends up. For every control account: budget, committed, spent to
date, forecast to complete, forecast outturn, and the variance against budget.
Then the same totals for the appointment.

State the basis of the forecast to complete for each account — remaining
measured work at current rates, a supplier's own forecast, or an estimate —
and mark which. A forecast built on the supplier's own numbers is a forecast
the supplier controls.

Name the three accounts most likely to move, and say in which direction and
what would cause it. A forecast with no sensitivity in it is a single number
presented as a fact.

## 7 · Cash flow, exposure and reserve
The client's cash position on this appointment. The next three months of
committed payments by month, against confirmed receivables and the reserve.

Then the exposure test, plainly: committed supplier exposure must not exceed
the reserve plus confirmed receivables, and the reserve must cover next
month's forecast. Say whether it does. If it does not, say by how much and
name what has to change — this is the test that decides whether the
appointment can keep placing orders.

Where a payment is being recommended in a month the reserve does not cover,
that is the most important sentence in this report and it goes at the top of
this part rather than the bottom.`),

  P("c8", "Certificate, decisions and the audit trail", [8, 8], `Write part 8 of the monthly control report.

## 8 · Certificate, decisions required and the audit trail

**Decisions required this month.** Every decision a named person must make,
each with the date it must be made by and what happens if it is not. Ordered
by that date, not by size. A decision list ordered by importance is a list
where the urgent thing is halfway down.

**Notices and deadlines.** Every statutory or contractual deadline in the next
thirty days: payment notices, pay-less notices, final dates for payment,
change-notification periods, and any programme notice. Columns: the deadline,
its date, who serves or makes it, and the consequence of missing it.

**The audit trail.** What this report was built from: the documents read, the
data date, what was claimed against what the evidence supported, and the
contradictions from table E of the working paper that are still open.

**Valuation certificate.** State plainly: the period and data date; the gross
and net assessed sums; that every payment recommended is measured against a
control account and does not exceed the value earned on it; that ETABLIX
recommends and the client pays, by a named person with delegated authority;
that no figure in this report rests on an assertion without saying so on the
row; and that this report is decision support and not a certificate under any
contract unless the appointment expressly says it is.

Where anything in the report prevents it being relied on, name it here rather
than in a footnote.`),
];

export const FINAL_TASK = `Every part is written. Two things remain.

## 0 · THE MONTH IN ONE PARAGRAPH
Write it first though it is read first. One paragraph, no bullets. It must
say: whether the completion date still holds; the value earned this period and
the net sum recommended for payment; the largest single movement in the
forecast and its cause; whether the exposure test passes; and the one decision
that must be made before the next report, with its date. Somebody who reads
only this paragraph must know whether this month was a good one and what they
have to do about it.

## A · TRACEABILITY AND OPEN ITEMS
Two tables.

First, traceability: every payment recommended, traced to its measurement.
Columns: the recommendation, the supplier, the CA reference, the value earned
on that account this period, the amount recommended, and the evidence class
the measurement rests on. Every row is money leaving somebody's account, so a
row resting on assertion says ASSERTED rather than being rounded up into
"evidenced".

Second, open items: every contradiction, unvalued change, missing application
and undecided question, with who closes it and by when.

Then say what the information supplied did not allow you to establish, and
what was done instead. Name the account and the source. Nothing in this report
may rest on an assumption that is not visible on the page.`;

export const BRIEF_SYSTEM = `You are Agent 5 — Project Controls.

You produce the MONTHLY CONTROL REPORT for a Management Integrator or Prime
appointment: the position at period end, earned value by control account, the
change control register, the valuation, the payment recommendations, the cost
forecast, the cash and exposure position, and the certificate with the
decisions required. Eight parts, under these exact headings, in this order.

This report is produced every month for the life of the appointment. The
control account references, the cost codes and the table shapes must therefore
be STABLE month to month: next month's report is compared against this one,
and a renumbered account destroys the comparison.

Four rules bind this agent and none of them bends.

MEASURE BEFORE YOU VALUE. Every figure of value earned rests on evidence with
a stated class — MEASURED, EVIDENCED, ASSERTED or UNKNOWN. Where the evidence
is a supplier's own assertion, you value what the evidence supports and say on
the row that you have. Valuing what was claimed rather than what was
evidenced is how over-certification happens, and it happens by being polite.

MONEY OUT MUST NOT EXCEED VALUE EARNED. Every payment recommendation names the
control account it is measured against, and its amount must not exceed the
value earned on that account. The system reconciles the two by machine on
every run: a payment against an account that does not appear in the
earned-value section, or a payment exceeding what that account earned, stops
this report being issued. This is checked by machine, not by eye, so the
references must be exact and the amounts must be figures.

EVERY DATE IS COMPUTED, NEVER DESCRIBED. Part II of the Housing Grants,
Construction and Regeneration Act 1996 turns on dates. A missed payment notice
makes the sum APPLIED FOR the notified sum whatever the work is worth; a
missed pay-less deadline makes the notified sum payable in full. So every
application gets its due date, payment-notice deadline, final date for payment
and pay-less deadline computed from the day it was received. "As per contract"
is not a date.

NOTHING IS INVENTED AND NOTHING IS SILENTLY RESOLVED. Where two sources
disagree, both are reported. Where a number cannot be established, it is
marked UNKNOWN and what it prevents is stated. A contradiction resolved
quietly is a number nobody can defend when a supplier disputes it.

Boundary: this is decision support and a recommendation. Under Model 02 the
client contracts directly with every supplier and pays them directly — ETABLIX
never holds supply-chain money — so you recommend and the client pays, by a
named person with delegated authority. You do not certify under any contract
unless the appointment expressly says the report is a certificate, and it does
not by default. You do not instruct change, do not settle a claim, do not
agree an extension of time and do not overwrite the baseline: you propose, and
a named human accepts or rejects. Where a position is significant legal
exposure — a withholding, a set-off, a claim, a termination — it is flagged
for the client's construction solicitor rather than settled here.`;

export const FIELDS = [
  { name: "client", label: "Client / organisation", type: "text", required: true },
  { name: "project", label: "Project / site", type: "text", required: true },
  { name: "period", label: "The period this report covers, and the data date the numbers are taken at", type: "text", required: true },
  { name: "baseline", label: "The baseline programme and the budget at award, by package or control account", type: "textarea", required: true },
  { name: "progress", label: "Progress this period — daily reports, delivery records, inspection records, supplier updates. Say what is measured and what is somebody's word", type: "textarea", required: true },
  { name: "applications", label: "Applications for payment received this period: supplier, sum applied for, and the DATE each was received", type: "textarea" },
  { name: "previous", label: "Last month's report — value earned to date, previously certified, and the control account numbers, which must not change", type: "textarea" },
  { name: "change", label: "Change this period: instructed, notified but not instructed, and claimed", type: "textarea" },
  { name: "contract", label: "The commercial terms that govern the money — retention percentage, payment periods if not the standard ones, set-off and withholding rights", type: "textarea" },
  { name: "cash", label: "The reserve, confirmed receivables and committed orders, for the exposure test", type: "textarea" },
  { name: "costs", label: "Costs committed and spent to date by control account, with the cost coding used", type: "textarea" },
];

export const SECTIONS = [
  ["c1", "Position at the end of this period"],
  ["c2", "Earned value by control account"],
  ["c3", "Change control register"],
  ["c4", "Valuation this period"],
  ["c5", "Payment recommendations"],
  ["c6", "Cost forecast and outturn"],
  ["c7", "Cash flow, exposure and reserve"],
  ["c8", "Certificate, decisions required and the audit trail"],
];

/** The two parts the reconciler compares, by section id. */
export const EARNED_SECTION = "c2";
export const PAYMENT_SECTION = "c5";
