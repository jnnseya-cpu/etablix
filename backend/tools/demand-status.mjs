/**
 * What the demand read is actually doing. Read-only, and the only report it has.
 *
 *   docker exec etablix node backend/tools/demand-status.mjs
 *
 * THE ENGINE HAS NO PAGE, ON PURPOSE. It rides the trigger watch's own sweep
 * and writes its band onto the signal rows the queue already shows, so there
 * is nothing to open and nothing for anybody to have to look at. The cost of
 * that is that there is also no way to tell whether it is working, which is
 * how an invisible thing becomes an absent one.
 *
 * So this is the answer to one question — is it reading, and what is stopping
 * it — and it answers in the order that matters: what is blocked first, then
 * what is working.
 *
 * IT WRITES NOTHING. Not the store, not the source list. `update-all.sh` calls
 * it in both its modes for that reason.
 */

import { collection } from "../lib/store.js";
import { PLATFORM_INSTALLATION, registerPlatformSources, TERMS_UNREAD } from "../lib/trendintel/platform.js";
import { read as readDemand } from "../lib/engines/demand.js";
import { rank } from "../lib/engines/priority.js";
import { measure } from "../lib/engines/uptake.js";
import { sources, sourcesFile } from "../lib/signals/parse.js";
import { summary as reachSummary } from "../lib/reach.js";

const pad = (s, n) => String(s).padEnd(n);
const line = (s = "") => console.log(`    ${s}`);

console.log("\n== The demand read\n");

/* ── 1 · the sources, and the licence that gates them ─────────────────── */

const live = sources();
const reg = registerPlatformSources(live);
const stored = collection("tiSources").filter((s) => s.installationId === PLATFORM_INSTALLATION);

line(`list:         ${sourcesFile()}`);
line(`enabled:      ${live.length} source(s)${live.length ? ` — ${live.map((s) => s.id).join(", ")}` : ""}`);
line(`registered:   ${stored.length} in the store, ${reg.registered.length} would register from the live list now`);
if (reg.refused.length) {
  line("");
  for (const r of reg.refused) line(`REFUSED  ${pad(r.sourceId, 24)} ${r.why}`);
}

const unread = reg.registered.filter((r) => !r.termsRead);
const readable = reg.registered.filter((r) => r.termsRead);
line("");
if (unread.length) {
  line(`CONTEXT-ONLY: ${unread.length} of ${reg.registered.length} source(s) have no read licence.`);
  line("              A context-only source can add context and cannot corroborate,");
  line("              so nothing it finds can support an automated action on its own.");
  for (const r of unread) line(`  unread   ${pad(r.sourceId, 24)} ${r.terms === TERMS_UNREAD ? "terms not read" : r.terms}`);
}
if (reg.partial?.length) {
  line("");
  line("PART-RECORDED: somebody started and stopped. Three of the four fields is an");
  line("              unattributed judgement, so these are still treated as unread.");
  for (const p of reg.partial) line(`  missing  ${pad(p.sourceId, 24)} ${p.missing.join(", ")}`);
}
if (readable.length) {
  line("");
  for (const r of readable) {
    line(`READ     ${pad(r.sourceId, 24)} ${r.permittedUses.join("/")} — read by ${r.termsReadBy} on ${r.termsReadAt || "(no date)"}`);
    line(`         ${r.termsUrl}`);
  }
}

/* ── 2 · what has been read ───────────────────────────────────────────── */

console.log("\n== What has been observed\n");

const obs = collection("tiObservations").filter((o) => o.installationId === PLATFORM_INSTALLATION);
const moments = obs.filter((o) => o.metric === "moments");
const visits = obs.filter((o) => o.metric === "eligible_visits");
line(`observations: ${obs.length} — ${moments.length} moment(s), ${visits.length} readership row(s)`);

if (!moments.length) {
  line("");
  line("NOTHING HAS BEEN OBSERVED YET. That is an absence of reading, not an absence");
  line("of demand. The read rides the trigger watch, so it happens when the watch");
  line("next sweeps; force one with:  node backend/tools/signals-sweep.mjs");
} else {
  const latest = moments.map((o) => Date.parse(String(o.observedAt))).filter(Number.isFinite).sort((a, b) => b - a)[0];
  line(`most recent:  ${new Date(latest).toISOString()} (${Math.round((Date.now() - latest) / 3600000)}h ago)`);
}

/* ── 3 · what it concluded, and what stopped it ───────────────────────── */

