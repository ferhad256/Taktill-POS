import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Principal, Role } from "../types";
import {
  cashierLogin,
  ensureSeeded,
  getBusiness,
  signInEmail,
} from "../data/db";

const USER_KEY = "taktill:session"; // owner/manager — persists across tabs
const CASHIER_KEY = "taktill:cashier-session"; // cashier — clears on tab close

const ROLE_RANK: Record<Role, number> = { cashier: 0, manager: 1, owner: 2 };

interface AuthContextValue {
  principal: Principal | null;
  loginEmail: (email: string, password: string) => Promise<Principal>;
  loginCashier: (cashierId: string, pin: string) => Promise<Principal>;
  logout: () => void;
  hasMinRole: (min: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadPrincipal(): Principal | null {
  try {
    const cashier = sessionStorage.getItem(CASHIER_KEY);
    if (cashier) return JSON.parse(cashier) as Principal;
    const user = localStorage.getItem(USER_KEY);
    if (user) return JSON.parse(user) as Principal;
  } catch {
    /* ignore */
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [principal, setPrincipal] = useState<Principal | null>(null);

  useEffect(() => {
    ensureSeeded();
    setPrincipal(loadPrincipal());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      principal,
      async loginEmail(email, password) {
        const user = signInEmail(email, password);
        const p: Principal = {
          kind: "user",
          id: user.id,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
          email: user.email,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(p));
        sessionStorage.removeItem(CASHIER_KEY);
        setPrincipal(p);
        return p;
      },
      async loginCashier(cashierId, pin) {
        const cashier = cashierLogin(cashierId, pin);
        const p: Principal = {
          kind: "cashier",
          id: cashier.id,
          name: cashier.name,
          role: "cashier",
          businessId: cashier.businessId,
        };
        sessionStorage.setItem(CASHIER_KEY, JSON.stringify(p));
        localStorage.removeItem(USER_KEY);
        setPrincipal(p);
        return p;
      },
      logout() {
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(CASHIER_KEY);
        setPrincipal(null);
      },
      hasMinRole(min) {
        if (!principal) return false;
        return ROLE_RANK[principal.role] >= ROLE_RANK[min];
      },
    }),
    [principal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBusiness() {
  return getBusiness();
}
