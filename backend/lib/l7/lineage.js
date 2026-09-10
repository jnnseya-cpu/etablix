/**
 * Lineage — where every number came from, and what stops being true when
 * something upstream changes.
 *
 * A tender price is a single figure at the bottom of a page. Behind it are a
 * quantity somebody measured, a rate somebody quoted, a productivity somebody
 * assumed, a currency somebody converted, an adjustment somebody applied and
 * an approval somebody gave. In most bids that chain exists only in the head
 * of the estimator, and the question a client, an auditor or a claims
 * specialist asks two years later — "why is this number?" — has no answer
 * that can be produced.
 *
 * This module is the answer. Every value carries a node; every node names its
 * parents; the whole thing is a directed acyclic graph per bid, and the
 * explanation is a walk.
 *
 * TWO PROPERTIES THAT ARE NOT DECORATION.
 *
 *   · CONFIDENCE CANNOT RISE THROUGH A CALCULATION. A total computed from a
 *     rate the estimator was sixty per cent sure of is not ninety per cent
 *     certain because the arithmetic is exact. Derived confidence is capped
 *     at the least certain input. Systems that let confidence float upward
 *     produce a number nobody doubts that nobody should trust.
 *
 *   · INVALIDATION IS TARGETED, NEVER TOTAL. When an addendum lands, the
 *     wrong response is to re-run the bid — it is expensive, it discards
 *     work that is still correct, and in practice it means the re-run is
 *     skipped. The right response is to mark STALE exactly the nodes that
 *     descend from what changed, and nothing else. That is a graph walk, and
 *     it is the difference between an addendum being absorbed in an hour and
 *     an addendum being ignored.
 *
 * A CYCLE IS A REFUSAL. Two nodes that each claim the other as a parent
 * describe a number that defines itself. Every walk here detects it and
 * reports it rather than looping, because the failure mode of the naive
 * version is a hung request nobody can diagnose.
 */

import { instant } from "./evidence.js";

/** What a node in the chain represents. */
export const NODE_KINDS = ["SOURCE", "CALC", "ASSUMPTION", "ADJUSTMENT", "APPROVAL"];

/** Nodes that must name at least one parent — they derive from something. */
const DERIVED = new Set(["CALC", "ADJUSTMENT", "APPROVAL"]);

/** A node with every field present, whatever arrived. */
export function node(raw = {}) {
  return {
    nodeId: String(raw.nodeId || ""),
    kind: NODE_KINDS.includes(raw.kind) ? raw.kind : null,
    ref: String(raw.ref || "").trim(),
    label: String(raw.label || "").trim(),
    value: Number.isFinite(raw.value) ? raw.value : null,
    unit: raw.unit ? String(raw.unit).trim() : null,
    currency: raw.currency ? String(raw.currency).trim().toUpperCase() : null,
    fxRate: raw.fxRate
      ? {
          pair: String(raw.fxRate.pair || "").toUpperCase(),
          rate: Number.isFinite(raw.fxRate.rate) ? raw.fxRate.rate : null,
          date: raw.fxRate.date ? String(raw.fxRate.date) : null,
        }
      : null,
    quantityBasis: raw.quantityBasis ? String(raw.quantityBasis).trim() : null,
    productivity: raw.productivity
      ? {
          rate: Number.isFinite(raw.productivity.rate) ? raw.productivity.rate : null,
          unit: String(raw.productivity.unit || "").trim(),
          source: String(raw.productivity.source || "").trim(),
        }
      : null,
    validUntil: raw.validUntil ? String(raw.validUntil).trim() : null,
    confidence: Number.isFinite(raw.confidence)
      ? Math.min(1, Math.max(0, raw.confidence))
      : null,
    parents: Array.isArray(raw.parents) ? raw.parents.map(String).filter(Boolean) : [],
    stale: raw.stale === true,
    staleSince: raw.staleSince ? String(raw.staleSince) : null,
  };
}

/**
 * A graph built from a list of nodes. Builds the child index once so the
 * downstream walk is not quadratic on a big estimate.
 */
