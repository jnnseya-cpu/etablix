/**
 * The write side of both platforms, and the webhooks in both directions.
 *
 *   node backend/test/platformwrite.test.mjs
 *
 * WHY THIS EXISTS. Five things were true of this system at once, and each
 * one was invisible from the screens:
 *
 *   1. CONSTRUX had no write path beyond a RAG override, so every schedule
 *      activity, inspection, non-conformance, RFI and reading came from the
 *      seed and could only ever come from the seed.
 *   2. A CONSTRUX platform token could be entered, stored, tested and shown
 *      as connected — and then ignored by every read on the page. The badge
 *      said connected and the numbers came from somewhere else.
 *   3. The Platform API was read-mostly: six reads and an agent run.
 *   4. Both platforms were polled. Polling is fine for a dashboard and wrong
 *      for anything with a deadline in it.
 *   5. Write scopes, once added, would have been unreachable: a key could
 *      only arrive in the seed.
 *
 * What this suite pins is the part that can silently stop being true. Every
 * validator here refuses a row that is INTERNALLY IMPOSSIBLE rather than
 * warning about it, and those are the checks worth a test: a missing field is
 * caught by anybody reading the row, while a row that contradicts itself
 * reads perfectly and gets believed.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-pw-"));
process.env.ETABLIX_DATA_DIR = scratch;

const store = await import("../lib/store.js");
const cx = await import("../lib/construx.js");
const vx = await import("../lib/veryx.js");
const wh = await import("../lib/webhooks.js");
const platforms = await import("../lib/platforms.js");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

const PROJECTS = store.collection("projects");
const P = PROJECTS[0].id;
const ctx = { projects: PROJECTS };
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const PAST = iso(Date.now() - 30 * DAY);
const FUTURE = iso(Date.now() + 30 * DAY);

/* ================================================ CONSTRUX validators */

console.log("\n=== the contradictions CONSTRUX refuses ===\n");

console.log("--- an inspection recorded as passed with failures listed\n");
{
  const good = { projectId: P, type: "Welfare compound handover", inspector: "R Aliu", status: "passed", date: PAST, items: 24, failures: 0, score: 96 };
  ok(cx.validateInspection(good, ctx).ok, "a clean pass is accepted");

  const r = cx.validateInspection({ ...good, failures: 3 }, ctx);
  ok(!r.ok, "a pass with three failures is refused");
  ok(/PASSED with 3 failure/.test(r.faults[0]), "and the refusal names the contradiction rather than the field", r.faults[0]);
  ok(r.record === null, "no record comes back from a refusal, so a caller cannot write it anyway");

  ok(!cx.validateInspection({ ...good, status: "failed", failures: 0 }, ctx).ok,
     "and a FAIL with no failures listed is refused the same way — whatever failed has to be written down");
  ok(!cx.validateInspection({ ...good, status: "scheduled", score: 88 }, ctx).ok,
     "a score on an inspection that has not happened yet is refused");
  ok(!cx.validateInspection({ ...good, items: 4, failures: 9 }, ctx).ok,
     "more things failed than were checked is refused");
  ok(!cx.validateInspection({ ...good, inspector: "" }, ctx).ok,
     "an inspection nobody signed is not an inspection");
}

console.log("\n--- an activity that ends before it starts\n");
{
  const good = { projectId: P, activity: "Pile cap pour, grid B", phase: "Delivery", start: PAST, end: FUTURE, progress: 40 };
  ok(cx.validateActivity(good, ctx).ok, "a normal activity is accepted");

  const r = cx.validateActivity({ ...good, start: FUTURE, end: PAST }, ctx);
  ok(!r.ok && /ends before it starts/.test(r.faults.join(" ")), "reversed dates are refused", r.faults[0]);

  const c = cx.validateActivity({ ...good, progress: 100, end: FUTURE }, ctx);
  ok(!c.ok && /100% complete/.test(c.faults.join(" ")), "100 per cent complete with a future end date is refused", c.faults[0]);
  ok(cx.validateActivity({ ...good, progress: 100, end: PAST }, ctx).ok, "but complete in the past is fine");

  ok(!cx.validateActivity({ ...good, start: "next Tuesday" }, ctx).ok, "a description of a date is not a date");
  ok(!cx.validateActivity({ ...good, progress: 140 }, ctx).ok, "progress past 100 is refused");
  ok(!cx.validateActivity({ ...good, phase: "Snagging" }, ctx).ok, "an unknown phase is refused rather than stored");
  ok(!cx.validateActivity({ ...good, projectId: "P-nonexistent" }, ctx).ok,
     "and a record against a project that does not exist is refused — nobody would ever find it");
}

