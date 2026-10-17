/**
 * The trigger watcher.
 *
 * It does not find email addresses. It finds MOMENTS — the point at which a
 * scheme has just become somebody's problem and nobody has answered it yet:
 * consent granted, a main contractor appointed, a project transferred to an
 * owner, financial close reached. The approach is written and sent by a
 * person afterwards, from their own mailbox, a few a week.
 *
 * THE THREE RULES, AND WHERE EACH ONE LIVES.
 *
 *   robots.txt and rate limiting   backend/lib/signals/fetch.js
 *   no personal address, ever      backend/lib/signals/contact.js
 *   suppression nothing overrides  this file, isSuppressed() and queue()
 *
 * WHAT THIS IS NOT. It never sends anything. There is no transport in this
 * module and there must never be one: the moment a watcher can also send, it
 * becomes the thing it was built instead of. The queue is read by a person.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collection, insert, update } from "../store.js";
import { politeFetch } from "./fetch.js";
import { publishedContact, scrub } from "./contact.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCES_FILE = path.join(root, "content", "signals", "sources.json");

/**
 * What counts as a moment.
 *
 * Deterministic patterns rather than judgement, so the same page always
 * scores the same and a reviewer can see why something surfaced. Weights are
 * coarse on purpose: this ranks a reading queue, it does not make decisions.
 */
export const TRIGGERS = [
  { id: "consent", label: "Consent or permission granted", weight: 3,
    patterns: [/planning (permission|consent)[^.]{0,40}(granted|approved|secured)/i,
               /section 36[^.]{0,40}(approved|granted|consent)/i,
               /development consent order[^.]{0,30}granted/i] },
  { id: "award", label: "Contract awarded or contractor appointed", weight: 3,
    patterns: [/(has been |been )?(awarded|appointed)[^.]{0,60}(contract|contractor)/i,
               /(main|principal|tier[- ]?1) contractor[^.]{0,40}(appointed|selected|named)/i,
               /preferred bidder/i] },
  { id: "transfer", label: "Project sold or transferred to an owner", weight: 3,
    patterns: [/(acquir|purchas)(ed|es|ition)[^.]{0,60}(project|scheme|portfolio|site)/i,
               /(sold|divest(ed|s|ment))[^.]{0,60}(project|scheme|portfolio)/i,
               /completes the (sale|acquisition)/i] },
  { id: "close", label: "Financial close or investment decision", weight: 3,
    patterns: [/financial close/i, /final investment decision/i, /\bFID\b/] },
  { id: "mobilise", label: "Construction starting", weight: 2,
    patterns: [/(construction|works|enabling works)[^.]{0,30}(to )?(begin|start|commence)/i,
               /(ground|spade)[- ]break/i, /site establishment/i, /mobilis(ation|ing)/i] },
  { id: "scale", label: "A workforce large enough to need housing", weight: 2,
    patterns: [/\b([2-9]\d{2,}|\d{1,3},\d{3})\s+(workers|operatives|people|staff|jobs)\b/i,
               /(worker|workforce|construction)[- ]?(accommodation|village|camp)/i,
               /peak workforce/i] },
];

/** Sources are data, not code: the director edits them without a deploy. */
export function sources() {
  try {
    const list = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf8"));
    return Array.isArray(list) ? list.filter((s) => s && s.url && s.enabled !== false) : [];
  } catch { return []; }
}

/**
 * The suppression list, and the reason it is checked rather than consulted.
 *
 * Somebody asks not to be approached, or a name must never be approached for
 * a reason that belongs in a different conversation. Either way the answer
 * has to hold against a future change of mind, a bulk import and a tired
 * evening. So this is checked inside queue(), the only way a signal is ever
 * written, and the route that marks a signal approached checks it again.
 * There is no flag to bypass it, and adding one would be a defect.
 */
export function isSuppressed(signal) {
  const haystack = [signal.org, signal.url, signal.title].filter(Boolean).join(" ").toLowerCase();
  let host = "";
  try { host = new URL(signal.url).host.toLowerCase(); } catch { /* not a url */ }
  return collection("suppressions").some((s) => {
    const needle = String(s.pattern || "").trim().toLowerCase();
    if (!needle) return false;
    return haystack.includes(needle) || (host && host.includes(needle));
  });
}

export function suppress(pattern, { by = null, why = null } = {}) {
  const value = String(pattern || "").trim().toLowerCase();
  if (!value) throw new Error("A suppression needs something to match on.");
  const existing = collection("suppressions").find((s) => s.pattern === value);
  if (existing) return existing;
  return insert("suppressions", { pattern: value, by, why, at: Date.now() });
}

