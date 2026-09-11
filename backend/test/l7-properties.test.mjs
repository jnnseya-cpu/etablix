/**
 * The four Level 7 properties built last: the clause graph, bitemporal state,
 * governed learning and the ports.
 *
 *   node backend/test/l7-properties.test.mjs
 *
 * Each of these replaces a sentence the register carried for weeks, and each
 * has a failure mode that looks like success:
 *
 *   · A clause graph that answers the same thing for every contract. It reads
 *     as a clean result and means generic knowledge would have served.
 *   · A bitemporal store that quietly overwrites, so the history is a list of
 *     current values with dates on it.
 *   · A memory whose gate is a queue — proposals accumulate, somebody clicks
 *     approve, and nothing was ever actually checked.
 *   · Ports whose adapters conform in shape and disagree in behaviour, so the
 *     swap works right up until the first edge case.
 */
import {
  FORMS, EVENTS, CLAUSE_KINDS, graph, resolve, compare, validate, clause,
  deadlines, triggerFor, formIds,
} from "../lib/l7/clauses.js";
import {
  record, correct, asOf, history, reconstruct, snapshot, lateInformation,
  integrity, FOREVER,
} from "../lib/l7/bitemporal.js";
import {
  PARTITIONS, STATES, PROMOTION_ROLES, remember, propose, promote, recall,
  pending, prior, retire, state as memoryState,
} from "../lib/l7/memory.js";
import {
  PORTS, UNPORTED, SCRIPTS, register, use, bound, conforms, compare as portCompare,
  compareSync, noBusinessLogic, state as portState,
} from "../lib/l7/ports.js";
import { systemClock, fixedClock } from "../lib/l7/adapters/clock.js";
import { sqliteStore, memoryStore } from "../lib/l7/adapters/store.js";
import { diskFiles, memoryFiles } from "../lib/l7/adapters/files.js";
import { memoryMail, transportMail } from "../lib/l7/adapters/mail.js";
import { localBilling, prepaidBilling } from "../lib/l7/adapters/billing.js";
import { scriptedLlm } from "../lib/l7/adapters/llm.js";
import { setContract, recordEvent, live, eventsFor, awarenessOn, watched, state as watchState } from "../lib/l7/watch.js";
import { withPriors, FACTORS, score } from "../lib/l7/bidscore.js";
import { bindPorts } from "../lib/l7/bootstrap.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

bindPorts();

console.log("\n=== the last four Level 7 properties ===\n");

/* ------------------------------------------------------------------ */
console.log("--- L7.1 the clause graph\n");

ok(formIds().length === 3, "three standard forms have skeletons", formIds());
ok(EVENTS.length === 5, "five canonical site events");
ok(CLAUSE_KINDS.length === 8, "eight clause kinds");

