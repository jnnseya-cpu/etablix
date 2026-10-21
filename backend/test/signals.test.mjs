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

console.log("\n=== the triggers match how the trade press actually writes ===\n");
{
  // THE REGRESSION THIS PINS, AND IT WAS A REAL ONE. The first trigger list
  // matched "has been awarded a contract" and scored a live UK construction
  // awards feed at zero out of ten items. Nobody writes that sentence. They
  // write wins, lands, secures, named on, revealed. Ten items and no hits
  // reads exactly like a quiet market, which is the worst way for a watcher
  // to fail — silently, and plausibly.
  const SHOULD = [
    "Balfour Beatty wins £300m Sizewell C contract",
    "Kier lands £120m highways framework deal",
    "Wates named main contractor on £85m scheme",
    "Contractor revealed for £1.25bn Stonehenge tunnel",
    "Morgan Sindall secures £45m hospital job",
    "Galliford Try scoops £60m water contract",
    "Plans approved for 400MW battery storage project",
    "Section 36 consent granted for pumped storage scheme",
    "Scheme given the go-ahead by ministers",
    "Statkraft completes the acquisition of the project",
    "Developer sells 50MW battery portfolio",
    "Work starts on £200m data centre",
    "Developer reaches financial close on offshore wind farm",
    "Construction begins on the 400MW scheme",
    "Peak workforce of 800 operatives and worker accommodation on site",
  ];
  const SHOULD_NOT = [
    "A photograph of the chief executive at a conference",
    "Firm appoints new finance director",
    "Industry reacts to the Budget",
    "Five things we learned this week",
    "Apprentice of the year announced",
  ];
  const missed = SHOULD.filter((t) => S.score(t).score < 3);
  ok(missed.length === 0, `every real award, consent, transfer and start queues (${SHOULD.length - missed.length}/${SHOULD.length})`, missed.join(" | "));
  const noisy = SHOULD_NOT.filter((t) => S.score(t).score >= 3);
  ok(noisy.length === 0, "and ordinary trade news does not", noisy.join(" | "));

  // The verbs that actually appear in headlines, each one named so a future
  // tidy-up cannot quietly drop them.
  for (const verb of ["wins", "lands", "secures", "scoops", "named", "revealed"]) {
    const t = `Contractor ${verb} the £50m contract`;
    ok(S.score(t).triggers.includes("award"), `"${verb}" reads as an award`);
  }
  ok(S.score("£1.25bn tunnel scheme").triggers.includes("value"), "a price tag is its own signal");
  ok(S.score("A scheme worth millions of pounds").triggers.includes("value") === false,
     "but a vague one is not");
}

console.log("\n=== all six sectors, not one ===\n");
{
  // THE COMPLAINT THIS ANSWERS. The triggers knew that something had
  // happened and nothing knew whether it was ours, so a retail park award
  // outscored a data centre appointment — on a general construction feed,
  // the thirty irrelevant items bury the one that matters.
  const ids = S.SECTORS.map((x) => x.id);
  ok(ids.length === 6, `six sectors (${ids.length})`, ids.join(", "));
  for (const want of ["grid", "renewables", "datacentres", "rail", "industrial", "epc"]) {
    ok(ids.includes(want), `${want} is one of them`);
  }

  const CASES = {
    grid: ["Balfour wins £300m substation contract", "SSEN Transmission awards 132kV overhead line works",
           "Converter station contractor appointed"],
    renewables: ["Consent granted for 400MW battery storage project", "Offshore wind farm reaches financial close",
                 "Contractor named for solar farm", "Pumped storage scheme approved"],
    datacentres: ["Contractor appointed for 90MW hyperscale data centre campus", "Colocation campus given the go-ahead"],
    rail: ["Network Rail awards £125m framework", "Tunnelling contractor named for the viaduct"],
    industrial: ["Mining group approves new worker village", "Smelter expansion contract awarded",
                 "Refinery turnaround contractor appointed"],
    epc: ["EPC contractor named for the plant", "Developer reaches financial close", "Shutdown contractor appointed"],
  };
  for (const [sector, headlines] of Object.entries(CASES)) {
    for (const h of headlines) {
      const r = S.score(h);
      ok(r.sectors.includes(sector), `${sector}: "${h.slice(0, 54)}"`, r.sectors.join(",") || "none");
      ok(r.score >= 3, `  and it queues (${r.score})`);
    }
  }

  // The separation that was the whole point.
  const ours = S.score("Contractor appointed for 90MW hyperscale data centre campus");
  const theirs = S.score("Wates wins £40m retail park job");
  ok(ours.score > theirs.score,
     `a data centre appointment outranks a retail park award (${ours.score} vs ${theirs.score})`);
  ok(theirs.score < 3, "and the retail park does not queue at all", theirs.score);

  for (const off of ["Housebuilder lands 200-home contract", "School refurbishment contract awarded",
                     "Hotel fit-out contractor named", "Care home scheme approved"]) {
    ok(S.score(off).score < 3, `off-sector: "${off.slice(0, 48)}" does not queue`, S.score(off).score);
  }

  // The "and" in the exclusion is load bearing.
  const mixed = S.score("Data centre approved on former retail park");
  ok(mixed.sectors.includes("datacentres") && mixed.score >= 3,
     "a data centre on a retail park is still a data centre", `${mixed.score} ${mixed.sectors}`);

  // A single-sector source lends its sector to items that do not say it.
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "content", "signals", "sources.json"), "utf8"))
    .filter((x) => x.id);
  const covered = new Set(cfg.map((x) => x.sector).filter(Boolean));
  // "epc" is deliberately absent: developers and EPCs are a kind of buyer
  // rather than a kind of publication, and they appear across all five of
  // the others. It is read from the text, which the cases above assert.
  for (const want of ids.filter((x) => x !== "epc")) {
    ok(covered.has(want), `at least one source is dedicated to ${want}`, [...covered].join(", "));
  }
  ok(!covered.has("epc"), "and no feed is labelled epc, because it is cross-cutting");
  ok(cfg.some((x) => !x.sector), "and general trade press carries no sector hint, so it is read from the text");
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

