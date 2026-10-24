/**
 * EVERY CREDENTIAL THE PLATFORM NEEDS, SETTABLE BY AN ADMINISTRATOR.
 *
 * WHY THIS EXISTS. The AI provider key could already be pasted into the Control
 * Desk without a redeploy. Nothing else could: SMTP, Companies House and the
 * alert webhook were environment-only, so connecting the mail server meant
 * editing a file on the VPS and restarting the container. That is a deployment
 * task standing in front of an ordinary administrative one, and it is the
 * reason the platform ships with no mail transport configured.
 *
 * THE ORDER OF PRECEDENCE IS DELIBERATE AND MATCHES ai.js: the environment wins,
 * the database is the fallback, and the status says which one answered. An
 * operator who sets SMTP_PASS in the environment is not silently overridden by
 * something a person typed into a form three months ago.
 *
 * AND IT IS ENCRYPTED AT REST, which the existing provider key is not.
 * ai.js says it plainly — a key in the settings table "is stored in db.json in
 * plain text, and so is in every backup of it" — and warns at boot. Making four
 * more secrets settable this way without addressing that would multiply the
 * weakness by five. So values written here are sealed with AES-256-GCM before
 * they reach the database, and a backup of the data volume no longer carries
 * readable credentials.
 *
 * WHAT IS DELIBERATELY NOT HERE:
 *   ETABLIX_TOKEN_SECRET — the signing secret. Making it settable from a web
 *     form would let anyone who reaches the admin account mint tokens, and
 *     changing it invalidates every live session at once. It stays in the
 *     environment, where rotating it is a considered act.
 *   ETABLIX_ADMIN_EMAIL / ETABLIX_ADMIN_PASSWORD — these exist to create the
 *     first administrator. A credential you need an administrator to set cannot
 *     be the one that makes the administrator.
 *
 * NOTHING HERE EVER RETURNS A VALUE TO A CALLER. The status gives a preview and
 * nothing else, and no value is logged, anywhere, at any level.
 */
import crypto from "node:crypto";
import { getSettings, saveSettings } from "./store.js";

const SETTINGS_KEY = "credentials";

/**
 * THE REGISTRY. A credential that is not listed here cannot be set, which keeps
 * this from becoming a general-purpose place to stash arbitrary values in the
 * database under an administrator's authority.
 */
export const CREDENTIALS = [
  {
    id: "smtp_host", label: "Mail server (SMTP host)", envVar: "SMTP_HOST", kind: "text",
    help: "The hostname your mail provider gives you, e.g. smtp.hostinger.com. Without it nothing is sent — every message is written to outbox.log instead.",
  },
  {
    id: "smtp_port", label: "Mail server port", envVar: "SMTP_PORT", kind: "text",
    help: "587 for STARTTLS, which is the usual choice, or 465 for implicit TLS. Defaults to 587.",
  },
  {
    id: "smtp_user", label: "Mail username", envVar: "SMTP_USER", kind: "text",
    help: "Usually the full address messages are sent from.",
  },
  {
    id: "smtp_pass", label: "Mail password", envVar: "SMTP_PASS", kind: "secret",
    help: "The mailbox password, or an app password where the provider issues one.",
  },
  {
    id: "companies_house", label: "Companies House API key", envVar: "CH_API_KEY", kind: "secret",
    help: "A free key from developer.company-information.service.gov.uk. It turns on automatic company verification on supplier registrations.",
  },
  {
    id: "alert_webhook", label: "Alert webhook URL", envVar: "ALERT_WEBHOOK_URL", kind: "secret",
    help: "A Slack or Teams incoming webhook. Alerts are written to the log either way; this is how they reach a person.",
  },
];

const byId = new Map(CREDENTIALS.map((c) => [c.id, c]));
export const isKnownCredential = (id) => byId.has(id);

/* ------------------------------------------------------------------ sealing */

/**
 * The encryption key is derived from ETABLIX_TOKEN_SECRET rather than from a
 * new variable of its own. One secret to set correctly is better than two, and
 * an installation that has already set that one gets encryption with no extra
 * step. Where it is absent — local development — values are stored as they were
 * before and the status says so rather than implying a protection that is not
 * there.
 */
function keyFor() {
  const secret = String(process.env.ETABLIX_TOKEN_SECRET || "").trim();
  if (!secret) return null;
  return crypto.scryptSync(secret, "etablix-credentials-v1", 32);
}

