/**
 * The Growth Brief, and why it is a CLOSED object.
 *
 * The brief is the only thing that changes what an existing SEO or marketing
 * agent does at run time (§1). Everything downstream — a draft, a patch, an
 * approval, a receipt — is bound to a brief id AND a brief version, so the
 * brief is the single place where a mistake becomes every agent's mistake.
 *
 * `additionalProperties: false` is therefore load-bearing, not tidiness
 * (Appendix A). An unknown field in a brief is one of three things: a newer
 * schema this build does not understand, a caller sending instructions the
 * contract does not define, or injected text that has travelled further than
 * it should have. All three must stop here, and a tolerant reader cannot tell
 * them apart.
 *
 * SCHEMA VALIDITY IS NOT ELIGIBILITY. Appendix A says so plainly: "a
 * schema-valid object can still fail these checks." There are two gates in
 * this file and they are separate functions on purpose.
 *
 *   validateBrief()  · shape. The 22 required fields, the patterns, the
 *                      bounds, the closed object.
 *   briefIsEffective() · authority at a point in time. valid_from < now <
 *                      expires_at, the channel actually has an adapter, the
 *                      policy revision matches, the market is in the profile.
 *
 * AND A CACHE IS NEVER AUTHORITY TO WRITE (§14.5). The SDK may hold a brief
 * for up to sixty seconds and never beyond its expiry, which is what TI-05
 * tests: a brief that expires while cached must leave the SDK falling back to
 * baseline AND the executor refusing the action that was already queued. Two
 * refusals, because either one alone still publishes.
 */

/** The 22 required fields, in Appendix A's order. */
export const BRIEF_REQUIRED = Object.freeze([
  "schema_version", "brief_id", "brief_version", "tenant_id", "platform_id",
  "market", "locale", "topic_id", "opportunity_score", "confidence",
  "valid_from", "expires_at", "evidence_ids", "audience", "intent",
  "approved_claim_ids", "cta_id", "allowed_channels", "prohibited_claims",
  "objective", "experiment_id", "policy_version",
]);

/**
 * The channel enum, Appendix A. Six values, of which v1 has adapters for two.
 *
 * "The broader channel enum reserves stable routing values for future
 * adapters and makes no feature available on its own." So the enum is the
 * schema's business and ROUTES_AVAILABLE is policy's, and they are different
 * lists deliberately — a brief naming `paid` is valid and unroutable.
 */
export const BRIEF_CHANNELS = Object.freeze([
  "seo", "organic_social", "sales_enablement", "owned_placement", "lifecycle", "paid",
]);

/** The two draft routes v1 actually ships, §18 and Appendix A. */
export const ROUTES_AVAILABLE = Object.freeze(["seo", "organic_social"]);

/** §16: ZZ is explicitly global and never matches a country-targeted lookup. */
export const GLOBAL_MARKET = "ZZ";

/** §14.5: the SDK may cache within this ceiling and never beyond expiry. */
export const CACHE_CEILING_SECONDS = 60;

/** §17: default brief lifetimes. */
export const BRIEF_EXPIRY_HOURS = Object.freeze({ persistent: 168, breaking: 24 });

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const MARKET_RE = /^[A-Z]{2}$/;
const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const isId = (v) => typeof v === "string" && ID_RE.test(v);
const isScore = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
const isUtc = (v) => typeof v === "string" && UTC_RE.test(v);
const isShort = (v) => typeof v === "string" && v.length >= 1 && v.length <= 500;
const isInt = (v, min) => typeof v === "number" && Number.isInteger(v) && v >= min;

function idList(v, { minItems = 0, maxItems = 64 } = {}) {
  if (!Array.isArray(v)) return "must be an array";
  if (v.length < minItems) return `needs at least ${minItems} item(s)`;
  if (v.length > maxItems) return `has more than ${maxItems} items`;
  if (new Set(v).size !== v.length) return "has duplicate items";
  const bad = v.find((x) => !isId(x));
  if (bad !== undefined) return `contains "${String(bad).slice(0, 40)}", which is not a valid id`;
  return null;
}

/**
 * Shape. Returns every problem rather than the first, because a producer
 * fixing one field at a time against a one-error validator is the slowest
 * integration there is.
 */
