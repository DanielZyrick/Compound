import "server-only";
import type { Kysely } from "kysely";
import { createDb } from "./create-db";
import type { Database } from "./types";

// In development, Next.js reloads modules on every change. Storing the
// instance on globalThis stops each reload from opening a new connection pool.
const globalForDb = globalThis as unknown as { db?: Kysely<Database> };

function getConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
  return url;
}

export const db = globalForDb.db ?? createDb(getConnectionString());

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
