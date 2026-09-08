#!/bin/bash
# Auto-deploy ETABLIX (Docker route). Run from cron every 5 minutes: polls
# GitHub, and only when new commits exist rebuilds the image and recreates
# the container. Data persists in the etablix-data volume.
#
# Install (as root on the server):
#   cp /opt/etablix/deploy/autodeploy.sh /opt/etablix-autodeploy.sh && chmod +x /opt/etablix-autodeploy.sh
#   echo '*/5 * * * * root flock -n /run/etablix-deploy.lock /opt/etablix-autodeploy.sh' > /etc/cron.d/etablix-autodeploy

set -euo pipefail

REPO=/opt/etablix
BRANCH=claude/construction-marketing-website-ndn7cx
LOG=/var/log/etablix-deploy.log

cd "$REPO"
git fetch origin "$BRANCH" --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")
[ "$LOCAL" = "$REMOTE" ] && exit 0

# NEVER recreate the container while a pipeline run is in flight. A Site
# Systems Diagnostic is six passes over the client's whole document set —
# several minutes and real money — and stopping the container destroys the
# passes still in memory. This deferred deploy is what stops a routine push
# from throwing away a client's report. It waits up to an hour, then goes
# ahead: an indefinite hold would be its own outage.
WAITED=0
while BUSY=$(docker exec etablix wget -qO- http://localhost:3000/api/health 2>/dev/null | grep -o '"busy":true'); [ -n "$BUSY" ]; do
  if [ "$WAITED" -ge 3600 ]; then
    echo "[$(date -Is)] a run has been going for an hour — deploying anyway" >> "$LOG"
    break
  fi
  echo "[$(date -Is)] an agent run is in progress — deferring the deploy" >> "$LOG"
  sleep 60
  WAITED=$((WAITED + 60))
done

{
  echo "[$(date -Is)] new commits found — deploying $REMOTE"
  git reset --hard "origin/$BRANCH"
  docker build -t etablix .
  docker stop etablix || true
  docker rm etablix || true
  docker run -d --name etablix --restart unless-stopped --network app_default \
    --env-file /opt/etablix/etablix.env -v etablix-data:/app/backend/data etablix
  sleep 3
  docker exec etablix wget -qO- http://localhost:3000/api/health || echo "WARNING: health check failed"
  echo "[$(date -Is)] deployed $REMOTE"
} >> "$LOG" 2>&1
