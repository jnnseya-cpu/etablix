/**
 * The agent architecture, checked against what can actually be run.
 *
 *   node backend/test/architecture.test.mjs
 *
 * WHY THIS EXISTS. An architecture document can describe agents that do not
 * exist — that is what an architecture is for. A REGISTER cannot, because the
 * portal reads it, employees work from it, and a client may be shown it. The
 * two have now been merged into one file, so the boundary between "described"
 * and "runnable" has to be enforced by something other than good intentions.
 *
 * Four rules, and each has a way of being violated silently:
 *
 *   1. Every agent marked BUILT names a real agent in the register AND has a
 *      brief, so it can be started. An engine slot that names nothing is a
 *      capability claimed and absent.
 *   2. Every agent marked PLANNED has NO brief, so it cannot be started. A
 *      planned agent that turns out to be runnable is worse than either
 *      state, because nobody knows which one it is.
 *   3. Every real agent appears in exactly one engine. Listed twice is
 *      counted twice; listed nowhere is invisible on the map that is supposed
 *      to be the map.
 *   4. Nothing the autonomy table reserves to a human or a competent person
 *      is claimed by any agent.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AI_AGENTS, ENGINES, ORCHESTRATOR, DEPTH_LEVELS, LEVEL_7,
  AUTONOMY, FOUNDATIONS, QUALITY_TARGETS, FAILURE_MODES, LADDER_MAPPING, RISK_CLASSES, organisation,
} from "../lib/organisation.js";
import { AGENT_BRIEFS, PIPELINE_AGENTS } from "../lib/ai.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== the architecture, against what can be run ===\n");

const slots = ENGINES.flatMap((e) => e.agents.map((a) => ({ ...a, engine: e.id })));
const built = slots.filter((s) => s.state === "built");
const planned = slots.filter((s) => s.state === "planned");
const realIds = new Set(AI_AGENTS.map((a) => a.id));

console.log(`--- ${ENGINES.length} engines, ${slots.length} slots: ${built.length} built, ${planned.length} planned\n`);

// --------------------------------------------------- 1. built means runnable
console.log("--- an agent marked BUILT can actually be started\n");
for (const s of built) {
  ok(realIds.has(s.id), `${s.engine}/${s.id} names a real agent in the register`);
  ok(Boolean(AGENT_BRIEFS[s.id]), `${s.engine}/${s.id} has a brief, so it can be run`);
}
ok(built.length === AI_AGENTS.length,
   `every one of the ${AI_AGENTS.length} registered agents is placed in an engine (${built.length} built slots)`);

// -------------------------------------------- 2. planned means NOT runnable
console.log("\n--- an agent marked PLANNED cannot be started\n");
for (const s of planned) {
  ok(!AGENT_BRIEFS[s.id], `${s.engine}/${s.id} has no brief`, s.id);
  ok(!realIds.has(s.id), `and is not in the agent register`, s.id);
  ok(!PIPELINE_AGENTS.has(s.id), `and has no pipeline`, s.id);
}
ok(planned.every((s) => typeof s.state === "string"), "every slot declares a state");
ok(slots.every((s) => s.state === "built" || s.state === "planned"),
   "and there is no third state — a slot is runnable or it is not",
   slots.map((s) => s.state).filter((v, i, a) => a.indexOf(v) === i));

// ------------------------------------------------ 3. placed exactly once
console.log("\n--- placed once, and only once\n");
{
  const ids = slots.map((s) => s.id);
  const twice = ids.filter((v, i) => ids.indexOf(v) !== i);
  ok(twice.length === 0, "no agent appears in two engines", twice.join(", "));
  const missing = [...realIds].filter((id) => !built.some((s) => s.id === id));
  ok(missing.length === 0, "no registered agent is missing from every engine", missing.join(", "));
}

// ----------------------------------------------------- depth is honest
console.log("\n--- the depth claimed is a real level, and an honest one\n");
{
  const levels = new Set(DEPTH_LEVELS.map((d) => d.level));
  ok(DEPTH_LEVELS.length === 7, `seven levels are defined (${DEPTH_LEVELS.length})`);
  for (const s of slots) ok(levels.has(s.depth), `${s.id} claims level ${s.depth}, which exists`);
  const high = built.filter((s) => s.depth >= 5);
  ok(high.length === 0,
     "NO built agent claims level 5 or 6 — autonomy is earned by demonstrated reliability, not asserted in a register",
     high.map((s) => `${s.id}=${s.depth}`).join(", "));
}

// ------------------------------------------------------- level 7 honesty
console.log("\n--- level 7 is not claimed\n");
{
  ok(LEVEL_7.length === 7, `the seven hard properties are listed (${LEVEL_7.length})`);
  for (const p of LEVEL_7) {
    ok(["built", "partial", "absent"].includes(p.state), `${p.id} declares a real state`, p.state);
    ok(Boolean(p.test) && Boolean(p.where), `${p.id} states both its test and where we stand`);
  }
  // The definition of done says a build failing any one property is not
  // level 7. Nothing may describe this system as level 7 while any is unmet.
  const met = LEVEL_7.filter((p) => p.state === "built").length;
  ok(met < 7, `not all seven are met (${met} of 7), so nothing may call this level 7`);
}

// ----------------------------------------- 4. reserved authority is reserved
console.log("\n--- what is reserved to a person stays reserved\n");
{
  const reserved = AUTONOMY.filter((a) => a.autonomy === "human" || a.autonomy === "competent");
  ok(reserved.length >= 7, `${reserved.length} action classes are reserved to a person`);
  for (const r of reserved) {
    ok(/only|follows the site/i.test(r.authority), `"${r.action}" says so in its authority`, r.authority);
  }
  // The boundaries are prose and this is a blunt check, but the words it
  // looks for are the ones that would appear if an agent ever claimed one.
  const claims = AI_AGENTS.filter((a) =>
    /\b(we|it) (approve|certify|award|appoint|commit|pay)\b/i.test(a.boundary || ""));
  ok(claims.length === 0, "no agent's boundary claims an approval, certification, award or payment", claims.map((c) => c.id).join(", "));
  for (const a of AI_AGENTS) {
    ok(Boolean(a.boundary) && a.boundary.length > 40, `${a.id} states a boundary of substance`, a.boundary?.length);
  }
}

// ------------------------------------------------------- the rest is present
console.log("\n--- the supporting structure\n");
{
  ok(FOUNDATIONS.length === 9, `nine foundations (${FOUNDATIONS.length})`);
  for (const f of FOUNDATIONS) {
    ok(["built", "partial", "absent"].includes(f.state), `${f.id} declares a real state`, f.state);
    ok(Boolean(f.where), `${f.id} says where we actually stand, not only what it is`);
  }
  ok(FOUNDATIONS.some((f) => f.state === "absent"),
     "and at least one is honestly marked absent — a register where everything is built is a register nobody checked");
  ok(QUALITY_TARGETS.length >= 10, `${QUALITY_TARGETS.length} quality targets`);
  ok(FAILURE_MODES.length === 10, `ten failure modes (${FAILURE_MODES.length})`);
  ok(FAILURE_MODES.some((f) => !f.avoided), "with the ones not yet avoided marked as such",
     FAILURE_MODES.filter((f) => !f.avoided).length);
  // Checked against the neverDoes list rather than the prose, because the
  // list is the part a reader acts on and the prose is the part that gets
  // rewritten.
  ok(ORCHESTRATOR.neverDoes.some((x) => /replaces the project director/i.test(x)),
     "the orchestrator lists replacing the project director among the things it never does", ORCHESTRATOR.neverDoes);
  ok(ORCHESTRATOR.state === "planned", "and is honestly marked planned rather than described as running", ORCHESTRATOR.state);
}

// -------------------------------- the two ladders disagree, and it is recorded
console.log("\n--- the contradiction between the documents is recorded, not resolved\n");
{
  ok(Boolean(LADDER_MAPPING.conflict), "the conflict between the two autonomy ladders is stated");
  ok(Boolean(LADDER_MAPPING.decisionNeeded), "and the decision it needs is named");
  const disagreeing = LADDER_MAPPING.rows.filter((r) => !r.agree);
  ok(disagreeing.length >= 2, `${disagreeing.length} rows where the ladders differ`);
  ok(disagreeing.every((r) => Boolean(r.note)), "each saying what the difference is");
  ok(LADDER_MAPPING.rows.some((r) => /THE SAME BEHAVIOUR CARRIES A DIFFERENT NUMBER/.test(r.note || "")),
     "including the one that will actually be misread — governed operational autonomy is 6 in one and 7 in the other");

  // The coarse view and the fine view must not drift into meaning different
  // things, which is how a policy engine permits what the register forbids.
  ok(RISK_CLASSES.length === 6, `six risk classes (${RISK_CLASSES.length})`);
  const autonomies = new Set(AUTONOMY.map((a) => a.autonomy));
  for (const rc of RISK_CLASSES) {
    ok(rc.maps.length > 0, `class ${rc.class} maps onto the autonomy table`);
    for (const m of rc.maps) ok(autonomies.has(m), `class ${rc.class} maps to "${m}", which exists in AUTONOMY`);
  }
  const mapped = new Set(RISK_CLASSES.flatMap((r) => r.maps));
  const unmapped = [...autonomies].filter((a) => !mapped.has(a));
  ok(unmapped.length === 0, "and every autonomy value is covered by a class", unmapped.join(", "));
  ok(RISK_CLASSES.find((r) => r.class === "E").maps.includes("human"), "commercial commitment maps to human only");
  ok(RISK_CLASSES.find((r) => r.class === "F").maps.includes("competent"), "and safety acceptance to a competent person only");
}

// -------------------------------------------------- it reaches the portal
console.log("\n--- and it reaches the portal as one structure\n");
{
  const o = organisation();
  for (const key of ["engines", "depthLevels", "levelSeven", "ladderMapping", "riskClasses", "autonomy", "foundations", "qualityTargets", "failureModes", "orchestrator"]) {
    ok(key in o, `organisation() carries ${key}`);
  }
  // NOTHING WAS REMOVED. The merge was additive, and this is the check that
  // keeps it that way: the keys the desk already read must still be there.
  for (const key of ["principle", "leanCore", "fractional", "contractFunded", "agents", "aiMatrix", "separation", "deliveryModelLimits", "hiringSequence", "appointmentTests", "operatingPrinciple", "matureOrg", "positions"]) {
    ok(key in o, `and still carries the original ${key}`);
  }
}

// --------------------------------------------------- the documents exist
console.log("\n--- the governing documents\n");
{
  for (const f of ["business/platform/AGENT-ARCHITECTURE.md", "business/platform/L7-ITT-BID-ENGINE-SPEC.md"]) {
    ok(fs.existsSync(path.join(root, f)), `${f} is in the repository`);
  }
  const spec = fs.readFileSync(path.join(root, "business/platform/L7-ITT-BID-ENGINE-SPEC.md"), "utf8");
  ok(/# Reconciliation/.test(spec),
     "the specification carries its reconciliation against what runs today — merged without it, it would read as a claim");
  ok(/This is a build, not an evolution/.test(spec), "and says plainly that it is a different platform");
  const arch = fs.readFileSync(path.join(root, "business/platform/AGENT-ARCHITECTURE.md"), "utf8");
  // Whitespace-insensitive: the document is hard-wrapped, and an assertion
  // that breaks when a paragraph is re-flowed is an assertion about
  // formatting rather than about content.
  const flat = arch.replace(/\s+/g, " ");
  ok(/competent humans exercise project authority/.test(flat), "and the architecture ends where it must");
  ok(/AI agents perform the project-control labour/.test(flat), "with the division of labour stated in the same sentence");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
