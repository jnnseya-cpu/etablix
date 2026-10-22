/**
 * TOO MANY REQUESTS IS AN INSTRUCTION, AND THESE ARE THE TESTS THAT SAY SO.
 *
 * WHAT HAPPENED, BECAUSE THE TESTS SHOULD RECORD IT. Find a Tender and
 * Contracts Finder both began answering 429 in a hundredth of a second with an
 * empty body. Nothing was wrong with either URL: the operator script asked
 * every source once during the source check and then again during the sweep,
 * those are separate node processes, and the five-second spacing lived in a Map
 * that dies with the process. Twelve pages of a deep window, six named
 * notices, two portals, doubled, three times in an hour.
 *
 * A watcher that cannot take "wait" for an answer will be refused service, and
 * the refusal looked exactly like a broken source — which is the expensive
 * part, because it sends the reader to fix a file that was correct.
 *
 * These tests run against a temporary data directory. The one in the
 * repository holds real queued signals and a test has written into it before.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-ratelimit-"));
process.env.ETABLIX_DATA_DIR = TMP;      // BEFORE the import: read at load time

const F = await import("../lib/signals/fetch.js");
const HOSTS = path.join(TMP, "signals-hosts.json");

let pass = 0, fail = 0;
const ok = (cond, what, saw) => {
  if (cond) { pass++; console.log(`  ✓ ${what}`); }
  else { fail++; console.log(`  ✗ ${what}${saw !== undefined ? `\n      saw: ${saw}` : ""}`); }
};

/** A stub that counts, so "no request was made" is provable rather than hoped. */
let calls = [];
function serve(map) {
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const key = Object.keys(map).find((k) => String(url).includes(k));
    const r = key ? map[key] : { status: 404, body: "" };
    return {
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      headers: new Headers(r.headers || {}),
      text: async () => r.body || "",
      body: null,
    };
  };
}

console.log("\n=== Retry-After is read in both the forms a server may use ===\n");
{
  ok(F.retryAfterMs("60") === 60_000, "a count of seconds");
  ok(F.retryAfterMs("0") === 0, "and zero, which means now");
  const soon = new Date(Date.now() + 120_000).toUTCString();
  const got = F.retryAfterMs(soon);
  ok(got > 110_000 && got <= 120_000, "an HTTP date", got);
  ok(F.retryAfterMs(new Date(Date.now() - 60_000).toUTCString()) === 0,
     "a date in the past asks for no wait at all");
  ok(F.retryAfterMs("nonsense") === null, "and anything else is not honoured");
  ok(F.retryAfterMs(null) === null, "nor is a missing header");
  // A header asking for a week is not a reason to stop watching for a week.
  ok(F.retryAfterMs("999999999") === 6 * 3600_000, "an absurd request is capped at six hours",
     F.retryAfterMs("999999999"));
}

console.log("\n=== a 429 puts the host away, and says until when ===\n");
{
  F.resetFetchState();
  serve({
    "/robots.txt": { status: 200, body: "User-agent: *\nAllow: /\n" },
    "/api/thing": { status: 429, body: "", headers: { "retry-after": "60" } },
  });

  const res = await F.politeFetch("https://limiter.test/api/thing");
  ok(res.ok === false, "the request did not succeed");
  ok(res.cooling === true, "and it is reported as cooling, not as a broken source", JSON.stringify(res.reason));
  ok(/Retry-After/.test(res.reason), "the reason says the server asked for it", res.reason);
  ok(res.until > Date.now(), "and carries the time it clears");

  ok(fs.existsSync(HOSTS), "the backoff is written to the data volume, where the next process can read it");
  const saved = JSON.parse(fs.readFileSync(HOSTS, "utf8"));
  ok(saved["limiter.test"] && saved["limiter.test"].until > Date.now(), "keyed by host", JSON.stringify(saved));
  ok(saved["limiter.test"].strikes === 1, "with a strike recorded, so a second refusal waits longer");

  // THE WHOLE POINT: the next approach must cost nothing at all.
  const before = calls.length;
  const again = await F.politeFetch("https://limiter.test/api/thing");
  ok(again.cooling === true, "a cooling host is refused locally");
  ok(calls.length === before, "and NO request is made — not even robots.txt", `${calls.length - before} made`);
  ok(F.coolingUntil("limiter.test") > Date.now(), "and the cooldown is readable for a report");
}

