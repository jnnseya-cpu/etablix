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

async function deliver(subject, text, to = TO) {
  if (transport) {
    try {
      await transport.sendMail({ from: FROM, to, subject, text, replyTo: TO });
      return;
    } catch (err) {
      console.error("Email delivery failed, writing to outbox:", err.message);
    }
  }
  fs.mkdirSync(path.dirname(OUTBOX), { recursive: true });
  fs.appendFileSync(
    OUTBOX,
    `\n=== ${new Date().toISOString()} · To: ${to} ===\nSubject: ${subject}\n\n${text}\n`
  );
}

const ref = (prefix, id) => `${prefix}-${String(id).slice(0, 6).toUpperCase()}`;

const SIGNATURE = [
  "ETABLIX — Integrated Site Services · Part of Groupe Nseya",
  "Groupe Nseya House, Kingstanding, Birmingham, B44 8DJ",
  "contact@etablix.com · +44 7493 216101 · https://etablix.com",
].join("\n");

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

/** Acknowledgement to the client who submitted a project enquiry. */
export function acknowledgeLead(lead) {
  if (!lead.email) return;
  const reference = ref("ENQ", lead.id);
  const text = [
    `Dear ${lead.name},`,
    "",
    `Thank you for your enquiry to ETABLIX. It has been received and logged under reference ${reference} — please quote this reference in any correspondence.`,
    "",
    `Requested service: ${lead.service}`,
    "",
    "A member of our commercial team is reviewing your brief and will come back to you to arrange the right commercial conversation.",
    "",
    SIGNATURE,
  ].join("\n");
  deliver(`ETABLIX — enquiry received (${reference})`, text, lead.email).catch((err) => console.error(err));
}

/** Acknowledgement to the supplier who registered. */
export function acknowledgeApplication(app) {
  if (!app.email) return;
  const reference = ref("SUP", app.id);
  const text = [
    `Dear ${app.contact},`,
    "",
    `Thank you for registering ${app.legalName} with the ETABLIX specialist supply chain. Your application has been received and logged under reference ${reference} — please quote this reference in any correspondence.`,
    "",
    "Our commercial team assesses every registration against the capability, accreditation and assurance standards in our Supplier Code. We will notify you by email as your application progresses.",
    "",
    SIGNATURE,
  ].join("\n");
  deliver(`ETABLIX — supplier registration received (${reference})`, text, app.email).catch((err) => console.error(err));
}

/**
 * Decision / progress emails to a supplier when their application status
 * changes in the Control Desk. Internal-only stages are not announced.
 */
const APPLICATION_STATUS_MESSAGES = {
  under_review: {
    subject: (r) => `ETABLIX — your supplier registration ${r} is under review`,
    body: (app) => [
      "Your registration is now under active review by our commercial team.",
      "We may contact you for supporting evidence — insurances, accreditations or references — as part of the assessment. No action is needed from you at this stage.",
    ],
  },
  prequalified: {
    subject: (r) => `ETABLIX — ${r}: prequalified for the ETABLIX supply chain`,
    body: (app) => [
      `We are pleased to confirm that ${app.legalName} has been prequalified for the ETABLIX specialist supply chain in the category: ${app.capability}.`,
      "Prequalification means you are eligible to receive controlled enquiries and tender invitations for packages matching your capability. Keep your insurances, accreditations and key contact details current — we verify them again at tender and at appointment.",
    ],
  },
  approved: {
    subject: (r) => `ETABLIX — ${r}: approved supplier`,
    body: (app) => [
      `We are pleased to confirm that ${app.legalName} has been approved as an ETABLIX supply-chain partner in the category: ${app.capability}.`,
      "Our commercial team will contact you to complete onboarding: framework terms, insurance and accreditation verification, payment details and your points of contact. From then on you will receive enquiries and call-offs for matching packages.",
    ],
  },
  declined: {
    subject: (r) => `ETABLIX — your supplier registration ${r}`,
    body: (app) => [
      `Thank you for registering ${app.legalName} with ETABLIX. After assessment against our current supply-chain requirements, we will not be taking your application forward at this time.`,
      "This decision reflects our present package needs rather than a judgement on your business, and your details remain on file. You are welcome to register again as your capability, accreditations or coverage develop.",
    ],
  },
};

export function notifyApplicationStatus(app) {
  const message = APPLICATION_STATUS_MESSAGES[app.status];
  if (!message || !app.email) return;
  const reference = ref("SUP", app.id);
  const text = [
    `Dear ${app.contact},`,
    "",
    ...message.body(app).flatMap((p) => [p, ""]),
    `Reference: ${reference}`,
    "",
    SIGNATURE,
  ].join("\n");
  deliver(message.subject(reference), text, app.email).catch((err) => console.error(err));
}
