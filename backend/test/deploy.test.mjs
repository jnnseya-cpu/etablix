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
// The one line of output that would have shown the last live-deploy failure
// and did not: it printed "target: staging" as though that were unremarkable.
ok(/the live site will NEVER be deployed by cron/.test(auto),
   "and it shouts when the target is staging, because that means the live site never moves");
ok(/ETABLIX_AUTODEPLOY_TARGET in \/etc\/default\/etablix/.test(auto),
   "naming the file that almost always caused it");
ok(/sed -i '\/\^ETABLIX_AUTODEPLOY_TARGET=\/d' \/etc\/default\/etablix/.test(auto),
   "and the one command that fixes it");

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

// --- every command the runbook tells somebody to type must exist
console.log("\n--- the runbook's commands actually exist\n");
{
  // The direct cause of a whole night with nothing live: the runbook said
  // "cd /opt/etablix && ./deploy.sh" when the file is at deploy/deploy.sh.
  // The first command anybody types failed, and the message — "No such file
  // or directory" — told them nothing about where the file actually was.
  const docs = ["deploy/RUNBOOK.md", "deploy/GO-LIVE-RUNBOOK.md", "deploy/README.md"]
    .filter((f) => fs.existsSync(path.join(root, f)));
  const missing = [];
  for (const doc of docs) {
    const text = read(doc);
    for (const m of text.matchAll(/\.\/([\w./-]+\.sh)/g)) {
      const rel = m[1];
      if (!fs.existsSync(path.join(root, rel))) missing.push(`${doc}: ./${rel}`);
    }
  }
  ok(missing.length === 0, `every ./script.sh named in the runbooks exists at that path`, missing.join(" | "));
  ok(/cd \/opt\/etablix && \.\/deploy\/deploy\.sh/.test(read("deploy/RUNBOOK.md")),
     "and the deploy command names the real path");
}

// --- the dispatcher must find its siblings wherever it is run from
console.log("\n--- auto-deploy finds the other scripts\n");
{
  // A copy placed at /opt looked for /opt/deploy.sh and /opt/staging.sh —
  // paths that exist nowhere — and failed naming a location that appears
  // nowhere in this repository.
  ok(!/\$HERE\/(deploy|staging)\.sh/.test(auto),
     "it does not assume its siblings sit next to wherever it was copied");
  ok(/REPO=\$\{ETABLIX_REPO:-\/opt\/etablix\}/.test(auto) && /\$REPO\/deploy\/deploy\.sh/.test(auto),
     "it locates the repository explicitly");
  ok(/BESIDE=/.test(auto) && /\$BESIDE\/deploy\.sh/.test(auto),
     "and falls back to looking beside itself, for a checkout somewhere else");
  ok(/no deploy\.sh found under/.test(auto),
     "and when it finds neither it says so, naming both places it looked");
  ok(/Set ETABLIX_REPO/.test(auto), "with the one setting that fixes it");
}

// --- cron must point at the repository, not at a copy
console.log("\n--- cron points at the repository\n");
{
  const cronLine = /\/opt\/etablix\/deploy\/autodeploy\.sh' > \/etc\/cron\.d\/etablix-autodeploy/;
  ok(cronLine.test(auto), "the install line in the script runs it where it lives");
  ok(cronLine.test(runbook), "and so does the one in the runbook");
  ok(!/cp deploy\/autodeploy\.sh \/opt\/etablix-autodeploy\.sh/.test(auto) &&
     !/cp deploy\/autodeploy\.sh \/opt\/etablix-autodeploy\.sh/.test(runbook),
     "neither still tells anybody to copy it to /opt, where it goes stale");
  ok(/WARNING: it runs a COPY at \/opt/.test(auto),
     "and --status warns when an existing cron entry is still running the stale copy");
}


/* ----------------------------------------- the image copies what the app reads */
//
// THIS CHECK EXISTS BECAUSE THE CONTAINER COULD NOT BOOT.
//
// The Dockerfile copied backend, frontend and shared. backend/lib/blog.js
// reads content/blog at module scope, so `docker run` died with ENOENT on
// scandir before it bound a port — an image that builds cleanly and cannot
// start. Nothing caught it: the Render route runs npm ci against the whole
// repository checkout, so content/ was always present there, and the
// container route is the one nobody had tried since the blog was added.
//
// So the rule is checked rather than remembered: every directory the
// application reads from the repository root has to be in the image.

