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

async function loadSettings(
  supabase: { from: (t: string) => any },
): Promise<PlatformSettings> {
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

    if (profileRes.error) throw new Error(profileRes.error.message);
    if (walletRes.error) throw new Error(walletRes.error.message);

    const p = profileRes.data;
    const w = walletRes.data;
    const dailySpins = Number(settings["daily_spins"] ?? "3");

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
      settings,
      wheel: {
        prizes: (wheelRes.data ?? []).map((r: any) => ({
          id: r.id,
          label: r.label_ar,
          prizeType: r.prize_type,
          prizeValue: Number(r.prize_value),
          icon: r.icon,
          accent: r.accent,
        })),
        spinsLeft: Math.max(0, dailySpins - (spinsRes.count ?? 0)),
      },
      dailyReward: {
        amount: Number(settings["daily_login_reward"] ?? "0"),
        claimed: Boolean(rewardRes.data),
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

    const pool = (prizes ?? []) as {
      id: string;
      label_ar: string;
      prize_type: string;
      prize_value: number;
      probability: number;
    }[];

    const total = pool.reduce((sum, p) => sum + Number(p.probability), 0);
    let roll = Math.random() * (total > 0 ? total : 1);
    let won = pool[pool.length - 1];
    for (const p of pool) {
      roll -= Number(p.probability);
      if (roll <= 0) {
        won = p;
        break;
      }
    }

    const value = Number(won.prize_value);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: spin, error: spinError } = await supabaseAdmin
      .from("lucky_wheel_spins")
      .insert({
        user_id: userId,
        config_id: won.id,
        prize_label: won.label_ar,
        prize_value: value,
        spin_date: today(),
      })
      .select("id")
      .single();
    if (spinError) throw new Error(spinError.message);

    if (won.prize_type === "cash" && value > 0) {
      const { error: txError } = await supabaseAdmin.rpc("apply_balance_change", {
        _user_id: userId,
        _amount: value,
        _type: "lucky_wheel_reward",
        _description: `جائزة عجلة الحظ: ${won.label_ar}`,
        _reference_id: spin.id,
      });
      if (txError) throw new Error(txError.message);

      await supabaseAdmin.from("rewards").insert({
        user_id: userId,
        source: "lucky_wheel",
        amount: value,
        description_ar: `جائزة عجلة الحظ: ${won.label_ar}`,
      });
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
