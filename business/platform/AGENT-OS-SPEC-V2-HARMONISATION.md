# Agent OS developer specification v2.0, against what is built

Specification dated 8 November 2026, sixteen sections, seventeen ET agents, ten
workflows, twenty-one service codes, five autonomy classes and twenty-eight
acceptance tests. Checked against the platform rather than bolted onto it.
Nothing here proposes removing anything.

**The short answer.** Roughly two thirds of the specification describes
controls the platform already enforces, usually harder than the specification
describes them. The genuinely new material is a delivery taxonomy, four
deterministic calculations, an off-hire dependency engine and five agents that
do not exist. Four of the calculations are built and tested to the
specification's own figures; the rest is listed in build order.

**And one thing in the specification must be corrected rather than adopted.**
See §1.

---

## 1 · The conflict, now corrected in the specification

Specification §2 names Model 03 **Principal Service Contractor**. The platform
**refuses that phrase**, at document generation, with this reason:

> Use "Prime Service Contractor", never "Principal Service Contractor" — it
> collides with the CDM 2015 Principal Contractor role, which carries
> health-and-safety duties ETABLIX takes only by explicit, priced and insured
> appointment.

The specification is aware of the risk and answers it with a disclaimer: *"It
does not assign the CDM principal contractor role."* The platform's answer is
stronger and it is the right one — **do not use the colliding phrase at all.**
A disclaimer protects the person who wrote the document; it does not protect
the reader who skims the title. Several of this company's target clients hold
the CDM Principal Contractor role themselves, and a supplier whose commercial
label is one word from their statutory role is a supplier they have to think
about.

It is also already load-bearing in four places: `shared/constants.js`,
`backend/lib/ai.js` (every one of the thirty agent briefs), `routes/docs.js`
(enforced at generation, including against text hidden in a line item) and
`routes/playbook.js`.

**So the harmonisation ran the other way, and the specification is corrected.**
`ETABLIX-Agent-Developer-Spec-v2.0.md` in this folder is the copy of record.
Three occurrences changed — the §2 control matrix, the §2 label paragraph and
AT-04 — and §2 now records *why*, so the next author does not revert it. The
platform is unchanged.

The reference at **R1** to the HSE's own principal contractor guidance is
deliberately untouched: that one is about the statutory role and is correct.
The phrase also survives in two places in the corrected spec, both of them
prohibitions — the correction note at the head and the §2 rule saying never to
write it. `seo.test` scans published HTML rather than repository documents, so
a document naming the prohibition does not trip the guard that exists to stop
a client reading the phrase.

Everything else in §2 — the control matrix, who contracts, who pays, the
subledger split, the cutover manifest — is consistent with `DELIVERY_MODELS`
and is adopted below.

Worth noting that the specification's own §2 is otherwise exactly right about
the thing that matters most: *"Store regulatory role appointments separately
from commercial model, insurer and legal entity."* That is what `DELIVERY_MODELS`
does, and it is why Model C is marked `offerable: false` — the PI policy in
force insures a consultant and does not respond to holding works contracts.

---

## 2 · The twenty-eight acceptance tests, against the platform

