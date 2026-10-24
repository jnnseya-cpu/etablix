# Evidence ledger

Every row below is something that was executed, not read. Static review can
produce a FAIL; it can never produce a PASS.

- **Build under test:** commit `b35ff6f`, branch `claude/construction-marketing-website-ndn7cx`
- **Environment:** isolated instance, `ETABLIX_DATA_DIR` on a scratch volume, port 3401, demo seed (no admin env vars set)
- **Safety:** no production data, no outbound mail, no payment provider contacted
- **Run date:** 24 October 2026

## Cycle 0 — recon and safety

| ID | Test | Status | Evidence |
|---|---|---|---|
| ENV-01 | Isolated instance boots, `/api/health` answers | PASS | `{"ok":true,"service":"etablix"}` |
| ENV-02 | No production data reachable from the test instance | PASS | scratch `ETABLIX_DATA_DIR`, fresh seed |
| SEC-SCAN-01 | Secret scan, working tree | PASS | only `sk-ant-mock` placeholders, all in test files |
| SEC-SCAN-02 | Secret scan, **full git history** (`git log --all -p`) | PASS | no private keys, AWS keys, GitHub or Slack tokens in any commit |
| DEP-01 | `npm audit`, before | FAIL | 7 advisories: 1 critical, 4 high, 2 moderate |
| DEP-02 | `npm audit`, after fix | PASS, with documented exception | 2 moderate remain — see `defects.md` DEF-002 |

## Cycle 1 — security headers (6.14)

Tested against the application directly. **HSTS is set by Caddy at the edge**
(`deploy/Caddyfile` line 9: `max-age=31536000; includeSubDomains`), so its
absence from the app's own response is correct rather than a defect — an initial
FAIL that reading the real deployed config overturned.

| ID | Test | Status | Evidence |
|---|---|---|---|
| HDR-CSP | Content-Security-Policy present | PASS | `default-src 'self'; script-src 'self'; …` |
| HDR-HSTS | Strict-Transport-Security | PASS (at edge) | Caddyfile line 9 |
| HDR-NOSNIFF | X-Content-Type-Options | PASS | `nosniff` |
| HDR-REF | Referrer-Policy | PASS | `strict-origin-when-cross-origin` |
| HDR-PERM | Permissions-Policy | PASS | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` |
| HDR-XPB | X-Powered-By suppressed | PASS | header absent |

## Cycle 1 — authentication and authorisation (6.8)

| ID | Test | Status | Evidence |
|---|---|---|---|
| AUTH-ANON-1..6 | `/api/users`, `/api/clients`, `/api/signals`, `/api/org`, `/api/admin/overview`, `/api/payments` refuse anonymous | PASS | HTTP 401 on all six |
| TOK-EMPTY | No token rejected | PASS | HTTP 401 |
| TOK-GARBAGE | Malformed token rejected | PASS | HTTP 401 |
| TOK-ALGNONE | Forged `alg:none` JWT claiming `role:admin` rejected | PASS | HTTP 401 |
| ESC-PM | Project manager cannot list users | PASS | HTTP 403 |
| ESC-QA | QA inspector cannot list users | PASS | HTTP 403 |
| ENUM-LOGIN | Login does not reveal whether an account exists | PASS | known 401, unknown 401; the password is verified even when no account exists, so response time does not leak the staff list |
| RATE-LOGIN | Brute force blocked | PASS | 429 at attempt 11, `Retry-After: 900`. Two independent counters: per-address 30, per-account 10, 15-minute window |
| ERR-LEAK | Malformed body returns no stack trace | PASS | HTTP 400, parser message only — no path, no frame, no internals |

### A correction worth recording

RATE-LOGIN was first recorded FAIL: twelve wrong passwords produced no 429. The
test was wrong, not the platform. Those passwords were below the minimum length,
so each was rejected at validation **before reaching the counter**. Re-run with
valid-length passwords, the limiter fired at attempt 11, exactly as configured.
A test that asserts the wrong threshold manufactures a defect, and a
manufactured defect costs the same to investigate as a real one.

## Architecture observations that earned a PASS on inspection

- `backend/middleware/auth.js` re-reads the account on **every** request rather
  than trusting the token: a deactivated employee loses access immediately, a
  demoted one loses the old role immediately, and `sessionsValidFrom` makes
  session revocation real. The role comes from the account, not the token.
- Login equalises response time between "no such account" and "wrong password"
  by verifying against a dummy hash when the account does not exist.

## NOT TESTED — these are not passes

| Area | Why | What it needs |
|---|---|---|
| Payments (6.12) | No sandbox keys supplied; real money must never move | Provider sandbox credentials |
| AI / agent evaluation (6.13) | No evaluation set exists | A labelled corpus and a decision on model spend |
| Performance and load (6.16) | No targets agreed, and load against the live VPS would affect a running business | Agreed targets and a window |
| DR / restore drill (6.21) | Requires restoring a real backup into isolation | Approval and a scratch host |
| Browser matrix, accessibility (6.17) | Chromium is available in this environment; not yet executed | Next cycle |
| Novice walkthrough (6.6) | Not yet executed | Next cycle |
| Production parity | This verdict applies to `b35ff6f` in isolation, not to what is live | Confirm the deployed SHA |
