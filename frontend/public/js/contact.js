/**
 * Moved out of the page so the Content-Security Policy can be
 * script-src 'self' with no 'unsafe-inline'.
 *
 * That one keyword is the whole value of the policy: with it present, any
 * text that reaches the page as markup executes. The code is unchanged.
 */
import { submitForm } from "/js/main.js";
  import { SERVICES, SECTORS } from "/shared/constants.js";

  function fill(select, options) {
    for (const value of options) {
      const opt = document.createElement("option");
      opt.textContent = value;
      select.appendChild(opt);
    }
  }
  fill(document.getElementById("l-service"), SERVICES);
  fill(document.getElementById("l-sector"), SECTORS);

  const form = document.getElementById("lead-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitForm(form, "/api/leads",
      "✓ Enquiry received. We review your brief, confirm fit and confidentiality requirements, then schedule a discovery call.");
  });
