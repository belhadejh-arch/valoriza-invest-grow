import "dotenv/config";
import { pool } from "./db.js";
import { applySafeDatabaseSchema } from "./safe-schema.js";

if (
  process.env.NODE_ENV === "production" &&
  (process.env.MIGRATE_ALLOW_PRODUCTION !== "true" || !process.env.POSTGRES_URL)
) {
  throw new Error(
    "Refusing production migration: set MIGRATE_ALLOW_PRODUCTION=true and provide POSTGRES_URL.",
  );
}

try {
  await applySafeDatabaseSchema();
} finally {
  await pool.end();
}
