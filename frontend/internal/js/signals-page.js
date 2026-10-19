/**
 * The reading queue.
 *
 * It shows moments, not contacts, and there is no send button anywhere on
 * this page by design. The approach is written and sent by a person from
 * their own mailbox; this screen exists to make that quick and to record
 * what was done.
 *
 * In its own module so the Content-Security Policy stays script-src 'self'.
 */
const token = sessionStorage.getItem("etablix.token");
if (!token) {
  (sessionStorage.setItem("etablix.after-login", location.pathname + location.search + location.hash),
   location.replace("/internal/login.html"));
  await new Promise(() => {});
}
document.getElementById("logout").addEventListener("click", () => {
  sessionStorage.clear();
  location.replace("/internal/login.html");
});

const root = document.getElementById("sig");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const api = async (path, opts = {}) => {
  const res = await fetch(path, {
    ...opts,
    headers: { authorization: `Bearer ${token}`, ...(opts.body ? { "content-type": "application/json" } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
};

let filter = "new";
let sector = null;
let stage = null;
const when = (ts) => (ts ? new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "no date");

/**
 * How many days until it stops being an opportunity, said in words.
 *
 * "31 Oct 2026" requires the reader to work out whether that is urgent.
 * "closes in 11 days" does not, and that is the whole job of this line.
 */
const countdown = (at) => {
  const days = Math.round((at - Date.now()) / 86400000);
  if (days < 0) return { text: `closed ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`, late: true };
  if (days === 0) return { text: "today", soon: true };
  if (days === 1) return { text: "tomorrow", soon: true };
  return { text: `in ${days} days`, soon: days <= 10 };
};

// labels AND sectorLabels are passed in. They used to be read from render()'s
// own scope, which worked only because a signal with no sectors never entered
// the loop that touched them — the first signal carrying a sector would have
// thrown a ReferenceError and emptied the page.
function card(s, labels, sectorLabels, stageLabels) {
  const hot = s.score >= 6, cool = s.status === "dismissed" || s.status === "approached";
  const due = s.deadlineAt ? countdown(s.deadlineAt) : null;
  const where = s.stage || "early";
  return `<div class="card ${hot ? "hot" : ""} ${cool ? "cool" : ""}">
    <h3><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></h3>
    <div class="meta">
      <span class="stage stage-${esc(where)}">${esc(stageLabels[where] || where)}</span>
      <span>${esc(s.sourceName || s.sourceId || "source")}</span>
      <span>${esc(when(s.publishedAt || s.seenAt))}</span>
      <span>score ${esc(s.score)}</span>
      <span>${esc(String(s.status).replace(/_/g, " "))}</span>
    </div>
    ${due ? `<p class="due ${due.late ? "due-late" : due.soon ? "due-soon" : ""}">
      ${s.deadlineKind === "event" ? "Event" : "Closes"} ${esc(due.text)} — ${esc(s.deadlineText || "")}${due.late ? ". Too late to answer this one." : ""}</p>` : ""}
    <div>${(s.sectors || []).map((x) => `<span class="sect">${esc(sectorLabels[x] || x)}</span>`).join("")}${(s.triggers || []).map((t) => `<span class="trig">${esc(labels[t] || t)}</span>`).join("")}</div>
    ${(s.orgs || []).length ? `<p class="orgs"><b>Named in the item:</b> ${(s.orgs || []).map((o) => esc(o)).join(" · ")}
      <span class="muted">— read as a hint, not a fact. On an award it is usually the contractor, who is the one who needs the compound; check the announcement before you write to anyone.</span></p>` : ""}
    ${s.summary ? `<p class="summary">${esc(s.summary.slice(0, 420))}</p>` : ""}
    <p class="route">${s.contactUrl
      ? `Published route in: <a href="${esc(s.contactUrl)}" target="_blank" rel="noopener noreferrer">${esc(s.contactUrl)}</a>`
      : `<span class="muted">No published route found — find the supplier or contact page yourself before approaching.</span>`}
      ${s.roleAddress ? ` · <b>${esc(s.roleAddress)}</b>` : ""}</p>
    <div class="acts">
      <button class="btn-run" data-draft="${esc(s.id)}">Draft the approach</button>
      <button class="btn-run" data-act="reading" data-id="${esc(s.id)}">Reading</button>
      <button class="btn-run" data-act="approached" data-id="${esc(s.id)}">I have approached them</button>
      <button class="btn-run" data-act="dismissed" data-id="${esc(s.id)}">Not for us</button>
      <button class="btn-run" data-suppress="${esc(s.org || s.url)}">Never approach</button>
    </div>
    <div class="draft-slot" id="draft-${esc(s.id)}"></div>
  </div>`;
}

async function render() {
  const q = new URLSearchParams();
  if (filter !== "all") q.set("status", filter);
  if (sector) q.set("sector", sector);
  if (stage) q.set("stage", stage);
  const data = await api(`/api/signals${q.toString() ? `?${q}` : ""}`);
  const labels = Object.fromEntries((data.triggers || []).map((t) => [t.id, t.label]));
  const sectorLabels = Object.fromEntries((data.sectors || []).map((x) => [x.id, x.label]));
  const stageLabels = Object.fromEntries((data.stages || []).map((x) => [x.id, x.label]));
  const tabs = ["new", "reading", "approached", "dismissed", "all"];

  root.innerHTML = `
    <h1>Signals</h1>
    <p class="sub">Moments where a scheme has just become somebody's problem and nobody has answered it yet.
      Nothing here has been contacted, and nothing is sent from this screen — read one, write the approach
      yourself from your own mailbox, then mark it. Ten aimed approaches beat a thousand sent.</p>

    ${!data.sources.length ? `<div class="note"><b>No sources are enabled yet.</b> Edit
      <code>content/signals/sources.json</code> on the server, then run
      <code>node backend/tools/signals-check.mjs --all</code>. It tests every source, follows a site's own
      declared feed when the given URL is not one, and prints exactly which to switch on.</div>` : ""}

    <div class="bar">
      ${tabs.map((t) => `<button class="btn-run ${t === filter ? "btn-block" : ""}" data-filter="${t}">${t === "all" ? "Everything" : t}</button>`).join("")}
      <span class="spacer"></span>
      <span class="muted" style="font-size:0.78rem;">${esc(data.sources.length)} source(s) · ${esc(data.suppressions)} suppressed</span>
      <button class="btn-run" id="sweep">Sweep now</button>
    </div>

    <div class="bar sectors">
      <button class="btn-run ${!stage ? "btn-block" : ""}" data-stage="">Any stage</button>
      ${(data.stages || []).map((x) => {
        const n = (data.stageCounts || {})[x.id] || 0;
        return `<button class="btn-run ${stage === x.id ? "btn-block" : ""}" data-stage="${esc(x.id)}">${esc(x.label)}${n ? ` · ${n}` : ""}</button>`;
      }).join("")}
    </div>

    <div class="bar sectors">
      <button class="btn-run ${!sector ? "btn-block" : ""}" data-sector="">All sectors</button>
      ${(data.sectors || []).map((x) => {
        const n = (data.sectorCounts || {})[x.id] || 0;
        return `<button class="btn-run ${sector === x.id ? "btn-block" : ""}" data-sector="${esc(x.id)}">${esc(x.label)}${n ? ` · ${n}` : ""}</button>`;
      }).join("")}
    </div>

    ${data.signals.length
      ? data.signals.map((s) => card(s, labels, sectorLabels, stageLabels)).join("")
      : `<p class="empty-note">Nothing in this list${sector ? ` for ${esc(sectorLabels[sector] || sector)}` : ""}.${filter === "new" && !sector ? " When a source finds a moment it appears here." : ""}</p>`}`;
}

root.addEventListener("click", async (e) => {
  const f = e.target.closest("button[data-filter]");
  if (f) { filter = f.dataset.filter; return render(); }

  const sx = e.target.closest("button[data-sector]");
  if (sx) { sector = sx.dataset.sector || null; return render(); }

  const st = e.target.closest("button[data-stage]");
  if (st) { stage = st.dataset.stage || null; return render(); }

  const sweep = e.target.closest("#sweep");
  if (sweep) {
    sweep.disabled = true; sweep.textContent = "Sweeping…";
    try {
      const out = await api("/api/signals/sweep", { method: "POST", body: JSON.stringify({}) });
      await render();
      alert(`${out.checked} source(s) read. ${out.queued} new signal(s) queued.`
        + `\n${out.unchanged} unchanged, ${out.blocked} barred by robots.txt, ${out.failed} failed.`
        + `${out.expired ? `\n${out.expired} open notice(s) had already closed and were dropped.` : ""}`);
    } catch (err) { alert(err.message); sweep.disabled = false; sweep.textContent = "Sweep now"; }
    return;
  }

  const d = e.target.closest("button[data-draft]");
  if (d) {
    const slot = document.getElementById(`draft-${d.dataset.draft}`);
    d.disabled = true; d.textContent = "Drafting…";
    try {
      const out = await api(`/api/signals/${d.dataset.draft}/draft`, { method: "POST", body: JSON.stringify({}) });
      // Shown in a textarea rather than as text, because the next thing that
      // happens to it is editing. A draft you cannot change on the spot gets
      // copied into a mail client and sent unread.
      slot.innerHTML = `<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px;">
        <div style="font-family:var(--font-head);font-size:0.72rem;letter-spacing:0.09em;text-transform:uppercase;color:var(--amber,#9c7a3c);margin-bottom:6px;">
          A draft — read it, change it, send it yourself</div>
        <textarea style="width:100%;min-height:220px;padding:10px 12px;border:1.5px solid var(--line);border-radius:7px;font-family:inherit;font-size:0.86rem;line-height:1.55;">${esc(out.draft)}</textarea>
        <div class="muted" style="font-size:0.76rem;margin-top:5px;">Nothing has been sent. Check every fact against the announcement before it goes.</div>
      </div>`;
      d.textContent = "Re-draft";
    } catch (err) { alert(err.message); d.textContent = "Draft the approach"; }
    d.disabled = false;
    return;
  }

  const act = e.target.closest("button[data-act]");
  if (act) {
    act.disabled = true;
    try { await api(`/api/signals/${act.dataset.id}/status`, { method: "POST", body: JSON.stringify({ status: act.dataset.act }) }); await render(); }
    catch (err) { alert(err.message); act.disabled = false; }
    return;
  }

  const sup = e.target.closest("button[data-suppress]");
  if (sup) {
    const pattern = prompt("Never approach anything matching this. A company name or a domain:", sup.dataset.suppress);
    if (!pattern) return;
    const why = prompt("Why? Recorded so the next person does not undo it:", "") || null;
    try {
      const out = await api("/api/signals/suppress", { method: "POST", body: JSON.stringify({ pattern, why }) });
      await render();
      alert(`Added. ${out.total} on the list.\n\nThis cannot be removed from the application — it is a database edit, on purpose.`);
    } catch (err) { alert(err.message); }
  }
});

render().catch((err) => { root.innerHTML = `<p class="empty-note">${esc(err.message)}</p>`; });
