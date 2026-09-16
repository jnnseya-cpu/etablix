#!/usr/bin/env node
/**
 * Every sitemap URL, asked of the running server, with redirects switched off.
 *
 *   node backend/tools/check-indexing.mjs [--base http://localhost:3000]
 *
 * Search Console reports "Page with redirect" and "Blocked by robots.txt" as
 * reasons a page was not indexed. Neither is an error on its own — a redirect
 * from www to the apex is correct, and a blocked /internal/ is deliberate.
 * They become defects in exactly three situations, and nothing in the markup
 * reveals any of them. Only asking the server does:
 *
 *   1. A URL in the sitemap answers a redirect. The sitemap is a list of the
 *      URLs that should be indexed; every one of them must answer 200 at the
 *      address given, or Google indexes the target and reports the listed one
 *      as "Page with redirect".
 *   2. A URL in the sitemap is disallowed by robots.txt. Then the site is
 *      asking for a page to be indexed and forbidding it to be read.
 *   3. A canonical points somewhere other than the URL in the sitemap, or at
 *      a URL that redirects. Then the two strongest signals disagree.
 *
 * It also reports which public pages link into a robots-blocked path. Those
 * links are how Google discovers a blocked URL in the first place, and they
 * are why "Blocked by robots.txt" appears in the report at all.
 *
 * Infrastructure redirects — http to https, www to apex, a CDN's trailing
 * slash rule — happen in front of this process and cannot be seen from here.
 * The script says so rather than implying it checked.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = path.join(root, "frontend", "public");

const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");

/* ---------- robots.txt: the rules that apply to Googlebot ---------- */
function robotsRules() {
  const txt = fs.readFileSync(path.join(PUBLIC, "robots.txt"), "utf8");
  const groups = [];
  let cur = null;
  for (const raw of txt.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, field, value] = [m[0], m[1].toLowerCase(), m[2].trim()];
    if (field === "user-agent") {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(value.toLowerCase());
    } else if (cur && (field === "allow" || field === "disallow")) {
      cur.rules.push({ allow: field === "allow", path: value });
    }
  }
  // Googlebot matches its own group if present, otherwise the wildcard group.
  const pick = groups.find((g) => g.agents.includes("googlebot"))
            || groups.find((g) => g.agents.includes("*"));
  return { groups, rules: pick ? pick.rules : [], agent: pick ? pick.agents.join(", ") : "none" };
}

/* longest matching rule wins; a tie goes to Allow. That is the REP order. */
function blocked(rules, pathname) {
  let best = null;
  for (const r of rules) {
    if (!r.path) continue;
    const prefix = r.path.replace(/\*$/, "");
    if (!pathname.startsWith(prefix)) continue;
    if (!best || prefix.length > best.len || (prefix.length === best.len && r.allow)) {
      best = { len: prefix.length, allow: r.allow, rule: (r.allow ? "Allow: " : "Disallow: ") + r.path };
    }
  }
  return best && !best.allow ? best.rule : null;
}

/* ---------- the sitemap ---------- */
const sitemap = fs.readFileSync(path.join(PUBLIC, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

/* ---------- canonicals declared in the markup ---------- */
function canonicals() {
  const out = new Map();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) { if (!/^(img|css|js)$/.test(e.name)) walk(f); continue; }
      if (!e.name.endsWith(".html")) continue;
      const html = fs.readFileSync(f, "utf8");
      const c = html.match(/rel="canonical"\s+href="([^"]+)"/);
      const r = html.match(/name="robots"\s+content="([^"]+)"/);
      out.set("/" + path.relative(PUBLIC, f).replace(/\\/g, "/"),
              { canonical: c ? c[1] : null, robots: r ? r[1] : null });
    }
  };
  walk(PUBLIC);
  return out;
}

