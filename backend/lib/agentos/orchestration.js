/**
 * ET-ORCH · One accountable owner per active workflow, and the metric that
 * is honest about it.
 *
 * "100% workflow ownership" is the specification's headline claim and it is
 * trivially satisfiable by a dishonest denominator. Count only the workflows
 * that have an owner and coverage is always 100%. Count instances rather than
 * workflows and a single stalled case disappears into a hundred healthy ones.
 * Leave out the ones nobody started and the gap never appears.
 *
 * So coverage is active workflow INSTANCES with EXACTLY ONE owner, over all
 * active instances — and "exactly one" is the part that matters, because two
 * owners is not better than one, it is nobody. An instance owned by both the
 * bid agent and the commercial agent is an instance where each will assume
 * the other has it.
 *
 * AND THE SECOND METRIC IS KEPT SEPARATE FROM THE FIRST, DELIBERATELY.
 * Unattended execution rate — eligible A0 to A2 steps completed with no
 * manual intervention — measures how much the platform does. Coverage
 * measures whether anything is unowned. Reporting them as one number lets a
 * platform with excellent automation and three orphaned workflows look
 * perfect, and the three orphans are the whole risk.
 *
 * A BLOCKED WORKFLOW IS STILL OWNED. The specification is explicit: a
 * workflow stopped by a safety or contractual condition remains agent-owned,
 * and blocked and waiting cases are tracked visibly. So WAITING_AUTHORITY and
 * BLOCKED count in the denominator and in the numerator — they are owned, they
 * are just not moving, and a platform that drops them from coverage reports
 * health by forgetting the problems.
 */

/** The ten workflows and the agent that owns each. */
export const WORKFLOWS = [
  { id: "W01", name: "Opportunity and model fit", owner: "bid" },
  { id: "W02", name: "Brief and site diagnostic", owner: "site-requirements" },
  { id: "W03", name: "Design and temporary works", owner: "design" },
  { id: "W04", name: "Bid and procurement", owner: "procurement" },
  { id: "W05", name: "Mobilise", owner: "mobilisation-review" },
  { id: "W06", name: "Commission and open", owner: "commissioning" },
  { id: "W07", name: "Live service assurance", owner: "siteops" },
  { id: "W08", name: "Valuation, cash and change", owner: "commercial" },
  { id: "W09", name: "Off-hire and reinstatement", owner: "handover-file" },
  { id: "W10", name: "Portfolio and learning", owner: "portfolio-capacity" },
];

/** Task states. The last four are terminal. */
export const TASK_STATES = [
  "QUEUED", "RUNNING", "WAITING_INPUT", "WAITING_AUTHORITY", "BLOCKED",
  "SUCCEEDED", "FAILED_RETRYABLE", "FAILED_TERMINAL", "CANCELLED",
];
const TERMINAL = new Set(["SUCCEEDED", "FAILED_TERMINAL", "CANCELLED"]);
/** Owned and not moving. Counted, not excused. */
export const HELD_STATES = new Set(["WAITING_INPUT", "WAITING_AUTHORITY", "BLOCKED"]);

const BY_ID = new Map(WORKFLOWS.map((w) => [w.id, w]));

/**
 * Coverage over workflow instances.
 *
 * `instances` is [{ id, workflow, owners: [], state }]. An instance in a
 * terminal state is not active and is excluded from both sides.
 */
