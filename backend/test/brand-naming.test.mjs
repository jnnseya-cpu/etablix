/**
 * THE STRAPLINE SAYS "BRAND", NEVER "COMPANY", AND NEVER IN A NEW WORD ORDER.
 *
 *   node backend/test/brand-naming.test.mjs
 *
 * Two lockups arrived on 25 November 2026 and they differed from each other by
 * one letter — "a Nseya Groupe Construction company" and "a Nseya Group
 * Construction company". Neither matched the form on 54 files, both reversed
 * the word order of the registered office at Groupe Nseya House, and both
 * asserted a parent.
 *
 * THE PARENT IS THE PART THAT MATTERS. There is one legal entity, JNN GLOBAL
 * LTD, company 15405437. No group, no holding company, no subsidiary. "a X
 * company" tells a procurement officer to go and find X at Companies House,
 * and this business already knows what happens when a name does not resolve
 * there: that is where a serious reader stops. ETABLIX is a trading name, so
 * "brand" is true and "company" is not.
 *
 * WHY A TEST AND NOT A NOTE. A strapline arrives as a picture. It gets typed
 * into a footer, a letterhead, an email signature and a PDF by whoever is
 * building that thing, months apart, each copying the last. By then nobody
 * remembers it was a question. This fails the build on the first paste.
 *
 * IT READS THE PUBLISHED SURFACES AND THE OUTBOUND DOCUMENTS. `brand/` holds
 * the superseded artwork and the brief that quotes the wrong forms in order to
 * correct them, and CLAUDE.md records the rule by stating what it forbids —
 * those three are named, with the reason, rather than excluded by a pattern
 * that would also hide a real mistake.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${String(saw).slice(0, 300)}` : ""}`); }
};

/** Files that quote the wrong forms in order to correct them. */
const EXPLAINS_THE_ERROR = {
  "brand/README.md": "records what was supplied and why neither file is approved",
  "brand/STRAPLINE-CORRECTION.md": "the brief to the designer; it must quote the line it is correcting",
  "CLAUDE.md": "states the rule by naming the forms it forbids",
};

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(html|md|js|mjs|json|txt|cjs)$/.test(e.name)) out.push(full);
  }
  return out;
};

const files = [
  ...walk(path.join(ROOT, "frontend/public")),
  ...walk(path.join(ROOT, "business")),
  ...walk(path.join(ROOT, "brand")),
  path.join(ROOT, "CLAUDE.md"),
  path.join(ROOT, "README.md"),
].filter((f) => fs.existsSync(f));

const rel = (f) => path.relative(ROOT, f);
const text = (f) => fs.readFileSync(f, "utf8");

console.log(`\n=== the endorsement form appears nowhere that a reader sees ===\n`);
ok(files.length > 50, `${files.length} published pages and outbound documents read`, files.length);

{
  // "a <anything Nseya> company" — the structure, in any word order or spelling.
  const PARENT = /a\s+(?:the\s+)?(?:Groupe|Group)?\s*Nseya\s*(?:Groupe|Group)?[^.<\n]{0,40}?\bcompany\b/i;
  const offenders = files
    .filter((f) => PARENT.test(text(f)))
    .map(rel)
    .filter((f) => !(f in EXPLAINS_THE_ERROR));
  ok(offenders.length === 0,
     'NO PAGE OR DOCUMENT SAYS "a … company" — it asserts a parent entity, and there is one legal entity with no group above it. A reader sent to Companies House for an endorser who is not there is a reader who stops',
     offenders);
}
{
  // The reversed order, which is how a fourth and fifth name appeared.
  const REVERSED = /Nseya\s+Groupe?\b/i;
  const offenders = files
    .filter((f) => REVERSED.test(text(f)))
    .map(rel)
    .filter((f) => !(f in EXPLAINS_THE_ERROR));
  ok(offenders.length === 0,
     'AND NONE REVERSES THE WORD ORDER — it is "Groupe Nseya", matching the registered office at Groupe Nseya House. Two lockups arrived one letter apart, which is how fast a name varies once it is allowed to',
     offenders);
}

