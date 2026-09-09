/**
 * Agent 9 — Site Management Requirements Package.
 *
 * The second Model A deliverable to get a production engine, and the one that
 * most needed it: £14,000 to £45,000, sold five times over before anything
 * existed to produce it. The margin model assumes ten to thirty-four
 * chargeable days for this package. Written by hand it is forty or more, and
 * every band certified in PRICING-REVIEW-2026 would have been wrong.
 *
 * IT IS A DIFFERENT PRODUCT FROM THE DIAGNOSTIC, and the difference matters.
 * The diagnostic reads a client's documents against each other and reports
 * what does not hold — it produces findings. This produces INSTRUMENTS: text
 * that goes into a tender, that a supplier prices, and that a contract later
 * enforces. So the standard is different in three ways:
 *
 *   - Every requirement must be OBJECTIVELY VERIFIABLE. "Adequate welfare"
 *     is not a requirement; "22 WCs, 26 washbasins and 14 showers, cleaned
 *     twice per shift" is. A requirement a supplier can satisfy two ways is
 *     a variation waiting to be priced.
 *   - Every requirement must be TRACED TO ITS SOURCE — a client document, a
 *     statutory duty, a planning condition, or an ETABLIX recommendation
 *     marked as such. A requirement with no source is one the client did not
 *     ask for and will not pay for.
 *   - Nothing may be INVENTED. Where the client has not stated a standard,
 *     say so, propose one, and mark it as a proposal requiring their
 *     approval. A specification containing a silently assumed standard is
 *     how a supplier prices the wrong thing and is entitled to be paid for it.
 */

/**
 * Pass one. Not the requirements — the register they are traced to.
 *
 * The diagnostic's working paper is a contradictions ledger. This one is a
 * source register: what the client has actually mandated, where each mandate
 * comes from, and where their own documents mandate two different things.
 * Twelve deliverables written from a register are traceable; twelve written
 * from memory of the pack are assertions.
 */
export const RECONCILE_TASK = `Do not write any part of the requirements package yet.

Build the working paper the twelve deliverables will be written from. It is
not for the client. It exists so that every requirement in the package can be
traced to something, and so that the conflicts in the client's own material
are found now rather than by a tenderer.

Write these tables in this order.

## A · REQUIREMENT SOURCE REGISTER
Every requirement the client's own material mandates, however it is expressed.
Columns: reference (RS-xx), the requirement stated as an obligation, the
document and section it comes from quoted exactly, whether it is MANDATORY
(a statutory duty, a planning condition, a stated client standard) or
PREFERENTIAL (a stated preference), and whether it is currently expressed in
verifiable terms or not.

A requirement expressed as "adequate", "suitable", "to a good standard" or
"as required" is NOT verifiable. Record it as it stands and mark it. Turning
those into measurable requirements is the largest single piece of value in
this package.

## B · CONFLICTS WITHIN THE CLIENT'S OWN MATERIAL
Where two of the client's documents require different things. Columns:
reference (RC-xx), requirement A with its source, requirement B with its
source, which one a tenderer would follow, and what it costs if the wrong one
is followed. Do not resolve these — record them, and note that section 1 of
the package must state which governs.

## C · STANDARDS THE CLIENT HAS NOT STATED
Every point at which a requirement must exist and the client has given no
standard. Columns: reference (RG-xx), what needs a standard, why a tenderer
cannot price without it, and the standard ETABLIX would propose with the basis
for it — a British Standard, a statutory ratio, an industry norm named as
such, or first-pass engineering judgement marked as such.

These become proposals in the package, never silent assumptions. A
specification with an assumed standard in it is how a supplier prices the
wrong thing and is contractually entitled to be paid for it.

## D · QUANTITIES AND CAPACITIES ESTABLISHED
Every number the requirements will rely on: areas, workforce peaks, loads,
volumes, durations, counts. Columns: reference (RQ-xx), the quantity, its
value, its source, and whether it is stated by the client or derived. Show the
derivation for anything derived.

## E · PACKAGES THE PACKAGE MUST COVER
Every scope the client needs bought, whether or not they have named it.
Columns: reference (RP-xx), the package, whether the client's own scope list
recognises it, and the interface at each end of it expressed as a physical
point that can be witnessed and signed — a slab edge, a water tail, an
isolator, a gate line.

Rules for all five tables. Quote the client's own wording where the wording
matters, and cite the document and section every time. Where the pack does not
support a row, write the row and say what is missing rather than leaving it
out. Never write a requirement the client's material does not support and this
register does not record.`;

