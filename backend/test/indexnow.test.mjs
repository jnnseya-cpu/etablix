/**
 * IndexNow, and the verification the engines will ask for.
 *
 *   node backend/test/indexnow.test.mjs
 *
 * The submission itself is tested against a stub rather than against the live
 * endpoint. Submitting to a real search engine from a test run would be
 * telling four companies that the site changed every time anybody runs the
 * suite, which is how a domain gets rate-limited and quality-scored down.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readKey, submit, changedSince, urlsFromSitemap, ENDPOINT } from "../lib/indexnow.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUB = path.join(root, "frontend", "public");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== IndexNow ===\n");

// --- the key
console.log("--- the key\n");
const { key, file, error } = readKey();
ok(!error, error || `key ${key} published at /${file}`);
ok(/^[a-f0-9]{8,128}$/i.test(key || ""), "it is 8 to 128 hexadecimal characters, as the protocol requires", key);
ok(fs.readFileSync(path.join(PUB, file), "utf8").trim() === key,
   "and the file contains exactly its own name — which is the whole proof of ownership");
{
  // Two key files is worse than none: an engine cannot tell which is current,
  // and the failure looks exactly like nothing happening.
  const keys = fs.readdirSync(PUB).filter((f) => /^[a-f0-9]{8,128}\.txt$/i.test(f));
  ok(keys.length === 1, `exactly one key file on the site (${keys.length})`, keys.join(", "));
}

// --- what gets submitted
console.log("\n--- what gets submitted\n");
{
  const all = urlsFromSitemap();
  ok(all.length >= 16, `the sitemap yields ${all.length} URLs`);
  ok(all.every((u) => u.startsWith("https://etablix.com")), "every one on our own host");

  const recent = changedSince("2026-09-10");
  ok(recent.length > 0 && recent.length < all.length,
     `${recent.length} of them changed on or after 2026-09-10 — the point is to submit what moved, not everything`, recent);
  ok(changedSince("2099-01-01").length === 0, "and nothing at all for a date in the future");
}

// --- the submission
console.log("\n--- the submission\n");
{
  let seen = null;
  const stub = async (url, opts) => {
    seen = { url, body: JSON.parse(opts.body) };
    return { status: 200, text: async () => "" };
  };
  const r = await submit(["https://etablix.com/blog"], { key, fetchImpl: stub });
  ok(r.ok && r.submitted === 1, "one URL is accepted", r);
  ok(seen.url === ENDPOINT, "sent to the shared endpoint, which fans out to Bing, Yandex, Seznam and Naver", seen.url);
  ok(seen.body.host === "etablix.com" && seen.body.key === key, "carrying the host and the key");
  ok(seen.body.keyLocation === `https://etablix.com/${key}.txt`,
     "and the address of the key file, so the engine can check the claim", seen.body.keyLocation);
}
{
  // A first submission answers 202 while the engine goes to fetch the key
  // file. Treating that as a failure would have somebody "fixing" a working
  // integration.
  const stub = async () => ({ status: 202, text: async () => "" });
  const r = await submit(["https://etablix.com/"], { key, fetchImpl: stub });
  ok(r.ok, "202 is a success — the engine is about to verify the key, which is normal on a first submission");
  ok(/normal on a first submission/.test(r.note), "and it says so rather than leaving somebody to guess", r.note);
}
{
  const stub = async () => ({ status: 403, text: async () => "Forbidden" });
  const r = await submit(["https://etablix.com/"], { key, fetchImpl: stub });
  ok(!r.ok && /refused/.test(r.note), "a refusal is reported with its body rather than swallowed", r.note);
}
{
  // A URL on somebody else's host is dropped rather than sent. Submitting a
  // host the key does not cover gets the whole submission rejected.
  let sent = null;
  const stub = async (url, opts) => { sent = JSON.parse(opts.body); return { status: 200, text: async () => "" }; };
  const r = await submit(["https://example.com/x", "https://etablix.com/blog"], { key, fetchImpl: stub });
  ok(r.submitted === 1 && sent.urlList.length === 1, "a URL on another host is dropped, not sent", sent?.urlList);
}
{
  const r = await submit([], { key, fetchImpl: async () => { throw new Error("should not have been called"); } });
  ok(r.ok && r.submitted === 0, "nothing changed means nothing sent, and no request at all", r.note);
}

// --- verification, which is the part only a person can finish
console.log("\n--- verification\n");
{
  // app.js, not server.js: server.js is now a twenty-line entry point that
  // runs the boot checks and then loads this. The verification tags live
  // with the routes, which is where this assertion has always meant to look.
  const server = fs.readFileSync(path.join(root, "backend", "app.js"), "utf8");
  for (const v of ["GOOGLE_SITE_VERIFICATION", "BING_SITE_VERIFICATION", "GOOGLE_VERIFICATION_FILE"]) {
    ok(server.includes(v), `${v} is read from the environment, so verifying is paste-and-redeploy`);
  }
  ok(server.includes("BingSiteAuth.xml"), "and the file method is served too, for whichever the console offers");
  // With nothing set, none of it is mounted — the normal case pays nothing.
  ok(/if \(VERIFY_TAGS\.length\)/.test(server), "none of it is mounted when nothing is configured");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
