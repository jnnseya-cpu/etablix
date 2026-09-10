/**
 * The blog: one manifest, from which everything else is generated.
 *
 * The index page, each post page, the RSS feed, the sitemap, llms.txt, the
 * table of contents, the related-post blocks and every internal link are all
 * built from what is in this file. Nothing is typed twice, which is the only
 * reason a link can be trusted a year from now.
 *
 * WHY LINKS ARE RESOLVED AT BUILD TIME AND NOT IN THE BROWSER.
 * "Dynamic links" is usually taken to mean JavaScript that inserts anchors
 * after the page loads. For a marketing site that is actively harmful: a link
 * a crawler cannot see is a link that passes no authority, and an AI engine
 * summarising the page never runs the script at all. So a post body writes
 * {{link:diagnostic}} and the generator turns it into a real <a href> in the
 * shipped HTML. The link is dynamic where it matters — one registry entry
 * changes every occurrence across the whole blog — and static where it counts.
 *
 * The audit in lib/seo.js resolves every registry target against the files on
 * disk, so a link to a page that does not exist fails the build rather than
 * being discovered by a reader.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const SITE = "https://etablix.com";
export const BLOG_BASE = "/blog";

/**
 * Every internal destination the blog may point at, once.
 *
 * The `label` is the default anchor text, used when a post writes
 * {{link:slug}} without its own. A post can override it with
 * {{link:slug|its own words}} where the sentence needs different wording —
 * varied anchor text over many links reads as writing rather than as
 * optimisation, and it is what a person would actually type.
 */
export const LINKS = {
  home: { url: "/", label: "ETABLIX", file: "index.html" },
  about: { url: "/about", label: "who we are", file: "about.html" },
  offer: { url: "/what-we-offer", label: "what we offer", file: "what-we-offer.html" },
  models: { url: "/what-we-offer#models", label: "the three delivery models", file: "what-we-offer.html" },
  how: { url: "/how-it-works", label: "how an engagement runs", file: "how-it-works.html" },
  diagnostic: { url: "/how-it-works#diagnostic", label: "the Site Systems Diagnostic", file: "how-it-works.html" },
  sample: { url: "/diagnostic-sample", label: "a specimen diagnostic extract", file: "diagnostic-sample.html" },
  construx: { url: "/construx", label: "CONSTRUX", file: "construx.html" },
  veryx: { url: "/veryx", label: "VERYX", file: "veryx.html" },
  supply: { url: "/subcontractors", label: "our supply chain", file: "subcontractors.html" },
  pqq: { url: "/pqq", label: "the prequalification questionnaire", file: "pqq.html" },
  contact: { url: "/contact", label: "talk to us", file: "contact.html" },
  privacy: { url: "/policies/privacy", label: "privacy notice", file: "policies/privacy.html" },
  terms: { url: "/policies/terms", label: "terms", file: "policies/terms.html" },
  suppliercode: { url: "/policies/supplier-code", label: "supplier code of conduct", file: "policies/supplier-code.html" },
  slavery: { url: "/policies/modern-slavery", label: "modern slavery statement", file: "policies/modern-slavery.html" },
  blog: { url: "/blog", label: "the ETABLIX field notes", file: "blog.html" },
};

/**
 * External sources a post cites.
 *
 * Held here rather than inline for one reason: **a citation nobody can check
 * is worse than no citation.** Every entry names a real, stable, primary
 * source. Nothing in a post may rest on a statistic without one of these
 * behind it, and a claim we cannot source is written as our own position and
 * labelled as such.
 */
