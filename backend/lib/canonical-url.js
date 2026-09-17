/**
 * One address per page, decided here rather than by whatever is in front.
 *
 * Search Console reported pages not indexed because of "Page with redirect".
 * No application route redirected, so the cause was in front of the process —
 * and the repository held TWO reverse proxy configurations that disagreed
 * about it. deploy/Caddyfile redirects www to the apex; the nginx vhost
 * answered on both hosts and redirected neither. Whichever was deployed, the
 * canonical form of a URL was a property of the server the operator happened
 * to install, and nothing tested it.
 *
 * So the rule moves into the application, where it is one file, under version
 * control, and covered by a suite. A proxy in front that already does the
 * same thing makes this a no-op; a proxy that does not is now corrected
 * anyway.
 *
 * Four normalisations, each a single 301, in this order:
 *
 *   1. www.<canonical host>  →  <canonical host>
 *   2. http                  →  https      (only when the canonical site is https)
 *   3. /path/                →  /path      (no trailing slash except at the root)
 *   4. /path.html            →  /path      (the extensionless form, which is
 *                                           the form in the sitemap and in
 *                                           every canonical tag)
 *
 * Rule 4 matters more than it looks. express.static is mounted with
 * extensions:["html"], so /about and /about.html BOTH answered 200 with byte
 * identical content and neither pointed at the other. Two URLs, one page, and
 * only a canonical tag holding them together — which works until something
 * links the .html form and a crawler decides for itself which is primary.
 *
 * What it deliberately does NOT do:
 *
 *   · It redirects one alternate host — www — and no others. Guessing at the
 *     canonical host from an arbitrary Host header is how a site ends up
 *     redirecting a health check or a container probe into nowhere.
 *   · It never touches /api, /internal or /shared. The portal serves .html
 *     paths directly and the API must answer where it is asked.
 *   · It leaves the port on the host in development, so a redirect issued on
 *     localhost:3391 stays on localhost:3391.
 *   · It is inert when SITE_URL is unset or unparseable. No configuration, no
 *     opinion.
 *
 * Paired with `redirect: false` on the public static handler in app.js. Left
 * at its default, express.static answers a directory request by adding a
 * trailing slash — so /policies would 301 to /policies/, which rule 3 would
 * strip straight back off. That is a redirect loop, and the pairing is the
 * only thing preventing it.
 */

const SKIP = ["/api", "/internal", "/shared"];

export function canonicalUrl({ siteUrl = process.env.SITE_URL } = {}) {
  let host = null;
  let wantHttps = false;
  try {
    const u = new URL(String(siteUrl));
    host = u.hostname.toLowerCase();
    wantHttps = u.protocol === "https:";
  } catch {
    /* Nothing configured, so nothing to normalise — but SAY SO. A canonical
       rule that silently does not apply is worse than no rule: the redirects
       look implemented, the tests pass against a server that has SITE_URL,
       and production quietly serves two addresses for every page. The one
       thing that must not happen here is silence. */
    console.warn(
      "WARNING: SITE_URL is not set, so URL canonicalisation is OFF. " +
      "www is not redirected to the apex, /path/ and /path.html are not " +
      "normalised, and every page is reachable at more than one address. " +
      "Set SITE_URL=https://etablix.com in the environment file and restart."
    );
    return (req, res, next) => next();
  }

  return function canonical(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const pathname = req.path;
    for (const prefix of SKIP) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) return next();
    }

    const hostHeader = String(req.headers.host || "").toLowerCase();
    const reqHost = hostHeader.replace(/:\d+$/, "");
    const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http")
      .split(",")[0].trim().toLowerCase();

    // 1. the one alternate host we are willing to assume
    const newHost = reqHost === "www." + host ? hostHeader.replace(/^www\./, "") : null;

    // 2. scheme, and only in the direction that has a canonical answer
    const newProto = wantHttps && proto === "http" ? "https" : null;

    // 3 and 4. path form
    let target = pathname;
    if (target.length > 1) target = target.replace(/\/+$/, "") || "/";
    if (/\.html$/i.test(target)) target = target.replace(/\.html$/i, "") || "/";
    if (target === "/index") target = "/";

    if (!newHost && !newProto && target === pathname) return next();

    const q = req.originalUrl.indexOf("?");
    const query = q === -1 ? "" : req.originalUrl.slice(q);

    // An absolute Location only when the host or the scheme is changing.
    // Otherwise stay relative and let the client keep whatever it dialled.
    const location = (newHost || newProto)
      ? `${newProto || proto}://${newHost || hostHeader}${target}${query}`
      : `${target}${query}`;

    res.setHeader("Cache-Control", "no-cache");
    return res.redirect(301, location);
  };
}
