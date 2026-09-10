# Search playbook — what was built, what it proves, and what only you can do

**Prepared 10 September 2026.**

## 1 · The honest framing, first

Nobody can guarantee a top-five ranking. Not on Google, not in LinkedIn search,
not in an AI engine's answer. Position is decided by systems we do not control,
against competitors we cannot see, on signals no on-page work can create —
other people's links, other people's searches for your name, how long a reader
stays once they arrive.

Any supplier who promises you position is selling something they cannot
deliver. What can be promised is this: **nothing on our side is broken,
missing, slow or ambiguous, and that is provable on demand.**

So the work splits in two.

| | Who owns it | Status |
|---|---|---|
| Everything on the site | Us | **Done, and gated in the test suite** |
| Everything off the site | You | **Listed in section 5. Nothing here starts until you do it.** |

---

## 2 · The score, and why it is ours rather than a tool's

"90 out of 100" from an online checker is a number nobody can reproduce, on a
rubric nobody can read, from a vendor with an interest in the answer.

So the rubric is in the repository at `backend/lib/seo.js`. It totals exactly
100 points across seven categories, every check says in plain words what it
inspects, and anyone can run it and get the same number.

```
node backend/test/seo.test.mjs
```

**Current result: every indexable page scores 99 or 100. The site averages 99.
The article scores 100.**

| Category | Points | What it checks |
|---|---|---|
| Crawlability and identity | 20 | Title and description length, self-referencing canonical, language, viewport, charset, no accidental noindex |
| Content structure | 20 | One h1, no skipped heading levels, enough body text, alt on every image, anchor text that says where it goes |
| Structured data | 15 | JSON-LD that parses, an Organization, a BreadcrumbList, a node saying what the page is |
| How it looks when shared | 10 | The five Open Graph tags, an absolute image with dimensions, a large Twitter card |
| Internal linking | 15 | Enough internal links, **every one resolving to something real**, safe outbound links, a visible breadcrumb |
| Discovery | 10 | In the sitemap, a feed to subscribe to, linked to from elsewhere on the site |
| Answer-engine readiness | 10 | Questions answered in full in visible text, a named author with a verifiable profile |

The test refuses to pass if any page drops below 90, or any article below 95.

The suite runs two other things that are **not scored, because they are not a
matter of degree**: no internal link anywhere may point at something that does
not exist, and nothing published may describe ETABLIX as a main contractor or
as holding a CDM role it does not hold.

---

## 3 · What was built

**A blog, at `/blog`.** One article so far, at 2,630 words: *AI agents in
construction: what they can actually do, and what they must never be allowed to
do.* Written from what we actually operate, with the four things the agents are
refused, the difference between a control and a promise, and eight questions to
put to any supplier selling AI in construction.

**Every page generated from one manifest.** `backend/lib/blog.js` holds the
posts, the internal link registry and the cited sources.
`backend/tools/build-blog.mjs` turns them into the index, each article, the RSS
feed, the sitemap and `llms.txt`. Adding a second article costs a manifest entry
and a body file; the contents list, the related-post links, the schema, the feed
and the sitemap all update themselves.

**Links that are dynamic where it matters and static where it counts.** A post
writes `{{link:diagnostic}}` and the generator turns it into a real anchor in
the shipped HTML. One registry entry changes every occurrence across the whole
blog — but the anchor a crawler sees is an ordinary `<a href>`, not something a
script inserts. **This is deliberate and it is the opposite of what "dynamic
links" usually means.** A link only JavaScript can see is a link a crawler does
not count and an AI engine never runs. The article carries 37 internal links and
15 outbound citations, and the test proves every one of them resolves.

**Discovery surfaces.** An RSS feed carrying full articles. A sitemap with a
`lastmod` on every entry, so a crawler knows what changed. An `llms.txt` written
for answer engines, which says what ETABLIX is *not* before it says what it
sells — because the most damaging thing an AI answer can do to us is call us a
main contractor. And `robots.txt` now names the retrieval crawlers explicitly:
GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot,
Bingbot and the rest.

---

## 4 · What the audit found on the rest of the site

The audit was run over the whole site, not just the new pages. The average
before was **80**. It is now **99**.

