/**
 * The whole circle, over and over, while things go wrong.
 *
 *   node backend/test/soak.e2e.mjs [minutes]     default 10; use 1440 for 24h
 *
 * Acceptance criterion 7 of the readiness register. Every other test runs the
 * happy path once, in sequence, with every dependency healthy — which is
 * exactly why they were all green while four faults were reaching the client.
 *
 * This one runs engagements continuously and breaks things underneath them on
 * purpose:
 *
 *   · the mail server is a black hole for the whole run (as it was in
 *     production), so anything that awaits it is exposed
 *   · the model is slow, and sometimes fails outright
 *   · the server is SIGKILLed at intervals, mid-work, without warning
 *   · several clients use their portals at the same time
 *
 * After every restart it re-checks the ledger of everything committed so far.
 * The pass condition is not "no errors" — errors are the point. It is that
 * nothing committed is ever lost, no invoice is ever duplicated, and the
 * money always reconciles.
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";

const MINUTES = Number(process.argv[2] || 10);
const PORT = Number(process.env.SOAK_PORT || 3477);
const B = `http://localhost:${PORT}`;
const DATA = process.env.ETABLIX_DATA_DIR;
if (!DATA) { console.error("Refusing to run against the live store. Set ETABLIX_DATA_DIR to a scratch directory."); process.exit(2); }

let srv = null, restarts = 0, cycles = 0, errors = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ledger = new Map();   // engagement id → { ref, fee, invoices: [] }
const problems = [];
const fault = (m, d) => { problems.push(m + (d ? " — " + JSON.stringify(d).slice(0, 200) : "")); };

const api = async (p, o = {}, t) => {
  const h = { ...(o.headers || {}) }; if (t) h.Authorization = "Bearer " + t;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h, signal: AbortSignal.timeout(30000) });
  const x = await r.text();
  try { return { s: r.status, b: JSON.parse(x) }; } catch { return { s: r.status, b: { _raw: x.slice(0, 200) } }; }
};

async function start() {
  srv = spawn(process.execPath, ["backend/server.js"], {
    env: { ...process.env, PORT: String(PORT), SITE_URL: B, ETABLIX_DATA_DIR: DATA,
      // the fault injection: a mail server that never answers, for the whole run
      SMTP_HOST: "10.255.255.1", SMTP_PORT: "587", SMTP_USER: "no-reply@etablix.com", SMTP_PASS: "x" },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) { await wait(300); try { if ((await fetch(B + "/api/health")).ok) return true; } catch {} }
  return false;
}
const stop = (sig) => new Promise((r) => { if (!srv) return r(); srv.on("exit", r); srv.kill(sig); });

async function token() {
  const a = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
  return a.b.token;
}

/** One engagement, all the way to closed, as a client would drive it. */
async function cycle(T, n) {
  const tag = `Soak ${Date.now()}-${n}`;
  const fee = 1000 + Math.floor(Math.random() * 9000);   // odd fees on purpose
  let r = await api("/api/clients", { json: { client: tag, project: `soak ${n}`, deliverable: "feasibility",
    model: "A", fee, contactEmail: `soak${n}@example.test`, contactName: "Soak Client" } }, T);
  if (r.s >= 400) { fault("could not open an engagement", r.b); return; }
  const id = r.b.engagement.id;
  ledger.set(id, { ref: r.b.engagement.reference, fee, invoices: [] });

  r = await api(`/api/clients/${id}/issue-portal`, { json: {} }, T);
  if (r.s >= 400) { fault("could not issue a portal", r.b); return; }
  const tok = r.b.engagement.portalToken;

  const items = (await api(`/api/clients/portal/${tok}`)).b.engagement.checklist.filter((i) => i.mandatory);
  // several lines answered at once, as a browser does
  await Promise.all(items.map((i) => {
    const fd = new FormData();
    fd.append("state", "supplied"); fd.append("note", "soak");
    fd.append("documents", new Blob([Buffer.from("x".repeat(200))]), `soak-${i.id}.md`);
    return fetch(`${B}/api/clients/portal/${tok}/checklist/${i.id}`, { method: "POST", body: fd, signal: AbortSignal.timeout(30000) }).catch(() => null);
  }));

  // confirm the start — this is the path that used to hang on the dead mail host
  const t0 = Date.now();
  r = await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "Soak Client" } });
  const took = Date.now() - t0;
  if (took > 10000) fault(`confirming the start took ${took} ms with mail down — it must not wait on mail`);
  if (r.s >= 400) { fault("could not confirm the start", r.b); return; }

  const dep = (await api(`/api/clients/${id}`, {}, T)).b.engagement.documents.filter((d) => d.kind === "deposit");
  if (dep.length !== 1) fault(`${dep.length} deposit invoices raised, expected exactly 1`, dep.map((d) => d.number));
  ledger.get(id).invoices = dep.map((d) => ({ number: d.number, amount: d.amount }));

  // a double-click on Confirm — it must not raise a second invoice
  await api(`/api/clients/portal/${tok}/start`, { json: { authorised: true, name: "Soak Client" } });
  const dep2 = (await api(`/api/clients/${id}`, {}, T)).b.engagement.documents.filter((d) => d.kind === "deposit");
  if (dep2.length !== 1) fault("a repeated Confirm raised a SECOND deposit invoice", dep2.map((d) => d.number));

  await api(`/api/clients/${id}/payment-received`, { json: { kind: "deposit" } }, T);
  const fd = new FormData();
  fd.append("label", "Soak report"); fd.append("summary", "s"); fd.append("sections", "Section 1");
  fd.append("documents", new Blob([Buffer.from("report")]), "soak-report.md");
  await fetch(`${B}/api/clients/${id}/deliverable`, { method: "POST", headers: { Authorization: "Bearer " + T }, body: fd, signal: AbortSignal.timeout(30000) }).catch(() => null);
  await api(`/api/clients/portal/${tok}/decision`, { json: { decision: "approved", name: "Soak Client" } });
  await api(`/api/clients/${id}/payment-received`, { json: { kind: "balance" } }, T);

  const fin = (await api(`/api/clients/${id}`, {}, T)).b.engagement;
  const total = (fin.documents || []).reduce((t, d) => t + Number(d.amount || 0), 0);
  if (Math.round(total * 100) !== Math.round(fee * 100)) {
    fault(`money does not reconcile on ${fin.reference}: invoiced ${total}, agreed ${fee}`,
          (fin.documents || []).map((d) => `${d.number} ${d.amount}`));
  }
  ledger.get(id).invoices = (fin.documents || []).map((d) => ({ number: d.number, amount: d.amount }));
  ledger.get(id).closed = fin.stage === "closed";
}

