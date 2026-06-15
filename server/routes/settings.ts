import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  businesses,
  cashierSessions,
  cashiers,
  products,
  saleItems,
  sales,
  sessions,
  stockAdjustments,
  users,
} from "../db/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { hashPassword } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";
import { seedIfEmpty } from "../seed.js";

export const settingsRouter = Router();

// ── Business ───────────────────────────────────────────────────────
settingsRouter.get("/business", requireAuth(), async (req: any, res) => {
  const rows = await db.select().from(businesses).where(eq(businesses.id, req.principal.businessId));
  const [business] = rows;
  res.json({ success: true, data: business });
});

settingsRouter.put("/business", requireAuth("owner"), async (req: any, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    currency: z.string().max(5).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  await db.update(businesses).set(parsed.data).where(eq(businesses.id, req.principal.businessId));
  const rows = await db.select().from(businesses).where(eq(businesses.id, req.principal.businessId));
  const [business] = rows;
  res.json({ success: true, data: business });
});

settingsRouter.post("/business/reset", requireAuth("owner"), async (_req, res) => {
  for (const t of [
    saleItems,
    sales,
    stockAdjustments,
    products,
    cashierSessions,
    cashiers,
    sessions,
    users,
    businesses,
  ]) {
    await db.delete(t);
  }
  seedIfEmpty();
  res.json({ success: true });
});

// ── Users (Owner) ──────────────────────────────────────────────────
settingsRouter.get("/users", requireAuth("owner"), async (req: any, res) => {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.businessId, req.principal.businessId));
  res.json({ success: true, data: rows });
});

settingsRouter.post("/users", requireAuth("owner"), async (req: any, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  const email = parsed.data.email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length) {
    throw new AppError("EMAIL_IN_USE", 409);
  }
  const user = {
    id: crypto.randomUUID(),
    businessId: req.principal.businessId,
    name: parsed.data.name.trim(),
    email,
    password: hashPassword(parsed.data.password),
    role: "manager",
  };
  await db.insert(users).values(user as any);
  res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

settingsRouter.delete("/users/:id", requireAuth("owner"), async (req, res) => {
  const existing = await db.select().from(users).where(eq(users.id, String(req.params.id)));
  const [target] = existing;
  if (target?.role === "owner") throw new AppError("CANNOT_REMOVE_OWNER", 403);
  await db.delete(users).where(eq(users.id, String(req.params.id)));
  res.json({ success: true });
});

// ── Cashiers ───────────────────────────────────────────────────────
settingsRouter.get("/cashiers", requireAuth("manager"), async (req: any, res) => {
  const rows = await db
    .select({ id: cashiers.id, name: cashiers.name, isActive: cashiers.isActive, createdAt: cashiers.createdAt })
    .from(cashiers)
    .where(eq(cashiers.businessId, req.principal.businessId));
  res.json({ success: true, data: rows });
});

settingsRouter.post("/cashiers", requireAuth("owner"), async (req: any, res) => {
  const schema = z.object({ name: z.string().min(1), pin: z.string().regex(/^\d{4}$/) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, "PIN must be 4 digits");
  const cashier = {
    id: crypto.randomUUID(),
    businessId: req.principal.businessId,
    name: parsed.data.name.trim(),
    pinHash: bcrypt.hashSync(parsed.data.pin, 12),
    isActive: true,
    createdAt: new Date(),
  };
  await db.insert(cashiers).values(cashier);
  res.status(201).json({ success: true, data: { id: cashier.id, name: cashier.name, isActive: true } });
});

settingsRouter.patch("/cashiers/:id", requireAuth("owner"), async (req, res) => {
  const schema = z.object({ isActive: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  await db.update(cashiers).set({ isActive: parsed.data.isActive }).where(eq(cashiers.id, String(req.params.id)));
  res.json({ success: true });
});
