-- One award per member and threshold; the award and wallet credit commit together.
CREATE TABLE IF NOT EXISTS referral_milestone_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  threshold integer NOT NULL CHECK (threshold IN (3, 6, 10, 25, 50, 100, 250)),
  reward_amount numeric(18,4) NOT NULL DEFAULT 0,
  vip_level_granted integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, threshold)
);

-- Administrative VIP grants do not create a purchase in user_vip. Keep a
-- permanent activation marker so a later downgrade cannot undo a cumulative
-- direct-referral count.
CREATE TABLE IF NOT EXISTS vip_admin_activations (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);

-- Existing indefinite VIP grants were recorded only on the profile.
INSERT INTO vip_admin_activations (user_id)
SELECT id FROM profiles WHERE vip_level > 0 AND vip_expires_at IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- A later administrative downgrade does not erase a past activation.
INSERT INTO vip_admin_activations (user_id)
SELECT DISTINCT target_user_id FROM admin_actions
WHERE action = 'SET_VIP_LEVEL'
  AND target_user_id IS NOT NULL
  AND details->>'vipLevel' ~ '^[1-9][0-9]*$'
ON CONFLICT (user_id) DO NOTHING;