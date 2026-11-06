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
  reconcileRegistersToEstimate, estimateCrossNotes, estimateCrossStatement,
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


console.log("\n=== the registers against the price ===\n");

// A risk register making four claims about where the money sits.
const RK_REG = `| Ref | Cause, event, impact | Allowance sits | Value | Treatment | Accepted by |
|---|---|---|---|---|---|
| RK-1 | Ground conditions worse than the trial pits | PACKAGE QUOTE | 18,000 | Priced in the groundworks package | J Nseya |
| RK-2 | Outage window slips, welfare stands idle | CENTRAL CONTINGENCY | 12,000 | Accepted | J Nseya |
| RK-3 | Local accommodation unavailable at peak | CENTRAL CONTINGENCY | 9,000 | Accepted | J Nseya |
| RK-4 | Access road needs a temporary bellmouth | BASE ESTIMATE | 6,500 | Priced in preliminaries | J Nseya |`;

const CLEAN_ESTIMATE = [
  { id: "4.12", description: "Groundworks package — includes allowance for RK-1", total: "18,000" },
  { id: "2.03", description: "Temporary bellmouth to site access (RK-4)", total: "6,500" },
  { id: "9.01", description: "Central contingency — covers RK-2, RK-3", total: "21,000" },
];

{
  const r = reconcileRegistersToEstimate({ risks: RK_REG, estimateItems: CLEAN_ESTIMATE });
  ok(r.ok, "a register whose claims are all in the price reconciles", { f: r.faults, ...r });
  ok(r.compared.pricedLines === 2 && r.compared.contingencyLines === 1,
     "the contingency line is told apart from the priced lines by its own name", r.compared);
  ok(/21000 of risk against a contingency of 21000/.test(r.contingencyCover.say),
     "and the contingency arithmetic is stated, not assumed", r.contingencyCover.say);
  ok(/reconcile to 2 priced line/.test(estimateCrossStatement(r)), "the statement says what was compared", estimateCrossStatement(r));
  ok(estimateCrossNotes(r).length === 0, "and a clean cross-check writes no notes", estimateCrossNotes(r));
}

console.log("\n=== 1 · the allowance that is claimed and is not there ===\n");
{
  // RK-1 says the money is in the groundworks package. The groundworks
  // package does not mention it. Every document reads correctly.
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks package", total: "18,000" },
      { id: "2.03", description: "Temporary bellmouth to site access (RK-4)", total: "6,500" },
      { id: "9.01", description: "Central contingency — covers RK-2, RK-3", total: "21,000" },
    ],
  });
  ok(!r.ok && r.allowanceClaimedNotPriced.some((x) => x.ref === "RK-1"),
     "A CLAIM ABOUT THE PRICE THAT THE PRICE DOES NOT CARRY", r.allowanceClaimedNotPriced);
  ok(/never arrived/.test(estimateCrossNotes(r).join(" ")), "and the note says what that means");
}
{
  // The contingency does not exist at all, and two risks are funded from it.
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks (RK-1)", total: "18,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
    ],
  });
  ok(r.allowanceClaimedNotPriced.filter((x) => x.claimed === "CENTRAL CONTINGENCY").length === 2,
     "TWO RISKS FUNDED FROM A CONTINGENCY THAT IS NOT IN THE ESTIMATE", r.allowanceClaimedNotPriced);
  ok(!r.contingencyCover.ok && r.contingencyCover.available === null,
     "and the cover test says the contingency was never stated", r.contingencyCover);
}

console.log("\n=== 2 · money against a record that does not exist ===\n");
{
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [...CLEAN_ESTIMATE, { id: "5.40", description: "Allowance for RK-7 piling risk", total: "4,000" }],
  });
  ok(!r.ok && r.pricedNotRegistered.some((x) => x.ref === "RK-7"),
     "FOUR THOUSAND POUNDS AGAINST AN RK-7 THAT DOES NOT EXIST", r.pricedNotRegistered);
  ok(/uncovered/.test(estimateCrossNotes(r).join(" ")), "and the note names the consequence, which is the exposure");
}
{
  // The same, on the contingency rather than a priced line.
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks (RK-1)", total: "18,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
      { id: "9.01", description: "Central contingency — RK-2, RK-3, RK-9", total: "21,000" },
    ],
  });
  ok(r.pricedNotRegistered.some((x) => x.ref === "RK-9" && x.lines[0] === "(contingency)"),
     "a contingency covering a risk nobody registered is the same defect", r.pricedNotRegistered);
}

