import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { cashiers } from "../db/schema.js";
import { cashierLogin, logoutCashier, resolveCashier } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";

export const cashierAuthRouter = Router();

function bearer(req: { headers: { authorization?: string } }) {
  return req.headers.authorization?.replace(/^Bearer\s+/i, "");
}

/** Public — names for the login screen's cashier picker (no PIN hashes). */
cashierAuthRouter.get("/list", async (_req, res) => {
  const rows = await db
    .select({ id: cashiers.id, name: cashiers.name })
    .from(cashiers)
    .where(eq(cashiers.isActive, true));
  res.json({ success: true, data: rows });
});

cashierAuthRouter.post("/login", async (req, res) => {
  const { cashierId, pin } = req.body ?? {};
  if (!cashierId || !/^\d{4}$/.test(String(pin ?? ""))) {
    throw new AppError("INVALID_CREDENTIALS", 401);
  }
  const { token, principal } = await cashierLogin(cashierId, pin);
  res.json({ success: true, data: { token, principal } });
});

cashierAuthRouter.get("/me", async (req, res) => {
  const principal = await resolveCashier(bearer(req));
  res.json({ success: true, data: principal });
});

cashierAuthRouter.post("/logout", async (req, res) => {
  await logoutCashier(bearer(req));
  res.json({ success: true });
});
