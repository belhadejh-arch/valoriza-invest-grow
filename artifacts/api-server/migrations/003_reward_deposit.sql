-- Persistent, zero-initialized wheel chance balance.
CREATE TABLE IF NOT EXISTS user_wheel_chances (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  chances integer NOT NULL DEFAULT 0 CHECK (chances >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO user_wheel_chances (user_id, chances)
SELECT id, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Proof metadata only; image bytes remain in the private App Storage bucket.
CREATE TABLE IF NOT EXISTS deposit_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deposits ADD COLUMN IF NOT EXISTS proof_id uuid REFERENCES deposit_proofs(id);
CREATE UNIQUE INDEX IF NOT EXISTS deposits_proof_id_unique ON deposits(proof_id) WHERE proof_id IS NOT NULL;

-- Correct legacy fractional-percent defaults and provide network addresses and platform timezone.
INSERT INTO platform_settings (key, value, description_ar, is_public) VALUES
  ('referral_rate_l1', '8', 'عمولة المستوى الأول', true),
  ('referral_rate_l2', '4', 'عمولة المستوى الثاني', true),
  ('referral_rate_l3', '1', 'عمولة المستوى الثالث', true),
  ('deposit_address_TRC20', 'THT9uwaJnzjFXxjcq8mDfioEb4xNPjnGP6', 'عنوان إيداع USDT TRC20', true),
  ('deposit_address_ERC20', '0x2b84FD5e05E11148Bc600Df7060a506f3D0E682b', 'عنوان إيداع USDT ERC20', true),
  ('deposit_address_BEP20', '0x2b84FD5e05E11148Bc600Df7060a506f3D0E682b', 'عنوان إيداع USDT BEP20', true),
  ('platform_timezone', 'UTC', 'المنطقة الزمنية للمنصة', true),
  ('daily_spins', '3', 'فرص عجلة الحظ عند تفعيل VIP', true)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, description_ar = EXCLUDED.description_ar, is_public = EXCLUDED.is_public, updated_at = now();

-- Preserve an admin-configured reward while ensuring fresh installs have a default.
INSERT INTO platform_settings (key, value, description_ar, is_public)
VALUES ('daily_login_reward', '0.11', 'مكافأة تسجيل الدخول اليومية', true)
ON CONFLICT (key) DO NOTHING;