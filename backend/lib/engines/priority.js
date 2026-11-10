/**
 * TI-OS · The opportunity strategist. Ranked, with the reason, and no authority.
 *
 * §4: "Clusters, platform profile, catalog, capacity, site inventory in;
 * ranked decision, business reason, score breakdown, recommended channels out.
 * RECOMMENDS. CANNOT AUTHORISE ACTIONS."
 *
 * THE LAST LINE IS THE WHOLE DESIGN. A ranked list with a score against each
 * row reads as a decision, and the thing that stops it being treated as one is
 * not a disclaimer at the top — it is that the rank carries the VETOES and the
 * missing inputs on the same row as the number. A row that says 86 and nothing
 * else is an instruction. A row that says 86, readiness not evidenced,
 * therefore watch only, is a recommendation.
 *
 * READINESS IS THE ONE THIS BUSINESS CANNOT EVIDENCE FROM A FEED. §5 makes
 * readiness 25% of nothing — it is not a weight, it is a VETO: "missing
 * readiness blocks activation". Whether ETABLIX can serve a particular
 * movement depends on supplier coverage, lead times and what the team is
 * already committed to, and no public feed knows any of that. So unless
 * readiness is supplied as an input by a person who knows, every row here
 * stays in watch. That is the correct answer and not a limitation to route
 * around.
 *
 * AND THE CHANNEL RECOMMENDATION IS BOUNDED BY WHAT EXISTS. Two channels have
 * an adapter in this release. A recommendation to run paid search is a
 * recommendation to do something the platform cannot do, so the strategist
 * names only routes that are actually available and says which are not.
 */

import { scoreTopic, VETOES } from "../trendintel/score.js";
import { read as readTrend } from "./demand.js";
import { PLATFORM_PROFILE, PLATFORM_INSTALLATION } from "../trendintel/platform.js";
import { ROUTES_AVAILABLE, BRIEF_CHANNELS } from "../trendintel/brief.js";

/**
 * Rank the segments the trend reader found.
 *
 * `readiness` is a map of segment → 0-100 supplied by a person. Anything not
 * in it is unevidenced and vetoed, which is why the map is the only input
 * this engine asks for.
 */
export function rank({ windowDays = 28, at = null, readiness = {}, installationId = PLATFORM_INSTALLATION } = {}) {
  const trend = readTrend({ windowDays, at, installationId });
  if (!trend.ok) return { ok: false, reason: trend.reason };
  if (!trend.detail || !trend.detail.length) {
    return { ok: true, ranked: [], unavailableChannels: [], say: trend.say };
  }

  const profile = PLATFORM_PROFILE;
  const supplied = Object.fromEntries(
    Object.entries(readiness || {}).map(([k, v]) => [String(k), Number(v)]).filter(([, v]) => Number.isFinite(v)),
  );

  const ranked = [];
  for (const s of trend.detail) {
    const inScope = profile.topicScope.includes(s.segment);
    const evidencedReadiness = Object.prototype.hasOwnProperty.call(supplied, s.segment);

    const vetoes = [];
    if (!inScope) vetoes.push("out-of-market");
    if (profile.forbiddenTopics.includes(s.segment)) vetoes.push("restricted-topic");

    const scored = scoreTopic({
      opportunity: {
        demand: s.z === null ? null : Math.min(100, Math.max(0, 50 + 10 * s.z)),
        fit: inScope ? 90 : 30,
        intent: s.corroborating >= 2 ? 70 : 40,
        // Timing is the remaining actionable window, and a breaking topic has
        // less of it rather than more.
        timing: s.trendClass === "breaking" ? 80 : s.trendClass === "persistent" ? 60 : 30,
        readiness: evidencedReadiness ? supplied[s.segment] : undefined,
      },
      confidence: {
        sourceQuality: s.corroborating >= 1 ? 70 : 40,
        corroboration: s.corroborating >= 3 ? 100 : s.corroborating === 2 ? 80 : 0,
        coverage: Math.min(100, s.current * 10),
        freshness: s.lastObservedDaysAgo === null ? 0 : Math.max(0, 100 - s.lastObservedDaysAgo * 7),
      },
      independentFamilies: s.independentFamilies,
      contextOnlyFamilies: s.contextOnlyFamilies,
      vetoes,
      readinessEvidenced: evidencedReadiness,
    });

    ranked.push({
      segment: s.segment,
      trendClass: s.trendClass,
      band: scored.decision.band,
      score: scored.opportunity.ok ? Math.round(scored.opportunity.score * 100) / 100 : null,
      confidence: scored.confidence.ok ? Math.round(scored.confidence.confidence * 100) / 100 : null,
      breakdown: scored.opportunity.components ?? null,
      confidenceBreakdown: scored.confidence.components ?? null,
      vetoes: scored.vetoes,
      readinessEvidenced: evidencedReadiness,
      recommendedChannels: inScope ? [...ROUTES_AVAILABLE] : [],
      expiresAt: s.expiresAt,
      // The business reason, which is the row a reader acts on rather than the
      // number. It names the veto on the same line as the score.
      reason: [
        `${s.segment} is ${s.trendClass}`,
        s.z === null ? "with no usable movement figure" : `with z ${s.z}`,
        `across ${s.corroborating} corroborating source famil${s.corroborating === 1 ? "y" : "ies"}`,
        inScope ? "and inside the approved topic scope" : "and OUTSIDE the approved topic scope",
        evidencedReadiness
          ? `with readiness evidenced at ${supplied[s.segment]}`
          : "with READINESS NOT EVIDENCED, which is a veto on activation rather than a low score",
        `— ${scored.decision.band}.`,
      ].join(", "),
    });
  }

  ranked.sort((a, b) => {
    if ((b.score ?? -1) !== (a.score ?? -1)) return (b.score ?? -1) - (a.score ?? -1);
    return a.segment < b.segment ? -1 : 1;
  });

  const unavailable = BRIEF_CHANNELS.filter((c) => !ROUTES_AVAILABLE.includes(c));
  const actionable = ranked.filter((r) => r.band === "BRIEF" || r.band === "AUTOMATIC");
  const unevidenced = ranked.filter((r) => !r.readinessEvidenced);

  return {
    ok: true,
    ranked: ranked.map((r) => r.reason),
    detail: ranked,
    unavailableChannels: unavailable.map((c) => `${c}: no adapter and no policy enables it in this release, so it is not recommended however well a topic would suit it`),
    missing: trend.missing,
    say: `${ranked.length} segment(s) ranked. ${actionable.length} could support a reviewable brief. ${unevidenced.length} carry no evidenced readiness and are therefore vetoed on activation: whether this business can serve a movement depends on supplier coverage, lead times and existing commitments, and no public feed knows any of those. Nothing here authorises anything — a ranked list with a score reads as a decision, so every row carries its vetoes on the same line as its number.`,
    boundaryNote: `This recommends and cannot authorise. The ${VETOES.length} vetoes are applied before the rank, not after it.`,
  };
}
