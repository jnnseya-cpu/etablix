/**
 * Agent 11 — Workforce Village Requirements Package.
 *
 * £18,000 to £55,000, the most specialist thing ETABLIX sells and the one
 * with the fewest people who can do it. On the NORTHREACH pack the
 * accommodation decision alone moved between £3.15m and £11.7m, against a
 * client basis that was a graduate's desk research with no rates in it.
 *
 * TWO THINGS MAKE THIS DIFFERENT FROM EVERY OTHER DELIVERABLE, and both are
 * hard rules rather than emphasis.
 *
 * PEOPLE SLEEP HERE. A construction compound is a place of work; a village is
 * somewhere several hundred people are unconscious at three in the morning.
 * Fire strategy, means of escape, compartmentation, alarm and detection,
 * evacuation and muster are life-safety matters and this package does not
 * resolve them. It states the requirement, states what a competent person and
 * the fire authority must determine, and says so on the face of the document.
 * A requirements package that appears to settle a fire strategy is dangerous
 * in a way no other document here can be.
 *
 * AND IT IS A CONSENTED DEVELOPMENT, not a temporary works arrangement. A
 * village needs planning permission, a licence in many cases, and an exit
 * position agreed before it is built. The consent route and its determination
 * period decide whether the village is available at all — and the client
 * usually asks for it eighteen months after the date on which the application
 * had to be made.
 */

export const RECONCILE_TASK = `Do not write any part of the requirements package yet.

Build the working paper the twelve deliverables are written from. It is not
for the client. It exists so every requirement can be traced, and so the
constraints that decide whether a village is possible at all are established
before anything is specified.

## A · DEMAND MODEL
The bed demand, derived rather than asserted. Columns: period, headcount on
site, the travelling proportion with its source, beds required, and bed-nights
in the period. Then the totals: peak beds, average beds, and total bed-nights
across the deployment on the roster stated — and if no roster is stated, both
a five-night and a seven-night basis, because the difference is typically
forty per cent of the volume.

State the travelling proportion's source and whether the client has evidenced
it. An untested percentage lifted from another project is the commonest single
error in this whole subject, and every bed, every unit and every utility
figure in the package rests on it.

## B · SITE CAPACITY AND CONSTRAINT REGISTER
What the village site can physically take. Columns: reference (VC-xx), the
constraint, its value or position, its source, and what it limits. Area,
boundary, levels and gradients, ground conditions, flood position, ecology,
trees, existing services crossing it, access geometry, neighbouring uses and
their separation, and the distance to the site the village serves.

## C · CONSENT AND LICENSING POSITION
Every permission the village needs. Columns: the consent or licence, whether
it exists, has been applied for, or has not been started, the determination
period with its source, the latest responsible application date worked
backwards from first occupation, and whether that date has passed.

Where a determination period is not stated in the pack, say so and say that it
cannot be computed — a village whose consent route is unknown cannot be
programmed, and the client will discover that in the month they need the beds.

## D · UTILITY POSITION
Power, water, foul and comms at the village site. Columns: the service, what
is available, its capacity, its distance, its source, and the gap against the
demand the village will create. Where nothing is available, say what the
alternative is and that it must be specified rather than assumed.

## E · STANDARDS THE CLIENT HAS NOT STATED
Every point where a requirement must exist and the client has given no
standard. Columns: reference (VG-xx), what needs a standard, why it cannot be
priced or consented without one, and the standard ETABLIX would propose with
the basis named — a British Standard, a statutory requirement, an industry
norm named as such, or first-pass judgement marked as such.

Fire, life safety and means of escape appear in this table as items requiring
a competent person and the fire authority. They are never given a proposed
standard here.

## F · WHAT COULD NOT BE ESTABLISHED
Every gap, and what each one prevents specifying. Be specific: name the
document or survey missing and say what cannot be written without it.`;

const P = (key, label, range, task) => ({ key, label, range, task });