export function graph(nodes = []) {
  const byId = new Map();
  for (const raw of nodes) {
    const n = node(raw);
    if (n.nodeId) byId.set(n.nodeId, n);
  }
  const children = new Map();
  const dangling = [];
  for (const n of byId.values()) {
    for (const p of n.parents) {
      if (!byId.has(p)) {
        dangling.push({ nodeId: n.nodeId, missingParent: p });
        continue;
      }
      if (!children.has(p)) children.set(p, []);
      children.get(p).push(n.nodeId);
    }
  }
  return { byId, children, dangling };
}

/**
 * Every cycle in the graph, as the list of nodes involved. Empty is the only
 * acceptable answer; anything else is a refusal upstream of every other check.
 */
export function cycles(g) {
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map();
  const found = [];
  const seen = new Set();
  for (const id of g.byId.keys()) colour.set(id, WHITE);

  for (const start of g.byId.keys()) {
    if (colour.get(start) !== WHITE) continue;
    // Iterative so a deep estimate cannot blow the stack.
    const stack = [{ id: start, i: 0, path: [start] }];
    colour.set(start, GREY);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const parents = g.byId.get(frame.id).parents;
      if (frame.i >= parents.length) {
        colour.set(frame.id, BLACK);
        stack.pop();
        continue;
      }
      const p = parents[frame.i++];
      if (!g.byId.has(p)) continue;
      if (colour.get(p) === GREY) {
        const at = frame.path.indexOf(p);
        const ring = at >= 0 ? frame.path.slice(at) : [p, frame.id];
        const key = [...ring].sort().join(">");
        if (!seen.has(key)) { seen.add(key); found.push(ring); }
        continue;
      }
      if (colour.get(p) === WHITE) {
        colour.set(p, GREY);
        stack.push({ id: p, i: 0, path: [...frame.path, p] });
      }
    }
  }
  return found;
}

/**
 * "Why is this number?" — every ancestor of a node, nearest first, with the
 * path taken to reach it. This is what the internal screen renders.
 */
export function explain(g, nodeId) {
  const start = g.byId.get(String(nodeId));
  if (!start) return { ok: false, reason: "no such node", chain: [] };
  const ring = cycles(g);
  if (ring.length) return { ok: false, reason: "the graph contains a cycle", cycles: ring, chain: [] };

  const chain = [];
  const seen = new Set([start.nodeId]);
  let frontier = [{ n: start, depth: 0, path: [start.nodeId] }];
  while (frontier.length) {
    const next = [];
    for (const { n, depth, path } of frontier) {
      chain.push({ ...n, depth, path });
      for (const p of n.parents) {
        const parent = g.byId.get(p);
        if (!parent || seen.has(p)) continue;
        seen.add(p);
        next.push({ n: parent, depth: depth + 1, path: [...path, p] });
      }
    }
    frontier = next;
  }
  const sources = chain.filter((n) => n.kind === "SOURCE");
  const assumptions = chain.filter((n) => n.kind === "ASSUMPTION");
  const approvals = chain.filter((n) => n.kind === "APPROVAL");
  return {
    ok: true,
    chain,
    depth: chain.reduce((m, n) => Math.max(m, n.depth), 0),
    sources,
    assumptions,
    approvals,
    // A number resting on nothing but assumptions is the one to look at.
    groundless: sources.length === 0,
  };
}

/**
 * Targeted invalidation. Given the nodes that changed, the nodes that must be
 * re-done are exactly their descendants — no more, and never the whole bid.
 */
export function invalidate(g, changedIds = [], when = null) {
  const ring = cycles(g);
  if (ring.length) return { ok: false, reason: "the graph contains a cycle", cycles: ring, stale: [] };
  const stamp = when ? String(when) : new Date().toISOString();
  const stale = new Set();
  const queue = [];
  const unknown = [];
  for (const raw of changedIds) {
    const id = String(raw);
    if (!g.byId.has(id)) { unknown.push(id); continue; }
    queue.push(id);
  }
  while (queue.length) {
    const id = queue.shift();
    for (const child of g.children.get(id) || []) {
      if (stale.has(child)) continue;
      stale.add(child);
      queue.push(child);
    }
  }
  const marked = [...stale].map((id) => ({
    ...g.byId.get(id),
    stale: true,
    staleSince: stamp,
  }));
  return {
    ok: true,
    unknown,
    stale: marked,
    // The point of the whole exercise, stated so it can be shown on screen.
    untouched: g.byId.size - stale.size,
    total: g.byId.size,
  };
}

