import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { saleItems, sales } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { completeSale } from "../services/sales";
import { AppError } from "../lib/errors";
import { byCreatedAtDesc, toDateStr } from "../lib/date";

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
salesRouter.post("/", requireAuth(), async (req: any, res) => {
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  const result = await completeSale({
    businessId: req.principal.businessId,
    cashierId: req.principal.id,
    cashierName: req.principal.name,
    actorRole: req.principal.role,
    ...parsed.data,
  });
  res.status(201).json({ success: true, data: result });
});

// List sales (manager+)
salesRouter.get("/", requireAuth("manager"), async (req: any, res) => {
  const { date, cashierId, page, limit } = req.query as Record<string, string>;
  let rows = await db
    .select()
    .from(sales)
    .where(eq(sales.businessId, req.principal.businessId));
  if (date) rows = rows.filter((s) => toDateStr(s.createdAt) === date);
  if (cashierId && cashierId !== "all") rows = rows.filter((s) => s.cashierId === cashierId);
  rows.sort(byCreatedAtDesc);

  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit ?? "50", 10) || 50));
  const total = rows.length;
  const paged = rows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({ success: true, data: paged, meta: { total, page: pageNum, limit: limitNum } });
});

// Get one sale + items (cashier may only read own)
salesRouter.get("/:id", requireAuth(), async (req: any, res) => {
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, String(req.params.id)), eq(sales.businessId, req.principal.businessId)));
  if (!sale) throw new AppError("SALE_NOT_FOUND", 404);
  if (req.principal.role === "cashier" && sale.cashierId !== req.principal.id) {
    throw new AppError("FORBIDDEN", 403);
  }
  const items = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, sale.id))
    .orderBy(desc(saleItems.id));
  res.json({ success: true, data: { sale, items } });
});

// Receipt data (cashier may only read own — PRD §5.3)
salesRouter.get("/:id/receipt", requireAuth(), async (req: any, res) => {
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, String(req.params.id)), eq(sales.businessId, req.principal.businessId)));
  if (!sale) throw new AppError("SALE_NOT_FOUND", 404);
  if (req.principal.role === "cashier" && sale.cashierId !== req.principal.id) {
    throw new AppError("FORBIDDEN", 403);
  }
  const items = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, sale.id))
    .orderBy(desc(saleItems.id));
  res.json({ success: true, data: { sale, items } });
});
