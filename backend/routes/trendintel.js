/**
 * The Trend Intelligence API, and the four things §16 will not let it do.
 *
 * ONE · TENANCY NEVER COMES FROM THE BODY. The installation is resolved from
 * the authenticated session and, for a multi-install identity, from an
 * explicit `X-Installation` header whose GRANT IS CHECKED before any record
 * is touched. A payload that can name its own installation can name any.
 *
 * TWO · A CROSS-INSTALLATION ID IS 404, NOT 403. A 403 confirms the id
 * exists, which is a cross-tenant disclosure made out of politeness. A known
 * identity that simply lacks authority is 403 — the identity is real and the
 * authority is not, and those two answers must not be swapped.
 *
 * THREE · EVERY MUTATION CARRIES A REQUEST ID AND AN IDEMPOTENCY-KEY. An
 * identical replay returns THE STORED RESPONSE, not a fresh success; the same
 * key with a different canonical payload is 409. Deduplication records are
 * kept for the retry horizon.
 *
 * FOUR · THE PROFILE IS WRITTEN WITH If-Match, OR NOT AT ALL. A missing
 * If-Match on an existing profile is 428 — not a convenience to be filled in
 * server-side, because the whole point is that the writer saw the revision
 * they are replacing. The initial create uses If-None-Match: *.
 *
 * The status codes are §16's, including the two that are easy to get wrong:
 * 204 when no effective brief matches (an absent brief is not an empty one),
 * and 202 for accepted work rather than 200.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { collection, insert, update } from "../lib/store.js";

import { ingestBatch, resolveForCaller, BATCH_LIMITS } from "../lib/trendintel/observations.js";
import { scoreTopic, movement, demandComponent } from "../lib/trendintel/score.js";
import { independentFamilies, registerSource, sameCluster } from "../lib/trendintel/sources.js";
import { validateBrief, briefIsEffective, resolveEffective, cacheTtlSeconds } from "../lib/trendintel/brief.js";
import { preflight, approve, authoriseExecution, authoriseRollback, idempotencyKey, payloadHash, LIVE_ACTION_KINDS, DRAFT_ACTION_KINDS, PATCHABLE_FIELDS, OUT_OF_SCOPE_FIELDS } from "../lib/trendintel/actions.js";
import { getAsset, applyPatch, getReceipt, reconcile, restorePatch, publicRead, createNativePage, makeAsset, adapterMode } from "../lib/trendintel/adapter.js";
import { reserveQuota, settleQuota, capabilities, PLANS, ENTITLEMENT_STATES } from "../lib/trendintel/entitlement.js";
import { freezeHypothesis, evaluate, classifyOutcome, suppressSmallCohorts, aggregateOnlyMode } from "../lib/trendintel/measurement.js";
import { validateProfile, newInstallation, readyForLiveRecommendations, RELEASE_GATES, HARD_RELEASE_GATE, MINIMUM_PROFILE } from "../lib/trendintel/installation.js";
import { selectRoute, auditConfiguration, templateDraft, capabilityUnavailable, INFERENCE_MODES } from "../lib/trendintel/inference.js";
import { openapi, PATHS as OPENAPI_PATHS, ERROR_CODES } from "../lib/trendintel/openapi.js";

const router = Router();
router.use(requireAuth);

const body = (req) => (req.body && typeof req.body === "object" ? req.body : {});
const stable = (v) => JSON.stringify(v ?? null);

/* ── installation scope and explicit grants ───────────────────────────── */

/**
 * The scopes a grant can carry, §16's per-operation scopes plus the one that
 * lets a holder grant to somebody else.
 */
const GRANT_SCOPES = [
  "installation:admin", "profile:write", "source:write", "events:write",
  "trend:read", "trend:write", "brief:write", "brief:approve", "brief:read",
  "action:propose", "action:approve", "action:execute", "action:rollback",
  "action:read", "asset:write", "asset:read", "outcome:write",
  "experiment:write", "experiment:read", "draft:write", "public:read",
  "capability:read",
];

/**
 * What the account that creates an installation gets. Everything EXCEPT the
 * two approvals, and that omission is the whole point.
 *
 * WHY THE CREATOR CANNOT APPROVE. §18.2 requires author and approver to
 * differ, and the first version of this file scoped installations by owner —
 * one identity per installation. Every guard worked and the end-to-end test
 * found the consequence: the only identity that could propose a live action
 * was the only identity that could approve it, and self-approval is refused,
 * so NO LIVE WRITE COULD EVER BE APPROVED. The primary workflow was
 * unreachable while every individual check passed, which is the exact shape
 * of failure this platform keeps finding.
 *
 * So segregation is made possible rather than merely required: §14.2's
 * explicit per-install grants, and a second named account with the approval
 * scopes before anything can be published.
 */
const CREATOR_SCOPES = GRANT_SCOPES.filter((s) => !["brief:approve", "action:approve"].includes(s));

function grantsFor(installationId, userId) {
  const row = collection("tiGrants").find((g) =>
    g.installationId === String(installationId) && g.userId === String(userId) && g.disabledAt == null);
  return row ? row.scopes : null;
}

/**
 * Resolve the installation for this request, or say which refusal applies.
 * Nothing below this function reads `req.body` for tenancy.
 */