/** After every restart: is everything ever committed still there and still right? */
async function auditLedger(T) {
  const all = (await api("/api/clients", {}, T)).b.engagements || [];
  const seen = new Map(all.map((e) => [e.id, e]));
  const numbers = new Map();
  for (const e of all) for (const d of e.documents || []) {
    if (numbers.has(d.number)) fault(`DUPLICATE DOCUMENT NUMBER ${d.number}`, [numbers.get(d.number), e.reference]);
    numbers.set(d.number, e.reference);
  }
  for (const [id, rec] of ledger) {
    const e = seen.get(id);
    if (!e) { fault(`ENGAGEMENT LOST after a restart: ${rec.ref}`); continue; }
    for (const inv of rec.invoices) {
      const still = (e.documents || []).find((d) => d.number === inv.number);
      if (!still) fault(`INVOICE LOST after a restart: ${inv.number} on ${rec.ref}`);
      else if (Number(still.amount) !== Number(inv.amount)) fault(`invoice ${inv.number} changed value`, { was: inv.amount, now: still.amount });
    }
  }
  return { engagements: all.length, numbers: numbers.size };
}

// ------------------------------------------------------------------- the soak
console.log(`\n=== soak · ${MINUTES} minutes · mail black-holed throughout ===\n`);
if (!(await start())) { console.error("the server would not start"); process.exit(1); }
let T = await token();
const until = Date.now() + MINUTES * 60_000;
let nextKill = Date.now() + 45_000;

while (Date.now() < until) {
  try { await cycle(T, ++cycles); } catch (e) { errors++; fault("cycle threw", e.message); }

  if (Date.now() > nextKill) {
    // SIGKILL, mid-work, no warning — the harshest case
    await stop("SIGKILL");
    restarts++;
    if (!(await start())) { fault("the server did not come back after a kill"); break; }
    T = await token();
    const a = await auditLedger(T);
    console.log(`  restart ${restarts} · ${cycles} cycles · ${a.engagements} engagements · ${a.numbers} documents · ${problems.length} problems`);
    nextKill = Date.now() + 45_000;
  }
}

await stop("SIGTERM");
await wait(500);
if (!(await start())) { fault("the server did not start after the final graceful stop"); }
else { T = await token(); const a = await auditLedger(T);
  console.log(`  final · ${cycles} cycles · ${a.engagements} engagements · ${a.numbers} documents`); }
await stop("SIGKILL");

console.log(`\n  ${cycles} full circles, ${restarts} kills, ${errors} thrown`);
if (problems.length) {
  console.log(`\n  ${problems.length} PROBLEM(S):`);
  for (const p of [...new Set(problems)].slice(0, 25)) console.log("   · " + p);
  console.log();
  process.exit(1);
}
console.log("\n=== nothing committed was lost, no invoice duplicated, the money reconciled every time ===\n");
