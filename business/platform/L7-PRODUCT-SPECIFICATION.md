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

---

## 10. Compliance and requirements engine

### 10.1 Compliance matrix fields

| Field group | Fields |
|---|---|
| Identity | `requirement_id`, `tender_id`, `issue_id`, `source_ref`, `source_span` |
| Meaning | `exact_text`, `normalised_text`, `defined_terms`, `interpretation` |
| Control | `type`, `mandatory`, `score_weight`, `pass_fail`, `priority`, `sensitivity` |
| Delivery | `owner`, `contributors`, `due_at`, `dependencies`, `status`, `blockers` |
| Response | `response_section_id`, `answer`, `attachment_refs`, `portal_field` |
| Evidence | `required_evidence_types`, `evidence_refs`, validity and verification |
| Quality | `confidence`, contradiction state, `reviewer`, approval and comments |
| Change | `superseded_by`, `impacted_by_issue`, `stale_since` and revalidation state |

### 10.2 Deterministic completeness algorithm

```
complete(requirement) =
  current_source_version(requirement.source_ref)
  AND response.status == APPROVED
  AND all(required_evidence).verified_and_valid
  AND formatting_constraints.pass
  AND dependencies.all_resolved
  AND contradictions.material_open == 0
  AND waivers.have_required_authority
  AND export_manifest.includes(required_outputs)
```

### 10.3 Contradiction classes

| Class | Example | System response |
|---|---|---|
| Source conflict | Specification and drawing state different material | Create conflict and clarification |
| Response conflict | Programme says 20 weeks; narrative says 18 | **Block approval** |
| Commercial conflict | Price schedule differs from estimate total | **Block price gate** |
| Evidence conflict | Case study claim exceeds evidence | Remove claim or obtain evidence |
| Temporal conflict | Response uses a superseded drawing | Mark stale and re-review |
| Unit conflict | m² quantity priced as linear metre | **Block calculation** |
| Responsibility conflict | Two parties both exclude the same interface | Escalate as a scope gap |

---

## 11. Scope and technical solution engine

### 11.1 Scope graph

The scope graph shall connect requirement, system, asset, location, work
package, design deliverable, quantity, activity, estimate item, supplier
package, inspection, test and handover record. **This connection is what
identifies an unpriced drawing item, an unscheduled commissioning requirement
or an obligation without an accountable owner.**

### 11.2 Technical development workflow

1. Decompose the client outcome into systems, deliverables and acceptance criteria.
2. Identify design responsibility and the information required from each party.
3. Map interfaces between permanent works, temporary works, enabling works, utilities, logistics and operations.
4. Select only approved corporate methods, or create a clearly labelled project-specific draft.
5. Test the method against access, sequence, resources, safety constraints, permits, weather and working hours.
6. Create assumptions and clarifications where information is insufficient.
7. Link each method statement claim to the governing requirement and supporting evidence.
8. Route discipline-specific parts to competent reviewers.

### 11.3 Drawing and model controls

- Support PDF and raster drawings at minimum; support IFC and common model metadata through an adapter.
- Extract title block, revision, status, scale where reliable, discipline and drawing references.
- **Do not derive quantities from a raster drawing unless scale and measurement calibration pass configured checks.**
- Preserve model element identifiers and property sets used in quantity or compliance results.
- Flag coordination findings as candidate issues until validated by a competent user.
- **Track design maturity and prevent a concept quantity from appearing as a definitive construction quantity.**

---

## 12. Estimating and commercial engine

### 12.1 Estimate hierarchy

```
Tender Estimate
  Work Breakdown Structure
    Control Account
      Work Package
        Cost Item
          Quantity × Resource Rate
          Quote Line
          Allowance
          Risk Event
  Preliminaries
  Escalation
  Contingency or Risk Allowance
  Overhead
  Profit
  Tax and Duties
  Client Price Schedule Mapping
```

### 12.2 Rate build-up

| Component | Mandatory controls |
|---|---|
| Labour | Trade, grade, base rate, burden, overtime, shift, travel, lodging, productivity |
| Plant | Type, capacity, hire basis, mobilisation, fuel, operator, utilisation and standby |
| Material | Specification, quantity, waste, supplier, delivery, currency, duty and escalation |
| Subcontract | Scope coverage, quotation version, exclusions, qualifications and payment terms |
| Preliminaries | Time-related, fixed, activity-related and demobilisation |
| Risk | Identified event, probability, impact distribution, owner and treatment |
| Mark-up | Approved sequence, compounding rule, inclusion base and authority |

### 12.3 Commercial controls

