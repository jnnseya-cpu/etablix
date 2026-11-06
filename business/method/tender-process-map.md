# The standard tender process, mapped onto what is already built

A bidder-side tendering procedure — receipt to contract handover, eleven steps
— checked against the platform rather than bolted onto it. Nothing here
proposes removing or replacing anything.

**The short answer: the platform already is this process, and in most places
enforces it harder than the procedure describes.** The procedure calls its
controls "recommended". `backend/lib/l7/gates.js` makes them blocking: the state
does not change, and the refusal names the specific unmet condition. Six of the
eleven steps are already gates that cannot be walked past.

So the useful output is not a new workflow. It is the small number of places
where the procedure knows something the platform does not.

**All four of those places are now built**, additively, with the existing
contracts pinned by tests first. Section 2 records what each one is and what it
refuses; section 5 is kept as written, as the record of the order they were
judged worth building in.

---

## 1 · The eleven steps against the eighteen states

The lifecycle in `backend/lib/l7/gates.js` runs DISCOVERED → QUALIFIED →
DECIDED_PURSUE → PACK_INGESTED → REQUIREMENTS_MAPPED → SCOPE_DECOMPOSED →
CONTRACT_POSITIONED → PROGRAMMED → PRICED → PRICE_RELEASED → COMPOSED →
CONSISTENT → SUBMITTED → CLARIFYING → BAFO → OUTCOME_RECORDED →
BASELINE_HANDED_OVER → CLOSED.

| Procedure step | Where it already lives | Enforced how |
|---|---|---|
| 1 · Receive, record, secure | `PACK_INGESTED`; bid file parts b1–b3 (requirements register, compliance matrix, submission checklist and timetable) | Document register and returnables are the agent's first pass |
| 2 · Bid / no-bid | `QUALIFIED → DECIDED_PURSUE`, gate **G0_PURSUE**, engine `l7/bidscore.js` | Blocks unless the score has been run **and** no hard stop is unresolved |
| 3 · Mobilise the bid team, work backwards | `l7/bidprogramme.js`, read by gates **G4_PRICE_RELEASE** and **G5_SUBMISSION_RELEASE** | Blocks a price release on an estimate that has not frozen, or one programmed to freeze before what it prices — and blocks the submission again on the same two facts, because the approval must still cover what is being sent |
| 4.1 · Who does every part of the job | `SCOPE_DECOMPOSED`, gate **G2_SCOPE_FREEZE** | Blocks on any unallocated scope item, and on any interface *excluded by both sides* |
| 4.2 · Read the contract for exposure | `CONTRACT_POSITIONED`, gate **G3_CONTRACT_POSITION**, `l7/clauses.js` | Blocks on an unreviewed clause or an open high-severity contract finding |
| 4.3 · Site visit with a pricing agenda | `checkSiteVisit` in `tendercheck.js`, plus three fields on the bid agent | Reports an unrecorded visit, an observation that does not say whether it was observed, stated or unconfirmed, and a bid with no visit that does not name what was priced blind |
| 5 · Clarifications and risks as linked records | Bid file b5, b6, reconciled by `tendercheck.js` — to each other, and to the priced estimate | Six rules across the registers and six more against the price; the double count is proved on the estimate rather than read off a cell |
| 6 · Programme before price | `PROGRAMMED`, before `PRICED` | The order is the lifecycle's, not a convention |
| 7 · Supply-chain prices and the estimate | `l7/estimating.js` — `applyMarkups`, `detectDoubleMarkup`, `checkRiskRelease`, `normaliseQuote`; the priced schedule read back by `estimateofrecord.js` | Arithmetic is a deterministic service; no model may assert a total, and the bid's registers are checked against the schedule the engine admitted rather than a retyped copy of it |
| 8 · Technical offer against the scoring | `COMPOSED`; bid file b4, reconciled by `bidcheck.js` | A required deliverable with no response is caught by machine |
| 9 · Settle, approve, submit | `PRICE_RELEASED` gate **G4**, `CONSISTENT → SUBMITTED` gate **G5** | G4 blocks on unapproved cost items, P80 margin below policy, arithmetic faults, an estimate that has not frozen, and an estimate programmed to freeze before what it prices. G5 blocks on an unbacked claim, a critical finding, a price that does not reconcile, and — reading the same two programme facts again — an estimate that is no longer frozen or whose freeze has moved since the price was released |
| 10 · Control the bid after submission | `CLARIFYING`, `BAFO`, `OUTCOME_RECORDED`, `quoteValidity()` in `l7/estimating.js` | Quotes are tested against the validity period being offered, so a lapse inside it is found before the extension is confirmed |
| 11 · Reconcile and hand to operations | `BASELINE_HANDED_OVER` gate **G6_AWARD**, then `CLOSED` gate **G7_LESSONS** | A win cannot reach closed without passing through the handover and the lessons gate. A no-bid closes from QUALIFIED and a loss from OUTCOME_RECORDED, both ungated — deliberately: a decision not to bid is a decision, not a failure |

