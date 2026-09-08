# Why enquiries land in the junk box, and the four things that fix it

Run the diagnosis first. It reads the live DNS and tells you what is wrong:

    node tools/mail-doctor.mjs etablix.com

## What it found on 8 September 2026

    MX     mx1.hostinger.com, mx2.hostinger.com
    SPF    v=spf1 include:_spf.mail.hostinger.com ~all
    DKIM   hostingermail-b → p= (EMPTY)
           hostingermail-c → p= (EMPTY)
    DMARC  v=DMARC1; p=none

Two blocking problems, and they explain the symptom exactly.

**1 · The DKIM keys are revoked.** Both selectors publish `v=DKIM1;p=` — the
tag is there and the key after it is empty. In DNS an empty `p=` does not mean
"not configured"; it means **this key is revoked, reject anything signed with
it**. So every message the mail host signs fails DKIM. From the control panel
DKIM looks switched on. It is switched off in the only place that counts.

**2 · DMARC reports go nowhere.** `p=none` with no `rua=` is a record that
asks receivers to do nothing and tells nobody the result. Authentication has
been failing for as long as those keys have been empty and there was no way to
find out except from a customer saying "did you get my email?".

**And the reason it is the ENQUIRIES that suffer.** The alert is sent from
`etablix.com` to `etablix.com`. A message that claims your own domain and
cannot be authenticated as yours is the exact shape of a spoofing attack, so
Microsoft and Google filter it far harder than ordinary mail. Newsletters from
strangers reach the inbox; your own website's enquiry does not.

---

## The four fixes, in the order that matters

### 1 · Regenerate the DKIM key — this is the one that fixes it

In hPanel → Emails → `etablix.com` → **DKIM**: regenerate or re-enable, then
confirm the DNS record it gives you is published. Verify with:

    node tools/mail-doctor.mjs etablix.com

`DKIM hostingermail-b → key present, 216 chars` is what you want to see.
`p= (EMPTY)` means it has not taken.

### 2 · Send the website's mail through the mail host, authenticated

SPF authorises Hostinger and nothing else. If the application sends mail
directly from the web server, SPF fails on every message. In `etablix.env`:

    SMTP_HOST=smtp.hostinger.com
    SMTP_PORT=465
    SMTP_USER=no-reply@etablix.com      # a mailbox that really exists
    SMTP_PASS=...
    NOTIFY_FROM=ETABLIX Website <no-reply@etablix.com>
    NOTIFY_TO=contact@etablix.com

`SMTP_USER` and the address inside `NOTIFY_FROM` **must be the same mailbox**.
If they are not, the server logs a SENDER MISALIGNMENT warning at boot and you
should believe it. If you ever move to a third-party sender — Brevo, Postmark,
SendGrid — add its `include:` to SPF and publish its DKIM records before you
send a single message through it.

### 3 · Turn DMARC into something that reports

Replace the `_dmarc.etablix.com` TXT record with:

    v=DMARC1; p=none; rua=mailto:dmarc@etablix.com; fo=1; adkim=r; aspf=r

Keep `p=none` until the reports come back clean — they will tell you, in a
week, whether SPF and DKIM are passing. Then tighten to `p=quarantine`, and
later `p=reject`. Do not jump straight to reject: if anything is still
misaligned you will silently lose real mail.

### 4 · Stopgap while the DNS propagates

Add `no-reply@etablix.com` and `contact@etablix.com` to Safe Senders in the
mailbox that receives the alerts, and drag any junked enquiry to the inbox —
that trains the filter. **This is a plaster, not a fix.** It only helps your
own mailbox; it does nothing for a client whose reply to you is being junked
at their end for the same reason.

---

## What changed in the application

Nothing here can fix DNS, but two things made the problem worse:

- **The enquiry alert now replies to the enquirer.** `Reply-To` was our own
  address, so answering a customer meant copying their address out of the
  message body. It is now their name and address, and pressing reply answers
  them.
- **The envelope sender is stated explicitly**, so the Return-Path that SPF is
  actually checked against is ours rather than whatever the provider chooses.
- **The server warns at boot** if `SMTP_USER` and `NOTIFY_FROM` are different
  domains, or if no `SMTP_HOST` is set at all — in which case every message is
  written to `backend/data/outbox.log` and nobody receives anything.

Guarded by `node backend/test/mail.test.mjs`.

## Checking it worked

1. `node tools/mail-doctor.mjs etablix.com` — zero blocking problems.
2. Send a real enquiry through the website form to a Gmail **and** an Outlook
   address you control.
3. In Gmail open the message → ⋮ → **Show original**. You want three lines:
   `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`. Anything else, and the record it
   names is the one still wrong.