- Every value shall carry currency, unit, price base date and tax treatment.
- **The engine shall prevent mark-up being applied twice through different estimate layers.**
- Supplier quotes shall be normalised **without deleting original exclusions or qualifications**.
- The final client price schedule shall reconcile exactly to the approved estimate, subject only to recorded rounding rules.
- Manual overrides require reason, role, old value, new value and timestamp.
- Cash flow shall model client payment, supplier payment, retention, bonds, advance payment, mobilisation, tax and working capital.
- Sensitivity runs shall include productivity, programme duration, inflation, exchange rate, late payment and key supplier failure.
- **Risk allowance release shall follow policy and must not be used to conceal known base cost.**

### 12.4 Estimate assurance tests

| Test | Failure condition |
|---|---|
| Quantity coverage | A scope item has no estimate item and no approved exclusion |
| Rate freshness | A rate or quote exceeds its validity threshold |
| Arithmetic | A calculated total differs from the stored total beyond tolerance |
| Unit consistency | Incompatible dimensions or conversions |
| Programme consistency | Time-related cost duration differs from the approved programme |
| Resource consistency | Planned crew differs materially from the rate build-up |
| Quote coverage | Supplier exclusions create an unpriced scope item |
| Price reconciliation | Submission price differs from the approved tender price |
| Cash exposure | Peak funding exceeds the approved threshold |

---

## 13. Planning and delivery method engine

### 13.1 Programme generation inputs

Deliverables and contractual milestones; WBS and scope quantities; production
rates and crew calendars; design, review and approval periods; procurement,
manufacture, inspection, shipping and customs durations; access, possession,
outages, permits and environmental windows; temporary works, enabling works
and logistics; testing, commissioning, training and handover; client,
statutory and third-party dependencies.

### 13.2 Schedule quality rules

| Rule | Required response |
|---|---|
| Open ends | Flag all non-authorised activities without a predecessor or successor |
| Hard constraints | Require reason and approval for constraints that override logic |
| Negative float | Identify the driving path and the contractual cause |
| Excessive duration | Decompose or justify above a configured threshold |
| Missing procurement | **Block installation readiness where the long-lead chain is absent** |
| Resource overload | Propose levelling choices and their impact |
| Calendar mismatch | Explain inconsistent work patterns across linked activities |
| Commissioning gap | Require the inspection and test sequence before the completion milestone |
| Unsupported productivity | Link duration to quantity and an approved output, or classify it as an assumption |

### 13.3 Scenario engine

The planner shall preserve the approved scenario and create immutable
alternatives. Each scenario shall state changed assumptions, schedule effect,
cost effect, resource effect, risk movement, contractual implications and
confidence. **It shall never overwrite the baseline to demonstrate a preferred
result.**

---

## 14. Contract intelligence engine

### 14.1 Contract model

| Object | Required attributes |
|---|---|
| Clause | Identifier, heading, text, source, amendment chain and defined terms |
| Obligation | Actor, trigger, action, deadline, form, recipient and consequence |
| Right | Beneficiary, condition, notice, limitation and evidence |
| Liability | Type, cap, exclusions, duration and insurance relationship |
| Payment term | Valuation, due date, notice, final date, retention, set-off and currency |
| Change mechanism | Instruction, quotation, assessment, time effect and approval |
| Time rule | Completion, access, programme, delay damages, extension and prevention |
| Security | Bond, guarantee, parent support, amount, expiry and form |
| Departure | Client term, proposed position, rationale, risk and approval status |

### 14.2 Contract review priorities

Order of precedence and the complete amendment chain; fitness for purpose and
design responsibility; uncapped, indirect or consequential liability; delay
damages, caps and concurrent delay treatment; indemnities and third-party
exposure; ground, utilities, contamination and information reliance; change,
notice and **time-bar** mechanisms; payment, retention, set-off and
pay-when-paid exposure where applicable; termination, suspension, step-in and
intellectual property; insurance requirements and gaps; data, cybersecurity,
model reliance and AI restrictions.

**Contract output must be labelled as decision support unless approved by
qualified legal or commercial authority. The engine shall not describe its
analysis as legal advice.**

---

## 15. Response composition engine

### 15.1 Grounded drafting contract

The composer may use only approved facts, tender-specific decisions and
evidence the requesting user may access. **It must not invent project results,
staff experience, accreditations, dates, commitments, equipment ownership or
supplier capacity.** A sentence containing a material factual claim shall
retain one or more evidence references.

### 15.2 Section object

