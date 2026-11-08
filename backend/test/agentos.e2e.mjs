/**
 * THE AGENT OS API, OVER THE WIRE.
 *
 *   node backend/test/agentos.e2e.mjs
 *
 * The engines are pure functions and are tested exactly elsewhere. This tests
 * the three things that only appear once they meet stored state, and that are
 * wrong in almost every first implementation:
 *
 *   · A replay returns the ORIGINAL outcome, not a fresh identical one.
 *   · The same key with a changed payload is a conflict, not an update.
 *   · Actor and tenant come from the session and never from the body.
 *
 * Plus the status codes the specification names, because an API that answers
 * 500 where it should answer 409 cannot be retried correctly by anybody.
 */
const BASE = (process.env.BASE || "http://127.0.0.1:3391").replace(/\/+$/, "");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(typeof x === "string" ? x : JSON.stringify(x)).slice(0, 300) : ""))); };

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "admin@etablix.com", password: "etablix-admin-2026" }),
});
const token = login.ok ? (await login.json()).token : null;
console.log("\n=== the Agent OS surface ===\n");
ok(!!token, "signed in");

const auth = { Authorization: `Bearer ${token}` };
const post = (path, b, extra = {}) =>
  fetch(`${BASE}${path}`, { method: "POST", headers: { ...auth, "content-type": "application/json", ...extra }, body: JSON.stringify(b) });
const get = (path) => fetch(`${BASE}${path}`, { headers: auth });

console.log("\n--- nothing here is public\n");
for (const [method, path] of [
  ["POST", "/api/agentos/v1/projects"],
  ["GET", "/api/agentos/v1/catalogue"],
  ["POST", "/api/agentos/v1/projects/x/commands"],
  ["GET", "/api/agentos/v1/projects/x/workflows/W01"],
]) {
  const r = await fetch(`${BASE}${path}`, { method, headers: { "content-type": "application/json" }, body: method === "POST" ? "{}" : undefined });
  ok(r.status === 401 || r.status === 403, `${method} ${path} refuses an unauthenticated caller (${r.status})`, r.status);
}

console.log("\n--- the catalogue is served from the registry, not a list\n");
{
  const r = await get("/api/agentos/v1/catalogue");
  const j = await r.json();
  ok(r.status === 200 && j.codes.length === 21, `21 service codes (${j.codes?.length})`, j.codes?.length);
  ok(j.categories.length === 6, "in 6 categories", j.categories?.length);
  ok(j.workflows.length === 10 && j.workflows[0].id === "W01", "ten workflows, W01 first", j.workflows?.length);
  ok(j.commands.length >= 20, `${j.commands?.length} typed commands published, so an integration can be written against something`, j.commands?.length);
}

console.log("\n--- a project, and the model that fails closed\n");
let projectId = null;
{
  const bad = await post("/api/agentos/v1/projects", { name: "Skye pilot", appointmentModel: "Z" });
  ok(bad.status === 422 && /fails closed/.test((await bad.json()).error), "AN UNKNOWN APPOINTMENT MODEL IS 422, not a default", bad.status);

  const r = await post("/api/agentos/v1/projects", { name: "Skye pilot", appointmentModel: "B", jurisdiction: "Isle of Skye" });
  const j = await r.json();
  projectId = j.project?.id;
  ok(r.status === 201 && !!projectId, `the project is created (${r.status})`, j);
  ok(j.project.version === 1 && j.project.workflow === "W01", "at version 1 in W01", j.project);
}
{
  const r = await post("/api/agentos/v1/projects/nosuchproject/commands", { type: "EARNED_VALUE", payload: {} }, { "Idempotency-Key": "k" });
  ok(r.status === 403, "a command against a project that does not exist is 403, not 404 — the difference leaks which ids exist", r.status);
}

console.log("\n--- the engines, over the wire, to the specification's figures\n");
{
  const r = await post("/api/agentos/v1/projects/" + projectId + "/commands",
    { type: "PEAK_CONCURRENCY", payload: { cohorts: [{ id: "shift A", count: 72 }, { id: "shift B", count: 50 }, { id: "visitors", count: 8 }], nominal: 100 } },
    { "Idempotency-Key": "at-07" });
  const j = await r.json();
  ok(r.status === 201 && j.result.peak === 130, "AT-07 over the wire: 130", j.result?.peak);
  ok(j.result.discrepancy.delta === 30, "with the brief's 100 preserved as a discrepancy", j.result?.discrepancy);
}
{
  const r = await post("/api/agentos/v1/projects/" + projectId + "/commands",
    { type: "PRICING_ENVELOPE", payload: { directCost: 100000, markupPct: 20, contingencyPct: 5, retentionPct: 5, retentionApplies: true } },
    { "Idempotency-Key": "at-17" });
  const j = await r.json();
  ok(j.result.budgetEnvelope === 125000 && j.result.payableBeforeVat === 114000, "AT-17 over the wire: £125,000 and £114,000", j.result);
  ok(j.result.marginOnRevenuePct === 16.67, "and 16.67% margin, not 20%", j.result?.marginOnRevenuePct);
}
{
  const r = await post("/api/agentos/v1/projects/" + projectId + "/commands",
    { type: "EARNED_VALUE", payload: { pv: 60000, ev: 48000, ac: 55000 } }, { "Idempotency-Key": "at-18" });
  const j = await r.json();
  ok(j.result.cpi === 0.8727 && j.result.spi === 0.8, "AT-18 over the wire: CPI 0.8727, SPI 0.8", j.result);
}

