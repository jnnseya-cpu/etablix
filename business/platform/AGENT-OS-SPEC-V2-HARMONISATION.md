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

## 1 · The conflict: "Principal Service Contractor"

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

**So the harmonisation runs the other way.** The specification should be
corrected to "Prime Service Contractor" at §2, and the platform left alone.
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
| AT-05 | Model change with open hire keeps original liability | **Not built** — no hire aggregate |
| AT-06 | Model 03 order exceeds headroom | **Not built** — no treasury reservation |
| **AT-07** | **72 + 50 + 8 at Skye → 130** | **BUILT** — `agentos/capacity.js` |
| **AT-08** | **130 × 40 L, 10 m³, 2 m³ reserve → 5.2, 46.15 h, 36.92 h** | **BUILT** — `agentos/capacity.js` |
| AT-09 | Overnight use added to a day-use brief | Partly — `village-requirements` pipeline; beds not separated from day-use |
| AT-10 | Quote excludes transport and connection | **Built** — `evaluatedCost` / `compareQuotes` in `l7/estimating.js` |
| AT-11 | Eligibility expires between approval and dispatch | **Built** — `quoteValidity`; supplier eligibility states not built |
| AT-12 | Cabin delivered, lift evidence missing | **Not built** — no asset receipt state |
| AT-13 | Water and alarms failed, cabins installed | **Not built** — no opening gate |
| AT-14 | Chat asks for energisation or gate bypass | Partly — A4 denial is not a modelled class |
| AT-15 | Stale sensor, contradictory observations | **Not built** |
| AT-16 | Credible critical alarm, bounded callout once | **Not built** |
| **AT-17** | **£100k, 20%, 5%, 5% → £125k / £120k / £114k** | **BUILT** — `agentos/commercial.js` |
| **AT-18** | **PV 60k, EV 48k, AC 55k → CPI 0.8727, SPI 0.8** | **BUILT** — `agentos/commercial.js` |
| AT-19 | Unknown mixed CIS or VAT treatment | **Not built** |
| AT-20 | Cabin 17 supports Phase B's fire loop | **Not built** — the OFF-01..06 engine |
| AT-21 | Off-hire sent, no verified effective stop | **Not built** |
| AT-22 | Collection complete, land condition rejected | **Not built** |
| AT-23 | Notice times out, model down | Partly — `l7` durable gates; UNKNOWN_OUTCOME not modelled |
| AT-24 | Supplier PDF instructs the agent | **Built** — documents are untrusted data; `security.e2e` |
| AT-25 | Import a package with no verified approval | **Built** — `fromLegacyFamily` keeps an ambiguous mapping ambiguous |
| AT-26 | England dewatering evidence on a Scottish project | **Not built** — no jurisdiction profile |
| AT-27 | Publish to CONSTRUX while the connector is down | **Not built** |
| AT-28 | Replay a duplicate message | Partly — `rerun.e2e`, `upload-dedupe` |

**Eight built, five partly, fifteen not.** The four with exact arithmetic are
all built, because a specification that states its expected answer is a
specification that can be turned into a test the same afternoon.

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

## 5 · Build order for what remains

1. **The off-hire dependency engine, OFF-01 to OFF-06, with AT-20 to AT-23.**
   The specification's own increment 1 and the right first build: it is the
   vertical slice that touches authority, dependency, notice clock, dispatch
   and reconciliation at once. Cabin 17 serving Phase B's live fire loop is a
   better test than any synthetic one, because the commercial answer and the
   safety answer point in opposite directions.
2. **Autonomy classes A0–A4, mapped onto the existing L0–L7.** `l7/policy.js`
   already has eight levels with risk classes; the specification has five
   execution classes with delegation binding. These are the same idea at
   different granularities and should be one table, not two. A4 — deny tool
   and command — is the one with no equivalent and it is the one worth having:
   energisation, isolation, gate actuation and evidence fabrication refused at
   the tool boundary rather than declined in prose.
3. **Jurisdiction profiles, England and Scotland, with AT-26.** Small, and it
   prevents a specific and embarrassing error: discharging a Scottish
   prerequisite with English guidance. On Skye this is SEPA rather than the
   Environment Agency, and building standards rather than Building Regulations.
4. **Supplier and package eligibility states, with AT-11.** Thirteen states and
   the rule that matters — eligibility for office furniture does not establish
   competence for electrics or transport.
5. **The mobilisation gates, with AT-12 and AT-13.** Order, dispatch, lift,
   connect, open, change, remove. The platform has G0–G7 for a bid; this is
   the same machinery for a physical asset, and `l7/gates.js` can carry it.
6. **ET-TW, ET-ENV, ET-LOG, ET-PORT.**

Items 1 to 3 are each a day's work on the established `*check.js` and
`gates.js` patterns. Items 4 to 6 are the specification's increments 2 and 3
and are a different size of job.

---

## 6 · Two cautions on the specification itself

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
