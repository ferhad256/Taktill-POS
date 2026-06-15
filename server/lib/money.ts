import Decimal from "decimal.js";

export interface Discount {
  type: "percent" | "flat";
  value: number;
}

export function d(value: Decimal.Value): Decimal {
  return new Decimal(value || 0);
}

/** Discount amount for a base value, never exceeding the base. */
export function calcDiscount(base: Decimal, discount?: Discount): Decimal {
  if (!discount || !discount.value || discount.value <= 0) return d(0);
  const raw =
    discount.type === "percent"
      ? base.times(discount.value).div(100)
      : d(discount.value);
  return Decimal.min(raw, base);
}
