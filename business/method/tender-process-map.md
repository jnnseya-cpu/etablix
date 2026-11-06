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
| 3 · Mobilise the bid team, work backwards | — | **Gap 1** |
| 4.1 · Who does every part of the job | `SCOPE_DECOMPOSED`, gate **G2_SCOPE_FREEZE** | Blocks on any unallocated scope item, and on any interface *excluded by both sides* |
| 4.2 · Read the contract for exposure | `CONTRACT_POSITIONED`, gate **G3_CONTRACT_POSITION**, `l7/clauses.js` | Blocks on an unreviewed clause or an open high-severity contract finding |
| 4.3 · Site visit with a pricing agenda | `business/method/pre-construction-site-assessment.md` | Method exists; not an input the bid pipeline asks for — **Gap 2** |
| 5 · Clarifications and risks as linked records | Bid file b5 (clarification schedule), b6 (bid position and risk) | Written, not reconciled — **Gap 3** |
| 6 · Programme before price | `PROGRAMMED`, before `PRICED` | The order is the lifecycle's, not a convention |
| 7 · Supply-chain prices and the estimate | `l7/estimating.js` — `applyMarkups`, `detectDoubleMarkup`, `checkRiskRelease`, `normaliseQuote` | Arithmetic is a deterministic service; no model may assert a total |
| 8 · Technical offer against the scoring | `COMPOSED`; bid file b4, reconciled by `bidcheck.js` | A required deliverable with no response is caught by machine |
| 9 · Settle, approve, submit | `PRICE_RELEASED` gate **G4**, `CONSISTENT → SUBMITTED` gate **G5** | G4 blocks on unapproved cost items, P80 margin below policy, arithmetic faults. G5 blocks on an unbacked claim, a critical finding, or a price that does not reconcile |
| 10 · Control the bid after submission | `CLARIFYING`, `BAFO`, `OUTCOME_RECORDED` | States exist; validity revalidation is **Gap 4** |
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

## 2 · What the procedure knows that the platform did not

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

**Not built.** It would need a small artefact hung off `DECIDED_PURSUE`, with an
internal submission deadline distinct from the buyer's, and a gate condition at
G4 that the estimate freeze has passed.

### Gap 2 — the site visit as a bid input

`pre-construction-site-assessment.md` is a strong method document, and the Site
Establishment Requirements Report commissions a visit. The **bid** pipeline does
not ask whether a visit happened, what was observed, what was stated verbally
and what still needs formal confirmation — which is the distinction the
procedure insists on, and the one that decides whether an assumption is
defensible later.

**Not built.** The cheapest version is three fields on the bid agent and one
line in the bid position: visited or not, and if not, what was priced blind.

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

**Not built.** It belongs as a sixth `*check.js` module on the established
pattern: reconcile, notes, statement, called after the run like the others.

### Gap 4 — validity and revalidation

Quote validity, price validity and tender validity extensions. `normaliseQuote`
carries `validUntil` and nothing reads it. The procedure's control is to
revalidate critical quotes, labour availability and inflation exposure *before*
confirming an extension — the moment a bid quietly becomes unprofitable.

**Not built.** One function over the quote set and the tender validity date.

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

## 5 · The four gaps, in the order worth building

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

Say which and they get built the same way this one was: additively, with the
existing contracts pinned by tests first.
