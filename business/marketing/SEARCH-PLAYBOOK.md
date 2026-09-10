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
| Submitting to Bing, Yandex, Seznam, Naver | Us | **Automatic on every deploy** (IndexNow needs no account) |
| Verifying with Google and Bing | You | **One pasted value** — the rest is wired |
| Claiming the business listing | You | The data is now correct and gated; only you can prove you are the business |
| Getting the first real links | You | **Nothing else matters until this happens.** Six asks written and ready to send |

---

## 2 · The score, and why it is ours rather than a tool's

"90 out of 100" from an online checker is a number nobody can reproduce, on a
rubric nobody can read, from a vendor with an interest in the answer.

So the rubric is in the repository at `backend/lib/seo.js`. It totals exactly
100 points across eight categories, every check says in plain words what it
inspects, and anyone can run it and get the same number.

```
node backend/test/seo.test.mjs
```

**Current result: every indexable page scores 99 or 100. The site averages 99.
The article scores 100.**

| Category | Points | What it checks |
|---|---|---|
| Crawlability and identity | 20 | Title and description length, self-referencing canonical, language, viewport, charset, no accidental noindex |
| Content structure | 19 | One h1, no skipped heading levels, enough body text, alt on every image, anchor text that says where it goes |
| Structured data | 14 | JSON-LD that parses, an Organization, a BreadcrumbList, a node saying what the page is |
| How it looks when shared | 9 | The five Open Graph tags, an absolute image with dimensions, a large Twitter card |
| Internal linking | 14 | Enough internal links, **every one resolving to something real**, safe outbound links, a visible breadcrumb |
| Discovery | 9 | In the sitemap, a feed to subscribe to, linked to from elsewhere on the site |
| The business listing | 5 | **One name, one address, one phone**, and a place of business a listing can be matched to |
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

## 5 · The half that needed a person — and what is left of it

Three things were on this list. **Two of them are now automatic.** What remains
genuinely cannot be done by anybody but you, and this section says exactly why.

### Now automatic: telling search engines the site changed

`node backend/tools/publish.mjs` rebuilds the blog, runs the audit, and submits
every changed URL to **IndexNow** — which reaches Bing, Yandex, Seznam and
Naver. It needs no account and no login: the protocol authenticates by domain
ownership, and the proof is a key file published at
`https://etablix.com/0eaad2d90de77da0af6c541bdf2d3af7.txt`. Bing usually crawls
a submitted URL within hours.

**It runs itself on every deploy.** `deploy.sh` calls it after the health check
passes, best effort — it can report a problem but it can never fail a deploy.

**It refuses to submit a broken site.** If any internal link is broken, or any
page has fallen below 90, it stops and says which. Inviting four search engines
to crawl a broken page is worse than not inviting them.

That matters beyond Bing's own share: Bing's index feeds several of the answer
engines, so this is the one lever on AI-answer discovery that needs no human.

### Now one paste: verification

Google is the exception and there is no way round it. Google **retired its
sitemap ping endpoint in 2023** — it answers 404 now — because unauthenticated
submissions were mostly spam. The only route in is Search Console, and the only
route into Search Console is proving you own the site.

That proof is now an environment variable rather than a file to commit:

| Variable | What to put in it |
|---|---|
| `GOOGLE_SITE_VERIFICATION` | the `content` value from Search Console's HTML tag method |
| `GOOGLE_VERIFICATION_FILE` | or the filename from its HTML file method, e.g. `google1a2b3c.html` |
| `BING_SITE_VERIFICATION` | the token from Bing Webmaster Tools (also serves `/BingSiteAuth.xml`) |
| `YANDEX_VERIFICATION` | the token from Yandex Webmaster, if you bother |

Either method works for either engine; use whichever the console leads with.
When none is set, none of it is mounted and the site behaves exactly as before.

**The whole job, once:**

1. https://search.google.com/search-console → add `https://etablix.com`
2. Copy the value it gives you
3. Add it to `/opt/etablix/etablix.env` and redeploy
4. Press **Verify**, then submit `https://etablix.com/sitemap.xml`
5. Repeat at https://www.bing.com/webmasters

Five minutes. After that Google reads the sitemap from `robots.txt` on its own
and never needs telling again.

### Now correct, and waiting to be claimed: the business listing

A Google Business Profile is matched against **citations** of the name, address
and phone across the web, and the site is the first citation. Two spellings of
one address do not reinforce each other, they compete.

The site had two in circulation, differing by a comma before the postcode. They
are now one, on all 19 pages, and **the audit fails if a second form appears**.
The structured address was also wrong — it crammed a neighbourhood and a city
into the field a mapping service matches on — and is now correct on every page.

Use this, character for character, everywhere you are ever listed:

```
ETABLIX — Integrated Site Services
Groupe Nseya House, Kingstanding, Birmingham B44 8DJ
+44 7493 216101
contact@etablix.com
```

**What only you can do:** claim it. Google requires whoever claims a profile to
prove they are the business, by post, phone or video. No script can be you.