console.log("\n--- a policy hold is a recorded outcome, not an error\n");
let heldCommandId = null;
{
  const r = await post("/api/agentos/v1/projects/" + projectId + "/commands", {
    type: "CHECK_OFF_HIRE",
    payload: { capability: "off-hire", model: "02", entity: "JNN GLOBAL LTD", hireAgreement: "hire-cabin-17",
      serial: "cabin-17", asset: "cabin-17", demandThroughWithdrawal: "nil",
      dependencies: [{ id: "fire-loop-b", system: "Phase B's live fire loop", live: true }],
      stopRule: "NOTICE", noticeDays: 28, noticeRecipient: "hire desk", noticeChannel: "portal",
      nextChargeDate: "2026-12-20", today: "2026-11-08" },
  }, { "Idempotency-Key": "at-20" });
  const j = await r.json();
  heldCommandId = j.command?.id;
  ok(r.status === 200 && j.held === true, "A HELD COMMAND IS 200 WITH held: true — a 4xx would tell a caller to fix its request", r.status);
  ok(j.reason === "LIVE_DEPENDENCY", "with the reason named", j.reason);
  ok(/notice must be dispatched by/.test(j.remediation || ""),
     "and a remediation carrying the notice clock, which is still running while the withdrawal is held", j.remediation);
  ok(j.result.withdrawal === "HELD" && j.result.commercial === "ACCRUING", "both answers survive the wire", j.result);
}

console.log("\n--- A4 is denied over the wire, from an upload as from a person\n");
{
  const r = await post("/api/agentos/v1/projects/" + projectId + "/commands",
    { type: "MAY_EXECUTE", payload: { action: "energise the panel in cabin 17", source: "uploaded supplier PDF", class: "A2" } },
    { "Idempotency-Key": "at-14" });
  const j = await r.json();
  ok(j.held === true && j.result.class === "A4", "AT-14: DENIED", j.result?.class);
  ok(/does not change the answer/.test(j.result.say), "and the source is reported without being weighed", j.result?.say);
}

console.log("\n--- idempotency, which is the whole reason this layer exists\n");
{
  const payload = { pv: 60000, ev: 48000, ac: 55000 };
  const first = await post("/api/agentos/v1/projects/" + projectId + "/commands", { type: "EARNED_VALUE", payload }, { "Idempotency-Key": "idem-1" });
  const fj = await first.json();
  const again = await post("/api/agentos/v1/projects/" + projectId + "/commands", { type: "EARNED_VALUE", payload }, { "Idempotency-Key": "idem-1" });
  const aj = await again.json();
  ok(first.status === 201 && again.status === 200 && aj.replayed === true,
     "THE SAME KEY AND PAYLOAD REPLAYS THE ORIGINAL OUTCOME (201 then 200)", { first: first.status, again: again.status });
  ok(aj.command.id === fj.command.id,
     "and it is the ORIGINAL command id, not a second command — a retry after a timeout must not create two", { a: fj.command?.id, b: aj.command?.id });

  const changed = await post("/api/agentos/v1/projects/" + projectId + "/commands",
    { type: "EARNED_VALUE", payload: { pv: 1, ev: 1, ac: 1 } }, { "Idempotency-Key": "idem-1" });
  ok(changed.status === 409, "THE SAME KEY WITH A CHANGED PAYLOAD IS 409, not an update", changed.status);
  ok(/would write the wrong thing under a reference the first caller holds/.test((await changed.json()).error),
     "and the reason says why that matters");

  const noKey = await post("/api/agentos/v1/projects/" + projectId + "/commands", { type: "EARNED_VALUE", payload });
  ok(noKey.status === 422, "a write with no Idempotency-Key is 422", noKey.status);
}
{
  const stale = await post("/api/agentos/v1/projects/" + projectId + "/commands",
    { type: "EARNED_VALUE", payload: { pv: 1, ev: 1, ac: 1 }, target: { expectedVersion: 99 } }, { "Idempotency-Key": "ver-1" });
  ok(stale.status === 409, "A STALE expectedVersion IS 409", stale.status);
  const j = await stale.json();
  ok(j.currentVersion === 1 && /Re-read and resend/.test(j.error),
     "and the current version is returned so the caller re-reads rather than guesses", j);
}
{
  const bad = await post("/api/agentos/v1/projects/" + projectId + "/commands", { type: "INVENTED_COMMAND", payload: {} }, { "Idempotency-Key": "x1" });
  ok(bad.status === 422, "an unlisted command type is 422, never guessed at", bad.status);
  ok((await bad.json()).accepts.length >= 20, "and the error publishes what is accepted");
}

