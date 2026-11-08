/**
 * THE ELEVEN ACCEPTANCE TESTS THAT NEEDED AN AGGREGATE.
 *
 *   node backend/test/agentos-aggregates.test.mjs
 *
 * AT-05, AT-06, AT-09, AT-11, AT-12, AT-13, AT-15, AT-16, AT-19, AT-27 and
 * AT-28. Each needed something that did not exist — a hire agreement under a
 * model change, a treasury reservation, a bed, a supplier competence, an
 * asset receipt, an opening, a sensor reading, a tax determination, a
 * connector queue, an idempotency ledger.
 *
 * Every one of them exists because of a failure that reads as success: a
 * delivery note that looks like completion, two orders that each fit the
 * same money, a furniture supplier wiring a compound, a credit note issued
 * off a stale sensor, an invoice with a guessed VAT treatment, a duplicate
 * collection closing a hire against the wrong date.
 */
import { assetReceipt, checkGate, openService, testAttempt, mobilisationNotes, MOB_GATES, TEST_STATES } from "../lib/agentos/mobilisation.js";
import { supplierEligibility, checkAtDispatch, eligibilityNotes, SUPPLIER_STATES } from "../lib/agentos/eligibility.js";
import { checkCutover, cutoverNotes, MANIFEST_CATEGORIES } from "../lib/agentos/cutover.js";
import { treasury, reserve, reserveMany, treasuryNotes } from "../lib/agentos/treasury.js";
import { classifyObservation, slaPosition, emergencyCallout, slaNotes, SLA_CLOCKS } from "../lib/agentos/sla.js";
import { determineTax, taxNotes } from "../lib/agentos/tax.js";
import { queueIntent, reconcileQueue, applyInbound, recordDispatch, outboxNotes } from "../lib/agentos/outbox.js";
import { bedRequirement, welfareSplit, peakConcurrency, OVERNIGHT_APPROVALS } from "../lib/agentos/capacity.js";

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 300)}` : ""}`); }
};

console.log("\n=== AT-12 · cabin delivered, ground and lift evidence missing ===\n");
ok(MOB_GATES.length === 7 && MOB_GATES[0].id === "order" && MOB_GATES[6].id === "remove",
   "AT-12 · seven gates, order to remove", MOB_GATES.map((g) => g.id));
{
  const r = assetReceipt({ asset: "cabin-17", serial: "C17", receivedAt: "2026-11-08", receiptedBy: "site manager" });
  ok(r.ok && r.state === "RECEIPTED", "the cabin is receipted", r.state);
  ok(r.installed === false && r.commissioned === false && r.open === false,
     "AND IT IS NOT INSTALLED, NOT COMMISSIONED AND NOT OPEN — the delivery note is the only record at this point and it reads as completion to every system that sees it",
     r);
  ok(/hire running/.test(r.say), "with the hire already running against it", r.say);
  ok(/reads as completion/.test(mobilisationNotes(r, null).join(" ")), "and the note says why that matters");
}
{
  const r = checkGate("lift", { liftPlan: "LP-4", equipmentEvidence: "cert" });
  ok(!r.ok && r.missing.includes("groundConstraints") && r.missing.includes("foundationRelease"),
     "the lift gate is not released without ground and foundation evidence", r.missing);
  ok(r.missing.includes("fieldAuthority"), "nor without the field authority", r.missing);
}
ok(!checkGate("nonsense", {}).ok, "an invented gate releases nothing");

