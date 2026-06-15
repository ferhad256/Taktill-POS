import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AuthLayout from "./AuthLayout";
import PageMeta from "../../components/common/PageMeta";
import { Logo } from "../../components/common/Logo";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { listCashiersForLogin } from "../../data/api";
import { AppError } from "../../types";
import { cn } from "../../lib/utils";

type Mode = "staff" | "cashier";

export default function Login() {
  const navigate = useNavigate();
  const { loginEmail, loginCashier, principal } = useAuth();
  const [mode, setMode] = useState<Mode>("staff");

  // Redirect away if already signed in.
  useEffect(() => {
    if (principal) {
      navigate(principal.role === "cashier" ? "/pos" : "/", { replace: true });
    }
  }, [principal, navigate]);

  return (
    <>
      <PageMeta title="Sign In | Taktill" description="Sign in to Taktill" />
      <AuthLayout>
        <div className="flex w-full flex-1 flex-col lg:w-1/2">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <div className="mb-6">
              <div className="mb-4 lg:hidden">
                <Logo className="h-9 dark:brightness-0 dark:invert" />
              </div>
              <h1 className="mb-1 text-title-sm font-semibold text-gray-800 dark:text-white/90">
                Welcome back
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sign in to continue to your point of sale.
              </p>
            </div>

            {/* Mode switch */}
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/5">
              <TabButton active={mode === "staff"} onClick={() => setMode("staff")}>
                Owner / Manager
              </TabButton>
              <TabButton
                active={mode === "cashier"}
                onClick={() => setMode("cashier")}
              >
                Cashier (PIN)
              </TabButton>
            </div>

            {mode === "staff" ? (
              <StaffLogin onSubmit={loginEmail} />
            ) : (
              <CashierLogin onSubmit={loginCashier} />
            )}
          </div>
        </div>
      </AuthLayout>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-white text-gray-800 shadow-theme-xs dark:bg-gray-800 dark:text-white/90"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
      )}
    >
      {children}
    </button>
  );
}

function StaffLogin({
  onSubmit,
}: {
  onSubmit: (email: string, password: string) => Promise<unknown>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(
        err instanceof AppError && err.code === "INVALID_CREDENTIALS"
          ? "Invalid email or password."
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label>
          Email <span className="text-error-500">*</span>
        </Label>
        <Input
          type="email"
          placeholder="owner@taktill.app"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label>
          Password <span className="text-error-500">*</span>
        </Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
          >
            {showPassword ? (
              <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
            ) : (
              <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
            )}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      <Button className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
        <p className="mb-1 font-medium text-gray-600 dark:text-gray-300">
          Demo accounts
        </p>
        <p>Owner — owner@taktill.app / owner1234</p>
        <p>Manager — manager@taktill.app / manager1234</p>
      </div>
    </form>
  );
}

function CashierLogin({
  onSubmit,
}: {
  onSubmit: (cashierId: string, pin: string) => Promise<unknown>;
}) {
  const [cashiers, setCashiers] = useState<{ id: string; name: string }[]>([]);
  const [cashierId, setCashierId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listCashiersForLogin()
      .then((active) => {
        setCashiers(active);
        if (active[0]) setCashierId(active[0].id);
      })
      .catch(() => setCashiers([]));
  }, []);

  function pressDigit(digit: string) {
    setError("");
    setPin((p) => (p.length >= 4 ? p : p + digit));
  }

  async function submit(finalPin: string) {
    if (!cashierId || finalPin.length !== 4) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(cashierId, finalPin);
    } catch {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pin.length === 4) submit(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="space-y-5">
      <div>
        <Label>Select cashier</Label>
        <select
          value={cashierId}
          onChange={(e) => {
            setCashierId(e.target.value);
            setPin("");
            setError("");
          }}
          className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {cashiers.length === 0 && <option value="">No cashiers found</option>}
          {cashiers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Enter 4-digit PIN</Label>
        <div className="mb-4 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "flex size-12 items-center justify-center rounded-xl border text-xl font-semibold",
                pin.length > i
                  ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15"
                  : "border-gray-300 text-gray-400 dark:border-gray-700",
              )}
            >
              {pin.length > i ? "•" : ""}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <PinKey key={n} onClick={() => pressDigit(n)} disabled={loading}>
              {n}
            </PinKey>
          ))}
          <PinKey onClick={() => setPin("")} disabled={loading}>
            C
          </PinKey>
          <PinKey onClick={() => pressDigit("0")} disabled={loading}>
            0
          </PinKey>
          <PinKey onClick={() => setPin((p) => p.slice(0, -1))} disabled={loading}>
            ⌫
          </PinKey>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-center text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
        <p className="mb-1 font-medium text-gray-600 dark:text-gray-300">
          Demo PINs
        </p>
        <p>Brenda Nakato — 1234 · Joseph Okello — 5678</p>
      </div>
    </div>
  );
}

function PinKey({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-lg font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:hover:bg-white/5"
    >
      {children}
    </button>
  );
}
