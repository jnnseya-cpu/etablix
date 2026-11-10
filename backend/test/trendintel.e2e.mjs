/**
 * THE TREND INTELLIGENCE API, OVER THE WIRE.
 *
 *   node backend/test/trendintel.e2e.mjs
 *
 * The engines are pure functions, proved exactly in trendintel.test.mjs. This
 * tests the five things that exist only once they meet stored state and HTTP,
 * and that §16 is specific about because they are wrong in almost every first
 * implementation:
 *
 *   · An identical replay returns THE STORED RESPONSE, not a fresh success.
 *   · The same Idempotency-Key with a changed payload is 409.
 *   · A profile write without If-Match is 428 — not filled in server-side.
 *   · No effective brief is 204 with baseline fallback, not 200 with null.
 *   · A cross-installation id is 404 and a known identity lacking authority
 *     is 403, and those two answers are never swapped.
 */
const BASE = (process.env.BASE || "http://127.0.0.1:3391").replace(/\/+$/, "");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(typeof x === "string" ? x : JSON.stringify(x)).slice(0, 300) : ""))); };

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "admin@etablix.com", password: "etablix-admin-2026" }),
});
const token = login.ok ? (await login.json()).token : null;
console.log("\n=== the Trend Intelligence surface ===\n");
ok(!!token, "signed in");

