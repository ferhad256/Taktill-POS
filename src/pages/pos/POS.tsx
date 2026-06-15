import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import ProductSearch from "../../components/pos/ProductSearch";
import CartPanel from "../../components/pos/CartPanel";
import ReceiptView from "../../components/pos/ReceiptView";
import { Modal } from "../../components/ui/modal";
import { useAuth } from "../../context/AuthContext";
import { getBusiness, listProducts } from "../../data/db";
import { useCartStore } from "../../store/cart";
import { formatMoney } from "../../lib/money";
import type { Product, Sale, SaleItem } from "../../types";

export default function POS() {
  const { principal } = useAuth();
  const business = useMemo(() => getBusiness(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ sale: Sale; items: SaleItem[] } | null>(
    null,
  );

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  const reload = useCallback(() => {
    setProducts(listProducts({ activeOnly: true }));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const cartQtyById = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => (map[i.productId] = i.quantity));
    return map;
  }, [items]);

  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);

  function handleAdd(product: Product) {
    addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unitPrice: product.unitPrice,
      stock: product.stockQuantity,
    });
  }

  if (!principal) return null;

  const cart = (
    <CartPanel
      principal={principal}
      currency={business.currency}
      onSale={(r) => {
        setReceipt(r);
        setCartOpen(false);
      }}
      onMutated={reload}
    />
  );

  return (
    <>
      <PageMeta title="Point of Sale | BillPOS" description="Process sales" />
      <div className="flex flex-col gap-4 lg:h-[calc(100vh-9rem)] lg:flex-row">
        {/* Products */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <ProductSearch
            products={products}
            currency={business.currency}
            cartQtyById={cartQtyById}
            onAdd={handleAdd}
          />
        </div>

        {/* Cart — desktop */}
        <div className="hidden w-[380px] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:flex">
          {cart}
        </div>
      </div>

      {/* Cart — mobile bottom bar */}
      <div className="fixed bottom-0 left-0 z-40 w-full border-t border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
        <button
          onClick={() => setCartOpen(true)}
          className="flex w-full items-center justify-between rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white"
        >
          <span>View cart ({totalQty})</span>
        </button>
      </div>

      {/* Cart — mobile sheet */}
      <Modal
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        className="m-4 max-h-[90vh] max-w-md overflow-hidden lg:hidden"
      >
        <div className="h-[80vh]">{cart}</div>
      </Modal>

      {/* Receipt */}
      <Modal
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        className="m-4 max-w-md"
      >
        {receipt && (
          <div className="max-h-[90vh] overflow-y-auto p-5">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-success-50 text-2xl dark:bg-success-500/15">
                ✓
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Sale completed
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatMoney(receipt.sale.grandTotal, business.currency)} ·{" "}
                {receipt.sale.receiptNumber}
              </p>
            </div>

            <ReceiptView
              business={business}
              sale={receipt.sale}
              items={receipt.items}
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  document.body.classList.add("print-receipt");
                  window.print();
                  document.body.classList.remove("print-receipt");
                }}
                className="rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Print / PDF
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                New Sale
              </button>
            </div>
            <Link
              to={`/sales/${receipt.sale.id}/receipt`}
              className="mt-3 block text-center text-sm text-brand-500 hover:text-brand-600"
            >
              Open full receipt
            </Link>
          </div>
        )}
      </Modal>
    </>
  );
}
