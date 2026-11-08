/**
 * The twenty-one service codes, and the six categories they group into.
 *
 * `SERVICES` in constants.js is eight SALES names — what a client ticks on an
 * enquiry form. This is the DELIVERY taxonomy: what is actually procured,
 * installed, operated and removed, at the granularity a package is let at.
 * The two are different things and conflating them is how a platform ends up
 * unable to say which supplier owns the drainage.
 *
 * WHY STABLE CODES AND NOT NAMES. A package, a quote, a cost line, an
 * interface record and a removal obligation all have to point at the same
 * service for ten years, through renamings and reorganisations. A code
 * survives being renamed; a name does not. "03" is clearance and earthworks
 * whatever the category is called this year.
 *
 * MULTIPLE SUPPLIERS, ZONES, PHASES AND COST LINES MAY USE ONE CODE. The code
 * is not a package. A linear scheme with four compounds has four instances of
 * 05 temporary roads, let under two different suppliers, in three phases.
 *
 * EXISTING PACKAGE IDS MUST SURVIVE MIGRATION, which the specification is
 * explicit about. So `LEGACY_FAMILIES` keeps the seven operational families
 * as reporting tags and maps each to the codes it covers. A family that maps
 * to several codes is recorded as ambiguous rather than resolved by guess: a
 * migration that silently picks one of four codes produces a register that
 * reads correctly and allocates the wrong supplier.
 */

/** The six delivery categories, in lifecycle order. */
export const SERVICE_CATEGORIES = [
  { id: "design", name: "Design and temporary works", codes: ["01", "02"] },
  { id: "establish", name: "Establish site", codes: ["03", "04", "05", "06", "07"] },
  { id: "utilities", name: "Utilities", codes: ["08", "09", "10", "11", "12"] },
  { id: "buildings", name: "Buildings and equipment", codes: ["13", "14"] },
  { id: "operate", name: "Operate", codes: ["15", "16", "17", "18", "19", "20"] },
  { id: "demobilise", name: "Demobilise", codes: ["21"] },
];

/**
 * The twenty-one codes. `interfaces` is the critical-interface list for the
 * category the code sits in — carried on the code because an interface with
 * no service on each end of it is not an interface, it is a note.
 */
export const SERVICE_CODES = [
  { code: "01", category: "design", name: "Site diagnostic, surveys and service design" },
  { code: "02", category: "design", name: "Temporary works design, checks and coordination" },
  { code: "03", category: "establish", name: "Clearance and earthworks" },
  { code: "04", category: "establish", name: "Foundations and hardstands" },
  { code: "05", category: "establish", name: "Temporary roads, walkways and parking" },
  { code: "06", category: "establish", name: "Drainage and runoff controls" },
  { code: "07", category: "establish", name: "Fencing, gates and traffic management" },
  { code: "08", category: "utilities", name: "Temporary electrical supply, generation and fuel" },
  { code: "09", category: "utilities", name: "Potable and process water" },
  { code: "10", category: "utilities", name: "Foul wastewater, storage, treatment and tankering" },
  { code: "11", category: "utilities", name: "Temporary MEP, lighting, alarms and controls" },
  { code: "12", category: "utilities", name: "Data, connectivity and communications" },
  { code: "13", category: "buildings", name: "Modular offices, welfare and workforce accommodation" },
  { code: "14", category: "buildings", name: "Plant, furniture, fixtures and equipment" },
  { code: "15", category: "operate", name: "Security and access services" },
  { code: "16", category: "operate", name: "Catering" },
  { code: "17", category: "operate", name: "Cleaning, FM, laundry and pest control" },
  { code: "18", category: "operate", name: "Waste and recycling" },
  { code: "19", category: "operate", name: "First aid and medical service coordination" },
  { code: "20", category: "operate", name: "Logistics and workforce transport" },
  { code: "21", category: "demobilise", name: "Disconnection, removal, off-hire and reinstatement" },
];

