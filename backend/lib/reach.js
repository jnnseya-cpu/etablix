/**
 * How many people read it — counted here, by us, with nothing about them kept.
 *
 * WHY NOT AN ANALYTICS PRODUCT. Three reasons, in the order they matter.
 * A third-party tag ships every visitor's address and browsing to somebody
 * else's servers, which turns a page view into a data-protection question and
 * a cookie banner into a legal document. It also loads a script from another
 * domain on a site whose whole SEO argument is that the page is complete
 * before any script runs. And it puts the numbers the business is judged on
 * inside an account somebody else can close.
 *
 * WHAT IS STORED. A count, a date and a path. That is the whole row:
 *
 *   { day: "2026-09-11", path: "/blog/welfare-on-day-one", views: 41, bots: 12 }
 *
 * No IP address. No user agent. No cookie, no localStorage, no identifier of
 * any kind, so nothing here can be traced to a person even by us, and there
 * is nothing to disclose in a subject access request because there is no
 * subject. That is a deliberate trade: it means we CANNOT report unique
 * visitors, only views, and the dashboard says so rather than implying a
 * number it does not have.
 *
 * The referrer's HOST is kept — "linkedin.com", not the full URL — because
 * where a reader came from is the only signal that tells us whether any of
 * the outreach is working, and a hostname is not personal data.
 *
 * BOTS ARE COUNTED SEPARATELY AND NEVER SILENTLY. Most early traffic to a new
 * site is crawlers, and a view count that includes them is a number that
 * feels good and means nothing. They are worth knowing about on their own
 * terms: the first Googlebot hit on a new post is the answer to "has it been
 * indexed", which is a question we otherwise have to ask an external tool.
 *
 * WRITES ARE BUFFERED. One database transaction per page view would put the
 * store's write path on the public site's critical path. Views accumulate in
 * memory and are flushed on a timer and at shutdown, so a request costs a
 * Map lookup. The cost of that choice is stated plainly: a hard kill loses at
 * most one flush interval of counts. For a view counter that is the right
 * trade; for anything with money in it, it would not be.
 */
import fs from "node:fs";
import path from "node:path";
import { collection, insert, mutate, remove } from "./store.js";

const COLLECTION = "pageviews";

/** How long a day's counts are kept. Fourteen months, so a year-on-year
 *  comparison is possible for the first time next autumn without holding
 *  history nobody will read. */
const KEEP_DAYS = 430;

export const today = (at = new Date()) => at.toISOString().slice(0, 10);

// --------------------------------------------------------------- what is a bot
//
// Substring matching on the user agent, which is a declared string and can be
// anything. It is not a security control and is not treated as one: a crawler
// that lies is counted as a human, and the number is a floor rather than a
// truth. What it does reliably is separate the honest crawlers — which is all
// that is needed, because the honest ones are the ones whose visits mean
// something.
const BOT_MARKS = [
  "bot", "crawl", "spider", "slurp", "search", "fetcher", "monitor", "curl", "wget",
  "python-requests", "httpx", "headless", "lighthouse", "pagespeed", "preview",
  "facebookexternalhit", "whatsapp", "telegram", "discord", "embedly", "quora link",
  "gptbot", "oai-search", "chatgpt", "claudebot", "claude-web", "anthropic",
  "perplexity", "google-extended", "bingpreview", "applebot", "yandex", "baidu",
  "duckduck", "semrush", "ahrefs", "mj12", "dotbot", "petal", "bytespider",
];

/** True when the user agent declares itself a machine. The string is inspected
 *  and discarded — it is never stored. */
export function isBot(userAgent) {
  const ua = String(userAgent || "").toLowerCase();
  if (!ua) return true; // no user agent at all is a script, not a reader
  return BOT_MARKS.some((m) => ua.includes(m));
}

