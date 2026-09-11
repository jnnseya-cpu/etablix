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

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const out = document.getElementById("out");

  Promise.all([
    fetch("/api/l7", { headers: { Authorization: `Bearer ${token}` } }),
    fetch("/api/l7/permissions", { headers: { Authorization: `Bearer ${token}` } }),
    fetch("/api/l7/model", { headers: { Authorization: `Bearer ${token}` } }),
    fetch("/api/l7/acu?days=90", { headers: { Authorization: `Bearer ${token}` } }),
    fetch("/api/l7/contract", { headers: { Authorization: `Bearer ${token}` } }),
    fetch("/api/l7/memory", { headers: { Authorization: `Bearer ${token}` } }),
    fetch("/api/l7/ports", { headers: { Authorization: `Bearer ${token}` } }),
    fetch("/api/l7/quality", { headers: { Authorization: `Bearer ${token}` } }),
  ])
    .then(async ([a, b, c, d, e, f, g, h]) => {
      for (const res of [a, b, c, d, e, f, g, h]) {
        if (res.status === 401) { sessionStorage.clear(); location.replace("/internal/login.html"); throw new Error("unauthorised"); }
        if (!res.ok) throw new Error(`${res.status} from ${res.url}`);
      }
      return [await a.json(), await b.json(), await c.json(), await d.json(), await e.json(), await f.json(), await g.json(), await h.json()];
    })
    .then(([state, perms, model, spend, contract, memory, ports, quality]) => render(state, perms, model, spend, contract, memory, ports, quality))
    .catch((err) => {
      if (err.message === "unauthorised") return;
      out.innerHTML = `<p class="err">The controls could not be run: ${esc(err.message)}. That is itself the answer to whether they work.</p>`;
    });

  function render(state, perms, model, spend, contract, memory, ports, quality) {
    const m = state.measured;
    const h = state.health;
    const c = m.counts;
    const allBuilt = c.l7Built === m.levelSeven.length;

    const drift = m.drift.levelSeven.concat(m.drift.foundations);

    out.innerHTML = `
      <div class="verdict ${allBuilt ? "all-built" : ""}">
        <b>${esc(m.say)}</b>
        <div class="note" style="margin-top:8px;">
          ${esc(h.say)}
        </div>
      </div>

      ${drift.length ? `<div class="drift">
        <b>${drift.length} row(s) of the register disagree with what the code does.</b>
        ${drift.map((d) => `<div>${esc(d.id)}: written as <b>${esc(d.declared)}</b>, measures as <b>${esc(d.measured)}</b></div>`).join("")}
        <div class="note">The measurement is the one to believe. The register is prose and prose does not run.</div>
      </div>` : ""}

      <div class="num-row">
        <div class="num ${c.l7Built === 7 ? "good" : "warn"}"><div class="v">${c.l7Built}/7</div><div class="l">Level 7 properties built</div></div>
        <div class="num"><div class="v">${c.l7Partial}</div><div class="l">Partial</div></div>
        <div class="num ${c.l7Absent ? "warn" : "good"}"><div class="v">${c.l7Absent}</div><div class="l">Absent</div></div>
        <div class="num"><div class="v">${c.foundationsBuilt}/${m.foundations.length}</div><div class="l">Foundations built</div></div>
        <div class="num ${c.targetsEnforced === c.targetsTotal ? "good" : "warn"}"><div class="v">${c.targetsEnforced}/${c.targetsTotal}</div><div class="l">Targets with a mechanism</div></div>
        <div class="num ${h.ok ? "good" : "warn"}"><div class="v">${h.policyCoverage.actions}</div><div class="l">Enforced actions</div></div>
        <div class="num"><div class="v">${h.gates}</div><div class="l">Machine gates</div></div>
        <div class="num"><div class="v">${h.autonomyRows}</div><div class="l">Authority rows</div></div>
      </div>

      <div class="panel">
        <div class="panel-title">The seven Level 7 properties — probed, not asserted</div>
        <table><thead><tr><th style="width:52px;">ID</th><th style="width:200px;">Property</th><th style="width:90px;">State</th><th>What was actually found</th></tr></thead>
        <tbody>${m.levelSeven.map((r) => `<tr>
          <td><b>${esc(r.id)}</b></td>
          <td>${esc(r.name)}</td>
          <td><span class="state ${esc(r.state)}">${esc(r.state)}</span></td>
          <td>${esc(r.evidence)}${r.detail ? `<div class="ev">${Object.entries(r.detail).map(([k, v]) => `${esc(k)}: <span class="${v === true ? "yes" : v === false ? "no" : ""}">${esc(v)}</span>`).join(" &nbsp;·&nbsp; ")}</div>` : ""}</td>
        </tr>`).join("")}</tbody></table>
      </div>

      <div class="panel">
        <div class="panel-title">The nine foundations</div>
        <table><thead><tr><th style="width:200px;">Foundation</th><th style="width:90px;">State</th><th>What was actually found</th></tr></thead>
        <tbody>${m.foundations.map((r) => `<tr>
          <td><b>${esc(r.name)}</b></td>
          <td><span class="state ${esc(r.state)}">${esc(r.state)}</span></td>
          <td>${esc(r.evidence)}</td>
        </tr>`).join("")}</tbody></table>
      </div>

      <div class="panel">
        <div class="panel-title">Quality targets, and the mechanism that enforces each</div>
        <p class="note" style="margin:0 0 12px;">
          A target with no mechanism is a hope. The point of the third column is that it is impossible
          to write "measured" next to one.
        </p>
        <div class="num-row" style="margin-bottom:14px;">
          <div class="num good"><div class="v">${c.targetsMeasured}</div><div class="l">Measured from real data</div></div>
          <div class="num ${c.targetsNoData ? "warn" : ""}"><div class="v">${c.targetsNoData}</div><div class="l">Mechanism, no data yet</div></div>
          <div class="num ${c.targetsNotMeasurable ? "warn" : ""}"><div class="v">${c.targetsNotMeasurable}</div><div class="l">Software cannot see it</div></div>
        </div>
        <table><thead><tr><th style="width:90px;">Stage</th><th style="width:250px;">Target</th><th style="width:120px;">Outcome</th><th>What was found</th></tr></thead>
        <tbody>${m.qualityTargets.map((r) => `<tr>
          <td>${esc(r.stage)}</td>
          <td><b>${esc(r.target)}</b><div class="ev">Target: ${esc(r.value)}</div></td>
          <td><span class="state ${r.outcome === "MEASURED" ? "built" : r.outcome === "NO_DATA_YET" ? "partial" : "absent"}">${esc(String(r.outcome).replace(/_/g, " ").toLowerCase())}</span>${r.mechanism ? `<div class="ev">${esc(r.mechanism)}</div>` : ""}</td>
          <td>${esc(r.note)}</td>
        </tr>`).join("")}</tbody></table>
        <p class="note">
          Three answers, not two. A target with a mechanism and no data is a different thing from a
          target with no mechanism, and "no data yet" is never shown as a pass: zero aged RFIs
          because none is old is a result, and zero because nobody entered one is an empty database.
          ${quality && quality.say ? esc(quality.say) : ""}
        </p>
      </div>

      <div class="grid2">
        <div class="panel">
          <div class="panel-title">Failure modes, re-checked against the code</div>
          <table><thead><tr><th>Mode</th><th style="width:70px;">Avoided</th></tr></thead>
          <tbody>${m.failureModes.map((r) => `<tr>
            <td><b>${esc(r.mode)}</b><div class="ev">${esc(r.how)}</div></td>
            <td>${r.avoided ? `<span class="yes">yes</span>` : `<span class="no">no</span>`}${r.rechecked !== null ? `<div class="ev">${r.agrees ? "re-checked" : "DISAGREES"}</div>` : ""}</td>
          </tr>`).join("")}</tbody></table>
        </div>
        <div class="panel">
          <div class="panel-title">Who can see the price</div>
          <p class="note" style="margin:0 0 12px;">
            ${esc(perms.priceExposure.say)} A contributor's grant on the price is
            <b>${esc(perms.priceExposure.contributorSees)}</b> — absent, not set to read, which is the
            difference between a rule and a default.
          </p>
          <table class="matrix"><thead><tr><th>Role</th>${perms.contentClasses.map((k) => `<th style="font-size:0.6rem;">${esc(k.id)}</th>`).join("")}</tr></thead>
          <tbody>${perms.matrix.map((r) => `<tr>
            <td style="font-size:0.78rem;">${esc(r.name)}</td>
            ${perms.contentClasses.map((k) => `<td class="acc ${esc(r.access[k.id])}">${r.access[k.id] === "write" ? "W" : r.access[k.id] === "read" ? "R" : "—"}</td>`).join("")}
          </tr>`).join("")}</tbody></table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">What the agents have cost, over the last ${spend.days} days</div>
        <p class="note" style="margin:0 0 14px;">${esc(spend.say)}</p>
        <div class="num-row" style="margin-bottom:18px;">
          <div class="num"><div class="v">${spend.totals.acu}</div><div class="l">ACU spent</div></div>
          <div class="num"><div class="v">${spend.totals.perRun === null ? "—" : spend.totals.perRun}</div><div class="l">ACU per run</div></div>
          <div class="num"><div class="v">${spend.totals.metered}</div><div class="l">Runs metered</div></div>
          <div class="num ${spend.totals.unmetered ? "warn" : ""}"><div class="v">${spend.totals.unmetered}</div><div class="l">Unmetered, not free</div></div>
          <div class="num ${spend.totals.unpriced ? "warn" : ""}"><div class="v">${spend.totals.unpriced}</div><div class="l">On an unpriced model</div></div>
          <div class="num"><div class="v">${spend.totals.cachedShare === null ? "—" : Math.round(spend.totals.cachedShare * 100) + "%"}</div><div class="l">Input served from cache</div></div>
        </div>
        ${spend.byDay.length ? `
          <div class="bars">${(() => {
            const max = Math.max(...spend.byDay.map((d) => d.acu), 1);
            return spend.byDay.map((d) => `<i class="${d.acu ? "" : "zero"}" style="height:${Math.max(1, Math.round((d.acu / max) * 60))}px" title="${esc(d.key)}: ${d.acu} ACU across ${d.runs} run(s)"></i>`).join("");
          })()}</div>
          <div class="bar-ax"><span>${esc(spend.byDay[0].key)}</span><span>${esc(spend.byDay[spend.byDay.length - 1].key)}</span></div>
        ` : ""}
        <div class="grid2" style="margin-top:20px;">
          <div>
            <div class="panel-title">By agent</div>
            <table><thead><tr><th>Agent</th><th class="rw" style="text-align:right;">Runs</th><th class="rw" style="text-align:right;">ACU</th><th class="rw" style="text-align:right;">Per run</th></tr></thead>
            <tbody>${spend.byAgent.map((a) => `<tr>
              <td>${esc(a.key)}${a.unmetered ? `<div class="ev">${a.unmetered} unmetered</div>` : ""}</td>
              <td class="rw" style="text-align:right;">${a.runs}</td>
              <td class="rw" style="text-align:right;">${a.acu}</td>
              <td class="rw" style="text-align:right;">${a.metered ? Math.round((a.acu / a.metered) * 100) / 100 : "—"}</td>
            </tr>`).join("") || `<tr><td colspan="4" class="ev">Nothing has run yet.</td></tr>`}</tbody></table>
          </div>
          <div>
            <div class="panel-title">By pass</div>
            <p class="note" style="margin:0 0 10px;">Which part of a run costs the money. The working paper is one pass and it is usually the dearest, because it reads everything.</p>
            <table><thead><tr><th>Pass</th><th class="rw" style="text-align:right;">Calls</th><th class="rw" style="text-align:right;">ACU</th></tr></thead>
            <tbody>${spend.byStage.map((st) => `<tr><td>${esc(st.key)}</td><td class="rw" style="text-align:right;">${st.calls}</td><td class="rw" style="text-align:right;">${st.acu}</td></tr>`).join("") || `<tr><td colspan="3" class="ev">No metered pass yet.</td></tr>`}</tbody></table>
          </div>
        </div>
        <div class="grid2" style="margin-top:20px;">
          <div>
            <div class="panel-title">The dearest runs</div>
            <table><thead><tr><th>Run</th><th class="rw" style="text-align:right;">ACU</th></tr></thead>
            <tbody>${spend.dearest.map((r) => `<tr>
              <td>${esc(r.title || r.id)}<div class="ev">${esc(r.agentName || r.agent)} · ${esc(r.day || "")} · ${esc(r.model || "model not recorded")}</div></td>
              <td class="rw" style="text-align:right;">${r.acu}</td>
            </tr>`).join("") || `<tr><td colspan="2" class="ev">Nothing metered yet.</td></tr>`}</tbody></table>
          </div>
          <div>
            <div class="panel-title">Budgets in force</div>
            <p class="note" style="margin:0 0 10px;">
              Metering is not capping. Every call is priced and recorded whatever happens; a cap stops
              a run, and nothing stops one unless somebody set a budget on purpose. Every arbitrary
              limit on an agent was removed from this system deliberately, and a cap that appeared
              because a module was added would put one back without anybody deciding to.
            </p>
            <table><thead><tr><th>Agent</th><th>Cap</th></tr></thead>
            <tbody>${spend.budgets.map((b) => `<tr><td>${esc(b.agent)}</td><td>${b.cap === null ? `<span class="cap-none">uncapped</span>` : `${b.cap} ACU`}</td></tr>`).join("")}</tbody></table>
            <div class="panel-title" style="margin-top:18px;">The conversion table (${esc(spend.rates.version)})</div>
            <table><thead><tr><th>Model</th><th class="rw" style="text-align:right;">In</th><th class="rw" style="text-align:right;">Out</th><th class="rw" style="text-align:right;">Cache read</th></tr></thead>
            <tbody>${Object.entries(spend.rates.models).map(([id, r]) => `<tr>
              <td>${esc(id)}<div class="ev">${esc(r.tier)}</div></td>
              <td class="rw" style="text-align:right;">${r.input}</td>
              <td class="rw" style="text-align:right;">${r.output}</td>
              <td class="rw" style="text-align:right;">${r.cacheRead}</td>
            </tr>`).join("")}</tbody></table>
            <p class="note">ACU per thousand tokens. A cache read is neither free nor full price: treating it as ordinary input makes a six-pass run look five times dearer than it is, and treating it as free hides the most expensive part of a long one.</p>
          </div>
        </div>
        <p class="unit">${esc(spend.unit)}</p>
      </div>

      <div class="panel">
        <div class="panel-title">What each action is allowed to be, and by whom</div>
        <p class="note" style="margin:0 0 12px;">
          Every row resolves to a row of the authority register in the organisation file. The register
          is the thing enforced, and a coverage test asserts that in both directions — so it cannot
          quietly stop being what the code reads.
        </p>
        <table><thead><tr><th style="width:180px;">Action</th><th style="width:60px;">Class</th><th style="width:52px;">Min</th><th style="width:230px;">Register row</th><th>Authority</th></tr></thead>
        <tbody>${model.actions.map((a) => `<tr>
          <td><b>${esc(a.verb)}</b><div class="ev">${esc(a.id)}</div></td>
          <td><b>${esc(a.riskClass || "—")}</b></td>
          <td>${esc(a.minLevel)}</td>
          <td>${esc(a.registerAction)}</td>
          <td>${esc(a.authority)}</td>
        </tr>`).join("")}</tbody></table>
      </div>

      <div class="grid2">
        <div class="panel">
          <div class="panel-title">The bid lifecycle and its gates</div>
          <table><thead><tr><th style="width:210px;">Gate</th><th>Guards</th></tr></thead>
          <tbody>${model.gates.map((g) => `<tr>
            <td><b>${esc(g.name)}</b><div class="ev">${esc(g.id)}</div></td>
            <td>${esc(g.from)} → ${esc(g.to)}<div class="ev">Exit artefact: ${esc(g.exitArtefact)}</div>
            <div class="ev">${g.requires.map((r) => esc(r.kind === "approval" ? `approval: ${(r.roles || []).join(" or ")}${r.segregation ? ", approver ≠ author" : ""}` : r.say || r.kind)).join("<br>")}</div></td>
          </tr>`).join("")}</tbody></table>
        </div>
        <div class="panel">
          <div class="panel-title">Model routing by task class</div>
          <table><thead><tr><th style="width:150px;">Task class</th><th>Route and control</th></tr></thead>
          <tbody>${model.taskClasses.map((t) => `<tr>
            <td><b>${esc(t.name)}</b></td>
            <td>${t.deterministic
              ? `<span class="no">no model, at any tier, for any reason</span><div class="ev">${esc(t.control)} — ${esc(t.service || "")}</div>`
              : `${esc((model.routes.byClass[t.id] || {}).primary || "—")}<div class="ev">${esc(t.control)}</div>`}</td>
          </tr>`).join("")}</tbody></table>
          <p class="note">
            One row there is not about cost. Arithmetic returns a refusal naming the deterministic
            service, because a tender price that is a language model's best recollection of
            multiplication is the most expensive thing this codebase could contain.
          </p>
        </div>
      </div>

      <div class="grid2">
        <div class="panel">
          <div class="panel-title">The contract each project is actually under</div>
          <p class="note" style="margin:0 0 12px;">
            ${esc(contract.watch.say)} The daily sweep resolves every recorded site event against that
            project's own contract, so a Z-clause shortening eight weeks to fourteen days changes the
            answer on identical facts. The graph holds structure and periods and never clause text:
            a skeleton is unconfirmed until somebody loads the executed contract.
          </p>
          <table><thead><tr><th>Form</th><th class="rw" style="text-align:right;">Clauses</th></tr></thead>
          <tbody>${contract.forms.map((f) => `<tr><td><b>${esc(f.name)}</b><div class="ev">${esc(f.note)}</div></td><td class="rw" style="text-align:right;">${f.clauses}</td></tr>`).join("")}</tbody></table>
          ${contract.watch.projects.length ? `
            <div class="panel-title" style="margin-top:16px;">Watched</div>
            <table><thead><tr><th>Project</th><th>Form</th><th class="rw" style="text-align:right;">Running</th><th class="rw" style="text-align:right;">Lost</th></tr></thead>
            <tbody>${contract.watch.projects.map((p) => `<tr>
              <td>${esc(p.project)}</td><td>${esc(p.form || "—")}</td>
              <td class="rw" style="text-align:right;">${p.deadlines}</td>
              <td class="rw" style="text-align:right;" class="${p.barred ? "no" : ""}">${p.barred}</td>
            </tr>`).join("")}</tbody></table>
          ` : `<p class="note"><b>No project has a contract recorded.</b> A graph nobody loads is a data structure, and this page says so rather than showing an empty table as a clean result.</p>`}
        </div>
        <div class="panel">
          <div class="panel-title">Memory, and the gate in front of it</div>
          <p class="note" style="margin:0 0 12px;">${esc(memory.say)}</p>
          <table><thead><tr><th>Partition</th><th>An agent may</th><th class="rw" style="text-align:right;">Entries</th></tr></thead>
          <tbody>${memory.partitions.map((p) => `<tr>
            <td><b>${esc(p.name)}</b><div class="ev">${esc(p.say)}</div></td>
            <td>${p.agentMayWrite ? `<span class="yes">write</span>` : p.institutional ? `<span class="no">propose only</span>` : "—"}</td>
            <td class="rw" style="text-align:right;">${p.entries}${p.proposed ? ` <span class="cap-none">+${p.proposed}</span>` : ""}</td>
          </tr>`).join("")}</tbody></table>
          <div class="num-row" style="margin-top:14px;">
            <div class="num ${memory.pending ? "warn" : ""}"><div class="v">${memory.pending}</div><div class="l">Waiting on a person</div></div>
            <div class="num ${memory.ungated ? "warn" : "good"}"><div class="v">${memory.ungated}</div><div class="l">Ungated, must be zero</div></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Ports, and whether the core could tell the adapters apart</div>
        <p class="note" style="margin:0 0 12px;">
          The usual form of "platform-agnostic core" is a description nothing tests. This is the only
          form that can be checked: two genuinely different adapters per port, the same operations
          run through both, and the differences reported. The run below happened on this request.
        </p>
        <div class="grid2">
          <div>
            <table><thead><tr><th>Port</th><th>Adapter</th><th>Conformance</th></tr></thead>
            <tbody>${ports.bound.map((b) => {
              const c = ports.conformance.find((x) => x.port === b.port);
              return `<tr>
                <td><b>${esc(b.name)}</b></td>
                <td>${b.bound ? esc(b.adapter) : `<span class="no">UNBOUND</span>`}</td>
                <td>${c ? (c.ok ? `<span class="yes">${c.steps} operations identical</span>` : `<span class="no">${esc(c.say)}</span>`) : `<span class="ev">not compared on this page</span>`}</td>
              </tr>`;
            }).join("")}</tbody></table>
            <p class="note">${ports.noBusinessLogic.ok
              ? `None of the ${ports.noBusinessLogic.adapters} adapters imports a domain module, and that is enforced by reading them rather than asked for in a comment.`
              : `<span class="no">${esc(ports.noBusinessLogic.faults[0] || "an adapter carries domain logic")}</span>`}</p>
          </div>
          <div>
            <div class="panel-title">Boundaries with no port</div>
            <p class="note" style="margin:0 0 10px;">
              Named rather than omitted. A port with no adapter behind it is a claim rather than a
              capability, and declaring six of those would be the inert list this whole exercise
              exists to remove.
            </p>
            <table><thead><tr><th>Boundary</th><th>State</th></tr></thead>
            <tbody>${ports.unported.map((u) => `<tr>
              <td><b>${esc(u.name)}</b><div class="ev">${esc(u.say)}</div></td>
              <td><span class="state ${u.state === "absent" ? "absent" : "partial"}">${esc(u.state)}</span></td>
            </tr>`).join("")}</tbody></table>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">The eight conditions under which a run stops instead of finishing</div>
        <table><thead><tr><th style="width:230px;">Rule</th><th>Condition</th></tr></thead>
        <tbody>${model.stopRules.map((r) => `<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.say)}</td></tr>`).join("")}</tbody></table>
        <p class="note">
          Checked in that order, because the order is a severity order: an injection buried in a run
          that is also low on budget must report the injection, not the budget. Abstention is a
          successful outcome — a system that cannot say "I could not establish this" makes "here is
          the answer" mean nothing.
        </p>
      </div>
    `;
  }
