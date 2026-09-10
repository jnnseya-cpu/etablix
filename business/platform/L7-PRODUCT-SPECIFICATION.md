# Level 7 AI ITT and Bid Engines
## Developer-Ready, Platform-Agnostic Product and Technical Specification

**Version 1.0 · 10 September 2026 · Product architecture and implementation baseline**

Prepared for implementation across construction, infrastructure, engineering,
professional services and complex project delivery platforms.

**Purpose:** define a governed, end-to-end artificial intelligence system that
converts an Invitation to Tender into a validated submission, an executable
contract baseline and reusable organisational intelligence.

**Classification:** developer build specification.

> **RECEIVING STATUS.** Supplied in parts. Parts A through the reference
> architecture are recorded below as received; later parts will be appended to
> this file. Nothing already here is edited or removed.
>
> **THIS IS THE THIRD DOCUMENT IN THE SET.** It restates the Level 7 engine as
> a formal product requirements specification with normative language. It
> overlaps with `L7-ITT-BID-ENGINE-SPEC.md` and, on one point, contradicts
> `AGENT-ARCHITECTURE.md`. The conflict is set out at the end of this file
> rather than resolved silently.

---

## Document control

| Field | Value |
|---|---|
| Product name | Level 7 AI ITT and Bid Engines |
| Document type | Product requirements, system architecture, data model, workflow, API and acceptance specification |
| Primary users | Bid directors, estimators, planners, commercial managers, technical leads, executives, reviewers and platform administrators |
| Implementation target | Any multi-tenant SaaS, private cloud or enterprise platform |
| Core principle | AI may execute controlled information work; authorised humans retain legal, commercial, technical and safety accountability |
| Normative language | **Must** is mandatory; **should** is recommended; **may** is optional |

## Contents and implementation map

| Part | Coverage |
|---|---|
| A | Product definition, Level 7 operating model and scope |
| B | Reference architecture and platform adaptation layer |
| C | Domain model, knowledge graph and event model |
| D | Agent organisation, orchestration and autonomy controls |
| E | End-to-end ITT and bid workflows |
| F | Estimating, planning, contract, technical and submission engines |
| G | User experience, permissions, APIs and integrations |
| H | Security, assurance, evaluation and observability |
| I | Functional requirements and acceptance tests |
| J | Implementation roadmap and definition of done |

---

## 1. Product definition and required outcome

The system shall receive an ITT or equivalent procurement package in any
supported channel, establish a controlled tender workspace, understand every
issued document and requirement, coordinate specialist agents and human
contributors, develop a priced and compliant offer, validate the submission,
preserve the evidence behind every material statement, and convert the
accepted bid into an executable delivery baseline after award.

**Level 7 means governed operational autonomy.** The system may plan work,
delegate to specialist agents, use approved tools, request missing
information, retry recoverable failures, monitor deadlines and complete
low-risk actions without step-by-step prompting. **It must not make an
irreversible contractual, financial, technical, regulatory or safety decision
outside an explicit authority policy.**

### 1.1 Required business outcomes

- Prevent administrative disqualification by achieving complete, traceable coverage of mandatory submission requirements.
- Reduce tender mobilisation time by automatically creating the document register, requirement matrix, work breakdown, responsibility assignments and deadline plan.
- Improve bid quality by challenging scope, price, programme, risk, contract position and evidence rather than merely drafting prose.
- Protect margin by identifying missing scope, optimistic productivity, unpriced interfaces, cash exposure, securities, time bars and contract amendments.
- Create one controlled source of tender truth supporting concurrent contributors without losing revision, approval or evidence history.
- Convert bid commitments into live delivery controls so assumptions, prices, resources, risks, obligations and programme commitments survive contract award.
- Build reusable organisational intelligence from verified outcomes while preventing unapproved project content from contaminating corporate knowledge.

### 1.2 In scope

