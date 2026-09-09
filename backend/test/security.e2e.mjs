/**
 * The doors that were open.
 *
 *   BASE=http://localhost:3391 node backend/test/security.e2e.mjs
 *
 * Every check here failed before the change it tests. None of them is
 * visible from the outside when it passes, which is exactly why they
 * were all still open: nothing about the running system looked wrong.
 *
 * It writes to the database it runs against. Point it at a scratch copy.
 */
const B = process.env.BASE || "http://localhost:3391";
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 260) : ""))); };
const J = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t.slice(0, 200) }; } };
const api = async (p, o = {}, tok) => {
  const h = { ...(o.headers || {}) };
  if (tok) h.Authorization = "Bearer " + tok;
  if (o.json) { h["Content-Type"] = "application/json"; o.body = JSON.stringify(o.json); o.method = o.method || "POST"; }
  const r = await fetch(B + p, { ...o, headers: h });
  return { status: r.status, body: await J(r) };
};
const stamp = Date.now();

console.log("\n=== the doors that were open ===\n");

let r = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = r.body.token;
ok(r.status === 200, "admin signs in");

// ------------------------------------------------- 1 · what a stranger can see
r = await api("/api/health");
ok(r.status === 200 && r.body.ok === true, "health answers, so a deploy can check it");
ok(r.body.rows === undefined,
  "IT NO LONGER PUBLISHES THE ROW COUNT OF EVERY COLLECTION — that told any passer-by how many clients the business has");
ok(r.body.demo === undefined,
  "nor whether the seeded demo accounts are live, which was a hint that the published passwords would work");
ok(r.body.busy !== undefined && r.body.build !== undefined, "and still carries what a deploy needs");

r = await api("/api/health/detail");
ok(r.status === 401, "the detail is behind a session");
r = await api("/api/health/detail", {}, T);
ok(r.status === 200 && r.body.rows, "which an administrator has", r.body.error);

const page = await fetch(`${B}/internal/login.html`).then((x) => x.text());
ok(!/etablix-admin-2026|etablix-pm-2026/.test(page),
  "THE LOGIN PAGE NO LONGER PRINTS WORKING CREDENTIALS");

// -------------------------------------------------------- 2 · sessions
// A session is checked against the account on every request, so a change
// to the account takes effect at once instead of in twelve hours.
r = await api("/api/users", { json: {
  name: "Temporary Person", email: `temp${stamp}@etablix.com`, role: "site_engineer", password: "a-long-enough-password",
} }, T);
ok(r.status === 201, "an account is created", r.body);
const tempId = r.body.user.id;

r = await api("/api/auth/login", { json: { email: `temp${stamp}@etablix.com`, password: "a-long-enough-password" } });
const tempToken = r.body.token;
ok(r.status === 200, "and signs in");
r = await api("/api/auth/me", {}, tempToken);
ok(r.status === 200, "their session works");

r = await api(`/api/users/${tempId}`, { json: { active: false }, method: "PATCH" }, T);
ok(r.status === 200, "the account is deactivated", r.body);
r = await api("/api/auth/me", {}, tempToken);
ok(r.status === 401, "THEIR SESSION STOPS AT ONCE — it used to keep working for the rest of its twelve hours", r.body);

// a password reset ends the sessions opened with the old password
r = await api(`/api/users/${tempId}`, { json: { active: true }, method: "PATCH" }, T);
r = await api("/api/auth/login", { json: { email: `temp${stamp}@etablix.com`, password: "a-long-enough-password" } });
const second = r.body.token;
ok(r.status === 200, "the account is reactivated and signs in again");
r = await api(`/api/users/${tempId}`, { json: { password: "a-different-long-password" }, method: "PATCH" }, T);
ok(r.status === 200, "the password is reset");
r = await api("/api/auth/me", {}, second);
ok(r.status === 401, "and the session opened with the old password stops — the point of resetting it", r.body);

// a person can end their own sessions
r = await api("/api/auth/login", { json: { email: `temp${stamp}@etablix.com`, password: "a-different-long-password" } });
const third = r.body.token;
r = await api("/api/auth/logout-all", { json: {} }, third);
ok(r.status === 200, "a person can end every session on their own account");
r = await api("/api/auth/me", {}, third);
ok(r.status === 401, "including the one they did it from");

// ------------------------------------------------- 3 · brute force
// The account limit is what a botnet meets: many addresses, one account.
let limited = 0;
for (let i = 0; i < 14; i++) {
  const x = await api("/api/auth/login", { json: { email: `temp${stamp}@etablix.com`, password: "wrong-password-here" } });
  if (x.status === 429) limited++;
}
ok(limited > 0, `a run of wrong passwords against one account is stopped — ${limited} of 14 refused`);

// ------------------------------------------------- 4 · uploads before the check
const fd = new FormData();
fd.append("state", "supplied");
fd.append("note", "Trying it on.");
fd.append("documents", new Blob(["x".repeat(50000)], { type: "text/plain" }), "not-mine.txt");
const bad = await fetch(`${B}/api/clients/portal/${"0".repeat(48)}/checklist/f-programme`, { method: "POST", body: fd });
ok(bad.status === 404, "an upload to a portal link that does not exist is refused", await J(bad));

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
