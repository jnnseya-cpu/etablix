/**
 * ETABLIX delivery automation — the engine that watches so people don't
 * have to. On a schedule (and on demand from the Control Desk) it:
 *
 *   · pulls live risk and usage data from connected platforms (VERYX now,
 *     CONSTRUX when its token is added), falling back to workspace data
 *   · pings every connected platform and alerts on loss / recovery
 *   · sweeps the commercial pipeline for enquiries and supplier
 *     applications that have sat too long without action
 *   · enforces the commercial guardrails: the EVM payment gate
 *     (SPI/CPI ≥ 0.95) and the exposure rule (committed supplier
 *     exposure ≤ cash reserve + confirmed receivables)
 *   · sends one daily operating digest
 *
 * Findings fire catalogued communication events through the normal
 * engine (email + in-app + the rest), deduplicated so a standing
 * condition alerts once per cooldown, not once per run. Every run is
 * recorded in the automationRuns log the Control Desk displays.
 */

import { collection, getSettings, saveSettings, persist } from "./store.js";
import { emit } from "./comms.js";
import { PLATFORMS, isConnected, platformFetch } from "./platforms.js";

const DAY = 86400000;
const HOUR = 3600000;

export const RULES = [
  { id: "risk_high", name: "High-severity risk alert", description: "Alerts when any open risk (live VERYX data when connected) reaches score 16 or above.", cooldownMs: DAY },
  { id: "risk_new", name: "New risk detection", description: "Alerts when a risk appears in the register that was not there on the previous sweep.", cooldownMs: DAY },
  { id: "usage_threshold", name: "Platform quota & ACU watch", description: "Warns at 80% of the monthly VERYX API quota or when the ACU balance falls below 25.", cooldownMs: DAY },
  { id: "platform_health", name: "Platform connection watch", description: "Pings every connected platform each run; alerts on connection loss and confirms recovery.", cooldownMs: 6 * HOUR },
  { id: "stale_enquiries", name: "Stale enquiry sweep", description: "Flags project enquiries still marked new after 2 days without contact.", cooldownMs: DAY },
  { id: "stale_applications", name: "Stale supplier application sweep", description: "Flags supplier registrations unassessed after 3 days.", cooldownMs: DAY },
  { id: "evm_gate", name: "EVM payment gate", description: "Reviews the latest EVM record per supplier per project; SPI or CPI below 0.95 triggers commercial review.", cooldownMs: DAY },
  { id: "exposure_rule", name: "Exposure & reserve rule", description: "Checks every project's latest valuation: committed supplier exposure must not exceed reserve + confirmed receivables, and the reserve must cover next month's forecast.", cooldownMs: 12 * HOUR },
  { id: "daily_digest", name: "Daily operating digest", description: "One summary email each morning: pipeline, risks, EVM and exposure status across the business.", cooldownMs: 0 },
];

const DEFAULT_CONFIG = { enabled: true, intervalMin: 60, rules: {} };

export function getConfig() {
  const stored = getSettings().automation_config || {};
  return { ...DEFAULT_CONFIG, ...stored, rules: { ...(stored.rules || {}) } };
}

export function setConfig(patch) {
  const current = getConfig();
  const next = {
    enabled: typeof patch.enabled === "boolean" ? patch.enabled : current.enabled,
    intervalMin: Math.max(15, Math.min(1440, Number(patch.intervalMin) || current.intervalMin)),
    rules: current.rules,
  };
  saveSettings({ automation_config: next });
  return getConfig();
}

export function setRule(id, enabled) {
  if (!RULES.some((r) => r.id === id)) throw new Error("Unknown automation rule.");
  const current = getConfig();
  current.rules[id] = Boolean(enabled);
  saveSettings({ automation_config: current });
  return getConfig();
}

const ruleEnabled = (config, id) => config.rules[id] !== false;

function getState() {
  const s = getSettings();
  if (!s.automation_state || typeof s.automation_state !== "object") {
    s.automation_state = { seenRiskRefs: null, alerts: {}, platformOk: {}, lastDigestDate: null, lastRunAt: null };
    persist();
  }
  return s.automation_state;
}

/** True (and records it) when this alert key is outside its cooldown. */
function shouldAlert(state, key, cooldownMs) {
  const last = state.alerts[key] || 0;
  if (Date.now() - last < cooldownMs) return false;
  state.alerts[key] = Date.now();
  return true;
}

