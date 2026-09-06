/**
 * Companies House verification — automates the check Agent 7 keeps
 * telling assessors to do by hand: does the registration number exist,
 * does the name match, is the company active, and is there insolvency
 * history?
 *
 * Configuration: set CH_API_KEY in the environment (a free key from
 * developer.company-information.service.gov.uk). Until it is set,
 * lookups return { configured: false } and the scorecard says how to
 * enable it — the feature ships dark and lights up with the key.
 */

const CH_BASE = "https://api.company-information.service.gov.uk";

export const isConfigured = () => Boolean(process.env.CH_API_KEY);

/** Normalise a UK company number: uppercase, strip spaces, pad bare digits to 8. */
export function normaliseNumber(raw) {
  const s = String(raw || "").toUpperCase().replace(/\s/g, "");
  return /^\d{1,7}$/.test(s) ? s.padStart(8, "0") : s;
}

/**
 * Look up one company. Returns:
 *   { configured: false }                       — no key set
 *   { configured, found: false }                — number unknown
 *   { configured, found: true, ...profile }     — the verification facts
 */
export async function lookupCompany(regNumber) {
  if (!isConfigured()) return { configured: false };
  const number = normaliseNumber(regNumber);
  if (!/^[A-Z0-9]{8}$/.test(number)) return { configured: true, found: false, number };

  const auth = "Basic " + Buffer.from(`${process.env.CH_API_KEY}:`).toString("base64");
  const res = await fetch(`${CH_BASE}/company/${number}`, {
    headers: { Authorization: auth },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 404) return { configured: true, found: false, number };
  if (res.status === 401) throw new Error("Companies House rejected the API key — check CH_API_KEY.");
  if (!res.ok) throw new Error(`Companies House responded HTTP ${res.status}.`);
  const c = await res.json();

  return {
    configured: true,
    found: true,
    number,
    name: c.company_name || "",
    status: c.company_status || "unknown", // active, dissolved, liquidation, administration…
    type: c.type || "",
    incorporated: c.date_of_creation || "",
    hasInsolvencyHistory: Boolean(c.has_insolvency_history),
    hasCharges: Boolean(c.has_charges),
    registeredOffice: c.registered_office_address
      ? [c.registered_office_address.address_line_1, c.registered_office_address.locality, c.registered_office_address.postal_code].filter(Boolean).join(", ")
      : "",
    accountsOverdue: Boolean(c.accounts?.overdue),
    confirmationOverdue: Boolean(c.confirmation_statement?.overdue),
    checkedAt: Date.now(),
  };
}

/** One-paragraph verification summary for scorecards and agent briefings. */
export function describeCheck(check, declaredName) {
  if (!check?.configured) return "Companies House check not configured (set CH_API_KEY to enable automatic verification).";
  if (!check.found) return `Companies House: number ${check.number} NOT FOUND — verify the registration number with the supplier before proceeding.`;
  const flags = [];
  if (check.status !== "active") flags.push(`status is "${check.status}"`);
  if (check.hasInsolvencyHistory) flags.push("insolvency history on record");
  if (check.accountsOverdue) flags.push("accounts overdue");
  if (check.confirmationOverdue) flags.push("confirmation statement overdue");
  const nameNote = declaredName && check.name && !check.name.toUpperCase().includes(String(declaredName).toUpperCase().slice(0, 12))
    ? ` Registered name "${check.name}" differs from the declared name "${declaredName}" — confirm trading-name relationship.`
    : "";
  return `Companies House: ${check.name} (${check.number}), ${check.status}, incorporated ${check.incorporated}.${flags.length ? ` FLAGS: ${flags.join("; ")}.` : " No flags."}${nameNote}`;
}
