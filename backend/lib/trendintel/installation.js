/**
 * Installations, profiles and the rule that keeps one build serving two
 * unrelated businesses.
 *
 * THE PORTABILITY RULE (§14) IS THE ONE THAT DECIDES WHETHER THIS PRODUCT
 * EXISTS: "Core services and shared SDKs must never branch on a platform slug
 * or apply an industry-specific taxonomy by default." Country, language,
 * category codes, source defaults, outcome names and slugs live in profile or
 * adapter configuration, and nowhere else.
 *
 * It is a rule about the first shortcut, not the hundredth. The first `if
 * (slug === "…")` is always reasonable — one customer needs one thing by
 * Friday — and it is the commit after which the core has a host-specific fork
 * that nobody will ever pay to remove. TI-17 runs a subscription service in
 * Canadian English measuring qualified trial starts and a storefront in
 * French measuring completed orders through the same functions, and the
 * conformance suite reads the source of every module in this directory to
 * assert no slug comparison exists in it.
 *
 * DEFAULT MODE IS DRAFT ONLY AND EVERY WRITE CONNECTOR IS DISABLED (§14.1).
 * Not as a safe starting point to be moved past quickly — as the state an
 * installation stays in until a person enables one named target class. "An
 * installation manifest or a subscription alone never authorises publishing."
 *
 * AND FOUR COMPARABLE PERIODS BEFORE A LIVE RECOMMENDATION (§14.4). Fewer is
 * not a weaker recommendation, it is a research task: with three periods the
 * baseline median and the MAD are both guesses, so the z-score the whole
 * detection rests on means nothing.
 */

/** §14 — the smallest profile that is an installation at all. */
export const MINIMUM_PROFILE = Object.freeze([
  "platformSlug", "defaultMarket", "defaultLocale", "topicScope", "outcome", "sources",
]);

/** §14.1 — what a new installation starts with, before anybody enables anything. */
export const BASELINE_SOURCES = Object.freeze(["first_party", "manual_import"]);

/** §14.4 — below this, recommendations are research tasks, not live advice. */
export const MIN_COMPARABLE_PERIODS = 4;

/** §12 and §14.1 — the mode an installation starts in and stays in. */
export const DEFAULT_MODE = "draft_only";
export const MODES = Object.freeze(["draft_only", "shadow", "live"]);

/** §20 — the build-order gates and what each one's exit evidence is. */
export const RELEASE_GATES = Object.freeze([
  { id: "G1", name: "Contract and clean install",
    evidence: "A fresh installation starts with no external provider credentials, serves the API, uses bundled or deployment-supplied inference, shows proposed actions and denies writes until approval. Schema fixtures and two-install identity tests pass." },
  { id: "G2", name: "Reference pilot",
    evidence: "Verified first-party events and approved claims. One SEO and one marketing agent resolve the same approved brief. One approved owned change and its rollback complete end to end." },
  { id: "G3", name: "Portability",
    evidence: "Two dissimilar host profiles on the same core build, different locales, outcome types and source mixes, one of them with no third-party signal feed. No host-specific core fork. Cross-installation isolation verified." },
  { id: "G4", name: "First external sale",
    evidence: "Console or SDK onboarding, account lifecycle, quota, customer data export, backup restore, signed images, licence review and support runbook. An external design partner runs draft-only before any write connector." },
  { id: "G5", name: "Private deployment",
    evidence: "Clean private install and rolling upgrade from distributed images and pinned assets. Disconnected mode works with egress blocked. Offline entitlement, renewal and export tested." },
]);

/**
 * §20 — the hard release gate for the full product, as a checklist rather
 * than prose, because every item is a thing that can quietly not be true.
 * "A draft-only run does not satisfy this release gate."
 */
export const HARD_RELEASE_GATE = Object.freeze([
  "noCustomerProviderSecrets", "noHostAi", "noExternalAnalytics", "noOauth",
  "noThirdPartyConnector", "thirdPartyEgressBlocked", "localInferenceProfile",
  "firstPartyActivitySimulated", "oneSharedBriefGenerated", "realModelOutput",
  "seoChangeApprovedAndApplied", "marketingChangeApprovedAndApplied",
  "nativeSurfacePublished", "eligibleVisitsCaptured", "configuredOutcomesCaptured",
  "measurementReportProduced", "priorRevisionRestored",
  "noNewKeysRequested", "noExternalDestinationContacted", "auditChainComplete",
]);

