import Decimal from "decimal.js";
import type { Discount } from "../types";

/**
 * Money helpers. All arithmetic goes through decimal.js — never native
 * JS floats (PRD Golden Rule #2). Values are stored/returned as strings
 * with 2 decimal places.
 */

export function d(value: Decimal.Value): Decimal {
  return new Decimal(value || 0);
}

/** Compute the discount amount for a base value, never exceeding the base. */
export function calcDiscount(base: Decimal, discount?: Discount): Decimal {
  if (!discount || !discount.value || discount.value <= 0) return d(0);
  const raw =
    discount.type === "percent"
      ? base.times(discount.value).div(100)
      : d(discount.value);
  return Decimal.min(raw, base); // discount can never exceed the line/cart value
}

export function toFixed(value: Decimal.Value): string {
  return d(value).toFixed(2);
}

/** Format a monetary value for display, e.g. "UGX 45,000". */
export function formatMoney(value: Decimal.Value, currency = "UGX"): string {
  const num = d(value).toNumber();
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString()}`;
  }
}