Two controls in the platform have no counterpart in the procedure at all, and
both are stronger than anything in it:

- **Segregation on every gate.** `approver != author`. It is the control that
  stops the estimator approving their own estimate at eleven at night because
  the commercial director is on a plane.
- **The issue gate** (`l7/issue.js`). A numbered bid file cannot be minted until
  an independent challenge has run, been approved by a person, passed its own
  machine check and left no critical finding open. The refusal sits at the
  moment the document comes into existence, which is the last moment anybody is
  still willing to change anything.

---

## 2 · What the procedure knew that the platform did not — and now does

### Gap 1 — the bid production programme

The procedure is emphatic: build a programme for *producing the bid* — supplier
enquiries and returns, surveys, clarification cut-off, design freeze, estimate
freeze, technical review, settlement, signatures, upload, contingency — and
**keep it separate from the project delivery programme**.

The platform plans the delivery programme at `PROGRAMMED` and has nothing for
the other one. The failure it prevents is ordinary and expensive: the bid that
misses its own internal dates and arrives at settlement with three packages
unpriced, where every individual deadline was met except the ones nobody wrote
down.

**Built** — `backend/lib/l7/bidprogramme.js`. Ten activities, nine ordering
constraints that cannot invert, a named owner per activity (a department is
rejected: it cannot be telephoned on the Friday a return is late), and the gap
between the internal submission deadline and the buyer's, which is the only
contingency a bid really has.

**And wired to G4**, which is the part that makes it a control rather than a
report. `gateFacts()` hands the price release gate exactly two of the
programme's facts:

- `bidProgramme.estimateFreezePassed` — a price released from an estimate that
  is still moving is an approval of a figure that will change before
  submission, and the signature ends up on a number nobody can reproduce.
- `bidProgramme.estimateOrderFaults` — an estimate programmed to freeze before
  the supplier returns, the survey, the clarification cut-off or the design
  freeze does not rest on the prices it claims to carry.

Not the fault count. A price release must not wait on a named owner for the
site visit: a gate that blocks on everything is routed around, and then the two
facts that matter stop being enforced along with the rest. And because a
missing fact fails a gate rather than defaulting, a bid with no production
programme at all is refused at G4 — which is the correct answer to "we never
wrote one".

**G5 reads the same two facts, and means something different by them.** G4
will not approve a figure from an estimate that is still moving. G5 will not
*send* a figure the approval no longer covers — which is the job
`price.reconciles` already does for the figure itself, and the estimate freeze
is the other half of the same question. The failure it catches is ordinary and
nobody's fault in particular: a late quotation arrives after the price is
released, the freeze is slipped a week to take it in, the estimate is reworked,
and the submission goes out against a figure G4 never saw. Every individual act
was reasonable and the approval has stopped covering the bid.

The two gates refuse in different words, deliberately and with a test pinning
it: a refusal that explains the wrong thing sends somebody to fix the wrong
document.

**And the gate can tell a recomputed fact from a cached one.** Reading the
same boolean twice catches a regression only if somebody recomputed it in
between, and a cached `true` is indistinguishable from a `true`. So the gate
engine has a fifth requirement kind, `fresh`, alongside `fact`, `all`,
`redteam` and `scenario`:

```js
{ kind: "fresh", fact: "bidProgramme.freezeJudgedAt", withinDays: 1, say: "…" }
```

