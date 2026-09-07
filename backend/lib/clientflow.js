/**
 * The client engagement lifecycle — the customer side of the house.
 *
 * The supplier portal answers "how does a subcontractor get appointed
 * and paid". This answers the other half: how a customer, from the
 * moment they accept an invoice, gets a link, tells us everything we
 * need in one pass, agrees to start, pays a deposit, receives the work,
 * decides on it, and pays the balance — without anybody sending an
 * email to ask what happens next.
 *
 * Three design rules run through this file, because they are what the
 * business is sold on:
 *
 *   NO REPETITION.  Everything we need is asked for once, up front, in
 *     one checklist, with the format stated on the line. We do not come
 *     back a week later for the thing we forgot to ask for.
 *
 *   NO QUESTIONS.   Every requirement carries WHY we need it and what
 *     happens if it is missing, so the client can answer it without
 *     ringing us. An item that does not exist is marked as not existing
 *     with a note — that is a finding, not a hole, and it does not stop
 *     the clock.
 *
 *   NO REJECTION.   A deliverable is issued against requirements the
 *     client has already seen and confirmed, and the decision the client
 *     makes is structured — approve, review with comments against a
 *     named section, or reject with a reason. A review round is specific
 *     or it is not a review.
 *
 * Everything the portal shows and every payment it triggers is derived
 * from the state here. The portal and the Control Desk read the same
 * functions, so the two can never disagree about what is outstanding.
 */

import { DIAGNOSTIC_WORKING_DAYS } from "./workingdays.js";

// ------------------------------------------------------------ the stages

/**
 * The engagement lifecycle. `actor` is who the stage is waiting on, so
 * the portal and the desk can each say "this one is yours" without a
 * second table of rules.
 */
export const STAGES = [
  {
    id: "agreed",
    label: "Engagement agreed",
    actor: "etablix",
    short: "Invoice issued and accepted. Preparing your portal.",
    detail:
      "The engagement terms and the invoice have been accepted. We issue the portal next; nothing is required from you until the link arrives.",
  },
  {
    id: "information",
    label: "Information handover",
    actor: "client",
    short: "Complete the checklist below.",
    detail:
      "Everything we need from you is on one list. Send what exists as it exists — do not tidy it first. Where something does not exist, mark it so and tell us: an absence we know about is a finding, and an absence we do not is a hole.",
  },
  {
    id: "ready",
    label: "Ready to start",
    actor: "client",
    short: "Confirm you want us to start.",
    detail:
      "The mandatory information is in. Confirming here is your instruction to proceed, and it releases the deposit request automatically.",
  },
  {
    id: "deposit",
    label: "Deposit",
    actor: "client",
    short: "Deposit invoice issued — awaiting cleared funds.",
    detail:
      "The deposit invoice was raised automatically when you confirmed. Work begins when the funds clear; we will not start and then invoice you for a start you had not authorised.",
  },
  {
    id: "in_progress",
    label: "In progress",
    actor: "etablix",
    short: "Work under way.",
    detail:
      "The work is with us. You will see the deliverable here when it is issued — not by email attachment, so that there is one version and one place it lives.",
  },
  {
    id: "decision",
    label: "Your decision",
    actor: "client",
    short: "Approve, review with comments, or reject.",
    detail:
      "The deliverable is issued. Approving releases the balance invoice automatically. Reviewing sends it back to us with your comments against the sections you name. Rejecting stops it and asks us to say why it went wrong.",
  },
  {
    id: "balance",
    label: "Balance due",
    actor: "client",
    short: "Balance invoice issued.",
    detail:
      "You approved the deliverable, so the balance invoice was raised automatically at the moment of approval. The deliverable is yours to keep whatever happens next.",
  },
  {
    id: "closed",
    label: "Closed",
    actor: "none",
    short: "Complete.",
    detail: "Paid and closed. Everything issued under this engagement stays available here.",
  },
];

export const STAGE_IDS = STAGES.map((s) => s.id);
export const stage = (id) => STAGES.find((s) => s.id === id) || STAGES[0];
export const stageIndex = (id) => Math.max(0, STAGE_IDS.indexOf(id));

// ------------------------------------------------------- commercial models

/**
 * Payment shape by delivery model. Model A is a defined deliverable for
 * a fixed fee, so it is 30% to start and 70% on approval. Models B and C
 * are recurring appointments, so they are a month in advance and then a
 * month at a time — the client is never funding work we have not done,
 * and we are never funding a month we have not been paid for.
 */
