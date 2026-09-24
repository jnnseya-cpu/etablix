/**
 * No ETABLIX surface names the AI vendor or the model.
 *
 *   node backend/test/vendor-silence.test.mjs
 *
 * WHY. Which engine runs the work is a supplier relationship. A client who
 * reads it on a deliverable has been handed the one question that unwinds the
 * sale — "why would we pay you when we could use that ourselves?" — and the
 * answer, that the value is in the requirement and the specification rather
 * than the generation, is much harder to make after the question than before
 * it. It is also just not their business, any more than which spreadsheet a
 * quantity surveyor uses.
 *
 * The system is going to produce priced deliverables from project
 * requirements: rates, market prices, valuations. Those go to clients. So the
 * rule cannot live in a person's memory — it has to fail a build.
 *
 * WHAT IS ALLOWED, AND WHY EACH ONE IS DIFFERENT.
 *
 *  - robots.txt names crawlers (ClaudeBot, GPTBot, anthropic-ai). Those are
 *    directives TO a named machine. Renaming them would stop them working.
 *  - lib/reach.js names crawlers for the visibility page (Anthropic Claude,
 *    OpenAI GPTBot). Those label a VISITOR, not our engine. Renaming them
 *    would make the analytics untrue.
 *  - The administrator's own configuration block says Anthropic and
 *    console.anthropic.com, because an administrator cannot obtain a key
 *    without knowing where to get one. It is behind an admin check and it is
 *    the one place the name has a job to do.
 *  - Internal engineering files — routing tables, cost tables, tests, specs,
 *    deploy notes — name models because that is what they configure. They are
 *    not surfaces.
 *
 * Everything else is a surface, and on a surface the vendor has no name.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "\n      → " + String(x).slice(0, 500) : ""))); };

console.log("\n=== the vendor has no name on any surface ===\n");

/* Anything that identifies the supplier or a specific model. Deliberately
   broad: a future model called something else still must not appear, so the
   test matches the shapes these identifiers take, not a fixed list. */
const VENDOR = /\b(anthropic|claude|openai|chatgpt|gpt-[0-9o]|gemini|llama|mistral|bedrock|vertex ai)\b/i;

/* Lines that are allowed to contain one, with the reason. Each is a surface
   exception that has been thought about, not a convenience. */
const ALLOWED = [
  /user-agent:/i,                                   // robots.txt directives
  /crawler|bot\b|spider|scraper/i,                  // naming a visitor, not our engine
  /console\.anthropic\.com|sk-ant-/,                // the administrator's own key setup
  /Paste Anthropic API key/,                        // same block, same reason
  /claude-0|node_modules|require\(/,                // build-time paths, never rendered
];

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (/^(node_modules|\.git|\.claude)$/.test(e.name)) continue;
    const full = path.join(dir, e.name);
    e.isDirectory() ? walk(full, out) : out.push(full);
  }
  return out;
};

const scan = (files, label) => {
  const offences = [];
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
    text.split("\n").forEach((line, i) => {
      if (!VENDOR.test(line)) return;
      if (ALLOWED.some((a) => a.test(line))) return;
      offences.push(`${path.relative(root, f)}:${i + 1}  ${line.trim().slice(0, 140)}`);
    });
  }
  ok(offences.length === 0, label, offences.join("\n      "));
  return offences.length;
};

// --- 1. the public website: anyone at all can read it
console.log("--- the public website\n");
scan(walk(path.join(root, "frontend", "public")).filter((f) => /\.(html|js|css|txt|json|xml)$/.test(f)),
     "nothing on the public site names the vendor");

// --- 2. what a client is sent or shown
console.log("\n--- client deliverables and the client portal\n");
scan([path.join(root, "backend", "routes", "docs.js"),
      path.join(root, "backend", "routes", "clients.js"),
      path.join(root, "backend", "lib", "documents.js")].filter(fs.existsSync),
     "no document or portal route puts the vendor into what a client receives");