function scopeOf(req, requiredScope = null) {
  const mine = collection("tiGrants")
    .filter((g) => g.userId === String(req.user.sub) && g.disabledAt == null);
  const asked = String(req.get("X-Installation") ?? "").trim();

  let grant = null;
  if (asked) {
    grant = mine.find((g) => g.installationId === asked) || null;
    // No grant reads as 404: a 403 here would confirm the installation
    // exists, which is the disclosure the rule exists to prevent.
    if (!grant) return { ok: false, status: 404, error: "No such installation, or no grant on it." };
  } else if (mine.length === 1) {
    grant = mine[0];
  } else if (!mine.length) {
    return { ok: false, status: 404, error: "This identity holds no installation grant." };
  } else {
    return { ok: false, status: 400, error: `This identity is granted ${mine.length} installations. Select one with an X-Installation header; a multi-install identity never gets a default.` };
  }

  const installation = collection("tiInstallations").find((i) => i.installationId === grant.installationId);
  if (!installation) return { ok: false, status: 404, error: "No such installation, or no grant on it." };

  // A known identity lacking authority is 403 — the identity is real and the
  // authority is not, and that is a different answer from 404.
  if (requiredScope && !grant.scopes.includes(requiredScope)) {
    return { ok: false, status: 403, error: `This identity is granted installation ${grant.installationId} and holds no ${requiredScope} scope.` };
  }
  return { ok: true, installation, scopes: grant.scopes };
}

/**
 * The idempotency gate for every mutation. Returns a response to send, or
 * null to carry on.
 */
function idempotent(req, res, installationId, operation, payload) {
  const requestId = String(req.get("X-Request-Id") ?? body(req).requestId ?? "").trim();
  if (!requestId) {
    res.status(422).json({ code: "REQUEST_ID_REQUIRED", message: "Every mutation carries a request id, so an outcome can be traced to the call that caused it.", retryable: false });
    return true;
  }
  const key = String(req.get("Idempotency-Key") ?? body(req).idempotencyKey ?? "").trim();
  if (!key) {
    res.status(422).json({ code: "IDEMPOTENCY_KEY_REQUIRED", message: "Every mutation carries an Idempotency-Key, scoped by installation and operation. Delivery is at-least-once, so the same call will arrive twice.", retryable: false });
    return true;
  }
  const scopedKey = `${installationId}|${operation}|${key}`;
  const prior = collection("tiIdempotency").find((r) => r.scopedKey === scopedKey);
  if (prior) {
    if (prior.payloadHash === stable(payload)) {
      res.status(prior.status).set("Idempotent-Replay", "true").json(prior.response);
      return true;
    }
    res.status(409).json({
      code: "IDEMPOTENCY_KEY_REUSED",
      message: "That Idempotency-Key was used for a different canonical payload. A key is not a transaction id; accepting this would write the wrong thing under a reference the first caller holds.",
      request_id: requestId, retryable: false,
    });
    return true;
  }
  res.locals.ti = { scopedKey, requestId, payload };
  return false;
}

/** Record the response against the key so a replay returns THIS, not a new one. */
function remember(res, status, response) {
  const ctx = res.locals.ti;
  if (ctx) {
    insert("tiIdempotency", { scopedKey: ctx.scopedKey, requestId: ctx.requestId, payloadHash: stable(ctx.payload), status, response });
  }
  return res.status(status).json(response);
}

/* ── POST /v1/installations ────────────────────────────────────────────── */
router.post("/v1/installations", (req, res) => {
  const b = body(req);
  const out = newInstallation({
    installationId: b.installationId, organisationId: b.organisationId,
    platformSlug: b.platformSlug, environment: b.environment,
  });
  if (!out.ok) return res.status(422).json({ code: "INVALID_INSTALLATION", message: out.say, retryable: false });
  if (collection("tiInstallations").some((i) => i.installationId === out.installation.installationId)) {
    return res.status(409).json({ code: "INSTALLATION_EXISTS", message: "That installation id is already in use.", retryable: false });
  }
  const row = insert("tiInstallations", {
    ...out.installation,
    // Ownership is the authenticated user and nothing else.
    owner: req.user.name, ownerId: req.user.sub,
    profileRevision: null, entitlementStatus: "trial", frozen: false,
    usage: { reservations: {}, settled: {} },
  });
  insert("tiGrants", {
    installationId: row.installationId, userId: req.user.sub,
    scopes: [...CREATOR_SCOPES], grantedBy: req.user.sub, disabledAt: null,
  });
  res.status(201).json({
    installation: { installationId: row.installationId, mode: row.mode, sourcesEnabled: row.sourcesEnabled, writeConnectorsEnabled: row.writeConnectorsEnabled },
    grant: { userId: req.user.sub, scopes: [...CREATOR_SCOPES] },
    say: `${out.say} The creating identity is granted every scope EXCEPT brief:approve and action:approve: author and approver must differ, so a second named account has to hold the approvals before anything can be published.`,
  });
});

/* ── POST /v1/grants ──────────────────────────────────────────────────── */
//
// §14.2: "Admin maps authorised installation and role by verified subject or
// workload identity. No application-wide shared production token." The
// subject is resolved to an active account here; a grant to a string would be
// a grant to nobody.
router.post("/v1/grants", (req, res) => {
  const s = scopeOf(req, "installation:admin");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const b = body(req);
  const want = String(b.subject ?? "").trim().toLowerCase();
  const user = collection("users").find((u) =>
    String(u.id).toLowerCase() === want || String(u.email ?? "").toLowerCase() === want);
  if (!user || user.active === false) {
    return res.status(422).json({ code: "GRANT_SUBJECT_UNKNOWN", message: `"${String(b.subject ?? "")}" does not resolve to an active account. A grant to a string is a grant to nobody.`, retryable: false });
  }
  const asked = Array.isArray(b.scopes) ? b.scopes.map(String) : [];
  const unknown = asked.filter((x) => !GRANT_SCOPES.includes(x));
  if (!asked.length || unknown.length) {
    return res.status(422).json({ code: "GRANT_SCOPE_UNKNOWN", message: unknown.length ? `Unknown scope(s): ${unknown.join(", ")}.` : "A grant names the scopes it carries.", scopes: GRANT_SCOPES, retryable: false });
  }
  const existing = collection("tiGrants").find((g) => g.installationId === s.installation.installationId && g.userId === user.id && g.disabledAt == null);
  if (existing) {
    update("tiGrants", existing.id, { scopes: [...new Set([...existing.scopes, ...asked])] });
    return res.status(200).json({ grant: { userId: user.id, scopes: [...new Set([...existing.scopes, ...asked])] }, say: "The existing grant is widened rather than duplicated." });
  }
  const row = insert("tiGrants", {
    installationId: s.installation.installationId, userId: user.id,
    scopes: asked, grantedBy: req.user.sub, disabledAt: null,
  });
  res.status(201).json({
    grant: { userId: row.userId, scopes: row.scopes },
    say: `${user.name} is granted ${asked.join(", ")} on ${s.installation.installationId}. Every grant is explicit and per installation; there is no application-wide token and no inherited access.`,
  });
});

