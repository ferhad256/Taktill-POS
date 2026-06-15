import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import { getBusiness, getDailySummary } from "../../data/db";
import { formatMoney } from "../../lib/money";
import { useTheme } from "../../context/ThemeContext";
import { PieChartIcon } from "../../icons";

export default function DailySummary() {
  const business = useMemo(() => getBusiness(), []);
  const { theme } = useTheme();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const summary = useMemo(() => getDailySummary(date), [date]);

  const chartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "Outfit, sans-serif" },
    colors: ["#465fff"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "60%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: theme === "dark" ? "#1d2939" : "#f2f4f7" },
    xaxis: {
      categories: summary.byHour.map((h) => `${h.hour}:00`),
      tickAmount: 12,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: 0, hideOverlappingLabels: true },
    },
    tooltip: { y: { formatter: (v) => `${v} sale(s)` } },
  };

  return (
    <>
      <PageMeta title="Daily Summary | Taktill" description="Daily sales report" />
      <PageHeader
        title="Daily Sales Summary"
        description="Sales performance for a single day."
        actions={
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5 print:hidden"
          >
            Export PDF
          </button>
        }
      />

      <div className="mb-6 print:hidden">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric label="Total Sales" value={String(summary.totalSales)} />
        <Metric
          label="Total Revenue"
          value={formatMoney(summary.totalRevenue, business.currency)}
        />
        <Metric
          label="Total Discount"
          value={formatMoney(summary.totalDiscount, business.currency)}
        />
        <Metric
          label="Average Sale"
          value={formatMoney(summary.averageSale, business.currency)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">
            Sales by hour
          </h3>
          <Chart
            options={chartOptions}
            series={[{ name: "Sales", data: summary.byHour.map((h) => h.count) }]}
            type="bar"
            height={260}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">
            Breakdown by cashier
          </h3>
          {summary.byCashier.length === 0 ? (
            <EmptyState
              icon={<PieChartIcon className="size-6" />}
              title="No sales on this day"
            />
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="py-2 font-medium">Cashier</th>
                  <th className="py-2 text-center font-medium">Sales</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {summary.byCashier.map((c) => (
                  <tr
                    key={c.cashierId}
                    className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
                  >
                    <td className="py-2.5 text-gray-800 dark:text-white/90">
                      {c.cashierName}
                    </td>
                    <td className="py-2.5 text-center text-gray-600 dark:text-gray-400">
                      {c.count}
                    </td>
                    <td className="py-2.5 text-right font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(c.revenue, business.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}
