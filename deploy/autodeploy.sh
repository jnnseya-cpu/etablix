#!/bin/bash
# Auto-deploy ETABLIX.
#
# OFF BY DEFAULT. This is deliberate: auto-deploying to the box someone is
# testing on recreated the container under them and destroyed run after run.
# A production deploy is now a decision, not a side effect of a push.
#
#   Staging:    ETABLIX_AUTODEPLOY=1 in /etc/default/etablix, cron every 5 min
#   Production: run ./deploy.sh by hand, or set ETABLIX_AUTODEPLOY=1 knowingly
#
# Install (as root):
#   cp deploy/autodeploy.sh /opt/etablix-autodeploy.sh && chmod +x /opt/etablix-autodeploy.sh
#   echo '*/5 * * * * root flock -n /run/etablix-deploy.lock /opt/etablix-autodeploy.sh' > /etc/cron.d/etablix-autodeploy

set -euo pipefail
[ -f /etc/default/etablix ] && . /etc/default/etablix

if [ "${ETABLIX_AUTODEPLOY:-0}" != "1" ]; then
  exit 0   # not enabled here — silence is correct, this runs from cron
fi

exec "$(dirname "$0")/deploy.sh"
