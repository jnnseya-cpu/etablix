/**
 * Build the blog, the feed, the sitemap and the AI-engine index.
 *
 *   node backend/tools/build-blog.mjs
 *
 * Everything it writes is committed to the repository as ordinary static
 * HTML. There is no build step on the server and no rendering in the browser:
 * a crawler, an answer engine and a person with JavaScript disabled all get
 * the same complete document, which is the only version of "optimised" that
 * survives contact with a real index.
 *
 * What it generates, from backend/lib/blog.js and content/blog/*.html:
 *
 *   frontend/public/blog.html            the index
 *   frontend/public/blog/<slug>.html     one page per post
 *   frontend/public/blog/feed.xml        RSS 2.0, with full content
 *   frontend/public/sitemap.xml          every page, with lastmod
 *   frontend/public/llms.txt             a plain-text map for answer engines
 *
 * Re-run it after changing a post or the manifest. backend/test/seo.test.mjs
 * regenerates into memory and compares, so a hand-edit to a generated page
 * fails the suite rather than drifting quietly until somebody notices the
 * contents list describes a page that has changed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, BLOG_BASE, LINKS, SOURCES, PAGES, POSTS, postUrl, relatedTo } from "../lib/blog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUB = path.join(root, "frontend", "public");
const SRC = path.join(root, "content", "blog");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const abs = (p) => `${SITE}${p.startsWith("/") ? p : `/${p}`}`;
const human = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// ------------------------------------------------------------------ shortcodes

/**
 * {{link:key}} and {{link:key|its own words}} → a real anchor.
 * {{source:key}} and {{source:key|its own words}} → a cited external link.
 *
 * An unknown key throws. A broken internal link discovered by a reader is a
 * broken link; discovered here it is a typo, and the difference is one run of
 * this script.
 */
export function resolveShortcodes(html, { onLink } = {}) {
  return String(html).replace(/\{\{(link|source):([a-zA-Z0-9_-]+)(?:\|([^}]*))?\}\}/g, (_m, kind, key, text) => {
    if (kind === "link") {
      const target = LINKS[key];
      if (!target) throw new Error(`Unknown internal link key "${key}" — add it to LINKS in backend/lib/blog.js.`);
      onLink?.({ kind, key, target });
      return `<a href="${target.url}">${esc(text || target.label)}</a>`;
    }
    const src = SOURCES[key];
    if (!src) throw new Error(`Unknown source key "${key}" — add it to SOURCES in backend/lib/blog.js.`);
    onLink?.({ kind, key, target: src });
    // An outbound citation opens in a new tab and says where it goes. It is
    // NOT nofollow: citing a primary source and then refusing to pass any
    // signal to it is the behaviour the whole convention was invented to stop.
    return `<a href="${src.url}" target="_blank" rel="noopener" title="${esc(src.title)} — ${esc(src.publisher)}">${esc(text || src.title)}</a>`;
  });
}

// ------------------------------------------------------------------ the body

const slugify = (s) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/**
 * Read the real headings out of the finished body and build the contents from
 * those, adding an id to any that lacks one.
 *
 * A contents list typed by hand is right on the day it is written. This one
 * cannot describe a section that is not there, and every entry is an anchor a
 * reader — and an answer engine looking for the part that answers a question —
 * can jump straight to.
 */
function headingsAndAnchors(html) {
  const toc = [];
  const out = html.replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g, (_m, lvl, attrs = "", inner) => {
    const existing = /id="([^"]+)"/.exec(attrs || "");
    const id = existing ? existing[1] : slugify(inner);
    toc.push({ level: Number(lvl), id, text: inner.replace(/<[^>]+>/g, "").trim() });
    const rest = (attrs || "").replace(/\s*id="[^"]*"/, "");
    return `<h${lvl} id="${id}"${rest}>${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

const words = (html) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
const minutes = (n) => Math.max(1, Math.round(n / 220));

// ------------------------------------------------------------------ chrome

const HEADER = `
<div class="topline"><b>ETABLIX</b> · INTEGRATED SITE SERVICES · PART OF <b>GROUPE NSEYA</b></div>
<header class="site-header">
  <div class="container nav-wrap">
    <a class="logo" href="/"><img class="logo-mark" src="/img/logo-mark-reverse.svg" alt="ETABLIX"><span class="logo-text">ETABLIX<small>Integrated Site Services</small></span></a>
    <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <nav class="main-nav">
      <a href="/about">About</a>
      <a href="/what-we-offer">What we offer</a>
      <a href="/how-it-works">How it works</a>
      <a href="/construx">Construx</a>
      <a href="/veryx">Veryx</a>
      <a class="nav-cta" href="/contact">Book services</a>
    </nav>
  </div>
