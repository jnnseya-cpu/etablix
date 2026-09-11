# The agentic project operating system — the architecture, and where we are

**Held as the governing architecture for the AI-agent workforce.**
Merged into `backend/lib/organisation.js` as data, so the portal shows one
structure and `backend/test/architecture.test.mjs` can check that nothing here
claims an agent that cannot actually be run.

---

## Executive conclusion

AI agents can become exceptionally deep across end-to-end construction and
project management — but they should not be designed as digital assistants
that merely answer questions or draft documents.

The strongest model is an **agentic project operating system** in which
specialist agents continuously:

1. understand the contract and employer's requirements;
2. structure the scope;
3. develop and challenge the bid;
4. create the baseline;
5. monitor live delivery evidence;
6. detect deviation;
7. quantify time, cost, risk and contractual consequences;
8. initiate controlled workflows;
9. produce decision-ready recommendations;
10. learn from the final outcome.

With high-quality integrations and disciplined project data, AI agents could
realistically automate or materially accelerate:

- **75–90%** of tender administration and first-draft production
- **60–80%** of routine project-control work
- **50–70%** of commercial administration
- **60–85%** of reporting, evidence classification and document control
- **40–60%** of planning analysis and recovery-option development
- **20–40%** of safety administration — but not safety accountability
- **10–30%** of final commercial, contractual, technical and safety decisions

The critical distinction:

> AI may perform most of the information work, but accountable people must
> retain control of irreversible decisions.

The opportunity is not "one AI project manager". It is a **coordinated digital
delivery organisation** made up of specialised agents operating on a shared,
auditable project state.

---

## 1. How deep can AI agents genuinely go?

Six practical depths, held in code as `DEPTH_LEVELS`.

| Level | AI behaviour | Construction example |
|---|---|---|
| 1. Retrieval | Finds and explains information | "Show all clauses governing delay notices." |
| 2. Production | Creates a requested output | Draft method statement, programme narrative or tender response |
| 3. Analysis | Compares evidence and identifies issues | Detect discrepancy between bill, drawings and specification |
| 4. Workflow execution | Performs several controlled actions | Create RFI, assign owner, set deadline, monitor response |
| 5. Autonomous coordination | Pursues an objective across systems | Investigate slippage, obtain evidence, propose recovery |
| 6. Governed operational autonomy | Executes approved low-risk decisions | Issue reminders, update forecasts, release approved information |

Most construction software remains between levels 1 and 2.

**Where we actually are.** Routinely at 3 and 4. Nothing at 5 or 6, and
nothing will be until the reliability that earns it is demonstrated rather
than asserted. The per-agent level is in `ENGINES`.

### The real ceiling

An agent can become extremely good at reading, cross-referencing,
calculating, monitoring, checking completeness, tracing causation, drafting,
forecasting, coordinating, escalating and preserving evidence.

It remains fundamentally limited where success requires physical inspection
that has not been digitally captured, professional engineering judgement,
subjective negotiation, leadership under uncertainty, statutory appointments,
acceptance of legal liability, safety-critical intervention, commercial
authority to commit money, or signing certificates and binding contractual
communications.

