# OS — Level 7 ITT & Bid Engine
## Developer-Ready Technical Specification v1.0

**Owner:** Groupe Nseya Digital / JNN Global Ltd — OS venture
**Status:** Build specification (developer handoff)
**Scope:** Opportunity discovery → ITT ingestion → scope intelligence → estimating → contract/risk → programme → bid composition → submission → award → delivery baseline handover
**Reference stack:** NestJS · PostgreSQL · Kafka · LangGraph · Next.js 14 · GCP · event-sourced/CQRS · ACU-metered billing · BitriPay
**Portability:** Every external dependency sits behind a port/adapter. The engine must run on the reference stack, on AWS/Azure, on-premise, and as an embedded module inside third-party platforms (Procore, Aconex, Asite, Viewpoint, Autodesk Construction Cloud, SAP, Oracle Unifier, bespoke CDEs).

> **RECEIVING STATUS.** This specification was supplied in parts. Sections 0
> to 4.8 are recorded below as received. Later sections will be appended to
> this file as they arrive; nothing already here is edited or removed.
>
> **HOW IT RELATES TO WHAT RUNS TODAY** is set out in the reconciliation at
> the end, and held as data in `LEVEL_7` in `backend/lib/organisation.js`.

---

## 0. What "Level 7" means

The six-level maturity model stops at *governed operational autonomy* (executing approved low-risk actions). Level 7 adds a property none of the lower levels have:

> **Level 7 — Self-improving, contract-native, evidence-bound bid organisation.**
> A network of specialist agents that (a) reason inside the *actual* contract and ITT rules of each tender, (b) can only assert what is bound to a verified evidence object, (c) run adversarial self-challenge before any human sees the output, (d) learn from every win, loss, clarification and post-award variance through a governed feedback loop, and (e) expose every conclusion with full provenance, cost lineage and time-travel state.

Concretely, Level 7 is defined by seven hard properties. A build that fails any one of them is not Level 7.

| # | Property | Test |
|---|----------|------|
| L7.1 | **Contract-native reasoning** | The same site event produces different outputs under NEC4 Option A vs JCT D&B 2016 vs FIDIC Yellow vs bespoke amendments. Agents load the tender's *actual* clause graph, never generic knowledge. |
| L7.2 | **Evidence-bound assertion** | No sentence enters a submission unless it resolves to an `EvidenceObject` with `status = APPROVED`. Enforced by a hard gate, not a prompt. |
| L7.3 | **Adversarial self-challenge** | Every material output (price, programme, response, assumption) is attacked by an independent Red-Team agent with a different model/prompt lineage before human review. |
| L7.4 | **Time-travel state** | Any artefact can be reconstructed "as known at time T" (bitemporal store). Required for clarification audit, claim defence and post-mortem. |
| L7.5 | **Full lineage** | Every number in the price has a `LineageChain` back to source, date, currency, quantity basis, productivity assumption, quote validity and approver. |
| L7.6 | **Governed learning** | Outcomes (win/loss, feedback, post-award variance) update calibrated priors through a promotion pipeline with human approval; no agent output becomes institutional truth automatically. |
| L7.7 | **Platform-agnostic core** | Zero business logic in adapters. Swapping CDE, ERP, estimating tool, LLM provider or database is a configuration change plus an adapter, never a core change. |

---

## 1. Architecture