console.log("\n--- a non-conformance closed by changing a dropdown\n");
{
  const good = { projectId: P, title: "Cable containment omitted at grid E/4", severity: "major", status: "open", assignedTo: "M Feld" };
  ok(cx.validateNcr(good, ctx).ok, "an open NCR with an owner is accepted");

  const r = cx.validateNcr({ ...good, status: "closed" }, ctx);
  ok(!r.ok && /no closure evidence/.test(r.faults.join(" ")), "closed with nothing closing it is refused", r.faults[0]);

  const closed = { ...good, status: "closed", closureEvidence: "Containment installed and witnessed, photo set 214-219", closedBy: "M Feld", closedAt: PAST };
  ok(cx.validateNcr(closed, ctx).ok, "closed with evidence, a closer and a date is accepted");

  const crit = cx.validateNcr({ ...closed, severity: "critical" }, ctx);
  ok(!crit.ok && /second person/.test(crit.faults.join(" ")),
     "a CRITICAL closed without a second person verifying it is refused — the severity is the reason", crit.faults[0]);
  ok(cx.validateNcr({ ...closed, severity: "critical", verifiedBy: "J Nseya" }, ctx).ok, "with a verifier it is accepted");
  ok(!cx.validateNcr({ ...good, assignedTo: "" }, ctx).ok, "an unassigned non-conformance is a defect with no owner");
  ok(!cx.validateNcr({ ...good, title: "Bad cable" }, ctx).ok, "a title too short to identify the defect later is refused");
}

console.log("\n--- an RFI closed without its answer\n");
{
  const good = { projectId: P, subject: "Confirm earthing arrangement at transformer bay", status: "open", priority: "high", raisedBy: "R Aliu" };
  ok(cx.validateRfi(good, ctx).ok, "an open RFI is accepted");
  const r = cx.validateRfi({ ...good, status: "answered" }, ctx);
  ok(!r.ok && /no answer recorded/.test(r.faults.join(" ")), "answered with no answer is refused", r.faults[0]);
  ok(cx.validateRfi({ ...good, status: "answered", answer: "Bonded to the main earth bar per drawing E-204 rev C.", answeredBy: "Design" }, ctx).ok,
     "with the answer and who gave it, accepted");
  const crit = cx.validateRfi({ ...good, priority: "critical" }, ctx);
  ok(!crit.ok && /needed by/.test(crit.faults.join(" ")),
     "a critical RFI with no date it is needed by is refused — the priority is the claim, the date is what makes it actionable", crit.faults[0]);
}

console.log("\n--- an alarm switched off at the point of entry\n");
{
  const good = { projectId: P, sensor: "NOISE-04", kind: "noise", location: "North boundary", value: 62, unit: "dB", threshold: 85, status: "ok" };
  ok(cx.validateReading(good, ctx).ok, "a reading below its threshold marked ok is accepted");

  const r = cx.validateReading({ ...good, value: 92 }, ctx);
  ok(!r.ok && /alarm switched off/.test(r.faults.join(" ")), "a reading above its threshold marked OK is refused", r.faults[0]);
  ok(cx.validateReading({ ...good, value: 92, status: "alarm" }, ctx).ok, "the same reading marked as an alarm is accepted");

  ok(!cx.validateReading({ ...good, unit: "" }, ctx).ok, "a bare number is not a measurement");
  ok(!cx.validateReading({ ...good, location: "" }, ctx).ok, "a reading from nowhere cannot be acted on");
  const off = cx.validateReading({ ...good, status: "offline" }, ctx);
  ok(!off.ok && /offline with a value/.test(off.faults.join(" ")), "offline with a value is refused — it came from somewhere else", off.faults[0]);
  // THE GAP THIS FOUND. The value was required for every status, so an
  // offline sensor could not be recorded at all: with a value it was refused
  // as a reading from a sensor that is not reporting, and without one it was
  // refused as a missing number. A sensor that had stopped sending was
  // therefore the one thing that could not be written down.
  const offline = cx.validateReading({ ...good, status: "offline", value: null, threshold: null }, ctx);
  ok(offline.ok && offline.record.value === null, "an offline sensor is recordable, and stores no value at all", offline.faults?.join(" | "));
  ok(!cx.validateReading({ projectId: P, status: "offline" }, ctx).ok,
     "but it still has to say which sensor and where — 'one of them stopped' is not actionable");
  ok(!cx.validateReading({ ...good, value: undefined }, ctx).ok, "and a reporting sensor with no value is still refused");
}