export function validateBrief(brief) {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    return { ok: false, errors: [{ field: "(root)", problem: "the brief must be an object" }],
             say: "Not a brief." };
  }
  const errors = [];
  const bad = (field, problem) => errors.push({ field, problem });

  for (const f of BRIEF_REQUIRED) if (!(f in brief)) bad(f, "is required");

  const extra = Object.keys(brief).filter((k) => !BRIEF_REQUIRED.includes(k));
  if (extra.length) {
    bad("(root)", `carries field(s) the contract does not define: ${extra.join(", ")}. The brief is a closed object — an unknown field is a newer schema, a caller sending instructions the contract does not define, or injected text, and a tolerant reader cannot tell them apart`);
  }

  if ("schema_version" in brief && brief.schema_version !== 1) bad("schema_version", "must be exactly 1; a different version needs a different reader");
  if ("brief_id" in brief && !isId(brief.brief_id)) bad("brief_id", "is not a valid id");
  if ("brief_version" in brief && !isInt(brief.brief_version, 1)) bad("brief_version", "must be an integer of at least 1");
  if ("tenant_id" in brief && !isId(brief.tenant_id)) bad("tenant_id", "is not a valid id");
  if ("platform_id" in brief && !isId(brief.platform_id)) bad("platform_id", "is not a valid id");
  if ("market" in brief && !MARKET_RE.test(String(brief.market))) bad("market", "must be an ISO alpha-2 code in capitals, or ZZ for an explicitly global brief");
  if ("locale" in brief && !(typeof brief.locale === "string" && brief.locale.length >= 2 && brief.locale.length <= 35)) bad("locale", "must be a string of 2 to 35 characters");
  if ("topic_id" in brief && !isId(brief.topic_id)) bad("topic_id", "is not a valid id");
  if ("opportunity_score" in brief && !isScore(brief.opportunity_score)) bad("opportunity_score", "must be a number from 0 to 100");
  if ("confidence" in brief && !isScore(brief.confidence)) bad("confidence", "must be a number from 0 to 100");
  if ("valid_from" in brief && !isUtc(brief.valid_from)) bad("valid_from", "must be an RFC 3339 timestamp ending in Z");
  if ("expires_at" in brief && !isUtc(brief.expires_at)) bad("expires_at", "must be an RFC 3339 timestamp ending in Z");
  if ("cta_id" in brief && !isId(brief.cta_id)) bad("cta_id", "is not a valid id");
  if ("experiment_id" in brief && !isId(brief.experiment_id)) bad("experiment_id", "is not a valid id");
  if ("policy_version" in brief && !isInt(brief.policy_version, 1)) bad("policy_version", "must be an integer of at least 1");
  if ("audience" in brief && !isShort(brief.audience)) bad("audience", "must be 1 to 500 characters");
  if ("intent" in brief && !isShort(brief.intent)) bad("intent", "must be 1 to 500 characters");
  if ("objective" in brief && !isShort(brief.objective)) bad("objective", "must be 1 to 500 characters");

  if ("evidence_ids" in brief) {
    const p = idList(brief.evidence_ids, { minItems: 1 });
    if (p) bad("evidence_ids", `${p}. A brief with no evidence is an opinion`);
  }
  if ("approved_claim_ids" in brief) {
    const p = idList(brief.approved_claim_ids);
    if (p) bad("approved_claim_ids", p);
  }
  if ("allowed_channels" in brief) {
    const v = brief.allowed_channels;
    if (!Array.isArray(v) || v.length < 1 || v.length > 6) bad("allowed_channels", "must be an array of 1 to 6 channels");
    else if (new Set(v).size !== v.length) bad("allowed_channels", "has duplicate channels");
    else {
      const unknown = v.filter((c) => !BRIEF_CHANNELS.includes(c));
      if (unknown.length) bad("allowed_channels", `names channel(s) outside the enum: ${unknown.join(", ")}. The enum is ${BRIEF_CHANNELS.join(", ")}`);
    }
  }
  if ("prohibited_claims" in brief) {
    const v = brief.prohibited_claims;
    if (!Array.isArray(v) || v.length > 32) bad("prohibited_claims", "must be an array of at most 32 items");
    else if (new Set(v).size !== v.length) bad("prohibited_claims", "has duplicate items");
    else if (v.some((x) => !isShort(x))) bad("prohibited_claims", "each item must be 1 to 500 characters");
  }

  if (errors.length) {
    return { ok: false, errors,
             say: `The brief is not schema-valid: ${errors.length} problem(s). ${errors.slice(0, 3).map((e) => `${e.field} ${e.problem}`).join("; ")}${errors.length > 3 ? "; …" : ""}` };
  }
  return { ok: true, errors: [], say: `Schema-valid Growth Brief v1: ${brief.brief_id} revision ${brief.brief_version}. Schema validity is not eligibility — the runtime rules are checked separately.` };
}

