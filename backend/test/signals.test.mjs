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
    epc: ["EPC contractor named for the plant", "Energy developer reaches financial close", "Shutdown contractor appointed"],
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
  // The expansion lives in parse.js as noticeTargets, because the check tool
  // has to agree with the sweep about what will be requested. So test the
  // behaviour, which is stronger than grepping for a line: ask it for a
  // template and prove nothing template-shaped survives.
  ok(S.noticeTargets({ url: "https://x/api?from={{date:-7}}" })[0] === `https://x/api?from=${week}`,
     "the sweep fetches a resolved url, not a template", S.noticeTargets({ url: "https://x/api?from={{date:-7}}" })[0]);
  ok(/const targets = noticeTargets\(src\)/.test(sweepSrc) && /politeFetch\(first\)/.test(sweepSrc),
     "and it asks noticeTargets for them rather than building its own");
  ok(/const first = targets\[0\]/.test(sweepSrc),
     "and the first target is the source's own url, or the first notice it names");
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
  /**
   * THE NOTICE FIRST, THE PROCUREMENT PAGE SECOND. In a Find a Tender release
   * the `id` is the notice number and the public page is /Notice/<number>; the
   * ocid identifies the WHOLE procurement, which can carry many notices across
   * planning, tender, award and contract. Linking to /procurement/<ocid> put a
   * reader on the process and left them to work out which notice the signal
   * was about — a step removed from the opportunity, which was the complaint.
   */
  const fts = sources.find((x) => x.id === "find-a-tender");
  const ftsTemplates = [].concat(fts.noticeUrl);
  ok(/\/Notice\/\{id\}$/.test(ftsTemplates[0]),
     "Find a Tender links to the NOTICE first, by its own notice number", ftsTemplates[0]);
  ok(/\/procurement\/\{ocid\}$/.test(ftsTemplates[1]),
     "and falls back to the procurement page only when there is no notice number", ftsTemplates[1]);
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
  /**
   * THE SWEEP NOW FOLLOWS PAGES, so there is a third thing it fetches — and
   * the rule has to hold for it too. Every target must trace back to a source:
   * its own url, the next page OF THAT RESPONSE, or its declared contact page.
   * Never an address found inside an item, which is the harvester this was
   * built instead of.
   */
  const fetches = [...idx.matchAll(/politeFetch\(([^)]*)\)/g)].map((m) => m[1].trim());
  ok(fetches.length >= 4, `${fetches.length} fetch targets`, fetches.join(" | "));
  ok(fetches.every((f) => ["first", "target", "next", "src.contactPage"].includes(f)),
     "the sweep fetches only the source url, a notice it names, its next page, and its declared contact page",
     fetches.join(" | "));
  // Every one of those four traces back to the source. `target` is the one
  // added by the watchlist, and it is built from src.url and src.notices —
  // never from anything found inside an item.
  ok(/const targets = noticeTargets\(src\)/.test(idx),
     "  and the targets come from noticeTargets, which takes only the source");
  // THE PROPERTY THIS PROTECTS, stated where it now lives. noticeTargets is
  // handed a source and nothing else, so there is no route by which an address
  // found inside an item could become something the watcher requests.
  const parseSrc = fs.readFileSync(path.join(root, "backend", "lib", "signals", "parse.js"), "utf8");
  const fn = (/export function noticeTargets\(src\) \{[\s\S]*?\n\}/.exec(parseSrc) || [""])[0];
  ok(fn.length > 0, "  and noticeTargets is where the expansion happens");
  ok(/src\.notices/.test(fn) && /src\.url/.test(fn),
     "  built from the source's own url and its own notice list");
  ok(!/\bitem\b|\bentry\b|\.link\b|\.href\b/.test(fn),
     "  and from nothing found inside an item", fn);
  ok(/const next = nextLink\(body, url\)/.test(idx),
     "  and `next` comes from the response the source itself returned, never from an item");

  // And there is still no transport anywhere in the module.
  for (const f of ["index.js", "parse.js", "contact.js", "fetch.js"]) {
    const src = fs.readFileSync(path.join(root, "backend", "lib", "signals", f), "utf8");
    ok(!/nodemailer|sendMail|smtp\.|createTransport/i.test(src), `${f} has no way to send anything`);
  }
}