console.log("\n== What it concluded\n");

const trend = readDemand({ windowDays: 28 });
if (!trend.ok) {
  line(`could not read: ${trend.reason}`);
} else if (!trend.detail?.length) {
  line(trend.say);
} else {
  for (const s of trend.detail) {
    line(`${pad(s.segment, 22)} ${pad(s.trendClass, 22)} ${s.current} this window, baseline ${s.baseline}, ${s.corroborating} corroborating`);
  }
  line("");
  line(trend.seasonality);
  if (trend.missing.length) {
    line("");
    line("WHAT COULD NOT BE READ — reported rather than omitted, because a reader cannot");
    line("otherwise tell a quiet segment from an unread one:");
    for (const m of trend.missing) line(`  · ${m}`);
  }

  const ranked = rank({ windowDays: 28 });
  if (ranked.ok && ranked.detail?.length) {
    console.log("\n== Ranked, with the veto on the same line as the number\n");
    for (const r of ranked.detail) {
      line(`${pad(r.segment, 22)} ${pad(r.band, 10)} score ${pad(r.score ?? "—", 7)} confidence ${pad(r.confidence ?? "—", 7)} ${r.vetoes.join(", ") || "no veto"}`);
    }
    line("");
    line(ranked.say);
  }
}

/* ── 4 · briefs, and whether any of them is steering anything ─────────── */

console.log("\n== Briefs\n");

const briefs = collection("tiBriefs").filter((b) => b.installationId === PLATFORM_INSTALLATION);
const approved = briefs.filter((b) => b.state === "approved");
line(`briefs:       ${briefs.length} total, ${approved.length} approved`);
if (!approved.length) {
  line("");
  line("NO BRIEF IS APPROVED, so no agent is being steered and all thirty-eight send");
  line("the prompt they sent before any of this existed. That is the normal state.");
} else {
  const now = Date.now();
  for (const b of approved) {
    const left = Math.round((Date.parse(b.brief.expires_at) - now) / 3600000);
    line(`${pad(b.brief.brief_id, 32)} ${b.brief.market}/${b.brief.locale} ${pad(b.brief.allowed_channels.join(","), 20)} ${left > 0 ? `${left}h left` : `EXPIRED ${-left}h ago`}`);
  }
}

/* ── 5 · the outcome side ─────────────────────────────────────────────── */

console.log("\n== Outcome\n");

let r28 = null;
try { r28 = measure({ windowDays: 28 }); } catch (err) { r28 = { ok: false, reason: String(err?.message || err) }; }
if (!r28.ok) {
  line(`could not measure: ${r28.reason}`);
} else {
  line(`${r28.enquiriesThisWindow} enquir${r28.enquiriesThisWindow === 1 ? "y" : "ies"} against ${r28.visitsThisWindow} eligible visit(s) this window; ${r28.enquiriesPriorWindow ?? "—"} against ${r28.visitsPriorWindow ?? "—"} in the one before.`);
  for (const row of r28.rates) line(`  ${row}`);
  line("");
  line(`${r28.decision}. ${r28.say}`);
}
try {
  const today = reachSummary({ days: 1 });
  const pages = Array.isArray(today?.pages) ? today.pages.length : 0;
  line("");
  line(`the site counter answered for ${pages} page(s) today, with crawlers already excluded — no analytics tag and no third-party key`);
} catch {
  line("");
  line("the site counter did not answer, so today's readership is unknown rather than zero");
}

/* ── 6 · the one thing that needs a person ────────────────────────────── */

console.log("\n== What needs you\n");

if (unread.length || reg.partial?.length) {
  const ids = [...unread.map((r) => r.sourceId), ...(reg.partial || []).map((p) => p.sourceId)];
  const first = ids.slice(0, 2);
  line(`READ THE LICENCES. ${unread.length + (reg.partial?.length || 0)} source(s) cannot corroborate until somebody does.`);
  line("");
  line(`  docker exec etablix node backend/tools/signals-terms.mjs ${first.join(" ")}`);
  line("");
  line("It quotes the clauses bearing on copying and reuse, with the URL and the date,");
  line("and decides nothing. Read them, then add the four fields to the LIVE list —");
  line(`  ${sourcesFile()}`);
  line("which a deploy never overwrites, so the edit survives and takes effect on the");
  line("next sweep. Promoting a source is what lets it corroborate.");
} else {
  line("Every enabled source has a read licence with a name against it. Nothing here needs you.");
}
console.log("");
