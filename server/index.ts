import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import "./db"; // initialise DB + DDL
import { seedIfEmpty } from "./seed";
import { AppError } from "./lib/errors";
import { authRouter } from "./routes/auth";
import { cashierAuthRouter } from "./routes/cashierAuth";
import { productsRouter } from "./routes/products";
import { salesRouter } from "./routes/sales";
import { reportsRouter } from "./routes/reports";
import { settingsRouter } from "./routes/settings";

seedIfEmpty();

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ success: true, data: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/cashier-auth", cashierAuthRouter);
app.use("/api/products", productsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api", settingsRouter);

// 404 for unknown API routes
app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "NOT_FOUND" });
});

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

// Dedicated var so a generic PORT (e.g. injected by a dev/preview runner that
// owns the frontend port) never collides with the API port.
const port = Number(process.env.API_PORT ?? 8787);
app
  .listen(port, () => {
    console.log(`[api] Taktill API listening on http://localhost:${port}`);
  })
  .on("error", (err) => {
    console.error(`[api] Failed to bind port ${port}:`, err);
  });
