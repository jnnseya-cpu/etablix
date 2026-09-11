# The assessor answered the guarantee questions — what to do with it

This is the follow-up to `dps-financial-standing-reply.md`. That reply asked
three questions about the guarantee. The assessor has answered all three, and
the answers change the decision.

## The decision: start the application. Do not send another question.

The email answers every question the last reply put, and asks nothing back.
A second round of questions now spends assessor goodwill on something already
settled and delays the submission by however long they take to reply. Send a
two-line acknowledgement if the thread is still warm, then submit.

## What the four answers actually mean

**"It need not be in place yet."** This is the one that matters. The guarantee
was the gate on the application, and it is not a gate. The submission can go
in now with the guarantee described as in progress. Nothing else in the email
outranks this sentence.

**"There is no particular wording that is needed."** No solicitor is required
to draw a form before you can apply. A letter of willingness on the guarantor's
letterhead is enough to show the intention. That removes a cost and a lead
time from the critical path.

**Bank, financial institution or parent company preferred.** Ask Groupe Nseya
first. A parent company guarantee is in the preferred set, costs nothing to
request, and the relationship already exists. A bank letter is the alternative
and takes longer.

**A director's personal guarantee "may have to undergo further checks."** This
is a warning, not an invitation. It is the slowest route, it puts a named
individual's finances into the assessment, and the buyer has said plainly it
is not their first choice. Do not lead with it. Keep it as the fallback if
both the parent company and the bank decline.

## The acknowledgement, if you send one

> Dear [Mr/Ms Little],
>
> Thank you — that answers all three questions, and it is enough for me to
> proceed. I will submit within [five] working days with the financial
> documents under supplementary information, and I will pursue a letter of
> willingness from [a bank / the parent company] in parallel. I will not
> represent a guarantee as being in place until it is signed.
>
> Kind regards,

Nothing more. No new questions, no restating what they told you.

## What goes in the submission now

Under the supplementary information upload, as the email directs:

- Balance sheet as at [date], from the management accounts.
- Cash-flow report for the trading period to date.
- A [three]-year forecast **with its assumptions written on its face** — win
  rate, average engagement value, payment terms, cost base. A forecast with no
  stated basis reads as invention.
- Evidence of banking arrangements and available working capital.
- A short, plain paragraph on the guarantee: which form is being pursued, with
  whom, and that it is not yet in place.

Contract examples go in as set out in the previous reply — from the founder's
own delivery record, each one labelled on its face as personal rather than the
company's, with the dates, the role, the scope inside the contract and the
interfaces managed.

## The two rules that still bind

**Never say a guarantee is in place until it is signed.** The buyer has just
removed the pressure to have one. There is now no reason at all to overstate
it, and an unsupportable claim in a financial-standing submission costs more
than every strong sentence around it earns.

**Never pay to register.** Nothing in this application requires a fee to a
portal or a directory.

## One thing to correct in the register

`backend/lib/dps.js` holds the requirement list for each route as a working
estimate read from the contract notice. The assessor has now stated the
financial-standing position as fact for this route. Update that row's `notes`
so the next person to open it does not re-ask a question that has been
answered.
