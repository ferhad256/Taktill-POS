import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { saleItems, sales } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { completeSale } from "../services/sales";
import { AppError } from "../lib/errors";

export const salesRouter = Router();

const discountSchema = z
  .object({ type: z.enum(["percent", "flat"]), value: z.number() })
  .optional();

const saleSchema = z.object({
  paymentMethod: z.enum(["cash", "mobile_money", "card", "other"]),
  notes: z.string().optional(),
  cartDiscount: discountSchema,
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        discount: discountSchema,
      }),
    )
    .min(1),
});

// Create sale (cashier+)
salesRouter.post("/", requireAuth(), (req: any, res) => {
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  const result = completeSale({
    businessId: req.principal.businessId,
    cashierId: req.principal.id,
    cashierName: req.principal.name,
    actorRole: req.principal.role,
    ...parsed.data,
  });
  res.status(201).json({ success: true, data: result });
});

// List sales (manager+)
salesRouter.get("/", requireAuth("manager"), (req: any, res) => {
  const { date, cashierId } = req.query as Record<string, string>;
  let rows = db.select().from(sales).where(eq(sales.businessId, req.principal.businessId)).all();
  if (date) rows = rows.filter((s) => s.createdAt.slice(0, 10) === date);
  if (cashierId && cashierId !== "all") rows = rows.filter((s) => s.cashierId === cashierId);
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ success: true, data: rows });
});

// Get one sale + items (cashier may only read own)
salesRouter.get("/:id", requireAuth(), (req: any, res) => {
  const [sale] = db
    .select()
    .from(sales)
    .where(and(eq(sales.id, String(req.params.id)), eq(sales.businessId, req.principal.businessId)))
    .all();
  if (!sale) throw new AppError("SALE_NOT_FOUND", 404);
  if (req.principal.role === "cashier" && sale.cashierId !== req.principal.id) {
    throw new AppError("FORBIDDEN", 403);
  }
  const items = db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, sale.id))
    .orderBy(desc(saleItems.id))
    .all();
  res.json({ success: true, data: { sale, items } });
});
