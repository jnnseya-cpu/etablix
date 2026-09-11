/**
 * client-portal.html — moved out of the page so the Content-Security
 * Policy can be script-src 'self' with no 'unsafe-inline'.
 *
 * That single word is the difference between a policy that stops an
 * injected <script> and one that does not: with 'unsafe-inline' present,
 * any text that reaches the page as markup executes, which is exactly the
 * attack the policy exists to stop. The code is unchanged.
 */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => n == null ? "—" : "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (ms) => ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const token = new URLSearchParams(location.search).get("t") || "";
const api = `/api/clients/portal/${encodeURIComponent(token)}`;
const $ = (id) => document.getElementById(id);
let STATE = null;

const STATE_LABEL = { supplied: "Supplied", not_held: "Not held — answered", outstanding: "Outstanding" };
// The second button has to mean something for the kind of line it sits under.
// "I do not hold this" is right for a document and wrong for a VAT position.
const ANSWER_LABEL = { file: "Attach it", file_note: "Supply this", text: "Answer this", confirm: "Confirm this" };
const NOT_HELD_LABEL = { file: "I do not hold this", file_note: "I do not hold this", text: "This does not apply", confirm: "This does not apply" };
const PLACEHOLDER = {
  file: "A note about what you are attaching, or why it does not exist.",
  file_note: "A note — what you are sending, or why it does not exist.",
  text: "Your answer.",
  confirm: "Your answer, and anything we should know about it.",
};
const STATE_PILL = { supplied: "ok", not_held: "muted", outstanding: "warning" };

function showError(el, msg) { el.textContent = msg; el.classList.add("show"); }
function clearError(el) { el.textContent = ""; el.classList.remove("show"); }

/* ------------------------------------------------------------ rendering */

function renderRail(e, stages) {
  $("cp-rail").innerHTML = stages.map((s, i) => {
    const cls = i < e.stageIndex ? "done" : i === e.stageIndex ? "now" : "";
    return `<div class="cp-step ${cls}"><b>${esc(s.label)}</b><span>${i === e.stageIndex ? esc(s.short) : ""}</span></div>`;
  }).join("");
}

function renderEngagement(e) {
  $("cp-title").textContent = e.project;
  $("cp-intro").innerHTML = `<b>${esc(e.client)}</b> · ${esc(e.reference)} · ${esc(e.deliverableName)}`;
  $("cp-eng-title").textContent = e.deliverableName;
  $("cp-eng-sub").textContent = e.modelName;
  const rows = [
    ["Reference", esc(e.reference) + (e.clientRef ? " · your ref " + esc(e.clientRef) : "")],
    // The figure shown is what the invoice will total. Showing the net
    // here and totalling the gross on the invoice is a 20% surprise on
    // the day the client pays, and it is their finance team, not ours,
    // that finds it.
    ["Deposit", `<b>${money(e.deposit.gross)}</b> — ${esc(e.deposit.label)}<div style="font-size:0.82rem;color:var(--muted,#5b6470);margin-top:3px;">${esc(e.deposit.payable)}<br>${esc(e.deposit.narrative)}</div>`],
    [e.recurring ? "Thereafter" : "Balance", `<b>${money(e.balance.gross)}</b> — ${esc(e.balance.label)}<div style="font-size:0.82rem;color:var(--muted,#5b6470);margin-top:3px;">${esc(e.balance.payable)}<br>${esc(e.balance.narrative)}</div>`],
    ["Stage", `<span class="cp-pill warning">${esc(e.stageLabel)}</span>`],
  ];
  $("cp-eng-rows").innerHTML = rows.map(([k, v]) => `<tr><td style="width:150px;color:var(--muted,#5b6470);">${esc(k)}</td><td>${v}</td></tr>`).join("");
}

