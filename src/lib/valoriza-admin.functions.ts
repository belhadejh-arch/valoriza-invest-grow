import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------------- ADMIN AUTH CHECK HELPER ---------------- */

async function verifyAdminOrThrow(context: { supabase: any; userId: string }) {
  const { supabase, userId } = context;

  // 1. Check roles table
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleRow) return true;

  // 2. Check token claims first (fastest and most reliable)
  const claims = (context as any).claims;
  const tokenEmail = claims?.email?.toLowerCase();
  const tokenUsername = claims?.user_metadata?.username?.toLowerCase();
  if (
    tokenEmail === "admin@valoriza.com" ||
    tokenEmail === "adramatv@gmail.com" ||
    tokenUsername === "admin" ||
    tokenUsername === "superadmin"
  ) {
    return true;
  }

  // 3. Check profile table via authenticated client
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, username")
    .eq("id", userId)
    .maybeSingle();

  const isOwner =
    profile?.email?.toLowerCase() === "adramatv@gmail.com" ||
    profile?.email?.toLowerCase() === "admin@valoriza.com" ||
    profile?.username?.toLowerCase() === "admin" ||
    profile?.username?.toLowerCase() === "superadmin";

  if (isOwner) {
    return true;
  }

  throw new Error("FORBIDDEN_NOT_ADMIN");
}

async function recordAudit(
  adminId: string,
  event: string,
  targetUserId?: string | null,
  details?: any,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all([
      supabaseAdmin.from("audit_logs").insert({
        user_id: adminId,
        event,
        details: details || {},
      }),
      supabaseAdmin.from("admin_actions").insert({
        admin_id: adminId,
        action: event,
        target_user_id: targetUserId || null,
        details: details || {},
      }),
    ]);
  } catch (err) {
    console.warn("[recordAudit] Warning recording audit log:", err);
  }
}

/* ---------------- 1. ADMIN OVERVIEW ---------------- */

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      usersCountRes,
      walletsRes,
      pendingDepositsRes,
      pendingWithdrawalsRes,
      investmentsRes,
      tasksRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("wallets").select("balance, total_deposited, total_withdrawn"),
      supabaseAdmin.from("deposits").select("id, amount").eq("status", "pending"),
      supabaseAdmin.from("withdrawals").select("id, amount").eq("status", "pending"),
      supabaseAdmin.from("investments").select("id, amount").eq("status", "active"),
      supabaseAdmin.from("task_completions").select("id", { count: "exact", head: true }),
    ]);

    const wallets = walletsRes.data ?? [];
    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
    const totalDeposited = wallets.reduce((sum, w) => sum + Number(w.total_deposited || 0), 0);
    const totalWithdrawn = wallets.reduce((sum, w) => sum + Number(w.total_withdrawn || 0), 0);

    const pendingDepositsCount = pendingDepositsRes.data?.length ?? 0;
    const pendingDepositsAmount = (pendingDepositsRes.data ?? []).reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );

    const pendingWithdrawalsCount = pendingWithdrawalsRes.data?.length ?? 0;
    const pendingWithdrawalsAmount = (pendingWithdrawalsRes.data ?? []).reduce(
      (sum, w) => sum + Number(w.amount),
      0,
    );

    const activeInvestmentsCount = investmentsRes.data?.length ?? 0;
    const activeInvestmentsVolume = (investmentsRes.data ?? []).reduce(
      (sum, inv) => sum + Number(inv.amount),
      0,
    );

    return {
      totalUsers: usersCountRes.count ?? 0,
      totalBalance,
      totalDeposited,
      totalWithdrawn,
      pendingDepositsCount,
      pendingDepositsAmount,
      pendingWithdrawalsCount,
      pendingWithdrawalsAmount,
      activeInvestmentsCount,
      activeInvestmentsVolume,
      totalTasksCompleted: tasksRes.count ?? 0,
    };
  });