export const SOURCES = {
  cdm2015: {
    url: "https://www.legislation.gov.uk/uksi/2015/51/contents/made",
    title: "The Construction (Design and Management) Regulations 2015",
    publisher: "legislation.gov.uk",
  },
  cdmSchedule2: {
    url: "https://www.legislation.gov.uk/uksi/2015/51/schedule/2/made",
    title: "CDM 2015, Schedule 2 — Minimum welfare facilities required for construction sites",
    publisher: "legislation.gov.uk",
  },
  hseWelfare: {
    url: "https://www.hse.gov.uk/construction/healthrisks/welfare/index.htm",
    title: "Welfare on construction sites",
    publisher: "Health and Safety Executive",
  },
  hgcra: {
    url: "https://www.legislation.gov.uk/ukpga/1996/53/part/II",
    title: "Housing Grants, Construction and Regeneration Act 1996, Part II",
    publisher: "legislation.gov.uk",
  },
  hseCdmSummary: {
    url: "https://www.hse.gov.uk/construction/cdm/2015/summary.htm",
    title: "Summary of duties under the Construction (Design and Management) Regulations 2015",
    publisher: "Health and Safety Executive",
  },
  workplaceAcop: {
    url: "https://www.hse.gov.uk/pubns/books/l24.htm",
    title: "L24 — Workplace health, safety and welfare: Approved Code of Practice",
    publisher: "Health and Safety Executive",
  },
  googleGenAi: {
    url: "https://developers.google.com/search/docs/fundamentals/generative-ai-features",
    title: "Optimizing your website for generative AI features on Google Search",
    publisher: "Google Search Central",
  },
  procurementAct: {
    url: "https://www.legislation.gov.uk/ukpga/2023/54/contents",
    title: "Procurement Act 2023",
    publisher: "legislation.gov.uk",
  },
};

/**
 * Every static page in the sitemap, with the date its content last changed.
 *
 * The date is HERE and not read from the file, because git does not preserve
 * modification times: a fresh clone stamps every file with the moment it was
 * checked out, so a sitemap built from mtimes tells a crawler the whole site
 * changed today, every time anybody deploys. That is worse than no lastmod at
 * all — it trains the crawler to ignore the field.
 *
 * So it is a decision rather than a file property: the day somebody changed
 * what the page says. Update it when you change the page. The dates below are
 * each page's real last commit date at the time this list was written.
 */
export const PAGES = [
  { url: "/", lastmod: "2026-09-07", priority: 1.0, changefreq: "weekly", file: "index.html" },
  { url: "/what-we-offer", lastmod: "2026-09-10", priority: 0.9, changefreq: "monthly", file: "what-we-offer.html" },
  { url: "/how-it-works", lastmod: "2026-09-07", priority: 0.9, changefreq: "monthly", file: "how-it-works.html" },
  { url: "/about", lastmod: "2026-09-07", priority: 0.8, changefreq: "monthly", file: "about.html" },
  { url: "/diagnostic-sample", lastmod: "2026-09-07", priority: 0.8, changefreq: "monthly", file: "diagnostic-sample.html" },
  { url: "/blog", lastmod: null, priority: 0.9, changefreq: "weekly", file: "blog.html" },
  { url: "/construx", lastmod: "2026-09-07", priority: 0.7, changefreq: "monthly", file: "construx.html" },
  { url: "/veryx", lastmod: "2026-09-07", priority: 0.7, changefreq: "monthly", file: "veryx.html" },
  { url: "/subcontractors", lastmod: "2026-09-07", priority: 0.7, changefreq: "monthly", file: "subcontractors.html" },
  { url: "/contact", lastmod: "2026-09-07", priority: 0.8, changefreq: "monthly", file: "contact.html" },
  { url: "/pqq", lastmod: "2026-09-03", priority: 0.4, changefreq: "yearly", file: "pqq.html" },
  { url: "/policies/privacy", lastmod: "2026-09-09", priority: 0.3, changefreq: "yearly", file: "policies/privacy.html" },
  { url: "/policies/terms", lastmod: "2026-09-07", priority: 0.3, changefreq: "yearly", file: "policies/terms.html" },
  { url: "/policies/cookies", lastmod: "2026-09-10", priority: 0.3, changefreq: "yearly", file: "policies/cookies.html" },
  { url: "/policies/supplier-code", lastmod: "2026-09-07", priority: 0.3, changefreq: "yearly", file: "policies/supplier-code.html" },
  { url: "/policies/modern-slavery", lastmod: "2026-09-07", priority: 0.3, changefreq: "yearly", file: "policies/modern-slavery.html" },
];

