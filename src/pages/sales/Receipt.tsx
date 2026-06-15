import { Link, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import ReceiptView from "../../components/pos/ReceiptView";
import Spinner from "../../components/ui/Spinner";
import { getBusiness, getSaleWithItems } from "../../data/api";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { AppError } from "../../types";
import { ChevronLeftIcon } from "../../icons";

export default function Receipt() {
  const { id } = useParams();
  const { principal } = useAuth();
  const businessQuery = useAsync(getBusiness, []);
  const saleQuery = useAsync(() => getSaleWithItems(id as string), [id]);

  const business = businessQuery.data;
  const data = saleQuery.data;

  if (saleQuery.loading || businessQuery.loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-500">
        <Spinner size="lg" />
      </div>
    );
  }

  if (saleQuery.error || !data || !business) {
    const forbidden =
      saleQuery.error instanceof AppError && saleQuery.error.code === "FORBIDDEN";
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-500 dark:text-gray-400">
          {forbidden ? "You can only view your own receipts." : "Receipt not found."}
        </p>
        <Link
          to={principal?.role === "cashier" ? "/pos" : "/sales"}
          className="mt-3 inline-block text-sm text-brand-500"
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`Receipt ${data.sale.receiptNumber} | Taktill`}
        description="Sale receipt"
      />
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Link
          to={principal?.role === "cashier" ? "/pos" : "/sales"}
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-700 dark:text-gray-400"
        >
          <ChevronLeftIcon className="size-5" /> Back
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Print / Save PDF
        </button>
      </div>

      <ReceiptView business={business} sale={data.sale} items={data.items} />
    </>
  );
}
