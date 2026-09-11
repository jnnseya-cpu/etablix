/**
 * Agent 14 end to end: a finished bid in, an adversarial review out.
 *
 *   BASE=http://localhost:3391 node backend/test/challenge.e2e.mjs
 *
 * This agent exists because a final pass is the same run. The same context,
 * the same prompt lineage and the same reasoning that produced the work
 * cannot find fault with it — it will find typography and miss the assumption
 * running through the whole section, for the same reason a person cannot
 * proofread their own writing.
 *
 * So what is proved here is not that it produces prose. It is that:
 *
 *   · all nine lenses are written, each on its own pass;
 *   · every finding names one lens, one severity, a location and a remedy;
 *   · a critical finding carries no disposition, because a hard block is not
 *     a judgement call;
 *   · and the check runs on the run, travels onto the document, and prints
 *     under its own heading rather than another product's.
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

console.log("\n=== Agent 14: a finished bid in, an adversarial review out ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token;
ok(r.status === 200, "admin signs in");

console.log("\n--- the agent\n");
{
  const g = await api("/api/agents", {}, T);
  const a = (g.body.agents || []).find((x) => x.id === "challenge");
  ok(Boolean(a), "Agent 14 is in the catalogue");
  const names = (a?.fields || []).map((f) => f.name);
  ok(names.includes("under_review"), "it asks for the document under review");
  ok(names.includes("requirement"), "and what it is being judged against");
  ok(names.includes("authorRun"), "and the run that produced it, so independence can be shown rather than claimed");
  ok(!names.includes("working_paper") && !names.includes("reasoning"),
     "AND IT DOES NOT ASK FOR THE AUTHOR'S REASONING — a challenger who reads why something was done is persuaded by it", names);
}

console.log("\n--- the run\n");
const fd = new FormData();
fd.append("title", "Challenge e2e — the bid file for a 60-week civils scheme");
fd.append("inputs", JSON.stringify({
  client: "A client", project: "Site establishment, 60 weeks",
  under_review: "Section 4: we will provide 18 welfare units and ensure the facilities are fit for their intended purpose. Section 5: in accordance with the client's programme. Section 6: £10m public liability.",
  requirement: "SUB-1 method statement 30%. SUB-2 programme 25%. SUB-3 insurance evidence pass/fail. SUB-4 social value plan 15%. Deadline 2026-10-15.",
  evaluation: "SUB-1 30%, SUB-2 25%, SUB-4 15%. SUB-3 is pass/fail.",
  commitments: "Price built on two shifts and 16 welfare units. Qualification 7 makes welfare subject to access.",
  evidence: "ISO 9001 certificate GB-2024-118 expires 2026-10-01. Public liability schedule expires 2027-03-31. Hinkley comparable: nothing supplied.",
  programme: "Three-week establishment. Distribution board delivered week 5.",
  authority: "Signatory J Nseya. No signing limit recorded.",
  authorRun: "Run bid-0091, frontier route, prompt lineage bid-v4.",
}));
const started = await fetch(`${B}/api/agents/challenge/run`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
const sb = await J(started);
ok(started.status === 202, `accepted and backgrounded (${started.status})`, sb);
const id = sb.run?.id;
ok(Boolean(id), "with a run id");
{
  const keys = (sb.run?.stages || []).map((s) => s.key);
  ok(keys.join(",") === "reconcile,d1,d2,d3,d4,d5,final", "seven stages of its own", keys);
  ok(keys.length === 7,
     "nine lenses across five section passes — a lens written alongside eight others is a paragraph, and one written on its own pass is a review");
}

let run = null;
for (let i = 0; i < 300; i += 1) {
  const g = await api(`/api/agents/runs/${id}`, {}, T);
  run = g.body.run || g.body;
  if (run?.status && run.status !== "running") break;
  await wait(1000);
}
ok(run?.status === "awaiting_approval", `it finishes and waits for approval (${run?.status})`, run?.notes);

console.log("\n--- the challenge check\n");
{
  const c = run?.challengeCheck;
  ok(Boolean(c), "the check ran and its result is stored on the run", Object.keys(run || {}));
  ok(c?.lensesApplied?.length === 9, `all nine lenses carry a section (${c?.lensesApplied?.length})`, c?.lensesMissing);
  ok(c?.lensesMissing?.length === 0, "none missing", c?.lensesMissing);
  ok(c?.lensesEmpty?.length === 0, "and none with a heading and nothing under it", c?.lensesEmpty);
  ok(c?.findings >= 5, `${c?.findings} findings, not a clean review`);
  ok(c?.unlensed?.length === 0, "every finding names one of the nine lenses", c?.unlensed);
  ok(c?.unrated?.length === 0, "every finding names one of the four severities", c?.unrated);
  ok(c?.unlocated?.length === 0, "every finding says where", c?.unlocated);
  ok(c?.unremedied?.length === 0, "and every finding says what must happen", c?.unremedied);
  ok(c?.criticalDisposed?.length === 0, "no critical finding carries a disposition", c?.criticalDisposed);
  ok(c?.duplicates?.length === 0, "no reference is used twice", c?.duplicates);
  ok(c?.critical?.length >= 1, `at least one critical finding, so the submission is hard-blocked (${c?.critical?.join(", ")})`);
  ok(c?.ok === true, "so the report passes the gate", c);
  ok((run?.notes || []).every((n) => !/Do not issue this challenge report/.test(n)),
     "and there is no challenge note — a report that is a review produces none", run?.notes);
}
{
  const out = run?.output || "";
  ok(/Evidence lens/.test(out), "the evidence lens is in the report");
  ok(/2026-10-01/.test(out), "and it found the certificate that expires before the deadline");
  ok(/fit for their intended purpose|fitness-for-purpose/.test(out),
     "the contract lens quoted the exact words rather than paraphrasing them");
  ok(/BLOCKED/.test(out), "and the certificate says whether the submission can go");
}

console.log("\n--- the numbered challenge report\n");
r = await api(`/api/agents/runs/${id}/decision`, { json: { decision: "approve", note: "Reviewed for the e2e" } }, T);
ok(r.status === 200, `the run is approved (${r.status})`, r.body);

r = await api(`/api/docs/from-run/${id}`, {}, T);
ok(r.status === 200, `it drafts into a document (${r.status})`, r.body);
ok(r.body.template === "challenge", `as a challenge report (${r.body.template})`);
ok(r.body.missing?.length === 0, "with all eleven parts found", r.body.missing);

const draft = r.body;
r = await api("/api/docs/generate", { json: { template: "challenge", data: { ...draft.data, handover: "2026-10-14" }, runId: id } }, T);
ok(r.status === 201, `the document is created (${r.status})`, r.body);
const doc = r.body.document;
ok(/^CHR-/.test(doc?.number || ""), `numbered in its own series (${doc?.number})`);

{
  const p = await api(`/api/docs/${doc.id}/parts`, {}, T);
  ok((p.body.parts || []).length === 11, `it prints as eleven parts (${(p.body.parts || []).length})`);
  const ten = await fetch(`${B}/api/docs/${doc.id}/render?part=10&token=${encodeURIComponent(T)}`);
  const html10 = await ten.text();
  ok(ten.status === 200, `part 10, the findings register, renders on its own (${ten.status})`);
  ok(/CRITICAL/.test(html10), "carrying the severities");
  const whole = await (await fetch(`${B}/api/docs/${doc.id}/render?token=${encodeURIComponent(T)}`)).text();
  ok(/Challenge check/.test(whole), "and the check is headed Challenge check");
  ok(!/Continuity check|Completeness check|Payment check/.test(whole), "not another product's wording");
  ok(/ADVERSARIAL REVIEW and not an approval/.test(whole),
     "the legal note says what this document is not");
  ok(/cannot be disposed of/.test(whole), "and that a critical finding is corrected or the submission does not go");
}

console.log("\n--- what the register now says about it\n");
{
  const g = await api("/api/l7", {}, T);
  const l73 = (g.body.measured?.levelSeven || []).find((x) => x.id === "L7.3");
  ok(l73?.state === "built", `the adversarial self-challenge property is now built (${l73?.state})`);
  ok(l73?.detail?.challengerAgentExists === true, "because the challenger exists, read from the pipeline registry rather than typed");
  ok(g.body.measured?.drift?.levelSeven?.length === 0, "and the register agrees with the measurement", g.body.measured?.drift);
  // NOT A COUNT. This used to assert "three of seven built", which was true
  // the day it was written and broke the moment another property landed —
  // a test that fails when unrelated work succeeds teaches people to edit
  // tests rather than read them. What this suite actually cares about is
  // that the challenger closed L7.3 and the register did not drift.
  ok(l73?.measured === true, "measured by running the control rather than read from a column");
  ok(g.body.measured?.counts?.l7Built >= 3,
     `at least the three properties this agent depends on are built (${g.body.measured?.counts?.l7Built} of 7)`);
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
