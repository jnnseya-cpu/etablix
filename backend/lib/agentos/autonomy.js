/**
 * Five execution classes, and the one that denies.
 *
 * A0 read, A1 reversible internal write, A2 act under a scope-bound
 * delegation, A3 prepare and route then follow through once authority is
 * verified, A4 deny the tool and the command. Four of them are permissions.
 * The fifth is the only one that matters when something goes wrong.
 *
 * WHY A4 IS A CLASS AND NOT A GUIDELINE. The actions in it — energise or
 * isolate live equipment, actuate a gate or bypass its emergency control,
 * impersonate a competent person, bypass a mandatory hold, fabricate field or
 * regulator evidence — are not things to be discouraged. They are things that
 * must fail at the tool boundary, and fail identically however politely they
 * are asked for, by whoever asks, in whatever document the asking arrives in.
 *
 * AND THAT LAST CLAUSE IS THE WHOLE POINT. The specification's own acceptance
 * test asks for energisation "from chat or uploaded note" — a supplier's PDF,
 * a site diary, a drawing comment. Text inside a document is DATA. A platform
 * that denies a request typed by a person and performs the same request found
 * in an attachment has a control that protects it from its own operators and
 * not from anybody else. So `mayExecute` takes the source and reports it, and
 * the verdict does not vary with it.
 *
 * DENIAL IS NOT THE END OF THE ANSWER. Refusing to energise a panel and
 * saying nothing else leaves somebody with a live problem and no route. Every
 * A4 denial names the workflow that does carry the action — a competent
 * person under the applicable field authority — because the actions on this
 * list are not forbidden in the world, only forbidden here.
 *
 * TWO CLASSES CARRY BINDINGS AND THEY ARE DIFFERENT BINDINGS. An A2
 * delegation binds the ACTOR and the SHAPE of what may be done: entity,
 * project, action, scope, channel, recipient, threshold, cumulative cap and a
 * window. An A3 approval binds the PAYLOAD: this exact text, these
 * attachments, this evidence, this contract, this authorisation snapshot — so
 * a material change invalidates an authority that has not yet been used.
 * Conflating them produces a system where an approval for one order
 * authorises a different one.
 */

import { instant } from "../l7/evidence.js";

/** The five classes, with the existing L0–L7 ladder they sit against. */
export const EXECUTION_CLASSES = [
  { id: "A0", name: "Observe", execution: "Read, analyse and observe autonomously within permissions", maps: ["L1", "L3"] },
  { id: "A1", name: "Reversible internal write", execution: "Draft, compare, forecast, flag — nothing leaves and nothing commits", maps: ["L2", "L5"] },
  { id: "A2", name: "Delegated act", execution: "Act under a current scope-bound delegation and a passed policy check", maps: ["L4", "L6"] },
  { id: "A3", name: "Prepare, route, follow through", execution: "Agent prepares and routes; executes permitted follow-through once authority is verified", maps: ["L7"] },
  { id: "A4", name: "Denied", execution: "Deny the tool and the command", maps: [] },
];

/**
 * The denied actions. Each is matched on intent rather than on wording,
 * because the request will not use the specification's phrasing.
 */
