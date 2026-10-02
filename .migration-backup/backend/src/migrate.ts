import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, closeDb } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../migrations");
const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  console.log(`Running migration: ${file}`);
  const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
  await query(sql);
}

await closeDb();
console.log("Database migration completed.");
