/**
 * The store survives being killed at any moment.
 *
 *   node backend/test/store-kill.test.mjs [rounds]
 *
 * Acceptance criterion 1 of the readiness register. This is the test the
 * platform most needed and did not have: a write used to be one non-atomic
 * writeFileSync of the whole file, so a kill part-way through left a
 * truncated store and the server would not boot at all.
 *
 * Each round spawns a child that writes continuously, kills it with SIGKILL
 * at a random moment, then checks that what is left on disk is readable and
 * that every record the child had CONFIRMED as written is still there.
 * SIGKILL is used deliberately — it is the harshest case and cannot be
 * caught, so nothing can tidy up after itself.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROUNDS = Number(process.argv[2] || 40);
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 300) : ""))); };

const WRITER = `
import { insert, collection, load } from "${path.resolve("backend/lib/store.js")}";
load();
let n = 0;
// Announce each id only AFTER persist() has returned, so the parent only ever
// expects records the store said it had committed.
for (;;) {
  const row = insert("killtest", { n: n++, payload: "x".repeat(400) });
  process.stdout.write(row.id + "\\n");
}
`;

for (let round = 1; round <= ROUNDS; round++) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-kill-"));
  const dataDir = path.join(dir, "backend", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const script = path.join(dir, "writer.mjs");
  fs.writeFileSync(script, WRITER);

  const confirmed = [];
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, ETABLIX_DATA_DIR: dataDir },
    stdio: ["ignore", "pipe", "ignore"],
  });
  // Reassemble the stream properly. A chunk boundary lands in the middle of
  // an id often enough at this write rate to invent two ids that were never
  // written, and then to report them as records the store lost. The store
  // was not losing them; this loop was making them up.
  let tail = "";
  child.stdout.on("data", (b) => {
    const parts = (tail + String(b)).split("\n");
    tail = parts.pop() ?? "";
    // Ids only. The store logs its own boot lines to stdout, and counting
    // "[store] seeded a new database" as a record it then failed to hold is
    // how a working store gets reported as a broken one.
    for (const l of parts) if (/^[0-9a-f]{16}$/.test(l.trim())) confirmed.push(l.trim());
  });

  // Wait until the child has confirmed at least one write, so the kill lands
  // inside the write storm rather than during module load. Killing a process
  // that has not written yet proves nothing.
  const readyBy = Date.now() + 15000;
  while (!confirmed.length && Date.now() < readyBy) await new Promise((r) => setTimeout(r, 20));
  ok(confirmed.length > 0, `round ${round}: the writer got going before the kill`);
  if (!confirmed.length) { child.kill("SIGKILL"); fs.rmSync(dir, { recursive: true, force: true }); continue; }
  // Then kill at a different moment each round.
  await new Promise((r) => setTimeout(r, 30 + Math.random() * 500));
  child.kill("SIGKILL");
  await new Promise((r) => child.on("exit", r));

  // Read it back the way the server does: open the database and look. A
  // SIGKILL mid-transaction leaves a write-ahead log to roll back, and
  // opening it is what rolls it back — so this reads through the real store
  // rather than parsing a file, which is also the only way to find out
  // whether the database is openable at all after a kill.
  let recovered = null, how = "";
  try {
    process.env.ETABLIX_DATA_DIR = dataDir;
    const mod = await import(`${path.resolve("backend/lib/store.js")}?kill=${round}`);
    recovered = mod.exportJson();
    how = "the database";
    mod.close();
  } catch (err) {
    how = "unreadable: " + err.message;
  }

  ok(!!recovered, `round ${round}: a readable store survived the kill`,
     { files: fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [] });
  if (recovered) {
    const held = new Set((recovered.killtest || []).map((r) => r.id));
    // Allow the very last confirmed id to be missing only if recovery had to
    // fall back to the previous copy — that is the documented cost of the
    // fallback, and it must never happen from the main file.
    const missing = confirmed.filter((id) => !held.has(id));
    const acceptable = 0;   // a committed transaction is never lost. No fallback, no allowance.
    ok(missing.length <= acceptable,
       `round ${round}: every confirmed record survived (${confirmed.length} written, ${missing.length} missing, via ${how})`,
       { written: confirmed.length, missing: missing.length, via: how });
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\n  ${ROUNDS} kills, ${pass} checks passed, ${fail} failed`);
console.log(fail ? "\n=== FAILED ===" : "\n=== the store survives a kill at any moment ===");
process.exit(fail ? 1 : 0);
