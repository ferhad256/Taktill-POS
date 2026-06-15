import Decimal from "decimal.js";
import {
  AppError,
  type AdjustReason,
  type Business,
  type Cashier,
  type CompleteSalePayload,
  type Product,
  type Sale,
  type SaleItem,
  type StockAdjustment,
  type StockError,
  type User,
} from "../types";
import { calcDiscount, d } from "../lib/money";
import { buildSeed } from "./seed";

/**
 * Browser-backed data layer for Taktill.
 *
 * The PRD targets PostgreSQL + Drizzle, but this build runs entirely in the
 * browser on the Vite template, so persistence is localStorage. The module
 * boundary is deliberately narrow (typed functions, no leaking of storage
 * details) so a real REST/Drizzle backend can be swapped in later without
 * touching the UI.
 */

const PREFIX = "taktill:";
const KEYS = {
  business: PREFIX + "business",
  users: PREFIX + "users",
  cashiers: PREFIX + "cashiers",
  products: PREFIX + "products",
  sales: PREFIX + "sales",
  saleItems: PREFIX + "sale_items",
  stockAdjustments: PREFIX + "stock_adjustments",
  seeded: PREFIX + "seeded",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
}

/** Seed the store on first run. */
export function ensureSeeded(): void {
  if (localStorage.getItem(KEYS.seeded)) return;
  const seed = buildSeed();
  write(KEYS.business, seed.business);
  write(KEYS.users, seed.users);
  write(KEYS.cashiers, seed.cashiers);
  write(KEYS.products, seed.products);
  write(KEYS.sales, seed.sales);
  write(KEYS.saleItems, seed.saleItems);
  write(KEYS.stockAdjustments, seed.stockAdjustments);
  write(KEYS.seeded, "1");
}

/** Wipe all Taktill data and re-seed (used by Settings → reset demo data). */
export function resetData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  ensureSeeded();
}

// ── Business ───────────────────────────────────────────────────────
export function getBusiness(): Business {
  return read<Business>(KEYS.business, buildSeed().business);
}

export function updateBusiness(patch: Partial<Business>): Business {
  const next = { ...getBusiness(), ...patch };
  write(KEYS.business, next);
  return next;
}

// ── Users (Owner / Manager) ────────────────────────────────────────
export function listUsers(): User[] {
  return read<User[]>(KEYS.users, []);
}

export function signInEmail(email: string, password: string): User {
  const user = listUsers().find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!user || user.password !== password) {
    throw new AppError("INVALID_CREDENTIALS", 401);
  }
  return user;
}

export function addUser(input: {
  name: string;
  email: string;
  password: string;
  role: User["role"];
}): User {
  const users = listUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new AppError("EMAIL_IN_USE", 409);
  }
  const user: User = {
    id: uid("usr"),
    businessId: getBusiness().id,
    name: input.name.trim(),
    email: input.email.trim(),
    password: input.password,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.users, [...users, user]);
  return user;
}

export function removeUser(id: string): void {
  const users = listUsers();
  const target = users.find((u) => u.id === id);
  if (target?.role === "owner") {
    throw new AppError("CANNOT_REMOVE_OWNER", 403);
  }
  write(
    KEYS.users,
    users.filter((u) => u.id !== id),
  );
}

// ── Cashiers ───────────────────────────────────────────────────────
export function listCashiers(opts?: { activeOnly?: boolean }): Cashier[] {
  const all = read<Cashier[]>(KEYS.cashiers, []);
  return opts?.activeOnly ? all.filter((c) => c.isActive) : all;
}

export function cashierLogin(cashierId: string, pin: string): Cashier {
  const cashier = listCashiers({ activeOnly: true }).find(
    (c) => c.id === cashierId,
  );
  if (!cashier || cashier.pin !== pin) {
    throw new AppError("INVALID_CREDENTIALS", 401);
  }
  return cashier;
}

