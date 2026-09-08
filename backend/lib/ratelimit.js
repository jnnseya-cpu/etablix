/**
 * A fixed-window rate limiter, in memory, with no dependencies.
 *
 * The public forms had none. The human check stops a naive script; nothing
 * stopped volume, and one loop could fill the enquiry table, the notification
 * feed and the disk.
 *
 * In memory is the right scope here: one container, one process. If the
 * platform is ever run on more than one instance this has to move to a shared
 * store, and that is written down rather than assumed.
 */
const buckets = new Map();

// Bound the map so the limiter cannot itself become the leak.
const MAX_KEYS = 20000;

function sweep(now) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/**
 * limit({ windowMs, max, key })
 *   → { allowed, remaining, retryAfterSeconds }
 */
export function hit({ windowMs, max, key }) {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) sweep(now);
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  const remaining = Math.max(0, max - b.count);
  return {
    allowed: b.count <= max,
    remaining,
    retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000),
  };
}

/**
 * Express middleware. `name` separates the buckets so a burst of enquiries
 * cannot exhaust the allowance for supplier registrations.
 *
 * The client address is taken from the proxy header only when TRUST_PROXY is
 * set, because a header anyone can send is not an identity.
 */
export function rateLimit({ name, windowMs = 60_000, max = 20, message }) {
  return function (req, res, next) {
    const ip = (process.env.TRUST_PROXY === "1"
      ? String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()
      : "") || req.ip || req.socket?.remoteAddress || "unknown";
    const r = hit({ windowMs, max, key: `${name}:${ip}` });
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(r.remaining));
    if (r.allowed) return next();
    res.setHeader("Retry-After", String(r.retryAfterSeconds));
    return res.status(429).json({
      error: message || `Too many requests. Try again in ${r.retryAfterSeconds} seconds.`,
      retryAfterSeconds: r.retryAfterSeconds,
    });
  };
}

/** For tests and the health view. */
export const activeBuckets = () => buckets.size;
