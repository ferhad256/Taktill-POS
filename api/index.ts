// ── Vercel Serverless Function entry point ─────────────────────────
// Vercel routes /api/* requests here; the Express app handles the sub-path.
//
// ⚠️  No .env file on Vercel — set all env vars in the Vercel Dashboard:
//     DATABASE_URL, BETTER_AUTH_SECRET, API_PORT, APP_URL.

import "../server/env";
import { app } from "../server/app.js";

export default app;