### 1.1 Layered architecture (hexagonal)

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION  (Next.js app · Embedded widget SDK · CLI · API)   │
├─────────────────────────────────────────────────────────────────┤
│  ORCHESTRATION  (Bid Executive Orchestrator · LangGraph runtimes)│
├─────────────────────────────────────────────────────────────────┤
│  AGENT DOMAIN ENGINES                                            │
│  Opportunity · Intake · Scope · Estimating · Contract/Risk ·     │
│  Planning · Composer · Submission · Red-Team · Learning          │
├─────────────────────────────────────────────────────────────────┤
│  CORE KERNEL                                                     │
│  Bid State Store (bitemporal) · Event Spine · Evidence Registry ·│
│  Requirement Graph · Clause Graph · Lineage Service · Gate Engine│
│  · Policy Engine · ACU Meter · Provenance Ledger                 │
├─────────────────────────────────────────────────────────────────┤
│  PORTS (interfaces)                                              │
│  DocumentStore · CDE · Estimating · Scheduling · ERP · Portal ·  │
│  BIM · Email · Workflow · LLM · Embedding · OCR · Search · Bus   │
├─────────────────────────────────────────────────────────────────┤
│  ADAPTERS (swap per deployment)                                  │
│  GCS/S3/Azure Blob · Aconex/Asite/ACC/Procore · CostX/Candy/     │
│  Bluebeam · P6/MSP/Asta · SAP/Oracle/Xero · ProContract/Jaggaer/ │
│  Delta/Ariba · Revit/IFC · Gmail/M365 · Anthropic/OpenAI/Vertex/ │
│  Bedrock/local · Postgres/Cloud SQL/RDS · Kafka/PubSub/SQS       │
└─────────────────────────────────────────────────────────────────┘
```

**Rule:** Domain engines import only from Kernel and Ports. Adapters import only from Ports. Presentation imports only from Orchestration API contracts.

### 1.2 Reference deployment (GCP)

| Concern | Reference | Portable alternative |
|---|---|---|
| Services | NestJS modules, one per engine, on GKE/Cloud Run | Any container runtime |
| Write model | PostgreSQL 16 (Cloud SQL), event store schema | RDS/Azure PG/self-hosted |
| Event bus | Kafka (Confluent on GCP) | Pub/Sub, SQS+SNS, NATS, Redpanda |
| Read models | PostgreSQL projections + OpenSearch | Elastic, Meilisearch, pgvector-only |
| Vectors | pgvector (default) | Pinecone, Weaviate, Qdrant |
| Object store | GCS | S3, Azure Blob, MinIO |
| Agent runtime | LangGraph (Python workers) | Any graph runtime satisfying `AgentRuntimePort` |
| LLM | Claude via Anthropic API (primary), Vertex (fallback) | Bedrock, Azure OpenAI, vLLM on-prem |
| OCR/Layout | Document AI | Textract, Azure DI, Tesseract+LayoutLM |
| Workflow | Temporal (durable execution) | Cadence, Conductor, Step Functions |
| Auth | Keycloak / Google Identity, OIDC | Entra, Okta, Auth0 |
| Billing | ACU meter → BitriPay | Stripe adapter behind `BillingPort` |
| Observability | OpenTelemetry → Cloud Trace/Prometheus/Grafana | Datadog, Honeycomb |

### 1.3 Multi-tenancy & data residency

- Tenant = contractor organisation. Every table carries `tenant_id`; Postgres RLS enforced; Kafka topics partitioned by tenant; object store prefixes per tenant; KMS key per tenant (CMEK).
- Residency profiles: `uk`, `eu`, `drc`, `custom`. Profile pins region for DB, bus, blobs and LLM endpoint. A tender flagged `residency=uk` cannot route to a non-UK LLM endpoint (Policy Engine rule `PE-RES-01`).
- Bid-team walls: within a tenant, `bid_id` is an isolation boundary. Cross-bid retrieval only through the Learning Engine's *anonymised, approved* lessons corpus.

---

## 2. Core Kernel

### 2.1 Bid State Store (bitemporal, event-sourced)

Every aggregate is rebuilt from events. Every fact has two time axes:

- `valid_from / valid_to` — when the fact was true in the world (e.g. drawing rev C current from 12 Mar).
- `recorded_at` — when the system learned it.

```
GET /bids/{bidId}/state?asOf=2026-03-12T10:00Z&recordedBy=2026-03-14T09:00Z
```

returns the bid exactly as it was known at that moment. Non-negotiable for L7.4.

**Aggregates:** `Opportunity`, `Bid`, `TenderPack`, `Requirement`, `Clause`, `ScopeItem`, `Discrepancy`, `Clarification`, `Assumption`, `Risk`, `CostItem`, `Quotation`, `Programme`, `Activity`, `Response`, `EvidenceObject`, `Submission`, `Gate`, `Decision`, `Lesson`.

### 2.2 Event Spine

Kafka topic naming: `OS.bid.{aggregate}.{event}` — e.g. `OS.bid.requirement.extracted`.

Event envelope (CloudEvents 1.0 compatible):

```json
{
  "specversion": "1.0",
  "id": "evt_01J9…",
  "type": "OS.bid.requirement.extracted",
  "source": "/engines/intake",
  "subject": "bid_01J8…/req_01J9…",
  "time": "2026-09-10T09:12:44.120Z",
  "tenantid": "ten_…",
  "bidid": "bid_…",
  "actor": { "kind": "agent", "id": "intake.requirement-extractor", "run_id": "run_…", "model": "claude-…", "prompt_hash": "sha256:…" },
  "causationid": "evt_…",
  "correlationid": "cor_…",
  "validfrom": "2026-09-10T09:12:44Z",
  "acu_cost": 0.42,
  "datacontenttype": "application/json",
  "data": { }
}
```

**Required properties:** immutable, append-only, hash-chained per bid (`prev_hash`) to produce a tamper-evident provenance ledger. Retention: life of tenant + 12 years (UK limitation period for deeds) unless residency profile overrides.

**Core event catalogue (minimum)**

```
opportunity.discovered · opportunity.scored · opportunity.decided
tender.pack.received · tender.document.ingested · tender.addendum.received
requirement.extracted · requirement.classified · requirement.assigned · requirement.status_changed
clause.parsed · clause.obligation_derived · clause.risk_flagged
scope.item_created · scope.discrepancy_detected · scope.discrepancy_resolved
clarification.drafted · clarification.approved · clarification.sent · clarification.answered
assumption.proposed · assumption.approved · assumption.retired
quote.requested · quote.received · quote.normalised · quote.expired
cost.item_priced · cost.item_challenged · cost.item_approved · cost.scenario_run
programme.generated · programme.challenged · programme.scenario_run · programme.approved
response.drafted · response.evidence_bound · response.redteamed · response.approved
evidence.registered · evidence.verified · evidence.rejected · evidence.expired
submission.assembled · submission.validated · submission.gate_passed · submission.uploaded · submission.confirmed
gate.opened · gate.decision_recorded
outcome.recorded · lesson.proposed · lesson.approved · prior.updated
```

### 2.3 Requirement Graph

Requirements are nodes in a graph, not rows in a spreadsheet.

```typescript
interface Requirement {
  id: string; bidId: string;
  text: string;                       // verbatim extraction
  normalisedText: string;             // agent paraphrase, never used for compliance
  sources: SourceRef[];               // {docId, version, page, bbox, clauseRef}
  classification: 'TECHNICAL'|'COMMERCIAL'|'LEGAL'|'SAFETY'|'PROGRAMME'|'SOCIAL_VALUE'|'QUALITY'|'ADMIN';
  mandatoryStatus: 'PASS_FAIL'|'SCORED'|'INFORMATIVE';
  scoring?: { weight: number; maxScore: number; method: string };
  ownerId?: string; departmentId?: string;
  evidenceRequired: EvidenceType[];
  destination: { kind: 'PORTAL_FIELD'|'FORM'|'SCHEDULE'|'ATTACHMENT'; ref: string; limits?: Limits };
  status: 'MISSING'|'IN_PROGRESS'|'COMPLETE'|'CHALLENGED'|'NOT_APPLICABLE';
  conflicts: string[];                // Discrepancy ids
  dependsOn: string[];                // Requirement ids
  confidence: { extraction: number; interpretation: number };
  validFrom: string; validTo?: string; recordedAt: string;
}
```

Edges: `DEPENDS_ON`, `CONFLICTS_WITH`, `SATISFIED_BY (Response|CostItem|Activity|Evidence)`, `DERIVED_FROM (Clause)`, `SUPERSEDED_BY (addendum)`.

### 2.4 Clause Graph (contract-native reasoning)

Contract → clause tree → obligation objects. Bespoke amendments overlay the standard form as `Amendment` nodes with `MODIFIES|DELETES|INSERTS` edges.

```typescript
interface Obligation {
  id: string; clauseId: string;
  party: 'CONTRACTOR'|'EMPLOYER'|'PM'|'SUPERVISOR'|'ENGINEER'|'OTHER';
  trigger: TriggerSpec;               // event pattern + optional condition expression
  action: string;
  noticePeriod?: Duration; timeBar?: { period: Duration; consequence: string };
  method: 'WRITING'|'CDE'|'PORTAL'|'EMAIL'|'FORM';
  approvalRequired: boolean;
  evidenceRequired: EvidenceType[];
  consequenceOfBreach: string;
  standardFormRef?: string;           // e.g. "NEC4 ECC 61.3"
  amendedBy?: string[];
  riskWeight: number;                 // 0..1, set by Contract Agent, reviewed by human
}
```

Contract libraries shipped as versioned packages: `nec4-ecc@2023.01`, `jct-db-2016@1.0`, `fidic-yellow-2017@1.0`, `fidic-red-2017`, `nec3-ecc`, `jct-sbc-2016`, `ppc2000`, `fac-1`. DRC/OHADA public-works forms as a separate package (`ohada-marches-publics@…`). Each package = clause text, structure, standard obligations, known risk patterns, and eval set.

### 2.5 Evidence Registry (L7.2 gate)

```typescript
interface EvidenceObject {
  id: string; tenantId: string;
  kind: 'CERTIFICATE'|'CASE_STUDY'|'KPI'|'CV'|'POLICY'|'ACCREDITATION'|'INSURANCE'|'FINANCIAL'|'TEST_RESULT'|'REFERENCE'|'METHOD'|'CALCULATION';
  claim: string;                      // the sentence this proves
  source: { uri: string; hash: string; issuedBy?: string; issuedAt?: string; expiresAt?: string };
  verifiedBy?: string; verifiedAt?: string;
  status: 'DRAFT'|'PENDING'|'APPROVED'|'REJECTED'|'EXPIRED';
  scope: { bidIds?: string[]; global: boolean };
  reuseCount: number;
}
```

Gate rule `GE-EV-01`: `Response.status` cannot transition to `APPROVED` while any `Claim` in its body lacks `evidenceId` with `status=APPROVED` and `expiresAt > submissionDeadline`.

### 2.6 Lineage Service (L7.5)

```typescript
interface LineageChain {
  nodeId: string;
  kind: 'SOURCE'|'CALC'|'ASSUMPTION'|'ADJUSTMENT'|'APPROVAL';
  ref: string;                        // quote_id, rate_lib_id, formula_id, asm_id, dec_id
  value?: number; unit?: string; currency?: string; fxRate?: { pair: string; rate: number; date: string };
  quantityBasis?: string; productivity?: { rate: number; unit: string; source: string };
  validUntil?: string;
  confidence: number;
  parents: string[];
}
```

Lineage is materialised into a DAG per bid; the UI renders "why is this number?" as a click-through graph. Export: JSON-LD + CSV for auditors.

### 2.7 Gate Engine

Gates are declarative state-machine guards. Definition (YAML, versioned per tenant):

```yaml
gate: G4_PRICE_RELEASE
appliesTo: Bid
from: PRICED
to: PRICE_RELEASED
requires:
  - all: CostItem.status == APPROVED
  - redteam: EstimatingRedTeam.openFindings(severity>=HIGH) == 0
  - scenario: Scenarios.P80.margin >= tenant.policy.minMarginP80
  - approval:
      roles: [COMMERCIAL_DIRECTOR]
      quorum: 1
      segregation: approver != author
