/**
 * SECURITY HEADERS, SET BY THE APPLICATION.
 *
 * They existed only in deploy/Caddyfile, which means they were set on
 * exactly one of the three supported deployment routes. A Render blueprint
 * deploy and the nginx vhost both shipped with no HSTS, no nosniff, no frame
 * protection and no policy of any kind — and nothing about the running site
 * says so. A header set by the proxy is a header you have to remember to set
 * again every time you change how you host.
 *
 * So they are set here, on every response, on every route. A proxy that also
 * sets them is harmless; a proxy that does not is now irrelevant.
 *
 * THE ONE THAT DOES THE WORK IS THE CONTENT-SECURITY POLICY, and the reason
 * the three public portal pages had their scripts moved into files is this
 * line: `script-src 'self'` with no `'unsafe-inline'`. With that word
 * present, any text that reaches a page as markup executes, which is the
 * attack the policy exists to stop — the policy would be decoration.
 *
 * `style-src` DOES keep 'unsafe-inline', and that is a deliberate,
 * documented compromise rather than an oversight. The pages carry a hundred
 * and twenty-odd inline style attributes and every generated document has a
 * <style> block; removing them is a large refactor with no security gain
 * worth the risk, because injected CSS cannot execute. Scripts can.
 *
 * HSTS is production-only and https-only. Sending it over plain http on a
 * development machine pins localhost to https in the browser for a year,
 * which is a genuinely nasty thing to do to somebody.
 */

/** Where fonts actually come from. Anything else is refused. */
const FONT_ORIGINS = ["https://fonts.gstatic.com"];
const STYLE_ORIGINS = ["https://fonts.googleapis.com"];

export function policy({ production = false } = {}) {
  return [
    "default-src 'self'",
    // No 'unsafe-inline', no 'unsafe-eval'. This is the line that matters.
    "script-src 'self'",
    `style-src 'self' 'unsafe-inline' ${STYLE_ORIGINS.join(" ")}`,
    `font-src 'self' ${FONT_ORIGINS.join(" ")}`,
    // data: for the inline SVG and the generated charts; blob: for a
    // client-side download of a document the server produced.
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    // Nothing on this site is framed, and nothing frames it.
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // A form that posts anywhere but here is a form somebody injected.
    "form-action 'self'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function securityHeaders({ production = process.env.NODE_ENV === "production" } = {}) {
  const csp = policy({ production });
  return (req, res, next) => {
    res.setHeader("Content-Security-Policy", csp);
    // A browser that sniffs a .txt upload as HTML executes it. This one line
    // is why an uploaded file cannot become a page.
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    // Only over https, and only in production. Sending it over plain http on
    // a development machine pins localhost to https for a year.
    if (production && (req.secure || String(req.get("x-forwarded-proto") || "").split(",")[0].trim() === "https")) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  };
}