export const DENIED_ACTIONS = [
  { id: "energise", label: "energise or isolate live equipment",
    match: /\b(?:re-?|de-?)?(?:energis|energiz|isolat)\w*|\bswitch(?:ing)?\s+(?:on|off)\b|\brack\s+(?:in|out)\b|\b(?:close|open)\s+the\s+breaker\b|\bmake\s+(?:it\s+)?live\b|\block\s?out\b|\btag\s?out\b/i,
    route: "the competent person holding the electrical safety rules for that system, under the applicable permit to work" },
  { id: "gate", label: "actuate a gate or bypass its emergency control",
    match: /\bopen\s+the\s+gate\b|\bactuat\w*|\bbarrier\s+(?:up|down)\b|\braise\s+the\s+barrier\b|\bbypass\w*\s+(?:the\s+)?(?:emergency|e-?stop|safety)|\boverrid\w*\s+(?:the\s+)?(?:e-?stop|interlock|emergency)/i,
    route: "the site security and traffic management arrangements, and the gate's own emergency control" },
  { id: "impersonate", label: "impersonate a competent person",
    match: /\bsign(?:ing|ed)?\s+(?:as|on behalf of|off as)\s+(?:the\s+)?(?:competent|engineer|inspector|ap\b|authorised person)|\bcountersign\w*|\bas\s+the\s+(?:competent|authorised)\s+person|\bissu\w*\s+the\s+permit\b/i,
    route: "the named competent person, whose signature is the evidence and cannot be produced by anybody else" },
  { id: "bypass-hold", label: "bypass a mandatory hold",
    match: /\bbypass\w*\s+(?:the\s+)?hold\b|\boverrid\w*\s+(?:the\s+)?(?:hold|gate)\b|\bforc\w*\s+(?:the\s+)?(?:release|gate)\b|\bskip\w*\s+(?:the\s+)?(?:gate|hold|test)\b|\bwaiv\w*\s+(?:the\s+)?mandatory/i,
    route: "the authority that owns the hold, which may lift it on the record and with a reason" },
  { id: "fabricate", label: "fabricate field or regulator evidence",
    match: /\bback-?dat\w*|\bfabricat\w*|\bmake\s+up\s+(?:a|the|some)\s+(?:certificate|evidence|reading|record)|\binvent\w*\s+(?:a|the)\s+(?:reading|certificate|record)|\bforg(?:e|es|ed|ing)\b/i,
    route: "nobody — the evidence is obtained from the party who can produce it, or the gap is reported as a gap" },
];

/** Every field an A2 delegation binds. Missing any one is not a delegation. */
export const DELEGATION_BINDINGS = [
  "actor", "entity", "project", "action", "scope", "channel", "recipient", "threshold", "cumulativeCap", "effectiveFrom", "effectiveTo", "revision",
];

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

/** Is this request one of the denied actions? Source is reported, never weighed. */
export function deniedAction(text, { source = "unknown" } = {}) {
  const s = String(text ?? "");
  const hits = DENIED_ACTIONS.filter((d) => d.match.test(s));
  if (!hits.length) return { denied: false, source: String(source), matches: [] };
  return {
    denied: true,
    source: String(source),
    matches: hits.map((h) => ({ id: h.id, label: h.label, route: h.route })),
    say: `A4 — denied: ${hits.map((h) => h.label).join("; ")}. `
       + `Requested via ${source}, which does not change the answer. `
       + `This belongs to ${hits[0].route}.`,
  };
}

/** An A2 delegation, checked field by field against this request. */
export function checkDelegation(delegation = {}, request = {}, { today = null } = {}) {
  const d = delegation || {};
  const missing = DELEGATION_BINDINGS.filter((k) => d[k] === undefined || d[k] === null || d[k] === "");
  if (missing.length) {
    return { ok: false, reason: "INCOMPLETE_DELEGATION", missing,
             say: `a delegation missing ${missing.join(", ")} is not a delegation, it is a preference` };
  }

  const mismatches = [];
  for (const k of ["entity", "project", "action", "scope", "channel", "recipient"]) {
    if (request[k] !== undefined && String(request[k]) !== String(d[k])) {
      mismatches.push({ field: k, delegated: String(d[k]), requested: String(request[k]) });
    }
  }
  if (mismatches.length) {
    return { ok: false, reason: "SCOPE_MISMATCH", mismatches,
             say: `outside the delegation: ${mismatches.map((m) => `${m.field} is delegated for ${m.delegated} and requested for ${m.requested}`).join("; ")}` };
  }

  const now = today ? instant(today) : null;
  const from = instant(d.effectiveFrom);
  const to = instant(d.effectiveTo);
  if (now !== null && from !== null && now < from) {
    return { ok: false, reason: "NOT_YET_EFFECTIVE", say: `the delegation begins ${d.effectiveFrom}` };
  }
  if (now !== null && to !== null && now > to) {
    return { ok: false, reason: "EXPIRED", say: `the delegation expired ${d.effectiveTo}` };
  }

  const value = num(request.value);
  const threshold = num(d.threshold);
  const used = num(request.cumulativeUsed) ?? 0;
  const cap = num(d.cumulativeCap);
  if (value !== null && threshold !== null && value > threshold) {
    return { ok: false, reason: "OVER_THRESHOLD", say: `${value} exceeds the per-action threshold of ${threshold}` };
  }
  if (value !== null && cap !== null && used + value > cap) {
    return { ok: false, reason: "OVER_CAP",
             say: `${used} already used plus ${value} exceeds the cumulative cap of ${cap} — the cap is the control a per-action threshold cannot be` };
  }

  return { ok: true, reason: null, revision: String(d.revision),
           say: `within delegation revision ${d.revision}` };
}

