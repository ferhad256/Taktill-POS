import { useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/badge/Badge";
import Label from "../../components/form/Label";
import { Modal } from "../../components/ui/modal";
import {
  addCashier,
  addUser,
  listCashiers,
  listUsers,
  removeUser,
  setCashierActive,
} from "../../data/db";
import { AppError } from "../../types";
import { toast } from "../../components/ui/toast";
import { PlusIcon, TrashBinIcon } from "../../icons";

export default function Users() {
  const [version, setVersion] = useState(0);
  const users = useMemo(() => listUsers(), [version]);
  const cashiers = useMemo(() => listCashiers(), [version]);
  const [staffModal, setStaffModal] = useState(false);
  const [cashierModal, setCashierModal] = useState(false);

  const refresh = () => setVersion((v) => v + 1);

  function handleRemoveUser(id: string, name: string) {
    if (!window.confirm(`Remove ${name}?`)) return;
    try {
      removeUser(id);
      toast.success("User removed");
      refresh();
    } catch (err) {
      if (err instanceof AppError && err.code === "CANNOT_REMOVE_OWNER") {
        toast.error("The owner account cannot be removed.");
      } else {
        toast.error("Could not remove user.");
      }
    }
  }

  return (
    <>
      <PageMeta title="Users | Taktill" description="Manage staff and cashiers" />
      <PageHeader
        title="Users & Cashiers"
        description="Manage who can access Taktill and process sales."
      />

      {/* Staff */}
      <Section
        title="Staff (Owner / Manager)"
        description="Email + password login. Full or partial admin access."
        action={
          <AddButton onClick={() => setStaffModal(true)}>Add manager</AddButton>
        }
      >
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400 dark:border-gray-800">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
              >
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                  {u.name}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {u.email}
                </td>
                <td className="px-4 py-3">
                  <Badge color={u.role === "owner" ? "primary" : "info"} size="sm">
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveUser(u.id, u.name)}
                      className="text-gray-400 transition hover:text-error-500"
                      title="Remove"
                    >
                      <TrashBinIcon className="size-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Cashiers */}
      <Section
        title="Cashiers"
        description="4-digit PIN login. POS access only."
        action={
          <AddButton onClick={() => setCashierModal(true)}>Add cashier</AddButton>
        }
      >
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400 dark:border-gray-800">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cashiers.map((c) => (
              <tr
                key={c.id}
                className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
              >
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                  {c.name}
                </td>
                <td className="px-4 py-3">
                  <Badge color={c.isActive ? "success" : "light"} size="sm">
                    {c.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setCashierActive(c.id, !c.isActive);
                      refresh();
                    }}
                    className="text-sm font-medium text-brand-500 hover:text-brand-600"
                  >
                    {c.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {staffModal && (
        <AddStaffModal
          onClose={() => setStaffModal(false)}
          onDone={refresh}
        />
      )}
      {cashierModal && (
        <AddCashierModal
          onClose={() => setCashierModal(false)}
          onDone={refresh}
        />
      )}
    </>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
    >
      <PlusIcon className="size-4" /> {children}
    </button>
  );
}

function ModalField({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function AddStaffModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function save() {
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("All fields required; password ≥ 8 characters.");
      return;
    }
    try {
      addUser({ name, email, password, role: "manager" });
      toast.success("Manager added");
      onDone();
      onClose();
    } catch (err) {
      setError(
        err instanceof AppError && err.code === "EMAIL_IN_USE"
          ? "That email is already in use."
          : "Could not add user.",
      );
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 w-full max-w-md p-6">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Add manager
      </h3>
      <div className="space-y-4">
        <ModalField label="Full name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </ModalField>
        <ModalField label="Email">
          <input
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </ModalField>
        <ModalField label="Password" error={error}>
          <input
            type="password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </ModalField>
      </div>
      <ModalActions onClose={onClose} onSave={save} />
    </Modal>
  );
}

function AddCashierModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    try {
      addCashier({ name, pin });
      toast.success("Cashier added");
      onDone();
      onClose();
    } catch {
      setError("PIN must be exactly 4 digits.");
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 w-full max-w-md p-6">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Add cashier
      </h3>
      <div className="space-y-4">
        <ModalField label="Full name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </ModalField>
        <ModalField label="4-digit PIN" error={error}>
          <input
            inputMode="numeric"
            maxLength={4}
            className={inputCls}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 1234"
          />
        </ModalField>
      </div>
      <ModalActions onClose={onClose} onSave={save} />
    </Modal>
  );
}

function ModalActions({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        onClick={onClose}
        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
      >
        Save
      </button>
    </div>
  );
}
