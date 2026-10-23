import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { pool } from "../src/db.js";

test("bind once, preserve address across withdrawals and a fresh login", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const email = `bind-${randomUUID()}@example.invalid`;
  const password = `Aa!${randomUUID()}`;
  let token = "";
  let id: string | undefined;
  async function api(path: string, body?: object) {
    const response = await fetch(`http://127.0.0.1:80${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    assert.ok(response.status < 400, `${path}: ${response.status} ${JSON.stringify(result)}`);
    return result;
  }
  try {
    const registration = await api("/api/auth/register", {
      username: `bind_${randomUUID().slice(0, 8)}`, email, password,
    });
    id = registration.user.id;
    token = registration.token;
    // Only fund this disposable development fixture; no real payment is sent.
    await pool.query("UPDATE wallets SET balance=100 WHERE user_id=$1", [id]);
    assert.equal((await api("/api/app/withdrawal")).boundAddress, null);
    assert.equal((await api("/api/app/withdrawal", { amount: 10 })).reason, "ADDRESS_NOT_BOUND");
    const address = { network: "TRC20", address: `T-test-${randomUUID()}` };
    const bindings = await Promise.all([0, 1, 2].map(() => api("/api/app/withdrawal/address", address)));
    for (const binding of bindings) {
      assert.equal(binding.ok, true);
      assert.deepEqual(binding.boundAddress, { ...address, locked: true });
    }
    assert.equal((await pool.query("SELECT id FROM withdrawal_addresses WHERE user_id=$1", [id])).rowCount, 1);
    assert.equal((await api("/api/app/withdrawal/address", {
      network: "ERC20", address: `different-${randomUUID()}`,
    })).reason, "ADDRESS_LOCKED");
    assert.equal((await api("/api/app/withdrawal", {
      amount: 10, ...address, address: `different-${randomUUID()}`,
    })).reason, "ADDRESS_MISMATCH");
    assert.equal((await api("/api/app/withdrawal", { amount: 10 })).ok, true);
    assert.deepEqual((await api("/api/app/withdrawal")).boundAddress, { ...address, locked: true });
    await api("/api/auth/logout", {});
    token = "";
    const login = await api("/api/auth/login", { email, password });
    token = login.token;
    assert.deepEqual((await api("/api/app/withdrawal")).boundAddress, { ...address, locked: true });
    assert.equal((await api("/api/app/withdrawal", { amount: 15 })).ok, true);
    assert.deepEqual((await api("/api/app/withdrawal")).boundAddress, { ...address, locked: true });
    const withdrawals = await pool.query("SELECT network,address FROM withdrawals WHERE user_id=$1", [id]);
    assert.equal(withdrawals.rowCount, 2);
    assert.ok(withdrawals.rows.every((row) => row.network === address.network && row.address === address.address));
    assert.equal(Number((await pool.query("SELECT balance FROM wallets WHERE user_id=$1", [id])).rows[0].balance), 75);
  } finally {
    if (id) await pool.query("DELETE FROM users WHERE id=$1", [id]);
    await pool.end();
  }
});
