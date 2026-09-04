/**
 * ETABLIX shared validation — identical rules run in the browser (for
 * instant feedback) and on the server (as the source of truth).
 */

import { SECTORS, SERVICES, CAPABILITIES, CAPABILITIES_MAX } from "./constants.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s().-]{6,19}$/;

export function isEmail(value) {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

export function isPhone(value) {
  return typeof value === "string" && PHONE_RE.test(value.trim());
}

function requireText(value, min, max, label, errors) {
  const v = typeof value === "string" ? value.trim() : "";
  if (v.length < min) errors.push(`${label} is required (min ${min} characters).`);
  else if (v.length > max) errors.push(`${label} must be under ${max} characters.`);
  return v;
}

function optionalText(value, max) {
  return (typeof value === "string" ? value.trim() : "").slice(0, max);
}

/** Validate a business project enquiry. Returns {ok, errors, data}. */
export function validateLead(input = {}) {
  const errors = [];
  const data = {
    name: requireText(input.name, 2, 120, "Full name", errors),
    company: requireText(input.company, 2, 160, "Company", errors),
    email: (input.email || "").trim().toLowerCase(),
    phone: (input.phone || "").trim(),
    service: (input.service || "").trim(),
    sector: (input.sector || "").trim(),
    location: optionalText(input.location, 160),
    startDate: optionalText(input.startDate, 40),
    brief: requireText(input.brief, 10, 4000, "Project brief", errors),
  };
  if (!isEmail(data.email)) errors.push("A valid business email address is required.");
  if (data.phone && !isPhone(data.phone)) errors.push("Telephone number looks invalid.");
  if (!SERVICES.includes(data.service)) errors.push("Please select the required service.");
  if (data.sector && !SECTORS.includes(data.sector)) errors.push("Unknown project sector.");
  return { ok: errors.length === 0, errors, data };
}

/**
 * Services selected on a registration: repeated multipart "capabilities"
 * fields (array, or a lone string when one box is ticked), deduplicated
 * and restricted to the published list.
 */
function normaliseCapabilities(input) {
  const raw = input.capabilities ?? input.capability ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  return [...new Set(list.map((v) => String(v).trim()))].filter((v) => CAPABILITIES.includes(v));
}

/** Validate a supplier / subcontractor registration. */
export function validateSubcontractorApplication(input = {}) {
  const errors = [];
  const data = {
    legalName: requireText(input.legalName, 2, 200, "Legal company name", errors),
    tradingName: optionalText(input.tradingName, 200),
    contact: requireText(input.contact, 2, 120, "Contact person", errors),
    email: (input.email || "").trim().toLowerCase(),
    phone: (input.phone || "").trim(),
    regNumber: requireText(input.regNumber, 2, 40, "Company registration number", errors),
    capabilities: normaliseCapabilities(input),
    territories: requireText(input.territories, 2, 240, "Operating territories", errors),
    largestContract: optionalText(input.largestContract, 80),
    mobilisation: optionalText(input.mobilisation, 80),
    statement: requireText(input.statement, 10, 4000, "Capability statement", errors),
    confirmed: Boolean(input.confirmed),
  };
  if (!isEmail(data.email)) errors.push("A valid business email address is required.");
  if (!data.phone || !isPhone(data.phone)) errors.push("A valid telephone number is required.");
  if (!data.capabilities.length) errors.push("Select at least one service you provide.");
  else if (data.capabilities.length > CAPABILITIES_MAX)
    errors.push(`Select at most ${CAPABILITIES_MAX} services.`);
  // Joined string keeps every existing display, email and filter working.
  data.capability = data.capabilities.join("; ");
  if (!data.confirmed) {
    errors.push(
      "Please confirm the information is accurate and supporting records can be provided."
    );
  }
  return { ok: errors.length === 0, errors, data };
}

/** Validate employee login credentials shape (not the credentials themselves). */
export function validateLogin(input = {}) {
  const errors = [];
  const data = {
    email: (input.email || "").trim().toLowerCase(),
    password: typeof input.password === "string" ? input.password : "",
  };
  if (!isEmail(data.email)) errors.push("Enter a valid email address.");
  if (data.password.length < 8) errors.push("Password must be at least 8 characters.");
  return { ok: errors.length === 0, errors, data };
}
