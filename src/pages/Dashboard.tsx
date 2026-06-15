import { useMemo } from "react";
import { Link } from "react-router";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/badge/Badge";
import {
  getBusiness,
  getDashboardStats,
  listProducts,
  listSales,
} from "../data/db";
import { formatMoney, d } from "../lib/money";
import {
  BoxIconLine,
  DollarLineIcon,
  GroupIcon,
  AlertHexaIcon,
} from "../icons";
import { useTheme } from "../context/ThemeContext";

export default function Dashboard() {
  const business = useMemo(() => getBusiness(), []);
  const stats = useMemo(() => getDashboardStats(), []);
  const { theme } = useTheme();

  const recentSales = useMemo(() => listSales().slice(0, 6), []);
  const lowStock = useMemo(
    () =>
      listProducts({ activeOnly: true })
        .filter((p) => p.stockQuantity <= p.lowStockThreshold)
        .sort((a, b) => a.stockQuantity - b.stockQuantity)
        .slice(0, 6),
    [],
  );

  const last7 = useMemo(() => {
    const days: { label: string; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      days.push({
        label: dt.toLocaleDateString("en-GB", { weekday: "short" }),
        date: dt.toISOString().slice(0, 10),
      });
    }
    return days.map((day) => {
      const total = listSales({ date: day.date }).reduce(
        (acc, s) => acc.plus(s.grandTotal),
        d(0),
      );
      return { label: day.label, value: total.toNumber() };
    });
  }, []);

  const chartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "Outfit, sans-serif" },
    colors: ["#465fff"],
    plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: theme === "dark" ? "#1d2939" : "#f2f4f7" },
    xaxis: {
      categories: last7.map((d) => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`),
      },
    },
    tooltip: { y: { formatter: (v) => formatMoney(v, business.currency) } },
  };

  return (
    <>
      <PageMeta title="Dashboard | BillPOS" description="Business overview" />
      <PageHeader
        title={`Welcome, ${business.name}`}
        description="Here's what's happening in your shop today."
        actions={
          <Link
            to="/pos"
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            New Sale
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<DollarLineIcon className="size-5" />}
          label="Today's Revenue"
          value={formatMoney(stats.todayRevenue, business.currency)}
        />
        <StatCard
          icon={<GroupIcon className="size-5" />}
          label="Today's Sales"
          value={String(stats.todaySales)}
        />
        <StatCard
          icon={<BoxIconLine className="size-5" />}
          label="Active Products"
          value={String(stats.productCount)}
        />
        <StatCard
          icon={<AlertHexaIcon className="size-5" />}
          label="Low Stock Items"
          value={String(stats.lowStockCount)}
          warning={stats.lowStockCount > 0}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
          <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">
            Revenue — last 7 days
          </h3>
          <Chart
            options={chartOptions}
            series={[{ name: "Revenue", data: last7.map((d) => d.value) }]}
            type="bar"
            height={260}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Low Stock
            </h3>
            <Link to="/inventory" className="text-sm text-brand-500">
              View all
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Everything is well stocked. 🎉
            </p>
          ) : (
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                  </div>
                  <Badge color={p.stockQuantity === 0 ? "error" : "warning"}>
                    {p.stockQuantity} left
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Recent Sales
          </h3>
          <Link to="/sales" className="text-sm text-brand-500">
            View all
          </Link>
        </div>
        {recentSales.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No sales yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 dark:border-gray-800">
                  <th className="py-2 font-medium">Receipt</th>
                  <th className="py-2 font-medium">Cashier</th>
                  <th className="py-2 font-medium">Time</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
                  >
                    <td className="py-2.5">
                      <Link
                        to={`/sales/${s.id}/receipt`}
                        className="font-medium text-brand-500 hover:text-brand-600"
                      >
                        {s.receiptNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 text-gray-600 dark:text-gray-400">
                      {s.cashierName}
                    </td>
                    <td className="py-2.5 text-gray-600 dark:text-gray-400">
                      {new Date(s.createdAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 text-right font-medium text-gray-800 dark:text-white/90">
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

function StatCard({
  icon,
  label,
  value,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div
        className={`flex size-11 items-center justify-center rounded-xl ${
          warning
            ? "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400"
            : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
        }`}
      >
        {icon}
      </div>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}