/* ---------------- 2. ADMIN USERS MANAGEMENT ---------------- */

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, walletsRes, referralsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, username, email, phone, referral_code, vip_level, trial_active, is_blocked, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("wallets")
        .select(
          "user_id, balance, total_deposited, total_withdrawn, invested_balance, team_income",
        ),
      supabaseAdmin.from("referrals").select("referrer_id"),
    ]);

    const walletMap = new Map((walletsRes.data ?? []).map((w: any) => [w.user_id, w]));

    const refCounts = new Map<string, number>();
    for (const r of (referralsRes.data ?? []) as any[]) {
      refCounts.set(r.referrer_id, (refCounts.get(r.referrer_id) || 0) + 1);
    }

    return (profilesRes.data ?? []).map((p: any) => {
      const w = walletMap.get(p.id) || {};
      return {
        id: p.id,
        username: p.username,
        email: p.email,
        phone: p.phone,
        referralCode: p.referral_code,
        vipLevel: p.vip_level,
        trialActive: p.trial_active,
        isBlocked: p.is_blocked,
        createdAt: p.created_at,
        balance: Number(w.balance || 0),
        totalDeposited: Number(w.total_deposited || 0),
        totalWithdrawn: Number(w.total_withdrawn || 0),
        investedBalance: Number(w.invested_balance || 0),
        teamIncome: Number(w.team_income || 0),
        teamCount: refCounts.get(p.id) || 0,
      };
    });
  });

export const toggleUserBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { userId: string; isBlocked: boolean }) => data)
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_blocked: data.isBlocked })
      .eq("id", data.userId);

    if (error) throw new Error(error.message);

    await recordAudit(context.userId, data.isBlocked ? "BLOCK_USER" : "UNBLOCK_USER", data.userId, {
      isBlocked: data.isBlocked,
    });

    return { ok: true as const };
  });

export const updateUserVipLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { targetUserId: string; vipLevel: number }) => data)
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ vip_level: data.vipLevel })
      .eq("id", data.targetUserId);

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: data.targetUserId,
      title_ar: "ترقية مستوى VIP",
      body_ar: `تهانينا! تم تحديث رتبتك إلى VIP ${data.vipLevel} من قبل إدارة المنصة.`,
      is_read: false,
    });

    await recordAudit(context.userId, "SET_VIP_LEVEL", data.targetUserId, {
      vipLevel: data.vipLevel,
    });

    return { ok: true as const };
  });

export const manualBalanceAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: { targetUserId: string; amount: number; reason: string; isCredit: boolean }) => data,
  )
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const changeAmount = data.isCredit ? Math.abs(data.amount) : -Math.abs(data.amount);

    const { data: tx, error } = await supabaseAdmin.rpc("apply_balance_change", {
      _user_id: data.targetUserId,
      _amount: changeAmount,
      _type: "admin_adjustment",
      _description: `تعديل إداري: ${data.reason}`,
      _reference_id: null,
    });

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: data.targetUserId,
      title_ar: "تعديل رصيد الحساب",
      body_ar: `قام المشرف بتعديل رصيدك بمقدار (${changeAmount > 0 ? "+" : ""}$${changeAmount.toFixed(2)}): ${data.reason}`,
      is_read: false,
    });

    await recordAudit(context.userId, "MANUAL_BALANCE_ADJUSTMENT", data.targetUserId, {
      amount: changeAmount,
      reason: data.reason,
      balanceAfter: tx?.balance_after,
    });

    return { ok: true as const, balanceAfter: tx?.balance_after };
  });

/* ---------------- 3. ADMIN DEPOSITS ---------------- */

export const getAdminDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);

    const { getValorizaStore } = await import("./valoriza-store");
    const store = getValorizaStore();
    const storeDeposits = store.getDeposits();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let dbDeposits: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from("deposits")
        .select(
          "id, user_id, network, amount, deposit_address, tx_hash, status, admin_note, reviewed_at, created_at, profiles(username, email)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) dbDeposits = data;
    } catch {
      // Non-blocking
    }

    // Merge store deposits and db deposits without duplicates
    const seenIds = new Set<string>();
    const merged = [];

    for (const d of storeDeposits) {
      seenIds.add(d.id);
      merged.push({
        id: d.id,
        userId: d.userId,
        username: d.username || "مستخدم",
        email: d.userEmail || "",
        network: d.network,
        amount: Number(d.amount),
        depositAddress: d.depositAddress,
        screenshotUrl: d.screenshotUrl,
        txHash: d.txHash,
        status: d.status,
        adminNote: d.rejectReason,
        reviewedAt: d.reviewedAt,
        createdAt: d.createdAt,
      });
    }

    for (const d of dbDeposits) {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        merged.push({
          id: d.id,
          userId: d.user_id,
          username: d.profiles?.username || "مستخدم",
          email: d.profiles?.email || "",
          network: d.network,
          amount: Number(d.amount),
          depositAddress: d.deposit_address,
          screenshotUrl: d.screenshot_url,
          txHash: d.tx_hash,
          status: d.status,
          adminNote: d.admin_note,
          reviewedAt: d.reviewed_at,
          createdAt: d.created_at,
        });
      }
    }

    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

