/**
 * Find each source's terms, print what they say, and decide nothing.
 *
 *   docker exec etablix node backend/tools/signals-terms.mjs
 *   docker exec etablix node backend/tools/signals-terms.mjs construction-enquirer
 *
 * MUST RUN INSIDE THE CONTAINER, on the host that can actually reach these
 * sites. That is the whole reason this tool exists rather than the reading
 * being done where the engine was written.
 *
 * WHY A TOOL AND NOT A FUNCTION THE SWEEP CALLS. Whether a publisher's terms
 * permit using their headlines inside a product this business charges for is a
 * legal judgement about copyright and database right. It is not a string a
 * regex can extract and it is not a decision an engine may take. So this does
 * the half a machine can do — find the page, obey robots.txt, quote the
 * paragraphs that bear on copying and reuse, with the URL and the date — and
 * stops. The judgement, and the name of whoever made it, go into the source
 * list by hand.
 *
 * WHAT IT CHANGES IF YOU DO IT. Every one of the twenty-five feeds is
 * currently registered `context-only`, because no licence has been read. A
 * context-only source cannot satisfy the corroboration minimum and cannot on
 * its own support an automated action, so today nothing the watch reads can
 * release anything by itself. Recording `terms`, `permittedUses`, `termsUrl`
 * and `termsReadBy` on a source promotes it, and two promoted independent
 * families are what corroboration needs.
 *
 * IT NEVER WRITES. Not to the source list, not to the store, and it has no
 * send path — the same rule the watch it serves is built on.
 */

import { politeFetch } from "../lib/signals/fetch.js";
import { sources, sourcesFile } from "../lib/signals/parse.js";

/* The conventional places a publisher puts them. Tried in this order, and the
   first that answers is the one quoted: a site with both /terms and
   /terms-and-conditions has them in one place and a redirect in the other. */
const PATHS = [
  "/terms", "/terms-and-conditions", "/terms-of-use", "/terms-of-service",
  "/legal", "/copyright", "/privacy-policy", "/about/terms", "/site-terms",
];

/* The words that mean the paragraph bears on what may be done with the
   content. Deliberately about COPYING AND REUSE rather than about privacy:
   a cookie notice is not a licence. */
const BEARING = /\b(copyright|reproduc|redistribut|republish|licen[cs]|permission|commercial use|data ?mining|scrap|crawl|rss|feed|syndicat|database right|all rights reserved|without.{0,20}written consent)\b/i;

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const only = args.length ? new Set(args) : null;

/** Strip tags and collapse whitespace. Good enough to read; not a parser. */
function text(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t ]+/g, " ")
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

function bearingParagraphs(body) {
  return text(body)
    .split("\n")
    .filter((line) => line.length > 60 && line.length < 1200 && BEARING.test(line))
    // Deduplicate: a terms page often repeats a clause in a summary box.
    .filter((line, i, all) => all.findIndex((x) => x.slice(0, 80) === line.slice(0, 80)) === i)
    .slice(0, 6);
}

const list = sources().filter((s) => !only || only.has(s.id));
console.log(`\nreading: ${sourcesFile()}`);
console.log(`${list.length} source(s)${only ? ` (filtered to ${[...only].join(", ")})` : " enabled"}\n`);

if (!list.length) {
  console.log("Nothing matched. The list only returns ENABLED sources, so a disabled id finds nothing here.\n");
  process.exit(0);
}

const found = [], silent = [];

for (const src of list) {
  let origin;
  try { origin = new URL(src.url).origin; } catch {
    console.log(`\n── ${src.id}\n   its url is not a url, so there is nothing to look under: ${src.url}`);
    silent.push(src.id);
    continue;
  }

  console.log(`\n── ${src.id} — ${src.name || src.org || "(unnamed)"}`);
  console.log(`   ${origin}`);
  if (src.terms) console.log(`   ALREADY RECORDED: ${src.terms}`);

  let hit = null;
  for (const p of PATHS) {
    const res = await politeFetch(origin + p);
    if (res.blocked) { console.log(`   ${p} — robots.txt disallows it, so it is not read`); continue; }
    if (res.cooling) { console.log(`   ${p} — ${res.reason}`); break; }
    if (!res.ok || !res.body) continue;
    const paras = bearingParagraphs(res.body);
    if (!paras.length) { console.log(`   ${p} — answered, nothing in it bears on copying or reuse`); continue; }
    hit = { path: p, url: origin + p, paras };
    break;
  }

  if (!hit) {
    console.log("   NOTHING FOUND at the conventional paths. That is not permission: a source with no");
    console.log("   discoverable terms stays context-only. Open the site, find the page, and if there");
    console.log("   genuinely is none, that itself is the finding to record.");
    silent.push(src.id);
    continue;
  }

  console.log(`\n   ${hit.url}  (read ${new Date().toISOString().slice(0, 10)})\n`);
  for (const p of hit.paras) console.log(`   > ${p}\n`);
  found.push({ id: src.id, url: hit.url });
}

console.log("\n" + "─".repeat(72));
console.log(`\n${found.length} source(s) with terms to read, ${silent.length} with none found.\n`);

if (found.length) {
  console.log("WHAT TO DO WITH IT. Read the quoted clauses. Decide — you, not this tool —");
  console.log("whether they permit using the headline and summary inside a product this");
  console.log("business charges for, and whether they permit storing a copy. Then add four");
  console.log("fields to that source's entry in the live list and nothing else:\n");
  const eg = found[0];
  console.log(`    {`);
  console.log(`      "id": "${eg.id}",`);
  console.log(`      ...`);
  console.log(`      "terms": "<the licence in your own words, naming the clause>",`);
  console.log(`      "termsUrl": "${eg.url}",`);
  console.log(`      "termsReadBy": "<your name>",`);
  console.log(`      "termsReadAt": "${new Date().toISOString().slice(0, 10)}",`);
  console.log(`      "permittedUses": ["detection", "evidence"]`);
  console.log(`    }\n`);
  console.log("permittedUses is the narrowest true answer, not the most useful one:");
  console.log('  "detection"  — the movement may be counted. Nothing is stored or shown.');
  console.log('  "evidence"   — the headline may be cited and linked as the basis of a finding.');
  console.log('  "measurement"— the record may be kept for the retention period.');
  console.log("A licence that permits counting and not citing gets detection alone, and the");
  console.log("source stays unable to evidence anything. That is the correct outcome.\n");
  console.log("The engine reads the four together: terms, permittedUses, termsUrl and");
  console.log("termsReadBy. Three of the four is an unattributed judgement and is ignored,");
  console.log("because the point of recording it is that somebody is accountable for it.\n");
  console.log("Nothing deploys. The live list is read on the next sweep.\n");
}

if (silent.length) {
  console.log(`No terms found for: ${silent.join(", ")}.`);
  console.log("Each stays context-only, which means it can add context and can neither");
  console.log("corroborate nor support an automated action on its own.\n");
}
