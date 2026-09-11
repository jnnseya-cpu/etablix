/* ETABLIX Control Desk — commercial intake: project enquiries and
   supplier applications, with search, documents and status control. */

import { LEAD_STATUS, APPLICATION_STATUS, CAPABILITIES, ACCESS } from "/shared/constants.js";
import { loadCommercial, loadAutomation, loadOrganisation } from "/internal/js/commercial.js";
import { loadClients } from "/internal/js/clients.js";

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
  clients: loadClients,
};

/**
 * Open a panel by name, and optionally a section within it.
 *
 * The playbook index links straight to the tool that enforces each
 * rule — "#commercial/cashflow" rather than "go to Commercial OS and
 * find the cash-flow desk" — so the hash is the address of a tool, not
 * decoration. Unknown or hidden panels fall through silently: a link to
 * a tab this role cannot see should do nothing, not throw.
 *
 * Resolves once the panel has finished loading, so a caller can write
 * into it afterwards without racing its render.
 */
export async function openPanel(panel, section) {
  const btn = tabs.querySelector(`button[data-panel="${CSS.escape(panel)}"]`);
  if (!btn || btn.hidden) return false;
  if (section) {
    sessionStorage.setItem("etablix.section", section);
    // A hash change on an already-open panel does not reload the page,
    // so the panel must be re-rendered or the requested section is
    // stored and never read — which is what following a second link
    // from the playbook index does.
    loaded.delete(panel);
  }
  await activatePanel(btn);
  return true;
}

function applyHash() {
  const [panel, section] = decodeURIComponent(location.hash.replace(/^#/, "")).split("/");
  if (panel) openPanel(panel, section);
}

window.addEventListener("hashchange", applyHash);

tabs.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-panel]");
  if (btn) activatePanel(btn);
});

/**
 * Show a panel and load it if it has not been loaded yet.
 *
 * Returns the loader's promise, so a caller that wants to write into
 * the panel afterwards — pre-filling a document form, say — can wait
 * for the panel to finish rendering instead of racing it and having
 * its work overwritten a moment later.
 */
function activatePanel(btn) {
  const panel = btn.dataset.panel;
  if (location.hash.replace(/^#/, "").split("/")[0] !== panel) {
    history.replaceState(null, "", `#${panel}`);
  }
  tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".panel").forEach((p) =>
    p.classList.toggle("active", p.id === `panel-${panel}`)
  );
  // The search box only filters the intake tables.
  document.getElementById("intake-toolbar").style.display =
    panel === "enquiries" || panel === "applications" ? "" : "none";
  if (lazyLoaders[panel] && !loaded.has(panel)) {
    loaded.add(panel);
    return lazyLoaders[panel]().catch((err) => {
      loaded.delete(panel);
      const body = document.getElementById(`${panel}-body`);
      if (body) body.innerHTML = `<p class="error-note">${esc(err.message)}</p>`;
    });
  }
  return Promise.resolve();
}

// Team management and the communications console are admin-only.
if (user.role === "admin") {
  document.getElementById("team-tab").hidden = false;
  document.getElementById("comms-tab").hidden = false;
}
// The Commercial OS opens for the roles that carry commercial or
// delivery-finance responsibility; the server enforces the same list.
if (ACCESS.DELIVERY_FINANCE.includes(user.role)) {
  document.getElementById("commercial-tab").hidden = false;
  document.getElementById("clients-tab").hidden = false;
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


// ---------- VERYX portfolio dashboard ----------
/* Charts are inline SVG and CSS bars — no library, no canvas. Colour
   carries state only where a label carries it too: every segment and
   every band is named in text, so the dashboard reads correctly in
   greyscale, under colour-vision deficiency and in print. The health
   bands are the EVM gate's own thresholds, so "at risk" here means
   exactly what it means on the payment gate. */

const HEALTH_FILL = {
  good: "#1f9d61",      // on track
  warning: "#b8860b",   // at risk — validated against the others
  critical: "#c0392b",  // delayed
  complete: "#5b6672",  // neutral, deliberately recessive
};
const HEALTH_TONE = { on_track: "good", at_risk: "warning", delayed: "critical", complete: "complete" };
const RAG_OPTIONS = ["on_track", "at_risk", "delayed", "complete"];
const SERIES = "#9c7a3c";   // single-hue magnitude
const TRACK = "#e3e6ea";    // recessive track

const pc = (n) => `${Math.round(Number(n) || 0)}%`;
const shortMoney = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `£${(v / 1e6).toFixed(2)}m`;
  if (Math.abs(v) >= 1e3) return `£${Math.round(v / 1e3)}k`;
  return `£${v}`;
};
const monthLabel = (m) => {
  const d = new Date(`${m}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? m : d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
};

/** Part-to-whole bar: one row, a 2px gap between fills, every segment named. */
function healthBar(health, total) {
  if (!total) return '<p class="empty-note">No projects to report on yet.</p>';
  const segs = health
    .filter((h) => h.count > 0)
    .map(
      (h) => `<div title="${esc(h.label)}: ${h.count} of ${total}" style="flex:${h.count};background:${HEALTH_FILL[h.tone]};height:26px;border-radius:3px;"></div>`
    )
    .join("");
  const key = health
    .map(
      (h) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;font-size:0.82rem;">
        <span aria-hidden="true" style="width:10px;height:10px;border-radius:2px;background:${HEALTH_FILL[h.tone]};display:inline-block;"></span>
        <b>${h.count}</b> <span class="muted">${esc(h.label)}</span></span>`
    )
    .join("");
  return `<div style="display:flex;gap:2px;margin-bottom:10px;">${segs}</div><div>${key}</div>`;
}

/** Per-project budget meter: track = budgeted, fill = spent, rule = committed. */
function budgetMeters(projects) {
  const rows = projects
    .filter((p) => p.budget.budgeted > 0)
    .map((p) => {
      const spent = Math.min(100, p.spentPct);
      const committed = Math.min(100, p.committedPct);
      const over = p.spentPct > 100;
      return `<tr>
        <td style="white-space:nowrap;"><b>${esc(p.code)}</b></td>
        <td style="width:100%;">
          <div title="${esc(p.name)} — spent ${shortMoney(p.budget.spent)} of ${shortMoney(p.budget.budgeted)} budgeted, ${shortMoney(p.budget.committed)} committed" style="position:relative;background:${TRACK};height:18px;border-radius:3px;overflow:hidden;">
            <div style="width:${spent}%;height:100%;background:${over ? HEALTH_FILL.critical : SERIES};border-radius:3px 0 0 3px;"></div>
            <div aria-hidden="true" style="position:absolute;top:0;left:${committed}%;width:2px;height:100%;background:var(--ink);opacity:0.55;"></div>
          </div>
        </td>
        <td class="muted" style="white-space:nowrap;font-size:0.82rem;">${shortMoney(p.budget.spent)} / ${shortMoney(p.budget.budgeted)} · <b>${pc(p.spentPct)}</b></td>
      </tr>`;
    })
    .join("");
  if (!rows) return '<p class="empty-note">No budget lines recorded against any project yet.</p>';
  const missing = projects.filter((p) => p.budget.budgeted <= 0).length;
  return `<table><tbody>${rows}</tbody></table>
    <p class="muted" style="font-size:0.8rem;margin-top:8px;">Bar is spend against budget; the vertical rule marks committed value. A bar turning red is spend past budget.${
      missing ? ` <b>${missing}</b> project${missing === 1 ? " has" : "s have"} no budget lines recorded and cannot be shown here.` : ""
    }</p>`;
}