| AT | What it tests | Where it lives |
|---|---|---|
| AT-01 | Three appointments differ correctly by model | `DELIVERY_MODELS`, `parity.e2e` (108 assertions) |
| AT-02 | Advisory agent cannot award | `routes/clients.js` returns 409 on a non-offerable model |
| AT-03 | Integrator recommendation never becomes an ETABLIX PO | `deliveryModelBreach` in `routes/docs.js` |
| AT-04 | Prime label exists, CDM appointment unknown | `positionguard.js` — **built**, six rules, reports rather than blocks |
| AT-05 | Model change with open hire keeps original liability | **Built** — `agentos/cutover.js`; mixed ownership blocked, not resolved |
| AT-06 | Model 03 order exceeds headroom | **Built** — `agentos/treasury.js`; reserved transactionally so two orders cannot both fit |
| **AT-07** | **72 + 50 + 8 at Skye → 130** | **BUILT** — `agentos/capacity.js` |
| **AT-08** | **130 × 40 L, 10 m³, 2 m³ reserve → 5.2, 46.15 h, 36.92 h** | **BUILT** — `agentos/capacity.js` |
| AT-09 | Overnight use added to a day-use brief | **Built** — `bedRequirement` / `welfareSplit`; overnight held on its own approvals |
| AT-10 | Quote excludes transport and connection | **Built** — `evaluatedCost` / `compareQuotes` in `l7/estimating.js` |
| AT-11 | Eligibility expires between approval and dispatch | **Built** — `agentos/eligibility.js`; per code, re-read at dispatch |
| AT-12 | Cabin delivered, lift evidence missing | **Built** — `agentos/mobilisation.js`; a receipt is explicitly not an installation |
| AT-13 | Water and alarms failed, cabins installed | **Built** — `openService`; per service and per area, no waiver of a mandatory |
| AT-14 | Chat asks for energisation or gate bypass | **Built** — `agentos/autonomy.js`, A4 denied at the tool boundary, identically from an upload |
| AT-15 | Stale sensor, contradictory observations | **Built** — `agentos/sla.js`; UNKNOWN, not met and not breached |
| AT-16 | Credible critical alarm, bounded callout once | **Built** — `emergencyCallout`; capped, scoped, issued once |
| **AT-17** | **£100k, 20%, 5%, 5% → £125k / £120k / £114k** | **BUILT** — `agentos/commercial.js` |
| **AT-18** | **PV 60k, EV 48k, AC 55k → CPI 0.8727, SPI 0.8** | **BUILT** — `agentos/commercial.js` |
| AT-19 | Unknown mixed CIS or VAT treatment | **Built** — `agentos/tax.js`; blocks publication, raises a review |
| AT-20 | Cabin 17 supports Phase B's fire loop | **Built** — `agentos/offhire.js`, held at OFF-02 with the notice clock still running |
| AT-21 | Off-hire sent, no verified effective stop | **Built** — a sent message is not a received one; accrual continues |
| AT-22 | Collection complete, land condition rejected | **Built** — return and reinstatement are separate facts |
| AT-23 | Notice times out, model down | **Built** — UNKNOWN_OUTCOME fails OFF-06; the deadline survives it |
| AT-24 | Supplier PDF instructs the agent | **Built** — documents are untrusted data; `security.e2e` |
| AT-25 | Import a package with no verified approval | **Built** — `fromLegacyFamily` keeps an ambiguous mapping ambiguous |
| AT-26 | England dewatering evidence on a Scottish project | **Built** — `agentos/jurisdiction.js`; the prerequisite stays UNRESOLVED |
| AT-27 | Publish to CONSTRUX while the connector is down | **Built** — `agentos/outbox.js`; intent persists, ledger continues |
| AT-28 | Replay a duplicate message | **Built** — `applyInbound`; key AND version, out-of-order audited |

**All twenty-eight built.** Eight after the first pass, six with items 1 to 3,
and the last eleven with the seven aggregates in §6. The ones with exact
arithmetic went first, because a specification that states its expected answer
is a specification that can be turned into a test the same afternoon.

---

## 3 · What was built

### The twenty-one service codes · `shared/servicecodes.js`

`SERVICES` in `constants.js` is eight **sales** names, what a client ticks on an
enquiry form. This is the **delivery** taxonomy, at the granularity a package is
let at. Conflating the two is how a platform ends up unable to say which
supplier owns the drainage.

Six categories, twenty-one codes, each category carrying the critical
interfaces the specification gives it — carried on the code because an
interface with no service on each end of it is a note, not an interface.
`taxonomyIntegrity()` asserts every code belongs to exactly one category.

**Migration safety is the part that matters.** The specification requires
existing package IDs to survive. The seven legacy families are kept as
reporting tags and `fromLegacyFamily()` maps each to its codes — and a family
covering five codes is returned **ambiguous**, not resolved. Picking one of
five produces a register that reads correctly and allocates the wrong supplier
to the wrong removal obligation. A person reads the package.

### Concurrency and stored autonomy · `backend/lib/agentos/capacity.js`

AT-07 and AT-08, exact. Two things it does that the fixture does not ask for:

- **Cohorts are unioned by identity where identities exist.** The same three
  Skye cohorts, with membership rather than headcounts and twenty people on
  both shifts, come to **110 rather than 130** — and the welfare is otherwise
  oversized by a fifth. Where only counts are given, the answer is marked as
  resting on an assumption that the cohorts are distinct, which is the only
  honest thing to do with headcounts and no names.