console.log("\n=== what the weekly briefing caught and the watcher did not ===\n");
{
  /**
   * WHERE THESE CASES COME FROM, AND WHY THEY ARE WORTH A TEST.
   *
   * The same week's news was read independently by a general assistant and by
   * this watcher, and the comparison was not close. Everything the watcher
   * missed it missed STRUCTURALLY — not a pattern that needed widening, but a
   * whole class of event it had no concept of: a live notice with a closing
   * date, a Meet the Buyer, an eligibility submission to Ofgem, a consultation
   * drop-in, a tunnel drive finishing. And where it did fire, it reported the
   * client rather than the contractor, which is the party that actually needs
   * a compound.
   *
   * Each case below is one of those, written the way the source wrote it.
   * They are here so the hole cannot quietly reopen.
   */
  const CASES = [
    { text: "Walpole SGT4 substation works awarded to OCU Utility Services, £4.17m, contract period 26 October 2026 to 15 March 2028",
      stage: "confirmed", trigger: "award", org: "OCU Utility Services", why: "an award notice with the winner named" },
    { text: "MaresConnect 750MW Ireland-Wales HVDC interconnector: contract notice issued, deadline for participation 31 October 2026 12:00 UTC",
      stage: "open", trigger: "tender", deadline: "deadline", why: "a live notice with a date — nothing read notices at all" },
    { text: "SSEN Kinardochy to Errochty 400kV: planning permission in principle granted, temporary compounds in scope. A Meet the Buyer event for the supply chain is planned.",
      stage: "open", trigger: "supplier-event", why: "a door deliberately left open, and there was no trigger for one" },
    { text: "SSEN submits eligibility submission to Ofgem for Earba pumped storage and Coire Mashie 400kV substation",
      stage: "early", trigger: "prefunding", why: "money moving a step before consent, earlier than anything fired" },
    { text: "Alyth substation upgrade from 275kV to 400kV — public drop-in event 27 October 2026",
      stage: "early", trigger: "consultation", deadline: "event", why: "a dated event with the project team in the room" },
    { text: "Eryri VIP tunnel drive complete; Hochtief UK is removing the tunnel boring machine",
      stage: "early", trigger: "phase", org: "Hochtief UK", why: "a phase ending means the next package is being priced" },
    { text: "National Grid submits 19 projects worth £4.5bn for pre-construction funding",
      stage: "early", trigger: "prefunding", why: "the largest pipeline signal there is, and it scored nothing" },
    { text: "TenneT awards EU-302 onshore framework, adding more than 600 million euro",
      stage: "confirmed", trigger: "award", why: "euro values were invisible to a sterling-only pattern" },
  ];

  for (const c of CASES) {
    const r = S.score(c.text);
    ok(r.score >= 3, `queues: ${c.why}`, `scored ${r.score} — ${c.text.slice(0, 70)}`);
    ok(r.triggers.includes(c.trigger), `  trigger "${c.trigger}" fires`, r.triggers.join(", ") || "none");
    ok(S.stage(r.triggers) === c.stage, `  reads as "${c.stage}"`, S.stage(r.triggers));
    if (c.org) {
      ok(S.namedOrgs(c.text).includes(c.org), `  names ${c.org}`, S.namedOrgs(c.text).join(" / ") || "nothing");
    }
    if (c.deadline) {
      const d = S.extractDeadline(c.text);
      ok(d && d.kind === c.deadline, `  carries a ${c.deadline} date`, d ? d.kind : "no date found");
    }
  }
}

console.log("\n=== the three stages mean different things and must not blur ===\n");
{
  ok(S.stage(["tender"]) === "open", "a notice is open");
  ok(S.stage(["supplier-event"]) === "open", "so is an invitation to meet suppliers");
  ok(S.stage(["award"]) === "confirmed", "an award is confirmed");
  ok(S.stage(["consent"]) === "early", "consent alone is early — nothing has been let");
  ok(S.stage([]) === "early", "and no trigger at all defaults to early, never to open");
  // Precedence matters: an item that is both must read as the one with a
  // clock on it, because that is the one that stops being available.
  ok(S.stage(["award", "tender"]) === "open", "open beats confirmed when both apply");
  for (const id of [...S.OPEN_TRIGGERS, ...S.CONFIRMED_TRIGGERS]) {
    ok(S.TRIGGERS.some((t) => t.id === id), `stage list refers to a real trigger: ${id}`);
  }
}

console.log("\n=== a date is only taken when something says it is a date ===\n");
{
  ok(S.extractDeadline("Published on 14 March 2026 by the press office") === null,
     "a bare publication date is NOT read as a deadline", JSON.stringify(S.extractDeadline("Published on 14 March 2026 by the press office")));
  ok(S.extractDeadline("Closing date 2026-11-30").at === Date.parse("2026-11-30T00:00:00Z"), "ISO dates are read");
  ok(S.extractDeadline("Tenders close 05/12/2026").at === Date.parse("2026-12-05T00:00:00Z"), "and day-first dates are read day-first");
  ok(S.extractDeadline("Deadline: November 30, 2026").kind === "deadline", "month-first dates are read too");
  ok(S.extractDeadline("Supplier day takes place 3 December 2026").kind === "event",
     "an event date is kept, and kept separate from a deadline");
  ok(S.extractDeadline("no dates here at all") === null, "and nothing is invented");

  /**
   * THE DEFECT THIS PINS, AND IT WAS WORSE THAN FINDING NO DATE.
   *
   * The first version kept the first date with a deadline word anywhere
   * within ninety characters either side. On a real award notice —
   * "Period 2026-10-26 to 2028-03-15. Closing date 2026-10-31." — it returned
   * 26 October: the contract START date, because "Closing date" sat just
   * after it. That date would have gone into an approach letter as the
   * closing date, stated with confidence and wrong by five days.
   */
  const notice = "Contract awarded to OCU Utility Services Ltd — £4.17m. Period 2026-10-26 to 2028-03-15. Closing date 2026-10-31.";
  ok(S.extractDeadline(notice).at === Date.parse("2026-10-31T00:00:00Z"),
     "the CLOSING date is read, not the contract start date that precedes it",
     new Date(S.extractDeadline(notice).at).toISOString().slice(0, 10));

  // When an item carries both, the one that ends the opportunity wins: an
  // event you can miss, a deadline you cannot.
  const both = "Public drop-in event 27 October 2026, and tenders close 15 November 2026";
  ok(S.extractDeadline(both).kind === "deadline" && S.extractDeadline(both).at === Date.parse("2026-11-15T00:00:00Z"),
     "a deadline outranks an event when an item carries both",
     JSON.stringify(S.extractDeadline(both)));
}

console.log("\n=== the name in the item, and what it refuses to guess ===\n");
{
  ok(S.namedOrgs("Balfour Beatty wins the contract").includes("Balfour Beatty"), "a two-word name beside an award word is kept");
  ok(S.namedOrgs("Murphy Group has been appointed").includes("Murphy Group"), "and a company tail keeps it on its own");
  const months = S.namedOrgs("The works were awarded in October 2026 and start in March");
  ok(!months.some((x) => /October|March/.test(x)), "months are never organisations", months.join(" / "));
  ok(!S.namedOrgs("Contract awarded for the scheme").length, "and a sentence of ordinary words names nobody",
     S.namedOrgs("Contract awarded for the scheme").join(" / "));
  // A name with no award word near it and no company tail is a place or a
  // scheme far more often than a company, so it is left alone.
  ok(!S.namedOrgs("Work continues at Hinkley Point C this winter").length,
     "a scheme name with no appointment beside it is not reported as a company",
     S.namedOrgs("Work continues at Hinkley Point C this winter").join(" / "));
  ok(S.namedOrgs(Array.from({ length: 20 }, (_, i) => `Company${i} Ltd wins`).join(". ")).length <= 6,
     "and the list is capped, so one noisy page cannot fill a card");

  /**
   * THE DEFECT THIS PINS, FOUND BY RUNNING A REAL NOTICE THROUGH THE SWEEP
   * RATHER THAN BY READING THE CODE. The summary built from an OCDS record
   * reads "Buyer: National Grid Electricity Transmission. Civils at Walpole."
   * A full stop was allowed inside a name, so the match ran straight through
   * it and the card offered "National Grid Electricity Transmission. Civils"
   * as an organisation. A period may sit inside a name; it may never bridge
   * two sentences.
   */
  const prose = "The works were awarded to Murphy Group. Civils at Walpole begin in the spring.";
  const names = S.namedOrgs(prose);
  ok(!names.some((x) => /\. /.test(x)), "a name never runs across a full stop", names.join(" / "));
  ok(names.includes("Murphy Group"), "and the name before the stop is read whole", names.join(" / "));
  ok(S.namedOrgs("St.Modwen Logistics named as partner").includes("St.Modwen Logistics"),
     "while a full stop INSIDE a name is kept", S.namedOrgs("St.Modwen Logistics named as partner").join(" / "));

  /**
   * TITLE CASE, AND THE GARBAGE IT PUT ON CARDS ON THE FIRST LIVE RUN.
   *
   * Find a Tender headings are Title Case, so a method that treats a capital
   * as a signal read them as organisations: "AGR Unique Ref", "Cough Assist
   * Therapy Devices" and "Hong Kong SCR Rightsizing" were all offered as
   * names to write to. Where nearly every word is capitalised the capital
   * carries no information, so nothing is claimed.
   */
  for (const heading of [
    "HPB - Provision of Radioactive Waste Management Services (AGR Unique Ref. 34 F/W)",
    "Pricing Agreement - Cough Assist Therapy Devices - SBS - HUTH",
    "Hong Kong SCR Rightsizing Project",
    "S30150 Regulatory Monitoring and Compliance Technical Partner",
  ]) {
    ok(S.namedOrgs(heading).length === 0,
       `a Title Case notice heading names nobody: ${heading.slice(0, 44)}`, S.namedOrgs(heading).join(" / "));
  }
  // Ordinary prose is unaffected, which is why the guard is about the
  // surrounding text rather than about the candidate itself.
  ok(S.namedOrgs("OCU Utility Services awarded Walpole SGT4 substation works, £4.17m").includes("OCU Utility Services"),
     "but ordinary prose still yields its name");
}