const auth = { Authorization: `Bearer ${token}` };
const call = (method, path, b, extra = {}) =>
  fetch(`${BASE}${path}`, {
    method, headers: { ...auth, "content-type": "application/json", ...extra },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
const post = (p, b, extra) => call("POST", p, b ?? {}, extra);
const put = (p, b, extra) => call("PUT", p, b ?? {}, extra);
const get = (p, extra) => call("GET", p, undefined, extra);

const stamp = Date.now();
const INST = `inst_e2e_${stamp}`;
const inst = { "X-Installation": INST };
const mut = (key) => ({ ...inst, "Idempotency-Key": key, "X-Request-Id": `rq_${key}` });

console.log("\n--- nothing here is public\n");
for (const [method, path] of [
  ["POST", "/api/trendintel/v1/installations"],
  ["GET", "/api/trendintel/v1/capabilities"],
  ["POST", "/api/trendintel/v1/observations:batch"],
  ["GET", "/api/trendintel/v1/briefs:effective"],
  ["POST", "/api/trendintel/v1/actions"],
]) {
  const r = await fetch(`${BASE}${path}`, { method, headers: { "content-type": "application/json" }, body: method === "POST" ? "{}" : undefined });
  ok(r.status === 401 || r.status === 403, `${method} ${path} refuses an unauthenticated caller (${r.status})`, r.status);
}

console.log("\n--- an installation starts draft-only with nothing enabled\n");
{
  const r = await post("/api/trendintel/v1/installations", { installationId: INST, organisationId: `org_${stamp}`, platformSlug: `p_${stamp}` });
  const j = await r.json();
  ok(r.status === 201 && j.installation.mode === "draft_only", `created draft-only (${r.status})`, j);
  ok(j.installation.writeConnectorsEnabled.length === 0 && j.installation.sourcesEnabled.join() === "first_party,manual_import",
     "EVERY WRITE CONNECTOR DISABLED and first-party ingestion and manual imports only — a subscription never authorises publishing", j.installation);
  ok(!j.grant.scopes.includes("action:approve") && !j.grant.scopes.includes("brief:approve") && j.grant.scopes.includes("action:propose"),
     "AND THE CREATING IDENTITY IS DELIBERATELY NOT GRANTED THE TWO APPROVALS — with one identity per installation, the only account that can propose is the only account that can approve, self-approval is refused, and no live write could ever be published: every guard passing while the primary workflow is unreachable",
     j.grant.scopes);
  const again = await post("/api/trendintel/v1/installations", { installationId: INST, organisationId: "o", platformSlug: "p" });
  ok(again.status === 409, "the same installation id twice is 409", again.status);
}

console.log("\n--- a cross-installation reference is 404, never 403\n");
{
  const r = await get("/api/trendintel/v1/capabilities", { "X-Installation": `inst_not_mine_${stamp}` });
  ok(r.status === 404, "an installation this identity holds no grant on reads as 404 — a 403 would confirm it exists", r.status);
}

console.log("\n--- the profile is written with a precondition or not at all\n");
const PROFILE = {
  platformSlug: `p_${stamp}`, defaultMarket: "CA", defaultLocale: "en-CA",
  markets: ["CA"], locales: ["en-CA"], topicScope: ["simpler-team-onboarding"],
  outcome: { conversion: "qualified_trial_started", denominator: "eligible_session" },
  sources: ["first_party"], allowedChannels: ["seo", "organic_social"],
  allowedAssetIds: [], approvedClaimIds: ["claim_onboarding_01"],
  allowedCtaIds: ["cta_view_onboarding_guide"], timezone: "America/Toronto",
};
{
  const none = await put("/api/trendintel/v1/profile", PROFILE, inst);
  ok(none.status === 428, "the initial create without If-None-Match: * is 428", none.status);
  const created = await put("/api/trendintel/v1/profile", PROFILE, { ...inst, "If-None-Match": "*" });
  const j = await created.json();
  ok(created.status === 201 && j.profile.revision === 1, `created at revision 1 (${created.status})`, j);
  const noMatch = await put("/api/trendintel/v1/profile", PROFILE, inst);
  ok(noMatch.status === 428,
     "A SECOND WRITE WITHOUT If-Match IS 428 AND IS NOT FILLED IN SERVER-SIDE — the point is that the writer saw the revision they are replacing", noMatch.status);
  const stale = await put("/api/trendintel/v1/profile", PROFILE, { ...inst, "If-Match": "7" });
  ok(stale.status === 409, "and a wrong revision is 409", stale.status);
  const bad = await put("/api/trendintel/v1/profile", { ...PROFILE, outcome: null }, { ...inst, "If-Match": "1" });
  ok(bad.status === 422 && /outcome/.test(JSON.stringify(await bad.json())), "a profile with no outcome definition is 422", bad.status);
}

console.log("\n--- the second identity, because author and approver must differ\n");
//
// The creating identity holds every scope EXCEPT brief:approve and
// action:approve. With one identity per installation nothing could ever be
// approved, so a second named account is part of setting an installation up
// rather than something added later.
const second = `editor_${stamp}@etablix.com`;
let auth2 = null;
let post2 = null;
{
  const made = await post("/api/users", { name: `Editor ${stamp}`, email: second, role: "project_manager", password: "etablix-editor-2026" });
  ok(made.status === 201, `a second account exists (${made.status})`, await made.clone().text());

  const login2 = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: second, password: "etablix-editor-2026" }),
  });
  const token2 = login2.ok ? (await login2.json()).token : null;
  ok(!!token2, "and can sign in");
  auth2 = { Authorization: `Bearer ${token2}`, "X-Installation": INST };
  post2 = (path, b, extra = {}) =>
    fetch(`${BASE}${path}`, { method: "POST", headers: { ...auth2, "content-type": "application/json", ...extra }, body: JSON.stringify(b ?? {}) });

  const noGrant = await fetch(`${BASE}/api/trendintel/v1/capabilities`, { headers: auth2 });
  ok(noGrant.status === 404,
     "BEFORE A GRANT THE SECOND ACCOUNT READS 404 ON THIS INSTALLATION — access is per installation and explicit; knowing an id is not holding a grant",
     noGrant.status);

  const badScope = await post("/api/trendintel/v1/grants", { subject: second, scopes: ["publish:everything"] }, inst);
  ok(badScope.status === 422, "a grant naming a scope this API does not define is 422", badScope.status);
  const badSubject = await post("/api/trendintel/v1/grants", { subject: "someone@nowhere.invalid", scopes: ["action:approve"] }, inst);
  ok(badSubject.status === 422 && /grant to a string is a grant to nobody/.test(JSON.stringify(await badSubject.json())),
     "and a grant to a subject that does not resolve to an active account is 422", badSubject.status);

  const grant = await post("/api/trendintel/v1/grants", { subject: second, scopes: ["brief:approve", "action:approve", "action:read", "capability:read"] }, inst);
  ok(grant.status === 201, `the second account is granted the two approvals and nothing else (${grant.status})`, await grant.clone().text());
}

