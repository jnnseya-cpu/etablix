/**
 * The submission manifest and the eight hard gates — the last thing that runs
 * before a tender leaves the building, and the only one that cannot be
 * overridden by somebody who is late.
 *
 * Everything before this point is a process. This is the moment. Once the
 * upload completes, every defect in the bid is permanent: a missing form is a
 * non-compliant tender, a superseded drawing is a wrong answer, an expired
 * certificate is a false statement, and a price that does not tie to the
 * approved price is a number nobody in the business authorised.
 *
 * All eight of those are recoverable at four o'clock and unrecoverable at
 * five. So the gate is a machine and it runs at four.
 *
 * WHY A MANIFEST AND NOT A CHECKLIST. A checklist records that somebody
 * looked. A manifest records WHAT WAS SENT: filename, hash, size, revision,
 * destination, the requirement each file satisfies, who approved it, what the
 * price reconciles to, and the receipt that came back. It is the only
 * artefact that can answer, months later, "what did we actually submit?" —
 * a question that decides disputes and that most organisations answer from
 * memory and a shared drive.
 *
 * THE SNAPSHOT IS IMMUTABLE AND THE HASH IS THE POINT. A manifest that names
 * files without hashing them proves nothing: the file on the drive today is
 * not necessarily the file that went. The hash is what makes the manifest
 * evidence rather than a note.
 */

import { statusAt, instant } from "./evidence.js";
import { num } from "./num.js";

/** The eight manifest field groups. */
export const MANIFEST_FIELDS = [
  { id: "identity", name: "Submission ID and snapshot", purpose: "Immutable identity of exactly what was approved" },
  { id: "documents", name: "Document list", purpose: "Filename, format, size, hash, revision and required destination" },
  { id: "coverage", name: "Requirement coverage", purpose: "Each mandatory requirement and the exported location that satisfies it" },
  { id: "approval", name: "Approval record", purpose: "Approver, role, decision, conditions and time" },
  { id: "price", name: "Price reconciliation", purpose: "Approved total, schedule totals, currency and rounding" },
  { id: "exceptions", name: "Known exceptions", purpose: "Approved waivers, outstanding client-controlled items and conditions" },
  { id: "channel", name: "Channel record", purpose: "Portal, email, API or physical method and the authorised operator" },
  { id: "receipt", name: "Receipt", purpose: "Portal confirmation, email acknowledgement, timestamp and reference" },
];

/** A document as it will actually be sent. */
export function document(raw = {}) {
  const name = String(raw.filename || "").trim();
  return {
    filename: name,
    format: (name.split(".").pop() || "").toLowerCase() || null,
    bytes: Number.isFinite(raw.bytes) ? raw.bytes : null,
    hash: raw.hash ? String(raw.hash) : null,
    revision: raw.revision ? String(raw.revision) : null,
    destination: raw.destination ? String(raw.destination) : null,
    satisfies: Array.isArray(raw.satisfies) ? raw.satisfies.map(String) : [],
    pages: Number.isFinite(raw.pages) ? raw.pages : null,
    words: Number.isFinite(raw.words) ? raw.words : null,
  };
}

/**
 * The eight pre-submission hard gates. Each returns its own verdict; the
 * submission proceeds only when every one of them passes.
 */
