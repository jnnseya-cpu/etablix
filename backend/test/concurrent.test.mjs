/**
 * Two writers, one row, and neither loses the other.
 *
 *   node backend/test/concurrent.test.mjs
 *
 * The finding this closes: handlers read a row, do something asynchronous,
 * then write back a whole array built from the copy they read BEFORE the
 * await. Anything that landed in between is discarded without a sound. Six
 * concurrent uploads survived only because those particular handlers happened
 * to be synchronous — one added await anywhere and the losses would start,
 * and nothing in the system would have noticed.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-conc-"));
process.env.ETABLIX_DATA_DIR = dir;
const store = await import("../lib/store.js");

let pass = 0, fail = 0;
const t = async (name, fn) => {
  try { await fn(); pass++; console.log("  ✓ " + name); }
  catch (e) { fail++; console.log("  ✗ " + name + "\n      " + String(e.message).split("\n").slice(0, 3).join("\n      ")); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log("\nthe store — two writers, one row\n");

const row = store.insert("conctest", { name: "Target", events: [], files: [] });

await t("the old shape LOSES an update, which is why it is not used any more", async () => {
  // The pattern that was in the route code: take the array, do something
  // asynchronous, then write back a whole new array built from what you
  // took. Whatever landed in between is gone.
  store.update("conctest", row.id, { events: [] });
  const readA = [...store.collection("conctest").find((r) => r.id === row.id).events];
  const readB = [...store.collection("conctest").find((r) => r.id === row.id).events];
  await wait(5);
  store.update("conctest", row.id, { events: [...readA, { who: "A" }] });
  store.update("conctest", row.id, { events: [...readB, { who: "B" }] });
  const after = store.collection("conctest").find((r) => r.id === row.id).events;
  assert.equal(after.length, 1, "one of the two was lost — the fault, reproduced");
  assert.equal(after[0].who, "B", "and it is the first writer that disappears");
});

await t("append() keeps both", async () => {
  store.update("conctest", row.id, { events: [] });
  const first = (async () => { await wait(5); store.append("conctest", row.id, "events", { who: "A" }); })();
  const second = (async () => { await wait(5); store.append("conctest", row.id, "events", { who: "B" }); })();
  await Promise.all([first, second]);
  const after = store.collection("conctest").find((r) => r.id === row.id).events;
  assert.equal(after.length, 2, `both survived — got ${after.length}`);
  assert.deepEqual(after.map((e) => e.who).sort(), ["A", "B"]);
});

await t("twenty writers against one row lose nothing", async () => {
  store.update("conctest", row.id, { files: [] });
  await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      (async () => { await wait(Math.random() * 20); store.append("conctest", row.id, "files", { n: i }); })()
    )
  );
  const files = store.collection("conctest").find((r) => r.id === row.id).files;
  assert.equal(files.length, 20, `all twenty are there — got ${files.length}`);
  assert.deepEqual([...new Set(files.map((f) => f.n))].sort((x, y) => x - y), Array.from({ length: 20 }, (_, i) => i));
});

await t("mutate() sees the row as it is at write time, not as it was read", async () => {
  store.update("conctest", row.id, { stage: "one", events: [] });
  const readEarly = store.collection("conctest").find((r) => r.id === row.id);
  await wait(5);
  store.update("conctest", row.id, { stage: "two" });        // somebody else moves it on
  let sawStage = null;
  store.mutate("conctest", row.id, (current) => { sawStage = current.stage; return { note: "x" }; });
  assert.equal(readEarly.stage, "two", "the mirror object is kept current");
  assert.equal(sawStage, "two", "mutate was given the CURRENT row, not the stale one");
});

await t("a cap applies inside the append, not after it", async () => {
  store.update("conctest", row.id, { trail: [] });
  for (let i = 0; i < 30; i++) store.append("conctest", row.id, "trail", { i }, { cap: 10 });
  const trail = store.collection("conctest").find((r) => r.id === row.id).trail;
  assert.equal(trail.length, 10);
  assert.equal(trail[0].i, 20, "the oldest went, the newest stayed");
});

await t("the ledger is append-only and survives a reopen", async () => {
  store.recordLedger("test.event", "REF-1", "tester", "something happened");
  store.close();
  const again = await import("../lib/store.js?reopen=1");
  const entries = again.ledger({ kind: "test.event" });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].ref, "REF-1");
  assert.equal(entries[0].detail, "something happened");
  again.close();
});

fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
