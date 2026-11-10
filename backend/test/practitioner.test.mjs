/**
 * EVERY AGENT WRITES AS A SENIOR CONSTRUCTION PROFESSIONAL.
 *
 *   node backend/test/practitioner.test.mjs
 *
 * WHY THIS IS A TEST AND NOT A PREFERENCE. "Act like an experienced
 * professional" is the kind of instruction that is agreed with by everybody,
 * written down once, and then absent from the next agent somebody adds —
 * because the next agent is written by copying a different one, and whichever
 * one was copied is now the standard.
 *
 * So the standard lives in COMPANY_BRIEF, which every agent and every engine
 * brief is built from, and this test asserts it reaches all of them. A new
 * agent that does not inherit it fails the build, which is the only version of
 * "every part of the platform" that stays true six months from now.
 *
 * AND WHY THE SPECIFIC CLAUSES ARE PINNED TOO. A standard can be present and
 * hollowed out. "Be professional and specific" would satisfy a test that only
 * looked for the heading, and it would change nothing about what the model
 * writes. What makes a senior practitioner's document different from a
 * capable generalist's is a short list of habits — naming the clause rather
 * than the idea of it, carrying the basis with every quantity, getting the
 * statutory duty-holder right, consequences in days and money rather than
 * adjectives. Each of those is checked, because each is the thing that would
 * be softened first.
 */
import { AGENT_BRIEFS } from "../lib/ai.js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 300)}` : ""}`); }
};

const ids = Object.keys(AGENT_BRIEFS);
const systemOf = (id) => String(AGENT_BRIEFS[id]?.system || "");

console.log("\n=== the standard reaches every agent ===\n");

// Guards the test itself: if AGENT_BRIEFS were ever empty or stopped being
// exported, every assertion below would pass over nothing at all.
ok(ids.length >= 25, `there are ${ids.length} agent briefs to check, not a handful`, ids.length);

{
  const missing = ids.filter((id) => !/chartered construction professional/.test(systemOf(id)));
  ok(missing.length === 0,
     "EVERY BRIEF CARRIES THE PRACTITIONER STANDARD — a new agent that does not inherit it fails here rather than shipping",
     missing);
}
{
  // The engine briefs are generated from the registry rather than written out,
  // so they are the ones most likely to drift away from a hand-edited rule.
  const engines = ids.filter((id) => /machine/.test(Object.keys(AGENT_BRIEFS[id] || {}).join(",")));
  ok(engines.length >= 10, `${engines.length} generated engine briefs exist`, engines.length);
  const missing = engines.filter((id) => !/chartered construction professional/.test(systemOf(id)));
  ok(missing.length === 0, "and the GENERATED briefs carry it too, not only the hand-written ones", missing);
}

console.log("\n=== and it is not hollowed out ===\n");
//
// Each of these is a habit that separates a senior practitioner's document
// from a competent generalist's, and each is the thing that would be softened
// first if the standard were ever trimmed to fit.
const CLAUSES = [
  ["the clause, not the idea of it", /NAME THINGS AS THE INDUSTRY NAMES THEM/],
  ["a named form of contract to anchor it", /NEC4 ECC Option A/],
  ["every quantity carries its unit and its basis", /UNIT AND ITS BASIS/],
  ["the basis is what lets somebody disagree with the number", /disagree with the number/],
  ["the statutory duty-holder, named correctly", /NAME THE DUTY-HOLDER CORRECTLY/],
  ["including when the duty is not ours", /construction phase plan is the Principal Contractor/],
  ["consequences in days, money, a lost right or a failed inspection", /DAYS, MONEY, A LOST RIGHT OR A FAILED INSPECTION/],
  ["and not in adjectives", /Not adjectives/],
  ["the assumption stated, and what moves if it is wrong", /STATE THE ASSUMPTION/],
  ["real lead times and statutory durations respected", /REAL LEAD TIMES AND STATUTORY DURATIONS/],
  ["a named owner and a date on every recommendation", /NAMED OWNER AND A DATE/],
  ["what must be acted on first, first", /ACTED ON FIRST, FIRST/],
  ["and the authority that comes from declining to opine", /OUTSIDE YOUR COMPETENCE/],
];
for (const [what, re] of CLAUSES) {
  const missing = ids.filter((id) => !re.test(systemOf(id)));
  ok(missing.length === 0, what, missing.slice(0, 4));
}

