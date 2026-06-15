<p align="center">
  <img src="./public/logo.png" alt="Taktill" height="64" />
</p>

# Taktill — Billing & Point of Sale

A web-based Point of Sale and billing system for retail shops and supermarkets
in Uganda & East Africa, built from the [product requirements](./BillPOS_PRD_v1.0.md).

Cashiers process sales, stock is auto-deducted, receipts are generated, and
owners/managers get inventory management and daily/product sales reports — all
with three role tiers and no payment-gateway dependency.

## Tech stack

- **React 19 + Vite + TypeScript** (SPA)
- **Tailwind CSS v4** for styling
- **React Router 7** for routing
- **Zustand** for the POS cart store
- **decimal.js** for money math (never JS floats)
- **ApexCharts** for report/dashboard charts

> **Architecture note.** The PRD targets a Next.js + PostgreSQL + Drizzle +
> Better Auth full stack. This implementation is built on the existing Vite
> React template, so it runs **entirely in the browser** with a typed,
> `localStorage`-backed data layer ([`src/data/db.ts`](./src/data/db.ts)) that
> mirrors the PRD's schema, error codes, and business rules (atomic-style stock
> deduction, decimal money, discount caps, receipt numbering, snapshotting,
> soft-deletes, role checks). The data layer is isolated behind typed functions
> so a real REST/Drizzle backend can be dropped in later without touching the UI.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

Sample data (a business, products, cashiers, and a couple of sales) is seeded
into `localStorage` on first load. Reset it any time from **Settings → Business
→ Reset to sample data**.

## Demo accounts

| Role | Login | Credentials |
|------|-------|-------------|
| Owner | Email | `owner@taktill.app` / `owner1234` |
| Manager | Email | `manager@taktill.app` / `manager1234` |
| Cashier | PIN | Brenda Nakato — `1234`, Joseph Okello — `5678` |

## Roles & access

Permissions are additive — Cashier < Manager < Owner (PRD §2):

- **Cashier** — Point of Sale only (PIN login, session in `sessionStorage`).
- **Manager** — POS + Inventory + Transactions + Reports.
- **Owner** — everything, plus Users/Cashiers and Business settings.

Routes are guarded by [`RequireAuth`](./src/components/auth/RequireAuth.tsx) and
the sidebar is filtered by role.

## Screens

| Screen | Route | Access |
|--------|-------|--------|
| Login (Email / Cashier PIN) | `/login` | All |
| Dashboard | `/` | Manager, Owner |
| Point of Sale | `/pos` | All |
| Receipt | `/sales/:id/receipt` | Cashier (own), Manager, Owner |
| Transactions | `/sales` | Manager, Owner |
| Inventory | `/inventory` | Manager, Owner |
| Add / Edit Product | `/inventory/new`, `/inventory/:id/edit` | Manager, Owner |
| Daily Sales Summary | `/reports/daily` | Manager, Owner |
| Product Sales Report | `/reports/products` | Manager, Owner |
| Users & Cashiers | `/settings/users` | Owner |
| Business Settings | `/settings/business` | Owner |

## Project structure

```
src/
├── components/        UI primitives, POS, inventory, auth guard, Logo
├── context/           AuthContext (sessions), ThemeContext
├── data/              seed.ts (sample data), db.ts (data layer + business logic)
├── lib/               money.ts (decimal helpers), utils.ts (cn)
├── pages/             auth, pos, sales, inventory, reports, settings
├── store/             cart.ts (Zustand cart store + totals)
└── types/             domain types mirroring the PRD schema
```
