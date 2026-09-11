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
    // ACU per 1,000 tokens. Four rates, not two, because a pipeline pass
    // reports four kinds of token and pricing only two of them understates
    // a cached run by most of its input.
    //
    // A CACHE READ IS NOT FREE AND IT IS NOT FULL PRICE. Every pass after the
    // first re-sends the same system prompt, the same inputs and the same
    // drawings; those tokens are read from cache at about a tenth of the
    // input rate, and the write that put them there costs about a quarter
    // more than input. Treating cache reads as ordinary input makes a
    // six-pass run look five times more expensive than it is, and treating
    // them as free makes the most expensive part of a long run invisible.
    "claude-opus-5": { input: 0.2, output: 1.0, cacheRead: 0.02, cacheWrite: 0.25, tier: "frontier" },
    "claude-sonnet-5": { input: 0.04, output: 0.2, cacheRead: 0.004, cacheWrite: 0.05, tier: "mid" },
    "claude-haiku-4-5-20251001": { input: 0.011, output: 0.055, cacheRead: 0.0011, cacheWrite: 0.01375, tier: "small" },
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

/**
 * The rate for a model id, or null.
 *
 * EXACT MATCH FIRST, THEN THE LONGEST CONFIGURED PREFIX ON A BOUNDARY.
 *
 * A provider does not return the id you asked for. It returns the id it
 * resolved to, which carries a date or a build suffix — ask for
 * "claude-opus-5" and get back "claude-opus-5-20260401". A table keyed on
 * exact ids prices nothing in production: every real run comes back unpriced
 * while every unit test passes, because the tests use the id from the table.
 *
 * The boundary matters. "claude-opus-5" must match "claude-opus-5-20260401"
 * and must NOT match a hypothetical "claude-opus-55" at a different price, so
 * the character after the prefix has to be a separator. And the LONGEST
 * matching prefix wins, so adding a specific rate for a variant overrides the
 * family rate rather than being shadowed by it.
 */
export function rateFor(model, rates = DEFAULT_RATES) {
  const id = String(model || "");
  if (!id) return null;
  if (rates.models[id]) return rates.models[id];
  let best = null;
  let bestLen = 0;
  for (const [key, row] of Object.entries(rates.models)) {
    if (!id.startsWith(key)) continue;
    const next = id.charAt(key.length);
    if (next !== "-" && next !== "." && next !== "@") continue;
    if (key.length > bestLen) { best = row; bestLen = key.length; }
  }
  return best;
}

/** ACU for one call. Returns null when the call cannot be priced. */
export function priceCall(call = {}, rates = DEFAULT_RATES) {
  const kind = String(call.kind || "llm");
  if (kind === "llm") {
    const model = String(call.model || "");
    const row = rateFor(model, rates);
    if (!row) return null; // an unpriced model is a refusal, not a zero
    const parts = [
      [call.inputTokens, row.input],
      [call.outputTokens, row.output],
      [call.cacheReadTokens, row.cacheRead === undefined ? row.input : row.cacheRead],
      [call.cacheWriteTokens, row.cacheWrite === undefined ? row.input : row.cacheWrite],
    ];
    let acu = 0;
    for (const [raw, rate] of parts) {
      const n = Number(raw || 0);
      if (!Number.isFinite(n) || n < 0) return null;
      acu += (n / 1000) * rate;
    }
    return round6(acu);
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
  const row = rateFor(model, rates);
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
        cacheReadTokens: Number(call.cacheReadTokens || 0),
        cacheWriteTokens: Number(call.cacheWriteTokens || 0),
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
        const row = out.get(key) || { key, acu: 0, calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
        row.acu = round6(row.acu + e.acu);
        row.calls += 1;
        row.inputTokens += e.inputTokens;
        row.outputTokens += e.outputTokens;
        row.cacheReadTokens += e.cacheReadTokens || 0;
        row.cacheWriteTokens += e.cacheWriteTokens || 0;
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

/**
 * The bridge between what a pass actually reports and what the meter needs.
 *
 * The pipeline's usage object is `{ input, output, cacheRead, cacheWrite }`
 * and the meter takes `inputTokens`, `outputTokens`, `cacheReadTokens`,
 * `cacheWriteTokens`. Two shapes for the same four numbers is exactly how a
 * field gets dropped silently on the way across, so the translation lives
 * here in one place and every call site uses it.
 */
export function callFromUsage(usage = {}, { model = null, agentId = null, runId = null, stage = null, at = null } = {}) {
  return {
    kind: "llm",
    model,
    agentId,
    runId,
    stage,
    at,
    inputTokens: Number(usage.input || 0),
    outputTokens: Number(usage.output || 0),
    cacheReadTokens: Number(usage.cacheRead || 0),
    cacheWriteTokens: Number(usage.cacheWrite || 0),
  };
}

/**
 * The budget for a run, from configuration. UNCAPPED BY DEFAULT, and that is
 * deliberate: every arbitrary limit on an agent was removed from this system
 * on purpose, and a cap that appears because a module was added would put one
 * back without anybody deciding to.
 *
 * So metering and capping are separate things here. Every call is priced and
 * recorded whatever happens. A cap applies only when somebody sets one —
 * ETABLIX_ACU_BUDGET for every run, or ETABLIX_ACU_BUDGET_<AGENT> for one.
 */
export function budgetFor(agentId) {
  const key = `ETABLIX_ACU_BUDGET_${String(agentId || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
  const specific = process.env[key];
  const general = process.env.ETABLIX_ACU_BUDGET;
  const raw = specific !== undefined && specific !== "" ? specific : general;
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * A run's whole spend, shaped for the desk. Everything the internal page
 * shows comes from here rather than being assembled in the route.
 */
export function summarise(mt, { agentId = null, cap = null } = {}) {
  const events = mt.events;
  const tokens = events.reduce(
    (t, e) => ({
      input: t.input + (e.inputTokens || 0),
      output: t.output + (e.outputTokens || 0),
      cacheRead: t.cacheRead + (e.cacheReadTokens || 0),
      cacheWrite: t.cacheWrite + (e.cacheWriteTokens || 0),
    }),
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  );
  const state = budgetState(mt.spent, cap);
  return {
    agentId,
    acu: mt.spent,
    cap,
    calls: events.length,
    tokens,
    // The number that explains a long run's bill: how much of the input was
    // served from cache rather than paid for at full rate.
    cachedShare: tokens.input + tokens.cacheRead > 0
      ? Math.round((tokens.cacheRead / (tokens.input + tokens.cacheRead)) * 1000) / 1000
      : null,
    byStage: mt.projection("stage"),
    byModel: mt.projection("model"),
    budget: cap === null
      ? { state: "uncapped", act: "proceed", say: "no budget is set for this agent, so nothing capped it. Metering is not capping, and this run was metered." }
      : { state: state.state, act: state.act, used: state.used, say: state.say },
    events,
  };
}
