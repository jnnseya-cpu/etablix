/**
 * Moved out of the page so the Content-Security Policy can be
 * script-src 'self' with no 'unsafe-inline'.
 *
 * That one keyword is the whole value of the policy: with it present, any
 * text that reaches the page as markup executes. The code is unchanged.
 */
import { submitForm, renderCapabilityGrid } from "/js/main.js";

  renderCapabilityGrid(document.getElementById("s-capability"), document.getElementById("s-capability-count"));

  const form = document.getElementById("sub-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitForm(form, "/api/subcontractors",
      "✓ Registration received. Suppliers are assessed against project-specific capacity, competence, safety, quality, insurance and commercial requirements.");
  });
