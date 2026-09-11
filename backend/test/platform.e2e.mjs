/**
 * The write paths, over HTTP, on a running server.
 *
 *   BASE=http://localhost:3391 node backend/test/platform.e2e.mjs
 *
 * WHAT THIS PROVES. The validators are unit-tested; this is about whether
 * the routes actually reach them, and whether the permissions hold when the
 * request comes from outside rather than from a test importing a module.
 *
 *   1. CONSTRUX writes exist, and refuse a contradictory record with a 400
 *      that names the contradiction — including on a PATCH, where the patch
 *      is individually valid and the MERGED row is impossible.
 *   2. A site engineer can read delivery records and not change them.
 *   3. The Platform API can write, each write behind its own scope, and a
 *      read-only key is refused.
 *   4. A key can be minted at all, and a revoked one stops working
 *      immediately — including on the endpoints that need no scope.
 *   5. The inbound webhook endpoint verifies a signature over the RAW bytes,
 *      refuses a replay whose signature is perfectly valid, and refuses to
 *      do anything but record even when the signature is right.
 */
import crypto from "node:crypto";

const B = process.env.BASE || "http://localhost:3391";
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + JSON.stringify(x).slice(0, 400) : ""))); };
const J = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t.slice(0, 400) }; } };
const api = async (p, o = {}, tok) => {
  const h = { ...(o.headers || {}) };
  if (tok) h.Authorization = "Bearer " + tok;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h });
  return { status: r.status, body: await J(r) };
};
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const PAST = iso(Date.now() - 30 * DAY);
const FUTURE = iso(Date.now() + 30 * DAY);

