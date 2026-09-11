/**
 * Spend adapters.
 *
 * The ACU meter records what a run cost. Where a prepaid balance lives, and
 * whether there is one at all, is somebody else's problem — which is what a
 * port is for.
 *
 * The local adapter has no balance and says so rather than inventing one. An
 * uncapped account is the honest default here, matching the rest of the
 * system: metering is not capping, and a billing adapter that returned an
 * imaginary balance would be a cap nobody set.
 */

/** No external account: spend is recorded, nothing is held. */
export function localBilling(onCharge = null) {
  const charges = [];
  return {
    name: "local",
    async balance() { return { acu: null, uncapped: true }; },
    async charge(amount, detail) {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: "a charge must be a positive number" };
      if (!detail) return { ok: false, reason: "a charge with no detail cannot be reconciled to anything" };
      const entry = { at: Date.now(), amount: n, detail: String(detail) };
      charges.push(entry);
      if (onCharge) onCharge(entry);
      return { ok: true, amount: n };
    },
    ledger() { return charges.slice(); },
  };
}

/** A prepaid account, so the comparison exercises a real second behaviour. */
export function prepaidBilling(opening = 0) {
  let held = Number(opening) || 0;
  const charges = [];
  return {
    name: "prepaid",
    async balance() { return { acu: held, uncapped: false }; },
    async charge(amount, detail) {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: "a charge must be a positive number" };
      if (!detail) return { ok: false, reason: "a charge with no detail cannot be reconciled to anything" };
      if (n > held) return { ok: false, reason: `only ${held} remains` };
      held -= n;
      charges.push({ at: Date.now(), amount: n, detail: String(detail) });
      return { ok: true, amount: n, remaining: held };
    },
    ledger() { return charges.slice(); },
  };
}
