/**
 * Client engagement lifecycle — end to end, against a running server.
 *
 *   PORT=3311 SITE_URL=http://localhost:3311 node backend/server.js &
 *   node backend/test/clientflow.e2e.mjs
 *
 * It drives the real HTTP path, because the things that break in this
 * flow are the joins: an invoice that does not reach the studio, a
 * portal payload that leaks a token, one client able to open another
 * client's invoice. None of those are visible from a unit test of the
 * state machine.
 *
 * It writes to the database it runs against — point it at a scratch
 * copy, not a live one.
 */
const B = process.env.BASE || "http://localhost:3311";
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m + (extra ? "  → " + JSON.stringify(extra).slice(0, 300) : "")); } };
const J = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t.slice(0, 300) }; } };

const api = async (path, opts = {}, tok) => {
  const h = { ...(opts.headers || {}) };
  if (tok) h.Authorization = "Bearer " + tok;
  if (opts.json) { h["Content-Type"] = "application/json"; opts.body = JSON.stringify(opts.json); opts.method = opts.method || "POST"; }
  const r = await fetch(B + path, { ...opts, headers: h });
  return { status: r.status, body: await J(r) };
};

console.log("\n=== ETABLIX client portal — end to end ===\n");

// login
let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
ok(r.status === 200 && r.body.token, "admin signs in", r.body);
const T = r.body.token;

// catalogue
r = await api("/api/clients/catalogue", {}, T);
ok(r.status === 200 && r.body.deliverables.length === 7 && r.body.models.length === 3, "catalogue: 7 deliverables, 3 models", r.body);

// ---------------------------------------------------------------- MODEL A
console.log("\n-- Model A: feasibility, £7,500 fixed --");
r = await api("/api/clients", { json: {
  client: "Marrowbridge Infrastructure Ltd", project: "Project NORTHREACH — feasibility",
  contactName: "Dale Okonjo", contactEmail: "dale@example.test",
  deliverable: "feasibility", model: "A", fee: 7500, vatMode: "reverse", clientRef: "MBI-PO-88213", construx: true,
} }, T);
ok(r.status === 201, "engagement opens", r.body);
const A = r.body.engagement;
ok(A.stage === "agreed", "stage = agreed");
ok(A.checklist.length === 14, `checklist built: ${A.checklist?.length} items`);
ok(A.deposit.amount === 2250, `deposit = £2,250 (30%)  got ${A.deposit.amount}`);
ok(A.balance.amount === 5250, `balance = £5,250 (70%)  got ${A.balance.amount}`);

r = await api(`/api/clients/${A.id}/issue-portal`, { method: "POST" }, T);
ok(r.status === 200 && r.body.link.includes("/client-portal?t="), "portal issued with a link", r.body);
ok(r.body.engagement.stage === "information", "stage → information");
const tok = new URL(r.body.link).searchParams.get("t");

// portal view
r = await api(`/api/clients/portal/${tok}`);
ok(r.status === 200, "portal loads for the client", r.body);
ok(r.body.engagement.portalToken === undefined, "portal payload does not leak the token");
ok(r.body.engagement.internalNotes === undefined, "portal payload does not leak internal notes");
ok(r.body.platforms.construx.inScope === true && r.body.platforms.veryx.inScope === false, "CONSTRUX in scope, VERYX not");
ok(r.body.pack.clockNote.includes("10 working days"), "the ten-working-day clock is stated");
const chk0 = r.body.engagement.checklistState;
ok(chk0.canStart === false, "cannot start with the checklist untouched");

// try to start early
r = await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "Dale Okonjo" } });
ok(r.status === 400 && /required item/.test(r.body.error), "start is refused, naming what is outstanding", r.body);

// answer items
const items = A.checklist;
let mandatoryOutstanding = null;
for (const [i, it] of items.entries()) {
  const mode = i % 4 === 3 ? "not_held" : "supplied";
  const fd = new FormData();
  fd.append("state", mode);
  fd.append("note", mode === "not_held" ? "Not held — this project has never produced one." : "Attached / answered.");
  const res = await fetch(`${B}/api/clients/portal/${tok}/checklist/${it.id}`, { method: "POST", body: fd });
  const body = await J(res);
  if (res.status !== 200) { ok(false, `answer ${it.id}`, body); break; }
  mandatoryOutstanding = body.engagement.checklistState.mandatoryOutstanding;
}
ok(mandatoryOutstanding === 0, `every item answered — mandatory outstanding now ${mandatoryOutstanding}`);