```
ResponseSection {
  id, requirement_ids[], title, response_limit,
  evaluation_criteria[], win_theme_ids[],
  approved_fact_ids[], evidence_ids[],
  draft_versions[], current_version_id,
  author, reviewers[], approval_status,
  contradiction_status, export_template_slot
}
```

### 15.3 Composition sequence

1. Restate the evaluator's need internally, without wasting submission words.
2. Identify the response structure that maps directly to the scoring criteria.
3. Retrieve approved solution facts and evidence.
4. Draft at the required level of detail and within the exact limit.
5. Validate every material claim and value.
6. Check consistency against price, programme, risk and contract positions.
7. Run clarity, compliance and evaluator-orientation reviews.
8. Route the section to the required technical, commercial or executive approver.
9. **Lock the approved version for packaging; a subsequent source change marks it stale.**

---

## 16. Assurance and red-team engine

### 16.1 Independent review model

**The same agent run that authored content shall not provide the final
automated assurance result.** The assurance service shall use an
independently versioned prompt, separate context selection and, for
high-risk checks, a different model route or a deterministic validator.

### 16.2 Review lenses

| Lens | Questions |
|---|---|
| Compliance | Did the response answer every requested element and attach the required evidence? |
| Evaluator | Can a scorer find the answer and award marks without inference? |
| Commercial | Do commitments create unpriced scope or conflict with qualifications? |
| Technical | Is the method feasible, coordinated and consistent with design maturity? |
| Programme | Can the sequence achieve milestones using the stated resources and access? |
| Contract | Does the wording concede a departure, create a warranty or waive a right? |
| Evidence | Are claims current, valid, permitted and traceable? |
| Adversarial | What would a competitor, client reviewer or claims specialist attack? |
| Executive | Is the risk-adjusted return within authority and appetite? |

### 16.3 Finding severity

| Severity | Definition | Submission effect |
|---|---|---|
| Critical | Likely disqualification, unlawful content, unapproved price or material binding exposure | **Hard block** |
| High | Material score, margin, delivery or contractual risk | Block unless authorised disposition |
| Medium | Material quality weakness or manageable inconsistency | Review required |
| Low | Clarity, presentation or minor completeness improvement | May proceed with a recorded disposition |

---

## 17. Submission engine

### 17.1 Submission manifest

| Manifest field | Purpose |
|---|---|
| Submission ID and snapshot | Immutable identity of exactly what was approved |
| Document list | Filename, format, size, hash, revision and required destination |
| Requirement coverage | Each mandatory requirement and the exported location that satisfies it |
| Approval record | Approver, role, decision, conditions and time |
| Price reconciliation | Approved total, schedule totals, currency and rounding |
| Known exceptions | Approved waivers, outstanding client-controlled items and conditions |
| Channel record | Portal, email, API or physical method and the authorised operator |
| Receipt | Portal confirmation, email acknowledgement, timestamp and reference |

### 17.2 Pre-submission hard gates

- No unresolved critical finding.
- No mandatory requirement without approved satisfaction or an authorised waiver.
- All exported values reconcile to the approved commercial baseline.
- All documents use the required format, name, size and page or word limit.
- Every signature and declaration is present and authorised.
- The latest acknowledged tender issue has completed impact review.
- **No expired mandatory evidence at the submission deadline.**
- **The signatory has explicit authority for the tender value and risk class.**

### 17.3 Portal automation policy

Portal automation may populate fields and stage uploads **where the portal
permits it.** The system must preserve screenshots or receipts where
permitted, respect terms and access controls, and **stop before any binding
submission action unless an authorised human approves that exact snapshot.**
Credentials shall be handled only by the approved identity and secrets
services.

---

## 18. Award conversion engine

### 18.1 Reconciliation before conversion

Compare the final tender submission, post-tender clarifications, negotiation
records, letter of intent, contract documents and executed schedules. **It
must not assume that a tender qualification was accepted merely because the
contract was awarded.**

### 18.2 Conversion map

| Tender object | Delivery object | Conversion control |
|---|---|---|
| Requirement | Contract or project obligation | Confirm retained, changed or removed |
| Tender programme | Contract baseline candidate | Reconcile milestones and accepted changes |
| Estimate | Project budget and control accounts | Separate price, cost, risk and margin |
| Risk | Live project risk | Update ownership and treatment |
| Assumption | Validation action or change trigger | Set deadline and evidence |
| Qualification | Contract reconciliation item | **Confirm express acceptance** |
| Supplier quote | Procurement package baseline | Refresh validity and scope |
| Response commitment | Project deliverable or KPI | Assign an accountable owner |
| Method | Controlled work method draft | Complete project and safety approvals |
| Evidence schedule | Handover information requirement | Create asset and commissioning tasks |

