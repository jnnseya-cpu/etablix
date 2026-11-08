# ETABLIX · Integrated Site Services Agent OS
## Developer specification v2.0 · 8 November 2026

> **Corrected copy, 8 November 2026.** Model 03 is named **Prime Service Contractor** throughout. As issued, §2 named it “Principal Service Contractor”, which collides with the CDM 2015 Principal Contractor role and which this platform already refuses at document generation. Three occurrences were changed — the §2 control matrix, the §2 label paragraph and AT-04 — and the reason is recorded in §2 so it is not reverted. The reference to the HSE’s own principal contractor guidance at R1 is untouched, because that one is about the statutory role and is correct. Nothing else in the specification is altered; see `AGENT-OS-SPEC-V2-HARMONISATION.md` for what is built against it.

**Product scope.** Operate temporary construction-site infrastructure and workforce services from opportunity through accepted reinstatement. ETABLIX owns the temporary services workstream. Permanent works, network operations and customer dutyholders are external interfaces. Pilot: a hypothetical remote Isle of Skye construction site, 100 nominal personnel, 36 months and approximately 300 m² of day-use site-village accommodation. Overnight beds, peak concurrent demand and floor-area adequacy are unresolved until confirmed. England and Scotland are separately versioned pilot rule profiles. The delivery model labels, trade codes, policy thresholds and implementation stack below are product configuration choices.

**Baseline.** This specification builds on the ETABLIX AI Site Services Operating Module v1.0 and the CONSTRUX.AI agent delivery specification. It makes 100% workflow ownership measurable and adds explicit commands, release rules, evidence states and acceptance tests. The earlier seven operational families remain reporting tags. Use the six delivery categories below as the canonical service taxonomy. Procurement is a cross-cutting workflow and enabling civils can be reported separately from reinstatement. Existing package IDs must survive migration.

## 1. Product contract and agent autonomy

**100% workflow ownership.** Every active workflow has one accountable AI agent that creates or receives tasks, assigns specialist work, runs tools, verifies evidence, executes authorised actions, monitors timers, escalates exceptions and closes or reopens the workflow. Agents continue coordinating while an authority decision or physical work is pending. Routine in-policy steps have no mandatory human rekeying or approval. Report eligible steps completed unattended separately from workflow ownership. Track blocked and waiting cases visibly. A workflow stopped by a safety or contractual condition remains agent-owned.

| Class | Execution | ETABLIX examples |
|---|---|---|
| A0 | Read, analyse and observe autonomously within permissions | Ingest site surveys, prices, meter readings, delivery events and contract versions |
| A1 | Reversible internal write | Draft layout brief, comparison, inspection request, risk, internal forecast or cost alert |
| A2 | Act under a current scope-bound delegation and a passed policy check | Send an RFQ to approved suppliers, schedule eligible cleaning, notify an on-call team, synchronise an accepted asset list or send a non-binding reminder |
| A3 | Agent prepares and routes, then executes permitted follow-through after authority is verified | Supplier award, contract or order commitment, notice affecting legal rights, contingency draw, certified valuation, payment release, regulated submission, safety-critical release, occupancy decision and off-hire affecting liability |
| A4 | Deny tool and command | Fabricate field or regulator evidence, bypass a mandatory hold, impersonate a competent person, energise or isolate live equipment, actuate gates or bypass their emergency control |

A2 delegations bind actor, legal entity, project, action, package or asset scope, channel, recipient, threshold and cumulative cap, effective window and revision. Require explicit configuration for any outbound connector. A3 approval binds the exact payload, attachments, evidence, contract and authorisation snapshot. A material change invalidates unexecuted authority. Digital status records distinguish work requested, scheduled, physically observed, independently verified and contractually accepted. Emergency callouts can be scheduled or routed to the approved duty team. Physical isolation, energisation, lifting, field inspection and emergency command remain with the responsible competent parties. CDM roles follow applicable duties and verified appointments. [R1–R4]

**Metric definitions.** Workflow coverage = active workflow instances with exactly one agent owner / active workflow instances. Target 100%. Unattended execution rate = completed eligible A0–A2 steps with no manual intervention / completed eligible A0–A2 steps. Separately report first-pass acceptance, elapsed time in authority wait, manual evidence acquisition, missed contractual deadlines, unsafe attempts and unreconciled external effects. Evidence creation by a field party does not break workflow ownership.

## 2. Appointment model and authority engine

| Control | 01 Advisory | 02 Management Integrator | 03 Prime Service Contractor |
|---|---|---|---|
| Customer buys | Fixed-fee professional scope and procurement-ready deliverables | Mobilisation and management integration, with agreed management fee or margin and delegation | Single integrated service contract with ETABLIX and disclosed allowances where agreed |
| Supplier contracting party | Customer | Customer, unless a separately executed package says otherwise | ETABLIX for the scope it contracts |
| Supplier award and payment | Customer owns. ETABLIX can compare or recommend within engagement. | Customer owns. ETABLIX can administer and recommend under delegated limits. | ETABLIX authority, subject to executed terms and underwriting gates |
| Operational workflow | Customer takes coordination at advisory handover unless separately appointed | ETABLIX runs agreed operations and supplier coordination | ETABLIX runs operations and administers direct supply-chain contracts |
| Financial subledger | ETABLIX fees and expenses only. Customer estimates are advisory. | ETABLIX fee ledger and separate customer supplier exposure. | Customer receivables and ETABLIX supplier liabilities, finance and risk |
| Contract outputs | Scope, cost model, procurement recommendation and handover | Management appointment, customer-name records, recommendations and reporting | ETABLIX customer contract and matched supplier obligations |

“Prime Service Contractor” is the ETABLIX commercial label. **It is never written “Principal Service Contractor”.** That phrase is one word from the CDM 2015 Principal Contractor role, and several of this company’s target clients hold that role themselves on their own sites; a disclaimer protects the author of a document and not the reader who skims its title. The platform refuses the colliding phrase at document generation and the label is load-bearing in `shared/constants.js`, every agent brief in `backend/lib/ai.js`, `routes/docs.js` and `routes/playbook.js`. The commercial label does not assign the CDM principal contractor role. Store regulatory role appointments separately from commercial model, insurer and legal entity. Gate reserved approvals by actual authority. Agent actions in Model 01 cannot dispatch supplier awards or create supplier liabilities. In Model 02 a recommendation must never become an ETABLIX purchase order because of a supplier ERP default.

