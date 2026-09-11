/**
 * THE ASSET AGENT — the register the building is handed over with.
 *
 * An asset register is judged at handover by whether the facilities team can
 * use it, and the answer is usually no for one of three reasons: the tags do
 * not match the labels on the plant, the same asset is in it twice, or the
 * attributes a maintenance system needs are blank.
 *
 * All three are visible the day the register is created and invisible at
 * handover, because at handover it is 4,000 rows in a spreadsheet.
 *
 * WHAT IT REFUSES:
 *
 *   · A DUPLICATE TAG. Two assets with one tag means one maintenance history
 *     for two machines, and the first anybody knows is a service record that
 *     does not match the machine in front of them.
 *   · A TAG THAT DOES NOT MATCH THE CONVENTION. The tag is the join between
 *     the register, the label on the plant and the maintenance system. A tag
 *     that matches two of the three is worse than no tag.
 *   · AN ASSET IN NO SYSTEM AND NO LOCATION. It cannot be found, so it is
 *     not maintained, and it appears in the register as evidence that it is.
 *   · A CHILD WHOSE PARENT IS NOT IN THE REGISTER. The hierarchy is how a
 *     shutdown is planned; a dangling child is a machine nobody isolates.
 *   · A REQUIRED ATTRIBUTE LEFT BLANK for the asset's own type. Which
 *     attributes are required is a property of the type: a pump needs a duty,
 *     a fire damper needs a fire rating, and neither needs the other's.
 */

import { num } from "../l7/num.js";
import { day, asAtOr, moment } from "./moment.js";

/**
 * The attributes a maintainable asset carries, and the ones every type needs.
 * Type-specific requirements are supplied by the caller, because they come
 * from the employer's information requirements rather than from here.
 */
export const CORE_ATTRIBUTES = [
  { key: "tag", name: "Asset tag" },
  { key: "type", name: "Asset type" },
  { key: "system", name: "System" },
  { key: "location", name: "Location" },
  { key: "manufacturer", name: "Manufacturer" },
  { key: "model", name: "Model" },
  { key: "serial", name: "Serial number" },
  { key: "installedAt", name: "Installation date" },
  { key: "warrantyTo", name: "Warranty expiry" },
  { key: "expectedLifeYears", name: "Expected life" },
];
const CORE_KEYS = CORE_ATTRIBUTES.map((a) => a.key);

export function matchesTag(tag, template) {
  if (!template) return true;
  const escaped = String(template)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\{(system|type|level|number|zone)\\\}/g, "[A-Za-z0-9][A-Za-z0-9_.-]*");
  return new RegExp(`^${escaped}$`).test(String(tag));
}

/** One asset row. */
export function assetRow(raw = {}, { convention = null, requiredByType = {}, asAt = null } = {}) {
  const faults = [];
  const at = asAtOr(asAt);
  const tag = String(raw.tag || "").trim();
  if (!tag) faults.push("no asset tag. The tag is the join between the register, the label on the plant and the maintenance system.");
  else if (!matchesTag(tag, convention)) faults.push(`"${tag}" does not match the tagging convention "${convention}". A tag that matches two of the three places it appears is worse than no tag.`);

  const type = String(raw.type || "").trim();
  if (!type) faults.push("no asset type, so nothing can say which attributes it needs");

  if (!String(raw.system || "").trim() && !String(raw.location || "").trim()) {
    faults.push("in no system and no location. It cannot be found, so it is not maintained, and it appears in the register as evidence that it is.");
  }

  const missingCore = CORE_KEYS.filter((k) => {
    const v = raw[k];
    return v === undefined || v === null || String(v).trim() === "";
  });
  const extra = Array.isArray(requiredByType[type]) ? requiredByType[type].map(String) : [];
  const missingType = extra.filter((k) => {
    const v = raw[k];
    return v === undefined || v === null || String(v).trim() === "";
  });
  if (missingType.length) {
    faults.push(`a ${type} requires ${extra.join(", ")} and is missing ${missingType.join(", ")}`);
  }

  const installed = raw.installedAt ? moment(raw.installedAt) : null;
  if (raw.installedAt && installed === null) faults.push(`the installation date "${raw.installedAt}" is not a date`);
  const warranty = raw.warrantyTo ? moment(raw.warrantyTo) : null;
  if (raw.warrantyTo && warranty === null) faults.push(`the warranty expiry "${raw.warrantyTo}" is not a date`);
  if (installed !== null && warranty !== null && warranty < installed) faults.push("the warranty expires before the asset was installed");
  const life = num(raw.expectedLifeYears);
  if (raw.expectedLifeYears !== undefined && raw.expectedLifeYears !== null && String(raw.expectedLifeYears).trim() !== "" && (life === null || life <= 0)) {
    faults.push(`an expected life of "${raw.expectedLifeYears}"`);
  }

  return {
    ok: faults.length === 0,
    faults,
    missingCore,
    missingType,
    row: {
      tag: tag || null, type: type || null,
      system: String(raw.system || "").trim() || null,
      location: String(raw.location || "").trim() || null,
      parent: String(raw.parent || "").trim() || null,
      manufacturer: String(raw.manufacturer || "").trim() || null,
      model: String(raw.model || "").trim() || null,
      serial: String(raw.serial || "").trim() || null,
      installedAt: installed === null ? null : day(installed),
      warrantyTo: warranty === null ? null : day(warranty),
      expectedLifeYears: life,
      warrantyExpired: warranty !== null && warranty < at,
    },
  };
}

