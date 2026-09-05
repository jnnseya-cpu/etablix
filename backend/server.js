/**
 * ETABLIX web server.
 *
 *   /                → public marketing site   (frontend/public)
 *   /internal        → employee portal          (frontend/internal)
 *   /shared          → shared browser modules   (shared/)
 *   /api/...         → JSON API (auth, leads, subcontractors, construx, veryx)
 */

import express from "express";
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
import agentRoutes from "./routes/agents.js";
import paymentRoutes from "./routes/payments.js";
import engagementRoutes from "./routes/engagements.js";
import { startScheduler } from "./lib/automation.js";
import { issueChallenge } from "./lib/humancheck.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // correct client IPs behind Caddy/nginx/platform proxies
app.use(express.json({ limit: "200kb" }));

// --- API ---
app.get("/api/health", (req, res) =>
  res.json({ ok: true, service: "etablix", demo: isDemoMode })
);
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
app.use("/api/engagements", engagementRoutes); // NDA-gated enquiries, quotes, PO award

app.use("/api", (req, res) => res.status(404).json({ error: "Unknown endpoint." }));

// A failing route must answer with JSON, never take the process down.
app.use((err, req, res, next) => {
  console.error("Request error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Internal error." });
});
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));

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
  res.status(500).json({ error: "Internal server error." });
});

const PORT = process.env.PORT || 3000;
load(); // ensure the store is seeded before accepting traffic
startScheduler(); // delivery automation: scheduled sweeps, guardrails and the daily digest
app.listen(PORT, () => {
  console.log(`ETABLIX running on http://localhost:${PORT}`);
  console.log(`  Public site:      http://localhost:${PORT}/`);
  console.log(`  Employee portal:  http://localhost:${PORT}/internal/login.html`);
});
