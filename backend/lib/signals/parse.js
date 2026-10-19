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

/**
 * WHERE THE SOURCE LIST LIVES, AND A CLAIM THAT WAS WRONG.
 *
 * The file this shipped with said "sources are data, not code — edit the file
 * and the next sweep picks it up; no deploy". That is true of a checkout and
 * false of this deployment. content/ is copied into the Docker image at build
 * time, so editing /opt/etablix/content on the host changes a file the running
 * container never reads, and the next deploy overwrites it anyway. Following
 * that instruction would have looked exactly like the watcher ignoring the
 * list.
 *
 * So the live list belongs on the data volume, which is mounted, persists
 * across deploys and is the only writable thing in there. The copy in the
 * repository becomes a seed: it is written to the volume once, if nothing is
 * there yet, and is never read again. After that the file on the volume is
 * the truth and editing it needs no deploy — which is what was promised.
 */
const REPO_SOURCES = path.join(root, "content", "signals", "sources.json");
const DATA_DIR = process.env.ETABLIX_DATA_DIR ? path.resolve(process.env.ETABLIX_DATA_DIR) : null;
const LIVE_SOURCES = DATA_DIR ? path.join(DATA_DIR, "signals-sources.json") : null;

export function sourcesFile() {
  if (process.env.ETABLIX_SIGNALS_SOURCES) return path.resolve(process.env.ETABLIX_SIGNALS_SOURCES);
  if (!LIVE_SOURCES) return REPO_SOURCES;
  if (!fs.existsSync(LIVE_SOURCES)) {
    // Seeded once, and only if the volume has nothing. A deploy must never
    // overwrite a list somebody has edited.
    try { fs.copyFileSync(REPO_SOURCES, LIVE_SOURCES); } catch { return REPO_SOURCES; }
  }
  return LIVE_SOURCES;
}

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
      // The ACTIVE voice, where the client is the subject: "SSEN awards the
      // works", "Network Rail issues the framework". Every pattern above is
      // passive or contractor-led, so the client-led half of the trade press
      // was invisible. A contract noun is still required, so an industry
      // awards ceremony does not qualify.
      /\b(awards?|issues?|lets?)\b[^.]{0,70}\b(contract|deal|works|package|framework|project|job)\b/i,
      /\b(main|principal|managing|tier[- ]?1|lead)?\s*contractor\b[^.]{0,50}\b(appointed|selected|named|confirmed|revealed|chosen|lined up)\b/i,
      // "Contractor appointed for the campus" — the noun leads and no contract
      // word follows, which the patterns above all required.
      /\b(contractor|builder|supplier|partner)\s+(appointed|selected|named|chosen|confirmed)\b/i,
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
      // "Data centre approved", "Solar farm consented", "Substation cleared".
      // The thing approved is named and no planning noun follows it, which
      // every pattern above required.
      /\b(cent(re|er)|campus|farm|plant|station|facility|site|works|terminal|depot|village|park|hub)\b[^.]{0,30}\b(approved|consented|cleared|granted)\b/i,
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

/**
 * THE SIX SECTORS ETABLIX SELLS INTO, AND WHY THEY ARE SCORED SEPARATELY.
 *
 * The triggers answer "has something happened". They do not answer "is it
 * ours", and without that a retail park award and a substation award score
 * identically — so a general construction feed buries the one that matters
 * under thirty that do not. The sector carries no veto: a signal with no
 * sector still queues, because a moment in an unnamed sector is still a
 * moment. It carries weight and a label, so the queue can be ranked and
 * filtered by the thing that actually decides relevance.
 *
 * These are the sectors as the business states them publicly, in the same
 * order, so the queue and the sales argument cannot drift apart.
 */
