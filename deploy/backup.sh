#!/bin/bash
# Nightly backup of the ETABLIX data — the SQLite database and the uploaded
# documents — with verification, because an unverified backup is a hope.
#
#   Install:  cp deploy/backup.sh /opt/etablix-backup.sh && chmod +x /opt/etablix-backup.sh
#   Cron:     printf '15 2 * * * root /opt/etablix-backup.sh >>/var/log/etablix-backup.log 2>&1\n' \
#               > /etc/cron.d/etablix-backup
#   Test now: /opt/etablix-backup.sh
#
# WHAT THIS SCRIPT USED TO DO WRONG, AND WHY IT MATTERED.
#
# It archived /opt/etablix/backend/data and wrote its "I ran" stamp there too.
# The container does not use that path. deploy.sh mounts a NAMED DOCKER VOLUME
# at /app/backend/data:
#
#     -v "$VOLUME:/app/backend/data"
#
# So the old script tarred the repository checkout's data directory, which is
# empty, and wrote the stamp to a file the application never reads. Installed
# exactly as its own instructions said, it produced an empty archive AND left
# the backup alert firing for ever — the worst combination available, because
# the operator has a cron entry, a log line saying "backup written", a file in
# /var/backups, and nothing in it.
#
# It now reads the data out of the container and writes the stamp inside it.
#
# THE STAMP MEANS "A VERIFIED BACKUP EXISTS", NOT "THE SCRIPT RAN".
# It is written last, only after the archive has been checked for size and for
# the presence of the database snapshot. A failed backup therefore leaves the
# alert on, which is the entire point of having the alert.
#
# ---------------------------------------------------------------------------
# RESTORING. Deliberately not a script — a restore overwrites live data and
# should be typed by somebody who has decided to do it.
#
#   1. Stop the application so nothing writes while the volume changes:
#        docker stop etablix
#
#   2. Put the archive back into the volume:
#        docker run --rm -v etablix-data:/data -v /var/backups/etablix:/in:ro \
#          alpine sh -c 'rm -rf /data/* && tar -xzf /in/etablix-data-<STAMP>.tar.gz -C /data'
#
#   3. Remove the snapshot the archive carries — it is a copy of the database,
#      not the database, and leaving it behind is confusing later:
#        docker run --rm -v etablix-data:/data alpine rm -f /data/backup-snapshot.sqlite
#
#   4. Start, and check the store loaded rather than assuming it did:
#        docker start etablix
#        docker exec etablix wget -qO- http://localhost:3000/api/health
#
# TEST THIS ONCE, ON PURPOSE, BEFORE YOU NEED IT. A restore procedure that has
# never been run is a paragraph, not a capability.

set -euo pipefail

NAME=${ETABLIX_CONTAINER:-etablix}
BACKUP_DIR=${ETABLIX_BACKUP_DIR:-/var/backups/etablix}
KEEP_DAYS=${ETABLIX_BACKUP_KEEP_DAYS:-30}
MIN_BYTES=${ETABLIX_BACKUP_MIN_BYTES:-4096}
DATA=/app/backend/data
SNAP=backup-snapshot.sqlite
STAMP=$(date +%Y%m%d-%H%M)
ARCHIVE="$BACKUP_DIR/etablix-data-$STAMP.tar.gz"

say() { echo "[$(date -Is)] $*"; }
die() { echo "[$(date -Is)] BACKUP FAILED: $*" >&2; exit 1; }

docker inspect -f '{{.State.Running}}' "$NAME" 2>/dev/null | grep -q true \
  || die "container '$NAME' is not running — nothing to back up"

mkdir -p "$BACKUP_DIR"

# ---- 1. a whole, checkpointed copy of the live database --------------------
#
# VACUUM INTO rather than copying the file. A live SQLite file plus a
# write-ahead log that holds changes the file does not is a torn copy, and a
# torn backup is worse than none because you find out on the day you need it.
if docker exec "$NAME" node -e "
  import('/app/backend/lib/store.js')
    .then((m) => { m.backupTo('$DATA/$SNAP'); process.exit(0); })
    .catch((e) => { console.error(e.message); process.exit(1); });
" >/dev/null 2>&1; then
  say "database snapshot taken with VACUUM INTO"
else
  die "could not take a database snapshot — refusing to write a torn backup"
fi

# ---- 2. archive the data OUT OF THE CONTAINER ------------------------------
#
# Streamed through stdout so there is no second image to pull and no second
# mount to get wrong. This is the line the old script got wrong.
docker exec "$NAME" tar -czf - -C "$DATA" . > "$ARCHIVE" \
  || die "could not archive $DATA out of the container"

# ---- 3. verify before claiming anything ------------------------------------
SIZE=$(stat -c %s "$ARCHIVE" 2>/dev/null || echo 0)
[ "$SIZE" -ge "$MIN_BYTES" ] \
  || die "archive is only ${SIZE} bytes (minimum ${MIN_BYTES}) — it is empty or truncated"

tar -tzf "$ARCHIVE" >/dev/null 2>&1 \
  || die "archive does not read back as a valid gzip tar"

tar -tzf "$ARCHIVE" | grep -q "$SNAP" \
  || die "the database snapshot is not in the archive — the data directory archived was the wrong one"

FILES=$(tar -tzf "$ARCHIVE" | wc -l)
say "archive verified: $ARCHIVE ($(numfmt --to=iec "$SIZE" 2>/dev/null || echo "$SIZE bytes"), $FILES entries)"

docker exec "$NAME" rm -f "$DATA/$SNAP" >/dev/null 2>&1 || true

# ---- 4. off-site, because a backup on the same VPS dies with the VPS -------
REMOTE="${ETABLIX_BACKUP_REMOTE:-}"
OFFSITE=no
if [ -n "$REMOTE" ] && command -v rclone >/dev/null 2>&1; then
  if rclone copy "$ARCHIVE" "$REMOTE:etablix-backups/"; then
    OFFSITE=yes
    say "off-site copy done: $REMOTE:etablix-backups/"
  else
    say "WARNING: off-site copy failed — the archive exists only on this VPS"
  fi
else
  say "NOTE: no off-site remote configured (set ETABLIX_BACKUP_REMOTE) — this archive exists only on this VPS"
fi

# ---- 5. retention ----------------------------------------------------------
find "$BACKUP_DIR" -name 'etablix-data-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
say "retained: $(find "$BACKUP_DIR" -name 'etablix-data-*.tar.gz' | wc -l) archives, ${KEEP_DAYS}-day window"

# ---- 6. the stamp, LAST, inside the container -------------------------------
#
# The application reads $DATA/last-backup through dataDir(), which resolves
# inside the container. Written here and only here means the backup alert
# clears when a VERIFIED backup exists and at no other time.
docker exec "$NAME" sh -c "date +%s > $DATA/last-backup" \
  || die "backup succeeded but the stamp could not be written — the alert will keep firing"

say "backup complete (off-site: $OFFSITE)"