/* business/platform/ is internal engineering documentation — architecture
   specifications and provider tables, the same category as lib/l7/routing.js.
   It names providers because naming them is what an architecture specification
   is for, and blanking them would make it useless for its actual job.
   
   IT IS NOT A DELIVERABLE, AND THAT IS THE WHOLE BASIS OF THE EXCLUSION. If
   any of it is ever issued to a client — and "ITT Bid Engine Specification"
   is exactly the kind of title that gets forwarded — the provider rows come
   out first. The assertion below is what makes that a decision rather than an
   accident: it holds the excluded set to one named directory, so a new file
   cannot quietly inherit the exemption. */
const INTERNAL_ENGINEERING = path.join(root, "business", "platform");
const builders = walk(path.join(root, "business"))
  .filter((f) => /\.(cjs|js|md|html)$/.test(f))
  .filter((f) => !f.startsWith(INTERNAL_ENGINEERING));
scan(builders, "no document builder or business document outside business/platform names the vendor");

{
  /* Prove the exclusion is narrow, and say out loud what is inside it. */
  const inside = walk(INTERNAL_ENGINEERING)
    .filter((f) => /\.(cjs|js|md|html)$/.test(f))
    .filter((f) => VENDOR.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(root, f));
  ok(inside.length <= 1,
     `the exemption covers at most one internal engineering file — currently ${inside.length}: ${inside.join(", ") || "none"}`,
     inside.join("\n      "));
  ok(inside.every((f) => f.startsWith("business/platform/")),
     "and everything claiming it is inside business/platform");
}

// --- 3. the engine's own report text: what the agents are told to produce
console.log("\n--- what the agents are instructed to write\n");
const briefs = [path.join(root, "backend", "lib", "ai.js"),
                path.join(root, "backend", "lib", "diagnostic.js")].filter(fs.existsSync);
{
  // Prompt and legal text only — the configuration and the SDK calls in these
  // files legitimately name the client library.
  const offences = [];
  for (const f of briefs) {
    fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      if (!/description:|legal:|system:|brief:|"\s*You are\b/.test(line)) return;
      if (!VENDOR.test(line)) return;
      offences.push(`${path.relative(root, f)}:${i + 1}  ${line.trim().slice(0, 140)}`);
    });
  }
  ok(offences.length === 0, "no agent brief or legal statement names the vendor", offences.join("\n      "));
}

// --- 4. the leak that started this: the model identifier on a portal screen
console.log("\n--- the portal screen\n");
const commercial = fs.readFileSync(path.join(root, "frontend", "internal", "js", "commercial.js"), "utf8");
ok(!/pill\(`CONNECTED · \$\{provider\.model\}`/.test(commercial),
   "the status pill does not print the model identifier — it did, and every internal user could read it");
ok(/pill\("CONNECTED", "approved"\)/.test(commercial),
   "it prints a plain CONNECTED instead");

const ai = fs.readFileSync(path.join(root, "backend", "lib", "ai.js"), "utf8");
ok(/publicProvider\(\{ admin = false \} = \{\}\)/.test(ai),
   "publicProvider takes an administrator flag rather than telling everyone");
ok(/if \(!admin\) return view;/.test(ai),
   "and withholds the model and the key preview from everyone else");
ok(!/^\s*model: p\.model,\s*$/m.test(ai.split("if (!admin) return view;")[0]),
   "the model is not in the object returned before that check — withheld at the server, not hidden in the page");

const agents = fs.readFileSync(path.join(root, "backend", "routes", "agents.js"), "utf8");
ok(/publicProvider\(\{ admin: req\.user\?\.role === ROLES\.ADMIN \}\)/.test(agents),
   "the read route passes the caller's actual role");
ok((agents.match(/publicProvider\(\{ admin: true \}\)/g) || []).length === 2,
   "and the two administrator-gated routes still return the model, so saving it does not blank the field");

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