/**
 * A FLOATING BASE TAG ONLY FLOATS IF THE BUILD PULLS IT.
 *
 * The Dockerfile says FROM node:22-alpine, which tracks the newest 22.x, so a
 * Node security release is supposed to reach this image without anybody
 * editing a version number. It did not. `docker build` without --pull reuses
 * the cached base layer, so the container was still running 22.22.2 the day
 * after Node shipped 22.23.4 — a fix for an out-of-bounds write in the Brotli
 * decoder that can lead to remote code execution (CVE-2026-111497).
 *
 * That CVE is not abstract here. The signals watcher fetches fifteen external
 * sites and Node's fetch advertises accept-encoding: br, so the decoder is fed
 * data this business does not control, from hosts it does not own.
 *
 * Checked rather than remembered, because the failure is silent: the deploy
 * succeeds, the health check passes, and the runtime is simply old.
 */
console.log("\n--- a deploy fetches the base image, so a runtime fix arrives\n");
{
  for (const f of ["deploy.sh", "staging.sh"]) {
    const sh = fs.readFileSync(path.join(root, "deploy", f), "utf8");
    const builds = [...sh.matchAll(/docker build[^\n]*/g)].map((m) => m[0]);
    ok(builds.length > 0, `${f} builds an image`);
    for (const b of builds) {
      ok(/\s--pull\b/.test(b),
         `  ${f} pulls the base image, so a Node security release reaches the container`,
         b.slice(0, 80));
    }
  }

  // And the floor is written down where a build can act on it.
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const floor = String((pkg.engines || {}).node || "");
  ok(/^>=\s*22\./.test(floor), "package.json requires the Node 22 line", floor);
  const [, minor] = (/^>=\s*22\.(\d+)/.exec(floor) || []);
  ok(Number(minor) >= 23,
     "  at or above 22.23, the line that carries the October 2026 security fixes", floor);
}

/**
 * THE FOUR THINGS THAT CAN ONLY BE ANSWERED ON THE SERVER, AS ONE COMMAND.
 *
 * Each came out of an audit and each ended the same way: "run this on the
 * server and tell me what it says." The one that mattered most — whether the
 * seeded demo administrator is live in production — went unanswered through
 * three rounds of asking. A check nobody runs is not a control, so it runs
 * after every deploy whether or not anybody asks.
 */
console.log("\n--- the launch checks run themselves\n");
{
  const tool = path.join(root, "backend", "tools", "launch-checks.mjs");
  ok(fs.existsSync(tool), "the launch checks exist as one tool");
  const src = fs.readFileSync(tool, "utf8");

  for (const [what, re] of [
    ["the seeded demo accounts", /admin@etablix\.com/],
    ["the Node security floor", /MIN_NODE/],
    ["credentials encrypted at rest", /ETABLIX_TOKEN_SECRET/],
    ["a withdrawn article answering 410", /410/],
  ]) ok(re.test(src), `  it checks ${what}`);

  ok(/process\.exit\(failed\.length \? 1 : 0\)/.test(src),
     "  and exits non-zero on failure, so a script can act on it");
  // It must never print the thing it is checking for.
  ok(!/etablix-admin-2026|etablix-pm-2026|etablix-qa-2026/.test(src),
     "  and no password appears in the tool itself");

  const deploySh = fs.readFileSync(path.join(root, "deploy", "deploy.sh"), "utf8");
  ok(/launch-checks\.mjs/.test(deploySh), "a deploy runs them without being asked");
  ok(/LAUNCH CHECKS FAILED/.test(deploySh), "  and says so loudly when one fails");
  // A failing check is a finding about data or configuration. Rolling back to
  // the previous image fixes none of them and would undo a good deploy.
  const fnBody = (/launch_checks\(\) \{[\s\S]*?\n\}/.exec(deploySh) || [""])[0];
  ok(fnBody.length > 0, "  the launch-check step is a function of its own");
  ok(!/rollback|docker (stop|rm)|exit 1/.test(fnBody),
     "  which never rolls back or stops the container, because the build is not what failed", fnBody.slice(0, 120));

  const update = fs.readFileSync(path.join(root, "deploy", "update.sh"), "utf8");
  ok(/launch-checks\.mjs/.test(update), "the one operator command runs them too");

  /**
   * AND AUTOMATIC DEPLOY IS INSTALLED RATHER THAN ASSUMED. The cron entry has
   * been wrong twice — once a stale copy under /opt, once another project's
   * checkout entirely — and on both occasions nothing deployed and nothing
   * said so.
   */
  ok(/etablix-autodeploy/.test(update), "update.sh checks the auto-deploy cron entry");
  ok(/NOT INSTALLED/.test(update) && /POINTED ELSEWHERE/.test(update),
     "  and distinguishes missing from pointing at the wrong checkout");
  ok(/\$REPO\/deploy\/autodeploy\.sh/.test(update),
     "  pointing it at this checkout, which a deploy keeps current");
}

