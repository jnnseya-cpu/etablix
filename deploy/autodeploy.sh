#!/bin/bash
# Auto-deploy ETABLIX — ON, and pointed at LIVE.
#
# A push reaches the live site by itself. Nothing needs switching on, and
# nobody has to remember to run anything.
#
#   ETABLIX_AUTODEPLOY=0                  turn it OFF (default: on)
#   ETABLIX_AUTODEPLOY_TARGET=staging     send it to staging instead (default: live)
#
# WHY THIS IS SAFE TO POINT AT LIVE. Every protection that mattered lives in
# deploy.sh and runs on every tick:
#
#   · it exits immediately when the running container is already on that
#     commit, so a tick with nothing new costs nothing and rebuilds nothing;
#   · it DEFERS while an agent run is in flight, checking /api/health for
#     "busy" every minute, so a deploy cannot recreate the container under
#     somebody who is mid-run — that is what used to destroy runs, and it is
#     handled where it belongs rather than by refusing to deploy at all;
#   · it builds the new image, starts it on a spare name, and HEALTH-CHECKS
#     IT BEFORE ANYTHING IS SWITCHED, refusing to swap if it does not answer;
#   · it records the previous image, so ./rollback.sh is one command.
#
# Install (as root) — three lines, and it is done:
#
#   cp deploy/autodeploy.sh /opt/etablix-autodeploy.sh && chmod +x /opt/etablix-autodeploy.sh
#   echo '*/5 * * * * root flock -n /run/etablix-deploy.lock /opt/etablix-autodeploy.sh' > /etc/cron.d/etablix-autodeploy
#   /opt/etablix-autodeploy.sh --status
#
# THE SCRIPT ALONE DOES NOTHING until that cron entry exists. Changing a
# default in a file that nothing runs is the failure this note exists to stop.
#
# Freeze it while you are testing, without editing cron:
#   mkdir -p /var/lib/etablix && touch /var/lib/etablix/pause-deploy
#   rm /var/lib/etablix/pause-deploy        # resume

set -euo pipefail
[ -f /etc/default/etablix ] && . /etc/default/etablix

HERE=$(cd "$(dirname "$0")" && pwd)
REPO=${ETABLIX_REPO:-/opt/etablix}
PAUSE=${ETABLIX_PAUSE_FILE:-/var/lib/etablix/pause-deploy}
LOG=${ETABLIX_LOG:-/var/log/etablix-deploy.log}
TARGET=${ETABLIX_AUTODEPLOY_TARGET:-live}
ENABLED=${ETABLIX_AUTODEPLOY:-1}

# --status answers the only question anybody actually asks of this file:
# is it on, where is it pointed, and did it run.
if [ "${1:-}" = "--status" ]; then
  echo "auto-deploy:  $([ "$ENABLED" != "0" ] && echo ON || echo "OFF (ETABLIX_AUTODEPLOY=0)")"
  echo "target:       $TARGET"
  echo "repository:   $REPO"
  if [ -f "$PAUSE" ]; then
    echo "paused:       YES — $PAUSE exists, nothing will deploy until it is removed"
  else
    echo "paused:       no"
  fi
  if [ -f /etc/cron.d/etablix-autodeploy ]; then
    echo "cron:         installed — $(cat /etc/cron.d/etablix-autodeploy)"
  else
    echo "cron:         NOT INSTALLED — nothing runs this script, so nothing deploys."
    echo "              echo '*/5 * * * * root flock -n /run/etablix-deploy.lock /opt/etablix-autodeploy.sh' > /etc/cron.d/etablix-autodeploy"
  fi
  if [ -d "$REPO/.git" ]; then
    echo "live commit:  $(cd "$REPO" && git rev-parse --short=12 HEAD 2>/dev/null || echo unknown)"
    echo "branch:       ${ETABLIX_BRANCH:-claude/construction-marketing-website-ndn7cx}"
  fi
  [ -f "$LOG" ] && echo "last log:     $(tail -1 "$LOG")"
  exit 0
fi

# Paused. Silence is correct here — this runs from cron every five minutes.
[ -f "$PAUSE" ] && exit 0

# Off only if somebody deliberately turned it off.
[ "$ENABLED" = "0" ] && exit 0

case "$TARGET" in
  staging) exec "$HERE/staging.sh" ;;
  *)       exec "$HERE/deploy.sh" ;;
esac
