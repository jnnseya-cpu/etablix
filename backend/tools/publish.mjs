/**
 * Publish: rebuild, check, and tell the engines that will listen.
 *
 *   node backend/tools/publish.mjs                 # everything changed today
 *   node backend/tools/publish.mjs --since 2026-09-01
 *   node backend/tools/publish.mjs --all           # the whole sitemap
 *   node backend/tools/publish.mjs --dry-run       # show, send nothing
 *   node backend/tools/publish.mjs --no-build      # submit only, leave files alone
 *
 * One command for the whole automatable half of getting found. It rebuilds
 * the blog, runs the audit, and refuses to submit anything if the audit is
 * failing — because asking four search engines to come and look at a broken
 * page is worse than not asking.
 *
 * WHAT IT CANNOT DO, and no script can:
 *
 *   Google.  Google retired its sitemap ping in 2023 and it now answers 404.
 *            The only route in is Search Console, which needs a person and
 *            their login. Once the site is verified there, Google reads the
 *            sitemap from robots.txt on its own and this becomes unnecessary.
 *
 *   Anything requiring a human.  A business listing has to be claimed by
 *            somebody who can prove they are the business. A link has to be
 *            given by somebody who decides to give it.
 *
 * So this does the part that is genuinely ours, and says plainly what is left.
 */
import { execSync } from "node:child_process";
import { auditSite } from "../lib/seo.js";
import { readKey, submit, changedSince, urlsFromSitemap, SITE } from "../lib/indexnow.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUB = path.join(root, "frontend", "public");

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
};
const today = () => new Date().toISOString().slice(0, 10);

const dryRun = Boolean(arg("dry-run"));
const all = Boolean(arg("all"));
const since = arg("since", today());

console.log("\n=== publish ===\n");

// --- 1. rebuild, so what is submitted is what is on disk
//
// Skipped on a deploy: the deployed artifact is whatever is committed, and a
// deploy script that rewrites files in the checkout it just pulled is a deploy
// script that will one day deploy something nobody wrote. The AUDIT still
// runs — it only reads.
if (!arg("no-build")) {
  console.log("--- rebuild\n");
  execSync("node backend/tools/build-blog.mjs", { cwd: root, stdio: "inherit" });
} else {
  console.log("--- rebuild skipped (--no-build)\n");
}

// --- 2. check, so nothing broken is advertised
console.log("\n--- audit\n");
const audit = auditSite(PUB);
const lowest = Math.min(...audit.pages.map((p) => p.score));
const avg = Math.round(audit.pages.reduce((s, p) => s + p.score, 0) / audit.pages.length);
const broken = audit.pages.flatMap((p) => p.page.brokenLinks.map((b) => `${p.file}: ${b}`));
console.log(`  ${audit.pages.length} indexable pages · average ${avg}/100 · lowest ${lowest}/100`);

if (broken.length) {
  console.error(`\n  REFUSING TO SUBMIT: ${broken.length} broken internal link(s).`);
  for (const b of broken.slice(0, 10)) console.error(`    ${b}`);
  console.error("\n  Inviting four search engines to crawl a site with broken links is worse than not inviting them.");
  process.exit(1);
}
if (lowest < 90) {
  const worst = audit.pages.find((p) => p.score === lowest);
  console.error(`\n  REFUSING TO SUBMIT: ${worst.file} scores ${lowest}/100, below the floor of 90.`);
  for (const r of worst.results.filter((x) => x.got < x.of)) console.error(`    ${r.got}/${r.of}  ${r.what} — ${r.note}`);
  process.exit(1);
}
console.log("  nothing broken, nothing below the floor");

// --- 3. submit to the engines that accept a submission without an account
console.log("\n--- IndexNow (Bing, Yandex, Seznam, Naver)\n");
const { key, file, error } = readKey();
if (error) {
  console.error(`  cannot submit: ${error}`);
  process.exit(1);
}
console.log(`  key ${key} published at ${SITE}/${file}`);

const urls = all ? urlsFromSitemap() : changedSince(since);
if (!urls.length) {
  console.log(`  nothing with a lastmod on or after ${since} — nothing to tell anybody about.`);
} else {
  console.log(`  ${urls.length} URL(s) changed on or after ${since}:`);
  for (const u of urls) console.log(`    ${u}`);
  const result = await submit(urls, { key, dryRun });
  console.log(`\n  ${result.status ? `HTTP ${result.status} — ` : ""}${result.note}`);
  if (!result.ok) process.exit(1);
}

// --- 4. say what is left, and who has to do it
console.log("\n--- what this cannot do\n");
console.log("  Google does not accept an unauthenticated submission. It reads the sitemap");
console.log("  from robots.txt once the site is verified in Search Console, which needs a");
console.log("  person signed in once:");
console.log("");
console.log("    1. https://search.google.com/search-console  →  add https://etablix.com");
console.log("    2. choose the HTML tag method, copy the content value");
console.log("    3. put it in the environment as GOOGLE_SITE_VERIFICATION and redeploy");
console.log("    4. press Verify, then submit https://etablix.com/sitemap.xml");
console.log("");
console.log("  Bing is the same flow at https://www.bing.com/webmasters, with the value in");
console.log("  BING_SITE_VERIFICATION — though IndexNow above already reaches Bing's crawler,");
console.log("  so Search Console there is for the reporting rather than the indexing.");
console.log("");
console.log("  See business/marketing/SEARCH-PLAYBOOK.md for the rest.\n");