/** Sorted magnitude bars, one hue — identity is in the row label, not the colour. */
function sectorBars(sectors) {
  if (!sectors.length) return '<p class="empty-note">No projects to group yet.</p>';
  const max = Math.max(...sectors.map((s) => s.count));
  return `<table><tbody>${sectors
    .map(
      (s) => `<tr>
      <td style="white-space:nowrap;">${esc(s.sector)}</td>
      <td style="width:100%;"><div title="${esc(s.sector)}: ${s.count} project${s.count === 1 ? "" : "s"}, ${shortMoney(s.value)}" style="background:${SERIES};height:14px;width:${(s.count / max) * 100}%;min-width:3px;border-radius:0 3px 3px 0;"></div></td>
      <td class="muted" style="white-space:nowrap;font-size:0.82rem;"><b>${s.count}</b> · ${shortMoney(s.value)}</td>
    </tr>`
    )
    .join("")}</tbody></table>`;
}

/** Portfolio timeline: one bar per project across the shared window, with today marked.
    Laid out as flex rows with a fixed-width label column, so the today rule is
    positioned against the track column itself rather than guessed from table widths. */
function timeline(projects, win) {
  if (!win) return '<p class="empty-note">Project dates are needed to draw the timeline.</p>';
  const span = win.to - win.from || 1;
  const at = (ts) => ((ts - win.from) / span) * 100;
  const todayPct = at(win.today);
  const inWindow = todayPct >= 0 && todayPct <= 100;
  const LABEL = 190;
  const TAIL = 46;

  const track = (p) => {
    const start = Date.parse(p.startDate);
    const end = Date.parse(p.endDate);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return '<span class="muted" style="font-size:0.8rem;">no dates</span>';
    const left = at(start);
    const width = Math.max(1, at(end) - left);
    const fill = HEALTH_FILL[HEALTH_TONE[p.health]] || SERIES;
    return `<div title="${esc(p.name)} — ${esc(p.startDate)} to ${esc(p.endDate)}, ${pc(p.progress)} complete"
        style="position:absolute;left:${left}%;width:${width}%;top:1px;height:16px;background:${TRACK};border-radius:3px;overflow:hidden;">
        <div style="width:${Math.min(100, p.progress)}%;height:100%;background:${fill};border-radius:3px 0 0 3px;"></div>
      </div>`;
  };

  const rows = projects
    .map(
      (p) => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:9px;">
        <div style="flex:0 0 ${LABEL}px;min-width:0;">
          <b>${esc(p.code)}</b>
          <div class="muted" style="font-size:0.76rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.name)}</div>
        </div>
        <div style="flex:1 1 auto;position:relative;height:18px;min-width:140px;">${track(p)}</div>
        <div class="muted" style="flex:0 0 ${TAIL}px;text-align:right;font-size:0.82rem;">${pc(p.progress)}</div>
      </div>`
    )
    .join("");

  // The rule spans the whole stack, inset by exactly the label and tail columns.
  const todayRule = inWindow
    ? `<div aria-hidden="true" title="Today"
         style="position:absolute;top:0;bottom:0;left:calc(${LABEL}px + 12px + (100% - ${LABEL + TAIL}px - 24px) * ${todayPct / 100});width:2px;background:var(--danger);opacity:0.55;pointer-events:none;"></div>`
    : "";

  return `<div style="position:relative;">${rows}${todayRule}</div>
    <p class="muted" style="font-size:0.8rem;margin-top:6px;">${new Date(win.from).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} — ${new Date(win.to).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}. Fill is progress against the project's own bar; the red rule is today.</p>`;
}

/** Monthly progress trend — an honest empty state until there are two points. */
function trendChart(series, note) {
  if (note) {
    return `<p class="empty-note">${esc(note)}</p>`;
  }
  const w = 720;
  const h = 180;
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const xs = (i) => pad.l + (i / Math.max(1, series.length - 1)) * (w - pad.l - pad.r);
  const ys = (v) => pad.t + (1 - v / 100) * (h - pad.t - pad.b);
  const line = series.map((s, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(s.avgProgress).toFixed(1)}`).join(" ");
  const grid = [0, 25, 50, 75, 100]
    .map(
      (v) => `<line x1="${pad.l}" y1="${ys(v)}" x2="${w - pad.r}" y2="${ys(v)}" stroke="${TRACK}" stroke-width="1"/>
        <text x="${pad.l - 6}" y="${ys(v) + 3}" text-anchor="end" font-size="10" fill="var(--slate-light)">${v}</text>`
    )
    .join("");
  const dots = series
    .map(
      (s, i) => `<circle cx="${xs(i)}" cy="${ys(s.avgProgress)}" r="4" fill="${SERIES}"><title>${esc(monthLabel(s.month))}: ${s.avgProgress}% average progress across ${s.projects} project${s.projects === 1 ? "" : "s"}</title></circle>`
    )
    .join("");
  const labels = series
    .map((s, i) =>
      i === 0 || i === series.length - 1 || series.length <= 6
        ? `<text x="${xs(i)}" y="${h - 8}" text-anchor="middle" font-size="10" fill="var(--slate-light)">${esc(monthLabel(s.month))}</text>`
        : ""
    )
    .join("");
  const last = series[series.length - 1];
  return `<div style="overflow-x:auto;">
      <svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;" role="img"
        aria-label="Average portfolio progress by month, ending at ${last.avgProgress}%">
        ${grid}
        <path d="${line}" fill="none" stroke="${SERIES}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}${labels}
      </svg>
    </div>
    <p class="muted" style="font-size:0.8rem;">Average percent complete across the portfolio, one point per calendar month. Latest: <b>${last.avgProgress}%</b> across ${last.projects} project${last.projects === 1 ? "" : "s"}.</p>`;
}


/** Resource workload — the ninth panel, live only once real capacity exists. */
async function workloadPanel() {
  const d = await api("/api/veryx/resources");
  const w = d.workload;

  if (w.setupNote) {
    return `<p class="empty-note">${esc(w.setupNote)}</p>`;
  }

  const max = Math.max(...w.departments.map((x) => Math.max(x.capacity, x.allocated)), 1);
  const bars = w.departments
    .map((x) => {
      const fill = x.over ? HEALTH_FILL.critical : x.utilisation >= 85 ? HEALTH_FILL.warning : SERIES;
      return `<tr>
      <td style="white-space:nowrap;"><b>${esc(x.department)}</b><div class="muted" style="font-size:0.76rem;">${x.people} ${x.people === 1 ? "person" : "people"}</div></td>
      <td style="width:100%;">
        <div title="${esc(x.department)}: ${x.allocated} of ${x.capacity} hours a month allocated" style="position:relative;background:${TRACK};height:18px;border-radius:3px;overflow:hidden;">
          <div style="width:${Math.min(100, (x.allocated / max) * 100)}%;height:100%;background:${fill};border-radius:3px 0 0 3px;"></div>
          <div aria-hidden="true" style="position:absolute;top:0;left:${Math.min(100, (x.capacity / max) * 100)}%;width:2px;height:100%;background:var(--ink);opacity:0.55;"></div>
        </div>
      </td>
      <td class="muted" style="white-space:nowrap;font-size:0.82rem;">${x.allocated} / ${x.capacity} h · <b>${Math.round(x.utilisation)}%</b>${x.over ? ' <span class="pill alert" style="font-size:0.68rem;">over</span>' : ""}</td>
    </tr>`;
    })
    .join("");

  const allocTable = d.allocations.length
    ? wrapT2(`<table><thead><tr><th>Person</th><th>Department</th><th>Project</th><th>Hours / month</th><th>Note</th><th></th></tr></thead><tbody>${d.allocations
        .map(
          (a) => `<tr${a.valid ? "" : ' style="opacity:0.6;"'}>
        <td><b>${esc(a.person)}</b></td>
        <td class="muted">${esc(a.department || "—")}</td>
        <td>${esc(a.project)}<div class="muted" style="font-size:0.76rem;">${esc(a.projectName)}</div></td>
        <td><b>${a.hours}</b></td>
        <td class="muted">${esc(a.note || "—")}</td>
        <td><button class="btn-run" data-alloc-del="${a.id}">Release</button></td>
      </tr>`
        )
        .join("")}</tbody></table>`)
    : '<p class="empty-note">No hours allocated yet.</p>';

  const form = `<form id="alloc-form" class="team-form" style="flex-wrap:wrap;">
      <select name="userId" required><option value="">Person…</option>${d.people
        .filter((p) => p.hasCapacity)
        .map((p) => `<option value="${p.id}">${esc(p.name)} · ${esc(p.department)} (${p.capacityHours}h)</option>`)
        .join("")}</select>
      <select name="projectId" required><option value="">Project…</option>${d.projects
        .map((p) => `<option value="${p.id}">${esc(p.code)} — ${esc(p.name)}</option>`)
        .join("")}</select>
      <input name="hours" type="number" min="1" max="400" required placeholder="Hours / month" style="width:140px;">
      <input name="note" placeholder="Note (optional)">
      <button class="btn-block" type="submit" style="width:auto;padding:12px 20px;">Allocate</button>
    </form>
    <p class="muted" style="font-size:0.8rem;margin-top:8px;">Allocating the same person to the same project again replaces the previous figure rather than adding to it.</p>`;

  const caveats = [];
  if (w.totals.peopleUnrecorded) {
    caveats.push(
      `<b>${w.totals.peopleUnrecorded}</b> active ${w.totals.peopleUnrecorded === 1 ? "employee has" : "employees have"} no department or monthly capacity recorded and are not counted: ${w.unrecorded.map((u) => esc(u.name)).join(", ")}. Set both in <b>Team</b>.`
    );
  }
  if (w.orphaned.length) {
    caveats.push(`<b>${w.orphaned.length}</b> allocation${w.orphaned.length === 1 ? "" : "s"} could not be counted — ${esc(w.orphaned[0].reason)}.`);
  }

  return (
    `<p class="muted" style="font-size:0.82rem;margin:0 0 12px;">Hours allocated against hours available, by department. The bar is allocated; the vertical rule is that department's capacity. Amber from 85%, red past capacity.</p>` +
    wrapT2(`<table><tbody>${bars}</tbody></table>`) +
    (caveats.length ? `<p class="muted" style="font-size:0.8rem;margin-top:10px;">${caveats.join("<br>")}</p>` : "") +
    `<div style="margin-top:18px;"><b style="font-size:0.9rem;">Allocations</b></div>` +
    allocTable +
    form
  );
}

const wrapT2 = (t) => `<div class="table-wrap">${t}</div>`;

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#alloc-form");
  if (!form) return;
  e.preventDefault();
  const body = Object.fromEntries([...form.querySelectorAll("[name]")].map((i) => [i.name, i.value]));
  try {
    await api("/api/veryx/resources/allocations", { method: "POST", body: JSON.stringify(body) });
    loaded.delete("veryx");
    await loadVeryx();
    loaded.add("veryx");
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("click", async (e) => {
  const del = e.target.closest("button[data-alloc-del]");
  if (!del) return;
  try {
    await api(`/api/veryx/resources/allocations/${del.dataset.allocDel}`, { method: "DELETE" });
    loaded.delete("veryx");
    await loadVeryx();
    loaded.add("veryx");
  } catch (err) {
    alert(err.message);
  }
});

async function loadPortfolio() {
  const d = await api("/api/veryx/portfolio");
  const k = d.kpis;

  const kpis = `<div class="kpis">
    <div class="kpi accent"><b>${k.total}</b><span>Live projects</span></div>
    <div class="kpi green"><b>${k.onTrack}</b><span>On track</span></div>
    <div class="kpi"><b>${k.atRisk}</b><span>At risk</span></div>
    <div class="kpi"><b>${k.delayed}</b><span>Delayed</span></div>
    <div class="kpi"><b>${shortMoney(k.portfolioValue)}</b><span>Portfolio value</span></div>
    <div class="kpi"><b>${shortMoney(k.spent)}</b><span>Spent · ${k.spentPct}% of budget</span></div>
  </div>`;

  const table = `<table>
    <thead><tr><th>Project</th><th>Client</th><th>Manager</th><th>Programme</th><th>Progress</th><th>SPI</th><th>CPI</th><th>Budget</th><th>Health</th></tr></thead>
    <tbody>${d.projects
      .map(
        (p) => `<tr>
        <td><b>${esc(p.code)}</b><div class="muted brief">${esc(p.name)}</div></td>
        <td class="muted">${esc(p.client || "—")}<div class="muted" style="font-size:0.76rem;">${esc(p.sector || "")}</div></td>
        <td class="muted">${esc(p.manager || "—")}</td>
        <td class="muted" style="white-space:nowrap;font-size:0.82rem;">${esc(p.startDate || "—")}<br>${esc(p.endDate || "—")}</td>
        <td><div title="${pc(p.progress)} complete, ${pc(p.elapsedPct)} of programme elapsed" style="background:${TRACK};height:8px;border-radius:2px;min-width:60px;">
            <div style="width:${Math.min(100, p.progress)}%;height:100%;background:${SERIES};border-radius:2px;"></div></div>
          <span class="muted" style="font-size:0.78rem;">${pc(p.progress)}</span></td>
        <td><b>${p.spi === null ? "—" : p.spi.toFixed(2)}</b></td>
        <td><b>${p.cpi === null ? "—" : p.cpi.toFixed(2)}</b></td>
        <td class="muted" style="white-space:nowrap;font-size:0.82rem;">${shortMoney(p.budget.spent)} / ${shortMoney(p.budget.budgeted)}</td>
        <td style="min-width:190px;">
          <span class="pill" style="background:${HEALTH_FILL[HEALTH_TONE[p.health]]}1f;color:${HEALTH_FILL[HEALTH_TONE[p.health]]};">${esc(p.health.replace(/_/g, " "))}</span>
          ${p.overridden ? '<span class="pill" style="font-size:0.66rem;">set by hand</span>' : ""}
          <div class="muted" style="font-size:0.74rem;margin-top:3px;">${esc(p.overridden ? p.ragReason : p.reason)}</div>
          ${
            p.overridden
              ? `<div class="muted" style="font-size:0.72rem;margin-top:2px;">Measured: <b>${esc(p.derivedHealth.replace(/_/g, " "))}</b> — ${esc(p.derivedReason)}${p.ragSetBy ? ` · ${esc(p.ragSetBy)}, ${when(p.ragSetAt)}` : ""}</div>`
              : ""
          }
          <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">
            <select data-rag="${p.id}" title="Override the measured status" style="font-size:0.76rem;padding:3px 5px;">
              <option value="">Measured (${esc(p.derivedHealth.replace(/_/g, " "))})</option>
              ${RAG_OPTIONS.map((o) => `<option value="${o}" ${p.ragOverride === o ? "selected" : ""}>${esc(o.replace(/_/g, " "))}</option>`).join("")}
            </select>
            <input data-rag-reason="${p.id}" placeholder="Reason" value="${esc(p.ragReason)}" style="font-size:0.76rem;padding:3px 5px;width:110px;">
          </div>
        </td>
      </tr>`
      )
      .join("")}</tbody></table>`;

  const i = d.issues;
  const issues = `<table><tbody>
    <tr><td><span class="pill alert">High risks</span></td><td><b>${i.highRisks}</b></td><td class="muted">Open risks scoring 16 or above — immediate management attention.</td></tr>
    <tr><td><span class="pill warning">Medium risks</span></td><td><b>${i.mediumRisks}</b></td><td class="muted">Score 8–15, monitored and mitigated.</td></tr>
    <tr><td><span class="pill">Low risks</span></td><td><b>${i.lowRisks}</b></td><td class="muted">Score below 8.</td></tr>
    <tr><td><span class="pill alert">Major NCRs</span></td><td><b>${i.majorNcrs}</b></td><td class="muted">Open non-conformances graded major (${i.openNcrs} open in total).</td></tr>
    <tr><td><span class="pill">Open RFIs</span></td><td><b>${i.openRfis}</b></td><td class="muted">Awaiting an answer across the portfolio.</td></tr>
  </tbody></table>`;

  const ms = d.milestones.length
    ? `<table><thead><tr><th>Activity</th><th>Project</th><th>Phase</th><th>Due</th><th>Progress</th><th>State</th></tr></thead><tbody>${d.milestones
        .map(
          (m) => `<tr>
        <td><b>${esc(m.activity)}</b>${m.critical ? ' <span class="pill alert" style="font-size:0.68rem;">critical path</span>' : ""}</td>
        <td class="muted">${esc(m.projectCode)}</td>
        <td class="muted">${esc(m.phase || "—")}</td>
        <td class="muted" style="white-space:nowrap;">${esc(m.end || "—")}<div style="font-size:0.76rem;">${m.daysToEnd === null ? "" : m.daysToEnd < 0 ? `${Math.abs(m.daysToEnd)}d overdue` : `${m.daysToEnd}d`}</div></td>
        <td>${pc(m.progress)}</td>
        <td><span class="pill" style="background:${HEALTH_FILL[HEALTH_TONE[m.state]]}1f;color:${HEALTH_FILL[HEALTH_TONE[m.state]]};">${esc(m.state.replace(/_/g, " "))}</span></td>
      </tr>`
        )
        .join("")}</tbody></table>`
    : '<p class="empty-note">No schedule activities recorded yet.</p>';

  return (
    kpis +
    `<p class="muted" style="font-size:0.82rem;margin:-6px 0 16px;">Health is measured, not typed. <b>SPI</b> is progress against programme elapsed, <b>CPI</b> is progress against budget consumed; below ${d.thresholds.spiWarn} is at risk and below ${d.thresholds.spiLate} is delayed — the same thresholds the EVM payment gate enforces in the Commercial OS. A dash means the project has no dates or no budget lines to measure against. You can <b>override</b> a project's status where the indices do not know the whole story; an override needs a reason and always shows what it overrode.</p>` +
    block("Portfolio health", healthBar(d.health, k.total)) +
    block("Projects", table) +
    block("Budget against actual", budgetMeters(d.projects)) +
    block("Portfolio timeline", timeline(d.projects, d.window)) +
    block("Projects by sector", sectorBars(d.sectors)) +
    block("Critical path & imminent activities", ms) +
    block("Risks & issues", issues) +
    block("Monthly progress trend", trendChart(d.trend, d.trendNote)) +
    block("Resource workload by department", await workloadPanel())
  );
}


/* RAG override — set from the portfolio table. Changing the select with
   no reason typed focuses the reason box rather than silently failing,
   because the server requires one. */
document.addEventListener("change", async (e) => {
  const sel = e.target.closest("select[data-rag]");
  if (!sel) return;
  const id = sel.dataset.rag;
  const reasonEl = document.querySelector(`input[data-rag-reason="${id}"]`);
  const reason = (reasonEl?.value || "").trim();
  if (sel.value && reason.length < 5) {
    alert("Give a reason for overriding the measured status — it is recorded against the project.");
    reasonEl?.focus();
    return;
  }
  try {
    await api(`/api/construx/projects/${id}/rag`, {
      method: "PATCH",
      body: JSON.stringify({ rag: sel.value, reason }),
    });
    loaded.delete("veryx");
    await loadVeryx();
    loaded.add("veryx");
  } catch (err) {
    alert(err.message);
  }
});

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

  let portfolioHtml = "";
  try {
    portfolioHtml = await loadPortfolio();
  } catch (err) {
    portfolioHtml = `<p class="error-note">Portfolio dashboard unavailable: ${esc(err.message)}</p>`;
  }

  document.getElementById("veryx-body").innerHTML =
    portfolioHtml +
    `<p style="margin:22px 0 14px;">${sourceBadge(riskRes.source)}</p>` +
    kpis +
    block("Risk register — highest exposure first", risks) +
    block("AI agent console", agents) +
    block("Recent agent runs", runs) +
    block("Platform API keys", keys);
}

document.addEventListener("click", async (e) => {
  // Only the VERYX "Run now" buttons — .btn-run is a shared style class
  // used by many other actions, which must never trigger an agent run.
  const btn = e.target.closest("button[data-agent]");
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = "Running…";
  try {
    await api(`/api/veryx/agents/${encodeURIComponent(btn.dataset.agent)}/run`, { method: "POST" });
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
    // Multi-service registrations store "A; B; C" — match on containment.
    if (f.capability && !(s.capability || "").includes(f.capability)) return false;
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
  loadPayments().catch(() => {
    // Role without finance access: hide the payments block quietly.
    const block = document.getElementById("payments-block");
    if (block) block.style.display = "none";
  });
  loadEngagements().catch(() => {
    const block = document.getElementById("engagements-block");
    if (block) block.style.display = "none";
  });
}

// ---------- Enquiries & orders (NDA → quote → PO) ----------

let engRows = [];

const ENG_LABEL = { sent: "sent", nda_accepted: "NDA accepted", quoted: "QUOTED — decide", po_issued: "PO issued", declined: "declined" };

function renderEngagements() {
  const tbody = document.querySelector("#engagements-table tbody");
  if (!tbody) return;
  tbody.innerHTML = engRows.length
    ? engRows.map((e) => `<tr>
        <td><b>${esc(e.title)}</b><div class="muted">${esc(e.project)}${e.documents?.length ? ` · ${e.documents.length} doc(s)` : ""}</div></td>
        <td>${esc(e.supplier)}${e.supplierOnboarded ? "" : '<div class="muted" style="font-size:0.75rem;">not onboarded yet</div>'}</td>
        <td>${esc(e.returnBy)}</td>
        <td>${e.ndaRequired ? (e.nda ? `<span class="pill approved" title="Accepted by ${esc(e.nda.name)} (${esc(e.nda.position)}) on ${when(e.nda.at)}">signed</span>` : '<span class="pill">pending</span>') : '<span class="muted">n/a</span>'}</td>
        <td>${e.quote ? `<b>${money(e.quote.sum)}</b><div class="muted" style="font-size:0.75rem;">${esc(e.quote.programme)}</div>` : "—"}</td>
        <td><span class="pill ${e.status === "po_issued" ? "approved" : e.status === "quoted" ? "critical" : e.status === "declined" ? "declined" : ""}">${esc(ENG_LABEL[e.status] || e.status)}</span>${e.poNumber ? `<div class="muted" style="font-size:0.75rem;">${esc(e.poNumber)} · ${money(e.agreedSum)}</div>` : ""}</td>
        <td>${e.status === "quoted" ? `<button class="btn-run" data-eng-accept="${e.id}">Accept → PO</button> <button class="btn-run" data-eng-decline="${e.id}">Decline</button>` : ""}
            ${user.role === "admin" ? `<button class="btn-run" data-eng-del="${e.id}">Delete</button>` : ""}</td>
      </tr>`).join("")
    : '<tr><td colspan="7" class="empty-note">No enquiries yet — send the first one above.</td></tr>';
}

async function loadEngagements() {
  const { engagements } = await api("/api/engagements");
  engRows = engagements;
  const sel = document.getElementById("eng-supplier");
  if (sel) {
    const usable = supplierRows.filter((s) => ["prequalified", "approved"].includes(s.status));
    sel.innerHTML = '<option value="">Select supplier…</option>' +
      usable.map((s) => `<option value="${s.id}">${esc(s.legalName)} — ${esc((s.capability || "").split(";")[0])}</option>`).join("");
  }
  renderEngagements();
}

document.getElementById("eng-ai")?.addEventListener("click", async () => {
  const btn = document.getElementById("eng-ai");
  const scope = document.getElementById("eng-scope");
  btn.disabled = true;
  btn.textContent = "Agent drafting…";
  try {
    const { draft } = await api("/api/engagements/draft-scope", {
      method: "POST",
      body: JSON.stringify({
        title: document.getElementById("eng-title").value,
        project: document.getElementById("eng-project").value,
        brief: scope.value,
      }),
    });
    scope.value = draft.scope;
    scope.style.minHeight = "260px";
    alert("Detailed scope drafted from your brief — review and edit it before sending. Nothing goes to the supplier unreviewed.");
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "🤖 Expand into a detailed scope of works";
  }
});

document.getElementById("eng-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Sending…";
  try {
    const fd = new FormData();
    fd.set("supplierId", document.getElementById("eng-supplier").value);
    fd.set("title", document.getElementById("eng-title").value);
    fd.set("project", document.getElementById("eng-project").value);
    fd.set("scope", document.getElementById("eng-scope").value);
    fd.set("returnBy", document.getElementById("eng-return").value);
    fd.set("ndaRequired", document.getElementById("eng-nda").checked ? "true" : "false");
    for (const f of document.getElementById("eng-files").files) fd.append("documents", f);
    const res = await fetch("/api/engagements", { method: "POST", body: fd, headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Send failed.");
    e.target.reset();
    await loadEngagements();
    refreshBell();
    alert("Enquiry sent — the supplier prices it in their portal.");
  } catch (err) { alert(err.message); } finally { btn.disabled = false; btn.textContent = "Send enquiry"; }
});

document.addEventListener("click", async (e) => {
  const accept = e.target.closest("button[data-eng-accept]");
  const decline = e.target.closest("button[data-eng-decline]");
  const del = e.target.closest("button[data-eng-del]");
  if (!accept && !decline && !del) return;
  try {
    if (del) {
      if (!confirm("Delete this engagement permanently?")) return;
      await api(`/api/engagements/${del.dataset.engDel}`, { method: "DELETE" });
    } else if (decline) {
      const note = prompt("Feedback to the supplier (optional — sent with the outcome):") ?? "";
      await api(`/api/engagements/${decline.dataset.engDecline}/decision`, { method: "POST", body: JSON.stringify({ action: "decline", note }) });
    } else {
      const row = engRows.find((x) => x.id === accept.dataset.engAccept);
      const sum = prompt("Agreed sum (£, excl. VAT) — accepting issues the purchase order that forms the contract:", row?.quote?.sum ?? "");
      if (sum === null) return;
      const { poNumber } = await api(`/api/engagements/${accept.dataset.engAccept}/decision`, { method: "POST", body: JSON.stringify({ action: "accept", agreedSum: Number(sum) }) });
      alert(`${poNumber} issued and emailed to the supplier. The formal document is in the Commercial Playbook document register.`);
    }
    await loadEngagements();
    refreshBell();
  } catch (err) { alert(err.message); }
});

// ---------- Applications for payment (supplier portal → certify → pay) ----------

let payRows = [];

function renderPayments() {
  const tbody = document.querySelector("#payments-table tbody");
  if (!tbody) return;
  tbody.innerHTML = payRows.length
    ? payRows.map((p) => `<tr>
        <td><b>${esc(p.number)}</b>${p.documents?.length ? `<div class="muted" style="font-size:0.75rem;">${p.documents.length} evidence file(s)</div>` : ""}</td>
        <td>${esc(p.supplier)}
            <div style="margin-top:3px;"><span class="pill ${p.bankVerified ? "approved" : "critical"}" title="${p.bankVerified ? "Account verified by call-back" : "Payment blocked until a named person verifies the account by call-back"}">${p.bankVerified ? "bank verified" : "VERIFY BANK"}</span></div></td>
        <td>${esc(p.period)}<div class="muted">${esc(p.poRef)}</div></td>
        <td>${money(p.claimed)}</td>
        <td>${p.certified == null ? "—" : `${money(p.certified)} → <b>${money(p.netPayable)}</b><div class="muted" style="font-size:0.75rem;">ret ${money(p.retention)}${p.cisDeduction ? " · CIS " + money(p.cisDeduction) : ""}</div>`}</td>
        <td style="min-width:150px;">
          <div>${when(p.paymentDueDate)}</div>
          <div class="muted" style="font-size:0.74rem;">final ${when(p.finalDateForPayment)}</div>
          ${
            p.notice?.severity
              ? p.notice.items
                  .map(
                    (n) =>
                      `<div class="pill ${n.severity === "critical" ? "alert" : "warning"}" style="margin-top:4px;display:inline-block;" title="${esc(n.detail)}">${esc(n.label)}</div>`
                  )
                  .join("")
              : ""
          }
        </td>
        <td><span class="pill ${p.status === "paid" ? "approved" : p.status === "certified" ? "prequalified" : ""}">${esc(p.status)}</span></td>
        <td>
          ${p.status === "received" ? `<button class="btn-run" data-pay-certify="${p.id}">Certify</button>` : ""}
          ${p.status === "certified" ? `<button class="btn-run" data-pay-paid="${p.id}">Mark paid</button>` : ""}
          <button class="btn-run" data-pay-account="${p.supplierId}" title="Payment structure on file — full details, for call-back verification">${p.bankVerified ? "Account" : "Verify account"}</button>
          ${user.role === "admin" ? `<button class="btn-run" data-pay-del="${p.id}" title="Admin: permanently remove this application and its evidence files — for test records and errors only; a real paid application is the audit trail">Delete</button>` : ""}
        </td>
      </tr>`).join("")
    : '<tr><td colspan="8" class="empty-note">No applications for payment yet. Suppliers raise them in their portal once onboarded — use “Onboard” on an approved or prequalified registration.</td></tr>';
}

async function loadPayments() {
  const { applications, kpis } = await api("/api/payments");
  payRows = applications;
  const k = document.getElementById("pay-kpis");
  if (k) {
    const notices = kpis.noticesCritical
      ? ` · ⚠ ${kpis.noticesCritical} notice deadline${kpis.noticesCritical === 1 ? "" : "s"} passed`
      : kpis.noticesDue
        ? ` · ${kpis.noticesDue} notice deadline${kpis.noticesDue === 1 ? "" : "s"} within 3 days`
        : "";
    k.textContent = `· ${kpis.open} open (${money(kpis.openValue)}) · certified awaiting payment ${money(kpis.certifiedUnpaid)}${notices}`;
  }
  renderPayments();
}

document.addEventListener("click", async (e) => {
  const certify = e.target.closest("button[data-pay-certify]");
  const paid = e.target.closest("button[data-pay-paid]");
  const account = e.target.closest("button[data-pay-account]");
  const payDel = e.target.closest("button[data-pay-del]");
  if (!certify && !paid && !account && !payDel) return;

  if (payDel) {
    const row = payRows.find((x) => x.id === payDel.dataset.payDel);
    if (!confirm(`Permanently delete ${row?.number || "this application"} and its evidence files? A real paid application is your audit trail — delete test records and errors only.`)) return;
    payDel.disabled = true;
    try {
      await api(`/api/payments/${payDel.dataset.payDel}`, { method: "DELETE" });
      await loadPayments();
    } catch (err) { alert(err.message); payDel.disabled = false; }
    return;
  }

  if (account) {
    account.disabled = true;
    try {
      const a = await api(`/api/payments/suppliers/${account.dataset.payAccount}/account`);
      const ans = a.answers;
      const detail = [
        `PAYMENT STRUCTURE — ${a.company}`,
        `Bank: ${ans.bank_name}`,
        `Account name: ${ans.bank_account_name}`,
        `Sort code: ${ans.bank_sort} · Account: ${ans.bank_account}`,
        `Remittance email: ${ans.remit_email}`,
        `CIS: ${ans.cis_status}${ans.cis_utr ? ` · UTR ${ans.cis_utr}` : ""} · VAT ${ans.vat_number}`,
        `Director call-back contact: ${ans.director_contact}`,
        ``,
        a.bankVerified
          ? `VERIFIED by ${a.bankVerifiedBy} on ${when(a.bankVerifiedAt)}.`
          : `NOT VERIFIED. Call the director contact above, confirm the account details verbally, then confirm below.`,
      ].join("\n");
      if (a.bankVerified) {
        alert(detail);
      } else if (confirm(`${detail}\n\nHas the call-back been completed and the details confirmed by the director contact? OK = verified.`)) {
        await api(`/api/payments/suppliers/${account.dataset.payAccount}/verify-bank`, { method: "POST", body: JSON.stringify({ calledBack: true }) });
        await load();
        await loadPayments().catch(() => {});
        alert("Account verified — payments to this supplier are now unblocked.");
      }
    } catch (err) { alert(err.message); } finally { account.disabled = false; }
    return;
  }

  if (paid) {
    const ref = prompt("Bank payment reference (from your banking, optional):") ?? "";
    paid.disabled = true;
    try {
      await api(`/api/payments/${paid.dataset.payPaid}/paid`, { method: "POST", body: JSON.stringify({ paymentRef: ref }) });
      await loadPayments();
      refreshBell();
      alert("Marked paid — remittance emailed to the supplier.");
    } catch (err) { alert(err.message); paid.disabled = false; }
    return;
  }

  // Certify: inline form under the table.
  const p = payRows.find((x) => x.id === certify.dataset.payCertify);
  if (!p) return;
  const holder = document.getElementById("pay-holder");
  holder.innerHTML = `<div class="section-block" style="border:1.5px solid var(--amber,#9c7a3c);border-radius:10px;padding:18px 22px;margin-top:14px;">
    <h3>Certify ${esc(p.number)} — ${esc(p.supplier)}</h3>
    <p class="muted" style="margin:4px 0 10px;">Applied for <b>${money(p.claimed)}</b> · period ${esc(p.period)} · order ${esc(p.poRef)}. Evidence: ${p.documents?.length ? p.documents.map((d) => esc(d.name)).join(", ") : "none uploaded"}.</p>
    <p class="muted" style="font-size:0.83rem;margin-bottom:10px;">${esc(p.description || "")}</p>
    <div class="team-form" style="margin-bottom:10px;">
      <input id="pc-certified" type="number" step="0.01" min="0" value="${p.claimed}" placeholder="Certified sum (£)">
      <input id="pc-cis" type="number" step="0.01" min="0" placeholder="CIS deduction (£, labour at verified rate)">
    </div>
    <textarea id="pc-reasons" placeholder="Basis of certification — REQUIRED if certifying less than claimed; this wording goes to the supplier as the payment/pay-less notice." style="width:100%;min-height:70px;padding:10px 12px;border:1.5px solid var(--line);border-radius:7px;font-family:inherit;font-size:0.9rem;"></textarea>
    <p class="muted" style="font-size:0.8rem;margin-top:8px;">Retention is computed automatically: 5% of the certified sum, capped at 5% of order value in the retention ledger.</p>
    <div style="margin-top:10px;">
      <button class="btn-block" id="pc-submit" style="width:auto;padding:12px 24px;">Certify &amp; issue payment notice</button>
      <button class="btn-run" id="pc-cancel" style="margin-left:8px;">Cancel</button>
    </div>
  </div>`;
  document.getElementById("pc-cancel").addEventListener("click", () => (holder.innerHTML = ""));
  document.getElementById("pc-submit").addEventListener("click", async () => {
    const btn = document.getElementById("pc-submit");
    btn.disabled = true;
    try {
      await api(`/api/payments/${p.id}/certify`, {
        method: "POST",
        body: JSON.stringify({
          certified: Number(document.getElementById("pc-certified").value),
          cisDeduction: Number(document.getElementById("pc-cis").value) || 0,
          reasons: document.getElementById("pc-reasons").value,
        }),
      });
      holder.innerHTML = "";
      await loadPayments();
      refreshBell();
      alert("Certified — payment notice emailed to the supplier and the retention ledger updated.");
    } catch (err) { alert(err.message); btn.disabled = false; }
  });
  holder.scrollIntoView({ behavior: "smooth", block: "start" });
});

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

/* ---------- Platform API keys, and webhooks both ways (admin only) ----------
 *
 * These three panels exist because the routes behind them were otherwise
 * unreachable from the product. A write scope nobody can mint a key for is a
 * permission that does not exist; an inbound secret nobody can rotate is a
 * secret that never changes; and a delivery log nobody can read turns a
 * failed push into a silence.
 */

const fmtWhen = (t) => (t ? new Date(t).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

/** A secret is shown once. It is rendered to be copied, and never re-fetched. */
function showOnce(el, label, secret, warning) {
  el.innerHTML = `<div class="section-block" style="border:1.5px solid var(--accent);border-radius:10px;padding:14px 16px;margin:12px 0;">
    <b>${esc(label)}</b>
    <p style="font-family:var(--font-mono,monospace);word-break:break-all;margin:8px 0;user-select:all;">${esc(secret)}</p>
    <p class="muted" style="margin:0;">${esc(warning)}</p>
  </div>`;
}

async function loadKeys() {
  const [{ scopes }, usage] = await Promise.all([
    api("/api/veryx/keys/scopes"),
    api("/api/veryx/usage"),
  ]);
  document.getElementById("key-scopes").innerHTML = scopes
    .map((s) => `<label class="muted" title="${esc(s.does)}">
      <input type="checkbox" name="scopes" value="${esc(s.scope)}">
      <code>${esc(s.scope)}</code>${s.writes ? ' <span class="pill declined" style="padding:1px 6px;">write</span>' : ""}
    </label>`)
    .join("");

  const keys = usage.keys || [];
  document.getElementById("keys-body").innerHTML = keys.length
    ? `<div class="table-wrap"><table><thead><tr><th>Key</th><th>Workspace</th><th>Env</th><th>Scopes</th><th>Calls</th><th>ACU</th><th></th></tr></thead><tbody>${keys
        .map((k) => `<tr${k.revoked ? ' class="muted"' : ""}>
          <td><code>${esc(k.keyPreview || "—")}</code></td>
          <td>${esc(k.workspace || "—")}</td>
          <td>${esc(k.env || "—")}</td>
          <td>${(k.scopes || []).length ? (k.scopes || []).map((sc) => `<code>${esc(sc)}</code>`).join(" ") : "<i>none</i>"}</td>
          <td>${k.used ?? 0} / ${k.monthlyQuota ?? "—"}</td>
          <td>${k.acuBalance ?? 0}</td>
          <td>${k.revoked ? '<span class="pill declined">Revoked</span>'
            : k.id && k.id !== "live" ? `<button class="btn-run" data-revoke-key="${esc(k.id)}" style="padding:4px 10px;">Revoke</button>` : ""}</td>
        </tr>`)
        .join("")}</tbody></table></div>`
    : `<p class="empty-note">No keys minted. The Platform API is unreachable until one is.</p>`;
}

document.getElementById("key-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector("button");
  btn.disabled = true;
  try {
    const scopes = [...f.querySelectorAll('input[name="scopes"]:checked')].map((i) => i.value);
    const out = await api("/api/veryx/keys", {
      method: "POST",
      body: JSON.stringify({
        workspace: f.workspace.value, env: f.env.value,
        monthlyQuota: Number(f.monthlyQuota.value), acuBalance: Number(f.acuBalance.value),
        scopes, reason: f.reason.value,
      }),
    });
    showOnce(document.getElementById("key-result"), `Key for ${f.workspace.value}`, out.key, out.keyWarning);
    f.reset();
    await loadKeys();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
});

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-revoke-key]");
  if (!b) return;
  if (!confirm("Revoke this key? Any system using it stops working immediately. The row is kept so the usage it accrued stays readable.")) return;
  b.disabled = true;
  try {
    await api(`/api/veryx/keys/${b.dataset.revokeKey}`, { method: "DELETE" });
    await loadKeys();
  } catch (err) {
    alert(err.message);
    b.disabled = false;
  }
});

async function loadWebhooks() {
  const w = await api("/api/webhooks");

  document.getElementById("hook-events").innerHTML = w.events
    .map((ev) => `<label class="muted">
      <input type="checkbox" name="events" value="${esc(ev)}"> <code>${esc(ev)}</code>
    </label>`)
    .join("");

  const subs = w.subscriptions || [];
  document.getElementById("hooks-body").innerHTML = subs.length
    ? `<div class="table-wrap"><table><thead><tr><th>Endpoint</th><th>Events</th><th>Added by</th><th>Last delivery</th><th>Failures</th><th>State</th><th></th></tr></thead><tbody>${subs
        .map((s) => `<tr${s.active ? "" : ' class="muted"'}>
          <td style="word-break:break-all;">${esc(s.url)}${s.description ? `<br><span class="muted">${esc(s.description)}</span>` : ""}</td>
          <td>${(s.events || []).map((ev) => `<code>${esc(ev)}</code>`).join(" ")}</td>
          <td>${esc(s.createdBy || "—")}</td>
          <td>${fmtWhen(s.lastDeliveryAt)}${s.lastStatus ? `<br><span class="muted">${esc(String(s.lastStatus))}</span>` : ""}</td>
          <td>${s.failures || 0} / ${w.failureLimit}</td>
          <td>${s.active ? '<span class="pill approved">Active</span>' : '<span class="pill declined">Stopped</span>'}</td>
          <td>${s.active ? `<button class="btn-run" data-unhook="${esc(s.id)}" style="padding:4px 10px;">Stop</button>` : ""}</td>
        </tr>`)
        .join("")}</tbody></table></div>`
    : `<p class="empty-note">Nobody is subscribed. Every event this system emits is going nowhere, which is the correct state until somebody asks for one.</p>`;

  document.getElementById("inbound-body").innerHTML = `
    <p><b>Endpoint</b> <code>POST ${esc(location.origin)}/api/webhooks/inbound</code></p>
    <p><b>Secret</b> ${w.inboundSecretConfigured
      ? '<span class="pill approved">Configured</span> <span class="muted">— shown once when minted; rotate below to replace it.</span>'
      : '<span class="pill">Not configured</span> <span class="muted">— until one exists, every inbound delivery is refused, because nothing can be verified.</span>'}</p>
    <p><b>Replay window</b> ${w.replayWindowSeconds} seconds</p>
    <div class="table-wrap"><table><thead><tr><th>Accepted event</th><th>What it does</th><th>Writes?</th></tr></thead><tbody>${(w.inbound || [])
      .map((r) => `<tr><td><code>${esc(r.event)}</code></td><td>${esc(r.does)}</td><td>${r.writes ? '<span class="pill declined">yes</span>' : "no"}</td></tr>`)
      .join("")}</tbody></table></div>`;

  const { deliveries } = await api("/api/webhooks/deliveries?limit=40");
  document.getElementById("deliveries-body").innerHTML = deliveries.length
    ? `<div class="table-wrap"><table><thead><tr><th>When</th><th>Direction</th><th>Event</th><th>Target</th><th>Result</th></tr></thead><tbody>${deliveries
        .map((d) => `<tr><td>${fmtWhen(d.at)}</td><td>${d.direction === "inbound" ? "in" : "out"}</td>
          <td><code>${esc(d.event)}</code></td>
          <td style="word-break:break-all;">${esc(d.url || "—")}</td>
          <td>${d.ok ? `<span class="pill approved">${esc(String(d.status || "ok"))}</span>` : `<span class="pill declined">${esc(String(d.error || d.status || "failed"))}</span>`}</td>
        </tr>`)
        .join("")}</tbody></table></div>`
    : `<p class="empty-note">No deliveries yet, in either direction.</p>`;
}

document.getElementById("hook-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector("button");
  btn.disabled = true;
  try {
    const events = [...f.querySelectorAll('input[name="events"]:checked')].map((i) => i.value);
    const out = await api("/api/webhooks/subscriptions", {
      method: "POST",
      body: JSON.stringify({ url: f.url.value, description: f.description.value, events }),
    });
    showOnce(document.getElementById("hook-result"), `Signing secret for ${f.url.value}`, out.secret, out.secretWarning);
    f.reset();
    await loadWebhooks();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
});

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-unhook]");
  if (!b) return;
  b.disabled = true;
  try {
    await api(`/api/webhooks/subscriptions/${b.dataset.unhook}`, { method: "DELETE" });
    await loadWebhooks();
  } catch (err) {
    alert(err.message);
    b.disabled = false;
  }
});

