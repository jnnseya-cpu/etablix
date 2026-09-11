/**
 * Clock adapters.
 *
 * Time is an external dependency and pretending otherwise is why date logic
 * is hard to test. A core that calls Date.now() cannot be asked what it would
 * do on the day a time bar expires; a core that calls the clock port can.
 *
 * No domain logic here, and there is nothing a clock could usefully know
 * about a contract.
 */

/** The real one. */
export const systemClock = {
  name: "system",
  now() { return Date.now(); },
  today() { return new Date().toISOString().slice(0, 10); },
};

/** A clock that can be put anywhere and moved on purpose. */
export function fixedClock(at = Date.now()) {
  let t = typeof at === "string" ? Date.parse(at) : Number(at);
  if (!Number.isFinite(t)) t = Date.now();
  return {
    name: "fixed",
    now() { return t; },
    today() { return new Date(t).toISOString().slice(0, 10); },
    // Not part of the port. A test double may offer more than the contract;
    // the core may only use what the contract names.
    advance(ms) { t += Number(ms) || 0; return t; },
    set(when) { t = typeof when === "string" ? Date.parse(when) : Number(when); return t; },
  };
}
