import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type TaskItem = {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  vipRequirement: string;
  reward: number;
  isCompletedToday: boolean;
};

export type TasksPageData = {
  vipLevel: number;
  vipName: string;
  isTrial: boolean;
  videoCommission: number;
  dailyLimit: number;
  completedCount: number;
  remainingTasks: number;
  videoDuration: number;
  tasks: TaskItem[];
  userBalance: number;
};

const DEFAULT_REFERENCE_TASKS = [
  {
    id: "task-ref-1",
    title_ar: "اكتشف أجمل الوجهات السياحية",
    description_ar:
      "استكشف أروع المعالم السياحية والمنتجعات العالمية وتعرف على فرص الاستثمار السياحي الرائدة في المدن التاريخية.",
    video_url:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    duration_seconds: 10,
    sort_order: 1,
  },
  {
    id: "task-ref-2",
    title_ar: "تطوير مهاراتك المهنية",
    description_ar:
      "أهم استراتيجيات النمو الذاتي واكتساب مهارات القيادة وإدارة الأعمال الرقمية وتحقيق النجاح المؤسسي.",
    video_url:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80",
    duration_seconds: 10,
    sort_order: 2,
  },
  {
    id: "task-ref-3",
    title_ar: "مستقبل أفضل بيدك",
    description_ar:
      "طرق التخطيط المالي الذكي وبناء الثروة المستدامة من خلال خيارات الاستثمار المتنوعة والادخار المنظم.",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
    duration_seconds: 10,
    sort_order: 3,
  },
  {
    id: "task-ref-4",
    title_ar: "استراتيجيات الاستثمار الحديثة",
    description_ar:
      "تعلم أسرار تنويع المحفظة المالية وإدارة المخاطر لتحقيق عوائد سنوية ثابتة ومضمونة.",
    video_url:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
    duration_seconds: 10,
    sort_order: 4,
  },
  {
    id: "task-ref-5",
    title_ar: "التحول الرقمي والذكاء الاصطناعي",
    description_ar:
      "كيف يغير الذكاء الاصطناعي والتكنولوجيا المالية مسار الاقتصاد العالمي وفرص العمل المستقبلية.",
    video_url:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
    duration_seconds: 10,
    sort_order: 5,
  },
  {
    id: "task-ref-6",
    title_ar: "إدارة الوقت والإنتاجية الشخصية",
    description_ar:
      "خطوات عملية لتنظيم المهام اليومية وزيادة التركيز لتحقيق التوازن بين الحياة المهنية والمالية.",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80",
    duration_seconds: 10,
    sort_order: 6,
  },
];

/* ---------------- GET TASKS DATA ---------------- */

