/**
 * THE LOCK. Nothing built so far may silently change or drop.
 *
 *   node backend/test/lock.test.mjs
 *
 * Every other test in this suite asks whether something WORKS. This one asks
 * whether it is still THERE, and whether it is still being checked — which are
 * different questions and the second one has already been answered wrongly.
 *
 * WHAT PROMPTED IT. Four test files existed in this directory and were not
 * named in run-all.sh: approach-brief, credentials, ratelimit and
 * retired-urls. A hundred and forty assertions, written deliberately, running
 * nowhere. They all passed when finally run, so nothing was broken — but
 * nothing would have been noticed if it had been. A test that is not run is
 * not a test; it is a file that looks like one, and it is the most expensive
 * kind of reassurance there is.
 *
 * THREE LOCKS, AND THEY FAIL IN DIFFERENT DIRECTIONS.
 *
 *   1 · EVERY TEST FILE RUNS. The directory and run-all.sh must agree. A new
 *       file that nobody registered fails here, which is the only moment
 *       anybody would find out.
 *   2 · EVERY ACCEPTANCE TEST IS STILL PROVED. The specification has
 *       twenty-eight. Each has a marker next to the assertion that proves it,
 *       so the proof and the claim cannot drift apart: delete the assertion
 *       and the marker goes with it, and this fails naming the number.
 *   3 · EVERY RULE SET IS LOCKED BY ID, NOT BY COUNT. A count catches a
 *       deletion and says nothing about a rename. An id set catches both —
 *       and it fails on an addition too, which is correct for a lock: a new
 *       rule is a deliberate act and should require saying so here.
 *
 * WHY ID SETS HERE AND AGREEMENT CHECKS IN engines.test. The engine registry
 * has a second register to be compared against, so agreement is the better
 * guard and a literal count there was actively harmful. These lists have no
 * second source of truth — POSITION_RULES is the only statement of what the
 * position guard refuses — so the lock has to be the list itself.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 400)}` : ""}`); }
};

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

/* ─── 1 · every test file runs ──────────────────────────────────────────── */

console.log("\n=== every test file in this directory is run ===\n");
//
// Helpers live here too and are not tests. Each exemption is named, with the
// reason, because an unexplained exemption list is where a test goes to hide.
const NOT_TESTS = {
  "mock-anthropic": "the scripted model the suites run against — a fixture, not a test",
};
{
  const files = fs.readdirSync(here)
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => f.replace(/\.mjs$/, ""))
    .filter((f) => f !== "lock.test");

  const runAll = fs.readFileSync(path.join(here, "run-all.sh"), "utf8");
  const registered = new Set((runAll.match(/[a-z0-9-]+\.(?:test|e2e)\b/g) || []));

  const unregistered = files.filter((f) => !registered.has(f) && !(f in NOT_TESTS));
  ok(unregistered.length === 0,
     "EVERY TEST FILE IS NAMED IN run-all.sh — a test that is not run is a file that looks like one, which is the most expensive kind of reassurance there is",
     unregistered);

  const exempt = Object.keys(NOT_TESTS).filter((f) => files.includes(f));
  ok(exempt.length === Object.keys(NOT_TESTS).length,
     `the ${exempt.length} exemption(s) are named with a reason, because an unexplained exemption list is where a test goes to hide`,
     Object.entries(NOT_TESTS).map(([k, v]) => `${k}: ${v}`));

  // The other direction: a suite named in run-all.sh whose file was deleted
  // would fail the run loudly, but naming it here says so at the lock.
  const missing = [...registered].filter((r) => !fs.existsSync(path.join(here, `${r}.mjs`)));
  ok(missing.length === 0, "and every suite named in run-all.sh still has a file", missing);

  ok(files.length >= 55, `${files.length} test files present`, files.length);
}

/* ─── 2 · every acceptance test is still proved ─────────────────────────── */

