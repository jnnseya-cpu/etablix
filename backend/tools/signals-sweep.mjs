/**
 * Run a sweep from the command line and say what it found.
 *
 *   docker exec etablix node backend/tools/signals-sweep.mjs
 *
 * MUST RUN INSIDE THE CONTAINER. Unlike the check tool, this one writes: it
 * queues what it finds, so it needs the same data volume the application
 * reads. Run on the host it would use a different store, and the queue on
 * the screen would stay empty while this printed success — which is a worse
 * outcome than not running at all.
 *
 * WHY IT EXISTS AT ALL. The sweep is on the automation schedule and there is
 * a button on the Signals page, but neither helps somebody already at a
 * shell who wants to know whether the thing works. A bearer token fetched by
 * hand to POST one endpoint is a hurdle at exactly the moment the answer
 * matters most.
 */
import { sweep } from "../lib/signals/index.js";
import { sourcesFile, seedStatus, sources } from "../lib/signals/parse.js";
import { collection } from "../lib/store.js";

const list = sources();
console.log(`\nreading: ${sourcesFile()}`);

// The sweep says it too. A sweep run against a list older than the one that
// shipped behaves like the version before and looks like nothing happened.
{
  const seed = seedStatus();
  if (seed.stale) {
    console.log(`\n  !! this list is version ${seed.liveVersion}; version ${seed.repoVersion} shipped with the image.`);
    console.log(`     The live copy is never overwritten, so a repository change does not reach`);
    console.log(`     here by itself. Run signals-check.mjs for what to do about it.\n`);
  }
}
console.log(`${list.length} source(s) enabled${list.length ? ": " + list.map((s) => s.id).join(", ") : ""}\n`);

if (!list.length) {
  console.log("Nothing is enabled, so nothing will be found and the queue will stay empty.");
  console.log("Run the check first:  node backend/tools/signals-check.mjs --all\n");
  process.exit(0);
}

const before = collection("signals").length;
console.log("sweeping — one request per host at a time, so this is not quick…\n");
const out = await sweep();

console.log(`  sources read        ${out.checked}`);
console.log(`  unchanged since last ${out.unchanged}`);
console.log(`  barred by robots    ${out.blocked}`);
console.log(`  failed              ${out.failed}`);
if (out.cooling) console.log(`  rate limited        ${out.cooling}  (asked us to wait — see below)`);
console.log(`  already seen        ${out.skipped}`);
console.log(`  NEWLY QUEUED        ${out.queued.length}`);

// WHICH ONES, AND WHY. A number on its own sends the reader to the check tool
// to find out what the sweep already knew.
if (out.failures && out.failures.length) {
  console.log("\n  what failed:\n");
  for (const f of out.failures) {
    console.log(`    ${f.id}  —  ${f.why}`);
    console.log(`      ${f.url}`);
  }
  if (out.failures.some((f) => f.cooling)) {
    console.log("\n  A rate limit is not a broken source and there is nothing to fix in the");
    console.log("  file. Those hosts will be skipped without a request until the time above,");
    console.log("  so running this again sooner costs nothing and achieves nothing.");
  }
}

if (out.queued.length) {
  console.log("\nWhat was queued, highest first:\n");
  for (const s of [...out.queued].sort((a, b) => b.score - a.score)) {
    console.log(`  [${s.score}] ${s.triggers.join(", ")}`);
    console.log(`       ${s.title.slice(0, 100)}`);
    console.log(`       ${s.url}\n`);
  }
} else if (out.checked && !out.failed && !out.blocked) {
  // The ambiguous outcome, named rather than left to be guessed at: every
  // source answered and nothing matched.
  console.log("\nEvery source answered and nothing matched the triggers.");
  console.log("That is either a quiet day or the wrong patterns. To tell which,");
  console.log("run the check — it prints what the feeds actually hold today:\n");
  console.log("  node backend/tools/signals-check.mjs --all\n");
}

const total = collection("signals").length;
console.log(`\nqueue: ${total} signal(s) in total (was ${before}).`);
console.log("Read them at https://etablix.com/internal/signals.html\n");