console.log("\n=== without Retry-After it backs off on its own, and doubles ===\n");
{
  F.resetFetchState();
  serve({
    "/robots.txt": { status: 200, body: "User-agent: *\nAllow: /\n" },
    "/x": { status: 429, body: "" },
  });
  const first = await F.politeFetch("https://noheader.test/x");
  const mins = Math.round((first.until - Date.now()) / 60_000);
  ok(mins >= 14 && mins <= 15, "a first refusal waits a quarter of an hour", `${mins} min`);

  // Forget only the cooldown, keeping the strike, which is what a later run
  // sees once the clock has run down.
  const all = JSON.parse(fs.readFileSync(HOSTS, "utf8"));
  all["noheader.test"].until = 0;
  fs.writeFileSync(HOSTS, JSON.stringify(all));
  F.resetFetchState.length;                     // no-op: keep the file, drop nothing
  const F2 = await import(`../lib/signals/fetch.js?v=${Date.now()}`);
  const second = await F2.politeFetch("https://noheader.test/x");
  const mins2 = Math.round((second.until - Date.now()) / 60_000);
  ok(mins2 >= 29 && mins2 <= 30, "and a second doubles it", `${mins2} min`);
}

console.log("\n=== 503 is treated the same, because \"later\" deserves the courtesy ===\n");
{
  F.resetFetchState();
  serve({
    "/robots.txt": { status: 200, body: "User-agent: *\nAllow: /\n" },
    "/y": { status: 503, body: "" },
  });
  const res = await F.politeFetch("https://busy.test/y");
  ok(res.cooling === true, "a 503 also backs off", JSON.stringify(res.reason));
}

console.log("\n=== a good answer clears the record ===\n");
{
  F.resetFetchState();
  serve({
    "/robots.txt": { status: 200, body: "User-agent: *\nAllow: /\n" },
    "/z": { status: 429, body: "" },
  });
  await F.politeFetch("https://recovers.test/z");
  ok(F.coolingUntil("recovers.test") > 0, "it is cooling after the refusal");

  // The clock runs down, and this time the host answers.
  const all = JSON.parse(fs.readFileSync(HOSTS, "utf8"));
  all["recovers.test"].until = 0;
  fs.writeFileSync(HOSTS, JSON.stringify(all));
  const F3 = await import(`../lib/signals/fetch.js?v=${Date.now()}-b`);
  serve({
    "/robots.txt": { status: 200, body: "User-agent: *\nAllow: /\n" },
    "/z": { status: 200, body: '{"releases":[]}' },
  });
  const good = await F3.politeFetch("https://recovers.test/z");
  ok(good.ok === true, "then it answers", JSON.stringify(good.reason || good.status));
  const after = JSON.parse(fs.readFileSync(HOSTS, "utf8"));
  ok(Number(after["recovers.test"].strikes || 0) === 0,
     "and the strikes are forgotten, so one bad afternoon does not compound for a week",
     JSON.stringify(after["recovers.test"]));
}

console.log("\n=== and it wrote nothing into the repository's own data directory ===\n");
{
  // A test has done this before, and four fixture rows ended up in the dev
  // store. The temporary directory is the whole safety of this file.
  const repoHosts = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "data", "signals-hosts.json");
  ok(!fs.existsSync(repoHosts), "no throttle file in backend/data", repoHosts);
  ok(fs.existsSync(HOSTS) && HOSTS.startsWith(os.tmpdir()), "it all went to a temporary directory", HOSTS);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
