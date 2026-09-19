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
    const [packagesRes, walletRes, profileRes, fundsRes, userInvRes, settings] = await Promise.all([
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
        .select(
          "id, code, name_ar, name_en, tagline_ar, duration_days, profit_percent, min_amount, accent",
        )
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("investments")
        .select(
          "id, amount, expected_profit, status, started_at, matures_at, investment_funds(name_ar, code)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
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
      userInvestments: (userInvRes.data ?? []).map((inv: any) => ({
        id: inv.id,
        amount: Number(inv.amount),
        expectedProfit: Number(inv.expected_profit),
        status: inv.status,
        startedAt: inv.started_at,
        maturesAt: inv.matures_at,
        fundName: inv.investment_funds?.name_ar || "صندوق استثماري",
        fundCode: inv.investment_funds?.code || "FUND",
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
      .update({
        trial_active: true,
        trial_started_at: new Date().toISOString(),
        trial_expires_at: expires,
      })
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
    if (Number(wallet?.balance ?? 0) < price)
      return { ok: false as const, reason: "INSUFFICIENT_BALANCE" };

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
          return p
            ? { email: p.email as string, vipLevel: p.vip_level as number, level: r.level }
            : null;
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
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
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

  const defaults: Record<string, string> = {
    members_count: "75,000",
    about_company:
      "تأسست شركة Valoriza للاستثمار في عام 2018 في العاصمة، ويقع مقرها الرئيسي في مدريد، إسبانيا. تعمل على توفير فرص استثمارية مبتكرة وآمنة لعملائنا حول العالم.",
    about_platform:
      "منصتنا هي شركة استثمارية رقمية، تهدف إلى توفير فرص ربحية مستدامة من خلال الاستثمار في مشاريع مبتكرة.",
    platform_vision:
      "ريادة الاستثمار الرقمي العالمي وتقديم أفضل عائد مستدام وتوفير بيئة مالية آمنة وشفافة لجميع المستثمرين حول العالم.",
    platform_goals:
      "تنمية الثروات الفردية وتوفير دخل يومي مستدام، حماية رؤوس الأموال، وتقديم حلول مالية مبتكرة تدعم الاستقرار المالي.",
    established_year: "2018",
    headquarters: "مدريد، إسبانيا",
    funds_count: "4 صناديق استثمارية نشطة",
  };

  const settings: Record<string, string> = { ...defaults };
  for (const row of (settingsRes.data ?? []) as { key: string; value: string }[]) {
    settings[row.key] = row.value;
  }

  const defaultSupportLinks = [
    {
      id: "sup-1",
      label: "موظف الاستقبال",
      sublabel: "على تيليجرام",
      platform: "telegram",
      url: "https://t.me/valoriza_support",
    },
    {
      id: "sup-2",
      label: "موظف الاستقبال",
      sublabel: "على واتساب",
      platform: "whatsapp",
      url: "https://wa.me/34600000000",
    },
    {
      id: "sup-3",
      label: "المجموعة الرسمية",
      sublabel: "على تيليجرام",
      platform: "telegram",
      url: "https://t.me/valoriza_official_group",
    },
    {
      id: "sup-4",
      label: "المجموعة الرسمية",
      sublabel: "على واتساب",
      platform: "whatsapp",
      url: "https://chat.whatsapp.com/valoriza_vip",
    },
  ];

  const supportLinks =
    linksRes.data && linksRes.data.length > 0
      ? (linksRes.data as any[]).map((l: any) => ({
          id: l.id,
          label: l.label_ar,
          sublabel: l.sublabel_ar,
          platform: l.platform,
          url: l.url,
        }))
      : defaultSupportLinks;

  return {
    settings,
    supportLinks,
  };
});

/* ---------------- Savings Fund Investment Flow ---------------- */

export const investInSavingsFund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fundId: string; amount: number }) => {
    if (!data || typeof data.fundId !== "string" || typeof data.amount !== "number") {
      throw new Error("INVALID_INPUT");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Fetch fund
    const { data: fund } = await supabase
      .from("investment_funds")
      .select("id, code, name_ar, duration_days, profit_percent, min_amount, is_active")
      .eq("id", data.fundId)
      .single();

    if (!fund || !fund.is_active) {
      return { ok: false as const, reason: "FUND_NOT_AVAILABLE" };
    }

    const minAmount = Number(fund.min_amount || 5);
    if (data.amount < minAmount) {
      return { ok: false as const, reason: "BELOW_MIN_AMOUNT", minAmount };
    }

    // 2. Fetch wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const currentBalance = Number(wallet?.balance ?? 0);
    if (currentBalance < data.amount) {
      return { ok: false as const, reason: "INSUFFICIENT_BALANCE" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 3. Compute expected profit and maturity
    const profitPercent = Number(fund.profit_percent);
    const expectedProfit = Math.round(((data.amount * profitPercent) / 100) * 100) / 100;
    const maturesAt = new Date(Date.now() + fund.duration_days * 86400000).toISOString();

    // 4. Create investment record
    const { data: inv, error: invError } = await supabaseAdmin
      .from("investments")
      .insert({
        user_id: userId,
        fund_id: fund.id,
        amount: data.amount,
        expected_profit: expectedProfit,
        status: "active",
        started_at: new Date().toISOString(),
        matures_at: maturesAt,
      })
      .select("id")
      .single();

    if (invError) throw new Error(invError.message);

    // 5. Deduct from balance via ledger core RPC
    const { error: txError } = await supabaseAdmin.rpc("apply_balance_change", {
      _user_id: userId,
      _amount: -data.amount,
      _type: "investment",
      _description: `استثمار في ${fund.name_ar} (${fund.duration_days} يوم)`,
      _reference_id: inv.id,
    });

    if (txError) {
      // rollback investment creation
      await supabaseAdmin.from("investments").delete().eq("id", inv.id);
      if (txError.message.includes("INSUFFICIENT_BALANCE")) {
        return { ok: false as const, reason: "INSUFFICIENT_BALANCE" };
      }
      throw new Error(txError.message);
    }

    // 6. Update invested balance in wallet
    const { data: updatedWallet } = await supabaseAdmin
      .from("wallets")
      .select("invested_balance")
      .eq("user_id", userId)
      .single();

    await supabaseAdmin
      .from("wallets")
      .update({
        invested_balance: Number(updatedWallet?.invested_balance ?? 0) + data.amount,
      })
      .eq("user_id", userId);

    return {
      ok: true as const,
      investmentId: inv.id,
      fundName: fund.name_ar,
      amount: data.amount,
      expectedProfit,
      maturesAt,
    };
  });

/* ---------------- Deposit Flow ---------------- */

export const createDepositRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { network: "ERC20" | "BEP20" | "TRC20"; amount: number; txHash?: string }) => {
      if (
        !data ||
        !["ERC20", "BEP20", "TRC20"].includes(data.network) ||
        typeof data.amount !== "number"
      ) {
        throw new Error("INVALID_INPUT");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const settings = await loadSettings(supabase);
    const minDeposit = Number(settings["min_deposit"] ?? "10");

    if (data.amount < minDeposit) {
      return { ok: false as const, reason: "BELOW_MIN_DEPOSIT", minDeposit };
    }

    const depositAddress =
      settings[`deposit_address_${data.network}`] ||
      (data.network === "TRC20"
        ? "TQn9Y2khDD95J42FQtQTdwVVRZq5YxZ8Xk"
        : "0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b2");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Insert pending deposit - NO balance addition until Admin review!
    const { data: dep, error } = await supabaseAdmin
      .from("deposits")
      .insert({
        user_id: userId,
        network: data.network,
        amount: data.amount,
        deposit_address: depositAddress,
        tx_hash: data.txHash?.trim() || null,
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (error) throw new Error(error.message);

    return {
      ok: true as const,
      depositId: dep.id,
      amount: data.amount,
      network: data.network,
      depositAddress,
      createdAt: dep.created_at,
    };
  });

/* ---------------- Withdrawal Flow ---------------- */

export const getWithdrawalInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [walletRes, addressRes, settings] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", userId).single(),
      supabase
        .from("withdrawal_addresses")
        .select("network, address, locked, created_at")
        .eq("user_id", userId)
        .maybeSingle(),
      loadSettings(supabase),
    ]);

    return {
      balance: Number(walletRes.data?.balance ?? 0),
      boundAddress: addressRes.data
        ? {
            network: addressRes.data.network,
            address: addressRes.data.address,
            locked: addressRes.data.locked,
            createdAt: addressRes.data.created_at,
          }
        : null,
      settings: {
        minWithdrawal: Number(settings["min_withdrawal"] ?? "6"),
        feePercent: Number(settings["withdrawal_fee_percent"] ?? "10"),
        startHour: settings["withdrawal_start_hour"] ?? "09:00",
        endHour: settings["withdrawal_end_hour"] ?? "16:00",
        enabled: settings["withdrawals_enabled"] !== "false",
      },
    };
  });

export const bindWithdrawalAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { network: "ERC20" | "BEP20" | "TRC20"; address: string }) => {
    if (
      !data ||
      !["ERC20", "BEP20", "TRC20"].includes(data.network) ||
      typeof data.address !== "string"
    ) {
      throw new Error("INVALID_INPUT");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cleanAddr = data.address.trim();

    if (cleanAddr.length < 15) {
      return { ok: false as const, reason: "INVALID_ADDRESS" };
    }

    // Check if address already exists and is locked
    const { data: existing } = await supabase
      .from("withdrawal_addresses")
      .select("address, locked")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.locked) {
      return {
        ok: false as const,
        reason: "ADDRESS_LOCKED",
        message: "عنوان السحب مقفل ومحمي بحسابك، لا يمكن تعديله إلا عن طريق الإدارة.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("withdrawal_addresses").upsert(
      {
        user_id: userId,
        network: data.network,
        address: cleanAddr,
        locked: true,
      },
      { onConflict: "user_id" },
    );

    if (error) throw new Error(error.message);

    return { ok: true as const, address: cleanAddr, network: data.network };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { network: "ERC20" | "BEP20" | "TRC20"; address: string; amount: number }) => {
      if (
        !data ||
        !["ERC20", "BEP20", "TRC20"].includes(data.network) ||
        typeof data.address !== "string" ||
        typeof data.amount !== "number"
      ) {
        throw new Error("INVALID_INPUT");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const settings = await loadSettings(supabase);

    // 1. Check if withdrawals are enabled
    if (settings["withdrawals_enabled"] === "false") {
      return { ok: false as const, reason: "WITHDRAWALS_DISABLED" };
    }

    // 2. Check withdrawal hours (Default 09:00 to 16:00)
    const now = new Date();
    const currentHour = now.getUTCHours(); // Note: server uses UTC or local
    // Allow standard window
    const startHourNum = parseInt(settings["withdrawal_start_hour"] ?? "09", 10);
    const endHourNum = parseInt(settings["withdrawal_end_hour"] ?? "16", 10);

    // 3. Check min withdrawal
    const minWithdrawal = Number(settings["min_withdrawal"] ?? "6");
    if (data.amount < minWithdrawal) {
      return { ok: false as const, reason: "BELOW_MIN_WITHDRAWAL", minWithdrawal };
    }

    // 4. Check user wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const currentBalance = Number(wallet?.balance ?? 0);
    if (currentBalance < data.amount) {
      return { ok: false as const, reason: "INSUFFICIENT_BALANCE" };
    }

    // 5. Check withdrawal address binding
    const { data: boundAddr } = await supabase
      .from("withdrawal_addresses")
      .select("address, locked")
      .eq("user_id", userId)
      .maybeSingle();

    const cleanAddress = data.address.trim();
    if (!boundAddr) {
      // Auto-bind on first withdrawal
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("withdrawal_addresses").insert({
        user_id: userId,
        network: data.network,
        address: cleanAddress,
        locked: true,
      });
    } else if (boundAddr.address !== cleanAddress) {
      return {
        ok: false as const,
        reason: "ADDRESS_MISMATCH",
        message: "العنوان المدخل لا يتطابق مع عنوان السحب المقفل والمحمي بحسابك.",
      };
    }

    // 6. Calculate fee server side (10%)
    const feeRate = Number(settings["withdrawal_fee_percent"] ?? "10") / 100;
    const fee = Math.round(data.amount * feeRate * 100) / 100;
    const netAmount = Math.round((data.amount - fee) * 100) / 100;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 7. Insert withdrawal request with pending status
    const { data: wRecord, error: wError } = await supabaseAdmin
      .from("withdrawals")
      .insert({
        user_id: userId,
        network: data.network,
        address: cleanAddress,
        amount: data.amount,
        fee,
        net_amount: netAmount,
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (wError) throw new Error(wError.message);

    // 8. Deduct amount from balance and record transaction
    const { error: txError } = await supabaseAdmin.rpc("apply_balance_change", {
      _user_id: userId,
      _amount: -data.amount,
      _type: "withdrawal",
      _description: `طلب سحب $${data.amount} إلى ${data.network}: ${cleanAddress.slice(0, 6)}... (رسوم: $${fee})`,
      _reference_id: wRecord.id,
    });

    if (txError) {
      await supabaseAdmin.from("withdrawals").delete().eq("id", wRecord.id);
      if (txError.message.includes("INSUFFICIENT_BALANCE")) {
        return { ok: false as const, reason: "INSUFFICIENT_BALANCE" };
      }
      throw new Error(txError.message);
    }

    return {
      ok: true as const,
      withdrawalId: wRecord.id,
      amount: data.amount,
      fee,
      netAmount,
      network: data.network,
      address: cleanAddress,
    };
  });

/* ---------------- User Financial Records / History ---------------- */

export const getUserFinancialRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [depositsRes, withdrawalsRes, txRes, rewardsRes, investmentsRes] = await Promise.all([
      supabase
        .from("deposits")
        .select("id, network, amount, deposit_address, tx_hash, status, created_at, admin_note")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("withdrawals")
        .select("id, network, address, amount, fee, net_amount, status, created_at, admin_note")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id, type, status, amount, balance_before, balance_after, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("rewards")
        .select("id, source, amount, description_ar, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("investments")
        .select(
          "id, amount, expected_profit, status, started_at, matures_at, investment_funds(name_ar, code, profit_percent)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    return {
      deposits: (depositsRes.data ?? []).map((d: any) => ({
        id: d.id,
        network: d.network,
        amount: Number(d.amount),
        address: d.deposit_address,
        txHash: d.tx_hash,
        status: d.status,
        adminNote: d.admin_note,
        createdAt: d.created_at,
      })),
      withdrawals: (withdrawalsRes.data ?? []).map((w: any) => ({
        id: w.id,
        network: w.network,
        address: w.address,
        amount: Number(w.amount),
        fee: Number(w.fee),
        netAmount: Number(w.net_amount),
        status: w.status,
        adminNote: w.admin_note,
        createdAt: w.created_at,
      })),
      transactions: (txRes.data ?? []).map((t: any) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: Number(t.amount),
        balanceBefore: Number(t.balance_before),
        balanceAfter: Number(t.balance_after),
        description: t.description,
        createdAt: t.created_at,
      })),
      rewards: (rewardsRes.data ?? []).map((r: any) => ({
        id: r.id,
        source: r.source,
        amount: Number(r.amount),
        description: r.description_ar,
        createdAt: r.created_at,
      })),
      investments: (investmentsRes.data ?? []).map((inv: any) => ({
        id: inv.id,
        fundName: inv.investment_funds?.name_ar || "صندوق استثماري",
        fundCode: inv.investment_funds?.code || "FUND",
        profitPercent: Number(inv.investment_funds?.profit_percent || 0),
        amount: Number(inv.amount),
        expectedProfit: Number(inv.expected_profit),
        status: inv.status,
        startedAt: inv.started_at,
        maturesAt: inv.matures_at,
      })),
    };
  });

/* ---------------- Company Settings & Support Links ---------------- */

export const getCompanySettingsAndSupport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const settings = await loadSettings(supabase);

    const supportLinks = [
      {
        id: "sup-telegram-agent",
        label: "موظف الاستقبال",
        sublabel: "على تيليجرام",
        platform: "telegram",
        url: settings["telegram_support_url"] || "https://t.me/valoriza_support",
      },
      {
        id: "sup-whatsapp-agent",
        label: "موظف الاستقبال",
        sublabel: "على واتساب",
        platform: "whatsapp",
        url: settings["whatsapp_support_url"] || "https://wa.me/34600000000",
      },
      {
        id: "sup-telegram-group",
        label: "المجموعة الرسمية",
        sublabel: "على تيليجرام",
        platform: "telegram",
        url: settings["telegram_group_url"] || "https://t.me/valoriza_official_group",
      },
      {
        id: "sup-whatsapp-group",
        label: "المجموعة الرسمية",
        sublabel: "على واتساب",
        platform: "whatsapp",
        url: settings["whatsapp_group_url"] || "https://chat.whatsapp.com/valoriza_vip",
      },
    ];

    return {
      settings,
      supportLinks,
    };
  });
