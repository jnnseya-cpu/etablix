/**
 * pqq.html — moved out of the page so the Content-Security
 * Policy can be script-src 'self' with no 'unsafe-inline'.
 *
 * That single word is the difference between a policy that stops an
 * injected <script> and one that does not: with 'unsafe-inline' present,
 * any text that reaches the page as markup executes, which is exactly the
 * attack the policy exists to stop. The code is unchanged.
 */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const token = new URLSearchParams(location.search).get("t") || "";
  const intro = document.getElementById("pqq-intro");

  async function boot() {
    if (!token) {
      intro.innerHTML = "This questionnaire opens from the personal link in your invitation email — it looks like <b>etablix.com/pqq?t=…</b> and is unique to your company. Please open it directly from the email, or write to <a href=\"mailto:contact@etablix.com\">contact@etablix.com</a> if you need a new link.";
      return;
    }
    const res = await fetch(`/api/subcontractors/pqq/${encodeURIComponent(token)}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { intro.textContent = body.error || "This link is invalid or has expired."; return; }
    intro.innerHTML = `For <b>${esc(body.company)}</b> (${esc(body.capability)}). This is the evidence stage of ETABLIX prequalification — your answers feed directly into our twelve-criterion assessment. Registration is not a guarantee of work; assessment is against project-specific capacity, competence, safety, quality, insurance and commercial requirements.${body.submitted ? "<br><b>You have already submitted — re-submitting replaces your previous answers.</b>" : ""}`;
    const holder = document.getElementById("pqq-sections");
    holder.innerHTML = body.sections.map((s) => `
      <div class="pqq-section">
        <span class="crit">Criterion: ${esc(s.criterion)}</span>
        <h3>${esc(s.title)}</h3>
        ${s.fields.map((f) => {
          if (f.type === "declaration") return `<label class="pqq-dec"><input type="checkbox" data-f="${f.id}"> <span>${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</span></label>`;
          if (f.type === "select") return `<div class="pqq-field"><label>${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</label><select data-f="${f.id}"><option value="">Select…</option>${f.options.map((o) => `<option>${esc(o)}</option>`).join("")}</select></div>`;
          if (f.type === "textarea") return `<div class="pqq-field"><label>${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</label><textarea data-f="${f.id}"></textarea></div>`;
          return `<div class="pqq-field"><label>${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</label><input type="${f.type}" data-f="${f.id}"></div>`;
        }).join("")}
      </div>`).join("");
    document.getElementById("pqq-checklist").innerHTML = body.documentsChecklist.map((d) => `<li>${esc(d)}</li>`).join("");
    document.getElementById("pqq-form").hidden = false;
  }

  document.getElementById("pqq-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("pqq-error");
    err.classList.remove("show");
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      const answers = {};
      for (const el of document.querySelectorAll("[data-f]")) {
        answers[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
      }
      const fd = new FormData();
      fd.append("answers", JSON.stringify(answers));
      for (const file of document.getElementById("pqq-files").files) fd.append("documents", file);
      const res = await fetch(`/api/subcontractors/pqq/${encodeURIComponent(token)}`, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Submission failed (${res.status})`);
      document.getElementById("pqq-form").hidden = true;
      document.getElementById("pqq-done").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      err.textContent = e2.message;
      err.classList.add("show");
      btn.disabled = false; btn.textContent = "Submit questionnaire";
    }
  });

  boot().catch(() => (intro.textContent = "Something went wrong loading the questionnaire — please try again."));
