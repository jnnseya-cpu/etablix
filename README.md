# ETABLIX — Integrated Site Services

Website, Control Desk and platform APIs for **ETABLIX** (Integrated Site
Services), part of **Groupe Nseya**. ETABLIX plans, procures, integrates and
controls every critical temporary-site and workforce-accommodation service —
from first mobilisation to final reinstatement — and builds two technology
products: **CONSTRUX** (Construction AI Operating System) and **VERYX**
(Enterprise Execution Intelligence).

## Quick start

```bash
npm install
npm start          # or: npm run dev (auto-restart on change)
```

| Surface | URL |
|---|---|
| Public website | http://localhost:3000/ |
| ETABLIX Control Desk (employee login) | http://localhost:3000/internal/login.html |
| API health check | http://localhost:3000/api/health |
| VERYX Platform API (key-authenticated) | http://localhost:3000/api/public/v1/ping |

### Demo employee accounts (seed data — replace in production)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@etablix.com` | `etablix-admin-2026` |
| Project Manager | `pm@etablix.com` | `etablix-pm-2026` |
| QA Inspector | `qa@etablix.com` | `etablix-qa-2026` |

### Demo VERYX Platform API key

```
vx_test_demo_2f8a1c9e77b34d5f     (test env, all six scopes, 250 ACU)
```

> Set `ETABLIX_TOKEN_SECRET` in production and replace the seed users/keys.

## Site map

**Public** — cinematic landing page (`/`) carrying the full commercial story:
problem, what we deliver, lifecycle, Managed Procurement Desk, three
engagement models, illustrative frameworks (interface exposure, control
intensity), sectors, CONSTRUX/VERYX, supply chain, founder, Site Systems
Diagnostic, business enquiry form and supplier registration form. Supporting
pages: `/about`, `/what-we-offer`, `/how-it-works`, `/contact`,
`/subcontractors`, `/construx`, `/veryx`, and governance pages
`/policies/privacy`, `/policies/terms`, `/policies/cookies`,
`/policies/supplier-code`, `/policies/modern-slavery`.

**Internal — ETABLIX Control Desk** (`/internal`): commercial intake, one
operating view. KPIs (new actions, project enquiries, supplier applications,
stored documents), searchable enquiry and application tables with references
(ENQ-/SUP-), uploaded-document downloads and inline status control.

**Client project portal** (`/client-portal?t=…`): the customer half of the
lifecycle, end to end. See below.

**Supplier portal** (`/supplier-portal?t=…`): onboarding, NDA-gated enquiry
packs, quotations and applications for payment.

## The client engagement lifecycle

One flow, from an accepted invoice to a closed and paid engagement, with the
money falling out of it automatically at two points:

```
invoice accepted
   → portal issued, carrying the requirement checklist for that deliverable
   → client answers every line ONCE (or marks it "not held" with a reason)
   → client confirms the start   ──►  DEPOSIT INVOICE RAISES ITSELF
   → funds clear, work begins
   → deliverable published in the portal
   → client approves / reviews with comments / rejects
        approve                   ──►  BALANCE INVOICE RAISES ITSELF
   → paid → closed        (Models B and C loop back for the next month)
```

**Model A** is 30% to start and 70% on approval. **Models B and C** are the
first month in advance — mobilisation, month one, platform fee, and for
Model C the month-one supplier spend — then a month at a time, each one
invoiced at the moment the client approves the month just ended.

Three rules are built into the mechanism rather than written on a wall:

- **No repetition.** Everything is asked for once, in one checklist built
  from the deliverable. 62 requirement lines across seven packs, plus the
  five commercial questions that otherwise generate a phone call in week two:
  who can authorise, the PO reference, the VAT position, where invoices go,
  and the confidentiality position.
- **No questions.** Every line carries *why* we need it and *the format that
  lets us read it* — a programme as a PDF print **and** a CSV task list,
  a drawing as a PDF at scale with its title block, because DWG cannot be
  read and a screenshot loses the revision. `backend/test/clientflow.test.mjs`
  enforces this: a requirement line with no reason or no format fails the
  build.
- **No rejection.** An item that does not exist is answered by saying so with
  a line of explanation — that settles it, and nobody is chased for it again.
  A deliverable is decided against sections the client can name, so a review
  round is answerable line by line rather than as a mood.

Nothing on the internal panel is a stage a person types. Every stage is the
consequence of an act — issuing the portal, answering a line, confirming the
start, clearing a payment, publishing, deciding — so the record of what
happened and the record of where we are cannot disagree.

The automatic invoices are minted through the document studio's own
`createDocument`, in the same `INV-YYYY-NNN` series as one raised by hand, with
the same VAT treatment and the client's own PO reference on the face of it. An
automatic invoice living in its own table would be a second ledger, and a
second ledger is discovered during a dispute.

    node backend/test/clientflow.test.mjs      # 26 checks, no server needed
    node backend/test/clientflow.e2e.mjs       # 55 checks, against a running server
    node backend/test/circle.e2e.mjs           # 20 checks, the WHOLE circle on the real pack

**The circle is one process, not two.** The client answers the requirement
checklist in the portal and attaches their pack; the diagnostic then runs on
**those files**, with no second upload. Asking a client to upload a pack and
then asking ourselves to upload it again is two processes with a person in
between, and the person is where the version drift comes from. The handover
date — the day the last mandatory line was answered — is read from the record,
so the ten working days run from the truth rather than from whoever starts the
run. `backend/test/circle.e2e.mjs` drives all of it on the 18-document
NORTHREACH pack: engagement → portal → 18 documents attached → start confirmed
and the deposit invoicing itself → six pipeline passes on the client's own
files (3 of them routed to vision, not text) → the run minted into a numbered
SSD and published → approval raising the balance → closed, with the two
invoices summing to the agreed fee.