/**
 * THE POSTS, read from content/blog/*.json rather than typed here.
 *
 * WHY NOT AN ARRAY IN THIS FILE. Publishing daily means adding a post most
 * days, and the tool that starts a post (backend/tools/blog-new.mjs) would
 * then have to edit this source file to do it. A program that rewrites
 * JavaScript it also imports will eventually write something that parses but
 * is wrong, and the failure lands in the one file every generated page
 * depends on. Data files cost one directory read and cannot break the module.
 *
 * So a post is two files with the same name and nothing else:
 *
 *   content/blog/<slug>.json    what it is for, who it is for, what it cites
 *   content/blog/<slug>.html    the body, using {{link:}} and {{source:}}
 *
 * and a third, shared: content/blog/schedule.json says when it went live.
 *
 * `written` is the day the draft was finished. It decides which draft is next
 * out of the door, so the buffer is a queue rather than a pile.
 *
 * VALIDATION IS LOUD AND AT LOAD TIME. A post missing a description, citing a
 * source key that does not exist, or pointing at a body file that is not
 * there stops the process with the slug and the reason. The alternative — a
 * post that renders with an empty meta description — is the kind of defect
 * that survives for months because nothing looks broken.
 */
const POST_DIR = path.join(root, "content", "blog");

const REQUIRED = ["slug", "title", "description", "standfirst", "author", "authorRole", "body", "topics", "written"];

function readPostFile(file) {
  const raw = fs.readFileSync(path.join(POST_DIR, file), "utf8");
  let post;
  try { post = JSON.parse(raw); } catch (err) { throw new Error(`content/blog/${file} is not valid JSON: ${err.message}`); }

  const slug = file.replace(/\.json$/, "");
  if (post.slug && post.slug !== slug) throw new Error(`content/blog/${file} declares slug "${post.slug}" — it must match the filename.`);

  // The defaults are applied BEFORE validation, not after: the author, their
  // role, their profile and the share image are the same on every post, so
  // requiring each file to repeat them is four chances a day to get one
  // wrong. Validating first made a scaffolded post fail for a field it was
  // never supposed to carry, which is a check reporting its own bug.
  post = {
    author: "Justin Ngolu Nseya",
    authorRole: "Founder and Managing Director, ETABLIX",
    authorUrl: "https://www.linkedin.com/in/justin-nseya-mciob-9a46b291/",
    image: "/img/og-image.png",
    faq: [],
    sources: [],
    ...post,
    slug,
  };

  for (const key of REQUIRED) {
    const v = post[key];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) {
      throw new Error(`content/blog/${file} is missing "${key}". A post without it would publish an incomplete page.`);
    }
  }
  if (!fs.existsSync(path.join(POST_DIR, post.body))) {
    throw new Error(`content/blog/${file} points at body "${post.body}", which does not exist.`);
  }
  for (const key of post.sources) {
    if (!SOURCES[key]) throw new Error(`content/blog/${file} cites source "${key}", which is not in SOURCES.`);
  }
  // The description is the line a person reads in a result list before they
  // decide. Past about 160 characters it is cut mid-sentence, so the length
  // is a defect rather than a preference. A scaffold's placeholder is exempt:
  // it is refused at publish time by a check that says so plainly.
  if (post.description.length > 165 && !post.description.includes("TODO")) {
    throw new Error(`content/blog/${file} has a ${post.description.length}-character description; it is truncated in a result list past about 160.`);
  }
  return post;
}

const CATALOGUE = fs
  .readdirSync(POST_DIR)
  .filter((f) => f.endsWith(".json") && f !== "schedule.json")
  .sort()
  .map(readPostFile)
  // Oldest draft first, so the buffer empties in the order it filled.
  .sort((a, b) => (a.written < b.written ? -1 : a.written > b.written ? 1 : a.slug < b.slug ? -1 : 1));

/**
 * WHEN each post went live, read from data rather than typed into this file.
 *
 * A post is written days before it is published — that buffer is the only
 * thing that makes a daily cadence survive a bad week — so "written" and
 * "published" have to be two different states. They are separated here:
 * an entry in content/blog/schedule.json is what makes a post live.
 *
 * The dates are in a JSON file and not in the array above for one reason:
 * backend/tools/blog-publish.mjs writes to it on every publishing day, and a
 * tool that edits its own source file is a tool that will eventually corrupt
 * one. Data is safe for a program to write. Code is not.
 *
 * A post with no entry is a DRAFT and appears NOWHERE: not in the index, the
 * sitemap, the feed, llms.txt, the related-post joins or the search-engine
 * submission. It is a file in the repository and nothing else. That is
 * deliberate — a half-finished post that leaks into a sitemap is worse than
 * no post, because the crawler records the address and then finds it changed.
 */
const SCHEDULE_FILE = path.join(root, "content", "blog", "schedule.json");

