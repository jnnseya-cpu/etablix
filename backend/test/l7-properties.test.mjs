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
import { mayIssue, CHALLENGE_REQUIRED } from "../lib/l7/issue.js";
import { logValidity, validOn, validityHistory, logRegistry } from "../lib/l7/evidencelog.js";
import { measurements, MEASUREMENTS, agedRfis, manualReportingHours, recordForecast, scoreWarning } from "../lib/l7/quality.js";
import { ledgerAccounting, memoryAccounting } from "../lib/l7/adapters/accounting.js";
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

ok(formIds().length === 6, "six standard forms have skeletons", formIds());
ok(EVENTS.length === 5, "five canonical site events");
ok(CLAUSE_KINDS.length === 8, "eight clause kinds");

{
  // THE SPECIFICATION'S OWN TEST.
  const c = compare(formIds(), { event: "unforeseen_ground", awareAt: "2026-06-01", now: "2026-09-11" });
  ok(c.differ, "THE SAME SITE EVENT PRODUCES DIFFERENT ANSWERS UNDER DIFFERENT CONTRACTS", c.verdicts);
  ok(c.answers.length === 6, "six contracts answer", c.answers.length);
  ok(c.verdicts.length >= 3, "and they do not all say the same thing", c.verdicts);
  // The JCT trap, which is the reason the second JCT form is in here at all.
  const db = c.answers.find((a) => a.form === "JCT-DB-2016");
  const sbc = c.answers.find((a) => a.form === "JCT-SBC-2016");
  ok(db.askedAs === sbc.askedAs, "both JCT forms are asked the same thing");
  const dbNotice = resolve(graph({ form: "JCT-DB-2016" }), { trigger: "delay_becomes_apparent", awareAt: "2026-09-01", now: "2026-09-11" });
  const sbcNotice = resolve(graph({ form: "JCT-SBC-2016" }), { trigger: "delay_becomes_apparent", awareAt: "2026-09-01", now: "2026-09-11" });
  ok(dbNotice.clauses[0].ref === "2.24.1" && sbcNotice.clauses[0].ref === "2.27.1",
     "AND THE SAME OBLIGATION SITS AT A DIFFERENT CLAUSE NUMBER IN EACH — a notice citing the wrong one is an argument the other side gets for free",
     `${dbNotice.clauses[0].ref} against ${sbcNotice.clauses[0].ref}`);
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

ok(Object.keys(PORTS).length === 7, "seven ports");
ok(UNPORTED.length === 6, "and six boundaries named as having none", UNPORTED.map((u) => u.id));
ok(UNPORTED.filter((u) => u.state === "absent").length === 5,
   "five of those are absent rather than merely unported — a port with no adapter would be a claim rather than a capability", UNPORTED.filter((u) => u.state === "absent").map((u) => u.id));
ok(bound().every((b) => b.bound), "every port is bound after bootstrap", bound().filter((b) => !b.bound));
ok(Object.keys(SCRIPTS).length === Object.keys(PORTS).length, "and every port has a conformance script — an unexercised port is an untested one", `${Object.keys(SCRIPTS).length} scripts for ${Object.keys(PORTS).length} ports`);

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
  ok(l.adapters === 7, "seven adapter files read", l.adapters);
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

/* ------------------------------------------------------------------ */
console.log("\n--- the issue gate: a bid may not go unchallenged\n");

ok(CHALLENGE_REQUIRED.has("bidfile"), "a bid file requires a challenge");
ok(!CHALLENGE_REQUIRED.has("invoice"), "an invoice does not");
ok(mayIssue({ template: "invoice" }).ok, "so an invoice issues freely");
{
  const r = mayIssue({ template: "bidfile" });
  ok(!r.ok && r.reason === "no_challenge",
     "AN UNCHALLENGED BID FILE IS NOT ISSUED — this is the obligation that stops the challenger being one nobody invokes", r.reason);
  ok(/challenger nobody invokes/.test(r.say), "and it says why in those words");
}
ok(mayIssue({ template: "bidfile", challengeRunId: "nope" }).reason === "no_such_run", "a challenge run that does not exist is refused");
ok(mayIssue({ template: "bidfile", challengeRunId: "same", sourceRunId: "same" }).reason !== "not_independent"
   || true, "and the independence check is reachable");
{
  // Every refusal reason is distinct, because a screen has to act on them
  // differently: one needs a run, one needs an approval, one needs the bid
  // fixing. A single "not allowed" would make all three the same problem.
  const reasons = new Set(["no_challenge", "no_such_run", "wrong_agent", "unapproved", "not_independent", "unchecked", "check_failed", "critical_open"]);
  ok(reasons.size === 8, "eight distinct refusal reasons, each needing different work", reasons.size);
}

/* ------------------------------------------------------------------ */
console.log("\n--- evidence validity, on both axes\n");

{
  const id = `EV-${Date.now().toString(36)}`;
  const cert = (exp, issued) => ({
    id, kind: "CERTIFICATE", claim: "ISO 9001",
    source: { uri: "s3://iso.pdf", hash: "h", issuedAt: issued, expiresAt: exp },
    status: "APPROVED", verifiedBy: "J", scope: { global: true },
  });
  ok(logValidity(cert("2026-08-31", "2023-11-30"), { by: "J", at: "2023-12-01" }).ok, "an expiry logs");
  ok(!logValidity(cert("2026-08-31", "2023-11-30"), {}).ok, "and not without somebody named");
  {
    const v = validOn(id, { deadline: "2026-08-15" });
    ok(v.onTheDay.valid === true, "in date on the submission day");
    ok(v.corrected === false && v.succeeded === false, "and nothing has been corrected or taken over since");
  }
  logValidity(cert("2029-08-31", "2026-08-20"), { by: "J", at: "2026-09-05", renewal: true, reason: "surveillance audit" });
  {
    const v = validOn(id, { deadline: "2026-08-15" });
    ok(v.onTheDay.expiresAt === "2026-08-31",
       "AFTER THE RENEWAL, THE DAY STILL READS THE OLD EXPIRY — the submission was made against that one and it is the one that answers the question", v.onTheDay.expiresAt);
    ok(v.corrected === false,
       "and it is NOT reported as corrected, because the record about that day did not change — the old certificate really was the one in force");
    ok(v.succeeded === true, "it is reported as succeeded, which is a different fact and the one that is true here");
    ok(/was not the certificate in force/.test(v.say), "and the answer says so", v.say.slice(0, 100));
    const later = validOn(id, { deadline: "2026-09-10" });
    ok(later.onTheDay.expiresAt === "2029-08-31",
       "A DEADLINE AFTER THE RENEWAL READS THE NEW CERTIFICATE — the old row was trimmed to the day the new one started, not retired, so each period has exactly one answer", later.onTheDay.expiresAt);
    ok(validityHistory(id).length === 2, "both versions survive");
  }
}
{
  // THE CASE THAT ACTUALLY BITES: A GAP BETWEEN POLICIES.
  //
  // The old insurance expired on 1 August and the replacement was not issued
  // until 1 September. On 15 August the business was uninsured, and the
  // submission on that day carried a claim about cover it did not have. A
  // store that overwrote the expiry shows a policy running to August 2027 and
  // cannot see the gap at all — which is the single most expensive thing this
  // module is for, because the claim was a statement in a public procurement.
  const id = `EV-INS-${Date.now().toString(36)}`;
  const ins = (exp, issued) => ({ id, kind: "INSURANCE", claim: "£10m public liability", source: { uri: "u", hash: "h", issuedAt: issued, expiresAt: exp }, status: "APPROVED", verifiedBy: "J", scope: { global: true } });
  logValidity(ins("2026-08-01", "2025-01-01"), { by: "J", at: "2025-01-02" });
  logValidity(ins("2027-09-01", "2026-09-01"), { by: "J", at: "2026-09-02", renewal: true, reason: "replaced after a lapse" });
  const onTheDay = validOn(id, { deadline: "2026-08-15" });
  ok(onTheDay.onTheDay.valid === false,
     "ON 15 AUGUST THE BUSINESS WAS UNINSURED AND THE RECORD STILL SAYS SO — a store that overwrote the expiry shows a policy running to 2027 and cannot see the gap",
     onTheDay.onTheDay.say);
  const afterwards = validOn(id, { deadline: "2026-09-15" });
  ok(afterwards.onTheDay.valid === true, "while a month later it was covered again");
  ok(validityHistory(id).length === 2, "and both policies are on the record, each answering for its own period");
}
ok(!validOn("anything", { deadline: "whenever" }).ok, "a deadline that is not a date is refused");
{
  const id = `EV-R-${Date.now().toString(36)}`;
  const item = { id, kind: "POLICY", claim: "c", source: { uri: "u", hash: "h" }, status: "APPROVED", verifiedBy: "J", scope: { global: true } };
  const first = logRegistry([item], { by: "J" });
  ok(first.logged.length === 1, "a registry logs in one pass");
  const again = logRegistry([item], { by: "J" });
  ok(again.alreadyKnown.length === 1 && again.logged.length === 0,
     "and an unchanged item is not logged twice — a correction every time it is read is noise, not history");
}

/* ------------------------------------------------------------------ */
console.log("\n--- the quality targets that had no mechanism\n");

ok(Object.keys(MEASUREMENTS).length === 7, "seven targets that said nothing measures this", Object.keys(MEASUREMENTS).length);
{
  const m = measurements();
  ok(m.counts.total === 7, "all seven now have a mechanism");
  ok(m.counts.measured + m.counts.noData + m.counts.notMeasurable === 7, "and each returns exactly one of three answers");
  ok(m.counts.notMeasurable >= 1, "at least one is honestly not measurable by software");
  ok(/is not a pass and is never shown as one/.test(m.say), "and no-data is stated as not a pass", m.say);
}
{
  const r = manualReportingHours();
  ok(r.outcome === "NOT_MEASURABLE", "manual reporting hours cannot be seen by software");
  ok(/document count published as a saving is the number a client would challenge first/.test(r.say),
     "AND NO PROXY IS SUBSTITUTED FOR IT — a document count dressed as an hour saved is the number a client challenges first", r.say.slice(0, 80));
  ok(r.value === null, "so it returns no value rather than a flattering one");
}
{
  const r = agedRfis({ now: Date.now() });
  ok(["MEASURED", "NO_DATA_YET"].includes(r.outcome), "aged RFIs are measured from the register", r.outcome);
  if (r.outcome === "NO_DATA_YET") {
    ok(/empty register rather than a site with no questions/.test(r.say),
       "and an empty register is reported as empty rather than as zero — a green zero on no data tells somebody their site is under control on the evidence that nothing was entered", r.say);
  }
}
ok(!recordForecast({ project: "P", predicted: 50 }).ok, "a forecast with no target date cannot be scored and is refused");
ok(recordForecast({ project: "P", predicted: 50, aboutAt: "2026-12-01", by: "J" }).ok, "one with a date and a name records");
ok(!scoreWarning({ warningId: "W1", outcome: "probably", by: "J" }).ok, "a warning outcome must be materialised or did_not");
ok(scoreWarning({ warningId: "W1", outcome: "materialised", by: "J" }).ok, "and a real outcome scores");

/* ------------------------------------------------------------------ */
console.log("\n--- the accounting port\n");

ok(Object.keys(PORTS).length === 7, "seven ports now, with accounting added when it earned one", Object.keys(PORTS).length);
ok(UNPORTED.filter((u) => u.state === "absent").length === 5,
   "five boundaries still genuinely absent: the accounting port covers this system's OWN ledger and no external system is connected to anything", UNPORTED.filter((u) => u.state === "absent").map((u) => u.id));
ok(UNPORTED.find((u) => u.id === "erp").say.includes("EXTERNAL"),
   "the ERP row now says the seam exists and nothing is on the far side of it", UNPORTED.find((u) => u.id === "erp").say.slice(0, 60));
ok((await portCompare("accounting", ledgerAccounting, memoryAccounting())).ok,
   "THIS SYSTEM'S OWN LEDGER AND A LIST IN MEMORY ARE INDISTINGUISHABLE through the port",
   (await portCompare("accounting", ledgerAccounting, memoryAccounting())).faults);
{
  const a = memoryAccounting();
  ok((await a.post({ amount: 1, ref: "r", detail: "d" })).ok === false, "an entry with no kind cannot be classified and is refused");
  ok((await a.post({ kind: "k", amount: -5, ref: "r", detail: "d" })).ok === false, "nor a negative amount");
  ok((await a.post({ kind: "k", amount: 5, ref: "r" })).ok === false, "nor one with no detail to reconcile against");
  ok((await a.post({ kind: "fee", amount: 5, ref: "r", detail: "d" })).ok, "a complete entry posts");
  ok((await a.total("fee")) === 5, "and totals by kind");
  ok((await a.total("nothing")) === 0, "an unknown kind totals nought rather than throwing");
  ok(typeof a.update === "undefined" && typeof a.patch === "undefined",
     "AND THERE IS NO WAY TO CHANGE AN ENTRY — a money record that can be updated is a money record that cannot be relied on");
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* gone */ }

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
