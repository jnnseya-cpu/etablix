/**
 * The diagnostic can be run again. Every time. On the same engagement.
 *
 *   node .../mock-anthropic.mjs &
 *   node backend/test/rerun.e2e.mjs
 *
 * The console offered the run once and then hid the button for ever,
 * because it gated on "has a run id" rather than on "would the endpoint
 * accept this". So a run that finished badly, died on its first call, or
 * was started against a pack the client then replaced ended the
 * engagement's use of the agent — and the only route back was a database
 * edit. The endpoint had always been willing; nothing ever asked it.
 *
 * What this proves:
 *   - a second run while the first is still working is REFUSED, with the
 *     reason, because six more passes over the whole pack is real money
 *   - `force` gets past that, because runs also hang
 *   - once the first has finished, running again is simply accepted
 *   - the superseded run is KEPT on the engagement, so the report the
 *     client may already have seen stays reachable from the engagement
 *     that paid for it
 *   - neither the handover date nor the report due date moves, because
 *     both are read from the client's checklist and not from the button
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
import { spawn } from "node:child_process";
const PORT = process.env.PORT || 3401;
const B = `http://localhost:${PORT}`;
let pass = 0, fail = 0, srv = null;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 300) : ""))); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (p, o = {}, t) => {
  const h = { ...(o.headers || {}) }; if (t) h.Authorization = "Bearer " + t;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h }); const x = await r.text();
  try { return { s: r.status, b: JSON.parse(x) }; } catch { return { s: r.status, b: { _raw: x.slice(0, 200) } }; }
};

const MOCK = process.env.ANTHROPIC_BASE_URL || "http://127.0.0.1:4199";
try {
  const m = await fetch(MOCK + "/v1/messages", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Reply with exactly" }], max_tokens: 8 }) });
  if (!m.ok) throw new Error("status " + m.status);
} catch (e) {
  console.error(`\n  The mock model at ${MOCK} is not answering (${e.message}).\n` +
    "  Start it first, and export ANTHROPIC_BASE_URL, or this test bills a real key.\n");
  process.exit(2);
}

srv = spawn("node", ["backend/server.js"], { env: { ...process.env, PORT: String(PORT), SITE_URL: B,
  ANTHROPIC_BASE_URL: MOCK }, stdio: "ignore" });
for (let i = 0; i < 40; i++) { await wait(250); try { if ((await fetch(B + "/api/health")).ok) break; } catch {} }

console.log("\n=== The diagnostic can be run again ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.b.token; ok(r.s === 200, "admin signs in");
await api("/api/agents/provider", { json: { apiKey: "sk-ant-mock", model: "claude-opus-5" }, method: "PUT" }, T);

r = await api("/api/clients", { json: {
  client: "Rerun Test Ltd", project: "A pack that had to be looked at twice",
  contactName: "A Client", contactEmail: "rerun@example.test",
  deliverable: "feasibility", model: "A", fee: 6500, vatMode: "standard",
} }, T);
ok(r.s === 201, "engagement opened", r.b);
const id = r.b.engagement.id;

r = await api(`/api/clients/${id}/issue-portal`, { method: "POST" }, T);
const tok = new URL(r.b.link).searchParams.get("t");
ok(Boolean(tok), "portal issued");

r = await api(`/api/clients/portal/${tok}`);
for (const item of r.b.engagement.checklist) {
  const fd = new FormData();
  fd.append("state", "supplied");
  fd.append("note", `Answered for ${item.id}. Enough text for the agent to have something to read against this requirement.`);
  await fetch(`${B}/api/clients/portal/${tok}/checklist/${item.id}`, { method: "POST", body: fd });
}
r = await api(`/api/clients/portal/${tok}`);
ok(r.b.engagement.checklistState.canStart, "the client answered every mandatory line");

await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "A Client" } });
await api(`/api/clients/${id}/payment-received`, { json: { kind: "deposit" } }, T);

// --- the first run
r = await api(`/api/clients/${id}/run-diagnostic`, { method: "POST" }, T);
ok(r.s === 202, "the first run starts", r.b);
const first = r.b.runId;
const handover = r.b.handover, due = r.b.due;
ok(r.b.replaced === null, "nothing was replaced by the first run");

// --- a second, while the first is still working, is refused with the reason
r = await api(`/api/clients/${id}/run-diagnostic`, { method: "POST" }, T);
ok(r.s === 409 && /still running/i.test(r.b.error || ""),
   "a second run while the first is working is REFUSED — six more passes is real money", r.b);
ok(r.b.running === true && r.b.runId === first, "and it says which run it is waiting on", r.b);

// --- but the desk is never trapped: force gets past it, because runs hang
r = await api(`/api/clients/${id}/run-diagnostic`, { json: { force: true } }, T);
ok(r.s === 202, "force starts another anyway — a hung run must not need a database edit", r.b);
ok(r.b.replaced === first, "and it says which run it replaced", r.b);
const second = r.b.runId;

r = await api(`/api/clients/${id}`, {}, T);
let e = r.b.engagement || r.b;
ok(e.diagnosticRunId === second, "the engagement now points at the newer run");
ok((e.diagnosticRuns || []).some((h) => h.id === first),
   "and the superseded run is KEPT — the report the client may have seen is still reachable", e.diagnosticRuns);
ok(e.handoverDate === handover && e.reportDueDate === due,
   `neither date moved: handover ${e.handoverDate}, report due ${e.reportDueDate}`,
   { was: [handover, due], now: [e.handoverDate, e.reportDueDate] });

// --- wait for it to finish, then run again with no force at all
for (let i = 0; i < 120; i++) {
  const g = await api(`/api/agents/runs/${second}`, {}, T);
  const run = g.b.run || g.b;
  if (run?.status && run.status !== "running") break;
  await wait(1000);
}
r = await api(`/api/clients/${id}`, {}, T);
e = r.b.engagement || r.b;
ok(e.diagnosticRunning === false, `the run has finished — status ${e.diagnosticRunStatus}`, e.diagnosticRunStatus);

r = await api(`/api/clients/${id}/run-diagnostic`, { method: "POST" }, T);
ok(r.s === 202, "with nothing running, a re-run is simply accepted — no force, no confirmation, no database edit", r.b);
ok(r.b.replaced === second, "and it replaced the finished run", r.b);

r = await api(`/api/clients/${id}`, {}, T);
e = r.b.engagement || r.b;
ok((e.diagnosticRuns || []).length === 2, "both earlier runs are on the engagement", e.diagnosticRuns);
ok((e.events || []).some((v) => v.what === "Diagnostic run again"),
   "and the audit trail says it was run again, and what it replaced");

srv?.kill("SIGKILL");
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
