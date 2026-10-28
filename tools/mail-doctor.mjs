/**
 * Why did the enquiry land in the junk box?
 *
 *   node tools/mail-doctor.mjs [domain]
 *
 * Reads the live DNS for the sending domain and reports the three records
 * that decide whether a mailbox trusts a message: SPF, DKIM and DMARC.
 *
 * It exists because the failure that junks a website enquiry is invisible
 * from the application. The app sends the mail successfully, the SMTP server
 * accepts it, and the receiving mailbox quietly files it as a forgery —
 * because a message that claims to come from your own domain and cannot be
 * authenticated as yours is the exact shape of a spoof.
 *
 * The nastiest case, and the one this was written for: a DKIM selector that
 * exists but publishes "p=" with no key. That is the DNS way of REVOKING a
 * key. Every message signed with it fails. It looks configured and it is not.
 *
 * The second nastiest case is this tool's own: a selector whose lookup timed
 * out was skipped in silence, so a domain whose working key simply had not
 * answered was reported as having no working key at all. A lookup that fails
 * is now reported as a lookup that failed, and it can never turn into a
 * verdict about the selectors that did answer.
 */
import dns from "node:dns/promises";

const DOMAIN = process.argv[2] || process.env.NOTIFY_DOMAIN || "etablix.com";
// The selectors the common UK hosts publish under. Not exhaustive — a miss
// here is reported as "not found under the names we know", never as "absent".
const SELECTORS = [
  "hostingermail-a", "hostingermail-b", "hostingermail-c",   // Hostinger
  "default", "google", "selector1", "selector2",             // generic / Microsoft 365
  "s1", "s2", "k1", "k2", "k3",                              // Mailchimp, Zoho, Klaviyo
  "mail", "dkim", "email", "smtp", "mte1", "mte2",           // generic
  "fm1", "fm2", "fm3", "protonmail", "titan", "zoho",        // Fastmail, Proton, Titan, Zoho
];

const findings = [];
const bad  = (t, d, fix) => findings.push({ level: "FAIL", t, d, fix });
const warn = (t, d, fix) => findings.push({ level: "WARN", t, d, fix });
const good = (t, d)      => findings.push({ level: "OK",   t, d });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const txt = async (name) => {
  for (let i = 0; i < 4; i++) {
    try { return (await dns.resolveTxt(name)).map((r) => r.join("")); }
    catch (e) {
      if (e.code === "ENOTFOUND" || e.code === "ENODATA") return null;
      if (i === 3) throw e;
      await sleep(300 * (i + 1));
    }
  }
};

const cname = async (name) => {
  try { return (await dns.resolveCname(name))[0] || null; } catch { return null; }
};

/**
 * Read one DKIM selector.
 *
 * A selector is usually a CNAME into the mail host's own zone, and the key
 * lives at the far end of it. Querying TXT through the CNAME works, but it
 * is the query that times out first when a resolver is slow — so the CNAME
 * is followed explicitly and the target read directly, with the through-the
 * -CNAME lookup as the fallback rather than the only attempt.
 *
 * Returns { state: "key" | "revoked" | "absent" | "unresolved", ... }.
 */
async function readSelector(sel) {
  const name = `${sel}._domainkey.${DOMAIN}`;
  const target = await cname(name);
  let records = null, error = null;
  for (const at of [target, name].filter(Boolean)) {
    try { records = await txt(at); } catch (e) { error = e.code || String(e); continue; }
    if (records) break;
  }
  if (!records) {
    // A lookup that TIMED OUT is not a selector that is absent, and it is
    // certainly not a selector that is broken. Reporting it as either is
    // how this tool once told me every key on the domain was revoked when
    // the one carrying the real key had simply not answered in time.
    if (error) return { sel, state: "unresolved", detail: error, target };
    return { sel, state: "absent", target };
  }
  const rec = records.join("");
  const key = /(?:^|;)\s*p=([^;]*)/.exec(rec)?.[1]?.trim();
  if (!key) return { sel, state: "revoked", target };
  return { sel, state: "key", chars: key.length, target };
}

