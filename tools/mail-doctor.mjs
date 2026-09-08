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

const txt = async (name) => {
  for (let i = 0; i < 3; i++) {
    try { return (await dns.resolveTxt(name)).map((r) => r.join("")); }
    catch (e) { if (e.code === "ENOTFOUND" || e.code === "ENODATA") return null; if (i === 2) throw e; }
  }
};

console.log(`\n=== mail doctor · ${DOMAIN} ===\n`);

// ---------------------------------------------------------------- where the mail lands
let mx = [];
try {
  mx = await dns.resolveMx(DOMAIN);
  console.log("  MX   " + mx.sort((a, b) => a.priority - b.priority).map((m) => m.exchange).join(", "));
} catch { console.log("  MX   none"); }

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
let found = 0, revoked = [];
for (const s of SELECTORS) {
  let r; try { r = await txt(`${s}._domainkey.${DOMAIN}`); } catch { continue; }
  if (!r) continue;
  const rec = r.join("");
  found++;
  const key = /(?:^|;)\s*p=([^;]*)/.exec(rec)?.[1]?.trim();
  if (key === "" || key === undefined) {
    revoked.push(s);
    console.log(`  DKIM ${s} → p= (EMPTY)`);
  } else {
    console.log(`  DKIM ${s} → key present, ${key.length} chars`);
  }
}
if (!found) {
  bad("DKIM", "no selector found under any name we know",
      "Turn DKIM on in your mail host's control panel and publish the record it gives you. Without DKIM the only thing vouching for your mail is the sending IP.");
} else if (revoked.length && revoked.length === found) {
  bad("DKIM", `every selector found (${revoked.join(", ")}) publishes an EMPTY key — "p=" with nothing after it`,
      "An empty p= is how DNS says a key is REVOKED. Every message signed with it fails DKIM. Regenerate the DKIM key in your mail host's control panel so the record publishes a real key.");
} else if (revoked.length) {
  warn("DKIM", `${revoked.join(", ")} publishes an empty key (revoked); others carry a real key`,
       "Remove the revoked selectors or regenerate them, so a signature cannot be made with a dead key.");
} else {
  good("DKIM", `${found} selector${found === 1 ? "" : "s"} publishing a real key`);
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
