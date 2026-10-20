CREATE TABLE IF NOT EXISTS team_milestone_claims (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  threshold integer NOT NULL CHECK (threshold IN (3, 6, 10, 25, 50, 100, 250)),
  reward_kind text NOT NULL CHECK (reward_kind IN ('cash', 'vip')),
  reward_amount numeric(18,4) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  reward_id uuid REFERENCES rewards(id) ON DELETE SET NULL,
  vip_package_id uuid REFERENCES vip_packages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, threshold),
  CHECK (
    (threshold = 250 AND reward_kind = 'vip' AND reward_amount = 0)
    OR
    (threshold <> 250 AND reward_kind = 'cash' AND reward_amount > 0)
  )
);