document.getElementById("inbound-secret-btn")?.addEventListener("click", async (e) => {
  if (!confirm("Mint or rotate the inbound webhook secret?\n\nRotating stops the previous secret working immediately, so any sender still using it will be rejected until it is given the new one.")) return;
  e.target.disabled = true;
  try {
    const out = await api("/api/webhooks/inbound/secret", { method: "POST", body: JSON.stringify({}) });
    showOnce(document.getElementById("deliveries-body"), out.rotated ? "Rotated inbound secret" : "Inbound secret", out.secret, out.secretWarning);
    document.getElementById("inbound-secret-result").textContent = out.rotated ? "Rotated." : "Minted.";
  } catch (err) {
    alert(err.message);
  } finally {
    e.target.disabled = false;
  }
});

async function loadTeam() {
  loadIntegrations().catch((err) => {
    document.getElementById("integrations-body").innerHTML = `<p class="error-note">${esc(err.message)}</p>`;
  });
  loadKeys().catch((err) => {
    document.getElementById("keys-body").innerHTML = `<p class="error-note">${esc(err.message)}</p>`;
  });
  loadWebhooks().catch((err) => {
    document.getElementById("hooks-body").innerHTML = `<p class="error-note">${esc(err.message)}</p>`;
  });
  const { users, roles, positions = [], departments = [] } = await api("/api/users");

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
      // Department and monthly capacity are what make this person count
      // in the VERYX resource workload rollup.
      const capacityCell = `<select data-user-dept="${u.id}" style="font-size:0.78rem;">
          <option value="">Department…</option>
          ${departments.map((d) => `<option value="${esc(d)}" ${d === u.department ? "selected" : ""}>${esc(d)}</option>`).join("")}
        </select>
        <input data-user-capacity="${u.id}" type="number" min="0" max="400" value="${u.capacityHours || ""}"
               placeholder="h / month" title="Hours a month genuinely available for project work"
               style="font-size:0.78rem;width:96px;margin-top:4px;">`;
      return `<tr><td><b>${esc(u.name)}</b>${u.position ? `<div class="muted" style="font-size:0.78rem;">${esc(u.position)}</div>` : ""}</td><td>${esc(u.email)}</td><td>${roleCell}</td><td>${capacityCell}</td><td class="muted">${when(u.createdAt)}</td><td>${statusPill}</td><td>${actions}</td></tr>`;
    })
    .join("");
}


