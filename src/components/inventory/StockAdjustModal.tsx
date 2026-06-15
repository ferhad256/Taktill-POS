import { useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import { adjustStock } from "../../data/api";
import { AppError, type AdjustReason, type Product } from "../../types";
import { toast } from "../ui/toast";
import { cn } from "../../lib/utils";

const REASONS: { value: AdjustReason; label: string }[] = [
  { value: "restock", label: "Restock" },
  { value: "damaged", label: "Damaged" },
  { value: "expired", label: "Expired" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other" },
];

export default function StockAdjustModal({
  product,
  onClose,
  onDone,
}: {
  product: Product;
  onClose: () => void;
  onDone: () => void;
}) {
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<AdjustReason>("restock");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const amount = Number(qty);
  const valid = qty !== "" && amount > 0;
  const resulting =
    direction === "add"
      ? product.stockQuantity + (amount || 0)
      : product.stockQuantity - (amount || 0);

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    try {
      await adjustStock({
        productId: product.id,
        quantityDelta: direction === "add" ? amount : -amount,
        reason,
        notes,
      });
      toast.success("Stock updated");
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof AppError && err.code === "INSUFFICIENT_STOCK") {
        toast.error("Stock cannot go below zero.");
      } else {
        toast.error("Could not update stock.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 w-full max-w-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
        Adjust Stock
      </h3>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        {product.name} · currently {product.stockQuantity} in stock
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["add", "remove"] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium capitalize transition",
                direction === dir
                  ? dir === "add"
                    ? "border-success-500 bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                    : "border-error-500 bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
                  : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400",
              )}
            >
              {dir === "add" ? "Add stock" : "Remove stock"}
            </button>
          ))}
        </div>

        <div>
          <Label>Quantity</Label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div>
          <Label>Reason</Label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as AdjustReason)}
            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Notes (optional)</Label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            resulting < 0
              ? "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
              : "bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400",
          )}
        >
          New stock level: <span className="font-semibold">{resulting}</span>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!valid || resulting < 0 || saving}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {saving ? "Saving…" : "Save adjustment"}
        </button>
      </div>
    </Modal>
  );
}
