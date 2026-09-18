
-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.tx_type AS ENUM ('deposit','withdrawal','withdrawal_fee','withdrawal_refund','investment','investment_return','vip_purchase','task_reward','lucky_wheel_reward','referral_commission','daily_login_reward','admin_adjustment');
CREATE TYPE public.tx_status AS ENUM ('pending','completed','failed','cancelled');
CREATE TYPE public.request_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.network_type AS ENUM ('ERC20','BEP20','TRC20');
CREATE TYPE public.investment_status AS ENUM ('active','completed','cancelled');

-- ========== HELPERS ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ========== ROLES ==========
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  email text NOT NULL,
  phone text,
  avatar_url text,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  vip_level int NOT NULL DEFAULT 0,
  vip_expires_at timestamptz,
  trial_active boolean NOT NULL DEFAULT false,
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR referred_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== WALLETS ==========
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(18,4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_deposited numeric(18,4) NOT NULL DEFAULT 0,
  total_withdrawn numeric(18,4) NOT NULL DEFAULT 0,
  total_earned numeric(18,4) NOT NULL DEFAULT 0,
  invested_balance numeric(18,4) NOT NULL DEFAULT 0,
  team_income numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own wallet" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== TRANSACTIONS (LEDGER) ==========
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.tx_type NOT NULL,
  status public.tx_status NOT NULL DEFAULT 'completed',
  amount numeric(18,4) NOT NULL,
  balance_before numeric(18,4) NOT NULL,
  balance_after numeric(18,4) NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_idx ON public.transactions(user_id, created_at DESC);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ========== DEPOSITS ==========
CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network public.network_type NOT NULL,
  amount numeric(18,4) NOT NULL CHECK (amount > 0),
  deposit_address text NOT NULL,
  tx_hash text,
  status public.request_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own deposits" ON public.deposits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER deposits_updated BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== WITHDRAWAL ADDRESSES ==========
CREATE TABLE public.withdrawal_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  network public.network_type NOT NULL,
  address text NOT NULL UNIQUE,
  locked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawal_addresses TO authenticated;
GRANT ALL ON public.withdrawal_addresses TO service_role;
ALTER TABLE public.withdrawal_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own withdrawal address" ON public.withdrawal_addresses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER withdrawal_addresses_updated BEFORE UPDATE ON public.withdrawal_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== WITHDRAWALS ==========
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network public.network_type NOT NULL,
  address text NOT NULL,
  amount numeric(18,4) NOT NULL CHECK (amount > 0),
  fee numeric(18,4) NOT NULL DEFAULT 0,
  net_amount numeric(18,4) NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER withdrawals_updated BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== INVESTMENT FUNDS ==========
CREATE TABLE public.investment_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  tagline_ar text,
  duration_days int NOT NULL,
  profit_percent numeric(6,2) NOT NULL,
  min_amount numeric(18,4) NOT NULL DEFAULT 5,
  accent text NOT NULL DEFAULT 'blue',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investment_funds TO anon, authenticated;
GRANT ALL ON public.investment_funds TO service_role;
ALTER TABLE public.investment_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funds are public" ON public.investment_funds FOR SELECT TO anon, authenticated USING (is_active);

-- ========== INVESTMENTS ==========
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES public.investment_funds(id),
  amount numeric(18,4) NOT NULL CHECK (amount > 0),
  expected_profit numeric(18,4) NOT NULL,
  status public.investment_status NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  matures_at timestamptz NOT NULL,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own investments" ON public.investments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ========== VIP PACKAGES ==========
CREATE TABLE public.vip_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level int NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric(18,4) NOT NULL,
  daily_profit numeric(18,4) NOT NULL,
  daily_tasks int NOT NULL,
  task_reward numeric(18,4) NOT NULL,
  duration_days int NOT NULL DEFAULT 365,
  accent text NOT NULL DEFAULT 'blue',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_packages TO anon, authenticated;
GRANT ALL ON public.vip_packages TO service_role;
ALTER TABLE public.vip_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vip packages are public" ON public.vip_packages FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.user_vip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.vip_packages(id),
  level int NOT NULL,
  price_paid numeric(18,4) NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.user_vip TO authenticated;
GRANT ALL ON public.user_vip TO service_role;
ALTER TABLE public.user_vip ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own vip" ON public.user_vip FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ========== TASKS ==========
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  description_ar text,
  video_url text,
  thumbnail_url text,
  duration_seconds int NOT NULL DEFAULT 10,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks readable" ON public.tasks FOR SELECT TO authenticated USING (is_active);

CREATE TABLE public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reward numeric(18,4) NOT NULL,
  completion_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  watched_seconds int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id, completion_date)
);
GRANT SELECT ON public.task_completions TO authenticated;
GRANT ALL ON public.task_completions TO service_role;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own completions" ON public.task_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ========== DAILY LOGIN REWARDS ==========
CREATE TABLE public.daily_login_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  amount numeric(18,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_date)
);
GRANT SELECT ON public.daily_login_rewards TO authenticated;
GRANT ALL ON public.daily_login_rewards TO service_role;
ALTER TABLE public.daily_login_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own daily rewards" ON public.daily_login_rewards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ========== LUCKY WHEEL ==========
CREATE TABLE public.lucky_wheel_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_ar text NOT NULL,
  prize_type text NOT NULL,
  prize_value numeric(18,4) NOT NULL DEFAULT 0,
  probability numeric(6,3) NOT NULL DEFAULT 0,
  icon text,
  accent text NOT NULL DEFAULT 'blue',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.lucky_wheel_configs TO anon, authenticated;
