/**
 * A client asks what we hold, and asks for it back.
 *
 *   BASE=http://localhost:3391 node backend/test/retention.e2e.mjs
 *
 * Until this existed the honest answer to "delete our drawings" was that
 * files were kept for ever and there was no way to remove one. That is not a
 * missing feature — it is a commitment the business could not meet, and it
 * had to be settled before the first engagement that carries somebody's
 * drawings.
 */
const B = process.env.BASE || "http://localhost:3391";
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

console.log("\n=== what we hold, and giving it back ===\n");
const stamp = Date.now();
let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token;
ok(r.status === 200, "admin signs in");

r = await api("/api/clients", { json: {
  client: `Erasure Ltd ${stamp}`, project: "Retention", deliverable: "feasibility",
  model: "A", fee: 5000, vatMode: "standard",
  contactName: "Cee Client", contactEmail: `cee${stamp}@client.test`,
} }, T);
const E = r.body.engagement;
ok(r.status === 201, "an engagement is opened", r.body);

r = await api(`/api/clients/${E.id}/issue-portal`, { json: {} }, T);
const tok = new URL(r.body.link).searchParams.get("t");

// the client supplies two documents against two requirements
for (const [item, name] of [["f-programme", "programme.txt"], ["f-layout", "layout.txt"]]) {
  const fd = new FormData();
  fd.append("state", "supplied");
  fd.append("note", "Attached.");
  fd.append("documents", new Blob(["confidential drawing content"], { type: "text/plain" }), name);
  const res = await fetch(`${B}/api/clients/portal/${tok}/checklist/${item}`, { method: "POST", body: fd });
  ok(res.status === 200, `the client supplies ${name}`, await J(res));
}

// --- 1. what do you hold?
r = await api(`/api/clients/${E.id}/holdings`, {}, T);
ok(r.status === 200, "the desk can answer 'what do you hold of ours'", r.body);
ok(r.body.holdings.pack.files.length === 2, `both documents are listed — ${r.body.holdings.pack.files.length}`);
ok(r.body.policy.pack.months === 12 && r.body.policy.record.months === 72,
  "and the two retention periods are stated: twelve months for the pack, six years for the record");
ok(/Limitation Act 1980/.test(r.body.policy.record.basis),
  "with the reason the record is kept, not just the number");

// the stored name, so we can prove the file itself goes
const stored = (await api(`/api/clients/portal/${tok}`)).body.engagement.checklist
  .flatMap((i) => i.files || []).map((f) => f.stored);
ok(stored.length === 2, "two files are on disk");
let head = await fetch(`${B}/api/clients/portal/${tok}/files/${stored[0]}`);
ok(head.status === 200, "and the client can download one of them");

// --- 2. erasure needs a reason and a confirmation
r = await api(`/api/clients/${E.id}/erase-pack`, { json: { confirm: true } }, T);
ok(r.status === 400 && /why it is being erased/.test(r.body.error || ""),
  "erasing without a stated reason is refused", r.body);
r = await api(`/api/clients/${E.id}/erase-pack`, { json: { reason: "Client request under Article 17." } }, T);
ok(r.status === 400 && /Confirm the deletion/.test(r.body.error || ""),
  "and without confirming it is refused too", r.body);

// --- 3. the erasure itself
r = await api(`/api/clients/${E.id}/erase-pack`, { json: { reason: "Client request under Article 17.", confirm: true } }, T);
ok(r.status === 200 && r.body.erased === 2, `both files are deleted — ${r.body.erased}`, r.body);

head = await fetch(`${B}/api/clients/portal/${tok}/files/${stored[0]}`);
ok(head.status === 404, `THE FILE IS ACTUALLY GONE FROM THE DISK, not just from the record (${head.status})`);

r = await api(`/api/clients/${E.id}/holdings`, {}, T);
ok(r.body.holdings.pack.files.length === 0, "the holdings answer now says nothing is held");
ok(!!r.body.holdings.pack.erasedAt, "and records when it was erased");

r = await api(`/api/clients/${E.id}`, {}, T);
const events = r.body.engagement.events || [];
ok(events.some((e) => /erased/i.test(e.what)), "the audit trail records the erasure");
ok(r.body.engagement.checklist.some((i) => i.erased), "and the checklist line says its files were erased rather than silently emptying");

r = await api(`/api/clients/${E.id}/erase-pack`, { json: { reason: "again", confirm: true } }, T);
ok(r.status === 400, "erasing twice is refused");

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
