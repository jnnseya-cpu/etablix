# Trend Intelligence AI v2.3 — what was built, what already existed, what was not

**Specification:** *Trend Intelligence AI — Developer build and distribution
specification*, Version 2.3, 10 November 2026. 530 lines, 22 sections, Appendix
A (the machine-readable agent contract) and 18 numbered sources.

**Its own precedence rule, applied:** "Where a pilot illustration differs from
an implementation rule, follow §§12–22." Every decision below was taken against
Part II. §§1–11 were read for the design reasoning and are quoted only where
Part II refers back to them (the §5 scoring formulae, which §17 adopts
verbatim, and the §10 experiment discipline, which §18 adopts for native
measurement).

**What the specification itself says it is not:** "This is a researched build
specification. No host repository, credentials, traffic, actual model benchmark
or production integration was supplied for verification." Nothing below claims
otherwise. The 6–8 week pilot range in §11 and the 24 GB GPU sizing in §8 are
the specification's own stated hypotheses and have not been tested here.

---

## 1 · The engine, built and tested

Eleven deterministic modules in `backend/lib/trendintel/`, 3,033 lines, plus
an 835-line typed API at `/api/trendintel` and 1,341 lines of test.

| Module | What it owns | Spec |
|---|---|---|
| `score.js` | `lift = ln((c+1)/(b+1))`, the robust MAD z-score with its 0.2 denominator floor, the count gate at c ≥ 20 and z ≥ 2, `clamp(50 + 10z, 0, 100)`, the five opportunity weights, the four confidence weights, the 69 single-family cap, the four decision bands | §5.3–5.5, §17 |
| `sources.js` | 14-field registration, the three access paths, what a signal proves, staleness, syndication collapse, cluster separation, self-generated spikes | §3, §17 |
| `observations.js` | The four-part source version key, accepted / duplicate / conflict, atomic batch failure with indexed errors, the 500-item and 1 MiB limits, the 7-day correction horizon, installation resolution | §5, §15, §16 |
| `brief.js` | Growth Brief v1 as a **closed** object — 22 required fields, every pattern and bound in Appendix A — then the runtime rules separately: window, channel membership, route availability, policy and profile revision, evidence and claim scope | §6, §16, Appendix A |
| `inference.js` | Route selection across host / deployment / deterministic with **no implicit cross-provider fallback**, request binding, structured-output acceptance, the one retry, the deterministic template, capability-unavailable reporting | §2, §14, §17 |
| `actions.js` | The ten-state machine, the two live action kinds, the three patchable fields, the eleven out-of-scope fields, the derived idempotency key, approval bound to payload hash and target revision, author ≠ approver, the execution-time re-check, rollback authorisation | §6, §16, §18 |
| `adapter.js` | `get_asset` / `apply_patch` / `get_receipt` / `restore_patch`, compare-and-set on all fields at once, three receipt states, receipt reconciliation, the native owned surface and its public read | §18 |
| `entitlement.js` | Four packages, five statuses, idempotent provisioning, provider-sequence reconciliation, reserve-before-generate metering, the 429 with its reset timestamp, the 30-day recovery window, offline signed entitlement | §19 |
| `measurement.js` | The eleven fields frozen at approval, outcome classification, small-cohort suppression, observational versus incremental labelling, the erasure log and its replay after restore | §10, §15, §18 |
| `installation.js` | The six-field minimum profile, draft-only defaults, explicit write enablement, the four-period threshold, profile-driven resolution, the five build gates and the twenty-item hard release gate | §12, §14, §20 |
| `openapi.js` | The published specification, **generated** from the constants the handlers enforce: 23 paths, 32 error codes each carrying the reason it exists, the Growth Brief imported under components | Appendix A, §16 |

**The contract is on disk, not described.**
`contracts/growth-brief.v1.schema.yaml` is Appendix A's YAML extracted
verbatim. `contracts/fixtures/growth-brief.positive.json` is §6's payload and
`contracts/fixtures/installation-profile.v1.json` is §16's. The validator is
asserted against the positive fixture, so the schema file and the code cannot
drift without a test failing.