console.log("\n=== the backfill can only mend a link, not touch anything else ===\n");
{
  /**
   * WHY A BACKFILL NEEDS ITS OWN RULES. Every Find a Tender signal queued
   * before 21 October links to the API endpoint the sweep had just read, and
   * re-sweeping cannot mend them: the fingerprint already holds those stories,
   * so a fresh sweep skips them as "already seen" and the broken links stay
   * broken for ever. Hence a tool that edits rows in the live queue.
   *
   * That is a dangerous shape, so the guarantees are asserted rather than
   * intended. A backfill that quietly re-runs today's rules over old rows is
   * not a backfill, it is an undocumented migration — and the first thing it
   * would destroy is the record of what somebody had already read and
   * dismissed.
   */
  const tool = fs.readFileSync(path.join(root, "backend", "tools", "signals-relink.mjs"), "utf8");

  // It can change a row. It cannot create or destroy one.
  ok(/import \{ collection, update \}/.test(tool), "it imports update, and only update, from the store");
  ok(!/\binsert\s*\(/.test(tool), "it cannot insert a signal");
  ok(!/\bremove\s*\(/.test(tool), "and it cannot remove one");
  const imports = [...tool.matchAll(/import \{([^}]*)\} from/g)].flatMap((m) => m[1].split(",").map((x) => x.trim()));
  ok(!imports.includes("sweep") && !imports.includes("queue"),
     "it imports neither sweep nor queue, so it cannot add to the list it is mending", imports.join(", "));
  ok(!/\bsweep\(|\bqueue\(/.test(tool), "and calls neither");

  /**
   * MENDING ONLY THE LINK WAS USELESS, so the tool now writes the parties and
   * the contact too — which makes the allowlist the thing that keeps it safe
   * rather than the narrowness of the patch.
   *
   * Two lists, and they must not overlap. MENDABLE is what a record can say
   * about a signal. NEVER is what a person owns, plus the three fields that
   * decide the queue's order: re-deriving score, triggers and sectors under
   * today's rules would reorder a list somebody is part-way through reading,
   * and "it moved while I was working it" is a worse defect than the one being
   * repaired.
   */
  const listOf = (name) => {
    const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(tool);
    return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : null;
  };
  const mendable = listOf("MENDABLE"), never = listOf("NEVER");
  ok(Array.isArray(mendable) && mendable.length, "it declares what it may write", String(mendable));
  ok(Array.isArray(never) && never.length, "and what it must never write", String(never));
  ok(!mendable.some((f) => never.includes(f)), "the two lists do not overlap",
     mendable.filter((f) => never.includes(f)).join(", "));

  for (const owned of ["status", "actedBy", "actedAt", "note"]) {
    ok(never.includes(owned) && !mendable.includes(owned), `${owned} is a person's and is off limits`);
  }
  for (const ranking of ["score", "triggers", "sectors"]) {
    ok(never.includes(ranking) && !mendable.includes(ranking),
       `${ranking} is left alone, so the queue does not reorder under a reader`);
  }
  for (const wanted of ["url", "buyer", "suppliers", "roleAddress", "contactWithheld"]) {
    ok(mendable.includes(wanted), `${wanted} is mendable — it is what the rows were missing`);
  }

  // The patch is built by walking MENDABLE, so a field outside it cannot be
  // written even by accident, and the tool refuses at runtime if one is.
  ok(/for \(const key of MENDABLE\)/.test(tool), "the patch is built from the allowlist, not assembled by hand");
  ok(/NEVER\.includes\(f\)/.test(tool) && /REFUSING/.test(tool),
     "and it checks what it actually wrote, refusing rather than reporting success");

  // A thin read must never blank a field that already holds something.
  ok(/Never replace something with nothing/.test(tool),
     "a row that already names a supplier cannot lose it to a thin read");

  // The contact goes through the same single gate as the sweep.
  ok(/scrub\(\{/.test(tool), "the contact passes through scrub(), so no personal address arrives by this route");

  // Dry run is the default. Writing to the live queue takes a deliberate flag.
  ok(/const WRITE = process\.argv\.includes\("--write"\)/.test(tool), "it writes only when told to");
  ok(/if \(WRITE\) update\("signals"/.test(tool), "and every write is behind that flag");

  // It must build links through the SAME extractor the sweep uses, not a
  // second implementation of the rule that could drift away from it.
  const extractCall = /extract\(res\.body,[\s\S]{0,160}?\)\)/.exec(tool);
  ok(Boolean(extractCall), "it calls extract() on the fetched body", tool.slice(0, 60));
  ok(/noticeUrl: src\.noticeUrl/.test(extractCall[0]) && /siteUrl: src\.siteUrl/.test(extractCall[0]),
     "with the source's own template and fallback — the same code path as the sweep, not a second copy of the rule",
     extractCall[0]);

  // A row is a candidate only while something is missing, and a patch with no
  // changes in it is not written — which is what makes a second run a no-op.
  ok(/linkedProperly\(sig, src\) \|\| !hasParties\(sig\)/.test(tool),
     "a row is looked at only while its link or its parties are missing");
  ok(/if \(!Object\.keys\(patch\)\.length\)/.test(tool),
     "and an unchanged row is skipped rather than rewritten, so a second run is a no-op");
}

console.log("\n=== the junk a procurement portal publishes, and why it was getting in ===\n");
{
  /**
   * REPORTED FROM THE QUEUE: "we don't need a travel and accommodation booking
   * to be in the list". That one example exposed two lazy patterns of mine and
   * a whole class of false positive behind them.
   *
   * The chain was: "airport TERMINAL" matched the industrial sector, because
   * the sector pattern held a bare "terminal" that a card payment terminal
   * and an airport terminal both satisfy. Then bare "ACCOMMODATION" passed the
   * works gate, because the gate did not ask whose accommodation or where.
   * A staff travel contract therefore read as a worker village on an
   * industrial site, and on a real notice the OCDS summary adds "Contract
   * awarded to X", which fires the award trigger — so it scored six and
   * queued.
   *
   * The sector gate asks whether it is our industry. The works gate asks
   * whether there is anything to build. Neither asked what was being BOUGHT,
   * which on a portal is the question that matters.
   */
  const JUNK = [
    "Travel and Accommodation Booking Services including airport terminal transfers",
    "Provision of Agency Staff and Recruitment Services",
    "Energy Performance Certificates (EPC) for the council housing stock",
    "Software Developer Licences and IT Support Services",
    "Commissioning of Adult Social Care Services",
    "Supply and installation of desktop computers",
    "Legal Services Framework - contract extension",
    "Summer camp activity provision for young people",
    "Planned maintenance of card payment terminals",
    "Mental health and safeguarding services for children",
    "Marketing services framework for the visitor economy",
    "Hotel booking and vehicle hire management services",
  ];
  for (const t of JUNK) {
    // A portal item needs BOTH a sector and something to build. Failing either
    // is enough, and most of these now fail both.
    const refused = !S.classify(t).length || !S.hasWorks(t) || S.notOurs(t);
    ok(refused, `refused: ${t.slice(0, 58)}`,
       `sector ${S.classify(t).join(",") || "none"} / works ${S.hasWorks(t)} / notOurs ${S.notOurs(t)}`);
  }

  /**
   * AND THE OTHER DIRECTION, WHICH MATTERS MORE. Tightening a pattern to kill
   * noise is easy; the danger is killing the signal with it. Every one of
   * these is work this business exists to do and must survive untouched.
   */
  const REAL = [
    ["Walpole SGT4 400kV substation civil works and temporary compound", "grid"],
    ["Kinardochy to Errochty 400kV overhead line groundworks, worker accommodation in scope", "grid"],
    ["Battery energy storage system balance of plant - BESS", "renewables"],
    ["Metro extension work starts on HS2 Curzon Street Station site", "rail"],
    ["Prieska Copper Zinc Mine development, construction camp and site establishment", "industrial"],
    ["Port terminal expansion: piling and reinstatement works", "industrial"],
    ["EPC contractor appointed for 250MW solar farm", "renewables"],
    ["Hyperscale data centre: enabling works and site establishment", "datacentres"],
    ["Rail depot redevelopment, temporary welfare units required", "rail"],
  ];
  for (const [t, sector] of REAL) {
    ok(S.classify(t).includes(sector), `still ${sector}: ${t.slice(0, 50)}`, S.classify(t).join(",") || "none");
    ok(S.hasWorks(t), `  and still has work in it`, "hasWorks false");
    ok(!S.notOurs(t), `  and is not excluded`, "excluded");
  }

  // The exclusion list has to stay NARROW. Catering, security, waste,
  // furniture and connectivity are all in this business's own scope on a site,
  // so excluding them would cost real signals to save a little noise.
  for (const inScope of [
    "Site catering and welfare provision for the construction compound",
    "Temporary site security and fencing for the substation works",
    "Site waste management and skip hire for the enabling works",
    "Modular accommodation furniture for the worker village",
    "Temporary connectivity and power for the construction compound",
  ]) {
    ok(!S.notOurs(inScope), `not excluded, it is our own scope: ${inScope.slice(0, 48)}`);
    ok(S.hasWorks(inScope), `  and reads as work`, "hasWorks false");
  }

  // Wired in everywhere, and counted rather than silently dropped.
  const idx = fs.readFileSync(path.join(root, "backend", "lib", "signals", "index.js"), "utf8");
  ok(/if \(notOurs\(text\)\) \{ out\.notOurs\+\+; continue; \}/.test(idx),
     "the sweep refuses them and counts what it refused");
  const check = fs.readFileSync(path.join(root, "backend", "tools", "signals-check.mjs"), "utf8");
  ok(/notOurs\(text\)/.test(check), "and the check tool applies the same rule, so its count stays honest");

  // Every pattern in the list must be anchored on something concrete. A bare
  // word in an exclusion list is how a real signal disappears silently.
  for (const re of S.NOT_OURS) {
    const src = re.source;
    ok(src.length > 20, `an exclusion pattern is specific, not a bare word: ${src.slice(0, 44)}`);
  }
}

console.log("\n=== the opportunities a real Find a Tender page holds ===\n");
{
  /**
   * TWENTY REAL NOTICES OFF ONE SEARCH PAGE, reported as "all these kinds of
   * opportunity cannot be found in the signal but more of the useless ones
   * are appearing". Reading them found three separate faults, and the first
   * was the worst thing in this file.
   *
   * NATIONAL GRID'S SUBSTATION CONSTRUCTION MARKET SCORED ZERO. Open-ended,
   * every English region and Wales, with site welfare facilities, fencing,
   * site security and temporary water, drainage and electricity named in its
   * own published scope. Right sector, work plainly in it — and no trigger
   * fired at all, because the Procurement Act 2023 renamed the dynamic
   * purchasing system a DYNAMIC MARKET and I had matched only the old name.
   * The single most valuable class of entry a portal carries was invisible.
   */
  const PAGE = [
    ["National Grid Substation Construction. This QUDM is for substation construction, mechanical and electrical for Lot 1: EPC Substation Construction Suppliers. AIS/GIS Substation Extensions. Provision of site welfare facilities, fencing and site security, temporary connections for water, drainage and electricity. Notice type UK13: Dynamic market intention notice. Dynamic market end date Open-ended.",
      { trigger: "tender", sector: "grid", stage: "open", why: "an open-ended dynamic market, and it scored nothing" }],
    ["Major Projects QUDM. National Grid UK Limited. This QUDM is for Substation Construction, Underground Cable Construction. Major AIS/GIS substation extension. Notice type UK13: Dynamic market intention notice.",
      { trigger: "tender", sector: "grid", stage: "open", why: "the same, under Find a Tender's own abbreviation" }],
    ["TD2340 - Framework for Highways Services. Derby City Council. Improvement, construction, specialist services, materials supply, plant hire and associated activities across the highway network and structures and drainage schemes. UK4: Tender notice.",
      { trigger: "tender", sector: "rail", stage: "open", why: "major civils means highways, and only 'National Highways' matched" }],
    ["Dynamic Purchasing - Construction, Civil Engineering and associated works. Orkney Islands Council. Building construction and Civil Engineering works. Works to piers and harbours.",
      { trigger: "tender", sector: "rail", stage: "open", why: "piers and harbours are major civils and had no sector at all" }],
    ["Supply of Substation Compound Equipment. National Grid Electricity Distribution. Supply of various lots of Substation Compound equipment across various NGED sites. UK3: Planned procurement notice.",
      { trigger: "forward", sector: "grid", stage: "early", why: "a planned procurement notice is a forward notice and was unmatched" }],
    ["BCU-ITT-64220 - Substation 4 Switchgear Upgrade. Betsi Cadwaladr University Health Board. LV switchgear infrastructure within Substation 4 at Wrexham. Attendance at a site visit is a mandatory requirement. UK4: Tender notice. Total value £1,140,000.",
      { trigger: "tender", sector: "grid", stage: "open", why: "an upgrade on a live substation needs an establishment too" }],
  ];

  for (const [text, want] of PAGE) {
    const r = S.score(text);
    ok(r.score >= 3, `queues: ${want.why}`, `scored ${r.score} — ${text.slice(0, 60)}`);
    ok(r.triggers.includes(want.trigger), `  trigger ${want.trigger}`, r.triggers.join(", ") || "NONE");
    ok(r.sectors.includes(want.sector), `  sector ${want.sector}`, r.sectors.join(", ") || "none");
    ok(S.stage(r.triggers) === want.stage, `  reads as ${want.stage}`, S.stage(r.triggers));
    ok(S.hasWorks(text), `  and has work in it`, "hasWorks false");
    ok(!S.notOurs(text), `  and is not excluded`, "excluded");
  }

  // The useless ones off the same page must still be refused.
  for (const junk of [
    "Provision of a Cemetery Site Feasibility Assessment and Wider Site Search. Peterborough City Council.",
    "Central Forest District Planting DPS. Forestry England. Restock and Beat Up Clearfell Sites, New Planting.",
    "The Supply of Electricity to MOD sites in Northern Ireland. Pricing model: variable price, cost-plus.",
    "Delivery Partner Dynamic Purchasing System. Homes England. General residential led development.",
    "High-Level Conservation Measures for Targeted Nutrient Neutrality Sites. Natural England.",
    "Corran Ferry New Electric Vessel. Detailed design and build for one passenger and vehicle ferry.",
  ]) {
    const r = S.score(junk);
    const refused = r.score < 3 || !r.sectors.length || !S.hasWorks(junk) || S.notOurs(junk);
    ok(refused, `still refused: ${junk.slice(0, 52)}`,
       `score ${r.score} / sector ${r.sectors.join(",") || "none"} / works ${S.hasWorks(junk)}`);
  }
}

console.log("\n=== a market open since February cannot be found in a seven-day window ===\n");
{
  /**
   * THE STRUCTURAL FAULT BEHIND THE OTHER TWO. The notice APIs are windowed
   * queries read one response at a time, and the window was seven days. That
   * is right for news and wrong for the entries worth most: a dynamic market
   * is open-ended, admits members at any time, cannot cap its numbers — and
   * may have been published in February. National Grid's was eight months old
   * and still open. No pattern could have rescued it.
   *
   * So the window widens and the sweep follows the pages a source asks for.
   */
  ok(typeof S.nextLink === "function", "the reader can find a response's next page");
  ok(S.nextLink(JSON.stringify({ links: { next: "/api?cursor=abc" } }), "https://x.test/api")
       === "https://x.test/api?cursor=abc", "a relative next link is resolved against the request");
  ok(S.nextLink(JSON.stringify({ releases: [] }), "https://x.test/api") === null, "no next link is no next page");
  ok(S.nextLink("<rss/>", "https://x.test/api") === null, "and a feed has none either");

  const idx = fs.readFileSync(path.join(root, "backend", "lib", "signals", "index.js"), "utf8");
  ok(/Math\.min\(Number\(src\.pages\) \|\| 1, 50\)/.test(idx),
     "a source says how deep to go, the default is one page, and it is capped");
  ok(/await politeFetch\(next\)/.test(idx),
     "every extra page goes through the polite fetcher — one host at a time, robots.txt obeyed");

  const list = JSON.parse(fs.readFileSync(path.join(root, "content", "signals", "sources.json"), "utf8"));
  const deep = list.find((x) => x.id === "find-a-tender-markets");
  ok(Boolean(deep), "there is a source for the open markets, separate from the news window");
  ok(/\{\{date:-\d{2,3}\}\}/.test(deep.url), "it looks back months, not days", deep.url);
  ok(Number(deep.pages) > 5, "and follows enough pages to reach them", deep.pages);
  ok(deep.requireSector === true && deep.requireWorks === true,
     "with both gates on, so the volume costs reading time and not queue noise");

  // The daily news window must stay shallow, or a sweep takes all morning.
  const daily = list.find((x) => x.id === "find-a-tender");
  ok(Number(daily.pages || 1) <= 3, "while the daily window stays shallow", daily.pages);
  ok(/\{\{date:-7\}\}/.test(daily.url), "and narrow", daily.url);
}

console.log("\n=== one command, and it stays correct as this grows ===\n");
{
  /**
   * WHY THIS IS TESTED AT ALL. Every change to this platform used to end with
   * a different handful of commands — take the new source list, run the check,
   * mend the links, sweep, read the queue — and remembering which applied this
   * week was a job in itself. deploy/update.sh is the one set.
   *
   * The thing worth asserting is not that it runs, but that it cannot GO
   * STALE. A script listing today's commands is wrong by the next change, so
   * every section asks a question about the live system and acts on the
   * answer, and the "what needs you" section reads the registry rather than a
   * list written out by hand.
   */
  const sh = fs.readFileSync(path.join(root, "deploy", "update.sh"), "utf8");

  ok(/^#!\/bin\/bash/.test(sh), "it is a script");
  ok(/--check/.test(sh) && /CHECK_ONLY/.test(sh),
     "it can report without changing anything, which is how you look before you leap");
  ok(/-h\|--help/.test(sh), "and it explains itself");

  // Every tool the day's work needs must be driven from here, or somebody is
  // back to remembering which ones apply.
  for (const tool of ["signals-check.mjs", "signals-relink.mjs", "signals-sweep.mjs", "signals-digest.mjs"]) {
    ok(sh.includes(tool), `it runs ${tool}`);
    ok(fs.existsSync(path.join(root, "backend", "tools", tool)), `  and ${tool} exists`);
  }
  ok(/autodeploy\.sh/.test(sh), "it deploys when the checkout is behind the branch");

  /**
   * THE ONE THING IT OVERWRITES IS BACKED UP FIRST. The live source list is
   * the only file this touches, and it is the file a person may have hand
   * edited, so a timestamped copy goes beside it before the shipped one lands.
   */
  ok(/signals-sources\.\$STAMP\.bak/.test(sh), "the live source list is backed up before it is replaced");
  ok(/STAMP=\$\(date /.test(sh), "under a timestamp, so one run cannot overwrite another's backup");

  // Nothing in it may delete. An operator script that removes things is one
  // typo from being the outage it was written to prevent.
  const destructive = [...sh.matchAll(/\b(rm|rmdir|drop|truncate|docker volume rm|DELETE FROM)\b/g)].map((m) => m[1]);
  ok(destructive.length === 0, "it deletes nothing at all", destructive.join(", "));

  // It must say where to look next, because the whole point is not having to
  // go and find it.
  ok(/what-is-outstanding\.md/.test(sh), "it points at the outstanding list");
  ok(/internal\/signals\.html/.test(sh), "and at the queue");
  ok(/same command every time/.test(sh), "and says plainly that it is the same command every time");
}

console.log("\n=== the digest reads the registry, not a hand-written list ===\n");
{
  /**
   * The part that keeps update.sh honest. A new sector, stage or source has
   * to appear in "what needs you" without anybody editing a script — so this
   * reads SECTORS, STAGE_LABEL and the source file itself.
   */
  const dig = fs.readFileSync(path.join(root, "backend", "tools", "signals-digest.mjs"), "utf8");
  for (const fromRegistry of ["SECTORS", "STAGE_LABEL", "sources", "seedStatus"]) {
    ok(dig.includes(fromRegistry), `the digest reads ${fromRegistry} rather than a list of its own`);
  }

  // Read only. It is run at the end of every update and on a schedule, so it
  // must not be able to change, queue or send anything.
  ok(!/\binsert\(|\bupdate\(|\bremove\(|\bqueue\(|\bsweep\(/.test(dig),
     "it writes nothing, queues nothing and sweeps nothing");
  const imports = [...dig.matchAll(/import \{([^}]*)\} from/g)].flatMap((m) => m[1].split(",").map((x) => x.trim()));
  ok(imports.includes("collection") && !imports.includes("insert") && !imports.includes("update"),
     "it imports only the read side of the store", imports.join(", "));

  // The urgent part is the dated part, and it has to be sorted by the date.
  ok(/deadlineAt - b\.deadlineAt|a\.deadlineAt - b/.test(dig), "what closes soonest is listed first");
  ok(/already passed/.test(dig),
     "and a date that has already gone by is called out rather than left looking live");
}

console.log("\n=== what the live run broke, third time out ===\n");
{
  /**
   * THREE FAULTS OFF ONE SESSION AT THE SERVER, and the first stopped the
   * backfill dead on its first real use.
   *
   * fill() took a STRING template, and the notice template had become an
   * ORDERED LIST — notice number first, procurement page second — when the
   * link was corrected a few hours earlier. I changed the extractor and the
   * source file and not this. It threw on the first row whose story had aged
   * out of the feed, which is the only branch that reaches fill(), so
   * everything before it had already been written: a backfill that stopped
   * halfway and gave no clue which rows it had reached.
   */
  const tool = fs.readFileSync(path.join(root, "backend", "tools", "signals-relink.mjs"), "utf8");
  const body = tool.slice(tool.indexOf("function fill("), tool.indexOf("\nconst all = sources()"));
  const fill = new Function("return " + body.slice(0, body.lastIndexOf("}") + 1).trim())();

  const TPL = ["https://www.find-tender.service.gov.uk/Notice/{id}",
               "https://www.find-tender.service.gov.uk/procurement/{ocid}"];

  ok(typeof fill(TPL, "ocds-h6vhtk-0657bc") === "string",
     "a LIST of templates no longer throws — the live crash", String(fill(TPL, "ocds-h6vhtk-0657bc")));

  /**
   * AND EACH PLACEHOLDER WANTS ITS OWN KIND OF IDENTIFIER. The first repair
   * filled {id} with an ocid, producing /Notice/ocds-h6vhtk-0657bc — a
   * confident dead link, and worse than the search-page fallback it replaced,
   * because a reader stops trusting every link rather than one.
   */
  ok(fill(TPL, "ocds-h6vhtk-0657bc") === "https://www.find-tender.service.gov.uk/procurement/ocds-h6vhtk-0657bc",
     "an ocid fills the {ocid} template and skips the {id} one", fill(TPL, "ocds-h6vhtk-0657bc"));
  ok(fill(TPL, "065943-2026") === "https://www.find-tender.service.gov.uk/Notice/065943-2026",
     "a notice number fills the {id} template", fill(TPL, "065943-2026"));
  ok(fill(["https://x/Notice/{id}"], "ocds-h6vhtk-1") === null,
     "and a template that only wants a notice number builds nothing from an ocid",
     String(fill(["https://x/Notice/{id}"], "ocds-h6vhtk-1")));
  ok(fill(TPL, null) === null, "no reference, no url");
  ok(typeof fill("https://x/procurement/{ocid}", "ocds-h6vhtk-1") === "string",
     "a bare string still works, so nothing that passes one breaks");

  // One bad row must not end the run, which is how the crash left the queue
  // in two states with nothing to say which rows were reached.
  ok(/try \{/.test(tool) && /catch \(err\)/.test(tool),
     "a row that throws is reported and the rest of the run continues");

  /**
   * THE CHECK TOOL WAS DESCRIBING A SOURCE THAT DOES NOT EXIST. On the live
   * run it reported identical counts for the seven-day Find a Tender source
   * and the 120-day one — same hundred items, same sixty-seven dropped —
   * because it read one page while the sweep reads twelve. The deep source
   * exists to reach pages two to twelve.
   */
  const check = fs.readFileSync(path.join(root, "backend", "tools", "signals-check.mjs"), "utf8");
  ok(/nextLink\(bodyNow, at\)/.test(check), "the check tool follows pages too");
  ok(/Number\(s\.pages\) \|\| 1, 50/.test(check), "to the depth the source asks for, capped the same way");
  ok(/\$\{read\} pages/.test(check), "and says how many it read, so the two sources read differently on screen");

  /**
   * AND THE ONE COMMAND COULD NOT FIND ITSELF. It defaulted to /opt/etablix
   * and the live server keeps the checkout elsewhere, so the first thing the
   * script said was "No such file or directory" — a poor showing for something
   * whose whole purpose is not having to look anything up.
   */
  const sh = fs.readFileSync(path.join(root, "deploy", "update.sh"), "utf8");
  ok(/HERE=\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)" && pwd\)/.test(sh),
     "update.sh works out where it is rather than assuming");
  ok(/REPO=\$\{ETABLIX_REPO:-\$\(cd "\$HERE\/\.\." && pwd\)\}/.test(sh),
     "and takes the repository from its own location, with the variable as an override");
  ok(/\$HERE\/update\.sh/.test(sh), "and prints the path that actually works on this machine");
}

console.log("\n=== a named market is fetched, not searched for ===\n");
{
  /**
   * THE FAILURE THIS ANSWERS, AND IT WAS MINE TWICE OVER.
   *
   * National Grid's substation construction dynamic market, notice
   * 015074-2026, was published on 19 February 2026 and is still open:
   * open-ended, every English region and Wales, with site welfare facilities,
   * fencing, site security and temporary water, drainage and electricity named
   * in its own published scope. It is the single best entry on the portal.
   *
   * It was handed to me directly, off a real Find a Tender page, with the
   * complaint that the watcher could not find it. I widened the date window to
   * 120 days and added paging. BOTH WERE USELESS: the notice is eight months
   * old, so it falls outside any window worth querying, and a hundred items a
   * page against tens of thousands of notices is a lottery rather than a
   * search. The system was updated on that advice and still found nothing.
   *
   * The API answers a direct request for a notice by its own identifier, and
   * that fact was in the documentation I had already read and quoted back.
   * So a source may now NAME the notices it watches. No window, no paging.
   */
  const list = JSON.parse(fs.readFileSync(path.join(root, "content", "signals", "sources.json"), "utf8"));
  const watch = list.find((x) => x.id === "find-a-tender-watch");
  ok(Boolean(watch), "there is a source that watches named notices");
  ok(/\{\{notice\}\}/.test(watch.url), "its url marks where each identifier goes", watch.url);
  ok(Array.isArray(watch.notices) && watch.notices.length >= 2,
     `and it names ${(watch.notices || []).length} notice(s)`);
  ok(watch.notices.includes("015074-2026"),
     "including the National Grid substation market that started all this", watch.notices.join(", "));
  ok(watch.enabled !== false, "and it is switched on");

  /**
   * NEITHER GATE APPLIES TO A CURATED LIST, and that is deliberate. The sector
   * and works gates exist to protect a reader from a portal publishing every
   * procurement in the country. A human chose each of these by hand, so there
   * is nothing left for a filter to protect against — and a gate here would
   * silently drop the very notice somebody added on purpose.
   */
  ok(watch.requireSector !== true && watch.requireWorks !== true,
     "the gates are off, because a person already decided each entry belongs");

  // Every identifier must be the shape the API accepts: nnnnnn-yyyy.
  for (const id of watch.notices) {
    ok(/^\d{6}-\d{4}$/.test(id), `${id} is a Find a Tender notice identifier`, id);
  }

  const idx = fs.readFileSync(path.join(root, "backend", "lib", "signals", "index.js"), "utf8");
  // Behavioural, against the real source entry: the six identifiers in
  // sources.json must become six exact addresses with no template left.
  const built = S.noticeTargets(watch);
  ok(built.length === watch.notices.length,
     "the sweep fetches a watchlist when a source names one", `${built.length} target(s)`);
  ok(built.every((u) => !u.includes("{{") && watch.notices.some((id) => u.endsWith(id))),
     "substituting each identifier into the url", built.join(" | "));
  ok(built[0].includes("015074-2026"),
     "and the National Grid substation market is one of them", built[0]);
  ok(/targets\.slice\(1\)/.test(idx), "and reads every one of them, not only the first");
  // A withdrawn notice answers 404. That must not stop the rest of the list.
  ok(/if \(!one\.ok \|\| !one\.body\) \{[^}]*continue; \}/.test(idx),
     "a notice that has gone is counted and skipped, not fatal");
  // And it is NAMED. "failed 4" with no names was the live run's own report,
  // and finding out which four meant checking all twenty-seven by hand.
  ok(/out\.failures\.push\(\{ id: src\.id/.test(idx),
     "and a failure keeps the source that caused it, not just a tally");
  // Paging and a watchlist are different instruments; mixing them would
  // multiply requests for no gain.
  ok(/targets\.length > 1 \? 1 :/.test(idx), "a watchlist does not also page");

  /**
   * AND THE ONE THAT MADE THE DERBY FRAMEWORK READ AS EARLY. A council titles
   * it "Framework FOR Highways Services"; only "framework agreement" and
   * "framework opportunity" matched, so a £128m live framework scored as a
   * bare value and would have been refused by the portal gate for having no
   * trigger worth the name.
   */
  const derby = "TD2340 - Framework for Highways Services. Derby City Council. Improvement, construction, "
    + "specialist services, materials supply, plant hire across the highway network and drainage schemes.";
  const r = S.score(derby);
  ok(r.triggers.includes("tender"), '"Framework for" is a framework', r.triggers.join(", ") || "none");
  ok(S.stage(r.triggers) === "open", "and it reads as open", S.stage(r.triggers));
}

fs.rmSync(scratch, { recursive: true, force: true });
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
