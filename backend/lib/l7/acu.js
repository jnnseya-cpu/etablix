/**
 * The ACU meter — what a run costs, before it runs, while it runs, and after.
 *
 * An agent computing unit is one number that makes different kinds of spend
 * comparable: tokens into a frontier model, pages through an OCR service,
 * chunks through an embedding model, calls out to a paid tool. Without a
 * common unit, the cost of a bid is a set of invoices nobody reconciles to
 * the work, and the first honest answer to "what did that tender cost us to
 * price?" arrives a month after the tender did.
 *
 * THREE RULES HERE ARE NOT ABOUT MONEY. They are about correctness.
 *
 *   · DOWNGRADE AT EIGHTY, HALT AT A HUNDRED. Not "warn". A budget that
 *     warns is a budget that is exceeded, because the person who would act
 *     on the warning is not watching at two in the morning when the run is
 *     going round its ninth continuation.
 *
 *   · EXHAUSTION MUST NEVER PRODUCE SOMETHING THAT LOOKS FINISHED. This is
 *     the dangerous one and the specification says it outright. A run that
 *     stops for want of budget has written some sections and not others. If
 *     it returns "completed", a human reads a document with three sections
 *     missing and no marker where they should have been, and submits it. The
 *     verdict for a halted run is blocked, always, and this module is what
 *     says so rather than the agent that would rather have finished.
 *
 *   · A CACHE HIT MUST MATCH ON PERMISSION AS WELL AS CONTENT. Reusing a
 *     result computed for a bid the reader may not see is a data leak that
 *     presents as a cost saving. The cache key here carries the permission
 *     scope and the source versions, and a miss on either is a miss.
 *
 * The conversion table is configuration, not a constant, because the rate a
 * model is billed at changes and a hard-coded weight silently misprices every
 * projection built after the change.
 */

/**
 * Default conversion. One ACU is a thousand output tokens on the frontier
 * route — an arbitrary anchor, chosen so the numbers on a bid dashboard are
 * readable rather than in units of 1e-6.
 */
export const DEFAULT_RATES = {
  version: "acu-2026-09",
  anchor: "1 ACU = 1,000 output tokens on the frontier route",
  models: {
    // input and output are ACU per 1,000 tokens
    "claude-opus-5": { input: 0.2, output: 1.0, tier: "frontier" },
    "claude-sonnet-5": { input: 0.04, output: 0.2, tier: "mid" },
    "claude-haiku-4-5-20251001": { input: 0.011, output: 0.055, tier: "small" },
  },
  kinds: {
    // non-token spend, ACU per unit
    ocr: { per: "page", acu: 0.05 },
    embed: { per: "1k tokens", acu: 0.002 },
    tool: { per: "call", acu: 0.01 },
  },
  // The route an agent drops to when the budget passes eighty per cent.
  downgrade: { frontier: "claude-sonnet-5", mid: "claude-haiku-4-5-20251001", small: null },
};

/** ACU for one call. Returns null when the call cannot be priced. */
export function priceCall(call = {}, rates = DEFAULT_RATES) {
  const kind = String(call.kind || "llm");
  if (kind === "llm") {
    const model = String(call.model || "");
    const row = rates.models[model];
    if (!row) return null; // an unpriced model is a refusal, not a zero
    const inTok = Number(call.inputTokens || 0);
    const outTok = Number(call.outputTokens || 0);
    if (!Number.isFinite(inTok) || !Number.isFinite(outTok) || inTok < 0 || outTok < 0) return null;
    return round6((inTok / 1000) * row.input + (outTok / 1000) * row.output);
  }
  const row = rates.kinds[kind];
  if (!row) return null;
  const units = Number(call.units || 0);
  if (!Number.isFinite(units) || units < 0) return null;
  return round6(units * row.acu);
}

function round6(n) { return Math.round(n * 1e6) / 1e6; }

/**
 * The estimate taken BEFORE a run, so a run above the approval threshold is
 * approved before it spends rather than explained after.
 */
export function estimate({ passes = 1, promptTokens = 0, outputTokens = 0, model = "claude-opus-5", tools = 0 } = {}, rates = DEFAULT_RATES) {
  const perPass = priceCall({ kind: "llm", model, inputTokens: promptTokens, outputTokens }, rates);
  if (perPass === null) return { ok: false, reason: `no rate for model "${model}"`, acu: null };
  const toolAcu = priceCall({ kind: "tool", units: tools }, rates) || 0;
  return { ok: true, acu: round6(perPass * Math.max(1, passes) + toolAcu), perPass, passes: Math.max(1, passes), model };
}

/** Where a budget stands, and what that means for the next call. */
export function budgetState(spent, cap) {
  const s = Number(spent);
  const c = Number(cap);
  if (!Number.isFinite(c) || c <= 0) {
    return { ok: false, state: "uncapped", used: null, act: "refuse", say: "a run without a cap cannot be metered; set one" };
  }
  const used = Number.isFinite(s) && s >= 0 ? s / c : null;
  if (used === null) {
    return { ok: false, state: "unmetered", used: null, act: "refuse", say: "spend to date is not a number" };
  }
  if (used >= 1) {
    return { ok: false, state: "halted", used, act: "halt", say: "the budget is spent; the run halts and its output is blocked, never completed" };
  }
  if (used >= 0.8) {
    return { ok: true, state: "downgrade", used, act: "downgrade", say: "past eighty per cent; the run continues on the cheaper route" };
  }
  return { ok: true, state: "within", used, act: "proceed", say: "within budget" };
}

