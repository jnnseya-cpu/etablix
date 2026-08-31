/* ETABLIX internal dashboard. Session-token auth against the JSON API. */

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

const money = (n) =>
  typeof n === "number" ? "$" + (n / 1e6).toFixed(1) + "M" : "—";

const when = (ts) => (ts ? new Date(ts).toLocaleDateString() : "—");

const pill = (status) =>
  `<span class="pill ${esc(status)}">${esc(String(status).replace(/_/g, " "))}</span>`;

function renderTable(el, headers, rows, emptyText) {
  if (!rows.length) {
    el.innerHTML = `<tr><td class="empty-note">${esc(emptyText)}</td></tr>`;
    return;
  }
  el.innerHTML =
    `<thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
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
  } catch (err) {
    alert(err.message);
  } finally {
    sel.disabled = false;
  }
});

// ---------- Shell ----------

document.getElementById("user-name").textContent = user.name;
document.getElementById("user-role").textContent = user.role.replace(/_/g, " ");
document.getElementById("hello-name").textContent = `, ${user.name.split(" ")[0]}`;
document.getElementById("logout").addEventListener("click", () => {
  sessionStorage.clear();
  location.replace("/internal/login.html");
});

const tabs = document.getElementById("tabs");
tabs.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-panel]");
  if (!btn) return;
  tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".panel").forEach((p) =>
    p.classList.toggle("active", p.id === `panel-${btn.dataset.panel}`)
  );
});

function kpi(label, value, cls = "") {
  return `<div class="kpi ${cls}"><b>${value}</b><span>${esc(label)}</span></div>`;
}

// ---------- Overview ----------

async function loadOverview() {
  const [stats, veryx] = await Promise.all([api("/api/stats"), api("/api/veryx/summary")]);
  document.getElementById("overview-kpis").innerHTML =
    kpi("Active projects", stats.activeProjects, "accent") +
    kpi("Portfolio value", money(stats.portfolioValue), "accent") +
    kpi("New leads", stats.newLeads) +
    kpi("Pending sub applications", stats.pendingApplications) +
    kpi("Open RFIs", stats.openRfis) +
    kpi("Open risks", veryx.openRisks, "green") +
    kpi("ACU balance", veryx.acuBalance, "green");
}

// ---------- Leads ----------

function leadRows(leads, editable) {
  return leads.map((l) => [
    `<b>${esc(l.name)}</b><div class="muted">${esc(l.email)}</div>`,
    esc(l.company),
    esc(l.sector || "—"),
    esc(l.budget || "—"),
    esc(l.message).slice(0, 160) + (l.message.length > 160 ? "…" : ""),
    when(l.createdAt),
    editable ? statusSelect(l.status, LEAD_STATUS, "/api/leads", l.id) : pill(l.status),
  ]);
}

async function loadLeads() {
  const { leads } = await api("/api/leads");
  const headers = ["Contact", "Company", "Sector", "Budget", "Message", "Received", "Status"];
  renderTable(document.getElementById("leads-table"), headers, leadRows(leads, true), "No leads yet.");
  renderTable(
    document.getElementById("overview-leads"),
    headers,
    leadRows(leads.slice(0, 3), false),
    "No leads yet."
  );
}

// ---------- Subcontractor applications ----------

function subRows(apps, editable) {
  return apps.map((a) => [
    `<b>${esc(a.company)}</b><div class="muted">${esc(a.contact)} · ${esc(a.email)}</div>`,
    esc(a.trade),
    esc(a.crewSize || "—"),
    `${a.licensed ? "✓ licensed" : "✗ unlicensed"}<br>${a.insured ? "✓ insured" : "✗ uninsured"}`,
    esc(a.experience).slice(0, 140) + (a.experience.length > 140 ? "…" : ""),
    when(a.createdAt),
    editable ? statusSelect(a.status, APPLICATION_STATUS, "/api/subcontractors", a.id) : pill(a.status),
  ]);
}

async function loadSubs() {
  const { applications } = await api("/api/subcontractors");
  const headers = ["Company", "Trade", "Crew", "Compliance", "Experience", "Received", "Status"];
  renderTable(document.getElementById("subs-table"), headers, subRows(applications, true), "No applications yet.");
  renderTable(
    document.getElementById("overview-subs"),
    headers,
    subRows(applications.slice(0, 3), false),
    "No applications yet."
  );
}

// ---------- Construx ----------

async function loadConstrux() {
  const [{ projects }, { schedule }, { rfis }, { inspections }, { ncrs }, { sensors }] =
    await Promise.all([
      api("/api/construx/projects"),
      api("/api/construx/schedule?critical=true"),
      api("/api/construx/rfis"),
      api("/api/construx/inspections"),
      api("/api/construx/ncrs"),
      api("/api/construx/sensors"),
    ]);

  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const proj = (pid) => (byId[pid] ? byId[pid].code : "—");

  document.getElementById("construx-kpis").innerHTML =
    kpi("Projects in delivery", projects.length, "accent") +
    kpi("Critical activities", schedule.length) +
    kpi("Open RFIs", rfis.filter((r) => r.status === "open").length) +
    kpi("Open NCRs", ncrs.filter((n) => n.status === "open").length) +
    kpi("Sensor alerts", sensors.filter((s) => s.status === "alert").length);

  renderTable(
    document.getElementById("projects-table"),
    ["Code", "Project", "Client", "Status", "Value", "Progress", "Manager"],
    projects.map((p) => [
      `<b>${esc(p.code)}</b>`,
      `${esc(p.name)}<div class="muted">${esc(p.sector)}</div>`,
      esc(p.client),
      pill(p.status),
      money(p.value),
      `<div class="progress-track"><div class="progress-fill" style="width:${p.progress}%"></div></div><span class="muted">${p.progress}%</span>`,
      esc(p.manager),
    ]),
    "No projects."
  );

  renderTable(
    document.getElementById("schedule-table"),
    ["Project", "Activity", "Phase", "Start", "End", "Progress"],
    schedule.map((s) => [
      proj(s.projectId),
      `<b>${esc(s.activity)}</b>`,
      esc(s.phase),
      esc(s.start),
      esc(s.end),
      `<div class="progress-track"><div class="progress-fill" style="width:${s.progress}%"></div></div><span class="muted">${s.progress}%</span>`,
    ]),
    "No critical activities."
  );

  renderTable(
    document.getElementById("rfis-table"),
    ["Ref", "Project", "Subject", "Raised by", "Priority", "Status"],
    rfis.map((r) => [
      `<b>${esc(r.number)}</b>`,
      proj(r.projectId),
      esc(r.subject),
      esc(r.raisedBy),
      pill(r.priority),
      pill(r.status),
    ]),
    "No RFIs."
  );

  renderTable(
    document.getElementById("inspections-table"),
    ["Ref", "Project", "Inspection", "Inspector", "Date", "Items", "Score", "Status"],
    inspections.map((i) => [
      `<b>${esc(i.ref)}</b>`,
      proj(i.projectId),
      esc(i.type),
      esc(i.inspector),
      esc(i.date),
      `${i.items} <span class="muted">(${i.failures} failed)</span>`,
      i.score == null ? "—" : `${i.score}%`,
      pill(i.status),
    ]),
    "No inspections."
  );

  renderTable(
    document.getElementById("ncrs-table"),
    ["Ref", "Project", "Non-conformance", "Assigned to", "Severity", "Status"],
    ncrs.map((n) => [
      `<b>${esc(n.ref)}</b>`,
      proj(n.projectId),
      esc(n.title),
      esc(n.assignedTo),
      pill(n.severity),
      pill(n.status),
    ]),
    "No NCRs."
  );

  renderTable(
    document.getElementById("sensors-table"),
    ["Sensor", "Project", "Type", "Location", "Reading", "Threshold", "Status"],
    sensors.map((s) => [
      `<b>${esc(s.sensor)}</b>`,
      proj(s.projectId),
      esc(s.kind.replace(/_/g, " ")),
      esc(s.location),
      `${s.value} ${esc(s.unit)}`,
      `${s.threshold} ${esc(s.unit)}`,
      pill(s.status),
    ]),
    "No sensors online."
  );
}

// ---------- Veryx ----------

async function loadVeryx() {
  const [summary, { risks }, { agents, runs }, { keys }] = await Promise.all([
    api("/api/veryx/summary"),
    api("/api/veryx/risks"),
    api("/api/veryx/agents"),
    api("/api/veryx/usage"),
  ]);

  document.getElementById("veryx-kpis").innerHTML =
    kpi("Open risks", summary.openRisks, "accent") +
    kpi("Top risk score", summary.topRiskScore, "accent") +
    kpi("Agent runs", summary.agentRuns, "green") +
    kpi("ACU balance", summary.acuBalance, "green") +
    kpi("API calls this month", summary.apiCallsUsed);

  renderTable(
    document.getElementById("risks-table"),
    ["Ref", "Risk", "Category", "P×I", "Score", "Owner", "Mitigation", "Status"],
    risks.map((r) => [
      `<b>${esc(r.ref)}</b>`,
      esc(r.title),
      esc(r.category),
      `${r.probability} × ${r.impact}`,
      `<b>${r.score}</b>`,
      esc(r.owner),
      esc(r.mitigation),
      pill(r.status),
    ]),
    "No risks registered."
  );

  renderTable(
    document.getElementById("agents-table"),
    ["Agent", "What it does", "ACU / run", ""],
    agents.map((a) => [
      `<b>${esc(a.name)}</b><div class="muted">${esc(a.type)}</div>`,
      esc(a.description),
      `<b>${a.acuCost}</b>`,
      `<button class="btn-ghost" style="color:var(--orange);border-color:var(--orange);" data-run="${esc(a.type)}">Run now</button>`,
    ]),
    "No agents in the catalogue."
  );

  renderTable(
    document.getElementById("runs-table"),
    ["Agent", "Triggered by", "When", "ACU", "Status", "Summary"],
    [...runs].reverse().slice(0, 10).map((r) => [
      `<b>${esc(r.agentName)}</b>`,
      esc(r.triggeredBy),
      when(r.createdAt),
      r.acuCost,
      pill(r.status),
      esc(r.summary),
    ]),
    "No runs yet — trigger an agent above."
  );

  renderTable(
    document.getElementById("keys-table"),
    ["Key", "Workspace", "Env", "Scopes", "Quota used", "ACU balance"],
    keys.map((k) => [
      `<code>${esc(k.keyPreview)}</code>`,
      esc(k.workspace),
      `<span class="pill ${k.env === "test" ? "under_review" : "approved"}">${esc(k.env)}</span>`,
      k.scopes.map((s) => `<code class="muted">${esc(s)}</code>`).join("<br>"),
      `${k.used} / ${k.monthlyQuota}`,
      `<b>${k.acuBalance}</b>`,
    ]),
    "No API keys issued."
  );
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-run]");
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = "Running…";
  try {
    await api(`/api/veryx/agents/${btn.dataset.run}/run`, { method: "POST" });
    await loadVeryx();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = "Run now";
  }
});

// ---------- Boot ----------

Promise.allSettled([loadOverview(), loadLeads(), loadSubs(), loadConstrux(), loadVeryx()]).then(
  (results) => {
    for (const r of results) {
      if (r.status === "rejected") console.error(r.reason);
    }
  }
);
