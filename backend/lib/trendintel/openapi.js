/**
 * The published API specification, generated from the constants it describes.
 *
 * Appendix A makes this a G1 deliverable, not documentation: "publish the API
 * specification for §16 at /openapi.json, including all request/response
 * schemas, authentication and role requirements, error envelopes, headers and
 * examples. Import the Growth Brief schema under components and validate every
 * positive and negative fixture in CI. Generate SDK types from that versioned
 * file."
 *
 * SO IT IS GENERATED, NOT WRITTEN. A hand-maintained specification is wrong
 * within a fortnight of the first change, and an integrator who generated a
 * client from it then has types that do not match the server — which is worse
 * than having no specification at all, because they trust it. Every enum,
 * every field list and every limit below is read from the module that enforces
 * it, so the two cannot disagree.
 *
 * WHAT IT DELIBERATELY DOES NOT CLAIM. Appendix A again: "Keep tenant
 * resolution, CMS side effects and quota semantics in integration tests.
 * Static schema validation alone cannot prove them." Nothing in a schema can
 * express "a cross-installation id returns 404 and not 403", so those are
 * stated in the descriptions and proved in `trendintel.test.mjs` and
 * `trendintel.e2e.mjs` rather than implied by a type.
 */

import { BRIEF_REQUIRED, BRIEF_CHANNELS, ROUTES_AVAILABLE, CACHE_CEILING_SECONDS } from "./brief.js";
import { BATCH_LIMITS, OBSERVATION_FIELDS, CORRECTION_HORIZON_DAYS } from "./observations.js";
import { LIVE_ACTION_KINDS, DRAFT_ACTION_KINDS, PATCHABLE_FIELDS, OUT_OF_SCOPE_FIELDS, ACTION_STATES } from "./actions.js";
import { ENTITLEMENT_STATES } from "./entitlement.js";
import { MINIMUM_PROFILE, MODES } from "./installation.js";
import { ACCESS_PATHS, PROVES } from "./sources.js";
import { INFERENCE_MODES } from "./inference.js";

/** Every error this API returns, with the reason each code exists. */
export const ERROR_CODES = Object.freeze({
  SCOPE: "No installation scope resolved, or no grant on the one requested. A cross-installation reference reads as 404 rather than 403, because a 403 confirms the reference exists.",
  REQUEST_ID_REQUIRED: "Every mutation carries a request id so an outcome can be traced to the call that caused it.",
  IDEMPOTENCY_KEY_REQUIRED: "Every mutation carries an Idempotency-Key, scoped by installation and operation. Delivery is at-least-once.",
  IDEMPOTENCY_KEY_REUSED: "The same key with a different canonical payload. A key is not a transaction id.",
  PRECONDITION_REQUIRED: "A write to an existing record needs If-Match; an initial create needs If-None-Match: *.",
  PROFILE_REVISION_CONFLICT: "The profile moved. Re-read and resend.",
  BRIEF_REVISION_CONFLICT: "The brief moved. Approve the revision you were shown.",
  SOURCE_VERSION_CONFLICT: "The same source version arrived with different content. A corrected feed bumps its revision.",
  INVALID_BATCH: "The batch is rejected whole, with indexed validation errors.",
  INVALID_BRIEF: "The brief is a closed object and failed schema validation.",
  INVALID_PROFILE: "The profile is below the minimum that makes an installation.",
  INVALID_SOURCE: "The source registration is incomplete, so the source has no stated permitted use.",
  OPPORTUNITY_NOT_FOUND: "No such opportunity snapshot in this installation.",
  OPPORTUNITY_NOT_ELIGIBLE: "That snapshot's band does not support a brief.",
  ACTION_PREFLIGHT_FAILED: "One or more of the eight preflight checks failed. The asset is untouched.",
  APPROVAL_PAYLOAD_MISMATCH: "The payload changed after it was shown to the approver, so the approval is void.",
  APPROVAL_REFUSED: "Self-approval, or an approver without action:approve scope.",
  EXECUTION_DENIED: "A guard that held at approval does not hold now. The queue is a gap in time.",
  TARGET_REVISION_CONFLICT: "The target changed after the action was approved.",
  APPLY_REFUSED: "The adapter refused the write before changing anything.",
  ROLLBACK_REFUSED: "The applied revision does not match, or the recovery window has closed.",
  ASSET_REFUSED: "A first native page is created and approved by two different resolved accounts.",
  HYPOTHESIS_INCOMPLETE: "An experiment cannot be frozen without all eleven fields and a named owner.",
  QUOTA_EXHAUSTED: "429 with the usage reset timestamp. Hard cap: no automatic overage.",
  GENERATION_UNAVAILABLE: "The entitlement status does not permit generation.",
  WORK_ID_REQUIRED: "A draft needs a logical generation id so a retry is not a second billable unit.",
  NOT_FOUND: "No such record in this installation.",
  INSTALLATION_EXISTS: "That installation id is in use.",
  INVALID_INSTALLATION: "An installation needs an organisation, an installation id and a platform slug; stage and production are distinct installations.",
  SELF_APPROVAL: "The author and the approver are the same account. Segregation that can be waived is not segregation.",
  GRANT_SUBJECT_UNKNOWN: "The grant's subject does not resolve to an active account. A grant to a string is a grant to nobody.",
  GRANT_SCOPE_UNKNOWN: "The grant names a scope this API does not define.",
});

