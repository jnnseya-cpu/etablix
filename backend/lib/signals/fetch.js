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

export const UA = "ETABLIX-SignalWatch/1.0 (+https://etablix.com/robots-contact)";
const MIN_INTERVAL = 5000;        // never hit the same host faster than this
const ROBOTS_TTL = 24 * 3600_000;
const MAX_BYTES = 2_000_000;      // a listing page; anything larger is not one
const TIMEOUT_MS = 20_000;

const robotsCache = new Map();    // host -> { at, rules }
const lastHit = new Map();        // host -> timestamp
const conditional = new Map();    // url  -> { etag, lastModified }

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
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": UA, accept: "text/plain" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // 404 means no robots.txt, which means everything is permitted. A 5xx
    // means the host could not tell us, and the conservative reading of a
    // host that cannot answer is to stay out until it can.
    if (res.status === 200) groups = parseRobots(await res.text());
    else if (res.status >= 500) groups = [{ agents: ["*"], rules: [{ allow: false, path: "/" }], delay: 0 }];
  } catch {
    groups = [{ agents: ["*"], rules: [{ allow: false, path: "/" }], delay: 0 }];
  }
  const rules = applicable(groups, UA);
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

  const group = await robotsFor(u.origin);
  if (!allowed(group, u.pathname)) return { ok: false, blocked: true, reason: "robots.txt disallows this path" };

  const wait = Math.max(MIN_INTERVAL, group.delay || 0);
  const since = now() - (lastHit.get(u.host) || 0);
  if (since < wait) await sleep(wait - since);
  lastHit.set(u.host, now());

  const prior = conditional.get(url) || {};
  const headers = { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9" };
  if (prior.etag) headers["if-none-match"] = prior.etag;
  if (prior.lastModified) headers["if-modified-since"] = prior.lastModified;

  try {
    const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 304) return { ok: true, status: 304, notModified: true, body: "" };
    const etag = res.headers.get("etag");
    const lastModified = res.headers.get("last-modified");
    if (etag || lastModified) conditional.set(url, { etag, lastModified });
    if (!res.ok) return { ok: false, status: res.status, reason: `http ${res.status}` };

    // Read with a ceiling. A listing page that is two megabytes is not a
    // listing page, and streaming the rest of it helps nobody.
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
}
