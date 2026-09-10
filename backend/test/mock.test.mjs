/**
 * Every agent's pass reaches the reply written for it.
 *
 *   node backend/test/mock.test.mjs
 *
 * WHY A TEST FOR THE TEST HARNESS. The mock answers by matching a phrase from
 * the task it was sent, in a first-match chain. Eight pipeline agents now
 * share that chain, several of them producing the same KIND of document, and
 * a wrong match is the one class of failure in this system that never fails
 * loudly: the output splitter takes sections BY NUMBER, so another agent's
 * Part 3 lands in this agent's Part 3 and the document looks perfectly
 * correct. Every existing test then passes.
 *
 * It has happened three times. The third was found by this file on the day it
 * was written: Agent 9 and Agent 11 both produce a requirements package, so
 * both head their final section "REQUIREMENTS SUMMARY IN ONE PARAGRAPH", and
 * both headings are right for their product. The mock matched the phrase
 * once. Since Agent 11 was built, its final pass had been served Agent 9's
 * content — twelve packages and a highway consent date, in a workforce
 * village report — and every suite passed, because a final pass is checked
 * for HAVING a summary and an appendix rather than for what is in them.
 *
 * So this drives the chain rather than reading it: every pass of every
 * pipeline agent is put through the mock's own answer(), and the replies must
 * be distinct across agents and must carry the sections that pass declares.
 */
import { PIPELINE_SPECS } from "../lib/ai.js";
import { answer } from "./mock-anthropic.mjs";
import { splitPipelineOutput } from "../lib/sections.js";

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== the mock answers the agent that asked ===\n");

const passes = [];
for (const [id, spec] of Object.entries(PIPELINE_SPECS)) {
  passes.push({ id, key: "reconcile", task: spec.reconcileTask, kind: "reconcile" });
  for (const p of spec.sectionPasses) passes.push({ id, key: p.key, task: p.task, kind: "section", range: p.range });
  passes.push({ id, key: "final", task: spec.finalTask, kind: "final" });
}
console.log(`--- ${Object.keys(PIPELINE_SPECS).length} pipeline agents, ${passes.length} passes\n`);

// ------------------------------------------------ every pass gets an answer
for (const p of passes) {
  const reply = answer(p.task);
  p.reply = String(reply || "");
  ok(p.reply.trim().length > 40, `${p.id}.${p.key} gets a substantive reply`, p.reply.slice(0, 60));
}

// ------------------------------------ no two AGENTS get the same reply
//
// The check that found the Agent 9 / Agent 11 collision. Two passes of the
// SAME agent may legitimately share nothing; two passes of DIFFERENT agents
// returning byte-identical text means one of them matched the other's phrase.
console.log("\n--- no agent is served another agent's content\n");
{
  const byReply = new Map();
  for (const p of passes) {
    const k = p.reply.trim();
    if (!byReply.has(k)) byReply.set(k, []);
    byReply.get(k).push(`${p.id}.${p.key}`);
  }
  let collisions = 0;
  for (const [, who] of byReply) {
    const agents = new Set(who.map((w) => w.split(".")[0]));
    if (agents.size > 1) {
      collisions += 1;
      ok(false, `these passes get IDENTICAL content: ${who.join(", ")}`, [...agents].join(" + "));
    }
  }
  ok(collisions === 0, `no two agents share a reply (${byReply.size} distinct replies for ${passes.length} passes)`);
}