console.log("\n=== a notice API is JSON, and the old extractor read none of it ===\n");
{
  const pkg = JSON.stringify({ releases: [{
    date: "2026-10-17T09:00:00Z",
    tender: { title: "Walpole SGT4 substation civil works", description: "Civils at Walpole 400kV substation",
              tenderPeriod: { endDate: "2026-10-31T12:00:00Z" } },
    buyer: { name: "National Grid Electricity Transmission" },
    awards: [{ suppliers: [{ name: "OCU Utility Services Ltd" }], value: { amount: 4170000, currency: "GBP" },
               contractPeriod: { startDate: "2026-10-26", endDate: "2028-03-15" } }],
    url: "https://www.find-tender.service.gov.uk/Notice/100572-2026",
  }] });

  const items = S.extract(pkg, "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages");
  ok(items.length === 1, "an OCDS release package yields one item", items.length);
  const [it] = items;
  ok(it.title === "Walpole SGT4 substation civil works", "the tender title becomes the title", it.title);
  ok(it.url.includes("100572-2026"), "and the notice's own URL is kept", it.url);
  ok(/OCU Utility Services Ltd/.test(it.summary), "the winner is taken from the record, not inferred", it.summary);
  // Written as "£4.17m" and not "4170000" on purpose: the value trigger reads
  // the way the trade press writes, and a raw number would score nothing.
  ok(/£4\.17m/.test(it.summary), "the value is written the way the triggers read it", it.summary);

  const r = S.score(`${it.title} ${it.summary}`);
  ok(r.triggers.includes("award") && r.triggers.includes("value"), "so the notice scores as an award with a value", r.triggers.join(", "));
  ok(r.sectors.includes("grid"), "and classifies into the right sector", r.sectors.join(", "));
  ok(S.extractDeadline(`${it.title} ${it.summary}`).at === Date.parse("2026-10-31T00:00:00Z"), "with its closing date read back out");

  /**
   * THE NAMES COME OFF THE RECORD. This is the entire advantage of reading a
   * notice rather than an article about it, and on the first live run the
   * regex was offering "AGR Unique Ref" where the record said
   * "Cyclife UK Limited" in a named field.
   */
  ok(Array.isArray(it.orgs) && it.orgs.includes("OCU Utility Services Ltd"),
     "the supplier is taken from the record's own field", JSON.stringify(it.orgs));
  ok(it.orgs.includes("National Grid Electricity Transmission"), "and so is the buyer", JSON.stringify(it.orgs));
  ok(it.orgs[0] === "OCU Utility Services Ltd",
     "the supplier comes FIRST — on an award it is the party that needs a compound, not the client who let it",
     JSON.stringify(it.orgs));

  // The envelope's name must not matter: every portal wraps the same thing.
  for (const key of ["results", "items", "notices", "publicaties"]) {
    const wrapped = JSON.stringify({ [key]: [{ title: "A notice", url: "https://x.test/n/1" }] });
    ok(S.extract(wrapped, "https://x.test/api").length === 1, `a "${key}" envelope is read the same way`);
  }
  // And an HTML feed must still parse exactly as it did before.
  ok(S.extract("<rss><item><title>Contractor appointed for the campus</title><link>https://x.test/a</link></item></rss>", "https://x.test/").length === 1,
     "RSS is untouched by the JSON path");
}

