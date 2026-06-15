import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import "./db/index.js"; // initialise DB + DDL
import { AppError } from "./lib/errors.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { authRouter } from "./routes/auth.js";
import { cashierAuthRouter } from "./routes/cashierAuth.js";
import { productsRouter } from "./routes/products.js";
import { salesRouter } from "./routes/sales.js";
import { reportsRouter } from "./routes/reports.js";
import { settingsRouter } from "./routes/settings.js";

export const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.APP_URL || "http://localhost:5173",
    "http://localhost:5173",
    "https://taktill-pos.vercel.app",
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  
  next();
});

// Mount routes under both /api/v1 (PRD §5) and /api (backward compat)
for (const base of ["/api/v1", "/api"]) {
  app.get(`${base}/health`, (_req, res) => res.json({ success: true, data: "ok" }));
  app.use(`${base}/auth`, rateLimit(10, 15 * 60 * 1000), authRouter);
  app.use(`${base}/cashier-auth`, cashierAuthRouter);
  app.use(`${base}/products`, productsRouter);
  app.use(`${base}/sales`, salesRouter);
  app.use(`${base}/reports`, reportsRouter);
  app.use(`${base}`, settingsRouter);

  app.use(base, (_req, res) => {
    res.status(404).json({ success: false, error: "NOT_FOUND" });
  });
}

// Central error handler → PRD response envelope (§5).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res
      .status(err.status)
      .json({ success: false, error: err.code, details: err.details });
  }
  console.error("[api] Unhandled error:", err);
  res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
});
