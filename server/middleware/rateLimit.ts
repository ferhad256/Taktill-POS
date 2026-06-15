import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Periodic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

/**
 * Simple in-memory rate limiter.
 * PRD §8.2: max 10 attempts per 15 minutes per IP on auth endpoints.
 */
export function rateLimit(maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt < now) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxAttempts) {
      return next(new AppError("TOO_MANY_REQUESTS", 429));
    }

    next();
  };
}
