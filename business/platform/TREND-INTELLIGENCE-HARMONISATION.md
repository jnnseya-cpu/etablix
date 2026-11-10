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

Twelve deterministic modules in `backend/lib/trendintel/`, plus four worker
engines in the platform's own engine registry, an internal control plane at
`/api/trendintel`, and three test suites.

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
| `platform.js` | **The embedding.** Nothing in it is a new capability: every function connects something the engine needs to something this platform already had — see §6 | §1, §3, §4, §14 |

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

## 2 · The overlap, now closed

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

**What was done about it.** All 25 are now registered under §3 on every sweep,
by `registerPlatformSources()`, which derives twelve of the fourteen fields and
records the two it cannot — `terms` and `permittedUses` — as **unread** rather
than filling them in with something plausible. The consequence is enforced, not
noted: a source whose licence has not been read is registered as
**context-only**, which means it cannot satisfy the corroboration minimum and
cannot on its own support an automated action. All 25 are in that state today.

So the registry is complete and the engine behaves correctly without anybody
having read a licence; reading one *improves* what that feed can do. The
remaining act is a person reading terms, which cannot be automated because
reading the terms is the task. It stays in §7 with an owner.

**What promotion requires, and why it is four fields.** `terms`,
`permittedUses`, `termsUrl` and `termsReadBy`, recorded together. Three of the
four is ignored and the partial record is reported by name, because whether a
publisher's terms permit use in a paid product is a legal judgement about
copyright and database right, and an unattributed judgement is worth nothing:
there is nobody to ask what was decided and nothing to re-read if it turns out
to be wrong. `permittedUses` takes the narrowest true answer — a licence that
permits counting and not citing gets `detection` alone, and that source then
cannot evidence anything, which is correct.

**One modelling error this found.** The first version had trade press prove
*attention*, which is a context-only class. A trade-press feed could therefore
never corroborate, which meant reading its licence changed nothing that
mattered — and the whole point of reading one is that it lets a feed
corroborate. It was also wrong on the facts: attention is a measure of how many
people looked at something, and an article reporting that a main contractor has
been appointed is reporting a decision. §3 lists curated industry RSS as
"context or corroboration", not as attention. Both the portal and the press now
prove a decision, and the difference in reliability lives where the
specification puts it — `qualityScore`, 85 against 55, which confidence weights
at 35%.

**Two entries the registration refuses.** An entry with no address, or with
neither a name nor an organisation, is refused with the reason rather than
completed from its id. The first version derived all fourteen fields from
whatever an entry happened to carry, so `{id: "nope"}` — a half-finished line
or a typo in the live list — produced a complete, healthy-looking registration
for a source that could not be read. The test now asserts the refusal.

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

## 6 · The embedding: where the platform's own machinery drives it

Built on its own the engine is a second product — its own sources, its own
queue, its own surface, driven by nobody. Every piece works and nothing
changes, which is the most expensive kind of correct there is. Seven seams
connect it instead.

| Seam | What drives it, and why there |
|---|---|
| **Sources** | `backend/lib/signals/` — the trigger watch, 2,040 lines and 25 registered feeds — **is** the source collector of §4. It is not replaced and gains no second list. §4 says that worker needs no model, and it does not have one. |
| **Observations** | every signal the sweep queues becomes an observation on the **same pass**, inside `sweep()`, through `ingestBatch` so the four-part key and the duplicate-versus-conflict rules apply. A second job reading the same feeds would double every count and halve every host's patience. |
| **Provenance** | the signal's own fingerprint is the observation's provenance key, so the collapse of four rewrites of one award into one source family uses the mechanism the watch already had rather than a second one. |
| **First party** | `lib/reach.js` already counts what is read on the site with crawlers excluded. That is §3's first-party aggregate and §18's eligible-session denominator, and it needed no analytics tag and no third-party credential — the keyless requirement met by something that was already there. |
| **Scoring** | runs inside the existing sweep and writes the band onto the **existing signal row**. There is no second queue for somebody to read, because a second queue is how a reading list dies. The existing page renders none of the new fields, so nothing changed on screen. |
| **Control** | the brief reaches five of the thirty-eight agents in `runAgent`, appended as DATA after the appointment clause and therefore after everything that constrains. Both run paths carry it — the pipeline agents and the single-call agents — because a control layer that reaches one of two reaches neither reliably. The other thirty-three send a prompt that is byte-for-byte what it was before. |
| **Outcomes** | enquiries and page views that already exist. Nothing is instrumented and nothing is estimated, and a downstream conversion the platform does not actually receive is not counted. |
| **Schedule** | the `signal_watch` rule it already runs on. **No fourteenth rule was added**: a new rule is a new switch somebody has to find, and an engine that only runs once a person enables it does not run. |