/* Department and capacity save on change — they feed the workload rollup. */
document.addEventListener("change", async (e) => {
  const dept = e.target.closest("select[data-user-dept]");
  const cap = e.target.closest("input[data-user-capacity]");
  const el = dept || cap;
  if (!el) return;
  const id = dept ? dept.dataset.userDept : cap.dataset.userCapacity;
  const body = dept ? { department: dept.value } : { capacityHours: Number(cap.value) || 0 };
  try {
    await api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    loaded.delete("veryx"); // the workload rollup has changed
  } catch (err) {
    alert(err.message);
    await loadTeam();
  }
});

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
let pqqSections = null;

async function loadPrequalDefs() {
  if (prequalCriteria) return;
  const defs = await api("/api/subcontractors/prequal-criteria");
  prequalCriteria = defs.criteria;
  pqqSections = defs.pqqSections || [];
}

/** The supplier's PQQ answers, grouped by criterion, for the assessor. */
function pqqAnswersHtml(app_) {
  if (!app_.pqq) {
    return `<div style="border-left:3px solid var(--line);padding:8px 0 8px 14px;margin:10px 0;font-size:0.85rem;" class="muted">
      No questionnaire returned yet — this assessment would rest on the registration alone. Use <b>Send PQQ</b> on the row above to collect evidence first.</div>`;
  }
  const a = app_.pqq.answers || {};
  const fmt = (f) => {
    const v = a[f.id];
    if (f.type === "declaration") return v === true ? "✓ Accepted" : "✗ NOT accepted";
    return v ? esc(String(v)) : '<span class="muted">—</span>';
  };
  return `<details style="margin:10px 0;border:1.5px solid var(--line);border-radius:8px;padding:10px 14px;">
    <summary style="cursor:pointer;font-weight:600;font-size:0.9rem;">Questionnaire answers — submitted ${when(app_.pqq.submittedAt)} · ${app_.pqq.documents?.length || 0} document(s) attached</summary>
    ${pqqSections.map((s) => `<div style="margin-top:10px;">
      <b style="font-size:0.85rem;">${esc(s.title)}</b>
      <table style="font-size:0.82rem;margin-top:4px;"><tbody>
        ${s.fields.map((f) => `<tr><td class="muted" style="padding:3px 12px 3px 0;vertical-align:top;width:40%;">${esc(f.label)}</td><td style="padding:3px 0;">${fmt(f)}</td></tr>`).join("")}
      </tbody></table>
    </div>`).join("")}
  </details>`;
}

