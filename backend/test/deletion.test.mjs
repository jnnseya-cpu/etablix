/**
 * Deletions are written down, and the record can be read.
 *
 *   node backend/test/deletion.test.mjs
 *
 * WHY THIS EXISTS. A numbered Site Systems Diagnostic report — a paid client
 * deliverable — was in the document register and then was not. The system
 * carries an append-only ledger for exactly that question, and it could not
 * answer it, for three separate reasons that had each been true since the day
 * the ledger was written:
 *
 *   1. store.remove() wrote nothing to the ledger, although the note at the
 *      top of store.js says it records "the money events and the deletions".
 *   2. A minted document carried no link to the agent run it was drafted
 *      from, so nothing could say whether it was recoverable — and it always
 *      was, because the run and its pack are untouched.
 *   3. No route could read the ledger at all. It was write-only.
 *
 * Any one of those alone makes a disappearance unexplainable. This suite
 * pins all three, and it pins the exclusion list too: a counter pruning a
 * year of page-view rows must not fill the ledger with them, because a
 * record full of noise is the same as no record.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-del-"));
process.env.ETABLIX_DATA_DIR = scratch;

const store = await import("../lib/store.js");
const reach = await import("../lib/reach.js");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== deletions leave a record ===\n");

console.log("--- a deleted row is in the ledger\n");
{
  const doc = store.insert("documents", { number: "SSD-2026-099", template: "diagnostic", title: "Test project" });
  const before = store.ledger({ limit: 500 }).length;

  const removed = store.remove("documents", doc.id, { by: "J Nseya", why: "superseded by a corrected issue" });
  ok(removed?.number === "SSD-2026-099", "the row comes back from remove(), so a caller can report what went");
  ok(!store.collection("documents").some((d) => d.id === doc.id), "and it is gone from the collection");

  const after = store.ledger({ limit: 500 });
  ok(after.length === before + 1, "exactly one ledger entry was added", `${before} → ${after.length}`);

  const entry = after[0];
  ok(entry.kind === "row.deleted", "recorded as row.deleted", entry.kind);
  ok(entry.ref === doc.id, "against the row's id");
  ok(entry.actor === "J Nseya", "naming who did it", entry.actor);
  ok(entry.detail.includes("SSD-2026-099"), "and identifying the row by its NUMBER, not just an internal id", entry.detail);
  ok(entry.detail.includes("superseded"), "with the reason given", entry.detail);
  ok(typeof entry.at === "number" && entry.at > 0, "and when");
}

console.log("\n--- an unattributed deletion says so rather than saying nothing\n");
{
  const row = store.insert("clientEngagements", { client: "Test client", ref: "ENG-2026-999" });
  store.remove("clientEngagements", row.id);
  const entry = store.ledger({ limit: 5 })[0];
  ok(entry.kind === "row.deleted", "still recorded");
  ok(entry.actor === "unattributed", "and marked unattributed, which is itself a finding", entry.actor);
  ok(entry.detail.includes("ENG-2026-999"), "identified by its reference", entry.detail);
}

console.log("\n--- routine churn is NOT in the ledger\n");
{
  // A counter pruning fourteen months of daily rows would bury every real
  // entry. A record full of noise is the same as no record.
  reach.record({ page: "/", userAgent: "Mozilla/5.0 Safari", day: "2024-01-01" });
  reach.flushViews();
  const before = store.ledger({ limit: 500 }).length;
  const dropped = reach.prune("2026-09-11");
  ok(dropped === 1, "a stale day was pruned", dropped);
  ok(store.ledger({ limit: 500 }).length === before, "and nothing went in the ledger for it");

  store.insert("notifications", { text: "x" });
  const n = store.collection("notifications")[0];
  store.remove("notifications", n.id);
  ok(store.ledger({ limit: 500 }).length === before, "nor for a notification");
}

console.log("\n--- the ledger can be read back, and filtered\n");
{
  store.recordLedger("document.deleted", "abc123", "J Nseya", "SSD-2026-100 removed from the register.");
  const all = store.ledger({ limit: 500 });
  ok(all.length > 0, `${all.length} entries readable`);
  ok(all[0].at >= all[all.length - 1].at, "newest first");

  const onlyDocs = store.ledger({ kind: "document.deleted", limit: 500 });
  ok(onlyDocs.length === 1, "filtering by kind works", onlyDocs.length);
  ok(onlyDocs.every((r) => r.kind === "document.deleted"), "and returns only that kind");

  const recent = store.ledger({ since: Date.now() + 60_000, limit: 500 });
  ok(recent.length === 0, "a future `since` returns nothing rather than everything");
}

console.log("\n--- the read route exists, and is admin-only\n");
{
  const src = fs.readFileSync(new URL("../routes/admin.js", import.meta.url), "utf8");
  ok(/router\.get\("\/ledger"/.test(src), "GET /api/admin/ledger is defined");
  ok(/router\.use\(requireAuth, requireRole\(ROLES\.ADMIN\)\)/.test(src),
     "and everything in that file is behind an admin session");
  ok(/kinds:/.test(src), "the response lists the kinds present, so nobody has to guess a filter");
  // The purge must never be able to take a paid run or an issued document.
  // Scanned against the ARRAY, not the file: the comment above it explains
  // the collection name that used to be there and has to be free to say so.
  const purgeList = src.split("const PURGE = [")[1].split("];")[0];
  ok(!/"agentRuns"/.test(purgeList), "the purge list no longer names a collection that does not exist");
  ok(!/"agentTasks"/.test(purgeList), "and does not clear agent runs — those are paid model time");
  ok(!/"documents"/.test(purgeList), "or documents — those are numbered deliverables");
  ok(!/"clientEngagements"/.test(purgeList), "or client engagements");
}

console.log("\n--- a document records the run it came from\n");
{
  const src = fs.readFileSync(new URL("../routes/docs.js", import.meta.url), "utf8");
  ok(/runId: run\.id,/.test(src), "from-run hands the run id to the draft");
  ok(/if \(req\.body\?\.runId\)/.test(src), "generate accepts it");
  ok(/does not exist, so the document cannot claim to come from it/.test(src),
     "and refuses a run id that names nothing, rather than asserting a false provenance");
  ok(/remintable: Boolean\(run\)/.test(src),
     "and the delete reply says whether the document can be drafted again for nothing");
  const ui = fs.readFileSync(new URL("../../frontend/internal/js/commercial.js", import.meta.url), "utf8");
  ok(/runId: form\.dataset\.runId/.test(ui), "the form carries it through to generate");
  ok(/cannot be drafted again\. This is the only copy/.test(ui),
     "and the delete prompt warns when there is no run behind the document");
}

store.close();
fs.rmSync(scratch, { recursive: true, force: true });

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