console.log("\n=== the platform write paths ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token;
ok(r.status === 200 && Boolean(T), "admin signs in");

const projects = (await api("/api/construx/projects", {}, T)).body.projects;
const P = projects[0].id;
ok(projects.length > 0, `${projects.length} projects to write against`);

console.log("\n--- the reads say where they came from\n");
{
  const g = await api("/api/construx/schedule", {}, T);
  ok(g.status === 200 && Array.isArray(g.body.schedule), "the schedule reads");
  ok(g.body.source?.kind === "workspace", "and says the source is the workspace, because no CONSTRUX token is connected", g.body.source);
  const c = await api("/api/construx/sensors", {}, T);
  ok(c.body.source?.label === "ETABLIX workspace", "so does the sensor read", c.body.source);
  const one = await api(`/api/construx/projects/${P}`, {}, T);
  ok(one.status === 200 && one.body.source?.kind === "workspace" && one.body.rollUpsFrom, "and the project detail, with its roll-ups attributed");
}

console.log("\n--- a non-conformance, created over the API\n");
let ncrId = null;
{
  const c = await api("/api/construx/ncrs", { json: {
    projectId: P, title: "Cable containment omitted at grid E/4", severity: "major",
    status: "open", assignedTo: "M Feld",
  } }, T);
  ok(c.status === 201, "a valid NCR is created", c.body);
  ncrId = c.body.ncrs?.id;
  ok(/^NCR-\d{3}$/.test(c.body.ncrs?.ref || ""), "with a reference allocated by the server, not the caller", c.body.ncrs?.ref);
  ok(c.body.ncrs?.createdBy, "and an author recorded", c.body.ncrs?.createdBy);

  const g = await api("/api/construx/ncrs", {}, T);
  ok(g.body.ncrs.some((n) => n.id === ncrId), "and it is in the register");
}

console.log("\n--- the merged row is what is validated, not the patch\n");
{
  const bad = await api(`/api/construx/ncrs/${ncrId}`, { method: "PATCH", json: { status: "closed" } }, T);
  ok(bad.status === 400, "closing it by changing one field is refused", bad.status);
  ok(/closure evidence/.test(bad.body.error || ""), "and the message says what is missing and why it matters", bad.body.error);

  const good = await api(`/api/construx/ncrs/${ncrId}`, { method: "PATCH", json: {
    status: "closed", closureEvidence: "Containment installed and witnessed, photo set 214-219",
    closedBy: "M Feld", closedAt: PAST,
  } }, T);
  ok(good.status === 200 && good.body.ncrs.status === "closed", "with evidence, a closer and a date, it closes", good.body.error);
  ok(good.body.ncrs.ref, "and keeps its reference", good.body.ncrs.ref);
}

console.log("\n--- an inspection recorded as passed with failures listed\n");
{
  const c = await api("/api/construx/inspections", { json: {
    projectId: P, type: "Welfare compound handover", inspector: "R Aliu",
    status: "in_progress", date: PAST, items: 24, failures: 3,
  } }, T);
  ok(c.status === 201, "an in-progress inspection with three failures is fine", c.body);
  const id = c.body.inspections.id;

  // Two individually valid fields, one impossible record. This is the patch
  // the route has to catch, because neither half looks wrong on its own.
  const p = await api(`/api/construx/inspections/${id}`, { method: "PATCH", json: { status: "passed" } }, T);
  ok(p.status === 400 && /PASSED with 3 failure/.test(p.body.error || ""),
     "marking it passed while the failures stand is refused", p.body.error);

  const fixed = await api(`/api/construx/inspections/${id}`, { method: "PATCH", json: { status: "passed", failures: 0, score: 98 } }, T);
  ok(fixed.status === 200, "resolving the failures first lets it pass", fixed.body.error);
}

console.log("\n--- an alarm cannot be switched off at the point of entry\n");
{
  const c = await api("/api/construx/sensors", { json: {
    projectId: P, sensor: "NOISE-04", kind: "noise", location: "North boundary",
    value: 92, unit: "dB", threshold: 85, status: "ok",
  } }, T);
  ok(c.status === 400 && /alarm switched off/.test(c.body.error || ""), "92dB against an 85dB threshold marked OK is refused", c.body.error);

  const a = await api("/api/construx/sensors", { json: {
    projectId: P, sensor: "NOISE-04", kind: "noise", location: "North boundary",
    value: 92, unit: "dB", threshold: 85, status: "alarm",
  } }, T);
  ok(a.status === 201, "the same reading marked as an alarm is accepted", a.body);

  const d = await api(`/api/construx/sensors/${a.body.sensors.id}`, { method: "DELETE", json: {} }, T);
  ok(d.status === 400, "and deleting a reading with no reason is refused", d.status);
  const d2 = await api(`/api/construx/sensors/${a.body.sensors.id}`, { method: "DELETE", json: { reason: "duplicate from a double-posting adapter" } }, T);
  ok(d2.status === 200, "with a reason it is removed", d2.body);
}

console.log("\n--- the delivery record cannot be deleted at all\n");
{
  for (const path of ["schedule", "inspections", "ncrs", "rfis"]) {
    const d = await api(`/api/construx/${path}/anything`, { method: "DELETE", json: { reason: "inconvenient" } }, T);
    ok(d.status === 404, `DELETE /${path} does not exist — a record entered in error is superseded, not removed`, d.status);
  }
}

console.log("\n--- reading is not changing\n");
{
  // The QA inspector is the account that makes the point: they are the person
  // who carries out the inspections and they are not in DELIVERY_FINANCE, so
  // they read the register and cannot change it.
  const qa = await api("/api/auth/login", { json: { email: "qa@etablix.com", password: "etablix-qa-2026" } });
  ok(qa.status === 200, "the QA inspector signs in", qa.body);
  const Q = qa.body.token;

  ok((await api("/api/construx/ncrs", {}, Q)).status === 200, "and reads the non-conformance register");
  ok((await api("/api/construx/inspections", {}, Q)).status === 200, "and the inspections");

  const w = await api("/api/construx/ncrs", { json: {
    projectId: P, title: "Something they noticed on site today", severity: "minor", status: "open", assignedTo: "Them",
  } }, Q);
  ok(w.status === 403, "but cannot write to the register", w.status);
  const p2 = await api("/api/construx/inspections/anything", { method: "PATCH", json: { status: "passed" } }, Q);
  ok(p2.status === 403, "nor patch an inspection", p2.status);
  const rag = await api(`/api/construx/projects/${P}/rag`, { method: "PATCH", json: { rag: "Red", reason: "a hunch" } }, Q);
  ok(rag.status === 403, "nor override the measured RAG status", rag.status);
  const keys = await api("/api/veryx/keys", { json: { workspace: "Theirs", env: "sandbox", scopes: ["read:risks"], monthlyQuota: 10 } }, Q);
  ok(keys.status === 403, "and cannot mint a Platform API key — that is admin only", keys.status);

  const anon = await api("/api/construx/ncrs", { json: { projectId: P } });
  ok(anon.status === 401, "an unauthenticated write is refused outright", anon.status);

  // The project manager IS in DELIVERY_FINANCE, so the gate is a gate and
  // not simply a refusal for everybody but the administrator.
  const pm = await api("/api/auth/login", { json: { email: "pm@etablix.com", password: "etablix-pm-2026" } });
  const M = pm.body.token;
  const pmWrite = await api("/api/construx/rfis", { json: {
    projectId: P, subject: "Confirm earthing arrangement at transformer bay",
    status: "open", priority: "high", raisedBy: "R Aliu",
  } }, M);
  ok(pmWrite.status === 201, "a project manager can raise an RFI", pmWrite.body);
  ok(/^RFI-\d{3}$/.test(pmWrite.body.rfis?.number || ""), "numbered by the server", pmWrite.body.rfis?.number);
  const pmKey = await api("/api/veryx/keys", { json: { workspace: "Theirs", env: "sandbox", scopes: ["read:risks"], monthlyQuota: 10 } }, M);
  ok(pmKey.status === 403, "and still cannot mint an API key");
}

console.log("\n--- the risk register accepts writes and refuses an invented score\n");
{
  const v = await api("/api/veryx/risks/vocabulary", {}, T);
  ok(v.status === 200 && v.body.categories.length >= 9, "the vocabulary is published rather than guessed at", v.body.categories?.length);

  const bad = await api("/api/veryx/risks", { json: {
    projectId: P, title: "Accommodation module lead time", category: "procurement",
    status: "open", probability: 4, impact: 5, score: 12, owner: "M Feld",
  } }, T);
  ok(bad.status === 400 && /multiply to 20/.test(bad.body.error || ""), "a score that disagrees with its own assessment is refused", bad.body.error);

  const good = await api("/api/veryx/risks", { json: {
    projectId: P, title: "Accommodation module lead time", category: "procurement",
    status: "open", probability: 4, impact: 5, owner: "M Feld",
  } }, T);
  ok(good.status === 201 && good.body.risk.score === 20, "without one, the score is computed", good.body);
  const id = good.body.risk.id;

  const rev = await api(`/api/veryx/risks/${id}`, { method: "PATCH", json: { probability: 2 } }, T);
  ok(rev.status === 200 && rev.body.risk.score === 10,
     "and a re-assessment recomputes it rather than being refused against the old product", rev.body);
  const close = await api(`/api/veryx/risks/${id}`, { method: "PATCH", json: { status: "closed" } }, T);
  ok(close.status === 400 && /mitigation/.test(close.body.error || ""), "closing it with no mitigation is refused", close.body.error);
}

console.log("\n--- a Platform API key can be minted, and shown once\n");
let writeKey = null, readKey = null, keyId = null;
{
  const sc = await api("/api/veryx/keys/scopes", {}, T);
  ok(sc.status === 200 && sc.body.scopes.length === 9, "nine scopes are published", sc.body.scopes?.length);

  const noReason = await api("/api/veryx/keys", { json: {
    workspace: "Integration test", env: "sandbox", scopes: ["write:risks"], monthlyQuota: 500,
  } }, T);
  ok(noReason.status === 400 && /can write/.test(noReason.body.error || ""),
     "a key that can write cannot be minted without saying what it is for", noReason.body.error);

  const unknown = await api("/api/veryx/keys", { json: {
    workspace: "Integration test", env: "sandbox", scopes: ["write:everything"], monthlyQuota: 500, reason: "testing",
  } }, T);
  ok(unknown.status === 400 && /Unknown scope/.test(unknown.body.error || ""), "and not with a scope no endpoint checks", unknown.body.error);

  const m = await api("/api/veryx/keys", { json: {
    workspace: "Integration test", env: "sandbox",
    scopes: ["read:projects", "read:risks", "read:tasks", "write:risks", "write:tasks", "write:webhooks", "read:usage"],
    monthlyQuota: 5000, acuBalance: 100, reason: "end-to-end suite",
  } }, T);
  ok(m.status === 201 && m.body.key?.startsWith("vx_test_"), "a sandbox key is minted", m.body.error || m.body.key?.slice(0, 12));
  writeKey = m.body.key;
  keyId = m.body.apiKey?.id;
  ok(m.body.apiKey?.key?.endsWith("…"), "and the echoed row shows only a preview", m.body.apiKey?.key);
  ok(m.body.writeScopes?.length === 3, "with the write scopes called out", m.body.writeScopes);

  const ro = await api("/api/veryx/keys", { json: {
    workspace: "Read only", env: "sandbox", scopes: ["read:risks", "read:usage"], monthlyQuota: 100,
  } }, T);
  ok(ro.status === 201, "a read-only key needs no reason", ro.body.error);
  readKey = ro.body.key;
}

const K = (key) => ({ headers: { "X-API-Key": key } });

console.log("\n--- the Platform API writes, each behind its own scope\n");
{
  const ping = await api("/api/public/v1/ping", K(writeKey));
  ok(ping.status === 200 && ping.body.workspace === "Integration test", "the key works", ping.body);

  const scopes = await api("/api/public/v1/scopes", K(writeKey));
  ok(scopes.status === 200 && scopes.body.held.includes("write:risks"), "and can read what it holds", scopes.body.held);

  const risk = await api("/api/public/v1/risks", { ...K(writeKey), json: {
    projectId: P, title: "Grid connection date dependent on DNO", category: "external",
    status: "open", probability: 3, impact: 5, owner: "J Nseya",
  } });
  ok(risk.status === 201 && risk.body.data.score === 15, "a risk is created over the API", risk.body);
  ok(/^API · /.test(risk.body.data.createdBy || ""),
     "attributed to the key rather than to a person — a row written by a machine must never look like one somebody entered", risk.body.data.createdBy);

  const contradiction = await api("/api/public/v1/risks", { ...K(writeKey), json: {
    projectId: P, title: "Grid connection date dependent on DNO", category: "external",
    status: "closed", probability: 3, impact: 5, owner: "J Nseya",
  } });
  ok(contradiction.status === 422, "and the API refuses the same contradictions the internal route does", contradiction.body.error);

  const task = await api("/api/public/v1/tasks", { ...K(writeKey), json: {
    projectId: P, activity: "Temporary power energisation", phase: "Mobilisation",
    start: PAST, end: FUTURE, progress: 25,
  } });
  ok(task.status === 201, "a schedule activity is created", task.body);
  const reversed = await api("/api/public/v1/tasks", { ...K(writeKey), json: {
    projectId: P, activity: "Temporary power energisation", start: FUTURE, end: PAST, progress: 0,
  } });
  ok(reversed.status === 422 && /ends before it starts/.test(reversed.body.error || ""), "a reversed activity is refused", reversed.body.error);

  const patched = await api(`/api/public/v1/tasks/${task.body.data.id}`, { ...K(writeKey), method: "PATCH", json: { progress: 60 } });
  ok(patched.status === 200 && patched.body.data.progress === 60, "and updated", patched.body);
}

console.log("\n--- a read-only key is refused every write\n");
{
  const risk = await api("/api/public/v1/risks", { ...K(readKey), json: {
    projectId: P, title: "Something a read key should not be able to raise", category: "external",
    status: "open", probability: 1, impact: 1,
  } });
  ok(risk.status === 403 && /write:risks/.test(risk.body.error || ""), "raising a risk is refused, naming the scope it lacks", risk.body.error);
  const task = await api("/api/public/v1/tasks", { ...K(readKey), json: { projectId: P, activity: "x", start: PAST, end: FUTURE, progress: 0 } });
  ok(task.status === 403, "so is creating an activity", task.status);
  const hook = await api("/api/public/v1/webhooks", { ...K(readKey), json: { url: "https://example.com/h", events: ["veryx.risk.created"] } });
  ok(hook.status === 403, "and registering a webhook — the scope that can send project data off this system", hook.status);
  const read = await api("/api/public/v1/risks", K(readKey));
  ok(read.status === 200, "while the reads it does hold still work");
}

console.log("\n--- a subscription registered over the API\n");
{
  const bad = await api("/api/public/v1/webhooks", { ...K(writeKey), json: { url: "http://example.com/hook", events: ["veryx.risk.created"] } });
  ok(bad.status === 422 && /https/.test(bad.body.error || ""), "http is refused over the API too", bad.body.error);

  const sub = await api("/api/public/v1/webhooks", { ...K(writeKey), json: {
    url: "https://receiver.invalid/etablix", events: ["veryx.risk.created", "construx.ncr.created"],
    description: "end-to-end suite",
  } });
  ok(sub.status === 201 && sub.body.secret?.startsWith("whsig_"), "a subscription is created and the secret returned once", sub.body);
  ok(sub.body.data.secret === undefined, "and not in the row");
  ok(/x-etablix-signature/.test(sub.body.signing || ""), "with the signing scheme stated rather than left to be discovered", sub.body.signing);

  const mine = await api("/api/public/v1/webhooks", K(writeKey));
  ok(mine.body.data.some((s) => s.id === sub.body.data.id), "it lists under this key");
  ok(mine.body.data.every((s) => s.secret === undefined), "with no secrets in the listing");

  // A subscriber that cannot be reached must not fail the write behind it.
  const risk = await api("/api/public/v1/risks", { ...K(writeKey), json: {
    projectId: P, title: "A risk raised while the subscriber is unreachable", category: "commercial",
    status: "open", probability: 2, impact: 3, owner: "J Nseya",
  } });
  ok(risk.status === 201, "a risk raised while the subscriber is unreachable still succeeds", risk.body.error);

  const log = await api("/api/webhooks/deliveries", {}, T);
  ok(log.status === 200 && log.body.deliveries.some((d) => d.ok === false),
     "and the failed delivery is in the log rather than lost", log.body.deliveries?.length);

  const gone = await api(`/api/public/v1/webhooks/${sub.body.data.id}`, { ...K(writeKey), method: "DELETE" });
  ok(gone.status === 200, "the key can deactivate its own subscription");
  const other = await api("/api/public/v1/webhooks/does-not-exist", { ...K(writeKey), method: "DELETE" });
  ok(other.status === 404, "and one it does not own reads as absent rather than as forbidden");
}

console.log("\n--- the inbound endpoint\n");
{
  const spec = await api("/api/webhooks/inbound/spec");
  ok(spec.status === 200 && spec.body.accepts.length === 3, "the spec is readable without a session, so a sender can be set up", spec.body.accepts?.length);
  ok(spec.body.replayWindowSeconds === 300, "and states the replay window", spec.body.replayWindowSeconds);

  const mint = await api("/api/webhooks/inbound/secret", { method: "POST", json: {} }, T);
  ok(mint.status === 201 && mint.body.secret?.startsWith("whsec_"), "an admin mints the inbound secret", mint.body);
  const secret = mint.body.secret;

  const send = async (body, { ts = Date.now(), sig = null, secretUsed = secret } = {}) => {
    const raw = typeof body === "string" ? body : JSON.stringify(body);
    const signature = sig ?? crypto.createHmac("sha256", secretUsed).update(`${ts}.${raw}`).digest("hex");
    const res = await fetch(B + "/api/webhooks/inbound", {
      method: "POST",
      headers: { "content-type": "application/json", "x-etablix-timestamp": String(ts), "x-etablix-signature": signature },
      body: raw,
    });
    return { status: res.status, body: await J(res) };
  };

  const good = await send({ event: "platform.ping", data: { from: "e2e" } });
  ok(good.status === 202, "a correctly signed ping is accepted", good.body);

  const unsigned = await fetch(B + "/api/webhooks/inbound", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  ok(unsigned.status === 401, "an unsigned delivery is refused", unsigned.status);

  const tampered = await send({ event: "platform.ping", data: { from: "e2e" } }, { sig: "0".repeat(64) });
  ok(tampered.status === 401, "a wrong signature is refused", tampered.status);

  const old = Date.now() - 10 * 60 * 1000;
  const replay = await send({ event: "platform.ping" }, { ts: old });
  ok(replay.status === 401 && /outside the 300s window/.test(replay.body.error || ""),
     "and a PERFECTLY VALID signature from ten minutes ago is refused", replay.body.error);

  const wrongSecret = await send({ event: "platform.ping" }, { secretUsed: "whsec_not_the_one" });
  ok(wrongSecret.status === 401, "so is one signed with the wrong secret");

  // The one that matters. The signature is right; the request is still refused,
  // because a valid signature proves who sent it and not what it may do.
  const write = await send({ event: "platform.ncr.close", data: { ref: "NCR-001" } });
  ok(write.status === 403 && /not an inbound event/.test(write.body.error || ""),
     "a correctly signed request to CLOSE A NON-CONFORMANCE is refused: a leaked secret must not be able to do that", write.body.error);
  ok(Array.isArray(write.body.allowed) && write.body.allowed.length === 3, "and the refusal lists what it could have sent");

  const rot = await api("/api/webhooks/inbound/secret", { method: "POST", json: {} }, T);
  ok(rot.status === 201 && rot.body.rotated === true, "rotating says it rotated");
  const stale = await send({ event: "platform.ping" }, { secretUsed: secret });
  ok(stale.status === 401, "and the previous secret stops working immediately");
}

console.log("\n--- a revoked key stops working, including where no scope is needed\n");
{
  const before = await api("/api/public/v1/ping", K(writeKey));
  ok(before.status === 200, "the key still works before revocation");
  const rev = await api(`/api/veryx/keys/${keyId}`, { method: "DELETE" }, T);
  ok(rev.status === 200, "an admin revokes it", rev.body);
  const after = await api("/api/public/v1/ping", K(writeKey));
  ok(after.status === 401, "and /ping — which needs no scope at all — refuses it", after.status);
  const write = await api("/api/public/v1/risks", { ...K(writeKey), json: { projectId: P, title: "After revocation", category: "external", status: "open", probability: 1, impact: 1 } });
  ok(write.status === 401, "as does every write");
}

console.log("\n--- the whole thing is internal or key-authenticated, never open\n");
{
  for (const p of ["/api/webhooks", "/api/webhooks/deliveries", "/api/veryx/keys/scopes"]) {
    const a = await api(p);
    ok(a.status === 401, `${p} refuses an anonymous request`, a.status);
  }
  const anon = await api("/api/public/v1/risks");
  ok(anon.status === 401, "and the Platform API refuses a request with no key");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