**Model selection.** Run a fit assessment against client capacity, enforceable delegation, procurement maturity, urgency, insurance, availability, credit, exposure and project interfaces. Model 03 requires treasury approval, committed-cash headroom, supplier availability, insurance and liability review before binding. Model change requires a signed effective-dated transition with a cutover manifest of contracts, open orders, invoices, retentions, warranties, notice timers and legal entities. Historical commitments keep their original owner. Block mixed ownership where no verified assignment or novation exists. Reconcile title, data access and existing operator appointments before restarting held actions.

## 3. Service catalogue and interface graph

Use stable service codes. Code names below are the implementation grouping of the 21 service lines. Multiple suppliers, zones, phases and cost lines may use one code. Each package declares inclusions, exclusions, supply/install/connect/test/operate/remove owners and verification obligations.

| Category | Service codes and coverage | Critical interfaces |
|---|---|---|
| **Design and temporary works** | 01 Site diagnostic, surveys and service design · 02 Temporary works design, checks and coordination | Site datum, constraints, ground conditions, design loads, temporary works register and competent release |
| **Establish site** | 03 Clearance and earthworks · 04 Foundations and hardstands · 05 Temporary roads, walkways and parking · 06 Drainage and runoff controls · 07 Fencing, gates and traffic management | Buried utilities, ground-bearing limits, flood and environmental conditions, access windows, client traffic plans |
| **Utilities** | 08 Temporary electrical supply, generation and fuel · 09 Potable and process water · 10 Foul wastewater, storage, treatment and tankering · 11 Temporary MEP, lighting, alarms and controls · 12 Data, connectivity and communications | Source availability, demand, dependency on distribution, test authority, resilience, discharge and isolation |
| **Buildings and equipment** | 13 Modular offices, welfare and workforce accommodation · 14 Plant, furniture, fixtures and equipment | Foundations, lifts, weather limits, fire, access, occupancy and maintenance |
| **Operate** | 15 Security and access services · 16 Catering · 17 Cleaning, FM, laundry and pest control · 18 Waste and recycling · 19 First aid and medical service coordination · 20 Logistics and workforce transport | Shift/occupancy curves, service windows, duty cover, waste routes, access, privacy and incident response |
| **Demobilise** | 21 Disconnection, removal, off-hire and reinstatement | Remaining live dependencies, asset owner and hire terms, condition baseline, waste evidence and landowner acceptance |

The system breakdown structure (SBS) is **project → compound/zone → phase → service system → asset/service instance**. Link every system to WBS/CBS, demand scenarios, supplier package, requirements, dependent systems, inspections, KPI policies, commercial lines and removal obligations. Interface records identify two endpoints, direction, dependency kind, quantity/unit or threshold, owner on each side, phase window, contingency and acceptance evidence. Examples are cabin foundation loading, fire alarm across compounds, shared generator, tank access for vehicle collection, bus arrival versus gate capacity and retention of welfare until the final crew leaves.

## 4. Agent catalogue

| Agent | Work owned | Required outputs |
|---|---|---|
| ET-ORCH | Workflow intake, delegation and continuity | Case graph, timers, scope and owner ledger |
| ET-BD | Opportunity, model fit and bid strategy | Bid/no-bid, exposure, pursuit and fit memo |
| ET-BRIEF | Brief, surveys, gaps and assumption challenge | Requirement and source conflict baseline |
| ET-SYS | Design composition, capacities and alternatives | SBS, demand model, site option comparisons |
| ET-TW | Temporary works and enabling interfaces | Design/check register, permit evidence and dependencies |
| ET-ENV | Land, environmental and jurisdictional requirements | Compliance register, permit scope and monitored conditions |
| ET-BUY | Packaging, RFQ, commercial comparison and supplier readiness | Procurement plan, aligned bids, award pack and capacity proof |
| ET-PLAN | Mobilisation, capacity, dates and sequencing | Integrated logic, workface lookahead, capacity and delivery windows |
| ET-MOB | Delivery, receipt, installation, controlled release | Arrival and installation evidence, holds and release packs |
| ET-TEST | Commissioning, functional and integrated acceptance | Test attempts, evidence, defects and site-ready recommendation |
| ET-OPS | Daily service orchestration and continuity | Service board, work orders, SLA events, critical escalations |
| ET-LOG | Security, deliveries, routes and workforce transport | Booking, gate capacity, roster reconciliation and incident routing |
| ET-QA | Inspections, quality and closeout | ITPs, observations, NCRs, release prerequisites |
| ET-COM | Prices, EVM, valuation, changes and cash | Commercial ledger, EAC, notices, invoices and reconciliation |
| ET-OFF | Off-hire, removal and reinstatement | Dependency clearance, notices, receipts, condition delta and closeout |
| ET-VERIFY | Independent evidence and release verification | Reproducible checks, disputed facts and exception record |
| ET-PORT | Multi-site capacity, cash and performance | Shared assets, supplier exposure and scoped benchmarks |

Every task contains tenantId, projectId, workflowId, taskType, ownerAgent, service and phase scope, inputVersionRefs, prerequisiteIds, policyVersion, capabilities, dueAt, retryProfile, correlationId and outputSchemaVersion. A result contains observed facts, derived facts, source locators, proposed typed commands, blockers, due dates and next action. Keep model confidence separate from verification. Agent voting cannot close a hold. ET-VERIFY independently retrieves pinned evidence and challenges the claim, with deterministic acceptance criteria and independent authority evidence for critical outcomes.

## 5. Lifecycle workflows and RIBA interfaces

The customer programme may use RIBA Stages 0–7. ETABLIX runs a separate temporary-services lifecycle by phase, package and compound. For example, live welfare operations may run while the main project designs another phase, and off-hire may occur during main construction. Stage tags are cross-references. They do not grant authority.

