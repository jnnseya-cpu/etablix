/**
 * THE FIVE REGISTERS, AND THE RULE THAT NOTHING VANISHES BETWEEN THEM.
 *
 * Each of the failures below is invisible to a reader checking the sections
 * one at a time, because each section is correct on its own. They are only
 * wrong in combination, which is the whole reason a machine reads them.
 */
import {
  reconcileTenderRegisters, checkSiteVisit, tenderNotes, tenderStatement,
  refsIn, allowancePlaces, CLARIFICATION_STATUS, OBSERVATION_KINDS,
} from "../lib/tendercheck.js";

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 300)}` : ""}`); }
};

console.log("\n=== references read as numbers, so CL-04 and CL-4 are one record ===\n");
ok(refsIn("see CL-04 and CL-4 and CL-11", "clarification").join(",") === "CL-4,CL-11",
   "a reference typed two ways is one reference", refsIn("CL-04 CL-4 CL-11", "clarification"));
ok(refsIn("RK-1 and AS-1", "risk").join(",") === "RK-1", "and the kinds do not bleed into each other");
ok(refsIn("", "nonsense").length === 0, "an unknown kind finds nothing rather than throwing");

console.log("\n=== a clean set of registers reconciles ===\n");
const CLEAN = {
  clarifications: `| Ref | Question | Status | What changed | Carried to |
|---|---|---|---|---|
| CL-1 | Is the supply client-provided? | ANSWERED | Estimate line 4.12 cut by 8 weeks of generation | - |
| CL-2 | What is the outage window? | UNANSWERED | - | RK-3 |
| CL-3 | Font size? | ANSWERED | NO CHANGE | - |
| CL-4 | Withdrawn on reflection | WITHDRAWN | - | - |`,
  assumptions: `| Ref | Assumption | Basis | Limits the offer | Qualification |
|---|---|---|---|---|
| AS-1 | Temporary generation for 16 weeks | CL-1 answered | Yes | QU-2 |
| AS-2 | Normal working hours | Planning condition 7 | No | - |`,
  risks: `| Ref | Cause, event, impact | Allowance sits | Value | Treatment | Accepted by |
|---|---|---|---|---|---|
| RK-3 | Energisation slips, generator hire extends | CENTRAL CONTINGENCY | 42000 | Compensation event | J Nseya |`,
  qualifications: `| Ref | Departure |
|---|---|
| QU-2 | Generation beyond 16 weeks priced separately |`,
  opportunities: `| Ref | Opportunity |
|---|---|
| OP-1 | Earlier permanent connection removes part of the hire |`,
};
{
  const r = reconcileTenderRegisters(CLEAN);
  ok(r.ok, "every answer landed, every open question was carried, every risk is funded once", r);
  ok(r.faults === 0 && tenderNotes(r).length === 0, "and a clean set produces no notes at all");
  ok(/reconcile/.test(tenderStatement(r)), "the statement says so in one sentence", tenderStatement(r));
  ok(r.counts.clarifications === 4 && r.counts.assumptions === 2 && r.counts.risks === 1,
     "each register is counted separately", r.counts);
}

console.log("\n=== the answer that was read and never applied ===\n");
{
  const r = reconcileTenderRegisters({
    ...CLEAN,
    clarifications: `| Ref | Question | Status | What changed |
|---|---|---|---|
| CL-1 | Is the supply client-provided? | ANSWERED |  |`,
  });
  ok(r.answeredNotLanded.length === 1 && r.answeredNotLanded[0].ref === "CL-1",
     "AN ANSWERED CLARIFICATION WITH NO RECORD OF WHAT IT CHANGED — six people read it and the price did not move",
     r.answeredNotLanded);
  ok(/estimate line/.test(tenderNotes(r).join(" ")), "and the note says what implemented means", tenderNotes(r)[0]);
}
{
  const r = reconcileTenderRegisters({
    ...CLEAN,
    clarifications: `| Ref | Question | Status | What changed |
|---|---|---|---|
| CL-1 | Supply? | ANSWERED | Noted with thanks |`,
  });
  ok(r.answeredNotLanded.length === 1,
     "a reply recorded as 'noted' names no estimate line, no activity and no document", r.answeredNotLanded);
}

console.log("\n=== the open question that was priced by accident ===\n");
{
  const r = reconcileTenderRegisters({
    ...CLEAN,
    clarifications: `| Ref | Question | Status | What changed | Carried to |
|---|---|---|---|---|
| CL-2 | What is the outage window? | UNANSWERED | - | - |`,
  });
  ok(r.openNotCarried.length === 1 && r.openNotCarried[0].ref === "CL-2",
     "AN UNANSWERED QUESTION CARRIED NOWHERE — it is still priced, just by nobody in particular", r.openNotCarried);
}
{
  // Named but pointing at a record that does not exist is the same failure
  // wearing a reference number.
  const r = reconcileTenderRegisters({
    ...CLEAN,
    clarifications: `| Ref | Question | Status | What changed | Carried to |
|---|---|---|---|---|
| CL-2 | Outage? | UNANSWERED | - | RK-99 |`,
  });
  ok(r.openNotCarried.length === 1, "a destination that does not exist is not a destination", r.openNotCarried);
}

