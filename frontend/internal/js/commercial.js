/* ETABLIX Control Desk — Commercial OS, Delivery automation and
   Organisation panels. The playbook as working tools: calculators from
   the pricing stack, bid screening against the no-bid triggers, the
   cash-flow architecture with the exposure rule, the EVM payment gate,
   the retention ledger, the GTM account tracker, the document studio,
   and the AI-agent roster with its human approval boundaries. */

const token = sessionStorage.getItem("etablix.token");
const user = JSON.parse(sessionStorage.getItem("etablix.user") || "null");

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
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

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB");
const pill = (v, cls = "") => `<span class="pill ${cls}">${esc(v)}</span>`;
const block = (title, inner) => `<div class="section-block"><h3>${title}</h3>${inner}</div>`;
const wrapT = (t) => `<div class="table-wrap">${t}</div>`;
const isAdmin = user?.role === "admin";

// =====================================================================
// COMMERCIAL OS
// =====================================================================

let cosModel = null;
let cosSection = "pricing";

const COS_SECTIONS = [
  ["pricing", "Pricing studio"],
  ["docs", "Documents"],
  ["bids", "Bid / No-bid"],
  ["cashflow", "Cash-flow desk"],
  ["evm", "EVM gate"],
  ["retention", "Retention"],
  ["gtm", "GTM accounts"],
  ["risks", "Risk register"],
  ["gates", "Gates & set-up"],
];

export async function loadCommercial() {
  if (!cosModel) cosModel = (await api("/api/commercial/model")).model;
  const nav = COS_SECTIONS.map(
    ([id, label]) =>
      `<button class="btn-run" data-cos-nav="${id}" style="${id === cosSection ? "background:var(--ink,#14181d);color:#fff;border-color:var(--ink,#14181d);" : ""}">${label}</button>`
  ).join(" ");
  document.getElementById("commercial-body").innerHTML =
    `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;">${nav}</div><div id="cos-section"><p class="empty-note">Loading…</p></div>`;
  await renderCosSection();
}

async function renderCosSection() {
  const el = document.getElementById("cos-section");
  if (!el) return;
  try {
    const renderers = {
      pricing: cosPricing, docs: cosDocs, bids: cosBids, cashflow: cosCashflow, evm: cosEvm,
      retention: cosRetention, gtm: cosGtm, risks: cosRisks, gates: cosGates,
    };
    el.innerHTML = await renderers[cosSection]();
    if (cosSection === "pricing") wireCalculators();
    if (cosSection === "docs") wireDocStudio();
  } catch (err) {
    el.innerHTML = `<p class="error-note">${esc(err.message)}</p>`;
  }
}

document.addEventListener("click", (e) => {
  const nav = e.target.closest("button[data-cos-nav]");
  if (!nav) return;
  cosSection = nav.dataset.cosNav;
  loadCommercial().catch(() => {});
});

// ---------------------------------------------------------------- pricing

async function cosPricing() {
  const m = cosModel;
  const modelA = `<table><thead><tr><th>Deliverable</th><th>Indicative fee</th><th></th></tr></thead><tbody>${m.modelA.items
    .map(
      (i, idx) =>
        `<tr><td>${esc(i.deliverable)}</td><td><b>${money(i.low)} – ${money(i.high)}</b></td>
        <td><button class="btn-run" data-quote-a="${idx}" title="Opens a pre-filled fee quotation in Documents">Quote this →</button></td></tr>`
    )
    .join("")}</tbody></table>`;

  const modelB = `<table><thead><tr><th>Component</th><th>Basis</th></tr></thead><tbody>${m.modelB.components
    .map((c) => `<tr><td><b>${esc(c.component)}</b></td><td>${esc(c.basis)}</td></tr>`)
    .join("")}</tbody></table><p class="muted" style="margin-top:10px;">${esc(m.modelB.note)}</p>`;

  const bField = (id, label, value, extra = "") =>
    `<label style="display:flex;flex-direction:column;gap:3px;font-size:0.78rem;" class="muted">${label}
      <input type="number" id="${id}" min="0" ${value !== null ? `value="${value}"` : ""} ${extra} style="width:170px;font-size:0.95rem;"></label>`;
  const bCalc = `<div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:12px;">
    ${bField("b-supplier", "Procured supplier value £", null)}
    ${bField("b-months", "Duration (months)", 12, 'min="1"')}
    ${bField("b-proc", "Procurement fee %  (3–5)", 4, 'min="3" max="5" step="0.5"')}
    ${bField("b-monthly", "Monthly management fee £", 15000)}
    ${bField("b-mob", "Mobilisation & planning fee £", 25000)}
    ${bField("b-cx", "CONSTRUX platform £ / month", 2500)}
  </div>
  <div id="b-result"></div>
  <button class="btn-block" id="b-to-quote" style="width:auto;padding:11px 22px;margin-top:12px;">Turn this into a fee proposal (QUO) →</button>`;

  const stackInputs = m.modelC.stack
    .map(
      (s) => `<label style="display:flex;flex-direction:column;gap:3px;font-size:0.78rem;" class="muted">${esc(s.component)} %
      <input type="number" data-c-stack="${s.id}" value="${s.pct}" min="0" max="20" step="0.5" style="width:150px;font-size:0.95rem;"></label>`
    )
    .join("");
  const cCalc = `<div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:12px;align-items:end;">
    <label style="display:flex;flex-direction:column;gap:3px;font-size:0.78rem;" class="muted">Forecast direct supplier cost £
      <input type="number" id="c-direct" min="0" value="1000000" style="width:220px;font-size:0.95rem;"></label>
    ${stackInputs}
  </div><div id="c-result"></div>
  <button class="btn-block" id="c-to-quote" style="width:auto;padding:11px 22px;margin-top:12px;">Draft this as a client price build-up (QUO) →</button>
  <p class="muted" style="margin-top:12px;">${esc(m.modelC.pricingBands)}</p>
  <p class="muted" style="margin-top:6px;">${esc(m.modelC.contingencyRule)}</p>`;

  return (
    `<div class="section-block" style="border-left:3px solid var(--danger,#c0392b);padding-left:16px;"><h3>Naming rule</h3><p class="muted">${esc(m.namingRule)}</p></div>` +
    block(m.modelA.name + " — fee bands · every row opens a ready-made quotation", wrapT(modelA)) +
    block(m.modelB.name, wrapT(modelB)) +
    block("Model B fee builder — price it, then generate the proposal", bCalc) +
    block(m.modelC.name + " — price build-up calculator", cCalc) +
    `<div class="section-block" style="border-left:3px solid var(--amber,#9c7a3c);padding-left:16px;"><h3>The closing discipline</h3><p class="muted">${esc(m.closingDiscipline)}</p></div>`
  );
}

/** Jump to Documents with a pre-filled form — the calculators' output. */
async function openDocPrefill(templateId, data, lines) {
  cosSection = "docs";
  await loadCommercial();
  const tpl = docTemplates.find((t) => t.id === templateId);
  if (!tpl) return;
  const holder = document.getElementById("doc-form-holder");
  holder.innerHTML = docFormHtml(tpl);
  const tbody = document.querySelector("#doc-lines tbody");
  document.getElementById("doc-add-line")?.addEventListener("click", () => tbody.insertAdjacentHTML("beforeend", lineRow()));
  const form = document.getElementById("doc-generate");
  for (const [k, v] of Object.entries(data || {})) {
    const el = form.querySelector(`[name="${k}"]`);
    if (el) el.value = v;
  }
  for (const l of lines || []) {
    tbody.insertAdjacentHTML("beforeend", lineRow());
    const tr = tbody.lastElementChild;
    tr.querySelector('[data-line="description"]').value = l.description;
    tr.querySelector('[data-line="qty"]').value = l.qty;
    tr.querySelector('[data-line="rate"]').value = l.rate;
  }
  if (!(lines || []).length && tbody) tbody.insertAdjacentHTML("beforeend", lineRow());
  holder.scrollIntoView({ behavior: "smooth", block: "start" });
}

