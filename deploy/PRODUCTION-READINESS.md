# ETABLIX — production readiness audit

What was asked for, what was found, what was changed, and what is not
realistically stabilisable. Nothing in this file is a status somebody hoped
for: every "fixed" has a test that fails when the fix is removed, and every
measurement was taken rather than estimated.

**Read the first section before anything else.** Four of the instructions
this audit answers describe a different technology stack from the one in this
repository, and pretending otherwise would have produced a report about work
that could not have been done.

---

## 0. The stack, stated plainly

The brief asked for Firebase App Hosting, Next.js, TypeScript and bundler
fixes, and for `next build` to pass. **None of those exists here.** This is:

| | |
|---|---|
| Runtime | Node.js 22 (ES modules), one process |
| Server | Express 4 |
| Frontend | Hand-written static HTML, CSS and ES modules. No bundler, no framework, no build step |
| Language | JavaScript. No TypeScript, no `tsconfig.json` |
| Store | SQLite via `node:sqlite` from the standard library |
| Hosting | Render blueprint (`render.yaml`), a container (`Dockerfile`), or a VPS under systemd behind Caddy or nginx (`deploy/`) |

There is no `next.config.*`, no `firebase.json`, no `apphosting.yaml`, no
`.firebaserc`, and no `tsconfig.json` — verified by looking. So:

- **"Stabilise Firebase App Hosting + Next.js"** has no subject in this
  repository. If Firebase App Hosting is genuinely the intended target, that
  is a migration, not a stabilisation, and it is a substantial piece of work
  with its own decisions (App Hosting expects a Next.js or Angular build
  output; `node:sqlite` on a local disk does not survive a platform that
  treats instances as disposable, so the store would have to move to
  Firestore or Cloud SQL first). Say the word and it can be scoped
  separately. It is not something to fold into a stabilisation pass.
- **"Fix TypeScript, Next.js or bundler errors"** — there are none, because
  there is no TypeScript, Next.js or bundler.
- **"`next build` passes consistently"** — the equivalent for this stack is
  `npm ci --omit=dev` followed by a cold production boot and the health
  check. That is what was run, and what section 3 reports.

The rest of the brief applies directly and was carried out.

---

## 1. Duplicate and conflicting files

**Nothing was removed, and that is the finding.** The audit was run properly
and there are no duplicate or conflicting configuration files:

- One `package.json`, one `package-lock.json` (v3), one `Dockerfile`, one
  `render.yaml`, one `.gitignore`, one `.dockerignore`.
- Thirty-eight files share a basename with another. Every one is the same name
  in a different layer — `backend/lib/store.js` and
  `backend/lib/l7/adapters/store.js`, `backend/routes/veryx.js` and
  `backend/lib/veryx.js`, `frontend/internal/index.html` and
  `frontend/public/index.html`. That is the convention, not a duplication.
- `content/blog/<slug>.html` and `frontend/public/blog/<slug>.html` are source
  and rendered output, not two copies. The rendered page is committed because
  it is served statically.
- `tools/build/` holds twenty-three numbered Python scripts, which look like
  abandoned iterations and are not: they are an ordered, documented pipeline
  that builds a business workbook, and `tools/build/README.md` lists them in
  order with the purpose of each. They are business work product and are
  untouched by any application build.
- `deploy/` carries both a `Caddyfile` and an `nginx-etablix.conf`. Both are
  documented as alternatives for different hosts — `deploy/README.md` for the
  Caddy route, `deploy/GO-LIVE-RUNBOOK.md` for nginx on a shared server. Two
  documented alternatives are not an ambiguity.

Deleting any of the above would have destroyed work and improved nothing, so
none of it was deleted. **What the audit did find were conflicts of a
different kind, and those are in section 2.**

---

## 2. Conflicts that would have broken a deployment

### 2.1 Five files disagreed about which Node version runs this — three were wrong

`node:sqlite` does not exist before Node 22.5. Following either VPS runbook
produced a server that dies on its first import with
`ERR_UNKNOWN_BUILTIN_MODULE`, which reads like a broken install rather than a
wrong runtime.

| File | Said | Now |
|---|---|---|
| `package.json` engines | `>=18` | `>=22.5.0` |
| `README.md` | "any Node 18+ host works" | Node 22 or later, with the reason |
| `deploy/README.md` | install Node 20 | install Node 22 |
| `deploy/GO-LIVE-RUNBOOK.md` | install Node 20 | install Node 22 |
| `render.yaml` | *nothing* — took the platform default | `NODE_VERSION: "22"` |
| `Dockerfile` | `node:22-alpine` | unchanged; it was the only correct one |

Pinned by `backend/test/preflight.test.mjs`, which reads all six files and
fails if any of them drifts.

### 2.2 The container image could not start

The `Dockerfile` copied `backend`, `frontend` and `shared`.
`backend/lib/blog.js` reads `content/blog` at module scope, so the image built
cleanly and then died with `ENOENT` on scandir before binding a port.

The Render route never showed it: that build runs `npm ci` against the whole
repository checkout, so the directory was always present. The container and
VPS routes — the documented Docker path — could not start at all.

