/**
 * Check the sources actually answer — and find the feed when they do not.
 *
 *   node backend/tools/signals-check.mjs            enabled sources only
 *   node backend/tools/signals-check.mjs --all      every source, disabled too
 *   node backend/tools/signals-check.mjs --probe    try the candidate paths
 *   node backend/tools/signals-check.mjs --dump ID  print what one source sends
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
import { extract, score, sourcesFile, seedStatus, resolveUrl, stage, namedOrgs, extractDeadline, hasWorks, notOurs, nextLink, noticeTargets } from "../lib/signals/parse.js";
import { politeFetch } from "../lib/signals/fetch.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ALL = process.argv.includes("--all");

/**
 * --probe: ASK THE SITE INSTEAD OF SENDING SOMEBODY TO A BROWSER.
 *
 * WHY THIS EXISTS. After the first live run, five sources were left needing a
 * URL that only a person with a browser could find — and "open it in a
 * browser, run a search, copy the RSS address" is the kind of ten-minute job
 * that stays undone for a month and quietly keeps the best sources off. Two of
 * them, Sell2Wales and Public Contracts Scotland, carry the schemes this
 * business cares about most.
 *
 * So each unresolved source now lists CANDIDATE paths — cheap guesses, not
 * claims — and this tries them one at a time, through the same polite fetcher
 * as everything else: robots.txt obeyed, one request per host at a time, five
 * seconds apart. Most will be refused, which costs nothing. The ones that
 * answer and parse are printed with the exact line to paste.
 *
 *   node backend/tools/signals-check.mjs --probe              every source with candidates
 *   node backend/tools/signals-check.mjs --probe sell2wales   just that one
 */
/**
 * --dump: SHOW ME WHAT THE SERVER ACTUALLY SENDS.
 *
 * WHY. Every Find a Tender signal on the second live run linked to the API
 * endpoint, because OCDS carries no human URL and I had no way to see which
 * field holds the notice number without outbound access to the API. The
 * choice was between guessing a URL template — which would give every signal
 * a confident dead link, worse than no link — and asking the machine that can
 * reach it to print the shape.
 *
 *   node backend/tools/signals-check.mjs --dump find-a-tender
 */
const DUMP = process.argv.includes("--dump");
const DUMP_ID = DUMP ? process.argv[process.argv.indexOf("--dump") + 1] : null;

const PROBE = process.argv.includes("--probe");
const PROBE_ONLY = PROBE ? process.argv[process.argv.indexOf("--probe") + 1] : null;

// Tried on every probed source after its own candidates, because these five
// answer on a surprising number of sites and cost one request each.
const COMMON_FEEDS = ["/feed/", "/rss.xml", "/index.xml", "/atom.xml", "/news/feed/"];

// Say which file, out loud. The list that matters lives on the data volume,
// not in the repository, and a tool that is silent about which one it read is
// how somebody edits the wrong copy for an afternoon.
const FILE_IN_USE = sourcesFile();
console.log(`\nreading: ${FILE_IN_USE}`);

