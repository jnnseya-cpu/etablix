/**
 * Structured email notifications for new enquiries and supplier
 * registrations. Sends via SMTP when configured through environment
 * variables; otherwise appends the rendered message to
 * backend/data/outbox.log so nothing is lost before SMTP goes live.
 *
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  — SMTP transport
 *   NOTIFY_TO    — recipient  (default contact@etablix.com)
 *   NOTIFY_FROM  — sender     (default no-reply@etablix.com)
 */

import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.join(__dirname, "..", "data", "outbox.log");

const TO = process.env.NOTIFY_TO || "contact@etablix.com";
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

function block(fields) {
  return Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

async function deliver(subject, text) {
  if (transport) {
    try {
      await transport.sendMail({ from: FROM, to: TO, subject, text });
      return;
    } catch (err) {
      console.error("Email delivery failed, writing to outbox:", err.message);
    }
  }
  fs.mkdirSync(path.dirname(OUTBOX), { recursive: true });
  fs.appendFileSync(
    OUTBOX,
    `\n=== ${new Date().toISOString()} · To: ${TO} ===\nSubject: ${subject}\n\n${text}\n`
  );
}

const ref = (prefix, id) => `${prefix}-${String(id).slice(0, 6).toUpperCase()}`;

/** Fire-and-forget notification for a new business project enquiry. */
export function notifyLead(lead) {
  const reference = ref("ENQ", lead.id);
  const subject = `ETABLIX enquiry ${reference} — ${lead.company} (${lead.service})`;
  const text = [
    `New business project enquiry ${reference}`,
    "",
    block({
      "Full name": lead.name,
      Company: lead.company,
      Email: lead.email,
      Telephone: lead.phone,
      "Required service": lead.service,
      "Project sector": lead.sector,
      "Project location": lead.location,
      "Required start date": lead.startDate,
    }),
    "",
    "Project brief:",
    lead.brief,
    "",
    lead.documents?.length
      ? `Supporting documents (${lead.documents.length}): ${lead.documents.map((d) => d.name).join(", ")}`
      : "Supporting documents: none",
    "",
    "Review and progress this enquiry in the ETABLIX Control Desk.",
  ].join("\n");
  deliver(subject, text).catch((err) => console.error(err));
}

/** Fire-and-forget notification for a new supplier registration. */
export function notifyApplication(app) {
  const reference = ref("SUP", app.id);
  const subject = `ETABLIX supplier registration ${reference} — ${app.legalName} (${app.capability})`;
  const text = [
    `New supplier registration ${reference}`,
    "",
    block({
      "Legal company name": app.legalName,
      "Trading name": app.tradingName,
      "Contact person": app.contact,
      Email: app.email,
      Telephone: app.phone,
      "Company registration number": app.regNumber,
      "Primary capability": app.capability,
      "Operating territories": app.territories,
      "Largest contract delivered": app.largestContract,
      "Mobilisation lead time": app.mobilisation,
    }),
    "",
    "Capability statement:",
    app.statement,
    "",
    app.documents?.length
      ? `Supporting documents (${app.documents.length}): ${app.documents.map((d) => d.name).join(", ")}`
      : "Supporting documents: none",
    "",
    "Assess this registration in the ETABLIX Control Desk.",
  ].join("\n");
  deliver(subject, text).catch((err) => console.error(err));
}
