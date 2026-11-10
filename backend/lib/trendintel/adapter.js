/**
 * The write adapter, and the one failure that cannot be prevented — only
 * recovered from.
 *
 * A worker calls a provider, the provider applies the change, and the worker
 * dies before it records that it did. Nothing in a database transaction can
 * prevent this: the side effect happened somewhere else. TI-07 is this exact
 * sequence, and the only defence is that the adapter can be ASKED what it
 * did, using the same deterministic key, before anybody writes again.
 *
 * SO `get_receipt` IS THE LOAD-BEARING METHOD, and the specification draws
 * the hard conclusion: "adapters lacking safe reconciliation are draft-only"
 * (§18). An adapter that cannot answer "did you already do this?" may prepare
 * a draft and may never be given a live write, because its retry is a second
 * side effect and there is no way to find out.
 *
 * THREE ANSWERS, NOT TWO. applied / not_found / unknown. An adapter that
 * collapses `unknown` into `not_found` turns an ambiguous completion into a
 * confident retry, which is the duplicate it was supposed to prevent — so
 * `unknown` holds the job at reconciliation_required instead.
 *
 * EVERY WRITE IS A COMPARE-AND-SET ON ALL FIELDS AT ONCE (§18). Not
 * field-by-field: a partial apply leaves a page half-changed and a revision
 * that means nothing. And `restore_patch` restores only the fields the action
 * owned, so an editor's unrelated edit survives the rollback (TI-08).
 *
 * THE NATIVE SURFACE EXISTS SO THE PRODUCT WORKS WITH NO CMS AT ALL (§12,
 * §18, TI-20). Public read serves the active revision and never a draft, the
 * first page is created and approved by a person, and no third-party
 * credential is involved at any point.
 */

/** What `get_receipt` may answer, §18. Three values, and `unknown` is real. */
export const RECEIPT_STATES = Object.freeze(["applied", "not_found", "unknown"]);

/** Capabilities an adapter declares. No safe reconciliation means draft-only. */
export const ADAPTER_CAPABILITIES = Object.freeze([
  "get_asset", "apply_patch", "get_receipt", "restore_patch",
]);

const str = (v) => (v === undefined || v === null ? "" : String(v));

