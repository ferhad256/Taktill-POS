# BillPOS — Product Requirements Document

**Product:** BillPOS — Billing & Point of Sale System
**Version:** 1.0.0
**Date:** June 2026
**Status:** Draft — LLM Reference
**Author:** Embiro Technologies

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Users, Roles & Permissions](#2-users-roles--permissions)
3. [Functional Requirements](#3-functional-requirements)
4. [Database Schema](#4-database-schema)
5. [API Specification](#5-api-specification)
6. [UI / UX Requirements — React + Tailwind CSS](#6-ui--ux-requirements--react--tailwind-css)
7. [Technical Architecture](#7-technical-architecture)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Build Phases & Milestones](#9-build-phases--milestones)
10. [Open Questions & Decisions](#10-open-questions--decisions)
11. [Instructions for LLM / AI Builder](#11-instructions-for-llm--ai-builder)

---

## 1. Executive Summary

BillPOS is a web-based Point of Sale and billing system purpose-built for retail shops and supermarkets in Uganda and East Africa. The MVP enables cashiers to process sales, auto-deduct inventory, generate receipts, and produce daily sales reports — all without requiring an internet payment gateway (payments are recorded as offline).

### 1.1 Problem Statement

Most small-to-medium retail shops in Uganda operate on either paper-based sales recording or generic spreadsheets. These create:

- No real-time inventory visibility — owners discover stockouts after the fact
- No audit trail — cashier theft and errors go undetected
- No daily summaries — owners cannot make data-driven purchasing decisions
- No receipts — customers have no proof of purchase

### 1.2 Solution

BillPOS provides a lightweight, responsive web application accessible on both desktop and mobile browsers that handles the full sales-to-report lifecycle for retail businesses with multiple cashiers.

### 1.3 MVP Scope

| IN SCOPE (MVP) | OUT OF SCOPE (Post-MVP) |
|---|---|
| POS cart & sale processing | Mobile money / card payments |
| Inventory auto-deduct on sale | Multi-branch / franchise support |
| 3-role access (Owner/Manager/Cashier) | Barcode scanner hardware integration |
| Daily sales summary report | Customer loyalty / CRM |
| Product-level sales report | Supplier purchase orders |
| Receipt per transaction (PDF/print) | Offline mode (no internet) |
| Manual stock adjustment | E-commerce / online storefront |
| Mobile-responsive web UI | Native mobile app (iOS/Android) |

---

## 2. Users, Roles & Permissions

Each business account has exactly three role tiers. Permissions are strictly additive — Cashier < Manager < Owner.

| Role | Description | Login Method | Count per Business |
|---|---|---|---|
| Owner | Full system access. Manages users, all reports, settings. | Email + Password (Better Auth) | 1 |
| Manager | POS + inventory + reports. Cannot manage users. | Email + Password (Better Auth) | 1–3 |
| Cashier | POS only. Own shift receipts. No reports or inventory. | 4-digit PIN (custom session) | Unlimited |

### 2.1 Permission Matrix

| Feature / Action | Owner | Manager | Cashier |
|---|---|---|---|
| Process a sale (POS) | ✅ | ✅ | ✅ |
| View own shift receipts | ✅ | ✅ | ✅ |
| View all transactions | ✅ | ✅ | ❌ |
| Add / edit products | ✅ | ✅ | ❌ |
| Adjust stock manually | ✅ | ✅ | ❌ |
| View inventory levels | ✅ | ✅ | ❌ |
| View daily sales summary | ✅ | ✅ | ❌ |
| View product-level report | ✅ | ✅ | ❌ |
| Export / print PDF reports | ✅ | ✅ | ❌ |
| Add / remove users | ✅ | ❌ | ❌ |
| Change business settings | ✅ | ❌ | ❌ |
| Apply discounts above 20% | ✅ | ✅ | ❌ |

> ⚠️ **IMPORTANT FOR LLM:** Always check `req.user.role` before any route handler. Cashiers must NEVER reach inventory or report endpoints. Implement role middleware at the router level, not the controller level.

---

## 3. Functional Requirements

### 3.1 Authentication & Session Management

#### 3.1.1 Owner & Manager Login (Better Auth)

- Login: email + password via Better Auth `signIn.email()`
- Sessions managed by Better Auth — stored in `sessions` table, secured via httpOnly cookie
- Session expiry: 8 hours (`expiresIn: 60 * 60 * 8`)
- Session auto-refreshes every 1 hour (`updateAge: 60 * 60`)
- Failed login: return generic `INVALID_CREDENTIALS` error — do not reveal whether email exists
- Password reset: Better Auth `forgetPassword()` sends reset link with time-limited token
- Role and businessId are stored as `additionalFields` on the user record and returned in every session via `auth.api.getSession()`

#### 3.1.2 Cashier PIN Login (Custom — outside Better Auth)

- Cashier selects their name from a list on the business login screen
- Enters 4-digit PIN
- Server: `bcrypt.compare(pin, cashier.pinHash)` — if match, generate `crypto.randomBytes(32)` raw token
- Store SHA-256 hash of token in `cashier_sessions` table with `expiresAt = NOW + 12h`
- Return raw token to client — store in `sessionStorage` (auto-clears on tab close, never `localStorage`)
- Client sends token as `Authorization: Bearer <token>` header on each cashier API request
- Server middleware: SHA-256 hash incoming token, look up in `cashier_sessions`, verify `expiresAt > NOW()`
- Logout: `DELETE` from `cashier_sessions` by token hash

> ⚠️ **CRITICAL:** Cashier PIN sessions MUST NOT use Better Auth. Use a short-lived session token stored server-side in `cashier_sessions`. A cashier token must never reach a `withAuth()` protected route.

---

### 3.2 Product Catalogue

#### 3.2.1 Product Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| name | string | Yes | Max 120 chars. Displayed in POS search. |
| sku | string | No | Auto-generated if not provided. Unique per business. |
| barcode | string | No | EAN-13 or custom. Reserved for future scanner support. |
| category | string | No | Free text or dropdown (user-defined). Used in reports. |
| unit_price | decimal(12,2) | Yes | Selling price in UGX. Min 0. |
| cost_price | decimal(12,2) | No | For profit margin reports (Phase 2). Stored but not shown in MVP. |
| stock_quantity | integer | Yes | Current stock. Decremented on each sale. |
| low_stock_threshold | integer | No | Default 5. Alert when stock ≤ this value. |
| is_active | boolean | Yes | Soft delete. Inactive products hidden from POS. |
| created_at | timestamp | Auto | UTC. Set on insert. |
| updated_at | timestamp | Auto | UTC. Updated on any change. |

---

### 3.3 POS — Sale Flow

The POS is the primary interface for cashiers. It must be fast, touch-friendly, and work on a 375px-wide phone screen.

#### 3.3.1 Sale Flow Steps

| Step | Action | System Behaviour |
|---|---|---|
| 1 | Cashier opens POS screen | Empty cart shown. Search field auto-focused. |
| 2 | Search for product | Real-time search on name/SKU. Returns matching products with price and stock qty. |
| 3 | Add product to cart | Product appears in cart. Qty defaults to 1. Row shows: name, qty, unit price, line total. |
| 4 | Adjust quantity | Tap +/- or type qty. If qty > stock_quantity, show inline error: "Only X in stock". |
| 5 | Apply discount (optional) | Cashier can enter % or flat UGX discount per item or on cart total. See §3.3.2. |
| 6 | Review cart total | Show: subtotal, discount, grand total (UGX). No tax in MVP. |
| 7 | Complete sale | Cashier clicks "Complete Sale". System validates stock. If OK, commits transaction atomically. |
| 8 | Receipt generated | Receipt shown on screen. Options: Print, Download PDF, Share. New sale resets cart. |

#### 3.3.2 Discount Rules

- Discount types: Percentage (`%`) or Flat amount (UGX)
- Discount scope: per line item OR on cart total — not both simultaneously
- Max discount for Cashier: 20%. Above 20% requires Manager/Owner override
- Discount is stored on the `sale_items` record for audit purposes
- Negative discount (markup) is not allowed — validate server-side

#### 3.3.3 Stock Validation on Sale Completion

- Before committing: query current `stock_quantity` for each item in cart
- If any item has insufficient stock: block sale, return `422 INSUFFICIENT_STOCK` with detail per item
- Stock deduction happens inside a database transaction — all items deduct or none do
- Race condition protection: use `.for('update')` (Drizzle) on product rows during deduction

> 🚨 **CRITICAL FOR LLM:** The stock deduction MUST be atomic. Use `db.transaction()` and `.for('update')` to prevent overselling when two cashiers sell the last unit simultaneously.

---

### 3.4 Inventory Management

#### 3.4.1 Stock Adjustment

- Owner/Manager can manually adjust stock: add stock (restock), remove stock (write-off/damage)
- Each adjustment requires a reason: `restock`, `damaged`, `expired`, `correction`, `other`
- All adjustments logged in `stock_adjustments` table with: who, when, quantity delta, reason
- Cannot adjust stock on inactive products

#### 3.4.2 Low Stock Alerts

- When `stock_quantity <= low_stock_threshold`: product flagged with alert indicator in inventory list
- Dashboard widget shows count of low-stock products
- MVP: visual indicator only — no email/SMS alerts

---

### 3.5 Reports

#### 3.5.1 Daily Sales Summary

- Scope: all sales for a selected date (defaults to today)
- Fields: total sales count, total revenue (UGX), total discount given, average sale value
- Breakdown by cashier: sales count and revenue per cashier for that day
- Breakdown by hour: sales volume chart

#### 3.5.2 Product-Level Sales Report

- Scope: date range (default: last 30 days)
- Fields: product name, SKU, units sold, revenue generated, discount given
- Sortable by: units sold (desc), revenue (desc), product name (asc)
- Filterable by: category, date range

#### 3.5.3 Receipt

- Generated per transaction automatically on sale completion
- Fields: business name + logo, business address, cashier name, date & time, transaction ID, line items (name, qty, unit price, discount, line total), grand total, "Thank you" footer
- Formats: screen display, browser print (print CSS), PDF download (jsPDF)
- Receipt stored in DB — retrievable by transaction ID at any future time

---

## 4. Database Schema

**Database:** PostgreSQL 15+
**ORM:** Drizzle ORM
**Conventions:** All IDs are UUIDs (`defaultRandom()`). All timestamps are UTC with timezone. Use `camelCase` in Drizzle schema, `snake_case` in DB column names.

### 4.1 Entity Relationship Overview

| Table | Purpose |
|---|---|
| `businesses` | One record per registered business account |
| `users` | Owners and Managers — managed by Better Auth |
| `sessions` | Better Auth session records |
| `accounts` | Better Auth OAuth/credential accounts |
| `verifications` | Better Auth email verification + password reset tokens |
| `cashiers` | Cashier profiles (PIN login). Belongs to one business. |
| `cashier_sessions` | Active PIN sessions for cashiers. Separate from Better Auth. |
| `products` | Product catalogue. Belongs to one business. |
| `sales` | One record per completed transaction. Header/master record. |
| `sale_items` | Line items within a sale. One row per product per sale. |
| `stock_adjustments` | Audit log for all manual inventory changes. |

---

### 4.2 Full Drizzle Schema (src/db/schema.ts)

```typescript
import {
  pgTable, pgEnum, uuid, varchar, text, boolean,
  integer, numeric, timestamp,
} from 'drizzle-orm/pg-core';

// ── Enums ─────────────────────────────────────────────────
export const roleEnum          = pgEnum('role', ['owner', 'manager']);
export const paymentMethodEnum = pgEnum('payment_method',
  ['cash', 'mobile_money', 'card', 'other']);
export const adjustReasonEnum  = pgEnum('adjustment_reason',
  ['restock', 'damaged', 'expired', 'correction', 'other']);
export const discountTypeEnum  = pgEnum('discount_type', ['percent', 'flat']);

// ── Better Auth tables (do NOT rename columns) ─────────────
export const users = pgTable('users', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  createdAt:     timestamp('created_at').notNull(),
  updatedAt:     timestamp('updated_at').notNull(),
  // BillPOS custom fields (additionalFields in Better Auth config)
  role:          roleEnum('role').notNull().default('manager'),
  businessId:    uuid('business_id').references(() => businesses.id),
});

export const sessions = pgTable('sessions', {
  id:        text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token:     text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId:    text('user_id').notNull()
               .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id:                    text('id').primaryKey(),
  accountId:             text('account_id').notNull(),
  providerId:            text('provider_id').notNull(),
  userId:                text('user_id').notNull()
                           .references(() => users.id, { onDelete: 'cascade' }),
  accessToken:           text('access_token'),
  refreshToken:          text('refresh_token'),
  idToken:               text('id_token'),
  accessTokenExpiresAt:  timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope:                 text('scope'),
  password:              text('password'),
  createdAt:             timestamp('created_at').notNull(),
  updatedAt:             timestamp('updated_at').notNull(),
});

export const verifications = pgTable('verifications', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at'),
  updatedAt:  timestamp('updated_at'),
});

// ── BillPOS app tables ─────────────────────────────────────
export const businesses = pgTable('businesses', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      varchar('name', { length: 200 }).notNull(),
  address:   text('address'),
  phone:     varchar('phone', { length: 20 }),
  logoUrl:   text('logo_url'),
  currency:  varchar('currency', { length: 5 }).notNull().default('UGX'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cashiers = pgTable('cashiers', {
  id:         uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull()
                .references(() => businesses.id, { onDelete: 'cascade' }),
  name:       varchar('name', { length: 120 }).notNull(),
  pinHash:    text('pin_hash').notNull(),   // bcrypt of 4-digit PIN
  isActive:   boolean('is_active').notNull().default(true),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cashierSessions = pgTable('cashier_sessions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  cashierId: uuid('cashier_id').notNull()
               .references(() => cashiers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),  // SHA-256 of the raw token
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id:                uuid('id').primaryKey().defaultRandom(),
  businessId:        uuid('business_id').notNull()
                       .references(() => businesses.id, { onDelete: 'cascade' }),
  name:              varchar('name', { length: 120 }).notNull(),
  sku:               varchar('sku',  { length: 60  }).notNull(),
  barcode:           varchar('barcode', { length: 60 }),
  category:          varchar('category', { length: 80 }),
  unitPrice:         numeric('unit_price',  { precision: 12, scale: 2 }).notNull(),
  costPrice:         numeric('cost_price',  { precision: 12, scale: 2 }),
  stockQuantity:     integer('stock_quantity').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  isActive:          boolean('is_active').notNull().default(true),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sales = pgTable('sales', {
  id:            uuid('id').primaryKey().defaultRandom(),
  businessId:    uuid('business_id').notNull().references(() => businesses.id),
  cashierId:     uuid('cashier_id').notNull().references(() => cashiers.id),
  receiptNumber: varchar('receipt_number', { length: 30 }).notNull(),
  subtotal:      numeric('subtotal',       { precision: 12, scale: 2 }).notNull(),
  totalDiscount: numeric('total_discount', { precision: 12, scale: 2 }).notNull().default('0'),
  grandTotal:    numeric('grand_total',    { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  notes:         text('notes'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const saleItems = pgTable('sale_items', {
  id:             uuid('id').primaryKey().defaultRandom(),
  saleId:         uuid('sale_id').notNull()
                    .references(() => sales.id, { onDelete: 'cascade' }),
  productId:      uuid('product_id').notNull().references(() => products.id),
  productName:    varchar('product_name', { length: 120 }).notNull(), // snapshot at time of sale
  productSku:     varchar('product_sku',  { length: 60  }).notNull(), // snapshot at time of sale
  quantity:       integer('quantity').notNull(),
  unitPrice:      numeric('unit_price',     { precision: 12, scale: 2 }).notNull(), // snapshot
  discountType:   discountTypeEnum('discount_type'),
  discountValue:  numeric('discount_value', { precision: 12, scale: 2 }),
  discountAmount: numeric('discount_amount',{ precision: 12, scale: 2 }).notNull().default('0'),
  lineTotal:      numeric('line_total',     { precision: 12, scale: 2 }).notNull(),
});

export const stockAdjustments = pgTable('stock_adjustments', {
  id:                uuid('id').primaryKey().defaultRandom(),
  productId:         uuid('product_id').notNull().references(() => products.id),
  businessId:        uuid('business_id').notNull().references(() => businesses.id),
  adjustedByUserId:  text('adjusted_by_user_id').notNull(), // references users.id (Better Auth)
  quantityDelta:     integer('quantity_delta').notNull(),    // positive = added, negative = removed
  quantityBefore:    integer('quantity_before').notNull(),   // snapshot
  quantityAfter:     integer('quantity_after').notNull(),    // snapshot
  reason:            adjustReasonEnum('reason').notNull(),
  notes:             text('notes'),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

> 📝 **DENORMALIZATION NOTE:** `sale_items` stores `productName`, `productSku`, and `unitPrice` as snapshots. This is intentional — historical receipts remain accurate even if the product name or price changes later. Always write these at insert time; never derive them from the `products` table at read time.

### 4.3 DB Constraints to Add via Migration

```sql
-- stock_quantity can never go below zero
ALTER TABLE products ADD CONSTRAINT chk_stock_non_negative
  CHECK (stock_quantity >= 0);

-- monetary columns must be non-negative
ALTER TABLE products     ADD CONSTRAINT chk_unit_price_pos CHECK (unit_price >= 0);
ALTER TABLE sale_items   ADD CONSTRAINT chk_line_total_pos CHECK (line_total >= 0);
ALTER TABLE sales        ADD CONSTRAINT chk_grand_total_pos CHECK (grand_total >= 0);

-- receipt_number unique per business
CREATE UNIQUE INDEX idx_sales_receipt ON sales (business_id, receipt_number);

-- one SKU per business
CREATE UNIQUE INDEX idx_products_sku ON products (business_id, sku)
  WHERE is_active = true;
```

---

## 5. API Specification

**Base URL:** `/api/v1`
**Response envelope:** `{ success: boolean, data?: any, error?: string, details?: any }`
**Auth:** Better Auth session cookie (Owner/Manager) or `Authorization: Bearer <token>` header (Cashier PIN)

### 5.1 Auth Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/sign-in/email` | None | Better Auth — Owner/Manager email+password login |
| `POST` | `/api/auth/sign-out` | Session | Better Auth — invalidates session |
| `POST` | `/api/auth/forget-password` | None | Better Auth — sends reset link to email |
| `POST` | `/api/auth/reset-password` | Reset token | Better Auth — sets new password |
| `GET`  | `/api/auth/get-session` | Session | Better Auth — returns current session + user |
| `POST` | `/api/cashier-auth/login` | None | Custom — cashier PIN login, returns raw token |
| `POST` | `/api/cashier-auth/logout` | Cashier token | Custom — deletes cashier session |

### 5.2 Products Endpoints

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/products` | Cashier | List active products. Query: `?search=&category=` |
| `GET` | `/api/v1/products/:id` | Cashier | Single product detail |
| `POST` | `/api/v1/products` | Manager | Create new product |
| `PUT` | `/api/v1/products/:id` | Manager | Update product fields |
| `DELETE` | `/api/v1/products/:id` | Manager | Soft delete (`is_active = false`) |
| `POST` | `/api/v1/products/:id/adjust-stock` | Manager | Manual stock adjustment with reason |

### 5.3 Sales Endpoints

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/sales` | Cashier | Create sale. Atomically deducts stock. |
| `GET` | `/api/v1/sales` | Manager | List sales. Query: `?date=&cashier_id=&page=&limit=` |
| `GET` | `/api/v1/sales/:id` | Cashier* | Get sale + items. *Cashier can only fetch own sales. |
| `GET` | `/api/v1/sales/:id/receipt` | Cashier* | Receipt data for display/print. |

### 5.4 Reports Endpoints

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/reports/daily-summary` | Manager | Params: `?date=YYYY-MM-DD` |
| `GET` | `/api/v1/reports/product-sales` | Manager | Params: `?from=&to=&category=&sort=` |
| `GET` | `/api/v1/reports/daily-summary/export` | Manager | Returns PDF. `Content-Type: application/pdf` |

### 5.5 POST /api/v1/sales — Full Contract

**Request body:**
```json
{
  "cashierId": "uuid",
  "paymentMethod": "cash | mobile_money | card | other",
  "notes": "optional string",
  "cartDiscount": { "type": "percent | flat", "value": 10 },
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "discount": { "type": "percent", "value": 5 }
    }
  ]
}
```

**Success (201):**
```json
{
  "success": true,
  "data": {
    "saleId": "uuid",
    "receiptNumber": "20260615-0001",
    "grandTotal": "45000.00",
    "items": [
      { "productId": "uuid", "productName": "Milk 1L", "quantity": 2, "unitPrice": "2500.00", "lineTotal": "4750.00" }
    ],
    "createdAt": "2026-06-15T09:30:00Z"
  }
}
```

**Error — Insufficient stock (422):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_STOCK",
  "details": [
    { "productId": "uuid", "productName": "Milk 1L", "requested": 5, "available": 2 }
  ]
}
```

### 5.6 Error Codes Reference

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password or PIN |
| `UNAUTHORIZED` | 401 | No valid token provided |
| `FORBIDDEN` | 403 | Token valid but role insufficient |
| `INSUFFICIENT_STOCK` | 422 | One or more cart items exceed available stock |
| `PRODUCT_NOT_FOUND` | 404 | Product ID not found or not in this business |
| `PRODUCT_INACTIVE` | 422 | Attempted to sell a soft-deleted product |
| `VALIDATION_ERROR` | 400 | Request body failed Zod schema validation |
| `DUPLICATE_SKU` | 409 | SKU already exists in this business |
| `DISCOUNT_LIMIT_EXCEEDED` | 403 | Cashier attempted discount > 20% |

---

## 6. UI / UX Requirements — React + Tailwind CSS

### 6.1 Frontend Stack

The entire frontend is built with **React** (via Next.js 14 App Router) and styled exclusively with **Tailwind CSS** utility classes.

- No external UI component libraries (MUI, Ant Design, Chakra). All components are hand-built.
- **shadcn/ui** primitives are permitted for: `Dialog`, `DropdownMenu`, `Tooltip`, `Select`, `Popover`, `Switch`, `Tabs`. Run: `npx shadcn-ui@latest add dialog`.
- `'use client'` directive only on components that use hooks or event handlers. Server Components are the default.
- **Never build Tailwind class names dynamically via string interpolation** — the JIT scanner cannot detect them. Use object maps with complete static class strings (see `Button.tsx` example).

### 6.2 Tailwind Setup

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**`tailwind.config.ts`:**
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0C6B6E',  // primary teal
          dark:    '#064548',
          light:   '#E1F5EE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**`src/app/globals.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body { @apply bg-gray-50 text-gray-900 antialiased; }
  h1   { @apply text-2xl font-semibold tracking-tight; }
  h2   { @apply text-xl font-semibold; }
  h3   { @apply text-base font-medium; }
}

@layer components {
  .btn-primary   { @apply bg-brand text-white px-4 py-2 rounded-lg font-medium
                          hover:bg-brand-dark active:scale-95 transition-all
                          disabled:opacity-50 disabled:cursor-not-allowed; }
  .btn-secondary { @apply border border-gray-300 bg-white text-gray-700 px-4 py-2
                          rounded-lg font-medium hover:bg-gray-50 transition-colors; }
  .btn-danger    { @apply bg-red-600 text-white px-4 py-2 rounded-lg font-medium
                          hover:bg-red-700 transition-colors; }
  .input         { @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-brand/30
                          focus:border-brand transition-colors; }
  .card          { @apply bg-white rounded-xl border border-gray-200 shadow-sm p-4; }
}
```

### 6.3 cn() Utility (Required)

```bash
npm install clsx tailwind-merge
```

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// Usage: cn('px-4 py-2', isActive && 'bg-brand', className)
// twMerge resolves conflicts: cn('px-4', 'px-6') => 'px-6'
```

### 6.4 Shared UI Components (src/components/ui/)

| File | What it renders |
|---|---|
| `Button.tsx` | Primary / secondary / danger / ghost variants. Size prop (sm, md, lg). Spinner when `loading`. |
| `Input.tsx` | Text input with label, error message slot, optional left/right icon. |
| `Badge.tsx` | Coloured pill. Variants: `success`, `warning`, `danger`, `info`, `neutral`. |
| `Modal.tsx` | Accessible dialog on Radix UI. Accepts title, children, footer slots. |
| `Spinner.tsx` | Animated SVG ring. Sizes: sm (16px), md (24px), lg (40px). |
| `Table.tsx` | Responsive table wrapper with striped rows and sticky header. |
| `EmptyState.tsx` | Centered icon + heading + optional CTA for zero-data screens. |
| `Toast.tsx` | Ephemeral notification via `react-hot-toast`. success / error / info. |

**Button.tsx example:**
```tsx
// src/components/ui/Button.tsx
'use client';
import { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?:    'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary:   'bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  danger:    'bg-red-600 text-white hover:bg-red-700',
  ghost:     'text-gray-600 hover:bg-gray-100',
};
const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2   text-sm',
  lg: 'px-6 py-3   text-base',
};

export function Button({
  variant = 'primary', size = 'md', loading, disabled, children, className, ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className,
      )}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
```

### 6.5 POS Screen — React Component Tree

```
POSPage (Server Component)         — fetches initial products via RSC
└── POSScreen (Client Component)   — 'use client', holds layout
    ├── ProductSearch              — debounced search, product grid
    │   ├── SearchInput            — auto-focused <input>
    │   ├── CategoryTabs           — horizontal scroll filter tabs
    │   └── ProductGrid            — maps products to ProductCard
    │       └── ProductCard        — onClick → dispatch addItem()
    └── CartPanel                  — reads useCartStore()
        ├── CartItemList           — maps items to CartItem rows
        │   └── CartItem           — qty stepper, discount, remove
        ├── CartTotals             — subtotal / discount / grand total
        ├── PaymentMethodSelector  — radio group (cash, MM, card)
        └── CompleteSaleButton     — calls POST /api/v1/sales
```

**POS layout (Tailwind):**
```tsx
// src/components/pos/POSScreen.tsx
'use client';
export function POSScreen({ initialProducts }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left: product search — takes remaining space */}
      <div className="flex-1 overflow-y-auto border-r border-gray-200 p-4">
        <ProductSearch initialProducts={initialProducts} />
      </div>
      {/* Right: cart — fixed 384px on md+, full-width bottom sheet on mobile */}
      <div className="hidden md:flex md:w-96 flex-col bg-white shadow-lg">
        <CartPanel />
      </div>
      {/* Mobile cart — bottom sheet */}
      <MobileCartSheet />
    </div>
  );
}
```

### 6.6 Zustand Cart Store

```typescript
// src/store/cart.ts
'use client';
import { create } from 'zustand';
import Decimal from 'decimal.js';

interface CartItem {
  productId: string;
  name:      string;
  unitPrice: string;       // string to match Drizzle NUMERIC return type
  quantity:  number;
  discount?: { type: 'percent' | 'flat'; value: number };
}

interface CartStore {
  items:         CartItem[];
  paymentMethod: 'cash' | 'mobile_money' | 'card' | 'other';
  addItem:       (product: Omit<CartItem, 'quantity'>) => void;
  removeItem:    (productId: string) => void;
  updateQty:     (productId: string, qty: number) => void;
  setDiscount:   (productId: string, discount: CartItem['discount']) => void;
  setPayment:    (method: CartStore['paymentMethod']) => void;
  clearCart:     () => void;
  grandTotal:    () => string;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  paymentMethod: 'cash',

  addItem: (product) => set((state) => {
    const existing = state.items.find(i => i.productId === product.productId);
    if (existing) {
      return { items: state.items.map(i =>
        i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i
      )};
    }
    return { items: [...state.items, { ...product, quantity: 1 }] };
  }),

  removeItem:  (id) => set(s => ({ items: s.items.filter(i => i.productId !== id) })),
  updateQty:   (id, qty) => set(s => ({
    items: s.items.map(i => i.productId === id ? { ...i, quantity: qty } : i),
  })),
  setDiscount: (id, discount) => set(s => ({
    items: s.items.map(i => i.productId === id ? { ...i, discount } : i),
  })),
  setPayment:  (method) => set({ paymentMethod: method }),
  clearCart:   () => set({ items: [] }),

  grandTotal: () => get().items.reduce((acc, item) => {
    const sub  = new Decimal(item.unitPrice).times(item.quantity);
    const disc = item.discount
      ? item.discount.type === 'percent'
        ? sub.times(item.discount.value).div(100)
        : new Decimal(item.discount.value)
      : new Decimal(0);
    return acc.plus(sub.minus(disc));
  }, new Decimal(0)).toFixed(2),
}));
```

### 6.7 Responsive Breakpoints

| Breakpoint | Min Width | Layout |
|---|---|---|
| (default) | 0px | Single column. Cart is bottom sheet. Nav is a drawer. |
| `md:` | 768px | Two-column POS. Side nav visible. |
| `lg:` | 1024px | Full dashboard. Reports table expands. |
| `xl:` | 1280px | Wider cart panel. Product grid 4 columns. |

- All layout changes use Tailwind responsive prefixes: `flex-col md:flex-row`, `hidden md:block`, `w-full md:w-96`
- Minimum touch target: `min-h-11 min-w-11` on all interactive elements (≥ 44px)
- Receipt: `w-full md:max-w-md md:mx-auto`

### 6.8 Screen Inventory

| Screen | Route | Accessible By |
|---|---|---|
| Login / Cashier Select | `/login` | All |
| POS | `/pos` | Cashier, Manager, Owner |
| Receipt View | `/sales/[id]/receipt` | Cashier (own), Manager, Owner |
| Inventory List | `/inventory` | Manager, Owner |
| Add / Edit Product | `/inventory/new` · `/inventory/[id]/edit` | Manager, Owner |
| Daily Summary Report | `/reports/daily` | Manager, Owner |
| Product Sales Report | `/reports/products` | Manager, Owner |
| User Management | `/settings/users` | Owner only |
| Business Settings | `/settings/business` | Owner only |
| Dashboard | `/dashboard` | Manager, Owner |

---

## 7. Technical Architecture

### 7.1 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + Next.js 14 (App Router) | SSR for reports/receipts. SPA POS. Single codebase for web + PWA. |
| Styling | **Tailwind CSS** | Utility-first, fast, responsive by default. No custom CSS files. |
| Components | **React** (TSX, Server + Client) | `'use client'` only where needed. Server Components default. |
| State (POS) | Zustand | Lightweight cart state. No Redux. |
| Backend | Next.js API Routes | Collocated with frontend. Better Auth integrates natively. |
| Database | PostgreSQL 15+ | ACID for atomic stock deductions. NUMERIC precision for money. |
| ORM | **Drizzle ORM + drizzle-kit** | SQL-first, type-safe, zero magic. Schema is TypeScript. |
| Auth (Owner/Manager) | **Better Auth** | Handles sessions, email+password, password reset, Drizzle adapter. |
| Auth (Cashier) | Custom PIN sessions (DB-backed) | Separate `cashier_sessions` table, custom middleware. |
| PDF | jsPDF (client) or Puppeteer (server) | Client-side receipts; server-side formatted reports. |
| Hosting | Railway / Render / VPS | Integrated PostgreSQL, suitable for Uganda bandwidth. |

### 7.2 Drizzle ORM Setup

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

**`drizzle.config.ts`:**
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema:  './src/db/schema.ts',
  out:     './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

**`src/db/index.ts`:**
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, {
  max:             10,
  idle_timeout:    20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
```

**Migration commands:**
```bash
npx drizzle-kit generate   # generate SQL migration from schema changes
npx drizzle-kit migrate    # apply pending migrations to DB
npx drizzle-kit push       # push schema directly (dev only, no migration file)
npx drizzle-kit studio     # open visual DB browser
```

### 7.3 Atomic Sale Transaction (Drizzle)

```typescript
// src/services/SaleService.ts
import { db } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import { products, sales, saleItems } from '@/db/schema';
import Decimal from 'decimal.js';

export async function completeSale(payload: SalePayload) {
  return await db.transaction(async (tx) => {

    const stockErrors: StockError[] = [];
    const snapshots: ProductSnapshot[] = [];

    // 1. Lock product rows — SELECT ... FOR UPDATE
    for (const item of payload.items) {
      const [product] = await tx
        .select({ id: products.id, name: products.name, sku: products.sku,
                  price: products.unitPrice, stock: products.stockQuantity })
        .from(products)
        .where(and(
          eq(products.id, item.productId),
          eq(products.businessId, payload.businessId),
          eq(products.isActive, true),
        ))
        .for('update');

      if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404);
      if (product.stock < item.quantity) {
        stockErrors.push({ productId: product.id, productName: product.name,
                           requested: item.quantity, available: product.stock });
      } else {
        snapshots.push({ ...product, qty: item.quantity, itemDiscount: item.discount });
      }
    }

    // 2. If any item short — rollback
    if (stockErrors.length > 0) throw new AppError('INSUFFICIENT_STOCK', 422, stockErrors);

    // 3. Calculate totals with Decimal.js (never native floats for money)
    let subtotal = new Decimal(0);
    const lines = snapshots.map((p) => {
      const lineSub  = new Decimal(p.price).times(p.qty);
      const discAmt  = calcDiscount(lineSub, p.itemDiscount);
      const lineTotal = lineSub.minus(discAmt);
      subtotal = subtotal.plus(lineTotal);
      return { ...p, discAmt, lineTotal };
    });
    const grandTotal = subtotal.minus(calcDiscount(subtotal, payload.cartDiscount));

    // 4. Insert sale header
    const [sale] = await tx.insert(sales).values({
      businessId:    payload.businessId,
      cashierId:     payload.cashierId,
      receiptNumber: await generateReceiptNumber(tx, payload.businessId),
      subtotal:      subtotal.toFixed(2),
      totalDiscount: subtotal.minus(grandTotal).toFixed(2),
      grandTotal:    grandTotal.toFixed(2),
      paymentMethod: payload.paymentMethod,
    }).returning();

    // 5. Insert line items + deduct stock
    for (const p of lines) {
      await tx.insert(saleItems).values({
        saleId: sale.id, productId: p.id,
        productName: p.name, productSku: p.sku,  // snapshots
        quantity: p.qty, unitPrice: p.price,       // snapshot
        discountAmount: p.discAmt.toFixed(2),
        lineTotal: p.lineTotal.toFixed(2),
      });
      await tx.update(products)
        .set({ stockQuantity: sql`${products.stockQuantity} - ${p.qty}` })
        .where(eq(products.id, p.id));
    }

    return sale;  // auto-commits on return, auto-rolls-back on throw
  });
}
```

### 7.4 Better Auth Setup

```bash
npm install better-auth
```

**`src/lib/auth.ts`:**
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user:         schema.users,
      session:      schema.sessions,
      account:      schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,  // set true in production
    password: { minLength: 8 },
  },
  session: {
    expiresIn:   60 * 60 * 8,   // 8 hours
    updateAge:   60 * 60,        // refresh every 1 hour
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  user: {
    additionalFields: {
      role:       { type: 'string', required: true, defaultValue: 'manager' },
      businessId: { type: 'string', required: true },
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],
});
```

**`src/app/api/auth/[...all]/route.ts`:**
```typescript
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
// Handles: sign-in, sign-up, sign-out, forget-password, reset-password, get-session
export const { GET, POST } = toNextJsHandler(auth);
```

**`src/lib/auth-client.ts`:**
```typescript
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});
// Usage:
// const { data: session } = authClient.useSession();
// await authClient.signIn.email({ email, password });
// await authClient.signOut();
// await authClient.forgetPassword({ email, redirectTo: '/reset-password' });
```

**`src/lib/with-auth.ts` — Role middleware:**
```typescript
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

type AppRole = 'owner' | 'manager';
const ROLE_RANK: Record<string, number> = { manager: 1, owner: 2 };

export function withAuth(
  handler: (req: NextRequest, ctx: any) => Promise<NextResponse>,
  minRole: AppRole = 'manager',
) {
  return async (req: NextRequest, ctx: any) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if ((ROLE_RANK[session.user.role ?? ''] ?? 0) < ROLE_RANK[minRole]) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }
    (req as any).session = session;
    return handler(req, ctx);
  };
}
// Usage: export const GET = withAuth(handleGet, 'manager');
```

### 7.5 Cashier PIN Auth (Custom)

```typescript
// src/app/api/cashier-auth/login/route.ts
import { db } from '@/db';
import { cashiers, cashierSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { businessId, cashierId, pin } = await req.json();

  const [cashier] = await db.select().from(cashiers)
    .where(and(
      eq(cashiers.id, cashierId),
      eq(cashiers.businessId, businessId),
      eq(cashiers.isActive, true),
    ));

  if (!cashier) {
    return NextResponse.json({ success: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  const valid = await bcrypt.compare(pin, cashier.pinHash);
  if (!valid) {
    return NextResponse.json({ success: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  const rawToken  = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

  await db.insert(cashierSessions).values({ cashierId: cashier.id, tokenHash, expiresAt });

  return NextResponse.json({
    success: true,
    data: { token: rawToken, cashierId: cashier.id, cashierName: cashier.name, expiresAt },
  });
}
```

### 7.6 Project Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts       # Better Auth handler
│   │   ├── cashier-auth/
│   │   │   ├── login/route.ts           # PIN login
│   │   │   └── logout/route.ts          # PIN logout
│   │   ├── v1/
│   │   │   ├── products/route.ts
│   │   │   ├── products/[id]/route.ts
│   │   │   ├── products/[id]/adjust-stock/route.ts
│   │   │   ├── sales/route.ts
│   │   │   ├── sales/[id]/route.ts
│   │   │   ├── sales/[id]/receipt/route.ts
│   │   │   └── reports/
│   │   │       ├── daily-summary/route.ts
│   │   │       └── product-sales/route.ts
│   ├── (pos)/
│   │   └── pos/page.tsx                 # POS screen (RSC → Client)
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── reports/
│   │   └── settings/
│   ├── login/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                              # Button, Input, Badge, Modal, Spinner...
│   ├── pos/                             # POSScreen, ProductSearch, CartPanel...
│   ├── inventory/                       # ProductTable, StockAdjustModal...
│   └── reports/                         # DailySummaryCard, ProductSalesTable...
├── db/
│   ├── schema.ts                        # All Drizzle table definitions
│   └── index.ts                         # drizzle(client, { schema })
├── lib/
│   ├── auth.ts                          # Better Auth server config
│   ├── auth-client.ts                   # Better Auth React client
│   ├── with-auth.ts                     # Role middleware
│   └── utils.ts                         # cn() helper
├── services/
│   ├── SaleService.ts                   # completeSale() — Drizzle transaction
│   └── StockService.ts                  # adjustStock()
└── store/
    └── cart.ts                          # Zustand cart store
drizzle/
└── migrations/                          # Auto-generated SQL files
drizzle.config.ts
tailwind.config.ts
```

---

## 8. Non-Functional Requirements

### 8.1 Performance

- POS product search: results within 300ms of keypress (debounce at 200ms)
- Sale completion (DB transaction): under 1 second
- Report page load: under 3 seconds
- Page initial load: under 2 seconds on 3G (Next.js SSR + code splitting)

### 8.2 Security

- All `/api/v1/*` routes require authentication — no public endpoints except auth routes
- Role checks via `withAuth()` middleware on every protected route — never trust frontend-sent role claims
- Input validation with **Zod** schemas on all POST/PUT endpoints before any DB call
- Drizzle parameterized queries only — no raw string interpolation (SQL injection prevention)
- Rate limiting: `/api/auth/sign-in/email` — max 10 attempts per 15 minutes per IP (use `@upstash/ratelimit` or similar)
- HTTPS enforced in production
- Cashier PINs: bcrypt cost factor 12 minimum
- Cashier session tokens: stored as SHA-256 hash in DB — raw token never persisted

### 8.3 Data Integrity

- `stock_quantity` CHECK constraint: `>= 0` — enforced at DB level
- All monetary columns: `NUMERIC(12,2)` with `CHECK >= 0`
- `grand_total` enforced as `subtotal - total_discount` at insert time
- `receipt_number` unique per business: `UNIQUE INDEX on (business_id, receipt_number)`
- One SKU per active product per business: `UNIQUE INDEX on (business_id, sku) WHERE is_active = true`

### 8.4 Future Scalability

The MVP schema supports these expansions without a full rewrite:

- **Multi-branch:** add `branch_id` FK to `products`, `sales`, `cashiers`. Filter all queries by branch.
- **Mobile money:** add `payment_gateway_ref` column to `sales`. Implement webhook handler.
- **Offline mode:** service worker + IndexedDB queue. Sync on reconnect.
- **Barcode scanner:** `barcode` column already in `products` schema. POS search already queries it.

---

## 9. Build Phases & Milestones

| # | Phase | Deliverables | Duration |
|---|---|---|---|
| 1 | Foundation | PostgreSQL + Drizzle schema + migrations, Better Auth setup (email+password + Drizzle adapter), custom cashier PIN auth, role middleware, business setup flow | Week 1 |
| 2 | Inventory | Product CRUD API + React UI (Tailwind), stock adjustment API + UI, low-stock indicator, inventory list screen | Week 2 |
| 3 | POS Core | Zustand cart store, React POS UI (product search, cart, qty stepper, discount), sale completion API with Drizzle atomic transaction | Week 3–4 |
| 4 | Receipts & Reports | Receipt React component (print CSS + PDF), daily summary report, product-level report, PDF export | Week 5 |
| 5 | Polish & Testing | Mobile Tailwind responsiveness, edge cases, E2E tests for sale flow, UAT, bug fixes | Week 6 |

### 9.1 Definition of Done

- [ ] A cashier can log in with PIN, search for a product, add to cart, apply a discount, complete a sale, and print/download a receipt — all in under 2 minutes
- [ ] Stock quantity correctly decrements on every sale and cannot go below zero (DB constraint enforced)
- [ ] Owner can view daily sales summary and export to PDF
- [ ] Owner can add/edit products and adjust stock with a reason
- [ ] 3 role types enforced: Owner (Better Auth), Manager (Better Auth), Cashier (PIN) — with correct permission enforcement at the API level
- [ ] Application renders correctly on desktop Chrome and mobile Safari (iOS) / Chrome (Android) at 375px width
- [ ] All critical paths covered by automated tests (sale flow, insufficient stock, role blocking)

---

## 10. Open Questions & Decisions

> ⚠️ These must be resolved before or during Phase 1. Leaving them open will block implementation choices.

| # | Question | Options / Notes | Status |
|---|---|---|---|
| 1 | Multi-branch support in MVP? | If YES: add `branch_id` to schema now. If NO: add later via migration. | UNDECIDED |
| 2 | VAT/tax on receipts? | Uganda standard VAT is 18%. Would need `tax_rate` on products and `tax_amount` on sales. | UNDECIDED |
| 3 | Offline capability required? | Requires service worker + IndexedDB. Significant added complexity. | UNDECIDED |
| 4 | Barcode scanner in MVP? | Schema already has `barcode` field. Just needs POS search to query it. Low effort. | EASY ADD |
| 5 | How will BillPOS be monetised? | SaaS monthly fee per business? Per-cashier seat pricing? One-time license? | UNDECIDED |
| 6 | Email/SMS low-stock alerts? | MVP: visual indicator only. Post-MVP: Africa's Talking API for Uganda SMS. | DEFERRED |

---

## 11. Instructions for LLM / AI Builder

This section is written directly to any AI agent using this PRD as a build reference.

### 11.1 Golden Rules

1. **NEVER process a sale outside a `db.transaction()`**. Use `.for('update')` on product rows. Auto-commits on return, auto-rolls-back on throw.
2. **NEVER store money as a JS float**. Drizzle returns `NUMERIC` as strings. Use `decimal.js` for all arithmetic. `.toFixed(2)` before inserting.
3. **NEVER trust role from the frontend**. Always call `auth.api.getSession({ headers: req.headers })` server-side. Read `session.user.role`.
4. **NEVER expose `password` or `pinHash`** in any API response. Select only the fields you need.
5. **ALWAYS snapshot** `productName`, `productSku`, and `unitPrice` into `sale_items` at insert time. Never join back to `products` to reconstruct a historical receipt.
6. **ALWAYS soft-delete products** (`is_active = false`). Never hard-delete a product that has `sale_items` referencing it.
7. **ALWAYS validate** request bodies with a Zod schema before any DB call.
8. **NEVER mix** Better Auth sessions with cashier PIN sessions. Different cookies, different tables, different middleware.
9. **NEVER build Tailwind class names dynamically** (e.g. `'text-' + color`). Use static object maps with complete class strings.
10. **ALWAYS use `cn()`** (`clsx` + `tailwind-merge`) when combining Tailwind classes conditionally.

### 11.2 Sale Endpoint — Step-by-Step Implementation Order

```
1. Validate request body with Zod schema
2. Begin db.transaction()
3. For each item: SELECT ... FROM products WHERE id = ? AND businessId = ? FOR UPDATE
4. Check quantity — if insufficient: collect error, continue checking remaining items
5. If any stock errors: throw AppError('INSUFFICIENT_STOCK', 422, errors) → auto ROLLBACK
6. Calculate all line totals and grand total using decimal.js
7. INSERT into sales → get back sale.id and receiptNumber
8. For each item: INSERT into sale_items (with snapshotted name/sku/price)
9. For each item: UPDATE products SET stock_quantity = stock_quantity - qty WHERE id = ?
10. Return sale data → db.transaction() auto-commits
```

### 11.3 Receipt Number Generation

Format: `{YYYYMMDD}-{4-digit-sequence}`. Example: `20260615-0042`.

- Sequence resets to `0001` each new calendar day per business
- Generate inside the transaction to prevent race conditions:

```typescript
async function generateReceiptNumber(tx: DB, businessId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `${today}-`;
  const [last] = await tx
    .select({ num: sales.receiptNumber })
    .from(sales)
    .where(and(eq(sales.businessId, businessId), sql`receipt_number LIKE ${prefix + '%'}` ))
    .orderBy(sql`receipt_number DESC`)
    .limit(1);
  const seq = last ? parseInt(last.num.split('-')[1]) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}
```

### 11.4 Testing Requirements

| Test Type | What to Cover |
|---|---|
| Unit | `SaleService.completeSale()` — concurrent sale simulation, discount edge cases, 0%/100% discount, flat discount > item price |
| Integration | `POST /api/v1/sales` with insufficient stock → 422 with correct `details` array |
| Integration | `stock_quantity` does NOT decrement on a failed (rolled-back) sale |
| Integration | `GET /api/v1/inventory` with cashier token → 403 FORBIDDEN |
| Integration | `POST /api/v1/sales` with invalid Zod schema → 400 VALIDATION_ERROR |
| E2E (Playwright) | Full sale flow: PIN login → search product → add to cart → complete sale → download receipt |
| E2E (Playwright) | Owner email login → add product → set stock → view report → PDF export |

### 11.5 Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/billpos"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_SECRET="generate-with: openssl rand -base64 32"
BETTER_AUTH_URL="http://localhost:3000"

# Email (for password reset — configure in production)
EMAIL_FROM="noreply@billpos.app"
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
```

---

> 📌 **Document version:** 1.0.0 | **Maintained by:** Embiro Technologies | **Next review:** Start of each build phase
>
> When requirements evolve, update the version number and append changes at the bottom of the relevant section with a `<!-- v1.1 -->` marker. Do not modify historical content retroactively.
