/**
 * The reading queue.
 *
 * There is no send endpoint here and there must never be one. The watcher
 * finds the moment; a person writes and sends the approach from their own
 * mailbox. That separation is the whole design, and a route that blurred it
 * would undo the reason this exists rather than the harvester it replaced.
 */
import { Router } from "express";
import { collection } from "../lib/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ACCESS } from "../../shared/constants.js";
import { sweep, act, suppress, TRIGGERS, SECTORS, STAGE_LABEL, sources } from "../lib/signals/index.js";
import { draftApproach } from "../lib/ai.js";

const router = Router();

/** GET /api/signals — the queue, newest and highest-scoring first. */
router.get("/", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const sector = req.query.sector ? String(req.query.sector) : null;
  const stageWanted = req.query.stage ? String(req.query.stage) : null;

  /**
   * SORTED BY WHAT RUNS OUT FIRST, NOT BY WHAT SCORES HIGHEST.
   *
   * Score ranks how interesting a moment is. It says nothing about when it
   * stops being available, so a notice closing on Friday sat below a
   * consultation about a scheme that breaks ground in 2028 because the
   * consultation happened to match one more pattern. A queue a person reads
   * top-down has to put the thing that expires first at the top.
   */
  const closing = (s) => (s.deadlineAt && s.deadlineAt >= Date.now() ? s.deadlineAt : null);
  const rows = collection("signals")
    .filter((s) => !status || s.status === status)
    .filter((s) => !sector || (s.sectors || []).includes(sector))
    .filter((s) => !stageWanted || (s.stage || "early") === stageWanted)
    .sort((a, b) => {
      const ca = closing(a), cb = closing(b);
      if (ca && cb) return ca - cb;          // both expire: soonest first
      if (ca) return -1;                     // a dated one always outranks
      if (cb) return 1;
      return (b.score - a.score) || (b.seenAt - a.seenAt);
    })
    .slice(0, 300);
  res.json({
    signals: rows,
    triggers: TRIGGERS.map((t) => ({ id: t.id, label: t.label, weight: t.weight })),
    sectors: SECTORS.map((x) => ({ id: x.id, label: x.label })),
    // Counted across the whole queue rather than the filtered view, so the
    // tabs do not change their own numbers when one is selected.
    sectorCounts: Object.fromEntries(SECTORS.map((x) => [x.id,
      collection("signals").filter((s) => (s.sectors || []).includes(x.id)).length])),
    stages: Object.entries(STAGE_LABEL).map(([id, label]) => ({ id, label })),
    stageCounts: Object.fromEntries(Object.keys(STAGE_LABEL).map((id) => [id,
      collection("signals").filter((s) => (s.stage || "early") === id).length])),
    sources: sources().map((s) => ({ id: s.id, name: s.name })),
    suppressions: collection("suppressions").length,
  });
});

/** POST /api/signals/sweep — run a pass now rather than waiting for the schedule. */
router.post("/sweep", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), async (req, res) => {
  try {
    const out = await sweep({ minScore: Number(req.body?.minScore) || 3 });
    res.json({ ...out, queued: out.queued.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/signals/:id/draft — write the opening for this one.
 *
 * Returns the draft to the screen. It is not sent, it is not stored as sent,
 * and there is no route here that would send it. The person reads it, edits
 * it, and sends it from their own mailbox — which is the entire reason this
 * was built instead of a harvester.
 */
router.post("/:id/draft", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), async (req, res) => {
  const signal = collection("signals").find((s) => s.id === req.params.id);
  if (!signal) return res.status(404).json({ error: "That signal does not exist." });
  try {
    const { draft } = await draftApproach(signal);
    if (!draft) return res.status(502).json({ error: "No draft came back — try again." });
    res.json({ draft });
  } catch (err) {
    const msg = /authentication|invalid.*key/i.test(err.message)
      ? "The production engine key was rejected — check it under Organisation → production engine."
      : err.message;
    res.status(502).json({ error: msg });
  }
});

/** POST /api/signals/:id/status — reading, approached or dismissed. */
router.post("/:id/status", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  try {
    const row = act(req.params.id, String(req.body?.status || ""), {
      by: req.user.name, note: req.body?.note ? String(req.body.note).slice(0, 2000) : null,
    });
    res.json({ signal: row });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/signals/suppress — never approach this one again.
 *
 * Deliberately easy to add and absent from the API to remove: taking a name
 * off a do-not-contact list is a decision that should cost a database edit
 * and a moment's thought, not a button.
 */
router.post("/suppress", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  try {
    const row = suppress(req.body?.pattern, { by: req.user.name, why: req.body?.why ? String(req.body.why).slice(0, 500) : null });
    res.json({ suppression: row, total: collection("suppressions").length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/signals/suppressions — what is on the list, and who put it there. */
router.get("/suppressions", requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE), (req, res) => {
  res.json({ suppressions: collection("suppressions") });
});

export default router;
