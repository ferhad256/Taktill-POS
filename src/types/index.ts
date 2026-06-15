// ── Domain types — mirror the BillPOS PRD schema (§4) ──────────────
// Monetary values are kept as strings to match the PRD's NUMERIC(12,2)
// convention and to avoid float rounding. Use src/lib/money.ts for math.

export type Role = "owner" | "manager" | "cashier";

export type PaymentMethod = "cash" | "mobile_money" | "card" | "other";

export type AdjustReason =
  | "restock"
  | "damaged"
  | "expired"
  | "correction"
  | "other";

export type DiscountType = "percent" | "flat";

export interface Discount {
  type: DiscountType;
  value: number;
}

export interface Business {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  currency: string; // e.g. "UGX"
  createdAt: string;
}

/** Owners & Managers — email + password login. */
export interface User {
  id: string;
  businessId: string;
  name: string;
  email: string;
  password: string; // mock only — never surfaced in session/UI
  role: Exclude<Role, "cashier">;
  createdAt: string;
}

/** Cashiers — 4-digit PIN login. */
export interface Cashier {
  id: string;
  businessId: string;
  name: string;
  pin: string; // mock only — 4 digits
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  unitPrice: string;
  costPrice?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  businessId: string;
  cashierId: string;
  cashierName: string; // snapshot for display
  receiptNumber: string;
  subtotal: string;
  totalDiscount: string;
  grandTotal: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string; // snapshot at time of sale
  productSku: string; // snapshot at time of sale
  quantity: number;
  unitPrice: string; // snapshot
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount: string;
  lineTotal: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  businessId: string;
  adjustedByUserId: string;
  adjustedByName: string;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: AdjustReason;
  notes?: string;
  createdAt: string;
}

/** Unified authenticated principal used across the app. */
export interface Principal {
  kind: "user" | "cashier";
  id: string;
  name: string;
  role: Role;
  businessId: string;
  email?: string;
}

// ── Sale completion contract (PRD §5.5) ────────────────────────────
export interface SaleItemInput {
  productId: string;
  quantity: number;
  discount?: Discount;
}

export interface CompleteSalePayload {
  businessId: string;
  cashierId: string;
  cashierName: string;
  actorRole: Role;
  paymentMethod: PaymentMethod;
  notes?: string;
  cartDiscount?: Discount;
  items: SaleItemInput[];
}

export interface StockError {
  productId: string;
  productName: string;
  requested: number;
  available: number;
}

/** Thrown by the data layer; mirrors the PRD error-code reference (§5.6). */
export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, status = 400, details?: unknown) {
    super(code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
