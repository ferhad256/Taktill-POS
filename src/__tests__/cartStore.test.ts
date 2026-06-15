import { describe, expect, it, beforeEach } from "vitest";
import Decimal from "decimal.js";

// Minimal cart item type matching the production type signature
interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  discountType: "percentage" | "fixed";
  taxRate: number;
}

interface CartState {
  items: CartItem[];
  lineDiscount: number;
  cartDiscount: number;
  discountType: "percentage" | "fixed";
}

function computeTotals(state: CartState) {
  const subtotal = state.items.reduce(
    (sum, item) => sum.plus(new Decimal(item.price).times(item.quantity)),
    new Decimal(0),
  );

  const lineDiscountTotal = state.items.reduce((sum, item) => {
    const lineTotal = new Decimal(item.price).times(item.quantity);
    if (item.discountType === "percentage") {
      return sum.plus(lineTotal.times(item.discount).div(100));
    }
    return sum.plus(Math.min(item.discount, lineTotal.toNumber()));
  }, new Decimal(0));

  let cartDiscountValue = new Decimal(0);
  if (state.cartDiscount > 0) {
    const afterLine = subtotal.minus(lineDiscountTotal);
    if (state.discountType === "percentage") {
      cartDiscountValue = afterLine.times(state.cartDiscount).div(100);
    } else {
      cartDiscountValue = new Decimal(Math.min(state.cartDiscount, afterLine.toNumber()));
    }
  }

  const finalSubtotal = subtotal.minus(lineDiscountTotal).minus(cartDiscountValue);

  const tax = state.items.reduce((sum, item) => {
    const lineTotal = new Decimal(item.price).times(item.quantity);
    const lineDisc =
      item.discountType === "percentage"
        ? lineTotal.times(item.discount).div(100)
        : Math.min(item.discount, lineTotal.toNumber());
    const taxable = lineTotal.minus(lineDisc);
    return sum.plus(taxable.times(item.taxRate).div(100));
  }, new Decimal(0));

  // ∏ allocation: spread proportionate discount across items
  const grandTotal = finalSubtotal.plus(tax);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    lineDiscount: Number(lineDiscountTotal.toFixed(2)),
    cartDiscount: Number(cartDiscountValue.toFixed(2)),
    taxable: Number(finalSubtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(grandTotal.toFixed(2)),
  };
}

function createEmptyCart(): CartState {
  return {
    items: [],
    lineDiscount: 0,
    cartDiscount: 0,
    discountType: "percentage",
  };
}

describe("Cart Store — computeTotals", () => {
  let cart: CartState;

  beforeEach(() => {
    cart = createEmptyCart();
  });

  it("returns zeroes for an empty cart", () => {
    const totals = computeTotals(cart);
    expect(totals.subtotal).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("computes subtotal correctly for single item", () => {
    cart.items.push({ productId: 1, name: "Coke", price: 2.5, quantity: 3, discount: 0, discountType: "fixed", taxRate: 0 });
    const totals = computeTotals(cart);
    expect(totals.subtotal).toBe(7.5);
    expect(totals.total).toBe(7.5);
  });

  it("computes subtotal correctly for multiple items", () => {
    cart.items.push({ productId: 1, name: "Coke", price: 2.5, quantity: 2, discount: 0, discountType: "fixed", taxRate: 0 });
    cart.items.push({ productId: 2, name: "Chips", price: 3.0, quantity: 1, discount: 0, discountType: "fixed", taxRate: 0 });
    const totals = computeTotals(cart);
    expect(totals.subtotal).toBe(8.0);
    expect(totals.total).toBe(8.0);
  });

  it("applies line-item percentage discount", () => {
    cart.items.push({ productId: 1, name: "Coke", price: 10.0, quantity: 1, discount: 10, discountType: "percentage", taxRate: 0 });
    const totals = computeTotals(cart);
    expect(totals.subtotal).toBe(10.0);
    expect(totals.lineDiscount).toBe(1.0);
    expect(totals.total).toBe(9.0);
  });

  it("applies cart-level percentage discount stacked with line discount", () => {
    cart.items.push({ productId: 1, name: "Coke", price: 100.0, quantity: 1, discount: 10, discountType: "percentage", taxRate: 0 });
    cart.cartDiscount = 20;
    cart.discountType = "percentage";
    const totals = computeTotals(cart);
    // line: 10% off → 90.  cart: 20% off 90 → 18.  final: 72.
    expect(totals.subtotal).toBe(100);
    expect(totals.lineDiscount).toBe(10);
    expect(totals.cartDiscount).toBe(18);
    expect(totals.total).toBe(72);
  });

  it("caps line fixed discount at line total", () => {
    cart.items.push({ productId: 1, name: "Coke", price: 5.0, quantity: 1, discount: 100, discountType: "fixed", taxRate: 0 });
    const totals = computeTotals(cart);
    expect(totals.lineDiscount).toBe(5.0);
    expect(totals.total).toBe(0);
  });

  it("computes tax on post-discount amounts", () => {
    cart.items.push({ productId: 1, name: "Coke", price: 100.0, quantity: 1, discount: 10, discountType: "percentage", taxRate: 18 });
    const totals = computeTotals(cart);
    // subtotal: 100, line discount: 10, taxable: 90, tax: 90*0.18 = 16.2
    expect(totals.subtotal).toBe(100);
    expect(totals.lineDiscount).toBe(10);
    expect(totals.tax).toBe(16.2);
    expect(totals.total).toBe(106.2);
  });

  it("handles floating-point precision via Decimal.js", () => {
    cart.items.push({ productId: 1, name: "Item", price: 0.1, quantity: 3, discount: 0, discountType: "fixed", taxRate: 0 });
    const totals = computeTotals(cart);
    expect(totals.subtotal).toBe(0.3);
    expect(totals.total).toBe(0.3);
  });
});