console.log("\n=== all twenty-eight acceptance tests still have a proof ===\n");
//
// The marker sits next to the assertion. Delete the assertion and the marker
// goes with it, so the claim and the proof cannot drift apart. AT-24's marker
// is on the A4-from-an-upload assertion, which proves the half that matters —
// a document's content cannot make the agent act. There is no send path for
// it to abuse; that is asserted separately in the trigger-watch rules.
//
// A MARKER ONLY COUNTS INSIDE AN ok() CALL, and that is not pedantry: the
// first version of this lock searched the whole file, and deleting the
// AT-19 assertion left the number in the file's own header comment, so the
// lock passed over an acceptance test that was no longer proved. A guard
// satisfied by prose is the exact failure this suite keeps finding
// elsewhere. So the marker has to live in the assertion's own message, where
// deleting the assertion deletes the claim with it.
function okCalls(src) {
  const out = [];
  let i = 0;
  for (;;) {
    const j = src.indexOf("ok(", i);
    if (j < 0) break;
    const before = j > 0 ? src[j - 1] : " ";
    if (/[\w$.]/.test(before)) { i = j + 3; continue; }
    let depth = 0, k = j + 2;
    for (; k < src.length; k += 1) {
      if (src[k] === "(") depth += 1;
      else if (src[k] === ")") { depth -= 1; if (depth === 0) break; }
    }
    out.push(src.slice(j, k + 1));
    i = k + 1;
  }
  return out.join("\n");
}
{
  const suites = fs.readdirSync(here).filter((f) => f.endsWith(".mjs") && f !== "lock.test.mjs");
  const found = new Map();
  for (const f of suites) {
    const text = okCalls(fs.readFileSync(path.join(here, f), "utf8"));
    for (const m of text.match(/AT-\d{2}/g) || []) {
      if (!found.has(m)) found.set(m, []);
      if (!found.get(m).includes(f)) found.get(m).push(f);
    }
  }
  const wanted = Array.from({ length: 28 }, (_, i) => `AT-${String(i + 1).padStart(2, "0")}`);
  const unproved = wanted.filter((a) => !found.has(a));
  ok(unproved.length === 0,
     "EVERY ONE OF AT-01 TO AT-28 IS NAMED INSIDE AN ASSERTION — not in a heading, not in a comment, where deleting the proof deletes the claim",
     unproved);
  ok(found.size === 28, `twenty-eight proved and no more invented (${found.size})`, [...found.keys()].filter((k) => !wanted.includes(k)));
}

console.log("\n=== and all twenty-two Trend Intelligence conformance scenarios ===\n");
//
// The same lock, the same reason, a different specification. TI-01 to TI-22
// are the reference conformance scenarios in §21 of the Trend Intelligence
// build specification, and every one of them is about something that READS AS
// SUCCESS — a replayed batch inflating a count, a 403 that confirms an id
// exists, a worker that crashed after the provider succeeded, a template
// billed as a draft, a late billing event restoring access, a restore
// resurrecting deleted evidence. A marker only counts inside an ok() call.
{
  const suites = fs.readdirSync(here).filter((f) => f.endsWith(".mjs") && f !== "lock.test.mjs");
  const found = new Map();
  for (const f of suites) {
    const text = okCalls(fs.readFileSync(path.join(here, f), "utf8"));
    for (const m of text.match(/TI-\d{2}/g) || []) {
      if (!found.has(m)) found.set(m, []);
      if (!found.get(m).includes(f)) found.get(m).push(f);
    }
  }
  const wanted = Array.from({ length: 22 }, (_, i) => `TI-${String(i + 1).padStart(2, "0")}`);
  const unproved = wanted.filter((a) => !found.has(a));
  ok(unproved.length === 0,
     "EVERY ONE OF TI-01 TO TI-22 IS NAMED INSIDE AN ASSERTION — the conformance list is the list of ways this kind of system is known to fail, so a scenario that stops being proved is a failure mode that stops being watched",
     unproved);
  ok(found.size === 22, `twenty-two proved and no more invented (${found.size})`, [...found.keys()].filter((k) => !wanted.includes(k)));
}

/* ─── 3 · every rule set is locked by id ────────────────────────────────── */

console.log("\n=== every rule set is locked by id, so a rename fails too ===\n");