| Capability group | Mandatory scope |
|---|---|
| Opportunity | Capture, qualification, bid or no-bid, capacity, probability and pursuit governance |
| ITT ingestion | Files, portals, email, archives, spreadsheets, drawings, models, addenda and clarifications |
| Requirement control | Compliance matrix, obligation extraction, scoring, ownership, evidence and completeness |
| Solution development | Scope, methodology, design interfaces, logistics, resources, safety, quality, environment and social value |
| Commercial | Quantity, rate, estimate, supplier quote, risk allowance, mark-up, cash flow and reconciliation |
| Planning | WBS, logic, calendars, resources, procurement, commissioning, baseline and scenarios |
| Contract | Clause model, amendments, departures, notices, securities, liabilities, insurance and approval |
| Production | Response drafting, schedules, forms, CVs, case studies, graphics references and document assembly |
| Assurance | Red-team, compliance, arithmetic, contradiction, evidence, legal and executive review |
| Submission | Packaging, naming, limits, portal checks, approval, upload record and receipt |
| Award conversion | Tender-to-contract reconciliation and creation of the delivery control baseline |
| Learning | Win and loss analysis, estimate actuals, benchmark updates and controlled knowledge promotion |

### 1.3 Out of scope without separate authorisation

- Signing or accepting a contract.
- Submitting a legally binding offer without final authorised approval.
- Approving engineering design, temporary works or safety-critical methods.
- Committing expenditure or appointing a supplier.
- Changing approved company risk appetite or delegation of authority.
- **Circumventing a procurement portal, access control, CAPTCHA, anti-bot measure or client restriction.**
- Training foundation models on client-confidential information without an approved data agreement.

---

## 2. Level 7 operating model

### 2.1 Autonomy definition

| Level | System behaviour | Permitted example | Required control |
|---|---|---|---|
| L0 | No AI execution | Manual workspace | Normal application controls |
| L1 | Retrieval | Find a clause | Source citation |
| L2 | Generation | Draft a response | Human review |
| L3 | Analysis | Detect scope conflict | Evidence and confidence |
| L4 | Workflow execution | Create and route a clarification | Permission and audit |
| L5 | Goal pursuit | Complete a compliance matrix across documents | Bounded plan and stop conditions |
| L6 | Multi-agent coordination | Coordinate estimate, programme and risk challenge | Orchestrator policy and reconciliation |
| L7 | Governed operational autonomy | Continuously control tender completion and execute reversible approved actions | Authority envelope, deterministic gates, monitoring, rollback and accountable human approval |

### 2.2 Level 7 execution contract

Every autonomous run shall be created as a typed **Agent Run**, defining the
goal, permissible sources, permitted tools, budget, deadline, required
outputs, quality thresholds, escalation conditions and the actions that
require approval.

**An agent shall not infer authority from a natural-language instruction when
the action policy requires explicit approval.**

```
AgentRun {
  id, tenant_id, tender_id, agent_definition_version,
  goal, input_object_refs[], allowed_tool_ids[],
  authority_policy_id, max_cost_acu, deadline_at,
  output_schema_id, minimum_confidence,
  status, checkpoints[], approvals[], evidence_refs[],
  started_at, completed_at, model_route, trace_id
}
```

### 2.3 Action risk classification

| Class | Description | Examples | Default handling |
|---|---|---|---|
| A | Read only | Search, extract, compare, calculate a draft | Autonomous |
| B | Reversible internal write | Create task, tag evidence, update working forecast | Autonomous with full event log |
| C | Controlled internal state | Change owner, mark requirement complete, promote knowledge | Rule validation plus role permission |
| D | External non-binding communication | Reminder, information request, meeting proposal | Template and recipient policy; approval configurable |
| E | Commercial or contractual commitment | Final price, tender submission, qualification withdrawal | Named human approval required |
| F | Technical, regulatory or safety acceptance | Design acceptance, safety closure, statutory statement | Competent authorised person only |

---

## 3. Reference architecture