console.log("\n--- zero is a number, and an empty string is not zero\n");
{
  // This is the num() lesson, retested here because the validators are the
  // place it would come back: Number(null) is 0 and Number("") is 0, so a
  // blank progress field would have read as an activity that has not started
  // and a blank failure count as a clean inspection.
  const a = cx.validateActivity({ projectId: P, activity: "Trial pit", start: PAST, end: FUTURE, progress: 0 }, ctx);
  ok(a.ok && a.record.progress === 0, "progress of zero is accepted and stored as zero");
  ok(!cx.validateActivity({ projectId: P, activity: "Trial pit", start: PAST, end: FUTURE, progress: "" }, ctx).ok,
     "progress of empty string is refused, not read as zero");
  ok(!cx.validateActivity({ projectId: P, activity: "Trial pit", start: PAST, end: FUTURE, progress: null }, ctx).ok,
     "and neither is null");
  ok(!cx.validateReading({ projectId: P, sensor: "S1", kind: "dust", location: "Gate", value: "", unit: "µg/m³", threshold: 50, status: "ok" }, ctx).ok,
     "an empty reading value is refused rather than recorded as a clean zero");
}

console.log("\n--- references continue from the highest ever used\n");
{
  const rows = [{ ref: "NCR-001" }, { ref: "NCR-017" }, { ref: "NCR-009" }, { ref: "not-a-ref" }];
  ok(cx.nextRef(rows, "ref", "NCR") === "NCR-018", "the next reference follows the highest, not the count", cx.nextRef(rows, "ref", "NCR"));
  ok(cx.nextRef([], "ref", "INS") === "INS-001", "and an empty series starts at 001");
  // The highest rather than the count, because a deleted row must not cause a
  // reference to be reused: two NCR-004s in a history is worse than a gap.
  ok(cx.nextRef([{ ref: "NCR-004" }], "ref", "NCR") === "NCR-005", "a gap is preferred to a reused reference");
}

console.log("\n--- every collection has a validator, and every validator a collection\n");
{
  const names = Object.keys(cx.VALIDATORS);
  ok(names.length === 5, "five record types", names.join(", "));
  ok(names.every((n) => typeof cx.VALIDATORS[n] === "function"), "each resolving to a function");
  ok(Object.keys(cx.REF_FIELDS).every((n) => names.includes(n)), "and every reference series belongs to one of them");
}

/* =================================================== VERYX risk writes */

console.log("\n=== the risk register ===\n");

console.log("--- a score that is not the product of its own assessment\n");
{
  const good = { projectId: P, title: "Accommodation module lead time", category: "procurement", status: "open", probability: 4, impact: 5, owner: "M Feld" };
  const r = vx.validateRisk(good, ctx);
  ok(r.ok && r.record.score === 20, "the score is computed from probability and impact", r.record?.score);

  const bad = vx.validateRisk({ ...good, score: 12 }, ctx);
  ok(!bad.ok && /multiply to 20/.test(bad.faults[0]),
     "a submitted score that disagrees with the assessment is REFUSED, not silently overwritten", bad.faults[0]);
  ok(vx.validateRisk({ ...good, score: 20 }, ctx).ok, "one that agrees is accepted");

  ok(!vx.validateRisk({ ...good, probability: 7 }, ctx).ok, "probability outside 1 to 5 is refused");
  ok(!vx.validateRisk({ ...good, impact: 2.5 }, ctx).ok, "and a fractional impact is refused — the scale is integers");
}

