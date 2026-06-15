import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ── Auth: businesses, users, sessions ──────────────────────────────
export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  currency: text("currency").notNull().default("UGX"),
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // bcrypt hash
  role: text("role").notNull().default("manager"), // 'owner' | 'manager'
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(), // sha256 hash of raw token
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ── Cashiers (PIN auth) ────────────────────────────────────────────
export const cashiers = sqliteTable("cashiers", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(), // bcrypt hash of 4-digit PIN
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const cashierSessions = sqliteTable("cashier_sessions", {
  id: text("id").primaryKey(),
  cashierId: text("cashier_id").notNull(),
  tokenHash: text("token_hash").notNull(), // sha256 hash of raw token
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ── Catalogue & sales ──────────────────────────────────────────────
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  barcode: text("barcode"),
  category: text("category"),
  unitPrice: text("unit_price").notNull(), // decimal string
  costPrice: text("cost_price"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sales = sqliteTable("sales", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  cashierId: text("cashier_id").notNull(),
  cashierName: text("cashier_name").notNull(),
  receiptNumber: text("receipt_number").notNull(),
  subtotal: text("subtotal").notNull(),
  totalDiscount: text("total_discount").notNull().default("0"),
  grandTotal: text("grand_total").notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const saleItems = sqliteTable("sale_items", {
  id: text("id").primaryKey(),
  saleId: text("sale_id").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(), // snapshot
  productSku: text("product_sku").notNull(), // snapshot
  quantity: integer("quantity").notNull(),
  unitPrice: text("unit_price").notNull(), // snapshot
  discountType: text("discount_type"),
  discountValue: text("discount_value"),
  discountAmount: text("discount_amount").notNull().default("0"),
  lineTotal: text("line_total").notNull(),
});

export const stockAdjustments = sqliteTable("stock_adjustments", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  businessId: text("business_id").notNull(),
  adjustedByUserId: text("adjusted_by_user_id").notNull(),
  adjustedByName: text("adjusted_by_name").notNull(),
  quantityDelta: integer("quantity_delta").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});
