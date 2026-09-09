/**
 * A website enquiry opens its engagement by itself — and commits to nothing.
 *
 *   PORT=3311 SITE_URL=http://localhost:3311 node backend/server.js &
 *   node backend/test/enquiry-to-engagement.e2e.mjs
 *
 * The promise on the contact page is that a brief lets us "prepare the right
 * commercial conversation". That is only true if the brief reaches the desk
 * without being retyped. It is only SAFE if the record it creates cannot
 * quote, invoice or email anybody on its own.
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
const B = process.env.BASE || "http://localhost:3311";
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 260) : ""))); };
const api = async (p, o = {}, tok) => {
  const h = { ...(o.headers || {}) };
  if (tok) h.Authorization = "Bearer " + tok;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h });
  const t = await r.text();
  let body; try { body = JSON.parse(t); } catch { body = { _raw: t.slice(0, 200) }; }
  return { status: r.status, body };
};
// The public form is behind the same human check a browser passes: a signed
// challenge, a three-second fill-time floor, and a proof of work. The test
// takes the real route rather than a back door, because a back door in a test
// is a back door somebody eventually finds in production.
import crypto from "node:crypto";
const enquire = async (fields) => {
  const ch = await fetch(B + "/api/human-check").then((x) => x.json());
  let pow = 0;
  while (!crypto.createHash("sha256").update(`${ch.token}:${pow}`).digest("hex").startsWith(ch.powPrefix)) pow++;
  await new Promise((r) => setTimeout(r, ch.minWaitMs + 250));
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append("hct", ch.token);
  fd.append("pow", String(pow));
  const r = await fetch(B + "/api/leads", { method: "POST", body: fd });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

console.log("\n=== a website enquiry becomes an engagement, and nothing else ===\n");
let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token; ok(r.status === 200, "admin signs in");

// --- 1. a real service enquiry
const stamp = Date.now();
r = await enquire({
  name: "A Buyer", email: `buyer${stamp}@clientcompany.test`, company: `Client Company ${stamp}`,
  phone: "01234 567890", service: "Site Systems Diagnostic", sector: "Grid / power",
  location: "Peterhead", startDate: "2027-03-01",
  brief: "We are taking a turnkey contract where the civils and site infrastructure sit inside our scope and we have no way to price it.",
});
ok(r.status === 201, "the enquiry is accepted", r.body);

const list = await api("/api/clients", {}, T);
const eng = list.body.engagements.find((e) => e.client === `Client Company ${stamp}`);
ok(!!eng, "AN ENGAGEMENT WAS OPENED AUTOMATICALLY — nobody retyped anything", list.body.engagements?.slice(0, 2));
ok(eng.stage === "enquiry", "it sits at the enquiry stage", eng.stage);
ok(/^ENG-\d{4}-\d{3}$/.test(eng.reference), "it carries a real engagement reference", eng.reference);
ok(eng.contactName === "A Buyer" && eng.contactEmail === `buyer${stamp}@clientcompany.test`,
   "the contact came across", { n: eng.contactName, e: eng.contactEmail });
ok(eng.deliverable === "feasibility", "the service was mapped to a catalogue deliverable", eng.deliverable);
ok(/Peterhead/.test(eng.project), "the project names the location", eng.project);
ok(/turnkey contract/.test(eng.internalNotes || ""), "the brief is on the record, in full", (eng.internalNotes || "").slice(0, 80));
ok(/INDICATIVE ONLY/.test(eng.internalNotes || ""), "the catalogue range is marked indicative, not quoted as a price");

// --- 2. it commits to nothing
ok(eng.fee === 0 && eng.monthlyFee === 0, "NO FEE HAS BEEN SET — the platform does not price the work", { fee: eng.fee });
ok(!eng.portalToken, "no portal has been minted");
ok(!(eng.documents || []).some((d) => d.kind === "deposit"), "no invoice has been raised");
r = await api(`/api/clients/${eng.id}/issue-portal`, { json: {} }, T);
ok(r.status === 400, "THE PORTAL IS REFUSED until a person has agreed the terms", r.body);
ok(/no agreed terms/i.test(r.body.error || ""), "and the refusal says why", r.body.error);

// --- 3. a person sets the terms, and it behaves like any other engagement
r = await api(`/api/clients/${eng.id}/terms`, { json: { deliverable: "feasibility", model: "A", fee: 0 } }, T);
ok(r.status === 400, "terms with no fee are refused", r.body);
r = await api(`/api/clients/${eng.id}/terms`, { json: { deliverable: "feasibility", model: "A", fee: 6500, vatMode: "standard" } }, T);
ok(r.status === 200, "terms with a fee are accepted", r.body);
ok(r.body.engagement.stage === "agreed", "the engagement moves to agreed", r.body.engagement.stage);
ok(r.body.engagement.checklistState.total > 0, "the checklist is built for the chosen deliverable", r.body.engagement.checklistState);
r = await api(`/api/clients/${eng.id}/issue-portal`, { json: {} }, T);
ok(r.status < 400, "and NOW the portal can be issued", r.body);

// --- 4. a demonstration request is not an engagement
r = await enquire({
  name: "Another Buyer", email: `demo${stamp}@clientcompany.test`, company: `Demo Only ${stamp}`,
  service: "CONSTRUX demonstration", brief: "We would like to see the platform before we talk about anything else.",
});
ok(r.status === 201, "the demonstration enquiry is accepted");
const after = await api("/api/clients", {}, T);
ok(!after.body.engagements.some((e) => e.client === `Demo Only ${stamp}`),
   "a demonstration request opens NO engagement — it is a sales conversation, not a commercial record");
const leads = await api("/api/leads", {}, T);
ok(leads.body.leads.some((l) => l.company === `Demo Only ${stamp}`), "but it is still recorded as an enquiry");
const linked = leads.body.leads.find((l) => l.company === `Client Company ${stamp}`);
ok(linked && linked.engagementRef === eng.reference, "and a mapped enquiry is linked to the engagement it opened", linked?.engagementRef);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
