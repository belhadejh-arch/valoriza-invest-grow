import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { pool } from "../src/db.js";
import { creditDailyReward, dailyRewardSchemaSql } from "../src/daily-reward.js";

test("daily credits preserve legacy cash records and roll back failed reward writes", async () => {
  const client = await pool.connect();
  const schema = `daily_test_${randomUUID().replace(/-/g, "")}`;
  const user = randomUUID();
  const historicalUser = randomUUID();
  const failingUser = randomUUID();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}, public`);
    await client.query(`
      CREATE TABLE wallets (
        user_id uuid PRIMARY KEY, balance numeric(18,4) NOT NULL,
        total_earned numeric(18,4) NOT NULL DEFAULT 0, updated_at timestamptz DEFAULT now()
      );
      CREATE TABLE daily_login_rewards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
        reward_date date NOT NULL, amount numeric(18,4) NOT NULL, created_at timestamptz DEFAULT now()
      );
      CREATE TABLE rewards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
        source text NOT NULL, amount numeric(18,4) NOT NULL,
        description_ar text, reference_id uuid
      );
      CREATE TABLE transactions (
        id bigserial PRIMARY KEY, type text NOT NULL CHECK(type IN ('income','expense')),
        party text NOT NULL, recorded_by_id text NOT NULL, recorded_by_name text NOT NULL,
        amount numeric(18,4) NOT NULL CHECK(amount>0)
      );
      INSERT INTO transactions(type,party,recorded_by_id,recorded_by_name,amount)
      VALUES('income','historical counterparty','old-id','old recorder',5);
    `);
    await client.query(
      "INSERT INTO daily_login_rewards(user_id,reward_date,amount) VALUES($1,current_date-1,0.11)",
      [historicalUser],
    );
    await client.query(dailyRewardSchemaSql);
    await client.query(dailyRewardSchemaSql);
    const historical = await client.query(
      "SELECT balance_before,balance_after FROM daily_login_rewards WHERE user_id=$1",
      [historicalUser],
    );
    assert.deepEqual(historical.rows[0], { balance_before: null, balance_after: null });
    await client.query("INSERT INTO wallets(user_id,balance) VALUES($1,1.10),($2,0),($3,4)", [
      user, historicalUser, failingUser,
    ]);
    assert.deepEqual(await creditDailyReward(client, user, 0.11), { ok: true, amount: 0.11 });
    assert.deepEqual(await creditDailyReward(client, user, 0.11), { ok: false, amount: 0 });
    assert.equal((await client.query("SELECT balance FROM wallets WHERE user_id=$1", [user])).rows[0].balance, "1.2100");
    assert.equal((await client.query("SELECT count(*)::int AS n FROM rewards WHERE user_id=$1", [user])).rows[0].n, 1);
    assert.equal((await creditDailyReward(client, historicalUser, 0.11)).ok, true);
    const cashHistory = await client.query("SELECT * FROM transactions");
    assert.equal(cashHistory.rowCount, 1);
    assert.equal(cashHistory.rows[0].party, "historical counterparty");
    assert.equal(cashHistory.rows[0].amount, "5.0000");
    await assert.rejects(creditDailyReward(client, user, Number.NaN), /DAILY_REWARD_UNAVAILABLE/);
    await assert.rejects(creditDailyReward(client, randomUUID(), 0.11), /DAILY_REWARD_UNAVAILABLE/);
    await client.query("ALTER TABLE rewards ADD CONSTRAINT simulate_failure CHECK(amount<0) NOT VALID");
    await client.query("SAVEPOINT before_failed_claim");
    await assert.rejects(creditDailyReward(client, failingUser, 0.11), /simulate_failure/);
    await client.query("ROLLBACK TO SAVEPOINT before_failed_claim");
    assert.equal((await client.query("SELECT balance FROM wallets WHERE user_id=$1", [failingUser])).rows[0].balance, "4.0000");
    assert.equal((await client.query("SELECT id FROM daily_login_rewards WHERE user_id=$1", [failingUser])).rowCount, 0);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
