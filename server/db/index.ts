import "../env.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Add your Neon connection string to server/.env",
  );
}

// postgres-js client. Neon requires SSL — include `?sslmode=require` in the URL.
const client = postgres(url, { max: 10 });

export const db = drizzle(client, { schema });
export type DB = typeof db;
