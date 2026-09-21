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

# Command substitution, not `| grep -q`, for the reason given at the
# verification step below: a reader that exits early can kill the writer and
# pipefail then blames the whole pipeline. The output here is five bytes so
# the race is academic, but there is no reason to keep the shape around.
RUNNING=$(docker inspect -f '{{.State.Running}}' "$NAME" 2>/dev/null || true)
[ "$RUNNING" = "true" ] \
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

# The listing is read ONCE, into a variable, and examined with shell pattern
# matching. It is deliberately not piped into grep -q.
#
# WHY. `tar -tzf "$ARCHIVE" | grep -q "$SNAP"` reads correctly and is wrong.
# grep -q exits the instant it finds the first match; that closes the pipe;
# tar is killed by SIGPIPE and exits 141; and `set -o pipefail` promotes the
# dead writer's status to the status of the whole pipeline. So the check
# failed BECAUSE it found what it was looking for, and a working backup was
# reported as a broken one. Reproduced on an archive with 5,002 entries:
# exit 141, "the database snapshot is not in the archive", snapshot present.
#
# Any pipeline here whose reader can finish early has the same defect. wc -l
# is safe because it consumes everything; grep -q, head and sed -q are not.
LIST=$(tar -tzf "$ARCHIVE" 2>/dev/null) \
  || die "archive does not read back as a valid gzip tar"

case "$LIST" in
  (*"$SNAP"*) ;;
  (*) die "the database snapshot ($SNAP) is not in the archive — $DATA held no snapshot, or the archive is of some other directory" ;;
esac

FILES=$(printf '%s\n' "$LIST" | wc -l)
say "archive verified: $ARCHIVE ($(numfmt --to=iec "$SIZE" 2>/dev/null || echo "$SIZE bytes"), $FILES entries)"

docker exec "$NAME" rm -f "$DATA/$SNAP" >/dev/null 2>&1 || true

# ---- 4. off-site, because a backup on the same VPS dies with the VPS -------
# ETABLIX_BACKUP_REMOTE takes either form:
#
#   b2                          → copied to b2:etablix-backups/
#   b2:etablix-backups-nseya    → copied exactly there
#
# The second form exists because Backblaze bucket names are unique across
# the whole of Backblaze, not across your account, so "etablix-backups" may
# already belong to a stranger. Finding that out by editing this script at
# 02:15 is not the intended experience.
REMOTE="${ETABLIX_BACKUP_REMOTE:-}"
case "$REMOTE" in
  ("") DEST="" ;;
  (*:*) DEST="${REMOTE%/}/" ;;
  (*) DEST="$REMOTE:etablix-backups/" ;;
esac
OFFSITE=no
if [ -n "$DEST" ] && command -v rclone >/dev/null 2>&1; then
  if rclone copy "$ARCHIVE" "$DEST"; then
    OFFSITE=yes
    say "off-site copy done: $DEST"
  else
    say "WARNING: off-site copy failed — the archive exists only on this VPS"
  fi
elif [ -n "$DEST" ]; then
  say "WARNING: ETABLIX_BACKUP_REMOTE is set to '$REMOTE' but rclone is not installed — this archive exists only on this VPS"
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