GRANT ALL ON public.lucky_wheel_configs TO service_role;
ALTER TABLE public.lucky_wheel_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wheel config public" ON public.lucky_wheel_configs FOR SELECT TO anon, authenticated USING (is_active);

CREATE TABLE public.lucky_wheel_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id uuid REFERENCES public.lucky_wheel_configs(id),
  prize_label text NOT NULL,
  prize_value numeric(18,4) NOT NULL DEFAULT 0,
  spin_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lucky_wheel_spins TO authenticated;
GRANT ALL ON public.lucky_wheel_spins TO service_role;
ALTER TABLE public.lucky_wheel_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own spins" ON public.lucky_wheel_spins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ========== REWARDS ==========
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  amount numeric(18,4) NOT NULL,
  description_ar text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own rewards" ON public.rewards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ========== REFERRALS ==========
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level int NOT NULL CHECK (level BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_id)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level int NOT NULL CHECK (level BETWEEN 1 AND 3),
  rate numeric(6,4) NOT NULL,
  base_amount numeric(18,4) NOT NULL,
  amount numeric(18,4) NOT NULL,
  origin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_commissions TO authenticated;
GRANT ALL ON public.referral_commissions TO service_role;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own commissions" ON public.referral_commissions FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ========== NOTIFICATIONS ==========
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title_ar text NOT NULL,
  body_ar text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mark own notification read" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ========== CUSTOMER SERVICE ==========
CREATE TABLE public.customer_service_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_ar text NOT NULL,
  sublabel_ar text,
  platform text NOT NULL,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.customer_service_links TO anon, authenticated;
GRANT ALL ON public.customer_service_links TO service_role;
ALTER TABLE public.customer_service_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs links public" ON public.customer_service_links FOR SELECT TO anon, authenticated USING (is_active);

-- ========== PLATFORM SETTINGS ==========
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description_ar text,
  is_public boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public settings readable" ON public.platform_settings FOR SELECT TO anon, authenticated
  USING (is_public OR public.has_role(auth.uid(),'admin'));

-- ========== ADMIN ==========
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_actions TO authenticated;
GRANT ALL ON public.admin_actions TO service_role;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read actions" ON public.admin_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ========== SIGNUP HANDLER ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_referrer uuid;
  v_username text;
BEGIN
  LOOP
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code);
  END LOOP;

  v_username := coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || substr(md5(NEW.id::text), 1, 4);
  END IF;

  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL AND NEW.raw_user_meta_data->>'referral_code' <> '' THEN
    SELECT id INTO v_referrer FROM public.profiles
    WHERE referral_code = upper(NEW.raw_user_meta_data->>'referral_code');
  END IF;

  INSERT INTO public.profiles (id, username, email, phone, referral_code, referred_by)
  VALUES (NEW.id, v_username, NEW.email, NEW.raw_user_meta_data->>'phone', v_code, v_referrer);

  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF v_referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, level) VALUES (v_referrer, NEW.id, 1);
    INSERT INTO public.referrals (referrer_id, referred_id, level)
      SELECT p.referred_by, NEW.id, 2 FROM public.profiles p WHERE p.id = v_referrer AND p.referred_by IS NOT NULL;
    INSERT INTO public.referrals (referrer_id, referred_id, level)
      SELECT p2.referred_by, NEW.id, 3
      FROM public.profiles p1 JOIN public.profiles p2 ON p2.id = p1.referred_by
      WHERE p1.id = v_referrer AND p2.referred_by IS NOT NULL;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== LEDGER CORE ==========
CREATE OR REPLACE FUNCTION public.apply_balance_change(
  _user_id uuid, _amount numeric, _type public.tx_type, _description text DEFAULT NULL, _reference_id uuid DEFAULT NULL
) RETURNS public.transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before numeric(18,4);
  v_after numeric(18,4);
  v_tx public.transactions;
BEGIN
  SELECT balance INTO v_before FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF v_before IS NULL THEN RAISE EXCEPTION 'WALLET_NOT_FOUND'; END IF;

  v_after := v_before + _amount;
  IF v_after < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  UPDATE public.wallets SET
    balance = v_after,
    total_earned = total_earned + CASE WHEN _amount > 0 AND _type <> 'deposit' THEN _amount ELSE 0 END,
    total_deposited = total_deposited + CASE WHEN _type = 'deposit' THEN _amount ELSE 0 END,
    total_withdrawn = total_withdrawn + CASE WHEN _type = 'withdrawal' THEN -_amount ELSE 0 END
  WHERE user_id = _user_id;

  INSERT INTO public.transactions (user_id, type, status, amount, balance_before, balance_after, reference_id, description)
  VALUES (_user_id, _type, 'completed', _amount, v_before, v_after, _reference_id, _description)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END; $$;