/** Stable identity for an item, so the same story does not queue twice. */
export const fingerprint = (url, title) =>
  crypto.createHash("sha256").update(`${String(url).split("#")[0]}|${String(title).trim().toLowerCase()}`).digest("hex").slice(0, 32);

export function score(text) {
  const hit = [];
  let total = 0;
  for (const t of TRIGGERS) {
    if (t.patterns.some((p) => p.test(text))) { hit.push(t.id); total += t.weight; }
  }
  return { triggers: hit, score: total };
}

const strip = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;|&#\d+;/gi, " ").replace(/\s+/g, " ").trim();

/**
 * Items out of a feed or a listing page.
 *
 * RSS and Atom first because they are structured and stable; an HTML listing
 * is a fallback and is read conservatively — a link with enough text beside
 * it to judge, and nothing inferred that is not on the page.
 */
export function extract(body, baseUrl) {
  const items = [];
  const rss = [...String(body).matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  for (const block of rss) {
    const title = strip((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block) || [])[1]);
    let link = strip((/<link[^>]*>([\s\S]*?)<\/link>/i.exec(block) || [])[1])
            || (/<link[^>]*href=["']([^"']+)["']/i.exec(block) || [])[1] || "";
    const summary = strip((/<(description|summary|content[^>]*)>([\s\S]*?)<\/(description|summary|content)>/i.exec(block) || [])[2]);
    const date = strip((/<(pubDate|published|updated)>([\s\S]*?)<\/\1>/i.exec(block) || [])[2]);
    if (!title) continue;
    try { link = new URL(link, baseUrl).toString(); } catch { link = baseUrl; }
    items.push({ title, url: link, summary, publishedAt: Date.parse(date) || null });
  }
  if (items.length) return items;

  for (const m of String(body).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{8,300}?)<\/a>/gi)) {
    const title = strip(m[2]);
    if (title.length < 20) continue;             // navigation, not a story
    let link;
    try { link = new URL(m[1], baseUrl).toString(); } catch { continue; }
    items.push({ title, url: link, summary: "", publishedAt: null });
  }
  return items.slice(0, 200);
}

/**
 * Write a signal, or decline to and say why.
 *
 * The only way into the queue. Suppression, deduplication and the personal
 * data gate all sit on this path so none of them can be walked around.
 */
export function queue(signal) {
  const row = scrub(signal);
  if (isSuppressed(row)) return { queued: false, reason: "suppressed" };
  const fp = fingerprint(row.url, row.title);
  if (collection("signals").some((s) => s.fingerprint === fp)) return { queued: false, reason: "already seen" };
  return { queued: true, signal: insert("signals", { ...row, fingerprint: fp, status: "new", seenAt: Date.now() }) };
}

/**
 * One pass over the enabled sources.
 *
 * Returns what it did rather than logging it, so the automation sweep can
 * report and the test can assert. Never throws for one bad source: a feed
 * that has moved should not stop the other nine.
 */
export async function sweep({ minScore = 3, enrich = true } = {}) {
  const out = { checked: 0, blocked: 0, unchanged: 0, failed: 0, queued: [], skipped: 0 };
  for (const src of sources()) {
    out.checked++;
    const res = await politeFetch(src.url);
    if (res.blocked) { out.blocked++; continue; }
    if (res.notModified) { out.unchanged++; continue; }
    if (!res.ok) { out.failed++; continue; }

    for (const item of extract(res.body, src.url)) {
      const { triggers, score: n } = score(`${item.title} ${item.summary}`);
      if (n < minScore) continue;

      let contactUrl = null, roleAddress = null;
      if (enrich && src.contactPage) {
        const page = await politeFetch(src.contactPage);
        if (page.ok && page.body) ({ contactUrl, roleAddress } = publishedContact(page.body, src.contactPage));
      }

      const result = queue({
        sourceId: src.id, sourceName: src.name || src.id,
        org: src.org || src.name || "", title: item.title, summary: item.summary,
        url: item.url, publishedAt: item.publishedAt, triggers, score: n,
        contactUrl: contactUrl || src.contactPage || null, roleAddress,
      });
      if (result.queued) out.queued.push(result.signal);
      else out.skipped++;
    }
  }
  return out;
}

/** Move a signal along. Approaching is a person's act and is recorded as one. */
export function act(signalId, status, { by = null, note = null } = {}) {
  const row = collection("signals").find((s) => s.id === signalId);
  if (!row) throw new Error("That signal does not exist.");
  if (status === "approached" && isSuppressed(row)) {
    throw new Error("That organisation is on the suppression list and must not be approached.");
  }
  if (!["new", "reading", "approached", "dismissed"].includes(status)) throw new Error("Unknown status.");
  return update("signals", signalId, { status, actedBy: by, actedAt: Date.now(), note: note || row.note || null });
}