| Workflow / owner | Trigger and ordered execution | Done and blocking conditions |
|---|---|---|
| **W01 Opportunity and model fit · ET-BD** | New opportunity → extract milestones, client, site and liability → assess funding, capacity, routes and pursuit → route bid/no-bid and appointment | Executed appointment or decision to close; unknown legal entity blocks binding action. RIBA 0–2 interface. |
| **W02 Brief and site diagnostic · ET-BRIEF** | Evidence received → survey and classify greenfield, brownfield or live site → extract workforce curves, site restrictions, access, sleeping, utilities and land baseline → challenge discrepancies | Approved requirement baseline with scope, assumptions and site evidence. RIBA 1–3. |
| **W03 Design and temporary works · ET-SYS** | Baseline received → calculate capacity by phase → compose variants → map interfaces → coordinate survey, layout, temporary works and permissions → route design checks | Current coordinated service design and release register. Material assumptions remain held. RIBA 2–4. |
| **W04 Bid and procurement · ET-BUY** | Approved scope or addendum → package interfaces → verify eligible suppliers → RFQ → align bids, terms and schedule → route award → dispatch and reconcile | Package award or customer recommendation according to model. No approved manifest or authority means no binding action. RIBA 2–5. |
| **W05 Mobilise · ET-MOB** | Package release and access window → schedule manufacture, route, deliveries and assembly → verify ground, permits, lift readiness and receipt → track installation | Installed assets with records. Separate delivery, lift and installation releases. RIBA 4–5. |
| **W06 Commission and open · ET-TEST** | Installed system turnover → verify test plans and witnesses → record functional, integrated and failure-mode tests → route opening by service/zone | Service-ready with applicable authority and evidence. Distinct from main works completion. RIBA 5–6 interface. |
| **W07 Live service assurance · ET-OPS** | Accepted phase or scheduled duty → reconcile demand and service evidence → planned maintenance, shifts, helpdesk, exceptions and incidents → verify closure and SLA | Daily assurance and open risks with owners. Operates alongside main works and into applicable use. |
| **W08 Valuation, cash and change · ET-COM** | Invoice, period close, change or operational event → match scope, evidence and terms → calculate forecast, disputed/approved change, deadlines and cash → route reserved decisions | Reconciled receivables/liabilities, signed valuation or dispute and receipt history. Continuous. |
| **W09 Off-hire and reinstatement · ET-OFF** | Service demand reduced, termination or phase end → verify alternative coverage → agree disconnection/removal → route off-hire → recover and reconcile assets → verify land condition | Separate commercial stop, physical return and reinstatement acceptance. Continuous through closeout. |
| **W10 Portfolio and learning · ET-PORT** | Approved forecast or closeout → aggregate capacity, rates, risk and supplier performance → detect competing slots and benchmark changes | Scoped portfolio reporting, aggregated learning and audit. Continuous. |

**Greenfield/Brownfield/Live templates.** For greenfield capture access, utility availability, drainage, topography, ecology, weather and ground capacity. For brownfield add current utility records, targeted ground/structural investigations and contamination, prior foundations and legacy interfaces. For live sites add operator access rules, interface and isolation boundaries, permits, service continuity, shutdown windows and emergency coordination. Evidence precedence, applicable investigations and technical checks come from the appointed parties. Record survey scope, coordinate system, reliance and expiry.

## 6. Capacity and design rules

- **People and beds.** Derive concurrency by person/cohort, site, zone, shift and time bucket. Use union of known cohorts to avoid double counting. Keep visitors, accessibility needs and relief cover explicit. Where identities are absent, store bounded scenarios and source assumptions. Beds depend on bed-night demand, rooming constraints, usable room stock, arrivals, cleaning turnaround and fire/occupation approval. Day-use welfare and overnight accommodation are distinct.
- **Welfare and catering.** Derive time-bucket demand by fixture type and meal window. Retrieve applicable welfare requirements and client standards, retain the version and identify occupancy basis. Measure queuing and availability separately. Reject unsupported rules such as blanket fixture ratios or floor-area conversions. [R1]
- **Power and MEP.** Store load, phase, diversity, starting load, critical load, autonomy hours, fuel reserve and delivery windows. Compare generator/grid and resilience options. An engineering check and authorised physical tests control acceptance. A forecast fuel shortfall creates logistics and escalation tasks. [R3]
- **Potable and foul.** Track net usable capacity, replenishment interval, peak consumption, storage autonomy, reserve, water quality evidence, wastewater generation, high-level alarm, vehicle turnaround and permitted destinations. Keep potable, process, foul, runoff and dewatering streams separate. Route Scottish authorisation under applicable SEPA regime and England via the applicable route. A permit or position statement is scoped by activity and conditions. [R5, R6]
- **Traffic, cleaning and waste.** Model occupied floor areas and hours, job frequencies and productive rates, route/gate occupancy and throughput, seat availability by stop and shift, and waste streams by storage, pickup and evidence. Protect transport capacity for cancellations using an approved fallback. Waste carrier, destination and paperwork follow the applicable jurisdiction and waste classification. [R7]
- **Engineering and land.** Capture access route limits, platform capacity, tie-down and anchorage basis, weather constraints, excavation, drainage and condition survey. Approve the installed revision, approvals and handover evidence, rather than treating a concept layout as a release document.

**Skye capacity fixture.** Nominal workforce 100. Shift A has 72 unique people, shift B has 50 unique people during overlap and 8 distinct visitors are concurrent. Peak is **130**, assuming all are present in the defined service zone and no duplicated cohorts. The approximately 300 m² footprint is a design assumption to validate, not a capacity certificate. For a simulation using 40 L/person/day and one 130-person day, demand is **5.2 m³/day**. A hypothetical 10 m³ usable store yields about **46.15 hours** under constant demand before reserves. If an approved policy keeps 2 m³ in reserve, operational autonomy is about **36.92 hours**. These inputs test the software. They do not set potable, welfare or engineering requirements. Feed ferry/road conditions, adverse weather, alternative supply, transport, refill times and contractor working windows into the schedule and resilience model.

## 7. Procurement, mobilisation and opening

### Supplier and bid engine