const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Validate a profile against the minimum, §14. */
export function validateProfile(profile = {}) {
  const missing = MINIMUM_PROFILE.filter((f) => {
    const v = profile[f];
    if (Array.isArray(v)) return v.length === 0;
    if (f === "outcome") return !(v && str(v.conversion) && str(v.denominator));
    return v === undefined || v === null || str(v).trim() === "";
  });
  if (missing.length) {
    return { ok: false, missing,
             say: `This is not yet an installation profile: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} absent. Until a profile is active, observations are accepted and recommendations stay in shadow mode.` };
  }
  if (!/^[A-Z]{2}$/.test(str(profile.defaultMarket))) {
    return { ok: false, say: `"${str(profile.defaultMarket)}" is not an ISO alpha-2 market code. ZZ is reserved for explicitly global scope.` };
  }
  return {
    ok: true,
    profile: Object.freeze({
      platformSlug: str(profile.platformSlug),
      mode: MODES.includes(str(profile.mode)) ? str(profile.mode) : DEFAULT_MODE,
      defaultMarket: str(profile.defaultMarket), defaultLocale: str(profile.defaultLocale),
      markets: [...(profile.markets || [profile.defaultMarket])].map(str),
      locales: [...(profile.locales || [profile.defaultLocale])].map(str),
      topicScope: [...profile.topicScope].map(str),
      outcome: { conversion: str(profile.outcome.conversion), denominator: str(profile.outcome.denominator) },
      sources: [...profile.sources].map(str),
      allowedChannels: [...(profile.allowedChannels || [])].map(str),
      allowedAssetIds: [...(profile.allowedAssetIds || [])].map(str),
      approvedClaimIds: [...(profile.approvedClaimIds || [])].map(str),
      allowedCtaIds: [...(profile.allowedCtaIds || [])].map(str),
      forbiddenTopics: [...(profile.forbiddenTopics || [])].map(str),
      timezone: str(profile.timezone || "UTC"),
      revision: num(profile.revision) ?? 1,
    }),
    say: `Profile for ${str(profile.platformSlug)} at revision ${num(profile.revision) ?? 1}: ${str(profile.defaultMarket)}/${str(profile.defaultLocale)}, outcome ${str(profile.outcome.conversion)} per ${str(profile.outcome.denominator)}, ${[...profile.sources].length} source(s), mode ${MODES.includes(str(profile.mode)) ? str(profile.mode) : DEFAULT_MODE}.`,
  };
}

/** §14.1 — what a fresh installation actually has. Nothing is pre-enabled. */
export function newInstallation({ installationId, organisationId, platformSlug, environment = "production" } = {}) {
  if (!str(installationId) || !str(organisationId) || !str(platformSlug)) {
    return { ok: false, say: "An installation needs an organisation, an installation id and a platform slug; stage and production are distinct installations." };
  }
  return {
    ok: true,
    installation: {
      installationId: str(installationId), organisationId: str(organisationId),
      platformSlug: str(platformSlug), environment: str(environment),
      mode: DEFAULT_MODE, sourcesEnabled: [...BASELINE_SOURCES],
      writeConnectorsEnabled: [], channelsEnabled: [], profileRevision: null,
      inferenceRoutesApproved: ["deployment"],
    },
    say: `${str(installationId)} created in ${str(environment)}: mode ${DEFAULT_MODE}, first-party ingestion and manual imports only, every write connector disabled, and deployment-supplied or deterministic inference until an administrator explicitly authorises a host AI binding. Sources and channels outside that baseline require explicit activation, and a sample profile or optional connector shipped with the build does not activate on a new installation.`,
  };
}