export const getTasksData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TasksPageData> => {
    const { supabase, userId } = context;

    // 1. Fetch user profile, wallet, platform settings, VIP packages
    const [profileRes, walletRes, settingsRes, packagesRes, completionsRes, tasksRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("vip_level, trial_active, trial_expires_at")
          .eq("id", userId)
          .single(),
        supabase.from("wallets").select("balance").eq("user_id", userId).single(),
        supabase.from("platform_settings").select("key, value"),
        supabase
          .from("vip_packages")
          .select("level, name, daily_tasks, task_reward, daily_profit, is_active")
          .order("level"),
        supabase
          .from("task_completions")
          .select("task_id, reward, watched_seconds, created_at")
          .eq("user_id", userId)
          .eq("completion_date", today()),
        supabase
          .from("tasks")
          .select(
            "id, title_ar, description_ar, video_url, thumbnail_url, duration_seconds, sort_order, is_active",
          )
          .order("sort_order"),
      ]);

    const settings: Record<string, string> = {};
    for (const s of (settingsRes.data ?? []) as { key: string; value: string }[]) {
      settings[s.key] = s.value;
    }

    const vipLevel = profileRes.data?.vip_level ?? 0;
    const isTrial = Boolean(profileRes.data?.trial_active);

    // 2. Determine Video Commission and Daily Limit
    let videoCommission = 0.4;
    let dailyLimit = 3;
    let vipName = `VIP ${vipLevel}`;

    if (vipLevel > 0) {
      const userPkg = packagesRes.data?.find((p: any) => p.level === vipLevel);
      if (userPkg) {
        videoCommission = Number(userPkg.task_reward);
        dailyLimit = userPkg.daily_tasks;
        vipName = userPkg.name;
      } else {
        // Fallback calculation
        videoCommission = vipLevel === 1 ? 0.25 : vipLevel === 2 ? 0.4 : 0.725;
        dailyLimit = vipLevel === 1 ? 2 : vipLevel === 2 ? 3 : 4;
      }
    } else if (isTrial) {
      videoCommission = Number(settings["trial_task_reward"] ?? "0.5");
      dailyLimit = Number(settings["trial_daily_tasks"] ?? "3");
      vipName = "عضوية تجريبية";
    } else {
      // Default standard/demo tier
      videoCommission = 0.4;
      dailyLimit = 3;
      vipName = "VIP 2 (تجريبي)";
    }

    // 3. Completed task IDs today
    const completedList = (completionsRes.data ?? []) as { task_id: string }[];
    const completedTaskIds = new Set(completedList.map((c) => c.task_id));
    const completedCount = completedTaskIds.size;
    const remainingTasks = Math.max(0, dailyLimit - completedCount);

    // 4. Ensure tasks exist (fallback to reference tasks if empty in DB)
    let rawTasks = tasksRes.data;
    if (!rawTasks || rawTasks.length === 0) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Seed reference tasks
        const { data: inserted } = await supabaseAdmin
          .from("tasks")
          .insert(
            DEFAULT_REFERENCE_TASKS.map((t) => ({
              title_ar: t.title_ar,
              description_ar: t.description_ar,
              video_url: t.video_url,
              thumbnail_url: t.thumbnail_url,
              duration_seconds: t.duration_seconds,
              sort_order: t.sort_order,
              is_active: true,
            })),
          )
          .select();
        if (inserted && inserted.length > 0) {
          rawTasks = inserted;
        }
      } catch (err) {
        console.warn("[getTasksData] Auto-seed tasks error:", err);
      }
    }

    const taskPool = rawTasks && rawTasks.length > 0 ? rawTasks : DEFAULT_REFERENCE_TASKS;

    const taskItems: TaskItem[] = taskPool.map((t: any, idx: number) => ({
      id: t.id,
      taskNumber: idx + 1,
      title: t.title_ar,
      description: t.description_ar || "شاهد الفيديو المخصص واكسب عمولتك اليومية فوراً.",
      videoUrl:
        t.video_url ||
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnailUrl:
        t.thumbnail_url ||
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
      durationSeconds: t.duration_seconds || 10,
      vipRequirement: vipLevel > 0 ? `VIP ${vipLevel}` : isTrial ? "عضوية تجريبية" : "VIP 2",
      reward: videoCommission,
      isCompletedToday: completedTaskIds.has(t.id),
    }));

    return {
      vipLevel,
      vipName,
      isTrial,
      videoCommission,
      dailyLimit,
      completedCount,
      remainingTasks,
      videoDuration: 10,
      tasks: taskItems,
      userBalance: Number(walletRes.data?.balance ?? 0),
    };
  });

/* ---------------- COMPLETE TASK SERVER HANDLER ---------------- */

