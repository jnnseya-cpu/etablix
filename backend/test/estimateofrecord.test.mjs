/**
 * THE ESTIMATE OF RECORD, NOT A COPY OF IT.
 *
 * A pasted table is correct at the moment it was taken and at no moment
 * after. The estimate moves and the copy does not, so a cross-check against
 * a copy goes on passing against a price that no longer exists — and passes
 * with more confidence than before, because now it has read "the estimate".
 *
 * The rule under test is the one that matters: when a run is named and
 * cannot be read, this REFUSES rather than falling back to the paste. A
 * check that silently degrades from the strong form to the weak form reports
 * the weak form's result in the strong form's words.
 */
import { readEstimateRun, runIdFrom, estimateOfRecordNotes, ESTIMATE_AGENT } from "../lib/estimateofrecord.js";
import { reconcileRegistersToEstimate, estimateCrossNotes, estimateCrossStatement } from "../lib/tendercheck.js";

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 320)}` : ""}`); }
};

const RUN_ID = "3f9a1b2c4d5e6f70";

console.log("\n=== finding the reference in whatever somebody typed ===\n");
ok(runIdFrom(RUN_ID) === RUN_ID, "a bare run id");
ok(runIdFrom(`Run ${RUN_ID}`) === RUN_ID, "and one in a sentence, because that is how a run is quoted");
ok(runIdFrom(`https://etablix.com/platform/runs/${RUN_ID}`) === RUN_ID, "and one in a pasted URL");
ok(runIdFrom(RUN_ID.toUpperCase()) === RUN_ID, "read case-insensitively and returned in the store's own case");
ok(runIdFrom("the estimate Justin did last week") === null,
   "AND A DESCRIPTION IS NOT A REFERENCE — it does not guess at which run was meant");
ok(runIdFrom("") === null && runIdFrom(null) === null, "nothing is nothing");

console.log("\n=== the estimating engine's own schedule, read as it stands ===\n");
// The row shape price() emits: `what` is its description field, and the
// reference to a risk sits in it exactly as an estimator would write it.
const SCHEDULE = {
  id: RUN_ID,
  agent: ESTIMATE_AGENT,
  agentName: "Estimator",
  status: "approved",
  title: "ITT-2026-114 priced schedule",
  machine: {
    result: {
      lines: [
        { id: "4.12", what: "Groundworks package incl. allowance for RK-1", quantity: 1, rate: 18000, total: 18000, scopeItemId: "S-1" },
        { id: "2.03", what: "Temporary bellmouth to site access (RK-4)", quantity: 1, rate: 6500, total: 6500, scopeItemId: "S-2" },
        { id: "9.01", what: "Central contingency — covers RK-2, RK-3", quantity: 1, rate: 21000, total: 21000 },
      ],
      refused: [],
      total: 45500,
      assurance: { ok: true },
    },
  },
};

const RK_REG = `| Ref | Cause, event, impact | Allowance sits | Value | Treatment | Accepted by |
|---|---|---|---|---|---|
| RK-1 | Ground conditions worse than the trial pits | PACKAGE QUOTE | 18,000 | Priced in groundworks | J Nseya |
| RK-2 | Outage window slips, welfare stands idle | CENTRAL CONTINGENCY | 12,000 | Accepted | J Nseya |
| RK-3 | Local accommodation unavailable at peak | CENTRAL CONTINGENCY | 9,000 | Accepted | J Nseya |
| RK-4 | Access road needs a temporary bellmouth | BASE ESTIMATE | 6,500 | Priced in preliminaries | J Nseya |`;