console.log("\n=== no generic information, and every agent is held to it ===\n");
//
// These six tests were written for the diagnostic report and they were good.
// They were also appended on ONE line, for the ten pipeline agents only, so
// the other twenty — estimating, commercial, programme, notice and obligation
// among them, which write the most consequential documents in the platform —
// were held to no such rule. The standard now sits inside COMPANY_BRIEF and
// this section is why it cannot quietly go back to reaching a subset.
const GENERIC = [
  ["every factual statement names its source", /1\. SOURCE/],
  ["specificity, as a numbered test and not an aspiration", /2\. SPECIFICITY/],
  ["A STATEMENT TRUE ON ANOTHER PROJECT IS A TEXTBOOK LINE, NOT A FINDING", /would still be true on a different\s+project is not a finding/],
  ["consequence in days, pounds, cubic metres, kVA, beds, people or a named consent", /3\. CONSEQUENCE/],
  ["the working shown, so their engineer can check it rather than take it on trust", /4\. WORKING SHOWN/],
  ["what would change the answer, named", /5\. WHAT WOULD CHANGE IT/],
  ["honesty about what the inputs do not support", /6\. HONESTY/],
  ["\"industry best practice suggests\" forbidden by name", /industry best practice suggests/],
  ["a risk whose mitigation is \"monitor\" forbidden by name", /mitigation is "monitor"/],
  ["\"it is recommended that a review be undertaken\" forbidden by name", /a review be undertaken/],
  ["restating an input back as though it were a finding, forbidden", /restating an input back/],
  ["and it is stated to apply to every deliverable, not only a report", /appl(y|ies) word for word to every deliverable/],
];
for (const [what, re] of GENERIC) {
  const missing = ids.filter((id) => !re.test(systemOf(id)));
  ok(missing.length === 0, what, missing.slice(0, 4));
}
{
  // The specific regression this guards. Ten agents had it; twenty did not.
  const engineIds = ids.filter((id) => AGENT_BRIEFS[id] && typeof AGENT_BRIEFS[id].machine === "function");
  const missing = engineIds.filter((id) => !/2\. SPECIFICITY/.test(systemOf(id)));
  ok(engineIds.length >= 10 && missing.length === 0,
     `all ${engineIds.length} deterministic-engine agents are held to it too — these were the ones it never reached`,
     missing);
}
{
  // And it must not be sent twice. It is long, it costs tokens on every pass,
  // and a brief that repeats itself is a brief somebody will later trim in the
  // wrong place.
  const doubled = ids.filter((id) => (systemOf(id).match(/2\. SPECIFICITY/g) || []).length > 1);
  ok(doubled.length === 0, "and sent once, not twice, now that it is no longer appended per-path", doubled);
}

console.log("\n=== the standard does not contradict what already binds ===\n");
//
// A professional register is the one place a well-meant instruction could
// quietly undo a hard limit: a brief that says "write with authority" against
// one that says "you have no authority to commit" is a brief that will be
// resolved by the model, not by us.
{
  const missing = ids.filter((id) => !/no authority to approve/.test(systemOf(id)));
  ok(missing.length === 0, "every brief still says the agent has no authority to approve or commit", missing);
}
{
  const missing = ids.filter((id) => !/Never invent facts/.test(systemOf(id)));
  ok(missing.length === 0, "and still forbids inventing a fact — seniority is not licence to fill a gap", missing);
}
{
  const bad = ids.filter((id) => /\bact confident|sound authoritative|write with authority\b/i.test(systemOf(id)));
  ok(bad.length === 0,
     "AND NOTHING TELLS AN AGENT TO SOUND AUTHORITATIVE — the standard is a list of habits, not a register to perform, because performing it over a missing fact is how a confident document rests on nothing",
     bad);
}
{
  // The CDM limit is the one a professional register is most likely to erode:
  // the more experienced the voice, the more natural it reads to claim the
  // appointment. The duty-holder clause names the PC's duty as the PC's.
  const missing = ids.filter((id) => !/never described as main contractor/.test(systemOf(id)));
  ok(missing.length === 0, "and the CDM and main-contractor limits are untouched by it", missing);
}

