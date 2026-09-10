/**
 * The estimating and commercial engine — arithmetic as a deterministic
 * service, because no language model may be the authority on a price.
 *
 * The specification puts this in one line of its routing table and it is the
 * most important line in the document:
 *
 *     Arithmetic → Deterministic service → No LLM arithmetic as authority.
 *
 * Everything here is that service. A model may propose a quantity, read a
 * rate off a quotation, or explain what a preliminaries item is for. It may
 * not be the thing that says what the total is.
 *
 * THE DOUBLE MARK-UP IS THE DEFECT THIS MODULE EXISTS FOR.
 *
 * An estimate is built in layers: an item, inside a package, inside a
 * section, inside the tender. Overhead and profit is added — and on a large
 * bid, added by different people at different layers, weeks apart. When a
 * package price already carries eight per cent and the tender summary adds
 * eight per cent to the package price, the bid is 16.64 per cent above cost
 * and reads as eight. Every total is internally consistent. Every
 * cross-check agrees. The bid loses on price and nobody can say why, or wins
 * and the margin appears from nowhere.
 *
 * It is invisible to review because there is nothing wrong with either
 * calculation. It is only wrong in combination, and only a machine that
 * walks the compounding chain sees the combination.
 *
 * THE OTHER SILENT ONE IS RISK RELEASE. Releasing risk allowance to close a
 * gap is a legitimate commercial act. Releasing it to absorb a base cost
 * somebody has already identified is concealment: the cost is known, it is
 * now hidden inside a number labelled "risk", and the tender is submitted
 * with a contingency that has already been spent. The rule here is that risk
 * may only be released against risk, never against a known base cost, and the
 * check refuses rather than warns.
 */

import { money } from "../controlcheck.js";
import { instant } from "./evidence.js";
import { num } from "./num.js";

/** The seven components of a rate, and what each must carry. */
export const RATE_COMPONENTS = [
  { id: "labour", name: "Labour", controls: ["trade", "grade", "baseRate", "burden", "overtime", "shift", "travel", "lodging", "productivity"] },
  { id: "plant", name: "Plant", controls: ["type", "capacity", "hireBasis", "mobilisation", "fuel", "operator", "utilisation", "standby"] },
  { id: "material", name: "Material", controls: ["specification", "quantity", "waste", "supplier", "delivery", "currency", "duty", "escalation"] },
  { id: "subcontract", name: "Subcontract", controls: ["scopeCoverage", "quotationVersion", "exclusions", "qualifications", "paymentTerms"] },
  { id: "preliminaries", name: "Preliminaries", controls: ["timeRelated", "fixed", "activityRelated", "demobilisation"] },
  { id: "risk", name: "Risk", controls: ["event", "probability", "impact", "owner", "treatment"] },
  { id: "markup", name: "Mark-up", controls: ["sequence", "compounding", "inclusionBase", "authority"] },
];

const COMPONENT_BY_ID = new Map(RATE_COMPONENTS.map((c) => [c.id, c]));

/** Every value in an estimate carries these four or it is not a value. */
export const VALUE_CONTROLS = ["currency", "unit", "priceBaseDate", "taxTreatment"];

/** Units the engine understands, grouped by dimension. */
export const DIMENSIONS = {
  length: ["m", "lm", "km", "mm"],
  area: ["m2", "sqm", "m²", "ha"],
  volume: ["m3", "cum", "m³", "l"],
  mass: ["kg", "t", "tonne"],
  time: ["hr", "h", "day", "wk", "week", "month", "mo"],
  count: ["nr", "no", "each", "ea", "item", "sum"],
};

const UNIT_DIMENSION = (() => {
  const m = new Map();
  for (const [dim, units] of Object.entries(DIMENSIONS)) for (const u of units) m.set(u.toLowerCase(), dim);
  return m;
})();

/** The dimension of a unit, or null when it is not one we know. */
export function dimensionOf(unit) {
  return UNIT_DIMENSION.get(String(unit || "").trim().toLowerCase()) || null;
}

/**
 * Apply a sequence of mark-ups to a base, recording each step so the result
 * can be explained and, more to the point, audited for double application.
 *
 * `on` is either "cost" (this mark-up is computed on the original base) or
 * "running" (computed on the base plus everything added before it). The
 * difference between the two on a five-step sequence is real money, and an
 * estimate that does not state which it means has two different totals
 * depending on who opens it.
 */
