import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/badge/Badge";
import EmptyState from "../../components/ui/EmptyState";
import StockAdjustModal from "../../components/inventory/StockAdjustModal";
import { deactivateProduct, getBusiness, listCategories, listProducts } from "../../data/db";
import { formatMoney } from "../../lib/money";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../components/ui/toast";
import type { Product } from "../../types";
import { BoxIconLine, PencilIcon, PlusIcon, TrashBinIcon } from "../../icons";
import { cn } from "../../lib/utils";

export default function Inventory() {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const business = useMemo(() => getBusiness(), []);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [adjusting, setAdjusting] = useState<Product | null>(null);

  const categories = useMemo(() => listCategories(), [version]);
  const products = useMemo(
    () => listProducts({ search, category, activeOnly: true }),
    [search, category, version],
  );

  function refresh() {
    setVersion((v) => v + 1);
  }

  function handleDeactivate(product: Product) {
    if (
      !window.confirm(
        `Deactivate "${product.name}"? It will be hidden from the POS but kept for past receipts.`,
      )
    )
      return;
    deactivateProduct(product.id);
    toast.success("Product deactivated");
    refresh();
  }

  return (
    <>
      <PageMeta title="Inventory | BillPOS" description="Manage products" />
      <PageHeader
        title="Inventory"
        description="Manage your product catalogue and stock levels."
        actions={
          <button
            onClick={() => navigate("/inventory/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <PlusIcon className="size-4" /> Add Product
          </button>
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:max-w-xs"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:max-w-[200px]"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={<BoxIconLine className="size-6" />}
            title="No products"
            description="Add your first product to start selling."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const out = p.stockQuantity <= 0;
                  const low = !out && p.stockQuantity <= p.lowStockThreshold;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 dark:text-white/90">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-400">{p.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {p.category ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                        {formatMoney(p.unitPrice, business.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-medium",
                            out
                              ? "text-error-600 dark:text-error-400"
                              : low
                                ? "text-warning-600 dark:text-orange-400"
                                : "text-gray-800 dark:text-white/90",
                          )}
                        >
                          {p.stockQuantity}
                        </span>
                        {(out || low) && (
                          <Badge
                            color={out ? "error" : "warning"}
                            size="sm"
                          >
                            {out ? "Out" : "Low"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn
                            title="Adjust stock"
                            onClick={() => setAdjusting(p)}
                          >
                            <BoxIconLine className="size-4" />
                          </IconBtn>
                          <IconBtn
                            title="Edit"
                            onClick={() => navigate(`/inventory/${p.id}/edit`)}
                          >
                            <PencilIcon className="size-4" />
                          </IconBtn>
                          <IconBtn
                            title="Deactivate"
                            danger
                            onClick={() => handleDeactivate(p)}
                          >
                            <TrashBinIcon className="size-4" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjusting && principal && (
        <StockAdjustModal
          product={adjusting}
          principal={principal}
          onClose={() => setAdjusting(null)}
          onDone={refresh}
        />
      )}
    </>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5",
        danger
          ? "hover:border-error-300 hover:text-error-500"
          : "hover:border-brand-300 hover:text-brand-500",
      )}
    >
      {children}
    </button>
  );
}
