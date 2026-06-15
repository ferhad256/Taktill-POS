import type { Business, Sale, SaleItem } from "../../types";
import { formatMoney } from "../../lib/money";

/**
 * Printable receipt. The element carries id="receipt-print" so the print
 * stylesheet (index.css) can isolate it for browser print / save-as-PDF.
 */
export default function ReceiptView({
  business,
  sale,
  items,
}: {
  business: Business;
  sale: Sale;
  items: SaleItem[];
}) {
  const currency = business.currency;
  const fmtDate = new Date(sale.createdAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      id="receipt-print"
      className="mx-auto w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
    >
      <div className="text-center">
        <img
          src={business.logoUrl || "/logo.png"}
          alt={business.name}
          className="mx-auto mb-2 h-10 object-contain"
        />
        <h2 className="text-lg font-semibold">{business.name}</h2>
        {business.address && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {business.address}
          </p>
        )}
        {business.phone && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {business.phone}
          </p>
        )}
      </div>

      <div className="my-4 border-t border-dashed border-gray-300 dark:border-gray-700" />

      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
        <Row label="Receipt #" value={sale.receiptNumber} />
        <Row label="Date" value={fmtDate} />
        <Row label="Cashier" value={sale.cashierName} />
        <Row label="Payment" value={labelForPayment(sale.paymentMethod)} />
      </div>

      <div className="my-4 border-t border-dashed border-gray-300 dark:border-gray-700" />

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 text-center font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="align-top">
              <td className="py-1">
                <div>{it.productName}</div>
                <div className="text-xs text-gray-400">
                  {formatMoney(it.unitPrice, currency)}
                  {Number(it.discountAmount) > 0 && (
                    <> · −{formatMoney(it.discountAmount, currency)}</>
                  )}
                </div>
              </td>
              <td className="py-1 text-center">{it.quantity}</td>
              <td className="py-1 text-right">
                {formatMoney(it.lineTotal, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-4 border-t border-dashed border-gray-300 dark:border-gray-700" />

      <div className="space-y-1 text-sm">
        <Row label="Subtotal" value={formatMoney(sale.subtotal, currency)} />
        {Number(sale.totalDiscount) > 0 && (
          <Row
            label="Discount"
            value={`−${formatMoney(sale.totalDiscount, currency)}`}
          />
        )}
        <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 text-base font-semibold dark:border-gray-700">
          <span>Total</span>
          <span>{formatMoney(sale.grandTotal, currency)}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Thank you for shopping with us!
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-medium text-gray-700 dark:text-white/80">
        {value}
      </span>
    </div>
  );
}

function labelForPayment(m: Sale["paymentMethod"]): string {
  return (
    { cash: "Cash", mobile_money: "Mobile Money", card: "Card", other: "Other" }[
      m
    ] ?? m
  );
}
