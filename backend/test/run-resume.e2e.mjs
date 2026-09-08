/**
 * An interrupted run keeps the passes it finished, and resumes from them.
 *
 *   node .../mock-anthropic.mjs &
 *   node backend/test/run-resume.e2e.mjs
 *
 * This test starts, KILLS and restarts the server itself, because that is the
 * event it is about. A live Site Systems Diagnostic was destroyed mid-run by a
 * routine auto-deploy recreating the container. Six passes over the client's
 * whole document set is several minutes and real money, and all of it was
 * thrown away — including the passes that had already finished — because only
 * the progress dots were being written down, not the passes themselves. The
 * comment in diagnostic.js claimed otherwise for months.
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
import { spawn } from "node:child_process";
const PORT = process.env.PORT || 3399;
const B = `http://localhost:${PORT}`;
let pass = 0, fail = 0, srv = null;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 260) : ""))); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (p, o = {}, t) => {
  const h = { ...(o.headers || {}) }; if (t) h.Authorization = "Bearer " + t;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h }); const x = await r.text();
  try { return { s: r.status, b: JSON.parse(x) }; } catch { return { s: r.status, b: { _raw: x.slice(0, 200) } }; }
};
const start = async () => {
  srv = spawn("node", ["backend/server.js"], { env: { ...process.env, PORT: String(PORT),
    SITE_URL: B, ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || "http://127.0.0.1:4199" }, stdio: "ignore" });
  for (let i = 0; i < 40; i++) { await wait(250); try { if ((await fetch(B + "/api/health")).ok) return; } catch {} }
  throw new Error("the server did not come up");
};
const kill = () => new Promise((r) => { if (!srv) return r(); srv.on("exit", r); srv.kill("SIGKILL"); });

// Fail loudly rather than quietly spending real money. Without this the
// suite hit the live API, got a 401 and reported eight failures that were
// all one missing environment variable.
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

await start();
let a = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
let T = a.b.token; ok(a.s === 200, "admin signs in");
await api("/api/agents/provider", { json: { apiKey: "sk-ant-mock", model: "claude-opus-5" }, method: "PUT" }, T);

const fd = new FormData();
fd.append("title", "Interrupted run");
fd.append("inputs", JSON.stringify({ client: "Kill Ltd", project: "Kill", handover: "2026-09-08", basis: "t",
  siteRef: "x", programme: "a", workforce: "a", layout: "a", logistics: "a", services: "a", packages: "a", constraints: "a", surveys: "a" }));
const started = await fetch(`${B}/api/agents/diagnostic/run`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
const id = (await started.json()).run?.id;
ok(started.status === 202 && !!id, "the run started in the background");

let held = 0;
for (let i = 0; i < 120 && held < 2; i++) { await wait(300); const g = await api(`/api/agents/runs/${id}`, {}, T); held = Object.keys(g.b.run?.passes || {}).length; }
ok(held >= 2, `passes are written down as they land — ${held} held while the run is still going`, held);

const h = await api("/api/health");
ok(h.b.busy === true, "health reports the server BUSY, so a deploy can defer instead of destroying the run", h.b);

// the event itself: the container is recreated mid-run
await kill();
await start();
a = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
T = a.b.token;

const after = (await api(`/api/agents/runs/${id}`, {}, T)).b.run;
ok(after.status === "failed", "the run is marked failed rather than spinning for ever", after.status);
const survived = Object.keys(after.passes || {}).length;
ok(survived === held, `EVERY COMPLETED PASS SURVIVED THE RESTART — ${survived} of them`, Object.keys(after.passes || {}));
ok(/completed pass/.test(after.error || ""), "and the message says so, instead of 'nothing was lost except the run itself'", after.error);

const res = await api(`/api/agents/runs/${id}/resume`, { json: {} }, T);
ok(res.s === 202 && res.b.resumingFrom === survived, `resuming from pass ${survived + 1}, not from pass 1`, res.b);

let st = "running";
for (let i = 0; i < 200 && st === "running"; i++) { await wait(300); st = (await api(`/api/agents/runs/${id}`, {}, T)).b.run.status; }
const done = (await api(`/api/agents/runs/${id}`, {}, T)).b.run;
ok(done.status === "awaiting_approval", "the resumed run finishes", { status: done.status, error: done.error });
ok(String(done.output || "").length > 200, "and produces a real report", String(done.output || "").length);
ok((done.notes || []).some((n) => /carried over/.test(n)), "the report says which passes were carried over rather than hiding it", done.notes);

const twice = await api(`/api/agents/runs/${id}/resume`, { json: {} }, T);
ok(twice.s === 409, "a finished run cannot be resumed again", twice.b);

await kill();
console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