{
  // THE SPECIFICATION'S OWN TEST.
  const c = compare(formIds(), { event: "unforeseen_ground", awareAt: "2026-06-01", now: "2026-09-11" });
  ok(c.differ, "THE SAME SITE EVENT PRODUCES DIFFERENT ANSWERS UNDER DIFFERENT CONTRACTS", c.verdicts);
  ok(c.verdicts.length === 3, "three contracts, three answers", c.verdicts.length);
  const nec = c.answers.find((a) => a.form === "NEC4-A");
  const jct = c.answers.find((a) => a.form === "JCT-DB-2016");
  ok(nec.barred.length === 1, "NEC4 bars it outright after eight weeks");
  ok(jct.barred.length === 0, "and JCT does not — the consequence of lateness is different in kind, not in degree");
}
{
  const c = compare(formIds(), { event: "unforeseen_ground", awareAt: "2026-09-01", now: "2026-09-11" });
  ok(c.answers.every((a) => a.barred.length === 0), "ten days after the event, nothing is barred anywhere");
  const nec = c.answers.find((a) => a.form === "NEC4-A");
  const fidic = c.answers.find((a) => a.form === "FIDIC-YELLOW-2017");
  ok(nec.clauses.some((x) => x.daysRemaining === 46), "NEC4 leaves 46 days", nec.clauses.map((x) => x.daysRemaining));
  ok(fidic.clauses.some((x) => x.daysRemaining === 18), "FIDIC leaves 18 — the same facts, a different fortnight", fidic.clauses.map((x) => x.daysRemaining));
}
{
  // THE AMENDMENT. This is why generic knowledge fails.
  const recent = { trigger: "compensation_event", awareAt: "2026-08-01", now: "2026-09-11" };
  const published = resolve(graph({ form: "NEC4-A" }), recent);
  const amended = resolve(graph({
    form: "NEC4-A",
    amendments: [{ ref: "Z12.1", kind: "timebar", name: "as amended", party: "contractor", trigger: "compensation_event", period: 14, basis: "calendar", barsIf: "late", supersedes: "NEC4-A:61.3", confirmed: true, text: "loaded", say: "fourteen days" }],
  }), recent);
  ok(published.barred.length === 0, "under the published form the entitlement is live");
  ok(amended.barred.length === 1, "UNDER THE Z-CLAUSE IT IS LOST — same facts, same date, opposite answer");
  ok(!amended.clauses.some((c) => c.ref === "61.3"), "and the standard clause is gone rather than sitting alongside it");
  ok(amended.clauses.some((c) => c.ref === "Z12.1" && c.amendment), "the amendment is the clause that governs");
}
{
  const g = graph({ form: "NEC4-A", amendments: [{ ref: "Z99", kind: "timebar", trigger: "t", period: 1, basis: "calendar", barsIf: "late", supersedes: "NEC4-A:61.9" }] });
  const v = validate(g);
  ok(!v.ok && /mistyped reference is an amendment that does not apply/.test(v.faults[0]),
     "an amendment naming a clause that does not exist is a fault, not a silent no-op", v.faults[0]);
}
{
  const v = validate(graph({ form: "NEC4-A", extra: [{ ref: "X1", kind: "timebar", trigger: "t", barsIf: "late" }] }));
  ok(!v.ok && /TIME BAR with no period/.test(v.faults.join(" ")),
     "A TIME BAR WITH NO PERIOD is the most dangerous row in a clause graph — it reads as live and bars nothing");
}
ok(!validate(graph({ form: "NEC4-A", extra: [{ ref: "X2", kind: "timebar", trigger: "t", period: 5, basis: "fortnights", barsIf: "late" }] })).ok,
   "and a period with no recognised basis is refused — days, working days and weeks are three different deadlines");
{
  const r = resolve(graph({ form: "NEC4-A" }), { trigger: "compensation_event", awareAt: "as soon as practicable" });
  ok(!r.ok && /not a date/.test(r.reason), "an awareness date that is not a date is refused rather than guessed at");
}
{
  const r = resolve(graph({ form: "NEC4-A" }), { trigger: "compensation_event", awareAt: "2026-09-01", now: "2026-09-11" });
  ok(r.caveat && /NOT been confirmed against the executed contract/.test(r.caveat),
     "EVERY ANSWER FROM A SKELETON SAYS SO — a standard form read as the contract is the failure this module exists to prevent", r.caveat);
  ok(r.textMissing.length > 0, "and names the clauses whose text has not been loaded");
}
ok(triggerFor("unforeseen_ground", "NEC4-A") === "compensation_event", "an event translates into a form's own word for it");
ok(triggerFor("unforeseen_ground", "INVENTED") === null, "and returns nothing for a form it does not know");
{
  const one = compare(["NEC4-A"], { event: "unforeseen_ground", awareAt: "2026-06-01", now: "2026-09-11" });
  ok(!one.differ && /too thin to tell them apart/.test(one.say),
     "one contract cannot differ from itself, and sameness is reported as a finding rather than a pass", one.say);
}
{
  // ONE deadline, not two: 20.2.4's eighty-four days run from the notice of
  // claim, not from the event, so it does not engage until the notice exists.
  // The first version of this test expected two and was wrong about the form.
  const d = deadlines(graph({ form: "FIDIC-YELLOW-2017" }), [{ id: "E1", trigger: "claim_event", awareAt: "2026-09-01" }], "2026-09-11");
  ok(d.length === 1 && d[0].clause === "FIDIC-YELLOW-2017 20.2.1",
     "a claim event engages the twenty-eight day notice and nothing else yet", d.map((x) => x.clause));
  const both = deadlines(graph({ form: "FIDIC-YELLOW-2017" }), [
    { id: "E1", trigger: "claim_event", awareAt: "2026-09-01" },
    { id: "E2", trigger: "notice_of_claim", awareAt: "2026-09-05" },
  ], "2026-09-11");
  ok(both.length === 2, "and once the notice is given, the detailed claim's clock is running too", both.map((x) => x.clause));
  ok(both[0].deadline <= both[1].deadline, "soonest first");
}