// not_held without a note is refused
{
  const fd = new FormData(); fd.append("state", "not_held"); fd.append("note", "");
  const res = await fetch(`${B}/api/clients/portal/${tok}/checklist/${items[0].id}`, { method: "POST", body: fd });
  const body = await J(res);
  ok(res.status === 400 && /absence we know about/.test(body.error), "'not held' with no explanation is refused", body);
}

// start without the authorisation tick
r = await api(`/api/clients/portal/${tok}/start`, { json: { name: "Dale Okonjo" } });
ok(r.status === 400 && /authorised/.test(r.body.error), "start refused without the authorisation confirmation", r.body);

// confirm the start
r = await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "Dale Okonjo" } });
ok(r.status === 200, "start confirmed", r.body);
ok(r.body.invoice?.amount === 2250, `deposit invoice raised AUTOMATICALLY at £2,250 — got ${r.body.invoice?.amount}`);
ok(/^INV-\d{4}-\d{3}$/.test(r.body.invoice?.number || ""), `invoice is in the INV series: ${r.body.invoice?.number}`);
ok(r.body.engagement.stage === "deposit", "stage → deposit");
const depositNo = r.body.invoice.number;

// the invoice is a real document in the studio
r = await api("/api/docs", {}, T);
const studioDoc = (r.body.documents || []).find((d) => d.number === depositNo);
ok(Boolean(studioDoc), "the automatic invoice appears in the document studio", { looked_for: depositNo });
{
  const html = await (await fetch(`${B}/api/clients/portal/${tok}/documents/${studioDoc.id}`)).text();
  ok(/domestic reverse charge/i.test(html), "the rendered invoice applies the domestic reverse charge");
  ok(html.includes("2,250.00"), "it shows £2,250.00");
  ok(/MBI-PO-88213/.test(html), "it carries the client's own PO reference");
  ok(/Dale Okonjo/.test(html), "it names who instructed the start, in the portal, on what date");
  ok(/raised automatically on the client/i.test(html), "it says on its face that it was raised automatically");
}

// double-start is refused
r = await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "Dale Okonjo" } });
ok(r.status === 400, "the start cannot be confirmed twice", r.body);

// deposit received
r = await api(`/api/clients/${A.id}/payment-received`, { json: { kind: "deposit" } }, T);
ok(r.status === 200 && r.body.engagement.stage === "in_progress", "deposit received → in progress", r.body);

