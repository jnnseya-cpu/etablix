/**
 * Check the sources actually answer — and find the feed when they do not.
 *
 *   node backend/tools/signals-check.mjs          enabled sources only
 *   node backend/tools/signals-check.mjs --all    every source, disabled too
 *
 * WHY. A watcher pointed at a dead URL reports nothing, and nothing looks
 * exactly like a quiet market. This says which sources are real, which are
 * barred by robots.txt and which have moved, before any of that is mistaken
 * for silence.
 *
 * AND WHY IT LOOKS FOR THE FEED ITSELF. Guessing a feed path is how a source
 * file fills up with 404s. When a URL answers but is a page rather than a
 * feed, this reads the page's own <link rel="alternate"> declarations and
 * tells you the address the site publishes for the purpose — which is better
 * than any convention, because it came from them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// From parse.js, NOT index.js: the queue needs the database and this does not.
import { extract, score } from "../lib/signals/parse.js";
import { politeFetch } from "../lib/signals/fetch.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(root, "content", "signals", "sources.json");
const ALL = process.argv.includes("--all");

const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
const list = raw.filter((s) => s && s.url && (ALL || s.enabled !== false));
if (!list.length) {
  console.log(ALL ? "\nNo sources have a url.\n" : "\nNothing is enabled. Run with --all to test the disabled ones.\n");
  process.exit(0);
}

/** The feeds a page declares about itself, which beat any guessed path. */
const declaredFeeds = (html, base) =>
  [...String(html).matchAll(/<link\b[^>]*>/gi)]
    .filter((m) => /rel=["']?alternate/i.test(m[0]) && /(rss|atom)\+xml/i.test(m[0]))
    .map((m) => {
      const href = (/href=["']([^"']+)["']/i.exec(m[0]) || [])[1];
      try { return new URL(href, base).toString(); } catch { return null; }
    })
    .filter(Boolean);

console.log(`\n=== ${list.length} source(s)${ALL ? ", including disabled" : ""} ===\n`);
const enable = [];
let usable = 0, broken = 0, unreachable = 0;

for (const s of list) {
  console.log(`  ${s.id}  —  ${s.name || ""}`);
  console.log(`    ${s.url}`);
  const res = await politeFetch(s.url);

  if (res.unreachable) {
    console.log(`    UNREACHABLE — ${res.reason}.`);
    console.log("    This is about THIS MACHINE, not about the site. Check outbound access");
    console.log("    (a firewall, a proxy or DNS) before changing anything in sources.json.\n");
    unreachable++; continue;
  }
  if (res.blocked) {
    console.log("    BARRED by robots.txt — the site itself says no. Remove it, or write and ask.\n");
    broken++; continue;
  }
  if (!res.ok) {
    console.log(`    FAILED — ${res.reason}. Open it in a browser and correct the url.\n`);
    broken++; continue;
  }

  const items = extract(res.body, s.url);
  const hits = items.filter((i) => score(`${i.title} ${i.summary}`).score >= 3);
  const isFeed = /<rss|<feed\b|<\?xml/i.test(res.body.slice(0, 600));

  if (items.length && (isFeed || hits.length)) {
    console.log(`    OK — ${items.length} item(s) parsed, ${hits.length} would queue today${isFeed ? "" : "  (a page, not a feed)"}`);
    for (const h of hits.slice(0, 3)) console.log(`         · ${h.title.slice(0, 92)}`);
    usable++;
    if (s.enabled === false) enable.push(s.id);
  } else {
    console.log(`    ANSWERS, but nothing usable was parsed from it.`);
    broken++;
  }

  if (!isFeed) {
    const feeds = declaredFeeds(res.body, s.url);
    if (feeds.length) {
      console.log("    This page declares its own feed — point the source at one of these instead:");
      for (const f of feeds.slice(0, 4)) console.log(`         ${f}`);
    }
  }
  console.log("");
}

console.log(`=== ${usable} usable, ${broken} to fix${unreachable ? `, ${unreachable} unreachable from here` : ""} ===`);
if (unreachable === list.length) {
  console.log("\nEVERY source was unreachable, which is almost never about the sources.");
  console.log("This machine has no outbound access to them. Run this on the server that");
  console.log("actually runs the sweep before concluding anything about a publisher.");
}
if (enable.length) {
  console.log(`\nThese answered and are still disabled. Set "enabled": true for:\n`);
  for (const id of enable) console.log(`  ${id}`);
  console.log(`\nin content/signals/sources.json, then run a sweep:\n  curl -X POST -H "authorization: Bearer <token>" https://etablix.com/api/signals/sweep\n`);
}
process.exit(broken ? 1 : 0);