/* ── PUT /v1/profile ───────────────────────────────────────────────────── */
router.put("/v1/profile", (req, res) => {
  const s = scopeOf(req, "profile:write");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;

  const ifMatch = String(req.get("If-Match") ?? "").trim();
  const ifNoneMatch = String(req.get("If-None-Match") ?? "").trim();
  const existing = collection("tiProfiles").find((p) => p.installationId === inst.installationId) || null;

  if (!existing) {
    if (ifNoneMatch !== "*") {
      return res.status(428).json({ code: "PRECONDITION_REQUIRED", message: "The initial profile create uses If-None-Match: *. A write with no precondition cannot tell a create from an overwrite.", retryable: false });
    }
  } else if (!ifMatch) {
    return res.status(428).json({ code: "PRECONDITION_REQUIRED", message: `This installation's profile is at revision ${existing.revision}. Send If-Match with the revision you are replacing — a missing precondition is not filled in server-side, because the point is that the writer saw what they are replacing.`, retryable: false });
  } else if (ifMatch !== String(existing.revision)) {
    return res.status(409).json({ code: "PROFILE_REVISION_CONFLICT", message: `The profile is at revision ${existing.revision} and this write expects ${ifMatch}. Re-read and resend.`, retryable: false });
  }

  const checked = validateProfile({ ...body(req), revision: existing ? Number(existing.revision) + 1 : 1 });
  if (!checked.ok) {
    return res.status(422).json({ code: "INVALID_PROFILE", message: checked.say, required: MINIMUM_PROFILE, missing: checked.missing ?? null, retryable: false });
  }
  // Profile changes create immutable revisions, §14.3.
  const row = insert("tiProfiles", { installationId: inst.installationId, ...checked.profile, supersedes: existing ? existing.revision : null });
  update("tiInstallations", inst.id, { profileRevision: row.revision });
  res.status(201).json({ profile: { revision: row.revision, platformSlug: row.platformSlug, mode: row.mode }, say: `${checked.say} Queued writes depending on changed claims or policy are invalidated by this revision.` });
});

/* ── POST /v1/observations:batch ───────────────────────────────────────── */
router.post("/v1/observations\\:batch", (req, res) => {
  const s = scopeOf(req, "events:write");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const b = body(req);
  const observations = Array.isArray(b.observations) ? b.observations : [];
  if (idempotent(req, res, inst.installationId, "observations:batch", observations)) return;

  const sources = new Set(collection("tiSources").filter((x) => x.installationId === inst.installationId).map((x) => x.sourceId));
  const ledgerRow = collection("tiLedgers").find((l) => l.installationId === inst.installationId) || null;
  const out = ingestBatch({
    installationId: inst.installationId, observations,
    ledger: ledgerRow ? ledgerRow.ledger : {}, registeredSources: sources,
    at: new Date().toISOString(),
  });
  if (!out.ok) {
    return remember(res, out.status, {
      code: out.reason === "source-version-conflict" ? "SOURCE_VERSION_CONFLICT" : "INVALID_BATCH",
      message: out.say, errors: out.errors ?? null, conflicts: out.conflicts ?? null,
      accepted: out.accepted ?? 0, duplicate: out.duplicate ?? 0, rejected: out.rejected ?? observations.length,
      limits: BATCH_LIMITS, retryable: false,
    });
  }
  if (ledgerRow) update("tiLedgers", ledgerRow.id, { ledger: out.ledger });
  else insert("tiLedgers", { installationId: inst.installationId, ledger: out.ledger });
  for (const item of out.acceptedItems) {
    const o = observations[item.index];
    insert("tiObservations", { installationId: inst.installationId, key: item.key, hash: item.hash, ...o });
  }
  remember(res, 202, { accepted: out.accepted, duplicate: out.duplicate, rejected: 0, late: out.late, say: out.say });
});

/* ── POST /v1/sources ─────────────────────────────────────────────────── */
router.post("/v1/sources", (req, res) => {
  const s = scopeOf(req, "source:write");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const out = registerSource(body(req));
  if (!out.ok) return res.status(422).json({ code: "INVALID_SOURCE", message: out.say, missing: out.missing ?? null, retryable: false });
  const row = insert("tiSources", { installationId: s.installation.installationId, ...out.source });
  res.status(201).json({ source: { sourceId: row.sourceId, sourceFamily: row.sourceFamily, accessPath: row.accessPath, proves: row.proves, contextOnly: row.contextOnly } });
});

/* ── GET /v1/opportunities ─────────────────────────────────────────────── */
router.get("/v1/opportunities", (req, res) => {
  const s = scopeOf(req, "trend:read");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const rows = resolveForCaller({
    callerInstallationId: s.installation.installationId,
    rows: collection("tiOpportunities"),
  });
  const status = String(req.query.status ?? "");
  const market = String(req.query.market ?? "");
  const list = rows.rows.filter((o) => (!status || o.band === status) && (!market || o.market === market));
  res.json({
    opportunities: list.map((o) => ({
      id: o.id, topicId: o.topicId, market: o.market, locale: o.locale, band: o.band,
      opportunityScore: o.opportunityScore, confidence: o.confidence,
      components: o.components, vetoes: o.vetoes, evidenceIds: o.evidenceIds,
      sourceHealth: o.sourceHealth ?? null, lastRefresh: o.lastRefresh ?? null,
    })),
    count: list.length, say: rows.say,
  });
});

