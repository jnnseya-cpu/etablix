/**
 * The SEO audit — a rubric that lives in the repository and runs in the suite.
 *
 * WHY THIS EXISTS RATHER THAN A SCORE FROM A TOOL.
 * "90 out of 100" from an online checker is a number nobody can reproduce, on
 * a rubric nobody can read, from a vendor with an interest in the answer. This
 * file is the rubric. Every check states what it inspects and what it is worth,
 * the total is 100, and anybody can run it and get the same number.
 *
 * WHAT IT DOES NOT CLAIM.
 * A score here is not a ranking and cannot be. Rankings are decided by systems
 * we do not control, against competitors we cannot see, on signals — links
 * from other sites, brand searches, how long a reader stays — that no
 * on-page audit can measure. What this proves is that nothing on our side is
 * broken or missing. That is the half we own, and it is the half that is
 * usually wrong.
 *
 * The strongest check here is not a meta tag. It is that EVERY internal link
 * resolves to a file that exists and, where it carries a fragment, to an
 * element that exists inside it. A broken internal link is the one SEO defect
 * that is both certain to hurt and certain to go unnoticed.
 */
import fs from "node:fs";
import path from "node:path";

// --------------------------------------------------------------- tiny parsers
// Regex rather than a DOM library: this runs against our own generated markup,
// the shapes it looks for are the ones the generator emits, and adding a
// parser dependency to check our own output would be the tail wagging the dog.

const attr = (tag, name) => {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  return m ? m[1] : null;
};
const meta = (html, name) => {
  const m = new RegExp(`<meta[^>]+name\\s*=\\s*"${name}"[^>]*>`, "i").exec(html);
  return m ? attr(m[0], "content") : null;
};
const prop = (html, property) => {
  const m = new RegExp(`<meta[^>]+property\\s*=\\s*"${property}"[^>]*>`, "i").exec(html);
  return m ? attr(m[0], "content") : null;
};
const linkRel = (html, rel) => {
  const m = new RegExp(`<link[^>]+rel\\s*=\\s*"${rel}"[^>]*>`, "i").exec(html);
  return m ? attr(m[0], "href") : null;
};
const titleOf = (html) => {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].trim() : null;
};
const headings = (html) =>
  [...html.matchAll(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi)].map((m) => ({
    level: Number(m[1]),
    id: attr(m[2] || "", "id"),
    text: m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  }));
const anchors = (html) =>
  [...html.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: attr(m[1], "href"),
    rel: attr(m[1], "rel") || "",
    target: attr(m[1], "target") || "",
    text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  }));