export const MODELS = {
  A: {
    id: "A",
    name: "Model A — Advisory",
    kind: "fixed",
    recurring: false,
    depositPct: 30,
    depositLabel: "30% to start",
    balanceLabel: "70% on your approval",
    summary:
      "A defined deliverable for a fixed fee. 30% is payable when you confirm the start; the remaining 70% falls due the moment you approve the deliverable, and not before.",
    depositNarrative:
      "30% of the agreed fee. It covers the information review and the first pass of the work, and it is the point at which we commit the people.",
    balanceNarrative:
      "The balance of the agreed fee, raised automatically on your approval. If you review rather than approve, nothing is raised until the revised issue is approved.",
  },
  B: {
    id: "B",
    name: "Model B — Management Integrator",
    kind: "recurring",
    recurring: true,
    depositPct: null,
    depositLabel: "First month in advance",
    balanceLabel: "Monthly in advance, on approval of the month just ended",
    summary:
      "A recurring appointment. The mobilisation fee and the first month are payable in advance; each following month is invoiced when you approve the month that has just ended.",
    depositNarrative:
      "Mobilisation and planning fee plus the first month's integration and management fee, and the platform fee where CONSTRUX is in scope. Paid in advance because month one is the month we buy the team and stand the systems up.",
    balanceNarrative:
      "The next month's fee, raised automatically when you approve the report for the month just ended. Approval and invoice are the same act, so there is no month where you are paying for something you have not seen.",
  },
  C: {
    id: "C",
    name: "Model C — Prime Service Contractor",
    kind: "recurring",
    recurring: true,
    depositPct: null,
    depositLabel: "First month in advance",
    balanceLabel: "Monthly in advance, on approval of the month just ended",
    summary:
      "Single-point accountability for the site services. The advance covers month-one supplier expenditure, mobilisation and the first month's fee; each following month is invoiced when you approve the month just ended.",
    depositNarrative:
      "The advance: forecast month-one supplier expenditure, the mobilisation fee, the first month's management fee, early procurement commitments, VAT and the agreed early-risk contingency. No supplier order is placed until it has cleared — that is the protection it buys you as much as us.",
    balanceNarrative:
      "The next month's valuation, raised automatically on your approval of the month just ended, with the supplier reserve replenished on the same cycle.",
  },
};

export const MODEL_IDS = Object.keys(MODELS);
export const model = (id) => MODELS[String(id || "A").toUpperCase()] || MODELS.A;

/**
 * What is payable now, and why. Returns the amount, the label the client
 * sees and the sentence that explains it — one function, so the invoice,
 * the email and the portal cannot describe the same money differently.
 */
export function depositTerms(engagement) {
  const m = model(engagement.model);
  const fee = Number(engagement.fee) || 0;
  if (m.kind === "fixed") {
    const amount = Math.round(fee * (m.depositPct / 100) * 100) / 100;
    return {
      amount,
      pct: m.depositPct,
      label: `Deposit — ${m.depositPct}% of the agreed fee`,
      narrative: m.depositNarrative,
      basis: `${m.depositPct}% of ${money(fee)}`,
    };
  }
  const monthly = Number(engagement.monthlyFee) || 0;
  const mobilisation = Number(engagement.mobilisationFee) || 0;
  const platform = Number(engagement.platformFee) || 0;
  const advance = Number(engagement.advance) || 0;
  const amount = Math.round((monthly + mobilisation + platform + advance) * 100) / 100;
  const parts = [
    mobilisation ? `mobilisation ${money(mobilisation)}` : null,
    monthly ? `month one ${money(monthly)}` : null,
    platform ? `platform ${money(platform)}` : null,
    advance ? `advance ${money(advance)}` : null,
  ].filter(Boolean);
  return {
    amount,
    pct: null,
    label: "First month in advance",
    narrative: m.depositNarrative,
    basis: parts.join(" + ") || "First month in advance",
  };
}

/** What falls due when the client approves. */
export function balanceTerms(engagement) {
  const m = model(engagement.model);
  const fee = Number(engagement.fee) || 0;
  if (m.kind === "fixed") {
    const deposit = depositTerms(engagement).amount;
    const amount = Math.round((fee - deposit) * 100) / 100;
    return {
      amount,
      label: `Balance — ${100 - m.depositPct}% on approval`,
      narrative: m.balanceNarrative,
      basis: `${money(fee)} less deposit ${money(deposit)}`,
    };
  }
  const monthly = Number(engagement.monthlyFee) || 0;
  const platform = Number(engagement.platformFee) || 0;
  const amount = Math.round((monthly + platform) * 100) / 100;
  return {
    amount,
    label: "Next month, in advance",
    narrative: m.balanceNarrative,
    basis: [monthly ? `management ${money(monthly)}` : null, platform ? `platform ${money(platform)}` : null]
      .filter(Boolean)
      .join(" + ") || "Monthly fee",
  };
}

const money = (n) =>
  "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ------------------------------------------------------ requirement packs