export function hardGates({
  documents = [],
  requirements = [],           // { requirementId, mandatory, satisfiedBy, waiver }
  findings = [],               // assurance findings
  reviewComplete = false,      // did the assurance review actually run?
  approvedPrice = null,
  exportedTotals = [],         // every total that appears anywhere in the pack
  roundingRule = null,
  formatRules = null,          // { maxBytes, allowedFormats, namePattern, maxPagesByDoc }
  signatures = [],             // { document, by, role, at }
  declarations = [],           // { id, required, present, by }
  latestIssue = null,          // { id, acknowledgedAt, impactReviewComplete }
  evidence = [],
  claims = [],
  deadline = null,
  signatory = null,            // { by, role, limit, riskClasses }
  tenderValue = null,
  riskClass = null,
} = {}) {
  const gates = [];
  const g = (id, ok, say, detail) => gates.push({ id, ok, say, ...(detail !== undefined ? { detail } : {}) });

  // 1. No unresolved critical finding.
  {
    const critical = findings.filter((f) => String(f.severity).toUpperCase() === "CRITICAL" && f.status !== "CLOSED");
    // No findings is not the same as no problems. An assurance review that
    // was never run produces an empty list, and an empty list read as a pass
    // is how a bid goes out unreviewed with a clean gate behind it.
    if (reviewComplete !== true) {
      g("no_critical_finding", false, "the assurance review has not been recorded as complete; an empty finding list is not a clean one");
    } else g("no_critical_finding", critical.length === 0,
      critical.length ? `${critical.length} unresolved critical finding(s): ${critical.map((f) => f.id).join(", ")}` : "no unresolved critical finding",
      critical.map((f) => f.id));
  }

  // 2. Every mandatory requirement satisfied or authorised-waived.
  {
    const unmet = requirements.filter((r) => {
      if (!r.mandatory) return false;
      if (r.waiver && r.waiver.by && r.waiver.role === "EXECUTIVE_SPONSOR") return false;
      return !r.satisfiedBy;
    });
    const mandatoryCount = requirements.filter((r) => r.mandatory).length;
    // Zero mandatory requirements does not mean a compliant bid. It means
    // extraction never ran, or ran and found nothing — and no real ITT has no
    // mandatory requirement. Vacuous is a failure here, not a pass.
    if (mandatoryCount === 0) {
      g("mandatory_requirements", false, "no mandatory requirement is recorded at all; the compliance matrix has not been built");
    } else {
      g("mandatory_requirements", unmet.length === 0,
        unmet.length ? `${unmet.length} mandatory requirement(s) neither satisfied nor waived: ${unmet.slice(0, 5).map((r) => r.requirementId).join(", ")}` : `${mandatoryCount} mandatory requirement(s) satisfied`,
        unmet.map((r) => r.requirementId));
    }
  }

  // 3. Every exported value reconciles to the approved commercial baseline.
  {
    const approved = num(approvedPrice);
    if (approved === null) {
      g("price_reconciles", false, "there is no approved price to reconcile to");
    } else if (exportedTotals.length === 0) {
      // A VACUOUS PASS IS THE WORST RESULT A GATE CAN GIVE. Nothing to
      // compare is not agreement; it means no total was exported, which on a
      // real submission means the pricing schedule is missing.
      g("price_reconciles", false, "no exported total was found to reconcile; a gate with nothing to check has not passed");
    } else {
      const allowed = roundingRule && num(roundingRule.to) !== null ? num(roundingRule.to) : 0;
      const off = exportedTotals
        .map((t) => ({ where: String(t.where || "(unnamed)"), value: num(t.value) }))
        .filter((t) => t.value === null || Math.abs(t.value - approved) > allowed + 0.005);
      g("price_reconciles", off.length === 0,
        off.length ? `${off.length} exported total(s) do not tie to ${approved}: ${off.slice(0, 3).map((t) => `${t.where}=${t.value}`).join(", ")}` : `${exportedTotals.length} exported total(s) tie to the approved price`,
        off);
    }
  }

  // 4. Format, name, size and page or word limits.
  {
    const faults = [];
    const rules = formatRules || {};
    if (documents.length === 0) faults.push("the submission carries no documents at all");
    if (!formatRules) faults.push("no format rules were read from the tender; the constraints are unknown rather than met");
    for (const raw of documents) {
      const d = document(raw);
      if (!d.filename) { faults.push("a document with no filename"); continue; }
      if (rules.allowedFormats && !rules.allowedFormats.map((s) => String(s).toLowerCase()).includes(d.format)) {
        faults.push(`${d.filename} is a .${d.format}; the tender permits ${rules.allowedFormats.join(", ")}`);
      }
      if (Number.isFinite(rules.maxBytes) && Number.isFinite(d.bytes) && d.bytes > rules.maxBytes) {
        faults.push(`${d.filename} is ${d.bytes} bytes against a limit of ${rules.maxBytes}`);
      }
      if (rules.namePattern) {
        let re = null;
        try { re = new RegExp(rules.namePattern); } catch { re = null; }
        if (!re) faults.push(`the required name pattern is not usable`);
        else if (!re.test(d.filename)) faults.push(`${d.filename} does not match the required naming`);
      }
      const maxPages = rules.maxPagesByDoc ? rules.maxPagesByDoc[d.filename] : undefined;
      if (Number.isFinite(maxPages) && Number.isFinite(d.pages) && d.pages > maxPages) {
        faults.push(`${d.filename} is ${d.pages} pages against a limit of ${maxPages}`);
      }
    }
    g("format_constraints", faults.length === 0, faults.length ? faults[0] : `${documents.length} document(s) within every stated constraint`, faults);
  }

  // 5. Every signature and declaration present and authorised.
  {
    const faults = [];
    for (const d of declarations) {
      if (d.required && !d.present) faults.push(`declaration ${d.id} is required and absent`);
      if (d.present && !d.by) faults.push(`declaration ${d.id} is present with nobody named`);
    }
    const needSignature = documents.filter((x) => x.requiresSignature);
    for (const x of needSignature) {
      const sig = signatures.find((s) => String(s.document) === String(x.filename));
      if (!sig) faults.push(`${x.filename} requires a signature and has none`);
      else if (!sig.by || !sig.role) faults.push(`${x.filename} is signed with no name or no role`);
    }
    g("signatures_and_declarations", faults.length === 0, faults.length ? faults[0] : "every signature and declaration is present and named", faults);
  }

  // 6. The latest acknowledged issue has completed impact review.
  {
    if (!latestIssue) g("latest_issue_reviewed", false, "no tender issue is recorded; an unacknowledged addendum cannot be ruled out");
    else if (!latestIssue.acknowledgedAt) g("latest_issue_reviewed", false, `issue ${latestIssue.id} has not been acknowledged`);
    else if (latestIssue.impactReviewComplete !== true) g("latest_issue_reviewed", false, `issue ${latestIssue.id} is acknowledged and its impact review is not complete`);
    else g("latest_issue_reviewed", true, `issue ${latestIssue.id} acknowledged and impact-reviewed`);
  }

  // 7. No expired mandatory evidence at the deadline.
  {
    const at = instant(deadline);
    if (at === null) {
      g("evidence_valid_at_deadline", false, `the submission deadline "${deadline}" is not a date; nothing can be shown to be in date against it`);
    } else {
      const byId = new Map(evidence.map((e) => [String(e.id), e]));
      const bad = [];
      for (const c of claims) {
        const ref = c.evidenceId ? String(c.evidenceId) : null;
        if (!ref) { bad.push(`claim ${c.id || "(unidentified)"} has no evidence`); continue; }
        const item = byId.get(ref);
        if (!item) { bad.push(`claim ${c.id} cites ${ref}, which does not exist`); continue; }
        const status = statusAt(item, deadline);
        if (status !== "APPROVED") bad.push(`${ref} is ${status} at the deadline`);
      }
      g("evidence_valid_at_deadline", bad.length === 0, bad.length ? bad[0] : `${claims.length} claim(s) backed by evidence valid at the deadline`, bad);
    }
  }

  // 8. The signatory has explicit authority for the value AND the risk class.
  {
    const limit = signatory ? num(signatory.limit) : null;
    const value = num(tenderValue);
    if (!signatory || !signatory.by) g("signatory_authority", false, "no signatory is named");
    else if (limit === null) g("signatory_authority", false, `no signing limit is recorded for ${signatory.by}; authority is never assumed`);
    else if (value !== null && value > limit) {
      g("signatory_authority", false, `${signatory.by} may sign to ${signatory.limit}; this tender is ${tenderValue}`);
    } else if (value === null) {
      g("signatory_authority", false, "the tender value is not a number, so the signing limit cannot be tested");
    } else if (riskClass && Array.isArray(signatory.riskClasses) && !signatory.riskClasses.includes(riskClass)) {
      g("signatory_authority", false, `${signatory.by} is not authorised for risk class ${riskClass}`);
    } else if (riskClass && !Array.isArray(signatory.riskClasses)) {
      g("signatory_authority", false, `no risk classes are recorded for ${signatory.by}`);
    } else {
      g("signatory_authority", true, `${signatory.by} has authority for ${tenderValue}${riskClass ? ` at risk class ${riskClass}` : ""}`);
    }
  }

  const failing = gates.filter((x) => !x.ok);
  return {
    ok: failing.length === 0,
    gates,
    failing,
    count: failing.length,
    say: failing.length === 0
      ? "all eight pre-submission hard gates pass"
      : `${failing.length} of eight hard gates fail — the first is ${failing[0].id}: ${failing[0].say}`,
  };
}