/* ------------------------------------------------------------------ */
console.log("\n--- L7.4 bitemporal state\n");

const ENT = `test-${Date.now().toString(36)}`;
const MAR = "2026-03-14", SEP = "2026-09-02";

ok(record({ entity: ENT, field: "waterTable", value: 2.1, validFrom: MAR, at: MAR, by: "survey", source: "GI R1" }).ok, "a fact records");
ok(!record({ entity: ENT, field: "x", value: 1 }).ok, "one with no source is refused — a fact nobody can trace is not evidence");
ok(!record({ entity: ENT, field: "x", source: "s" }).ok, "and one with no value, because an absent value is recorded deliberately or not at all");
ok(!record({ entity: ENT, field: "x", value: 1, source: "s", validFrom: "whenever" }).ok, "a valid-from that is not a date is refused");
ok(!record({ entity: ENT, field: "x", value: 1, source: "s", validFrom: "2026-03-01", validTo: "2026-02-01" }).ok, "and a period that ends before it starts");

ok(asOf({ entity: ENT, field: "waterTable", validAt: MAR, knownAt: MAR }).value === 2.1, "in March we thought 2.1");
ok(correct({ entity: ENT, field: "waterTable", value: 1.4, validFrom: MAR, at: SEP, by: "survey", source: "GI R2", reason: "re-survey" }).ok, "and it is corrected in September");
ok(asOf({ entity: ENT, field: "waterTable", validAt: MAR, knownAt: MAR }).value === 2.1,
   "WHAT WE KNEW IN MARCH IS STILL 2.1 — the correction did not reach back and destroy the evidence that the March decision was reasonable");
ok(asOf({ entity: ENT, field: "waterTable", validAt: MAR, knownAt: "2026-09-11" }).value === 1.4,
   "and what we NOW say was true in March is 1.4 — both are true, which is the whole point");
ok(!correct({ entity: ENT, field: "waterTable", value: 9, validFrom: MAR, source: "s", by: "x" }).ok,
   "a correction with no reason is an overwrite with better manners, and is refused");
{
  const r = reconstruct({ entity: ENT, field: "waterTable", decisionAt: MAR });
  ok(r.changed, "the reconstruction sees that something changed");
  ok(/reasonable on the information that existed/.test(r.say), "and says the decision was reasonable on what existed", r.say);
}
{
  const r = reconstruct({ entity: ENT, field: "nothingEverKnown", decisionAt: MAR });
  ok(!r.changed && /no information is a different criticism/.test(r.say),
     "a decision taken on NO information is a different criticism from one taken on wrong information, and the record distinguishes them", r.say);
}
ok(history(ENT, "waterTable").length === 2, "both versions survive", history(ENT, "waterTable").length);
ok(history(ENT, "waterTable")[0].value === 2.1, "INCLUDING THE ONE THAT WAS WRONG — it is the evidence, so it is kept");
ok(integrity().ok, "and the store's integrity holds: superseded, never altered", integrity().say);
ok(integrity().superseded >= 1, "with the supersession counted");
{
  const late = lateInformation({ entity: ENT, thresholdDays: 30 });
  ok(late.length === 1 && late[0].lateByDays > 150, "a survey delivered five months after its own date is on the late list", late[0]);
}
{
  const s = snapshot({ entity: ENT, validAt: MAR, knownAt: MAR });
  ok(s.fields.waterTable === 2.1, "a whole-entity snapshot reads as at a moment");
}
ok(asOf({ entity: ENT, field: "waterTable", validAt: "2020-01-01", knownAt: MAR }).known === false,
   "before anything was true of it, not knowing is the answer and it is given rather than guessed");
ok(FOREVER > Date.now() * 1000, "an open-ended fact really is open-ended");

