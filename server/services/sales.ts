import { Decimal } from "decimal.js";
import { and, eq, like } from "drizzle-orm";
import { db } from "../db/index.js";
import { products, saleItems, sales } from "../db/schema.js";
import { calcDiscount, d, type Discount } from "../lib/money.js";
import { AppError } from "../lib/errors.js";

export interface SaleItemInput {
  productId: string;
  quantity: number;
  discount?: Discount;
}

export interface CompleteSalePayload {
  businessId: string;
  cashierId: string;
  cashierName: string;
  actorRole: "owner" | "manager" | "cashier";
  paymentMethod: "cash" | "mobile_money" | "card" | "other";
  notes?: string;
  cartDiscount?: Discount;
  items: SaleItemInput[];
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function generateReceiptNumber(tx: Tx, businessId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `${today}-`;
  const rows = await tx
    .select({ receiptNumber: sales.receiptNumber })
    .from(sales)
    .where(and(eq(sales.businessId, businessId), like(sales.receiptNumber, `${prefix}%`)));
  const seq =
    rows
      .map((r) => parseInt(r.receiptNumber.split("-")[1], 10))
      .filter((n) => !Number.isNaN(n))
      .reduce((max, n) => Math.max(max, n), 0) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/**
 * Complete a sale atomically (PRD §3.3.3 / §7.3). A single Postgres
 * transaction locks each product row with SELECT … FOR UPDATE, validates
 * stock, then inserts the sale + items and decrements stock — or rolls back.
 */
export async function completeSale(payload: CompleteSalePayload) {
  if (!payload.items.length) {
    throw new AppError("VALIDATION_ERROR", 400, "Cart is empty");
  }

  // Discount rules (PRD §3.3.2): per-line OR cart-total, not both.
  const hasLineDiscount = payload.items.some((i) => i.discount && i.discount.value > 0);
  if (hasLineDiscount && payload.cartDiscount && payload.cartDiscount.value > 0) {
    throw new AppError("VALIDATION_ERROR", 400, "Apply line discounts OR a cart discount, not both");
  }

  // Cashier discount cap (PRD §3.3.2).
  if (payload.actorRole === "cashier") {
    const over = (disc?: Discount) => disc?.type === "percent" && disc.value > 20;
    if (over(payload.cartDiscount) || payload.items.some((i) => over(i.discount))) {
      throw new AppError("DISCOUNT_LIMIT_EXCEEDED", 403);
    }
  }

  return db.transaction(async (tx) => {
    interface Line {
      product: typeof products.$inferSelect;
      quantity: number;
      discount?: Discount;
      discountAmount: Decimal;
      lineTotal: Decimal;
    }

    const stockErrors: {
      productId: string;
      productName: string;
      requested: number;
      available: number;
    }[] = [];
    const lines: Line[] = [];
    let grossSubtotal = d(0);
    let lineDiscountTotal = d(0);

    for (const item of payload.items) {
      const [product] = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, item.productId), eq(products.businessId, payload.businessId)))
        .for("update");

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
      grossSubtotal = grossSubtotal.plus(lineSub);
      lineDiscountTotal = lineDiscountTotal.plus(discAmt);
      lines.push({
        product,
        quantity: item.quantity,
        discount: item.discount,
        discountAmount: discAmt,
        lineTotal: lineSub.minus(discAmt),
      });
    }

    if (stockErrors.length > 0) {
      throw new AppError("INSUFFICIENT_STOCK", 422, stockErrors);
    }

    const afterLineDiscounts = grossSubtotal.minus(lineDiscountTotal);
    const cartDiscAmt = calcDiscount(afterLineDiscounts, payload.cartDiscount);
    const grandTotal = afterLineDiscounts.minus(cartDiscAmt);
    const totalDiscount = lineDiscountTotal.plus(cartDiscAmt);

    const now = new Date();
    const [sale] = await tx
      .insert(sales)
      .values({
        businessId: payload.businessId,
        cashierId: payload.cashierId,
        cashierName: payload.cashierName,
        receiptNumber: await generateReceiptNumber(tx, payload.businessId),
        subtotal: grossSubtotal.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        paymentMethod: payload.paymentMethod,
        notes: payload.notes?.trim() || null,
        createdAt: now,
      })
      .returning();

    const items = [];
    for (const l of lines) {
      const [item] = await tx
        .insert(saleItems)
        .values({
          saleId: sale.id,
          productId: l.product.id,
          productName: l.product.name, // snapshot
          productSku: l.product.sku, // snapshot
          quantity: l.quantity,
          unitPrice: d(l.product.unitPrice).toFixed(2), // snapshot
          discountType: l.discount?.type ?? null,
          discountValue: l.discount ? String(l.discount.value) : null,
          discountAmount: l.discountAmount.toFixed(2),
          lineTotal: l.lineTotal.toFixed(2),
        })
        .returning();
      items.push(item);

      await tx
        .update(products)
        .set({ stockQuantity: l.product.stockQuantity - l.quantity, updatedAt: new Date() })
        .where(eq(products.id, l.product.id));
    }

    return { sale, items };
  });
}
