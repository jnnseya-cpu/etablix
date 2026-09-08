/**
 * The two promises the portal makes to a client that nothing else asserts.
 *
 *   PORT=3311 SITE_URL=http://localhost:3311 node backend/server.js &
 *   node backend/test/portal-promises.e2e.mjs
 *
 * 1. "I do not hold this" is a first-class answer. It is refused without a
 *    reason, accepted with one, counts as settled, is deducted from the
 *    outstanding count and never appears in outstandingItems again. That is
 *    the "no repetition" claim and it is the one worth testing.
 * 2. A decision that changes the work must carry the reason that lets it be
 *    answered. Review with no comment is refused; reject with no reason is
 *    refused; a comment against a named section is accepted.
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
const B = "http://localhost:3311";
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 300) : ""))); };
const api = async (p, o = {}, tok) => {
  const h = { ...(o.headers || {}) };
  if (tok) h.Authorization = "Bearer " + tok;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h });
  const t = await r.text();
  let body; try { body = JSON.parse(t); } catch { body = { _raw: t.slice(0, 200) }; }
  return { status: r.status, body };
};

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token; ok(r.status === 200, "admin signs in");

r = await api("/api/clients", { json: {
  client: "Probe Client Ltd", project: "Probe — portal promises", deliverable: "feasibility",
  model: "A", fee: 6500, contactEmail: "probe@example.com", construxInScope: true } }, T);
const id = r.body.engagement?.id; ok(!!id, "engagement opened", r.body);
r = await api(`/api/clients/${id}/issue-portal`, { json: {} }, T);
const tok = r.body.engagement?.portalToken; ok(!!tok, "portal issued");

// --- 1. a mandatory line marked "not held" with no reason must be refused
const g = await api(`/api/clients/portal/${tok}`);
const items = g.body.engagement.checklist.filter((i) => i.mandatory);
const line = items[0];
r = await api(`/api/clients/portal/${tok}/checklist/${line.id}`, { json: { state: "not_held" }, });
ok(r.status === 400, `"not held" with no reason is refused (${line.title})`, r.body);
ok(/why it does not exist|not held/i.test(JSON.stringify(r.body)), "and the refusal explains why a reason is needed");

// --- 2. with a reason it settles, counts as answered, and stops being outstanding
r = await api(`/api/clients/portal/${tok}/checklist/${line.id}`, { json: { state: "not_held", note: "No survey was ever commissioned for this site." }, });
ok(r.status < 400, "\"not held\" with a reason is accepted", r.body);
const after = (await api(`/api/clients/portal/${tok}`)).body.engagement;
const same = after.checklist.find((i) => i.id === line.id);
ok(same.state === "not_held", "the line stays settled at not_held");
ok(!/outstanding/i.test(same.state), "it is not counted as outstanding");
const outstanding = (after.checklistState?.outstandingItems || []).map((i) => i.id);
ok(!outstanding.includes(line.id), "it is not in outstandingItems — it will not be chased again", outstanding);
ok(after.checklistState.settled === 1, "it counts as settled", after.checklistState);
ok(after.checklistState.mandatoryOutstanding === after.checklistState.mandatoryTotal - 1,
   "and it is deducted from the mandatory outstanding count", after.checklistState);
console.log("     next action to the client: " + JSON.stringify(after.nextAction?.client || after.nextAction));

// --- 3. answer the rest, start, and get to a published deliverable
for (const i of after.checklist.filter((x) => x.mandatory && x.state !== "not_held"))
  await api(`/api/clients/portal/${tok}/checklist/${i.id}`, { json: { state: "supplied", note: "provided" }, });
const st = (await api(`/api/clients/portal/${tok}`)).body.engagement.checklistState;
ok(st.canStart, "every mandatory line answered — the client can start, with one not held", st);

await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "A Client" } });
await api(`/api/clients/${id}/payment-received`, { json: { kind: "deposit" } }, T);
const fd = new FormData();
fd.append("label", "Probe report");
fd.append("summary", "A probe deliverable.");
fd.append("sections", "Section 1\nSection 2");
fd.append("documents", new Blob([Buffer.from("Body of the probe report.")]), "probe-report.md");
r = await fetch(B + `/api/clients/${id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd })
      .then(async (x) => ({ status: x.status, body: await x.json().catch(() => ({})) }));
ok(r.status < 400, "a deliverable is published to the portal", r.body);

// --- 4. review with no comment must be refused; with a comment accepted
r = await api(`/api/clients/portal/${tok}/decision`, { json: { decision: "review" } });
ok(r.status === 400, "\"Review with comments\" with no comment is REFUSED", r.body);
r = await api(`/api/clients/portal/${tok}/decision`, { json: { decision: "review", comments: [{ section: "Section 1", comment: "The power figure looks like kW not kVA." }] } });
ok(r.status < 400, "with a comment against a named section it is accepted", r.body);
r = await api(`/api/clients/portal/${tok}/decision`, { json: { decision: "rejected" } });
ok(r.status === 400, "\"Reject\" with no reason is also refused", r.body);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
