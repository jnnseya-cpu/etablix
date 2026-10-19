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
  const ocds = "Buyer: National Grid Electricity Transmission. Civils at Walpole. Contract awarded to OCU Utility Services Ltd.";
  const names = S.namedOrgs(ocds);
  ok(!names.some((x) => /\. /.test(x)), "a name never runs across a full stop", names.join(" / "));
  ok(names.includes("National Grid Electricity Transmission"), "the buyer is read whole", names.join(" / "));
  ok(names.includes("OCU Utility Services Ltd"), "and so is the supplier", names.join(" / "));
  ok(S.namedOrgs("St.Modwen Logistics named as partner").includes("St.Modwen Logistics"),
     "while a full stop INSIDE a name is kept", S.namedOrgs("St.Modwen Logistics named as partner").join(" / "));
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
  // Nothing new ships enabled. A URL nobody has checked must not be swept.
  for (const src of list.filter((x) => x.url && x.enabled !== false)) {
    ok(!src.verify, `${src.id}: is enabled, so it carries no outstanding verify note`, src.verify);
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
  ok(/\(s\.orgs \|\| \[\]\)\.map\(\(o\) => esc\(o\)\)/.test(page), "and so is every extracted organisation name");
}

fs.rmSync(scratch, { recursive: true, force: true });
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
