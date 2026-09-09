# ETABLIX — operations and recovery

Everything here is a command you can run. Nothing is described in prose that
you would then have to work out for yourself at seven in the morning.

The one rule that matters: **the data lives in the `etablix-data` volume,
mounted at `/app/backend/data`.** Containers are disposable; that volume is
not. Every recovery below is about keeping it intact.

---

## Daily — is it healthy?

    curl -s https://etablix.com/api/health | python3 -m json.tool

| Field | What it tells you |
|---|---|
| `build` | the commit that is actually running — check this after every deploy |
| `busy` / `runningAgentRuns` | a diagnostic is in flight; do not deploy |
| `rows` | row counts per collection; a sudden drop means data loss |
| `uptimeSeconds` | a number that keeps resetting means it is crash-looping |

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

Auto-deploy is **off by default**, deliberately: deploying to a box someone is
testing on destroys their work. Deploy when you mean to.

    cd /opt/etablix && ./deploy.sh

It refuses to deploy while a run is in flight, builds the image, starts a
candidate container, **health-checks the candidate before touching the live
one**, and only then switches. If the candidate does not answer, nothing
changes and it tells you so.

Check what landed:

    curl -s https://etablix.com/api/health | grep -o '"build":"[^"]*"'

To turn auto-deploy on for a staging box:

    echo 'ETABLIX_AUTODEPLOY=1' >> /etc/default/etablix

### It deployed and the site is wrong

    cd /opt/etablix && ./rollback.sh

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

## What this runbook does not yet cover

Stated plainly rather than left to be discovered:

- **There is no uptime monitoring.** Nothing tells you the site is down except
  looking. Point an external monitor at `/api/health` and alert on it.
- **There is no alert when a backup fails.** The cron writes to a log nobody
  reads. Set `ALERT_WEBHOOK_URL` and have the cron post to it on failure.
- **The store is still a JSON file.** It is now safe against interruption, but
  it has no transactions and no schema. That is the open structural item.
