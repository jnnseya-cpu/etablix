/**
 * THE DETERMINISTIC ENGINES, RUN WITHOUT THE MODEL.
 *
 * Every one of these sixteen is reachable as an agent, where the engine runs
 * and the model writes the report. That is the right shape for a deliverable
 * somebody is going to read.
 *
 * It is the wrong shape for a check. A time bar does not need a report; it
 * needs an answer, now, in a hundred milliseconds and for nothing. So the
 * same engines are exposed here directly: same code, same refusals, no model
 * call, no ACU, no run record.
 *
 * Having both matters for a reason beyond convenience: it is what makes the
 * claim testable. A test that exercises the engine through this route is
 * exercising the same function the agent's brief is generated from, so an
 * agent cannot describe a check its engine does not run.
 *
 * Internal only. Employees for the catalogue and the reads; delivery and
 * commercial roles to run one, because several of these read contract and
 * cost records.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ACCESS } from "../../shared/constants.js";
import { catalogue, run, BY_ID, state } from "../lib/engines/index.js";
import { recordLedger } from "../lib/store.js";

const router = Router();
router.use(requireAuth);

/** GET /api/engines — the sixteen, with the record shape each one reads. */
router.get("/", (req, res) => {
  res.json({ engines: catalogue(), state: state() });
});

/** GET /api/engines/:id — one, with its shape. */
router.get("/:id", (req, res) => {
  const spec = BY_ID.get(req.params.id);
  if (!spec) return res.status(404).json({ error: "Unknown engine." });
  const { id, agent, engine, depth, purpose, shape, fields } = spec;
  res.json({ engine: { id, agent, engine, depth, purpose, shape, fields: fields.map((f) => ({ name: f.name, label: f.label, type: f.type, required: Boolean(f.required) })) } });
});

/**
 * POST /api/engines/:id/run — the engine alone.
 *
 * A REFUSAL IS A 422, NOT A 500. The engine refusing to compute from the
 * records it was given is the engine working: "these records are not
 * readable" and "this service is broken" are different answers and a caller
 * has to be able to tell them apart.
 */
router.post("/:id/run", requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  const spec = BY_ID.get(req.params.id);
  if (!spec) return res.status(404).json({ error: "Unknown engine." });
  let out;
  try {
    out = run(spec.id, req.body || {});
  } catch (err) {
    console.error(`engine ${spec.id} threw:`, err);
    return res.status(500).json({ error: `The ${spec.agent} failed: ${err.message}` });
  }
  if (!out.ok) return res.status(422).json({ error: out.reason, refused: true, engine: spec.id });
  // Recorded, because an engine that answered a contractual question is a
  // thing somebody will later want to know was run, and by whom. The findings
  // themselves are not written to the ledger — they belong to the caller.
  recordLedger(`engine.${spec.id}.run`, spec.id, req.user.name, spec.agent);
  res.json({ engine: spec.id, agent: spec.agent, result: out.result, findings: out.text });
});

export default router;
