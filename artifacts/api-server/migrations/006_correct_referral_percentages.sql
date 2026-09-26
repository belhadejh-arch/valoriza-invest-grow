-- Referral rate values are whole percentages: 8 means 8%, not 0.08%.
-- Correct databases that retained legacy fractional values or lost the settings.
INSERT INTO platform_settings (key, value, description_ar, is_public) VALUES
  ('referral_rate_l1', '8', 'عمولة المستوى الأول', true),
  ('referral_rate_l2', '4', 'عمولة المستوى الثاني', true),
  ('referral_rate_l3', '1', 'عمولة المستوى الثالث', true)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, is_public = EXCLUDED.is_public, updated_at = now();