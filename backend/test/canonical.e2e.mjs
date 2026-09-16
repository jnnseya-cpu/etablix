/**
 * One address per page, asked of the running server.
 *
 *   BASE=http://localhost:3391 node backend/test/canonical.e2e.mjs
 *
 * Search Console reported pages not indexed as "Page with redirect". No
 * application route redirected, and the two reverse proxy configurations in
 * this repository disagreed about whether www should. The rule now lives in
 * the application, which means it can be tested — and the loop risk it
 * introduces has to be tested, because a trailing-slash rule in front of a
 * static handler that adds trailing slashes is an infinite redirect.
 *
 * Every assertion here is made with redirects switched off, because a test
 * that follows redirects cannot tell a 200 from a 301 to a 200, which is the
 * entire distinction Search Console was reporting.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.BASE || "http://localhost:3000").replace(/\/$/, "");
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "frontend", "public");

let passed = 0;
const failures = [];
const ok = (name, cond, detail = "") => {
  if (cond) { passed += 1; return; }
  failures.push(`${name}${detail ? " — " + detail : ""}`);
};

const raw = (p, headers = {}) =>
  fetch(BASE + p, { redirect: "manual", headers });

/* Host is a forbidden header name in fetch — undici drops it without a word,
   which is exactly how a www-to-apex rule comes to look tested when it is
   not. The raw client sends what it is given, and is closer to what a crawler
   does anyway. */
function rawHost(pathname, hostHeader) {
  const u = new URL(BASE);
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: u.hostname, port: u.port || 80, path: pathname, method: "GET",
      headers: { Host: hostHeader },
    }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, location: res.headers.location || "" });
    });
    req.on("error", reject);
    req.end();
  });
}