export const SECTION_PASSES = [
  P("v1_3", "Demand, site and accommodation standard", [1, 3], `Write deliverables 1, 2 and 3 of the Workforce Village Requirements Package.

Every requirement must be objectively verifiable and traced to a working-paper
reference. Where a requirement is an ETABLIX proposal rather than a client
mandate, mark it **[PROPOSED — client approval required]** in the row.

## 1 · Bed demand and occupancy model
The demand the village must meet, over its whole deployment. Show the
derivation. Peak beds, average beds, total bed-nights, the occupancy profile
by period, and the sensitivity of all of it to the travelling proportion —
give the bed count at three or four values of that percentage so the client
can see what the untested assumption is worth.

State the requirement that follows: bed count, the period each must be
available, and the occupancy management obligation. Then state the void
position — a village sized to peak is empty for most of its life, and the
requirement must say who carries that cost.

## 2 · Village site appraisal and capacity
Whether the site can take the village. Against each constraint in the working
paper: what it permits, what it prevents, and the requirement that follows.
Cover developable area against the unit schedule, levels and earthworks,
ground conditions and bearing, flood and drainage, ecology and trees, existing
services, and the separation to neighbouring uses.

State plainly whether the site can accommodate the demand at section 1. If it
cannot, say what it can accommodate and what the shortfall means — that is a
finding, not a failure of the exercise.

## 3 · Accommodation standard and unit schedule
The standard, expressed so a supplier can price it and an occupant can hold
the client to it. Room type and area, occupancy per room, en-suite provision,
heating and ventilation, acoustic separation between rooms, natural light,
storage, furniture, linen, and the condition standard on handover and
throughout.

Then the unit schedule: unit type, count, bed count per unit, and total. It
must reconcile to section 1 — show the arithmetic. Where the client has stated
no standard, propose one, name the basis, and mark it for approval.

Nothing here may say "adequate" or "of a good standard". A person is going to
live in this for eighteen months.`),

  P("v4_6", "Layout, utilities and fire", [4, 6], `Write deliverables 4, 5 and 6.

## 4 · Village layout and zoning requirements
The requirements the layout must satisfy, not a layout. Zoning between
sleeping, catering, amenity, parking and plant; separation distances and their
basis; circulation and pedestrian routes; vehicle access, turning and refuse
collection; parking count against the transport strategy; lighting including
its consent position; boundary treatment, security and access control; and
external amenity space.

State every separation distance with its basis. Where a separation is a fire
matter, cross-refer to section 6 and do not settle it here.

## 5 · Utilities, foul and waste requirements
Every service the village needs, sized to the demand at section 1 and shown as
arithmetic. Power built up load by load with diversity stated. Water in
m³/day, with the rate per person per day stated and its basis. Foul in m³/day
with the return proportion stated. Comms and connectivity. Waste and
recycling, with the arisings estimated per week.

Against each: the capacity required, what is available from the working paper,
the gap, and the requirement that closes it. Where the answer is tankering or
generation, say so and state the frequency and the movement it creates,
because that is a highway and an amenity matter as well as a service one.

## 6 · Fire strategy and life-safety requirements
**READ THIS BEFORE WRITING IT.** People sleep here. Fire strategy, means of
escape, compartmentation, travel distances, alarm and detection, emergency
lighting, evacuation, muster, and access for the fire service are LIFE-SAFETY
MATTERS and this package does NOT determine them.

What this section does is state the requirement that a strategy must exist,
name what it must cover, name who must produce and approve it — a competent
fire engineer and the fire and rescue authority, with Building Regulations and
the applicable licensing regime — and state the consequence of proceeding
without one. Where the client's pack contains a fire strategy, record what it
covers and what it does not.

Every row in this section carries the phrase **[SAFETY-CRITICAL — for
determination by a competent person and the fire authority]**. Do not propose
a travel distance, a compartment size, an alarm category or an escape width.
A requirements package that appears to settle a fire strategy is more
dangerous than one that is silent.`),

  P("v7_9", "Operation, amenity and transport", [7, 9], `Write deliverables 7, 8 and 9.

## 7 · Catering, welfare and amenity requirements
What the village must provide beyond a bed. Catering: covers, sittings, meal
service against the shift pattern, servery and kitchen provision, food-hygiene
registration and who holds it, and dietary provision. Welfare and amenity:
laundry, drying, recreation, quiet space, connectivity, and provision for
occupants working opposite shifts in the same building.

State the capacity requirement against the occupancy profile, not the peak
bed count, and show the arithmetic. A dining room sized on beds rather than on
sittings inside a shift pattern is the commonest error here.

## 8 · Village operation and management requirements
How the village is run, expressed as obligations that can be measured.
Columns: the service, the standard, how it is measured, the frequency, and the
consequence of failure. Cover reception and occupancy management, cleaning and
servicing frequencies, maintenance and response times, security and access
control, pest control, waste, complaints and escalation, resident conduct and
its enforcement, and out-of-hours and emergency cover.

State who holds each obligation and what evidence is required. A service level
with no measurement method is decoration, and an out-of-hours arrangement
that is not resourced is a life-safety exposure rather than a service one.

## 9 · Transport and access requirements
Getting occupants between the village and the site. The requirement for
vehicles, capacity, frequency and timing against the shift pattern; journey
time and the maximum acceptable travel time as a stated requirement; pick-up
and set-down provision; driver hours and the fatigue position; and the
arrangement for occupants working outside the standard pattern.

State the movement this creates on the local network — vehicles per day, at
what times — because that is a consent matter and it appears in the village's
own planning position at section 10. Fatigue management for shift workers is
**[SAFETY-CRITICAL — for determination by a competent person]** and is stated
as a requirement rather than resolved.`),

  P("v10_12", "Consents, exit and procurement", [10, 12], `Write deliverables 10, 11 and 12.

## 10 · Consents, licensing and statutory requirements
Every permission, worked BACKWARDS from first occupation. Columns: the consent
or licence, its current position, the determination period with its source,
the latest responsible application date, and whether it has passed.

Cover planning permission and its likely conditions, any caravan or
houses-in-multiple-occupation licensing that applies, Building Regulations
approval, fire authority consultation, environmental permits for foul and
waste, highway agreements for the access and the transport movements, and
food-hygiene registration.

Where a determination period is not in the pack, say it cannot be computed
and say what that prevents. **The consent route decides whether the village is
available at all**, and a client typically asks for it long after the date the
application had to be made. If any latest responsible date has already passed,
that belongs in the first paragraph of the whole package.

## 11 · Deployment, duration and exit requirements
The village's life. Requirements for the mobilisation and construction
programme against the first-occupancy date; phasing where occupancy builds;
the deployment duration and the basis of any hire term; the position when
demand falls, including whether units are removed progressively; and the exit
— removal, reinstatement, the hand-back standard, and any obligation in the
land agreement.

State the exit requirement explicitly and separately priced. An exit assumed
inside a hire or a build contract is an unquantified liability, and it falls
due at the point a project has no remaining budget.

## 12 · Procurement and contracting strategy for the village
How the village is bought. The packages it divides into and why; what is hire
and what is capital and the test between them; the boundary of each package as
a witnessed physical point; the contract form and the amendments each package
needs; the risk allocation, particularly for ground, consents, occupancy
levels and the exit; insurance including the position on occupants' property
and public liability for a residential setting; and the evaluation model with
criteria and weightings.

End with the outstanding items that must close before any package goes to
market, each with a named owner and a date. A village tendered with the fire
strategy or the consent route open produces priced assumptions rather than
prices.`),
];

