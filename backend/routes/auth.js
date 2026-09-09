import { Router } from "express";
import { collection, update } from "../lib/store.js";
import { issueToken, verifyPassword } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { hit } from "../lib/ratelimit.js";
import { validateLogin } from "../../shared/validation.js";

const router = Router();

/**
 * POST /api/auth/login — employee sign-in.
 *
 * Two limits, not one. The address limit stops a script working through
 * a password list from one place; the account limit stops the same
 * account being attacked from many places, which is what a botnet does
 * and what an address limit alone never sees. Both are deliberately
 * generous against a person who has mistyped their password twice.
 */
/**
 * POST /api/auth/login — employee sign-in.
 *
 * Only FAILURES count against the limit. A limit on attempts punishes
 * the office that signs in twenty people at nine o'clock; a limit on
 * failures only ever meets somebody guessing.
 *
 * Two counters, not one. The address counter stops a script working
 * through a password list from one place. The account counter stops the
 * same account being attacked from many places, which is what a botnet
 * does and what an address counter never sees.
 */
const FAILURE_WINDOW = 15 * 60_000;
const PER_ADDRESS = 30;
const PER_ACCOUNT = 10;

const clientAddress = (req) =>
  (process.env.TRUST_PROXY === "1"
    ? String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()
    : "") || req.ip || req.socket?.remoteAddress || "unknown";

router.post("/login", async (req, res) => {
  const { ok, errors, data } = validateLogin(req.body);
  if (!ok) return res.status(400).json({ error: errors[0], errors });

  const address = clientAddress(req);
  const failures = (key, max) => hit({ windowMs: FAILURE_WINDOW, max, key, peek: true });
  const byAddress = failures(`login:ip:${address}`, PER_ADDRESS);
  const byAccount = failures(`login:account:${data.email}`, PER_ACCOUNT);
  if (!byAddress.allowed || !byAccount.allowed) {
    const wait = Math.max(byAddress.retryAfterSeconds, byAccount.retryAfterSeconds);
    res.setHeader("Retry-After", String(wait));
    return res.status(429).json({
      error: byAccount.allowed
        ? "Too many failed sign-ins from this address. Wait fifteen minutes and try again."
        : "This account has had too many failed sign-ins. Wait fifteen minutes, or ask your administrator to reset the password.",
      retryAfterSeconds: wait,
    });
  }

  const user = collection("users").find((u) => u.email === data.email);
  // The password is verified even when there is no such account, so that
  // a wrong address and a wrong password take the same time to answer.
  // Otherwise the response time is a list of who works here.
  const okPassword = await verifyPassword(data.password, user?.password || "0".repeat(32) + ":" + "0".repeat(128));
  if (!user || !okPassword || user.active === false) {
    hit({ windowMs: FAILURE_WINDOW, max: PER_ADDRESS, key: `login:ip:${address}` });
    hit({ windowMs: FAILURE_WINDOW, max: PER_ACCOUNT, key: `login:account:${data.email}` });
    if (user && okPassword && user.active === false) {
      return res.status(401).json({ error: "This account has been deactivated. Contact your administrator." });
    }
    return res.status(401).json({ error: "Invalid email or password." });
  }

  res.json({
    token: issueToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

/** GET /api/auth/me — current session. */
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/logout-all — end every session on this account.
 *
 * The one thing a person can do for themselves when they think a device
 * has been lost: their own sessions, including this one, stop working
 * immediately.
 */
router.post("/logout-all", requireAuth, (req, res) => {
  const user = collection("users").find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "Account not found." });
  update("users", user.id, { sessionsValidFrom: Date.now() });
  res.json({ ended: true });
});

export default router;
