#!/bin/bash
# Nightly backup of the ETABLIX data directory (JSON store + uploaded
# documents). Keeps 30 days locally; copy the archive off-box for real
# durability (rsync/rclone to object storage).
#
# Install: cp deploy/backup.sh /opt/etablix-backup.sh && chmod +x /opt/etablix-backup.sh
# Cron:    echo '15 2 * * * root /opt/etablix-backup.sh' > /etc/cron.d/etablix-backup

set -euo pipefail

DATA_DIR=/opt/etablix/backend/data
BACKUP_DIR=/var/backups/etablix
STAMP=$(date +%Y%m%d-%H%M)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/etablix-data-$STAMP.tar.gz" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"
find "$BACKUP_DIR" -name 'etablix-data-*.tar.gz' -mtime +30 -delete

echo "backup written: $BACKUP_DIR/etablix-data-$STAMP.tar.gz"