/* ------------------------------------------------------------------ */
console.log("\n--- L7.6 governed learning\n");

ok(PARTITIONS.length === 5, "five partitions");
ok(PARTITIONS.filter((p) => p.institutional).length === 2, "two of them institutional");
ok(PROMOTION_ROLES.length === 2, "and two roles that may promote into them");

const KEY = `test.${Date.now().toString(36)}`;
{
  const r = remember({ partition: "lessons", key: KEY, value: 1, by: "agent-9", kind: "agent", source: "s" });
  ok(!r.ok && /may never make one true/.test(r.faults[0]),
     "AN AGENT MAY NOT WRITE A LESSON — the rule that stops one agent's conclusion becoming a figure the next bid prices on", r.faults[0]);
}
ok(!remember({ partition: "policy", key: KEY, value: 1, by: "agent-9", kind: "agent", source: "s" }).ok, "nor organisational policy");
ok(remember({ partition: "working", key: KEY, value: 1, by: "agent-9", kind: "agent" }).ok, "but it may write its own scratch space");
ok(remember({ partition: "project", key: KEY, value: 1, by: "agent-9", kind: "agent", source: "run-1" }).ok, "and a project fact, which is scoped and traceable");
ok(!remember({ partition: "project", key: KEY, value: 1, by: "agent-9", kind: "agent" }).ok, "though not without a source");
ok(!remember({ partition: "invented", key: KEY, value: 1, by: "x", source: "s" }).ok, "an invented partition is refused");

const prop = propose({ key: KEY, value: 45, evidence: ["E1", "E2"], by: "agent-9", rationale: "two engagements" });
ok(prop.ok, "an agent may PROPOSE a lesson");
ok(!propose({ key: KEY, value: 1, by: "agent-9", rationale: "a hunch" }).ok,
   "but not one with no evidence — a generalisation with nothing behind it is what this gate exists to stop");
ok(!propose({ key: KEY, value: 1, evidence: ["E"], by: "agent-9" }).ok, "nor one with no rationale nobody could argue with");
ok(recall({ partition: "lessons", key: KEY }).count === 0, "A PROPOSAL IS NOT MEMORY — it does not read back as a lesson");
ok(pending().some((p) => p.key === KEY), "it is waiting on a person");
{
  const r = promote({ entryId: prop.entry.id, by: "agent-9", role: "KNOWLEDGE_STEWARD", reason: "looks right" });
  ok(!r.ok && /has not passed a gate, it has passed itself/.test(r.faults[0]),
     "the proposer cannot be the promoter", r.faults[0]);
}
ok(!promote({ entryId: prop.entry.id, by: "J", role: "CONTRIBUTOR", reason: "ok" }).ok, "nor may a contributor promote one");
ok(!promote({ entryId: prop.entry.id, by: "J", role: "KNOWLEDGE_STEWARD" }).ok, "nor may anybody without recording a reason");
{
  const r = promote({ entryId: prop.entry.id, by: "J Nseya", role: "KNOWLEDGE_STEWARD", reason: "checked both remittances" });
  ok(r.ok, "a knowledge steward may");
  ok(recall({ partition: "lessons", key: KEY }).count === 1, "and it becomes readable memory");
  ok(!promote({ entryId: prop.entry.id, by: "J Nseya", role: "KNOWLEDGE_STEWARD", reason: "again" }).ok,
     "a decision already taken is not retaken by taking it again");
}
{
  const p = prior(KEY);
  ok(p.known && p.observations === 2, "the prior knows how many observations stand behind it", p.observations);
  ok(p.enough === false && /anecdote, not a pattern/.test(p.say),
     "TWO OBSERVATIONS IS AN ANECDOTE and it is reported as one rather than returned with the confidence of a hundred", p.say);
}
{
  const fat = propose({ key: KEY, value: 45, evidence: ["E1", "E2", "E3", "E4", "E5", "E6"], by: "agent-9", rationale: "six" });
  promote({ entryId: fat.entry.id, by: "J Nseya", role: "KNOWLEDGE_STEWARD", reason: "checked all six" });
  const p = prior(KEY);
  ok(p.enough, "eight observations is a pattern", p.observations);
  ok(recall({ partition: "lessons", key: KEY }).count === 1, "and the earlier lesson is superseded rather than duplicated");
}
ok(prior("never.learned").known === false, "and nothing learned reports as not knowing rather than as a value");
ok(memoryState().ungated === 0, "no institutional entry carries no approver", memoryState().say);
{
  const held = recall({ partition: "lessons", key: KEY }).entries[0];
  ok(!retire({ entryId: held.id, by: "J", role: "CONTRIBUTOR", reason: "r" }).ok, "a contributor may not retire a lesson either");
  ok(retire({ entryId: held.id, by: "J Nseya", role: "KNOWLEDGE_STEWARD", reason: "the client changed terms" }).ok, "a steward may");
  ok(recall({ partition: "lessons", key: KEY }).count === 0, "and it stops being applied");
}
{
  // The consumer. A memory nothing reads is a governed queue.
  const base = { factors: FACTORS.map((f) => ({ id: f.id, score: 70 })) };
  const K2 = `bid.client_quality`;
  const thin = propose({ key: K2, value: "pays at 45 days", evidence: ["A", "B"], by: "agent-9", rationale: "two" });
  promote({ entryId: thin.entry.id, by: "J Nseya", role: "KNOWLEDGE_STEWARD", reason: "checked" });
  let w = withPriors(base, prior);
  ok(w.priorsThin.length === 1 && w.priorsUsed.length === 0,
     "A THIN PRIOR IS ATTACHED AS CONTEXT AND NOT COUNTED AS EVIDENCE", w.priorsThin);
  ok(score(w).evidenceCoverage === 0, "so the score still says the factor rests on nothing");
  const fat = propose({ key: K2, value: "pays at 45 days", evidence: ["A", "B", "C", "D", "E", "F"], by: "agent-9", rationale: "six" });
  promote({ entryId: fat.entry.id, by: "J Nseya", role: "KNOWLEDGE_STEWARD", reason: "checked six" });
  w = withPriors(base, prior);
  ok(w.priorsUsed.length === 1, "and a prior with enough behind it is cited as evidence", w.priorsUsed);
  ok(score(w).evidenceCoverage > 0, "which is the memory doing work rather than waiting to");
}

