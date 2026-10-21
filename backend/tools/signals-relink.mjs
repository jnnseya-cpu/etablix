/**
 * Repair the links on signals queued before the notice URL was built properly.
 *
 *   docker exec etablix node backend/tools/signals-relink.mjs           # dry run
 *   docker exec etablix node backend/tools/signals-relink.mjs --write   # apply
 *
 * WHY THIS EXISTS. Every Find a Tender signal queued before 21 October 2026
 * links to the API endpoint the sweep had just read — so clicking one hands a
 * reader a megabyte of JSON instead of the notice. The fix only applies to
 * signals queued afterwards, and re-sweeping does not help: the fingerprint
 * already holds those stories, so a fresh sweep skips them as "already seen"
 * and the broken links stay broken for ever.
 *
 * MUST RUN INSIDE THE CONTAINER. It writes to the queue, so it needs the same
 * data volume the application reads. Run on the host it edits a different
 * store and reports success against rows nobody will ever see.
 *
 * WHAT IT WILL NOT DO. It changes one field, `url`, and nothing else. It does
 * not re-score, re-sector, re-stage, re-deduplicate, queue anything new or
 * touch a status somebody has set. A backfill that quietly re-runs the current
 * rules over old rows is not a backfill, it is an undocumented migration — and
 * the first thing it would destroy is the record of what a person had already
 * read and dismissed.
 *
 * It is safe to run twice: a row already pointing at a notice is left alone.
 */
import { politeFetch } from "../lib/signals/fetch.js";
import { extract, resolveUrl, sources, sourcesFile, seedStatus } from "../lib/signals/parse.js";
import { collection, update } from "../lib/store.js";

const WRITE = process.argv.includes("--write");

console.log(`\nreading: ${sourcesFile()}`);
{
  const seed = seedStatus();
  if (seed.stale) {
    console.log(`\n  !! this list is version ${seed.liveVersion}; version ${seed.repoVersion} shipped with the image.`);
    console.log(`     The templates this tool needs may only exist in the newer one. Take it first:`);
    console.log(`       docker exec etablix cp ${seed.repo} ${seed.live}\n`);
  }
}

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

/** An ocid stated in the summary, which is where the sweep puts the reference. */
const ocidIn = (text) => (/\b(ocds-[a-z0-9]+-[a-z0-9]+)\b/i.exec(String(text || "")) || [])[1] || null;

/**
 * Fill a template from a reference, refusing when the placeholder names
 * something we do not have. Deliberately the same rule as the extractor: a
 * template on the wrong field gives a confident dead link, which is worse than
 * the API link it would replace.
 */
function fill(template, ref) {
  if (!template || !ref) return null;
  if (/\{(id|ref)\}/.test(template) && !/^ocds-/i.test(ref)) return null;  // not an ocid, not safe to assume
  let missing = false;
  const url = template.replace(/\{(ocid|id|ref)\}/g, (_, key) => {
    if (key === "ocid" && !/^ocds-/i.test(ref)) { missing = true; return ""; }
    return encodeURIComponent(ref);
  });
  return missing ? null : url;
}

const all = sources();
const byId = new Map(all.map((s) => [s.id, s]));
const signals = collection("signals");
console.log(`${signals.length} signal(s) in the queue, ${all.length} source(s) enabled\n`);

// Only sources that can actually produce a notice link are worth reading.
const candidates = signals.filter((sig) => {
  const src = byId.get(sig.sourceId);
  if (!src || !src.noticeUrl) return false;
  const prefix = String(src.noticeUrl).split("{")[0];
  return prefix && !String(sig.url || "").startsWith(prefix);
});

if (!candidates.length) {
  console.log("Nothing to relink: every signal from a source with a notice template already points at one.\n");
  process.exit(0);
}

const bySource = new Map();
for (const sig of candidates) {
  if (!bySource.has(sig.sourceId)) bySource.set(sig.sourceId, []);
  bySource.get(sig.sourceId).push(sig);
}
console.log(`${candidates.length} signal(s) across ${bySource.size} source(s) link somewhere other than a notice.\n`);

let fixed = 0, fromSummary = 0, fromFeed = 0, unresolved = 0, failedSource = 0;

for (const [sourceId, rows] of bySource) {
  const src = byId.get(sourceId);
  console.log(`  ${sourceId} — ${rows.length} signal(s)`);

  // FIRST, the cheap path: the reference is already in the summary, so the
  // link can be rebuilt without asking the publisher for anything.
  const stillStuck = [];
  for (const sig of rows) {
    const ref = ocidIn(sig.summary) || ocidIn(sig.title);
    const url = fill(src.noticeUrl, ref);
    if (!url) { stillStuck.push(sig); continue; }
    console.log(`     ${WRITE ? "fixed  " : "would  "} ${sig.title.slice(0, 58)}`);
    console.log(`              ${url}   (reference held)`);
    if (WRITE) update("signals", sig.id, { url });
    fixed++; fromSummary++;
  }
  if (!stillStuck.length) { console.log(""); continue; }

  // SECOND, and only for what is left: read the source once and match by
  // title. extract() is given the same options the sweep gives it, so the URL
  // comes out of the same code path rather than a second implementation of
  // the same rule that could drift from it.
  console.log(`     ${stillStuck.length} hold no reference — reading the source to match by title`);
  const res = await politeFetch(resolveUrl(src.url));
  if (!res.ok || !res.body) {
    console.log(`     SOURCE DID NOT ANSWER — ${res.reason || "no body"}. Those ${stillStuck.length} stay as they are.\n`);
    failedSource += stillStuck.length;
    continue;
  }

  const live = new Map();
  for (const item of extract(res.body, resolveUrl(src.url), { noticeUrl: src.noticeUrl, siteUrl: src.siteUrl })) {
    if (item.title) live.set(norm(item.title), item.url);
  }

  const prefix = String(src.noticeUrl).split("{")[0];
  for (const sig of stillStuck) {
    const url = live.get(norm(sig.title));
    if (!url || !url.startsWith(prefix)) {
      // Almost always means the notice has aged out of the API's date window.
      console.log(`     no match  ${sig.title.slice(0, 58)}`);
      unresolved++;
      continue;
    }
    console.log(`     ${WRITE ? "fixed  " : "would  "} ${sig.title.slice(0, 58)}`);
    console.log(`              ${url}   (matched in the feed)`);
    if (WRITE) update("signals", sig.id, { url });
    fixed++; fromFeed++;
  }
  console.log("");
}

console.log(`=== ${WRITE ? "relinked" : "would relink"} ${fixed} of ${candidates.length} ===`);
console.log(`    ${fromSummary} from a reference already held, ${fromFeed} matched in the source`);
if (unresolved) {
  console.log(`    ${unresolved} could not be matched — almost always a notice that has aged out of`);
  console.log(`      the API's date window. Widen the window in the source url ({{date:-30}}) and`);
  console.log(`      run again, or leave them: the search-page link still works, it is just slower.`);
}
if (failedSource) console.log(`    ${failedSource} left alone because their source did not answer`);

if (!WRITE) {
  console.log(`\nNothing was changed. To apply:\n  docker exec etablix node backend/tools/signals-relink.mjs --write\n`);
} else {
  console.log(`\nDone. Read them at https://etablix.com/internal/signals.html\n`);
}
process.exit(0);
