import { useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/badge/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";
import { getBusiness, listCashiers, listSales } from "../../data/api";
import { useAsync } from "../../hooks/useAsync";
import { formatMoney } from "../../lib/money";
import { DocsIcon } from "../../icons";
import type { PaymentMethod } from "../../types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  card: "Card",
  other: "Other",
};

export default function Sales() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashierId, setCashierId] = useState("all");

  const businessQuery = useAsync(getBusiness, []);
  const cashiersQuery = useAsync(listCashiers, []);
  const salesQuery = useAsync(
    () => listSales({ date: date || undefined, cashierId }),
    [date, cashierId],
  );

  const business = businessQuery.data;
  const cashiers = cashiersQuery.data ?? [];
  const sales = salesQuery.data ?? [];
  const total = sales.reduce((acc, s) => acc + Number(s.grandTotal), 0);

  if (!business) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-500">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Transactions | Taktill" description="All sales" />
      <PageHeader
        title="Transactions"
        description="Browse and review completed sales."
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
            <select
              value={cashierId}
              onChange={(e) => setCashierId(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">All cashiers</option>
              {cashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {sales.length} sale{sales.length === 1 ? "" : "s"} ·{" "}
            <span className="font-semibold text-gray-800 dark:text-white/90">
              {formatMoney(total, business.currency)}
            </span>
          </div>
        </div>

        {sales.length === 0 ? (
          <EmptyState
            icon={<DocsIcon className="size-6" />}
            title="No sales found"
            description="Try a different date or cashier."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium">Date &amp; time</th>
                  <th className="px-4 py-3 font-medium">Cashier</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/sales/${s.id}/receipt`}
                        className="font-medium text-brand-500 hover:text-brand-600"
                      >
                        {s.receiptNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(s.createdAt).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {s.cashierName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="light" color="light" size="sm">
                        {PAYMENT_LABELS[s.paymentMethod]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(s.grandTotal, business.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
