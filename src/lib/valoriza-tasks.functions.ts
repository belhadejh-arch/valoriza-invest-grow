import { createServerFn } from "@tanstack/react-start";
import { serverBackendRequest } from "@/lib/backend-server";

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

export const getTasksData = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest<TasksPageData>("/api/app/tasks"),
);

export const completeTask = createServerFn({ method: "POST" })
  .validator((data: { taskId: string; watchedSeconds: number; startedAt?: string }) => data)
  .handler(({ data }) =>
    serverBackendRequest("/api/app/tasks/complete", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );

export const activateTrialPeriod = createServerFn({ method: "POST" }).handler(() =>
  serverBackendRequest("/api/app/trial", { method: "POST" }),
);

export const activateVipPlan = createServerFn({ method: "POST" })
  .validator((data: { level: number }) => data)
  .handler(({ data }) =>
    serverBackendRequest("/api/app/vip/purchase", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );

export const getVipPlansData = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest("/api/app/vip-plans"),
);

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  relatedPage?: string;
}

export const getUserNotifications = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest<{ notifications: AppNotification[]; unreadCount: number }>(
    "/api/app/notifications",
  ),
);

export const markNotificationAsRead = createServerFn({ method: "POST" })
  .validator((data: { notificationId?: string; markAll?: boolean }) => data)
  .handler(({ data }) =>
    serverBackendRequest("/api/app/notifications/read", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );
