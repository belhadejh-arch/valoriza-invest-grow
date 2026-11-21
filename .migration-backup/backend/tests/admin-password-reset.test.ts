import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { ensureAdminPasswordResetSchema } from "../src/safe-schema.js";
import { resetPrimaryAdminPasswordWithCode } from "../src/admin-password-reset.js";
import { hashPassword, verifyPassword } from "../src/auth.js";
import { pool, withTransaction } from "../src/db.js";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

test("admin reset consumes its code once, preserves the wallet, and revokes sessions", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  await ensureAdminPasswordResetSchema();

  const nonce = randomUUID();
  const email = `reset-admin-${nonce}@example.invalid`;
  const username = `reset-admin-${nonce}`;
  const referralCode = `RA${nonce.replace(/-/g, "").slice(0, 10)}`;
  const configuredCode = randomBytes(32).toString("base64url");
  const oldPassword = randomBytes(18).toString("base64url");
  const newPassword = randomBytes(18).toString("base64url");
  const validAttemptKey = `reset-test-valid-${nonce}`;
  const reusedAttemptKey = `reset-test-reused-${nonce}`;
  const failedAttemptKey = `reset-test-failed-${nonce}`;
  const attemptHashes = [validAttemptKey, reusedAttemptKey, failedAttemptKey].map(sha256);
  const codeHash = sha256(configuredCode);
  let userId: string | undefined;

  try {
    const user = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id",
      [email, await hashPassword(oldPassword)],
    );
    userId = user.rows[0].id;
    await pool.query(
      "INSERT INTO profiles (id, username, email, referral_code) VALUES ($1,$2,$3,$4)",
      [userId, username, email, referralCode],
    );
    await pool.query("INSERT INTO wallets (user_id, balance) VALUES ($1, 19.25)", [userId]);
    await pool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')", [userId]);
    await pool.query("INSERT INTO admin_users (user_id) VALUES ($1)", [userId]);
    await pool.query(
      "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,now()+interval '1 day')",
      [userId, sha256(`reset-session-${nonce}`)],
    );

    const reset = (code: string, attemptKey: string) =>
      withTransaction((client) =>
        resetPrimaryAdminPasswordWithCode(client, {
          adminEmail: email,
          configuredCode,
          code,
          newPassword,
          attemptKey,
        }),
      );

    assert.deepEqual(await reset(configuredCode, validAttemptKey), { status: "success" });
    assert.deepEqual(await reset(configuredCode, reusedAttemptKey), { status: "code_already_used" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.deepEqual(await reset("incorrect-reset-code", failedAttemptKey), {
        status: "invalid_code",
      });
    }
    assert.deepEqual(await reset(configuredCode, failedAttemptKey), { status: "rate_limited" });

    const stored = await pool.query<{
      password_hash: string;
      balance: string;
      active_sessions: string;
    }>(
      `SELECT u.password_hash, w.balance::text,
              (SELECT count(*)::text FROM sessions s WHERE s.user_id=u.id) AS active_sessions
       FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.id=$1`,
      [userId],
    );
    assert.equal(await verifyPassword(oldPassword, stored.rows[0].password_hash), false);
    assert.equal(await verifyPassword(newPassword, stored.rows[0].password_hash), true);
    assert.equal(Number(stored.rows[0].balance), 19.25);
    assert.equal(stored.rows[0].active_sessions, "0");
  } finally {
    if (userId) await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    await pool.query("DELETE FROM admin_password_reset_uses WHERE code_hash=$1", [codeHash]);
    await pool.query(
      "DELETE FROM admin_password_reset_attempts WHERE attempt_key=ANY($1::text[])",
      [attemptHashes],
    );
  }
});