onFail: notify(roles) ; block
```

Gate decisions are `Decision` events with signature (WebAuthn or OIDC-bound), retained forever.

### 2.8 Policy Engine

OPA/Rego (or Cedar) evaluated on every agent action and every API call:

- `PE-RES-01` residency routing
- `PE-AUT-01` agents may DRAFT contractual communications; only humans may SEND
- `PE-AUT-02` agents may not commit money (RFQ issue allowed; PO issue denied)
- `PE-EV-01` no unbound claim into a submission
- `PE-PII-01` CVs redacted at rest, unredacted only inside approved submission build
- `PE-ACU-01` bid budget cap; agents downgrade to cheaper models when 80% spent, halt at 100%

### 2.9 ACU Meter

Every LLM/OCR/embedding/tool call emits `acu.consumed` with `{bidId, agentId, runId, model, inputTokens, outputTokens, acu}`. ACU conversion table is tenant-configurable. Projection: per-bid, per-agent, per-stage cost dashboard. Prepaid balance via `BillingPort` (BitriPay reference adapter).

---

## 3. Agent runtime standard

### 3.1 Agent contract

```python
class Agent(Protocol):
    id: str                     # "intake.requirement-extractor"
    version: str                # semver; prompt + graph + tool set
    inputs: type[BaseModel]
    outputs: type[BaseModel]
    tools: list[ToolSpec]       # declared, policy-checked
    autonomy: Literal["L1","L2","L3","L4","L5","L6"]  # max level it may operate at
    evidence_policy: Literal["none","cite","bind"]
    def run(self, ctx: RunContext, inp: BaseModel) -> RunResult: ...
```

`RunResult` always contains: `outputs`, `events[]`, `confidence`, `assumptions[]`, `open_questions[]`, `acu_cost`, `trace_id`.

### 3.2 LangGraph pattern (reference)

```
load_context → plan → (tool loop) → draft → self_check → emit_events → END
                                       ↑           |
                                       └── revise ←┘ (max N)