Model supplier and package eligibility separately. States are CANDIDATE, EVIDENCE_PENDING, ELIGIBLE, INVITED, OFFER_RECEIVED, EVALUATED, RECOMMENDED, AWARD_PENDING, AWARDED, MOBILISATION_HOLD, READY, LIVE, SUSPENDED and CLOSED. A rejected quote may be retained as historical evidence. Eligibility considers company identity, financial exposure, competence, insurance, equipment evidence, capacity, backup resources and only applicable checks for right to work, waste, food, security and transport. Validate actual licence scope and expiry using the appropriate approved source. A supplier being eligible for office furniture does not establish competence for electrics or transport.

Normalise against service code, unit, measurement period, quantity, availability, location, mobilisation, demobilisation, labour, utilities, rates, exclusions, risk allocation, service levels and payment. Keep one-off and recurring charges distinct. For hire, test minimum period, extension rates, loss/damage, transport, cleaning, collection and off-hire conditions. A low module rate can lose when haulage, connections, repairs and off-hire exposure are included. Apply weighted technical/commercial evaluation with pinned scoring and an audit trail. Record a bid with an unknown inclusion as unresolved. Do not convert it to a zero allowance.

In Model 03 verify suppliers' quoted dates, client contract conditions, coverage and price-risk ownership before binding. Protect customer-specific rates across projects. When a manufacturer serves multiple projects, the portfolio agent can flag a slot conflict using access-approved capacity data, without exposing competing commercial terms.

### Mobilisation gates

| Gate | Mandatory inputs, subject to applicable scope |
|---|---|
| Order | Current scope and price, approved supplier, correct buying entity, delegated/reserved approval, funded exposure and confirmed delivery assumptions |
| Dispatch to site | Actual access/slot, approved transport and route, unloading capacity, receipting party, preservation checks, latest confirmed weather or route restriction if applicable |
| Lift and place | Verified ground and bearing constraints, foundation release, competent lift planning and field authority, current equipment/crew evidence and exclusion/control arrangements [R2, R4] |
| Connect and test | Installed revision, authorised specialists, compatible utility and isolation boundary, approved test script, quality records, calibration and authority [R3] |
| Open service | Current system tests, inspections, usable capacity, dependencies, operating instructions, emergency plan, applicable permissions, named accepting party |
| Change or relocate | Revised dependency and capacity evidence, safe transition and isolation plan, valid package and approvals, operator and customer impact |
| Remove or reinstate | Equivalent service or dependency release, off-hire terms, disconnection confirmation, safe lift/haulage, waste route and agreed land evidence |

A delivered cabin is an asset receipt, distinct from installation, commissioning and opening. At acceptance test physical dependencies, for example potable water quality evidence and delivery, functional foul alarm and recovery, fire alarm coverage and operator awareness, welfare cleaning/consumables, access/egress and emergency contacts. Record which services and locations can open. Reserve compound opening if critical services are incomplete. A restricted release must describe capacity, time and permitted area, and cannot waive a mandatory requirement.

Test attempt states are PREPARED → READY → RUNNING → PASSED / FAILED / ABORTED / INVALID. Pin requirement, script revision, asset configuration, calibration, witness, conditions, test observations and acceptance. A retest is a new linked attempt. A materially changed configuration makes downstream acceptance stale. An authorised exception cannot replace the applicable test requirement.

## 8. Live operations, incidents and off-hire

**Control loop.** Shift start: reconcile duty cover, operating capacity, late deliveries, occupancy, backlog and access exceptions. During shift: ingest verified tickets, sensors, inspections and schedule changes. Classify events by impact and confidence. Open appropriate tasks and callouts under policy. Shift end: reconcile actuals, outstanding risks, escalation handover and next actions. Maintain durable timers for out-of-hours cover.

**Service-level policy fields.** Service, KPI, population/denominator, threshold, unit, exclusions, sampling frequency, calendar, clock trigger, stop/pause criteria, severity, evidence source, evidence freshness, credit formula, cap and dispute procedure. Track acknowledgement, attendance, restoration and verified closure separately. For example, a wastewater high-level alarm creates a critical incident and authorised emergency collection workflow if credible. A stale sensor creates a data-quality incident and alternate observation request. An unverified alarm cannot certify a supplier failure or automatically create a credit. Dual evidence conflict remains disputed and the continuity workflow can run independently. Credits and payment consequences use the applicable contract and approval.

**Illustrative case priorities.** P1 immediate risk to critical welfare, power, wastewater or access. Route to the approved site duty team immediately under policy and start durable timers. P2 degraded service with a verified safe workaround. Schedule corrective action against the contract calendar. P3 routine maintenance or reporting. Exact target times are customer/SLA configuration. Event clusters from one outage may create one incident with linked observations. Never suppress a genuine escalation merely because it resembles a prior incident.

**Off-hire.** Track request, contract notice dispatch, supplier confirmation or contract-effective stop, isolation, collection, return, damage, accrued hire and invoice closure as distinct facts. Support arrangements where agreed notice stops charges before collection and those where return or another condition stops charges. A sent email or booking date alone does not stop billing. Check remaining dependencies before any removal. Field handover must identify the asset, serial, custody, location and condition. Reconcile late, early or disputed stops, invoice credit and collection delays with original rates and evidence.

**Reinstatement.** Compare accepted before/after geotagged surveys, control points and landowner requirements. Check all temporary assets, foundations, buried services, spill/contamination issues, waste records and residual obligations. Identify any authorised retained infrastructure or monitoring period. Route landowner/customer acceptance and handle retained works, defects, final account and retention separately. A land closeout does not imply final payment or that all warranties have ended.

## 9. Commercial configuration and deterministic calculations

Load these proposed defaults as a versioned ETABLIX pricing profile subject to executed terms and model. Keep each as an explicit configuration with calculation base, due-date rule, caps, exclusions and approval. Model 01 uses fee milestones. Model 02 isolates client supplier cash and exposes ETABLIX fee and any separately authorised margin. Model 03 computes matched commitments and receivables.

