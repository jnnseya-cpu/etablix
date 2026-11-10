/**
 * The source registry, and the two claims a feed is not allowed to make.
 *
 * A source adapter registers what it is and what it may be used for before it
 * is allowed to contribute anything (§3). The registration is not paperwork:
 * two of its fields decide whether an automated action can happen at all.
 *
 * CLAIM ONE · "THERE IS NO INTEREST." A feed gap is unknown data, never zero
 * interest. Every function here returns an explicit unknown rather than a
 * zero, because a zero is a finding and a gap is an absence of one, and they
 * get acted on in opposite directions.
 *
 * CLAIM TWO · "THIS IS CORROBORATED." Syndicated stories, mirrors and
 * amendments contribute ONE corroborating source family at most (§3), and
 * context-only sources cannot satisfy the corroboration minimum at all (§17).
 * Four copies of one announcement is the commonest way a non-event reaches a
 * confidence score that would release it, which is why TI-04 exists.
 *
 * ACCESS PATH IS THE KEYLESS BOUNDARY. `public_keyless`, `host_mediated` or
 * `file_import` and nothing else (§3). A source that needs a credential the
 * installation does not already hold is not a source that is configured
 * badly — it is a capability shown as unavailable, with the reason, and the
 * workflow continues on what is available (§2, TI-22). Nothing here ever
 * prompts for a key.
 */

/** The only three ways a signal may arrive, §3. */
export const ACCESS_PATHS = Object.freeze(["public_keyless", "host_mediated", "file_import"]);

/** What a registration must carry before a source may contribute, §3. */
export const REGISTRATION_FIELDS = Object.freeze([
  "sourceId", "sourceFamily", "accessPath", "accessMode", "owner", "terms",
  "permittedUses", "territories", "languages", "cadence", "ingestionLagMinutes",
  "quota", "retentionDays", "failureStatus",
]);

/**
 * What a class of signal can actually prove, §3. This is the field that stops
 * attention being read as intent: Wikimedia pageviews are attention, a
 * failed internal search is intent, a procurement notice is a decision.
 */
export const PROVES = Object.freeze(["intent", "decision", "attention", "context"]);

/** A context-only source can corroborate nothing on its own, §17. */
export const CONTEXT_ONLY = Object.freeze(["attention", "context"]);

const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Register a source, or refuse and say which field is missing.
 *
 * It refuses rather than defaulting. A source with no stated terms has no
 * permitted use, and a source with no stated territory cannot be checked
 * against a market — both of which are findable later only by somebody
 * reading a feed licence after a complaint.
 */
export function registerSource(input = {}) {
  const missing = REGISTRATION_FIELDS.filter((f) => {
    const v = input[f];
    if (Array.isArray(v)) return v.length === 0;
    return v === undefined || v === null || str(v).trim() === "";
  });
  // ingestionLagMinutes and retentionDays may legitimately be 0.
  const real = missing.filter((f) => !(["ingestionLagMinutes", "retentionDays"].includes(f) && num(input[f]) !== null));
  if (real.length) {
    return { ok: false, reason: "incomplete-registration", missing: real,
             say: `This source cannot contribute: ${real.join(", ")} ${real.length === 1 ? "is" : "are"} not registered. A source with no stated terms has no permitted use.` };
  }
  if (!ACCESS_PATHS.includes(str(input.accessPath))) {
    return { ok: false, reason: "unknown-access-path", accessPath: str(input.accessPath),
             say: `"${str(input.accessPath)}" is not an access path. It is one of ${ACCESS_PATHS.join(", ")} — a source needing a new credential is reported unavailable, not registered as a fourth kind.` };
  }
  const proves = str(input.proves || "context");
  if (!PROVES.includes(proves)) {
    return { ok: false, reason: "unknown-proof-class", say: `"${proves}" is not one of ${PROVES.join(", ")}. What a signal proves decides whether it can corroborate anything.` };
  }
  return {
    ok: true,
    source: Object.freeze({
      sourceId: str(input.sourceId), sourceFamily: str(input.sourceFamily),
      accessPath: str(input.accessPath), accessMode: str(input.accessMode),
      owner: str(input.owner), terms: str(input.terms),
      permittedUses: [...input.permittedUses].map(str),
      territories: [...input.territories].map(str), languages: [...input.languages].map(str),
      cadence: str(input.cadence), ingestionLagMinutes: num(input.ingestionLagMinutes) ?? 0,
      quota: str(input.quota), retentionDays: num(input.retentionDays) ?? 0,
      failureStatus: str(input.failureStatus), proves,
      staleAfterHours: num(input.staleAfterHours) ?? 24,
      qualityScore: num(input.qualityScore),
      syndicatedFrom: input.syndicatedFrom ? str(input.syndicatedFrom) : null,
      contextOnly: CONTEXT_ONLY.includes(proves),
    }),
  };
}

/**
 * Whether a source may support a FRESH automated action, §3.
 *
 * A stale source is not useless — it can provide dated context — so this
 * separates the two answers instead of collapsing them into one boolean.
 */
export function sourceFreshness(source, { ageHours } = {}) {
  const age = num(ageHours);
  const limit = num(source?.staleAfterHours);
  if (age === null) {
    return { known: false, stale: null, mayActAutomatically: false,
             say: "The observation age is unknown, so freshness cannot be asserted. Unknown is not fresh." };
  }
  if (limit === null || limit <= 0) {
    return { known: false, stale: null, mayActAutomatically: false,
             say: "This source has no configured stale-after limit, so nothing can be said about whether it is current." };
  }
  const stale = age >= limit;
  return {
    known: true, stale, ageHours: age, staleAfterHours: limit,
    mayActAutomatically: !stale,
    say: stale
      ? `Stale: ${age}h against a ${limit}h limit. It can provide dated context and cannot support a fresh automated action.`
      : `Current: ${age}h against a ${limit}h limit.`,
  };
}

