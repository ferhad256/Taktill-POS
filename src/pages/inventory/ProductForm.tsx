import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import Label from "../../components/form/Label";
import { createProduct, getProduct, updateProduct } from "../../data/db";
import { AppError } from "../../types";
import { toast } from "../../components/ui/toast";

interface FormState {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unitPrice: string;
  costPrice: string;
  stockQuantity: string;
  lowStockThreshold: string;
}

const empty: FormState = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  unitPrice: "",
  costPrice: "",
  stockQuantity: "0",
  lowStockThreshold: "5",
};

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const p = getProduct(id);
    if (!p) {
      setNotFound(true);
      return;
    }
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? "",
      category: p.category ?? "",
      unitPrice: p.unitPrice,
      costPrice: p.costPrice ?? "",
      stockQuantity: String(p.stockQuantity),
      lowStockThreshold: String(p.lowStockThreshold),
    });
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (form.unitPrice === "" || Number(form.unitPrice) < 0)
      next.unitPrice = "Enter a valid price";
    if (!isEdit && Number(form.stockQuantity) < 0)
      next.stockQuantity = "Stock cannot be negative";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && id) {
        updateProduct(id, {
          name: form.name,
          sku: form.sku || undefined,
          barcode: form.barcode || undefined,
          category: form.category || undefined,
          unitPrice: form.unitPrice,
          costPrice: form.costPrice || undefined,
          lowStockThreshold: Number(form.lowStockThreshold),
        });
        toast.success("Product updated");
      } else {
        createProduct({
          name: form.name,
          sku: form.sku || undefined,
          barcode: form.barcode || undefined,
          category: form.category || undefined,
          unitPrice: form.unitPrice,
          costPrice: form.costPrice || undefined,
          stockQuantity: Number(form.stockQuantity),
          lowStockThreshold: Number(form.lowStockThreshold),
        });
        toast.success("Product created");
      }
      navigate("/inventory");
    } catch (err) {
      if (err instanceof AppError && err.code === "DUPLICATE_SKU") {
        setErrors({ sku: "This SKU already exists" });
      } else {
        toast.error("Could not save the product.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-500 dark:text-gray-400">Product not found.</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`${isEdit ? "Edit" : "New"} Product | Taktill`}
        description="Product details"
      />
      <PageHeader
        title={isEdit ? "Edit Product" : "New Product"}
        description={
          isEdit
            ? "Update product details. Use Adjust Stock to change quantity."
            : "Add a new product to your catalogue."
        }
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Product name" required error={errors.name} className="sm:col-span-2">
            <TextInput
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder="e.g. Milk 1L"
            />
          </Field>

          <Field label="SKU" error={errors.sku} hint="Auto-generated if left blank">
            <TextInput
              value={form.sku}
              onChange={(v) => set("sku", v)}
              placeholder="e.g. BEV-001"
            />
          </Field>

          <Field label="Barcode">
            <TextInput
              value={form.barcode}
              onChange={(v) => set("barcode", v)}
              placeholder="Optional"
            />
          </Field>

          <Field label="Category">
            <TextInput
              value={form.category}
              onChange={(v) => set("category", v)}
              placeholder="e.g. Beverages"
            />
          </Field>

          <Field label="Selling price (UGX)" required error={errors.unitPrice}>
            <TextInput
              type="number"
              value={form.unitPrice}
              onChange={(v) => set("unitPrice", v)}
              placeholder="0"
            />
          </Field>

          <Field label="Cost price (UGX)" hint="Used for profit reports (optional)">
            <TextInput
              type="number"
              value={form.costPrice}
              onChange={(v) => set("costPrice", v)}
              placeholder="0"
            />
          </Field>

          <Field label="Low-stock threshold">
            <TextInput
              type="number"
              value={form.lowStockThreshold}
              onChange={(v) => set("lowStockThreshold", v)}
            />
          </Field>

          {!isEdit && (
            <Field
              label="Initial stock quantity"
              error={errors.stockQuantity}
            >
              <TextInput
                type="number"
                value={form.stockQuantity}
                onChange={(v) => set("stockQuantity", v)}
              />
            </Field>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/inventory")}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:bg-brand-300"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label>
        {label} {required && <span className="text-error-500">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-error-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    />
  );
}
