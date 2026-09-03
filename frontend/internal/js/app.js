/* ETABLIX Control Desk — commercial intake: project enquiries and
   supplier applications, with search, documents and status control. */

import { LEAD_STATUS, APPLICATION_STATUS, CAPABILITIES, ACCESS } from "/shared/constants.js";
import { loadCommercial, loadAutomation, loadOrganisation } from "/internal/js/commercial.js";

const token = sessionStorage.getItem("etablix.token");
const user = JSON.parse(sessionStorage.getItem("etablix.user") || "null");
if (!token || !user) location.replace("/internal/login.html");

// ---------- Helpers ----------

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    sessionStorage.clear();
    location.replace("/internal/login.html");
    throw new Error("Session expired");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

const when = (ts) => (ts ? new Date(ts).toLocaleDateString("en-GB") : "—");

const reference = (prefix, id) => `${prefix}-${String(id).slice(0, 6).toUpperCase()}`;

function documentLinks(docs = []) {
  if (!docs.length) return '<span class="muted">—</span>';
  return docs
    .map(
      (d) =>
        `<a href="/api/files/${encodeURIComponent(d.stored)}?token=${encodeURIComponent(token)}"
            target="_blank" rel="noopener" class="doc-link">${esc(d.name)}</a>`
    )
    .join("<br>");
}

function statusSelect(current, options, endpoint, id) {
  const opts = options
    .map((o) => `<option value="${o}" ${o === current ? "selected" : ""}>${o.replace(/_/g, " ")}</option>`)
    .join("");
  return `<select data-endpoint="${endpoint}" data-id="${id}">${opts}</select>`;
}

