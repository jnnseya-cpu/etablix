/**
 * The search gate.
 *
 *   node backend/test/seo.test.mjs
 *
 * Two things are being held here, and only one of them is a score.
 *
 * THE SCORE. Every indexable page is audited against the rubric in
 * lib/seo.js and must reach 90. A published post must reach 95, because a post
 * is the thing we are asking a stranger to find and it has no excuse for being
 * short of anything. The number is reproducible: run this and you get it.
 *
 * WHAT THE SCORE CANNOT DO is promise a ranking. Position is decided by
 * systems we do not control, against competitors we cannot see, on signals no
 * on-page audit can measure. This proves nothing on our side is broken. That
 * is the half we own.
 *
 * THE OTHER THING is the set of hard rules that are not scored at all,
 * because they are not a matter of degree: no broken internal link anywhere,
 * no generated page hand-edited out of sync with the manifest that produced
 * it, and nothing published that describes ETABLIX as something it is not.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditSite, report, MAX_SCORE, RUBRIC } from "../lib/seo.js";
import { build } from "../tools/build-blog.mjs";
import { POSTS, LINKS, SOURCES, PAGES } from "../lib/blog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUB = path.join(root, "frontend", "public");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 400) : ""))); };

console.log("\n=== the search gate ===\n");

// --- the rubric itself
console.log("--- the rubric\n");
ok(MAX_SCORE === 100, `the rubric totals ${MAX_SCORE}, so a score is a percentage of a real thing`, MAX_SCORE);
ok(new Set(RUBRIC.map((c) => c.id)).size === RUBRIC.length, "every check has its own id");
ok(RUBRIC.every((c) => c.what && typeof c.fn === "function"), "every check says in words what it inspects");

const audit = auditSite(PUB);

// --- the score
console.log("\n--- the score\n");
const FLOOR = { page: 90, post: 95 };
for (const p of audit.pages.sort((a, b) => a.score - b.score)) {
  const floor = FLOOR[p.kind];
  ok(p.score >= floor, `${p.file} scores ${p.score}/100 (floor ${floor})`,
     p.score < floor ? p.results.filter((r) => r.got < r.of).map((r) => `${r.got}/${r.of} ${r.what}: ${r.note}`).join(" | ") : undefined);
}
const avg = Math.round(audit.pages.reduce((s, p) => s + p.score, 0) / audit.pages.length);
ok(avg >= 90, `the site averages ${avg}/100 across ${audit.pages.length} indexable pages`, avg);
ok(audit.excluded.every((e) => /noindex/.test(e.why)),
   `the ${audit.excluded.length} unscored pages are unscored because they say noindex, not because a list says so`,
   audit.excluded.map((e) => e.file).join(", "));

// --- the hard rules
console.log("\n--- not a matter of degree\n");
{
  const broken = audit.pages.flatMap((p) => p.page.brokenLinks.map((b) => `${p.file}: ${b}`));
  ok(broken.length === 0, "no internal link anywhere points at something that does not exist", broken.join(" | "));
}
{
  // A generated page edited by hand is a page that no longer matches the
  // manifest its contents list, its related links and its schema came from.
  const { files } = build();
  const drifted = [];
  for (const [rel, expected] of files) {
    const onDisk = fs.existsSync(path.join(PUB, rel)) ? fs.readFileSync(path.join(PUB, rel), "utf8") : null;
    if (onDisk !== expected) drifted.push(rel);
  }
  ok(drifted.length === 0,
     `all ${files.size} generated files match what the generator produces — nothing hand-edited out of sync`,
     drifted.length ? `${drifted.join(", ")} — run: node backend/tools/build-blog.mjs` : undefined);
}
{
  // The two phrasings the Commercial Playbook forbids, checked on what is
  // actually published rather than trusted to a style guide. "Principal
  // Service Contractor" collides with Principal Contractor, a defined CDM 2015
  // role carrying health-and-safety duties that must never be taken by
  // accident of wording.
  const offences = [];
  for (const f of audit.files) {
    const html = fs.readFileSync(path.join(PUB, f), "utf8");
    if (/Principal Service Contractor/i.test(html)) offences.push(`${f}: "Principal Service Contractor"`);
    if (/ETABLIX is a main contractor|we are a main contractor/i.test(html)) offences.push(`${f}: claims to be a main contractor`);
  }
  ok(offences.length === 0, "nothing published claims a role ETABLIX does not hold", offences.join(" | "));
}

// --- discovery
console.log("\n--- discovery\n");
{
  const robots = fs.readFileSync(path.join(PUB, "robots.txt"), "utf8");
  ok(/Sitemap:\s*https:\/\/etablix\.com\/sitemap\.xml/.test(robots), "robots.txt names the sitemap");
  ok(!/^\s*Disallow:\s*\/\s*$/m.test(robots), "robots.txt does not disallow the whole site");
  ok(/Disallow:\s*\/internal\//.test(robots) && /Disallow:\s*\/api\//.test(robots), "and keeps crawlers out of the portal and the API");
  // The retrieval agents are the ones that cite a page back to a person.
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot", "Bingbot"]) {
    ok(new RegExp(`User-agent:\\s*${bot}\\s*\\nAllow:\\s*/`).test(robots), `${bot} is allowed explicitly rather than by default`);
  }
}
{
  const xml = fs.readFileSync(path.join(PUB, "sitemap.xml"), "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const listable = PAGES.filter((p) => !/<meta[^>]+name="robots"[^>]*content="[^"]*noindex/i.test(
    fs.existsSync(path.join(PUB, p.file)) ? fs.readFileSync(path.join(PUB, p.file), "utf8") : ""));
  ok(locs.length === listable.length + POSTS.length,
     `the sitemap lists all ${listable.length} indexable pages and all ${POSTS.length} post(s)`, locs.length);
  ok(locs.every((l) => /^https:\/\/etablix\.com/.test(l)), "every entry is an absolute https URL");
  const noLastmod = [...xml.matchAll(/<url>(?:(?!<lastmod>)[\s\S])*?<\/url>/g)].length;
  ok(noLastmod === 0, "every entry carries a lastmod, so a crawler knows what has changed", noLastmod);
  // A page withdrawn from search must not be advertised in the sitemap.
  ok(!locs.some((l) => /\/(pqq|client-portal|supplier-portal)$/.test(l)),
     "and nothing that says noindex is advertised in it");
  for (const p of POSTS) ok(locs.includes(`https://etablix.com/blog/${p.slug}`), `${p.slug} is listed`);
}
{
  const feed = fs.readFileSync(path.join(PUB, "blog/feed.xml"), "utf8");
  ok(/<rss version="2.0"/.test(feed), "the feed is RSS 2.0");
  ok((feed.match(/<item>/g) || []).length === POSTS.length, `it carries all ${POSTS.length} post(s)`);
  ok(/<atom:link[^>]+rel="self"/.test(feed), "with a self link, which is what a validator asks for first");
  ok(/<content:encoded>/.test(feed), "and the full article rather than a teaser");
}
{
  const llms = fs.readFileSync(path.join(PUB, "llms.txt"), "utf8");
  ok(/# ETABLIX/.test(llms), "llms.txt names the business");
  // The valuable half. The single most damaging thing an answer engine can do
  // to us is describe ETABLIX as a main contractor, so the file says so before
  // it says anything else.
  ok(/is NOT a main contractor/.test(llms), "and says plainly what ETABLIX is NOT, before it says what it sells");
  ok(/Principal Contractor/.test(llms), "including the CDM role it does not hold");
  for (const p of POSTS) {
    ok(llms.includes(p.title), `${p.slug} is described in it`);
    ok((p.faq || []).every((f) => llms.includes(f.q)), "with its questions and answers in full, for an engine to lift");
  }
}

// --- the post itself
console.log("\n--- the post\n");
for (const p of POSTS) {
  const page = audit.pages.find((x) => x.file === `blog/${p.slug}.html`);
  ok(Boolean(page), `${p.slug} was built and audited`);
  const html = fs.readFileSync(path.join(PUB, `blog/${p.slug}.html`), "utf8");

  ok(!/\{\{(link|source):/.test(html), "no unresolved shortcode reached the page");
  ok(page.page.internal.length >= 15, `${page.page.internal.length} internal links, every one generated from the manifest`);
  ok(page.page.external.length >= 4, `${page.page.external.length} outbound citations to primary sources`);
  ok(page.page.questions.length >= 5, `${page.page.questions.length} questions answered in visible text, not only in schema`);
  ok(page.page.words >= 2000, `${page.page.words} words of body text`);

  ok(/"@type":"BlogPosting"/.test(html), "it declares itself an article");
  ok(/"@type":"FAQPage"/.test(html), "with its questions in schema too");
  ok(/"citation":\[/.test(html), "and its sources named in the graph, which is what an answer engine reads for provenance");
  ok(/"datePublished":"\d{4}-\d{2}-\d{2}"/.test(html) && /"dateModified"/.test(html), "with a publication and a modification date");
  ok(/"author":\{"@type":"Person"/.test(html), "attributed to a person rather than to a brand");

  ok(/class="post-toc"/.test(html), "a contents list built from the real headings");
  ok(/class="post-related"|class="post-explore"/.test(html), "and generated onward links");
  ok(/linkedin\.com\/sharing/.test(html), "a LinkedIn share that carries the canonical URL");

  // Every source the post claims to cite is actually linked from the page.
  const missing = (p.sources || []).filter((k) => !html.includes(SOURCES[k].url));
  ok(missing.length === 0, "every source it lists is linked from the page", missing.join(", "));
}

// --- the registry
console.log("\n--- the link registry\n");
{
  const missing = Object.entries(LINKS).filter(([, l]) => !fs.existsSync(path.join(PUB, l.file)));
  ok(missing.length === 0, `all ${Object.keys(LINKS).length} registry destinations exist on disk`, missing.map(([k]) => k).join(", "));
  const badFrag = [];
  for (const [key, l] of Object.entries(LINKS)) {
    const frag = l.url.split("#")[1];
    if (!frag) continue;
    const target = fs.readFileSync(path.join(PUB, l.file), "utf8");
    if (!new RegExp(`id="${frag}"`).test(target)) badFrag.push(`${key} → #${frag} not in ${l.file}`);
  }
  ok(badFrag.length === 0, "and every deep link lands on an element that exists", badFrag.join(", "));
  ok(Object.values(SOURCES).every((s) => /^https:\/\//.test(s.url) && s.title && s.publisher),
     `all ${Object.keys(SOURCES).length} cited sources are absolute https URLs with a title and a publisher`);
}

console.log("\n" + report(audit));
console.log(`\n=== ${pass} passed, ${fail} failed · site average ${avg}/100 ===\n`);
process.exit(fail ? 1 : 0);
