#!/bin/bash
# Watch the container from outside the container.
#
# The heartbeat in the application tells an outside service the box is alive,
# which catches the machine dying. This catches the narrower case in between:
# the container is running but the application inside it has stopped
# answering. Nothing inside a wedged process can report that it is wedged.
#
# Install (as root):
#   cp deploy/watchdog.sh /opt/etablix-watchdog.sh && chmod +x /opt/etablix-watchdog.sh
#   echo '*/2 * * * * root /opt/etablix-watchdog.sh' > /etc/cron.d/etablix-watchdog
#
# It will NOT restart a container that is busy with an agent run — six passes
# of reasoning is several minutes and real money, and a restart throws away
# whichever passes have not been saved. Three consecutive failures while not
# busy is the trigger.
set -uo pipefail
[ -f /etc/default/etablix ] && . /etc/default/etablix

NAME=${ETABLIX_CONTAINER:-etablix}
STATE=/var/lib/etablix/watchdog-failures
LOG=${ETABLIX_LOG:-/var/log/etablix-deploy.log}
WEBHOOK=${ALERT_WEBHOOK_URL:-}
mkdir -p "$(dirname "$STATE")"

say() { echo "[$(date -Is)] watchdog: $*" | tee -a "$LOG"; }
shout() {
  say "$*"
  [ -n "$WEBHOOK" ] && curl -sS -m 10 -X POST -H 'Content-Type: application/json' \
    -d "{\"text\":\"ETABLIX watchdog: $*\"}" "$WEBHOOK" >/dev/null 2>&1 || true
}

BODY=$(docker exec "$NAME" wget -qO- --timeout=8 http://localhost:3000/api/health 2>/dev/null || true)

case "$BODY" in
  *'"ok":true'*)
    [ -f "$STATE" ] && { say "answering again after $(cat "$STATE") failed check(s)"; rm -f "$STATE"; }
    exit 0
    ;;
esac

FAILURES=$(( $(cat "$STATE" 2>/dev/null || echo 0) + 1 ))
echo "$FAILURES" > "$STATE"
say "no healthy answer ($FAILURES in a row)"
[ "$FAILURES" -lt 3 ] && exit 0

# Three in a row. Is it wedged, or is it working hard?
if docker exec "$NAME" wget -qO- --timeout=5 http://localhost:3000/api/health 2>/dev/null | grep -q '"busy":true'; then
  shout "not answering but an agent run is in progress — NOT restarting. Watch it."
  exit 0
fi

shout "RESTARTING $NAME after $FAILURES failed health checks."
docker restart -t 30 "$NAME" >>"$LOG" 2>&1

for i in $(seq 1 20); do
  sleep 3
  if docker exec "$NAME" wget -qO- --timeout=5 http://localhost:3000/api/health 2>/dev/null | grep -q '"ok":true'; then
    shout "back up after a restart."
    rm -f "$STATE"
    exit 0
  fi
done
shout "STILL DOWN AFTER A RESTART. Needs a person: docker logs $NAME"
exit 1
