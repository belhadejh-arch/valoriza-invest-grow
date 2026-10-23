import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { pool } from "../src/db.js";

test("task, admin credit, deposit approval, withdrawal and refund use the wallet ledger", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const ids: string[] = [];
  const api = async (token: string, path: string, body?: object) => {
    const res = await fetch(`http://127.0.0.1:80${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    assert.ok(res.status < 400, `${path}: ${res.status} ${JSON.stringify(data)}`);
    return data;
  };
  async function register() {
    const suffix = randomUUID();
    const result = await api("", "/api/auth/register", {
      email: `wallet-${suffix}@example.invalid`, username: `wallet_${suffix.slice(0, 8)}`,
      password: `Aa!${randomUUID()}`,
    });
    ids.push(result.user.id);
    return { id: result.user.id as string, token: result.token as string };
  }
  const balance = async (id: string) => Number((await pool.query("SELECT balance FROM wallets WHERE user_id=$1", [id])).rows[0].balance);
  try {
    const admin = await register();
    const user = await register();
    await pool.query("INSERT INTO user_roles(user_id,role) VALUES($1,'admin')", [admin.id]);
    await pool.query("INSERT INTO referrals(referrer_id,referred_id,level) VALUES($1,$2,1)", [admin.id, user.id]);
    const before = await balance(user.id);
    const adjustment = await api(admin.token, "/api/admin/users/balance", {
      targetUserId: user.id, amount: 100, reason: "isolated development integration test",
    });
    assert.equal(adjustment.ok, true);
    assert.equal(await balance(user.id), before + 100);
    const deduction = await api(admin.token, "/api/admin/users/balance", {
      targetUserId: user.id, amount: -10, reason: "development test debit",
    });
    assert.equal(deduction.balance, before + 90);
    assert.equal(await balance(user.id), before + 90);
    const insufficient = await fetch("http://127.0.0.1:80/api/admin/users/balance", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ targetUserId: user.id, amount: -1000, reason: "test overdraw" }),
    });
    assert.equal(insufficient.status, 400);
    assert.equal(await balance(user.id), before + 90);
    await api(admin.token, "/api/admin/users/balance", {
      targetUserId: user.id, amount: 10, reason: "restore development fixture balance",
    });
    await api(user.token, "/api/app/trial", {});
    const tasks = await api(user.token, "/api/app/tasks");
    const task = tasks.tasks.find((item: { status: string }) => item.status === "AVAILABLE");
    assert.ok(task, "test needs one active task");
    const claims = await Promise.all([0, 1, 2].map(() => api(user.token, "/api/app/tasks/complete", {
      taskId: task.id, watchedSeconds: task.durationSeconds,
    })));
    const successful = claims.filter((row) => row.ok);
    assert.equal(successful.length, 1);
    const taskAmount = Number(successful[0].reward);
    assert.equal(await balance(user.id), before + 100 + taskAmount);
    assert.equal((await pool.query(
      "SELECT count(*)::int AS n FROM task_completions WHERE user_id=$1", [user.id],
    )).rows[0].n, 1);
    assert.equal((await api(user.token, "/api/app/tasks")).tasks.find((item: { id: string }) => item.id === task.id).status, "REWARDED");

    // Only the receipt fixture belongs to this synthetic user. Do not change
    // global deposit addresses or make an unconfigured network look available.
    const settings = await pool.query("SELECT key,value FROM platform_settings WHERE key LIKE 'deposit_address_%'");
    const configured = settings.rows.find((row) => String(row.value).trim());
    let depositId: string;
    if (configured) {
      const receipt = await api(user.token, "/api/app/deposit", {
        amount: 50, network: configured.key.replace("deposit_address_", ""),
        screenshotUrl: "/development-test/receipt.png", txHash: `test-${randomUUID()}`,
      });
      assert.equal(receipt.ok, true);
      depositId = receipt.depositId;
    } else {
      const receipt = await pool.query(
        `INSERT INTO deposits(user_id,amount,network,deposit_address,screenshot_url)
         VALUES($1,50,'TRC20','development-test-only','/development-test/receipt.png') RETURNING id`,
        [user.id],
      );
      depositId = receipt.rows[0].id;
      const unavailable = await api(user.token, "/api/app/deposit", {
        amount: 50, network: "TRC20", screenshotUrl: "/development-test/receipt.png",
      });
      assert.equal(unavailable.reason, "DEPOSIT_ADDRESS_UNAVAILABLE");
    }
    assert.equal(await balance(user.id), before + 100 + taskAmount, "pending deposit must not credit wallet");
    await api(admin.token, "/api/admin/deposits/review", { depositId, action: "approve" });
    assert.equal(await balance(user.id), before + 150 + taskAmount);
    assert.equal((await pool.query(
      "SELECT count(*)::int AS n FROM referral_commissions WHERE referred_id=$1 AND wallet_transaction_id IS NOT NULL",
      [user.id],
    )).rows[0].n, 1);
    const duplicate = await fetch("http://127.0.0.1:80/api/admin/deposits/review", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ depositId, action: "approve" }),
    });
    assert.equal(duplicate.status, 409);
    await api(user.token, "/api/app/withdrawal/address", { network: "TRC20", address: "development-test-wallet" });
    const withdrawal = await api(user.token, "/api/app/withdrawal", {
      network: "TRC20", address: "development-test-wallet", amount: 20,
    });
    assert.equal(withdrawal.ok, true);
    assert.equal(await balance(user.id), before + 130 + taskAmount);
    await api(admin.token, "/api/admin/withdrawals/review", {
      withdrawalId: withdrawal.withdrawalId, action: "reject", rejectReason: "development test refund",
    });
    assert.equal(await balance(user.id), before + 150 + taskAmount);
    const records = await api(user.token, "/api/app/records");
    for (const type of ["admin_adjustment", "task_reward", "deposit", "withdrawal", "withdrawal_refund"]) {
      assert.equal(records.transactions.filter((row: { type: string }) => row.type === type).length, type === "admin_adjustment" ? 3 : 1, type);
    }
    console.log("Verified task replay protection, credit, deposit review, withdrawal/refund and records");
  } finally {
    // Nullable review references must be cleared before deleting test admin.
    if (ids.length) {
      await pool.query("DELETE FROM admin_actions WHERE admin_id=ANY($1::uuid[])", [ids]);
      await pool.query("DELETE FROM deposits WHERE user_id=ANY($1::uuid[])", [ids]);
      await pool.query("DELETE FROM withdrawals WHERE user_id=ANY($1::uuid[])", [ids]);
      await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [ids]);
    }
    await pool.end();
  }
});
