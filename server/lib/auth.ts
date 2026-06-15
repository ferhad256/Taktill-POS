import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { cashierSessions, cashiers, sessions, users } from "../db/schema";
import { AppError } from "./errors";

export interface Principal {
  kind: "user" | "cashier";
  id: string;
  name: string;
  role: "owner" | "manager" | "cashier";
  businessId: string;
  email?: string;
}

const USER_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const CASHIER_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}

// ── Owner / Manager (email + password) ─────────────────────────────
export function signInEmail(
  email: string,
  password: string,
): { token: string; principal: Principal } {
  const [user] = db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .all();
  if (!user || !bcrypt.compareSync(password, user.password)) {
    throw new AppError("INVALID_CREDENTIALS", 401);
  }

  const token = crypto.randomBytes(32).toString("hex");
  db.insert(sessions)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      token: sha256(token),
      expiresAt: new Date(Date.now() + USER_TTL_MS).toISOString(),
      createdAt: new Date().toISOString(),
    })
    .run();

  return {
    token,
    principal: {
      kind: "user",
      id: user.id,
      name: user.name,
      role: user.role as Principal["role"],
      businessId: user.businessId,
      email: user.email,
    },
  };
}

// ── Cashier (PIN) ──────────────────────────────────────────────────
export function cashierLogin(
  cashierId: string,
  pin: string,
): { token: string; principal: Principal } {
  const [cashier] = db.select().from(cashiers).where(eq(cashiers.id, cashierId)).all();
  if (!cashier || !cashier.isActive || !bcrypt.compareSync(pin, cashier.pinHash)) {
    throw new AppError("INVALID_CREDENTIALS", 401);
  }

  const token = crypto.randomBytes(32).toString("hex");
  db.insert(cashierSessions)
    .values({
      id: crypto.randomUUID(),
      cashierId: cashier.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + CASHIER_TTL_MS).toISOString(),
      createdAt: new Date().toISOString(),
    })
    .run();

  return {
    token,
    principal: {
      kind: "cashier",
      id: cashier.id,
      name: cashier.name,
      role: "cashier",
      businessId: cashier.businessId,
    },
  };
}

/**
 * Resolve a bearer token to a Principal. Checks the user `sessions` table
 * first, then `cashier_sessions` — the two are kept separate (PRD §3.1.2),
 * and role rank prevents a cashier token from reaching manager routes.
 */
export function resolvePrincipal(token?: string): Principal | null {
  if (!token) return null;
  const hash = sha256(token);
  const now = new Date();

  const [session] = db.select().from(sessions).where(eq(sessions.token, hash)).all();
  if (session) {
    if (new Date(session.expiresAt) < now) return null;
    const [user] = db.select().from(users).where(eq(users.id, session.userId)).all();
    if (!user) return null;
    return {
      kind: "user",
      id: user.id,
      name: user.name,
      role: user.role as Principal["role"],
      businessId: user.businessId,
      email: user.email,
    };
  }

  const [cs] = db
    .select()
    .from(cashierSessions)
    .where(eq(cashierSessions.tokenHash, hash))
    .all();
  if (cs) {
    if (new Date(cs.expiresAt) < now) return null;
    const [cashier] = db.select().from(cashiers).where(eq(cashiers.id, cs.cashierId)).all();
    if (!cashier || !cashier.isActive) return null;
    return {
      kind: "cashier",
      id: cashier.id,
      name: cashier.name,
      role: "cashier",
      businessId: cashier.businessId,
    };
  }

  return null;
}

export function logout(token?: string): void {
  if (!token) return;
  const hash = sha256(token);
  db.delete(sessions).where(eq(sessions.token, hash)).run();
  db.delete(cashierSessions).where(eq(cashierSessions.tokenHash, hash)).run();
}
