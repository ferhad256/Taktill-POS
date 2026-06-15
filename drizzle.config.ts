import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile("server/.env");
} catch {
  /* rely on ambient env */
}

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
