import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import Label from "../../components/form/Label";
import { getBusiness, resetData, updateBusiness } from "../../data/db";
import { toast } from "../../components/ui/toast";

const inputCls =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function BusinessSettings() {
  const business = getBusiness();
  const [name, setName] = useState(business.name);
  const [address, setAddress] = useState(business.address ?? "");
  const [phone, setPhone] = useState(business.phone ?? "");
  const [currency, setCurrency] = useState(business.currency);
  const [saving, setSaving] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    updateBusiness({ name, address, phone, currency: currency.toUpperCase() });
    toast.success("Business settings saved");
    setSaving(false);
  }

  function handleReset() {
    if (
      !window.confirm(
        "Reset all demo data (products, sales, users) to the original sample set? This cannot be undone.",
      )
    )
      return;
    resetData();
    toast.success("Demo data reset");
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <>
      <PageMeta title="Business Settings | BillPOS" description="Business settings" />
      <PageHeader
        title="Business Settings"
        description="Details shown on receipts and reports."
      />

      <form
        onSubmit={handleSave}
        className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Business name</Label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <input
              className={inputCls}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Currency code</Label>
            <input
              className={inputCls}
              value={currency}
              maxLength={5}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:bg-brand-300"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <div className="mt-6 max-w-2xl rounded-2xl border border-error-200 bg-error-50/40 p-6 dark:border-error-500/30 dark:bg-error-500/5">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          Reset demo data
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Restore the original sample products, cashiers, and sales. Useful for
          starting a fresh demo.
        </p>
        <button
          onClick={handleReset}
          className="mt-4 rounded-lg border border-error-300 bg-white px-4 py-2.5 text-sm font-medium text-error-600 transition hover:bg-error-50 dark:bg-transparent"
        >
          Reset to sample data
        </button>
      </div>
    </>
  );
}
