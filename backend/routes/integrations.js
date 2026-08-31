/**
 * Platform connections — admin only. Stores CONSTRUX / VERYX API
 * credentials server-side and tests them live against the platforms.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../../shared/constants.js";
import { PLATFORMS, publicIntegration, setIntegration, testIntegration } from "../lib/platforms.js";

const router = Router();
router.use(requireAuth, requireRole(ROLES.ADMIN));

const validName = (req, res, next) =>
  PLATFORMS[req.params.name] ? next() : res.status(404).json({ error: "Unknown platform." });

/** GET /api/integrations — both connections, credentials masked. */
router.get("/", (req, res) => {
  res.json({ integrations: Object.keys(PLATFORMS).map(publicIntegration) });
});

/** PUT /api/integrations/:name — save base URL and/or API key. */
router.put("/:name", validName, (req, res) => {
  setIntegration(req.params.name, {
    baseUrl: req.body.baseUrl,
    apiKey: req.body.apiKey,
  });
  res.json({ integration: publicIntegration(req.params.name) });
});

/** POST /api/integrations/:name/test — live connection test. */
router.post("/:name/test", validName, async (req, res) => {
  const result = await testIntegration(req.params.name);
  res.json({ result, integration: publicIntegration(req.params.name) });
});

export default router;