function hashFields(fields = {}) {
  const s = JSON.stringify(Object.keys(fields).sort().map((k) => [k, fields[k]]));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

/**
 * Whether an adapter may be given a live write at all, §18.
 *
 * Refusing here rather than at the first ambiguous completion is the point:
 * by then the duplicate has happened.
 */
export function adapterMode(capabilities = []) {
  const held = new Set([...(Array.isArray(capabilities) ? capabilities : [])].map(str));
  const missing = ADAPTER_CAPABILITIES.filter((c) => !held.has(c));
  if (!held.has("get_receipt")) {
    return { ok: true, mode: "draft_only", missing,
             say: "This adapter cannot answer get_receipt, so it is draft-only. Without safe reconciliation a retry after an ambiguous completion is a second side effect and there is no way to find out that it was." };
  }
  if (missing.length) {
    return { ok: true, mode: "draft_only", missing,
             say: `This adapter is missing ${missing.join(", ")}, so it is draft-only. Drafts remain exportable for channels with no available write path.` };
  }
  return { ok: true, mode: "live_capable", missing: [],
           say: "This adapter implements all four methods, so it may be granted a patch-only scope on an explicitly enabled target." };
}

/**
 * A reference asset store. Plain objects in, plain objects out, so the
 * conformance suite can crash a worker between two calls and the state is
 * exactly what a database would hold.
 */
export function makeAsset({ installationId, assetId, slug = null, fields = {}, revision = "r1",
                             allowedFields = ["title", "description", "body_block"],
                             approvedByEditor = false } = {}) {
  return {
    installationId: str(installationId), assetId: str(assetId), slug: slug ? str(slug) : null,
    activeRevision: str(revision), draftRevision: null,
    fields: { ...fields }, allowedFields: [...allowedFields].map(str),
    approvedByEditor: Boolean(approvedByEditor),
    contentHash: hashFields(fields),
  };
}

/** §18 get_asset. Stable id, current revision, permitted values, content hash. */
export function getAsset(store = {}, { installationId, assetId } = {}) {
  const a = store[str(assetId)];
  if (!a || a.installationId !== str(installationId)) {
    return { ok: false, status: 404, say: `No such asset in installation ${str(installationId)}. A cross-installation asset id is a 404.` };
  }
  return {
    ok: true, status: 200,
    asset: {
      assetId: a.assetId, revision: a.activeRevision,
      fields: Object.fromEntries(a.allowedFields.map((f) => [f, a.fields[f] ?? null])),
      allowedFields: [...a.allowedFields], contentHash: a.contentHash,
      approvedByEditor: a.approvedByEditor,
    },
    say: `${a.assetId} at revision ${a.activeRevision}, content hash ${a.contentHash}.`,
  };
}

function nextRevision(current) {
  const m = /^r(\d+)$/.exec(str(current));
  return m ? `r${Number(m[1]) + 1}` : `${str(current)}+1`;
}

/**
 * §18 apply_patch. Atomic compare-and-set of all allowed fields, the action
 * key persisted WITH the resulting revision and the receipt, in one step.
 *
 * `receipts` is the adapter's own key ledger. It is written in the same call
 * that changes the revision, which is what makes the recovery in
 * `reconcile()` possible at all.
 */
export function applyPatch(store = {}, receipts = {}, { installationId, assetId, expectedRevision, fields = {}, actionKey } = {}) {
  const key = str(actionKey);
  if (!key) return { ok: false, status: 422, say: "A write needs a deterministic action key. Without one a retry cannot be told from a second intent." };

  // The same key twice is the same write. This is checked before the revision
  // so that a retry after a successful apply does not read as a conflict.
  const prior = receipts[key];
  if (prior) {
    return { ok: true, status: 200, replayed: true, receipt: prior,
             say: `Action key ${key} already applied at revision ${prior.revision}. The original receipt is returned; nothing is applied twice.` };
  }

  const a = store[str(assetId)];
  if (!a || a.installationId !== str(installationId)) {
    return { ok: false, status: 404, say: `No such asset in installation ${str(installationId)}.` };
  }
  if (!a.approvedByEditor) {
    return { ok: false, status: 403, reason: "not-approved-by-editor",
             say: `${a.assetId} has never been created and approved by an editor. A first page is an editorial act, not a side effect of an automated action.` };
  }
  const offered = Object.keys(fields);
  const notAllowed = offered.filter((f) => !a.allowedFields.includes(f));
  if (notAllowed.length) {
    return { ok: false, status: 422, reason: "field-not-permitted",
             say: `${notAllowed.join(", ")} ${notAllowed.length === 1 ? "is" : "are"} not a permitted field on this binding (${a.allowedFields.join(", ")}).` };
  }
  if (str(expectedRevision) !== a.activeRevision) {
    return { ok: false, status: 409, reason: "conflict",
             currentRevision: a.activeRevision, expectedRevision: str(expectedRevision),
             say: `Conflict: ${a.assetId} is at revision ${a.activeRevision} and the write expected ${str(expectedRevision)}. The asset is left intact and a new approval against the current revision is required — the editor's work is not overwritten by an approval taken against what the page used to say.` };
  }

  const previous = Object.fromEntries(offered.map((f) => [f, a.fields[f] ?? null]));
  const revision = nextRevision(a.activeRevision);
  // One step: fields, revision, receipt. A crash between any two of these
  // would be the gap TI-07 is about, so there is no between.
  a.fields = { ...a.fields, ...fields };
  a.activeRevision = revision;
  a.contentHash = hashFields(a.fields);
  receipts[key] = { actionKey: key, assetId: a.assetId, revision, previous, providerReceipt: `rcpt_${key.slice(-8)}_${revision}`, at: null };

  return {
    ok: true, status: 200, revision, previous, receipt: receipts[key],
    say: `Applied ${offered.join(", ")} to ${a.assetId}: revision ${str(expectedRevision)} → ${revision}. The previous field values and the receipt are stored with the key, so an interrupted worker can find out what happened.`,
  };
}

/** §18 get_receipt. Three answers, and `unknown` is not `not_found`. */
export function getReceipt(receipts = {}, actionKey, { adapterReachable = true } = {}) {
  if (!adapterReachable) {
    return { state: "unknown", say: "The adapter cannot be reached, so what happened is unknown. Unknown is not not-found: the job stays at reconciliation_required and no second write is attempted." };
  }
  const r = receipts[str(actionKey)];
  if (!r) return { state: "not_found", say: `No receipt for ${str(actionKey)}. The adapter is reachable and says it never applied this, so a retry with the same key is safe.` };
  return { state: "applied", receipt: r, revision: r.revision,
           say: `Applied at revision ${r.revision}, provider receipt ${r.providerReceipt}.` };
}

/**
 * TI-07 — recover from a worker that crashed after the provider succeeded.
 *
 * The recovery is a READ, and the single most important property is that it
 * produces one side effect in total: the receipt is adopted, not reapplied.
 */
export function reconcile({ receipts = {}, actionKey, adapterReachable = true } = {}) {
  const r = getReceipt(receipts, actionKey, { adapterReachable });
  if (r.state === "applied") {
    return { ok: true, state: "applied", sideEffects: 1, revision: r.revision, receipt: r.receipt,
             say: `Reconciled from the provider receipt using the original key: the change was applied at revision ${r.revision} before the worker died. The record is completed from the receipt and nothing is written again, so there is one side effect in total.` };
  }
  if (r.state === "not_found") {
    return { ok: true, state: "safe_to_retry", sideEffects: 0,
             say: "The adapter has no receipt for this key, so the provider never applied it. A retry with the same deterministic key is safe." };
  }
  return { ok: false, state: "reconciliation_required", sideEffects: null,
           say: "The outcome is unknown. The job holds at reconciliation_required: an irreversible send with no safe lookup is halted for review rather than retried on a guess." };
}

/**
 * §18 restore_patch. Restores only the fields the action owned, so an
 * unrelated edit made after publication survives the rollback — TI-08.
 */
export function restorePatch(store = {}, receipts = {}, { installationId, assetId, expectedAppliedRevision, previousFields = {}, rollbackKey } = {}) {
  const key = str(rollbackKey);
  if (!key) return { ok: false, status: 422, say: "A rollback needs its own key: it is a new logged compensating action, not an undo of the first one." };
  const prior = receipts[key];
  if (prior) return { ok: true, status: 200, replayed: true, receipt: prior, say: `Rollback key ${key} already applied at revision ${prior.revision}.` };

  const a = store[str(assetId)];
  if (!a || a.installationId !== str(installationId)) return { ok: false, status: 404, say: "No such asset in this installation." };
  if (str(expectedAppliedRevision) !== a.activeRevision) {
    return { ok: false, status: 409, reason: "conflict", currentRevision: a.activeRevision,
             say: `The asset is at revision ${a.activeRevision} and the rollback expects ${str(expectedAppliedRevision)}. Somebody edited it after publication, so the restore goes to manual resolution — replacing field values now would silently discard their edit.` };
  }
  const touching = Object.keys(previousFields);
  const untouched = a.allowedFields.filter((f) => !touching.includes(f));
  const revision = nextRevision(a.activeRevision);
  a.fields = { ...a.fields, ...previousFields };
  a.activeRevision = revision;
  a.contentHash = hashFields(a.fields);
  receipts[key] = { actionKey: key, assetId: a.assetId, revision, previous: null, providerReceipt: `rb_${key.slice(-8)}_${revision}`, at: null };
  return {
    ok: true, status: 200, revision, restored: touching, preserved: untouched, receipt: receipts[key],
    say: `Restored ${touching.join(", ")} on ${a.assetId} at revision ${revision}${untouched.length ? `, leaving ${untouched.join(", ")} as they now stand` : ""}. Rollback owns only the fields the action owned.`,
  };
}

/* ── the native owned surface ──────────────────────────────────────────── */

/**
 * §18 — the page the product ships so that an installation with no CMS, no
 * analytics tag and no third-party credential can still publish an approved
 * change and measure it. TI-16, TI-20 and TI-21 all rest on this.
 */
export function createNativePage({ installationId, slug, title, description, blocks = {}, createdBy = null, approvedBy = null } = {}) {
  if (!str(installationId) || !str(slug)) {
    return { ok: false, say: "A native page needs an installation and a public slug." };
  }
  if (!str(createdBy) || !str(approvedBy)) {
    return { ok: false, reason: "needs-editorial-approval",
             say: "A first native page must be explicitly created AND approved by an editor, named. The automation that proposes content does not get to bring a public page into existence." };
  }
  if (str(createdBy) === str(approvedBy)) {
    return { ok: false, reason: "self-approval", say: "The editor who created the page is not the editor who approves it." };
  }
  const asset = makeAsset({
    installationId, assetId: `native_${str(slug)}`, slug: str(slug),
    fields: { title: str(title), description: str(description), body_block: blocks?.body ?? null },
    revision: "r1", approvedByEditor: true,
  });
  return { ok: true, asset, say: `Native page /${str(slug)} created by ${str(createdBy)} and approved by ${str(approvedBy)} at revision r1. Drafts and previews stay inaccessible to the public; a public read serves the active revision only.` };
}

/** What a public visitor is served. The active revision and nothing else. */
export function publicRead(store = {}, { slug } = {}) {
  const a = Object.values(store).find((x) => x.slug === str(slug));
  if (!a) return { ok: false, status: 404, say: `No published page at /${str(slug)}.` };
  return {
    ok: true, status: 200, revision: a.activeRevision,
    page: { slug: a.slug, title: a.fields.title ?? null, description: a.fields.description ?? null, body_block: a.fields.body_block ?? null },
    draftServed: false,
    say: `Serving /${a.slug} at active revision ${a.activeRevision}. A draft revision is never served publicly, whatever its state.`,
  };
}

export function adapterNotes(result) {
  return result ? [result.say] : [];
}
