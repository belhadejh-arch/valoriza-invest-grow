import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, closeDb } from "./db.js";

export async function runMigrations() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sql = await fs.readFile(path.resolve(here, "../migrations/001_init.sql"), "utf8");
  await query(sql);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  try {
    await runMigrations();
    await closeDb();
    console.log("Database migration completed.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}
