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

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
