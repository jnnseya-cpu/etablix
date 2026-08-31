# Deploying ETABLIX to production

Two supported routes. Both serve the public site, the Control Desk, the
APIs and file storage from one Node process, with persistent state under
`backend/data/` (JSON store + uploaded documents).

**Set in every environment (see `etablix.env.example`):**
`ETABLIX_TOKEN_SECRET`, `ETABLIX_ADMIN_EMAIL`, `ETABLIX_ADMIN_PASSWORD`
(these disable the demo accounts and the login-page demo hint), and the
SMTP variables when you want enquiries emailed to contact@etablix.com.

---

## Route A — Render (managed; fastest to live; no server admin)

1. In the Render dashboard: **New → Blueprint**, connect the GitHub repo.
   `render.yaml` provisions the web service and a 1 GB persistent disk
   mounted over `backend/data` automatically.
2. Under the service's **Environment** tab, fill in the `sync: false`
   variables (admin login, SMTP).
3. **Settings → Custom Domains** → add `etablix.com` and `www.etablix.com`,
   then create the DNS records Render shows you at your registrar
   (an A/ALIAS record for the apex, a CNAME for `www`). TLS certificates
   are issued automatically.
4. Every push to the connected branch auto-deploys.

Backups: Render disks have snapshot support; also consider a scheduled
job that copies `backend/data` to object storage.

## Route B — VPS (Hetzner / DigitalOcean / Lightsail; cheapest long-run; full control)

On a fresh Ubuntu 22.04/24.04 box:

```bash
# 1. Node 20 + Caddy
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs caddy

# 2. App user + code
useradd -r -m -d /opt/etablix etablix
git clone https://github.com/jnnseya-cpu/etablix.git /opt/etablix
cd /opt/etablix && npm ci --omit=dev && chown -R etablix:etablix /opt/etablix

# 3. Environment
cp deploy/etablix.env.example /etc/etablix.env
nano /etc/etablix.env               # fill in secret, admin login, SMTP
chmod 600 /etc/etablix.env

# 4. Service
cp deploy/etablix.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now etablix
curl -s localhost:3000/api/health   # → {"ok":true,...,"demo":false}

# 5. HTTPS
cp deploy/Caddyfile /etc/caddy/Caddyfile && systemctl reload caddy

# 6. Backups
cp deploy/backup.sh /opt/etablix-backup.sh && chmod +x /opt/etablix-backup.sh
echo '15 2 * * * root /opt/etablix-backup.sh' > /etc/cron.d/etablix-backup
```

DNS at your registrar: `A` record for `etablix.com` → the server's IP,
`A` (or CNAME to apex) for `www`. Caddy obtains TLS certificates
automatically once DNS resolves.

Updates: `cd /opt/etablix && git pull && npm ci --omit=dev && systemctl restart etablix`.

## Docker (either route, or Railway/Fly)

```bash
docker build -t etablix .
docker run -d -p 3000:3000 --env-file etablix.env \
  -v etablix-data:/app/backend/data --restart unless-stopped etablix
```

---

## Launch checklist

- [ ] `ETABLIX_ADMIN_EMAIL` / `ETABLIX_ADMIN_PASSWORD` set → `/api/health` returns `"demo": false`
- [ ] Sign in to the Control Desk with the real admin; demo hint absent from the login page
- [ ] Submit a test enquiry and a test supplier registration from the live site; confirm both appear in the Control Desk and (with SMTP set) arrive at contact@etablix.com
- [ ] Upload a test document on each form; download it from the Control Desk
- [ ] `https://etablix.com` and `https://www.etablix.com` both resolve with valid TLS
- [ ] Backup job has produced its first archive (VPS) / disk snapshots enabled (Render)
- [ ] DNS for email deliverability on etablix.com: SPF, DKIM and DMARC records per your mailbox provider, so notification emails don't land in spam
