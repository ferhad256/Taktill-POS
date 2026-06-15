import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { cashiers } from "../db/schema";
import { cashierLogin, logout } from "../lib/auth";
import { AppError } from "../lib/errors";

export const cashierAuthRouter = Router();

/** Public — names for the login screen's cashier picker (no PIN hashes). */
cashierAuthRouter.get("/list", (_req, res) => {
  const rows = db
    .select({ id: cashiers.id, name: cashiers.name })
    .from(cashiers)
    .where(eq(cashiers.isActive, true))
    .all();
  res.json({ success: true, data: rows });
});

cashierAuthRouter.post("/login", (req, res) => {
  const { cashierId, pin } = req.body ?? {};
  if (!cashierId || !/^\d{4}$/.test(String(pin ?? ""))) {
    throw new AppError("INVALID_CREDENTIALS", 401);
  }
  const { token, principal } = cashierLogin(cashierId, pin);
  res.json({ success: true, data: { token, principal } });
});

cashierAuthRouter.post("/logout", (req, res) => {
  logout(req.headers.authorization?.replace(/^Bearer\s+/i, ""));
  res.json({ success: true });
});