function renderChecklist(e, pack) {
  const chk = e.checklistState;
  $("cp-clock").textContent = pack.clockNote;
  $("cp-meter-bar").style.width = chk.percent + "%";
  $("cp-meter-text").textContent =
    `${chk.settled} of ${chk.total} answered · ${chk.mandatoryOutstanding} required item${chk.mandatoryOutstanding === 1 ? "" : "s"} outstanding`;

  const groups = [...new Set(e.checklist.map((i) => i.group))];
  $("cp-checklist").innerHTML = groups.map((g) => {
    const items = e.checklist.filter((i) => i.group === g);
    return `<div class="cp-group">${esc(g)}</div>` + items.map((i) => `
      <div class="cp-item ${i.state}" data-item="${esc(i.id)}">
        <div class="cp-item-head">
          <b>${esc(i.title)}${i.mandatory ? "" : ' <span style="font-weight:400;color:var(--muted,#5b6470);font-size:0.85rem;">(optional)</span>'}</b>
          <span class="cp-pill ${STATE_PILL[i.state]}">${esc(STATE_LABEL[i.state])}</span>
        </div>
        <div class="cp-why">${esc(i.why)}</div>
        <div class="cp-fmt"><b>Format</b>${esc(i.format)}</div>
        ${i.note ? `<div class="cp-why" style="margin-top:8px;"><b>Your answer:</b> ${esc(i.note)}</div>` : ""}
        ${(i.files || []).length ? `<div class="cp-held"><b>We hold ${i.files.length} document${i.files.length === 1 ? "" : "s"} against this line</b> — sending one with the same name again replaces it, so nothing is ever counted twice.<ul class="cp-files">${i.files.map((f) => `<li>📎 <a href="${api}/files/${encodeURIComponent(f.stored)}">${esc(f.name)}</a></li>`).join("")}</ul></div>` : ""}
        <div class="cp-choices">
          <button class="cp-mini" data-act="open" data-mode="supplied">${i.state === "supplied" ? "Add more" : ANSWER_LABEL[i.accepts] || "Supply this"}</button>
          <button class="cp-mini" data-act="open" data-mode="not_held">${NOT_HELD_LABEL[i.accepts] || "I do not hold this"}</button>
        </div>
        <div class="cp-answer">
          <textarea placeholder="${PLACEHOLDER[i.accepts] || 'A note — what you are sending, or why it does not exist.'}"></textarea>
          <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,.png,.jpg,.jpeg,.webp,.txt,.md,.json">
          <div class="cp-choices">
            <button class="cp-mini primary" data-act="save">Save this answer</button>
            <button class="cp-mini" data-act="cancel">Cancel</button>
          </div>
          <div class="cp-error"></div>
        </div>
      </div>`).join("");
  }).join("");
}

function renderStart(e) {
  const show = ["information", "ready"].includes(e.stage) && e.checklistState.canStart;
  $("cp-start-card").hidden = !show;
  if (!show) return;
  $("cp-start-lede").innerHTML =
    `Everything required is answered. Confirming below is your instruction to proceed and raises the deposit invoice — <b>${money(e.deposit.gross)}</b>, ${esc(e.deposit.label.toLowerCase())} (${esc(e.deposit.payable)}) — automatically. ` +
    `We begin when it clears. We will not start work you have not authorised and then invoice you for it.`;
  $("cp-start-name").value = e.contactName || "";
}

