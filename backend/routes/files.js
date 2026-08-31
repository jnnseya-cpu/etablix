import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { UPLOAD_DIR } from "../lib/uploads.js";
import { verifyToken } from "../lib/auth.js";
import { collection } from "../lib/store.js";

const router = Router();

/**
 * GET /api/files/:stored?token=… — download a supporting document.
 * Links are opened from the dashboard, so the session token travels as a
 * query parameter instead of a header.
 */
router.get("/:stored", (req, res) => {
  if (!verifyToken(req.query.token)) {
    return res.status(401).json({ error: "Authentication required." });
  }
  const stored = path.basename(req.params.stored); // no traversal
  const meta =
    collection("leads")
      .flatMap((l) => l.documents || [])
      .concat(collection("subcontractors").flatMap((s) => s.documents || []))
      .find((d) => d.stored === stored);
  const file = path.join(UPLOAD_DIR, stored);
  if (!meta || !fs.existsSync(file)) {
    return res.status(404).json({ error: "File not found." });
  }
  res.download(file, meta.name);
});

export default router;