### 18.3 No-loss handover test

Award conversion passes only when **every material tender commitment is mapped
to a delivery owner or explicitly classified as superseded.** The system shall
produce an exception register for unmapped commitments, unresolved
negotiations, changed price assumptions and unaccepted departures.

---

## 19. User experience requirements

### 19.1 Core workspaces

| Workspace | Mandatory views |
|---|---|
| Command Centre | Readiness, deadline, blockers, gate status, agent activity, decisions and forecast completion |
| ITT Library | Issue register, document tree, version comparison, extraction status and source viewer |
| Compliance | Requirement matrix, filters, owners, evidence, response and completion rule |
| Solution | Scope graph, interfaces, methods, clarifications, deliverables and technical reviews |
| Commercial | Estimate, quotes, reconciliation, risk, cash flow and authority |
| Programme | WBS, schedule quality, resources, procurement and scenarios |
| Contract | Clause, obligation, departure, exposure and approval |
| Response Studio | Evaluator criteria, grounded drafting, evidence, comments, limits and approval |
| Assurance | Findings, severity, disposition, retest and gate effect |
| Submission | Manifest, packaging validation, approvals, channel and receipt |
| Award Handover | Reconciliation, baseline mapping, exceptions and project creation |
| Agent Operations | Run graph, status, evidence, cost, approvals, errors and replay |

### 19.2 Explainability pattern

Every agent-generated result shall expose **what** the system concluded,
**why**, **which sources** support it, **what assumptions** remain, **how
confident** it is, **what action** it took or proposes, and **who** must
approve the next controlled step.

Raw hidden chain-of-thought is neither required nor displayed; the system
presents concise decision evidence and reproducible calculations.

### 19.3 High-risk interaction requirements

- Approval screens shall show the exact object version and the material differences from the previously approved version.
- **Bulk approval shall be disabled for final price, submission, contract departure and safety-critical content.**
- The user shall see financial value, liability, deadline and affected objects before approval.
- **Approval shall require an explicit decision, not mere navigation or opening a notification.**
- Rejected agent actions shall preserve the proposed action and the reason, for audit and learning.

---

## 20. Roles, permissions and delegated authority

| Role | Default scope |
|---|---|
| Platform Administrator | Tenant provisioning and platform policy; **no implicit access to client tender content** |
| Enterprise Administrator | Identity, integrations, retention, policies and entitlements |
| Executive Sponsor | Pursuit, risk appetite, award and high-value approval |
| Bid Director | Tender plan, team, strategy, readiness and submission recommendation |
| Commercial Authority | Estimate, price, cash, qualifications and commercial risk |
| Technical Authority | Technical solution and engineering review |
| Planner | Programme, logic, resources and scenario review |
| Estimator | Quantities, rates, quotes and estimate preparation |
| Legal Reviewer | Contract departures and legal risk review |
| Contributor | Assigned requirements and response sections only |
| External Partner | Explicitly shared work packages and documents only |
| Auditor | Read-only evidence, decision and event access |
| Submission Signatory | Final approval and the authorised submission action |

### 20.1 Permission model

RBAC for normal role bundles; ABAC for tenant, legal entity, tender, client,
work package, content classification, geographic region, action risk, value
threshold and time-limited delegation.

**A user who can edit a response does not automatically gain access to the
price or the contract departures. Agent identity must be distinct from the
user identity that authorised the run.**

---

## 21. API and event specification

### 21.1 Minimum API surface

| Method and path | Purpose |
|---|---|
| `POST /v1/tenders` | Create tender |
| `POST /v1/tenders/{id}/issues` | Register an ITT issue or addendum |
| `POST /v1/content/ingestions` | Ingest one or more content objects |
| `GET /v1/tenders/{id}/requirements` | Query compliance requirements |
| `PATCH /v1/requirements/{id}` | Update controlled fields with an optimistic lock |
| `POST /v1/agent-runs` | Start a bounded agent run |
| `GET /v1/agent-runs/{id}` | Retrieve run state and trace summary |
| `POST /v1/agent-runs/{id}/cancel` | Cancel safely |
| `POST /v1/approvals` | Request approval |
| `POST /v1/approvals/{id}/decisions` | Record decision |
| `POST /v1/estimates/{id}/reconcile` | Execute deterministic reconciliation |
| `POST /v1/submissions/validate` | Validate a submission snapshot |
| `POST /v1/submissions/{id}/approve` | Approve the exact submission snapshot |
| `POST /v1/submissions/{id}/execute` | Execute the authorised submission action |
| `POST /v1/tenders/{id}/award-conversion` | Create the controlled delivery baseline |