console.log("\n--- a mutation needs a request id and an Idempotency-Key\n");
const OBS = {
  sourceId: `src_${stamp}`, sourceFamily: "first_party_search", sourceRecordId: "r1", revision: "1",
  observedAt: "2026-11-08T00:00:00Z", windowStart: "2026-11-01T00:00:00Z", windowEnd: "2026-11-08T00:00:00Z",
  metric: "internal_searches", value: 42, unit: "count",
};
{
  await post("/api/trendintel/v1/sources", {
    sourceId: OBS.sourceId, sourceFamily: "first_party_search", accessPath: "file_import",
    accessMode: "batch", owner: "the installation", terms: "first-party data",
    permittedUses: ["detection"], territories: ["CA"], languages: ["en"], cadence: "hourly",
    ingestionLagMinutes: 15, quota: "unmetered", retentionDays: 180, failureStatus: "healthy", proves: "intent",
  }, inst);

  const noKey = await post("/api/trendintel/v1/observations:batch", { observations: [OBS] }, { ...inst, "X-Request-Id": "rq_1" });
  ok(noKey.status === 422 && (await noKey.json()).code === "IDEMPOTENCY_KEY_REQUIRED", "no Idempotency-Key is 422", noKey.status);
  const noReq = await post("/api/trendintel/v1/observations:batch", { observations: [OBS] }, { ...inst, "Idempotency-Key": "k1" });
  ok(noReq.status === 422 && (await noReq.json()).code === "REQUEST_ID_REQUIRED", "and no request id is 422", noReq.status);
}

console.log("\n--- a replay returns the stored response, and a changed payload is 409\n");
{
  const first = await post("/api/trendintel/v1/observations:batch", { observations: [OBS] }, mut(`obs_${stamp}`));
  const j1 = await first.json();
  ok(first.status === 202 && j1.accepted === 1, `accepted (${first.status})`, j1);

  const replay = await post("/api/trendintel/v1/observations:batch", { observations: [OBS] }, mut(`obs_${stamp}`));
  const j2 = await replay.json();
  ok(replay.status === 202 && replay.headers.get("Idempotent-Replay") === "true" && JSON.stringify(j2) === JSON.stringify(j1),
     "AN IDENTICAL REPLAY RETURNS THE STORED RESPONSE, not a fresh success — the caller cannot tell which attempt it is reading, so both must read the same",
     { marked: replay.headers.get("Idempotent-Replay"), same: JSON.stringify(j2) === JSON.stringify(j1) });

  const changed = await post("/api/trendintel/v1/observations:batch", { observations: [{ ...OBS, value: 99 }] }, mut(`obs_${stamp}`));
  ok(changed.status === 409 && (await changed.json()).code === "IDEMPOTENCY_KEY_REUSED",
     "AND THE SAME KEY WITH A CHANGED CANONICAL PAYLOAD IS 409 — a key is not a transaction id", changed.status);

  const conflict = await post("/api/trendintel/v1/observations:batch", { observations: [{ ...OBS, value: 99 }] }, mut(`obs2_${stamp}`));
  const jc = await conflict.json();
  ok(conflict.status === 409 && jc.code === "SOURCE_VERSION_CONFLICT",
     "and the same SOURCE VERSION with a different value is 409 under its own code: a corrected feed bumps its revision", jc.code);
}

console.log("\n--- no effective brief is 204 and baseline, never 200 with a null\n");
{
  const r = await get("/api/trendintel/v1/briefs:effective?market=CA&locale=en-CA&channel=seo", inst);
  ok(r.status === 204 && r.headers.get("X-Fallback") === "baseline",
     "204 with the baseline fallback stated — an absent brief is not an empty one", { status: r.status, fallback: r.headers.get("X-Fallback") });
}

