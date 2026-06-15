// Load server/.env (Neon DATABASE_URL, BETTER_AUTH_SECRET, etc.) if present.
// In production the variables are typically provided by the host environment.
try {
  process.loadEnvFile("server/.env");
} catch {
  /* no .env file — rely on the ambient environment */
}
