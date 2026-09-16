/**
 * Moved out of the page so the Content-Security Policy can be
 * script-src 'self' with no 'unsafe-inline'.
 *
 * That one keyword is the whole value of the policy: with it present, any
 * text that reaches the page as markup executes. The code is unchanged.
 */
const token = sessionStorage.getItem("etablix.token");
  if (!token) {
    location.replace("/internal/login.html");
    /* location.replace() does NOT stop the script. Without halting here the
       module carried on to the first line that touches the session or the DOM and
       threw a TypeError before the browser had navigated — which is why a direct
       visit to this page with no session painted a broken shell and logged an
       error instead of going quietly to the login page. Top-level await in a
       module is the halt: evaluation stops, the navigation completes, and nothing
       below runs. */
    await new Promise(() => {});
  }

  document.getElementById("logout").addEventListener("click", () => {
    sessionStorage.clear();
    location.replace("/internal/login.html");
  });

  fetch("/api/playbook", { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      if (res.status === 401) {
        sessionStorage.clear();
        location.replace("/internal/login.html");
        throw new Error("unauthorised");
      }
      return res.json();
    })
    .then(({ title, classification, html }) => {
      document.getElementById("pb").innerHTML =
        `<span class="classification">${classification}</span><h1>${title}</h1>${html}`;
    })
    .catch((err) => {
      if (err.message !== "unauthorised") {
        document.getElementById("pb").innerHTML =
          '<p class="error-note">Could not load the playbook. Try again.</p>';
      }
    });