console.log("\n--- a risk that leaves the register while the exposure stays\n");
{
  const base = { projectId: P, title: "Accommodation module lead time", category: "procurement", probability: 2, impact: 2, owner: "M Feld" };
  ok(!vx.validateRisk({ ...base, status: "closed" }, ctx).ok, "closed with no mitigation is refused");
  ok(!vx.validateRisk({ ...base, status: "mitigating" }, ctx).ok, "and so is 'mitigating' with nothing written as the mitigation");
  ok(vx.validateRisk({ ...base, status: "closed", mitigation: "Order placed, phased occupation fallback sequenced." }, ctx).ok,
     "with the mitigation recorded, accepted");
  const real = vx.validateRisk({ ...base, status: "realised" }, ctx);
  ok(!real.ok && /what actually happened/.test(real.faults.join(" ")),
     "and a realised risk with no record of what happened is refused — it is the only evidence the register produces about its own scoring", real.faults[0]);
}

console.log("\n--- an unowned risk that somebody scored and left\n");
{
  const high = { projectId: P, title: "Accommodation module lead time", category: "procurement", status: "open", probability: 4, impact: 5 };
  ok(!vx.validateRisk(high, ctx).ok, "no owner at a score of 20 is refused");
  ok(vx.validateRisk({ ...high, probability: 1, impact: 2 }, ctx).ok, "a score of 2 with no owner is accepted — the threshold is the point");
  ok(!vx.validateRisk({ ...high, category: "vibes" }, ctx).ok, "an unknown category is refused");
}

/* ======================================================= the scopes */

