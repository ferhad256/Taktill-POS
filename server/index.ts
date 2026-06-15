import "./env.js"; // load server/.env (safe to skip — Vercel uses env vars directly)
import { seedIfEmpty } from "./seed.js";
import { app } from "./app.js";

// Seed only in local dev — Vercel serverless skips this.
void seedIfEmpty();

const port = Number(process.env.API_PORT ?? 8787);
app
  .listen(port, () => {
    console.log(`[api] Taktill API listening on http://localhost:${port}`);
  })
  .on("error", (err: unknown) => {
    console.error(`[api] Failed to bind port ${port}:`, err);
  });
