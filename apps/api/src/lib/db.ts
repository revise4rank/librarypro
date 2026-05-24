import { Pool } from "pg";
import { env } from "../config/env";

const connectionString = process.env.DATABASE_URL;

export const db =
  connectionString && connectionString.length > 0
    ? new Pool({
        connectionString,
        max: env.dbPoolMax,
        idleTimeoutMillis: env.dbPoolIdleTimeoutMs,
        connectionTimeoutMillis: env.dbPoolConnectionTimeoutMs,
      })
    : null;

export function requireDb() {
  if (!db) {
    throw new Error("DATABASE_URL is required for database-backed routes.");
  }

  return db;
}