</header>`;

const FOOTER = `
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-about">
        <a class="logo" href="/"><img class="logo-mark" src="/img/logo-mark-reverse.svg" alt="ETABLIX"><span class="logo-text">ETABLIX<small>Integrated Site Services</small></span></a>
        <p>ETABLIX — Integrated Site Services, part of Groupe Nseya. We plan, procure, integrate and control every critical temporary-site and workforce-accommodation service — from first mobilisation to final reinstatement.</p>
        <p style="font-size:0.88rem;">Groupe Nseya House, Kingstanding, Birmingham B44 8DJ<br>
        <a href="mailto:contact@etablix.com">contact@etablix.com</a> · <a href="tel:+447493216101">+44 7493 216101</a></p>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="/about">About us</a></li>
          <li><a href="/what-we-offer">What we offer</a></li>
          <li><a href="/how-it-works">How it works</a></li>
          <li><a href="/blog">Field notes</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="https://www.linkedin.com/company/etablix" target="_blank" rel="noopener">Follow on LinkedIn</a></li>
        </ul>
      </div>
      <div>
        <h4>Governance</h4>
        <ul>
          <li><a href="/policies/privacy">Privacy</a></li>
          <li><a href="/policies/terms">Website terms</a></li>
          <li><a href="/policies/cookies">Cookies</a></li>
        </ul>
      </div>
      <div>
        <h4>Responsible delivery</h4>
        <ul>
          <li><a href="/policies/supplier-code">Supplier code</a></li>
          <li><a href="/policies/modern-slavery">Modern slavery</a></li>
          <li><a href="/subcontractors#register">Supplier registration</a></li>
          <li><a href="/diagnostic-sample">Specimen deliverable</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 ETABLIX — Integrated Site Services, part of Groupe Nseya.<br>
      <span style="font-size:0.78rem;opacity:0.8;">ETABLIX is a trading name of JNN GLOBAL LTD · Registered in England &amp; Wales · Company No. 15405437 · Registered office: Groupe Nseya House, Kingstanding, Birmingham B44 8DJ, United Kingdom</span></span>
      <span>One site. One village. One accountable system.</span>
    </div>
  </div>
</footer>