/**
 * Collapse observations to independent source families.
 *
 * Syndications, mirrors and amendments of one story contribute one family at
 * most (§3). The collapse is by declared `syndicatedFrom` where a feed states
 * it, and by shared provenance key where it does not — the second case is the
 * one that catches four wire copies that each claim to be original.
 */
export function independentFamilies(observations = []) {
  const families = new Map();
  for (const o of observations) {
    if (!o) continue;
    const fam = str(o.sourceFamily);
    if (!fam) continue;
    const root = str(o.syndicatedFrom) || str(o.provenanceKey) || fam;
    if (!families.has(root)) families.set(root, { root, families: new Set(), contextOnly: true, sourceIds: new Set() });
    const entry = families.get(root);
    entry.families.add(fam);
    entry.sourceIds.add(str(o.sourceId));
    if (!o.contextOnly) entry.contextOnly = false;
  }
  const groups = [...families.values()].sort((a, b) => (a.root < b.root ? -1 : 1));
  const independent = groups.length;
  const contextOnly = groups.filter((g) => g.contextOnly).length;
  const corroborating = independent - contextOnly;
  const collapsed = groups.filter((g) => g.families.size > 1 || g.sourceIds.size > 1);
  return {
    independent, contextOnly, corroborating,
    groups: groups.map((g) => ({ root: g.root, families: [...g.families].sort(), sourceIds: [...g.sourceIds].sort(), contextOnly: g.contextOnly })),
    collapsed: collapsed.map((g) => g.root),
    say: collapsed.length
      ? `${observations.length} observation(s) collapse to ${independent} independent source famil${independent === 1 ? "y" : "ies"} — ${collapsed.map((g) => `${g.root} carries ${g.sourceIds.size}`).join("; ")}. Syndications and mirrors of one story contribute one family at most.`
      : `${independent} independent source famil${independent === 1 ? "y" : "ies"}, ${contextOnly} of which ${contextOnly === 1 ? "is" : "are"} context-only and cannot satisfy the corroboration minimum.`,
  };
}

/**
 * Cluster two candidate observations, or keep them apart.
 *
 * TI-14 is the scenario this exists for: a competitor's syndicated
 * announcement matching the same keywords as the host's product, with
 * unrelated buyer intent. Lexical similarity is the weakest of the four
 * tests here and it is the only one an embedding would have reported.
 *
 * "Do not merge distinct geographies because an embedding is similar" (§17)
 * is enforced as a hard separation, not a weighting.
 */
export function sameCluster(a = {}, b = {}) {
  const reasons = [];
  if (str(a.market) && str(b.market) && str(a.market) !== str(b.market)) {
    reasons.push(`different markets (${str(a.market)} and ${str(b.market)}) — geography is never merged on similarity`);
  }
  if (str(a.intent) && str(b.intent) && str(a.intent) !== str(b.intent)) {
    reasons.push(`different buyer intent ("${str(a.intent)}" and "${str(b.intent)}")`);
  }
  if (str(a.category) && str(b.category) && str(a.category) !== str(b.category)) {
    reasons.push(`different product categories (${str(a.category)} and ${str(b.category)})`);
  }
  if (str(a.subject) && str(b.subject) && str(a.subject) !== str(b.subject)) {
    reasons.push(`different subjects (${str(a.subject)} and ${str(b.subject)}) — a competitor announcement is not the host's demand`);
  }
  if (reasons.length) {
    return { same: false, reasons,
             say: `Kept separate: ${reasons.join("; ")}. Shared keywords are not shared intent.` };
  }
  return { same: true, reasons: [], say: "Same market, intent, category and subject: one cluster." };
}

/**
 * Whether a cluster's own apparent spike was generated by the installation's
 * campaign, §3. Excluded from scoring rather than scored down — a measurement
 * of your own marketing is not a demand signal at any weight.
 */
export function selfGenerated({ campaignActive = false, campaignTopicIds = [], topicId = null, overlapRatio = null } = {}) {
  const ids = (Array.isArray(campaignTopicIds) ? campaignTopicIds : []).map(str);
  const hit = topicId !== null && ids.includes(str(topicId));
  const overlap = num(overlapRatio);
  if (!campaignActive) return { selfGenerated: false, say: "No campaign was running in the window, so the movement is not the installation's own activity." };
  if (hit) {
    return { selfGenerated: true, excludeFromScoring: true,
             say: `The installation's own campaign ran against ${str(topicId)} in this window. The movement is excluded from scoring rather than weighted down: a measurement of your own marketing is not a demand signal.` };
  }
  if (overlap !== null && overlap >= 0.5) {
    return { selfGenerated: true, excludeFromScoring: true, overlapRatio: overlap,
             say: `Campaign and topic query overlap is ${(overlap * 100).toFixed(0)}%. Excluded from scoring as probably self-generated; the threshold is configurable per installation.` };
  }
  return { selfGenerated: false, say: "A campaign ran but against other topics, with no material query overlap." };
}

export function sourceNotes(reg) {
  if (!reg) return [];
  if (!reg.ok) return [reg.say];
  const s = reg.source;
  return [
    `${s.sourceId} (family ${s.sourceFamily}) registered as ${s.accessPath}, proving ${s.proves}${s.contextOnly ? " — context only, cannot corroborate on its own" : ""}.`,
    `Terms: ${s.terms}. Permitted uses: ${s.permittedUses.join(", ")}. Territories: ${s.territories.join(", ")}.`,
    `Cadence ${s.cadence}, ingestion lag ${s.ingestionLagMinutes} min, stale after ${s.staleAfterHours}h, retention ${s.retentionDays} days.`,
  ];
}