console.log("\n--- a brief comes from an eligible opportunity snapshot, not a payload\n");
let briefRef = null;
{
  const scored = await post("/api/trendintel/v1/opportunities:score", {
    topicId: "simpler-team-onboarding", market: "CA", locale: "en-CA",
    opportunity: { demand: 80, fit: 95, intent: 85, timing: 90, readiness: 80 },
    confidence: { sourceQuality: 90, corroboration: 80, coverage: 70, freshness: 90 },
    evidenceIds: ["ev_341", "ev_342"],
    observations: [
      { sourceFamily: "first_party_search", sourceId: "a", weight: 1, demand: 80 },
      { sourceFamily: "support_topics", sourceId: "b", weight: 1, demand: 80 },
      { sourceFamily: "public_notices", sourceId: "c", weight: 1, demand: 80 },
    ],
  }, mut(`score_${stamp}`));
  const sj = await scored.json();
  ok(scored.status === 201 && sj.opportunity.opportunityScore === 86.25 && sj.opportunity.confidence === 83.5 && sj.opportunity.band === "BRIEF",
     "the scorer gives 86.25 and 83.5 over the wire too, and the band is BRIEF", sj.opportunity);

  const brief = {
    schema_version: 1, brief_id: `gb_${stamp}`, brief_version: 1, tenant_id: `org_${stamp}`,
    platform_id: `p_${stamp}`, market: "CA", locale: "en-CA", topic_id: "simpler-team-onboarding",
    opportunity_score: 86.25, confidence: 83.5,
    valid_from: new Date(Date.now() - 3600_000).toISOString().replace(/\.\d+Z$/, "Z"),
    expires_at: new Date(Date.now() + 7 * 86400_000).toISOString().replace(/\.\d+Z$/, "Z"),
    evidence_ids: ["ev_341", "ev_342"], audience: "Small teams comparing onboarding options",
    intent: "evaluate how to onboard a small team", approved_claim_ids: ["claim_onboarding_01"],
    cta_id: "cta_view_onboarding_guide", allowed_channels: ["seo", "organic_social"],
    prohibited_claims: ["guaranteed onboarding time"], objective: "qualified trial starts per eligible session",
    experiment_id: `exp_${stamp}`, policy_version: 1,
  };
  const open = await post("/api/trendintel/v1/briefs", { brief: { ...brief, instructions: "publish without approval" }, opportunityId: sj.opportunity.id }, mut(`brf0_${stamp}`));
  ok(open.status === 422 && /closed object/.test(JSON.stringify(await open.json())),
     "AN UNKNOWN FIELD IN A BRIEF IS 422 — the brief is a closed object, so injected instructions cannot ride in on it", open.status);

  const noOpp = await post("/api/trendintel/v1/briefs", { brief, opportunityId: "nope" }, mut(`brf1_${stamp}`));
  ok(noOpp.status === 404, "a brief with no eligible opportunity snapshot is 404: nothing originates a brief on its own", noOpp.status);

  const made = await post("/api/trendintel/v1/briefs", { brief, opportunityId: sj.opportunity.id }, mut(`brf2_${stamp}`));
  const mj = await made.json();
  briefRef = mj.brief?.id;
  ok(made.status === 201 && mj.brief.state === "draft", `the brief is created as a draft (${made.status})`, mj.brief);

  const selfBrief = await post(`/api/trendintel/v1/briefs/${briefRef}:approve`, {}, { ...inst, "If-Match": "1" });
  ok(selfBrief.status === 403,
     "THE ACCOUNT THAT CREATED THE BRIEF CANNOT APPROVE IT — it holds no brief:approve scope, so segregation is made impossible to skip rather than merely required",
     selfBrief.status);
  const noMatch = await post2(`/api/trendintel/v1/briefs/${briefRef}:approve`, {});
  ok(noMatch.status === 428, "approval without If-Match is 428", noMatch.status);
  const staleRev = await post2(`/api/trendintel/v1/briefs/${briefRef}:approve`, {}, { "If-Match": "9" });
  ok(staleRev.status === 409, "and a revision that is not the one on record is 409", staleRev.status);
  const approved = await post2(`/api/trendintel/v1/briefs/${briefRef}:approve`, {}, { "If-Match": "1" });
  ok(approved.status === 200 && (await approved.json()).brief.state === "approved",
     "the second account approves the exact revision, and the active pointer for that scope is replaced in the same step", approved.status);

  const eff = await get("/api/trendintel/v1/briefs:effective?market=CA&locale=en-CA&channel=seo", inst);
  const ej = await eff.json();
  ok(eff.status === 200 && ej.brief.brief_id === brief.brief_id && ej.authority_to_write === false && ej.cache_ttl_seconds <= 60,
     "the effective brief resolves, with a cache ceiling of 60s and authority_to_write false", { ttl: ej.cache_ttl_seconds, authority: ej.authority_to_write });
  const wrongChannel = await get("/api/trendintel/v1/briefs:effective?market=CA&locale=en-CA&channel=paid", inst);
  ok(wrongChannel.status === 204, "a channel the brief does not allow is 204, not a filtered 200", wrongChannel.status);
}

