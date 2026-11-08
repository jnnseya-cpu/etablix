/**
 * Headroom, reserved transactionally, because two orders can both fit.
 *
 * Under Prime the company holds supplier liabilities, and the question before
 * every binding order is whether authorised headroom can absorb what is
 * already committed plus what is already reserved plus this. Checking
 * committed-only is the mistake: two orders arriving in the same minute each
 * see the same headroom, each fits, and together they do not. The
 * specification calls for reserving limits transactionally and that is the
 * only arrangement under which a concurrency answer is right.
 *
 * So a reservation is taken BEFORE the order is placed and released when it
 * is placed or abandoned. `reserve` is therefore a state change, not a
 * question, and the excess is blocked rather than queued — a queued order
 * against headroom nobody has is an order that binds when the queue drains.
 */

const money = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const raw = String(v).replace(/[£$€,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) return null;
  return Math.round(Number(raw) * 100);
};
const pounds = (p) => (p === null ? null : Math.round(p) / 100);

/** A ledger of reservations against an authorised limit. */
export function treasury({ authorised = null, committed = 0, reservations = [] } = {}) {
  const limit = money(authorised);
  const used = money(committed) ?? 0;
  const held = (Array.isArray(reservations) ? reservations : [])
    .filter(Boolean)
    .map((r) => ({ id: String(r.id ?? "(unidentified)"), amount: money(r.amount) ?? 0 }));
  const reserved = held.reduce((t, r) => t + r.amount, 0);
  return { limit, committed: used, reserved, held, available: limit === null ? null : limit - used - reserved };
}

/**
 * Take a reservation, or refuse it.
 *
 * Returns the new ledger alongside the verdict, so a caller cannot act on a
 * success without also taking the reservation that made it true.
 */
export function reserve(state, { id = null, amount = null, model = null } = {}) {
  const t = treasury(state || {});
  const want = money(amount);

  if (String(model ?? "").toUpperCase() !== "C" && String(model ?? "") !== "03") {
    // Only the model that holds liabilities needs headroom reserved.
    return { ok: true, reserved: false, ledger: t, say: `model ${model ?? "(unstated)"} does not create ETABLIX supplier liabilities, so no headroom is reserved` };
  }
  if (t.limit === null) {
    return { ok: false, reserved: false, reason: "NO_AUTHORISED_LIMIT", ledger: t,
             say: "no authorised headroom is recorded, and binding activity is blocked rather than assumed unlimited" };
  }
  if (want === null) {
    return { ok: false, reserved: false, reason: "UNREADABLE_AMOUNT", ledger: t,
             say: `"${String(amount ?? "(blank)")}" is not a money figure, so nothing can be reserved against it` };
  }
  if (t.held.some((r) => r.id === String(id))) {
    // Idempotent: the same reservation twice is one reservation.
    return { ok: true, reserved: false, duplicate: true, ledger: t,
             say: `${id} is already reserved; the same reservation twice is one reservation` };
  }
  if (want > t.available) {
    return {
      ok: false, reserved: false, reason: "INSUFFICIENT_HEADROOM", ledger: t,
      shortfall: pounds(want - t.available),
      say: `${pounds(want)} against ${pounds(t.available)} available — ${pounds(t.limit)} authorised, `
         + `${pounds(t.committed)} committed, ${pounds(t.reserved)} already reserved. Short by ${pounds(want - t.available)}`,
    };
  }

  const next = { authorised: pounds(t.limit), committed: pounds(t.committed),
                 reservations: [...t.held.map((r) => ({ id: r.id, amount: pounds(r.amount) })), { id: String(id), amount: pounds(want) }] };
  const after = treasury(next);
  return { ok: true, reserved: true, ledger: after, state: next,
           say: `${pounds(want)} reserved for ${id}; ${pounds(after.available)} remains` };
}

/** Several requests against one limit, applied in order — the concurrency case. */
export function reserveMany(state, requests = [], { model = "C" } = {}) {
  let current = state || {};
  const taken = [];
  const refused = [];
  for (const r of (Array.isArray(requests) ? requests : []).filter(Boolean)) {
    const out = reserve(current, { ...r, model });
    if (out.ok && out.reserved) { taken.push({ id: r.id, amount: r.amount }); current = out.state; }
    else if (!out.ok) refused.push({ id: r.id, amount: r.amount, reason: out.reason, why: out.say });
  }
  const t = treasury(current);
  return {
    ok: refused.length === 0,
    taken, refused, ledger: t, state: current,
    say: refused.length
      ? `${taken.length} reserved, ${refused.length} blocked — each request saw the headroom left by the one before it, `
        + "which is the only reading under which concurrent orders cannot both fit the same money"
      : `all ${taken.length} reserved; ${pounds(t.available)} remains`,
  };
}

/** The notes an approver reads. */
export function treasuryNotes(result) {
  if (!result || result.ok) return [];
  const out = [];
  for (const r of result.refused || [{ id: null, why: result.say, reason: result.reason }]) {
    out.push(`BINDING BLOCKED ON HEADROOM — ${r.why}. Under Prime the company holds the supplier liability, `
      + "so an order placed beyond authorised headroom is a commitment with no money behind it. Escalate for a funding review; "
      + "the excess is blocked rather than queued, because a queued order binds when the queue drains.");
  }
  return out;
}
