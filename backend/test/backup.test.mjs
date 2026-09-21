/**
 * The nightly backup, run for real against a stubbed Docker.
 *
 *   node backend/test/backup.test.mjs
 *
 * WHY THIS EXISTS. deploy/backup.sh has now been wrong twice, in two
 * different directions, and both faults reached the live VPS:
 *
 *   1. It archived /opt/etablix/backend/data — the repository checkout —
 *      while the container reads a NAMED DOCKER VOLUME mounted at
 *      /app/backend/data. It produced a 105-byte archive of nothing and
 *      wrote its "I ran" stamp to a path the application never reads, so the
 *      operator had a cron entry, a log line, a file in /var/backups, and no
 *      backup.
 *
 *   2. Fixed, it then failed its OWN verification on a good archive:
 *
 *        tar -tzf "$ARCHIVE" | grep -q "$SNAP"
 *
 *      grep -q exits on the first match, closing the pipe; tar is killed by
 *      SIGPIPE and exits 141; set -o pipefail promotes the dead writer's
 *      status to the pipeline's. The check failed BECAUSE it found what it
 *      was looking for.
 *
 * Reading the script cannot catch either of those. Both are about what
 * happens when it runs. So this runs it — the real file, unmodified, with a
 * stub `docker` on PATH standing in for the container and a scratch
 * directory standing in for the volume — and asserts on the four outcomes
 * that matter: a good backup passes, a missing container stops it, a failed
 * snapshot stops it, and an archive of the WRONG DIRECTORY is still caught
 * even when it is large enough and valid enough to pass every other check.
 *
 * The last case is the one that protects against regressing fault 1 while
 * fixing something else, and it is deliberately given a 3,000-file decoy so
 * that the size and gzip checks cannot be what rejects it.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = path.join(root, "deploy", "backup.sh");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 400) : ""))); };

console.log("\n=== the nightly backup, run ===\n");

const work = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-backup-test-"));
const bin = path.join(work, "bin");
const vol = path.join(work, "vol");       // stands in for the named volume
const decoy = path.join(work, "decoy");   // a plausible but wrong directory
const out = path.join(work, "out");
for (const d of [bin, vol, decoy, out]) fs.mkdirSync(d, { recursive: true });

// A stand-in for the live volume: many documents and a database, so the
// archive is a realistic size and a realistic number of entries.
for (let i = 1; i <= 3000; i++) fs.writeFileSync(path.join(vol, `doc-${i}.json`), `{"n":${i}}\n`);
fs.writeFileSync(path.join(vol, "db.sqlite"), Buffer.alloc(900_000, 7));
// The decoy is the shape of fault 1: big, valid, and not the data directory.
for (let i = 1; i <= 3000; i++) fs.writeFileSync(path.join(decoy, `unrelated-${i}.txt`), `junk ${i}\n`);

// The stub. It answers the four things backup.sh asks Docker to do:
// report whether the container runs, take the snapshot, stream the archive
// out, and write the stamp inside. FAKE_* variables drive each failure.
fs.writeFileSync(path.join(bin, "docker"), `#!/bin/bash
case "$1" in
  inspect) echo "\${FAKE_RUNNING:-true}"; exit 0 ;;
  exec)
    shift; shift
    case "$1" in
      node) [ "\${FAKE_SNAP_OK:-1}" = 1 ] || exit 1
            head -c 200000 /dev/zero > "$FAKE_VOL/backup-snapshot.sqlite"; exit 0 ;;
      tar)  exec tar -czf - -C "\${FAKE_TAR_DIR:-$FAKE_VOL}" . ;;
      rm)   rm -f "$FAKE_VOL/backup-snapshot.sqlite"; exit 0 ;;
      sh)   eval "\${3//\\/app\\/backend\\/data/$FAKE_VOL}"; exit 0 ;;
    esac ;;
esac
exit 0
`, { mode: 0o755 });

const run = (env = {}) => {
  try {
    const stdout = execFileSync("bash", [script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_VOL: vol, ETABLIX_BACKUP_DIR: out, ETABLIX_BACKUP_REMOTE: "", ...env },
    });
    return { code: 0, text: stdout };
  } catch (e) {
    return { code: e.status ?? -1, text: `${e.stdout || ""}${e.stderr || ""}` };
  }
};

// --- 1. a good backup must pass, and must leave the stamp INSIDE the container
console.log("--- a good backup\n");
const good = run();
ok(good.code === 0, "the script exits 0 on a healthy container", good.text);
ok(/archive verified:/.test(good.text), "it says the archive is verified", good.text);
// 3,000 documents, the database, the snapshot, and "./" itself.
ok(/3003 entries/.test(good.text),
   "and counts every entry — 3,000 documents, the database, the snapshot and the directory itself", good.text);
ok(!/BACKUP FAILED/.test(good.text), "a working backup is NOT reported as a failure — the pipefail/SIGPIPE regression", good.text);
ok(fs.existsSync(path.join(vol, "last-backup")),
   "the stamp is written where the application reads it: inside the container's data directory");
const stamped = Number(fs.readFileSync(path.join(vol, "last-backup"), "utf8").trim());
ok(Number.isFinite(stamped) && Math.abs(Date.now() / 1000 - stamped) < 600,
   "and the stamp is a current unix timestamp", stamped);
ok(!fs.existsSync(path.join(vol, "backup-snapshot.sqlite")),
   "the snapshot is removed afterwards — it is a copy of the database, not the database");
const archives = fs.readdirSync(out).filter((f) => /^etablix-data-.*\.tar\.gz$/.test(f));
ok(archives.length === 1, "exactly one archive was produced", archives);

// --- 2. a stopped container must stop the run
console.log("\n--- the container is not running\n");
const stopped = run({ FAKE_RUNNING: "false" });
ok(stopped.code === 1, "it exits non-zero", stopped.text);
ok(/is not running/.test(stopped.text), "and says the container is not running", stopped.text);

// --- 3. a failed snapshot must stop the run rather than archive a torn copy
console.log("\n--- the snapshot cannot be taken\n");
const torn = run({ FAKE_SNAP_OK: "0" });
ok(torn.code === 1, "it exits non-zero", torn.text);
ok(/refusing to write a torn backup/.test(torn.text), "and refuses rather than archiving a torn copy", torn.text);

// --- 4. the original fault: a large, valid archive of the WRONG directory
console.log("\n--- the archive is of the wrong directory (the original fault)\n");
const before = fs.readFileSync(path.join(vol, "last-backup"), "utf8");
const wrong = run({ FAKE_TAR_DIR: decoy });
ok(wrong.code === 1, "it exits non-zero", wrong.text);
ok(/snapshot .* is not in the archive/.test(wrong.text),
   "and names the reason: the snapshot is not in what was archived", wrong.text);
ok(/database snapshot taken/.test(wrong.text),
   "the snapshot step itself succeeded — so size and gzip validity were never what rejected it", wrong.text);
ok(fs.readFileSync(path.join(vol, "last-backup"), "utf8") === before,
   "the stamp is NOT refreshed, so the platform's backup alert keeps firing — the entire point of the alert");

// --- the shape of the verification, so the pipe cannot come back
console.log("\n--- the shape that caused fault 2\n");
const sh = fs.readFileSync(script, "utf8");
// Comments in the script quote the bad line on purpose, to record why it was
// wrong. Strip them, or this assertion fails on the explanation of the fix.
const code = sh.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
ok(!/tar -tzf[^\n|]*\|\s*grep -q/.test(code),
   "the listing is not piped into grep -q — the reader exits early and pipefail blames tar");
ok(/LIST=\$\(tar -tzf/.test(sh), "it is read once into a variable");
ok(/case "\$LIST" in/.test(sh), "and matched in the shell, where nothing can be killed by a closed pipe");
ok(/-v "\$VOLUME:\/app\/backend\/data"|named docker volume/i.test(sh + fs.readFileSync(path.join(root, "deploy", "deploy.sh"), "utf8")),
   "and the script still records WHY the host path was the wrong one");

fs.rmSync(work, { recursive: true, force: true });

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