console.log("\n=== the API scopes are the permissions ===\n");
{
  const src = fs.readFileSync(new URL("../routes/veryx-public.js", import.meta.url), "utf8");
  const required = [...src.matchAll(/requireApiKey\("([^"]+)"\)/g)].map((m) => m[1]);
  ok(required.length >= 10, `${required.length} scope-gated endpoints found in the source`, required.join(", "));

  const undocumented = required.filter((s) => !vx.SCOPE_NAMES.includes(s));
  ok(undocumented.length === 0,
     "every scope an endpoint demands is in the published catalogue — otherwise a key can be refused by a permission nobody can look up",
     undocumented.join(", "));

  const unused = vx.SCOPE_NAMES.filter((s) => !required.includes(s));
  ok(unused.length === 0,
     "and every published scope is demanded by an endpoint — otherwise a documented permission grants nothing",
     unused.join(", "));

  const writes = vx.writeScopes(vx.SCOPE_NAMES);
  ok(writes.length === 4 && writes.includes("write:webhooks"),
     "four scopes can change something, and registering a webhook is one of them", writes.join(", "));
  ok(!vx.writeScopes(["read:projects", "read:risks", "read:usage"]).length,
     "and a read-only key holds none of them");
}

/* ==================================================== outbound webhooks */

console.log("\n=== webhooks, outbound ===\n");

console.log("--- what a subscription has to be\n");
{
  const r = wh.subscribe({ url: "http://example.com/hook", events: ["veryx.risk.created"], by: "tester" });
  ok(!r.ok && /must be https/.test(r.faults[0]), "http is refused: over http it carries project data in the clear", r.faults[0]);
  ok(!wh.subscribe({ url: "https://example.com/h", events: [], by: "tester" }).ok, "a subscription to no events is refused");
  ok(!wh.subscribe({ url: "https://example.com/h", events: ["made.up.event"], by: "tester" }).ok, "an unknown event is refused");
  ok(!wh.subscribe({ url: "https://example.com/h", events: ["veryx.risk.created"] }).ok, "and a subscription nobody is named on is refused");

  const good = wh.subscribe({ url: "https://example.com/hook", events: ["veryx.risk.created", "etablix.timebar.passed"], by: "tester" });
  ok(good.ok && good.secret.startsWith("whsig_"), "a good one is accepted and returns a signing secret");
  ok(good.secret.length > 40, "of real length", good.secret.length);

  const listed = wh.subscriptions().find((s) => s.id === good.subscription.id);
  ok(listed && listed.secretShown === false && listed.secret === undefined,
     "and the secret is never in the listing again — a secret a system can re-read is a secret in a log");
}

console.log("\n--- a delivery is signed over the timestamp AND the body\n");
{
  const secret = "whsig_test";
  const body = JSON.stringify({ event: "veryx.risk.created", data: { id: "r1" } });
  const now = Date.now();
  const sig = wh.sign(secret, now, body);

  ok(wh.verify({ secret, timestamp: now, signature: sig, rawBody: body, now }).ok, "a fresh, correctly signed delivery verifies");
  ok(/^[0-9a-f]{64}$/.test(sig), "the signature is a hex SHA-256", sig.slice(0, 16));

  const tampered = wh.verify({ secret, timestamp: now, signature: sig, rawBody: body.replace("r1", "r2"), now });
  ok(!tampered.ok && /does not match/.test(tampered.reason), "a changed body does not verify", tampered.reason);

  const replayed = wh.verify({ secret, timestamp: now - 10 * 60 * 1000, signature: wh.sign(secret, now - 10 * 60 * 1000, body), rawBody: body, now });
  ok(!replayed.ok && /outside the 300s window/.test(replayed.reason),
     "a PERFECTLY VALID signature from ten minutes ago is refused — the signature proves who, the timestamp is what stops a replay", replayed.reason);

  const future = wh.verify({ secret, timestamp: now + 10 * 60 * 1000, signature: wh.sign(secret, now + 10 * 60 * 1000, body), rawBody: body, now });
  ok(!future.ok, "and so is one from ten minutes in the future — the window is absolute, not one-sided");

  ok(!wh.verify({ secret, timestamp: now, signature: null, rawBody: body, now }).ok, "no signature, no acceptance");
  ok(!wh.verify({ secret, timestamp: "whenever", signature: sig, rawBody: body, now }).ok, "a timestamp that is not a number is refused, not read as zero");
  ok(!wh.verify({ secret: null, timestamp: now, signature: sig, rawBody: body, now }).ok, "and with no secret configured, nothing is accepted at all");
  ok(!wh.verify({ secret, timestamp: now, signature: "short", rawBody: body, now }).ok,
     "a signature of the wrong length is refused without throwing — the throw would itself be the timing leak");
  ok(!wh.verify({ secret: "whsig_other", timestamp: now, signature: sig, rawBody: body, now }).ok, "the wrong secret does not verify");
}

console.log("\n--- a delivery that fails does not fail the operation behind it\n");
{
  const sub = wh.subscribe({ url: "https://receiver.invalid/hook", events: ["construx.ncr.created"], by: "tester" });
  const sent = [];
  const okFetch = async (url, init) => { sent.push({ url, init }); return { status: 202 }; };

  const r1 = await wh.emitWebhook("construx.ncr.created", { ref: "NCR-001" }, { fetchImpl: okFetch });
  ok(r1.ok && r1.delivered === 1, "one subscriber, one delivery", JSON.stringify(r1));
  ok(sent[0].init.headers["x-etablix-signature"], "the delivery carries a signature header");
  ok(sent[0].init.headers["x-etablix-timestamp"], "and a timestamp header");
  ok(wh.verify({
    secret: sub.secret,
    timestamp: sent[0].init.headers["x-etablix-timestamp"],
    signature: sent[0].init.headers["x-etablix-signature"],
    rawBody: sent[0].init.body,
    now: Number(sent[0].init.headers["x-etablix-timestamp"]),
  }).ok, "and the receiver can verify it with the secret it was given at subscription");

  const thrower = async () => { throw new Error("ECONNREFUSED"); };
  const r2 = await wh.emitWebhook("construx.ncr.created", { ref: "NCR-002" }, { fetchImpl: thrower });
  ok(r2.delivered === 0 && r2.attempted === 1, "a refused connection is recorded rather than thrown back at the caller", JSON.stringify(r2));

  const log = wh.deliveries({ limit: 10 });
  ok(log.some((d) => d.ok === true) && log.some((d) => d.ok === false), "both outcomes are in the delivery log");
  ok(log[0].at >= log[log.length - 1].at, "newest first");

  // Nine more failures takes it to ten consecutive, which is the pause.
  for (let i = 0; i < 9; i++) await wh.emitWebhook("construx.ncr.created", { ref: `NCR-${i}` }, { fetchImpl: thrower });
  const paused = wh.subscriptions().find((s) => s.id === sub.subscription.id);
  ok(paused.active === false, `paused after ${wh.FAILURE_LIMIT} consecutive failures rather than retried for ever`, paused.failures);

  const r3 = await wh.emitWebhook("construx.ncr.created", { ref: "NCR-after" }, { fetchImpl: okFetch });
  ok(r3.delivered === 0, "and a paused subscription receives nothing further", JSON.stringify(r3));
}

console.log("\n--- a failure against one subscriber does not stop another\n");
{
  const a = wh.subscribe({ url: "https://a.example.com/hook", events: ["veryx.run.finished"], by: "tester" });
  const b = wh.subscribe({ url: "https://b.example.com/hook", events: ["veryx.run.finished"], by: "tester" });
  const flaky = async (url) => { if (url.includes("a.example")) throw new Error("down"); return { status: 200 }; };
  const r = await wh.emitWebhook("veryx.run.finished", { runId: "x" }, { fetchImpl: flaky });
  ok(r.attempted === 2 && r.delivered === 1, "two attempted, one delivered", JSON.stringify(r));
  ok(r.ok === false, "and the result says not everything landed rather than reporting a success");
  const rows = wh.subscriptions();
  ok(rows.find((s) => s.id === a.subscription.id).failures === 1, "the failure is counted against the one that failed");
  ok(rows.find((s) => s.id === b.subscription.id).failures === 0, "and not against the one that did not");
}

console.log("\n--- an event nobody subscribes to, and one that does not exist\n");
{
  const r = await wh.emitWebhook("etablix.timebar.approaching", { in: "2 days" }, { fetchImpl: async () => ({ status: 200 }) });
  ok(r.ok && r.delivered === 0 && /nobody is subscribed/.test(r.reason), "no subscribers is not a failure", r.reason);
  const bad = await wh.emitWebhook("made.up.event", {}, { fetchImpl: async () => ({ status: 200 }) });
  ok(!bad.ok && /not a webhook event/.test(bad.reason), "an event this system does not emit is refused at the emit", bad.reason);
}

console.log("\n--- the catalogue\n");
{
  ok(wh.EVENTS.length === 15, `${wh.EVENTS.length} outbound events`, wh.EVENTS.length);
  ok(new Set(wh.EVENTS).size === wh.EVENTS.length, "no duplicates");
  ok(wh.EVENTS.every((e) => /^(construx|veryx|etablix)\.[a-z]+\.[a-z]+$/.test(e)), "each one named platform.thing.happened");
  // The events must exist for the routes that emit them, or a write path
  // silently emits nothing: emitWebhook refuses an unknown event.
  const emitted = new Set();
  for (const f of ["../routes/construx.js", "../routes/veryx.js", "../routes/veryx-public.js"]) {
    const src = fs.readFileSync(new URL(f, import.meta.url), "utf8");
    for (const m of src.matchAll(/emitWebhook\("([^"]+)"/g)) emitted.add(m[1]);
    for (const m of src.matchAll(/event: "([^"]+)"/g)) emitted.add(m[1]);
  }
  const missing = [...emitted].filter((e) => !wh.EVENTS.includes(e));
  ok(missing.length === 0, `every event the routes emit is in the catalogue (${emitted.size} emitted)`, missing.join(", "));
}

/* ===================================================== inbound webhooks */

console.log("\n=== webhooks, inbound ===\n");
{
  ok(wh.inboundSecret({ create: false }) === null || typeof wh.inboundSecret({ create: false }) === "string",
     "the inbound secret is absent until it is minted, not defaulted");
  const minted = wh.inboundSecret();
  ok(minted.startsWith("whsec_"), "minting produces one");
  ok(wh.inboundSecret() === minted, "and re-reading returns the same one rather than rotating by accident");
  const rotated = wh.rotateInboundSecret("tester");
  ok(rotated !== minted, "rotating replaces it");
  const body = "{}";
  const now = Date.now();
  ok(!wh.verify({ secret: rotated, timestamp: now, signature: wh.sign(minted, now, body), rawBody: body, now }).ok,
     "and the old secret stops working immediately, which is the point of rotating");
}

console.log("\n--- a valid signature proves who sent it and nothing more\n");
{
  ok(wh.INBOUND_ALLOWED.length === 3, "three inbound events are accepted", wh.INBOUND_ALLOWED.length);
  ok(wh.INBOUND_ALLOWED.every((r) => r.writes === false),
     "and NONE of them writes. A leaked secret must not be able to close a defect, certify a payment or run an agent.");

  const good = wh.acceptInbound({ event: "platform.reading.alarm", payload: { sensor: "NOISE-04", value: 92 } });
  ok(good.ok, "an allowed inbound event is recorded");

  const before = store.collection("ncrs").length;
  const refused = wh.acceptInbound({ event: "platform.ncr.close", payload: { ref: "NCR-001" } });
  ok(!refused.ok, "closing a non-conformance over a webhook is refused");
  ok(/not an inbound event/.test(refused.reason), "and the refusal says why", refused.reason);
  ok(Array.isArray(refused.allowed) && refused.allowed.length === 3, "listing what it could have sent instead");
  ok(store.collection("ncrs").length === before, "and nothing was written");

  const inbound = wh.deliveries({ limit: 20 }).filter((d) => d.direction === "inbound");
  ok(inbound.length === 1 && inbound[0].event === "platform.reading.alarm", "the accepted one is in the delivery log, marked inbound");
}

/* ==================================================== route discovery */

console.log("\n=== the connection is used, or the response says why not ===\n");
{
  const listed = platforms.normaliseRoutes({ routes: ["GET /v1/projects", "POST /v1/ncrs", "/v1/projects/{id}"] });
  ok(listed.length === 3, "a route list of strings is read", listed.length);
  ok(platforms.advertises(listed, "/v1/projects") === true, "an advertised path is found");
  ok(platforms.advertises(listed, "/v1/projects/P-4") === true, "and a templated one covers a concrete path");
  ok(platforms.advertises(listed, "/v1/schedule") === false, "one the platform did not list is reported absent");
  ok(platforms.advertises(listed, "/v1/ncrs") === false, "and a GET is not satisfied by a POST of the same path");
  ok(platforms.advertises(null, "/v1/anything") === null,
     "an unreadable route list is UNKNOWN, not 'serves nothing' — the caller must try the call rather than assume");

  const objects = platforms.normaliseRoutes({ endpoints: [{ method: "get", path: "/v1/sensors" }, { route: "/v1/rfis" }] });
  ok(objects.length === 2 && objects[0].method === "GET", "a list of objects is read too, and the method is normalised");
  ok(platforms.normaliseRoutes({ hello: "world" }) === null, "and a response with no route list reads as unknown");
  ok(platforms.normaliseRoutes({ routes: [] }) === null, "as does an empty one — it is more likely a shape we cannot read than a platform with no API");

  // The reason this exists: without it, a path the platform does not serve
  // and a platform that is down produce the same fallback with the same
  // note, and the note blames the wrong one.
  const src = fs.readFileSync(new URL("../routes/construx.js", import.meta.url), "utf8");
  const reads = [...src.matchAll(/fromPlatform\(\s*\n?\s*[`"]([^`"]+)/g)].map((m) => m[1]);
  ok(reads.length >= 7, `${reads.length} CONSTRUX reads go through the platform-or-workspace path`, reads.join(", "));
  ok(src.includes("advertises(await platformRoutes"), "and each asks the platform what it serves before calling a path");
  ok(/isConnected\("construx"\)/.test(src), "the connection is checked, so a stored token is actually used");
}

console.log("\n--- the ledger records the write, and says so when it cannot\n");
{
  const r = store.recordLedger("construx.ncrs.created", "NCR-999", "tester", "a test row");
  ok(r.ok === true, "a ledger write reports success rather than returning nothing");
  ok(store.ledger({ limit: 5 }).some((e) => e.ref === "NCR-999"), "and the entry is readable");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
fs.rmSync(scratch, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
