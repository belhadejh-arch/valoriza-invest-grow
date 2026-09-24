import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, closeDb } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = await fs.readFile(path.resolve(here, "../migrations/001_init.sql"), "utf8");
await query(sql);
await closeDb();
console.log("Database migration completed.");