The product shall use a modular architecture separating platform-specific
services from the tender domain. The domain engines must run against stable
interfaces so the same engine can be embedded in an existing project
platform, sold as a standalone service, or deployed inside an
enterprise-controlled environment.

### 3.1 Logical layers

| Layer | Responsibilities |
|---|---|
| Experience | Web workspace, mobile review, dashboards, document viewer, comparison views, approvals and accessibility |
| Domain services | Opportunity, tender, compliance, estimating, planning, contract, response, assurance, submission and award conversion |
| Agent control plane | Registry, orchestrator, planner, scheduler, policy engine, tool gateway, memory, evaluation and model router |
| Project intelligence | Canonical domain model, knowledge graph, vector retrieval, rules, calculations, temporal state and evidence lineage |
| Content processing | OCR, layout extraction, spreadsheet parsing, CAD and BIM metadata, archive expansion, language detection and malware scanning |
| Integration | Identity, CDE, ERP, CRM, estimating, scheduling, BIM, email, storage, e-signature, portals and webhooks |
| Foundation | Tenant isolation, encryption, secrets, event bus, object store, database, observability, backup and disaster recovery |

### 3.2 Mandatory architecture rules

- **The large language model shall not be the system of record.** Durable state shall reside in typed domain objects and immutable events.
- All material outputs shall carry provenance at sentence, field, calculation or cell level where practical.
- **Deterministic services shall perform arithmetic, date calculation, rate build-up, unit conversion, file validation, permissions and approval enforcement.**
- Model providers shall be replaceable through a model gateway. No domain service may depend directly on one provider-specific request format.
- Agent tools shall expose narrow, typed operations. Direct unrestricted database, shell, email or external API access is prohibited.
- Every content version shall be immutable. A new issue creates a new version and triggers impact analysis against dependent objects.
- Tenant, legal entity, client and project boundaries shall be enforced before retrieval, prompt construction and tool execution.
- Long-running workflows shall be resumable, idempotent and tolerant of model, integration or network failure.

### 3.3 Platform adaptation interface

```typescript
interface HostPlatformAdapter {
  identity(): IdentityProvider;
  objectStore(): ObjectStore;
  eventBus(): EventPublisher;
  workflow(): WorkflowProvider;
  notifications(): NotificationProvider;
  audit(): AuditSink;
  secrets(): SecretProvider;
  entitlement(): EntitlementProvider;
  integrationRegistry(): IntegrationRegistry;
}

interface BidEngineAPI {
  createTender(command): Tender;
  ingestContent(command): IngestionJob;
  executeAgent(command): AgentRun;
  requestApproval(command): Approval;
  exportSubmission(command): ExportJob;
  convertAward(command): ProjectBaseline;
}
```

---

## 4. Canonical domain model

Mandatory for adaptability. Each host platform maps its local objects to the
canonical types. Domain agents operate only on canonical identifiers and may
follow links back to the host object through external references.

### 4.1 Core entities

| Entity | Key fields and relationships |
|---|---|
| Tenant | Legal entities, policies, data region, entitlements, identity realm |
| Opportunity | Client, source, sector, value, probability, pursuit decision, capacity impact |
| Tender | Opportunity, procurement route, contract form, deadlines, currency, status, participants |
| TenderIssue | Issue number, issued date, source, superseded issue, delta and acknowledgement |
| ContentObject | File, message, form field, portal page, model, drawing, spreadsheet or archive |
| DocumentVersion | Hash, MIME type, language, extracted layout, security result and revision status |
| Requirement | Exact text, source span, type, mandatory status, scoring, owner, response and evidence |
| Obligation | Actor, trigger, action, deadline rule, consequence, clause and phase |
| Deliverable | Format, due date, owner, approval route, dependencies and submission location |
| ScopeItem | System, asset, work package, location, discipline, quantity and interface |
| EstimateItem | Quantity, unit, rate build-up, source, escalation, risk, confidence and total |
| ScheduleActivity | WBS, duration, logic, calendar, resources, constraints and milestones |
| Risk | Cause, event, effect, likelihood, impact, owner, response and allowance link |
| Assumption | Statement, basis, price or programme effect, validation date and status |
| Clarification | Question, basis, proposed answer, client response and impact assessment |
| ResponseSection | Requirement links, draft, claims, evidence, approvals and export position |
| Evidence | Source object, source span, verification status, validity, owner and permitted uses |
| Approval | Object, action, authority role, decision, conditions, timestamp and signature evidence |
| Submission | Manifest, package hash, approvers, channel, receipt and immutable snapshot |
| ProjectBaseline | Awarded scope, budget, programme, risks, obligations, assumptions and commitments |

