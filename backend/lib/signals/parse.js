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
  // HOW THE TRADE PRESS ACTUALLY WRITES. The first version of this matched
  // "has been awarded a contract" and scored ten items from a live UK
  // construction awards feed at zero. Nobody writes that. They write wins,
  // lands, secures, nets, bags, named on, picked for, gets the nod. Ten
  // items and no hits was not a quiet market, it was a wrong list, and it
  // would have been read as the former for weeks.
  { id: "award", label: "Contract awarded or contractor appointed", weight: 3,
    patterns: [
      /\b(wins?|won|lands?|secures?|nets?|bags?|clinches?|scoops?)\b[^.]{0,70}\b(contract|deal|job|scheme|works|package|framework|project)\b/i,
      /\b(contract|deal|job|scheme|works|package|framework)\b[^.]{0,50}\b(win|won|awarded|handed|landed)\b/i,
      /\b(awarded|appointed|selected|chosen|named|picked|confirmed)\b[^.]{0,70}\b(contract|contractor|supplier|partner|framework|to (build|deliver|design))\b/i,
      /\b(main|principal|managing|tier[- ]?1|lead)\s+contractor\b[^.]{0,50}\b(appointed|selected|named|confirmed|revealed|chosen)\b/i,
      /\b(preferred bidder|contractor revealed|winner revealed|gets the nod|green ?lit)\b/i,
      /\bsigns?\b[^.]{0,40}\b(contract|deal|agreement)\b/i,
    ] },

  // A price tag in a headline is the single most reliable sign that a real
  // scheme has just become real. It is also how this press writes.
  { id: "value", label: "A scheme with a price on it", weight: 2,
    patterns: [/£\s?\d+(\.\d+)?\s?(m|bn|billion|million)\b/i] },

  { id: "consent", label: "Consent or permission granted", weight: 3,
    patterns: [
      /\b(planning (permission|consent|approval)|consent)\b[^.]{0,50}\b(granted|approved|secured|won|given|obtained)\b/i,
      /\b(approves?|approved|grants?|granted|backs?|backed|green ?light)\b[^.]{0,60}\b(scheme|plans?|project|development|application|proposals?)\b/i,
      /\bsection 36\b[^.]{0,50}\b(approv|grant|consent)/i,
      /\bdevelopment consent order\b[^.]{0,40}\b(granted|approved|made)\b/i,
      /\b(plans?|proposals?|application|scheme|project|development)\b[^.]{0,40}\b(approved|cleared)\b/i,
      // "Given the go-ahead" needs no noun in front of it: the phrase only
      // ever means one thing, and it is how half the trade press says it.
      /\bgiven the go[- ]?ahead\b/i,
      /\bgets? the go[- ]?ahead\b/i,
    ] },

  { id: "transfer", label: "Project sold or transferred to an owner", weight: 3,
    patterns: [
      /\b(acquires?|acquired|acquisition|buys?|bought|purchases?)\b[^.]{0,70}\b(project|scheme|portfolio|site|stake|business)\b/i,
      /\b(sold|sells?|divests?|divested|divestment|disposal)\b[^.]{0,70}\b(project|scheme|portfolio|site|stake)\b/i,
      /\bcompletes? the (sale|acquisition|purchase)\b/i,
      /\b(takes? over|change of ownership|new owner)\b/i,
    ] },

  { id: "close", label: "Financial close or investment decision", weight: 3,
    patterns: [/\bfinancial close\b/i, /\bfinal investment decision\b/i, /\bFID\b/,
               /\breaches? (financial )?close\b/i, /\b(funding|investment) (secured|agreed|signed)\b/i] },

  // WEIGHT 3, NOT 2, AND THE REASON IS COMMERCIAL RATHER THAN TECHNICAL.
  // A construction start is late for the best version of this work — by then
  // the contractor is appointed and the site establishment is largely
  // decided. But an active site with a compound still buys services, and at
  // weight 2 a bare "construction begins" scored below the threshold and was
  // never seen at all. Better to read it ranked low than not to read it.
  { id: "mobilise", label: "Construction starting", weight: 3,
    patterns: [
      /\b(construction|works|enabling works|building|groundworks?)\b[^.]{0,40}\b(begin|begins|start|starts|started|commence|commences|under ?way|get(s)? going)\b/i,
      /\b(ground|spade)[- ]?break/i, /\bsite establishment\b/i, /\bmobilis(ation|ing|e)\b/i,
      /\b(on site|start on site|work starts)\b/i,
      /\bfirst (concrete|steel|sod|turf)\b/i,
    ] },

  { id: "scale", label: "A workforce large enough to need housing", weight: 2,
    patterns: [
      /\b([2-9]\d{2,}|\d{1,3},\d{3})\s+(workers|operatives|people|staff|jobs|personnel)\b/i,
      /\b(worker|workers|workforce|construction|temporary)[- ]?(accommodation|village|camp|lodge|housing)\b/i,
      /\bpeak workforce\b/i,
      /\b(creat(e|es|ing)|support(s|ing)?)\b[^.]{0,30}\b([2-9]\d{2,}|\d{1,3},\d{3})\s+jobs\b/i,
    ] },
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