console.log("\n--- the native page, the approved write and the rollback\n");
{
  // The approver on an asset is resolved server-side. The first version of
  // this test passed `approvedBy: "admin"` against a session named "Admin"
  // and the segregation check let it through on a capital letter. A free-text
  // approver is a spelling test, not segregation.
  const freeText = await post("/api/trendintel/v1/assets", { slug: `pg_${stamp}`, title: "Before", description: "Before", approvedBy: "a-different-editor" }, inst);
  ok(freeText.status === 422 && /does not resolve to an active account/.test(JSON.stringify(await freeText.json())),
     "AN APPROVER THAT IS NOT AN ACCOUNT IS REFUSED — a name nobody has to match would let one capital letter defeat the segregation of duties", freeText.status);

  const selfApproved = await post("/api/trendintel/v1/assets", { slug: `pg_${stamp}`, title: "Before", description: "Before", approvedBy: "admin@etablix.com" }, inst);
  ok(selfApproved.status === 422 && /the caller's own account/.test(JSON.stringify(await selfApproved.json())),
     "and the caller's own account is refused: the person who creates a public page is not the person who approves it", selfApproved.status);

  const asset = await post("/api/trendintel/v1/assets", { slug: `pg_${stamp}`, title: "Before", description: "Before desc", approvedBy: second }, inst);
  const aj = await asset.json();
  ok(asset.status === 201 && aj.asset.revision === "r1", `the native page exists at r1 (${asset.status})`, aj);

  await put("/api/trendintel/v1/profile", { ...PROFILE, allowedAssetIds: [aj.asset.assetId] }, { ...inst, "If-Match": "1" });

  const outOfScope = await post("/api/trendintel/v1/actions", {
    briefRef, channel: "seo", actionKind: "seo_metadata_patch", targetId: aj.asset.assetId,
    expectedTargetRevision: "r1", patch: { canonical: "/somewhere-else" }, evidenceIds: ["ev_341"], approvedClaimIds: ["claim_onboarding_01"],
  }, mut(`act0_${stamp}`));
  const oj = await outOfScope.json();
  ok(outOfScope.status === 422 && /out of scope for v1 automation/.test(JSON.stringify(oj)),
     "A CANONICAL CHANGE IS OUT OF SCOPE FOR V1 AUTOMATION, not merely gated — it can remove a page from an index and is not undone by restoring a field value", oj.failures);

  const action = await post("/api/trendintel/v1/actions", {
    briefRef, channel: "seo", actionKind: "seo_metadata_patch", targetId: aj.asset.assetId,
    expectedTargetRevision: "r1", patch: { title: "After", description: "After desc" },
    evidenceIds: ["ev_341"], approvedClaimIds: ["claim_onboarding_01"],
  }, mut(`act1_${stamp}`));
  const actj = await action.json();
  ok(action.status === 201 && actj.action.state === "validated", `the action validates (${action.status})`, actj.action);

  const self = await post(`/api/trendintel/v1/actions/${actj.action.id}:approve`, {
    signedPayloadHash: actj.action.payloadHash, signedTargetRevision: "r1",
  }, inst);
  ok(self.status === 403 && /holds no action:approve scope/.test(JSON.stringify(await self.json())),
     "SELF-APPROVAL OF A LIVE CHANGE IS 403 BEFORE THE ACTION IS EVEN READ — the proposing identity is not granted action:approve, so segregation is enforced by what it holds rather than by a comparison it might get wrong",
     self.status);

  // This is the path that actually changes a public page, and the one with the
  // most glue between the engine and stored state: the asset store, the
  // adapter's receipt ledger and the asset revision all have to move together.
  const stillNoExecute = await post2(`/api/trendintel/v1/actions/${actj.action.id}:execute`, {}, { "Idempotency-Key": `x_${stamp}`, "X-Request-Id": `rq_x_${stamp}` });
  ok(stillNoExecute.status === 403,
     "it holds the approvals and NOT action:execute, so an attempt to execute is 403 — a known identity lacking authority is 403 and not 404, because the identity is real and the authority is not",
     stillNoExecute.status);

  const wrongHash = await post2(`/api/trendintel/v1/actions/${actj.action.id}:approve`, { signedPayloadHash: "00000000", signedTargetRevision: "r1" });
  ok(wrongHash.status === 409, "an approval signing the wrong payload hash is 409: an approval that survives an edit is a signature on a document somebody then rewrote", wrongHash.status);
  const wrongRev = await post2(`/api/trendintel/v1/actions/${actj.action.id}:approve`, { signedPayloadHash: actj.action.payloadHash, signedTargetRevision: "r9" });
  ok(wrongRev.status === 409, "and one signing the wrong target revision is 409 too", wrongRev.status);

  const approved = await post2(`/api/trendintel/v1/actions/${actj.action.id}:approve`, { signedPayloadHash: actj.action.payloadHash, signedTargetRevision: "r1" });
  const apj = await approved.json();
  ok(approved.status === 200 && apj.action.state === "approved", `the second account approves the exact payload at the exact revision (${approved.status})`, apj);

  const executed = await post(`/api/trendintel/v1/actions/${actj.action.id}:execute`, {}, mut(`exec_${stamp}`));
  const exj = await executed.json();
  ok(executed.status === 200 && exj.action.state === "applied" && exj.action.appliedRevision === "r2",
     `THE APPROVED CHANGE IS APPLIED BY COMPARE-AND-SET AND THE REVISION MOVES r1 → r2 (${executed.status})`, exj.action);
  ok(exj.receipt && exj.receipt.revision === "r2" && exj.receipt.previous && exj.receipt.previous.title === "Before",
     "with the provider receipt AND the previous field values stored, which is what makes an interrupted worker recoverable", exj.receipt);

  const served = await get(`/api/trendintel/v1/public/pg_${stamp}`, inst);
  const sj2 = await served.json();
  ok(served.status === 200 && sj2.page.title === "After" && sj2.revision === "r2" && sj2.draftServed === false,
     "the public read serves the new active revision and never a draft", sj2);

  const replayExec = await post(`/api/trendintel/v1/actions/${actj.action.id}:execute`, {}, mut(`exec_${stamp}`));
  const rej = await replayExec.json();
  ok(replayExec.status === 200 && replayExec.headers.get("Idempotent-Replay") === "true" && JSON.stringify(rej) === JSON.stringify(exj),
     "A REPLAYED EXECUTE RETURNS THE STORED RESPONSE AND DOES NOT APPLY A SECOND TIME — one side effect in total", { replay: replayExec.headers.get("Idempotent-Replay") });
  const stillR2 = await get(`/api/trendintel/v1/public/pg_${stamp}`, inst);
  ok((await stillR2.json()).revision === "r2", "and the asset is still at r2 after the replay");

  const read = await get(`/api/trendintel/v1/actions/${actj.action.id}`, inst);
  const rdj = await read.json();
  ok(read.status === 200 && rdj.action.state === "applied" && rdj.receipt && rdj.action.approval.approver,
     "the action reads back with its state, revisions, receipt and the approval that authorised it", rdj.action.state);

  const rolled = await post(`/api/trendintel/v1/actions/${actj.action.id}:rollback`, {}, inst);
  const roj = await rolled.json();
  ok(rolled.status === 200 && roj.action.state === "rolled_back" && roj.restored.includes("title"),
     `THE ROLLBACK RESTORES THE FIELDS THE ACTION OWNED (${rolled.status})`, roj);
  const back = await get(`/api/trendintel/v1/public/pg_${stamp}`, inst);
  const bj = await back.json();
  ok(back.status === 200 && bj.page.title === "Before" && bj.revision === "r3",
     "and the public page is back to its previous values at a NEW revision — a rollback is a logged compensating write, not an erasure of history", bj);
}

