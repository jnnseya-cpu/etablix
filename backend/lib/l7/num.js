/**
 * One strict numeric reader, shared, because JavaScript's own is dangerous
 * in exactly the place this system cares about.
 *
 *     Number(null)  === 0
 *     Number("")    === 0
 *     Number([])    === 0
 *     Number(false) === 0
 *
 * All four are finite. So a gate written as
 *
 *     const approved = Number(approvedPrice);
 *     if (!Number.isFinite(approved)) fail("no approved price");
 *
 * PASSES when there is no approved price at all, and then reconciles every
 * exported total against zero. That was a real defect in the submission gate
 * here: an empty submission cleared the price check because the absent price
 * had quietly become the number nought.
 *
 * `num()` returns null for anything that is not actually a number or a string
 * that reads as one. Null is then a refusal at every call site, which is what
 * an absent price should always have been.
 */

/** A number, or null. Nothing becomes zero by accident. */
export function num(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  // Reject the shapes Number() accepts and a person never means: "0x10",
  // "1e5" is fine, " " is already gone, "Infinity" is not a money value.
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** A count that must be present: null for anything unreadable or negative. */
export function count(value) {
  const n = num(value);
  if (n === null || n < 0 || !Number.isInteger(n)) return null;
  return n;
}
