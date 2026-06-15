import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, resolveCashier, type Principal } from "../lib/auth.js";

const ROLE_RANK: Record<string, number> = { cashier: 0, manager: 1, owner: 2 };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

/**
 * Resolve the principal from a request:
 *  - Bearer token → cashier session (custom)
 *  - else Better Auth cookie session → owner/manager
 * Then enforce `minRole` (cashier < manager < owner).
 */
export function requireAuth(minRole: Principal["role"] = "cashier") {
  return async (req: Request, res: Response, next: NextFunction) => {
    let principal: Principal | null = null;

    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (bearer) principal = await resolveCashier(bearer);

    if (!principal) {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (session?.user) {
        const u = session.user as typeof session.user & {
          role?: string;
          businessId?: string;
        };
        principal = {
          kind: "user",
          id: u.id,
          name: u.name,
          role: (u.role as Principal["role"]) ?? "manager",
          businessId: u.businessId ?? "",
          email: u.email,
        };
      }
    }

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