export const reviewDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: { depositId: string; action: "approve" | "reject"; adminNote?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);

    const { getValorizaStore } = await import("./valoriza-store");
    const store = getValorizaStore();

    // Check store first
    const storeResult = store.reviewDeposit(
      data.depositId,
      data.action,
      context.userId,
      data.adminNote,
    );

    if (storeResult.ok && storeResult.deposit) {
      // Also try notifying Supabase if possible
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("notifications").insert({
          user_id: storeResult.deposit.userId,
          title_ar:
            data.action === "approve"
              ? "تمت الموافقة على الإيداع"
              : "تم رفض طلب الإيداع",
          body_ar:
            data.action === "approve"
              ? `تمت الموافقة على طلب إيداعك بمبلغ $${storeResult.deposit.amount.toFixed(2)} (${storeResult.deposit.network}) وتمت إضافته إلى رصيدك بنجاح.`
              : `نأسف، تم رفض طلب إيداعك بمبلغ $${storeResult.deposit.amount.toFixed(2)}. السبب: ${data.adminNote || "بيانات غير متطابقة"}.`,
          is_read: false,
        });
      } catch {
        // non-blocking
      }

      return { ok: true as const, depositId: data.depositId, status: storeResult.deposit.status };
    }

    // Fallback to Supabase
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: dep } = await supabaseAdmin
      .from("deposits")
      .select("id, user_id, amount, status, network")
      .eq("id", data.depositId)
      .single();

    if (!dep) throw new Error("DEPOSIT_NOT_FOUND");
    if (dep.status !== "pending") throw new Error("ALREADY_PROCESSED");

    const amount = Number(dep.amount);

    if (data.action === "approve") {
      try {
        await supabaseAdmin.rpc("apply_balance_change", {
          _user_id: dep.user_id,
          _amount: amount,
          _type: "deposit",
          _description: `إيداع مؤكد (${dep.network}): +$${amount.toFixed(2)}`,
          _reference_id: dep.id,
        });
      } catch {
        // Credit in store wallet as fallback
        store.creditBalance(dep.user_id, amount, "deposit");
      }

      await supabaseAdmin
        .from("deposits")
        .update({
          status: "approved",
          admin_note: data.adminNote || "تمت الموافقة وإيداع المبلغ في المحفظة",
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", dep.id);

      return { ok: true as const, depositId: dep.id, status: "approved" };
    } else {
      await supabaseAdmin
        .from("deposits")
        .update({
          status: "rejected",
          admin_note: data.adminNote || "تم رفض الطلب",
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", dep.id);

      return { ok: true as const, depositId: dep.id, status: "rejected" };
    }
  });

/* ---------------- 4. ADMIN WITHDRAWALS ---------------- */

export const getAdminWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("withdrawals")
      .select(
        "id, user_id, network, address, amount, fee, net_amount, status, admin_note, reviewed_at, created_at, profiles(username, email)",
      )
      .order("created_at", { ascending: false })
      .limit(150);

    return (data ?? []).map((w: any) => ({
      id: w.id,
      userId: w.user_id,
      username: w.profiles?.username || "مستخدم",
      email: w.profiles?.email || "",
      network: w.network,
      address: w.address,
      amount: Number(w.amount),
      fee: Number(w.fee),
      netAmount: Number(w.net_amount),
      status: w.status,
      adminNote: w.admin_note,
      reviewedAt: w.reviewed_at,
      createdAt: w.created_at,
    }));
  });