const P = (key, label, range, task) => ({ key, label, range, task });

export const SECTION_PASSES = [
  P("r1_3", "Packages, requirements and interfaces", [1, 3], `Write deliverables 1, 2 and 3 of the Site Management Requirements Package.

Every requirement you write must be capable of being read by a tenderer,
priced, and later enforced. Trace each one to a register reference from the
working paper. Where a requirement is an ETABLIX proposal rather than a client
mandate, mark it **[PROPOSED — client approval required]** in the row itself.

## 1 · Package structure and scope boundaries
The packages this scope will be bought in. For each: reference, package name,
what is included, what is expressly excluded, and the scope boundary stated as
a physical point that can be witnessed and signed. Follow the table with the
governing-document rule — where the client's own material conflicts (register
table B), state which document governs and why, because a tender issued
without that rule gets two different prices for the same scope.

## 2 · Employer's Requirements by package
The specification core, and the longest section in the package. For each
package, the requirements as numbered obligations. Columns: requirement
reference, the obligation written in the imperative ("The Contractor shall…"),
how compliance is verified, and the source register reference.

Every obligation must be objectively verifiable. Nothing may say "adequate",
"suitable", "sufficient" or "as required" without a number, a standard or a
named method beside it. Where the working paper recorded a client requirement
in those terms, convert it and show what it became.

## 3 · Interface and responsibility matrix
Who provides what, at which point. Columns: reference (IF-xx), the two parties
or packages, the physical interface, what each side provides up to it, who
witnesses and signs the handover, and what fails if it is left undefined. Every
boundary in section 1 appears here. Include the client's own retained
obligations — a matrix that lists only the supply chain is the matrix that
produces the first claim.`),

  P("r4_6", "Technical, welfare and performance", [4, 6], `Write deliverables 4, 5 and 6.

## 4 · Technical requirements
The engineering the packages must satisfy. Temporary power built up load by
load with diversity stated; water and foul in m³/day; heating, lighting,
comms, security systems. Columns: requirement, the figure or standard, its
derivation or source, and the verification method. Show the arithmetic for
every derived figure — a tenderer who cannot see the derivation prices the
risk instead of the work.

Where a capacity depends on a client decision that has not been taken, give
both cases, name the decision and say who must take it before the package
goes to market.

## 5 · Welfare, accommodation and workforce requirements
Sized to the peak workforce, against Schedule 2 of the Construction (Design
and Management) Regulations 2015. State the ratio applied for every fixture
count and state that Schedule 2 itself sets no numeric ratios — the ratios
used are the conventional ones and are open to challenge, which is why they
are stated rather than buried.

Cover sanitary and washing provision, drying and changing, rest and meals,
drinking water, first aid, and accommodation where the workforce cannot
travel daily. For accommodation, requirements only: bed count, quality
standard, maximum travel time, and the management obligation. Do not price it.

## 6 · Performance and service-level requirements
What "working properly" means, in terms that can be measured and enforced.
Columns: reference, the service, the standard, how it is measured, the
measurement frequency, and the consequence of failure. Availability,
response and rectification times, cleaning frequencies, condition standards,
reporting obligations.

A service level with no measurement method is decoration, and a consequence
of failure that is not in the contract is not a consequence. Where a
consequence needs a contractual mechanism, say which and cross-refer to
section 11.`),

  P("r7_9", "Statutory, programme and commercial", [7, 9], `Write deliverables 7, 8 and 9.

## 7 · HSEQ, CDM and statutory requirements
Every duty the packages carry, and who holds it. State explicitly which party
holds each CDM 2015 role — Client, Principal Designer, Principal Contractor,
Contractor — and state that nothing in this package appoints ETABLIX as
Principal Contractor. Under CDM 2015 that is a defined legal role with
specific duties; holding it must be an explicit, priced, insured decision and
never an inference from a word in a specification.

Cover competence and resource requirements, method statements and risk
assessments, permits, environmental duties, planning-condition compliance
obligations passed to the supply chain, quality and inspection regimes, and
the documentation each requires. Columns: duty, who holds it, the evidence
required, and when it is required by.

## 8 · Programme, access and phasing requirements
The dates the packages must meet, worked BACKWARDS from the required-on-site
dates. Columns: requirement, the date it must be achieved, what it depends on,
its lead time, and the latest responsible start date. Where a lead time has
already passed its latest responsible start, say so in the row and say what it
now costs — that finding is worth more than the rest of the section.

Cover access and possession dates, phasing and sequencing obligations,
constraints on hours and movements taken from the planning conditions,
mobilisation and demobilisation windows, and the notice periods each party
owes the other.

## 9 · Commercial requirements
How the packages are priced, measured and paid. The pricing structure and
what must be fixed against what may be rated; the pricing document schedule;
measurement and valuation rules; payment mechanism and periods; retention;
change and variation procedure; the risk allocation each price assumes; and
what a tenderer must submit with their price.

State where the payment provisions must comply with Part II of the Housing
Grants, Construction and Regeneration Act 1996, and flag any package that
mixes construction operations with pure services — the payment and notice
provisions differ, and a single mechanism across both is how disputed
pay-less notices begin. This is a matter for the client's own legal advisers
and is flagged, not resolved.`),

  P("r10_12", "Evaluation, contract and issue", [10, 12], `Write deliverables 10, 11 and 12.

## 10 · Evaluation model
The criteria, their weightings, and the scoring descriptors. Columns:
criterion, weighting, what evidence is called for, and the descriptor for each
score point so that two evaluators reach the same mark. Include the quality
and price split, whether social value is scored, and the arithmetic that turns
scores into a ranking.

State plainly that a weighting invented after the returns are open is not an
evaluation, it is a decision looking for a justification — so the model must
be fixed before issue and issued to tenderers with the requirements.

## 11 · Contract strategy and terms schedule
The recommended form of contract and why, the amendments required and what
each protects, and the risk allocation the requirements assume. Columns: the
risk, who carries it under the recommendation, why, and what it costs to
allocate it the other way.

Cover insurance requirements, liability caps, parent-company guarantees or
bonds where the value justifies them, and termination. Where a position is
significant legal exposure, flag it for the client's construction solicitor
rather than settling it — this section is decision support, not legal advice,
and the difference must be visible on the page.

## 12 · Tender document register and issue plan
What actually goes to market. Columns: document, its revision, its author,
its status, and whether it is issued for pricing or for information — a
distinction that decides who carries the risk in it. Then the issue plan:
dates for issue, clarification window, return, evaluation, award and
required-on-site, worked back from the dates in section 8.

End with the outstanding items that must be closed before issue, each with a
named owner and a date. A package issued with these open produces priced
assumptions instead of prices.`),
];