It reads the date the fact was judged against and compares it to the time the
decision is being recorded — `transition`'s own `at`, the same instant that
goes on the decision event. **Nothing in the gate engine reads a clock**: the
reference time is supplied, so re-evaluating a recorded decision against its
own stamp gives the answer it gave on the day. A gate whose verdict changes
when you look at it again is not an audit trail. On the REST route the
server's clock is used and the request's own date is ignored, because the one
thing that must not answer "was this computed for this decision" is the thing
being judged.

Four failures, and they are not the same failure:

| | Verdict |
|---|---|
| **No decision time** | Unknown. Nothing here guesses at now. |
| **No stamp** | Unknown, and the refusal names the missing stamp rather than blaming the fact — that is the state a caller is in before it is taught to stamp |
| **Stale** | Refused, with the age stated: two days and four months are different conversations |
| **Ahead of the decision** | Refused as **fabricated**, not stale. A fact judged against a date that has not arrived means somebody set the reference date forward, and every date-based judgement resting on it is unsafe. One day of grace, because a caller east of UTC computing "today" locally legitimately produces tomorrow's UTC date |

`withinDays: 1` at both gates — the programme was read on the day of the
decision or the day before. A desk that reads it in the morning and signs the
next day has cached nothing; a caller handing G5 the facts G4 used three weeks
earlier is refused, and that is the defect the whole mechanism exists for.

### Gap 2 — the site visit as a bid input

`pre-construction-site-assessment.md` is a strong method document, and the Site
Establishment Requirements Report commissions a visit. The **bid** pipeline does
not ask whether a visit happened, what was observed, what was stated verbally
and what still needs formal confirmation — which is the distinction the
procedure insists on, and the one that decides whether an assumption is
defensible later.

**Built** — `checkSiteVisit` in `backend/lib/tendercheck.js`, with three fields
on the bid agent. Not visiting is a permitted answer and often the right one;
not saying whether you visited is not, and neither is a note that fails to
separate what was seen from what somebody said on the day. Every observation
must begin OBSERVED, STATED or UNCONFIRMED, because in a dispute the only
question about a site observation is which of the three it was, and that is
decided by how it was written down at the time. A bid with no visit must name
what was priced blind.

### Gap 3 — five record types, and the rule that closes them

The procedure separates **clarification**, **assumption**, **risk**,
**qualification** and **opportunity**, and then states the rule that matters:

> A reply is implemented only when the relevant estimate lines, programme
> activities and tender documents have been updated.

and

> A risk sitting in both a package quote and central contingency is counted
> twice. A risk sitting in a register with no price, contractual treatment or
> authorised acceptance has no funded response.

Both are machine-checkable, and both are exactly the shape this codebase
already uses — `reconcileScopeToPrice`, `reconcileChecklistToResponse`,
`reconcilePaymentsToEarned`, `reconcileRegisterToMovements`. The bid file writes
b5 and b6 as prose and nothing compares them to the estimate.

**Built, in two layers**, because one layer was not enough.

`reconcileTenderRegisters` in `backend/lib/tendercheck.js` compares the five
registers to each other: a clarification status that cannot be read, an answer
that landed nowhere, an open question carried nowhere, a limit the buyer cannot
see, a risk funded in two places, a risk funded in none. Six rules on the
established pattern — reconcile, notes, statement.

That layer has one weakness and it is the important one: **every fact it reads
was typed into the same document by the same person.** A register saying "the
allowance sits in the groundworks package, £18,000" reconciles perfectly
against itself — whether or not the groundworks package carries it, and whether
or not there is a groundworks package. The register is a claim about the price.
Until something reads the price, the honest version and the hopeful version are
written identically.

So `reconcileRegistersToEstimate` reads the price. Six comparisons:

| It finds | Why the register alone cannot |
|---|---|
| An allowance claimed and not in any priced line | The decision about where the money would sit was made and never reached the estimator — the commonest version, because the register and the estimate are written by different people |
| Money in the estimate against a record that does not exist | Either the register was pruned after the estimate was built, or the reference is wrong; if it is wrong, the exposure the money was for is uncovered |
| The same reference on a priced line **and** on the contingency | This is the double count proved rather than read off a cell, in the file that gets added up |
| The register and the estimate disagreeing about a figure | Both documents are internally consistent, so no reader can tell which number is the bid's; settlement cannot be held on two |
| The risks pointing at central contingency exceeding the contingency | Every row is defensible and the total is not funded — arithmetic, which is why it belongs to a machine and not a review meeting |
| An answer recorded as having changed the estimate, where no line carries it | "Priced in, estimate updated" is a sentence; a reference on a priced line is the implementation |

