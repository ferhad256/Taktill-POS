import { Navigate, useLocation } from "react-router";
import type { Role } from "../../types";
import { useAuth } from "../../context/AuthContext";

/**
 * Route guard. Redirects unauthenticated users to /login and users whose role
 * is below `minRole` to a screen they're allowed to see.
 */
export default function RequireAuth({
  minRole,
  children,
}: {
  minRole?: Role;
  children: React.ReactNode;
}) {
  const { principal, hasMinRole } = useAuth();
  const location = useLocation();

  if (!principal) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (minRole && !hasMinRole(minRole)) {
    // Cashiers only have the POS; everyone else falls back to the dashboard.
    return <Navigate to={principal.role === "cashier" ? "/pos" : "/"} replace />;
  }

  return <>{children}</>;
}