/** The critical interfaces each category must declare, from the specification. */
export const CATEGORY_INTERFACES = {
  design: ["Site datum", "constraints", "ground conditions", "design loads", "temporary works register", "competent release"],
  establish: ["Buried utilities", "ground-bearing limits", "flood and environmental conditions", "access windows", "client traffic plans"],
  utilities: ["Source availability", "demand", "dependency on distribution", "test authority", "resilience", "discharge and isolation"],
  buildings: ["Foundations", "lifts", "weather limits", "fire", "access", "occupancy and maintenance"],
  operate: ["Shift and occupancy curves", "service windows", "duty cover", "waste routes", "access", "privacy and incident response"],
  demobilise: ["Remaining live dependencies", "asset owner and hire terms", "condition baseline", "waste evidence", "landowner acceptance"],
};

/**
 * The seven legacy operational families, kept as reporting tags.
 *
 * A family covering one code migrates cleanly. A family covering several is
 * AMBIGUOUS and must be reviewed by a person, because picking one of four
 * codes produces a register that reads correctly and allocates the wrong
 * supplier to the wrong obligation.
 */
export const LEGACY_FAMILIES = [
  { id: "F1", name: "Site set-up and civils", codes: ["03", "04", "05", "06", "07"] },
  { id: "F2", name: "Utilities and services", codes: ["08", "09", "10", "11", "12"] },
  { id: "F3", name: "Accommodation and welfare", codes: ["13", "14"] },
  { id: "F4", name: "Site operations", codes: ["15", "16", "17", "18", "19"] },
  { id: "F5", name: "Logistics and transport", codes: ["20"] },
  { id: "F6", name: "Design and temporary works", codes: ["01", "02"] },
  { id: "F7", name: "Demobilisation and reinstatement", codes: ["21"] },
];

const BY_CODE = new Map(SERVICE_CODES.map((s) => [s.code, s]));
const BY_CATEGORY = new Map(SERVICE_CATEGORIES.map((c) => [c.id, c]));

/** A code, normalised: "3", "03" and "code 03" are one service. */
export function serviceCode(raw) {
  const m = String(raw ?? "").match(/(\d{1,2})/);
  if (!m) return null;
  const padded = String(Number(m[1])).padStart(2, "0");
  return BY_CODE.get(padded) || null;
}

/** The category a code belongs to, with its critical interfaces. */
export function categoryOf(raw) {
  const s = serviceCode(raw);
  if (!s) return null;
  const c = BY_CATEGORY.get(s.category);
  return c ? { ...c, interfaces: CATEGORY_INTERFACES[c.id] || [] } : null;
}

/**
 * Map a legacy family tag to canonical codes.
 *
 * Returns `ambiguous: true` where the family spans more than one code, with
 * every candidate listed. The caller must not resolve it: the specification
 * requires ambiguous classification to remain visibly unverified.
 */
export function fromLegacyFamily(id) {
  const f = LEGACY_FAMILIES.find((x) => x.id === String(id || "").toUpperCase());
  if (!f) {
    return { ok: false, family: String(id ?? ""), codes: [], ambiguous: false,
             say: `"${String(id ?? "")}" is not one of the seven legacy families, so nothing can be mapped from it` };
  }
  const ambiguous = f.codes.length > 1;
  return {
    ok: true,
    family: f.id,
    name: f.name,
    codes: f.codes,
    ambiguous,
    say: ambiguous
      ? `${f.id} (${f.name}) covers ${f.codes.length} codes — ${f.codes.join(", ")} — so a package carrying it cannot be assigned a code without a person reading the package`
      : `${f.id} (${f.name}) maps to code ${f.codes[0]} only`,
  };
}

/** Every code accounted for by exactly one category, or the taxonomy is wrong. */
export function taxonomyIntegrity() {
  const claimed = SERVICE_CATEGORIES.flatMap((c) => c.codes);
  const dupes = claimed.filter((c, i) => claimed.indexOf(c) !== i);
  const missing = SERVICE_CODES.map((s) => s.code).filter((c) => !claimed.includes(c));
  const orphan = claimed.filter((c) => !BY_CODE.has(c));
  const mismatched = SERVICE_CODES.filter((s) => {
    const cat = BY_CATEGORY.get(s.category);
    return !cat || !cat.codes.includes(s.code);
  }).map((s) => s.code);
  return {
    codes: SERVICE_CODES.length,
    categories: SERVICE_CATEGORIES.length,
    dupes, missing, orphan, mismatched,
    ok: dupes.length === 0 && missing.length === 0 && orphan.length === 0 && mismatched.length === 0,
  };
}
