#!/bin/bash
# Nightly backup of the ETABLIX data directory (the SQLite database and the
# uploaded documents). Keeps 30 days locally; copy the archive off-box for
# real durability (rsync/rclone to object storage).
#
# The database is copied with VACUUM INTO rather than by tarring the file in
# place. Copying a live SQLite file gives a torn copy — the write-ahead log
# holds changes the file does not — and a torn backup is worse than none,
# because you find out on the day you need it.
#
# Install: cp deploy/backup.sh /opt/etablix-backup.sh && chmod +x /opt/etablix-backup.sh
# Cron:    echo '15 2 * * * root /opt/etablix-backup.sh' > /etc/cron.d/etablix-backup

set -euo pipefail

DATA_DIR=/opt/etablix/backend/data
BACKUP_DIR=/var/backups/etablix
STAMP=$(date +%Y%m%d-%H%M)

mkdir -p "$BACKUP_DIR"

# A whole, checkpointed copy of the database, taken while it is running.
SNAP=$(mktemp -d)
trap 'rm -rf "$SNAP"' EXIT
if docker exec etablix node -e "import('/app/backend/lib/store.js').then(m=>{m.backupTo('/app/backend/data/backup-snapshot.sqlite');process.exit(0)})" >/dev/null 2>&1; then
  echo "database snapshot taken with VACUUM INTO"
else
  echo "WARNING: could not take a live snapshot — falling back to a file copy, which may be torn"
fi

tar -czf "$BACKUP_DIR/etablix-data-$STAMP.tar.gz" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"
docker exec etablix rm -f /app/backend/data/backup-snapshot.sqlite >/dev/null 2>&1 || true
find "$BACKUP_DIR" -name 'etablix-data-*.tar.gz' -mtime +30 -delete

# Tell the platform the backup ran. The backup watch reads this stamp, so
# "backups are configured" becomes "backups ran" — which are different claims
# and only one of them is worth anything at three in the morning.
date +%s > "$DATA_DIR/last-backup" 2>/dev/null || true

echo "backup written: $BACKUP_DIR/etablix-data-$STAMP.tar.gz"

# OFF-SITE COPY — a backup on the same VPS dies with the VPS. Configure
# any rclone remote once (rclone config — Backblaze B2 is ~£1/month),
# then set its name here or export ETABLIX_BACKUP_REMOTE in cron.
REMOTE="${ETABLIX_BACKUP_REMOTE:-}"
if [ -n "$REMOTE" ] && command -v rclone >/dev/null 2>&1; then
  rclone copy "$BACKUP_DIR/etablix-data-$STAMP.tar.gz" "$REMOTE:etablix-backups/" \
    && echo "off-site copy done: $REMOTE:etablix-backups/" \
    || echo "WARNING: off-site copy failed"
else
  echo "NOTE: no off-site remote configured (set ETABLIX_BACKUP_REMOTE) — backup exists only on this VPS"
fi
