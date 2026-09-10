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
import { collection, persist, ledger } from "../lib/store.js";
import { UPLOAD_DIR } from "../lib/uploads.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../../shared/constants.js";

const router = Router();
router.use(requireAuth, requireRole(ROLES.ADMIN));

/**
 * What the clean-slate switch clears.
 *
 * "agentRuns" used to be in this list. There is no such collection — the runs
 * are in `agentTasks` — so the purge has always claimed to clear runs and
 * silently cleared nothing. The name is gone rather than corrected, and
 * deliberately:
 *
 * AGENT RUNS AND DOCUMENTS ARE NOT DEMO DATA. A run is model time somebody
 * paid for, and a document is a numbered deliverable that may have been
 * issued to a client. Neither should ever leave the store as part of a bulk
 * "clear the test records" action, because that action is taken quickly, by
 * one person, with a single confirmation. They are removed one at a time,
 * through routes that record who did it and why.
 */
const PURGE = [
  "leads", "subcontractors", "projects", "schedule", "budget", "rfis",
  "inspections", "ncrs", "risks", "apiKeys", "sensors",
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
    kept: [
      "users (employee accounts)",
      "settings (platform connections)",
      "agents (catalogue)",
      "agentTasks (agent runs — paid model time, never bulk-deleted)",
      "documents (numbered deliverables — never bulk-deleted)",
      "clientEngagements",
    ],
  });
});

/**
 * GET /ledger — read the append-only record.
 *
 * THE LEDGER WAS WRITE-ONLY. Nothing in the application could read it.
 *
 * It exists so that "what did this say on the fourteenth" has an answer that
 * is not "whatever the file says now", and it has been faithfully recording
 * money events and, since today, deletions. None of which could be seen. The
 * first time it was needed — a numbered Site Systems Diagnostic report was in
 * the register and then was not — the record may well have existed and there
 * was no way to look at it.
 *
 * A record nobody can read is not a record, it is a data file.
 *
 *   /api/admin/ledger                          the last 200 entries
 *   /api/admin/ledger?kind=document.deleted    one kind
 *   /api/admin/ledger?since=1757462400000      from a timestamp
 *   /api/admin/ledger?q=SSD-2026               matching text
 *
 * Admin only, like everything in this file. It names people and actions, so
 * it is not a general-purpose audit view for the whole team.
 */
router.get("/ledger", (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 2000);
  const since = Number(req.query.since) || 0;
  const kind = req.query.kind ? String(req.query.kind) : null;
  const q = String(req.query.q || "").trim().toLowerCase();

  let rows = ledger({ kind, since, limit: q ? 2000 : limit });
  if (q) {
    rows = rows.filter((r) =>
      [r.kind, r.ref, r.actor, r.detail].some((v) => String(v || "").toLowerCase().includes(q)))
      .slice(0, limit);
  }
  res.json({
    entries: rows.map((r) => ({ ...r, at: r.at, when: new Date(r.at).toISOString() })),
    count: rows.length,
    limit,
    // The kinds actually present, so somebody can filter without guessing.
    kinds: [...new Set(ledger({ limit: 2000 }).map((r) => r.kind))].sort(),
  });
});

export default router;