| Parameter | Starting configuration | Implementation rule |
|---|---|---|
| Management/OH | 20% | Select eligible cost lines and treatment of mobilisation, disbursements, pass-through and tax. Label markup on cost vs margin on revenue explicitly. |
| Contingency | 5% | Risk-linked allowance. Store eligible base and approved release separately from forecast draw and earned revenue. |
| Advance | One month upfront | Store monthly basis, date, recovery/application, and verified receipt. Block Model 03 mobilisation where the executed condition requires cleared funds. |
| Customer payment | 14 days | Configure trigger, calendar and notice terms from contract. Do not assume invoice date is always the trigger. |
| Supplier payment | 30 days post-invoice starting assumption | Configure contract/statutory dates and invoice validation rules. Track actual due date and notices separately. |
| Retention | 5% | Configure base, cap, maturity, first and final release events and direction. Apply only where contracted. |

Payment and tax handling are line and contract specific. Qualify applicable construction-payment rules and contractual dates independently of terms above. Validate CIS and VAT domestic reverse charge treatment by scope and parties. Mixed activities, plant hire arrangements and end-user status can change treatment. Unknown tax treatment creates a review task and blocks financial publication where material. [R8–R10]

**Worked pricing fixture (ex VAT).** Direct monthly cost £100,000. Apply management markup 20% on eligible direct cost = £20,000. Illustrative contract allowance 5% on direct cost = £5,000. Budget envelope £125,000. Contract baseline £120,000 plus £5,000 separately controlled allowance for this fixture. Before agreed use of contingency, invoice baseline is £120,000 subject to measured service. If the test contract applies 5% retention to the full £120,000 valuation, amount before VAT and other adjustments is **£114,000**. One-month advance is **£120,000** only if the contract defines that basis. Record its later recovery separately. A £20,000 markup represents 16.67% of £120,000 revenue before additional overhead, risk and tax. Never report it as 20% margin.

**Cash and cost.** Compute receipts, supplier outflows, advance and recovery, accrued hire, disputed changes, retention, bank reconciliation and tax by actual expected date. Model weather delays, supplier deposits, late receipts, invoice disputes, longer hire and failed collection. Prevent double-counting of accruals and commitments. An existing risk draw transfers allowance into the forecast cost line without adding it twice. Keep controlled budget, estimate at completion, expected contribution and funding peak separate. For Model 03 block binding activity if authorised headroom cannot absorb committed and reserved spend. Reserve limits transactionally.

**Earned value.** Pin time-phased performance baseline by package. Earn EV on accepted measurable milestones or units for deliverables such as pads, installations and accepted system turnover. Use level-of-effort only where approved, identified and reported separately from discrete performance. Define PV, EV and AC, CPI = EV/AC and SPI = EV/PV with undefined denominator handling. Client-certified value, payable invoice and EV are separate. For a fixture with PV £60k, EV £48k and AC £55k, CPI = 0.8727 and SPI = 0.8. No earned credit for unaccepted work unless the baseline defines a separate verified milestone.

**Valuation matching.** Match invoice to contract, approved schedule/rate, quantity, period, accepted work or service, advance/retention, tax, previous certificate and credits. Preserve time bars even where a dispute is ongoing. Keep supplier award, variation, commercial notice, payment certificate and payment dispatch as separate authorisations. ERP connector verifies dispatch and reconciliation. Never infer payment from a generated invoice.

## 10. Architecture and persistence

Reference stack: modular TypeScript API/web application, Python file and engineering workers, PostgreSQL, object storage and durable workflows such as Temporal. Use a separate policy/command boundary, secrets broker, queue and transactional outbox. Keep source integrations replaceable. Durable workers handle time bars, on-call escalation and hire clocks through model downtime. Production deployment, hosting and SLA choices need project configuration.

| Component | Responsibility |
|---|---|
| Evidence | Immutable source, hash, parser and origin, pinned version, source timestamp/time zone, locator, scope, ACL, signer and verification |
| Orchestration | Agent ownership, task DAGs, timers, waits, event replay, retries, cancellation and escalation |
| Rules and actions | Deterministic gate policy, delegation checks, segregation, aggregate versions, holds, command and outbox |
| Calculation | Exact decimal money, unit-aware capacity, CPM and windows, supplier normalisation, EVM and cash |
| Connectors | CDE/BIM/GIS, programme, CRM/tender, procurement/ERP, sensors, helpdesk and identity, scoped receipt reconciliation |
| UI | Evidence trace, decision inbox, project/SBS, mobilisation, operations, commercials, demob and portfolio |

Data model uses tenant and project foreign key scoping, stable user-facing codes with UUID internal IDs, immutable revisions and server-derived actors. Money stores decimals, currency, tax basis and rounding. Dates use UTC instants with source zone and project calendars. Separate raw telemetry from verified domain events.

| Aggregate | Core fields |
|---|---|
| Project / Appointment | Jurisdiction/sector, appointment model, customer, legal entities, boundaries, authorities, client programme, contracts and cutover |
| Scope / Phase / Requirement | Service/SBS, location, demand/scenario, criterion, evidence, phase, acceptance, interfaces, source version |
| Design / Interface / Consent | Current revision, checks, dependencies, approvals, expiry, jurisdiction, conditions, authorised decision |
| Supplier / Package / Offer | Scope, price basis, commercial model, supplier eligibility, lead, limits, certificates, title, delivery and liability |
| Asset / HireAgreement / Condition | Serial/QR, owner, charge rule, on/off-hire events, custody, location, inspections, condition and return |
| Plan / WorkOrder / SLAEvent | Windows, dependent work, service population, schedule, clock, field evidence, severity and result |
| Inspection / Test / Incident | Criterion, configuration, observation, verification, authority, scope, issue and closure |
| Valuation / Invoice / Payment / Change | Contract version, exposure, notices, due dates, lines, tax, retention, cash, approvals and receipts |
| Gate / Hold / Decision / Delegation | Action, project/scope, evidence snapshot, policy, authority, limits, expiry, reason and decision |
| Task / Command / Audit / Dispatch | Agent owner, typed request, causation, policy, versions, idempotency, action, result and external receipts |

Migrate existing data with stable source ID mappings, explicit field provenance, dry-run reports and verified current baselines. Backfill only evidenced statuses. Unknown signer, invalid date or unavailable attachment must remain visibly unverified. Keep legacy seven-family tags and derive canonical service codes via mapping table with review of ambiguous packages.

## 11. State machines, API and events

