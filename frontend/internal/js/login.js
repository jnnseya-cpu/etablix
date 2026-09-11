/**
 * Moved out of the page so the Content-Security Policy can be
 * script-src 'self' with no 'unsafe-inline'.
 *
 * That one keyword is the whole value of the policy: with it present, any
 * text that reaches the page as markup executes. The code is unchanged.
 */
// Already signed in? Straight to the dashboard.
  if (sessionStorage.getItem("etablix.token")) {
    location.replace("/internal/index.html");
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
      location.replace("/internal/index.html");
    } catch (err) {
      error.textContent = err.message;
      error.classList.add("show");
      submit.disabled = false;
      submit.textContent = "Sign In";
    }
  });
