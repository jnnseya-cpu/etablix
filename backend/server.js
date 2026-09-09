/**
 * ETABLIX web server.
 *
 *   /                → public marketing site   (frontend/public)
 *   /internal        → employee portal          (frontend/internal)
 *   /shared          → shared browser modules   (shared/)
 *   /api/...         → JSON API (auth, leads, subcontractors, construx, veryx)
 */

import express from "express";
import { collection, flush, counts, trimCapped } from "./lib/store.js";
import { auditSecretStorage } from "./lib/ai.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load, isDemoMode } from "./lib/store.js";

import authRoutes from "./routes/auth.js";
import leadRoutes from "./routes/leads.js";
import subcontractorRoutes from "./routes/subcontractors.js";
import construxRoutes from "./routes/construx.js";
import veryxRoutes from "./routes/veryx.js";
import veryxPublicRoutes from "./routes/veryx-public.js";
import statsRoutes from "./routes/stats.js";
import fileRoutes from "./routes/files.js";
import playbookRoutes from "./routes/playbook.js";
import userRoutes from "./routes/users.js";
import integrationRoutes from "./routes/integrations.js";
import commsRoutes from "./routes/comms.js";
import adminRoutes from "./routes/admin.js";
import automationRoutes from "./routes/automation.js";
import commercialRoutes from "./routes/commercial.js";
import orgRoutes from "./routes/org.js";
import docsRoutes from "./routes/docs.js";
import agentRoutes, { failOrphanedRuns, sweepRunPacks } from "./routes/agents.js";
import paymentRoutes from "./routes/payments.js";
import engagementRoutes from "./routes/engagements.js";
import clientRoutes from "./routes/clients.js";
import { startScheduler } from "./lib/automation.js";
import { issueChallenge } from "./lib/humancheck.js";
import { reportError } from "./lib/alerts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // correct client IPs behind Caddy/nginx/platform proxies
app.use(express.json({ limit: "200kb" }));

// --- API ---
// `busy` is here for the deploy script, not for the browser. A pipeline run
// is six passes over the whole document set, several minutes and real money,
// and recreating the container mid-run destroys it — which is exactly what a
// five-minute auto-deploy did to a live diagnostic.
// Which build is live, so a deploy can be verified and a fault can be
// attributed to a version instead of guessed at. BUILD_COMMIT is stamped in
// by the image build; the file is the fallback for a bare-metal run.
const BUILD = (() => {
  if (process.env.BUILD_COMMIT) return process.env.BUILD_COMMIT.slice(0, 12);
  try { return fs.readFileSync(path.join(root, "BUILD_COMMIT"), "utf8").trim().slice(0, 12); } catch {}
  return "unknown";
})();
const STARTED = Date.now();