**The four §4 workers are in the platform's own registers**, not in a registry
of their own: `demand`, `priority`, `briefing` and `uptake`, each in the engine
registry, the agent register and the domain register under the Tender and
Commercial Engine — because an eighth engine group *is* the separate product.
That takes the platform to 38 agents and 24 engines, and the agreement checks
that already existed caught every place a single addition had to be made.

### What it refuses to do, with the check that stops it

- **It cannot relax anything.** `narrowsOnly()` refuses a brief that offers a
  claim the installation has not approved, or that drops a standing
  prohibition. The six — Principal Contractor, Principal Designer,
  self-delivery, holding the supplier contracts, holding the client's money,
  any price — are carried into every drafted brief rather than assumed. A
  record in a database does not get to relax the company's position.
- **It cannot acquire a send path.** The watch's founding rule is that it finds
  moments and never sends. `trendintel-embedded.test.mjs` reads the source of
  `platform.js` with comments stripped and fails on a fetch, a mailer or an
  outbox write.
- **It cannot infer readiness.** No public feed knows this business's supplier
  coverage, lead times or commitments. Unevidenced readiness is a **veto**, so
  every segment scored from feeds alone stays in watch — asserted on real
  observations rather than on an empty store.
- **It cannot become visible.** No page exists for it, internal included. The
  test asserts that not one file under `frontend/public` mentions it, that the
  sitemap, robots and llms files do not list it, that the key-authenticated
  public API does not reach it, that no business document outside
  `business/platform/` names it, that every route on the control plane sits
  below `router.use(requireAuth)` with no handler registered above that line,
  and that the text the brief puts in front of an agent carries no AI or agent
  language — because those words can end up in a draft a customer reads.

**Why the control plane still exists.** `/api/trendintel` is an internal
control plane beside `/api/l7` and `/api/agentos`, which are the same shape and
carry the same "internal only, never public" note. What made the engine
separate was not that it had an API; it was that nothing in the platform called
it. The seven seams above are the answer to that, and the API is what a person
uses to approve a brief — the one act in the whole workflow that must not be
automated.

---

## 7 · What remains, with an owner and a date

| # | Item | Owner | By |
|---|---|---|---|
| 1 | **Read the two licences.** Run `docker exec etablix node backend/tools/signals-terms.mjs construction-enquirer construction-index` on the VPS — neither host is reachable from a build session, which is why the tool runs where the sweep does. It prints the clauses bearing on copying and reuse with the URL and the date, and decides nothing. Read them, decide whether they permit using a headline and summary inside a product this business charges for, and add the four fields to the live list. That promotes each source from `context` to `decision`, and two promoted independent families are what corroboration needs. Until then nothing the engine reads can release anything by itself, which is the correct state and not a fault. | Justin Nseya | 24 Nov 2026 |
| 2 | Decide whether this engine is ever to serve a second paying tenant. If yes, PostgreSQL with forced row-level security is the first piece of work, and TI-02's database clause is the acceptance test. If no, record that decision here so the gap in §3 above stops reading as an omission. | Justin Nseya | 24 Nov 2026 |
| 3 | Confirm the two enabled feeds' licences permit use in a paid product (§19 sale readiness). Construction Enquirer and Construction Index are trade press; neither licence has been read. | Justin Nseya | 1 Dec 2026 |
| 4 | Add the test suite to the deploy path. `deploy/update-all.sh` verifies the build hash and does **not** run `backend/test/run-all.sh`. That is the last remaining way something built here could silently stop working in production. | Justin Nseya | 24 Nov 2026 |
| 5 | If a model route is ever authorised, the hard release gate item `realModelOutput` becomes evidenceable and §20's full gate can be run. Until then `hardReleaseGate()` reports it unevidenced by name, which is the honest state. | — | on authorisation |

Item 4 is not specific to this specification — it was already the open hole in
"nothing silently changes" — and it is listed here because this commit adds
1,119 lines of test that the deploy path will not run.
