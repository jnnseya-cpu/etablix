/**
 * Does the DNS still vouch for our mail?
 *
 * SPF, DKIM and DMARC are three DNS records that decide whether a receiving
 * mailbox treats a message from this domain as ours or as a forgery. They are
 * edited by hand, at a registrar, by people who are not thinking about email
 * — which is how a key gets revoked, a record gets truncated by a copy-paste,
 * or an include disappears, with nothing anywhere reporting it.
 *
 * The consequence is invisible from inside the application: the app sends the
 * message, the SMTP server accepts it, and the receiving mailbox quietly
 * files it as junk. It was found by a customer saying they never heard back.
 *
 * So it is checked on a schedule, by the platform, and a regression raises an
 * alert. tools/mail-doctor.mjs is the same check with a human-readable
 * report; this is the part the scheduler runs.
 */

import dns from "node:dns/promises";

/** Selectors the common UK hosts publish under. A miss is reported as a
 *  miss, never as an absence. */
const SELECTORS = [
  "hostingermail-a", "hostingermail-b", "hostingermail-c",   // Hostinger
  "default", "google", "selector1", "selector2",             // generic / Microsoft 365
  "s1", "s2", "k1", "k2", "k3",                              // Mailchimp, Zoho, Klaviyo
  "mail", "dkim", "email", "smtp", "mte1", "mte2",           // generic
  "fm1", "fm2", "fm3", "protonmail", "titan", "zoho",        // Fastmail, Proton, Titan, Zoho
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function txt(name) {
  for (let i = 0; i < 4; i += 1) {
    try { return (await dns.resolveTxt(name)).map((r) => r.join("")); }
    catch (e) {
      if (e.code === "ENOTFOUND" || e.code === "ENODATA") return null;
      if (i === 3) throw e;
      await sleep(300 * (i + 1));
    }
  }
  return null;
}

const cname = async (name) => {
  try { return (await dns.resolveCname(name))[0] || null; } catch { return null; }
};

/**
 * Read one DKIM selector, following the CNAME to where the key actually
 * lives. A lookup that fails is reported as a lookup that failed: skipping it
 * silently is how a domain with a working key was once reported as having
 * none.
 */
async function selector(sel, domain) {
  const name = `${sel}._domainkey.${domain}`;
  const target = await cname(name);
  let records = null, error = null;
  for (const at of [target, name].filter(Boolean)) {
    try { records = await txt(at); } catch (e) { error = e.code || String(e); continue; }
    if (records) break;
  }
  if (!records) return error ? { sel, state: "unresolved", detail: error } : { sel, state: "absent" };
  const key = /(?:^|;)\s*p=([^;]*)/.exec(records.join(""))?.[1]?.trim();
  return key ? { sel, state: "key", chars: key.length } : { sel, state: "revoked" };
}

/**
 * The whole picture for one domain.
 * Returns { ok, problems: [...], spf, dkim, dmarc } — `ok` is false only for
 * things that actually stop mail being trusted.
 */
export async function checkMailAuth(domain) {
  const problems = [];
  const out = { domain, at: Date.now(), problems, ok: true };

  const root = await txt(domain).catch(() => null);
  out.spf = root?.find((r) => r.toLowerCase().startsWith("v=spf1")) || null;
  if (!out.spf) problems.push("SPF: no record published — every message from this domain is unauthenticated.");

  const selectors = [];
  for (const s of SELECTORS) {
    const r = await selector(s, domain);
    if (r.state !== "absent") selectors.push(r);
  }
  out.dkim = selectors;
  const withKey = selectors.filter((r) => r.state === "key");
  const revoked = selectors.filter((r) => r.state === "revoked");
  const unresolved = selectors.filter((r) => r.state === "unresolved");
  if (!selectors.length) {
    problems.push("DKIM: no selector found under any name we know — nothing signs this domain's mail.");
  } else if (!withKey.length && !unresolved.length) {
    problems.push(`DKIM: every selector that answered (${revoked.map((r) => r.sel).join(", ")}) publishes an empty key, which is a revocation. Every signed message fails.`);
  }

  const dm = await txt(`_dmarc.${domain}`).catch(() => null);
  out.dmarc = dm?.find((r) => r.toLowerCase().startsWith("v=dmarc1")) || null;
  if (!out.dmarc) {
    problems.push("DMARC: no record — receivers are given no policy and no way to report failures.");
  } else if (!/(?:^|;)\s*rua=/i.test(out.dmarc)) {
    problems.push("DMARC: no rua= reporting address, so nobody is told when this domain's mail fails authentication.");
  }

  out.ok = problems.length === 0;
  out.summary = out.ok
    ? `SPF present, ${withKey.length} DKIM key(s) published, DMARC with reporting`
    : problems.join(" ");
  return out;
}