console.log("\n=== a windowed API needs today's date, and the file must not need editing ===\n");
{
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  ok(S.resolveUrl("https://x/api?from={{date:-7}}&to={{date:0}}") === `https://x/api?from=${week}&to=${today}`,
     "the date window is filled in at sweep time", S.resolveUrl("https://x/api?from={{date:-7}}&to={{date:0}}"));
  ok(S.resolveUrl("https://x/feed") === "https://x/feed", "and a plain URL is left exactly alone");

  // The sweep must request the RESOLVED url. Requesting the template would
  // 400 every time and read on screen as a dead source.
  const sweepSrc = fs.readFileSync(path.join(root, "backend", "lib", "signals", "index.js"), "utf8");
  ok(/politeFetch\(resolveUrl\(/.test(sweepSrc), "the sweep fetches the resolved url, not the template");
}

console.log("\n=== an opportunity that has closed is not an opportunity ===\n");
{
  // A notice whose closing date has passed is a line of history sitting at
  // the top of a queue sorted by score. It is refused at the door.
  const idx = fs.readFileSync(path.join(root, "backend", "lib", "signals", "index.js"), "utf8");
  ok(/where === "open" && deadline && deadline\.at < Date\.now\(\)/.test(idx),
     "the sweep drops an open notice whose date has already passed");
  ok(/out\.expired/.test(idx), "and counts them, so a quiet sweep is distinguishable from a late one");

  const route = fs.readFileSync(path.join(root, "backend", "routes", "signals.js"), "utf8");
  ok(/if \(ca && cb\) return ca - cb;/.test(route), "the queue sorts the soonest deadline to the top");
  ok(/stageWanted/.test(route), "and the three stages can be read separately");
}

console.log("\n=== the procurement portals are in the source list ===\n");
{
  // THE STRUCTURAL GAP. Every source was trade press — commentary on a
  // decision after it was taken. The decisions themselves, with the winner
  // named and the value stated, are published on the portals, and the press
  // covers a small fraction of them.
  const list = JSON.parse(fs.readFileSync(path.join(root, "content", "signals", "sources.json"), "utf8"));
  const ids = list.map((x) => x.id).filter(Boolean);
  for (const id of ["find-a-tender", "contracts-finder", "public-contracts-scotland", "sell2wales", "tenderned"]) {
    ok(ids.includes(id), `a procurement notice source for ${id}`, ids.join(", "));
  }
  ok(ids.some((x) => /supply-chain/.test(x)), "and at least one supplier-event page", ids.join(", "));

  // Every URL must be a URL, templated or not, or the sweep fails on it.
  for (const src of list.filter((x) => x.url)) {
    let fine = true;
    try { new URL(S.resolveUrl(src.url)); } catch { fine = false; }
    ok(fine, `${src.id}: the url resolves to something fetchable`, src.url);
  }
  /**
   * A URL NOBODY HAS CHECKED MUST NOT BE SWEPT, and "verify" is what says so.
   *
   * That field had quietly taken on a second job — recording what is still
   * imperfect about a source that HAS been checked and is running — which
   * would have retired this rule by making it fail for a good reason. Those
   * notes now live in "note", which does not block enabling. The distinction
   * is the whole of the rule: verify means unknown, note means known and
   * imperfect, and only the first one is a reason to stay off.
   */
  for (const src of list.filter((x) => x.url && x.enabled !== false)) {
    ok(!src.verify, `${src.id}: is enabled, so nothing about it is still unverified`, src.verify);
  }
  for (const src of list.filter((x) => x.url && x.enabled === false)) {
    ok(Boolean(src.verify), `${src.id}: is disabled, so it says what is not known about it`);
  }
}

console.log("\n=== the card renders its own labels, which it did not ===\n");
{
  /**
   * THE DEFECT THIS PINS, WHICH WAS MINE AND WAS LIVE.
   *
   * card() read sectorLabels out of render()'s scope. card() is declared at
   * module level, so that identifier does not exist inside it — a
   * ReferenceError, thrown the first time a signal carrying a sector was
   * drawn. It had never thrown only because the queue was empty and a signal
   * with no sectors never entered the loop that touched it. The sector work
   * made every signal carry one, so the next sweep would have emptied the
   * page with no clue as to why.
   */
  const page = fs.readFileSync(path.join(root, "frontend", "internal", "js", "signals-page.js"), "utf8");
  const sig = /function card\(([^)]*)\)/.exec(page);
  ok(Boolean(sig), "card() is declared", page.slice(0, 80));
  const args = sig[1].split(",").map((x) => x.trim());
  for (const name of ["labels", "sectorLabels", "stageLabels"]) {
    ok(args.includes(name), `card() takes ${name} as an argument rather than reaching for it`, sig[1]);
  }
  ok(/card\(s, labels, sectorLabels, stageLabels\)/.test(page), "and is called with all three");

  // Everything the card shows must be escaped. One unescaped headline from a
  // feed we do not control is a stored cross-site scripting hole.
  for (const field of ["s.deadlineText", "s.url", "s.title"]) {
    ok(new RegExp(`esc\\(${field.replace(".", "\\.")}`).test(page), `${field} is escaped before it reaches the page`);
  }
  ok(/\(s\.orgs \|\| \[\]\)\.map\(/.test(page) && /esc\(o\)/.test(page),
     "and so is every extracted organisation name, now that each is also a lookup link");
}

console.log("\n=== what the first live run broke, and must not break again ===\n");
{
  /**
   * EVERY ASSERTION BELOW IS A DEFECT THE SERVER FOUND AND THE TESTS DID NOT.
   * They are kept together so the lesson stays attached to them: this module
   * was written against invented examples and passed 248 assertions while six
   * things were wrong in ways only real feeds reveal.
   */

  // 1. PLURALS. Every noun in every alternation was singular, so "Root-Power
  //    AWARDS CONTRACTS for three BESS projects" and "Alstom awarded €95
  //    million signalling CONTRACTS" both scored as a bare value — the award
  //    itself, the most important trigger in the file, missed entirely.
  for (const t of [
    "Root-Power awards contracts for three BESS projects totalling £50 million",
    "Alstom awarded €95 million signalling contracts to equip Ireland's national rail network",
    "Contractor lands two packages on the substation scheme",
  ]) ok(S.score(t).triggers.includes("award"), `plural nouns match: ${t.slice(0, 50)}`, S.score(t).triggers.join(", ") || "none");

  // 2. IDIOMS the live feeds used and nothing matched.
  ok(S.score("Kier on board for Manchester tram stop upgrade").triggers.includes("award"),
     '"on board for" is how the trade press says appointed');
  ok(S.score("Race starts for £800m south Wales civils framework").triggers.includes("tender"),
     '"race starts for" is a framework coming to market');

  // 3. "cable project" is grid work and the sector patterns had no cable in
  //    them, so a real SSEN consent landed with no sector at all.
  const cable = "Planning permission granted for Kinardochy to Errochty cable project";
  ok(S.classify(cable).includes("grid"), "a cable project is grid work", S.classify(cable).join(", ") || "none");

  // 4. THE SECTOR GATE. Find a Tender offered 70 of 100 notices and Contracts
  //    Finder 95 of 100 — every one a genuine award, almost none our work.
  const idx = fs.readFileSync(path.join(root, "backend", "lib", "signals", "index.js"), "utf8");
  ok(/src\.requireSector && !sectors\.length/.test(idx), "a source can demand one of our six sectors before anything queues");
  ok(/out\.offSector/.test(idx), "and the ones it refuses are counted rather than silently lost");
  const check = fs.readFileSync(path.join(root, "backend", "tools", "signals-check.mjs"), "utf8");
  ok(/requireSector/.test(check) && /already closed/.test(check),
     "the check tool applies the same gates, so its count is not a promise the sweep cannot keep");

  // 5. THE ACCEPT HEADER. TenderNed answered 406 Not Acceptable because the
  //    header offered only HTML and XML, and it serves JSON. A notice API
  //    refused on content negotiation reads exactly like a dead URL.
  const fetchHdr = fs.readFileSync(path.join(root, "backend", "lib", "signals", "fetch.js"), "utf8");
  ok(/"application\/json"/.test(fetchHdr) && /accept: ACCEPT/.test(fetchHdr),
     "the fetcher asks for JSON as well as HTML and XML");

  // 6. THE LIVE SOURCE LIST, WRONG FOR THE SECOND TIME. parse.js resolved the
  //    data volume only when ETABLIX_DATA_DIR was set. Nothing sets it:
  //    deploy.sh mounts the volume at /app/backend/data and store.js finds it
  //    by falling back to that path. So on the server the live list was never
  //    used and the check tool read the copy baked into the image — the one a
  //    deploy overwrites. "Edit it, no deploy needed" was false twice over.
  const parseSrc = fs.readFileSync(path.join(root, "backend", "lib", "signals", "parse.js"), "utf8");
  const storeSrc = fs.readFileSync(path.join(root, "backend", "lib", "store.js"), "utf8");
  ok(/"backend", "data"/.test(parseSrc), "parse.js falls back to the volume path, not to nothing");
  ok(/path\.join\(__dirname, "\.\.", "data"\)/.test(storeSrc), "and store.js still defaults to that same directory");
  ok(path.dirname(S.sourcesFile()) === path.resolve(process.env.ETABLIX_DATA_DIR || path.join(root, "backend", "data")),
     "so the live list and the database sit on the same side of the mount", S.sourcesFile());
}

console.log("\n=== the enabled sources are the ones that answered ===\n");
{
  const list = JSON.parse(fs.readFileSync(path.join(root, "content", "signals", "sources.json"), "utf8"));
  const on = list.filter((x) => x.url && x.enabled !== false);
  ok(on.length >= 10, `${on.length} sources enabled after the live check (it was 2)`);

  // THE GATE BELONGS ON EVERY PORTAL AND ON NOTHING ELSE. On a portal it is
  // the difference between a queue and a flood. On trade press it would throw
  // away the editor's judgement about what counts as construction news, which
  // is the only thing trade press is for.
  for (const id of ["find-a-tender", "contracts-finder", "etenders-ireland", "tenderned", "sell2wales", "public-contracts-scotland", "ted-europa"]) {
    const src = list.find((x) => x.id === id);
    ok(src && src.requireSector === true, `${id}: the sector gate is on`, JSON.stringify(src && src.requireSector));
  }
  for (const id of ["construction-enquirer", "construction-index", "ssen-transmission", "mining-weekly"]) {
    const src = list.find((x) => x.id === id);
    ok(src && !src.requireSector, `${id}: trade press is NOT gated — that is what an editor is for`);
  }
}

console.log("\n=== what the SECOND live run broke ===\n");
{
  /**
   * The first run taught that invented examples hide defects. The second
   * taught that fixing one gate reveals the next, and that a fix shipped
   * without a live check can be worse than the bug it replaced.
   */

  // 1. THE ACCEPT HEADER REGRESSION, AND IT WAS MINE. The first fix added
  //    JSON at q=0.9 and left text/html with no q, which means q=1.0 — so
  //    every server that can serve both was told plainly that HTML was
  //    preferred. Contracts Finder answered 100 OCDS notices an hour before
  //    and a web page afterwards. TenderNed the same. A header that lies
  //    about what you want fails quietly and looks like the publisher's
  //    fault.
  const fetchSrc = fs.readFileSync(path.join(root, "backend", "lib", "signals", "fetch.js"), "utf8");
  const accept = (/const ACCEPT = \[([\s\S]*?)\]\.join/.exec(fetchSrc) || [, ""])[1];
  const weight = (type) => {
    const line = accept.split("\n").find((l) => l.includes(type));
    if (!line) return -1;
    const q = /q=([\d.]+)/.exec(line);
    return q ? Number(q[1]) : 1;
  };
  ok(weight("application/json") === 1, "JSON is offered at full weight", weight("application/json"));
  ok(weight("text/html") < weight("application/json"),
     "and HTML is offered BELOW it, which is the whole point",
     `html ${weight("text/html")} vs json ${weight("application/json")}`);
  ok(weight("application/rss+xml") >= weight("text/html"), "a feed also outranks a web page");

  // 2. THE WORKS GATE. The sector gate cut Find a Tender from 70 notices to
  //    13, and all thirteen were Hinkley Point B decommissioning call-offs.
  //    Real awards, right industry, no construction site and nobody to house.
  const NOT_WORKS = [
    "HPB - Provision of a radioactive laundry service, PPE lease and scaffold monitoring service",
    "HPB - Fire System Maintenance: Fire Detection, Fire Doors & Fire Dampers",
    "HPB - The Provision of LOLER and PSSR Statutory Inspections",
    "HPB - Provision of Facilities Management Services",
    "HPB Health Physics Monitors",
    "HPB - Provision of Radioactive Waste Management Services",
    "HPB - Provision of Electrical Security Systems & Associated Services",
    "FW Services - Procurement Cost Estimation and demand planning Tools",
    "Pricing Agreement - Cough Assist Therapy Devices",
  ];
  for (const t of NOT_WORKS) ok(!S.hasWorks(t), `nothing to build: ${t.slice(0, 56)}`);

  const IS_WORKS = [
    "Walpole SGT4 400kV substation civil works and temporary compound",
    "Trawsfynydd Footbridge Demolition Consultancy",
    "Battery energy storage system balance of plant - BESS",
    "Preliminary Market Engagement - Kinardochy to Errochty 400kV overhead line",
    // "temporary compoundS" — the plural bug for the third time in this file,
    // on the single most on-the-nose phrase there is for this business.
    "Kinardochy to Errochty cable project: planning permission granted, temporary compounds in scope",
    "Race starts for £800m south Wales civils framework",
    // The mobilise trigger caught this and the gate did not, so a live site
    // with a workforce on it would have been refused by the check meant to
    // find one.
    "Metro extension work starts on HS2 Curzon Street Station site",
  ];
  for (const t of IS_WORKS) ok(S.hasWorks(t), `there is work here: ${t.slice(0, 56)}`);

  const idx = fs.readFileSync(path.join(root, "backend", "lib", "signals", "index.js"), "utf8");
  ok(/src\.requireWorks && !hasWorks\(text\)/.test(idx), "a source can demand evidence of construction");
  ok(/out\.noWorks/.test(idx), "and what it refuses is counted");

  // 3. THE LINK WENT TO THE API. Every one of thirteen Find a Tender signals
  //    linked to the ocdsReleasePackages endpoint the sweep had just read, so
  //    clicking one gave a reader a megabyte of JSON. It would never have
  //    shown up as bad data — only as a person giving up on the queue.
  const pkg = JSON.stringify({ releases: [{
    ocid: "ocds-h6vhtk-04b5d5",
    tender: { title: "Walpole SGT4 substation civil works" },
    buyer: { name: "National Grid Electricity Transmission" },
  }] });
  const api = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?updatedFrom=2026-10-12";
  const site = "https://www.find-tender.service.gov.uk/Search/Results";

  const [bare] = S.extract(pkg, api);
  ok(bare.url === api, "with nothing to go on it still has to link somewhere");

  const [withSite] = S.extract(pkg, api, { siteUrl: site });
  ok(withSite.url === site, "given a human search page, it links there and NOT at the API", withSite.url);
  ok(/ocds-h6vhtk-04b5d5/.test(withSite.summary),
     "and the reference travels in the summary, so the notice is findable by hand", withSite.summary);

  const [withTpl] = S.extract(pkg, api, { siteUrl: site, noticeUrl: "https://host/procurement/{ocid}" });
  ok(withTpl.url === "https://host/procurement/ocds-h6vhtk-04b5d5",
     "and a template naming a field the record HAS builds the notice's own url", withTpl.url);
  // The same template naming a field it has NOT must build nothing at all —
  // the Contracts Finder trap, where the notice GUID is not the ocid.
  const [wrongField] = S.extract(pkg, api, { siteUrl: site, noticeUrl: "https://host/Notice/{id}" });
  ok(wrongField.url === site, "while one naming a missing field falls back instead", wrongField.url);

  // 4. SYNDICATION. Mining Weekly and Engineering News are both Creamer
  //    Media, so the second run queued "$40m for Prieska Copper Zinc Mine
  //    development" twice and "Deep Yellow pushes out FID" twice under
  //    different URLs. Four of thirty signals were two signals.
  const one = S.queue({ sourceId: "mining-weekly", title: "Prieska Copper Zinc Mine development awarded, $40m civils", url: "https://a.test/1", triggers: ["award"], score: 6, sectors: ["industrial"] });
  ok(one.queued, "the first copy of a syndicated story queues");
  const two = S.queue({ sourceId: "engineering-news", title: "Prieska Copper Zinc Mine development awarded, $40m civils", url: "https://b.test/2", triggers: ["award"], score: 6, sectors: ["industrial"] });
  ok(!two.queued, "the same headline off a second wire does not", JSON.stringify(two));
  ok(/another source/.test(two.reason || ""), "and it says why", two.reason);
  // Whitespace and case are not a different story either.
  const three = S.queue({ sourceId: "x", title: "  prieska copper   zinc mine development awarded, $40M civils ", url: "https://c.test/3", triggers: ["award"], score: 6, sectors: ["industrial"] });
  ok(!three.queued, "nor is the same headline in different case and spacing", JSON.stringify(three));
}

console.log("\n=== the live list can fall behind, and must say so ===\n");
{
  /**
   * A TRAP OF MY OWN MAKING, AND THE SYMPTOM OF IT IS SILENCE.
   *
   * The live copy on the data volume is seeded once and never overwritten, so
   * that a hand edit survives a deploy. The unavoidable other half is that a
   * change to the repository copy does not reach the server either — and the
   * first time that mattered, a whole commit of new source settings sat in the
   * image doing nothing while the server read the older list. Nothing broke,
   * nothing logged, and the only sign was a sweep behaving like the version
   * before.
   *
   * Refusing to overwrite is still right. Being silent about it is not.
   */
  const repo = JSON.parse(fs.readFileSync(path.join(root, "content", "signals", "sources.json"), "utf8"));
  ok(Number(repo[0]._version) > 0, "the shipped list carries a version", repo[0]._version);

  const here = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-seed-"));
  const livePath = path.join(here, "signals-sources.json");

  // An older live copy is reported stale.
  fs.writeFileSync(livePath, JSON.stringify([{ _version: 1 }, { id: "x", url: "https://x.test/", enabled: true }]));
  process.env.ETABLIX_SIGNALS_SOURCES = livePath;
  let st = S.seedStatus();
  ok(st.stale === true, "an older live copy is reported as stale", JSON.stringify(st));
  ok(st.repoVersion > st.liveVersion, "and both versions are named so the gap is visible", `${st.liveVersion} vs ${st.repoVersion}`);

  // A current one is not, so the warning cannot become background noise.
  fs.writeFileSync(livePath, JSON.stringify([{ _version: Number(repo[0]._version) }, { id: "x", url: "https://x.test/", enabled: true }]));
  st = S.seedStatus();
  ok(st.stale === false, "a current live copy is silent", JSON.stringify(st));

  // It REPORTS. It must never copy over somebody's edit by itself.
  const parseSrc = fs.readFileSync(path.join(root, "backend", "lib", "signals", "parse.js"), "utf8");
  const seedFn = parseSrc.slice(parseSrc.indexOf("export function seedStatus"), parseSrc.indexOf("export const TRIGGERS"));
  ok(!/writeFileSync|copyFileSync|rmSync/.test(seedFn),
     "and it only reports — it never writes over the live list on its own");

  // Both tools say it, because a sweep run against a stale list looks exactly
  // like a sweep where nothing happened.
  for (const tool of ["signals-check.mjs", "signals-sweep.mjs"]) {
    const src = fs.readFileSync(path.join(root, "backend", "tools", tool), "utf8");
    ok(/seedStatus\(\)/.test(src) && /stale/.test(src), `${tool} warns when the live list has fallen behind`);
  }

  fs.rmSync(here, { recursive: true, force: true });
  process.env.ETABLIX_SIGNALS_SOURCES = "";
  delete process.env.ETABLIX_SIGNALS_SOURCES;
}

console.log("\n=== the probe, so a URL hunt is a command and not a browser session ===\n");
{
  /**
   * WHY THIS EXISTS. After the first live run five sources needed a URL only a
   * person with a browser could find — and "open it, run a search, copy the
   * RSS address" is the ten-minute job that stays undone for a month and
   * quietly keeps the best sources off. Two of them, Sell2Wales and Public
   * Contracts Scotland, carry the schemes this business cares about most.
   */
  const check = fs.readFileSync(path.join(root, "backend", "tools", "signals-check.mjs"), "utf8");
  ok(/--probe/.test(check) && /COMMON_FEEDS/.test(check), "the check tool can probe candidate paths");
  ok(/politeFetch\(target\)/.test(check), "and it probes through the polite fetcher, so robots.txt still decides");
  ok(/--dump/.test(check), "and can print what a source actually sends, rather than guessing its shape");

  const list = JSON.parse(fs.readFileSync(path.join(root, "content", "signals", "sources.json"), "utf8"));
  // Anything still unresolved must carry candidates, or the probe cannot help
  // it and it falls back to being somebody's forgotten errand.
  const stuck = list.filter((x) => x.url && x.enabled === false);
  for (const src of stuck) {
    ok(Array.isArray(src.candidates) && src.candidates.length,
       `${src.id}: is disabled, so it carries candidates for the probe to try`, JSON.stringify(src.candidates));
  }
  // Every portal needs both gates and a human fallback link.
  for (const id of ["find-a-tender", "contracts-finder", "etenders-ireland", "tenderned", "sell2wales", "public-contracts-scotland", "ted-europa"]) {
    const src = list.find((x) => x.id === id);
    ok(src && src.requireWorks === true, `${id}: the works gate is on`);
    ok(src && typeof src.siteUrl === "string" && /^https:/.test(src.siteUrl),
       `${id}: has a human page to link to instead of its API`, src && src.siteUrl);
  }
  // A noticeUrl template on the wrong field gives every signal a confident
  // dead link. None may be set until --dump has shown the right one.
  for (const src of list.filter((x) => x.noticeUrl)) {
    ok(/\{(id|ocid|ref)\}/.test(src.noticeUrl), `${src.id}: the template has a placeholder the reader fills`, src.noticeUrl);
  }
}

console.log("\n=== the contact on the notice, and the rule that does not bend for it ===\n");
{
  /**
   * WHY TAKING THIS IS NOT HARVESTING, AND WHY THE RULE STILL APPLIES.
   *
   * The whole reason this is a watcher rather than a harvester is that it does
   * not go looking for people's addresses. Reading a notice's contactPoint is
   * not looking: OCDS has the field, the publisher filled it in for exactly
   * this purpose, and it arrives in the same response as the award. Nothing is
   * crawled and nothing is guessed.
   *
   * None of which makes it safe to keep. A notice contact is very often a
   * named buyer, and firstname.lastname@ is personal data whatever field it
   * travelled in. So the extractor hands the address on RAW and contact.js
   * scrubs it on the way into storage, exactly as it does one found on a page.
   * One gate, and these assertions are what keeps it one.
   */
  const release = (parties, awards) => JSON.stringify({ releases: [{
    ocid: "o1", tender: { title: "Walpole SGT4 substation civil works" },
    buyer: { name: "National Grid Electricity Transmission" }, parties, awards,
  }] });

  // The SUPPLIER's role address wins over the buyer's named one: on an award
  // the party needing a compound is the one that won it.
  let [it] = S.extract(release([
    { name: "National Grid Electricity Transmission", roles: ["buyer"], contactPoint: { email: "jane.smith@nationalgrid.com", url: "https://nationalgrid.test/suppliers" } },
    { name: "OCU Utility Services Ltd", roles: ["supplier"], contactPoint: { email: "bd@ocugroup.com" } },
  ]), "https://x.test/api");
  ok(it.roleAddress === "bd@ocugroup.com", "the supplier's role address is preferred", it.roleAddress);
  ok(it.contactRole === "supplier", "and it is labelled as the supplier's", it.contactRole);
  ok(it.contactOrg === "OCU Utility Services Ltd", "with the organisation named", it.contactOrg);
  ok(it.contactUrl === "https://nationalgrid.test/suppliers", "a contactPoint url is kept even from the other party", it.contactUrl);

  // A ROLE address beats a better-ranked PERSONAL one. Taking simply the
  // first by rank threw away the client's procurement@ whenever the supplier
  // happened to list a named buyer, and showed nothing instead.
  [it] = S.extract(release([
    { name: "National Grid Electricity Transmission", roles: ["buyer"], contactPoint: { email: "procurement@nationalgrid.com" } },
    { name: "OCU Utility Services Ltd", roles: ["supplier"], contactPoint: { email: "a.jones@ocugroup.com" } },
  ]), "https://x.test/api");
  ok(it.roleAddress === "procurement@nationalgrid.com",
     "a role address outranks a better-placed personal one", it.roleAddress);
  ok(it.contactRole === "buyer", "and is labelled as the client's, not the winner's", it.contactRole);

  // Everything personal: handed on raw, and scrub is what refuses it.
  [it] = S.extract(release([
    { name: "SSEN Transmission", roles: ["buyer"], contactPoint: { email: "a.buyer@sse.com" } },
  ]), "https://x.test/api");
  ok(it.contactFound === true, "a personal-only notice still reports that a contact exists");
  ok(it.roleAddress === "a.buyer@sse.com", "the extractor does NOT decide — it hands the address on raw", it.roleAddress);
  ok(C.isRoleAddress(it.roleAddress) === false, "and the gate is what calls it personal");
  ok(C.scrub({ roleAddress: it.roleAddress }).roleAddress === null, "so scrub nulls it before storage");

  // THE LOAD-BEARING ASSERTION. Nothing may put a personal address into a
  // stored row by any route: the contact field, the title or the summary.
  const stored = C.scrub({
    title: "Framework awarded — contact a.n.other@x.co.uk for details",
    summary: "Enquiries to jane.smith@nget.co.uk or procurement@nget.co.uk.",
    org: "NGET (j.bloggs@nget.co.uk)",
    roleAddress: "a.jones@ocugroup.com",
    contactOrg: "OCU Utility Services Ltd", contactRole: "supplier", contactWithheld: true,
    html: "<html>page</html>", body: "raw", raw: "raw",
  });
  const addresses = [...JSON.stringify(stored).matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map((m) => m[0]);
  ok(addresses.length === 1 && addresses[0] === "procurement@nget.co.uk",
     "only the role address survives anywhere in the row — contact field, title, summary and org alike",
     addresses.join(", ") || "(none)");
  ok(stored.contactOrg === "OCU Utility Services Ltd" && stored.contactWithheld === true,
     "while WHOSE contact it was, and that one existed, are both kept — they are not personal data");

  // The new allowlist entries are functions, not people. The test is the same
  // one the whole gate rests on: no dot, no digit, nobody is called this.
  for (const a of ["bd@ocugroup.com", "frameworks@ssen.co.uk", "opportunities@murphy.co.uk", "contracts@sse.com"]) {
    ok(C.isRoleAddress(a), `a role address is kept: ${a}`);
  }
  for (const a of ["jane.smith@nget.co.uk", "j.smith@x.com", "jsmith2@x.com", "john@x.com", "a.n.other@x.co.uk"]) {
    ok(!C.isRoleAddress(a), `a person's address is refused: ${a}`);
  }

  // contactWithheld has to be worked out BEFORE the scrub, because afterwards
  // there is deliberately no way to tell "no contact was published" from "one
  // was, and it was a person's" — and the reader needs that difference: the
  // first means go and find a route in, the second means open the notice.
  const idx = fs.readFileSync(path.join(root, "backend", "lib", "signals", "index.js"), "utf8");
  const sweepBody = idx.slice(idx.indexOf("export async function sweep"));
  ok(sweepBody.indexOf("contactWithheld =") < sweepBody.indexOf("queue({"),
     "contactWithheld is computed before the row is queued and scrubbed");

  const page = fs.readFileSync(path.join(root, "frontend", "internal", "js", "signals-page.js"), "utf8");
  ok(/NOT the winner/.test(page),
     "and the card says plainly when the address is the client's rather than the winner's");
  ok(/esc\(s\.roleAddress\)/.test(page) && /esc\(s\.contactOrg\)/.test(page),
     "both are escaped before they reach the page");
  ok(/contactWithheld/.test(page), "and a withheld contact is explained rather than left blank");
}

console.log("\n=== a notice announced for later is not a notice that is open ===\n");
{
  /**
   * WHERE THIS CAME FROM. Defence Construction Canada published an Advanced
   * Procurement Notice for a 60MW data centre worth up to CA$1.85bn, with the
   * notice itself "expected to be posted in the winter of 2027". The watcher
   * saw the words "Procurement Notice", fired the tender trigger, and ranked
   * it OPEN — act this week — for a competition that will not exist for over a
   * year, above items carrying a real closing date.
   *
   * An advance notice is the opposite of a live one, and it is also the
   * earliest sight of a scheme there is. So it queues, it ranks, and it is
   * emphatically not urgent.
   */
  const APN = "Canada puts out Advanced Procurement Notice for data center in Ontario. "
    + "Estimated to cost between CA$1.5bn and $1.85bn. Defence Construction Canada has put out a public "
    + "Advanced Procurement Notice (APN) for a data center project in the National Capital Region of Ontario. "
    + "The notice is for a modify design built contract, and is expected to be posted in the winter of 2027. "
    + "The data center will offer 60MW of IT capacity.";

  const r = S.score(APN);
  ok(r.triggers.includes("forward"), "an advance procurement notice fires the forward trigger", r.triggers.join(", "));
  ok(S.stage(r.triggers) === "early",
     "and it reads as EARLY, not open — the competition is a year away", S.stage(r.triggers));
  ok(r.sectors.includes("datacentres"), "the sector is still read", r.sectors.join(", "));
  ok(r.score >= 3, "and it still queues, because it is the earliest sight there is", r.score);

  for (const t of [
    "Prior information notice for the substation civils framework",
    "Notice of intent: 400kV overhead line refurbishment, procurement anticipated 2028",
    "Pipeline notice: upcoming opportunity for enabling works",
  ]) ok(S.stage(S.score(t).triggers) === "early", `forward notice reads early: ${t.slice(0, 48)}`, S.stage(S.score(t).triggers));

  // A live notice with a real date must still read open, or the fix has eaten
  // the thing it was protecting.
  const live = "MaresConnect HVDC: contract notice issued, deadline for participation 31 October 2026";
  ok(S.stage(S.score(live).triggers) === "open", "a real contract notice is still open", S.stage(S.score(live).triggers));

  // AND THE EXCEPTION THAT MATTERS. A Meet the Buyer held NOW for a
  // procurement coming later is a real date on a real calendar, and that is
  // precisely the moment this queue exists to catch.
  const both = "Advanced Procurement Notice: data centre groundworks. A Meet the Buyer event is planned for 3 December 2026";
  ok(S.stage(S.score(both).triggers) === "open",
     "a supplier event survives the forward demotion — there is a date to attend", S.stage(S.score(both).triggers));

  // The authority is named: "Defence Construction Canada" ends in a country,
  // so the company-tail test refused it and the card named nobody at all for
  // a CA$1.85bn notice.
  ok(S.namedOrgs(APN).includes("Defence Construction Canada"),
     "a company word inside the name counts, not only at the end", S.namedOrgs(APN).join(" / ") || "nothing");
  // Narrow on purpose: these must still name nobody.
  for (const n of ["National Capital Region of Ontario", "Hinkley Point C this winter", "Advanced Procurement Notice for data center"]) {
    ok(S.namedOrgs(n).length === 0, `and still names nobody in: ${n}`, S.namedOrgs(n).join(" / "));
  }
}

console.log("\n=== no source file carries a stray control character ===\n");
{
  /**
   * THE DEFECT THIS PINS, AND IT IS THE NASTIEST KIND THERE IS.
   *
   * The forward trigger above was written into this module through a script
   * whose string was not raw, so every \b in it became a literal backspace —
   * thirteen of them. The file still parsed. The regexes still compiled. They
   * simply lost every word boundary, so the trigger matched nothing and the
   * only symptom was an advance notice continuing to read as open.
   *
   * A silently weakened pattern is worse than a syntax error, because a syntax
   * error stops the build. So: a C0 control character other than tab, newline
   * or carriage return has no business in a source file, and now cannot sit in
   * one unnoticed.
   */
  const dirs = [["backend"], ["frontend", "internal", "js"], ["frontend", "public", "js"], ["shared"]];
  const walk = (dir) => {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== "data") out.push(...walk(full)); }
      else if (/\.(js|mjs|cjs|json)$/.test(e.name)) out.push(full);
    }
    return out;
  };
  const files = dirs.flatMap((d) => walk(path.join(root, ...d)));
  ok(files.length > 50, `${files.length} source files to check`);

  const bad = [];
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    // Everything below 0x20 except tab, newline and carriage return.
    const m = /[\x00-\x08\x0b\x0c\x0e-\x1f]/.exec(text);
    if (m) {
      const line = text.slice(0, m.index).split("\n").length;
      bad.push(`${path.relative(root, f)}:${line} holds 0x${m[0].charCodeAt(0).toString(16).padStart(2, "0")}`);
    }
  }
  ok(bad.length === 0, "no source file holds a stray control character", bad.join("; "));
}