document.addEventListener("change", async (e) => {
  const sel = e.target.closest("select[data-endpoint]");
  if (!sel) return;
  sel.disabled = true;
  try {
    await api(`${sel.dataset.endpoint}/${sel.dataset.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: sel.value }),
    });
    refreshKpis();
  } catch (err) {
    alert(err.message);
  } finally {
    sel.disabled = false;
  }
});

// ---------- Shell ----------

document.getElementById("user-name").textContent = user.name;
document.getElementById("logout").addEventListener("click", () => {
  sessionStorage.clear();
  location.replace("/internal/login.html");
});

const tabs = document.getElementById("tabs");
const loaded = new Set();
const lazyLoaders = {
  construx: loadConstrux, veryx: loadVeryx, team: loadTeam, comms: loadComms, suppliers: loadSuppliers,
  commercial: loadCommercial, automation: loadAutomation, organisation: loadOrganisation,
};

tabs.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-panel]");
  if (!btn) return;
  const panel = btn.dataset.panel;
  tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".panel").forEach((p) =>
    p.classList.toggle("active", p.id === `panel-${panel}`)
  );
  // The search box only filters the intake tables.
  document.getElementById("intake-toolbar").style.display =
    panel === "enquiries" || panel === "applications" ? "" : "none";
  if (lazyLoaders[panel] && !loaded.has(panel)) {
    loaded.add(panel);
    lazyLoaders[panel]().catch((err) => {
      loaded.delete(panel);
      const body = document.getElementById(`${panel}-body`);
      if (body) body.innerHTML = `<p class="error-note">${esc(err.message)}</p>`;
    });
  }
});

// Team management and the communications console are admin-only.
if (user.role === "admin") {
  document.getElementById("team-tab").hidden = false;
  document.getElementById("comms-tab").hidden = false;
}
// The Commercial OS opens for the roles that carry commercial or
// delivery-finance responsibility; the server enforces the same list.
if (ACCESS.DELIVERY_FINANCE.includes(user.role)) {
  document.getElementById("commercial-tab").hidden = false;
}

// ---------- Notification bell (all employees) ----------

let bellOpen = false;

async function refreshBell() {
  try {
    const { unread } = await api("/api/comms/notifications");
    const count = document.getElementById("bell-count");
    count.hidden = !unread;
    count.textContent = unread;
  } catch {}
}

document.getElementById("bell").addEventListener("click", async () => {
  let panel = document.getElementById("bell-panel");
  if (bellOpen) {
    panel?.remove();
    bellOpen = false;
    return;
  }
  bellOpen = true;
  const { notifications } = await api("/api/comms/notifications");
  panel = document.createElement("div");
  panel.id = "bell-panel";
  panel.innerHTML =
    `<div class="bell-head">Notifications</div>` +
    (notifications.length
      ? notifications
          .map(
            (n) => `<div class="bell-item"><span class="pill ${esc(n.severity)}">${esc(n.severity)}</span>
              <div><b>${esc(n.title)}</b><div class="muted">${esc(n.body)}</div>
              <div class="muted" style="font-size:0.72rem;">${esc(n.category || "")} · ${new Date(n.createdAt).toLocaleString("en-GB")}${n.test ? " · test" : ""}</div></div></div>`
          )
          .join("")
      : '<div class="bell-item"><span class="muted">No notifications yet.</span></div>');
  document.body.appendChild(panel);
  await api("/api/comms/notifications/read", { method: "POST" }).catch(() => {});
  refreshBell();
});

refreshBell();
setInterval(refreshBell, 60000);

const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB");
const pill = (v) => `<span class="pill ${esc(v)}">${esc(String(v).replace(/_/g, " "))}</span>`;
const bar = (pct) =>
  `<div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, Number(pct) || 0)}%"></div></div><span class="muted">${Number(pct) || 0}%</span>`;
const block = (title, tableHtml) =>
  `<div class="section-block"><h3>${title}</h3><div class="table-wrap">${tableHtml}</div></div>`;

const sourceBadge = (source) => {
  if (!source) return "";
  if (source.mode === "live")
    return `<span class="pill approved" title="Data fetched from the connected platform">LIVE · ${esc(source.platform)}</span>`;
  const note = source.note ? ` title="${esc(source.note)}"` : "";
  return `<span class="pill"${note}>Workspace data</span>`;
};

async function linkBadge(product) {
  try {
    const link = await api(`/api/${product}/link`);
    document.getElementById(`${product}-badge`).innerHTML = link.connected
      ? `<span class="pill approved" title="${esc(link.summary || "")}">CONNECTED</span>`
      : "";
  } catch {}
}

// ---------- CONSTRUX panel ----------

async function loadConstrux() {
  linkBadge("construx");
  const [proj, sched, rfiRes, insRes, ncrRes, senRes] = await Promise.all([
    api("/api/construx/projects"),
    api("/api/construx/schedule"),
    api("/api/construx/rfis"),
    api("/api/construx/inspections"),
    api("/api/construx/ncrs"),
    api("/api/construx/sensors"),
  ]);
  const byId = Object.fromEntries(proj.projects.map((p) => [p.id, p.code]));
  const code = (pid) => esc(byId[pid] || "—");

  const projects = `<table><thead><tr><th>Code</th><th>Project</th><th>Sector</th><th>Status</th><th>Value</th><th>Progress</th><th>Manager</th></tr></thead><tbody>${proj.projects
    .map(
      (p) => `<tr><td><b>${esc(p.code)}</b></td><td>${esc(p.name)}<div class="muted">${esc(p.client)} · ${esc(p.startDate)} → ${esc(p.endDate)}</div></td><td>${esc(p.sector)}</td><td>${pill(p.status)}</td><td>${money(p.value)}</td><td>${bar(p.progress)}</td><td>${esc(p.manager)}</td></tr>`
    )
    .join("")}</tbody></table>`;

  const schedule = `<table><thead><tr><th>Project</th><th>Activity</th><th>Phase</th><th>Window</th><th>Progress</th><th>Critical</th></tr></thead><tbody>${sched.schedule
    .map(
      (s) => `<tr><td><b>${code(s.projectId)}</b></td><td>${esc(s.activity)}</td><td>${esc(s.phase)}</td><td class="muted">${esc(s.start)} → ${esc(s.end)}</td><td>${bar(s.progress)}</td><td>${s.critical ? pill("critical") : '<span class="muted">—</span>'}</td></tr>`
    )
    .join("")}</tbody></table>`;

  const rfis = `<table><thead><tr><th>RFI</th><th>Project</th><th>Subject</th><th>Priority</th><th>Raised by</th><th>Status</th></tr></thead><tbody>${rfiRes.rfis
    .map(
      (r) => `<tr><td><b>${esc(r.number)}</b></td><td>${code(r.projectId)}</td><td>${esc(r.subject)}</td><td>${pill(r.priority)}</td><td>${esc(r.raisedBy)}</td><td>${pill(r.status)}</td></tr>`
    )
    .join("")}</tbody></table>`;

  const inspections = `<table><thead><tr><th>Ref</th><th>Inspection</th><th>Inspector</th><th>Date</th><th>Items / failures</th><th>Score</th><th>Status</th></tr></thead><tbody>${insRes.inspections
    .map(
      (i) => `<tr><td><b>${esc(i.ref)}</b></td><td>${esc(i.type)}</td><td>${esc(i.inspector)}</td><td class="muted">${esc(i.date)}</td><td>${i.items} / ${i.failures}</td><td>${i.score ?? "—"}</td><td>${pill(i.status)}</td></tr>`
    )
    .join("")}</tbody></table>`;

  const ncrs = `<table><thead><tr><th>Ref</th><th>Non-conformance</th><th>Severity</th><th>Assigned to</th><th>Status</th></tr></thead><tbody>${ncrRes.ncrs
    .map(
      (n) => `<tr><td><b>${esc(n.ref)}</b></td><td>${esc(n.title)}</td><td>${pill(n.severity)}</td><td>${esc(n.assignedTo)}</td><td>${pill(n.status)}</td></tr>`
    )
    .join("")}</tbody></table>`;

  const sensors = `<table><thead><tr><th>Sensor</th><th>Project</th><th>Location</th><th>Reading</th><th>Threshold</th><th>Status</th></tr></thead><tbody>${senRes.sensors
    .map(
      (s) => `<tr><td><b>${esc(s.sensor)}</b></td><td>${code(s.projectId)}</td><td>${esc(s.location)}</td><td>${s.value} ${esc(s.unit)}</td><td class="muted">${s.threshold} ${esc(s.unit)}</td><td>${pill(s.status)}</td></tr>`
    )
    .join("")}</tbody></table>`;

  document.getElementById("construx-body").innerHTML =
    block("Portfolio", projects) +
    block("Schedule — key activities", schedule) +
    block("RFIs", rfis) +
    block("Quality — inspections", inspections) +
    block("Quality — non-conformances", ncrs) +
    block("Site telemetry", sensors);
}

// ---------- VERYX panel ----------

async function loadVeryx() {
  linkBadge("veryx");
  const [summary, riskRes, agentRes, usage] = await Promise.all([
    api("/api/veryx/summary"),
    api("/api/veryx/risks"),
    api("/api/veryx/agents"),
    api("/api/veryx/usage"),
  ]);

  const kpis = `<div class="kpis">
    <div class="kpi accent"><b>${summary.openRisks}</b><span>Open risks</span></div>
    <div class="kpi"><b>${summary.topRiskScore}</b><span>Top risk score</span></div>
    <div class="kpi"><b>${summary.agentRuns}</b><span>Agent runs</span></div>
    <div class="kpi"><b>${summary.acuBalance}</b><span>ACU balance</span></div>
    <div class="kpi green"><b>${summary.apiCallsUsed}</b><span>API calls this month</span></div>
  </div>`;

  const risks = `<table><thead><tr><th>Ref</th><th>Risk</th><th>Category</th><th>P × I = Score</th><th>Owner</th><th>Status</th></tr></thead><tbody>${riskRes.risks
    .map(
      (r) => `<tr><td><b>${esc(r.ref)}</b></td><td>${esc(r.title)}<div class="muted brief">${esc(r.mitigation)}</div></td><td>${esc(r.category)}</td><td><b>${r.probability} × ${r.impact} = ${r.score}</b></td><td>${esc(r.owner)}</td><td>${pill(r.status)}</td></tr>`
    )
    .join("")}</tbody></table>`;

  const agents = `<table><thead><tr><th>Agent</th><th>What it does</th><th>ACU cost</th><th></th></tr></thead><tbody>${agentRes.agents
    .map(
      (a) => `<tr><td><b>${esc(a.name)}</b></td><td class="muted">${esc(a.description)}</td><td>${a.acuCost} ACU</td><td><button class="btn-run" data-agent="${esc(a.type)}">Run now</button></td></tr>`
    )
    .join("")}</tbody></table>`;

  const runs = agentRes.runs.length
    ? `<table><thead><tr><th>When</th><th>Agent</th><th>Triggered by</th><th>Result</th><th>Status</th></tr></thead><tbody>${[...agentRes.runs]
        .reverse()
        .map(
          (r) => `<tr><td class="muted">${when(r.createdAt)}</td><td><b>${esc(r.agentName)}</b></td><td>${esc(r.triggeredBy)}</td><td class="muted">${esc(r.summary)}</td><td>${pill(r.status)}</td></tr>`
        )
        .join("")}</tbody></table>`
    : '<p class="empty-note">No agent runs yet — run one from the console above.</p>';

  const keys = `<table><thead><tr><th>Key</th><th>Workspace</th><th>Env</th><th>Scopes</th><th>Calls used</th><th>ACU balance</th></tr></thead><tbody>${usage.keys
    .map(
      (k) => `<tr><td><code>${esc(k.keyPreview)}</code></td><td>${esc(k.workspace)}</td><td>${pill(k.env)}</td><td class="muted">${k.scopes.join(", ")}</td><td>${k.used} / ${k.monthlyQuota}</td><td>${k.acuBalance}</td></tr>`
    )
    .join("")}</tbody></table>`;

  document.getElementById("veryx-body").innerHTML =
    `<p style="margin-bottom:14px;">${sourceBadge(riskRes.source)}</p>` +
    kpis +
    block("Risk register — highest exposure first", risks) +
    block("AI agent console", agents) +
    block("Recent agent runs", runs) +
    block("Platform API keys", keys);
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button.btn-run");
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = "Running…";
  try {
    await api(`/api/veryx/agents/${btn.dataset.agent}/run`, { method: "POST" });
    loaded.delete("veryx");
    await loadVeryx();
    loaded.add("veryx");
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = "Run now";
  }
});

// ---------- Delete records (admin) ----------

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-del]");
  if (!btn) return;
  if (!confirm(`Permanently delete this ${btn.dataset.delLabel}? Its uploaded documents are removed too. This cannot be undone.\n\nTip: to keep the record but bar a supplier from the directory and broadcasts, set its status to "restricted" instead.`)) return;
  btn.disabled = true;
  try {
    await api(`${btn.dataset.delEndpoint}/${btn.dataset.del}`, { method: "DELETE" });
    await load();
    supplierRows = supplierRows.filter((s) => s.id !== btn.dataset.del);
    renderSuppliers?.();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
  }
});

