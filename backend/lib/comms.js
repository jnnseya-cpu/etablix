/**
 * ETABLIX communication engine — one emit() fans an event out across its
 * catalogued channels:
 *
 *   email  — branded HTML + plain text via SMTP (outbox.log fallback)
 *   inapp  — Control Desk notification feed (bell), stored per event
 *   sms    — recorded in sandbox until an SMS provider key is configured
 *   push   — recorded in sandbox until a push provider is configured
 *
 * Every event × channel × recipient is written to the deliveries log,
 * so the Communications console can show exactly what went where.
 */

import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collection, insert } from "./store.js";
import { EVENTS } from "./catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.join(__dirname, "..", "data", "outbox.log");

const TO_INTERNAL = process.env.NOTIFY_TO || "contact@etablix.com";
const FROM = process.env.NOTIFY_FROM || "ETABLIX Website <no-reply@etablix.com>";

const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

export const interpolate = (str, vars = {}) =>
  String(str || "").replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));

const escHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const SIGNATURE_TEXT = [
  "ETABLIX — Integrated Site Services · Part of Groupe Nseya",
  "Groupe Nseya House, Kingstanding, Birmingham, B44 8DJ",
  "contact@etablix.com · +44 7493 216101 · https://etablix.com",
].join("\n");

const SEVERITY_COLOR = { info: "#9c7a3c", success: "#1f9d61", warning: "#b07a1e", critical: "#c0392b" };

/** Branded HTML email — inline styles only, no external images (client-safe). */
export function renderEmailHtml({ subject, bodyLines, severity = "info", detailsText }) {
  const accent = SEVERITY_COLOR[severity] || SEVERITY_COLOR.info;
  const paragraphs = bodyLines
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2a323d;">${escHtml(p)}</p>`)
    .join("");
  const details = detailsText
    ? `<pre style="margin:0 0 14px;padding:14px 16px;background:#f4f5f7;border-left:3px solid ${accent};font-size:13px;line-height:1.55;color:#2a323d;white-space:pre-wrap;font-family:Consolas,Menlo,monospace;">${escHtml(detailsText)}</pre>`
    : "";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f1f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f1f3;padding:26px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">
  <tr><td style="background:#14181d;padding:22px 32px;">
    <div style="font-family:Arial Black,Arial,sans-serif;font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">ETABLIX</div>
    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#c9a96a;margin-top:3px;">INTEGRATED SITE SERVICES &nbsp;&middot;&nbsp; PART OF GROUPE NSEYA</div>
  </td></tr>
  <tr><td style="height:4px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:30px 32px 8px;font-family:Arial,Helvetica,sans-serif;">
    <h1 style="margin:0 0 18px;font-size:19px;line-height:1.35;color:#14181d;">${escHtml(subject)}</h1>
    ${paragraphs}
    ${details}
  </td></tr>
  <tr><td style="padding:18px 32px 26px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #e3e6ea;">
    <p style="margin:0;font-size:12px;line-height:1.7;color:#5b6672;">
      <b style="color:#14181d;">ETABLIX</b> — Integrated Site Services &middot; Part of Groupe Nseya<br>
      Groupe Nseya House, Kingstanding, Birmingham, B44 8DJ<br>
      <a href="mailto:contact@etablix.com" style="color:#9c7a3c;">contact@etablix.com</a> &middot; +44&nbsp;7493&nbsp;216101 &middot; <a href="https://etablix.com" style="color:#9c7a3c;">etablix.com</a>
    </p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

/** Render an event with variables into {subject, text, html}. */
export function renderEvent(code, vars = {}, { greeting, detailsText } = {}) {
  const ev = EVENTS[code];
  if (!ev) throw new Error(`Unknown communication event: ${code}`);
  const subject = interpolate(ev.subject, vars);
  const line = interpolate(ev.line, vars);
  const bodyLines = [greeting ? `Dear ${greeting},` : null, line];
  const text = [
    ...(greeting ? [`Dear ${greeting},`, ""] : []),
    line,
    ...(detailsText ? ["", detailsText] : []),
    "",
    SIGNATURE_TEXT,
  ].join("\n");
  const html = renderEmailHtml({ subject, bodyLines, severity: ev.severity, detailsText });
  return { subject, text, html, event: ev };
}

async function sendEmail(to, subject, text, html) {
  if (transport) {
    try {
      await transport.sendMail({ from: FROM, to, subject, text, html, replyTo: TO_INTERNAL });
      return { status: "sent", provider: "smtp" };
    } catch (err) {
      console.error("Email delivery failed, writing to outbox:", err.message);
      appendOutbox(to, subject, text);
      return { status: "failed", provider: "smtp", error: err.message };
    }
  }
  appendOutbox(to, subject, text);
  return { status: "logged", provider: "outbox" };
}

function appendOutbox(to, subject, text) {
  fs.mkdirSync(path.dirname(OUTBOX), { recursive: true });
  fs.appendFileSync(OUTBOX, `\n=== ${new Date().toISOString()} · To: ${to} ===\nSubject: ${subject}\n\n${text}\n`);
}

/**
 * Fire an event across its channels.
 *   emit("supplier.approved", { email, greeting, vars, detailsText, test })
 * email: external recipient (omit → internal address). greeting: "Dear X,".
 */
export async function emit(code, { email, greeting, vars = {}, detailsText, test = false } = {}) {
  const { subject, text, html, event } = renderEvent(code, vars, { greeting, detailsText });
  const results = [];

  for (const channel of event.channels) {
    if (channel === "email") {
      const to = email || TO_INTERNAL;
      const r = await sendEmail(to, subject, text, html);
      results.push({ channel, to, ...r });
    } else if (channel === "inapp") {
      insert("notifications", {
        code,
        title: subject,
        body: interpolate(event.line, vars),
        severity: event.severity,
        category: event.category,
        test,
      });
      results.push({ channel, to: "control-desk", status: "delivered", provider: "inapp" });
    } else {
      // sms / push — sandbox until a provider key is configured
      results.push({ channel, to: email || TO_INTERNAL, status: "logged", provider: `${channel}-sandbox` });
    }
  }

  for (const r of results) {
    insert("deliveries", { code, category: event.category, severity: event.severity, mandatory: event.mandatory, subject, test, ...r });
  }
  // Keep the delivery log bounded.
  const log = collection("deliveries");
  if (log.length > 500) log.splice(0, log.length - 500);
  return results;
}