/**
 * An A3 authority, bound to the exact payload.
 *
 * A material change invalidates an unexecuted approval. The test is a
 * comparison of what was approved against what is about to be sent, field by
 * field — not a flag somebody sets when they remember to.
 */
export function checkA3Authority({ approved = null, pending = null, fields = ["payload", "attachments", "evidence", "contract", "authorisation"] } = {}) {
  if (!approved) {
    return { ok: false, reason: "NO_AUTHORITY", changed: [], say: "no authority has been given for this payload" };
  }
  if (!pending) {
    return { ok: false, reason: "NOTHING_PENDING", changed: [], say: "there is no pending payload to compare against the authority" };
  }
  const changed = fields.filter((f) => JSON.stringify(approved[f] ?? null) !== JSON.stringify(pending[f] ?? null));
  if (changed.length) {
    return {
      ok: false, reason: "AUTHORITY_INVALIDATED", changed,
      say: `${changed.join(", ")} changed since the authority was given, which invalidates it — an approval for one payload does not authorise another`,
    };
  }
  return { ok: true, reason: null, changed: [], say: "the pending payload is the one that was authorised, field for field" };
}

/**
 * The single entry point. Classify, deny if denied, then check the binding
 * the class carries.
 */
export function mayExecute({
  action = "", intent = "", class: klass = null, source = "unknown",
  delegation = null, request = null, approved = null, pending = null, today = null,
} = {}) {
  // A4 first, always, and before anything is read about permissions. A denied
  // action does not become permitted by arriving with a valid delegation.
  const denial = deniedAction(`${action} ${intent}`, { source });
  if (denial.denied) {
    return { ok: false, class: "A4", source: denial.source, denial, route: denial.matches[0].route, say: denial.say };
  }

  const c = String(klass ?? "").toUpperCase();
  if (!EXECUTION_CLASSES.some((x) => x.id === c)) {
    return { ok: false, class: null, say: `"${String(klass ?? "")}" is not one of ${EXECUTION_CLASSES.map((x) => x.id).join(", ")}; an unclassified action is not executed` };
  }
  if (c === "A0" || c === "A1") {
    return { ok: true, class: c, say: `${c} — ${EXECUTION_CLASSES.find((x) => x.id === c).execution}` };
  }
  if (c === "A2") {
    const v = checkDelegation(delegation || {}, request || {}, { today });
    return { ok: v.ok, class: "A2", delegation: v, say: `A2 — ${v.say}` };
  }
  const v = checkA3Authority({ approved, pending });
  return { ok: v.ok, class: "A3", authority: v, say: `A3 — ${v.say}` };
}

/** The notes an approver reads. */
export function autonomyNotes(result) {
  if (!result) return [];
  if (result.class === "A4") {
    return [`DENIED AT THE TOOL BOUNDARY — ${result.denial.say} `
      + "This is not a refusal to help. The action exists and somebody performs it; it is not this platform's to perform, "
      + `and the route is named so the problem does not sit with nobody.`];
  }
  if (!result.ok) {
    return [`NOT EXECUTED — ${result.say}.`];
  }
  return [];
}