Under CDM 2015 the principal contractor must possess the necessary skills,
knowledge, experience and organisational capability, and must plan, manage,
monitor and coordinate the construction phase. An AI system can support those
duties. It cannot inherit the appointment or the accountability.
[HSE — principal contractor responsibilities](https://www.hse.gov.uk/construction/cdm/2015/principal-contractors.htm)

---

## 2. End-to-end coverage, stage by stage

### Stage 1 — Opportunity discovery and bid/no-bid

Monitor portals, frameworks and target clients; classify by geography,
sector, value, scope and contract; compare requirements against capability;
examine previous wins, losses and margins; identify mandatory pass/fail
criteria; assess capacity and conflicting commitments; identify partners
required; estimate bid cost and probability of winning.

Score it structurally:

```
Expected bid value
  = P(win) × risk-adjusted contribution
  − bid cost
  − capacity opportunity cost
```

The improvement that matters: do not score only likelihood of winning. **A
dangerous project may be winnable and commercially undesirable.**

Output one of: pursue, pursue conditionally, partner, seek clarification,
decline — each showing evidence, assumptions, unresolved risks and a
sensitivity range.

### Stage 2 — Tender ingestion and requirement decomposition

Not a summary of PDFs. A structured tender model, extracting and connecting
instructions to tenderers, employer's requirements, specifications, drawings
and revisions, bills and schedules, contract conditions and amendments,
programme constraints, site information, surveys, pricing templates, quality
questions, social-value requirements, bonds and insurance, and submission
rules.

Then a **Requirements Compliance Matrix**, which becomes the bid's control
spine:

| Field | Purpose |
|---|---|
| Requirement | Exact obligation or requested response |
| Source | Document, clause, page, drawing or schedule |
| Classification | Technical, commercial, legal, safety, programme |
| Mandatory status | Pass/fail, scored, informative |
| Owner | Responsible bidder or department |
| Evidence required | Certificate, method, CV, calculation, price |
| Status | Missing, in progress, complete, challenged |
| Conflict status | Contradiction or ambiguity detected |
| Submission destination | Form, portal field, schedule or attachment |
| Confidence | Extraction and interpretation confidence |

**Built.** Agent 2 produces exactly this, with a verbatim quote of the source
line on every row and a machine gate that refuses an incomplete submission.

### Stage 3 — Scope intelligence and design coordination

Decompose employer's requirements into systems, assets, work packages,
locations, disciplines, deliverables, temporary works, testing requirements,
interfaces, exclusions and assumptions.

Compare drawing against drawing, drawing against specification, specification
against bill, bill against programme, design requirements against method, and
site constraints against planned resources.

Valuable findings: an item on drawings and absent from the bill; testing
required by specification and missing from the programme; temporary works
assumed and not priced; access incompatible with the proposed plant; a
long-lead item scheduled after its required-on-site date; different
quantities across model, drawing and pricing schedule.

**Never silently resolve these.** Turn them into clarification questions, bid
assumptions, pricing qualifications, design risks, provisional allowances or
interface responsibilities.

**Partly built.** Agent 8 and Agent 9 do the decomposition; Agent 3 now
maintains the interfaces as a living register. Nothing yet compares a drawing
with a model.

### Stage 4 — Estimating and commercial bid development

Build quantities and rates from bills, BIM objects, drawings, historic
projects, supplier quotations, labour constants, plant outputs, location
factors, escalation, logistics, duration and risk allowance — preserving the
anatomy of every price:

```
Tender price = direct cost + preliminaries + temporary works
             + risk allowance + overhead + profit + tax or duties
```

Every number needs lineage: source, date, currency, location, quantity basis,
productivity assumption, quotation validity, exclusions, escalation basis,
confidence, human approval.

**The agent must challenge the bid**, searching for double counting, missing
scope, arithmetic inconsistency, optimistic productivity, expired quotations,
insufficient supervision, mismatched currencies, unpriced interfaces,
misapplied mark-ups, cash-flow exposure, negative working-capital periods,
retention and bond cost, uncapped liability, delay damages and
design-development exposure. Then run the expected, optimistic, P80, delayed
mobilisation, supplier inflation, low productivity, accelerated and
client-payment-delay cases.

**Not built, and deliberately not next.** An estimating agent must not exist
before lineage does. An automated price nobody can defend is worse than a
slow one.

### Stage 5 — Contract and risk intelligence

Convert the contract from a static document into an executable obligation
model. Each obligation a controlled object: responsible party, trigger event,
required action, notice period, **time bar**, communication method, approval
requirement, evidence, consequence of non-compliance, current status.

Monitor late information, instructed change, restricted access, differing
site conditions, delayed possession, non-conforming work, employer
prevention, subcontractor default, force majeure and testing failure.

On an event: what happened, which evidence supports it, which clauses may
apply, whether notice is required, the deadline, the likely time and cost
effect, what evidence is missing, who must approve the communication.

It may draft notices. **Binding contractual communications pass an authorised
commercial gate.**

**Barely built.** Payment law only. The time bar is the reason to build this:
a right lost to a deadline is lost completely, and nothing watches one.

### Stage 6 — Programme generation and challenge

Generating a programme is the easy part. The deeper capability is
interrogation: open-ended activities, excessive constraints, missing
predecessors or successors, impossible sequencing, procurement disconnected
from installation, design disconnected from approvals, inadequate
commissioning logic, hidden negative float, unrealistic calendars, resource
over-allocation, unsupported productivity, excessive critical-path
sensitivity.

Model the baseline, tender, contract, look-ahead, update, recovery, what-if
and time-impact cases.

### Stage 7 — Tender production and submission control

Compose the submission — but not persuasive text. **Every claim backed by a
verified evidence object.** "We achieved 98% on-time delivery" requires an
approved source before it may enter a submission.

Before submission, validate every mandatory field, filename convention, page
limit, word limit, format, signature, pricing reconciliation, contradictory
answer, expired certificate, unapproved assumption, portal completeness and
upload confirmation. **This is where AI prevents expensive administrative
disqualification.**

---

## 3. From winning the bid to delivering it

The bid must not die as a collection of PDFs. On award, convert approved bid
objects directly into the delivery baseline:

| Bid object | Delivery object |
|---|---|
| Tender programme | Contract baseline programme |
| Bid risk | Live project risk |
| Price build-up | Cost budget and control account |
| Assumption | Validation or change trigger |
| Qualification | Contract reconciliation item |
| Supplier quotation | Procurement package |
| Method statement | Controlled delivery method |
| Employer requirement | Compliance obligation |
| Promised KPI | Performance commitment |
| Resource plan | Mobilisation demand |
| Cash-flow model | Project cash baseline |

**This continuity is the strongest potential competitive advantage.** The UK
Construction Playbook treats assessment, procurement and delivery as
connected concerns.
[UK Government Construction Playbook](https://www.gov.uk/government/publications/the-construction-playbook)

---

## 4. Live construction-stage agents

**Project Controls.** Continuously reconciles baseline against actual, planned
against earned, cost incurred against value earned, forecast against budget,
labour planned against deployed, quantities planned against installed,
procurement required against delivered, risk allowance against exposure —
generating an event when tolerances break rather than waiting for a monthly
report. *Built as Agent 5.*

**Field Evidence.** Converts diaries, voice notes, photographs, video, drone
data, delivery tickets, labour returns, telemetry, weather, inspection forms,
geolocation and timestamps into structured evidence connected to location,
package, activity, asset, contractor, defect, quantity, delay event and
payment item. *Not built.*

**Progress Verification.** Triangulates; never relies on one self-reported
percentage:

```
Verified progress = f(installed quantity, visual evidence,
                      inspection acceptance, labour deployment,
                      materials consumed, programme logic)
```

A contractor reporting 80% while inspections show 50%, materials support 55%
and photographs support 60% should trigger a confidence-weighted challenge.
*Partly built: Agent 5 classes evidence and values what it supports.*

**Change and Variation.** Detects change from instructions, RFIs, drawing
revisions and site events; compares revised scope with the baseline;
identifies affected quantities; reserves rights; opens a change record;
requests substantiation; estimates consequence; monitors determination
deadlines; updates forecast only after approval. *Not built.*

**Payment.** Ingests applications, compares claimed against verified, validates
rates, checks materials on and off site, applies retention, reconciles
previous certificates, identifies disputed items, drafts assessment,
forecasts cash. **Final certification remains with the authorised
professional.** *Built as Agent 5.*

**Procurement.** Generates package scope, identifies suppliers, issues
controlled RFQs, compares like for like, detects exclusions, normalises
currency and terms, prepares recommendation, tracks through to delivery.
**Appointment remains approval-gated.** *Built as Agents 12 and 13.*

**Safety and Compliance.** Reviews RAMS completeness, monitors permit expiry,
identifies training gaps, detects recurring observations, cross-checks method
statements against planned activity, escalates missing inspections. **It must
never be marketed as replacing competent safety professionals or direct site
supervision.** *Not built.*

---

## 5. Commissioning, handover and O&M

The handover agent begins at mobilisation, not at practical completion.

For every asset: required submittals, design approval, installation evidence,
inspection, testing, commissioning, defect closure, training, certification,
warranty, spare parts, operating procedure, asset data, final model status.

A live completeness score that **forecasts whether handover will fail before
the contractual date**.

After completion the same knowledge becomes the operational asset twin:
warranty monitoring, maintenance scheduling, failure prediction, document
retrieval, energy comparison, defect trends, lifecycle cost, replacement
planning. That is how a platform credibly covers concept through thirty-year
operation rather than adding an O&M chatbot.

---

## 6. The agent organisation — seven engines

Not dozens of independent agents competing. Seven domain engines with
controlled sub-agents, held in code as `ENGINES`:

1. **Tender and Commercial** — Opportunity, Diagnostic, Compliance and Bid, Tender pack, Evaluation, Estimating, Submission Controller
2. **Planning and Delivery** — Mobilisation-readiness, Progress and Programme, Programme Generation, Recovery
3. **Resource and Cost** — Commercial and Procurement, Productivity (cost and cash-flow delivered inside Agent 5)
4. **Risk, Safety and Compliance** — Assurance and Evidence, Site Operations, Safety Assurance, Audit
5. **BIM and Digital Twin** — Spatial Coordination and Interface, Model Validation, Quantity, Asset
6. **Contracts and Claims** — Obligation and Requirements, Accommodation Requirements, Obligation Monitor, Notice, Change and Entitlement
7. **Handover and O&M** — Commissioning, Handover, Lifecycle and Asset Information

Every slot is built. Sixteen of them carried an asterisk in earlier revisions
of this document — *planned: described, not implemented, and deliberately
unrunnable* — and the asterisks are gone because the engines behind them
exist, not because the claim was relaxed. `backend/test/architecture.test.mjs`
refuses a slot marked built with no brief behind it, and each slot in
`ENGINES` still carries the text it claimed while it was planned.

**The sixteen are a different shape from the first fourteen, and it is worth
saying why.** In the first fourteen, a model reads documents and writes a
deliverable; five of those then reconcile their own output by machine. In the
sixteen, **the arithmetic is the deliverable** — whether a time bar has
expired, whether a claim was notified inside it, whether a system was balanced
before it was set to work, whether a lifecycle line can be escalated at all.
So the engine runs first and the model writes the report from its findings,
which is the reverse ordering. Their briefs are generated from the engine
registry rather than written by hand, so an agent cannot describe a check its
engine does not run. Each is also reachable without the model at all, because
a time bar needs an answer rather than a report.

**One correction went with the build.** The Obligation Monitor slot claimed
depth 5 — autonomous coordination — while it was planned. What was built
reads the clause graph, builds a register, compares it against the recorded
events and reports what nothing is watching: analysis and controlled
workflow, which is depth 4. It is recorded at 4. Promoting the code while
leaving the depth at 5 would have been exactly the claim the depth ladder
exists to prevent.

Above them one **Project Executive Orchestrator**, which consolidates the
project position, resolves routine cross-engine coordination, and presents
the decisions requiring human authority. **It does not replace the project
director.**

---

## 7. Nine foundations, and where we stand

Held in code as `FOUNDATIONS`, with an honest state on each: structured
project state (partial), event spine (partial), temporal reasoning (absent),
provenance (built), contract awareness (partial), tool execution (partial),
memory (absent), evaluation (partial), permission and approval control
(built).

The `state` column is the build order. An architecture is a list of
foundations; a plan is that list with the truth written next to it.

---

## 8. The autonomy model

Held in code as `AUTONOMY`. The authority attaches to the **action**, not the
agent — because the same agent reads a document and drafts a contractual
notice, and an authority granted to an agent as a whole is an authority
granted to its worst action.

Read, extract, organise: autonomous. Calculate on approved rules: autonomous
with audit log. Draft: autonomous drafting, a person issues. Routine
reminders: autonomous within policy. Update an unapproved forecast: permitted
and labelled. Issue an RFI: human approval first. Issue a contractual notice:
authorised human approval, always. Approve a variation, commit expenditure,
certify payment, change an approved baseline: **human only**. Approve design
or temporary works, close a safety-critical defect: **competent authorised
person only**. Stop work: an agent may urgently recommend and escalate;
formal authority follows the site's arrangements.

**Autonomy increases through demonstrated reliability, not by making the
model more verbally confident.**

---

## 9. Quality targets

Measured on operational results, not response quality. Held as
`QUALITY_TARGETS`.

Bidding: mandatory-requirement recall above 99%; zero unapproved commercial
figures; zero unsupported corporate claims; 100% traceability for material
pricing assumptions; tender reconciliation within tolerance; complete
submission validation before upload.

Delivery: notice-deadline recall above 99%; progress forecast calibration by
package; early-warning precision; falling aged RFIs; falling unrecorded
change; falling payment-assessment cycle time; improving handover
completeness trajectory; measurably reduced manual reporting hours.

**A lower-confidence agent must abstain and escalate rather than invent
certainty.**

---

## 10. The main failure modes

Held as `FAILURE_MODES`, each with whether the system currently avoids it.

The most dangerous error is not hallucinated prose. **It is a plausible but
incorrect action entering the live contractual, commercial or safety
process** — which is why every reconciliation in this system refuses rather
than warns.

NIST's AI Risk Management Framework makes the same point about building
trustworthiness into design, development, use and evaluation rather than
inspecting for it afterwards, and its generative-AI profile addresses risks
specific to generative systems. That governance thinking is directly relevant
here, particularly for critical infrastructure.
[NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)

---

## 11. The assessment

The positioning is not "we have more AI agents". It is:

> **A contract-aware, evidence-driven, multi-agent operating system that
> controls the continuity between tender promise, delivery reality and asset
> performance.**

Every tender requirement becomes a controlled obligation. Every bid
assumption becomes a monitored delivery condition. Every price becomes a live
cost-control basis. Every programme commitment becomes measurable. Every site
event connects to time, cost, risk and contract. Every decision retains
source evidence and approval history. Every installed asset becomes part of
the operational digital twin.

| Area | Potential depth | Recommended autonomy |
|---|---|---|
| Opportunity qualification | Very high | High |
| Tender compliance | Very high | High |
| Bid drafting | Very high | Medium-high |
| Estimating | High | Medium |
| Contract analysis | High | Medium |
| Programme analysis | High | Medium |
| Procurement administration | High | Medium |
| Progress intelligence | High with field evidence | Medium |
| Change administration | Very high | Medium |
| Commercial approval | Moderate | Low |
| Safety administration | High | Low |
| Engineering approval | Supportive only | Very low |
| Handover control | Very high | High |
| O&M intelligence | Very high | Medium-high |

The achievable destination is roughly **70–85% automation of project
information work** — not 70–85% removal of project professionals.

The human organisation becomes smaller, faster and more controlled, and also
more accountable. Project managers, quantity surveyors, planners, engineers
and safety professionals move away from chasing information and compiling
reports toward judgement, leadership, negotiation, assurance and authorised
decisions.

**AI agents perform the project-control labour; competent humans exercise
project authority.**