console.log("\n=== 3 · the double count, proved rather than read off a cell ===\n");
{
  // RK-1's cell says PACKAGE QUOTE only. The register reconciles against
  // itself perfectly. The money is in the groundworks package AND in the
  // contingency, and only the estimate shows it.
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks package incl. RK-1", total: "18,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
      { id: "9.01", description: "Central contingency — RK-1, RK-2, RK-3", total: "39,000" },
    ],
  });
  ok(!r.ok && r.fundedTwice.some((x) => x.ref === "RK-1"),
     "FUNDED TWICE — and the register alone could never have shown it", r.fundedTwice);
  ok(/nobody can find afterwards/.test(estimateCrossNotes(r).join(" ")),
     "the note says where the duplication actually costs money", estimateCrossNotes(r));
  // And the register's own double-count test, on the same data, finds nothing.
  const self = reconcileTenderRegisters({ risks: RK_REG });
  ok(self.doubleCounted.length === 0,
     "THE REGISTER-TO-REGISTER CHECK SEES NOTHING HERE, WHICH IS WHY THIS ONE EXISTS", self.doubleCounted);
}

console.log("\n=== 4 · the register and the estimate disagreeing about a figure ===\n");
{
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks package incl. RK-1", total: "4,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
      { id: "9.01", description: "Central contingency — RK-2, RK-3", total: "21,000" },
    ],
  });
  const d = r.valueDisagrees.find((x) => x.ref === "RK-1");
  ok(d && d.register === 18000 && d.estimate === 4000,
     "EIGHTEEN THOUSAND IN THE REGISTER, FOUR IN THE LINE THAT CARRIES IT", r.valueDisagrees);
  ok(/two numbers/.test(estimateCrossNotes(r).join(" ")), "and settlement cannot be held on two numbers");
}
{
  // Two lines between them carrying the registered value is not a disagreement.
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12a", description: "Groundworks, RK-1 part one", total: "10,000" },
      { id: "4.12b", description: "Groundworks, RK-1 part two", total: "8,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
      { id: "9.01", description: "Central contingency — RK-2, RK-3", total: "21,000" },
    ],
  });
  ok(r.valueDisagrees.length === 0, "an allowance split across two lines adds up and is not a fault", r.valueDisagrees);
}
{
  // A line whose value cannot be read is not reported as a disagreement.
  // "Unreadable" and "wrong" are different findings and the estimating
  // engine owns the first one.
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks incl. RK-1", total: "see package" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
      { id: "9.01", description: "Central contingency — RK-2, RK-3", total: "21,000" },
    ],
  });
  ok(r.valueDisagrees.length === 0,
     "AN UNREADABLE FIGURE IS NOT A DISAGREEMENT — it is not this module's finding to make", r.valueDisagrees);
}

console.log("\n=== 5 · the contingency spent before the bid is submitted ===\n");
{
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks incl. RK-1", total: "18,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
      { id: "9.01", description: "Central contingency — RK-2, RK-3", total: "15,000" },
    ],
  });
  ok(!r.contingencyCover.ok && r.contingencyCover.claimed === 21000 && r.contingencyCover.available === 15000,
     "TWENTY-ONE THOUSAND OF RISK AGAINST A FIFTEEN THOUSAND CONTINGENCY", r.contingencyCover);
  ok(/6000 of the register has no money behind it/.test(r.contingencyCover.say),
     "and it states the shortfall rather than the ratio", r.contingencyCover.say);
  ok(/defensible on its own/.test(estimateCrossNotes(r).join(" ")), "the note says why nobody caught it");
}
{
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks incl. RK-1", total: "18,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
    ],
    contingency: { value: "21,000", description: "central contingency covering RK-2 and RK-3" },
  });
  ok(r.ok, "the contingency may be passed separately rather than as a line", { f: r.faults, c: r.contingencyCover });
}
{
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks incl. RK-1", total: "18,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
      { id: "9.01", kind: "CONTINGENCY", description: "Allowed against RK-2 and RK-3", total: "21,000" },
    ],
  });
  ok(r.ok, "or marked by a kind field rather than by its wording", { f: r.faults, c: r.contingencyCover });
}

