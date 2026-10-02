-- Fields required by the existing application backend.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wheel_spins_available integer NOT NULL DEFAULT 0;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_withdraw boolean NOT NULL DEFAULT true;

-- One ledger entry is the idempotency key for each maturity payout.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_investment_return_reference_uidx
  ON transactions(reference_id)
  WHERE type = 'investment_return';

-- Keep the background due scan efficient as the investment table grows.
CREATE INDEX IF NOT EXISTS investments_maturity_due_idx
  ON investments (matures_at)
  WHERE status = 'active' AND settled_at IS NULL;