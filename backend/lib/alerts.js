/**
 * Platform error alerting — the self-hosted alternative to an external
 * monitoring service. Server errors email the internal team through
 * the existing comms engine, throttled to one alert per distinct error
 * per hour so a repeating fault sends one email, not a flood. Never
 * throws: an alert failure must not worsen the original failure.
 */

import { emit } from "./comms.js";

const THROTTLE_MS = 60 * 60 * 1000;
const recent = new Map(); // signature → last alerted at

setInterval(() => {
  const cutoff = Date.now() - THROTTLE_MS;
  for (const [k, t] of recent) if (t < cutoff) recent.delete(k);
}, 10 * 60 * 1000).unref();

export function reportError(err, context = "") {
  try {
    const message = String(err?.message || err || "unknown error").slice(0, 300);
    const signature = `${context}:${message}`;
    const last = recent.get(signature) || 0;
    if (Date.now() - last < THROTTLE_MS) return;
    recent.set(signature, Date.now());
    emit("platform.error", {
      vars: { item: context || "server", message },
      detailsText: [
        `Context: ${context || "unhandled"}`,
        `Error: ${message}`,
        err?.stack ? `\n${String(err.stack).split("\n").slice(0, 8).join("\n")}` : null,
        `\nFull detail: docker logs etablix on the VPS.`,
      ].filter(Boolean).join("\n"),
    }).catch(() => {});
  } catch {}
}
