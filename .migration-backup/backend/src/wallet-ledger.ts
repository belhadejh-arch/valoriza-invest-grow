import type { PoolClient } from "pg";

// The imported transactions table may be an unrelated cash ledger. Keep its
// historical rows and constraints intact; wallet events have their own contract.
export const walletLedgerSchemaSql = `
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  amount numeric(18,4) NOT NULL,
  balance_before numeric(18,4) NOT NULL,
  balance_after numeric(18,4) NOT NULL CHECK (balance_after >= 0),
  reference_id text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_transactions_user_created_idx
  ON wallet_transactions(user_id, created_at DESC);
ALTER TABLE referral_commissions
  ADD COLUMN IF NOT EXISTS wallet_transaction_id uuid REFERENCES wallet_transactions(id);
`;

// Caller owns the transaction so related receipts/reviews roll back together.
export async function recordWalletChange(
  client: PoolClient,
  userId: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string,
): Promise<{ balance: number; transactionId: string }> {
  if (!Number.isFinite(amount) || amount === 0) {
    throw Object.assign(new Error("INVALID_AMOUNT"), { status: 400 });
  }
  const wallet = await client.query<{ balance_before: string; balance_after: string }>(
    `SELECT balance::text AS balance_before,
            (balance + $2::numeric)::text AS balance_after
     FROM wallets WHERE user_id=$1 FOR UPDATE`,
    [userId, amount],
  );
  if (wallet.rowCount !== 1) {
    throw Object.assign(new Error("WALLET_NOT_FOUND"), { status: 404 });
  }
  const { balance_before: before, balance_after: after } = wallet.rows[0];
  if (Number(after) < 0) {
    throw Object.assign(new Error("INSUFFICIENT_BALANCE"), { status: 400 });
  }
  await client.query(
    `UPDATE wallets SET balance=$1::numeric,
       total_earned=total_earned+CASE WHEN $2::numeric>0 AND $3 NOT IN ('deposit','withdrawal_refund')
                                    THEN $2::numeric ELSE 0::numeric END,
       total_deposited=total_deposited+CASE WHEN $3='deposit' THEN $2::numeric ELSE 0::numeric END,
       total_withdrawn=total_withdrawn+CASE WHEN $3='withdrawal' THEN -$2::numeric
                                         WHEN $3='withdrawal_refund' THEN -$2::numeric ELSE 0::numeric END,
       updated_at=now()
     WHERE user_id=$4`,
    [after, amount, type, userId],
  );
  const transaction = await client.query<{ id: string }>(
    `INSERT INTO wallet_transactions
       (user_id,type,amount,balance_before,balance_after,reference_id,description)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [userId, type, amount, before, after, referenceId ?? null, description],
  );
  return { balance: Number(after), transactionId: transaction.rows[0].id };
}