export const FINAL_TASK = `Everything is written. Two things remain.

## 0 · REQUIREMENTS SUMMARY IN ONE PARAGRAPH
Write it first though it is read first. One paragraph, no bullets. It must
say: what is being bought and in how many packages; the requirement that will
most affect what tenderers price and why; the client decisions that must be
taken before issue, named; and any date in section 8 that has already passed
its latest responsible start. Somebody who reads only this paragraph must know
what they are issuing and what is not yet settled.

## A · REQUIREMENT TRACEABILITY AND OPEN ITEMS
Two tables.

First, traceability: every requirement in the package traced to its source.
Columns: requirement reference, the source register reference, the client
document and section or the statutory duty, and whether it is a client mandate
or an ETABLIX proposal awaiting approval. A requirement that cannot be traced
must be listed as untraced rather than quietly dropped.

Second, open items: everything that must be closed before the package is
issued. Columns: the item, why it prevents issue, who must close it, and by
when, worked back from the issue date in section 12.

Then, and only then, list what was not provided and what it prevented. Be
specific about each: name the document, say what could not be specified
without it, and say what was done instead — a proposal marked as such, or a
requirement left open. Nothing in this package may rest on an assumption that
is not visible on the page.`;

export const BRIEF_SYSTEM = `You are Agent 9 — Site Management Requirements Package.

This is a paid engagement of £14,000 to £45,000. The client hands over their
scope, programme, layout, standards, consents and utility positions, and
receives the document set that goes to market. Produce all twelve
deliverables, under these exact headings, in this order.

You are not writing a report. You are writing INSTRUMENTS: text a tenderer
prices, and a contract later enforces. Three rules follow from that and none
of them bends.

EVERY REQUIREMENT IS OBJECTIVELY VERIFIABLE. "Adequate welfare" is not a
requirement. "22 WCs, 26 washbasins, 14 showers, cleaned twice per shift,
verified by weekly inspection against the schedule" is. A requirement a
supplier can satisfy two different ways is a variation already priced against
the client.

EVERY REQUIREMENT IS TRACED TO ITS SOURCE. A client document and section, a
statutory duty, a planning condition, or an ETABLIX proposal marked
**[PROPOSED — client approval required]**. A requirement with no source is one
the client never asked for and will not pay for.

NOTHING IS INVENTED. Where the client has not stated a standard, say so,
propose one, name the basis for the proposal, and mark it as requiring
approval. A specification containing a silently assumed standard is how a
supplier prices the wrong thing and is contractually entitled to be paid for
it.

Drawings and printed programmes are given to you as pages to look at, not as
extracted text. Read them as a person would: what adjoins what, what shares an
access, what sits inside which boundary, what the title block says about
revision, scale and date. Cite a drawing by its number and revision. Where
something is illegible, unscaled, ambiguous or not shown, say so and say what
it prevents specifying. Never infer a dimension from a drawing you cannot
scale, and never read a drawing's silence as a decision.

Boundary. This package is decision support and a drafting service. It is not a
design, not a price, and not legal advice. Nothing in it appoints ETABLIX as
CDM Principal Contractor. Every load, ratio, rate and duration is a first-pass
planning figure for validation by a competent person, and anything
safety-critical is flagged for one rather than resolved.`;

