/**
 * The one thing the platform cannot do for itself: notice that it has
 * stopped.
 *
 * Every alert in this system is raised BY this system. If the container
 * dies, the box runs out of disk, or the machine is powered off, there is
 * nothing left to raise anything — and the failure is silent until somebody
 * happens to open the site. That is the shape of the finding: "nothing is
 * watching".
 *
 * The answer is inversion. Instead of the platform reporting failure, it
 * reports SUCCESS on a schedule, to something that is not on this box, and
 * that thing alerts when the reports stop. Silence becomes the alarm.
 *
 * Set HEARTBEAT_URL to a check URL from any uptime service that accepts a
 * ping — healthchecks.io, Better Stack, Cronitor, UptimeRobot's heartbeat
 * monitors all work the same way, and all have a free tier that covers this.
 * Create a check with a period of five minutes and a grace of ten, paste its
 * URL into the environment file, and the day the box dies you get a message
 * on your phone rather than an email from a client three days later.
 *
 *   HEARTBEAT_URL=https://hc-ping.com/<uuid>
 *   HEARTBEAT_INTERVAL_MS=120000        (optional, default two minutes)
 *
 * A failing heartbeat is deliberately quiet in the log: the monitor is the
 * thing that shouts, and a ping that cannot get out is usually a network
 * blip rather than an emergency.
 */

const URL_ = () => String(process.env.HEARTBEAT_URL || "").trim();
const INTERVAL = Number(process.env.HEARTBEAT_INTERVAL_MS || 120000);

let timer = null;
let lastOk = null;
let lastError = null;
let sent = 0;

async function ping(state) {
  const base = URL_();
  if (!base) return;
  // Most services take an optional suffix: /start, /fail, or an exit code.
  const url = state === "fail" ? `${base.replace(/\/$/, "")}/fail` : base;
  try {
    await fetch(url, { method: "POST", signal: AbortSignal.timeout(8000) });
    lastOk = Date.now();
    lastError = null;
    sent += 1;
  } catch (err) {
    lastError = String(err?.message || err);
  }
}

export function startHeartbeat({ busy } = {}) {
  if (!URL_()) {
    console.log("[heartbeat] HEARTBEAT_URL is not set — nothing outside this box is watching it. See backend/lib/heartbeat.js.");
    return null;
  }
  const beat = async () => {
    // A heartbeat that reports "alive" while the store is unreadable is
    // worse than none, so the caller supplies a liveness test and a failed
    // one is reported as a failure rather than skipped.
    let healthy = true;
    try { healthy = busy ? busy() !== "broken" : true; } catch { healthy = false; }
    await ping(healthy ? "ok" : "fail");
  };
  beat();
  timer = setInterval(beat, Math.max(30000, INTERVAL));
  timer.unref?.();
  console.log(`[heartbeat] reporting to an outside monitor every ${Math.round(Math.max(30000, INTERVAL) / 1000)}s.`);
  return timer;
}

export function stopHeartbeat() {
  if (timer) clearInterval(timer);
  timer = null;
}

export const heartbeatState = () => ({
  configured: Boolean(URL_()),
  lastOk,
  lastError,
  sent,
  intervalMs: Math.max(30000, INTERVAL),
});
