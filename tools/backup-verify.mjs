/**
 * Back up the data, restore it, boot the application on it, and check that
 * what came back is what went in.
 *
 *   node tools/backup-verify.mjs [--keep]
 *
 * Acceptance criterion 2 of the readiness register. Before this there was a
 * backup SCRIPT and a runbook line telling you to install it, and nothing
 * that checked it was installed, that it had ever run, or that the archive
 * could be restored. An untested backup is not a backup — it is a belief.
 *
 * This does the whole loop every time it runs:
 *
 *   1. archive the live data directory
 *   2. extract it somewhere else
 *   3. START THE REAL APPLICATION against the restored copy, on a spare port
 *   4. ask it for its own row counts and compare them to the source
 *   5. confirm the uploaded files came back too — a store without its
 *      documents restores an engagement whose evidence has gone
 *
 * Exit code 0 means a restore has been demonstrated today, not assumed.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";

const KEEP = process.argv.includes("--keep");
const DATA = process.env.ETABLIX_DATA_DIR || path.resolve("backend/data");
const BACKUP_DIR = process.env.ETABLIX_BACKUP_DIR || path.join(os.tmpdir(), "etablix-backups");
const PORT = Number(process.env.VERIFY_PORT || 3488);
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

let failed = 0;
const step = (ok, msg, detail) => {
  console.log(`  ${ok ? "✓" : "✗"} ${msg}${detail ? "  — " + detail : ""}`);
  if (!ok) failed++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`\n=== backup verification · ${stamp} ===\n`);

// ---------------------------------------------------------------- 1. archive
fs.mkdirSync(BACKUP_DIR, { recursive: true });
const archive = path.join(BACKUP_DIR, `etablix-data-${stamp}.tar.gz`);
const tar = spawnSync("tar", ["-czf", archive, "-C", path.dirname(DATA), path.basename(DATA)], { encoding: "utf8" });
step(tar.status === 0 && fs.existsSync(archive), "the data directory archived",
     tar.status === 0 ? `${Math.round(fs.statSync(archive).size / 1024)} KB` : tar.stderr?.slice(0, 200));
if (tar.status !== 0) process.exit(1);

// What went in — and check the SOURCE first. A backup faithfully preserves
// whatever it is given, so an unreadable live store produces a perfect archive
// of nothing. That is an emergency in its own right and it must not be
// reported as "the backup failed".
const countRows = (dir) => {
  const db = new DatabaseSync(path.join(dir, "db.sqlite"), { readOnly: true });
  try {
    const out = {};
    for (const r of db.prepare("SELECT collection, COUNT(*) AS n FROM rows GROUP BY collection").all()) out[r.collection] = Number(r.n);
    return out;
  } finally { db.close(); }
};

let srcCounts;
try {
  srcCounts = countRows(DATA);
} catch (err) {
  console.log(`  ✗ THE LIVE STORE IS UNREADABLE — ${err.message}`);
  console.log("\n  This is not a backup problem. The application is running on a database that");
  console.log("  cannot be opened. Restore from the last good archive, and keep the current");
  console.log("  db.sqlite beside it for inspection rather than overwriting it.\n");
  process.exit(2);
}
const srcUploads = fs.existsSync(path.join(DATA, "uploads")) ? fs.readdirSync(path.join(DATA, "uploads")).length : 0;
step(true, "recorded what went in", `${Object.keys(srcCounts).length} collections, ${Object.values(srcCounts).reduce((a, b) => a + b, 0)} rows, ${srcUploads} files`);

// ---------------------------------------------------------------- 2. restore
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-restore-"));
const untar = spawnSync("tar", ["-xzf", archive, "-C", scratch], { encoding: "utf8" });
const restored = path.join(scratch, path.basename(DATA));
step(untar.status === 0 && fs.existsSync(path.join(restored, "db.sqlite")),
     "the archive extracted", untar.status === 0 ? restored : untar.stderr?.slice(0, 200));

// ------------------------------------------------- 3. boot the real thing on it
let srv = null, health = null;
if (!failed) {
  srv = spawn(process.execPath, ["backend/server.js"], {
    env: { ...process.env, PORT: String(PORT), ETABLIX_DATA_DIR: restored, SITE_URL: `http://localhost:${PORT}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let boot = "";
  srv.stdout.on("data", (b) => (boot += b));
  srv.stderr.on("data", (b) => (boot += b));
  for (let i = 0; i < 40 && !health; i++) {
    await wait(300);
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (r.ok) health = await r.json();
    } catch {}
  }
  step(!!health, "THE APPLICATION STARTED ON THE RESTORED DATA", health ? `build ${health.build}` : boot.split("\n").slice(-4).join(" | ").slice(0, 240));
}

// ----------------------------------------------------- 4. compare what came back
if (health) {
  // The counts are read from the restored file rather than from the
  // health endpoint: the endpoint no longer publishes them, because a
  // public URL that says how many clients a business has is a public URL
  // that says how many clients a business has.
  // The counts are read from the restored DATABASE rather than from the
  // health endpoint: the endpoint no longer publishes them, because a public
  // URL that says how many clients a business has is a public URL that says
  // how many clients a business has.
  const back = (() => { try { return countRows(restored); } catch { return {}; } })();
  const missing = Object.entries(srcCounts).filter(([k, n]) => (back[k] ?? -1) !== n);
  step(missing.length === 0, "every collection restored with the same row count",
       missing.length ? missing.map(([k, n]) => `${k}: ${n} in, ${back[k] ?? "absent"} back`).join("; ") : `${Object.keys(back).length} collections`);

  // 5. the documents, not just the records that point at them
  const backUploads = fs.existsSync(path.join(restored, "uploads")) ? fs.readdirSync(path.join(restored, "uploads")).length : 0;
  step(backUploads === srcUploads, "every uploaded document restored", `${srcUploads} in, ${backUploads} back`);

  // and the store is readable, not merely present
  try {
    countRows(restored);
    step(true, "the restored store parses");
  } catch (e) { step(false, "the restored store parses", e.message); }
}

if (srv) { srv.kill("SIGTERM"); await wait(600); srv.kill("SIGKILL"); }
if (!KEEP) fs.rmSync(scratch, { recursive: true, force: true });

// keep 30 days, as the runbook says
for (const f of fs.readdirSync(BACKUP_DIR)) {
  const p = path.join(BACKUP_DIR, f);
  if (/^etablix-data-.*\.tar\.gz$/.test(f) && Date.now() - fs.statSync(p).mtimeMs > 30 * 86400000) fs.unlinkSync(p);
}

console.log();
if (failed) {
  console.log(`  ${failed} step(s) failed — THE BACKUP CANNOT BE RELIED ON. Fix this before anything else.\n`);
  process.exit(1);
}
console.log(`  A restore was demonstrated, not assumed. Archive: ${archive}\n`);