```

- `load_context` reads bid state *as of now* through the Kernel (never raw files).
- `self_check` runs schema validation + policy + a structured critique prompt; failing outputs loop to `revise`.
- Agents never call other agents directly; they emit events and the Orchestrator routes.

### 3.3 Model routing

`LLMPort.complete(task_class, payload)` selects a model by task class:

| Task class | Default | Fallback | Notes |
|---|---|---|---|
| `extract.structured` | Mid-tier, long context | OSS on-prem | JSON mode, temperature 0 |
| `reason.contract` | Frontier | Frontier alt vendor | Different vendor for Red-Team |
| `draft.prose` | Frontier | Mid-tier | House style adapter |
| `classify` | Small | — | Batched |
| `embed` | Embedding model | — | Chunk 800 tok, 15% overlap |

Red-Team agents **must** use a different prompt lineage and, where available, a different model vendor from the agent they attack (L7.3).

### 3.4 Determinism & reproducibility

Every run records `prompt_hash`, `model_id`, `tool_versions`, `seed` (where supported), and input state version. A run can be replayed for audit; divergence beyond tolerance raises `agent.nondeterminism_detected`.

---

## 4. Engines and agents — detailed specifications

Each agent lists: purpose · inputs · tools · outputs · events · guardrails · evaluation metrics.

### 4.1 Opportunity Engine

**4.1.1 Opportunity Scout Agent.** Discover, deduplicate and structure opportunities from portals, frameworks, client pipelines and inbound emails. Inputs: `PortalPort` feeds (Find a Tender, Contracts Finder, TED, Jaggaer, ProContract, Delta, Ariba, client-specific), email ingestion, CRM sync. Tools: `portal.search`, `portal.fetch_notice`, `crm.lookup`, `dedupe.match`. Outputs: `Opportunity` draft with CPV/UNSPSC codes, geography, value band, contract form, procedure type, deadlines, lots. Events: `opportunity.discovered`. **Guardrails:** no auto-registration of interest on portals (L6 forbidden here). Eval: recall vs manual scan ≥ 0.95; duplicate rate ≤ 2%.

**4.1.2 Capability Match Agent.** Compare notice requirements to tenant capability graph (accreditations, past projects, key staff, plant, financial thresholds, geographic reach). Outputs `CapabilityMatch { hardFails[], softGaps[], partnerNeeds[], mandatoryCriteria[] }`. **Guardrails:** hard fails (turnover threshold, mandatory accreditation missing) block "pursue" without director override decision.

**4.1.3 Bid/No-Bid Scoring Agent.** Structured, explainable recommendation.

```
EBV = P(win) × RAC − BidCost − CapacityOpportunityCost
RAC = Σ(margin scenarios × probability) − E[downside exposure]
```

Inputs: CapabilityMatch, historic win/loss priors (Learning Engine), resource calendar, pipeline load, client relationship score, contract risk pre-scan. Outputs: recommendation ∈ {PURSUE, PURSUE_CONDITIONAL, PARTNER, CLARIFY, DECLINE}; sensitivity table; unresolved risks; assumptions. Events: `opportunity.scored`; human `opportunity.decided` via Gate `G0_BID_NO_BID`. **Guardrails:** recommendation must show which inputs drove ≥ 80% of the score. Eval: calibration (Brier score) of P(win) on a rolling 24-month window; decision reversal rate after review.

### 4.2 Tender Intake Engine

**4.2.1 Pack Ingestion Agent.** Raw upload (ZIP, portal download, email chain) → structured `TenderPack`. Pipeline: unpack → classify each file (ITT, ER, spec, drawing, BoQ, conditions, amendments, pricing template, form, site info, survey, model) → OCR/layout parse → version/revision detection → drawing register extraction → build document graph. Tools: `doc.parse`, `cad.extract_titleblock`, `ifc.parse`, `xlsx.parse`, `dwg.render`. Outputs `TenderPack { documents[], registerConflicts[], missingReferences[] }`. Events: `tender.pack.received`, `tender.document.ingested`. **Guardrails:** never discard a file; unclassifiable → `UNKNOWN` bucket with a human triage task. Eval: classification accuracy ≥ 0.97; revision detection ≥ 0.98.

**4.2.2 Requirement Extraction Agent.** Builds the Requirement Graph. Per-document chunked extraction with clause-aware chunking (never split a numbered clause), then cross-document merge and dedupe with embedding similarity + LLM adjudication; destination mapping to portal/form fields via `PortalPort.get_schema`. Low-confidence (< 0.75) rows create human review tasks. **Guardrails:** `text` is verbatim; paraphrase stored separately; **compliance judged against verbatim only.** Eval: requirement recall against gold sets ≥ 0.98 — missing a mandatory requirement is the most expensive failure; mandatory-status precision ≥ 0.97.

**4.2.3 Addendum Reconciliation Agent.** On each addendum or clarification bulletin, diff against the current pack, supersede affected requirements, quantities, drawings and deadlines, notify owners. **Guardrails:** old versions never deleted (bitemporal); superseded nodes get `validTo`.

**4.2.4 Deadline & Submission Rules Agent.** Extract every date, format, page/word limit, file naming, signature and portal rule into a machine-checkable `SubmissionRuleset` consumed by the Submission Controller.

### 4.3 Scope Intelligence Engine

**4.3.1 Scope Decomposition Agent.** ER/spec/drawings/BIM → `ScopeItem` tree (systems, assets, packages, locations, disciplines, deliverables, temporary works, testing, interfaces, exclusions). Tools: `ifc.query`, `drawing.read`, `spec.section_parse`, `wbs.template`. Outputs: WBS with codes, interface matrix, exclusion list.

**4.3.2 Cross-Document Consistency Agent.** Pairwise and triangulated checks: drawing↔drawing, drawing↔spec, spec↔BoQ, BoQ↔programme, ER↔method, site constraints↔resources, model↔drawing↔pricing quantities. Outputs `Discrepancy { kind, sources[], severity, suggestedTreatment ∈ {CLARIFY, ASSUME, QUALIFY, PROVISIONAL_SUM, RISK, INTERFACE} }`. **Guardrails: never silently resolves.** Every discrepancy must end as a Clarification, Assumption, Qualification, Provisional allowance, Risk or Interface responsibility — enforced by Gate `G2_SCOPE_FREEZE` (`openDiscrepancies(severity>=MEDIUM) == 0`). Eval: detection recall on seeded-defect packs ≥ 0.9; false-positive rate ≤ 15%.

**4.3.3 Quantity Take-Off Agent.** Derive quantities from BIM (IFC quantity sets), drawings (`cad.measure` with human-verified scale) and BoQ; reconcile the three. Outputs `Quantity { scopeId, value, unit, method ∈ {BIM, MEASURED, BOQ, ESTIMATED}, confidence, lineage }`. **Guardrails:** measured quantities from raster drawings require human scale confirmation before use in pricing.

**4.3.4 Clarification Agent.** Convert discrepancies and ambiguities into well-formed, deadline-aware clarification questions; track answers; propagate answers into requirements and scope. **Guardrails:** drafts only; sending is human (`PE-AUT-01`). Strategic questions that reveal pricing strategy are flagged for the bid manager.

### 4.4 Estimating & Commercial Engine

**4.4.1 Rate Build Agent.** Unit rates from labour constants, plant outputs, material prices, location factors, escalation indices and productivity assumptions; historic rates from the Learning Engine with recency and geography weighting. Outputs `CostItem` with full `LineageChain`. **Guardrails:** every rate has `validUntil`; expired components flagged before price release.

**4.4.2 Supplier & Subcontractor Enquiry Agent.** Generate package enquiry documents from scope; issue RFQs via `ProcurementPort`; ingest and normalise quotes (currency, VAT, exclusions, attendances, programme assumptions, validity). Outputs normalised `Quotation`, like-for-like comparison, exclusion delta list. **Guardrails:** issue RFQ allowed (L4); appoint denied (`PE-AUT-02`).

**4.4.3 Preliminaries & Temporary Works Agent.** Derive prelims from programme duration, staffing, site setup, logistics, welfare, security, temporary-works schedule, permits, insurances and bonds. **Guardrails:** cross-checks every temporary-works item shown or implied in the method against prelims pricing.

**4.4.4 Commercial Challenge Agent (Red-Team, mandatory).** Adversarial review of the price: double counting, missing scope, arithmetic drift between BoQ/model/pricing schedule, optimistic productivity against tenant benchmarks, expired quotes, insufficient supervision, currency mismatch, unpriced interfaces, mis-applied mark-ups, cash-flow exposure, negative working capital, retention and bond cost, uncapped liability, LDs, design-development exposure. Outputs `Finding { severity, category, evidence, suggestedFix, acuCostToFix }`. **Guardrails:** different model vendor and prompt lineage from the Rate Build Agent (L7.3).

**4.4.5 Scenario & Risk Pricing Agent.** Monte Carlo over cost and duration distributions; scenarios: expected, optimistic, P80, delayed mobilisation, supplier inflation, low productivity, accelerated completion, client payment delay, FX shock (GBP/USD/CDF where relevant). Outputs margin distribution, cash-flow curves, sensitivity tornado, recommended risk allowance. Distributions per `Risk` (three-point or fitted from the Learning Engine); correlation matrix editable by the estimator.

**4.4.6 Cash-flow & Bond Agent.** S-curve from programme + payment terms + retention + bonds and guarantees + advance payment; peak funding and interest cost, fed into the price.

### 4.5 Contract & Risk Engine

**4.5.1 Contract Parsing Agent.** Identify standard form and amendments; build the Clause Graph; derive `Obligation[]`. **Guardrails:** amendment overlay must show a diff against the standard form for every modified clause.

**4.5.2 Contract Risk Agent.** Score obligations and amendments against tenant risk appetite: pay-when-paid, fitness for purpose, uncapped LDs, unlimited liability, onerous time bars, design responsibility, ground risk allocation, currency risk, dispute forum, termination for convenience, set-off rights. Outputs a Contract Risk Register, a recommended qualifications and departures schedule, and walk-away flags. **Guardrails:** a legal advice disclaimer object is attached; flagged items require legal review at Gate `G3_CONTRACT_POSITION`.

**4.5.3 Qualifications & Departures Agent.** Draft the tender qualifications and departures schedule from approved assumptions, discrepancies and contract risks; ensure consistency with pricing and programme.

**4.5.4 Insurance, Bond & Compliance Agent.** Verify required insurances, bonds, guarantees and accreditations against the Evidence Registry; produce a gap list with lead times.

### 4.6 Planning Engine

**4.6.1 Programme Generation Agent.** WBS + quantities + production rates + crews + calendars + logistics + design release + procurement lead times + access + testing and commissioning logic + sectional completions → CPM programme via `SchedulingPort` (P6/MSP/Asta/native).

**4.6.2 Programme Challenge Agent (Red-Team, mandatory).** Open ends, excessive constraints, missing logic, impossible sequences, procurement disconnected from installation, design disconnected from approvals, weak commissioning logic, hidden negative float, unrealistic calendars, resource over-allocation, unsupported productivity, critical-path fragility index. Outputs findings plus a DCMA-14 style report and custom tenant rules.

**4.6.3 Scenario & TIA Agent.** What-ifs (late possession, late design, supplier delay, acceleration), time-impact-analysis fragnets, resource levelling options; feeds the cost scenarios.

**4.6.4 Programme Narrative Agent.** Narrative bound to programme data — every stated duration and milestone resolves to an `Activity`. **Evidence binding applies to numbers, not just claims.**

### 4.7 Bid Composition Engine

**4.7.1 Response Planner Agent.** For each scored requirement: key messages, evidence needed, win themes, evaluator scoring criteria mapping, word budget allocation.

**4.7.2 Response Drafting Agent.** Draft in tenant house style; every factual claim tagged `<claim ev="…">`; unsupported claims emitted as `EvidenceRequest` tasks. **Guardrails:** the L7.2 gate. No superlatives without evidence. No content from other bids except approved lessons and case studies.

**4.7.3 Evaluator Simulation Agent (Red-Team).** Score each response as the employer's evaluator would, using the ITT's published criteria and evaluator guidance; identify gaps, waffle, unanswered sub-questions and missing evidence. Outputs a predicted score with rationale and an improvement list. Eval: correlation between predicted and actual feedback scores post-outcome, tracked by the Learning Engine.

**4.7.4 Consistency Agent.** Cross-check every response, the price, the programme, the org chart, the method statement, the risk schedule and the qualifications for contradictions — programme says 52 weeks and the response says 48; the org chart names a PM who is not in the CV pack; the method assumes a crane that is not in the prelims.

**4.7.5 Design Support Agents.** Method Statement, Logistics and Site Layout (with `drawing.generate` to DXF/PDF), Organisation Chart, Social Value (National TOMs mapping), Health & Safety Response (CDM 2015 aware; **never claims to replace competent persons**), Environmental and Carbon (PAS 2080 aligned carbon estimate from quantities), Quality Plan.

### 4.8 Submission Engine

**4.8.1 Submission Controller Agent.** Assemble deliverables per `SubmissionRuleset`; validate every mandatory field, filename, page and word limit, format, signature, pricing reconciliation (BoQ total = pricing schedule total = form of tender), certificate validity against the deadline, unapproved assumptions and contradictory answers; produce a Submission Readiness Report.

Gate `G5_SUBMISSION_RELEASE` requires 100% of mandatory requirements `COMPLETE`, a readiness score of 100 on hard rules, and approval by the Bid Manager and Commercial Director (plus Legal if contract flags are raised).

Upload via `PortalPort.upload` only after the gate, then `PortalPort.confirm_receipt`, storing the confirmation artefact hash. **Guardrails:** upload is initiated by a human click; the agent performs and verifies. Time-box: refuses to start an upload with less than a tenant-configured buffer (default four hours) before the deadline without a director override.


**4.8.2 Post-Submission Agent.** Clarification handling, BAFO and negotiation pack preparation, presentation prep, outcome capture, feedback ingestion.

### 4.9 Award & Handover-to-Delivery Engine

**4.9.1 Bid-to-Baseline Conversion Agent.** On award, transform approved bid objects into delivery objects and publish to the delivery engines through the shared Event Spine.

| Bid object | Delivery object | Event |
|---|---|---|
| Tender programme | Contract baseline programme | `delivery.baseline.programme_set` |
| Bid risk | Live risk | `delivery.risk.opened` |
| Price build-up | Cost budget / control accounts | `delivery.budget.set` |
| Assumption | Validation task or change trigger | `delivery.assumption.to_validate` |
| Qualification | Contract reconciliation item | `delivery.contract.reconcile` |
| Quotation | Procurement package | `delivery.procurement.package_created` |
| Method statement | Controlled method | `delivery.method.registered` |
| ER requirement | Compliance obligation | `delivery.obligation.registered` |
| Promised KPI | Performance commitment | `delivery.kpi.committed` |
| Resource plan | Mobilisation demand | `delivery.mobilisation.demand` |
| Cash-flow model | Cash baseline | `delivery.cash.baseline_set` |

**Guardrails:** only `APPROVED` objects convert; unapproved assumptions become blocking tasks.

### 4.10 Learning Engine (L7.6)

**4.10.1 Outcome Capture Agent.** Records win/loss, scores, feedback, competitor pricing where disclosed, clarification patterns, evaluator comments.

**4.10.2 Post-Award Variance Agent.** Compares tender assumptions, rates and durations with delivery actuals; produces calibration deltas per rate library item, productivity assumption, risk distribution and P(win) model.

**4.10.3 Lesson Promotion Agent.** Proposes `Lesson` objects (anonymised, tenant-scoped); requires human approval at Gate `G7_LESSON_PROMOTE` before entering the priors corpus or the rate library. **Guardrails:** unverified agent output never becomes institutional truth. Promoted lessons carry source bids and approver.

### 4.11 Bid Executive Orchestrator

Maintains a consolidated **Bid Position** (readiness %, open findings, gate status, ACU spend, deadline risk, top five decisions needed). Routes events to engines; resolves routine cross-engine coordination — addendum → re-run consistency → re-price affected items → re-challenge. Escalates to humans through the Decision queue; **never makes gate decisions.** Runs a configurable daily standup brief per bid.

---

## 5. Bid lifecycle state machine

```
DISCOVERED → QUALIFIED → [G0] DECIDED_PURSUE
  → PACK_INGESTED → REQUIREMENTS_MAPPED → [G1 Compliance baseline]
  → SCOPE_DECOMPOSED → [G2 Scope freeze]
  → CONTRACT_POSITIONED → [G3]
  → PROGRAMMED → PRICED → [G4 Price release]
  → COMPOSED → CONSISTENT → [G5 Submission release]
  → SUBMITTED → CLARIFYING → (BAFO) → OUTCOME_RECORDED
  → [G6 Award] → BASELINE_HANDED_OVER → [G7 Lessons promoted] → CLOSED
