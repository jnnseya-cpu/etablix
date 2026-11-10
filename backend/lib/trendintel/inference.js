/**
 * The inference gateway. A ROUTER AND A VALIDATOR, and not a caller.
 *
 * THIS FILE CONSTRUCTS NO PROMPTS AND MAKES NO PROVIDER CALL. That is the
 * same rule the L7 llm adapter carries and it is here for the same reason:
 * the platform's writing standard lives in one place, and a module that both
 * chose a route and composed a prompt would be a second, unheld writing path.
 * What this does is decide WHICH authorised route may be used, bound the
 * request, and refuse an output that does not conform. The provider call, if
 * one happens at all, belongs to the host's own gateway.
 *
 * THE KEYLESS REQUIREMENT IS A RELEASE GATE, NOT A PREFERENCE (§2). The core
 * workflow must run end to end without anybody obtaining or entering a new
 * third-party API key, connector token, OAuth grant or AI provider key. Three
 * consequences are enforced here:
 *
 *   ONE · THERE IS NO IMPLICIT CROSS-PROVIDER FALLBACK. If the host route is
 *   unavailable, the answer is a route the installation has ALREADY approved,
 *   or deterministic templates. Never a different provider because it
 *   happened to be reachable. TI-19 is exactly this, and a fallback chain
 *   that "just works" is how data reaches a provider nobody authorised.
 *
 *   TWO · NOTHING HERE EVER ASKS FOR A CREDENTIAL. When a source or a
 *   destination needs a token the installation does not already hold, the
 *   capability is reported UNAVAILABLE with the reason and the workflow
 *   continues on what is available (TI-22). Prompting for a key is the
 *   failure mode, not the remedy.
 *
 *   THREE · NO PROVIDER SECRET APPEARS IN CONFIGURATION, PROMPTS, LOGS OR
 *   TRACES (§14, TI-18). `redactRoute()` is what the trace records, and the
 *   test asserts the shape rather than trusting the convention.
 *
 * AND MODEL OUTPUT IS DATA. Feed text, user content and imported text are
 * untrusted (§8). An output that is not schema-valid, or that names an action
 * kind outside the typed allowlist, is rejected — it does not get interpreted
 * generously. TI-06 is a model input carrying instructions to bypass approval
 * or change spend, and the defence is not detection: it is that the executor
 * accepts only validated typed actions and the model cannot emit one.
 */

/** The three inference modes, §2. There is no fourth and no automatic chain. */
export const INFERENCE_MODES = Object.freeze(["host", "deployment", "deterministic"]);

/** What a structured request must carry, §14. */
export const REQUEST_FIELDS = Object.freeze([
  "installationId", "requestId", "purpose", "modelAlias", "schemaRevision",
  "input", "deadlineMs", "tokenLimit",
]);

/** What a response must carry back, §14. */
export const RESPONSE_FIELDS = Object.freeze([
  "requestId", "output", "resolvedModel", "usage", "status",
]);

/** §17: the draft timeout and the single retry for invalid structured output. */
export const DRAFT_TIMEOUT_MS = 60_000;
export const STRUCTURED_RETRIES = 1;

/** Typed statuses a route may return, §14. An unlisted one is a failure. */
export const ROUTE_STATUS = Object.freeze([
  "ok", "invalid_output", "rate_limited", "unavailable", "unauthorised", "timeout",
]);

/**
 * Field names that must never appear in a route configuration, §14: "Do not
 * add provider-key fields to the module configuration, UI, prompts or logs."
 * Checked rather than documented, because this is the kind of field that
 * arrives in a hurry during an integration.
 */
const SECRET_FIELDS = /^(api[_-]?key|apikey|secret|token|bearer|password|refresh[_-]?token|client[_-]?secret|authorization)$/i;

const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Choose the route for one request.
 *
 * `approvedRoutes` is the installation's own list. A route not on it is not
 * selected even when it is configured and reachable, because reachability is
 * not authorisation.
 */
export function selectRoute({
  hostGateway = null, deploymentInference = null,
  approvedRoutes = [], egressBlocked = false, installationId = null,
} = {}) {
  const approved = new Set([...(Array.isArray(approvedRoutes) ? approvedRoutes : [])].map(str));
  const trail = [];

  const hostUsable = Boolean(hostGateway && hostGateway.available !== false && hostGateway.authorised !== false);
  if (approved.has("host")) {
    if (hostUsable) {
      return { ok: true, mode: "host", route: redactRoute(hostGateway), keyless: true, trail,
               say: `Host AI: the platform's existing gateway and its own authorised models. Provider credentials, rate limits and routing stay with the host; this installation supplies no key.` };
    }
    trail.push(`host approved but ${hostGateway ? (hostGateway.authorised === false ? "not authorised for this installation" : "unavailable") : "not configured"}`);
  } else if (hostGateway) {
    trail.push("a host gateway is configured but is not on this installation's approved route list, so it is not used");
  }

  const deployUsable = Boolean(deploymentInference && deploymentInference.available !== false);
  if (approved.has("deployment")) {
    if (deployUsable) {
      return { ok: true, mode: "deployment", route: redactRoute(deploymentInference), keyless: true, trail,
               say: `Deployment AI: inference shipped with the product${egressBlocked ? ", running locally with outbound model traffic blocked" : ""}. The customer supplies no AI key.` };
    }
    trail.push(`deployment inference approved but unavailable`);
  } else if (deploymentInference) {
    trail.push("deployment inference exists but is not approved for this installation");
  }

  // Deterministic is always reachable and is never a silent downgrade: the
  // degraded flag travels with every artefact produced this way.
  return {
    ok: true, mode: "deterministic", route: null, keyless: true, degraded: true, trail,
    say: `Deterministic: local detection, scoring, templates, review and export, with no model and no provider account. ${trail.length ? trail.join("; ") + ". " : ""}No request is made to an unapproved provider — a reachable route is not an authorised one, so there is no implicit cross-provider fallback.`,
  };
}

