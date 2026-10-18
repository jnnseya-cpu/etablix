/**
 * Moved out of the page so the Content-Security Policy can be
 * script-src 'self' with no 'unsafe-inline'.
 *
 * That one keyword is the whole value of the policy: with it present, any
 * text that reaches the page as markup executes. The code is unchanged.
 */
/**
 * Where to go after signing in.
 *
 * THE BUG THIS FIXES. Login always went to the Control Desk, so a deep link
 * to any internal page was discarded by the sign-in it triggered: open
 * /internal/signals.html with an expired session, get bounced to login, sign
 * in, and land on the desk. The page you asked for is never reached, and the
 * reasonable conclusion is that it does not exist. That is exactly how it was
 * reported — "nowhere to be found" — about a page that was being served
 * correctly the whole time.
 *
 * ONLY INTERNAL PATHS. The stored value decides where the browser goes next,
 * so it is treated as untrusted even though we wrote it: a single leading
 * slash, no scheme, no protocol-relative "//host" that would send somebody to
 * another site wearing our sign-in. Anything else falls back to the desk.
 */
function afterLogin() {
  const DESK = "/internal/index.html";
  let wanted = null;
  try { wanted = sessionStorage.getItem("etablix.after-login"); } catch { return DESK; }
  try { sessionStorage.removeItem("etablix.after-login"); } catch { /* nothing to clear */ }
  if (!wanted || typeof wanted !== "string") return DESK;
  if (!wanted.startsWith("/internal/") || wanted.startsWith("//")) return DESK;
  if (/[\\:]|^\/internal\/login\.html/.test(wanted)) return DESK;
  // A traversal still starts with /internal/ and still escapes it. Resolve it
  // and check the result, rather than trusting the prefix it opened with.
  let resolved;
  try { resolved = new URL(wanted, location.origin); } catch { return DESK; }
  if (resolved.origin !== location.origin) return DESK;
  if (!resolved.pathname.startsWith("/internal/")) return DESK;
  return resolved.pathname + resolved.search + resolved.hash;
}

// Already signed in? Straight on to wherever you were going.
  if (sessionStorage.getItem("etablix.token")) {
    location.replace(afterLogin());
  }

  // Working credentials were printed on this page whenever the server
  // reported demo mode — and the seeded accounts are real accounts with
  // real permissions, so anyone who reached the page in that state could
  // sign in as the administrator. Nothing here names an account any more.

  const form = document.getElementById("login-form");
  const error = document.getElementById("error");
  const submit = document.getElementById("submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.classList.remove("show");
    submit.disabled = true;
    submit.textContent = "Signing in…";
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.value,
          password: form.password.value,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Sign-in failed. Try again.");
      sessionStorage.setItem("etablix.token", body.token);
      sessionStorage.setItem("etablix.user", JSON.stringify(body.user));
      location.replace(afterLogin());
    } catch (err) {
      error.textContent = err.message;
      error.classList.add("show");
      submit.disabled = false;
      submit.textContent = "Sign In";
    }
  });