```

Any addendum re-opens affected downstream states via **targeted invalidation** — only nodes with an edge to changed nodes are marked `STALE`, never a full rerun.

---

## 6. Data model (PostgreSQL DDL excerpt)

```sql
-- Event store (append-only)
CREATE TABLE bid_events (
  seq BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  bid_id UUID,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  aggregate_version INT NOT NULL,
  type TEXT NOT NULL,
  actor JSONB NOT NULL,
  causation_id UUID, correlation_id UUID,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acu_cost NUMERIC(12,4) DEFAULT 0,
  prev_hash BYTEA, hash BYTEA NOT NULL,
  data JSONB NOT NULL,
  UNIQUE (aggregate_id, aggregate_version)
);
CREATE INDEX ON bid_events (tenant_id, bid_id, recorded_at);
CREATE INDEX ON bid_events USING GIN (data jsonb_path_ops);
ALTER TABLE bid_events ENABLE ROW LEVEL SECURITY;

-- Bitemporal projection example
CREATE TABLE requirements_current (
  req_id UUID, tenant_id UUID NOT NULL, bid_id UUID NOT NULL,
  text TEXT NOT NULL, normalised_text TEXT,
  classification TEXT, mandatory_status TEXT,
  owner_id UUID, status TEXT,
  confidence_extraction REAL, confidence_interpretation REAL,
  destination JSONB, sources JSONB,
  valid_from TIMESTAMPTZ NOT NULL, valid_to TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (req_id, valid_from, recorded_at)
);