// ---------- Supplier directory + one-click broadcast ----------

let supplierRows = [];
const supSelected = new Set();

function supplierFilters() {
  return {
    status: document.getElementById("sup-filter-status").value,
    capability: document.getElementById("sup-filter-capability").value,
    location: document.getElementById("sup-filter-location").value.trim().toLowerCase(),
  };
}

function filteredSuppliers() {
  const f = supplierFilters();
  return supplierRows.filter((s) => {
    if (f.status === "usable" && !["approved", "prequalified"].includes(s.status)) return false;
    if (f.status === "approved" && s.status !== "approved") return false;
    if (f.status === "prequalified" && s.status !== "prequalified") return false;
    if (f.capability && s.capability !== f.capability) return false;
    if (f.location && !`${s.territories || ""}`.toLowerCase().includes(f.location)) return false;
    return true;
  });
}

function renderSuppliers() {
  const rows = filteredSuppliers();
  const shownIds = new Set(rows.map((r) => r.id));
  for (const id of [...supSelected]) if (!shownIds.has(id)) supSelected.delete(id);
  document.querySelector("#suppliers-table tbody").innerHTML = rows.length
    ? rows
        .map(
          (s) => `<tr>
          <td><input type="checkbox" data-sup="${s.id}" ${supSelected.has(s.id) ? "checked" : ""}></td>
          <td><b>${esc(s.legalName)}</b>${s.tradingName ? `<div class="muted">t/a ${esc(s.tradingName)}</div>` : ""}</td>
          <td>${esc(s.capability || "—")}</td>
          <td>${esc(s.territories || "—")}</td>
          <td>${esc(s.contact)}<div class="muted">${esc(s.email)}</div></td>
          <td><span class="pill ${s.status === "approved" ? "approved" : s.status === "prequalified" ? "prequalified" : ""}">${esc(String(s.status).replace(/_/g, " "))}</span></td>
        </tr>`
        )
        .join("")
    : '<tr><td colspan="6" class="empty-note">No suppliers match these filters yet — approved and prequalified registrations appear here.</td></tr>';
  document.getElementById("sup-selected-count").textContent = `· ${supSelected.size} selected`;
  document.getElementById("sup-select-all").checked = rows.length > 0 && rows.every((r) => supSelected.has(r.id));
}

