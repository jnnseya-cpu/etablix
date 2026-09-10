/**
 * The deploy defaults, and the documentation that describes them.
 *
 *   node backend/test/deploy.test.mjs
 *
 * WHY A TEST FOR A SHELL DEFAULT. Auto-deploy was off unless somebody set a
 * variable, and pointed at staging even then, so four commits sat on the
 * branch and nothing reached the live site. Nothing failed. Nothing was
 * logged. The only symptom was a person looking at their own website and not
 * seeing their own work.
 *
 * A default nothing checks is a default that drifts, and the second failure —
 * a RUNBOOK still confidently describing the opposite of what the script does —
 * is worse than the first, because it sends whoever is debugging in the wrong
 * direction. Both are checked here.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== deploy defaults ===\n");

const auto = read("deploy/autodeploy.sh");
const deploy = read("deploy/deploy.sh");
const runbook = read("deploy/RUNBOOK.md");

// --- the two defaults that decide whether a push reaches anybody
console.log("--- on, and pointed at live\n");
ok(/ENABLED=\$\{ETABLIX_AUTODEPLOY:-1\}/.test(auto),
   "auto-deploy is ON unless somebody deliberately sets ETABLIX_AUTODEPLOY=0");
ok(/TARGET=\$\{ETABLIX_AUTODEPLOY_TARGET:-live\}/.test(auto),
   "and pointed at LIVE unless somebody deliberately points it elsewhere");
ok(/case "\$TARGET" in[\s\S]*?staging\)[\s\S]*?staging\.sh[\s\S]*?\*\)[\s\S]*?deploy\.sh/.test(auto),
   "anything that is not the word staging runs the live deploy — the fallback is the safe-to-be-wrong way round");
ok(/\[ "\$ENABLED" = "0" \] && exit 0/.test(auto),
   "only the exact string 0 turns it off, so a typo in the env file cannot silently disable it");

// --- the escape hatch survives
console.log("\n--- and still stoppable\n");
ok(/\[ -f "\$PAUSE" \] && exit 0/.test(auto), "the pause file still stops everything, before any other decision");
ok(/pause-deploy/.test(auto) && /pause-deploy/.test(deploy), "and both scripts honour it");

// --- the protections that make live safe to aim at
console.log("\n--- what makes live safe to aim at\n");
ok(/\[ "\$LOCAL" = "\$TARGET" \][\s\S]{0,80}exit 0/.test(deploy),
   "a tick with nothing new exits without rebuilding, so cron cannot recreate a container under somebody");
ok(/an agent run is in progress — deferring/.test(deploy),
   "a run in flight defers the deploy rather than being destroyed by it");
ok(/REFUSING TO DEPLOY: the new build did not report healthy/.test(deploy),
   "a candidate that does not answer is refused and the live container is never touched");
ok(/etablix-previous-image/.test(deploy), "and the previous image is recorded, so rollback is one command");

// --- the status command, because "is it on?" should not need reading a script
console.log("\n--- answering the question without reading the script\n");
ok(/--status/.test(auto), "autodeploy.sh --status exists");
ok(/cron:\s+NOT INSTALLED/.test(auto),
   "and it says plainly when cron is missing — the script alone deploys nothing");
ok(/paused:\s+YES/.test(auto), "and when a pause file is holding everything");

// --- the documentation must not say the opposite of the code
console.log("\n--- the runbook agrees with the script\n");
{
  const contradictions = [
    [/Auto-deploy is \*\*off by default\*\*/, "still says auto-deploy is off by default"],
    [/\*\*Live is never auto-deployed\*\*/, "still says live is never auto-deployed"],
    [/pointed at staging/i, "still says it points at staging"],
    [/production deploys are a decision/, "still says production is a manual decision"],
  ];
  for (const [re, why] of contradictions) {
    ok(!re.test(runbook), `the runbook no longer ${why}`);
  }
  ok(/A push deploys itself to live/.test(runbook), "and says what actually happens instead");
  ok(/etc\/cron\.d\/etablix-autodeploy/.test(runbook), "with the cron line to install, because that is the part that does the work");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
