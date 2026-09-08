#!/bin/bash
# Go back to the image that was running before the last deploy. One command,
# because the moment you need it is the moment you cannot be reading scripts.
set -euo pipefail
[ -f /etc/default/etablix ] && . /etc/default/etablix
NAME=etablix
NET=${ETABLIX_NET:-app_default}
ENVFILE=${ETABLIX_ENVFILE:-/opt/etablix/etablix.env}
VOLUME=${ETABLIX_VOLUME:-etablix-data}
PREV=$(cat /var/lib/etablix-previous-image 2>/dev/null || true)
[ -z "$PREV" ] && { echo "No previous image recorded. docker images | grep etablix and pick one."; exit 1; }
echo "rolling back to $PREV"
docker stop -t 30 "$NAME" || true
docker rm "$NAME" || true
docker run -d --name "$NAME" --restart unless-stopped --network "$NET" \
  --env-file "$ENVFILE" -v "$VOLUME:/app/backend/data" "$PREV"
sleep 4
docker exec "$NAME" wget -qO- http://localhost:3000/api/health || echo "WARNING: not answering yet"