### 21.2 API rules

- Use tenant-scoped opaque identifiers.
- All mutating requests shall accept idempotency keys.
- Controlled objects shall use version numbers or ETags for optimistic concurrency.
- Errors shall return a machine-readable code, the affected object and remediation where safe.
- Large jobs shall be asynchronous and expose status plus webhooks.
- Pagination shall use stable cursors.
- **Exports shall be generated from immutable snapshots.**
- API and event schemas shall be versioned with a backward-compatibility policy.

### 21.3 Core events

| Family | Events |
|---|---|
| Lifecycle | `OpportunityRegistered`, `PursuitApproved`, `TenderCreated`, `TenderIssueReceived`, `ContentIngested`, `ExtractionCompleted`, `RequirementDetected`, `RequirementChanged`, `RequirementBlocked`, `EvidenceVerified`, `ClarificationIssued`, `ClarificationAnswered`, `EstimateChanged` |
| Controls | `PriceApproved`, `ProgrammeApproved`, `DepartureApproved`, `ResponseApproved`, `FindingRaised`, `FindingClosed`, `SubmissionSnapshotCreated`, `SubmissionApproved`, `SubmissionExecuted` |
| Learning and agents | `AwardRecorded`, `BaselineConverted`, `LessonProposed`, `KnowledgePromoted`, `AgentRunStarted`, `AgentRunBlocked`, `AgentRunCompleted`, `PolicyViolationDetected` |

---

## 22. Integration framework

| Integration | Minimum operations |
|---|---|
| Identity | OIDC or SAML, SCIM, MFA context, groups and user lifecycle |
| Email | Authorised ingest, draft, **send gate**, thread and attachment preservation |
| Storage and CDE | Read, version, metadata, permission mapping, link and controlled write |
| CRM | Opportunity, client, contacts, value, stage and outcome |
| ERP and finance | Cost codes, rates, suppliers, currency, tax and project creation |
| Estimating | Import and export estimate hierarchy, rates, quantities and versions |
| Scheduling | Import and export activities, logic, calendars, resources and baselines |
| BIM and CAD | Model metadata, elements, quantities, revisions and issue links |
| E-signature | Signature request and completed evidence; **never fabricate a signature** |
| Procurement portals | Authorised field mapping, staging, validation and receipt |
| Collaboration | Tasks, notifications, comments, mentions and decision capture |

### 22.1 Connector contract

```
ConnectorOperation {
  connector_id, tenant_id, acting_identity,
  operation_type, input_schema_version,
  requested_scope, data_classification,
  idempotency_key, timeout, retry_policy,
  result_ref, audit_event_id
}
```

---

## 23. Security, privacy and AI safety

### 23.1 Mandatory controls

- Encrypt data in transit and at rest using enterprise-approved cryptography.
- Use tenant-specific access boundaries in primary data, object storage, retrieval indexes, caches **and logs**.
- Store secrets in a dedicated secrets service; issue short-lived credentials where supported.
- Scan attachments before parsing and isolate active content.
- **Treat all ingested content as untrusted; detect and neutralise prompt-injection instructions contained in tender documents.**
- Apply data-loss prevention before model calls, tool actions and exports.
- Support configurable data residency, retention, legal hold and deletion.
- **Prohibit model-provider training on tenant data unless the tenant explicitly enables it under contract.**
- Record privileged access and require just-in-time elevation for support access.
- Run threat modelling for agent tool abuse, confused deputy, cross-tenant retrieval, data exfiltration and approval spoofing.

### 23.2 Prompt-injection policy

**Document text may describe contractual instructions but cannot change system
policy, agent permissions, tool access or approval rules.** The parser shall
label source content as data. If content attempts to direct the model to
ignore rules, reveal secrets, contact third parties or execute tools, the run
shall quarantine that instruction and create a security finding.

### 23.3 Audit record

| Field | Requirement |
|---|---|
| Identity | User, agent, service and delegated authority |
| Action | Requested, attempted, permitted, denied and completed operations |
| Object | Tenant, tender, object ID and object version |
| Evidence | Input references and output hash |
| Decision | Policy evaluated, result, approver and conditions |
| Technology | Agent definition, model route, tool version and validator version |
| Economics | Tokens, ACUs, processing time and external service cost |
| Time | Trusted timestamps and sequence |

---

