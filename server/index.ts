import "./env"; // load server/.env (safe to skip — Vercel uses env vars directly)
import { seedIfEmpty } from "./seed";
import { app } from "./app";

// Seed only in local dev — Vercel serverless skips this.
void seedIfEmpty();

const port = Number(process.env.API_PORT ?? 8787);
app
  .listen(port, () => {
    console.log(`[api] Taktill API listening on http://localhost:${port}`);
  })
  .on("error", (err) => {
    console.error(`[api] Failed to bind port ${port}:`, err);
  });
