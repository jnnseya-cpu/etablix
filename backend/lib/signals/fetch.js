/**
 * The polite fetcher.
 *
 * Everything the watcher reads goes through here, and it is deliberately the
 * only way out. Three rules are enforced in one place rather than remembered
 * in several:
 *
 *   1. robots.txt is read and obeyed, per host, before any other request.
 *   2. One request per host at a time, no faster than the host's own
 *      Crawl-delay, and never faster than MIN_INTERVAL.
 *   3. Conditional requests, so a page that has not changed costs a 304 and
 *      not a download.
 *
 * WHY THIS IS NOT OPTIONAL. A crawler that ignores robots.txt is not a
 * technical shortcut, it is a company deciding that other people's stated
 * wishes do not apply to it — and ETABLIX sells accountability. It is also
 * the fastest way to have the domain blocked by the very organisations the
 * watcher exists to find.
 *
 * No third-party service, no API key, no dependency outside Node.
 */
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export /**
 * AND THE q VALUES HAVE TO BE RIGHT, WHICH MINE WERE NOT.
 *
 * The first fix added JSON at q=0.9 and left text/html with no q at all —
 * which means q=1.0. So every server that can serve both was being told
 * plainly that HTML was PREFERRED. Contracts Finder had answered with 100
 * OCDS notices an hour earlier; after the "fix" it answered with a web page
 * and parsed to nothing, and TenderNed did the same. A content-negotiation
 * header that lies about what you want is worse than one that offers too
 * little, because it fails quietly and looks like the publisher's fault.
 *
 * JSON first at full weight, the feed types next, HTML below them, and a
 * catch-all at the bottom so a server with nothing else still answers.
 */
const ACCEPT = [
  "application/json",
  "application/rss+xml",
  "application/atom+xml",
  "application/xml;q=0.9",
  "text/xml;q=0.9",
  "text/html;q=0.8",
  "application/xhtml+xml;q=0.8",
  "*/*;q=0.5",
].join(", ");

const UA = "ETABLIX-SignalWatch/1.0 (+https://etablix.com/robots-contact)";
const MIN_INTERVAL = 5000;        // never hit the same host faster than this
const ROBOTS_TTL = 24 * 3600_000;
const MAX_BYTES = 2_000_000;      // a listing page; anything larger is not one
const TIMEOUT_MS = 20_000;

const robotsCache = new Map();    // host -> { at, rules }
const lastHit = new Map();        // host -> timestamp
const conditional = new Map();    // url  -> { etag, lastModified }

/**
 * WHAT A HOST HAS TOLD US, KEPT WHERE THE NEXT PROCESS CAN READ IT.
 *
 * THE FAILURE THIS ANSWERS, AND IT WAS ARITHMETIC RATHER THAN BAD LUCK. Find a
 * Tender and Contracts Finder both began answering 429 in a hundredth of a
 * second with an empty body — an edge rate limiter, not a slow query, and
 * earned honestly. One run of the operator script asked Find a Tender for
 * about nineteen addresses during the source check and then the same nineteen
 * again during the sweep, because those are separate node processes and
 * MIN_INTERVAL lived in a Map that dies with each one. Three runs inside an
 * hour is a hundred requests to one government service from one address.
 *
 * So the spacing and the penalty box both go on the data volume, where every
 * process that follows can see them. Two consequences, and the second matters
 * more than the first: a cooling host costs no request at all, not even
 * robots.txt, and the reader is told when it clears instead of watching the
 * same four lines fail every time.
 *
 * Degrades to memory if the volume is not writable. A watcher that cannot
 * write a throttle file should still be polite, not refuse to run.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.ETABLIX_DATA_DIR
  ? path.resolve(process.env.ETABLIX_DATA_DIR)
  : path.resolve(HERE, "..", "..", "data");
const HOSTS_FILE = path.join(DATA_DIR, "signals-hosts.json");

const BACKOFF_BASE = 15 * 60_000;   // first 429: a quarter of an hour
const BACKOFF_MAX = 6 * 3600_000;   // and never more than six hours

let hostsMemo = null;

function hosts() {
  if (hostsMemo) return hostsMemo;
  try { hostsMemo = JSON.parse(fs.readFileSync(HOSTS_FILE, "utf8")) || {}; }
  catch { hostsMemo = {}; }
  if (typeof hostsMemo !== "object" || Array.isArray(hostsMemo)) hostsMemo = {};
  return hostsMemo;
}

function rememberHost(host, patch) {
  const all = hosts();
  all[host] = { ...(all[host] || {}), ...patch };
  // Atomic, so a run interrupted halfway cannot leave a half-written file that
  // reads as "nothing is cooling" on the next run.
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${HOSTS_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(all, null, 2));
    fs.renameSync(tmp, HOSTS_FILE);
  } catch { /* memory only; politeness is kept either way */ }
}

