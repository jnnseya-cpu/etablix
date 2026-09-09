#!/bin/bash
# Auto-deploy ETABLIX — pointed at STAGING by default.
#
# The rule this encodes: a change reaches staging by itself, and reaches
# production because a person decided it should. Auto-deploying to the box
# someone was testing on recreated the container under them and destroyed
# run after run; that is what this file exists to make impossible.
#
#   ETABLIX_AUTODEPLOY=1                  turn it on at all (default: off)
#   ETABLIX_AUTODEPLOY_TARGET=staging     staging (default) or live
#
# Install (as root):
#   cp deploy/autodeploy.sh /opt/etablix-autodeploy.sh && chmod +x /opt/etablix-autodeploy.sh
#   printf 'ETABLIX_AUTODEPLOY=1\nETABLIX_AUTODEPLOY_TARGET=staging\n' >> /etc/default/etablix
#   echo '*/5 * * * * root flock -n /run/etablix-deploy.lock /opt/etablix-autodeploy.sh' > /etc/cron.d/etablix-autodeploy
#
# Stop it touching anything while you are mid-test, without editing cron:
#   mkdir -p /var/lib/etablix && touch /var/lib/etablix/pause-deploy
#   rm /var/lib/etablix/pause-deploy        # resume

set -euo pipefail
[ -f /etc/default/etablix ] && . /etc/default/etablix

PAUSE=${ETABLIX_PAUSE_FILE:-/var/lib/etablix/pause-deploy}
if [ -f "$PAUSE" ]; then exit 0; fi   # paused — silence is correct, this runs from cron

if [ "${ETABLIX_AUTODEPLOY:-0}" != "1" ]; then
  exit 0   # not enabled here
fi

HERE=$(dirname "$0")
case "${ETABLIX_AUTODEPLOY_TARGET:-staging}" in
  live|production) exec "$HERE/deploy.sh" ;;
  *)               exec "$HERE/staging.sh" ;;
esac