-- Evidence
CREATE TABLE evidence_objects (
  ev_id UUID PRIMARY KEY, tenant_id UUID NOT NULL,
  kind TEXT NOT NULL, claim TEXT NOT NULL,
  source_uri TEXT NOT NULL, source_hash BYTEA NOT NULL,
  issued_by TEXT, issued_at DATE, expires_at DATE,
  status TEXT NOT NULL, verified_by UUID, verified_at TIMESTAMPTZ,
  scope JSONB NOT NULL, reuse_count INT DEFAULT 0
);

-- Lineage DAG
CREATE TABLE lineage_nodes (
  node_id UUID PRIMARY KEY, tenant_id UUID, bid_id UUID,
  kind TEXT, ref TEXT, value NUMERIC, unit TEXT, currency CHAR(3),
  fx JSONB, valid_until DATE, confidence REAL, meta JSONB
);
CREATE TABLE lineage_edges (child UUID REFERENCES lineage_nodes, parent UUID REFERENCES lineage_nodes, PRIMARY KEY (child,parent));

-- Chunks / vectors
CREATE TABLE doc_chunks (
  chunk_id UUID PRIMARY KEY, tenant_id UUID, bid_id UUID, doc_id UUID, doc_version INT,
  page INT, bbox JSONB, clause_ref TEXT, text TEXT, embedding vector(1024)
);
CREATE INDEX ON doc_chunks USING hnsw (embedding vector_cosine_ops);
```

Full schema: 41 tables; migrations via Prisma/TypeORM (NestJS) or Alembic (Python workers) — one migration owner (NestJS) to avoid drift.

---

## 7. Ports (interfaces) — adapter contract

TypeScript interfaces (NestJS) mirrored as Python Protocols for workers. Excerpt:

```typescript
export interface DocumentStorePort {
  put(tenant: string, key: string, body: Buffer, meta: Record<string,string>): Promise<{uri: string; hash: string}>;
  get(uri: string): Promise<Buffer>;
  signedUrl(uri: string, ttlSec: number): Promise<string>;
}

export interface CDEPort {          // Aconex, Asite, ACC, Procore, Viewpoint, Trimble, bespoke
  listDocuments(project: string, filter: DocFilter): AsyncIterable<CDEDoc>;
  download(docRef: string): Promise<Buffer>;
  subscribe(project: string, handler: (e: CDEEvent) => void): Unsubscribe;
  upload(project: string, doc: UploadSpec): Promise<CDEDoc>;
}

export interface PortalPort {       // ProContract, Jaggaer, Delta, Ariba, TED, client portals
  searchNotices(q: NoticeQuery): Promise<Notice[]>;
  fetchPack(noticeId: string): Promise<PackManifest>;
  getSchema(noticeId: string): Promise<SubmissionSchema>;   // fields, limits, formats
  upload(noticeId: string, bundle: SubmissionBundle): Promise<UploadReceipt>;
  confirmReceipt(receiptId: string): Promise<Confirmation>;
}

export interface EstimatingPort {   // CostX, Candy, Bluebeam, Conquest, native
  importBoQ(file: Buffer): Promise<BoQ>;
  pushRates(bidId: string, items: CostItem[]): Promise<void>;
  pullRates(bidId: string): Promise<CostItem[]>;
}

export interface SchedulingPort {   // P6, MSP, Asta, native CPM
  buildProgramme(spec: ProgrammeSpec): Promise<Programme>;
  runCPM(prog: Programme): Promise<CPMResult>;
  export(prog: Programme, fmt: 'XER'|'MPP'|'PP'|'XML'): Promise<Buffer>;
}

export interface LLMPort {
  complete(taskClass: TaskClass, req: LLMRequest): Promise<LLMResponse>;   // routes per §3.3
  embed(texts: string[]): Promise<number[][]>;
}