| Defect | Where | Why it mattered |
|---|---|---|
| **`/blog` answered 404** | The server | The directory of posts shadowed the index file. Every internal link, the sitemap and the canonical pointed at an address that redirected to nothing, while every individual post answered fine. Only asking the running server could reveal it. |
| Section labels were `<div>` | 15 pages | Every page's outline jumped from h1 straight to h3. They are the section headings and are now `<h2>`. |
| No breadcrumb schema | 13 pages | The trail was visible to a reader and invisible to a machine. Now generated from the visible trail, so the two cannot disagree. |
| Four descriptions were cut off | Home, what-we-offer, how-it-works, sample | Between 169 and 214 characters. Rewritten to fit, not truncated. |
| Two deep links went nowhere | The new article | `#models` and `#diagnostic` did not exist. The anchors were added. |
| A withdrawn page was in the sitemap | `/pqq` | It says noindex. Telling a crawler to come and then not to index is a contradiction it resolves by trusting the sitemap less. The generator now excludes them by reading the page. |
| No feed link, no llms.txt, no lastmod | Site-wide | Nothing told a crawler what had changed. |

---

## 5 · The half only you can do

**Nothing in section 3 produces a ranking on its own.** These are in order of
what actually moves position, and every one needs you.

### This week

1. **Verify the site in [Google Search Console](https://search.google.com/search-console)
   and [Bing Webmaster Tools](https://www.bing.com/webmasters).** Submit
   `https://etablix.com/sitemap.xml` in both. Until you do this, Google may not
   know the blog exists for weeks, and you have no data at all. Bing matters
   more than its share suggests: it feeds several AI answer engines.
2. **Claim the Google Business Profile** for JNN GLOBAL LTD at the Birmingham
   address. Local signals carry weight on any query with a place in it, and a
   competitor claiming a profile at your address is a problem that takes months
   to unwind.
3. **Post the article on LinkedIn** — not a link with "check out our new blog",
   but the argument itself, in the post, with the link at the end. LinkedIn
   suppresses posts that send people away; it does not suppress posts that are
   worth reading and happen to carry a link.

### This month

4. **Get the first three real links.** One link from a trade body, a client, a
   supplier or a publication is worth more than everything in section 3. Ask:
   the CIOB, a supplier whose page you appear on, any framework you are on, and
   the trade press if the eight-questions section is useful to them.
5. **Write the second and third articles.** One article is not a blog. The
   generator makes the second one cheap; what it costs is your thinking. Two
   candidates the first one sets up:
   - *Welfare sizing on a construction site: why CDM 2015 sets no ratios, and
     what actually decides the number.* The specific, checkable point in
     section 8 of the first article, expanded — and a query people genuinely
     search.
   - *What a tender pack is missing when returns cannot be compared.* The
     scope-to-price reconciliation, written for a buyer rather than for an
     engineer.
6. **Add your LinkedIn profile to the site's Organization schema as `sameAs`.**
   It is already on the article. Entity association across profiles is how a
   search engine learns that the person and the business are the same thing.

### Ongoing

7. **Answer the eight questions publicly** whenever someone asks them. A reply
   under a post is a citable, indexable answer with your name on it.
8. **Never buy links.** Construction has an active market in them, they are
   detectable, and the penalty outlasts the benefit by years.

---

## 6 · What to expect, and when

Given a new domain with no link profile, be sceptical of any prediction. The
honest shape:

- **Weeks 1–2:** indexed, if you do items 1 and 2. Not ranking for anything
  competitive.
- **Months 1–3:** appearing for long-tail phrases — the exact questions the
  article answers, and your own name.
- **Months 3–9:** movement on the harder terms, driven almost entirely by
  item 4. This is the step most businesses skip and then conclude that SEO does
  not work.

**AI answer engines behave differently and can be faster.** They favour
specific, sourced, unusual content over domain age, which is the one axis where
we are genuinely strong. The first article is written to be lifted: primary
sources, no invented figures, five questions answered in full, and a claim —
the difference between a control and a promise — that nobody else is making.

---

## 7 · How to keep it at 99

```
node backend/tools/build-blog.mjs      # after any content change
bash backend/test/run-all.sh           # the gate, with everything else
```

The suite fails if a page drops below the floor, if any internal link breaks, if
a generated page is hand-edited out of sync with its manifest, or if a published
URL stops answering. That last one is the check that found the 404.

Do not edit anything under `frontend/public/blog/`, `blog.html`, `sitemap.xml`
or `llms.txt` by hand. They are generated. Edit `content/blog/` and
`backend/lib/blog.js`, then rebuild.