/** When a host may be approached again, or 0 if it may be approached now. */
export function coolingUntil(host) {
  const until = Number((hosts()[host] || {}).until || 0);
  return until > Date.now() ? until : 0;
}

/**
 * Retry-After is either a count of seconds or an HTTP date, and a server under
 * load is entitled to say either. Honour what it asks for in preference to our
 * own guess, within reason — a header asking for a week is not a reason to
 * stop watching a portal for a week.
 */
export function retryAfterMs(header) {
  if (!header) return null;
  const secs = Number(String(header).trim());
  if (Number.isFinite(secs) && secs >= 0) return Math.min(secs * 1000, BACKOFF_MAX);
  const at = Date.parse(String(header));
  if (!Number.isNaN(at)) return Math.min(Math.max(at - Date.now(), 0), BACKOFF_MAX);
  return null;
}

/** Parse robots.txt into the groups that apply to us, plus any crawl delay. */
export function parseRobots(text) {
  const groups = [];
  let current = null;
  for (const raw of String(text || "").split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const field = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (field === "user-agent") {
      // A blank line is not required between groups in the wild, so a
      // user-agent line after rules starts a new group rather than adding
      // to the last one.
      if (!current || current.rules.length) groups.push((current = { agents: [], rules: [], delay: 0 }));
      current.agents.push(value.toLowerCase());
    } else if (current && (field === "disallow" || field === "allow")) {
      current.rules.push({ allow: field === "allow", path: value });
    } else if (current && field === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) current.delay = Math.min(n, 120) * 1000;
    }
  }
  return groups;
}

/** The group that applies to us: our own name if named, otherwise "*". */
function applicable(groups, ua) {
  const name = ua.split("/")[0].toLowerCase();
  return groups.find((g) => g.agents.some((a) => a !== "*" && name.includes(a)))
      || groups.find((g) => g.agents.includes("*"))
      || { rules: [], delay: 0 };
}

/**
 * Longest-match wins, and Allow beats Disallow at equal length — the rule
 * every major crawler follows. An empty Disallow means "nothing is barred".
 */
