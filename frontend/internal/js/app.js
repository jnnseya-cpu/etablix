/* ETABLIX Control Desk — commercial intake: project enquiries and
   supplier applications, with search, documents and status control. */

import { LEAD_STATUS, APPLICATION_STATUS } from "/shared/constants.js";

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
const lazyLoaders = { construx: loadConstrux, veryx: loadVeryx, team: loadTeam };

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

// Team management is admin-only; hide the tab from everyone else.
if (user.role === "admin") document.getElementById("team-tab").hidden = false;

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

async function loadTeam() {
  loadIntegrations().catch((err) => {
    document.getElementById("integrations-body").innerHTML = `<p class="error-note">${esc(err.message)}</p>`;
  });
  const { users, roles } = await api("/api/users");

  const roleSelect = document.getElementById("team-role");
  roleSelect.innerHTML = roles
    .map((r) => `<option value="${esc(r)}">${esc(roleLabel(r))}</option>`)
    .join("");

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
      return `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${roleCell}</td><td class="muted">${when(u.createdAt)}</td><td>${statusPill}</td><td>${actions}</td></tr>`;
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
        <td>${statusSelect(l.status, LEAD_STATUS, "/api/leads", l.id)}</td>
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
        <td>${statusSelect(a.status, APPLICATION_STATUS, "/api/subcontractors", a.id)}</td>
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
