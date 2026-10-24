# Defects

One record per defect. Severity: P0 catastrophic, P1 critical, P2 high,
P3 medium, P4 low.

---

## DEF-001 — Five dependency advisories, one critical — FIXED

- **Severity:** P1 · **Blocker:** was yes · **Area:** dependencies · **Status:** FIXED in `b35ff6f`
- **Found by:** `npm audit --omit=dev`
- **Actual:** 7 advisories — 1 critical, 4 high, 2 moderate.
  - `proxy-addr` 2.0.7 — **critical**, IP spoofing via an IPv4-mapped IPv6 trust
    subnet. Reached through Express, and this application sits behind a reverse
    proxy, which is exactly the configuration the advisory concerns.
  - `multer` 2.3.0 — high, denial of service through orphaned disk writes on
    aborted uploads. The client portal accepts uploads from outside.
  - `nodemailer` 10.0.3 — high, malformed envelope recipient from a quoted local part.
  - `body-parser` 1.20.8 — high, denial of service via trailing bytes after a
    compressed request.
  - `brace-expansion` — high, quadratic-time expansion.
- **Root cause:** resolved versions in the lockfile had drifted behind the
  declared semver ranges. Nothing in `package.json` was wrong.
- **Fix:** `npm audit fix` (not `--force`). `package.json` unchanged — the
  existing ranges already permitted every fix, so only the lockfile moved.
- **Retest:** `npm audit` → 2 moderate (see DEF-002). Application boots,
  `/api/health` returns `ok:true`. Suite unchanged at 54 of 55 files.
- **Residual risk:** none for these five.

---

## DEF-002 — `uuid` advisory via `exceljs` — ACCEPTED, with reason

- **Severity:** P4 · **Blocker:** no · **Area:** dependencies · **Status:** ACCEPTED
- **Actual:** 2 moderate advisories, both the same issue: `uuid` 8.3.2 reached
  through `exceljs` 4.4.0.
- **Why it is not being fixed:**
  1. npm's remedy is `audit fix --force`, which installs `exceljs@3.4.0` — a
     **downgrade** from the 4.4.0 we run. 4.4.0 is the latest release. That is a
     regression offered as a remediation.
  2. **It is not reachable.** The advisory is a missing buffer bounds check in
     uuid v3, v5 and v6 *when a `buf` argument is supplied*. `exceljs` imports
     uuid in exactly one file — `lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js`
     — and takes only `v4`. No `buf` is passed.
- **Review trigger:** revisit if `exceljs` ships a release that moves off uuid 8.

---

## DEF-003 — A test that can never pass, so the suite is permanently red — OPEN

- **Severity:** P2 · **Blocker:** no (for launch) / yes (for trusting the suite)
- **Area:** test integrity · **Status:** OPEN
- **Actual:** `backend/test/upload-dedupe.test.mjs` fails on every run of
  `node --test backend/test/*.test.mjs`.
- **Root cause:** it is an integration test that requires a server somebody
  started by hand. Its own header says so:
  `PORT=3311 node backend/server.js &`. Inside the suite nothing is listening,
  so `fetch` returns `ECONNREFUSED`.
- **Impact:** the suite's exit code has been non-zero for as long as this file
  has existed, which trains everyone to ignore it. A red suite that is *expected*
  to be red cannot report a real regression. This is the same failure class as a
  test that dirties the working tree.
- **Note on process:** this was twice reported in conversation as "a
  pre-existing sandbox failure". That was wrong — loopback works in this
  environment, proven by binding port 3399 and fetching `/api/health`. The
  diagnosis changed once the test's own header was read.
- **Fix options, not yet applied:**
  1. Have the test start and stop its own server on an ephemeral port, as
     `backend/test/bid-documents.test.mjs` now does for its builder. Preferred.
  2. Move it, and the other `*.e2e.mjs` files that share the assumption, out of
     the glob the suite runs, into an explicitly invoked integration target.
- **Scope:** ~20 `*.e2e.mjs` files share the hard-coded `admin@etablix.com` /
  `etablix-admin-2026` login and the assumption of an already-running server, so
  this is a pattern, not one file.

---

## DEF-004 — Demo accounts may persist in production — UNRESOLVED, needs the operator

- **Severity:** **P0 if confirmed** · **Blocker:** yes if confirmed
- **Area:** authentication · **Status:** AWAITING EVIDENCE
- **Finding:** `backend/lib/store.js` seeds three demo accounts with passwords
  that are committed to this repository in roughly twenty test files:
  `admin@etablix.com` / `etablix-admin-2026` (administrator),
  `pm@etablix.com` / `etablix-pm-2026`, `qa@etablix.com` / `etablix-qa-2026`.
  Confirmed in an isolated instance: that first pair returns a **full admin
  token**.
- **The design is correct.** `isDemoMode` is false when `ETABLIX_ADMIN_EMAIL`
  and `ETABLIX_ADMIN_PASSWORD` are both set, and the store then seeds only that
  one administrator.
- **Why it is still open.** Seeding happens **once**, on first boot against an
  empty store. If the live store was seeded before those variables were set, the
  demo rows persist no matter what the environment says today. `isDemoMode`
  governs seeding, not existing rows.
- **What settles it** (lists emails and roles only — no passwords echoed):

      docker exec etablix node --input-type=module -e '
      import { collection } from "/app/backend/lib/store.js";
      const u = collection("users");
      console.log(u.length + " account(s):");
      for (const x of u) console.log(`  ${x.email}  role=${x.role}  active=${x.active !== false}`);
      '

- **If `admin@etablix.com` appears:** anyone who can read this repository can
  sign in as administrator on the live site. Immediate actions, in order:
  deactivate or delete the three demo rows; set `ETABLIX_ADMIN_EMAIL` and
  `ETABLIX_ADMIN_PASSWORD`; bump `sessionsValidFrom` on every account to
  invalidate tokens already issued; then re-run the check.
- **Mitigating, but not a fix:** login is rate limited per account (10 failures
  per 15 minutes), which stops guessing — it does nothing against a password
  that is published.

---

## DEF-005 — The deployed base image did not pick up a Node security release — FIXED

- **Severity:** P1 · **Blocker:** was yes · **Area:** build / supply chain
- **Status:** FIXED in `a1aba71`
- **Actual:** the container ran Node 22.22.2 the day after Node shipped 22.23.4,
  which fixes ten vulnerabilities including CVE-2026-111497, an out-of-bounds
  write in the Brotli decoder that can lead to remote code execution.
- **Root cause:** `deploy.sh` and `staging.sh` ran plain `docker build`, which
  reuses the cached `node:22-alpine` layer. The floating tag floated nowhere.
- **Why it mattered here specifically:** the signals watcher is built entirely on
  `fetch()` against fifteen external hosts, and Node's `fetch` advertises
  `accept-encoding: br`, so the vulnerable decoder is handed data from sites this
  business neither owns nor controls.
- **Fix:** both builds now pass `--pull`; `engines.node` raised to `>=22.23.4`;
  `backend/test/deploy.test.mjs` asserts both, so it cannot regress silently.
- **Retest needed on the server:** `/opt/etablix/deploy/deploy.sh` then
  `docker exec etablix node -v` must print 22.23.4 or higher. **Not yet
  confirmed** — this is on the human action list.