app.get("/api/health", (req, res) => {
  const running = collection("agentTasks").filter((r) => r.status === "running");
  res.json({
    ok: true,
    service: "etablix",
    build: BUILD,
    startedAt: STARTED,
    uptimeSeconds: Math.round((Date.now() - STARTED) / 1000),
    demo: isDemoMode,
    busy: running.length > 0,
    runningAgentRuns: running.length,
    shuttingDown,
    rows: counts(),
  });
});
app.get("/api/human-check", (req, res) => res.json(issueChallenge())); // anti-bot challenge for the public forms
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/subcontractors", subcontractorRoutes);
app.use("/api/construx", construxRoutes);
app.use("/api/veryx", veryxRoutes);
app.use("/api/public/v1", veryxPublicRoutes); // VERYX Platform API (key-authenticated)
app.use("/api/stats", statsRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/playbook", playbookRoutes); // Commercial-in-Confidence, employees only
app.use("/api/users", userRoutes); // employee account management, admin only
app.use("/api/integrations", integrationRoutes); // CONSTRUX/VERYX platform connections, admin only
app.use("/api/comms", commsRoutes); // communication event engine: catalogue, deliveries, in-app feed
app.use("/api/admin", adminRoutes); // platform administration (purge demo data), admin only
app.use("/api/automation", automationRoutes); // delivery automation: rules, runs, scheduler
app.use("/api/commercial", commercialRoutes); // Commercial OS: pricing, bids, cash-flow, EVM, retention, GTM
app.use("/api/org", orgRoutes); // organisation structure, AI-agent workforce, positions
app.use("/api/docs", docsRoutes); // document studio: invoices, applications, POs, notices
app.use("/api/agents", agentRoutes); // AI-agent workforce: provider connection, runs, approvals
app.use("/api/payments", paymentRoutes); // supplier payments: certify, verify bank, remittance
app.use("/api/engagements", engagementRoutes);
app.use("/api/clients", clientRoutes); // client engagements: portal, checklist, decisions, automatic invoicing // NDA-gated enquiries, quotes, PO award

app.use("/api", (req, res) => res.status(404).json({ error: "Unknown endpoint." }));

// A failing route must answer with JSON, never take the process down.
// Every 5xx also emails the team through the comms engine (throttled).
app.use((err, req, res, next) => {
  console.error("Request error:", err);
  reportError(err, `${req.method} ${req.path}`);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Internal error." });
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  reportError(err, "unhandled rejection");
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  reportError(err, "uncaught exception");
  // After an uncaught exception the process state is undefined, and a process
  // in an undefined state can still write to the store. Flush, then stop, and
  // let the supervisor start a clean one. Continuing has to be a deliberate
  // decision, never the default.
  if (process.env.ETABLIX_STAY_UP_ON_CRASH !== "1") {
    try { flush(); } catch {}
    setTimeout(() => process.exit(1), 250).unref();
  }
});

// --- Static frontends ---
// HTML/JS/CSS revalidate on every load (a cheap 304 when unchanged), so a
// deploy never leaves browsers running a stale page against a new API.
// Images and fonts may cache for a day.
const staticOpts = {
  setHeaders(res, filePath) {
    res.setHeader(
      "Cache-Control",
      /\.(html|js|mjs|css|json)$/.test(filePath) ? "no-cache" : "public, max-age=86400"
    );
  },
};
app.use("/shared", express.static(path.join(root, "shared"), staticOpts));
app.use("/internal", express.static(path.join(root, "frontend", "internal"), staticOpts));
app.use(express.static(path.join(root, "frontend", "public"), { extensions: ["html"], ...staticOpts }));

// JSON errors for the API, plain 500 elsewhere.
app.use((err, req, res, next) => {
  console.error(err);
  reportError(err, `${req.method} ${req.path}`);
  res.status(500).json({ error: "Internal server error." });
});

const PORT = process.env.PORT || 3000;
load(); // ensure the store is seeded before accepting traffic
// A multi-pass agent run lives in the process. If the process went away
// mid-run, the run did too — say so rather than leaving it "running".
const orphaned = failOrphanedRuns();
if (orphaned) console.log(`Marked ${orphaned} interrupted agent run(s) as failed.`);
const trimmed = trimCapped();
if (trimmed) console.log(`Trimmed ${trimmed} row(s) from capped collections.`);
const swept = sweepRunPacks();
if (swept) console.log(`Removed ${swept} orphaned run pack(s) from the disk.`);
auditSecretStorage();
startScheduler(); // delivery automation: scheduled sweeps, guardrails and the daily digest
const server = app.listen(PORT, () => {
  console.log(`ETABLIX running on http://localhost:${PORT}`);
  console.log(`  Public site:      http://localhost:${PORT}/`);
  console.log(`  Employee portal:  http://localhost:${PORT}/internal/login.html`);
});

// A slow or abandoned client must not hold a connection open for ever.
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 120000);
server.headersTimeout = 65000;
server.keepAliveTimeout = 61000;

/**
 * Shut down without destroying anything.
 *
 * There was no signal handling here at all. `docker stop` sends SIGTERM and
 * Node exited on the spot: in-flight requests died mid-response, background
 * pipeline work vanished, and a store write caught part-way through left a
 * truncated file the server then refused to boot from.
 *
 * Now: stop taking new connections, let what is in flight finish, mark any
 * running pipeline as interrupted so it can be resumed rather than silently
 * abandoned, flush the store, and only then exit. If a request will not
 * finish inside the grace period we exit anyway — a shutdown that hangs is
 * its own outage — but the store is always flushed first.
 */
let shuttingDown = false;
function shutdown(signal, code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  const grace = Number(process.env.SHUTDOWN_GRACE_MS || 8000);
  console.log(`[shutdown] ${signal} — closing the listener, ${grace} ms grace.`);

  server.close(() => finish("in-flight requests finished"));
  const timer = setTimeout(() => finish("grace period expired"), grace);
  timer.unref();

  let finished = false;
  function finish(why) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    try {
      const n = failOrphanedRuns();
      if (n) console.log(`[shutdown] ${n} run(s) marked interrupted — their completed passes are saved and can be resumed.`);
    } catch (err) { console.error("[shutdown] could not mark runs interrupted:", err.message); }
    const f = flush();
    console.log(`[shutdown] ${why}; store ${f.ok ? "flushed and readable" : "FLUSH FAILED: " + f.error}`);
    process.exit(f.ok ? code : 1);
  }
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