**The specification is served, not described.** Appendix A makes
`/openapi.json` a G1 deliverable. It is generated on every call from the same
constants the handlers enforce, and three agreement tests hold the two
together: every route the router registers is published, nothing is published
that the router does not serve, and **the scope each handler demands is the
scope the document declares** — so a credential provisioned from the document
is the credential the API accepts. It stays behind the session because in this
platform the whole surface is internal; serving it publicly is a deployment
decision, not a different document.

**Proof.** `backend/test/trendintel.test.mjs` — 236 assertions, all 22
reference conformance scenarios of §21, each marker inside its own assertion.
`backend/test/trendintel.e2e.mjs` — 68 assertions over the wire, including the
whole chain that changes a public page: propose, approve from a second
session, apply by compare-and-set at r1 → r2, replay the execute and get the
stored response with the asset still at r2, then roll back to r3 restoring the
previous values.
`backend/test/lock.test.mjs` now locks 36 Trend Intelligence rule sets by
value, so a rename fails as loudly as a deletion, and refuses to pass if any
of TI-01 to TI-22 stops being named inside an assertion.

---

## 2 · The overlap nobody should build twice

**This platform already reads signals.** `backend/lib/signals/` is 2,040 lines
across four files, with four operator tools (`signals-sweep`, `signals-check`,
`signals-relink`, `signals-digest`) and a source list at
`backend/data/signals-sources.json` holding **25 real sources, of which 2 are
enabled** — `construction-enquirer` and `construction-index`. The other 23 ship
disabled because their URLs were never confirmed reachable, which is recorded
in each entry's own `verify` field.

That layer already does what §3 describes for this business: it polls permitted
public feeds with no credential, parses them deterministically, scores them,
and puts them in a queue a person reads. It has a rule the Trend Intelligence
specification does not state and must not lose: **it has no send path, and
adding one would make it the thing it was built instead of.**

**Where the two differ, and it is not cosmetic.** `signals-sources.json`
records seven fields per source: `id`, `name`, `org`, `url`, `contactPage`,
`verify`, `enabled`, `sector`. §3 requires fourteen. The seven it does not
record are:

| Missing field | What its absence prevents |
|---|---|
| `terms`, `permittedUses` | Whether that feed's content may be used **in a paid product**. §19 makes this a sale-readiness item: "record which feed licences allow use in a paid product." Two of the twenty-five are trade-press feeds whose terms have not been read. |
| `accessPath` | Whether the source is keyless, host-mediated or an import — the field the whole release gate in §2 is measured against. |
| `cadence`, `ingestionLagMinutes`, `staleAfterHours` | Whether an observation from it may support a **fresh automated action**. Without a stale-after limit, `sourceFreshness()` returns unknown, and unknown is not fresh. |
| `retentionDays` | What the retention job deletes and when. |
| `failureStatus` | Whether a silent feed is a gap or an outage. A gap is unknown data; an outage is excluded from scoring. |

**Consequence, in work:** bringing the 25 existing sources under the §3
registry is a one-off exercise of roughly half a day — the fields are known for
the two enabled feeds and have to be read off the licence page for the rest —
and it cannot be automated, because reading a feed's terms is the task. It is
**not** done in this commit and is listed in §6 below with an owner.

**Find a Tender.** The specification cites it as source S4 and this repository
already carries procurement-portal entries. `find-tender.service.gov.uk` is not
resolvable from this build session's network, so no live call has been made
from here and the entry's status is unchanged. That is a session limitation,
not a finding about the feed.

---

## 3 · What was deliberately not built, and what that costs

The specification's reference implementation is **Python 3.12, FastAPI,
Pydantic, SQLAlchemy, PostgreSQL, Alembic, a React admin console, a
PostgreSQL job and outbox worker, S3-compatible evidence storage, Docker
Compose for development and Helm with immutable image digests for production**
(§12, §13). None of that was built. This platform is Node and Express on one
container with a JSON document store, and a second runtime inside it would
create two sources of truth for the same records — which is a worse outcome
than not having the second runtime.

