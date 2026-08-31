/* ETABLIX public site behavior: nav, reveal-on-scroll, active link. */

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".main-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
}

// Highlight the current page in the nav.
const here = location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
document.querySelectorAll(".main-nav a").forEach((a) => {
  const href = a.getAttribute("href").replace(/\.html$/, "").replace(/\/$/, "") || "/";
  if (href === here) a.classList.add("active");
});

// Reveal-on-scroll.
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

/**
 * Wire a form to a public API endpoint. Sends multipart/form-data built
 * from the form itself, so file inputs (supporting documents) upload too.
 * Used by the enquiry and supplier-registration forms.
 */
export async function submitForm(form, endpoint, successMessage) {
  const button = form.querySelector("button[type=submit]");
  const feedback = form.querySelector("[data-feedback]");
  button.disabled = true;
  button.textContent = "Sending…";
  feedback.textContent = "";
  feedback.className = "";
  feedback.removeAttribute("style");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
    form.reset();
    feedback.className = "form-success";
    feedback.textContent =
      successMessage || "✓ Received. Our team will review your brief and respond.";
  } catch (err) {
    feedback.className = "form-success";
    feedback.style.borderColor = "#c0392b";
    feedback.style.color = "#c0392b";
    feedback.style.background = "rgba(192,57,43,0.08)";
    feedback.textContent = err.message;
  } finally {
    button.disabled = false;
    button.textContent = button.dataset.label || "Submit";
  }
}