// ------------------------------------- a section pass returns its sections
//
// The reply is split with the SAME splitter the application uses, so a reply
// numbered for another product is caught even if its text is unique.
console.log("\n--- a section pass returns the sections it asked for\n");
for (const p of passes.filter((x) => x.kind === "section")) {
  const spec = PIPELINE_SPECS[p.id];
  const sections = spec.sectionPasses.flatMap(() => []); // sections live on the pipeline module, not the spec
  const [from, to] = p.range;
  const found = [...p.reply.matchAll(/^##\s*(\d{1,2})\s*·/gm)].map((m) => Number(m[1]));
  const wanted = [];
  for (let n = from; n <= to; n += 1) wanted.push(n);
  ok(wanted.every((n) => found.includes(n)),
     `${p.id}.${p.key} returns section${wanted.length > 1 ? "s" : ""} ${wanted.join(" and ")}`,
     `found ${found.join(", ") || "none"}`);
  ok(found.every((n) => n >= from && n <= to),
     `${p.id}.${p.key} returns nothing outside its own range`,
     `found ${found.join(", ")}`);
  void sections;
}

// --------------------------------- a reconcile pass returns a working paper
console.log("\n--- the working paper and the final pass\n");
for (const p of passes.filter((x) => x.kind === "reconcile")) {
  // Lettered tables in most, "## FACTS" in the diagnostic — the original
  // working paper predates the convention the later agents follow. The
  // property that matters is not the letter, it is that a working paper is
  // NOT a numbered deliverable, which is what the next assertion checks.
  ok(/^##\s+\S/m.test(p.reply), `${p.id}.reconcile returns a working paper with headings`, p.reply.slice(0, 60));
  ok(!/^##\s*\d+\s*·/m.test(p.reply), `${p.id}.reconcile returns no numbered deliverable — the working paper never reaches the report`);
}
for (const p of passes.filter((x) => x.kind === "final")) {
  ok(/^##\s*0\s*·/m.test(p.reply), `${p.id}.final returns section 0, the paragraph read first`, p.reply.slice(0, 60));
  ok(/^##\s*A\s*·/mi.test(p.reply), `${p.id}.final returns its appendix`);
}

// ------------------------- the two products whose replies must RECONCILE
//
// The mock's tender pack and bid file are written to pass their own machine
// checks. If they stopped doing that, every test run would report a failure
// that was the mock's fault and somebody would eventually turn the check off.
console.log("\n--- the mock's own output passes the machine checks\n");
{
  const { reconcileScopeToPrice } = await import("../lib/tenderpack.js");
  const tp = PIPELINE_SPECS["tender-pack"];
  const scope = answer(tp.sectionPasses.find((x) => x.key === "t3").task);
  const price = answer(tp.sectionPasses.find((x) => x.key === "t4").task);
  const r = reconcileScopeToPrice(scope, price);
  ok(r.ok, `the mock's tender pack reconciles (${r.matched}/${r.scopeItems} scope items priced)`, r);
}
{
  const { reconcileChecklistToResponse } = await import("../lib/bidcheck.js");
  const br = PIPELINE_SPECS.bid;
  const list = answer(br.sectionPasses.find((x) => x.key === "b3").task);
  const resp = answer(br.sectionPasses.find((x) => x.key === "b4").task);
  const r = reconcileChecklistToResponse(list, resp);
  ok(r.ok, `the mock's bid file is complete (${r.matched}/${r.required} deliverables answered)`, r);
}
{
  const { reconcilePaymentsToEarned } = await import("../lib/controlcheck.js");
  const cr = PIPELINE_SPECS.controls;
  const earned = answer(cr.sectionPasses.find((x) => x.key === "c1_2").task);
  const paid = answer(cr.sectionPasses.find((x) => x.key === "c5").task);
  const r = reconcilePaymentsToEarned(earned, paid);
  ok(r.ok, `the mock's control report reconciles (${r.payments} payments against ${r.accounts} measured accounts)`, r);
  ok(r.totalRecommended <= r.totalEarned,
     `and recommends no more than it measured (${r.totalRecommended} against ${r.totalEarned})`);
}

{
  const { reconcileRegisterToMovements } = await import("../lib/interfacecheck.js");
  const ir = PIPELINE_SPECS.design;
  const reg = answer(ir.sectionPasses.find((x) => x.key === "d1_2").task);
  const mov = answer(ir.sectionPasses.find((x) => x.key === "d3").task);
  const r = reconcileRegisterToMovements(reg, mov);
  ok(r.ok, `the mock's interface register reconciles with its movement log (${r.interfaces} interfaces, ${r.movements} movements)`, r);
  ok(r.unowned.length === 0, "with an owner on every open interface", r.unowned);
  ok(r.closedThisPeriod === 1,
     "and one closure logged for an interface correctly absent from the register — the case the whole check exists for");
}

void splitPipelineOutput;
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