console.log("\n=== AT-13 · water and alarms failed while cabins are installed ===\n");
{
  const r = openService({
    services: [
      { code: "13", area: "compound A", testsPassed: true },
      { code: "09", area: "compound A", testsPassed: false, mandatory: true },
      { code: "11", area: "compound A", testsPassed: false, mandatory: true },
    ],
    acceptingParty: "Managing Director",
  });
  ok(!r.ok && r.state === "CLOSED", "AT-13 · COMPOUND A DOES NOT OPEN", r.state);
  ok(/A release that waives a mandatory requirement is not restricted, it is unauthorised/.test(r.say),
     "and opening the welfare around a failed mandatory service is not a restricted release", r.say);
}
{
  // The same failures, in a different area. The area that passed opens.
  const r = openService({
    services: [
      { code: "13", area: "compound B", testsPassed: true },
      { code: "09", area: "compound A", testsPassed: false, mandatory: true },
    ],
    acceptingParty: "MD", capacity: "40 people", until: "2026-12-01",
  });
  ok(r.ok && r.state === "OPEN_RESTRICTED", "a different area with its own passing services opens restricted", r);
  ok(r.areas.join() === "compound B" && r.withheld.join() === "09",
     "naming what opened and what is withheld", r);
}
{
  const r = openService({ services: [{ code: "13", testsPassed: true }], acceptingParty: null });
  ok(!r.ok && /nobody accepted/.test(r.say), "and a service nobody accepted is not open", r.say);
}
{
  const r = openService({ services: [{ code: "13", testsPassed: true }, { code: "16", testsPassed: false }], acceptingParty: "MD" });
  ok(!r.ok && /must state the capacity and the time/.test(r.say),
     "a restricted release with no capacity and no time is not a restriction", r.say);
}
{
  ok(TEST_STATES.length === 7, "seven test-attempt states", TEST_STATES);
  const stale = testAttempt({ state: "PASSED", requirement: "R", scriptRevision: "2", configuration: "cfg-B", witness: "W", priorConfiguration: "cfg-A" });
  ok(!stale.ok && stale.stale && /retest is a new linked attempt/.test(stale.say),
     "A MATERIALLY CHANGED CONFIGURATION MAKES DOWNSTREAM ACCEPTANCE STALE", stale.say);
  ok(!testAttempt({ state: "PASSED", requirement: "R" }).ok, "and an attempt with nothing pinned proves nothing");
}

console.log("\n=== AT-11 · eligibility, per code, and expiring between award and dispatch ===\n");
ok(SUPPLIER_STATES.length === 14 && SUPPLIER_STATES[0] === "CANDIDATE", "AT-11 · the supplier state ladder", SUPPLIER_STATES.length);
{
  const r = supplierEligibility({ supplier: "Acme Furniture", code: "11", competences: ["14"] });
  ok(!r.ok && r.reason === "NO_COMPETENCE_FOR_CODE",
     "ELIGIBLE FOR FURNITURE IS NOT ELIGIBLE FOR ELECTRICS", r.reason);
  ok(/a register with a single approved flag is how a furniture supplier ends up wiring a compound/.test(r.say),
     "and the note says what the single-flag register costs", r.say);
}
{
  const r = supplierEligibility({ supplier: "Acme Catering", code: "16", competences: ["16"], evidence: {}, asAt: "2026-11-08" });
  ok(!r.ok && r.missing.some((m) => /food hygiene/.test(m)),
     "catering attracts food hygiene, which is not held", r.missing);
  const t = supplierEligibility({ supplier: "Acme Welfare", code: "13", competences: ["13"],
    evidence: { rightToWork: { validUntil: "2027-01-01" } }, asAt: "2026-11-08" });
  ok(t.ok && t.checksApplied.join() === "right to work",
     "and welfare attracts right to work only — applying every check to every scope is as wrong as applying none", t.checksApplied);
}
{
  const r = checkAtDispatch({ asAt: "2026-11-08", packages: [
    { id: "PKG-1", supplier: "Acme Electrical", code: "11", competences: ["11"], evidence: { electrical: { validUntil: "2026-10-01" } } },
    { id: "PKG-2", supplier: "Acme Welfare", code: "13", competences: ["13"], evidence: { rightToWork: { validUntil: "2027-06-01" } } },
  ] });
  ok(!r.ok && r.blocked.length === 1 && r.blocked[0].package === "PKG-1" && r.blocked[0].reason === "EVIDENCE_EXPIRED",
     "THE SUPERSEDED RELEASE IS BLOCKED", r.blocked);
  ok(r.proceeding.length === 1 && r.proceeding[0].package === "PKG-2",
     "AND THE UNAFFECTED PACKAGE CONTINUES — one supplier's lapse is not a stop on the mobilisation", r.proceeding);
  ok(/would not have noticed/.test(eligibilityNotes(r).join(" ")),
     "the note says a register checking only at award would not have seen it", eligibilityNotes(r));
}