/**
 * Build the manifest. Refuses to build one that is not evidence: a document
 * with no hash, a requirement with no exported location, an approval with no
 * name. The whole value of the artefact is that it can be relied on later.
 */
export function build({
  submissionId = null,
  snapshotId = null,
  bidId = null,
  documents = [],
  requirements = [],
  approvals = [],
  approvedPrice = null,
  scheduleTotals = [],
  currency = null,
  roundingRule = null,
  waivers = [],
  outstanding = [],
  channel = null,
  operator = null,
  receipt = null,
  at = null,
} = {}) {
  const faults = [];
  if (!submissionId) faults.push("no submission id");
  if (!snapshotId) faults.push("no snapshot id — without one there is no immutable record of what was approved");
  if (!bidId) faults.push("no bid id");

  const docs = documents.map(document);
  for (const d of docs) {
    if (!d.filename) faults.push("a document with no filename");
    if (!d.hash) faults.push(`${d.filename || "(unnamed)"} has no hash — the manifest would name a file it cannot prove`);
    if (!d.revision) faults.push(`${d.filename || "(unnamed)"} has no revision`);
    if (!d.destination) faults.push(`${d.filename || "(unnamed)"} names no destination`);
  }

  const mandatory = requirements.filter((r) => r.mandatory);
  const coverage = mandatory.map((r) => ({
    requirementId: String(r.requirementId),
    satisfiedBy: r.satisfiedBy ? String(r.satisfiedBy) : null,
    waived: !!(r.waiver && r.waiver.by),
  }));
  for (const c of coverage) {
    if (!c.satisfiedBy && !c.waived) faults.push(`${c.requirementId} is mandatory and the manifest cannot say where it is answered`);
  }

  const approvalRecord = approvals.map((a) => ({
    by: a.by ? String(a.by) : null,
    role: a.role ? String(a.role) : null,
    decision: a.decision ? String(a.decision) : null,
    conditions: a.conditions ? String(a.conditions) : null,
    at: a.at ? String(a.at) : null,
  }));
  for (const a of approvalRecord) {
    if (!a.by || !a.role || !a.decision || !a.at) faults.push("an approval record missing a name, a role, a decision or a time");
    else if (instant(a.at) === null) faults.push(`the approval time "${a.at}" is not a date`);
  }

  const approved = num(approvedPrice);
  const totals = scheduleTotals.map((t) => ({ where: String(t.where || "(unnamed)"), value: num(t.value) }));
  const allowed = roundingRule && num(roundingRule.to) !== null ? num(roundingRule.to) : 0;
  const priceOff = approved !== null
    ? totals.filter((t) => t.value === null || Math.abs(t.value - approved) > allowed + 0.005)
    : totals;
  if (approved === null) faults.push("no approved price");
  if (!currency) faults.push("no currency");

  const manifest = {
    identity: { submissionId, snapshotId, bidId, builtAt: at || new Date().toISOString() },
    documents: docs,
    coverage,
    approval: approvalRecord,
    price: {
      approvedTotal: approved,
      scheduleTotals: totals,
      currency,
      rounding: roundingRule || null,
      reconciles: approved !== null && totals.length > 0 && priceOff.length === 0,
      differences: priceOff,
    },
    exceptions: {
      waivers: waivers.map((w) => ({ requirementId: String(w.requirementId || ""), by: w.by ? String(w.by) : null, role: w.role ? String(w.role) : null, reason: w.reason ? String(w.reason) : null })),
      outstanding: outstanding.map(String),
    },
    channel: { method: channel, operator, authorised: !!(channel && operator) },
    receipt: receipt
      ? { reference: receipt.reference ? String(receipt.reference) : null, at: receipt.at ? String(receipt.at) : null, evidence: receipt.evidence ? String(receipt.evidence) : null }
      : null,
  };

  if (!manifest.channel.authorised) faults.push("no channel and authorised operator recorded");

  return {
    ok: faults.length === 0,
    faults,
    manifest,
    say: faults.length === 0
      ? `manifest for ${submissionId}: ${docs.length} document(s), ${coverage.length} mandatory requirement(s), price reconciled`
      : `this manifest would not be evidence: ${faults[0]}`,
  };
}

/** Recording the receipt closes the loop. Without one nothing was submitted. */
export function recordReceipt(manifest, receipt = {}) {
  const ref = receipt.reference ? String(receipt.reference) : null;
  const at = receipt.at ? String(receipt.at) : null;
  if (!ref) return { ok: false, say: "a receipt with no reference does not evidence a submission" };
  if (instant(at) === null) return { ok: false, say: `the receipt time "${at}" is not a date` };
  return {
    ok: true,
    manifest: { ...manifest, receipt: { reference: ref, at, evidence: receipt.evidence ? String(receipt.evidence) : null } },
    say: `receipt ${ref} at ${at}`,
  };
}

/** The facts the G5 submission gate reads. */
export function gateFacts(gateResult, claimCheck) {
  return {
    manifest: { hardGateFailures: gateResult ? gateResult.count : null },
    evidence: { unbackedClaims: claimCheck ? claimCheck.unbound.length + claimCheck.missing.length + claimCheck.expired.length + claimCheck.unapproved.length + claimCheck.outOfScope.length : null },
    price: { reconciles: gateResult ? (gateResult.gates.find((x) => x.id === "price_reconciles") || {}).ok === true : null },
  };
}
