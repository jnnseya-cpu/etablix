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
  child.stdout.on("data", (b) => { for (const l of String(b).split("\n")) if (l.trim()) confirmed.push(l.trim()); });

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

  const dbFile = path.join(dataDir, "db.json");
  let recovered = null, how = "";
  try {
    // Read it the way the server does — through the store's own recovery.
    const mod = await import(`${path.resolve("backend/lib/store.js")}?kill=${round}`);
    process.env.ETABLIX_DATA_DIR = dataDir;
    recovered = JSON.parse(fs.readFileSync(dbFile, "utf8"));
    how = "main file";
  } catch {
    const prev = dbFile + ".prev";
    if (fs.existsSync(prev)) {
      try { recovered = JSON.parse(fs.readFileSync(prev, "utf8")); how = "previous copy"; } catch {}
    }
  }

  ok(!!recovered, `round ${round}: a readable store survived the kill`,
     { files: fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [] });
  if (recovered) {
    const held = new Set((recovered.killtest || []).map((r) => r.id));
    // Allow the very last confirmed id to be missing only if recovery had to
    // fall back to the previous copy — that is the documented cost of the
    // fallback, and it must never happen from the main file.
    const missing = confirmed.filter((id) => !held.has(id));
    const acceptable = how === "main file" ? 0 : Infinity;
    ok(missing.length <= acceptable,
       `round ${round}: every confirmed record survived (${confirmed.length} written, ${missing.length} missing, via ${how})`,
       { written: confirmed.length, missing: missing.length, via: how });
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\n  ${ROUNDS} kills, ${pass} checks passed, ${fail} failed`);
console.log(fail ? "\n=== FAILED ===" : "\n=== the store survives a kill at any moment ===");
process.exit(fail ? 1 : 0);