console.log("\n=== AT-05 · model change with an open hire and no assignment ===\n");
ok(MANIFEST_CATEGORIES.length === 7, "AT-05 · the manifest accounts for seven categories", MANIFEST_CATEGORIES);
const FULL_MANIFEST = { contracts: 12, openOrders: 4, invoices: 9, retentions: 2, warranties: 3, noticeTimers: 5, legalEntities: 2 };
{
  const r = checkCutover({ fromModel: "02", toModel: "03", effectiveFrom: "2026-11-01", signed: true,
    manifest: FULL_MANIFEST,
    commitments: [{ id: "hire-cabin-17", kind: "hire", owner: "Client Ltd", enteredAt: "2026-09-01", claimedOwner: "JNN GLOBAL LTD" }] });
  ok(!r.ok && r.blocked, "MIXED OWNERSHIP WITH NO VERIFIED ASSIGNMENT IS BLOCKED", r.mixed);
  ok(r.retained.length === 1 && r.retained[0].owner === "Client Ltd",
     "and the historical commitment keeps its original owner", r.retained);
  ok(/accounting rather than legal/.test(cutoverNotes(r).join(" ")),
     "the note names the failure mode: the ledger has one model field", cutoverNotes(r));
  ok(/invoice addressed to the party that did not order/.test(cutoverNotes(r).join(" ")),
     "and how it surfaces", cutoverNotes(r));
}
{
  const r = checkCutover({ fromModel: "02", toModel: "03", effectiveFrom: "2026-11-01", signed: true,
    manifest: FULL_MANIFEST,
    commitments: [{ id: "hire-cabin-17", owner: "Client Ltd", enteredAt: "2026-09-01", assignment: "executed" }] });
  ok(r.ok && r.transferred.some((t) => t.by === "verified assignment"),
     "a verified assignment transfers it, which is the only thing that does", r.transferred);
}
{
  ok(!checkCutover({ fromModel: "02", toModel: "03", effectiveFrom: "2026-11-01", signed: false, manifest: FULL_MANIFEST }).ok,
     "an unsigned transition moves nothing");
  const m = checkCutover({ fromModel: "02", toModel: "03", effectiveFrom: "2026-11-01", signed: true, manifest: { contracts: 1 } });
  ok(m.missingCategories.length === 6 && /got to the end of/.test(cutoverNotes(m).join(" ")),
     "AND AN INCOMPLETE MANIFEST IS NOT A MANIFEST", m.missingCategories);
}

console.log("\n=== AT-06 · Model 03 order exceeds headroom, and concurrent commands exceed the cap ===\n");
{
  const r = reserve({ authorised: "1000000", committed: "400000" }, { id: "o1", amount: "700000", model: "C" });
  ok(!r.ok && r.reason === "INSUFFICIENT_HEADROOM" && r.shortfall === 100000,
     "AT-06 · a single order beyond headroom is blocked, short by the difference", r);
}
{
  // The concurrency case: each fits alone, together they do not.
  const r = reserveMany({ authorised: "1000000", committed: "400000" },
    [{ id: "o1", amount: "400000" }, { id: "o2", amount: "400000" }], { model: "C" });
  ok(r.taken.length === 1 && r.refused.length === 1,
     "TWO ORDERS THAT EACH FIT ALONE DO NOT BOTH FIT — the excess is blocked transactionally", r);
  ok(/the only reading under which concurrent orders cannot both fit the same money/.test(r.say),
     "which is the whole reason a reservation is taken before the order", r.say);
  ok(/blocked rather than queued/.test(treasuryNotes(r).join(" ")),
     "and the excess is blocked rather than queued, because a queued order binds when the queue drains", treasuryNotes(r));
}
{
  const a = reserve({ authorised: "1000000" }, { id: "o1", amount: "1000", model: "C" });
  const b = reserve(a.state, { id: "o1", amount: "1000", model: "C" });
  ok(b.ok && b.duplicate && treasury(b.ledger).reserved === treasury(a.ledger).reserved,
     "the same reservation twice is one reservation", { a: treasury(a.ledger).reserved, b: treasury(b.ledger).reserved });
}
ok(reserve({ authorised: "1000" }, { id: "x", amount: "5000", model: "A" }).ok,
   "and Advisory creates no ETABLIX supplier liability, so no headroom is reserved against it");