/**
 * Confidence that has been propagated rather than asserted. A derived node is
 * capped at the least certain thing it rests on. Returns the corrected nodes
 * and, separately, the ones whose stored confidence was overstated — that
 * list is the interesting one.
 */
export function propagateConfidence(g) {
  const ring = cycles(g);
  if (ring.length) return { ok: false, reason: "the graph contains a cycle", cycles: ring, nodes: [], overstated: [] };

  const resolved = new Map();
  const overstated = [];

  const resolve = (id, guard) => {
    if (resolved.has(id)) return resolved.get(id);
    const n = g.byId.get(id);
    if (!n) return null;
    if (guard.has(id)) return null;
    guard.add(id);
    const stated = n.confidence;
    let ceiling = null;
    for (const p of n.parents) {
      const pc = resolve(p, guard);
      if (pc === null) continue;
      ceiling = ceiling === null ? pc : Math.min(ceiling, pc);
    }
    let effective;
    if (ceiling === null) effective = stated;
    else if (stated === null) effective = ceiling;
    else effective = Math.min(stated, ceiling);
    if (stated !== null && effective !== null && effective < stated - 1e-9) {
      overstated.push({ nodeId: id, stated, effective, ref: n.ref, label: n.label });
    }
    resolved.set(id, effective);
    return effective;
  };

  const nodes = [];
  for (const id of g.byId.keys()) {
    const effective = resolve(id, new Set());
    nodes.push({ ...g.byId.get(id), effectiveConfidence: effective });
  }
  return { ok: true, nodes, overstated };
}

/** Structural faults that make a chain unusable, refused rather than warned. */
export function validate(nodes = []) {
  const g = graph(nodes);
  const faults = [];
  const ring = cycles(g);
  for (const r of ring) faults.push(`cycle: ${r.join(" → ")}`);
  for (const d of g.dangling) faults.push(`${d.nodeId} names a parent that does not exist: ${d.missingParent}`);
  for (const n of g.byId.values()) {
    if (!n.kind) faults.push(`${n.nodeId}: kind is not one of the five`);
    if (!n.ref) faults.push(`${n.nodeId}: no ref — nothing to click through to`);
    if (DERIVED.has(n.kind) && n.parents.length === 0) {
      faults.push(`${n.nodeId}: a ${n.kind} with no parents is not derived from anything`);
    }
    if (n.value !== null && n.currency === null && n.unit === null) {
      faults.push(`${n.nodeId}: a bare number with neither unit nor currency`);
    }
    if (n.validUntil && instant(n.validUntil) === null) {
      faults.push(`${n.nodeId}: validUntil "${n.validUntil}" is not a date`);
    }
    if (n.fxRate && (n.fxRate.rate === null || !n.fxRate.pair)) {
      faults.push(`${n.nodeId}: a conversion with no rate or no pair`);
    }
  }
  return { ok: faults.length === 0, faults, graph: g };
}

/**
 * Nodes whose own validity has run out by a given date — a rate quoted
 * against a three-month validity, an fx rate from a date base that has moved.
 * These are the roots of the next invalidation, found before anyone asks.
 */
export function expiredBy(g, when) {
  const at = instant(when);
  if (at === null) return { ok: false, reason: "the date is not readable", roots: [] };
  const roots = [];
  for (const n of g.byId.values()) {
    if (!n.validUntil) continue;
    const until = instant(n.validUntil);
    if (until === null || until <= at) {
      roots.push({ nodeId: n.nodeId, ref: n.ref, validUntil: n.validUntil, unreadable: until === null });
    }
  }
  return { ok: true, roots };
}

/** The chain as rows, for the auditor who asked for it as a file. */
export function toRows(g) {
  const rows = [["nodeId", "kind", "ref", "label", "value", "unit", "currency", "confidence", "validUntil", "stale", "parents"]];
  for (const n of g.byId.values()) {
    rows.push([
      n.nodeId, n.kind || "", n.ref, n.label,
      n.value === null ? "" : String(n.value),
      n.unit || "", n.currency || "",
      n.confidence === null ? "" : String(n.confidence),
      n.validUntil || "", n.stale ? "yes" : "no",
      n.parents.join(" "),
    ]);
  }
  return rows;
}
