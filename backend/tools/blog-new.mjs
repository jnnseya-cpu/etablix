/**
 * Start a post. Two files, from a brief that already exists.
 *
 *   node backend/tools/blog-new.mjs welfare-on-day-one
 *   node backend/tools/blog-new.mjs --list
 *   node backend/tools/blog-new.mjs my-own-slug --title "..." --buyer "..."
 *
 * WHY A SCAFFOLDER AT ALL. Because the friction in a daily cadence is not
 * typing, it is the twenty minutes at the start deciding what the shape of
 * the piece is — and that decision was already made when the brief went into
 * PLAN in backend/lib/blog.js. This writes the brief into the top of the
 * body as a comment, so the buyer, the objection and the ask are in front of
 * whoever is writing rather than in another file.
 *
 * It writes the two files a post consists of and nothing else. It edits no
 * source file: the manifest reads the directory, so a new post is discovered
 * rather than registered.
 *
 * Every placeholder is marked TODO, and backend/tools/blog-publish.mjs
 * REFUSES to publish a post that still contains one. A scaffold that can be
 * published by accident is a scaffold that will be.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLAN, LINKS, SOURCES, today } from "../lib/blog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = path.join(root, "content", "blog");

const opt = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
};

if (process.argv.includes("--list")) {
  console.log("\n=== briefs in the queue ===\n");
  for (const b of PLAN) {
    const written = fs.existsSync(path.join(DIR, `${b.slug}.json`));
    console.log(`  ${written ? "written " : "        "} ${b.slug}`);
    console.log(`            ${b.title}`);
    console.log(`            ${b.buyer} — “${b.objection}”`);
    if (b.sourcesNeeded) console.log(`            NEEDS A SOURCE: ${b.sourcesNeeded}`);
    console.log("");
  }
  process.exit(0);
}

const slug = process.argv[2];
if (!slug || slug.startsWith("--")) {
  console.error("\n  Usage: node backend/tools/blog-new.mjs <slug>   (--list to see the queue)\n");
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(slug)) {
  console.error(`\n  "${slug}" is not a usable slug. Lower case, digits and hyphens; it becomes the URL.\n`);
  process.exit(1);
}

const brief = PLAN.find((b) => b.slug === slug) || {
  slug,
  title: opt("title", `TODO — the headline for ${slug}`),
  buyer: opt("buyer", "TODO — who has to act, by their job"),
  query: opt("query", "TODO — what they would actually type"),
  objection: opt("objection", "TODO — why they have not bought"),
  sell: opt("sell", "TODO — what this post asks them to do next"),
  sources: [],
};

const jsonPath = path.join(DIR, `${slug}.json`);
const bodyPath = path.join(DIR, `${slug}.html`);
for (const f of [jsonPath, bodyPath]) {
  if (fs.existsSync(f)) {
    console.error(`\n  ${path.relative(root, f)} already exists. Edit it, or choose another slug.\n`);
    process.exit(1);
  }
}

// The metadata. Only the fields that cannot be derived; the manifest fills in
// the author, the role, the LinkedIn URL and the share image.
const meta = {
  written: today(),
  title: brief.title,
  seoTitle: `TODO — under 60 characters, carrying “${brief.query}”`,
  description: `TODO — under 160 characters, answering “${brief.query}” rather than advertising.`,
  standfirst: "TODO — one or two sentences. The claim, not the topic.",
  body: `${slug}.html`,
  buyer: brief.buyer,
  topics: ["TODO — the subject as an entity, not a keyword", "site establishment"],
  faq: [
    { q: `TODO — ${brief.query}?`, a: "TODO — answered in full, in one place, in our own words. This is what an answer engine lifts." },
    { q: `TODO — the objection, asked out loud: “${brief.objection}”`, a: "TODO — meet it. Do not dodge it and do not agree with it politely." },
  ],
  sources: brief.sources || [],
};

fs.writeFileSync(jsonPath, `${JSON.stringify(meta, null, 2)}\n`);

// The body. The structure is the one that worked on the first post, in the
// order that worked: what it costs the reader, then the substance, then what
// we are NOT claiming, then the ask.
const links = Object.keys(LINKS).join(", ");
const sources = Object.keys(SOURCES).join(", ");

const body = `<!--
  ${brief.title}

  WHO THIS IS FOR   ${brief.buyer}
  WHAT THEY TYPE    ${brief.query}
  WHY THEY HAVE NOT BOUGHT
                    "${brief.objection}"
  WHAT WE ASK NEXT  ${brief.sell || "TODO"}
  ${brief.sourcesNeeded ? `FIND FIRST        ${brief.sourcesNeeded}` : ""}

  THE FOUR RULES, WHICH ARE NOT NEGOTIABLE AND ARE PUBLISHED ON /blog:
    · no invented statistics — every figure is evidenced from our own system
      or carries a link to a primary source the reader can check
    · primary sources only — legislation.gov.uk and the HSE, never somebody
      else's summary of the law
    · no client, site or supplier is identifiable, and no example comes from
      a live engagement
    · we publish what did not work

  WRITE IT COMMERCIALLY. Punchy is not loud. It is: a claim in the first two
  sentences, a cost the reader recognises, a specific mechanism, and one thing
  to do next. Every section should survive the question "so what, to whom".

  Internal links:  {{link:key}} or {{link:key|its own words}}
    ${links}
  Citations:       {{source:key}} or {{source:key|its own words}}
    ${sources}

  Delete this comment before publishing. Anything still marked TODO will be
  refused by blog-publish.mjs.
-->

<p>TODO — the first two sentences carry the whole claim. Not the topic, the
claim. A reader who stops here should still know what we are asserting and
whether it applies to them.</p>

<h2>What this costs you now</h2>
<p>TODO — the cost the reader already carries and has not priced. Specific,
recognisable, and not a threat. This is the section that decides whether they
read the rest.</p>

<h2>TODO — the substance</h2>
<p>TODO — the mechanism, the requirement or the sequence, in enough detail
that somebody could act on it without us. That is the point: the piece has to
be useful even to a reader who never becomes a client, because that is the
only kind of writing anybody links to.</p>

<h2>TODO — the second substantive section</h2>
<p>TODO.</p>

<h2>A worked example</h2>
<p>TODO — invented, and said to be invented. No client, site or supplier is
identifiable, and no example is drawn from a live engagement.</p>

<h2>What this does not solve</h2>
<p>TODO — the honest limitation, stated before a reader finds it. This
section is why the rest is believed.</p>

<h2>Where this leaves you</h2>
<p>TODO — one thing to do next, and it can be done without buying anything
from us. ${brief.sell || ""} ${"{{link:contact|Put it to us directly}}"} if it
is easier than working it out from here.</p>
`;

fs.writeFileSync(bodyPath, body);

console.log(`\n=== ${slug} ===\n`);
console.log(`  content/blog/${slug}.json   the metadata`);
console.log(`  content/blog/${slug}.html   the body, with the brief at the top`);
console.log("");
console.log(`  ${brief.title}`);
console.log(`  For: ${brief.buyer}`);
console.log(`  Against: “${brief.objection}”`);
if (brief.sourcesNeeded) console.log(`\n  FIND THIS SOURCE FIRST: ${brief.sourcesNeeded}`);
console.log("");
console.log("  When it is written:");
console.log(`    node backend/tools/build-blog.mjs        # see it, still unpublished`);
console.log(`    node backend/tools/blog-publish.mjs --slug ${slug} --push`);
console.log("");
