/**
 * THE THINGS THAT CAN ONLY BE ANSWERED ON THE MACHINE THAT RUNS IT.
 *
 *   docker exec etablix node backend/tools/launch-checks.mjs
 *   docker exec etablix node backend/tools/launch-checks.mjs --quiet   (only failures)
 *
 * WHY THIS EXISTS. Four findings came out of the security audit and the
 * indexing report, and every one of them ended the same way: "run this on the
 * server and tell me what it says." Four commands to copy, four outputs to
 * read, four chances to run three of them and forget the fourth. The one that
 * matters most — whether the demo administrator exists in production — went
 * unanswered through three rounds of asking.
 *
 * A check nobody runs is not a control. So they are one command, they run
 * after every deploy without being asked, and a failure is loud.
 *
 * IT IS READ ONLY. It changes nothing, so it is safe on a schedule, in a cron
 * mail, or twenty times in a row. It prints no password, no key and no token —
 * only whether one is present, which is the whole question.
 *
 * Exit code 0 when everything passes, 1 when anything fails, so a deploy
 * script or a cron job can act on it.
 */
import process from "node:process";

const QUIET = process.argv.includes("--quiet");
const results = [];

const record = (id, title, state, detail, remedy) => {
  results.push({ id, title, state, detail, remedy });
};

/* ------------------------------------------------------------------ 1. auth */
/**
 * Three demo accounts are seeded when ETABLIX_ADMIN_EMAIL and
 * ETABLIX_ADMIN_PASSWORD are absent, and their passwords are committed to the
 * repository in about twenty test files. The design is right — set both and
 * only the real administrator is created.
 *
 * But SEEDING HAPPENS ONCE. If this store was first created before those
 * variables existed, the demo rows are still here no matter what the
 * environment says today. That is why this reads the accounts rather than the
 * environment.
 */
const DEMO_EMAILS = ["admin@etablix.com", "pm@etablix.com", "qa@etablix.com"];
try {
  const { collection } = await import("../lib/store.js");
  const users = collection("users");
  const live = users.filter((u) => DEMO_EMAILS.includes(String(u.email || "").toLowerCase()) && u.active !== false);
  const inactive = users.filter((u) => DEMO_EMAILS.includes(String(u.email || "").toLowerCase()) && u.active === false);

  if (live.length) {
    record("AUTH", "Demo accounts in production", "FAIL",
      `${live.length} seeded demo account(s) are active: ${live.map((u) => `${u.email} (${u.role})`).join(", ")}. ` +
      "Their passwords are in the repository, so anyone who can read it can sign in.",
      "Deactivate or delete them, set ETABLIX_ADMIN_EMAIL and ETABLIX_ADMIN_PASSWORD, then raise sessionsValidFrom on every account so tokens already issued stop working.");
  } else {
    record("AUTH", "Demo accounts in production", "PASS",
      `${users.length} account(s) held, none of them the seeded demo logins` +
      (inactive.length ? ` (${inactive.length} present but deactivated)` : ""));
  }
} catch (err) {
  record("AUTH", "Demo accounts in production", "ERROR", `could not read the account list: ${err.message}`,
    "This check must pass before the platform is treated as secured.");
}

/* ----------------------------------------------------------------- 2. node */
/**
 * Node shipped security releases on 21 October 2026. The worst, CVE-2026-111497,
 * is an out-of-bounds write in the Brotli decoder that can lead to remote code
 * execution, and it is reachable here because the signals watcher runs on
 * fetch() against fifteen external hosts, with Brotli advertised by default.
 */
const MIN_NODE = [22, 23, 4];
{
  const parts = process.versions.node.split(".").map(Number);
  const ok = parts[0] > MIN_NODE[0]
    || (parts[0] === MIN_NODE[0] && (parts[1] > MIN_NODE[1]
      || (parts[1] === MIN_NODE[1] && parts[2] >= MIN_NODE[2])));
  record("NODE", "Runtime carries the October 2026 security fixes",
    ok ? "PASS" : "FAIL",
    `running v${process.versions.node}, need v${MIN_NODE.join(".")} or higher on the 22 line`,
    "The base image tag floats, so this is a rebuild that actually pulls: deploy/deploy.sh now passes --pull. If it still reports an old version, the build used a cached layer.");
}