- **The brief's figure is never overwritten.** A nominal 100 against a computed
  130 is a *discrepancy to report*, not an error to correct. Both numbers
  belong to the client, one of them is wrong, and a platform that silently
  substitutes its own has hidden the question.

On autonomy: with no reserve policy supplied, **no operational figure is
given**. 46.15 hours is the whole store run to empty, and inventing a reserve
would be inventing a safety margin. A reserve larger than the store is
reported, not clamped to zero.

### The pricing envelope and earned value · `backend/lib/agentos/commercial.js`

AT-17 and AT-18, exact. Three rules it will not soften:

- **Markup on cost is not margin on revenue.** 20% on £100,000 of direct cost
  is £20,000, and £20,000 on £120,000 of revenue is **16.67%**. Both figures
  are returned, each labelled, with a sentence saying the first must never be
  reported as the second. The specification is explicit and it is the number
  that gets repeated in a board pack with the wrong label on it.
- **The contingency is inside the envelope and outside the baseline.** Rolling
  it into the invoice basis bills a client for a risk that has not occurred;
  leaving it out of the envelope understates what the job needs.
- **No retention is deducted where the contract was not stated to provide for
  one.** A default would withhold money nobody agreed to withhold.

Money is held in **integer pence** throughout. 5% of £120,000 in floating point
is not reliably £6,000, and that difference reaches a certificate.

On earned value: a zero denominator gives **undefined**, not 1.0 — a CPI of 1.0
against no actual cost reads as a job performing exactly to budget, which is
the opposite of what no data means. And every result carries the separation the
specification insists on: EV is baseline achievement, not a client-certified
valuation and not a payable invoice.

`backend/test/agentos.test.mjs` — 47 assertions, registered in `run-all.sh`.

---

## 4 · The seventeen ET agents against the thirty built

| ET agent | Built as |
|---|---|
| ET-BD | `opportunity`, `bid`, `l7/bidscore.js` |
| ET-BRIEF | `site-requirements`, `village-requirements`, `diagnostic` |
| ET-SYS | `design`, `quantity` |
| ET-BUY | `procurement`, `tender-pack`, `compareQuotes` |
| ET-PLAN | `programme`, `l7/bidprogramme.js` |
| ET-MOB | `mobilisation-review` |
| ET-TEST | `commissioning` |
| ET-OPS | `siteops` |
| ET-QA | `assurance`, `audit` |
| ET-COM | `commercial`, `l7/estimating.js`, `agentos/commercial.js` |
| ET-VERIFY | `challenge` + the issue gate in `l7/issue.js` |
| ET-ORCH | Partly — `l7/gates.js` owns the lifecycle; no case graph or owner ledger |
| ET-OFF | Partly — `handover-file`; off-hire and reinstatement not built |
| **ET-TW** | **Not built** — temporary works design and check register |
| **ET-ENV** | **Not built** — land, environmental and jurisdictional profiles |
| **ET-LOG** | **Not built** — security, deliveries, routes, workforce transport |
| **ET-PORT** | **Not built** — multi-site capacity, cash and supplier exposure |

Eleven map cleanly, two partly, four absent. The platform also has nineteen
agents the specification does not name, which is not a gap in either
direction: `notice`, `obligation`, `change`, `recovery`, `safety`, `model`,
`lifecycle`, `productivity`, `asset`, `submission`, `estimating`,
`handover-file` and the rest are the deterministic engines the specification's
§10 calls a calculation component.

---

## 5 · Items 1 to 3, built

### 1 · The off-hire engine · `backend/lib/agentos/offhire.js`

OFF-01 to OFF-06 in sequence, stopping at the first failure, with the
remaining rules reported as **not reached** rather than as passed. Order is
not a preference: reading the dependency graph for an actor who may not act
is wasted work, and pinning a contract clause for an action that is not
permitted pins the wrong thing.

**Two findings, kept apart, and this is the point of the module.** Cabin 17 is
empty, costs hire, and its panel still serves Phase B's live fire loop. The
withdrawal is `HELD`. The charge is `ACCRUING`. Both are returned, because a
single verdict would lose whichever the caller did not ask about — and the
failure that costs money is the second one being forgotten while everybody
attends to the first. The notice deadline is computed and reported **through
the hold**: an asset decided three weeks ago to be returned, held on a
dependency and forgotten commercially, costs another full charge period.