## 24. Model routing and cost control

### 24.1 Routing policy

| Task class | Preferred capability | Additional control |
|---|---|---|
| OCR and layout | Specialised document model | Page-level confidence |
| Classification | Fast structured-output model | Schema and sample audit |
| Contract interpretation | High-reasoning model | Clause retrieval and expert review |
| Arithmetic | **Deterministic service** | **No LLM arithmetic as authority** |
| Response drafting | Long-context generation model | Grounding and claim validator |
| Red-team review | Independent high-reasoning route | Separate prompt and context |
| Image or drawing analysis | Vision model | Competent validation |
| Sensitive client data | Approved private route | Residency and retention policy |

### 24.2 ACU controls

- Estimate cost before a run and require approval above tenant thresholds.
- Set per-run, tender, team and tenant budgets.
- Cache only results whose source versions **and permissions** match.
- Use smaller models for extraction and classification after benchmark qualification.
- Stop recursive planning at a configured depth and task count.
- Show cost by tender phase, agent, model and successful output.
- **Do not allow budget exhaustion to produce an apparently complete but partial submission.**

---

## 25. Reliability and non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-001 | Availability | Core tender workspace 99.9% monthly, excluding agreed maintenance |
| NFR-002 | Durability | No acknowledged content or approval loss; multi-zone storage where the deployment supports it |
| NFR-003 | Recovery | Configurable RPO up to 15 minutes and RTO up to 4 hours for the enterprise tier |
| NFR-004 | Performance | Interactive filtered views p95 below 2 seconds at normal tenant volumes |
| NFR-005 | Ingestion | A 1,000-page mixed tender pack begins visible processing within 60 seconds |
| NFR-006 | Scalability | Process independent documents and agent tasks horizontally with tenant fairness |
| NFR-007 | Idempotency | A repeated event or command does not create duplicate controlled objects |
| NFR-008 | Accessibility | Meet WCAG 2.2 AA for core workflows |
| NFR-009 | Localisation | Unicode, locale dates, currencies, units and multilingual content |
| NFR-010 | Observability | End-to-end trace across request, run, tool, validator, object and event |
| NFR-011 | Portability | Deploy through documented containers and replace provider adapters |
| NFR-012 | Data export | Tenant-controlled export of documents, metadata, events and decisions |
| NFR-013 | Explainability | Material outputs expose evidence, assumptions, uncertainty and approval need |
| NFR-014 | Concurrency | Optimistic locking and visible conflict resolution for controlled objects |
| NFR-015 | Degradation | Read-only access and queued processing during a non-critical model outage |

---

## 26. Functional requirements

### ITT ingestion

| ID | Title | Requirement | Acceptance |
|---|---|---|---|
| ITT-001 | Multi-channel capture | Accept uploads, connected storage, authorised email and API input | Each source creates the same canonical ContentObject with channel metadata |
| ITT-002 | Immutable originals | Retain original bytes and cryptographic hash | Exported audit proves no mutation of received content |
| ITT-003 | Recursive archives | Expand nested archives within security limits | All safe children appear with the preserved parent path |
| ITT-004 | Issue register | Group documents into tender issues and addenda | User can identify the current and superseded issue |
| ITT-005 | Deadline extraction | Identify deadlines and time zones | Low-confidence or conflicting deadlines create a blocking review |
| ITT-006 | Layout extraction | Retain paragraphs, tables, coordinates and reading order | Source viewer highlights the exact extracted span |
| ITT-007 | Spreadsheet integrity | Preserve formulas, values, sheets and merged structures | Commercial import reports unsupported or hidden content |
| ITT-008 | Change detection | Compare new issues to prior issues | Material dependent outputs become stale automatically |
| ITT-009 | Malware and active content | Scan and isolate unsafe content | Unsafe content cannot reach parsers or agent tools |
| ITT-010 | Language handling | Detect and process supported languages without losing the original text | Translation stored as derived evidence, not as a replacement |

### Requirement control