/**
 * R(id, title, why, format, opts) — one line of a requirement checklist.
 *
 * `why` is not decoration. It is the reason the client does not have to
 * ring and ask, and it is the reason an item arrives in a form we can
 * read. `format` is stated on every line for the same reason: a drawing
 * sent as a screenshot is the difference between reading a layout and
 * guessing at one.
 *
 * accepts:
 *   file      — a document, and only a document
 *   file_note — a document, or a written statement that it does not exist
 *   confirm   — a statement of fact we need on the record, tick and note
 *   text      — an answer in words
 */
const R = (id, title, why, format, opts = {}) => ({
  id,
  title,
  why,
  format,
  accepts: opts.accepts || "file_note",
  mandatory: opts.optional !== true,
  group: opts.group || "Project information",
});

/**
 * COMMERCIAL — asked on every engagement, whatever the deliverable,
 * because these are the five things that otherwise generate a phone call
 * in week two and an argument at invoice.
 */
const COMMERCIAL = [
  R(
    "c-contact",
    "Your named contact, and what they can authorise",
    "One person who can answer a question and one person who can approve a deliverable — sometimes the same person, often not. Naming both now is what stops a deliverable sitting unread because the person who received it could not sign it off.",
    "Name, role, email, phone — for each",
    { accepts: "text", group: "Commercial and contractual" }
  ),
  R(
    "c-po",
    "Your purchase order or internal reference",
    "Most clients cannot pay an invoice that does not carry their own reference, and finding that out at day 30 costs a month. If no PO is required, say so and we will note it.",
    "PO number, or a statement that none is required",
    { accepts: "text", group: "Commercial and contractual" }
  ),
  R(
    "c-vat",
    "Your VAT position on this engagement",
    "It changes the invoice, not the price. If you are a CIS-registered contractor client, the domestic reverse charge applies and we do not charge you the VAT. If you are an end user, normal VAT applies. Telling us now means the first invoice is right.",
    "CIS contractor client / end user / outside scope — and your VAT number",
    { accepts: "confirm", group: "Commercial and contractual" }
  ),
  R(
    "c-invoicing",
    "Where invoices go, and through what",
    "Accounts payable address or email, and the name of any supplier portal we have to submit through. A portal we are not registered on is a two-week delay nobody plans for.",
    "Email or address, plus the portal name and any onboarding steps",
    { accepts: "text", group: "Commercial and contractual" }
  ),
  R(
    "c-confidentiality",
    "Your confidentiality position",
    "Whether an NDA is in place, needs to be, or whether your standard terms already cover it. Information you send us is treated as confidential either way; this is so we know whose paper it sits on.",
    "NDA attached, NDA required, or covered by your terms",
    { accepts: "file_note", group: "Commercial and contractual" }
  ),
];

/**
 * The packs. One per deliverable. The feasibility pack is the
 * Site Systems Diagnostic information request, item for item, because
 * that list is already the tested one and a second version of it would
 * be a second thing to keep right.
 */