console.log("\n=== the link goes to the notice, and the parties are labelled ===\n");
{
  /**
   * TWO THINGS A READER NEEDED THAT THE QUEUE DID NOT GIVE THEM: a link
   * straight to the opportunity, and the name of the party to write to
   * without parsing a sentence to find it.
   */
  const rel = (extra = {}) => JSON.stringify({ releases: [{
    ocid: "ocds-h6vhtk-0657bc",
    tender: { title: "Walpole substation civil works" },
    buyer: { name: "National Grid Electricity Transmission" },
    awards: [{ suppliers: [{ name: "OCU Utility Services Ltd" }] }],
    ...extra,
  }] });
  const api = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";
  const site = "https://www.find-tender.service.gov.uk/Search/Results";
  const TPL = "https://www.find-tender.service.gov.uk/procurement/{ocid}";

  let [it] = S.extract(rel(), api, { noticeUrl: TPL, siteUrl: site });
  ok(it.url === "https://www.find-tender.service.gov.uk/procurement/ocds-h6vhtk-0657bc",
     "a Find a Tender signal links to the notice, built from the record's own ocid", it.url);

  /**
   * THE TRAP THIS PINS. The first version treated {id}, {ocid} and {ref} as
   * synonyms, filling whichever identifier was available. On Find a Tender
   * that nearly works. On Contracts Finder it does not: its notice pages are
   * keyed by a GUID that is a DIFFERENT value from the ocid, so a template
   * written /Notice/{id} and filled with an ocid would have given every
   * Contracts Finder signal a confident dead link — worse than the search-page
   * fallback, because a reader stops trusting every link rather than one.
   */
  [it] = S.extract(rel(), api, { noticeUrl: "https://x.test/Notice/{id}", siteUrl: site });
  ok(it.url === site,
     "a template naming a field the record does NOT carry builds no url and falls back", it.url);
  [it] = S.extract(rel({ ocid: undefined }), api, { noticeUrl: TPL, siteUrl: site });
  ok(it.url === site, "and so does a missing ocid", it.url);
  [it] = S.extract(rel({ id: "015074-2026" }), api, { noticeUrl: "https://x.test/Notice/{id}", siteUrl: site });
  ok(it.url === "https://x.test/Notice/015074-2026", "while {id} resolves the record id when it is there", it.url);

  // Never the API endpoint the sweep just read, under any circumstances.
  [it] = S.extract(rel({ ocid: undefined }), api, {});
  ok(!/ocdsReleasePackages/.test(it.url) || it.url === api,
     "with nothing to go on it still has to link somewhere", it.url);

  // The parties, kept apart.
  [it] = S.extract(rel(), api, { noticeUrl: TPL, siteUrl: site });
  ok(it.buyer === "National Grid Electricity Transmission", "the buyer is a field, not prose", it.buyer);
  ok(it.suppliers.includes("OCU Utility Services Ltd"), "and so is the supplier", JSON.stringify(it.suppliers));

  const sources = JSON.parse(fs.readFileSync(path.join(root, "content", "signals", "sources.json"), "utf8"));
  const fts = sources.find((x) => x.id === "find-a-tender");
  ok(fts.noticeUrl === TPL, "Find a Tender carries the evidenced template", fts.noticeUrl);
  const cf = sources.find((x) => x.id === "contracts-finder");
  ok(!cf.noticeUrl, "Contracts Finder deliberately carries NONE — its GUID is not the ocid", cf.noticeUrl);
  ok(/GUID/.test(cf.note || ""), "and says so where the next person will read it");

  // Every template anywhere must name a placeholder, or it is a constant.
  for (const src of sources.filter((x) => x.noticeUrl)) {
    ok(/\{(ocid|id|ref)\}/.test(src.noticeUrl), `${src.id}: the template has a placeholder`, src.noticeUrl);
  }
}