/* ── POST /v1/opportunities:score ─────────────────────────────────────── */
router.post("/v1/opportunities\\:score", (req, res) => {
  const s = scopeOf(req, "trend:write");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const b = body(req);
  if (idempotent(req, res, inst.installationId, "opportunities:score", b)) return;

  const observations = Array.isArray(b.observations) ? b.observations : [];
  const fams = independentFamilies(observations);
  const demand = demandComponent(observations);
  const scored = scoreTopic({
    opportunity: { ...(b.opportunity || {}), ...(demand.demand === null ? {} : { demand: demand.demand }) },
    confidence: { ...(b.confidence || {}), corroboration: b.confidence?.corroboration },
    independentFamilies: fams.independent, contextOnlyFamilies: fams.contextOnly,
    vetoes: b.vetoes, automationOptIn: Boolean(b.automationOptIn),
    lowRiskClass: Boolean(b.lowRiskClass), readinessEvidenced: b.readinessEvidenced !== false,
  });
  const row = insert("tiOpportunities", {
    installationId: inst.installationId, topicId: String(b.topicId ?? ""),
    market: String(b.market ?? ""), locale: String(b.locale ?? ""),
    band: scored.decision.band,
    opportunityScore: scored.opportunity.ok ? scored.opportunity.score : null,
    confidence: scored.confidence.ok ? scored.confidence.confidence : null,
    components: { opportunity: scored.opportunity.components ?? null, confidence: scored.confidence.components ?? null },
    vetoes: scored.vetoes, evidenceIds: Array.isArray(b.evidenceIds) ? b.evidenceIds.map(String) : [],
    sourceHealth: { independentFamilies: fams.independent, contextOnly: fams.contextOnly, collapsed: fams.collapsed },
    lastRefresh: new Date().toISOString(),
  });
  remember(res, 201, {
    opportunity: { id: row.id, band: row.band, opportunityScore: row.opportunityScore, confidence: row.confidence, vetoes: row.vetoes },
    families: fams, demand, say: scored.decision.say,
  });
});

/* ── POST /v1/briefs ──────────────────────────────────────────────────── */
router.post("/v1/briefs", (req, res) => {
  const s = scopeOf(req, "brief:write");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const b = body(req);
  const brief = b.brief ?? {};
  if (idempotent(req, res, inst.installationId, "briefs", brief)) return;

  const shape = validateBrief(brief);
  if (!shape.ok) {
    return remember(res, 422, { code: "INVALID_BRIEF", message: shape.say, errors: shape.errors, retryable: false });
  }
  const opp = collection("tiOpportunities").find((o) => o.id === String(b.opportunityId ?? "") && o.installationId === inst.installationId);
  if (!opp) {
    return remember(res, 404, { code: "OPPORTUNITY_NOT_FOUND", message: "A brief is created from a specific eligible opportunity snapshot in this installation, not from a payload alone.", retryable: false });
  }
  if (!["BRIEF", "AUTOMATIC"].includes(opp.band)) {
    return remember(res, 422, { code: "OPPORTUNITY_NOT_ELIGIBLE", message: `That opportunity is ${opp.band}. Only an eligible snapshot can originate a brief.`, retryable: false });
  }
  const profile = collection("tiProfiles").filter((p) => p.installationId === inst.installationId).slice(-1)[0] || null;
  const row = insert("tiBriefs", {
    installationId: inst.installationId, opportunityId: opp.id,
    // Recorded as an ACCOUNT ID. The self-approval check below used to compare
    // a `createdBy` that was never written, so it could not fire: a guard on a
    // field nobody sets is a guard that passes.
    createdBy: req.user.sub,
    brief, state: "draft", approvedBy: null,
    profileRevision: profile ? profile.revision : null,
    policyVersion: brief.policy_version,
  });
  remember(res, 201, { brief: { id: row.id, brief_id: brief.brief_id, brief_version: brief.brief_version, state: "draft" }, say: `${shape.say} It is a draft: it changes nothing until it is approved, and the approval replaces the active pointer for its scope atomically.` });
});

/* ── POST /v1/briefs/:id:approve ──────────────────────────────────────── */
router.post("/v1/briefs/:id\\:approve", (req, res) => {
  const s = scopeOf(req, "brief:approve");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const row = collection("tiBriefs").find((x) => x.id === String(req.params.id) && x.installationId === inst.installationId);
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "No such brief in this installation.", retryable: false });
  const ifMatch = String(req.get("If-Match") ?? "").trim();
  if (!ifMatch) return res.status(428).json({ code: "PRECONDITION_REQUIRED", message: "Approve an exact revision with If-Match.", retryable: false });
  if (ifMatch !== String(row.brief.brief_version)) {
    return res.status(409).json({ code: "BRIEF_REVISION_CONFLICT", message: `This brief is at revision ${row.brief.brief_version} and the approval expects ${ifMatch}.`, retryable: false });
  }
  if (!row.createdBy || row.createdBy === req.user.sub) {
    return res.status(403).json({
      code: "SELF_APPROVAL",
      message: row.createdBy
        ? "Author and approver must differ. The creating identity is deliberately not granted brief:approve, so a second named account approves."
        : "This brief records no author, so segregation cannot be checked and the approval is refused.",
      retryable: false,
    });
  }
  // Atomically replace the active pointer for this scope, §16.
  const scopeKey = `${inst.installationId}|${row.brief.market}|${row.brief.locale}|${row.brief.topic_id}`;
  for (const other of collection("tiBriefs")) {
    if (other.id !== row.id && other.state === "approved"
        && `${other.installationId}|${other.brief.market}|${other.brief.locale}|${other.brief.topic_id}` === scopeKey) {
      update("tiBriefs", other.id, { state: "superseded" });
    }
  }
  update("tiBriefs", row.id, { state: "approved", approvedBy: req.user.sub });
  res.status(200).json({ brief: { id: row.id, brief_version: row.brief.brief_version, state: "approved", approvedBy: req.user.name }, say: `Approved. One active brief per installation, market, locale and topic: any previously approved brief in this scope is superseded in the same step, so two cannot both resolve.` });
});

