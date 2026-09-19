import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getValorizaStore, VideoTask } from "./valoriza-store";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type TaskStatus = "LOCKED" | "AVAILABLE" | "WATCHING" | "COMPLETED" | "REWARDED";

export type TaskItem = {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  youtubeId: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  vipRequirement: string;
  reward: number;
  isCompletedToday: boolean;
  status: TaskStatus;
};

export type TasksPageData = {
  vipLevel: number;
  vipName: string;
  isTrial: boolean;
  trialExpiresAt: string | null;
  videoCommission: number;
  dailyLimit: number;
  completedCount: number;
  remainingTasks: number;
  videoDuration: number;
  tasks: TaskItem[];
  userBalance: number;
  allDailyTasksCompleted: boolean;
};

/* ---------------- GET TASKS DATA ---------------- */

export const getTasksData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TasksPageData> => {
    const { supabase, userId } = context;
    const store = getValorizaStore();
    const currentDate = today();

    // 1. Fetch user profile from Supabase if available
    const { data: profile } = await supabase
      .from("profiles")
      .select("vip_level, trial_active, trial_expires_at, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    // 2. Check VIP status from store & profile
    const userVip = store.getUserVip(userId);
    let vipLevel = profile?.vip_level ?? userVip?.vipLevel ?? 0;

    // 3. Check Trial status
    const trialInfo = store.getUserTrial(userId);
    const isTrial = trialInfo.isActive || Boolean(profile?.trial_active);

    // If VIP expired, reset level to 0
    if (userVip && userVip.status === "expired" && vipLevel === userVip.vipLevel) {
      vipLevel = 0;
    }

    // 4. Determine Commission, Limits & VIP Name
    let videoCommission = 0.4;
    let dailyLimit = 3;
    let vipName = "VIP 2";

    if (vipLevel > 0) {
      const plan = store.getVipPlan(vipLevel);
      if (plan) {
        videoCommission = plan.taskReward;
        dailyLimit = plan.dailyTasks;
        vipName = plan.name;
      } else {
        videoCommission = 0.4;
        dailyLimit = 3;
        vipName = `VIP ${vipLevel}`;
      }
    } else if (isTrial) {
      // Trial: 3 days, 3 daily tasks, $0.5 reward per task
      videoCommission = 0.5;
      dailyLimit = 3;
      vipName = "الفترة التجريبية";
    } else {
      // Default demo state
      vipLevel = 2; // Default visual preview tier for demo per PDF
      const plan = store.getVipPlan(2);
      videoCommission = plan?.taskReward ?? 0.4;
      dailyLimit = plan?.dailyTasks ?? 3;
      vipName = "VIP 2";
    }

    // 5. Get completions for today
    const completionsToday = store.getCompletionsForUserOnDate(userId, currentDate);
    const completedTaskIds = new Set(completionsToday.map((c) => c.taskId));
    const completedCount = completedTaskIds.size;
    const remainingTasks = Math.max(0, dailyLimit - completedCount);
    const allDailyTasksCompleted = completedCount >= dailyLimit;

    // 6. Map 9 YouTube Tasks
    const allTasks = store.getTasks();

    const tasks: TaskItem[] = allTasks.map((t, idx) => {
      const isCompleted = completedTaskIds.has(t.id);
      let status: TaskStatus = "AVAILABLE";

      if (isCompleted) {
        status = "REWARDED";
      } else if (allDailyTasksCompleted) {
        status = "LOCKED";
      } else {
        status = "AVAILABLE";
      }

      return {
        id: t.id,
        taskNumber: t.taskNumber || idx + 1,
        title: t.title,
        description: t.description,
        youtubeId: t.youtubeId,
        videoUrl: `https://www.youtube.com/embed/${t.youtubeId}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1`,
        thumbnailUrl: t.thumbnailUrl || `https://img.youtube.com/vi/${t.youtubeId}/hqdefault.jpg`,
        durationSeconds: t.durationSeconds || 10,
        vipRequirement: vipName,
        reward: videoCommission,
        isCompletedToday: isCompleted,
        status,
      };
    });

    // 7. Get user wallet balance
    const wallet = store.getWallet(userId);

    return {
      vipLevel,
      vipName,
      isTrial,
      trialExpiresAt: trialInfo.expiresAt,
      videoCommission,
      dailyLimit,
      completedCount,
      remainingTasks,
      videoDuration: 10,
      tasks,
      userBalance: wallet.balance,
      allDailyTasksCompleted,
    };
  });

/* ---------------- COMPLETE TASK SERVER HANDLER ---------------- */