/**
 * BEFORE ANY VERDICT: CAN THIS MACHINE RESOLVE DNS, AND DOES THE DOMAIN EXIST?
 *
 * THE FAILURE THIS ANSWERS, AND IT WAS THIS TOOL'S SECOND TIME. Run inside a
 * container whose outbound traffic goes through an HTTPS proxy that resolves
 * names itself, every lookup returns ENOTFOUND. txt() treats ENOTFOUND as "no
 * such record", which is right for a missing _dmarc subdomain and catastrophically
 * wrong for the domain itself. So this printed "no SPF record at all", "no DKIM
 * selector", "no DMARC record", "MX none" and "3 blocking problems" about a
 * domain whose records it had never actually read — and that report was taken
 * seriously for several minutes.
 *
 * The header of this file already states the rule it was breaking: a lookup
 * that fails is reported as a lookup that failed, and can never turn into a
 * verdict. That was applied to DKIM selectors and not to anything else.
 *
 * A control lookup comes first. If a name that certainly exists cannot be
 * resolved, the fault is here and NO verdict about anyone's DNS is safe, so
 * none is offered. Exit code 2 means "could not determine", which is a
 * different thing from 0 (nothing wrong) and 1 (something wrong).
 */
const CONTROL = "cloudflare.com";
async function diagnosable(domain) {
  try {
    await dns.resolveNs(CONTROL);
  } catch (e) {
    return { ok: false, why: `this machine cannot resolve DNS at all — a control lookup of ${CONTROL} returned ${e.code || e.message}` };
  }
  try {
    await dns.resolveNs(domain);
    return { ok: true };
  } catch (e) {
    if (e.code === "ENOTFOUND") {
      return { ok: false, why: `${domain} has no nameservers of its own in DNS — the domain itself does not resolve from here, so nothing can be read about its mail` };
    }
    return { ok: false, why: `nameserver lookup for ${domain} failed with ${e.code || e.message}` };
  }
}

console.log(`\n=== mail doctor · ${DOMAIN} ===\n`);

const reach = await diagnosable(DOMAIN);
if (!reach.ok) {
  console.log(`  CANNOT DIAGNOSE — ${reach.why}.\n`);
  console.log("  No findings are printed, because a lookup that did not happen is not");
  console.log("  evidence of a missing record. Run this from a machine with ordinary");
  console.log("  DNS access. If it reports the same thing there, the domain's own");
  console.log("  nameservers are the first thing to check, before SPF or DKIM.\n");
  process.exit(2);
}

// ---------------------------------------------------------------- where the mail lands
let mx = [];
try {
  mx = await dns.resolveMx(DOMAIN);
  console.log("  MX   " + mx.sort((a, b) => a.priority - b.priority).map((m) => m.exchange).join(", "));
} catch (e) {
  // Past the preflight the domain resolves, so ENOTFOUND/ENODATA here really
  // does mean no MX. Any other code is a lookup that failed, and says so.
  if (e.code === "ENOTFOUND" || e.code === "ENODATA") console.log("  MX   none");
  else console.log(`  MX   LOOKUP FAILED (${e.code || e.message}) — not read, not judged`);
}

// ------------------------------------------------------------------------- SPF
const root = (await txt(DOMAIN)) || [];
const spf = root.find((r) => r.toLowerCase().startsWith("v=spf1"));
if (!spf) {
  bad("SPF", "no SPF record at all",
      `Publish a TXT record on ${DOMAIN}: v=spf1 include:<your mail host> ~all`);
} else {
  console.log("  SPF  " + spf);
  const includes = [...spf.matchAll(/include:(\S+)/g)].map((m) => m[1]);
  const all = /[-~?+]all/.exec(spf)?.[0];
  good("SPF", `present, ${includes.length} include${includes.length === 1 ? "" : "s"}, ends ${all || "with no all mechanism"}`);
  if (!all) warn("SPF", "no 'all' mechanism — the record says nothing about senders it did not list",
                 "End the record with ~all while you are testing, then -all");
  for (const inc of includes) {
    const sub = await txt(inc);
    if (sub) console.log(`       └ ${inc} → ${sub.find((r) => r.startsWith("v=spf1")) || sub[0]}`);
  }
  warn("SPF", "only the hosts above may send as this domain",
       "If the website sends its own mail from the web server rather than through this host, SPF FAILS for every enquiry. Send through the mail host's authenticated SMTP, or add the sender to the record.");
}