ok(!reserve({}, { id: "x", amount: "1", model: "C" }).ok,
   "no recorded limit blocks binding rather than assuming unlimited");

console.log("\n=== AT-15 · a stale sensor and contradictory observations ===\n");
ok(SLA_CLOCKS.length === 4, "AT-15 · four clocks, tracked separately", SLA_CLOCKS);
{
  const r = classifyObservation({ source: "wastewater level sensor", reading: "HIGH",
    observedAt: "2026-11-06T02:00", now: "2026-11-08T10:00", freshnessHours: 6 });
  ok(r.state === "UNKNOWN" && r.kind === "DATA_QUALITY" && r.certifies === false,
     "A STALE READING IS A DATA-QUALITY INCIDENT, NOT A SERVICE FAILURE", r);
  ok(r.action === "ALTERNATE_OBSERVATION", "and the response is an alternate observation request", r.action);
  ok(/marking it met is a lie and marking it breached pays a credit on a sensor fault/.test(r.say),
     "with both wrong answers named", r.say);
}
{
  const r = classifyObservation({ source: "sensor", reading: "HIGH", observedAt: "2026-11-08T09:00",
    now: "2026-11-08T10:00", freshnessHours: 6, corroboration: { source: "site inspection", reading: "NORMAL" } });
  ok(r.state === "DISPUTED" && r.certifies === false, "A DUAL EVIDENCE CONFLICT STAYS DISPUTED", r.state);
  ok(r.action === "CONTINUITY_ON_WORSE_CASE" && /coin toss/.test(r.say),
     "the continuity workflow runs on the worse case and the commercial question stays open", r.say);
}
{
  const p = slaPosition({ raisedAt: "2026-11-08T08:00",
    facts: { acknowledged: "2026-11-08T08:04", attended: "2026-11-08T17:00" },
    targetsHours: { acknowledged: 1, attended: 4 } });
  ok(p.breached.join() === "attended" && p.clocks.acknowledged.met === true,
     "FOUR MINUTES TO ANSWER AND NINE HOURS TO ARRIVE MEETS ONE TARGET AND MISSES ANOTHER — one number cannot say so", p.clocks);
  ok(/one number cannot say/.test(p.say), "and the result says it", p.say);
  ok(p.clocks.restored.met === null, "an unrecorded clock is null rather than failed", p.clocks.restored);
}

console.log("\n=== AT-16 · a credible critical alarm the contract covers ===\n");
{
  const r = emergencyCallout({ observation: { certifies: true }, contractAllows: true,
    bound: { cap: "£2,000", scope: "one tanker collection" } });
  ok(r.ok && r.issued && /issued once/.test(r.say), "AT-16 · A BOUNDED CALLOUT IS ISSUED ONCE", r.say);
  ok(/restoration workflow and the authority record continue separately/.test(r.say),
     "and the restoration and authority workflows continue separately", r.say);
}
{
  ok(!emergencyCallout({ observation: { certifies: true }, contractAllows: true, bound: { cap: "£2,000" } }).ok,
     "a callout with no scope is not bounded, and an unbounded emergency instruction is an open cheque");
  ok(emergencyCallout({ observation: { certifies: false, say: "stale" }, contractAllows: true, bound: { cap: "1", scope: "s" } }).reason === "NOT_CREDIBLE",
     "no callout on an observation that certifies nothing");
  ok(emergencyCallout({ observation: { certifies: true }, contractAllows: true, bound: { cap: "1", scope: "s" }, alreadyIssued: true }).reason === "ALREADY_ISSUED",
     "and a second callout is a second invoice for one attendance");
}

