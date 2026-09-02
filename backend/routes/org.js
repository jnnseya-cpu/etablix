/**
 * Organisation — the ETABLIX operating structure, the AI-agent
 * workforce and the position catalogue. Every employee can read it:
 * it is how each person finds their role, responsibilities, and what
 * the AI agents do (and are never allowed to do) around them.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { organisation } from "../lib/organisation.js";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => res.json(organisation()));

export default router;