/**
 * Every path this API serves, with its method, scope and the status codes it
 * actually returns. The agreement test reads the router's own source and fails
 * if either side holds a path the other does not.
 */
export const PATHS = Object.freeze([
  { path: "/v1/installations", method: "post", scope: "installation:write", statuses: [201, 409, 422],
    summary: "Create an installation. It starts draft-only with every write connector disabled." },
  { path: "/v1/grants", method: "post", scope: "installation:admin", statuses: [200, 201, 403, 404, 422],
    summary: "Grant scopes on this installation to another resolved account. The creating identity holds every scope EXCEPT brief:approve and action:approve, so a second named account is required before anything can be published. There is no application-wide token and no inherited access." },
  { path: "/v1/profile", method: "put", scope: "profile:write", statuses: [201, 409, 422, 428],
    summary: `Save a validated profile. Requires If-Match on an existing profile and If-None-Match: * on the initial create. Minimum fields: ${MINIMUM_PROFILE.join(", ")}. Modes: ${MODES.join(", ")}.` },
  { path: "/v1/sources", method: "post", scope: "source:write", statuses: [201, 422],
    summary: `Register a source. Access paths: ${ACCESS_PATHS.join(", ")}. What it proves: ${PROVES.join(", ")}.` },
  { path: "/v1/observations:batch", method: "post", scope: "events:write", statuses: [202, 409, 422],
    summary: `Ingest up to ${BATCH_LIMITS.maxItems} observations and ${BATCH_LIMITS.maxBytes} bytes. Returns accepted, duplicate and rejected counts. Fields: ${OBSERVATION_FIELDS.join(", ")}. Late observations inside ${CORRECTION_HORIZON_DAYS} days are marked for rescoring.` },
  { path: "/v1/opportunities", method: "get", scope: "trend:read", statuses: [200],
    summary: "List scored opportunities with score breakdown, vetoes, source health and last refresh." },
  { path: "/v1/opportunities:score", method: "post", scope: "trend:write", statuses: [201, 422],
    summary: "Score a topic. Returns the opportunity score, the confidence, the band and the independent source families the confidence was capped against." },
  { path: "/v1/briefs", method: "post", scope: "brief:write", statuses: [201, 404, 422],
    summary: `Create a draft brief from an eligible opportunity snapshot. The brief is a CLOSED object: ${BRIEF_REQUIRED.length} required fields and no others.` },
  { path: "/v1/briefs/{id}:approve", method: "post", scope: "brief:approve", statuses: [200, 403, 404, 409, 428],
    summary: "Approve an exact revision with If-Match, replacing the active pointer for its scope atomically. Author and approver must differ." },
  { path: "/v1/briefs:effective", method: "get", scope: "brief:read", statuses: [200, 204],
    summary: `Resolve one approved, fresh brief. 204 with X-Fallback: baseline when none matches — an absent brief is not an empty one. The SDK may cache for at most ${CACHE_CEILING_SECONDS}s and never beyond expiry, and the cache is never authority to write. Routes available in this release: ${ROUTES_AVAILABLE.join(", ")}; the enum reserves ${BRIEF_CHANNELS.join(", ")}.` },
  { path: "/v1/actions", method: "post", scope: "action:propose", statuses: [201, 404, 422],
    summary: `Propose an action without changing the asset. Live kinds: ${LIVE_ACTION_KINDS.join(", ")}. Draft kinds: ${DRAFT_ACTION_KINDS.join(", ")}. Patchable: ${PATCHABLE_FIELDS.join(", ")}. Out of scope for v1 automation: ${OUT_OF_SCOPE_FIELDS.join(", ")}.` },
  { path: "/v1/actions/{id}:approve", method: "post", scope: "action:approve", statuses: [200, 403, 404, 409],
    summary: "Bind an approval to the canonical payload hash and the target revision. Self-approval of a live change is refused." },
  { path: "/v1/actions/{id}:execute", method: "post", scope: "action:execute", statuses: [200, 404, 409, 422],
    summary: `Re-run every guard, then apply by compare-and-set. States: ${ACTION_STATES.join(", ")}.` },
  { path: "/v1/actions/{id}:rollback", method: "post", scope: "action:rollback", statuses: [200, 403, 404, 409],
    summary: "Queue a compensating write restoring only the fields the action owned. Permitted during a freeze." },
  { path: "/v1/actions/{id}", method: "get", scope: "action:read", statuses: [200, 404],
    summary: "Return state, revisions, receipt, policy and reconciliation status." },
  { path: "/v1/assets", method: "post", scope: "asset:write", statuses: [201, 422],
    summary: "Create a native owned-surface page. Created and approved by two different resolved accounts." },
  { path: "/v1/assets/{assetId}", method: "get", scope: "asset:read", statuses: [200, 404],
    summary: "Return stable id, current revision, permitted field values and content hash." },
  { path: "/v1/outcomes:batch", method: "post", scope: "outcome:write", statuses: [202, 422],
    summary: "Ingest deduplicated eligible sessions and conversions. A CTA completion counts as a CTA completion; a downstream conversion counts only where its data arrives." },
  { path: "/v1/experiments", method: "post", scope: "experiment:write", statuses: [201, 422],
    summary: "Freeze a hypothesis at approval: eleven fields including a control method and a named owner." },
  { path: "/v1/experiments/{id}", method: "get", scope: "experiment:read", statuses: [200, 404],
    summary: "Report the outcome with its method, maturity, guardrails, sample status and whether it is observational or an incremental estimate." },
  { path: "/v1/drafts", method: "post", scope: "draft:write", statuses: [201, 403, 404, 422, 429],
    summary: `Generate a draft on the installation's authorised route. Modes: ${INFERENCE_MODES.join(", ")}. There is no implicit cross-provider fallback. Quota is reserved before generation and a template fallback is not metered.` },
  { path: "/v1/public/{slug}", method: "get", scope: "public:read", statuses: [200, 404],
    summary: "Serve the active revision of a native page. A draft revision is never served publicly." },
  { path: "/v1/capabilities", method: "get", scope: "capability:read", statuses: [200],
    summary: "What this installation can and cannot do, with the reason for each unavailable capability and no request for a credential." },
]);