const images = (html) => [...html.matchAll(/<img\s([^>]*)>/gi)].map((m) => ({ src: attr(m[1], "src"), alt: attr(m[1], "alt") }));
const ids = (html) => new Set([...html.matchAll(/\sid\s*=\s*"([^"]+)"/gi)].map((m) => m[1]));
const jsonLd = (html) =>
  [...html.matchAll(/<script[^>]+type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);

/** The visible words, with the chrome that appears on every page removed. */
function bodyWords(html) {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] || html;
  const stripped = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return stripped.split(/\s+/).filter(Boolean).length;
}

// ------------------------------------------------------------------ the rubric

/**
 * One check. `only` limits it to a page kind; `points` is what it is worth.
 *
 * A check that does not apply to a page is not scored against it, and the
 * page's percentage is out of what applied. Marking a policy page down for
 * having no author byline would make the score meaningless, and a meaningless
 * score is one nobody acts on.
 */
const C = (id, points, what, fn, only = null) => ({ id, points, what, fn, only });

export const RUBRIC = [
  // --- A · Crawlability and identity (20)
  C("title", 4, "A <title> of 15–65 characters", (p) => {
    const t = p.title;
    if (!t) return [0, "no <title>"];
    if (t.length < 15) return [1, `only ${t.length} characters`];
    if (t.length > 65) return [2, `${t.length} characters — it will be truncated in a result list`];
    return [4, `${t.length} characters`];
  }),
  C("description", 4, "A meta description of 70–160 characters", (p) => {
    const d = p.description;
    if (!d) return [0, "no meta description"];
    if (d.length < 70) return [2, `only ${d.length} characters — thin`];
    if (d.length > 160) return [2, `${d.length} characters — it will be cut`];
    return [4, `${d.length} characters`];
  }),
  C("canonical", 4, "A self-referencing absolute canonical", (p) => {
    if (!p.canonical) return [0, "no canonical"];
    if (!/^https:\/\//.test(p.canonical)) return [1, "canonical is not absolute"];
    if (p.canonical.replace(/\/$/, "") !== p.expectedUrl.replace(/\/$/, "")) return [2, `points at ${p.canonical}, expected ${p.expectedUrl}`];
    return [4, "self-referencing"];
  }),
  C("lang", 2, "A language on <html>", (p) => (/<html[^>]+lang\s*=\s*"[a-z]{2}(-[A-Z]{2})?"/.test(p.html) ? [2, ""] : [0, "no lang attribute"])),
  C("viewport", 2, "A viewport meta", (p) => (p.viewport ? [2, ""] : [0, "no viewport — the page is not mobile-ready"])),
  C("robots", 2, "Nothing telling a crawler to stay away", (p) => {
    const r = p.robots || "";
    if (/noindex/i.test(r)) return [0, "meta robots says noindex"];
    return [2, r ? "explicit index directive" : "no directive, which means index"];
  }),
  C("charset", 2, "A charset in the first 1024 bytes", (p) =>
    /<meta[^>]+charset/i.test(p.html.slice(0, 1024)) ? [2, ""] : [0, "charset missing or too late in the head"]),

  // --- B · Content structure (20)
  C("h1", 4, "Exactly one <h1>", (p) => {
    const n = p.headings.filter((h) => h.level === 1).length;
    if (n === 1) return [4, ""];
    return [n === 0 ? 0 : 1, `${n} h1 elements`];
  }),
  // Judged on the MAIN CONTENT outline, not on the chrome. The site header
  // and footer repeat on every page and their headings are navigation labels;
  // scoring them would mark down fifteen pages for one shared footer and tell
  // nobody anything about any of them.
  C("heading-order", 4, "Heading levels that do not skip", (p) => {
    let last = 0;
    for (const h of p.contentHeadings) {
      if (last && h.level > last + 1) return [1, `h${last} is followed by h${h.level} at "${h.text.slice(0, 40)}"`];
      last = h.level;
    }
    return [4, `${p.contentHeadings.length} headings in order`];
  }),
  C("h1-length", 2, "An <h1> that is a headline rather than a paragraph", (p) => {
    const h1 = p.headings.find((h) => h.level === 1);
    if (!h1 || !h1.text) return [0, "no h1 text"];
    return h1.text.length <= 110 ? [2, ""] : [1, `${h1.text.length} characters`];
  }),
  C("depth", 4, "Enough body text to be worth indexing", (p) => {
    if (p.words >= 900) return [4, `${p.words} words`];
    if (p.words >= 300) return [3, `${p.words} words`];
    if (p.words >= 120) return [1, `${p.words} words — thin`];
    return [0, `${p.words} words`];
  }),
  C("alt", 4, "An alt on every image", (p) => {
    const bad = p.images.filter((i) => i.alt === null);
    return bad.length ? [0, `${bad.length} image(s) with no alt: ${bad.map((b) => b.src).join(", ").slice(0, 80)}`] : [4, `${p.images.length} images`];
  }),
  C("anchor-text", 2, "Anchor text that says where it goes", (p) => {
    const lazy = p.anchors.filter((a) => /^(click here|here|read more|more|link|this)$/i.test(a.text));
    return lazy.length ? [0, `${lazy.length} uninformative anchor(s)`] : [2, ""];
  }),

  // --- C · Structured data (15)
  C("jsonld", 5, "JSON-LD that parses", (p) => {
    if (!p.ld.length) return [0, "no JSON-LD"];
    if (p.ldError) return [0, `JSON-LD does not parse: ${p.ldError}`];
    return [5, `${p.ldTypes.length} typed nodes`];
  }),
  C("ld-org", 3, "An Organization node identifying the publisher", (p) =>
    p.ldTypes.includes("Organization") ? [3, ""] : [0, "no Organization node"]),
  C("ld-breadcrumb", 3, "A BreadcrumbList", (p) =>
    p.isHome || p.ldTypes.includes("BreadcrumbList") ? [3, p.isHome ? "home page — none required" : ""] : [0, "no BreadcrumbList"]),
  C("ld-page", 4, "A node saying what this page is", (p) => {
    const wanted = ["BlogPosting", "Article", "Blog", "WebSite", "WebPage", "ProfessionalService", "FAQPage"];
    const hit = wanted.filter((t) => p.ldTypes.includes(t));
    return hit.length ? [4, hit.join(", ")] : [0, "no page-type node"];
  }),

  // --- D · How it looks when shared (10)
  C("og", 5, "The five Open Graph tags a share card needs", (p) => {
    const missing = ["og:title", "og:description", "og:url", "og:image", "og:type"].filter((k) => !p.og[k]);
    return missing.length ? [Math.max(0, 5 - missing.length * 2), `missing ${missing.join(", ")}`] : [5, ""];
  }),
  C("og-image", 2, "An absolute share image with its dimensions", (p) => {
    if (!p.og["og:image"]) return [0, "no og:image"];
    if (!/^https:\/\//.test(p.og["og:image"])) return [1, "og:image is not an absolute URL — most scrapers will not fetch it"];
    return p.og["og:image:width"] ? [2, ""] : [1, "no og:image:width"];
  }),
  C("twitter", 3, "A large summary card", (p) => {
    if (p.twitter["twitter:card"] !== "summary_large_image") return [0, "no summary_large_image card"];
    const missing = ["twitter:title", "twitter:description", "twitter:image"].filter((k) => !p.twitter[k]);
    return missing.length ? [1, `missing ${missing.join(", ")}`] : [3, ""];
  }),

  // --- E · Internal linking (15)
  C("internal-links", 4, "At least three links into the rest of the site", (p) => {
    const n = p.internal.length;
    if (n >= 8) return [4, `${n} internal links`];
    if (n >= 3) return [3, `${n} internal links`];
    return [n ? 1 : 0, `${n} internal links`];
  }),
  // The check that actually earns its place.
  C("links-resolve", 6, "Every internal link resolving to something real", (p) => {
    if (!p.brokenLinks.length) return [6, `${p.internal.length} links, all resolve`];
    return [0, p.brokenLinks.slice(0, 6).join("; ") + (p.brokenLinks.length > 6 ? ` (+${p.brokenLinks.length - 6} more)` : "")];
  }),
  C("outbound-safe", 2, "External links that do not hand over the tab", (p) => {
    const unsafe = p.external.filter((a) => a.target === "_blank" && !/noopener/.test(a.rel));
    return unsafe.length ? [0, `${unsafe.length} target=_blank without rel=noopener`] : [2, `${p.external.length} external links`];
  }),
  // The home page is the root of the trail and has nothing to sit above it,
  // so a breadcrumb there would be an invention.
  C("breadcrumb", 3, "A breadcrumb a reader can see", (p) =>
    p.isHome || /class="breadcrumb"/.test(p.html) ? [3, p.isHome ? "home page — none required" : ""] : [0, "no visible breadcrumb"]),

  // --- F · Discovery (10)
  C("in-sitemap", 3, "Listed in sitemap.xml", (p) => (p.inSitemap ? [3, ""] : [0, "not in sitemap.xml"])),
  C("feed-link", 2, "A feed a reader or a crawler can subscribe to", (p) =>
    /rel="alternate"[^>]+application\/rss\+xml/.test(p.html) ? [2, ""] : [0, "no RSS alternate link"]),
  C("inbound", 5, "Reachable from somewhere else on the site", (p) => {
    if (p.inbound >= 3) return [5, `${p.inbound} pages link here`];
    if (p.inbound >= 1) return [3, `${p.inbound} page links here`];
    return [0, "orphan — no other page links to it"];
  }),

  // --- G · Answer-engine readiness (10) — posts only
  C("faq-schema", 4, "Three or more questions answered in full", (p) => {
    const qs = p.questions;
    if (qs.length < 3) return [qs.length ? 1 : 0, `${qs.length} question(s)`];
    const thin = qs.filter((q) => q.words < 40);
    if (thin.length) return [2, `${thin.length} answer(s) under 40 words — too thin to be lifted as an answer`];
    return [4, `${qs.length} questions, shortest answer ${Math.min(...qs.map((q) => q.words))} words`];
  }, "post"),
  C("question-headings", 3, "Questions visible on the page, not only in the markup", (p) => {
    const asked = p.headings.filter((h) => /\?$/.test(h.text)).length;
    if (asked >= 3) return [3, `${asked} question headings`];
    return [asked ? 1 : 0, `${asked} question headings`];
  }, "post"),
  C("author", 3, "A named author with a verifiable profile", (p) => {
    const named = /<meta[^>]+name="author"/.test(p.html);
    const linked = p.anchors.some((a) => /linkedin\.com\/in\//.test(a.href || ""));
    if (named && linked) return [3, ""];
    return [named || linked ? 1 : 0, "no named author with a profile link"];
  }, "post"),
];

export const MAX_SCORE = RUBRIC.reduce((n, c) => n + c.points, 0);

// ------------------------------------------------------------------- the audit

/**
 * Routes the server serves from outside frontend/public.
 *
 * The employee portal is a real, reachable page — it is just not marketing
 * content, and robots.txt keeps crawlers out of it. Reporting it as a broken
 * link would be wrong, and would train whoever reads this report to ignore
 * the one check that matters most.
 */
const APP_ROUTES = [/^\/internal\//, /^\/api\//, /^\/shared\//];

/** Turn a href into the file it should resolve to, or null if it is external. */
function internalTarget(href) {
  if (!href) return null;
  if (/^(https?:)?\/\//i.test(href) || /^(mailto:|tel:|#)/i.test(href)) return null;
  if (APP_ROUTES.some((r) => r.test(href))) return null;
  const [pathPart, frag] = href.split("#");
  return { path: pathPart || "", fragment: frag || null };
}

/**
 * Audit one page against the rubric.
 *
 * `site` carries what a single page cannot know about itself: which files
 * exist, which anchors exist inside them, what the sitemap lists, and how
 * many other pages link here.
 */
export function auditPage({ file, html, url, kind }, site) {
  const ld = jsonLd(html);
  let ldTypes = [];
  let ldError = null;
  for (const block of ld) {
    try {
      const parsed = JSON.parse(block);
      const walk = (n) => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === "object") {
          if (n["@type"]) ldTypes.push(...[].concat(n["@type"]));
          Object.values(n).forEach(walk);
        }
      };
      walk(parsed);
    } catch (e) {
      ldError = e.message;
    }
  }

  const a = anchors(html);
  const internal = a.filter((x) => internalTarget(x.href));
  const external = a.filter((x) => /^https?:\/\//i.test(x.href || ""));

  const brokenLinks = [];
  for (const link of internal) {
    const t = internalTarget(link.href);
    // "/what-we-offer" is served as what-we-offer.html; "/" is index.html.
    const rel = t.path === "/" || t.path === "" ? (t.path === "" ? file : "index.html") : t.path.replace(/^\//, "");
    const candidate = rel.endsWith(".html") || rel.endsWith(".xml") || rel.endsWith(".txt") || rel.endsWith(".pdf") ? rel : `${rel}.html`;
    const exists = site.files.has(candidate) || site.files.has(`${rel.replace(/\/$/, "")}/index.html`);
    if (!exists) { brokenLinks.push(`${link.href} → no file ${candidate}`); continue; }
    if (t.fragment) {
      const targetIds = site.ids.get(candidate) || (t.path === "" ? ids(html) : null);
      if (targetIds && !targetIds.has(t.fragment)) brokenLinks.push(`${link.href} → no element #${t.fragment} in ${candidate}`);
    }
  }

  // A question this page answers: a heading ending in "?" and the words that
  // follow it before the next heading. This measures the PAGE, not the schema —
  // a FAQ that exists only in JSON-LD is a FAQ no reader ever sees.
  const questions = [];
  const hs = [...html.matchAll(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi)];
  for (let i = 0; i < hs.length; i += 1) {
    const text = hs[i][3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!/\?$/.test(text)) continue;
    const start = hs[i].index + hs[i][0].length;
    const end = i + 1 < hs.length ? hs[i + 1].index : html.length;
    const answer = html.slice(start, end).replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean);
    questions.push({ q: text, words: answer.length });
  }

  const page = {
    file, html, url, kind,
    expectedUrl: url,
    title: titleOf(html),
    description: meta(html, "description"),
    robots: meta(html, "robots"),
    viewport: meta(html, "viewport"),
    canonical: linkRel(html, "canonical"),
    headings: headings(html),
    contentHeadings: headings(
      html
        .replace(/<header[\s\S]*?<\/header>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    ),
    isHome: file === "index.html",
    images: images(html),
    anchors: a,
    internal, external, brokenLinks, questions,
    words: bodyWords(html),
    ld, ldTypes, ldError,
    og: Object.fromEntries(["og:title", "og:description", "og:url", "og:image", "og:type", "og:image:width"].map((k) => [k, prop(html, k)])),
    twitter: Object.fromEntries(["twitter:card", "twitter:title", "twitter:description", "twitter:image"].map((k) => [k, meta(html, k)])),
    inSitemap: site.sitemap.has(url) || site.sitemap.has(url.replace(/\/$/, "")),
    inbound: site.inbound.get(file) || 0,
  };

  const results = [];
  let earned = 0, applicable = 0;
  for (const check of RUBRIC) {
    if (check.only && check.only !== kind) continue;
    const [got, note] = check.fn(page);
    applicable += check.points;
    earned += got;
    results.push({ id: check.id, what: check.what, got, of: check.points, note });
  }
  return { file, url, kind, score: Math.round((earned / applicable) * 100), earned, applicable, results, page };
}

/**
 * Audit the whole public site.
 *
 * Whole-site rather than page-by-page because three of the checks are
 * relationships: does this link go anywhere, is this page in the sitemap, does
 * anything link here. A page cannot answer those about itself.
 */
export function auditSite(publicDir) {
  const files = new Map();
  const walk = (dir, prefix = "") => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { walk(path.join(dir, entry.name), rel); continue; }
      files.set(rel, path.join(dir, entry.name));
    }
  };
  walk(publicDir);

  const htmlFiles = [...files.keys()].filter((f) => f.endsWith(".html"));
  const contents = new Map(htmlFiles.map((f) => [f, fs.readFileSync(files.get(f), "utf8")]));
  const idMap = new Map(htmlFiles.map((f) => [f, ids(contents.get(f))]));

  const sitemapXml = files.has("sitemap.xml") ? fs.readFileSync(files.get("sitemap.xml"), "utf8") : "";
  const sitemap = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

  const urlFor = (f) => {
    if (f === "index.html") return "https://etablix.com/";
    return `https://etablix.com/${f.replace(/\.html$/, "")}`;
  };

  // How many other pages link to each file.
  const inbound = new Map();
  for (const [from, html] of contents) {
    const seen = new Set();
    for (const link of anchors(html)) {
      const t = internalTarget(link.href);
      if (!t || !t.path) continue;
      const rel = t.path === "/" ? "index.html" : t.path.replace(/^\//, "");
      const target = rel.endsWith(".html") ? rel : `${rel}.html`;
      if (target === from || seen.has(target)) continue;
      seen.add(target);
      inbound.set(target, (inbound.get(target) || 0) + 1);
    }
  }

  const site = { files, ids: idMap, sitemap, inbound };

  /**
   * What is not scored, and why.
   *
   * A page that carries meta robots noindex has been deliberately withdrawn
   * from search — the portals and the live prequalification form are
   * token-gated application screens, not content. Scoring them as marketing
   * pages would drag the average down over decisions somebody made on purpose,
   * and an average nobody trusts is an average nobody acts on. The rule is
   * read off the page itself rather than kept as a list, so withdrawing a new
   * page needs no change here.
   */
  const excluded = [];
  const scored = [];
  for (const f of htmlFiles) {
    const html = contents.get(f);
    if (/<meta[^>]+name="robots"[^>]*content="[^"]*noindex/i.test(html)) {
      excluded.push({ file: f, why: "noindex — withdrawn from search on purpose" });
      continue;
    }
    scored.push(f);
  }

  const pages = scored.map((f) =>
    auditPage({ file: f, html: contents.get(f), url: urlFor(f), kind: f.startsWith("blog/") ? "post" : "page" }, site));

  return { pages, files: htmlFiles, excluded };
}

/** A short human report, for the test output and for the terminal. */
export function report(audit, { verbose = false } = {}) {
  const lines = [];
  for (const p of audit.pages.sort((a, b) => a.score - b.score)) {
    lines.push(`  ${String(p.score).padStart(3)}/100  ${p.file}${p.kind === "post" ? "  (post)" : ""}`);
    for (const r of p.results) {
      if (r.got === r.of && !verbose) continue;
      lines.push(`         ${r.got}/${r.of}  ${r.what}${r.note ? ` — ${r.note}` : ""}`);
    }
  }
  return lines.join("\n");
}