function readSchedule() {
  try {
    const raw = JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf8"));
    const out = {};
    for (const [slug, value] of Object.entries(raw)) {
      if (slug.startsWith("_") || !value || typeof value !== "object") continue;
      if (!value.published) continue;
      out[slug] = { published: value.published, updated: value.updated || value.published };
    }
    return out;
  } catch {
    // No schedule file means nothing is published, which is the safe reading:
    // it produces an empty blog rather than accidentally publishing drafts.
    return {};
  }
}

export const SCHEDULE = readSchedule();

/** Everything written, published or not, in the order it was added. */
export const CATALOGUE_POSTS = CATALOGUE.map((p) => ({ ...p, ...(SCHEDULE[p.slug] || {}) }));

/**
 * The published posts, newest first. Every generator reads this.
 *
 * A date in the future is treated as not yet published, so a schedule entry
 * can be written ahead without going live the moment it is committed.
 */
export const POSTS = CATALOGUE_POSTS
  .filter((p) => p.published && p.published <= today())
  .sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));

/** Written, not published. The buffer. */
export const DRAFTS = CATALOGUE_POSTS.filter((p) => !POSTS.includes(p));

/** Today, as the site reckons it: UTC, so a deploy at 23:50 cannot disagree. */
export function today(at = new Date()) {
  return at.toISOString().slice(0, 10);
}

/**
 * THE EDITORIAL QUEUE — one entry per post still to be written.
 *
 * WHY A QUEUE AND NOT A PROMISE OF DAILY OUTPUT. The mechanics of publishing
 * cost minutes: a body file, a manifest entry, one command. The constraint is
 * material. A business this size cannot write a post a day about nothing, and
 * a post about nothing is worse than silence, because it teaches a reader
 * that this address is not worth returning to.
 *
 * So the cadence is fed from a buffer of written posts, and the buffer is fed
 * from this queue. Every entry names the four things that make a post
 * commercial rather than decorative:
 *
 *   buyer     — the person who has to act, by their job, not by a persona
 *   query     — what they would actually type, or say out loud to a colleague
 *   objection — the reason they have NOT bought, which the post has to meet
 *   sell      — what the post is asking them to do next, in one line
 *
 * An entry with no objection is a brochure. An entry with no buyer is an
 * essay. Both get deleted from this list rather than written.
 *
 * `sourcesNeeded` is free text on purpose: it names a source that has to be
 * FOUND and added to SOURCES before the post can be written. It is never a
 * key, because a key that does not exist would fail the build — which is the
 * behaviour we want from a citation nobody has checked.
 */
