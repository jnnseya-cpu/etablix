#!/bin/bash
# Are CONSTRUX and VERYX actually connected?
#
# Run it on the VPS, against the running container:
#
#   /opt/etablix/deploy/check-connections.sh
#   /opt/etablix/deploy/check-connections.sh etablix-green   # a named container
#
# A connection needs TWO things and the badge lies if you only look at one:
# a stored key, AND a live test that passed. A key that was pasted but never
# tested reads as configured and behaves as absent.
#
# IT NEVER PRINTS A KEY. Six characters and a length, so you can tell one key
# from another without the value reaching a terminal, a log or a screenshot.
set -euo pipefail
docker exec "${1:-etablix}" node --input-type=module -e '
const { getSettings } = await import("/app/backend/lib/store.js");
const s = getSettings();
let anyLive = false;
for (const name of ["veryx", "construx"]) {
  const r = s[`integration_${name}`] || {};
  const key = r.apiKey || "";
  const t = r.lastTest;
  const live = Boolean(key && t && t.ok);
  if (live) anyLive = true;
  console.log(`${name.toUpperCase().padEnd(9)} ${live ? "CONNECTED" : "not connected"}`);
  console.log(`          key   ${key ? key.slice(0, 6) + "…  (" + key.length + " characters)" : "none stored"}`);
  console.log(`          url   ${r.baseUrl || "(default)"}`);
  console.log(`          test  ${t ? (t.ok ? "passed" : "FAILED") + " — " + t.summary : "never run"}`);
  console.log();
}
if (!anyLive) {
  console.log("Neither is live. Connect in the Control Desk: Team → Platform");
  console.log("connections → paste the key → Save & test. The badge only turns");
  console.log("green when the ping actually answers.");
}
'
