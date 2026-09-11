/**
 * What the agents have actually cost — read from the runs, not estimated.
 *
 * Until the meter was wired in, this system could tell you how many tokens a
 * run used and nothing else. Tokens are not a cost: a hundred thousand of
 * them on the small route and a hundred thousand on the frontier route are
 * two different invoices, and neither number answers the question a business
 * actually asks, which is "what did it cost us to price that tender?"
 *
 * That question is asked by three different people for three different
 * reasons, and this module answers all three from the same rows:
 *
 *   · THE PERSON DECIDING WHETHER TO BID. A pursuit costs estimator hours
 *     and it now costs agent compute, and both belong in the bid-investment
 *     factor of the bid/no-bid score. A figure that arrives with the invoice
 *     is a figure that never reaches that decision.
 *
 *   · THE PERSON PRICING THE SERVICE. A diagnostic sold as a fixed-price
 *     engagement has a cost of delivery, and the part of it that is compute
 *     was previously a guess. Per engagement, per agent, it is now a number.
 *
 *   · THE PERSON QUERYING AN INVOICE. "Which runs, on which days, on which
 *     model" is a question somebody eventually asks, and answering it from
 *     the provider's own billing page cannot be reconciled to the work.
 *
 * WHAT IT WILL NOT DO IS INVENT A POUND FIGURE. An ACU is an internal unit
 * anchored on a thousand output tokens on the frontier route. Turning it into
 * money means holding a price list that changes without notice, and a stale
 * conversion produces a confident number that is wrong — which is worse for
 * a commercial decision than an honest unit nobody can misread.
 *
 * AND A RUN THAT WAS NEVER METERED IS COUNTED AS UNMETERED, NEVER AS FREE.
 * Every run that finished before the meter existed, and every run whose model
 * had no rate, appears in its own count. A total that quietly excludes them
 * understates the bill and nobody can see by how much.
 */

import { collection } from "../store.js";
import { DEFAULT_RATES } from "./acu.js";
import { num } from "./num.js";