export const reviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      withdrawalId: string;
      action: "approve" | "reject" | "mark_paid";
      adminNote?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: w } = await supabaseAdmin
      .from("withdrawals")
      .select("id, user_id, amount, net_amount, status, network, address")
      .eq("id", data.withdrawalId)
      .single();

    if (!w) throw new Error("WITHDRAWAL_NOT_FOUND");
    if (w.status === "rejected" || (w.status === "approved" && data.action === "approve")) {
      throw new Error("ALREADY_PROCESSED");
    }

    const amount = Number(w.amount);
    const netAmount = Number(w.net_amount);

    if (data.action === "approve" || data.action === "mark_paid") {
      await supabaseAdmin
        .from("withdrawals")
        .update({
          status: "approved",
          admin_note:
            data.adminNote ||
            (data.action === "mark_paid"
              ? "تم التحويل بنجاح للمحفظة"
              : "تمت الموافقة وجارٍ التحويل"),
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", w.id);

      await supabaseAdmin.from("notifications").insert({
        user_id: w.user_id,
        title_ar: "تمت الموافقة على طلب السحب",
        body_ar: `تمت الموافقة على طلب السحب الخاص بك بمبلغ صافي $${netAmount.toFixed(2)} إلى ${w.network}.`,
        is_read: false,
      });

      await recordAudit(context.userId, "APPROVE_WITHDRAWAL", w.user_id, {
        withdrawalId: w.id,
        netAmount,
        action: data.action,
      });
    } else if (data.action === "reject") {
      // Refund balance to user
      const { error: refundError } = await supabaseAdmin.rpc("apply_balance_change", {
        _user_id: w.user_id,
        _amount: amount,
        _type: "withdrawal_refund",
        _description: `استرجاع طلب سحب مرفوض: +$${amount.toFixed(2)}`,
        _reference_id: w.id,
      });

      if (refundError) throw new Error(refundError.message);

      await supabaseAdmin
        .from("withdrawals")
        .update({
          status: "rejected",
          admin_note: data.adminNote || "تم رفض طلب السحب واسترجاع الرصيد للمحفظة",
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", w.id);

      await supabaseAdmin.from("notifications").insert({
        user_id: w.user_id,
        title_ar: "تم رفض طلب السحب واسترجاع الرصيد",
        body_ar: `تم رفض طلب سحبك لمبلغ $${amount.toFixed(2)} وتمت إعادة المبلغ بالكامل إلى محفظتك. السبب: ${data.adminNote || "عنوان المحفظة غير صالح أو خطأ بالشبكة"}.`,
        is_read: false,
      });

      await recordAudit(context.userId, "REJECT_WITHDRAWAL", w.user_id, {
        withdrawalId: w.id,
        refundedAmount: amount,
        note: data.adminNote,
      });
    }

    return { ok: true as const };
  });

/* ---------------- 5. INVESTMENT FUNDS MANAGEMENT ---------------- */

export const getAdminFunds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin.from("investment_funds").select("*").order("sort_order");

    return data ?? [];
  });

export const saveInvestmentFund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      id?: string;
      code: string;
      nameAr: string;
      nameEn: string;
      taglineAr?: string;
      durationDays: number;
      profitPercent: number;
      minAmount: number;
      isActive: boolean;
      accent?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      code: data.code.toUpperCase(),
      name_ar: data.nameAr,
      name_en: data.nameEn,
      tagline_ar: data.taglineAr,
      duration_days: data.durationDays,
      profit_percent: data.profitPercent,
      min_amount: data.minAmount,
      is_active: data.isActive,
      accent: data.accent || "blue",
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("investment_funds")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("investment_funds").insert(payload);
      if (error) throw new Error(error.message);
    }

    await recordAudit(context.userId, "SAVE_INVESTMENT_FUND", null, { fundCode: data.code });
    return { ok: true as const };
  });

/* ---------------- 6. VIP PACKAGES MANAGEMENT ---------------- */

export const getAdminVipPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin.from("vip_packages").select("*").order("level");

    return data ?? [];
  });

export const saveVipPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      id: string;
      name: string;
      price: number;
      dailyProfit: number;
      dailyTasks: number;
      taskReward: number;
      isActive: boolean;
      accent?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("vip_packages")
      .update({
        name: data.name,
        price: data.price,
        daily_profit: data.dailyProfit,
        daily_tasks: data.dailyTasks,
        task_reward: data.taskReward,
        is_active: data.isActive,
        accent: data.accent || "blue",
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    await recordAudit(context.userId, "UPDATE_VIP_PACKAGE", null, { id: data.id, name: data.name });
    return { ok: true as const };
  });