/** Enabling anything is explicit and names a target class, §14.7. */
export function enableWriteTarget(installation, { targetClass, assetId, patchOnly = true, author = null, approver = null } = {}) {
  if (!installation) return { ok: false, say: "No installation." };
  if (!str(targetClass) || !str(assetId)) {
    return { ok: false, say: "Enabling a write names the target class and the specific asset. A blanket enable is how an installation acquires publishing rights nobody granted." };
  }
  if (!patchOnly) {
    return { ok: false, say: "v1 grants patch-only scope on a test asset. A wider scope is not a configuration option here." };
  }
  if (!str(author) || !str(approver) || str(author) === str(approver)) {
    return { ok: false, reason: "segregation", say: "Separate author and approver roles are nominated before the first write is enabled, not afterwards." };
  }
  return {
    ok: true,
    installation: { ...installation, writeConnectorsEnabled: [...new Set([...installation.writeConnectorsEnabled, str(targetClass)])] },
    say: `${str(targetClass)} enabled for ${str(assetId)} with patch-only scope, author ${str(author)} and approver ${str(approver)} nominated separately. Read-back and rollback are verified before anything else is enabled.`,
  };
}

/** §14.4 — whether there is enough history for a LIVE recommendation. */
export function readyForLiveRecommendations({ comparablePeriods = 0, profileActive = false } = {}) {
  const n = Math.max(0, Math.trunc(num(comparablePeriods) ?? 0));
  if (!profileActive) {
    return { ok: false, mode: "shadow", say: "No active profile revision, so recommendations stay in shadow mode however much data has arrived." };
  }
  if (n < MIN_COMPARABLE_PERIODS) {
    return { ok: false, mode: "research", comparablePeriods: n,
             say: `${n} comparable reporting period(s) against a minimum of ${MIN_COMPARABLE_PERIODS}. A sparse dataset still creates internal research tasks; it does not produce a live recommendation, because with fewer than four periods the baseline median and the MAD are both guesses and the z-score the detection rests on means nothing.` };
  }
  return { ok: true, mode: "live", comparablePeriods: n,
           say: `${n} comparable periods and an active profile: live recommendations are available. Every live action still needs an approved asset binding and the applicable review policy.` };
}

/**
 * Resolve the things the portability rule keeps out of the core: the market,
 * the locale, the outcome name and the taxonomy all come from the profile
 * that was passed in, and this function cannot name a platform.
 */
export function resolveFromProfile(profile, { market = null, locale = null, topic = null } = {}) {
  if (!profile) return { ok: false, say: "No profile, so nothing resolves. The core holds no default country, language, taxonomy or outcome." };
  const m = str(market) || profile.defaultMarket;
  const l = str(locale) || profile.defaultLocale;
  if (!profile.markets.includes(m)) {
    return { ok: false, reason: "market-not-in-profile", say: `${m} is not one of this installation's markets (${profile.markets.join(", ")}).` };
  }
  if (!profile.locales.includes(l)) {
    return { ok: false, reason: "locale-not-in-profile", say: `${l} is not one of this installation's locales (${profile.locales.join(", ")}).` };
  }
  if (topic !== null) {
    if (profile.forbiddenTopics.includes(str(topic))) {
      return { ok: false, reason: "forbidden-topic", say: `${str(topic)} is on this installation's forbidden list.` };
    }
    if (profile.topicScope.length && !profile.topicScope.includes(str(topic))) {
      return { ok: false, reason: "topic-out-of-scope", say: `${str(topic)} is outside the approved topic scope (${profile.topicScope.join(", ")}).` };
    }
  }
  return {
    ok: true, market: m, locale: l, outcome: { ...profile.outcome },
    say: `Resolved ${m}/${l} measuring ${profile.outcome.conversion} per ${profile.outcome.denominator}, entirely from this installation's own profile.`,
  };
}

/** §20 — score the hard release gate. Every item or it is not passed. */
export function hardReleaseGate(evidence = {}) {
  const missing = HARD_RELEASE_GATE.filter((k) => evidence[k] !== true);
  if (missing.length) {
    return { ok: false, missing,
             say: `The hard release gate is not passed: ${missing.length} of ${HARD_RELEASE_GATE.length} item(s) unevidenced — ${missing.join(", ")}. A draft-only run does not satisfy it.` };
  }
  return { ok: true, say: `All ${HARD_RELEASE_GATE.length} items evidenced: a clean install with no customer provider secrets, no host AI, no external analytics, no OAuth and no third-party connector produced real model output, published an approved SEO and marketing change to the native surface, captured eligible visits and configured outcomes, produced a measurement report and restored the prior revision — with no new key requested and no external destination contacted.` };
}

export function installationNotes(result) {
  if (!result) return [];
  const out = [result.say];
  if (result.missing) out.push(`Missing: ${result.missing.join(", ")}.`);
  return out;
}