/** Which named crawler it is, for the ones worth naming, else null. */
export function crawlerName(userAgent) {
  const ua = String(userAgent || "").toLowerCase();
  const named = [
    ["googlebot", "Google"], ["bingbot", "Bing"], ["gptbot", "OpenAI GPTBot"],
    ["oai-searchbot", "OpenAI Search"], ["chatgpt-user", "ChatGPT browsing"],
    ["claudebot", "Anthropic ClaudeBot"], ["claude-web", "Anthropic Claude"],
    ["perplexitybot", "Perplexity"], ["applebot", "Apple"], ["yandex", "Yandex"],
    ["duckduckbot", "DuckDuckGo"], ["facebookexternalhit", "Facebook/LinkedIn preview"],
    ["linkedinbot", "LinkedIn"], ["twitterbot", "X/Twitter"], ["ahrefsbot", "Ahrefs"],
    ["semrushbot", "Semrush"], ["bytespider", "ByteDance"],
  ];
  for (const [mark, name] of named) if (ua.includes(mark)) return name;
  return null;
}

// -------------------------------------------------------------- the referrer
//
// The host only, lower-cased, with www dropped so one source is one row. Our
// own host is discarded: internal navigation is not a referral, and counting
// it would make the busiest "source" of traffic to the blog be the blog.

export function referrerHost(referer, selfHost = "etablix.com") {
  if (!referer) return null;
  let host;
  try { host = new URL(String(referer)).hostname.toLowerCase(); } catch { return null; }
  host = host.replace(/^www\./, "");
  if (!host || host === selfHost || host.endsWith(`.${selfHost}`)) return null;
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  return host.slice(0, 80);
}

// ------------------------------------------------------- which paths count
//
// ONLY A PATH THAT RESOLVES TO A PAGE WE ACTUALLY SERVE. This is not tidiness.
// Counting every requested path would let anybody create rows in the store by
// requesting /aaaa, /aaab, /aaac — an unbounded write from an unauthenticated
// endpoint, which is the shape of a denial of service. Resolving against the
// files on disk first means the set of countable paths is the set of pages,
// and it is fixed at deploy time.

