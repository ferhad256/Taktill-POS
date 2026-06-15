import { create } from "zustand";
import type { Discount, PaymentMethod } from "../types";
import { calcDiscount, d } from "../lib/money";

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: string; // string to match the NUMERIC return convention
  quantity: number;
  stock: number; // available stock — used to cap quantity in the UI
  discount?: Discount;
}

interface CartState {
  items: CartItem[];
  cartDiscount?: Discount;
  paymentMethod: PaymentMethod;
  notes: string;

  addItem: (product: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, discount?: Discount) => void;
  setCartDiscount: (discount?: Discount) => void;
  setPayment: (method: PaymentMethod) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  cartDiscount: undefined,
  paymentMethod: "cash",
  notes: "",

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === product.productId,
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === product.productId
              ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
              : i,
          ),
        };
      }
      return {
        items: [...state.items, { ...product, quantity: 1 }],
      };
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),

  updateQty: (productId, quantity) =>
    set((state) => ({
      items: state.items.flatMap((i) => {
        if (i.productId !== productId) return [i];
        const q = Math.max(0, Math.min(Math.trunc(quantity), i.stock));
        return q === 0 ? [] : [{ ...i, quantity: q }];
      }),
    })),

  setItemDiscount: (productId, discount) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, discount } : i,
      ),
    })),

  setCartDiscount: (discount) => set({ cartDiscount: discount }),
  setPayment: (method) => set({ paymentMethod: method }),
  setNotes: (notes) => set({ notes }),
  clearCart: () =>
    set({ items: [], cartDiscount: undefined, paymentMethod: "cash", notes: "" }),
}));

export interface CartTotals {
  subtotal: string;
  itemDiscount: string;
  cartDiscount: string;
  totalDiscount: string;
  grandTotal: string;
  itemCount: number;
}

/** Pure totals calculation — used by the cart panel and complete-sale flow. */
export function computeTotals(
  items: CartItem[],
  cartDiscount?: Discount,
): CartTotals {
  let gross = d(0);
  let itemDisc = d(0);
  for (const item of items) {
    const lineSub = d(item.unitPrice).times(item.quantity);
    const disc = calcDiscount(lineSub, item.discount);
    gross = gross.plus(lineSub);
    itemDisc = itemDisc.plus(disc);
  }
  const afterItem = gross.minus(itemDisc);
  const cartDisc = calcDiscount(afterItem, cartDiscount);
  const grand = afterItem.minus(cartDisc);
  return {
    subtotal: gross.toFixed(2),
    itemDiscount: itemDisc.toFixed(2),
    cartDiscount: cartDisc.toFixed(2),
    totalDiscount: itemDisc.plus(cartDisc).toFixed(2),
    grandTotal: grand.toFixed(2),
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
  };
}
