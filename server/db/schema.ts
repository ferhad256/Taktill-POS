import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uniqueIndex,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

// ── Enums (PRD §4.2) ──────────────────────────────────────────────
export const roleEnum          = pgEnum('role', ['owner', 'manager']);
export const paymentMethodEnum = pgEnum('payment_method',
  ['cash', 'mobile_money', 'card', 'other']);
export const adjustReasonEnum  = pgEnum('adjustment_reason',
  ['restock', 'damaged', 'expired', 'correction', 'other']);
export const discountTypeEnum  = pgEnum('discount_type', ['percent', 'flat']);

// ── Better Auth tables (do NOT rename the camelCase keys) ──────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // BillPOS custom fields (Better Auth additionalFields)
  role: roleEnum("role").notNull().default("manager"),
  businessId: uuid("business_id"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── BillPOS app tables ─────────────────────────────────────────────
export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  logoUrl: text("logo_url"),
  currency: varchar("currency", { length: 5 }).notNull().default("UGX"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashiers = pgTable("cashiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  pinHash: text("pin_hash").notNull(), // bcrypt hash of 4-digit PIN
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashierSessions = pgTable("cashier_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  cashierId: uuid("cashier_id")
    .notNull()
    .references(() => cashiers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(), // sha256 of raw token
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  sku: varchar("sku", { length: 60 }).notNull(),
  barcode: varchar("barcode", { length: 60 }),
  category: varchar("category", { length: 80 }),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  skuIdx: uniqueIndex("idx_products_sku").on(table.businessId, table.sku).where(sql`is_active = true`),
}));

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  cashierId: uuid("cashier_id")
    .notNull()
    .references(() => cashiers.id),
  cashierName: text("cashier_name").notNull(),
  receiptNumber: varchar("receipt_number", { length: 30 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  totalDiscount: numeric("total_discount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  receiptIdx: uniqueIndex("idx_sales_receipt").on(table.businessId, table.receiptNumber),
}));

export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  productName: varchar("product_name", { length: 120 }).notNull(), // snapshot
  productSku: varchar("product_sku", { length: 60 }).notNull(), // snapshot
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discountType: discountTypeEnum("discount_type"),
  discountValue: numeric("discount_value", { precision: 12, scale: 2 }),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
});

export const stockAdjustments = pgTable("stock_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  productName: text("product_name").notNull(), // snapshot
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  adjustedByUserId: text("adjusted_by_user_id").notNull(),
  adjustedByName: text("adjusted_by_name").notNull(), // snapshot
  quantityDelta: integer("quantity_delta").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  reason: adjustReasonEnum("reason").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
