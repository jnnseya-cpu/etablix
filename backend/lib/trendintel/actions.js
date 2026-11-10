/**
 * Actions: what may be changed, who may approve it, and the two moments a
 * guard has to hold.
 *
 * THE FIELD ALLOWLIST IS THE WHOLE SAFETY MODEL OF V1 (§18). Live execution
 * supports exactly two action kinds on prebound assets, and inside those it
 * can patch a title, a description and an approved named body block. URL,
 * redirects, canonical, robots, structured data, permissions and template
 * code are OUT OF SCOPE — not "require extra approval", out of scope. Each of
 * those is a change that can remove a page from an index or break a site, and
 * none of them is reversible by restoring a field value.
 *
 * APPROVAL BINDS TO A HASH AND A REVISION, NOT TO AN ACTION ID (§16, §18).
 * An approval that survives an edit is not an approval; it is a signature on
 * a document somebody then rewrote. So editing the payload, the brief
 * expiring, or the policy or profile revision moving all invalidate it, and
 * the approver signs the canonical hash AND the revision they were shown.
 *
 * AUTHOR AND APPROVER MUST DIFFER, and self-approval of a live change is
 * refused rather than warned about (§16, §18.2).
 *
 * AND EVERY GUARD RUNS TWICE. Once at approval, once at execution, after the
 * queue delay (§6, §18.3). A policy change, a freeze, an expiry or a moved
 * target revision between the two is the normal case, not the exception: a
 * queue is a gap in time and anything can happen in it. TI-05 is a brief
 * expiring in exactly that gap.
 *
 * A FREEZE IS NOT A PAUSE BUTTON (§8, §18.6). It rejects new live work and
 * stops queued work that has not passed its final check, in-flight calls
 * reconcile on return, and it STILL PERMITS AUTHORISED ROLLBACK — because the
 * reason somebody froze the channel is usually the reason they need to undo
 * something.
 */

/** Live-executable action kinds, §18. Two, on prebound assets. */
export const LIVE_ACTION_KINDS = Object.freeze(["seo_metadata_patch", "owned_content_patch"]);

/** Draft-only artefact kinds, §18. */
export const DRAFT_ACTION_KINDS = Object.freeze(["seo_page_draft", "organic_social_draft"]);

/** The patchable fields, §18. */
export const PATCHABLE_FIELDS = Object.freeze(["title", "description", "body_block"]);

/**
 * Explicitly out of scope for v1 automation, §18. Named individually so a
 * refusal can say which one, and so adding one is a deliberate act.
 */
export const OUT_OF_SCOPE_FIELDS = Object.freeze([
  "url", "slug", "redirects", "canonical", "robots", "noindex",
  "structured_data", "schema", "permissions", "template_code", "sitemap",
]);

/** The action state machine, §6. */
export const ACTION_STATES = Object.freeze([
  "proposed", "validated", "pending_approval", "approved", "queued",
  "executing", "applied", "failed", "reconciliation_required", "rolled_back",
]);

export const ACTION_TRANSITIONS = Object.freeze({
  proposed: ["validated", "failed"],
  validated: ["pending_approval", "failed"],
  pending_approval: ["approved", "failed"],
  approved: ["queued", "failed"],
  queued: ["executing", "failed"],
  executing: ["applied", "failed", "reconciliation_required"],
  reconciliation_required: ["applied", "failed"],
  applied: ["rolled_back"],
  failed: [],
  rolled_back: [],
});

/** Everything the validation step at §18.1 checks, in order. */
export const PREFLIGHT_CHECKS = Object.freeze([
  "schema", "scope", "assetAllowlist", "entitlement", "freeze",
  "briefFresh", "evidence", "approvedClaims",
]);

const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Canonical form, so the same patch always hashes the same. Keys sorted. */
export function canonicalPatch(patch = {}) {
  const keys = Object.keys(patch).filter((k) => patch[k] !== undefined).sort();
  return JSON.stringify(keys.map((k) => [k, patch[k]]));
}

