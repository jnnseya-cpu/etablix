/**
 * ET-PORT · One supplier, several projects, and the slot they cannot both have.
 *
 * A modular manufacturer serving three ETABLIX projects has one factory. Two
 * projects with a delivery slot in the same week are not both going to get
 * it, and the project teams find out in the week — because each team can see
 * its own order and neither can see the other's.
 *
 * THE PORTFOLIO AGENT CAN SEE BOTH AND MUST NOT SHOW EITHER. The
 * specification is precise: flag the slot conflict using access-approved
 * capacity data, WITHOUT exposing competing commercial terms. So this returns
 * the conflict — supplier, window, which projects — and never a price, a
 * rate or a contract term. Protecting customer-specific rates across projects
 * is the condition on the whole function existing.
 *
 * AND CONCENTRATION IS THE OTHER HALF. Exposure to one supplier across a
 * portfolio is a number no project knows. A supplier carrying sixty per cent
 * of the temporary accommodation across four sites is a single point of
 * failure that every individual project reports as fine.
 */

const money = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const raw = String(v).replace(/[£$€,\s]/g, "");
  return /^-?\d+(\.\d{1,2})?$/.test(raw) ? Math.round(Number(raw) * 100) : null;
};
const pounds = (p) => (p === null ? null : Math.round(p) / 100);

export function check({ orders = [], concentrationLimitPct = 40 } = {}) {
  const rows = (Array.isArray(orders) ? orders : []).filter(Boolean);

  // Slot conflicts: one supplier, one window, more than one project.
  const bySlot = new Map();
  for (const o of rows) {
    const key = `${String(o.supplier ?? "(unknown)")}|${String(o.window ?? "(no window)")}`;
    if (!bySlot.has(key)) bySlot.set(key, []);
    bySlot.get(key).push(o);
  }
  const slotConflicts = [];
  for (const [key, group] of bySlot) {
    const projects = [...new Set(group.map((g) => String(g.project ?? "(unknown project)")))];
    if (projects.length > 1) {
      const [supplier, window] = key.split("|");
      slotConflicts.push({ supplier, window, projects,
        why: `${projects.length} projects hold a slot with ${supplier} in ${window}; each team can see its own order and neither can see the other's` });
    }
  }

  // Concentration by supplier across the portfolio.
  const total = rows.reduce((t, o) => t + (money(o.value) ?? 0), 0);
  const bySupplier = new Map();
  for (const o of rows) {
    const s = String(o.supplier ?? "(unknown)");
    bySupplier.set(s, (bySupplier.get(s) ?? 0) + (money(o.value) ?? 0));
  }
  const concentration = [...bySupplier.entries()]
    .map(([supplier, v]) => ({ supplier, value: pounds(v), pct: total > 0 ? Math.round((v / total) * 1000) / 10 : null }))
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const overConcentrated = concentration.filter((c) => c.pct !== null && c.pct > Number(concentrationLimitPct));

  const faults = slotConflicts.length + overConcentrated.length;
  return {
    ok: faults === 0,
    orders: rows.length,
    portfolioValue: pounds(total),
    slotConflicts,
    concentration,
    overConcentrated,
    // Stated on the result so a caller cannot later assume terms were withheld
    // by accident rather than on purpose.
    disclosure: "supplier, window and project only. No price, rate or contract term crosses a project boundary.",
    faults,
    say: faults === 0
      ? `${rows.length} order(s) across the portfolio, no slot conflict and no supplier above ${concentrationLimitPct}%`
      : `${slotConflicts.length} slot conflict(s) and ${overConcentrated.length} supplier(s) above ${concentrationLimitPct}% — `
        + "each of which every individual project reports as fine",
  };
}
