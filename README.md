<p align="center">
  <img src="./public/logo.png" alt="Taktill" height="64" />
</p>

# Taktill — Billing & Point of Sale

A web-based Point of Sale and billing system for retail shops and supermarkets
in Uganda & East Africa, built from the [product requirements](./BillPOS_PRD_v1.0.md).

Cashiers process sales, stock is auto-deducted, receipts are generated, and
owners/managers get inventory management and daily/product sales reports — all
with three role tiers, real authentication, and a persistent database.

## Architecture

Taktill is a **React SPA frontend** talking to a **Node.js + Express REST API**
backed by a real database via **Drizzle ORM**.

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript, Tailwind CSS v4, React Router 7 |
| State (POS cart) | Zustand · money math via decimal.js |
| Charts | ApexCharts |
| Backend | Node.js + Express (REST API, `server/`) |
| ORM / DB | Drizzle ORM · **SQLite (better-sqlite3)** locally, **PostgreSQL** in production (swap the driver) |
| Auth | bcrypt password hashing + DB-backed session tokens (`Authorization: Bearer`); cashier PIN sessions in a separate table |

In dev, Vite serves the frontend on `:5173` and proxies `/api/*` to the Express
API on `:8787`. Tables are created on first boot and seeded with sample data.

## Getting started

```bash
npm install
npm run dev      # starts BOTH the Vite frontend (:5173) and the API (:8787)
```

Other scripts:

```bash
npm run dev:web         # frontend only
npm run dev:server      # API only (tsx watch)
npm run build           # type-check + production build of the frontend
npm run typecheck:server# type-check the API
npm run start:server    # run the API once (no watch)
```

The SQLite database (`taktill.db`) is created and seeded automatically on first
run. Reset to the original sample data any time from **Settings → Business →
Reset to sample data** (you'll be signed out and can log back in).

## Demo accounts

| Role | Login | Credentials |
|------|-------|-------------|
| Owner | Email | `owner@taktill.app` / `owner1234` |
| Manager | Email | `manager@taktill.app` / `manager1234` |
| Cashier | PIN | Brenda Nakato — `1234`, Joseph Okello — `5678` |

## Roles & access

Permissions are additive — Cashier < Manager < Owner (PRD §2). Enforced on the
**server** (`requireAuth(minRole)` middleware) and reflected in the UI
([`RequireAuth`](./src/components/auth/RequireAuth.tsx) + role-filtered sidebar):

- **Cashier** — Point of Sale only (PIN login, token in `sessionStorage`).
- **Manager** — POS + Inventory + Transactions + Reports.
- **Owner** — everything, plus Users/Cashiers and Business settings.

## REST API (base `/api`)

| Method | Endpoint | Min role |
|--------|----------|----------|
| POST | `/auth/sign-in/email`, `/auth/sign-out`, GET `/auth/session` | — |
| GET/POST | `/cashier-auth/list`, `/cashier-auth/login`, `/cashier-auth/logout` | — |
| GET | `/products`, `/products/:id`, `/products/categories` | cashier |
| POST/PUT/DELETE | `/products`, `/products/:id`, `/products/:id/adjust-stock` | manager |
| POST | `/sales` (atomic stock deduction) | cashier |
| GET | `/sales`, `/sales/:id` | manager / own |
| GET | `/reports/daily-summary`, `/reports/product-sales`, `/reports/dashboard` | manager |
| GET/PUT/POST | `/business`, `/business/reset` | cashier / owner |
| CRUD | `/users`, `/cashiers` | owner / manager |

All responses use the envelope `{ success, data?, error?, details? }`.

## Project structure

```
src/                       # React + Vite frontend
├── components/            # ui, pos, inventory, auth guard, Logo
├── context/               # AuthContext (real session), ThemeContext
├── data/api.ts            # typed fetch client → REST API
├── hooks/useAsync.ts      # async data-loading helper
├── lib/                   # auth-client (token + fetch), money, utils
├── pages/                 # login, pos, sales, inventory, reports, settings
└── store/cart.ts          # Zustand cart store

server/                    # Node.js + Express API
├── db/                    # Drizzle schema + better-sqlite3 connection + DDL
├── lib/                   # auth (bcrypt + tokens), money, errors
├── middleware/            # requireAuth role gate
├── routes/                # auth, cashierAuth, products, sales, reports, settings
├── services/sales.ts      # completeSale() — atomic transaction
├── seed.ts                # sample data
└── index.ts               # Express app
```