**And a sent message does not stop billing.** Ten facts are recorded
separately — request, notice dispatch, supplier confirmation,
contract-effective stop, isolation, collection, return, damage, accrued hire,
invoice closure — and none implies another. `billingStop` will not name a stop
date without the evidence the agreement requires: a dispatched notice returns
`RECEIPT_UNCONFIRMED` and a running accrual, and where the contract stops
charges on **return**, a completed collection does not do it. The fact the
contract names is the one that counts, not whichever happened first.

### 2 · The five execution classes · `backend/lib/agentos/autonomy.js`

A0 observe, A1 reversible internal write, A2 delegated act, A3 prepare and
route, A4 **deny**. Mapped onto the existing L0–L7 ladder in `l7/policy.js`
rather than placed beside it.

**A4 is the one that matters and it is checked first.** Before any permission
is read, because a denied action does not become permitted by arriving with a
valid delegation. Five denials: energise or isolate live equipment, actuate a
gate or bypass its emergency control, impersonate a competent person, bypass a
mandatory hold, fabricate field or regulator evidence.

**The verdict does not vary with the source.** The specification's own test
asks for energisation "from chat or uploaded note". Text in a supplier's PDF,
a site diary or a drawing comment is data. A platform that denies a request
typed by a person and performs the same request found in an attachment has a
control that protects it from its own operators and from nobody else. The
source is reported and explicitly not weighed.

**And every denial names who does carry the action.** Refusing to energise a
panel and saying nothing else leaves somebody with a live problem and no
route. The actions on this list are not forbidden in the world, only forbidden
here.

Two bindings, and they are different bindings. An **A2 delegation** binds the
actor and the shape — twelve fields, and a partial one is not a delegation but
a preference. Note the case the cap exists for: £900 against a £1,000
per-action threshold and £4,500 already used against a £5,000 cumulative cap
passes the threshold and fails the cap. An **A3 authority** binds the
*payload*: payload, attachments, evidence, contract and authorisation snapshot
compared field for field, so a material change invalidates an authority that
has not yet been used. A changed attachment is the easy one to miss and it is
checked.

### 3 · Jurisdiction profiles · `backend/lib/agentos/jurisdiction.js`

England and Scotland as separate regimes, not one with regional variations.
Four regulated activities with their route on each side: dewatering, site
run-off, building consent, procurement.

**AT-26 is the failure that is invisible on a register.** An Environment
Agency position statement for temporary dewatering is genuine and correctly
issued. Filed against a Scottish prerequisite it leaves the site discharging
without authorisation while the row shows closed. So the requirement stays
**UNRESOLVED**, the English document is called *inapplicable* rather than
wrong, and the correct route is named — a water activity authorised by SEPA.

An unknown jurisdiction **fails closed** rather than defaulting to England,
which is the direction that error always runs.

The vocabulary is carried too: on Skye it is a **building warrant** from a
**verifier** against the **Scottish building standards**, and the regulator is
**SEPA**. Asking a Highland client for "Building Regs sign-off" tells them the
author has not worked there, which costs the same as being wrong.

`backend/test/agentos-controls.test.mjs` — 67 assertions, registered in
`run-all.sh`.

---

## 6 · The seven aggregates, and the eleven tests that needed them

Each of the last eleven acceptance tests needed something that did not exist.
Each aggregate is built around one failure that reads as success.

