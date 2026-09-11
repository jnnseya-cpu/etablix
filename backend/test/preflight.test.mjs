/**
 * The boot checks, and the version every file has to agree on.
 *
 *   node backend/test/preflight.test.mjs
 *
 * WHY THIS EXISTS. Five files in this repository state which Node version
 * runs the application, and three of them were wrong:
 *
 *   package.json                  ">=18"
 *   README.md                     "any Node 18+ host works"
 *   deploy/README.md              install Node 20
 *   deploy/GO-LIVE-RUNBOOK.md     install Node 20
 *   Dockerfile                    node:22-alpine        ← the only correct one
 *   render.yaml                   nothing at all
 *
 * The store uses node:sqlite from the standard library, which does not exist
 * before 22.5. So following either runbook produced a server that dies on its
 * first import, and a Render blueprint deploy took whatever that platform
 * happened to default to. Nothing announced any of it: the container route
 * worked, so the version was only wrong on the routes nobody had tried yet.
 *
 * A comment saying "keep these in step" is not a control. This is.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const { check, MIN_NODE } = await import("../lib/preflight.js");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== the boot checks ===\n");

console.log("--- every file agrees which Node runs this\n");
{
  const [maj, min] = MIN_NODE;
  ok(maj === 22 && min >= 5, `the floor is Node ${MIN_NODE.join(".")}, where node:sqlite arrived`, MIN_NODE.join("."));

  const pkg = JSON.parse(read("package.json"));
  const declared = String(pkg.engines?.node || "");
  ok(/>=\s*22/.test(declared), `package.json declares ${declared || "(nothing)"}, which is 22 or later`, declared);

  const docker = read("Dockerfile");
  ok(/FROM node:22/.test(docker), "the Dockerfile builds on node:22");

  const render = read("render.yaml");
  ok(/key:\s*NODE_VERSION/.test(render), "render.yaml pins NODE_VERSION rather than taking the platform default");
  ok(/NODE_VERSION[\s\S]{0,40}value:\s*"?22/.test(render), "and pins it to 22", render.match(/NODE_VERSION[\s\S]{0,40}/)?.[0]);

  // The runbooks are the route a person follows by hand, which is the route
  // that was wrong for longest.
  for (const f of ["deploy/README.md", "deploy/GO-LIVE-RUNBOOK.md"]) {
    const text = read(f);
    ok(!/setup_20\.x|setup_18\.x|Node 20\b|Node 18\b/.test(text), `${f} no longer tells anybody to install an older Node`,
       text.match(/setup_\d+\.x|Node \d+/g)?.join(", "));
    ok(/setup_22\.x/.test(text), `${f} installs Node 22`);
  }
  const readme = read("README.md");
  ok(!/Node 18\+|Node 18 or/.test(readme), "the README no longer says Node 18 is enough");
  ok(/Node \*\*22/.test(readme) || /Node 22/.test(readme), "and names 22");
}

console.log("\n--- the wrong runtime is refused with a reason\n");
{
  const dev = { NODE_ENV: "development" };
  ok(check({ version: "v22.22.2", env: dev }).ok, "a current Node 22 starts");
  ok(check({ version: "v24.1.0", env: dev }).ok, "and so does a later major");

  const old = check({ version: "v20.11.0", env: dev });
  ok(!old.ok, "Node 20 is refused");
  ok(/node:sqlite/.test(old.failures[0]), "and the reason names node:sqlite rather than reporting a broken install", old.failures[0]);
  ok(/setup_22/.test(old.failures[0]), "with the command that fixes it");

  ok(!check({ version: "v22.4.0", env: dev }).ok, "22.4 is refused — the floor is a minor, not a major");
  ok(check({ version: "v22.5.0", env: dev }).ok, "22.5 is accepted");
  ok(!check({ version: "not-a-version", env: dev }).ok, "and an unreadable version is refused rather than assumed fine");

  const noModule = check({ version: "v22.22.2", env: dev, hasSqlite: false });
  ok(!noModule.ok && /experimental-sqlite/.test(noModule.failures[0]),
     "a runtime where node:sqlite needs a flag is refused, and the flag is named", noModule.failures[0]);
}

console.log("\n--- production cannot start with the demo accounts\n");
{
  // THE ONE THAT MATTERS. Without admin credentials the store seeds three
  // demo employees whose passwords are in this repository. The site comes up
  // looking finished and anybody who has read the source is an administrator.
  const bare = check({ version: "v22.22.2", env: { NODE_ENV: "production" } });
  ok(!bare.ok, "NODE_ENV=production with no admin credentials REFUSES to start");
  const why = bare.failures.join(" ");
  ok(/demo employee accounts whose passwords are written in this repository/.test(why),
     "and says exactly what would otherwise have happened", bare.failures[0]);
  ok(/ETABLIX_TOKEN_SECRET/.test(why), "it also refuses an ephemeral session secret, which signs everybody out on every restart");

  const short = check({ version: "v22.22.2", env: {
    NODE_ENV: "production", ETABLIX_ADMIN_EMAIL: "ops@etablix.com",
    ETABLIX_ADMIN_PASSWORD: "short", ETABLIX_TOKEN_SECRET: "x".repeat(64),
  } });
  ok(!short.ok && /only account on a new production instance/.test(short.failures[0]),
     "a short admin password is refused — it is the only account there is", short.failures[0]);

  const good = check({ version: "v22.22.2", env: {
    NODE_ENV: "production", ETABLIX_ADMIN_EMAIL: "ops@etablix.com",
    ETABLIX_ADMIN_PASSWORD: "a-properly-long-password", ETABLIX_TOKEN_SECRET: "x".repeat(64),
  } });
  ok(good.ok, "a properly configured production instance starts", good.failures);

  // Development must stay convenient, or nobody runs it.
  ok(check({ version: "v22.22.2", env: {} }).ok, "and none of this applies outside production");
}

console.log("\n--- an unwritable data directory is found at boot, not on the first client\n");
{
  // A path INSIDE a regular file: mkdir there fails with ENOTDIR immediately.
  // The first version of this used a path under /proc, which does not fail —
  // it hangs, and a test that hangs is worse than one that fails.
  const blocker = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "etablix-pf-")), "not-a-directory");
  fs.writeFileSync(blocker, "x");
  const bad = check({ version: "v22.22.2", env: {}, dataDir: path.join(blocker, "data") });
  ok(!bad.ok && /not writable/.test(bad.failures[0]), "a directory that cannot be written is refused", bad.failures[0]);
  ok(/first thing a client does/.test(bad.failures[0]), "with the reason it matters", bad.failures[0]);

  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "etablix-pf-"));
  ok(check({ version: "v22.22.2", env: {}, dataDir: tmp }).ok, "and a writable one passes");
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log("\n--- the entry point does nothing but check, then load\n");
{
  const entry = read("backend/server.js");
  ok(entry.includes("preflight"), "server.js runs the preflight");
  ok(/await import\("\.\/app\.js"\)/.test(entry), "and only then loads the application");
  ok(entry.length < 2000, "and is small enough to be read in one screen", `${entry.length} characters`);
  // The reason it is separate at all: ES module imports resolve before any
  // code runs, so a guard inside the application never executes on the
  // runtime it is meant to catch.
  ok(!/express|routes\//.test(entry), "it imports nothing that would resolve node:sqlite before the check runs");
  ok(fs.existsSync(path.join(root, "backend", "app.js")), "and the application is app.js");
}

console.log("\n--- the dependency floor is pinned, not floating\n");
{
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  const at = (n) => lock.packages[`node_modules/${n}`]?.version || null;

  for (const [name, range] of Object.entries(pkg.dependencies)) {
    ok(at(name) !== null, `${name} is in the lockfile`, range);
  }
  ok(lock.lockfileVersion >= 3, "the lockfile is v3 or later, so npm ci is deterministic", lock.lockfileVersion);

  // The two advisories that were resolved, pinned so a later loosening shows up.
  ok(at("qs") && at("qs") >= "6.16.0", `qs is ${at("qs")} — the patched release, forced by an override because express 4 pins ~6.15`, at("qs"));
  ok(pkg.overrides?.qs, "and the override is declared rather than achieved by accident", JSON.stringify(pkg.overrides));
  ok(at("nodemailer") && Number(at("nodemailer").split(".")[0]) >= 10, `nodemailer is ${at("nodemailer")}, past the resolveContent advisory`, at("nodemailer"));
  ok(at("multer") && Number(at("multer").split(".")[0]) >= 2, `multer is ${at("multer")} — the maintained line, not the EOL 1.x`, at("multer"));

  // And the one deliberately NOT fixed, with the reason recorded here so the
  // decision is auditable rather than an oversight.
  ok(at("exceljs") === "4.4.0",
     "exceljs stays at 4.4.0: the uuid advisory under it applies to v3/v5/v6 called with a buffer, exceljs only calls v4() with no buffer, and the offered fix downgrades to 3.4.0 and breaks the workbook writer",
     at("exceljs"));
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
