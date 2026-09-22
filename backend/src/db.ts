import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.warn("\n============================================================");
  console.warn("⚠️  DATABASE_URL / POSTGRES_URL is not defined in environment variables!");
  console.warn("👉 On Render: Go to your Web Service -> Environment -> Add Environment Variable");
  console.warn("   Key: DATABASE_URL");
  console.warn("   Value: [Your PostgreSQL Internal or External Connection String]");
  console.warn("============================================================\n");
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
              connectionString.includes("supabase.co") ||
              connectionString.includes("aws.neon.tech")))
        ? { rejectUnauthorized: false }
        : undefined,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  if (!connectionString) {
    throw new Error(
      "Missing database connection string. Please set DATABASE_URL (or POSTGRES_URL) in your environment variables.",
    );
  }
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
  if (!connectionString) {
    throw new Error(
      "Missing database connection string. Please set DATABASE_URL (or POSTGRES_URL) in your environment variables.",
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
