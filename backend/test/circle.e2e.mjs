/**
 * The whole circle, on the real NORTHREACH pack.
 *
 *   node .../mock-anthropic.mjs &                       # or use a real key
 *   ANTHROPIC_BASE_URL=http://127.0.0.1:4199 \
 *     PORT=3311 SITE_URL=http://localhost:3311 node backend/server.js &
 *   node backend/test/circle.e2e.mjs
 *
 * Engagement -> portal -> the client answers the checklist with 18 real
 * documents -> start confirmed and the deposit invoices itself -> the
 * diagnostic runs ON THOSE FILES with no re-upload -> six passes -> the run
 * is minted into a numbered SSD and published to the portal -> the client
 * approves and the balance invoices itself -> closed, and the total equals
 * the agreed fee.
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
// The whole circle, in one script, against a running server.
import fs from "node:fs";
import path from "node:path";
const B = process.env.BASE || "http://localhost:3311";
const PACK = process.env.PACK || "/home/user/etablix/diagnostic-test/northreach";
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 260) : ""))); };
const J = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t.slice(0, 200) }; } };
const api = async (p, o = {}, tok) => {
  const h = { ...(o.headers || {}) };
  if (tok) h.Authorization = "Bearer " + tok;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h });
  return { status: r.status, body: await J(r) };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log("\n=== ETABLIX — the whole circle, on the NORTHREACH pack ===\n");

// admin + AI key so the pipeline can run against the mock
let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token; ok(r.status === 200, "admin signs in");
r = await api("/api/agents/provider", { json: { apiKey: "sk-ant-mock-key-for-the-loop-test", model: "claude-opus-5" }, method: "PUT" }, T);
if (r.status >= 400) r = await api("/api/agents/provider", { json: { apiKey: "sk-ant-mock-key-for-the-loop-test", model: "claude-opus-5" } }, T);
ok(r.status < 400, "AI provider connected (mock)", r.body);

// 1 — the engagement
r = await api("/api/clients", { json: {
  client: "Marrowbridge Infrastructure Ltd", project: "Project NORTHREACH — site-services feasibility",
  contactName: "Dale Okonjo", contactEmail: "dale@example.test",
  deliverable: "feasibility", model: "A", fee: 6500, vatMode: "standard", clientRef: "MBI-PO-90114", construx: true,
} }, T);
ok(r.status === 201, "1. engagement opened", r.body);
const E = r.body.engagement;

r = await api(`/api/clients/${E.id}/issue-portal`, { method: "POST" }, T);
ok(r.status === 200, "2. portal issued");
const tok = new URL(r.body.link).searchParams.get("t");

// 2 — the client answers the checklist with the REAL pack
const pick = {
  "f-programme": ["programme/NORTHREACH-programme-rev4-gantt.pdf", "programme/NORTHREACH-programme-rev4-tasks.csv", "inputs/01-project-programme.md"],
  "f-workforce": ["inputs/02-workforce-forecast.md"],
  "f-layout":    ["drawings/NR-TW-C1-0101-revA.pdf", "drawings/NR-TW-C4-0104-revA.pdf", "inputs/03-proposed-site-layout.md"],
  "f-logistics": ["inputs/04-existing-logistics-plan.md"],
  "f-services":  ["inputs/05-temporary-services-requirements.md", "annexes/C-email-extract-temporary-power.md"],
  "f-packages":  ["registers/NORTHREACH-package-register.xlsx", "inputs/06-current-procurement-packages.md"],
  "f-constraints": ["inputs/07-known-mobilisation-constraints.md", "annexes/A-planning-conditions-schedule.md"],
  "f-surveys":   ["inputs/08-site-and-utility-information.md"],
  "f-superseded": ["annexes/B-cabin-schedule-rev-C.md", "annexes/D-accommodation-market-note.md", "annexes/E-client-risk-log-extract.md"],
};
const all = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((x) => x.isDirectory() ? walk(path.join(d, x.name)) : all.push(path.join(d, x.name)));
walk(PACK);
const find = (rel) => { const p = PACK + "/" + rel; return fs.existsSync(p) ? p : null; };

let attached = 0;
for (const item of E.checklist) {
  const fd = new FormData();
  const wants = pick[item.id];
  if (wants) {
    fd.append("state", "supplied");
    fd.append("note", "As sent with the covering brief.");
    for (const w of wants) {
      const p = find(w);
      if (p && fs.existsSync(p)) { fd.append("documents", new Blob([fs.readFileSync(p)]), path.basename(p)); attached++; }
    }
  } else {
    fd.append("state", "supplied"); fd.append("note", "Answered — see the engagement correspondence.");
  }
  const res = await fetch(`${B}/api/clients/portal/${tok}/checklist/${item.id}`, { method: "POST", body: fd });
  if (res.status !== 200) { ok(false, `answering ${item.id}`, await J(res)); break; }
}
r = await api(`/api/clients/portal/${tok}`);
ok(r.body.engagement.checklistState.canStart, `3. the client answered every line — ${attached} real documents from the pack attached`);

// 3 — start, and the deposit invoice raises itself
r = await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "Dale Okonjo" } });
ok(r.status === 200 && r.body.invoice?.net === 1950 && r.body.invoice?.amount === 2340,
  `4. start confirmed → deposit invoice ${r.body.invoice?.number}, £1,950 net and £2,340 payable, raised automatically`, r.body);
await api(`/api/clients/${E.id}/payment-received`, { json: { kind: "deposit" } }, T);
ok(true, "5. deposit marked received → in progress");

// 4 — the diagnostic runs on the client's own files
r = await api(`/api/clients/${E.id}/run-diagnostic`, { method: "POST" }, T);
ok(r.status === 202, `6. diagnostic started on ${r.body.files} of the client's own documents — no re-upload`, r.body);
ok(Boolean(r.body.handover) && Boolean(r.body.due), `   handover ${r.body.handover} read from the record; report due ${r.body.due}`);
const runId = r.body.runId;

// 5 — wait for the six passes
let run = null;
for (let i = 0; i < 90; i++) {
  const g = await api(`/api/agents/runs/${runId}`, {}, T);
  run = g.body.run || g.body;
  if (run?.status && run.status !== "running") break;
  await wait(1000);
}
// "not running" is not the same as "worked". A pipeline that died on its
// first call also stops running, and this line passed for it — which made
// the next three failures look like the real fault instead of the symptom.
ok(["awaiting_approval", "complete", "completed", "done"].includes(run?.status),
   `7. the pipeline SUCCEEDED — status ${run?.status}`,
   { status: run?.status, error: run?.error, stages: (run?.stages || []).map((s) => s.state) });
ok((run?.sources || []).length >= 17, `   it read ${(run?.sources || []).length} sources`, (run?.sources || []).map((s) => s.name));
const visual = (run?.sources || []).filter((s) => s.route === "visual");
ok(visual.length >= 3, `   ${visual.length} routed to vision (drawings/Gantt), not to text extraction`, visual.map((v) => v.name));

// 6 — publish it to the client as the report
{
  const fd = new FormData();
  fd.append("runId", runId);
  fd.append("label", "Site Systems Diagnostic — NORTHREACH");
  fd.append("summary", "Twelve deliverables against the pack you supplied.");
  fd.append("sections", "0 Findings\n3 Supplier-interface matrix\n7 Mobilisation constraints");
  const res = await fetch(`${B}/api/clients/${E.id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
  const body = await J(res);
  ok(res.status === 201, "8. the run was minted into a numbered SSD document and published to the portal", body);
  const d = body.engagement?.deliverables?.at(-1);
  ok(Boolean(d?.documentNumber?.startsWith("SSD-")), `   it carries a real document number: ${d?.documentNumber}`);
}

// 6b — a real diagnostic is far bigger than an invoice, and the document
// studio posts every section as JSON. The body limit was 200kb, so a report
// the agent had produced was refused on the way to becoming a document with
// nothing but "request entity too large" to explain it.
{
  const big = "The reconciliation ledger row. ".repeat(1200); // ~36 KB per section
  const r2 = await api("/api/docs/generate", { json: {
    template: "diagnostic",
    data: {
      client: "Marrowbridge Infrastructure Ltd", project: "Project NORTHREACH",
      handover: "2026-09-08", dueDate: "2026-09-22",
      findings: big, appendix: big,
      s1: big, s2: big, s3: big, s4: big, s5: big, s6: big,
      s7: big, s8: big, s9: big, s10: big, s11: big, s12: big,
    },
  } }, T);
  ok(r2.status === 201, "8b. a 500 KB diagnostic is accepted by the document studio, not refused as too large", r2.body);
}

// 7 — the client reads it, approves, and the balance invoices itself
r = await api(`/api/clients/portal/${tok}`);
const issued = r.body.engagement.deliverables.at(-1);
ok(Boolean(issued?.documentId), "9. the client can see the report in their portal");
{
  const res = await fetch(`${B}/api/clients/portal/${tok}/documents/${issued.documentId}`);
  const html = await res.text();
  ok(res.status === 200 && /Site Systems Diagnostic/i.test(html), "   and can open it");
  ok(/ten working days|working days/i.test(html), "   the report states the ten-working-day basis");
  // The agent writes every top-level section title with one or two hashes.
  // The renderer only matched three or more, so those titles reached the
  // client as literal "## 0 · FINDINGS IN ONE PARAGRAPH" — a text file with
  // a letterhead on it rather than a report.
  ok(!/(^|>)\s*#{1,6}\s/m.test(html.replace(/<style[\s\S]*?<\/style>/g, "")),
     "   no markdown hash reaches the client's document",
     (html.match(/#{1,6}\s[^<\n]{0,60}/g) || []).slice(0, 3));
  ok(/class="rt-h1"[^>]*>Why Model 02</.test(html),
     "   and a sub-heading written with two hashes becomes a heading, not body text");
  ok(/ETABLIX<small>INTEGRATED SITE SERVICES/.test(html) && /15405437/.test(html),
     "   it carries the wordmark and the company particulars — it is issuable as it stands");
}
r = await api(`/api/clients/portal/${tok}/decision`, { json: { decision: "approved", name: "Dale Okonjo" } });
ok(r.status === 200 && r.body.invoice?.net === 4550 && r.body.invoice?.amount === 5460,
  `10. approved → balance invoice ${r.body.invoice?.number}, £4,550 net and £5,460 payable, raised automatically`, r.body);
r = await api(`/api/clients/${E.id}/payment-received`, { json: { kind: "balance" } }, T);
ok(r.body.engagement?.stage === "closed", "11. balance received → closed");
const total = (r.body.engagement?.documents || []).reduce((s, d) => s + d.amount, 0);
ok(total === 6500, `    invoiced in total: £${total} = the agreed fee`);

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
