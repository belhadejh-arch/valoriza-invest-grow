-- ==============================================================================
-- VALORIZA - SUPABASE DATABASE INITIALIZATION & SUPER ADMIN SETUP SCRIPT
-- قم بنسخ هذا الكود ولصقه في محرر استعلامات Supabase (SQL Editor) ثم اضغط RUN
-- ==============================================================================

-- 1. تفعيل الإضافات الأساسية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. جدول الأدوار (Roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

-- 3. جدول الملفات الشخصية (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  vip_level INTEGER DEFAULT 1,
  referral_code TEXT,
  referred_by TEXT,
  trial_active BOOLEAN DEFAULT false,
  trial_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول المحافظ المالية (Wallets)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  balance NUMERIC(15, 4) DEFAULT 0.0000,
  total_deposited NUMERIC(15, 4) DEFAULT 0.0000,
  total_withdrawn NUMERIC(15, 4) DEFAULT 0.0000,
  total_earned NUMERIC(15, 4) DEFAULT 0.0000,
  invested_balance NUMERIC(15, 4) DEFAULT 0.0000,
  team_income NUMERIC(15, 4) DEFAULT 0.0000,
  wallet_address TEXT,
  wallet_network TEXT,
  is_wallet_locked BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول طلبات الإيداع (Deposits)
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(15, 4) NOT NULL,
  network TEXT NOT NULL,
  deposit_address TEXT NOT NULL,
  screenshot_url TEXT,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 6. جدول طلبات السحب (Withdrawals)
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(15, 4) NOT NULL,
  fee NUMERIC(15, 4) DEFAULT 0.0000,
  net_amount NUMERIC(15, 4) NOT NULL,
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 7. جدول باقات VIP (VIP Packages)
CREATE TABLE IF NOT EXISTS public.vip_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(15, 4) NOT NULL,
  daily_profit NUMERIC(15, 4) NOT NULL,
  daily_tasks INTEGER NOT NULL,
  task_reward NUMERIC(15, 4) NOT NULL,
  duration_days INTEGER DEFAULT 365,
  accent TEXT DEFAULT 'green',
  is_active BOOLEAN DEFAULT true
);

-- 8. جدول المهام (Tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  youtube_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);

-- 9. جدول مهام المستخدم اليومية (User Tasks)
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID,
  completion_date DATE DEFAULT CURRENT_DATE,
  reward NUMERIC(15, 4) NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_tasks_user_date_task UNIQUE (user_id, completion_date, task_id)
);

-- 10. جدول الإعدادات العامة للمنصة (Platform Settings)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدراج الإعدادات الافتراضية
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('min_deposit', '10', 'الحد الأدنى للإيداع'),
  ('min_withdrawal', '5', 'الحد الأدنى للسحب'),
  ('withdrawal_fee_percent', '0', 'نسبة رسوم السحب'),
  ('deposit_address_TRC20', 'TQn9Y2khDD95J42FQtQTdwVVRZq5YxZ8Xk', 'عنوان TRC20 للإيداع'),
  ('deposit_address_BEP20', '0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b2', 'عنوان BEP20 للإيداع'),
  ('deposit_address_ERC20', '0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b2', 'عنوان ERC20 للإيداع'),
  ('telegram_channel', 'https://t.me/valoriza_official', 'قناة التلغرام الرسمية'),
  ('whatsapp_support', 'https://wa.me/34600000000', 'دعم الواتساب')
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- إعداد الدالة والمحفز (Trigger) لإنشاء الملف الشخصي والمحفظة تلقائياً عند تسجيل أي مستخدم جديد
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- إدراج في profiles
  INSERT INTO public.profiles (id, email, username, full_name, vip_level, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'عضو Valoriza'),
    1,
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))
  )
  ON CONFLICT (id) DO NOTHING;

  -- إدراج في wallets
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.0000)
  ON CONFLICT (user_id) DO NOTHING;

  -- إدراج في user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- إنشاء وربط حساب الأدمن الأساسي (Super Admin)
-- البريد: admin@valoriza.com
-- كلمة المرور: AdminValoriza2026!
-- ==============================================================================
DO $$
DECLARE
  v_admin_id UUID;
  v_email TEXT := 'admin@valoriza.com';
  v_password TEXT := 'AdminValoriza2026!';
BEGIN
  -- التحقق مما إذا كان الأدمن موجوداً مسبقاً في auth.users
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_email;

  IF v_admin_id IS NULL THEN
    -- توليد معرّف جديد
    v_admin_id := gen_random_uuid();

    -- إدخال الأدمن في auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"username": "admin", "full_name": "مدير النظام الرئيسي (Super Admin)"}'::jsonb,
      NOW(),
      NOW()
    );
  ELSE
    -- تحديث كلمة المرور وتأكيد الإيميل للأدمن الموجود
    UPDATE auth.users
    SET 
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = '{"username": "admin", "full_name": "مدير النظام الرئيسي (Super Admin)"}'::jsonb,
      updated_at = NOW()
    WHERE id = v_admin_id;
  END IF;

  -- ترقية رتبة الأدمن في user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- تحديث بيانات الأدمن في profiles
  INSERT INTO public.profiles (id, email, username, full_name, vip_level)
  VALUES (v_admin_id, v_email, 'admin', 'مدير النظام الرئيسي (Super Admin)', 7)
  ON CONFLICT (id) DO UPDATE
  SET 
    vip_level = 7,
    username = 'admin',
    full_name = 'مدير النظام الرئيسي (Super Admin)';

  -- تهيئة محفظة الأدمن برصيد تجريبي
  INSERT INTO public.wallets (user_id, balance, total_deposited)
  VALUES (v_admin_id, 1000.0000, 1000.0000)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = GREATEST(wallets.balance, 1000.0000);

  RAISE NOTICE 'تم إنشاء وربط حساب الأدمن الأساسي بنجاح: % (ID: %)', v_email, v_admin_id;
END;
$$;