const { POSITION_RULES } = await import("../lib/positionguard.js");
const { ACTIVITIES, ORDER } = await import("../lib/l7/bidprogramme.js");
const { GATES } = await import("../lib/l7/gates.js");
const { CLARIFICATION_STATUS, ALLOWANCE_PLACES, OBSERVATION_KINDS } = await import("../lib/tendercheck.js");
const { SERVICE_CODES, SERVICE_CATEGORIES, LEGACY_FAMILIES } = await import("../../shared/servicecodes.js");
const { OFF_RULES, STOP_RULES, OFF_HIRE_FACTS } = await import("../lib/agentos/offhire.js");
const { EXECUTION_CLASSES, DENIED_ACTIONS, DELEGATION_BINDINGS } = await import("../lib/agentos/autonomy.js");
const { JURISDICTIONS, REGULATED_ACTIVITIES } = await import("../lib/agentos/jurisdiction.js");
const { MOB_GATES, TEST_STATES } = await import("../lib/agentos/mobilisation.js");
const { SUPPLIER_STATES } = await import("../lib/agentos/eligibility.js");
const { MANIFEST_CATEGORIES } = await import("../lib/agentos/cutover.js");
const { SLA_CLOCKS, PRIORITIES } = await import("../lib/agentos/sla.js");
const { CIS_FACTS, VAT_FACTS } = await import("../lib/agentos/tax.js");
const { DISPATCH_STATES } = await import("../lib/agentos/outbox.js");
const { WORKFLOWS, TASK_STATES, HELD_STATES } = await import("../lib/agentos/orchestration.js");
const { OVERNIGHT_APPROVALS } = await import("../lib/agentos/capacity.js");
const { DELIVERY_MODELS, OFFERABLE_MODELS } = await import("../../shared/constants.js");
const { OPPORTUNITY_WEIGHTS, CONFIDENCE_WEIGHTS, VETOES } = await import("../lib/trendintel/score.js");
const { ACCESS_PATHS, PROVES, CONTEXT_ONLY, REGISTRATION_FIELDS } = await import("../lib/trendintel/sources.js");
const { BRIEF_REQUIRED, BRIEF_CHANNELS, ROUTES_AVAILABLE } = await import("../lib/trendintel/brief.js");
const { INFERENCE_MODES, REQUEST_FIELDS, RESPONSE_FIELDS, ROUTE_STATUS } = await import("../lib/trendintel/inference.js");
const { LIVE_ACTION_KINDS, DRAFT_ACTION_KINDS, PATCHABLE_FIELDS, OUT_OF_SCOPE_FIELDS, ACTION_STATES, PREFLIGHT_CHECKS } = await import("../lib/trendintel/actions.js");
const { RECEIPT_STATES, ADAPTER_CAPABILITIES } = await import("../lib/trendintel/adapter.js");
const { PLANS, ENTITLEMENT_STATES, OFFLINE_ENTITLEMENT_FIELDS } = await import("../lib/trendintel/entitlement.js");
const { HYPOTHESIS_FIELDS, CONTROL_METHODS, CAUSAL_METHODS, GUARDRAIL_KINDS } = await import("../lib/trendintel/measurement.js");
const { MINIMUM_PROFILE, BASELINE_SOURCES, MODES, RELEASE_GATES, HARD_RELEASE_GATE } = await import("../lib/trendintel/installation.js");
const { OBSERVATION_FIELDS } = await import("../lib/trendintel/observations.js");

const ids = (list, key = "id") => list.map((x) => (typeof x === "string" ? x : x[key])).join(",");