console.log("\n=== the files that quote the error are named, with the reason ===\n");
{
  const quoting = files.filter((f) => /Nseya\s+Groupe?\b|a\s+Nseya[^.<\n]{0,40}company/i.test(text(f))).map(rel);
  const unnamed = quoting.filter((f) => !(f in EXPLAINS_THE_ERROR));
  ok(unnamed.length === 0, "nothing quotes a forbidden form without being on the list", unnamed);
  for (const [f, why] of Object.entries(EXPLAINS_THE_ERROR)) {
    ok(fs.existsSync(path.join(ROOT, f)), `${f} — ${why}`);
  }
  const stale = Object.keys(EXPLAINS_THE_ERROR).filter((f) => !quoting.includes(f));
  ok(stale.length === 0,
     "and every name on the list still quotes one, so the list does not outlive what it excuses",
     stale);
}

console.log("\n=== the correct form is still on the site, not merely un-forbidden ===\n");
{
  const site = walk(path.join(ROOT, "frontend/public")).filter((f) => f.endsWith(".html"));
  // The strapline is now a link, so the words are split by markup. Read what a
  // reader reads: strip tags and entities, then look for the sentence.
  const reads = (f) => text(f)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#8599;/g, " ")
    .replace(/\s+/g, " ");
  const carrying = site.filter((f) => /[Aa] Groupe Nseya brand/.test(reads(f)));
  ok(carrying.length >= 10,
     `${carrying.length} public pages read "a Groupe Nseya brand" — a rule that only forbids things lets the right answer disappear without anything failing`,
     carrying.length);
  const footer = path.join(ROOT, "frontend/public/index.html");
  ok(/Groupe Nseya are trading names of JNN GLOBAL LTD/.test(text(footer)),
     "and the footer still resolves the brand to the registered company");
}

console.log("\n=== and the strapline takes the reader to the group, on every page that carries it ===\n");
{
  // A strapline naming a group that a reader cannot reach is the Companies
  // House failure in a second form: the name is there and resolves to nothing.
  const GROUP_URL = "https://www.nseyagroup.com";
  const site = walk(path.join(ROOT, "frontend/public")).filter((f) => f.endsWith(".html"));
  const reads = (f) => text(f).replace(/<[^>]*>/g, "").replace(/&nbsp;|&#8599;/g, " ").replace(/\s+/g, " ");
  const carrying = site.filter((f) => /[Aa] Groupe Nseya brand/.test(reads(f)));
  const unlinked = carrying.filter((f) => !text(f).includes(GROUP_URL)).map(rel);
  ok(unlinked.length === 0,
     `every one of the ${carrying.length} pages carrying the strapline links the words "Groupe Nseya" to ${GROUP_URL}`,
     unlinked);

  // The link is on the strapline words themselves, not somewhere else on the page.
  const ANCHOR = new RegExp(`<a href="${GROUP_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>\\s*Groupe Nseya`);
  const misplaced = carrying.filter((f) => !ANCHOR.test(text(f))).map(rel);
  ok(misplaced.length === 0,
     "and the anchor wraps the words Groupe Nseya, so the reader clicks the name rather than hunting for it",
     misplaced);

  // New tab, and no referrer leak — the same treatment CONSTRUX and VERYX get.
  const sloppy = carrying.filter((f) => {
    const m = text(f).match(new RegExp(`<a href="${GROUP_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`, "g")) || [];
    return m.some((tag) => !/target="_blank"/.test(tag) || !/rel="noopener"/.test(tag));
  }).map(rel);
  ok(sloppy.length === 0,
     'each link opens in a new tab with rel="noopener" — the site does not throw its own reader out to another domain',
     sloppy);

  // A page title cannot hold markup. The three title fields stay plain text.
  const about = text(path.join(ROOT, "frontend/public/about.html"));
  const titles = about.match(/<title>[^<]*<\/title>|<meta (?:property="og:title"|name="twitter:title") content="[^"]*">/g) || [];
  ok(titles.length === 3 && titles.every((t) => !t.includes("<a href")),
     "and the three title fields on about.html stay plain text — a link in a <title> is markup in a search result",
     titles.length);
}

console.log("\n=== the mark itself is unchanged, so nothing about it needed updating ===\n");
{
  const mark = text(path.join(ROOT, "frontend/public/img/logo-mark.svg"));
  ok(/#1c2621/i.test(mark) && /#c9a35c/i.test(mark),
     "the hand-built mark keeps its own hex values — the supplied artwork is lossy, so a sampled colour is within compression noise of the truth and is not authoritative for a brand colour",
     mark.match(/#[0-9a-f]{6}/gi));
  ok(fs.existsSync(path.join(ROOT, "brand/source")),
     "and the supplied artwork is kept as source rather than published");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
