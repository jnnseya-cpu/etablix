/**
 * Organisation — the ETABLIX operating structure, the AI-agent
 * workforce and the position catalogue. Every employee can read it:
 * it is how each person finds their role, responsibilities, and what
 * the workstreams do (and are never allowed to do) around them.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { organisation } from "../lib/organisation.js";
import { ROLES } from "../../shared/constants.js";
import { CREDENTIALS, statusAll, status, setCredential, clearCredential, isKnownCredential, credentialWarnings, atRest } from "../lib/credentials.js";
import { resetMailTransport, mailSettings } from "../lib/comms.js";
import { isConfigured as chConfigured } from "../lib/companieshouse.js";
import nodemailer from "nodemailer";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => res.json(organisation()));

/* ---------------------------------------------------------------- credentials
 *
 * EVERY KEY THE PLATFORM NEEDS, SET FROM THE ADMIN ACCOUNT.
 *
 * Administrator only, and no route here ever returns a stored value — the
 * status carries a preview and nothing else. A credential a person can read
 * back out of the screen is one that leaves in a screenshot.
 */
const admin = requireRole(ROLES.ADMIN);

router.get("/credentials", admin, (req, res) => {
  res.json({
    credentials: statusAll(),
    atRest: atRest(),
    warnings: credentialWarnings(),
  });
});

router.put("/credentials/:id", admin, (req, res) => {
  const { id } = req.params;
  if (!isKnownCredential(id)) {
    return res.status(404).json({ error: "No such credential.", known: CREDENTIALS.map((c) => c.id) });
  }
  const value = req.body?.value;
  if (typeof value !== "string" || !value.trim()) {
    return res.status(400).json({ error: "A value is required." });
  }
  try {
    const out = setCredential(id, value, req.user?.email || null);
    // Mail settings take effect on the next send rather than the next restart.
    if (id.startsWith("smtp_")) resetMailTransport();
    res.json({ credential: out });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/credentials/:id", admin, (req, res) => {
  const { id } = req.params;
  if (!isKnownCredential(id)) return res.status(404).json({ error: "No such credential." });
  const out = clearCredential(id, req.user?.email || null);
  if (id.startsWith("smtp_")) resetMailTransport();
  res.json({ credential: out });
});

/**
 * Prove it works before trusting it. A key that was accepted by a form and
 * never used is indistinguishable from one that is wrong until the day
 * somebody needs it.
 */
router.post("/credentials/:id/test", admin, async (req, res) => {
  const { id } = req.params;
  if (!isKnownCredential(id)) return res.status(404).json({ error: "No such credential." });
  try {
    if (id.startsWith("smtp_")) {
      const c = mailSettings();
      if (!c.host) return res.json({ ok: false, detail: "No mail server is configured." });
      const t = nodemailer.createTransport({
        host: c.host, port: c.port, secure: c.port === 465,
        connectionTimeout: c.timeoutMs, greetingTimeout: c.timeoutMs,
        auth: c.user ? { user: c.user, pass: c.pass } : undefined,
      });
      await t.verify();
      return res.json({ ok: true, detail: `${c.host}:${c.port} accepted the connection and the credentials.` });
    }
    if (id === "companies_house") {
      return res.json({
        ok: chConfigured(),
        detail: chConfigured() ? "A key is held. It is checked against the API on the next company lookup." : "No key is held.",
      });
    }
    return res.json({ ok: Boolean(status(id).configured), detail: status(id).configured ? "A value is held." : "Nothing is held." });
  } catch (err) {
    // The message from a mail server is the useful part; it is about the
    // connection, not about the secret, so it is safe to pass on.
    res.json({ ok: false, detail: String(err.message || err).slice(0, 200) });
  }
});

export default router;
