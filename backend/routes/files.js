import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { UPLOAD_DIR } from "../lib/uploads.js";
import { sessionFromQuery } from "../middleware/auth.js";
import { collection } from "../lib/store.js";
import { ACCESS, ROLES } from "../../shared/constants.js";

const router = Router();

/**
 * Who may read what.
 *
 * Any signed-in employee could download any file the platform held: a
 * client's commercial pack, a subcontractor's bank letter, a tender
 * return. The URL was not the permission — the record was — but the
 * record carried no permission of its own, so the two amounted to the
 * same thing for anybody with a login. A file is now readable by the
 * people whose job includes the record it hangs off.
 */
const SITE_TEAM = [...ACCESS.DELIVERY_FINANCE, ROLES.SITE_ENGINEER, ROLES.QA_INSPECTOR];
const AREAS = [
  { name: "lead", roles: ACCESS.DELIVERY_FINANCE, files: () => collection("leads").flatMap((l) => l.documents || []) },
  { name: "supplier", roles: ACCESS.DELIVERY_FINANCE, files: () => collection("subcontractors").flatMap((s) => s.documents || []) },
  { name: "client pack", roles: SITE_TEAM, files: () => collection("clientEngagements").flatMap((e) => (e.checklist || []).flatMap((i) => i.files || [])) },
  { name: "deliverable", roles: SITE_TEAM, files: () => collection("clientEngagements").flatMap((e) => (e.deliverables || []).flatMap((d) => d.files || [])) },
];

/**
 * GET /api/files/:stored?token=… — download a supporting document.
 * Links are opened from the dashboard, so the session token travels as a
 * query parameter instead of a header.
 */
router.get("/:stored", (req, res) => {
  const user = sessionFromQuery(req.query.token);
  if (!user) return res.status(401).json({ error: "Authentication required." });

  const stored = path.basename(req.params.stored); // no traversal
  let meta = null, area = null;
  for (const a of AREAS) {
    const found = a.files().find((d) => d.stored === stored);
    if (found) { meta = found; area = a; break; }
  }
  const file = meta ? path.join(UPLOAD_DIR, stored) : null;
  // A file whose owning record is not in this list is not downloadable,
  // which is the point: the URL is not the permission, the record is.
  if (!meta || !fs.existsSync(file)) {
    return res.status(404).json({ error: "File not found." });
  }
  if (!area.roles.includes(user.role)) {
    return res.status(403).json({ error: `Your role does not have access to ${area.name} documents.` });
  }
  res.download(file, meta.name);
});

export default router;