export function payloadHash(payload) {
  const s = typeof payload === "string" ? payload : canonicalPatch(payload);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

/**
 * The idempotency key, §6, derived rather than supplied: installation, brief
 * version, channel, action kind, target, base revision and canonical patch
 * hash. Derived means a retry of the same intent produces the same key
 * without the caller having to remember one, which is the only version of
 * at-least-once delivery that is actually safe.
 */
export function idempotencyKey(action = {}) {
  return [
    str(action.installationId), str(action.briefId), str(action.briefVersion),
    str(action.channel), str(action.actionKind), str(action.targetId),
    str(action.expectedTargetRevision), payloadHash(action.patch || {}),
  ].join(":");
}

/** Whether the patch touches only fields v1 may touch, §18. */
export function checkPatchFields(patch = {}, { actionKind = null } = {}) {
  const fields = Object.keys(patch || {});
  if (!fields.length) return { ok: false, reason: "empty-patch", say: "An empty patch is not a change." };
  const outOfScope = fields.filter((f) => OUT_OF_SCOPE_FIELDS.includes(f));
  if (outOfScope.length) {
    return { ok: false, reason: "field-out-of-scope", fields: outOfScope,
             say: `${outOfScope.join(", ")} ${outOfScope.length === 1 ? "is" : "are"} out of scope for v1 automation, not merely subject to extra approval. Each can remove a page from an index or break a template, and none is undone by restoring a field value. A live rollout must preserve sitemap, canonical and crawl status unless that is explicitly approved as its own change.` };
  }
  const unknown = fields.filter((f) => !PATCHABLE_FIELDS.includes(f));
  if (unknown.length) {
    return { ok: false, reason: "field-not-allowlisted", fields: unknown,
             say: `${unknown.join(", ")} ${unknown.length === 1 ? "is" : "are"} not on the typed field allowlist (${PATCHABLE_FIELDS.join(", ")}). The allowlist is positive: a field nobody listed is refused rather than passed through.` };
  }
  if (actionKind === "seo_metadata_patch" && fields.includes("body_block")) {
    return { ok: false, reason: "wrong-kind-for-field",
             say: "A metadata patch does not carry a body block. One action kind, one surface, so a preview shows what will actually change." };
  }
  return { ok: true, fields, say: `Patching ${fields.join(", ")}, all on the v1 allowlist.` };
}

/**
 * §18.1 — validate before anything is written. Returns every failure, because
 * an author fixing one at a time learns nothing about the others.
 */
export function preflight(action = {}, context = {}) {
  const failures = [];
  const kind = str(action.actionKind);

  if (!LIVE_ACTION_KINDS.includes(kind) && !DRAFT_ACTION_KINDS.includes(kind)) {
    failures.push({ check: "schema", say: `"${kind || "(none)"}" is not an action kind. Live: ${LIVE_ACTION_KINDS.join(", ")}. Draft: ${DRAFT_ACTION_KINDS.join(", ")}. An unknown kind is rejected, never guessed.` });
  }
  const live = LIVE_ACTION_KINDS.includes(kind);

  if (!str(action.installationId) || str(action.installationId) !== str(context.callerInstallationId)) {
    failures.push({ check: "scope", say: "The action's installation does not match the authenticated scope. Tenancy comes from the session, never from the payload." });
  }

  if (live) {
    const bound = new Set([...(context.allowedAssetIds || [])].map(str));
    if (!bound.has(str(action.targetId))) {
      failures.push({ check: "assetAllowlist", say: `${str(action.targetId) || "(no target)"} is not a prebound asset for this installation. An installation manifest or a subscription never authorises publishing; each target class is enabled explicitly.` });
    }
    const patch = checkPatchFields(action.patch || {}, { actionKind: kind });
    if (!patch.ok) failures.push({ check: "schema", say: patch.say });
  }

  const ent = str(context.entitlementStatus || "active");
  if (live && !["active", "trial"].includes(ent)) {
    failures.push({ check: "entitlement", say: `The installation is ${ent}. Grace, suspended and ended installations are read, export and rollback only; no new live write.` });
  }

  if (live && context.frozen) {
    failures.push({ check: "freeze", say: `The ${str(context.freezeScope || "installation")} is frozen${context.freezeReason ? `: ${str(context.freezeReason)}` : ""}. A freeze rejects new live work; authorised rollback is still permitted.` });
  }

  if (context.brief) {
    const b = context.brief;
    const t = Date.parse(str(context.now));
    const until = Date.parse(str(b.expires_at));
    if (!Number.isFinite(t) || !Number.isFinite(until) || t >= until) {
      failures.push({ check: "briefFresh", say: `The brief ${str(b.brief_id)} is not fresh at ${str(context.now)} (expires ${str(b.expires_at)}). An expired brief cannot originate an action and cannot keep one alive.` });
    } else if (num(action.briefVersion) !== null && Number(action.briefVersion) !== Number(b.brief_version)) {
      failures.push({ check: "briefFresh", say: `The action cites brief revision ${action.briefVersion} and the active brief is at ${b.brief_version}. A revoked or superseded revision cannot trigger an action.` });
    } else if (str(action.channel) && !(b.allowed_channels || []).includes(str(action.channel))) {
      failures.push({ check: "briefFresh", say: `The brief allows ${(b.allowed_channels || []).join(", ")} and this action is on ${str(action.channel)}.` });
    }
  } else {
    failures.push({ check: "briefFresh", say: "No active brief was resolved. Nothing originates an action on its own." });
  }

  const evidence = [...(action.evidenceIds || [])].map(str);
  if (!evidence.length) {
    failures.push({ check: "evidence", say: "No evidence is cited. Every factual statement carries the input it came from; an uncited action cannot be reviewed, only trusted." });
  } else if (context.evidenceInScope) {
    const held = new Set([...context.evidenceInScope].map(str));
    const foreign = evidence.filter((e) => !held.has(e));
    if (foreign.length) failures.push({ check: "evidence", say: `Evidence ${foreign.join(", ")} does not resolve in this installation.` });
  }

  const claims = [...(action.approvedClaimIds || [])].map(str);
  if (context.approvedClaimIds) {
    const held = new Set([...context.approvedClaimIds].map(str));
    const foreign = claims.filter((c) => !held.has(c));
    if (foreign.length) {
      failures.push({ check: "approvedClaims", say: `Claim(s) ${foreign.join(", ")} are not in the approved set. A claim that is not approved is not made, whatever the evidence suggests.` });
    }
    const prohibited = [...(context.brief?.prohibited_claims || [])].map((p) => str(p).toLowerCase());
    const text = Object.values(action.patch || {}).map(str).join(" ").toLowerCase();
    const hit = prohibited.filter((p) => p && text.includes(p));
    if (hit.length) failures.push({ check: "approvedClaims", say: `The patch text contains prohibited claim(s): ${hit.join("; ")}.` });
  }

  if (failures.length) {
    return { ok: false, state: "failed", failures,
             say: `${failures.length} preflight failure(s): ${failures.map((f) => f.check).join(", ")}. Nothing is written and the asset is untouched.` };
  }
  return {
    ok: true, state: "validated", live,
    idempotencyKey: idempotencyKey(action),
    payloadHash: payloadHash(action.patch || {}),
    say: live
      ? `Validated as a live ${kind} on ${str(action.targetId)}, expecting target revision ${str(action.expectedTargetRevision)}. It now needs an approval bound to the canonical hash and that revision.`
      : `Validated as a ${kind} draft artefact. No asset changes and no approval to publish is implied.`,
  };
}

/**
 * §18.2 — approve, or refuse and say why. The approval is a signature on a
 * specific payload at a specific target revision, and it dies the moment
 * either moves.
 */
export function approve({ action = {}, approver = null, signedPayloadHash = null,
                           signedTargetRevision = null, authorityScopes = [] } = {}) {
  const author = str(action.authorId || action.proposedBy);
  const who = str(approver);
  if (!who) return { ok: false, reason: "no-approver", say: "An approval needs a named approver. An approval by nobody is a flag in a database." };
  if (!author) return { ok: false, reason: "no-author", say: "The action records no author, so segregation cannot be checked and the approval is refused." };
  if (who === author) {
    return { ok: false, reason: "self-approval", say: `${who} is the author. Author and approver must differ, and self-approval of a live change is refused rather than warned about — segregation that can be waived is not segregation.` };
  }
  const scopes = new Set([...(Array.isArray(authorityScopes) ? authorityScopes : [])].map(str));
  if (!scopes.has("action:approve")) {
    return { ok: false, reason: "no-authority", say: `${who} holds no action:approve scope. A known identity lacking authority is a 403, not a 404 — the identity is real and the authority is not.` };
  }
  const want = payloadHash(action.patch || {});
  if (str(signedPayloadHash) !== want) {
    return { ok: false, reason: "hash-mismatch", expected: want, signed: str(signedPayloadHash),
             say: `The approval signs ${str(signedPayloadHash) || "(nothing)"} and the payload hashes to ${want}. The payload changed after it was shown, so the approval is void. An approval that survives an edit is a signature on a document somebody then rewrote.` };
  }
  if (str(signedTargetRevision) !== str(action.expectedTargetRevision)) {
    return { ok: false, reason: "revision-mismatch",
             say: `The approval was given against target revision ${str(signedTargetRevision)} and the action expects ${str(action.expectedTargetRevision)}. Re-approve against the revision as it now stands.` };
  }
  return {
    ok: true, state: "approved",
    approval: { approver: who, payloadHash: want, targetRevision: str(action.expectedTargetRevision),
                briefVersion: num(action.briefVersion), policyVersion: num(action.policyVersion), at: str(action.now) || null },
    say: `Approved by ${who}, bound to payload ${want} at target revision ${str(action.expectedTargetRevision)}. Any edit, the brief expiring, or a policy or profile change invalidates it.`,
  };
}

/**
 * §18.3 and §6 — the execution-time re-check, after the queue delay.
 *
 * This is the function the whole file exists for. Everything checked at
 * approval is checked again here, because the queue is a gap in time.
 */
export function authoriseExecution({ action = {}, approval = null, context = {} } = {}) {
  if (!approval) return { ok: false, state: "failed", reason: "not-approved", say: "No approval on record. The executor runs approved work only." };

  const denials = [];
  const want = payloadHash(action.patch || {});
  if (str(approval.payloadHash) !== want) {
    denials.push(`the payload now hashes to ${want} and the approval signed ${str(approval.payloadHash)}`);
  }
  if (context.brief) {
    const t = Date.parse(str(context.now));
    const until = Date.parse(str(context.brief.expires_at));
    if (!Number.isFinite(t) || !Number.isFinite(until) || t >= until) {
      denials.push(`the brief expired at ${str(context.brief.expires_at)} while the action sat in the queue`);
    }
    if (num(approval.briefVersion) !== null && Number(context.brief.brief_version) !== Number(approval.briefVersion)) {
      denials.push(`the brief moved to revision ${context.brief.brief_version} and the approval was against ${approval.briefVersion}`);
    }
  } else {
    denials.push("no active brief resolves now");
  }
  if (num(context.policyVersion) !== null && num(approval.policyVersion) !== null
      && Number(context.policyVersion) !== Number(approval.policyVersion)) {
    denials.push(`policy moved to revision ${context.policyVersion} from ${approval.policyVersion}`);
  }
  if (context.frozen) {
    denials.push(`the ${str(context.freezeScope || "installation")} is frozen and this job has not passed its final check`);
  }
  const ent = str(context.entitlementStatus || "active");
  if (!["active", "trial"].includes(ent)) denials.push(`the installation is ${ent}`);
  if (str(context.liveTargetRevision) && str(context.liveTargetRevision) !== str(approval.targetRevision)) {
    denials.push(`the target is now at revision ${str(context.liveTargetRevision)} and the approval was against ${str(approval.targetRevision)}`);
  }
  const scopes = new Set([...(context.providerScopes || [])].map(str));
  if (context.providerScopes && !scopes.has("patch")) {
    denials.push("the adapter no longer holds patch scope on this target");
  }

  if (denials.length) {
    return { ok: false, state: "failed", denials,
             say: `Execution denied: ${denials.join("; ")}. The asset is untouched${denials.some((d) => /revision/.test(d)) ? " and the editor's own work is protected; a new approval against the current revision is required" : ""}.` };
  }
  return { ok: true, state: "executing", actionKey: idempotencyKey(action),
           say: `Authorised at execution time. Previous field values and the expected revision are saved before the adapter is called, and the same deterministic action key is used on any safe retry.` };
}

/** Whether a state transition is one the machine allows, §6. */
export function canTransition(from, to) {
  const allowed = ACTION_TRANSITIONS[str(from)];
  if (!allowed) return { ok: false, say: `"${str(from)}" is not an action state.` };
  if (!allowed.includes(str(to))) {
    return { ok: false, allowed, say: `${str(from)} does not go to ${str(to)}. From ${str(from)} the only moves are ${allowed.join(", ") || "none — it is terminal"}.` };
  }
  return { ok: true, say: `${str(from)} → ${str(to)}.` };
}

/**
 * §18.6 — rollback is a NEW authorised compensating action, not an undo flag.
 * It must match the applied revision or fail safely, and a freeze does not
 * block it.
 *
 * WHO MAY AUTHORISE IT, AND WHY THAT IS NOT THE SAME ANSWER AS FOR THE
 * FORWARD WRITE. §18.2 requires author and approver to differ on a live
 * change. §18.6 requires a rollback to be "a new logged, authorised
 * compensating action" and adds that a freeze still permits one. Those are
 * different requirements and the difference is deliberate:
 *
 *   · The forward write puts something new in front of the public, so two
 *     people look at it.
 *   · The rollback returns the asset to a revision that was already live and
 *     already approved. It is the SAFE direction, and it is the thing somebody
 *     needs at two in the morning. Requiring a second signature to undo a
 *     change one person could make would mean an incident waits for a second
 *     person — which is how a bad revision stays up.
 *
 * So `action:rollback` scope IS the authorisation, and it is recorded against
 * the requester. An installation that wants two people on a rollback passes
 * `coApprover`, and then the two must differ. The first version of this took
 * the ORIGINAL action's author and compared it to the rollback's requester,
 * which refused every rollback by the person who had proposed the change —
 * the most likely person to notice it was wrong.
 */
export function authoriseRollback({ appliedRevision = null, liveRevision = null,
                                     requester = null, coApprover = null, authorityScopes = [],
                                     frozen = false, entitlementStatus = "active",
                                     recoveryWindowOpen = true } = {}) {
  const scopes = new Set([...(Array.isArray(authorityScopes) ? authorityScopes : [])].map(str));
  if (!scopes.has("action:rollback")) {
    return { ok: false, reason: "no-authority", say: "Rollback needs action:rollback scope. It is a write, logged and authorised like any other." };
  }
  if (!str(requester)) {
    return { ok: false, reason: "no-requester", say: "A compensating action is logged against whoever asked for it. An unattributed rollback is an unexplained change to a public page." };
  }
  if (str(coApprover) && str(coApprover) === str(requester)) {
    return { ok: false, reason: "self-approval", say: "This installation requires a second approver on a rollback, and the one given is the requester." };
  }
  if (["suspended", "ended"].includes(str(entitlementStatus)) && !recoveryWindowOpen) {
    return { ok: false, reason: "recovery-window-closed", say: `The installation is ${str(entitlementStatus)} and its recovery window has closed. Export and rollback were available during it.` };
  }
  if (!str(appliedRevision)) {
    return { ok: false, reason: "no-applied-revision", say: "Nothing records which revision this action applied, so there is nothing to compensate for safely." };
  }
  if (str(liveRevision) && str(liveRevision) !== str(appliedRevision)) {
    return { ok: false, reason: "revision-moved", appliedRevision: str(appliedRevision), liveRevision: str(liveRevision),
             say: `The target is at revision ${str(liveRevision)} and this action applied ${str(appliedRevision)}. Somebody edited it since. The rollback fails safely into manual resolution rather than overwriting their work — restoring field values would silently discard an edit made after publication.` };
  }
  return {
    ok: true, state: "rolled_back", frozenButPermitted: Boolean(frozen),
    requester: str(requester), coApprover: str(coApprover) || null,
    say: `Rollback authorised against applied revision ${str(appliedRevision)}, logged to ${str(requester)}${str(coApprover) ? ` and countersigned by ${str(coApprover)}` : ""}, restoring only the fields this action owned and preserving unrelated edits.${frozen ? " A freeze does not block it: the reason the channel was frozen is usually the reason something needs undoing." : ""}`,
  };
}

export function actionNotes(result) {
  if (!result) return [];
  const out = [result.say];
  if (result.failures) out.push(...result.failures.map((f) => `${f.check}: ${f.say}`));
  if (result.denials) out.push(...result.denials.map((d) => `denied: ${d}`));
  return out;
}
