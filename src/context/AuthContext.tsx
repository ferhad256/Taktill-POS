import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Principal, Role } from "../types";
import {
  cashierLoginApi,
  getSession,
  signInEmail,
  signOut,
} from "../data/api";
import {
  clearToken,
  getToken,
  setCashierToken,
} from "../lib/auth-client";

const ROLE_RANK: Record<Role, number> = { cashier: 0, manager: 1, owner: 2 };

interface AuthContextValue {
  principal: Principal | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<Principal>;
  loginCashier: (cashierId: string, pin: string) => Promise<Principal>;
  logout: () => void;
  hasMinRole: (min: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from the stored token on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const p = await getSession();
        if (!cancelled) setPrincipal(p);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      principal,
      loading,
      async loginEmail(email, password) {
        const { principal: p } = await signInEmail(email, password);
        clearToken(); // Clear any existing cashier token
        setPrincipal(p);
        return p;
      },
      async loginCashier(cashierId, pin) {
        const { token, principal: p } = await cashierLoginApi(cashierId, pin);
        setCashierToken(token);
        setPrincipal(p);
        return p;
      },
      logout() {
        void signOut();
        clearToken();
        setPrincipal(null);
      },
      hasMinRole(min) {
        if (!principal) return false;
        return ROLE_RANK[principal.role] >= ROLE_RANK[min];
      },
    }),
    [principal, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