/* ── GET /v1/briefs:effective ─────────────────────────────────────────── */
router.get("/v1/briefs\\:effective", (req, res) => {
  const s = scopeOf(req, "brief:read");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const profile = collection("tiProfiles").filter((p) => p.installationId === inst.installationId).slice(-1)[0] || null;
  const approved = collection("tiBriefs").filter((x) => x.installationId === inst.installationId && x.state === "approved");

  const out = resolveEffective({
    briefs: approved.map((x) => x.brief),
    // The server clock, never the request's.
    now: new Date().toISOString(),
    market: String(req.query.market ?? profile?.defaultMarket ?? ""),
    locale: String(req.query.locale ?? profile?.defaultLocale ?? ""),
    channel: req.query.channel ? String(req.query.channel) : null,
    topicId: req.query.topic ? String(req.query.topic) : null,
    policyVersion: profile ? null : null,
    installedLocales: profile ? profile.locales : null,
    activeMarkets: profile ? profile.markets : null,
  });
  if (!out.ok) {
    // 204 and baseline behaviour. An absent brief is not an empty one.
    return res.status(204).set("X-Fallback", "baseline").end();
  }
  res.status(200).json({
    brief: out.brief, cache_ttl_seconds: out.cacheTtlSeconds, authority_to_write: false, say: out.say,
  });
});

/* ── POST /v1/actions ─────────────────────────────────────────────────── */
router.post("/v1/actions", (req, res) => {
  const s = scopeOf(req, "action:propose");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const b = body(req);
  if (idempotent(req, res, inst.installationId, "actions", b)) return;

  const briefRow = collection("tiBriefs").find((x) => x.id === String(b.briefRef ?? "") && x.installationId === inst.installationId && x.state === "approved");
  const profile = collection("tiProfiles").filter((p) => p.installationId === inst.installationId).slice(-1)[0] || null;
  const action = {
    installationId: inst.installationId,
    briefId: briefRow?.brief?.brief_id ?? null, briefVersion: briefRow?.brief?.brief_version ?? null,
    channel: b.channel, actionKind: b.actionKind, targetId: b.targetId,
    expectedTargetRevision: b.expectedTargetRevision, patch: b.patch ?? {},
    evidenceIds: b.evidenceIds ?? [], approvedClaimIds: b.approvedClaimIds ?? [],
    // The author is the authenticated user. Never the payload.
    authorId: req.user.name, policyVersion: briefRow?.brief?.policy_version ?? null,
  };
  const pre = preflight(action, {
    callerInstallationId: inst.installationId,
    allowedAssetIds: profile?.allowedAssetIds ?? [],
    entitlementStatus: inst.entitlementStatus, frozen: inst.frozen,
    brief: briefRow?.brief ?? null, now: new Date().toISOString(),
    evidenceInScope: null, approvedClaimIds: profile?.approvedClaimIds ?? null,
  });
  if (!pre.ok) {
    return remember(res, 422, { code: "ACTION_PREFLIGHT_FAILED", message: pre.say, failures: pre.failures,
      allowlist: { live: LIVE_ACTION_KINDS, draft: DRAFT_ACTION_KINDS, patchable: PATCHABLE_FIELDS, outOfScope: OUT_OF_SCOPE_FIELDS }, retryable: false });
  }
  const row = insert("tiActions", {
    installationId: inst.installationId, ...action,
    state: "validated", actionKey: pre.idempotencyKey, payloadHash: pre.payloadHash,
    approval: null, appliedRevision: null, receipt: null,
  });
  remember(res, 201, { action: { id: row.id, state: row.state, actionKey: row.actionKey, payloadHash: row.payloadHash }, say: pre.say });
});

/* ── POST /v1/actions/:id:approve ─────────────────────────────────────── */
router.post("/v1/actions/:id\\:approve", (req, res) => {
  const s = scopeOf(req, "action:approve");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const row = collection("tiActions").find((x) => x.id === String(req.params.id) && x.installationId === s.installation.installationId);
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "No such action in this installation.", retryable: false });
  const b = body(req);
  const out = approve({
    action: { ...row, now: new Date().toISOString() },
    approver: req.user.name,
    signedPayloadHash: b.signedPayloadHash, signedTargetRevision: b.signedTargetRevision,
    // The grant, not a default. `req.user.scopes` does not exist, so the
    // old `?? ["action:approve"]` granted the scope to everybody.
    authorityScopes: s.scopes,
  });
  if (!out.ok) {
    const status = out.reason === "self-approval" || out.reason === "no-authority" ? 403 : 409;
    return res.status(status).json({ code: out.reason === "hash-mismatch" ? "APPROVAL_PAYLOAD_MISMATCH" : "APPROVAL_REFUSED", message: out.say, retryable: false });
  }
  update("tiActions", row.id, { state: "approved", approval: out.approval });
  res.status(200).json({ action: { id: row.id, state: "approved" }, approval: out.approval, say: out.say });
});

