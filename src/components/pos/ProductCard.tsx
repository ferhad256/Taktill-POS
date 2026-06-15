import type { Product } from "../../types";
import { formatMoney } from "../../lib/money";
import { cn } from "../../lib/utils";

export default function ProductCard({
  product,
  currency,
  inCartQty,
  onAdd,
}: {
  product: Product;
  currency: string;
  inCartQty: number;
  onAdd: (product: Product) => void;
}) {
  const out = product.stockQuantity <= 0;
  const low =
    !out && product.stockQuantity <= product.lowStockThreshold;
  const maxed = inCartQty >= product.stockQuantity;

  return (
    <button
      type="button"
      disabled={out || maxed}
      onClick={() => onAdd(product)}
      className={cn(
        "group relative flex min-h-28 flex-col justify-between rounded-xl border border-gray-200 bg-white p-3 text-left transition dark:border-gray-800 dark:bg-white/[0.03]",
        out || maxed
          ? "cursor-not-allowed opacity-60"
          : "hover:border-brand-300 hover:shadow-theme-sm active:scale-[0.98]",
      )}
    >
      <div>
        <p className="line-clamp-2 text-sm font-medium text-gray-800 dark:text-white/90">
          {product.name}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">{product.sku}</p>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
          {formatMoney(product.unitPrice, currency)}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            out
              ? "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
              : low
                ? "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400"
                : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
          )}
        >
          {out ? "Out" : `${product.stockQuantity} left`}
        </span>
      </div>
      {inCartQty > 0 && (
        <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white shadow-theme-sm">
          {inCartQty}
        </span>
      )}
    </button>
  );
}
