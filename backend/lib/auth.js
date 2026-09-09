/**
 * Authentication primitives — password hashing (scrypt) and signed,
 * expiring session tokens (HMAC-SHA256). Uses only the Node standard
 * library so the backend stays dependency-light.
 */

import crypto from "node:crypto";
import { promisify } from "node:util";

export const TOKEN_TTL_HOURS = 12;

const scrypt = promisify(crypto.scrypt);

const SECRET =
  process.env.ETABLIX_TOKEN_SECRET ||
  // Ephemeral fallback for local development: tokens are invalidated on
  // every restart. Set ETABLIX_TOKEN_SECRET in production.
  crypto.randomBytes(32).toString("hex");

/**
 * scrypt is deliberately slow — that is what makes it worth using — and
 * the synchronous form runs that slowness ON THE EVENT LOOP. One process
 * serves the whole platform, so every login blocked every other request
 * for as long as it took to derive a key, and a few dozen wrong passwords
 * a second was enough to stall the site for everybody. The work goes to
 * the thread pool now. The synchronous forms remain for seeding, where
 * there is no loop to block.
 */
export function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)).toString("hex");
  return `${salt}:${hash}`;
}

function compare(candidate, hash) {
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export function verifyPasswordSync(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  return compare(crypto.scryptSync(password, salt, 64), hash);
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  return compare(await scrypt(password, salt, 64), hash);
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function sign(data) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function issueToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    // When it was issued, so a session can be revoked: an administrator
    // moves the account's cut-off forward and every token older than it
    // stops working. A signed token with no way of being withdrawn is
    // valid for its whole life whatever happens to the account behind it.
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_HOURS * 3600 * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  if (typeof token !== "string") return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