function wireCalculators() {
  const num = (id) => Number(document.getElementById(id)?.value) || 0;

  const bParts = () => {
    const sv = num("b-supplier");
    const months = num("b-months") || 1;
    const procPct = Math.min(5, Math.max(3, num("b-proc") || 4));
    return {
      sv, months, procPct,
      mob: num("b-mob"),
      proc: (procPct / 100) * sv,
      monthly: num("b-monthly"),
      mgmt: num("b-monthly") * months,
      cxRate: num("b-cx"),
      cx: num("b-cx") * months,
    };
  };
  const recalcB = () => {
    const p = bParts();
    const total = p.mob + p.proc + p.mgmt + p.cx;
    document.getElementById("b-result").innerHTML = `<div class="table-wrap"><table style="font-size:0.9rem;"><tbody>
       <tr><td>Mobilisation &amp; planning fee</td><td style="text-align:right;"><b>${money(p.mob)}</b></td></tr>
       <tr><td>Procurement fee — ${p.procPct}% of ${money(p.sv)} procured supplier value</td><td style="text-align:right;"><b>${money(p.proc)}</b></td></tr>
       <tr><td>Integration &amp; management — ${p.months} months × ${money(p.monthly)}</td><td style="text-align:right;"><b>${money(p.mgmt)}</b></td></tr>
       <tr><td>CONSTRUX platform &amp; reporting — ${p.months} months × ${money(p.cxRate)}</td><td style="text-align:right;"><b>${money(p.cx)}</b></td></tr>
       <tr><td style="border-top:2px solid currentColor;"><b>Total ETABLIX fee</b> <span class="muted">(excl. embedded personnel &amp; closeout — scoped at appointment)</span></td><td style="border-top:2px solid currentColor;text-align:right;"><b>${money(total)}</b></td></tr>
       </tbody></table></div>${p.sv ? "" : '<p class="muted" style="margin-top:6px;">Enter the procured supplier value above and every line updates live.</p>'}`;
  };

  const cRows = () => {
    const direct = num("c-direct");
    const rows = cosModel.modelC.stack.map((s) => {
      const pct = Number(document.querySelector(`[data-c-stack="${s.id}"]`)?.value) || 0;
      return { ...s, pct, value: (pct / 100) * direct };
    });
    return { direct, rows, addPct: rows.reduce((a, r) => a + r.pct, 0), total: direct + rows.reduce((a, r) => a + r.value, 0) };
  };
  const recalcC = () => {
    const { direct, rows, addPct, total } = cRows();
    document.getElementById("c-result").innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Component</th><th>Rate</th><th>Amount</th><th>What it pays for</th></tr></thead><tbody>
      <tr><td><b>Direct supplier and labour costs</b></td><td>100%</td><td><b>${money(direct)}</b></td><td class="muted">The audited base</td></tr>
      ${rows.map((r) => `<tr><td>${esc(r.component)}</td><td>${r.pct}%</td><td><b>${money(r.value)}</b></td><td class="muted">${esc(r.pays)}</td></tr>`).join("")}
      <tr><td><b>Contract value</b></td><td><b>+${addPct}%</b></td><td><b>${money(total)}</b></td><td></td></tr>
      </tbody></table></div>`;
  };

  ["b-supplier", "b-months", "b-proc", "b-monthly", "b-mob", "b-cx"].forEach((id) =>
    document.getElementById(id)?.addEventListener("input", recalcB));
  document.getElementById("c-direct")?.addEventListener("input", recalcC);
  document.querySelectorAll("[data-c-stack]").forEach((i) => i.addEventListener("input", recalcC));
  recalcB();
  recalcC();

  // Model A rows → a ready-made quotation in Documents.
  document.querySelectorAll("button[data-quote-a]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const item = cosModel.modelA.items[Number(btn.dataset.quoteA)];
      openDocPrefill(
        "quotation",
        { project: item.deliverable, model: "Model A — Advisory", assumptions: "Fixed fee for the defined deliverable. Client-supplied information relied upon as provided. Site visits, travel and expenses included within the UK mainland. Excludes statutory fees and third-party design." },
        [{ description: `${item.deliverable} — fixed fee`, qty: 1, rate: Math.round((item.low + item.high) / 2 / 100) * 100 }]
      );
    })
  );

  // Model B builder → the full fee proposal, lines carried over.
  document.getElementById("b-to-quote")?.addEventListener("click", () => {
    const p = bParts();
    openDocPrefill(
      "quotation",
      { model: "Model B — Management Integrator", assumptions: `Based on a procured supplier value of ${money(p.sv)} over ${p.months} months. Supplier contracts remain with the client. Embedded site personnel at cost + agreed margin and the demobilisation fee are scoped at appointment. Fees exclude VAT.` },
      [
        { description: "Mobilisation and planning fee (fixed)", qty: 1, rate: p.mob },
        { description: `Procurement fee — ${p.procPct}% of procured supplier value`, qty: 1, rate: Math.round(p.proc) },
        { description: "Monthly integration and management fee", qty: p.months, rate: p.monthly },
        { description: "CONSTRUX platform and reporting (per month)", qty: p.months, rate: p.cxRate },
      ]
    );
  });

  // Model C stack → the transparent price build-up as a client document.
  document.getElementById("c-to-quote")?.addEventListener("click", () => {
    const { direct, rows } = cRows();
    openDocPrefill(
      "quotation",
      { model: "Model C — Prime Service Contractor", assumptions: "Transparent price build-up on forecast direct supplier cost. Contingency is held against a joint risk register with a defined drawdown process; unused contingency is returned or shared per the agreed mechanism. Subject to the mobilisation advance and rolling-reserve provisions. Excludes VAT." },
      [
        { description: "Direct supplier and labour costs (forecast, audited base)", qty: 1, rate: direct },
        ...rows.map((r) => ({ description: `${r.component} — ${r.pct}% on direct cost`, qty: 1, rate: Math.round(r.value) })),
      ]
    );
  });
}

// ------------------------------------------------------------------- docs

let docTemplates = [];

async function cosDocs() {
  const [{ templates }, { documents }, billingRes] = await Promise.all([
    api("/api/docs/templates"),
    api("/api/docs"),
    api("/api/docs/billing").catch(() => null),
  ]);
  docTemplates = templates;

  const picker = templates
    .map((t) => `<button class="btn-run" data-doc-tpl="${t.id}" style="text-align:left;display:block;width:100%;margin-bottom:6px;"><b>${esc(t.name)}</b> <span class="muted">(${t.prefix})</span><br><span class="muted" style="font-weight:400;">${esc(t.description)}</span></button>`)
    .join("");

  const registry = documents.length
    ? wrapT(`<table><thead><tr><th>Number</th><th>Type</th><th>Party</th><th>Title</th><th>Value</th><th>Issued</th><th></th></tr></thead><tbody>${documents
        .map(
          (d) => `<tr><td><b>${esc(d.number)}</b></td><td>${esc(d.templateName)}</td><td>${esc(d.party)}</td><td class="muted">${esc(d.title)}</td><td>${d.total ? money(d.total) : "—"}</td><td class="muted">${new Date(d.createdAt).toLocaleDateString("en-GB")} · ${esc(d.issuedBy)}</td>
          <td style="white-space:nowrap;"><a class="btn-run" style="text-decoration:none;display:inline-block;" href="/api/docs/${d.id}/render?token=${encodeURIComponent(token)}" target="_blank" rel="noopener">Open</a>${isAdmin ? ` <button class="btn-run" data-doc-del="${d.id}">Delete</button>` : ""}</td></tr>`
        )
        .join("")}</tbody></table>`)
    : '<p class="empty-note">No documents generated yet — pick a template above. Every generated document is numbered and registered here.</p>';

  const b = billingRes?.billing || {};
  const billingForm = `<form id="doc-billing" class="team-form" style="flex-wrap:wrap;">
      <input name="accountName" value="${esc(b.accountName || "")}" placeholder="Account name">
      <input name="bankName" value="${esc(b.bankName || "")}" placeholder="Bank">
      <input name="sortCode" value="${esc(b.sortCode || "")}" placeholder="Sort code">
      <input name="accountNumber" value="${esc(b.accountNumber || "")}" placeholder="Account number">
      <input name="vatNumber" value="${esc(b.vatNumber || "")}" placeholder="VAT number (when registered)">
      <input name="paymentTermsDays" type="number" value="${b.paymentTermsDays || 14}" min="1" max="90" placeholder="Terms (days)" style="max-width:110px;">
      <button class="btn-block" type="submit" style="width:auto;padding:11px 18px;" ${isAdmin ? "" : "disabled title='Administrator only'"}>Save</button>
    </form><p class="muted" style="margin-top:6px;">Bank details print on invoices and applications. Stored server-side; administrator edits only.</p>`;

  return (
    block("Generate a document", `<div style="max-width:640px;">${picker}</div><div id="doc-form-holder" style="margin-top:14px;"></div>`) +
    block("Document register — everything issued, numbered", registry) +
    block("Billing settings", billingForm)
  );
}

function docFormHtml(tpl) {
  const field = (f) => {
    if (f.type === "lines") {
      return `<div class="section-block"><h3>${esc(f.label)}</h3>
        <table id="doc-lines" style="width:100%;font-size:0.9rem;"><thead><tr><th style="text-align:left;">Description</th><th style="width:90px;">Qty</th><th style="width:130px;">Rate / value £</th><th style="width:36px;"></th></tr></thead>
        <tbody></tbody></table>
        <button type="button" class="btn-run" id="doc-add-line" style="margin-top:8px;">+ Add line</button></div>`;
    }
    const req = f.required ? "required" : "";
    if (f.type === "textarea") return `<div style="margin-bottom:10px;"><label class="muted" style="font-size:0.8rem;">${esc(f.label)}</label><textarea name="${f.name}" ${req} style="width:100%;min-height:70px;padding:10px 12px;border:1.5px solid var(--line);border-radius:7px;font-family:inherit;font-size:0.9rem;"></textarea></div>`;
    if (f.type === "select") {
      const opts = (f.options || []).map((o, i) => `<option value="${esc(o)}">${esc((f.labels || f.options)[i])}</option>`).join("");
      return `<div style="margin-bottom:10px;"><label class="muted" style="font-size:0.8rem;">${esc(f.label)}</label><br><select name="${f.name}">${opts}</select></div>`;
    }
    return `<div style="margin-bottom:10px;"><label class="muted" style="font-size:0.8rem;">${esc(f.label)}</label><br><input name="${f.name}" type="${f.type}" ${req} placeholder="${esc(f.placeholder || "")}" style="min-width:280px;"></div>`;
  };
  return `<form id="doc-generate" data-template="${tpl.id}" class="section-block" style="border:1.5px solid var(--amber,#9c7a3c);border-radius:10px;padding:18px 20px;">
    <h3>${esc(tpl.name)}</h3>
    ${tpl.fields.map(field).join("")}
    <button class="btn-block" type="submit" style="width:auto;padding:12px 24px;">Generate ${esc(tpl.prefix)} document</button>
    <div class="login-error" id="doc-error" style="margin-top:10px;"></div>
  </form>`;
}

const lineRow = () =>
  `<tr><td><input data-line="description" style="width:100%;"></td><td><input data-line="qty" type="number" value="1" min="0" step="0.01" style="width:80px;"></td><td><input data-line="rate" type="number" min="0" step="0.01" style="width:120px;"></td><td><button type="button" class="btn-run" data-line-del>×</button></td></tr>`;

function wireDocStudio() {
  document.querySelectorAll("button[data-doc-tpl]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const tpl = docTemplates.find((t) => t.id === btn.dataset.docTpl);
      document.getElementById("doc-form-holder").innerHTML = docFormHtml(tpl);
      const tbody = document.querySelector("#doc-lines tbody");
      if (tbody) {
        tbody.insertAdjacentHTML("beforeend", lineRow());
        document.getElementById("doc-add-line").addEventListener("click", () => tbody.insertAdjacentHTML("beforeend", lineRow()));
      }
      document.getElementById("doc-form-holder").scrollIntoView({ behavior: "smooth", block: "start" });
    })
  );
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-line-del]")) e.target.closest("tr").remove();
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#doc-generate");
  if (!form) return;
  e.preventDefault();
  const errEl = document.getElementById("doc-error");
  errEl.classList.remove("show");
  const data = {};
  for (const el of form.querySelectorAll("input[name], textarea[name], select[name]")) data[el.name] = el.value;
  data.lines = [...form.querySelectorAll("#doc-lines tbody tr")].map((tr) => ({
    description: tr.querySelector('[data-line="description"]')?.value || "",
    qty: tr.querySelector('[data-line="qty"]')?.value,
    rate: tr.querySelector('[data-line="rate"]')?.value,
  }));
  try {
    const { document: doc } = await api("/api/docs/generate", {
      method: "POST",
      body: JSON.stringify({ template: form.dataset.template, data }),
    });
    window.open(`/api/docs/${doc.id}/render?token=${encodeURIComponent(token)}`, "_blank");
    cosSection = "docs";
    renderCosSection();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add("show");
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#doc-billing");
  if (!form) return;
  e.preventDefault();
  try {
    const body = Object.fromEntries([...form.querySelectorAll("input[name]")].map((i) => [i.name, i.value]));
    await api("/api/docs/billing", { method: "PUT", body: JSON.stringify(body) });
    alert("Billing settings saved.");
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("click", async (e) => {
  const del = e.target.closest("button[data-doc-del]");
  if (!del) return;
  if (!confirm("Remove this document from the register? The number is not reused.")) return;
  try {
    await api(`/api/docs/${del.dataset.docDel}`, { method: "DELETE" });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

// ------------------------------------------------------------------- bids

async function cosBids() {
  const { opportunities, triggers } = await api("/api/commercial/opportunities");
  const vPill = (v) =>
    v === "BID" ? pill("BID", "approved") : v === "NO-BID" ? pill("NO-BID", "declined") : pill("BLOCKED BY PRIME GATES", "");
  const cards = opportunities.length
    ? opportunities
        .map(
          (o) => `<div class="section-block" data-opp="${o.id}">
          <h3>${esc(o.name)} <span class="muted" style="font-weight:400;">· ${esc(o.client || "—")} · Model ${o.model}${o.value ? " · " + money(o.value) : ""}</span> ${vPill(o.verdict)}</h3>
          <p class="muted" style="margin:4px 0 10px;">Tick any trigger that applies — a single tick is a NO-BID. Screened by ${esc(o.screenedBy || "—")}.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:6px;">
            ${triggers.map((t) => `<label style="display:flex;gap:8px;font-size:0.86rem;align-items:flex-start;"><input type="checkbox" data-opp-trigger="${t.id}" data-opp-id="${o.id}" ${o.triggers?.[t.id] ? "checked" : ""} style="margin-top:3px;">${esc(t.text)}</label>`).join("")}
          </div>
          ${o.verdict === "BLOCKED-BY-GATES" ? `<p class="muted" style="margin-top:10px;color:var(--amber,#9c7a3c);"><b>Model C:</b> ${o.missingGates.length} of 6 prime-bid gates incomplete — see Gates &amp; set-up. Prime is bid only through the gates.</p>` : ""}
          ${isAdmin ? `<button class="btn-run" data-opp-del="${o.id}" style="margin-top:10px;">Delete</button>` : ""}
        </div>`
        )
        .join("")
    : '<p class="empty-note">No opportunities screened yet — every bid decision starts here.</p>';

  return (
    block(
      "Screen a new opportunity",
      `<form id="opp-form" class="team-form" style="flex-wrap:wrap;">
        <input name="name" required placeholder="Opportunity — e.g. Substation compound, NE England" style="flex:2;">
        <input name="client" placeholder="Client">
        <select name="model"><option value="A">Model A — Advisory</option><option value="B" selected>Model B — Integrator</option><option value="C">Model C — Prime</option></select>
        <input name="value" type="number" min="0" placeholder="Est. value £">
        <button class="btn-block" type="submit" style="width:auto;padding:12px 20px;">Screen it</button>
      </form>`
    ) + cards
  );
}

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#opp-form");
  if (!form) return;
  e.preventDefault();
  try {
    await api("/api/commercial/opportunities", {
      method: "POST",
      body: JSON.stringify({ name: form.name.value, client: form.client.value, model: form.model.value, value: form.value.value }),
    });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("change", async (e) => {
  const cb = e.target.closest("input[data-opp-trigger]");
  if (!cb) return;
  const card = cb.closest("[data-opp]");
  const triggers = {};
  card.querySelectorAll("input[data-opp-trigger]").forEach((i) => (triggers[i.dataset.oppTrigger] = i.checked));
  try {
    await api(`/api/commercial/opportunities/${cb.dataset.oppId}`, { method: "PATCH", body: JSON.stringify({ triggers }) });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("click", async (e) => {
  const del = e.target.closest("button[data-opp-del]");
  if (!del) return;
  if (!confirm("Delete this screened opportunity?")) return;
  await api(`/api/commercial/opportunities/${del.dataset.oppDel}`, { method: "DELETE" }).catch((err) => alert(err.message));
  renderCosSection();
});

// --------------------------------------------------------------- cash-flow

async function cosCashflow() {
  const m = cosModel;
  const { valuations, cycle } = await api("/api/commercial/valuations");

  const advCalc = `<div class="team-form" style="flex-wrap:wrap;">
      <input type="number" id="adv-m1" placeholder="Forecast Month-1 supplier spend £" min="0" style="flex:1.5;">
      <input type="number" id="adv-mob" placeholder="Mobilisation fee £" min="0">
      <input type="number" id="adv-mgmt" placeholder="Month-1 management fee £" min="0">
      <input type="number" id="adv-early" placeholder="Early procurement commitments £" min="0">
      <input type="number" id="adv-cont" placeholder="Early-risk contingency £" min="0">
      <select id="adv-vat"><option value="0.2">Standard VAT 20%</option><option value="0">Reverse charge / no VAT</option></select>
    </div>
    <div id="adv-result" class="muted" style="margin-top:8px;"></div>
    <p class="muted" style="margin-top:10px;"><b>Before any supplier PO:</b> ${esc(m.cashflow.preconditions)}</p>`;

  const stepChip = (v, s) => {
    const done = v.steps?.[s.id]?.done;
    return `<button class="btn-run" data-val-step="${s.id}" data-val-id="${v.id}" title="${esc(s.label)}${done ? ` — done by ${esc(v.steps[s.id].by)}` : ""}" style="${done ? "background:var(--ok,#1f9d61);color:#fff;border-color:var(--ok,#1f9d61);" : ""}">${esc(s.label.split(" — ")[0])}</button>`;
  };
  const amount = (v, k, label) =>
    `<label style="font-size:0.78rem;" class="muted">${label}<br><input type="number" data-val-amount="${k}" data-val-id="${v.id}" value="${v[k] || 0}" min="0" style="width:150px;"></label>`;

  const rows = valuations.length
    ? valuations
        .map(
          (v) => `<div class="section-block">
        <h3>${esc(v.project)} <span class="muted" style="font-weight:400;">· ${v.month}</span>
        ${v.exposureOk ? pill("EXPOSURE OK", "approved") : pill("EXPOSURE BREACH", "declined")}
        ${v.reserveOk ? pill("RESERVE OK", "approved") : pill("RESERVE SHORT", "declined")}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;">${cycle.map((s) => stepChip(v, s)).join("")}</div>
        <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:end;">
          ${amount(v, "reserveHeld", "Cash reserve held £")}
          ${amount(v, "forecastNext", "Next month forecast committed £")}
          ${amount(v, "committedExposure", "Committed supplier exposure £")}
          ${amount(v, "receivables", "Confirmed receivables (inv-grade) £")}
          <span class="muted" style="font-size:0.82rem;">Cover: <b>${money(v.cover)}</b></span>
        </div>
      </div>`
        )
        .join("")
    : '<p class="empty-note">No valuation cycles yet — open one per project per month; the exposure rule is checked live and by the automation engine.</p>';

  return (
    block("Mobilisation advance calculator", advCalc) +
    block(
      "Open a monthly valuation cycle",
      `<form id="val-form" class="team-form">
        <input name="project" required placeholder="Project" style="flex:2;">
        <input name="month" required placeholder="Month (YYYY-MM)" pattern="\\d{4}-\\d{2}">
        <button class="btn-block" type="submit" style="width:auto;padding:12px 20px;">Open cycle</button>
      </form>
      <p class="muted" style="margin-top:8px;">${esc(m.cashflow.legal)}</p>
      <p class="muted" style="margin-top:6px;"><b>The exposure rule:</b> ${esc(m.cashflow.exposureRule)}</p>
      <p class="muted" style="margin-top:6px;"><b>Tax mechanics:</b> ${esc(m.cashflow.tax)}</p>`
    ) +
    rows
  );
}

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#val-form");
  if (!form) return;
  e.preventDefault();
  try {
    await api("/api/commercial/valuations", { method: "POST", body: JSON.stringify({ project: form.project.value, month: form.month.value }) });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("click", async (e) => {
  const chip = e.target.closest("button[data-val-step]");
  if (!chip) return;
  const done = !chip.style.background.includes("var(--ok") && !chip.style.backgroundColor;
  try {
    await api(`/api/commercial/valuations/${chip.dataset.valId}`, {
      method: "PATCH",
      body: JSON.stringify({ step: chip.dataset.valStep, done: !chip.title.includes("done by") }),
    });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("change", async (e) => {
  const inp = e.target.closest("input[data-val-amount]");
  if (!inp) return;
  try {
    await api(`/api/commercial/valuations/${inp.dataset.valId}`, {
      method: "PATCH",
      body: JSON.stringify({ [inp.dataset.valAmount]: inp.value }),
    });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("input", (e) => {
  if (!["adv-m1", "adv-mob", "adv-mgmt", "adv-early", "adv-cont", "adv-vat"].includes(e.target.id)) return;
  const g = (id) => Number(document.getElementById(id)?.value) || 0;
  const net = g("adv-m1") + g("adv-mob") + g("adv-mgmt") + g("adv-early") + g("adv-cont");
  const vat = net * (Number(document.getElementById("adv-vat")?.value) || 0);
  document.getElementById("adv-result").innerHTML = net
    ? `Mobilisation advance to invoice before any supplier order: <b>${money(net + vat)}</b> <span class="muted">(net ${money(net)}${vat ? ` + VAT ${money(vat)}` : " — reverse charge / no VAT"})</span>`
    : "";
});

// -------------------------------------------------------------------- EVM

async function cosEvm() {
  const { records, rule, applicationContents } = await api("/api/commercial/evm");
  const table = records.length
    ? wrapT(`<table><thead><tr><th>Project</th><th>Supplier</th><th>Period</th><th>PV</th><th>EV</th><th>AC</th><th>SPI</th><th>CPI</th><th>Gate</th><th>Evidence</th>${isAdmin ? "<th></th>" : ""}</tr></thead><tbody>${records
        .map(
          (r) => `<tr><td>${esc(r.project)}</td><td><b>${esc(r.supplier)}</b></td><td>${r.period}</td>
          <td>${money(r.pv)}</td><td>${money(r.ev)}</td><td>${money(r.ac)}</td>
          <td><b>${r.spi ?? "—"}</b></td><td><b>${r.cpi ?? "—"}</b></td>
          <td>${r.gate === "pass" ? pill("PAY", "approved") : pill("REVIEW", "declined")}</td>
          <td class="muted">${esc(r.evidence || "—")}</td>
          ${isAdmin ? `<td><button class="btn-run" data-evm-del="${r.id}">Delete</button></td>` : ""}</tr>`
        )
        .join("")}</tbody></table>`)
    : '<p class="empty-note">No EVM positions yet. Suppliers are paid on Earned Value — enter each supplier\'s PV / EV / AC per period and the gate decides.</p>';
  return (
    block(
      "Record a supplier EVM position",
      `<form id="evm-form" class="team-form" style="flex-wrap:wrap;">
        <input name="project" required placeholder="Project">
        <input name="supplier" required placeholder="Supplier">
        <input name="period" required placeholder="Period (YYYY-MM)" pattern="\\d{4}-\\d{2}" style="max-width:140px;">
        <input name="pv" type="number" required min="0" placeholder="Planned value £">
        <input name="ev" type="number" required min="0" placeholder="Earned value £">
        <input name="ac" type="number" required min="0" placeholder="Actual cost £">
        <input name="evidence" placeholder="Evidence — measures, milestones, photos ref" style="flex:2;">
        <button class="btn-block" type="submit" style="width:auto;padding:12px 20px;">Assess</button>
      </form>
      <p class="muted" style="margin-top:8px;">${esc(rule)}</p>`
    ) +
    block("EVM positions — the payment gate", table) +
    block("Monthly supplier application must contain", `<p class="muted">${applicationContents.map(esc).join(" · ")}</p>`)
  );
}

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#evm-form");
  if (!form) return;
  e.preventDefault();
  try {
    const body = Object.fromEntries([...form.querySelectorAll("input[name]")].map((i) => [i.name, i.value]));
    await api("/api/commercial/evm", { method: "POST", body: JSON.stringify(body) });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("click", async (e) => {
  const del = e.target.closest("button[data-evm-del]");
  if (!del) return;
  await api(`/api/commercial/evm/${del.dataset.evmDel}`, { method: "DELETE" }).catch((err) => alert(err.message));
  renderCosSection();
});

// --------------------------------------------------------------- retention

async function cosRetention() {
  const { retentions, rule } = await api("/api/commercial/retentions");
  const table = retentions.length
    ? wrapT(`<table><thead><tr><th>Project / supplier</th><th>Contract</th><th>Certified</th><th>Held</th><th>Instrument</th><th>PC release (2.5%)</th><th>Final release (2.5%)</th></tr></thead><tbody>${retentions
        .map(
          (r) => `<tr><td>${esc(r.project)}<div class="muted"><b>${esc(r.supplier)}</b></div></td>
          <td>${money(r.contractValue)}</td><td>${money(r.certifiedToDate)}</td><td><b>${money(r.retentionHeld)}</b></td>
          <td>${esc(r.instrument)}</td>
          <td>${r.pcReleased ? pill("Released", "approved") : `<button class="btn-run" data-ret-release="pcReleased" data-ret-id="${r.id}">Release ${money(r.trancheValue)}</button>`}</td>
          <td>${r.finalReleased ? pill("Released", "approved") : `<button class="btn-run" data-ret-release="finalReleased" data-ret-id="${r.id}">Release ${money(r.trancheValue)}</button>${r.defectsEndDate ? `<div class="muted" style="font-size:0.72rem;">defects end ${esc(r.defectsEndDate)}</div>` : ""}`}</td></tr>`
        )
        .join("")}</tbody></table>`)
    : '<p class="empty-note">No retention positions held yet.</p>';
  return (
    block(
      "Open a retention position",
      `<form id="ret-form" class="team-form" style="flex-wrap:wrap;">
        <input name="project" required placeholder="Project">
        <input name="supplier" required placeholder="Supplier">
        <input name="contractValue" type="number" min="0" required placeholder="Supplier contract value £">
        <input name="certifiedToDate" type="number" min="0" placeholder="Certified to date £">
        <select name="instrument">${cosModel.retention.alternatives.map((a) => `<option ${a === "Cash retention" ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
        <input name="defectsEndDate" type="date" title="Defects period end">
        <button class="btn-block" type="submit" style="width:auto;padding:12px 20px;">Add</button>
      </form>
      <p class="muted" style="margin-top:8px;">${esc(rule.rule)} Prefer alternatives — ${rule.alternatives.slice(0, 6).map(esc).join(", ")} — and reduced or zero retention for proven framework suppliers. ${esc(rule.check)}</p>`
    ) + block("Retention ledger — 5% capped, 2.5% + 2.5% releases computed", table)
  );
}

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#ret-form");
  if (!form) return;
  e.preventDefault();
  try {
    const body = Object.fromEntries([...form.querySelectorAll("input[name],select[name]")].map((i) => [i.name, i.value]));
    await api("/api/commercial/retentions", { method: "POST", body: JSON.stringify(body) });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("click", async (e) => {
  const rel = e.target.closest("button[data-ret-release]");
  if (!rel) return;
  if (!confirm("Certify this retention tranche for release? Verify defects status first.")) return;
  try {
    await api(`/api/commercial/retentions/${rel.dataset.retId}`, { method: "PATCH", body: JSON.stringify({ [rel.dataset.retRelease]: true }) });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

// -------------------------------------------------------------------- GTM

async function cosGtm() {
  const { accounts, stages, kpis } = await api("/api/commercial/accounts");
  const m = cosModel.gtm;
  const kpiRow = `<div class="kpis">
    <div class="kpi accent"><b>${kpis.total} / ${kpis.target}</b><span>Named accounts</span></div>
    <div class="kpi"><b>${kpis.inConversation}</b><span>In conversation</span></div>
    <div class="kpi"><b>${kpis.proposalsThisMonth} / 2</b><span>Proposals this month (target 2)</span></div>
    <div class="kpi green"><b>${kpis.clients}</b><span>Clients won</span></div>
    <div class="kpi"><b>${kpis.overdueActions}</b><span>Overdue next actions</span></div>
  </div>`;
  const stageSel = (a) =>
    `<select data-acc-stage="${a.id}">${stages.map((s) => `<option value="${s}" ${s === a.stage ? "selected" : ""}>${s.replace(/_/g, " ")}</option>`).join("")}</select>`;
  const table = accounts.length
    ? wrapT(`<table><thead><tr><th>Account</th><th>Contact</th><th>Relationship</th><th>Stage</th><th>Next action</th><th>Owner</th>${isAdmin ? "<th></th>" : ""}</tr></thead><tbody>${accounts
        .map(
          (a) => `<tr><td><b>${esc(a.company)}</b><div class="muted">${esc(a.sector || "")}</div></td>
          <td>${esc(a.contact || "—")}<div class="muted">${esc(a.contactRole || "")}</div></td>
          <td class="muted">${esc(a.relationship || "—")}</td>
          <td>${stageSel(a)}</td>
          <td><input data-acc-action="${a.id}" value="${esc(a.nextAction || "")}" placeholder="Next action" style="width:170px;"><br><input type="date" data-acc-date="${a.id}" value="${esc(a.nextActionDate || "")}" style="margin-top:4px;"></td>
          <td class="muted">${esc(a.owner)}</td>
          ${isAdmin ? `<td><button class="btn-run" data-acc-del="${a.id}">Delete</button></td>` : ""}</tr>`
        )
        .join("")}</tbody></table>`)
    : '<p class="empty-note">The account list is the market — add the first named account. Target: 20–30 people who already know the pain.</p>';
  return (
    kpiRow +
    block(
      "Add a named account",
      `<form id="acc-form" class="team-form" style="flex-wrap:wrap;">
        <input name="company" required placeholder="Company" style="flex:1.4;">
        <input name="contact" placeholder="Contact name">
        <input name="contactRole" placeholder="Their role">
        <input name="sector" placeholder="Sector">
        <input name="relationship" placeholder="Relationship — e.g. GEV alumni, EPC supply chain">
        <button class="btn-block" type="submit" style="width:auto;padding:12px 20px;">Add account</button>
      </form>
      <p class="muted" style="margin-top:8px;"><b>The thesis:</b> ${esc(m.thesis)}</p>
      <p class="muted" style="margin-top:6px;"><b>Cadence:</b> ${esc(m.cadence)}</p>`
    ) +
    block("Named accounts", table) +
    block("The asset stack — each asset's GTM job", wrapT(`<table><tbody>${m.assets.map((a) => `<tr><td style="white-space:nowrap;"><b>${esc(a.asset)}</b></td><td class="muted">${esc(a.role)}</td></tr>`).join("")}</tbody></table>`)) +
    block("24-month phases", wrapT(`<table><tbody>${m.phases.map((p) => `<tr><td style="white-space:nowrap;"><b>${esc(p.phase)}</b></td><td class="muted">${esc(p.target)}</td></tr>`).join("")}</tbody></table>`))
  );
}

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#acc-form");
  if (!form) return;
  e.preventDefault();
  try {
    const body = Object.fromEntries([...form.querySelectorAll("input[name]")].map((i) => [i.name, i.value]));
    await api("/api/commercial/accounts", { method: "POST", body: JSON.stringify(body) });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("change", async (e) => {
  const stage = e.target.closest("select[data-acc-stage]");
  const action = e.target.closest("input[data-acc-action]");
  const date = e.target.closest("input[data-acc-date]");
  const el = stage || action || date;
  if (!el) return;
  const id = stage?.dataset.accStage || action?.dataset.accAction || date?.dataset.accDate;
  const body = stage ? { stage: stage.value } : action ? { nextAction: action.value } : { nextActionDate: date.value };
  try {
    await api(`/api/commercial/accounts/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    if (stage) renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("click", async (e) => {
  const del = e.target.closest("button[data-acc-del]");
  if (!del) return;
  if (!confirm("Delete this account from the tracker?")) return;
  await api(`/api/commercial/accounts/${del.dataset.accDel}`, { method: "DELETE" }).catch((err) => alert(err.message));
  renderCosSection();
});

// ------------------------------------------------------------------- risks

async function cosRisks() {
  const { risks } = await api("/api/commercial/risks");
  const table = wrapT(`<table><thead><tr><th>Top risk</th><th>Mitigation</th><th>Owner</th><th>Status</th></tr></thead><tbody>${risks
    .map(
      (r) => `<tr><td><b>${esc(r.risk)}</b></td><td class="muted">${esc(r.mitigation)}</td><td>${esc(r.owner)}</td>
      <td><select data-risk-status="${r.id}">${["open", "mitigated", "closed"].map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`
    )
    .join("")}</tbody></table>`);
  return (
    block("Enterprise risk register", table) +
    block(
      "Add a risk",
      `<form id="erisk-form" class="team-form" style="flex-wrap:wrap;">
        <input name="risk" required placeholder="Risk" style="flex:1.5;">
        <input name="mitigation" placeholder="Mitigation" style="flex:2;">
        <input name="owner" placeholder="Owner">
        <button class="btn-block" type="submit" style="width:auto;padding:12px 20px;">Add</button>
      </form>`
    )
  );
}

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#erisk-form");
  if (!form) return;
  e.preventDefault();
  try {
    const body = Object.fromEntries([...form.querySelectorAll("input[name]")].map((i) => [i.name, i.value]));
    await api("/api/commercial/risks", { method: "POST", body: JSON.stringify(body) });
    renderCosSection();
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("change", async (e) => {
  const sel = e.target.closest("select[data-risk-status]");
  if (!sel) return;
  await api(`/api/commercial/risks/${sel.dataset.riskStatus}`, { method: "PATCH", body: JSON.stringify({ status: sel.value }) }).catch((err) => alert(err.message));
});

// ------------------------------------------------------------------- gates

async function cosGates() {
  const [{ gates }, { workstreams }] = await Promise.all([api("/api/commercial/gates"), api("/api/commercial/setup")]);
  const done = gates.filter((g) => g.done).length;
  const gateRows = gates
    .map(
      (g) => `<label style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line);font-size:0.9rem;">
      <input type="checkbox" data-gate="${g.id}" ${g.done ? "checked" : ""} style="margin-top:3px;">
      <span>${esc(g.text)}${g.done ? ` <span class="muted" style="font-size:0.75rem;">— passed by ${esc(g.by)} ${new Date(g.at).toLocaleDateString("en-GB")}</span>` : ""}</span></label>`
    )
    .join("");
  const setup = workstreams
    .map((w) => {
      const wDone = w.items.filter((i) => i.done).length;
      return `<details ${wDone < w.items.length ? "" : ""} style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:600;">${esc(w.workstream)} <span class="muted">· ${wDone}/${w.items.length}</span></summary>
      ${w.items.map((i) => `<label style="display:flex;gap:10px;align-items:flex-start;padding:6px 0 6px 16px;font-size:0.88rem;"><input type="checkbox" data-setup="${i.id}" ${i.done ? "checked" : ""} style="margin-top:3px;"><span>${esc(i.text)}${i.done ? ` <span class="muted" style="font-size:0.75rem;">— ${esc(i.by)}</span>` : ""}</span></label>`).join("")}</details>`;
    })
    .join("");
  return (
    block(`Prime-bid gates — ${done}/6 passed ${done === 6 ? pill("PRIME UNLOCKED", "approved") : pill("PRIME LOCKED", "")}`, gateRows + `<p class="muted" style="margin-top:10px;">All six gates must pass before the first Prime Service Contractor bid. The bid screen enforces this automatically on Model C opportunities.</p>`) +
    block("Company set-up checklist", setup)
  );
}

document.addEventListener("change", async (e) => {
  const gate = e.target.closest("input[data-gate]");
  const setup = e.target.closest("input[data-setup]");
  if (!gate && !setup) return;
  try {
    if (gate) await api(`/api/commercial/gates/${gate.dataset.gate}`, { method: "PATCH", body: JSON.stringify({ done: gate.checked }) });
    else await api(`/api/commercial/setup/${setup.dataset.setup}`, { method: "PATCH", body: JSON.stringify({ done: setup.checked }) });
  } catch (err) {
    alert(err.message);
    renderCosSection();
  }
});

// =====================================================================
// AUTOMATION
// =====================================================================

export async function loadAutomation() {
  const s = await api("/api/automation");
  const badge = document.getElementById("automation-badge");
  if (badge) badge.innerHTML = s.config.enabled ? pill("ACTIVE", "approved") : pill("PAUSED", "declined");

  const fmt = (ts) => (ts ? new Date(ts).toLocaleString("en-GB") : "—");
  const kpis = `<div class="kpis">
    <div class="kpi ${s.config.enabled ? "green" : ""}"><b>${s.config.enabled ? "ON" : "OFF"}</b><span>Engine</span></div>
    <div class="kpi"><b>${s.config.intervalMin}m</b><span>Sweep interval</span></div>
    <div class="kpi"><b>${fmt(s.lastRunAt)}</b><span>Last run</span></div>
    <div class="kpi accent"><b>${fmt(s.nextRunAt)}</b><span>Next run</span></div>
  </div>`;

  const controls = isAdmin
    ? `<div class="team-form" style="margin-bottom:14px;">
        <button class="btn-run" id="auto-toggle">${s.config.enabled ? "Pause engine" : "Start engine"}</button>
        <input type="number" id="auto-interval" min="15" max="1440" value="${s.config.intervalMin}" style="max-width:110px;" title="Minutes between sweeps">
        <button class="btn-run" id="auto-interval-save">Set interval</button>
        <button class="btn-block" id="auto-run" style="width:auto;padding:11px 20px;">Run a sweep now</button>
      </div>`
    : '<p class="muted" style="margin-bottom:14px;">Rule changes and manual runs are administrator actions.</p>';

  const rules = wrapT(`<table><thead><tr><th>Rule</th><th>What it does</th><th>Status</th></tr></thead><tbody>${s.rules
    .map(
      (r) => `<tr><td><b>${esc(r.name)}</b></td><td class="muted">${esc(r.description)}</td>
      <td>${isAdmin ? `<select data-auto-rule="${r.id}"><option value="on" ${r.enabled ? "selected" : ""}>enabled</option><option value="off" ${r.enabled ? "" : "selected"}>disabled</option></select>` : r.enabled ? pill("enabled", "approved") : pill("disabled", "")}</td></tr>`
    )
    .join("")}</tbody></table>`);

  const runs = s.runs.length
    ? wrapT(`<table><thead><tr><th>When</th><th>Trigger</th><th>Checks</th><th>Findings fired</th></tr></thead><tbody>${s.runs
        .map(
          (r) => `<tr><td class="muted" style="white-space:nowrap;">${fmt(r.createdAt)}</td><td>${pill(r.trigger, r.trigger === "manual" ? "approved" : "")}</td>
          <td class="muted" style="font-size:0.8rem;">${(r.checks || []).map(esc).join("<br>")}</td>
          <td>${(r.findings || []).length ? r.findings.map((f) => `<div>${esc(f)}</div>`).join("") : '<span class="muted">nothing to raise</span>'}</td></tr>`
        )
        .join("")}</tbody></table>`)
    : '<p class="empty-note">No sweeps recorded yet — the first runs about 90 seconds after the server starts.</p>';

  document.getElementById("automation-body").innerHTML =
    kpis + controls + block("Rules — every finding fires a real catalogued event", rules) + block("Run log", runs);

  if (isAdmin) {
    document.getElementById("auto-toggle")?.addEventListener("click", async () => {
      await api("/api/automation/config", { method: "PATCH", body: JSON.stringify({ enabled: !s.config.enabled }) }).catch((err) => alert(err.message));
      loadAutomation();
    });
    document.getElementById("auto-interval-save")?.addEventListener("click", async () => {
      await api("/api/automation/config", { method: "PATCH", body: JSON.stringify({ intervalMin: document.getElementById("auto-interval").value }) }).catch((err) => alert(err.message));
      loadAutomation();
    });
    document.getElementById("auto-run")?.addEventListener("click", async (e) => {
      e.target.disabled = true;
      e.target.textContent = "Sweeping…";
      try {
        await api("/api/automation/run", { method: "POST" });
      } catch (err) {
        alert(err.message);
      }
      loadAutomation();
    });
  }
}

document.addEventListener("change", async (e) => {
  const sel = e.target.closest("select[data-auto-rule]");
  if (!sel) return;
  await api(`/api/automation/rules/${sel.dataset.autoRule}`, { method: "PATCH", body: JSON.stringify({ enabled: sel.value === "on" }) }).catch((err) => alert(err.message));
});

// =====================================================================
// ORGANISATION
// =====================================================================

export async function loadOrganisation() {
  const [org, agentsRes, veryxLink, construxLink] = await Promise.all([
    api("/api/org"),
    api("/api/agents").catch(() => ({ provider: { connected: false }, agents: [], runs: [] })),
    api("/api/veryx/link").catch(() => ({ connected: false })),
    api("/api/construx/link").catch(() => ({ connected: false })),
  ]);
  const provider = agentsRes.provider || { connected: false };
  const agentForms = Object.fromEntries((agentsRes.agents || []).map((a) => [a.id, a.fields]));

  const list = (items) => `<ul style="margin:6px 0 0;padding-left:18px;font-size:0.88rem;line-height:1.6;">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;

  const coreCards = org.leanCore
    .map(
      (r) => `<div class="section-block">
      <h3>${esc(r.title)} ${r.holder ? pill(r.holder, "approved") : ""} <span class="muted" style="font-weight:400;font-size:0.78rem;">· ${esc(r.employment)}</span></h3>
      <p class="muted" style="margin:4px 0 8px;">${esc(r.purpose)}</p>
      <details><summary style="cursor:pointer;font-size:0.85rem;font-weight:600;">Responsibilities</summary>${list(r.responsibilities)}</details>
      <details><summary style="cursor:pointer;font-size:0.85rem;font-weight:600;color:var(--amber,#9c7a3c);">AI-supported functions</summary>${list(r.aiSupported)}</details>
      <details><summary style="cursor:pointer;font-size:0.85rem;font-weight:600;">Human — never delegated</summary>${list(r.humanRetained)}</details>
    </div>`
    )
    .join("");

  const backingPill = (b) => {
    if (b === "engine") return pill("ENGINE · LIVE", "approved");
    if (b === "veryx") return veryxLink.connected ? pill("VERYX · CONNECTED", "approved") : pill("VERYX · connect key", "");
    if (b === "construx") return construxLink.connected ? pill("CONSTRUX · CONNECTED", "approved") : pill("CONSTRUX · awaiting token", "");
    return provider.connected ? pill("AI · LIVE", "approved") : pill("AI · connect key", "");
  };

  const providerStatus = provider.connected
    ? pill(`CONNECTED · ${provider.model}`, "approved")
    : provider.lastTest && !provider.lastTest.ok
      ? pill("FAILED", "declined")
      : pill("Not connected", "");
  const providerBlock = `
    ${isAdmin ? `<form id="ai-provider-form" class="team-form" style="flex-wrap:wrap;">
      <b style="font-family:var(--font-head);min-width:90px;align-self:center;">AI engine</b>
      <input name="apiKey" type="password" placeholder="${provider.keyPreview ? `Key saved (${esc(provider.keyPreview)}) — paste to replace` : "Paste Anthropic API key (sk-ant-…)"}" autocomplete="off" style="flex:2;">
      <input name="model" value="${esc(provider.model || "claude-opus-5")}" placeholder="Model" style="max-width:190px;">
      <button class="btn-block" type="submit" style="width:auto;padding:11px 18px;">Save &amp; test</button>
      <span style="align-self:center;">${providerStatus}</span>
    </form>` : `<p>AI engine: ${providerStatus}</p>`}
    ${provider.lastTest ? `<p class="muted" style="margin:6px 0 0;">${esc(provider.lastTest.summary)}</p>` : ""}
    <p class="muted" style="margin:8px 0 0;">One key powers all seven agents. An administrator creates it at <b>console.anthropic.com</b> → API keys and pastes it here — stored server-side only, never shown again in full, exactly like the platform keys. Every run lands in the approval queue below: a named human approves or rejects before anything is acted on.</p>`;

  const runFormHtml = (a) => {
    const fields = agentForms[a.id] || [];
    if (!fields.length) return "";
    return `<details style="margin-top:10px;"><summary style="cursor:pointer;font-weight:700;font-size:0.88rem;color:var(--amber,#9c7a3c);">▶ Run this agent now</summary>
      <form data-agent-run="${a.id}" style="margin-top:10px;">
        <input name="__title" placeholder="Name this run — e.g. 'Chesterfield welfare package quotes'" style="width:100%;margin-bottom:8px;">
        ${fields
          .map((f) =>
            f.type === "text"
              ? `<input name="${f.name}" ${f.required ? "required" : ""} placeholder="${esc(f.label)}" style="width:100%;margin-bottom:8px;">`
              : `<label class="muted" style="font-size:0.8rem;">${esc(f.label)}${f.required ? " *" : ""}</label><textarea name="${f.name}" ${f.required ? "required" : ""} style="width:100%;min-height:90px;padding:10px 12px;border:1.5px solid var(--line);border-radius:7px;font-family:inherit;font-size:0.88rem;margin-bottom:8px;"></textarea>`
          )
          .join("")}
        <button class="btn-block" type="submit" style="width:auto;padding:11px 22px;" ${provider.connected ? "" : "disabled"}>${provider.connected ? "Run agent" : "Connect the AI engine first"}</button>
        <span class="login-error" data-agent-error style="display:block;margin-top:8px;"></span>
      </form>
      <div data-agent-output="${a.id}"></div>
    </details>`;
  };

  const agentCards = org.agents
    .map(
      (a) => `<div class="section-block">
      <h3>${esc(a.name)} ${a.backing.map(backingPill).join(" ")}</h3>
      <p class="muted" style="margin:4px 0 8px;">${esc(a.desk)}</p>
      <details><summary style="cursor:pointer;font-size:0.85rem;font-weight:600;">Inputs</summary>${list(a.inputs)}</details>
      <details><summary style="cursor:pointer;font-size:0.85rem;font-weight:600;">Outputs</summary>${list(a.outputs)}</details>
      <p style="font-size:0.85rem;margin-top:8px;border-left:3px solid var(--danger,#c0392b);padding-left:10px;"><b>Approval boundary:</b> ${esc(a.boundary)}</p>
      ${runFormHtml(a)}
    </div>`
    )
    .join("");

  const runStatusPill = (s) =>
    s === "approved" ? pill("approved", "approved") : s === "rejected" ? pill("rejected", "declined") : pill("awaiting approval", "");
  const runsTable = (agentsRes.runs || []).length
    ? wrapT(`<table><thead><tr><th>When</th><th>Agent</th><th>Run</th><th>By</th><th>Status</th><th></th></tr></thead><tbody>${agentsRes.runs
        .map(
          (r) => `<tr><td class="muted" style="white-space:nowrap;">${new Date(r.createdAt).toLocaleString("en-GB")}</td>
          <td>${esc(r.agentName)}</td><td><b>${esc(r.title)}</b><div class="muted" style="font-size:0.78rem;">${esc(r.preview || "")}…</div></td>
          <td class="muted">${esc(r.runBy)}${r.decidedBy ? `<div style="font-size:0.72rem;">decided: ${esc(r.decidedBy)}</div>` : ""}</td>
          <td>${runStatusPill(r.status)}</td>
          <td style="white-space:nowrap;"><button class="btn-run" data-run-open="${r.id}">Open</button>${isAdmin ? ` <button class="btn-run" data-run-del="${r.id}">Delete</button>` : ""}</td></tr>`
        )
        .join("")}</tbody></table>`)
    : '<p class="empty-note">No agent runs yet — run any agent above and its output arrives here for a named human to approve or reject.</p>';
  const runsBlock = `${runsTable}<div id="agent-run-viewer"></div>`;

  const matrix = wrapT(`<table><thead><tr><th>Function</th><th>AI replacement potential</th><th>Human control required</th></tr></thead><tbody>${org.aiMatrix
    .map(([f, p, h]) => `<tr><td>${esc(f)}</td><td><b>${esc(p)}</b></td><td class="muted">${esc(h)}</td></tr>`)
    .join("")}</tbody></table>`);

  const separation = wrapT(`<table><thead><tr><th>Decision</th><th>Responsible owner</th></tr></thead><tbody>${org.separation
    .map(([d, o]) => `<tr><td>${esc(d)}</td><td><b>${esc(o)}</b></td></tr>`)
    .join("")}</tbody></table>`);

  const models = org.deliveryModelLimits
    .map((m) => `<div class="section-block"><h3>${esc(m.model)}</h3><p class="muted" style="margin:2px 0 6px;">${esc(m.line)}</p><p style="font-size:0.88rem;margin:0 0 6px;"><b>Team:</b> ${esc(m.team)}</p><p class="muted" style="font-size:0.85rem;"><b>AI:</b> ${esc(m.ai)}</p></div>`)
    .join("");

  const hiring = org.hiringSequence
    .map((h) => `<details style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:600;">${esc(h.stage)}</summary>${list(h.actions)}</details>`)
    .join("");

  const fractional = wrapT(`<table><thead><tr><th>Resource</th><th>Arrangement</th><th>Boundary</th></tr></thead><tbody>${org.fractional
    .map((f) => `<tr><td><b>${esc(f.title)}</b></td><td class="muted">${esc(f.arrangement)}</td><td class="muted">${esc(f.note)}</td></tr>`)
    .join("")}</tbody></table>`);

  const contractFunded = wrapT(`<table><thead><tr><th>Role</th><th>Appointed when</th><th>Owns</th></tr></thead><tbody>${org.contractFunded
    .map((c) => `<tr><td><b>${esc(c.title)}</b></td><td class="muted">${esc(c.trigger)}</td><td class="muted">${esc(c.summary)}</td></tr>`)
    .join("")}</tbody></table>`);

  const mature = org.matureOrg
    .map((d) => `<details style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:600;">${esc(d.directorate)}</summary>${list(d.positions)}</details>`)
    .join("");

  document.getElementById("organisation-body").innerHTML =
    `<p style="border-left:3px solid var(--amber,#9c7a3c);padding-left:12px;font-size:0.92rem;">${esc(org.principle)}</p>` +
    block("Launch core — four people, AI-amplified", coreCards) +
    block("AI engine — one connection powers every agent", providerBlock) +
    block("The AI-agent workforce — seven agents, each inside an approval boundary", agentCards) +
    block("Agent runs — the approval queue", runsBlock) +
    block("Fractional professional assurance", fractional) +
    block("Contract-funded appointments — recruited against secured work, priced into the contract", contractFunded) +
    block("What AI genuinely replaces — and what humans always keep", matrix) +
    block("Non-negotiable separation of accountability", separation) +
    block("Delivery-model limits", models) +
    block("Hiring sequence", hiring) +
    block("Every permanent appointment must pass at least one test", list(org.appointmentTests) +
      `<p class="muted" style="margin-top:10px;"><b>Safe operating principle:</b> ${org.operatingPrinciple.map(esc).join(" · ")}</p>`) +
    block("The mature organisation — the growth map, not the payroll", mature);
}

// --- AI provider connection (admin) ---

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#ai-provider-form");
  if (!form) return;
  e.preventDefault();
  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Testing…";
  try {
    await api("/api/agents/provider", { method: "PUT", body: JSON.stringify({ apiKey: form.apiKey.value, model: form.model.value }) });
    const { result } = await api("/api/agents/provider/test", { method: "POST" });
    if (!result.ok) alert(result.summary);
    await loadOrganisation();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = "Save & test";
  }
});

// --- Run an agent ---

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("form[data-agent-run]");
  if (!form) return;
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  const errEl = form.querySelector("[data-agent-error]");
  errEl.classList.remove("show");
  btn.disabled = true;
  btn.textContent = "Running — this can take a minute…";
  try {
    const inputs = {};
    for (const el of form.querySelectorAll("input[name], textarea[name]")) {
      if (el.name !== "__title") inputs[el.name] = el.value;
    }
    const { run } = await api(`/api/agents/${form.dataset.agentRun}/run`, {
      method: "POST",
      body: JSON.stringify({ title: form.__title.value, inputs }),
    });
    const holder = document.querySelector(`[data-agent-output="${form.dataset.agentRun}"]`);
    holder.innerHTML = renderRunView(run);
    holder.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = "Run agent";
  }
});

function renderRunView(run) {
  const decide =
    run.status === "awaiting_approval"
      ? `<div style="margin-top:10px;">
          <button class="btn-block" data-run-decide="approve" data-run-id="${run.id}" style="width:auto;padding:10px 20px;">Approve</button>
          <button class="btn-run" data-run-decide="reject" data-run-id="${run.id}" style="margin-left:8px;">Reject</button>
          <span class="muted" style="margin-left:10px;font-size:0.8rem;">Approval is recorded against your name — nothing is acted on until a human approves.</span>
        </div>`
      : `<p class="muted" style="margin-top:10px;">${esc(run.status)}${run.decidedBy ? ` by ${esc(run.decidedBy)}` : ""}${run.decisionNote ? ` — "${esc(run.decisionNote)}"` : ""}</p>`;
  return `<div class="section-block" style="border:1.5px solid var(--amber,#9c7a3c);border-radius:10px;padding:16px 18px;margin-top:12px;">
    <h3>${esc(run.title)} <span class="muted" style="font-weight:400;font-size:0.78rem;">· ${esc(run.agentName)} · ${esc(run.model || "")}${run.usage ? ` · ${run.usage.input + run.usage.output} tokens` : ""}</span></h3>
    ${run.truncated ? '<p class="muted" style="color:var(--danger,#c0392b);">Output hit the length limit — the end may be cut off; re-run with a narrower scope if needed.</p>' : ""}
    <pre style="white-space:pre-wrap;font-family:inherit;font-size:0.88rem;line-height:1.6;background:var(--paper,#f7f5f0);border:1px solid var(--line);border-radius:7px;padding:14px 16px;max-height:520px;overflow:auto;">${esc(run.output || "")}</pre>
    ${decide}
  </div>`;
}

document.addEventListener("click", async (e) => {
  const open = e.target.closest("button[data-run-open]");
  const decide = e.target.closest("button[data-run-decide]");
  const del = e.target.closest("button[data-run-del]");
  if (open) {
    try {
      const { run } = await api(`/api/agents/runs/${open.dataset.runOpen}`);
      document.getElementById("agent-run-viewer").innerHTML = renderRunView(run);
      document.getElementById("agent-run-viewer").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      alert(err.message);
    }
    return;
  }
  if (decide) {
    const approve = decide.dataset.runDecide === "approve";
    const note = approve ? "" : prompt("Why is this run rejected? (recorded on the run)") || "";
    if (!approve && note === null) return;
    decide.disabled = true;
    try {
      await api(`/api/agents/runs/${decide.dataset.runId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision: approve ? "approve" : "reject", note }),
      });
      await loadOrganisation();
    } catch (err) {
      alert(err.message);
      decide.disabled = false;
    }
    return;
  }
  if (del) {
    if (!confirm("Delete this agent run from the log?")) return;
    await api(`/api/agents/runs/${del.dataset.runDel}`, { method: "DELETE" }).catch((err) => alert(err.message));
    await loadOrganisation();
  }
});