/* ------------------------------------------------------------------ */
console.log("\n--- L7.7 ports and adapters\n");

ok(Object.keys(PORTS).length === 6, "six ports");
ok(UNPORTED.length === 6, "and six boundaries named as having none", UNPORTED.map((u) => u.id));
ok(UNPORTED.filter((u) => u.state === "absent").length === 5,
   "five of those are absent rather than merely unported — a port with no adapter would be a claim rather than a capability");
ok(bound().every((b) => b.bound), "every port is bound after bootstrap", bound().filter((b) => !b.bound));
ok(Object.keys(SCRIPTS).length === 6, "and every port has a conformance script — an unexercised port is an untested one");

ok(conforms("clock", systemClock).ok, "the system clock conforms");
ok(!conforms("clock", {}).ok, "an empty object does not");
ok(!conforms("clock", { now: () => 1 }).ok, "nor one missing a method");
ok(!conforms("invented", systemClock).ok, "and an invented port is refused");
{
  const r = register("clock", { now: () => 1 });
  ok(!r.ok, "an adapter that does not fit cannot be registered");
}
{
  let threw = false;
  try { use("invented"); } catch { threw = true; }
  ok(threw, "asking for an unbound port THROWS rather than falling back — a core that substitutes a default has a hidden dependency");
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "l7-ports-"));
{
  const r = compareSync("clock", systemClock, fixedClock("2026-09-11"));
  ok(r.ok, "the system clock and a fixed clock behave identically through the port", r.faults);
}
{
  const r = compareSync("store", sqliteStore, memoryStore());
  ok(r.ok, "SQLITE ON DISK AND A MAP IN MEMORY ARE INDISTINGUISHABLE — which is what makes moving off the embedded database a hosting decision", r.faults);
  ok(r.steps === 8, "across eight operations including the edges", r.steps);
}
{
  const r = compareSync("files", diskFiles(TMP), memoryFiles());
  ok(r.ok, "disk and memory file storage agree, including on a missing key", r.faults);
}
ok((await portCompare("mail", memoryMail(), transportMail(async () => ({ messageId: "x" })))).ok,
   "both mail adapters refuse the same messages and accept the same ones");