export function addCashier(input: { name: string; pin: string }): Cashier {
  if (!/^\d{4}$/.test(input.pin)) {
    throw new AppError("VALIDATION_ERROR", 400, "PIN must be 4 digits");
  }
  const cashiers = listCashiers();
  const cashier: Cashier = {
    id: uid("csh"),
    businessId: getBusiness().id,
    name: input.name.trim(),
    pin: input.pin,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.cashiers, [...cashiers, cashier]);
  return cashier;
}

export function setCashierActive(id: string, isActive: boolean): void {
  write(
    KEYS.cashiers,
    listCashiers().map((c) => (c.id === id ? { ...c, isActive } : c)),
  );
}

// ── Products ───────────────────────────────────────────────────────
export function listProducts(opts?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
}): Product[] {
  let products = read<Product[]>(KEYS.products, []);
  if (opts?.activeOnly) products = products.filter((p) => p.isActive);
  if (opts?.category && opts.category !== "all") {
    products = products.filter((p) => p.category === opts.category);
  }
  if (opts?.search) {
    const q = opts.search.trim().toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q),
    );
  }
  return products.sort((a, b) => a.name.localeCompare(b.name));
}

export function getProduct(id: string): Product | undefined {
  return read<Product[]>(KEYS.products, []).find((p) => p.id === id);
}

export function listCategories(): string[] {
  const set = new Set<string>();
  read<Product[]>(KEYS.products, []).forEach((p) => {
    if (p.category) set.add(p.category);
  });
  return Array.from(set).sort();
}

function nextSku(): string {
  return `SKU-${Date.now().toString().slice(-6)}`;
}

export function createProduct(input: {
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  unitPrice: string;
  costPrice?: string;
  stockQuantity: number;
  lowStockThreshold: number;
}): Product {
  const products = read<Product[]>(KEYS.products, []);
  const sku = (input.sku || "").trim() || nextSku();
  if (
    products.some(
      (p) => p.isActive && p.sku.toLowerCase() === sku.toLowerCase(),
    )
  ) {
    throw new AppError("DUPLICATE_SKU", 409);
  }
  const ts = new Date().toISOString();
  const product: Product = {
    id: uid("prd"),
    businessId: getBusiness().id,
    name: input.name.trim(),
    sku,
    barcode: input.barcode?.trim() || undefined,
    category: input.category?.trim() || undefined,
    unitPrice: d(input.unitPrice).toFixed(2),
    costPrice: input.costPrice ? d(input.costPrice).toFixed(2) : undefined,
    stockQuantity: Math.max(0, Math.trunc(input.stockQuantity)),
    lowStockThreshold: Math.max(0, Math.trunc(input.lowStockThreshold)),
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  };
  write(KEYS.products, [...products, product]);
  return product;
}

export function updateProduct(
  id: string,
  patch: Partial<
    Pick<
      Product,
      | "name"
      | "sku"
      | "barcode"
      | "category"
      | "unitPrice"
      | "costPrice"
      | "stockQuantity"
      | "lowStockThreshold"
    >
  >,
): Product {
  const products = read<Product[]>(KEYS.products, []);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) throw new AppError("PRODUCT_NOT_FOUND", 404);
  if (patch.sku) {
    const dup = products.some(
      (p) =>
        p.id !== id &&
        p.isActive &&
        p.sku.toLowerCase() === patch.sku!.toLowerCase(),
    );
    if (dup) throw new AppError("DUPLICATE_SKU", 409);
  }
  const next: Product = {
    ...products[idx],
    ...patch,
    unitPrice:
      patch.unitPrice !== undefined
        ? d(patch.unitPrice).toFixed(2)
        : products[idx].unitPrice,
    costPrice:
      patch.costPrice !== undefined
        ? d(patch.costPrice).toFixed(2)
        : products[idx].costPrice,
    updatedAt: new Date().toISOString(),
  };
  products[idx] = next;
  write(KEYS.products, products);
  return next;
}