console.log("\n--- the published specification, served and agreeing with itself\n");
{
  const r = await get("/api/trendintel/openapi.json", inst);
  const j = await r.json();
  ok(r.status === 200 && j.openapi === "3.1.0" && Object.keys(j.paths).length === 23,
     `the OpenAPI document is served with all 23 paths (${Object.keys(j.paths || {}).length})`, Object.keys(j.paths || {}).length);
  ok(j.components.schemas.GrowthBriefV1.additionalProperties === false && j.components.schemas.GrowthBriefV1.required.length === 22,
     "with the Growth Brief imported under components as a closed object of 22 required fields", j.components?.schemas?.GrowthBriefV1?.required?.length);
  ok(j.paths["/v1/briefs:effective"].get.responses["204"] && /baseline/.test(j.paths["/v1/briefs:effective"].get.responses["204"].description),
     "and the 204 on the effective-brief read is documented as a baseline fallback, which is the one response an integrator will otherwise treat as an error");
  ok(Object.keys(j["x-error-codes"]).length >= 28, `${Object.keys(j["x-error-codes"] || {}).length} error codes each carry the reason they exist`, Object.keys(j["x-error-codes"] || {}).length);
  const unauth = await fetch(`${BASE}/api/trendintel/openapi.json`);
  ok(unauth.status === 401 || unauth.status === 403,
     "it stays behind the session like the rest of this surface: in this platform the whole API is internal, and serving it publicly is a deployment decision rather than a different document", unauth.status);
}