console.log("\n--- the container image copies every directory the application reads\n");
{
  const docker = fs.readFileSync(path.join(root, "Dockerfile"), "utf8");
  const copied = new Set(
    [...docker.matchAll(/^COPY\s+([^\s]+)\s/gm)].map((m) => m[1].replace(/^\.\//, "").split("/")[0])
  );

  // What the application actually reads, found by reading it rather than by
  // keeping a list in step with it.
  const sources = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "test" && e.name !== "data") walk(full); continue; }
      if (/\.(js|mjs)$/.test(e.name)) sources.push(full);
    }
  };
  walk(path.join(root, "backend"));
  ok(sources.length > 50, `${sources.length} application source files scanned`);

  const needed = new Set();
  for (const f of sources) {
    const text = fs.readFileSync(f, "utf8");
    for (const m of text.matchAll(/path\.join\(\s*root\s*,\s*"([^"]+)"/g)) needed.add(m[1]);
  }
  ok(needed.size > 0, `the application reads ${needed.size} path(s) from the repository root`, [...needed].join(", "));

  const missing = [...needed].filter((d) => !copied.has(d));
  ok(missing.length === 0,
     `every root path the application reads is COPYed into the image (${[...needed].sort().join(", ")})`,
     `NOT COPIED: ${missing.join(", ")} — the image would build and then fail to start`);

  ok(copied.has("content"),
     "content/ specifically, because the blog reads it at startup and a missing directory stopped the server rather than emptying the blog");
}

console.log("\n--- and a missing content directory no longer kills the server\n");
{
  const blog = fs.readFileSync(path.join(root, "backend", "lib", "blog.js"), "utf8");
  ok(!/^const CATALOGUE = fs\s*\n\s*\.readdirSync/m.test(blog),
     "the post directory is not read by a bare readdirSync at module scope");
  ok(/ENOENT/.test(blog), "a missing directory is handled by code rather than by hoping");
  ok(/the site runs; the blog is empty/i.test(blog) || /The site runs; the blog is empty/.test(blog),
     "and the message says what the consequence is");
}


/* ------------------------------------- the blueprint agrees with the code */
//
// The blueprint told you to fill in the admin credentials AFTER the first
// deploy. The preflight added later refuses to start without them. So the
// documented order produced a boot loop that looks like a broken build —
// two correct things that contradict each other, which is the failure this
// repository keeps finding in its own runbooks.