Four specific capabilities are therefore **not present**, and each is named
rather than glossed:

1. **PostgreSQL forced row-level security (§15, source S17).** Isolation here is
   enforced in application code: `installation_id` on every private row, and
   `resolveForCaller()` which never selects another installation's rows rather
   than filtering them afterwards. TI-02's first two clauses — zero rows
   returned, and a cross-installation id resolving as 404 — are proved.
   **Its third clause, "the database runtime role also denies access
   directly", is not proved, because there is no SQL runtime role to test.**
   The specification's own requirement that "integration tests must exercise
   the actual runtime role and a pooled connection reused by a second tenant"
   cannot be met on this stack. If this engine is ever deployed for a second
   paying tenant, that is the gap to close first, and closing it means
   PostgreSQL.
2. **A model service.** No module in `backend/lib/trendintel/` makes a provider
   call or any outbound request, and `practitioner.test.mjs` now asserts that
   by reading the source of all ten. `selectRoute()` chooses between an
   authorised host gateway, a deployment-supplied route and deterministic
   templates; the caller supplies the attempt. So the platform's audited count
   of four provider call sites is unchanged. The consequence is that the
   deterministic path is the only one exercised end to end here, and §20's
   hard release gate item `realModelOutput` is **unevidenced** — which
   `hardReleaseGate()` reports by name rather than passing.
3. **The two candidate open-weight models (S13, S14), the local C++ inference
   runtime (S15), vLLM structured output (S16), pgvector.** No weights are pinned, no benchmark was run, and the
   24 GB single-worker sizing in §8 remains the specification's hypothesis.
   Clustering here is lexical and intent-separating, which §12 permits
   ("use lexical clustering initially with optional local embeddings").
4. **Signed OCI images, Helm, SBOM and model manifest (§13, §19).** The
   platform's own deployment is `deploy/update-all.sh`, which verifies that the
   running container's build hash matches the checkout and exits non-zero
   naming `rollback.sh`. That is a different and smaller promise than a signed
   image with a pinned asset manifest, and it is the promise that is kept.

---

## 4 · Six places the specification left a choice, and what was chosen

1. **The demand component across families.** §17 says "the median of the
   highest-weight valid observation per independent source family … with
   deterministic tie-break by source ID". Implemented exactly: one observation
   per family, highest weight, lexicographic tie-break on source id, then the
   median of those. A feed that publishes the same story four times therefore
   does not outvote one that published it once.
2. **The single-family cap and context-only sources.** §5.5 caps one source
   family at 69 and §17 says context-only sources cannot satisfy the
   corroboration minimum. These are applied together: the cap is tested
   against *independent families minus context-only families*, so two families
   of which one is Wikimedia pageviews is still capped as one. Attention is not
   corroboration of intent.
3. **The idempotency key is derived, not supplied.** §6 lists its seven
   components; `idempotencyKey()` computes it from them rather than accepting
   one. A retry of the same intent therefore produces the same key without the
   caller having to have remembered one, which is the only version of
   at-least-once delivery that is safe in practice.
4. **An approver is an account, not a string.** §18.2 requires author and
   approver to differ. The first implementation of the native-page route
   compared a free-text `approvedBy` against the session's display name, and
   the end-to-end test caught it: `"admin"` against a session named `"Admin"`
   passed, so one capital letter let one person create and approve the same
   public page. The approver is now resolved server-side to an active account
   by id or email and checked against the caller's own id **and** email.
   Segregation compared on a free-text string is a spelling test.
5. **Rollback is authorised by scope and logged to its requester, not
   countersigned.** §18.2 requires author and approver to differ on a live
   change; §18.6 requires a rollback to be "a new logged, authorised
   compensating action" and adds that a freeze still permits one. Those are
   different requirements and the difference is the direction of travel: the
   forward write puts something new in front of the public, and the rollback
   returns the asset to a revision that was already live and already approved.
   The first implementation compared the rollback's requester against the
   *forward action's* author and so refused every rollback by the person who
   had proposed the change — the most likely person to notice it was wrong,
   at the worst possible moment. `action:rollback` scope is now the
   authorisation, the requester is recorded, and an installation that wants two
   people passes `coApprover`, which must differ.