document.addEventListener("click", async (e) => {
  const onboard = e.target.closest("button[data-onboard]");
  if (onboard) {
    const app_ = applications.find((a) => a.id === onboard.dataset.onboard);
    if (!app_) return;
    if (app_.portalSentAt && !confirm("Re-sending issues a NEW portal link and invalidates the old one. Continue?")) return;
    onboard.disabled = true;
    onboard.textContent = "Sending…";
    try {
      const { link } = await api(`/api/subcontractors/${app_.id}/onboarding/send`, { method: "POST" });
      await load();
      refreshBell();
      alert(`Supplier portal sent to ${app_.email}.\n${link}`);
    } catch (err) {
      alert(err.message);
      onboard.disabled = false;
      onboard.textContent = "Onboard";
    }
    return;
  }
  const send = e.target.closest("button[data-pqq-send]");
  if (!send) return;
  const app_ = applications.find((a) => a.id === send.dataset.pqqSend);
  if (!app_) return;
  if (app_.pqqSentAt && !confirm("A questionnaire link was already sent. Re-sending issues a NEW link and invalidates the old one. Continue?")) return;
  send.disabled = true;
  send.textContent = "Sending…";
  try {
    const { link } = await api(`/api/subcontractors/${app_.id}/pqq/send`, { method: "POST" });
    await load();
    refreshBell();
    alert(`Questionnaire sent to ${app_.email}.\nLink (valid 30 days): ${link}`);
  } catch (err) {
    alert(err.message);
    send.disabled = false;
    send.textContent = "Send PQQ";
  }
});

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
  await loadPrequalDefs();
  const prior = app_.assessment?.scores || {};
  const holder = document.getElementById("assess-holder");
  holder.innerHTML = `<div class="section-block" style="border:1.5px solid var(--amber,#9c7a3c);border-radius:10px;padding:18px 22px;margin-top:18px;">
    <h3>Prequalification assessment — ${esc(app_.legalName)}</h3>
    <p class="muted" style="margin:4px 0 12px;">Score each criterion 0 (no evidence / unacceptable) to 5 (strong, evidenced). Four criteria are <b>critical</b>: a zero fails the assessment outright; below 2 caps it at conditional. The registered documents are in the table above.</p>
    <div style="border-left:3px solid var(--line);padding:8px 0 8px 14px;margin:10px 0;font-size:0.85rem;">
      <b>Companies House:</b> <span id="pq-ch-result" class="muted">${esc(app_.chCheck?.summary || "not checked yet")}</span>
      <button class="btn-run" id="pq-ch" style="margin-left:8px;">${app_.chCheck ? "Re-check register" : "Check register"}</button>
    </div>
    ${pqqAnswersHtml(app_)}
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
  document.getElementById("pq-ch").addEventListener("click", async () => {
    const chBtn = document.getElementById("pq-ch");
    const out = document.getElementById("pq-ch-result");
    chBtn.disabled = true;
    out.textContent = "Checking the live register…";
    try {
      const { summary } = await api(`/api/subcontractors/${app_.id}/companies-house`);
      out.textContent = summary;
      out.className = /NOT FOUND|FLAGS/.test(summary) ? "" : "muted";
      chBtn.textContent = "Re-check register";
    } catch (err) {
      out.textContent = err.message;
    } finally {
      chBtn.disabled = false;
    }
  });
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
            ${a.pqq ? `<div style="margin-top:6px;"><span class="pill approved" title="Questionnaire submitted ${when(a.pqq.submittedAt)} with ${a.pqq.documents?.length || 0} document(s)">PQQ received</span></div>` : a.pqqSentAt ? `<div style="margin-top:6px;"><span class="pill" title="Sent by ${esc(a.pqqSentBy || "")} — link valid 30 days">PQQ sent ${when(a.pqqSentAt)}</span></div>` : ""}
            ${a.onboarding ? `<div style="margin-top:6px;"><span class="pill ${a.bankVerified ? "approved" : "critical"}" title="${a.bankVerified ? "Payment account verified by call-back" : "Onboarded — verify the payment account by call-back before any payment"}">${a.bankVerified ? "onboarded · bank verified" : "onboarded · VERIFY BANK"}</span>${ACCESS.DELIVERY_FINANCE.includes(user.role) && !a.bankVerified ? ` <button class="btn-run" data-pay-account="${a.id}" title="Review the payment structure and confirm the call-back verification">Verify account</button>` : ""}</div>` : a.portalSentAt ? `<div style="margin-top:6px;"><span class="pill" title="Portal issued by ${esc(a.portalSentBy || "")}">portal sent ${when(a.portalSentAt)}</span></div>` : ""}
            ${ACCESS.DELIVERY_FINANCE.includes(user.role) ? `<div style="margin-top:6px;"><button class="btn-run" data-assess="${a.id}">${a.assessment ? "Re-assess" : "Assess"}</button> <button class="btn-run" data-pqq-send="${a.id}" title="Email the supplier the twelve-section evidence questionnaire">${a.pqqSentAt || a.pqq ? "Re-send PQQ" : "Send PQQ"}</button>${["prequalified", "approved"].includes(a.status) ? ` <button class="btn-run" data-onboard="${a.id}" title="Issue the supplier portal: payment structure, framework terms, then applications for payment">${a.portalSentAt ? "Re-send portal" : "Onboard"}</button>` : ""}</div>` : ""}
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

// First-party site traffic — 30-day view, straight from the beacon data.
(async () => {
  try {
    const t = await api("/api/stats/traffic");
    const strip = document.getElementById("traffic-strip");
    if (!strip || !t.total) return;
    const last7 = t.days.slice(-7).reduce((s, d) => s + d.total, 0);
    strip.innerHTML = `<b>etablix.com traffic:</b> ${t.total.toLocaleString()} views / 30 days · ${last7.toLocaleString()} last 7 days` +
      (t.topReferrers.length ? ` · from: ${t.topReferrers.slice(0, 4).map(([r, n]) => `${esc(r)} (${n})`).join(", ")}` : "") +
      (t.topPaths.length ? ` · top pages: ${t.topPaths.slice(0, 4).map(([p, n]) => `${esc(p)} (${n})`).join(", ")}` : "");
    strip.style.display = "block";
  } catch {}
})();

load()
  .then(() => {
    // Role gating decides which tabs exist, so honour the hash only
    // once the desk has finished deciding what this person can see.
    if (location.hash) applyHash();
  })
  .catch((err) => {
    console.error(err);
    document.querySelector("#enquiries-table tbody").innerHTML =
      `<tr><td colspan="7" class="error-note">${esc(err.message)}</td></tr>`;
  });