Gate: DRAFT → EVIDENCE_PENDING → EVALUATING → HOLD / READY_FOR_DECISION / PASSED / PASSED_BOUNDED. Material changes → STALE → new evaluation. Decision: REQUESTED → APPROVED / APPROVED_BOUNDED / REJECTED / EXPIRED / SUPERSEDED. Dispatch: PENDING → SENT_UNCONFIRMED → RECEIPT_VERIFIED, with UNKNOWN_OUTCOME, REJECTED and CANCELLED branches. Task: QUEUED → RUNNING → SUCCEEDED / WAITING_INPUT / WAITING_AUTHORITY / BLOCKED / FAILED_RETRYABLE / FAILED_TERMINAL / CANCELLED. Retrying a task uses the same idempotency identity where applicable. Rework creates a linked new task.

Core rules check actor capability, appointment model, effective contract, scope, prerequisite revisions, current evidence, dependent services, cumulative financial limits and reserved authority. Unknown jurisdiction, expired evidence or contradictory critical records fail closed for the affected action. Record accepted or rejected commands and snapshot inputs. Commit material revocations or scope holds synchronously with their causal state change. Use reverse dependencies to propagate derived stale states. Revalidate just before outbound dispatch with a per-scope dispatch fence. If external effect occurred before revocation, preserve it, pause future affected actions and start remediation.

| API path | Minimum operation |
|---|---|
| POST /v1/projects | Create profile, model, authorities and W01 workflow |
| POST /v1/projects/{id}/evidence | Upload/register source revision with scope and verification status |
| POST /v1/projects/{id}/commands | Typed domain action or authority request |
| POST /v1/projects/{id}/decisions/{id}/responses | Authenticated response to exact decision manifest |
| POST /v1/projects/{id}/connectors/{id}/events | Signed inbound event/receipt with replay protection |
| GET /v1/projects/{id}/workflows/{id} | Owner, prerequisites, status, history, next action and timers |
| GET /v1/projects/{id}/trace/{id} | ACL-filtered provenance and dependency graph |
| GET /v1/projects/{id}/commercial/forecast | Current cost/valuation/cash snapshot and assumptions |

Writes use Idempotency-Key and existing aggregate writes require expectedVersion or If-Match. Same key and payload returns original outcome. Changed payload or stale aggregate version returns 409. Use 403 for denied access, 422 for invalid schema or unsupported command and 202 for an asynchronous action/decision with a status resource. A policy hold returns a recorded command outcome with reason and remediation link. Never take tenant, actor role or approval authority from untrusted payload.

```json
{
  "schemaVersion": 1,
  "type": "REQUEST_OFF_HIRE",
  "workflowId": "wf-demo-09",
  "target": {"type": "HIRE_AGREEMENT", "id": "hire-cabin-17", "expectedVersion": 8},
  "scope": {"phaseId": "phase-a", "assetId": "cabin-17"},
  "requestedEffectiveAt": "2026-11-20T12:00:00Z",
  "evidenceRevisionIds": ["ev-asset-state-8", "ev-fire-dependencies-4"],
  "correlationId": "corr-off-hire-17"
}
```

```json
{
  "schemaVersion": 1,
  "eventId": "evt-hire-cabin-17-09",
  "type": "OffHireBlocked",
  "tenantId": "demo-tenant",
  "projectId": "skye-pilot",
  "aggregateType": "HIRE_AGREEMENT",
  "aggregateId": "hire-cabin-17",
  "aggregateVersion": 9,
  "occurredAt": "2026-11-08T16:00:00Z",
  "actor": {"type": "SERVICE", "id": "etablix-policy"},
  "correlationId": "corr-off-hire-17",
  "causationId": "cmd-off-hire-17",
  "data": {"reason": "LIVE_DEPENDENCY", "blockingSystemId": "fire-loop-b"}
}
```

Core event set includes ProjectCreated, AppointmentApproved, ModelCutoverRequested, EvidenceVerified, EvidenceSuperseded, BriefAccepted, CapacityShortfallDetected, TenderAddendumReceived, SupplierEligibilityExpired, AwardAuthorised, DeliveryReceived, SiteReleaseBlocked, ServiceAccepted, SLAClockStarted, IncidentEscalated, ValuationRecommended, NoticeReceiptVerified, DispatchOutcomeUnknown, OffHireBlocked, OffHireEffective, AssetReturned, ReinstatementAccepted and DecisionRevoked. Deduplicate by event ID and per aggregate version. Persist state/outbox atomically, consume at least once and use destination idempotency where available. A timed-out order or notice can have been received. Record UNKNOWN_OUTCOME and reconcile before retrying. Keep a manual service route under authority and surface the deadline while unresolved.

## 12. Interfaces, security and operations

| Surface / connector | Minimum scope |
|---|---|
| Project control room | Current service capacity, sites and phases, Now/Next/Why, agent owner, constraints, latest decision, escalation and verified progress |
| Supplier and client portal | Role-scoped packages, upload and quote, evidence expiry, deliveries, commercial recommendations, disputed items and verified acceptances |
| Mobilisation and field view | Mobile-capable map and workface, exact revision, permitted task, hold, inspection, time and offline evidence sync. An offline record cannot release a live critical hold without server validation. |
| Live operations | Occupancy and zone capacity, duty roster, tickets, incidents, on-call queues, timers, evidence health and service-level trends |
| Commercial control | Contract parties, remaining hire, PV/EV/AC, revenue and cost, advance, retention, forecast cash, change, notices and payment reconciliation |
| Demob control | Live dependency map, off-hire notice, collection, damage, cost stop, before/after evidence and acceptance |
| Systems integration | Document/model/GIS via CDE, schedule via approved exchange/API, ERP/CRM and hire supplier via authorised adapters, telemetry read-only, attendance and task evidence scoped by privacy policy |

Bind every external event to project, scope, origin, freshness and verification. Keep transport status and legal effectiveness distinct. Expose uncertainty visibly. Any configured publication to CONSTRUX.AI uses a documented adapter that maps parent project, WBS, milestones, interfaces and evidence references. The ETABLIX ledger and agent workflows also operate independently when that connector is unavailable. Maintain source-of-truth mapping for customer and ETABLIX records and never overwrite an accepted customer baseline from a forecast.

