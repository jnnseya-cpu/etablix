/**
 * An unknown tax treatment blocks publication rather than picking one.
 *
 * CIS and the VAT domestic reverse charge both turn on facts a platform often
 * does not have: whether the work is construction operations, whether plant
 * hire comes with an operator, whether the customer is an end user, whether
 * the supply is mixed. Each of those changes the answer, and the answer
 * changes who pays whom.
 *
 * THE TEMPTATION IS TO DEFAULT, AND THE DEFAULT IS ALWAYS WRONG SOMEWHERE.
 * Assume reverse charge and a supply to an end user is understated. Assume
 * standard VAT and a construction supply is overstated. Either way the
 * invoice goes out, the client pays it or does not, and the correction is a
 * credit note and a conversation about competence.
 *
 * So an undetermined treatment is UNKNOWN, it creates a review task, and it
 * blocks financial publication where the amount is material. Nothing is
 * computed from a guess.
 */

const money = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const raw = String(v).replace(/[£$€,\s]/g, "");
  return /^-?\d+(\.\d{1,2})?$/.test(raw) ? Math.round(Number(raw) * 100) : null;
};

/** What has to be known before either regime can be determined. */
export const CIS_FACTS = ["constructionOperations", "partiesRegistered", "paymentType"];
export const VAT_FACTS = ["constructionServices", "bothVatRegistered", "endUser", "cisApplies"];

const known = (v) => v === true || v === false;

/**
 * Determine CIS and VAT reverse-charge treatment, or refuse to.
 *
 * `materialityThreshold` is the figure above which an unknown blocks
 * publication. Below it the unknown is still recorded; it just does not stop
 * the report.
 */
export function determineTax({ facts = {}, amount = null, materialityThreshold = null, scope = null } = {}) {
  const f = facts || {};
  const value = money(amount);
  const threshold = money(materialityThreshold);

  const cisUnknown = CIS_FACTS.filter((k) => !known(f[k] === undefined ? undefined : Boolean(f[k])) && f[k] === undefined);
  const vatUnknown = VAT_FACTS.filter((k) => f[k] === undefined);

  // Mixed supply is the case that defeats a single answer.
  const mixed = f.mixedSupply === true;

  let cis = null;
  if (!cisUnknown.length) {
    cis = f.constructionOperations === true && f.partiesRegistered === true
      ? { treatment: "CIS_DEDUCTION", say: "within construction operations and both parties registered, so CIS deduction applies to the labour element" }
      : { treatment: "OUTSIDE_CIS", say: "outside construction operations or a party is not registered, so no CIS deduction" };
  }

  let vat = null;
  if (!vatUnknown.length) {
    vat = f.constructionServices === true && f.bothVatRegistered === true && f.endUser === false && f.cisApplies === true
      ? { treatment: "REVERSE_CHARGE", say: "construction services between VAT-registered parties, the customer is not an end user and CIS applies, so the domestic reverse charge applies" }
      : { treatment: "STANDARD_VAT", say: "one of the reverse-charge conditions is not met, so VAT is charged in the normal way" };
  }

  const unknowns = [
    ...cisUnknown.map((k) => ({ regime: "CIS", fact: k })),
    ...vatUnknown.map((k) => ({ regime: "VAT", fact: k })),
  ];
  const material = threshold === null ? unknowns.length > 0 : value !== null && value >= threshold && unknowns.length > 0;

  return {
    ok: unknowns.length === 0 && !mixed,
    cis, vat,
    unknowns,
    mixedSupply: mixed,
    blocksPublication: material || mixed,
    reviewTask: unknowns.length > 0 || mixed
      ? { kind: "TAX_REVIEW", scope: scope || null,
          needs: mixed ? ["a split of the mixed supply by element"] : unknowns.map((u) => `${u.regime}: ${u.fact}`) }
      : null,
    say: mixed
      ? "the supply is mixed, so a single treatment is wrong by construction — it is split by element or it is not determined"
      : unknowns.length
        ? `treatment UNKNOWN: ${unknowns.map((u) => `${u.regime} needs ${u.fact}`).join("; ")}. `
          + (material
              ? "Financial publication is blocked — a default is wrong somewhere, and the correction is a credit note and a conversation about competence"
              : "Below the materiality threshold, so recorded and not blocking")
        : `${cis.treatment} and ${vat.treatment}`,
  };
}

/** The notes an approver reads. */
export function taxNotes(result) {
  if (!result || result.ok) return [];
  const out = [`TAX TREATMENT NOT DETERMINED — ${result.say}`];
  if (result.reviewTask) {
    out.push(`A REVIEW IS RAISED, NOT A GUESS — it needs ${result.reviewTask.needs.join("; ")}. `
      + "Assume reverse charge and a supply to an end user is understated; assume standard VAT and a construction supply is overstated.");
  }
  return out;
}