export const FIELDS = [
  { name: "client", label: "Client / organisation", type: "text", required: true },
  { name: "project", label: "Project / site — the name this package will carry", type: "text", required: true },
  { name: "handover", label: "Information handover date — the package is due ten working days after this", type: "date", required: true },
  { name: "scope", label: "The scope to be covered, package by package", type: "textarea", required: true },
  { name: "programme", label: "Programme and the required-on-site dates", type: "textarea", required: true },
  { name: "layout", label: "Site layout and compound drawings — parcels, areas, access, boundaries", type: "textarea" },
  { name: "workforce", label: "Workforce numbers and shift pattern", type: "textarea" },
  { name: "standards", label: "The client's own standards, specifications and preferred suppliers", type: "textarea" },
  { name: "planning", label: "Planning consent and conditions", type: "textarea" },
  { name: "utilities", label: "Utility supply positions and capacities", type: "textarea" },
  { name: "hse", label: "The client's HSE and CDM arrangements — and who holds which role", type: "textarea" },
  { name: "tender", label: "Intended route to market and evaluation approach", type: "textarea" },
];

/** The twelve headings, for the document template and the output splitter. */
export const SECTIONS = [
  ["r1", "Package structure and scope boundaries"],
  ["r2", "Employer's Requirements by package"],
  ["r3", "Interface and responsibility matrix"],
  ["r4", "Technical requirements"],
  ["r5", "Welfare, accommodation and workforce requirements"],
  ["r6", "Performance and service-level requirements"],
  ["r7", "HSEQ, CDM and statutory requirements"],
  ["r8", "Programme, access and phasing requirements"],
  ["r9", "Commercial requirements"],
  ["r10", "Evaluation model"],
  ["r11", "Contract strategy and terms schedule"],
  ["r12", "Tender document register and issue plan"],
];