export const REQUIREMENT_PACKS = {
  feasibility: {
    id: "feasibility",
    name: "Site-services feasibility review / Site Systems Diagnostic",
    clockNote: `The diagnostic is ${DIAGNOSTIC_WORKING_DAYS} working days from information handover. The clock starts on the day the last mandatory item arrives, so a partial pack does not start it.`,
    items: [
      R(
        "f-programme",
        "Project programme",
        "Milestones, phases, shift patterns, and the access or possession date each one depends on. The current revision, not the tender one — most of what a diagnostic is worth sits in the gap between a programme and the consent it assumes.",
        "PDF print of the Gantt AND a task list as CSV. Microsoft Project, Primavera P6 and Asta files cannot be opened here and every one of those tools exports both. The PDF gives the bars, links and float; the CSV gives the dates to work backwards from. One without the other loses half of it."
      ),
      R(
        "f-workforce",
        "Workforce forecast",
        "The curve over the whole programme, the peak, its composition, and the percentage unable to commute daily. The last figure is the one that decides whether there is an accommodation problem at all.",
        "Excel exported to CSV, or PDF"
      ),
      R(
        "f-layout",
        "Proposed site layout",
        "Every compound, with areas, access points, parking, welfare and laydown. A layout is read by looking at it — what adjoins what, what shares an access, what the hatching means.",
        "PDF drawing at its stated scale, WITH the title block. A screenshot or a cropped extract loses the revision, the scale and the date. DWG and DXF cannot be read here; export to PDF."
      ),
      R(
        "f-logistics",
        "Logistics plan",
        "Whatever exists, approved or draft — and which compounds it actually covers. A draft tells us as much as an approved one.",
        "PDF or Word"
      ),
      R(
        "f-services",
        "Temporary-services requirements",
        "Power, water, foul and comms as you have stated them, with the revision they were issued at. We read these against the workforce forecast; where the two were written by different people weeks apart, the difference is usually the finding.",
        "PDF or Word"
      ),
      R(
        "f-packages",
        "Procurement package list",
        "Every package, its status, and who is buying it — including the ones marked not started. The not-started ones are the ones with no lead time left in them.",
        "Excel exported to CSV, or PDF"
      ),
      R(
        "f-constraints",
        "Mobilisation constraints",
        "Planning conditions in full, consents applied for and not, ecology, utilities, land and access agreements. We need the decision notices themselves: a summary of a condition is somebody's reading of it, and the reading is what we are checking.",
        "PDF of the decision notices, not a summary"
      ),
      R(
        "f-surveys",
        "Site and utility information",
        "What surveys and investigations you hold — and a list of what you do not. The list of what you do not hold is a deliverable in its own right.",
        "PDF or Word"
      ),
      R(
        "f-superseded",
        "Anything you believe is superseded",
        "Send it anyway. Two documents written weeks apart by different people who have not compared them is where the finding lives. This item is optional only in the sense that we will not stop for it.",
        "Any format",
        { optional: true }
      ),
    ],
  },

  "site-requirements": {
    id: "site-requirements",
    name: "Site Management Requirements Package",
    clockNote:
      "The programme for this package is agreed at start-up and depends on the number of packages in scope. The clock starts when the last mandatory item arrives.",
    items: [
      R(
        "s-scope",
        "The scope you want covered, package by package",
        "Which site services you want specified and which you are keeping. A requirements package that covers something you have already bought is wasted, and one that misses something you assumed we had is worse.",
        "A list, in any format — we will come back with it structured"
      ),
      R(
        "s-programme",
        "Programme and the required-on-site dates",
        "Every requirement in the package is written backwards from a date. Without the dates we would be specifying against a guess.",
        "PDF print of the Gantt AND a task list as CSV"
      ),
      R(
        "s-layout",
        "Site layout and compound drawings",
        "The requirements have to fit the site as it will actually be. Areas, access, levels and the boundary with anything live.",
        "PDF drawings at scale, with title blocks"
      ),
      R(
        "s-workforce",
        "Workforce numbers and shift pattern",
        "Welfare, transport, parking, catering and accommodation are all sized off this, and a shift pattern changes every one of them.",
        "Excel exported to CSV, or PDF"
      ),
      R(
        "s-standards",
        "Your own standards, specifications and preferred suppliers",
        "If your business already has a welfare standard, an HSE standard or a framework supplier, the requirements package should be written to it rather than against it. Send them and we will comply or tell you where we disagree and why.",
        "PDF or Word"
      ),
      R(
        "s-planning",
        "Planning consent and conditions",
        "Hours, noise, lighting, ecology and access conditions are requirements whether or not anybody has written them into a specification yet.",
        "PDF of the decision notice in full"
      ),
      R(
        "s-utilities",
        "Utility supply positions and capacities",
        "Confirmed capacities, connection points and dates where they exist; where they do not, say so. A requirement written against an assumed supply is a variation waiting to happen.",
        "PDF, or a written statement of what is unconfirmed"
      ),
      R(
        "s-hse",
        "Your HSE and CDM arrangements",
        "Who is Principal Designer and Principal Contractor, and what the construction phase plan requires of a service provider. This determines what we can write as a requirement and what is somebody else's duty.",
        "PDF or Word"
      ),
      R(
        "s-tender",
        "Your intended route to market and evaluation approach",
        "Whether this is going out as one package or five, and whether price, quality or programme decides it. That changes how the requirements are written, not just how they are evaluated.",
        "A note is enough",
        { accepts: "text" }
      ),
    ],
  },

  "village-requirements": {
    id: "village-requirements",
    name: "Workforce Village Requirements Package",
    clockNote:
      "The programme is agreed at start-up and is driven by the bed demand curve. The clock starts when the last mandatory item arrives.",
    items: [
      R(
        "v-demand",
        "Bed demand curve over the whole programme",
        "Headcount by month, split by those who can commute and those who cannot, and by discipline where it affects room type. Every number in a village model — beds, kitchen covers, drainage loading, transport — comes off this curve, and a village sized off a peak that is really a spike is a village half empty for thirty months.",
        "Excel exported to CSV, or PDF"
      ),
      R(
        "v-site",
        "The village site — location, area, boundary and levels",
        "Including what adjoins it. The distance and the boundary between a village and a live construction site is a fire strategy input, a noise input and a security input.",
        "PDF drawings at scale, with title blocks; and a location plan"
      ),
      R(
        "v-planning",
        "Planning position for the village",
        "Consent, application, pre-application or nothing yet — and the conditions if consented. Temporary workers' accommodation is consented on conditions that decide the design, and a village designed before them is designed twice.",
        "PDF of the decision notice or the application, or a statement of the position"
      ),
      R(
        "v-utilities",
        "Utility positions: power, water, foul, comms",
        "Available capacity, connection points, static head and pressure for water, fault level for power, and the dates each is available. Where these are unconfirmed, say so — we will state the assumption in the requirements rather than let a contractor make its own.",
        "PDF or Word, or a written statement of what is unconfirmed"
      ),
      R(
        "v-standard",
        "The standard of accommodation you intend to provide",
        "Room size, ensuite or shared, single occupancy or twin, catering or self-catering, and any client or industry standard you are working to. This is a policy decision and it is yours; everything else follows from it.",
        "A note, or your standard if you have one",
        { accepts: "text" }
      ),
      R(
        "v-operation",
        "How you intend the village to be operated",
        "Catering, housekeeping, transport, security, welfare and management — in scope or out, and by whom. The split between what is built and what is run is the single most common gap in a village package.",
        "A note is enough",
        { accepts: "text" }
      ),
      R(
        "v-duration",
        "Deployment duration, and what happens at the end",
        "Whether the village is removed, relocated or handed over. A village that will be relocated twice is a different design from one that will be scrapped, and the difference has to be in the requirements, not discovered at demobilisation.",
        "A note is enough",
        { accepts: "text" }
      ),
      R(
        "v-transport",
        "Transport strategy between the village and the site",
        "Distance, route, mode and the shift times it has to serve. It sizes the parking, the bus fleet, the muster area and the roads.",
        "A note, or your transport plan"
      ),
      R(
        "v-packages",
        "Any packages already let or committed",
        "If the modular units are already bought, or a caterer is already appointed, the requirements are written around them. Finding that out after issue means reissuing.",
        "A list, and the contracts or orders if you have them"
      ),
      R(
        "v-hse",
        "Fire strategy, if one exists",
        "Sleeping accommodation is a fire strategy problem before it is anything else. If a fire engineer is appointed, we write to their strategy; if not, we say in the requirements that it is an input and who owes it.",
        "PDF, or a statement that none exists yet"
      ),
    ],
  },

  procurement: {
    id: "procurement",
    name: "Procurement management and tender evaluation",
    clockNote:
      "The programme runs from the agreed tender period. The clock starts when the last mandatory item arrives.",
    items: [
      R(
        "p-packages",
        "The packages to be procured, and their boundaries",
        "What is in each one and, more importantly, what sits between them. A package fails at its boundaries, not in its middle.",
        "A list, in any format"
      ),
      R(
        "p-requirements",
        "The technical requirements for each package",
        "Whatever exists — a specification, a scope, a drawing set, or a paragraph. Where a package has no requirements yet, say so: writing them is a different piece of work and should be priced as one, not absorbed.",
        "PDF or Word"
      ),
      R(
        "p-programme",
        "Required-on-site dates and the tender programme you can live with",
        "The tender period, the evaluation window and the award date. Compressing a tender period is the cheapest-looking and most expensive decision in procurement.",
        "PDF print of the Gantt AND a CSV task list"
      ),
      R(
        "p-budget",
        "Your budget or cost plan for each package",
        "Held in confidence and never disclosed to a tenderer. We need it to tell you whether a return is competitive or whether the whole market has priced something you did not ask for.",
        "Excel exported to CSV, or PDF",
        { group: "Commercial and contractual" }
      ),
      R(
        "p-evaluation",
        "How you want the tenders evaluated",
        "The quality/price split, the criteria and their weightings, and whether social value is scored. If you do not have a view we will propose one — but a weighting invented after the returns are open is not an evaluation, it is a decision looking for a justification.",
        "A note is enough",
        { accepts: "text" }
      ),
      R(
        "p-suppliers",
        "Any tenderers you require, or exclude",
        "Framework suppliers, incumbents, or firms you will not deal with and why. Better said now than after an invitation has gone out.",
        "A list",
        { accepts: "text" }
      ),
      R(
        "p-terms",
        "The contract form and terms you intend to use",
        "Tenderers price the terms as much as the works. A package tendered without its terms gets priced twice: once at tender and once when the terms arrive.",
        "PDF or Word, or the form and amendments you intend"
      ),
      R(
        "p-governance",
        "Your approval route and who signs the award",
        "Board, framework panel or a named director — and the dates that body meets. An award that waits five weeks for a committee is five weeks of price validity gone.",
        "A note is enough",
        { accepts: "text" }
      ),
    ],
  },

  "mobilisation-review": {
    id: "mobilisation-review",
    name: "Mobilisation-readiness / village-readiness review",
    clockNote:
      "A readiness review is issued within ten working days of the site visit. The clock starts on the day of the visit, and the visit cannot be booked until site access is confirmed — so the access item below is the one that actually governs the date.",
    items: [
      R(
        "m-access",
        "Site access for the review visit",
        "Dates, induction requirements, PPE, and the name of whoever escorts us. The review is a site visit before it is a document.",
        "A note, and any induction pack",
        { accepts: "text" }
      ),
      R(
        "m-programme",
        "Current programme and the mobilisation date being tested",
        "The review answers one question: will this date be met. Without the date there is nothing to answer.",
        "PDF print of the Gantt AND a CSV task list"
      ),
      R(
        "m-status",
        "Status of every service and package at today's date",
        "Ordered, awaiting order, awaiting design, awaiting consent. Include the ones you know are late — a readiness review that only sees the healthy items reports that everything is healthy.",
        "Excel exported to CSV, or PDF"
      ),
      R(
        "m-consents",
        "Consents, conditions and utility connections — current position",
        "Which are discharged, which are applied for, which have not been started. The consent chain is where mobilisation dates actually fail.",
        "PDF of the notices and the application receipts"
      ),
      R(
        "m-layout",
        "The layout as it will be at mobilisation",
        "Not the tender layout. What will physically be there on the date.",
        "PDF drawings at scale, with title blocks"
      ),
      R(
        "m-suppliers",
        "Supplier appointments and their lead times",
        "Who is appointed, against what order, with what lead time from instruction. A lead time nobody has confirmed with the supplier is not a lead time.",
        "Excel exported to CSV, or PDF"
      ),
      R(
        "m-risks",
        "Your own risk register for mobilisation",
        "So that the review says something you do not already know, rather than restating your own register back to you.",
        "Excel exported to CSV, or PDF",
        { optional: true }
      ),
    ],
  },

  integrator: {
    id: "integrator",
    name: "Model B — Management Integrator mobilisation",
    clockNote:
      "The clock starts when the advance clears or the last mandatory item arrives, WHICHEVER IS LATER — mobilisation depends on both and neither one alone starts it. The mobilisation plan is issued within fifteen working days of that point.",
    items: [
      R(
        "b-contract",
        "The executed appointment, and your standard terms",
        "We do not place a supplier order until the appointment is executed, the advance has cleared and the baseline is approved. That is a protection for you before it is one for us.",
        "PDF",
        { group: "Commercial and contractual" }
      ),
      R(
        "b-scope",
        "The packages we are integrating, and the ones we are not",
        "Every service on the site, marked in scope or out, and who holds the ones that are out. An unmarked package is one nobody is holding.",
        "A list, in any format"
      ),
      R(
        "b-programme",
        "Master programme and the milestone set we report against",
        "The integration reporting is built on your milestones, not a parallel set of ours. Two programmes on one project is two versions of the truth.",
        "PDF print AND CSV task list"
      ),
      R(
        "b-baseline",
        "The cost baseline for the services in scope",
        "Held in confidence. Earned value reporting is meaningless without a baseline to earn against, and a baseline agreed in month three is a baseline agreed after the overspend.",
        "Excel exported to CSV",
        { group: "Commercial and contractual" }
      ),
      R(
        "b-suppliers",
        "Suppliers already appointed, with their orders and terms",
        "We manage what is already there before we buy anything new. Send the orders, not a list of names — the terms are what we have to manage to.",
        "PDF of the orders"
      ),
      R(
        "b-governance",
        "Your governance: meetings, reports, escalation and who decides",
        "The reporting cycle is built to land before your meeting, not after it. Tell us the date of the meeting and the report will be there for it.",
        "A note is enough",
        { accepts: "text" }
      ),
      R(
        "b-hse",
        "CDM roles, the construction phase plan and site rules",
        "Nothing about this appointment makes us Principal Contractor. Where you need that role, it is a priced, insured, explicit decision and it is not this document.",
        "PDF"
      ),
      R(
        "b-systems",
        "Your systems, and whether CONSTRUX is in scope",
        "If you already run a document system, a permit system or a cost system, we work in yours. Where CONSTRUX is in scope, the platform fee is on the invoice and your team gets access from day one.",
        "A note is enough",
        { accepts: "confirm" }
      ),
      R(
        "b-people",
        "Site access, inductions and passes for our embedded personnel",
        "How many people, what they need and how long it takes. An embedded manager who cannot get through the gate on the first Monday costs a week.",
        "A note, and any induction pack",
        { accepts: "text" }
      ),
    ],
  },

  prime: {
    id: "prime",
    name: "Model C — Prime Service Contractor mobilisation",
    clockNote:
      "The clock starts when the advance clears or the last mandatory item arrives, WHICHEVER IS LATER. No supplier order is placed before four things are true together: the contract is executed, the advance has cleared, the baseline is approved and the credit protections are in place. Three of the four are yours to give us, which is why they are on this list rather than in a covering letter.",
    items: [
      R(
        "x-contract",
        "The executed contract, with all amendments",
        "Prime accountability is priced from the terms. An amendment we have not seen is a risk we have not priced, and the first place that shows up is the first payment cycle.",
        "PDF",
        { group: "Commercial and contractual" }
      ),
      R(
        "x-scope",
        "The full services scope, and the interfaces to what stays with you",
        "Single-point accountability means the boundary has to be exact. Every interface named, with what crosses it and who certifies it.",
        "PDF or Word, and a list of interfaces"
      ),
      R(
        "x-programme",
        "Master programme, milestones and the payment cycle dates",
        "The valuation cycle is built onto your dates: submissions, assessment, valuation, notices and the final date for payment. These have to satisfy the Construction Act, and they have to be your dates.",
        "PDF print AND CSV task list"
      ),
      R(
        "x-baseline",
        "The agreed cost baseline and the risk register",
        "Contingency in the prime stack is drawn only against risk-register events through a change process. Without a joint register on day one there is nothing to draw against and it becomes an argument.",
        "Excel exported to CSV",
        { group: "Commercial and contractual" }
      ),
      R(
        "x-payment",
        "Your payment terms, notice regime and dates",
        "Valuation date, due date, notice periods and final date for payment. Pay-when-paid is prohibited and our supplier terms do not contain it — we need your dates to build ours from.",
        "PDF of the payment schedule",
        { group: "Commercial and contractual" }
      ),
      R(
        "x-credit",
        "Any parent company guarantee, bond or credit position required",
        "Bonds and guarantees have a cost and a lead time. Both belong in the mobilisation programme rather than in a surprise at week four.",
        "A note, and the required form if you have one",
        { group: "Commercial and contractual" }
      ),
      R(
        "x-suppliers",
        "Novated or nominated suppliers, with their contracts",
        "A supplier we inherit comes with terms we did not write. We need the contract to know what we are accountable for.",
        "PDF of the contracts",
        { optional: true }
      ),
      R(
        "x-hse",
        "CDM appointments and whether Principal Contractor is in scope",
        "Under CDM 2015 Principal Contractor is a defined legal role with specific duties. If you require us to hold it, it is stated here, priced and insured — never assumed from the word 'prime'.",
        "PDF, and a clear statement of the CDM position",
        { accepts: "confirm" }
      ),
      R(
        "x-systems",
        "Systems, reporting and whether CONSTRUX and VERYX are in scope",
        "Prime delivery generates a lot of evidence — progress, inspections, permits, certificates. Where our platforms are in scope your team sees it live; where they are not, we report into yours.",
        "A note is enough",
        { accepts: "confirm" }
      ),
      R(
        "x-access",
        "Site access, inductions, welfare and laydown for our team",
        "What we are allocated, from what date. Prime mobilisation is a physical event before it is a commercial one.",
        "A note, the induction pack and a marked-up layout",
        { accepts: "text" }
      ),
    ],
  },
};

