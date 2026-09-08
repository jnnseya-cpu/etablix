/**
 * A document sent twice is one document.
 *
 *   PORT=3311 node backend/server.js &
 *   node backend/test/upload-dedupe.test.mjs
 *
 * Written after a live report: the client could not see the files they had
 * sent, so they sent them again — and the second copy was appended rather
 * than replacing the first. The same document then appeared twice in the
 * pack the diagnostic reads, twice in the evidence behind a finding, and
 * twice on the record the client is shown.
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
const B = process.env.BASE || "http://localhost:3311";
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 240) : ""))); };
const api = async (p, o = {}, t) => {
  const h = { ...(o.headers || {}) }; if (t) h.Authorization = "Bearer " + t;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h }); const x = await r.text();
  try { return { s: r.status, b: JSON.parse(x) }; } catch { return { s: r.status, b: { _raw: x.slice(0, 160) } }; }
};
const send = async (tok, itemId, name, body, note = "Sending this again.") => {
  const fd = new FormData();
  fd.append("state", "supplied"); fd.append("note", note);
  fd.append("documents", new Blob([Buffer.from(body)]), name);
  const r = await fetch(`${B}/api/clients/portal/${tok}/checklist/${itemId}`, { method: "POST", body: fd });
  return { s: r.status, b: await r.json().catch(() => ({})) };
};

const a = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = a.b.token; ok(a.s === 200, "admin signs in");
let r = await api("/api/clients", { json: { client: "Dedupe Ltd", project: "Dedupe", deliverable: "feasibility", model: "A", fee: 6500, contactEmail: "d@example.test" } }, T);
const id = r.b.engagement.id;
r = await api(`/api/clients/${id}/issue-portal`, { json: {} }, T);
const tok = r.b.engagement.portalToken;
const item = (await api(`/api/clients/portal/${tok}`)).b.engagement.checklist.find((i) => i.mandatory);

const files = async () => (await api(`/api/clients/portal/${tok}`)).b.engagement.checklist.find((i) => i.id === item.id).files;

await send(tok, item.id, "programme.pdf", "the programme, version one");
ok((await files()).length === 1, "one document sent, one held", await files());

await send(tok, item.id, "programme.pdf", "the programme, version one");
const twice = await files();
ok(twice.length === 1, "THE SAME DOCUMENT SENT AGAIN IS STILL ONE DOCUMENT — no double count", twice.map((f) => f.name));

await send(tok, item.id, "programme.pdf", "the programme, version TWO — longer, so a different size");
const revised = await files();
ok(revised.length === 1, "a revised document of the same name replaces it rather than sitting beside it", revised.map((f) => `${f.name} ${f.size}b`));
ok(revised[0].size !== twice[0].size, "and it is the NEW one that is held", { was: twice[0].size, now: revised[0].size });

await send(tok, item.id, "workforce.csv", "a genuinely different document");
const both = await files();
ok(both.length === 2, "a different document is added, not swallowed", both.map((f) => f.name));

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
