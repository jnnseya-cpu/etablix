/**
 * Every published URL, asked of the running server.
 *
 *   BASE=http://localhost:3391 node backend/test/seo.e2e.mjs
 *
 * WHY THIS EXISTS AS WELL AS seo.test.mjs. The static audit reads the files
 * and can prove the markup is right. It cannot prove the server hands them
 * over, and that is where this found a real one: frontend/public holds both
 * blog.html and a blog/ directory, and the static handler resolves the
 * directory first — so /blog, the address every internal link, the sitemap and
 * the canonical all point at, redirected to a 404 while every individual post
 * answered 200. Nothing in the HTML could have shown that.
 *
 * So the rule is: if it is in the sitemap, a stranger can reach it, in one
 * request, without a redirect.
 */
const BASE = (process.env.BASE || "http://127.0.0.1:3391").replace(/\/+$/, "");
const SITE = "https://etablix.com";

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 200) : ""))); };
const local = (u) => BASE + u.replace(SITE, "");

console.log("\n=== every published URL answers ===\n");

const res = await fetch(`${BASE}/sitemap.xml`);
ok(res.status === 200, "the sitemap is served");
const xml = await res.text();
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(locs.length > 0, `it lists ${locs.length} URLs`);

console.log("\n--- every URL in the sitemap\n");
for (const loc of locs) {
  // `redirect: manual` is the point. Following redirects would have hidden the
  // defect this test was written for: /blog answered, eventually, with a 404.
  const r = await fetch(local(loc), { redirect: "manual" });
  const path = loc.replace(SITE, "") || "/";
  ok(r.status === 200, `${path} → ${r.status}${r.status >= 300 && r.status < 400 ? ` (redirects to ${r.headers.get("location")})` : ""}`);
}

console.log("\n--- the discovery files\n");
for (const [path, type, must] of [
  ["/robots.txt", "text/plain", "Sitemap: https://etablix.com/sitemap.xml"],
  ["/llms.txt", "text/plain", "is NOT a main contractor"],
  ["/blog/feed.xml", "xml", "<rss version=\"2.0\""],
  ["/sitemap.xml", "xml", "<urlset"],
]) {
  const r = await fetch(BASE + path, { redirect: "manual" });
  const body = await r.text();
  ok(r.status === 200, `${path} → ${r.status}`);
  ok((r.headers.get("content-type") || "").includes(type), `${path} is served as ${type}`, r.headers.get("content-type"));
  ok(body.includes(must), `${path} carries what it is for`);
}

console.log("\n--- the IndexNow key\n");
{
  // The key file IS the proof of domain ownership: an engine fetches it before
  // it believes a submission. If it stops being served, every submission is
  // silently rejected and nothing looks wrong from this side.
  const { readKey } = await import("../lib/indexnow.js");
  const { key, file, error } = readKey();
  ok(!error, error || `key file is ${file}`);
  const k = await fetch(`${BASE}/${file}`, { redirect: "manual" });
  ok(k.status === 200, `/${file} → ${k.status}`);
  const body = (await k.text()).trim();
  ok(body === key, "and it serves exactly the key, which is what the engine checks", body.slice(0, 40));
}

console.log("\n--- what must stay out of the index\n");
for (const path of ["/internal/login.html", "/api/health"]) {
  const r = await fetch(BASE + path, { redirect: "manual" });
  ok(r.status < 500, `${path} is a real route (${r.status}) — so linking to it is not a broken link`);
}
{
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  ok(/Disallow:\s*\/internal\//.test(robots) && /Disallow:\s*\/api\//.test(robots),
     "and both are disallowed in robots.txt rather than left to be crawled");
}

console.log("\n--- the blog itself\n");
{
  const r = await fetch(`${BASE}/blog`, { redirect: "manual" });
  ok(r.status === 200, `/blog answers directly, with no redirect (${r.status})`);
  const html = await r.text();
  ok(/rel="canonical" href="https:\/\/etablix\.com\/blog"/.test(html), "and its canonical is the address people link to");
  const posts = [...html.matchAll(/href="\/blog\/([a-z0-9-]+)"/g)].map((m) => m[1]);
  ok(new Set(posts).size >= 1, `it links to ${new Set(posts).size} post(s)`);
  for (const slug of new Set(posts)) {
    const p = await fetch(`${BASE}/blog/${slug}`, { redirect: "manual" });
    ok(p.status === 200, `/blog/${slug} → ${p.status}`);
  }
}

// --- the counter, and the two things it must not do
//
// By now this suite has fetched every page in the sitemap, so if the counter
// is mounted at all it has seen real traffic. Two properties matter more than
// the count itself: a draft must not be reachable, and the numbers must not be
// readable by a stranger.
console.log("\n--- the view counter\n");
{
  const r = await fetch(`${BASE}/api/reach`);
  ok(r.status === 401, `/api/reach refuses an unauthenticated reader (${r.status})`);
  const body = await r.text();
  ok(!/"views"/.test(body), "and leaks no numbers in the refusal");
}
{
  // A page that does not exist must not create a row, because that would be
  // an unauthenticated write from anywhere on the internet.
  const junk = await fetch(`${BASE}/not-a-page-${Date.now()}`, { redirect: "manual" });
  ok(junk.status === 404, `a path that is not a page still answers 404 (${junk.status})`);
}
{
  // Drafts: written, in the repository, and unreachable. This is the check
  // that a buffer of finished posts is not quietly published early.
  const { DRAFTS } = await import("../lib/blog.js");
  if (!DRAFTS.length) ok(true, "no drafts to check (the buffer is empty)");
  for (const d of DRAFTS) {
    const r = await fetch(`${BASE}/blog/${d.slug}`, { redirect: "manual" });
    ok(r.status === 404, `the draft /blog/${d.slug} is not served (${r.status})`);
  }
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