export const PACK_IDS = Object.keys(REQUIREMENT_PACKS);

/** The deliverable catalogue: what a client can be engaged for, and the pack it needs. */
export const DELIVERABLES = [
  { id: "feasibility", model: "A", name: "Site-services feasibility review / Site Systems Diagnostic", pack: "feasibility", low: 2500, high: 7500 },
  { id: "site-requirements", model: "A", name: "Site Management Requirements Package", pack: "site-requirements", low: 7500, high: 25000 },
  { id: "village-requirements", model: "A", name: "Workforce Village Requirements Package", pack: "village-requirements", low: 10000, high: 35000 },
  { id: "procurement", model: "A", name: "Procurement management and tender evaluation", pack: "procurement", low: 7500, high: 30000 },
  { id: "mobilisation-review", model: "A", name: "Mobilisation-readiness / village-readiness review", pack: "mobilisation-review", low: 5000, high: 15000 },
  { id: "integrator", model: "B", name: "Management Integrator appointment", pack: "integrator", low: null, high: null },
  { id: "prime", model: "C", name: "Prime Service Contractor appointment", pack: "prime", low: null, high: null },
];

export const deliverable = (id) => DELIVERABLES.find((d) => d.id === id) || DELIVERABLES[0];

/**
 * Build the checklist a new engagement starts with: the deliverable's own
 * pack plus the commercial five, in the order a client would work them.
 */
