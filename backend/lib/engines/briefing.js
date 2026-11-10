/**
 * TI-BC · The brief coordinator. One brief, drafted, never approved.
 *
 * §4: "Eligible decision and tenant policy in; ONE shared Growth Brief plus
 * channel-specific job assignments out. Dispatches drafts and permitted
 * internal tasks."
 *
 * ONE BRIEF IS THE POINT. §5 requires one active brief per platform, market
 * and topic, with a short validity window and a per-asset cooldown, "to
 * prevent oscillation". Two briefs in the same scope is not twice the
 * steering; it is an SEO agent and a marketing agent being told different
 * things about the same page in the same week, which is how a site develops
 * two propositions.
 *
 * AND IT DRAFTS. The word in §4 is "dispatches drafts" — a draft and an
 * internal task, nothing else. This engine produces a brief in DRAFT state
 * with every field §6 requires, and the brief is inert until a second named
 * person approves the exact revision. The platform enforces that elsewhere;
 * what this file must not do is produce something that looks approved.
 *
 * THE FIELD IT REFUSES TO INVENT IS THE CLAIM LIST. A brief carries the ids
 * of the claims approved for its topic. Where none is approved, this writes an
 * empty list and says so, rather than listing something the business has not
 * signed off. An invented claim in an approved brief is a claim in a published
 * page with a chain of approvals behind it, which is worse than no brief at
 * all.
 */

import { validateBrief, BRIEF_EXPIRY_HOURS, ROUTES_AVAILABLE } from "../trendintel/brief.js";
import { STANDING_PROHIBITIONS, PLATFORM_PROFILE, PLATFORM_INSTALLATION, narrowsOnly } from "../trendintel/platform.js";
import { rank } from "./priority.js";
import { collection } from "../store.js";

/** A brief id that is stable for a scope and a day, so a re-run does not fork. */
function briefIdFor(segment, at) {
  const day = String(at).slice(0, 10).replace(/-/g, "");
  return `gb_${String(segment).replace(/[^A-Za-z0-9]+/g, "-").slice(0, 60)}_${day}`;
}

/**
 * Draft a brief for the highest-ranked eligible segment, or refuse and say
 * which gate stopped it.
 *
 * It refuses by default. The common case for this business is that nothing is
 * eligible, because readiness is unevidenced — and a coordinator that
 * produces a brief anyway, on the grounds that it is only a draft, is how an
 * unevidenced topic acquires a chain of approvals.
 */
