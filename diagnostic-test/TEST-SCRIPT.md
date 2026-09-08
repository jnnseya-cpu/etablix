# Testing the whole circle

Twenty minutes, on the live site, using `NORTHREACH-diagnostic-pack.zip`.
It is a fair test: the pack contains **33 planted findings** and the scoring
key at `northreach/_grading/SCORING-KEY.md` says what they are. Do not read
the key until after you have read the report.

## Before you start

Check the AI provider is connected: **Control Desk → Organisation → AI agents**.
Without a key the diagnostic will refuse to start, and it will say so.

## The circle

**1 · Open the engagement.** Control Desk → **Client engagements**.
Client `Marrowbridge Infrastructure Ltd`, project `Project NORTHREACH`,
deliverable **Site-services feasibility review**, Model A, fee `6500`,
your own email as the contact, tick **CONSTRUX in scope**.

**2 · Issue the portal.** One button. It mints the link, builds the 14-line
checklist from the deliverable, and emails both. The link is printed back to
you and the panel has a **Copy** button.

**3 · Be the client.** Open the link in a private window. You should see the
checklist, the ten-working-day clock note, and the deposit and balance both
stated with their reasoning.

Unzip the pack. Work down the list, attaching the documents:

| Checklist line | What to attach from the pack |
|---|---|
| Project programme | `programme/*-gantt.pdf` **and** `programme/*-tasks.csv` |
| Workforce forecast | `inputs/02-workforce-forecast.md` |
| Proposed site layout | both files in `drawings/` |
| Logistics plan | `inputs/04-existing-logistics-plan.md` |
| Temporary services | `inputs/05-…` and `annexes/C-…` |
| Procurement packages | `registers/*.xlsx` and `inputs/06-…` |
| Mobilisation constraints | `inputs/07-…` and `annexes/A-…` |
| Site and utility information | `inputs/08-…` |
| Anything superseded | the remaining `annexes/` files |
| The five commercial lines | type an answer, or mark one **not held** to see that it settles rather than nags |

**Worth doing deliberately:** mark one mandatory line *I do not hold this*
with a reason. It should count as answered and never be chased again. That is
the "no repetition" claim, and it is the one to test.

**4 · Confirm the start.** Tick the authorisation box, give a name.
An `INV-2026-nnn` for **£1,950** (30%) should appear in the portal *and* in
the document studio within the same second. Open it: reverse charge applied,
your PO reference on the face of it, and it says on itself that it was raised
automatically on the client's instruction.

**5 · Take the payment.** Back on the desk: **Deposit … received**.

**6 · Run the diagnostic.** The button now says **Run the diagnostic on their
pack**. It runs on the files the client already sent — *no second upload*.
The handover date is read from the record (the day the last mandatory line
was answered), and the report due date is ten working days from it.

Six passes, several minutes. Watch it under **Organisation → AI agents**.

**7 · Publish it.** Back on the engagement, in *Publish a deliverable*, leave
**Issue the completed diagnostic run as the report** ticked, add a summary and
list the sections the client may comment against, and publish. It mints a
numbered `SSD-2026-nnn` carrying the handover and due dates.

**8 · Be the client again.** Read the report in the portal. Then:

- Try **Review with comments** with no comment — it should refuse you.
- Add a comment against a named section and send it back.
- Reissue from the desk, then **Approve**.

Approval should raise the **£4,550** balance invoice at the moment of
approval. Mark it received; the engagement closes; the two invoices sum to
£6,500.

## Then judge it

Read the report first. Write down what you think it found. **Then** open
`northreach/_grading/SCORING-KEY.md` and mark it against the 33 planted
findings — how many it caught, how many it invented, and whether the ones it
caught are stated well enough to put in front of a client.

The four that matter most are the contradictions between two documents
written weeks apart by different people. Anything can list what is in a
programme. Finding that the shift pattern in the programme is prohibited by a
planning condition in a different file is the thing worth paying for.

## If something breaks

The same circle runs headless:

    node backend/test/circle.e2e.mjs

20 assertions, from the engagement to the closed account. If the live site
misbehaves, run that first — it will tell you whether the fault is the
platform or the environment.