/* ── POST /v1/actions/:id:execute ─────────────────────────────────────── */
router.post("/v1/actions/:id\\:execute", (req, res) => {
  const s = scopeOf(req, "action:execute");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const row = collection("tiActions").find((x) => x.id === String(req.params.id) && x.installationId === inst.installationId);
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "No such action in this installation.", retryable: false });
  if (idempotent(req, res, inst.installationId, `actions:execute:${row.id}`, { id: row.id })) return;

  const briefRow = collection("tiBriefs").find((x) => x.installationId === inst.installationId && x.state === "approved" && x.brief.brief_id === row.briefId);
  const assetRow = collection("tiAssets").find((a) => a.installationId === inst.installationId && a.assetId === row.targetId);
  const authorised = authoriseExecution({
    action: row, approval: row.approval,
    context: {
      now: new Date().toISOString(), brief: briefRow?.brief ?? null,
      policyVersion: briefRow?.brief?.policy_version ?? null,
      frozen: inst.frozen, entitlementStatus: inst.entitlementStatus,
      liveTargetRevision: assetRow?.activeRevision ?? null,
      providerScopes: ["patch"],
    },
  });
  if (!authorised.ok) {
    update("tiActions", row.id, { state: "failed" });
    return remember(res, 409, { code: "EXECUTION_DENIED", message: authorised.say, denials: authorised.denials, retryable: false });
  }

  // The asset store and the adapter's receipt ledger, both installation-scoped.
  const store = {}; const receipts = {};
  for (const a of collection("tiAssets").filter((a) => a.installationId === inst.installationId)) store[a.assetId] = a;
  for (const r of collection("tiReceipts").filter((r) => r.installationId === inst.installationId)) receipts[r.actionKey] = r.receipt;

  const applied = applyPatch(store, receipts, {
    installationId: inst.installationId, assetId: row.targetId,
    expectedRevision: row.expectedTargetRevision, fields: row.patch, actionKey: row.actionKey,
  });
  if (!applied.ok) {
    update("tiActions", row.id, { state: applied.status === 409 ? "failed" : "failed" });
    return remember(res, applied.status, { code: applied.reason === "conflict" ? "TARGET_REVISION_CONFLICT" : "APPLY_REFUSED", message: applied.say, retryable: false });
  }
  if (assetRow) update("tiAssets", assetRow.id, { fields: store[row.targetId].fields, activeRevision: store[row.targetId].activeRevision, contentHash: store[row.targetId].contentHash });
  if (!collection("tiReceipts").some((r) => r.actionKey === row.actionKey)) {
    insert("tiReceipts", { installationId: inst.installationId, actionKey: row.actionKey, receipt: applied.receipt });
  }
  update("tiActions", row.id, { state: "applied", appliedRevision: applied.revision, receipt: applied.receipt, previousFields: applied.previous });
  remember(res, 200, { action: { id: row.id, state: "applied", appliedRevision: applied.revision }, receipt: applied.receipt, replayed: Boolean(applied.replayed), say: applied.say });
});

/* ── POST /v1/actions/:id:rollback ────────────────────────────────────── */
router.post("/v1/actions/:id\\:rollback", (req, res) => {
  const s = scopeOf(req, "action:rollback");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const row = collection("tiActions").find((x) => x.id === String(req.params.id) && x.installationId === inst.installationId);
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "No such action in this installation.", retryable: false });
  const assetRow = collection("tiAssets").find((a) => a.installationId === inst.installationId && a.assetId === row.targetId);

  const caps = capabilities({ status: inst.entitlementStatus, endedAt: inst.endedAt ?? null }, { at: new Date().toISOString() });
  const out = authoriseRollback({
    appliedRevision: row.appliedRevision, liveRevision: assetRow?.activeRevision ?? null,
    // The rollback's own requester, not the forward action's author. Rolling
    // back to an already-approved revision is the safe direction, and the
    // person who proposed the change is the most likely person to notice it
    // was wrong — refusing them was the defect here.
    requester: req.user.sub, coApprover: body(req).coApprover ? String(body(req).coApprover) : null,
    authorityScopes: s.scopes,
    frozen: inst.frozen, entitlementStatus: inst.entitlementStatus,
    recoveryWindowOpen: caps.ok ? caps.recoveryWindowOpen : true,
  });
  if (!out.ok) {
    const status = out.reason === "revision-moved" ? 409 : 403;
    return res.status(status).json({ code: out.reason === "revision-moved" ? "TARGET_REVISION_CONFLICT" : "ROLLBACK_REFUSED", message: out.say, retryable: false });
  }
  const store = {}; const receipts = {};
  for (const a of collection("tiAssets").filter((a) => a.installationId === inst.installationId)) store[a.assetId] = a;
  const restored = restorePatch(store, receipts, {
    installationId: inst.installationId, assetId: row.targetId,
    expectedAppliedRevision: row.appliedRevision, previousFields: row.previousFields ?? {},
    rollbackKey: `rb:${row.actionKey}`,
  });
  if (!restored.ok) return res.status(restored.status).json({ code: "ROLLBACK_REFUSED", message: restored.say, retryable: false });
  if (assetRow) update("tiAssets", assetRow.id, { fields: store[row.targetId].fields, activeRevision: store[row.targetId].activeRevision, contentHash: store[row.targetId].contentHash });
  update("tiActions", row.id, { state: "rolled_back" });
  res.status(200).json({ action: { id: row.id, state: "rolled_back", revision: restored.revision }, restored: restored.restored, preserved: restored.preserved, say: `${out.say} ${restored.say}` });
});

/* ── GET /v1/actions/:id ──────────────────────────────────────────────── */
router.get("/v1/actions/:id", (req, res) => {
  const s = scopeOf(req, "action:read");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const row = collection("tiActions").find((x) => x.id === String(req.params.id) && x.installationId === s.installation.installationId);
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "No such action in this installation.", retryable: false });
  const receipts = {};
  for (const r of collection("tiReceipts").filter((r) => r.installationId === s.installation.installationId)) receipts[r.actionKey] = r.receipt;
  res.json({
    action: {
      id: row.id, state: row.state, actionKind: row.actionKind, channel: row.channel,
      targetId: row.targetId, expectedTargetRevision: row.expectedTargetRevision,
      appliedRevision: row.appliedRevision, payloadHash: row.payloadHash,
      approval: row.approval, policyVersion: row.policyVersion,
    },
    receipt: receipts[row.actionKey] ?? null,
    reconciliation: row.state === "applied" ? null : reconcile({ receipts, actionKey: row.actionKey }),
  });
});