console.log("\n--- the actor comes from the session, never from the body\n");
{
  const r = await post("/api/agentos/v1/projects/" + projectId + "/commands",
    { type: "EARNED_VALUE", payload: { pv: 2, ev: 2, ac: 2 }, actor: "somebody else", createdBy: "somebody else", tenantId: "another-tenant" },
    { "Idempotency-Key": "actor-1" });
  const j = await r.json();
  const trace = await get(`/api/agentos/v1/projects/${projectId}/trace/${j.command.id}`);
  const tj = await trace.json();
  ok(trace.status === 200 && tj.command.actor !== "somebody else",
     "A BODY NAMING ITS OWN ACTOR IS IGNORED — a body that can name any actor can name any actor", tj.command?.actor);
}

console.log("\n--- evidence is unverified until something verifies it\n");
{
  const r = await post(`/api/agentos/v1/projects/${projectId}/evidence`,
    { locator: "RPS-261.pdf", jurisdiction: "England", verification: "VERIFIED" });
  const j = await r.json();
  ok(r.status === 201 && j.evidence.verification === "UNVERIFIED",
     "EVEN WHEN THE BODY CLAIMS VERIFIED — an unknown signer stays visibly unverified", j.evidence?.verification);
}

console.log("\n--- the inbound connector applies an effect once\n");
{
  const one = await post(`/api/agentos/v1/projects/${projectId}/connectors/construx/events`,
    { eventId: "evt-1", aggregateId: "hire-17", aggregateVersion: 9, data: { collected: true } });
  ok(one.status === 202 && (await one.json()).applied === true, "the first delivery applies (202)", one.status);

  const dup = await post(`/api/agentos/v1/projects/${projectId}/connectors/construx/events`,
    { eventId: "evt-1", aggregateId: "hire-17", aggregateVersion: 9 });
  const dj = await dup.json();
  ok(dup.status === 200 && dj.applied === false && dj.duplicate === true, "AT-28: THE REPLAY APPLIES ONCE", dj);

  const older = await post(`/api/agentos/v1/projects/${projectId}/connectors/construx/events`,
    { eventId: "evt-2", aggregateId: "hire-17", aggregateVersion: 8 });
  const oj = await older.json();
  ok(oj.applied === false && oj.superseded === true,
     "AND AN OLDER VERSION DOES NOT OVERWRITE A NEWER ONE — persisted across requests, which a pure function cannot do", oj);
}

console.log("\n--- the workflow view, and ET-ORCH's ledger\n");
{
  const r = await get(`/api/agentos/v1/projects/${projectId}/workflows/W09`);
  const j = await r.json();
  ok(r.status === 200 && j.owner === "handover-file", "W09 names its owning agent", j);
  ok(j.history.length > 0 && j.history.some((h) => h.held === true),
     "and the history shows which commands were held — the refused half is the more useful half of the trail", j.history?.length);
  const bad = await get(`/api/agentos/v1/projects/${projectId}/workflows/W99`);
  ok(bad.status === 422, "W99 is 422, because the ten workflows are the ten workflows", bad.status);
}
{
  const r = await post("/api/agentos/v1/projects/" + projectId + "/commands", {
    type: "ORCHESTRATION_STATE",
    payload: { instances: [
      { id: "i1", workflow: "W05", owners: ["mobilisation-review"], state: "RUNNING" },
      { id: "i2", workflow: "W09", owners: [], state: "RUNNING" },
      { id: "i3", workflow: "W08", owners: ["commercial", "bid"], state: "RUNNING" },
      { id: "i4", workflow: "W07", owners: ["siteops"], state: "BLOCKED" },
    ], steps: [{ class: "A2", manualIntervention: false }, { class: "A2", manualIntervention: true }, { class: "A3" }] },
  }, { "Idempotency-Key": "orch-1" });
  const j = await r.json();
  ok(j.result.ownership.coveragePct === 50, "coverage is 50%, counting every active instance", j.result?.ownership?.coveragePct);
  ok(j.result.ownership.unowned.length === 1 && j.result.ownership.multiOwned.length === 1,
     "one unowned and one double-owned, because two owners is nobody", j.result?.ownership);
  ok(j.result.ownership.held.length === 1,
     "AND THE BLOCKED INSTANCE COUNTS AS OWNED — a platform that drops held cases reports health by forgetting the problems", j.result?.ownership?.held);
  ok(j.result.unattended.ratePct === 50 && j.result.unattended.excluded === 1,
     "with the unattended rate reported SEPARATELY, excluding the A3 step", j.result?.unattended);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
