/**
 * The enquiry alert must be answerable by pressing reply.
 *
 *   node backend/test/mail.test.mjs
 *
 * Written after customer enquiries were found in the junk box. The junking
 * itself is a DNS problem (node tools/mail-doctor.mjs), but two things in
 * this codebase made it worse and both are checked here.
 */
process.env.SMTP_HOST = process.env.SMTP_HOST || "smtp.invalid.test";
process.env.SMTP_USER = process.env.SMTP_USER || "alerts@somewhere-else.test";
process.env.NOTIFY_FROM = process.env.NOTIFY_FROM || "no-reply@etablix.com";

const sent = [];
const { default: nodemailer } = await import("nodemailer");
nodemailer.createTransport = () => ({ sendMail: async (m) => { sent.push(m); return { messageId: "x" }; } });

const { emit } = await import("../lib/comms.js");
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x ? "  → " + JSON.stringify(x).slice(0, 200) : ""))); };

await emit("enquiry.logged", {
  replyTo: "A Customer <buyer@clientcompany.test>",
  vars: { reference: "ENQ-2026-001", company: "Client Company Ltd", service: "Site establishment" },
  detailsText: "Email: buyer@clientcompany.test",
});
const m = sent.at(-1);
ok(!!m, "the alert was handed to the transport");
ok(m.replyTo === "A Customer <buyer@clientcompany.test>",
   "Reply-To is the ENQUIRER, so pressing reply answers the customer", m.replyTo);
ok(m.from.includes("ETABLIX"), "From carries the company display name, not a bare mailbox", m.from);
ok(!!m.envelope && m.envelope.from === "no-reply@etablix.com",
   "the envelope sender is stated explicitly, so the Return-Path SPF is checked against is ours", m.envelope);
ok(!!m.text && !!m.html, "both a plain-text and an HTML part are sent — text-less HTML is a spam signal");
ok(!/\{\{\w+\}\}/.test(m.subject + m.text), "no unreplaced token reached the recipient", m.subject);

await emit("enquiry.received", { email: "buyer@clientcompany.test", greeting: "A Customer",
  vars: { reference: "ENQ-2026-001", service: "Site establishment" } });
const c = sent.at(-1);
ok(c.replyTo && !c.replyTo.includes("clientcompany"),
   "the client acknowledgement replies to US, not back to the client", c.replyTo);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
