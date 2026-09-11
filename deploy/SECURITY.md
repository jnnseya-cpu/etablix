# ETABLIX — security posture

Written to be read by somebody deciding whether to put client documents into
this system. It states what is protected, how, and what is not — because a
security document that only lists strengths is a sales document.

Two claims are not made anywhere in this file, and will not be:

- **That the platform is end-to-end encrypted.** It is not, and the reason is
  architectural rather than a gap to close. See *Encryption*, below.
- **That it cannot be broken into.** Nobody can say that about any system
  that is reachable from the internet. What can be said is which attacks have
  been designed against, which are covered by tests that fail when the
  control is removed, and what is left.

---

## What an attacker would try, and what stops it

### Getting in as somebody else

| Attack | Control | Where |
|---|---|---|
| Guessing a password | scrypt, run on the thread pool so a burst of attempts cannot stall the process | `backend/lib/auth.js` |
| Brute force | per-account rate limit; a run of wrong passwords is refused | `backend/lib/ratelimit.js`, proved in `security.e2e` |
| Using a session after an account is disabled | every request re-checks the account, so deactivation ends sessions immediately | `backend/middleware/auth.js` |
| Using a session after a password reset | same check; the old session stops | `security.e2e` |
| Cross-site request forgery | **structurally not applicable** — the session token travels in an `Authorization` header, never in a cookie, so a third-party page cannot make the browser send it | `frontend/internal/js/app.js` |
| Sessions surviving a restart with a rotating secret | `ETABLIX_TOKEN_SECRET` is required in production and the server refuses to start without it | `backend/lib/preflight.js` |
| The demo accounts in this repository | the server refuses to start with `NODE_ENV=production` unless real admin credentials are set | `backend/lib/preflight.js` |

### Getting the browser to run something

`Content-Security-Policy: script-src 'self'` — with **no** `'unsafe-inline'`
and no `'unsafe-eval'`. Every inline script in the repository was moved into a
file to make that possible, because with `'unsafe-inline'` present any text
that reaches a page as markup executes and the policy is decoration.

`style-src` keeps `'unsafe-inline'` and that is a deliberate, recorded
compromise: injected CSS cannot execute, and the pages carry a hundred-odd
inline style attributes plus a `<style>` block in every generated document.

Also set on every response, by the application rather than by the proxy:
`X-Content-Type-Options: nosniff` (which is why an uploaded `.txt` cannot be
sniffed as HTML and become a page), `X-Frame-Options: DENY`,
`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
`form-action 'self'`, a referrer policy, a permissions policy, and HSTS —
production and https only.

They were previously in `deploy/Caddyfile` alone, which meant two of the three
supported deployment routes shipped with none of them.

### Getting data out through the API

- Every internal route is behind a session; role gates are checked on the
  server, never in the page.
- The Platform API is key-authenticated with **one scope per capability**, so a
  key that may raise a risk cannot move the programme and cannot register a
  webhook. Write scopes require a stated reason at minting.
- A revoked key is excluded at lookup rather than by emptying its scopes, so
  it fails even on the endpoints that need no scope.
- Inbound webhooks are verified by HMAC-SHA256 over the **raw** body and a
  timestamp, with the replay window checked before any comparison and a
  constant-time compare. A verified delivery is *recorded* — none of the three
  accepted events writes a delivery record, closes a defect, certifies a
  payment or runs an agent, so a leaked secret cannot do any of those.

### Getting something onto the disk

- Uploads are extension- and type-filtered, size-capped (25 MB, 20 files),
  written under generated names — never the client's filename — and removed
  when the request they arrived with fails.
- The proxy body limit is set to at least the application's, so a refused
  upload comes back as the application's JSON rather than the proxy's HTML.

---

## Encryption

### In transit

TLS, terminated at the proxy. Caddy obtains and renews certificates
automatically; the nginx route uses certbot; the managed route is automatic.
HSTS is sent in production so a browser that has seen the site once will not
try plain http again.

### At rest

**The database and the uploaded documents are not encrypted by the
application.** They are ordinary files in one directory. What protects them is
the host: disk encryption, file permissions and who can reach the machine.

That is a real limitation and it is worth stating what it does and does not
mean. Disk encryption protects against a disposed or stolen disk. It does not
protect against anybody who can run code on the host, because the key is
loaded while the machine is running. If a threat model includes the host
itself, this application is not where to solve it.

### Why not end-to-end

End-to-end encryption means the server cannot read the content. That is
incompatible with what this platform is for. The agents read a client's
invitation to tender and write a requirements register from it; the document
studio renders a numbered report; the engines compute a time bar from a
recorded event. Every one of those needs the plaintext, server-side.

A system could be built where documents are encrypted in the browser and the
server only stores ciphertext — but then it is a file locker, not an
operating platform, and nothing in the architecture above could run. Claiming
both would be claiming something that cannot exist.

**What is genuinely available instead**, and worth doing:

1. Full-disk or volume encryption on the host, plus a `chmod 700` data
   directory owned by the service account. Cheap, immediate, no code change.
2. Backups encrypted with a key held somewhere other than the machine they
   came from. `deploy/backup.sh` takes a consistent snapshot with
   `VACUUM INTO`; encrypting the output is the operator's step.
3. A retention policy, which is a stronger control than encryption for
   documents that do not need to exist any more. There is one, and it runs.

---

## Secrets

- Every credential comes from the environment. None is committed.
- The Anthropic key, the platform tokens and the inbound webhook secret are
  stored server-side and never returned to a browser unmasked.
- A subscriber's signing secret is shown once, at creation, and is never
  readable again — a secret a system can re-read is a secret in a log.
- `auditSecretStorage()` runs at boot and reports anything holding a secret
  where it should not.

---

## What is left, stated plainly

1. **No at-rest encryption in the application.** Covered above. The
   remediation is the host, and it is an operator step rather than a code
   change.
2. **No second factor on employee sign-in.** A stolen password is enough. This
   is the largest remaining gap for a small team and the right fix is TOTP on
   the admin role first.
3. **One process, one disk.** There is no horizontal scaling and no read
   replica, so availability depends on one host and its backups. That is a
   deliberate choice recorded in the store's own notes, and the API does not
   change on the day it stops being the right one.
4. **No intrusion detection.** Nothing watches for a pattern of requests that
   looks like enumeration. The rate limits blunt it; they do not report it.
5. **Dependency advisories.** Two moderate advisories remain, both the same
   one: `uuid` under `exceljs`. It applies to `v3/v5/v6` called with a caller
   supplied buffer; `exceljs` calls only `v4()` with no buffer, and the offered
   fix downgrades `exceljs` to 3.4.0 and breaks the workbook writer. The
   decision is recorded in `backend/test/preflight.test.mjs` so it is
   auditable rather than an oversight.

---

## Verifying any of this

    backend/test/security.e2e.mjs      the doors, and the headers
    backend/test/preflight.test.mjs    what the server refuses to start without
    backend/test/platformwrite.test.mjs  webhook signing, replay, scopes
    backend/test/deletion.test.mjs     that a deletion leaves a record

Every check in those files failed before the control it tests existed.
