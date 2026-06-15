import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
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
} from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { hashPassword } from "../lib/auth";
import { AppError } from "../lib/errors";
import { seedIfEmpty } from "../seed";

export const settingsRouter = Router();

// ── Business ───────────────────────────────────────────────────────
settingsRouter.get("/business", requireAuth(), (req: any, res) => {
  const [business] = db.select().from(businesses).where(eq(businesses.id, req.principal.businessId)).all();
  res.json({ success: true, data: business });
});

settingsRouter.put("/business", requireAuth("owner"), (req: any, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    currency: z.string().max(5).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  db.update(businesses).set(parsed.data).where(eq(businesses.id, req.principal.businessId)).run();
  const [business] = db.select().from(businesses).where(eq(businesses.id, req.principal.businessId)).all();
  res.json({ success: true, data: business });
});

settingsRouter.post("/business/reset", requireAuth("owner"), (_req, res) => {
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
    db.delete(t).run();
  }
  seedIfEmpty();
  res.json({ success: true });
});

// ── Users (Owner) ──────────────────────────────────────────────────
settingsRouter.get("/users", requireAuth("owner"), (req: any, res) => {
  const rows = db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.businessId, req.principal.businessId))
    .all();
  res.json({ success: true, data: rows });
});

settingsRouter.post("/users", requireAuth("owner"), (req: any, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  const email = parsed.data.email.trim().toLowerCase();
  if (db.select().from(users).where(eq(users.email, email)).all().length) {
    throw new AppError("EMAIL_IN_USE", 409);
  }
  const user = {
    id: crypto.randomUUID(),
    businessId: req.principal.businessId,
    name: parsed.data.name.trim(),
    email,
    password: hashPassword(parsed.data.password),
    role: "manager",
    createdAt: new Date().toISOString(),
  };
  db.insert(users).values(user).run();
  res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

settingsRouter.delete("/users/:id", requireAuth("owner"), (req, res) => {
  const [target] = db.select().from(users).where(eq(users.id, String(req.params.id))).all();
  if (target?.role === "owner") throw new AppError("CANNOT_REMOVE_OWNER", 403);
  db.delete(users).where(eq(users.id, String(req.params.id))).run();
  res.json({ success: true });
});

// ── Cashiers ───────────────────────────────────────────────────────
settingsRouter.get("/cashiers", requireAuth("manager"), (req: any, res) => {
  const rows = db
    .select({ id: cashiers.id, name: cashiers.name, isActive: cashiers.isActive, createdAt: cashiers.createdAt })
    .from(cashiers)
    .where(eq(cashiers.businessId, req.principal.businessId))
    .all();
  res.json({ success: true, data: rows });
});

settingsRouter.post("/cashiers", requireAuth("owner"), (req: any, res) => {
  const schema = z.object({ name: z.string().min(1), pin: z.string().regex(/^\d{4}$/) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, "PIN must be 4 digits");
  const cashier = {
    id: crypto.randomUUID(),
    businessId: req.principal.businessId,
    name: parsed.data.name.trim(),
    pinHash: bcrypt.hashSync(parsed.data.pin, 12),
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.insert(cashiers).values(cashier).run();
  res.status(201).json({ success: true, data: { id: cashier.id, name: cashier.name, isActive: true } });
});

settingsRouter.patch("/cashiers/:id", requireAuth("owner"), (req, res) => {
  const schema = z.object({ isActive: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  db.update(cashiers).set({ isActive: parsed.data.isActive }).where(eq(cashiers.id, String(req.params.id))).run();
  res.json({ success: true });
});