// ------------------------------------------------------------------------ DKIM
const selectors = [];
for (const s of SELECTORS) {
  const r = await readSelector(s);
  if (r.state === "absent") continue;
  selectors.push(r);
  const via = r.target ? `  (via ${r.target})` : "";
  if (r.state === "key") console.log(`  DKIM ${r.sel} → KEY PRESENT, ${r.chars} chars${via}`);
  else if (r.state === "revoked") console.log(`  DKIM ${r.sel} → p= (EMPTY — revoked)${via}`);
  else console.log(`  DKIM ${r.sel} → LOOKUP FAILED (${r.detail}) — not read, not judged${via}`);
}
const withKey = selectors.filter((r) => r.state === "key");
const revoked = selectors.filter((r) => r.state === "revoked");
const unresolved = selectors.filter((r) => r.state === "unresolved");

if (!selectors.length) {
  bad("DKIM", "no selector found under any name we know",
      "Turn DKIM on in your mail host's control panel and publish the record it gives you. Without DKIM the only thing vouching for your mail is the sending IP.");
} else if (withKey.length) {
  good("DKIM", `${withKey.map((r) => r.sel).join(", ")} publish${withKey.length === 1 ? "es" : ""} a real key`);
  if (revoked.length) {
    warn("DKIM", `${revoked.map((r) => r.sel).join(", ")} publish an empty key (a revoked or unused rotation slot)`,
         "Harmless while another selector carries a real key — a signature is checked against the selector it names — but it is worth knowing which one your host actually signs with.");
  }
  warn("DKIM", "a published key does not prove your mail is SIGNED with it",
       "The only proof is a message. Send one to a Gmail address, open it, choose Show original, and look for dkim=pass header.i=@" + DOMAIN + ". Nothing in DNS can tell you this.");
} else if (revoked.length && !unresolved.length) {
  bad("DKIM", `every selector that answered (${revoked.map((r) => r.sel).join(", ")}) publishes an EMPTY key — "p=" with nothing after it`,
      "An empty p= is how DNS says a key is REVOKED. Every message signed with it fails DKIM. Regenerate the key in your mail host's control panel.");
} else {
  warn("DKIM", `${unresolved.map((r) => r.sel).join(", ")} could not be read (${unresolved.map((r) => r.detail).join(", ")})`,
       "Run this again on a better connection before concluding anything. A selector that did not answer is not a selector that is broken.");
}

// ----------------------------------------------------------------------- DMARC
const dm = await txt(`_dmarc.${DOMAIN}`);
const dmarc = dm?.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
if (!dmarc) {
  bad("DMARC", "no DMARC record",
      `Publish TXT on _dmarc.${DOMAIN}: v=DMARC1; p=none; rua=mailto:dmarc@${DOMAIN}; fo=1`);
} else {
  console.log("  DMARC " + dmarc);
  const tag = (k) => new RegExp(`(?:^|;)\\s*${k}=([^;]*)`, "i").exec(dmarc)?.[1]?.trim();
  const policy = (tag("p") || "").toLowerCase();
  if (policy === "none") warn("DMARC", "policy is p=none — it asks receivers to do nothing",
    "Leave it at none only while you read the reports. Once SPF and DKIM both pass, move to p=quarantine and then p=reject.");
  else good("DMARC", `policy p=${policy}`);
  if (!tag("rua")) bad("DMARC", "no rua= address, so NOBODY IS BEING TOLD when your mail fails authentication",
    `Add rua=mailto:dmarc@${DOMAIN} — this is how you find out that enquiries are failing, instead of finding out from a customer.`);
  else good("DMARC", `reports go to ${tag("rua")}`);
}

// ------------------------------------------------------- the same-domain trap
findings.push({ level: "NOTE", t: "Self-addressed mail",
  d: `An enquiry alert is sent FROM ${DOMAIN} TO ${DOMAIN}. Mail that claims your own domain and cannot be authenticated as yours is the exact shape of a spoofing attack, and Microsoft and Google filter it far harder than ordinary mail. This is why the enquiry lands in junk while other mail does not.` });

// ---------------------------------------------------------------------- report
const order = { FAIL: 0, WARN: 1, NOTE: 2, OK: 3 };
findings.sort((a, b) => order[a.level] - order[b.level]);
console.log();
for (const f of findings) {
  console.log(`  ${f.level.padEnd(4)} ${f.t} — ${f.d}`);
  if (f.fix) console.log(`       → ${f.fix}`);
}
const fails = findings.filter((f) => f.level === "FAIL").length;
console.log(`\n  ${fails} blocking problem${fails === 1 ? "" : "s"}.\n`);
process.exit(fails ? 1 : 0);
