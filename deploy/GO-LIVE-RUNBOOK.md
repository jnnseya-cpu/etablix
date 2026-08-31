# ETABLIX go-live runbook — VPS route

Tailored to the chosen launch configuration: **VPS hosting (Hetzner or
DigitalOcean) · transactional SMTP now, real mailbox later · etablix.com
registered with registrar access.** Steps are ordered; each takes minutes.
Total: roughly one evening.

---

## Step 0 — Inbound email first (10 min, do this today)

The website publishes **contact@etablix.com** everywhere. Until a real
mailbox exists, any client who emails that address would bounce — which is
worse than no website. Fix it before launch:

1. Log in to your registrar and open **Email forwarding** (most registrars
   include it free).
2. Forward `contact@etablix.com` → your personal inbox
   (e.g. jnbankwa@gmail.com).
3. Send yourself a test email to contact@etablix.com and confirm it
   arrives.

When you later buy Google Workspace or Zoho, remove the forward and create
the real mailbox — nothing on the website changes.

## Step 1 — Create the server (10 min)

- **Hetzner**: Cloud Console → New server → Ubuntu 24.04, shared vCPU
  **CX22** (2 vCPU / 4 GB, ~€4/mo) — more than enough. Falkenstein or
  Nuremberg region is fine for UK traffic.
  *(DigitalOcean equivalent: Basic Droplet, 1–2 GB, Ubuntu 24.04, London.)*
- Add your SSH key at creation.
- Note the server's public IPv4 address → referred to below as `SERVER_IP`.

## Step 2 — Point DNS now (5 min; propagates while you work)

At your registrar, create:

| Type | Name | Value |
|---|---|---|
| A | `@` | `SERVER_IP` |
| A | `www` | `SERVER_IP` |

Keep any existing MX/forwarding records from Step 0.

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
                            # (SMTP_* can wait for Step 5)

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

## Step 5 — Outbound notifications via Brevo (15 min)

Brevo's free tier (300 emails/day) is far beyond form-notification needs.

1. Create a free account at brevo.com → **SMTP & API → SMTP** → note the
   server, port, login and SMTP key.
2. Under **Senders & Domains → Domains**, add `etablix.com` and create the
   DNS records Brevo shows you (its DKIM CNAMEs/TXT and SPF include) at
   your registrar, then verify. This keeps notifications out of spam.
3. Add to `/etc/etablix.env`:

   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=<your Brevo login>
   SMTP_PASS=<your SMTP key>
   NOTIFY_TO=contact@etablix.com
   NOTIFY_FROM=ETABLIX Website <no-reply@etablix.com>
   ```

4. `systemctl restart etablix`

`NOTIFY_TO=contact@etablix.com` works because of the Step 0 forward.
(Note: anything submitted before SMTP was configured is preserved in
`/opt/etablix/backend/data/outbox.log` and in the Control Desk.)

## Step 6 — Backups (5 min)

```bash
cp /opt/etablix/deploy/backup.sh /opt/etablix-backup.sh && chmod +x /opt/etablix-backup.sh
echo '15 2 * * * root /opt/etablix-backup.sh' > /etc/cron.d/etablix-backup
/opt/etablix-backup.sh      # first archive, proves it works
```

Also enable the provider's server snapshots (Hetzner: Backups toggle,
+20% of server cost) for whole-box recovery.

## Step 7 — Launch verification (15 min)

- [ ] `/api/health` on the live domain returns `"demo": false`
- [ ] Sign in at `https://etablix.com/internal/login.html` with your real
      admin; no demo hint visible; Commercial Playbook loads
- [ ] Submit a test **project enquiry** with a document from the live site
      → appears in the Control Desk with reference + downloadable file
      → notification email arrives at your inbox
- [ ] Submit a test **supplier registration** the same way
- [ ] Delete the two test records via status (or leave marked as test)
- [ ] `https://www.etablix.com` → redirects to `https://etablix.com`
- [ ] Email to contact@etablix.com from another account reaches you

## Updating the live site later

```bash
cd /opt/etablix && git pull && npm ci --omit=dev && systemctl restart etablix
```

## When the real mailbox arrives (Google Workspace / Zoho)

1. Create the mailbox, switch the registrar's MX records to the provider,
   remove the Step 0 forward.
2. Merge the provider's SPF include into the existing SPF record
   (one TXT record containing both provider and Brevo includes).
3. Optionally switch `SMTP_*` from Brevo to the mailbox provider —
   or keep Brevo for notifications; both work.
