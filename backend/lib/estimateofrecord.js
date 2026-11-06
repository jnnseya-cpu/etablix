/**
 * The estimate of record — the priced schedule the estimating engine holds,
 * read by reference rather than retyped.
 *
 * The register cross-check reads priced lines. Until now it read whatever
 * somebody pasted into a field on the bid agent, and that was a real
 * improvement on reading the register against itself: a claim about the price
 * was at last tested against a price. But it was tested against a COPY of the
 * price, and the gap between a copy and the record is where this system's
 * whole argument lives.
 *
 * WHY A PASTED COPY IS NOT GOOD ENOUGH, SAID PRECISELY.
 *
 * A copy is correct at the moment it is taken and at no moment after. The
 * estimate moves — a quote lands, a quantity is remeasured, a line is split
 * in two — and the pasted table does not. So the cross-check goes on passing
 * against a price that no longer exists, and it passes with more confidence
 * than before, because now it has read "the estimate". That is worse than the
 * weak version of the check: a check that is wrong is worse than a check that
 * is narrow, because nobody allows for it.
 *
 * And a copy is retyped. Retyping is where £18,000 becomes £1,800, and the
 * cross-check's most valuable finding — the register and the estimate
 * disagreeing about a figure — is precisely the finding a transcription error
 * fabricates. A check whose strongest alarm is also its commonest false
 * alarm will be switched off.
 *
 * So this reads the run. An estimating-engine run carries, on
 * `machine.result`, the priced schedule as the engine admitted it: every line
 * with its quantity, rate, total and lineage, the lines the engine REFUSED
 * and why, and the nine assurance tests. That is the estimate of record, and
 * it is the same object the price was approved from.
 *
 * IT REFUSES RATHER THAN FALLING BACK.
 *
 * If a run is named and cannot be read — no such run, the wrong agent, no
 * machine result — this does NOT quietly use the pasted table instead. A
 * check that silently degrades from the strong form to the weak form reports
 * the weak form's result in the strong form's words, and nobody downstream
 * can tell which one they are reading. Naming a run is a statement that the
 * estimate of record is the thing being checked; if it cannot be, the honest
 * output is that it was not.
 *
 * AN UNAPPROVED ESTIMATE IS STILL READ, AND SAID TO BE UNAPPROVED.
 *
 * This is the one place it does not refuse. A bid and its estimate are worked
 * up at the same time, and refusing to check an estimate until it is approved
 * would mean the cross-check only ever ran after the moment it was useful.
 * So the lines are read at whatever status the run is at, and the status is
 * carried into the statement. "Read from a run that is awaiting approval" is
 * a useful sentence; "the estimate could not be checked because nobody has
 * approved it yet" is how a control ends up only ever being run too late.
 */

import { collection } from "./store.js";

/** The agent whose runs are estimates. Nothing else is. */
export const ESTIMATE_AGENT = "estimating";

/**
 * A run id out of whatever a person typed into the field.
 *
 * The field is free text because that is what the comparable field on the
 * challenger is, and because somebody pasting a run id will paste "Run
 * 3f9a…" or a URL as readily as the bare id. Sixteen hex characters is the
 * store's id, and it is distinctive enough to find in a sentence.
 */
export function runIdFrom(text) {
  const m = String(text || "").match(/\b[0-9a-f]{16}\b/i);
  return m ? m[0].toLowerCase() : null;
}

/**
 * Read a run row as an estimate. Pure: the row is passed in, so this is
 * testable without a store.
 *
 * `lines` are the admissible lines, in the shape the register cross-check
 * reads. `refused` are the lines the engine would not admit, carried
 * separately and NOT merged in — the engine excluded them from its own total
 * and quietly adding them back here would overrule it.
 */
export function readEstimateRun(run, { wanted = null } = {}) {
  if (!run) {
    return {
      ok: false, reason: "no_such_run", lines: [], refused: [], status: null, runId: wanted ? String(wanted) : null,
      say: "the estimate run named on this bid does not exist, so there is no estimate of record to check the registers against",
    };
  }
  if (run.agent !== ESTIMATE_AGENT) {
    return {
      ok: false, reason: "wrong_agent", lines: [], refused: [], status: run.status || null, runId: run.id,
      say: `run ${run.id} is ${run.agentName || run.agent}, not the estimating engine — another agent's output is not a priced schedule`,
    };
  }
  const result = run.machine?.result;
  if (!result || !Array.isArray(result.lines)) {
    return {
      ok: false, reason: "no_schedule", lines: [], refused: [], status: run.status || null, runId: run.id,
      say: `run ${run.id} carries no priced schedule, so there is nothing in it to compare the registers to`,
    };
  }

  // The engine's own row shape, passed through unchanged. `what` is its
  // description field and `quantityBasis` is where a basis reference sits;
  // both are read for register references by the cross-check, which is why
  // they are not flattened away here.
  const lines = result.lines.filter(Boolean);
  const refused = (Array.isArray(result.refused) ? result.refused : []).filter(Boolean);

  return {
    ok: true,
    reason: null,
    runId: run.id,
    status: run.status || null,
    approved: run.status === "approved",
    title: run.title || null,
    lines,
    refused,
    total: typeof result.total === "number" ? result.total : null,
    assuranceOk: result.assurance ? result.assurance.ok === true : null,
    say: `${lines.length} priced line(s) read from estimating run ${run.id}`
      + (run.status === "approved" ? ", approved" : `, which is ${run.status || "at an unrecorded status"}`)
      + (refused.length ? `; ${refused.length} line(s) the engine refused are carried separately and are not in its total` : ""),
  };
}

/** The same, resolved against the store. */
export function estimateOfRecord(reference) {
  const wanted = runIdFrom(reference);
  if (!wanted) {
    return {
      ok: false, reason: "unreadable_reference", lines: [], refused: [], status: null, runId: null,
      say: `"${String(reference || "").slice(0, 60)}" does not contain an estimating run reference, so no estimate of record could be found`,
    };
  }
  const run = collection("agentTasks").find((r) => r.id === wanted);
  return readEstimateRun(run, { wanted });
}

/**
 * The note an approver reads when a named estimate could not be read.
 *
 * Deliberately phrased as a failure of the CHECK rather than of the estimate.
 * The estimate may be perfectly good; what is certain is that the registers
 * have not been tested against it, and that is the thing nobody must infer
 * wrongly from a quiet run.
 */
export function estimateOfRecordNotes(resolved) {
  if (!resolved || resolved.ok) return [];
  return [
    `THE ESTIMATE OF RECORD WAS NOT READ — ${resolved.say}. `
      + "The registers were therefore NOT checked against the price. This is not a finding about the estimate; "
      + "it is a statement that the strongest check available did not run, and nothing below should be read as though it did.",
  ];
}
