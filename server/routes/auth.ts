import { Router } from "express";
import { z } from "zod";
import { logout, resolvePrincipal, signInEmail } from "../lib/auth";
import { AppError } from "../lib/errors";

export const authRouter = Router();

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/sign-in/email", (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", 400, parsed.error.issues);
  const { token, principal } = signInEmail(parsed.data.email, parsed.data.password);
  res.json({ success: true, data: { token, principal } });
});

authRouter.post("/sign-out", (req, res) => {
  logout(req.headers.authorization?.replace(/^Bearer\s+/i, ""));
  res.json({ success: true });
});

authRouter.get("/session", (req, res) => {
  const principal = resolvePrincipal(req.headers.authorization?.replace(/^Bearer\s+/i, ""));
  res.json({ success: true, data: principal });
});