const LOCKS = [
  ["the three position refusals", ids(POSITION_RULES),
   "cdm,cdm-duty,self-delivery,own-plant,holds-contracts,holds-money"],
  ["the bid programme's ten activities", ids(ACTIVITIES),
   "enquiries,returns,surveys,clarifications,design,estimate,review,settlement,signature,internal"],
  ["and its nine ordering constraints", ORDER.map((o) => `${o[0]}>${o[1]}`).join(","),
   "enquiries>returns,returns>estimate,surveys>estimate,clarifications>estimate,design>estimate,estimate>settlement,review>settlement,settlement>signature,signature>internal"],
  ["the eight lifecycle gates", ids(GATES),
   "G0_PURSUE,G1_COMPLIANCE_BASELINE,G2_SCOPE_FREEZE,G3_CONTRACT_POSITION,G4_PRICE_RELEASE,G5_SUBMISSION_RELEASE,G6_AWARD,G7_LESSONS"],
  ["the four clarification statuses", CLARIFICATION_STATUS.join(","), "RAISED,ANSWERED,UNANSWERED,WITHDRAWN"],
  ["where a risk allowance may sit", ALLOWANCE_PLACES.join(","), "PACKAGE QUOTE,CENTRAL CONTINGENCY,BASE ESTIMATE,NONE"],
  ["the three observation kinds", OBSERVATION_KINDS.join(","), "OBSERVED,STATED,UNCONFIRMED"],
  ["the twenty-one service codes", SERVICE_CODES.map((s) => s.code).join(","),
   "01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21"],
  ["the six categories", ids(SERVICE_CATEGORIES), "design,establish,utilities,buildings,operate,demobilise"],
  ["the seven legacy families", ids(LEGACY_FAMILIES), "F1,F2,F3,F4,F5,F6,F7"],
  ["the six off-hire rules", ids(OFF_RULES), "OFF-01,OFF-02,OFF-03,OFF-04,OFF-05,OFF-06"],
  ["the four charge-stop rules", STOP_RULES.join(","), "NOTICE,RETURN,COLLECTION,CONDITION"],
  ["the ten off-hire facts", OFF_HIRE_FACTS.join(","),
   "requested,noticeDispatched,supplierConfirmed,contractEffectiveStop,isolated,collected,returned,damageAssessed,hireAccrued,invoiceClosed"],
  ["the five execution classes", ids(EXECUTION_CLASSES), "A0,A1,A2,A3,A4"],
  ["the five denied actions", ids(DENIED_ACTIONS), "energise,gate,impersonate,bypass-hold,fabricate"],
  ["the twelve delegation bindings", DELEGATION_BINDINGS.join(","),
   "actor,entity,project,action,scope,channel,recipient,threshold,cumulativeCap,effectiveFrom,effectiveTo,revision"],
  ["the two jurisdictions", ids(JURISDICTIONS), "england,scotland"],
  ["the four regulated activities", ids(REGULATED_ACTIVITIES), "dewatering,site-runoff,building-consent,procurement"],
  ["the seven mobilisation gates", ids(MOB_GATES), "order,dispatch,lift,connect,open,relocate,remove"],
  ["the seven test-attempt states", TEST_STATES.join(","), "PREPARED,READY,RUNNING,PASSED,FAILED,ABORTED,INVALID"],
  ["the fourteen supplier states", SUPPLIER_STATES.join(","),
   "CANDIDATE,EVIDENCE_PENDING,ELIGIBLE,INVITED,OFFER_RECEIVED,EVALUATED,RECOMMENDED,AWARD_PENDING,AWARDED,MOBILISATION_HOLD,READY,LIVE,SUSPENDED,CLOSED"],
  ["the seven cutover manifest categories", MANIFEST_CATEGORIES.join(","),
   "contracts,openOrders,invoices,retentions,warranties,noticeTimers,legalEntities"],
  ["the four SLA clocks", SLA_CLOCKS.join(","), "acknowledged,attended,restored,closureVerified"],
  ["the three incident priorities", PRIORITIES.join(","), "P1,P2,P3"],
  ["the CIS facts", CIS_FACTS.join(","), "constructionOperations,partiesRegistered,paymentType"],
  ["the VAT facts", VAT_FACTS.join(","), "constructionServices,bothVatRegistered,endUser,cisApplies"],
  ["the six dispatch states", DISPATCH_STATES.join(","),
   "PENDING,SENT_UNCONFIRMED,RECEIPT_VERIFIED,UNKNOWN_OUTCOME,REJECTED,CANCELLED"],
  ["the ten workflows", ids(WORKFLOWS), "W01,W02,W03,W04,W05,W06,W07,W08,W09,W10"],
  ["the nine task states", TASK_STATES.join(","),
   "QUEUED,RUNNING,WAITING_INPUT,WAITING_AUTHORITY,BLOCKED,SUCCEEDED,FAILED_RETRYABLE,FAILED_TERMINAL,CANCELLED"],
  ["the held states that still count as owned", [...HELD_STATES].sort().join(","),
   "BLOCKED,WAITING_AUTHORITY,WAITING_INPUT"],
  ["the three overnight approvals", OVERNIGHT_APPROVALS.join(","), "fireApproval,occupationApproval,useClassification"],
  ["the three delivery models", ids(DELIVERY_MODELS), "advisory,integrator,prime"],

  // Trend Intelligence. Every one of these is a list the specification states
  // and an implementation would otherwise drift from one field at a time.
  ["the five opportunity weights", Object.entries(OPPORTUNITY_WEIGHTS).map(([k, v]) => `${k}=${v}`).join(","),
   "demand=0.25,fit=0.25,intent=0.2,timing=0.15,readiness=0.15"],
  ["the four confidence weights, with model certainty deliberately absent",
   Object.entries(CONFIDENCE_WEIGHTS).map(([k, v]) => `${k}=${v}`).join(","),
   "sourceQuality=0.35,corroboration=0.25,coverage=0.2,freshness=0.2"],
  ["the six scoring vetoes", ids(VETOES),
   "out-of-market,unsupported-claim,restricted-topic,inventory-unavailable,illegal-targeting,readiness-absent"],
  ["the three access paths", ACCESS_PATHS.join(","), "public_keyless,host_mediated,file_import"],
  ["the four proof classes", PROVES.join(","), "intent,decision,attention,context"],
  ["and which of them cannot corroborate alone", CONTEXT_ONLY.join(","), "attention,context"],
  ["the fourteen source registration fields", REGISTRATION_FIELDS.join(","),
   "sourceId,sourceFamily,accessPath,accessMode,owner,terms,permittedUses,territories,languages,cadence,ingestionLagMinutes,quota,retentionDays,failureStatus"],
  ["the ten observation fields", OBSERVATION_FIELDS.join(","),
   "sourceId,sourceFamily,sourceRecordId,revision,observedAt,windowStart,windowEnd,metric,value,unit"],
  ["the twenty-two required Growth Brief fields", BRIEF_REQUIRED.join(","),
   "schema_version,brief_id,brief_version,tenant_id,platform_id,market,locale,topic_id,opportunity_score,confidence,valid_from,expires_at,evidence_ids,audience,intent,approved_claim_ids,cta_id,allowed_channels,prohibited_claims,objective,experiment_id,policy_version"],
  ["the six-value channel enum", BRIEF_CHANNELS.join(","), "seo,organic_social,sales_enablement,owned_placement,lifecycle,paid"],
  ["and the two routes v1 actually ships", ROUTES_AVAILABLE.join(","), "seo,organic_social"],
  ["the three inference modes", INFERENCE_MODES.join(","), "host,deployment,deterministic"],
  ["the eight structured-request fields", REQUEST_FIELDS.join(","),
   "installationId,requestId,purpose,modelAlias,schemaRevision,input,deadlineMs,tokenLimit"],
  ["the five response fields", RESPONSE_FIELDS.join(","), "requestId,output,resolvedModel,usage,status"],
  ["the six route statuses", ROUTE_STATUS.join(","), "ok,invalid_output,rate_limited,unavailable,unauthorised,timeout"],
  ["the two live action kinds", LIVE_ACTION_KINDS.join(","), "seo_metadata_patch,owned_content_patch"],
  ["the two draft artefact kinds", DRAFT_ACTION_KINDS.join(","), "seo_page_draft,organic_social_draft"],
  ["the three patchable fields", PATCHABLE_FIELDS.join(","), "title,description,body_block"],
  ["what is out of scope for v1 automation rather than merely gated", OUT_OF_SCOPE_FIELDS.join(","),
   "url,slug,redirects,canonical,robots,noindex,structured_data,schema,permissions,template_code,sitemap"],
  ["the ten action states", ACTION_STATES.join(","),
   "proposed,validated,pending_approval,approved,queued,executing,applied,failed,reconciliation_required,rolled_back"],
  ["the eight preflight checks", PREFLIGHT_CHECKS.join(","),
   "schema,scope,assetAllowlist,entitlement,freeze,briefFresh,evidence,approvedClaims"],
  ["the three receipt states, because collapsing unknown into not-found is the duplicate it prevents",
   RECEIPT_STATES.join(","), "applied,not_found,unknown"],
  ["the four adapter methods", ADAPTER_CAPABILITIES.join(","), "get_asset,apply_patch,get_receipt,restore_patch"],
  ["the four packages", ids(PLANS), "internal,starter,growth,enterprise"],
  ["the five entitlement statuses", ENTITLEMENT_STATES.join(","), "trial,active,grace,suspended,ended"],
  ["the five offline entitlement fields", OFFLINE_ENTITLEMENT_FIELDS.join(","), "deploymentId,features,limit,expiry,keyId"],
  ["the eleven fields frozen at brief approval", HYPOTHESIS_FIELDS.join(","),
   "hypothesis,baseline,primaryOutcome,segment,controlMethod,minimumDetectableEffect,observationTarget,windowStart,windowEnd,guardrails,owner"],
  ["the four control methods", CONTROL_METHODS.join(","), "holdout,matched_control,window_comparison,none"],
  ["and which two of them support an incremental estimate", CAUSAL_METHODS.join(","), "holdout,matched_control"],
  ["the seven guardrail kinds", GUARDRAIL_KINDS.join(","),
   "cost_per_qualified_outcome,conversion_rate,unsubscribe_rate,cancellation_rate,refund_rate,policy_incident,stock_unavailable"],
  ["the six minimum profile fields", MINIMUM_PROFILE.join(","),
   "platformSlug,defaultMarket,defaultLocale,topicScope,outcome,sources"],
  ["what a new installation enables and nothing more", BASELINE_SOURCES.join(","), "first_party,manual_import"],
  ["the three installation modes", MODES.join(","), "draft_only,shadow,live"],
  ["the five build-order gates", ids(RELEASE_GATES), "G1,G2,G3,G4,G5"],
  ["the twenty items of the hard release gate", HARD_RELEASE_GATE.join(","),
   "noCustomerProviderSecrets,noHostAi,noExternalAnalytics,noOauth,noThirdPartyConnector,thirdPartyEgressBlocked,localInferenceProfile,firstPartyActivitySimulated,oneSharedBriefGenerated,realModelOutput,seoChangeApprovedAndApplied,marketingChangeApprovedAndApplied,nativeSurfacePublished,eligibleVisitsCaptured,configuredOutcomesCaptured,measurementReportProduced,priorRevisionRestored,noNewKeysRequested,noExternalDestinationContacted,auditChainComplete"],
];

for (const [what, actual, expected] of LOCKS) {
  ok(actual === expected, what, actual === expected ? undefined : { expected, actual });
}

console.log("\n=== and the positions that must never quietly become offerable ===\n");
{
  ok(ids(OFFERABLE_MODELS) === "advisory,integrator",
     "ONLY ADVISORY AND INTEGRATOR ARE OFFERABLE — Model C becoming offerable by accident is the single change in this codebase with an uninsured contract on the other side of it",
     ids(OFFERABLE_MODELS));
  const prime = DELIVERY_MODELS.find((m) => m.id === "prime");
  ok(prime && prime.offerable === false && Boolean(prime.notOfferableBecause),
     "and Prime carries the reason it is not, so nobody flips the flag without reading it", prime?.notOfferableBecause);
  ok(prime && prime.name === "Prime Service Contractor",
     'named "Prime Service Contractor" and never "Principal" — one word from a CDM statutory role several clients hold themselves', prime?.name);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
