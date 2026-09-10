/**
 * The publishing cadence, and the two data files it reads.
 *
 *   node backend/test/editorial.test.mjs
 *
 * WHY THIS EXISTS. A daily blog is a promise the arithmetic either supports or
 * does not. The number that decides it is the buffer — finished, unpublished
 * posts — and the failure this suite guards is the one that flatters: adding
 * drafts and briefs together into a comfortable total, so a queue of twenty
 * ideas reads as twenty days of runway when nothing is written.
 *
 * It also guards the draft boundary, which is the part with a public
 * consequence. A post with no date in schedule.json must appear NOWHERE — not
 * in the index, the sitemap, the feed, llms.txt or a related-post block.
 * A half-finished post that leaks into a sitemap gets its address recorded by
 * a crawler and then found changed, which costs more than never publishing it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cadence, ratePerWeek, daysBetween } from "../lib/editorial.js";
import { POSTS, DRAFTS, CATALOGUE_POSTS, PLAN, PLAN_ALL, SCHEDULE, SOURCES, LINKS } from "../lib/blog.js";
import { build } from "../tools/build-blog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== editorial cadence ===\n");

// --------------------------------------------------------------- the maths
console.log("--- the buffer is counted, not estimated\n");
{
  const c = cadence({ posts: [{ published: "2026-09-10" }], drafts: [{ slug: "a" }, { slug: "b" }], plan: [1, 2, 3], today: "2026-09-10" });
  ok(c.bufferDays === 2, "the buffer is the number of finished drafts", c.bufferDays);
  ok(c.plannedBriefs === 3, "briefs are counted separately", c.plannedBriefs);
  // The flattering bug: 2 + 3 = 5 days of runway, when only two are written.
  ok(!("runwayDays" in c), "there is no single number adding drafts to briefs — a brief is not a draft");
  ok(c.publishedToday === true, "today counts as published when a post carries today's date");
  ok(c.streak === 1, "and the streak counts it", c.streak);
}
{
  const c = cadence({ posts: [{ published: "2026-09-08" }], drafts: [], plan: [], today: "2026-09-10" });
  ok(c.publishedToday === false, "nothing published today is reported as nothing published today");
  ok(c.daysSinceLast === 2, "two days since the last one", c.daysSinceLast);
  ok(c.streak === 0, "and a streak that does not include today is zero, not one", c.streak);
  ok(c.state === "empty", "nothing today and nothing written is the worst state", c.state);
  ok(c.act === "write", "and the action is to write, not to publish", c.act);
}
{
  // Two posts on one day must not read as two days of cadence.
  const c = cadence({ posts: [{ published: "2026-09-10" }, { published: "2026-09-10" }], drafts: [{}], plan: [], today: "2026-09-10" });
  ok(c.postsInWindow === 1, "two posts on one day is one day covered, not two", c.postsInWindow);
  ok(c.streak === 1, "and one day of streak", c.streak);
}
{
  const c = cadence({ posts: [1, 2, 3, 4, 5].map((n) => ({ published: `2026-09-0${n + 4}` })), drafts: [{}, {}, {}], plan: [], today: "2026-09-09" });
  ok(c.streak === 5, "five consecutive days is a streak of five", c.streak);
  ok(c.missedDays.length === 0, "with nothing missed");
  ok(c.state === "ok", "and a buffer of three is the healthy state", c.state);
}
{
  const c = cadence({ posts: [{ published: "2026-09-01" }, { published: "2026-09-04" }], drafts: [], plan: [], today: "2026-09-04" });
  ok(c.missedDays.join(",") === "2026-09-02,2026-09-03", "the gap is named by date", c.missedDays.join(","));
  ok(c.windowDays === 4, "and the window starts at the first post, not 30 days before a blog existed", c.windowDays);
  ok(ratePerWeek(c) === 3.5, "two posts in four days is 3.5 a week", ratePerWeek(c));
}
{
  const c = cadence({ posts: [{ published: "2026-09-10" }], drafts: [{}], plan: [], today: "2026-09-10" });
  ok(c.state === "thin", "a buffer of one, after today, is thin", c.state);
}
ok(daysBetween("2026-09-08", "2026-09-10").length === 3, "daysBetween is inclusive at both ends");
{
  let threw = false;
  try { cadence({ posts: [], drafts: [], plan: [] }); } catch { threw = true; }
  ok(threw, "cadence refuses to read the clock itself — a function that does cannot be tested");
}

// ------------------------------------------------------- the draft boundary
console.log("\n--- a draft appears nowhere\n");
{
  const { files } = build();
  const index = files.get("blog.html");
  const sitemap = files.get("sitemap.xml");
  const feed = files.get("blog/feed.xml");
  const llms = files.get("llms.txt");

  ok(DRAFTS.length > 0, `there is at least one draft to test with (${DRAFTS.length})`);
  for (const d of DRAFTS) {
    ok(!index.includes(`/blog/${d.slug}`), `the index does not link the draft ${d.slug}`);
    ok(!sitemap.includes(`/blog/${d.slug}`), `the sitemap does not advertise ${d.slug}`);
    ok(!feed.includes(`/blog/${d.slug}`), `the feed does not carry ${d.slug}`);
    ok(!llms.includes(`/blog/${d.slug}`), `llms.txt does not list ${d.slug}`);
    ok(!files.has(`blog/${d.slug}.html`), `and no page is written for ${d.slug} at all`);
  }
  for (const p of POSTS) {
    ok(files.has(`blog/${p.slug}.html`), `the published post ${p.slug} does get a page`);
    ok(sitemap.includes(`/blog/${p.slug}`), `and is in the sitemap`);
  }
}

console.log("\n--- schedule.json is the only thing that publishes\n");
{
  const raw = JSON.parse(fs.readFileSync(path.join(root, "content", "blog", "schedule.json"), "utf8"));
  const dated = Object.keys(raw).filter((k) => !k.startsWith("_"));
  ok(dated.length === POSTS.length, `${dated.length} dated entries, ${POSTS.length} published posts`, `${dated} vs ${POSTS.map((p) => p.slug)}`);
  for (const p of POSTS) ok(SCHEDULE[p.slug]?.published === p.published, `${p.slug} takes its date from the schedule`);
  for (const d of DRAFTS) ok(!SCHEDULE[d.slug], `${d.slug} has no schedule entry, which is what makes it a draft`);
  ok(CATALOGUE_POSTS.length === POSTS.length + DRAFTS.length, "every written post is either published or a draft, never both or neither");
  for (const [slug, entry] of Object.entries(SCHEDULE)) {
    ok(/^\d{4}-\d{2}-\d{2}$/.test(entry.published), `${slug} has an ISO published date`, entry.published);
    ok(entry.updated >= entry.published, `${slug} was not updated before it was published`);
  }
}

// ------------------------------------------------------------ the post files
console.log("\n--- every post is two files and cites only real sources\n");
{
  const dir = path.join(root, "content", "blog");
  const jsons = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "schedule.json");
  ok(jsons.length === CATALOGUE_POSTS.length, `${jsons.length} metadata files, ${CATALOGUE_POSTS.length} posts in the catalogue`);
  for (const p of CATALOGUE_POSTS) {
    ok(fs.existsSync(path.join(dir, p.body)), `${p.slug} has its body file`);
    for (const key of p.sources) ok(Boolean(SOURCES[key]), `${p.slug} cites a source that exists: ${key}`);
    // The two length limits that decide how the post looks in a result list.
    const title = `${p.seoTitle || p.title} | ETABLIX`;
    ok(title.length <= 65, `${p.slug}: the <title> fits in 65 characters (${title.length})`, title);
    ok(p.description.length >= 70 && p.description.length <= 160, `${p.slug}: the description is 70–160 characters (${p.description.length})`);
    // Three questions is the floor for the answer-engine checks, and a
    // 40-word floor per answer is what stops one being lifted as an answer.
    ok((p.faq || []).length >= 3, `${p.slug} answers at least three questions (${(p.faq || []).length})`);
    const thin = (p.faq || []).filter((f) => String(f.a).split(/\s+/).filter(Boolean).length < 40);
    ok(thin.length === 0, `${p.slug}: no answer under 40 words`, thin.map((t) => t.q).join(" | "));
    // A scaffold must never be committed as if it were finished.
    const bodyText = fs.readFileSync(path.join(dir, p.body), "utf8");
    const isDraft = DRAFTS.includes(p);
    if (!isDraft) {
      ok(!bodyText.includes("TODO"), `${p.slug} is published and carries no placeholder`);
      ok(!bodyText.includes("Delete this comment before publishing"), `${p.slug} does not still carry the scaffold's instructions`);
    }
  }
}

// ------------------------------------------------------------------ the plan
console.log("\n--- the brief queue is briefs, not wishes\n");
{
  ok(PLAN.length > 0, `${PLAN.length} briefs queued`);
  const slugs = new Set();
  for (const b of PLAN) {
    ok(Boolean(b.buyer && b.objection && b.sell), `${b.slug} names a buyer, an objection and an ask`);
    ok(/^[a-z0-9][a-z0-9-]{2,60}$/.test(b.slug), `${b.slug} is a usable slug`);
    ok(!slugs.has(b.slug), `${b.slug} appears once`);
    slugs.add(b.slug);
    for (const key of b.sources || []) ok(Boolean(SOURCES[key]), `${b.slug} names a source key that exists: ${key}`);
  }
  // The queue is derived: a brief whose post exists is not outstanding work,
  // and nobody should have to delete it by hand on the morning they publish.
  const written = new Set(CATALOGUE_POSTS.map((p) => p.slug));
  const stale = PLAN.filter((b) => written.has(b.slug));
  ok(stale.length === 0, "a brief drops out of the queue once its post is written", stale.map((s) => s.slug).join(", "));
  const briefed = PLAN_ALL.filter((b) => written.has(b.slug));
  ok(briefed.length > 0, `and stays in the full record (${briefed.length} written from brief)`);
  ok(PLAN.length === PLAN_ALL.length - briefed.length, "the two lists differ by exactly the written ones");
}

// --------------------------------------------------- the internal link registry
console.log("\n--- every link key in every body resolves\n");
{
  const dir = path.join(root, "content", "blog");
  for (const p of CATALOGUE_POSTS) {
    const text = fs.readFileSync(path.join(dir, p.body), "utf8");
    // Bodies scaffolded by blog-new list every key in a comment, which is
    // documentation rather than a link. Only real shortcodes are checked.
    const withoutComments = text.replace(/<!--[\s\S]*?-->/g, "");
    for (const m of withoutComments.matchAll(/\{\{(link|source):([a-zA-Z0-9_-]+)/g)) {
      const [, kind, key] = m;
      const exists = kind === "link" ? Boolean(LINKS[key]) : Boolean(SOURCES[key]);
      ok(exists, `${p.slug}: {{${kind}:${key}}} resolves`);
    }
  }
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
