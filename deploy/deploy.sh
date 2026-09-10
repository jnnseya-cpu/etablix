#!/bin/bash
# Deploy ETABLIX, without being able to take the site down.
#
# The old script stopped the running container, started the new one, and
# health-checked it AFTERWARDS — printing a warning if it failed. A broken
# build therefore replaced a working one with nothing to stop it, and there
# was no way back.
#
# Now:
#   1. never touch a container with work in flight
#   2. build and tag the image with the commit
#   3. start the new container on a spare name and health-check it BEFORE
#      anything is switched
#   4. only if it answers do we swap — and the previous image is kept and
#      recorded, so ./rollback.sh is one command
#
# Run: ./deploy.sh [ref]     (default: the tracked branch)

set -euo pipefail
[ -f /etc/default/etablix ] && . /etc/default/etablix

REPO=${ETABLIX_REPO:-/opt/etablix}
BRANCH=${ETABLIX_BRANCH:-claude/construction-marketing-website-ndn7cx}
LOG=${ETABLIX_LOG:-/var/log/etablix-deploy.log}
NAME=etablix
NET=${ETABLIX_NET:-app_default}
ENVFILE=${ETABLIX_ENVFILE:-/opt/etablix/etablix.env}
VOLUME=${ETABLIX_VOLUME:-etablix-data}
GRACE=${ETABLIX_STOP_GRACE:-30}

say() { echo "[$(date -Is)] $*" | tee -a "$LOG"; }

# ---- 0. the pause switch and the session secret ----------------------------
PAUSE=${ETABLIX_PAUSE_FILE:-/var/lib/etablix/pause-deploy}
if [ -f "$PAUSE" ]; then
  say "paused by $PAUSE — nothing deployed. Remove the file to resume."
  exit 0
fi
# Without a fixed token secret every restart signs new sessions with a new
# key, so a deploy silently signs everybody out mid-task. Worth one line here
# rather than an afternoon wondering why.
if ! grep -qE '^ETABLIX_TOKEN_SECRET=.+' "$ENVFILE" 2>/dev/null; then
  say "WARNING: ETABLIX_TOKEN_SECRET is not set in $ENVFILE — this deploy will sign everyone out. Set it: openssl rand -hex 32"
fi

cd "$REPO"
git fetch origin "$BRANCH" --quiet
TARGET=$(git rev-parse "origin/${1:-$BRANCH}")
LOCAL=$(git rev-parse HEAD)
if [ "$LOCAL" = "$TARGET" ] && [ "${FORCE:-0}" != "1" ]; then exit 0; fi

# ---- 1. never interrupt work in flight -------------------------------------
WAITED=0
while true; do
  BUSY=$(docker exec "$NAME" wget -qO- http://localhost:3000/api/health 2>/dev/null | grep -o '"busy":true' || true)
  [ -z "$BUSY" ] && break
  if [ "$WAITED" -ge "${ETABLIX_BUSY_MAX:-14400}" ]; then
    say "a run has been going for ${WAITED}s — deploying anyway"; break
  fi
  say "an agent run is in progress — deferring"; sleep 60; WAITED=$((WAITED + 60))
done

say "deploying $TARGET (from $LOCAL)"
git reset --hard "$TARGET"
SHORT=$(git rev-parse --short=12 HEAD)
echo "$SHORT" > BUILD_COMMIT

# ---- 2. build, tagged with the commit --------------------------------------
docker build --build-arg BUILD_COMMIT="$SHORT" -t "etablix:$SHORT" -t etablix:candidate . >>"$LOG" 2>&1
PREV_IMAGE=$(docker inspect --format '{{.Image}}' "$NAME" 2>/dev/null || echo "")

# ---- 3. prove the new build answers BEFORE switching -----------------------
docker rm -f etablix-candidate >/dev/null 2>&1 || true
docker run -d --name etablix-candidate --network "$NET" \
  -e BUILD_COMMIT="$SHORT" -e ETABLIX_CANDIDATE=1 \
  --env-file "$ENVFILE" etablix:candidate >>"$LOG" 2>&1

OK=0
for i in $(seq 1 30); do
  sleep 2
  BODY=$(docker exec etablix-candidate wget -qO- http://localhost:3000/api/health 2>/dev/null || true)
  case "$BODY" in *'"ok":true'*) case "$BODY" in *"$SHORT"*) OK=1; break;; esac;; esac
done
docker rm -f etablix-candidate >/dev/null 2>&1 || true

if [ "$OK" != "1" ]; then
  say "REFUSING TO DEPLOY: the new build did not report healthy on $SHORT. The live container has not been touched."
  exit 1
fi
say "candidate $SHORT healthy — switching"

# ---- 4. switch, keeping the way back ---------------------------------------
[ -n "$PREV_IMAGE" ] && echo "$PREV_IMAGE" > /var/lib/etablix-previous-image
docker stop -t "$GRACE" "$NAME" >>"$LOG" 2>&1 || true    # -t: let it shut down gracefully
docker rm "$NAME" >>"$LOG" 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped --network "$NET" \
  -e BUILD_COMMIT="$SHORT" --env-file "$ENVFILE" \
  -v "$VOLUME:/app/backend/data" "etablix:$SHORT" >>"$LOG" 2>&1

# ---- 5. tell the search engines that will listen ---------------------------
#
# Best effort, and it can never fail a deploy. Google retired its sitemap ping
# in 2023 and only accepts an authenticated submission through Search Console,
# so this reaches Bing, Yandex, Seznam and Naver — which is the half that needs
# no human, and Bing's index feeds several of the AI answer engines.
#
# --no-build because the deployed artifact is what was committed: a deploy
# script that rewrites files in the checkout it just pulled is one that will
# eventually deploy something nobody wrote. The audit still runs and still
# refuses to submit a site with a broken link in it.
announce() {
  if command -v node >/dev/null 2>&1; then
    (cd "$REPO" && node backend/tools/publish.mjs --no-build >>"$LOG" 2>&1) \
      && say "search engines notified" \
      || say "search engines NOT notified — see $LOG (the deploy itself is fine)"
  fi
}

for i in $(seq 1 30); do
  sleep 2
  BODY=$(docker exec "$NAME" wget -qO- http://localhost:3000/api/health 2>/dev/null || true)
  case "$BODY" in *'"ok":true'*) say "deployed $SHORT"; announce; exit 0;; esac
done
say "DEPLOYED BUT NOT ANSWERING — run ./rollback.sh"
exit 1
