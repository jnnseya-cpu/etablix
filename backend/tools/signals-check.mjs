/**
 * Check every source in content/signals/sources.json actually answers.
 *
 *   node backend/tools/signals-check.mjs
 *
 * A watcher pointed at a dead URL reports nothing and looks like a quiet
 * market. This says which sources are real, which are barred by robots.txt
 * and which have moved, before any of that is mistaken for silence.
 */
import { sources, extract, score } from "../lib/signals/index.js";
import { politeFetch } from "../lib/signals/fetch.js";

const all = sources();
if (!all.length) {
  console.log("\nNo sources are enabled. Edit content/signals/sources.json, set enabled: true, and run this again.\n");
  process.exit(0);
}
console.log(`\n=== checking ${all.length} enabled source(s) ===\n`);
let bad = 0;
for (const s of all) {
  process.stdout.write(`  ${String(s.id).padEnd(28)} `);
  const res = await politeFetch(s.url);
  if (res.blocked) { console.log("BARRED by robots.txt — remove it or ask the owner"); bad++; continue; }
  if (!res.ok) { console.log(`FAILED (${res.reason})`); bad++; continue; }
  const items = extract(res.body, s.url);
  const hits = items.filter((i) => score(`${i.title} ${i.summary}`).score >= 3).length;
  console.log(`ok — ${items.length} item(s), ${hits} would queue today`);
  if (!items.length) { console.log("      nothing parsed: is this a feed? an RSS or Atom URL works far better than a page"); bad++; }
}
console.log(`\n=== ${all.length - bad} usable, ${bad} to fix ===\n`);
process.exit(bad ? 1 : 0);