export function applyMarkups(base, markups = []) {
  const start = num(base);
  if (start === null) return { ok: false, reason: "the base is not a number", total: null, steps: [] };
  let running = start;
  const steps = [];
  const categories = [];
  for (const raw of markups) {
    const m = raw || {};
    const category = String(m.category || "").trim().toLowerCase();
    const percent = Number(m.percent);
    const on = m.on === "cost" ? "cost" : "running";
    if (!category) return { ok: false, reason: "a mark-up with no category", total: null, steps };
    if (!Number.isFinite(percent)) return { ok: false, reason: `mark-up "${category}" has no readable percentage`, total: null, steps };
    if (!m.authority) return { ok: false, reason: `mark-up "${category}" names nobody who authorised it`, total: null, steps };
    const on_ = on === "cost" ? start : running;
    const amount = round2(on_ * (percent / 100));
    running = round2(running + amount);
    steps.push({ category, percent, on, appliedTo: on_, amount, runningTotal: running, authority: String(m.authority) });
    categories.push(category);
  }
  const seen = new Set();
  const repeated = [];
  for (const c of categories) {
    if (seen.has(c)) repeated.push(c);
    seen.add(c);
  }
  return {
    ok: repeated.length === 0,
    reason: repeated.length ? `${[...new Set(repeated)].join(", ")} applied more than once in the same sequence` : null,
    total: round2(running),
    added: round2(running - start),
    steps,
    categories: [...seen],
    repeated: [...new Set(repeated)],
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

/**
 * The layered check. A mark-up category applied to an item AND applied again
 * at any layer above it whose base already contains that item is a double
 * application, and this is the only place it is visible.
 *
 * `items` are the leaves; `layers` are the rollups, each naming the item or
 * layer ids that make up its base.
 */
export function detectDoubleMarkup({ items = [], layers = [] } = {}) {
  const categoriesOf = new Map();
  for (const it of items) {
    const applied = applyMarkups(0, it.markups || []);
    categoriesOf.set(String(it.id), new Set(applied.categories));
  }
  const layerById = new Map(layers.map((l) => [String(l.id), l]));

  // Everything a layer ultimately contains, resolved through nested layers.
  const contents = new Map();
  const resolve = (id, guard = new Set()) => {
    if (contents.has(id)) return contents.get(id);
    if (guard.has(id)) return new Set(); // a cycle contains nothing rather than looping
    guard.add(id);
    const layer = layerById.get(id);
    const out = new Set();
    for (const child of (layer && layer.base) || []) {
      const c = String(child);
      if (categoriesOf.has(c)) out.add(c);
      else if (layerById.has(c)) for (const x of resolve(c, guard)) out.add(x);
    }
    contents.set(id, out);
    return out;
  };

  const findings = [];
  for (const layer of layers) {
    const id = String(layer.id);
    const applied = applyMarkups(0, layer.markups || []);
    if (applied.repeated.length) {
      findings.push({ where: id, kind: "repeated_in_sequence", categories: applied.repeated,
        say: `${id} applies ${applied.repeated.join(", ")} twice within its own sequence` });
    }
    const leaves = resolve(id);
    for (const category of applied.categories) {
      const carriers = [...leaves].filter((leaf) => (categoriesOf.get(leaf) || new Set()).has(category));
      if (carriers.length) {
        findings.push({
          where: id,
          kind: "compounded_across_layers",
          category,
          items: carriers,
          say: `${id} adds ${category} to a base that already carries ${category} on ${carriers.length} item(s): ${carriers.slice(0, 5).join(", ")}`,
        });
      }
    }
  }
  return {
    ok: findings.length === 0,
    findings,
    say: findings.length === 0
      ? "no mark-up is applied twice"
      : `${findings.length} double mark-up(s) — every total below is internally consistent and the bid is above cost by more than it says`,
  };
}

/**
 * Risk release. Releasing allowance against a risk that has not occurred is
 * commercial judgement. Releasing it against a base cost somebody has already
 * identified is concealment, and it is refused.
 */
export function checkRiskRelease(releases = []) {
  const faults = [];
  for (const raw of releases) {
    const r = raw || {};
    const id = String(r.id || "(unidentified)");
    if (!r.against) { faults.push({ id, say: "released against nothing named" }); continue; }
    if (r.againstKind === "known_base_cost") {
      faults.push({ id, say: `RELEASED AGAINST A KNOWN BASE COST (${r.against}) — this hides an identified cost inside the contingency` });
      continue;
    }
    if (r.againstKind !== "risk_event") { faults.push({ id, say: `released against "${r.againstKind || "an unstated kind"}", which is neither a risk event nor an approved treatment` }); continue; }
    if (!r.authority) { faults.push({ id, say: "released by nobody" }); continue; }
    if (!r.reason) faults.push({ id, say: "released with no reason recorded" });
  }
  return { ok: faults.length === 0, faults, say: faults.length ? faults[0].say : "every release is against a risk event and authorised" };
}

/** A manual override is only permitted with the full record. */
export function checkOverride(o = {}) {
  const need = ["reason", "role", "oldValue", "newValue", "at"];
  const missing = need.filter((k) => o[k] === undefined || o[k] === null || o[k] === "");
  if (missing.length) return { ok: false, missing, say: `an override missing ${missing.join(", ")} is not an override, it is an edit` };
  if (instant(o.at) === null) return { ok: false, missing: ["at"], say: `the override timestamp "${o.at}" is not a date` };
  return { ok: true, missing: [], say: `${o.role} changed ${o.oldValue} to ${o.newValue}: ${o.reason}` };
}

/** Every value control present, or the value is not usable. */
export function checkValueControls(v = {}) {
  const missing = VALUE_CONTROLS.filter((k) => v[k] === undefined || v[k] === null || v[k] === "");
  return {
    ok: missing.length === 0,
    missing,
    say: missing.length ? `a value with no ${missing.join(", no ")}` : "currency, unit, price base date and tax treatment all stated",
  };
}

/**
 * The nine estimate assurance tests, each returning the rows that fail rather
 * than a verdict on the whole estimate.
 */
export function assure({
  scopeItems = [],
  estimateItems = [],
  quotes = [],
  approvedExclusions = [],
  programme = null,
  submissionPrice = null,
  approvedPrice = null,
  roundingRule = null,
  cashProfile = null,
  fundingLimit = null,
  asAt = null,
  tolerance = 0.01,
} = {}) {
  const tests = [];
  const byScope = new Map();
  for (const e of estimateItems) {
    const key = String(e.scopeItemId || "");
    if (!byScope.has(key)) byScope.set(key, []);
    byScope.get(key).push(e);
  }
  const excluded = new Set(approvedExclusions.map(String));

  // 1. Quantity coverage — a scope item with no estimate item and no approved exclusion.
  {
    const uncovered = scopeItems
      .map((s) => String(s.id))
      .filter((id) => !byScope.has(id) && !excluded.has(id));
    tests.push(test("quantity_coverage", uncovered.length === 0, uncovered,
      "a scope item has no estimate item and no approved exclusion — it is in the works and not in the price"));
  }

  // 2. Rate freshness — a rate or quote past its validity.
  {
    const stale = [];
    const at = instant(asAt);
    for (const q of quotes) {
      const until = instant(q.validUntil);
      if (until === null) { stale.push({ id: String(q.id), why: `validity "${q.validUntil || "(none)"}" is not a date` }); continue; }
      if (at !== null && until <= at) stale.push({ id: String(q.id), why: `expired ${q.validUntil}` });
    }
    tests.push(test("rate_freshness", stale.length === 0, stale,
      "a rate or quotation is past its validity; the price rests on an offer nobody is bound by"));
  }

  // 3. Arithmetic — a stored total that differs from the calculation.
  {
    const wrong = [];
    for (const e of estimateItems) {
      const qty = money(e.quantity) ?? num(e.quantity);
      const rate = money(e.rate) ?? num(e.rate);
      const stored = money(e.total) ?? num(e.total);
      if (qty === null || rate === null || stored === null) {
        wrong.push({ id: String(e.id), why: "quantity, rate or total is not a readable number" });
        continue;
      }
      const computed = round2(qty * rate);
      if (Math.abs(computed - stored) > tolerance) {
        wrong.push({ id: String(e.id), why: `${qty} × ${rate} = ${computed}, stored as ${stored}` });
      }
    }
    tests.push(test("arithmetic", wrong.length === 0, wrong,
      "a stored total does not equal its own calculation"));
  }

  // 4. Unit consistency — a quantity measured in one dimension priced in another.
  {
    const wrong = [];
    for (const e of estimateItems) {
      const qUnit = dimensionOf(e.unit);
      const rUnit = dimensionOf(e.rateUnit || e.unit);
      if (qUnit === null) { wrong.push({ id: String(e.id), why: `"${e.unit}" is not a unit the engine knows` }); continue; }
      if (rUnit === null) { wrong.push({ id: String(e.id), why: `rate unit "${e.rateUnit}" is not a unit the engine knows` }); continue; }
      if (qUnit !== rUnit) wrong.push({ id: String(e.id), why: `${e.unit} (${qUnit}) priced per ${e.rateUnit} (${rUnit})` });
    }
    tests.push(test("unit_consistency", wrong.length === 0, wrong,
      "a quantity is priced in a different dimension from the one it was measured in — a factor error that reads correctly"));
  }

  // 5. Programme consistency — time-related cost against the approved duration.
  {
    const wrong = [];
    if (programme && Number.isFinite(programme.weeks)) {
      for (const e of estimateItems) {
        if (!e.timeRelated) continue;
        const weeks = num(e.durationWeeks);
        if (weeks === null) { wrong.push({ id: String(e.id), why: "a time-related item with no duration" }); continue; }
        if (Math.abs(weeks - programme.weeks) > (programme.toleranceWeeks || 0)) {
          wrong.push({ id: String(e.id), why: `priced over ${weeks} weeks against an approved programme of ${programme.weeks}` });
        }
      }
    } else {
      wrong.push({ id: "(programme)", why: "no approved programme duration to check against" });
    }
    tests.push(test("programme_consistency", wrong.length === 0, wrong,
      "time-related cost is priced over a different duration from the approved programme"));
  }

  // 6. Resource consistency — planned crew against the rate build-up.
  {
    const wrong = [];
    for (const e of estimateItems) {
      if (!e.crew) continue;
      const planned = num(e.crew.planned);
      const inRate = num(e.crew.inRate);
      if (planned === null || inRate === null) { wrong.push({ id: String(e.id), why: "a crew comparison with an unreadable number" }); continue; }
      if (inRate === 0) { wrong.push({ id: String(e.id), why: "the rate build-up carries no crew" }); continue; }
      const drift = Math.abs(planned - inRate) / inRate;
      if (drift > 0.2) wrong.push({ id: String(e.id), why: `the plan uses ${planned} and the rate was built on ${inRate}` });
    }
    tests.push(test("resource_consistency", wrong.length === 0, wrong,
      "the planned crew differs materially from the crew the rate was built on"));
  }

  // 7. Quote coverage — a supplier exclusion that leaves scope unpriced.
  {
    const priced = new Set();
    for (const e of estimateItems) if (e.scopeItemId) priced.add(String(e.scopeItemId));
    const gaps = [];
    for (const q of quotes) {
      for (const ex of q.exclusions || []) {
        const id = String(ex);
        // An exclusion matters when it names scope that nothing else prices.
        const coveredElsewhere = estimateItems.some((e) => String(e.scopeItemId) === id && String(e.quoteId || "") !== String(q.id));
        if (priced.has(id) && !coveredElsewhere) {
          gaps.push({ id, why: `${q.id} excludes ${id} and nothing else prices it` });
        } else if (!priced.has(id) && !excluded.has(id)) {
          gaps.push({ id, why: `${q.id} excludes ${id}, which is not priced and not an approved exclusion` });
        }
      }
    }
    tests.push(test("quote_coverage", gaps.length === 0, gaps,
      "a supplier exclusion leaves scope that nobody has priced"));
  }

  // 8. Price reconciliation — the submitted price against the approved price.
  {
    const sub = money(submissionPrice) ?? num(submissionPrice);
    const app = money(approvedPrice) ?? num(approvedPrice);
    if (sub === null || app === null) {
      tests.push(test("price_reconciliation", false, [{ id: "(price)", why: "the submitted or approved price is not a readable number" }],
        "the submitted price cannot be compared to the approved price"));
    } else {
      const diff = round2(sub - app);
      const allowed = roundingRule && num(roundingRule.to) !== null ? num(roundingRule.to) : 0;
      const okDiff = Math.abs(diff) <= allowed + tolerance;
      tests.push(test("price_reconciliation", okDiff,
        okDiff ? [] : [{ id: "(price)", why: `submitted ${sub} against an approved ${app}, a difference of ${diff}${allowed ? ` beyond the recorded rounding of ${allowed}` : " with no rounding rule recorded"}` }],
        "the submitted price does not reconcile to the approved price"));
    }
  }

  // 9. Cash exposure — peak funding against the approved threshold.
  {
    const rows = Array.isArray(cashProfile) ? cashProfile.map(num).filter((x) => x !== null) : [];
    if (rows.length === 0) {
      tests.push(test("cash_exposure", false, [{ id: "(cash)", why: "no cash profile has been modelled" }],
        "peak funding has not been calculated"));
    } else {
      let running = 0, peak = 0;
      for (const r of rows) { running += r; if (running < peak) peak = running; }
      const need = Math.abs(Math.min(0, peak));
      const limit = num(fundingLimit);
      const okCash = limit !== null ? need <= limit : false;
      tests.push(test("cash_exposure", okCash,
        okCash ? [] : [{ id: "(cash)", why: limit !== null ? `peak funding of ${round2(need)} exceeds the limit of ${limit}` : `peak funding of ${round2(need)} against no recorded limit` }],
        "peak funding exceeds the approved threshold"));
    }
  }

  const failing = tests.filter((t) => !t.ok);
  return {
    ok: failing.length === 0,
    tests,
    failing,
    say: failing.length === 0 ? "all nine assurance tests pass" : `${failing.length} of nine assurance tests fail: ${failing.map((t) => t.id).join(", ")}`,
  };
}

function test(id, ok, rows, description) {
  return { id, ok, description, failures: rows, count: Array.isArray(rows) ? rows.length : 0 };
}

/** Rate build-up completeness — every component present and controlled. */
export function checkBuildUp(component, values = {}) {
  const def = COMPONENT_BY_ID.get(String(component));
  if (!def) return { ok: false, missing: [], say: `"${component}" is not one of the seven rate components` };
  const missing = def.controls.filter((c) => values[c] === undefined || values[c] === null || values[c] === "");
  return {
    ok: missing.length === 0,
    component: def.id,
    missing,
    say: missing.length === 0
      ? `${def.name} carries all ${def.controls.length} controls`
      : `${def.name} is missing ${missing.join(", ")}`,
  };
}

/**
 * Normalising a supplier quotation for comparison. The rule that matters is
 * what it does NOT do: exclusions and qualifications survive normalisation
 * intact. A comparison table that drops them compares three prices for three
 * different scopes and presents them as three prices for one.
 */
export function normaliseQuote(raw = {}) {
  const exclusions = Array.isArray(raw.exclusions) ? raw.exclusions.map(String) : [];
  const qualifications = Array.isArray(raw.qualifications) ? raw.qualifications.map(String) : [];
  return {
    id: String(raw.id || ""),
    supplier: String(raw.supplier || "").trim(),
    version: raw.version ? String(raw.version) : null,
    value: money(raw.value) ?? (Number.isFinite(raw.value) ? raw.value : null),
    currency: raw.currency ? String(raw.currency).toUpperCase() : null,
    validUntil: raw.validUntil ? String(raw.validUntil) : null,
    paymentTerms: raw.paymentTerms ? String(raw.paymentTerms) : null,
    // Kept, never merged away, never summarised into a footnote.
    exclusions,
    qualifications,
    comparable: exclusions.length === 0 && qualifications.length === 0,
    say: exclusions.length || qualifications.length
      ? `${exclusions.length} exclusion(s) and ${qualifications.length} qualification(s) — this price is not directly comparable`
      : "no exclusions or qualifications; directly comparable",
  };
}

/** The facts the G4 price gate reads. */
export function gateFacts(assurance) {
  const arithmetic = assurance.tests.find((t) => t.id === "arithmetic");
  return { estimate: { arithmeticFaults: arithmetic ? arithmetic.count : null } };
}
