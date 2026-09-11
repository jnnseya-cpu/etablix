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
import { takeSnapshot } from "./portfolio.js";
import { noticeStatus } from "./paymentdates.js";
import { releaseStatus, human as humanDate } from "./workingdays.js";
import { checkMailAuth } from "./mailauth.js";
import { reportError } from "./alerts.js";
import { watched, live as contractDeadlines } from "./l7/watch.js";
import { use } from "./l7/ports.js";
import { sweepRetention } from "./retention.js";
import fs from "node:fs";
import path from "node:path";
import { dataDir } from "./store.js";

/**
 * When the last backup ran.
 *
 * backup.sh writes a stamp file into the data directory each time it
 * completes. Reading it here is what turns "backups are configured" into
 * "backups ran", which are not the same claim and only one of them is worth
 * anything at three in the morning.
 */
function lastBackupAt() {
  try { return Number(fs.readFileSync(path.join(dataDir(), "last-backup"), "utf8").trim()) || null; }
  catch { return null; }
}

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
  { id: "payment_notices", name: "HGCRA notice deadlines", description: "Watches every unpaid application for its s.110A payment-notice and s.111 pay-less deadlines, and the final date for payment. Missing either notice is silent and expensive — the sum applied for becomes payable in full.", cooldownMs: 0 },
  { id: "diagnostic_release", name: "Diagnostic release dates", description: "Watches every Site Systems Diagnostic against the ten working days it was sold on: reminds the day before, says so on the day it is due, and escalates once it is late. Sending early is as much a broken promise as sending late.", cooldownMs: 0 },
  { id: "portfolio_snapshot", name: "Monthly portfolio snapshot", description: "Records the portfolio position — project count, average progress, budget consumed and the health split — once per calendar month, so the VERYX trend line has real history rather than a projection.", cooldownMs: 0 },
  { id: "daily_digest", name: "Daily operating digest", description: "One summary email each morning: pipeline, risks, EVM and exposure status across the business.", cooldownMs: 0 },
  { id: "mail_auth", name: "Mail authentication watch", description: "Reads the live DNS for SPF, DKIM and DMARC once a day. A revoked key or a deleted record is why enquiries land in junk, and it is invisible from inside the application — this is the platform noticing rather than a customer.", cooldownMs: DAY },
  { id: "run_failures", name: "Failed agent run watch", description: "Alerts when an agent run fails, naming the run and the error. A failed run used to be a red line on a screen nobody was looking at.", cooldownMs: 0 },
  { id: "mail_delivery", name: "Outbound mail watch", description: "Alerts when messages are failing to send. Mail is the channel every other alert depends on, so its failure has to be reported through the ones that do not.", cooldownMs: 6 * HOUR },
  { id: "backup_watch", name: "Backup watch", description: "Alerts when no backup has been recorded for 36 hours. An untested backup is not a backup, and an unrecorded one is not even that.", cooldownMs: 12 * HOUR },
  { id: "contract_deadlines", name: "Contract time bars", description: "Resolves every recorded site event against the project's OWN contract — the standard form plus its bespoke amendments — and alerts on the time bars running against it. A time bar is not a task: miss an NEC4 clause 61.3 notification and the entitlement is gone, not weakened, and a Z-clause that shortens eight weeks to fourteen days makes the published form's answer wrong. The watch never notifies anything; issuing a notice stays with a person.", cooldownMs: 0 },
  { id: "retention_sweep", name: "Retention sweep", description: "Erases client information packs whose retention period has passed, and records each erasure. A retention policy that depends on somebody remembering is a retention policy in name only.", cooldownMs: 0 },
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
  // TIME COMES FROM THE CLOCK PORT, NOT FROM Date.now(). This sweep decides
  // whether a statutory notice is overdue and whether a time bar has passed;
  // a function that reads the wall clock directly cannot be asked what it
  // would do tomorrow, so those decisions could never be tested against a
  // deadline. It is also the first real call site to go through a port,
  // which is what makes the port more than a diagram.
  const clock = use("clock");
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

    // --- Mail authentication ----------------------------------------------
    // The check the platform never made: is the DNS still vouching for our
    // mail? Nothing inside the application can see this failing — the app
    // sends, the server accepts, and the receiving mailbox files it as a
    // forgery. It was found by a customer saying they never heard back.
    if (ruleEnabled(config, "mail_auth") && shouldAlert(state, "mail.auth", DAY)) {
      try {
        const domain = (process.env.NOTIFY_FROM || process.env.SMTP_USER || "etablix.com").split("@").pop().replace(/[>\s]/g, "") || "etablix.com";
        const auth = await checkMailAuth(domain);
        checks.push(`Mail authentication (${domain}): ${auth.ok ? "SPF, DKIM and DMARC all in order" : auth.problems.length + " problem(s)"}`);
        const wasOk = state.mailAuthOk !== false;
        state.mailAuthOk = auth.ok;
        if (!auth.ok) {
          await fire("system.error", {
            vars: { item: `Mail authentication for ${domain}`, outcome: auth.problems[0] },
            detailsText: auth.problems.join("\n\n") + "\n\nRun: node tools/mail-doctor.mjs " + domain,
          }, `Mail authentication: ${auth.problems.length} problem(s) on ${domain}`);
        } else if (!wasOk) {
          await fire("system.restored", { vars: { item: `Mail authentication for ${domain}` } }, `Mail authentication restored on ${domain}`);
        }
      } catch (err) {
        checks.push(`Mail authentication check failed: ${err.message}`);
      }
    }

    // --- Failed agent runs --------------------------------------------------
    if (ruleEnabled(config, "run_failures")) {
      const since = state.lastRunFailureAt || 0;
      const failed = collection("agentTasks").filter((r) => r.status === "failed" && (r.finishedAt || 0) > since);
      if (failed.length) {
        state.lastRunFailureAt = Math.max(...failed.map((r) => r.finishedAt || 0));
        await fire("system.error", {
          vars: { item: `${failed.length} agent run(s) failed`, outcome: failed[0].error || "no error recorded" },
          detailsText: failed.map((r) => `${r.agentName} — ${r.title}\n${r.error || "no error recorded"}`).join("\n\n"),
        }, `${failed.length} agent run(s) failed`);
      }
      checks.push(`Agent runs: ${failed.length} new failure(s)`);
    }

    // --- Outbound mail ------------------------------------------------------
    // Reported through the alert routes that do NOT depend on mail: the disk
    // log and the webhook. Emailing somebody to tell them email is broken is
    // the alarm wired to the fuse that keeps blowing.
    if (ruleEnabled(config, "mail_delivery")) {
      const recent = collection("deliveries").filter((d) => (d.at || d.createdAt || 0) > Date.now() - 6 * HOUR);
      const failedMail = recent.filter((d) => d.status === "failed" || d.error);
      if (failedMail.length >= 3 && shouldAlert(state, "mail.delivery", 6 * HOUR)) {
        reportError(new Error(`${failedMail.length} outbound messages failed in six hours: ${failedMail[0].error || "no error recorded"}`), "mail delivery");
        findings.push(`${failedMail.length} outbound message(s) failed`);
      }
      checks.push(`Outbound mail: ${recent.length} sent in six hours, ${failedMail.length} failed`);
    }

    // --- Backups ------------------------------------------------------------
    if (ruleEnabled(config, "backup_watch")) {
      const last = lastBackupAt();
      const age = last ? Date.now() - last : null;
      if ((!last || age > 36 * HOUR) && shouldAlert(state, "backup.stale", 12 * HOUR)) {
        reportError(new Error(last
          ? `The last recorded backup was ${Math.round(age / HOUR)} hours ago. Nightly backups are not running.`
          : "No backup has ever been recorded. deploy/backup.sh is not installed, or its cron entry is missing."), "backups");
        findings.push("Backups are not running");
      }
      checks.push(`Backups: ${last ? `last ${Math.round(age / HOUR)}h ago` : "NONE RECORDED"}`);
    }

    // --- Contract time bars ----------------------------------------------
    // The clause graph, consulted. A graph nobody loads is a data structure,
    // and this is the thing that loads it: every project with a contract
    // recorded, every event resolved against THAT contract rather than
    // against general knowledge of the form it started from.
    if (ruleEnabled(config, "contract_deadlines")) {
      let running = 0, lost = 0, soon = 0;
      for (const project of watched()) {
        const l = contractDeadlines(project, clock.now());
        if (!l.ok) continue;
        running += l.deadlines.length;
        lost += l.barred.length;
        soon += l.urgent.length;
        for (const d of l.barred) {
          const key = `bar:lost:${project}:${d.event}:${d.clause}`;
          if (!shouldAlert(state, key, 7 * DAY)) continue;
          await fire(
            "platform.error",
            {
              vars: { context: `Time bar passed — ${project}` },
              detailsText: `${d.clause} (${d.name}) on ${project}.\n\n${d.consequence}\n\nThis is a lost entitlement rather than an overdue task, and it is reported once rather than daily because nothing anybody does now changes it.${d.unconfirmed ? "\n\nThis clause comes from a standard-form skeleton and has not been confirmed against the executed contract." : ""}`,
            },
            `Time bar passed — ${d.clause} on ${project}`
          );
        }
        for (const d of l.urgent) {
          const key = `bar:urgent:${project}:${d.event}:${d.clause}:${d.daysRemaining}`;
          if (!shouldAlert(state, key, DAY)) continue;
          await fire(
            "platform.error",
            {
              vars: { context: `Time bar in ${d.daysRemaining} day(s) — ${project}` },
              detailsText: `${d.clause} (${d.name}) expires in ${d.daysRemaining} day(s) on ${project}.\n\n${d.consequence}${d.unconfirmed ? "\n\nThis clause comes from a standard-form skeleton and has not been confirmed against the executed contract." : ""}`,
            },
            `${d.clause} expires in ${d.daysRemaining} day(s) — ${project}`
          );
        }
      }
      checks.push(`Contract time bars: ${watched().length} project(s), ${running} deadline(s) running, ${soon} inside a fortnight, ${lost} already lost`);
    }

    // --- Retention ----------------------------------------------------------
    if (ruleEnabled(config, "retention_sweep")) {
      const swept = sweepRetention({});
      if (swept.erased) {
        findings.push(`${swept.erased} client information pack(s) erased at the end of their retention period`);
      }
      checks.push(`Retention: ${swept.due} pack(s) due, ${swept.erased} erased`);
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
    // --- HGCRA notice deadlines -----------------------------------------
    if (ruleEnabled(config, "payment_notices")) {
      for (const app of collection("payApps")) {
        if (app.status === "paid") continue;
        const { severity, items } = noticeStatus(app);
        if (!severity) continue;
        const worst = items.find((i) => i.severity === "critical") || items[0];
        const key = `notice:${app.id}:${worst.code}`;
        if (!shouldAlert(state, key, DAY)) continue;
        await fire(
          "platform.error",
          {
            vars: { context: `Payment timetable — ${app.number}` },
            detailsText: `${worst.label} on application ${app.number} (${app.supplier}).\n\n${worst.detail}\n\nSum applied for: ${money(app.claimed)}`,
          },
          `${worst.label} — ${app.number}`
        );
      }
    }

    // --- Diagnostic release dates ---------------------------------------
    // The ten working days are the product. A report held past its date
    // and a report sent before it are both broken promises, and the only
    // one a machine can catch is the first.
    if (ruleEnabled(config, "diagnostic_release")) {
      for (const doc of collection("documents")) {
        if (doc.template !== "diagnostic" || !doc.data?.dueDate) continue;
        if (doc.data.releasedAt) continue;
        const rel = releaseStatus(doc.data.dueDate);
        if (rel.state === "held" && rel.days > 1) continue;
        const key = `ssd:${doc.id}:${rel.state}:${rel.days}`;
        if (!shouldAlert(state, key, DAY)) continue;
        await fire(
          "platform.error",
          {
            vars: { context: `Diagnostic release — ${doc.number}` },
            detailsText:
              `${rel.label} — ${doc.data.project || doc.title} (${doc.data.client || doc.party}).\n\n${rel.detail}\n\n` +
              `Information handover ${humanDate(doc.data.handover)}; promised ${doc.data.promisedDays || 10} working days.`,
          },
          `${rel.label} — ${doc.number}`
        );
      }
    }

    // --- Monthly portfolio snapshot -------------------------------------
    if (ruleEnabled(config, "portfolio_snapshot")) {
      try {
        const result = takeSnapshot();
        if (result.created) {
          checks.push(`Portfolio snapshot recorded for ${result.snapshot.month}.`);
        } else if (result.updated) {
          checks.push(`Portfolio snapshot for ${result.snapshot.month} refreshed.`);
        } else {
          checks.push(`Portfolio snapshot skipped: ${result.reason}`);
        }
      } catch (err) {
        checks.push(`Portfolio snapshot failed: ${err.message}`);
      }
    }

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
