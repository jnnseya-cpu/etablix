/**
 * ETABLIX shared validation — identical rules run in the browser (for
 * instant feedback) and on the server (as the source of truth).
 */

import { TRADES, SECTORS } from "./constants.js";

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

/** Validate a public contact / project enquiry. Returns {ok, errors, data}. */
export function validateLead(input = {}) {
  const errors = [];
  const data = {
    name: requireText(input.name, 2, 120, "Full name", errors),
    company: requireText(input.company, 2, 160, "Company", errors),
    email: (input.email || "").trim().toLowerCase(),
    phone: (input.phone || "").trim(),
    sector: (input.sector || "").trim(),
    budget: (input.budget || "").trim().slice(0, 60),
    message: requireText(input.message, 10, 4000, "Project details", errors),
  };
  if (!isEmail(data.email)) errors.push("A valid email address is required.");
  if (data.phone && !isPhone(data.phone)) errors.push("Phone number looks invalid.");
  if (data.sector && !SECTORS.includes(data.sector)) errors.push("Unknown sector.");
  return { ok: errors.length === 0, errors, data };
}

/** Validate a subcontractor prequalification application. */
export function validateSubcontractorApplication(input = {}) {
  const errors = [];
  const data = {
    company: requireText(input.company, 2, 160, "Company name", errors),
    contact: requireText(input.contact, 2, 120, "Contact name", errors),
    email: (input.email || "").trim().toLowerCase(),
    phone: (input.phone || "").trim(),
    trade: (input.trade || "").trim(),
    crewSize: (input.crewSize || "").trim().slice(0, 40),
    licensed: Boolean(input.licensed),
    insured: Boolean(input.insured),
    experience: requireText(input.experience, 10, 4000, "Experience summary", errors),
  };
  if (!isEmail(data.email)) errors.push("A valid email address is required.");
  if (!data.phone || !isPhone(data.phone)) errors.push("A valid phone number is required.");
  if (!TRADES.includes(data.trade)) errors.push("Please select your primary trade.");
  if (!data.licensed) errors.push("Confirmation of trade licensing is required.");
  if (!data.insured) errors.push("Confirmation of active insurance is required.");
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
