# ETABLIX — operations and recovery

Everything here is a command you can run. Nothing is described in prose that
you would then have to work out for yourself at seven in the morning.

The one rule that matters: **the data lives in the `etablix-data` volume,
mounted at `/app/backend/data`.** Containers are disposable; that volume is
not. Every recovery below is about keeping it intact.

The store is **SQLite** — `db.sqlite` in that volume, with `db.sqlite-wal`
beside it while the application is running. Never copy those files by hand
while the app is up: a copy taken mid-transaction is torn, and you find out on
the day you need it. `deploy/backup.sh` takes a whole one with `VACUUM INTO`.

---

## Daily — is it healthy?

    curl -s https://etablix.com/api/health | python3 -m json.tool

| Field | What it tells you |
|---|---|
| `build` | the commit that is actually running — check this after every deploy |
| `busy` / `runningAgentRuns` | a diagnostic is in flight; do not deploy |
| `uptimeSeconds` | a number that keeps resetting means it is crash-looping |

Row counts and the rest are on the authenticated view, because a public URL
that publishes how many clients a business has is a public URL that publishes
how many clients a business has:

    curl -s -H "Authorization: Bearer $TOKEN" https://etablix.com/api/health/detail | python3 -m json.tool

| Field | What it tells you |
|---|---|
| `rows` | row counts per collection; a sudden drop means data loss |
| `heartbeat` | whether an outside monitor is being told this box is alive |
| `runPackBytes` | disk held by agent-run payloads |

## Weekly — prove the backup

    node tools/backup-verify.mjs

This archives the live data, restores it, **starts the application on the
restored copy**, and compares row counts and file counts. Exit 0 means a
restore has been demonstrated. Anything else, stop and read it.

Exit code 2 is special: it means the **live** store is unreadable. That is an
emergency, not a backup failure — go to *The store is corrupt* below.

Automate it:

    echo '15 2 * * * root cd /opt/etablix && /usr/bin/node tools/backup-verify.mjs >> /var/log/etablix-backup.log 2>&1' > /etc/cron.d/etablix-backup

---

## Deploying

**A push deploys itself to live within five minutes**, once the cron entry in
"Auto-deploy" below is installed. Nothing needs switching on.

To deploy immediately rather than waiting for the next tick:

    cd /opt/etablix && ./deploy/deploy.sh

The same script runs either way. It defers while a run is in flight, builds the
image, starts a candidate container, **health-checks the candidate before
touching the live one**, and only then switches. If the candidate does not
answer, nothing changes and it tells you so.

If nothing is reaching the live site, the first thing to check is whether cron
is actually installed:

    /opt/etablix-autodeploy.sh --status

Check what landed:

    curl -s https://etablix.com/api/health | grep -o '"build":"[^"]*"'

To turn auto-deploy on for a staging box:

    echo 'ETABLIX_AUTODEPLOY=1' >> /etc/default/etablix

### It deployed and the site is wrong

    cd /opt/etablix && ./deploy/rollback.sh

One command. It returns to the image that was running before the last deploy.

---

## The store is corrupt

Symptom: the site will not start, or `backup-verify.mjs` exits 2.

The store now writes atomically and keeps the previous good copy, so this
should not happen — but if it does:

    docker exec etablix ls -la /app/backend/data/

You are looking for `db.json`, `db.json.prev`, and any `db.json.corrupt-*`.

1. **The application recovers by itself.** On boot it tries `db.json`, then
   `db.json.prev`, keeping anything unreadable as `db.json.corrupt-<time>`.
   Restart it first and read the log:

       docker restart etablix && docker logs --tail 40 etablix

   A line saying `RECOVERED FROM the previous good copy` means it is running,
   and you have lost at most the last write.

2. **If it seeded a new empty store** — the log says so in capitals — stop it
   immediately so nothing writes over the evidence, and restore from backup:

       docker stop etablix
       tar -xzf /var/backups/etablix/etablix-data-<stamp>.tar.gz -C /tmp
       docker run --rm -v etablix-data:/data -v /tmp/data:/restore alpine \
         sh -c "rm -rf /data/* && cp -a /restore/. /data/"
       docker start etablix
       curl -s https://etablix.com/api/health | grep -o '"rows".*'

3. Never delete a `db.json.corrupt-*` file until you have a verified restore.

---

## A diagnostic run failed

Runs are six passes over the client's whole document pack. Every completed
pass is saved as it lands.

1. Open the run in **Organisation → AI agents**. It says how far it got.
2. If it says passes were saved, press **Resume from pass N** — only the
   missing passes are run again.
3. To see why it failed:

       docker exec etablix tail -20 /app/backend/data/errors.log

4. A run interrupted by a restart is marked automatically and is resumable.
   A run that failed on the model itself will carry the API error.

---

## Enquiries are going to junk

    node tools/mail-doctor.mjs etablix.com

It reads the live SPF, DKIM and DMARC and tells you which is wrong and how to
fix it. Zero blocking problems is the target. See
`deploy/EMAIL-DELIVERABILITY.md` for the four fixes in order.

---

## Someone is flooding the public forms

The enquiry and supplier forms are rate limited per address (10 and 6 per
minute). A flood returns `429` with a `Retry-After`. Nothing to do unless it
is sustained, in which case block at the proxy:

    docker logs --tail 200 etablix | grep 'human-check: rejected'

---

## Restarting safely

    docker stop -t 30 etablix && docker start etablix

The `-t 30` matters. On SIGTERM the application stops taking new requests,
lets in-flight ones finish, marks any running diagnostic as resumable, and
flushes the store before exiting. Killing it without that grace is what used
to destroy runs.

---

## Emergency numbers

