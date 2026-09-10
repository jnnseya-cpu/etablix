/**
 * The view counter: what it counts, and what it refuses to keep.
 *
 *   node backend/test/reach.test.mjs
 *
 * WHY A TEST FOR A COUNTER. Because the promise made on the privacy notice
 * and in the code comments — that no identifier of any kind is stored — is
 * only true for as long as nobody adds a field. "Store the user agent, it
 * would be useful for the browser breakdown" is a five-character change that
 * turns a counter into personal-data processing, and nothing about the site
 * would look different afterwards. So the rows are inspected here, key by
 * key, against a list of what is allowed.
 *
 * The second thing it guards is unbounded writes. Counting every requested
 * path would let anybody create store rows by requesting /aaaa, /aaab and so
 * on, from an unauthenticated endpoint. Only a path that resolves to a page
 * we actually serve is counted, and that is asserted here rather than trusted.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-reach-"));
process.env.ETABLIX_DATA_DIR = scratch;

const reach = await import("../lib/reach.js");
const store = await import("../lib/store.js");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== the view counter ===\n");

// ------------------------------------------------------- which paths count
console.log("--- only a path that is really a page\n");
{
  const PUB = path.join(root, "frontend", "public");
  ok(reach.pageFor("/", PUB) === "/", "the home page");
  ok(reach.pageFor("/blog", PUB) === "/blog", "a page served by extension");
  ok(reach.pageFor("/blog/", PUB) === "/blog", "with a trailing slash, counted as the same page");
  ok(reach.pageFor("/about.html", PUB) === "/about", "and the .html form, counted as the same page again");
  ok(reach.pageFor("/policies/privacy", PUB) === "/policies/privacy", "a nested page");
  // The unbounded-write defence.
  ok(reach.pageFor("/aaaa", PUB) === null, "a path that is not a page is not counted");
  ok(reach.pageFor("/css/styles.css", PUB) === null, "a stylesheet is not a reader");
  ok(reach.pageFor("/img/og-image.png", PUB) === null, "nor is an image");
  // The traversal defence: the resolved file must stay inside the public dir.
  ok(reach.pageFor("/../backend/server", PUB) === null, "a traversal attempt resolves to nothing");
  ok(reach.pageFor("/..%2fetc/passwd", PUB) === null, "an encoded one too");
  ok(reach.pageFor(`/${"a".repeat(300)}`, PUB) === null, "and an absurdly long path is refused before it touches the disk");
  ok(reach.pageFor("/about\0.html", PUB) === null, "a null byte is refused");
}

// -------------------------------------------------------------- classifying
console.log("\n--- a machine is counted as a machine\n");
{
  ok(reach.isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), "Googlebot");
  ok(reach.isBot("GPTBot/1.2"), "GPTBot");
  ok(reach.isBot("ClaudeBot/1.0"), "ClaudeBot");
  ok(reach.isBot("curl/8.4.0"), "curl");
  ok(reach.isBot(""), "no user agent at all is a script, not a reader");
  ok(!reach.isBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15"), "a person on Safari is not a bot");
  ok(!reach.isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"), "nor on an iPhone");
  ok(reach.crawlerName("Googlebot/2.1") === "Google", "and the named ones are named");
  ok(reach.crawlerName("PerplexityBot/1.0") === "Perplexity", "including the answer engines");
  ok(reach.crawlerName("Mozilla/5.0 Safari") === null, "a person has no crawler name");
}

console.log("\n--- the referrer is a host, and never our own\n");
{
  ok(reach.referrerHost("https://www.linkedin.com/feed/update/123") === "linkedin.com", "www is dropped");
  ok(reach.referrerHost("https://www.google.co.uk/search?q=welfare") === "google.co.uk", "and the query string never arrives");
  ok(reach.referrerHost("https://etablix.com/blog") === null, "our own pages are not referrals");
  ok(reach.referrerHost("https://www.etablix.com/blog") === null, "including with www");
  ok(reach.referrerHost("not a url") === null, "rubbish is dropped rather than stored");
  ok(reach.referrerHost("") === null, "and so is nothing");
  ok(reach.referrerHost("http://192.168.1.4/x") === null, "a bare address is not a source worth keeping");
}

// ------------------------------------------------------- counting and writing
console.log("\n--- counting, then writing once per page per day\n");
{
  for (let i = 0; i < 5; i += 1) reach.record({ page: "/blog", userAgent: "Mozilla/5.0 Safari", referer: "https://www.linkedin.com/x", day: "2026-09-10" });
  reach.record({ page: "/blog", userAgent: "Googlebot/2.1", day: "2026-09-10" });
  reach.record({ page: "/", userAgent: "Mozilla/5.0 Safari", day: "2026-09-10" });
  reach.record({ page: "/blog", userAgent: "Mozilla/5.0 Safari", day: "2026-09-11" });

  ok(reach.pending().length === 3, "three buckets: two pages on one day and one on the next", reach.pending().length);
  const before = store.collection("pageviews").length;
  ok(before === 0, "nothing is written until the flush");

  const f = reach.flushViews();
  ok(f.written === 8, "eight views written", f.written);
  ok(reach.pending().length === 0, "and the buffer is empty afterwards");

  const rows = store.collection("pageviews");
  ok(rows.length === 3, "three rows — one per page per day, not one per view", rows.length);
  const blog10 = rows.find((r) => r.day === "2026-09-10" && r.page === "/blog");
  ok(blog10.views === 5, "five human views", blog10.views);
  ok(blog10.bots === 1, "one crawler visit, counted separately", blog10.bots);
  ok(blog10.refs["linkedin.com"] === 5, "and the referring host counted five times", JSON.stringify(blog10.refs));
  ok(blog10.crawlers.Google === 1, "with the crawler named");

  // A second flush for the same day must add to the row, not make another.
  reach.record({ page: "/blog", userAgent: "Mozilla/5.0 Safari", day: "2026-09-10" });
  reach.flushViews();
  ok(store.collection("pageviews").length === 3, "a later visit to the same page on the same day adds no row");
  ok(store.collection("pageviews").find((r) => r.day === "2026-09-10" && r.page === "/blog").views === 6, "it increments the count");
}

// ---------------------------------------------------------------- privacy
console.log("\n--- what a row is allowed to contain\n");
{
  // The promise, enforced. Anything not on this list is a new field somebody
  // added, and it has to be argued for in this test before it can exist.
  const ALLOWED = new Set(["id", "createdAt", "day", "page", "views", "bots", "refs", "crawlers", "source", "importedToPageviews"]);
  const FORBIDDEN = /ip|addr|agent|ua\b|cookie|session|visitor|user|fingerprint|device|country|city|uid|hash/i;
  for (const row of store.collection("pageviews")) {
    for (const key of Object.keys(row)) {
      ok(ALLOWED.has(key), `pageviews row carries only permitted fields — "${key}"`);
      ok(!FORBIDDEN.test(key), `"${key}" is not an identifier`);
    }
    ok(typeof row.views === "number" && typeof row.bots === "number", "the counts are numbers");
    ok(Object.values(row.refs || {}).every((n) => typeof n === "number"), "the referrer map holds counts, not URLs");
    for (const host of Object.keys(row.refs || {})) ok(!host.includes("/"), `the referrer "${host}" is a host, not a path`);
  }
  const source = fs.readFileSync(path.join(root, "backend", "lib", "reach.js"), "utf8");
  ok(!/req\.(ip|ips)\b/.test(source), "the counter never reads the client address");
  ok(!/set-?cookie/i.test(source), "and never sets a cookie");
  const stored = /insert\(COLLECTION[\s\S]{0,400}?\)/g;
  ok(!/userAgent[^)]*\}\s*\)/.test(String(source.match(stored) || "")), "the user agent is inspected and discarded, never written");
}

// ------------------------------------------------------------------ reading
console.log("\n--- the reading\n");
{
  const s = reach.summary({ from: "2026-09-11", days: 30 });
  ok(s.views === 8, "eight human views across the window", s.views);
  ok(s.bots === 1, "one crawler visit", s.bots);
  ok(s.today.views === 1, "one of them today", s.today.views);
  ok(s.pages[0].page === "/blog", "the busiest page first", s.pages[0].page);
  ok(s.referrers[0].name === "linkedin.com", "the biggest source first");
  ok(/not unique visitors/.test(s.counts), "and the reading says plainly what it is not");
  ok(s.daily.length === 2 && s.daily[0].day === "2026-09-10", "the daily series is in date order");

  // Anything still in memory is included, so the dashboard never lags itself.
  reach.record({ page: "/", userAgent: "Mozilla/5.0 Safari", day: "2026-09-11" });
  ok(reach.summary({ from: "2026-09-11", days: 30 }).views === 9, "an unflushed view is still counted in the reading");
  reach.flushViews();

  const one = reach.viewsForPage("/blog");
  ok(one.views === 7, "views for one page across every day held", one.views);
  ok(one.firstCrawl === "2026-09-10", "and the day a crawler first came — which is our own answer to 'is it indexed'");
}

// ---------------------------------------------------------------- retention
console.log("\n--- retention, and the import from the retired beacon\n");
{
  reach.record({ page: "/", userAgent: "Mozilla/5.0 Safari", day: "2024-01-01" });
  reach.flushViews();
  ok(store.collection("pageviews").some((r) => r.day === "2024-01-01"), "an old day exists to be pruned");
  const dropped = reach.prune("2026-09-11");
  ok(dropped === 1, "one day past the retention window dropped", dropped);
  ok(!store.collection("pageviews").some((r) => r.day === "2024-01-01"), "and it is gone");
  ok(reach.prune("2026-09-11") === 0, "pruning again drops nothing");

  store.insert("traffic", { date: "2026-09-06", total: 3, paths: { "/": 2, "/subcontractors": 1 }, referrers: { "linkedin.com": 1 } });
  const moved = reach.importLegacyTraffic();
  ok(moved === 3, "the beacon's three views are brought across", moved);
  ok(store.collection("pageviews").find((r) => r.day === "2026-09-06" && r.page === "/").views === 2, "attributed to the right page");
  ok(reach.importLegacyTraffic() === 0, "and a second boot does not double them");
  ok(store.collection("traffic")[0].importedToPageviews === true, "because the source row is marked rather than deleted");
}

store.close();
fs.rmSync(scratch, { recursive: true, force: true });

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
