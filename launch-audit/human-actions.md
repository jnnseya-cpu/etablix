# Human action list

Only items a person must do. Each says what is needed, why it blocks, and what
happens the moment it is supplied.

---

## HA-01 — Confirm whether the demo accounts exist in production — **BLOCKING**

**Why it blocks:** Gate 4 (Security) fails on any auth bypass. Three demo
passwords are committed to this repository; if the live store carries those rows,
anyone who can read the repo is an administrator on etablix.com. See DEF-004.

**What to run** (emails and roles only, no passwords echoed):

    docker exec etablix node --input-type=module -e '
    import { collection } from "/app/backend/lib/store.js";
    const u = collection("users");
    console.log(u.length + " account(s):");
    for (const x of u) console.log(`  ${x.email}  role=${x.role}  active=${x.active !== false}`);
    '

    docker exec etablix sh -c "echo \"ADMIN_EMAIL set: \${ETABLIX_ADMIN_EMAIL:+yes}\${ETABLIX_ADMIN_EMAIL:-NO}\"; echo \"ADMIN_PASSWORD set: \${ETABLIX_ADMIN_PASSWORD:+yes}\${ETABLIX_ADMIN_PASSWORD:-NO}\""

**On the answer:** if `admin@etablix.com` is absent, this closes as NOT
APPLICABLE and Gate 4 can proceed. If it is present, it becomes P0 and the
remediation in DEF-004 runs immediately.

---

## HA-02 — Confirm the Node security release reached the container — **BLOCKING**

**Why it blocks:** Gate 1 (Build integrity) requires the deployed build to be the
tested build. CVE-2026-111497 is reachable through the signals watcher's
`fetch()` calls. The code fix is pushed; the deploy is not confirmed.

    /opt/etablix/deploy/deploy.sh
    docker exec etablix node -v        # must print v22.23.4 or higher

**On the answer:** if it prints 22.22.2, the `--pull` did not take and the deploy
log needs reading. Do not use hPanel → Docker Manager for this: ETABLIX is not a
compose project there, it is built from this Dockerfile by `deploy.sh`.

---

## HA-03 — Decide the deletion question — **BLOCKS the cleanup phase only**

Two instructions in force contradict each other:

- the audit programme says to delete duplicate, obsolete and legacy files;
- the standing instruction is *"DO NOT DELETE ANYTHING ALREADY EXIST BUT IT NEED
  TO MERGE AND WORK WITH THE EXISTING STRUCTURE."*

Candidates that would be in scope either way include `render.yaml` (a Render
deployment config in a repository that deploys by Docker to a VPS),
`diagnostic-test/`, and any duplication across `business/`, `content/`, `deck/`
and `docs/`.

**Options:** (a) keep the standing rule — findings are reported with evidence,
nothing is deleted, the owner decides file by file; or (b) the programme wins for
one pass — deletions happen on a branch, each justified and import-checked, and
the diff is reviewed before it reaches the server. **Recommendation: (a).**

---

## HA-04 — Payment sandbox credentials — blocks Gate 6

Phase 6.12 cannot run without them, and real money must never move. No payment
behaviour can be scored until these exist. `backend/routes/payments.js` exists
and has not been exercised.

---

## HA-05 — Agree performance targets and a test window — blocks Gate 7

Defaults offered by the programme: critical API p95 under 500 ms, error rate
under 0.5%, LCP under 2.5 s on 4G, transaction success above 99.5%. These need
accepting or replacing, and load against the live VPS needs a window, because
twelve other containers share that machine.

---

## HA-06 — Approve a restore drill — blocks Gate 5

An unrestored backup is not a backup. This needs a scratch host and approval to
restore a real backup into isolation, then a recorded RTO and RPO.

---

## HA-07 — Fill in Section 3 of the programme

Every field was blank and has been inferred from the code. Values still needed
from a person rather than a file: expected launch traffic, peak concurrent users,
target regions and languages, which data is classed as sensitive, and who the
named approver is for irreversible actions. Each unanswered item stays a logged
launch risk.
