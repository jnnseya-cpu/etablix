/**
 * Publish one post. The whole daily act, in one command.
 *
 *   node backend/tools/blog-publish.mjs                 # the oldest draft
 *   node backend/tools/blog-publish.mjs --slug welfare-on-day-one
 *   node backend/tools/blog-publish.mjs --status        # report, change nothing
 *   node backend/tools/blog-publish.mjs --dry-run       # show what it would do
 *   node backend/tools/blog-publish.mjs --push          # and push, so it goes live
 *
 * WHAT PUBLISHING ACTUALLY IS HERE. One date, written into
 * content/blog/schedule.json. Everything else follows from it: the index, the
 * sitemap, the feed, llms.txt and the related-post blocks on every existing
 * post are regenerated, the audit runs, and the search engines that accept an
 * unauthenticated submission are told.
 *
 * THE PROPERTY THAT MATTERS. If the audit fails, the date is TAKEN BACK OUT
 * and the site is rebuilt without it. A post is either published and passing
 * or not published at all. The failure mode this exists to prevent is a
 * half-published post: a date in the schedule, a page in the sitemap, and a
 * defect that stopped the build half way — which is the state that gets a URL
 * crawled, recorded and then found broken.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCHEDULE = path.join(root, "content", "blog", "schedule.json");

const flag = (name) => process.argv.includes(`--${name}`);
const opt = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
};

const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });
const quiet = (cmd) => execSync(cmd, { cwd: root, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

// The manifest is read fresh each time, so --status after an edit is honest.
const blog = await import("../lib/blog.js");
const { cadence, ratePerWeek } = await import("../lib/editorial.js");
const { POSTS, DRAFTS, PLAN, CATALOGUE_POSTS } = blog;
const today = blog.today();

// ------------------------------------------------------------------- report

const c = cadence({ posts: POSTS, drafts: DRAFTS, plan: PLAN, today });

console.log("\n=== the blog, today ===\n");
console.log(`  published:      ${POSTS.length} post(s), newest ${c.lastPublished || "never"}`);
console.log(`  written ahead:  ${c.bufferDays} draft(s)  ${c.bufferDays ? `→ ${DRAFTS.map((d) => d.slug).join(", ")}` : ""}`);
console.log(`  briefs queued:  ${c.plannedBriefs}`);
console.log(`  last 30 days:   ${c.postsInWindow} post(s) over ${c.windowDays} day(s) — ${ratePerWeek(c)} a week`);
console.log(`  streak:         ${c.streak} day(s)`);
if (c.missedDays.length) console.log(`  days missed:    ${c.missedDays.length} (${c.missedDays.slice(-6).join(", ")}${c.missedDays.length > 6 ? " …" : ""})`);
console.log(`\n  ${c.say}`);
if (c.act === "write" && c.nextToWrite) {
  console.log(`\n  Next brief: ${c.nextToWrite.title}`);
  console.log(`    for:       ${c.nextToWrite.buyer}`);
  console.log(`    objection: “${c.nextToWrite.objection}”`);
  if (c.nextToWrite.sourcesNeeded) console.log(`    FIND FIRST: ${c.nextToWrite.sourcesNeeded}`);
  console.log(`\n    node backend/tools/blog-new.mjs ${c.nextToWrite.slug}`);
}

if (flag("status")) {
  console.log("");
  process.exit(0);
}

// ------------------------------------------------------------- choose one

const wanted = opt("slug");
let post;
if (wanted && wanted !== true) {
  post = CATALOGUE_POSTS.find((p) => p.slug === wanted);
  if (!post) {
    console.error(`\n  No post "${wanted}" in the manifest. Written posts: ${CATALOGUE_POSTS.map((p) => p.slug).join(", ")}\n`);
    process.exit(1);
  }
  if (POSTS.includes(post)) {
    console.error(`\n  "${wanted}" is already published (${post.published}). To change a live post, edit it and set updated in schedule.json.\n`);
    process.exit(1);
  }
} else {
  post = DRAFTS[0];
  if (!post) {
    console.error("\n  Nothing to publish: no drafts. Write one first — the queue above says which.\n");
    process.exit(1);
  }
}

// The body has to exist before a date is written against it. This is the one
// check that stops a schedule entry for a post nobody has written.
const body = path.join(root, "content", "blog", post.body);
if (!fs.existsSync(body)) {
  console.error(`\n  "${post.slug}" has a manifest entry but no body at content/blog/${post.body}.\n`);
  process.exit(1);
}

// A scaffold must not be publishable by accident. blog-new.mjs marks every
// placeholder TODO, so one string catches an unfinished post in either file —
// and the check names the line, because "there is a TODO somewhere" is not
// help at the end of a long day.
{
  const offences = [];
  const scan = (label, text) => {
    text.split("\n").forEach((line, i) => {
      if (line.includes("TODO")) offences.push(`${label}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  };
  scan(`content/blog/${post.slug}.json`, fs.readFileSync(path.join(root, "content", "blog", `${post.slug}.json`), "utf8"));
  scan(`content/blog/${post.body}`, fs.readFileSync(body, "utf8"));
  if (offences.length) {
    console.error(`\n  NOT PUBLISHING "${post.slug}": ${offences.length} placeholder(s) left.\n`);
    for (const o of offences.slice(0, 12)) console.error(`    ${o}`);
    if (offences.length > 12) console.error(`    … and ${offences.length - 12} more`);
    console.error("");
    process.exit(1);
  }
}

// ------------------------------------------------------------- pre-flight
//
// The audit runs on the whole site after the rebuild, and it rolls this back
// if it fails. That works, but it is a rollback rather than a check: it means
// finding out that a post is 200 words short by watching a publish reverse
// itself. These are the four things that actually fail, checked against the
// draft before anything is written.
{
  const problems = [];
  const raw = fs.readFileSync(body, "utf8");
  const words = raw.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (words < 900) problems.push(`${words} words. The rubric gives full marks at 900 and this would score 3 of 4.`);

  const seoTitle = `${post.seoTitle || post.title} | ETABLIX`;
  if (seoTitle.length > 65) problems.push(`the <title> would be ${seoTitle.length} characters ("${seoTitle}") — over 65 it is truncated in a result list. Shorten seoTitle.`);
  if (seoTitle.length < 15) problems.push(`the <title> would be only ${seoTitle.length} characters.`);

  const d = (post.description || "").length;
  if (d < 70 || d > 160) problems.push(`the meta description is ${d} characters; it wants 70 to 160.`);

  const faq = post.faq || [];
  const thin = faq.filter((f) => String(f.a).split(/\s+/).filter(Boolean).length < 40);
  if (faq.length < 3) problems.push(`${faq.length} question(s) in the FAQ. Three is the floor — they are what an answer engine lifts.`);
  else if (thin.length) problems.push(`${thin.length} FAQ answer(s) under 40 words: too thin to be quoted as an answer.`);

  if (problems.length) {
    console.error(`\n  NOT PUBLISHING "${post.slug}". ${problems.length} thing(s) would cost marks:\n`);
    for (const x of problems) console.error(`    · ${x}`);
    console.error("\n  Nothing has been changed.\n");
    process.exit(1);
  }
  console.log(`\n  pre-flight: ${words} words, ${faq.length} questions, title ${seoTitle.length} chars, description ${d} chars`);
}

console.log(`\n=== publishing ${post.slug} ===\n`);
console.log(`  ${post.title}`);
console.log(`  body: content/blog/${post.body} (${(fs.statSync(body).size / 1024).toFixed(1)} kB)`);

if (flag("dry-run")) {
  console.log(`\n  --dry-run: would add {"${post.slug}": {"published": "${today}", "updated": "${today}"}} to schedule.json,`);
  console.log("  rebuild, audit, and submit to the engines that accept a submission. Nothing changed.\n");
  process.exit(0);
}

// --------------------------------------------------------- write the date

const before = fs.readFileSync(SCHEDULE, "utf8");
const schedule = JSON.parse(before);
schedule[post.slug] = { published: today, updated: today };
fs.writeFileSync(SCHEDULE, `${JSON.stringify(schedule, null, 2)}\n`);
console.log(`\n  schedule.json: ${post.slug} published ${today}`);

const putItBack = (why) => {
  fs.writeFileSync(SCHEDULE, before);
  console.error(`\n  ROLLED BACK: ${why}`);
  console.error("  The date has been removed and the site rebuilt without the post, so nothing");
  console.error("  half-published is left behind. Fix the fault and run this again.\n");
  try { run("node backend/tools/build-blog.mjs"); } catch { /* the message above is the important part */ }
  process.exit(1);
};