### 4.2 Requirement lifecycle

```
DETECTED → NORMALISED → CLASSIFIED → ASSIGNED → IN_PROGRESS
  → READY_FOR_REVIEW → APPROVED → PACKAGED → SUBMITTED

Exception states: DUPLICATE, SUPERSEDED, NOT_APPLICABLE,
CLARIFICATION_REQUIRED, BLOCKED, REJECTED, WAIVED_WITH_AUTHORITY
```

A requirement **may be marked complete only when its completion rule passes.**
The default rule requires an approved response, all required evidence,
satisfied formatting constraints, resolved blockers and no open material
contradiction.

### 4.3 Evidence lineage

| Lineage component | Mandatory content |
|---|---|
| Source identity | Content object and immutable version |
| Location | Page, sheet, cell, paragraph, bounding box, model element or message segment |
| Extraction | Parser version, OCR confidence and extraction timestamp |
| Transformation | Normalisation, unit conversion, translation or calculation steps |
| Use | Requirement, claim, estimate, risk, activity or decision that consumes the evidence |
| Validation | Verifier, method, date, result and expiry |
| Access | Classification, tenant boundary, client restriction and permitted export |

---

## 5. Knowledge and memory architecture

### 5.1 Memory partitions

| Memory | Permitted contents | Promotion rule |
|---|---|---|
| Run memory | Temporary reasoning state, intermediate tool results | Destroyed or archived after the policy retention period |
| Tender memory | Issued content, decisions, drafts and tender-specific facts | Automatically retained within the tender |
| Project memory | Awarded baseline and delivery evidence | Created only after award conversion |
| Corporate knowledge | Approved case studies, methods, policies, rates and lessons | **Named knowledge steward approval** |
| User preference | Display and drafting preferences | User-managed; never treated as project fact |
| Model cache | Reusable non-sensitive embeddings or results | Scope, version and expiry required |

### 5.2 Retrieval requirements

- Hybrid retrieval shall combine metadata filters, keyword search, semantic retrieval and graph traversal.
- **Retrieval shall apply access control before content is sent to a model.**
- The retriever shall prefer current tender issues for current-state questions but include historic versions for change and claim analysis.
- Responses shall quote or paraphrase only evidence available within the requesting user's and agent's authority.
- Retrieval results shall return source span, version, confidence, relevance reason and supersession state.
- Agent prompts shall have explicit context budgets and shall summarise only through traceable derived artefacts.

---

## 6. Agent control plane

### 6.1 Required services

| Service | Developer requirement |
|---|---|
| Agent registry | Versioned definitions, goals, schemas, permissions, tools, evaluation suite and deployment status |
| Orchestrator | Build dependency graph, schedule work, collect outputs, resolve conflicts and enforce stop conditions |
| Planner | Decompose goals into typed tasks; prohibit execution of unapproved action classes |
| Scheduler | Priorities, deadlines, retries, concurrency, rate limits and tenant quotas |
| Tool gateway | Schema validation, permissions, secrets, idempotency, timeout, redaction and audit |
| Policy engine | ABAC and RBAC, delegation limits, project rules, client restrictions and risk classes |
| Model router | Select model by task, sensitivity, latency, cost, context and evaluation result |
| Memory service | Scoped retrieval, working memory, summarisation and approved promotion |
| Evaluation service | Offline benchmark, shadow tests, online sampling, regression and release gates |
| Trace service | Run graph, prompts or hashes where permitted, sources, calls, cost, latency, decisions and errors |
| Human task service | Review queues, SLA, escalation, substitution, delegation and decision capture |