console.log("\n=== the limit the buyer never sees ===\n");
{
  const r = reconcileTenderRegisters({
    ...CLEAN,
    assumptions: `| Ref | Assumption | Basis | Limits the offer | Qualification |
|---|---|---|---|---|
| AS-1 | Access on seven days a week | Our own reading | Yes | - |`,
  });
  ok(r.limitsWithoutQualification.length === 1,
     "AN ASSUMPTION THAT NARROWS THE OFFER AND REACHES NO QUALIFICATION — the departure is invisible until the evaluator finds it",
     r.limitsWithoutQualification);
}
{
  const r = reconcileTenderRegisters({
    ...CLEAN,
    assumptions: `| Ref | Assumption | Basis | Limits the offer | Qualification |
|---|---|---|---|---|
| AS-2 | Normal working hours | Planning condition 7 | No | - |`,
  });
  ok(r.limitsWithoutQualification.length === 0,
     "an assumption that does not limit the offer needs no qualification");
}

console.log("\n=== the risk funded twice, and the risk funded not at all ===\n");
{
  const r = reconcileTenderRegisters({
    ...CLEAN,
    risks: `| Ref | Cause, event, impact | Allowance sits | Value | Treatment | Accepted by |
|---|---|---|---|---|---|
| RK-1 | Unknown ground | PACKAGE QUOTE and CENTRAL CONTINGENCY | 10000 | Risk register | J Nseya |
| RK-2 | Weather | NONE | - | - | - |`,
  });
  ok(r.doubleCounted.length === 1 && r.doubleCounted[0].ref === "RK-1",
     "COUNTED TWICE — the same exposure funded in a package quote and in contingency", r.doubleCounted);
  ok(r.unfunded.length === 1 && r.unfunded[0].ref === "RK-2",
     "NO FUNDED RESPONSE — no value, no contractual treatment, nobody's acceptance", r.unfunded);
  ok(/dearer than it needs to be/.test(tenderNotes(r).join(" ")),
     "and the note says what the double count costs", tenderNotes(r).join(" ").slice(0, 80));
}
{
  // NONE is a legitimate answer when somebody decided it.
  const r = reconcileTenderRegisters({
    ...CLEAN,
    risks: `| Ref | Cause, event, impact | Allowance sits | Value | Treatment | Accepted by |
|---|---|---|---|---|---|
| RK-2 | Weather | NONE | - | Accepted, within normal allowance | J Nseya |`,
  });
  ok(r.unfunded.length === 0, "an unpriced risk with a treatment and an acceptance is a decision, not a gap");
}

console.log("\n=== a status outside the four cannot be acted on ===\n");
{
  const r = reconcileTenderRegisters({
    ...CLEAN,
    clarifications: `| Ref | Question | Status | What changed |
|---|---|---|---|
| CL-9 | Who signs? | CHASING | - |`,
  });
  ok(r.unreadableStatus.length === 1, "'CHASING' is not one of the four", r.unreadableStatus);
  ok(CLARIFICATION_STATUS.length === 4, "and there are exactly four", CLARIFICATION_STATUS);
}

console.log("\n=== the allowance reader ===\n");
ok(allowancePlaces("PACKAGE QUOTE").join() === "PACKAGE QUOTE", "one place is one place");
ok(allowancePlaces("package quote and central contingency").length === 2, "two is the double count");
ok(allowancePlaces("").length === 0, "blank is no places, not a place called blank");
ok(allowancePlaces("NONE").join() === "NONE", "NONE is an answer");

console.log("\n=== no registers at all is reported, not passed ===\n");
{
  const r = reconcileTenderRegisters({});
  ok(r.read === 0, "nothing was read");
  ok(/nothing could be reconciled/.test(tenderStatement(r)),
     "and the statement says so rather than reporting a clean bill", tenderStatement(r));
}

console.log("\n=== the site visit, and the three-way distinction ===\n");
{
  const v = checkSiteVisit({
    visited: "yes", date: "2026-11-04",
    observations: "OBSERVED: an existing chamber in the proposed crane area\nSTATED: the operator says the east gate is unlocked\nUNCONFIRMED: the drainage outfall position",
  });
  ok(v.ok && v.visited === true, "a visit with every line classified passes", v);
}
{
  const v = checkSiteVisit({
    visited: "yes", date: "2026-11-04",
    observations: "OBSERVED: a chamber in the crane area\nthe ground looks firm enough",
  });
  ok(!v.ok && v.unclassified.length === 1,
     "A LINE THAT DOES NOT SAY WHICH OF THE THREE IT IS — in a dispute that is the only question about it", v.unclassified);
}
ok(OBSERVATION_KINDS.length === 3, "there are three kinds and no fourth", OBSERVATION_KINDS);
{
  const v = checkSiteVisit({ visited: "no", pricedBlind: "access geometry and ground bearing" });
  ok(v.ok && v.visited === false,
     "not visiting is a permitted answer when what was priced unseen is named");
}
{
  const v = checkSiteVisit({ visited: "no" });
  ok(!v.ok, "NOT VISITING AND NOT SAYING WHAT WAS PRICED BLIND — the assumptions are invisible to the approver", v.say);
}
{
  const v = checkSiteVisit({});
  ok(!v.ok && v.visited === null,
     "and saying nothing at all is not the same as recording that no visit was made", v.say);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