console.log("\n=== and no model call escapes the brief ===\n");
//
// AGENT_BRIEFS is thirty of the platform's AI paths and it is not all of them.
// draftPrequal, draftApproach and draftScope call the model directly,
// outside the agent registry, and draftApproach writes a FIRST APPROACH that a
// prospect reads — the single most customer-facing thing here. All three carry
// COMPANY_BRIEF today. This asserts they still do, and that a fourth cannot be
// added without somebody deciding it either carries the brief or is exempt.
//
// Source-level on purpose. The functions take their system prompt as an
// argument, so no runtime check can see what they were given; only the text of
// the file can.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = readFileSync(path.join(root, "backend/lib/ai.js"), "utf8");

{
  // Every call that actually sends a prompt to the provider.
  const calls = src.split("\n")
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter((x) => /client\(\)\.(beta\.)?messages\.(stream|create)/.test(x.line));
  ok(calls.length === 3,
     `three provider call sites in ai.js (${calls.length}) — a new one must be accounted for below rather than appear silently`,
     calls.map((c) => `${c.n}: ${c.line.slice(0, 60)}`));
}
{
  // The three direct drafters, each by name, each required to build its system
  // prompt from COMPANY_BRIEF.
  for (const fn of ["draftPrequal", "draftApproach", "draftScope"]) {
    const at = src.indexOf(`export async function ${fn}`);
    ok(at > 0, `${fn} exists`, at);
    if (at < 0) continue;
    const body = src.slice(at, at + 4000);
    ok(/system: `\$\{COMPANY_BRIEF\}/.test(body),
       `${fn} builds its system prompt from COMPANY_BRIEF, so it is held to the same standard as the thirty agents`,
       body.slice(0, 120));
  }
}
{
  // testProvider is the one exemption and it is correct. It sends "Reply with
  // exactly: ETABLIX AI online" with no system prompt, to prove a key works.
  // Holding a connectivity ping to a writing standard would be absurd; what
  // matters is that it stays a ping.
  const at = src.indexOf("export async function testProvider");
  const body = src.slice(at, at + 700);
  ok(at > 0 && !/system:/.test(body),
     "testProvider is exempt and stays exempt — a connectivity ping with no system prompt, and no deliverable",
     body.slice(0, 100));
  ok(/ETABLIX AI online/.test(body), "and still only asks the provider to say it is there", body.slice(0, 160));
}
{
  // The fourth provider call lives in diagnostic.js, which runs the pipeline
  // for ten of the agents. It takes `system` as an argument, and ai.js passes
  // brief.system — so the brief reaches it. What matters is that diagnostic.js
  // never builds a system prompt of its own, because one built there would
  // bypass COMPANY_BRIEF for exactly the ten agents that produce the longest
  // documents.
  const diag = readFileSync(path.join(root, "backend/lib/diagnostic.js"), "utf8");
  const calls = diag.split("\n").filter((l) => /anthropic\.messages\.(stream|create)/.test(l));
  ok(calls.length === 1, `one provider call in diagnostic.js (${calls.length})`, calls);
  ok(!/system:\s*`/.test(diag),
     "and diagnostic.js builds no system prompt of its own — it is handed one, so the brief cannot be bypassed on the pipeline path",
     (diag.match(/system:[^\n]{0,60}/g) || []).slice(0, 3));
}
{
  // The deterministic kernel is the other half of "everything". It must not
  // acquire a prompt: the whole L7 bid lifecycle is gates, engines and
  // reconciliations, and its LLM port exists so the core never knows which
  // SDK is underneath. A prompt appearing in an adapter would be an adapter
  // deciding what an answer is about.
  const adapter = readFileSync(path.join(root, "backend/lib/l7/adapters/llm.js"), "utf8");
  ok(/PROMPT CONSTRUCTION IS NOT AN ADAPTER CONCERN/.test(adapter),
     "the L7 llm adapter still declares that it constructs no prompts");
  ok(!/COMPANY_BRIEF|You are an?\b/.test(adapter),
     "and carries none — so there is no second, unheld writing path through the tender kernel");
}
{
  /**
   * AND THE AUDIT TABLE IN CLAUDE.md IS COMPARED TO THE REGISTRY.
   *
   * That section claims to be an audit and claims that an audit only stays
   * true if adding a path fails the build. It said sixteen generated engine
   * briefs and thirty agents while the registry held twenty and thirty-four,
   * and nothing failed — so the one claim it made about itself was the one
   * thing in it that was wrong.
   *
   * The numbers are read out of the document and compared to the real count.
   * Adding an engine without correcting the table now fails here, which is
   * the only arrangement under which a number in a document means anything.
   */
  const claude = readFileSync(path.join(root, "CLAUDE.md"), "utf8");
  const ids = Object.keys(AGENT_BRIEFS);
  const generated = ids.filter((id) => typeof AGENT_BRIEFS[id]?.machine === "function");
  const handWritten = ids.length - generated.length;

  const handRow = /\|\s*Hand-written agent briefs\s*\|\s*(\d+)\s*\|/.exec(claude);
  const genRow = /\|\s*Generated engine briefs, from the engine registry\s*\|\s*(\d+)\s*\|/.exec(claude);
  ok(Boolean(handRow) && Boolean(genRow), "both audit rows are still in CLAUDE.md to be checked", { handRow: Boolean(handRow), genRow: Boolean(genRow) });
  ok(handRow && Number(handRow[1]) === handWritten,
     `CLAUDE.md's count of hand-written briefs matches the registry (${handRow?.[1]} claimed, ${handWritten} real)`,
     { claimed: handRow?.[1], real: handWritten });
  ok(genRow && Number(genRow[1]) === generated.length,
     `AND ITS COUNT OF GENERATED ENGINE BRIEFS MATCHES (${genRow?.[1]} claimed, ${generated.length} real) — a number in a document that nothing compares against the code is a number that is wrong and does not know it`,
     { claimed: genRow?.[1], real: generated.length });
  const words = { 30: "thirty", 34: "thirty-four", 38: "thirty-eight", 42: "forty-two" };
  ok(claude.includes(`all ${words[ids.length] ?? ids.length} inherit it`),
     `and the prose says all ${words[ids.length] ?? ids.length} inherit the brief, which is ${ids.length}`,
     ids.length);
}
{
  // THE FIFTH PATH THAT ALMOST BECAME A FIFTH CALL SITE.
  //
  // The Trend Intelligence inference gateway chooses between a host AI route,
  // a deployment-supplied route and deterministic templates. The obvious
  // implementation makes the provider call there, and that would be a second
  // writing path with no brief on it. It is a ROUTER AND A VALIDATOR instead:
  // the caller supplies the attempt, the gateway bounds the request and
  // refuses a non-conforming output. So the audit's count of four provider
  // calls stays true, and this asserts it rather than trusting the comment.
  const dir = path.join(root, "backend/lib/trendintel");
  const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
  ok(files.length >= 9, `${files.length} Trend Intelligence modules present`, files);
  const callers = [];
  const prompters = [];
  for (const f of files) {
    const text = readFileSync(path.join(dir, f), "utf8");
    text.split("\n").forEach((line, n) => {
      if (/^\s*(\*|\/\/)/.test(line)) return;
      if (/messages\.(stream|create)|anthropic|openai|fetch\s*\(/i.test(line)) callers.push(`${f}:${n + 1}`);
      if (/\bsystem:\s*[`"']|COMPANY_BRIEF|You are an?\s/.test(line)) prompters.push(`${f}:${n + 1}`);
    });
  }
  ok(callers.length === 0,
     "NO MODULE IN backend/lib/trendintel MAKES A PROVIDER CALL OR AN OUTBOUND REQUEST — the inference gateway routes and validates, and the four provider call sites asserted above are still the whole set",
     callers);
  ok(prompters.length === 0,
     "and none of them constructs a system prompt, so there is no second unheld writing path through the signal engine either",
     prompters);
  const gateway = readFileSync(path.join(dir, "inference.js"), "utf8");
  ok(/CONSTRUCTS NO PROMPTS AND MAKES NO PROVIDER CALL/.test(gateway),
     "the gateway declares the rule at the top of the file, where the next person to add a call will read it");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
