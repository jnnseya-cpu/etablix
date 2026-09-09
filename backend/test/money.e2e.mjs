/**
 * The money says the same thing everywhere, and a fee is invoiced once.
 *
 *   PORT=3317 SITE_URL=http://localhost:3317 node backend/server.js &
 *   BASE=http://localhost:3317 node backend/test/money.e2e.mjs
 *
 * Two faults this proves are gone, both of them live and both of them
 * client-facing:
 *
 *   1. The portal and the emails quoted the NET while the invoice totalled
 *      the GROSS. Every standard-rated engagement showed the client a
 *      figure 20% below the one they were asked to pay.
 *
 *   2. The stage machine could be walked round a circle — deposit paid,
 *      deliverable issued, approved, balance raised, the deposit marked
 *      paid again — and a second balance invoice raised on the same fixed
 *      fee. Two clicks and 170% of the fee was invoiced.
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
const B = process.env.BASE || "http://localhost:3317";
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
/** The grand total the client actually reads off the rendered invoice. */
const invoiceTotal = async (token, docId) => {
  const html = await fetch(`${B}/api/clients/portal/${token}/documents/${docId}`).then((r) => r.text());
  const row = /class="grand"[\s\S]*?<b>(£[\d,]+\.\d\d)<\/b>\s*<\/td>\s*<\/tr>/.exec(html);
  return row ? Number(row[1].replace(/[£,]/g, "")) : null;
};
const answerAll = async (token, checklist, note = "Answered.") => {
  for (const it of checklist) {
    const fd = new FormData();
    fd.append("state", "supplied");
    fd.append("note", note);
    await fetch(`${B}/api/clients/portal/${token}/checklist/${it.id}`, { method: "POST", body: fd });
  }
};

console.log("\n=== the money agrees with itself, and a fixed fee is invoiced once ===\n");
const stamp = Date.now();
let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token;
ok(r.status === 200, "admin signs in");

// ---------------------------------------------------------------- 1 · VAT
r = await api("/api/clients", { json: {
  client: `VAT Test Ltd ${stamp}`, project: "Fee arithmetic", deliverable: "feasibility",
  model: "A", fee: 6500, vatMode: "standard",
  contactName: "Ada Client", contactEmail: `ada${stamp}@client.test`,
} }, T);
ok(r.status === 201, "Model A engagement opened at a £6,500 fee", r.body);
const A = r.body.engagement;
ok(A.deposit.net === 1950 && A.deposit.vat === 390 && A.deposit.gross === 2340,
  `deposit splits 1950 / 390 / 2340 — got ${A.deposit.net} / ${A.deposit.vat} / ${A.deposit.gross}`);
ok(A.balance.net === 4550 && A.balance.gross === 5460,
  `balance splits 4550 / 5460 — got ${A.balance.net} / ${A.balance.gross}`);
ok(/£2,340\.00 \(£1,950\.00 plus VAT £390\.00\)/.test(A.deposit.payable),
  `the sentence the client reads names all three: ${A.deposit.payable}`);

// the reverse charge is not available on advisory work
r = await api("/api/clients", { json: {
  client: `Wrong VAT Ltd ${stamp}`, project: "Reverse charge check", deliverable: "feasibility", model: "A", fee: 1000, vatMode: "reverse",
} }, T);
ok(r.status === 400 && /reverse charge does not apply to Model A/.test(r.body.error || ""),
  "the domestic reverse charge is refused on Model A, with the reason", r.body);

// ------------------------------------------------------- 2 · portal = invoice
r = await api(`/api/clients/${A.id}/issue-portal`, { json: {} }, T);
ok(r.status === 200, "portal issued", r.body);
const tok = new URL(r.body.link).searchParams.get("t");
await answerAll(tok, A.checklist);
r = await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "Ada Client" } });
ok(r.status === 200, "the client confirms the start", r.body);
ok(r.body.invoice.amount === 2340 && r.body.invoice.net === 1950,
  `the confirmation names the gross £2,340 and the net £1,950 — got ${r.body.invoice.amount} / ${r.body.invoice.net}`);

