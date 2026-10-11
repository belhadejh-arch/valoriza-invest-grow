import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

if (
  process.env.NODE_ENV === "production" &&
  (process.env.MIGRATE_ALLOW_PRODUCTION !== "true" || !process.env.POSTGRES_URL)
) {
  throw new Error(
    "Refusing production migration: set MIGRATE_ALLOW_PRODUCTION=true and provide POSTGRES_URL.",
  );
}

const here = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.resolve(here, "../migrations/001_init.sql");
const baselineSql = await fs.readFile(baselinePath, "utf8");
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query(baselineSql);
  await client.query(`
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS wheel_spins_available integer NOT NULL DEFAULT 0;
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS can_withdraw boolean NOT NULL DEFAULT true;
  `);
  await client.query("COMMIT");
  console.log("Safe database baseline applied; existing rows were not deleted.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