| ID | Title | Requirement | Acceptance |
|---|---|---|---|
| REQ-001 | Atomic requirements | Decompose compound requirements when independently verifiable | Each atom has one completion rule and source span |
| REQ-002 | Mandatory classification | Identify mandatory and pass-fail requirements | Reviewer can approve or correct classification with audit |
| REQ-003 | Scoring model | Capture evaluation weights and criteria | Response studio shows mapped criteria and available score |
| REQ-004 | Assignment | Each active requirement has an owner before the strategy gate | Unowned mandatory requirements block the gate |
| REQ-005 | Evidence rule | Requirements may define required evidence types and validity | Completion fails when evidence is absent or expired |
| REQ-006 | Dependency | Link to prerequisite requirements and outputs | A blocked dependency prevents false completion |
| REQ-007 | Status control | Transitions follow the configured state machine | Invalid direct transitions are rejected |
| REQ-008 | Contradiction | Detect cross-response and cross-domain contradictions | Material contradiction blocks the relevant approval |
| REQ-009 | Waiver | Only authorised roles may waive configured requirements | Waiver stores authority, reason, scope and expiry |
| REQ-010 | Coverage export | Prove where each requirement is satisfied | Submission manifest maps each mandatory requirement to its export location |

### Agent control

| ID | Title | Requirement | Acceptance |
|---|---|---|---|
| AGT-001 | Typed run | Every agent task uses a versioned input and output schema | Malformed results fail without changing controlled state |
| AGT-002 | Authority envelope | Every run defines allowed tools and actions | An attempt outside the envelope is denied and logged |
| AGT-003 | Source restriction | Agents retrieve only authorised tender and corporate sources | Cross-tenant retrieval penetration test returns no data |
| AGT-004 | Abstention | Return blocked or abstained when evidence is insufficient | Test suite confirms no fabricated completion |
| AGT-005 | Checkpoint | Long runs persist resumable checkpoints | Worker restart resumes without duplicate actions |
| AGT-006 | Budget | Respect ACU, token, tool and elapsed-time budgets | Budget breach stops safely and reports partial state |
| AGT-007 | Approval pause | A run requiring a controlled action pauses for approval | No action occurs before decision for classes E and F |
| AGT-008 | Independent assurance | Author and assurance run definitions are separable | Release records show an independent review route |
| AGT-009 | Trace | Expose sources, actions, validators, costs and result | Auditor reconstructs the run without hidden mutable state |
| AGT-010 | Version pinning | A controlled output identifies agent, prompt policy, model and tool versions | Regression and audit can reproduce the configuration |

### Estimating

| ID | Title | Requirement | Acceptance |
|---|---|---|---|
| EST-001 | Estimate hierarchy | Support WBS to item-level cost breakdown | Totals roll up deterministically |
| EST-002 | Quantity lineage | Every quantity links to source or an approved manual basis | Click-through reveals source and transformation |
| EST-003 | Rate lineage | Every rate includes effective date, location, currency and source | Stale-rate warning triggers by policy |
| EST-004 | Quote normalisation | Compare supplier scope, exclusions and terms | Comparison retains the original quote wording |
| EST-005 | Unit engine | Validate dimensions and conversions | Incompatible units cannot calculate silently |
| EST-006 | Mark-up control | Apply approved mark-up order and bases | Test estimate shows no duplication |
| EST-007 | Risk allowance | Risk value links to identified risks or approved allowance policy | Unlinked contingency is separately visible |
| EST-008 | Cash flow | Model receipts, payments, retention and securities | Peak funding and timing are reproducible |
| EST-009 | Scenario | Create immutable commercial scenarios | Baseline remains unchanged |
| EST-010 | Reconciliation | Client price schedules reconcile to the approved tender total | Unexplained variance blocks G4 and G6 |

### Planning

| ID | Title | Requirement | Acceptance |
|---|---|---|---|
| PLN-001 | WBS mapping | Activities map to scope and control accounts | Unmapped material scope is reported |
| PLN-002 | Logic validation | Detect open ends and invalid logic | Schedule quality report identifies the exact activities |
| PLN-003 | Duration basis | Material durations reference quantity and productivity, or an assumption | Unsupported duration is visible |
| PLN-004 | Procurement chain | Long-lead installation links to procurement and design | A missing chain creates a high finding |
| PLN-005 | Calendars | Calendar differences are explicit | Calculated dates reproduce the source schedule |
| PLN-006 | Resources | Test resource demand and availability | Overloads appear by period and resource |
| PLN-007 | Commissioning | Completion includes testing and handover logic | Missing logic blocks technical approval where mandatory |
| PLN-008 | Scenario | Recovery options preserve the approved baseline | Scenario delta shows time, cost and risk |
| PLN-009 | Milestones | Contract milestones map to clauses or requirements | Milestone source visible |
| PLN-010 | Export adapter | Map to supported scheduling systems | Round-trip test preserves IDs, dates and logic within declared limits |

### Contract

