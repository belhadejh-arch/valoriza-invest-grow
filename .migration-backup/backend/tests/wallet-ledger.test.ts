import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { pool } from "../src/db.js";
import { recordWalletChange, walletLedgerSchemaSql } from "../src/wallet-ledger.js";

test("wallet events preserve the incompatible cash ledger and rollback atomically", async () => {
  const client = await pool.connect();
  const user = randomUUID();
  try {
    await client.query("BEGIN");
    const schema = `wallet_test_${randomUUID().replaceAll("-", "")}`;
    await client.query(`CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema}, public`);
    await client.query(`
      CREATE TABLE users(id uuid PRIMARY KEY);
      CREATE TABLE wallets(user_id uuid PRIMARY KEY, balance numeric(18,4),
        total_earned numeric(18,4) DEFAULT 0, total_deposited numeric(18,4) DEFAULT 0,
        total_withdrawn numeric(18,4) DEFAULT 0, updated_at timestamptz);
      CREATE TABLE transactions(id bigserial PRIMARY KEY,
        type text CHECK(type IN ('income','expense')), party text NOT NULL,
        recorded_by_id text NOT NULL, recorded_by_name text NOT NULL,
        amount numeric NOT NULL CHECK(amount>0));
      INSERT INTO transactions(type,party,recorded_by_id,recorded_by_name,amount)
        VALUES('income','historical','old','old',5);
      CREATE TABLE referral_commissions(id uuid PRIMARY KEY, source_transaction_id bigint REFERENCES transactions(id));
    `);
    await client.query(walletLedgerSchemaSql);
    await client.query(walletLedgerSchemaSql);
    await client.query("INSERT INTO users VALUES($1);", [user]);
    await client.query("INSERT INTO wallets(user_id,balance) VALUES($1,0.11)", [user]);
    const credit = await recordWalletChange(client, user, 10, "admin_adjustment", "test");
    assert.equal(credit.balance, 10.11);
    assert.equal((await recordWalletChange(client, user, 0.5, "task_reward", "test")).balance, 10.61);
    const deposit = await recordWalletChange(client, user, 50, "deposit", "test");
    await client.query("INSERT INTO referral_commissions(id,wallet_transaction_id) VALUES($1,$2)", [
      randomUUID(), deposit.transactionId,
    ]);
    assert.equal((await recordWalletChange(client, user, -20, "withdrawal", "test")).balance, 40.61);
    assert.equal((await recordWalletChange(client, user, 20, "withdrawal_refund", "test")).balance, 60.61);
    const wallet = (await client.query("SELECT * FROM wallets WHERE user_id=$1", [user])).rows[0];
    assert.equal(wallet.total_deposited, "50.0000");
    assert.equal(wallet.total_withdrawn, "0.0000");
    assert.equal(wallet.total_earned, "10.5000");
    const ledger = await client.query("SELECT * FROM wallet_transactions ORDER BY ctid");
    assert.equal(ledger.rowCount, 5);
    for (const row of ledger.rows) {
      assert.equal(Math.round((Number(row.balance_after) - Number(row.balance_before))*10000), Math.round(Number(row.amount)*10000));
    }
    await assert.rejects(recordWalletChange(client, user, -100, "withdrawal", "test"), /INSUFFICIENT_BALANCE/);
    await assert.rejects(recordWalletChange(client, user, NaN, "admin_adjustment", "test"), /INVALID_AMOUNT/);
    await assert.rejects(recordWalletChange(client, randomUUID(), 1, "deposit", "test"), /WALLET_NOT_FOUND/);
    await client.query("ALTER TABLE wallet_transactions ADD CONSTRAINT simulated_failure CHECK(amount<0) NOT VALID");
    await client.query("SAVEPOINT before_failure");
    await assert.rejects(recordWalletChange(client, user, 5, "task_reward", "test"), /simulated_failure/);
    await client.query("ROLLBACK TO SAVEPOINT before_failure");
    assert.equal((await client.query("SELECT balance FROM wallets WHERE user_id=$1", [user])).rows[0].balance, "60.6100");
    assert.equal((await client.query("SELECT count(*)::int AS n FROM wallet_transactions")).rows[0].n, 5);
    const cash = await client.query("SELECT * FROM transactions");
    assert.equal(cash.rowCount, 1);
    assert.equal(cash.rows[0].party, "historical");
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
