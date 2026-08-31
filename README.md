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

## Architecture

```
etablix/
├── backend/            Express server + JSON API
│   ├── server.js       Static serving + route mounting
│   ├── lib/            auth (scrypt + HMAC tokens), JSON store w/ seed,
│   │                   uploads (multer: PDF/Word/Excel/image, 10 MB, ×5)
│   ├── middleware/     requireAuth / requireRole
│   └── routes/
│       ├── auth.js             POST /api/auth/login · GET /api/auth/me
│       ├── leads.js            Public multipart POST · internal GET/PATCH
│       ├── subcontractors.js   Public multipart POST · internal GET/PATCH
│       ├── files.js            Authenticated document downloads
│       ├── construx.js         Internal: projects, schedule, budget, RFIs,
│       │                       quality (inspections, NCRs), sensors
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

## Contact

ETABLIX — Groupe Nseya House, Kingstanding, Birmingham, B44 8DJ ·
contact@etabiix.com · +44 7493 216101.
