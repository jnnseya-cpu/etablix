/**
 * supplier-portal.html — moved out of the page so the Content-Security
 * Policy can be script-src 'self' with no 'unsafe-inline'.
 *
 * That single word is the difference between a policy that stops an
 * injected <script> and one that does not: with 'unsafe-inline' present,
 * any text that reaches the page as markup executes, which is exactly the
 * attack the policy exists to stop. The code is unchanged.
 */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const money = (n) => n == null ? "—" : "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2 });
  const token = new URLSearchParams(location.search).get("t") || "";
  const intro = document.getElementById("sp-intro");
  const api = `/api/subcontractors/portal/${encodeURIComponent(token)}`;

  const STATUS_LABEL = { received: "Received — being assessed", certified: "Certified — payment notice issued", paid: "Paid" };

  function renderApps(list) {
    document.getElementById("sp-apps").innerHTML = list.length ? list.map((p) => `<tr>
      <td><b>${esc(p.number)}</b></td>
      <td>${esc(p.period)} · ${esc(p.poRef)}</td>
      <td>${money(p.claimed)}</td>
      <td>${p.certified == null ? "—" : money(p.certified) + (p.retention ? `<div style=\"font-size:0.75rem;color:var(--muted,#5b6470);\">retention ${money(p.retention)}${p.cisDeduction ? " · CIS " + money(p.cisDeduction) : ""}</div>` : "")}</td>
      <td><b>${money(p.netPayable)}</b></td>
      <td><span class="sp-pill ${p.status === "paid" ? "ok" : "wait"}">${esc(STATUS_LABEL[p.status] || p.status)}</span>
          ${p.certReasons ? `<div style=\"font-size:0.78rem;color:var(--muted,#5b6470);margin-top:4px;\">${esc(p.certReasons)}</div>` : ""}</td>
    </tr>`).join("") : '<tr><td colspan="6" style="color:var(--muted,#5b6470);">No applications yet.</td></tr>';
  }

  async function boot() {
    if (!token) { intro.textContent = "This portal opens from the personal link in your onboarding email. Contact contact@etablix.com if you need it re-sent."; return; }
    const res = await fetch(api);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { intro.textContent = body.error || "This portal link is invalid."; return; }

    if (!body.onboarded) {
      intro.innerHTML = `Welcome, <b>${esc(body.company)}</b>. Complete your one-time onboarding to activate applications for payment.`;
      const holder = document.getElementById("sp-ob-sections");
      holder.innerHTML = body.sections.map((s) => `<div class="sp-card">
        <h3>${esc(s.title)}</h3>
        ${s.note ? `<p style="font-size:0.85rem;color:var(--muted,#5b6470);margin-top:4px;">${esc(s.note)}</p>` : ""}
        ${s.fields.map((f) => {
          if (f.type === "declaration") return `<label class="sp-dec"><input type="checkbox" data-f="${f.id}"> <span>${esc(f.label)} <span class="req">*</span></span></label>`;
          if (f.type === "select") return `<div class="sp-field"><label>${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</label><select data-f="${f.id}"><option value="">Select…</option>${f.options.map((o) => `<option>${esc(o)}</option>`).join("")}</select></div>`;
          return `<div class="sp-field"><label>${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</label><input type="text" data-f="${f.id}"></div>`;
        }).join("")}
      </div>`).join("");
      document.getElementById("sp-onboarding").hidden = false;
      return;
    }

    intro.innerHTML = `Signed in as <b>${esc(body.company)}</b> — ${esc(body.contact)}.`;
    document.getElementById("sp-company").textContent = body.company;
    document.getElementById("sp-bank-masked").textContent = body.bankOnFile || "—";
    const bankPill = document.getElementById("sp-bank-pill");
    bankPill.textContent = body.bankVerified ? "Bank verified" : "Bank verification pending";
    bankPill.className = "sp-pill " + (body.bankVerified ? "ok" : "wait");
    const statusPill = document.getElementById("sp-status-pill");
    statusPill.textContent = body.status.replace(/_/g, " ");
    statusPill.className = "sp-pill ok";
    document.getElementById("sp-terms").innerHTML = body.terms.map((t) => `<li>${esc(t)}</li>`).join("");
    renderEngagements(body.engagements || [], body.ndaText || []);
    renderApps(body.applications);
    document.getElementById("sp-home").hidden = false;
  }

  const ENG_LABEL = { sent: "Awaiting your action", nda_accepted: "Open — price by the return date", quoted: "Quotation submitted — under review", po_issued: "Awarded — PO issued", declined: "Not successful" };

  function renderEngagements(list, ndaText) {
    const holder = document.getElementById("sp-engagements");
    if (!list.length) { holder.innerHTML = '<p style="color:var(--muted,#5b6470);font-size:0.88rem;">No open enquiries at the moment. Invitations arrive by email and appear here.</p>'; return; }
    holder.innerHTML = list.map((e) => `
      <div style="border:1.5px solid var(--line);border-radius:8px;padding:16px 18px;margin-top:12px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline;">
          <b>${esc(e.title)}</b>
          <span class="sp-pill ${e.status === "po_issued" ? "ok" : "wait"}">${esc(ENG_LABEL[e.status] || e.status)}</span>
        </div>
        <div style="font-size:0.82rem;color:var(--muted,#5b6470);margin-top:4px;">Return by ${esc(e.returnBy)}${e.project ? ` · Project: ${esc(e.project)}` : ""}</div>

        ${e.ndaRequired && !e.ndaAccepted ? `
          <div class="sp-note" style="margin:12px 0 0;">
            <b>Confidentiality undertaking required.</b> The project identity, requirement and ${typeof e.documents === "number" ? e.documents : 0} document(s) open once accepted.
            <details style="margin-top:8px;"><summary style="cursor:pointer;font-weight:600;">Read the undertaking</summary>
              <div style="font-size:0.82rem;line-height:1.6;margin-top:8px;">${ndaText.map((p) => `<p style="margin:6px 0;">${esc(p)}</p>`).join("")}</div>
            </details>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:10px;">
              <input data-nda-name="${e.id}" placeholder="Signatory full name" style="padding:9px 11px;border:1.5px solid var(--line);border-radius:6px;">
              <input data-nda-position="${e.id}" placeholder="Position (e.g. Director)" style="padding:9px 11px;border:1.5px solid var(--line);border-radius:6px;">
            </div>
            <label class="sp-dec" style="margin-top:10px;"><input type="checkbox" data-nda-tick="${e.id}"> <span>I am authorised to bind the company and accept this undertaking.</span></label>
            <button class="btn btn-primary" data-nda-accept="${e.id}" style="margin-top:10px;padding:9px 20px;">Accept &amp; open the enquiry</button>
          </div>` : `
          ${e.scope ? `<p style="font-size:0.88rem;line-height:1.6;margin-top:10px;white-space:pre-wrap;">${esc(e.scope)}</p>` : ""}
          ${Array.isArray(e.documents) && e.documents.length ? `<div style="font-size:0.85rem;margin-top:8px;"><b>Enquiry documents:</b> ${e.documents.map((d) => `<a href="/api/subcontractors/portal/${encodeURIComponent(token)}/engagements/${e.id}/files/${encodeURIComponent(d.stored)}" style="color:var(--orange);">${esc(d.name)}</a>`).join(" · ")}</div>` : ""}

          ${e.quote ? `<div style="font-size:0.85rem;margin-top:10px;border-left:3px solid var(--line);padding-left:12px;">Your quotation: <b>${money(e.quote.sum)}</b> · ${esc(e.quote.programme)}${e.status === "po_issued" ? `<br><b style="color:#1f9d61;">Awarded — PO ${esc(e.poNumber)} at ${money(e.agreedSum)}.</b> Quote ${esc(e.poNumber)} on your applications for payment below.` : ""}${e.status === "declined" ? `<br>${esc(e.decisionNote || "Not taken forward on this occasion.")}` : ""}</div>` : ""}

          ${["sent", "nda_accepted"].includes(e.status) ? `
          <form data-quote-form="${e.id}" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px;">
            <b style="font-size:0.9rem;">Submit your price</b>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:8px;">
              <input name="sum" type="number" step="0.01" min="0.01" required placeholder="Price (£, excl. VAT)" style="padding:9px 11px;border:1.5px solid var(--line);border-radius:6px;">
              <input name="programme" required placeholder="Programme / lead time" style="padding:9px 11px;border:1.5px solid var(--line);border-radius:6px;">
            </div>
            <textarea name="notes" placeholder="Clarifications, exclusions, assumptions (optional)" style="width:100%;min-height:60px;margin-top:8px;padding:9px 11px;border:1.5px solid var(--line);border-radius:6px;font-family:inherit;"></textarea>
            <input type="file" name="qdocs" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" style="margin-top:8px;border:1.5px dashed var(--line);padding:10px;border-radius:6px;width:100%;">
            <button class="btn btn-primary" type="submit" style="margin-top:10px;padding:9px 20px;">Submit quotation</button>
          </form>` : ""}
        `}
      </div>`).join("");
  }

  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button[data-nda-accept]");
    if (!btn) return;
    const id = btn.dataset.ndaAccept;
    btn.disabled = true;
    try {
      const res = await fetch(`${api}/engagements/${id}/nda`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.querySelector(`[data-nda-name="${id}"]`).value,
          position: document.querySelector(`[data-nda-position="${id}"]`).value,
          accepted: document.querySelector(`[data-nda-tick="${id}"]`).checked,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not record acceptance.");
      const state = await (await fetch(api)).json();
      renderEngagements(state.engagements || [], state.ndaText || []);
    } catch (e2) { alert(e2.message); btn.disabled = false; }
  });

  document.addEventListener("submit", async (ev) => {
    const form = ev.target.closest("form[data-quote-form]");
    if (!form) return;
    ev.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      const fd = new FormData();
      fd.set("sum", form.sum.value);
      fd.set("programme", form.programme.value);
      fd.set("notes", form.notes.value);
      for (const f of form.qdocs.files) fd.append("documents", f);
      const res = await fetch(`${api}/engagements/${form.dataset.quoteForm}/quote`, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Submission failed.");
      const state = await (await fetch(api)).json();
      renderEngagements(state.engagements || [], state.ndaText || []);
      alert(body.message);
    } catch (e2) { alert(e2.message); btn.disabled = false; btn.textContent = "Submit quotation"; }
  });

  document.getElementById("sp-onboarding").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("sp-ob-error");
    err.classList.remove("show");
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      const answers = {};
      for (const el of document.querySelectorAll("#sp-ob-sections [data-f]")) {
        answers[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
      }
      const res = await fetch(`${api}/onboarding`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Submission failed.");
      document.getElementById("sp-onboarding").hidden = true;
      document.getElementById("sp-done").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      err.textContent = e2.message; err.classList.add("show");
      btn.disabled = false; btn.textContent = "Complete onboarding";
    }
  });

  document.getElementById("sp-app-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("sp-app-error");
    err.classList.remove("show");
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      const fd = new FormData(e.target);
      for (const file of document.getElementById("sp-app-files").files) fd.append("documents", file);
      const res = await fetch(`${api}/applications`, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Submission failed.");
      e.target.reset();
      const state = await (await fetch(api)).json();
      renderApps(state.applications || []);
      alert(body.message);
    } catch (e2) {
      err.textContent = e2.message; err.classList.add("show");
    } finally {
      btn.disabled = false; btn.textContent = "Submit application";
    }
  });

  boot().catch(() => (intro.textContent = "Something went wrong loading the portal — please try again."));
