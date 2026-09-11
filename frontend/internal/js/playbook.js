/**
 * Moved out of the page so the Content-Security Policy can be
 * script-src 'self' with no 'unsafe-inline'.
 *
 * That one keyword is the whole value of the policy: with it present, any
 * text that reaches the page as markup executes. The code is unchanged.
 */
const token = sessionStorage.getItem("etablix.token");
  if (!token) location.replace("/internal/login.html");

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
