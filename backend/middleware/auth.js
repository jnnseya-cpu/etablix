import { verifyToken } from "../lib/auth.js";

/** Require a valid employee session token (Authorization: Bearer <token>). */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Authentication required." });
  }
  req.user = payload;
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
