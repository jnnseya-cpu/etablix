/**
 * Moved out of the page so the Content-Security Policy can be
 * script-src 'self' with no 'unsafe-inline'.
 *
 * That one keyword is the whole value of the policy: with it present, any
 * text that reaches the page as markup executes. The code is unchanged.
 */
const token = sessionStorage.getItem("etablix.token");
  if (!token) location.replace("/internal/login.html");
  document.getElementById("logout").addEventListener("click", () => {
    sessionStorage.clear();
    location.replace("/internal/login.html");
  });

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const n = (v) => Number(v || 0).toLocaleString("en-GB");
  const band = (s) => (s >= 95 ? "good" : s >= 90 ? "mid" : "bad");

  const root = document.getElementById("reach");

  fetch("/api/reach?days=30", { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      if (res.status === 401) { sessionStorage.clear(); location.replace("/internal/login.html"); throw new Error("unauthorised"); }
      if (!res.ok) return res.json().then((b) => { throw new Error(b.error || `HTTP ${res.status}`); });
      return res.json();
    })
    .then(render)
    .catch((err) => {
      if (err.message === "unauthorised") return;
      root.innerHTML = `<p class="error-note">${esc(err.message)}</p>`;
    });

  function render({ seo, views, editorial: ed }) {
    const peak = Math.max(1, ...views.daily.map((d) => d.views));
    const bars = views.daily
      .map((d) => `<i class="${d.views ? "" : "zero"}" style="height:${Math.round((d.views / peak) * 100)}%" title="${d.day}: ${d.views} views, ${d.bots} crawler"></i>`)
      .join("");

    root.innerHTML = `
      <h1>Reach</h1>
      <p class="sub">Two numbers, from our own rubric and our own logs. The score is what we control on the page; it is not a ranking and cannot be. The views are page views, not unique visitors — nothing identifying a reader is stored, so a unique count is not available and is not estimated.</p>

      <div class="verdict state-${esc(ed.state)}">
        <b>Cadence:</b> ${esc(ed.say)}
        ${ed.act === "publish" && ed.nextToPublish
          ? `<code class="cmd">node backend/tools/blog-publish.mjs   # ${esc(ed.nextToPublish.slug)}</code>`
          : `<code class="cmd">node backend/tools/blog-new.mjs ${esc(ed.nextToWrite ? ed.nextToWrite.slug : "&lt;slug&gt;")}</code>`}
      </div>

      <div class="num-row">
        <div class="num ${band(seo.average)}"><div class="v">${seo.average ?? "—"}</div><div class="l">SEO score, average</div><div class="n">out of ${seo.max}, across ${seo.pagesScored} pages. Gate is ${seo.gate}.</div></div>
        <div class="num ${seo.lowest >= seo.gate ? "good" : "warn"}"><div class="v">${seo.lowest ?? "—"}</div><div class="l">Worst page</div><div class="n">${seo.below.length ? `${seo.below.length} below the gate` : "nothing below the gate"}</div></div>
        <div class="num"><div class="v">${n(views.views)}</div><div class="l">Views, 30 days</div><div class="n">${n(views.today.views)} today · ${n(views.bots)} crawler visits</div></div>
        <div class="num"><div class="v">${n(ed.postsInWindow)}</div><div class="l">Posts, ${ed.windowDays} days</div><div class="n">${ed.ratePerWeek} a week · streak ${ed.streak}</div></div>
        <div class="num ${ed.bufferDays >= 3 ? "good" : "warn"}"><div class="v">${n(ed.bufferDays)}</div><div class="l">Written, unpublished</div><div class="n">days of cadence in hand · ${n(ed.plannedBriefs)} briefs behind that</div></div>
      </div>

      <div class="panel" style="margin-bottom:22px;">
        <div class="panel-title">Views a day · last ${views.days} days</div>
        <div class="bars">${bars}</div>
        <p class="fail">Peak ${n(peak)} on one day. Crawler visits are counted separately and are not in these bars.</p>
      </div>

      <div class="grid2" style="margin-bottom:22px;">
        <div class="panel">
          <div class="panel-title">Where readers came from</div>
          ${views.referrers.length
            ? `<table><thead><tr><th>Source</th><th class="n">Views</th></tr></thead><tbody>${views.referrers.map((r) => `<tr><td>${esc(r.name)}</td><td class="n">${n(r.n)}</td></tr>`).join("")}</tbody></table>`
            : `<p class="empty-note">No external referrals yet. Every view so far is somebody typing the address or following a link with no referrer.</p>`}
        </div>
        <div class="panel">
          <div class="panel-title">Which machines have been</div>
          ${views.crawlers.length
            ? `<table><thead><tr><th>Crawler</th><th class="n">Visits</th></tr></thead><tbody>${views.crawlers.map((c) => `<tr><td>${esc(c.name)}</td><td class="n">${n(c.n)}</td></tr>`).join("")}</tbody></table>`
            : `<p class="empty-note">No named crawler yet. Until Google and Bing appear here, nothing new is indexed.</p>`}
        </div>
      </div>

      <div class="panel" style="margin-bottom:22px;">
        <div class="panel-title">Every post: what it scores, who read it, whether it is indexed</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Post</th><th>Published</th><th class="n">Score</th><th class="n">Views</th><th class="n">Crawlers</th><th>First crawl</th></tr></thead>
          <tbody>${ed.live.map((p) => `<tr>
            <td><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></td>
            <td>${esc(p.published)}</td>
            <td class="n"><span class="score ${band(p.score)}">${p.score ?? "—"}</span></td>
            <td class="n">${n(p.views)}</td>
            <td class="n">${n(p.bots)}</td>
            <td>${p.firstCrawl ? esc(p.firstCrawl) : "<span class=\"fail\">not yet seen</span>"}</td>
          </tr>`).join("")}</tbody>
        </table></div>
      </div>

      <div class="grid2" style="margin-bottom:22px;">
        <div class="panel">
          <div class="panel-title">Written and waiting (${ed.drafts.length})</div>
          ${ed.drafts.length
            ? ed.drafts.map((d) => `<div class="brief-item"><b>${esc(d.title)}</b><span>${esc(d.slug)}</span></div>`).join("")
            : `<p class="empty-note">Nothing written ahead. The next bad day breaks the run.</p>`}
        </div>
        <div class="panel">
          <div class="panel-title">Next briefs (${ed.plan.length} in the queue)</div>
          ${ed.plan.slice(0, 6).map((b) => `<div class="brief-item"><b>${esc(b.title)}</b><span>${esc(b.buyer)} — “${esc(b.objection)}”</span>${b.sourcesNeeded ? `<span class="fail">Needs a source: ${esc(b.sourcesNeeded)}</span>` : ""}</div>`).join("")}
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Pages below ${seo.gate}, and what they are losing marks for</div>
        ${seo.pages.filter((p) => p.failures.length).length
          ? seo.pages.filter((p) => p.failures.length).map((p) => `<div class="brief-item"><b><span class="score ${band(p.score)}">${p.score}</span> &nbsp; ${esc(p.file)}</b>${p.failures.map((f) => `<span>${f.got}/${f.of} — ${esc(f.what)}${f.note ? `: ${esc(f.note)}` : ""}</span>`).join("")}</div>`).join("")
          : `<p class="empty-note">Every page scores full marks on every check that applies to it.</p>`}
        <p class="fail" style="margin-top:12px;">${seo.excluded.length} page(s) not scored: ${seo.excluded.map((e) => `${esc(e.file)} (${esc(e.why)})`).join(", ") || "none"}</p>
      </div>
    `;
  }