const QUEUE = [
  {
    slug: "welfare-on-day-one",
    title: "Welfare on day one: what CDM 2015 actually requires before the first operative arrives",
    buyer: "Project manager mobilising a site in the next eight weeks",
    query: "what welfare facilities are required on a construction site from day one",
    objection: "We have always sorted welfare with a couple of units and a delivery date.",
    sell: "The Schedule 2 list is short, dated and auditable. Ours is a checklist you can hold a supplier to.",
    sources: ["cdm2015", "cdmSchedule2", "hseWelfare", "workplaceAcop"],
  },
  {
    slug: "six-stages-nobody-priced",
    title: "Diagnose, define, procure, mobilise, operate, remove: the six stages of a site establishment nobody priced",
    buyer: "Operations director at a main contractor",
    query: "who manages temporary site setup on a construction project",
    objection: "We do this ourselves. It is not complicated.",
    sell: "It is not complicated. It is six stages long, and it takes the attention of the people who are good at the permanent works.",
    sources: ["cdm2015", "hseCdmSummary"],
  },
  {
    slug: "removal-is-the-line-nobody-prices",
    title: "Reinstatement: the line nobody prices, and the invoice nobody expected",
    buyer: "Commercial manager closing out a project",
    query: "site reinstatement cost at end of construction project",
    objection: "Removal is a small job at the end. We will deal with it then.",
    sell: "Priced at tender it is a line. Priced at the end it is a negotiation you are on the wrong side of.",
    sources: ["cdm2015"],
    sourcesNeeded: "An Environment Agency or SEPA page on waste duty of care for site clearance.",
  },
  {
    slug: "twelve-lead-times",
    title: "The twelve lead times that decide your start date",
    buyer: "Planner or mobilisation lead",
    query: "construction site setup lead times temporary power water welfare",
    objection: "We will compress it. We always do.",
    sell: "Some of these are compressible and some are a utility company's queue. Knowing which is which is the whole job.",
    sources: ["cdm2015"],
    sourcesNeeded: "Ofgem or a DNO's published connection timescales for a temporary supply.",
  },
  {
    slug: "how-to-score-a-welfare-tender",
    title: "How to score a welfare tender so the cheapest bid does not win by accident",
    buyer: "Procurement lead running a site-services package",
    query: "evaluation criteria for site welfare and accommodation tender",
    objection: "We score price and compliance. It works.",
    sell: "A compliance gate plus a price score awards the contract to whoever read the specification least carefully.",
    sources: ["procurementAct"],
  },
  {
    slug: "why-our-tender-pack-refuses-to-issue",
    title: "Our tender pack refuses to issue itself. Here is the check that stops it",
    buyer: "Client-side commercial manager who has been priced off an incomplete pack",
    query: "why do tender packs come back with qualified prices",
    objection: "Every pack has gaps. The tenderers query them.",
    sell: "A query is a delay you paid for. A machine reconciliation before issue is a delay you did not.",
    sources: ["hgcra"],
  },
  {
    slug: "eighty-beds-and-a-hotel-booking",
    title: "Eighty beds and a hotel booking: where workforce accommodation goes wrong",
    buyer: "Site manager on a remote or linear project",
    query: "workforce accommodation for construction projects UK",
    objection: "We book hotels and pay a lodging allowance.",
    sell: "That works to about thirty people. Past that it becomes a housing operation, with a housing operation's obligations.",
    sources: [],
    sourcesNeeded: "GOV.UK guidance on HMO licensing, and the applicable housing standards.",
  },
  {
    slug: "paid-on-time-or-not-at-all",
    title: "Paid on time, or not at all: payment discipline in site-services subcontracts",
    buyer: "Subcontractor deciding whether to price our work",
    query: "construction act payment terms subcontractor 1996",
    objection: "Everyone promises 30 days. Nobody pays in 30 days.",
    sell: "The Act sets the mechanism. What matters is who applies it without being chased. Here is ours, in writing.",
    sources: ["hgcra"],
  },
  {
    slug: "procurement-act-2023-site-services",
    title: "The Procurement Act 2023 and your site-services package: what actually changed",
    buyer: "Public-sector client or a contractor bidding public work",
    query: "procurement act 2023 changes construction services",
    objection: "It is a public-sector matter. It does not touch our package.",
    sell: "It changes how the package has to be described before anybody can price it. That is your problem, upstream.",
    sources: ["procurementAct"],
  },
  {
    slug: "temporary-power-without-gambling-the-programme",
    title: "Temporary power without gambling the programme",
    buyer: "Project director on a site with no grid connection yet",
    query: "temporary power construction site generator vs grid connection",
    objection: "We will hire generators and sort the connection later.",
    sell: "Both are right answers to different questions. Which one you need depends on a date you can find out today.",
    sources: [],
    sourcesNeeded: "A DNO temporary-supply process page, and current diesel-generator emissions rules for construction plant.",
  },
  {
    slug: "the-operating-lines-that-leak",
    title: "Waste, cleaning and consumables: the operating lines that leak money for eighteen months",
    buyer: "Commercial manager on a long-duration project",
    query: "site establishment running costs construction",
    objection: "These are small numbers.",
    sell: "They are small numbers multiplied by seventy-eight weeks, and they are the ones with no owner.",
    sources: [],
    sourcesNeeded: "Environment Agency duty-of-care guidance on construction and demolition waste.",
  },
  {
    slug: "what-prime-means",
    title: "What \"prime\" means when we use it, and what it does not",
    buyer: "Client considering single-point responsibility for site services",
    query: "single point responsibility site services contractor",
    objection: "If you take single-point responsibility, are you not the principal contractor?",
    sell: "No, and the distinction is written into the appointment. Here it is in full.",
    sources: ["cdm2015", "hseCdmSummary"],
  },
  {
    slug: "the-village-is-a-system",
    title: "A site village is a system, not a shopping list",
    buyer: "Anyone who has procured welfare unit by unit",
    query: "site establishment design construction welfare layout",
    objection: "We buy the units we need. It adds up to the same thing.",
    sell: "It does not. Six correct purchases can still make one wrong establishment, and the interfaces are where it fails.",
    sources: ["workplaceAcop"],
  },
  {
    slug: "the-defect-we-shipped",
    title: "The defect we shipped: how a document splitter quietly truncated a deliverable",
    buyer: "Anybody deciding whether to trust a small supplier's system",
    query: "AI document generation errors construction",
    objection: "You are selling automation. Of course you say it works.",
    sell: "It did not work. Here is the failure, the reason it went unnoticed, and the check that now catches it.",
    sources: [],
  },
  {
    slug: "nine-questions-before-we-quote",
    title: "The nine questions we ask before we will quote",
    buyer: "Client who wants a number this week",
    query: "information needed to price site establishment",
    objection: "Just give me a ballpark.",
    sell: "A ballpark is a number you will hold us to and we will not honour. Nine answers gets you one we will.",
    sources: [],
  },
  {
    slug: "eighteen-miles-of-site",
    title: "Eighteen miles of site and no services: linear projects and the establishment problem",
    buyer: "Project manager on a linear or rural scheme",
    query: "welfare facilities linear construction project remote site",
    objection: "We move units along as we go.",
    sell: "Then your welfare travel time is a programme item, and it is usually invisible until somebody measures it.",
    sources: ["cdmSchedule2", "hseWelfare"],
  },
  {
    slug: "the-audit-that-starts-in-the-canteen",
    title: "The audit that starts in the canteen",
    buyer: "Health and safety lead facing a client or HSE visit",
    query: "HSE inspection site welfare non compliance",
    objection: "Our paperwork is in order.",
    sell: "The first three things looked at are physical, not documentary. All three are ours.",
    sources: ["hseWelfare", "workplaceAcop", "cdmSchedule2"],
  },
  {
    slug: "framework-or-project-by-project",
    title: "Framework or project by project: how to buy site services more than once",
    buyer: "Head of procurement at a contractor with a pipeline",
    query: "framework agreement site welfare services construction",
    objection: "Each project is different. A framework would not fit.",
    sell: "The projects differ. The twelve decisions do not, and that is what a framework should hold.",
    sources: ["procurementAct"],
  },
  {
    slug: "social-value-from-the-establishment",
    title: "Social value you can actually evidence, from the part of the site nobody looks at",
    buyer: "Bid manager who needs social value that survives scrutiny",
    query: "social value construction site services local labour",
    objection: "We commit to it and report it at the end.",
    sell: "The establishment is where local spend is genuinely discretionary, which makes it the easiest part to evidence and the hardest to fake.",
    sources: [],
    sourcesNeeded: "The Social Value Model (PPN) currently in force.",
  },
  {
    slug: "removed-with-evidence",
    title: "\"Removed\" with evidence: what a closeout pack has to contain",
    buyer: "Commercial manager who needs the site signed off",
    query: "site closeout handover documentation temporary works",
    objection: "We take photographs.",
    sell: "Photographs prove it looked right. A closeout pack proves it was returned, by whom, on what date, under whose duty.",
    sources: ["cdm2015"],
  },
];

