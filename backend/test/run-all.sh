#!/usr/bin/env bash
# Every test, against a scratch database, in one command.
#
#   backend/test/run-all.sh
#
# It starts its own mock API and its own server on a spare port, points
# them at a temporary data directory, runs the unit tests and the
# end-to-end suites, and tears everything down. It never touches the live
# store: the data directory is made fresh and deleted at the end.
#
#   KEEP=1     leave the scratch data directory behind for inspection
#   SOAK=1     include the four-minute soak
set -uo pipefail
cd "$(dirname "$0")/../.."

PORT=${PORT:-3391}
MOCK_PORT=${MOCK_PORT:-4191}
DATA=$(mktemp -d)
LOGS=$(mktemp -d)
fail=0

cleanup() {
  [ -n "${SRV:-}" ] && kill "$SRV" 2>/dev/null
  [ -n "${MOCK:-}" ] && kill "$MOCK" 2>/dev/null
  [ "${KEEP:-0}" = "1" ] || rm -rf "$DATA"
  echo "  logs: $LOGS"
}
trap cleanup EXIT

echo "=== unit ==="
for t in clientflow.test workingdays.test mail.test pipeline.test store-kill.test; do
  printf '  %-22s ' "$t"
  if node "backend/test/$t.mjs" > "$LOGS/$t.log" 2>&1; then echo "ok"; else echo "FAILED  → $LOGS/$t.log"; fail=1; fi
done

MOCK_PORT=$MOCK_PORT MOCK_DELAY=${MOCK_DELAY:-200} MOCK_LOG="$LOGS/mock-log.json" node backend/test/mock-anthropic.mjs > "$LOGS/mock.log" 2>&1 &
MOCK=$!
ETABLIX_DATA_DIR=$DATA PORT=$PORT SITE_URL=http://localhost:$PORT \
  ANTHROPIC_BASE_URL=http://127.0.0.1:$MOCK_PORT ANTHROPIC_API_KEY=mock-key \
  node backend/server.js > "$LOGS/server.log" 2>&1 &
SRV=$!
for _ in $(seq 1 40); do sleep 0.25; curl -sf "http://localhost:$PORT/api/health" >/dev/null && break; done
curl -sf "http://localhost:$PORT/api/health" >/dev/null || { echo "the server did not come up — $LOGS/server.log"; exit 1; }

echo "=== end to end ==="
SUITES="money.e2e clientflow.e2e enquiry-to-engagement.e2e portal-promises.e2e upload-dedupe.test pipeline.e2e circle.e2e"
[ "${SOAK:-0}" = "1" ] && SUITES="$SUITES soak.e2e"
for t in $SUITES; do
  printf '  %-28s ' "$t"
  if BASE=http://localhost:$PORT DATA="$DATA" MOCK_LOG="$LOGS/mock-log.json" node "backend/test/$t.mjs" > "$LOGS/$t.log" 2>&1; then
    grep -Eo '[0-9]+ passed' "$LOGS/$t.log" | tail -1
  else
    echo "FAILED  → $LOGS/$t.log"; fail=1
  fi
done

# This one starts, kills and restarts a server of its own — it is about
# what survives a container being recreated mid-run — so it runs last and
# on its own port.
echo "=== interruption ==="
printf '  %-28s ' "run-resume.e2e"
RRDATA=$(mktemp -d)
if ETABLIX_DATA_DIR=$RRDATA PORT=$((PORT + 6)) ANTHROPIC_BASE_URL=http://127.0.0.1:$MOCK_PORT \
   ANTHROPIC_API_KEY=mock-key node backend/test/run-resume.e2e.mjs > "$LOGS/run-resume.log" 2>&1; then
  grep -Eo '[0-9]+ passed' "$LOGS/run-resume.log" | tail -1
else
  echo "FAILED  → $LOGS/run-resume.log"; fail=1
fi
[ "${KEEP:-0}" = "1" ] || rm -rf "$RRDATA"

echo
[ $fail -eq 0 ] && echo "=== everything passed ===" || echo "=== there are failures above ==="
exit $fail
