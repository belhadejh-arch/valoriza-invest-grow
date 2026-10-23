import type { PoolClient } from "pg";

export const dailyRewardSchemaSql = `
  ALTER TABLE daily_login_rewards
    ADD COLUMN IF NOT EXISTS balance_before numeric(18,4),
    ADD COLUMN IF NOT EXISTS balance_after numeric(18,4);
`;

export async function creditDailyReward(client: PoolClient, userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error("DAILY_REWARD_UNAVAILABLE"), { status: 503 });
  }
  // Serialize claims even on legacy schemas lacking a daily unique constraint.
  const wallet = await client.query<{ balance: string }>(
    "SELECT balance::text FROM wallets WHERE user_id=$1 FOR UPDATE",
    [userId],
  );
  if (wallet.rowCount !== 1) {
    throw Object.assign(new Error("DAILY_REWARD_UNAVAILABLE"), { status: 503 });
  }
  const existing = await client.query(
    "SELECT id FROM daily_login_rewards WHERE user_id=$1 AND reward_date=current_date",
    [userId],
  );
  if (existing.rowCount) return { ok: false, amount: 0 };
  const receipt = await client.query<{ id: string }>(
    `INSERT INTO daily_login_rewards (user_id,reward_date,amount,balance_before,balance_after)
     VALUES ($1,current_date,$2,$3::numeric,$3::numeric+$2::numeric)
     ON CONFLICT DO NOTHING RETURNING id`,
    [userId, amount, wallet.rows[0].balance],
  );
  if (!receipt.rowCount) return { ok: false, amount: 0 };
  await client.query(
    `UPDATE wallets SET balance=balance+$2::numeric,
     total_earned=total_earned+$2::numeric,updated_at=now() WHERE user_id=$1`,
    [userId, amount],
  );
  // The daily receipt is the financial audit record for this credit. Do not
  // weaken unrelated legacy cash-ledger constraints or invent counterparties.
  await client.query(
    `INSERT INTO rewards (user_id,source,amount,description_ar,reference_id)
     VALUES ($1,'daily_login',$2,'مكافأة تسجيل الدخول اليومية',$3)`,
    [userId, amount, receipt.rows[0].id],
  );
  return { ok: true, amount };
}