/* ---------- links from public pages into blocked paths ---------- */
function linksIntoBlocked(rules) {
  const hits = [];
  for (const [file, ] of canonicals()) {
    const html = fs.readFileSync(path.join(PUBLIC, file.slice(1)), "utf8");
    for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
      const rule = blocked(rules, m[1]);
      if (rule) hits.push({ file, href: m[1], rule, nofollow: /rel="[^"]*nofollow/.test(html.slice(Math.max(0, m.index - 200), m.index + 200)) });
    }
  }
  return hits;
}

/* ---------- run ---------- */
const { rules, agent } = robotsRules();
const canon = canonicals();
const problems = [];

console.log(`Base           ${BASE}`);
console.log(`robots group   User-agent: ${agent}`);
console.log(`Sitemap URLs   ${locs.length}\n`);

const rows = [];
for (const loc of locs) {
  const u = new URL(loc);
  let status = "—", location = "";
  try {
    const res = await fetch(BASE + u.pathname, { redirect: "manual" });
    status = res.status;
    location = res.headers.get("location") || "";
  } catch (err) {
    status = "ERR";
    location = err.message;
  }
  const block = blocked(rules, u.pathname);
  rows.push({ path: u.pathname, status, location, block });

  if (status !== 200) problems.push(`${u.pathname} → sitemap URL answers ${status}${location ? " → " + location : ""}. A sitemap URL must answer 200 at the address listed.`);
  if (block) problems.push(`${u.pathname} → in the sitemap but disallowed by robots.txt (${block}). The site is asking for it to be indexed and forbidding it to be read.`);

  // canonical agreement
  const file = u.pathname === "/" ? "/index.html"
    : (canon.has(u.pathname + ".html") ? u.pathname + ".html" : u.pathname + "/index.html");
  const meta = canon.get(file);
  if (meta && meta.canonical && meta.canonical.replace(/\/$/, "") !== loc.replace(/\/$/, ""))
    problems.push(`${u.pathname} → canonical says ${meta.canonical} but the sitemap says ${loc}. The two strongest signals disagree.`);
  if (meta && meta.robots && /noindex/i.test(meta.robots))
    problems.push(`${u.pathname} → in the sitemap but carries robots "${meta.robots}".`);
}

console.log("SITEMAP URLS");
for (const r of rows) {
  const flag = r.status !== 200 ? " ← NOT 200" : r.block ? " ← BLOCKED" : "";
  console.log(`  ${String(r.status).padEnd(4)} ${r.path.padEnd(34)}${r.location ? "→ " + r.location : ""}${flag}`);
}

const hits = linksIntoBlocked(rules);
console.log(`\nLINKS FROM PUBLIC PAGES INTO ROBOTS-BLOCKED PATHS  (${hits.length})`);
if (!hits.length) console.log("  none");
const byHref = new Map();
for (const h of hits) {
  if (!byHref.has(h.href)) byHref.set(h.href, { rule: h.rule, files: [], nofollow: 0 });
  const e = byHref.get(h.href);
  e.files.push(path.basename(h.file));
  if (h.nofollow) e.nofollow += 1;
}
for (const [href, e] of byHref)
  console.log(`  ${href}  (${e.rule})\n    linked from ${e.files.length} page(s), ${e.nofollow} with rel=nofollow: ${e.files.join(", ")}`);

console.log("\nNOT CHECKED FROM HERE");
console.log("  http → https, www → apex, and any CDN or host trailing-slash rule happen in");
console.log("  front of this process. Check those against the live site:");
console.log("    curl -sSI https://www.etablix.com/ | head -5");
console.log("    curl -sSI http://etablix.com/      | head -5");
console.log("    curl -sS -o /dev/null -w '%{http_code} %{url_effective}\\n' -L https://etablix.com/blog");

if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length})`);
  for (const p of problems) console.log("  · " + p);
  process.exit(1);
}
console.log("\nNo sitemap URL redirects, is blocked, disagrees with its canonical, or carries noindex.");