- `COPY content ./content` and `COPY BUILD_COMMIT ./BUILD_COMMIT` added.
- `blog.js` now survives a missing directory: the site runs, the blog is
  empty, and it says so on stderr.
- `backend/test/deploy.test.mjs` now scans all 139 application source files
  for `path.join(root, …)` and asserts every root path it finds is `COPY`ed
  into the image. This class of defect cannot recur silently.

### 2.3 The proxy would have refused uploads the application accepts

`deploy/nginx-etablix.conf` set `client_max_body_size 60m` against a comment
saying "10 MB each, five per submission". The application allows 25 MB and 20
files. A large tender pack would have been refused by nginx with an HTML error
page instead of the application's JSON — a broken upload in the browser and
nothing in the application log. Raised to 520m.

### 2.4 The upload limit and the error message disagreed

The limit was 25 MB; the message said "must be 10 MB or smaller". Somebody
with a 14 MB drawing was told to shrink a file that would have been accepted.
The limit is named once now and the message quotes it.

---

## 3. Dependencies and the production build

`npm audit --omit=dev` reported **6 moderate advisories. Now 2, and they are
the same one counted twice.**

| Package | Was | Now | Why |
|---|---|---|---|
| `nodemailer` | 9.1.0 | 10.0.3 | `resolveContent()` bypassed `disableFileAccess` |
| `qs` | 6.15.3 | 6.16.0 | array-limit bypass and a DoS. Express 4 pins `~6.15`, so it is forced by a declared `overrides` entry rather than by upgrading to Express 5 across 26 import sites |
| `multer` | 1.4.5-lts.2 | 2.3.0 | 1.x is end of life; 2.x is the maintained line. Upload behaviour re-verified end to end |
| `exceljs` | 4.4.0 | **4.4.0** | see below |

**The one deliberately not "fixed".** `exceljs` depends on `uuid` 8.3.2, which
carries an advisory for `v3/v5/v6` when called with a caller-supplied buffer.
`exceljs` calls only `v4()` with no buffer, in conditional-formatting
extensions, and this application only ever *reads* workbooks. The offered fix
downgrades `exceljs` to 3.4.0, a breaking change that would break the workbook
writer, to close a path that cannot be reached. The decision is asserted in
`backend/test/preflight.test.mjs` with the reasoning attached, so it is
auditable rather than an oversight.

All seven declared dependencies are genuinely used — three of them through
dynamic `import()` in `backend/lib/extract.js`, which is why a naive scan
would call them unused. Nothing was removed.

**The build, proved rather than asserted.** Docker is not available in this
environment, so the container could not be built here; what was run is
exactly what the `Dockerfile` and `render.yaml` run, over exactly the files
the image copies:

    npm ci --omit=dev            clean, 171 packages, no peer warnings
    NODE_ENV=production node backend/server.js
    /api/health                  200, build stamp present
    /                            200, 58 kB
    /blog/ and /blog/feed.xml    200
    Content-Security-Policy      present

---

## 4. Boot checks — four ways it could start wrong and look fine

`backend/server.js` is now a twenty-line entry point that runs
`backend/lib/preflight.js` and then loads the application. It has to be
separate: ES module imports resolve before any code runs, so a guard inside
the application never executes on the runtime it is meant to catch.

It **refuses to start** — not warns — on any of:

1. **Node older than 22.5**, naming `node:sqlite` and giving the install
   command.
2. **`NODE_ENV=production` without `ETABLIX_ADMIN_EMAIL` and
   `ETABLIX_ADMIN_PASSWORD`.** This is the important one. Without them the
   store seeds three demo employees whose passwords are written in this
   repository. The site would come up looking finished, with anybody who has
   read the source able to sign in as an administrator, and nothing on the
   page would say so. An admin password under 12 characters is also refused —
   it is the only account on a new instance.
3. **`NODE_ENV=production` without `ETABLIX_TOKEN_SECRET`**, which would
   generate a random signing secret per process and sign every employee out
   on every restart.
4. **A data directory that cannot be written**, found at boot rather than by
   the first client to upload something.

Verified by running it: a bare production boot prints both reasons and exits;
a configured one starts, and the resulting instance has **one user and no
demo records** — the demo logins are refused.

---

## 5. Demo and test data

Already correct by design and now enforced. With admin credentials set, the
seed writes **only** that administrator, and twelve collections — leads,
suppliers, projects, schedule, budget, RFIs, inspections, non-conformances,
risks, agent runs, API keys, sensors — start empty. The only seeded collection
that survives is the agent catalogue, which is reference data rather than
business records.

Confirmed against a real production boot: one user, zero projects, zero risks,
`admin@etablix.com` refused.

The Control Desk also carries a "Clear all demo & test data" action for an
instance that was run in demo mode first.

---

## 6. Security

`deploy/SECURITY.md` is the full statement. The change made in this pass:

**Every security header is now set by the application, on every route.** They
existed only in `deploy/Caddyfile`, which means the Render blueprint and the
nginx vhost both shipped with no HSTS, no `nosniff`, no frame protection and
no policy of any kind.