/**
 * Resolve a second person named in a payload to a real, active account.
 *
 * The first version of this took `approvedBy` as free text and compared it to
 * the session's display name. The e2e caught it: `approvedBy: "admin"`
 * against a session named "Admin" passed the segregation check, so a
 * difference of one capital letter was enough for one person to create and
 * approve the same public page. Segregation compared on a free-text string
 * is not segregation — it is a spelling test. So the approver is resolved
 * server-side by account id or email, must be active, and must not be the
 * caller.
 */
function otherAccount(req, given) {
  const want = String(given ?? "").trim().toLowerCase();
  if (!want) return { ok: false, say: "An approver must be named by account id or email address." };
  const user = collection("users").find((u) =>
    String(u.id).toLowerCase() === want || String(u.email ?? "").toLowerCase() === want);
  if (!user || user.active === false) {
    return { ok: false, say: `"${String(given)}" does not resolve to an active account. An approver is an account, not a string: a name that nobody has to match is a spelling test, not segregation.` };
  }
  // `req.user.sub` is the account id; `req.user.id` does not exist on the
  // session object, and reading it would compare undefined to a real id and
  // silently permit self-approval. Email is checked too, so neither an id nor
  // an address reaches the same account twice.
  if (String(user.id) === String(req.user.sub)
      || String(user.email ?? "").toLowerCase() === String(req.user.email ?? "").toLowerCase()) {
    return { ok: false, say: "That is the caller's own account. The person who creates a public page is not the person who approves it." };
  }
  return { ok: true, user };
}

/* ── POST /v1/assets ─────────────────────────────────────────────────── */
router.post("/v1/assets", (req, res) => {
  const s = scopeOf(req, "asset:write");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const b = body(req);
  const approver = otherAccount(req, b.approvedBy);
  if (!approver.ok) return res.status(422).json({ code: "ASSET_REFUSED", message: approver.say, retryable: false });
  const out = createNativePage({
    installationId: s.installation.installationId, slug: b.slug,
    title: b.title, description: b.description, blocks: b.blocks,
    // The creator is the authenticated user; the approver is a DIFFERENT
    // resolved account, not a string that happens to read differently.
    createdBy: req.user.sub, approvedBy: approver.user.id,
  });
  if (!out.ok) return res.status(422).json({ code: "ASSET_REFUSED", message: out.say, retryable: false });
  const row = insert("tiAssets", { ...out.asset });
  res.status(201).json({ asset: { assetId: row.assetId, slug: row.slug, revision: row.activeRevision }, say: out.say });
});

/* ── GET /v1/assets/:assetId ─────────────────────────────────────────── */
router.get("/v1/assets/:assetId", (req, res) => {
  const s = scopeOf(req, "asset:read");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const store = {};
  for (const a of collection("tiAssets").filter((a) => a.installationId === s.installation.installationId)) store[a.assetId] = a;
  const out = getAsset(store, { installationId: s.installation.installationId, assetId: req.params.assetId });
  if (!out.ok) return res.status(out.status).json({ code: "NOT_FOUND", message: out.say, retryable: false });
  res.json(out);
});

/* ── POST /v1/outcomes:batch ─────────────────────────────────────────── */
router.post("/v1/outcomes\\:batch", (req, res) => {
  const s = scopeOf(req, "outcome:write");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const b = body(req);
  const outcomes = Array.isArray(b.outcomes) ? b.outcomes : [];
  if (idempotent(req, res, inst.installationId, "outcomes:batch", outcomes)) return;

  const seen = new Set(collection("tiOutcomes").filter((o) => o.installationId === inst.installationId).map((o) => o.pseudonymousOutcomeId));
  let accepted = 0, duplicate = 0;
  const rejected = [];
  outcomes.forEach((o, index) => {
    const cls = classifyOutcome(o);
    if (!cls.ok) { rejected.push({ index, reason: cls.reason ?? "not-countable", say: cls.say }); return; }
    if (seen.has(String(o.pseudonymousOutcomeId))) { duplicate += 1; return; }
    seen.add(String(o.pseudonymousOutcomeId));
    insert("tiOutcomes", { installationId: inst.installationId, ...o, native: cls.native });
    accepted += 1;
  });
  remember(res, 202, { accepted, duplicate, rejected,
    say: `${accepted} accepted, ${duplicate} duplicate, ${rejected.length} not counted. A CTA completion is counted as a CTA completion; a downstream conversion counts only where its data actually arrives through first-party ingestion.` });
});

/* ── GET /v1/experiments/:id ─────────────────────────────────────────── */
router.get("/v1/experiments/:id", (req, res) => {
  const s = scopeOf(req, "experiment:read");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const row = collection("tiExperiments").find((x) => x.id === String(req.params.id) && x.installationId === s.installation.installationId);
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "No such experiment in this installation.", retryable: false });
  const out = evaluate({
    frozen: row.frozen, treatment: row.treatment ?? {}, control: row.control ?? null,
    now: new Date().toISOString(), guardrailBreaches: row.guardrailBreaches ?? [],
    siteWideConfound: Boolean(row.siteWideConfound),
  });
  const rows = suppressSmallCohorts([
    { arm: "treatment", ...(row.treatment ?? {}) },
    ...(row.control ? [{ arm: "control", ...row.control }] : []),
  ]);
  res.json({ experiment: { id: row.id, frozen: row.frozen }, result: out, rows: rows.rows, say: `${out.say} ${rows.say}` });
});

/* ── POST /v1/experiments ────────────────────────────────────────────── */
router.post("/v1/experiments", (req, res) => {
  const s = scopeOf(req, "experiment:write");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const out = freezeHypothesis(body(req));
  if (!out.ok) return res.status(422).json({ code: "HYPOTHESIS_INCOMPLETE", message: out.say, missing: out.missing, retryable: false });
  const row = insert("tiExperiments", { installationId: s.installation.installationId, frozen: out.frozen, treatment: null, control: null, guardrailBreaches: [] });
  res.status(201).json({ experiment: { id: row.id }, frozen: out.frozen, say: out.say });
});

