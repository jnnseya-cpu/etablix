/**
 * THE MODEL VALIDATION AGENT.
 *
 * A federated model is used for three things: coordination, quantities and
 * asset information. All three fail in the same way — quietly, on data that
 * looks right in a viewer. A model can be visually perfect and useless for
 * every one of them.
 *
 * SEVEN CHECKS, AND THE FIRST ONE IS THE ONE THAT SCALES A BUILDING BY A
 * THOUSAND:
 *
 *   1. UNITS. A model authored in metres and received as millimetres looks
 *      identical on screen and produces a quantity take-off out by 1000.
 *      Nothing about the picture tells you; the declared unit does.
 *   2. SHARED COORDINATES. Each discipline modelled to its own origin
 *      federates into a model where nothing clashes because nothing touches.
 *      A clash report against it comes back clean, which is the worst
 *      possible answer.
 *   3. NAMING. An element that does not match the information protocol's
 *      convention cannot be found by a rule, so every automated check is
 *      quietly working on a subset.
 *   4. CLASSIFICATION. No classification code means the element is in no
 *      schedule, no cost plan and no asset register.
 *   5. LEVEL OF INFORMATION against the stage. An element at a higher level
 *      of detail than the stage requires is not a bonus — it is a design
 *      decision made early and presented as a drawing.
 *   6. DUPLICATES. The same type at the same location twice doubles a
 *      quantity and passes every visual check, because the two are in exactly
 *      the same place.
 *   7. ORPHANS. An element on no level and in no system appears in the model
 *      and in no schedule taken from it.
 *
 * IT VALIDATES THE DATA, NOT THE DESIGN. Whether the design is any good is a
 * question for the people who did it.
 */

import { num } from "../l7/num.js";
import { day, asAtOr } from "./moment.js";

export const UNITS = ["mm", "m"];

/** The information a stage requires. Stage names follow the RIBA plan of work. */
export const STAGES = [
  { id: "2", name: "Concept design", maxLevel: 2 },
  { id: "3", name: "Spatial coordination", maxLevel: 3 },
  { id: "4", name: "Technical design", maxLevel: 4 },
  { id: "5", name: "Manufacturing and construction", maxLevel: 5 },
  { id: "6", name: "Handover", maxLevel: 6 },
];
const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

/**
 * Does the element name match the protocol's convention?
 *
 * Same token approach as the submission controller: whoever fills this in is
 * reading an information protocol, not writing a regex.
 */
export function matchesNaming(name, template) {
  if (!template) return true;
  const escaped = String(template)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\{(project|originator|volume|level|type|role|number|discipline)\\\}/g, "[A-Za-z0-9][A-Za-z0-9_.-]*");
  return new RegExp(`^${escaped}$`).test(String(name));
}

