/**
 * Agent 5 end to end: a month of records in, a numbered valuation out.
 *
 *   BASE=http://localhost:3391 node backend/test/control.e2e.mjs
 *
 * WHAT THIS PROVES. The monthly control report is the deliverable a
 * Management Integrator fee buys, produced on the twenty-fifth for the life
 * of the appointment. It is also the only agent whose output moves money: the
 * payment recommendations are acted on by the client, who pays their
 * suppliers directly.
 *
 * So the route matters as much as the content:
 *
 *   1. the run reports its own seven stages, with the measurement pass (c1_2)
 *      before the payment pass (c5) — the ordering the whole check depends on
 *   2. the payment reconciliation runs and its result is stored ON THE RUN,
 *      so the certificate prints the result the desk approved against
 *   3. an approved run mints a numbered MCR report whose parts print
 *      separately, because the client's commercial team reads the valuation
 *      and their board reads the position
 *   4. the certificate says ETABLIX recommends and the client pays, and does
 *      NOT claim to be a certificate under any contract
 */
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log("\n=== Agent 5: a month of records in, a numbered valuation out ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token;
ok(r.status === 200, "admin signs in");

console.log("\n--- the agent\n");
{
  const g = await api("/api/agents", {}, T);
  const a = (g.body.agents || []).find((x) => x.id === "controls");
  ok(Boolean(a), "Agent 5 is in the catalogue");
  ok((a?.fields || []).length >= 10, `it asks for ${a?.fields?.length} inputs, not two`, a?.fields?.map((f) => f.name));
  const names = (a?.fields || []).map((f) => f.name);
  ok(names.includes("applications"), "including the applications for payment, with the date each was received");
  ok(names.includes("previous"), "and last month's report, because the control account numbers must not change");
  ok(names.includes("cash"), "and the reserve and receivables, for the exposure test");
}

console.log("\n--- the run\n");
const fd = new FormData();
fd.append("title", "Control e2e — period 09/2026");
fd.append("inputs", JSON.stringify({
  client: "A client", project: "Site establishment, 60 weeks",
  period: "September 2026, data date 2026-09-30",
  baseline: "P01 Compound civils £900,000. P02 Welfare hire £600,000. P03 Temporary power £300,000.",
  progress: "Compound civils: level survey 2026-09-28 supports 53%. Welfare: supplier email claims 30%; inspection supports 28%. Power: commissioning certificate issued.",
  applications: "Supplier A £128,000 received 2026-09-15. Supplier B £52,000 received 2026-09-15.",
  previous: "CA-1 to CA-3 as last month. Previously certified £540,000.",
  change: "CH-01 additional hardstanding, instructed 2026-09-08, £18,000.",
  contract: "Retention 3%, held by the client.",
  cash: "Reserve £150,000. Confirmed receivables £240,000.",
  costs: "CA-1 committed £918,000, spent £477,000.",
}));
const started = await fetch(`${B}/api/agents/controls/run`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
const sb = await J(started);
ok(started.status === 202, `accepted and backgrounded (${started.status})`, sb);
const id = sb.run?.id;
ok(Boolean(id), "with a run id");

{
  const keys = (sb.run?.stages || []).map((s) => s.key);
  ok(keys.length === 7, `seven stages of its own (${keys.length})`, keys);
  ok(keys.join(",") === "reconcile,c1_2,c3_4,c5,c6_7,c8,final", "in the report's own order", keys);
  ok(keys.indexOf("c1_2") < keys.indexOf("c5"),
     "and the MEASUREMENT pass runs before the PAYMENT pass — the ordering the whole check rests on");
}

let run = null;
for (let i = 0; i < 300; i += 1) {
  const g = await api(`/api/agents/runs/${id}`, {}, T);
  run = g.body.run || g.body;
  if (run?.status && run.status !== "running") break;
  await wait(1000);
}
ok(run?.status === "awaiting_approval", `it finishes and waits for approval (${run?.status})`, run?.notes);

console.log("\n--- the payment check\n");
{
  const c = run?.controlCheck;
  ok(Boolean(c), "the check ran and its result is stored on the run", Object.keys(run || {}));
  ok(c?.accounts === 3, `three control accounts measured (${c?.accounts})`);
  ok(c?.payments === 3, `three payments recommended (${c?.payments})`);
  ok(c?.overpaid?.length === 0, "none exceeding the value earned", c?.overpaid);
  ok(c?.unbacked?.length === 0, "none against an unmeasured account", c?.unbacked);
  ok(c?.undated?.length === 0, "and every payment carries its statutory dates", c?.undated);
  ok(c?.totalRecommended <= c?.totalEarned,
     `money out does not exceed value earned (${c?.totalRecommended} against ${c?.totalEarned})`);
  ok(c?.ok === true, "so the report passes the gate", c);
  ok((run?.notes || []).every((n) => !/EXCEED|nobody measured|COULD NOT BE CHECKED/.test(n)),
     "and there is no payment note — a valuation that reconciles produces none", run?.notes);
}

console.log("\n--- the numbered report\n");
r = await api(`/api/agents/runs/${id}/decision`, { json: { decision: "approve", note: "Reviewed for the e2e" } }, T);
ok(r.status === 200, `the run is approved (${r.status})`, r.body);

r = await api(`/api/docs/from-run/${id}`, {}, T);
ok(r.status === 200, `it drafts into a document (${r.status})`, r.body);
ok(r.body.template === "control", `as a monthly control report (${r.body.template})`);
ok(r.body.runId === id, "carrying the run it came from");
ok(r.body.missing?.length === 0, "with all eight parts found", r.body.missing);
ok(/This valuation reconciles/.test(r.body.data?.packStatement || ""),
   "and the payment result travels onto the document", (r.body.data?.packStatement || "").slice(0, 100));

const draft = r.body;
r = await api("/api/docs/generate", { json: { template: "control", data: { ...draft.data, handover: "2026-09-30" }, runId: id } }, T);
ok(r.status === 201, `the document is created (${r.status})`, r.body);
const doc = r.body.document;
ok(/^MCR-/.test(doc?.number || ""), `numbered in its own series (${doc?.number})`);

{
  const p = await api(`/api/docs/${doc.id}/parts`, {}, T);
  ok((p.body.parts || []).length === 8, `it prints as eight parts (${(p.body.parts || []).length})`);
  const five = await fetch(`${B}/api/docs/${doc.id}/render?part=5&token=${encodeURIComponent(T)}`);
  const html5 = await five.text();
  ok(five.status === 200, `part 5, the payment recommendations, renders on its own (${five.status})`);
  ok(/CA-1/.test(html5), "carrying the control account references");
  const whole = await (await fetch(`${B}/api/docs/${doc.id}/render?token=${encodeURIComponent(T)}`)).text();
  ok(/Payment check/.test(whole), "and the check is headed Payment check");
  ok(!/Issue check|Completeness check/.test(whole), "not another product's wording");
  ok(/ETABLIX RECOMMENDS AND THE CLIENT PAYS|ETABLIX never holds supply-chain money/.test(whole),
     "the legal note says ETABLIX recommends and the client pays");
  ok(/not a certificate under any contract/.test(whole),
     "and that it is not a certificate under any contract — which is the sentence that stops it being treated as one");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