| Aggregate | Module | The failure it prevents |
|---|---|---|
| Asset receipt and the seven mobilisation gates | `agentos/mobilisation.js` | A delivery note that looks like completion to every system that reads it. Receipt, installation, commissioning and opening are four gates, and `assetReceipt` returns `installed: false` explicitly so no caller can treat one as another |
| Opening, per service and per area | same | A compound opening late instead of opening *partly*. Cabins installed with water unproven and the fire alarm failed opens for the services that pass, in the areas they cover — and **a release that waives a mandatory requirement is not restricted, it is unauthorised** |
| Supplier and package eligibility | `agentos/eligibility.js` | One flag called "approved". A supplier eligible for office furniture is not eligible for electrics, and only the checks a scope actually attracts are applied — applying all of them to all is as wrong as applying none. Re-read at dispatch, so a lapse blocks that package and no other |
| Hire agreement under a model cutover | `agentos/cutover.js` | The ledger has one model field, the new model's rules get applied to the whole of it, and the first anybody knows is a supplier invoice addressed to the party that did not order. Historical commitments keep their owner; mixed ownership with no verified assignment is **blocked** |
| Treasury reservation | `agentos/treasury.js` | Two orders arriving in the same minute each seeing the same headroom. Reserved transactionally, before the order, and the excess is **blocked rather than queued** — a queued order binds when the queue drains |
| Observation, SLA clocks and bounded callout | `agentos/sla.js` | A credit note issued off a stale sensor. A stale reading is a data-quality incident and the SLA state is **UNKNOWN**: marking it met is a lie and marking it breached pays a credit on a sensor fault. Four clocks, because a supplier who answers in four minutes and arrives in nine hours has met one target and missed another |
| Tax determination | `agentos/tax.js` | A guessed VAT treatment. Assume reverse charge and a supply to an end user is understated; assume standard VAT and a construction supply is overstated. An unknown blocks publication above materiality and raises a scoped review |
| Connector outbox and idempotency | `agentos/outbox.js` | Two opposite failures. Intent lost while a connector is down — so it persists and the ETABLIX ledger carries on, because a platform that stops when a downstream system does has made its own operation depend on somebody else's uptime. And a duplicate applied twice — so an idempotency key **and** an aggregate version, because the key alone misses an older message arriving after a newer one |
| Beds, separated from day-use | `agentos/capacity.js` | Overnight accommodation treated as larger day-use welfare. Bed-nights rather than a headcount, cleaning turnaround taking rooms out of service, and overnight opening **held** on a use classification and fire approval that are the verifier's and not the layout's. The day-use welfare that passed stays open |

`backend/test/agentos-aggregates.test.mjs` — 85 assertions, registered in
`run-all.sh`.

---

## 7 · What is still not built

Every acceptance test in the specification now passes. What remains is not a
test but a surface:

- **The four absent ET agents** — ET-TW, ET-ENV, ET-LOG, ET-PORT. The
  jurisdiction profile is the substance ET-ENV would use and the off-hire
  engine is part of ET-OFF's, so these are briefs and pipelines over engines
  that now exist rather than new engines.
- **ET-ORCH's case graph and owner ledger.** `l7/gates.js` owns the bid
  lifecycle; a general workflow-ownership ledger across all ten workflows is a
  different object.
- **Persistence.** Every engine here is a pure function over inputs. The
  specification's §10 aggregates, §11 API paths and the durable-workflow
  runtime are the application around them, and none of it is written. That is
  deliberate: an engine that is a function is testable to an exact figure,
  which is how twenty-eight acceptance tests became twenty-eight passing
  assertions. Wiring them to stored state is the next job and it is an
  application job.

---

## 8 · Build order for what remains

1. **Supplier and package eligibility states, with AT-11.** Thirteen states and
   the rule that matters — eligibility for office furniture does not establish
   competence for electrics or transport.
2. **The mobilisation gates, with AT-12 and AT-13.** Order, dispatch, lift,
   connect, open, change, remove. The platform has G0–G7 for a bid; this is
   the same machinery for a physical asset, and `l7/gates.js` can carry it.
3. **ET-TW, ET-ENV, ET-LOG, ET-PORT**, and with them AT-05, AT-06, AT-15 to
   AT-19 and AT-27, each of which needs an aggregate that does not exist yet —
   a hire agreement, a treasury reservation, a sensor reading, a tax
   determination, a connector queue.

These are the specification's increments 2 and 3 and are a different size of
job from items 1 to 3 above. Nothing in them is blocked; each needs its
aggregate built first, and an aggregate is a schema, a migration and a
lifecycle rather than a function.

---

## 9 · Two cautions on the specification itself

**The Skye figures are a software fixture and the specification says so.** 100
nominal, 130 peak, 300 m², 40 L/person/day — "These inputs test the software.
They do not set potable, welfare or engineering requirements." That line should
survive into any document generated from this work, because a fixture quoted
into a client deliverable becomes a design assumption nobody made.

**The commercial parameters are proposed defaults, not adopted figures.** 20%
management, 5% contingency, 14-day customer payment, 30-day supplier payment,
5% retention. The specification labels them starting configuration subject to
executed terms. They are implemented as a versioned profile with explicit
inputs and no defaults applied where the contract is silent — which is why
`pricingEnvelope` deducts no retention unless told the contract provides for
one.
