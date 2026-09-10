/**
 * Agent 3 end to end: last month's register in, this month's issue out.
 *
 *   BASE=http://localhost:3391 node backend/test/interfaces.e2e.mjs
 *
 * The interface register is the only document in the system that is carried
 * forward, so this walk exists to prove the thing that only shows up across
 * two issues: the register and its own movement log reconcile, and an
 * interface open at the last issue cannot vanish from this one without a
 * closure being logged.
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

console.log("\n=== Agent 3: last month's register in, this month's issue out ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token;
ok(r.status === 200, "admin signs in");

console.log("\n--- the agent\n");
{
  const g = await api("/api/agents", {}, T);
  const a = (g.body.agents || []).find((x) => x.id === "design");
  ok(Boolean(a), "Agent 3 is in the catalogue");
  ok((a?.fields || []).length >= 10, `it asks for ${a?.fields?.length} inputs, not three`, a?.fields?.map((f) => f.name));
  const names = (a?.fields || []).map((f) => f.name);
  ok(names.includes("previous"), "including the PREVIOUS register, which is what makes it a living document");
  ok(names.includes("ownership"), "and what establishes ownership, said by class");
  ok(names.includes("disputes"), "and any interface two parties disagree about");
}

console.log("\n--- the run\n");
const fd = new FormData();
fd.append("title", "Interfaces e2e — issue 04");
fd.append("inputs", JSON.stringify({
  client: "A client", project: "Site establishment, 60 weeks",
  period: "Issue 04, 2026-10-26; previous issue 03 dated 2026-09-28",
  packages: "P01 Compound civils, Supplier A. P02 Welfare and accommodation, Supplier B. P03 Temporary power, Supplier C.",
  previous: "IF-1 P01→P02 Temporary Works Coordinator Open 2026-11-02. IF-2 P02→P03 Delivery Lead Open 2026-11-09. IF-3 P01→P03 Delivery Lead Ready 2026-10-12.",
  workforce: "Peak 340 on two shifts, 60% overlap.",
  site: "Drawings C-1042 rev C, C-1044 rev A, E-3301 rev B.",
  programme: "P02 required on site 2026-11-02. P03 energisation 2026-11-09.",
  ownership: "IF-1 from subcontract P01 clause 4.2. IF-2 from instruction 14. IF-3 from progress meeting 12.",
  change: "Grid connection moved by instruction 14. Duct route added by drawing C-1044 rev A.",
  disputes: "IF-2: P02 says the load schedule is P03's to issue; P03 says it is P02's.",
}));
const started = await fetch(`${B}/api/agents/design/run`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
const sb = await J(started);
ok(started.status === 202, `accepted and backgrounded (${started.status})`, sb);
const id = sb.run?.id;
ok(Boolean(id), "with a run id");
{
  const keys = (sb.run?.stages || []).map((s) => s.key);
  ok(keys.join(",") === "reconcile,d1_2,d3,d4_5,d6_7,d8,final", "seven stages of its own", keys);
  ok(keys.indexOf("d1_2") < keys.indexOf("d3"),
     "and the register is written before its movement log, so the log describes a register that exists");
}

let run = null;
for (let i = 0; i < 300; i += 1) {
  const g = await api(`/api/agents/runs/${id}`, {}, T);
  run = g.body.run || g.body;
  if (run?.status && run.status !== "running") break;
  await wait(1000);
}
ok(run?.status === "awaiting_approval", `it finishes and waits for approval (${run?.status})`, run?.notes);

console.log("\n--- the continuity check\n");
{
  const c = run?.interfaceCheck;
  ok(Boolean(c), "the check ran and its result is stored on the run", Object.keys(run || {}));
  ok(c?.interfaces >= 2, `${c?.interfaces} interfaces in the register`);
  ok(c?.dropped?.length === 0, "nothing carried forward has been lost", c?.dropped);
  ok(c?.unowned?.length === 0, "every open interface has one named owner", c?.unowned);
  ok(c?.unwitnessed?.length === 0, "every boundary is a point a person could stand at", c?.unwitnessed);
  ok(c?.undated?.length === 0, "and every open interface has a date", c?.undated);
  ok(c?.closedThisPeriod >= 1, `a closure is logged for an interface absent from the register (${c?.closedThisPeriod})`);
  ok(c?.ok === true, "so the register passes the gate", c);
  ok((run?.notes || []).every((n) => !/MISSING FROM THE REGISTER|NO SINGLE NAMED OWNER|COULD NOT BE CHECKED/.test(n)),
     "and there is no continuity note — a register that reconciles produces none", run?.notes);
}

console.log("\n--- the numbered register\n");
r = await api(`/api/agents/runs/${id}/decision`, { json: { decision: "approve", note: "Reviewed for the e2e" } }, T);
ok(r.status === 200, `the run is approved (${r.status})`, r.body);

r = await api(`/api/docs/from-run/${id}`, {}, T);
ok(r.status === 200, `it drafts into a document (${r.status})`, r.body);
ok(r.body.template === "interfaces", `as an interface register (${r.body.template})`);
ok(r.body.missing?.length === 0, "with all eight parts found", r.body.missing);
ok(/reconciles with its own movement log/.test(r.body.data?.packStatement || ""),
   "and the continuity result travels onto the document", (r.body.data?.packStatement || "").slice(0, 100));

const draft = r.body;
r = await api("/api/docs/generate", { json: { template: "interfaces", data: { ...draft.data, handover: "2026-10-26" }, runId: id } }, T);
ok(r.status === 201, `the document is created (${r.status})`, r.body);
const doc = r.body.document;
ok(/^IFR-/.test(doc?.number || ""), `numbered in its own series (${doc?.number})`);

{
  const p = await api(`/api/docs/${doc.id}/parts`, {}, T);
  ok((p.body.parts || []).length === 8, `it prints as eight parts (${(p.body.parts || []).length})`);
  const three = await fetch(`${B}/api/docs/${doc.id}/render?part=3&token=${encodeURIComponent(T)}`);
  const html3 = await three.text();
  ok(three.status === 200, `part 3, the movement log, renders on its own (${three.status})`);
  ok(/CARRIED FORWARD|CLOSED/.test(html3), "carrying the movements");
  const whole = await (await fetch(`${B}/api/docs/${doc.id}/render?token=${encodeURIComponent(T)}`)).text();
  ok(/Continuity check/.test(whole), "and the check is headed Continuity check");
  ok(!/Issue check|Completeness check|Payment check/.test(whole), "not another product's wording");
  ok(/RECORDS ownership as the project has agreed it; it does not assign it/.test(whole),
     "the legal note says it records ownership rather than assigning it");
  ok(/fire and rescue authority/.test(whole), "and refers life safety out rather than answering it");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
