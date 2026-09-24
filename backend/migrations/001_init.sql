CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  email text NOT NULL,
  phone text,
  avatar_url text,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  vip_level integer NOT NULL DEFAULT 0,
  vip_expires_at timestamptz,
  trial_active boolean NOT NULL DEFAULT false,
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance numeric(18,4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_deposited numeric(18,4) NOT NULL DEFAULT 0,
  total_withdrawn numeric(18,4) NOT NULL DEFAULT 0,
  total_earned numeric(18,4) NOT NULL DEFAULT 0,
  invested_balance numeric(18,4) NOT NULL DEFAULT 0,
  team_income numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'user')) DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  amount numeric(18,4) NOT NULL,
  balance_before numeric(18,4) NOT NULL,
  balance_after numeric(18,4) NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(18,4) NOT NULL CHECK (amount > 0),
  network text NOT NULL CHECK (network IN ('ERC20', 'BEP20', 'TRC20')),
  deposit_address text NOT NULL,
  screenshot_url text NOT NULL,
  tx_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawal_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  network text NOT NULL CHECK (network IN ('ERC20', 'BEP20', 'TRC20')),
  address text NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(18,4) NOT NULL CHECK (amount > 0),
  fee numeric(18,4) NOT NULL DEFAULT 0,
  net_amount numeric(18,4) NOT NULL,
  network text NOT NULL CHECK (network IN ('ERC20', 'BEP20', 'TRC20')),
  address text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investment_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  tagline_ar text,
  duration_days integer NOT NULL,
  profit_percent numeric(8,4) NOT NULL,
  min_amount numeric(18,4) NOT NULL DEFAULT 5,
  accent text NOT NULL DEFAULT 'blue',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES investment_funds(id),
  amount numeric(18,4) NOT NULL CHECK (amount > 0),
  expected_profit numeric(18,4) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  matures_at timestamptz NOT NULL,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vip_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric(18,4) NOT NULL,
  daily_profit numeric(18,4) NOT NULL,
  daily_tasks integer NOT NULL,
  task_reward numeric(18,4) NOT NULL,
  duration_days integer NOT NULL DEFAULT 365,
  accent text NOT NULL DEFAULT 'blue',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_vip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vip_package_id uuid NOT NULL REFERENCES vip_packages(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  UNIQUE (user_id, vip_package_id, started_at)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number integer NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  youtube_id text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completion_date date NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'REWARDED',
  reward numeric(18,4) NOT NULL DEFAULT 0,
  watched_seconds integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, task_id, completion_date)
);

CREATE TABLE IF NOT EXISTS daily_login_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_date date NOT NULL,
  amount numeric(18,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_date)
);

CREATE TABLE IF NOT EXISTS lucky_wheel_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_ar text NOT NULL,
  prize_type text NOT NULL,
  prize_value numeric(18,4) NOT NULL DEFAULT 0,
  probability numeric(8,4) NOT NULL DEFAULT 0,
  icon text,
  accent text NOT NULL DEFAULT 'blue',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS lucky_wheel_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config_id uuid REFERENCES lucky_wheel_configs(id),
  spin_date date NOT NULL,
  prize_value numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source text NOT NULL,
  amount numeric(18,4) NOT NULL,
  description_ar text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_id)
);

CREATE TABLE IF NOT EXISTS referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_transaction_id uuid REFERENCES transactions(id),
  level integer NOT NULL,
  amount numeric(18,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_ar text NOT NULL,
  body_ar text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_service_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_ar text NOT NULL,
  sublabel_ar text,
  platform text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description_ar text,
  is_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deposits_status_created_idx ON deposits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawals_status_created_idx ON withdrawals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS investments_user_created_idx ON investments(user_id, created_at DESC);