/** The public path, normalised, or null if it is not a page. */
export function pageFor(pathname, publicDir) {
  if (typeof pathname !== "string" || pathname.length > 200) return null;
  if (pathname.includes("\0") || pathname.includes("..")) return null;
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/") return fs.existsSync(path.join(publicDir, "index.html")) ? "/" : null;
  if (!/^\/[A-Za-z0-9/_.-]*$/.test(clean)) return null;
  const rel = clean.replace(/^\//, "");
  // A page is either exactly this .html file or this name plus .html, which is
  // how express.static is mounted. Anything with another extension is an
  // asset: a stylesheet is not a reader.
  const candidates = rel.endsWith(".html") ? [rel] : [`${rel}.html`, `${rel}/index.html`];
  for (const c of candidates) {
    const full = path.join(publicDir, c);
    if (!full.startsWith(publicDir)) return null;
    if (fs.existsSync(full)) return clean.replace(/\.html$/, "") || "/";
  }
  return null;
}

// ------------------------------------------------------------- the buffer

/** day|path → { day, path, views, bots, refs: Map, crawlers: Map } */
let buffer = new Map();

function bucket(day, page) {
  const key = `${day}|${page}`;
  let b = buffer.get(key);
  if (!b) { b = { day, page, views: 0, bots: 0, refs: new Map(), crawlers: new Map() }; buffer.set(key, b); }
  return b;
}

const bump = (map, key) => { if (key) map.set(key, (map.get(key) || 0) + 1); };

/**
 * Record one view. Never throws: a counter that can break a page request is
 * worse than no counter, and this one sits in front of the whole public site.
 */
export function record({ page, userAgent, referer, day = today() }) {
  try {
    if (!page) return null;
    const b = bucket(day, page);
    if (isBot(userAgent)) {
      b.bots += 1;
      bump(b.crawlers, crawlerName(userAgent));
    } else {
      b.views += 1;
      bump(b.refs, referrerHost(referer));
    }
    return b;
  } catch { return null; }
}

/** What is in memory and not yet written, for the dashboard to add on. */
export function pending() {
  return [...buffer.values()].map((b) => ({
    day: b.day, page: b.page, views: b.views, bots: b.bots,
    refs: Object.fromEntries(b.refs), crawlers: Object.fromEntries(b.crawlers),
  }));
}

const merge = (into = {}, from = {}) => {
  const out = { ...into };
  for (const [k, n] of Object.entries(from)) out[k] = (out[k] || 0) + n;
  return out;
};

/**
 * Write the buffer into the store and empty it.
 *
 * One row per day per page, incremented — not one row per view. A busy month
 * is a few hundred rows rather than a few hundred thousand, which is the
 * difference between a counter the store can hold for ever and one that has
 * to be thrown away.
 */
export function flushViews() {
  if (!buffer.size) return { written: 0, rows: 0 };
  const pendingRows = [...buffer.values()];
  buffer = new Map();
  let written = 0;
  for (const b of pendingRows) {
    try {
      const existing = collection(COLLECTION).find((r) => r.day === b.day && r.page === b.page);
      const refs = Object.fromEntries(b.refs);
      const crawlers = Object.fromEntries(b.crawlers);
      if (existing) {
        mutate(COLLECTION, existing.id, (cur) => ({
          views: (cur.views || 0) + b.views,
          bots: (cur.bots || 0) + b.bots,
          refs: merge(cur.refs, refs),
          crawlers: merge(cur.crawlers, crawlers),
        }));
      } else {
        insert(COLLECTION, { day: b.day, page: b.page, views: b.views, bots: b.bots, refs, crawlers });
      }
      written += b.views + b.bots;
    } catch (err) {
      // Put it back rather than lose it: a failed write is a reason to try
      // again next interval, not a reason to discard the counts.
      const key = `${b.day}|${b.page}`;
      if (!buffer.has(key)) buffer.set(key, b);
      console.error(`[reach] could not write ${key}: ${err.message}`);
    }
  }
  return { written, rows: collection(COLLECTION).length };
}

/** Drop days past the retention window. */
export function prune(from = today()) {
  const cutoff = new Date(Date.parse(`${from}T00:00:00Z`) - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  const gone = collection(COLLECTION).filter((r) => r.day < cutoff);
  for (const row of gone) remove(COLLECTION, row.id);
  return gone.length;
}

// ------------------------------------------------------------ the middleware

/**
 * Express middleware. Counts GET requests for pages and gets out of the way.
 *
 * Mounted AFTER the API and BEFORE the static handler, so it sees page
 * requests and not the hundred asset requests each one drags behind it.
 */
export function viewCounter({ publicDir, day = today } = {}) {
  return function countView(req, res, next) {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      const p = req.path;
      if (p.startsWith("/api") || p.startsWith("/internal") || p.startsWith("/shared")) return next();
      const page = pageFor(p, publicDir);
      if (page) record({ page, userAgent: req.get("user-agent"), referer: req.get("referer"), day: day() });
    } catch { /* never break a page for a counter */ }
    next();
  };
}

let timer = null;

/** Flush on a timer, and prune once a day's worth of intervals have passed. */
export function startViewFlush({ intervalMs = 60000 } = {}) {
  if (timer) return () => stopViewFlush();
  let ticks = 0;
  timer = setInterval(() => {
    flushViews();
    if ((ticks += 1) % Math.max(1, Math.round(86400000 / intervalMs)) === 0) {
      try { prune(); } catch (err) { console.error(`[reach] prune failed: ${err.message}`); }
    }
  }, intervalMs);
  timer.unref?.();
  return () => stopViewFlush();
}

export function stopViewFlush() {
  if (timer) clearInterval(timer);
  timer = null;
  return flushViews();
}

// --------------------------------------------------------------- the reading

/**
 * The numbers, for the dashboard and the status command.
 *
 * Includes what is still in memory, so a page opened thirty seconds after a
 * visit shows that visit. A dashboard that lags its own store by a minute is
 * a dashboard people stop believing.
 */
export function summary({ from = today(), days = 30, top = 12 } = {}) {
  const since = new Date(Date.parse(`${from}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10);
  const rows = [...collection(COLLECTION), ...pending()].filter((r) => r.day >= since && r.day <= from);

  const byPage = new Map();
  const byDay = new Map();
  let views = 0, bots = 0;
  const refs = {}, crawlers = {};

  for (const r of rows) {
    views += r.views || 0;
    bots += r.bots || 0;
    const pg = byPage.get(r.page) || { page: r.page, views: 0, bots: 0 };
    pg.views += r.views || 0; pg.bots += r.bots || 0;
    byPage.set(r.page, pg);
    const d = byDay.get(r.day) || { day: r.day, views: 0, bots: 0 };
    d.views += r.views || 0; d.bots += r.bots || 0;
    byDay.set(r.day, d);
    for (const [k, n] of Object.entries(r.refs || {})) refs[k] = (refs[k] || 0) + n;
    for (const [k, n] of Object.entries(r.crawlers || {})) crawlers[k] = (crawlers[k] || 0) + n;
  }

  const ordered = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));
  const todayRow = byDay.get(from) || { day: from, views: 0, bots: 0 };

  return {
    from: since,
    to: from,
    days,
    views,
    bots,
    // Said plainly, because the honest limitation is part of the number.
    counts: "page views, not unique visitors — no identifier of any kind is stored",
    today: { views: todayRow.views, bots: todayRow.bots },
    pages: [...byPage.values()].sort((a, b) => b.views - a.views || b.bots - a.bots).slice(0, top),
    daily: [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1)),
    referrers: ordered(refs).slice(0, top),
    crawlers: ordered(crawlers).slice(0, top),
  };
}

/** Total views for one page over all time held, for the blog status report. */
export function viewsForPage(page) {
  let views = 0, bots = 0, firstCrawl = null;
  for (const r of [...collection(COLLECTION), ...pending()]) {
    if (r.page !== page) continue;
    views += r.views || 0;
    bots += r.bots || 0;
    if (r.bots && (!firstCrawl || r.day < firstCrawl)) firstCrawl = r.day;
  }
  return { page, views, bots, firstCrawl };
}

/**
 * The counts the browser beacon collected before this existed.
 *
 * THE DEFECT THIS CLOSES. There were two counters. The first was a
 * sendBeacon() call in the site's own JavaScript, posting to a public
 * endpoint. It worked, and it was wrong in three ways that all point the same
 * direction: it counted nobody with JavaScript off, it counted no crawler at
 * all — so it could never answer "has Google seen the new post" — and it was
 * rate-limited per address, which silently discards traffic from behind one
 * corporate NAT, which is precisely who we are writing for.
 *
 * Two counters that disagree are worse than either alone, because the first
 * question about any number becomes which counter produced it. So the beacon
 * is retired and its history is brought across, once, at boot. A day the
 * beacon recorded keeps its total; it is marked so a restart cannot double
 * it, and the original row is left untouched so the import can be checked
 * against it a year from now.
 */
export function importLegacyTraffic() {
  let moved = 0;
  for (const row of collection("traffic")) {
    if (row.importedToPageviews) continue;
    const paths = row.paths || {};
    const refs = row.referrers || {};
    // The old row held one referrer map for the whole day rather than per
    // page, so there is no honest way to split it across pages. It is
    // attributed to the busiest page of that day and the note says so.
    const busiest = Object.entries(paths).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    for (const [page, n] of Object.entries(paths)) {
      const existing = collection(COLLECTION).find((r) => r.day === row.date && r.page === page);
      const payload = {
        views: n,
        bots: 0,
        refs: page === busiest ? refs : {},
        crawlers: {},
        source: "beacon (imported)",
      };
      if (existing) mutate(COLLECTION, existing.id, (cur) => ({ views: (cur.views || 0) + n, refs: merge(cur.refs, payload.refs) }));
      else insert(COLLECTION, { day: row.date, page, ...payload });
      moved += n;
    }
    mutate("traffic", row.id, () => ({ importedToPageviews: true }));
  }
  return moved;
}
