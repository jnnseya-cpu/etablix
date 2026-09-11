/**
 * Moved out of the page so the Content-Security Policy can be
 * script-src 'self' with no 'unsafe-inline'.
 *
 * That one keyword is the whole value of the policy: with it present, any
 * text that reaches the page as markup executes. The code is unchanged.
 */
import { submitForm, renderCapabilityGrid } from "/js/main.js";
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
  renderCapabilityGrid(document.getElementById("s-capability"), document.getElementById("s-capability-count"));

  const leadForm = document.getElementById("lead-form");
  leadForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitForm(leadForm, "/api/leads",
      "✓ Enquiry received. We review your brief, confirm fit and confidentiality requirements, then schedule a discovery call.");
  });

  const subForm = document.getElementById("sub-form");
  subForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitForm(subForm, "/api/subcontractors",
      "✓ Registration received. Suppliers are assessed against project-specific capacity, competence, safety, quality, insurance and commercial requirements.");
  });
