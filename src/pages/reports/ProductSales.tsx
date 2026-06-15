import { useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import { getBusiness, getProductSales, listCategories } from "../../data/db";
import { formatMoney } from "../../lib/money";
import { PieChartIcon } from "../../icons";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ProductSales() {
  const business = useMemo(() => getBusiness(), []);
  const categories = useMemo(() => listCategories(), []);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(daysAgo(0));
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"units" | "revenue" | "name">("units");

  const rows = useMemo(
    () => getProductSales({ from, to, category, sort }),
    [from, to, category, sort],
  );

  const totals = useMemo(
    () => ({
      units: rows.reduce((acc, r) => acc + r.unitsSold, 0),
      revenue: rows.reduce((acc, r) => acc + Number(r.revenue), 0),
    }),
    [rows],
  );

  return (
    <>
      <PageMeta
        title="Product Sales | BillPOS"
        description="Product-level sales report"
      />
      <PageHeader
        title="Product Sales Report"
        description="Units sold and revenue per product over a date range."
        actions={
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5 print:hidden"
          >
            Export PDF
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3 print:hidden">
        <LabeledField label="From">
          <DateInput value={from} onChange={setFrom} />
        </LabeledField>
        <LabeledField label="To">
          <DateInput value={to} onChange={setTo} />
        </LabeledField>
        <LabeledField label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </LabeledField>
        <LabeledField label="Sort by">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-10 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="units">Units sold</option>
            <option value="revenue">Revenue</option>
            <option value="name">Product name</option>
          </select>
        </LabeledField>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {rows.length === 0 ? (
          <EmptyState
            icon={<PieChartIcon className="size-6" />}
            title="No sales in this range"
            description="Adjust the date range or category."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 text-center font-medium">Units</th>
                  <th className="px-4 py-3 text-right font-medium">Discount</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.productId}
                    className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                      {r.productName}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {r.productSku}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                      {r.unitsSold}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {formatMoney(r.discount, business.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(r.revenue, business.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90">
                  <td className="px-4 py-3" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-center">{totals.units}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right">
                    {formatMoney(totals.revenue, business.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      {children}
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    />
  );
}