REVOKE ALL ON FUNCTION public.apply_balance_change(uuid, numeric, public.tx_type, text, uuid) FROM public, anon, authenticated;

-- ========== SEED REFERENCE DATA ==========
INSERT INTO public.investment_funds (code, name_ar, name_en, tagline_ar, duration_days, profit_percent, min_amount, accent, sort_order) VALUES
('MUMBAI','صندوق مومباي','MUMBAI FUND','استثمار ذكي .. لعوائد أسرع',3,3.08,5,'cyan',1),
('NEWMEXICO','صندوق نيو مكسيكو','NEW MEXICO FUND','فرص أكبر .. لمستقبل أكثر استقراراً',10,4.20,5,'blue',2),
('GXR','صندوق GXR','GXR FUND','استثمار عالمي .. بعوائد مستقرة',30,6.40,5,'gold',3),
('NBL','صندوق NBL','NBL FUND','نمو مستدام .. لثروتك المستقبلية',160,10.80,5,'purple',4);

INSERT INTO public.vip_packages (level, name, price, daily_profit, daily_tasks, task_reward, accent, is_active) VALUES
(1,'VIP 1',13,0.50,2,0.25,'green',true),
(2,'VIP 2',27,1.20,3,0.40,'blue',true),
(3,'VIP 3',61,2.90,4,0.725,'purple',true),
(4,'VIP 4',131,6.40,5,1.28,'gold',true),
(5,'VIP 5',273,13.50,6,2.25,'pink',true),
(6,'VIP 6',403,20.00,7,2.857,'emerald',true),
(7,'VIP 7',540,26.85,8,3.356,'silver',false);

INSERT INTO public.lucky_wheel_configs (label_ar, prize_type, prize_value, probability, icon, accent, sort_order) VALUES
('50 دولار','cash',50,0,'banknote','gold',1),
('0.5 دولار','cash',0.5,20,'coin','green',2),
('حظ سعيد','none',0,50,'smile','blue',3),
('حظ سعيد','none',0,0,'smile','blue',4),
('هاتف نقال','item',0,0,'smartphone','red',5),
('2 دولار','cash',2,10,'coins','purple',6),
('ترقيات VIP','vip',0,0,'crown','purple',7),
('1 دولار','cash',1,20,'coin','green',8),
('80 دولار','cash',80,0,'money-bag','gold',9);

INSERT INTO public.platform_settings (key, value, description_ar, is_public) VALUES
('min_deposit','10','الحد الأدنى للإيداع بالدولار',true),
('min_withdrawal','6','الحد الأدنى للسحب بالدولار',true),
('withdrawal_fee_percent','10','نسبة رسوم السحب',true),
('withdrawal_start_hour','09:00','بداية وقت السحب',true),
('withdrawal_end_hour','16:00','نهاية وقت السحب',true),
('withdrawals_enabled','true','تفعيل السحب لجميع الحسابات',true),
('min_investment','5','الحد الأدنى للاستثمار في الصناديق',true),
('daily_login_reward','0.11','مكافأة تسجيل الدخول اليومية',true),
('referral_rate_l1','0.08','عمولة المستوى الأول',true),
('referral_rate_l2','0.04','عمولة المستوى الثاني',true),
('referral_rate_l3','0.01','عمولة المستوى الثالث',true),
('trial_days','2','مدة الفترة التجريبية بالأيام',true),
('trial_daily_tasks','3','عدد المهام اليومية في الفترة التجريبية',true),
('trial_task_reward','0.5','ربح المهمة في الفترة التجريبية',true),
('daily_spins','3','عدد فرص عجلة الحظ اليومية',true),
('session_minutes','15','مدة الجلسة بالدقائق',true),
('members_count','75000','عدد أعضاء المنصة',true),
('about_platform','منصتنا هي شركة استثمارية رقمية، تهدف إلى توفير فرص ربحية مستدامة من خلال الاستثمار في مشاريع مبتكرة.','حول المنصة',true),
('about_company','تأسست شركة Valoriza للاستثمار في عام 2018 في العاصمة، ويقع مقرها الرئيسي في مدريد، إسبانيا. تعمل على توفير فرص استثمارية مبتكرة وآمنة لعملائنا حول العالم.','نبذة عن الشركة',true),
('deposit_address_ERC20','0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b2','عنوان الإيداع ERC20',true),
('deposit_address_BEP20','0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b2','عنوان الإيداع BEP20',true),
('deposit_address_TRC20','TQn9Y2khDD95J42FQtQTdwVVRZq5YxZ8Xk','عنوان الإيداع TRC20',true);