Go to https://business.google.com, search for the address first in case a
profile already exists, and claim rather than create if it does — a duplicate
profile splits the signal and takes months to merge. Once it is live, the
coordinates it gives you can be added to the site's schema; they are
deliberately absent now rather than guessed, because a pin in the wrong place
is worse than no pin.

### Still entirely yours: the first three links

**This is the one that decides whether any of the rest matters**, and it cannot
be automated because it is other people agreeing to do something.

`business/marketing/LINK-OUTREACH.md` has six asks written to be sent, in order
of how likely they are to land: the CIOB and *Construction Manager* first,
because Justin is a member and that is standing rather than a cold approach;
then the trade press; then suppliers already in the supply chain, which is the
easiest link in the list and the one nobody asks for.

Three standing rules in there, and they matter more than the asks: never buy a
link, never pay a directory for inclusion, and never describe a relationship
that is not real.

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
node backend/tools/publish.mjs         # rebuild, audit, tell the engines
bash backend/test/run-all.sh           # the gate, with everything else
```

`publish.mjs` takes `--dry-run` to show what it would send, `--all` to submit
the whole sitemap rather than what changed, and `--since 2026-09-01` to pick
the window. Submitting everything on every deploy is how a domain gets
rate-limited, so the default is what moved.

The suite fails if a page drops below the floor, if any internal link breaks, if
a generated page is hand-edited out of sync with its manifest, or if a published
URL stops answering. That last one is the check that found the 404.

Do not edit anything under `frontend/public/blog/`, `blog.html`, `sitemap.xml`
or `llms.txt` by hand. They are generated. Edit `content/blog/` and
`backend/lib/blog.js`, then rebuild.

---

## 8 · One post a day, and how to survive it

A daily cadence is not a scheduling problem. Publishing costs one command.
What breaks a daily cadence is a Tuesday when three site problems arrive at
once and there is nothing written.

So the cadence runs off a **buffer**, and the buffer is the only number that
predicts whether it survives.

| | What it is | What it is not |
|---|---|---|
| **Published** | Live, dated in `content/blog/schedule.json` | — |
| **Draft** | Written, finished, in the repository, appearing nowhere | A post |
| **Brief** | A queued idea in `PLAN`, with a buyer and an objection | A draft |

The three are never added together. A queue of seventeen briefs is not
seventeen days of runway; it is seventeen days of work not yet done. The
Reach page and `blog-publish.mjs --status` both report them separately for
that reason.

### The daily loop

```
node backend/tools/blog-publish.mjs --status         # where the cadence stands
node backend/tools/blog-new.mjs <slug>               # start the next brief
#   … write it: content/blog/<slug>.html and .json
node backend/tools/blog-publish.mjs --push           # publish the oldest draft
```

`blog-publish.mjs` does the whole act: writes today's date into the schedule,
regenerates the index, sitemap, feed, `llms.txt` and every related-post block,
runs the audit, submits to the engines that accept a submission, and commits.
**If the audit fails it takes the date back out and rebuilds without the
post**, so a post is either published and passing or not published at all.

It refuses before it changes anything if the draft is under 900 words, if the
`<title>` would be truncated, if the description is outside 70–160 characters,
if there are fewer than three questions, or if any placeholder is still marked
`TODO`.

Write two or three at a weekend and publish one a day. That is the mechanism.
There is no version of this where a post a day is produced by a scheduler
without somebody writing it, and any tool that claims otherwise is producing
the commodity content that gets ignored — by readers first, and by Google
second.

### The register

Punchy is not loud. Every brief in `PLAN` names four things, and a post that
cannot fill all four is not written:

- **buyer** — the person who has to act, by their job
- **query** — what they would actually type
- **objection** — the reason they have not bought, which the post must meet
- **sell** — the one thing it asks them to do next

The four content rules published on `/blog` still bind: no invented
statistics, primary sources only, no identifiable client, and we publish what
did not work. They are what make the commercial writing believable, so a
punchier register buys nothing if it costs any of them.

---

## 9 · The numbers: `/internal/reach.html`

One page in the employee portal, answering both questions.

- **The SEO score**, per page, from the same rubric the suite gates on, with
  every check that lost a mark and what it says.
- **The views**, counted on our own server. A row is a date, a path and a
  number, plus the hostname a reader arrived from. No IP address, no browser
  or device information, no cookie, no identifier of any kind — so **page
  views can be reported and unique visitors cannot**, and the page says so
  rather than implying a number it does not have.
- **Crawler visits**, counted separately and named. The first Googlebot hit on
  a new post is our own answer to "is it indexed yet", without asking a tool.
- **The cadence**, and the next command to type.

The browser beacon that used to do this is retired. It counted nobody with
JavaScript off, counted no crawler at all, and was rate-limited per address —
which silently discarded traffic from behind one corporate network, which is
exactly who we write for. Two counters that disagree are worse than one with a
known limitation.