6. **Grants are explicit and per installation, and the creating identity
   cannot approve.** §14.2 requires "explicit per-install grants" and "no
   application-wide shared production token". The first implementation scoped
   an installation by its owner — one identity. Every guard passed and the
   end-to-end test found the consequence: **the only identity that could
   propose a live action was the only one that could approve it, self-approval
   is refused, so no live write could ever be published.** The primary
   workflow was unreachable while every individual check worked, which is the
   exact shape of failure this platform keeps finding. There is now a grant
   table, a `POST /v1/grants` that resolves its subject to an active account,
   per-operation scope checks on every one of the 22 handlers that resolve an
   installation, and a creating identity that
   holds every scope **except** `brief:approve` and `action:approve` — so a
   second named account is part of setting an installation up rather than
   something somebody remembers later.

---

## 5 · What the build actually enforces, in one list

- **Keyless.** Nothing in the engine requests a credential. A source or
  destination needing one is reported unavailable with the reason, and the
  workflow continues on the owned surface (TI-22).
- **No implicit cross-provider fallback.** A reachable route is not an
  authorised one; the trail records that a route existed and was not approved
  (TI-19).
- **Draft-only by default.** A new installation enables first-party ingestion
  and manual imports and nothing else; every write connector is disabled; the
  first native page is created and approved by two different people (TI-16).
- **Out of scope is out of scope.** URL, slug, redirects, canonical, robots,
  noindex, structured data, schema, permissions, template code and sitemap are
  refused, not gated. Each can remove a page from an index or break a
  template, and none is undone by restoring a field value.
- **Approval dies when anything it was given against moves.** The payload hash,
  the target revision, the brief revision, the policy revision, the profile
  revision, the freeze and the entitlement are checked at approval and
  **again** at execution (TI-05).
- **One side effect, provable.** An ambiguous completion holds at
  `reconciliation_required` and is resolved by asking the adapter with the
  original key, never by retrying on a guess (TI-07).
- **A result says how it was measured.** Without assignment it is labelled
  observational; with a causal method and no comparable control it is
  inconclusive, not quietly observational under a causal heading.
- **Erasure survives a restore,** and external execution stays quarantined
  until reconciliation finishes (TI-15).
- **Authority is held, not compared.** Each of the 22 scoped operations names
  the one scope it needs, the grant is checked before any record is read, and the
  published specification declares the same scope the handler demands.

---

## 6 · What remains, with an owner and a date

| # | Item | Owner | By |
|---|---|---|---|
| 1 | Register the 25 existing sources in `signals-sources.json` under the §3 fourteen-field registry — reading each feed's licence for `terms` and `permittedUses`, and setting `staleAfterHours` per source. Until this is done no existing source can support a fresh automated action, because an unknown stale-after limit returns unknown and unknown is not fresh. | Justin Nseya | 24 Nov 2026 |
| 2 | Decide whether this engine is ever to serve a second paying tenant. If yes, PostgreSQL with forced row-level security is the first piece of work, and TI-02's database clause is the acceptance test. If no, record that decision here so the gap in §3 above stops reading as an omission. | Justin Nseya | 24 Nov 2026 |
| 3 | Confirm the two enabled feeds' licences permit use in a paid product (§19 sale readiness). Construction Enquirer and Construction Index are trade press; neither licence has been read. | Justin Nseya | 1 Dec 2026 |
| 4 | Add the test suite to the deploy path. `deploy/update-all.sh` verifies the build hash and does **not** run `backend/test/run-all.sh`. That is the last remaining way something built here could silently stop working in production. | Justin Nseya | 24 Nov 2026 |
| 5 | If a model route is ever authorised, the hard release gate item `realModelOutput` becomes evidenceable and §20's full gate can be run. Until then `hardReleaseGate()` reports it unevidenced by name, which is the honest state. | — | on authorisation |

Item 4 is not specific to this specification — it was already the open hole in
"nothing silently changes" — and it is listed here because this commit adds
1,119 lines of test that the deploy path will not run.
