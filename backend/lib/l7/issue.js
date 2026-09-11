/**
 * The issue gate — what must be true before a bid leaves the building.
 *
 * The register carried one sentence about the adversarial challenger for
 * weeks after it was built: "nothing yet obliges a bid to pass through it,
 * and a challenger nobody invokes is a challenger that does not exist."
 *
 * This is the obligation. A bid file cannot be minted without an independent
 * challenge that actually ran, actually found things, and left no critical
 * finding open. Not a recommendation, not a warning on the screen — the
 * document is not created.
 *
 * WHY THE MINT AND NOT A BANNER. Every softer version of this has the same
 * failure: the bid goes out at four o'clock on the day of the deadline, the
 * banner is read as a formality, and the review that would have caught the
 * unanswered mandatory requirement happens after the upload. A control that
 * can be walked past at the exact moment it matters is not a control. So the
 * refusal is at the point the numbered document comes into existence, which
 * is the last moment anybody is still willing to change anything.
 *
 * FOUR THINGS ARE CHECKED AND EACH HAS BEEN A REAL FAILURE SOMEWHERE:
 *
 *   · A challenge exists at all. The commonest case by a long way.
 *   · It was approved by a person. An unreviewed challenge is an opinion.
 *   · It passed its own machine check, so every finding names a lens, a
 *     severity, a location and a remedy — a review with nothing actionable
 *     in it is the shape assurance takes when it is being performed rather
 *     than done.
 *   · No critical finding is open. Critical means likely disqualification,
 *     unlawful content, an unapproved price or material binding exposure,
 *     and it is a hard block by definition rather than a judgement call.
 *
 * AND THE CHALLENGE MUST BE OF THIS BID. A challenge of last month's
 * submission approving this month's is the failure mode that makes a gate
 * worse than no gate, because the paperwork then says a review happened.
 */

import { collection } from "../store.js";
import { instant } from "./evidence.js";

/** Templates that may not be minted without an independent challenge. */
export const CHALLENGE_REQUIRED = new Set(["bidfile"]);

/**
 * May this document be issued? Returns the refusal in the words somebody
 * needs in order to fix it, never just "not allowed".
 */
export function mayIssue({ template, challengeRunId = null, sourceRunId = null, at = null } = {}) {
  const tpl = String(template || "");
  if (!CHALLENGE_REQUIRED.has(tpl)) {
    return { ok: true, required: false, say: `${tpl || "this template"} does not require an independent challenge.` };
  }

  if (!challengeRunId) {
    return {
      ok: false,
      required: true,
      reason: "no_challenge",
      say: "A bid file may not be issued without an independent challenge. Run Agent 14 against this submission, have it approved, and pass its run here. A challenger nobody invokes is a challenger that does not exist, and this is the obligation that stops that being true.",
    };
  }

  const run = collection("agentTasks").find((r) => r.id === String(challengeRunId));
  if (!run) {
    return { ok: false, required: true, reason: "no_such_run", say: "That challenge run does not exist, so the bid cannot claim to have been challenged." };
  }
  if (run.agent !== "challenge") {
    return { ok: false, required: true, reason: "wrong_agent", say: `Run ${run.id} is ${run.agentName || run.agent}, not the adversarial challenger. Another agent's output is not an independent review of this one.` };
  }
  if (run.status !== "approved") {
    return { ok: false, required: true, reason: "unapproved", say: `The challenge run is ${run.status}, not approved. An unreviewed challenge is an opinion, and a bid is not released against one.` };
  }

  // THE INDEPENDENCE RULE, ENFORCED AT THE POINT OF ISSUE. A challenge that
  // is the same run as the thing it challenged has marked its own work.
  if (sourceRunId && String(sourceRunId) === String(challengeRunId)) {
    return { ok: false, required: true, reason: "not_independent", say: "The challenge names the same run as the bid it is challenging. That is the thing marking its own work, and it is not an assurance result." };
  }

  const check = run.challengeCheck;
  if (!check) {
    return { ok: false, required: true, reason: "unchecked", say: "That challenge run carries no check result, so nothing can say whether its findings are actionable." };
  }
  if (!check.ok) {
    return {
      ok: false,
      required: true,
      reason: "check_failed",
      say: "The challenge report did not pass its own check, so it is not an assurance result. A review whose findings carry no lens, no severity, no location or no remedy is the shape assurance takes when it is being performed rather than done.",
      detail: {
        lensesMissing: check.lensesMissing || [],
        unlocated: (check.unlocated || []).length,
        unremedied: (check.unremedied || []).length,
        findings: check.findings,
      },
    };
  }
  if ((check.critical || []).length > 0) {
    return {
      ok: false,
      required: true,
      reason: "critical_open",
      say: `${check.critical.length} critical finding(s) are open: ${check.critical.join(", ")}. Critical means likely disqualification, unlawful content, an unapproved price or material binding exposure. It is corrected or the bid does not go — it is not a judgement call and it cannot be disposed of.`,
      detail: { critical: check.critical, high: check.high || [] },
    };
  }

  const when = instant(at) ?? Date.now();
  const ran = Number(run.finishedAt || run.createdAt || 0);
  const ageDays = ran ? Math.floor((when - ran) / 86400000) : null;

  return {
    ok: true,
    required: true,
    challengeRunId: run.id,
    findings: check.findings,
    high: (check.high || []).length,
    ageDays,
    say: `Challenged by run ${run.id}${ageDays === null ? "" : ` ${ageDays} day(s) ago`}: ${check.findings} finding(s) across all nine lenses, no critical open${(check.high || []).length ? `, ${check.high.length} high carrying an authorised disposition` : ""}.`,
    // Not a refusal, and worth saying: a challenge of an older draft is not a
    // challenge of what is about to go, and only a person can judge whether
    // the bid has moved since.
    stale: ageDays !== null && ageDays > 7
      ? `This challenge ran ${ageDays} days ago. If the submission has changed since, it has not been challenged in its current form.`
      : null,
  };
}

/** What the desk shows next to a bid file that cannot yet be issued. */
export function issueState(template, challengeRunId, sourceRunId) {
  const r = mayIssue({ template, challengeRunId, sourceRunId });
  return {
    template: String(template || ""),
    required: r.required === true,
    ok: r.ok === true,
    reason: r.reason || null,
    say: r.say,
    stale: r.stale || null,
  };
}
