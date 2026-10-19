/**
 * The published contact route — and the rule that nothing else is kept.
 *
 * THE RULE. The watcher stores an organisation and the published way in. It
 * never stores a personal email address, and it never stores one in a form
 * that could be reconstructed. This is enforced here, in one function, and
 * asserted by signals.test.mjs, because a rule that lives in a reviewer's
 * memory is not a rule.
 *
 * WHY, IN PLAIN TERMS. A named work address — firstname.lastname@company —
 * is personal data under the UK GDPR even though the company is not a person.
 * Collecting it from a website means it was not obtained from the person, and
 * Article 14 then obliges us to tell each of them where we got it, normally
 * within a month. That is answerable for ten people and dishonest at any
 * scale a crawler reaches. Harvested lists are also precisely what the
 * regulator treats as high risk, and the ICO has been consistent about it.
 *
 * A role address is different in kind. info@, procurement@, tenders@ exist to
 * receive unsolicited approaches, belong to the organisation rather than to a
 * person, and are published for the purpose we would use them for. So the
 * allowlist below is exhaustive and closed: anything not on it is discarded,
 * including anything that merely looks generic.
 */

/** Closed allowlist. A local part not on this list is never stored. */
export const ROLE_LOCALPARTS = new Set([
  "info", "enquiries", "enquiry", "contact", "hello", "mail", "office", "reception",
  "procurement", "purchasing", "supplychain", "supply-chain", "scm", "sourcing",
  "suppliers", "supplier", "vendors", "tenders", "tender", "bids", "commercial",
  "estimating", "estimates", "preconstruction", "admin", "accounts", "sales",
  // ADDED WHEN THE NOTICE APIS STARTED SUPPLYING CONTACTS. Each of these is
  // unambiguously a function rather than a person, which is the only test
  // that matters here: no dot, no digit, and nobody is called "Frameworks".
  // They are the forms that actually appear in a procurement notice's
  // contact field and on a contractor's work-with-us page.
  "bd", "businessdevelopment", "newbusiness", "opportunities", "workwithus",
  "quotes", "quotations", "frameworks", "esourcing", "etendering", "notices",
  "buying", "contracts", "procure", "supplierrelations", "supplychainteam",
]);

const EMAIL = /\b([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24})\b/g;

/**
 * Is this an address belonging to a person rather than to a role?
 *
 * Deliberately inverted: the question answered is "is it on the allowlist",
 * so an unrecognised shape is personal by default. A new role name somebody
 * invents is a false negative we can live with; a person's address stored
 * because the pattern did not match is not.
 */
export function isRoleAddress(address) {
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(String(address || "").trim().toLowerCase());
  if (!m) return false;
  const local = m[1];
  // A dot, a plus or a digit in the local part is how personal addresses are
  // built — j.smith, smith.j, jsmith2 — so none of those qualify however the
  // rest of it reads.
  if (/[.+]/.test(local) || /\d/.test(local)) return false;
  return ROLE_LOCALPARTS.has(local);
}

/**
 * Pull the published contact route out of a page.
 *
 * Returns { contactUrl, roleAddress } and nothing else. Every address found
 * that is not on the allowlist is dropped here and never reaches a caller,
 * so no caller can store one by mistake.
 */
export function publishedContact(html, baseUrl) {
  const text = String(html || "");
  let roleAddress = null;
  for (const m of text.matchAll(EMAIL)) {
    const addr = `${m[1]}@${m[2]}`.toLowerCase();
    if (isRoleAddress(addr)) { roleAddress = addr; break; }
  }

  // The route in matters more than an address: a supplier registration page
  // is the front door an organisation has actually built for this.
  let contactUrl = null;
  const links = [...text.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)];
  const WANTED = [
    /supplier|supply[- ]?chain|become[- ]a[- ]supplier|vendor|procurement|tender/i,
    /contact|get[- ]in[- ]touch|enquir/i,
  ];
  for (const want of WANTED) {
    const hit = links.find((l) => want.test(l[1]) || want.test(l[2].replace(/<[^>]+>/g, " ")));
    if (hit) {
      try { contactUrl = new URL(hit[1], baseUrl).toString(); } catch { /* malformed href */ }
      if (contactUrl) break;
    }
  }
  return { contactUrl, roleAddress };
}

/**
 * The last gate before anything is written down.
 *
 * Every signal passes through this on its way to storage. It strips any
 * address that is not a role address and removes raw page text, so a change
 * elsewhere cannot start persisting personal data without this function
 * being changed too — and changing it fails the test.
 */
export function scrub(signal) {
  const out = { ...signal };
  delete out.html;
  delete out.body;
  delete out.raw;
  if (out.roleAddress && !isRoleAddress(out.roleAddress)) out.roleAddress = null;
  for (const field of ["title", "summary", "org"]) {
    if (typeof out[field] === "string") {
      out[field] = out[field].replace(EMAIL, (full) => (isRoleAddress(full) ? full : "[address removed]"));
    }
  }
  return out;
}