| ID | Title | Requirement | Acceptance |
|---|---|---|---|
| CON-001 | Clause graph | Clauses retain definitions, references and amendment chain | Viewer shows operative and superseded text |
| CON-002 | Obligation | Structure actor, trigger, action, deadline and consequence | Sample obligations calculate dates correctly |
| CON-003 | Departure | Proposed departures require owner, rationale, risk and approval | Unapproved departure cannot enter the final schedule |
| CON-004 | Time bar | Identify tender and delivery notice deadlines | Calculation exposes the rule and the source |
| CON-005 | Liability | Identify caps, exclusions and uncapped categories | Executive review lists unresolved exposure |
| CON-006 | Payment | Model payment dates, retention and set-off | Cash model uses the approved terms |
| CON-007 | Security | Capture bonds and guarantees with amount and expiry | Estimate includes the approved cost treatment |
| CON-008 | Conflict | A bespoke amendment takes precedence only through the approved order rule | Operative clause selected reproducibly |
| CON-009 | Disclaimer | Automated analysis labelled decision support | UI and exports do not claim legal approval |
| CON-010 | Approval | Legal or commercial gate required by configured risk | High-risk contract cannot progress without a decision |

### Response

| ID | Title | Requirement | Acceptance |
|---|---|---|---|
| RSP-001 | Grounded claims | Material factual claims reference approved evidence | Claim validator rejects an unsupported test sentence |
| RSP-002 | Word limit | Calculate limits according to the portal rule | Export stays within configured tolerance |
| RSP-003 | Evaluator mapping | Each response maps to criteria and requirement | Reviewer can navigate both directions |
| RSP-004 | Controlled values | Price, duration and performance values come from approved objects | Draft cannot override through free text unnoticed |
| RSP-005 | Corporate content | Only current approved knowledge may be reused | Expired case study is blocked or warned |
| RSP-006 | Collaborative versioning | Edits retain version and author history | Concurrent edits resolve without silent loss |
| RSP-007 | Approval | Approved response locked to source versions | Source change marks the response stale |
| RSP-008 | Translation | Translated response retains source and reviewer status | Both language versions linked |
| RSP-009 | Export slot | Each response maps to a template or portal position | Packaging locates it deterministically |
| RSP-010 | Tone and clarity | Quality checks may propose edits without changing facts | Accepted edit preserves evidence links |

### Submission

| ID | Title | Requirement | Acceptance |
|---|---|---|---|
| SUB-001 | Snapshot | Generated from an immutable snapshot | Hash remains stable through approval and execution |
| SUB-002 | Manifest | Package includes a machine-readable manifest internally | All files and coverage enumerated |
| SUB-003 | Format | Validate permitted types, size, name, page and word limits | An invalid test file blocks submission |
| SUB-004 | Signature | Required signatures present and authorised | An unsigned declaration blocks G6 |
| SUB-005 | Final price | All presented totals match the approved price | A one-unit mismatch blocks validation |
| SUB-006 | Issue status | Latest acknowledged issue assessed | An unassessed addendum blocks validation |
| SUB-007 | Exact approval | Signatory approves the exact snapshot hash | Modification after approval requires new approval |
| SUB-008 | Execution | A binding submit action requires delegated authority | An unauthorised API call returns denial |
| SUB-009 | Receipt | Retain confirmation and trusted timestamp | Submission history shows the receipt |
| SUB-010 | Retention | Snapshot immutable under retention policy | Deletion attempt follows hold and authority rules |

### Award conversion

| ID | Title | Requirement | Acceptance |
|---|---|---|---|
| AWD-001 | Document reconciliation | Executed contract compared to the final bid and negotiations | Differences produce classified exceptions |
| AWD-002 | Qualification acceptance | **No qualification treated as accepted without evidence** | Ambiguous item remains unresolved |
| AWD-003 | Commitment mapping | Each bid commitment maps to an owner or superseded status | No-loss test reports zero unexplained items |
| AWD-004 | Budget conversion | Price, cost, risk and margin remain distinct | Delivery budget reconciles to the approved estimate |
| AWD-005 | Programme conversion | Contract baseline candidate retains tender logic and accepted changes | Milestone variance explained |
| AWD-006 | Risk conversion | Tender risks transfer with updated owner and status | Material risk not dropped |
| AWD-007 | Assumption validation | Assumptions create dated validation actions | Overdue material assumption escalates |
| AWD-008 | Procurement conversion | Quoted packages create sourcing records **without appointment** | No supplier commitment is generated |
| AWD-009 | Project creation | Host adapter creates the project only after approval | Failure rolls back or resumes idempotently |
| AWD-010 | Knowledge isolation | **Tender content does not enter corporate knowledge automatically** | Promotion requires steward approval |

