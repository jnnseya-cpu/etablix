#!/bin/bash
# Bring up (or refresh) the ETABLIX staging instance.
#
#   ./staging.sh                 build the branch head and refresh staging
#   ./staging.sh --with-live-data  ...starting from a copy of the live data
#   ./staging.sh --reset         throw the staging data away and seed fresh
#
# Staging is a second container on the same box:
#
#   name      etablix-staging
#   port      127.0.0.1:3001  (loopback only — see below)
#   data      its own volume, never the live one
#   mail      DISABLED. Every message is written to outbox.log and nobody
#             receives it, so testing the client journey cannot email a real
#             client. This is not optional and the script strips SMTP settings
#             out of the environment to enforce it.
#
# It binds to loopback because a fresh staging database seeds the demo
# accounts, whose passwords are in the source. Reach it with an SSH tunnel:
#
#   ssh -L 3001:localhost:3001 <you>@<server>      then http://localhost:3001
#
# STAGING_PUBLIC=1 binds 0.0.0.0 instead. Only do that with real admin
# credentials set in the staging environment file, and never leave it up.
set -euo pipefail
[ -f /etc/default/etablix ] && . /etc/default/etablix

REPO=${ETABLIX_REPO:-/opt/etablix}
BRANCH=${ETABLIX_BRANCH:-claude/construction-marketing-website-ndn7cx}
LOG=${ETABLIX_LOG:-/var/log/etablix-deploy.log}
NAME=etablix-staging
NET=${ETABLIX_NET:-app_default}
LIVE_ENV=${ETABLIX_ENVFILE:-/opt/etablix/etablix.env}
STAGING_ENV=${ETABLIX_STAGING_ENVFILE:-/opt/etablix/etablix-staging.env}
VOLUME=${ETABLIX_STAGING_VOLUME:-etablix-staging-data}
LIVE_VOLUME=${ETABLIX_VOLUME:-etablix-data}
PORT=${ETABLIX_STAGING_PORT:-3001}
BIND=${STAGING_PUBLIC:+0.0.0.0}; BIND=${BIND:-127.0.0.1}
PAUSE=${ETABLIX_PAUSE_FILE:-/var/lib/etablix/pause-deploy}

say() { echo "[$(date -Is)] staging: $*" | tee -a "$LOG"; }

# ---- the pause switch ------------------------------------------------------
# The reason this exists: recreating the container under somebody who is
# halfway through testing is the exact fault that lost run after run. While
# this file exists nothing is rebuilt, by hand or by cron.
if [ -f "$PAUSE" ]; then
  say "paused by $PAUSE — nothing rebuilt. Remove the file to resume."
  exit 0
fi

case "${1:-}" in --reset) RESET=1;; --with-live-data) SEED_FROM_LIVE=1;; esac

cd "$REPO"
git fetch origin "$BRANCH" --quiet
git reset --hard "origin/$BRANCH" --quiet
SHORT=$(git rev-parse --short=12 HEAD)
echo "$SHORT" > BUILD_COMMIT

# ---- never rebuild over work in flight -------------------------------------
WAITED=0
while docker exec "$NAME" wget -qO- http://localhost:3000/api/health 2>/dev/null | grep -q '"busy":true'; do
  if [ "$WAITED" -ge "${ETABLIX_BUSY_MAX:-1800}" ]; then say "busy for ${WAITED}s — rebuilding anyway"; break; fi
  say "an agent run is in progress on staging — deferring"; sleep 60; WAITED=$((WAITED + 60))
done

say "building $SHORT"
docker build --build-arg BUILD_COMMIT="$SHORT" -t "etablix:$SHORT" -t etablix:staging . >>"$LOG" 2>&1

# ---- the staging environment: the live one with the teeth removed ----------
# Mail off, its own URL, its own port. Written to a private file each time
# rather than kept around, because it carries whatever secrets the live one
# carries.
TMPENV=$(mktemp /run/etablix-staging.env.XXXXXX)
chmod 600 "$TMPENV"
trap 'rm -f "$TMPENV"' EXIT
if [ -f "$STAGING_ENV" ]; then
  cat "$STAGING_ENV" > "$TMPENV"
  say "environment from $STAGING_ENV"
else
  # Strip every mail setting so staging physically cannot send, and drop the
  # site URL and port so they can be set correctly below.
  grep -Ev '^(SMTP_[A-Z]+|NOTIFY_[A-Z]+|SITE_URL|PORT)=' "$LIVE_ENV" > "$TMPENV" 2>/dev/null || true
  say "environment derived from $LIVE_ENV with all mail settings removed"
fi
{
  echo "PORT=3000"
  echo "SITE_URL=http://localhost:$PORT"
  echo "ETABLIX_STAGING=1"
} >> "$TMPENV"

# ---- the data ---------------------------------------------------------------
if [ "${RESET:-0}" = "1" ]; then
  say "resetting the staging data"
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
fi
if [ "${SEED_FROM_LIVE:-0}" = "1" ]; then
  say "copying the live data into staging (read-only on the live volume)"
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
  docker volume create "$VOLUME" >/dev/null
  docker run --rm -v "$LIVE_VOLUME:/from:ro" -v "$VOLUME:/to" alpine \
    sh -c 'cp -a /from/. /to/ 2>/dev/null || true' >>"$LOG" 2>&1
fi

# ---- swap the container -----------------------------------------------------
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped --network "$NET" \
  -p "$BIND:$PORT:3000" \
  -e BUILD_COMMIT="$SHORT" --env-file "$TMPENV" \
  -v "$VOLUME:/app/backend/data" "etablix:$SHORT" >>"$LOG" 2>&1

for i in $(seq 1 30); do
  sleep 2
  BODY=$(docker exec "$NAME" wget -qO- http://localhost:3000/api/health 2>/dev/null || true)
  case "$BODY" in *'"ok":true'*)
    say "staging is up on $SHORT at http://$BIND:$PORT"
    [ "$BIND" = "127.0.0.1" ] && say "tunnel to it:  ssh -L $PORT:localhost:$PORT <you>@<this server>"
    exit 0;;
  esac
done
say "STAGING DID NOT ANSWER — docker logs $NAME"
exit 1