export function buildChecklist(deliverableId) {
  const pack = REQUIREMENT_PACKS[deliverable(deliverableId).pack] || REQUIREMENT_PACKS.feasibility;
  return [...pack.items, ...COMMERCIAL].map((item) => ({
    ...item,
    state: "outstanding", // outstanding | supplied | not_held
    note: "",
    files: [],
    updatedAt: null,
  }));
}

export const packFor = (deliverableId) => REQUIREMENT_PACKS[deliverable(deliverableId).pack] || REQUIREMENT_PACKS.feasibility;

// ------------------------------------------------------------- derivations

/**
 * The one function the portal and the Control Desk both read. An item is
 * settled when the client has either supplied it or told us it does not
 * exist — because "it does not exist" is an answer, and treating it as a
 * gap is what makes a client feel chased for something they have already
 * dealt with.
 */
export function checklistState(checklist = []) {
  const settled = (i) => i.state === "supplied" || i.state === "not_held";
  const mandatory = checklist.filter((i) => i.mandatory);
  const outstanding = checklist.filter((i) => !settled(i));
  const mandatoryOutstanding = mandatory.filter((i) => !settled(i));
  const notHeld = checklist.filter((i) => i.state === "not_held");
  return {
    total: checklist.length,
    settled: checklist.length - outstanding.length,
    outstanding: outstanding.length,
    mandatoryTotal: mandatory.length,
    mandatoryOutstanding: mandatoryOutstanding.length,
    outstandingItems: outstanding.map((i) => ({ id: i.id, title: i.title, mandatory: i.mandatory })),
    notHeldItems: notHeld.map((i) => ({ id: i.id, title: i.title, note: i.note })),
    percent: checklist.length ? Math.round(((checklist.length - outstanding.length) / checklist.length) * 100) : 0,
    canStart: mandatoryOutstanding.length === 0,
  };
}