Building that found a bug that would have failed a live test: the upload gate
checked only the MIME type the browser reports, and a `.md` or `.csv` commonly
arrives as `application/octet-stream`. Half the NORTHREACH pack was being
rejected by a filter whose own file input had invited those files. It now
accepts by extension as well, which is also what the extractor dispatches on,
so the gate and the reader agree.

`diagnostic-test/TEST-SCRIPT.md` is the twenty-minute manual version.

## Architecture

```
etablix/
├── backend/            Express server + JSON API
│   ├── server.js       Static serving + route mounting
│   ├── lib/            auth (scrypt + HMAC tokens), JSON store w/ seed,
│   │                   uploads (multer: PDF/Word/Excel/image, 10 MB, ×5),
│   │                   clientflow (the engagement lifecycle: stages, the
│   │                   seven requirement packs, and the payment maths)
│   ├── middleware/     requireAuth / requireRole
│   └── routes/
│       ├── auth.js             POST /api/auth/login · GET /api/auth/me
│       ├── leads.js            Public multipart POST · internal GET/PATCH
│       ├── subcontractors.js   Public multipart POST · internal GET/PATCH
│       ├── files.js            Authenticated document downloads
│       ├── construx.js         Internal: projects, schedule, budget, RFIs,
│       │                       quality (inspections, NCRs), sensors
│       ├── clients.js          Client engagements: portal, checklist,
│       │                       start confirmation, decisions, and the two
│       │                       invoices that raise themselves
│       ├── veryx.js            Internal: risks, AI agents (+run), usage
│       ├── veryx-public.js     VERYX Platform API — /api/public/v1/*
│       │                       (vx_ keys, scopes, metering, ACU, openapi.json)
│       └── stats.js            KPIs
├── shared/             Constants + validation used by BOTH browser & server
│   ├── constants.js    Company, sectors, services, capabilities, statuses
│   └── validation.js   Enquiry / supplier-registration / login validation
└── frontend/
    ├── public/         Public website (vanilla HTML/CSS/JS, SVG scene art,
    │   │               inline SVG framework charts)
    │   └── policies/   Privacy, terms, cookies, supplier code, modern slavery
    └── internal/       Control Desk (login + intake dashboard)
```

**Shared code:** `shared/` is served to the browser at `/shared/*` and
imported by Node — the service, sector and capability lists and all form
validation run identically on both sides, with the server as the source of
truth.

**Uploads:** both public forms accept optional supporting documents
(PDF, Word, Excel, images; max 10 MB each, five per submission). Files are
stored outside the web root and downloadable only with an authenticated
Control Desk session.

**Data:** a seeded JSON-file store (`backend/data/db.json`, gitignored).
Routes only touch the helpers in `backend/lib/store.js`, so swapping in a
real database means replacing one module.

## Product APIs

- **CONSTRUX** (construxvg.com) — "the API is the product": command-and-query
  over project resources, self-documented by `GET /v1/routes` (820 endpoints,
  39 public), RFC 7807 problem+json errors with correlation/trace ids and
  Idempotency-Key support, MFA-protected bearer/refresh auth, 182
  notification events, and tested anti-enumeration behaviour. Documented on
  `/construx#api`.
- **VERYX** (veryxjnn.com) — key-authenticated Platform API: `/ping`,
  `/projects`, `/tasks`, `/risks`, `/agents`, `POST /agents/{type}/run`,
  `/usage`, with six scopes, monthly call metering (HTTP 429), prepaid ACU
  for agent runs (HTTP 402) and `openapi.json`. Documented on `/veryx#api`;
  a working implementation of the same contract runs locally at
  `/api/public/v1`.

## Going live (etablix.com)

> Ready-made deployment kit: `render.yaml` (Render blueprint, one-click),
> `Dockerfile` (any container host), and `deploy/` (VPS route: Caddyfile,
> systemd unit, env template, backup script, step-by-step guide and launch
> checklist). Production mode: set `ETABLIX_ADMIN_EMAIL` +
> `ETABLIX_ADMIN_PASSWORD` and the demo accounts are never seeded and the
> login page shows no demo hint.

The whole product is one Node.js server — public site, Control Desk, APIs
and storage — so deployment is a single service:

1. **Host**: any Node 18+ host works. Simplest routes: a VPS
   (`git clone` → `npm install` → run under systemd/pm2 behind Caddy or
   nginx for HTTPS), or a platform service (Render / Railway / Fly.io)
   pointed at this repo with `npm start` as the start command.
2. **Persistent storage**: the JSON store (`backend/data/db.json`) and
   uploaded documents (`backend/data/uploads/`) live on disk — attach a
   persistent volume/disk mounted over `backend/data/` so submissions
   survive restarts. (On a VPS this is automatic.)
3. **Environment variables**:
   - `ETABLIX_TOKEN_SECRET` — required in production (any long random
     string); keeps employee sessions valid across restarts.
   - `PORT` — if your host assigns one.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_TO`,
     `NOTIFY_FROM` — to email each enquiry/registration to
     contact@etablix.com. Until SMTP is configured, notifications queue in
     `backend/data/outbox.log` and everything is always visible in the
     Control Desk.
4. **Domain**: point `etablix.com` (and `www`) at the host; serve HTTPS
   (Caddy/nginx certbot on a VPS, automatic on platform hosts).
5. **Replace seed data**: change the demo employee accounts in
   `backend/lib/store.js` (or delete `db.json` after editing the seed) and
   remove the demo VERYX API key before launch.

## Contact

ETABLIX — Groupe Nseya House, Kingstanding, Birmingham, B44 8DJ ·
contact@etablix.com · +44 7493 216101.
