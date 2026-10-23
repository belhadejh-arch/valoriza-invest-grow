import type { PoolClient } from "pg";
import {
  EMAIL_FORMAT_CHARACTERS,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "./auth.js";

/**
 * Called only with an explicit operator-configured recovery flag, inside a
 * transaction. Never creates an account or changes its balances or ownership.
 */
export async function recoverPrimaryAdmin(
  client: PoolClient,
  input: { previousEmail: string; email: string; password: string },
): Promise<boolean> {
  const previousEmail = normalizeEmail(input.previousEmail);
  const email = normalizeEmail(input.email);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!validEmail.test(previousEmail) || !validEmail.test(email)) {
    throw new Error("Admin recovery requires valid ADMIN_PREVIOUS_EMAIL and ADMIN_EMAIL.");
  }
  if (input.password.length < 6 || Buffer.byteLength(input.password, "utf8") > 72) {
    throw new Error("Admin recovery requires a password of 6 characters to 72 UTF-8 bytes.");
  }

  // Serialize recovery and registration for the destination email.
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [email]);
  const accounts = await client.query<{
    id: string;
    email: string;
    password_hash: string;
    normalized_email: string;
  }>(
    `SELECT id, email, password_hash,
            lower(btrim(translate(email, $3, ''))) AS normalized_email
     FROM users
     WHERE lower(btrim(translate(email, $3, ''))) IN ($1, $2)
     FOR UPDATE`,
    [previousEmail, email, EMAIL_FORMAT_CHARACTERS],
  );
  const previous = accounts.rows.filter((row) => row.normalized_email === previousEmail);
  const destination = accounts.rows.filter((row) => row.normalized_email === email);
  if (previous.length > 1 || destination.length > 1) {
    throw new Error("Admin recovery stopped: multiple accounts match the configured email.");
  }
  if (previous[0] && destination[0] && previous[0].id !== destination[0].id) {
    throw new Error("Admin recovery stopped: the destination email belongs to another account.");
  }
  const account = previous[0] ?? destination[0];
  if (!account) {
    throw new Error("Admin recovery stopped: the existing admin account was not found.");
  }
  const membership = await client.query(
    `SELECT user_id FROM user_roles WHERE user_id=$1 AND role='admin'
     UNION SELECT user_id FROM admin_users WHERE user_id=$1`,
    [account.id],
  );
  if (!membership.rowCount) {
    throw new Error("Admin recovery stopped: the selected account is not already an admin.");
  }
  const profile = await client.query<{ email: string }>(
    "SELECT email FROM profiles WHERE id=$1 FOR UPDATE",
    [account.id],
  );
  if (!profile.rowCount) {
    throw new Error("Admin recovery stopped: the admin profile is missing.");
  }
  const passwordMatches = await verifyPassword(input.password, account.password_hash).catch(
    () => false,
  );
  if (account.email === email && profile.rows[0].email === email && passwordMatches) {
    return false;
  }

  const passwordHash = await hashPassword(input.password);
  await client.query("UPDATE users SET email=$1, password_hash=$2 WHERE id=$3", [
    email, passwordHash, account.id,
  ]);
  await client.query("UPDATE profiles SET email=$1 WHERE id=$2", [email, account.id]);
  await client.query("DELETE FROM sessions WHERE user_id=$1", [account.id]);
  return true;
}
