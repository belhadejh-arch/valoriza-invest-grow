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

  async function request(path: string, data?: object, token?: string, extraHeaders: Record<string, string> = {}) {
    const result = await handler({
      httpMethod: data === undefined ? "GET" : "POST",
      path,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
      },
      body: data === undefined ? "" : Buffer.from(JSON.stringify(data)).toString("base64"),
      isBase64Encoded: data !== undefined,
      requestContext: { identity: { sourceIp: "127.0.0.1" } },
    }, {} as never);
    return { status: result.statusCode, data: JSON.parse(result.body), headers: new Headers(result.headers as HeadersInit) };
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
      if (ids.length === 1) {
        // Newly registered sessions must immediately authorize every affected page.
        for (const path of ["/api/app/home", "/api/app/account", "/api/app/investment", "/api/app/tasks"]) {
          const page = await request(path, undefined, signup.data.token, { cookie: "valoriza_session=stale-cookie" });
          assert.equal(page.status, 200, `${path} must accept the freshly issued bearer`);
          assert.match(page.headers.get("cache-control") ?? "", /no-store/);
        }
        const bind = await request(
          "/api/app/withdrawal/address",
          { network: "TRC20", address: `T${"A".repeat(33)}` },
          signup.data.token,
        );
        assert.equal(bind.status, 200);
        assert.equal(bind.data.ok, true);
        const withdrawalInfo = await request("/api/app/withdrawal", undefined, signup.data.token);
        assert.equal(withdrawalInfo.data.boundAddress.address, `T${"A".repeat(33)}`);
        assert.equal(withdrawalInfo.data.boundAddress.network, "TRC20");
        const conflictingBind = await request(
          "/api/app/withdrawal/address",
          { network: "ERC20", address: `0x${"b".repeat(40)}` },
          signup.data.token,
        );
        assert.equal(conflictingBind.data.ok, false, "a saved address cannot be silently replaced");
        assert.equal((await request("/api/admin/overview", undefined, signup.data.token)).status, 403);
        const before = await request("/api/app/home", undefined, signup.data.token);
        const claims = await Promise.all(Array.from({ length: 3 }, () =>
          request("/api/app/daily-reward", {}, signup.data.token)));
        assert.ok(claims.every((result) => result.status === 200));
        assert.equal(claims.filter((result) => result.data.ok).length, 1, "daily reward credits once");
        const after = await request("/api/app/home", undefined, signup.data.token);
        const credit = claims.find((result) => result.data.ok)!.data.amount;
        assert.ok(Math.abs(after.data.wallet.balance - before.data.wallet.balance - credit) < 0.00001);
        assert.equal(after.data.dailyReward.claimed, true);
        const activations = await Promise.all(Array.from({ length: 3 }, () =>
          request("/api/app/trial", {}, signup.data.token)));
        assert.ok(activations.every((result) => result.status === 200 && result.data.ok));
        assert.equal(activations.filter((result) => !result.data.alreadyActive).length, 1);
        const trial = await pool.query("SELECT trial_started_at FROM profiles WHERE id=$1", [signup.data.user.id]);
        await pool.query("UPDATE profiles SET trial_expires_at=now()-interval '1 day' WHERE id=$1", [signup.data.user.id]);
        const expired = await request("/api/app/trial", {}, signup.data.token);
        assert.equal(expired.data.reason, "TRIAL_ALREADY_USED", "an expired trial cannot restart");
        const unchanged = await pool.query("SELECT trial_started_at FROM profiles WHERE id=$1", [signup.data.user.id]);
        assert.equal(unchanged.rows[0].trial_started_at.getTime(), trial.rows[0].trial_started_at.getTime());
      }
      if (!referralCode) referralCode = stored.rows[0].referral_code;
      else assert.equal(stored.rows[0].referred_by, ids[0]);
      assert.equal((await request("/api/auth/logout", {}, signup.data.token)).status, 200);
      assert.equal((await request("/api/app/home", undefined, signup.data.token)).status, 401);
      const login = await request("/api/auth/login", { email, password });
      assert.equal(login.status, 200);
      assert.equal(login.data.user.id, signup.data.user.id);
      const session = await request("/api/auth/session", undefined, login.data.token);
      assert.equal(session.data.session?.user.id, signup.data.user.id);
      assert.equal((await request("/api/app/home", undefined, login.data.token)).status, 200);
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
      for (const table of ["rewards", "daily_login_rewards", "sessions", "user_roles", "wallets"]) {
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