/* ---------------- 7. TASKS MANAGEMENT ---------------- */

export const getAdminTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin.from("tasks").select("*").order("sort_order");

    return data ?? [];
  });

export const saveAdminTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      id?: string;
      titleAr: string;
      descriptionAr?: string;
      videoUrl?: string;
      thumbnailUrl?: string;
      durationSeconds: number;
      sortOrder?: number;
      isActive: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      title_ar: data.titleAr,
      description_ar: data.descriptionAr,
      video_url: data.videoUrl,
      thumbnail_url: data.thumbnailUrl,
      duration_seconds: data.durationSeconds,
      sort_order: data.sortOrder ?? 0,
      is_active: data.isActive,
    };

    if (data.id && !data.id.startsWith("task-ref-")) {
      const { error } = await supabaseAdmin.from("tasks").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("tasks").insert(payload);
      if (error) throw new Error(error.message);
    }

    await recordAudit(context.userId, "SAVE_TASK", null, { title: data.titleAr });
    return { ok: true as const };
  });

export const toggleTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { taskId: string; isActive: boolean }) => data)
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("tasks")
      .update({ is_active: data.isActive })
      .eq("id", data.taskId);

    if (error) throw new Error(error.message);

    await recordAudit(context.userId, "TOGGLE_TASK_STATUS", null, data);
    return { ok: true as const };
  });

/* ---------------- 8. LUCKY WHEEL CONFIG MANAGEMENT ---------------- */

export const getAdminWheelPrizes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("lucky_wheel_configs")
      .select("*")
      .order("sort_order");

    return data ?? [];
  });

export const saveWheelPrize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      id?: string;
      labelAr: string;
      prizeType: string;
      prizeValue: number;
      probability: number;
      icon?: string;
      accent?: string;
      isActive: boolean;
      sortOrder?: number;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      label_ar: data.labelAr,
      prize_type: data.prizeType,
      prize_value: data.prizeValue,
      probability: data.probability,
      icon: data.icon || "coin",
      accent: data.accent || "blue",
      is_active: data.isActive,
      sort_order: data.sortOrder ?? 0,
    };

    if (data.id && !data.id.startsWith("w-")) {
      const { error } = await supabaseAdmin
        .from("lucky_wheel_configs")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("lucky_wheel_configs").insert(payload);
      if (error) throw new Error(error.message);
    }

    await recordAudit(context.userId, "SAVE_WHEEL_PRIZE", null, { label: data.labelAr });
    return { ok: true as const };
  });

/* ---------------- 9. PLATFORM SETTINGS & REFERRAL RATES ---------------- */

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin.from("platform_settings").select("*");
    const settings: Record<string, string> = {};
    for (const s of (data ?? []) as any[]) {
      settings[s.key] = s.value;
    }
    return settings;
  });

export const saveAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { settings: Record<string, string> }) => data)
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const entries = Object.entries(data.settings);
    for (const [key, value] of entries) {
      await supabaseAdmin.from("platform_settings").upsert(
        {
          key,
          value: String(value),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    }

    await recordAudit(context.userId, "UPDATE_PLATFORM_SETTINGS", null, {
      keysCount: entries.length,
    });

    return { ok: true as const };
  });

/* ---------------- 10. ANNOUNCEMENTS & BROADCAST NOTIFICATIONS ---------------- */

export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { title: string; message: string; targetUserId?: string }) => data)
  .handler(async ({ data, context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: data.targetUserId ? data.targetUserId : null,
      title_ar: data.title,
      body_ar: data.message,
      is_read: false,
    });

    if (error) throw new Error(error.message);

    await recordAudit(context.userId, "BROADCAST_NOTIFICATION", data.targetUserId || null, {
      title: data.title,
    });

    return { ok: true as const };
  });

/* ---------------- 11. AUDIT LOGS ---------------- */

export const getAdminAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyAdminOrThrow(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("audit_logs")
      .select("id, user_id, event, details, created_at, profiles(username, email)")
      .order("created_at", { ascending: false })
      .limit(100);

    return (data ?? []).map((l: any) => ({
      id: l.id,
      adminId: l.user_id,
      adminName: l.profiles?.username || "مدير النظام",
      adminEmail: l.profiles?.email || "",
      event: l.event,
      details: l.details,
      createdAt: l.created_at,
    }));
  });
