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
# Install (as root) — two lines, and it is done:
#
#   echo '*/5 * * * * root flock -n /run/etablix-deploy.lock /opt/etablix/deploy/autodeploy.sh' > /etc/cron.d/etablix-autodeploy
#   /opt/etablix/deploy/autodeploy.sh --status
#
# CRON POINTS AT THE SCRIPT INSIDE THE REPOSITORY, deliberately. The earlier
# instruction copied it to /opt first, and that copy then went stale — cron
# kept running yesterday's dispatcher while the repository moved on, so a
# change to the defaults here reached nobody. Run it where it lives and every
# deploy updates it.
#
# THE SCRIPT ALONE DOES NOTHING until that cron entry exists. Changing a
# default in a file that nothing runs is the failure this note exists to stop.
#
# Freeze it while you are testing, without editing cron:
#   mkdir -p /var/lib/etablix && touch /var/lib/etablix/pause-deploy
#   rm /var/lib/etablix/pause-deploy        # resume

set -euo pipefail
[ -f /etc/default/etablix ] && . /etc/default/etablix

# WHERE THE OTHER SCRIPTS ARE.
#
# NOT "next to this file". A copy of this script placed at /opt looked for its
# siblings at /opt/deploy.sh and /opt/staging.sh — paths nobody had ever
# created — and failed with a message naming a location that appears nowhere in
# the repository, which is about the least helpful way a script can break.
#
# So the repository is located explicitly, and only falls back to looking
# beside this file when that fails.
REPO=${ETABLIX_REPO:-/opt/etablix}
BESIDE=$(cd "$(dirname "$0")" && pwd)
if [ -x "$REPO/deploy/deploy.sh" ]; then
  SCRIPTS="$REPO/deploy"
elif [ -x "$BESIDE/deploy.sh" ]; then
  SCRIPTS="$BESIDE"
else
  SCRIPTS=""
fi
PAUSE=${ETABLIX_PAUSE_FILE:-/var/lib/etablix/pause-deploy}
LOG=${ETABLIX_LOG:-/var/log/etablix-deploy.log}
TARGET=${ETABLIX_AUTODEPLOY_TARGET:-live}
ENABLED=${ETABLIX_AUTODEPLOY:-1}

# --status answers the only question anybody actually asks of this file:
# is it on, where is it pointed, and did it run.
if [ "${1:-}" = "--status" ]; then
  echo "auto-deploy:  $([ "$ENABLED" != "0" ] && echo ON || echo "OFF (ETABLIX_AUTODEPLOY=0)")"
  echo "target:       $TARGET"
  if [ "$TARGET" = "staging" ]; then
    echo "              WARNING: the live site will NEVER be deployed by cron."
    echo "              The script's default is live, so something has overridden it —"
    echo "              almost always ETABLIX_AUTODEPLOY_TARGET in /etc/default/etablix."
    echo "              To send it to live:  sed -i '/^ETABLIX_AUTODEPLOY_TARGET=/d' /etc/default/etablix"
  fi
  echo "repository:   $REPO"
  if [ -n "$SCRIPTS" ]; then
    echo "scripts:      $SCRIPTS"
  else
    echo "scripts:      NOT FOUND — no deploy.sh under $REPO/deploy or $BESIDE."
    echo "              Set ETABLIX_REPO in /etc/default/etablix to the checkout."
  fi
  if [ -f "$PAUSE" ]; then
    echo "paused:       YES — $PAUSE exists, nothing will deploy until it is removed"
  else
    echo "paused:       no"
  fi
  if [ -f /etc/cron.d/etablix-autodeploy ]; then
    echo "cron:         installed — $(cat /etc/cron.d/etablix-autodeploy)"
    if grep -q '/opt/etablix-autodeploy.sh' /etc/cron.d/etablix-autodeploy 2>/dev/null; then
      echo "              WARNING: it runs a COPY at /opt, which goes stale. Point it at the"
      echo "              repository instead: $REPO/deploy/autodeploy.sh"
    fi
  else
    echo "cron:         NOT INSTALLED — nothing runs this script, so nothing deploys."
    echo "              echo '*/5 * * * * root flock -n /run/etablix-deploy.lock $REPO/deploy/autodeploy.sh' > /etc/cron.d/etablix-autodeploy"
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

if [ -z "$SCRIPTS" ]; then
  echo "etablix autodeploy: no deploy.sh found under $REPO/deploy or $BESIDE — nothing deployed." >&2
  echo "Set ETABLIX_REPO in /etc/default/etablix to the checkout directory." >&2
  exit 1
fi

case "$TARGET" in
  staging) exec "$SCRIPTS/staging.sh" ;;
  *)       exec "$SCRIPTS/deploy.sh" ;;
esac
