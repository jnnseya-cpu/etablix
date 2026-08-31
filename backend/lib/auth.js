/**
 * Authentication primitives — password hashing (scrypt) and signed,
 * expiring session tokens (HMAC-SHA256). Uses only the Node standard
 * library so the backend stays dependency-light.
 */

import crypto from "node:crypto";

const TOKEN_TTL_HOURS = 12;

const SECRET =
  process.env.ETABLIX_TOKEN_SECRET ||
  // Ephemeral fallback for local development: tokens are invalidated on
  // every restart. Set ETABLIX_TOKEN_SECRET in production.
  crypto.randomBytes(32).toString("hex");

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
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