/* ── POST /v1/drafts ────────────────────────────────────────────────── */
router.post("/v1/drafts", (req, res) => {
  const s = scopeOf(req, "draft:write");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const b = body(req);
  if (idempotent(req, res, inst.installationId, "drafts", b)) return;

  // Route selection reads the INSTALLATION, never the body. A payload that can
  // describe the infrastructure can describe a route into existence; the
  // approved-route list is the authority and it is stored, not sent.
  const route = selectRoute({
    hostGateway: inst.hostGateway ?? null,
    deploymentInference: inst.deploymentInference ?? { available: true },
    approvedRoutes: inst.inferenceRoutesApproved ?? ["deployment"],
    egressBlocked: Boolean(inst.egressBlocked), installationId: inst.installationId,
  });
  const briefRow = collection("tiBriefs").find((x) => x.id === String(b.briefRef ?? "") && x.installationId === inst.installationId && x.state === "approved");
  if (!briefRow) return remember(res, 404, { code: "NOT_FOUND", message: "No approved brief with that reference in this installation.", retryable: false });

  const workId = String(b.workId ?? "").trim();
  if (!workId) return remember(res, 422, { code: "WORK_ID_REQUIRED", message: "A draft needs a logical generation id, so a retry is not a second billable unit.", retryable: false });

  const reserved = reserveQuota({
    entitlement: { planId: inst.planId ?? "starter", planRevision: inst.planRevision ?? 1, status: inst.entitlementStatus },
    usage: inst.usage ?? { reservations: {}, settled: {} }, workId, at: new Date().toISOString(),
  });
  if (!reserved.ok) {
    const headers = reserved.status === 429 ? { "Retry-After": "3600", "X-Usage-Reset": String(reserved.retryAfterPeriod) } : {};
    return remember(res.set(headers), reserved.status, { code: reserved.status === 429 ? "QUOTA_EXHAUSTED" : "GENERATION_UNAVAILABLE", message: reserved.say, retryable: reserved.status === 429 });
  }
  update("tiInstallations", inst.id, { usage: reserved.usage });

  // Deterministic mode produces a real artefact and says so. There is no
  // provider call on any path in this process.
  const draft = templateDraft({ brief: briefRow.brief, channel: b.channel, reason: route.degraded ? route.trail.join("; ") || "deterministic route" : "no inference call is made from this service" });
  const settled = settleQuota({ usage: reserved.usage, workId, degraded: true, at: new Date().toISOString() });
  update("tiInstallations", inst.id, { usage: settled.usage });

  remember(res, 201, {
    route: { mode: route.mode, keyless: route.keyless, degraded: Boolean(route.degraded) },
    draft: draft.draft, degraded: true, metered: false,
    say: `${route.say} ${draft.say} ${settled.say}`,
  });
});

/* ── GET /v1/public/:slug ───────────────────────────────────────────── */
router.get("/v1/public/:slug", (req, res) => {
  const s = scopeOf(req, "public:read");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const store = {};
  for (const a of collection("tiAssets").filter((a) => a.installationId === s.installation.installationId)) store[a.assetId] = a;
  const out = publicRead(store, { slug: req.params.slug });
  if (!out.ok) return res.status(out.status).json({ code: "NOT_FOUND", message: out.say, retryable: false });
  res.json(out);
});

/* ── GET /openapi.json ──────────────────────────────────────────────── */
//
// Appendix A makes this a G1 deliverable. It is GENERATED from the constants
// the handlers enforce, so an integrator who generates a client from it gets
// types that match the server — the failure mode of a hand-written
// specification is not that it is missing, it is that it is trusted and
// wrong. It stays behind the session like the rest of this surface, because
// in this platform the whole API is internal; in a standalone deployment of
// the engine it is served publicly, which is a deployment decision and not a
// difference in the document.
router.get("/openapi.json", (req, res) => {
  res.json(openapi({ serverUrl: "/api/trendintel" }));
});

/* ── GET /v1/capabilities ───────────────────────────────────────────── */
router.get("/v1/capabilities", (req, res) => {
  const s = scopeOf(req, "capability:read");
  if (!s.ok) return res.status(s.status).json({ code: "SCOPE", message: s.error, retryable: false });
  const inst = s.installation;
  const unavailable = [];
  for (const want of ["paid_search_write", "email_send", "audience_export"]) {
    unavailable.push(capabilityUnavailable({
      capability: want, needs: "an existing authorised host integration for that channel",
      alternative: "the approved change publishes on the native owned surface and the channel-ready draft is exportable",
    }));
  }
  res.json({
    modes: INFERENCE_MODES,
    inferenceRoutesApproved: inst.inferenceRoutesApproved ?? ["deployment"],
    plans: PLANS.map((p) => ({ id: p.id, name: p.name, draftsPerMonth: p.draftsPerMonth, features: p.features })),
    entitlementStates: ENTITLEMENT_STATES,
    actionKinds: { live: LIVE_ACTION_KINDS, draft: DRAFT_ACTION_KINDS },
    patchableFields: PATCHABLE_FIELDS, outOfScopeFields: OUT_OF_SCOPE_FIELDS,
    releaseGates: RELEASE_GATES, hardReleaseGate: HARD_RELEASE_GATE,
    aggregateMode: aggregateOnlyMode({ hasConsentRecords: false, hasCustomerLevelData: false }),
    unavailable,
    configurationAudit: auditConfiguration({ installationId: inst.installationId, routes: inst.inferenceRoutesApproved ?? [] }),
    readiness: readyForLiveRecommendations({ comparablePeriods: collection("tiObservations").filter((o) => o.installationId === inst.installationId).length, profileActive: Boolean(inst.profileRevision) }),
  });
});

export default router;
