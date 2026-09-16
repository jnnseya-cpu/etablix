# Search Console — "Page with redirect" and "Blocked by robots.txt"

Reported September 2026. Neither is an error on its own. Both become real
defects only in specific circumstances, and nothing visible in the markup
tells you which case you are in — only asking the running server does.

`backend/tools/check-indexing.mjs` asks it.

## What the checker found

All seventeen sitemap URLs answer **200** at the application, with redirects
switched off. Every canonical agrees with the sitemap URL it belongs to. No
sitemap URL carries `noindex`. The three pages that do carry `noindex` —
`client-portal`, `pqq`, `supplier-portal` — are correctly absent from the
sitemap.

So the application is not the source of either report.

## "Blocked by robots.txt" — cause found, and it is intentional

`robots.txt` disallows `/internal/` and `/api/`. That is correct: `/internal/`
is the employee portal.

The checker found **thirteen public pages linking to `/internal/login.html`**
with no `rel="nofollow"` — the footer "Employee login" link on every page
except the blog index and the specimen. That link is how Google discovered a
blocked URL in the first place. It crawled a public page, followed the link,
hit the `Disallow`, and filed a report.

**Fixed.** `rel="nofollow"` added to all thirteen. Verified: 13 of 13.

The `Disallow` stays. The combination is deliberate, and it is worth knowing
why it is not the other way round:

- Google's own guidance prefers `noindex` over `robots.txt` for keeping a page
  out of the index, because a disallowed URL can still be indexed on the
  strength of inbound links alone, with no snippet — URL-only indexing.
- But serving `noindex` requires Google to fetch the page, which means
  allowing `/internal/` to be crawled. For a staff portal that is a worse
  trade than an untidy line in a report.

So: block the crawl, remove the discovery path, and treat the Search Console
line as informational. After this change there is no public link left for
Google to follow, and the item should clear on its own over the following
crawl cycles. **It does not need a validation request** — nothing is broken.

## "Page with redirect" — not visible from the application

No application route redirects. Every sitemap URL is served directly, and
`/blog` is handled explicitly in `app.js` before `express.static` can turn it
into `/blog/` — a defect that was found and fixed earlier by asking the
running server, because the markup could not have shown it.

That leaves the layers in front of the process, which is where this report
almost certainly comes from and which cannot be inspected from the development
environment — the network policy here blocks `etablix.com`. The three
candidates, in order of likelihood:

1. **`www.etablix.com` → `etablix.com`** (or the reverse). Correct and
   expected. Google reports the redirecting host's URLs as "Page with
   redirect" and indexes the target. Nothing to fix.
2. **`http://` → `https://`**. Same: correct, expected, nothing to fix.
3. **A host or CDN trailing-slash rule** rewriting `/about` to `/about/` or the
   reverse. This one *would* matter, because it would mean every sitemap URL
   redirects and the canonical points at the redirecting form.

Run these three against the live site to tell them apart:

```
curl -sSI https://www.etablix.com/ | head -5
curl -sSI http://etablix.com/      | head -5
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' -L https://etablix.com/about
```

- If the first two show `301` to `https://etablix.com/` and the third shows
  `200 https://etablix.com/about`, everything is correct and the report is
  cosmetic. Close it and do nothing.
- If the third shows `200 https://etablix.com/about/` — a trailing slash that
  was not asked for — that is a real defect at the host, and the fix is at the
  host rather than in this repository.

Also worth checking in Search Console itself: the report lists the affected
URLs. If they are all `www.` or `http://`, case 1 or 2 is confirmed without
running anything.

## One thing worth knowing about duplicate URLs

`express.static` is configured with `extensions: ["html"]`, so `/about` and
`/about.html` both answer **200** with identical content. Neither redirects to
the other. That is not what either Search Console report is about, and the
canonical tag resolves it correctly — every page declares the extensionless
form, which is the form in the sitemap.

It is recorded here because if `.html` URLs ever appear in a Search Console
report as duplicates, this is why, and the answer is the canonical rather than
a redirect.

## The check is now repeatable

```
node backend/tools/check-indexing.mjs --base http://127.0.0.1:3000
```

Exits non-zero if any sitemap URL redirects, is disallowed by `robots.txt`,
disagrees with its canonical, or carries `noindex`. Run it after any change to
the sitemap, to `robots.txt`, or to the static routing — those three are where
this class of defect comes from, and none of them announces itself.