<script src="/js/main.js" type="module"></script>
</body>
</html>`;

/**
 * The trading entity as a place of business, with the address exactly as it
 * will be claimed on the business listing.
 *
 * The same node on every page, byte for byte. A local listing is matched
 * against citations of the name, address and phone, and two spellings of one
 * address compete with each other rather than reinforcing.
 */
const BUSINESS = `{"@type":"ProfessionalService","@id":"https://etablix.com/#business","name":"ETABLIX — Integrated Site Services","url":"https://etablix.com/","image":"https://etablix.com/img/og-image.png","telephone":"+44 7493 216101","email":"contact@etablix.com","parentOrganization":{"@id":"https://etablix.com/#org"},"address":{"@type":"PostalAddress","streetAddress":"Groupe Nseya House, Kingstanding","addressLocality":"Birmingham","addressRegion":"West Midlands","postalCode":"B44 8DJ","addressCountry":"GB"},"openingHoursSpecification":{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"08:00","closes":"18:00"},"areaServed":{"@type":"Country","name":"United Kingdom"},"knowsAbout":["Integrated site services","Workforce accommodation","Site establishment","Managed procurement","Temporary site utilities","Tender document preparation","CDM 2015"],"sameAs":["https://www.linkedin.com/company/etablix"]}`;

const ORG = `{"@type":"Organization","@id":"${SITE}/#org","name":"ETABLIX","legalName":"JNN GLOBAL LTD","identifier":{"@type":"PropertyValue","propertyID":"UK Companies House","value":"15405437"},"url":"${SITE}/","logo":"${SITE}/img/logo-mark.svg","description":"Integrated site-services and workforce-accommodation contractor for the temporary site environment around the permanent works. Not a main contractor. Part of Groupe Nseya.","parentOrganization":{"@type":"Organization","name":"Groupe Nseya"},"sameAs":["https://www.linkedin.com/company/etablix"]}`;

/**
 * The document head, complete, for any page this generator writes.
 *
 * Every field here earns its place: the canonical stops the same post being
 * indexed at two addresses, the Open Graph block is what LinkedIn renders when
 * the post is shared, and the JSON-LD is how a machine learns that this is an
 * article, by a named person, about a stated subject, on a dated day.
 */
const head = ({ title, description, url, image, jsonld, extra = "" }) => `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
${extra}<meta property="og:site_name" content="ETABLIX">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="en_GB">
<meta property="og:image" content="${esc(abs(image))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ETABLIX — Integrated Site Services">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(abs(image))}">
<link rel="alternate" type="application/rss+xml" title="ETABLIX field notes" href="${SITE}${BLOG_BASE}/feed.xml">
<script type="application/ld+json">
${jsonld}
</script>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/img/icon-180.png">
<meta name="theme-color" content="#191a1c">
<meta name="apple-mobile-web-app-title" content="ETABLIX">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
${HEADER}`;

// ------------------------------------------------------------------ one post

function renderPost(post) {
  const raw = fs.readFileSync(path.join(SRC, post.body), "utf8");
  const outbound = [];
  const resolved = resolveShortcodes(raw, { onLink: (l) => outbound.push(l) });
  const { html: bodyHtml, toc } = headingsAndAnchors(resolved);
  const wordCount = words(bodyHtml);
  const mins = minutes(wordCount);
  const url = abs(postUrl(post));
  const related = relatedTo(post);

  const contents = toc.length
    ? `<nav class="post-toc" aria-label="Contents">
    <h2 class="toc-head">On this page</h2>
    <ol>${toc.map((h) => `<li class="lvl-${h.level}"><a href="#${h.id}">${esc(h.text)}</a></li>`).join("")}</ol>
  </nav>`
    : "";

  const faq = post.faq?.length
    ? `<section class="post-faq" id="questions">
    <h2>Questions people ask</h2>
    ${post.faq.map((f) => `<details class="faq-item" open><summary><h3>${esc(f.q)}</h3></summary><p>${esc(f.a)}</p></details>`).join("\n    ")}
  </section>`
    : "";

  const sources = post.sources?.length
    ? `<section class="post-sources" id="sources">
    <h2>Sources</h2>
    <p class="muted-note">Primary sources only. Where this piece states a position rather than a fact, it says so on the line.</p>
    <ol>${post.sources
        .map((k) => {
          const s = SOURCES[k];
          if (!s) throw new Error(`Post "${post.slug}" cites unknown source "${k}".`);
          return `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a> — ${esc(s.publisher)}</li>`;
        })
        .join("")}</ol>
  </section>`
    : "";

  // Every one of these is a real anchor in the shipped HTML, generated from
  // the manifest rather than typed into the post. Publishing another post
  // rewrites them across every page that already exists.
  const readNext = related.length
    ? `<section class="post-related">
    <h2>Read next</h2>
    <div class="related-grid">${related
        .map((p) => `<a class="related-card" href="${postUrl(p)}"><span class="related-date">${human(p.published)}</span><span class="related-title">${esc(p.title)}</span><span class="related-desc">${esc(p.standfirst)}</span></a>`)
        .join("")}</div>
  </section>`
    : "";

  const share = `<div class="post-share">
    <span>Share</span>
    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener">LinkedIn</a>
    <a href="mailto:?subject=${encodeURIComponent(post.title)}&amp;body=${encodeURIComponent(`${post.standfirst}\n\n${url}`)}">Email</a>
    <a href="${SITE}${BLOG_BASE}/feed.xml">RSS</a>
  </div>`;

  // The topic list is a set of real internal destinations, not a tag cloud.
  const explore = `<section class="post-explore">
    <h2>Where this connects to the work</h2>
    <ul>
      <li><a href="${LINKS.diagnostic.url}">The engagement these agents produce</a> — nine questions in, twelve deliverables out, ten working days.</li>
      <li><a href="${LINKS.sample.url}">A specimen of the actual deliverable</a> — the level of detail, not a description of it.</li>
      <li><a href="${LINKS.models.url}">The three delivery models</a> — advisory, integrator and prime, and which one fits.</li>
      <li><a href="${LINKS.how.url}">How an engagement runs</a> — from first enquiry to an issued, numbered document.</li>
      <li><a href="${LINKS.supply.url}">Working with us as a supplier</a> — prequalification, standards and payment discipline.</li>
      <li><a href="${LINKS.contact.url}">Put the eight questions to us</a> — we would rather be asked them than not.</li>
    </ul>
  </section>`;

  const jsonld = `{"@context":"https://schema.org","@graph":[
 ${ORG},
 ${BUSINESS},
 {"@type":"WebSite","@id":"${SITE}/#website","url":"${SITE}/","name":"ETABLIX","publisher":{"@id":"${SITE}/#org"},"inLanguage":"en-GB"},
 {"@type":"Blog","@id":"${SITE}${BLOG_BASE}#blog","url":"${SITE}${BLOG_BASE}","name":"ETABLIX field notes","publisher":{"@id":"${SITE}/#org"}},
 {"@type":"BreadcrumbList","itemListElement":[
  {"@type":"ListItem","position":1,"name":"Home","item":"${SITE}/"},
  {"@type":"ListItem","position":2,"name":"Field notes","item":"${SITE}${BLOG_BASE}"},
  {"@type":"ListItem","position":3,"name":${JSON.stringify(post.title)},"item":"${url}"}]},
 {"@type":"BlogPosting","@id":"${url}#article","isPartOf":{"@id":"${SITE}${BLOG_BASE}#blog"},"mainEntityOfPage":"${url}","headline":${JSON.stringify(post.title)},"description":${JSON.stringify(post.description)},"image":{"@type":"ImageObject","url":"${abs(post.image)}","width":1200,"height":630},"datePublished":"${post.published}","dateModified":"${post.updated}","wordCount":${wordCount},"timeRequired":"PT${mins}M","inLanguage":"en-GB","articleSection":${JSON.stringify(post.topics[0])},"keywords":${JSON.stringify(post.topics.join(", "))},"about":[${post.topics.map((t) => `{"@type":"Thing","name":${JSON.stringify(t)}}`).join(",")}],"author":{"@type":"Person","name":${JSON.stringify(post.author)},"jobTitle":${JSON.stringify(post.authorRole)},"url":${JSON.stringify(post.authorUrl)},"worksFor":{"@id":"${SITE}/#org"}},"publisher":{"@id":"${SITE}/#org"},"citation":[${(post.sources || []).map((k) => `{"@type":"CreativeWork","name":${JSON.stringify(SOURCES[k].title)},"url":${JSON.stringify(SOURCES[k].url)}}`).join(",")}]},
 {"@type":"FAQPage","@id":"${url}#faq","mainEntity":[${(post.faq || []).map((f) => `{"@type":"Question","name":${JSON.stringify(f.q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(f.a)}}}`).join(",")}]}
]}`;

  const page =
    head({
      title: `${post.seoTitle || post.title} | ETABLIX`,
      description: post.description,
      url,
      image: post.image,
      jsonld,
      extra:
        `<meta property="og:type" content="article">\n` +
        `<meta property="article:published_time" content="${post.published}">\n` +
        `<meta property="article:modified_time" content="${post.updated}">\n` +
        `<meta property="article:author" content="${esc(post.author)}">\n` +
        `<meta property="article:section" content="${esc(post.topics[0])}">\n` +
        (post.topics.map((t) => `<meta property="article:tag" content="${esc(t)}">`).join("\n") + "\n") +
        `<meta name="author" content="${esc(post.author)}">\n`,
    }) +
    `