/**
 * Authority at a point in time. Appendix A's "runtime rules beyond JSON
 * Schema", plus §14 and §16 on routing and profile.
 *
 * `now` is supplied rather than read from the clock so a conformance test can
 * stand at a moment and so an executor and an SDK can be asked about the
 * SAME moment. A function that reads the clock itself cannot be asked that.
 */
export function briefIsEffective(brief, {
  now, channel = null, installedLocales = null, activeMarkets = null,
  policyVersion = null, profileRevision = null, briefProfileRevision = null,
  evidenceInScope = null, claimsInScope = null, routesAvailable = ROUTES_AVAILABLE,
  countryTargetedLookup = true,
} = {}) {
  const shape = validateBrief(brief);
  if (!shape.ok) return { ok: false, status: 422, reason: "schema", errors: shape.errors, say: shape.say };

  const t = Date.parse(String(now));
  if (!Number.isFinite(t)) {
    return { ok: false, status: 503, reason: "no-clock",
             say: "Effectiveness is a question about a moment and no moment was supplied. Nothing is treated as effective by default." };
  }
  const from = Date.parse(brief.valid_from);
  const until = Date.parse(brief.expires_at);

  if (!(from < until)) {
    return { ok: false, status: 422, reason: "window-inverted",
             say: `valid_from ${brief.valid_from} is not before expires_at ${brief.expires_at}. A brief that never opens is a configuration error, not a quiet no-op.` };
  }
  if (t < from) {
    return { ok: false, status: 204, reason: "not-yet-valid",
             say: `This brief opens at ${brief.valid_from}. Until then the agent uses its baseline instructions; a future brief is not a current one.` };
  }
  if (t >= until) {
    return { ok: false, status: 204, reason: "expired", expiredAt: brief.expires_at,
             say: `This brief expired at ${brief.expires_at}. The SDK falls back to baseline and any action already queued against it is denied at execution: either refusal alone still publishes.` };
  }

  if (channel !== null) {
    if (!brief.allowed_channels.includes(String(channel))) {
      return { ok: false, status: 204, reason: "channel-not-allowed", channel: String(channel),
               say: `This brief allows ${brief.allowed_channels.join(", ")} and the request is for ${String(channel)}. Channel membership is checked, not inferred.` };
    }
    if (!routesAvailable.includes(String(channel))) {
      return { ok: false, status: 204, reason: "route-unavailable", channel: String(channel),
               say: `${String(channel)} is a reserved routing value with no adapter and no policy enabling it in this release. The enum makes no feature available on its own.` };
    }
  }

  if (Array.isArray(installedLocales) && !installedLocales.map(String).includes(String(brief.locale))) {
    return { ok: false, status: 422, reason: "locale-not-installed",
             say: `Locale ${brief.locale} is not in this installation's locale set (${installedLocales.join(", ")}). Clustering is validated per language; an uninstalled locale has not been.` };
  }
  if (Array.isArray(activeMarkets)) {
    const markets = activeMarkets.map(String);
    if (!markets.includes(String(brief.market))) {
      return { ok: false, status: 422, reason: "market-not-active",
               say: `Market ${brief.market} is not in the active profile (${markets.join(", ")}).` };
    }
  }
  if (countryTargetedLookup && String(brief.market) === GLOBAL_MARKET) {
    return { ok: false, status: 204, reason: "global-brief-on-country-lookup",
             say: `${GLOBAL_MARKET} is reserved for explicitly global, non-country-targeted briefs and never matches a country-targeted lookup by default.` };
  }

  if (policyVersion !== null && Number(policyVersion) !== Number(brief.policy_version)) {
    return { ok: false, status: 409, reason: "policy-mismatch",
             say: `The brief was built against policy revision ${brief.policy_version} and the installation is at ${policyVersion}. A policy change invalidates what depended on it rather than being applied retrospectively.` };
  }
  if (profileRevision !== null && briefProfileRevision !== null && Number(profileRevision) !== Number(briefProfileRevision)) {
    return { ok: false, status: 409, reason: "profile-mismatch",
             say: `The profile is at revision ${profileRevision} and this brief was bound to ${briefProfileRevision}. A profile change invalidates queued work that depended on changed claims or policy.` };
  }

  if (evidenceInScope) {
    const held = new Set([...evidenceInScope].map(String));
    const foreign = brief.evidence_ids.filter((e) => !held.has(String(e)));
    if (foreign.length) {
      return { ok: false, status: 404, reason: "evidence-out-of-scope", evidence: foreign,
               say: `Evidence ${foreign.join(", ")} does not resolve inside this installation. Ids resolve server-side and a cross-installation id is a 404, not a 403.` };
    }
  }
  if (claimsInScope) {
    const held = new Set([...claimsInScope].map(String));
    const foreign = brief.approved_claim_ids.filter((c) => !held.has(String(c)));
    if (foreign.length) {
      return { ok: false, status: 404, reason: "claim-out-of-scope", claims: foreign,
               say: `Claim(s) ${foreign.join(", ")} are not approved in this installation. Every factual marketing claim maps to an approved claim or a verified fact, or it is not made.` };
    }
  }

  return {
    ok: true, status: 200,
    expiresInSeconds: Math.floor((until - t) / 1000),
    say: `Effective: ${brief.brief_id} revision ${brief.brief_version} for ${brief.market}/${brief.locale}${channel ? ` on ${channel}` : ""}, expiring in ${Math.floor((until - t) / 1000)}s.`,
  };
}