export const FINAL_TASK = `Everything is written. Two things remain.

## 0 · REQUIREMENTS SUMMARY IN ONE PARAGRAPH
Write it first though it is read first. One paragraph, no bullets. It must
say: the peak bed requirement and the total bed-nights; whether the site can
accommodate it; whether the consent route is established and whether any
latest responsible application date has already passed; that the fire strategy
is for a competent person and the fire authority and has not been settled
here; and the client decisions that must be taken before anything is tendered.

## A · REQUIREMENT TRACEABILITY, SAFETY REFERRALS AND OPEN ITEMS
Three tables.

First, traceability: every requirement traced to its source — the working
paper reference and the client document, statutory duty or condition behind
it, and whether it is a client mandate or an ETABLIX proposal awaiting
approval. Anything untraceable is listed as untraced rather than dropped.

Second, safety referrals: every item marked SAFETY-CRITICAL, who it is
referred to, and what must not proceed until they have determined it. Fire
strategy, means of escape, compartmentation, alarm and detection, evacuation,
and fatigue management all appear here. If this table is thin, you have
resolved something you should have referred.

Third, open items: everything that must close before the village is tendered,
with who closes it and by when, worked back from the dates at section 11.

Then list what was not provided and what it prevented — name the document or
survey, say what could not be specified, and say what was done instead. Every
bed count, load, volume and duration in this package is a first-pass planning
figure for validation by a competent person.`;