function pruneAlerts(state) {
  const cutoff = Date.now() - 14 * DAY;
  for (const [k, ts] of Object.entries(state.alerts)) if (ts < cutoff) delete state.alerts[k];
}

// ---------- data gathering ----------

const firstArray = (obj, names = [], depth = 0) => {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== "object" || depth > 2) return null;
  for (const k of [...names, "data", "items", "results", "rows", "list"]) if (Array.isArray(obj[k])) return obj[k];
  for (const k of [...names, "data", "items", "results"]) {
    if (obj[k] && typeof obj[k] === "object") {
      const inner = firstArray(obj[k], names, depth + 1);
      if (inner) return inner;
    }
  }
  return null;
};
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

async function gatherRisks() {
  if (isConnected("veryx")) {
    try {
      const body = await platformFetch("veryx", "/risks");
      const arr = firstArray(body, ["risks"]);
      if (arr) {
        return arr.map((r, i) => ({
          ref: r.ref || r.reference || r.code || (r.id ? `RSK-${String(r.id).slice(0, 6).toUpperCase()}` : `RSK-${i + 1}`),
          title: r.title || r.name || r.summary || "Untitled risk",
          score: num(r.score ?? r.riskScore ?? r.risk_score) ?? ((num(r.probability ?? r.likelihood) || 0) * (num(r.impact ?? r.consequence) || 0)),
          status: r.status || r.state || "open",
        }));
      }
    } catch {
      /* fall through to workspace data */
    }
  }
  return collection("risks").map((r) => ({ ref: r.ref, title: r.title, score: r.score || 0, status: r.status }));
}

async function gatherUsage() {
  if (!isConnected("veryx")) return null;
  try {
    const body = await platformFetch("veryx", "/usage");
    const raw = body?.data && typeof body.data === "object" ? body.data : body || {};
    const u = raw.usage && typeof raw.usage === "object" ? raw.usage : raw;
    return {
      quota: num(u.monthlyQuota ?? u.monthly_quota ?? u.quota) ?? 0,
      used: num(u.used ?? u.callsUsed ?? u.calls_used ?? u.usage) ?? 0,
      acu: num(u.acuBalance ?? u.acu_balance ?? u.acu) ?? 0,
    };
  } catch {
    return null;
  }
}

// ---------- the run ----------

let running = false;