/** Soft delete (PRD Golden Rule #6 — never hard-delete a sold product). */
export function deactivateProduct(id: string): void {
  const products = read<Product[]>(KEYS.products, []);
  write(
    KEYS.products,
    products.map((p) =>
      p.id === id
        ? { ...p, isActive: false, updatedAt: new Date().toISOString() }
        : p,
    ),
  );
}

// ── Stock adjustments ──────────────────────────────────────────────
export function listStockAdjustments(): StockAdjustment[] {
  return read<StockAdjustment[]>(KEYS.stockAdjustments, []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function adjustStock(input: {
  productId: string;
  quantityDelta: number;
  reason: AdjustReason;
  notes?: string;
  userId: string;
  userName: string;
}): Product {
  const products = read<Product[]>(KEYS.products, []);
  const idx = products.findIndex((p) => p.id === input.productId);
  if (idx === -1) throw new AppError("PRODUCT_NOT_FOUND", 404);
  const product = products[idx];
  if (!product.isActive) throw new AppError("PRODUCT_INACTIVE", 422);

  const before = product.stockQuantity;
  const after = before + Math.trunc(input.quantityDelta);
  if (after < 0) {
    throw new AppError("INSUFFICIENT_STOCK", 422, "Stock cannot go below zero");
  }

  products[idx] = {
    ...product,
    stockQuantity: after,
    updatedAt: new Date().toISOString(),
  };
  write(KEYS.products, products);

  const adjustments = read<StockAdjustment[]>(KEYS.stockAdjustments, []);
  const record: StockAdjustment = {
    id: uid("adj"),
    productId: product.id,
    productName: product.name,
    businessId: product.businessId,
    adjustedByUserId: input.userId,
    adjustedByName: input.userName,
    quantityDelta: Math.trunc(input.quantityDelta),
    quantityBefore: before,
    quantityAfter: after,
    reason: input.reason,
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.stockAdjustments, [record, ...adjustments]);
  return products[idx];
}

// ── Sales ──────────────────────────────────────────────────────────
function generateReceiptNumber(businessId: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `${today}-`;
  const sales = read<Sale[]>(KEYS.sales, []);
  const todays = sales
    .filter((s) => s.businessId === businessId && s.receiptNumber.startsWith(prefix))
    .map((s) => parseInt(s.receiptNumber.split("-")[1], 10))
    .filter((n) => !Number.isNaN(n));
  const seq = todays.length ? Math.max(...todays) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/**
 * Complete a sale. Emulates the PRD's atomic transaction: validate ALL items
 * against current stock first, and only mutate the store once everything
 * passes — so a partial/insufficient cart never decrements stock.
 */
export function completeSale(payload: CompleteSalePayload): {
  sale: Sale;
  items: SaleItem[];
} {
  if (!payload.items.length) {
    throw new AppError("VALIDATION_ERROR", 400, "Cart is empty");
  }

  const products = read<Product[]>(KEYS.products, []);
  const stockErrors: StockError[] = [];

  // Discount cap (PRD §3.3.2) — cashiers may not exceed 20%.
  if (payload.actorRole === "cashier") {
    const over = (disc?: { type: string; value: number }) =>
      disc?.type === "percent" && disc.value > 20;
    if (over(payload.cartDiscount) || payload.items.some((i) => over(i.discount))) {
      throw new AppError("DISCOUNT_LIMIT_EXCEEDED", 403);
    }
  }

  interface Line {
    product: Product;
    quantity: number;
    discountType?: "percent" | "flat";
    discountValue?: number;
    discountAmount: Decimal;
    lineTotal: Decimal;
  }

  const lines: Line[] = [];
  let subtotal = d(0);

  for (const item of payload.items) {
    const product = products.find(
      (p) => p.id === item.productId && p.businessId === payload.businessId,
    );
    if (!product) throw new AppError("PRODUCT_NOT_FOUND", 404);
    if (!product.isActive) throw new AppError("PRODUCT_INACTIVE", 422);

    if (product.stockQuantity < item.quantity) {
      stockErrors.push({
        productId: product.id,
        productName: product.name,
        requested: item.quantity,
        available: product.stockQuantity,
      });
      continue;
    }

    const lineSub = d(product.unitPrice).times(item.quantity);
    const discAmt = calcDiscount(lineSub, item.discount);
    const lineTotal = lineSub.minus(discAmt);
    subtotal = subtotal.plus(lineTotal);
    lines.push({
      product,
      quantity: item.quantity,
      discountType: item.discount?.type,
      discountValue: item.discount?.value,
      discountAmount: discAmt,
      lineTotal,
    });
  }

  if (stockErrors.length > 0) {
    throw new AppError("INSUFFICIENT_STOCK", 422, stockErrors);
  }

  const cartDiscAmt = calcDiscount(subtotal, payload.cartDiscount);
  const grandTotal = subtotal.minus(cartDiscAmt);

  // Per-line discount total + cart-level discount.
  const lineDiscTotal = lines.reduce(
    (acc, l) => acc.plus(l.discountAmount),
    d(0),
  );
  const totalDiscount = lineDiscTotal.plus(cartDiscAmt);

  const saleId = uid("sal");
  const sale: Sale = {
    id: saleId,
    businessId: payload.businessId,
    cashierId: payload.cashierId,
    cashierName: payload.cashierName,
    receiptNumber: generateReceiptNumber(payload.businessId),
    subtotal: subtotal.plus(lineDiscTotal).toFixed(2), // gross subtotal before any discount
    totalDiscount: totalDiscount.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
    paymentMethod: payload.paymentMethod,
    notes: payload.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  const items: SaleItem[] = lines.map((l) => ({
    id: uid("si"),
    saleId,
    productId: l.product.id,
    productName: l.product.name, // snapshot
    productSku: l.product.sku, // snapshot
    quantity: l.quantity,
    unitPrice: d(l.product.unitPrice).toFixed(2), // snapshot
    discountType: l.discountType,
    discountValue: l.discountValue,
    discountAmount: l.discountAmount.toFixed(2),
    lineTotal: l.lineTotal.toFixed(2),
  }));

  // Commit: deduct stock, then persist sale + items together.
  for (const l of lines) {
    const idx = products.findIndex((p) => p.id === l.product.id);
    products[idx] = {
      ...products[idx],
      stockQuantity: products[idx].stockQuantity - l.quantity,
      updatedAt: new Date().toISOString(),
    };
  }
  write(KEYS.products, products);
  write(KEYS.sales, [...read<Sale[]>(KEYS.sales, []), sale]);
  write(KEYS.saleItems, [...read<SaleItem[]>(KEYS.saleItems, []), ...items]);

  return { sale, items };
}

export function listSales(opts?: {
  date?: string; // YYYY-MM-DD
  cashierId?: string;
}): Sale[] {
  let sales = read<Sale[]>(KEYS.sales, []);
  if (opts?.date) {
    sales = sales.filter((s) => s.createdAt.slice(0, 10) === opts.date);
  }
  if (opts?.cashierId && opts.cashierId !== "all") {
    sales = sales.filter((s) => s.cashierId === opts.cashierId);
  }
  return sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSaleWithItems(
  id: string,
): { sale: Sale; items: SaleItem[] } | undefined {
  const sale = read<Sale[]>(KEYS.sales, []).find((s) => s.id === id);
  if (!sale) return undefined;
  const items = read<SaleItem[]>(KEYS.saleItems, []).filter(
    (i) => i.saleId === id,
  );
  return { sale, items };
}

// ── Reports ────────────────────────────────────────────────────────
export interface DailySummary {
  date: string;
  totalSales: number;
  totalRevenue: string;
  totalDiscount: string;
  averageSale: string;
  byCashier: { cashierId: string; cashierName: string; count: number; revenue: string }[];
  byHour: { hour: number; count: number; revenue: number }[];
}

export function getDailySummary(date: string): DailySummary {
  const sales = listSales({ date });
  const totalRevenue = sales.reduce((acc, s) => acc.plus(s.grandTotal), d(0));
  const totalDiscount = sales.reduce((acc, s) => acc.plus(s.totalDiscount), d(0));
  const count = sales.length;

  const cashierMap = new Map<
    string,
    { cashierName: string; count: number; revenue: Decimal }
  >();
  for (const s of sales) {
    const cur = cashierMap.get(s.cashierId) ?? {
      cashierName: s.cashierName,
      count: 0,
      revenue: d(0),
    };
    cur.count += 1;
    cur.revenue = cur.revenue.plus(s.grandTotal);
    cashierMap.set(s.cashierId, cur);
  }

  const byHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
    revenue: 0,
  }));
  for (const s of sales) {
    const h = new Date(s.createdAt).getHours();
    byHour[h].count += 1;
    byHour[h].revenue += d(s.grandTotal).toNumber();
  }

  return {
    date,
    totalSales: count,
    totalRevenue: totalRevenue.toFixed(2),
    totalDiscount: totalDiscount.toFixed(2),
    averageSale: count ? totalRevenue.div(count).toFixed(2) : "0.00",
    byCashier: Array.from(cashierMap.entries()).map(([cashierId, v]) => ({
      cashierId,
      cashierName: v.cashierName,
      count: v.count,
      revenue: v.revenue.toFixed(2),
    })),
    byHour,
  };
}

export interface ProductSalesRow {
  productId: string;
  productName: string;
  productSku: string;
  unitsSold: number;
  revenue: string;
  discount: string;
}

export function getProductSales(opts: {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  category?: string;
  sort?: "units" | "revenue" | "name";
}): ProductSalesRow[] {
  const sales = read<Sale[]>(KEYS.sales, []).filter((s) => {
    const day = s.createdAt.slice(0, 10);
    return day >= opts.from && day <= opts.to;
  });
  const saleIds = new Set(sales.map((s) => s.id));
  const items = read<SaleItem[]>(KEYS.saleItems, []).filter((i) =>
    saleIds.has(i.saleId),
  );

  // Optional category filter — resolve via current product catalogue.
  const productById = new Map(
    read<Product[]>(KEYS.products, []).map((p) => [p.id, p]),
  );

  const rows = new Map<string, ProductSalesRow & { _rev: Decimal; _disc: Decimal }>();
  for (const it of items) {
    if (opts.category && opts.category !== "all") {
      const p = productById.get(it.productId);
      if (!p || p.category !== opts.category) continue;
    }
    const cur =
      rows.get(it.productId) ??
      ({
        productId: it.productId,
        productName: it.productName,
        productSku: it.productSku,
        unitsSold: 0,
        revenue: "0.00",
        discount: "0.00",
        _rev: d(0),
        _disc: d(0),
      } as ProductSalesRow & { _rev: Decimal; _disc: Decimal });
    cur.unitsSold += it.quantity;
    cur._rev = cur._rev.plus(it.lineTotal);
    cur._disc = cur._disc.plus(it.discountAmount);
    rows.set(it.productId, cur);
  }

  const result = Array.from(rows.values()).map((r) => ({
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    unitsSold: r.unitsSold,
    revenue: r._rev.toFixed(2),
    discount: r._disc.toFixed(2),
  }));

  const sort = opts.sort ?? "units";
  result.sort((a, b) => {
    if (sort === "name") return a.productName.localeCompare(b.productName);
    if (sort === "revenue") return d(b.revenue).comparedTo(d(a.revenue));
    return b.unitsSold - a.unitsSold;
  });
  return result;
}

export function getDashboardStats(): {
  todayRevenue: string;
  todaySales: number;
  lowStockCount: number;
  productCount: number;
} {
  const today = new Date().toISOString().slice(0, 10);
  const sales = listSales({ date: today });
  const products = listProducts({ activeOnly: true });
  return {
    todayRevenue: sales
      .reduce((acc, s) => acc.plus(s.grandTotal), d(0))
      .toFixed(2),
    todaySales: sales.length,
    lowStockCount: products.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold,
    ).length,
    productCount: products.length,
  };
}