Protect tenancy and supplier confidentiality on queries, indexes, dashboards, prompts and outbound tools. Least privilege and short-lived connector credentials, webhook authentication and replays, audit, retention policy, legal hold and tested restore are required. Treat document, note and telemetry text as untrusted data. Authorise commands independently from model output. Store minimal workforce data, avoid exporting raw gate or health data and separate accommodation, security and clinical access. Store medical-service availability and incident referral status by default. Clinical records and autonomous decisions on workers are outside the pilot. Use appropriately scoped analysis for access, welfare and operations. [R13, R14]

Implement project-, action-, connector- and model-level pauses. Continue timer and observation processing where safe. Stop A2/A3 dispatch if policy or authority data cannot be verified. Keep alerts and wait states durable while models are unavailable. Show UNKNOWN_OUTCOME for unresolved effects. Proposed pilot targets are P95 under 30 seconds for internal event-to-task and first critical timer event within 60 seconds under agreed test load. Establish operational escalation routes independently of these software targets.

## 13. Project rules and release example

**Jurisdiction profiles.** Maintain effective-dated legal and owner packs with reference, decision owner and review date. Scotland and England have separate planning/building and environmental routes. On Skye, determine building standards and warrant applicability with the relevant verifier and map use classification and fire requirements, especially if the compound includes sleeping accommodation. Record the actual activity and applicable SEPA authorisation or rule. England environment guidance cannot discharge a Scottish prerequisite. For applicable public-sector procurement, select by contracting authority, framework and transition profile, in addition to site location. Food, SIA, road transport, public highways and client access checks are package-specific and configured only after confirming the applicable authority and scope. [R5, R6, R11, R12]

**Seed policy OFF-01 through OFF-06.** Implement in this order for a proposed asset removal or off-hire notice that entails withdrawal of service. Compute contract notice deadlines and retain the escalation even if the work is held. A separate prospective notice that does not authorise withdrawal may follow its own verified contract rules.

| Rule | Pass criteria | Failure action |
|---|---|---|
| OFF-01 | Agent capability, model, entity, hire agreement and serial scope match | SCOPE_MISMATCH or AUTHORITY_MISSING |
| OFF-02 | Read current dependency graph and actual demand through proposed withdrawal | LIVE_DEPENDENCY or EVIDENCE_MISSING. Create continuity case. |
| OFF-03 | Replacement coverage or approved release is verified. Applicable disconnection, collection and safety decisions apply at their respective gates. | SAFETY_HOLD or REPLACEMENT_NOT_ACCEPTED |
| OFF-04 | Off-hire clause, dates, authorised recipient/channel and charge stop rule are pinned | CLOCK_UNVERIFIED or CONTRACT_TERM_UNKNOWN |
| OFF-05 | Exact reserved authority and commercial consequences are accepted | READY_FOR_DECISION |
| OFF-06 | Before dispatch, recheck graph, authority, evidence, payload and applicable hold. Verify receipt or contract trigger after dispatch. | REVALIDATION_REQUIRED or RECEIPT_UNCONFIRMED |

**Skye scenario.** Cabin 17 is empty and removing it saves hire. Its panel still serves Phase B's live fire loop. The agent blocks withdrawal, alerts site and commercial owners, schedules replacement or approved rerouting, retains accrual and flags the latest contract notice date. When competent and customer evidence establishes continuity, request fresh approval, issue through the approved route and reconcile the effective commercial stop. Separately record safe disconnection, collection, return, damage checks and reinstatement. Keep Phase B live throughout.

## 14. Acceptance tests

Seed test projects with verified contract/profile versions, fake clocks, connector receipts and controlled evidence. Test side effects and replay, including negative paths.

| ID | Input or event | Required result |
|---|---|---|
| AT-01 | Create three otherwise identical appointments | Correct scope, buyer, liability, approval, invoice and permissions by model |
| AT-02 | Advisory agent attempts supplier award | Block action and preserve customer recommendation path |
| AT-03 | Integrator has fee authority and ERP suggests ETABLIX PO | Prevent ETABLIX commitment; preserve customer-name package and payment recommendation |
| AT-04 | Prime Service Contractor label exists and CDM appointment is unknown | Agent routes applicability/authority gap without assuming the statutory role |
| AT-05 | Change model with an open hire contract and no assignment | Original liability and notice clock stay with the original party |
| AT-06 | Model 03 binding order exceeds headroom or concurrent commands exceed cap | Transactionally block excess and escalate funding review |
| AT-07 | 72 + 50 + 8 distinct concurrent at Skye | Calculate 130; preserve nominal 100 and applicability discrepancy |
| AT-08 | 130 people × 40 L/day, 10 m³ usable with 2 m³ reserve | 5.2 m³/day; ~46.15 hours gross and ~36.92 hours before reserve under the simulation assumptions |
| AT-09 | New overnight use added to day-use cabin brief | Separate beds, demand, fire, access and permissions. Hold overnight opening until verified. |
| AT-10 | Supplier quote excludes transport and connection | Show unpriced/quantified omissions and common-scope comparison. Do not assume zero. |
| AT-11 | Vendor eligibility or relevant insurance expires after approval and before dispatch | Block superseded release and reroute; unaffected packages continue |
| AT-12 | Site cabin delivered but ground/lift evidence is missing | Record asset receipt; prevent lift/installation release |
| AT-13 | Water and alarms failed while cabins installed | Compound opening remains blocked for affected scope; retest records are separate |
| AT-14 | Request direct energisation, gate bypass or isolation from chat or uploaded note | Deny control action and route approved field-authority workflow |
| AT-15 | Stale wastewater sensor or contradictory observations | Raise verification and continuity actions with the SLA state accurately classified |
| AT-16 | Critical wastewater alarm credible and contract allows emergency callout | Issue eligible bounded callout once; retain authority and restoration workflow |
| AT-17 | £100k direct, 20% markup, 5% direct contingency, 5% retention on £120k | £125k envelope, £120k valuation basis, £114k before VAT/other adjustments, allowance remains separately controlled |
| AT-18 | PV £60k, EV £48k, AC £55k | SPI 0.8 and CPI approximately 0.8727. Invoiced/certified value remains separate. |
| AT-19 | Unknown mixed-service CIS or VAT treatment | Hold affected financial publication and route a scoped review |
| AT-20 | Cabin 17 supports Phase B's fire loop | Hold withdrawal/removal. Track commercial notice deadline and continuing hire. |
| AT-21 | Off-hire sent with no verified effective stop | Preserve running accrual or disputed status per terms; reconcile receipt before closing charges |
| AT-22 | Collection complete and land condition rejected | Record return; keep reinstatement, residual liabilities and retention separately open |
| AT-23 | Contract notice times out and model service goes down | UNKNOWN_OUTCOME, durable deadline and no blind resend |
| AT-24 | Supplier PDF attempts to instruct agent to email all quotes | No unauthorised access or egress. Preserve evidence and event. |
| AT-25 | Import existing package without verified approval or known legacy mapping | Preserve IDs; leave ambiguous classification or approval unverified |
| AT-26 | Apply England dewatering evidence on Scottish Skye project | Keep relevant Scottish prerequisite unresolved and route correct profile |
| AT-27 | Publish accepted availability to CONSTRUX.AI while connector unavailable | ETABLIX stays operational; outbound intent reconciles when connector returns |
| AT-28 | Replay duplicate telemetry, invoice or hire collection message | Apply effect once, do not overwrite newer revision and audit divergent duplicates |