/**
 * How long an SDK may hold this brief, §14.5.
 *
 * The ceiling and the expiry, whichever is sooner, and never a negative. A
 * cache that outlives its brief is the mechanism by which a revoked brief
 * still drives a draft.
 */
export function cacheTtlSeconds(brief, { now, ceiling = CACHE_CEILING_SECONDS } = {}) {
  const t = Date.parse(String(now));
  const until = Date.parse(String(brief?.expires_at));
  if (!Number.isFinite(t) || !Number.isFinite(until)) return 0;
  return Math.max(0, Math.min(ceiling, Math.floor((until - t) / 1000)));
}

/**
 * What the SDK does when no brief resolves, §14.5.
 *
 * Baseline behaviour, every time, and never an empty brief or a stale one.
 * "On timeout, disabled entitlement, missing capability or no approved brief,
 * use host baseline behaviour."
 */
export function resolveEffective({ briefs = [], now, market, locale, channel, topicId = null, ...opts } = {}) {
  const candidates = (Array.isArray(briefs) ? briefs : []).filter((b) =>
    b && String(b.market) === String(market) && String(b.locale) === String(locale)
      && (topicId === null || String(b.topic_id) === String(topicId)));

  const reasons = [];
  let best = null;
  for (const b of candidates) {
    const r = briefIsEffective(b, { now, channel, ...opts });
    if (r.ok) {
      // Highest revision wins, deterministically, so two approved briefs in
      // the same scope cannot resolve differently on two reads.
      if (!best || Number(b.brief_version) > Number(best.brief.brief_version)) best = { brief: b, result: r };
    } else reasons.push({ brief_id: b.brief_id, reason: r.reason, say: r.say });
  }
  if (best) {
    return { ok: true, status: 200, brief: best.brief,
             cacheTtlSeconds: cacheTtlSeconds(best.brief, { now }),
             authorityToWrite: false,
             say: `${best.result.say} The SDK may cache this for ${cacheTtlSeconds(best.brief, { now })}s and the cache is never authority to write.` };
  }
  return {
    ok: false, status: 204, fallback: "baseline", considered: candidates.length, reasons,
    say: candidates.length
      ? `No effective brief for ${market}/${locale}${channel ? `/${channel}` : ""}: ${reasons.map((r) => `${r.brief_id} ${r.reason}`).join(", ")}. The agent uses its baseline instructions.`
      : `No brief exists for ${market}/${locale}${channel ? `/${channel}` : ""}. 204 and baseline behaviour — an absent brief is not an empty one.`,
  };
}

export function briefNotes(result) {
  if (!result) return [];
  const out = [result.say];
  if (result.errors) out.push(...result.errors.map((e) => `${e.field}: ${e.problem}`));
  if (result.reasons) out.push(...result.reasons.map((r) => r.say));
  return out;
}
