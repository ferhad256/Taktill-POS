import { useState } from "react";
import type { Discount } from "../../types";
import { cn } from "../../lib/utils";

/**
 * Compact discount editor (percent or flat). Enforces an optional max percent
 * (used to apply the cashier 20% cap from PRD §3.3.2 in the UI).
 */
export default function DiscountControl({
  value,
  maxPercent,
  onChange,
  onError,
  compact,
}: {
  value?: Discount;
  maxPercent?: number;
  onChange: (discount?: Discount) => void;
  onError?: (message: string) => void;
  compact?: boolean;
}) {
  const [type, setType] = useState<Discount["type"]>(value?.type ?? "percent");
  const [raw, setRaw] = useState<string>(value?.value ? String(value.value) : "");

  function commit(nextType: Discount["type"], nextRaw: string) {
    const num = Number(nextRaw);
    if (!nextRaw || Number.isNaN(num) || num <= 0) {
      onChange(undefined);
      return;
    }
    if (num < 0) return;
    if (
      nextType === "percent" &&
      maxPercent !== undefined &&
      num > maxPercent
    ) {
      onError?.(`Discounts above ${maxPercent}% need a manager.`);
      return;
    }
    onChange({ type: nextType, value: num });
  }

  return (
    <div className={cn("flex items-center gap-1.5", compact && "text-xs")}>
      <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
        {(["percent", "flat"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              commit(t, raw);
            }}
            className={cn(
              "px-2 py-1 text-xs font-medium transition",
              type === t
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-500 dark:bg-gray-900 dark:text-gray-400",
            )}
          >
            {t === "percent" ? "%" : "UGX"}
          </button>
        ))}
      </div>
      <input
        type="number"
        min="0"
        value={raw}
        placeholder="0"
        onChange={(e) => {
          setRaw(e.target.value);
          commit(type, e.target.value);
        }}
        className="h-8 w-20 rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
    </div>
  );
}
