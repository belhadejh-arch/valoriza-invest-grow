-- Independent administrator identities: no FK to customer users or wallets.
CREATE TABLE IF NOT EXISTS admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_accounts_email_unique ON admin_accounts (lower(email));

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_account_id uuid NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions (expires_at);

-- Preserve historical customer-linked actors; new actions use separate identities.
ALTER TABLE admin_actions ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS admin_account_id uuid REFERENCES admin_accounts(id);
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS reviewed_by_admin_account_id uuid REFERENCES admin_accounts(id);
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS reviewed_by_admin_account_id uuid REFERENCES admin_accounts(id);