export async function runAutomation(trigger = "schedule") {
  if (running) return { skipped: true, reason: "A run is already in progress." };
  running = true;
  const started = Date.now();
  const config = getConfig();
  const state = getState();
  const checks = [];
  const findings = [];
  const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB");

  const fire = async (code, opts, label) => {
    try {
      await emit(code, opts);
      findings.push(label);
    } catch (err) {
      checks.push(`Event ${code} failed: ${err.message}`);
    }
  };

  try {
    // --- Platform health -------------------------------------------------
    if (ruleEnabled(config, "platform_health")) {
      for (const name of Object.keys(PLATFORMS)) {
        if (!isConnected(name)) continue;
        const label = PLATFORMS[name].label;
        let ok = true;
        try {
          await platformFetch(name, PLATFORMS[name].pingPath, { timeoutMs: 8000 });
        } catch {
          ok = false;
        }
        const wasOk = state.platformOk[name] !== false;
        state.platformOk[name] = ok;
        if (!ok && shouldAlert(state, `platform.down:${name}`, 6 * HOUR)) {
          await fire("integration.disconnected", { vars: { item: label } }, `${label} connection lost`);
        } else if (ok && !wasOk) {
          await fire("system.restored", { vars: {} }, `${label} connection recovered`);
        }
        checks.push(`${label} ping: ${ok ? "ok" : "FAILED"}`);
      }
    }

    // --- Risks ------------------------------------------------------------
    let risks = [];
    if (ruleEnabled(config, "risk_high") || ruleEnabled(config, "risk_new")) {
      risks = await gatherRisks();
      checks.push(`Risk register: ${risks.length} risks reviewed`);
      if (ruleEnabled(config, "risk_new")) {
        const refs = risks.map((r) => r.ref);
        if (Array.isArray(state.seenRiskRefs)) {
          for (const r of risks) {
            if (!state.seenRiskRefs.includes(r.ref) && shouldAlert(state, `risk.new:${r.ref}`, DAY)) {
              await fire("risk.identified", { vars: { project: "the portfolio", item: `${r.ref} — ${r.title}` } }, `New risk ${r.ref}`);
            }
          }
        }
        state.seenRiskRefs = refs; // first ever sweep seeds silently
      }
      if (ruleEnabled(config, "risk_high")) {
        for (const r of risks) {
          if (r.status === "open" && (r.score || 0) >= 16 && shouldAlert(state, `risk.high:${r.ref}`, DAY)) {
            await fire("risk.escalated", { vars: { item: `${r.ref} — ${r.title}`, value: r.score } }, `High risk ${r.ref} (score ${r.score})`);
          }
        }
      }
    }

    // --- Usage ------------------------------------------------------------
    if (ruleEnabled(config, "usage_threshold")) {
      const usage = await gatherUsage();
      if (usage) {
        const pct = usage.quota ? Math.round((usage.used / usage.quota) * 100) : 0;
        checks.push(`VERYX usage: ${pct}% of quota · ${usage.acu} ACU`);
        if (pct >= 80 && shouldAlert(state, "usage.quota", DAY)) {
          await fire("api.quota_warning", { vars: { value: `${pct}%` } }, `API quota at ${pct}%`);
        }
        if (usage.acu < 25 && shouldAlert(state, "usage.acu", DAY)) {
          await fire("acu.low", { vars: { value: usage.acu } }, `ACU balance low (${usage.acu})`);
        }
      } else {
        checks.push("VERYX usage: not connected");
      }
    }

    // --- Pipeline sweeps --------------------------------------------------
    const ref = (prefix, id) => `${prefix}-${String(id).slice(0, 6).toUpperCase()}`;
    if (ruleEnabled(config, "stale_enquiries")) {
      const stale = collection("leads").filter((l) => l.status === "new" && Date.now() - l.createdAt > 2 * DAY);
      checks.push(`Enquiry sweep: ${stale.length} stale`);
      for (const l of stale) {
        const days = Math.floor((Date.now() - l.createdAt) / DAY);
        if (shouldAlert(state, `enquiry.stale:${l.id}`, DAY)) {
          await fire("enquiry.stale", { vars: { reference: ref("ENQ", l.id), company: l.company, value: days } }, `Stale enquiry ${ref("ENQ", l.id)}`);
        }
      }
    }
    if (ruleEnabled(config, "stale_applications")) {
      const stale = collection("subcontractors").filter((a) => a.status === "submitted" && Date.now() - a.createdAt > 3 * DAY);
      checks.push(`Application sweep: ${stale.length} stale`);
      for (const a of stale) {
        const days = Math.floor((Date.now() - a.createdAt) / DAY);
        if (shouldAlert(state, `application.stale:${a.id}`, DAY)) {
          await fire("application.stale", { vars: { reference: ref("SUP", a.id), company: a.legalName, value: days } }, `Stale application ${ref("SUP", a.id)}`);
        }
      }
    }

    // --- EVM payment gate -------------------------------------------------
    let evmBreaches = [];
    if (ruleEnabled(config, "evm_gate")) {
      // Latest record per project+supplier decides the gate.
      const latest = new Map();
      for (const r of collection("evmRecords")) {
        const k = `${r.project}::${r.supplier}`;
        if (!latest.has(k) || latest.get(k).createdAt < r.createdAt) latest.set(k, r);
      }
      for (const r of latest.values()) {
        const spi = r.pv > 0 ? r.ev / r.pv : 1;
        const cpi = r.ac > 0 ? r.ev / r.ac : 1;
        if (spi < 0.95 || cpi < 0.95) {
          evmBreaches.push(r);
          const which = [spi < 0.95 ? `SPI ${spi.toFixed(2)}` : null, cpi < 0.95 ? `CPI ${cpi.toFixed(2)}` : null].filter(Boolean).join(", ");
          if (shouldAlert(state, `evm:${r.project}:${r.supplier}:${r.period}`, DAY)) {
            await fire("evm.breach", { vars: { item: `${r.supplier} (${which})`, project: r.project } }, `EVM breach — ${r.supplier} on ${r.project}`);
          }
        }
      }
      checks.push(`EVM gate: ${latest.size} supplier positions, ${evmBreaches.length} below 0.95`);
    }

    // --- Exposure & reserve rule -----------------------------------------
    let exposureBreaches = [];
    if (ruleEnabled(config, "exposure_rule")) {
      const latest = new Map();
      for (const v of collection("valuations")) {
        if (!latest.has(v.project) || latest.get(v.project).month < v.month) latest.set(v.project, v);
      }
      for (const v of latest.values()) {
        const cover = (v.reserveHeld || 0) + (v.receivables || 0);
        const exposed = v.committedExposure || 0;
        if (exposed > cover) {
          exposureBreaches.push(v);
          if (shouldAlert(state, `exposure:${v.project}`, 12 * HOUR)) {
            await fire("exposure.breach", { vars: { project: v.project, amount: money(exposed) }, detailsText: `Committed supplier exposure: ${money(exposed)}\nCash reserve held: ${money(v.reserveHeld)}\nConfirmed receivables: ${money(v.receivables)}\nCover shortfall: ${money(exposed - cover)}` }, `Exposure breach — ${v.project}`);
          }
        }
        if ((v.reserveHeld || 0) < (v.forecastNext || 0) && shouldAlert(state, `reserve:${v.project}:${v.month}`, DAY)) {
          await fire("reserve.low", { vars: { project: v.project } }, `Reserve below one month — ${v.project}`);
        }
      }
      checks.push(`Exposure rule: ${latest.size} projects, ${exposureBreaches.length} in breach`);
    }

    // --- Daily digest -----------------------------------------------------
    const today = new Date().toISOString().slice(0, 10);
    if (ruleEnabled(config, "daily_digest") && state.lastDigestDate !== today && new Date().getUTCHours() >= 7) {
      const leads = collection("leads");
      const apps = collection("subcontractors");
      const openRisks = risks.filter((r) => r.status === "open");
      const top = openRisks.reduce((m, r) => Math.max(m, r.score || 0), 0);
      const summaryLine = `${leads.filter((l) => l.status === "new").length} new enquiries · ${apps.filter((a) => a.status === "submitted").length} applications to review · ${openRisks.length} open risks (top score ${top}) · ${evmBreaches.length} EVM breach(es) · ${exposureBreaches.length} exposure breach(es)`;
      const detailsText = [
        `Pipeline: ${leads.length} enquiries (${leads.filter((l) => l.status === "new").length} new, ${leads.filter((l) => l.status === "qualified").length} qualified, ${leads.filter((l) => l.status === "won").length} won)`,
        `Supply chain: ${apps.length} registrations (${apps.filter((a) => a.status === "submitted").length} awaiting review, ${apps.filter((a) => ["approved", "prequalified"].includes(a.status)).length} usable)`,
        `Risks: ${openRisks.length} open, top score ${top}`,
        `EVM gate: ${evmBreaches.length} supplier position(s) below 0.95`,
        `Exposure rule: ${exposureBreaches.length} project(s) beyond cover`,
        `Platforms: ${Object.keys(PLATFORMS).map((n) => `${PLATFORMS[n].label} ${isConnected(n) ? (state.platformOk[n] === false ? "DOWN" : "connected") : "not connected"}`).join(" · ")}`,
      ].join("\n");
      await fire("automation.digest", { vars: { date: today, outcome: summaryLine }, detailsText }, "Daily digest sent");
      state.lastDigestDate = today;
    }
  } finally {
    pruneAlerts(state);
    state.lastRunAt = Date.now();
    persist();
    running = false;
  }

  const run = {
    trigger,
    durationMs: Date.now() - started,
    checks,
    findings,
    emitted: findings.length,
  };
  const log = collection("automationRuns");
  log.push({ id: Math.random().toString(16).slice(2, 10), createdAt: Date.now(), ...run });
  if (log.length > 200) log.splice(0, log.length - 200);
  persist();
  return run;
}

export function status() {
  const config = getConfig();
  const state = getState();
  return {
    config: { enabled: config.enabled, intervalMin: config.intervalMin },
    rules: RULES.map((r) => ({ id: r.id, name: r.name, description: r.description, enabled: ruleEnabled(config, r.id) })),
    lastRunAt: state.lastRunAt,
    nextRunAt: config.enabled ? (state.lastRunAt || Date.now()) + config.intervalMin * 60000 : null,
    platformOk: state.platformOk,
    runs: [...collection("automationRuns")].slice(-30).reverse(),
  };
}

/** Boot the scheduler: a light one-minute tick that runs when due. */
export function startScheduler() {
  const tick = () => {
    const config = getConfig();
    if (!config.enabled) return;
    const state = getState();
    const due = !state.lastRunAt || Date.now() - state.lastRunAt >= config.intervalMin * 60000;
    if (due) runAutomation("schedule").catch((err) => console.error("automation run failed:", err.message));
  };
  // First run shortly after boot so a restart never misses a beat.
  setTimeout(tick, 90 * 1000);
  setInterval(tick, 60 * 1000);
  console.log("Delivery automation scheduler started.");
}
