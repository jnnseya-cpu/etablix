/**
 * Intake notifications — thin wrappers over the communication engine
 * (lib/comms.js). Every message here is a catalogued event, so it is
 * branded, fanned out across channels and recorded in the deliveries log.
 */

import { emit } from "./comms.js";

const ref = (prefix, id) => `${prefix}-${String(id).slice(0, 6).toUpperCase()}`;

const block = (fields) =>
  Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

/** Internal alert: new business project enquiry. */
export function notifyLead(lead) {
  emit("enquiry.logged", {
    vars: { reference: ref("ENQ", lead.id), company: lead.company, service: lead.service },
    detailsText: [
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
    ].join("\n"),
  }).catch((err) => console.error(err));
}

/** Internal alert: new supplier registration. */
export function notifyApplication(app) {
  emit("supplier.registration.logged", {
    vars: { reference: ref("SUP", app.id), company: app.legalName, capability: app.capability },
    detailsText: [
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
    ].join("\n"),
  }).catch((err) => console.error(err));
}

/** Acknowledgement to the client who submitted a project enquiry. */
export function acknowledgeLead(lead) {
  if (!lead.email) return;
  emit("enquiry.received", {
    email: lead.email,
    greeting: lead.name,
    vars: { reference: ref("ENQ", lead.id), service: lead.service },
  }).catch((err) => console.error(err));
}

/** Acknowledgement to the supplier who registered. */
export function acknowledgeApplication(app) {
  if (!app.email) return;
  emit("supplier.registration.received", {
    email: app.email,
    greeting: app.contact,
    vars: { reference: ref("SUP", app.id), company: app.legalName },
  }).catch((err) => console.error(err));
}

/** Decision / progress email to a supplier on status change. */
const STATUS_EVENTS = {
  under_review: "supplier.under_review",
  prequalified: "supplier.prequalified",
  approved: "supplier.approved",
  declined: "supplier.declined",
};

/**
 * @param shortfalls Criterion labels that fell short in a RECORDED
 * assessment (never raw scores or assessor notes). When present, the
 * decline / conditional email names the areas to develop — category
 * level only. A manual status change passes nothing and keeps the
 * neutral wording: no evidence, no cited feedback.
 */
export function notifyApplicationStatus(app, { shortfalls } = {}) {
  const code = STATUS_EVENTS[app.status];
  if (!code || !app.email) return;
  let detailsText;
  if (shortfalls?.length) {
    const list = shortfalls.map((s) => `• ${s}`).join("\n");
    detailsText =
      app.status === "declined"
        ? `The areas that did not meet our current requirements were:\n${list}\n\nIf you can evidence these in future, you are welcome to register again — applications are reassessed in full.`
        : `The areas requiring further evidence before prequalification can be confirmed:\n${list}\n\nPlease send the supporting evidence to contact@etablix.com, quoting your reference ${ref("SUP", app.id)}.`;
  }
  emit(code, {
    email: app.email,
    greeting: app.contact,
    vars: { reference: ref("SUP", app.id), company: app.legalName, capability: app.capability },
    detailsText,
  }).catch((err) => console.error(err));
}