export interface EventBusPort { publish(e: Envelope): Promise<void>; subscribe(topic: string, h: Handler): Unsubscribe; }
export interface WorkflowPort { start(def: string, input: unknown): Promise<RunHandle>; signal(run: RunHandle, sig: string, payload: unknown): Promise<void>; }
export interface BillingPort { reserve(tenant: string, acu: number): Promise<Reservation>; settle(res: Reservation, actual: number): Promise<void>; balance(tenant: string): Promise<number>; }
export interface IdentityPort { verify(token: string): Promise<Principal>; sign(principal: Principal, payload: unknown): Promise<Signature>; }
```

**Adapter conformance:** each port ships with a contract test suite; an adapter is accepted only when the suite passes. Embedded mode: the engine is packaged as a Node package plus Python workers with a `BidEngineHost` interface so a third-party platform can host it inside its own auth, database and bus.

---

## 8. Public API (excerpt, OpenAPI 3.1)

```
POST   /v1/opportunities/ingest                 → Opportunity
POST   /v1/opportunities/{id}/score             → ScoreResult
POST   /v1/opportunities/{id}/decide            → Decision (gate G0)
POST   /v1/bids                                 → Bid
POST   /v1/bids/{id}/pack                        (multipart/zip/portal ref) → PackIngestJob
GET    /v1/bids/{id}/requirements?status=&class= → Requirement[]
GET    /v1/bids/{id}/discrepancies               → Discrepancy[]
POST   /v1/bids/{id}/clarifications              → Clarification (draft)
POST   /v1/bids/{id}/clarifications/{cid}/send   → requires human principal
GET    /v1/bids/{id}/cost/items?lineage=true      → CostItem[] with LineageChain
POST   /v1/bids/{id}/cost/scenarios              → ScenarioRun
POST   /v1/bids/{id}/programme/generate          → Programme
POST   /v1/bids/{id}/programme/challenge         → Finding[]
POST   /v1/bids/{id}/responses/{rid}/draft       → Response
POST   /v1/bids/{id}/responses/{rid}/evaluate    → PredictedScore
GET    /v1/bids/{id}/evidence/missing            → EvidenceRequest[]
POST   /v1/evidence                              → EvidenceObject
POST   /v1/evidence/{id}/verify                  → requires verifier role
POST   /v1/bids/{id}/submission/assemble         → SubmissionReadiness
POST   /v1/bids/{id}/gates/{gate}/decide         → Decision (signed)
POST   /v1/bids/{id}/submission/upload           → UploadReceipt (gate-checked)
GET    /v1/bids/{id}/state?asOf=&recordedBy=     → BidState (bitemporal)
GET    /v1/bids/{id}/position                    → BidPosition (orchestrator view)
GET    /v1/bids/{id}/acu                          → ACU ledger
POST   /v1/bids/{id}/outcome                     → Outcome
POST   /v1/bids/{id}/award/convert               → BaselineHandoverReport
GET    /v1/lessons?status=proposed               → Lesson[]
POST   /v1/lessons/{id}/promote                  → gate G7
WS     /v1/bids/{id}/stream                       → live events
```

Auth: OIDC bearer; scopes per role (`bid:read`, `bid:write`, `gate:decide:G4`, `evidence:verify`, `submission:upload`). All mutating calls idempotent via `Idempotency-Key`.

---

## 9. Security, privacy, compliance

- Encryption: TLS 1.3 in transit; AES-256 at rest with per-tenant CMEK.
- PII: CVs, references and personnel data tokenised at rest; re-identified only inside gated submission build; GDPR/UK GDPR and DRC Loi n°20/017 profiles.
- **Prompt-injection defence: all tender documents are untrusted input.** Instructions found in documents are logged as `security.injection_suspected` and never executed; tool calls from document-derived content require a policy check.
- Confidentiality walls: `bid_id` isolation; learning corpus anonymised, client names removed and prices normalised to indices.
- Secrets: Secret Manager or Vault; no secrets in prompts; LLM egress allow-list.
- Audit: hash-chained event ledger, exportable to WORM storage.
- **Human accountability: every gate decision bound to a named principal; agents cannot hold gate roles (`PE-AUT-03`).**
- CDM 2015: all safety content labelled decision support; no "compliance guaranteed" language permitted in outputs (lint rule `LINT-CDM-01`).

---

## 10. Evaluation & QA framework

Every agent ships with an eval pack:

| Agent | Golden set | Primary metric | Release threshold |
|---|---|---|---|
| Requirement Extraction | 40 real (anonymised) ITT packs, 6,200 labelled requirements | Mandatory recall | ≥ 0.98 |
| Consistency | 25 packs with 300 seeded defects | Recall / FP | ≥ 0.90 / ≤ 0.15 |
| Contract Parsing | 12 forms × amendment sets | Obligation F1 | ≥ 0.95 |
| Rate Build | 2,000 historic rates | MAPE vs approved | ≤ 8% |
| Commercial Challenge | 60 priced bids with known errors | Finding recall | ≥ 0.85 |
| Programme Challenge | 30 programmes, DCMA + custom | Rule recall | ≥ 0.95 |
| Evaluator Simulation | 80 scored responses with feedback | Spearman ρ | ≥ 0.7 |
| Submission Controller | 50 rulesets | Hard-rule miss rate | 0 |
| Bid/No-Bid | 300 historic decisions | Brier score | ≤ 0.18 |

CI: evals run on every prompt, graph or model change; a regression blocks merge. Shadow mode: a new agent version runs alongside live for at least ten bids before promotion. Human accept/edit/reject feedback on every output feeds the eval sets automatically.

---

## 11. Observability & operations

- Traces: one OpenTelemetry trace per agent run; spans per tool and LLM call with an ACU attribute.
- Metrics: per-bid readiness, open findings by severity, gate lead time, ACU burn against budget, deadline margin, agent latency p95, eval drift.
- Alerts: deadline under 48 hours with mandatory requirements incomplete; ACU over 80% of budget; evidence expiring before the deadline; addendum received with unresolved impact over 24 hours; portal upload failure.
- Runbooks: portal outage (fallback manual bundle export); LLM vendor outage (route to fallback, degrade to L2); addendum storm (batch invalidation).

---

## 12. Frontend surfaces

1. **Bid Cockpit** — Bid Position, gates, ACU, deadline, decisions queue.
2. **Compliance Matrix** — Requirement Graph grid and graph view; inline evidence binding.
3. **Discrepancy Board** — kanban by treatment; one click to Clarification, Assumption or Qualification.
4. **Price Explorer** — BoQ tree with lineage drill-down; scenario tornado; cash S-curve.
5. **Programme Studio** — Gantt and logic view, challenge findings overlay, TIA scenarios.
6. **Response Workbench** — requirement and scoring criteria beside the draft with claim tags and the simulated evaluator score.
7. **Evidence Vault** — registry, verification queue, expiry calendar.
8. **Submission Room** — readiness checklist, bundle preview, gate signatures, upload and receipt.
9. **Time Machine** — a slider to view any artefact as of any date.
10. **Lessons Console** — proposed lessons and the promotion gate.

Each surface is exportable as a web component for hosting inside third-party platforms.

---

## 13. Delivery plan (developer sequencing)

| Phase | Weeks | Deliverables | Exit criteria |
|---|---|---|---|
| 0 Kernel | 1–6 | Event store, bitemporal projections, Requirement Graph, Evidence Registry, Gate & Policy engines, ACU meter, ports + reference adapters, auth | Kernel contract tests green; time-travel query working |
| 1 Intake | 5–10 | Pack Ingestion, Requirement Extraction, Addendum, Rules agents; Compliance Matrix UI | Extraction eval ≥ 0.98 on 20 packs |
| 2 Scope & Contract | 9–16 | Scope Decomposition, Consistency, QTO, Clarification; Contract Parsing/Risk; NEC4 + JCT packs | G2/G3 gates live; Discrepancy Board |
| 3 Commercial & Planning | 14–24 | Rate Build, Enquiry, Prelims, Commercial Challenge, Scenarios, Cash-flow; Programme Gen/Challenge/TIA; estimating and scheduling adapters | G4 live; lineage explorer |
| 4 Composition & Submission | 22–30 | Planner, Drafting, Evaluator Sim, Consistency, design-support agents; Submission Controller; portal adapters | G5 live; full end-to-end on 3 pilot bids |
| 5 Award & Learning | 28–34 | Bid-to-Baseline conversion; Outcome, Variance, Lesson agents | G6/G7 live; first calibrated priors |
| 6 Portability | 32–38 | AWS/Azure profiles, embedded SDK, additional CDE/ERP adapters, on-prem LLM profile | Adapter conformance passing on two non-GCP deployments |

Team shape: two kernel/backend, two agent engineers, one data/ML for evals and priors, one frontend, one construction subject-matter expert embedded full time, half a DevSecOps.

---

## 14. Repository layout

```
bid-engine/
  apps/
    api/                # NestJS — engines as modules, ports, gate & policy
    workers/            # Python — LangGraph agent graphs
    web/                # Next.js — surfaces + embedded components
  packages/
    kernel/             # event store, bitemporal, lineage, evidence, ACU
    ports/              # TS interfaces + Python protocols + contract tests
    adapters/
      gcp/ aws/ azure/ onprem/
      cde-aconex/ cde-asite/ cde-acc/ cde-procore/
      estimating-costx/ estimating-candy/
      scheduling-p6/ scheduling-msp/ scheduling-native/
      portal-procontract/ portal-jaggaer/ portal-delta/ portal-ted/
      erp-sap/ erp-oracle/ erp-xero/
      llm-anthropic/ llm-vertex/ llm-bedrock/ llm-vllm/
      billing-bitripay/ billing-stripe/
    contracts/          # nec4-ecc, jct-db-2016, fidic-yellow-2017, ohada-mp …
    prompts/            # versioned, hashed, per agent
    evals/              # golden sets + harness
    sdk/                # engine package, workers, web components
  infra/                # Terraform modules per cloud profile; Helm charts
  docs/                 # ADRs, API spec, runbooks, this document