ok((await portCompare("billing", localBilling(), prepaidBilling(100))).ok,
   "and an account with no balance behaves like one with a balance, for everything the port covers");
ok((await portCompare("llm", scriptedLlm({ a: "b" }), scriptedLlm({ c: "d" }))).ok, "two model routes agree on the contract");
{
  // A deliberately divergent adapter must be CAUGHT, or the comparison proves
  // nothing. This is the test of the test.
  const sloppy = { ...memoryFiles(), get(key) { const v = memoryFiles().get(key); if (v === null) throw new Error("not found"); return v; } };
  const r = compareSync("files", memoryFiles(), sloppy);
  ok(!r.ok, "AN ADAPTER THAT THROWS WHERE THE OTHER RETURNS NULL IS CAUGHT — shape conformance would have passed it", r.say);
  ok(/get on a missing key/.test(r.faults.join(" ")), "and the divergent step is named", r.faults[0]);
}
{
  const l = noBusinessLogic();
  ok(l.ok, "no adapter imports a domain module", l.faults);
  ok(l.adapters === 6, "six adapter files read", l.adapters);
}
ok(!noBusinessLogic("/nowhere").ok, "and a missing adapter directory is a fault rather than a pass");
ok(portState().allBound && portState().noBusinessLogic.ok, "the port layer reports itself whole", portState().say);

/* ------------------------------------------------------------------ */
console.log("\n--- and the thing that consumes them\n");

{
  const P = `test-${Date.now().toString(36)}`;
  ok(!setContract({ project: P, form: "INVENTED", by: "J" }).ok, "a form with no skeleton cannot be recorded");
  ok(!setContract({ project: P, form: "NEC4-A" }).ok, "nor a contract nobody is named as recording");
  ok(setContract({ project: P, form: "NEC4-A", by: "J Nseya" }).ok, "a contract records against a project");
  ok(!recordEvent({ project: P, event: "invented", awareAt: "2026-08-01", by: "J" }).ok, "an event outside the vocabulary is refused");
  ok(!recordEvent({ project: P, event: "unforeseen_ground", awareAt: "recently", by: "J" }).ok,
     "and an awareness date that is not a date, because every period in every form runs from a day");
  const e = recordEvent({ project: P, event: "unforeseen_ground", awareAt: "2026-08-01", by: "Site manager", detail: "rock at 1.2m" });
  ok(e.ok, "a site event records");
  ok(Boolean(e.fact), "AND IT WRITES AWARENESS BITEMPORALLY — the question asked later is never when it happened but when you knew");
  ok(e.lateByDays > 0, `recorded ${e.lateByDays} days after the awareness date, and the gap is stated`);
  ok(eventsFor(P).length === 1, "and reads back against the project");

  const l = live(P, "2026-09-11");
  ok(l.ok && l.deadlines.length >= 1, "the watch produces the deadlines running today", l.say);
  ok(l.gaps.length === 0, "with no unresolvable events");
  ok(watched().includes(P), "and the project is watched");
  ok(watchState().watching >= 1, "the watch reports what it is watching", watchState().say);

  const before = awarenessOn({ project: P, eventId: e.event.id, decisionAt: "2026-07-01" });
  ok(before.knownThen === null, "before it was recorded, we did not know — and the record says so rather than showing today's value");
}
{
  const P2 = `test2-${Date.now().toString(36)}`;
  const l = live(P2);
  ok(!l.ok && /gap in the record, not an absence of obligation/.test(l.reason),
     "a project with no contract recorded is a gap in the record, not a project with no obligations", l.reason);
}
{
  // A contract that has no word for an event must say so rather than drop it.
  const P3 = `test3-${Date.now().toString(36)}`;
  setContract({ project: P3, form: "JCT-DB-2016", by: "J" });
  recordEvent({ project: P3, event: "delay_apparent", awareAt: "2026-09-01", by: "J" });
  const l = live(P3, "2026-09-11");
  ok(l.ok, "the watch resolves it");
  ok(l.deadlines.length + l.gaps.length >= 1, "and produces either a deadline or a stated gap, never silence");
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* gone */ }

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
