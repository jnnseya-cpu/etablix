# ETABLIX

Marketing website, employee portal and platform APIs for **ETABLIX** — a
full-cycle construction company that also builds and sells its own
construction technology: **Construx®** (project delivery platform) and
**Veryx®** (the operating system, with AI agents and a metered public API).

## Quick start

```bash
npm install
npm start          # or: npm run dev (auto-restart on change)
```

| Surface | URL |
|---|---|
| Public marketing site | http://localhost:3000/ |
| Employee portal | http://localhost:3000/internal/login.html |
| API health check | http://localhost:3000/api/health |
| Veryx Platform API (public, key-authenticated) | http://localhost:3000/api/public/v1/ping |

### Demo employee accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@etablix.com` | `etablix-admin-2026` |
| Project Manager | `pm@etablix.com` | `etablix-pm-2026` |
| QA Inspector | `qa@etablix.com` | `etablix-qa-2026` |

### Demo Veryx Platform API key

```
vx_test_demo_2f8a1c9e77b34d5f     (test env, all six scopes, 250 ACU)
```

```bash
curl -H "Authorization: Bearer vx_test_demo_2f8a1c9e77b34d5f" \
  http://localhost:3000/api/public/v1/ping
```

> Demo credentials are seed data for local development only. Set
> `ETABLIX_TOKEN_SECRET` in production and replace the seed users/keys.

## Architecture

```
etablix/
├── backend/            Express server + JSON API
│   ├── server.js       Static serving + route mounting
│   ├── lib/            auth (scrypt + HMAC tokens), JSON-file store w/ seed
│   ├── middleware/     requireAuth / requireRole
│   └── routes/
│       ├── auth.js             POST /api/auth/login · GET /api/auth/me
│       ├── leads.js            Public POST, internal GET/PATCH
│       ├── subcontractors.js   Public POST, internal GET/PATCH
│       ├── construx.js         Internal: projects, schedule, budget, RFIs,
│       │                       quality (inspections, NCRs), sensors
│       ├── veryx.js            Internal: risks, AI agents (+run), usage
│       ├── veryx-public.js     VERYX Platform API — /api/public/v1/*
│       └── stats.js            Dashboard KPIs
├── shared/             Constants + validation used by BOTH browser & server
│   ├── constants.js    Trades, sectors, roles, statuses
│   └── validation.js   Lead / subcontractor / login validation
└── frontend/
    ├── public/         Marketing site (7 pages, vanilla HTML/CSS/JS)
    │   index · services · construx · veryx · customers ·
    │   subcontractors · contact
    └── internal/       Employee portal (login + tabbed dashboard)
```

**Shared code:** `shared/` is served to the browser at `/shared/*` and
imported by Node — the subcontractor trade list and all form validation run
identically on both sides, with the server as the source of truth.

**Data:** a seeded JSON-file store (`backend/data/db.json`, gitignored).
Routes only touch the `collection/insert/update` helpers in
`backend/lib/store.js`, so swapping in Postgres later means replacing one
module.

**Auth:** employee sessions use scrypt-hashed passwords and HMAC-signed
expiring tokens (12 h) — standard library only. The Veryx Platform API uses
environment-scoped `vx_` keys with per-scope authorization, monthly call
metering (HTTP 429 over quota) and prepaid ACU for agent runs (HTTP 402
when empty).

## The two products

- **Construx®** — command-and-query project delivery: scheduling, cost &
  commitment control, field ops, RFIs/submittals, procurement, and the
  quality module (ITPs with counterparty approval, inspections that raise
  NCRs on failure, snags closed with photo evidence, CDM documents).
  Marketing + API story: `frontend/public/construx.html`.
- **Veryx®** — the OS: projects/portfolios, schedule tasks, risk register
  and AI agents (Schedule Health Scan, Risk Triage, Daily Site Digest, Bid
  Leveler), exposed over the key-authenticated Platform API. Marketing +
  API docs: `frontend/public/veryx.html`; local implementation of the
  contract: `backend/routes/veryx-public.js` (incl. `/openapi.json`).

## Website → workspace flow

Public **contact** and **subcontractor prequalification** forms POST to the
API; submissions appear instantly in the employee dashboard (Leads and
Subcontractor Applications tabs), where staff advance them through their
pipelines inline. The Construx tab shows the delivery portfolio, critical
path, RFIs and quality records; the Veryx tab shows the risk register, lets
staff run AI agents (drawing down ACU), and reports Platform API usage.