## 15. Build increments and definition of done

| Increment | Build | Exit criteria |
|---|---|---|
| 1 · Control kernel and vertical slice | Appointment policy, identity, evidence/version, durable tasks/timers, decisions, outbox, off-hire dependency graph and mock hire connector | Demonstrate Cabin 17 end-to-end: detect dependency, hold, collect authority, send exact notice and reconcile once |
| 2 · Preconstruction and procurement | W01–W04, diagnostic, catalogue, sizing, site interfaces, quotes and normalisation, awards and model-specific cash | All models work end-to-end, including wrong-buyer prevention and unpriced interface detection |
| 3 · Mobilisation and operations | W05–W07, release gates, commissioning, field evidence, on-call, SLA, sensors and work orders | Installed-to-open journey, outage response and safety holds pass, including offline and model failure tests |
| 4 · Commercial, demob and portfolio | W08–W10, valuation, EVM, cash, tax controls, phased off-hire, reinstatement, portfolio and CONSTRUX adapter | End-to-end Skye handover and all acceptance tests, cross-project ACL and connector replay pass |

Start with read-only shadow operation on the pilot using source documents and field records. Enable reversible writes before tightly delegated external dispatch. A capability is complete when there is an agent owner, enforceable authority rule, traceable data, verified normal path, negative path and recovery path, operational owner and written runbook. Implementation deliverables are versioned API/JSON schemas, migrations, workflow definitions, rules, fixtures, test suite, observability, deployment configuration and operator runbooks. The current deliverable is the specification.

## 16. Verified references and source baseline

The internal ETABLIX v1.0 module informs the appointment and operational model. The CONSTRUX.AI Tier 1 specification informs the agent, authority, evidence and orchestration patterns. The following references inform profile configuration. Each project's appointed team verifies applicability and the effective version before publishing project rules.

- **R1.** CDM, statutory role and welfare. [CDM 2015](https://www.legislation.gov.uk/uksi/2015/51/contents) · [HSE principal contractor](https://www.hse.gov.uk/construction/cdm/2015/principal-contractors.htm) · [HSE welfare](https://www.hse.gov.uk/construction/healthrisks/welfare/)
- **R2.** Temporary works controls and management. [HSE temporary works](https://www.hse.gov.uk/construction/safetytopics/temporary-works.htm)
- **R3.** Construction-site electrical safety. [HSE HSG141](https://www.hse.gov.uk/pubns/books/hsg141.htm)
- **R4.** Competent planning and lifting operations. [HSE lifting](https://www.hse.gov.uk/work-equipment-machinery/planning-organising-lifting-operations.htm)
- **R5.** England Environment Agency temporary dewatering example and conditions. [RPS 261](https://www.gov.uk/government/publications/temporary-dewatering-from-excavations-to-surface-water-rps-261/temporary-dewatering-from-excavations-to-surface-water-rps-261)
- **R6.** Scotland construction runoff activity. [SEPA construction site run-off](https://beta.sepa.scot/regulation/authorisations-and-compliance/easr-authorisations/water-activities/discharges/water-run-off/construction-site-run-off/)
- **R7.** Waste duty of care and movement evidence. [Environmental Protection Act 1990, Part II](https://www.legislation.gov.uk/ukpga/1990/43/part/II) · [Waste transfer notes guidance](https://www.gov.uk/dispose-business-commercial-waste/waste-transfer-notes)
- **R8.** Construction contract payment notice provisions where applicable. [1996 Act Part II](https://www.legislation.gov.uk/ukpga/1996/53/part/II)
- **R9.** CIS classification illustration for plant hire. [HMRC CISR14260](https://www.gov.uk/hmrc-internal-manuals/construction-industry-scheme-reform/cisr14260)
- **R10.** VAT domestic reverse charge and applicability. [HMRC technical guide](https://www.gov.uk/guidance/vat-domestic-reverse-charge-technical-guide)
- **R11.** Scotland building standards and fire guidance. [Procedural handbook](https://www.gov.scot/publications/building-standards-procedural-handbook-third-edition-version-1-9/pages/2/) · [Scottish fire safety guidance](https://www.gov.scot/collections/fire-safety-guidance/)
- **R12.** Public procurement jurisdiction and transition. [Devolved contracting authorities](https://www.gov.uk/government/publications/procurement-act-2023-guidance-documents-plan-phase/guidance-devolved-contracting-authorities-html) · [Transitional guidance](https://www.gov.uk/government/publications/procurement-act-2023-guidance-documents-plan-phase/guidance-transitional-and-saving-arrangements-html)
- **R13.** Secure AI engineering. [NCSC secure AI development guidelines](https://www.ncsc.gov.uk/collection/guidelines-secure-ai-system-development)
- **R14.** Data protection and automated decision-making safeguards. [ICO DUAA data protection summary](https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-duaa-summary-of-the-changes/data-protection/)