let portal = (await api(`/api/clients/portal/${tok}`)).body.engagement;
const depDoc = portal.documents.find((d) => d.kind === "deposit");
const depTotal = await invoiceTotal(tok, depDoc.id);
ok(depDoc.gross === depTotal,
  `THE PORTAL AND THE INVOICE AGREE: portal £${depDoc.gross}, invoice total £${depTotal}`);
ok(depTotal === 2340, `and the figure is the gross, not the net — £${depTotal}`);

// ------------------------------------------------- 3 · one fee, invoiced once
const fd = new FormData();
fd.append("label", "Site Systems Diagnostic");
fd.append("summary", "The report.");
fd.append("documents", new Blob(["report"], { type: "text/plain" }), "report.txt");
{
  const res = await fetch(`${B}/api/clients/${A.id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd });
  ok(res.status === 201, "the deliverable is issued", await J(res));
}

r = await api(`/api/clients/portal/${tok}/decision`, { json: { decision: "approved", name: "Ada Client" } });
ok(r.status === 200 && r.body.invoice, "approval raises the balance automatically", r.body);
ok(r.body.invoice.amount === 5460 && r.body.invoice.net === 4550,
  `the balance is £5,460 gross on £4,550 net — got ${r.body.invoice.amount} / ${r.body.invoice.net}`);
const balTotal = await invoiceTotal(tok, (await api(`/api/clients/portal/${tok}`)).body.engagement.documents.find((d) => d.kind === "balance").id);
ok(balTotal === 5460, `the balance invoice totals £5,460 — got £${balTotal}`);

// the old route to 170%: mark the DEPOSIT paid after the balance was raised
r = await api(`/api/clients/${A.id}/payment-received`, { json: { kind: "deposit" } }, T);
ok(r.status === 200, "the deposit is marked paid, late");
ok(r.body.engagement.stage === "balance",
  `THE STAGE DOES NOT WALK BACKWARDS — still "${r.body.engagement.stage}", not "in_progress"`);

// and the door it used to open is bolted anyway
const fd2 = new FormData();
fd2.append("label", "Second bite");
fd2.append("documents", new Blob(["again"], { type: "text/plain" }), "again.txt");
const second = await fetch(`${B}/api/clients/${A.id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd2 });
ok(second.status === 400, `a second deliverable on a fully invoiced fixed fee is refused (${second.status})`,
  await J(second));

portal = (await api(`/api/clients/portal/${tok}`)).body.engagement;
const invoicedNet = portal.documents.reduce((a, d) => a + d.net, 0);
ok(invoicedNet === 6500, `THE FEE IS INVOICED ONCE: £${invoicedNet} against an agreed £6,500`);
ok(portal.documents.filter((d) => d.kind === "balance").length === 1, "exactly one balance invoice exists");

// ------------------------------------------------- 4 · the client's VAT answer
r = await api("/api/clients", { json: {
  client: `Declared VAT Ltd ${stamp}`, project: "VAT declaration", deliverable: "feasibility",
  model: "A", fee: 4000, vatMode: "standard",
  contactName: "Bo Client", contactEmail: `bo${stamp}@client.test`,
} }, T);
const D = r.body.engagement;
r = await api(`/api/clients/${D.id}/issue-portal`, { json: {} }, T);
const tokD = new URL(r.body.link).searchParams.get("t");
{
  const f = new FormData();
  f.append("state", "supplied");
  f.append("note", "We are a CIS contractor client — the domestic reverse charge applies. VAT 123 4567 89.");
  await fetch(`${B}/api/clients/portal/${tokD}/checklist/c-vat`, { method: "POST", body: f });
}
r = await api(`/api/clients/${D.id}`, {}, T);
const dEng = r.body.engagement || r.body;
ok(dEng.vatDeclared === "reverse", `the client's declared VAT position is READ, not just filed: ${dEng.vatDeclared}`);
ok(dEng.vatNeedsReview === true, "and flagged for finance because it disagrees with what we hold");
ok(dEng.vatMode === "standard", "nothing changed the invoice by itself — a person decides");

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
