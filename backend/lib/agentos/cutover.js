/**
 * A model change does not retrospectively move a liability.
 *
 * A client moves from Advisory to Management Integrator, or from Integrator
 * to Prime. The appointment changes on a date. What does NOT change is who
 * owes what under contracts already signed: a hire agreement entered in the
 * client's name on Tuesday is still the client's on Thursday, whatever the
 * appointment says on Wednesday, unless somebody has executed an assignment
 * or a novation and there is evidence of it.
 *
 * THE FAILURE IS ACCOUNTING, NOT LEGAL, AND THAT IS WHY IT HAPPENS. The new
 * model's rules are applied to the whole ledger because the ledger has one
 * model field. Overnight, open orders and running hire change owner in the
 * system and nowhere else, and the first anybody knows is a supplier invoice
 * addressed to the party that did not order.
 *
 * So historical commitments keep their original owner, mixed ownership
 * without a verified assignment is BLOCKED rather than resolved, and the
 * cutover manifest has to name every category the specification lists:
 * contracts, open orders, invoices, retentions, warranties, notice timers and
 * legal entities. A manifest missing one of those is not a manifest; it is
 * the list somebody got to the end of.
 */

import { instant } from "../l7/evidence.js";

/** Every category a cutover manifest must account for. */
export const MANIFEST_CATEGORIES = [
  "contracts", "openOrders", "invoices", "retentions", "warranties", "noticeTimers", "legalEntities",
];

const has = (v) => v !== undefined && v !== null && v !== "";
const yes = (v) => v === true || /^(y|yes|true|executed|verified)$/i.test(String(v ?? ""));

/**
 * Check a model transition.
 *
 * `commitments` is [{ id, kind, owner, enteredAt, assignment }]. A commitment
 * entered before the effective date keeps `owner` unless an assignment is
 * evidenced.
 */
export function checkCutover({
  fromModel = null, toModel = null, effectiveFrom = null, signed = null,
  manifest = {}, commitments = [],
} = {}) {
  const faults = [];
  if (!fromModel || !toModel) faults.push("the transition does not name both models");
  if (fromModel && toModel && String(fromModel) === String(toModel)) faults.push("the transition names the same model on both sides");
  if (!has(effectiveFrom) || instant(effectiveFrom) === null) faults.push("the transition has no readable effective date");
  if (!yes(signed)) faults.push("the transition is not signed, and an unsigned transition moves nothing");

  const missingCategories = MANIFEST_CATEGORIES.filter((k) => !has(manifest[k]));
  if (missingCategories.length) {
    faults.push(`the cutover manifest does not account for ${missingCategories.join(", ")}`);
  }

  const at = instant(effectiveFrom);
  const rows = (Array.isArray(commitments) ? commitments : []).filter(Boolean);
  const retained = [];
  const transferred = [];
  const mixed = [];

  for (const c of rows) {
    const id = String(c.id ?? "(unidentified commitment)");
    const entered = instant(c.enteredAt);
    const historical = at !== null && entered !== null && entered < at;
    if (!historical) { transferred.push({ id, kind: c.kind || null, owner: c.owner || null }); continue; }

    if (yes(c.assignment)) {
      transferred.push({ id, kind: c.kind || null, owner: c.owner || null, by: "verified assignment" });
      continue;
    }
    // Historical and unassigned: the original owner keeps it.
    retained.push({ id, kind: c.kind || null, owner: c.owner || null, enteredAt: c.enteredAt || null });
    // And if anything claims the new model owns it, that is mixed ownership.
    if (c.claimedOwner && String(c.claimedOwner) !== String(c.owner)) {
      mixed.push({ id, owner: c.owner || null, claimedOwner: String(c.claimedOwner) });
    }
  }

  const blocked = mixed.length > 0;

  return {
    ok: faults.length === 0 && !blocked,
    fromModel, toModel, effectiveFrom,
    faults,
    missingCategories,
    retained,
    transferred,
    mixed,
    blocked,
    say: blocked
      ? `BLOCKED: mixed ownership with no verified assignment on ${mixed.map((m) => m.id).join(", ")} — `
        + "the commitment is recorded against one party and claimed by another, and a system that resolves that itself produces an invoice addressed to the party that did not order"
      : faults.length
        ? `the transition is not effective: ${faults.join("; ")}`
        : `${fromModel} to ${toModel} from ${effectiveFrom}: ${retained.length} historical commitment(s) keep their original owner, ${transferred.length} transfer`,
  };
}

/** The notes an approver reads. */
export function cutoverNotes(result) {
  if (!result) return [];
  const out = [];
  if (result.blocked) {
    out.push(`MODEL CUTOVER BLOCKED ON MIXED OWNERSHIP — ${result.mixed.map((m) => `${m.id} is ${m.owner}'s and is claimed for ${m.claimedOwner}`).join("; ")}. `
      + "No verified assignment or novation exists. This is the failure that is accounting rather than legal: the ledger has one model field, "
      + "the new model's rules get applied to the whole of it, and the first anybody knows is a supplier invoice addressed to the party that did not order.");
  }
  if (result.retained?.length) {
    out.push(`HISTORICAL COMMITMENTS KEEP THEIR OWNER — ${result.retained.map((r) => `${r.id} (${r.owner}, entered ${r.enteredAt})`).join("; ")}. `
      + "The appointment changed on a date; what was signed before it did not.");
  }
  if (result.missingCategories?.length) {
    out.push(`THE CUTOVER MANIFEST IS INCOMPLETE — no ${result.missingCategories.join(", no ")}. `
      + "A manifest missing a category is not a manifest, it is the list somebody got to the end of.");
  }
  return out;
}
