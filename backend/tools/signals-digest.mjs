/**
 * What the queue says needs a person, and nothing else.
 *
 *   docker exec etablix node backend/tools/signals-digest.mjs
 *
 * WHY THIS IS SEPARATE FROM THE SWEEP. A sweep reports what it DID — sources
 * read, items queued, items refused. That is the wrong question at the end of
 * a run. The right one is what is now waiting, what expires soonest, and what
 * cannot proceed without somebody doing something. Those three answers are the
 * reason to open the screen at all, and before this they had to be worked out
 * by reading the screen.
 *
 * It is READ ONLY. It changes nothing, queues nothing and sends nothing, so it
 * is safe to run on a schedule, in a cron mail, or twenty times in a row.
 *
 * It is also the part of update.sh that stays correct as this grows: new
 * sectors, stages and sources appear here automatically because it reads the
 * registry rather than a list written out by hand.
 */
import { collection } from "../lib/store.js";
import { sources, sourcesFile, seedStatus, SECTORS, SECTOR_LABEL, STAGE_LABEL } from "../lib/signals/parse.js";

const DAY = 86400000;
const SOON = Number(process.env.ETABLIX_DIGEST_DAYS || 21) * DAY;
const now = Date.now();

const signals = collection("signals");
const when = (ts) => new Date(ts).toISOString().slice(0, 10);
const days = (ts) => Math.round((ts - now) / DAY);

console.log(`\n=== the queue, ${when(now)} ===\n`);

if (!signals.length) {
  console.log("  Nothing in the queue at all.");
  console.log("  Either no sweep has run, or every source is refusing everything.");
  console.log("  Run: node backend/tools/signals-check.mjs --all\n");
}

// ---------------------------------------------------------------- what waits
const byStatus = {};
for (const s of signals) byStatus[s.status || "new"] = (byStatus[s.status || "new"] || 0) + 1;
console.log(`  ${signals.length} signal(s): ` +
  Object.entries(byStatus).map(([k, n]) => `${n} ${k}`).join(", "));

const unread = signals.filter((s) => (s.status || "new") === "new");
const byStage = {};
for (const s of unread) byStage[s.stage || "early"] = (byStage[s.stage || "early"] || 0) + 1;
if (unread.length) {
  console.log(`  ${unread.length} unread: ` +
    Object.entries(byStage).map(([k, n]) => `${n} ${STAGE_LABEL[k] || k}`).join(", "));
}

const counts = SECTORS.map((x) => [x.label, unread.filter((s) => (s.sectors || []).includes(x.id)).length])
  .filter(([, n]) => n);
if (counts.length) console.log(`  by sector: ${counts.map(([l, n]) => `${l} ${n}`).join(", ")}`);

/**
 * CLOSING SOONEST, FIRST, AND IT IS THE ONLY PART THAT IS URGENT.
 *
 * Score ranks how interesting a moment is and says nothing about when it stops
 * being available. A notice closing on Friday and a consultation about a 2029
 * start are not the same errand, and a queue sorted by score puts them
 * side by side.
 */
const closing = unread
  .filter((s) => s.deadlineAt && s.deadlineAt >= now && s.deadlineAt - now <= SOON)
  .sort((a, b) => a.deadlineAt - b.deadlineAt);

if (closing.length) {
  console.log(`\n  --- ${closing.length} closing within ${Math.round(SOON / DAY)} days ---\n`);
  for (const s of closing) {
    const d = days(s.deadlineAt);
    console.log(`  ${String(d).padStart(3)}d  ${s.deadlineKind === "event" ? "event " : "closes"}  ${s.title.slice(0, 62)}`);
    const who = (s.suppliers || [])[0] || s.buyer || (s.orgs || [])[0];
    if (who) console.log(`         ${who}${s.roleAddress ? `  ${s.roleAddress}` : ""}`);
    console.log(`         ${s.url}`);
  }
}

// An open notice that has already closed should not be sitting here at all.
const stale = unread.filter((s) => s.deadlineAt && s.deadlineAt < now - DAY);
if (stale.length) {
  console.log(`\n  ${stale.length} unread signal(s) have a date that has already passed.`);
  console.log(`  They were queued before the deadline was read. Dismiss them, or run the sweep again.`);
}

// --------------------------------------------------------------- the sources
console.log(`\n=== sources ===\n`);
console.log(`  reading: ${sourcesFile()}`);

const seed = seedStatus();
if (seed.stale) {
  console.log(`\n  !! ACTION: the live list is version ${seed.liveVersion}; version ${seed.repoVersion} shipped.`);
  console.log(`     The live copy is never overwritten by a deploy, so a repository change`);
  console.log(`     does not reach this machine by itself. update.sh takes it, after a backup.`);
}

let raw = [];
try { raw = JSON.parse((await import("node:fs")).readFileSync(sourcesFile(), "utf8")); } catch { /* reported above */ }
const withUrl = raw.filter((x) => x && x.url);
const on = withUrl.filter((x) => x.enabled !== false);
const off = withUrl.filter((x) => x.enabled === false);
console.log(`  ${on.length} enabled, ${off.length} off`);

// A source that has never answered is the quietest failure there is: the queue
// simply stays small and nothing says why.
const silent = on.filter((src) => !signals.some((s) => s.sourceId === src.id));
if (silent.length) {
  console.log(`\n  ${silent.length} enabled source(s) have never produced a signal:`);
  for (const src of silent) console.log(`     ${src.id}`);
  console.log(`     Either they are genuinely quiet or they are broken. The check tool says which.`);
}

const probeable = off.filter((x) => Array.isArray(x.candidates) && x.candidates.length);
if (probeable.length) {
  console.log(`\n  ${probeable.length} disabled source(s) could be resolved by the probe:`);
  console.log(`     ${probeable.map((x) => x.id).join(", ")}`);
  console.log(`     node backend/tools/signals-check.mjs --probe`);
}

console.log(`\n  ${collection("suppressions").length} organisation(s) on the never-approach list\n`);
process.exit(0);
