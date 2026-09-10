/**
 * Agent 2 end to end: an invitation in, a numbered bid file out.
 *
 *   BASE=http://localhost:3391 node backend/test/bid.e2e.mjs
 *
 * WHAT THIS PROVES, AND WHY EACH PART OF IT WAS WORTH PROVING.
 *
 * Agent 2 was a single call with a 16,000-token ceiling and six headings. It
 * is now a seven-pass pipeline with a machine gate, and every one of those
 * words is a place the wiring can be wrong in a way that does not fail
 * loudly. The splitter takes sections BY NUMBER, not by title, so another
 * agent's content landing in the bid file's fields produces a document that
 * looks perfectly correct. That has happened twice in this system's life.
 *
 * So this walks the whole route against the mock:
 *
 *   1. the run is accepted, backgrounded and reports its own seven stages
 *      rather than borrowing the diagnostic's six
 *   2. the submission-completeness check runs, and its result is stored ON
 *      THE RUN — so the bid file prints the result the desk approved against
 *      rather than a second one worked out later from the same text
 *   3. an approved run mints a numbered BID document, each part printing on
 *      its own, which is how a bid is actually uploaded
 *   4. the completeness table appears in the document, headed as a
 *      COMPLETENESS check rather than an issue check — the tender pack's
 *      wording, which describes the opposite direction of travel
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

console.log("\n=== Agent 2: an invitation in, a numbered bid file out ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token;
ok(r.status === 200, "admin signs in");

// --- the agent is registered as a pipeline, with its own stages
console.log("\n--- the agent\n");
{
  const g = await api("/api/agents", {}, T);
  const a = (g.body.agents || []).find((x) => x.id === "bid");
  ok(Boolean(a), "Agent 2 is in the catalogue");
  ok(/Bid & Requirements/.test(a?.name || ""), a?.name);
  ok((a?.fields || []).length >= 8, `it asks for ${a?.fields?.length} inputs, not two`, a?.fields?.map((f) => f.name));
  const required = (a?.fields || []).filter((f) => f.required).map((f) => f.name);
  ok(required.includes("documents") && required.includes("deadline"),
     "the invitation and the deadline are both required — a bid file with no deadline cannot have a timetable", required);
  ok((a?.fields || []).some((f) => f.name === "evidence"),
     "and it asks what we can actually evidence, which is the input that stops an invented certificate");
}

// --- run it
console.log("\n--- the run\n");
const fd = new FormData();
fd.append("title", "Bid e2e — ITT-2026-114");
fd.append("inputs", JSON.stringify({
  client: "A contracting authority",
  project: "Site establishment and welfare, 60 weeks",
  deadline: "12:00 on 15 September 2026",
  documents: "INVITATION TO TENDER ITT-2026-114 rev C. 4.2 The Tenderer shall submit a method statement of no more than six pages. 5.1 Prices shall be submitted on the Employer's pricing template. 6.4 Evidence of public liability insurance of not less than £10m.",
  evidence: "Public liability £5m bound; £10m quoted, not yet bound. No SSIP registration held.",
  context: "We intend to bid Management Integrator.",
}));
const started = await fetch(`${B}/api/agents/bid/run`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
const startedBody = await J(started);
ok(started.status === 202, `the run is accepted and backgrounded (${started.status})`, startedBody);
const id = startedBody.run?.id;
ok(Boolean(id), "with a run id");

{
  const stages = startedBody.run?.stages || [];
  ok(stages.length === 7, `it reports seven stages of its own (${stages.length})`, stages.map((s) => s.key));
  ok(stages.map((s) => s.key).join(",") === "reconcile,b1_2,b3,b4,b5_6,b7_8,final",
     "in the bid file's own order — b3 before b4, so the responses are written against the checklist",
     stages.map((s) => s.key));
  ok(!stages.some((s) => /demand model/i.test(s.label)),
     "and not the diagnostic's stages, which it used to borrow", stages.map((s) => s.label));
}

let run = null;
for (let i = 0; i < 300; i += 1) {
  const g = await api(`/api/agents/runs/${id}`, {}, T);
  run = g.body.run || g.body;
  if (run?.status && run.status !== "running") break;
  await wait(1000);
}
ok(run?.status === "awaiting_approval", `it finishes and waits for approval (${run?.status})`, run?.notes);
ok(!run?.truncated, "and is not cut off");

// --- the gate
console.log("\n--- the submission-completeness check\n");
{
  const c = run?.bidCheck;
  ok(Boolean(c), "the check ran and its result is stored on the run", Object.keys(run || {}));
  ok(c?.required === 3, `three required deliverables found (${c?.required})`);
  ok(c?.matched === 3, `all three have a drafted response (${c?.matched})`);
  ok(c?.undated?.length === 0, "every deadline is a date", c?.undated);
  ok(c?.ok === true, "so the bid passes the gate", c);
  ok((run?.notes || []).every((n) => !/NO RESPONSE|not dates|COULD NOT BE CHECKED/.test(n)),
     "and there is no completeness note — a bid that reconciles produces none", run?.notes);
}

// --- approve, then mint
console.log("\n--- the numbered bid file\n");
r = await api(`/api/agents/runs/${id}/decision`, { json: { decision: "approve", note: "Reviewed for the e2e" } }, T);
ok(r.status === 200, `the run is approved (${r.status})`, r.body);

r = await api(`/api/docs/from-run/${id}`, {}, T);
ok(r.status === 200, `it drafts into a document (${r.status})`, r.body);
ok(r.body.template === "bidfile", `as a bid file, not a tender pack (${r.body.template})`);
ok(r.body.runId === id, "carrying the run it came from, so it can be traced and re-minted");
ok(r.body.missing?.length === 0, "with every one of the eight parts found", r.body.missing);
ok(/complete against the invitation's own checklist/.test(r.body.data?.packStatement || ""),
   "and the completeness result travels onto the document", (r.body.data?.packStatement || "").slice(0, 120));

const draft = r.body;
// The same shape the portal posts: the drafted data, plus the client and
// project the template requires, plus the run it came from.
r = await api("/api/docs/generate", {
  json: {
    template: "bidfile",
    data: { ...draft.data, handover: "2026-09-01" },
    runId: id,
  },
}, T);
ok(r.status === 201, `the document is created (${r.status})`, r.body);
const doc = r.body.document;
ok(/^BID-/.test(doc?.number || ""), `numbered in its own series (${doc?.number})`);
ok(doc?.runId === id, "and records the run on the row itself");

// --- the parts, which is how a bid is uploaded
{
  const p = await api(`/api/docs/${doc.id}/parts`, {}, T);
  ok(p.status === 200 && (p.body.parts || []).length === 8, `it prints as eight separate parts (${(p.body.parts || []).length})`, p.body);
  const one = await fetch(`${B}/api/docs/${doc.id}/render?part=4&token=${encodeURIComponent(T)}`);
  const html = await one.text();
  ok(one.status === 200, `part 4 renders on its own (${one.status})`);
  ok(/SUB-1/.test(html), "carrying the drafted responses");
  const whole = await (await fetch(`${B}/api/docs/${doc.id}/render?token=${encodeURIComponent(T)}`)).text();
  ok(/Completeness check/.test(whole), "and the check is headed Completeness check, not Issue check");
  ok(!/Issue check/.test(whole), "the tender pack's wording does not leak in — it describes the opposite direction");
  ok(/EVIDENCE REQUIRED/.test(whole),
     "the evidence we do not hold is on the page as EVIDENCE REQUIRED rather than invented");
  ok(/not a main contractor|does not tender for the design/.test(whole),
     "and the legal note keeps ETABLIX out of main-works scope");
  const outOfRange = await fetch(`${B}/api/docs/${doc.id}/render?part=9&token=${encodeURIComponent(T)}`);
  ok(outOfRange.status >= 400, `a part that does not exist is refused rather than clamped (${outOfRange.status})`);
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