/**
 * What happens next, said in one sentence, from whoever's point of view
 * is reading. Derived rather than stored, so it cannot drift from the
 * record.
 */
export function nextAction(engagement) {
  const st = stage(engagement.stage);
  const chk = checklistState(engagement.checklist || []);
  switch (engagement.stage) {
    case "agreed":
      return { actor: "etablix", client: "We are preparing your portal. Nothing is needed from you yet.", internal: "Issue the portal link — this sends the checklist and starts the client's side." };
    case "information":
      return {
        actor: "client",
        client: chk.canStart
          ? "Everything mandatory is in. Confirm below that you want us to start."
          : chk.mandatoryOutstanding === 1
            ? "One mandatory item outstanding. Supply it, or mark it as not held with a note — both count as answered."
            : `${chk.mandatoryOutstanding} mandatory items outstanding. Supply them, or mark them as not held with a note — both count as answered.`,
        internal: chk.canStart
          ? "Client has everything mandatory in and can now confirm the start."
          : `Waiting on the client: ${chk.mandatoryOutstanding} of ${chk.mandatoryTotal} mandatory items.`,
      };
    case "ready":
      return { actor: "client", client: "Confirm the start to release the deposit invoice.", internal: "Client can confirm the start; the deposit invoice is raised automatically when they do." };
    case "deposit":
      return { actor: "client", client: "The deposit invoice is issued. Work begins when it clears.", internal: "Awaiting cleared deposit. Mark it received to start the work." };
    case "in_progress":
      return { actor: "etablix", client: "The work is with us. The deliverable appears here when it is issued.", internal: "Deliver the work, then publish it to the portal for the client's decision." };
    case "decision":
      return { actor: "client", client: "Approve, review with comments, or reject the issued deliverable.", internal: "Awaiting the client's decision. Approval raises the next invoice automatically." };
    case "balance":
      return { actor: "client", client: "The balance invoice is issued. Thank you — the deliverable is yours to keep.", internal: "Awaiting the balance payment. Mark it received to close." };
    case "closed":
      return { actor: "none", client: "Complete. Everything issued under this engagement stays available here.", internal: "Closed." };
    default:
      return { actor: st.actor, client: st.short, internal: st.short };
  }
}

/**
 * Decisions a client may take on an issued deliverable. Structured,
 * because "make it better" is not a review comment and a rejection
 * without a reason cannot be answered.
 */
export const DECISIONS = {
  approved: {
    id: "approved",
    label: "Approve",
    tone: "ok",
    blurb: "Accepted. This releases the next invoice automatically.",
    requiresComment: false,
  },
  review: {
    id: "review",
    label: "Review with comments",
    tone: "warning",
    blurb: "Sends it back to us with your comments. Name the section each comment applies to — a comment against a section can be answered; a comment against the document cannot.",
    requiresComment: true,
  },
  rejected: {
    id: "rejected",
    label: "Reject",
    tone: "alert",
    blurb: "Stops the deliverable and asks us to explain what went wrong. Use this where the work has missed the requirement, not where it needs a change.",
    requiresComment: true,
  },
};

export const DECISION_IDS = Object.keys(DECISIONS);

/** Recurring models publish a period at a time; fixed models publish once. */
export function nextPeriodLabel(engagement) {
  const issued = (engagement.deliverables || []).filter((d) => d.kind === "period").length;
  return `Month ${issued + 1}`;
}

export { money };
