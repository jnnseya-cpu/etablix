/**
 * The compliance matrix — the difference between answering a tender and
 * answering the tender that was actually issued.
 *
 * A large ITT contains several hundred requirements, spread across an
 * instruction document, a scope, a specification, a form of contract, a
 * pricing schedule, an evaluation methodology and four addenda that arrived
 * separately. They are not numbered consistently, several are stated twice
 * with different words, and a handful of the most important are one clause
 * inside a paragraph about something else.
 *
 * The industry answer is a spreadsheet somebody maintains. It is out of date
 * from the first addendum, and its "complete" column is a person's judgement
 * typed into a cell.
 *
 * THIS IS THE OTHER ANSWER: complete is a FUNCTION, of eight conjuncts, and
 * every one of them has to be true. The specification writes it as:
 *
 *     complete(requirement) =
 *       current_source_version(requirement.source_ref)
 *       AND response.status == APPROVED
 *       AND all(required_evidence).verified_and_valid
 *       AND formatting_constraints.pass
 *       AND dependencies.all_resolved
 *       AND contradictions.material_open == 0
 *       AND waivers.have_required_authority
 *       AND export_manifest.includes(required_outputs)
 *
 * Every one of those is a real bid lost by somebody. The first is the one
 * that hurts most: a requirement answered perfectly against revision B of a
 * document that is now at revision D. The response is excellent, current,
 * well evidenced and wrong, and nothing about reading it reveals that.
 *
 * WHY THE FUNCTION RETURNS THE FAILING CONJUNCT AND NOT A BOOLEAN. "Not
 * complete" sends somebody to re-read the whole requirement. "Answered
 * against a superseded source" sends them to one place. A check that does not
 * say what failed is a check people learn to ignore.
 */

import { statusAt, inScope, instant } from "./evidence.js";

/** The requirement lifecycle. */
export const STATUSES = [
  "EXTRACTED",   // found in a source, not yet understood
  "MAPPED",      // owner, type and response section assigned
  "DRAFTED",     // a response exists
  "EVIDENCED",   // the required evidence is attached
  "REVIEWED",    // somebody other than the author has read it
  "APPROVED",    // signed off
  "SUPERSEDED",  // an addendum replaced it
  "WAIVED",      // an authorised decision not to satisfy it
];

/** The seven contradiction classes and what the system does about each. */
export const CONTRADICTION_CLASSES = [
  { id: "source", name: "Source conflict", example: "The specification and the drawing state different materials", response: "clarify", blocks: null,
    say: "Raise a clarification; do not choose one and hope." },
  { id: "response", name: "Response conflict", example: "The programme says twenty weeks and the narrative says eighteen", response: "block", blocks: "approval",
    say: "Block approval. Two numbers in one submission is the fault an evaluator finds first." },
  { id: "commercial", name: "Commercial conflict", example: "The price schedule differs from the estimate total", response: "block", blocks: "price",
    say: "Block the price gate. A schedule that does not tie to the estimate is a price nobody approved." },
  { id: "evidence", name: "Evidence conflict", example: "A case study claims more than the evidence shows", response: "remove", blocks: "approval",
    say: "Remove the claim or obtain the evidence. There is no third option." },
  { id: "temporal", name: "Temporal conflict", example: "The response uses a superseded drawing", response: "stale", blocks: "approval",
    say: "Mark stale and re-review against the current revision." },
  { id: "unit", name: "Unit conflict", example: "A square-metre quantity priced as a linear metre", response: "block", blocks: "calculation",
    say: "Block the calculation. A unit error is a factor error and it survives every review that reads for sense." },
  { id: "responsibility", name: "Responsibility conflict", example: "Two parties both exclude the same interface", response: "escalate", blocks: "approval",
    say: "Escalate as a scope gap. Nobody has priced it and everybody thinks somebody has." },
];

const CLASS_BY_ID = new Map(CONTRADICTION_CLASSES.map((c) => [c.id, c]));

