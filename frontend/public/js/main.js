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
 * Wire a form to a public API endpoint.
 * Used by contact.html and subcontractors.html.
 */
export async function submitForm(form, endpoint, buildPayload) {
  const button = form.querySelector("button[type=submit]");
  const feedback = form.querySelector("[data-feedback]");
  button.disabled = true;
  button.textContent = "Sending…";
  feedback.textContent = "";
  feedback.className = "";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(new FormData(form))),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
    form.reset();
    feedback.className = "form-success";
    feedback.textContent = "✓ Received. Our team will get back to you within 2 business days.";
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
