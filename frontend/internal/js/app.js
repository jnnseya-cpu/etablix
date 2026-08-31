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
tabs.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-panel]");
  if (!btn) return;
  tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".panel").forEach((p) =>
    p.classList.toggle("active", p.id === `panel-${btn.dataset.panel}`)
  );
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
