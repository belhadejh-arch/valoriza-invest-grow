import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { pool } from "../src/db.js";

test("daily reward credits the wallet once and survives retries and reloads", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  let userId: string | undefined;
  let token = "";
  async function api(path: string, body?: object) {
    const response = await fetch(`http://127.0.0.1:80${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  try {
    const suffix = randomUUID();
    const registration = await api("/api/auth/register", {
      username: `daily_${suffix.slice(0, 8)}`,
      email: `daily-${suffix}@example.invalid`,
      password: `Aa!${randomUUID()}`,
    });
    assert.equal(registration.status, 201);
    userId = registration.data.user.id;
    token = registration.data.token;
    const before = await api("/api/app/home");
    assert.equal(before.status, 200);
    assert.equal(before.data.dailyReward.claimed, false);
    const amount = Number(before.data.dailyReward.amount);
    assert.ok(amount > 0);
    const claims = await Promise.all(Array.from({ length: 3 }, () => api("/api/app/daily-reward", {})));
    for (const claim of claims) assert.equal(claim.status, 200, JSON.stringify(claim.data));
    assert.equal(claims.filter((claim) => claim.data.ok).length, 1);
    const after = await api("/api/app/home");
    assert.equal(after.data.dailyReward.claimed, true);
    assert.equal(Number(after.data.wallet.balance), Number(before.data.wallet.balance) + amount);
    const ledger = await pool.query(
      "SELECT amount,balance_before,balance_after FROM daily_login_rewards WHERE user_id=$1 AND reward_date=current_date",
      [userId],
    );
    assert.equal(ledger.rowCount, 1);
    assert.equal(Number(ledger.rows[0].amount), amount);
    assert.equal(Number(ledger.rows[0].balance_after) - Number(ledger.rows[0].balance_before), amount);
    const records = await api("/api/app/records");
    assert.equal(records.status, 200);
    const credits = records.data.transactions.filter((row: { type: string }) => row.type === "daily_login_reward");
    assert.equal(credits.length, 1);
    assert.equal(credits[0].amount, amount);
    assert.equal((await pool.query(
      "SELECT id FROM rewards WHERE user_id=$1 AND source='daily_login'", [userId],
    )).rowCount, 1);
    assert.equal((await api("/api/app/daily-reward", {})).data.ok, false);
  } finally {
    if (userId) await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    await pool.end();
  }
});