/** A requirement with every field group of the specification present. */
export function requirement(raw = {}) {
  return {
    // Identity
    requirementId: String(raw.requirementId || raw.id || ""),
    tenderId: raw.tenderId ? String(raw.tenderId) : null,
    issueId: raw.issueId ? String(raw.issueId) : null,
    sourceRef: String(raw.sourceRef || "").trim(),
    sourceVersion: raw.sourceVersion ? String(raw.sourceVersion) : null,
    sourceSpan: raw.sourceSpan ? String(raw.sourceSpan) : null,
    // Meaning
    exactText: String(raw.exactText || "").trim(),
    normalisedText: String(raw.normalisedText || raw.exactText || "").trim(),
    definedTerms: Array.isArray(raw.definedTerms) ? raw.definedTerms.map(String) : [],
    interpretation: raw.interpretation ? String(raw.interpretation) : null,
    // Control
    type: raw.type ? String(raw.type) : null,
    mandatory: raw.mandatory === true,
    scoreWeight: Number.isFinite(raw.scoreWeight) ? raw.scoreWeight : null,
    passFail: raw.passFail === true,
    priority: raw.priority ? String(raw.priority) : null,
    sensitivity: raw.sensitivity ? String(raw.sensitivity) : null,
    // Delivery
    owner: raw.owner ? String(raw.owner).trim() : null,
    contributors: Array.isArray(raw.contributors) ? raw.contributors.map(String) : [],
    dueAt: raw.dueAt ? String(raw.dueAt) : null,
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.map(String) : [],
    status: STATUSES.includes(raw.status) ? raw.status : "EXTRACTED",
    blockers: Array.isArray(raw.blockers) ? raw.blockers.map(String) : [],
    // Response
    responseSectionId: raw.responseSectionId ? String(raw.responseSectionId) : null,
    answer: raw.answer ? String(raw.answer) : null,
    attachmentRefs: Array.isArray(raw.attachmentRefs) ? raw.attachmentRefs.map(String) : [],
    portalField: raw.portalField ? String(raw.portalField) : null,
    // Evidence
    requiredEvidenceTypes: Array.isArray(raw.requiredEvidenceTypes) ? raw.requiredEvidenceTypes.map(String) : [],
    evidenceRefs: Array.isArray(raw.evidenceRefs) ? raw.evidenceRefs.map(String) : [],
    // Quality
    confidence: Number.isFinite(raw.confidence) ? raw.confidence : null,
    reviewer: raw.reviewer ? String(raw.reviewer) : null,
    approvedBy: raw.approvedBy ? String(raw.approvedBy) : null,
    comments: Array.isArray(raw.comments) ? raw.comments.map(String) : [],
    // Change
    supersededBy: raw.supersededBy ? String(raw.supersededBy) : null,
    impactedByIssue: raw.impactedByIssue ? String(raw.impactedByIssue) : null,
    staleSince: raw.staleSince ? String(raw.staleSince) : null,
    revalidated: raw.revalidated === true,
    // Format constraints the tender imposes on the answer
    format: raw.format
      ? {
          maxWords: Number.isFinite(raw.format.maxWords) ? raw.format.maxWords : null,
          maxPages: Number.isFinite(raw.format.maxPages) ? raw.format.maxPages : null,
          fileTypes: Array.isArray(raw.format.fileTypes) ? raw.format.fileTypes.map((s) => String(s).toLowerCase()) : [],
          namePattern: raw.format.namePattern ? String(raw.format.namePattern) : null,
        }
      : null,
    // An authorised decision not to satisfy it
    waiver: raw.waiver
      ? {
          by: raw.waiver.by ? String(raw.waiver.by) : null,
          role: raw.waiver.role ? String(raw.waiver.role) : null,
          reason: raw.waiver.reason ? String(raw.waiver.reason) : null,
          at: raw.waiver.at ? String(raw.waiver.at) : null,
        }
      : null,
  };
}

/** A contradiction raised against one or more requirements. */
export function contradiction(raw = {}) {
  const cls = CLASS_BY_ID.get(String(raw.class || ""));
  return {
    id: String(raw.id || ""),
    class: cls ? cls.id : null,
    requirementIds: Array.isArray(raw.requirementIds) ? raw.requirementIds.map(String) : [],
    material: raw.material !== false, // material unless somebody says otherwise
    status: raw.status === "CLOSED" ? "CLOSED" : "OPEN",
    detail: raw.detail ? String(raw.detail) : null,
    blocks: cls ? cls.blocks : null,
    handling: cls ? cls.say : "unclassified — refused rather than assumed harmless",
  };
}

/** Roles that may waive a mandatory requirement. Nobody else, at any level. */
export const WAIVER_AUTHORITY = ["BID_DIRECTOR", "COMMERCIAL_AUTHORITY", "EXECUTIVE_SPONSOR"];

/** Word count as a tender counts it: whitespace-separated tokens. */
export function words(text) {
  const s = String(text || "").trim();
  if (!s) return 0;
  return s.split(/\s+/).length;
}

/**
 * The eight conjuncts, evaluated one at a time. Returns each with its own
 * verdict so the failure is addressable rather than a single false.
 */
