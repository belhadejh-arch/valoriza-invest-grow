import { createHash, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { EMAIL_FORMAT_CHARACTERS, hashPassword, normalizeEmail } from "./auth.js";

const RESET_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

export type AdminPasswordResetResult =
  | { status: "success" }
  | { status: "invalid_code" }
  | { status: "rate_limited" }
  | { status: "code_already_used" }
  | { status: "admin_unavailable" };

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Resets only the configured existing admin account. The reset code is stored
 * only as a digest and is consumed in the same transaction as the password
 * update and session revocation.
 */
export async function resetPrimaryAdminPasswordWithCode(
  client: PoolClient,
  input: {
    adminEmail: string;
    configuredCode: string;
    code: string;
    newPassword: string;
    attemptKey: string;
  },
): Promise<AdminPasswordResetResult> {
  if (Buffer.byteLength(input.configuredCode, "utf8") < 32) {
    throw new Error("ADMIN_RESET_NOT_CONFIGURED");
  }
  if (input.newPassword.length < 12 || Buffer.byteLength(input.newPassword, "utf8") > 72) {
    throw new Error("INVALID_RESET_PASSWORD");
  }

  const codeHash = sha256(input.code);
  const configuredCodeHash = sha256(input.configuredCode);
  const codeMatches = timingSafeEqual(
    Buffer.from(codeHash, "hex"),
    Buffer.from(configuredCodeHash, "hex"),
  );
  const attemptHash = sha256(input.attemptKey || "unknown");

  // Serialize use of the same code across serverless instances and separately
  // serialize failed-attempt accounting for this client.
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `admin-reset-code:${codeHash}`,
  ]);
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `admin-reset-attempt:${attemptHash}`,
  ]);
  await client.query(
    `INSERT INTO admin_password_reset_attempts (attempt_key)
     VALUES ($1) ON CONFLICT (attempt_key) DO NOTHING`,
    [attemptHash],
  );
  const attemptResult = await client.query<{
    attempts: number;
    window_started_at: Date;
    locked_until: Date | null;
    database_now: Date;
  }>(
    `SELECT attempts, window_started_at, locked_until, now() AS database_now
     FROM admin_password_reset_attempts WHERE attempt_key=$1 FOR UPDATE`,
    [attemptHash],
  );
  const attempt = attemptResult.rows[0];
  if (!attempt) throw new Error("ADMIN_RESET_ATTEMPT_STATE_MISSING");

  const now = attempt.database_now.getTime();
  if (attempt.locked_until && attempt.locked_until.getTime() > now) {
    return { status: "rate_limited" };
  }
  const windowExpired =
    now - attempt.window_started_at.getTime() >= RESET_WINDOW_MINUTES * 60_000;
  const lockExpired = Boolean(attempt.locked_until && attempt.locked_until.getTime() <= now);
  if (windowExpired || lockExpired) {
    await client.query(
      `UPDATE admin_password_reset_attempts
       SET attempts=0, window_started_at=now(), locked_until=NULL
       WHERE attempt_key=$1`,
      [attemptHash],
    );
  }

  if (!codeMatches) {
    await client.query(
      `UPDATE admin_password_reset_attempts
       SET attempts=attempts+1,
           locked_until=CASE
             WHEN attempts+1 >= $2 THEN now() + ($3 || ' minutes')::interval
             ELSE NULL
           END
       WHERE attempt_key=$1`,
      [attemptHash, MAX_FAILED_ATTEMPTS, RESET_WINDOW_MINUTES],
    );
    return { status: "invalid_code" };
  }

  const email = normalizeEmail(input.adminEmail);
  const account = await client.query<{ id: string }>(
    `SELECT u.id
     FROM users u
     JOIN profiles p ON p.id=u.id
     WHERE lower(btrim(translate(u.email, $2, '')))=$1
     FOR UPDATE OF u`,
    [email, EMAIL_FORMAT_CHARACTERS],
  );
  if (account.rowCount !== 1) return { status: "admin_unavailable" };

  const consumed = await client.query(
    `INSERT INTO admin_password_reset_uses (code_hash)
     VALUES ($1) ON CONFLICT (code_hash) DO NOTHING RETURNING code_hash`,
    [configuredCodeHash],
  );
  if (!consumed.rowCount) return { status: "code_already_used" };

  const passwordHash = await hashPassword(input.newPassword);
  await client.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
    passwordHash,
    account.rows[0].id,
  ]);
  await client.query("DELETE FROM sessions WHERE user_id=$1", [account.rows[0].id]);
  await client.query("DELETE FROM admin_password_reset_attempts WHERE attempt_key=$1", [
    attemptHash,
  ]);
  return { status: "success" };
}
