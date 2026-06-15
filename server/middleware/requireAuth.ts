import type { NextFunction, Request, Response } from "express";
import { resolvePrincipal, type Principal } from "../lib/auth";

const ROLE_RANK: Record<string, number> = { cashier: 0, manager: 1, owner: 2 };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

function tokenFrom(req: Request): string | undefined {
  return req.headers.authorization?.replace(/^Bearer\s+/i, "");
}

/**
 * Auth + role gate. `minRole` defaults to 'cashier' (any authenticated user).
 * Cashier tokens resolve to role 'cashier' (rank 0), so requireAuth('manager')
 * rejects them — keeping cashier sessions out of management routes.
 */
export function requireAuth(minRole: Principal["role"] = "cashier") {
  return (req: Request, res: Response, next: NextFunction) => {
    const principal = resolvePrincipal(tokenFrom(req));
    if (!principal) {
      return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
    }
    if (ROLE_RANK[principal.role] < ROLE_RANK[minRole]) {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }
    req.principal = principal;
    next();
  };
}