What it refuses to do is guess. An unreferenced line for exactly £18,000 next
to an unmatched £18,000 risk is **not** reconciled: the figures agreeing is a
coincidence, and treating it as a link is how two unrelated numbers become a
reconciliation. A link exists because somebody wrote it down.

**And it reads the estimate of record, not a copy of it.** The bid names an
estimating-engine run; `backend/lib/estimateofrecord.js` resolves it and hands
the cross-check the schedule as the engine admitted it — the same object the
price was approved from.

That distinction is not pedantry. A pasted table is correct at the moment it
was taken and at no moment after: the estimate moves, the copy does not, and
the cross-check goes on passing against a price that no longer exists — with
more confidence than before, because now it has read "the estimate". A check
that is wrong is worse than a check that is narrow, because nobody allows for
it. A copy is also retyped, and retyping is where £18,000 becomes £1,800;
the cross-check's strongest alarm is exactly the one a transcription error
fabricates, and an alarm whose commonest cause is a typo gets switched off.

Three rules in the resolver:

- **It refuses rather than falling back.** A named run that does not exist, is
  another agent's, or carries no schedule does **not** silently fall back to
  whatever was pasted. A check that degrades from the strong form to the weak
  form reports the weak form's result in the strong form's words. The failure
  to read it is its own note, phrased as a failure of the check rather than of
  the estimate: *the registers were therefore NOT checked against the price.*
- **An unapproved estimate is read, and said to be unapproved.** A bid and its
  estimate are worked up at the same time. Refusing until approval would mean
  the check only ever ran after the moment it was useful.
- **A line the engine refused is a finding of its own, and it replaces the
  weaker one.** `price()` does not drop an inadmissible line: it refuses it,
  keeps it, and reports its own total as understated. An allowance sitting on
  such a line is in the schedule and not in the price — the money *was*
  identified, so "the decision was made and never arrived" is untrue and
  points at the wrong remedy. Fix the line; pricing the risk again would fund
  it twice the moment the line is admitted. For this to work, `price()` now
  keeps the description on a refused row, which it did not: a refusal reading
  only "4.12 refused" was less useful to a person too.

The pasted table still works, for a bid being built before any estimate
exists, and the result records which of the two it read — a copy and the
record look identical afterwards, and they deserve different amounts of
trust. Without either, the statement says the claims could not be tested,
never that they passed. And a schedule whose every line the engine refused is
reported as exactly that, not as "no lines supplied": the estimate exists, it
was read, and none of it was admitted.

### Gap 4 — validity and revalidation

Quote validity, price validity and tender validity extensions. `normaliseQuote`
carries `validUntil` and nothing reads it. The procedure's control is to
revalidate critical quotes, labour availability and inflation exposure *before*
confirming an extension — the moment a bid quietly becomes unprofitable.

**Built** — `quoteValidity()` in `backend/lib/l7/estimating.js`, over the quote
set and the tender validity date. A quote stating no validity date is reported
as UNSTATED, which is not the same as being valid; one that holds at submission
and lapses inside the validity period being offered is reported separately from
one already lapsed, because they are different conversations with the supplier.
`normaliseQuote` is untouched and its existing behaviour is pinned by a test.

---

## 3 · What has been built, from step 7

One gap was narrow enough and valuable enough to close immediately, and it sits
in the module whose whole purpose is that arithmetic is never the model's to
assert.

`normaliseQuote` already refuses to let an exclusion be summarised away — it
marks a quote **not comparable** and carries the exclusions and qualifications
through intact. That is the right first move. It does not make the quotes
comparable, and until something does, the exclusions sit in a column nobody adds
up and the lowest quoted number wins the meeting.

The procedure's worked example is the whole argument:

> A £220,000 quote plus £18,000 of omitted cranage and £12,000 of testing is a
> £250,000 evaluated cost. A £242,000 inclusive quote could be cheaper.

**Added to `backend/lib/l7/estimating.js`, additively:**

- **`evaluatedCost(quote)`** — quoted value plus the priced value of everything
  the quote leaves out, with the additions itemised rather than folded in.