<article class="post" itemscope itemtype="https://schema.org/BlogPosting">
<section class="page-hero">
  <div class="container">
    <div class="breadcrumb"><a href="/">Home</a> / <a href="${BLOG_BASE}">Field notes</a> / ${esc(post.topics[0])}</div>
    <h1 itemprop="headline">${esc(post.title)}</h1>
    <p class="lead" itemprop="description">${esc(post.standfirst)}</p>
    <p class="post-meta">
      By <a href="${post.authorUrl}" target="_blank" rel="noopener author">${esc(post.author)}</a>, ${esc(post.authorRole)} ·
      <time datetime="${post.published}" itemprop="datePublished">${human(post.published)}</time> ·
      ${mins} minute read · ${wordCount.toLocaleString("en-GB")} words
    </p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="policy-body post-body">
      ${contents}
      ${bodyHtml}
      ${faq}
      ${explore}
      ${sources}
      <div class="author-card">
        <h2>About the author</h2>
        <p><b>${esc(post.author)}</b> — ${esc(post.authorRole)}. ETABLIX is one accountable partner for the temporary site environment and workforce accommodation around the permanent works. It is not a main contractor: it does not build, design or commission the permanent asset. <a href="${LINKS.about.url}">More about the business</a>, or <a href="${post.authorUrl}" target="_blank" rel="noopener">connect on LinkedIn</a>.</p>
      </div>
      ${share}
      ${readNext}
    </div>
  </div>