export function allowed(group, pathname) {
  let best = null;
  for (const r of group.rules) {
    if (!r.path) { if (!r.allow) continue; }      // "Disallow:" with no value
    if (!r.path || !pathname.startsWith(r.path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

async function robotsFor(origin) {
  const hit = robotsCache.get(origin);
  if (hit && Date.now() - hit.at < ROBOTS_TTL) return hit.rules;
  let groups = [];
  let closed = null;
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": UA, accept: "text/plain" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // 404 means no robots.txt, which means everything is permitted. A 5xx
    // means the host could not tell us, and the conservative reading of a
    // host that cannot answer is to stay out until it can.
    if (res.status === 200) groups = parseRobots(await res.text());
    else if (res.status >= 500) closed = "the host could not serve robots.txt (5xx)";
  } catch (err) {
    // UNREACHABLE IS NOT THE SAME AS FORBIDDEN, AND SAYING SO MATTERS.
    //
    // Both fail closed — staying out when the rules cannot be read is the
    // only defensible default. But the first check run from a machine with
    // no outbound access reported four live, well-run sites as "barred by
    // robots.txt", which is a statement about those sites that was untrue.
    // A diagnostic that blames the wrong party sends somebody to apologise
    // to a publisher for their own firewall.
    closed = `robots.txt could not be fetched (${err.name === "TimeoutError" ? "timed out" : err.message})`;
  }
  const rules = closed
    ? { rules: [{ allow: false, path: "/" }], delay: 0, unreachable: closed }
    : applicable(groups, UA);
  robotsCache.set(origin, { at: Date.now(), rules });
  return rules;
}

/**
 * Fetch a URL politely, or refuse and say why.
 *
 * Returns { ok, status, body, notModified, blocked, reason }. `blocked` is
 * robots refusing; it is not an error and must not be retried.
 */
export async function politeFetch(url, { now = Date.now } = {}) {
  let u;
  try { u = new URL(url); } catch { return { ok: false, reason: "not a url" }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, reason: "unsupported scheme" };

  // A COOLING HOST COSTS NOTHING, NOT EVEN ROBOTS.TXT. Checking robots first
  // would spend a request on the very host that has asked us to stop, which is
  // how a penalty box gets extended rather than served.
  const cool = coolingUntil(u.host);
  if (cool) {
    const mins = Math.ceil((cool - Date.now()) / 60_000);
    return { ok: false, cooling: true, until: cool,
      reason: `rate limited — not asking again for ${mins} min (until ${new Date(cool).toISOString().slice(11, 16)} UTC)` };
  }

  const group = await robotsFor(u.origin);
  if (group.unreachable) return { ok: false, unreachable: true, reason: group.unreachable };
  if (!allowed(group, u.pathname)) return { ok: false, blocked: true, reason: "robots.txt disallows this path" };

  // The last approach as recorded by ANY process, not just this one. The
  // check and the sweep are separate invocations and used to each start with a
  // clean memory, so five seconds apart was never five seconds apart.
  const wait = Math.max(MIN_INTERVAL, group.delay || 0);
  const seenAt = Math.max(lastHit.get(u.host) || 0, Number((hosts()[u.host] || {}).lastHit || 0));
  const since = now() - seenAt;
  if (since < wait) await sleep(wait - since);
  lastHit.set(u.host, now());
  rememberHost(u.host, { lastHit: now() });

  const prior = conditional.get(url) || {};
  // JSON IS IN THE LIST, AND IT WAS NOT.
  // TenderNed answered 406 Not Acceptable to a perfectly good request: the
  // accept header offered only HTML and XML, and it serves JSON. A notice API
  // that refuses on content negotiation reads on screen exactly like a dead
  // URL, and that is how the most valuable class of source in the file gets
  // written off as broken.
  const headers = { "user-agent": UA, accept: ACCEPT };
  if (prior.etag) headers["if-none-match"] = prior.etag;
  if (prior.lastModified) headers["if-modified-since"] = prior.lastModified;

  try {
    const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 304) return { ok: true, status: 304, notModified: true, body: "" };
    const etag = res.headers.get("etag");
    const lastModified = res.headers.get("last-modified");
    if (etag || lastModified) conditional.set(url, { etag, lastModified });
    /**
     * TOO MANY REQUESTS IS AN INSTRUCTION, NOT AN ERROR.
     *
     * Treated as a plain failure it reads on screen exactly like a dead URL,
     * and the next run makes the same requests again — which is what turned a
     * day of enthusiastic testing into a ban on two government services. 503
     * is included because a host under load saying "later" deserves the same
     * courtesy, and both carry Retry-After often enough to honour it.
     */
    if (res.status === 429 || res.status === 503) {
      let why = "";
      try { why = (await res.text()).slice(0, 500); } catch { /* usually empty */ }
      const strikes = Number((hosts()[u.host] || {}).strikes || 0) + 1;
      const asked = retryAfterMs(res.headers.get("retry-after"));
      const guessed = Math.min(BACKOFF_BASE * 2 ** (strikes - 1), BACKOFF_MAX);
      const until = now() + (asked ?? guessed);
      rememberHost(u.host, { until, strikes, why: `http ${res.status}` });
      const mins = Math.ceil((until - now()) / 60_000);
      return { ok: false, status: res.status, cooling: true, until, body: why,
        reason: `http ${res.status} — backing off ${mins} min${asked != null ? " (Retry-After)" : ""}, until ${new Date(until).toISOString().slice(11, 16)} UTC` };
    }

    if (!res.ok) {
      // KEEP A LITTLE OF THE ERROR BODY, AND ONLY A LITTLE.
      // A notice API that refuses a request almost always says which
      // parameter it wanted. Throwing that away left the check tool able to
      // report "http 400" and nothing else, which for a POST-only or
      // key-gated API is a dead end rather than a clue. Capped hard and never
      // stored on a signal — it exists for the diagnostic to print and
      // nothing else reads it.
      let why = "";
      try { why = (await res.text()).slice(0, 500); } catch { /* no body to read */ }
      return { ok: false, status: res.status, reason: `http ${res.status}`, body: why };
    }

    // Read with a ceiling. A listing page that is two megabytes is not a
    // listing page, and streaming the rest of it helps nobody.
    // It answered. Forget the strikes, so one bad afternoon does not keep
    // doubling a backoff for the rest of the week.
    if (Number((hosts()[u.host] || {}).strikes || 0)) rememberHost(u.host, { strikes: 0, until: 0, why: null });

    const reader = res.body?.getReader();
    if (!reader) return { ok: true, status: res.status, body: (await res.text()).slice(0, MAX_BYTES) };
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); break; }
      chunks.push(value);
    }
    return { ok: true, status: res.status, body: Buffer.concat(chunks).toString("utf8") };
  } catch (err) {
    return { ok: false, reason: err.name === "TimeoutError" ? "timed out" : err.message };
  }
}

/** Test seam: forget what has been cached about hosts and pages. */
export function resetFetchState() {
  robotsCache.clear();
  lastHit.clear();
  conditional.clear();
  hostsMemo = {};
  // Emptied rather than removed: this file lives on the data volume beside
  // things that must never be deleted, and an empty object reads identically.
  try { if (fs.existsSync(HOSTS_FILE)) fs.writeFileSync(HOSTS_FILE, "{}"); } catch { /* memory is enough */ }
}
