import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pool } from "../src/db.js";

test("startup migration upgrades legacy balance snapshots without changing history", async () => {
  const client = await pool.connect();
  const schema = `snapshot_test_${randomBytes(8).toString("hex")}`;
  const migration = await readFile(
    new URL("../migrations/001_init.sql", import.meta.url),
    "utf8",
  );
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}, public`);
    // Reproduce the old Render ledger: BIGINT keys, no balance snapshots.
    await client.query(`
      CREATE TABLE transactions (
        id bigserial PRIMARY KEY,
        user_id uuid,
        type text NOT NULL,
        status text NOT NULL DEFAULT 'completed',
        amount numeric(18,4) NOT NULL,
        reference_id uuid,
        description text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO transactions (type, amount) VALUES ('deposit', 5);
    `);
    await client.query(migration);
    // Startup must remain safe on subsequent deployments.
    await client.query(migration);
    const historical = await client.query("SELECT * FROM transactions WHERE id=1");
    assert.equal(historical.rows[0].amount, "5.0000");
    assert.equal(historical.rows[0].balance_before, null);
    assert.equal(historical.rows[0].balance_after, null);
    const idType = await client.query(`
      SELECT format_type(atttypid, atttypmod) AS type
      FROM pg_attribute
      WHERE attrelid='transactions'::regclass AND attname='id'
    `);
    assert.equal(idType.rows[0].type, "bigint");
    // This INSERT failed with 42703 before the additive migration.
    const credited = await client.query(`
      INSERT INTO transactions
        (type, amount, balance_before, balance_after, description)
      VALUES ('daily_login_reward', 0.11, 0, 0.11, 'daily reward')
      RETURNING amount, balance_before, balance_after
    `);
    assert.deepEqual(credited.rows[0], {
      amount: "0.1100",
      balance_before: "0.0000",
      balance_after: "0.1100",
    });
    assert.equal((await client.query("SELECT count(*)::int AS n FROM transactions")).rows[0].n, 2);
  } finally {
    // All test tables and rows are isolated and rolled back, never persisted.
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