/**
 * The queue, with anything already written taken out of it.
 *
 * Derived rather than maintained. A brief whose post exists is not
 * outstanding work, and requiring somebody to delete it by hand means the
 * queue is wrong for however long it takes them to remember — which on the
 * morning you publish is exactly when you are reading it.
 */
const WRITTEN = new Set(CATALOGUE.map((p) => p.slug));
export const PLAN = QUEUE.filter((b) => !WRITTEN.has(b.slug));

/** Everything ever briefed, written or not, for the record. */
export const PLAN_ALL = QUEUE;

export const postBySlug = (slug) => POSTS.find((p) => p.slug === slug) || null;
export const postUrl = (p) => `${BLOG_BASE}/${p.slug}`;
export const absolute = (path) => `${SITE}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * The two posts most worth reading next, chosen by shared topic.
 *
 * A related-post block hand-typed on every page is a block that is right on
 * the day it is written. This one is a join, so publishing a fourth post
 * updates the first three.
 */
export function relatedTo(post, limit = 3) {
  const mine = new Set(post.topics);
  return POSTS.filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, shared: p.topics.filter((t) => mine.has(t)).length }))
    .sort((a, b) => b.shared - a.shared || (a.p.published < b.p.published ? 1 : -1))
    .slice(0, limit)
    .map((x) => x.p);
}