/* ---------------------------------------------------------------- */
/* 1. every sitemap URL answers 200 at the address listed            */
/* ---------------------------------------------------------------- */
const sitemap = fs.readFileSync(path.join(PUBLIC, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
ok("sitemap has URLs", locs.length > 0, `found ${locs.length}`);

for (const p of locs) {
  const res = await raw(p);
  ok(`sitemap 200 ${p}`, res.status === 200,
     `got ${res.status}${res.headers.get("location") ? " → " + res.headers.get("location") : ""}`);
}

/* ---------------------------------------------------------------- */
/* 2. the alternate forms of a sitemap URL redirect to it, once      */
/* ---------------------------------------------------------------- */
for (const p of locs) {
  if (p === "/") continue;

  const slash = await raw(p + "/");
  ok(`trailing slash 301 ${p}/`, slash.status === 301, `got ${slash.status}`);
  ok(`trailing slash target ${p}/`,
     (slash.headers.get("location") || "").endsWith(p), `→ ${slash.headers.get("location")}`);

  const html = await raw(p + ".html");
  ok(`.html 301 ${p}.html`, html.status === 301, `got ${html.status}`);
  ok(`.html target ${p}.html`,
     (html.headers.get("location") || "").endsWith(p), `→ ${html.headers.get("location")}`);
}

/* the root's own alternate form */
const idx = await raw("/index.html");
ok("/index.html 301", idx.status === 301, `got ${idx.status}`);
ok("/index.html → /", (idx.headers.get("location") || "").endsWith("/"), `→ ${idx.headers.get("location")}`);

/* ---------------------------------------------------------------- */
/* 3. one hop, never two: the redirect target must answer 200        */
/* ---------------------------------------------------------------- */
for (const p of ["/about/", "/about.html", "/index.html", "/policies/privacy/", "/policies/privacy.html"]) {
  const first = await raw(p);
  if (first.status !== 301) { ok(`one hop ${p}`, false, `expected 301, got ${first.status}`); continue; }
  const loc = first.headers.get("location");
  const target = loc.startsWith("http") ? new URL(loc).pathname : loc;
  const second = await raw(target);
  ok(`one hop ${p}`, second.status === 200, `${p} → ${target} → ${second.status}`);
}

/* ---------------------------------------------------------------- */
/* 4. the loop that redirect:false exists to prevent                 */
/* ---------------------------------------------------------------- */
/* /policies is a bare directory with no policies.html. With express.static's
   default redirect:true it answers 301 /policies/, which the trailing-slash
   rule strips back to /policies — for ever. It must 404 instead. */
const samePath = (a, b) => {
  const norm = (x) => (x.startsWith("http") ? new URL(x).pathname : x).replace(/\/+$/, "") || "/";
  return norm(a) === norm(b);
};

for (const dir of ["/policies", "/policies/", "/blog/", "/img", "/img/", "/css/"]) {
  const first = await raw(dir);
  if (first.status !== 301) { passed += 1; continue; }        // cannot loop
  const target = first.headers.get("location") || "";
  const second = await raw(target.startsWith("http") ? new URL(target).pathname : target);
  const back = second.headers.get("location") || "";

  // a loop is a redirect whose target redirects back to where it came from
  ok(`no loop on ${dir}`,
     !(second.status === 301 && samePath(back, dir)),
     `${dir} → ${target} → ${second.status}${back ? " → " + back : ""}`);

  // and whichever way it goes, it has to stop somewhere
  ok(`settles on ${dir}`, second.status === 200 || second.status === 404,
     `${dir} → ${target} → ${second.status}`);
}

/* the one directory that is a real page, because the app serves it explicitly */
const blogSlash = await raw("/blog/");
ok("/blog/ 301", blogSlash.status === 301, `got ${blogSlash.status}`);
const blog = await raw("/blog");
ok("/blog 200", blog.status === 200, `got ${blog.status}`);

/* ---------------------------------------------------------------- */
/* 5. www to apex, on the canonical host                             */
/* ---------------------------------------------------------------- */
/* SITE_URL in the harness is localhost, so www.localhost is the alternate.
   The rule only ever redirects "www." + the configured host, which is what
   keeps a health check or a container probe from being sent nowhere. */
const site = (() => { try { return new URL(process.env.SITE_URL || BASE); } catch { return new URL(BASE); } })();
const wwwHost = `www.${site.hostname}${site.port ? ":" + site.port : ""}`;
const wwwRes = await rawHost("/about", wwwHost);
ok("www → apex is a 301", wwwRes.status === 301, `Host: ${wwwHost} got ${wwwRes.status}`);
ok("www → apex drops the www", !/\/\/www\./.test(wwwRes.location), `→ ${wwwRes.location}`);
ok("www → apex keeps the path", wwwRes.location.endsWith("/about"), `→ ${wwwRes.location}`);

const otherHost = await rawHost("/about", "healthcheck.internal");
ok("an unknown Host is not redirected", otherHost.status === 200,
   `got ${otherHost.status} → ${otherHost.location}`);

/* ---------------------------------------------------------------- */
/* 6. what must never be normalised                                  */
/* ---------------------------------------------------------------- */
for (const p of ["/api/health", "/internal/login.html", "/sitemap.xml", "/robots.txt"]) {
  const res = await raw(p);
  ok(`untouched ${p}`, res.status !== 301, `got 301 → ${res.headers.get("location")}`);
}

/* a POST is a request to do something, not a request for an address */
const post = await fetch(BASE + "/about.html", { method: "POST", redirect: "manual" });
ok("POST is not redirected", post.status !== 301, `got ${post.status}`);

/* the query string survives */
const q = await raw("/about.html?utm_source=test&a=1");
ok("query preserved", (q.headers.get("location") || "").includes("utm_source=test&a=1"),
   `→ ${q.headers.get("location")}`);

/* ---------------------------------------------------------------- */
/* 7. no page in the sitemap is disallowed by robots.txt             */
/* ---------------------------------------------------------------- */
const robots = await (await raw("/robots.txt")).text();
const disallowed = [...robots.matchAll(/^\s*Disallow:\s*(\S+)/gim)].map((m) => m[1]);
for (const p of locs) {
  const hit = disallowed.find((d) => d !== "/" && p.startsWith(d.replace(/\*$/, "")));
  ok(`not disallowed ${p}`, !hit, `robots.txt says Disallow: ${hit}`);
}

/* ---------------------------------------------------------------- */
if (failures.length) {
  console.log(`\n=== ${passed} passed, ${failures.length} FAILED ===`);
  for (const f of failures) console.log("  · " + f);
  process.exit(1);
}
console.log(`=== ${passed} passed, 0 failed · one address per page ===`);
