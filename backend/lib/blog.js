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
  { url: "/policies/cookies", lastmod: "2026-09-07", priority: 0.3, changefreq: "yearly", file: "policies/cookies.html" },
  { url: "/policies/supplier-code", lastmod: "2026-09-07", priority: 0.3, changefreq: "yearly", file: "policies/supplier-code.html" },
  { url: "/policies/modern-slavery", lastmod: "2026-09-07", priority: 0.3, changefreq: "yearly", file: "policies/modern-slavery.html" },
];

/**
 * The posts, newest first.
 *
 * `headings` is NOT a table of contents typed by hand — the generator reads
 * the real <h2> and <h3> elements out of the body and builds the contents from
 * those, so a contents list can never describe a page that has changed. What
 * lives here is what cannot be derived: what the post is for, who it is for,
 * and what it should be found by.
 */
export const POSTS = [
  {
    slug: "ai-agents-in-construction",
    title: "AI agents in construction: what they can actually do, and what they must never be allowed to do",
    // The <title> tag is a different job from the headline. It has to survive
    // truncation in a result list at about 60 characters, so it carries the
    // query rather than the rhetoric. The <h1> keeps the full headline.
    seoTitle: "AI Agents in Construction: What They Can and Cannot Do",
    // Under 160 characters, and it answers the query rather than advertising.
    description:
      "A working account of AI agents in UK construction: the eight jobs they do, the four they must never hold, and what a client is actually paying for.",
    // Shown on the card and used as the opening standfirst.
    standfirst:
      "We run thirteen AI agents inside a live construction site-services business. What they are refused matters more than what they do — and what a client pays for is neither.",
    published: "2026-09-10",
    updated: "2026-09-10",
    author: "Justin Ngolu Nseya",
    authorRole: "Founder and Managing Director, ETABLIX",
    authorUrl: "https://www.linkedin.com/in/justin-nseya-mciob-9a46b291/",
    readingBand: "long",
    body: "ai-agents-in-construction.html",
    image: "/img/og-image.png",
    // What this post is about, as entities rather than as keyword stuffing.
    // Used for the related-post join and for the AI-engine summary in
    // llms.txt, not sprayed into a meta keywords tag nobody reads.
    topics: [
      "AI agents in construction",
      "construction procurement automation",
      "tender document preparation",
      "CDM 2015",
      "site establishment",
      "human approval boundaries",
    ],
    // Questions this post answers in full, in its own words, in one place
    // each — which is what an answer engine can lift and a reader can scan.
    faq: [
      {
        q: "If AI drafts the document, what am I paying a consultant for?",
        a: "For a judgement and somebody accountable for it, which is the part no model can hold. The fee buys a named competent person who has read the output and put their name on it, an opinion you can rely on and challenge, a date we are held to, professional indemnity behind it, and an organisation that carries the consequence when it is wrong. What the agents change is how much of the work gets the same attention: the twelfth package is treated like the first rather than pattern-matched at the end of a long week. The hours saved come out of first-draft production and cross-reading, never out of the review, because the review is where the liability sits and it does not compress.",
      },
      {
        q: "Can an AI agent write a tender pack for a construction project?",
        a: "It can assemble one from an approved requirements package, and that distinction carries the whole risk. An agent that assembles takes obligations a competent person has already signed off and turns them into the separate files a tenderer receives. An agent that authors invents requirements nobody approved, which then sit in a contract. The control is that the assembler cannot start until a human has approved the document it works from, and that any gap it meets becomes an open item rather than an answer.",
      },
      {
        q: "What should an AI agent never be allowed to do on a construction project?",
        a: "Four things, on our reading. It must never award a contract, place an order or commit money. It must never accept work or close a defect. It must never hold a statutory duty — CDM 2015 duty holders are people and organisations, not software. And it must never resolve a life-safety question such as a fire strategy, means of escape or a load; those are referred to a competent person and, where relevant, to the fire and rescue authority.",
      },
      {
        q: "How do you stop an AI agent inventing requirements?",
        a: "By making the check mechanical rather than instructional. Telling a model to trace every requirement to its source is a hope. Extracting the references from the finished document and comparing the two sets by machine, on every run, before anybody can approve it, is a control. Ours refuses to issue a tender pack when a scope item has no priced line or a priced line names a scope item that does not exist.",
      },
      {
        q: "Does AI reduce the cost of construction procurement documents?",
        a: "It reduces the hours, which is not the same thing. The saving is in first-draft production and in cross-reading documents against each other, where a person reads sequentially and misses contradictions between inputs. It does not reduce the review, and the review is where the liability sits. A document issued without a competent person reading it is cheaper only until it is priced.",
      },
      {
        q: "Is AI-generated content penalised by Google?",
        a: "Not for being AI-generated. Google's own guidance on generative AI features says its AI answers are drawn from the same index and the same ranking systems as ordinary search, and rewards content that is helpful, reliable and carries a point of view the reader cannot get elsewhere. What gets penalised is commodity content, whoever or whatever wrote it.",
      },
    ],
    sources: ["cdm2015", "cdmSchedule2", "hgcra", "workplaceAcop", "googleGenAi"],
  },
];

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