export const SECTORS = [
  { id: "grid", label: "Grid and power",
    patterns: [/\b(substation|switchyard|converter station|transmission|overhead line|OHL|pylon|grid connection|national grid|HVDC|high[- ]voltage|\b\d{2,3}\s?kV\b|electricity network|interconnector|distribution network operator|DNO|SSEN|SP Energy|Ofgem)\b/i] },

  { id: "renewables", label: "Renewable energy",
    patterns: [/\b(offshore wind|onshore wind|wind farm|windfarm|turbine|solar farm|solar park|photovoltaic|\bPV\b|battery (energy )?storage|\bBESS\b|pumped storage|hydro|green hydrogen|electrolyser|electrolyzer|nuclear|\bSMR\b|small modular reactor)\b/i] },

  { id: "datacentres", label: "Data centres",
    patterns: [/\b(data ?cent(re|er)|hyperscale|colocation|co-location|\bDC\b campus|\d+\s?MW\s+(IT|campus|facility)|server farm|cloud campus)\b/i] },

  { id: "rail", label: "Rail and major civils",
    patterns: [/\b(rail|railway|network rail|HS2|station (upgrade|redevelopment)|tunnelling|tunnel boring|\bTBM\b|viaduct|highways? england|national highways|motorway|bypass|bridge replacement|depot)\b/i] },

  { id: "industrial", label: "Industrial and mining",
    patterns: [/\b(mine|mining|quarry|smelter|refinery|petrochemical|process plant|gigafactory|manufacturing (plant|facility)|steelworks|cement works|terminal|port expansion|worker (village|accommodation)|camp)\b/i] },

  { id: "epc", label: "Developers and EPCs",
    patterns: [/\b(EPC contractor|\bEPC\b|developer|independent power producer|\bIPP\b|turnaround|shutdown|outage|planned maintenance (period|shutdown))\b/i] },
];

/** Which of ours a piece of text belongs to. None is a valid answer. */
export function classify(text) {
  return SECTORS.filter((s) => s.patterns.some((p) => p.test(text))).map((s) => s.id);
}

export const SECTOR_LABEL = Object.fromEntries(SECTORS.map((s) => [s.id, s.label]));

/** What a sector match is worth. Enough to separate, never enough to admit. */
export const SECTOR_WEIGHT = 3;

/**
 * Sectors that are plainly not ours, and the one case where saying so matters.
 *
 * At weight 2 a retail park award outscored a data centre appointment, which
 * is the complaint this whole change answers: the triggers knew something had
 * happened and nothing knew whether it was ours. Raising the sector weight
 * separates the two, but a general construction feed is still mostly housing,
 * retail and schools — real awards, real money, no temporary worker estate and
 * no work for us.
 *
 * So an item that matches one of these AND matches none of ours is pushed
 * below the threshold rather than ranked beneath it. The "and" is load
 * bearing: a data centre on a retail park is still a data centre, and a
 * station redevelopment is still rail.
 */
export const OFF_SECTOR = [
  /\b(hous(e|ing)|homes?|residential|apartments?|flats?|build[- ]to[- ]rent|student accommodation|care home|retirement)\b/i,
  /\b(retail|shopping cent(re|er)|supermarket|store|leisure cent(re|er)|hotel|restaurant|stadium)\b/i,
  /\b(school|academy|college|university building|classroom|nursery)\b/i,
  /\b(office (block|fit[- ]?out|refurbishment)|fit[- ]?out|refurbishment of)\b/i,
];
export const OFF_SECTOR_PENALTY = 3;

/** Sources are data, not code: the director edits them without a deploy. */
export function sources() {
  try {
    const list = JSON.parse(fs.readFileSync(sourcesFile(), "utf8"));
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
  const sectors = classify(text);

  // A SECTOR IS NOT A MOMENT, AND ON ITS OWN IT MUST COUNT FOR NOTHING.
  // Adding the sector weight unconditionally gave "a nice photograph of a
  // turbine" a score of three — the renewables sector, no event, straight
  // into the queue. The sector answers "is this ours"; only a trigger
  // answers "has something happened", and the second question comes first.
  if (!hit.length) return { triggers: hit, sectors, score: 0 };

  // Given that something happened, the sector lifts it above its neighbours.
  // A substation award and a retail park award are both awards; only one of
  // them is work we could do, and the ranking has to say so.
  if (sectors.length) total += SECTOR_WEIGHT;
  else if (OFF_SECTOR.some((p) => p.test(text))) total -= OFF_SECTOR_PENALTY;
  return { triggers: hit, sectors, score: Math.max(0, total) };
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
