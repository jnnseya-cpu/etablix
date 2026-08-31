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
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/subcontractors", subcontractorRoutes);
app.use("/api/construx", construxRoutes);
app.use("/api/veryx", veryxRoutes);
app.use("/api/public/v1", veryxPublicRoutes); // VERYX Platform API (key-authenticated)
app.use("/api/stats", statsRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/playbook", playbookRoutes); // Commercial-in-Confidence, employees only

app.use("/api", (req, res) => res.status(404).json({ error: "Unknown endpoint." }));

// --- Static frontends ---
app.use("/shared", express.static(path.join(root, "shared")));
app.use("/internal", express.static(path.join(root, "frontend", "internal")));
app.use(express.static(path.join(root, "frontend", "public"), { extensions: ["html"] }));

// JSON errors for the API, plain 500 elsewhere.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

const PORT = process.env.PORT || 3000;
load(); // ensure the store is seeded before accepting traffic
app.listen(PORT, () => {
  console.log(`ETABLIX running on http://localhost:${PORT}`);
  console.log(`  Public site:      http://localhost:${PORT}/`);
  console.log(`  Employee portal:  http://localhost:${PORT}/internal/login.html`);
});
