/* ETABLIX Control Desk — Client engagements.
   The customer half of the lifecycle: open an engagement, issue the
   portal with its requirement checklist, watch the client answer it,
   see the start confirmed and the deposit invoice raise itself, publish
   the deliverable, and read the decision that comes back.

   Nothing on this panel sets a stage by hand. Every stage here is the
   consequence of an act, so the record of what happened and the record
   of where we are cannot disagree. */

const token = sessionStorage.getItem("etablix.token");

async function api(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) { sessionStorage.clear(); location.replace("/internal/login.html"); throw new Error("Session expired"); }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (ms) => (ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const pill = (v, cls = "") => `<span class="pill ${cls}">${esc(v)}</span>`;
const block = (title, inner) => `<div class="section-block"><h3>${title}</h3>${inner}</div>`;
const wrapT = (t) => `<div class="table-wrap">${t}</div>`;

let CAT = null;
let ROWS = [];
let openId = null;

/** The button appears wherever the endpoint would accept it, and nowhere
    else. It used to disappear the moment a run existed, which meant a run
    that failed, hung, or was started against the wrong pack ended the
    engagement's use of the agent — the endpoint would have taken a second
    one all along, and there was no way to ask for it. */
const PRODUCED_BY_AGENT = ["feasibility", "site-requirements"];
function canRunDiagnostic(e) {
  // Two of the five Model A deliverables have a production agent. The others
  // are an intake and a price, and offering a button that the endpoint will
  // refuse is worse than not offering one.
  return PRODUCED_BY_AGENT.includes(e.deliverable)
    && e.checklistState.canStart
    && ["deposit", "in_progress"].includes(e.stage);
}

/** What the button says, and what it warns before it spends anything. */
function diagnosticButton(e) {
  if (!canRunDiagnostic(e)) return "";
  const again = Boolean(e.diagnosticRunId);
  const label = !again ? "Run the diagnostic on their pack"
    : e.diagnosticRunMissing ? "Run the diagnostic again — the earlier run has gone"
    : e.diagnosticRunning ? "Start another run — the current one has hung"
    : "Run the diagnostic again on their pack";
  return `<button class="btn ${again ? "" : "btn-primary"}" data-act="diagnostic"
    data-again="${again ? "1" : ""}" data-running="${e.diagnosticRunning ? "1" : ""}">${label}</button>`;
}

const TONE = { enquiry: "warning", agreed: "", information: "warning", ready: "warning", deposit: "warning", in_progress: "ok", decision: "warning", balance: "warning", closed: "approved" };
const DEC_TONE = { approved: "approved", review: "warning", rejected: "declined" };

export async function loadClients() {
  const body = document.getElementById("clients-body");
  const [cat, list] = await Promise.all([api("/api/clients/catalogue"), api("/api/clients")]);
  CAT = cat; ROWS = list.engagements;
  render(body);
}

function render(body) {
  body.innerHTML = openForm() + list() + (openId ? detail() : "");
  wire(body);
}

/* ------------------------------------------------------------ open one */

function openForm() {
  const opts = CAT.deliverables.map((d) => `<option value="${esc(d.id)}" data-model="${esc(d.model)}">${esc(d.name)}${d.low ? ` (£${d.low.toLocaleString()}–£${d.high.toLocaleString()})` : ""}</option>`).join("");
  return block("Open an engagement", `
    <p class="panel-sub" style="margin:0 0 12px;">Opening it builds the client's requirement checklist from the deliverable — every item, its reason and its format, in one list they answer once. Issue the portal when they accept the invoice; everything after that runs itself.</p>
    <form id="cl-new" class="team-form" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));">
      <input required name="client" placeholder="Client / company">
      <input required name="project" placeholder="Project / site">
      <input name="contactName" placeholder="Their contact — name">
      <input type="email" name="contactEmail" placeholder="Their contact — email">
      <select name="deliverable" id="cl-deliv">${opts}</select>
      <select name="model" id="cl-model">${CAT.models.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select>
      <input type="number" step="0.01" min="0" name="fee" id="cl-fee" placeholder="Fixed fee (Model A) £">
      <input type="number" step="0.01" min="0" name="monthlyFee" id="cl-monthly" placeholder="Monthly fee (B/C) £">
      <input type="number" step="0.01" min="0" name="mobilisationFee" placeholder="Mobilisation fee £">
      <input type="number" step="0.01" min="0" name="platformFee" placeholder="Platform fee / month £">
      <input type="number" step="0.01" min="0" name="advance" placeholder="Advance — month-1 supplier spend £">
      <input name="clientRef" placeholder="Their PO / reference">
      <select name="vatMode"><option value="standard">Standard VAT 20%</option><option value="reverse">Domestic reverse charge</option><option value="none">No VAT / outside scope</option></select>
      <label class="dec"><input type="checkbox" name="construx"> CONSTRUX in scope</label>
      <label class="dec"><input type="checkbox" name="veryx"> VERYX in scope</label>
      <button class="btn btn-primary" type="submit">Open engagement</button>
    </form>
    <p class="error-note" id="cl-new-error" hidden></p>`);
}

/* --------------------------------------------------------------- list */

function list() {
  if (!ROWS.length) return block("Engagements", '<p class="empty-note">No client engagements yet.</p>');
  const rows = ROWS.map((e) => {
    const chk = e.checklistState;
    const waiting = e.next.actor === "client" ? pill("Client", "warning") : e.next.actor === "etablix" ? pill("Us", "") : pill("—", "");
    return `<tr data-open="${esc(e.id)}" style="cursor:pointer;${openId === e.id ? "background:rgba(156,122,60,0.07);" : ""}">
      <td><b>${esc(e.reference)}</b><div class="muted" style="font-size:0.78rem;">${dt(e.createdAt)}</div></td>
      <td>${esc(e.client)}<div class="muted" style="font-size:0.78rem;">${esc(e.project)}</div></td>
      <td>${esc(e.deliverableName)}<div class="muted" style="font-size:0.78rem;">${esc(e.modelName)}</div></td>
      <td>${pill(e.stageLabel, TONE[e.stage] || "")}</td>
      <td>${chk.settled}/${chk.total}${chk.mandatoryOutstanding ? `<div class="muted" style="font-size:0.78rem;">${chk.mandatoryOutstanding} required outstanding</div>` : ""}</td>
      <td>${waiting}</td>
      <td style="max-width:280px;font-size:0.82rem;">${esc(e.next.internal)}</td>
    </tr>`;
  }).join("");
  return block("Engagements", wrapT(`<table class="data-table"><thead><tr>
    <th>Reference</th><th>Client</th><th>Engagement</th><th>Stage</th><th>Checklist</th><th>Waiting on</th><th>Next</th>
  </tr></thead><tbody>${rows}</tbody></table>`));
}

/* ------------------------------------------------------------- detail */

function detail() {
  const e = ROWS.find((x) => x.id === openId);
  if (!e) return "";
  const chk = e.checklistState;
  const dep = (e.documents || []).find((d) => d.kind === "deposit" && !d.paidAt);
  const bal = (e.documents || []).find((d) => d.kind === "balance" && !d.paidAt);

  const actions = [
    !e.portalToken && e.stage !== "enquiry" ? `<button class="btn btn-primary" data-act="issue">Issue the portal &amp; send the checklist</button>` : "",
    e.portalToken && chk.mandatoryOutstanding ? `<button class="btn" data-act="remind">Chase the ${chk.mandatoryOutstanding} outstanding</button>` : "",
    dep ? `<button class="btn" data-act="paid" data-kind="deposit">Deposit ${esc(dep.number)} received</button>` : "",
    bal ? `<button class="btn" data-act="paid" data-kind="balance">Balance ${esc(bal.number)} received</button>` : "",
    e.portalToken ? `<button class="btn" data-act="copy">Copy the client's portal link</button>` : "",
    diagnosticButton(e),
  ].filter(Boolean).join(" ");

  const checklist = (e.checklist || []).map((i) => `<tr>
    <td>${esc(i.title)}${i.mandatory ? "" : ' <span class="muted">(optional)</span>'}<div class="muted" style="font-size:0.78rem;">${esc(i.group)}</div></td>
    <td>${pill(i.state === "supplied" ? "Supplied" : i.state === "not_held" ? "Not held" : "Outstanding", i.state === "supplied" ? "approved" : i.state === "not_held" ? "" : "warning")}</td>
    <td style="font-size:0.83rem;">${esc(i.note) || "—"}</td>
    <td style="font-size:0.83rem;">${(i.files || []).map((f) => `<a href="/api/files/${encodeURIComponent(f.stored)}?token=${encodeURIComponent(token)}">${esc(f.name)}</a>`).join("<br>") || "—"}</td>
  </tr>`).join("");

  const delivs = (e.deliverables || []).map((d) => `<tr>
    <td><b>${esc(d.label)}</b>${d.revision > 1 ? ` rev ${d.revision}` : ""}<div class="muted" style="font-size:0.78rem;">${dt(d.issuedAt)} · ${esc(d.issuedBy)}</div></td>
    <td>${d.decision ? pill(CAT.decisions.find((x) => x.id === d.decision.decision)?.label || d.decision.decision, DEC_TONE[d.decision.decision] || "") : pill("Awaiting decision", "warning")}</td>
    <td style="font-size:0.83rem;">${d.decision ? `${esc(d.decision.by)}, ${dt(d.decision.at)}${(d.decision.comments || []).length ? "<ul style='margin:6px 0 0 16px;'>" + d.decision.comments.map((c) => `<li><b>${esc(c.section || "General")}</b> — ${esc(c.comment)}</li>`).join("") + "</ul>" : ""}` : "—"}</td>
  </tr>`).join("");

  const docs = (e.documents || []).map((d) => `<tr>
    <td><a href="/api/docs/${encodeURIComponent(d.id)}/render?token=${encodeURIComponent(token)}" target="_blank" rel="noopener"><b>${esc(d.number)}</b></a></td>
    <td>${esc(d.label)}</td><td>${money(d.gross ?? d.amount)}${d.vat ? ` <span class="muted">(${money(d.net)} + VAT)</span>` : ""}</td>
    <td>${d.paidAt ? pill("Received " + dt(d.paidAt), "approved") : pill("Outstanding", "warning")}</td>
  </tr>`).join("");

  const events = [...(e.events || [])].reverse().map((v) => `<tr>
    <td style="white-space:nowrap;">${dt(v.at)}</td><td><b>${esc(v.what)}</b>${v.detail ? `<div class="muted" style="font-size:0.8rem;">${esc(v.detail)}</div>` : ""}</td><td class="muted">${esc(v.by)}</td>
  </tr>`).join("");

  const canIssue = ["in_progress", "decision", "deposit"].includes(e.stage);
  const run = e.diagnosticRunId ? { id: e.diagnosticRunId } : null;

  return `<div class="section-block" id="cl-detail" data-id="${esc(e.id)}">
    <h3>${esc(e.reference)} — ${esc(e.client)}</h3>
    <p class="panel-sub" style="margin:0 0 10px;"><b>${esc(e.project)}</b> · ${esc(e.deliverableName)} · ${esc(e.modelName)}</p>
    <p class="panel-sub" style="margin:0 0 12px;">${esc(e.next.internal)}</p>
    <p style="margin:0 0 14px;font-size:0.88rem;">
      Deposit <b>${money(e.deposit.gross)}</b> (${esc(e.deposit.label)} · ${esc(e.deposit.payable)}) ·
      ${e.recurring ? "Thereafter" : "Balance"} <b>${money(e.balance.gross)}</b> (${esc(e.balance.label)})
    </p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">${actions}</div>
    <p class="error-note" id="cl-act-error" hidden></p>
    <p class="empty-note" id="cl-act-ok" hidden></p>

    ${e.stage === "enquiry" ? `<div style="border:1.5px solid var(--orange,#9c7a3c);border-left:4px solid var(--orange,#9c7a3c);border-radius:8px;padding:14px 16px;margin:14px 0;">
      <b style="font-size:0.92rem;">This came in from the website. Agree the terms before anything goes back.</b>
      <p class="panel-sub" style="margin:4px 0 10px;">It was opened automatically from their enquiry, so nothing had to be retyped — and it carries no price, because the platform does not price your work. Set the deliverable, the model and the fee, and it becomes an ordinary engagement. Until then no portal and no invoice can be issued from it.</p>
      ${e.internalNotes ? `<pre style="white-space:pre-wrap;font-size:0.83rem;background:var(--paper,#f6f4ef);border-radius:6px;padding:10px 12px;margin:0 0 10px;">${esc(e.internalNotes)}</pre>` : ""}
      <form id="cl-terms" class="team-form">
        <label>Deliverable<select name="deliverable" required>${CAT.deliverables.map((d) => `<option value="${esc(d.id)}"${d.id === e.deliverable ? " selected" : ""}>${esc(d.name)}</option>`).join("")}</select></label>
        <div id="cl-bands" style="grid-column:1/-1;"></div>
        <label>Model<select name="model">${CAT.models.map((m) => `<option value="${esc(m.id)}"${m.id === e.model ? " selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>
        <label>Fixed fee (Model A)<input name="fee" type="number" min="0" step="50" placeholder="Pick a band above, or type the fee you agreed"></label>
        <label>Monthly fee (Models B and C)<input name="monthlyFee" type="number" min="0" step="50"></label>
        <label>Mobilisation fee (B and C)<input name="mobilisationFee" type="number" min="0" step="50"></label>
        <label>Platform fee / month (B)<input name="platformFee" type="number" min="0" step="50"></label>
        <label>Advance (C)<input name="advance" type="number" min="0" step="50"></label>
        <label>Project<input name="project" value="${esc(e.project)}"></label>
        <label>VAT<select name="vatMode"><option value="standard">Standard</option><option value="reverse">CIS domestic reverse charge</option><option value="none">Outside scope</option></select></label>
        <button class="btn btn-primary" type="submit">Agree the terms</button>
      </form>
      <p class="muted" style="font-size:0.78rem;margin:8px 0 0;">A band is the catalogue price for a defined scope, not a quotation — and nothing on the website publishes a price. Quote the band, not a range: a range printed anywhere a client can see it means the bottom of the range.</p>
    </div>` : ""}

    ${canIssue ? `<div style="border:1.5px solid var(--line,#dcd7cc);border-radius:8px;padding:14px 16px;margin:14px 0;">
      <b style="font-size:0.92rem;">Publish a deliverable for the client's decision</b>
      <p class="panel-sub" style="margin:4px 0 10px;">Listing the sections is what makes a review round answerable — the client's portal makes them pick one per comment, so "make it better" is not an option available to them.</p>
      <form id="cl-deliverable" class="team-form" style="grid-template-columns:1fr;">
        ${run ? `<label class="dec"><input type="checkbox" name="useRun" checked> Issue the completed diagnostic run as the report — the document is minted from the run, with its handover and due dates</label><input type="hidden" name="runId" value="${esc(run.id)}">` : ""}
        <input name="label" placeholder="${e.recurring ? "Period label (blank = next month)" : "Deliverable name (blank = the engagement's)"}">
        <textarea name="summary" rows="2" placeholder="One or two lines the client reads first."></textarea>
        <textarea name="sections" rows="3" placeholder="Sections they can comment against — one per line, e.g.&#10;1 Findings&#10;3 Supplier-interface matrix"></textarea>
        <input type="file" name="documents" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,.png,.jpg,.jpeg,.webp,.txt,.md,.json">
        <button class="btn btn-primary" type="submit">Publish to the portal</button>
      </form>
    </div>` : ""}

    ${e.diagnosticRunId ? `<div style="border:1.5px solid var(--line,#dcd7cc);border-left:4px solid ${e.diagnosticRunMissing ? "var(--red,#c0392b)" : "var(--orange,#9c7a3c)"};border-radius:8px;padding:14px 16px;margin:14px 0;">
      <b style="font-size:0.92rem;">Diagnostic run</b>
      <p class="panel-sub" style="margin:4px 0 0;">Handover ${esc(e.handoverDate || "—")} · report due ${esc(e.reportDueDate || "—")} · run <code>${esc(e.diagnosticRunId)}</code>${e.diagnosticRunStatus ? ` · ${esc(e.diagnosticRunStatus)}` : ""}.
      ${e.diagnosticRunMissing
        ? `<b>This run is no longer in the run log.</b> It was started, and the record of it has gone — a capped log, or a store restored from before it finished. There is nothing to resume or publish, and the dates above still stand. Run it again on the client's pack; the button is above.`
        : e.diagnosticRunning
          ? `It is working now — six passes over the client's pack, several minutes. Watch it under <b>Organisation → AI agents</b>. Do not start another unless it has genuinely stopped moving.`
          : `Watch it finish under <b>Organisation → AI agents</b>, then publish it from the box above.`}</p>
      <p class="panel-sub" style="margin:8px 0 0;font-size:0.8rem;">You can run it again at any time — on the same pack, as many times as you need. A new run replaces this one as the engagement's current run; the earlier ones stay in the run log and are listed below. <b>Neither date moves</b>: the handover and the report due date are read from the client's checklist, not from when you pressed the button.</p>
      ${(e.diagnosticRuns || []).length ? `<p class="panel-sub" style="margin:8px 0 0;font-size:0.8rem;">Superseded: ${e.diagnosticRuns.map((h) => `<code>${esc(h.id)}</code> (${esc(h.status)})`).join(" · ")}</p>` : ""}
    </div>` : ""}

    ${block("The client's checklist", wrapT(`<table class="data-table"><thead><tr><th>Item</th><th>State</th><th>Their answer</th><th>Files</th></tr></thead><tbody>${checklist}</tbody></table>`))}
    ${delivs ? block("Issued deliverables and decisions", wrapT(`<table class="data-table"><thead><tr><th>Deliverable</th><th>Decision</th><th>Detail</th></tr></thead><tbody>${delivs}</tbody></table>`)) : ""}
    ${docs ? block("Invoices raised", wrapT(`<table class="data-table"><thead><tr><th>Number</th><th>What for</th><th>Amount</th><th>Status</th></tr></thead><tbody>${docs}</tbody></table>`)) : ""}
    ${block("Audit trail", wrapT(`<table class="data-table"><tbody>${events}</tbody></table>`))}
  </div>`;
}

/* -------------------------------------------------------------- wiring */

/**
 * The bands for whichever deliverable is selected, as things to click.
 *
 * The catalogue used to be shown as "(guide £2,500–£7,500)" against the
 * deliverable name, and a range is a negotiation already lost — nobody reads
 * one and picks the top. Each band states the scope that makes its fee fixed,
 * so the desk is choosing which band the project is rather than what the
 * number should be.
 */
function renderBands(form) {
  const holder = form.querySelector("#cl-bands");
  if (!holder) return;
  const d = CAT.deliverables.find((x) => x.id === form.querySelector('[name="deliverable"]').value);
  const m = CAT.models.find((x) => x.id === form.querySelector('[name="model"]').value);

  if (d?.bands?.length) {
    holder.innerHTML = `<p class="panel-sub" style="margin:2px 0 6px;">Catalogue bands — click one to set the fee. Quote the band and its scope, never a range. The margin shown is after people, expenses, unbilled time and central overhead.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${d.bands.map((b) => `
        <button type="button" class="btn" data-band="${esc(String(b.fee))}" style="text-align:left;padding:8px 12px;max-width:260px;">
          <b>${esc(b.label)} — £${b.fee.toLocaleString()}</b>
          <div class="muted" style="font-size:0.75rem;font-weight:400;white-space:normal;margin-top:3px;">${esc(b.scope)}</div>
          ${b.margin ? `<div style="font-size:0.72rem;font-weight:600;margin-top:4px;color:${b.margin.meetsTarget ? "var(--amber,#9c7a3c)" : "var(--danger,#c0392b)"};">${b.margin.netMarginPct}% net · assumes ${Object.entries(b.effort).map(([r, n]) => `${n} ${r.replace(/([A-Z])/g, " $1").toLowerCase()} day${n === 1 ? "" : "s"}`).join(", ")}</div>` : ""}
        </button>`).join("")}</div>`;
    holder.querySelectorAll("button[data-band]").forEach((btn) => btn.addEventListener("click", () => {
      form.querySelector('[name="fee"]').value = btn.dataset.band;
    }));
    return;
  }

  // Models B and C are priced from the client's own spend, so there is
  // nothing to click — there is a calculation to run. Guidance in a
  // paragraph and an empty field is how the first appointment gets priced
  // by mental arithmetic in a meeting.
  const isC = m?.id === "C";
  if (!m?.feeGuide) { holder.innerHTML = ""; return; }
  holder.innerHTML = `
    <p class="panel-sub" style="margin:2px 0 6px;"><b>${esc(m.name)}</b> is priced from the spend it manages. Put the numbers in and the fee, the mobilisation and ${isC ? "the advance" : "the platform fee"} are worked out with the reasoning shown.</p>
    <div class="team-form" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:8px;">
      ${isC
        ? `<label style="font-size:0.78rem;">Total supplier spend, whole term<input id="pr-spend" type="number" min="0" step="50000" placeholder="e.g. 18000000"></label>
           <label style="font-size:0.78rem;">Month one supplier spend<input id="pr-m1" type="number" min="0" step="10000" placeholder="blank = even share"></label>
           <label style="font-size:0.78rem;">Early procurement commitments<input id="pr-commit" type="number" min="0" step="10000" value="0"></label>`
        : `<label style="font-size:0.78rem;">Annualised managed spend<input id="pr-spend" type="number" min="0" step="50000" placeholder="12 months, not whole life"></label>`}
      <label style="font-size:0.78rem;">Compounds / sites<input id="pr-compounds" type="number" min="1" step="1" value="1"></label>
      <label style="font-size:0.78rem;">Term, months<input id="pr-term" type="number" min="1" step="1" value="${isC ? 24 : 12}"></label>
      ${isC
        ? `<label class="dec" style="font-size:0.78rem;"><input id="pr-first" type="checkbox" checked> First two engagements</label>`
        : `<label class="dec" style="font-size:0.78rem;"><input id="pr-construx" type="checkbox"> CONSTRUX in scope</label>
           <label style="font-size:0.78rem;">Platform users<input id="pr-users" type="number" min="1" step="1" value="25"></label>`}
    </div>
    <button type="button" class="btn" id="pr-go">Work out the fee</button>
    <div id="pr-out" style="margin-top:10px;"></div>`;

  holder.querySelector("#pr-go").addEventListener("click", async () => {
    const v = (id) => Number(holder.querySelector(id)?.value || 0);
    const raw = holder.querySelector("#pr-m1")?.value;
    const body = isC
      ? { model: "C", supplierSpend: v("#pr-spend"), monthOneSupplierSpend: raw === "" ? null : Number(raw),
          earlyProcurementCommitments: v("#pr-commit"), compounds: v("#pr-compounds"), termMonths: v("#pr-term"),
          firstEngagement: holder.querySelector("#pr-first").checked }
      : { model: "B", annualisedSpend: v("#pr-spend"), compounds: v("#pr-compounds"), termMonths: v("#pr-term"),
          construx: holder.querySelector("#pr-construx").checked, users: v("#pr-users") };
    try {
      const { pricing: p } = await api("/api/clients/price", { method: "POST", body: JSON.stringify(body) });
      // The fee fields are filled, so the number that was worked out is the
      // number that gets agreed. Retyping it is where a digit goes missing.
      form.querySelector('[name="monthlyFee"]').value = isC ? p.monthlyFee : p.monthly;
      const set = (name, val) => { const el = form.querySelector(`[name="${name}"]`); if (el) el.value = val; };
      set("mobilisationFee", p.mobilisation);
      if (!isC) set("platformFee", p.platform);
      if (isC) set("advance", p.advance);
      holder.querySelector("#pr-out").innerHTML = renderPricing(p, isC);
    } catch (e2) {
      holder.querySelector("#pr-out").innerHTML = `<p class="error-note">${esc(e2.message)}</p>`;
    }
  });
}

/** The answer, and the working — because the next question is always how. */
function renderPricing(p, isC) {
  const row = (k, v) => `<tr><td style="padding:3px 14px 3px 0;">${k}</td><td style="text-align:right;"><b>${v}</b></td></tr>`;
  const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");
  const w = p.working;
  const numbers = isC
    ? row("Management fee, whole term", gbp(p.managementFee))
      + row("Monthly", gbp(p.monthlyFee))
      + row("Mobilisation", gbp(p.mobilisation))
      + row("<b>Advance, before any supplier order</b>", gbp(p.advance))
      + row("If the client runs one cycle late", gbp(p.workingCapital.exposureIfClientRunsOneCycleLate))
    : row("Mobilisation", gbp(p.mobilisation))
      + row("Monthly management fee", gbp(p.monthly))
      + (p.platform ? row("Platform, monthly", gbp(p.platform)) : "")
      + row("First invoice", gbp(p.firstInvoice))
      + row(`Value over ${p.termMonths} months`, gbp(p.termValue));

  const mg = p.margin;
  const c = w.cost;
  return `<table style="font-size:0.85rem;">${numbers}</table>
    <p class="panel-sub" style="margin:8px 0 0;font-size:0.78rem;">
      Set by <b>${esc(w.driver)}</b>. ${esc(w.percentBand)} gives ${gbp(isC ? w.byPercentMonthly : w.byPercent)} a month;
      the ${esc(p.scale.label.toLowerCase())} team — ${Object.entries(w.teamComposition).map(([r, n]) => `${n} ${r.replace(/([A-Z])/g, " $1").toLowerCase()}`).join(", ")} — costs ${gbp(isC ? w.byTeamMonthly : w.byTeam)} a month to sell.
      Effective rate <b>${w.effectivePct}%</b> of spend.
    </p>
    <p class="panel-sub" style="margin:6px 0 0;font-size:0.78rem;">
      <b>After everything:</b> people ${gbp(c.direct)} · expenses ${gbp(c.expenses)} · unbilled ${gbp(c.contingency)} · overhead ${gbp(c.overhead)}
      = ${gbp(c.total)} a month. Fee ${gbp(mg.fee)}. <b style="color:${mg.meetsTarget ? "inherit" : "var(--danger,#c0392b)"};">Net margin ${mg.netMarginPct}%.</b>
      ${esc(mg.verdict)}
    </p>
    ${(p.warnings || []).map((x) => `<p class="panel-sub" style="margin:6px 0 0;font-size:0.78rem;color:var(--danger,#c0392b);">${esc(x)}</p>`).join("")}
    ${isC ? `<p class="panel-sub" style="margin:6px 0 0;font-size:0.78rem;">${esc(p.workingCapital.note)}</p>
      ${p.nonNegotiable.map((n) => `<p class="panel-sub" style="margin:3px 0 0;font-size:0.76rem;color:var(--danger,#c0392b);">${esc(n)}</p>`).join("")}` : ""}`;
}

function wire(body) {
  const termsForm = document.getElementById("cl-terms");
  if (termsForm) {
    renderBands(termsForm);
    termsForm.querySelector('[name="deliverable"]').addEventListener("change", () => renderBands(termsForm));
    termsForm.querySelector('[name="model"]').addEventListener("change", () => renderBands(termsForm));
  }
  if (termsForm) termsForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const id = document.getElementById("cl-detail")?.dataset.id;
    const f = Object.fromEntries(new FormData(termsForm).entries());
    try {
      await api(`/api/clients/${id}/terms`, { method: "POST", json: {
        ...f, fee: Number(f.fee || 0), monthlyFee: Number(f.monthlyFee || 0),
        mobilisationFee: Number(f.mobilisationFee || 0),
        platformFee: Number(f.platformFee || 0),
        advance: Number(f.advance || 0) } });
      await loadClients();
    } catch (e) { const el = document.getElementById("cl-act-error"); if (el) { el.textContent = e.message; el.hidden = false; } }
  });
  const err = (msg) => { const el = document.getElementById("cl-act-error") || document.getElementById("cl-new-error"); if (el) { el.textContent = msg; el.hidden = false; } };
  const note = (msg) => { const el = document.getElementById("cl-act-ok"); if (el) { el.textContent = msg; el.hidden = false; } };

  // The deliverable list carries the model; picking one should not leave
  // the wrong fee box showing.
  const dsel = document.getElementById("cl-deliv");
  const msel = document.getElementById("cl-model");
  const syncModel = () => {
    const m = dsel.selectedOptions[0]?.dataset.model;
    if (m) msel.value = m;
    const fixed = msel.value === "A";
    document.getElementById("cl-fee").style.opacity = fixed ? "1" : "0.45";
    document.getElementById("cl-monthly").style.opacity = fixed ? "0.45" : "1";
  };
  dsel?.addEventListener("change", syncModel);
  msel?.addEventListener("change", syncModel);
  syncModel();

  document.getElementById("cl-new")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const payload = Object.fromEntries(fd.entries());
    payload.construx = fd.has("construx"); payload.veryx = fd.has("veryx");
    try {
      const out = await api("/api/clients", { method: "POST", body: JSON.stringify(payload) });
      openId = out.engagement.id;
      await loadClients();
    } catch (e2) { err(e2.message); }
  });

  body.querySelectorAll("tr[data-open]").forEach((tr) => tr.addEventListener("click", () => {
    openId = openId === tr.dataset.open ? null : tr.dataset.open;
    render(body);
    document.getElementById("cl-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  document.getElementById("cl-detail")?.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button[data-act]");
    if (!btn) return;
    const id = document.getElementById("cl-detail").dataset.id;
    const e = ROWS.find((x) => x.id === id);
    btn.disabled = true;
    try {
      if (btn.dataset.act === "issue") { const out = await api(`/api/clients/${id}/issue-portal`, { method: "POST" }); await loadClients(); note(`Portal issued. Link: ${out.link}`); return; }
      if (btn.dataset.act === "remind") { const out = await api(`/api/clients/${id}/remind`, { method: "POST" }); note(`Chased ${out.sent} outstanding item(s).`); return; }
      if (btn.dataset.act === "paid") { await api(`/api/clients/${id}/payment-received`, { method: "POST", body: JSON.stringify({ kind: btn.dataset.kind }) }); await loadClients(); return; }
      if (btn.dataset.act === "diagnostic") {
        // A run is six passes over the whole pack. Cheap in money and slow
        // in time, but not free of either — so a repeat is confirmed, and
        // the confirmation says what is actually about to happen.
        if (btn.dataset.again && !confirm(btn.dataset.running
          ? "A run on this engagement is still working. Starting another spends a second set of six passes and replaces it as the engagement's current run. Only do this if it has hung.\n\nStart another run?"
          : "This starts a fresh run over the client's pack — six passes, several minutes. It becomes the engagement's current run; the existing one stays in the run log. The handover and report dates do not move.\n\nRun it again?")) {
          btn.disabled = false; return;
        }
        const out = await api(`/api/clients/${id}/run-diagnostic`, {
          method: "POST", body: JSON.stringify({ force: Boolean(btn.dataset.running) }),
        });
        await loadClients();
        note(`${out.replaced ? "New run started" : "Diagnostic started"} on ${out.files} client document(s). Handover ${out.handover}, report due ${out.due}. It runs six passes and takes several minutes — watch it under Organisation → AI agents.`);
        return;
      }
      if (btn.dataset.act === "copy") {
        const link = `${location.origin}/client-portal?t=${e.portalToken}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        note(`Copied: ${link}`);
      }
    } catch (e2) { err(e2.message); } finally { btn.disabled = false; }
  });

  document.getElementById("cl-deliverable")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const id = document.getElementById("cl-detail").dataset.id;
    const fd = new FormData(ev.target);
    // The hidden runId always travels; the tick decides whether it is used.
    if (!fd.get("useRun")) fd.delete("runId");
    fd.delete("useRun");
    const send = async () => {
      const res = await fetch(`/api/clients/${id}/deliverable`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(body.error || `Request failed (${res.status})`), body);
      return body;
    };
    try {
      await send();
      await loadClients();
    } catch (e2) {
      // A report held to its promised date is not an error to report and
      // walk away from — it is a decision. The desk is told what the client
      // would see, and can go early on the record if there is a reason.
      if (!e2.held) { err(e2.message); return; }
      const reason = prompt(
        `${e2.error || e2.message}\n\n`
        + "If you have a reason to issue before the promised date, type it here. "
        + "It is recorded on the document, in this engagement's audit trail and in the append-only ledger. "
        + "The promised date does not change.\n\nLeave blank to cancel and publish on the date instead."
      );
      if (!reason || reason.trim().length < 15) {
        err(reason === null || !reason.trim()
          ? "Not published. It will publish without this step once the promised date arrives."
          : "Not published — the reason needs to be at least a sentence, because it goes on the record.");
        return;
      }
      fd.append("releaseEarly", "true");
      fd.append("releaseReason", reason.trim());
      try { await send(); await loadClients(); } catch (e3) { err(e3.message); }
    }
  });
}
