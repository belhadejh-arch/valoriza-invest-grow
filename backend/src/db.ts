import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.warn("⚠️ Warning: Neither DATABASE_URL nor POSTGRES_URL is defined yet. Database operations will fail until set.");
}

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? undefined
      : process.env.NODE_ENV === "production" ||
          (connectionString &&
            (connectionString.includes("render.com") ||
              connectionString.includes("neon.tech") ||
              connectionString.includes("supabase.co")))
        ? { rejectUnauthorized: false }
        : undefined,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDb() {
  await pool.end();
}