async function loadSuppliers() {
  const capSelect = document.getElementById("sup-filter-capability");
  if (capSelect.options.length <= 1) {
    capSelect.innerHTML =
      '<option value="">All requirements</option>' +
      CAPABILITIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  }
  const { applications } = await api("/api/subcontractors");
  supplierRows = applications;
  renderSuppliers();
}

["sup-filter-status", "sup-filter-capability"].forEach((id) =>
  document.getElementById(id)?.addEventListener("change", renderSuppliers)
);
document.getElementById("sup-filter-location")?.addEventListener("input", renderSuppliers);

document.addEventListener("change", (e) => {
  const cb = e.target.closest('input[data-sup]');
  if (cb) {
    cb.checked ? supSelected.add(cb.dataset.sup) : supSelected.delete(cb.dataset.sup);
    renderSuppliers();
    return;
  }
  if (e.target.id === "sup-select-all") {
    const rows = filteredSuppliers();
    if (e.target.checked) rows.forEach((r) => supSelected.add(r.id));
    else rows.forEach((r) => supSelected.delete(r.id));
    renderSuppliers();
  }
});

document.getElementById("sup-message-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("sup-message-error");
  errEl.classList.remove("show");
  if (!supSelected.size) {
    errEl.textContent = "Select at least one supplier in the table above.";
    errEl.classList.add("show");
    return;
  }
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = "Sending…";
  try {
    const fd = new FormData();
    fd.append("subject", form.subject.value);
    fd.append("message", form.message.value);
    fd.append("ids", JSON.stringify([...supSelected]));
    for (const file of form.documents.files) fd.append("documents", file);
    const res = await fetch("/api/subcontractors/broadcast", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
    alert(`Message sent to ${body.sent} of ${body.recipients} supplier(s)${body.attachments ? ` with ${body.attachments} attachment(s)` : ""}.`);
    form.reset();
    supSelected.clear();
    renderSuppliers();
    refreshBell();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send to selected";
  }
});

// ---------- Communications console (admin only) ----------

const chanPill = (c) => `<span class="pill ${c === "email" || c === "inapp" ? "approved" : ""}" title="${c === "sms" || c === "push" ? "Sandbox until a provider key is added" : "Wired live"}">${esc(c)}</span>`;

