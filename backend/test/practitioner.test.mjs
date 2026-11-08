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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
