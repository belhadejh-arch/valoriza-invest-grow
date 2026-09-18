import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadSettings(supabase: { from: (t: string) => any }) {
  const { data } = await supabase.from("platform_settings").select("key, value");
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string }[]) out[row.key] = row.value;
  return out;
}

/* ---------------- Investment page ---------------- */

export const getInvestmentData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [packagesRes, walletRes, profileRes, fundsRes, settings] = await Promise.all([
      supabase
        .from("vip_packages")
        .select("id, level, name, price, daily_profit, daily_tasks, task_reward, accent, is_active")
        .order("level"),
      supabase
        .from("wallets")
        .select("balance, total_earned, invested_balance")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("profiles")
        .select("vip_level, trial_active, trial_expires_at, trial_started_at")
        .eq("id", userId)
        .single(),
      supabase
        .from("investment_funds")
        .select("id, code, name_ar, name_en, tagline_ar, duration_days, profit_percent, min_amount, accent")
        .eq("is_active", true)
        .order("sort_order"),
      loadSettings(supabase),
    ]);

    return {
      packages: (packagesRes.data ?? []).map((p: any) => ({
        id: p.id,
        level: p.level,
        name: p.name,
        price: Number(p.price),
        dailyProfit: Number(p.daily_profit),
        dailyTasks: p.daily_tasks,
        taskReward: Number(p.task_reward),
        accent: p.accent,
        isActive: p.is_active,
      })),
      funds: (fundsRes.data ?? []).map((f: any) => ({
        id: f.id,
        code: f.code,
        nameAr: f.name_ar,
        nameEn: f.name_en,
        taglineAr: f.tagline_ar,
        durationDays: f.duration_days,
        profitPercent: Number(f.profit_percent),
        minAmount: Number(f.min_amount),
        accent: f.accent,
      })),
      wallet: {
        balance: Number(walletRes.data?.balance ?? 0),
        totalEarned: Number(walletRes.data?.total_earned ?? 0),
        investedBalance: Number(walletRes.data?.invested_balance ?? 0),
      },
      profile: {
        vipLevel: profileRes.data?.vip_level ?? 0,
        trialActive: profileRes.data?.trial_active ?? false,
        trialExpiresAt: profileRes.data?.trial_expires_at ?? null,
        trialStartedAt: profileRes.data?.trial_started_at ?? null,
      },
      settings,
    };
  });

export const activateTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const settings = await loadSettings(supabase);
    const days = Number(settings["trial_days"] ?? "2");

    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_started_at, vip_level")
      .eq("id", userId)
      .single();

    if (profile?.trial_started_at) return { ok: false as const, reason: "ALREADY_USED" };
    if ((profile?.vip_level ?? 0) > 0) return { ok: false as const, reason: "HAS_VIP" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expires = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ trial_active: true, trial_started_at: new Date().toISOString(), trial_expires_at: expires })
      .eq("id", userId);
    if (error) throw new Error(error.message);

    return { ok: true as const, expiresAt: expires };
  });

export const purchaseVip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { packageId: string }) => {
    if (!data || typeof data.packageId !== "string") throw new Error("INVALID_INPUT");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pkg } = await supabase
      .from("vip_packages")
      .select("id, level, name, price, duration_days, is_active")
      .eq("id", data.packageId)
      .single();

    if (!pkg || !pkg.is_active) return { ok: false as const, reason: "UNAVAILABLE" };

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const price = Number(pkg.price);
    if (Number(wallet?.balance ?? 0) < price) return { ok: false as const, reason: "INSUFFICIENT_BALANCE" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const expires = new Date(Date.now() + pkg.duration_days * 86400000).toISOString();
    const { data: userVip, error: vipError } = await supabaseAdmin
      .from("user_vip")
      .insert({
        user_id: userId,
        package_id: pkg.id,
        level: pkg.level,
        price_paid: price,
        expires_at: expires,
      })
      .select("id")
      .single();
    if (vipError) throw new Error(vipError.message);

    const { error: txError } = await supabaseAdmin.rpc("apply_balance_change", {
      _user_id: userId,
      _amount: -price,
      _type: "vip_purchase",
      _description: `شراء باقة ${pkg.name}`,
      _reference_id: userVip.id,
    });
    if (txError) {
      await supabaseAdmin.from("user_vip").delete().eq("id", userVip.id);
      if (txError.message.includes("INSUFFICIENT_BALANCE")) {
        return { ok: false as const, reason: "INSUFFICIENT_BALANCE" };
      }
      throw new Error(txError.message);
    }

    await supabaseAdmin
      .from("profiles")
      .update({ vip_level: pkg.level, vip_expires_at: expires, trial_active: false })
      .eq("id", userId);

    await payReferralCommissions(supabaseAdmin, supabase, userId, price, "vip_purchase");

    return { ok: true as const, level: pkg.level };
  });

async function payReferralCommissions(
  admin: any,
  supabase: { from: (t: string) => any },
  sourceUserId: string,
  baseAmount: number,
  origin: string,
) {
  const settings = await loadSettings(supabase);
  const rates: Record<number, number> = {
    1: Number(settings["referral_rate_l1"] ?? "0"),
    2: Number(settings["referral_rate_l2"] ?? "0"),
    3: Number(settings["referral_rate_l3"] ?? "0"),
  };

  const { data: uplines } = await admin
    .from("referrals")
    .select("referrer_id, level")
    .eq("referred_id", sourceUserId);

  for (const up of (uplines ?? []) as { referrer_id: string; level: number }[]) {
    const rate = rates[up.level] ?? 0;
    if (rate <= 0) continue;
    const amount = Math.round(baseAmount * rate * 10000) / 10000;
    if (amount <= 0) continue;

    const { data: commission } = await admin
      .from("referral_commissions")
      .insert({
        referrer_id: up.referrer_id,
        source_user_id: sourceUserId,
        level: up.level,
        rate,
        base_amount: baseAmount,
        amount,
        origin,
      })
      .select("id")
      .single();

    await admin.rpc("apply_balance_change", {
      _user_id: up.referrer_id,
      _amount: amount,
      _type: "referral_commission",
      _description: `عمولة إحالة من المستوى ${up.level}`,
      _reference_id: commission?.id ?? null,
    });

    await admin.rpc("increment_team_income", {
      _user_id: up.referrer_id,
      _amount: amount,
    });
  }
}

