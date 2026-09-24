import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl:
          process.env.NODE_ENV === "production" || connectionString.includes("sslmode=require")
            ? { rejectUnauthorized: false }
            : undefined,
        max: Number(process.env.DB_POOL_MAX ?? 10),
        idleTimeoutMillis: 30_000,
      }
    : {
        // Fallback placeholder when DB URL is not yet configured
        max: 1,
      },
);

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  if (!connectionString) {
    throw new Error(
      "قاعدة البيانات غير متصلة. يرجى تعيين POSTGRES_URL أو DATABASE_URL في متغيرات البيئة.",
    );
  }
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
  if (!connectionString) {
    throw new Error(
      "قاعدة البيانات غير متصلة. يرجى تعيين POSTGRES_URL أو DATABASE_URL في متغيرات البيئة.",
    );
  }
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
