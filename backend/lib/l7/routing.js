/**
 * Model routing — and the one row in the table that is not about cost.
 *
 *     Arithmetic → Deterministic service → No LLM arithmetic as authority.
 *
 * Every other row is a trade between capability and spend: a small model for
 * classification, a long-context model for drafting, a vision model for
 * drawings. That row is different in kind. It says a whole class of work must
 * never be routed to a model at all, however good the model gets.
 *
 * So `route("arithmetic")` here does not return a model. It returns a refusal
 * naming the deterministic service that must do the work instead. A function
 * that answered "use the frontier model, carefully" would be the single most
 * expensive line in this codebase: a tender price that is a language model's
 * best recollection of multiplication.
 *
 * THE RED-TEAM RULE IS THE SECOND ONE THAT BITES.
 *
 * An assurance route must differ from the route that authored the content —
 * a different vendor where one is available, and always a different prompt
 * lineage. A red team run on the same model with the same context agrees with
 * the author, and produces a review that says "no issues found" with complete
 * confidence. That is worse than no review, because it is recorded as one.
 *
 * WHY DETERMINISM IS RECORDED. Every run stores its prompt hash, model, tool
 * versions, seed and input state version. Not for tidiness: a bid decision
 * challenged eighteen months later has to be reproducible, and "the model
 * said so at the time" is not a defence anybody has to accept.
 */

/** The task classes, merged from both specifications. */
export const TASK_CLASSES = [
  { id: "ocr", name: "OCR and layout", capability: "Specialised document model",
    control: "Page-level confidence", deterministic: false, temperature: 0 },
  { id: "classify", name: "Classification", capability: "Fast structured-output model",
    control: "Schema and sample audit", deterministic: false, temperature: 0, batched: true },
  { id: "extract.structured", name: "Structured extraction", capability: "Mid-tier, long context",
    control: "JSON mode, temperature zero", deterministic: false, temperature: 0 },
  { id: "reason.contract", name: "Contract interpretation", capability: "High-reasoning model",
    control: "Clause retrieval and expert review", deterministic: false, temperature: 0, highRisk: true },
  { id: "arithmetic", name: "Arithmetic", capability: "Deterministic service",
    control: "NO LLM ARITHMETIC AS AUTHORITY", deterministic: true,
    service: "backend/lib/l7/estimating.js and the four reconciliations",
    say: "a total, a reconciliation or a date calculation is computed by a function and checked by a function; a model may explain it and may not be it" },
  { id: "draft.prose", name: "Response drafting", capability: "Long-context generation model",
    control: "Grounding and claim validator", deterministic: false, temperature: 0.3 },
  { id: "redteam", name: "Red-team review", capability: "Independent high-reasoning route",
    control: "Separate prompt and context", deterministic: false, temperature: 0, highRisk: true, mustDifferFromAuthor: true },
  { id: "vision", name: "Image or drawing analysis", capability: "Vision model",
    control: "Competent validation", deterministic: false, temperature: 0, highRisk: true },
  { id: "embed", name: "Embedding", capability: "Embedding model",
    control: "Chunk 800 tokens, 15 per cent overlap", deterministic: false, chunk: 800, overlap: 0.15 },
  { id: "sensitive", name: "Sensitive client data", capability: "Approved private route",
    control: "Residency and retention policy", deterministic: false, temperature: 0, residencyBound: true },
];

const CLASS_BY_ID = new Map(TASK_CLASSES.map((t) => [t.id, t]));

/**
 * The routes available. Kept as configuration because the model that is
 * "frontier" changes, and a hard-coded name silently degrades every route
 * built after it changes.
 */
export const ROUTES = {
  version: "route-2026-09",
  models: {
    "claude-opus-5": { tier: "frontier", vendor: "anthropic", longContext: true, vision: true },
    "claude-sonnet-5": { tier: "mid", vendor: "anthropic", longContext: true, vision: true },
    "claude-haiku-4-5-20251001": { tier: "small", vendor: "anthropic", longContext: false, vision: false },
  },
  byClass: {
    ocr: { primary: "claude-sonnet-5", fallback: "claude-opus-5" },
    classify: { primary: "claude-haiku-4-5-20251001", fallback: "claude-sonnet-5" },
    "extract.structured": { primary: "claude-sonnet-5", fallback: "claude-opus-5" },
    "reason.contract": { primary: "claude-opus-5", fallback: "claude-sonnet-5" },
    "draft.prose": { primary: "claude-opus-5", fallback: "claude-sonnet-5" },
    redteam: { primary: "claude-opus-5", fallback: "claude-sonnet-5" },
    vision: { primary: "claude-opus-5", fallback: "claude-sonnet-5" },
    embed: { primary: null, fallback: null },
    sensitive: { primary: "claude-opus-5", fallback: null },
  },
};

/**
 * Choose a route. Returns a refusal rather than a model for the deterministic
 * class, and refuses a red-team route that matches the author's.
 */