async function loadComms() {
  const [{ categories, stats }, { deliveries }] = await Promise.all([
    api("/api/comms/catalog"),
    api("/api/comms/deliveries"),
  ]);

  const kpis = `<div class="kpis">
    <div class="kpi accent"><b>${stats.events}</b><span>Catalogue events · ${stats.categories} categories</span></div>
    <div class="kpi"><b>${stats.mandatory}</b><span>Mandatory notices (bypass opt-outs)</span></div>
    <div class="kpi"><b>${stats.delivered}</b><span>Messages delivered</span></div>
    <div class="kpi green"><b>4</b><span>Channels wired — email · in-app · sms · push</span></div>
  </div>`;

  const coverage = `<table>
    <thead><tr><th>Channel</th><th>Catalogue events</th><th>Delivered</th><th>Status</th></tr></thead><tbody>
    <tr><td><b>email</b></td><td>${stats.channels.email.events} events</td><td>${stats.channels.email.sent} sent</td><td><span class="pill approved">LIVE · SMTP</span></td></tr>
    <tr><td><b>in-app</b></td><td>${stats.channels.inapp.events} events</td><td>${stats.channels.inapp.sent} delivered</td><td><span class="pill approved">LIVE · Control Desk</span></td></tr>
    <tr><td><b>sms</b></td><td>${stats.channels.sms.events} events</td><td>${stats.channels.sms.sent} sent</td><td><span class="pill">Sandbox — add provider key</span></td></tr>
    <tr><td><b>push</b></td><td>${stats.channels.push.events} events</td><td>${stats.channels.push.sent} sent</td><td><span class="pill">Sandbox — add provider key</span></td></tr>
    </tbody></table>`;

  const recent = deliveries.length
    ? `<div class="table-wrap"><table>
        <thead><tr><th>When</th><th>Channel</th><th>Event</th><th>To</th><th>Status</th><th>Provider</th></tr></thead><tbody>${deliveries
          .map(
            (d) => `<tr><td class="muted">${new Date(d.createdAt).toLocaleString("en-GB")}</td><td>${chanPill(d.channel)}</td>
              <td><b>${esc(d.code)}</b>${d.test ? ' <span class="muted">(test)</span>' : ""}<div class="muted brief">${esc(d.subject)}</div></td>
              <td class="muted">${esc(d.to)}</td><td>${pill(d.status === "sent" || d.status === "delivered" ? "ok" : d.status === "failed" ? "failed" : "minor")} ${esc(d.status)}</td><td class="muted">${esc(d.provider)}</td></tr>`
          )
          .join("")}</tbody></table></div>`
    : '<p class="empty-note">No deliveries yet — submissions, status changes and tests all appear here.</p>';

  const catalogue = categories
    .map(
      (c) => `<div class="section-block"><h3>${esc(c.name)} <span class="muted" style="font-weight:400;">· ${c.events.length} events</span></h3>
      <div class="table-wrap"><table>
      <thead><tr><th>Event</th><th>Code</th><th>Subject</th><th>Severity</th><th>Channels</th><th>Template QA</th></tr></thead><tbody>${c.events
        .map(
          (e) => `<tr><td><b>${esc(e.name)}</b>${e.mandatory ? ' <span class="pill critical" title="Bypasses opt-outs">mandatory</span>' : ""}<div class="muted" style="font-size:0.72rem;">audience: ${esc(e.audience)}</div></td>
            <td class="muted"><code>${esc(e.code)}</code></td><td class="muted">${esc(e.subject)}</td>
            <td>${pill(e.severity === "critical" ? "critical" : e.severity === "warning" ? "major" : e.severity === "success" ? "ok" : "minor")} ${esc(e.severity)}</td>
            <td>${e.channels.map(chanPill).join(" ")}</td>
            <td style="white-space:nowrap;"><a class="btn-run" style="text-decoration:none;display:inline-block;" href="/api/comms/preview/${encodeURIComponent(e.code)}?token=${encodeURIComponent(token)}" target="_blank" rel="noopener">Preview email</a>
            <button class="btn-run" data-fire="${esc(e.code)}">Send test to me</button></td></tr>`
        )
        .join("")}</tbody></table></div></div>`
    )
    .join("");

  document.getElementById("comms-body").innerHTML =
    kpis +
    block("Channel coverage — how catalogue events fire by default", coverage) +
    `<div class="section-block"><h3>Recent deliveries <span class="muted" style="font-weight:400;">· every event × channel × recipient</span></h3>${recent}</div>` +
    catalogue;
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-fire]");
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = "Firing…";
  try {
    const { results } = await api("/api/comms/test", { method: "POST", body: JSON.stringify({ code: btn.dataset.fire }) });
    alert(results.map((r) => `${r.channel} → ${r.status}`).join("\n"));
    loaded.delete("comms");
    await loadComms();
    loaded.add("comms");
    refreshBell();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = "Send test to me";
  }
});

// ---------- Team panel (admin only) ----------

const roleLabel = (r) => String(r).replace(/_/g, " ");

async function loadIntegrations() {
  const { integrations } = await api("/api/integrations");
  document.getElementById("integrations-body").innerHTML = integrations
    .map((i) => {
      const status = i.connected
        ? `<span class="pill approved">Connected</span>`
        : i.lastTest && !i.lastTest.ok
          ? `<span class="pill declined">Failed</span>`
          : `<span class="pill">Not connected</span>`;
      return `<form class="team-form" data-integration="${esc(i.platform)}" style="margin-bottom:8px;">
        <b style="font-family:var(--font-head);min-width:90px;align-self:center;">${esc(i.label)}</b>
        <input name="baseUrl" value="${esc(i.baseUrl)}" placeholder="API base URL" style="flex:2;">
        <input name="apiKey" type="password" placeholder="${i.keyPreview ? `Key saved (${esc(i.keyPreview)}) — paste to replace` : "Paste API key / token"}" autocomplete="off">
        <button class="btn-block" type="submit" style="width:auto;padding:11px 18px;">Save &amp; test</button>
        <span style="align-self:center;">${status}</span>
      </form>
      ${i.lastTest ? `<p class="muted" style="margin:-2px 0 14px;">${esc(i.lastTest.summary)}</p>` : ""}`;
    })
    .join("");
}

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("form[data-integration]");
  if (!form) return;
  e.preventDefault();
  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Testing…";
  try {
    const name = form.dataset.integration;
    await api(`/api/integrations/${name}`, {
      method: "PUT",
      body: JSON.stringify({ baseUrl: form.baseUrl.value, apiKey: form.apiKey.value }),
    });
    await api(`/api/integrations/${name}/test`, { method: "POST" });
    await loadIntegrations();
    // A new connection changes what the product tabs should show.
    loaded.delete("construx");
    loaded.delete("veryx");
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = "Save & test";
  }
});

