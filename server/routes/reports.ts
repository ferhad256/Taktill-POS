import { Router } from "express";
import { eq } from "drizzle-orm";
import { Decimal } from "decimal.js";
import { db } from "../db/index.js";
import { products, saleItems, sales } from "../db/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { d } from "../lib/money.js";
import { toDateStr } from "../lib/date.js";

export const reportsRouter = Router();

async function bizSales(businessId: string) {
  return db.select().from(sales).where(eq(sales.businessId, businessId));
}

// Daily summary (manager+)
reportsRouter.get("/daily-summary", requireAuth("manager"), async (req: any, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const all = await bizSales(req.principal.businessId);
  const rows = all.filter((s) => toDateStr(s.createdAt) === date);

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
reportsRouter.get("/product-sales", requireAuth("manager"), async (req: any, res) => {
  const from = (req.query.from as string) || "0000-00-00";
  const to = (req.query.to as string) || "9999-99-99";
  const category = req.query.category as string | undefined;
  const sort = (req.query.sort as string) || "units";
  const biz = req.principal.businessId;

  const all = await bizSales(biz);
  const inRange = all.filter((s) => {
    const day = toDateStr(s.createdAt);
    return day >= from && day <= to;
  });
  const saleIds = new Set(inRange.map((s) => s.id));
  const allItems = await db.select().from(saleItems);
  const relevant = allItems.filter((i) => saleIds.has(i.saleId));

  const allProducts = await db.select().from(products).where(eq(products.businessId, biz));
  const productById = new Map(allProducts.map((p) => [p.id, p]));

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

// PDF export — returns printable HTML for browser print (PRD §5.4)
reportsRouter.get("/daily-summary/export", requireAuth("manager"), async (req: any, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const all = await bizSales(req.principal.businessId);
  const rows = all.filter((s) => toDateStr(s.createdAt) === date);
  const totalRevenue = rows.reduce((acc, s) => acc.plus(s.grandTotal), d(0));
  const count = rows.length;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Daily Summary - ${date}</title>
<style>
body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1f2937; }
h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
.date { color: #6b7280; margin-bottom: 1.5rem; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
th { font-size: 0.75rem; text-transform: uppercase; color: #6b7280; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
.stat { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; text-align: center; }
.stat-value { font-size: 1.25rem; font-weight: 600; }
.stat-label { font-size: 0.75rem; color: #6b7280; }
@media print { body { padding: 0; } }
</style></head><body>
<h1>Daily Sales Summary</h1>
<p class="date">${date}</p>
<div class="summary">
  <div class="stat"><div class="stat-value">${count}</div><div class="stat-label">Sales</div></div>
  <div class="stat"><div class="stat-value">UGX ${totalRevenue.toFixed(2)}</div><div class="stat-label">Revenue</div></div>
  <div class="stat"><div class="stat-value">${count ? totalRevenue.div(count).toFixed(2) : "0.00"}</div><div class="stat-label">Avg Sale</div></div>
</div>
<p style="margin-top:2rem;color:#9ca3af;font-size:0.75rem;">Generated by Taktill POS</p>
</body></html>`;
  res.type("html").send(html);
});

// Dashboard stats (manager+)
reportsRouter.get("/dashboard", requireAuth("manager"), async (req: any, res) => {
  const biz = req.principal.businessId;
  const today = new Date().toISOString().slice(0, 10);
  const all = await bizSales(biz);
  const todays = all.filter((s) => toDateStr(s.createdAt) === today);
  const allProducts = await db.select().from(products).where(eq(products.businessId, biz));
  const active = allProducts.filter((p) => p.isActive);

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