export const BRIEF_SYSTEM = `You are Agent 11 — Workforce Village Requirements Package.

This is a paid engagement of £18,000 to £55,000, and the most specialist thing
ETABLIX sells. A client hands over their bed demand, village site, planning
position, utilities, intended standard, operating intent, duration, transport
strategy, committed packages and fire strategy if one exists — and receives the
requirements that get the village consented, built, operated and removed.
Produce all twelve deliverables, under these exact headings, in this order.

PEOPLE SLEEP HERE, and it changes what you may write. A construction compound
is a place of work; a village is where several hundred people are unconscious
at three in the morning. Fire strategy, means of escape, compartmentation,
travel distances, alarm and detection, emergency lighting, evacuation, muster
and fire-service access are LIFE-SAFETY MATTERS. You state the requirement
that a strategy must exist, what it must cover, and who must produce and
approve it — a competent fire engineer and the fire and rescue authority. You
do NOT propose a travel distance, a compartment size, an alarm category or an
escape width. Every such row carries **[SAFETY-CRITICAL — for determination by
a competent person and the fire authority]**. A package that appears to settle
a fire strategy is more dangerous than one that is silent.

A VILLAGE IS A CONSENTED DEVELOPMENT, not a temporary works arrangement. It
needs planning permission, often a licence, Building Regulations approval and
an agreed exit. The consent route and its determination period decide whether
the village is available at all, and clients ask for one long after the date
the application had to be made. Work every consent backwards from first
occupancy and put any date that has already passed in the first paragraph.

EVERY REQUIREMENT IS VERIFIABLE AND TRACED. Nothing may say "adequate" or "of
a good standard" — somebody is going to live in it for eighteen months. Every
requirement is traced to a client document, a statutory duty, a condition, or
is marked **[PROPOSED — client approval required]**. Nothing is invented:
where the client has stated no standard, say so, propose one, name the basis.

EVERY FIGURE RESTS ON THE TRAVELLING PROPORTION, so treat it accordingly.
State its source, state whether the client has evidenced it, and give the bed
count at several values of it. An untested percentage lifted from another
project is the commonest error in this subject.

Drawings are given to you as pages to look at, not as extracted text. Never
infer a dimension from a drawing you cannot scale, and never read a drawing's
silence as a decision.

Boundary: a drafting service and decision support. Not a design, not a price,
not legal advice, and not a fire strategy. Nothing in it appoints ETABLIX as
CDM Principal Contractor.`;

export const FIELDS = [
  { name: "client", label: "Client / organisation", type: "text", required: true },
  { name: "project", label: "Project / village — the name this package will carry", type: "text", required: true },
  { name: "handover", label: "Information handover date — the package is due ten working days after this", type: "date", required: true },
  { name: "demand", label: "Bed demand curve over the whole programme", type: "textarea", required: true },
  { name: "site", label: "The village site — location, area, boundary and levels", type: "textarea", required: true },
  { name: "planning", label: "Planning position for the village", type: "textarea" },
  { name: "utilities", label: "Utility positions — power, water, foul, comms", type: "textarea" },
  { name: "standard", label: "The standard of accommodation intended", type: "textarea" },
  { name: "operation", label: "How the village is intended to be operated", type: "textarea" },
  { name: "duration", label: "Deployment duration, and what happens at the end", type: "textarea" },
  { name: "transport", label: "Transport strategy between the village and the site", type: "textarea" },
  { name: "packages", label: "Any packages already let or committed", type: "textarea" },
  { name: "hse", label: "Fire strategy, if one exists", type: "textarea" },
];

export const SECTIONS = [
  ["v1", "Bed demand and occupancy model"],
  ["v2", "Village site appraisal and capacity"],
  ["v3", "Accommodation standard and unit schedule"],
  ["v4", "Village layout and zoning requirements"],
  ["v5", "Utilities, foul and waste requirements"],
  ["v6", "Fire strategy and life-safety requirements"],
  ["v7", "Catering, welfare and amenity requirements"],
  ["v8", "Village operation and management requirements"],
  ["v9", "Transport and access requirements"],
  ["v10", "Consents, licensing and statutory requirements"],
  ["v11", "Deployment, duration and exit requirements"],
  ["v12", "Procurement and contracting strategy for the village"],
];
