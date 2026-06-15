import { Navigate, useLocation } from "react-router";
import type { Role } from "../../types";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";

/**
 * Route guard. Waits for session restore, then redirects unauthenticated
 * users to /login and users below `minRole` to a screen they can see.
 */
export default function RequireAuth({
  minRole,
  children,
}: {
  minRole?: Role;
  children: React.ReactNode;
}) {
  const { principal, loading, hasMinRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-brand-500">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!principal) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (minRole && !hasMinRole(minRole)) {
    return <Navigate to={principal.role === "cashier" ? "/pos" : "/"} replace />;
  }

  return <>{children}</>;
}