### 6.2 Agent output envelope

```
AgentOutput<T> {
  status: completed | partial | blocked | abstained | failed;
  result: T | null;
  evidence: EvidenceReference[];
  assumptions: Assumption[];
  uncertainties: Uncertainty[];
  contradictions: Contradiction[];
  confidence: { score, method, calibration_band };
  actions_taken: ToolAction[];
  actions_proposed: ProposedAction[];
  approvals_required: ApprovalRequest[];
  next_tasks: TaskProposal[];
}
```

### 6.3 Stop and abstention rules

An agent shall stop and abstain when:

- The required source is missing, corrupt, unreadable or outside the access boundary.
- **Two authoritative sources conflict and no precedence rule resolves them.**
- The action exceeds financial, contractual, technical or safety authority.
- The confidence falls below the configured threshold for the task class.
- A deterministic validator rejects the proposed output.
- The remaining budget, time or tool allowance cannot complete the run safely.
- **A prompt injection, malicious attachment or unexpected instruction is detected.**
- The agent identifies a material conflict of interest or a prohibited client condition.

---

## 7. Specialist agent organisation

| Agent | Purpose | Inputs | Outputs | Authority boundary |
|---|---|---|---|---|
| Opportunity Director | Qualify opportunity and prepare the bid or no-bid case | Opportunity, CRM, historic performance, capacity | Decision paper, score, conditions, risks | **Cannot approve pursuit** |
| Tender Intake | Create controlled tender state | ITT content and channel metadata | Register, issues, deadlines, missing content | Cannot classify binding terms finally |
| Requirement Control | Build and maintain the compliance matrix | All current issued documents | Requirements, owners, rules, completion state | **Cannot waive a mandatory requirement** |
| Scope Intelligence | Decompose scope and detect gaps | Drawings, models, BoQ, specifications | Scope graph, interfaces, conflicts, clarifications | Cannot accept a design solution |
| Contract Intelligence | Model obligations and commercial exposure | Contract, amendments, schedules | Clause matrix, departures, notices, risk flags | Cannot give final legal approval |
| Estimate | Build traceable cost and price | Quantities, rates, quotes, location and risk | Estimate, basis, confidence, reconciliations | **Cannot approve the final price** |
| Planning | Build and challenge the programme | WBS, quantities, outputs, access, procurement | Programme model, checks, scenarios | Cannot approve the baseline |
| Technical Solution | Develop compliant methodology | Requirements, constraints, corporate methods | Method, design basis, interfaces, deliverables | Cannot approve engineering |
| Procurement | Develop supply chain evidence and comparisons | Packages, supplier data, quotations | RFQ, comparison, exclusions, recommendation | **Cannot appoint a supplier** |
| Response Composer | Create requirement-linked narrative | Approved solution facts and evidence | Response sections and schedules | **Cannot invent claims or values** |
| Red Team | Challenge win strategy and weaknesses | The complete working bid | Findings, severity and recommended correction | Cannot alter an approved response directly |
| Submission Controller | Validate and package the final response | Approved documents and portal rules | Manifest, checks, package, receipt record | **Cannot submit without authority** |
| Award Conversion | Create the delivery baseline | Final submission and executed contract | Reconciliation, baseline and handover tasks | Cannot infer accepted departures |
| Learning | Capture outcome and verified lesson | Tender results and delivery actuals | Benchmark proposals and lessons | **Cannot promote knowledge automatically** |

---

## 8. End-to-end ITT workflow

### 8.1 Tender receipt and workspace creation