// ------------------------------------------------- rebuild, audit, submit

try {
  run(`node backend/tools/publish.mjs${flag("no-submit") ? " --dry-run" : ""}`);
} catch (err) {
  putItBack(`the rebuild, the audit or the submission failed (${err.status ? `exit ${err.status}` : err.message}).`);
}

// ------------------------------------------------------------------ commit

const files = ["content/blog/schedule.json", "frontend/public/blog.html", "frontend/public/blog", "frontend/public/sitemap.xml", "frontend/public/llms.txt", `content/blog/${post.body}`];
console.log("\n--- commit\n");
if (flag("push")) {
  const branch = quiet("git rev-parse --abbrev-ref HEAD");
  run(`git add ${files.join(" ")}`);
  run(`git commit -m ${JSON.stringify(`blog: ${post.title}`)}`);
  run(`git push -u origin ${branch}`);
  console.log(`\n  pushed to ${branch}. Auto-deploy takes it live within five minutes.\n`);
} else {
  console.log("  Not committed. Auto-deploy only sees what is pushed, so it is not live yet:");
  console.log("");
  console.log(`    git add ${files.join(" ")}`);
  console.log(`    git commit -m ${JSON.stringify(`blog: ${post.title}`)}`);
  console.log("    git push");
  console.log("");
  console.log("  Or re-run this with --push to do all three.\n");
}
