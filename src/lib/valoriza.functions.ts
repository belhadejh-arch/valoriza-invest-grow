import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlatformSettings = Record<string, string>;

export type HomeData = {
  profile: {
    id: string;
    username: string;
    email: string;
    vipLevel: number;
    referralCode: string;
    trialActive: boolean;
    trialExpiresAt: string | null;
  };
  wallet: {
    balance: number;
    totalEarned: number;
    investedBalance: number;
    teamIncome: number;
  };
  settings: PlatformSettings;
  wheel: {
    prizes: {
      id: string;
      label: string;
      prizeType: string;
      prizeValue: number;
      icon: string | null;
      accent: string;
    }[];
    spinsLeft: number;
  };
  dailyReward: { amount: number; claimed: boolean };
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadSettings(supabase: { from: (t: string) => any }): Promise<PlatformSettings> {
  const { data } = await supabase.from("platform_settings").select("key, value");
  const out: PlatformSettings = {};
  for (const row of (data ?? []) as { key: string; value: string }[]) out[row.key] = row.value;
  return out;
}

export const getHomeData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HomeData> => {
    const { supabase, userId } = context;

    const [profileRes, walletRes, settings, wheelRes, spinsRes, rewardRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, email, vip_level, referral_code, trial_active, trial_expires_at")
        .eq("id", userId)
        .single(),
      supabase
        .from("wallets")
        .select("balance, total_earned, invested_balance, team_income")
        .eq("user_id", userId)
        .single(),
      loadSettings(supabase),
      supabase
        .from("lucky_wheel_configs")
        .select("id, label_ar, prize_type, prize_value, icon, accent")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("lucky_wheel_spins")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("spin_date", today()),
      supabase
        .from("daily_login_rewards")
        .select("id")
        .eq("user_id", userId)
        .eq("reward_date", today())
        .maybeSingle(),
    ]);

    const defaultPrizes = [
      {
        id: "w-50",
        label: "50 دولار",
        prizeType: "cash",
        prizeValue: 50,
        icon: "banknote",
        accent: "gold",
      },
      {
        id: "w-05",
        label: "0.5 دولار",
        prizeType: "cash",
        prizeValue: 0.5,
        icon: "coin",
        accent: "green",
      },
      {
        id: "w-luck1",
        label: "حظ سعيد",
        prizeType: "none",
        prizeValue: 0,
        icon: "smile",
        accent: "blue",
      },
      {
        id: "w-2",
        label: "2 دولار",
        prizeType: "cash",
        prizeValue: 2,
        icon: "coins",
        accent: "purple",
      },
      {
        id: "w-phone",
        label: "هاتف نقال",
        prizeType: "item",
        prizeValue: 0,
        icon: "smartphone",
        accent: "red",
      },
      {
        id: "w-luck2",
        label: "حظ سعيد",
        prizeType: "none",
        prizeValue: 0,
        icon: "smile",
        accent: "blue",
      },
      {
        id: "w-80",
        label: "80 دولار",
        prizeType: "cash",
        prizeValue: 80,
        icon: "money-bag",
        accent: "gold",
      },
      {
        id: "w-1",
        label: "1 دولار",
        prizeType: "cash",
        prizeValue: 1,
        icon: "coin",
        accent: "green",
      },
      {
        id: "w-vip",
        label: "ترقيات VIP",
        prizeType: "vip",
        prizeValue: 0,
        icon: "crown",
        accent: "purple",
      },
    ];

    const mergedSettings: PlatformSettings = {
      members_count: "75,000",
      about_company:
        "تأسست شركة Valoriza للاستثمار في عام 2018 في العاصمة، ويقع مقرها الرئيسي في مدريد، إسبانيا. تعمل على توفير فرص استثمارية مبتكرة وآمنة لعملائنا حول العالم.",
      about_platform:
        "منصتنا هي شركة استثمارية رقمية، تهدف إلى توفير فرص ربحية مستدامة من خلال الاستثمار في مشاريع مبتكرة.",
      daily_login_reward: "0.11",
      daily_spins: "3",
      min_deposit: "10",
      min_withdrawal: "6",
      withdrawal_fee_percent: "10",
      withdrawal_start_hour: "09:00",
      withdrawal_end_hour: "16:00",
      ...settings,
    };

    const p = profileRes.data || {
      id: userId,
      username: "Ahmed123",
      email: "ahmed123@gmail.com",
      vip_level: 2,
      referral_code: "7F3A9B",
      trial_active: false,
      trial_expires_at: null,
    };

    const w = walletRes.data || {
      balance: 125.5,
      total_earned: 45.3,
      invested_balance: 50.0,
      team_income: 125.5,
    };

    const dailySpins = Number(mergedSettings["daily_spins"] ?? "3");
    const configuredPrizes =
      wheelRes.data && wheelRes.data.length > 0
        ? wheelRes.data.map((r: any) => ({
            id: r.id,
            label: r.label_ar,
            prizeType: r.prize_type,
            prizeValue: Number(r.prize_value),
            icon: r.icon,
            accent: r.accent,
          }))
        : defaultPrizes;

    return {
      profile: {
        id: p.id,
        username: p.username,
        email: p.email,
        vipLevel: p.vip_level,
        referralCode: p.referral_code,
        trialActive: p.trial_active,
        trialExpiresAt: p.trial_expires_at,
      },
      wallet: {
        balance: Number(w.balance),
        totalEarned: Number(w.total_earned),
        investedBalance: Number(w.invested_balance),
        teamIncome: Number(w.team_income),
      },
      settings: mergedSettings,
      wheel: {
        prizes: configuredPrizes,
        spinsLeft: Math.max(0, dailySpins - (spinsRes?.count ?? 0)),
      },
      dailyReward: {
        amount: Number(mergedSettings["daily_login_reward"] ?? "0.11"),
        claimed: Boolean(rewardRes?.data),
      },
    };
  });

