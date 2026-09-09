/**
 * Every document reaches the model, and the database stays small.
 *
 *   MOCK_LOG=/tmp/mock-log.json node backend/test/mock-anthropic.mjs &
 *   ETABLIX_DATA_DIR=/tmp/scratch PORT=3318 ANTHROPIC_BASE_URL=http://127.0.0.1:4199 \
 *     ANTHROPIC_API_KEY=mock-key node backend/server.js &
 *   BASE=http://localhost:3318 DATA=/tmp/scratch MOCK_LOG=/tmp/mock-log.json \
 *     node backend/test/pipeline.e2e.mjs
 *
 * Three faults this proves are gone:
 *
 *   1. Documents after the first were dropped without a word once the
 *      180,000-character budget was spent, while the run record still
 *      reported them as read. The report then found no contradiction
 *      between two documents, one of which was never sent.
 *
 *   2. Every document was folded into the `programme` field. A pass asked
 *      about the site layout got a field saying "Supplied — see the
 *      attached documents" and a layout drawing buried inside a
 *      programme.
 *
 *   3. The document text and six passes of reasoning were stored inside
 *      the run row, in db.json, which is rewritten in full on every
 *      change anywhere in the system.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const B = process.env.BASE || "http://localhost:3318";
const DATA = process.env.DATA || "";
const MOCK_LOG = process.env.MOCK_LOG || path.join(process.cwd(), "backend/test/mock-log.json");
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 300) : ""))); };
const J = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t.slice(0, 300) }; } };
const api = async (p, o = {}, tok) => {
  const h = { ...(o.headers || {}) };
  if (tok) h.Authorization = "Bearer " + tok;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h });
  return { status: r.status, body: await J(r) };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log("\n=== every document reaches the model, and the run row stays small ===\n");
let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token;
ok(r.status === 200, "admin signs in");

try { fs.unlinkSync(MOCK_LOG); } catch {}

// One document long enough to have eaten the whole budget on its own,
// and two short ones that used to be dropped behind it.
const giant = "SECTION 1. " + "The employer's requirements run to three hundred pages. ".repeat(4000);
const fd = new FormData();
fd.append("inputs", JSON.stringify({
  client: "Pipeline Test Ltd", project: "Budget sharing", handover: "2027-01-04",
  programme: "Access 1 March 2027; two-shift working from January 2028.",
  workforce: "Peak 280 at shift overlap.",
}));
fd.append("title", "Pipeline document routing");
fd.append("documents", new Blob([giant], { type: "text/plain" }), "employers-requirements.txt");
fd.append("documents", new Blob(["PLANNING CONDITION 14 prohibits night working."], { type: "text/plain" }), "planning-conditions.txt");
fd.append("documents", new Blob(["PARCEL A is 4,200 square metres with 90 parking spaces."], { type: "text/plain" }), "site-layout.txt");
const started = await fetch(`${B}/api/agents/diagnostic/run`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
const startedBody = await J(started);
ok(started.status === 202, "the run starts", startedBody);
const runId = startedBody.run?.id;

let run = null;
for (let i = 0; i < 120; i++) {
  await wait(500);
  run = (await api(`/api/agents/runs/${runId}`, {}, T)).body.run;
  if (run && run.status !== "running") break;
}
ok(run?.status === "awaiting_approval", `the run finished — status ${run?.status}`, run?.error);

// --- 1. what the model was actually sent
const log = JSON.parse(fs.readFileSync(MOCK_LOG, "utf8"));
ok(log.length >= 6, `six passes were made — ${log.length} calls`);
const firstPrompt = log[0].promptText || "";
ok(firstPrompt.includes("employers-requirements.txt"), "the long document is in the prompt");
ok(firstPrompt.includes("PLANNING CONDITION 14"),
  "THE SECOND DOCUMENT IS IN THE PROMPT — it used to be dropped silently once the budget was spent");
ok(firstPrompt.includes("PARCEL A is 4,200 square metres"),
  "and so is the third");
ok(/A NOTE ON WHAT YOU WERE GIVEN[\s\S]*employers-requirements\.txt/.test(firstPrompt),
  "the model is TOLD which document was cut and by how much, rather than left to assume it read everything");

// --- 2. the run record agrees with what was sent
const cut = (run.sources || []).find((s) => s.name === "employers-requirements.txt");
ok(cut && cut.cut === true && cut.charsRead < cut.chars,
  `the record says the long document was cut: ${cut?.charsRead} of ${cut?.chars} characters`);
const small = (run.sources || []).find((s) => s.name === "planning-conditions.txt");
ok(small && small.cut === false && small.charsRead === small.chars,
  "and that the short ones arrived whole");

// --- 3. the database did not swallow the documents
if (DATA) {
  const sql = new DatabaseSync(path.join(DATA, "db.sqlite"), { readOnly: true });
  const rowText = sql.prepare("SELECT doc FROM rows WHERE collection = 'agentTasks'").all().map((r) => r.doc).join("");
  ok(!rowText.includes("PLANNING CONDITION 14"),
    "THE DOCUMENT TEXT IS NOT IN THE DATABASE — it lives in the run's own pack file");
  const packFile = path.join(DATA, "runs", `${runId}.json`);
  ok(fs.existsSync(packFile), "it is in the run's own pack file");
  const pack = JSON.parse(fs.readFileSync(packFile, "utf8"));
  ok(pack.documents.length === 3, `the pack holds all three documents — ${pack.documents.length}`);
  ok(Object.keys(pack.passes || {}).length === 0, "and a finished run keeps no passes it no longer needs");
  const row = sql.prepare("SELECT doc FROM rows WHERE collection = 'agentTasks' AND id = ?").get(runId);
  ok(row && row.doc.length < 60000, `the run row is ${row?.doc.length} characters, not megabytes`);
  sql.close();
} else {
  console.log("  · DATA not set — skipping the database checks");
}

// --- 4. a resume that would look at no drawings is refused rather than run
r = await api(`/api/agents/runs/${runId}/resume`, { json: {} }, T);
ok(r.status === 409 && /already finished/.test(r.body.error || ""), "a finished run is not resumable", r.body);

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
