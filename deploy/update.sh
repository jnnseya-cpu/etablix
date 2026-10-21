#!/bin/bash
# THE ONE COMMAND. Run this after anything changes, and it does the safe work
# and then tells you what is left for a person.
#
#   /opt/etablix/deploy/update.sh              do the work, then say what needs you
#   /opt/etablix/deploy/update.sh --check      change nothing, just report
#   /opt/etablix/deploy/update.sh --deep       also probe sources that need a URL (slow)
#
# WHY THIS EXISTS. Every change to this platform used to end with a different
# handful of commands: take the new source list, run the check, mend the links,
# sweep, look at the queue. Nobody should have to remember which ones apply
# this week, or go and find them. This is the set, it is the same set every
# time, and running it twice is harmless.
#
# AND WHY IT IS BUILT OUT OF CHECKS RATHER THAN STEPS. A list of today's
# commands is out of date by the next change. Each section below asks a
# question about the live system and acts only on the answer, so a new source,
# a new sector or a new tool shows up here without this file being edited —
# the queue digest reads the registry, not a list written out by hand.
#
# SAFE TO RUN AT ANY TIME. Nothing here deletes anything. The only thing it
# overwrites is the live source list, and it takes a timestamped backup inside
# the volume first.
set -uo pipefail

REPO=${ETABLIX_REPO:-/opt/etablix}
NAME=${ETABLIX_CONTAINER:-etablix}
BRANCH=${ETABLIX_BRANCH:-claude/construction-marketing-website-ndn7cx}
DATA=/app/backend/data
LOG=${ETABLIX_LOG:-/var/log/etablix-deploy.log}

CHECK_ONLY=0
DEEP=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --deep)  DEEP=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg  (try --help)"; exit 2 ;;
  esac
done

ACTIONS=()
note() { ACTIONS+=("$1"); }
say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
run()  { if [ "$CHECK_ONLY" = "1" ]; then echo "    (would run: $*)"; else "$@"; fi; }
ex()   { docker exec "$NAME" "$@"; }

[ "$CHECK_ONLY" = "1" ] && echo "=== CHECK ONLY — nothing will be changed ==="

# ---------------------------------------------------------------------------
say "1. Is the running build the head of the branch?"
# ---------------------------------------------------------------------------
if [ ! -d "$REPO/.git" ]; then
  echo "    no repository at $REPO — set ETABLIX_REPO to where it is cloned"
  note "point ETABLIX_REPO at the checkout, then run this again"
else
  git -C "$REPO" fetch origin "$BRANCH" --quiet 2>/dev/null \
    || note "could not fetch origin/$BRANCH — check network or credentials"
  LOCAL=$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo unknown)
  REMOTE=$(git -C "$REPO" rev-parse --short "origin/$BRANCH" 2>/dev/null || echo unknown)
  echo "    checkout $LOCAL   origin/$BRANCH $REMOTE"
  if [ "$LOCAL" != "$REMOTE" ] && [ "$REMOTE" != "unknown" ]; then
    echo "    behind — deploying"
    if [ -x "$REPO/deploy/autodeploy.sh" ]; then
      run "$REPO/deploy/autodeploy.sh"
    else
      note "no autodeploy.sh found; deploy by hand with deploy/deploy.sh"
    fi
  else
    echo "    up to date"
  fi
fi

# ---------------------------------------------------------------------------
say "2. Is the live source list the one that shipped?"
# ---------------------------------------------------------------------------
# The live list sits on the data volume and a deploy deliberately does NOT
# overwrite it, so that a hand edit survives. The other half of that promise is
# that a repository change does not arrive by itself — and the only symptom is
# a sweep quietly behaving like the version before.
LIVE="$DATA/signals-sources.json"
SHIPPED=/app/content/signals/sources.json
VER() { ex node -e "try{const l=JSON.parse(require('fs').readFileSync('$1','utf8'));process.stdout.write(String((l[0]&&l[0]._version)||0))}catch(e){process.stdout.write('-')}" 2>/dev/null; }
LV=$(VER "$LIVE"); SV=$(VER "$SHIPPED")
echo "    live version ${LV:--}   shipped version ${SV:--}"
if [ "${LV:-0}" = "-" ] || { [ -n "${SV:-}" ] && [ "${SV:-0}" != "-" ] && [ "${LV:-0}" -lt "${SV:-0}" ] 2>/dev/null; }; then
  STAMP=$(date +%Y%m%d-%H%M%S)
  if [ "$CHECK_ONLY" = "1" ]; then
    echo "    behind — would back up the live list and take the shipped one"
  else
    echo "    behind — backing up and taking the new one"
    ex sh -c "cp -f '$LIVE' '$DATA/signals-sources.$STAMP.bak' 2>/dev/null; cp -f '$SHIPPED' '$LIVE'"
    echo "    previous list kept at $DATA/signals-sources.$STAMP.bak"
  fi
