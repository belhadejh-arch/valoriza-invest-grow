import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "./db.js";

async function readBaselineMigration(): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), "migrations/001_init.sql"),
    path.resolve(process.cwd(), "backend/migrations/001_init.sql"),
    path.resolve(process.cwd(), ".migration-backup/backend/migrations/001_init.sql"),
    path.resolve(process.cwd(), "../.migration-backup/backend/migrations/001_init.sql"),
    path.resolve(process.cwd(), "../../.migration-backup/backend/migrations/001_init.sql"),
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  throw new Error("Could not locate backend/migrations/001_init.sql.");
}

async function readTeamMilestoneMigration(): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), "migrations/004_team_milestone_claims.sql"),
    path.resolve(process.cwd(), "backend/migrations/004_team_milestone_claims.sql"),
    path.resolve(process.cwd(), ".migration-backup/backend/migrations/004_team_milestone_claims.sql"),
    path.resolve(process.cwd(), "../.migration-backup/backend/migrations/004_team_milestone_claims.sql"),
    path.resolve(process.cwd(), "../../.migration-backup/backend/migrations/004_team_milestone_claims.sql"),
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  throw new Error("Could not locate backend/migrations/004_team_milestone_claims.sql.");
}

export async function ensureTeamMilestoneSchema(): Promise<void> {
  await pool.query(await readTeamMilestoneMigration());
}

export async function applySafeDatabaseSchema(): Promise<void> {
  const baselineSql = await readBaselineMigration();
  const teamMilestoneSql = await readTeamMilestoneMigration();
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
    await client.query(teamMilestoneSql);
    await client.query("COMMIT");
    console.log("Safe database baseline applied; existing rows were not deleted.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