// SAID LOUDLY, BECAUSE THE SYMPTOM OF THIS IS SILENCE.
const seed = seedStatus();
if (seed.stale) {
  console.log(`\n  !! THE LIVE LIST IS OLDER THAN THE ONE THAT SHIPPED.`);
  console.log(`     live copy  version ${seed.liveVersion}   ${seed.live}`);
  console.log(`     shipped    version ${seed.repoVersion}   ${seed.repo}`);
  console.log(`     The live copy is seeded once and never overwritten, so a hand edit`);
  console.log(`     survives a deploy — which means a change in the repository does not`);
  console.log(`     reach this machine by itself. Nothing below reflects the newer list.`);
  console.log(`\n     If NOBODY has hand-edited the live copy, take the new one:`);
  console.log(`       docker exec etablix cp ${seed.repo} ${seed.live}`);
  console.log(`     If somebody HAS, diff them and merge by hand — do not clobber it:`);
  console.log(`       docker exec etablix diff ${seed.live} ${seed.repo}`);
}
const raw = JSON.parse(fs.readFileSync(FILE_IN_USE, "utf8"));
const list = raw.filter((s) => s && s.url && (ALL || s.enabled !== false));
if (!list.length && !process.argv.includes("--probe")) {
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

/**
 * Try one candidate and say, in one line, what came back.
 * Returns the resolved url when it answered AND parsed into something.
 */
async function tryOne(base, candidate) {
  let target;
  try { target = new URL(resolveUrl(candidate), base).toString(); } catch { return null; }
  const res = await politeFetch(target);
  const label = `      ${candidate.length > 58 ? candidate.slice(0, 55) + "..." : candidate.padEnd(58)}`;

  if (res.unreachable) { console.log(`${label}  unreachable from here`); return null; }
  if (res.blocked)     { console.log(`${label}  robots.txt says no`);    return null; }
  if (!res.ok)         { console.log(`${label}  ${res.reason}`);         return null; }

  const items = extract(res.body, target);
  const head = res.body.slice(0, 600);
  const isJson = /^\s*[[{]/.test(head);
  const isFeed = isJson || /<rss|<feed\b|<\?xml/i.test(head);
  if (!items.length) { console.log(`${label}  answers, parses to nothing`); return null; }

  const hits = items.filter((i) => score(`${i.title} ${i.summary}`).score >= 3).length;
  console.log(`${label}  ANSWERS — ${items.length} item(s), ${hits} would queue${isJson ? "  [JSON]" : isFeed ? "  [feed]" : "  [page]"}`);
  for (const i of items.slice(0, 2)) console.log(`${" ".repeat(64)}· ${i.title.slice(0, 64)}`);
  return { url: target, items: items.length, hits, isFeed };
}

if (DUMP) {
  const src = raw.find((x) => x && x.id === DUMP_ID && x.url);
  if (!src) { console.log(`\nNo source called "${DUMP_ID}".\n`); process.exit(1); }
  const url = noticeTargets(src)[0];
  console.log(`\n=== ${src.id} ===\n${url}\n`);
  const res = await politeFetch(url);
  if (!res.ok) {
    console.log(`FAILED — ${res.reason}`);
    if (res.body) console.log(`\nthe body it answered with:\n${res.body.slice(0, 600)}`);
    process.exit(1);
  }

  const head = res.body.slice(0, 400);
  if (/^\s*[[{]/.test(head)) {
    let doc; try { doc = JSON.parse(res.body); } catch { console.log("it claims JSON but does not parse."); process.exit(1); }
    console.log(`top-level keys: ${Object.keys(doc).join(", ") || "(an array)"}\n`);
    // Find the first array of objects, wherever it is, and describe one record.
    const findRows = (o, depth = 0) => {
      if (Array.isArray(o) && o.length && typeof o[0] === "object") return o;
      if (o && typeof o === "object" && depth < 3) {
        for (const v of Object.values(o)) { const got = findRows(v, depth + 1); if (got) return got; }
      }
      return null;
    };
    const rows = findRows(doc);
    if (!rows) { console.log("no array of records found."); process.exit(1); }
    console.log(`${rows.length} record(s). THE FIRST ONE, two levels deep:\n`);
    const show = (o, prefix = "", depth = 0) => {
      for (const [k, v] of Object.entries(o)) {
        if (v === null || v === undefined) continue;
        if (Array.isArray(v)) {
          console.log(`  ${prefix}${k}[]  (${v.length})`);
          if (v.length && typeof v[0] === "object" && depth < 2) show(v[0], `${prefix}${k}[0].`, depth + 1);
          else if (v.length) console.log(`  ${prefix}${k}[0] = ${JSON.stringify(v[0]).slice(0, 90)}`);
        } else if (typeof v === "object") {
          if (depth < 2) show(v, `${prefix}${k}.`, depth + 1);
          else console.log(`  ${prefix}${k} = {...}`);
        } else {
          console.log(`  ${prefix}${k} = ${JSON.stringify(v).slice(0, 110)}`);
        }
      }
    };
    show(rows[0]);
    console.log(`\nWHAT TO LOOK FOR: a field holding the notice's own number — the form`);
    console.log(`"100572-2026", not the "ocds-..." ocid. Set it as a template, e.g.`);
    console.log(`  "noticeUrl": "https://host/Notice/{id}"`);
    console.log(`and {id} is filled from ocid, id, tender.id, noticeId or publicatieId, in that order.`);
    console.log(`If none of those holds it, paste this output back and the reader can be taught the field.\n`);
  } else {
    console.log("not JSON. The first 1200 characters:\n");
    console.log(res.body.slice(0, 1200));
    const first = /<(item|entry)\b[\s\S]*?<\/\1>/i.exec(res.body);
    if (first) console.log(`\nthe first item:\n${first[0].slice(0, 900)}\n`);
  }
  process.exit(0);
}

if (PROBE) {
  const probing = raw.filter((x) => x && x.url && Array.isArray(x.candidates) && x.candidates.length
                                 && (!PROBE_ONLY || x.id === PROBE_ONLY));
  if (!probing.length) {
    console.log(PROBE_ONLY
      ? `\nNo source called "${PROBE_ONLY}" has any candidates to try.\n`
      : "\nNo source has candidates to try. Add a \"candidates\": [\"/feed/\", ...] array to one.\n");
    process.exit(0);
  }

  console.log(`\n=== probing ${probing.length} source(s) ===`);
  console.log("One request per host at a time, five seconds apart, robots.txt obeyed.");
  console.log("Most of these will be refused. That is what a probe is for.\n");

  const answers = [];
  for (const src of probing) {
    console.log(`  ${src.id}  —  ${src.name || ""}`);
    let origin;
    try { origin = new URL(resolveUrl(src.url)).origin; } catch { console.log("    the url is not a url\n"); continue; }

    const seen = new Set();
    let best = null;
    for (const c of [...src.candidates, ...COMMON_FEEDS]) {
      if (seen.has(c)) continue;
      seen.add(c);
      const got = await tryOne(origin, c);
      // A feed beats a page, and more hits beats fewer. Keep looking either
      // way: a later candidate may be the proper feed.
      if (got && (!best || (got.isFeed && !best.isFeed) || (got.isFeed === best.isFeed && got.hits > best.hits))) best = got;
    }
    if (best) { answers.push([src.id, best]); console.log(`    BEST: ${best.url}\n`); }
    else console.log("    nothing answered. This one needs a browser after all.\n");
  }

  if (!answers.length) {
    console.log("=== nothing answered ===\n");
    console.log("If EVERY candidate was unreachable, that is this machine's outbound access");
    console.log("rather than the sites. Run this on the server that runs the sweep.\n");
    process.exit(1);
  }

  console.log(`=== ${answers.length} source(s) resolved ===\n`);
  console.log(`Paste these into ${FILE_IN_USE}, set "enabled": true, drop the "verify" note,`);
  console.log(`and delete the "candidates" array — it has done its job:\n`);
  for (const [id, b] of answers) console.log(`  ${id}\n    "url": "${b.url}"`);
  console.log(`\nThen sweep:\n  docker exec etablix node backend/tools/signals-sweep.mjs\n`);
  process.exit(0);
}

console.log(`\n=== ${list.length} source(s)${ALL ? ", including disabled" : ""} ===\n`);
const enable = [];
let usable = 0, broken = 0, unreachable = 0;

for (const s of list) {
  console.log(`  ${s.id}  —  ${s.name || ""}`);
  // The URL as the sweep will actually request it, dates filled in. Printing
  // the template instead is how you spend an afternoon testing by hand a URL
  // that is not the one the watcher asks for.
  // EVERY ADDRESS THE SWEEP WOULD REQUEST, not the template. A watchlist
  // source carries {{notice}} and a list of identifiers; printing or fetching
  // the unexpanded form reports a 404 from a URL the sweep never asks for.
  const targets = noticeTargets(s);
  const url = targets[0];
  console.log(`    ${url}${url !== s.url ? `\n      (from ${s.url})` : ""}`);
  if (targets.length > 1) {
    console.log(`      ${targets.length} named notice(s), each fetched exactly — no window, no paging`);
  }
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

  /**
   * PAGE LIKE THE SWEEP DOES, OR LIE ABOUT WHAT IT WILL FIND.
   *
   * On the live run this reported identical counts for the seven-day Find a
   * Tender source and the 120-day one — same hundred items, same sixty-seven
   * dropped — because it read one page while the sweep reads twelve. The deep
   * source exists precisely to reach what is on pages two to twelve, so a
   * check that stops at page one describes a source that does not exist.
   */
  const opts = { noticeUrl: s.noticeUrl || null, siteUrl: s.siteUrl || null };
  const items = extract(res.body, url, opts);
  let read = 1, at = url, bodyNow = res.body;

  // The rest of a watchlist, each fetched exactly, and a withdrawn notice
  // answering 404 is reported rather than stopping the others.
  let missing = 0;
  for (const target of targets.slice(1)) {
    const one = await politeFetch(target);
    read++;
    if (!one.ok || !one.body) { missing++; console.log(`      ${target.split("/").pop()}  ${one.reason || "no body"}`); continue; }
    items.push(...extract(one.body, target, opts));
  }
  if (missing) console.log(`      ${missing} of ${targets.length} named notice(s) did not answer`);

  // A watchlist has already made all the requests it is going to make.
  const depth = targets.length > 1 ? read : Math.max(1, Math.min(Number(s.pages) || 1, 50));
  while (read < depth) {
    const next = nextLink(bodyNow, at);
    if (!next) break;
    const more = await politeFetch(next);
    if (!more.ok || !more.body) break;
    const batch = extract(more.body, next, opts);
    if (!batch.length) break;
    items.push(...batch);
    at = next; bodyNow = more.body; read++;
  }

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
    if (notOurs(text)) return { drop: "a category we could never sell to" };
    if (s.requireSector && !r.sectors.length && !s.sector) return { drop: "outside our sectors" };
    if (s.requireWorks && !hasWorks(text)) return { drop: "nothing to build in it" };
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
    const pageNote = read > 1 ? `, ${read} pages` : depth > 1 ? ", 1 page (no next link)" : "";
    console.log(`    OK — ${items.length} item(s) parsed${pageNote}, ${hits.length} would queue today${shape}`);
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
