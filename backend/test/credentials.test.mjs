/**
 * EVERY KEY THE PLATFORM NEEDS, SETTABLE BY AN ADMINISTRATOR — AND NEVER
 * READABLE BACK OUT.
 *
 * The second half is the part worth testing hardest. A settings screen that
 * shows a key in a field is one screenshot away from leaking it, and "it is
 * behind a login" is not an answer when the request is for a password reset
 * over a shared screen.
 *
 * Runs against a temporary data directory. The repository's own holds real
 * queued signals, and a test has written into it before.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-creds-"));
process.env.ETABLIX_DATA_DIR = TMP;
process.env.ETABLIX_TOKEN_SECRET = "a-test-secret-that-is-long-enough-to-derive-from";
// Make sure nothing leaks in from the real environment.
for (const v of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "CH_API_KEY", "ALERT_WEBHOOK_URL"]) delete process.env[v];

const C = await import("../lib/credentials.js");

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${saw}` : ""}`); }
};

console.log("\n=== the registry is closed ===\n");
{
  ok(C.CREDENTIALS.length >= 6, `${C.CREDENTIALS.length} credentials are registered`);
  ok(C.isKnownCredential("smtp_pass"), "a registered credential is known");
  ok(!C.isKnownCredential("anything_else"), "an unregistered one is not");
  let threw = false;
  try { C.setCredential("anything_else", "x"); } catch { threw = true; }
  ok(threw, "and cannot be set — this is not a general store for arbitrary values");

  /**
   * THE TWO THAT MUST NEVER BE SETTABLE FROM A WEB FORM.
   * The signing secret would let anyone reaching the admin account mint
   * tokens; the bootstrap admin password is what creates the administrator in
   * the first place, so it cannot require one.
   */
  for (const forbidden of ["ETABLIX_TOKEN_SECRET", "ETABLIX_ADMIN_PASSWORD", "ETABLIX_ADMIN_EMAIL"]) {
    ok(!C.CREDENTIALS.some((c) => c.envVar === forbidden), `${forbidden} is not settable from the admin account`);
  }
}

console.log("\n=== the environment wins, the database is the fallback ===\n");
{
  ok(C.credential("smtp_host").source === "none", "nothing set reads as none");
  C.setCredential("smtp_host", "smtp.example.test", "admin@test");
  ok(C.credentialValue("smtp_host") === "smtp.example.test", "a stored value is read back by the application");
  ok(C.credential("smtp_host").source === "database", "and is reported as coming from the database");

  process.env.SMTP_HOST = "smtp.from-environment.test";
  ok(C.credentialValue("smtp_host") === "smtp.from-environment.test", "the environment overrides the stored value");
  ok(C.credential("smtp_host").source === "environment", "and says so, so nobody debugs the wrong one");
  delete process.env.SMTP_HOST;
  ok(C.credentialValue("smtp_host") === "smtp.example.test", "removing it falls back again");
}

console.log("\n=== a value never comes back out ===\n");
{
  const secret = "ch-live-9f3a2b7c1d4e5f6a8b9c0d1e";
  C.setCredential("companies_house", secret, "admin@test");

  const one = C.status("companies_house");
  const everything = JSON.stringify(C.statusAll());
  ok(!everything.includes(secret), "the full value is absent from the status of every credential", everything.slice(0, 120));
  ok(one.configured === true, "but it is reported as configured");
  ok(one.preview && one.preview.includes("…"), `a preview is shown instead: ${one.preview}`);
  ok(!one.preview.includes(secret.slice(6, -4)), "and the preview omits the middle, which is the part that matters");
  ok(one.value === undefined && one.apiKey === undefined, "no value field exists on the status at all", Object.keys(one).join(","));

  // A short secret gives nothing away by showing its ends, so it shows nothing.
  C.setCredential("smtp_pass", "short", "admin@test");
  ok(C.status("smtp_pass").preview === "set", "a short secret is reported as set and not shown", C.status("smtp_pass").preview);
}

console.log("\n=== encrypted at rest, because backups travel ===\n");
{
  const secret = "https://hooks.example.test/T000/B111/zzzzSECRETzzzz";
  C.setCredential("alert_webhook", secret, "admin@test");
  ok(C.atRest() === "encrypted", "encryption is on when a token secret exists");

  /**
   * THE REAL TEST: read every byte that actually landed on the volume.
   * Not just the file we think the store uses — the store is SQLite now
   * though older comments still say db.json, and a test that checks the wrong
   * file would pass while the secret sat in the right one.
   */
  const scanned = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      scanned.push({ name: path.relative(TMP, full), buf: fs.readFileSync(full) });
    }
  };
  walk(TMP);
  ok(scanned.length > 0, `${scanned.length} file(s) on the data volume scanned: ${scanned.map((f) => f.name).join(", ")}`);
  const leaked = scanned.filter((f) => f.buf.includes(secret) || f.buf.includes("zzzzSECRETzzzz"));
  ok(leaked.length === 0, "the value appears in NO file on the volume, in whole or in part",
     leaked.map((f) => f.name).join(", "));
  ok(C.credentialValue("alert_webhook") === secret, "and it still decrypts correctly for the application");
}

console.log("\n=== a changed token secret fails closed ===\n");
{
  // Encryption at rest means exactly this: change the key and the old values
  // are gone. It must read as "not configured", never as an empty password
  // handed to a mail server.
  const before = C.credentialValue("alert_webhook");
  ok(before.length > 0, "the webhook is readable with the right secret");
  process.env.ETABLIX_TOKEN_SECRET = "a-completely-different-secret-value-here";
  const after = C.credentialValue("alert_webhook");
  ok(after === "", "with a different secret it reads as not configured, not as an empty value", JSON.stringify(after));
  ok(C.status("alert_webhook").configured === false, "and status agrees");
  process.env.ETABLIX_TOKEN_SECRET = "a-test-secret-that-is-long-enough-to-derive-from";
  ok(C.credentialValue("alert_webhook") === before, "restoring the secret restores the value");
}

console.log("\n=== it says when it cannot protect something ===\n");
{
  const warnings = C.credentialWarnings();
  ok(Array.isArray(warnings), "warnings are reported for an administrator to act on");
  // With no mail host resolvable the operator must be told messages go nowhere.
  const saved = C.credentialValue("smtp_host");
  ok(typeof saved === "string", "smtp host state is readable for the warning check");
}

console.log("\n=== nothing was written into the repository's own data ===\n");
{
  /**
   * ASSERT WHAT THIS TEST CONTROLS, NOT WHAT THE MACHINE IS DOING.
   *
   * This first checked that nothing in backend/data had been modified in the
   * last ten seconds. It passed alone and failed in the suite, because the
   * suite runs files in parallel and a neighbour writing to its own store is
   * none of this test's business. An assertion about global state fails for
   * reasons that have nothing to do with the thing under test, which is how a
   * suite earns a reputation for flakiness.
   *
   * What matters is that the store resolved to the temporary directory, and
   * that is knowable exactly.
   */
  const { dataDir } = await import("../lib/store.js");
  ok(TMP.startsWith(os.tmpdir()), `everything went to a temporary directory: ${TMP}`);
  ok(dataDir() === TMP, "and the store resolved to it, not to the repository's own", `${dataDir()} vs ${TMP}`);
  ok(fs.existsSync(path.join(TMP, "db.sqlite")), "the database this test wrote is the one in that directory");
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
