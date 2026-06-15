import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { products, stockAdjustments } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { AppError } from "../lib/errors";
import { d } from "../lib/money";

export const productsRouter = Router();

function businessId(req: any): string {
  return req.principal.businessId as string;
}

// ── List / read (cashier+) ─────────────────────────────────────────
productsRouter.get("/", requireAuth(), async (req, res) => {
  const { search, category, activeOnly } = req.query as Record<string, string>;
  let rows = await db
    .select()
    .from(products)
    .where(eq(products.businessId, businessId(req)));
  if (activeOnly === "true") rows = rows.filter((p) => p.isActive);
  if (category && category !== "all") rows = rows.filter((p) => p.category === category);
  if (search) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q),
    );
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ success: true, data: rows });
});

productsRouter.get("/categories", requireAuth(), async (req, res) => {
  const rows = await db.select().from(products).where(eq(products.businessId, businessId(req)));
  const set = new Set<string>();
  rows.forEach((p) => p.category && set.add(p.category));
  res.json({ success: true, data: Array.from(set).sort() });
});

productsRouter.get("/adjustments/log", requireAuth("manager"), async (req, res) => {
  const rows = await db
    .select()
    .from(stockAdjustments)
    .where(eq(stockAdjustments.businessId, businessId(req)))
    .orderBy(desc(stockAdjustments.createdAt));
  res.json({ success: true, data: rows });
});

productsRouter.get("/:id", requireAuth(), async (req, res) => {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, String(req.params.id)), eq(products.businessId, businessId(req))));
  if (!product) throw new AppError("PRODUCT_NOT_FOUND", 404);
  res.json({ success: true, data: product });
});

// ── Mutations (manager+) ───────────────────────────────────────────
const productSchema = z.object({
  name: z.string().min(1).max(120),
  sku: z.string().max(60).optional(),
  barcode: z.string().max(60).optional(),
  category: z.string().max(80).optional(),
  unitPrice: z.union([z.string(), z.number()]),
  costPrice: z.union([z.string(), z.number()]).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

productsRouter.post("/", requireAuth("manager"), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  const input = parsed.data;
  const biz = businessId(req);

  const sku = (input.sku || "").trim() || `SKU-${Date.now().toString().slice(-6)}`;
  const dup = await db
    .select()
    .from(products)
    .where(and(eq(products.businessId, biz), eq(products.sku, sku), eq(products.isActive, true)));
  if (dup.length) throw new AppError("DUPLICATE_SKU", 409);

  const now = new Date();
  const [product] = await db
    .insert(products)
    .values({
      businessId: biz,
      name: input.name.trim(),
      sku,
      barcode: input.barcode?.trim() || null,
      category: input.category?.trim() || null,
      unitPrice: d(input.unitPrice).toFixed(2),
      costPrice: input.costPrice !== undefined ? d(input.costPrice).toFixed(2) : null,
      stockQuantity: Math.max(0, Math.trunc(input.stockQuantity ?? 0)),
      lowStockThreshold: Math.max(0, Math.trunc(input.lowStockThreshold ?? 5)),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  res.status(201).json({ success: true, data: product });
});

productsRouter.put("/:id", requireAuth("manager"), async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  const biz = businessId(req);
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, String(req.params.id)), eq(products.businessId, biz)));
  if (!existing) throw new AppError("PRODUCT_NOT_FOUND", 404);

  const input = parsed.data;
  if (input.sku) {
    const dup = (
      await db
        .select()
        .from(products)
        .where(and(eq(products.businessId, biz), eq(products.sku, input.sku), eq(products.isActive, true)))
    ).filter((p) => p.id !== existing.id);
    if (dup.length) throw new AppError("DUPLICATE_SKU", 409);
  }

  const next = {
    name: input.name?.trim() ?? existing.name,
    sku: input.sku?.trim() ?? existing.sku,
    barcode: input.barcode !== undefined ? input.barcode.trim() || null : existing.barcode,
    category: input.category !== undefined ? input.category.trim() || null : existing.category,
    unitPrice: input.unitPrice !== undefined ? d(input.unitPrice).toFixed(2) : existing.unitPrice,
    costPrice: input.costPrice !== undefined ? d(input.costPrice).toFixed(2) : existing.costPrice,
    lowStockThreshold:
      input.lowStockThreshold !== undefined
        ? Math.max(0, Math.trunc(input.lowStockThreshold))
        : existing.lowStockThreshold,
    updatedAt: new Date(),
  };
  const [updated] = await db
    .update(products)
    .set(next)
    .where(eq(products.id, existing.id))
    .returning();
  res.json({ success: true, data: updated });
});

productsRouter.delete("/:id", requireAuth("manager"), async (req, res) => {
  const biz = businessId(req);
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, String(req.params.id)), eq(products.businessId, biz)));
  if (!existing) throw new AppError("PRODUCT_NOT_FOUND", 404);
  await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, existing.id));
  res.json({ success: true });
});

const adjustSchema = z.object({
  quantityDelta: z.number().int(),
  reason: z.enum(["restock", "damaged", "expired", "correction", "other"]),
  notes: z.string().optional(),
});

productsRouter.post("/:id/adjust-stock", requireAuth("manager"), async (req: any, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  const biz = businessId(req);
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, String(req.params.id)), eq(products.businessId, biz)));
  if (!product) throw new AppError("PRODUCT_NOT_FOUND", 404);
  if (!product.isActive) throw new AppError("PRODUCT_INACTIVE", 422);

  const before = product.stockQuantity;
  const after = before + Math.trunc(parsed.data.quantityDelta);
  if (after < 0) throw new AppError("INSUFFICIENT_STOCK", 422, "Stock cannot go below zero");

  const now = new Date();
  const [updated] = await db
    .update(products)
    .set({ stockQuantity: after, updatedAt: now })
    .where(eq(products.id, product.id))
    .returning();
  await db.insert(stockAdjustments).values({
    productId: product.id,
    productName: product.name,
    businessId: biz,
    adjustedByUserId: req.principal.id,
    adjustedByName: req.principal.name,
    quantityDelta: Math.trunc(parsed.data.quantityDelta),
    quantityBefore: before,
    quantityAfter: after,
    reason: parsed.data.reason,
    notes: parsed.data.notes?.trim() || null,
    createdAt: now,
  });
  res.json({ success: true, data: updated });
});