/** What a trace or a log may hold about a route. Never a credential. */
export function redactRoute(route) {
  if (!route || typeof route !== "object") return null;
  const out = {};
  for (const [k, v] of Object.entries(route)) {
    if (SECRET_FIELDS.test(k)) continue;
    if (typeof v === "object" && v !== null) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Whether a configuration carries a provider secret it must not, TI-18.
 * Returns the offending paths so the message can name them.
 */
export function auditConfiguration(config, { path = "config" } = {}) {
  const found = [];
  const walk = (node, at) => {
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (SECRET_FIELDS.test(k)) found.push(`${at}.${k}`);
      if (v && typeof v === "object") walk(v, `${at}.${k}`);
    }
  };
  walk(config, path);
  return found.length
    ? { ok: false, found, say: `Provider credential field(s) present where none may be: ${found.join(", ")}. The module never takes possession of a connector's secrets; a field that can hold one will eventually hold one.` }
    : { ok: true, found: [], say: "No provider credential field in the module configuration, as required." };
}

/** Validate an outbound request before a route is used, §14. */
export function validateRequest(req = {}) {
  const missing = REQUEST_FIELDS.filter((f) => {
    const v = req[f];
    if (["deadlineMs", "tokenLimit"].includes(f)) return num(v) === null;
    return v === undefined || v === null || str(v).trim() === "";
  });
  if (missing.length) {
    return { ok: false, missing, say: `The request is incomplete: ${missing.join(", ")}. An unbounded request has no deadline to honour and no token limit to enforce.` };
  }
  const secrets = auditConfiguration(req, { path: "request" });
  if (!secrets.ok) return { ok: false, reason: "credential-in-request", ...secrets };
  const deadline = num(req.deadlineMs);
  if (deadline > DRAFT_TIMEOUT_MS) {
    return { ok: false, reason: "deadline-too-long",
             say: `A ${deadline}ms deadline exceeds the ${DRAFT_TIMEOUT_MS}ms draft timeout. A job that outlives its timeout holds a quota reservation nobody is waiting for.` };
  }
  return { ok: true, say: `Request ${str(req.requestId)} bound: purpose ${str(req.purpose)}, model alias ${str(req.modelAlias)}, schema revision ${str(req.schemaRevision)}, ${deadline}ms deadline, ${num(req.tokenLimit)} token limit.` };
}

/**
 * Accept or reject a structured output.
 *
 * `allowedKinds` is the typed action allowlist. The model cannot widen it,
 * and text inside the output asking for something else is text — the whole
 * defence against TI-06 is that there is no path from a string to a
 * privileged action, not that the string was spotted.
 */
export function acceptOutput({ raw = null, parsed = undefined, allowedKinds = [], schemaRevision = null, requestSchemaRevision = null } = {}) {
  const kinds = new Set([...(Array.isArray(allowedKinds) ? allowedKinds : [])].map(str));
  let value = parsed;
  if (value === undefined) {
    if (typeof raw !== "string") {
      return { ok: false, status: "invalid_output", reason: "not-structured",
               say: "The route returned nothing parseable. Inference returns schema-validated proposals only; prose is not a proposal." };
    }
    try { value = JSON.parse(raw); }
    catch {
      return { ok: false, status: "invalid_output", reason: "invalid-json",
               say: "The output is not valid JSON. Rejected rather than repaired: a repaired output is a guess about intent." };
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, status: "invalid_output", reason: "not-an-object", say: "A proposal must be an object." };
  }
  if (schemaRevision !== null && requestSchemaRevision !== null && str(schemaRevision) !== str(requestSchemaRevision)) {
    return { ok: false, status: "invalid_output", reason: "schema-revision-mismatch",
             say: `The output declares schema revision ${str(schemaRevision)} and the request asked for ${str(requestSchemaRevision)}. Every prompt template and output schema is independently revisioned; a mismatch is not a near-miss.` };
  }
  const kind = str(value.action_kind || value.actionKind);
  if (!kind) {
    return { ok: false, status: "invalid_output", reason: "no-action-kind",
             say: "The proposal names no action kind. The executor interprets only validated typed actions, so an untyped proposal has nothing to execute." };
  }
  if (!kinds.has(kind)) {
    return { ok: false, status: "invalid_output", reason: "unknown-action-kind", kind,
             say: `"${kind}" is not an action kind this installation accepts (${[...kinds].sort().join(", ") || "none enabled"}). Rejected. Instructions inside model input cannot add one: there is no path from a string to a privileged action.` };
  }
  // Fields the model is never allowed to set, whatever it asks for. Approval,
  // spend and privilege are decided by policy and by people.
  const forbidden = ["approved", "approver", "approval", "policy_version", "policyVersion",
                     "spend", "budget", "privilege", "role", "scope", "installation_id", "installationId"];
  const claimed = forbidden.filter((f) => f in value);
  if (claimed.length) {
    return { ok: false, status: "invalid_output", reason: "privileged-field-claimed", claimed,
             say: `The proposal sets ${claimed.join(", ")}, which the model may never set. Approval, spend, privilege and tenancy are resolved server-side from the session, never from a payload.` };
  }
  return { ok: true, status: "ok", kind, proposal: value,
           say: `Accepted as a ${kind} proposal. It is a proposal: nothing is applied without approval bound to its exact payload hash and the target's revision.` };
}

/**
 * One drafting attempt plus the single retry, §17.
 *
 * `attempt` is a function the caller supplies, so this file still makes no
 * call of its own. Exhaustion creates a REVIEW TASK rather than a silent
 * failure or a third attempt.
 */
export function draftWithRetry(attempt, { allowedKinds = [], retries = STRUCTURED_RETRIES } = {}) {
  const tried = [];
  for (let i = 0; i <= retries; i += 1) {
    let out;
    try { out = attempt(i); }
    catch (err) { tried.push({ attempt: i, status: "unavailable", why: String(err?.message || err).slice(0, 200) }); continue; }
    const accepted = acceptOutput({ ...out, allowedKinds });
    if (accepted.ok) return { ok: true, attempts: i + 1, ...accepted, tried };
    tried.push({ attempt: i, status: accepted.status, why: accepted.reason });
  }
  return {
    ok: false, attempts: retries + 1, tried, reviewTask: true,
    say: `${retries + 1} attempt(s) produced no schema-valid proposal (${tried.map((t) => t.why).join(", ")}). A review task is created. Nothing is published and no attempt is counted as a completed draft for metering.`,
  };
}

/**
 * The deterministic template, §17.
 *
 * It is a real artefact — evidence, scope, expiry — and it is flagged
 * degraded. A template that looked like a model draft would be the single
 * most misleading thing this system could produce, because the reviewer's
 * whole job is to judge the reasoning.
 */
export function templateDraft({ brief = null, evidenceIds = [], channel = null, reason = "no-authorised-inference-route" } = {}) {
  if (!brief) {
    return { ok: false, say: "A template still needs a brief: it is a shorter honest artefact, not a blank one." };
  }
  return {
    ok: true, status: "draft", degraded: true, mode: "deterministic", reason,
    draft: {
      brief_id: brief.brief_id, brief_version: brief.brief_version,
      market: brief.market, locale: brief.locale, channel: channel ? str(channel) : null,
      audience: brief.audience, intent: brief.intent, objective: brief.objective,
      approved_claim_ids: [...(brief.approved_claim_ids || [])],
      prohibited_claims: [...(brief.prohibited_claims || [])],
      cta_id: brief.cta_id,
      evidence_ids: evidenceIds.length ? [...evidenceIds].map(str) : [...(brief.evidence_ids || [])],
      expires_at: brief.expires_at,
      body: null,
    },
    say: `Deterministic template against ${brief.brief_id} revision ${brief.brief_version}, flagged degraded (${reason}). Detection, scoring, review and export are unaffected; the copy is not written and is not presented as though it were.`,
  };
}

/**
 * A capability that needs a credential the installation does not hold, §2
 * and TI-22. It is reported, not requested.
 */
export function capabilityUnavailable({ capability, needs, alternative = null } = {}) {
  return {
    ok: false, available: false, capability: str(capability), needs: str(needs),
    promptsForCredential: false,
    alternative: alternative ? str(alternative) : null,
    say: `${str(capability)} is unavailable: it needs ${str(needs)}, which this installation does not already hold. No credential is requested${alternative ? `; ${str(alternative)}` : ""}. The workflow continues on the signals and the owned surface that are available, and the gap stays visible rather than being filled.`,
  };
}

export function inferenceNotes(selection) {
  if (!selection) return [];
  const out = [selection.say];
  if (selection.trail?.length) out.push(`Route trail: ${selection.trail.join("; ")}.`);
  if (selection.degraded) out.push("Every artefact produced on this route carries the degraded flag, so a reviewer is never shown a template as though a model had reasoned about it.");
  return out;
}
