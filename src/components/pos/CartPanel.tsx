import { useState } from "react";
import type { Discount, PaymentMethod, Principal, SaleItem, Sale } from "../../types";
import { AppError } from "../../types";
import { computeTotals, useCartStore } from "../../store/cart";
import { completeSale } from "../../data/api";
import { formatMoney } from "../../lib/money";
import { toast } from "../ui/toast";
import { cn } from "../../lib/utils";
import DiscountControl from "./DiscountControl";
import { TrashBinIcon } from "../../icons";

const PAYMENTS: { value: PaymentMethod; label: string; short: string }[] = [
  { value: "cash", label: "Cash", short: "Cash" },
  { value: "mobile_money", label: "Mobile Money", short: "MoMo" },
  { value: "card", label: "Card", short: "Card" },
  { value: "other", label: "Other", short: "Other" },
];

export default function CartPanel({
  principal,
  currency,
  onSale,
  onMutated,
}: {
  principal: Principal;
  currency: string;
  onSale: (result: { sale: Sale; items: SaleItem[] }) => void;
  onMutated: () => void;
}) {
  const {
    items,
    cartDiscount,
    paymentMethod,
    notes,
    updateQty,
    removeItem,
    setItemDiscount,
    setCartDiscount,
    setPayment,
    setNotes,
    clearCart,
  } = useCartStore();
  const [submitting, setSubmitting] = useState(false);

  const totals = computeTotals(items, cartDiscount);
  const maxPercent = principal.role === "cashier" ? 20 : undefined;

  function applyCartDiscount(discount?: Discount) {
    setCartDiscount(discount);
    if (discount) {
      // PRD §3.3.2 — discount scope is per-line OR cart total, not both.
      items.forEach((i) => i.discount && setItemDiscount(i.productId, undefined));
    }
  }

  function applyItemDiscount(productId: string, discount?: Discount) {
    setItemDiscount(productId, discount);
    if (discount && cartDiscount) setCartDiscount(undefined);
  }

  async function handleComplete() {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const result = await completeSale({
        paymentMethod,
        notes,
        cartDiscount,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discount: i.discount,
        })),
      });
      toast.success(`Sale completed — ${result.sale.receiptNumber}`);
      clearCart();
      onMutated();
      onSale(result);
    } catch (err) {
      if (err instanceof AppError && err.code === "INSUFFICIENT_STOCK") {
        const details = err.details as { productName: string; available: number }[];
        toast.error(
          `Not enough stock: ${details
            .map((d) => `${d.productName} (${d.available} left)`)
            .join(", ")}`,
        );
        onMutated();
      } else if (err instanceof AppError && err.code === "DISCOUNT_LIMIT_EXCEEDED") {
        toast.error("Discount above 20% requires a manager.");
      } else {
        toast.error("Could not complete the sale. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Current Sale
          </h2>
          <p className="text-xs text-gray-400">
            {totals.itemCount} item{totals.itemCount === 1 ? "" : "s"}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-sm font-medium text-error-500 hover:text-error-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-gray-400">
            <span className="mb-2 text-3xl">🛒</span>
            Cart is empty.
            <br />
            Tap a product to add it.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const lineTotal = computeTotals([item]).grandTotal;
              return (
                <li
                  key={item.productId}
                  className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatMoney(item.unitPrice, currency)} each
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-gray-400 transition hover:text-error-500"
                      aria-label="Remove"
                    >
                      <TrashBinIcon className="size-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <StepBtn
                        onClick={() =>
                          updateQty(item.productId, item.quantity - 1)
                        }
                      >
                        −
                      </StepBtn>
                      <input
                        type="number"
                        value={item.quantity}
                        min={1}
                        max={item.stock}
                        onChange={(e) =>
                          updateQty(item.productId, Number(e.target.value))
                        }
                        className="h-8 w-12 rounded-lg border border-gray-300 bg-transparent text-center text-sm text-gray-800 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
                      />
                      <StepBtn
                        disabled={item.quantity >= item.stock}
                        onClick={() =>
                          updateQty(item.productId, item.quantity + 1)
                        }
                      >
                        +
                      </StepBtn>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {formatMoney(lineTotal, currency)}
                    </span>
                  </div>

                  {item.quantity >= item.stock && (
                    <p className="mt-1 text-xs text-warning-600 dark:text-orange-400">
                      Only {item.stock} in stock
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Item discount</span>
                    <DiscountControl
                      compact
                      value={item.discount}
                      maxPercent={maxPercent}
                      onChange={(d) => applyItemDiscount(item.productId, d)}
                      onError={(m) => toast.error(m)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Cart discount
          </span>
          <DiscountControl
            value={cartDiscount}
            maxPercent={maxPercent}
            onChange={applyCartDiscount}
            onError={(m) => toast.error(m)}
          />
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {PAYMENTS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPayment(p.value)}
              title={p.label}
              className={cn(
                "truncate rounded-lg border px-1 py-2 text-xs font-medium transition",
                paymentMethod === p.value
                  ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5",
              )}
            >
              {p.short}
            </button>
          ))}
        </div>

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optional)"
          className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />

        <div className="space-y-1 text-sm">
          <Line label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
          {Number(totals.totalDiscount) > 0 && (
            <Line
              label="Discount"
              value={`−${formatMoney(totals.totalDiscount, currency)}`}
            />
          )}
          <div className="flex items-center justify-between pt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            <span>Total</span>
            <span>{formatMoney(totals.grandTotal, currency)}</span>
          </div>
        </div>

        <button
          onClick={handleComplete}
          disabled={items.length === 0 || submitting}
          className="w-full rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {submitting ? "Processing…" : "Complete Sale"}
        </button>
      </div>
    </div>
  );
}

function StepBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex size-8 items-center justify-center rounded-lg border border-gray-300 text-lg text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
    >
      {children}
    </button>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
      <span>{label}</span>
      <span className="font-medium text-gray-700 dark:text-white/80">
        {value}
      </span>
    </div>
  );
}
