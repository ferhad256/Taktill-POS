import { Router } from "express";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";
import { db } from "../db";
import { products, saleItems, sales } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { d } from "../lib/money";

export const reportsRouter = Router();

function bizSales(businessId: string) {
  return db.select().from(sales).where(eq(sales.businessId, businessId)).all();
}

// Daily summary (manager+)
reportsRouter.get("/daily-summary", requireAuth("manager"), (req: any, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const rows = bizSales(req.principal.businessId).filter(
    (s) => s.createdAt.slice(0, 10) === date,
  );

  const totalRevenue = rows.reduce((acc, s) => acc.plus(s.grandTotal), d(0));
  const totalDiscount = rows.reduce((acc, s) => acc.plus(s.totalDiscount), d(0));
  const count = rows.length;

  const cashierMap = new Map<string, { cashierName: string; count: number; revenue: Decimal }>();
  for (const s of rows) {
    const cur = cashierMap.get(s.cashierId) ?? { cashierName: s.cashierName, count: 0, revenue: d(0) };
    cur.count += 1;
    cur.revenue = cur.revenue.plus(s.grandTotal);
    cashierMap.set(s.cashierId, cur);
  }

  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0, revenue: 0 }));
  for (const s of rows) {
    const h = new Date(s.createdAt).getHours();
    byHour[h].count += 1;
    byHour[h].revenue += d(s.grandTotal).toNumber();
  }

  res.json({
    success: true,
    data: {
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
    },
  });
});

// Product-level sales (manager+)
reportsRouter.get("/product-sales", requireAuth("manager"), (req: any, res) => {
  const from = (req.query.from as string) || "0000-00-00";
  const to = (req.query.to as string) || "9999-99-99";
  const category = req.query.category as string | undefined;
  const sort = (req.query.sort as string) || "units";
  const biz = req.principal.businessId;

  const inRange = bizSales(biz).filter((s) => {
    const day = s.createdAt.slice(0, 10);
    return day >= from && day <= to;
  });
  const saleIds = new Set(inRange.map((s) => s.id));
  const relevant = db
    .select()
    .from(saleItems)
    .all()
    .filter((i) => saleIds.has(i.saleId));

  const productById = new Map(
    db.select().from(products).where(eq(products.businessId, biz)).all().map((p) => [p.id, p]),
  );

  const rows = new Map<string, { productId: string; productName: string; productSku: string; unitsSold: number; rev: Decimal; disc: Decimal }>();
  for (const it of relevant) {
    if (category && category !== "all") {
      const p = productById.get(it.productId);
      if (!p || p.category !== category) continue;
    }
    const cur = rows.get(it.productId) ?? {
      productId: it.productId,
      productName: it.productName,
      productSku: it.productSku,
      unitsSold: 0,
      rev: d(0),
      disc: d(0),
    };
    cur.unitsSold += it.quantity;
    cur.rev = cur.rev.plus(it.lineTotal);
    cur.disc = cur.disc.plus(it.discountAmount);
    rows.set(it.productId, cur);
  }

  const result = Array.from(rows.values()).map((r) => ({
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    unitsSold: r.unitsSold,
    revenue: r.rev.toFixed(2),
    discount: r.disc.toFixed(2),
  }));
  result.sort((a, b) => {
    if (sort === "name") return a.productName.localeCompare(b.productName);
    if (sort === "revenue") return d(b.revenue).comparedTo(d(a.revenue));
    return b.unitsSold - a.unitsSold;
  });

  res.json({ success: true, data: result });
});

// Dashboard stats (manager+)
reportsRouter.get("/dashboard", requireAuth("manager"), (req: any, res) => {
  const biz = req.principal.businessId;
  const today = new Date().toISOString().slice(0, 10);
  const todays = bizSales(biz).filter((s) => s.createdAt.slice(0, 10) === today);
  const active = db.select().from(products).where(eq(products.businessId, biz)).all().filter((p) => p.isActive);

  res.json({
    success: true,
    data: {
      todayRevenue: todays.reduce((acc, s) => acc.plus(s.grandTotal), d(0)).toFixed(2),
      todaySales: todays.length,
      lowStockCount: active.filter((p) => p.stockQuantity <= p.lowStockThreshold).length,
      productCount: active.length,
    },
  });
});