export const completeTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { taskId: string; watchedSeconds: number; startedAt?: string }) => {
    if (!data || typeof data.taskId !== "string" || typeof data.watchedSeconds !== "number") {
      throw new Error("INVALID_INPUT");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { taskId, watchedSeconds } = data;
    const store = getValorizaStore();
    const currentDate = today();

    // 1. Verify user status
    const { data: profile } = await supabase
      .from("profiles")
      .select("vip_level, trial_active, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_blocked) {
      return { ok: false as const, reason: "ACCOUNT_BLOCKED" };
    }

    const userVip = store.getUserVip(userId);
    const trialInfo = store.getUserTrial(userId);
    const vipLevel = profile?.vip_level ?? userVip?.vipLevel ?? 0;
    const isTrial = trialInfo.isActive || Boolean(profile?.trial_active);

    let videoCommission = 0.4;
    let dailyLimit = 3;

    if (vipLevel > 0) {
      const plan = store.getVipPlan(vipLevel);
      if (plan) {
        videoCommission = plan.taskReward;
        dailyLimit = plan.dailyTasks;
      }
    } else if (isTrial) {
      videoCommission = 0.5;
      dailyLimit = 3;
    } else {
      // Default tier VIP 2
      const plan = store.getVipPlan(2);
      videoCommission = plan?.taskReward ?? 0.4;
      dailyLimit = plan?.dailyTasks ?? 3;
    }

    // 2. Check Daily Limit
    const completionsToday = store.getCompletionsForUserOnDate(userId, currentDate);
    if (completionsToday.length >= dailyLimit) {
      return { ok: false as const, reason: "DAILY_LIMIT_REACHED", remainingTasks: 0 };
    }

    // 3. Prevent duplicate completion
    if (store.isTaskCompletedToday(userId, taskId, currentDate)) {
      return { ok: false as const, reason: "ALREADY_COMPLETED_TODAY" };
    }

    // 4. Verify watch duration
    if (watchedSeconds < 8) {
      return { ok: false as const, reason: "INSUFFICIENT_WATCH_TIME", required: 10 };
    }

    // 5. Record task completion in store (Unique enforcement & Wallet credit)
    const startedAt = data.startedAt || new Date(Date.now() - watchedSeconds * 1000).toISOString();
    const completedAt = new Date().toISOString();

    const recordResult = store.recordTaskCompletion({
      userId,
      taskId,
      dateStr: currentDate,
      reward: videoCommission,
      watchedSeconds,
      startedAt,
      completedAt,
    });

    if (!recordResult.ok) {
      return { ok: false as const, reason: recordResult.reason || "ERROR" };
    }

    const newRemaining = Math.max(0, dailyLimit - (completionsToday.length + 1));
    const wallet = store.getWallet(userId);

    // Try also recording in Supabase database if tables permit
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title_ar: "مكافأة إكمال مهمة",
        body_ar: `تمت إضافة عمولة $${videoCommission.toFixed(2)} بنجاح لمشاهدة فيديو المهمة.`,
        is_read: false,
      });
    } catch {
      // non-blocking
    }

    return {
      ok: true as const,
      reward: videoCommission,
      remainingTasks: newRemaining,
      newBalance: wallet.balance,
      completionId: recordResult.completion?.id,
    };
  });

/* ---------------- ACTIVATE TRIAL PERIOD ---------------- */

export const activateTrialPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const store = getValorizaStore();

    const result = store.activateUserTrial(userId);
    if (!result.ok) {
      return { ok: false as const, message: result.message };
    }

    // Also update Supabase profile if possible
    try {
      await supabase
        .from("profiles")
        .update({
          trial_active: true,
          trial_started_at: result.trial.startedAt,
          trial_expires_at: result.trial.expiresAt,
        })
        .eq("id", userId);
    } catch {
      // non-blocking
    }

    return {
      ok: true as const,
      message: result.message,
      trial: result.trial,
    };
  });

/* ---------------- BUY / ACTIVATE VIP ---------------- */

export const activateVipPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { level: number }) => {
    if (!data || typeof data.level !== "number") {
      throw new Error("INVALID_LEVEL");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const store = getValorizaStore();

    const plan = store.getVipPlan(data.level);
    if (!plan) {
      return { ok: false as const, message: "الباقة غير موجودة" };
    }
    if (!plan.isActive) {
      return { ok: false as const, message: "هذه الباقة مقفلة وغير مفعلة حالياً" };
    }

    // Check balance
    const wallet = store.getWallet(userId);
    if (wallet.balance < plan.price) {
      return {
        ok: false as const,
        message: `رصيدك الحالي ($${wallet.balance.toFixed(2)}) لا يكفي لشراء هذه الباقة ($${plan.price}). يرجى شحن الرصيد أولاً.`,
        required: plan.price,
        current: wallet.balance,
      };
    }

    // Deduct price and set VIP
    store.debitBalance(userId, plan.price);
    const sub = store.setUserVip(userId, plan.level, plan.durationDays);

    // Update Supabase profile
    try {
      await supabase
        .from("profiles")
        .update({
          vip_level: plan.level,
          vip_expires_at: sub.expiresAt,
        })
        .eq("id", userId);
    } catch {
      // non-blocking
    }

    return {
      ok: true as const,
      message: `تهانينا! تم تفعيل ${plan.name} بنجاح لمدة ${plan.durationDays} يوم!`,
      vipLevel: plan.level,
      newBalance: store.getWallet(userId).balance,
    };
  });

/* ---------------- GET VIP PLANS LIST ---------------- */

export const getVipPlansData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const store = getValorizaStore();
    const plans = store.getVipPlans();
    const userVip = store.getUserVip(userId);
    const trial = store.getUserTrial(userId);
    const wallet = store.getWallet(userId);

    return {
      plans,
      userVipLevel: userVip?.status === "active" ? userVip.vipLevel : 0,
      userVipExpiresAt: userVip?.expiresAt ?? null,
      trial,
      walletBalance: wallet.balance,
    };
  });

/* ---------------- NOTIFICATIONS ---------------- */

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  relatedPage?: string;
}

export const getUserNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      const notifs: AppNotification[] = (data ?? []).map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title_ar || n.title || "إشعار جديد",
        body: n.body_ar || n.body || "",
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
        relatedPage: n.link || undefined,
      }));

      const unreadCount = notifs.filter((n) => !n.isRead).length;

      return {
        notifications: notifs,
        unreadCount,
      };
    } catch {
      return {
        notifications: [],
        unreadCount: 0,
      };
    }
  });

export const markNotificationAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { notificationId?: string; markAll?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      if (data.markAll) {
        await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
      } else if (data.notificationId) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", data.notificationId)
          .eq("user_id", userId);
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });
