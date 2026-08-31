# ETABLIX go-live runbook — VPS route

Tailored to the confirmed launch configuration: **your existing VPS ·
Outlook for email · your own mailbox SMTP for notifications ·
etablix.com registered with registrar access.** Steps are ordered; each
takes minutes.

---

## Step 0 — Inbound email first (10 min, do this today)

The website publishes **contact@etablix.com** everywhere. Until a real
mailbox exists on the domain, any client who emails that address would
bounce — which is worse than no website. Fix it before launch:

1. Log in to your registrar and open **Email forwarding** (most registrars
   include it free).
2. Forward `contact@etablix.com` → your Outlook address.
3. Send a test email to contact@etablix.com from another account and
   confirm it lands in your Outlook inbox.

When you later create a real mailbox on the domain, remove the forward —
nothing on the website changes.

## Step 1 — Your server (2 min)

You already have the server. Just confirm two things:

- It runs **Ubuntu 22.04 or 24.04** (`lsb_release -a`). Other distros work
  too — only the install commands differ.
- Note its **public IPv4 address** → referred to below as `SERVER_IP`
  (`curl -4 ifconfig.me` from the server shows it).

If anything else already runs on ports 80/443 on this server, tell me
before Step 4 — the Caddyfile assumes they're free.

## Step 2 — Point DNS now (5 min; propagates while you work)

At your registrar, create:

| Type | Name | Value |
|---|---|---|
| A | `@` | `SERVER_IP` |
| A | `www` | `SERVER_IP` |

Keep the email-forwarding/MX records from Step 0 — don't delete those.

## Step 3 — Install the app (20 min)

SSH in as root and run:

```bash
# Node 20 + Caddy + git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs caddy git

# App user + code
useradd -r -m -d /opt/etablix etablix
git clone https://github.com/jnnseya-cpu/etablix.git /opt/etablix
cd /opt/etablix && npm ci --omit=dev && chown -R etablix:etablix /opt/etablix

# Environment
cp deploy/etablix.env.example /etc/etablix.env
chmod 600 /etc/etablix.env
openssl rand -hex 32        # → paste as ETABLIX_TOKEN_SECRET in the next step
nano /etc/etablix.env       # fill in: secret, ETABLIX_ADMIN_EMAIL/PASSWORD/NAME
                            # (SMTP_* comes in Step 5)

# Service
cp deploy/etablix.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now etablix
curl -s localhost:3000/api/health     # expect {"ok":true,...,"demo":false}
```

`"demo": false` confirms production mode: only your real admin account
exists and the login page shows no demo hint.

## Step 4 — HTTPS (5 min)

```bash
cp /opt/etablix/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
```

Once the Step 2 DNS has propagated (usually minutes), Caddy obtains
Let's Encrypt certificates automatically. Check: `https://etablix.com`
loads with a padlock, and `https://www.etablix.com` redirects to the apex.

## Step 5 — Notifications via your own mailbox SMTP (10 min)

You chose to send through your own email account's SMTP. Two Outlook
realities to plan around:

- **The From address must be the mailbox you authenticate with.** Outlook
  will not send as `no-reply@etablix.com` — so `NOTIFY_FROM` must be your
  Outlook address. Fine for self-notifications.
- **An app password is required** (with two-step verification enabled on
  the Microsoft account): Microsoft account → Security → App passwords.
  Your normal password will be rejected for SMTP.

Add to `/etc/etablix.env` (personal Outlook.com shown; for Microsoft 365
use `smtp.office365.com` and ensure SMTP AUTH is enabled for the mailbox):

```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=<your Outlook address>
SMTP_PASS=<app password>
NOTIFY_TO=contact@etablix.com
NOTIFY_FROM=<your Outlook address>
```

Then `systemctl restart etablix`. `NOTIFY_TO=contact@etablix.com` works
because of the Step 0 forward — the notification goes out via Outlook and
comes back to your Outlook inbox through the forward.

**Fallback:** personal-mailbox SMTP has daily sending limits and Microsoft
occasionally blocks it from new server IPs. If notifications stop, nothing
is lost (every submission is in the Control Desk and queued in
`backend/data/outbox.log`) — switching to a free transactional sender
(e.g. Brevo) is a five-line env change.

## Step 6 — Backups (5 min) — what this actually is

**The problem it solves:** everything clients submit — every enquiry,
every supplier registration, every uploaded insurance certificate — lives
in one folder on this server: `/opt/etablix/backend/data` (the database
file + the uploaded documents). If the server dies, is hacked, or you
delete something by mistake, that folder *is* the business record. Backups
mean you can always get it back.

Two layers, both cheap:

**Layer 1 — nightly copy on the server** (the script already in the repo):

```bash
cp /opt/etablix/deploy/backup.sh /opt/etablix-backup.sh && chmod +x /opt/etablix-backup.sh
echo '15 2 * * * root /opt/etablix-backup.sh' > /etc/cron.d/etablix-backup
/opt/etablix-backup.sh      # run once now — proves it works
```

What it does: every night at 02:15 it zips the data folder into
`/var/backups/etablix/etablix-data-<date>.tar.gz` and deletes archives
older than 30 days. Restoring = unpacking one file back into place.

**Layer 2 — provider snapshots** (protects against the whole server
dying): in your VPS provider's control panel, enable automatic
backups/snapshots for the server (Hetzner: the "Backups" toggle, ~20% of
the server price; DigitalOcean: similar). One click, done.

**"Done" looks like:** the test run printed
`backup written: /var/backups/etablix/etablix-data-....tar.gz`, and the
provider panel shows backups enabled.

## Step 7 — Launch verification (15 min) — what this actually is

This is the dress rehearsal: you act as a client, a subcontractor and an
employee once each, on the real live site, proving the entire chain works
before you send the link to anyone. In order:

1. **The site is live and secure:** open `https://etablix.com` — padlock,
   correct pages; `https://www.etablix.com` redirects to it.
2. **Production mode is on:** `https://etablix.com/api/health` in a
   browser shows `"demo": false`.
3. **Employee side works:** sign in at
   `https://etablix.com/internal/login.html` with your real admin login.
   Confirm there is **no** demo-accounts hint on the login page, the
   Control Desk loads, and the Commercial Playbook opens.
4. **The client journey works end-to-end:** on the live site, submit a
   test project enquiry with a small PDF attached. Confirm: (a) the
   success message; (b) it appears in the Control Desk with an ENQ-
   reference; (c) the PDF downloads from the Documents column; (d) a
   notification email arrives in your Outlook.
5. **The subcontractor journey works:** same test via the supplier
   registration form → SUP- reference, document, email.
6. **Inbound email works:** from another account, email
   contact@etablix.com and confirm it reaches your Outlook (the Step 0
   forward).
7. **Tidy up:** set the two test records' status to `lost` / `declined`
   in the Control Desk so they don't sit in "new actions".

If all seven pass, the site is genuinely live — every route a real client
or supplier can take has been proven once. **"Done" looks like:** two
notification emails in your inbox, two test records closed in the desk.

## Updating the live site later

```bash
cd /opt/etablix && git pull && npm ci --omit=dev && systemctl restart etablix
```

## When the real mailbox arrives (Microsoft 365 / Zoho on etablix.com)

1. Create `contact@etablix.com` as a real mailbox, switch the registrar's
   MX records to the provider, remove the Step 0 forward.
2. Add the provider's SPF/DKIM records per their instructions.
3. Update `SMTP_*` in `/etc/etablix.env` to the new mailbox and set
   `NOTIFY_FROM=no-reply@etablix.com` (now legitimate), then
   `systemctl restart etablix`.