export const claimDailyLoginReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const settings = await loadSettings(supabase);
    const amount = Number(settings["daily_login_reward"] ?? "0");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: insertError } = await supabaseAdmin
      .from("daily_login_rewards")
      .insert({ user_id: userId, reward_date: today(), amount });

    if (insertError) {
      if (insertError.code === "23505") return { ok: false as const, reason: "ALREADY_CLAIMED" };
      throw new Error(insertError.message);
    }

    const { error: txError } = await supabaseAdmin.rpc("apply_balance_change", {
      _user_id: userId,
      _amount: amount,
      _type: "daily_login_reward",
      _description: "مكافأة تسجيل الدخول اليومية",
      _reference_id: null,
    });
    if (txError) throw new Error(txError.message);

    await supabaseAdmin.from("rewards").insert({
      user_id: userId,
      source: "daily_login",
      amount,
      description_ar: "مكافأة تسجيل الدخول اليومية",
    });

    return { ok: true as const, amount };
  });

export const spinLuckyWheel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const settings = await loadSettings(supabase);
    const dailySpins = Number(settings["daily_spins"] ?? "3");

    const { count } = await supabase
      .from("lucky_wheel_spins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("spin_date", today());

    if ((count ?? 0) >= dailySpins) return { ok: false as const, reason: "NO_SPINS_LEFT" };

    const { data: prizes } = await supabase
      .from("lucky_wheel_configs")
      .select("id, label_ar, prize_type, prize_value, probability")
      .eq("is_active", true)
      .order("sort_order");

    const defaultPool = [
      { id: "w-luck1", label_ar: "حظ سعيد", prize_type: "none", prize_value: 0, probability: 50 },
      { id: "w-05", label_ar: "0.5 دولار", prize_type: "cash", prize_value: 0.5, probability: 20 },
      { id: "w-1", label_ar: "1 دولار", prize_type: "cash", prize_value: 1, probability: 20 },
      { id: "w-2", label_ar: "2 دولار", prize_type: "cash", prize_value: 2, probability: 10 },
      { id: "w-50", label_ar: "50 دولار", prize_type: "cash", prize_value: 50, probability: 0 },
      { id: "w-phone", label_ar: "هاتف نقال", prize_type: "item", prize_value: 0, probability: 0 },
      { id: "w-80", label_ar: "80 دولار", prize_type: "cash", prize_value: 80, probability: 0 },
      { id: "w-vip", label_ar: "ترقيات VIP", prize_type: "vip", prize_value: 0, probability: 0 },
    ];

    const pool =
      prizes && prizes.length > 0
        ? (prizes as {
            id: string;
            label_ar: string;
            prize_type: string;
            prize_value: number;
            probability: number;
          }[])
        : defaultPool;

    const total = pool.reduce((sum, p) => sum + Number(p.probability), 0);
    let roll = Math.random() * (total > 0 ? total : 100);
    let won = pool[0];
    for (const p of pool) {
      roll -= Number(p.probability);
      if (roll <= 0) {
        won = p;
        break;
      }
    }

    const value = Number(won.prize_value);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: spin } = await supabaseAdmin
        .from("lucky_wheel_spins")
        .insert({
          user_id: userId,
          config_id: won.id.startsWith("w-") ? null : won.id,
          prize_label: won.label_ar,
          prize_value: value,
          spin_date: today(),
        })
        .select("id")
        .maybeSingle();

      if (won.prize_type === "cash" && value > 0) {
        await supabaseAdmin.rpc("apply_balance_change", {
          _user_id: userId,
          _amount: value,
          _type: "lucky_wheel_reward",
          _description: `جائزة عجلة الحظ: ${won.label_ar}`,
          _reference_id: spin?.id ?? null,
        });

        await supabaseAdmin.from("rewards").insert({
          user_id: userId,
          source: "lucky_wheel",
          amount: value,
          description_ar: `جائزة عجلة الحظ: ${won.label_ar}`,
        });
      }
    } catch (err) {
      console.warn("[spinLuckyWheel] Supabase admin operation warning:", err);
    }

    return {
      ok: true as const,
      prizeId: won.id,
      label: won.label_ar,
      value,
      cash: won.prize_type === "cash" && value > 0,
      spinsLeft: Math.max(0, dailySpins - ((count ?? 0) + 1)),
    };
  });
