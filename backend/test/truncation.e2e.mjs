/**
 * A pass that runs out of room is written to the end, not handed over cut off.
 *
 *   MOCK_TRUNCATE=1 node .../mock-anthropic.mjs &
 *   node backend/test/truncation.e2e.mjs
 *
 * On the first real client pack every one of the six passes hit the output
 * limit. Only the reconcile pass had a continuation; the other five had
 * nothing, so the twelve deliverables and the whole contradictions appendix
 * came back cut off — section 11 stopped mid-sentence and appendix A.1
 * stopped in the middle of a table row. The run said so in a note, which is
 * not a fix: a report that ends in the middle of a word cannot be issued to
 * a client however good the analysis above it is.
 *
 * What this proves:
 *   - every pass is continued, not just the reconcile one
 *   - the continuation is joined with NOTHING between the parts, so a cut
 *     that fell inside a table row comes back as one row
 *   - a report that was continued to the end does NOT report itself as
 *     truncated, which the old note-matching test got wrong
 *   - a pass that will never finish says INCOMPLETE, loudly, rather than
 *     quietly handing over a document that stops early
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
import { spawn } from "node:child_process";
const PORT = process.env.PORT || 3403;
const B = `http://localhost:${PORT}`;
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 300) : ""))); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (p, o = {}, t) => {
  const h = { ...(o.headers || {}) }; if (t) h.Authorization = "Bearer " + t;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h }); const x = await r.text();
  try { return { s: r.status, b: JSON.parse(x) }; } catch { return { s: r.status, b: { _raw: x.slice(0, 200) } }; }
};

// This test needs the model to run out of room on demand, and then needs it
// to do so for ever — two different mock modes. So it owns the mock rather
// than borrowing the suite's, the way run-resume.e2e owns its server.
const MOCK_PORT = Number(process.env.MOCK_PORT || 4205);
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
let mock = null;
const startMock = async (mode) => {
  await stopMock();
  mock = spawn("node", ["backend/test/mock-anthropic.mjs"], { stdio: "ignore",
    env: { ...process.env, MOCK_TRUNCATE: mode, MOCK_DELAY: process.env.MOCK_DELAY || "60",
      MOCK_PORT: String(MOCK_PORT), MOCK_LOG: `/tmp/etablix-truncation-mock-${process.pid}.json` } });
  for (let i = 0; i < 40; i++) {
    await wait(250);
    try {
      const m = await fetch(MOCK + "/v1/messages", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "up?" }], max_tokens: 8 }) });
      if (m.ok) return;
    } catch {}
  }
  throw new Error(`the mock did not come up on ${MOCK_PORT}`);
};
const stopMock = () => new Promise((r) => { if (!mock) return r(); mock.on("exit", r); mock.kill("SIGKILL"); mock = null; });

await startMock("1");

const srv = spawn("node", ["backend/server.js"], { env: { ...process.env, PORT: String(PORT), SITE_URL: B,
  ANTHROPIC_BASE_URL: MOCK }, stdio: "ignore" });
for (let i = 0; i < 40; i++) { await wait(250); try { if ((await fetch(B + "/api/health")).ok) break; } catch {} }

console.log("\n=== A truncated pass is written to the end ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.b.token; ok(r.s === 200, "admin signs in");
await api("/api/agents/provider", { json: { apiKey: "sk-ant-mock", model: "claude-opus-5" }, method: "PUT" }, T);

const inputs = { client: "Cutoff Ltd", project: "A report that used to stop mid-row", handover: "2026-09-08",
  basis: "t", siteRef: "x", programme: "a", workforce: "a", layout: "a", logistics: "a",
  services: "a", packages: "a", constraints: "a", surveys: "a" };
const fd = new FormData();
fd.append("title", "Truncated run");
fd.append("inputs", JSON.stringify(inputs));
const started = await fetch(`${B}/api/agents/diagnostic/run`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
const body = await started.json();
ok(started.status === 202, "the run started", body);
const runId = body.run?.id || body.runId || body.id;

let run = null;
for (let i = 0; i < 180; i++) {
  const g = await api(`/api/agents/runs/${runId}`, {}, T);
  run = g.b.run || g.b;
  if (run?.status && run.status !== "running") break;
  await wait(1000);
}
ok(["awaiting_approval", "complete", "completed", "done"].includes(run?.status),
   `the pipeline finished — status ${run?.status}`, { status: run?.status, error: run?.error });

const out = run?.output || "";
const notes = run?.notes || [];

// --- the join
const joins = (out.match(/SPLIT-HEADSPLIT-TAIL/g) || []).length;
const orphans = (out.match(/SPLIT-HEAD(?!SPLIT-TAIL)/g) || []).length;
// Five, not six. All six passes are continued — the notes below prove that —
// but the reconcile pass is the working paper, which is the spine the other
// five are written from and is never part of the report the client reads.
// The output therefore carries four section passes and the final one.
ok(joins === 5, `every pass in the report was continued and joined seamlessly — ${joins} clean joins`, { joins, orphans });
ok(orphans === 0, "no pass was left cut off — nothing ends on SPLIT-HEAD", { orphans });
ok(!/SPLIT-HEAD\s+SPLIT-TAIL/.test(out),
   "the parts were joined with NOTHING between them — a cut inside a table row comes back as one row");

// --- the notes
const continued = notes.filter((n) => /was continued in \d+ further call/.test(n));
ok(continued.length === 6, `all six passes report that they were continued and are complete — including the working paper, which never reaches the report`, continued.slice(0, 2));
ok(!notes.some((n) => /INCOMPLETE/.test(n)), "no pass reports itself INCOMPLETE — they all finished", notes.filter((n) => /INCOMPLETE/.test(n)));
ok(run?.truncated !== true,
   "and the RUN does not report itself as cut off — it was continued to the end",
   { truncated: run?.truncated, notes });

// --- the ceiling: a pass that will never finish must SAY so
// Continuing for ever is not an option — every round spends money — so the
// loop stops after MAX_CONTINUATIONS and the report has to declare itself
// incomplete rather than quietly stop early and look finished.
await startMock("always");
{
  const fd2 = new FormData();
  fd2.append("title", "Never finishes");
  fd2.append("inputs", JSON.stringify({ ...inputs, project: "A pass that can never be finished" }));
  const s2 = await fetch(`${B}/api/agents/diagnostic/run`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd2 });
  const b2 = await s2.json();
  const id2 = b2.run?.id || b2.runId || b2.id;
  let run2 = null;
  for (let i = 0; i < 240; i++) {
    const g = await api(`/api/agents/runs/${id2}`, {}, T);
    run2 = g.b.run || g.b;
    if (run2?.status && run2.status !== "running") break;
    await wait(1000);
  }
  const n2 = run2?.notes || [];
  ok(n2.some((n) => /pass is INCOMPLETE/.test(n)),
     "a pass that never finishes says INCOMPLETE, loudly, rather than stopping quietly", n2.slice(0, 2));
  ok(n2.some((n) => /Do not issue it as it stands/.test(n)), "and tells the desk not to issue it");
  ok(n2.some((n) => /reached the length limit 4 times/.test(n)),
     "it stopped after four attempts rather than spending for ever", n2.slice(0, 1));
  ok(run2?.truncated === true, "the run reports itself cut off", { truncated: run2?.truncated });
  ok((String(run2?.output || "").match(/SPLIT-HEAD/g) || []).length > 0,
     "the partial work is kept rather than thrown away — there is something to read and re-scope from");
}

await stopMock();
srv.kill("SIGKILL");
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