{
  const r = readEstimateRun(SCHEDULE);
  ok(r.ok && r.lines.length === 3, "three priced lines read off the run", r);
  ok(r.approved === true && /approved/.test(r.say), "and the run's status is carried, not assumed", r.say);
  ok(r.total === 45500 && r.assuranceOk === true, "with the engine's own total and verdict", { t: r.total, a: r.assuranceOk });
}
{
  // The whole point: the register's claims hold against the engine's rows,
  // read through `what` and `quantityBasis` rather than a pasted column.
  const rec = readEstimateRun(SCHEDULE);
  const x = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: rec.lines,
    refusedLines: rec.refused,
    source: { kind: "run", runId: rec.runId, say: rec.say },
  });
  ok(x.ok, "THE REGISTERS RECONCILE TO THE ESTIMATE OF RECORD", { f: x.faults, ...x });
  ok(x.compared.pricedLines === 2 && x.compared.contingencyLines === 1,
     "the engine's contingency line is told apart by its own description", x.compared);
  ok(x.source.kind === "run" && x.source.runId === RUN_ID,
     "and the result says which estimate it read, because a copy and the record look identical afterwards", x.source);
  ok(new RegExp(`priced line\\(s\\) read from estimating run ${RUN_ID}`).test(estimateCrossStatement(x)),
     "the statement names the run", estimateCrossStatement(x));
}
{
  // A line whose reference sits in quantityBasis rather than the description.
  const run = {
    ...SCHEDULE,
    machine: { result: { lines: [
      { id: "4.12", what: "Groundworks package", quantityBasis: "measured, plus the RK-1 allowance", total: 18000 },
    ], refused: [], total: 18000 } },
  };
  const rec = readEstimateRun(run);
  const x = reconcileRegistersToEstimate({
    risks: `| Ref | Cause, event, impact | Allowance sits | Value | Treatment | Accepted by |
|---|---|---|---|---|---|
| RK-1 | Ground conditions | PACKAGE QUOTE | 18,000 | Priced | J Nseya |`,
    estimateItems: rec.lines,
  });
  ok(x.ok, "a reference in the quantity basis is read as readily as one in the description", { f: x.faults, ...x });
}

console.log("\n=== a line the engine refused is a finding of its own ===\n");
{
  // price() does not drop an inadmissible line: it refuses it, keeps it, and
  // reports its own total as understated. An allowance on such a line is in
  // the schedule and is not in the price — which is NOT the same defect as
  // an allowance nobody wrote down, and the fix is not the same either.
  const run = {
    ...SCHEDULE,
    machine: {
      result: {
        lines: [
          { id: "2.03", what: "Temporary bellmouth (RK-4)", total: 6500 },
          { id: "9.01", what: "Central contingency — covers RK-2, RK-3", total: 21000 },
        ],
        // The shape price() emits for a line it would not admit: the
        // reference, what it was, and why. `what` is there because without
        // it the cross-check cannot tell which risk the allowance was for.
        refused: [{ id: "4.12", what: "Groundworks package incl. RK-1 allowance", faults: ["no source date, so the rate cannot be aged"] }],
        total: 27500,
      },
    },
  };
  const rec = readEstimateRun(run);
  ok(rec.ok && rec.refused.length === 1 && rec.lines.length === 2,
     "the refused line is carried separately and is NOT merged back into the price", rec);
  ok(/the engine refused are carried separately and are not in its total/.test(rec.say),
     "and the engine's own position on it is repeated rather than overruled", rec.say);

  const x = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: rec.lines,
    refusedLines: rec.refused,
    source: { kind: "run", runId: rec.runId, say: rec.say },
  });
  ok(x.allowanceOnRefusedLine.some((y) => y.ref === "RK-1" && y.line === "4.12"),
     "AN ALLOWANCE ON A REFUSED LINE IS REPORTED AS ITS OWN DEFECT", x.allowanceOnRefusedLine);
  ok(/The fix is the line, not another allowance/.test(estimateCrossNotes(x).join(" ")),
     "and the note says not to price the risk twice fixing it", estimateCrossNotes(x));
  ok(x.compared.refusedLines === 1, "the count of refused lines travels with the result", x.compared);
  ok(!x.allowanceClaimedNotPriced.some((y) => y.ref === "RK-1"),
     "AND IT REPLACES THE WEAKER FINDING RATHER THAN SITTING BESIDE IT — \"the decision was made and never arrived\" is untrue here and points at the wrong remedy",
     x.allowanceClaimedNotPriced);
  ok(x.faults === 1, "so one defect produces one finding", { f: x.faults, ...x });
}