function renderDeliverables(e, decisions) {
  const list = e.deliverables || [];
  $("cp-deliv-card").hidden = !list.length;
  if (!list.length) return;
  $("cp-deliverables").innerHTML = [...list].reverse().map((d, ri) => {
    const open = ri === 0 && e.stage === "decision" && !d.decision;
    const dec = d.decision;
    return `<div style="border:1.5px solid var(--line);border-radius:8px;padding:17px 19px;margin-top:12px;" data-deliv="${esc(d.id)}">
      <div class="cp-item-head">
        <b>${esc(d.label)}${d.revision > 1 ? ` — revision ${d.revision}` : ""}</b>
        ${dec ? `<span class="cp-pill ${decisions.find((x) => x.id === dec.decision)?.tone || "muted"}">${esc(decisions.find((x) => x.id === dec.decision)?.label || dec.decision)}</span>`
              : `<span class="cp-pill warning">Awaiting your decision</span>`}
      </div>
      <div style="font-size:0.8rem;color:var(--muted,#5b6470);margin-top:3px;">Issued ${dt(d.issuedAt)}</div>
      ${d.summary ? `<div class="cp-why" style="margin-top:9px;">${esc(d.summary)}</div>` : ""}
      ${(d.files || []).length ? `<ul class="cp-files" style="margin-top:9px;">${d.files.map((f) => `<li>📎 <a href="${api}/files/${encodeURIComponent(f.stored)}">${esc(f.name)}</a></li>`).join("")}</ul>` : ""}
      ${d.documentId ? `<p style="margin-top:9px;font-size:0.86rem;">📄 <a href="${api}/documents/${encodeURIComponent(d.documentId)}" target="_blank" rel="noopener">Open ${esc(d.documentNumber || "the document")}</a></p>` : ""}
      ${dec ? renderDecisionRecord(dec, decisions) : ""}
      ${open ? renderDecisionForm(d, decisions) : ""}
    </div>`;
  }).join("");
}

function renderDecisionRecord(dec, decisions) {
  const spec = decisions.find((x) => x.id === dec.decision);
  return `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:0.86rem;">
    <b>${esc(spec?.label || dec.decision)}</b> by ${esc(dec.by)} on ${dt(dec.at)}.
    ${(dec.comments || []).length ? `<ul class="cp-files" style="margin-top:8px;">${dec.comments.map((c) => `<li><b>${esc(c.section || "General")}</b> — ${esc(c.comment)}</li>`).join("")}</ul>` : ""}
  </div>`;
}

function renderDecisionForm(d, decisions) {
  const sections = (d.sections || []);
  return `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line);">
    <div class="cp-decision">
      ${decisions.map((x) => `<button class="cp-dbtn" data-decision="${esc(x.id)}"><b>${esc(x.label)}</b><span>${esc(x.blurb)}</span></button>`).join("")}
    </div>
    <div id="cp-comments" hidden style="margin-top:16px;">
      <p class="cp-lede"><b>Your comments.</b> Name the section each one applies to. A comment against a section can be answered; a comment against the whole document cannot, and that is the difference between one round of review and three.</p>
      <div id="cp-comment-rows"></div>
      <button class="cp-mini" id="cp-add-comment" style="margin-top:8px;">Add another comment</button>
    </div>
    <div style="margin-top:14px;max-width:340px;">
      <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:5px;">Your name</label>
      <input id="cp-dec-name" type="text" style="width:100%;padding:11px 13px;border:1.5px solid var(--line);border-radius:7px;font-family:inherit;">
    </div>
    <button class="btn btn-primary" id="cp-dec-submit" style="margin-top:14px;padding:13px 32px;" disabled>Record my decision</button>
    <div class="cp-error" id="cp-dec-error"></div>
    <input type="hidden" id="cp-dec-sections" value="${esc(JSON.stringify(sections))}">
  </div>`;
}

function renderPayments(e) {
  const docs = e.documents || [];
  $("cp-pay-card").hidden = !docs.length;
  if (!docs.length) return;
  $("cp-pay-rows").innerHTML = docs.map((d) => `<tr>
    <td><a href="${api}/documents/${encodeURIComponent(d.id)}" target="_blank" rel="noopener"><b>${esc(d.number)}</b></a></td>
    <td>${esc(d.label)}<div style="font-size:0.8rem;color:var(--muted,#5b6470);">Issued ${dt(d.issuedAt)}</div></td>
    <td><b>${money(d.gross ?? d.amount)}</b>${d.vat ? `<div style="font-size:0.8rem;color:var(--muted,#5b6470);">${money(d.net)} + VAT ${money(d.vat)}</div>` : ""}</td>
    <td><span class="cp-pill ${d.paidAt ? "ok" : "warning"}">${d.paidAt ? "Received " + dt(d.paidAt) : "Outstanding"}</span></td>
  </tr>`).join("");
}