/** One model file, and the elements in it. */
export function validate({
  models = [], elements = [], stage = null,
  naming = null, projectBasePoint = null, requiredUnit = "mm",
  asAt = null,
} = {}) {
  const findings = [];
  const add = (id, what, rows) => { if (rows.length) findings.push({ id, what, rows }); };
  const stageDef = stage ? STAGE_BY_ID.get(String(stage)) : null;
  if (stage && !stageDef) findings.push({ id: "stage", what: "the stage given is not one this engine knows", rows: [`"${stage}" is not one of ${STAGES.map((s) => s.id).join(", ")}`] });

  // 1. Units.
  add("units", "a model's units disagree with the project's, which scales every quantity taken from it",
    models.filter((m) => {
      const u = String(m.unit || "").trim();
      return !u || !UNITS.includes(u) || u !== String(requiredUnit);
    }).map((m) => `${m.id || m.name || "(unnamed model)"} declares "${m.unit || "nothing"}" against a project unit of ${requiredUnit}. A model authored in metres and received as millimetres looks identical on screen.`));

  // 2. Shared coordinates.
  add("coordinates", "a model is not on the project's shared coordinates, so it federates into a model where nothing clashes because nothing touches",
    models.filter((m) => {
      if (!projectBasePoint) return false;
      const bp = String(m.basePoint || "").trim();
      return !bp || bp !== String(projectBasePoint);
    }).map((m) => `${m.id || m.name}: base point "${m.basePoint || "(none declared)"}" against the project's "${projectBasePoint}". A clash report against a model like this comes back clean, which is the worst possible answer.`));

  // 3. Naming.
  add("naming", "an element does not match the naming convention, so every rule-based check is silently working on a subset",
    elements.filter((e) => naming && !matchesNaming(e.name || "", naming))
      .slice(0, 200)
      .map((e) => `${e.id || "(unreferenced)"}: "${e.name || "(unnamed)"}" against "${naming}"`));

  // 4. Classification.
  add("classification", "an element carries no classification code, so it is in no schedule, no cost plan and no asset register",
    elements.filter((e) => !String(e.classification || "").trim()).slice(0, 200).map((e) => String(e.id || e.name || "(unreferenced)")));

  // 5. Level of information.
  if (stageDef) {
    const over = elements.filter((e) => {
      const lvl = num(e.level);
      return lvl !== null && lvl > stageDef.maxLevel;
    });
    const under = elements.filter((e) => {
      const lvl = num(e.level);
      return lvl === null || lvl < stageDef.maxLevel;
    });
    add("over_developed", `an element carries more detail than ${stageDef.name} requires — not a bonus, a design decision made early and presented as a drawing`,
      over.slice(0, 200).map((e) => `${e.id || e.name}: level ${e.level} against a stage maximum of ${stageDef.maxLevel}`));
    add("under_developed", `an element carries less information than ${stageDef.name} requires, or none recorded`,
      under.slice(0, 200).map((e) => `${e.id || e.name}: ${e.level === undefined || e.level === null ? "no level recorded" : `level ${e.level}`} against ${stageDef.maxLevel}`));
  }

  // 6. Duplicates — same type, same place.
  const seen = new Map();
  const duplicates = [];
  for (const e of elements) {
    const type = String(e.type || "").trim();
    const at = [e.x, e.y, e.z].map((v) => (num(v) === null ? "?" : Math.round(num(v)))).join(",");
    if (!type || at.includes("?")) continue;
    const key = `${type}@${at}`;
    if (seen.has(key)) duplicates.push(`${type} at ${at}: ${seen.get(key)} and ${e.id || e.name}`);
    else seen.set(key, e.id || e.name);
  }
  add("duplicates", "the same type in exactly the same place twice — it doubles a quantity and passes every visual check, because the two are in the same place", duplicates);

  // 7. Orphans.
  add("orphans", "an element is on no level and in no system, so it is in the model and in no schedule taken from it",
    elements.filter((e) => !String(e.hostLevel || "").trim() && !String(e.system || "").trim())
      .slice(0, 200).map((e) => String(e.id || e.name || "(unreferenced)")));

  const classified = elements.filter((e) => String(e.classification || "").trim()).length;
  return {
    ok: findings.length === 0,
    asAt: day(asAtOr(asAt)),
    models: models.length,
    elements: elements.length,
    classifiedShare: elements.length ? Math.round((classified / elements.length) * 100) : null,
    findings,
    verdict: findings.length === 0
      ? `${elements.length} element(s) across ${models.length} model(s) pass all seven checks. That says the data is usable for coordination, quantities and asset information. It says nothing about whether the design is any good, which is a question for the people who did it.`
      : `${findings.length} check(s) fail: ${findings.map((f) => f.id).join(", ")}.` +
        (findings.some((f) => f.id === "units" || f.id === "coordinates")
          ? " Two of these — units and shared coordinates — make everything downstream wrong rather than incomplete, so nothing should be taken off this model until they are fixed."
          : ""),
  };
}

export function state() { return { checks: 7, stages: STAGES.length, units: UNITS.length }; }