document.getElementById("purge-btn")?.addEventListener("click", async () => {
  const typed = prompt('This permanently deletes ALL demo and test business records and uploaded files (employee accounts and platform connections are kept).\n\nType DELETE to confirm:');
  if (typed !== "DELETE") return;
  const btn = document.getElementById("purge-btn");
  btn.disabled = true;
  btn.textContent = "Clearing…";
  try {
    const { cleared, filesDeleted } = await api("/api/admin/purge-demo-data", {
      method: "POST",
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    const total = Object.values(cleared).reduce((a, b) => a + b, 0);
    document.getElementById("purge-result").textContent = `Done — ${total} records and ${filesDeleted} file(s) removed. The platform is clean for real business.`;
    loaded.clear();
    supSelected.clear();
    supplierRows = [];
    await load();
    refreshBell();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Clear all demo & test data";
  }
});

async function loadTeam() {
  loadIntegrations().catch((err) => {
    document.getElementById("integrations-body").innerHTML = `<p class="error-note">${esc(err.message)}</p>`;
  });
  const { users, roles, positions = [] } = await api("/api/users");

  const roleSelect = document.getElementById("team-role");
  roleSelect.innerHTML = roles
    .map((r) => `<option value="${esc(r)}">${esc(roleLabel(r))}</option>`)
    .join("");

  // Position picker — grouped by organisation area; choosing a position
  // suggests the matching access level (still changeable).
  const posSelect = document.getElementById("team-position");
  if (posSelect && posSelect.options.length === 0) {
    const groups = [...new Set(positions.map((p) => p.group))];
    posSelect.innerHTML =
      '<option value="">Position (from the organisation)…</option>' +
      groups
        .map(
          (g) =>
            `<optgroup label="${esc(g)}">${positions
              .filter((p) => p.group === g)
              .map((p) => `<option value="${esc(p.title)}" data-access="${esc(p.accessRole || "")}">${esc(p.title)}</option>`)
              .join("")}</optgroup>`
        )
        .join("");
    posSelect.addEventListener("change", () => {
      const access = posSelect.selectedOptions[0]?.dataset.access;
      if (access && roles.includes(access)) roleSelect.value = access;
    });
  }

  const tbody = document.querySelector("#team-table tbody");
  tbody.innerHTML = users
    .map((u) => {
      const self = u.id === user.id;
      const roleCell = self
        ? `<b>${esc(roleLabel(u.role))}</b>`
        : `<select data-user-role="${u.id}">${roles
            .map((r) => `<option value="${esc(r)}" ${r === u.role ? "selected" : ""}>${esc(roleLabel(r))}</option>`)
            .join("")}</select>`;
      const actions = self
        ? '<span class="muted">you</span>'
        : `<button class="btn-run" data-user-reset="${u.id}">Reset password</button>
           <button class="btn-run" data-user-toggle="${u.id}" data-active="${u.active}">${u.active ? "Deactivate" : "Reactivate"}</button>`;
      const statusPill = `<span class="pill ${u.active ? "approved" : "declined"}">${u.active ? "Active" : "Deactivated"}</span>`;
      return `<tr><td><b>${esc(u.name)}</b>${u.position ? `<div class="muted" style="font-size:0.78rem;">${esc(u.position)}</div>` : ""}</td><td>${esc(u.email)}</td><td>${roleCell}</td><td class="muted">${when(u.createdAt)}</td><td>${statusPill}</td><td>${actions}</td></tr>`;
    })
    .join("");
}

const teamError = (msg) => {
  const el = document.getElementById("team-error");
  el.textContent = msg || "";
  el.classList.toggle("show", Boolean(msg));
};

document.getElementById("team-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  teamError("");
  const f = e.target;
  try {
    await api("/api/users", {
      method: "POST",
      body: JSON.stringify({
        name: f.name.value,
        email: f.email.value,
        role: f.role.value,
        position: f.position.value,
        password: f.password.value,
      }),
    });
    f.reset();
    await loadTeam();
  } catch (err) {
    teamError(err.message);
  }
});

document.addEventListener("click", async (e) => {
  const reset = e.target.closest("button[data-user-reset]");
  const toggle = e.target.closest("button[data-user-toggle]");
  if (!reset && !toggle) return;
  try {
    if (reset) {
      const pw = prompt("New password for this employee (min 10 characters):");
      if (!pw) return;
      await api(`/api/users/${reset.dataset.userReset}`, { method: "PATCH", body: JSON.stringify({ password: pw }) });
      alert("Password updated. Hand it to the employee securely.");
    } else {
      const active = toggle.dataset.active === "true";
      if (active && !confirm("Deactivate this account? They will no longer be able to sign in.")) return;
      await api(`/api/users/${toggle.dataset.userToggle}`, { method: "PATCH", body: JSON.stringify({ active: !active }) });
    }
    await loadTeam();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("change", async (e) => {
  const sel = e.target.closest("select[data-user-role]");
  if (!sel) return;
  sel.disabled = true;
  try {
    await api(`/api/users/${sel.dataset.userRole}`, { method: "PATCH", body: JSON.stringify({ role: sel.value }) });
  } catch (err) {
    alert(err.message);
    await loadTeam();
  } finally {
    sel.disabled = false;
  }
});

// ---------- Prequalification scorecard ----------

let prequalCriteria = null;

function prequalOutcome(scores) {
  // Mirrors backend/lib/prequal.js for the live preview only — the
  // server's computation is the one that counts.
  const rows = prequalCriteria.map((c) => ({ ...c, score: Number(scores[c.id] ?? 3) }));
  const pct = Math.round(rows.reduce((a, r) => a + (r.score / 5) * r.weight, 0));
  const cz = rows.filter((r) => r.critical && r.score === 0);
  const cl = rows.filter((r) => r.critical && r.score < 2);
  if (cz.length) return { pct, outcome: "FAIL — critical criterion at zero" };
  if (pct >= 70 && !cl.length) return { pct, outcome: "PREQUALIFY" };
  if (pct >= 50) return { pct, outcome: cl.length ? "CONDITIONAL — critical criterion below 2" : "CONDITIONAL — actions required" };
  return { pct, outcome: "DECLINE" };
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-assess]");
  if (!btn) return;
  const app_ = applications.find((a) => a.id === btn.dataset.assess);
  if (!app_) return;
  if (!prequalCriteria) prequalCriteria = (await api("/api/subcontractors/prequal-criteria")).criteria;
  const prior = app_.assessment?.scores || {};
  const holder = document.getElementById("assess-holder");
  holder.innerHTML = `<div class="section-block" style="border:1.5px solid var(--amber,#9c7a3c);border-radius:10px;padding:18px 22px;margin-top:18px;">
    <h3>Prequalification assessment — ${esc(app_.legalName)}</h3>
    <p class="muted" style="margin:4px 0 12px;">Score each criterion 0 (no evidence / unacceptable) to 5 (strong, evidenced). Four criteria are <b>critical</b>: a zero fails the assessment outright; below 2 caps it at conditional. The registered documents are in the table above.</p>
    <div class="table-wrap"><table style="font-size:0.88rem;"><thead><tr><th>Criterion</th><th>Weight</th><th>Evidence to look for</th><th style="width:70px;">Score</th></tr></thead><tbody>
      ${prequalCriteria.map((c) => `<tr>
        <td><b>${esc(c.label)}</b>${c.critical ? ' <span class="pill critical" title="Zero fails outright; below 2 caps at conditional">critical</span>' : ""}</td>
        <td>${c.weight}%</td>
        <td class="muted" style="font-size:0.8rem;">${esc(c.evidence)}</td>
        <td><select data-pq="${c.id}">${[0,1,2,3,4,5].map((n) => `<option value="${n}" ${Number(prior[c.id] ?? 3) === n ? "selected" : ""}>${n}</option>`).join("")}</select></td>
      </tr>`).join("")}
    </tbody></table></div>
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:12px;">
      <button class="btn-run" id="pq-ai" title="Agent 7 — Assurance &amp; Evidence drafts scores from the registration; you adjust and record">🤖 Draft with Agent 7</button>
      <b id="pq-preview" style="font-family:var(--font-head);font-size:1.05rem;"></b>
      <label style="font-size:0.85rem;"><input type="checkbox" id="pq-apply" checked> Apply the recommended status (emails the supplier their outcome)</label>
    </div>
    <div id="pq-ai-note"></div>
    <textarea id="pq-notes" placeholder="Assessment notes — what was reviewed, conditions attached, actions required…" style="width:100%;min-height:70px;padding:10px 12px;border:1.5px solid var(--line);border-radius:7px;font-family:inherit;font-size:0.9rem;margin-top:10px;">${esc(app_.assessment?.notes || "")}</textarea>
    <div style="margin-top:12px;">
      <button class="btn-block" id="pq-submit" style="width:auto;padding:12px 24px;">Record assessment</button>
      <button class="btn-run" id="pq-cancel" style="margin-left:8px;">Cancel</button>
    </div>
  </div>`;
  const refresh = () => {
    const scores = Object.fromEntries([...holder.querySelectorAll("select[data-pq]")].map((s) => [s.dataset.pq, s.value]));
    const { pct, outcome } = prequalOutcome(scores);
    document.getElementById("pq-preview").textContent = `Weighted ${pct}% → ${outcome}`;
  };
  holder.querySelectorAll("select[data-pq]").forEach((s) => s.addEventListener("change", refresh));
  refresh();
  document.getElementById("pq-cancel").addEventListener("click", () => (holder.innerHTML = ""));
  document.getElementById("pq-ai").addEventListener("click", async () => {
    const aiBtn = document.getElementById("pq-ai");
    aiBtn.disabled = true;
    aiBtn.textContent = "Agent 7 reviewing…";
    try {
      const { draft } = await api(`/api/subcontractors/${app_.id}/assessment/draft`, { method: "POST" });
      for (const sel of holder.querySelectorAll("select[data-pq]")) {
        if (draft.scores[sel.dataset.pq] !== undefined) sel.value = draft.scores[sel.dataset.pq];
        const cell = sel.closest("tr")?.children[2];
        const why = draft.rationale[sel.dataset.pq];
        if (cell && why) cell.innerHTML = `<span class="muted" style="font-size:0.8rem;">${esc(why)}</span>`;
      }
      refresh();
      document.getElementById("pq-ai-note").innerHTML = `<div style="border-left:3px solid var(--amber,#9c7a3c);padding:8px 0 8px 14px;margin-top:12px;font-size:0.85rem;">
        <b>Agent 7 draft — a human decision is still required.</b> ${esc(draft.note)}
        ${draft.missingEvidence.length ? `<div style="margin-top:6px;"><b>Verify before recording:</b> ${draft.missingEvidence.map(esc).join(" · ")}</div>` : ""}
      </div>`;
      aiBtn.textContent = "Re-draft with Agent 7";
    } catch (err) {
      alert(err.message);
      aiBtn.textContent = "🤖 Draft with Agent 7";
    } finally {
      aiBtn.disabled = false;
    }
  });
  document.getElementById("pq-submit").addEventListener("click", async () => {
    const submit = document.getElementById("pq-submit");
    submit.disabled = true;
    try {
      const scores = Object.fromEntries([...holder.querySelectorAll("select[data-pq]")].map((s) => [s.dataset.pq, Number(s.value)]));
      const { recommendedStatus, applied } = await api(`/api/subcontractors/${app_.id}/assessment`, {
        method: "POST",
        body: JSON.stringify({ scores, notes: document.getElementById("pq-notes").value, applyStatus: document.getElementById("pq-apply").checked }),
      });
      holder.innerHTML = "";
      await load();
      refreshBell();
      alert(`Assessment recorded. Recommended status: ${recommendedStatus.replace(/_/g, " ")}${applied ? " (applied — supplier notified)" : " (not applied)"}.`);
    } catch (err) {
      alert(err.message);
      submit.disabled = false;
    }
  });
  holder.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Data ----------

let leads = [];
let applications = [];
let query = "";

function matches(row, fields) {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => String(f || "").toLowerCase().includes(q));
}

function emptyRow() {
  return '<tr><td colspan="7" class="empty-note">No records match this view.</td></tr>';
}

function renderEnquiries() {
  const tbody = document.querySelector("#enquiries-table tbody");
  const rows = leads
    .filter((l) => matches(l, [reference("ENQ", l.id), l.company, l.name]))
    .map(
      (l) => `<tr>
        <td><b>${reference("ENQ", l.id)}</b></td>
        <td><b>${esc(l.company)}</b><div class="muted">${esc(l.name)} · ${esc(l.email)}${l.phone ? " · " + esc(l.phone) : ""}</div></td>
        <td>${esc(l.service || "—")}<div class="muted">${esc(l.sector || "")}${l.startDate ? " · start " + esc(l.startDate) : ""}</div>
            <div class="muted brief">${esc(l.brief).slice(0, 180)}${l.brief && l.brief.length > 180 ? "…" : ""}</div></td>
        <td>${esc(l.location || "—")}</td>
        <td>${when(l.createdAt)}</td>
        <td>${documentLinks(l.documents)}</td>
        <td>${statusSelect(l.status, LEAD_STATUS, "/api/leads", l.id)}${user.role === "admin" ? `<div style="margin-top:6px;"><button class="btn-run" data-del="${l.id}" data-del-endpoint="/api/leads" data-del-label="enquiry from ${esc(l.company)}">Delete</button></div>` : ""}</td>
      </tr>`
    );
  tbody.innerHTML = rows.length ? rows.join("") : emptyRow();
}

function renderApplications() {
  const tbody = document.querySelector("#applications-table tbody");
  const rows = applications
    .filter((a) => matches(a, [reference("SUP", a.id), a.legalName, a.tradingName, a.contact]))
    .map(
      (a) => `<tr>
        <td><b>${reference("SUP", a.id)}</b></td>
        <td><b>${esc(a.legalName)}</b>${a.tradingName ? `<div class="muted">t/a ${esc(a.tradingName)}</div>` : ""}
            <div class="muted">${esc(a.contact)} · ${esc(a.email)} · ${esc(a.phone)}</div>
            <div class="muted">Reg. ${esc(a.regNumber)}</div></td>
        <td>${esc(a.capability)}<div class="muted">${a.largestContract ? "Largest: " + esc(a.largestContract) + " · " : ""}${a.mobilisation ? "Mobilise: " + esc(a.mobilisation) : ""}</div>
            <div class="muted brief">${esc(a.statement).slice(0, 160)}${a.statement && a.statement.length > 160 ? "…" : ""}</div></td>
        <td>${esc(a.territories || "—")}</td>
        <td>${when(a.createdAt)}</td>
        <td>${documentLinks(a.documents)}</td>
        <td>${statusSelect(a.status, APPLICATION_STATUS, "/api/subcontractors", a.id)}
            ${a.assessment ? `<div style="margin-top:6px;"><span class="pill ${a.assessment.outcome === "prequalify" ? "approved" : a.assessment.outcome === "fail" || a.assessment.outcome === "decline" ? "declined" : ""}" title="${esc(a.assessment.reason || "")} — assessed by ${esc(a.assessment.assessor)}">${esc(a.assessment.outcome)} · ${a.assessment.weightedPct}%</span></div>` : ""}
            ${ACCESS.DELIVERY_FINANCE.includes(user.role) ? `<div style="margin-top:6px;"><button class="btn-run" data-assess="${a.id}">${a.assessment ? "Re-assess" : "Assess"}</button></div>` : ""}
            ${user.role === "admin" ? `<div style="margin-top:6px;"><button class="btn-run" data-del="${a.id}" data-del-endpoint="/api/subcontractors" data-del-label="registration from ${esc(a.legalName)}">Delete</button></div>` : ""}</td>
      </tr>`
    );
  tbody.innerHTML = rows.length ? rows.join("") : emptyRow();
}

function refreshKpis() {
  const newActions =
    leads.filter((l) => l.status === "new").length +
    applications.filter((a) => a.status === "submitted").length;
  const documents =
    leads.reduce((n, l) => n + (l.documents?.length || 0), 0) +
    applications.reduce((n, a) => n + (a.documents?.length || 0), 0);
  document.getElementById("kpi-actions").textContent = newActions;
  document.getElementById("kpi-enquiries").textContent = leads.length;
  document.getElementById("kpi-applications").textContent = applications.length;
  document.getElementById("kpi-documents").textContent = documents;
}

document.getElementById("search").addEventListener("input", (e) => {
  query = e.target.value.trim();
  renderEnquiries();
  renderApplications();
});

async function load() {
  const [leadRes, appRes] = await Promise.all([
    api("/api/leads"),
    api("/api/subcontractors"),
  ]);
  leads = leadRes.leads;
  applications = appRes.applications;
  refreshKpis();
  renderEnquiries();
  renderApplications();
}

load().catch((err) => {
  console.error(err);
  document.querySelector("#enquiries-table tbody").innerHTML =
    `<tr><td colspan="7" class="error-note">${esc(err.message)}</td></tr>`;
});
