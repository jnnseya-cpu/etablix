/**
 * Retention and erasure for client information.
 *
 * A client can ask what we hold and ask for it to be removed. Until now the
 * only honest answer was that files were kept for ever and there was no way
 * to delete one — which is not a feature gap, it is a commitment the
 * business could not meet, and it had to be settled before the first
 * engagement that carries somebody's drawings.
 *
 * Three rules, and they are stated here once so the portal, the policy and
 * the code cannot drift apart:
 *
 *   1. The INFORMATION PACK — the client's own drawings, programmes and
 *      registers — is working material. It is kept while the engagement is
 *      live and for TWELVE MONTHS after it closes, so a question about the
 *      report can still be answered against what the report was written
 *      from. After that it is deleted.
 *
 *   2. The DELIVERABLE and the COMMERCIAL RECORD — the report we issued,
 *      the invoices, the audit trail — are kept for SIX YEARS. That is not
 *      a preference: section 5 of the Limitation Act 1980 gives six years
 *      to bring a claim on a simple contract, and HMRC requires company
 *      records to be kept for six years from the end of the accounting
 *      period. Deleting these early would leave both of us unable to
 *      evidence what was agreed.
 *
 *   3. An ERASURE REQUEST is honoured against everything in rule 1 at once,
 *      and against rule 2 only where no legal obligation still attaches.
 *      Every deletion is written to the append-only ledger: what, whose,
 *      when, by whom, and how many files. A deletion nobody can evidence is
 *      worse than no deletion at all.
 */

import fs from "node:fs";
import path from "node:path";
import { collection, mutate, recordLedger } from "./store.js";
import { UPLOAD_DIR } from "./uploads.js";

export const RETENTION = {
  pack: {
    id: "pack",
    label: "Client information pack",
    months: 12,
    basis:
      "Working material. Kept while the engagement is live and for twelve months after it closes, so a question about the report can be answered against what it was written from.",
  },
  record: {
    id: "record",
    label: "Deliverables and commercial record",
    months: 72,
    basis:
      "Six years, because the Limitation Act 1980 allows six years to bring a claim on a simple contract and HMRC requires company records for six years from the end of the accounting period.",
  },
};

const MONTH = 30 * 24 * 60 * 60 * 1000;

/** Every file the client supplied against an engagement's checklist. */
const packFiles = (e) => (e.checklist || []).flatMap((i) => i.files || []);

/** When an engagement's pack falls due for deletion, or null while it is live. */
export function packDueAt(engagement) {
  if (engagement.packErasedAt) return null;
  const closed = engagement.stage === "closed" ? engagement.closedAt || lastEventAt(engagement) : null;
  if (!closed) return null;
  return closed + RETENTION.pack.months * MONTH;
}

const lastEventAt = (e) => (e.events || []).reduce((mx, ev) => Math.max(mx, ev.at || 0), e.createdAt || 0);

/**
 * Delete the files themselves and the records that point at them.
 *
 * The note on each checklist line is kept and replaced with a statement that
 * it was erased, rather than the line vanishing: an engagement whose
 * checklist silently loses four rows looks like a mistake, and the client is
 * entitled to see that their request was carried out.
 */
export function erasePack(engagementId, { by, reason }) {
  const e = collection("clientEngagements").find((r) => r.id === engagementId);
  if (!e) return null;
  const files = packFiles(e);
  let removed = 0;
  for (const f of files) {
    if (!f?.stored) continue;
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(f.stored)));
      removed += 1;
    } catch {
      // Already gone is the desired end state, not an error.
    }
  }
  const at = Date.now();
  const updated = mutate("clientEngagements", engagementId, (current) => ({
    checklist: (current.checklist || []).map((i) =>
      (i.files || []).length
        ? { ...i, files: [], note: i.note, erased: { at, by, count: (i.files || []).length } }
        : i
    ),
    packErasedAt: at,
    packErasedBy: by,
    packErasedReason: reason || null,
    events: [
      ...(current.events || []),
      { at, by, what: "Client information pack erased", detail: `${removed} file(s) deleted — ${reason || "retention period reached"}` },
    ],
  }));
  recordLedger("data.erased", e.reference || engagementId, by,
    `${removed} client file(s) deleted from ${e.client} — ${reason || "retention period reached"}`);
  return { removed, engagement: updated };
}

/**
 * Everything held about one engagement, for a subject access request.
 * Describes rather than dumps: the client asked what we hold, and a list
 * they can read answers that better than a database export they cannot.
 */
export function describeHoldings(engagement) {
  const files = packFiles(engagement);
  const deliverableFiles = (engagement.deliverables || []).flatMap((d) => d.files || []);
  return {
    client: engagement.client,
    reference: engagement.reference,
    opened: engagement.createdAt,
    stage: engagement.stage,
    contact: { name: engagement.contactName, email: engagement.contactEmail },
    pack: {
      files: files.map((f) => ({ name: f.name, size: f.size, supplied: f.uploadedAt || null })),
      answers: (engagement.checklist || []).filter((i) => i.state !== "outstanding").length,
      retention: RETENTION.pack,
      dueForDeletion: packDueAt(engagement),
      erasedAt: engagement.packErasedAt || null,
    },
    record: {
      deliverables: (engagement.deliverables || []).map((d) => ({ label: d.label, issuedAt: d.issuedAt, revision: d.revision })),
      files: deliverableFiles.map((f) => ({ name: f.name })),
      invoices: (engagement.documents || []).map((d) => ({ number: d.number, kind: d.kind, issuedAt: d.issuedAt })),
      auditTrail: (engagement.events || []).length,
      retention: RETENTION.record,
    },
  };
}

/**
 * The sweep: erase every pack whose retention period has passed.
 *
 * Run from the scheduler. A retention policy that depends on somebody
 * remembering is a retention policy in name only.
 */
export function sweepRetention({ by = "ETABLIX retention policy", dryRun = false } = {}) {
  const now = Date.now();
  const due = collection("clientEngagements").filter((e) => {
    const at = packDueAt(e);
    return at && at <= now;
  });
  if (dryRun) return { due: due.length, erased: 0, engagements: due.map((e) => e.reference) };
  let files = 0;
  for (const e of due) {
    const out = erasePack(e.id, { by, reason: `retention period reached (${RETENTION.pack.months} months after close)` });
    files += out?.removed || 0;
  }
  return { due: due.length, erased: due.length, files, engagements: due.map((e) => e.reference) };
}
