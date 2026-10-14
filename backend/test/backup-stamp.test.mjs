/**
 * The backup stamp's units.
 *
 *   node backend/test/backup-stamp.test.mjs
 *
 * WHY THIS EXISTS. The live platform alerted:
 *
 *   "The last recorded backup was 497272 hours ago. Nightly backups are
 *    not running."
 *
 * Backups were running. 497272 hours is fifty-seven years, which is not a
 * gap — it is the epoch. deploy/backup.sh writes its stamp with `date +%s`,
 * so the file holds SECONDS, and the watch subtracted it from Date.now(),
 * which is MILLISECONDS. The arithmetic was Date.now() minus Date.now()/1000
 * and the answer was always "about fifty-seven years".
 *
 * That is the worst class of monitoring fault. It fires every twelve hours,
 * it is always wrong, and the operator learns to dismiss the one alert that
 * will one night be right.
 *
 * Reading either file catches nothing: the script is correct, the watch is
 * correct, and the units between them are not. So this asserts on the seam —
 * a stamp in seconds reads as a recent backup, a stamp in milliseconds still
 * reads correctly, and a stamp from a skewed clock is refused rather than
 * trusted into silence.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const work = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-stamp-"));
process.env.ETABLIX_DATA_DIR = work;
const { lastBackupAt } = await import("../lib/automation.js");

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) { pass++; console.log(`  ok    ${what}`); } else { fail++; console.log(`  FAIL  ${what}`); } };
const stamp = (v) => fs.writeFileSync(path.join(work, "last-backup"), String(v));
const HOUR = 3600000;
const hoursAgo = (ms) => (Date.now() - ms) / HOUR;

console.log("\n=== the backup stamp, in both units ===\n");

// The unit the script actually writes. This is the regression.
const nowSec = Math.floor(Date.now() / 1000);
stamp(nowSec);
let last = lastBackupAt();
ok(last !== null, "a seconds stamp is read, not discarded");
ok(hoursAgo(last) < 1, `and reads as a backup from under an hour ago, not fifty-seven years (${hoursAgo(last).toFixed(2)}h)`);
ok(hoursAgo(last) < 36, "so it does not trip the 36-hour alert");

// `date +%s` four hours ago must read as four hours, not as the epoch.
stamp(nowSec - 4 * 3600);
ok(Math.abs(hoursAgo(lastBackupAt()) - 4) < 0.1, "a stamp four hours old reads as four hours old");

// A genuinely stale backup must STILL alert. Fixing the false positive
// must not have bought silence.
stamp(nowSec - 48 * 3600);
ok(hoursAgo(lastBackupAt()) > 36, "a stamp two days old still trips the 36-hour alert");

// Milliseconds, in case anything ever writes them.
stamp(Date.now());
ok(hoursAgo(lastBackupAt()) < 1, "a millisecond stamp is left alone and still reads as recent");

// No stamp, empty stamp, garbage: all "never recorded", which alerts.
fs.rmSync(path.join(work, "last-backup"));
ok(lastBackupAt() === null, "a missing stamp is null, so the watch says no backup has ever been recorded");
stamp("");
ok(lastBackupAt() === null, "an empty stamp is null rather than 1970");
stamp("not a date");
ok(lastBackupAt() === null, "a garbage stamp is null rather than NaN");
stamp(0);
ok(lastBackupAt() === null, "a zero stamp is null rather than the epoch");

// A clock-skewed stamp must not silence the watch for the length of the skew.
stamp(nowSec + 7 * 24 * 3600);
ok(lastBackupAt() === null, "a stamp a week in the future is refused, not treated as a fresh backup");

console.log("\n--- and the script still writes the unit this test assumes\n");
const sh = fs.readFileSync(path.resolve("deploy/backup.sh"), "utf8");
ok(/date \+%s > \S*last-backup/.test(sh), "deploy/backup.sh writes the stamp as seconds with date +%s");

fs.rmSync(work, { recursive: true, force: true });
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