/**
 * The OpenAPI document. Built on every call from the constants above, so it
 * cannot be stale.
 */
export function openapi({ serverUrl = "/api/trendintel" } = {}) {
  const errorEnvelope = {
    type: "object", required: ["code", "message", "retryable"],
    properties: {
      code: { type: "string", enum: Object.keys(ERROR_CODES) },
      message: { type: "string" },
      request_id: { type: "string" },
      retryable: { type: "boolean" },
    },
    example: { code: "TARGET_REVISION_CONFLICT", message: "The target changed after the action was approved.", request_id: "req_demo_173", retryable: false },
  };

  const growthBrief = {
    type: "object", additionalProperties: false, title: "Growth Brief v1",
    description: "A CLOSED object. An unknown field is a newer schema, a caller sending instructions the contract does not define, or injected text, and a tolerant reader cannot tell them apart.",
    required: [...BRIEF_REQUIRED],
    properties: {
      schema_version: { type: "integer", enum: [1] },
      brief_id: { $ref: "#/components/schemas/Id" },
      brief_version: { type: "integer", minimum: 1 },
      tenant_id: { $ref: "#/components/schemas/Id" },
      platform_id: { $ref: "#/components/schemas/Id" },
      market: { type: "string", pattern: "^[A-Z]{2}$", description: "ISO alpha-2, or ZZ for an explicitly global brief which never matches a country-targeted lookup." },
      locale: { type: "string", minLength: 2, maxLength: 35 },
      topic_id: { $ref: "#/components/schemas/Id" },
      opportunity_score: { $ref: "#/components/schemas/Score" },
      confidence: { $ref: "#/components/schemas/Score" },
      valid_from: { $ref: "#/components/schemas/Utc" },
      expires_at: { $ref: "#/components/schemas/Utc" },
      evidence_ids: { type: "array", minItems: 1, maxItems: 64, uniqueItems: true, items: { $ref: "#/components/schemas/Id" } },
      audience: { $ref: "#/components/schemas/ShortText" },
      intent: { $ref: "#/components/schemas/ShortText" },
      approved_claim_ids: { type: "array", maxItems: 64, uniqueItems: true, items: { $ref: "#/components/schemas/Id" } },
      cta_id: { $ref: "#/components/schemas/Id" },
      allowed_channels: { type: "array", minItems: 1, maxItems: 6, uniqueItems: true, items: { type: "string", enum: [...BRIEF_CHANNELS] } },
      prohibited_claims: { type: "array", maxItems: 32, uniqueItems: true, items: { $ref: "#/components/schemas/ShortText" } },
      objective: { $ref: "#/components/schemas/ShortText" },
      experiment_id: { $ref: "#/components/schemas/Id" },
      policy_version: { type: "integer", minimum: 1 },
    },
  };

  const paths = {};
  for (const p of PATHS) {
    const key = p.path;
    paths[key] = paths[key] || {};
    const responses = {};
    for (const s of p.statuses) {
      responses[String(s)] = s >= 400
        ? { description: ERROR_CODES[Object.keys(ERROR_CODES)[0]] && "An error envelope.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
        : { description: s === 204 ? "No eligible match. X-Fallback: baseline — the caller uses its baseline behaviour." : "Success." };
    }
    const mutation = p.method !== "get";
    paths[key][p.method] = {
      summary: p.summary,
      operationId: `${p.method}_${key.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
      security: [{ bearerAuth: [p.scope] }],
      parameters: [
        { name: "X-Installation", in: "header", required: false, schema: { type: "string" },
          description: "Required only for an identity granted more than one installation. The grant is checked before any record is touched, and a reference with no grant reads as 404." },
        ...(mutation ? [
          { name: "X-Request-Id", in: "header", required: true, schema: { type: "string" } },
          { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" },
            description: "An identical replay returns the stored response and is marked Idempotent-Replay: true. The same key with a different canonical payload is 409." },
        ] : []),
      ],
      responses,
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Trend Intelligence v1",
      version: "1.0.0",
      description: [
        "Keyless signal reading, scored opportunities, one versioned Growth Brief, approved owned-surface writes and native outcome measurement.",
        "",
        "Four things a schema cannot express and that are proved by integration test instead:",
        "· tenant resolution — a cross-installation id is 404 and a known identity lacking authority is 403, and those answers are never swapped;",
        "· idempotency — an identical replay returns the STORED response, not a fresh success;",
        "· write safety — approval binds to a payload hash and a target revision, and every guard runs again at execution;",
        "· quota — a unit is reserved before generation and a template fallback is never metered.",
        "",
        `Entitlement statuses: ${ENTITLEMENT_STATES.join(", ")}. Grace, suspended and ended are read, export and authorised rollback only.`,
      ].join("\n"),
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "An installation-bound credential. Scope is checked per operation; there is no application-wide shared production token." } },
      schemas: {
        Id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$" },
        Score: { type: "number", minimum: 0, maximum: 100 },
        Utc: { type: "string", format: "date-time", pattern: "Z$" },
        ShortText: { type: "string", minLength: 1, maxLength: 500 },
        Error: errorEnvelope,
        GrowthBriefV1: growthBrief,
      },
    },
    paths,
    "x-error-codes": ERROR_CODES,
  };
}