/** The cheaper route for a model, or null when there is nowhere cheaper to go. */
export function downgradeFrom(model, rates = DEFAULT_RATES) {
  const row = rates.models[String(model)];
  if (!row) return null;
  const next = rates.downgrade[row.tier];
  return next && rates.models[next] ? next : null;
}

/**
 * A meter for one bid. Holds the consumption events, answers the projections,
 * and refuses a call it cannot price rather than recording it as free.
 */
export function meter({ bidId = null, cap = null, rates = DEFAULT_RATES } = {}) {
  const events = [];
  let spent = 0;

  return {
    get spent() { return round6(spent); },
    get cap() { return cap; },
    get events() { return events.slice(); },

    /** Records one call. Returns the event, or a refusal. */
    consume(call = {}) {
      const acu = priceCall(call, rates);
      if (acu === null) {
        return { ok: false, reason: `call of kind "${call.kind || "llm"}" could not be priced`, call };
      }
      const before = budgetState(spent, cap);
      if (before.state === "halted") {
        return { ok: false, reason: before.say, state: "halted", used: before.used };
      }
      // The cost of a call is known BEFORE it is recorded, so a cap that is
      // only checked afterwards is not a cap. The first version of this
      // allowed a run on a cap of ten to reach sixteen and then report
      // itself halted — the money already spent. A call that would cross is
      // refused here and handed back, so the orchestrator can split the pass,
      // drop to the cheaper route, or ask for more budget.
      if (Number.isFinite(cap) && cap > 0 && spent + acu > cap) {
        return {
          ok: false,
          reason: `this call costs ${acu} ACU and only ${round6(cap - spent)} remains; it is refused rather than recorded as an overrun`,
          state: "halted",
          wouldExceed: true,
          acu,
          remaining: round6(cap - spent),
          used: spent / cap,
        };
      }
      spent = round6(spent + acu);
      const after = budgetState(spent, cap);
      const event = {
        type: "acu.consumed",
        bidId,
        agentId: call.agentId || null,
        runId: call.runId || null,
        stage: call.stage || null,
        model: call.model || null,
        kind: call.kind || "llm",
        inputTokens: Number(call.inputTokens || 0),
        outputTokens: Number(call.outputTokens || 0),
        units: Number(call.units || 0),
        acu,
        at: call.at || new Date().toISOString(),
      };
      events.push(event);
      return { ok: true, event, spent: round6(spent), state: after.state, used: after.used, act: after.act };
    },

    /** Spend grouped by whichever axis the dashboard is showing. */
    projection(by = "agentId") {
      const out = new Map();
      for (const e of events) {
        const key = e[by] == null ? "(unattributed)" : String(e[by]);
        const row = out.get(key) || { key, acu: 0, calls: 0, inputTokens: 0, outputTokens: 0 };
        row.acu = round6(row.acu + e.acu);
        row.calls += 1;
        row.inputTokens += e.inputTokens;
        row.outputTokens += e.outputTokens;
        out.set(key, row);
      }
      return [...out.values()].sort((a, b) => b.acu - a.acu);
    },

    state() { return budgetState(spent, cap); },
  };
}

/**
 * The verdict on a run that stopped. This is the rule that stops a partial
 * submission looking finished: whatever the agent thinks it produced, a run
 * halted for budget is blocked and names what is missing.
 */
export function exhaustionVerdict({ halted, produced = [], required = [] } = {}) {
  const have = new Set(produced.map(String));
  const missing = required.map(String).filter((r) => !have.has(r));
  if (!halted) {
    return {
      status: missing.length ? "partial" : "completed",
      missing,
      say: missing.length ? `${missing.length} required output(s) were never produced` : "every required output is present",
    };
  }
  return {
    status: "blocked",
    missing,
    say:
      missing.length > 0
        ? `the run halted on budget with ${missing.length} required output(s) missing; it is blocked, not complete`
        : "the run halted on budget; even with every output present it is blocked until a person confirms the last one was finished rather than cut off",
  };
}

/**
 * A cache key that is safe to hit. Content alone is not enough: two readers
 * with different permission may not share a result, and a source that has
 * moved on makes the cached answer wrong rather than stale.
 */
export function cacheKey({ prompt, sourceVersions = [], permissionScope = [], model = "" } = {}) {
  const versions = [...sourceVersions].map(String).sort().join("|");
  const scope = [...permissionScope].map(String).sort().join("|");
  return `${model}::${versions}::${scope}::${fnv(String(prompt || ""))}`;
}

/** A small, dependency-free content hash. Collisions are handled by the
 *  version and scope segments carrying the real identity. */
function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Whether a cached entry may be served to this reader for this state. */
export function cacheHit(entry, want) {
  if (!entry || !want) return { hit: false, reason: "nothing to compare" };
  if (entry.key !== want.key) return { hit: false, reason: "different key" };
  const a = [...(entry.permissionScope || [])].map(String).sort().join("|");
  const b = [...(want.permissionScope || [])].map(String).sort().join("|");
  if (a !== b) return { hit: false, reason: "the cached result was computed under a different permission scope" };
  const va = [...(entry.sourceVersions || [])].map(String).sort().join("|");
  const vb = [...(want.sourceVersions || [])].map(String).sort().join("|");
  if (va !== vb) return { hit: false, reason: "a source has changed version since the result was cached" };
  return { hit: true, reason: "content, source versions and permission all match" };
}
