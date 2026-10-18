/**
 * The parts with no database behind them: triggers, sources, parsing.
 *
 * WHY THESE ARE SEPARATE. signals-check.mjs is a diagnostic — it reads a URL
 * and says whether it answers. It needs none of the storage, yet it imported
 * the queue, which imports the store, which imports node:sqlite. On a host
 * running Node 20 that is not a built-in module, so the tool for diagnosing a
 * problem could not start, with an error about SQLite that had nothing to do
 * with anything it does.
 *
 * A diagnostic that cannot run on the machine you are diagnosing is not a
 * diagnostic. So the pure half lives here and depends on nothing but Node:
 * the check tool runs anywhere fetch exists, inside the container or on the
 * host, whatever version it happens to be.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCES_FILE = process.env.ETABLIX_SIGNALS_SOURCES
  ? path.resolve(process.env.ETABLIX_SIGNALS_SOURCES)
  : path.join(root, "content", "signals", "sources.json");

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
