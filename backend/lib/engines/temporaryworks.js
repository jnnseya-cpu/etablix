/**
 * ET-TW · The temporary works register, and the check that is skipped.
 *
 * A temporary works design has a designer and a CHECKER, and the checker's
 * category is set by the risk of the thing being designed. The failure is
 * never that nobody designed it — it is that the design was checked by
 * somebody at the wrong category, or by the designer, or not before it was
 * loaded. All three produce a register that is full and a structure that is
 * unverified, and the register is what anybody looks at.
 *
 * SO FOUR THINGS ARE CHECKED AND EACH IS A REAL FAILURE. Independence of the
 * checker from the designer, because a design checked by its author is not
 * checked. Category against the design's own risk class, because a Cat 0
 * check on a Cat 3 excavation is a signature with nothing behind it. A
 * permit to load issued BEFORE the load, because afterwards it is a record
 * rather than a control. And a named temporary works coordinator, because the
 * register is somebody's duty and a register belonging to a department is
 * nobody's.
 */

const CATEGORIES = ["0", "1", "2", "3"];
const has = (v) => v !== undefined && v !== null && String(v).trim() !== "";
const cat = (v) => { const m = String(v ?? "").match(/([0-3])/); return m ? m[1] : null; };

export function check({ designs = [], coordinator = null, permits = [] } = {}) {
  const rows = (Array.isArray(designs) ? designs : []).filter(Boolean);
  const permitBy = new Map((Array.isArray(permits) ? permits : []).filter(Boolean).map((p) => [String(p.designId), p]));

  const unchecked = [];
  const notIndependent = [];
  const wrongCategory = [];
  const loadedWithoutPermit = [];
  const permitAfterLoad = [];

  for (const d of rows) {
    const id = String(d.id ?? "(unidentified design)");
    const required = cat(d.riskCategory);
    const checkedAt = cat(d.checkCategory);

    if (!has(d.checker)) { unchecked.push({ id, why: "no checker named" }); }
    else if (has(d.designer) && String(d.checker).trim().toLowerCase() === String(d.designer).trim().toLowerCase()) {
      notIndependent.push({ id, who: String(d.checker), why: "the checker is the designer, and a design checked by its author is not checked" });
    }
    if (required === null) wrongCategory.push({ id, why: "no risk category, so no check category can be required" });
    else if (checkedAt === null) wrongCategory.push({ id, why: `risk category ${required} and no check category recorded` });
    else if (Number(checkedAt) < Number(required)) {
      wrongCategory.push({ id, why: `checked at category ${checkedAt} against a risk category of ${required} — a signature with nothing behind it` });
    }

    const p = permitBy.get(id);
    if (d.loaded === true && !p) loadedWithoutPermit.push({ id, why: "loaded with no permit to load" });
    else if (d.loaded === true && p && has(p.issuedAt) && has(d.loadedAt) && String(p.issuedAt) > String(d.loadedAt)) {
      permitAfterLoad.push({ id, issuedAt: String(p.issuedAt), loadedAt: String(d.loadedAt),
        why: "the permit was issued after the load, which makes it a record rather than a control" });
    }
  }

  const unowned = has(coordinator) && !/^(tbc|tba|team|department|n\/a|-)$/i.test(String(coordinator).trim())
    ? [] : [{ why: "no named temporary works coordinator — a register belonging to a department is nobody's" }];

  const faults = unchecked.length + notIndependent.length + wrongCategory.length
    + loadedWithoutPermit.length + permitAfterLoad.length + unowned.length;

  return {
    ok: faults === 0,
    designs: rows.length,
    unchecked, notIndependent, wrongCategory, loadedWithoutPermit, permitAfterLoad, unowned,
    faults,
    say: faults === 0
      ? `all ${rows.length} temporary works design(s) independently checked at or above their risk category, permitted before loading, under a named coordinator`
      : `${faults} fault(s) across ${rows.length} temporary works design(s) — the register is full and the structures are not verified`,
  };
}
export { CATEGORIES as TW_CATEGORIES };