export function complete(raw, world = {}) {
  const r = requirement(raw);
  const {
    currentVersions = {},      // sourceRef → current version
    responses = {},            // responseSectionId → { status, text, files }
    evidence = [],             // evidence records
    contradictions = [],       // raised contradictions
    requirements = [],         // the rest of the matrix, for dependencies
    exportManifest = [],       // the outputs the submission will actually carry
    deadline = null,
    bidId = null,
  } = world;

  const checks = [];
  const add = (id, ok, say, detail) => checks.push({ id, ok, say, ...(detail ? { detail } : {}) });

  // 1. The source is still the current version.
  {
    const current = currentVersions[r.sourceRef];
    if (r.status === "SUPERSEDED") {
      add("current_source_version", false, `superseded by ${r.supersededBy || "a later issue"}`);
    } else if (current === undefined) {
      add("current_source_version", false, `no current version is recorded for ${r.sourceRef || "(no source)"}`);
    } else if (r.sourceVersion === null) {
      add("current_source_version", false, "the requirement does not say which version it was read from");
    } else if (String(current) !== r.sourceVersion) {
      add("current_source_version", false, `answered against ${r.sourceVersion}; ${r.sourceRef} is now ${current}`);
    } else if (r.staleSince && !r.revalidated) {
      add("current_source_version", false, `marked stale on ${r.staleSince} and not revalidated`);
    } else {
      add("current_source_version", true, `${r.sourceRef} ${r.sourceVersion} is current`);
    }
  }

  // 2. The response is approved.
  {
    const response = r.responseSectionId ? responses[r.responseSectionId] : null;
    if (!r.responseSectionId) add("response_approved", false, "no response section is assigned");
    else if (!response) add("response_approved", false, `response section ${r.responseSectionId} does not exist`);
    else if (response.status !== "APPROVED") add("response_approved", false, `the response is ${response.status || "unset"}, not APPROVED`);
    else add("response_approved", true, "the response is approved");
  }

  // 3. Every required evidence type is present, verified and in date at the deadline.
  {
    const byId = new Map(evidence.map((e) => [String(e.id), e]));
    const held = [];
    const faults = [];
    for (const ref of r.evidenceRefs) {
      const item = byId.get(ref);
      if (!item) { faults.push(`${ref} is referenced and does not exist`); continue; }
      if (!inScope(item, bidId)) { faults.push(`${ref} is not in scope for this bid`); continue; }
      const status = statusAt(item, deadline);
      if (status !== "APPROVED") { faults.push(`${ref} is ${status} at the deadline`); continue; }
      held.push(String(item.kind));
    }
    for (const type of r.requiredEvidenceTypes) {
      if (!held.includes(type)) faults.push(`no valid ${type} is attached`);
    }
    if (r.requiredEvidenceTypes.length === 0 && r.evidenceRefs.length === 0) {
      add("evidence_verified_and_valid", true, "no evidence is required");
    } else if (faults.length) {
      add("evidence_verified_and_valid", false, faults[0], faults);
    } else {
      add("evidence_verified_and_valid", true, `${held.length} evidence item(s) valid at the deadline`);
    }
  }

  // 4. Formatting constraints pass.
  {
    const response = r.responseSectionId ? responses[r.responseSectionId] : null;
    if (!r.format) add("formatting_constraints", true, "the tender imposes no format constraint");
    else if (!response) add("formatting_constraints", false, "there is no response to measure");
    else {
      const faults = [];
      if (r.format.maxWords !== null) {
        const n = words(response.text);
        if (n > r.format.maxWords) faults.push(`${n} words against a limit of ${r.format.maxWords}`);
      }
      if (r.format.maxPages !== null && Number.isFinite(response.pages) && response.pages > r.format.maxPages) {
        faults.push(`${response.pages} pages against a limit of ${r.format.maxPages}`);
      }
      if (r.format.fileTypes.length) {
        for (const f of response.files || []) {
          const ext = String(f).toLowerCase().split(".").pop();
          if (!r.format.fileTypes.includes(ext)) faults.push(`${f} is not one of ${r.format.fileTypes.join(", ")}`);
        }
      }
      if (r.format.namePattern) {
        const re = safeRe(r.format.namePattern);
        if (!re) faults.push(`the required name pattern "${r.format.namePattern}" is not usable`);
        else for (const f of response.files || []) if (!re.test(String(f))) faults.push(`${f} does not match the required naming`);
      }
      if (faults.length) add("formatting_constraints", false, faults[0], faults);
      else add("formatting_constraints", true, "within every stated limit");
    }
  }

  // 5. Dependencies resolved.
  {
    if (r.dependencies.length === 0) add("dependencies_resolved", true, "nothing depends on anything else here");
    else {
      const byId = new Map(requirements.map((x) => [String(requirement(x).requirementId), requirement(x)]));
      const unresolved = [];
      for (const d of r.dependencies) {
        const dep = byId.get(d);
        if (!dep) { unresolved.push(`${d} does not exist`); continue; }
        if (dep.status !== "APPROVED" && dep.status !== "WAIVED") unresolved.push(`${d} is ${dep.status}`);
      }
      if (unresolved.length) add("dependencies_resolved", false, unresolved[0], unresolved);
      else add("dependencies_resolved", true, `${r.dependencies.length} dependency(ies) resolved`);
    }
  }

  // 6. No material contradiction open against it.
  {
    const open = contradictions
      .map(contradiction)
      .filter((c) => c.status === "OPEN" && c.material && c.requirementIds.includes(r.requirementId));
    if (open.length) {
      add("contradictions_clear", false, `${open.length} material contradiction(s) open: ${open.map((c) => c.class || "unclassified").join(", ")}`, open);
    } else {
      add("contradictions_clear", true, "no material contradiction is open");
    }
  }

  // 7. A waiver, if there is one, was given by somebody who could give it.
  {
    if (!r.waiver) add("waiver_authority", true, "nothing is waived");
    else if (!r.waiver.by || !r.waiver.role) add("waiver_authority", false, "a waiver with nobody named");
    else if (!WAIVER_AUTHORITY.includes(r.waiver.role)) add("waiver_authority", false, `${r.waiver.role} may not waive a requirement`);
    else if (!r.waiver.reason) add("waiver_authority", false, "a waiver with no reason recorded");
    else if (r.mandatory && r.waiver.role !== "EXECUTIVE_SPONSOR") {
      add("waiver_authority", false, "a MANDATORY requirement may only be waived by the executive sponsor");
    } else add("waiver_authority", true, `waived by ${r.waiver.by} (${r.waiver.role})`);
  }

  // 8. The outputs it requires are actually in the export.
  {
    const need = [r.responseSectionId, ...r.attachmentRefs].filter(Boolean).map(String);
    if (need.length === 0) add("export_manifest", false, "the requirement produces no output at all");
    else {
      const have = new Set(exportManifest.map(String));
      const missing = need.filter((n) => !have.has(n));
      if (missing.length) add("export_manifest", false, `not in the export: ${missing.join(", ")}`, missing);
      else add("export_manifest", true, `${need.length} output(s) present in the export`);
    }
  }

  const failing = checks.filter((c) => !c.ok);
  return {
    requirementId: r.requirementId,
    mandatory: r.mandatory,
    complete: failing.length === 0,
    checks,
    failing,
    // The single most useful line on a screen: the first thing to go and fix.
    say: failing.length === 0 ? "complete" : `${failing[0].id}: ${failing[0].say}`,
  };
}