/* CONSTRUX and VERYX, in front of the person who could use them. */
function renderPlatforms(p) {
  const card = (name, tag, inScope, url, body, cta) => `<a class="cp-plat" href="${url}">
    <div class="nm">${name}</div><div class="tg">${tag}</div>
    ${inScope ? '<div style="margin-top:8px;"><span class="cp-pill ok">In scope on your project</span></div>' : ""}
    <p>${body}</p><span class="go">${cta} →</span></a>`;
  $("cp-platforms").innerHTML =
    card("CONSTRUX", "Project delivery operating system", p.construx.inScope, p.construx.url,
      "Programme, cost, risk, RFIs and non-conformances on one project, with earned value computed rather than typed. It is what your ETABLIX team runs your project on.",
      p.construx.inScope ? "See what your team sees" : "See what it does") +
    card("VERYX", "Quality assurance and inspection", p.veryx.inScope, p.veryx.url,
      "Inspections, evidence and sign-off, with a portfolio view across every project at once. Where an inspection record has to survive being looked at years later, this is where it lives.",
      p.veryx.inScope ? "See what your team sees" : "See what it does");
}

function renderEvents(e) {
  const rows = [...(e.events || [])].reverse().slice(0, 30);
  $("cp-events").innerHTML = rows.length ? rows.map((ev) => `<tr>
    <td style="width:120px;color:var(--muted,#5b6470);">${dt(ev.at)}</td>
    <td><b>${esc(ev.what)}</b>${ev.detail ? `<div style="font-size:0.83rem;color:var(--muted,#5b6470);">${esc(ev.detail)}</div>` : ""}</td>
    <td style="width:150px;color:var(--muted,#5b6470);text-align:right;">${esc(ev.by)}</td>
  </tr>`).join("") : '<tr><td style="color:var(--muted,#5b6470);">Nothing yet.</td></tr>';
}

function render(body) {
  STATE = body;
  const e = body.engagement;
  renderRail(e, body.stages);
  $("cp-next").innerHTML = `<b>What happens next.</b> ${esc(e.next.client)}`;
  renderEngagement(e);
  renderChecklist(e, body.pack);
  renderStart(e);
  renderDeliverables(e, body.decisions);
  renderPayments(e);
  renderPlatforms(body.platforms);
  renderEvents(e);
  $("cp-checklist-card").hidden = !["information", "ready"].includes(e.stage) && e.checklistState.outstanding === 0 && e.stage !== "deposit";
  $("cp-body").hidden = false;
}

/* --------------------------------------------------------------- actions */