- **`compareQuotes([...])`** — the comparison table, and the sentence that makes
  it worth producing: whether the cheapest quote is also the cheapest cost.

Three rules it refuses to soften:

- **An exclusion with no price cannot be evaluated, and is not zero.** The quote
  comes back with `evaluated: null` and the exclusion named, because the honest
  answer is that somebody must price it before the comparison means anything.
  A field containing one is reported as an incomplete comparison, not ranked.
- **A qualification is not an exclusion.** "Subject to survey" has no number and
  inventing one would be fabrication. Qualifications are carried and counted,
  never priced away.
- **When the cheapest quote and the cheapest evaluated cost disagree, the
  disagreement is the finding** — stated in capitals, not resolved quietly in
  favour of the lower number.

Nothing in it selects a supplier. It produces the table a person selects from.
`normaliseQuote` is untouched and its existing behaviour is pinned by a test, so
everything that calls it today is unaffected.

---

## 4 · Where the procedure and this business differ, deliberately

Three places where the procedure describes something ETABLIX must not do, and
the platform is right to lack it.

**All three are now checked in what the system writes, not only stated in what
it is told** — `backend/lib/positionguard.js`. The reason is that an
instruction is a thing a model is asked to follow and a check is a thing that
happens, and the difference matters more here than anywhere else, because all
three failures read perfectly well. There is nothing obviously wrong with a
sentence saying ETABLIX will manage the construction phase, or that we will
install the compound, or that we will contract the suppliers. They are
ordinary, confident, competent-sounding construction English. They are also,
in order: an unlawful assumption of a statutory role, a claim to a capability
the company does not have, and an offer the insurance does not answer.

The guard matches a **claim** — a first-person subject joined to a prohibited
predicate — and ignores the same predicate anywhere else. "The Principal
Contractor shall…" is correct in an Employer's Requirements clause addressed
to somebody else, and "we do not take the Principal Contractor appointment" is
the sentence the business wants to see. The cost of that choice is that an
unusual phrasing slips through; the cost of the other choice is a guard that
fires on every correct document and is therefore turned off within a week. One
rule is standalone, because the possessive *is* the subject: "our own plant
will be mobilised in week three" never names the company and is the claim all
the same — and it is the phrasing somebody reaches for precisely when they are
describing a capability that is not there.

It reports rather than blocks. The independent challenger is where a bid is
stopped; a guard that blocked on a regular-expression match would be overruled
the first time it was wrong, and overruled permanently.

**Principal contractor duties.** Step 4.3 says to allow for CDM planning and
coordination "where bidding as principal contractor". ETABLIX never is. The
constraint is in `shared/constants.js` as a delivery invariant and in the agent
briefs, and it is not a gap.

**Self-delivery.** Steps 7 and 11 assume direct labour, plant and site
management. ETABLIX specifies, procures and integrates; the suppliers deliver.
The platform's scope decomposition is built around that and should stay so.

**Holding the supply chain.** The procedure's supply-chain alignment section
assumes the bidder takes the downstream contracts. Under Advisory and Management
Integrator the client holds every supplier contract and pays every supplier.
That is the USP, it is enforced by `DELIVERY_MODELS` and refused at the
engagement and document routes, and no tendering procedure overrides it.

---

## 5 · The order they were built in, and why — kept as written

1. **Gap 3, the five record types and their reconciliation.** Highest value, and
   it fits the existing `*check.js` pattern exactly, so it costs the least to
   build and nothing to learn. It is also the one that catches the error that
   actually loses money: a risk carried twice, or carried nowhere.
2. **Gap 1, the bid production programme.** Second, because it is the one that
   makes the other gates reachable on time.
3. **Gap 4, validity and revalidation.** Small, and it protects a margin that is
   otherwise lost silently.
4. **Gap 2, the site visit as a bid input.** Smallest, and partly covered by
   method documents already.

All four are built, in that order, additively, with the existing contracts
pinned by tests first. The judgement above is left as it stood rather than
rewritten now the work is done, because the order a thing was built in is part
of the record of why.

The gap that section used to record — the cross-check reading a pasted copy
rather than the estimate the estimating engine holds — is closed. The bid
names a run and the registers are tested against the schedule that run
admitted.
