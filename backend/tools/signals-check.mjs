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
import { extract, score, sourcesFile, resolveUrl, stage, namedOrgs, extractDeadline } from "../lib/signals/parse.js";
import { politeFetch } from "../lib/signals/fetch.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ALL = process.argv.includes("--all");

// Say which file, out loud. The list that matters lives on the data volume,
// not in the repository, and a tool that is silent about which one it read is
// how somebody edits the wrong copy for an afternoon.
const FILE_IN_USE = sourcesFile();
console.log(`\nreading: ${FILE_IN_USE}`);
const raw = JSON.parse(fs.readFileSync(FILE_IN_USE, "utf8"));
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
  // The URL as the sweep will actually request it, dates filled in. Printing
  // the template instead is how you spend an afternoon testing by hand a URL
  // that is not the one the watcher asks for.
  const url = resolveUrl(s.url);
  console.log(`    ${url}${url !== s.url ? `\n      (from ${s.url})` : ""}`);
  const res = await politeFetch(url);

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
    console.log(`    FAILED — ${res.reason}.`);
    // A notice API that refuses almost always says which parameter it wanted.
    // Printing that beats "open it in a browser", which for a POST-only or
    // key-gated API is not even possible.
    if (res.body && /^\s*[[{]/.test(res.body.slice(0, 40))) {
      console.log(`    It answered with JSON, which usually names the problem:`);
      console.log(`      ${res.body.slice(0, 300).replace(/\s+/g, " ")}`);
    }
    // "Open it in a browser and correct the url" is homework, not an answer.
    // The site root almost always declares its own feed, so go and look.
    try {
      const home = await politeFetch(new URL(url).origin + "/");
      if (home.ok && home.body) {
        const feeds = declaredFeeds(home.body, url);
        if (feeds.length) {
          console.log("    The site root declares these feeds — try one of them:");
          for (const f of feeds.slice(0, 4)) console.log(`         ${f}`);
        } else {
          console.log("    The site root answers but declares no feed. Find the news or");
          console.log("    decisions page in a browser and put that address here.");
        }
      }
    } catch { /* the root is no help either; the failure above stands */ }
    console.log("");
    broken++; continue;
  }

  const items = extract(res.body, url);

  /**
   * THE CHECK MUST COUNT WHAT THE SWEEP WOULD COUNT, OR IT IS LYING.
   *
   * On the first live run this reported "70 would queue today" for Find a
   * Tender. The sweep now applies a sector gate to the portals and drops an
   * open notice whose date has passed, so an unfiltered count here would
   * promise ten times the queue that actually arrives — and the next person
   * to read the two numbers side by side would go looking for a bug that is
   * in the diagnostic rather than the watcher.
   */
  const judge = (i) => {
    const text = `${i.title} ${i.summary}`;
    const r = score(text);
    if (r.score < 3) return null;
    if (s.requireSector && !r.sectors.length && !s.sector) return { drop: "outside our sectors" };
    const d = extractDeadline(text);
    const where = stage(r.triggers);
    if (where === "open" && d && d.at < Date.now() - 86400000) return { drop: "already closed" };
    return { r, d, where, text };
  };
  const judged = items.map((i) => [i, judge(i)]);
  const hits = judged.filter(([, j]) => j && !j.drop).map(([i]) => i);
  const dropped = judged.filter(([, j]) => j && j.drop);
  const head = res.body.slice(0, 600);
  const isJson = /^\s*[[{]/.test(head);
  const isFeed = isJson || /<rss|<feed\b|<\?xml/i.test(head);

  if (items.length && (isFeed || hits.length)) {
    const shape = isJson ? "  (a JSON notice API)" : isFeed ? "" : "  (a page, not a feed)";
    console.log(`    OK — ${items.length} item(s) parsed, ${hits.length} would queue today${shape}`);
    // What the queue would actually SHOW, not just the headline: the stage,
    // the date and the name. Those three are the whole point of the change
    // and printing only the title hides whether any of them worked.
    for (const h of hits.slice(0, 3)) {
      const text = `${h.title} ${h.summary}`;
      const r = score(text), d = extractDeadline(text);
      // The record's own names where it has them, the regex only otherwise —
      // the same order the sweep uses, so this shows what the card will show.
      const who = (h.orgs && h.orgs.length) ? h.orgs : namedOrgs(text);
      console.log(`         · [${stage(r.triggers)}] ${h.title.slice(0, 80)}`);
      console.log(`             score ${r.score} · ${r.triggers.join(", ") || "no trigger"} · ${r.sectors.join(", ") || "no sector"}`);
      if (d) {
        const days = Math.round((d.at - Date.now()) / 86400000);
        console.log(`             ${d.kind}: ${d.text}  (${days < 0 ? `${-days} days ago` : `in ${days} days`})`);
      }
      if (who.length) console.log(`             named: ${who.join(" / ")}`);
    }
    // Said out loud, because a gate that works silently looks like a source
    // that has gone quiet.
    const why = {};
    for (const [, j] of dropped) why[j.drop] = (why[j.drop] || 0) + 1;
    for (const [reason, n] of Object.entries(why)) console.log(`         ${n} scored but were dropped: ${reason}`);
    if (!hits.length) {
      // A working feed scoring zero is ambiguous: a quiet day, or the wrong
      // patterns. Printing what is actually in it settles that in one look —
      // and the first time this ran, it was the patterns.
      console.log("         nothing matched. What the feed actually holds today:");
      for (const i of items.slice(0, 5)) console.log(`         · ${i.title.slice(0, 92)}`);
      console.log("         If those look like the moments we want, the triggers need widening.");
    }
    usable++;
    if (s.enabled === false) enable.push(s.id);
  } else {
    console.log(`    ANSWERS, but nothing usable was parsed from it.`);
    broken++;
  }

  if (!isFeed) {
    const feeds = declaredFeeds(res.body, url);
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
  console.log(`\nin ${FILE_IN_USE}, then sweep:\n  docker exec etablix node backend/tools/signals-sweep.mjs\n`);
}
process.exit(broken ? 1 : 0);
