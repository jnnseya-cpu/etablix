/**
 * The trigger watcher, and the three rules it is not allowed to break.
 *
 *   node backend/test/signals.test.mjs
 *
 * WHY THIS EXISTS. The watcher was built instead of an email harvester, and
 * the difference between the two is three rules. A rule that lives in a
 * comment is a preference; these fail a build.
 *
 *   1. robots.txt is obeyed and hosts are rate limited.
 *   2. No personal email address is ever stored. Role addresses only, from a
 *      closed allowlist.
 *   3. The suppression list cannot be overridden — not by a queue write, not
 *      by marking something approached.
 *
 * The fourth assertion is structural and matters as much: there is no
 * transport anywhere in the module. The moment a watcher can also send, it
 * becomes the thing it was built instead of.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-signals-"));
process.env.ETABLIX_DATA_DIR = scratch;

const { collection, insert } = await import("../lib/store.js");
const S = await import("../lib/signals/index.js");
const C = await import("../lib/signals/contact.js");
const F = await import("../lib/signals/fetch.js");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "\n      → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== rule 1: robots.txt is obeyed, and hosts are rate limited ===\n");
{
  const txt = `
User-agent: BadBot
Disallow: /

User-agent: *
Crawl-delay: 9
Disallow: /private
Allow: /private/press
Disallow:
`;
  const groups = F.parseRobots(txt);
  const star = groups.find((g) => g.agents.includes("*"));
  ok(Boolean(star), "the wildcard group is parsed");
  ok(star.delay === 9000, `crawl-delay is read and in milliseconds (${star.delay})`);
  ok(F.allowed(star, "/news/item") === true, "an unlisted path is allowed");
  ok(F.allowed(star, "/private/board") === false, "a disallowed path is refused");
  ok(F.allowed(star, "/private/press/release") === true, "and a longer Allow beats a shorter Disallow");

  const named = groups.find((g) => g.agents.includes("badbot"));
  ok(named && F.allowed(named, "/anything") === false, "a group that bars everything is honoured");

  const src = fs.readFileSync(path.join(root, "backend", "lib", "signals", "fetch.js"), "utf8");
  ok(/robotsFor\(/.test(src) && src.indexOf("robotsFor(") < src.indexOf("lastHit.set"),
     "robots is consulted BEFORE the request, not after it");
  ok(/MIN_INTERVAL\s*=\s*\d{4,}/.test(src), "there is a floor on how fast one host can be hit");
  ok(/if \(!allowed\(group, u\.pathname\)\) return/.test(src), "a disallowed path returns rather than fetching");
}

console.log("\n=== rule 2: no personal email address is ever stored ===\n");
{
  for (const addr of ["info@example.com", "procurement@example.com", "tenders@example.co.uk", "scm@example.com"]) {
    ok(C.isRoleAddress(addr) === true, `${addr} is a role address`);
  }
  for (const addr of [
    "john.smith@example.com", "j.smith@example.com", "jsmith2@example.com",
    "justin@example.com", "sherwin.yin@example.com", "firstname.lastname@example.com",
    "info.john@example.com", "procurement1@example.com",
  ]) {
    ok(C.isRoleAddress(addr) === false, `${addr} is NOT stored`);
  }

  const html = `<p>Write to John.Smith@example.com or j.bloggs@example.com</p>
                <p>General: enquiries@example.com</p>
                <a href="/supply-chain">Become a supplier</a>`;
  const got = C.publishedContact(html, "https://example.com/about");
  ok(got.roleAddress === "enquiries@example.com", "only the role address is returned", got);
  ok(!JSON.stringify(got).toLowerCase().includes("smith"), "no personal address survives extraction", got);
  ok(got.contactUrl === "https://example.com/supply-chain", "and the published route in is found", got.contactUrl);

  const scrubbed = C.scrub({
    title: "Contact a.person@example.com about the award",
    org: "Example", url: "https://example.com/x",
    roleAddress: "a.person@example.com",
    html: "<html>everything</html>", body: "raw page", raw: "raw",
  });
  ok(scrubbed.roleAddress === null, "a personal address in the role field is nulled");
  ok(!/a\.person@/.test(scrubbed.title), "and removed from free text", scrubbed.title);
  ok(!("html" in scrubbed) && !("body" in scrubbed) && !("raw" in scrubbed), "raw page text is never carried through");

  const q = S.queue({ org: "Example", title: "Contractor appointed — contact bob.jones@example.com", url: "https://example.com/1", summary: "" });
  ok(q.queued, "a signal queues");
  ok(!JSON.stringify(collection("signals")).includes("bob.jones@"), "and nothing personal reaches storage",
     JSON.stringify(collection("signals")).slice(0, 200));
}

console.log("\n=== rule 3: the suppression list cannot be overridden ===\n");
{
  S.suppress("blocked-co", { by: "tester", why: "asked not to be approached" });
  const blocked = S.queue({ org: "Blocked-Co Limited", title: "Blocked-Co appointed as main contractor", url: "https://blocked-co.example/1" });
  ok(blocked.queued === false && blocked.reason === "suppressed", "a suppressed organisation never enters the queue", blocked);

  const byHost = S.queue({ org: "Anonymous", title: "Main contractor appointed on the scheme", url: "https://blocked-co.example/news/2" });
  ok(byHost.queued === false, "and is caught by its domain even when unnamed", byHost);

  // Something queued before the suppression existed must still be refused.
  const row = insert("signals", { org: "Later-Co", title: "Later-Co wins award", url: "https://later-co.example/1", status: "new", score: 6, fingerprint: "x1", seenAt: Date.now() });
  S.suppress("later-co");
  let threw = null;
  try { S.act(row.id, "approached", { by: "tester" }); } catch (err) { threw = err.message; }
  ok(threw && /suppression/i.test(threw), "an already-queued signal cannot be marked approached once suppressed", threw);
  ok(collection("signals").find((s) => s.id === row.id).status === "new", "and its status is unchanged");
  ok(S.act(row.id, "dismissed", { by: "tester" }).status === "dismissed", "but it can still be dismissed");

  const routes = fs.readFileSync(path.join(root, "backend", "routes", "signals.js"), "utf8");
  ok(!/delete|unsuppress|remove.*suppress/i.test(routes.replace(/\/\*[\s\S]*?\*\//g, "")),
     "there is no API route to remove a suppression");
}

console.log("\n=== it finds moments, and it cannot send ===\n");
{
  ok(S.score("Planning permission granted for the scheme").score >= 3, "a consent is a trigger");
  ok(S.score("Balfour has been awarded the contract").score >= 3, "an award is a trigger");
  ok(S.score("Statkraft completes the acquisition of the project").score >= 3, "a transfer is a trigger");
  ok(S.score("The project reached financial close").score >= 3, "financial close is a trigger");
  ok(S.score("A nice photograph of a turbine").score === 0, "and ordinary news is not", S.score("A nice photograph of a turbine"));
  const big = S.score("Peak workforce of 800 operatives with worker accommodation on site");
  ok(big.triggers.includes("scale"), "a workforce large enough to need housing is noticed", big);

  const items = S.extract(`<rss><channel>
    <item><title>Consent granted for the scheme</title><link>https://x.example/a</link><description>Section 36 approved.</description><pubDate>Tue, 14 Oct 2026 09:00:00 GMT</pubDate></item>
    <item><title>Contractor appointed</title><link>/b</link><description>Main contractor appointed.</description></item>
  </channel></rss>`, "https://x.example/feed");
  ok(items.length === 2, `both feed items are read (${items.length})`);
  ok(items[1].url === "https://x.example/b", "and a relative link is resolved", items[1].url);

  const a = S.queue({ org: "Dedupe", title: "Consent granted", url: "https://dedupe.example/a" });
  const b = S.queue({ org: "Dedupe", title: "Consent granted", url: "https://dedupe.example/a#section" });
  ok(a.queued && !b.queued && b.reason === "already seen", "the same story does not queue twice", b);

  // The structural rule. No transport, anywhere in the module.
  for (const f of ["index.js", "fetch.js", "contact.js"]) {
    const src = fs.readFileSync(path.join(root, "backend", "lib", "signals", f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    ok(!/sendMail|nodemailer|smtp|createTransport|\bemit\(/i.test(src),
       `signals/${f} has no way to send anything`);
  }
  const routes = fs.readFileSync(path.join(root, "backend", "routes", "signals.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(!/sendMail|smtp|\bemit\(/i.test(routes), "and neither does the route");
}

console.log("\n=== the diagnostic runs on the machine you are diagnosing ===\n");
{
  // THE REGRESSION THIS PINS. signals-check.mjs imported the queue, which
  // imports the store, which imports node:sqlite. The VPS host runs Node 20,
  // where that is not a built-in module — so the tool for diagnosing a
  // problem died on startup with an error about SQLite that had nothing to
  // do with anything it does. A diagnostic that cannot run on the machine
  // you are diagnosing is not a diagnostic.
  const graph = (entry) => {
    const seen = new Set(), builtins = new Set(), stack = [entry];
    while (stack.length) {
      const f = stack.pop();
      if (seen.has(f) || !fs.existsSync(f)) continue;
      seen.add(f);
      for (const m of fs.readFileSync(f, "utf8").matchAll(/from\s+["']([^"']+)["']/g)) {
        const spec = m[1];
        if (spec.startsWith("node:")) { builtins.add(spec); continue; }
        if (spec.startsWith(".")) stack.push(path.join(path.dirname(f), spec));
      }
    }
    return { seen, builtins };
  };

  const { seen, builtins } = graph(path.join(root, "backend", "tools", "signals-check.mjs"));
  const files = [...seen].map((f) => path.relative(root, f));
  ok(!files.includes("backend/lib/store.js"), "the check tool does not reach the store", files);
  ok(!builtins.has("node:sqlite"), "and therefore not node:sqlite, which Node 20 does not have", [...builtins]);
  ok(files.includes("backend/lib/signals/parse.js"), "it takes the parsing from parse.js", files);
  ok(!files.includes("backend/lib/signals/index.js"), "and not from the queue", files);

  // parse.js must stay pure, or the split silently undoes itself.
  const pure = graph(path.join(root, "backend", "lib", "signals", "parse.js"));
  ok(![...pure.seen].some((f) => /store\.js$/.test(f)), "parse.js itself stays free of the store",
     [...pure.seen].map((f) => path.relative(root, f)));

  // And the halves still add up: everything a caller imported before the
  // split is still available from index.js.
  for (const name of ["TRIGGERS", "sources", "fingerprint", "score", "extract", "queue", "sweep", "act", "suppress", "isSuppressed"]) {
    ok(typeof S[name] !== "undefined", `index.js still exports ${name}`);
  }
}

fs.rmSync(scratch, { recursive: true, force: true });
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