console.log("\n--- the deploy instructions agree with what the server does\n");
{
  const render = fs.readFileSync(path.join(root, "render.yaml"), "utf8");
  const preflight = fs.readFileSync(path.join(root, "backend", "lib", "preflight.js"), "utf8");

  ok(/NODE_ENV[\s\S]{0,40}production/.test(render), "the blueprint sets NODE_ENV=production");
  ok(/ETABLIX_ADMIN_EMAIL/.test(render) && /ETABLIX_ADMIN_PASSWORD/.test(render),
     "and declares the admin credentials");
  ok(/NODE_ENV === "production"|production &&/.test(preflight) && /ETABLIX_ADMIN_EMAIL/.test(preflight),
     "the preflight refuses production without them");
  ok(!/After the first deploy, fill in/.test(render),
     "so the blueprint no longer says to fill them in AFTER deploying — that order is a boot loop");
  ok(/BEFORE it builds|not "do it afterwards"/.test(render),
     "it says to set them before the build instead", render.split("\n").slice(0, 12).join(" ").slice(0, 160));
  ok(/does not come up at all/.test(render),
     "and warns that a blank deploy fails to start rather than starting degraded");

  // The go-live card is the VPS route, because that is what this deploys to.
  // render.yaml is a documented alternative that is not in use, and the card
  // says so — a card describing the wrong host is worse than no card.
  const golive = fs.readFileSync(path.join(root, "deploy", "GO-LIVE.md"), "utf8");
  ok(/Hostinger|VPS/.test(golive), "the go-live card is written for the host this actually deploys to");
  ok(/it is not what you use/.test(golive), "and says plainly that render.yaml is not the route in use");
  ok(/12 characters/.test(golive) && /12/.test(preflight),
     "the card and the preflight name the same minimum password length");
  ok(/REFUSING TO START/.test(golive) && /REFUSING TO START/.test(preflight),
     "and the card quotes the exact string the log will show, so it can be searched for");
  ok(/REFUSING TO DEPLOY/.test(golive) && /REFUSING TO DEPLOY/.test(fs.readFileSync(path.join(root, "deploy", "deploy.sh"), "utf8")),
     "and the string the deploy script prints when it refuses to swap");
  ok(/autodeploy\.sh/.test(golive), "it names the cron dispatcher, which is how a push reaches the site");
}


/* ------------------------------- the up-to-date check, against the right thing */
//
// THE TRAP THAT CLOSES. deploy.sh compared the git working copy against
// origin and exited 0 when they matched. Step 1 does `git reset --hard` to
// the target BEFORE the build, so any run that got that far and then stopped
// — a failed build, a candidate that would not answer, an interrupted
// deploy, or somebody running `git pull` by hand — left the checkout on the
// new commit and the container on the old one.
//
// From then on the check is permanently true. Every five-minute tick exits
// immediately having done nothing, and never warns, because from its own
// point of view there is nothing to do. The live site served a commit from
// 10 September while the checkout sat 36 commits ahead of it.

console.log("\n--- the deploy compares what is SERVING, not what is checked out\n");
{
  const sh = fs.readFileSync(path.join(root, "deploy", "deploy.sh"), "utf8");

  ok(!/^LOCAL=\$\(git rev-parse HEAD\)/m.test(sh),
     "the working-copy comparison is gone — it is the one that gets stuck");
  // Only the live code counts. The old comparison is quoted inside the
  // explanatory comment on purpose, so the next person can see what was
  // wrong rather than reading that something was.
  const live = sh.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  ok(!/if \[ "\$LOCAL" = "\$TARGET" \]/.test(live),
     "and so is the branch that exited on it");
  ok(/LOCAL=\$\(git rev-parse HEAD\)/.test(sh) && !/LOCAL=\$\(git rev-parse HEAD\)/.test(live),
     "the old check survives only as a quoted comment, so the trap is documented rather than forgotten");

  ok(/api\/health/.test(sh) && /"build":"/.test(sh),
     "the check reads the running container's build from /api/health");
  ok(/RUNNING=/.test(sh), "into a variable named for what it is");
  ok(/\[ "\$RUNNING" = "\$TARGET_SHORT" \]/.test(sh),
     "and compares that against the target commit");

  // Nothing serving must mean deploy, not skip. The opposite default would
  // leave a dead site dead.
  ok(/if \[ -z "\$RUNNING" \]/.test(sh) && /no running container answered/.test(sh),
     "a container that does not answer causes a deploy rather than an exit");

  ok(/FORCE:-0/.test(sh), "FORCE=1 still overrides, which is the manual way out of any wedge");

  // The claim autodeploy.sh has always made about this check.
  const auto = fs.readFileSync(path.join(root, "deploy", "autodeploy.sh"), "utf8");
  // The comment wraps across lines, so compare on collapsed whitespace.
  const autoFlat = auto.replace(/\s*\n\s*#?\s*/g, " ");
  ok(/running container is already on that commit/.test(autoFlat),
     "autodeploy.sh describes this check as being about the running container");
  ok(/RUNNING=/.test(sh),
     "and deploy.sh now actually does that, rather than describing it");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
