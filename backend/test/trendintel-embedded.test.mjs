/**
 * EMBEDDED, AND INVISIBLE. Both halves, because either one alone is a failure.
 *
 *   node backend/test/trendintel-embedded.test.mjs
 *
 * `trendintel.test.mjs` proves the engine works. This proves it is PART OF
 * THIS PLATFORM — that the platform's own machinery drives it — and that none
 * of it is visible to anybody outside the business.
 *
 * WHY THAT NEEDS ITS OWN SUITE. An engine can pass every conformance scenario
 * and still be a second product: its own sources, its own queue, its own
 * surface, driven by nobody. Every assertion in the first half below reads the
 * SOURCE of a file that already existed and checks that it calls into the
 * engine. A claim that something is wired cannot be proved by the thing that
 * was wired; it has to be proved by the thing doing the calling.
 *
 * AND WHY THE SECOND HALF IS AS STRICT. This reads public feeds, scores
 * demand and steers what the agents write. A quiet engine that starts
 * appearing in front of customers is the one failure here that cannot be
 * taken back, so the invisibility is asserted over the actual files a visitor
 * can reach rather than assumed from the fact that nobody built a page.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * ITS OWN DATA DIRECTORY, SET BEFORE THE STORE IS LOADED.
 *
 * This suite exercises functions that WRITE — the demand pass registers
 * sources, ingests observations and marks signal rows. The first version
 * imported the store statically, so it ran against the development store and
 * left a row behind; the next run then read that row and the assertion about
 * an empty installation failed for a reason that had nothing to do with the
 * code. A test that pollutes the thing it is testing is worse than no test.
 *
 * `store.js` reads the directory once, at module load, so the environment has
 * to be set before the first import of anything that imports it — which means
 * these imports are dynamic and that is the whole reason.
 */
process.env.ETABLIX_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ti-embed-"));

const {
  PLATFORM_INSTALLATION, PLATFORM_PROFILE, TERMS_UNREAD, STANDING_PROHIBITIONS,
  AGENT_CHANNELS, registerPlatformSources, observationFromSignal, narrowsOnly,
  briefForAgent, briefBlock, platformOutcomes, embeddedPass, scorePlatformTopics,
} = await import("../lib/trendintel/platform.js");
const { independentFamilies } = await import("../lib/trendintel/sources.js");
const { read: readDemand, classify, TREND_CLASSES } = await import("../lib/engines/demand.js");
const { rank } = await import("../lib/engines/priority.js");
const { draft } = await import("../lib/engines/briefing.js");
const { measure } = await import("../lib/engines/uptake.js");
const { ENGINES: ENGINE_REGISTRY } = await import("../lib/engines/index.js");
const { AI_AGENTS, ENGINES: DOMAIN } = await import("../lib/organisation.js");
const { RULES } = await import("../lib/automation.js");

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 400)}` : ""}`); }
};

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const walk = (dir) => {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    if (!fs.existsSync(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) stack.push(full); else out.push(full);
    }
  }
  return out;
};

/* ─── 1 · the platform's own machinery drives it ───────────────────────── */