/** The register. */
export function register({ assets = [], convention = null, requiredByType = {}, asAt = null } = {}) {
  const at = asAtOr(asAt);
  const checked = assets.map((a) => ({ ...assetRow(a, { convention, requiredByType, asAt: at }), given: a }));
  const good = checked.filter((c) => c.ok).map((c) => c.row);
  const rejected = checked.filter((c) => !c.ok).map((c) => ({ tag: c.given?.tag || null, faults: c.faults }));

  // Duplicates, across everything given rather than only the admissible rows:
  // two rows with the same tag are a duplicate whether or not either is
  // otherwise complete.
  const counts = new Map();
  for (const c of checked) {
    const t = String(c.given?.tag || "").trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  const duplicates = [...counts.entries()].filter(([, n]) => n > 1)
    .map(([tag, n]) => ({ tag, count: n, why: `${n} rows carry the tag ${tag}. One maintenance history for two machines, and the first anybody knows is a service record that does not match the machine in front of them.` }));

  const tags = new Set(checked.map((c) => String(c.given?.tag || "").trim()).filter(Boolean));
  const orphans = checked
    .filter((c) => c.given?.parent && !tags.has(String(c.given.parent).trim()))
    .map((c) => ({ tag: String(c.given.tag || "(untagged)"), parent: String(c.given.parent), why: "the parent is not in the register. The hierarchy is how a shutdown is planned; a dangling child is a machine nobody isolates." }));

  const totalCells = checked.length * CORE_KEYS.length;
  const filled = checked.reduce((t, c) => t + (CORE_KEYS.length - c.missingCore.length), 0);
  const completeness = totalCells ? Math.round((filled / totalCells) * 100) : null;

  const expired = good.filter((a) => a.warrantyExpired);

  return {
    ok: rejected.length === 0 && duplicates.length === 0 && orphans.length === 0,
    asAt: day(at),
    assets: good,
    rejected, duplicates, orphans,
    completeness,
    expiredWarranties: expired.map((a) => a.tag),
    say: [
      rejected.length ? `${rejected.length} of ${assets.length} asset(s) are not admissible as written.` : null,
      duplicates.length ? `${duplicates.length} duplicated tag(s).` : null,
      orphans.length ? `${orphans.length} asset(s) name a parent that is not in the register.` : null,
      expired.length ? `${expired.length} asset(s) are already out of warranty.` : null,
      `${completeness}% of the ten core attributes are populated across ${assets.length} row(s). At handover this is 4,000 rows in a spreadsheet and none of this is visible; today it is.`,
    ].filter(Boolean).join(" "),
  };
}

export function state() { return { coreAttributes: CORE_ATTRIBUTES.length }; }
