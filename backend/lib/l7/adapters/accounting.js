/**
 * Accounting adapters.
 *
 * APPEND ONLY, AND THAT IS NOT A STYLE CHOICE. A money record that can be
 * updated is a money record that cannot be relied on, and neither adapter
 * offers a way to change an entry — a correction is a new entry that refers
 * to the one it corrects, which is how every ledger has worked for six
 * hundred years and for the same reason.
 *
 * DECIDING AN AMOUNT IS NOT AN ACCOUNTING CONCERN. No valuation, no
 * certification, no retention arithmetic and no judgement about whether a sum
 * is due. Those live in the domain; this writes down what was decided.
 */

import { recordLedger, ledger } from "../../store.js";

function validate(entry) {
  const e = entry || {};
  if (!e.kind) return "an entry with no kind cannot be classified or totalled";
  if (!e.detail) return "an entry with no detail cannot be reconciled to anything";
  const n = Number(e.amount);
  if (!Number.isFinite(n) || n <= 0) return "an amount must be a positive number";
  return null;
}

/** The real one, over this system's append-only ledger. */
export const ledgerAccounting = {
  name: "ledger",
  async post(entry) {
    const fault = validate(entry);
    if (fault) return { ok: false, reason: fault };
    const e = entry;
    // The ledger now reports whether it wrote, so this reports it too. An
    // adapter that returns ok on a write that did not happen is worse than
    // one that fails: the caller stops looking.
    const written = recordLedger(String(e.kind), String(e.ref || ""), String(e.by || "unattributed"), `${e.amount} — ${e.detail}`);
    if (written && written.ok === false) return { ok: false, reason: written.reason };
    return { ok: true, id: `${e.kind}:${e.ref || ""}:${Date.now()}` };
  },
  async entries(filter) {
    const f = filter || {};
    return ledger({ kind: f.kind || null, since: Number(f.since) || 0, limit: Number(f.limit) || 500 })
      .map((r) => ({ kind: r.kind, ref: r.ref, actor: r.actor, detail: r.detail, at: r.at, amount: amountOf(r.detail) }));
  },
  async total(kind) {
    const rows = ledger({ kind: String(kind), limit: 5000 });
    return rows.reduce((s, r) => s + (amountOf(r.detail) || 0), 0);
  },
};

/** The amount out of a detail line, or null. Parsing, not arithmetic. */
function amountOf(detail) {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*—/.exec(String(detail || ""));
  return m ? Number(m[1]) : null;
}

/** The same contract in memory, so the comparison is between two real things. */
export function memoryAccounting() {
  const rows = [];
  let n = 0;
  return {
    name: "memory",
    async post(entry) {
      const fault = validate(entry);
      if (fault) return { ok: false, reason: fault };
      const e = entry;
      rows.push({ kind: String(e.kind), ref: String(e.ref || ""), actor: String(e.by || "unattributed"), detail: String(e.detail), amount: Number(e.amount), at: Date.now() });
      return { ok: true, id: `mem-${++n}` };
    },
    async entries(filter) {
      const f = filter || {};
      return rows
        .filter((r) => (!f.kind || r.kind === String(f.kind)))
        .filter((r) => (!f.since || r.at >= Number(f.since)))
        .slice(0, Number(f.limit) || 500)
        .map((r) => ({ ...r }));
    },
    async total(kind) {
      return rows.filter((r) => r.kind === String(kind)).reduce((s, r) => s + r.amount, 0);
    },
  };
}
