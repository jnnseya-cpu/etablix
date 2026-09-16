# The three financial documents for the CHIC resubmission

CHIC asked, under **Economic & Financial standing**, for "one or more of the
following": a statement of turnover, a profit and loss account, a balance
sheet, a cash flow statement, or a guarantor statement from a bank.

We are providing four of the five. That matters for one reason: the guarantor
statement is the only option on that list that needs somebody else's
permission. Everything else is in the company's own records. Give CHIC four
and the guarantor question never has to be asked.

## What has been built

| File | What it carries | Which CHIC option it satisfies |
|---|---|---|
| `ETABLIX-financial-statements.xlsx` | Income and expenditure account | Statement of turnover **and** profit and loss account |
| | Statement of financial position | Balance sheet |
| | Cash flow statement | Cash flow statement |
| | Bank analysis + Lists | The working schedule behind the cash flow |
| `ETABLIX-cash-flow-forecast.xlsx` | 36-month forecast, all formulas | Forward view — not on CHIC's list, offered anyway |

Built by `build-financial-statements.cjs` and `build-forecast.cjs`. Neither
file contains a single figure. Every cell is either one the director fills
from the company's own records, or a formula that reads from those cells.

## It checks itself, and that is the point

Three cross-checks are wired into the workbook. Each one reads **OK** or
**DOES NOT RECONCILE by £x**, and turns green or red as it does:

1. **Net assets equal capital and reserves.** The balance sheet balances.
2. **Closing cash on the cash flow equals cash at bank on the balance sheet.**
3. **Retained earnings equal the result for the period.**

Plus a fourth control on the Lists sheet: **uncategorised must be nil**. Any
figure on that line means a bank entry has no category against it, so the
cash flow statement is understated by exactly that amount.

Verified with `node business/bids/verify-financial-statements.cjs`, which
evaluates the whole formula graph against a coherent test dataset, confirms
all three checks read OK, then moves one figure by £1 and confirms two of
them go red. The file reconciles on consistent data and refuses to hide
inconsistent data.

Do not send the pack while any check is red. An assessor who finds a set of
accounts that does not add up stops reading, and nothing else in the
submission recovers from that.

## The label that makes all of this safe

It is on the Basis of preparation sheet and it must stay there, word for word:

> Management information prepared by the director from the company's own
> records. Unaudited. JNN GLOBAL LTD has not yet reached its first accounting
> reference date, so no statutory accounts are yet due or filed at Companies
> House.

This is not a hedge. It is the difference between honest management
information and something that reads as an attempt to pass off homemade
figures as accounts. Buyers see director-prepared management information from
young companies constantly and it is unremarkable. What they do not forgive is
finding out afterwards that a document implied more assurance than it had.

Nothing in the pack may imply an audit, an accountant's report, or a filed set
of accounts, because none of those exist.

## What to gather before you start — about an hour

1. **Bank statements** from incorporation to your chosen reporting date. Every
   page. This is the single most important item; most of the pack comes off it.
2. **Sales invoices** raised in the period, and which are still unpaid.
3. **Purchase invoices** received, and which are still unpaid.
4. **Payroll records** — gross salary, PAYE, employer's NIC, and what is owed
   to HMRC at the date.
5. **Equipment receipts** — what was bought, when, and for how much.
6. **The statement of capital** from the incorporation documents — the nominal
   value of the shares issued.
7. **The insurance schedule and any subscription renewals** — you need the
   period they cover, not just what was paid, to split the prepayment out.
8. **A note of anything you paid personally** on the company's behalf and have
   not been reimbursed for. That is a director's loan and it belongs on the
   balance sheet.

Pick the reporting date before you start, and pick the end of a month for
which you have a bank statement. Everything else follows from it.

## The order of work

The workbook is arranged in the order the work actually happens:

1. **Bank analysis** first. Every line off the statement, categorised once,
   from the dropdown. Nothing downstream works until this is complete. Check
   the uncategorised control reads nil when you are done.
2. **Cash flow statement** fills itself. There is nothing to type on it except
   the opening balance.
3. **Income and expenditure** next. The grey column beside each line shows the
   cash figure for that category as a starting point; adjust it for anything
   invoiced and not yet paid, or paid in advance.
4. **Statement of financial position** last. Most of it comes from records
   rather than the bank.
5. Read the three checks.
6. Clear the shading off the cells you filled, then print each statement sheet
   to PDF. Print area, page size, headers and page numbering are already set,
   and the working columns are excluded.

## The covering text for the portal

Paste this into the Economic & Financial standing box, with the bracketed
parts filled in. Do not add anything to it.

> JNN GLOBAL LTD, trading as ETABLIX, was incorporated on [date] and has not
> yet reached its first accounting reference date. No statutory accounts are
> therefore due or filed at Companies House, and none are available.
>
> In place of statutory accounts we attach management information prepared by
> the director from the company's own records, covering the period from
> incorporation to [reporting date]:
>
> — an income and expenditure account, which includes the statement of
> turnover for the period;
> — a statement of financial position as at [reporting date];
> — a cash flow statement for the period, with the bank analysis it is built
> from;
> — a 36-month cash flow forecast.
>
> This information is unaudited and no accountant's report is given on it. It
> is drawn from the company's bank statements, sales and purchase records, and
> asset register, and the figures are internally consistent: net assets agree
> with capital and reserves, closing cash agrees between the cash flow
> statement and the statement of financial position, and retained earnings
> agree with the result for the period.
>
> The company's financial standing rests on having no external debt, no
> overdraft and no creditors in dispute, and on a cost base that is
> substantially variable rather than fixed. We would be glad to provide
> further detail, or to discuss a contract value ceiling appropriate to the
> company's current balance sheet, if that would assist the assessment.

That last sentence does real work. It offers CHIC the thing that actually
resolves their concern — a cap sized to the balance sheet — rather than asking
them to overlook it. A buyer who can limit their exposure does not need a
guarantor.

## Four things not to do

- **Do not invent a figure.** Not one. If you cannot find it, leave the cell
  empty and say so in the covering note. A gap you have disclosed is a
  formality; a figure you cannot defend in a meeting is fatal, and you will be
  asked about exactly one number — the largest one.
- **Do not smooth the forecast.** If the model shows a month where cash runs
  short, leave it in and say how it is funded. A stated, funded trough reads as
  competence. A flat line reads as a model that was adjusted until it looked
  comfortable, and that is the first thing an assessor disbelieves.
- **Do not call it accounts.** It is management information. The words are on
  the cover sheet for a reason.
- **Do not send it before the accountant has read it.** The pack is arithmetically
  sound, but the treatment of the director's loan, the capitalisation threshold
  and the VAT position are judgement calls, and an hour of their time is cheap
  next to a resubmission that gets returned twice.

## What is still outstanding on the resubmission

The financial section is now the easy half. Still to do:

- **Three referees** with real names, roles and contact details — ask their
  permission before listing anyone. The routes are set out in
  `chic-the-two-blockers.md`; the client-side counterparts are the strongest
  and carry no conflict.
- **The project detail** CHIC said was insufficient: named projects, dates,
  values, scope, and what you personally did on each.
- **Resubmit through the eSourcing portal**, not by email. CHIC said so
  explicitly. Confirm every section before submitting, not just the two they
  flagged — a returned application is re-read from the top.
