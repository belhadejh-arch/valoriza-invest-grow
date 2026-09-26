-- Match user-scoped recent activity queries and date-scoped task lookups.
CREATE INDEX IF NOT EXISTS deposits_user_created_idx
  ON deposits (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawals_user_created_idx
  ON withdrawals (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rewards_user_created_idx
  ON rewards (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS task_completions_user_date_idx
  ON task_completions (user_id, completion_date);
CREATE INDEX IF NOT EXISTS referrals_referrer_created_idx
  ON referrals (referrer_id, created_at DESC);

-- Admin lists fetch the most recent rows regardless of status.
CREATE INDEX IF NOT EXISTS deposits_created_idx
  ON deposits (created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawals_created_idx
  ON withdrawals (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_actions_created_idx
  ON admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_created_idx
  ON profiles (created_at DESC);