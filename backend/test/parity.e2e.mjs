/**
 * The second Model A deliverable delivers like the first.
 *
 *   MOCK_TRUNCATE= node .../mock-anthropic.mjs &
 *   node backend/test/parity.e2e.mjs
 *
 * ETABLIX sells five Model A deliverables. Only the diagnostic had a
 * production engine, which meant the other four — including a £14,000 to
 * £45,000 requirements package — were an intake checklist, a price, and
 * somebody writing forty pages by hand. That is not only a delivery problem:
 * the margins certified in PRICING-REVIEW-2026 assume the effort of an
 * engine, so every band on those four was wrong.
 *
 * This walks a Site Management Requirements engagement end to end and checks
 * it behaves exactly as the diagnostic does: the client's own uploaded pack
 * reaches the agent with nothing re-entered, its OWN stage names are reported
 * rather than the diagnostic's, the output is minted into its own numbered
 * document under its own headings, and the held-to-the-promised-date rule
 * applies to it too.
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
import { spawn } from "node:child_process";
const PORT = process.env.PORT || 3411;
const B = `http://localhost:${PORT}`;
let pass = 0, fail = 0, mock = null, srv = null;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 300) : ""))); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const J = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t.slice(0, 300) }; } };
const api = async (p, o = {}, t) => {
  const h = { ...(o.headers || {}) }; if (t) h.Authorization = "Bearer " + t;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h });
  return { s: r.status, b: await J(r) };
};

const MOCK_PORT = Number(process.env.MOCK_PORT || 4211);
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
mock = spawn("node", ["backend/test/mock-anthropic.mjs"], { stdio: "ignore",
  env: { ...process.env, MOCK_TRUNCATE: "", MOCK_DELAY: "60", MOCK_PORT: String(MOCK_PORT), MOCK_LOG: `/tmp/etablix-parity-${process.pid}.json` } });
for (let i = 0; i < 40; i++) {
  await wait(250);
  try {
    const m = await fetch(MOCK + "/v1/messages", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "up?" }], max_tokens: 8 }) });
    if (m.ok) break;
  } catch {}
}
srv = spawn("node", ["backend/server.js"], { stdio: "ignore", env: { ...process.env, PORT: String(PORT), SITE_URL: B, ANTHROPIC_BASE_URL: MOCK } });
for (let i = 0; i < 40; i++) { await wait(250); try { if ((await fetch(B + "/api/health")).ok) break; } catch {} }

console.log("\n=== Agent 9 delivers like Agent 8 ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.b.token; ok(r.s === 200, "admin signs in");
await api("/api/agents/provider", { json: { apiKey: "sk-ant-mock", model: "claude-opus-5" }, method: "PUT" }, T);

// --- the agent is registered like any other
r = await api("/api/agents", {}, T);
const a9 = (r.b.agents || []).find((a) => a.id === "site-requirements");
ok(Boolean(a9), "Agent 9 is in the agent list", (r.b.agents || []).map((a) => a.id));
ok((a9?.fields || []).length >= 10, `it declares its own ${a9?.fields?.length} input fields`);

// --- an engagement for the deliverable it produces
r = await api("/api/clients", { json: {
  client: "Marrowbridge Infrastructure Ltd", project: "NORTHREACH — requirements to market",
  contactName: "Dale Okonjo", contactEmail: "dale@example.test",
  deliverable: "site-requirements", model: "A", fee: 26000, vatMode: "standard",
} }, T);
ok(r.s === 201, "an engagement is opened for the requirements package", r.b);
const E = r.b.engagement;
ok(E.deliverableName.includes("Site Management Requirements"), `and it is priced as one: ${E.deliverableName}`);

r = await api(`/api/clients/${E.id}/issue-portal`, { method: "POST" }, T);
const tok = new URL(r.b.link).searchParams.get("t");
r = await api(`/api/clients/portal/${tok}`);
const items = r.b.engagement.checklist;
// Nine pack items plus the five universal commercial ones.
const packIds = items.filter((i) => i.id.startsWith("s-")).map((i) => i.id);
ok(packIds.length === 9, `the client gets the requirements pack's own nine questions: ${packIds.join(", ")}`, packIds);
ok(!items.some((i) => i.id.startsWith("f-")), "and none of the diagnostic's");

for (const item of items) {
  const fd = new FormData();
  fd.append("state", "supplied");
  fd.append("note", `Answered for ${item.id}. Enough for the agent to specify against.`);
  await fetch(`${B}/api/clients/portal/${tok}/checklist/${item.id}`, { method: "POST", body: fd });
}
await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "Dale Okonjo" } });
await api(`/api/clients/${E.id}/payment-received`, { json: { kind: "deposit" } }, T);

// --- the join: the client's own answers reach the agent with nothing re-entered
r = await api(`/api/clients/${E.id}/run-diagnostic`, { method: "POST" }, T);
ok(r.s === 202, "the engagement runs its OWN agent — no re-upload, no re-entry", r.b);
const runId = r.b.runId;

let run = null;
for (let i = 0; i < 240; i++) {
  const g = await api(`/api/agents/runs/${runId}`, {}, T);
  run = g.b.run || g.b;
  if (run?.status && run.status !== "running") break;
  await wait(1000);
}
ok(["awaiting_approval", "complete", "completed", "done"].includes(run?.status),
   `it finished — status ${run?.status}`, { status: run?.status, error: run?.error });
ok(run?.agent === "site-requirements", "the run records which agent produced it");

// --- its own stages, not the diagnostic's
const keys = (run?.stages || []).map((s) => s.key);
ok(keys.join(",") === "reconcile,r1_3,r4_6,r7_9,r10_12,final",
   `it reports its own six stages: ${keys.join(", ")}`, keys);
ok(!keys.includes("s1_3"), "and not the diagnostic's stage names");

// --- its own document, under its own headings
r = await api(`/api/agents/runs/${runId}/decision`, { json: { decision: "approve" } }, T);
ok(r.s < 400, "a named human approves it", r.b);
r = await api(`/api/docs/from-run/${runId}`, {}, T);
ok(r.b.template === "sitereq", `it drafts into its own template, not the diagnostic's: ${r.b.template}`);
const filled = Object.entries(r.b.data || {}).filter(([k, v]) => /^r\d+$/.test(k) && String(v).trim()).map(([k]) => k);
ok(filled.length === 12, `all twelve of its sections came across: ${filled.join(", ")}`, filled);
// The splitter takes sections by NUMBER, so the diagnostic's content in the
// right field looks correct until you read it. Check the words.
ok(/Employer|Contractor shall/.test(String(r.b.data.r2 || "")),
   "and section 2 is Employer's Requirements, not the diagnostic's scope-gap assessment", String(r.b.data.r2 || "").slice(0, 120));
ok(/Part II|payment/i.test(String(r.b.data.r9 || "")),
   "and section 9 is the commercial requirements, not a risk register", String(r.b.data.r9 || "").slice(0, 120));

const pub = await (async () => {
  const fd = new FormData();
  fd.append("runId", runId);
  fd.append("label", "Site Management Requirements Package — NORTHREACH");
  fd.append("summary", "Twelve deliverables, ready to issue to market.");
  fd.append("sections", "1 Package structure\n2 Employer's Requirements");
  fd.append("releaseEarly", "true");
  fd.append("releaseReason", "Testing the end-to-end path; the promised date has not arrived.");
  const res = await fetch(`${B}/api/clients/${E.id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
  return { s: res.status, b: await J(res) };
})();
ok(pub.s === 201, "it publishes to the client's portal", pub.b);
const d = pub.b.engagement?.deliverables?.at(-1);
ok(Boolean(d?.documentNumber?.startsWith("SMR-")),
   `in its own numbered series, not the diagnostic's: ${d?.documentNumber}`);

const html = await (await fetch(`${B}/api/docs/${d.documentId}/render?token=${encodeURIComponent(T)}`)).text();
ok(/Site Management Requirements Package/.test(html), "the branded document carries its own title");
ok(/Employer&#39;s Requirements by package|Employer's Requirements by package/.test(html),
   "and its own twelve headings");
ok(/appoints ETABLIX as Principal Contractor/.test(html),
   "with the CDM boundary on its face — a specification must never imply that role");
ok(/ETABLIX<small>INTEGRATED SITE SERVICES/.test(html) && /15405437/.test(html),
   "and the wordmark and company particulars, so it is issuable as it stands");
ok(!/(^|>)\s*#{1,6}\s/m.test(html.replace(/<style[\s\S]*?<\/style>/g, "")),
   "no markdown hash reaches the client");

srv?.kill("SIGKILL"); mock?.kill("SIGKILL");
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
