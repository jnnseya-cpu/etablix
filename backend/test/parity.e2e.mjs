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

console.log("\n=== every Model A deliverable delivers alike ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.b.token; ok(r.s === 200, "admin signs in");
await api("/api/agents/provider", { json: { apiKey: "sk-ant-mock", model: "claude-opus-5" }, method: "PUT" }, T);

/**
 * One row per deliverable: what it should be produced by, what its stages
 * should be called, which document series it should be numbered in, and two
 * phrases that could only come from that product.
 *
 * The two phrases are the point. The output splitter takes sections by NUMBER
 * rather than by title, so another agent's content lands in the right fields
 * and produces a document that looks entirely correct — twelve populated
 * sections, a valid number, the right headings, every word from the wrong
 * product. Asserting the fields are populated catches nothing.
 */
const CASES = [
  { deliverable: "feasibility", fee: 11500, agent: "diagnostic", prefix: "SSD-",
    stages: "reconcile,s1_3,s4_6,s7_9,s10_12,final", sections: 12, pack: "f", field: "s",
    title: "Site Systems Diagnostic",
    words: [[3, /Fails how|superseded schedule/], [7, /consent|Section 278|lead time/i]] },
  { deliverable: "site-requirements", fee: 26000, agent: "site-requirements", prefix: "SMR-",
    stages: "reconcile,r1_3,r4_6,r7_9,r10_12,final", sections: 12, pack: "s", field: "r",
    title: "Site Management Requirements Package",
    words: [[2, /Contractor shall|Employer/], [9, /Part II|payment/i]] },
  { deliverable: "mobilisation-review", fee: 9500, agent: "mobilisation-review", prefix: "MRR-",
    stages: "reconcile,m1_3,m4_6,m7_8,final", sections: 8, pack: "m", field: "m",
    title: "Mobilisation-readiness review",
    words: [[1, /READY|AT RISK|NOT READY/], [8, /DELIVERABLE|verdict/i]] },
  { deliverable: "village-requirements", fee: 32000, agent: "village-requirements", prefix: "WVR-",
    stages: "reconcile,v1_3,v4_6,v7_9,v10_12,final", sections: 12, pack: "v", field: "v",
    title: "Workforce Village Requirements Package",
    words: [[1, /bed|beds/i], [6, /SAFETY-CRITICAL/]] },
  { deliverable: "procurement", fee: 9500, agent: "procurement", prefix: "TEV-",
    stages: "reconcile,p1_3,p4_6,p7_8,final", sections: 8, pack: "p", field: "p",
    title: "Tender evaluation report",
    words: [[4, /normalis|As returned/i], [8, /Recommend/i]] },
];

// --- every one is registered as an agent with its own inputs
r = await api("/api/agents", {}, T);
const agents = r.b.agents || [];
for (const c of CASES) {
  const a = agents.find((x) => x.id === c.agent);
  ok(Boolean(a) && (a.fields || []).length >= 10,
     `${c.agent} is registered with its own ${a?.fields?.length} input fields`);
}

for (const c of CASES) {
  console.log(`\n--- ${c.deliverable}\n`);

  r = await api("/api/clients", { json: {
    client: "Marrowbridge Infrastructure Ltd", project: `NORTHREACH — ${c.deliverable}`,
    contactName: "Dale Okonjo", contactEmail: "dale@example.test",
    deliverable: c.deliverable, model: "A", fee: c.fee, vatMode: "standard",
  } }, T);
  ok(r.s === 201, "engagement opened", r.b);
  const E = r.b.engagement;

  r = await api(`/api/clients/${E.id}/issue-portal`, { method: "POST" }, T);
  const tok = new URL(r.b.link).searchParams.get("t");
  r = await api(`/api/clients/portal/${tok}`);
  const items = r.b.engagement.checklist;
  const own = items.filter((i) => i.id.startsWith(`${c.pack}-`));
  ok(own.length >= 7, `the client gets its own ${own.length}-question pack`, own.map((i) => i.id));

  for (const item of items) {
    const fd = new FormData();
    fd.append("state", "supplied");
    fd.append("note", `Answered for ${item.id}. Enough to work from.`);
    await fetch(`${B}/api/clients/portal/${tok}/checklist/${item.id}`, { method: "POST", body: fd });
  }
  await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "Dale Okonjo" } });
  await api(`/api/clients/${E.id}/payment-received`, { json: { kind: "deposit" } }, T);

  r = await api(`/api/clients/${E.id}/run-diagnostic`, { method: "POST" }, T);
  ok(r.s === 202, "the engagement runs its own agent — no re-upload, no re-entry", r.b);
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
  ok(run?.agent === c.agent, `produced by ${run?.agent}`);

  const keys = (run?.stages || []).map((x) => x.key);
  ok(keys.join(",") === c.stages, `its own ${keys.length} stages: ${keys.join(", ")}`, keys);

  await api(`/api/agents/runs/${runId}/decision`, { json: { decision: "approve" } }, T);
  r = await api(`/api/docs/from-run/${runId}`, {}, T);
  const data = r.b.data || {};
  const re = new RegExp(`^${c.field}\\d+$`);
  const filled = Object.entries(data).filter(([k, v]) => re.test(k) && String(v).trim()).map(([k]) => k);
  ok(filled.length === c.sections, `all ${c.sections} of its sections came across`, filled);

  // The words, not the field names.
  for (const [n, pattern] of c.words) {
    const body = String(data[`${c.field}${n}`] || "");
    ok(pattern.test(body), `section ${n} reads as ${c.deliverable}, not another product`, body.slice(0, 110));
  }

  const pub = await (async () => {
    const fd = new FormData();
    fd.append("runId", runId);
    fd.append("label", `${c.title} — NORTHREACH`);
    fd.append("summary", "Ready for the client.");
    fd.append("releaseEarly", "true");
    fd.append("releaseReason", "End-to-end test; the promised date has not arrived.");
    const res = await fetch(`${B}/api/clients/${E.id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
    return { s: res.status, b: await J(res) };
  })();
  ok(pub.s === 201, "it publishes to the client's portal", pub.b);
  const d = pub.b.engagement?.deliverables?.at(-1);
  ok(Boolean(d?.documentNumber?.startsWith(c.prefix)),
     `in its own series: ${d?.documentNumber}`);

  const html = await (await fetch(`${B}/api/docs/${d.documentId}/render?token=${encodeURIComponent(T)}`)).text();
  ok(html.includes(c.title), `the branded document carries its own title: ${c.title}`);
  ok(/ETABLIX<small>INTEGRATED SITE SERVICES/.test(html) && /15405437/.test(html),
     "with the wordmark and company particulars — issuable as it stands");
  ok(!/(^|>)\s*#{1,6}\s/m.test(html.replace(/<style[\s\S]*?<\/style>/g, "")),
     "and no markdown hash reaching the client");
}

// --- the two boundaries that must appear on the face of a document
console.log("\n--- the boundaries that must be printed\n");
{
  const docs = (await api("/api/docs", {}, T)).b.documents || [];
  const village = docs.find((x) => x.number?.startsWith("WVR-"));
  const html = await (await fetch(`${B}/api/docs/${village.id}/render?token=${encodeURIComponent(T)}`)).text();
  ok(/NOT A FIRE STRATEGY|not a fire strategy/i.test(html),
     "the village package says on its face that it is NOT a fire strategy — people sleep there");
  ok(/fire and rescue authority/i.test(html), "and names who must determine it");

  const tev = docs.find((x) => x.number?.startsWith("TEV-"));
  const th = await (await fetch(`${B}/api/docs/${tev.id}/render?token=${encodeURIComponent(T)}`)).text();
  ok(/does not award|does not place orders/i.test(th),
     "the evaluation says on its face that ETABLIX does not award or place orders");
}

srv?.kill("SIGKILL"); mock?.kill("SIGKILL");
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