console.log("\n=== the trigger watch feeds it, on the pass it already makes ===\n");
{
  const src = read("backend/lib/signals/index.js");
  ok(/import \{ embeddedPass \} from "\.\.\/trendintel\/platform\.js";/.test(src),
     "the signals sweep imports the demand pass", /embeddedPass/.test(src));
  ok(/out\.demand = embeddedPass\(\{/.test(src),
     "AND CALLS IT INSIDE sweep(), so the observations are the signals and no second job reads the same feeds — which would double every count and halve every host's patience",
     /embeddedPass\(/.test(src));
  ok(/signals: out\.queued/.test(src),
     "passing the signals it just queued, so a moment and an observation are the same record read twice rather than two records");
  ok(/try \{\n    out\.demand = embeddedPass/.test(src),
     "wrapped, because the one thing worse than the demand read failing is the watch failing with it");

  // The founding rule of the watch, which this must not have weakened.
  const platform = read("backend/lib/trendintel/platform.js");
  ok(!/fetch\s*\(|nodemailer|sendMail|smtp|politeFetch|axios/i.test(platform),
     "AND THE EMBEDDING ADDED NO SEND PATH AND NO FETCH — the watch finds moments and never sends, and the moment a watcher can also send it becomes the thing it was built instead of",
     (platform.match(/fetch\s*\(|sendMail|smtp/gi) || []).slice(0, 3));
  // Comments stripped, because the comment above explains that it writes to
  // no outbox and the first version of this assertion read the explanation as
  // the offence.
  const code = platform.split("\n").filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join("\n");
  ok(!/outbox|deliveries|queueIntent|recordDispatch/.test(code),
     "and it writes to no outbox and no delivery ledger",
     (code.match(/outbox|deliveries|queueIntent|recordDispatch/g) || []).slice(0, 3));
}

console.log("\n=== the existing schedule measures it, with no new switch to find ===\n");
{
  const src = read("backend/lib/automation.js");
  ok(/import \{ embeddedPass \} from "\.\/trendintel\/platform\.js";/.test(src)
     && /import \{ summary as reachSummary \} from "\.\/reach\.js";/.test(src),
     "the scheduler imports the demand pass and the site's own counter");
  ok(/ruleEnabled\(config, "signal_watch"\)[\s\S]{0,4000}?embeddedPass\(\{/.test(src),
     "AND RUNS IT INSIDE THE RULE THAT ALREADY EXISTS — a fourteenth rule is a fourteenth switch somebody has to find, and an engine that only runs once a person enables it does not run",
     /embeddedPass/.test(src));
  ok(/summary: reachSummary\(\{ days: 1 \}\)/.test(src),
     "feeding it the readership the site already counts, with crawlers already excluded: no analytics tag and no third-party credential");
  ok(/leads: collection\("leads"\)/.test(src),
     "and the enquiries the platform already holds, as the conversion");

  const ids = RULES.map((r) => r.id).join(",");
  ok(!/demand|trend|growth/i.test(ids),
     "NO NEW AUTOMATION RULE WAS ADDED — the demand read is not a thing to be switched on, it is part of the watch",
     RULES.filter((r) => /demand|trend|growth/i.test(r.id)).map((r) => r.id));
  ok(RULES.length === 19, `the rule list is unchanged at ${RULES.length}`, RULES.length);
}

console.log("\n=== and it steers the agents that already exist, as data ===\n");
{
  const src = read("backend/lib/ai.js");
  ok(/import \{ briefForAgent, briefBlock \} from "\.\/trendintel\/platform\.js";/.test(src),
     "the agent runner imports the brief resolver");
  const sites = src.split("\n").filter((l) => /system: `\$\{brief\.system\}\$\{appointment\}\$\{priority\}`/.test(l));
  ok(sites.length === 2,
     "AND BOTH RUN PATHS CARRY IT — the pipeline agents and the single-call agents, because a control layer that reaches one of the two is a control layer that reaches neither reliably",
     sites.length);
  ok(/\$\{appointment\}\$\{priority\}/.test(src),
     "appended AFTER the appointment and therefore after everything that constrains, so the last word belongs to the constraints and not to this week's priority");
  ok(/} catch \{\n    \/\/ A fault in the demand engine must never stop an agent run/.test(src),
     "and a fault in the demand engine leaves the run exactly as it was rather than stopping it");
}

console.log("\n=== the four workers of §4 are in the platform's own registers ===\n");
{
  for (const [id, name] of [["demand", "Demand Reader"], ["priority", "Demand Priority Analyst"],
                            ["briefing", "Priority Brief Coordinator"], ["uptake", "Demand Uptake Analyst"]]) {
    const e = ENGINE_REGISTRY.find((x) => x.id === id);
    const a = AI_AGENTS.find((x) => x.id === id);
    const slot = DOMAIN.flatMap((d) => d.agents.map((x) => ({ ...x, domain: d.id }))).find((x) => x.id === id);
    ok(Boolean(e) && Boolean(a) && Boolean(slot),
       `${id} is in the engine registry, the agent register and the domain register — one addition in three places, which is what the agreement checks demand`,
       { engine: Boolean(e), agent: Boolean(a), slot: Boolean(slot) });
    ok(e?.agent === name && a?.name === name && slot?.name === name, `${id} carries the same name in all three`, [e?.agent, a?.name, slot?.name]);
    ok(slot?.domain === "tender" && e?.engine === "tender",
       `${id} sits in the Tender and Commercial Engine rather than an eighth engine of its own — an eighth engine IS the separate product`,
       [slot?.domain, e?.engine]);
    ok(typeof a?.boundary === "string" && a.boundary.length > 40, `${id} states a boundary of substance`, a?.boundary?.length);
  }
  ok(AI_AGENTS.length === 38, `thirty-eight agents in the register (${AI_AGENTS.length})`, AI_AGENTS.length);
  ok(ENGINE_REGISTRY.length === 24, `twenty-four engines in the registry (${ENGINE_REGISTRY.length})`, ENGINE_REGISTRY.length);
}

/* ─── 2 · what it actually does with what was already there ────────────── */

console.log("\n=== the 25 registered feeds, under the registry they were missing ===\n");
{
  const list = JSON.parse(read("backend/data/signals-sources.json")).filter((x) => x.id);
  const out = registerPlatformSources(list);
  ok(out.refused.length === 0 && out.registered.length === list.length,
     `every one of the ${list.length} existing sources registers under §3's fourteen fields`,
     { registered: out.registered.length, refused: out.refused });
  ok(out.registered.every((s) => s.accessPath === "public_keyless"),
     "ALL OF THEM AS public_keyless — not an assumption: the trigger watch has no credential store and cannot acquire one, so a source needing a key could never have worked here");
  ok(out.unreadTerms.length === list.length && out.registered.every((s) => s.contextOnly),
     "AND EVERY ONE IS CONTEXT-ONLY BECAUSE ITS LICENCE HAS NOT BEEN READ — which means none can satisfy the corroboration minimum or release an automated action on its own. That is the enforced consequence of not having read a licence rather than a note about it",
     out.unreadTerms.length);
  ok(/honest consequence of not having read a licence/.test(out.say), "and the report says so in those terms", out.say.slice(0, 80));
  ok(out.registered.every((s) => s.terms === TERMS_UNREAD || s.terms.length > 0),
     "with the unread ones marked unread rather than filled in with something plausible");
}

console.log("\n=== a signal becomes an observation, and four rewrites stay one family ===\n");
{
  const sig = {
    sourceId: "construction-enquirer", fingerprint: "fp_award_7",
    title: "Contractor appointed", url: "https://example.invalid/a",
    publishedAt: Date.parse("2026-11-08T09:00:00Z"), sectors: ["grid"],
  };
  const o = observationFromSignal(sig, { sourceFamily: "trade_press" });
  ok(o && o.sourceRecordId === "fp_award_7" && o.provenanceKey === "fp_award_7",
     "the signal's own fingerprint is the provenance key, so the collapse mechanism the watch already had is reused rather than reimplemented", o?.provenanceKey);
  ok(o.segment === "grid" && o.metric === "moments" && o.value === 1 && o.unit === "count",
     "the sector the watch classified it into is the segment, and the metric carries its unit", { segment: o.segment, metric: o.metric });
  ok(o.evidenceUri === "https://example.invalid/a" && !/@/.test(JSON.stringify(o)),
     "the evidence is the URL the watch read and nothing about a person travels with it", o.evidenceUri);
  ok(observationFromSignal(null) === null && observationFromSignal({}) === null,
     "and a signal with no source produces no observation rather than a row with a hole in it");

  const rewrites = ["a", "b", "c", "d"].map((x) =>
    observationFromSignal({ ...sig, sourceId: `press-${x}`, fingerprint: "fp_award_7" }, { sourceFamily: `press_${x}` }));
  const fams = independentFamilies(rewrites);
  ok(fams.independent === 1,
     "FOUR REWRITES OF ONE AWARD COLLAPSE TO ONE INDEPENDENT FAMILY, so a well-covered non-event cannot reach a releasing confidence",
     { independent: fams.independent, collapsed: fams.collapsed });
}

console.log("\n=== a brief may narrow and may never widen ===\n");
{
  ok(STANDING_PROHIBITIONS.length === 6,
     "six standing prohibitions, taken from the company's own position rather than from a brief", STANDING_PROHIBITIONS);
  for (const must of ["CDM Principal Contractor", "CDM Principal Designer", "holding the supplier contracts", "holding the client's money", "any price, rate or fee figure"]) {
    ok(STANDING_PROHIBITIONS.includes(must), `"${must}" is one of them`);
  }
  const widening = narrowsOnly({ approved_claim_ids: ["claim_invented"], prohibited_claims: [...STANDING_PROHIBITIONS] },
                               { approvedClaimIds: [], prohibitedClaims: STANDING_PROHIBITIONS });
  ok(!widening.ok && widening.reason === "widens-claims",
     "A BRIEF OFFERING A CLAIM THE INSTALLATION NEVER APPROVED IS REFUSED — a record in a database does not get to widen what may be said",
     widening.reason);
  const dropping = narrowsOnly({ approved_claim_ids: [], prohibited_claims: ["CDM Principal Contractor"] },
                               { approvedClaimIds: [], prohibitedClaims: STANDING_PROHIBITIONS });
  ok(!dropping.ok && dropping.reason === "drops-prohibition" && dropping.dropped.includes("holding the supplier contracts"),
     "AND ONE THAT DROPS A STANDING PROHIBITION IS REFUSED — a prohibition is not a default to be overridden",
     dropping.dropped);
  ok(narrowsOnly({ approved_claim_ids: [], prohibited_claims: [...STANDING_PROHIBITIONS] },
                 { approvedClaimIds: [], prohibitedClaims: STANDING_PROHIBITIONS }).ok,
     "while a brief that narrows only is accepted");
}

console.log("\n=== five agents are steered; the other thirty-three are untouched ===\n");
{
  const steered = Object.keys(AGENT_CHANNELS);
  ok(steered.length === 5, `five agents can be steered (${steered.length}): ${steered.join(", ")}`, steered);
  ok(steered.every((id) => AI_AGENTS.some((a) => a.id === id) || ["approach", "marketing", "blog", "prequal"].includes(id)),
     "each named one is a real agent or a real drafting path", steered);
  ok(briefForAgent("estimating").applies === false && briefForAgent("estimating").reason === "agent-not-steered",
     "AN AGENT A DEMAND BRIEF HAS NOTHING TO SAY ABOUT GETS NOTHING — noise with authority is worse than silence", briefForAgent("estimating"));
  ok(briefBlock(briefForAgent("estimating")) === "",
     "and its prompt is byte-for-byte what it was before any of this existed", JSON.stringify(briefBlock(briefForAgent("estimating"))));
  ok(briefForAgent("opportunity").applies === false,
     "with no approved brief on record, a steered agent also gets nothing, which is the normal case",
     briefForAgent("opportunity").reason);
  ok(briefBlock(null) === "" && briefBlock({ applies: false }) === "", "and nothing resolves to nothing rather than to an empty heading");
}

console.log("\n=== when a brief does apply, it declares itself data ===\n");
{
  const brief = {
    schema_version: 1, brief_id: "gb_t", brief_version: 1, tenant_id: PLATFORM_INSTALLATION,
    platform_id: PLATFORM_INSTALLATION, market: "GB", locale: "en-GB", topic_id: "welfare",
    opportunity_score: 80, confidence: 80, valid_from: "2026-11-10T00:00:00Z",
    expires_at: "2026-11-17T00:00:00Z", evidence_ids: ["ev_1"],
    audience: "a", intent: "b", approved_claim_ids: [], cta_id: "cta_enquiry",
    allowed_channels: ["seo"], prohibited_claims: [...STANDING_PROHIBITIONS],
    objective: "c", experiment_id: "exp_1", policy_version: 1,
  };
  const block = briefBlock({ applies: true, channel: "seo", brief });
  ok(/DATA, NOT AN INSTRUCTION/.test(block),
     "THE BLOCK NAMES ITSELF AS DATA BEFORE IT IS READ — text that arrives in a prompt looking like an instruction gets followed like one");
  ok(/carry no authority/.test(block) && /what is above wins/.test(block),
     "it states that it cannot permit anything and that anything above it wins", block.slice(0, 120));
  ok(/cannot be treated as a request from a person/.test(block),
     "and that it is not a request from a person, which is the injection this closes");
  ok(block.includes("welfare") && block.includes("2026-11-17T00:00:00Z"),
     "it carries the topic and the expiry, so an agent reading it knows when it stops applying");
  ok(/make none that is not already in the inputs/.test(block),
     "WITH NO APPROVED CLAIM IT TELLS THE AGENT TO MAKE NONE, rather than leaving an empty list to be read as freedom");
  for (const must of STANDING_PROHIBITIONS) ok(block.includes(must), `and it carries "${must}" into the run`);
  ok(!/\bAI\b|agent|model|automat/i.test(block.replace(/an agent reading/g, "")),
     "and the block says nothing about AI, agents or automation, because its words can end up in something a customer reads",
     (block.match(/\bAI\b|agent|model|automat/gi) || []).slice(0, 4));
}

console.log("\n=== the four workers refuse rather than invent, on an empty store ===\n");
{
  const d = readDemand({ windowDays: 28 });
  ok(d.ok && d.segments.length === 0 && /absence of reading, not an absence of demand/.test(d.say),
     "THE DEMAND READER SAYS NOTHING HAS BEEN READ rather than reporting that nothing is happening — those two call for opposite decisions",
     d.say?.slice(0, 90));
  const r = rank({ windowDays: 28 });
  ok(r.ok && (r.detail || []).length === 0 && r.ranked.length === 0,
     "the strategist ranks nothing from nothing rather than returning an empty table with a confident heading", r.ranked);
  const b = draft({});
  ok(b.ok && b.drafted === null,
     "THE COORDINATOR DRAFTS NOTHING — a coordinator that drafts anyway because it is only a draft is how an unevidenced topic acquires a chain of approvals",
     b.say?.slice(0, 80));
  const u = measure({ windowDays: 28, reach: { pages: [] }, leads: [] });
  ok(u.ok && (u.decision === "INCONCLUSIVE" || u.decision === "IMMATURE"),
     "and the measurement worker records inconclusive rather than a rate built on nothing", u.decision);
  ok(/observational/.test(u.say),
     "EVERY RESULT IS LABELLED OBSERVATIONAL, because this site has no assignment and a number that moved after a change is not evidence the change moved it",
     u.label);
  ok(/cannot amend policy/.test(u.boundaryNote), "and it states that it cannot amend policy", u.boundaryNote);

  ok(TREND_CLASSES.length === 6 && classify({ current: 0, history: [0, 0, 0, 0] }) === "silent",
     "a segment with nothing in it is SILENT rather than bottom of a list sorted by magnitude", classify({ current: 0, history: [0, 0, 0, 0] }));
  ok(classify({ current: 9, history: [1, 2] }) === "insufficient-history",
     "and two comparable periods is insufficient history rather than a nine-fold rise");
}

console.log("\n=== the whole pass never throws, whatever it is handed ===\n");
{
  for (const input of [{}, { signals: null, sources: null, summary: null, leads: null },
                       { signals: [{}], sources: [{}], summary: { pages: [{}] }, leads: [{}] },
                       { signals: [{ sourceId: "nope", fingerprint: "x" }], sources: [{ id: "nope" }] },
                       { signals: [{ sourceId: "x" }], sources: [{ id: "x", url: "https://e.invalid/f" }] }]) {
    let threw = null;
    try { embeddedPass(input); } catch (err) { threw = String(err?.message || err); }
    ok(threw === null, `embeddedPass survives ${JSON.stringify(input).slice(0, 48)}`, threw);
  }
  const r = embeddedPass({});
  ok(typeof r.line === "string" && /Demand reading:/.test(r.line),
     "and returns one line for the scheduler's own check list rather than a report nobody reads", r.line);
  ok(Array.isArray(r.steps) && r.steps.length === 5, "five steps, each reporting separately", r.steps?.map((s) => s.name));

  // A half-finished entry in the live list must not become a registration.
  const half = registerPlatformSources([{ id: "nope" }, { id: "noname", url: "https://e.invalid/f" }]);
  ok(half.registered.length === 0 && half.refused.length === 2,
     "AN ENTRY WITH NO ADDRESS OR NO OWNER IS REFUSED, NOT COMPLETED FROM ITS ID — the first version filled all fourteen fields from whatever an entry happened to carry, so a typo in the live list produced a healthy-looking source that could not be read",
     half.refused.map((x) => x.sourceId));
  ok(/nothing to read/.test(half.refused[0].why) && /no owner/.test(half.refused[1].why),
     "and each refusal says which field was missing", half.refused.map((x) => x.why.slice(0, 40)));
}

console.log("\n=== outcomes come from rows the platform already holds ===\n");
{
  const out = platformOutcomes({ leads: [{ id: "l1", createdAt: "2026-11-09T10:00:00Z" }], summary: { pages: [{ page: "/", views: 120 }] }, day: "2026-11-10" });
  ok(out.visits === 120 && out.enquiries === 1, "readership is the denominator and an enquiry is the outcome", { visits: out.visits, enquiries: out.enquiries });
  ok(out.outcomes.every((o) => o.firstPartyIngested === true), "both are first-party and actually received, so both may be counted");
  ok(out.outcomes.every((o) => /^(visits|lead)\|/.test(o.pseudonymousOutcomeId)),
     "the dedup id is the platform's own record reference and nothing about a person", out.outcomes.map((o) => o.pseudonymousOutcomeId));
  ok(/No analytics tag, no third-party credential, and nothing estimated/.test(out.say), "and it says so", out.say.slice(-70));
}

console.log("\n=== readiness is never inferred, so nothing releases itself ===\n");
{
  // Empty first, then with something in it, because the two messages are
  // different findings and only the second one exercises the veto.
  const empty = scorePlatformTopics({ at: "2026-11-10T00:00:00Z" });
  ok(empty.scored === 0 && /An empty window is not a finding/.test(empty.say),
     "an empty window says so rather than reporting that nothing is moving", empty.say);

  // A real registered source and eight moments in it, through the same path
  // the sweep uses, so this is the live arithmetic and not a fixture.
  embeddedPass({
    sources: [{ id: "feed-a", name: "Feed A", org: "Publisher A", url: "https://a.invalid/feed", enabled: true, sector: "grid" }],
    signals: Array.from({ length: 8 }, (_, i) => ({
      sourceId: "feed-a", fingerprint: `fp_${i}`, url: `https://a.invalid/${i}`,
      sectors: ["welfare"], publishedAt: Date.parse("2026-11-09T09:00:00Z") - i * 3600000,
    })),
    at: "2026-11-10T00:00:00Z",
  });
  const scored = scorePlatformTopics({ at: "2026-11-10T00:00:00Z" });
  ok(scored.scored >= 1, `${scored.scored} segment(s) scored from observations the pass just wrote`, scored.scored);
  ok(scored.topics.every((t) => t.band === "WATCH" || t.band === "ARCHIVE"),
     "NOTHING SCORED FROM A FEED REACHES A BRIEF — readiness is not evidenced by a public source, and unevidenced readiness is a veto rather than an assumption",
     scored.topics.map((t) => `${t.segment}:${t.band}`));
  ok(scored.topics.every((t) => t.vetoes.includes("readiness-absent")),
     "and every one carries the readiness veto by name, on the row, rather than merely scoring low",
     scored.topics.map((t) => t.vetoes));
  ok(/readiness is not evidenced by a feed/.test(scored.say), "with the report saying why", scored.say?.slice(0, 100));
  ok(PLATFORM_PROFILE.mode === "shadow",
     "the installation itself is in shadow mode, which is where a profile sits until somebody decides otherwise", PLATFORM_PROFILE.mode);
  ok(PLATFORM_PROFILE.allowedAssetIds.length === 0 && PLATFORM_PROFILE.approvedClaimIds.length === 0,
     "with no asset bound for writing and no claim approved — both are a person's act and neither has been done");
}

/* ─── 3 · and none of it is visible ────────────────────────────────────── */

console.log("\n=== nothing a visitor can reach mentions any of it ===\n");

// The words that would give it away. Deliberately broad: the risk is not that
// somebody writes "Trend Intelligence" on the home page, it is that a phrase
// from an internal engine ends up in a page because it was handy.
const TELLS = /trend ?intel|growth brief|opportunity score|demand read|trend reader|opportunity strategist|brief coordinator|observation schema|installation_id/i;

{
  const files = walk(path.join(root, "frontend/public")).filter((f) => /\.(html|js|css|txt|xml|json|webmanifest)$/.test(f));
  const hits = files.filter((f) => TELLS.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(root, f));
  ok(hits.length === 0,
     `NOT ONE OF THE ${files.length} PUBLIC FILES MENTIONS IT — the risk is not somebody writing it on the home page, it is a handy phrase from an internal engine ending up in one`,
     hits);
  for (const name of ["sitemap.xml", "robots.txt", "llms.txt"]) {
    const f = path.join(root, "frontend/public", name);
    if (!fs.existsSync(f)) continue;
    ok(!TELLS.test(fs.readFileSync(f, "utf8")) && !/trendintel/i.test(fs.readFileSync(f, "utf8")),
       `${name} does not list it`, name);
  }
}
{
  const internal = fs.readdirSync(path.join(root, "frontend/internal"));
  ok(!internal.some((f) => /trend|demand|brief/i.test(f)),
     "AND NO PAGE WAS BUILT FOR IT ANYWHERE, internal included — it runs on the watch's own schedule, so there is nothing for anybody to open",
     internal.filter((f) => /trend|demand|brief/i.test(f)));
  const index = read("frontend/internal/index.html");
  ok(!TELLS.test(index) && !/trendintel/i.test(index), "and the internal index offers no link to it");
}
{
  // Customer-facing documents and builders. business/platform/ is internal
  // engineering documentation and is the one place it is named.
  const files = walk(path.join(root, "business"))
    .filter((f) => /\.(md|cjs|js|html|txt)$/.test(f))
    .filter((f) => !f.includes(path.join("business", "platform")));
  const hits = files.filter((f) => TELLS.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(root, f));
  ok(hits.length === 0,
     "no business document or document builder outside business/platform names it, so nothing it is in can be forwarded to a client",
     hits);
}
{
  const app = read("backend/app.js");
  ok(/app\.use\("\/api\/trendintel", trendintelRoutes\)/.test(app), "the control plane is mounted once");
  ok(/internal only, never public/.test(app.split("\n").find((l) => /trendintelRoutes\)/.test(l)) || ""),
     "and the mount line says so, next to the l7 and agentos control planes it sits with");
  const route = read("backend/routes/trendintel.js");
  ok(/^router\.use\(requireAuth\);$/m.test(route),
     "EVERY ROUTE ON IT REQUIRES A SESSION — asserted on the file rather than trusted, because one handler registered above that line would be public");
  const beforeAuth = route.slice(0, route.indexOf("router.use(requireAuth);"));
  ok(!/router\.(get|post|put|delete)\(/.test(beforeAuth),
     "and no handler is registered before it", (beforeAuth.match(/router\.\w+\(/g) || []));

  const publicApi = read("backend/routes/veryx-public.js");
  ok(!TELLS.test(publicApi) && !/trendintel/i.test(publicApi),
     "the key-authenticated public platform API does not reach it either");
}
{
  // The one thing that CAN travel outward: words the brief puts into an agent
  // run, which end up in a draft somebody may send. The vendor-silence suite
  // guards published copy; this guards the source of it.
  const platform = read("backend/lib/trendintel/platform.js");
  const block = platform.slice(platform.indexOf("export function briefBlock"));
  ok(!/\bAI\b|\bagent\b|\bmodel\b|automat/i.test(block.split("return [")[1]?.split("].join")[0] || ""),
     "THE TEXT THE BRIEF PUTS IN FRONT OF AN AGENT CARRIES NO AI OR AGENT LANGUAGE, because those words can end up in a draft a customer reads",
     (block.match(/\bAI\b|\bagent\b|automat/gi) || []).slice(0, 4));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
