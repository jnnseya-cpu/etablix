import { verifyToken } from "../lib/auth.js";
import { collection } from "../lib/store.js";

/**
 * Require a valid employee session (Authorization: Bearer <token>).
 *
 * A signed token used to be the whole answer, which meant it kept
 * working for its full twelve hours whatever happened to the account
 * behind it: a deactivated employee stayed signed in, a demoted one kept
 * the permissions of the role they had lost, and a password reset after
 * a device went missing changed nothing at all. There was no way to
 * withdraw a session.
 *
 * So the account is read on every request. It is one lookup in memory,
 * and it makes revocation real: `sessionsValidFrom` on the account
 * invalidates every token issued before it, and the ROLE COMES FROM THE
 * ACCOUNT rather than from the token, so a change of role takes effect
 * on the next request instead of the next day.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Authentication required." });

  const user = collection("users").find((u) => u.id === payload.sub);
  if (!user || user.active === false) {
    return res.status(401).json({ error: "This session is no longer valid. Sign in again." });
  }
  if (typeof user.sessionsValidFrom === "number" && (payload.iat || 0) < user.sessionsValidFrom) {
    return res.status(401).json({ error: "This session was ended. Sign in again." });
  }

  req.user = { ...payload, role: user.role, name: user.name, email: user.email };
  next();
}

/** Restrict a route to specific roles, e.g. requireRole("admin"). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    next();
  };
}

/**
 * The same check for a link opened in a new tab, where the token has to
 * travel as a query parameter because a browser sends no header for a
 * plain navigation. Returns the session, or null.
 */
export function sessionFromQuery(token) {
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = collection("users").find((u) => u.id === payload.sub);
  if (!user || user.active === false) return null;
  if (typeof user.sessionsValidFrom === "number" && (payload.iat || 0) < user.sessionsValidFrom) return null;
  return { ...payload, role: user.role, name: user.name, email: user.email };
}