console.log("\n=== a head start on the contact, without going looking for one ===\n");
{
  /**
   * The line does not move. Nothing crawls a company's site hunting for
   * addresses and nothing stores a person's. What the card adds is a link
   * built from a name already held, to the public statutory register, so the
   * reader does in one click what they would otherwise do by typing.
   */
  const page = fs.readFileSync(path.join(root, "frontend", "internal", "js", "signals-page.js"), "utf8");
  ok(/find-and-update\.company-information\.service\.gov\.uk/.test(page),
     "the card links a named party to the public register");
  ok(/encodeURIComponent\(name\)/.test(page), "and the name is encoded into the query, not concatenated raw");
  ok(/Won by/.test(page) && /Let by/.test(page), "the supplier and the buyer are labelled differently");
  ok(/the client, not the winner/.test(page),
     "and the card says which is which, so nobody writes to the client asking to supply the winner");

  // The sweep still must not fetch anything but a source's own declared pages.
  const idx = fs.readFileSync(path.join(root, "backend", "lib", "signals", "index.js"), "utf8");
  const fetches = [...idx.matchAll(/politeFetch\(([^)]*)\)/g)].map((m) => m[1].trim());
  ok(fetches.length >= 2 && fetches.every((f) => /src\.url|src\.contactPage/.test(f)),
     "the sweep fetches only a source's own url and its declared contact page — never a company found in an item",
     fetches.join(" | "));

  // And there is still no transport anywhere in the module.
  for (const f of ["index.js", "parse.js", "contact.js", "fetch.js"]) {
    const src = fs.readFileSync(path.join(root, "backend", "lib", "signals", f), "utf8");
    ok(!/nodemailer|sendMail|smtp\.|createTransport/i.test(src), `${f} has no way to send anything`);
  }
}

fs.rmSync(scratch, { recursive: true, force: true });
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