/* -------------------------------------------------------------- 3. secrets */
/**
 * Credentials set from the admin account are sealed with a key derived from
 * ETABLIX_TOKEN_SECRET. Without it they are stored as written — and therefore
 * sit in every backup of the data volume in plain text.
 */
try {
  const { atRest, statusAll, credentialWarnings } = await import("../lib/credentials.js");
  const stored = statusAll().filter((c) => c.source === "database");
  const sealed = atRest() === "encrypted";
  if (!sealed && stored.length) {
    record("SECRETS", "Credentials encrypted at rest", "FAIL",
      `${stored.length} credential(s) are stored in the database and ETABLIX_TOKEN_SECRET is not set, so they are held in plain text and are in every backup.`,
      "Set ETABLIX_TOKEN_SECRET in the environment, then save each credential again so it is written sealed.");
  } else if (!sealed) {
    record("SECRETS", "Credentials encrypted at rest", "WARN",
      "ETABLIX_TOKEN_SECRET is not set. Nothing is stored in the database yet, so nothing is exposed — but anything saved from the Control Desk would be written in plain text.",
      "Set ETABLIX_TOKEN_SECRET before using the Control Desk to store a key.");
  } else {
    record("SECRETS", "Credentials encrypted at rest", "PASS",
      `sealing is on; ${stored.length} credential(s) held in the database, ${statusAll().filter((c) => c.source === "environment").length} from the environment`);
  }
  for (const w of credentialWarnings()) {
    if (!/plain text/.test(w)) record("MAIL", "Mail server configured", "WARN", w,
      "Set it in the Control Desk under Organisation, or SMTP_HOST in the environment.");
  }
} catch (err) {
  record("SECRETS", "Credentials encrypted at rest", "ERROR", err.message, null);
}

/* ----------------------------------------------------------- 4. withdrawn */
/**
 * A page withdrawn on purpose must answer 410, not 404, or the search engines
 * keep the URL on file and keep reporting it. Asked over HTTP rather than by
 * reading the code, because what matters is what a crawler receives.
 */
try {
  const { retiredSlugs } = await import("../lib/retired-urls.js");
  const slugs = [...retiredSlugs()];
  if (!slugs.length) {
    record("GONE", "Withdrawn articles answer 410", "PASS", "no posts are retired, so there is nothing to answer for");
  } else {
    const port = process.env.PORT || 3000;
    const checked = [];
    for (const slug of slugs) {
      const url = `http://127.0.0.1:${port}/blog/${slug}`;
      try {
        const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000) });
        checked.push({ slug, status: res.status });
      } catch (err) {
        checked.push({ slug, status: `unreachable (${err.message})` });
      }
    }
    const wrong = checked.filter((c) => c.status !== 410);
    record("GONE", "Withdrawn articles answer 410", wrong.length ? "FAIL" : "PASS",
      checked.map((c) => `/blog/${c.slug} → ${c.status}`).join("; "),
      wrong.length ? "A 404 keeps the URL in Search Console. Confirm the running build includes retired-urls.js." : null);
  }
} catch (err) {
  record("GONE", "Withdrawn articles answer 410", "ERROR", err.message, null);
}

/* -------------------------------------------------------------------- out */
const ICON = { PASS: "ok  ", FAIL: "FAIL", WARN: "warn", ERROR: "ERR " };
const failed = results.filter((r) => r.state === "FAIL" || r.state === "ERROR");
const warned = results.filter((r) => r.state === "WARN");

const show = QUIET ? [...failed, ...warned] : results;
if (show.length) {
  console.log(`\n=== launch checks, ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC ===\n`);
  for (const r of show) {
    console.log(`  [${ICON[r.state]}] ${r.id.padEnd(8)} ${r.title}`);
    if (r.detail) console.log(`            ${r.detail}`);
    if (r.remedy && r.state !== "PASS") console.log(`            → ${r.remedy}`);
  }
}

if (failed.length) {
  console.log(`\n  ${failed.length} CHECK(S) FAILED. These are the ones that need a person.\n`);
} else if (!QUIET) {
  console.log(`\n  All ${results.length} checks pass${warned.length ? `, ${warned.length} with a warning` : ""}.\n`);
}
process.exit(failed.length ? 1 : 0);
