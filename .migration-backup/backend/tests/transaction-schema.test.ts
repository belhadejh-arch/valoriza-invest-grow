import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pool } from "../src/db.js";

test("startup migration upgrades the full legacy ledger contract without changing history", async () => {
  const client = await pool.connect();
  const schema = `snapshot_test_${randomBytes(8).toString("hex")}`;
  const migration = await readFile(
    new URL("../migrations/001_init.sql", import.meta.url),
    "utf8",
  );
  const server = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");
  const ledgerInsert = server.match(
    /`(INSERT INTO transactions \(user_id, type, amount,[^`]+RETURNING id)`/,
  )?.[1];
  assert.ok(ledgerInsert, "Exercise the actual changeBalance INSERT, including reference_id");
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}, public`);
    // A minimal legacy ledger deliberately lacks ALL newer write/read fields.
    await client.query(`
      CREATE TABLE transactions (
        id bigserial PRIMARY KEY,
        amount numeric(18,4) NOT NULL,
        legacy_note text
      );
      INSERT INTO transactions (amount, legacy_note) VALUES (5, 'preserve history');
    `);
    await client.query(migration);
    // Startup must remain safe on subsequent deployments.
    await client.query(migration);
    const historical = await client.query("SELECT * FROM transactions WHERE id=1");
    assert.equal(historical.rows[0].amount, "5.0000");
    assert.equal(historical.rows[0].balance_before, null);
    assert.equal(historical.rows[0].balance_after, null);
    assert.equal(historical.rows[0].reference_id, null);
    assert.equal(historical.rows[0].created_at, null);
    assert.equal(historical.rows[0].status, null);
    assert.equal(historical.rows[0].legacy_note, "preserve history");
    const idType = await client.query(`
      SELECT format_type(atttypid, atttypmod) AS type
      FROM pg_attribute
      WHERE attrelid='transactions'::regclass AND attname='id'
    `);
    assert.equal(idType.rows[0].type, "bigint");
    const userId = randomUUID();
    const taskId = randomUUID();
    // Run the real shared ledger INSERT for BOTH affected reward flows.
    await client.query(ledgerInsert, [
      userId, "daily_login_reward", 0.11, 0, 0.11, null, "daily reward",
    ]);
    await client.query(ledgerInsert, [
      userId, "task_reward", 0.5, 0.11, 0.61, taskId, "video task reward",
    ]);
    const credited = await client.query(`
      SELECT amount, balance_before, balance_after, reference_id, status, created_at
      FROM transactions WHERE user_id=$1 ORDER BY id
    `, [userId]);
    assert.equal(credited.rowCount, 2);
    assert.deepEqual({
      amount: credited.rows[0].amount,
      balance_before: credited.rows[0].balance_before,
      balance_after: credited.rows[0].balance_after,
    }, {
      amount: "0.1100",
      balance_before: "0.0000",
      balance_after: "0.1100",
    });
    assert.equal(credited.rows[0].reference_id, null);
    assert.equal(credited.rows[1].reference_id, taskId);
    assert.equal(credited.rows[1].balance_after, "0.6100");
    assert.equal(credited.rows[1].status, "completed");
    assert.ok(credited.rows[1].created_at);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM transactions")).rows[0].n, 3);
  } finally {
    // All test tables and rows are isolated and rolled back, never persisted.
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