console.log("\n=== 6 · an answer that says it changed the price ===\n");
{
  const cl = `| Ref | Question | Status | What changed | Carried to |
|---|---|---|---|---|
| CL-1 | Is the HV supply client-provided? | ANSWERED | Estimate line 4.12 reduced, generation cut | - |
| CL-2 | Where is the water connection? | ANSWERED | Drawing 102 reissued | - |`;
  const r = reconcileRegistersToEstimate({
    clarifications: cl,
    estimateItems: [{ id: "4.12", description: "Groundworks package", total: "18,000" }],
  });
  ok(r.answerNotInEstimate.length === 1 && r.answerNotInEstimate[0].ref === "CL-1",
     "AN ANSWER RECORDED AS PRICED IN, WHERE NO LINE CARRIES IT", r.answerNotInEstimate);
  ok(!r.answerNotInEstimate.some((x) => x.ref === "CL-2"),
     "and an answer that changed a drawing is not this check's business", r.answerNotInEstimate);
}
{
  const cl = `| Ref | Question | Status | What changed | Carried to |
|---|---|---|---|---|
| CL-1 | Is the HV supply client-provided? | ANSWERED | Estimate line 4.12 reduced | - |`;
  const r = reconcileRegistersToEstimate({
    clarifications: cl,
    estimateItems: [{ id: "4.12", description: "Groundworks package, revised per CL-1", total: "12,000" }],
  });
  ok(r.answerNotInEstimate.length === 0, "and when the line carries the reference, the reply is implemented", r);
}

console.log("\n=== what it refuses to infer ===\n");
{
  // An unreferenced line for exactly eighteen thousand pounds, sitting next
  // to an unmatched eighteen-thousand-pound risk. The figures agree. Nothing
  // says they are the same money, and guessing is how two unrelated numbers
  // become a reconciliation.
  const r = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks package", total: "18,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", total: "6,500" },
      { id: "9.01", description: "Central contingency — RK-2, RK-3", total: "21,000" },
    ],
  });
  ok(r.allowanceClaimedNotPriced.some((x) => x.ref === "RK-1"),
     "A MATCHING FIGURE IS NOT A LINK — the allowance is still reported as absent", r.allowanceClaimedNotPriced);
}
{
  const r = reconcileRegistersToEstimate({ risks: RK_REG, estimateItems: [] });
  ok(/could not be tested/.test(estimateCrossStatement(r)),
     "with no priced lines it says the claims could not be tested, not that they passed", estimateCrossStatement(r));
}
{
  const r = reconcileRegistersToEstimate({});
  ok(r.faults === 0 && /could not be tested/.test(estimateCrossStatement(r)),
     "and on nothing at all it invents no findings", r);
}
{
  ok(estimateCrossNotes(null).length === 0 && /were not compared/.test(estimateCrossStatement(null)),
     "a cross-check that never ran says so rather than reporting silence as agreement");
}
{
  // Quantity times rate is a total nobody wrote down, and it is read.
  const r = reconcileRegistersToEstimate({
    risks: `| Ref | Cause, event, impact | Allowance sits | Value | Treatment | Accepted by |
|---|---|---|---|---|---|
| RK-1 | Standby welfare during the outage | PACKAGE QUOTE | 6,000 | Priced | J Nseya |`,
    estimateItems: [{ id: "7.1", description: "Welfare standby, RK-1", quantity: "4", rate: "1,500" }],
  });
  ok(r.ok, "a line priced as quantity times rate is read as its product", { f: r.faults, v: r.valueDisagrees });
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