document.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;

  // checklist
  const item = btn.closest(".cp-item");
  if (item) {
    const answer = item.querySelector(".cp-answer");
    if (btn.dataset.act === "open") { answer.classList.add("open"); answer.dataset.mode = btn.dataset.mode; clearError(answer.querySelector(".cp-error")); return; }
    if (btn.dataset.act === "cancel") { answer.classList.remove("open"); return; }
    if (btn.dataset.act === "save") {
      const err = answer.querySelector(".cp-error");
      clearError(err);
      const fd = new FormData();
      fd.append("state", answer.dataset.mode || "supplied");
      fd.append("note", answer.querySelector("textarea").value.trim());
      for (const f of answer.querySelector("input[type=file]").files) fd.append("documents", f);
      btn.disabled = true; btn.textContent = "Saving…";
      // A request that never comes back used to leave this button saying
      // "Saving…" for ever, and the client would refresh and assume the
      // upload had been lost. It says so instead, and tells them what is
      // actually true: refresh, because it may well have saved.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 120000);
      let res, out;
      try {
        res = await fetch(`${api}/checklist/${encodeURIComponent(item.dataset.item)}`, { method: "POST", body: fd, signal: ctrl.signal });
        out = await res.json().catch(() => ({}));
      } catch (e) {
        clearTimeout(timer);
        btn.disabled = false; btn.textContent = "Save this answer";
        return showError(err, "That did not get through — the connection dropped or timed out. Refresh this page before sending it again: it may already have saved, and this page will show you exactly what we hold.");
      }
      clearTimeout(timer);
      btn.disabled = false; btn.textContent = "Save this answer";
      if (!res.ok) return showError(err, out.error || "Could not save that.");
      STATE.engagement = out.engagement; render(STATE);
      return;
    }
  }

  // start
  if (btn.id === "cp-start-btn") {
    const err = $("cp-start-error"); clearError(err);
    if (!$("cp-start-auth").checked) return showError(err, "Tick the authorisation box — this is an instruction to start work.");
    const name = $("cp-start-name").value.trim();
    if (name.length < 2) return showError(err, "Give your name; it goes on the record and on the invoice.");
    btn.disabled = true; btn.textContent = "Confirming…";
    const res = await fetch(`${api}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authorised: true, name }) });
    const out = await res.json().catch(() => ({}));
    btn.disabled = false; btn.textContent = "Confirm the start";
    if (!res.ok) return showError(err, out.error || "Could not confirm the start.");
    STATE.engagement = out.engagement; render(STATE);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  // decision choice
  if (btn.dataset.decision) {
    document.querySelectorAll(".cp-dbtn").forEach((b) => (b.className = "cp-dbtn"));
    btn.className = "cp-dbtn sel-" + btn.dataset.decision;
    const spec = STATE.decisions.find((d) => d.id === btn.dataset.decision);
    const box = $("cp-comments");
    box.hidden = !spec.requiresComment;
    if (spec.requiresComment && !$("cp-comment-rows").children.length) addCommentRow();
    $("cp-dec-submit").disabled = false;
    $("cp-dec-submit").dataset.decision = btn.dataset.decision;
    return;
  }
  if (btn.id === "cp-add-comment") { addCommentRow(); return; }
  if (btn.dataset.act === "drop-comment") { btn.closest(".cp-comment-row").remove(); return; }

  if (btn.id === "cp-dec-submit") {
    const err = $("cp-dec-error"); clearError(err);
    const decision = btn.dataset.decision;
    const name = $("cp-dec-name").value.trim();
    if (name.length < 2) return showError(err, "Give your name — a decision has to be attributable.");
    const comments = [...document.querySelectorAll(".cp-comment-row")].map((r) => ({
      section: r.querySelector("[data-c=section]").value.trim(),
      comment: r.querySelector("[data-c=comment]").value.trim(),
    })).filter((c) => c.comment);
    btn.disabled = true; btn.textContent = "Recording…";
    const res = await fetch(`${api}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, name, comments }) });
    const out = await res.json().catch(() => ({}));
    btn.disabled = false; btn.textContent = "Record my decision";
    if (!res.ok) return showError(err, out.error || "Could not record that decision.");
    STATE.engagement = out.engagement; render(STATE);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (out.invoice) alert(`Thank you. Invoice ${out.invoice.number} for ${money(out.invoice.amount)} was raised automatically and is in your portal.`);
  }
});

function addCommentRow() {
  const sections = JSON.parse($("cp-dec-sections")?.value || "[]");
  const row = document.createElement("div");
  row.className = "cp-comment-row";
  row.innerHTML = sections.length
    ? `<select data-c="section"><option value="">Which section…</option>${sections.map((s) => `<option>${esc(s)}</option>`).join("")}<option>General</option></select>
       <textarea data-c="comment" placeholder="What needs to change, and why."></textarea>
       <button class="cp-mini" data-act="drop-comment">Remove</button>`
    : `<input data-c="section" placeholder="Section or page">
       <textarea data-c="comment" placeholder="What needs to change, and why."></textarea>
       <button class="cp-mini" data-act="drop-comment">Remove</button>`;
  $("cp-comment-rows").appendChild(row);
}

/* ------------------------------------------------------------------ boot */

(async function boot() {
  if (!token) {
    $("cp-intro").textContent = "This portal opens from the personal link in your engagement email. Contact contact@etablix.com and quote your project name if you need it re-sent.";
    return;
  }
  const res = await fetch(api);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { $("cp-intro").textContent = body.error || "This portal link is not valid."; return; }
  render(body);
})();
