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
/**
 * A HEAD START ON FINDING THE CONTACT, WITHOUT THE WATCHER GOING LOOKING.
 *
 * The line this must not cross is still the line: nothing here crawls a
 * company's website hunting for addresses, and nothing stores a person's. What
 * it does is build a link out of a name we already hold, to the public
 * statutory register, so the reader can do in one click what they would
 * otherwise do by typing the name into a search box.
 *
 * It is a SEARCH link, not a record: the name came off a notice and may not
 * match a registered name exactly.
 */
const lookup = (name) =>
  `https://find-and-update.company-information.service.gov.uk/search?q=${encodeURIComponent(name)}`;

const party = (label, name, note) => name
  ? `<span class="pty"><b>${esc(label)}</b> ${esc(name)}
       <a href="${esc(lookup(name))}" target="_blank" rel="noopener noreferrer" title="Look up on Companies House">↗</a>${
       note ? `<i>${esc(note)}</i>` : ""}</span>`
  : "";

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
    ${(s.buyer || (s.suppliers || []).length) ? `<p class="parties">
      ${(s.suppliers || []).map((n) => party("Won by", n, "— the one who needs the compound")).join("")}
      ${party("Let by", s.buyer, "— the client, not the winner")}
    </p>` : ""}
    ${(s.orgs || []).length && !s.buyer && !(s.suppliers || []).length
      ? `<p class="orgs"><b>Named in the item:</b> ${(s.orgs || []).map((o) =>
          `<a href="${esc(lookup(o))}" target="_blank" rel="noopener noreferrer">${esc(o)}</a>`).join(" · ")}
        <span class="muted">— read as a hint, not a fact. On an award it is usually the contractor, who is the one who needs the compound; check the announcement before you write to anyone.</span></p>`
      : ""}
    ${s.summary ? `<p class="summary">${esc(s.summary.slice(0, 420))}</p>` : ""}
    ${s.roleAddress ? `<p class="addr"><b>${esc(s.roleAddress)}</b>${s.contactOrg
        ? ` — ${esc(s.contactOrg)}${s.contactRole === "supplier" ? " (the supplier)" : s.contactRole === "buyer" ? " (the client who let it, NOT the winner)" : ""}`
        : ""}</p>` : ""}
    ${s.contactWithheld ? `<p class="addr withheld">A contact is published on the notice, but it is a person's
      address rather than a role address, so it has not been stored. Open the notice and read it there.</p>` : ""}
    <p class="route">${s.contactUrl
      ? `Published route in: <a href="${esc(s.contactUrl)}" target="_blank" rel="noopener noreferrer">${esc(s.contactUrl)}</a>`
      : `<span class="muted">No published route found — find the supplier or contact page yourself before approaching.</span>`}</p>
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
        + `${out.expired ? `\n${out.expired} open notice(s) had already closed and were dropped.` : ""}`
        + `${out.offSector ? `\n${out.offSector} notice(s) were outside our six sectors.` : ""}`
        + `${out.noWorks ? `\n${out.noWorks} had nothing to build in them.` : ""}`
        + `${out.notOurs ? `\n${out.notOurs} were a category we could never sell to.` : ""}`);
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
      /**
       * THE SUBJECT IS SEPARATED FROM THE BODY, AND BOTH ARE ONE TAP TO COPY.
       *
       * The draft arrives as one block with "Subject: ..." on the first line.
       * Sending it means putting the subject in one field of a mail client and
       * the body in another, and the gap between a good draft and a sent email
       * is exactly that fiddling — select part of a textarea, copy, switch app,
       * paste, come back, select the rest. On a phone it is worse, and this
       * screen is read on a phone.
       */
      const raw = String(out.draft || "").trim();
      const m = /^subject:\s*(.+?)\s*\n+([\s\S]*)$/i.exec(raw);
      const subject = m ? m[1].trim() : "";
      const body = m ? m[2].trim() : raw;

      slot.innerHTML = `<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px;">
        <div style="font-family:var(--font-head);font-size:0.72rem;letter-spacing:0.09em;text-transform:uppercase;color:var(--amber,#9c7a3c);margin-bottom:6px;">
          A draft — read it, change it, send it yourself</div>
        ${subject ? `<label style="display:block;font-size:0.72rem;color:var(--muted,#6b7280);margin-bottom:3px;">Subject</label>
        <div style="display:flex;gap:6px;margin-bottom:9px;">
          <input class="draft-subject" value="${esc(subject)}" style="flex:1;padding:8px 10px;border:1.5px solid var(--line);border-radius:7px;font-family:inherit;font-size:0.86rem;">
          <button class="btn-run" data-copy="subject" type="button">Copy</button>
        </div>` : ""}
        <label style="display:block;font-size:0.72rem;color:var(--muted,#6b7280);margin-bottom:3px;">Message</label>
        <textarea class="draft-body" style="width:100%;min-height:220px;padding:10px 12px;border:1.5px solid var(--line);border-radius:7px;font-family:inherit;font-size:0.86rem;line-height:1.55;">${esc(body)}</textarea>
        <div style="display:flex;gap:6px;align-items:center;margin-top:7px;flex-wrap:wrap;">
          <button class="btn-run" data-copy="body" type="button">Copy the message</button>
          <span class="muted" style="font-size:0.76rem;">Nothing has been sent. Check every fact against the announcement before it goes.</span>
        </div>
      </div>`;
      d.textContent = "Re-draft";
    } catch (err) { alert(err.message); d.textContent = "Draft the approach"; }
    d.disabled = false;
    return;
  }

  /**
   * Copy, with the clipboard API and a fallback, because this screen is served
   * over https on a phone and also opened on a desktop browser that may refuse
   * the permission. A copy button that silently does nothing is worse than no
   * copy button, so the label says what happened either way.
   */
  const cp = e.target.closest("button[data-copy]");
  if (cp) {
    const wrap = cp.closest(".draft-slot") || cp.parentElement.parentElement;
    const el = wrap.querySelector(cp.dataset.copy === "subject" ? ".draft-subject" : ".draft-body");
    const text = el ? el.value : "";
    const done = (ok) => {
      const was = cp.textContent;
      cp.textContent = ok ? "Copied" : "Press and hold to copy";
      setTimeout(() => { cp.textContent = was; }, 1600);
    };
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); done(true); }
      else { el.select(); done(document.execCommand("copy")); }
    } catch { try { el.select(); done(document.execCommand("copy")); } catch { done(false); } }
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
