# Project finance table — what was entered and why

Rebuild with:

```
node business/bids/fill-finance-table.cjs <the Catapult source file>.xlsx
```

The script refuses to write if the line items do not total £8,000.

## The answer to "total amount of funding requested"

**£8,000 inclusive of VAT.** The maximum available, and every line is spent on
something the company cannot provide itself.

## The budget

| Category | Amount (inc VAT) |
|---|---|
| Labour | £0 |
| Consultancy | £5,520 |
| Material | £0 |
| Equipment | £540 |
| Laboratory / testing | £0 |
| Other expenses | £1,940 |
| **A. Total project costs** | **£8,000** |
| **B. Funding sought** | **£8,000** |

### Consultancy — £5,520

| Item | Inc VAT |
|---|---|
| Independent verification — chartered QS or contract specialist, 4 days at £600 | £2,880 |
| External information security review, 1 day at £700 | £840 |
| Legal — non-disclosure and data processing agreements | £720 |
| Demonstration pack and recorded walkthrough production, 2 days at £450 | £1,080 |

### Equipment — £540
Segregated secure workspace and access control for client pre-construction
information, six months, £450 plus VAT.

### Other — £1,940
Travel and subsistence for six buyer demonstration sessions, £1,320.
Contingency, £620.

## Match funding — £14,800

| Category | Amount | Basis |
|---|---|---|
| Labour | £13,200 | Managing Director, 24 days at £550/day, in kind |
| Equipment made available | £1,200 | Platform hosting, compute and secure storage, six months |
| Knowledge | £0 | Engine rule base and clause-graph schema, provided free and deliberately not valued |
| Travel and subsistence | £400 | Travel beyond the six funded sessions |

Roughly 1.85 of match for every £1 requested, on a programme that requires no
match at all.

---

## The three decisions behind the numbers

**Labour is £0 and that is the point.** The Managing Director's 24 days sit in
the match table, not in the claim. An assessor scanning budgets is looking for
the applicant quietly funding its own payroll out of a demonstration grant, and
this budget answers that question in its first line. It also means the money
buys four things the company genuinely cannot supply: independence, security
assurance, legal drafting and production.

**Independent verification is the largest single line, at £2,880.** It pays
somebody outside ETABLIX to check whether the engine findings were right. That
is the line that converts a demonstration into evidence, and spending 36% of
the award on being marked by someone else is the strongest signal in the
budget.

**The knowledge line in the match table is £0 on purpose.** The engine rule
base is the company's main asset, and there is no licence benchmark to value it
against. Putting a large number there would be inventing one, and assessors
have read a great many inflated in-kind valuations. The description says
plainly that it is provided free and deliberately not valued. Declining to
value something reads as discipline; a big unevidenced figure reads as the
opposite.

## Before you upload

**Fill the five bracketed fields.** Your name and contact details on the
Overall sheet, the submission date, and your name on the Labour row of the
Breakdown sheet.

**Settle the VAT question with your accountant.** The form says inclusive of
VAT and the table is filled gross, which is what it asks for. But if ETABLIX
becomes VAT registered before the spend and can recover input VAT, claiming the
gross figure would over-recover. Cell F20 already carries that undertaking —
that the claim would drop to net and the difference be returned. Check the
wording is one you are content to be held to.

**Confirm the £550 day rate is one you would actually charge.** It is a match
figure rather than a claim, so nothing turns on it financially, but you may be
asked and the answer should be the same as the one you would give a client.

**Check the two totals agree on screen.** Each Breakdown section compares
"Total Cost" against "Total Accounted". The script asserts they reconcile, but
open the file, look at both numbers in each section, and satisfy yourself
before it goes anywhere.

**Do not raise the ask above £8,000.** It is the stated maximum and a figure
above it is an instant administrative fail.