/** A day key, so spend can be read as a trend rather than a total. */
function dayOf(ms) {
  const t = num(ms);
  if (t === null) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function round(n) { return Math.round(n * 1e6) / 1e6; }

/**
 * Every run, with what it cost. Runs are read from the store as they are,
 * so a run that never carried a cost is visible as one rather than absent.
 */
export function runs({ days = 90, agentId = null } = {}) {
  const since = Date.now() - Math.max(1, days) * 86400000;
  const rows = collection("agentTasks")
    .filter((r) => {
      const at = num(r.finishedAt) ?? num(r.createdAt);
      if (at === null || at < since) return false;
      if (agentId && String(r.agent) !== String(agentId)) return false;
      return true;
    })
    .map((r) => {
      const acu = r.acu && num(r.acu.acu) !== null ? num(r.acu.acu) : null;
      const usage = r.usage || {};
      return {
        id: r.id,
        agent: r.agent,
        agentName: r.agentName,
        title: r.title,
        status: r.status,
        at: num(r.finishedAt) ?? num(r.createdAt),
        day: dayOf(num(r.finishedAt) ?? num(r.createdAt)),
        model: r.model || (r.acu && r.acu.byModel && r.acu.byModel[0] ? r.acu.byModel[0].key : null),
        acu,
        // The three reasons a run has no cost, kept apart because they need
        // different work: nobody metered it, nobody priced the model, or it
        // never called a model at all.
        unmetered: acu === null,
        unpriced: Boolean(r.acu && Array.isArray(r.acu.unpriced) && r.acu.unpriced.length),
        calls: r.acu && num(r.acu.calls) !== null ? num(r.acu.calls) : null,
        tokens: {
          input: num(usage.input) ?? 0,
          output: num(usage.output) ?? 0,
          cacheRead: num(usage.cacheRead) ?? 0,
          cacheWrite: num(usage.cacheWrite) ?? 0,
        },
        cachedShare: r.acu && num(r.acu.cachedShare) !== null ? num(r.acu.cachedShare) : null,
        byStage: (r.acu && r.acu.byStage) || [],
        byModel: (r.acu && r.acu.byModel) || [],
        budget: (r.acu && r.acu.budget) || null,
      };
    })
    .sort((a, b) => (b.at || 0) - (a.at || 0));
  return rows;
}

/** Spend grouped by whichever axis the desk is looking at. */
function group(rows, key) {
  const out = new Map();
  for (const r of rows) {
    const k = r[key] == null ? "(unattributed)" : String(r[key]);
    const row = out.get(k) || { key: k, runs: 0, acu: 0, metered: 0, unmetered: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
    row.runs += 1;
    if (r.acu === null) row.unmetered += 1;
    else { row.metered += 1; row.acu = round(row.acu + r.acu); }
    row.inputTokens += r.tokens.input;
    row.outputTokens += r.tokens.output;
    row.cacheReadTokens += r.tokens.cacheRead;
    out.set(k, row);
  }
  return [...out.values()].sort((a, b) => b.acu - a.acu);
}

/** Spend per pass, added across every metered run in the window. */
function stages(rows) {
  const out = new Map();
  for (const r of rows) {
    for (const s of r.byStage) {
      const k = String(s.key || "(unnamed)");
      const row = out.get(k) || { key: k, acu: 0, calls: 0 };
      row.acu = round(row.acu + (num(s.acu) ?? 0));
      row.calls += num(s.calls) ?? 0;
      out.set(k, row);
    }
  }
  return [...out.values()].sort((a, b) => b.acu - a.acu);
}

/**
 * The whole picture, for one internal page. Every number here comes from a
 * run that actually happened.
 */
export function summary({ days = 90, agentId = null } = {}) {
  const rows = runs({ days, agentId });
  const metered = rows.filter((r) => r.acu !== null);
  const total = round(metered.reduce((s, r) => s + r.acu, 0));
  const byDay = group(rows, "day").sort((a, b) => (a.key < b.key ? -1 : 1));

  const tokens = rows.reduce(
    (t, r) => ({
      input: t.input + r.tokens.input,
      output: t.output + r.tokens.output,
      cacheRead: t.cacheRead + r.tokens.cacheRead,
      cacheWrite: t.cacheWrite + r.tokens.cacheWrite,
    }),
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  );

  const unmetered = rows.filter((r) => r.acu === null);
  const unpriced = rows.filter((r) => r.unpriced);

  return {
    days,
    rates: { version: DEFAULT_RATES.version, anchor: DEFAULT_RATES.anchor, models: DEFAULT_RATES.models, kinds: DEFAULT_RATES.kinds },
    totals: {
      runs: rows.length,
      metered: metered.length,
      unmetered: unmetered.length,
      unpriced: unpriced.length,
      acu: total,
      // The figure that decides whether metering was worth wiring in: the
      // average cost of one run of one agent, which nothing could state
      // before and which belongs in the bid-investment factor.
      perRun: metered.length ? round(total / metered.length) : null,
      tokens,
      cachedShare: tokens.input + tokens.cacheRead > 0
        ? Math.round((tokens.cacheRead / (tokens.input + tokens.cacheRead)) * 1000) / 1000
        : null,
    },
    byAgent: group(rows, "agent"),
    byModel: group(rows, "model"),
    byStage: stages(rows),
    byDay,
    dearest: metered.slice().sort((a, b) => b.acu - a.acu).slice(0, 10),
    recent: rows.slice(0, 25),
    // Said plainly rather than left to be inferred from a zero.
    say: rows.length === 0
      ? `No agent has run in the last ${days} days, so there is nothing to price.`
      : unmetered.length === rows.length
        ? `${rows.length} run(s), none of them metered — every one finished before the meter was wired in, and their cost is not known rather than nil.`
        : `${total} ACU across ${metered.length} metered run(s)${unmetered.length ? `, with ${unmetered.length} run(s) that predate the meter and are counted as unmetered rather than free` : ""}${unpriced.length ? `, and ${unpriced.length} run(s) using a model with no configured rate` : ""}.`,
    // Where the unit comes from, so nobody reads an ACU as a pound.
    unit: "An ACU is an internal unit anchored on a thousand output tokens on the frontier route. It is deliberately not converted to money: a stale price list produces a confident number that is wrong, which is worse for a commercial decision than an honest unit nobody can misread.",
  };
}

/** One run's cost in detail, for the run screen. */
export function forRun(runId) {
  const r = collection("agentTasks").find((x) => x.id === String(runId));
  if (!r) return null;
  if (!r.acu) {
    return {
      id: r.id,
      agent: r.agent,
      metered: false,
      say: "This run carries no cost record. It finished before the meter was wired in, so its cost is not known — which is not the same as nil.",
    };
  }
  return { id: r.id, agent: r.agent, metered: true, ...r.acu };
}