</section>
</article>

<section class="cta-band">
  <div class="container">
    <h2>Ask us the eight questions.</h2>
    <p>We would rather be asked what our system refuses than what it can do. Start with a ${LINKS.diagnostic.label}, or just put the questions to us directly.</p>
    <a class="btn btn-primary btn-arrow" href="${LINKS.contact.url}">Discuss your requirement</a>
  </div>
</section>
${FOOTER}
`;
  return { page, wordCount, mins, toc, outbound, bodyHtml, url };
}

// ------------------------------------------------------------------ the index

function renderIndex(built) {
  const url = abs(BLOG_BASE);
  const description =
    "Field notes from a working construction site-services business: what we build, what it refuses to do, and what we got wrong. Written by the people doing it.";
  const jsonld = `{"@context":"https://schema.org","@graph":[
 ${ORG},
 ${BUSINESS},
 {"@type":"Blog","@id":"${SITE}${BLOG_BASE}#blog","url":"${url}","name":"ETABLIX field notes","description":${JSON.stringify(description)},"inLanguage":"en-GB","publisher":{"@id":"${SITE}/#org"},"blogPost":[${POSTS.map((p) => `{"@type":"BlogPosting","headline":${JSON.stringify(p.title)},"url":"${abs(postUrl(p))}","datePublished":"${p.published}","author":{"@type":"Person","name":${JSON.stringify(p.author)}}}`).join(",")}]},
 {"@type":"BreadcrumbList","itemListElement":[
  {"@type":"ListItem","position":1,"name":"Home","item":"${SITE}/"},
  {"@type":"ListItem","position":2,"name":"Field notes","item":"${url}"}]}
]}`;

  const cards = POSTS.map((p) => {
    const b = built.get(p.slug);
    return `<a class="post-card" href="${postUrl(p)}">
        <span class="post-card-topic">${esc(p.topics[0])}</span>
        <h2>${esc(p.title)}</h2>
        <p>${esc(p.standfirst)}</p>
        <span class="post-card-meta"><time datetime="${p.published}">${human(p.published)}</time> · ${b.mins} minute read</span>
      </a>`;
  }).join("\n      ");

  return (
    head({
      title: "Field Notes — AI, Procurement and Site Services | ETABLIX",
      description,
      url,
      image: "/img/og-image.png",
      jsonld,
      extra: `<meta property="og:type" content="website">\n`,
    }) +
    `
<section class="page-hero">
  <div class="container">
    <div class="breadcrumb"><a href="/">Home</a> / Field notes</div>
    <h1>Field notes from the <em style="font-style:normal;color:var(--orange)">work itself.</em></h1>
    <p class="lead">${esc(description)}</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="post-list">
      ${cards}
    </div>
    <p class="muted-note" style="margin-top:32px;">Subscribe by <a href="${BLOG_BASE}/feed.xml">RSS</a>, or follow <a href="https://www.linkedin.com/company/etablix" target="_blank" rel="noopener">ETABLIX on LinkedIn</a>.</p>
  </div>
</section>