// publish the deliverable
{
  const fd = new FormData();
  fd.append("label", "Site Systems Diagnostic — NORTHREACH");
  fd.append("summary", "Twelve deliverables. Thirty-three findings, four of them on the consent chain.");
  fd.append("sections", "1 Findings\n3 Supplier-interface matrix\n7 Mobilisation constraints");
  fd.append("documents", new Blob(["report"], { type: "text/plain" }), "SSD-NORTHREACH.txt");
  const res = await fetch(`${B}/api/clients/${A.id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
  const body = await J(res);
  ok(res.status === 201 && body.engagement.stage === "decision", "deliverable published → awaiting decision", body);
}

// decision: review with no comments is refused
r = await api(`/api/clients/portal/${tok}/decision`, { json: { decision: "review", name: "Dale Okonjo", comments: [] } });
ok(r.status === 400 && /comment against a section/.test(r.body.error), "review with no comments is refused", r.body);

// decision: review with comments
r = await api(`/api/clients/portal/${tok}/decision`, { json: {
  decision: "review", name: "Dale Okonjo",
  comments: [{ section: "7 Mobilisation constraints", comment: "The ecology condition is discharged — reissue against the notice attached." }],
} });
ok(r.status === 200 && r.body.engagement.stage === "in_progress", "review sends it back to us", r.body);
ok(r.body.invoice === null, "no invoice is raised on a review");

// reissue
{
  const fd = new FormData();
  fd.append("label", "Site Systems Diagnostic — NORTHREACH");
  fd.append("summary", "Revision 2. Section 7 reissued against the discharged ecology condition.");
  fd.append("documents", new Blob(["report v2"], { type: "text/plain" }), "SSD-NORTHREACH-r2.txt");
  const res = await fetch(`${B}/api/clients/${A.id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
  const body = await J(res);
  ok(res.status === 201, "revision issued", body);
  const last = body.engagement.deliverables.at(-1);
  ok(last.revision === 2, `it is recorded as revision ${last.revision}`);
}

// approve
r = await api(`/api/clients/portal/${tok}/decision`, { json: { decision: "approved", name: "Dale Okonjo" } });
ok(r.status === 200, "approved", r.body);
ok(r.body.invoice?.amount === 5250, `balance invoice raised AUTOMATICALLY at £5,250 — got ${r.body.invoice?.amount}`);
ok(r.body.engagement.stage === "balance", "stage → balance");

r = await api(`/api/clients/${A.id}/payment-received`, { json: { kind: "balance" } }, T);
ok(r.status === 200 && r.body.engagement.stage === "closed", "balance received → closed", r.body);
const totalInvoiced = (r.body.engagement.documents || []).reduce((s, d) => s + d.amount, 0);
ok(totalInvoiced === 7500, `total invoiced = the agreed fee: £${totalInvoiced}`);

// ---------------------------------------------------------------- MODEL B
console.log("\n-- Model B: integrator, recurring --");
r = await api("/api/clients", { json: {
  client: "Halbrook Energy plc", project: "Bellingham CCGT — services integration",
  contactName: "Ash Vance", contactEmail: "ash@example.test",
  deliverable: "integrator", model: "B", monthlyFee: 12000, mobilisationFee: 25000, platformFee: 2500, vatMode: "standard", construx: true, veryx: true,
} }, T);
ok(r.status === 201, "Model B engagement opens", r.body);
const Bx = r.body.engagement;
ok(Bx.deposit.amount === 39500, `first month in advance = £39,500 — got ${Bx.deposit.amount}`);
ok(Bx.balance.amount === 14500, `monthly thereafter = £14,500 — got ${Bx.balance.amount}`);
ok(Bx.recurring === true, "it is marked recurring");
ok(Bx.checklist.length === 14, `integrator checklist: ${Bx.checklist.length} items`);

r = await api(`/api/clients/${Bx.id}/issue-portal`, { method: "POST" }, T);
const tokB = new URL(r.body.link).searchParams.get("t");
for (const it of Bx.checklist) {
  const fd = new FormData(); fd.append("state", "supplied"); fd.append("note", "Provided.");
  await fetch(`${B}/api/clients/portal/${tokB}/checklist/${it.id}`, { method: "POST", body: fd });
}
r = await api(`/api/clients/portal/${tokB}/start`, { json: { authorised: true, name: "Ash Vance" } });
ok(r.body.invoice?.amount === 39500, `advance invoice raised automatically at £39,500 — got ${r.body.invoice?.amount}`);
await api(`/api/clients/${Bx.id}/payment-received`, { json: { kind: "deposit" } }, T);
{
  const fd = new FormData();
  fd.append("summary", "Month 1 integration report.");
  fd.append("documents", new Blob(["m1"], { type: "text/plain" }), "month-1.txt");
  const res = await fetch(`${B}/api/clients/${Bx.id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
  const body = await J(res);
  ok(body.engagement.deliverables.at(-1).label === "Month 1", `the period is labelled automatically: ${body.engagement.deliverables.at(-1).label}`);
}
r = await api(`/api/clients/portal/${tokB}/decision`, { json: { decision: "approved", name: "Ash Vance" } });
ok(r.body.invoice?.amount === 14500, `approving month 1 raises month 2 at £14,500 — got ${r.body.invoice?.amount}`);
r = await api(`/api/clients/${Bx.id}/payment-received`, { json: { kind: "balance" } }, T);
ok(r.body.engagement.stage === "in_progress", "a recurring engagement rolls back into delivery, not closed");

// -------------------------------------------------------------- security
console.log("\n-- access control --");
r = await api("/api/clients");
ok(r.status === 401, "the internal list needs a session", r.body);
r = await api("/api/clients/portal/not-a-real-token");
ok(r.status === 404, "a bad portal token is refused", r.body);
r = await api(`/api/clients/portal/${tokB}/documents/${studioDoc?.id}`);
ok(r.status === 404, "one client cannot open another client's invoice", r.body);
{
  const res = await fetch(`${B}/api/clients/portal/${tok}/documents/${studioDoc.id}`);
  const html = await res.text();
  ok(res.status === 200 && html.includes("JNN GLOBAL LTD") && html.includes(depositNo), "the owning client can open theirs", { status: res.status });
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