The header that does the work is
`Content-Security-Policy: script-src 'self'` with **no** `'unsafe-inline'`.
To make that possible, all ten inline scripts in the repository were moved
into files — with `'unsafe-inline'` present, any text that reaches a page as
markup executes and the policy is decoration.

Verified in Chromium across 21 public pages, the three client-facing portals,
the Control Desk's 11 tabs and 3 standalone internal pages: **zero policy
violations, zero JavaScript errors.**

### On "end-to-end encryption and hacker-impenetrable"

Both were asked for. Neither can be delivered, and the honest answer is worth
more than an attempt:

- **End-to-end encryption means the server cannot read the content.** This
  platform exists to read the content: the agents read a client's invitation
  to tender and write a requirements register from it, the document studio
  renders a numbered report, the engines compute a time bar from a recorded
  event. All of that needs the plaintext server-side. A version where
  documents are encrypted in the browser and the server holds only ciphertext
  is a file locker, not this product, and claiming both would be claiming
  something that cannot exist.
- **Nothing reachable from the internet is impenetrable**, and anybody who
  says otherwise about their own system is selling.

What is available instead, and worth doing: full-disk encryption on the host
with a `chmod 700` data directory, backups encrypted with a key held
elsewhere, and the retention policy that already runs. Section *What is left*
of `SECURITY.md` names the five remaining gaps, of which the largest is the
absence of a second factor on employee sign-in.

---

## 7. Mobile

**Measured, then fixed, then measured again** in Chromium at 390 × 844.

| | Before | After |
|---|---|---|
| Public pages that fit the viewport | 7 of 15 | **15 of 15** |
| Worst public overflow | 170 px | **0 px** |
| Control Desk overflow | 574 px on every tab | **0 px on 10 of 11 tabs, 3 px on the eleventh** |

The cause was one rule of CSS rather than eight design mistakes: a grid or
flex child has `min-width: auto`, so a track cannot shrink below the widest
unbreakable thing inside it. `.compare` carries `min-width: 720px` inside
`.compare-wrap`, which has `overflow-x: auto` and should have absorbed it —
but the wrapper is itself a grid child, so the 720 px propagated up through
`.reveal`, `.split` and `.container` and pushed the whole page sideways. The
scroll wrappers were correct all along and were never allowed to work.

Nothing was fixed with `overflow-x: hidden` on the body. That removes the
scrollbar and keeps the broken layout, and it is the version of this fix that
looks like it worked. `backend/test/mobile.test.mjs` asserts it is absent.

This mattered beyond phones: Google indexes the mobile rendering, so the
version being ranked was the one that panned.

### Go / no-go for packaging

**Go for a PWA, with three things to add first. No-go for a native wrapper
today**, and the reason is auth rather than layout.

Ready now: responsive at phone width, no horizontal pan, no JavaScript
errors, tables in scroll wrappers, the tab bar scrolls, every API endpoint
works from a mobile browser, and no cookies — so nothing depends on
third-party cookie behaviour in a WebView.

Blockers, named rather than glossed:

1. **The session lives in `sessionStorage`.** It survives a reload and does
   not survive the tab closing. In a browser that is a sensible security
   choice; in a home-screen PWA or a WebView it means signing in every time
   the app is reopened, which will be reported as a bug. The fix is a
   deliberate decision about session lifetime, not a code tweak — it trades
   convenience against the blast radius of a stolen device.
2. **No manifest, no `theme-color`, no `apple-touch-icon`, no service
   worker.** Without a manifest it cannot be installed to a home screen at
   all. These are small and additive; they are simply not there yet.
3. **No offline story.** Every screen is server-rendered data. A wrapper with
   no network shows empty states. For a site-based user that is the difference
   between useful and not, and it needs deciding before packaging rather than
   after.

Recommendation: the web platform is stable enough to package **as a PWA**
once item 2 is added and item 1 is decided. A native wrapper should wait for
both, because shipping one that signs people out on every launch spends
goodwill that is hard to get back.

---

## 8. What was not done, and why

| Asked | Status | Why |
|---|---|---|
| Stabilise Firebase App Hosting + Next.js | **Not done** | Neither exists in this repository. It is a migration with its own decisions — starting with moving off a local SQLite file — and should be scoped as such |
| Fix TypeScript / bundler errors | **Not applicable** | There is no TypeScript and no bundler |
| `next build` passes | **Not applicable** | The equivalent for this stack was run instead, in section 3 |
| A live production URL | **Not done** | Deploying is an outward-facing action and needs hosting credentials this session does not have. `deploy/GO-LIVE-RUNBOOK.md` is the ordered path; the blockers to a green deploy that were in the code are fixed |
| End-to-end encryption | **Cannot be delivered** | Section 6 |
| Hacker-impenetrable | **Cannot be claimed** | Section 6 |
| Mobile packaging | **Held** | Section 7. The web platform has to be stable first, and now is — but the three named items come before packaging |

---

## 9. The full suite

    backend/test/run-all.sh

Twenty-eight unit suites and twenty-one end-to-end suites, against a scratch
database, on a spare port, with their own mock model provider. Everything
reported here is covered by it.
