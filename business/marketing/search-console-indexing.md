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

## "Page with redirect" — cause found in the repository, and fixed

No application route redirected. But the repository held **two reverse proxy
configurations that disagreed about exactly this**:

- `deploy/Caddyfile` — `www.etablix.com` 301s to the apex. Correct.
- `deploy/nginx-etablix.conf` — answered on `etablix.com` **and**
  `www.etablix.com`, proxied both to the application, and redirected neither.

So the canonical host of the site was a property of whichever proxy the
operator happened to install, and nothing tested it. That is the defect, and
it explains why the report could not be diagnosed from the markup.

Both have been fixed, in two places.

### The rule now lives in the application

`backend/lib/canonical-url.js`, mounted ahead of the view counter and the
verification handlers so a 301 is never counted as a page view. Four
normalisations, each a single 301:

| From | To |
|---|---|
| `www.<host>` | `<host>` |
| `http://` | `https://` — only when the canonical site is https |
| `/path/` | `/path` |
| `/path.html` | `/path` |

The fourth was a live duplicate-content problem, not a tidy-up.
`express.static` is mounted with `extensions:["html"]`, so `/about` and
`/about.html` both answered 200 with byte-identical content and neither
pointed at the other. Two URLs, one page, held together by a canonical tag
alone — which works until something links the `.html` form.

What it deliberately does not do: it redirects **one** alternate host, `www`,
and no others, because guessing a canonical host from an arbitrary `Host`
header is how a health check or a container probe gets sent nowhere. It never
touches `/api`, `/internal` or `/shared`. It keeps the port in development. It
is inert when `SITE_URL` is unset.

**One pairing is load-bearing.** The public static handler is now mounted with
`redirect: false`. Left at its default, `express.static` answers a directory
request by *adding* a trailing slash — so `/policies` would 301 to
`/policies/`, which rule 3 would strip straight back off. That is an infinite
redirect, and `redirect: false` is the only thing preventing it. The suite
tests for the loop directly.

### The nginx vhost now agrees with the Caddyfile

Split into two server blocks: `www.etablix.com` returns 301 to
`https://etablix.com$request_uri`, and the apex is the only host that proxies
to the application. Keep `www` in the certbot `-d` list so the redirect itself
is served over TLS.

### It is tested

`backend/test/canonical.e2e.mjs` — 128 assertions, registered in
`run-all.sh`. Every one made with redirects switched off, because a test that
follows redirects cannot tell a 200 from a 301 to a 200, which is the entire
distinction Search Console was reporting. It covers: all 17 sitemap URLs at
200; both alternate forms of every one of them 301ing to it; one hop and never
two; the directory loop; `www` to apex; an unknown `Host` left alone; `/api`,
`/internal`, `robots.txt` and `sitemap.xml` untouched; POST not redirected;
and the query string surviving.

One thing worth recording about writing that suite: **`fetch` silently drops a
`Host` header** — it is a forbidden header name in undici. The www assertion
passed against a request that never carried the header it was testing. It now
uses `node:http`, which sends what it is given and is closer to what a crawler
does anyway.

### What is left for the live site

The application and both proxy configs are now consistent, so the remaining
possibility is a rule at the host that is in neither file. Worth one check:

```
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' -L https://etablix.com/about
```

`200 https://etablix.com/about` is correct. A trailing slash that was not
asked for means a rewrite at Hostinger, above both configs.

The `www` and `http` URLs in the Search Console report are expected to keep
appearing as "Page with redirect" — that is what a correct 301 looks like from
Google's side, and it means the apex is being indexed instead. Nothing to fix
and no validation to request.

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

---

## One found on the way: the portal threw instead of redirecting

Running the full suite to check this work surfaced a failure that was already
there — `internal-pages.e2e`, 4 failing assertions on unmodified HEAD, proved
by stashing the change and re-running before touching anything.

Four portal modules did this:

```js
if (!token) location.replace("/internal/login.html");
```

`location.replace()` does not stop the script. Navigation is queued; the module
carries straight on. In `app.js` the next line to touch the session was

```js
document.getElementById("user-name").textContent = user.name;
```

which throws `TypeError: Cannot read properties of null` before the browser has
gone anywhere. So a direct visit to the Control Desk with no session painted a
broken shell and logged an error, rather than going quietly to the login page.
The same pattern was in `l7-page.js`, `playbook.js` and `reach-page.js`.

Fixed in all four by halting module evaluation after the redirect:

```js
if (!token) {
  location.replace("/internal/login.html");
  await new Promise(() => {});
}
```

Top-level await is the halt. All four are loaded with `<script type="module">`,
so it is available; evaluation stops, the navigation completes, and nothing
below runs. `internal-pages.e2e` now passes 38 of 38, and the full run is
green.
