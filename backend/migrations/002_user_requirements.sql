-- Migration 002: User Requirements Updates

-- 1. Profiles additions: wheel_spins_available and can_withdraw
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wheel_spins_available integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_withdraw boolean NOT NULL DEFAULT true;

-- 2. Platform settings defaults
INSERT INTO platform_settings (key, value, description_ar, is_public) VALUES
  ('telegram_group_url', 'https://t.me/valoriza_official', 'رابط مجموعة Telegram الرسمية', true),
  ('whatsapp_group_url', 'https://chat.whatsapp.com/valoriza', 'رابط مجموعة WhatsApp الرسمية', true),
  ('withdrawals_enabled', 'true', 'تفعيل السحب لجميع المستخدمين (عام)', true),
  ('tasks_enabled', 'true', 'تفعيل المهام اليومية (عام)', true),
  ('min_deposit', '10', 'الحد الأدنى للإيداع بالدولار', true),
  ('min_withdrawal', '6', 'الحد الأدنى للسحب بالدولار', true),
  ('withdrawal_fee_percent', '10', 'نسبة رسوم السحب %', true),
  ('withdrawal_start_hour', '09:00', 'بداية وقت السحب', true),
  ('withdrawal_end_hour', '16:00', 'نهاية وقت السحب', true),
  ('min_investment', '5', 'الحد الأدنى للاستثمار', true),
  ('daily_login_reward', '0.11', 'مكافأة تسجيل الدخول اليومية', true),
  ('referral_rate_l1', '0.08', 'عمولة المستوى الأول (8%)', true),
  ('referral_rate_l2', '0.04', 'عمولة المستوى الثاني (4%)', true),
  ('referral_rate_l3', '0.01', 'عمولة المستوى الثالث (1%)', true)
ON CONFLICT (key) DO NOTHING;

-- 3. Lucky Wheel Configs: Exactly 9 items, English numbers, 1 emoji each, exact weights
DELETE FROM lucky_wheel_configs;

INSERT INTO lucky_wheel_configs (label_ar, prize_type, prize_value, probability, icon, accent, sort_order, is_active) VALUES
  ('حظ سعيد', 'none', 0, 25, '🍀', 'blue', 1, true),
  ('حظ سعيد', 'none', 0, 25, '🎯', 'blue', 2, true),
  ('0.5 دولار', 'cash', 0.5, 10, '💵', 'green', 3, true),
  ('1 دولار', 'cash', 1.0, 10, '💰', 'green', 4, true),
  ('2 دولار', 'cash', 2.0, 5, '🪙', 'purple', 5, true),
  ('هاتف نقال', 'item', 0, 0, '📱', 'red', 6, true),
  ('48 دولار', 'cash', 48.0, 0, '💎', 'gold', 7, true),
  ('4 دولار', 'cash', 4.0, 0, '🎁', 'purple', 8, true),
  ('مستوى VIP', 'vip', 0, 0, '👑', 'gold', 9, true);

-- 4. Tasks: Exactly 14 tasks with provided YouTube video links
DELETE FROM tasks;

INSERT INTO tasks (task_number, title, description, youtube_id, duration_seconds, sort_order, is_active) VALUES
  (1, 'مهمة إعلانية 1', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', '66Z_Rgwrh7E', 10, 1, true),
  (2, 'مهمة إعلانية 2', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', '-RuSqMYcQK0', 10, 2, true),
  (3, 'مهمة إعلانية 3', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'z4LaVLItrKc', 10, 3, true),
  (4, 'مهمة إعلانية 4', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'eaPCE8XqaRA', 10, 4, true),
  (5, 'مهمة إعلانية 5', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'DhRKKs71xP8', 10, 5, true),
  (6, 'مهمة إعلانية 6', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'ygLLiNT2AIQ', 10, 6, true),
  (7, 'مهمة إعلانية 7', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'Tlnl6w8OtQs', 10, 7, true),
  (8, 'مهمة إعلانية 8', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'SfXQw0hu73Y', 10, 8, true),
  (9, 'مهمة إعلانية 9', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'ELF0AM4Jrm0', 10, 9, true),
  (10, 'مهمة إعلانية 10', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', '3cQ-9D8ofHw', 10, 10, true),
  (11, 'مهمة إعلانية 11', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'L8EZdwAbjQA', 10, 11, true),
  (12, 'مهمة إعلانية 12', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'I3-lMkyTsc8', 10, 12, true),
  (13, 'مهمة إعلانية 13', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', '39f20_0tgz0', 10, 13, true),
  (14, 'مهمة إعلانية 14', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'hmSxy2JKTPw', 10, 14, true);

-- 5. Backfill 3-level referrals tree from profiles
INSERT INTO referrals (referrer_id, referred_id, level)
SELECT referred_by, id, 1 FROM profiles WHERE referred_by IS NOT NULL
ON CONFLICT (referrer_id, referred_id) DO NOTHING;

INSERT INTO referrals (referrer_id, referred_id, level)
SELECT p2.referred_by, p1.id, 2
FROM profiles p1
JOIN profiles p2 ON p1.referred_by = p2.id
WHERE p2.referred_by IS NOT NULL
ON CONFLICT (referrer_id, referred_id) DO NOTHING;

INSERT INTO referrals (referrer_id, referred_id, level)
SELECT p3.referred_by, p1.id, 3
FROM profiles p1
JOIN profiles p2 ON p1.referred_by = p2.id
JOIN profiles p3 ON p2.referred_by = p3.id
WHERE p3.referred_by IS NOT NULL
ON CONFLICT (referrer_id, referred_id) DO NOTHING;
