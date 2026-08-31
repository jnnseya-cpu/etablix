/**
 * Platform administration — admin only.
 *
 * POST /api/admin/purge-demo-data — the clean-slate switch for going
 * live with real business: clears every demo and test business record
 * (enquiries, registrations, projects, quality, risks, runs, telemetry,
 * notifications, deliveries) and all uploaded files. It KEEPS employee
 * accounts, platform connections (CONSTRUX/VERYX keys) and the local
 * agent catalogue. Requires confirm: "DELETE" in the body.
 */

import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { collection, persist } from "../lib/store.js";
import { UPLOAD_DIR } from "../lib/uploads.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../../shared/constants.js";

const router = Router();
router.use(requireAuth, requireRole(ROLES.ADMIN));

const PURGE = [
  "leads", "subcontractors", "projects", "schedule", "budget", "rfis",
  "inspections", "ncrs", "risks", "agentRuns", "apiKeys", "sensors",
  "notifications", "deliveries",
];

router.post("/purge-demo-data", (req, res) => {
  if (req.body.confirm !== "DELETE") {
    return res.status(400).json({ error: 'Confirmation required: send { "confirm": "DELETE" }.' });
  }
  const cleared = {};
  for (const name of PURGE) {
    const rows = collection(name);
    cleared[name] = rows.length;
    rows.length = 0;
  }
  persist();
  let files = 0;
  try {
    for (const f of fs.readdirSync(UPLOAD_DIR)) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, f));
        files += 1;
      } catch {}
    }
  } catch {}
  res.json({
    ok: true,
    cleared,
    filesDeleted: files,
    kept: ["users (employee accounts)", "settings (platform connections)", "agents (catalogue)"],
  });
});

export default router;