export const completeTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { taskId: string; watchedSeconds: number }) => {
    if (!data || typeof data.taskId !== "string" || typeof data.watchedSeconds !== "number") {
      throw new Error("INVALID_INPUT");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { taskId, watchedSeconds } = data;

    // 1. Fetch user & trial & package info
    const [profileRes, settingsRes, packagesRes, completionsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("vip_level, trial_active, is_blocked")
        .eq("id", userId)
        .single(),
      supabase.from("platform_settings").select("key, value"),
      supabase.from("vip_packages").select("level, daily_tasks, task_reward"),
      supabase
        .from("task_completions")
        .select("task_id")
        .eq("user_id", userId)
        .eq("completion_date", today()),
    ]);

    if (profileRes.data?.is_blocked) {
      return { ok: false as const, reason: "ACCOUNT_BLOCKED" };
    }

    const settings: Record<string, string> = {};
    for (const s of (settingsRes.data ?? []) as { key: string; value: string }[]) {
      settings[s.key] = s.value;
    }

    const vipLevel = profileRes.data?.vip_level ?? 0;
    const isTrial = Boolean(profileRes.data?.trial_active);

    let videoCommission = 0.4;
    let dailyLimit = 3;

    if (vipLevel > 0) {
      const userPkg = packagesRes.data?.find((p: any) => p.level === vipLevel);
      if (userPkg) {
        videoCommission = Number(userPkg.task_reward);
        dailyLimit = userPkg.daily_tasks;
      }
    } else if (isTrial) {
      videoCommission = Number(settings["trial_task_reward"] ?? "0.5");
      dailyLimit = Number(settings["trial_daily_tasks"] ?? "3");
    }

    // 2. Check Daily Limit
    const completedTasks = completionsRes.data ?? [];
    if (completedTasks.length >= dailyLimit) {
      return { ok: false as const, reason: "DAILY_LIMIT_REACHED", remainingTasks: 0 };
    }

    // 3. Prevent duplicate completion of the same task in the same day
    const alreadyCompleted = completedTasks.some((c: any) => c.task_id === taskId);
    if (alreadyCompleted) {
      return { ok: false as const, reason: "ALREADY_COMPLETED_TODAY" };
    }

    // 4. Verify watch duration (allow small network tolerance: >= 8s for 10s video)
    if (watchedSeconds < 8) {
      return { ok: false as const, reason: "INSUFFICIENT_WATCH_TIME", required: 10 };
    }

    // 5. Fetch task title
    let taskTitle = "مشاهدة فيديو مهمة يومية";
    const { data: dbTask } = await supabase
      .from("tasks")
      .select("title_ar, id")
      .eq("id", taskId)
      .maybeSingle();
    if (dbTask?.title_ar) {
      taskTitle = dbTask.title_ar;
    }

    // 6. Execute ledger and completion records via Supabase Admin
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Insert task completion record
    const { data: compRecord, error: compErr } = await supabaseAdmin
      .from("task_completions")
      .insert({
        user_id: userId,
        task_id: dbTask?.id ?? taskId,
        reward: videoCommission,
        completion_date: today(),
        watched_seconds: watchedSeconds,
      })
      .select("id")
      .single();

    if (compErr) {
      if (compErr.code === "23505") {
        return { ok: false as const, reason: "ALREADY_COMPLETED_TODAY" };
      }
      throw new Error(compErr.message);
    }

    // Apply balance update to user's wallet
    const { data: tx, error: txError } = await supabaseAdmin.rpc("apply_balance_change", {
      _user_id: userId,
      _amount: videoCommission,
      _type: "task_reward",
      _description: `مكافأة إكمال مهمة: ${taskTitle}`,
      _reference_id: compRecord.id,
    });

    if (txError) {
      console.error("[completeTask] Balance update error:", txError);
      throw new Error(txError.message);
    }

    // Record in rewards ledger
    await supabaseAdmin.from("rewards").insert({
      user_id: userId,
      source: "task_reward",
      amount: videoCommission,
      description_ar: `مكافأة إكمال مهمة: ${taskTitle}`,
    });

    // Send in-app notification
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title_ar: "مكافأة إكمال مهمة",
      body_ar: `تمت إضافة عمولة $${videoCommission.toFixed(2)} بنجاح لمشاهدة فيديو: ${taskTitle}.`,
      is_read: false,
    });

    const newRemaining = Math.max(0, dailyLimit - (completedTasks.length + 1));

    return {
      ok: true as const,
      reward: videoCommission,
      remainingTasks: newRemaining,
      newBalance: tx ? Number(tx.balance_after) : undefined,
    };
  });

/* ---------------- NOTIFICATIONS SYSTEM ---------------- */

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  relatedPage: string;
};

export const getUserNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<{ notifications: AppNotification[]; unreadCount: number }> => {
      const { supabase, userId } = context;

      const { data: rows } = await supabase
        .from("notifications")
        .select("id, title_ar, body_ar, is_read, created_at, user_id")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(40);

      const notifications: AppNotification[] = (rows ?? []).map((n: any) => {
        const title = n.title_ar || "إشعار من المنصة";
        const body = n.body_ar || "";

        // Deduce related page based on notification type
        let relatedPage = "/home";
        if (title.includes("إيداع") || body.includes("إيداع")) {
          relatedPage = "/records";
        } else if (title.includes("سحب") || body.includes("سحب")) {
          relatedPage = "/records";
        } else if (title.includes("VIP") || body.includes("VIP") || title.includes("استثمار")) {
          relatedPage = "/investment";
        } else if (title.includes("مهمة") || body.includes("مهمة")) {
          relatedPage = "/tasks";
        } else if (title.includes("إحالة") || body.includes("فريق")) {
          relatedPage = "/team";
        } else if (title.includes("عجلة") || title.includes("مكافأة")) {
          relatedPage = "/rewards";
        }

        return {
          id: n.id,
          title,
          body,
          isRead: Boolean(n.is_read),
          createdAt: n.created_at,
          relatedPage,
        };
      });

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      return { notifications, unreadCount };
    },
  );

export const markNotificationAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { notificationId?: string; markAll?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.markAll) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
    } else if (data.notificationId) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", data.notificationId);
    }

    return { ok: true as const };
  });
