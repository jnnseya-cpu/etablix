/**
 * Human verification for the public forms — no third-party CAPTCHA,
 * three server-enforced gates a browser passes invisibly:
 *
 *   1. Signed challenge token — issued by GET /api/human-check, HMAC'd
 *      with a per-process secret, single-use, and only valid once it is
 *      at least MIN_AGE_MS old (a fill-time trap: scripts submit in
 *      milliseconds, people don't) and at most MAX_AGE_MS old.
 *   2. Proof-of-work — the browser must find a nonce whose SHA-256 with
 *      the token starts with POW_PREFIX. Milliseconds for one visitor,
 *      real money at bot-spam volume.
 *   3. Honeypot — a visually hidden "website" field no person can see.
 *      Anything in it is an automated submission.
 */

import crypto from "node:crypto";

const SECRET = crypto.randomBytes(32); // per-process, like auth tokens
const MIN_AGE_MS = 3000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const POW_PREFIX = "000"; // 12 bits — ~4k hashes per submission

const usedNonces = new Map(); // nonce → expiry
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiry] of usedNonces) if (expiry < now) usedNonces.delete(nonce);
}, 10 * 60 * 1000).unref();

const sign = (payload) =>
  crypto.createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 32);

/** A fresh challenge for the browser: token to hold, work to do, time to wait. */
export function issueChallenge() {
  const payload = `${Date.now().toString(36)}.${crypto.randomBytes(8).toString("hex")}`;
  return { token: `${payload}.${sign(payload)}`, powPrefix: POW_PREFIX, minWaitMs: MIN_AGE_MS };
}

/** Returns null when the submission verifies as human, else a failure code. */
function verify(token, pow) {
  const [ts, nonce, sig] = String(token || "").split(".");
  if (!ts || !nonce || !sig || sign(`${ts}.${nonce}`) !== sig) return "invalid";
  const age = Date.now() - parseInt(ts, 36);
  if (!(age >= 0) || age > MAX_AGE_MS) return "invalid";
  if (age < MIN_AGE_MS) return "too_fast";
  const hash = crypto.createHash("sha256").update(`${token}:${String(pow || "").slice(0, 20)}`).digest("hex");
  if (!hash.startsWith(POW_PREFIX)) return "invalid";
  if (usedNonces.has(nonce)) return "invalid";
  usedNonces.set(nonce, Date.now() + MAX_AGE_MS);
  return null;
}

/** Middleware for public form POSTs. Mount after the multipart parser. */
export function requireHuman(req, res, next) {
  if (String(req.body?.website || "").trim()) {
    // Honeypot tripped — automated submission; no retry hint.
    console.warn(`human-check: honeypot tripped on ${req.originalUrl}`);
    return res.status(400).json({ error: "This submission could not be accepted." });
  }
  const fail = verify(req.body?.hct, req.body?.pow);
  if (fail) {
    console.warn(`human-check: rejected (${fail}) on ${req.originalUrl}`);
    return res.status(400).json({
      error: "We couldn't verify this submission — please try again.",
      code: `human_${fail}`,
    });
  }
  next();
}