<section class="section" style="background:var(--white);">
  <div class="container">
    <div class="policy-body">
      <h2 id="standard">What these are, and the standard they hold to</h2>
      <p>Construction publishing has a genre problem. Most of it is written to be found rather than to be read, by people who are not doing the work, about things that cannot be checked. We are a small business and we cannot compete on volume, so we are competing on the opposite thing: writing only about what we have actually built, operated or got wrong.</p>
      <p>Four rules, and they are the reason these take a while to write.</p>
      <ul>
        <li><strong>No invented statistics.</strong> Every figure is either something we can evidence from our own system, or it carries a link to a primary source you can check. Where we are stating a position rather than a fact, the sentence says so.</li>
        <li><strong>Primary sources only.</strong> When a piece cites law, it links to <a href="https://www.legislation.gov.uk/" target="_blank" rel="noopener">legislation.gov.uk</a> or to the <a href="https://www.hse.gov.uk/" target="_blank" rel="noopener">Health and Safety Executive</a>, not to somebody else's summary of it. Second-hand law is how the wrong instrument ends up cited in a tender document.</li>
        <li><strong>No client is identifiable.</strong> Construction is small. A project is identifiable from its constraints alone, so nothing here names a client, a site or a supplier, and no example is drawn from a live engagement.</li>
        <li><strong>We publish what did not work.</strong> A defect we found in our own system is more useful to a reader than a feature, and it is the only kind of writing that earns any trust at all.</li>
      </ul>
      <h2 id="who">Who writes them</h2>
      <p>These are written by the people running the engagements, not by an agency. ETABLIX is one accountable partner for the temporary site environment and workforce accommodation around the permanent works. It is <strong>not a main contractor</strong>: it does not build, design or commission the permanent asset. If something here is relevant to a project you are mobilising, <a href="${LINKS.contact.url}">we would rather talk about that project</a> than about us.</p>
      <p>Start with <a href="${LINKS.offer.url}">what we actually sell</a>, <a href="${LINKS.how.url}">how an engagement runs</a>, or <a href="${LINKS.sample.url}">a specimen of the deliverable itself</a>.</p>
    </div>
  </div>
</section>

<section class="cta-band">
  <div class="container">
    <h2>One site. One village. One accountable system.</h2>
    <p>If something here is relevant to a project you are mobilising, we would rather talk about that project than about us.</p>
    <a class="btn btn-primary btn-arrow" href="${LINKS.contact.url}">Discuss your requirement</a>
  </div>
</section>
${FOOTER}
`
  );
}

// ------------------------------------------------------- feed, sitemap, llms

const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, "]]&gt;")}]]>`;
const rfc822 = (iso) => new Date(`${iso}T09:00:00Z`).toUTCString();

function renderFeed(built) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>ETABLIX field notes</title>
  <link>${abs(BLOG_BASE)}</link>
  <atom:link href="${abs(`${BLOG_BASE}/feed.xml`)}" rel="self" type="application/rss+xml"/>
  <description>Field notes from a working construction site-services business: what we build, what it refuses to do, and what we got wrong.</description>
  <language>en-gb</language>
  <copyright>© 2026 ETABLIX, a trading name of JNN GLOBAL LTD</copyright>
  <lastBuildDate>${rfc822(POSTS[0].updated)}</lastBuildDate>
${POSTS.map((p) => {
  const b = built.get(p.slug);
  return `  <item>
    <title>${cdata(p.title)}</title>
    <link>${b.url}</link>
    <guid isPermaLink="true">${b.url}</guid>
    <pubDate>${rfc822(p.published)}</pubDate>
    <dc:creator>${cdata(p.author)}</dc:creator>
    <description>${cdata(p.standfirst)}</description>
${p.topics.map((t) => `    <category>${cdata(t)}</category>`).join("\n")}
    <content:encoded>${cdata(b.bodyHtml)}</content:encoded>
  </item>`;
}).join("\n")}
</channel>
</rss>
`;
}

/**
 * Every page, with the date it last changed.
 *
 * `lastmod` is the field that matters and the old sitemap had none, so a
 * crawler had no way of knowing anything had changed except by fetching
 * everything. Every date comes from the manifest — see the note on PAGES for
 * why it must not come from the file's own modification time.
 */
function renderSitemap() {
  // The blog index changes when a post is published, so its lastmod is the
  // newest post's date rather than a date somebody has to remember to edit.
  const newest = POSTS.reduce((d, p) => (p.updated > d ? p.updated : d), POSTS[0]?.updated || null);
  // A page that says noindex is never advertised here. Telling a crawler to
  // come and then telling it not to index is a contradiction it resolves by
  // trusting the sitemap less. The rule is read off the page rather than kept
  // as a list, so withdrawing a page from search needs no second edit.
  const withdrawn = (file) => {
    try {
      return /<meta[^>]+name="robots"[^>]*content="[^"]*noindex/i.test(fs.readFileSync(path.join(PUB, file), "utf8"));
    } catch { return false; }
  };
  const rows = [
    ...PAGES.filter((p) => !withdrawn(p.file)).map((p) => ({ loc: abs(p.url), lastmod: p.url === BLOG_BASE ? newest : p.lastmod, pri: p.priority, freq: p.changefreq })),
    ...POSTS.map((p) => ({ loc: abs(postUrl(p)), lastmod: p.updated, pri: 0.8, freq: "monthly" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows
  .map((r) => `  <url><loc>${r.loc}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ""}<changefreq>${r.freq}</changefreq><priority>${r.pri.toFixed(1)}</priority></url>`)
  .join("\n")}
</urlset>
`;
}