1. Capture the invitation through API, email, upload, connected storage or authorised portal interaction.
2. Create a tender identifier, an immutable receipt event and an initial access policy.
3. Run malware, file integrity, encryption and duplicate checks **before extraction**.
4. Expand archives recursively while preserving the original path and container hash.
5. Classify each item and extract document metadata, layout, text, tables, form fields and embedded objects.
6. Identify the procurement timetable, submission channel, clarification deadline and **time zone**.
7. Create the tender issue register and require acknowledgement of client addenda.
8. Generate the initial requirement matrix, deliverable register, responsibility matrix and tender programme.
9. Escalate unreadable, password-protected, missing or contradictory content.

### 8.2 Addendum and revision impact

Each new issue shall trigger semantic and structural differencing. The impact
engine shall identify requirements added, changed or removed; revised
quantities; changed contract wording; drawing changes; date changes;
invalidated responses; estimate dependencies; programme dependencies; risks
and clarifications affected. It shall create review tasks and **prevent
submission while a material change remains unassessed.**

```
on TenderIssueReceived(issue):
  verify_integrity(issue)
  delta = compare(issue, previous_issue)
  impacts = traverse_dependencies(delta.changed_objects)
  mark_stale(impacts.derived_outputs)
  create_review_tasks(impacts, by_severity_and_deadline)
  block_submission_if(impacts.material_unresolved > 0)
```

### 8.3 Requirement extraction rules

- Split compound clauses into independently verifiable requirements when they have different owners, evidence or completion rules.
- **Retain the exact source wording and a normalised interpretation** as separate fields.
- Classify shall, must, required and equivalent binding terms; do not depend on keywords alone.
- Extract pass or fail conditions, scoring weights, response limits and requested attachment formats.
- Connect cross-references and defined terms before assigning meaning.
- Detect negative conditions, exceptions and client-reserved discretion.
- Set low confidence where tables, scans, handwritten content or cross-document context reduce extraction reliability.

---

## 9. Bid strategy and governance engine

### 9.1 Bid or no-bid score

The engine shall produce both a weighted score and an economic view. The score
is advisory and must expose factor weights, evidence, uncertainty and
sensitivity. **A high probability of winning shall not override unacceptable
liability, insufficient capacity, negative cash exposure or a prohibited
client condition.**

| Factor | Example measures | Hard stop capable |
|---|---|---|
| Strategic fit | Sector, geography, client, capability, reference value | No |
| Client quality | Payment history, behaviour, procurement credibility | **Yes** |
| Win probability | Competition, incumbent, relationship, differentiation | No |
| Commercial quality | Margin range, cash conversion, securities, inflation | **Yes** |
| Delivery capacity | People, plant, design, supplier and programme capacity | **Yes** |
| Contract exposure | Liability, damages, indemnity, termination and insurance | **Yes** |
| Bid investment | Cost, duration, opportunity cost and partner dependency | No |
| Information quality | Scope maturity, surveys, quantities and access | **Yes** |

### 9.2 Governance gates

| Gate | Entry condition | Approval | Exit artefact |
|---|---|---|---|
| G0 Register | Opportunity identified | Pursuit owner | Opportunity record |
| G1 Qualify | Minimum client and scope data | Bid director | Qualification decision |
| G2 Commit | Initial risk, capacity and economics complete | Executive authority | Bid budget and team |
| G3 Strategy | Win themes, solution and evidence mapped | Bid director | Approved bid plan |
| G4 Price | Estimate reconciled and risks priced | Commercial authority | Approved price |
| G5 Solution | Technical and programme reviews complete | Technical authority | Approved solution |
| G6 Submit | Compliance and packaging checks passed | Delegated signatory | Submission snapshot |
| G7 Award | Contract reconciliation complete | Executive and commercial authority | Accept, negotiate or decline |
| G8 Learn | Outcome and review captured | Knowledge steward | Approved lessons |