```

---

## 15. Definition of Done for "Level 7"

The engine is Level 7 when, on a real ITT under a bespoke-amended NEC4 contract, it can — **without a human reading the pack first** — produce a mandatory-complete compliance matrix, a scope discrepancy board with every item treated, a contract-native obligation and risk register, a challenged programme, a fully lineaged price with a P80 scenario, evidence-bound responses with simulated evaluator scores, and a submission-ready bundle; while every number, sentence and decision can be traced, replayed as of any date, attributed to a model, prompt and approver, and costed in ACU; and while no contractual communication, appointment, payment or upload has occurred without a signed human gate.

**Anything less is Level 6 with better marketing.**

---
---

# Reconciliation — this specification against what runs today

Written by the delivery side rather than the venture side, and deliberately
unflattering, because a specification merged into a register without this
section becomes a claim.

## The stack is not an extension of the current one

| | This specification | What runs today |
|---|---|---|
| Shape | Service estate, one module per engine | One Node process |
| State | Event-sourced, bitemporal, CQRS | SQLite with an in-memory mirror and an append-only ledger |
| Bus | Kafka | None — direct calls |
| Agents | LangGraph workers, Python | A spec-driven pipeline engine, JavaScript |
| Front end | Next.js with embedded web components | Static HTML and a small internal portal |
| Tenancy | Multi-tenant, row-level security, per-tenant keys | Single tenant |
| Billing | ACU meter, prepaid balance | None |

**This is a build, not an evolution.** Saying so is the useful part: the
delivery platform can advance three of the seven Level 7 properties inside
what exists, and cannot reach the other four without the kernel above.

## What can advance inside the current system

- **L7.3 adversarial self-challenge** — the cheapest and probably the highest
  value per hour. The four machine reconciliations already prove that a
  mechanical second opinion catches what a first pass will not; a red-team
  pass with a different prompt lineage is a natural next agent.
- **L7.2 evidence-bound assertion** — Agent 2 already refuses to claim what
  it was not given and marks the gap. What is missing is an evidence registry
  with expiry dates, which is a table and a gate rather than a platform.
- **L7.5 lineage** — a document now records the run that produced it, and
  Agent 5 classes every figure by evidence. A lineage chain on a priced line
  is the next step, and it must exist before any estimating agent does.

## What cannot

- **L7.1 contract-native reasoning** needs a clause graph and versioned
  contract packages.
- **L7.4 time-travel state** needs the bitemporal store. This is the largest
  gap in both documents and the one most likely to cost real money, because a
  claim is defended on what was known on a date.
- **L7.6 governed learning** needs the outcome corpus and the promotion gate.
- **L7.7 platform-agnostic core** needs the port and adapter layer.

## Three things in the specification that the delivery platform already does

Worth recording, because they were arrived at independently and that is
evidence the principles are right rather than fashionable.

1. **Gates that refuse rather than warn.** `G2_SCOPE_FREEZE` requires zero
   open discrepancies above medium severity. Agent 13 refuses to issue a pack
   whose scope and price do not reconcile; Agent 2 refuses an incomplete
   submission; Agent 5 refuses a payment exceeding the value earned; Agent 3
   refuses an interface with no owner. Same principle, four instances.
2. **Verbatim over paraphrase.** The specification stores the paraphrase
   separately and judges compliance against the verbatim text only. Agent 2's
   requirements register carries a verbatim quote on every row for exactly
   that reason.
3. **Drafting is autonomous; sending is human.** `PE-AUT-01` and `PE-AUT-02`
   are the same rule as every agent boundary in the register: no agent here
   sends anything, appoints anybody, or commits money.

## One naming question to settle

The specification is headed "OS" throughout and attributes the venture to
Groupe Nseya Digital / JNN Global Ltd. The existing product on the website
and in the register is CONSTRUX. Either they are the same thing under a
working title, or they are two products, and the difference matters before
anything is said publicly. It has been left exactly as supplied rather than
renamed.
