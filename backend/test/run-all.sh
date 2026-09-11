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
for t in clientflow.test workingdays.test pricing.test tenderpack.test seo.test editorial.test reach.test deletion.test bidcheck.test controlcheck.test interfacecheck.test challengecheck.test l7-properties.test l7-kernel.test l7-engines.test l7-runtime.test architecture.test mock.test indexnow.test deploy.test mail.test pipeline.test concurrent.test store-kill.test; do
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
SUITES="money.e2e internal-pages.e2e clientflow.e2e enquiry-to-engagement.e2e portal-promises.e2e upload-dedupe.test pipeline.e2e l7.e2e bid.e2e control.e2e interfaces.e2e challenge.e2e retention.e2e circle.e2e security.e2e seo.e2e"
[ "${SOAK:-0}" = "1" ] && SUITES="$SUITES soak.e2e"
for t in $SUITES; do
  printf '  %-28s ' "$t"
  # The soak starts and kills servers of its own, so it gets its own
  # scratch directory rather than sharing the one in flight.
  SOAKDIR=""
  [ "$t" = "soak.e2e" ] && SOAKDIR=$(mktemp -d)
  if BASE=http://localhost:$PORT DATA="$DATA" MOCK_LOG="$LOGS/mock-log.json" \
     ETABLIX_DATA_DIR="${SOAKDIR:-$DATA}" node "backend/test/$t.mjs" > "$LOGS/$t.log" 2>&1; then
    grep -Eo '[0-9]+ (passed|full circles)' "$LOGS/$t.log" | tail -1
  else
    echo "FAILED  → $LOGS/$t.log"; fail=1
  fi
  [ -n "$SOAKDIR" ] && { [ "${KEEP:-0}" = "1" ] || rm -rf "$SOAKDIR"; }
done

# These start servers of their own — one is about what survives a container
# being recreated mid-run, the other about running the same engagement's
# diagnostic more than once — so they run last and on their own ports.
# This one owns its own mock, because it needs the model to run out of room
# on demand and then to do so for ever — two different mock modes.
# Owns its own mock and server: it walks a second pipeline agent end to end
# and needs the mock answering that agent's passes rather than the suite's.
echo "=== delivery parity ==="
printf '  %-28s ' "parity.e2e"
PDATA=$(mktemp -d)
if ETABLIX_DATA_DIR=$PDATA PORT=$((PORT + 20)) MOCK_PORT=$((MOCK_PORT + 20)) \
   ANTHROPIC_API_KEY=mock-key node backend/test/parity.e2e.mjs > "$LOGS/parity.log" 2>&1; then
  grep -Eo '[0-9]+ passed' "$LOGS/parity.log" | tail -1
else
  echo "FAILED  → $LOGS/parity.log"; fail=1
fi
[ "${KEEP:-0}" = "1" ] || rm -rf "$PDATA"

echo "=== truncation ==="
printf '  %-28s ' "truncation.e2e"
TRDATA=$(mktemp -d)
if ETABLIX_DATA_DIR=$TRDATA PORT=$((PORT + 10)) MOCK_PORT=$((MOCK_PORT + 10)) \
   ANTHROPIC_API_KEY=mock-key node backend/test/truncation.e2e.mjs > "$LOGS/truncation.log" 2>&1; then
  grep -Eo '[0-9]+ passed' "$LOGS/truncation.log" | tail -1
else
  echo "FAILED  → $LOGS/truncation.log"; fail=1
fi
[ "${KEEP:-0}" = "1" ] || rm -rf "$TRDATA"

echo "=== re-run ==="
printf '  %-28s ' "rerun.e2e"
RUDATA=$(mktemp -d)
if ETABLIX_DATA_DIR=$RUDATA PORT=$((PORT + 8)) ANTHROPIC_BASE_URL=http://127.0.0.1:$MOCK_PORT \
   ANTHROPIC_API_KEY=mock-key node backend/test/rerun.e2e.mjs > "$LOGS/rerun.log" 2>&1; then
  grep -Eo '[0-9]+ passed' "$LOGS/rerun.log" | tail -1
else
  echo "FAILED  → $LOGS/rerun.log"; fail=1
fi
[ "${KEEP:-0}" = "1" ] || rm -rf "$RUDATA"

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
