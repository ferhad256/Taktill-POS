import { Router } from "express";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth, type Principal } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";

export const authRouter = Router();

// Custom auth routes that wrap better-auth and return our app's expected format
authRouter.post("/sign-in/email", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    throw new AppError("INVALID_CREDENTIALS", 401);
  }

  const result = await auth.api.signInEmail({
    body: { email, password },
  });

  if (!result.session || !result.user) {
    throw new AppError("INVALID_CREDENTIALS", 401);
  }

  const u = result.user as typeof result.user & {
    role?: string;
    businessId?: string;
  };

  const principal: Principal = {
    kind: "user",
    id: u.id,
    name: u.name,
    role: (u.role as Principal["role"]) ?? "manager",
    businessId: u.businessId ?? "",
    email: u.email,
  };

  res.json({
    success: true,
    data: {
      token: result.session.token,
      principal,
    },
  });
});

authRouter.get("/session", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user) {
    return res.json({ success: true, data: null });
  }

  const u = session.user as typeof session.user & {
    role?: string;
    businessId?: string;
  };

  const principal: Principal = {
    kind: "user",
    id: u.id,
    name: u.name,
    role: (u.role as Principal["role"]) ?? "manager",
    businessId: u.businessId ?? "",
    email: u.email,
  };

  res.json({ success: true, data: principal });
});

authRouter.post("/sign-out", async (req, res) => {
  await auth.api.signOut({
    headers: fromNodeHeaders(req.headers),
  });
  res.json({ success: true });
});

// Keep the rest of better-auth's routes for any other functionality
authRouter.use(toNodeHandler(auth));