export function ownership({ instances = [] } = {}) {
  const rows = (Array.isArray(instances) ? instances : []).filter(Boolean);
  const active = rows.filter((i) => !TERMINAL.has(String(i.state ?? "QUEUED").toUpperCase()));

  const unowned = [];
  const multiOwned = [];
  const unknownWorkflow = [];
  const owned = [];

  for (const i of active) {
    const id = String(i.id ?? "(unidentified instance)");
    const wf = String(i.workflow ?? "");
    if (!BY_ID.has(wf)) unknownWorkflow.push({ id, workflow: wf || "(none)" });
    const owners = [...new Set((Array.isArray(i.owners) ? i.owners : i.owner ? [i.owner] : []).map(String).filter(Boolean))];
    if (owners.length === 0) unowned.push({ id, workflow: wf });
    else if (owners.length > 1) multiOwned.push({ id, workflow: wf, owners });
    else owned.push({ id, workflow: wf, owner: owners[0], state: String(i.state ?? "QUEUED").toUpperCase() });
  }

  const held = owned.filter((o) => HELD_STATES.has(o.state));
  const coverage = active.length === 0 ? null : Math.round((owned.length / active.length) * 1000) / 10;

  return {
    ok: coverage === 100 && unknownWorkflow.length === 0,
    activeInstances: active.length,
    ownedInstances: owned.length,
    coveragePct: coverage,
    unowned, multiOwned, unknownWorkflow,
    // Owned and not moving. In the numerator, and visible.
    held: held.map((h) => ({ id: h.id, workflow: h.workflow, state: h.state, owner: h.owner })),
    say: active.length === 0
      ? "no active workflow instances, so coverage is undefined rather than 100%"
      : `${coverage}% coverage: ${owned.length} of ${active.length} active instance(s) with exactly one owner`
        + (multiOwned.length ? `; ${multiOwned.length} with more than one, which is not better than one — it is nobody` : "")
        + (held.length ? `; ${held.length} owned and held, counted rather than excused` : ""),
  };
}

/**
 * Unattended execution rate, reported SEPARATELY from coverage.
 *
 * `steps` is [{ id, class, eligible, manualIntervention }]. Only eligible
 * A0 to A2 steps count, because an A3 step waiting on authority is working
 * as designed and counting it as a failure to automate would push the metric
 * towards removing approvals.
 */
export function unattendedRate({ steps = [] } = {}) {
  const rows = (Array.isArray(steps) ? steps : []).filter(Boolean);
  const eligible = rows.filter((s) => s.eligible !== false && ["A0", "A1", "A2"].includes(String(s.class ?? "").toUpperCase()));
  const clean = eligible.filter((s) => s.manualIntervention !== true);
  const rate = eligible.length === 0 ? null : Math.round((clean.length / eligible.length) * 1000) / 10;
  return {
    eligibleSteps: eligible.length,
    unattendedSteps: clean.length,
    ratePct: rate,
    excluded: rows.length - eligible.length,
    say: eligible.length === 0
      ? "no eligible A0 to A2 steps, so the rate is undefined rather than nought"
      : `${rate}% of ${eligible.length} eligible step(s) completed unattended; `
        + `${rows.length - eligible.length} step(s) excluded as A3 or not eligible, because an A3 step waiting on authority is working as designed`,
  };
}

/** Both metrics, reported apart. */
export function orchestrationState({ instances = [], steps = [] } = {}) {
  const own = ownership({ instances });
  const rate = unattendedRate({ steps });
  return {
    ok: own.ok,
    ownership: own,
    unattended: rate,
    say: `${own.say}. Separately, ${rate.say}`,
  };
}

/** The notes an approver reads. */
export function orchestrationNotes(state) {
  if (!state) return [];
  const out = [];
  const o = state.ownership || state;
  if (o.unowned?.length) {
    out.push(`ACTIVE WORKFLOWS WITH NO OWNER — ${o.unowned.map((u) => `${u.id} (${u.workflow})`).join(", ")}. `
      + "An unowned active workflow is the one nobody is watching, and it is invisible to any metric whose denominator is the owned ones.");
  }
  if (o.multiOwned?.length) {
    out.push(`MORE THAN ONE OWNER — ${o.multiOwned.map((m) => `${m.id} (${m.owners.join(" and ")})`).join("; ")}. `
      + "Two owners is not better than one. It is nobody, because each will assume the other has it.");
  }
  if (o.unknownWorkflow?.length) {
    out.push(`AN INSTANCE OF NO KNOWN WORKFLOW — ${o.unknownWorkflow.map((u) => `${u.id} (${u.workflow})`).join(", ")}.`);
  }
  if (o.held?.length) {
    out.push(`OWNED AND HELD — ${o.held.map((h) => `${h.id} ${h.state}`).join(", ")}. `
      + "A workflow stopped by a safety or contractual condition stays agent-owned; it counts in coverage and it is listed here, "
      + "because a platform that drops held cases from its metric reports health by forgetting the problems.");
  }
  return out;
}
