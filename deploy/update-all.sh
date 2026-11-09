#!/bin/bash
# EVERYTHING, IN ONE COMMAND.
#
#   /opt/etablix/deploy/update-all.sh            deploy, verify, apply the pending write
#   /opt/etablix/deploy/update-all.sh --check    change nothing, just report
#
# WHY THIS EXISTS WHEN update.sh ALREADY DOES THE SAFE WORK. update.sh
# deliberately stops short of writing to live data: it tells you the 35 queued
# signals need their links mended and leaves the decision to a person, which
# is right as a default and tedious as a routine. This is the routine. It runs
# update.sh, applies the one write update.sh will not, and verifies that the
# container is serving the commit the checkout is on.
#
# THAT LAST CHECK IS THE ONE NOBODY THINKS TO DO. A deploy that half-fails
# leaves the checkout updated and the old container running, and the deploy
# log looks fine. Two matching short hashes is the only proof.
#
# Nothing here touches the operating system. apt-get upgrade on a box serving
# live traffic is a decision with a reboot attached and does not belong in a
# routine deploy.

set -euo pipefail

REPO=${ETABLIX_REPO:-/opt/etablix}
NAME=${ETABLIX_CONTAINER:-etablix}
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

say() { printf '\n== %s\n' "$1"; }

say "1. Deploy and the standard checks"
if [ "$CHECK_ONLY" = "1" ]; then
  "$REPO/deploy/update.sh" --check
else
  "$REPO/deploy/update.sh"
fi

say "2. Is the container serving the commit the checkout is on?"
LOCAL=$(git -C "$REPO" rev-parse --short HEAD)
LIVE=$(docker exec "$NAME" node -e \
  'fetch("http://127.0.0.1:3000/api/health").then(r=>r.json()).then(j=>console.log(String(j.build||"").slice(0,7)))' \
  2>/dev/null || echo unknown)
echo "    checkout $LOCAL   serving $LIVE"
if [ "$LOCAL" != "$LIVE" ]; then
  echo "    MISMATCH — the checkout moved and the container did not."
  echo "    The deploy half-failed: the log will look fine and the old code is live."
  echo "    Look at: $REPO/deploy/deploy.sh   and roll back with $REPO/deploy/rollback.sh"
  exit 1
fi
echo "    match — the live site is running this checkout"

say "3. The one write update.sh leaves to a person"
if [ "$CHECK_ONLY" = "1" ]; then
  echo "    (would run: signals-relink.mjs --write)"
else
  docker exec "$NAME" node backend/tools/signals-relink.mjs --write
fi

say "4. What still needs you"
"$REPO/deploy/update.sh" --check | sed -n '/What needs you/,$p'
