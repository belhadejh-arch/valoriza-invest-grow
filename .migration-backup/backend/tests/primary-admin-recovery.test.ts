import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { Request } from "express";
import { pool, withTransaction } from "../src/db.js";
import { recoverPrimaryAdmin } from "../src/primary-admin-recovery.js";
import { getAuthUser } from "../src/auth.js";

test("admin recovery preserves the existing account and rejects email collisions", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const ids: string[] = [];
  const nonce = randomUUID();
  const previousEmail = `prior-admin-${nonce}@example.invalid`;
  const nextEmail = `next-admin-${nonce}@example.invalid`;
  const occupiedEmail = `occupied-${nonce}@example.invalid`;
  const oldPassword = randomUUID();
  const newPassword = randomUUID();
  async function api(path: string, body?: object, token?: string) {
    const response = await fetch(`http://127.0.0.1:80${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() };
  }
  try {
    const source = await api("/api/auth/register", {
      username: `admin_test_${nonce.slice(0, 8)}`, email: previousEmail, password: oldPassword,
    });
    assert.equal(source.status, 201);
    ids.push(source.data.user.id);
    const other = await api("/api/auth/register", {
      username: `other_test_${nonce.slice(0, 8)}`, email: occupiedEmail, password: randomUUID(),
    });
    assert.equal(other.status, 201);
    ids.push(other.data.user.id);
    await pool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')", [ids[0]]);
    await pool.query("INSERT INTO admin_users (user_id) VALUES ($1)", [ids[0]]);
    await pool.query("UPDATE wallets SET balance=12.34 WHERE user_id=$1", [ids[0]]);
    const originalProfile = await pool.query("SELECT referral_code FROM profiles WHERE id=$1", [ids[0]]);

    await assert.rejects(
      withTransaction((client) => recoverPrimaryAdmin(client, {
        previousEmail, email: occupiedEmail, password: newPassword,
      })),
      /destination email belongs to another account/,
    );
    assert.equal(
      (await pool.query("SELECT email FROM users WHERE id=$1", [ids[0]])).rows[0].email,
      previousEmail,
    );
    assert.equal(
      (await api("/api/auth/session", undefined, source.data.token)).data.session.user.id,
      ids[0],
    );
    await assert.rejects(
      withTransaction((client) => recoverPrimaryAdmin(client, {
        previousEmail: occupiedEmail, email: `unprivileged-${nonce}@example.invalid`,
        password: newPassword,
      })),
      /not already an admin/,
    );
    await assert.rejects(
      withTransaction((client) => recoverPrimaryAdmin(client, {
        previousEmail: `missing-${nonce}@example.invalid`, email: nextEmail, password: newPassword,
      })),
      /existing admin account was not found/,
    );

    const recovery = { previousEmail, email: nextEmail.toUpperCase(), password: newPassword };
    assert.equal(await withTransaction((client) => recoverPrimaryAdmin(client, recovery)), true);
    const stored = await pool.query(
      `SELECT u.id, u.email, p.email AS profile_email, p.referral_code, w.balance
       FROM users u JOIN profiles p ON p.id=u.id JOIN wallets w ON w.user_id=u.id
       WHERE u.id=$1`, [ids[0]],
    );
    assert.equal(stored.rows[0].id, ids[0]);
    assert.equal(stored.rows[0].email, nextEmail);
    assert.equal(stored.rows[0].profile_email, nextEmail);
    assert.equal(stored.rows[0].referral_code, originalProfile.rows[0].referral_code);
    assert.equal(Number(stored.rows[0].balance), 12.34);
    assert.equal(
      (await api("/api/auth/session", undefined, source.data.token)).data.session,
      null,
    );
    assert.equal((await api("/api/auth/login", { email: previousEmail, password: oldPassword })).status, 401);
    assert.equal((await api("/api/auth/login", { email: nextEmail, password: oldPassword })).status, 401);
    const login = await api("/api/auth/login", { email: nextEmail, password: newPassword });
    assert.equal(login.status, 200);
    assert.equal(login.data.user.id, ids[0]);

    process.env.ADMIN_EMAIL = nextEmail;
    const requestWithToken = (token: string) => ({
      header: (name: string) => name.toLowerCase() === "authorization" ? `Bearer ${token}` : undefined,
      cookies: undefined,
    }) as unknown as Request;
    assert.equal((await getAuthUser(requestWithToken(login.data.token)))?.role, "admin");
    await pool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')", [ids[1]]);
    await pool.query("INSERT INTO admin_users (user_id) VALUES ($1)", [ids[1]]);
    const { initDatabase } = await import("../src/server.js");
    await initDatabase();
    assert.equal(
      (await pool.query("SELECT user_id FROM user_roles WHERE user_id=$1 AND role='admin'", [ids[0]])).rowCount,
      1,
      "the configured primary admin keeps the admin role",
    );
    assert.equal(
      (await pool.query("SELECT user_id FROM user_roles WHERE user_id=$1 AND role='admin'", [ids[1]])).rowCount,
      0,
      "an ordinary account loses any stale admin role",
    );
    assert.equal(
      (await pool.query("SELECT user_id FROM admin_users WHERE user_id=$1", [ids[1]])).rowCount,
      0,
      "an ordinary account is removed from the admin membership table",
    );
    await pool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')", [ids[1]]);
    await pool.query("INSERT INTO admin_users (user_id) VALUES ($1)", [ids[1]]);
    assert.equal(
      (await getAuthUser(requestWithToken(other.data.token)))?.role,
      "user",
      "an ordinary account cannot become admin even with stale database role rows",
    );

    // A restart with the same recovery settings must not log the admin out again.
    assert.equal(await withTransaction((client) => recoverPrimaryAdmin(client, recovery)), false);
    assert.equal(
      (await api("/api/auth/session", undefined, login.data.token)).data.session.user.id,
      ids[0],
    );

    // Import startup without opening a second HTTP listener. These environment
    // overrides exist only in this disposable test process.
    process.env.VERCEL = "1";
    process.env.ADMIN_EMAIL = `unconfigured-${nonce}@example.invalid`;
    process.env.ADMIN_PASSWORD = newPassword;
    process.env.ADMIN_PASSWORD_SYNC = "false";
    await initDatabase();
    await initDatabase();
    assert.equal(
      (await pool.query("SELECT id FROM users WHERE email=$1", [process.env.ADMIN_EMAIL])).rowCount,
      0,
      "a configuration mismatch must not create a replacement admin",
    );
    const incompleteEmail = `incomplete-${nonce}@example.invalid`;
    const incomplete = await pool.query(
      "INSERT INTO users (email,password_hash) SELECT $1,password_hash FROM users WHERE id=$2 RETURNING id",
      [incompleteEmail, ids[0]],
    );
    ids.push(incomplete.rows[0].id);
    process.env.ADMIN_EMAIL = incompleteEmail;
    await initDatabase();
    assert.equal(
      (await pool.query("SELECT user_id FROM admin_users WHERE user_id=$1", [ids[2]])).rowCount,
      0,
      "an incomplete account must not gain administrator privileges on restart",
    );
  } finally {
    if (ids.length) await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [ids]);
    await pool.end();
  }
});
