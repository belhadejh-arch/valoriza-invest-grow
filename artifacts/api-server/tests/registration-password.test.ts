import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import serverless from "serverless-http";

// Exercise the real registration/login handlers through the Netlify adapter.
// Only disposable accounts are created; their data is removed in finally.
test("registration accepts simple passwords and reports the actual invalid field", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  process.env.NETLIFY = "true";
  const { app } = await import("../../../.migration-backup/backend/src/server.js");
  const { pool } = await import("../../../.migration-backup/backend/src/db.js");
  const handler = serverless(app);
  const ids: string[] = [];
  const emails: string[] = [];

  async function request(path: string, data?: object, token?: string) {
    const result = await handler({
      httpMethod: data === undefined ? "GET" : "POST",
      path,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: data === undefined ? "" : Buffer.from(JSON.stringify(data)).toString("base64"),
      isBase64Encoded: data !== undefined,
      requestContext: { identity: { sourceIp: "127.0.0.1" } },
    }, {} as never);
    return { status: result.statusCode, data: JSON.parse(result.body) };
  }

  try {
    let referralCode: string | undefined;
    for (const password of ["123456", "abcdefghijk", "كلمةسر", "a", "  keep spaces  "]) {
      const nonce = randomUUID();
      const email = `signup-policy-${nonce}@example.invalid`;
      emails.push(email);
      const signup = await request("/api/auth/register", {
        username: `signup_${nonce.slice(0, 8)}`,
        email,
        password,
        ...(referralCode ? { referralCode } : {}),
      });
      assert.equal(signup.status, 201);
      ids.push(signup.data.user.id);
      assert.equal(signup.data.user.role, "user");
      const stored = await pool.query(
        "SELECT p.referral_code,p.referred_by,u.password_hash FROM profiles p JOIN users u ON u.id=p.id WHERE p.id=$1",
        [signup.data.user.id],
      );
      assert.notEqual(stored.rows[0].password_hash, password);
      if (!referralCode) referralCode = stored.rows[0].referral_code;
      else assert.equal(stored.rows[0].referred_by, ids[0]);
      assert.equal((await request("/api/auth/logout", {}, signup.data.token)).status, 200);
      const login = await request("/api/auth/login", { email, password });
      assert.equal(login.status, 200);
      assert.equal(login.data.user.id, signup.data.user.id);
      const session = await request("/api/auth/session", undefined, login.data.token);
      assert.equal(session.data.session?.user.id, signup.data.user.id);
      assert.equal((await request("/api/auth/logout", {}, login.data.token)).status, 200);
    }
    const valid = { username: "valid_name", email: `validation-${randomUUID()}@example.invalid`, password: "1234567" };
    for (const [override, expected] of [
      [{ username: "ab" }, "INVALID_USERNAME"],
      [{ email: "invalid-email" }, "INVALID_EMAIL"],
      [{ password: "" }, "PASSWORD_REQUIRED"],
      [{ password: "أ".repeat(37) }, "PASSWORD_TOO_LONG"],
      [{ referralCode: `UNKNOWN${randomUUID()}` }, "INVALID_REFERRAL_CODE"],
    ] as const) {
      const result = await request("/api/auth/register", { ...valid, ...override });
      assert.equal(result.status, 400);
      assert.equal(result.data.message, expected);
    }
  } finally {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Also clean up if a response failed after creating its user.
      const created = await client.query<{ id: string }>("SELECT id FROM users WHERE email=ANY($1::text[])", [emails]);
      const cleanupIds = [...new Set([...ids, ...created.rows.map((row) => row.id)])];
      await client.query("DELETE FROM referrals WHERE referred_id=ANY($1::uuid[]) OR referrer_id=ANY($1::uuid[])", [cleanupIds]);
      for (const table of ["sessions", "user_roles", "wallets"]) {
        await client.query(`DELETE FROM ${table} WHERE user_id=ANY($1::uuid[])`, [cleanupIds]);
      }
      await client.query("DELETE FROM profiles WHERE id=ANY($1::uuid[])", [cleanupIds]);
      await client.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [cleanupIds]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }
});
