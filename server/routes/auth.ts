import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth.js";

export const authRouter = Router();

authRouter.use(toNodeHandler(auth));
