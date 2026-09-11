/**
 * PREFLIGHT — the four ways this application can start wrong and then look
 * fine, each turned into a sentence at boot instead of a symptom later.
 *
 * Every one of these was reachable before this file existed, and none of
 * them announces itself:
 *
 *   1. THE WRONG NODE. The store uses `node:sqlite` from the standard
 *      library, which does not exist before 22.5. On Node 20 the process
 *      dies on its first import with ERR_UNKNOWN_BUILTIN_MODULE, which
 *      reads like a broken install rather than a wrong runtime — and two
 *      deployment runbooks in this repository told you to install Node 20.
 *   2. DEMO ACCOUNTS IN PRODUCTION. Without ETABLIX_ADMIN_EMAIL and
 *      ETABLIX_ADMIN_PASSWORD the store seeds three demo employees whose
 *      passwords are written in this repository. That is correct for local
 *      development and catastrophic on a public URL: the site comes up,
 *      looks finished, and anybody who has read the source is an
 *      administrator. Nothing on the page says so.
 *   3. AN EPHEMERAL SESSION SECRET. Without ETABLIX_TOKEN_SECRET a random
 *      one is generated per process, so every restart silently signs
 *      everybody out. Harmless locally; in production it is a support call
 *      every deploy, and the cause is invisible.
 *   4. A WRITABLE DATA DIRECTORY THAT IS NOT. A read-only or unmounted
 *      volume lets the process start and fails on the first write, which is
 *      the first thing a client does rather than the first thing you do.
 *
 * IT REFUSES TO START rather than warning. A warning at boot is a line in a
 * log nobody reads until the incident, and all four of these are cheaper to
 * fix in the minute before launch than in the hour after it.
 */

import fs from "node:fs";
import path from "node:path";

/** The floor. node:sqlite's DatabaseSync landed in 22.5.0. */
export const MIN_NODE = [22, 5, 0];

function parseVersion(v) {
  const m = String(v).replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** a >= b, on [major, minor, patch]. */
function atLeast(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

/**
 * Every check, as data. Returns { ok, failures, warnings } and never exits,
 * so it can be tested without a subprocess.
 */
export function check({
  version = process.version,
  env = process.env,
  dataDir = null,
  hasSqlite = null,
} = {}) {
  const failures = [];
  const warnings = [];
  const production = String(env.NODE_ENV || "") === "production";

  const parsed = parseVersion(version);
  if (!parsed) {
    failures.push(`Node reports its version as "${version}", which this check cannot read. Expected v${MIN_NODE.join(".")} or later.`);
  } else if (!atLeast(parsed, MIN_NODE)) {
    failures.push(
      `Node ${parsed.join(".")} is too old. This application needs ${MIN_NODE.join(".")} or later, because the store uses node:sqlite from the standard library and it does not exist before then. ` +
      `Install Node 22: curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs`
    );
  }

  if (hasSqlite === false) {
    failures.push(
      "node:sqlite is not available in this runtime, so there is no database. " +
      "On Node 22.5 to 22.11 it needs --experimental-sqlite; from 22.12 it is on by default. Use a current Node 22."
    );
  }

  // THE ONE THAT MATTERS MOST. Demo accounts are seeded whenever the admin
  // credentials are absent, and their passwords are in this repository.
  const hasAdmin = Boolean(env.ETABLIX_ADMIN_EMAIL && env.ETABLIX_ADMIN_PASSWORD);
  if (production && !hasAdmin) {
    failures.push(
      "NODE_ENV is production and ETABLIX_ADMIN_EMAIL / ETABLIX_ADMIN_PASSWORD are not set. " +
      "Without them the store seeds three demo employee accounts whose passwords are written in this repository, and the site would come up looking finished with anybody who has read the source able to sign in as an administrator. " +
      "Set both, or do not set NODE_ENV=production. On Render: the service's Environment tab, then Manual Deploy → Deploy latest commit."
    );
  }
  if (production && env.ETABLIX_ADMIN_PASSWORD && String(env.ETABLIX_ADMIN_PASSWORD).length < 12) {
    failures.push(`ETABLIX_ADMIN_PASSWORD is ${String(env.ETABLIX_ADMIN_PASSWORD).length} characters. This is the only account on a new production instance; use at least 12.`);
  }
  if (production && !env.ETABLIX_TOKEN_SECRET) {
    failures.push(
      "NODE_ENV is production and ETABLIX_TOKEN_SECRET is not set, so a random signing secret is generated per process and every restart signs every employee out. " +
      "Generate one once: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  if (dataDir) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      const probe = path.join(dataDir, ".preflight");
      fs.writeFileSync(probe, String(Date.now()));
      fs.rmSync(probe);
    } catch (err) {
      failures.push(`The data directory ${dataDir} is not writable (${err.code || err.message}). The database and every uploaded document live there, so the process would start and fail on the first write — which is the first thing a client does rather than the first thing you do.`);
    }
  }

  if (!production && hasAdmin) {
    warnings.push("Admin credentials are set outside production, so the demo accounts are NOT seeded. Sign in with the credentials you set.");
  }

  return { ok: failures.length === 0, failures, warnings, production };
}

/** Run it for real, and stop the process rather than start wrong. */
export function preflight({ dataDir = null } = {}) {
  // Resolve the module rather than import it. Importing would construct the
  // binding and, on a runtime where it needs a flag, throw the very error
  // this check exists to explain.
  let hasSqlite = true;
  try {
    if (typeof import.meta.resolve === "function") import.meta.resolve("node:sqlite");
  } catch {
    hasSqlite = false;
  }
  const result = check({ dataDir, hasSqlite });
  for (const w of result.warnings) console.warn(`[preflight] ${w}`);
  if (!result.ok) {
    console.error("\n[preflight] REFUSING TO START. This is not a warning:\n");
    for (const f of result.failures) console.error(`  · ${f}\n`);
    process.exit(1);
  }
  return result;
}