else
  echo "    current"
fi

# ---------------------------------------------------------------------------
say "3. Do the sources still answer?"
# ---------------------------------------------------------------------------
if [ "$CHECK_ONLY" = "1" ]; then
  echo "    (would run: signals-check.mjs --all)"
else
  ex node backend/tools/signals-check.mjs --all 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | sed 's/^/    /'
  CHECK_RC=${PIPESTATUS[0]}
  [ "${CHECK_RC:-0}" -ne 0 ] && note "some sources need attention — see section 3 above"
fi

if [ "$DEEP" = "1" ]; then
  say "3b. Probing the sources that still need a URL"
  echo "    One request per host at a time, five seconds apart. This takes a few minutes."
  run ex node backend/tools/signals-check.mjs --probe
fi

# ---------------------------------------------------------------------------
say "4. Mend anything queued before the links and contacts worked"
# ---------------------------------------------------------------------------
# Idempotent: a row that already has its notice link and its parties is skipped.
if [ "$CHECK_ONLY" = "1" ]; then
  ex node backend/tools/signals-relink.mjs 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | tail -6 | sed 's/^/    /'
else
  ex node backend/tools/signals-relink.mjs --write 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | tail -8 | sed 's/^/    /'
fi

# ---------------------------------------------------------------------------
say "5. Sweep"
# ---------------------------------------------------------------------------
if [ "$CHECK_ONLY" = "1" ]; then
  echo "    (would run: signals-sweep.mjs)"
else
  ex node backend/tools/signals-sweep.mjs 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | sed 's/^/    /'
fi

# ---------------------------------------------------------------------------
say "6. Is the platform healthy?"
# ---------------------------------------------------------------------------
HEALTH=$(ex wget -qO- --timeout=8 http://localhost:3000/api/health 2>/dev/null || true)
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo "    api/health ok   build $(echo "$HEALTH" | grep -o '"build":"[^"]*"' | cut -d'"' -f4)"
else
  echo "    api/health DID NOT ANSWER"
  note "the application is not answering — check: docker logs $NAME --tail 50"
fi

BK=$(ex sh -c "cat $DATA/last-backup 2>/dev/null" || true)
if [ -n "${BK:-}" ]; then
  AGE=$(( ( $(date +%s) - ${BK%%.*} ) / 3600 ))
  echo "    last backup ${AGE}h ago"
  [ "$AGE" -gt 48 ] && note "the last backup is ${AGE} hours old — run deploy/backup.sh"
else
  echo "    no backup stamp found"
  note "no backup has ever been recorded — run deploy/backup.sh"
fi

AVAIL=$(ex sh -c "df -P $DATA | awk 'NR==2{print \$4}'" 2>/dev/null || echo "")
[ -n "${AVAIL:-}" ] && echo "    data volume ${AVAIL}K free"

# ---------------------------------------------------------------------------
say "7. What needs you"
# ---------------------------------------------------------------------------
# Read from the live queue and the live source list, so new sectors, stages
# and sources appear here without this script being edited.
ex node backend/tools/signals-digest.mjs 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | sed 's/^/  /'

if [ ${#ACTIONS[@]} -gt 0 ]; then
  printf '\n\033[1m  Also:\033[0m\n'
  for a in "${ACTIONS[@]}"; do echo "    - $a"; done
fi

cat <<BANNER

  Read the queue:   https://etablix.com/internal/signals.html
  Outstanding list: $REPO/business/strategy/what-is-outstanding.md

  Run this again after any change. It is the same command every time.
BANNER
exit 0