| Thing | Where |
|---|---|
| Data volume | `etablix-data`, mounted at `/app/backend/data` |
| Backups | `/var/backups/etablix/` — 30 days |
| Error log | `/app/backend/data/errors.log` inside the container |
| Previous image | `/var/lib/etablix-previous-image` |
| Environment | `/opt/etablix/etablix.env` — contains secrets, back it up separately |

---

## Staging — test here, never on live

A second container on the same box, with its own database and **mail
physically disabled**, so testing the client journey cannot email a real
client.

    cd /opt/etablix && ./deploy/staging.sh                    # build the branch head
    cd /opt/etablix && ./deploy/staging.sh --with-live-data   # ...starting from a copy of live
    cd /opt/etablix && ./deploy/staging.sh --reset            # throw the staging data away

It binds to loopback, because a fresh staging database seeds the demo accounts
and their passwords are in the source. Reach it through a tunnel:

    ssh -L 3001:localhost:3001 <you>@<server>     # then http://localhost:3001

## Auto-deploy — ON, and pointed at LIVE

A push reaches the live site by itself, within five minutes. Nothing needs
switching on. Install it once, as root:

    echo '*/5 * * * * root flock -n /run/etablix-deploy.lock /opt/etablix/deploy/autodeploy.sh' > /etc/cron.d/etablix-autodeploy
    /opt/etablix/deploy/autodeploy.sh --status

**Cron points at the script inside the repository, deliberately.** The earlier
instruction copied it to `/opt` first. That copy then went stale — cron kept
running yesterday's dispatcher while the repository moved on — and, worse, a
copy at `/opt` looked for its siblings at `/opt/deploy.sh` and
`/opt/staging.sh`, paths that exist nowhere, failing with a message naming a
location that appears nowhere in this repository. Run it where it lives.

**The script alone does nothing until that cron entry exists.** Changing a
default in a file that nothing runs is the failure that note exists to stop.
`--status` says in four lines whether it is on, where it points, whether it is
paused, whether cron is actually installed, and which commit is live.

### Why pointing it at live is safe

Every protection lives in `deploy.sh` and runs on every tick:

- **Nothing new costs nothing.** If the container is already on that commit it
  exits without rebuilding, so cron cannot recreate the container under
  somebody mid-test.
- **It defers during an agent run.** It polls `/api/health` for `busy` every
  minute and waits. That is what used to destroy runs, and it is handled where
  it belongs rather than by refusing to deploy at all.
- **It proves the build answers before switching.** The new image starts on a
  spare name and is health-checked; a build that does not answer is refused and
  the live container is never touched.
- **The way back is one command.** The previous image is recorded, so
  `./deploy/rollback.sh` restores it.

### Turning it off, or aiming it elsewhere

    printf 'ETABLIX_AUTODEPLOY=0\n' >> /etc/default/etablix                  # off entirely
    printf 'ETABLIX_AUTODEPLOY_TARGET=staging\n' >> /etc/default/etablix     # staging instead of live

To rebuild staging even though the commit has not moved: `FORCE=1 ./deploy/staging.sh`.

Freeze everything while you are mid-test, without editing cron:

    mkdir -p /var/lib/etablix && touch /var/lib/etablix/pause-deploy   # nothing is rebuilt
    rm /var/lib/etablix/pause-deploy                                   # resume

## Watching — so silence is the alarm

Three layers, and the first is the only one that survives the box dying.

**1. Outside the box.** Create a free check at any heartbeat monitor
(healthchecks.io, Better Stack, Cronitor) with a period of five minutes and a
grace of ten, then put its URL in the environment file:

    HEARTBEAT_URL=https://hc-ping.com/<uuid>

The application pings it every two minutes. If the container, the disk or the
machine dies, the pings stop and the monitor tells you. Nothing running on
this box can tell you this box has stopped.

**2. Outside the container.** The watchdog restarts a wedged container — but
never one that is busy with an agent run.

    cp deploy/watchdog.sh /opt/etablix-watchdog.sh && chmod +x /opt/etablix-watchdog.sh
    echo '*/2 * * * * root /opt/etablix-watchdog.sh' > /etc/cron.d/etablix-watchdog

**3. Inside.** The scheduler now raises an alert when an agent run fails, when
outbound mail starts failing, when no backup has been recorded for 36 hours,
and when the DNS stops vouching for the domain's mail. Set a webhook so those
reach you without depending on email, which is the thing most likely to be
broken:

    ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...

## Retention and erasure

A client asking for their documents back is answered from the desk.

- **What we hold:** `GET /api/clients/:id/holdings` lists every file, answer,
  deliverable and invoice, with the retention period against each.
- **Erasing the pack:** `POST /api/clients/:id/erase-pack` with a stated
  reason and `confirm: true`. The files are deleted from the disk, the
  checklist lines record that they were erased, and the erasure is written to
  the append-only ledger.
- **Automatic:** an information pack is erased twelve months after the
  engagement closes, by the scheduler, without anybody remembering.
- **What is kept:** the report, the invoices and the audit trail, for six
  years — the Limitation Act 1980 and HMRC, not a preference.

---

## What this runbook does not yet cover

Stated plainly rather than left to be discovered:

- **There is no staging environment with a realistic data set unless you make
  one.** `./deploy/staging.sh --with-live-data` copies live; without that flag
  staging starts empty and seeded.
- **The heartbeat and the watchdog do nothing until you configure them.** Both
  are three lines above and neither costs anything.
- **PostgreSQL is still the answer for more than one instance.** SQLite gives
  transactions, migrations and a provable history on one box, which is what
  the finding actually needed; the day a second instance writes at the same
  time, the store module is the only thing that changes.