console.log("\n=== it refuses rather than falling back ===\n");
{
  const r = readEstimateRun(null, { wanted: RUN_ID });
  ok(!r.ok && r.reason === "no_such_run", "a named run that does not exist", r);
  ok(r.lines.length === 0, "and it hands back no lines rather than an empty estimate that would reconcile to anything", r.lines);
}
{
  const r = readEstimateRun({ id: "x1", agent: "bid", agentName: "Workstream 2 — Bid Response" });
  ok(!r.ok && r.reason === "wrong_agent", "ANOTHER AGENT'S OUTPUT IS NOT A PRICED SCHEDULE", r.say);
}
{
  const r = readEstimateRun({ id: "x2", agent: ESTIMATE_AGENT, status: "running" });
  ok(!r.ok && r.reason === "no_schedule", "an estimating run that carries no schedule yet", r.say);
}
{
  const r = readEstimateRun({ id: "x3", agent: ESTIMATE_AGENT, status: "awaiting_approval", machine: { result: { lines: [], refused: [], total: 0 } } });
  ok(r.ok && r.approved === false && /awaiting_approval/.test(r.say),
     "AN UNAPPROVED ESTIMATE IS STILL READ, AND SAID TO BE UNAPPROVED — refusing until approval would mean the check only ever ran after it was useful",
     r.say);
}
{
  const notes = estimateOfRecordNotes(readEstimateRun(null, { wanted: RUN_ID }));
  ok(notes.length === 1, "a failure to read the estimate writes exactly one note");
  ok(/NOT checked against the price/.test(notes[0]),
     "which says the check did not run rather than implying the estimate is wrong", notes[0]);
  ok(/not a finding about the estimate/.test(notes[0]),
     "and says so in terms, because the estimate may be perfectly good", notes[0]);
}
{
  ok(estimateOfRecordNotes(readEstimateRun(SCHEDULE)).length === 0, "and a run that read cleanly writes none");
  ok(estimateOfRecordNotes(null).length === 0, "as does no attempt at all");
}

console.log("\n=== a schedule the engine admitted none of ===\n");
{
  // Every line refused. This is not "no lines supplied": the estimate exists,
  // it was read, and the engine would not admit any of it. Saying the two in
  // the same words buries the louder fact.
  const rec = readEstimateRun({
    id: RUN_ID, agent: ESTIMATE_AGENT, status: "awaiting_approval",
    machine: { result: { lines: [], refused: [
      { id: "1.01", what: "Preliminaries, on the AS-1 basis", faults: ["lineage missing: quotation validity"] },
      { id: "1.02", what: "Welfare, 60 weeks", faults: ["lineage missing: escalation"] },
    ], total: 0 } },
  });
  const x = reconcileRegistersToEstimate({
    risks: RK_REG, estimateItems: rec.lines, refusedLines: rec.refused,
    source: { kind: "run", runId: rec.runId, say: rec.say },
  });
  ok(/admitted none of it/.test(estimateCrossStatement(x)),
     "THE STATEMENT SAYS THE ENGINE ADMITTED NONE OF IT, not that no lines were supplied", estimateCrossStatement(x));
  ok(/understated by the whole of the schedule/.test(estimateCrossStatement(x)),
     "and what that does to the total", estimateCrossStatement(x));
  ok(x.allowanceOnRefusedLine.some((y) => y.ref === "AS-1"),
     "with the allowance on each refused line still named", x.allowanceOnRefusedLine);
}

console.log("\n=== the copy is still readable, and is still labelled a copy ===\n");
{
  const x = reconcileRegistersToEstimate({
    risks: RK_REG,
    estimateItems: [
      { id: "4.12", description: "Groundworks incl. RK-1", value: "18,000" },
      { id: "2.03", description: "Bellmouth (RK-4)", value: "6,500" },
      { id: "9.01", description: "Central contingency — RK-2, RK-3", value: "21,000" },
    ],
  });
  ok(x.ok, "a pasted table still reconciles", { f: x.faults, ...x });
  ok(x.source.kind === "supplied",
     "and is marked as supplied rather than as the record — the two deserve different trust and otherwise look the same", x.source);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
