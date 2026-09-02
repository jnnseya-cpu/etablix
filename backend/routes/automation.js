/**
 * Delivery automation — status, rule toggles and on-demand runs.
 * Every employee can see what the automation is doing; only an
 * administrator can change how it behaves or force a run.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../../shared/constants.js";
import { status, setConfig, setRule, runAutomation } from "../lib/automation.js";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => res.json(status()));

router.patch("/config", requireRole(ROLES.ADMIN), (req, res) => {
  setConfig(req.body || {});
  res.json(status());
});

router.patch("/rules/:id", requireRole(ROLES.ADMIN), (req, res) => {
  try {
    setRule(req.params.id, Boolean(req.body?.enabled));
    res.json(status());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/run", requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const run = await runAutomation("manual");
    res.json({ run, ...status() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