/* ---------------- Team page ---------------- */

export const getTeamData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, walletRes, referralsRes, commissionsRes, settings] = await Promise.all([
      supabase.from("profiles").select("referral_code").eq("id", userId).single(),
      supabase.from("wallets").select("team_income").eq("user_id", userId).single(),
      supabase.from("referrals").select("referred_id, level, created_at").eq("referrer_id", userId),
      supabase.from("referral_commissions").select("level, amount").eq("referrer_id", userId),
      loadSettings(supabase),
    ]);

    const referrals = (referralsRes.data ?? []) as { referred_id: string; level: number }[];
    const memberIds = referrals.map((r) => r.referred_id);

    let members: { email: string; vipLevel: number; level: number }[] = [];
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, vip_level")
        .in("id", memberIds);
      const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      members = referrals
        .map((r) => {
          const p = byId.get(r.referred_id);
          return p ? { email: p.email as string, vipLevel: p.vip_level as number, level: r.level } : null;
        })
        .filter(Boolean) as { email: string; vipLevel: number; level: number }[];
    }

    const commissions = (commissionsRes.data ?? []) as { level: number; amount: number }[];
    const levels = [1, 2, 3].map((lvl) => ({
      level: lvl,
      members: referrals.filter((r) => r.level === lvl).length,
      earnings: commissions
        .filter((c) => c.level === lvl)
        .reduce((s, c) => s + Number(c.amount), 0),
    }));

    return {
      referralCode: profileRes.data?.referral_code ?? "",
      teamIncome: Number(walletRes.data?.team_income ?? 0),
      totalMembers: referrals.length,
      totalCommissions: commissions.reduce((s, c) => s + Number(c.amount), 0),
      levels,
      members,
      rates: {
        l1: Number(settings["referral_rate_l1"] ?? "0"),
        l2: Number(settings["referral_rate_l2"] ?? "0"),
        l3: Number(settings["referral_rate_l3"] ?? "0"),
      },
    };
  });

/* ---------------- Rewards page ---------------- */

export const getRewardsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [rewardsRes, walletRes, dailyRes, settings] = await Promise.all([
      supabase
        .from("rewards")
        .select("id, source, amount, description_ar, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("wallets").select("balance, total_earned").eq("user_id", userId).single(),
      supabase
        .from("daily_login_rewards")
        .select("id")
        .eq("user_id", userId)
        .eq("reward_date", today())
        .maybeSingle(),
      loadSettings(supabase),
    ]);

    const rewards = (rewardsRes.data ?? []).map((r: any) => ({
      id: r.id,
      source: r.source as string,
      amount: Number(r.amount),
      description: r.description_ar as string | null,
      createdAt: r.created_at as string,
    }));

    return {
      rewards,
      totalRewards: rewards.reduce((s, r) => s + r.amount, 0),
      balance: Number(walletRes.data?.balance ?? 0),
      totalEarned: Number(walletRes.data?.total_earned ?? 0),
      dailyRewardAmount: Number(settings["daily_login_reward"] ?? "0"),
      dailyRewardClaimed: Boolean(dailyRes.data),
    };
  });

/* ---------------- Account page ---------------- */

export const getAccountData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profileRes, walletRes, dailyRes, settings] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, email, phone, vip_level, referral_code, trial_active")
        .eq("id", userId)
        .single(),
      supabase.from("wallets").select("balance").eq("user_id", userId).single(),
      supabase
        .from("daily_login_rewards")
        .select("id")
        .eq("user_id", userId)
        .eq("reward_date", today())
        .maybeSingle(),
      loadSettings(supabase),
    ]);

    return {
      profile: {
        username: profileRes.data?.username ?? "",
        email: profileRes.data?.email ?? "",
        phone: profileRes.data?.phone ?? null,
        vipLevel: profileRes.data?.vip_level ?? 0,
        referralCode: profileRes.data?.referral_code ?? "",
        trialActive: profileRes.data?.trial_active ?? false,
      },
      balance: Number(walletRes.data?.balance ?? 0),
      dailyReward: {
        amount: Number(settings["daily_login_reward"] ?? "0"),
        claimed: Boolean(dailyRes.data),
      },
    };
  });

/* ---------------- Public about data ---------------- */

export const getAboutData = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const [settingsRes, linksRes] = await Promise.all([
    client.from("platform_settings").select("key, value").eq("is_public", true),
    client
      .from("customer_service_links")
      .select("id, label_ar, sublabel_ar, platform, url")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const settings: Record<string, string> = {};
  for (const row of (settingsRes.data ?? []) as { key: string; value: string }[]) {
    settings[row.key] = row.value;
  }

  return {
    settings,
    supportLinks: (linksRes.data ?? []).map((l: any) => ({
      id: l.id,
      label: l.label_ar,
      sublabel: l.sublabel_ar,
      platform: l.platform,
      url: l.url,
    })),
  };
});