/**
 * llms.txt — a plain-text map of the site for answer engines.
 *
 * It is a convention rather than a standard and no engine is obliged to read
 * it. It costs one file. What it does that a sitemap cannot is say, in prose,
 * what this business is and is NOT — and the "is not" is the valuable half,
 * because the single most damaging thing an answer engine can do to us is
 * describe ETABLIX as a main contractor or as holding a CDM duty it does not
 * hold.
 */
function renderLlms(built) {
  return `# ETABLIX — Integrated Site Services

> ETABLIX plans, procures, integrates and controls the temporary site environment and workforce accommodation around the permanent works, from first mobilisation to final reinstatement. It is a trading name of JNN GLOBAL LTD (UK company 15405437), part of Groupe Nseya, based in Birmingham and operating across the United Kingdom.

## What ETABLIX is not

ETABLIX is NOT a main contractor. It does not build, design or commission the permanent asset and does not compete with the contractor who does. Under its Model 03 the term is "Prime Service Contractor", which means prime for the site-services system only; it is never "Principal Service Contractor" and never a CDM 2015 Principal Contractor unless a specific, priced, insured appointment says so. Please do not describe it as any of those things.

## What it sells

- Model 01 Advisory — strategy, technical requirements, procurement documents and evaluation, for a fixed professional fee. Every supplier contract stays with the client.
- Model 02 Management Integrator — the client contracts, ETABLIX controls the system across the supply chain.
- Model 03 Prime Service Contractor — ETABLIX takes single-point responsibility for the site-services system only.

## Pages

- [What we offer](${abs("/what-we-offer")}): the three delivery models and the defined output of each product.
- [How it works](${abs("/how-it-works")}): how an engagement runs, from first enquiry to an issued, numbered document.
- [Specimen deliverable](${abs("/diagnostic-sample")}): a real worked extract showing the level of detail, not a description of it.
- [About](${abs("/about")}): the business, its founder and its operating principles.
- [Supply chain](${abs("/subcontractors")}): prequalification, standards and payment discipline for suppliers.
- [Contact](${abs("/contact")}): how to start a conversation.

## Field notes

${POSTS.map((p) => {
  const b = built.get(p.slug);
  return `- [${p.title}](${b.url}) — ${p.description} Published ${p.published}, ${b.wordCount} words, by ${p.author}, ${p.authorRole}.
${(p.faq || []).map((f) => `  - Q: ${f.q}\n    A: ${f.a}`).join("\n")}`;
}).join("\n")}

## Feeds

- RSS: ${abs(`${BLOG_BASE}/feed.xml`)}
- Sitemap: ${abs("/sitemap.xml")}

## Contact

contact@etablix.com · +44 7493 216101 · Groupe Nseya House, Kingstanding, Birmingham B44 8DJ, United Kingdom
`;
}

// ------------------------------------------------------------------- build it

/** Build everything into memory. The test compares this against what is on disk. */
export function build() {
  const built = new Map();
  for (const post of POSTS) built.set(post.slug, renderPost(post));
  const files = new Map();
  for (const post of POSTS) files.set(`blog/${post.slug}.html`, built.get(post.slug).page);
  files.set("blog.html", renderIndex(built));
  files.set("blog/feed.xml", renderFeed(built));
  files.set("sitemap.xml", renderSitemap());
  files.set("llms.txt", renderLlms(built));
  return { files, built };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { files, built } = build();
  fs.mkdirSync(path.join(PUB, "blog"), { recursive: true });
  for (const [rel, body] of files) {
    fs.writeFileSync(path.join(PUB, rel), body);
    console.log(`  wrote  frontend/public/${rel}  (${(body.length / 1024).toFixed(1)} kB)`);
  }
  for (const [slug, b] of built) {
    console.log(`  ${slug}: ${b.wordCount} words, ${b.mins} min, ${b.toc.length} headings, ${b.outbound.length} generated links`);
  }
}