export function route(taskClass, { authorModel = null, authorPromptLineage = null, promptLineage = null, downgrade = false, region = null, permittedRegions = null } = {}) {
  const cls = CLASS_BY_ID.get(String(taskClass));
  if (!cls) return { ok: false, reason: `"${taskClass}" is not a task class`, model: null };

  if (cls.deterministic) {
    return {
      ok: false,
      deterministic: true,
      reason: cls.control,
      service: cls.service,
      say: cls.say,
      model: null,
    };
  }

  if (cls.residencyBound) {
    const permitted = Array.isArray(permittedRegions) ? permittedRegions.map(String) : [];
    if (!region || !permitted.includes(String(region))) {
      return { ok: false, reason: `sensitive client data may not be routed to ${region || "an unstated region"}`, model: null };
    }
  }

  const cfg = ROUTES.byClass[cls.id] || {};
  let model = downgrade && cfg.fallback ? cfg.fallback : cfg.primary;
  if (!model) return { ok: false, reason: `no route is configured for ${cls.name}`, model: null };

  if (cls.mustDifferFromAuthor) {
    if (!authorPromptLineage) {
      return { ok: false, reason: "a red-team route needs to know the author's prompt lineage to differ from it", model: null };
    }
    if (promptLineage && promptLineage === authorPromptLineage) {
      return { ok: false, reason: "the red-team prompt lineage is the author's; it would agree with itself", model: null };
    }
    if (authorModel && model === authorModel) {
      const alt = cfg.fallback && cfg.fallback !== authorModel ? cfg.fallback : null;
      if (!alt) {
        return {
          ok: true,
          model,
          sameVendor: true,
          sameModel: true,
          reason: "no alternative route is available",
          // Permitted, and it must be said out loud: this review is weaker
          // than it looks, and the deterministic validators carry the load.
          say: "THE RED TEAM IS RUNNING ON THE SAME MODEL AS THE AUTHOR — only the prompt lineage differs. Rely on the deterministic checks for anything that matters.",
          temperature: cls.temperature,
          taskClass: cls.id,
        };
      }
      model = alt;
    }
  }

  const row = ROUTES.models[model] || {};
  return {
    ok: true,
    taskClass: cls.id,
    model,
    tier: row.tier || null,
    vendor: row.vendor || null,
    temperature: cls.temperature === undefined ? 0 : cls.temperature,
    control: cls.control,
    highRisk: cls.highRisk === true,
    downgraded: downgrade === true && cfg.fallback === model,
    say: `${cls.name} → ${model} (${row.tier || "unknown tier"})`,
  };
}

/** Chunking for the embedding class, taken from the class rather than typed. */
export function chunking() {
  const cls = CLASS_BY_ID.get("embed");
  return { tokens: cls.chunk, overlap: cls.overlap, overlapTokens: Math.round(cls.chunk * cls.overlap) };
}

/**
 * The reproducibility record. Everything needed to run this again in two
 * years and get the same answer, or to prove that you cannot.
 */
export function fingerprint({ prompt = "", model = null, toolVersions = {}, seed = null, inputStateVersion = null, temperature = null } = {}) {
  return {
    promptHash: hash(String(prompt)),
    model,
    toolVersions: Object.fromEntries(Object.entries(toolVersions).map(([k, v]) => [String(k), String(v)])),
    seed: seed === null ? null : String(seed),
    inputStateVersion: inputStateVersion === null ? null : String(inputStateVersion),
    temperature,
    at: new Date().toISOString(),
  };
}

/** Dependency-free content hash — identity comes from the other fields. */
function hash(s) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 + s.charCodeAt(i) * (i + 1)) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

/**
 * Compare a replay against the original. Divergence beyond tolerance is an
 * event, not a shrug: a run that cannot be reproduced cannot be defended.
 */
export function compareReplay(original = {}, replay = {}, { tolerance = 0 } = {}) {
  const differences = [];
  for (const field of ["promptHash", "model", "seed", "inputStateVersion", "temperature"]) {
    if (String(original[field]) !== String(replay[field])) {
      differences.push({ field, original: original[field], replay: replay[field] });
    }
  }
  const oTools = original.toolVersions || {};
  const rTools = replay.toolVersions || {};
  for (const k of new Set([...Object.keys(oTools), ...Object.keys(rTools)])) {
    if (String(oTools[k]) !== String(rTools[k])) differences.push({ field: `tool:${k}`, original: oTools[k], replay: rTools[k] });
  }
  const inputsMatch = differences.length === 0;
  const outputDrift = Number(replay.outputDistance);
  const drifted = Number.isFinite(outputDrift) && outputDrift > tolerance;
  return {
    reproducible: inputsMatch && !drifted,
    inputsMatch,
    differences,
    outputDrift: Number.isFinite(outputDrift) ? outputDrift : null,
    event: inputsMatch && drifted ? "agent.nondeterminism_detected" : null,
    say: !inputsMatch
      ? `the replay is not the same run: ${differences[0].field} differs`
      : drifted
        ? "SAME INPUTS, DIFFERENT OUTPUT — the run is not reproducible and any decision resting on it cannot be defended as such"
        : "reproduced",
  };
}