console.log("\n=== AT-19 · unknown mixed-service CIS or VAT treatment ===\n");
{
  const r = determineTax({ facts: { constructionOperations: true }, amount: "50000", materialityThreshold: "1000", scope: "code 13 package" });
  ok(!r.ok && r.blocksPublication, "AT-19 · AN UNDETERMINED TREATMENT BLOCKS FINANCIAL PUBLICATION", r);
  ok(r.reviewTask && r.reviewTask.kind === "TAX_REVIEW" && r.reviewTask.needs.length > 0,
     "and raises a scoped review rather than a guess", r.reviewTask);
  ok(/a default is wrong somewhere/.test(r.say), "because a default is wrong in one direction or the other", r.say);
  ok(/understated/.test(taxNotes(r).join(" ")) && /overstated/.test(taxNotes(r).join(" ")),
     "and the note names both errors", taxNotes(r));
}
{
  const r = determineTax({ facts: { mixedSupply: true, constructionOperations: true, partiesRegistered: true, paymentType: "labour",
    constructionServices: true, bothVatRegistered: true, endUser: false, cisApplies: true } });
  ok(!r.ok && r.mixedSupply && /wrong by construction/.test(r.say),
     "A MIXED SUPPLY HAS NO SINGLE TREATMENT — it is split by element or it is not determined", r.say);
}
{
  const r = determineTax({ facts: { constructionOperations: true, partiesRegistered: true, paymentType: "labour",
    constructionServices: true, bothVatRegistered: true, endUser: false, cisApplies: true } });
  ok(r.ok && r.cis.treatment === "CIS_DEDUCTION" && r.vat.treatment === "REVERSE_CHARGE",
     "with every fact known, both regimes resolve", r);
  const e = determineTax({ facts: { constructionOperations: true, partiesRegistered: true, paymentType: "labour",
    constructionServices: true, bothVatRegistered: true, endUser: true, cisApplies: true } });
  ok(e.vat.treatment === "STANDARD_VAT", "AND AN END USER TAKES IT OUT OF THE REVERSE CHARGE", e.vat);
}
{
  const r = determineTax({ facts: { constructionOperations: true }, amount: "50", materialityThreshold: "1000" });
  ok(!r.ok && !r.blocksPublication, "below materiality the unknown is recorded and does not block", r.blocksPublication);
}

console.log("\n=== AT-27 · publish to CONSTRUX while the connector is unavailable ===\n");
{
  const q = queueIntent({ queue: [], applied: [] }, { id: "i1", type: "PublishAvailability", connector: "construx", payload: { beds: 40 } });
  ok(q.ok && q.queued, "AT-27 · the intent is queued", q.say);
  const down = reconcileQueue(q.state, { connector: "construx", available: false });
  ok(down.waiting.join() === "i1" && down.sent.length === 0,
     "ETABLIX STAYS OPERATIONAL AND NOTHING IS LOST while the connector is down", down);
  ok(/operate independently of it/.test(down.say),
     "because a platform that stops when a downstream system does has made its own operation depend on somebody else's uptime", down.say);
  const up = reconcileQueue(down.state, { connector: "construx", available: true });
  ok(up.sent.join() === "i1" && up.state.queue.length === 0, "and it reconciles when the connector returns", up);
}
{
  const a = queueIntent({ queue: [], applied: [] }, { id: "i1", type: "X" });
  const b = queueIntent(a.state, { id: "i1", type: "X" });
  ok(b.duplicate && b.state.queue.length === 1, "the same intent twice is one intent", b.state.queue.length);
}

