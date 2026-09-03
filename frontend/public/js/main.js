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
 * Human verification for the public forms. On the first real interaction
 * with a form (pointer, key or focus — a person, not a script), fetch a
 * challenge from the server and solve its proof-of-work in the
 * background. The solved token rides along with the submission; the
 * server also enforces a minimum fill time and a honeypot. Invisible to
 * people, expensive for bots.
 */
const humanChallenges = new Map(); // form → Promise<{token, pow, readyAt}>

async function solveChallenge() {
  const res = await fetch("/api/human-check");
  if (!res.ok) throw new Error("Verification unavailable. Please reload and try again.");
  const { token, powPrefix, minWaitMs } = await res.json();
  const encoder = new TextEncoder();
  for (let pow = 0; ; pow++) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${token}:${pow}`));
    const hex = [...new Uint8Array(digest).slice(0, 4)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hex.startsWith(powPrefix)) return { token, pow: String(pow), readyAt: Date.now() + minWaitMs };
  }
}

function armHumanCheck(form) {
  const arm = () => {
    if (!humanChallenges.has(form)) humanChallenges.set(form, solveChallenge().catch(() => null));
  };
  for (const type of ["pointerdown", "keydown", "focusin", "touchstart"]) {
    form.addEventListener(type, arm, { passive: true });
  }
}

// Every public form with a feedback area is human-verified.
document.querySelectorAll("form").forEach((f) => {
  if (f.querySelector("[data-feedback]")) armHumanCheck(f);
});

async function takeChallenge(form) {
  const challenge = await (humanChallenges.get(form) || solveChallenge().catch(() => null));
  humanChallenges.delete(form); // single-use — the next submit gets a fresh one
  humanChallenges.set(form, solveChallenge().catch(() => null));
  if (!challenge) throw new Error("Verification unavailable. Please reload the page and try again.");
  const wait = challenge.readyAt - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return challenge;
}

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
    const post = async () => {
      const data = new FormData(form);
      // Autofill can populate the hidden honeypot for a real person; a
      // JS-driven submission is vouched for by the solved challenge, so
      // clear it. Direct (non-JS) bot posts never run this line.
      data.set("website", "");
      const { token, pow } = await takeChallenge(form);
      data.set("hct", token);
      data.set("pow", pow);
      const res = await fetch(endpoint, { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      return { res, body };
    };
    let { res, body } = await post();
    if (!res.ok && /^human_/.test(body.code || "")) {
      // Stale or restarted-server challenge — recover once with a fresh one.
      ({ res, body } = await post());
    }
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