export const atRest = () => (keyFor() ? "encrypted" : "plaintext");

function seal(value) {
  const key = keyFor();
  if (!key) return { v: 1, plain: String(value) };
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(String(value), "utf8"), c.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: enc.toString("base64") };
}

function unseal(record) {
  if (!record || typeof record !== "object") return "";
  if (typeof record.plain === "string") return record.plain;
  const key = keyFor();
  if (!key || !record.data) return "";
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(record.iv, "base64"));
    d.setAuthTag(Buffer.from(record.tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(record.data, "base64")), d.final()]).toString("utf8");
  } catch {
    // A changed token secret makes every stored credential unreadable. That is
    // correct — it is what encryption at rest means — and it must read as "not
    // configured" rather than as an empty password sent to a mail server.
    return "";
  }
}

/* -------------------------------------------------------------- read / write */

const all = () => getSettings()[SETTINGS_KEY] || {};

/**
 * Resolve one credential. The environment wins; the database is the fallback.
 * Returns the value — callers must never pass it on to a response or a log.
 */
export function credential(id) {
  const spec = byId.get(id);
  if (!spec) return { value: "", source: "none" };
  const fromEnv = String(process.env[spec.envVar] || "").trim();
  if (fromEnv) return { value: fromEnv, source: "environment" };
  const stored = unseal(all()[id]?.value);
  return stored ? { value: stored, source: "database" } : { value: "", source: "none" };
}

/** The value alone, for the common case. Empty string when not configured. */
export const credentialValue = (id) => credential(id).value;

export function setCredential(id, value, by = null) {
  const spec = byId.get(id);
  if (!spec) throw new Error(`Unknown credential: ${id}`);
  const clean = String(value ?? "").trim();
  if (!clean) throw new Error("A value is required. Use clear to remove one.");
  saveSettings({
    [SETTINGS_KEY]: {
      ...all(),
      [id]: { value: seal(clean), setAt: Date.now(), setBy: by || null, atRest: atRest() },
    },
  });
  return status(id);
}

export function clearCredential(id, by = null) {
  const spec = byId.get(id);
  if (!spec) throw new Error(`Unknown credential: ${id}`);
  const next = { ...all() };
  // Recorded as cleared rather than removed, so the audit trail shows a person
  // took it out instead of the row simply never having existed.
  next[id] = { value: null, clearedAt: Date.now(), clearedBy: by || null };
  saveSettings({ [SETTINGS_KEY]: next });
  return status(id);
}

/* -------------------------------------------------------------------- status */

/**
 * A preview is enough to recognise a key and useless for using one. A secret
 * shows its shape only when it is long enough that the ends give nothing away;
 * anything short is reported as set and not shown at all.
 */
function preview(spec, value) {
  if (!value) return null;
  if (spec.kind !== "secret") return value.length > 48 ? `${value.slice(0, 45)}…` : value;
  return value.length >= 16 ? `${value.slice(0, 6)}…${value.slice(-4)}` : "set";
}

export function status(id) {
  const spec = byId.get(id);
  if (!spec) return null;
  const { value, source } = credential(id);
  const row = all()[id] || {};
  return {
    id: spec.id,
    label: spec.label,
    envVar: spec.envVar,
    kind: spec.kind,
    help: spec.help,
    configured: Boolean(value),
    source,
    preview: preview(spec, value),
    atRest: source === "database" ? (row.atRest || atRest()) : null,
    setAt: row.setAt || null,
    setBy: row.setBy || null,
  };
}

/** Every credential's status. Never contains a value. */
export const statusAll = () => CREDENTIALS.map((c) => status(c.id));

/**
 * What an administrator should be told, in one line each, at boot and on the
 * Control Desk — the same job auditSecretStorage() does for the provider key.
 */
export function credentialWarnings() {
  const out = [];
  if (!keyFor()) {
    const stored = statusAll().filter((s) => s.source === "database");
    if (stored.length) {
      out.push(`${stored.length} credential(s) are stored in the database in plain text, and so are in every backup of it, because ETABLIX_TOKEN_SECRET is not set. Set it and save them again to encrypt them.`);
    }
  }
  if (!credentialValue("smtp_host")) {
    out.push("No mail server is configured, so nothing is sent — every message is written to outbox.log instead.");
  }
  return out;
}