/** A pattern from a tender document, compiled if it is safe to compile. */
function safeRe(pattern) {
  try {
    if (String(pattern).length > 200) return null;
    return new RegExp(pattern);
  } catch { return null; }
}

/**
 * The whole matrix. Mandatory recall is the number that matters — the
 * specification targets above ninety-nine per cent, and this is what
 * measures it rather than asserting it.
 */
export function matrix(requirements = [], world = {}) {
  const rows = requirements.map((r) => complete(r, { ...world, requirements }));
  const mandatory = rows.filter((r) => r.mandatory);
  const mandatoryComplete = mandatory.filter((r) => r.complete);
  const byFailure = new Map();
  for (const row of rows) {
    for (const f of row.failing) {
      byFailure.set(f.id, (byFailure.get(f.id) || 0) + 1);
    }
  }
  return {
    total: rows.length,
    complete: rows.filter((r) => r.complete).length,
    mandatory: mandatory.length,
    mandatoryComplete: mandatoryComplete.length,
    // Recall against the tender's own mandatory set. One missed mandatory
    // requirement is frequently a rejected tender, so this is reported as a
    // count as well as a rate: "99.2%" of six hundred is five omissions.
    mandatoryRecall: mandatory.length === 0 ? null : mandatoryComplete.length / mandatory.length,
    mandatoryMissing: mandatory.filter((r) => !r.complete).map((r) => ({ requirementId: r.requirementId, say: r.say })),
    failureCounts: [...byFailure.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
    rows,
    ok: mandatory.length > 0 && mandatoryComplete.length === mandatory.length,
  };
}

/** What a set of open contradictions blocks, so the gate engine can read it. */
export function blockedBy(contradictions = []) {
  const open = contradictions.map(contradiction).filter((c) => c.status === "OPEN" && c.material);
  const out = { approval: [], price: [], calculation: [], unclassified: [] };
  for (const c of open) {
    if (!c.class) { out.unclassified.push(c); continue; }
    if (c.blocks && out[c.blocks]) out[c.blocks].push(c);
  }
  return {
    ...out,
    blocksApproval: out.approval.length > 0 || out.unclassified.length > 0,
    blocksPrice: out.price.length > 0 || out.unclassified.length > 0,
    blocksCalculation: out.calculation.length > 0,
    // An unclassified contradiction blocks everything it might block. The
    // alternative is deciding it is harmless without knowing what it is.
    say: out.unclassified.length
      ? `${out.unclassified.length} contradiction(s) carry no class; they block until somebody classifies them`
      : `${open.length} material contradiction(s) open`,
  };
}
