/**
 * Platform error alerting.
 *
 * It used to be email only, which meant the alarm for the building was wired
 * to the fuse that kept blowing: mail was the thing failing, so the failures
 * went unreported. Every error now takes three routes that do not share a
 * failure mode:
 *
 *   1. an append-only file on disk, which needs nothing to be working
 *   2. an optional webhook (ALERT_WEBHOOK_URL) — Slack, Teams, anything
 *   3. email, as before
 *
 * Throttled to one alert per distinct error per hour so a repeating fault
 * reports once rather than flooding. Never throws: an alert failure must not
 * worsen the failure it is reporting.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emit } from "./comms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = process.env.ETABLIX_DATA_DIR
  ? path.resolve(process.env.ETABLIX_DATA_DIR)
  : path.join(__dirname, "..", "data");
const ERROR_LOG = path.join(LOG_DIR, "errors.log");
const MAX_LOG_BYTES = 5 * 1024 * 1024;

/** Route 1: disk. Nothing has to be working for this to succeed. */
function toDisk(entry) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    try {
      if (fs.statSync(ERROR_LOG).size > MAX_LOG_BYTES) fs.renameSync(ERROR_LOG, ERROR_LOG + ".1");
    } catch {}
    fs.appendFileSync(ERROR_LOG, JSON.stringify(entry) + "\n");
  } catch {}
}

/** Route 2: a webhook, which does not share a failure mode with email. */
function toWebhook(entry) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const body = JSON.stringify({ text: `ETABLIX ${entry.level}: ${entry.context} — ${entry.message}` });
  // Never awaited, and its own failure is swallowed: an alert must not be
  // able to delay or break the request that produced it.
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body,
    signal: AbortSignal.timeout(5000) }).catch(() => {});
}

/** The last errors, for the Control Desk. Read from disk so it survives a restart. */
export function recentErrors(limit = 50) {
  try {
    const lines = fs.readFileSync(ERROR_LOG, "utf8").trim().split("\n");
    return lines.slice(-limit).reverse().map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

const THROTTLE_MS = 60 * 60 * 1000;
const recent = new Map(); // signature → last alerted at

setInterval(() => {
  const cutoff = Date.now() - THROTTLE_MS;
  for (const [k, t] of recent) if (t < cutoff) recent.delete(k);
}, 10 * 60 * 1000).unref();

export function reportError(err, context = "", level = "error") {
  try {
    const entry = {
      at: new Date().toISOString(),
      level,
      context: context || "unhandled",
      message: String(err?.message || err || "unknown error").slice(0, 500),
      stack: err?.stack ? String(err.stack).split("\n").slice(0, 6).join(" | ") : null,
      build: process.env.BUILD_COMMIT || null,
    };
    toDisk(entry);       // always, first, before anything that can fail
    toWebhook(entry);
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