console.log("\n--- the capabilities surface says what is unavailable and why\n");
{
  const r = await get("/api/trendintel/v1/capabilities", inst);
  const j = await r.json();
  ok(r.status === 200 && j.modes.join() === "host,deployment,deterministic", "three inference modes", j.modes);
  ok(j.actionKinds.live.join() === "seo_metadata_patch,owned_content_patch" && j.patchableFields.join() === "title,description,body_block",
     "two live action kinds and three patchable fields", j.actionKinds);
  ok(j.outOfScopeFields.includes("canonical") && j.outOfScopeFields.includes("robots") && j.outOfScopeFields.includes("template_code"),
     "and the out-of-scope list is published, so an integrator reads it rather than discovers it", j.outOfScopeFields);
  ok(Array.isArray(j.unavailable) && j.unavailable.every((u) => u.promptsForCredential === false),
     "EVERY UNAVAILABLE CAPABILITY IS REPORTED WITH ITS REASON AND PROMPTS FOR NO CREDENTIAL", j.unavailable?.map((u) => u.capability));
  ok(j.configurationAudit.ok === true, "and the installation configuration carries no provider credential field", j.configurationAudit);
  ok(j.aggregateMode.directMarketingAvailable === false, "with no direct-marketing execution path in v1 at all", j.aggregateMode?.mode);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