export function draft({ at = null, windowDays = 28, readiness = {}, segment = null,
                        installationId = PLATFORM_INSTALLATION } = {}) {
  const now = at ? new Date(Date.parse(String(at))) : new Date();
  if (Number.isNaN(now.getTime())) return { ok: false, reason: "The drafting date could not be read." };
  const stamp = now.toISOString().replace(/\.\d+Z$/, "Z");

  const ranking = rank({ windowDays, at: stamp, readiness, installationId });
  if (!ranking.ok) return { ok: false, reason: ranking.reason };

  const eligible = (ranking.detail || [])
    .filter((r) => r.band === "BRIEF" || r.band === "AUTOMATIC")
    .filter((r) => segment === null || r.segment === String(segment));

  if (!eligible.length) {
    const vetoed = (ranking.detail || []).filter((r) => r.vetoes.length);
    return {
      ok: true, drafted: null,
      refusals: (ranking.detail || []).map((r) => `${r.segment}: ${r.band}${r.vetoes.length ? ` — ${r.vetoes.join(", ")}` : ""}`),
      say: `No segment is eligible for a brief${segment ? ` (asked for ${segment})` : ""}. ${vetoed.length} carr${vetoed.length === 1 ? "ies" : "y"} a veto, of which unevidenced readiness is the commonest. Nothing is drafted: a coordinator that drafts anyway because it is only a draft is how an unevidenced topic acquires a chain of approvals.`,
    };
  }

  const top = eligible[0];
  const profile = PLATFORM_PROFILE;
  const expiryHours = top.trendClass === "breaking" ? BRIEF_EXPIRY_HOURS.breaking : BRIEF_EXPIRY_HOURS.persistent;

  // Evidence is the observation keys behind this segment, by reference. Ids
  // resolve server-side; nothing is copied into the brief.
  const evidence = collection("tiObservations")
    .filter((o) => o.installationId === installationId && String(o.segment) === top.segment)
    .slice(-12)
    .map((o) => String(o.key || o.id))
    .map((k) => k.replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 120))
    .filter(Boolean);

  if (!evidence.length) {
    return { ok: true, drafted: null,
             say: `${top.segment} ranks as ${top.band} but no observation resolves against it by reference, so there is nothing to cite. A brief with no evidence is an opinion, and it is refused rather than issued with an empty citation list.` };
  }

  const approvedClaims = [...(profile.approvedClaimIds || [])];
  const channel = top.recommendedChannels.find((c) => ROUTES_AVAILABLE.includes(c)) || ROUTES_AVAILABLE[0];

  const brief = {
    schema_version: 1,
    brief_id: briefIdFor(top.segment, stamp),
    brief_version: 1,
    tenant_id: installationId,
    platform_id: profile.platformSlug,
    market: profile.defaultMarket,
    locale: profile.defaultLocale,
    topic_id: top.segment,
    opportunity_score: top.score,
    confidence: top.confidence,
    valid_from: stamp,
    expires_at: new Date(now.getTime() + expiryHours * 3600000).toISOString().replace(/\.\d+Z$/, "Z"),
    evidence_ids: evidence,
    audience: `Readers evaluating ${top.segment.replace(/-/g, " ")} on a scheme that has just become somebody's problem`,
    intent: `understand who owns ${top.segment.replace(/-/g, " ")} and when it has to be settled`,
    approved_claim_ids: approvedClaims,
    cta_id: (profile.allowedCtaIds || [])[0] || "cta_enquiry",
    allowed_channels: [channel],
    // Every standing prohibition, carried into the brief rather than assumed.
    prohibited_claims: [...STANDING_PROHIBITIONS],
    objective: `${profile.outcome.conversion} per ${profile.outcome.denominator}`,
    experiment_id: `exp_${briefIdFor(top.segment, stamp).slice(3)}`.slice(0, 120),
    policy_version: 1,
  };

  const shape = validateBrief(brief);
  if (!shape.ok) {
    return { ok: false, reason: `The drafted brief is not schema-valid, so it is discarded rather than stored: ${shape.say}` };
  }
  const narrow = narrowsOnly(brief, { approvedClaimIds: approvedClaims, prohibitedClaims: STANDING_PROHIBITIONS });
  if (!narrow.ok) return { ok: false, reason: narrow.say };

  // One per scope. A second in the same market, locale and topic is the
  // oscillation §5 exists to prevent.
  const clash = collection("tiBriefs").find((b) =>
    b.installationId === installationId && b.state === "approved"
    && b.brief.market === brief.market && b.brief.locale === brief.locale
    && b.brief.topic_id === brief.topic_id);

  return {
    ok: true,
    drafted: brief,
    state: "draft",
    supersedes: clash ? clash.brief.brief_id : null,
    assignments: [`${channel}: draft only, for review`],
    claimNote: approvedClaims.length
      ? `${approvedClaims.length} approved claim(s) carried by reference.`
      : "NO CLAIM IS APPROVED FOR THIS TOPIC, so the brief carries an empty claim list and the agent is told to make none that is not already in its inputs. An invented claim inside an approved brief is a claim in a published page with a chain of approvals behind it.",
    say: `Drafted ${brief.brief_id} for ${top.segment} on ${channel}, valid ${expiryHours}h, citing ${evidence.length} observation(s) by reference and carrying all ${STANDING_PROHIBITIONS.length} standing prohibitions. It is a DRAFT: it steers nothing until a second named person approves this exact revision${clash ? `, and approving it supersedes ${clash.brief.brief_id} in the same scope` : ""}.`,
  };
}
