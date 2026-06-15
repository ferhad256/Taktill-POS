import { apiFetch } from "../lib/auth-client";
import type {
  AdjustReason,
  Business,
  Cashier,
  CompleteSalePayload,
  Discount,
  PaymentMethod,
  Principal,
  Product,
  Sale,
  SaleItem,
  StockAdjustment,
  User,
} from "../types";

// ── Auth ───────────────────────────────────────────────────────────
export function signInEmail(email: string, password: string) {
  return apiFetch<{ token: string; principal: Principal }>(
    "/auth/sign-in/email",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
}

export function cashierLoginApi(cashierId: string, pin: string) {
  return apiFetch<{ token: string; principal: Principal }>(
    "/cashier-auth/login",
    { method: "POST", body: JSON.stringify({ cashierId, pin }) },
  );
}

export function getSession() {
  return apiFetch<Principal | null>("/auth/session");
}

export function signOut() {
  return apiFetch<unknown>("/auth/sign-out", { method: "POST" }).catch(() => {});
}

export function listCashiersForLogin() {
  return apiFetch<{ id: string; name: string }[]>("/cashier-auth/list");
}

// ── Business ───────────────────────────────────────────────────────
export function getBusiness() {
  return apiFetch<Business>("/business");
}

export function updateBusiness(patch: Partial<Business>) {
  return apiFetch<Business>("/business", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function resetData() {
  return apiFetch<unknown>("/business/reset", { method: "POST" });
}

// ── Users & cashiers ───────────────────────────────────────────────
export function listUsers() {
  return apiFetch<User[]>("/users");
}

export function addUser(input: { name: string; email: string; password: string }) {
  return apiFetch<User>("/users", { method: "POST", body: JSON.stringify(input) });
}

export function removeUser(id: string) {
  return apiFetch<unknown>(`/users/${id}`, { method: "DELETE" });
}

export type CashierSummary = Pick<Cashier, "id" | "name" | "isActive">;

export function listCashiers() {
  return apiFetch<CashierSummary[]>("/cashiers");
}

export function addCashier(input: { name: string; pin: string }) {
  return apiFetch<CashierSummary>("/cashiers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setCashierActive(id: string, isActive: boolean) {
  return apiFetch<unknown>(`/cashiers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// ── Products ───────────────────────────────────────────────────────
export function listProducts(opts?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
}) {
  const params = new URLSearchParams();
  if (opts?.search) params.set("search", opts.search);
  if (opts?.category) params.set("category", opts.category);
  if (opts?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  return apiFetch<Product[]>(`/products${qs ? `?${qs}` : ""}`);
}

export function getProduct(id: string) {
  return apiFetch<Product>(`/products/${id}`);
}

export function listCategories() {
  return apiFetch<string[]>("/products/categories");
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
}) {
  return apiFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProduct(
  id: string,
  patch: Record<string, unknown>,
) {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deactivateProduct(id: string) {
  return apiFetch<unknown>(`/products/${id}`, { method: "DELETE" });
}

export function adjustStock(input: {
  productId: string;
  quantityDelta: number;
  reason: AdjustReason;
  notes?: string;
}) {
  return apiFetch<Product>(`/products/${input.productId}/adjust-stock`, {
    method: "POST",
    body: JSON.stringify({
      quantityDelta: input.quantityDelta,
      reason: input.reason,
      notes: input.notes,
    }),
  });
}

export function listStockAdjustments() {
  return apiFetch<StockAdjustment[]>("/products/adjustments/log");
}

// ── Sales ──────────────────────────────────────────────────────────
export interface SaleClientPayload {
  paymentMethod: PaymentMethod;
  notes?: string;
  cartDiscount?: Discount;
  items: { productId: string; quantity: number; discount?: Discount }[];
}

export function completeSale(payload: SaleClientPayload) {
  return apiFetch<{ sale: Sale; items: SaleItem[] }>("/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listSales(opts?: { date?: string; cashierId?: string }) {
  const params = new URLSearchParams();
  if (opts?.date) params.set("date", opts.date);
  if (opts?.cashierId) params.set("cashierId", opts.cashierId);
  const qs = params.toString();
  return apiFetch<Sale[]>(`/sales${qs ? `?${qs}` : ""}`);
}

export function getSaleWithItems(id: string) {
  return apiFetch<{ sale: Sale; items: SaleItem[] }>(`/sales/${id}`);
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

export function getDailySummary(date: string) {
  return apiFetch<DailySummary>(`/reports/daily-summary?date=${date}`);
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
  from: string;
  to: string;
  category?: string;
  sort?: "units" | "revenue" | "name";
}) {
  const params = new URLSearchParams({ from: opts.from, to: opts.to });
  if (opts.category) params.set("category", opts.category);
  if (opts.sort) params.set("sort", opts.sort);
  return apiFetch<ProductSalesRow[]>(`/reports/product-sales?${params}`);
}

export interface DashboardStats {
  todayRevenue: string;
  todaySales: number;
  lowStockCount: number;
  productCount: number;
}

export function getDashboardStats() {
  return apiFetch<DashboardStats>("/reports/dashboard");
}

// CompleteSalePayload kept for type parity with the server contract.
export type { CompleteSalePayload };