console.log("\n=== AT-28 · replay a duplicate telemetry, invoice or collection message ===\n");
{
  const first = applyInbound({ eventIds: [], versions: {} }, { eventId: "e1", aggregateId: "hire-17", aggregateVersion: 9, data: { collected: true } });
  ok(first.applied, "AT-28 · the first delivery applies", first.say);
  const replay = applyInbound(first.seen, { eventId: "e1", aggregateId: "hire-17", aggregateVersion: 9 });
  ok(replay.ok && !replay.applied && replay.duplicate, "THE REPLAY APPLIES THE EFFECT ONCE", replay);
}
{
  // The worse case: an OLDER message arriving after a newer one.
  const older = applyInbound({ eventIds: ["e1"], versions: { "hire-17": 9 } },
    { eventId: "e2", aggregateId: "hire-17", aggregateVersion: 8 });
  ok(!older.applied && older.superseded && older.audited,
     "AN OLDER VERSION DOES NOT OVERWRITE A NEWER ONE, AND IS AUDITED RATHER THAN DROPPED QUIETLY", older);
  ok(/silence about it is how it becomes permanent/.test(older.say),
     "because an out-of-order delivery is a real problem", older.say);
  ok(/OUT-OF-ORDER DELIVERY AUDITED/.test(outboxNotes(older).join(" ")), "and it reaches the notes", outboxNotes(older));
}
{
  const d = recordDispatch({ id: "notice-17", outcome: "UNKNOWN_OUTCOME" });
  ok(!d.ok && d.retryAllowed === false && d.reconcileFirst,
     "A TIMED-OUT SEND IS NOT A FAILED ONE — reconciled before anything is retried", d);
  ok(/a blind resend on a notice sends it twice/.test(d.say), "which is what a blind resend costs", d.say);
  ok(recordDispatch({ outcome: "REJECTED" }).retryAllowed === true, "a rejection may be retried, because it certainly did not land");
}
ok(!applyInbound({}, { eventId: "e1" }).ok, "an event with no aggregate or version is refused rather than applied once and hoped about");

console.log("\n=== AT-09 · overnight use added to a day-use cabin brief ===\n");
ok(OVERNIGHT_APPROVALS.length === 3, "AT-09 · three approvals only overnight use needs", OVERNIGHT_APPROVALS);
{
  const r = bedRequirement({ bedNights: 1200, nights: 30, roomStock: 50, bedsPerRoom: 1, turnaroundHours: 3, approvals: {} });
  ok(r.held && r.missingApprovals.length === 3, "OVERNIGHT OPENING IS HELD until its own approvals are evidenced", r.missingApprovals);
  ok(/separate use classification with its own fire requirement/.test(r.say),
     "and they are not the day cabin's consent", r.say);
  ok(/decided by the verifier and not by the layout/.test(r.say),
     "nor the layout's to decide", r.say);
}
{
  const r = bedRequirement({ bedNights: 1200, nights: 30, roomStock: 50, turnaroundHours: 3,
    approvals: { fireApproval: true, occupationApproval: true, useClassification: true } });
  ok(r.ok && r.bedsNeeded === 40 && r.effectiveBeds === 43,
     "40 beds from bed-nights, against 43 effective after a 3-hour turnaround", r);
  const noTurn = bedRequirement({ bedNights: 1200, nights: 30, roomStock: 40,
    approvals: { fireApproval: true, occupationApproval: true, useClassification: true } });
  ok(noTurn.effectiveBeds === 40 && !noTurn.turnaroundApplied,
     "and with no turnaround supplied the figure is reported as not applied rather than assumed zero", noTurn);
}
{
  const r = bedRequirement({ bedNights: 130, nights: null, roomStock: 50 });
  ok(!r.ok && /a headcount is not bed-night demand/.test(r.say),
     "A HEADCOUNT IS NOT BED-NIGHT DEMAND — overnight accommodation is not larger day-use welfare", r.say);
}
{
  const day = peakConcurrency({ cohorts: [{ id: "shift A", count: 72 }], nominal: 72 });
  const night = bedRequirement({ bedNights: 1200, nights: 30, roomStock: 10, approvals: {} });
  const s = welfareSplit({ dayUse: day, overnight: night });
  ok(s.dayUseOpens === true && s.overnightOpens === false,
     "THE DAY-USE WELFARE THAT PASSED STAYS OPEN while the overnight opening is held", s);
  ok(/held overnight opening does not close the welfare that passed/.test(s.say), "and the split says so", s.say);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
