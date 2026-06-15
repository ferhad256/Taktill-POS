import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "../db/schema";
import { cashierSessions, cashiers } from "../db/schema";
import { AppError } from "./errors";

// ── Better Auth (Owner / Manager email + password) ─────────────────
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-insecure-secret-change-me",
  baseURL: process.env.APP_URL ?? "http://localhost:5173",
  basePath: "/api/auth",
  trustedOrigins: [process.env.APP_URL ?? "http://localhost:5173"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 8, // 8 hours
    updateAge: 60 * 60, // refresh every hour
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "manager",
        input: true,
      },
      businessId: { type: "string", required: false, input: true },
    },
  },
});

// ── Unified principal used across the app ──────────────────────────
export interface Principal {
  kind: "user" | "cashier";
  id: string;
  name: string;
  role: "owner" | "manager" | "cashier";
  businessId: string;
  email?: string;
}

const CASHIER_TTL_MS = 12 * 60 * 60 * 1000;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ── Cashier PIN auth (custom — outside Better Auth, PRD §3.1.2) ─────
export async function cashierLogin(
  cashierId: string,
  pin: string,
): Promise<{ token: string; principal: Principal }> {
  const [cashier] = await db
    .select()
    .from(cashiers)
    .where(eq(cashiers.id, cashierId));
  if (!cashier || !cashier.isActive || !bcrypt.compareSync(pin, cashier.pinHash)) {
    throw new AppError("INVALID_CREDENTIALS", 401);
  }

  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(cashierSessions).values({
    cashierId: cashier.id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + CASHIER_TTL_MS).toISOString(),
    createdAt: new Date().toISOString(),
  });

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

export async function resolveCashier(token?: string): Promise<Principal | null> {
  if (!token) return null;
  const [cs] = await db
    .select()
    .from(cashierSessions)
    .where(eq(cashierSessions.tokenHash, sha256(token)));
  if (!cs || new Date(cs.expiresAt) < new Date()) return null;
  const [cashier] = await db
    .select()
    .from(cashiers)
    .where(eq(cashiers.id, cs.cashierId));
  if (!cashier || !cashier.isActive) return null;
  return {
    kind: "cashier",
    id: cashier.id,
    name: cashier.name,
    role: "cashier",
    businessId: cashier.businessId,
  };
}

export async function logoutCashier(token?: string): Promise<void> {
  if (!token) return;
  await db.delete(cashierSessions).where(eq(cashierSessions.tokenHash, sha256(token)));
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}
